const CustomGameScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  eloValue: 1000,
  playAs: 'white',
  gameplayMode: true,
  minigameToggles: {},

  minigameList: [
    { key: 'quickClick', name: 'Quick Click' },
    { key: 'memoryMatch', name: 'Memory Match' },
    { key: 'timingStrike', name: 'Timing Strike' },
    { key: 'patternPress', name: 'Pattern Press' },
    { key: 'reactionTest', name: 'Reaction Test' },
    { key: 'undertaleDodge', name: 'Soul Dodge' },
    { key: 'powerMeter', name: 'Power Meter' },
    { key: 'targetPractice', name: 'Target Practice' },
    { key: 'dodgeFalling', name: 'Dodge Falling' },
    { key: 'rhythmTap', name: 'Rhythm Tap' },
    { key: 'numberGuess', name: 'Number Guess' },
    { key: 'coinFlip', name: 'Coin Flip' },
    { key: 'barBalance', name: 'Bar Balance' },
    { key: 'shieldBlock', name: 'Shield Block' },
    { key: 'whackMole', name: 'Whack-a-Mole' },
  ],

  init() {
    const stored = store.get('customElo');
    this.eloValue = stored || (200 + ((store.get('customDifficulty') || 5) - 1) * 200);
    this.playAs = store.get('customPlayAs') || 'white';
    this.gameplayMode = store.get('customGameplayMode') !== false;
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
    this.pixiContainer = PixiPremiumScene.root('Custom Game', 'Tune the bot and capture challenges', { footerHint: `${this.eloValue} ELO | ${this.eloToName(this.eloValue)} | ${this.enabledCount()} minigames active | ${this.gameplayMode ? 'Defensive' : 'Classic'} mode` });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    this.buildConfigPanel();
    this.buildMinigameGrid();
    const btnY = Layout.H - 82;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen('home'), { icon: 'back' });
    PixiPremiumScene.button(this.pixiContainer, Layout.W - 260, btnY - 8, 220, 58, 'Start Game', () => this.startGame(), { primary: true, icon: 'play', fontSize: 22 });
  },

  buildConfigPanel() {
    const cols = ThemeManager.getCurrentColors();
    const portrait = Layout.isPortrait;
    const panelX = portrait ? 40 : 78;
    const panelW = portrait ? 720 : 1124;
    const panelH = portrait ? 210 : 154;
    PixiPremiumScene.panel(this.pixiContainer, panelX, 132, panelW, panelH, { accentAlpha: 0.45 });

    const innerX = panelX + 38;
    const label = PixiPremiumScene.text('Bot Difficulty', { fontSize: 23, fontWeight: '900', fill: cols.text });
    label.x = innerX;
    label.y = 164;
    this.pixiContainer.addChild(label);
    const elo = PixiPremiumScene.text(`${this.eloValue} ELO`, { fontSize: 24, fontWeight: '900', fill: cols.accent });
    elo.x = innerX;
    elo.y = 202;
    this.pixiContainer.addChild(elo);
    const name = PixiPremiumScene.text(this.eloToName(this.eloValue), { fontSize: 16, fill: PixiPremiumScene.alpha(cols.text, 'aa') });
    name.x = innerX + 132;
    name.y = 208;
    this.pixiContainer.addChild(name);

    const sliderW = portrait ? panelW - 100 : 560;
    const slider = new PixiSlider({
      width: sliderW,
      height: 18,
      min: 200,
      max: 2000,
      step: 50,
      value: this.eloValue,
      cols,
      gradientStops: [
        { pos: 0, color: '#7dea99' },
        { pos: 0.45, color: cols.accent },
        { pos: 1, color: '#ff6578' },
      ],
      showTicks: true,
      tickInterval: 300,
    });
    slider.x = portrait ? innerX : 400;
    slider.y = portrait ? 244 : 202;
    slider.onChange((value) => {
      this.eloValue = value;
      elo.text = `${value} ELO`;
      name.text = this.eloToName(value);
    });
    this.pixiContainer.addChild(slider);

    const btnAreaX = portrait ? (innerX + sliderW - 360) : 994;
    const btnAreaY = portrait ? 288 : 190;
    ['white', 'black'].forEach((color, i) => {
      PixiPremiumScene.button(this.pixiContainer, btnAreaX + i * 94, btnAreaY, 82, 42, color === 'white' ? 'White' : 'Black', () => {
        this.playAs = color;
        this.build();
      }, { primary: this.playAs === color, fontSize: 16 });
    });

    PixiPremiumScene.button(this.pixiContainer, btnAreaX + 194, btnAreaY + 3, 176, 36, this.gameplayMode ? 'Gameplay: ON' : 'Gameplay: OFF', () => {
      this.gameplayMode = !this.gameplayMode;
      this.build();
    }, { primary: this.gameplayMode, fontSize: 14 });
  },

  buildMinigameGrid() {
    const cols = ThemeManager.getCurrentColors();
    const portrait = Layout.isPortrait;
    const gridCols = portrait ? 3 : 5;
    const gridRows = Math.ceil(this.minigameList.length / gridCols);
    const panelX = portrait ? 40 : 78;
    const panelW = portrait ? 720 : 1124;
    const panelStartY = portrait ? 370 : 316;
    const panelH = portrait ? (gridRows * 88 + 80) : 368;
    PixiPremiumScene.panel(this.pixiContainer, panelX, panelStartY, panelW, panelH, { accentAlpha: 0.35 });
    const heading = PixiPremiumScene.text('Capture Mini-Games', { fontSize: 22, fontWeight: '900', fill: cols.text });
    heading.x = panelX + 34;
    heading.y = panelStartY + 24;
    this.pixiContainer.addChild(heading);

    const allOnX = portrait ? (panelX + panelW - 210) : 968;
    PixiPremiumScene.button(this.pixiContainer, allOnX, panelStartY + 20, 86, 30, 'All On', () => {
      this.minigameList.forEach(game => { this.minigameToggles[game.key] = true; });
      this.build();
    }, { fontSize: 13 });
    PixiPremiumScene.button(this.pixiContainer, allOnX + 96, panelStartY + 20, 86, 30, 'All Off', () => {
      this.minigameList.forEach(game => { this.minigameToggles[game.key] = false; });
      this.build();
    }, { fontSize: 13 });

    const cardW = portrait ? Math.floor((panelW - 80 - (gridCols - 1) * 22) / gridCols) : 192;
    const cardGapX = portrait ? 22 : 22;
    const gridStartX = panelX + 34;
    const gridStartY = panelStartY + 70;
    this.minigameList.forEach((game, i) => {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const x = gridStartX + col * (cardW + cardGapX);
      const y = gridStartY + row * 88;
      const on = this.minigameToggles[game.key] !== false;
      PixiPremiumScene.card(this.pixiContainer, x, y, cardW, 72, {
        active: on,
        activeColor: on ? cols.accent : '#ff6578',
        onClick: () => {
          this.minigameToggles[game.key] = !on;
          this.build();
        },
        draw: (card) => {
          const thumb = new PIXI.Sprite(PixiPremiumAssets.minigame(game.key));
          thumb.width = 74;
          thumb.height = 44;
          thumb.x = 14;
          thumb.y = 14;
          thumb.alpha = on ? 1 : 0.42;
          card.addChild(thumb);
          const title = PixiPremiumScene.text(game.name, { fontSize: 15, fontWeight: '900', fill: on ? cols.text : PixiPremiumScene.alpha(cols.text, '66') });
          title.x = 100;
          title.y = 18;
          PixiPremiumScene.fit(title, 76, 0.55);
          card.addChild(title);
          const state = PixiPremiumScene.text(on ? 'ON' : 'OFF', { fontSize: 13, fontWeight: '900', fill: on ? cols.accent : '#ff6578' });
          state.x = 100;
          state.y = 44;
          card.addChild(state);
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
    store.set('customGameplayMode', this.gameplayMode);
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
