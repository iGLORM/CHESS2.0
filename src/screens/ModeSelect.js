const ModeSelect = {
  selectedButton: 0,
  buttons: [],

  init(data) {
    this.mode = data || 'story';
    this.selectedButton = 0;
  },

  destroy() {},

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;
    const W = Layout.W;
    const H = Layout.H;
    const cx = Layout.cx;
    const portrait = Layout.isPortrait;

    // Background - animated theme
    const usePixiBg = typeof PixiMenuBackground !== 'undefined' && PixiMenuBackground.initialized;
    if (usePixiBg) {
      ctx.clearRect(0, 0, W, H);
    } else if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      ctx.fillRect(0, 0, W, H);
    }

    // Layout values
    const titleY = portrait ? 240 : 200;
    const subtitleY = titleY + 40;
    const sepY = subtitleY + 40;
    const bw = portrait ? 540 : 440;
    const bh = portrait ? 64 : 55;
    const btnGap = portrait ? 14 : 10;
    const panelPadX = portrait ? 20 : 0;
    const panelX = cx - bw / 2 - panelPadX - 20;
    const panelW = bw + panelPadX * 2 + 40;
    const firstBtnY = sepY + 40;

    // Title
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 32px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    const title = this.mode === 'story' ? 'STORY MODE' : 'LOCAL 1v1';
    ctx.fillText(title, cx, titleY);

    // Subtitle
    ctx.font = '14px "Pixelify Sans", sans-serif';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Select your side', cx, subtitleY);

    // Decorative separator below title area
    UIHelpers.drawSeparator(ctx, cx - 240, sepY, 480, cols);

    // Decorative piece sprites
    const iconOffset = portrait ? 200 : 340;
    UIHelpers.drawIcon(ctx, cx - iconOffset, titleY + 20, 'king', 24, cols, { color: cols.lightPiece });
    UIHelpers.drawIcon(ctx, cx + iconOffset, titleY + 20, 'king', 24, cols, { color: cols.darkPiece });

    // Grouping panel behind button area
    const panelH = (bh + btnGap) * 3 + 20;
    UIHelpers.drawPanel(ctx, panelX, firstBtnY - 20, panelW, panelH, cols, { accentTop: true });

    // Side selection buttons
    this.buttons = [
      { text: 'Play as White', action: 'white', y: firstBtnY },
      { text: 'Play as Black', action: 'black', y: firstBtnY + bh + btnGap },
      { text: 'Random', action: 'random', y: firstBtnY + (bh + btnGap) * 2 },
    ];

    const bx = cx - bw / 2;

    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const isHover = i === this.selectedButton;
      const isSelected = i === this.selectedButton;

      UIHelpers.drawCard(ctx, bx, btn.y, bw, bh, cols, { hover: isHover, active: isSelected });

      // Button icon
      if (btn.action === 'white') {
        UIHelpers.drawIcon(ctx, bx + 20, btn.y + 15, 'king', 12, cols, { color: cols.lightPiece });
      } else if (btn.action === 'black') {
        UIHelpers.drawIcon(ctx, bx + 20, btn.y + 15, 'queen', 12, cols, { color: cols.darkPiece });
      } else if (btn.action === 'random') {
        UIHelpers.drawIcon(ctx, bx + 20, btn.y + 15, 'dice', 12, cols, { color: cols.accent });
      }

      ctx.fillStyle = isHover ? cols.accent : cols.text;
      ctx.font = isHover ? 'bold 20px "Pixelify Sans", sans-serif' : '20px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.text, bx + 45, btn.y + bh / 2);
      ctx.textBaseline = 'alphabetic';

      // Subtitle description
      const subtitles = { white: 'First move advantage', black: 'Defensive strategy', random: 'Leave it to fate' };
      ctx.fillStyle = cols.text + '66';
      ctx.font = '10px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(subtitles[btn.action], bx + 45, btn.y + bh / 2 + 14);

      btn._bounds = { x: bx, y: btn.y, w: bw, h: bh };
    }

    const backY = H - 60;
    UIHelpers.drawButton(ctx, 30, backY, 150, 40, '< Home', cols, { font: 'bold 14px "Pixelify Sans", sans-serif' });

    // Bottom decorative dithered floor stripe
    const ditherY = backY - 40;
    UIHelpers.drawDitheredRect(ctx, 0, ditherY, W, 40, cols.accent);
  },

  handleClick(x, y) {
    // Back button
    const backY = Layout.H - 60;
    if (x >= 30 && x <= 180 && y >= backY && y <= backY + 40) {
      if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
      switchScreen('home');
      return;
    }

    // Side buttons
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      if (btn._bounds && x >= btn._bounds.x && x <= btn._bounds.x + btn._bounds.w &&
          y >= btn._bounds.y && y <= btn._bounds.y + btn._bounds.h) {
        if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
        this.startGame(btn.action);
        return;
      }
    }
  },

  handleMouseMove(x, y) {
    this.selectedButton = -1;
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      if (btn._bounds && x >= btn._bounds.x && x <= btn._bounds.x + btn._bounds.w &&
          y >= btn._bounds.y && y <= btn._bounds.y + btn._bounds.h) {
        this.selectedButton = i;
        return;
      }
    }
  },

  handleKeyDown(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const dir = e.key === 'ArrowUp' ? -1 : 1;
      this.selectedButton = (this.selectedButton + dir + this.buttons.length) % this.buttons.length;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.selectedButton >= 0) {
        this.startGame(this.buttons[this.selectedButton].action);
      }
    }
    if (e.key === 'Escape') {
      switchScreen('home');
    }
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
};
