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

    // Fallback: generate procedural sprite via SpriteGen, then create texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    SpriteGen.drawPiece(ctx, type, color, 0, 0, 64, themeId);
    const texture = PIXI.Texture.from({ resource: canvas, scaleMode: 'nearest' });
    this.textures[key] = texture;
    return texture;
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
