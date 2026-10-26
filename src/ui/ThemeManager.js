/**
 * Brick Game: Retro Classic Definitive Edition
 * ThemeManager.js - Comprehensive Shell & LCD Customization Studio
 * 
 * Includes classic presets + VIP rewarded ad skins + full custom palette builder.
 */

export const THEME_PRESETS = {
  yellow: {
    id: 'yellow',
    name: '90s Brick Yellow',
    isVip: false,
    shellBg: '#e9b32a',
    shellBorder: '#c2921b',
    btnPrimary: '#d83a3a',
    btnSecondary: '#2e6be6',
    btnText: '#ffffff',
    lcd: {
      bg: '#9caa88',
      pixelOn: '#192514',
      pixelOff: '#8d9c7a',
      pixelGhost: '#556649',
      border: '#6f7e5e'
    }
  },
  dmg: {
    id: 'dmg',
    name: 'DMG Classic Gray',
    isVip: false,
    shellBg: '#c8c5be',
    shellBorder: '#9f9d97',
    btnPrimary: '#8f2347',
    btnSecondary: '#4c4b50',
    btnText: '#ffffff',
    lcd: {
      bg: '#8b956d',
      pixelOn: '#1f240a',
      pixelOff: '#7e8761',
      pixelGhost: '#51583e',
      border: '#687250'
    }
  },
  purple: {
    id: 'purple',
    name: 'Atomic Translucent Purple',
    isVip: false,
    shellBg: '#59447e',
    shellBorder: '#413060',
    btnPrimary: '#7e38b7',
    btnSecondary: '#3fa34d',
    btnText: '#ffffff',
    lcd: {
      bg: '#90a07a',
      pixelOn: '#1a2717',
      pixelOff: '#82916e',
      pixelGhost: '#556447',
      border: '#6d7b5b'
    }
  },
  stealth: {
    id: 'stealth',
    name: 'Cyberpunk Stealth OLED',
    isVip: false,
    shellBg: '#1b1d22',
    shellBorder: '#0f1013',
    btnPrimary: '#00f0ff',
    btnSecondary: '#ff0055',
    btnText: '#000000',
    lcd: {
      bg: '#0a141a',
      pixelOn: '#00f0ff',
      pixelOff: '#122630',
      pixelGhost: '#007a82',
      border: '#004c52'
    }
  },
  cyan: {
    id: 'cyan',
    name: 'Vintage Turquoise',
    isVip: false,
    shellBg: '#1ba098',
    shellBorder: '#14756f',
    btnPrimary: '#f26419',
    btnSecondary: '#deb841',
    btnText: '#ffffff',
    lcd: {
      bg: '#99aa85',
      pixelOn: '#162212',
      pixelOff: '#899976',
      pixelGhost: '#546347',
      border: '#6a785a'
    }
  },
  gold: {
    id: 'gold',
    name: '👑 Imperial 24K Gold',
    isVip: true,
    shellBg: '#d4af37',
    shellBorder: '#aa8c2c',
    btnPrimary: '#1a1a1a',
    btnSecondary: '#851c1c',
    btnText: '#ffd700',
    lcd: {
      bg: '#c8ad65',
      pixelOn: '#2a2007',
      pixelOff: '#b49952',
      pixelGhost: '#6b5722',
      border: '#80692a'
    }
  },
  matrix: {
    id: 'matrix',
    name: '⚡ Neon Cyber Matrix',
    isVip: true,
    shellBg: '#090d12',
    shellBorder: '#00ff66',
    btnPrimary: '#00ff66',
    btnSecondary: '#00cc52',
    btnText: '#000000',
    lcd: {
      bg: '#04170b',
      pixelOn: '#00ff66',
      pixelOff: '#0b3017',
      pixelGhost: '#00aa44',
      border: '#008833'
    }
  }
};

export class ThemeManager {
  constructor(lcd, cgManager = null) {
    this.lcd = lcd;
    this.cg = cgManager;
    this.currentThemeId = 'yellow';
    this.customTheme = null;

    this.loadTheme();
  }

  loadTheme() {
    try {
      const savedThemeId = localStorage.getItem('brick_game_theme_id');
      const savedCustom = localStorage.getItem('brick_game_custom_theme');

      if (savedCustom) {
        this.customTheme = JSON.parse(savedCustom);
      }

      if (savedThemeId && (THEME_PRESETS[savedThemeId] || savedThemeId === 'custom')) {
        this.applyTheme(savedThemeId);
      } else {
        this.applyTheme('yellow');
      }
    } catch (e) {
      this.applyTheme('yellow');
    }
  }

  applyTheme(themeId) {
    const preset = THEME_PRESETS[themeId];

    // Check if VIP theme requires rewarded ad unlock
    if (preset && preset.isVip) {
      const isUnlocked = this.cg ? this.cg.isSkinUnlocked(themeId) : (localStorage.getItem(`brick_game_vip_${themeId}`) === 'true');
      if (!isUnlocked) {
        // Trigger rewarded ad prompt
        const confirmAd = confirm(`Unlock the VIP "${preset.name}" shell by watching a quick sponsor video?`);
        if (confirmAd && this.cg) {
          this.cg.unlockVipSkin(themeId, () => {
            this.applyTheme(themeId);
          });
        }
        return;
      }
    }

    let theme = preset;
    if (themeId === 'custom' && this.customTheme) {
      theme = this.customTheme;
    } else if (!theme) {
      theme = THEME_PRESETS.yellow;
      themeId = 'yellow';
    }

    this.currentThemeId = themeId;

    const root = document.documentElement;
    root.style.setProperty('--shell-bg', theme.shellBg);
    root.style.setProperty('--shell-border', theme.shellBorder);
    root.style.setProperty('--btn-primary', theme.btnPrimary);
    root.style.setProperty('--btn-secondary', theme.btnSecondary);
    root.style.setProperty('--btn-text', theme.btnText);
    root.style.setProperty('--lcd-bg', theme.lcd.bg);
    root.style.setProperty('--lcd-pixel-on', theme.lcd.pixelOn);

    this.lcd.setTheme(theme.lcd);

    try {
      localStorage.setItem('brick_game_theme_id', themeId);
    } catch (e) {}

    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === themeId);
    });
  }

  setCustomTheme(shellColor, lcdColor, btnColor) {
    const custom = {
      id: 'custom',
      name: 'Custom User Theme',
      shellBg: shellColor,
      shellBorder: this.shadeColor(shellColor, -25),
      btnPrimary: btnColor,
      btnSecondary: this.shadeColor(btnColor, -20),
      btnText: '#ffffff',
      lcd: {
        bg: lcdColor,
        pixelOn: this.shadeColor(lcdColor, -75),
        pixelOff: this.shadeColor(lcdColor, -12),
        pixelGhost: this.shadeColor(lcdColor, -45),
        border: this.shadeColor(lcdColor, -30)
      }
    };

    this.customTheme = custom;
    try {
      localStorage.setItem('brick_game_custom_theme', JSON.stringify(custom));
    } catch (e) {}

    this.applyTheme('custom');
  }

  shadeColor(color, percent) {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = parseInt((R * (100 + percent)) / 100);
    G = parseInt((G * (100 + percent)) / 100);
    B = parseInt((B * (100 + percent)) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    R = (R > 0) ? R : 0;
    G = (G > 0) ? G : 0;
    B = (B > 0) ? B : 0;

    const RR = ((R.toString(16).length === 1) ? '0' + R.toString(16) : R.toString(16));
    const GG = ((G.toString(16).length === 1) ? '0' + G.toString(16) : G.toString(16));
    const BB = ((B.toString(16).length === 1) ? '0' + B.toString(16) : B.toString(16));

    return '#' + RR + GG + BB;
  }
}
