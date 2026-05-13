const PixiPremiumScene = {
  get W() { return typeof Layout !== 'undefined' ? Layout.W : 1280; },
  get H() { return typeof Layout !== 'undefined' ? Layout.H : 800; },
  get safe() { return { x: 64, top: 104, bottom: this.H - 56 }; },

  cols() {
    return ThemeManager.getCurrentColors();
  },

  color(value, fallback = 0xffffff) {
    if (!value) return fallback;
    return PixiColorUtil.hexToNum(value);
  },

  alpha(value, alphaHex) {
    return PixiColorUtil.alpha(value, alphaHex);
  },

  root(title, subtitle, options = {}) {
    const cols = this.cols();
    const root = new PIXI.Container();
    root.label = `${title || 'Premium'}Screen`;
    root._premiumDrift = [];
    root._premiumTime = 0;

    this.background(root, options.themeId || store.get('theme') || 'space');
    this.header(root, title, subtitle, options);
    if (options.footer !== false) this.footer(root, cols, options.footerHint);
    return root;
  },

  background(root, themeId) {
    const bg = new PIXI.Container();
    bg.label = 'premiumBackground';
    root.addChild(bg);

    const back = new PIXI.Sprite(PixiPremiumAssets.background(themeId));
    back.width = this.W + 48;
    back.height = this.H + 32;
    back.x = -24;
    back.y = -16;
    bg.addChild(back);
    root._premiumDrift.push({ obj: back, baseX: -24, baseY: -16, ampX: 8, ampY: 4, speed: 0.12 });

    const cols = this.cols();
    const wash = new PIXI.Graphics()
      .rect(0, 0, this.W, this.H)
      .fill({ color: 0x030711, alpha: 0.34 });
    bg.addChild(wash);

    const light = new PIXI.Graphics();
    light.ellipse(this.W / 2, 210, Math.min(500, this.W * 0.4), 170).fill({ color: this.color(cols.accent), alpha: 0.08 });
    light.ellipse(this.W * 0.2, this.H * 0.78, Math.min(340, this.W * 0.27), 120).fill({ color: this.color(cols.lightSquare), alpha: 0.045 });
    bg.addChild(light);

    const stars = new PIXI.Container();
    bg.addChild(stars);
    for (let i = 0; i < 46; i++) {
      const dot = new PIXI.Graphics();
      const size = i % 5 === 0 ? 4 : 2;
      dot.rect(0, 0, size, size).fill({ color: this.color(i % 3 ? cols.text : cols.accent), alpha: 0.18 + (i % 7) * 0.04 });
      dot.x = (i * 97) % this.W;
      dot.y = 24 + ((i * 53) % (this.H - 150));
      stars.addChild(dot);
    }
    root._premiumDrift.push({ obj: stars, baseX: 0, baseY: 0, ampX: 16, ampY: 7, speed: 0.18 });

    const vignette = new PIXI.Graphics();
    vignette.rect(0, 0, this.W, 90).fill({ color: 0x01030a, alpha: 0.36 });
    vignette.rect(0, this.H - 110, this.W, 110).fill({ color: 0x01030a, alpha: 0.44 });
    vignette.rect(0, 0, 54, this.H).fill({ color: 0x01030a, alpha: 0.30 });
    vignette.rect(this.W - 54, 0, 54, this.H).fill({ color: 0x01030a, alpha: 0.30 });
    bg.addChild(vignette);
    return bg;
  },

  header(root, title, subtitle, options = {}) {
    if (!title) return null;
    const cols = this.cols();
    const group = new PIXI.Container();
    group.label = 'premiumHeader';
    root.addChild(group);

    const titleText = this.text(title.toUpperCase(), {
      fontFamily: PixiTextStyles.FONT_TITLE,
      fontSize: options.titleSize || 42,
      fontWeight: 'bold',
      fill: cols.text,
      stroke: { color: 0x000000, width: 4 },
      padding: 8,
    });
    titleText.anchor.set(0.5);
    titleText.x = this.W / 2;
    titleText.y = 55;
    this.fit(titleText, 780);
    group.addChild(titleText);

    if (subtitle) {
      const sub = this.text(subtitle, {
        fontSize: 26,
        fontWeight: '700',
        fill: this.alpha(cols.text, 'aa'),
      });
      sub.anchor.set(0.5);
      sub.x = this.W / 2;
      sub.y = 106;
      this.fit(sub, 760);
      group.addChild(sub);
    }

    const sep = new PIXI.Graphics();
    const sepW = 570;
    const sepX = Math.floor((this.W - sepW) / 2);
    sep.rect(sepX, 130, sepW, 2).fill({ color: this.color(cols.text), alpha: 0.18 });
    sep.rect(sepX + sepW / 2 - 5, 125, 10, 10).fill({ color: this.color(cols.accent), alpha: 0.92 });
    sep.rect(sepX + sepW / 2 - 1, 121, 2, 18).fill({ color: this.color(cols.accent), alpha: 0.55 });
    group.addChild(sep);
    return group;
  },

  footer(root, cols, hint) {
    const footer = new PIXI.Container();
    footer.label = 'premiumFooter';
    root.addChild(footer);
    const footerY = this.H - 58;
    const line = new PIXI.Graphics()
      .rect(0, footerY, this.W, 58)
      .fill({ color: 0x020712, alpha: 0.42 })
      .rect(0, footerY, this.W, 2)
      .fill({ color: this.color(cols.accent), alpha: 0.22 });
    footer.addChild(line);
    if (hint) {
      const text = this.text(hint, { fontSize: 24, fill: this.alpha(cols.text, '77') });
      text.anchor.set(0.5);
      text.x = this.W / 2;
      text.y = footerY + 29;
      footer.addChild(text);
    }
    return footer;
  },

  text(text, style = {}) {
    return new PIXI.Text({
      text,
      style: Object.assign({
        fontFamily: PixiTextStyles.FONT_BODY,
        fontSize: 18,
        fill: '#ffffff',
        letterSpacing: 0,
        wordWrap: false,
      }, style),
    });
  },

  fit(text, maxWidth, minScale = 0.68) {
    text.scale.set(1);
    if (text.width > maxWidth) text.scale.set(Math.max(minScale, maxWidth / text.width));
    return text;
  },

  panel(parent, x, y, w, h, options = {}) {
    const cols = this.cols();
    const maxW = typeof Layout !== 'undefined' ? Layout.W - 80 : this.W - 80;
    w = Math.min(w, maxW);
    const g = new PIXI.Graphics();
    const fill = options.fill || cols.panel;
    const border = options.border || cols.text;
    const accent = options.accent || cols.accent;
    const alpha = options.alpha ?? 0.68;
    g.roundRect(x + 6, y + 6, w, h, options.radius || 10).fill({ color: 0x000000, alpha: 0.30 });
    g.roundRect(x, y, w, h, options.radius || 10).fill({ color: this.color(fill), alpha });
    g.roundRect(x, y, w, h, options.radius || 10).stroke({ color: this.color(border), alpha: options.borderAlpha ?? 0.35, width: 2 });
    if (options.accent !== false) {
      g.roundRect(x + 14, y + 12, Math.max(20, w - 28), 4, 2).fill({ color: this.color(accent), alpha: options.accentAlpha ?? 0.72 });
    }
    if (parent) parent.addChild(g);
    return g;
  },

  card(parent, x, y, w, h, options = {}) {
    const maxW = typeof Layout !== 'undefined' ? Layout.W - 80 : this.W - 80;
    w = Math.min(w, maxW);
    const group = new PIXI.Container();
    group.x = x;
    group.y = y;
    group.label = options.label || 'premiumCard';
    if (options.interactive !== false) {
      group.eventMode = 'static';
      group.cursor = options.disabled ? 'default' : 'pointer';
      group.hitArea = new PIXI.Rectangle(0, 0, w, h);
    }
    parent.addChild(group);

    const draw = (hover = false) => {
      group.removeChildren();
      const local = new PIXI.Container();
      group.addChild(local);
      this.panel(local, 0, 0, w, h, {
        fill: options.fill,
        border: options.active || hover ? (options.activeColor || this.cols().accent) : this.cols().text,
        accent: options.active || hover ? (options.activeColor || this.cols().accent) : this.cols().accent,
        borderAlpha: options.active || hover ? 0.80 : 0.30,
        accentAlpha: options.active || hover ? 0.80 : 0.40,
        alpha: options.disabled ? 0.43 : (options.alpha ?? 0.68),
        radius: options.radius || 10,
      });
      if (options.draw) options.draw(local, { hover });
    };
    draw(false);
    if (!options.disabled && options.interactive !== false) {
      group.on('pointerover', () => draw(true));
      group.on('pointerout', () => draw(false));
      group.on('pointerdown', () => {
        if (options.onClick && typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') {
          audioManager.playButton();
        }
        if (options.onClick) options.onClick();
      });
    }
    return group;
  },

  button(parent, x, y, w, h, label, onClick, options = {}) {
    const cols = this.cols();
    const scale = (typeof Layout !== 'undefined' && Layout.uiScale) || 1;
    const scaledH = Math.max(Math.round(h * scale), 68);
    const scaledFontSize = Math.round((options.fontSize || 18) * scale);
    const btn = this.card(parent, x, y, w, scaledH, {
      active: options.primary,
      disabled: options.disabled,
      fill: options.fill || cols.buttonBg,
      activeColor: options.color || cols.accent,
      alpha: options.primary ? 0.92 : 0.68,
      radius: 10,
      onClick: options.disabled ? null : onClick,
      draw: (c) => {
        let icon = null;
        if (options.icon) {
          icon = new PIXI.Sprite(PixiPremiumAssets.icon(options.icon));
          icon.width = 28;
          icon.height = 28;
        }
        const t = this.text(label, {
          fontSize: scaledFontSize,
          fontWeight: '800',
          fill: options.disabled ? this.alpha(cols.text, '66') : cols.text,
        });
        this.fit(t, w - (icon ? 74 : 24), 0.58);

        if (icon) {
          const gap = 10;
          const totalW = icon.width + gap + t.width;
          const startX = Math.max(14, (w - totalW) / 2);
          icon.x = startX;
          icon.y = (scaledH - 28) / 2;
          c.addChild(icon);
          t.anchor.set(0, 0.5);
          t.x = startX + 28 + gap;
          t.y = scaledH / 2 + 1;
        } else {
          t.anchor.set(0.5);
          t.x = w / 2;
          t.y = scaledH / 2 + 1;
        }
        c.addChild(t);
      },
    });
    return btn;
  },

  image(pathTexture, x, y, w, h, options = {}) {
    const sprite = new PIXI.Sprite(pathTexture);
    sprite.x = x;
    sprite.y = y;
    sprite.width = w;
    sprite.height = h;
    sprite.alpha = options.alpha ?? 1;
    return sprite;
  },

  update(root, dt) {
    if (!root || !root._premiumDrift) return;
    root._premiumTime = (root._premiumTime || 0) + dt / 60;
    for (const item of root._premiumDrift) {
      item.obj.x = item.baseX + Math.sin(root._premiumTime * item.speed) * item.ampX;
      item.obj.y = item.baseY + Math.cos(root._premiumTime * item.speed * 0.8) * item.ampY;
    }
  },

  destroy(screen) {
    if (screen.pixiContainer) {
      screen.pixiContainer.destroy({ children: true });
      screen.pixiContainer = null;
    }
    PixiScreenManager.setScreenContainer(null);
  },
};
