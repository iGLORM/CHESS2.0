class PixiPanel extends PIXI.Container {
  constructor(config) {
    super();
    this.config = Object.assign({
      width: 200,
      height: 100,
      cols: null,
      fill: null,
      hover: false,
      active: false,
      accentTop: false,
      borderWidth: 4,
      variant: 'panel',
      disabled: false,
      accentStripe: null,
    }, config);
    this._bg = new PIXI.Graphics();
    this.addChild(this._bg);
    this._draw();
  }

  setHover(hover) {
    if (this.config.hover === hover) return;
    this.config.hover = hover;
    this._draw();
  }

  setActive(active) {
    if (this.config.active === active) return;
    this.config.active = active;
    this._draw();
  }

  setColors(cols) {
    this.config.cols = cols;
    this._draw();
  }

  resize(w, h) {
    this.config.width = w;
    this.config.height = h;
    this._draw();
  }

  _draw() {
    const g = this._bg;
    const c = this.config;
    const cols = c.cols;
    if (!cols) return;

    g.clear();

    if (c.variant === 'card') {
      this._drawCard(g, c, cols);
    } else {
      this._drawPanel(g, c, cols);
    }
  }

  _drawPanel(g, c, cols) {
    const w = c.width;
    const h = c.height;
    const bw = c.borderWidth;
    const hover = c.hover;
    const active = c.active;
    const fillColor = c.fill || cols.panel;
    const fillNum = PixiColorUtil.hexToNum(fillColor);
    const panelDark60 = PixiColorUtil.hexToNum(PixiColorUtil.darken(cols.panel, 60));
    const panelDark40 = PixiColorUtil.hexToNum(PixiColorUtil.darken(cols.panel, 40));
    const borderCol = (hover || active)
      ? PixiColorUtil.hexToNum(cols.accent)
      : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '66'));

    // Drop shadow
    g.rect(4, 4, w, h).fill({ color: 0x000000, alpha: 0.33 });

    // Outer border (dark)
    g.rect(0, 0, w, h).fill(panelDark60);

    // Border accent
    g.rect(1, 1, w - 2, h - 2).fill(borderCol);

    // Inner border (dark)
    g.rect(2, 2, w - 4, h - 4).fill(panelDark40);

    // Fill
    g.rect(bw, bw, w - bw * 2, h - bw * 2).fill(fillNum);

    // Inner dithered shadow (top edge)
    for (let dx = 0; dx < w - bw * 2; dx += 2) {
      g.rect(bw + dx, bw, 1, 3);
    }
    for (let dy = 0; dy < 12; dy += 2) {
      g.rect(bw, bw + dy, 3, 1);
    }
    g.fill({ color: 0x000000, alpha: 0.2 });

    // Corner ornaments
    const cornerCol = (hover || active)
      ? PixiColorUtil.hexToNum(cols.accent)
      : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '88'));
    this._drawCorners(g, 0, 0, w, h, cornerCol, 4);

    // Accent top rail
    if (c.accentTop) {
      g.rect(bw, bw, w - bw * 2, 2).fill(PixiColorUtil.hexToNum(cols.accent));
    }
  }

  _drawCard(g, c, cols) {
    const w = c.width;
    const h = c.height;
    const hover = c.hover;
    const active = c.active;
    const disabled = c.disabled;
    const fillColor = c.fill || (hover ? cols.buttonHover : cols.panel);
    const fillNum = PixiColorUtil.hexToNum(fillColor);
    const accentStripe = c.accentStripe;

    // Drop shadow
    g.rect(2, 2, w, h).fill({ color: 0x000000, alpha: 0.27 });

    // Outer bevel (bottom-right)
    g.rect(0, 0, w, h).fill(PixiColorUtil.hexToNum(PixiColorUtil.darken(fillColor, 50)));

    // Top-left bevel highlight
    g.rect(0, 0, w - 1, 1)
      .rect(0, 0, 1, h - 1)
      .fill(PixiColorUtil.hexToNum(PixiColorUtil.lighten(fillColor, 20)));

    // Bottom-right bevel shadow
    g.rect(1, h - 1, w - 1, 1)
      .rect(w - 1, 1, 1, h - 1)
      .fill(PixiColorUtil.hexToNum(PixiColorUtil.darken(fillColor, 30)));

    // Fill
    g.rect(2, 2, w - 4, h - 4).fill(fillNum);

    // Accent stripe
    if (accentStripe) {
      g.rect(2, 2, w - 4, 3).fill(PixiColorUtil.hexToNum(accentStripe));
    }

    // Border
    const borderCol = disabled
      ? PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '22'))
      : (hover || active ? PixiColorUtil.hexToNum(cols.accent) : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '44')));
    g.rect(0, 0, w, h).stroke({ width: (hover || active) ? 2 : 1, color: borderCol });

    // Corner ornaments when highlighted
    if (hover || active) {
      this._drawCorners(g, 0, 0, w, h, PixiColorUtil.hexToNum(cols.accent), 3);
    }

    // Disabled overlay
    if (disabled) {
      g.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.33 });
    }
  }

  _drawCorners(g, x, y, w, h, color, size) {
    const s = size || 3;
    g.rect(x, y, s, 1)
      .rect(x, y + 1, 1, s - 1)
      .rect(x + w - s, y, s, 1)
      .rect(x + w - 1, y + 1, 1, s - 1)
      .rect(x, y + h - 1, s, 1)
      .rect(x, y + h - s, 1, s - 1)
      .rect(x + w - s, y + h - 1, s, 1)
      .rect(x + w - 1, y + h - s, 1, s - 1)
      .fill(color);
  }
}
