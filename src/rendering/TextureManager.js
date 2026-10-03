class TextureManager {
  static cache = {};
  static loaded = {};

  // Optional art that only some themes ship with; other themes draw these
  // procedurally, so we skip requesting files that do not exist.
  static BOARD_THEMES = ['chess20', 'pawnhollow', 'trainingcamp', 'slantedsands', 'ironkeep', 'mistymoors',
    'royalpalace', 'clockworkcitadel', 'grandlibrary', 'forkedgulch', 'obsidiancourt', 'crystal', 'greatboard'];
  static BACKGROUND_FILES = {
    // Stills of the live scenes (src/themes/scenes/), written by `node scripts/live-scene.js bg <id>`;
    // shown while a scene loads and on the Canvas 2D screens.
    chess20: 'png', crystal: 'png', trainingcamp: 'png', forkedgulch: 'png',
    pawnhollow: 'png',
    // Kept art that isn't a theme: the original hand-painted Soulbound Pixel (ThemeManager.EXTRA_BACKDROPS).
    crystal_classic: 'png', slantedsands: 'png', ironkeep: 'png', mistymoors: 'png',
    royalpalace: 'png', clockworkcitadel: 'png', grandlibrary: 'png', obsidiancourt: 'png',
    greatboard: 'png',
  };

  static loadImage(src) {
    if (this.loaded[src]) {
      return Promise.resolve(this.cache[src] || null);
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.cache[src] = img;
        this.loaded[src] = true;
        resolve(img);
      };
      img.onerror = () => {
        this.loaded[src] = true;
        resolve(null);
      };
      img.src = src;
    });
  }

  static getImage(src) {
    return this.cache[src] || null;
  }

  static isLoaded(src) {
    return !!this.loaded[src];
  }

  static buildPath(folder, name, ext = 'png') {
    return `../assets/textures/${folder}/${name}.${ext}`;
  }

  static backgroundPath(themeId) {
    return this.buildPath('backgrounds', `${themeId}_bg`, this.BACKGROUND_FILES[themeId] || 'png');
  }

  static async preloadTheme(themeId) {
    const loads = [];
    if (this.BOARD_THEMES.includes(themeId)) {
      loads.push(this.loadImage(this.buildPath('boards', `${themeId}_board`)));
    }
    for (const color of ['white', 'black']) {
      for (const type of ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king']) {
        loads.push(this.loadImage(this.buildPath('pieces', `${themeId}_${color}_${type}`)));
      }
    }
    if (this.BACKGROUND_FILES[themeId]) loads.push(this.loadImage(this.backgroundPath(themeId)));
    if (typeof PixiBackgroundScene !== 'undefined') loads.push(PixiBackgroundScene.load(themeId));
    await Promise.all(loads);
  }

  static async preloadCharacters() {
    const all = typeof STORY_STAGES !== 'undefined' ? STORY_STAGES : typeof CHARACTERS !== 'undefined' ? CHARACTERS : [];
    const loads = all.map(ch => this.loadImage(this.buildPath('characters', ch.id)));
    await Promise.all(loads);
  }

  // Legacy per-square textures (no longer shipped; the Canvas 2D board falls
  // back to flat colours).
  static getBoardTexture(themeId, isLight) {
    return null;
  }

  // Whole-board texture (8x8 squares, a1 dark) made by scripts/generate_theme_art.py.
  static getBoardImage(themeId) {
    return this.getImage(this.buildPath('boards', `${themeId}_board`));
  }

  static getPieceTexture(themeId, color, type) {
    return this.getImage(this.buildPath('pieces', `${themeId}_${color}_${type}`));
  }

  static getBackgroundTexture(themeId) {
    return this.getImage(this.backgroundPath(themeId));
  }

  static getCharacterTexture(characterId) {
    const face = typeof SideMatches !== 'undefined' && SideMatches.faceOf(characterId);
    return this.getImage(this.buildPath('characters', face || characterId));
  }

  static clearThemeTextures(themeId) {
    for (const key of Object.keys(this.cache)) {
      if (key.includes('/' + themeId + '_') || key.includes('/' + themeId + '/')) {
        delete this.cache[key];
        if (this.loaded) delete this.loaded[key];
      }
    }
  }
}
