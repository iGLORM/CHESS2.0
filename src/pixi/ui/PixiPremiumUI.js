const PixiPremiumUI = {
  get W() { return typeof Layout !== 'undefined' ? Layout.W : 1280; },
  get H() { return typeof Layout !== 'undefined' ? Layout.H : 800; },
  get SAFE_X() { return typeof Layout !== 'undefined' ? Layout.SAFE_X : 48; },
  get SAFE_BOTTOM() { return typeof Layout !== 'undefined' ? (Layout.H - Layout.SAFE_BOTTOM) : 760; },

  text(text, style = {}) {
    return new PIXI.Text({
      text,
      style: Object.assign({
        fontFamily: PixiTextStyles.FONT_BODY,
        fontSize: 18,
        fill: '#ffffff',
        letterSpacing: 0,
      }, style),
    });
  },

  title(text, cols, size = 34) {
    return this.text(text, {
      fontFamily: PixiTextStyles.FONT_TITLE,
      fontSize: size,
      fontWeight: 'bold',
      fill: cols.text,
      stroke: { color: 0x000000, width: 3 },
      padding: 10,
    });
  },

  fitText(textObj, maxWidth) {
    textObj.scale.set(1);
    if (textObj.width > maxWidth) {
      const scale = Math.max(0.65, maxWidth / textObj.width);
      textObj.scale.set(scale);
    }
    return textObj;
  },

  addHeader(container, title, subtitle, cols, y = 48) {
    const group = new PIXI.Container();
    group.label = 'premiumHeader';
    container.addChild(group);

    const titleText = this.title(title, cols, 32);
    titleText.anchor.set(0.5);
    titleText.x = this.W / 2;
    titleText.y = y;
    this.fitText(titleText, 760);
    group.addChild(titleText);

    if (subtitle) {
      const sub = this.text(subtitle, {
        fontSize: 16,
        fontWeight: '600',
        fill: PixiColorUtil.alpha(cols.text, '88'),
      });
      sub.anchor.set(0.5);
      sub.x = this.W / 2;
      sub.y = y + 30;
      this.fitText(sub, 720);
      group.addChild(sub);
    }

    const sep = new PixiSeparator({ width: 520, cols });
    sep.x = (this.W - 520) / 2;
    sep.y = y + 48;
    group.addChild(sep);
    return group;
  },

  addFooter(container, cols, options = {}) {
    const footer = new PIXI.Container();
    footer.label = 'premiumFooter';
    container.addChild(footer);

    const line = new PixiDitheredRect({ width: this.W, height: 20, color: cols.accent, alpha: 0.06 });
    line.y = this.H - 20;
    footer.addChild(line);

    if (options.hint) {
      const hint = this.text(options.hint, {
        fontSize: 14,
        fill: PixiColorUtil.alpha(cols.text, '55'),
      });
      hint.anchor.set(0.5);
      hint.x = this.W / 2;
      hint.y = this.H - 44;
      this.fitText(hint, 720);
      footer.addChild(hint);
    }

    return footer;
  },

  addButton(container, config) {
    const btn = new PixiButton({
      width: config.width || 160,
      height: config.height || 42,
      text: config.text || '',
      cols: config.cols,
      fontSize: config.fontSize || 16,
      disabled: config.disabled,
    });
    btn.x = config.x || 0;
    btn.y = config.y || 0;
    if (config.onClick) btn.onClick(config.onClick);
    container.addChild(btn);
    return btn;
  },

  makePanel(config) {
    const panel = new PixiPanel({
      width: config.width,
      height: config.height,
      cols: config.cols,
      variant: config.variant || 'panel',
      accentTop: config.accentTop,
      active: config.active,
      hover: config.hover,
      disabled: config.disabled,
      accentStripe: config.accentStripe,
      fill: config.fill,
    });
    panel.x = config.x || 0;
    panel.y = config.y || 0;
    return panel;
  },
};
