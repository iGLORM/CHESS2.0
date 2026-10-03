const HomeScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  _particles: [],
  _tickerFn: null,
  _titlePulse: 0,
  _cards: [],
  _focus: null,

  // Landscape: logo, three mode tiles side by side, then the small buttons.
  // Portrait: the tiles stack as wide rows.
  get LAYOUT() {
    const s = Layout.uiScale || 1;
    if (Layout.isPortrait) {
      const side = 36;
      const tileW = Layout.W - side * 2;
      const tileH = Math.round(196 * s);
      const gap = 22;
      const off = Math.max(0, Math.round((Layout.H - 1280) / 2));
      const tilesY = 400 + off;
      const utilY = tilesY + 3 * tileH + 2 * gap + 36;
      return {
        W: Layout.W, H: Layout.H, LOGO_Y: 236 + off, LOGO_MAX_W: 700,
        TILES_Y: tilesY, TILE_W: tileW, TILE_H: tileH, TILE_GAP: gap, PER_ROW: 1,
        UTIL_Y: utilY, UTIL_H: 72, UTIL_GAP: 14, UTIL_W: Math.floor((tileW - 28) / 3),
        FOOTER_Y: utilY + 72 + 34,
      };
    }
    const tileW = 312;
    const gap = 28;
    return {
      W: Layout.W, H: Layout.H, LOGO_Y: 172, LOGO_MAX_W: 640,
      TILES_Y: 318, TILE_W: tileW, TILE_H: 318, TILE_GAP: gap, PER_ROW: 3,
      UTIL_Y: 668, UTIL_H: 50, UTIL_GAP: 18, UTIL_W: 206,
      FOOTER_Y: 758,
    };
  },

  MODES: [
    { title: 'Story', sub: 'Restore the Great Board', action: 'story',
      art: [{ type: 'king', color: 'white', scale: 0.95 }] },
    { title: 'Play', sub: 'Classic, 1v1 and Custom', action: 'play',
      art: [{ type: 'knight', color: 'white', dx: -0.2, scale: 0.8, flip: true }, { type: 'knight', color: 'black', dx: 0.2, scale: 0.8 }] },
    { title: 'Training', sub: 'Puzzles and mini-games', action: 'training',
      art: [{ type: 'pawn', color: 'white', dx: -0.22, dy: 0.08, scale: 0.62 }, { type: 'rook', color: 'black', dx: 0.2, scale: 0.82 }] },
  ],

  UTILS: [
    { text: 'Settings', action: 'settings', icon: 'settings' },
    { text: 'How to Play', action: 'help', icon: 'spark' },
    { text: 'Stats', action: 'stats', icon: 'progress' },
  ],

  _modeDetail(action) {
    if (action === 'story') {
      const best = Math.max(1, ...(store.get('storySaves') || []).map(sv => (sv && sv.maxUnlockedLevel) || 1));
      const stage = Math.min(15, best);
      return stage > 1 ? `Stage ${stage} of 15` : '15 stages, 11 worlds';
    }
    if (action === 'play') return 'vs AI  ·  vs a friend';
    const progress = store.get('trainingProgress') || {};
    const solved = Object.values(progress.levels || {}).filter(l => l.solved).length;
    return `${solved}/${TRAINING_LEVELS.length} puzzles solved`;
  },

  init() {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;
    const L = this.LAYOUT;

    this.pixiContainer = new PIXI.Container();
    this._titlePulse = 0;

    // --- Background ---
    if (typeof PixiBackgroundRenderer !== 'undefined') {
      PixiBackgroundRenderer.init(this.pixiContainer);
      PixiBackgroundRenderer.render(store.get('theme') || 'chess20');
    }

    // Darken the lower half so the tiles read well over any scene.
    const shade = new PIXI.Graphics();
    shade.rect(0, 0, L.W, L.H).fill({ color: 0x000000, alpha: 0.18 });
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const y = L.TILES_Y - 60 + i * 24;
      shade.rect(0, y, L.W, L.H - y).fill({ color: 0x02030a, alpha: 0.035 });
    }
    this.pixiContainer.addChild(shade);

    // --- Floating particles ---
    this._particles = [];
    const particleContainer = new PIXI.Container();
    particleContainer.label = 'particles';
    const particleCount = Math.round(70 * (typeof Graphics !== 'undefined' ? Graphics.particles() : 1));
    for (let i = 0; i < particleCount; i++) {
      const p = new PIXI.Graphics();
      const size = Math.random() < 0.2 ? 3 : 2;
      p.rect(0, 0, size, size).fill({ color: i % 4 ? 0xffffff : PixiColorUtil.hexToNum(cols.accent), alpha: 0.6 });
      p.x = Math.random() * L.W;
      p.y = Math.random() * L.H;
      particleContainer.addChild(p);
      this._particles.push({
        gfx: p,
        speed: Math.random() * 0.35 + 0.08,
        twinkleSpeed: Math.random() * 2 + 1,
        twinklePhase: Math.random() * Math.PI * 2,
        baseAlpha: 0.25 + Math.random() * 0.45,
      });
    }
    this.pixiContainer.addChild(particleContainer);

    // --- Title logo (drawn in code, coloured by the theme) ---
    const titleContainer = new PIXI.Container();
    titleContainer.x = L.W / 2;
    titleContainer.y = L.LOGO_Y;
    titleContainer.label = 'titleGroup';
    const buildLogo = () => {
      if (this._logo) this._logo.destroy();
      this._logo = PixiTitleLogo.create(cols, L.LOGO_MAX_W);
      titleContainer.addChild(this._logo.container);
    };
    buildLogo();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (titleContainer.parent) buildLogo(); });
    }
    this.pixiContainer.addChild(titleContainer);
    this._titleContainer = titleContainer;

    // --- Mode tiles ---
    this._cards = [];
    const rowW = L.PER_ROW * L.TILE_W + (L.PER_ROW - 1) * L.TILE_GAP;
    const x0 = Math.round((L.W - rowW) / 2);
    this.MODES.forEach((mode, i) => {
      const col = i % L.PER_ROW;
      const row = Math.floor(i / L.PER_ROW);
      const tile = PixiPremiumScene.tile(this.pixiContainer,
        x0 + col * (L.TILE_W + L.TILE_GAP), L.TILES_Y + row * (L.TILE_H + L.TILE_GAP), L.TILE_W, L.TILE_H, {
          title: mode.title,
          sub: mode.sub,
          detail: this._modeDetail(mode.action),
          primary: i === 0,
          titleSize: Layout.isPortrait ? 28 : 30,
          artShare: 0.5,
          art: PixiPremiumScene.pieceArt(mode.art),
          onClick: () => this.handleAction(mode.action),
        });
      this._cards.push(tile);
    });

    // --- Small buttons ---
    const utilRowW = 3 * L.UTIL_W + 2 * L.UTIL_GAP;
    const ux = Math.round((L.W - utilRowW) / 2);
    this.UTILS.forEach((u, i) => {
      const btn = PixiPremiumScene.button(this.pixiContainer, ux + i * (L.UTIL_W + L.UTIL_GAP), L.UTIL_Y, L.UTIL_W, L.UTIL_H,
        u.text, () => this.handleAction(u.action), { icon: u.icon, fontSize: Layout.isPortrait ? 18 : 17 });
      this._cards.push(btn);
    });
    this._focus = PixiPremiumScene.focusRing(this._cards, 3);

    const footerHint = (navigator.maxTouchPoints > 0 && !(window.electron && window.electron.isDesktop))
      ? 'Tap a mode to begin'
      : 'Arrow keys to choose, Enter to start';
    const footer = new PIXI.Text({
      text: footerHint,
      style: { fontFamily: PixiTextStyles.FONT_BODY, fontSize: 16, fill: PixiColorUtil.alpha(cols.text, '66') },
    });
    footer.anchor.set(0.5);
    footer.x = L.W / 2;
    footer.y = L.FOOTER_Y;
    this.pixiContainer.addChild(footer);

    // --- Animation ticker ---
    this._tickerFn = (ticker) => {
      const dt = ticker.deltaTime / 60;
      this._titlePulse += dt * 2;
      for (const p of this._particles) {
        p.gfx.y -= p.speed;
        if (p.gfx.y < -5) { p.gfx.y = L.H + 5; p.gfx.x = Math.random() * L.W; }
        p.twinklePhase += dt * p.twinkleSpeed;
        p.gfx.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(p.twinklePhase));
      }
      if (this._logo) this._logo.update(dt);
    };
    PixiApp.app.ticker.add(this._tickerFn);

    this._buildResumeButton();
    if (window.electron && window.electron.isDesktop) {
      PixiPremiumScene.button(this.pixiContainer, 24, 22, 120, 44, 'Quit', () => window.electron.quit(), { fontSize: 16 });
    }

    PixiScreenManager.setScreenContainer(this.pixiContainer);
  },

  // Offer to continue a game that was left unfinished (e.g. the app was closed).
  _buildResumeButton() {
    const saved = GameScreen.getSavedGame();
    if (!saved) return;
    const names = { story: 'Story', classic: 'Classic', custom: 'Custom', '1v1': '1v1' };
    const moves = saved.snapshots.length - 1;
    const label = `Resume ${names[saved.mode] || ''} game (${moves} moves)`;
    const w = Layout.isPortrait ? 420 : 330;
    PixiPremiumScene.button(this.pixiContainer, Layout.W - w - 24, 22, w, 44, label, () => GameScreen.resumeSavedGame(), { primary: true, icon: 'play', fontSize: 16 });
  },

  destroy() {
    if (this._tickerFn && PixiApp.app) {
      PixiApp.app.ticker.remove(this._tickerFn);
      this._tickerFn = null;
    }
    if (typeof PixiBackgroundRenderer !== 'undefined') {
      PixiBackgroundRenderer.destroy();
    }
    if (this._logo) {
      this._logo.destroy();
      this._logo = null;
    }
    if (this.pixiContainer) {
      PixiScreenManager.setScreenContainer(null);
      this.pixiContainer.destroy({ children: true });
      this.pixiContainer = null;
    }
    this._particles = [];
    this._cards = [];
    this._focus = null;
    this._titleContainer = null;
  },

  handleKeyDown(e) {
    if (!this._focus) return;
    const portrait = Layout.isPortrait;
    const n = this.MODES.length;
    const i = this._focus.index;
    const inTiles = i >= 0 && i < n;
    const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (keys[e.key]) {
      e.preventDefault();
      if (i < 0) { this._focus.focus(0); return; }
      const [dx, dy] = keys[e.key];
      let next = i;
      if (portrait && inTiles) {
        next = dy ? i + dy : i;
        if (next >= n) next = n;
      } else if (inTiles) {
        next = dy > 0 ? n + i : i + dx;
      } else {
        next = dy < 0 ? (portrait ? n - 1 : i - n) : i + dx;
      }
      if (!inTiles && !dy && (next < n || next >= this._cards.length)) next = i;
      if (inTiles && !portrait && dx && (next < 0 || next >= n)) next = i;
      this._focus.focus(Math.max(0, Math.min(this._cards.length - 1, next)));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._focus.press();
    }
  },

  handleAction(action) {
    switch (action) {
      case 'story':  store.set('mode', 'story'); switchScreen('characterSelect'); break;
      case 'play':   switchScreen('playMenu'); break;
      case 'training': switchScreen('trainingHub'); break;
      case 'settings': switchScreen('settings'); break;
      case 'help':   switchScreen('howToPlay'); break;
      case 'stats':  switchScreen('stats'); break;
    }
  },
};
