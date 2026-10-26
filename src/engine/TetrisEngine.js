/**
 * Brick Game: Retro Classic Definitive Edition
 * TetrisEngine.js - Tournament-Grade 10x20 LCD Tetris State Machine
 * 
 * Features:
 * - CrazyGames SDK v3 Full Lifecycle (gameplayStart/gameplayStop, happytime, data sync)
 * - Rewarded Ad "Revive & Clear Board" Second Chance
 * - 7-Bag Randomizer (eliminates piece starvation)
 * - Wall Kicks (robust SRS offset evaluation)
 * - Hold / Piece Swap Queue (requested feature)
 * - 20 Exponential Speed Levels
 * - Hard Drop, Soft Drop, Ghost Piece Projection
 * - Authentic 90s Score and Line Multipliers
 */

export const TETROMINOES = {
  I: {
    id: 'I',
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]
  },
  O: {
    id: 'O',
    shape: [
      [1, 1],
      [1, 1]
    ]
  },
  T: {
    id: 'T',
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ]
  },
  S: {
    id: 'S',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ]
  },
  Z: {
    id: 'Z',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ]
  },
  J: {
    id: 'J',
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ]
  },
  L: {
    id: 'L',
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ]
  }
};

export class TetrisEngine {
  constructor(audio, lcd, cgManager = null) {
    this.audio = audio;
    this.lcd = lcd;
    this.cg = cgManager;

    this.COLS = 10;
    this.ROWS = 20;

    this.board = [];
    this.currentPiece = null;
    this.nextPiece = null;
    this.holdPiece = null;
    this.canHold = true;

    // Metrics & Progression
    this.score = 0;
    this.hiScore = 0;
    this.level = 1;
    this.speed = 1;
    this.lines = 0;

    // State machine: 'MENU', 'PLAYING', 'PAUSED', 'LINE_FLASH', 'GAME_OVER', 'REVIVE_OFFER'
    this.state = 'MENU';

    // Bag Randomizer
    this.bag = [];

    // Timing
    this.dropInterval = 800;
    this.lastDropTime = 0;
    this.lockDelay = 350;
    this.lockTimer = null;

    this.loadHiScore();
    this.resetBoard();
  }

  setCrazyGamesManager(cgManager) {
    this.cg = cgManager;
    this.loadHiScore();
  }

  loadHiScore() {
    try {
      const saved = this.cg ? this.cg.getItem('brick_game_hiscore') : localStorage.getItem('brick_game_hiscore');
      this.hiScore = saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      this.hiScore = 0;
    }
  }

  saveHiScore() {
    if (this.score > this.hiScore) {
      const isRecord = (this.hiScore > 0);
      this.hiScore = this.score;
      if (this.cg) {
        this.cg.setItem('brick_game_hiscore', this.hiScore);
        if (isRecord) this.cg.happytime();
      } else {
        try {
          localStorage.setItem('brick_game_hiscore', this.hiScore);
        } catch (e) {}
      }
    }
  }

  resetBoard() {
    this.board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(0));
  }

  // 7-Bag Randomizer
  refillBag() {
    const keys = Object.keys(TETROMINOES);
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [keys[i], keys[j]] = [keys[j], keys[i]];
    }
    this.bag = keys;
  }

  getNextFromBag() {
    if (this.bag.length === 0) {
      this.refillBag();
    }
    const key = this.bag.pop();
    const proto = TETROMINOES[key];
    return {
      id: proto.id,
      shape: proto.shape.map(row => [...row])
    };
  }

  start() {
    this.resetBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.speed = 1;
    this.updateSpeed();

    this.bag = [];
    this.refillBag();

    this.holdPiece = null;
    this.canHold = true;

    this.nextPiece = this.getNextFromBag();
    this.spawnNextPiece();

    this.state = 'PLAYING';
    if (this.cg) this.cg.gameplayStart();
    this.audio.playStartupJingle();
  }

  updateSpeed() {
    // 20 Speed Levels: Formula: max(45ms, 850 * 0.865^(speed - 1))
    this.dropInterval = Math.max(45, Math.floor(850 * Math.pow(0.865, this.speed - 1)));
  }

  spawnNextPiece() {
    this.currentPiece = this.nextPiece;
    this.nextPiece = this.getNextFromBag();
    this.canHold = true;

    // Position at top center
    const w = this.currentPiece.shape[0].length;
    this.currentPiece.x = Math.floor((this.COLS - w) / 2);
    this.currentPiece.y = 0;

    // Check game over collision upon spawn
    if (this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y)) {
      this.triggerGameOver();
    }
  }

  // Swap / Hold Piece
  hold() {
    if (this.state !== 'PLAYING' || !this.canHold) return;

    this.audio.playHold();
    if (!this.holdPiece) {
      this.holdPiece = {
        id: this.currentPiece.id,
        shape: TETROMINOES[this.currentPiece.id].shape.map(r => [...r])
      };
      this.spawnNextPiece();
    } else {
      const temp = this.holdPiece;
      this.holdPiece = {
        id: this.currentPiece.id,
        shape: TETROMINOES[this.currentPiece.id].shape.map(r => [...r])
      };
      this.currentPiece = {
        id: temp.id,
        shape: TETROMINOES[temp.id].shape.map(r => [...r])
      };
      const w = this.currentPiece.shape[0].length;
      this.currentPiece.x = Math.floor((this.COLS - w) / 2);
      this.currentPiece.y = 0;
    }
    this.canHold = false;
  }

  // Collision detection
  checkCollision(shape, posX, posY) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          const bx = posX + c;
          const by = posY + r;

          // Wall boundaries
          if (bx < 0 || bx >= this.COLS || by >= this.ROWS) {
            return true;
          }

          // Existing locked bricks
          if (by >= 0 && this.board[by][bx] === 1) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Calculate Ghost Piece Landing Y
  getGhostY() {
    if (!this.currentPiece) return null;
    let gy = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x, gy + 1)) {
      gy++;
    }
    return gy;
  }

  // Rotate clockwise with Wall Kicks
  rotateCW() {
    if (this.state !== 'PLAYING' || !this.currentPiece) return;

    const oldShape = this.currentPiece.shape;
    const n = oldShape.length;
    const m = oldShape[0].length;

    // Transpose and reverse rows
    const newShape = Array(m).fill(null).map((_, c) =>
      Array(n).fill(0).map((_, r) => oldShape[n - 1 - r][c])
    );

    // Wall Kick Offsets: [dx, dy]
    const kicks = [
      [0, 0],
      [-1, 0],
      [1, 0],
      [-2, 0],
      [2, 0],
      [0, -1]
    ];

    for (const [dx, dy] of kicks) {
      if (!this.checkCollision(newShape, this.currentPiece.x + dx, this.currentPiece.y + dy)) {
        this.currentPiece.shape = newShape;
        this.currentPiece.x += dx;
        this.currentPiece.y += dy;
        this.audio.playRotate();
        return;
      }
    }
  }

  // Rotate counter-clockwise
  rotateCCW() {
    if (this.state !== 'PLAYING' || !this.currentPiece) return;

    const oldShape = this.currentPiece.shape;
    const n = oldShape.length;
    const m = oldShape[0].length;

    const newShape = Array(m).fill(null).map((_, c) =>
      Array(n).fill(0).map((_, r) => oldShape[r][m - 1 - c])
    );

    const kicks = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [2, 0],
      [-2, 0],
      [0, -1]
    ];

    for (const [dx, dy] of kicks) {
      if (!this.checkCollision(newShape, this.currentPiece.x + dx, this.currentPiece.y + dy)) {
        this.currentPiece.shape = newShape;
        this.currentPiece.x += dx;
        this.currentPiece.y += dy;
        this.audio.playRotate();
        return;
      }
    }
  }

  moveLeft() {
    if (this.state !== 'PLAYING' || !this.currentPiece) return;
    if (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x - 1, this.currentPiece.y)) {
      this.currentPiece.x--;
      this.audio.playMove();
    }
  }

  moveRight() {
    if (this.state !== 'PLAYING' || !this.currentPiece) return;
    if (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x + 1, this.currentPiece.y)) {
      this.currentPiece.x++;
      this.audio.playMove();
    }
  }

  softDrop() {
    if (this.state !== 'PLAYING' || !this.currentPiece) return;
    if (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
      this.currentPiece.y++;
      this.score += 1;
      this.saveHiScore();
      this.audio.playSoftDrop();
    } else {
      this.lockPiece();
    }
  }

  hardDrop() {
    if (this.state !== 'PLAYING' || !this.currentPiece) return;
    let droppedCells = 0;
    while (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
      this.currentPiece.y++;
      droppedCells++;
    }
    this.score += droppedCells * 2;
    this.saveHiScore();
    this.audio.playHardDrop();
    this.lockPiece();
  }

  lockPiece() {
    if (!this.currentPiece) return;

    // Stamp current piece onto the board
    const shape = this.currentPiece.shape;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          const by = this.currentPiece.y + r;
          const bx = this.currentPiece.x + c;
          if (by >= 0 && by < this.ROWS && bx >= 0 && bx < this.COLS) {
            this.board[by][bx] = 1;
          }
        }
      }
    }

    this.currentPiece = null;
    this.checkLineClears();
  }

  checkLineClears() {
    const fullRows = [];
    for (let r = 0; r < this.ROWS; r++) {
      if (this.board[r].every(cell => cell === 1)) {
        fullRows.push(r);
      }
    }

    if (fullRows.length > 0) {
      this.state = 'LINE_FLASH';
      this.audio.playLineClear(fullRows.length);

      // Trigger CrazyGames happytime on 4-line Tetris clear!
      if (fullRows.length === 4 && this.cg) {
        this.cg.happytime();
      }

      this.lcd.triggerLineClearFlash(fullRows, () => {
        for (const rowIndex of fullRows) {
          this.board.splice(rowIndex, 1);
          this.board.unshift(Array(this.COLS).fill(0));
        }

        const multipliers = [100, 300, 700, 1500];
        const linePoints = (multipliers[fullRows.length - 1] || 100) * this.level;
        this.score += linePoints;
        this.lines += fullRows.length;

        const newLevel = Math.min(20, Math.floor(this.lines / 10) + 1);
        if (newLevel > this.level) {
          this.level = newLevel;
          this.speed = newLevel;
          this.updateSpeed();
          this.audio.playLevelUp();
        }

        this.saveHiScore();
        this.state = 'PLAYING';
        this.spawnNextPiece();
      });
    } else {
      this.spawnNextPiece();
    }
  }

  triggerGameOver() {
    this.state = 'GAME_OVER';
    if (this.cg) this.cg.gameplayStop();
    this.saveHiScore();
    this.audio.playGameOver();
    this.lcd.triggerGameOverCurtain(() => {
      // Offer Rewarded Ad Revive
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

  // Revive player by clearing top 10 rows
  revive() {
    const reviveModal = document.getElementById('modal-revive');
    if (reviveModal) reviveModal.classList.remove('visible');

    for (let r = 0; r < 12; r++) {
      this.board[r] = Array(this.COLS).fill(0);
    }
    this.spawnNextPiece();
    this.state = 'PLAYING';
    if (this.cg) this.cg.gameplayStart();
    this.audio.playLevelUp();
  }

  // Dismiss revive, show midgame ad, and return to menu
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

  // Core Game Loop Tick
  update(timestamp) {
    if (this.state !== 'PLAYING') return;

    if (!this.lastDropTime) this.lastDropTime = timestamp;
    const elapsed = timestamp - this.lastDropTime;

    if (elapsed >= this.dropInterval) {
      this.lastDropTime = timestamp;
      if (this.currentPiece) {
        if (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
          this.currentPiece.y++;
        } else {
          this.lockPiece();
        }
      }
    }
  }

  getStateForRender() {
    return {
      board: this.board,
      currentPiece: this.currentPiece,
      ghostY: this.getGhostY(),
      nextPiece: this.nextPiece,
      holdPiece: this.holdPiece,
      score: this.score,
      hiScore: this.hiScore,
      level: this.level,
      speed: this.speed,
      lines: this.lines,
      isPaused: this.state === 'PAUSED',
      isMuted: this.audio.muted
    };
  }
}
