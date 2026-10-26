/**
 * Brick Game: Retro Classic Definitive Edition
 * InputManager.js - Ergonomic Dual-Layout Multi-Touch & Keyboard Controller
 * 
 * Features:
 * - Layout A: Ergonomic Split-Thumb (Left/Right on Left, Rotate/Drop on Right)
 * - Layout B: Classic Centered Nostalgia D-Pad
 * - Full DAS (Delayed Auto Shift) & ARR (Auto Repeat Rate) for buttery movement
 * - PointerEvents with touch target dilation to completely eliminate misclicks
 * - Haptic feedback integration
 */

export class InputManager {
  constructor(engine, audio) {
    this.engine = engine;
    this.audio = audio;

    this.activeLayout = 'split'; // 'split' | 'classic'

    // DAS & ARR Timers
    this.dasDelay = 160;  // Initial hold delay before repeat
    this.arrDelay = 42;   // Repeat interval
    this.activeHoldAction = null;
    this.holdTimer = null;
    this.repeatInterval = null;

    // Load saved control layout
    try {
      const saved = localStorage.getItem('brick_game_layout');
      if (saved === 'classic' || saved === 'split') {
        this.activeLayout = saved;
      }
    } catch (e) {}

    this.initKeyboard();
  }

  setLayout(layout) {
    this.activeLayout = layout;
    try {
      localStorage.setItem('brick_game_layout', layout);
    } catch (e) {}
    this.updateLayoutUI();
  }

  toggleLayout() {
    const next = this.activeLayout === 'split' ? 'classic' : 'split';
    this.setLayout(next);
    this.audio.playClick();
    return next;
  }

  updateLayoutUI() {
    const splitCluster = document.getElementById('controls-split');
    const classicCluster = document.getElementById('controls-classic');
    const layoutLabel = document.getElementById('lbl-layout');

    if (splitCluster && classicCluster) {
      if (this.activeLayout === 'split') {
        splitCluster.style.display = 'flex';
        classicCluster.style.display = 'none';
        if (layoutLabel) layoutLabel.textContent = 'LAYOUT: SPLIT-THUMB';
      } else {
        splitCluster.style.display = 'none';
        classicCluster.style.display = 'flex';
        if (layoutLabel) layoutLabel.textContent = 'LAYOUT: NOSTALGIA D-PAD';
      }
    }
  }

  triggerHaptic(ms = 12) {
    if (navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(ms);
      } catch (e) {}
    }
  }

  // Bind an on-screen button with PointerEvents and DAS
  bindButton(element, action, options = {}) {
    if (!element) return;

    const { repeatable = false } = options;

    const handleStart = (e) => {
      e.preventDefault();
      element.classList.add('active');
      this.triggerHaptic(10);

      this.executeAction(action);

      if (repeatable) {
        this.clearHoldTimers();
        this.activeHoldAction = action;
        this.holdTimer = setTimeout(() => {
          this.repeatInterval = setInterval(() => {
            this.executeAction(action);
          }, this.arrDelay);
        }, this.dasDelay);
      }
    };

    const handleEnd = (e) => {
      e.preventDefault();
      element.classList.remove('active');
      this.clearHoldTimers();
    };

    element.addEventListener('pointerdown', handleStart);
    element.addEventListener('pointerup', handleEnd);
    element.addEventListener('pointercancel', handleEnd);
    element.addEventListener('pointerleave', handleEnd);
  }

  clearHoldTimers() {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
    if (this.repeatInterval) {
      clearInterval(this.repeatInterval);
      this.repeatInterval = null;
    }
    this.activeHoldAction = null;
  }

  executeAction(action) {
    if (this.engine.handleAction) {
      this.engine.handleAction(action);
      return;
    }

    switch (action) {
      case 'LEFT':
        this.engine.moveLeft();
        break;
      case 'RIGHT':
        this.engine.moveRight();
        break;
      case 'SOFT_DROP':
        this.engine.softDrop();
        break;
      case 'HARD_DROP':
        this.engine.hardDrop();
        break;
      case 'ROTATE_CW':
        this.engine.rotateCW();
        break;
      case 'ROTATE_CCW':
        this.engine.rotateCCW();
        break;
      case 'HOLD':
        this.engine.hold();
        break;
      case 'START':
        if (this.engine.state === 'MENU' || this.engine.state === 'GAME_OVER') {
          this.engine.start();
        } else {
          this.engine.togglePause();
        }
        break;
      case 'PAUSE':
        this.engine.togglePause();
        break;
      case 'SOUND':
        this.audio.toggleMute();
        break;
      case 'RESET':
        this.engine.start();
        break;
    }
  }

  initKeyboard() {
    const keyMap = {
      'ArrowLeft': 'LEFT',
      'KeyA': 'LEFT',
      'ArrowRight': 'RIGHT',
      'KeyD': 'RIGHT',
      'ArrowDown': 'SOFT_DROP',
      'KeyS': 'SOFT_DROP',
      'ArrowUp': 'ROTATE_CW',
      'KeyW': 'ROTATE_CW',
      'KeyX': 'ROTATE_CW',
      'KeyZ': 'ROTATE_CCW',
      'Space': 'HARD_DROP',
      'KeyC': 'HOLD',
      'ShiftLeft': 'HOLD',
      'ShiftRight': 'HOLD',
      'KeyP': 'PAUSE',
      'Escape': 'PAUSE',
      'KeyM': 'SOUND',
      'Enter': 'START'
    };

    const keysDown = new Set();

    window.addEventListener('keydown', (e) => {
      // Don't intercept function keys or reload
      if (e.key === 'F5' || e.key === 'F12') return;

      const action = keyMap[e.code];
      if (!action) return;

      e.preventDefault();

      if (!keysDown.has(e.code)) {
        keysDown.add(e.code);
        this.executeAction(action);

        // DAS & ARR for left/right/soft-drop on keyboard
        if (['LEFT', 'RIGHT', 'SOFT_DROP'].includes(action)) {
          this.clearHoldTimers();
          this.activeHoldAction = action;
          this.holdTimer = setTimeout(() => {
            this.repeatInterval = setInterval(() => {
              if (keysDown.has(e.code)) {
                this.executeAction(action);
              }
            }, this.arrDelay);
          }, this.dasDelay);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      const action = keyMap[e.code];
      if (action) {
        keysDown.delete(e.code);
        if (this.activeHoldAction === action) {
          this.clearHoldTimers();
        }
      }
    });
  }
}
