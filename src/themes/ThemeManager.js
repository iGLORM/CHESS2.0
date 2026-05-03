class ThemeManager {
  static getTheme(id) {
    return THEMES.find(t => t.id === id) || THEMES[0];
  }

  static getAllThemes() {
    return THEMES;
  }

  static applyTheme(id) {
    const theme = this.getTheme(id);
    store.set('theme', id);
    PieceRenderer.clearCache();
    store.saveProgress();
    return theme;
  }
}
