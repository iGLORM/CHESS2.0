const HomeScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  _particles: [],
  _tickerFn: null,
  _titlePulse: 0,
  _btnContainers: [],
  _selectedIndex: 0,

  LAYOUT: {
    W: 1280, H: 800,
    LOGO_Y: 218,
    LOGO_MAX_W: 480,
    MAIN_START_Y: 350,
    MAIN_BTN_W: 460,
    MAIN_BTN_H: 62,
    MAIN_BTN_GAP: 8,
    UTIL_Y: 647,
    UTIL_BTN_W: 190,
    UTIL_BTN_H: 44,
    UTIL_GAP: 14,
    FOOTER_Y: 760,
  },

  BUTTONS: [
    { text: 'Story Mode',    sub: 'Battle unique characters', action: 'story',    group: 'main' },
    { text: 'Local 1v1',     sub: 'Play with a friend',       action: '1v1',      group: 'main' },
    { text: 'Classic Chess', sub: 'Challenge the AI engine',  action: 'classic',  group: 'main' },
    { text: 'Custom Game',   sub: 'Configure your own rules', action: 'custom',   group: 'main' },
    { text: 'Settings',      action: 'settings', group: 'util', idx: 0 },
    { text: 'How to Play',   action: 'help',     group: 'util', idx: 1 },
    { text: 'Stats',         action: 'stats',    group: 'util', idx: 2 },
  ],

  init() {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;
    const L = this.LAYOUT;

    this.pixiContainer = new PIXI.Container();
    this._btnContainers = [];
    this._selectedIndex = 0;
    this._titlePulse = 0;

    // --- Background ---
    if (typeof PixiBackgroundRenderer !== 'undefined') {
      PixiBackgroundRenderer.init(this.pixiContainer);
      PixiBackgroundRenderer.render(store.get('theme') || 'space');
    }

    // Vignette overlay
    const vignette = new PIXI.Graphics();
    vignette.rect(0, 0, L.W, L.H).fill({ color: 0x000000, alpha: 0.3 });
    this.pixiContainer.addChild(vignette);

    // --- Floating particles ---
    this._particles = [];
    const particleContainer = new PIXI.Container();
    particleContainer.label = 'particles';
    for (let i = 0; i < 80; i++) {
      const p = new PIXI.Graphics();
      const size = Math.random() * 2 + 0.5;
      p.rect(0, 0, size, size).fill({ color: 0xffffff, alpha: 0.4 + Math.random() * 0.4 });
      p.x = Math.random() * L.W;
      p.y = Math.random() * L.H;
      particleContainer.addChild(p);
      this._particles.push({
        gfx: p,
        speed: Math.random() * 0.4 + 0.1,
        twinkleSpeed: Math.random() * 2 + 1,
        twinklePhase: Math.random() * Math.PI * 2,
        baseAlpha: 0.3 + Math.random() * 0.5,
      });
    }
    this.pixiContainer.addChild(particleContainer);

    // --- Decorative accent lines container ---
    const decoLines = new PIXI.Graphics();
    decoLines.label = 'decoLines';
    this.pixiContainer.addChild(decoLines);
    this._decoLines = decoLines;

    // --- Title logo ---
    const accentNum = PixiColorUtil.hexToNum(cols.accent);
    const titleContainer = new PIXI.Container();
    titleContainer.x = L.W / 2;
    titleContainer.y = L.LOGO_Y;
    titleContainer.label = 'titleGroup';

    const logoFile = this._getLogoVariant(store.get('theme'));
    TextureManager.loadImage(`../assets/textures/${logoFile}`).then(img => {
      if (!img || !titleContainer.parent) return;
      titleContainer.removeChildren();

      const texture = PIXI.Texture.from(img);
      const logoScale = Math.min(1, L.LOGO_MAX_W / texture.width);

      // Glow layer (tinted accent, blurred)
      const glow = new PIXI.Sprite(texture);
      glow.anchor.set(0.5);
      glow.scale.set(logoScale);
      glow.alpha = 0.2;
      glow.tint = accentNum;
      glow.filters = [new PIXI.BlurFilter({ strength: 8, quality: 3 })];
      titleContainer.addChild(glow);

      // Main logo sprite
      const logo = new PIXI.Sprite(texture);
      logo.anchor.set(0.5);
      logo.scale.set(logoScale);
      logo.label = 'mainTitle';
      titleContainer.addChild(logo);
    });

    // Text fallback while image loads
    const titleFallback = new PIXI.Text({
      text: 'CHESS 2.0',
      style: {
        fontFamily: PixiTextStyles.FONT_TITLE,
        fontSize: 64, fontWeight: 'bold',
        fill: cols.text, letterSpacing: 8, padding: 30,
        stroke: { color: '#000000', width: 4 },
        dropShadow: { color: cols.accent, blur: 6, distance: 0, alpha: 0.4 },
      },
    });
    titleFallback.anchor.set(0.5);
    titleContainer.addChild(titleFallback);

    this.pixiContainer.addChild(titleContainer);
    this._titleContainer = titleContainer;

    // Separator above main buttons
    const sep1 = new PixiSeparator({ width: 340, cols: cols });
    sep1.x = (L.W - 340) / 2;
    sep1.y = L.MAIN_START_Y - 16;
    this.pixiContainer.addChild(sep1);

    // --- Main buttons ---
    for (let i = 0; i < 4; i++) {
      const btn = this.BUTTONS[i];
      const bx = (L.W - L.MAIN_BTN_W) / 2;
      const by = L.MAIN_START_Y + i * (L.MAIN_BTN_H + L.MAIN_BTN_GAP);
      const container = this._createMainButton(btn, bx, by, L.MAIN_BTN_W, L.MAIN_BTN_H, cols, i);
      this.pixiContainer.addChild(container);
      this._btnContainers.push({ container, index: i, bounds: { x: bx, y: by, w: L.MAIN_BTN_W, h: L.MAIN_BTN_H } });
    }

    // Separator before utility buttons
    const sep2 = new PixiSeparator({ width: 320, cols: cols });
    sep2.x = (L.W - 320) / 2;
    sep2.y = L.UTIL_Y - 20;
    this.pixiContainer.addChild(sep2);

    // --- Utility buttons ---
    const utilTotalW = 3 * L.UTIL_BTN_W + 2 * L.UTIL_GAP;
    const utilStartX = (L.W - utilTotalW) / 2;
    for (let i = 0; i < 3; i++) {
      const btn = this.BUTTONS[4 + i];
      const bx = utilStartX + i * (L.UTIL_BTN_W + L.UTIL_GAP);
      const by = L.UTIL_Y;
      const container = this._createUtilButton(btn, bx, by, L.UTIL_BTN_W, L.UTIL_BTN_H, cols, 4 + i);
      this.pixiContainer.addChild(container);
      this._btnContainers.push({ container, index: 4 + i, bounds: { x: bx, y: by, w: L.UTIL_BTN_W, h: L.UTIL_BTN_H } });
    }

    // --- Footer ---
    const footer = new PIXI.Text({
      text: 'Use mouse or arrow keys to navigate',
      style: { fontFamily: PixiTextStyles.FONT_BODY, fontSize: 16, fill: PixiColorUtil.alpha(cols.text, '44') },
    });
    footer.anchor.set(0.5);
    footer.x = L.W / 2;
    footer.y = L.FOOTER_Y;
    this.pixiContainer.addChild(footer);

    // Dithered footer line
    const footerDeco = new PixiDitheredRect({ width: L.W, height: 16, color: cols.accent, alpha: 0.04 });
    footerDeco.y = L.H - 16;
    this.pixiContainer.addChild(footerDeco);

    // --- Animation ticker ---
    this._tickerFn = (ticker) => {
      const dt = ticker.deltaTime / 60;
      this._titlePulse += dt * 2;

      for (const p of this._particles) {
        p.gfx.y += p.speed;
        if (p.gfx.y > L.H) { p.gfx.y = -5; p.gfx.x = Math.random() * L.W; }
        p.twinklePhase += dt * p.twinkleSpeed;
        p.gfx.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(p.twinklePhase));
      }

      // Title glow breathing
      if (this._titleContainer && this._titleContainer.children.length > 1) {
        const glowChild = this._titleContainer.children[0];
        if (glowChild) glowChild.alpha = 0.15 + Math.sin(this._titlePulse * 0.8) * 0.08;
      }

      // Animated accent lines below logo
      const dg = this._decoLines;
      dg.clear();
      for (let i = 0; i < 2; i++) {
        const ly = L.LOGO_Y + 80 + i * 5 + Math.sin(this._titlePulse + i * 1.5) * 1.5;
        const halfW = 160 - i * 30;
        dg.moveTo(L.W / 2 - halfW, ly).lineTo(L.W / 2 + halfW, ly)
          .stroke({ width: 1, color: accentNum, alpha: 0.1 - i * 0.03 });
      }
    };
    PixiApp.app.ticker.add(this._tickerFn);

    this._updateSelection();

    // Re-fit all button text after fonts load
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => this._refitAllText());
    }

    PixiScreenManager.setScreenContainer(this.pixiContainer);
  },

  _fitText(textObj, maxWidth) {
    textObj.scale.set(1);
    if (textObj.width > maxWidth) {
      textObj.scale.set(maxWidth / textObj.width);
    }
  },

  _refitAllText() {
    for (const entry of this._btnContainers) {
      const d = entry.container._btnData;
      const titleNode = entry.container.getChildByLabel('title');
      if (titleNode) this._fitText(titleNode, d.w - d.pad);
      const subNode = entry.container.getChildByLabel('sub');
      if (subNode) this._fitText(subNode, d.w - d.pad);
    }
  },

  _createMainButton(btn, x, y, w, h, cols, index) {
    const pad = 24;
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.hitArea = new PIXI.Rectangle(0, 0, w, h);

    const bg = new PIXI.Graphics();
    bg.label = 'bg';
    container.addChild(bg);

    // Centered title
    const titleText = new PIXI.Text({
      text: btn.text,
      style: {
        fontFamily: PixiTextStyles.FONT_TITLE,
        fontSize: 20,
        fontWeight: 'bold',
        fill: cols.text,
        letterSpacing: 2,
      },
    });
    titleText.anchor.set(0.5);
    titleText.x = w / 2;
    titleText.y = btn.sub ? h * 0.36 : h / 2;
    titleText.label = 'title';
    this._fitText(titleText, w - pad);
    container.addChild(titleText);

    // Centered subtitle
    if (btn.sub) {
      const subText = new PIXI.Text({
        text: btn.sub,
        style: {
          fontFamily: PixiTextStyles.FONT_BODY,
          fontSize: 14,
          fill: PixiColorUtil.alpha(cols.text, '77'),
          letterSpacing: 1,
        },
      });
      subText.anchor.set(0.5);
      subText.x = w / 2;
      subText.y = h * 0.67;
      subText.label = 'sub';
      this._fitText(subText, w - pad);
      container.addChild(subText);
    }

    // Flash overlay for click effect
    const flash = new PIXI.Graphics();
    flash.rect(4, 4, w - 8, h - 8).fill({ color: 0xffffff, alpha: 1 });
    flash.alpha = 0;
    flash.label = 'flash';
    container.addChild(flash);

    this._drawMainBtnBg(bg, w, h, cols, false);

    container.on('pointerover', () => {
      this._selectedIndex = index;
      this._updateSelection();
    });
    container.on('pointerdown', () => {
      const tl = gsap.timeline();
      tl.to(container.scale, { x: 0.93, y: 0.93, duration: 0.06, ease: 'power2.in' })
        .to(container.scale, { x: 1.02, y: 1.02, duration: 0.08, ease: 'back.out(2)' })
        .to(container.scale, { x: 1, y: 1, duration: 0.05 });
      const flashGfx = container.getChildByLabel('flash');
      if (flashGfx) gsap.fromTo(flashGfx, { alpha: 0.3 }, { alpha: 0, duration: 0.2 });
      this.handleAction(btn.action);
    });

    container._btnData = { btn, w, h, cols, bg, pad };
    return container;
  },

  _drawMainBtnBg(g, w, h, cols, hover) {
    g.clear();
    const S = 3;
    const accentNum = PixiColorUtil.hexToNum(cols.accent);
    const panelNum = PixiColorUtil.hexToNum(cols.panel);

    // Drop shadow
    g.rect(S, S, w, h).fill({ color: 0x000000, alpha: 0.4 });

    // Outer frame
    g.rect(0, 0, w, h).fill(0x080810);

    // Border
    const borderCol = hover ? accentNum : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '44'));
    g.rect(2, 2, w - 4, h - 4).fill(borderCol);

    // Inner edge
    g.rect(3, 3, w - 6, h - 6).fill(0x0a0a14);

    // Content fill
    const bgColor = hover
      ? PixiColorUtil.hexToNum(PixiColorUtil.lighten(cols.panel, 12))
      : panelNum;
    g.rect(4, 4, w - 8, h - 8).fill({ color: bgColor, alpha: 0.95 });

    // Top bevel
    g.rect(4, 4, w - 8, 1).fill({ color: 0xffffff, alpha: 0.06 });

    // Corner ornaments
    const cornerCol = hover ? accentNum : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '44'));
    g.rect(0, 0, 4, 1).rect(0, 1, 1, 3)
      .rect(w - 4, 0, 4, 1).rect(w - 1, 1, 1, 3)
      .rect(0, h - 1, 4, 1).rect(0, h - 4, 1, 3)
      .rect(w - 4, h - 1, 4, 1).rect(w - 1, h - 4, 1, 3)
      .fill(cornerCol);

    // Accent rails on hover
    if (hover) {
      g.rect(5, 5, w - 10, 2)
        .rect(5, h - 7, w - 10, 2)
        .rect(5, 5, 2, h - 10)
        .rect(w - 7, 5, 2, h - 10)
        .fill({ color: accentNum, alpha: 0.7 });
    }
  },

  _createUtilButton(btn, x, y, w, h, cols, index) {
    const pad = 20;
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.hitArea = new PIXI.Rectangle(0, 0, w, h);

    const bg = new PIXI.Graphics();
    bg.label = 'bg';
    container.addChild(bg);

    // Centered text (scaled to fit)
    const label = new PIXI.Text({
      text: btn.text,
      style: {
        fontFamily: PixiTextStyles.FONT_TITLE,
        fontSize: 16,
        fontWeight: 'bold',
        fill: cols.text,
        letterSpacing: 1,
      },
    });
    label.anchor.set(0.5);
    label.x = w / 2;
    label.y = h / 2;
    label.label = 'title';
    this._fitText(label, w - pad);
    container.addChild(label);

    // Flash overlay for click effect
    const flash = new PIXI.Graphics();
    flash.rect(4, 4, w - 8, h - 8).fill({ color: 0xffffff, alpha: 1 });
    flash.alpha = 0;
    flash.label = 'flash';
    container.addChild(flash);

    this._drawUtilBtnBg(bg, w, h, cols, false);

    container.on('pointerover', () => {
      this._selectedIndex = index;
      this._updateSelection();
    });
    container.on('pointerdown', () => {
      const tl = gsap.timeline();
      tl.to(container.scale, { x: 0.93, y: 0.93, duration: 0.06, ease: 'power2.in' })
        .to(container.scale, { x: 1.02, y: 1.02, duration: 0.08, ease: 'back.out(2)' })
        .to(container.scale, { x: 1, y: 1, duration: 0.05 });
      const flashGfx = container.getChildByLabel('flash');
      if (flashGfx) gsap.fromTo(flashGfx, { alpha: 0.3 }, { alpha: 0, duration: 0.2 });
      this.handleAction(btn.action);
    });

    container._btnData = { btn, w, h, cols, bg, pad };
    return container;
  },

  _drawUtilBtnBg(g, w, h, cols, hover) {
    g.clear();
    const S = 2;
    const accentNum = PixiColorUtil.hexToNum(cols.accent);
    const panelNum = PixiColorUtil.hexToNum(cols.panel);

    g.rect(S, S, w, h).fill({ color: 0x000000, alpha: 0.35 });
    g.rect(0, 0, w, h).fill(0x080810);

    const borderCol = hover ? accentNum : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '44'));
    g.rect(2, 2, w - 4, h - 4).fill(borderCol);
    g.rect(3, 3, w - 6, h - 6).fill(0x0a0a14);

    const bgColor = hover
      ? PixiColorUtil.hexToNum(PixiColorUtil.lighten(cols.panel, 10))
      : panelNum;
    g.rect(4, 4, w - 8, h - 8).fill({ color: bgColor, alpha: 0.92 });
    g.rect(4, 4, w - 8, 1).fill({ color: 0xffffff, alpha: 0.05 });

    const cornerCol = hover ? accentNum : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '44'));
    g.rect(0, 0, 3, 1).rect(0, 1, 1, 2)
      .rect(w - 3, 0, 3, 1).rect(w - 1, 1, 1, 2)
      .rect(0, h - 1, 3, 1).rect(0, h - 3, 1, 2)
      .rect(w - 3, h - 1, 3, 1).rect(w - 1, h - 3, 1, 2)
      .fill(cornerCol);

    if (hover) {
      g.rect(5, 5, w - 10, 1)
        .rect(5, h - 6, w - 10, 1)
        .rect(5, 5, 1, h - 10)
        .rect(w - 6, 5, 1, h - 10)
        .fill({ color: accentNum, alpha: 0.5 });
    }
  },

  _updateSelection() {
    const cols = ThemeManager.getTheme(store.get('theme')).colors;
    for (const entry of this._btnContainers) {
      const isSelected = entry.index === this._selectedIndex;
      const d = entry.container._btnData;

      if (d.btn.group === 'main') {
        this._drawMainBtnBg(d.bg, d.w, d.h, d.cols, isSelected);
        const titleNode = entry.container.getChildByLabel('title');
        if (titleNode) {
          titleNode.style.fill = isSelected ? cols.accent : cols.text;
          this._fitText(titleNode, d.w - d.pad);
        }
        const subNode = entry.container.getChildByLabel('sub');
        if (subNode) {
          subNode.style.fill = isSelected
            ? PixiColorUtil.alpha(cols.accent, 'aa')
            : PixiColorUtil.alpha(cols.text, '88');
          this._fitText(subNode, d.w - d.pad);
        }
      } else {
        this._drawUtilBtnBg(d.bg, d.w, d.h, d.cols, isSelected);
        const titleNode = entry.container.getChildByLabel('title');
        if (titleNode) {
          titleNode.style.fill = isSelected ? cols.accent : cols.text;
          this._fitText(titleNode, d.w - d.pad);
        }
      }
    }
  },

  _getLogoVariant(themeId) {
    const warm = ['medieval', 'egypt', 'wildwest', 'steampunk', 'prehistoric'];
    const cool = ['ocean', 'crystal'];
    if (warm.includes(themeId)) return 'title_logo_magma.png';
    if (cool.includes(themeId)) return 'title_logo_ice.png';
    return 'title_logo_original.png';
  },

  destroy() {
    if (this._tickerFn && PixiApp.app) {
      PixiApp.app.ticker.remove(this._tickerFn);
      this._tickerFn = null;
    }
    if (typeof PixiBackgroundRenderer !== 'undefined') {
      PixiBackgroundRenderer.destroy();
    }
    if (this.pixiContainer) {
      PixiScreenManager.setScreenContainer(null);
      this.pixiContainer.destroy({ children: true });
      this.pixiContainer = null;
    }
    this._particles = [];
    this._btnContainers = [];
    this._titleContainer = null;
  },

  handleKeyDown(e) {
    const btn = this.BUTTONS[this._selectedIndex];
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (btn.group === 'util') { this._selectedIndex = 3; }
      else if (this._selectedIndex > 0) { this._selectedIndex--; }
      this._updateSelection();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (btn.group === 'main' && this._selectedIndex < 3) { this._selectedIndex++; }
      else if (this._selectedIndex === 3) { this._selectedIndex = 4; }
      this._updateSelection();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (btn.group === 'util' && btn.idx > 0) { this._selectedIndex--; this._updateSelection(); }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (btn.group === 'util' && btn.idx < 2) { this._selectedIndex++; this._updateSelection(); }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleAction(this.BUTTONS[this._selectedIndex].action);
    }
  },

  handleAction(action) {
    switch (action) {
      case 'story':  store.set('mode', 'story'); switchScreen('characterSelect'); break;
      case '1v1':    store.set('mode', '1v1'); store.set('miniGamesEnabled', true); switchScreen('game', { mode: '1v1' }); break;
      case 'classic': switchScreen('botSelect'); break;
      case 'custom': switchScreen('customGame'); break;
      case 'settings': switchScreen('settings'); break;
      case 'help':   switchScreen('howToPlay'); break;
      case 'stats':  switchScreen('stats'); break;
    }
  },
};
