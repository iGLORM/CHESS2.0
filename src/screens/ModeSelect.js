const ModeSelect = {
  isPixiScreen: true,
  pixiContainer: null,
  mode: 'story',
  selectedButton: 0,
  _cards: [],

  init(data) {
    this.mode = data || 'story';
    this.selectedButton = 0;
    this._cards = [];
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
    const s = Layout.uiScale || 1;
    const title = this.mode === 'story' ? 'Story Mode' : 'Local 1v1';
    this.pixiContainer = PixiPremiumScene.root(title, 'Select your side', {
      footerHint: 'Choose a side to begin',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);
    this._cards = [];
    this.buildSideCards();

    const btnY = Layout.isPortrait ? Layout.H - Layout.SAFE_BOTTOM - 48 : 718;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, Math.round(160 * s), 44, 'Home', () => {
      if (typeof audioManager !== 'undefined' && audioManager.playButton) audioManager.playButton();
      switchScreen('home');
    }, { icon: 'back' });
  },

  buildSideCards() {
    const sides = [
      { action: 'white', title: 'Play as White', subtitle: 'First move advantage', icon: 'king', iconColor: 'light' },
      { action: 'black', title: 'Play as Black', subtitle: 'Defensive strategy', icon: 'queen', iconColor: 'dark' },
      { action: 'random', title: 'Random', subtitle: 'Leave it to fate', icon: 'dice', iconColor: 'accent' },
    ];

    const s = Layout.uiScale || 1;
    const portrait = Layout.isPortrait;
    const cardW = portrait ? Math.round(620 * s) : 500;
    const cardH = Math.round(76 * s);
    const gap = Math.round(14 * s);
    const iconSize = Math.round(40 * s);
    const totalH = sides.length * cardH + (sides.length - 1) * gap;
    const panelPad = 24;
    const panelW = Math.min(cardW + panelPad * 2, Layout.W - 80);
    const panelH = totalH + panelPad * 2;
    const panelX = (Layout.W - panelW) / 2;
    const panelY = portrait ? 180 : 200;
    const effectiveCardW = panelW - panelPad * 2;

    PixiPremiumScene.panel(this.pixiContainer, panelX, panelY, panelW, panelH, { accentAlpha: 0.45 });

    const cardX = (Layout.W - effectiveCardW) / 2;
    const startY = panelY + panelPad;

    sides.forEach((side, i) => {
      const cardY = startY + i * (cardH + gap);
      const card = PixiPremiumScene.card(this.pixiContainer, cardX, cardY, effectiveCardW, cardH, {
        active: i === this.selectedButton,
        alpha: 0.68,
        onClick: () => this.startGame(side.action),
        draw: (c) => {
          const cols = ThemeManager.getCurrentColors();
          const iconColor = side.iconColor === 'light' ? cols.lightPiece
            : side.iconColor === 'dark' ? cols.darkPiece
            : cols.accent;
          const iconSprite = PixiIconCache.createSprite(side.icon, iconSize, cols, { color: iconColor });
          iconSprite.x = 20;
          iconSprite.y = (cardH - iconSize) / 2;
          c.addChild(iconSprite);

          const textX = 20 + iconSize + 16;
          const t = PixiPremiumScene.text(side.title, {
            fontSize: Math.round(22 * s),
            fontWeight: '900',
            fill: cols.text,
          });
          t.x = textX;
          t.y = cardH * 0.28;
          PixiPremiumScene.fit(t, effectiveCardW - textX - 20);
          c.addChild(t);

          const sub = PixiPremiumScene.text(side.subtitle, {
            fontSize: Math.round(16 * s),
            fontWeight: '600',
            fill: PixiPremiumScene.alpha(cols.text, '77'),
          });
          sub.x = textX;
          sub.y = cardH * 0.60;
          c.addChild(sub);
        },
      });
      this._cards.push(card);
    });
  },

  startGame(sideAction) {
    let p1IsWhite = true;
    if (sideAction === 'black') p1IsWhite = false;
    else if (sideAction === 'random') p1IsWhite = Math.random() > 0.5;

    store.set('p1IsWhite', p1IsWhite);
    store.set('mode', this.mode);
    if (this.mode === '1v1') {
      store.set('whitePlayer', p1IsWhite ? 'Player 1' : 'Player 2');
      store.set('blackPlayer', p1IsWhite ? 'Player 2' : 'Player 1');
    }
    switchScreen('game');
  },

  handleKeyDown(e) {
    const sideActions = ['white', 'black', 'random'];
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const dir = e.key === 'ArrowUp' ? -1 : 1;
      this.selectedButton = (this.selectedButton + dir + sideActions.length) % sideActions.length;
      this.build();
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.selectedButton >= 0) {
        this.startGame(sideActions[this.selectedButton]);
      }
    }
    if (e.key === 'Escape') {
      switchScreen('home');
    }
  },
};
