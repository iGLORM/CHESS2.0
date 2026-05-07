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

    if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      ctx.fillRect(0, 0, 1280, 800);
    }

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT OPPONENT', 640, 55);
    ctx.fillStyle = cols.text + '77';
    ctx.font = '12px monospace';
    ctx.fillText('Choose your AI opponent strength', 640, 80);
    UIHelpers.drawSeparator(ctx, 300, 95, 680, cols);

    // Central panel
    UIHelpers.drawPanel(ctx, 240, 130, 800, 440, cols, { accentTop: true });

    // Elo number (large)
    ctx.fillStyle = cols.accent;
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.eloValue, 640, 220);

    ctx.fillStyle = cols.text + '88';
    ctx.font = '16px monospace';
    ctx.fillText('ELO', 640, 240);

    // Difficulty name
    const name = this.eloToName(this.eloValue);
    ctx.fillStyle = cols.accent;
    ctx.font = 'bold 22px monospace';
    ctx.fillText(name, 640, 280);

    // Description
    ctx.fillStyle = cols.text + '88';
    ctx.font = '14px monospace';
    ctx.fillText(this.eloToDescription(this.eloValue), 640, 305);

    // Elo slider bar
    const sliderX = 300;
    const sliderY = 350;
    const sliderW = 680;
    const sliderH = 16;

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
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('200', sliderX, sliderY + sliderH + 18);
    ctx.textAlign = 'right';
    ctx.fillText('2000', sliderX + sliderW, sliderY + sliderH + 18);

    // Tick marks
    ctx.fillStyle = cols.text + '33';
    ctx.font = '9px monospace';
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
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Depth: ' + config.depth + '  |  AI Level: ' + diff, 640, 420);
    }

    // Side selection (play as white/black)
    ctx.fillStyle = cols.text + '88';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Play as:', 640, 470);

    const p1IsWhite = store.get('p1IsWhite') !== false;
    const btnW = 140;
    const btnH = 36;
    const btnGap = 20;

    UIHelpers.drawButton(ctx, 640 - btnW - btnGap / 2, 485, btnW, btnH, 'White', cols, {
      font: 'bold 13px monospace',
      active: p1IsWhite,
    });
    UIHelpers.drawButton(ctx, 640 + btnGap / 2, 485, btnW, btnH, 'Black', cols, {
      font: 'bold 13px monospace',
      active: !p1IsWhite,
    });

    // Hint
    ctx.fillStyle = cols.text + '44';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Drag slider or use arrow keys. Click to start.', 640, 550);

    // Bottom
    UIHelpers.drawDitheredRect(ctx, 0, 770, 1280, 30, cols.accent, '11');
    UIHelpers.drawButton(ctx, 30, 730, 160, 40, '< Back', cols, { font: 'bold 14px monospace' });

    // Start button
    ctx.fillStyle = cols.accent + '22';
    ctx.fillRect(1280 - 218, 712, 194, 54);
    ctx.fillRect(1280 - 216, 714, 198, 58);
    UIHelpers.drawButton(ctx, 1280 - 220, 710, 190, 50, 'START GAME', cols, {
      font: 'bold 16px monospace',
      active: true,
    });
  },

  _sliderToElo(x) {
    const sliderX = 300;
    const sliderW = 680;
    const pct = Math.max(0, Math.min(1, (x - sliderX) / sliderW));
    return Math.round((200 + pct * 1800) / 50) * 50; // snap to 50
  },

  handleClick(x, y) {
    if (x >= 30 && x <= 190 && y >= 730 && y <= 770) {
      switchScreen('home');
      return;
    }

    // Start button
    if (x >= 1280 - 220 && x <= 1280 - 30 && y >= 710 && y <= 760) {
      store.set('classicElo', this.eloValue);
      store.set('classicDifficulty', this.eloToDifficulty(this.eloValue));
      store.set('mode', 'classic');
      store.set('miniGamesEnabled', false);
      switchScreen('game');
      return;
    }

    // Side selection
    const p1IsWhite = store.get('p1IsWhite') !== false;
    const btnW = 140;
    const btnH = 36;
    const btnGap = 20;
    if (x >= 640 - btnW - btnGap / 2 && x <= 640 - btnGap / 2 && y >= 485 && y <= 521) {
      store.set('p1IsWhite', true);
      return;
    }
    if (x >= 640 + btnGap / 2 && x <= 640 + btnGap / 2 + btnW && y >= 485 && y <= 521) {
      store.set('p1IsWhite', false);
      return;
    }

    // Slider click
    if (x >= 300 && x <= 980 && y >= 346 && y <= 370) {
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
    const onSlider = x >= 300 && x <= 980 && y >= 346 && y <= 370;
    const onStart = x >= 1280 - 220 && x <= 1280 - 30 && y >= 710 && y <= 760;
    const onBack = x >= 30 && x <= 190 && y >= 730 && y <= 770;
    canvas.style.cursor = (onSlider || onStart || onBack) ? 'pointer' : 'default';
  },

  handleMouseDown(x, y) {
    if (x >= 300 && x <= 980 && y >= 340 && y <= 375) {
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