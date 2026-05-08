class PixiToggle extends PIXI.Container {
  constructor(config) {
    super();
    this.config = Object.assign({
      width: 40,
      height: 16,
      value: false,
      cols: null,
    }, config);

    this._value = this.config.value;
    this._changeHandler = null;

    this._g = new PIXI.Graphics();
    this.addChild(this._g);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new PIXI.Rectangle(0, 0, this.config.width, this.config.height);

    this.on('pointerdown', () => {
      this.setValue(!this._value);
    });

    this._draw();
  }

  getValue() {
    return this._value;
  }

  setValue(v) {
    if (this._value === v) return;
    this._value = v;
    this._draw();
    if (this._changeHandler) this._changeHandler(this._value);
  }

  onChange(fn) {
    this._changeHandler = fn;
    return this;
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
    const isOn = this._value;
    const knobX = isOn ? w - h : 0;

    g.clear();

    // Track
    const bgColor = isOn
      ? PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.accent, '55'))
      : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '22'));
    g.rect(0, 0, w, h).fill(PixiColorUtil.hexToNum(PixiColorUtil.darken(cols.panel, 30)));
    g.rect(1, 1, w - 2, h - 2).fill(bgColor);

    // Knob
    const knobColor = isOn ? cols.accent : PixiColorUtil.alpha(cols.text, '66');
    const knobNum = PixiColorUtil.hexToNum(knobColor);
    g.rect(knobX, 0, h, h).fill(PixiColorUtil.hexToNum(PixiColorUtil.darken(knobColor, 30)));
    g.rect(knobX + 1, 1, h - 2, h - 2).fill(knobNum);
    // Knob highlight
    g.rect(knobX + 1, 1, h - 2, 1)
      .rect(knobX + 1, 1, 1, h - 2)
      .fill(PixiColorUtil.hexToNum(PixiColorUtil.lighten(knobColor, 30)));

    // On/off indicator dot
    const dotColor = isOn ? 0xffffff : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '44'));
    g.rect(knobX + Math.floor(h / 2) - 1, Math.floor(h / 2) - 1, 2, 2).fill(dotColor);
  }
}
