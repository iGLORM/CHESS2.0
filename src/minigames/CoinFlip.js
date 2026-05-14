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
    this.sparkles = [];
    this.lastRect = { x: 0, y: 0, w: 1, h: 1 };
  }

  init(attacker, defender, difficulty, isDuel) {
    this.done = false;
    this.winner = null;
    this.round = 0;
    this.playerScore = 0;
    this.cpuScore = 0;
    this.flipping = false;
    this.flipResult = null;
    this.playerChoice = null;
    this.difficulty = difficulty || 1;
    this.maxRounds = (isDuel ? 5 : 3) + Math.floor(this.difficulty / 2);
    this.sparkles = [];
    if (audioManager) audioManager.playMiniGameStart();
  }

  update(dt) {
    if (this.flipping && Math.random() < 0.8) {
      const a = Math.random() * Math.PI * 2;
      const r = 70 + Math.random() * 24;
      this.sparkles.push({
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.35 + Math.random() * 0.25,
        size: 2 + Math.random() * 3,
      });
    }
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      this.sparkles[i].life -= dt;
      if (this.sparkles[i].life <= 0) this.sparkles.splice(i, 1);
    }
  }

  botPlay(dt, timer) {
    if (this.done || this.flipping || this.round >= this.maxRounds) return;
    // Bot picks randomly
    if (timer > 0.5) {
      const rect = this.lastRect || { x: 0, y: 0, w: 1, h: 1 };
      const sx = Math.random() > 0.5 ? rect.x + rect.w * 0.3 : rect.x + rect.w * 0.7;
      this.handleClick(sx, rect.y + rect.h * 0.5);
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

    // Heads button (left half)
    const rect = this.lastRect || { x: 0, y: 0, w: 1, h: 1 };
    if (x < rect.x + rect.w / 2) {
      this.playerChoice = 'heads';
    } else {
      this.playerChoice = 'tails';
    }
    this._doFlip();
  }

  _doFlip() {
    if (this.flipping) return;

    this.flipping = true;
    this.pendingResult = null;
    audioManager.playTone(400, 0.05, 'square', 0.05);

    setTimeout(() => {
      // Subtle bias based on difficulty (43-57% win chance range)
      const winChance = 0.5 + (5 - (this.difficulty || 5)) * 0.015;
      const playerWins = Math.random() < winChance;
      this.pendingResult = playerWins ? this.playerChoice : (this.playerChoice === 'heads' ? 'tails' : 'heads');

      setTimeout(() => {
        this.flipping = false;
        this.flipResult = this.pendingResult;
        this.round++;
        if (this.playerChoice === this.flipResult) {
          this.playerScore++;
          audioManager.playTone(600, 0.1, 'square', 0.08);
        } else {
          this.cpuScore++;
          audioManager.playTone(300, 0.1, 'sawtooth', 0.06);
        }
        if (this.round >= this.maxRounds) {
          this.done = true;
          this.winner = this.playerScore >= this.cpuScore ? 'attacker' : 'defender';
          if (audioManager) {
            if (this.winner === 'attacker') audioManager.playMiniGameWin();
            else audioManager.playMiniGameLose();
          }
        }
      }, 800);
    }, 600);
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
    ctx.font = 'bold 18px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COIN FLIP', x + w / 2, y + 30);
    ctx.font = 'bold 12px "Pixelify Sans", sans-serif';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Pick Heads or Tails! Round ' + (this.round + 1) + '/' + this.maxRounds, x + w / 2, y + 50);

    // Score
    ctx.fillStyle = cols.panel + 'dd';
    ctx.fillRect(x + w / 2 - 130, y + 58, 260, 24);
    ctx.fillStyle = cols.accent;
    ctx.font = 'bold 13px "Pixelify Sans", sans-serif';
    ctx.fillText('You: ' + this.playerScore + ' | Defender: ' + this.cpuScore, x + w / 2, y + 70);

    // Coin
    const cx = x + w / 2;
    const cy = y + 150;
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
      coinGrad.addColorStop(0, cols.highlight || cols.accent);
      coinGrad.addColorStop(0.5, cols.accent);
      coinGrad.addColorStop(1, cols.panel);
      ctx.fillStyle = coinGrad;
      ctx.beginPath();
      ctx.arc(0, 0, coinSize, 0, Math.PI * 2);
      ctx.fill();
      // Inner ring
      ctx.strokeStyle = cols.highlight || cols.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, coinSize * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = cols.panel;
      ctx.font = 'bold 20px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', 0, 7);
      ctx.restore();
    } else {
      // Show result
      if (this.flipResult) {
        ctx.save();
        ctx.shadowColor = cols.accent;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = cols.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, coinSize + 10 + Math.sin(Date.now() / 180) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      const coinGrad = ctx.createRadialGradient(cx - coinSize * 0.3, cy - coinSize * 0.3, coinSize * 0.1, cx, cy, coinSize);
      coinGrad.addColorStop(0, cols.highlight || cols.accent);
      coinGrad.addColorStop(0.5, cols.accent);
      coinGrad.addColorStop(1, cols.panel);
      ctx.fillStyle = coinGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coinSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = cols.highlight || cols.accent;
      ctx.lineWidth = 3;
      ctx.stroke();
      // Inner ring
      ctx.strokeStyle = cols.panel;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, coinSize * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      if (this.flipResult) {
        ctx.fillStyle = cols.panel;
        ctx.font = 'bold 16px "Pixelify Sans", sans-serif';
        ctx.fillText(this.flipResult.toUpperCase(), cx, cy + 5);
      } else {
        ctx.fillStyle = cols.panel;
        ctx.font = 'bold 20px "Pixelify Sans", sans-serif';
        ctx.fillText('?', cx, cy + 6);
      }
    }

    for (const s of this.sparkles) {
      const alpha = Math.max(0, s.life / s.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = cols.highlight || cols.accent;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx + s.x, cy + s.y, s.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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
      ctx.font = '14px "Pixelify Sans", sans-serif';
      ctx.fillText('HEADS', x + 190, y + 237);

      // Tails
      ctx.fillStyle = cols.buttonBg;
      ctx.fillRect(x + w - 280, y + 210, 180, 45);
      ctx.strokeStyle = cols.text + '44';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + w - 280, y + 210, 180, 45);
      ctx.fillStyle = cols.text;
      ctx.font = '14px "Pixelify Sans", sans-serif';
      ctx.fillText('TAILS', x + w - 190, y + 237);
    }

    if (this.done) {
      MiniGameUtils.drawResultOverlay(ctx, x, y, w, h, this.winner === 'attacker', cols);
    }
  }

  cleanup() {}
}
