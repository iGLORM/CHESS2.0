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
    this.maxRounds = isDuel ? 5 : 3;
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
      const playerWins = Math.random() < 0.5;
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
    const cols = MiniGameUtils.colors();
    this.lastRect = { x, y, w, h };

    // Scale fonts based on available height
    const titleSize = Math.max(18, Math.min(24, h * 0.035));
    const bodySize = Math.max(12, Math.min(16, h * 0.022));
    const labelSize = Math.max(13, Math.min(16, h * 0.02));

    const titleY = y + h * 0.06;
    ctx.fillStyle = cols.text;
    ctx.font = 'bold ' + Math.round(titleSize) + 'px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COIN FLIP', x + w / 2, titleY);
    ctx.font = 'bold ' + Math.round(bodySize) + 'px "Pixelify Sans", sans-serif';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Pick Heads or Tails! Round ' + (this.round + 1) + '/' + this.maxRounds, x + w / 2, titleY + titleSize * 1.3);

    // Score
    const scoreY = titleY + titleSize * 2.2;
    const scorePanelW = Math.min(260, w * 0.6);
    const scorePanelH = Math.max(24, h * 0.04);
    ctx.fillStyle = cols.panel + 'dd';
    ctx.fillRect(x + w / 2 - scorePanelW / 2, scoreY, scorePanelW, scorePanelH);
    ctx.fillStyle = cols.accent;
    ctx.font = 'bold ' + Math.round(bodySize + 1) + 'px "Pixelify Sans", sans-serif';
    ctx.fillText('You: ' + this.playerScore + ' | CPU: ' + this.cpuScore, x + w / 2, scoreY + scorePanelH * 0.65);

    // Coin - centered vertically in the space between score and buttons
    const cx = x + w / 2;
    const coinSize = Math.max(40, Math.min(80, Math.min(w, h) * 0.12));
    // Coin center at ~40% of height
    const cy = y + h * 0.4;
    const coinFontSize = Math.max(16, coinSize * 0.3);

    if (this.flipping) {
      // Animate coin with 3D flip effect
      const t = Date.now() / 50;
      const scaleX = Math.abs(Math.cos(t));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scaleX, 1);
      // Coin body with gradient
      const coinGrad = ctx.createLinearGradient(-coinSize, -coinSize, coinSize, coinSize);
      coinGrad.addColorStop(0, '#fff3c4');
      coinGrad.addColorStop(0.5, cols.gold);
      coinGrad.addColorStop(1, '#a8741a');
      ctx.fillStyle = coinGrad;
      ctx.beginPath();
      ctx.arc(0, 0, coinSize, 0, Math.PI * 2);
      ctx.fill();
      // Inner ring
      ctx.strokeStyle = '#fff3c4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, coinSize * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#6b4708';
      ctx.font = 'bold ' + Math.round(coinFontSize) + 'px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', 0, coinFontSize * 0.35);
      ctx.restore();
    } else {
      // Show result
      if (this.flipResult) {
        ctx.save();
        ctx.shadowColor = cols.gold;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = cols.gold;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, coinSize + 10 + Math.sin(Date.now() / 180) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      const coinGrad = ctx.createRadialGradient(cx - coinSize * 0.3, cy - coinSize * 0.3, coinSize * 0.1, cx, cy, coinSize);
      coinGrad.addColorStop(0, '#fff3c4');
      coinGrad.addColorStop(0.5, cols.gold);
      coinGrad.addColorStop(1, '#a8741a');
      ctx.fillStyle = coinGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coinSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff3c4';
      ctx.lineWidth = 3;
      ctx.stroke();
      // Inner ring
      ctx.strokeStyle = '#a8741a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, coinSize * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      if (this.flipResult) {
        ctx.fillStyle = '#6b4708';
        ctx.font = 'bold ' + Math.round(coinFontSize) + 'px "Pixelify Sans", sans-serif';
        ctx.fillText(this.flipResult.toUpperCase(), cx, cy + coinFontSize * 0.3);
      } else {
        ctx.fillStyle = cols.panel;
        ctx.font = 'bold ' + Math.round(coinFontSize + 4) + 'px "Pixelify Sans", sans-serif';
        ctx.fillText('?', cx, cy + coinFontSize * 0.3);
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

    // Buttons - positioned below the coin with proper spacing
    if (!this.flipping && !this.done) {
      const btnW = Math.max(120, Math.min(180, w * 0.28));
      const btnH = Math.max(60, Math.min(70, h * 0.09));
      const btnGap = Math.max(20, w * 0.04);
      const btnY = cy + coinSize + Math.max(30, h * 0.06);

      // Heads
      const headsX = x + w / 2 - btnW - btnGap / 2;
      ctx.fillStyle = cols.buttonBg;
      ctx.fillRect(headsX, btnY, btnW, btnH);
      ctx.strokeStyle = cols.text + '44';
      ctx.lineWidth = 1;
      ctx.strokeRect(headsX, btnY, btnW, btnH);
      ctx.fillStyle = cols.text;
      ctx.font = Math.round(labelSize) + 'px "Pixelify Sans", sans-serif';
      ctx.fillText('HEADS', headsX + btnW / 2, btnY + btnH / 2 + labelSize * 0.35);

      // Tails
      const tailsX = x + w / 2 + btnGap / 2;
      ctx.fillStyle = cols.buttonBg;
      ctx.fillRect(tailsX, btnY, btnW, btnH);
      ctx.strokeStyle = cols.text + '44';
      ctx.lineWidth = 1;
      ctx.strokeRect(tailsX, btnY, btnW, btnH);
      ctx.fillStyle = cols.text;
      ctx.font = Math.round(labelSize) + 'px "Pixelify Sans", sans-serif';
      ctx.fillText('TAILS', tailsX + btnW / 2, btnY + btnH / 2 + labelSize * 0.35);
    }

    if (this.done) {
      MiniGameUtils.drawResultOverlay(ctx, x, y, w, h, this.winner === 'attacker', cols);
    }
  }

  cleanup() {}
}
