class ThemeManager {
  static getCurrentColors() {
    return this.getTheme(store.get('theme')).colors;
  }

  static getTheme(id) {
    id = THEME_ALIASES[id] || id;
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

  // Maps a theme id from an old save to its world (unknown ids fall back to
  // Pawn Hollow).
  static resolveId(id) {
    id = THEME_ALIASES[id] || id;
    return THEMES.some(t => t.id === id) ? id : 'pawnhollow';
  }

  // A world's theme (and song) unlocks once that world is restored in any
  // save slot. Pawn Hollow and Custom are always open; themes a player had
  // before the story worlds stay open (store.unlockedThemes).
  static isThemeUnlocked(id) {
    if (typeof SuperUser !== 'undefined' && SuperUser.active()) return true;
    id = THEME_ALIASES[id] || id;
    if (id === 'pawnhollow' || id === 'custom') return true;
    if ((store.get('unlockedThemes') || []).includes(id)) return true;
    if (typeof WORLDS === 'undefined') return false;
    const world = WORLDS.find(w => w.art === id);
    if (!world) return false;
    return (store.get('storySaves') || []).some(save => StoryProgress.isRestored(save, world));
  }

  // The world that unlocks a theme, for "locked" labels.
  static unlockWorld(id) {
    return typeof WORLDS !== 'undefined' ? WORLDS.find(w => w.art === id) || null : null;
  }

  static setCustomColor(key, value) {
    const custom = store.get('customThemeColors') || {};
    custom[key] = value;
    store.set('customThemeColors', custom);
    store.saveProgress();
  }

  static applyTheme(id) {
    const prevThemeId = store.get('theme');
    const theme = this.getTheme(id);
    store.set('theme', id);
    if (prevThemeId && prevThemeId !== id) {
      TextureManager.clearThemeTextures(prevThemeId);
    }
    PieceRenderer.clearCache();
    TextureManager.preloadTheme(theme.id);
    if (typeof audioManager !== 'undefined') {
      audioManager.stopMusic();
      if (typeof audioManager.setSuspense === 'function') {
        audioManager.setSuspense(false);
      }
      audioManager.startMusic();
      if (typeof audioManager.playThemeStinger === 'function') {
        audioManager.playThemeStinger(theme.id);
      }
    }
    store.saveProgress();
    return theme;
  }
}
