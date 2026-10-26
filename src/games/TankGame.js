/**
 * Brick Game: Retro Classic Definitive Edition
 * TankGame.js - Mode B: Authentic 10x20 LCD Tank Battle
 * 
 * Mechanics:
 * - 10x20 LCD matrix
 * - Player tank moves horizontally & vertically in bottom region
 * - Shoots bullets upward to destroy advancing enemy tanks
 * - Enemy tanks fire bullets downward
 * - Authentic 90s handheld tank sprites and piezo sounds
 */

export class TankGame {
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
    this.lives = 3;

    // Player Tank (x: center column 0..9, y: row 16..17)
    this.playerX = 4;
    this.playerY = 17;

    this.bullets = [];      // { x, y, dy: -1 (player) | +1 (enemy) }
    this.enemies = [];      // { x, y, moveTick, shootTick }
    this.enemySpawnTimer = 0;
    this.enemySpawnInterval = 120; // in ticks (~2 sec)

    this.tickCount = 0;
    this.lastTickTime = 0;

    this.loadHiScore();
  }

  loadHiScore() {
    try {
      const saved = this.cg ? this.cg.getItem('brick_game_tank_hiscore') : localStorage.getItem('brick_game_tank_hiscore');
      this.hiScore = saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      this.hiScore = 0;
    }
  }

  saveHiScore() {
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      if (this.cg) {
        this.cg.setItem('brick_game_tank_hiscore', this.hiScore);
        this.cg.happytime();
      } else {
        try {
          localStorage.setItem('brick_game_tank_hiscore', this.hiScore);
        } catch (e) {}
      }
    }
  }

  start() {
    this.score = 0;
    this.level = 1;
    this.speed = 1;
    this.lives = 3;
    this.playerX = 4;
    this.playerY = 17;
    this.bullets = [];
    this.enemies = [];
    this.enemySpawnTimer = 0;
    this.tickCount = 0;

    this.state = 'PLAYING';
    if (this.cg) this.cg.gameplayStart();
    this.audio.playStartupJingle();
  }

  // Move Player
  moveLeft() {
    if (this.state !== 'PLAYING') return;
    if (this.playerX > 1) {
      this.playerX--;
      this.audio.playMove();
    }
  }

  moveRight() {
    if (this.state !== 'PLAYING') return;
    if (this.playerX < this.COLS - 2) {
      this.playerX++;
      this.audio.playMove();
    }
  }

  moveUp() {
    if (this.state !== 'PLAYING') return;
    if (this.playerY > 12) {
      this.playerY--;
      this.audio.playMove();
    }
  }

  moveDown() {
    if (this.state !== 'PLAYING') return;
    if (this.playerY < this.ROWS - 2) {
      this.playerY++;
      this.audio.playMove();
    }
  }

  // Shoot Bullet
  shoot() {
    if (this.state !== 'PLAYING') return;
    // Limit player to 2 bullets on screen
    const playerBullets = this.bullets.filter(b => b.dy < 0);
    if (playerBullets.length < 2) {
      this.bullets.push({ x: this.playerX, y: this.playerY - 2, dy: -1 });
      this.audio.playSoftDrop();
    }
  }

  // Spawn Enemy Tank
  spawnEnemy() {
    const lanes = [1, 4, 7];
    const spawnX = lanes[Math.floor(Math.random() * lanes.length)];
    // Check if space is occupied
    const occupied = this.enemies.some(e => Math.abs(e.x - spawnX) < 3 && e.y < 4);
    if (!occupied && this.enemies.length < 4) {
      this.enemies.push({
        x: spawnX,
        y: 1,
        moveTick: 0,
        shootTick: 0
      });
    }
  }

  update(timestamp) {
    if (this.state !== 'PLAYING') return;

    if (!this.lastTickTime) this.lastTickTime = timestamp;
    const elapsed = timestamp - this.lastTickTime;
    const tickInterval = Math.max(50, 100 - (this.speed * 4));

    if (elapsed < tickInterval) return;
    this.lastTickTime = timestamp;
    this.tickCount++;

    // 1. Enemy Spawning
    this.enemySpawnTimer++;
    if (this.enemySpawnTimer >= Math.max(40, this.enemySpawnInterval - (this.speed * 4))) {
      this.enemySpawnTimer = 0;
      this.spawnEnemy();
    }

    // 2. Move Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.y += b.dy;

      // Off-screen check
      if (b.y < 0 || b.y >= this.ROWS) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Check Player Bullet hitting Enemy Tank
      if (b.dy < 0) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.abs(b.x - e.x) <= 1 && Math.abs(b.y - e.y) <= 1) {
            // Hit enemy tank!
            this.enemies.splice(j, 1);
            this.bullets.splice(i, 1);
            this.score += 150 * this.level;
            this.saveHiScore();
            this.audio.playRotate();

            // Level up every 1000 points
            if (this.score >= this.level * 1000) {
              this.level = Math.min(20, this.level + 1);
              this.speed = this.level;
              this.audio.playLevelUp();
            }
            break;
          }
        }
      } 
      // Check Enemy Bullet hitting Player Tank
      else if (b.dy > 0) {
        if (Math.abs(b.x - this.playerX) <= 1 && Math.abs(b.y - this.playerY) <= 1) {
          this.bullets.splice(i, 1);
          this.hitPlayer();
          break;
        }
      }
    }

    // 3. Move Enemies & Enemy AI
    const enemyMoveInterval = Math.max(8, 20 - this.speed);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.moveTick++;
      e.shootTick++;

      // Downward Movement
      if (e.moveTick >= enemyMoveInterval) {
        e.moveTick = 0;
        e.y++;

        // Enemy reached bottom or crashed into player
        if (e.y >= this.ROWS - 1 || (Math.abs(e.x - this.playerX) <= 2 && Math.abs(e.y - this.playerY) <= 2)) {
          this.enemies.splice(i, 1);
          this.hitPlayer();
          continue;
        }
      }

      // Enemy Shooting
      if (e.shootTick >= Math.max(25, 60 - (this.speed * 2))) {
        e.shootTick = 0;
        if (Math.random() < 0.6) {
          this.bullets.push({ x: e.x, y: e.y + 2, dy: 1 });
        }
      }
    }
  }

  hitPlayer() {
    this.lives--;
    this.audio.playHardDrop();

    if (this.lives <= 0) {
      this.triggerGameOver();
    } else {
      // Reposition player
      this.playerX = 4;
      this.playerY = 17;
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

    this.lives = 3;
    this.enemies = [];
    this.bullets = [];
    this.playerX = 4;
    this.playerY = 17;
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

  // Draw Tank Matrix & Entities into the 10x20 Frame
  getStateForRender() {
    const board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(0));

    if (this.state === 'PLAYING' || this.state === 'PAUSED' || this.state === 'REVIVE_OFFER') {
      // 1. Draw Player Tank (3x3 shape with cannon up)
      //  . X .
      //  X X X
      //  X . X
      const px = this.playerX;
      const py = this.playerY;
      const playerPattern = [
        [0, 1, 0],
        [1, 1, 1],
        [1, 0, 1]
      ];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (playerPattern[r][c] === 1) {
            const bx = px - 1 + c;
            const by = py - 1 + r;
            if (bx >= 0 && bx < this.COLS && by >= 0 && by < this.ROWS) {
              board[by][bx] = 1;
            }
          }
        }
      }

      // 2. Draw Enemy Tanks (3x3 shape with cannon down)
      //  X . X
      //  X X X
      //  . X .
      const enemyPattern = [
        [1, 0, 1],
        [1, 1, 1],
        [0, 1, 0]
      ];
      for (const e of this.enemies) {
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            if (enemyPattern[r][c] === 1) {
              const bx = e.x - 1 + c;
              const by = e.y - 1 + r;
              if (bx >= 0 && bx < this.COLS && by >= 0 && by < this.ROWS) {
                board[by][bx] = 1;
              }
            }
          }
        }
      }

      // 3. Draw Bullets
      for (const b of this.bullets) {
        if (b.x >= 0 && b.x < this.COLS && b.y >= 0 && b.y < this.ROWS) {
          board[b.y][b.x] = 1;
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
      speed: this.speed,
      lines: this.lives, // Render remaining lives in LINES HUD slot
      isPaused: this.state === 'PAUSED',
      isMuted: this.audio.muted
    };
  }
}
