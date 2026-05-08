class PixiSeparator extends PIXI.Container {
  constructor(config) {
    super();
    this.config = Object.assign({
      width: 200,
      cols: null,
      color: null,
      accentColor: null,
      jewel: true,
    }, config);
    this._g = new PIXI.Graphics();
    this.addChild(this._g);
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

    g.clear();

    const w = c.width;
    const lineColor = PixiColorUtil.hexToNum(c.color || PixiColorUtil.alpha(cols.text, '33'));
    const accentCol = PixiColorUtil.hexToNum(c.accentColor || cols.accent);

    // Line
    g.rect(0, 0, w, 1).fill(lineColor);

    // Center diamond
    if (c.jewel) {
      const cx = Math.floor(w / 2);
      g.rect(cx - 2, -2, 5, 1)
        .rect(cx - 1, -1, 3, 1)
        .rect(cx, 0, 1, 1)
        .rect(cx - 1, 1, 3, 1)
        .rect(cx - 2, 2, 5, 1)
        .fill(accentCol);
    }
  }
}
