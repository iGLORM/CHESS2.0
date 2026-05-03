class PatternPress {
  constructor() {
    this.name = 'Pattern Press';
    this.done = false;
    this.winner = null;
    this.sequence = [];
    this.playerSequence = [];
    this.showing = false;
    this.showIndex = 0;
    this.showTimer = 0;
    this.waitingForInput = false;
    this.currentStep = 0;
    this.length = 0;
    this.maxLength = 6;
    this.colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44'];
    this.keys = ['q', 'w', 'e', 'r'];
  }

  init(attacker, defender) {
    this.done = false;
    this.winner = null;
    this.sequence = [];
    this.playerSequence = [];
    this.showing = false;
    this.waitingForInput = false;
    this.currentStep = 0;
    this.length = 3;

    this.generateSequence();
    this.startShow();
  }

  generateSequence() {
    this.sequence = [];
    for (let i = 0; i < this.length; i++) {
      this.sequence.push(Math.floor(Math.random() * 4));
    }
  }

  startShow() {
    this.showing = true;
    this.showIndex = 0;
    this.showTimer = 0;
  }

  update(dt) {
    if (this.done) return;

    if (this.showing) {
      this.showTimer += dt;
      if (this.showTimer > 0.6) {
        this.showTimer = 0;
        this.showIndex++;
        if (this.showIndex >= this.sequence.length) {
          this.showing = false;
          this.waitingForInput = true;
          this.currentStep = 0;
          this.playerSequence = [];
        }
      }
    }
  }

  handleKey(key) {
    if (!this.waitingForInput || this.done) return;

    const idx = this.keys.indexOf(key.toLowerCase());
    if (idx === -1) return;

    this.playerSequence.push(idx);
    this.currentStep++;

    if (idx === this.sequence[this.currentStep - 1]) {
      audioManager.playTone(600 + idx * 100, 0.1, 'square', 0.08);
      if (this.currentStep >= this.sequence.length) {
        // Completed the sequence
        this.length++;
        if (this.length > this.maxLength) {
          this.done = true;
          this.winner = 'attacker';
          audioManager.playMiniGameWin();
        } else {
          this.waitingForInput = false;
          setTimeout(() => {
            this.generateSequence();
            this.startShow();
          }, 500);
        }
      }
    } else {
      // Wrong!
      this.done = true;
      this.winner = 'defender';
      audioManager.playMiniGameLose();
    }
  }

  render(ctx, x, y, w, h) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PATTERN PRESS', x + w / 2, y + 35);

    ctx.font = '11px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Repeat the pattern! Length: ' + this.length + '/' + this.maxLength, x + w / 2, y + 55);

    // Color buttons
    const btnSize = 60;
    const gap = 15;
    const totalW = 4 * (btnSize + gap) - gap;
    const startX = x + (w - totalW) / 2;
    const startY = y + 90;

    for (let i = 0; i < 4; i++) {
      const bx = startX + i * (btnSize + gap);
      const by = startY;

      // Button
      const isActive = this.showing && this.showIndex < this.sequence.length &&
                       i === this.sequence[this.showIndex] &&
                       Math.floor(this.showTimer / 0.3) % 2 === 0;

      ctx.fillStyle = isActive ? this.colors[i] : this.darkenColor(this.colors[i], 0.5);
      ctx.fillRect(bx, by, btnSize, btnSize);
      ctx.strokeStyle = cols.text + '44';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, btnSize, btnSize);

      // Key label
      ctx.fillStyle = isActive ? '#fff' : cols.text + '88';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.keys[i].toUpperCase(), bx + btnSize / 2, by + btnSize / 2 + 5);
    }

    // Sequence display
    if (this.waitingForInput) {
      ctx.fillStyle = cols.text;
      ctx.font = '14px monospace';
      ctx.fillText('Your turn! Repeat the pattern', x + w / 2, startY + btnSize + 30);

      // Show progress
      const progressY = startY + btnSize + 55;
      for (let i = 0; i < this.sequence.length; i++) {
        const dotX = x + w / 2 - this.sequence.length * 10 + i * 20;
        const filled = i < this.playerSequence.length;
        ctx.fillStyle = filled ? this.colors[this.playerSequence[i]] : cols.text + '44';
        ctx.beginPath();
        ctx.arc(dotX, progressY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.done) {
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 18px monospace';
      ctx.fillText(this.winner === 'attacker' ? 'YOU WIN!' : 'Defender wins!', x + w / 2, y + 250);
    }
  }

  handleClick(screenX, screenY) {
    if (!this.waitingForInput || this.done) return;

    const btnSize = 60;
    const gap = 15;
    const totalW = 4 * (btnSize + gap) - gap;
    // Use screen coords - game render area is at overlayX+20, overlayY+95
    const overlayX = Math.floor((1280 - 700) / 2);
    const overlayY = Math.floor((800 - 460) / 2);
    const gameX = overlayX + 20;
    const gameY = overlayY + 95;
    const startX = gameX + (660 - totalW) / 2;
    const startY = gameY + 90;

    for (let i = 0; i < 4; i++) {
      const bx = startX + i * (btnSize + gap);
      const by = startY;
      if (screenX >= bx && screenX <= bx + btnSize && screenY >= by && screenY <= by + btnSize) {
        this.handleKey(this.keys[i]);
        return;
      }
    }
  }

  darkenColor(hex, amt) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * amt)},${Math.floor(g * amt)},${Math.floor(b * amt)})`;
  }
}
