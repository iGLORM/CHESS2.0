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
    const s = Layout.uiScale || 1;

    const usePixiBg = typeof PixiMenuBackground !== 'undefined' && PixiMenuBackground.initialized;
    if (usePixiBg) {
      ctx.clearRect(0, 0, W, H);
    } else if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      ctx.fillRect(0, 0, W, H);
    }

    const titleY = Math.round(60 * s);
    const subY = Math.round(90 * s);
    const sepY = Math.round(108 * s);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold ' + Math.round(32 * s) + 'px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT OPPONENT', cx, titleY);
    ctx.fillStyle = cols.text + '77';
    ctx.font = Math.round(18 * s) + 'px "Pixelify Sans", sans-serif';
    ctx.fillText('Choose your AI opponent strength', cx, subY);
    UIHelpers.drawSeparator(ctx, cx - 340 * s, sepY, 680 * s, cols);

    const rawPanelW = portrait ? 700 : 800;
    const panelW = Math.min(rawPanelW, W - 80);
    const panelX = Math.round((W - panelW) / 2);
    const panelTop = Math.round(130 * s);
    const panelH = Math.round(320 * s);
    UIHelpers.drawPanel(ctx, panelX, panelTop, panelW, panelH, cols, { accentTop: true });

    ctx.fillStyle = cols.accent;
    ctx.font = 'bold ' + Math.round(64 * s) + 'px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.eloValue, cx, panelTop + Math.round(80 * s));

    ctx.fillStyle = cols.text + '88';
    ctx.font = Math.round(18 * s) + 'px "Pixelify Sans", sans-serif';
    ctx.fillText('ELO', cx, panelTop + Math.round(104 * s));

    const name = this.eloToName(this.eloValue);
    ctx.fillStyle = cols.accent;
    ctx.font = 'bold ' + Math.round(26 * s) + 'px "Pixelify Sans", sans-serif';
    ctx.fillText(name, cx, panelTop + Math.round(146 * s));

    ctx.fillStyle = cols.text + '88';
    ctx.font = Math.round(20 * s) + 'px "Pixelify Sans", sans-serif';
    ctx.fillText(this.eloToDescription(this.eloValue), cx, panelTop + Math.round(178 * s));

    const sliderW = Math.min(portrait ? 640 : 680, panelW - 60);
    const sliderX = Math.round(cx - sliderW / 2);
    const sliderY = panelTop + Math.round(220 * s);
    const sliderH = Math.round(18 * s);

    this._sliderBounds = { x: sliderX, y: sliderY, w: sliderW, h: sliderH };

    ctx.fillStyle = cols.panel;
    ctx.fillRect(sliderX, sliderY, sliderW, sliderH);
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(sliderX, sliderY, sliderW, sliderH);

    const grad = ctx.createLinearGradient(sliderX, 0, sliderX + sliderW, 0);
    grad.addColorStop(0, '#44dd44');
    grad.addColorStop(0.4, '#ddaa22');
    grad.addColorStop(0.7, '#dd6622');
    grad.addColorStop(1, '#dd2222');
    ctx.fillStyle = grad;
    const fillW = ((this.eloValue - 200) / 1800) * sliderW;
    ctx.fillRect(sliderX, sliderY, fillW, sliderH);

    const knobX = sliderX + fillW;
    ctx.fillStyle = cols.text;
    ctx.fillRect(knobX - 6, sliderY - 4, 12, sliderH + 8);
    ctx.fillStyle = cols.accent;
    ctx.fillRect(knobX - 4, sliderY - 2, 8, sliderH + 4);

    ctx.fillStyle = cols.text + '66';
    ctx.font = Math.round(16 * s) + 'px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('200', sliderX, sliderY + sliderH + Math.round(22 * s));
    ctx.textAlign = 'right';
    ctx.fillText('2000', sliderX + sliderW, sliderY + sliderH + Math.round(22 * s));

    ctx.fillStyle = cols.text + '33';
    ctx.textAlign = 'center';
    for (let e = 400; e <= 1800; e += 200) {
      const tx = sliderX + ((e - 200) / 1800) * sliderW;
      ctx.fillRect(tx, sliderY + sliderH, 1, 4);
    }

    const diff = this.eloToDifficulty(this.eloValue);
    const config = AIController.LEVEL_CONFIG[diff];
    if (config) {
      ctx.fillStyle = cols.text + '66';
      ctx.font = Math.round(18 * s) + 'px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Depth: ' + config.depth + '  |  AI Level: ' + diff, cx, panelTop + Math.round(290 * s));
    }

    const sideY = panelTop + panelH + Math.round(30 * s);
    ctx.fillStyle = cols.text + '88';
    ctx.font = Math.round(20 * s) + 'px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Play as:', cx, sideY);

    const p1IsWhite = store.get('p1IsWhite') !== false;
    const btnW = Math.round(160 * s);
    const btnH = Math.round(48 * s);
    const btnGap = Math.round(20 * s);
    const sideBtnY = sideY + Math.round(16 * s);

    UIHelpers.drawButton(ctx, cx - btnW - btnGap / 2, sideBtnY, btnW, btnH, 'White', cols, {
      font: 'bold ' + Math.round(20 * s) + 'px "Pixelify Sans", sans-serif',
      active: p1IsWhite,
      radius: 10,
    });
    UIHelpers.drawButton(ctx, cx + btnGap / 2, sideBtnY, btnW, btnH, 'Black', cols, {
      font: 'bold ' + Math.round(20 * s) + 'px "Pixelify Sans", sans-serif',
      active: !p1IsWhite,
      radius: 10,
    });

    this._sideBtnY = sideBtnY;
    this._sideBtnW = btnW;
    this._sideBtnH = btnH;
    this._sideBtnGap = btnGap;

    ctx.fillStyle = cols.text + '44';
    ctx.font = Math.round(16 * s) + 'px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Drag slider or use arrow keys.', cx, sideBtnY + btnH + Math.round(30 * s));

    const startW = Math.round((portrait ? 340 : 220) * s);
    const startH = Math.round(56 * s);
    const startX = Math.round(cx - startW / 2);
    const startY = portrait ? sideBtnY + btnH + Math.round(60 * s) : H - Math.round(120 * s);
    ctx.fillStyle = cols.accent + '22';
    ctx.fillRect(startX + 2, startY + 2, startW - 4, startH + 4);
    ctx.fillRect(startX + 4, startY + 4, startW, startH + 8);
    UIHelpers.drawButton(ctx, startX, startY, startW, startH, 'START GAME', cols, {
      font: 'bold ' + Math.round(22 * s) + 'px "Pixelify Sans", sans-serif',
      active: true,
      radius: 10,
    });

    const backY = portrait ? startY + startH + Math.round(24 * s) : H - Math.round(60 * s);
    const ditherY = backY - 10;
    UIHelpers.drawDitheredRect(ctx, 0, ditherY, W, 30, cols.accent, '11');
    const backW = Math.max(160, Math.round(160 * s));
    const backH = Math.max(44, Math.round(44 * s));
    UIHelpers.drawButton(ctx, 30, backY - 10, backW, backH, '< Back', cols, { font: 'bold ' + Math.round(18 * s) + 'px "Pixelify Sans", sans-serif', radius: 10 });

    this._startBounds = { x: startX, y: startY, w: startW, h: startH };
    this._backBounds = { x: 30, y: backY - 10, w: backW, h: backH };
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
