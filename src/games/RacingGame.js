/**
 * Brick Game: Retro Classic Definitive Edition
 * RacingGame.js - Mode C: Authentic 10x20 LCD Formula Racing Dodger
 * 
 * Mechanics:
 * - 3-Lane Highway with scrolling dashed road borders on cols 0 & 9
 * - Player car steers left/right across lanes
 * - Turbo boost for high-speed score multipliers
 * - Oncoming obstacle cars scroll downwards at increasing speed
 * - High replayability and fast reflexes
 */

export class RacingGame {
  constructor(audio, lcd, cgManager) {
    this.audio = audio;
    this.lcd = lcd;
    this.cg = cgManager;

    this.COLS = 10;
    this.ROWS = 20;

    this.state = 'MENU';
    this.score = 0;
    this.hiScore = 0;
    this.level = 1;
    this.speed = 1;

    // 3 Lanes (center x coordinates: 2, 5, 7)
    this.lanes = [2, 5, 7];
    this.playerLane = 1; // 0: Left, 1: Center, 2: Right
    this.playerY = 17;   // rows 16..18

    this.isTurbo = false;
    this.borderScroll = 0;

    this.enemyCars = []; // { lane, y }
    this.spawnTimer = 0;
    this.spawnInterval = 35; // ticks

    this.lastTickTime = 0;
    this.carsPassed = 0;

    this.loadHiScore();
  }

  loadHiScore() {
    try {
      const saved = this.cg ? this.cg.getItem('brick_game_racing_hiscore') : localStorage.getItem('brick_game_racing_hiscore');
      this.hiScore = saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      this.hiScore = 0;
    }
  }

  saveHiScore() {
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      if (this.cg) {
        this.cg.setItem('brick_game_racing_hiscore', this.hiScore);
        this.cg.happytime();
      } else {
        try {
          localStorage.setItem('brick_game_racing_hiscore', this.hiScore);
        } catch (e) {}
      }
    }
  }

  start() {
    this.score = 0;
    this.level = 1;
    this.speed = 1;
    this.playerLane = 1;
    this.enemyCars = [];
    this.spawnTimer = 0;
    this.borderScroll = 0;
    this.carsPassed = 0;
    this.isTurbo = false;

    this.state = 'PLAYING';
    if (this.cg) this.cg.gameplayStart();
    this.audio.playStartupJingle();
  }

  moveLeft() {
    if (this.state !== 'PLAYING') return;
    if (this.playerLane > 0) {
      this.playerLane--;
      this.audio.playMove();
    }
  }

  moveRight() {
    if (this.state !== 'PLAYING') return;
    if (this.playerLane < 2) {
      this.playerLane++;
      this.audio.playMove();
    }
  }

  toggleTurbo() {
    if (this.state !== 'PLAYING') return;
    this.isTurbo = !this.isTurbo;
    this.audio.playRotate();
  }

  spawnEnemyCar() {
    const availableLanes = [0, 1, 2];
    const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];

    // Ensure safe distance from top-most car
    const tooClose = this.enemyCars.some(car => car.y < 5);
    if (!tooClose) {
      this.enemyCars.push({ lane, y: -2 });
    }
  }

  update(timestamp) {
    if (this.state !== 'PLAYING') return;

    if (!this.lastTickTime) this.lastTickTime = timestamp;
    const elapsed = timestamp - this.lastTickTime;

    // Turbo drops interval by 50%
    const baseInterval = Math.max(35, 120 - (this.speed * 4.5));
    const currentInterval = this.isTurbo ? Math.floor(baseInterval * 0.5) : baseInterval;

    if (elapsed < currentInterval) return;
    this.lastTickTime = timestamp;

    // 1. Scroll Road Borders
    this.borderScroll = (this.borderScroll + 1) % 4;

    // 2. Spawn Oncoming Cars
    this.spawnTimer++;
    if (this.spawnTimer >= Math.max(16, this.spawnInterval - Math.floor(this.speed * 0.8))) {
      this.spawnTimer = 0;
      this.spawnEnemyCar();
    }

    // 3. Move Oncoming Cars
    for (let i = this.enemyCars.length - 1; i >= 0; i--) {
      const car = this.enemyCars[i];
      car.y++;

      // Check Collision with Player Car
      if (car.lane === this.playerLane) {
        // Player car spans rows (playerY - 1) to (playerY + 1)
        // Enemy car spans rows (car.y - 1) to (car.y + 1)
        if (Math.abs(car.y - this.playerY) < 3) {
          this.triggerGameOver();
          return;
        }
      }

      // Passed car successfully!
      if (car.y > this.ROWS + 2) {
        this.enemyCars.splice(i, 1);
        this.carsPassed++;
        const points = (this.isTurbo ? 40 : 20) * this.level;
        this.score += points;
        this.saveHiScore();
        this.audio.playSoftDrop();

        // Level up every 10 cars
        if (this.carsPassed % 10 === 0) {
          this.level = Math.min(20, this.level + 1);
          this.speed = this.level;
          this.audio.playLevelUp();
        }
      }
    }
  }

  triggerGameOver() {
    this.state = 'GAME_OVER';
    if (this.cg) this.cg.gameplayStop();
    this.saveHiScore();
    this.audio.playGameOver();
    this.lcd.triggerGameOverCurtain(() => {
      this.showRevivePrompt();
    });
  }

  showRevivePrompt() {
    this.state = 'REVIVE_OFFER';
    const reviveModal = document.getElementById('modal-revive');
    if (reviveModal) {
      reviveModal.classList.add('visible');
    }
  }

  revive() {
    const reviveModal = document.getElementById('modal-revive');
    if (reviveModal) reviveModal.classList.remove('visible');

    // Clear all existing enemy cars
    this.enemyCars = [];
    this.playerLane = 1;
    this.isTurbo = false;
    this.state = 'PLAYING';
    if (this.cg) this.cg.gameplayStart();
    this.audio.playLevelUp();
  }

  dismissRevive() {
    const reviveModal = document.getElementById('modal-revive');
    if (reviveModal) reviveModal.classList.remove('visible');

    if (this.cg) {
      this.cg.requestMidgameAd(() => {
        this.state = 'MENU';
      });
    } else {
      this.state = 'MENU';
    }
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      if (this.cg) this.cg.gameplayStop();
      this.audio.playPause();
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      if (this.cg) this.cg.gameplayStart();
      this.audio.playPause();
    }
  }

  getStateForRender() {
    const board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(0));

    if (this.state === 'PLAYING' || this.state === 'PAUSED' || this.state === 'REVIVE_OFFER') {
      // 1. Draw Road Border Stripes (Columns 0 and 9)
      for (let r = 0; r < this.ROWS; r++) {
        if ((r + this.borderScroll) % 3 !== 0) {
          board[r][0] = 1;
          board[r][this.COLS - 1] = 1;
        }
      }

      // 2. Car Pattern (3x3 pixels)
      //  . X .
      //  X X X
      //  X . X
      const carPattern = [
        [0, 1, 0],
        [1, 1, 1],
        [1, 0, 1]
      ];

      // Draw Player Car
      const px = this.lanes[this.playerLane];
      const py = this.playerY;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (carPattern[r][c] === 1) {
            const bx = px - 1 + c;
            const by = py - 1 + r;
            if (bx >= 0 && bx < this.COLS && by >= 0 && by < this.ROWS) {
              board[by][bx] = 1;
            }
          }
        }
      }

      // Draw Oncoming Enemy Cars
      for (const enemy of this.enemyCars) {
        const ex = this.lanes[enemy.lane];
        const ey = enemy.y;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            if (carPattern[r][c] === 1) {
              const bx = ex - 1 + c;
              const by = ey - 1 + r;
              if (bx >= 0 && bx < this.COLS && by >= 0 && by < this.ROWS) {
                board[by][bx] = 1;
              }
            }
          }
        }
      }
    }

    return {
      board,
      currentPiece: null,
      ghostY: null,
      nextPiece: null,
      holdPiece: null,
      score: this.score,
      hiScore: this.hiScore,
      level: this.level,
      speed: this.isTurbo ? this.speed * 2 : this.speed,
      lines: this.carsPassed,
      isPaused: this.state === 'PAUSED',
      isMuted: this.audio.muted
    };
  }
}
