class PixiProgressBar extends PIXI.Container {
  constructor(config) {
    super();
    this.config = Object.assign({
      width: 100,
      height: 12,
      progress: 0,
      cols: null,
      fill: null,
      bg: null,
    }, config);

    this._g = new PIXI.Graphics();
    this.addChild(this._g);
    this._draw();
  }

  setProgress(value) {
    this.config.progress = Math.max(0, Math.min(1, value));
    this._draw();
  }

  setColors(cols) {
    this.config.cols = cols;
    this._draw();
  }

  _draw() {
    const g = this._g;
    const c = this.config;
    const cols = c.cols;
    if (!cols) return;

    const w = c.width;
    const h = c.height;
    const progress = c.progress;
    const fillColor = c.fill || cols.accent;
    const bgColor = c.bg || PixiColorUtil.alpha(cols.accent, '33');

    g.clear();

    // Frame
    g.rect(0, 0, w, h).fill(PixiColorUtil.hexToNum(PixiColorUtil.darken(cols.panel, 40)));
    g.rect(1, 1, w - 2, h - 2).fill(PixiColorUtil.hexToNum(cols.panel));

    // Background
    g.rect(2, 2, w - 4, h - 4).fill(PixiColorUtil.hexToNum(bgColor));

    // Fill
    const fillW = Math.max(0, (w - 4) * progress);
    if (fillW > 0) {
      g.rect(2, 2, fillW, h - 4).fill(PixiColorUtil.hexToNum(fillColor));

      // Highlight
      g.rect(2, 2, fillW, 1).fill(PixiColorUtil.hexToNum(PixiColorUtil.lighten(fillColor, 40)));
    }

    // Endcaps
    g.rect(0, 0, 2, h)
      .rect(w - 2, 0, 2, h)
      .fill(PixiColorUtil.hexToNum(PixiColorUtil.darken(cols.panel, 60)));

    // Corner dots
    g.rect(0, 0, 1, 1)
      .rect(w - 1, 0, 1, 1)
      .rect(0, h - 1, 1, 1)
      .rect(w - 1, h - 1, 1, 1)
      .fill(PixiColorUtil.hexToNum(PixiColorUtil.darken(cols.panel, 40)));
  }
}
