const MiniGamePractice = {
  selectedOption: 0,
  games: [],

  init() {
    this.selectedOption = 0;
    this.games = [
      { name: 'Quick Click', type: QuickClick },
      { name: 'Memory Match', type: MemoryMatch },
      { name: 'Timing Strike', type: TimingStrike },
      { name: 'Pattern Press', type: PatternPress },
      { name: 'Reaction Test', type: ReactionTest },
      { name: 'Soul Dodge', type: UndertaleDodge },
      { name: 'Power Meter', type: PowerMeter },
      { name: 'Target Practice', type: TargetPractice },
      { name: 'Dodge Falling', type: DodgeFalling },
      { name: 'Rhythm Tap', type: RhythmTap },
      { name: 'Number Guess', type: NumberGuess },
      { name: 'Coin Flip', type: CoinFlip },
    ];
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
    ctx.fillText('MINI-GAMES', 640, 60);
    ctx.fillStyle = cols.text + '77';
    ctx.font = '12px monospace';
    ctx.fillText('Practice any mini-game', 640, 85);

    const startY = 130;
    const lineH = 46;
    const colsCount = 2;
    const colW = 460;
    const colX1 = 640 - colW - 20;
    const colX2 = 640 + 20;

    for (let i = 0; i < this.games.length; i++) {
      const c = i % colsCount;
      const r = Math.floor(i / colsCount);
      const bx = c === 0 ? colX1 : colX2;
      const by = startY + r * lineH;
      const isHover = i === this.selectedOption;

      UIHelpers.drawPixelFrame(ctx, bx, by, colW, 38, cols, {
        hover: isHover,
        fill: isHover ? cols.buttonHover : cols.buttonBg,
      });

      ctx.fillStyle = isHover ? cols.accent : cols.text;
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(this.games[i].name, bx + 14, by + 24);
    }

    // Back button
    UIHelpers.drawButton(ctx, 30, 730, 160, 40, '< Back', cols, { font: 'bold 14px monospace' });

    ctx.fillStyle = cols.text + '44';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Click a game to play. ESC to go back.', 640, 750);
  },

  handleClick(x, y) {
    if (x >= 30 && x <= 190 && y >= 730 && y <= 770) {
      switchScreen('settings');
      return;
    }

    const startY = 130;
    const lineH = 46;
    const colsCount = 2;
    const colW = 460;
    const colX1 = 640 - colW - 20;
    const colX2 = 640 + 20;

    for (let i = 0; i < this.games.length; i++) {
      const c = i % colsCount;
      const r = Math.floor(i / colsCount);
      const bx = c === 0 ? colX1 : colX2;
      const by = startY + r * lineH;
      if (x >= bx && x <= bx + colW && y >= by && y <= by + 38) {
        this.startGame(this.games[i].type);
        return;
      }
    }
  },

  handleMouseMove(x, y) {
    this.selectedOption = -1;
    const startY = 130;
    const lineH = 46;
    const colsCount = 2;
    const colW = 460;
    const colX1 = 640 - colW - 20;
    const colX2 = 640 + 20;

    for (let i = 0; i < this.games.length; i++) {
      const c = i % colsCount;
      const r = Math.floor(i / colsCount);
      const bx = c === 0 ? colX1 : colX2;
      const by = startY + r * lineH;
      if (x >= bx && x <= bx + colW && y >= by && y <= by + 38) {
        this.selectedOption = i;
        return;
      }
    }
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      switchScreen('settings');
      return;
    }

    const colsCount = 2;
    const rows = Math.ceil(this.games.length / colsCount);

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      let row = Math.floor(this.selectedOption / colsCount);
      let col = this.selectedOption % colsCount;

      if (e.key === 'ArrowUp') row--;
      if (e.key === 'ArrowDown') row++;
      if (e.key === 'ArrowLeft') col--;
      if (e.key === 'ArrowRight') col++;

      row = Math.max(0, Math.min(rows - 1, row));
      col = Math.max(0, Math.min(colsCount - 1, col));

      let idx = row * colsCount + col;
      if (idx >= this.games.length) idx = this.games.length - 1;
      this.selectedOption = idx;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.selectedOption >= 0 && this.selectedOption < this.games.length) {
        this.startGame(this.games[this.selectedOption].type);
      }
    }
  },

  startGame(gameType) {
    miniGameManager.startPracticeMiniGame(gameType, (winner) => {
      // Practice finished, return to practice menu
    });
  },
};
