class CoinFlip {
  constructor() {
    this.name = 'Coin Flip';
    this.done = false;
    this.winner = null;
    this.round = 0;
    this.maxRounds = 3;
    this.playerScore = 0;
    this.cpuScore = 0;
    this.flipping = false;
    this.flipResult = null;
    this.playerChoice = null;
    this.difficulty = 1;
  }

  init(attacker, defender, difficulty, isDuel) {
    this.done = false;
    this.winner = null;
    this.round = 0;
    this.playerScore = 0;
    this.cpuScore = 0;
    this.flipping = false;
    this.difficulty = difficulty || 1;
    this.maxRounds = (isDuel ? 5 : 3) + Math.floor(this.difficulty / 2);
  }

  update(dt) {}

  botPlay(dt, timer) {
    if (this.done || this.flipping || this.round >= this.maxRounds) return;
    // Bot picks randomly
    if (timer > 0.5) {
      const x = Math.random() > 0.5 ? 500 : 800;
      this.handleClick(x, 300);
    }
  }

  handleKey(key) {
    if (this.done || this.flipping || this.round >= this.maxRounds) return;
    if (key === 'ArrowLeft' || key === 'a' || key === 'h' || key === 'H') {
      this.playerChoice = 'heads';
    } else if (key === 'ArrowRight' || key === 'd' || key === 't' || key === 'T' || key === ' ' || key === 'Enter') {
      this.playerChoice = 'tails';
    } else {
      return;
    }
    this._doFlip();
  }

  handleClick(x, y) {
    if (this.done || this.flipping || this.round >= this.maxRounds) return;

    const w = 700;
    const h = 460;
    const cx = (1280 - w) / 2;
    const cy = (800 - h) / 2 + 95;

    // Heads button (left half)
    if (x < 640) {
      this.playerChoice = 'heads';
    } else {
      this.playerChoice = 'tails';
    }
    this._doFlip();
  }

  _doFlip() {
    if (this.flipping) return;

    this.flipping = true;
    audioManager.playTone(400, 0.05, 'square', 0.05);

    setTimeout(() => {
      this.flipResult = Math.random() > 0.5 ? 'heads' : 'tails';
      this.round++;

      if (this.playerChoice === this.flipResult) {
        this.playerScore++;
        audioManager.playTone(600, 0.1, 'square', 0.08);
      } else {
        this.cpuScore++;
        audioManager.playTone(300, 0.1, 'sawtooth', 0.06);
      }

      setTimeout(() => {
        this.flipping = false;
        if (this.round >= this.maxRounds) {
          this.done = true;
          this.winner = this.playerScore >= this.cpuScore ? 'attacker' : 'defender';
        }
      }, 800);
    }, 600);
  }

  render(ctx, x, y, w, h) {
    const cols = ThemeManager.getTheme(store.get('theme')).colors;
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('COIN FLIP', x + w / 2, y + 20);
    ctx.font = '11px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Pick Heads or Tails! Round ' + (this.round + 1) + '/' + this.maxRounds, x + w / 2, y + 38);

    // Score
    ctx.fillStyle = cols.accent;
    ctx.font = '13px monospace';
    ctx.fillText('You: ' + this.playerScore + ' | Defender: ' + this.cpuScore, x + w / 2, y + 58);

    // Coin
    const cx = x + w / 2;
    const cy = y + 130;
    const coinSize = 60;

    if (this.flipping) {
      // Animate coin with 3D flip effect
      const t = Date.now() / 50;
      const scaleX = Math.abs(Math.cos(t));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scaleX, 1);
      // Coin body with gradient
      const coinGrad = ctx.createLinearGradient(-coinSize, -coinSize, coinSize, coinSize);
      coinGrad.addColorStop(0, '#ffee66');
      coinGrad.addColorStop(0.5, '#ffcc00');
      coinGrad.addColorStop(1, '#cc9900');
      ctx.fillStyle = coinGrad;
      ctx.beginPath();
      ctx.arc(0, 0, coinSize, 0, Math.PI * 2);
      ctx.fill();
      // Inner ring
      ctx.strokeStyle = '#cc9900';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, coinSize * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#664400';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('?', 0, 7);
      ctx.restore();
    } else {
      // Show result
      const coinGrad = ctx.createRadialGradient(cx - coinSize * 0.3, cy - coinSize * 0.3, coinSize * 0.1, cx, cy, coinSize);
      coinGrad.addColorStop(0, '#ffee66');
      coinGrad.addColorStop(0.5, '#ffcc00');
      coinGrad.addColorStop(1, '#cc9900');
      ctx.fillStyle = coinGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coinSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cc9900';
      ctx.lineWidth = 3;
      ctx.stroke();
      // Inner ring
      ctx.strokeStyle = '#aa8800';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, coinSize * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      if (this.flipResult) {
        ctx.fillStyle = '#664400';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(this.flipResult.toUpperCase(), cx, cy + 5);
      } else {
        ctx.fillStyle = '#664400';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('?', cx, cy + 6);
      }
    }

    // Buttons
    if (!this.flipping && !this.done) {
      // Heads
      ctx.fillStyle = cols.buttonBg;
      ctx.fillRect(x + 100, y + 210, 180, 45);
      ctx.strokeStyle = cols.text + '44';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 100, y + 210, 180, 45);
      ctx.fillStyle = cols.text;
      ctx.font = '14px monospace';
      ctx.fillText('HEADS', x + 190, y + 237);

      // Tails
      ctx.fillStyle = cols.buttonBg;
      ctx.fillRect(x + w - 280, y + 210, 180, 45);
      ctx.strokeStyle = cols.text + '44';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + w - 280, y + 210, 180, 45);
      ctx.fillStyle = cols.text;
      ctx.font = '14px monospace';
      ctx.fillText('TAILS', x + w - 190, y + 237);
    }

    if (this.done) {
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 16px monospace';
      ctx.fillText(this.winner === 'attacker' ? 'YOU WIN!' : 'Defender wins!', x + w / 2, y + h - 20);
    }
  }
}
