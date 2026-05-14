const HomeScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  _particles: [],
  _tickerFn: null,
  _titlePulse: 0,
  _btnContainers: [],
  _selectedIndex: 0,

  get LAYOUT() {
    const s = Layout.uiScale || 1;
    if (Layout.isPortrait) {
      const grid = Math.round(12 * s);
      const edgeM = grid * 2;
      const contentW = Layout.W - edgeM * 2;
      const heroH = Math.round(97 * s);
      const mainH = Math.round(85 * s);
      const mainGap = grid;
      const mainStartY = Math.round(291 * s);
      const mainBlockEnd = mainStartY + heroH + 4 * (mainH + mainGap);
      const utilGap = Math.round(13 * s);
      const utilBtnW = Math.floor((contentW - utilGap * 2) / 3);
      const utilBtnH = Math.round(73 * s);
      return {
        W: Layout.W, H: Layout.H,
        LOGO_Y: Math.round(110 * s),
        LOGO_MAX_W: 560,
        HERO_Y: Math.round(150 * s),
        MAIN_START_Y: mainStartY,
        MAIN_BTN_W: contentW,
        HERO_BTN_H: heroH,
        MAIN_BTN_H: mainH,
        MAIN_BTN_GAP: mainGap,
        UTIL_Y: mainBlockEnd + Math.round(36 * s),
        UTIL_BTN_W: utilBtnW,
        UTIL_BTN_H: utilBtnH,
        UTIL_GAP: utilGap,
        FOOTER_Y: mainBlockEnd + Math.round(36 * s) + utilBtnH + grid,
        MAIN_FONT: Math.round(26 * s),
        SUB_FONT: Math.round(19 * s),
        UTIL_FONT: Math.round(21 * s),
      };
    }
    const btnRenderedH = 68;
    const mainGap = Math.round(4 * s);
    const mainStartY = 340;
    const heroH = Math.round(74 * s);
    const mainBlockEnd = mainStartY + heroH + mainGap + 4 * (btnRenderedH + mainGap);
    const utilBtnH = Math.round(33 * s);
    return {
      W: Layout.W, H: Layout.H,
      LOGO_Y: 160,
      LOGO_MAX_W: 610,
      HERO_Y: 200,
      MAIN_START_Y: mainStartY,
      MAIN_BTN_W: Math.min(Math.round(500 * s), Layout.W - 40),
      HERO_BTN_H: heroH,
      MAIN_BTN_H: btnRenderedH,
      MAIN_BTN_GAP: mainGap,
      UTIL_Y: mainBlockEnd + 16,
      UTIL_BTN_W: Math.min(Math.round(190 * s), (Layout.W - 40 - 28) / 3),
      UTIL_BTN_H: utilBtnH,
      UTIL_GAP: 14,
      FOOTER_Y: mainBlockEnd + 16 + utilBtnH + 16,
      MAIN_FONT: Math.round(20 * s),
      SUB_FONT: Math.round(14 * s),
      UTIL_FONT: Math.round(13 * s),
    };
  },

  BUTTONS: [
    { text: 'Story Mode',    sub: 'Battle unique characters', action: 'story',    group: 'main' },
    { text: 'Local 1v1',     sub: 'Play with a friend',       action: '1v1',      group: 'main' },
    { text: 'Classic Chess', sub: 'Challenge the AI engine',  action: 'classic',  group: 'main' },
    { text: 'Training',      sub: 'Puzzles & coaching',       action: 'training', group: 'main' },
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

    // --- Premium animated title aura ---
    const heroContainer = new PIXI.Container();
    heroContainer.x = L.W / 2;
    heroContainer.y = L.HERO_Y;
    heroContainer.label = 'premiumHero';
    const heroAura = new PIXI.Graphics();
    heroAura.ellipse(0, 28, 500, 124).fill({ color: PixiColorUtil.hexToNum(cols.accent), alpha: 0.065 });
    heroAura.ellipse(0, 42, 390, 74).stroke({ color: PixiColorUtil.hexToNum(cols.text), alpha: 0.075, width: 4 });
    heroContainer.addChild(heroAura);
    this.pixiContainer.addChild(heroContainer);
    this._heroContainer = heroContainer;

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
        fill: cols.text, letterSpacing: 0, padding: 30,
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
    let mainCursorY = L.MAIN_START_Y;
    for (let i = 0; i < 5; i++) {
      const btn = this.BUTTONS[i];
      const isHero = i === 0;
      const btnH = isHero ? L.HERO_BTN_H : L.MAIN_BTN_H;
      const bx = (L.W - L.MAIN_BTN_W) / 2;
      const by = mainCursorY;
      const container = this._createMainButton(btn, bx, by, L.MAIN_BTN_W, btnH, cols, i);
      this.pixiContainer.addChild(container);
      this._btnContainers.push({ container, index: i, bounds: { x: bx, y: by, w: L.MAIN_BTN_W, h: btnH } });
      mainCursorY += btnH + L.MAIN_BTN_GAP;
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
      const btn = this.BUTTONS[5 + i];
      const bx = utilStartX + i * (L.UTIL_BTN_W + L.UTIL_GAP);
      const by = L.UTIL_Y;
      const container = this._createUtilButton(btn, bx, by, L.UTIL_BTN_W, L.UTIL_BTN_H, cols, 5 + i);
      this.pixiContainer.addChild(container);
      this._btnContainers.push({ container, index: 4 + i, bounds: { x: bx, y: by, w: L.UTIL_BTN_W, h: L.UTIL_BTN_H } });
    }

    const footerHint = (window.Telegram && window.Telegram.WebApp)
      ? 'Tap to navigate'
      : 'Use mouse or arrow keys to navigate';
    const footer = new PIXI.Text({
      text: footerHint,
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

      if (this._heroContainer) {
        this._heroContainer.y = L.HERO_Y + Math.sin(this._titlePulse * 0.55) * 5;
        this._heroContainer.scale.set(1 + Math.sin(this._titlePulse * 0.35) * 0.006);
        this._heroContainer.alpha = 0.88 + Math.sin(this._titlePulse * 0.7) * 0.05;
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
    const isHero = index === 0;
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

    const fs = Layout.uiScale || 1;
    const titleText = new PIXI.Text({
      text: btn.text,
      style: {
        fontFamily: PixiTextStyles.FONT_TITLE,
        fontSize: Math.round((isHero ? 30 : 26) * fs),
        fontWeight: 'bold',
        fill: isHero ? cols.accent : cols.text,
        letterSpacing: 0,
      },
    });
    titleText.anchor.set(0.5);
    titleText.x = w / 2;
    titleText.y = btn.sub ? h * 0.38 : h / 2;
    titleText.label = 'title';
    this._fitText(titleText, w - pad);
    container.addChild(titleText);

    if (btn.sub) {
      const subText = new PIXI.Text({
        text: btn.sub,
        style: {
          fontFamily: PixiTextStyles.FONT_BODY,
          fontSize: Math.round((isHero ? 20 : 19) * fs),
          fill: PixiColorUtil.alpha(cols.text, '99'),
          letterSpacing: 0,
        },
      });
      subText.anchor.set(0.5);
      subText.x = w / 2;
      subText.y = h * 0.66;
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

    this._drawMainBtnBg(bg, w, h, cols, false, isHero);

    container.on('pointerover', () => {
      this._selectedIndex = index;
      this._updateSelection();
    });
    container.on('pointerout', () => {
      if (this._selectedIndex === index) {
        this._selectedIndex = 0;
        this._updateSelection();
      }
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

    container._btnData = { btn, w, h, cols, bg, pad, isHero };
    return container;
  },

  _drawMainBtnBg(g, w, h, cols, hover, isHero) {
    g.clear();
    const r = 10;
    const accentNum = PixiColorUtil.hexToNum(cols.accent);
    const panelNum = PixiColorUtil.hexToNum(cols.panel);

    g.roundRect(4, isHero ? 8 : 6, w, h, r).fill({ color: 0x000000, alpha: isHero ? 0.32 : 0.25 });

    const fillAlpha = isHero ? 0.92 : (hover ? 0.78 : 0.68);
    const bgColor = hover
      ? PixiColorUtil.hexToNum(PixiColorUtil.lighten(cols.panel, 12))
      : panelNum;
    g.roundRect(0, 0, w, h, r).fill({ color: bgColor, alpha: fillAlpha });

    if (isHero) {
      g.roundRect(0, 0, w, h, r).fill({ color: accentNum, alpha: 0.14 });
    }

    const borderW = isHero ? 4 : (hover ? 3 : 2);
    g.roundRect(0, 0, w, h, r).stroke({
      color: (hover || isHero) ? accentNum : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '44')),
      alpha: isHero ? 1.0 : (hover ? 0.75 : 0.45),
      width: borderW,
    });

    g.roundRect(8, 3, w - 16, 2, 1).fill({ color: 0xffffff, alpha: isHero ? 0.09 : 0.06 });

    if (hover && !isHero) {
      g.roundRect(4, 4, w - 8, h - 8, r - 3).stroke({ color: accentNum, alpha: 0.5, width: 2 });
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

    const ufs = Layout.uiScale || 1;
    const label = new PIXI.Text({
      text: btn.text,
      style: {
        fontFamily: PixiTextStyles.FONT_TITLE,
        fontSize: Math.round(21 * ufs),
        fontWeight: 'bold',
        fill: PixiColorUtil.alpha(cols.text, 'dd'),
        letterSpacing: 0,
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
    container.on('pointerout', () => {
      if (this._selectedIndex === index) {
        this._selectedIndex = 0;
        this._updateSelection();
      }
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
    const r = 8;
    const accentNum = PixiColorUtil.hexToNum(cols.accent);
    const panelNum = PixiColorUtil.hexToNum(cols.panel);

    g.roundRect(3, 5, w, h, r).fill({ color: 0x000000, alpha: 0.22 });

    const bgColor = hover
      ? PixiColorUtil.hexToNum(PixiColorUtil.lighten(cols.panel, 10))
      : panelNum;
    g.roundRect(0, 0, w, h, r).fill({ color: bgColor, alpha: hover ? 0.72 : 0.52 });
    g.roundRect(0, 0, w, h, r).stroke({
      color: hover ? accentNum : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '44')),
      alpha: hover ? 0.65 : 0.35,
      width: 2,
    });

    g.roundRect(6, 2, w - 12, 1, 1).fill({ color: 0xffffff, alpha: 0.05 });

    if (hover) {
      g.roundRect(3, 3, w - 6, h - 6, r - 2).stroke({ color: accentNum, alpha: 0.4, width: 1 });
    }
  },

  _updateSelection() {
    const cols = ThemeManager.getTheme(store.get('theme')).colors;
    for (const entry of this._btnContainers) {
      const isSelected = entry.index === this._selectedIndex;
      const d = entry.container._btnData;

      if (d.btn.group === 'main') {
        this._drawMainBtnBg(d.bg, d.w, d.h, d.cols, isSelected, d.isHero);
        const titleNode = entry.container.getChildByLabel('title');
        if (titleNode) {
          titleNode.style.fill = (isSelected || d.isHero) ? cols.accent : cols.text;
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
          titleNode.style.fill = isSelected ? cols.accent : PixiColorUtil.alpha(cols.text, 'cc');
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
    this._heroContainer = null;
  },

  handleKeyDown(e) {
    const btn = this.BUTTONS[this._selectedIndex];
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (btn.group === 'util') { this._selectedIndex = 4; }
      else if (this._selectedIndex > 0) { this._selectedIndex--; }
      this._updateSelection();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (btn.group === 'main' && this._selectedIndex < 4) { this._selectedIndex++; }
      else if (this._selectedIndex === 4) { this._selectedIndex = 5; }
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
    if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') {
      audioManager.playButton();
    }
    switch (action) {
      case 'story':  store.set('mode', 'story'); switchScreen('characterSelect'); break;
      case '1v1':    store.set('mode', '1v1'); store.set('miniGamesEnabled', true); switchScreen('game', { mode: '1v1' }); break;
      case 'classic': switchScreen('botSelect'); break;
      case 'training': switchScreen('trainingHub'); break;
      case 'custom': switchScreen('customGame'); break;
      case 'settings': switchScreen('settings'); break;
      case 'help':   switchScreen('howToPlay'); break;
      case 'stats':  switchScreen('stats'); break;
    }
  },
};
