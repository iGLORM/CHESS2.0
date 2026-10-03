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

  // Backdrops that aren't themes: art kept from older versions. The original hand-painted
  // Soulbound Pixel is the Grandmaster X fight's backdrop, and a Custom theme backdrop once
  // the story has been finished.
  static EXTRA_BACKDROPS = [
    { id: 'crystal_classic', name: 'Soulbound Classic', short: 'Old Soul', accent: '#d932ff', unlock: 'finish the story' },
  ];

  static isBackdropUnlocked(id) {
    const extra = this.EXTRA_BACKDROPS.find(b => b.id === id);
    if (!extra) return this.isThemeUnlocked(id);
    if (typeof SuperUser !== 'undefined' && SuperUser.active()) return true;
    return (store.get('storySaves') || []).some(save => save && save.completed);
  }

  // Like resolveId, but also keeps the extra backdrops (for customBgTheme).
  static resolveBackdrop(id) {
    return this.EXTRA_BACKDROPS.some(b => b.id === id) ? id : this.resolveId(id);
  }

  // The background art a theme shows: Custom uses the backdrop picked in Theme Select.
  static backdropFor(themeId) {
    return themeId === 'custom' ? this.resolveBackdrop(store.get('customBgTheme') || 'pawnhollow') : themeId;
  }

  // A world's theme (and song) unlocks once that world is restored in any
  // save slot. Chess 2.0, Pawn Hollow and Custom are always open; themes a player had
  // before the story worlds stay open (store.unlockedThemes).
  static isThemeUnlocked(id) {
    if (typeof SuperUser !== 'undefined' && SuperUser.active()) return true;
    id = THEME_ALIASES[id] || id;
    if (id === 'chess20' || id === 'pawnhollow' || id === 'custom') return true;
    if ((store.get('unlockedThemes') || []).includes(id)) return true;
    // The Great Board is the reward for finishing the story in any slot.
    if (id === 'greatboard') return (store.get('storySaves') || []).some(save => save && save.completed);
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

  // The player picks a theme (Theme Select): it is kept for everything outside story mode.
  static chooseTheme(id) {
    store.set('menuTheme', id);
    return this.applyTheme(id);
  }

  // Story mode always shows the theme of the world you are in.
  static useStoryTheme(id) {
    this.storyActive = true;
    id = this.resolveId(id);
    if (store.get('theme') !== id) this.applyTheme(id);
    return this.getTheme(id);
  }

  // Outside story mode: back to the player's own theme (one they have unlocked).
  static menuThemeId() {
    const id = this.resolveId(store.get('menuTheme') || 'chess20');
    return this.isThemeUnlocked(id) ? id : 'chess20';
  }

  static useMenuTheme() {
    this.storyActive = false;
    const id = this.menuThemeId();
    if (store.get('theme') !== id) this.applyTheme(id);
    return this.getTheme(id);
  }

  // Called by the screen router before a screen opens. Story screens set the theme of
  // the world you are in themselves; every other screen shows the player's own theme.
  // Settings (and what opens from it) keep whatever is showing, since the pause menu
  // opens them in the middle of a story fight.
  static STORY_SCREENS = ['characterSelect', 'worldMap', 'worldMissions', 'storyScene', 'tournament', 'shop'];
  static NEUTRAL_SCREENS = ['settings', 'themeSelect', 'controls', 'credits'];
  static storyActive = false;

  static syncForScreen(name) {
    if (this.NEUTRAL_SCREENS.includes(name)) return;
    const story = this.STORY_SCREENS.includes(name) || (name === 'game' && store.get('mode') === 'story');
    if (!story) this.useMenuTheme();
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
    if (typeof audioManager !== 'undefined' && audioManager.songOverride) {
      // A screen with its own song (the world map) keeps it; the theme only chimes.
      if (typeof audioManager.playThemeStinger === 'function') audioManager.playThemeStinger(theme.id);
    } else if (typeof audioManager !== 'undefined') {
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
