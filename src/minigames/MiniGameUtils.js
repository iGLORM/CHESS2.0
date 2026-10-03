class MiniGameUtils {
  // Fixed arcade palette for every mini-game, independent of the board theme,
  // so colours keep their meaning (green = target, red = danger) and contrast
  // stays high on every theme. Same keys as theme colours, plus extras.
  static PALETTE = {
    background: '#100c22',
    bg: '#100c22',
    panel: '#211a42',
    buttonBg: '#2c2458',
    buttonHover: '#3a3074',
    lightSquare: '#6b5b95',
    darkSquare: '#2d1b4e',
    text: '#f4f0ff',
    textDim: '#a89fd0',
    accent: '#3ee07f',
    highlight: '#a6ffc4',
    checkHighlight: '#ff4d6d',
    success: '#3ee07f',
    danger: '#ff4d6d',
    warn: '#ffb347',
    gold: '#ffd166',
    info: '#4cc9f0',
  };

  static colors() {
    return this.PALETTE;
  }

  static roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Box with stepped pixel corners (two steps of `u`), the shape of the game's
  // own panels (PixiPremiumScene.pixelShape).
  static pixelRect(ctx, x, y, w, h, u = 4) {
    const a = u, b = u * 2;
    const pts = [
      x + b, y, x + w - b, y, x + w - b, y + a, x + w - a, y + a, x + w - a, y + b, x + w, y + b,
      x + w, y + h - b, x + w - a, y + h - b, x + w - a, y + h - a, x + w - b, y + h - a, x + w - b, y + h,
      x + b, y + h, x + b, y + h - a, x + a, y + h - a, x + a, y + h - b, x, y + h - b,
      x, y + b, x + a, y + b, x + a, y + a, x + b, y + a,
    ];
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
  }

  // The active theme's panel colours (frame, header), falling back to the arcade palette.
  static themeColors() {
    const cols = typeof ThemeManager !== 'undefined' ? ThemeManager.getCurrentColors() : null;
    const p = this.PALETTE;
    const hex = c => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : null);
    return {
      panel: hex(cols && cols.panel) || p.panel,
      background: hex(cols && cols.background) || p.background,
      text: hex(cols && cols.text) || p.text,
      accent: hex(cols && cols.accent) || p.gold,
    };
  }

  // Results are drawn by MiniGameManager's shared result screen.
  static drawResultOverlay() {}

  static hexToRgb(hex) {
    if (!hex || hex.length < 7) return { r: 255, g: 255, b: 255 };
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  static colorWithAlpha(hex, alpha) {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  static lightenColor(hex, amount) {
    const { r, g, b } = this.hexToRgb(hex);
    return '#' + [r, g, b].map(c => Math.min(255, c + amount).toString(16).padStart(2, '0')).join('');
  }

  static darkenColor(hex, amount) {
    const { r, g, b } = this.hexToRgb(hex);
    return '#' + [r, g, b].map(c => Math.max(0, c - amount).toString(16).padStart(2, '0')).join('');
  }
}
