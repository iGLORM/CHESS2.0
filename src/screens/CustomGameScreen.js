const CustomGameScreen = {
  eloValue: 1000,
  playAs: 'white',
  minigameToggles: {},
  hoveredItem: null,
  dragging: false,
  scrollOffset: 0,

  minigameList: [
    { key: 'quickClick', name: 'Quick Click' },
    { key: 'memoryMatch', name: 'Memory Match' },
    { key: 'timingStrike', name: 'Timing Strike' },
    { key: 'patternPress', name: 'Pattern Press' },
    { key: 'reactionTest', name: 'Reaction Test' },
    { key: 'undertaleDodge', name: 'Soul Dodge' },
    { key: 'powerMeter', name: 'Power Meter' },
    { key: 'targetPractice', name: 'Target Practice' },
    { key: 'dodgeFalling', name: 'Dodge Falling' },
    { key: 'rhythmTap', name: 'Rhythm Tap' },
    { key: 'numberGuess', name: 'Number Guess' },
    { key: 'coinFlip', name: 'Coin Flip' },
    { key: 'shieldBlock', name: 'Shield Block' },
    { key: 'whackMole', name: 'Whack-a-Mole' },
  ],

  minigameIcons: {
    quickClick: 'target', memoryMatch: 'star', timingStrike: 'sword',
    patternPress: 'check', reactionTest: 'target', undertaleDodge: 'skull',
    powerMeter: 'gear', targetPractice: 'target', dodgeFalling: 'shield',
    rhythmTap: 'music', numberGuess: 'dice', coinFlip: 'dice',
    shieldBlock: 'shield', whackMole: 'sword',
  },

  init() {
    const stored = store.get('customElo');
    if (stored) {
      this.eloValue = stored;
    } else {
      const diff = store.get('customDifficulty') || 5;
      this.eloValue = 200 + (diff - 1) * 200;
    }
    this.playAs = store.get('customPlayAs') || 'white';
    this.minigameToggles = store.get('customMinigames') || {};
    this.hoveredItem = null;
    this.scrollOffset = 0;
    this.dragging = false;
    for (const mg of this.minigameList) {
      if (this.minigameToggles[mg.key] === undefined) this.minigameToggles[mg.key] = true;
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

  _sliderToElo(x) {
    const sliderX = 300;
    const sliderW = 680;
    const pct = Math.max(0, Math.min(1, (x - sliderX) / sliderW));
    return Math.round((200 + pct * 1800) / 50) * 50;
  },

  _drawEloSlider(ctx, cols) {
    const sliderX = 300;
    const sliderY = 140;
    const sliderW = 680;
    const sliderH = 14;

    // Label
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Bot Difficulty', 50, 115);

    // Elo number and name
    ctx.fillStyle = cols.accent;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.eloValue, 640, 115);

    ctx.fillStyle = cols.text + 'aa';
    ctx.font = '12px monospace';
    ctx.fillText(this.eloToName(this.eloValue), 780, 115);

    // Track
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

    // End labels
    ctx.fillStyle = cols.text + '66';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('200', sliderX, sliderY + sliderH + 16);
    ctx.textAlign = 'right';
    ctx.fillText('2000', sliderX + sliderW, sliderY + sliderH + 16);
  },

  destroy() {},

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    const usePixiBg = typeof PixiMenuBackground !== 'undefined' && PixiMenuBackground.initialized;
    if (usePixiBg) {
      ctx.clearRect(0, 0, 1280, 800);
    } else if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      ctx.fillRect(0, 0, 1280, 800);
    }

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CUSTOM GAME', 640, 40);
    ctx.fillStyle = cols.text + '77';
    ctx.font = '12px monospace';
    ctx.fillText('Configure your own rules', 640, 60);
    UIHelpers.drawSeparator(ctx, 300, 70, 680, cols);

    // Elo slider
    this._drawEloSlider(ctx, cols);

    // --- Play As ---
    const playY = 185;
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Play As', 50, playY);

    const btnW = 120;
    const btnH = 36;
    const btnGap = 12;
    const btnStartX = 50;

    UIHelpers.drawButton(ctx, btnStartX, playY + 10, btnW, btnH, 'White', cols, {
      font: 'bold 13px monospace',
      active: this.playAs === 'white',
    });
    UIHelpers.drawButton(ctx, btnStartX + btnW + btnGap, playY + 10, btnW, btnH, 'Black', cols, {
      font: 'bold 13px monospace',
      active: this.playAs === 'black',
    });

    // --- Minigame Toggles ---
    const mgLabelY = playY + 65;
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Minigames', 50, mgLabelY);

    const enabledCount = Object.values(this.minigameToggles).filter(v => v).length;
    ctx.fillStyle = cols.text + '77';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(enabledCount + '/' + this.minigameList.length + ' active', 1230, mgLabelY);

    // All On / All Off
    UIHelpers.drawButton(ctx, 1230 - 200, mgLabelY + 8, 90, 22, 'All On', cols, { font: 'bold 10px monospace' });
    UIHelpers.drawButton(ctx, 1230 - 100, mgLabelY + 8, 90, 22, 'All Off', cols, { font: 'bold 10px monospace' });

    // 2-column grid with better spacing
    const mgStartY = mgLabelY + 40;
    const mgLineH = 52;
    const mgColW = 580;
    const mgCol1X = 50;
    const mgCol2X = 660;
    const mgCardH = 44;
    const mgRows = Math.ceil(this.minigameList.length / 2);
    const mgGridH = mgRows * mgLineH;

    // Grouping panel behind the entire minigame grid
    UIHelpers.drawPanel(ctx, mgCol1X - 10, mgStartY - 10, 1280 - (mgCol1X - 10) * 2, mgGridH + 20, cols);

    for (let i = 0; i < this.minigameList.length; i++) {
      const mg = this.minigameList[i];
      const c = i % 2;
      const r = Math.floor(i / 2);
      const bx = c === 0 ? mgCol1X : mgCol2X;
      const by = mgStartY + r * mgLineH;
      const isOn = this.minigameToggles[mg.key];
      const isHov = this.hoveredItem === 'mg_' + mg.key;

      UIHelpers.drawCard(ctx, bx, by, mgColW, mgCardH, cols, {
        hover: isHov,
        active: isOn,
        accentStripe: isOn ? cols.accent : null,
      });

      UIHelpers.drawToggle(ctx, bx + 10, by + 13, 36, 18, isOn, cols);

      ctx.fillStyle = isOn ? cols.text : cols.text + '55';
      ctx.font = isHov ? 'bold 13px monospace' : '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(mg.name, bx + 52, by + 27);
    }

    // Bottom bar
    UIHelpers.drawPanel(ctx, 0, 710, 1280, 90, cols);
    UIHelpers.drawButton(ctx, 30, 730, 160, 40, '< Back', cols, { font: 'bold 14px monospace' });
    UIHelpers.drawButton(ctx, 1280 - 250, 725, 220, 50, 'START GAME', cols, {
      font: 'bold 18px monospace',
      active: true,
    });

    ctx.fillStyle = cols.text + '55';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.eloValue + ' ELO  |  Play as ' + this.playAs + '  |  ' + enabledCount + ' minigames', 640, 770);
    UIHelpers.drawDitheredRect(ctx, 0, 770, 1280, 30, cols.accent, '11');
  },

  handleClick(x, y) {
    if (x >= 30 && x <= 190 && y >= 730 && y <= 770) {
      switchScreen('home');
      return;
    }

    if (x >= 1280 - 250 && x <= 1280 - 30 && y >= 725 && y <= 775) {
      store.set('customElo', this.eloValue);
      store.set('customDifficulty', this.eloToDifficulty(this.eloValue));
      store.set('customPlayAs', this.playAs);
      store.set('customMinigames', { ...this.minigameToggles });
      store.set('mode', 'custom');
      store.set('p1IsWhite', this.playAs === 'white');
      store.set('miniGamesEnabled', Object.values(this.minigameToggles).some(v => v));
      switchScreen('game');
      return;
    }

    // Elo slider
    if (x >= 300 && x <= 980 && y >= 136 && y <= 158) {
      this.eloValue = this._sliderToElo(x);
      this.dragging = true;
      return;
    }

    // Play As (buttons: 120x36)
    const playY = 195;
    const btnW = 120;
    const btnH = 36;
    const btnGap = 12;
    if (x >= 50 && x <= 50 + btnW && y >= playY && y <= playY + btnH) {
      this.playAs = 'white';
      return;
    }
    if (x >= 50 + btnW + btnGap && x <= 50 + btnW * 2 + btnGap && y >= playY && y <= playY + btnH) {
      this.playAs = 'black';
      return;
    }

    // All On / All Off
    const mgLabelY = 250;
    const saX = 1230 - 200;
    if (x >= saX && x <= saX + 90 && y >= mgLabelY + 8 && y <= mgLabelY + 30) {
      for (const mg of this.minigameList) this.minigameToggles[mg.key] = true;
      return;
    }
    if (x >= saX + 100 && x <= saX + 190 && y >= mgLabelY + 8 && y <= mgLabelY + 30) {
      for (const mg of this.minigameList) this.minigameToggles[mg.key] = false;
      return;
    }

    // Minigame toggles (mgLineH: 52, card height: 44)
    const mgStartY = mgLabelY + 40;
    const mgLineH = 52;
    const mgColW = 580;
    for (let i = 0; i < this.minigameList.length; i++) {
      const c = i % 2;
      const r = Math.floor(i / 2);
      const bx = c === 0 ? 50 : 660;
      const by = mgStartY + r * mgLineH;
      if (x >= bx && x <= bx + mgColW && y >= by && y <= by + 44) {
        this.minigameToggles[this.minigameList[i].key] = !this.minigameToggles[this.minigameList[i].key];
        return;
      }
    }
  },

  handleMouseMove(x, y) {
    if (this.dragging) {
      this.eloValue = this._sliderToElo(x);
      return;
    }
    this.hoveredItem = null;
    const canvas = document.getElementById('gameCanvas');
    canvas.style.cursor = 'default';

    // Minigame toggles hover (mgLineH: 52, card height: 44)
    const mgStartY = 290;
    const mgLineH = 52;
    const mgColW = 580;
    for (let i = 0; i < this.minigameList.length; i++) {
      const c = i % 2;
      const r = Math.floor(i / 2);
      const bx = c === 0 ? 50 : 660;
      const by = mgStartY + r * mgLineH;
      if (x >= bx && x <= bx + mgColW && y >= by && y <= by + 44) {
        this.hoveredItem = 'mg_' + this.minigameList[i].key;
        canvas.style.cursor = 'pointer';
        return;
      }
    }

    if ((x >= 1280 - 250 && x <= 1280 - 30 && y >= 725 && y <= 775) ||
        (x >= 30 && x <= 190 && y >= 730 && y <= 770) ||
        (x >= 300 && x <= 980 && y >= 136 && y <= 158)) {
      canvas.style.cursor = 'pointer';
    }
  },

  handleMouseDown(x, y) {
    if (x >= 300 && x <= 980 && y >= 130 && y <= 165) {
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
    if (e.key === 'ArrowLeft') this.eloValue = Math.max(200, this.eloValue - 50);
    if (e.key === 'ArrowRight') this.eloValue = Math.min(2000, this.eloValue + 50);
  },
};