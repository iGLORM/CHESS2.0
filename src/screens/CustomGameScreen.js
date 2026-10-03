// Custom: the bot's strength, your side and which capture mini-games can come up.
const CustomGameScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  level: BotSetup.DEFAULT_LEVEL,
  playAs: 'white',
  minigameToggles: {},

  minigameList: [
    { key: 'checkmateRun', name: 'Checkmate Run' },
    { key: 'lavaTilt', name: 'Lava Tilt' },
    { key: 'rookStack', name: 'Rook Stack' },
    { key: 'siegeCannon', name: 'Siege Cannon' },
    { key: 'meteorStorm', name: 'Meteor Storm' },
    { key: 'knightCollapse', name: 'Knight Collapse' },
    { key: 'memoryMatch', name: 'Memory Match' },
    { key: 'timingStrike', name: 'Timing Strike' },
    { key: 'patternPress', name: 'Pattern Press' },
    { key: 'reactionTest', name: 'Quick Draw' },
    { key: 'undertaleDodge', name: 'Soul Dodge' },
    { key: 'powerMeter', name: 'High Striker' },
    { key: 'targetPractice', name: 'Crossbow Gallery' },
    { key: 'dodgeFalling', name: 'Falling Sky' },
    { key: 'rhythmTap', name: 'Rhythm Rush' },
    { key: 'barBalance', name: 'Tightrope' },
    { key: 'shieldBlock', name: 'Shield Wall' },
    { key: 'whackMole', name: 'Whack-a-Pawn' },
  ],

  init() {
    this.level = BotSetup.loadLevel('custom');
    this.playAs = store.get('customPlayAs') || 'white';
    this.minigameToggles = { ...(store.get('customMinigames') || {}) };
    for (const game of this.minigameList) {
      if (this.minigameToggles[game.key] === undefined) this.minigameToggles[game.key] = true;
    }
    this.build();
  },

  destroy() {
    this._picker = null;
    PixiPremiumScene.destroy(this);
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Custom Game', 'Your bot, your side, your mini-games', {
      footerHint: 'Left / Right: strength  |  Enter: start',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    this.buildConfigPanel();
    this.buildMinigameGrid();
    PixiPremiumScene.button(this.pixiContainer, 36, PixiPremiumScene.bottomButtonY(), 160, 44, 'Back', () => this.back(), { icon: 'back' });
    PixiPremiumScene.button(this.pixiContainer, Layout.W - 256, PixiPremiumScene.bottomButtonY(52), 220, 52, 'Start Game', () => this.startGame(), { primary: true, icon: 'play', fontSize: 22 });
  },

  // Landscape layout; portrait stacks the same pieces.
  LAYOUT: {
    PANEL_X: 60,
    CONFIG_Y: 146,
    PANEL_GAP: 14,
    INNER: 34,        // panel edge to content
    TOP_PAD: 36,      // below the accent strip
    BOTTOM_PAD: 22,
    SIDES_W: 330,     // side column (landscape)
    COL_GAP: 48,
    HEADING_H: 62,    // mini-game panel heading row
    CARD_GAP: 10,
    CARD_MIN_H: 52,
    CARD_MAX_H: 84,
  },

  buildConfigPanel() {
    const L = this.LAYOUT;
    const cols = ThemeManager.getCurrentColors();
    const portrait = Layout.isPortrait;
    const panelX = portrait ? 40 : L.PANEL_X;   // panels are at most Layout.W - 80 wide
    const panelW = Layout.W - panelX * 2;
    const innerW = panelW - L.INNER * 2;
    const body = new PIXI.Container();

    const onSide = (id) => { this.playAs = id; this.build(); };
    let bodyH;
    if (portrait) {
      this._picker = BotSetup.strength(body, 0, 0, innerW, this.level, (v) => { this.level = v; });
      const sides = BotSetup.sides(body, 0, this._picker.height + 20, innerW, this.playAs, onSide);
      bodyH = this._picker.height + 20 + sides.height;
    } else {
      const leftW = innerW - L.SIDES_W - L.COL_GAP;
      this._picker = BotSetup.strength(body, 0, 0, leftW, this.level, (v) => { this.level = v; });
      const sidesX = leftW + L.COL_GAP;
      const probe = BotSetup.sides(new PIXI.Container(), 0, 0, L.SIDES_W, this.playAs, onSide, { stacked: true });
      const sidesY = Math.round((this._picker.height - probe.height) / 2);
      BotSetup.sides(body, sidesX, sidesY, L.SIDES_W, this.playAs, onSide, { stacked: true });
      body.addChild(new PIXI.Graphics().rect(leftW + L.COL_GAP / 2 - 1, 4, 2, this._picker.height - 8)
        .fill({ color: PixiPremiumScene.color(cols.text), alpha: 0.12 }));
      bodyH = this._picker.height;
    }

    const panelY = L.CONFIG_Y;
    const panelH = L.TOP_PAD + bodyH + L.BOTTOM_PAD;
    PixiPremiumScene.panel(this.pixiContainer, panelX, panelY, panelW, panelH, { accentAlpha: 0.45 });
    body.x = panelX + L.INNER;
    body.y = panelY + L.TOP_PAD;
    this.pixiContainer.addChild(body);
    this._configBottom = panelY + panelH;
  },

  buildMinigameGrid() {
    const L = this.LAYOUT;
    const cols = ThemeManager.getCurrentColors();
    const portrait = Layout.isPortrait;
    const gridCols = portrait ? 3 : 5;
    const gridRows = Math.ceil(this.minigameList.length / gridCols);
    const panelX = portrait ? 40 : L.PANEL_X;   // panels are at most Layout.W - 80 wide
    const panelW = Layout.W - panelX * 2;
    const panelY = this._configBottom + L.PANEL_GAP;
    const gridInset = 22;
    const headingH = Math.max(L.HEADING_H, PixiPremiumScene.buttonHeight(34) + 28);   // phones: taller buttons
    const room = PixiPremiumScene.contentBottom - panelY - headingH - 18 - (gridRows - 1) * L.CARD_GAP;
    const cardH = Math.max(L.CARD_MIN_H, Math.min(L.CARD_MAX_H, Math.floor(room / gridRows)));
    const panelH = headingH + gridRows * cardH + (gridRows - 1) * L.CARD_GAP + 18;
    PixiPremiumScene.panel(this.pixiContainer, panelX, panelY, panelW, panelH, { accentAlpha: 0.35 });

    const headingY = panelY + 14 + Math.round((headingH - 14) / 2);
    const heading = PixiPremiumScene.text('Capture Mini-Games', { fontSize: 22, fontWeight: '900', fill: cols.text });
    heading.anchor.set(0, 0.5);
    heading.x = panelX + gridInset;
    heading.y = headingY;
    this.pixiContainer.addChild(heading);
    const on = this.enabledCount();
    const count = PixiPremiumScene.text(on ? `${on} of ${this.minigameList.length} on` : 'Off: captures just happen',
      { fontSize: 17, fontWeight: '800', fill: on ? cols.accent : '#ff6578' });
    count.anchor.set(0, 0.5);
    count.x = heading.x + heading.width + 18;
    count.y = headingY + 1;
    this.pixiContainer.addChild(count);

    // As wide as the longer label needs (labels are longer in some languages).
    const toggleW = Math.max(96, ...['All On', 'All Off'].map((l) => {
      const t = PixiPremiumScene.text(l, { fontSize: 15, fontWeight: '800' });
      const w = Math.ceil(t.width) + 28;
      t.destroy();
      return w;
    }));
    const toggleH = 34;
    const toggleY = headingY - PixiPremiumScene.buttonHeight(toggleH) / 2;
    const allOffX = panelX + panelW - gridInset - toggleW;
    const setAll = (value) => {
      this.minigameList.forEach(game => { this.minigameToggles[game.key] = value; });
      this.build();
    };
    PixiPremiumScene.button(this.pixiContainer, allOffX - toggleW - 10, toggleY, toggleW, toggleH, 'All On', () => setAll(true), { fontSize: 15 });
    PixiPremiumScene.button(this.pixiContainer, allOffX, toggleY, toggleW, toggleH, 'All Off', () => setAll(false), { fontSize: 15 });
    if (portrait) count.visible = count.x + count.width < allOffX - toggleW - 20;

    const gridX = panelX + gridInset;
    const gridY = panelY + headingH;
    const gridW = panelW - gridInset * 2;
    const cardW = Math.floor((gridW - (gridCols - 1) * L.CARD_GAP) / gridCols);
    const thumbH = Math.min(40, cardH - 16);
    const thumbW = Math.round(thumbH * 1.8);
    const textX = 10 + thumbW + 10;
    const textW = cardW - textX - 8;

    this.minigameList.forEach((game, i) => {
      const x = gridX + (i % gridCols) * (cardW + L.CARD_GAP);
      const y = gridY + Math.floor(i / gridCols) * (cardH + L.CARD_GAP);
      const enabled = this.minigameToggles[game.key] !== false;
      PixiPremiumScene.card(this.pixiContainer, x, y, cardW, cardH, {
        active: enabled,
        activeColor: enabled ? cols.accent : '#ff6578',
        accentStrip: false,
        onClick: () => {
          this.minigameToggles[game.key] = !enabled;
          this.build();
        },
        draw: (card) => {
          const thumb = new PIXI.Sprite(PixiPremiumAssets.minigame(game.key));
          thumb.width = thumbW;
          thumb.height = thumbH;
          thumb.x = 10;
          thumb.y = Math.round((cardH - thumbH) / 2);
          thumb.alpha = enabled ? 1 : 0.35;
          card.addChild(thumb);
          const title = PixiPremiumScene.text(game.name, { fontSize: 14, fontWeight: '900', fill: enabled ? cols.text : PixiPremiumScene.alpha(cols.text, '66') });
          PixiPremiumScene.fit(title, textW, 0.7);
          const state = PixiPremiumScene.text(enabled ? 'ON' : 'OFF', { fontSize: 13, fontWeight: '900', fill: enabled ? cols.accent : '#ff6578' });
          const blockH = title.height + 4 + state.height;
          title.x = textX;
          title.y = Math.round((cardH - blockH) / 2);
          state.x = textX;
          state.y = title.y + title.height + 4;
          card.addChild(title, state);
        },
      });
    });
  },

  enabledCount() {
    return this.minigameList.filter(game => this.minigameToggles[game.key] !== false).length;
  },

  back() {
    if (typeof audioManager !== 'undefined' && audioManager.playButton) audioManager.playButton();
    switchScreen('playMenu');
  },

  startGame() {
    BotSetup.saveLevel('custom', this.level);
    store.set('customPlayAs', this.playAs);
    store.set('customMinigames', { ...this.minigameToggles });
    store.update({
      mode: 'custom',
      p1IsWhite: BotSetup.resolveSide(this.playAs) === 'white',
      miniGamesEnabled: this.enabledCount() > 0,
    });
    store.saveProgress();
    switchScreen('game');
  },

  handleKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      this.back();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      this._picker.step(e.key === 'ArrowLeft' ? -1 : 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.startGame();
    }
  },
};
