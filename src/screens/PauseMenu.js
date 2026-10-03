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
    const s = Layout.uiScale || 1;
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

    ctx.save();
    ctx.globalAlpha = this.fadeTimer;

    if (this.confirmSurrender) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);

      const cDialogW = Math.min(Math.round((portrait ? 500 : 400) * s), W - 40);
      const cBtnW = Math.min(Math.round((portrait ? 180 : 140) * s), cDialogW - 60);
      const cBtnH = Math.round(48 * s);
      const cBtnGap = Math.round(12 * s);
      const cTitleFs = Math.round(22 * s);
      const cSubFs = Math.round(14 * s);
      const cBtnFs = Math.round(18 * s);

      const cTitleAreaH = Math.round(90 * s);
      const cBtnAreaH = cBtnH + Math.round(30 * s);
      const cDialogH = cTitleAreaH + cBtnAreaH;
      const cDialogX = cx - cDialogW / 2;
      const cDialogY = cy - cDialogH / 2;

      UIHelpers.drawPanel(ctx, cDialogX, cDialogY, cDialogW, cDialogH, cols);
      UIHelpers.drawIcon(ctx, cx - 4, cDialogY + Math.round(25 * s), 'skull', Math.round(10 * s), cols, { color: '#ff4444' });

      ctx.fillStyle = cols.text;
      ctx.font = 'bold ' + cTitleFs + 'px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Surrender?', cx, cDialogY + Math.round(50 * s));
      ctx.fillStyle = cols.text + '88';
      ctx.font = cSubFs + 'px "Pixelify Sans", sans-serif';
      ctx.fillText('You will lose this game.', cx, cDialogY + Math.round(80 * s));

      const cBtnY = cDialogY + cTitleAreaH;
      const yesX = cx - cBtnW - cBtnGap / 2;
      const noX = cx + cBtnGap / 2;

      const isHoverYes = this.hoveredBtn === 'surrender-yes';
      const isHoverNo = this.hoveredBtn === 'surrender-no';
      UIHelpers.drawButton(ctx, yesX, cBtnY, cBtnW, cBtnH, 'Yes', cols, { font: 'bold ' + cBtnFs + 'px "Pixelify Sans", sans-serif', hover: isHoverYes, radius: 8 });
      UIHelpers.drawButton(ctx, noX, cBtnY, cBtnW, cBtnH, 'Cancel', cols, { font: 'bold ' + cBtnFs + 'px "Pixelify Sans", sans-serif', hover: isHoverNo, radius: 8 });

      this._confirmYesBounds = { x: yesX, y: cBtnY, w: cBtnW, h: cBtnH };
      this._confirmNoBounds = { x: noX, y: cBtnY, w: cBtnW, h: cBtnH };

      ctx.restore();
      return;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    const titleFs = Math.round(28 * s);
    const btnFs = Math.round(18 * s);
    const moveFs = Math.round(14 * s);
    const btnW = Math.min(Math.round((portrait ? 280 : 200) * s), W - 40 - 40);
    const btnH = Math.round(50 * s);
    const btnGap = Math.round(12 * s);

    const titleAreaH = Math.round(120 * s);
    const modalW = Math.min(Math.round((portrait ? 520 : 400) * s), W - 40);
    const modalH = titleAreaH + 4 * btnH + 3 * btnGap + Math.round(20 * s);
    const modalX = cx - modalW / 2;
    const modalY = cy - modalH / 2;

    UIHelpers.drawPanel(ctx, modalX, modalY, modalW, modalH, cols, { accentTop: true });

    UIHelpers.drawIcon(ctx, cx - 4, modalY + Math.round(40 * s), 'gear', Math.round(12 * s), cols);
    ctx.fillStyle = cols.text;
    ctx.font = 'bold ' + titleFs + 'px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', cx, modalY + Math.round(65 * s));

    UIHelpers.drawSeparator(ctx, modalX + 30, modalY + Math.round(82 * s), modalW - 60, cols);

    const moveCount = (typeof GameScreen !== 'undefined' && GameScreen.moveHistory) ? GameScreen.moveHistory.length : 0;
    ctx.fillStyle = cols.text + '55';
    ctx.font = moveFs + 'px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Move ' + moveCount, cx, modalY + Math.round(102 * s));

    const btnX = cx - btnW / 2;
    const firstBtnY = modalY + titleAreaH;

    const buttons = [
      { text: 'Resume', action: 'resume', y: firstBtnY },
      { text: 'Settings', action: 'settings', y: firstBtnY + (btnH + btnGap) },
      { text: this._isLesson() ? 'Leave' : 'Surrender', action: 'surrender', y: firstBtnY + (btnH + btnGap) * 2 },
      { text: 'Quit to Menu', action: 'quit', y: firstBtnY + (btnH + btnGap) * 3 },
    ];

    const surrenderOff = !this._canSurrender();
    for (const btn of buttons) {
      const off = btn.action === 'surrender' && surrenderOff;
      const isHover = !off && this.hoveredBtn === btn.action;
      if (off) ctx.globalAlpha = this.fadeTimer * 0.45;
      UIHelpers.drawButton(ctx, btnX, btn.y, btnW, btnH, btn.text, cols, { font: 'bold ' + btnFs + 'px "Pixelify Sans", sans-serif', hover: isHover, radius: 10, textColor: off ? '#8a8a8a' : undefined });
      if (off) ctx.globalAlpha = this.fadeTimer;
      btn._bounds = { x: btnX, y: btn.y, w: btnW, h: btnH };
    }

    this._btnLayout = { x: btnX, w: btnW, h: btnH, gap: btnGap, firstY: firstBtnY };

    ctx.restore();
  },

  // Greyed out in the opening Pawnie game of a new save (GameScreen.canSurrender).
  _canSurrender() {
    return typeof GameScreen === 'undefined' || typeof GameScreen.canSurrender !== 'function' || GameScreen.canSurrender();
  },

  // Training Camp lessons say Leave instead (GameScreen.isLesson).
  _isLesson() {
    return typeof GameScreen !== 'undefined' && typeof GameScreen.isLesson === 'function' && GameScreen.isLesson();
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
        if (actions[i] === 'surrender' && !this._canSurrender()) break;
        this.hoveredBtn = actions[i];
        canvas.style.cursor = 'pointer';
        return;
      }
    }
    canvas.style.cursor = 'default';
  },

  handleClick(x, y) {
    if (!this.visible || this.fadingOut) return 'ignore';

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
        if (actions[i] === 'surrender' && !this._canSurrender()) return;
        if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
        const action = actions[i];
        if (action === 'resume') this.hide();
        else if (action === 'settings') { this.hide(); switchScreen('settings', { returnTo: 'game' }); }
        else if (action === 'surrender' && this._isLesson()) { this.hide(); GameScreen.leaveLesson(); }
        else if (action === 'surrender') { this.confirmSurrender = true; }
        else if (action === 'quit') {
          this.hide();
          GameScreen.quitToMenu();
        }
        return;
      }
    }
  },
};
