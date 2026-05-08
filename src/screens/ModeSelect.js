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

    // Background - animated theme
    const usePixiBg = typeof PixiMenuBackground !== 'undefined' && PixiMenuBackground.initialized;
    if (usePixiBg) {
      ctx.clearRect(0, 0, 1280, 800);
    } else if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      ctx.fillRect(0, 0, 1280, 800);
    }

    // Title
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    const title = this.mode === 'story' ? 'STORY MODE' : 'LOCAL 1v1';
    ctx.fillText(title, 640, 200);

    // Subtitle
    ctx.font = '14px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Select your side', 640, 240);

    // Decorative separator below title area
    UIHelpers.drawSeparator(ctx, 400, 280, 480, cols);

    // Decorative piece sprites
    UIHelpers.drawIcon(ctx, 300, 220, 'king', 24, cols, { color: cols.lightPiece });
    UIHelpers.drawIcon(ctx, 940, 220, 'king', 24, cols, { color: cols.darkPiece });

    // Grouping panel behind button area
    UIHelpers.drawPanel(ctx, 340, 300, 600, 260, cols, { accentTop: true });

    // Side selection buttons
    this.buttons = [
      { text: 'Play as White', action: 'white', y: 320 },
      { text: 'Play as Black', action: 'black', y: 400 },
      { text: 'Random', action: 'random', y: 480 },
    ];

    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const isHover = i === this.selectedButton;
      const isSelected = i === this.selectedButton;
      const bx = 420;
      const bw = 440;
      const bh = 55;

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
      ctx.font = isHover ? 'bold 20px monospace' : '20px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.text, bx + 45, btn.y + bh / 2);
      ctx.textBaseline = 'alphabetic';

      // Subtitle description
      const subtitles = { white: 'First move advantage', black: 'Defensive strategy', random: 'Leave it to fate' };
      ctx.fillStyle = cols.text + '66';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(subtitles[btn.action], bx + 45, btn.y + bh / 2 + 14);

      btn._bounds = { x: bx, y: btn.y, w: bw, h: bh };
    }

    UIHelpers.drawButton(ctx, 30, 740, 150, 40, '< Home', cols, { font: 'bold 14px monospace' });

    // Bottom decorative dithered floor stripe
    UIHelpers.drawDitheredRect(ctx, 0, 700, 1280, 40, cols.accent);
  },

  handleClick(x, y) {
    // Back button
    if (x >= 30 && x <= 180 && y >= 740 && y <= 780) {
      switchScreen('home');
      return;
    }

    // Side buttons
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      if (btn._bounds && x >= btn._bounds.x && x <= btn._bounds.x + btn._bounds.w &&
          y >= btn._bounds.y && y <= btn._bounds.y + btn._bounds.h) {
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
