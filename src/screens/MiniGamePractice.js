const MiniGamePractice = {
  selectedOption: 0,
  scrollOffset: 0,
  games: [],
  _previews: {},

  gameIcons: {
    quickClick: 'target', memoryMatch: 'star', timingStrike: 'sword',
    patternPress: 'check', reactionTest: 'target', undertaleDodge: 'shield',
    powerMeter: 'gear', targetPractice: 'target', dodgeFalling: 'shield',
    rhythmTap: 'music', numberGuess: 'dice', coinFlip: 'dice',
    shieldBlock: 'shield', whackMole: 'sword',
  },

  gameDescriptions: {
    quickClick: 'Click the target as fast as you can!',
    memoryMatch: 'Match pairs of hidden symbols.',
    timingStrike: 'Hit at the perfect moment.',
    patternPress: 'Repeat the flashing pattern.',
    reactionTest: 'React when the signal appears.',
    undertaleDodge: 'Dodge bullets to survive!',
    powerMeter: 'Stop the meter at max power.',
    targetPractice: 'Hit moving targets precisely.',
    dodgeFalling: 'Dodge falling blocks!',
    rhythmTap: 'Tap to the beat.',
    numberGuess: 'Guess the secret number.',
    coinFlip: 'Call the coin flip!',
    shieldBlock: 'Block incoming arrows.',
    whackMole: 'Hit the moles before they hide!',
  },

  gameColors: {
    quickClick: '#ff6644', memoryMatch: '#44aaff', timingStrike: '#ffaa44',
    patternPress: '#aa44ff', reactionTest: '#44ff88', undertaleDodge: '#ff4444',
    powerMeter: '#ff4488', targetPractice: '#44ffaa', dodgeFalling: '#ff8844',
    rhythmTap: '#aa88ff', numberGuess: '#88ff44', coinFlip: '#ffcc44',
    shieldBlock: '#4488ff', whackMole: '#ff44aa',
  },

  init() {
    this.selectedOption = 0;
    this.scrollOffset = 0;
    this.games = [
      { name: 'Quick Click', key: 'quickClick', type: QuickClick },
      { name: 'Memory Match', key: 'memoryMatch', type: MemoryMatch },
      { name: 'Timing Strike', key: 'timingStrike', type: TimingStrike },
      { name: 'Pattern Press', key: 'patternPress', type: PatternPress },
      { name: 'Reaction Test', key: 'reactionTest', type: ReactionTest },
      { name: 'Soul Dodge', key: 'undertaleDodge', type: UndertaleDodge },
      { name: 'Power Meter', key: 'powerMeter', type: PowerMeter },
      { name: 'Target Practice', key: 'targetPractice', type: TargetPractice },
      { name: 'Dodge Falling', key: 'dodgeFalling', type: DodgeFalling },
      { name: 'Rhythm Tap', key: 'rhythmTap', type: RhythmTap },
      { name: 'Number Guess', key: 'numberGuess', type: NumberGuess },
      { name: 'Coin Flip', key: 'coinFlip', type: CoinFlip },
      { name: 'Shield Block', key: 'shieldBlock', type: ShieldBlock },
      { name: 'Whack-a-Mole', key: 'whackMole', type: WhackMole },
    ];
  },

  _drawPreview(ctx, x, y, w, h, gameKey, cols) {
    // Procedural mini-game preview thumbnail
    const color = this.gameColors[gameKey] || cols.accent;
    ctx.fillStyle = cols.panel + 'cc';
    ctx.fillRect(x, y, w, h);

    // Game-specific mini illustrations
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    const cx = x + w / 2;
    const cy = y + h / 2;

    switch (gameKey) {
      case 'quickClick':
      case 'targetPractice':
        // Target circles
        for (let r = 3; r >= 1; r--) {
          ctx.fillStyle = r % 2 === 0 ? color : cols.panel;
          ctx.beginPath();
          ctx.arc(cx, cy, r * 12, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'memoryMatch':
        // Grid of cards
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 3; c++) {
            ctx.fillStyle = color + '44';
            ctx.fillRect(x + 10 + c * 35, y + 10 + r * 35, 28, 28);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 10 + c * 35, y + 10 + r * 35, 28, 28);
          }
        }
        break;
      case 'timingStrike':
      case 'rhythmTap':
        // Timing bar
        ctx.fillStyle = cols.panel;
        ctx.fillRect(x + 10, cy - 4, w - 20, 8);
        ctx.fillStyle = color;
        ctx.fillRect(cx - 4, cy - 8, 8, 16);
        break;
      case 'patternPress':
        // Pattern dots
        const pattern = [1, 0, 1, 1, 0, 1, 0, 0, 1];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            ctx.fillStyle = pattern[r * 3 + c] ? color : color + '33';
            ctx.beginPath();
            ctx.arc(x + 20 + c * 25, y + 15 + r * 25, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      case 'reactionTest':
        // Signal light
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff44';
        ctx.beginPath();
        ctx.arc(cx - 5, cy - 5, 6, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'undertaleDodge':
      case 'dodgeFalling':
        // Heart dodging bullets
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.moveTo(cx, cy + 4);
        ctx.bezierCurveTo(cx, cy - 6, cx - 10, cy - 6, cx - 10, cy);
        ctx.bezierCurveTo(cx - 10, cy + 6, cx, cy + 12, cx, cy + 14);
        ctx.fill();
        // Falling dots
        ctx.fillStyle = color;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(x + 15 + i * 18, y + 10 + i * 12, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'powerMeter':
        // Meter bar
        ctx.fillStyle = cols.panel;
        ctx.fillRect(x + 10, cy - 4, w - 20, 8);
        const pct = 0.7 + Math.sin(Date.now() / 300) * 0.2;
        ctx.fillStyle = color;
        ctx.fillRect(x + 10, cy - 4, (w - 20) * pct, 8);
        break;
      case 'numberGuess':
        // Question mark
        ctx.fillStyle = color;
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', cx, cy + 12);
        break;
      case 'coinFlip':
        // Coin
        ctx.fillStyle = '#ffcc44';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 18, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ddaa22';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case 'shieldBlock':
        // Shield and arrows
        ctx.fillStyle = color;
        ctx.fillRect(cx - 25, cy + 8, 50, 8);
        ctx.fillStyle = '#ff6644';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x + 20 + i * 30, y + 8);
          ctx.lineTo(x + 16 + i * 30, y + 16);
          ctx.lineTo(x + 24 + i * 30, y + 16);
          ctx.closePath();
          ctx.fill();
        }
        break;
      case 'whackMole':
        // Moles popping up
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = color + '88';
          ctx.fillRect(x + 15 + i * 30, y + 15, 20, 30);
          ctx.fillStyle = cols.panel;
          ctx.fillRect(x + 12 + i * 30, y + 12, 26, 8);
        }
        break;
      default:
        ctx.fillStyle = color + '44';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', cx, cy + 8);
    }
    ctx.restore();

    // Border
    ctx.strokeStyle = color + '66';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
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
    ctx.fillText('MINI-GAMES', 640, 50);
    ctx.fillStyle = cols.text + '77';
    ctx.font = '12px monospace';
    ctx.fillText('Practice any mini-game', 640, 72);
    UIHelpers.drawSeparator(ctx, 400, 82, 480, cols);

    // Scrollable card list - 2 columns with preview thumbnails
    const cardW = 540;
    const cardH = 96;
    const gapX = 20;
    const gapY = 12;
    const startY = 100;
    const maxVisible = 6; // rows visible at once
    const col1X = 640 - cardW - gapX / 2;
    const col2X = 640 + gapX / 2;
    const visibleH = maxVisible * (cardH + gapY);

    // Grouping panel behind the card grid
    const panelPad = 10;
    UIHelpers.drawPanel(ctx, col1X - panelPad, startY - panelPad, cardW * 2 + gapX + panelPad * 2, visibleH + panelPad * 2, cols);

    // Clip to visible area
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, startY - 5, 1280, visibleH + 10);
    ctx.clip();

    for (let i = 0; i < this.games.length; i++) {
      const c = i % 2;
      const r = Math.floor(i / 2);
      const bx = c === 0 ? col1X : col2X;
      const by = startY + r * (cardH + gapY) - this.scrollOffset;

      // Skip if not visible
      if (by + cardH < startY - 10 || by > startY + maxVisible * (cardH + gapY) + 10) continue;

      const game = this.games[i];
      const isHover = i === this.selectedOption;
      const gameColor = this.gameColors[game.key] || cols.accent;

      // Card background
      UIHelpers.drawCard(ctx, bx, by, cardW, cardH, cols, {
        hover: isHover,
        accentStripe: isHover ? gameColor : null,
      });

      // Preview thumbnail
      const thumbW = 70;
      const thumbH = 56;
      const thumbX = bx + 8;
      const thumbY = by + (cardH - thumbH) / 2;
      this._drawPreview(ctx, thumbX, thumbY, thumbW, thumbH, game.key, cols);

      // Game name
      ctx.fillStyle = isHover ? gameColor : cols.text;
      ctx.font = isHover ? 'bold 16px monospace' : '15px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(game.name, bx + 86, by + 28);

      // Description
      ctx.fillStyle = cols.text + '77';
      ctx.font = '10px monospace';
      ctx.fillText(this.gameDescriptions[game.key] || '', bx + 86, by + 44);

      // Icon
      const iconType = this.gameIcons[game.key] || 'check';
      UIHelpers.drawIcon(ctx, bx + cardW - 20, by + 10, iconType, 10, cols, {
        color: isHover ? gameColor : cols.text + '55',
      });
    }

    ctx.restore();

    // Scroll indicators
    const totalRows = Math.ceil(this.games.length / 2);
    const totalH = totalRows * (cardH + gapY);
    if (totalH > visibleH) {
      // Scroll bar
      const scrollBarH = visibleH;
      const scrollBarX = 1280 - 20;
      const scrollThumbH = Math.max(30, (scrollBarH / totalH) * scrollBarH);
      const scrollThumbY = startY + (this.scrollOffset / totalH) * scrollBarH;
      ctx.fillStyle = cols.text + '22';
      ctx.fillRect(scrollBarX, startY, 8, scrollBarH);
      ctx.fillStyle = cols.text + '55';
      ctx.fillRect(scrollBarX, scrollThumbY, 8, scrollThumbH);
    }

    // Back button
    UIHelpers.drawButton(ctx, 30, 730, 160, 40, '< Back', cols, { font: 'bold 14px monospace' });
    ctx.fillStyle = cols.text + '44';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Click to play. Scroll or arrows to browse. ESC to go back.', 640, 750);
    UIHelpers.drawDitheredRect(ctx, 0, 770, 1280, 30, cols.accent, '11');
  },

  _getMaxScroll() {
    const cardH = 96;
    const gapY = 12;
    const maxVisible = 6;
    const totalRows = Math.ceil(this.games.length / 2);
    const totalH = totalRows * (cardH + gapY);
    const visibleH = maxVisible * (cardH + gapY);
    return Math.max(0, totalH - visibleH);
  },

  handleClick(x, y) {
    if (x >= 30 && x <= 190 && y >= 730 && y <= 770) {
      switchScreen('settings');
      return;
    }

    const cardW = 540;
    const cardH = 96;
    const gapX = 20;
    const gapY = 12;
    const startY = 100;
    const col1X = 640 - cardW - gapX / 2;
    const col2X = 640 + gapX / 2;

    for (let i = 0; i < this.games.length; i++) {
      const c = i % 2;
      const r = Math.floor(i / 2);
      const bx = c === 0 ? col1X : col2X;
      const by = startY + r * (cardH + gapY) - this.scrollOffset;
      if (x >= bx && x <= bx + cardW && y >= by && y <= by + cardH) {
        this.startGame(this.games[i].type);
        return;
      }
    }
  },

  handleMouseMove(x, y) {
    const cardW = 540;
    const cardH = 96;
    const gapX = 20;
    const gapY = 12;
    const startY = 100;
    const col1X = 640 - cardW - gapX / 2;
    const col2X = 640 + gapX / 2;

    this.selectedOption = -1;
    const canvas = document.getElementById('gameCanvas');

    for (let i = 0; i < this.games.length; i++) {
      const c = i % 2;
      const r = Math.floor(i / 2);
      const bx = c === 0 ? col1X : col2X;
      const by = startY + r * (cardH + gapY) - this.scrollOffset;
      if (x >= bx && x <= bx + cardW && y >= by && y <= by + cardH) {
        this.selectedOption = i;
        canvas.style.cursor = 'pointer';
        return;
      }
    }
    canvas.style.cursor = 'default';
  },

  handleWheel(e) {
    const delta = e.deltaY > 0 ? 30 : -30;
    this.scrollOffset = Math.max(0, Math.min(this._getMaxScroll(), this.scrollOffset + delta));
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      switchScreen('settings');
      return;
    }

    const colsCount = 2;

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      let row = Math.max(0, Math.floor(this.selectedOption / colsCount));
      let col = Math.max(0, this.selectedOption % colsCount);

      if (e.key === 'ArrowUp') row = Math.max(0, row - 1);
      if (e.key === 'ArrowDown') row = Math.min(this.games.length - 1, row + 1);
      if (e.key === 'ArrowLeft') col = Math.max(0, col - 1);
      if (e.key === 'ArrowRight') col = Math.min(colsCount - 1, col + 1);

      let idx = row * colsCount + col;
      if (idx >= this.games.length) idx = this.games.length - 1;
      this.selectedOption = idx;

      // Auto-scroll to keep selection visible
      const cardH = 96;
      const gapY = 12;
      const startY = 100;
      const maxVisible = 6;
      const selY = Math.floor(idx / 2) * (cardH + gapY);
      const visibleTop = this.scrollOffset;
      const visibleBottom = this.scrollOffset + maxVisible * (cardH + gapY);
      if (selY < visibleTop) this.scrollOffset = selY;
      if (selY + cardH > visibleBottom) this.scrollOffset = selY + cardH - maxVisible * (cardH + gapY);
      this.scrollOffset = Math.max(0, Math.min(this._getMaxScroll(), this.scrollOffset));
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.selectedOption >= 0 && this.selectedOption < this.games.length) {
        this.startGame(this.games[this.selectedOption].type);
      }
    }
  },

  startGame(gameType) {
    miniGameManager.startPracticeMiniGame(gameType, (winner) => {});
  },
};