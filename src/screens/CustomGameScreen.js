const CustomGameScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  eloValue: 1000,
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
    const stored = store.get('customElo');
    this.eloValue = stored || (200 + ((store.get('customDifficulty') || 5) - 1) * 200);
    this.playAs = store.get('customPlayAs') || 'white';
    this.minigameToggles = { ...(store.get('customMinigames') || {}) };
    for (const game of this.minigameList) {
      if (this.minigameToggles[game.key] === undefined) this.minigameToggles[game.key] = true;
    }
    this.build();
  },

  destroy() {
    PixiPremiumScene.destroy(this);
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  eloToDifficulty(elo) {
    return Math.max(1, Math.min(10, Math.round((elo - 200) / 200) + 1));
  },

  eloToName(elo) {
    if (elo <= 400) return 'Beginner';
    if (elo <= 600) return 'Novice';
    if (elo <= 800) return 'Casual';
    if (elo <= 1000) return 'Intermediate';
    if (elo <= 1200) return 'Skilled';
    if (elo <= 1400) return 'Advanced';
    if (elo <= 1600) return 'Expert';
    if (elo <= 1800) return 'Master';
    if (elo <= 1900) return 'Grandmaster';
    return 'Chess 2.0';
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Custom Game', 'Tune the bot and capture challenges', { footerHint: `${this.eloValue} ELO | ${this.eloToName(this.eloValue)} | ${this.enabledCount()} minigames active` });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    this.buildConfigPanel();
    this.buildMinigameGrid();
    const btnY = PixiPremiumScene.bottomButtonY();
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen('home'), { icon: 'back' });
    PixiPremiumScene.button(this.pixiContainer, Layout.W - 256, PixiPremiumScene.bottomButtonY(52), 220, 52, 'Start Game', () => this.startGame(), { primary: true, icon: 'play', fontSize: 22 });
  },

  // Landscape layout; portrait stacks the same pieces.
  LAYOUT: {
    PANEL_X: 60,
    CONFIG_Y: 150,
    CONFIG_H: 164,
    PANEL_GAP: 16,
    INNER: 34,        // panel edge to content
    RIGHT_W: 330,     // colour column
    HEADING_H: 72,    // mini-game panel heading row
    CARD_GAP: 12,
  },

  buildConfigPanel() {
    const L = this.LAYOUT;
    const cols = ThemeManager.getCurrentColors();
    const portrait = Layout.isPortrait;
    const panelX = portrait ? 40 : L.PANEL_X;
    const panelW = Layout.W - panelX * 2;
    const panelY = L.CONFIG_Y;
    const panelH = portrait ? 230 : L.CONFIG_H;
    PixiPremiumScene.panel(this.pixiContainer, panelX, panelY, panelW, panelH, { accentAlpha: 0.45 });
    const innerX = panelX + L.INNER;
    const mid = panelY + 16 + Math.round((panelH - 16) / 2);   // below the accent strip

    const label = PixiPremiumScene.text('Bot Difficulty', { fontSize: 23, fontWeight: '900', fill: cols.text });
    label.anchor.set(0, 1);
    label.x = innerX;
    label.y = portrait ? panelY + 70 : mid - 4;
    this.pixiContainer.addChild(label);
    const elo = PixiPremiumScene.text(`${this.eloValue} ELO  ·  ${this.eloToName(this.eloValue)}`, { fontSize: 18, fontWeight: '800', fill: cols.accent });
    elo.anchor.set(0, 0);
    elo.x = innerX;
    elo.y = label.y + 8;
    this.pixiContainer.addChild(elo);

    const rightX = portrait ? innerX : panelX + panelW - L.INNER - L.RIGHT_W;
    const sliderX = portrait ? innerX : innerX + 290;
    const sliderW = portrait ? panelW - L.INNER * 2 : rightX - 48 - sliderX;
    const slider = new PixiSlider({
      width: sliderW,
      height: 18,
      min: 200,
      max: 2000,
      step: 50,
      value: this.eloValue,
      cols,
      showValue: false,
      gradientStops: [
        { pos: 0, color: '#7dea99' },
        { pos: 0.45, color: cols.accent },
        { pos: 1, color: '#ff6578' },
      ],
      showTicks: true,
      tickInterval: 300,
    });
    slider.x = sliderX;
    slider.y = portrait ? panelY + 124 : mid - 9;
    slider.onChange((value) => {
      this.eloValue = value;
      elo.text = `${value} ELO  ·  ${this.eloToName(value)}`;
    });
    this.pixiContainer.addChild(slider);

    // Colour choice. Custom games always use random capture challenges (no Defenses).
    const btnH = 40;
    const btnGap = 10;
    const blockY = portrait ? panelY + 164 : mid - btnH / 2;
    const halfW = Math.floor((L.RIGHT_W - btnGap) / 2);
    ['white', 'black'].forEach((color, i) => {
      PixiPremiumScene.button(this.pixiContainer, rightX + i * (halfW + btnGap), blockY, halfW, btnH, color === 'white' ? 'Play White' : 'Play Black', () => {
        this.playAs = color;
        this.build();
      }, { primary: this.playAs === color, fontSize: 16 });
    });
    this._configBottom = panelY + panelH;
  },

  buildMinigameGrid() {
    const L = this.LAYOUT;
    const cols = ThemeManager.getCurrentColors();
    const portrait = Layout.isPortrait;
    const gridCols = portrait ? 3 : 5;
    const gridRows = Math.ceil(this.minigameList.length / gridCols);
    const panelX = portrait ? 40 : L.PANEL_X;
    const panelW = Layout.W - panelX * 2;
    const panelY = this._configBottom + L.PANEL_GAP;
    const panelH = portrait
      ? L.HEADING_H + gridRows * 84 + (gridRows - 1) * L.CARD_GAP + 22
      : PixiPremiumScene.contentBottom - panelY;
    PixiPremiumScene.panel(this.pixiContainer, panelX, panelY, panelW, panelH, { accentAlpha: 0.35 });

    const headingY = panelY + 16 + Math.round((L.HEADING_H - 16) / 2);
    const heading = PixiPremiumScene.text('Capture Mini-Games', { fontSize: 22, fontWeight: '900', fill: cols.text });
    heading.anchor.set(0, 0.5);
    const gridInset = 24;
    heading.x = panelX + gridInset;
    heading.y = headingY;
    this.pixiContainer.addChild(heading);

    const toggleW = 96;
    const toggleH = 34;
    const allOffX = panelX + panelW - gridInset - toggleW;
    PixiPremiumScene.button(this.pixiContainer, allOffX - toggleW - 10, headingY - toggleH / 2, toggleW, toggleH, 'All On', () => {
      this.minigameList.forEach(game => { this.minigameToggles[game.key] = true; });
      this.build();
    }, { fontSize: 15 });
    PixiPremiumScene.button(this.pixiContainer, allOffX, headingY - toggleH / 2, toggleW, toggleH, 'All Off', () => {
      this.minigameList.forEach(game => { this.minigameToggles[game.key] = false; });
      this.build();
    }, { fontSize: 15 });

    const gridX = panelX + gridInset;
    const gridY = panelY + L.HEADING_H;
    const gridW = panelW - gridInset * 2;
    const cardW = Math.floor((gridW - (gridCols - 1) * L.CARD_GAP) / gridCols);
    const cardH = Math.min(84, Math.floor((panelY + panelH - 22 - gridY - (gridRows - 1) * L.CARD_GAP) / gridRows));
    const thumbH = Math.min(36, cardH - 24);
    const thumbW = Math.round(thumbH * 1.8);
    const textX = 12 + thumbW + 10;
    const textW = cardW - textX - 8;

    // Every name on one line at the same size (sized for the longest, "Target Practice").
    const titleSize = 14;

    this.minigameList.forEach((game, i) => {
      const x = gridX + (i % gridCols) * (cardW + L.CARD_GAP);
      const y = gridY + Math.floor(i / gridCols) * (cardH + L.CARD_GAP);
      const on = this.minigameToggles[game.key] !== false;
      PixiPremiumScene.card(this.pixiContainer, x, y, cardW, cardH, {
        active: on,
        activeColor: on ? cols.accent : '#ff6578',
        accentStrip: false,
        onClick: () => {
          this.minigameToggles[game.key] = !on;
          this.build();
        },
        draw: (card) => {
          const thumb = new PIXI.Sprite(PixiPremiumAssets.minigame(game.key));
          thumb.width = thumbW;
          thumb.height = thumbH;
          thumb.x = 12;
          thumb.y = Math.round((cardH - thumbH) / 2);
          thumb.alpha = on ? 1 : 0.42;
          card.addChild(thumb);
          const title = PixiPremiumScene.text(game.name, { fontSize: titleSize, fontWeight: '900', fill: on ? cols.text : PixiPremiumScene.alpha(cols.text, '66') });
          PixiPremiumScene.fit(title, textW, 0.85);
          const state = PixiPremiumScene.text(on ? 'ON' : 'OFF', { fontSize: 13, fontWeight: '900', fill: on ? cols.accent : '#ff6578' });
          const blockH = title.height + 6 + state.height;
          title.x = textX;
          title.y = Math.round((cardH - blockH) / 2);
          state.x = textX;
          state.y = title.y + title.height + 6;
          card.addChild(title, state);
        },
      });
    });
  },

  enabledCount() {
    return Object.values(this.minigameToggles).filter(Boolean).length;
  },

  startGame() {
    store.set('customElo', this.eloValue);
    store.set('customDifficulty', this.eloToDifficulty(this.eloValue));
    store.set('customPlayAs', this.playAs);
    store.set('customMinigames', { ...this.minigameToggles });
    store.set('mode', 'custom');
    store.set('p1IsWhite', this.playAs === 'white');
    store.set('miniGamesEnabled', this.enabledCount() > 0);
    store.saveProgress();
    switchScreen('game');
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') switchScreen('home');
    if (e.key === 'Enter') this.startGame();
  },
};
