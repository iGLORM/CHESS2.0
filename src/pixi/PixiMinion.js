// Portraits for mission minions: the minion's piece (in its world's black
// piece set) standing on a lit pedestal, on a card in the world's colours.
const PixiMinion = {
  _cache: {},

  isMinion(id) {
    return typeof StoryMissions !== 'undefined' && !!StoryMissions.character(id);
  },

  // Square portrait, or the taller 238x292 card (same sizes as the holograms).
  texture(id, card = false) {
    const key = id + (card ? '_card' : '');
    const ch = StoryMissions.character(id);
    const img = TextureManager.getPieceTexture(ch.theme, 'black', ch.piece);
    const ready = img && (img.naturalWidth || img.width);
    if (this._cache[key]) return this._cache[key];
    const w = card ? 238 : 160, h = card ? 292 : 160;
    const canvas = this.draw(ch, ready ? img : null, w, h);
    const tex = PIXI.Texture.from({ resource: canvas, scaleMode: 'nearest' });
    this._cache[key] = tex;
    // The world's pieces were not loaded yet: repaint this same texture with
    // the real piece once they are, so every sprite already using it updates.
    if (!ready) {
      TextureManager.preloadTheme(ch.theme).then(() => {
        const real = TextureManager.getPieceTexture(ch.theme, 'black', ch.piece);
        if (!real || tex.destroyed) return;
        const fresh = this.draw(ch, real, w, h);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(fresh, 0, 0);
        tex.source.update();
      });
    }
    return tex;
  },

  draw(ch, pieceImg, w, h) {
    const cols = ThemeManager.getTheme(ch.theme).colors;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, cols.panel);
    bg.addColorStop(1, cols.background);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    // A soft spotlight and a checker floor in the world's board colours.
    const spot = ctx.createRadialGradient(w / 2, h * 0.45, 4, w / 2, h * 0.45, w * 0.6);
    spot.addColorStop(0, cols.accent + '55');
    spot.addColorStop(1, cols.accent + '00');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, w, h);
    const floorY = Math.round(h * 0.78);
    const sq = Math.round(w / 8);
    for (let r = 0; floorY + r * sq / 2 < h; r++) {
      for (let q = 0; q < 9; q++) {
        ctx.fillStyle = (r + q) % 2 ? cols.darkSquare : cols.lightSquare;
        ctx.globalAlpha = 0.55 - r * 0.12;
        ctx.fillRect(q * sq - (r % 2) * sq / 2, floorY + r * sq / 2, sq, sq / 2);
      }
    }
    ctx.globalAlpha = 1;
    // Pedestal.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(w / 2, floorY, w * 0.3, h * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cols.accent;
    ctx.beginPath();
    ctx.ellipse(w / 2, floorY - 2, w * 0.24, h * 0.022, 0, 0, Math.PI * 2);
    ctx.fill();
    // The piece.
    const size = Math.round(Math.min(w, h) * 0.78);
    const px = Math.round((w - size) / 2);
    const py = floorY - size + Math.round(size * 0.06);
    ctx.imageSmoothingEnabled = false;
    const img = pieceImg || SpriteGen.generatePieceSprite(ch.piece, 'black', cols, 64);
    ctx.save();
    ctx.shadowColor = cols.accent;
    ctx.shadowBlur = 14;
    ctx.drawImage(img, px, py, size, size);
    ctx.restore();
    // Frame.
    ctx.strokeStyle = cols.accent;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
    ctx.globalAlpha = 1;
    return c;
  },
};
