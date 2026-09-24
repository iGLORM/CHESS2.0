class NumberGuess {
  constructor() {
    this.name = 'Number Guess';
    this.done = false;
    this.winner = null;
    this.target = 0;
    this.guesses = [];
    this.maxGuesses = 5;
    this.difficulty = 1;
    this.feedback = null;
    this.feedbackTimer = 0;
    this.lastRect = { x: 0, y: 0, w: 1, h: 1 };
  }

  init(attacker, defender, difficulty, isDuel) {
    this.done = false;
    this.winner = null;
    this.difficulty = difficulty || 1;
    this.maxNum = 10 + this.difficulty * 10;
    this.target = Math.floor(Math.random() * this.maxNum) + 1;
    this.guesses = [];
    this.maxGuesses = isDuel ? 7 : 5;
    this.keyBuffer = '';
    this.feedback = null;
    this.feedbackTimer = 0;
    if (audioManager) audioManager.playMiniGameStart();
  }

  update(dt) {
    if (this.feedbackTimer > 0) this.feedbackTimer = Math.max(0, this.feedbackTimer - dt);
  }

  handleKey(key) {
    if (this.done) return;
    if (key >= '0' && key <= '9') {
      if (!this.keyBuffer) this.keyBuffer = '';
      this.keyBuffer += key;
      const num = parseInt(this.keyBuffer, 10);
      if (num > this.maxNum) this.keyBuffer = '' + key;
    } else if (key === 'Backspace') {
      if (this.keyBuffer) this.keyBuffer = this.keyBuffer.slice(0, -1);
    } else if (key === 'Enter') {
      if (this.keyBuffer) {
        const num = parseInt(this.keyBuffer, 10);
        if (num > 0 && num <= this.maxNum && !this.guesses.some(g => g.num === num)) {
          this.makeGuess(num);
        }
        this.keyBuffer = '';
      }
    }
  }

  _gridLayout(rect) {
    const w = rect.w;
    const h = rect.h;
    // Header takes ~28% of height (title, subtitle, range panel, feedback)
    const headerSpace = h * 0.28;
    const availW = w - w * 0.08;
    const availH = h - headerSpace - h * 0.04;
    const perRow = 10;
    const totalRows = Math.ceil(this.maxNum / perRow);
    const maxBtnFromW = (availW - (perRow - 1) * 6) / perRow;
    const maxBtnFromH = (availH - (totalRows - 1) * 6) / totalRows;
    const btnSize = Math.max(28, Math.min(48, maxBtnFromW, maxBtnFromH));
    const gap = Math.max(4, Math.min(8, btnSize * 0.15));
    const totalW = perRow * (btnSize + gap) - gap;
    const startX = rect.x + (w - totalW) / 2;
    const startY = rect.y + headerSpace;
    return { btnSize, gap, perRow, startX, startY };
  }

  handleClick(screenX, screenY) {
    if (this.done) return;

    const rect = this.lastRect || { x: 0, y: 0, w: 1, h: 1 };
    const { btnSize, gap, perRow, startX, startY } = this._gridLayout(rect);

    const col = Math.floor((screenX - startX) / (btnSize + gap));
    const row = Math.floor((screenY - startY) / (btnSize + gap));
    if (col >= 0 && col < perRow && row >= 0) {
      const num = row * perRow + col + 1;
      if (num > 0 && num <= this.maxNum && !this.guesses.some(g => g.num === num)) {
        this.makeGuess(num);
      }
    }
  }

  botPlay(dt, timer) {
    if (this.done) return;
    if (!this.botMin) this.botMin = 1;
    if (!this.botMax) this.botMax = this.maxNum;

    if (timer > 0.5 && this.guesses.length < this.maxGuesses) {
      // Binary search with intentional imperfection
      let botGuess = Math.floor((this.botMin + this.botMax) / 2);
      const offset = Math.floor(Math.random() * (1 - (this.difficulty || 1) / 10) * 15);
      const direction = Math.random() < 0.5 ? 1 : -1;
      botGuess = botGuess + offset * direction;
      botGuess = Math.max(this.botMin, Math.min(this.botMax, botGuess));
      if (botGuess >= this.botMin && botGuess <= this.botMax) {
        this.makeGuess(botGuess);
      }
    }
  }

  makeGuess(num) {
    if (this.done) return;
    const result = num === this.target ? 'correct' : (num < this.target ? 'low' : 'high');
    const previousDistance = this.guesses.length ? Math.abs(this.guesses[this.guesses.length - 1].num - this.target) : null;
    const distance = Math.abs(num - this.target);
    this.guesses.push({ num, result, distance });

    if (num === this.target) {
      this.feedback = 'Correct!';
      this.feedbackTimer = 0.8;
      this.done = true;
      this.winner = 'attacker';
      audioManager.playMiniGameWin();
    } else if (this.guesses.length >= this.maxGuesses) {
      this.feedback = num < this.target ? 'Too Low' : 'Too High';
      this.feedbackTimer = 0.8;
      this.done = true;
      this.winner = 'defender';
      audioManager.playMiniGameLose();
    } else {
      this.feedback = previousDistance === null
        ? (num < this.target ? 'Too Low' : 'Too High')
        : (distance < previousDistance ? 'Warmer' : 'Cooler');
      this.feedbackTimer = 0.8;
      audioManager.playTone(num < this.target ? 350 : 550, 0.08, 'square', 0.06);
    }
  }

  _rangeBounds() {
    let low = 1;
    let high = this.maxNum;
    for (const g of this.guesses) {
      if (g.result === 'low') low = Math.max(low, g.num + 1);
      if (g.result === 'high') high = Math.min(high, g.num - 1);
      if (g.result === 'correct') low = high = g.num;
    }
    return { low, high };
  }

  render(ctx, x, y, w, h) {
    const cols = MiniGameUtils.colors();
    this.lastRect = { x, y, w, h };

    // Scale fonts based on available height
    const titleSize = Math.max(18, Math.min(24, h * 0.035));
    const bodySize = Math.max(12, Math.min(16, h * 0.022));
    const labelSize = Math.max(11, Math.min(14, h * 0.018));

    const titleY = y + h * 0.05;
    ctx.fillStyle = cols.text;
    ctx.font = 'bold ' + Math.round(titleSize) + 'px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NUMBER GUESS', x + w / 2, titleY);
    ctx.font = 'bold ' + Math.round(bodySize) + 'px "Pixelify Sans", sans-serif';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Guess the number between 1-' + this.maxNum + ' (' + this.guesses.length + '/' + this.maxGuesses + ')', x + w / 2, titleY + titleSize * 1.2);

    // Range panel
    const panelX = x + Math.max(28, w * 0.08);
    const panelW = w - (panelX - x) * 2;
    const panelY = titleY + titleSize * 1.8;
    const panelH = Math.max(60, h * 0.1);
    MiniGameUtils.roundRect(ctx, panelX, panelY, panelW, panelH, 8);
    ctx.fillStyle = cols.panel + 'dd';
    ctx.fill();
    ctx.strokeStyle = cols.text + '22';
    ctx.stroke();

    const bounds = this._rangeBounds();
    ctx.fillStyle = cols.text;
    ctx.font = 'bold ' + Math.round(bodySize) + 'px "Pixelify Sans", sans-serif';
    ctx.fillText('Remaining: ' + bounds.low + '-' + bounds.high, x + w / 2, panelY + panelH * 0.35);

    const rangeX = panelX + 22;
    const rangeY = panelY + panelH * 0.5;
    const rangeW = panelW - 44;
    const rangeH = Math.max(10, panelH * 0.18);
    const tempGrad = ctx.createLinearGradient(rangeX, rangeY, rangeX + rangeW, rangeY);
    tempGrad.addColorStop(0, cols.panel);
    tempGrad.addColorStop(0.5, cols.accent);
    tempGrad.addColorStop(1, cols.highlight || cols.accent);
    ctx.fillStyle = cols.text + '22';
    ctx.fillRect(rangeX, rangeY, rangeW, rangeH);
    const lowPct = (bounds.low - 1) / Math.max(1, this.maxNum - 1);
    const highPct = (bounds.high - 1) / Math.max(1, this.maxNum - 1);
    ctx.fillStyle = tempGrad;
    ctx.fillRect(rangeX + rangeW * lowPct, rangeY, Math.max(3, rangeW * (highPct - lowPct)), rangeH);
    ctx.strokeStyle = cols.text + '44';
    ctx.strokeRect(rangeX, rangeY, rangeW, rangeH);

    if (this.feedback && this.feedbackTimer > 0) {
      const alpha = Math.min(1, this.feedbackTimer / 0.25);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.feedback === 'Cooler' ? cols.text : (cols.highlight || cols.accent);
      const feedbackSize = Math.max(13, Math.min(18, h * 0.025));
      ctx.font = 'bold ' + Math.round(feedbackSize) + 'px "Pixelify Sans", sans-serif';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.fillText(this.feedback, x + w / 2, panelY + panelH + h * 0.04 - (1 - alpha) * 8);
      ctx.restore();
    }

    // Number grid - use shared layout calculation
    const { btnSize, gap, perRow, startX, startY } = this._gridLayout({ x, y, w, h });
    const btnFontSize = Math.max(10, Math.min(14, btnSize * 0.35));
    const btnR = Math.max(3, btnSize * 0.12);

    for (let num = 1; num <= this.maxNum; num++) {
      const row = Math.floor((num - 1) / perRow);
      const col = (num - 1) % perRow;
      const bx = startX + col * (btnSize + gap);
      const by = startY + row * (btnSize + gap);

      const guess = this.guesses.find(g => g.num === num);
      if (guess) {
        ctx.fillStyle = guess.result === 'correct' ? cols.accent : (cols.highlight || cols.panel);
        ctx.shadowColor = guess.result === 'correct' ? cols.accent : (cols.highlight || cols.accent);
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = cols.buttonBg;
        ctx.shadowBlur = 0;
      }
      // Rounded rect
      ctx.beginPath();
      ctx.moveTo(bx + btnR, by);
      ctx.lineTo(bx + btnSize - btnR, by);
      ctx.arcTo(bx + btnSize, by, bx + btnSize, by + btnR, btnR);
      ctx.lineTo(bx + btnSize, by + btnSize - btnR);
      ctx.arcTo(bx + btnSize, by + btnSize, bx + btnSize - btnR, by + btnSize, btnR);
      ctx.lineTo(bx + btnR, by + btnSize);
      ctx.arcTo(bx, by + btnSize, bx, by + btnSize - btnR, btnR);
      ctx.lineTo(bx, by + btnR);
      ctx.arcTo(bx, by, bx + btnR, by, btnR);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = guess ? cols.text + '66' : cols.text + '33';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = cols.text;
      ctx.font = 'bold ' + Math.round(btnFontSize) + 'px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('' + num, bx + btnSize / 2, by + btnSize / 2 + btnFontSize * 0.3);
    }

    if (this.done) {
      MiniGameUtils.drawResultOverlay(ctx, x, y, w, h, this.winner === 'attacker', cols);
    }
  }

  cleanup() {}
}
