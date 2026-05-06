const BotSelect = {
  levels: [],
  selectedIndex: 2,

  init() {
    this.levels = Object.entries(AIController.LEVEL_CONFIG).map(([level, config]) => ({
      level: parseInt(level),
      name: config.name,
      depth: config.depth,
      noise: config.noise,
      description: this.getDescription(parseInt(level), config),
    }));
    this.selectedIndex = this.levels.findIndex(l => l.level === (store.get('classicDifficulty') || 5));
    if (this.selectedIndex < 0) this.selectedIndex = 4; // default to Skilled (level 5)
  },

  getDescription(level, config) {
    const descs = {
      1: 'Makes random moves. Great for learning the rules.',
      2: 'Still learning. Occasionally finds a decent move.',
      3: 'Thinks one move ahead. Starting to spot basic tactics.',
      4: 'Two moves ahead. Can spot simple traps.',
      5: 'Three moves ahead. Solid positional play.',
      6: 'Three moves deep, very accurate. Tough to beat.',
      7: 'Four moves deep. Expert-level play.',
      8: 'Four moves deep, near perfect. Master-level.',
      9: 'Five moves deep. Grandmaster strength.',
      10: 'Full strength. The ultimate challenge.',
    };
    return descs[level] || 'Depth ' + config.depth + ' search.';
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
    ctx.fillText('SELECT BOT DIFFICULTY', 640, 55);
    ctx.fillStyle = cols.text + '77';
    ctx.font = '12px monospace';
    ctx.fillText('Choose your AI opponent', 640, 80);

    // Grid layout: 5 per row, 2 rows
    const cardW = 200;
    const cardH = 240;
    const gapX = 20;
    const gapY = 20;
    const perRow = 5;
    const startX = (1280 - (perRow * cardW + (perRow - 1) * gapX)) / 2;
    const startY = 110;

    for (let i = 0; i < this.levels.length; i++) {
      const bot = this.levels[i];
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const isHover = i === this.selectedIndex;

      // Card shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + 3, y + 3, cardW, cardH);

      // Card background
      const difficultyHue = 240 - bot.level * 20;
      const cardBg = isHover ? cols.buttonHover : cols.panel;
      ctx.fillStyle = cardBg;
      ctx.fillRect(x, y, cardW, cardH);

      // Card border
      ctx.strokeStyle = isHover ? cols.accent : cols.text + '44';
      ctx.lineWidth = isHover ? 3 : 1.5;
      ctx.strokeRect(x, y, cardW, cardH);

      // Level number (large)
      ctx.fillStyle = isHover ? cols.accent : cols.text;
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(bot.level, x + cardW / 2, y + 72);

      // Name
      ctx.fillStyle = isHover ? cols.accent : cols.text;
      ctx.font = 'bold 14px monospace';
      ctx.fillText(bot.name, x + cardW / 2, y + 100);

      // Depth indicator
      ctx.fillStyle = cols.text + '66';
      ctx.font = '10px monospace';
      ctx.fillText('Depth ' + bot.depth, x + cardW / 2, y + 118);

      // Description
      ctx.fillStyle = cols.text + '88';
      ctx.font = '10px monospace';
      this.wrapText(ctx, bot.description, x + 10, y + 142, cardW - 20, 14);
    }

    // Bottom buttons
    ctx.fillStyle = cols.text + '44';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Click a bot to select. ESC to go back.', 640, 730);

    UIHelpers.drawButton(ctx, 30, 730, 160, 40, '< Back', cols, { font: 'bold 14px monospace' });

    // Start button
    const selBot = this.levels[this.selectedIndex];
    if (selBot) {
      UIHelpers.drawButton(ctx, 1280 - 220, 680, 190, 50, 'START GAME', cols, {
        font: 'bold 16px monospace',
        active: true,
      });
    }
  },

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let ly = y;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxWidth && line !== '') {
        ctx.fillText(line, x, ly);
        line = word + ' ';
        ly += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, ly);
  },

  handleClick(x, y) {
    // Back
    if (x >= 30 && x <= 190 && y >= 730 && y <= 770) {
      switchScreen('home');
      return;
    }

    // Start button
    if (x >= 1280 - 220 && x <= 1280 - 30 && y >= 680 && y <= 730) {
      const selBot = this.levels[this.selectedIndex];
      if (selBot) {
        store.set('classicDifficulty', selBot.level);
        store.set('mode', 'classic');
        store.set('p1IsWhite', true);
        store.set('miniGamesEnabled', true);
        switchScreen('game');
      }
      return;
    }

    // Check card clicks
    const cardW = 200;
    const cardH = 240;
    const gapX = 20;
    const gapY = 20;
    const perRow = 5;
    const startX = (1280 - (perRow * cardW + (perRow - 1) * gapX)) / 2;
    const startY = 110;

    for (let i = 0; i < this.levels.length; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);
      if (x >= cx && x <= cx + cardW && y >= cy && y <= cy + cardH) {
        this.selectedIndex = i;
        return;
      }
    }
  },

  handleMouseMove(x, y) {
    const cardW = 200;
    const cardH = 240;
    const gapX = 20;
    const gapY = 20;
    const perRow = 5;
    const startX = (1280 - (perRow * cardW + (perRow - 1) * gapX)) / 2;
    const startY = 110;

    this.selectedIndex = -1;
    const canvas = document.getElementById('gameCanvas');

    for (let i = 0; i < this.levels.length; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);
      if (x >= cx && x <= cx + cardW && y >= cy && y <= cy + cardH) {
        this.selectedIndex = i;
        canvas.style.cursor = 'pointer';
        return;
      }
    }

    // Start button hover
    if (x >= 1280 - 220 && x <= 1280 - 30 && y >= 680 && y <= 730) {
      canvas.style.cursor = 'pointer';
      return;
    }
    if (x >= 30 && x <= 190 && y >= 730 && y <= 770) {
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
    if (e.key === 'ArrowLeft' && this.selectedIndex % 5 > 0) {
      this.selectedIndex--;
    }
    if (e.key === 'ArrowRight' && this.selectedIndex % 5 < 4) {
      this.selectedIndex++;
    }
    if (e.key === 'ArrowUp' && this.selectedIndex >= 5) {
      this.selectedIndex -= 5;
    }
    if (e.key === 'ArrowDown' && this.selectedIndex < 5) {
      this.selectedIndex += 5;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      const selBot = this.levels[this.selectedIndex];
      if (selBot) {
        store.set('classicDifficulty', selBot.level);
        store.set('mode', 'classic');
        store.set('p1IsWhite', true);
        store.set('miniGamesEnabled', true);
        switchScreen('game');
      }
    }
  },
};