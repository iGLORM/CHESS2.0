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

  handleClick(screenX, screenY) {
    if (this.done) return;

    const rect = this.lastRect || { x: 0, y: 0, w: 1, h: 1 };
    const gameX = rect.x;
    const gameY = rect.y;

    // Number grid starts at gameY + 75 (same as render)
    const btnSize = 36;
    const gap = 6;
    const perRow = 10;
    const totalW = perRow * (btnSize + gap) - gap;
    const startX = gameX + (rect.w - totalW) / 2;
    const startY = gameY + 170;

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
      // Binary search
      const guess = Math.floor((this.botMin + this.botMax) / 2);
      if (guess >= this.botMin && guess <= this.botMax) {
        this.makeGuess(guess);
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

  _roundRect(ctx, rx, ry, rw, rh, r) {
    r = Math.min(r, rw / 2, rh / 2);
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
    ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
    ctx.arcTo(rx, ry + rh, rx, ry, r);
    ctx.arcTo(rx, ry, rx + rw, ry, r);
    ctx.closePath();
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

  _resultOverlay(ctx, x, y, w, h, cols) {
    if (!this.done) return;
    const win = this.winner === 'attacker';
    ctx.save();
    ctx.fillStyle = win ? 'rgba(80, 220, 130, 0.30)' : 'rgba(220, 70, 80, 0.30)';
    ctx.fillRect(x, y, w, h);
    ctx.shadowColor = win ? cols.accent : (cols.highlight || cols.accent);
    ctx.shadowBlur = 14;
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(win ? 'You Win!' : 'You Lose!', x + w / 2, y + h / 2);
    ctx.restore();
  }

  render(ctx, x, y, w, h) {
    const cols = ThemeManager.getTheme(store.get('theme')).colors;
    this.lastRect = { x, y, w, h };
    ctx.fillStyle = cols.background || cols.bg || cols.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NUMBER GUESS', x + w / 2, y + 30);
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Guess the number between 1-' + this.maxNum + ' (' + this.guesses.length + '/' + this.maxGuesses + ')', x + w / 2, y + 50);

    const panelX = x + Math.max(28, w * 0.08);
    const panelW = w - (panelX - x) * 2;
    this._roundRect(ctx, panelX, y + 62, panelW, 88, 8);
    ctx.fillStyle = cols.panel + 'dd';
    ctx.fill();
    ctx.strokeStyle = cols.text + '22';
    ctx.stroke();

    const bounds = this._rangeBounds();
    const rangeX = panelX + 22;
    const rangeY = y + 102;
    const rangeW = panelW - 44;
    const tempGrad = ctx.createLinearGradient(rangeX, rangeY, rangeX + rangeW, rangeY);
    tempGrad.addColorStop(0, cols.panel);
    tempGrad.addColorStop(0.5, cols.accent);
    tempGrad.addColorStop(1, cols.highlight || cols.accent);
    ctx.fillStyle = cols.text + '22';
    ctx.fillRect(rangeX, rangeY, rangeW, 12);
    const lowPct = (bounds.low - 1) / Math.max(1, this.maxNum - 1);
    const highPct = (bounds.high - 1) / Math.max(1, this.maxNum - 1);
    ctx.fillStyle = tempGrad;
    ctx.fillRect(rangeX + rangeW * lowPct, rangeY, Math.max(3, rangeW * (highPct - lowPct)), 12);
    ctx.strokeStyle = cols.text + '44';
    ctx.strokeRect(rangeX, rangeY, rangeW, 12);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Remaining: ' + bounds.low + '-' + bounds.high, x + w / 2, y + 88);

    if (this.feedback && this.feedbackTimer > 0) {
      const alpha = Math.min(1, this.feedbackTimer / 0.25);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.feedback === 'Cooler' ? cols.text : (cols.highlight || cols.accent);
      ctx.font = 'bold 13px monospace';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.fillText(this.feedback, x + w / 2, y + 136 - (1 - alpha) * 8);
      ctx.restore();
    }

    // Number grid
    const btnSize = 36;
    const gap = 6;
    const perRow = 10;
    const totalW = perRow * (btnSize + gap) - gap;
    const startX = x + (w - totalW) / 2;
    const startY = y + 170;

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
      const r = 5;
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + btnSize - r, by);
      ctx.arcTo(bx + btnSize, by, bx + btnSize, by + r, r);
      ctx.lineTo(bx + btnSize, by + btnSize - r);
      ctx.arcTo(bx + btnSize, by + btnSize, bx + btnSize - r, by + btnSize, r);
      ctx.lineTo(bx + r, by + btnSize);
      ctx.arcTo(bx, by + btnSize, bx, by + btnSize - r, r);
      ctx.lineTo(bx, by + r);
      ctx.arcTo(bx, by, bx + r, by, r);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = guess ? cols.text + '66' : cols.text + '33';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = cols.text;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('' + num, bx + btnSize / 2, by + btnSize / 2 + 4);
    }

    this._resultOverlay(ctx, x, y, w, h, cols);
  }

  cleanup() {}
}
