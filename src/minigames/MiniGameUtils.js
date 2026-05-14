class MiniGameUtils {
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

  static drawResultOverlay(ctx, x, y, w, h, won, cols) {
    ctx.save();
    ctx.fillStyle = won ? 'rgba(80, 220, 130, 0.30)' : 'rgba(220, 70, 80, 0.30)';
    ctx.fillRect(x, y, w, h);
    ctx.shadowColor = won ? cols.accent : (cols.highlight || cols.accent);
    ctx.shadowBlur = 14;
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 18px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(won ? 'You Win!' : 'You Lose!', x + w / 2, y + h / 2);
    ctx.restore();
  }

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
