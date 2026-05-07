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
      ctx.fillRect(0, 0, 1280, 800);

      UIHelpers.drawPanel(ctx, 440, 300, 400, 180, cols);
      UIHelpers.drawIcon(ctx, 636, 325, 'skull', 10, cols, { color: '#ff4444' });

      ctx.fillStyle = cols.text;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Surrender?', 640, 350);
      ctx.fillStyle = cols.text + '88';
      ctx.font = '14px monospace';
      ctx.fillText('You will lose this game.', 640, 380);

      const isHoverYes = this.hoveredBtn === 'surrender-yes';
      const isHoverNo = this.hoveredBtn === 'surrender-no';
      UIHelpers.drawButton(ctx, 460, 420, 140, 40, 'Yes', cols, { font: 'bold 13px monospace', hover: isHoverYes });
      UIHelpers.drawButton(ctx, 680, 420, 140, 40, 'Cancel', cols, { font: 'bold 13px monospace', hover: isHoverNo });
      ctx.globalAlpha = 1;
      return;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 1280, 800);

    UIHelpers.drawPanel(ctx, 390, 160, 500, 420, cols, { accentTop: true });

    UIHelpers.drawIcon(ctx, 636, 200, 'gear', 12, cols);
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 640, 230);

    UIHelpers.drawSeparator(ctx, 420, 248, 440, cols);

    const moveCount = (typeof GameScreen !== 'undefined' && GameScreen.moveHistory) ? GameScreen.moveHistory.length : 0;
    ctx.fillStyle = cols.text + '55';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Move ' + moveCount, 640, 265);

    const buttons = [
      { text: 'Resume', action: 'resume', y: 290 },
      { text: 'Settings', action: 'settings', y: 350 },
      { text: 'Surrender', action: 'surrender', y: 410 },
      { text: 'Quit to Menu', action: 'quit', y: 470 },
    ];

    for (const btn of buttons) {
      const isHover = this.hoveredBtn === btn.action;
      UIHelpers.drawButton(ctx, 540, btn.y, 200, 45, btn.text, cols, { font: 'bold 16px monospace', hover: isHover });
      btn._bounds = { x: 540, y: btn.y, w: 200, h: 45 };
    }
    ctx.globalAlpha = 1;
  },

  handleMouseMove(x, y) {
    if (!this.visible) return;
    this.hoveredBtn = null;
    const canvas = document.getElementById('gameCanvas');

    if (this.confirmSurrender) {
      if (x >= 460 && x <= 600 && y >= 420 && y <= 460) this.hoveredBtn = 'surrender-yes';
      else if (x >= 680 && x <= 820 && y >= 420 && y <= 460) this.hoveredBtn = 'surrender-no';
      canvas.style.cursor = this.hoveredBtn ? 'pointer' : 'default';
      return;
    }

    const buttons = [
      { action: 'resume', y: 290 },
      { action: 'settings', y: 350 },
      { action: 'surrender', y: 410 },
      { action: 'quit', y: 470 },
    ];
    for (const btn of buttons) {
      if (x >= 540 && x <= 740 && y >= btn.y && y <= btn.y + 45) {
        this.hoveredBtn = btn.action;
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
      if (x >= 460 && x <= 600 && y >= 420 && y <= 460) {
        this.confirmSurrender = false;
        this.hide();
        GameScreen.surrender();
        return;
      }
      if (x >= 680 && x <= 820 && y >= 420 && y <= 460) {
        this.confirmSurrender = false;
        return;
      }
      return;
    }

    const buttons = [
      { text: 'Resume', action: 'resume', y: 290 },
      { text: 'Settings', action: 'settings', y: 350 },
      { text: 'Surrender', action: 'surrender', y: 410 },
      { text: 'Quit to Menu', action: 'quit', y: 470 },
    ];
    for (const btn of buttons) {
      if (x >= 540 && x <= 740 && y >= btn.y && y <= btn.y + 45) {
        if (btn.action === 'resume') this.hide();
        else if (btn.action === 'settings') { this.hide(); switchScreen('settings'); }
        else if (btn.action === 'surrender') { this.confirmSurrender = true; }
        else if (btn.action === 'quit') {
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