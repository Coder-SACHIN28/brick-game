/**
 * Brick Game: Retro Classic Definitive Edition
 * AudioSynth.js - Authentic 1990s Handheld Piezo Buzzer Synthesizer
 * 
 * Uses Web Audio API to reproduce the iconic 1-bit / 8-bit square wave
 * acoustics of the E-9999 handheld console with zero external audio assets.
 */

export class AudioSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.22;
    this.unlocked = false;

    // Load mute preference
    try {
      const savedMute = localStorage.getItem('brick_game_muted');
      if (savedMute !== null) {
        this.muted = savedMute === 'true';
      }
    } catch (e) {}
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.unlocked = true;
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem('brick_game_muted', this.muted);
    } catch (e) {}
    if (!this.muted) {
      this.playTone(1760, 0.05, 'square', 0.15);
    }
    return this.muted;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
  }

  /**
   * Fundamental square-wave tone generator with ADSR decay
   */
  playTone(freq, duration, type = 'square', gainMultiplier = 1.0, pitchSlideTo = null) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (pitchSlideTo !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, pitchSlideTo), now + duration);
      }

      const peakGain = this.volume * gainMultiplier;
      gain.gain.setValueAtTime(peakGain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch (e) {
      // AudioContext policy catch
    }
  }

  // 1. Piece Movement (high short tick)
  playMove() {
    this.playTone(1760, 0.022, 'square', 0.8);
  }

  // 2. Rotation (sharp click)
  playRotate() {
    this.playTone(2637, 0.028, 'square', 1.0);
  }

  // 3. Soft Drop (subtle low click)
  playSoftDrop() {
    this.playTone(520, 0.018, 'square', 0.5);
  }

  // 4. Hard Drop (heavy low thud)
  playHardDrop() {
    this.playTone(320, 0.065, 'square', 1.2, 90);
  }

  // 5. Piece Hold / Swap (distinct rising two-tone)
  playHold() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.playTone(1200, 0.035, 'square', 0.9);
    setTimeout(() => {
      this.playTone(1800, 0.045, 'square', 1.0);
    }, 38);
  }

  // 6. Line Clear Fanfare (multi-tone arpeggio)
  playLineClear(linesCount = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [
      [1046, 1568],                         // 1 Line: C6 -> G6
      [1046, 1318, 1760],                   // 2 Lines: C6 -> E6 -> A6
      [1046, 1318, 1568, 2093],             // 3 Lines: C6 -> E6 -> G6 -> C7
      [1046, 1318, 1568, 2093, 2637, 3136]  // 4 Lines (TETRIS): Grand 6-tone arpeggio
    ];

    const sequence = notes[Math.min(linesCount, 4) - 1] || notes[0];
    sequence.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.055, 'square', 1.1);
      }, i * 45);
    });
  }

  // 7. Level Up Fanfare
  playLevelUp() {
    const freqs = [880, 1174, 1480, 1760];
    freqs.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.05, 'square', 1.0);
      }, i * 50);
    });
  }

  // 8. Game Over Melody (retro descending sad tritone)
  playGameOver() {
    if (this.muted) return;
    const notes = [
      { f: 659, d: 0.12 }, // E5
      { f: 587, d: 0.12 }, // D5
      { f: 523, d: 0.14 }, // C5
      { f: 493, d: 0.16 }, // B4
      { f: 440, d: 0.20 }, // A4
      { f: 330, d: 0.35 }  // E4 (final long low tone)
    ];

    let delay = 0;
    notes.forEach(note => {
      setTimeout(() => {
        this.playTone(note.f, note.d, 'square', 1.0);
      }, delay);
      delay += note.d * 1000 + 30;
    });
  }

  // 9. Authentic Handheld Startup Jingle
  playStartupJingle() {
    if (this.muted) return;
    const melody = [
      { f: 1318, d: 0.08 }, // E6
      { f: 1568, d: 0.08 }, // G6
      { f: 2093, d: 0.09 }, // C7
      { f: 1760, d: 0.08 }, // A6
      { f: 2093, d: 0.18 }  // C7
    ];
    let delay = 0;
    melody.forEach(item => {
      setTimeout(() => {
        this.playTone(item.f, item.d, 'square', 0.9);
      }, delay);
      delay += item.d * 1000 + 20;
    });
  }

  // 10. Pause / Resume Chime
  playPause() {
    this.playTone(987, 0.04, 'square', 0.7);
    setTimeout(() => {
      this.playTone(1318, 0.05, 'square', 0.7);
    }, 45);
  }

  // 11. UI Button Click
  playClick() {
    this.playTone(1800, 0.015, 'square', 0.4);
  }
}
