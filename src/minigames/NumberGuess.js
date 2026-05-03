class NumberGuess {
  constructor() {
    this.name = 'Number Guess';
    this.done = false;
    this.winner = null;
    this.target = 0;
    this.guesses = [];
    this.maxGuesses = 5;
    this.difficulty = 1;
  }

  init(attacker, defender, difficulty, isDuel) {
    this.done = false;
    this.winner = null;
    this.difficulty = difficulty || 1;
    // Higher difficulty = larger range, but keep it solvable with perfect play
    this.maxNum = 10 + this.difficulty * 10;
    this.target = Math.floor(Math.random() * this.maxNum) + 1;
    this.guesses = [];
    this.maxGuesses = isDuel ? 7 : 5;
  }

  update(dt) {}

  handleClick(screenX, screenY) {
    if (this.done) return;

    const overlayX = Math.floor((1280 - 700) / 2);
    const overlayY = Math.floor((800 - 460) / 2);
    const gameX = overlayX + 20;
    const gameY = overlayY + 95;

    // Number grid starts at gameY + 75 (same as render)
    const btnSize = 36;
    const gap = 6;
    const perRow = 10;
    const totalW = perRow * (btnSize + gap) - gap;
    const startX = gameX + (660 - totalW) / 2;
    const startY = gameY + 75;

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
    this.guesses.push({ num, result });

    if (num === this.target) {
      this.done = true;
      this.winner = 'attacker';
      audioManager.playMiniGameWin();
    } else if (this.guesses.length >= this.maxGuesses) {
      this.done = true;
      this.winner = 'defender';
      audioManager.playMiniGameLose();
    } else {
      audioManager.playTone(num < this.target ? 350 : 550, 0.08, 'square', 0.06);
    }
  }

  render(ctx, x, y, w, h) {
    const cols = ThemeManager.getTheme(store.get('theme')).colors;
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NUMBER GUESS', x + w / 2, y + 20);
    ctx.font = '11px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Guess the number between 1-' + this.maxNum + ' (' + this.guesses.length + '/' + this.maxGuesses + ')', x + w / 2, y + 38);

    // Last guess hint
    if (this.guesses.length > 0) {
      const last = this.guesses[this.guesses.length - 1];
      ctx.fillStyle = last.result === 'low' ? '#ffaa00' : '#ff4444';
      ctx.font = '12px monospace';
      ctx.fillText(last.num + ' is too ' + last.result + '!', x + w / 2, y + 55);
    }

    // Number grid
    const btnSize = 36;
    const gap = 6;
    const perRow = 10;
    const totalW = perRow * (btnSize + gap) - gap;
    const startX = x + (w - totalW) / 2;
    const startY = y + 75;

    for (let num = 1; num <= this.maxNum; num++) {
      const row = Math.floor((num - 1) / perRow);
      const col = (num - 1) % perRow;
      const bx = startX + col * (btnSize + gap);
      const by = startY + row * (btnSize + gap);

      const guess = this.guesses.find(g => g.num === num);
      if (guess) {
        ctx.fillStyle = guess.result === 'correct' ? '#44aa44' : '#aa2222';
      } else {
        ctx.fillStyle = cols.buttonBg;
      }
      ctx.fillRect(bx, by, btnSize, btnSize);
      ctx.strokeStyle = cols.text + '33';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, btnSize, btnSize);

      ctx.fillStyle = guess ? '#fff' : cols.text;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('' + num, bx + btnSize / 2, by + btnSize / 2 + 4);
    }

    if (this.done) {
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 16px monospace';
      ctx.fillText(this.winner === 'attacker' ? 'YOU WIN! Number was ' + this.target : 'Defender wins! It was ' + this.target, x + w / 2, y + h - 20);
    }
  }
}
