const PixiIconCache = {
  _cache: {},

  getTexture(type, size, color, highlight, dark) {
    const key = type + '_' + size + '_' + color;
    if (this._cache[key]) return this._cache[key];

    const s = size || 8;
    const p = s / 8;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d');

    const hl = highlight || PixiColorUtil.lighten(color, 60);
    const dk = dark || PixiColorUtil.darken(color, 40);

    ctx.fillStyle = color;
    this._drawIconShape(ctx, type, 0, 0, p, color, hl, dk);

    const texture = PIXI.Texture.from({ resource: canvas, scaleMode: 'nearest' });
    this._cache[key] = texture;
    return texture;
  },

  createSprite(type, size, cols, opts) {
    opts = opts || {};
    const color = opts.color || cols.accent;
    const highlight = opts.highlight || PixiColorUtil.lighten(color, 60);
    const dark = opts.dark || PixiColorUtil.darken(color, 40);
    const texture = this.getTexture(type, size, color, highlight, dark);
    const sprite = new PIXI.Sprite(texture);
    return sprite;
  },

  _drawIconShape(ctx, type, x, y, p, color, highlight, dark) {
    ctx.fillStyle = color;
    switch (type) {
      case 'crown':
        ctx.fillRect(x + p, y + p * 2, p, p * 3);
        ctx.fillRect(x + p * 3, y, p, p * 5);
        ctx.fillRect(x + p * 5, y + p * 2, p, p * 3);
        ctx.fillRect(x + p * 7, y, p, p * 5);
        ctx.fillRect(x, y + p * 5, p * 8, p);
        ctx.fillRect(x, y + p * 6, p * 8, p);
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y + p * 5, p * 8, 1);
        break;
      case 'lock':
        ctx.fillRect(x + p * 2, y, p * 4, p * 2);
        ctx.fillRect(x + p, y + p, p, p);
        ctx.fillRect(x + p * 6, y + p, p, p);
        ctx.fillRect(x, y + p * 3, p * 8, p * 5);
        ctx.fillStyle = dark;
        ctx.fillRect(x + p * 3, y + p * 5, p * 2, p * 2);
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y + p * 3, p * 8, 1);
        break;
      case 'sword':
        ctx.fillRect(x + p * 3, y, p * 2, p * 5);
        ctx.fillRect(x + p * 2, y + p * 5, p * 4, p);
        ctx.fillRect(x + p * 3, y + p * 6, p * 2, p * 2);
        ctx.fillStyle = highlight;
        ctx.fillRect(x + p * 3, y, p, p * 5);
        break;
      case 'shield':
        ctx.fillRect(x + p, y + p, p * 6, p * 4);
        ctx.fillRect(x + p * 2, y + p * 5, p * 4, p);
        ctx.fillRect(x + p * 3, y + p * 6, p * 2, p);
        ctx.fillStyle = highlight;
        ctx.fillRect(x + p, y + p, p * 6, 1);
        ctx.fillRect(x + p, y + p, 1, p * 4);
        break;
      case 'gear':
        ctx.fillRect(x + p * 3, y, p * 2, p);
        ctx.fillRect(x + p * 3, y + p * 7, p * 2, p);
        ctx.fillRect(x, y + p * 3, p, p * 2);
        ctx.fillRect(x + p * 7, y + p * 3, p, p * 2);
        ctx.fillRect(x + p, y + p, p, p);
        ctx.fillRect(x + p * 6, y + p, p, p);
        ctx.fillRect(x + p, y + p * 6, p, p);
        ctx.fillRect(x + p * 6, y + p * 6, p, p);
        ctx.fillRect(x + p * 2, y + p * 2, p * 4, p * 4);
        ctx.fillStyle = dark;
        ctx.fillRect(x + p * 3, y + p * 3, p * 2, p * 2);
        break;
      case 'music':
        ctx.fillRect(x + p * 2, y, p, p * 6);
        ctx.fillRect(x + p * 2, y, p * 4, p);
        ctx.fillRect(x + p * 5, y + p, p, p);
        ctx.fillRect(x, y + p * 5, p * 3, p * 2);
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y + p * 5, p * 3, 1);
        break;
      case 'check':
        ctx.fillRect(x + p * 5, y + p, p, p);
        ctx.fillRect(x + p * 4, y + p * 2, p, p);
        ctx.fillRect(x + p * 3, y + p * 3, p, p * 2);
        ctx.fillRect(x + p * 2, y + p * 4, p, p);
        ctx.fillRect(x + p, y + p * 3, p, p);
        ctx.fillRect(x, y + p * 2, p, p);
        break;
      case 'x':
        ctx.fillRect(x, y, p, p);
        ctx.fillRect(x + p, y + p, p, p);
        ctx.fillRect(x + p * 2, y + p * 2, p, p * 2);
        ctx.fillRect(x + p * 5, y + p * 5, p, p);
        ctx.fillRect(x + p * 6, y + p * 6, p, p);
        ctx.fillRect(x + p * 7, y + p * 7, p, p);
        ctx.fillRect(x + p * 7, y, p, p);
        ctx.fillRect(x + p * 6, y + p, p, p);
        ctx.fillRect(x + p, y + p * 6, p, p);
        ctx.fillRect(x, y + p * 7, p, p);
        break;
      case 'trophy':
        ctx.fillRect(x + p * 2, y, p * 4, p);
        ctx.fillRect(x + p, y + p, p, p);
        ctx.fillRect(x + p * 6, y + p, p, p);
        ctx.fillRect(x + p, y + p * 2, p, p);
        ctx.fillRect(x + p * 6, y + p * 2, p, p);
        ctx.fillRect(x + p * 2, y + p, p * 4, p * 3);
        ctx.fillRect(x + p * 3, y + p * 4, p * 2, p);
        ctx.fillRect(x + p * 2, y + p * 5, p * 4, p);
        ctx.fillRect(x + p, y + p * 6, p * 6, p);
        ctx.fillStyle = highlight;
        ctx.fillRect(x + p * 2, y, p * 4, 1);
        break;
      case 'skull':
        ctx.fillRect(x + p, y, p * 6, p * 5);
        ctx.fillRect(x + p * 2, y + p * 5, p * 4, p);
        ctx.fillRect(x + p, y + p * 6, p * 6, p);
        ctx.fillStyle = dark;
        ctx.fillRect(x + p * 2, y + p * 2, p, p * 2);
        ctx.fillRect(x + p * 5, y + p * 2, p, p * 2);
        ctx.fillRect(x + p * 3, y + p * 5, p * 2, p);
        break;
      case 'star':
        ctx.fillRect(x + p * 3, y, p * 2, p);
        ctx.fillRect(x + p * 2, y + p, p * 4, p);
        ctx.fillRect(x, y + p * 2, p * 8, p * 2);
        ctx.fillRect(x + p, y + p * 4, p * 6, p);
        ctx.fillRect(x + p * 2, y + p * 5, p * 4, p);
        ctx.fillRect(x + p, y + p * 6, p * 2, p);
        ctx.fillRect(x + p * 5, y + p * 6, p * 2, p);
        break;
      case 'book':
        ctx.fillRect(x + p, y, p * 6, p * 7);
        ctx.fillStyle = dark;
        ctx.fillRect(x + p, y, p, p * 7);
        ctx.fillStyle = highlight;
        ctx.fillRect(x + p * 3, y + p, p * 3, p);
        ctx.fillRect(x + p * 3, y + p * 3, p * 3, p);
        break;
      case 'dice':
        ctx.fillRect(x, y, p * 8, p * 8);
        ctx.fillStyle = dark;
        ctx.fillRect(x + p, y + p, p, p);
        ctx.fillRect(x + p * 6, y + p, p, p);
        ctx.fillRect(x + p * 3, y + p * 3, p * 2, p * 2);
        ctx.fillRect(x + p, y + p * 6, p, p);
        ctx.fillRect(x + p * 6, y + p * 6, p, p);
        break;
      case 'hourglass':
        ctx.fillRect(x, y, p * 8, p);
        ctx.fillRect(x, y + p * 7, p * 8, p);
        ctx.fillRect(x + p, y + p, p * 6, p);
        ctx.fillRect(x + p * 2, y + p * 2, p * 4, p);
        ctx.fillRect(x + p * 3, y + p * 3, p * 2, p * 2);
        ctx.fillRect(x + p * 2, y + p * 5, p * 4, p);
        ctx.fillRect(x + p, y + p * 6, p * 6, p);
        break;
      case 'king':
        ctx.fillRect(x + p * 3, y, p * 2, p);
        ctx.fillRect(x + p * 2, y + p, p * 4, p);
        ctx.fillRect(x + p * 3, y + p * 2, p * 2, p);
        ctx.fillRect(x + p, y + p * 3, p * 6, p * 3);
        ctx.fillRect(x, y + p * 6, p * 8, p * 2);
        ctx.fillStyle = highlight;
        ctx.fillRect(x + p * 3, y, p * 2, 1);
        break;
      case 'queen':
        ctx.fillRect(x + p * 3, y, p * 2, p);
        ctx.fillRect(x, y + p, p, p);
        ctx.fillRect(x + p * 7, y + p, p, p);
        ctx.fillRect(x + p, y + p * 2, p * 6, p);
        ctx.fillRect(x + p * 2, y + p * 3, p * 4, p * 3);
        ctx.fillRect(x, y + p * 6, p * 8, p * 2);
        ctx.fillStyle = highlight;
        ctx.fillRect(x + p * 3, y, p * 2, 1);
        break;
      case 'volume':
        ctx.fillRect(x + p, y + p * 2, p * 2, p * 4);
        ctx.fillRect(x + p * 3, y + p, p, p * 6);
        ctx.fillRect(x + p * 5, y + p, p, p);
        ctx.fillRect(x + p * 5, y + p * 6, p, p);
        ctx.fillRect(x + p * 6, y + p * 2, p, p);
        ctx.fillRect(x + p * 6, y + p * 5, p, p);
        ctx.fillRect(x + p * 7, y + p * 3, p, p * 2);
        break;
      case 'keyboard':
        ctx.fillRect(x, y + p, p * 8, p * 5);
        ctx.fillStyle = dark;
        ctx.fillRect(x + p, y + p * 2, p, p);
        ctx.fillRect(x + p * 3, y + p * 2, p, p);
        ctx.fillRect(x + p * 5, y + p * 2, p, p);
        ctx.fillRect(x + p * 2, y + p * 4, p * 4, p);
        break;
      case 'target':
        ctx.fillRect(x + p * 2, y, p * 4, p);
        ctx.fillRect(x + p, y + p, p, p);
        ctx.fillRect(x + p * 6, y + p, p, p);
        ctx.fillRect(x, y + p * 2, p, p * 4);
        ctx.fillRect(x + p * 7, y + p * 2, p, p * 4);
        ctx.fillRect(x + p, y + p * 6, p, p);
        ctx.fillRect(x + p * 6, y + p * 6, p, p);
        ctx.fillRect(x + p * 2, y + p * 7, p * 4, p);
        ctx.fillStyle = highlight;
        ctx.fillRect(x + p * 3, y + p * 3, p * 2, p * 2);
        break;
      default:
        ctx.fillRect(x + p, y + p, p * 6, p * 6);
        break;
    }
  },

  clearCache() {
    for (const key in this._cache) {
      this._cache[key].destroy(true);
    }
    this._cache = {};
  },
};
