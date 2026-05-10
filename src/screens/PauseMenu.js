const PauseMenu = {
  visible: false,
  resumeCallback: null,
  fadeTimer: 0,
  fadingOut: false,
  hoveredBtn: null,
  confirmSurrender: false,

  show(callback) {
    this.visible = true;
    this.fadeTimer = 0;
    this.fadingOut = false;
    this.confirmSurrender = false;
    this.resumeCallback = callback;
  },

  hide() {
    this.fadingOut = true;
    this.fadeTimer = 1;
  },

  render(ctx, dt) {
    if (!this.visible) return;
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;
    const W = Layout.W;
    const H = Layout.H;
    const cx = Layout.cx;
    const cy = Layout.cy;
    const portrait = Layout.isPortrait;

    if (this.fadingOut) {
      this.fadeTimer -= dt * 4;
      if (this.fadeTimer <= 0) {
        this.visible = false;
        this.fadingOut = false;
        if (this.resumeCallback) this.resumeCallback();
        return;
      }
    } else {
      this.fadeTimer = Math.min(1, this.fadeTimer + dt * 4);
    }

    ctx.globalAlpha = this.fadeTimer;

    // Confirm surrender dialog
    if (this.confirmSurrender) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);

      const cDialogW = portrait ? 500 : 400;
      const cDialogH = 180;
      const cDialogX = cx - cDialogW / 2;
      const cDialogY = cy - cDialogH / 2;

      UIHelpers.drawPanel(ctx, cDialogX, cDialogY, cDialogW, cDialogH, cols);
      UIHelpers.drawIcon(ctx, cx - 4, cDialogY + 25, 'skull', 10, cols, { color: '#ff4444' });

      ctx.fillStyle = cols.text;
      ctx.font = 'bold 22px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Surrender?', cx, cDialogY + 50);
      ctx.fillStyle = cols.text + '88';
      ctx.font = '14px "Pixelify Sans", sans-serif';
      ctx.fillText('You will lose this game.', cx, cDialogY + 80);

      const cBtnW = portrait ? 180 : 140;
      const cBtnH = portrait ? 48 : 40;
      const cBtnGap = portrait ? 40 : 20;
      const cBtnY = cDialogY + 120;
      const yesX = cx - cBtnW - cBtnGap / 2;
      const noX = cx + cBtnGap / 2;

      const isHoverYes = this.hoveredBtn === 'surrender-yes';
      const isHoverNo = this.hoveredBtn === 'surrender-no';
      UIHelpers.drawButton(ctx, yesX, cBtnY, cBtnW, cBtnH, 'Yes', cols, { font: 'bold 13px "Pixelify Sans", sans-serif', hover: isHoverYes });
      UIHelpers.drawButton(ctx, noX, cBtnY, cBtnW, cBtnH, 'Cancel', cols, { font: 'bold 13px "Pixelify Sans", sans-serif', hover: isHoverNo });

      // Store confirm bounds for hit testing
      this._confirmYesBounds = { x: yesX, y: cBtnY, w: cBtnW, h: cBtnH };
      this._confirmNoBounds = { x: noX, y: cBtnY, w: cBtnW, h: cBtnH };

      ctx.globalAlpha = 1;
      return;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    const modalW = portrait ? 600 : 500;
    const modalH = portrait ? 600 : 480;
    const modalX = cx - modalW / 2;
    const modalY = cy - modalH / 2;

    UIHelpers.drawPanel(ctx, modalX, modalY, modalW, modalH, cols, { accentTop: true });

    UIHelpers.drawIcon(ctx, cx - 4, modalY + 40, 'gear', 12, cols);
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 32px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', cx, modalY + 70);

    UIHelpers.drawSeparator(ctx, modalX + 30, modalY + 88, modalW - 60, cols);

    const moveCount = (typeof GameScreen !== 'undefined' && GameScreen.moveHistory) ? GameScreen.moveHistory.length : 0;
    ctx.fillStyle = cols.text + '55';
    ctx.font = '12px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Move ' + moveCount, cx, modalY + 108);

    const btnW = portrait ? 300 : 200;
    const btnH = portrait ? 56 : 45;
    const btnGap = portrait ? 18 : 10;
    const btnX = cx - btnW / 2;
    const firstBtnY = modalY + 130;

    const buttons = [
      { text: 'Resume', action: 'resume', y: firstBtnY },
      { text: 'Settings', action: 'settings', y: firstBtnY + (btnH + btnGap) },
      { text: 'Surrender', action: 'surrender', y: firstBtnY + (btnH + btnGap) * 2 },
      { text: 'Quit to Menu', action: 'quit', y: firstBtnY + (btnH + btnGap) * 3 },
    ];

    for (const btn of buttons) {
      const isHover = this.hoveredBtn === btn.action;
      UIHelpers.drawButton(ctx, btnX, btn.y, btnW, btnH, btn.text, cols, { font: 'bold 16px "Pixelify Sans", sans-serif', hover: isHover });
      btn._bounds = { x: btnX, y: btn.y, w: btnW, h: btnH };
    }

    // Store button layout for hit testing
    this._btnLayout = { x: btnX, w: btnW, h: btnH, gap: btnGap, firstY: firstBtnY };

    ctx.globalAlpha = 1;
  },

  _inBounds(x, y, b) {
    return b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  },

  handleMouseMove(x, y) {
    if (!this.visible) return;
    this.hoveredBtn = null;
    const canvas = document.getElementById('gameCanvas');

    if (this.confirmSurrender) {
      if (this._inBounds(x, y, this._confirmYesBounds)) this.hoveredBtn = 'surrender-yes';
      else if (this._inBounds(x, y, this._confirmNoBounds)) this.hoveredBtn = 'surrender-no';
      canvas.style.cursor = this.hoveredBtn ? 'pointer' : 'default';
      return;
    }

    const bl = this._btnLayout;
    if (!bl) return;
    const actions = ['resume', 'settings', 'surrender', 'quit'];
    for (let i = 0; i < actions.length; i++) {
      const btnY = bl.firstY + (bl.h + bl.gap) * i;
      if (x >= bl.x && x <= bl.x + bl.w && y >= btnY && y <= btnY + bl.h) {
        this.hoveredBtn = actions[i];
        canvas.style.cursor = 'pointer';
        return;
      }
    }
    canvas.style.cursor = 'default';
  },

  handleClick(x, y) {
    if (!this.visible || this.fadingOut) return 'ignore';

    // Confirm surrender dialog
    if (this.confirmSurrender) {
      if (this._inBounds(x, y, this._confirmYesBounds)) {
        if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
        this.confirmSurrender = false;
        this.hide();
        GameScreen.surrender();
        return;
      }
      if (this._inBounds(x, y, this._confirmNoBounds)) {
        if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
        this.confirmSurrender = false;
        return;
      }
      return;
    }

    const bl = this._btnLayout;
    if (!bl) return;
    const actions = ['resume', 'settings', 'surrender', 'quit'];
    for (let i = 0; i < actions.length; i++) {
      const btnY = bl.firstY + (bl.h + bl.gap) * i;
      if (x >= bl.x && x <= bl.x + bl.w && y >= btnY && y <= btnY + bl.h) {
        if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
        const action = actions[i];
        if (action === 'resume') this.hide();
        else if (action === 'settings') { this.hide(); switchScreen('settings'); }
        else if (action === 'surrender') { this.confirmSurrender = true; }
        else if (action === 'quit') {
          this.hide();
          if (GameScreen.gameStatus === 'playing' || GameScreen.gameStatus === 'check') {
            GameScreen.gameOver = true;
            GameScreen.gameResult = GameScreen.turn === 'white' ? 'black' : 'white';
            GameScreen.handleGameEnd();
          }
          switchScreen('home');
        }
        return;
      }
    }
  },
};
