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
    this.pixiContainer = PixiPremiumScene.root('Mini-Game Practice', 'Pick a capture challenge and launch immediately', { footerHint: 'Practice runs use the same mini-game overlay and stats callbacks' });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const portrait = Layout.isPortrait;
    const gridCols = portrait ? 3 : 5;
    const gridRows = Math.ceil(this.games.length / gridCols);
    const panelX = portrait ? 32 : 54;
    const panelW = portrait ? (Layout.W - 64) : 1172;
    const panelH = portrait ? (gridRows * 170 + 50) : 568;
    PixiPremiumScene.panel(this.pixiContainer, panelX, 126, panelW, panelH, { accentAlpha: 0.36 });
    this.games.forEach((game, i) => this.card(game, i));
    const btnY = Layout.H - 82;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen('settings'), { icon: 'back' });
  },

  card(game, i) {
    const cols = ThemeManager.getCurrentColors();
    const portrait = Layout.isPortrait;
    const gridCols = portrait ? 3 : 5;
    const cardW = portrait ? Math.floor((Layout.W - 64 - 40 - (gridCols - 1) * 18) / gridCols) : 208;
    const cardH = 150;
    const gapX = portrait ? 18 : 18;
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    const x = (portrait ? 52 : 86) + col * (cardW + gapX);
    const y = 154 + row * 170;
    PixiPremiumScene.card(this.pixiContainer, x, y, cardW, cardH, {
      activeColor: cols.accent,
      onClick: () => this.startGame(game.type),
      draw: (card) => {
        const thumb = new PIXI.Sprite(PixiPremiumAssets.minigame(game.key));
        thumb.width = 180;
        thumb.height = 90;
        thumb.x = 14;
        thumb.y = 14;
        card.addChild(thumb);

        const title = PixiPremiumScene.text(game.name, { fontSize: 17, fontWeight: '900', fill: cols.text });
        title.x = 16;
        title.y = 112;
        PixiPremiumScene.fit(title, 118, 0.54);
        card.addChild(title);

        const play = new PIXI.Sprite(PixiPremiumAssets.icon('play'));
        play.width = 34;
        play.height = 34;
        play.x = 158;
        play.y = 106;
        card.addChild(play);

        const desc = PixiPremiumScene.text(this.gameDescriptions[game.key] || 'Practice this challenge.', {
          fontSize: 12,
          fill: PixiPremiumScene.alpha(cols.text, '88'),
        });
        desc.x = 16;
        desc.y = 132;
        PixiPremiumScene.fit(desc, 132, 0.45);
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
