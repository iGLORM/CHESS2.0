class PixiButton extends PIXI.Container {
  // Design constants — proper UI padding math
  static SHADOW = 3;
  static OUTER = 2;
  static BORDER = 2;
  static INNER = 1;
  static INSET = 5; // OUTER + BORDER + INNER = total inset from edge to content
  static CONTENT_PAD = 12; // horizontal padding inside content area

  constructor(config) {
    super();
    this.config = Object.assign({
      width: 160,
      height: 40,
      text: '',
      cols: null,
      fontSize: 14,
      disabled: false,
    }, config);

    this._bg = new PIXI.Graphics();
    this.addChild(this._bg);

    const inset = PixiButton.INSET;
    const contentW = this.config.width - inset * 2;
    const contentH = this.config.height - inset * 2;
    const contentCenterX = inset + contentW / 2;
    const contentCenterY = inset + contentH / 2;

    this._label = new PIXI.Text({
      text: this.config.text,
      style: {
        fontFamily: 'monospace',
        fontSize: this.config.fontSize,
        fontWeight: 'bold',
        fill: this.config.cols ? this.config.cols.text : '#ffffff',
      },
    });
    this._label.anchor.set(0.5);
    this._label.x = contentCenterX;
    this._label.y = contentCenterY;
    this.addChild(this._label);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new PIXI.Rectangle(0, 0, this.config.width, this.config.height);
    this._isHovered = false;
    this._isPressed = false;
    this._clickHandler = null;

    this.on('pointerover', () => {
      if (this.config.disabled) return;
      this._isHovered = true;
      this._updateState();
    });
    this.on('pointerout', () => {
      this._isHovered = false;
      this._isPressed = false;
      this._updateState();
    });
    this.on('pointerdown', () => {
      if (this.config.disabled) return;
      this._isPressed = true;
      this._updateState();
    });
    this.on('pointerup', () => {
      if (this.config.disabled) return;
      if (this._isPressed && this._clickHandler) {
        this._clickHandler();
      }
      this._isPressed = false;
      this._updateState();
    });

    this._draw();
    if (this.config.disabled) {
      this.alpha = 0.5;
      this.cursor = 'default';
    }
  }

  onClick(fn) {
    this._clickHandler = fn;
    return this;
  }

  setText(text) {
    this.config.text = text;
    this._label.text = text;
  }

  setDisabled(disabled) {
    this.config.disabled = disabled;
    this.alpha = disabled ? 0.5 : 1;
    this.cursor = disabled ? 'default' : 'pointer';
    this._updateState();
  }

  setColors(cols) {
    this.config.cols = cols;
    this._draw();
  }

  _updateState() {
    this._draw();
    const cols = this.config.cols;
    if (!cols) return;
    this._label.style.fill = (this._isHovered || this._isPressed)
      ? cols.accent : cols.text;

    if (this._isPressed) {
      this.scale.set(0.97);
      this.pivot.set(this.config.width * 0.015, this.config.height * 0.015);
    } else {
      this.scale.set(1);
      this.pivot.set(0, 0);
    }
  }

  _draw() {
    const g = this._bg;
    const c = this.config;
    const cols = c.cols;
    if (!cols) return;

    const w = c.width;
    const h = c.height;
    const S = PixiButton.SHADOW;
    const I = PixiButton.INSET;
    const hover = this._isHovered;
    const active = this._isPressed;
    const fillColor = hover ? (cols.buttonHover || cols.panel) : (cols.buttonBg || cols.panel);
    const fillNum = PixiColorUtil.hexToNum(fillColor);

    g.clear();

    // Layer 1: Drop shadow
    g.rect(S, S, w, h).fill({ color: 0x000000, alpha: 0.35 });

    // Layer 2: Outer frame
    g.rect(0, 0, w, h).fill(0x050508);

    // Layer 3: Border (highlights on hover/active)
    const borderCol = (active || hover)
      ? PixiColorUtil.hexToNum(cols.accent)
      : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '55'));
    g.rect(2, 2, w - 4, h - 4).fill(borderCol);

    // Layer 4: Inner edge
    const innerCol = (active || hover)
      ? PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '88'))
      : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '22'));
    g.rect(4, 4, w - 8, h - 8).fill(innerCol);

    // Layer 5: Content fill
    g.rect(I, I, w - I * 2, h - I * 2).fill(fillNum);

    // Layer 6: Top highlight (subtle bevel)
    g.rect(I, I, w - I * 2, 1)
      .fill({ color: 0xffffff, alpha: 0.08 });

    // Corner ornaments
    const cornerCol = (active || hover)
      ? PixiColorUtil.hexToNum(cols.accent)
      : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '44'));
    g.rect(0, 0, 3, 1).rect(0, 1, 1, 2)
      .rect(w - 3, 0, 3, 1).rect(w - 1, 1, 1, 2)
      .rect(0, h - 1, 3, 1).rect(0, h - 3, 1, 2)
      .rect(w - 3, h - 1, 3, 1).rect(w - 1, h - 3, 1, 2)
      .fill(cornerCol);

    // Accent rails on hover/active
    if (active || hover) {
      g.rect(I, I, w - I * 2, 2)
        .rect(I, h - I - 2, w - I * 2, 2)
        .rect(I, I, 2, h - I * 2)
        .rect(w - I - 2, I, 2, h - I * 2)
        .fill(PixiColorUtil.hexToNum(cols.accent));
    }
  }
}
