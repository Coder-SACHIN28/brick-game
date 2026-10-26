/**
 * Brick Game: Retro Classic Definitive Edition
 * StandaloneManager.js - Standalone & GitHub Pages Game Manager
 * 
 * Provides high-score persistence, audio hooks, and VIP skin unlocking
 * with zero external ad network dependencies for pure standalone / GitHub Pages play.
 */

export class CrazyGamesManager {
  constructor(audio, coordinator = null) {
    this.audio = audio;
    this.coordinator = coordinator;
    this.scoreMultiplier = 1;
    this.isScoreBoosted = false;
  }

  gameplayStart() {}

  gameplayStop() {}

  happytime() {
    if (this.audio) {
      try {
        this.audio.playClick();
      } catch (e) {}
    }
  }

  requestMidgameAd(onComplete = null) {
    if (onComplete) onComplete();
  }

  requestRewardedAd(onRewardGranted, onDismiss = null) {
    // In standalone / GitHub Pages edition, all bonus perks are granted freely!
    if (onRewardGranted) onRewardGranted();
  }

  activateScoreBoost(onActivated = null) {
    this.scoreMultiplier = 2;
    this.isScoreBoosted = true;
    if (onActivated) onActivated();
  }

  unlockVipSkin(skinId, onUnlocked = null) {
    try {
      localStorage.setItem(`brick_game_vip_${skinId}`, 'true');
    } catch (e) {}
    if (onUnlocked) onUnlocked();
  }

  isSkinUnlocked(skinId) {
    // All VIP skins unlocked by default in standalone edition!
    return true;
  }

  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  setItem(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (e) {}
  }
}
