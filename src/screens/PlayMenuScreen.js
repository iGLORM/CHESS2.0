// "Play" on the home screen: every way to play a game outside the story.
const PlayMenuScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  _cards: [],
  _focus: null,

  OPTIONS: [
    { title: 'Classic', sub: 'Play the Stockfish bot', detail: '13 strengths, about 250 to 3000 Elo', action: 'classic',
      art: [{ type: 'king', color: 'black', scale: 0.92 }] },
    { title: 'Local 1v1', sub: 'Two players, one screen', detail: 'Captures start a mini-game duel', action: '1v1',
      art: [{ type: 'knight', color: 'white', dx: -0.2, scale: 0.8, flip: true }, { type: 'knight', color: 'black', dx: 0.2, scale: 0.8 }] },
    { title: 'Custom', sub: 'Bot with capture mini-games', detail: 'Pick strength, side and games', action: 'custom',
      art: [{ type: 'queen', color: 'white', scale: 0.92 }] },
  ],

  LAYOUT: { TOP: 170, GAP: 28, GAP_PORTRAIT: 20, SIDE: 72, TILE_W: 360, TILE_H: 400, TILE_H_PORTRAIT: 200 },

  init() {
    this.build();
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Play', 'Choose how to play', {
      footerHint: 'Arrow keys to choose, Enter to start',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const L = this.LAYOUT;
    const portrait = Layout.isPortrait;
    const s = Layout.uiScale || 1;
    const n = this.OPTIONS.length;
    const perRow = portrait ? 1 : n;
    const gap = portrait ? L.GAP_PORTRAIT : L.GAP;
    const room = PixiPremiumScene.contentBottom - L.TOP;
    const tileW = portrait ? Layout.W - L.SIDE : Math.min(L.TILE_W, Math.floor((Layout.W - L.SIDE * 2 - gap * (n - 1)) / n));
    const tileH = portrait
      ? Math.round(Math.min(L.TILE_H_PORTRAIT * s, (room - gap * (n - 1)) / n))
      : Math.min(L.TILE_H, room - 20);
    const rows = Math.ceil(n / perRow);
    const blockH = rows * tileH + (rows - 1) * gap;
    const y0 = Math.round(L.TOP + Math.max(0, (room - blockH) / 2));
    const x0 = Math.round((Layout.W - (perRow * tileW + (perRow - 1) * gap)) / 2);

    this._cards = this.OPTIONS.map((opt, i) => PixiPremiumScene.tile(this.pixiContainer,
      x0 + (i % perRow) * (tileW + gap), y0 + Math.floor(i / perRow) * (tileH + gap), tileW, tileH, {
        title: opt.title, sub: opt.sub,
        detail: opt.detail,
        art: PixiPremiumScene.pieceArt(opt.art),
        artShare: 0.52,
        onClick: () => this.handleAction(opt.action),
      }));
    this._focus = PixiPremiumScene.focusRing(this._cards, perRow);

    PixiPremiumScene.button(this.pixiContainer, 36, PixiPremiumScene.bottomButtonY(), 160, 44, 'Back', () => this.handleAction('back'), { icon: 'back' });
  },

  handleAction(action) {
    switch (action) {
      case 'classic': switchScreen('botSelect'); break;
      case '1v1':
        store.update({ mode: '1v1', miniGamesEnabled: true, p1IsWhite: true });
        switchScreen('game', { mode: '1v1' });
        break;
      case 'custom': switchScreen('customGame'); break;
      case 'back':
        if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
        switchScreen('home');
        break;
    }
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  destroy() {
    this._cards = [];
    this._focus = null;
    PixiPremiumScene.destroy(this);
  },

  handleKeyDown(e) {
    const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (keys[e.key] && this._focus) {
      e.preventDefault();
      this._focus.move(...keys[e.key]);
    } else if ((e.key === 'Enter' || e.key === ' ') && this._focus) {
      e.preventDefault();
      this._focus.press();
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      this.handleAction('back');
    }
  },
};
