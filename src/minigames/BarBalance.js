class BarBalance {
  constructor() {
    this.name = 'Bar Balance';
    this.done = false;
    this.winner = null;
    this.angle = 0;
    this.angularVelocity = 0;
    this.timeLeft = 10;
    this.difficulty = 1;
  }

  init(attacker, defender, difficulty, isDuel) {
    this.done = false;
    this.winner = null;
    this.angle = 0;
    this.angularVelocity = (Math.random() - 0.5) * 0.5;
    this.timeLeft = isDuel ? 15 : 10;
    this.difficulty = difficulty || 1;
    this.clicksLeft = 0;
    this.clicksRight = 0;
  }

  update(dt) {
    if (this.done) return;
    this.timeLeft -= dt;

    // Gravity pulls toward center
    this.angularVelocity -= this.angle * 0.02;
    // Wind/difficulty adds random force
    this.angularVelocity += (Math.random() - 0.5) * (0.01 + this.difficulty * 0.005);
    // Friction
    this.angularVelocity *= 0.98;

    this.angle += this.angularVelocity;

    // Click inputs
    if (this.clicksLeft > 0) {
      this.angularVelocity -= 0.08;
      this.clicksLeft--;
    }
    if (this.clicksRight > 0) {
      this.angularVelocity += 0.08;
      this.clicksRight--;
    }

    if (Math.abs(this.angle) > 1.2) {
      this.done = true;
      this.winner = 'defender';
      audioManager.playMiniGameLose();
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.done = true;
      this.winner = 'attacker';
      audioManager.playMiniGameWin();
    }
  }

  handleClick(x, y) {
    if (this.done) return;
    const w = 700;
    const h = 460;
    const cx = 640;
    const cy = 300;
    if (x < cx) {
      this.clicksLeft++;
    } else {
      this.clicksRight++;
    }
    audioManager.playTone(400, 0.05, 'square', 0.04);
  }

  render(ctx, x, y, w, h) {
    const cols = ThemeManager.getTheme(store.get('theme')).colors;
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BAR BALANCE', x + w / 2, y + 20);
    ctx.font = '11px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Click LEFT side to push left, RIGHT side to push right', x + w / 2, y + 38);

    const cx = x + w / 2;
    const cy = y + 100;
    const barW = 200;

    // Center marker
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 60);
    ctx.lineTo(cx, cy + 20);
    ctx.stroke();

    // Pivot
    ctx.fillStyle = cols.text + '44';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();

    // Bar
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.angle > -0.3 && this.angle < 0.3 ? '#44aa44' : '#aa4444';
    ctx.fillRect(-barW / 2, -4, barW, 8);
    ctx.restore();

    // Angle indicator
    ctx.fillStyle = cols.text;
    ctx.font = '12px monospace';
    ctx.fillText('Angle: ' + Math.round(this.angle * 57.3) + '°', x + w / 2, y + 150);
    ctx.fillText('Time: ' + Math.ceil(this.timeLeft) + 's', x + w / 2, y + 170);

    if (this.done) {
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 16px monospace';
      ctx.fillText(this.winner === 'attacker' ? 'YOU WIN!' : 'Defender wins!', x + w / 2, y + 200);
    }
  }
}
