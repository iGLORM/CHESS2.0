const PixiPieceRenderer = {
  textures: {},

  getTexture(themeId, color, type) {
    const key = `${themeId}_${color}_${type}`;
    if (this.textures[key]) return this.textures[key];

    const img = TextureManager.getPieceTexture(themeId, color, type);
    if (img) {
      const texture = PIXI.Texture.from(img);
      this.textures[key] = texture;
      return texture;
    }

    // The theme's art is still loading (Story mode switches theme just before
    // a game starts). Draw the built-in sprite for now, and rebuild the board
    // with the real art once it arrives.
    const fallbackKey = 'fallback_' + key;
    if (!this.textures[fallbackKey]) {
      const sprite = PieceRenderer.getSprite(type, color, ThemeManager.getTheme(themeId));
      this.textures[fallbackKey] = PIXI.Texture.from({ resource: sprite, scaleMode: 'nearest' });
    }
    this._rebuildWhenLoaded(themeId);
    return this.textures[fallbackKey];
  },

  _pending: {},

  _rebuildWhenLoaded(themeId) {
    if (this._pending[themeId]) return;
    this._pending[themeId] = TextureManager.preloadTheme(themeId).then(() => {
      delete this._pending[themeId];
      if (!TextureManager.getPieceTexture(themeId, 'white', 'pawn')) return; // no art for this theme
      if (store.get('screen') === 'game' && store.get('theme') === themeId &&
          typeof GameScreen !== 'undefined' && GameScreen.rebuildVisuals) {
        GameScreen.rebuildVisuals();
      }
    });
  },

  createSprite(themeId, color, type) {
    const texture = this.getTexture(themeId, color, type);
    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.width = 64;
    sprite.height = 64;
    return sprite;
  },

  clearCache() {
    for (const key in this.textures) {
      this.textures[key].destroy(true);
    }
    this.textures = {};
  },
};
