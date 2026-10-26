/**
 * Brick Game: Retro Classic Definitive Edition
 * GameCoordinator.js - Master 9999-in-1 Multi-Game Suite Manager
 * 
 * Supports:
 * - Mode A: Classic Brick / Tetris
 * - Mode B: Tank Battle
 * - Mode C: Formula Racing Dodger
 * - Mode D: Classic Retro Snake
 * 
 * Handles mode selection menu, preview animations, and unified input routing.
 */

import { TetrisEngine } from './TetrisEngine.js';
import { TankGame } from '../games/TankGame.js';
import { RacingGame } from '../games/RacingGame.js';
import { SnakeGame } from '../games/SnakeGame.js';

export class GameCoordinator {
  constructor(audio, lcd, cgManager) {
    this.audio = audio;
    this.lcd = lcd;
    this.cg = cgManager;

    this.modes = ['A', 'B', 'C', 'D'];
    this.modeNames = {
      'A': 'CLASSIC TETRIS',
      'B': 'TANK BATTLE',
      'C': 'RACING DODGER',
      'D': 'RETRO SNAKE'
    };

    this.currentModeIndex = 0; // Default: 'A'
    this.selectedSpeed = 1;
    this.selectedLevel = 1;

    this.isMenu = true;
    this.menuAnimTick = 0;

    // Instantiate game engines
    this.games = {
      'A': new TetrisEngine(this.audio, this.lcd, this.cg),
      'B': new TankGame(this.audio, this.lcd, this.cg),
      'C': new RacingGame(this.audio, this.lcd, this.cg),
      'D': new SnakeGame(this.audio, this.lcd, this.cg)
    };
  }

  getActiveGame() {
    const key = this.modes[this.currentModeIndex];
    return this.games[key];
  }

  get state() {
    if (this.isMenu) return 'MENU';
    return this.getActiveGame().state;
  }

  set state(val) {
    if (this.isMenu) return;
    this.getActiveGame().state = val;
  }

  // Next / Prev Mode with instant hot-switching
  switchMode(targetIndex = null) {
    if (!this.isMenu) {
      const active = this.getActiveGame();
      if (active && active.state === 'PLAYING') {
        active.state = 'MENU';
        if (this.cg) this.cg.gameplayStop();
      }
      this.isMenu = true;
    }
    if (targetIndex !== null) {
      this.currentModeIndex = targetIndex % this.modes.length;
    } else {
      this.currentModeIndex = (this.currentModeIndex + 1) % this.modes.length;
    }
    this.audio.playRotate();
    this.updateModeLabel();
  }

  nextMode() {
    this.switchMode();
  }

  prevMode() {
    if (!this.isMenu) {
      this.isMenu = true;
    }
    this.currentModeIndex = (this.currentModeIndex - 1 + this.modes.length) % this.modes.length;
    this.audio.playRotate();
    this.updateModeLabel();
  }

  increaseSpeed() {
    this.selectedSpeed = Math.min(20, this.selectedSpeed + 1);
    this.selectedLevel = this.selectedSpeed;
    const active = this.getActiveGame();
    if (active) {
      active.speed = this.selectedSpeed;
      active.level = this.selectedLevel;
      if (active.updateSpeed) active.updateSpeed();
    }
    this.audio.playMove();
    this.updateSpeedUI();
  }

  decreaseSpeed() {
    this.selectedSpeed = Math.max(1, this.selectedSpeed - 1);
    this.selectedLevel = this.selectedSpeed;
    const active = this.getActiveGame();
    if (active) {
      active.speed = this.selectedSpeed;
      active.level = this.selectedLevel;
      if (active.updateSpeed) active.updateSpeed();
    }
    this.audio.playMove();
    this.updateSpeedUI();
  }

  updateSpeedUI() {
    const badge = document.getElementById('lbl-speed-val');
    if (badge) {
      badge.textContent = String(this.selectedSpeed).padStart(2, '0');
    }
  }

  updateModeLabel() {
    const lbl = document.getElementById('lbl-active-mode');
    const badge = document.getElementById('lbl-mode-badge');
    const mode = this.modes[this.currentModeIndex];
    if (lbl) {
      lbl.textContent = `MODE ${mode}: ${this.modeNames[mode]}`;
    }
    if (badge) {
      badge.textContent = mode;
    }
    this.updateSpeedUI();
  }

  // Start selected game mode
  startActiveGame() {
    this.isMenu = false;
    const game = this.getActiveGame();
    game.speed = this.selectedSpeed;
    game.level = this.selectedLevel;
    game.start();
  }

  // Return to Game Select Menu
  returnToMenu() {
    this.isMenu = true;
    const game = this.getActiveGame();
    if (game && game.state === 'PLAYING') {
      game.state = 'MENU';
      if (this.cg) this.cg.gameplayStop();
    }
    this.audio.playStartupJingle();
  }

  // Unified Input Router
  handleAction(action) {
    if (this.isMenu) {
      switch (action) {
        case 'UP':
        case 'ROTATE_CW':
        case 'ROTATE_CCW':
          this.nextMode();
          break;
        case 'DOWN':
          this.prevMode();
          break;
        case 'LEFT':
          this.decreaseSpeed();
          break;
        case 'RIGHT':
          this.increaseSpeed();
          break;
        case 'START':
        case 'HARD_DROP':
          this.startActiveGame();
          break;
        case 'RESET':
          this.returnToMenu();
          break;
        case 'SOUND':
          this.audio.toggleMute();
          break;
      }
      return;
    }

    // Gameplay Router
    const game = this.getActiveGame();
    const mode = this.modes[this.currentModeIndex];

    switch (action) {
      case 'LEFT':
        if (mode === 'D') game.setDirection(-1, 0);
        else game.moveLeft();
        break;
      case 'RIGHT':
        if (mode === 'D') game.setDirection(1, 0);
        else game.moveRight();
        break;
      case 'SOFT_DROP':
      case 'DOWN':
        if (mode === 'D') game.setDirection(0, 1);
        else if (mode === 'B') game.moveDown();
        else if (mode === 'A') game.softDrop();
        break;
      case 'UP':
        if (mode === 'D') game.setDirection(0, -1);
        else if (mode === 'B') game.moveUp();
        else if (mode === 'C') game.toggleTurbo();
        else if (mode === 'A') game.rotateCW();
        break;
      case 'ROTATE_CW':
        if (mode === 'A') game.rotateCW();
        else if (mode === 'B') game.shoot();
        else if (mode === 'C') game.toggleTurbo();
        else if (mode === 'D') game.setDirection(0, -1);
        break;
      case 'ROTATE_CCW':
        if (mode === 'A') game.rotateCCW();
        else if (mode === 'B') game.shoot();
        else if (mode === 'C') game.toggleTurbo();
        break;
      case 'HARD_DROP':
        if (mode === 'A') game.hardDrop();
        else if (mode === 'B') game.shoot();
        else if (mode === 'C') game.toggleTurbo();
        break;
      case 'HOLD':
        if (mode === 'A') game.hold();
        break;
      case 'PAUSE':
        game.togglePause();
        break;
      case 'RESET':
        this.returnToMenu();
        break;
      case 'START':
        if (game.state === 'MENU' || game.state === 'GAME_OVER') {
          game.start();
        } else {
          game.togglePause();
        }
        break;
      case 'SOUND':
        this.audio.toggleMute();
        break;
    }
  }

  update(timestamp) {
    if (this.isMenu) {
      this.menuAnimTick++;
      return;
    }
    const game = this.getActiveGame();
    if (game) {
      game.update(timestamp);
      // Check if game transitioned to MENU (e.g. after game over curtain)
      if (game.state === 'MENU') {
        this.isMenu = true;
      }
    }
  }

  getStateForRender() {
    if (!this.isMenu) {
      return this.getActiveGame().getStateForRender();
    }

    // Render Menu Preview
    return this.getMenuRenderState();
  }

  // Authentic 10x20 Menu Screen with Letter & Animated Mode Preview
  getMenuRenderState() {
    const board = Array(20).fill(null).map(() => Array(10).fill(0));
    const mode = this.modes[this.currentModeIndex];
    const frame = Math.floor(this.menuAnimTick / 15) % 4;

    // 1. Draw Large Mode Letter (A, B, C, D) on rows 1..6
    const letterMap = {
      'A': [
        [0, 1, 1, 0],
        [1, 0, 0, 1],
        [1, 1, 1, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1]
      ],
      'B': [
        [1, 1, 1, 0],
        [1, 0, 0, 1],
        [1, 1, 1, 0],
        [1, 0, 0, 1],
        [1, 1, 1, 0]
      ],
      'C': [
        [0, 1, 1, 1],
        [1, 0, 0, 0],
        [1, 0, 0, 0],
        [1, 0, 0, 0],
        [0, 1, 1, 1]
      ],
      'D': [
        [1, 1, 1, 0],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 1, 1, 0]
      ]
    };

    const letter = letterMap[mode];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 4; c++) {
        if (letter[r][c] === 1) {
          board[r + 2][c + 3] = 1;
        }
      }
    }

    // 2. Divider line row 8
    for (let c = 1; c < 9; c++) {
      board[8][c] = (c % 2 === 0) ? 1 : 0;
    }

    // 3. Draw Animated Mini Game Preview on rows 10..18
    if (mode === 'A') {
      // Tetris: Falling T piece and stack
      const dropY = 10 + (frame % 3);
      board[dropY][4] = 1;
      board[dropY + 1][3] = 1;
      board[dropY + 1][4] = 1;
      board[dropY + 1][5] = 1;

      // Bottom bricks
      board[18][2] = 1; board[18][3] = 1; board[18][6] = 1; board[18][7] = 1;
    } else if (mode === 'B') {
      // Tank: Player tank vs Enemy tank
      // Enemy Tank
      board[10][4] = 1; board[10][6] = 1;
      board[11][4] = 1; board[11][5] = 1; board[11][6] = 1;
      board[12][5] = 1;

      // Bullet
      board[14][5] = 1;

      // Player Tank
      board[16][5] = 1;
      board[17][4] = 1; board[17][5] = 1; board[17][6] = 1;
      board[18][4] = 1; board[18][6] = 1;
    } else if (mode === 'C') {
      // Racing: Road borders and car
      for (let r = 10; r < 19; r++) {
        if ((r + frame) % 2 === 0) {
          board[r][1] = 1;
          board[r][8] = 1;
        }
      }
      // Car
      const carLane = (frame % 2 === 0) ? 3 : 5;
      board[14][carLane] = 1;
      board[15][carLane - 1] = 1; board[15][carLane] = 1; board[15][carLane + 1] = 1;
      board[16][carLane - 1] = 1; board[16][carLane + 1] = 1;
    } else if (mode === 'D') {
      // Snake: Crawling dots & food
      board[12][6] = 1; // Food
      board[14][3] = 1; board[14][4] = 1; board[14][5] = 1;
      board[15][3] = 1; board[16][3] = 1;
    }

    return {
      board,
      currentPiece: null,
      ghostY: null,
      nextPiece: null,
      holdPiece: null,
      score: 0,
      hiScore: this.getActiveGame().hiScore,
      level: this.selectedLevel,
      speed: this.selectedSpeed,
      lines: 0,
      isPaused: false,
      isMuted: this.audio.muted
    };
  }
}
