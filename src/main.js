/**
 * Brick Game: Retro Classic Definitive Edition
 * main.js - Master Orchestrator, 9999-in-1 Suite & CrazyGames Monetization
 */

import { AudioSynth } from './audio/AudioSynth.js';
import { LcdDisplay } from './engine/LcdDisplay.js';
import { GameCoordinator } from './engine/GameCoordinator.js';
import { InputManager } from './engine/InputManager.js';
import { ThemeManager } from './ui/ThemeManager.js';
import { CrazyGamesManager } from './engine/CrazyGamesManager.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('lcd-canvas');
  if (!canvas) return;

  // 1. Initialize Subsystems
  const audio = new AudioSynth();
  const lcd = new LcdDisplay(canvas);
  const cgManager = new CrazyGamesManager(audio, null);
  const coordinator = new GameCoordinator(audio, lcd, cgManager);
  cgManager.coordinator = coordinator;

  const input = new InputManager(coordinator, audio);
  const theme = new ThemeManager(lcd, cgManager);

  // 2. Initial Display Calibration
  const handleResize = () => {
    lcd.resize();
    lcd.render(coordinator.getStateForRender());
  };
  window.addEventListener('resize', handleResize);
  handleResize();

  // 3. Bind Touch & Physical Controls
  // Function Bar Buttons
  input.bindButton(document.getElementById('btn-on-off'), 'START');
  input.bindButton(document.getElementById('btn-sound'), 'SOUND');
  input.bindButton(document.getElementById('btn-pause'), 'PAUSE');
  input.bindButton(document.getElementById('btn-reset'), 'RESET');

  // Split-Thumb Layout Controls (Repeatable for left/right/down)
  input.bindButton(document.getElementById('btn-split-left'), 'LEFT', { repeatable: true });
  input.bindButton(document.getElementById('btn-split-right'), 'RIGHT', { repeatable: true });
  input.bindButton(document.getElementById('btn-split-down'), 'SOFT_DROP', { repeatable: true });
  input.bindButton(document.getElementById('btn-split-hard-drop'), 'HARD_DROP');
  input.bindButton(document.getElementById('btn-split-rotate-cw'), 'ROTATE_CW');
  input.bindButton(document.getElementById('btn-split-rotate-ccw'), 'ROTATE_CCW');
  input.bindButton(document.getElementById('btn-split-hold'), 'HOLD');

  // Classic Nostalgia D-Pad Layout Controls
  input.bindButton(document.getElementById('btn-classic-up'), 'UP');
  input.bindButton(document.getElementById('btn-classic-down'), 'DOWN', { repeatable: true });
  input.bindButton(document.getElementById('btn-classic-left'), 'LEFT', { repeatable: true });
  input.bindButton(document.getElementById('btn-classic-right'), 'RIGHT', { repeatable: true });
  input.bindButton(document.getElementById('btn-classic-action-rotate'), 'ROTATE_CW');
  input.bindButton(document.getElementById('btn-classic-hard-drop'), 'HARD_DROP');
  input.bindButton(document.getElementById('btn-classic-hold'), 'HOLD');

  // Tap directly on Hold preview box to swap piece!
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX > rect.width * 0.6) {
      coordinator.handleAction('HOLD');
    }
  });

  // 4. Update UI layout initial state
  input.updateLayoutUI();
  coordinator.updateModeLabel();

  // Mode Switcher Button on Quick Deck
  const btnSwitchMode = document.getElementById('btn-switch-mode');
  if (btnSwitchMode) {
    btnSwitchMode.addEventListener('click', () => {
      coordinator.switchMode();
    });
  }

  // Direct Speed Stepper Buttons
  const btnSpeedDown = document.getElementById('btn-speed-down');
  const btnSpeedUp = document.getElementById('btn-speed-up');
  if (btnSpeedDown) {
    btnSpeedDown.addEventListener('click', () => {
      coordinator.decreaseSpeed();
    });
  }
  if (btnSpeedUp) {
    btnSpeedUp.addEventListener('click', () => {
      coordinator.increaseSpeed();
    });
  }

  // Tutorial / Quick Guide Modal Wiring
  const modalTutorial = document.getElementById('modal-tutorial');
  const btnOpenTutorial = document.getElementById('btn-open-tutorial');
  const btnCloseTutorial = document.getElementById('btn-close-tutorial');
  const btnTutStart = document.getElementById('btn-tutorial-start');
  const btnTutSkip = document.getElementById('btn-tutorial-skip');
  const chkTutDontShow = document.getElementById('chk-tutorial-dontshow');

  const closeTutorial = () => {
    if (modalTutorial) modalTutorial.classList.remove('visible');
    if (chkTutDontShow && chkTutDontShow.checked) {
      try { localStorage.setItem('brick_tutorial_seen', 'true'); } catch (e) {}
    }
    audio.playClick();
  };

  if (btnOpenTutorial && modalTutorial) {
    btnOpenTutorial.addEventListener('click', () => {
      modalTutorial.classList.add('visible');
      audio.playClick();
    });
  }

  if (btnCloseTutorial) btnCloseTutorial.addEventListener('click', closeTutorial);
  if (btnTutStart) btnTutStart.addEventListener('click', closeTutorial);
  if (btnTutSkip) btnTutSkip.addEventListener('click', closeTutorial);

  // Auto-show tutorial on first visit
  try {
    const hasSeenTutorial = localStorage.getItem('brick_tutorial_seen');
    if (!hasSeenTutorial && modalTutorial) {
      setTimeout(() => {
        modalTutorial.classList.add('visible');
      }, 350);
    }
  } catch (e) {}

  // Layout switcher button
  const btnToggleLayout = document.getElementById('btn-toggle-layout');
  if (btnToggleLayout) {
    btnToggleLayout.addEventListener('click', () => {
      input.toggleLayout();
    });
  }

  // Ghost piece toggle
  let ghostEnabled = true;
  const btnToggleGhost = document.getElementById('btn-toggle-ghost');
  if (btnToggleGhost) {
    btnToggleGhost.addEventListener('click', () => {
      ghostEnabled = !ghostEnabled;
      lcd.setShowGhost(ghostEnabled);
      btnToggleGhost.classList.toggle('active', ghostEnabled);
      audio.playClick();
    });
  }

  // 5. Theme Modal & Color Customizer
  const modalTheme = document.getElementById('modal-theme');
  const btnOpenTheme = document.getElementById('btn-open-theme');
  const btnCloseTheme = document.getElementById('btn-close-theme');

  if (btnOpenTheme && modalTheme) {
    btnOpenTheme.addEventListener('click', () => {
      modalTheme.classList.add('visible');
      audio.playClick();
    });
  }

  if (btnCloseTheme && modalTheme) {
    btnCloseTheme.addEventListener('click', () => {
      modalTheme.classList.remove('visible');
      audio.playClick();
    });
  }

  // Preset Buttons (including VIP rewarded ad themes)
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const themeKey = btn.dataset.theme;
      theme.applyTheme(themeKey);
      audio.playClick();
    });
  });

  // Custom Color Pickers
  const pickerShell = document.getElementById('picker-shell');
  const pickerLcd = document.getElementById('picker-lcd');
  const pickerBtn = document.getElementById('picker-btn');
  const btnApplyCustom = document.getElementById('btn-apply-custom');

  if (btnApplyCustom && pickerShell && pickerLcd && pickerBtn) {
    btnApplyCustom.addEventListener('click', () => {
      theme.setCustomTheme(pickerShell.value, pickerLcd.value, pickerBtn.value);
      audio.playClick();
    });
  }

  // 6. Rewarded Ad: 2X Score Multiplier Boost
  const btnRewardBoost = document.getElementById('btn-reward-boost');
  if (btnRewardBoost) {
    btnRewardBoost.addEventListener('click', () => {
      audio.playClick();
      cgManager.activateScoreBoost(() => {
        btnRewardBoost.style.display = 'none';
      });
    });
  }

  // 7. Rewarded Ad: Second Chance Revive Callbacks
  const btnReviveWatch = document.getElementById('btn-revive-watch');
  const btnReviveSkip = document.getElementById('btn-revive-skip');

  if (btnReviveWatch) {
    btnReviveWatch.addEventListener('click', () => {
      audio.playClick();
      cgManager.requestRewardedAd(
        () => {
          const game = coordinator.getActiveGame();
          if (game && game.revive) game.revive();
        },
        () => {
          const game = coordinator.getActiveGame();
          if (game && game.dismissRevive) game.dismissRevive();
        }
      );
    });
  }

  if (btnReviveSkip) {
    btnReviveSkip.addEventListener('click', () => {
      audio.playClick();
      const game = coordinator.getActiveGame();
      if (game && game.dismissRevive) game.dismissRevive();
    });
  }

  // 8. Tab Visibility Change (Muting & Pausing Requirement)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (coordinator.state === 'PLAYING') {
        coordinator.handleAction('PAUSE');
      }
    }
  });

  // 9. Master 60Hz RequestAnimationFrame Game Loop
  function gameLoop(timestamp) {
    coordinator.update(timestamp);
    lcd.render(coordinator.getStateForRender());
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

  // Audio gesture unlock
  const unlockAudio = () => {
    audio.init();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
});
