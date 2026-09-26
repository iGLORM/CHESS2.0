const MiniGamePractice = {
  isPixiScreen: true,
  pixiContainer: null,

  gameDescriptions: {
    checkmateRun: 'Dodge the charging army.',
    lavaTilt: 'Tilt the board to the gold square.',
    rookStack: 'Stack slabs into a tower.',
    siegeCannon: 'Blast the army off its island.',
    meteorStorm: 'Shoot down falling pieces.',
    knightCollapse: 'Hop like a knight, grab crowns.',
    memoryMatch: 'Open the lids, find the pairs.',
    timingStrike: 'Hammer the enemy in the zone.',
    patternPress: 'Repeat the singing pieces.',
    reactionTest: 'Draw faster at high noon.',
    undertaleDodge: 'Survive the bullet storm.',
    powerMeter: 'Swing at the peak, ring the bell.',
    targetPractice: 'Shoot enemies, spare friends.',
    dodgeFalling: 'Dodge pieces falling from the sky.',
    rhythmTap: 'Tap the lanes on the beat.',
    barBalance: 'Balance across the canyon.',
    shieldBlock: 'Turn your shield to block.',
    whackMole: 'Flatten the pop-up enemies.',
  },

  init() {
    this.games = typeof Mini3D !== 'undefined' && Mini3D.available() ? [
      { name: 'Checkmate Run', key: 'checkmateRun', type: CheckmateRun },
      { name: 'Lava Tilt', key: 'lavaTilt', type: LavaTilt },
      { name: 'Rook Stack', key: 'rookStack', type: RookStack },
      { name: 'Siege Cannon', key: 'siegeCannon', type: SiegeCannon },
      { name: 'Meteor Storm', key: 'meteorStorm', type: MeteorStorm },
      { name: 'Knight Collapse', key: 'knightCollapse', type: KnightCollapse },
      { name: 'Memory Match', key: 'memoryMatch', type: MemoryMatch },
      { name: 'Timing Strike', key: 'timingStrike', type: TimingStrike },
      { name: 'Pattern Press', key: 'patternPress', type: PatternPress },
      { name: 'Quick Draw', key: 'reactionTest', type: ReactionTest },
      { name: 'Soul Dodge', key: 'undertaleDodge', type: UndertaleDodge },
      { name: 'High Striker', key: 'powerMeter', type: PowerMeter },
      { name: 'Crossbow Gallery', key: 'targetPractice', type: TargetPractice },
      { name: 'Falling Sky', key: 'dodgeFalling', type: DodgeFalling },
      { name: 'Rhythm Rush', key: 'rhythmTap', type: RhythmTap },
      { name: 'Tightrope', key: 'barBalance', type: BarBalance },
      { name: 'Shield Wall', key: 'shieldBlock', type: ShieldBlock },
      { name: 'Whack-a-Pawn', key: 'whackMole', type: WhackMole },
    ] : [];
    this.build();
  },

  destroy() {
    PixiPremiumScene.destroy(this);
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  LAYOUT: {
    PANEL_Y: 150,           // top of the panel, just under the header
    PANEL_MARGIN_X: 54,     // landscape gap between screen edge and panel
    PANEL_MARGIN_X_PORTRAIT: 32,
    PANEL_PAD_X: 22,        // panel edge to first/last card column
    PANEL_PAD_TOP: 34,      // clears the panel's accent strip
    PANEL_PAD_BOTTOM: 22,
    GAP_X: 16,
    GAP_Y: 14,
    MAX_CARD_H: 230,
    BACK_BTN_H: 44,
    CARD_PAD: 12,           // inner padding of a card
    THUMB_TOP: 14,
    THUMB_ASPECT: 1.8,      // thumbnails are drawn at 180x100
    TITLE_GAP: 8,           // thumbnail to title
    DESC_GAP: 4,            // title to description
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Mini-Game Practice', 'Pick a mini-game to practise', { footerHint: 'These are the games that decide contested captures' });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const L = this.LAYOUT;
    const s = Layout.uiScale || 1;
    const portrait = Layout.isPortrait;
    const gridCols = portrait ? 3 : 6;
    const gridRows = Math.ceil(this.games.length / gridCols);

    const btnY = PixiPremiumScene.bottomButtonY();
    const panelX = portrait ? L.PANEL_MARGIN_X_PORTRAIT : L.PANEL_MARGIN_X;
    const panelW = Layout.W - panelX * 2;
    const maxPanelH = PixiPremiumScene.contentBottom - L.PANEL_Y;

    const cardW = Math.floor((panelW - L.PANEL_PAD_X * 2 - (gridCols - 1) * L.GAP_X) / gridCols);
    const availGridH = maxPanelH - L.PANEL_PAD_TOP - L.PANEL_PAD_BOTTOM;
    const cardH = Math.min(L.MAX_CARD_H, Math.floor((availGridH - (gridRows - 1) * L.GAP_Y) / gridRows));
    const gridH = gridRows * cardH + (gridRows - 1) * L.GAP_Y;
    const panelH = gridH + L.PANEL_PAD_TOP + L.PANEL_PAD_BOTTOM;

    PixiPremiumScene.panel(this.pixiContainer, panelX, L.PANEL_Y, panelW, panelH, { accentAlpha: 0.36 });
    const gridW = gridCols * cardW + (gridCols - 1) * L.GAP_X;
    const gridX = panelX + Math.round((panelW - gridW) / 2);
    const gridY = L.PANEL_Y + L.PANEL_PAD_TOP;
    this.games.forEach((game, i) => {
      const x = gridX + (i % gridCols) * (cardW + L.GAP_X);
      const y = gridY + Math.floor(i / gridCols) * (cardH + L.GAP_Y);
      this.card(game, x, y, cardW, cardH, s);
    });

    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, L.BACK_BTN_H, 'Back', () => switchScreen('settings'), { icon: 'back' });
  },

  card(game, x, y, cardW, cardH, s) {
    const L = this.LAYOUT;
    const cols = ThemeManager.getCurrentColors();
    const titleSize = Math.round(17 * s);
    const descSize = Math.round(12 * s);
    const playSize = Math.round(28 * s);
    const innerW = cardW - L.CARD_PAD * 2;

    // Stack from the bottom: description, title row, then the thumbnail fills what is left.
    const descH = Math.ceil(descSize * 1.3);
    const titleRowH = Math.max(Math.ceil(titleSize * 1.3), playSize);
    const descY = cardH - L.CARD_PAD - descH;
    const titleRowY = descY - L.DESC_GAP - titleRowH;
    const thumbBoxH = titleRowY - L.TITLE_GAP - L.THUMB_TOP;
    const thumbW = Math.min(innerW, Math.floor(thumbBoxH * L.THUMB_ASPECT));
    const thumbH = Math.round(thumbW / L.THUMB_ASPECT);

    PixiPremiumScene.card(this.pixiContainer, x, y, cardW, cardH, {
      activeColor: cols.accent,
      accentStrip: false,
      onClick: () => this.startGame(game.type),
      draw: (card) => {
        const thumb = new PIXI.Sprite(PixiPremiumAssets.minigame(game.key));
        thumb.width = thumbW;
        thumb.height = thumbH;
        thumb.x = Math.round((cardW - thumbW) / 2);
        thumb.y = L.THUMB_TOP + Math.round((thumbBoxH - thumbH) / 2);
        card.addChild(thumb);

        const title = PixiPremiumScene.text(game.name, { fontSize: titleSize, fontWeight: '900', fill: cols.text });
        title.anchor.set(0, 0.5);
        title.x = L.CARD_PAD;
        title.y = titleRowY + titleRowH / 2;
        PixiPremiumScene.fit(title, innerW - playSize - 8, 0.6);
        card.addChild(title);

        const play = new PIXI.Sprite(PixiPremiumAssets.icon('play'));
        play.width = playSize;
        play.height = playSize;
        play.x = cardW - L.CARD_PAD - playSize;
        play.y = titleRowY + Math.round((titleRowH - playSize) / 2);
        card.addChild(play);

        const desc = PixiPremiumScene.text(this.gameDescriptions[game.key] || 'Practice this challenge.', {
          fontSize: descSize,
          fill: PixiPremiumScene.alpha(cols.text, '99'),
        });
        desc.x = L.CARD_PAD;
        desc.y = descY;
        PixiPremiumScene.fit(desc, innerW, 0.6);
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
