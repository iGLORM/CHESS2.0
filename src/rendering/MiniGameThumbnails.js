const MiniGameThumbnails = {
  _cache: {},

  generate(key, width, height) {
    const cacheKey = `${key}_${width}_${height}`;
    if (this._cache[cacheKey]) return this._cache[cacheKey];

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const game3D = typeof Mini3D !== 'undefined' && Mini3D.THUMB_GAMES && Mini3D.THUMB_GAMES()[key];
    if (game3D && Mini3D.available()) {
      Mini3D.thumbnail(game3D, ctx, width, height);
    } else {
      this._drawDefault(ctx, width, height, key);
    }

    this._cache[cacheKey] = canvas;

    // Enforce max cache size of 30 entries
    const keys = Object.keys(this._cache);
    if (keys.length > 30) {
      delete this._cache[keys[0]];
    }

    return canvas;
  },

  clearCache() {
    this._cache = {};
  },

  _drawDefault(ctx, w, h, key) {
    ctx.fillStyle = '#1a1030';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#888';
    ctx.font = 'bold ' + Math.floor(h * 0.4) + 'px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', w / 2, h / 2);
  },
};
