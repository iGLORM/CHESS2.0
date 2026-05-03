class PieceRenderer {
  static cache = {};
  static SPRITE_SIZE = 64;

  static getSprite(type, color, theme) {
    const key = `${theme.id}_${type}_${color}`;
    if (this.cache[key]) return this.cache[key];

    const sprite = SpriteGen.generatePieceSprite(type, color, theme.colors, this.SPRITE_SIZE);
    this.cache[key] = sprite;
    return sprite;
  }

  static clearCache() {
    this.cache = {};
  }

  static drawPiece(ctx, type, color, theme, x, y, size) {
    const sprite = this.getSprite(type, color, theme);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, Math.floor(x), Math.floor(y), Math.floor(size), Math.floor(size));
    ctx.imageSmoothingEnabled = true;
  }
}
