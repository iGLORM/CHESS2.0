const MiniGamePractice = {
  isPixiScreen: true,
  pixiContainer: null,

  gameDescriptions: {
    quickClick: 'Click the target as fast as you can.',
    memoryMatch: 'Match pairs of hidden symbols.',
    timingStrike: 'Hit at the perfect moment.',
    patternPress: 'Repeat the flashing pattern.',
    reactionTest: 'React when the signal appears.',
    undertaleDodge: 'Dodge bullets to survive.',
    powerMeter: 'Stop the meter at max power.',
    targetPractice: 'Hit moving targets precisely.',
    dodgeFalling: 'Dodge falling blocks.',
    rhythmTap: 'Tap to the beat.',
    numberGuess: 'Guess the secret number.',
    coinFlip: 'Call the coin flip.',
    barBalance: 'Keep the bar balanced.',
    shieldBlock: 'Block incoming arrows.',
    whackMole: 'Hit targets before they hide.',
  },

  init() {
    this.games = [
      { name: 'Quick Click', key: 'quickClick', type: QuickClick },
      { name: 'Memory Match', key: 'memoryMatch', type: MemoryMatch },
      { name: 'Timing Strike', key: 'timingStrike', type: TimingStrike },
      { name: 'Pattern Press', key: 'patternPress', type: PatternPress },
      { name: 'Reaction Test', key: 'reactionTest', type: ReactionTest },
      { name: 'Soul Dodge', key: 'undertaleDodge', type: UndertaleDodge },
      { name: 'Power Meter', key: 'powerMeter', type: PowerMeter },
      { name: 'Target Practice', key: 'targetPractice', type: TargetPractice },
      { name: 'Dodge Falling', key: 'dodgeFalling', type: DodgeFalling },
      { name: 'Rhythm Tap', key: 'rhythmTap', type: RhythmTap },
      { name: 'Number Guess', key: 'numberGuess', type: NumberGuess },
      { name: 'Coin Flip', key: 'coinFlip', type: CoinFlip },
      { name: 'Bar Balance', key: 'barBalance', type: BarBalance },
      { name: 'Shield Block', key: 'shieldBlock', type: ShieldBlock },
      { name: 'Whack-a-Mole', key: 'whackMole', type: WhackMole },
    ];
    this.build();
  },

  destroy() {
    PixiPremiumScene.destroy(this);
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Mini-Game Practice', 'Pick a mini-game to practise', { footerHint: 'These are the games that decide contested captures' });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const s = Layout.uiScale || 1;
    const portrait = Layout.isPortrait;
    const gridCols = portrait ? 3 : 5;
    const gap = 18;
    const gridRows = Math.ceil(this.games.length / gridCols);
    const cardW = Math.floor((Layout.W - 80 - (gridCols - 1) * gap) / gridCols);
    const cardH = Math.round(150 * s);
    const rowH = cardH + 20;
    const panelX = portrait ? 32 : 54;
    const panelW = portrait ? (Layout.W - 64) : 1172;
    const panelH = gridRows * rowH + 50;
    PixiPremiumScene.panel(this.pixiContainer, panelX, 126, panelW, panelH, { accentAlpha: 0.36 });
    this.games.forEach((game, i) => this.card(game, i, { gridCols, gap, cardW, cardH, rowH, s }));
    const btnY = Layout.H - 82;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen('settings'), { icon: 'back' });
  },

  card(game, i, opts) {
    const cols = ThemeManager.getCurrentColors();
    const portrait = Layout.isPortrait;
    const { gridCols, gap, cardW, cardH, rowH, s } = opts;
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    const gridX = Math.round((Layout.W - gridCols * cardW - (gridCols - 1) * gap) / 2);
    const x = gridX + col * (cardW + gap);
    const y = 154 + row * rowH;
    const thumbW = cardW - 28;
    const thumbH = Math.round(thumbW * 0.5);
    const titleY = thumbH + 26;
    const playSize = Math.round(34 * s);
    const descY = titleY + Math.round(22 * s);
    PixiPremiumScene.card(this.pixiContainer, x, y, cardW, cardH, {
      activeColor: cols.accent,
      onClick: () => this.startGame(game.type),
      draw: (card) => {
        const thumb = new PIXI.Sprite(PixiPremiumAssets.minigame(game.key));
        thumb.width = thumbW;
        thumb.height = thumbH;
        thumb.x = 14;
        thumb.y = 14;
        card.addChild(thumb);

        const title = PixiPremiumScene.text(game.name, { fontSize: Math.round(17 * s), fontWeight: '900', fill: cols.text });
        title.x = 16;
        title.y = titleY;
        PixiPremiumScene.fit(title, cardW - playSize - 48, 0.54);
        card.addChild(title);

        const play = new PIXI.Sprite(PixiPremiumAssets.icon('play'));
        play.width = playSize;
        play.height = playSize;
        play.x = cardW - playSize - 16;
        play.y = titleY - 4;
        card.addChild(play);

        const desc = PixiPremiumScene.text(this.gameDescriptions[game.key] || 'Practice this challenge.', {
          fontSize: Math.round(12 * s),
          fill: PixiPremiumScene.alpha(cols.text, '88'),
        });
        desc.x = 16;
        desc.y = descY;
        PixiPremiumScene.fit(desc, cardW - 32, 0.45);
        card.addChild(desc);
      },
    });
  },

  startGame(gameType) {
    if (typeof miniGameManager !== 'undefined') {
      miniGameManager.startPracticeMiniGame(gameType, () => {});
    }
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') switchScreen('settings');
  },
};
