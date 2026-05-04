class UIHelpers {
  static alpha(color, alpha) {
    if (typeof color === 'string' && color[0] === '#' && color.length === 7) {
      return color + alpha;
    }
    return color;
  }

  static drawPixelFrame(ctx, x, y, w, h, cols, opts = {}) {
    const active = !!opts.active;
    const hover = !!opts.hover;
    const disabled = !!opts.disabled;
    const fill = opts.fill || (hover ? cols.buttonHover : cols.buttonBg);
    const outer = opts.outer || '#050508';
    const border = disabled
      ? this.alpha(cols.text, '33')
      : (active || hover ? cols.accent : this.alpha(cols.text, '88'));
    const inner = disabled
      ? this.alpha(cols.text, '18')
      : (active || hover ? this.alpha(cols.text, 'cc') : this.alpha(cols.text, '33'));

    ctx.fillStyle = this.alpha('#000000', '66');
    ctx.fillRect(x + 3, y + 3, w, h);

    ctx.fillStyle = outer;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = border;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

    ctx.fillStyle = inner;
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);

    ctx.fillStyle = fill;
    ctx.fillRect(x + 5, y + 5, w - 10, h - 10);

    if (active || hover) {
      ctx.fillStyle = cols.accent;
      ctx.fillRect(x + 5, y + 5, 4, h - 10);
      ctx.fillRect(x + w - 9, y + 5, 4, h - 10);
    }
  }

  static drawButton(ctx, x, y, w, h, text, cols, opts = {}) {
    this.drawPixelFrame(ctx, x, y, w, h, cols, opts);

    ctx.fillStyle = opts.textColor || (opts.hover || opts.active ? cols.accent : cols.text);
    ctx.font = opts.font || 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2 + (opts.textOffsetY || 0));
    ctx.textBaseline = 'alphabetic';
  }
}
