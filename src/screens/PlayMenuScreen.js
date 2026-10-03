// "Play" on the home screen: every way to play a normal game, plus the Great Board
// once the story is finished.
const PlayMenuScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  _cards: [],
  _focus: null,

  OPTIONS: [
    { title: 'Classic', sub: 'Play the Stockfish engine', detail: 'Pick a strength from 200 to 2000', action: 'classic',
      art: [{ type: 'king', color: 'black', scale: 0.92 }] },
    { title: 'Local 1v1', sub: 'Two players, one screen', detail: 'Capture mini-games on', action: '1v1',
      art: [{ type: 'knight', color: 'white', dx: -0.2, scale: 0.8, flip: true }, { type: 'knight', color: 'black', dx: 0.2, scale: 0.8 }] },
    { title: 'Custom', sub: 'Set your own rules', detail: 'Mini-games, AI and more', action: 'custom',
      art: [{ type: 'queen', color: 'white', scale: 0.92 }] },
    { title: 'Great Board', sub: 'Four worlds, one board', detail: 'Guardian rules on every quarter', action: 'greatboard',
      locked: 'Finish the story to unlock',
      art: [{ type: 'rook', color: 'black', dx: -0.22, scale: 0.7 }, { type: 'king', color: 'white', dx: 0.16, scale: 0.9 }] },
  ],

  init() {
    this.build();
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Play', 'Choose how to play', {
      footerHint: 'Arrow keys to choose, Enter to start',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const portrait = Layout.isPortrait;
    const s = Layout.uiScale || 1;
    const perRow = portrait ? 1 : this.OPTIONS.length;
    const gap = portrait ? 20 : 24;
    const top = 170;
    const tileW = portrait ? Layout.W - 72 : Math.min(330, Math.floor((Layout.W - 72 - gap * (perRow - 1)) / perRow));
    const tileH = portrait ? Math.round(Math.min(178 * s, (PixiPremiumScene.contentBottom - top - gap * 3) / 4)) : Math.min(380, PixiPremiumScene.contentBottom - top - 20);
    const rows = Math.ceil(this.OPTIONS.length / perRow);
    const blockH = rows * tileH + (rows - 1) * gap;
    const y0 = Math.round(top + Math.max(0, (PixiPremiumScene.contentBottom - top - blockH) / 2));
    const x0 = Math.round((Layout.W - (perRow * tileW + (perRow - 1) * gap)) / 2);

    this._cards = this.OPTIONS.map((opt, i) => PixiPremiumScene.tile(this.pixiContainer,
      x0 + (i % perRow) * (tileW + gap), y0 + Math.floor(i / perRow) * (tileH + gap), tileW, tileH, {
        title: opt.title, sub: opt.sub,
        detail: opt.locked && !this._unlocked(opt) ? opt.locked : opt.detail,
        art: PixiPremiumScene.pieceArt(opt.art),
        artShare: 0.52,
        onClick: () => this.handleAction(opt.action),
      }));
    this._focus = PixiPremiumScene.focusRing(this._cards, perRow);

    PixiPremiumScene.button(this.pixiContainer, 36, PixiPremiumScene.bottomButtonY(), 160, 44, 'Back', () => this.handleAction('back'), { icon: 'back' });
  },

  _unlocked(opt) {
    return opt.action !== 'greatboard' || GreatBoard.unlocked();
  },

  handleAction(action) {
    switch (action) {
      case 'greatboard':
        if (!GreatBoard.unlocked()) { if (audioManager.playTileLock) audioManager.playTileLock(); break; }
        switchScreen('greatBoard');
        break;
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
