const PixiGameOverOverlay = {
  container: null,
  initialized: false,
  _lastKey: null,
  _game: null,

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
    const crownColor = game.gameResult === 'black' ? 0x8f7cff : 0xffdc65;
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
      const dialogue = game.gameResult === 'white'
        ? game.currentCharacter.dialogue.after
        : game.currentCharacter.dialogue.win;
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
      c.addChild(text);
      buttonY = panelY + Math.min(panelH - 92, 170 + text.height);
    }

    const actions = [
      { text: 'Play Again', action: 'rematch', x: Layout.cx - 250, y: buttonY, width: 156 },
      { text: 'Main Menu', action: 'menu', x: Layout.cx - 78, y: buttonY, width: 156 },
      { text: 'Themes', action: 'themes', x: Layout.cx + 94, y: buttonY, width: 156 },
    ];
    if (game.mode === 'story' && game.gameResult === 'white') {
      actions.push({ text: 'Next Level', action: 'next', x: Layout.cx - 88, y: buttonY + 58, width: 176 });
    }

    for (const item of actions) {
      const btn = new PixiButton({
        width: item.width,
        height: 42,
        text: item.text,
        cols,
        fontSize: 15,
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
    if (game.gameResult === 'white') return 'White Wins!';
    if (game.gameResult === 'black') return 'Black Wins!';
    return 'Draw!';
  },

  _reason(game) {
    if (game.gameStatus === 'checkmate') return 'by Checkmate';
    if (game.gameStatus === 'stalemate') return 'by Stalemate';
    if (game.gameStatus === 'draw') return 'by Draw';
    if (game.gameStatus === 'resigned') return 'by Resignation';
    return 'Game Over';
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
  },
};
