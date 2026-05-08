class PixiSlider extends PIXI.Container {
  constructor(config) {
    super();
    this.config = Object.assign({
      width: 400,
      height: 24,
      min: 0,
      max: 100,
      step: 1,
      value: 50,
      cols: null,
      label: '',
      unit: '',
      gradientStops: null,
      showTicks: false,
      tickInterval: 10,
    }, config);

    this._value = this.config.value;
    this._dragging = false;
    this._changeHandler = null;

    this._trackGfx = new PIXI.Graphics();
    this._fillGfx = new PIXI.Graphics();
    this._knobGfx = new PIXI.Graphics();

    this.addChild(this._trackGfx);
    this.addChild(this._fillGfx);
    this.addChild(this._knobGfx);

    if (this.config.label) {
      this._labelText = new PIXI.Text({
        text: this.config.label,
        style: PixiTextStyles.clone(PixiTextStyles.LABEL, {
          fontSize: 12,
          fill: this.config.cols ? this.config.cols.text : '#ffffff',
        }),
      });
      this._labelText.y = -18;
      this.addChild(this._labelText);
    }

    this._valueText = new PIXI.Text({
      text: '',
      style: PixiTextStyles.clone(PixiTextStyles.LABEL, {
        fontSize: 12,
        fill: this.config.cols ? this.config.cols.text : '#ffffff',
      }),
    });
    this._valueText.anchor.set(1, 0);
    this._valueText.x = this.config.width;
    this._valueText.y = -18;
    this.addChild(this._valueText);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new PIXI.Rectangle(0, -20, this.config.width, this.config.height + 30);

    this.on('pointerdown', (e) => this._onDragStart(e));
    this.on('globalpointermove', (e) => this._onDragMove(e));
    this.on('pointerup', () => this._onDragEnd());
    this.on('pointerupoutside', () => this._onDragEnd());

    this._draw();
  }

  getValue() {
    return this._value;
  }

  setValue(v) {
    v = Math.max(this.config.min, Math.min(this.config.max, v));
    if (this.config.step > 0) {
      v = Math.round(v / this.config.step) * this.config.step;
    }
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
    if (this._labelText) this._labelText.style.fill = cols.text;
    this._valueText.style.fill = cols.text;
    this._draw();
  }

  _getFraction() {
    const range = this.config.max - this.config.min;
    return range > 0 ? (this._value - this.config.min) / range : 0;
  }

  _draw() {
    const c = this.config;
    const cols = c.cols;
    if (!cols) return;

    const w = c.width;
    const h = c.height;
    const frac = this._getFraction();
    const fillW = Math.max(0, (w - 4) * frac);
    const knobX = 2 + fillW;
    const knobH = h + 8;
    const knobW = 12;

    // Track
    const tg = this._trackGfx;
    tg.clear();
    tg.rect(0, 0, w, h).fill(PixiColorUtil.hexToNum(PixiColorUtil.darken(cols.panel, 30)));
    tg.rect(1, 1, w - 2, h - 2).fill(PixiColorUtil.hexToNum(cols.panel));
    tg.rect(2, 2, w - 4, h - 4).fill(PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '22')));

    // Ticks
    if (c.showTicks && c.tickInterval > 0) {
      for (let v = c.min; v <= c.max; v += c.tickInterval) {
        const tx = 2 + (w - 4) * ((v - c.min) / (c.max - c.min));
        tg.rect(Math.floor(tx), h + 2, 1, 4);
      }
      tg.fill(PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '33')));
    }

    // Fill
    const fg = this._fillGfx;
    fg.clear();
    if (fillW > 0) {
      if (c.gradientStops && c.gradientStops.length >= 2) {
        const grad = new PIXI.FillGradient({
          type: 'linear',
          start: { x: 0, y: 0 },
          end: { x: 1, y: 0 },
          colorStops: c.gradientStops.map(s => ({
            offset: s.pos,
            color: PixiColorUtil.hexToNum(s.color),
          })),
        });
        fg.rect(2, 2, w - 4, h - 4).fill(grad);
        // Mask to fill width using a clipping rect
        if (fillW < w - 4) {
          fg.rect(2 + fillW, 2, w - 4 - fillW, h - 4).fill(PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '22')));
        }
      } else {
        fg.rect(2, 2, fillW, h - 4).fill(PixiColorUtil.hexToNum(cols.accent));
      }
      fg.rect(2, 2, fillW, 1).fill({ color: 0xffffff, alpha: 0.15 });
    }

    // Knob
    const kg = this._knobGfx;
    kg.clear();
    const knobColor = PixiColorUtil.hexToNum(cols.text);
    const knobHighlight = PixiColorUtil.hexToNum(PixiColorUtil.lighten(cols.text, 30));

    kg.rect(knobX - knobW / 2, -4, knobW, knobH).fill(PixiColorUtil.hexToNum(PixiColorUtil.darken(cols.text, 30)));
    kg.rect(knobX - knobW / 2 + 1, -3, knobW - 2, knobH - 2).fill(knobColor);
    kg.rect(knobX - knobW / 2 + 1, -3, knobW - 2, 1)
      .rect(knobX - knobW / 2 + 1, -3, 1, knobH - 2)
      .fill(knobHighlight);

    // Value text
    const displayVal = c.step < 1 ? this._value.toFixed(1) : Math.round(this._value);
    this._valueText.text = displayVal + (c.unit || '');
  }

  _onDragStart(e) {
    this._dragging = true;
    this._updateValueFromPointer(e);
  }

  _onDragMove(e) {
    if (!this._dragging) return;
    this._updateValueFromPointer(e);
  }

  _onDragEnd() {
    this._dragging = false;
  }

  _updateValueFromPointer(e) {
    const local = this.toLocal(e.global);
    const frac = Math.max(0, Math.min(1, (local.x - 2) / (this.config.width - 4)));
    const raw = this.config.min + frac * (this.config.max - this.config.min);
    this.setValue(raw);
  }
}
