const CustomGameScreen = {
  difficulty: 5,
  playAs: 'white',
  minigameToggles: {},
  hoveredItem: null,
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
    quickClick: 'target',
    memoryMatch: 'star',
    timingStrike: 'sword',
    patternPress: 'check',
    reactionTest: 'target',
    undertaleDodge: 'skull',
    powerMeter: 'gear',
    targetPractice: 'target',
    dodgeFalling: 'shield',
    rhythmTap: 'music',
    numberGuess: 'dice',
    coinFlip: 'dice',
    shieldBlock: 'shield',
    whackMole: 'sword',
  },

  init() {
    this.difficulty = store.get('customDifficulty') || 5;
    this.playAs = store.get('customPlayAs') || 'white';
    this.minigameToggles = store.get('customMinigames') || {};
    this.hoveredItem = null;
    this.scrollOffset = 0;

    for (const mg of this.minigameList) {
      if (this.minigameToggles[mg.key] === undefined) {
        this.minigameToggles[mg.key] = true;
      }
    }
  },

  destroy() {},

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },

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
    ctx.fillText('CUSTOM GAME', 640, 45);
    ctx.fillStyle = cols.text + '77';
    ctx.font = '12px monospace';
    ctx.fillText('Configure your own rules', 640, 70);

    UIHelpers.drawSeparator(ctx, 300, 80, 680, cols);

    // --- Difficulty Row ---
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Bot Difficulty', 50, 105);

    const diffNames = ['Beginner', 'Novice', 'Apprentice', 'Intermediate', 'Skilled', 'Advanced', 'Expert', 'Master', 'Grandmaster', 'Chess 2.0'];
    const diffCardW = 108;
    const diffGap = 8;
    const totalDiffW = 10 * diffCardW + 9 * diffGap;
    const diffStartX = (1280 - totalDiffW) / 2;
    const diffY = 115;

    for (let i = 0; i < 10; i++) {
      const x = diffStartX + i * (diffCardW + diffGap);
      const level = i + 1;
      const isSelected = this.difficulty === level;
      const isHover = this.hoveredItem === 'diff_' + level;

      UIHelpers.drawCard(ctx, x, diffY, diffCardW, 36, cols, {
        hover: isHover,
        active: isSelected,
        accentStripe: isSelected ? cols.accent : null,
      });

      ctx.fillStyle = isSelected ? cols.accent : cols.text;
      ctx.font = isSelected ? 'bold 11px monospace' : '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(level + '', x + diffCardW / 2, diffY + 15);
      ctx.font = '8px monospace';
      ctx.fillText(UIHelpers.truncateText(ctx, diffNames[i], diffCardW - 8), x + diffCardW / 2, diffY + 27);

      // Difficulty color dots
      const dotColor = UIHelpers.difficultyColor(i + 1, cols);
      for (let d = 0; d < 5; d++) {
        ctx.fillStyle = d < Math.ceil((i + 1) / 2) ? dotColor : cols.text + '22';
        ctx.fillRect(x + (diffCardW - 5 * 4) / 2 + d * 4, diffY + 30, 2, 2);
      }
    }

    // --- Play As Toggle ---
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Play As', 50, 185);

    const toggleX = 50;
    const toggleY = 195;
    const toggleW = 200;
    const toggleH = 32;

    for (const [label, value, icon] of [['White', 'white', 'king'], ['Black', 'black', 'queen']]) {
      const isSel = this.playAs === value;
      const isHov = this.hoveredItem === 'play_' + value;
      const offX = value === 'white' ? 0 : toggleW / 2 + 5;
      UIHelpers.drawCard(ctx, toggleX + offX, toggleY, toggleW / 2 - 5, toggleH, cols, {
        hover: isHov,
        active: isSel,
        accentStripe: isSel ? cols.accent : null,
      });
      UIHelpers.drawToggle(ctx, toggleX + offX + 8, toggleY + 7, 36, 18, isSel, cols);
      UIHelpers.drawIcon(ctx, toggleX + offX + 50, toggleY + 4, icon, 12, cols, {
        color: isSel ? cols.accent : cols.text + '55',
      });
      ctx.fillStyle = isSel ? cols.accent : cols.text;
      ctx.font = isSel ? 'bold 13px monospace' : '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, toggleX + offX + 66, toggleY + 22);
    }

    // --- Minigame Toggles ---
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Minigames', 50, 260);

    const enabledCount = Object.values(this.minigameToggles).filter(v => v).length;
    ctx.fillStyle = cols.text + '77';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(enabledCount + '/' + this.minigameList.length + ' active', 1230, 260);

    // Select All / Deselect All buttons
    const saX = 1230 - 200;
    const saY = 272;
    UIHelpers.drawButton(ctx, saX, saY, 90, 24, 'All On', cols, { font: 'bold 10px monospace' });
    UIHelpers.drawButton(ctx, saX + 100, saY, 90, 24, 'All Off', cols, { font: 'bold 10px monospace' });

    const mgStartY = 302;
    const mgLineH = 36;
    const mgCols = 2;
    const mgColW = 580;
    const mgCol1X = 50;
    const mgCol2X = 660;

    for (let i = 0; i < this.minigameList.length; i++) {
      const mg = this.minigameList[i];
      const c = i % mgCols;
      const r = Math.floor(i / mgCols);
      const bx = c === 0 ? mgCol1X : mgCol2X;
      const by = mgStartY + r * mgLineH;
      const isOn = this.minigameToggles[mg.key];
      const isHov = this.hoveredItem === 'mg_' + mg.key;

      UIHelpers.drawCard(ctx, bx, by, mgColW, 30, cols, {
        hover: isHov,
        active: isOn,
        accentStripe: isOn ? cols.accent : null,
      });

      // Toggle switch
      UIHelpers.drawToggle(ctx, bx + 8, by + 6, 36, 18, isOn, cols);

      // Minigame icon
      const iconType = this.minigameIcons[mg.key] || 'check';
      UIHelpers.drawIcon(ctx, bx + 50, by + 6, iconType, 8, cols, {
        color: isOn ? cols.accent : cols.text + '55',
      });

      ctx.fillStyle = isOn ? cols.text : cols.text + '55';
      ctx.font = isHov ? 'bold 13px monospace' : '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(mg.name, bx + 64, by + 20);
    }

    // --- Bottom Bar ---
    UIHelpers.drawPanel(ctx, 0, 710, 1280, 90, cols);

    UIHelpers.drawButton(ctx, 30, 730, 160, 40, '< Back', cols, { font: 'bold 14px monospace' });
    UIHelpers.drawButton(ctx, 1280 - 250, 725, 220, 50, 'START GAME', cols, {
      font: 'bold 18px monospace',
      active: true,
    });

    ctx.fillStyle = cols.text + '55';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Level ' + this.difficulty + ' bot  |  Play as ' + this.playAs + '  |  ' + enabledCount + ' minigames', 640, 770);

    UIHelpers.drawDitheredRect(ctx, 0, 770, 1280, 30, cols.accent, '11');
  },

  handleClick(x, y) {
    // Back button
    if (x >= 30 && x <= 190 && y >= 730 && y <= 770) {
      switchScreen('home');
      return;
    }

    // Start button
    if (x >= 1280 - 250 && x <= 1280 - 30 && y >= 725 && y <= 775) {
      store.set('customDifficulty', this.difficulty);
      store.set('customPlayAs', this.playAs);
      store.set('customMinigames', { ...this.minigameToggles });
      store.set('mode', 'custom');
      store.set('p1IsWhite', this.playAs === 'white');
      store.set('miniGamesEnabled', Object.values(this.minigameToggles).some(v => v));
      switchScreen('game');
      return;
    }

    // Difficulty cards
    const diffCardW = 108;
    const diffGap = 8;
    const totalDiffW = 10 * diffCardW + 9 * diffGap;
    const diffStartX = (1280 - totalDiffW) / 2;
    const diffY = 115;
    for (let i = 0; i < 10; i++) {
      const cx = diffStartX + i * (diffCardW + diffGap);
      if (x >= cx && x <= cx + diffCardW && y >= diffY && y <= diffY + 36) {
        this.difficulty = i + 1;
        return;
      }
    }

    // Play As toggle
    const toggleX = 50;
    const toggleY = 195;
    const toggleW = 200;
    const toggleH = 32;
    if (y >= toggleY && y <= toggleY + toggleH) {
      if (x >= toggleX && x <= toggleX + toggleW / 2 - 5) {
        this.playAs = 'white';
        return;
      }
      if (x >= toggleX + toggleW / 2 + 5 && x <= toggleX + toggleW) {
        this.playAs = 'black';
        return;
      }
    }

    // Select All / Deselect All
    const saX = 1230 - 200;
    const saY = 272;
    if (x >= saX && x <= saX + 90 && y >= saY && y <= saY + 24) {
      for (const mg of this.minigameList) this.minigameToggles[mg.key] = true;
      return;
    }
    if (x >= saX + 100 && x <= saX + 190 && y >= saY && y <= saY + 24) {
      for (const mg of this.minigameList) this.minigameToggles[mg.key] = false;
      return;
    }

    // Minigame toggles
    const mgStartY = 302;
    const mgLineH = 36;
    const mgCols = 2;
    const mgColW = 580;
    const mgCol1X = 50;
    const mgCol2X = 660;
    for (let i = 0; i < this.minigameList.length; i++) {
      const c = i % mgCols;
      const r = Math.floor(i / mgCols);
      const bx = c === 0 ? mgCol1X : mgCol2X;
      const by = mgStartY + r * mgLineH;
      if (x >= bx && x <= bx + mgColW && y >= by && y <= by + 30) {
        this.minigameToggles[this.minigameList[i].key] = !this.minigameToggles[this.minigameList[i].key];
        return;
      }
    }
  },

  handleMouseMove(x, y) {
    this.hoveredItem = null;
    const canvas = document.getElementById('gameCanvas');

    // Difficulty cards
    const diffCardW = 108;
    const diffGap = 8;
    const totalDiffW = 10 * diffCardW + 9 * diffGap;
    const diffStartX = (1280 - totalDiffW) / 2;
    const diffY = 115;
    for (let i = 0; i < 10; i++) {
      const cx = diffStartX + i * (diffCardW + diffGap);
      if (x >= cx && x <= cx + diffCardW && y >= diffY && y <= diffY + 36) {
        this.hoveredItem = 'diff_' + (i + 1);
        canvas.style.cursor = 'pointer';
        return;
      }
    }

    // Play As toggle
    const toggleX = 50;
    const toggleY = 195;
    const toggleW = 200;
    const toggleH = 32;
    if (y >= toggleY && y <= toggleY + toggleH && x >= toggleX && x <= toggleX + toggleW) {
      this.hoveredItem = 'play_' + (x < toggleX + toggleW / 2 ? 'white' : 'black');
      canvas.style.cursor = 'pointer';
      return;
    }

    // Minigame toggles
    const mgStartY = 302;
    const mgLineH = 36;
    const mgCols = 2;
    const mgColW = 580;
    const mgCol1X = 50;
    const mgCol2X = 660;
    for (let i = 0; i < this.minigameList.length; i++) {
      const c = i % mgCols;
      const r = Math.floor(i / mgCols);
      const bx = c === 0 ? mgCol1X : mgCol2X;
      const by = mgStartY + r * mgLineH;
      if (x >= bx && x <= bx + mgColW && y >= by && y <= by + 30) {
        this.hoveredItem = 'mg_' + this.minigameList[i].key;
        canvas.style.cursor = 'pointer';
        return;
      }
    }

    // Start/back buttons
    if ((x >= 1280 - 250 && x <= 1280 - 30 && y >= 725 && y <= 775) ||
        (x >= 30 && x <= 190 && y >= 730 && y <= 770)) {
      canvas.style.cursor = 'pointer';
      return;
    }

    canvas.style.cursor = 'default';
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      switchScreen('home');
      return;
    }
  },
};