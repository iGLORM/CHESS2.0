class TextureManager {
  static cache = {};
  static loaded = {};

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

  static buildPath(folder, name) {
    return `../assets/textures/${folder}/${name}.png`;
  }

  static async preloadTheme(themeId) {
    const loads = [];
    for (const color of ['light', 'dark']) {
      loads.push(this.loadImage(this.buildPath('boards', `${themeId}_${color}`)));
    }
    for (const color of ['white', 'black']) {
      for (const type of ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king']) {
        loads.push(this.loadImage(this.buildPath('pieces', `${themeId}_${color}_${type}`)));
      }
    }
    loads.push(this.loadImage(this.buildPath('backgrounds', `${themeId}_bg`)));
    await Promise.all(loads);
  }

  static async preloadCharacters() {
    if (typeof CHARACTERS === 'undefined') return;
    const loads = CHARACTERS.map(ch => this.loadImage(this.buildPath('characters', ch.id)));
    await Promise.all(loads);
  }

  static getBoardTexture(themeId, isLight) {
    const color = isLight ? 'light' : 'dark';
    return this.getImage(this.buildPath('boards', `${themeId}_${color}`));
  }

  static getPieceTexture(themeId, color, type) {
    return this.getImage(this.buildPath('pieces', `${themeId}_${color}_${type}`));
  }

  static getBackgroundTexture(themeId) {
    return this.getImage(this.buildPath('backgrounds', `${themeId}_bg`));
  }

  static getCharacterTexture(characterId) {
    return this.getImage(this.buildPath('characters', characterId));
  }
}
