class ThemeManager {
  static getTheme(id) {
    const t = THEMES.find(t => t.id === id) || THEMES[0];
    if (id === 'custom') {
      const custom = store.get('customThemeColors') || {};
      return { ...t, colors: { ...t.colors, ...custom } };
    }
    return t;
  }

  static getAllThemes() {
    return THEMES;
  }

  static isThemeUnlocked(id) {
    const unlockReqs = {
      space: 1, medieval: 1, ocean: 1,
      egypt: 2, cyberpunk: 4, japanese: 5,
      artdeco: 6, wildwest: 7, prehistoric: 8,
      steampunk: 9, crystal: 1, custom: 1,
    };
    const req = unlockReqs[id] || 1;
    const save = store.getActiveSave();
    const maxLevel = (save && save.maxUnlockedLevel) || 1;
    return maxLevel >= req;
  }

  static setCustomColor(key, value) {
    const custom = store.get('customThemeColors') || {};
    custom[key] = value;
    store.set('customThemeColors', custom);
    store.saveProgress();
  }

  static applyTheme(id) {
    const theme = this.getTheme(id);
    store.set('theme', id);
    PieceRenderer.clearCache();
    TextureManager.preloadTheme(theme.id);
    if (typeof audioManager !== 'undefined') {
      audioManager.stopMusic();
      audioManager.startMusic();
    }
    store.saveProgress();
    return theme;
  }
}
