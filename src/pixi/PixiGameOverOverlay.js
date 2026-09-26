const PixiGameOverOverlay = {
  container: null,
  initialized: false,
  _lastKey: null,
  _game: null,
  // Button rectangles in game coordinates. Clicks land on the Canvas 2D layer
  // above Pixi, so GameScreen routes them here.
  buttonRects: null,

  init(game) {
    if (!PixiApp.stage) return;
    this.destroy();
    this._game = game;
    this.container = new PIXI.Container();
    this.container.label = 'gameOverOverlay';
    this.container.zIndex = 900;
    this.container.visible = false;
    this.container.alpha = 0;
    this.container.eventMode = 'static';
    this.container.hitArea = new PIXI.Rectangle(0, 0, Layout.W, Layout.H);
    PixiApp.stage.addChild(this.container);
    PixiApp.stage.sortableChildren = true;
    this.initialized = true;
  },

  update(game) {
    if (!this.initialized || !this.container) this.init(game);
    if (!this.container) return;

    if (!game.gameOver) {
      this.hide();
      return;
    }

    this._game = game;
    const key = this._makeKey(game);
    if (key !== this._lastKey) {
      this._lastKey = key;
      this._build(game);
    }
    this.show();
  },

  show() {
    if (!this.container || this.container.visible) return;
    this.container.visible = true;
    this.container.alpha = 0;
    if (typeof gsap !== 'undefined') {
      gsap.to(this.container, { alpha: 1, duration: 0.22, ease: 'power2.out' });
    } else {
      this.container.alpha = 1;
    }
  },

  hide() {
    if (!this.container || !this.container.visible) return;
    this.container.visible = false;
    this.container.alpha = 0;
    this._lastKey = null;
    this.buttonRects = null;
  },

  _makeKey(game) {
    return [
      store.get('theme'),
      game.gameResult,
      game.gameStatus,
      game.mode,
      game.currentCharacter ? game.currentCharacter.id : '',
    ].join('|');
  },

  _build(game) {
    const c = this.container;
    c.removeChildren();

    const cols = ThemeManager.getCurrentColors();
    const shade = new PIXI.Graphics();
    shade.rect(0, 0, Layout.W, Layout.H).fill({ color: 0x000000, alpha: 0.68 });
    c.addChild(shade);

    const panelW = 560;
    const panelH = game.currentCharacter ? 382 : 316;
    const panelX = Layout.cx - panelW / 2;
    const panelY = Layout.cy - panelH / 2;
    const panel = new PixiPanel({
      width: panelW,
      height: panelH,
      cols,
      fill: cols.panel,
      accentTop: true,
      active: true,
    });
    panel.x = panelX;
    panel.y = panelY;
    c.addChild(panel);

    const crown = new PIXI.Graphics();
    const crownColor = (game.isAIMode ? !game.playerWon() : game.gameResult === 'black') ? 0x8f7cff : 0xffdc65;
    crown.rect(0, 18, 58, 12)
      .rect(7, 6, 10, 20)
      .rect(24, 0, 10, 26)
      .rect(41, 8, 10, 18)
      .fill({ color: crownColor, alpha: game.gameResult === 'draw' ? 0.35 : 0.92 });
    crown.x = Layout.cx - 29;
    crown.y = panelY + 38;
    c.addChild(crown);

    const title = PixiPremiumUI.title(this._title(game), cols, 34);
    title.anchor.set(0.5, 0);
    title.x = Layout.cx;
    title.y = panelY + 82;
    PixiPremiumUI.fitText(title, panelW - 80);
    c.addChild(title);

    const reason = PixiPremiumUI.text(this._reason(game), {
      fontSize: 16,
      fontWeight: '700',
      fill: PixiColorUtil.alpha(cols.text, 'aa'),
    });
    reason.anchor.set(0.5, 0);
    reason.x = Layout.cx;
    reason.y = panelY + 126;
    PixiPremiumUI.fitText(reason, panelW - 100);
    c.addChild(reason);

    let buttonY = panelY + 166;
    if (game.currentCharacter && game.gameResult) {
      const lines = game.currentCharacter.dialogue;
      const dialogue = game.gameResult === 'draw' ? (lines.draw || 'A draw. Neither of us gave an inch. Again?')
        : game.playerWon() ? lines.after
        : (game.gameStatus === 'timeout' && lines.timeout) || lines.win;
      const text = PixiPremiumUI.text(dialogue || '', {
        fontSize: 15,
        fontWeight: '600',
        fill: PixiColorUtil.alpha(cols.text, 'bb'),
        wordWrap: true,
        wordWrapWidth: panelW - 86,
        lineHeight: 20,
      });
      text.x = panelX + 43;
      text.y = panelY + 154;
      const maxTextH = 80;
      if (text.height > maxTextH) {
        const mask = new PIXI.Graphics();
        mask.rect(text.x, text.y, panelW - 86, maxTextH).fill(0xffffff);
        c.addChild(mask);
        text.mask = mask;
      }
      c.addChild(text);
      buttonY = panelY + 158 + Math.min(text.height, maxTextH) + 12;
    }

    // Story games lead back to the world map (which plays the reward after a win).
    const story = game.mode === 'story';
    const labels = !story ? [['Play Again', 'rematch'], ['Main Menu', 'menu']]
      : game.playerWon() ? [['Continue', 'map'], ['Play Again', 'rematch']]
        : [['Try Again', 'rematch'], ['Back to Map', 'map']];
    const actions = labels.map(([text, action], i) => ({ text, action, x: Layout.cx + (i === 0 ? -214 : 14), y: buttonY, width: 200 }));
    this.buttonRects = actions.map(a => ({ action: a.action, x: a.x, y: a.y, w: a.width, h: 56 }));

    for (const item of actions) {
      const btn = new PixiButton({
        width: item.width,
        height: 56,
        text: item.text,
        cols,
        fontSize: 18,
      });
      btn.x = item.x;
      btn.y = item.y;
      btn.onClick(() => {
        if (this._game && this._game.handleGameOverAction) {
          this._game.handleGameOverAction(item.action);
        }
      });
      c.addChild(btn);
    }
  },

  _title(game) {
    return game.resultTitle();
  },

  _reason(game) {
    return game.resultReason();
  },

  destroy() {
    if (this.container) {
      if (typeof gsap !== 'undefined') gsap.killTweensOf(this.container);
      this.container.destroy({ children: true });
      this.container = null;
    }
    this.initialized = false;
    this._lastKey = null;
    this._game = null;
    this.buttonRects = null;
  },
};
