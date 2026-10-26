/**
 * Brick Game: Retro Classic Definitive Edition
 * SnakeGame.js - Mode D: Authentic 10x20 LCD Retro Snake
 * 
 * Mechanics:
 * - 10x20 monochrome matrix
 * - Dynamic 4-direction continuous navigation
 * - Blinking food pixel
 * - Tail elongation, score scaling, and 20 speed levels
 */

export class SnakeGame {
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
    this.foodEaten = 0;

    this.snake = [];
    this.direction = { x: 0, y: -1 };
    this.nextDirection = { x: 0, y: -1 };
    this.food = { x: 5, y: 5 };

    this.lastTickTime = 0;
    this.foodBlinkState = true;
    this.foodBlinkTimer = 0;

    this.loadHiScore();
  }

  loadHiScore() {
    try {
      const saved = this.cg ? this.cg.getItem('brick_game_snake_hiscore') : localStorage.getItem('brick_game_snake_hiscore');
      this.hiScore = saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      this.hiScore = 0;
    }
  }

  saveHiScore() {
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      if (this.cg) {
        this.cg.setItem('brick_game_snake_hiscore', this.hiScore);
        this.cg.happytime();
      } else {
        try {
          localStorage.setItem('brick_game_snake_hiscore', this.hiScore);
        } catch (e) {}
      }
    }
  }

  start() {
    this.score = 0;
    this.level = 1;
    this.speed = 1;
    this.foodEaten = 0;

    // Start in center moving Up
    this.snake = [
      { x: 5, y: 12 },
      { x: 5, y: 13 },
      { x: 5, y: 14 }
    ];
    this.direction = { x: 0, y: -1 };
    this.nextDirection = { x: 0, y: -1 };

    this.spawnFood();

    this.state = 'PLAYING';
    if (this.cg) this.cg.gameplayStart();
    this.audio.playStartupJingle();
  }

  setDirection(dx, dy) {
    if (this.state !== 'PLAYING') return;
    // Prevent 180-degree instant reversal into own neck
    if (this.direction.x !== -dx || this.direction.y !== -dy) {
      this.nextDirection = { x: dx, y: dy };
      this.audio.playMove();
    }
  }

  spawnFood() {
    const emptyCells = [];
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const onSnake = this.snake.some(segment => segment.x === c && segment.y === r);
        if (!onSnake) {
          emptyCells.push({ x: c, y: r });
        }
      }
    }

    if (emptyCells.length > 0) {
      const choice = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.food = choice;
    }
  }

  update(timestamp) {
    if (this.state !== 'PLAYING') return;

    if (!this.lastTickTime) this.lastTickTime = timestamp;
    const elapsed = timestamp - this.lastTickTime;
    const tickInterval = Math.max(45, 240 - (this.speed * 9.5));

    if (elapsed < tickInterval) return;
    this.lastTickTime = timestamp;

    this.direction = { ...this.nextDirection };

    // Next head position
    const head = this.snake[0];
    const newHead = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y
    };

    // 1. Wall Collision Check
    if (newHead.x < 0 || newHead.x >= this.COLS || newHead.y < 0 || newHead.y >= this.ROWS) {
      this.triggerGameOver();
      return;
    }

    // 2. Self Collision Check
    const biteSelf = this.snake.some(seg => seg.x === newHead.x && seg.y === newHead.y);
    if (biteSelf) {
      this.triggerGameOver();
      return;
    }

    // 3. Move Snake
    this.snake.unshift(newHead);

    // 4. Food Check
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.foodEaten++;
      this.score += 100 * this.level;
      this.saveHiScore();
      this.audio.playRotate();

      // Level up every 4 foods
      if (this.foodEaten % 4 === 0) {
        this.level = Math.min(20, this.level + 1);
        this.speed = this.level;
        this.audio.playLevelUp();
      }

      this.spawnFood();
    } else {
      this.snake.pop(); // Remove tail segment
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

    // Trim snake length back to 3 and re-orient away from walls
    this.snake = [
      { x: 5, y: 10 },
      { x: 5, y: 11 },
      { x: 5, y: 12 }
    ];
    this.direction = { x: 0, y: -1 };
    this.nextDirection = { x: 0, y: -1 };
    this.spawnFood();

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
      // 1. Draw Snake Body
      for (const seg of this.snake) {
        if (seg.x >= 0 && seg.x < this.COLS && seg.y >= 0 && seg.y < this.ROWS) {
          board[seg.y][seg.x] = 1;
        }
      }

      // 2. Draw Food Dot (blinks)
      if (this.food && this.food.x >= 0 && this.food.y >= 0) {
        board[this.food.y][this.food.x] = 1;
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
      lines: this.foodEaten,
      isPaused: this.state === 'PAUSED',
      isMuted: this.audio.muted
    };
  }
}
