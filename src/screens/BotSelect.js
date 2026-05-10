const BotSelect = {
  eloValue: 1000,
  dragging: false,

  init() {
    // Convert stored classic difficulty (1-10) to Elo, or use stored Elo
    const stored = store.get('classicElo');
    if (stored) {
      this.eloValue = stored;
    } else {
      const diff = store.get('classicDifficulty') || 5;
      this.eloValue = 200 + (diff - 1) * 200; // 200, 400, ..., 2000
    }
  },

  eloToDifficulty(elo) {
    return Math.max(1, Math.min(10, Math.round((elo - 200) / 200) + 1));
  },

  eloToName(elo) {
    if (elo <= 400) return 'Beginner';
    if (elo <= 600) return 'Novice';
    if (elo <= 800) return 'Casual';
    if (elo <= 1000) return 'Intermediate';
    if (elo <= 1200) return 'Skilled';
    if (elo <= 1400) return 'Advanced';
    if (elo <= 1600) return 'Expert';
    if (elo <= 1800) return 'Master';
    if (elo <= 1900) return 'Grandmaster';
    return 'Chess 2.0';
  },

  eloToDescription(elo) {
    if (elo <= 400) return 'Random moves. Learn the rules.';
    if (elo <= 600) return 'Basic tactics, occasional good moves.';
    if (elo <= 800) return 'Thinks 1-2 moves ahead.';
    if (elo <= 1000) return 'Two moves ahead. Spot simple traps.';
    if (elo <= 1200) return 'Three moves ahead. Solid play.';
    if (elo <= 1400) return 'Three moves deep. Very accurate.';
    if (elo <= 1600) return 'Four moves deep. Expert-level.';
    if (elo <= 1800) return 'Four moves deep, near perfect.';
    if (elo <= 1900) return 'Five moves deep. Grandmaster.';
    return 'Full strength. The ultimate challenge.';
  },

  destroy() {},

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;
    const W = Layout.W;
    const H = Layout.H;
    const cx = Layout.cx;
    const portrait = Layout.isPortrait;

    const usePixiBg = typeof PixiMenuBackground !== 'undefined' && PixiMenuBackground.initialized;
    if (usePixiBg) {
      ctx.clearRect(0, 0, W, H);
    } else if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 28px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT OPPONENT', cx, 55);
    ctx.fillStyle = cols.text + '77';
    ctx.font = '12px "Pixelify Sans", sans-serif';
    ctx.fillText('Choose your AI opponent strength', cx, 80);
    UIHelpers.drawSeparator(ctx, cx - 340, 95, 680, cols);

    // Central panel
    const panelX = portrait ? 50 : 240;
    const panelW = portrait ? 700 : 800;
    const panelH = portrait ? 600 : 440;
    UIHelpers.drawPanel(ctx, panelX, 130, panelW, panelH, cols, { accentTop: true });

    // Elo number (large)
    ctx.fillStyle = cols.accent;
    ctx.font = 'bold 64px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.eloValue, cx, 220);

    ctx.fillStyle = cols.text + '88';
    ctx.font = '16px "Pixelify Sans", sans-serif';
    ctx.fillText('ELO', cx, 240);

    // Difficulty name
    const name = this.eloToName(this.eloValue);
    ctx.fillStyle = cols.accent;
    ctx.font = 'bold 22px "Pixelify Sans", sans-serif';
    ctx.fillText(name, cx, 280);

    // Description
    ctx.fillStyle = cols.text + '88';
    ctx.font = '14px "Pixelify Sans", sans-serif';
    ctx.fillText(this.eloToDescription(this.eloValue), cx, 305);

    // Elo slider bar
    const sliderX = portrait ? 80 : 300;
    const sliderW = portrait ? 640 : 680;
    const sliderY = 350;
    const sliderH = 16;

    // Store slider bounds for hit testing
    this._sliderBounds = { x: sliderX, y: sliderY, w: sliderW, h: sliderH };

    // Track background
    ctx.fillStyle = cols.panel;
    ctx.fillRect(sliderX, sliderY, sliderW, sliderH);
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(sliderX, sliderY, sliderW, sliderH);

    // Gradient fill
    const grad = ctx.createLinearGradient(sliderX, 0, sliderX + sliderW, 0);
    grad.addColorStop(0, '#44dd44');
    grad.addColorStop(0.4, '#ddaa22');
    grad.addColorStop(0.7, '#dd6622');
    grad.addColorStop(1, '#dd2222');
    ctx.fillStyle = grad;
    const fillW = ((this.eloValue - 200) / 1800) * sliderW;
    ctx.fillRect(sliderX, sliderY, fillW, sliderH);

    // Knob
    const knobX = sliderX + fillW;
    ctx.fillStyle = cols.text;
    ctx.fillRect(knobX - 6, sliderY - 4, 12, sliderH + 8);
    ctx.fillStyle = cols.accent;
    ctx.fillRect(knobX - 4, sliderY - 2, 8, sliderH + 4);

    // Labels at ends
    ctx.fillStyle = cols.text + '66';
    ctx.font = '10px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('200', sliderX, sliderY + sliderH + 18);
    ctx.textAlign = 'right';
    ctx.fillText('2000', sliderX + sliderW, sliderY + sliderH + 18);

    // Tick marks
    ctx.fillStyle = cols.text + '33';
    ctx.font = '9px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    for (let e = 400; e <= 1800; e += 200) {
      const tx = sliderX + ((e - 200) / 1800) * sliderW;
      ctx.fillRect(tx, sliderY + sliderH, 1, 4);
    }

    // Depth info
    const diff = this.eloToDifficulty(this.eloValue);
    const config = AIController.LEVEL_CONFIG[diff];
    if (config) {
      ctx.fillStyle = cols.text + '66';
      ctx.font = '12px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Depth: ' + config.depth + '  |  AI Level: ' + diff, cx, 420);
    }

    // Side selection (play as white/black)
    const sideY = portrait ? 460 : 470;
    ctx.fillStyle = cols.text + '88';
    ctx.font = '14px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Play as:', cx, sideY);

    const p1IsWhite = store.get('p1IsWhite') !== false;
    const btnW = 160;
    const btnH = 40;
    const btnGap = 20;
    const sideBtnY = sideY + 15;

    UIHelpers.drawButton(ctx, cx - btnW - btnGap / 2, sideBtnY, btnW, btnH, 'White', cols, {
      font: 'bold 14px "Pixelify Sans", sans-serif',
      active: p1IsWhite,
    });
    UIHelpers.drawButton(ctx, cx + btnGap / 2, sideBtnY, btnW, btnH, 'Black', cols, {
      font: 'bold 14px "Pixelify Sans", sans-serif',
      active: !p1IsWhite,
    });

    // Store side button bounds for hit testing
    this._sideBtnY = sideBtnY;
    this._sideBtnW = btnW;
    this._sideBtnH = btnH;
    this._sideBtnGap = btnGap;

    // Hint
    ctx.fillStyle = cols.text + '44';
    ctx.font = '11px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Drag slider or use arrow keys. Click to start.', cx, sideBtnY + btnH + 30);

    // Bottom
    const backY = H - 60;
    const ditherY = backY - 10;
    UIHelpers.drawDitheredRect(ctx, 0, ditherY, W, 30, cols.accent, '11');
    UIHelpers.drawButton(ctx, 30, backY - 10, 160, 40, '< Back', cols, { font: 'bold 14px "Pixelify Sans", sans-serif' });

    // Start button
    const startW = portrait ? 300 : 190;
    const startH = 50;
    const startX = portrait ? 250 : W - 220;
    const startY = H - 120;
    ctx.fillStyle = cols.accent + '22';
    ctx.fillRect(startX + 2, startY + 2, startW - 4, startH + 4);
    ctx.fillRect(startX + 4, startY + 4, startW, startH + 8);
    UIHelpers.drawButton(ctx, startX, startY, startW, startH, 'START GAME', cols, {
      font: 'bold 16px "Pixelify Sans", sans-serif',
      active: true,
    });

    // Store start button bounds for hit testing
    this._startBounds = { x: startX, y: startY, w: startW, h: startH };
    this._backBounds = { x: 30, y: backY - 10, w: 160, h: 40 };
  },

  _sliderToElo(x) {
    const sb = this._sliderBounds || { x: Layout.isPortrait ? 80 : 300, w: Layout.isPortrait ? 640 : 680 };
    const pct = Math.max(0, Math.min(1, (x - sb.x) / sb.w));
    return Math.round((200 + pct * 1800) / 50) * 50; // snap to 50
  },

  _inBounds(x, y, b) {
    return b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  },

  handleClick(x, y) {
    const cx = Layout.cx;

    // Back button
    if (this._inBounds(x, y, this._backBounds)) {
      if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
      switchScreen('home');
      return;
    }

    // Start button
    if (this._inBounds(x, y, this._startBounds)) {
      if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
      store.set('classicElo', this.eloValue);
      store.set('classicDifficulty', this.eloToDifficulty(this.eloValue));
      store.set('mode', 'classic');
      store.set('miniGamesEnabled', false);
      switchScreen('game');
      return;
    }

    // Side selection
    const btnW = this._sideBtnW || 160;
    const btnH = this._sideBtnH || 40;
    const btnGap = this._sideBtnGap || 20;
    const sideBtnY = this._sideBtnY || 485;
    if (x >= cx - btnW - btnGap / 2 && x <= cx - btnGap / 2 && y >= sideBtnY && y <= sideBtnY + btnH) {
      if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
      store.set('p1IsWhite', true);
      return;
    }
    if (x >= cx + btnGap / 2 && x <= cx + btnGap / 2 + btnW && y >= sideBtnY && y <= sideBtnY + btnH) {
      if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
      store.set('p1IsWhite', false);
      return;
    }

    // Slider click
    const sb = this._sliderBounds || { x: Layout.isPortrait ? 80 : 300, y: 350, w: Layout.isPortrait ? 640 : 680, h: 16 };
    if (x >= sb.x && x <= sb.x + sb.w && y >= sb.y - 4 && y <= sb.y + sb.h + 4) {
      this.eloValue = this._sliderToElo(x);
      this.dragging = true;
      return;
    }
  },

  handleMouseMove(x, y) {
    if (this.dragging) {
      this.eloValue = this._sliderToElo(x);
      return;
    }
    const canvas = document.getElementById('gameCanvas');
    const sb = this._sliderBounds || { x: Layout.isPortrait ? 80 : 300, y: 350, w: Layout.isPortrait ? 640 : 680, h: 16 };
    const onSlider = x >= sb.x && x <= sb.x + sb.w && y >= sb.y - 4 && y <= sb.y + sb.h + 4;
    const onStart = this._inBounds(x, y, this._startBounds);
    const onBack = this._inBounds(x, y, this._backBounds);
    canvas.style.cursor = (onSlider || onStart || onBack) ? 'pointer' : 'default';
  },

  handleMouseDown(x, y) {
    const sb = this._sliderBounds || { x: Layout.isPortrait ? 80 : 300, y: 350, w: Layout.isPortrait ? 640 : 680, h: 16 };
    if (x >= sb.x && x <= sb.x + sb.w && y >= sb.y - 10 && y <= sb.y + sb.h + 10) {
      this.dragging = true;
      this.eloValue = this._sliderToElo(x);
    }
  },

  handleMouseUp() {
    this.dragging = false;
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      switchScreen('home');
      return;
    }
    if (e.key === 'ArrowLeft') {
      this.eloValue = Math.max(200, this.eloValue - 50);
    }
    if (e.key === 'ArrowRight') {
      this.eloValue = Math.min(2000, this.eloValue + 50);
    }
    if (e.key === 'Enter' || e.key === ' ') {
      store.set('classicElo', this.eloValue);
      store.set('classicDifficulty', this.eloToDifficulty(this.eloValue));
      store.set('mode', 'classic');
      store.set('miniGamesEnabled', false);
      switchScreen('game');
    }
  },
};
