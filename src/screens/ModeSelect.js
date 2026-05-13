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
    const title = this.mode === 'story' ? 'Story Mode' : 'Local 1v1';
    this.pixiContainer = PixiPremiumScene.root(title, 'Select your side', {
      footerHint: 'Choose a side to begin',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);
    this._cards = [];
    this.buildSideCards();

    const btnY = Layout.isPortrait ? Layout.H - Layout.SAFE_BOTTOM - 48 : 718;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Home', () => {
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

    const portrait = Layout.isPortrait;
    const cardW = portrait ? 620 : 500;
    const cardH = portrait ? 80 : 72;
    const gap = portrait ? 16 : 12;
    const totalH = sides.length * cardH + (sides.length - 1) * gap;
    const panelPad = 24;
    const panelW = cardW + panelPad * 2;
    const panelH = totalH + panelPad * 2;
    const panelX = (Layout.W - panelW) / 2;
    const panelY = portrait ? 180 : 200;

    PixiPremiumScene.panel(this.pixiContainer, panelX, panelY, panelW, panelH, { accentAlpha: 0.45 });

    const cardX = (Layout.W - cardW) / 2;
    const startY = panelY + panelPad;

    sides.forEach((side, i) => {
      const cardY = startY + i * (cardH + gap);
      const card = PixiPremiumScene.card(this.pixiContainer, cardX, cardY, cardW, cardH, {
        active: i === this.selectedButton,
        alpha: 0.82,
        onClick: () => this.startGame(side.action),
        draw: (c) => {
          const cols = ThemeManager.getCurrentColors();
          const iconColor = side.iconColor === 'light' ? cols.lightPiece
            : side.iconColor === 'dark' ? cols.darkPiece
            : cols.accent;
          const iconSprite = PixiIconCache.createSprite(side.icon, 40, cols, { color: iconColor });
          iconSprite.x = 20;
          iconSprite.y = (cardH - 40) / 2;
          c.addChild(iconSprite);

          const t = PixiPremiumScene.text(side.title, {
            fontSize: 22,
            fontWeight: '900',
            fill: cols.text,
          });
          t.x = 76;
          t.y = cardH / 2 - 14;
          PixiPremiumScene.fit(t, cardW - 100);
          c.addChild(t);

          const sub = PixiPremiumScene.text(side.subtitle, {
            fontSize: 14,
            fontWeight: '600',
            fill: PixiPremiumScene.alpha(cols.text, '77'),
          });
          sub.x = 76;
          sub.y = cardH / 2 + 10;
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
