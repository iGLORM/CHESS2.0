class PowerMeter {
  constructor() {
    this.name = 'Power Meter';
    this.done = false;
    this.winner = null;
    this.power = 0;
    this.rising = true;
    this.speed = 2;
    this.attempts = 0;
    this.maxAttempts = 3;
    this.score = 0;
    this.difficulty = 1;
  }

  init(attacker, defender, difficulty, isDuel) {
    this.done = false;
    this.winner = null;
    this.power = 0;
    this.rising = true;
    this.attempts = 0;
    this.score = 0;
    this.difficulty = difficulty || 1;
    this.speed = 1.5 + this.difficulty * 0.4;
    this.maxAttempts = isDuel ? 5 : 3;
  }

  update(dt) {
    if (this.done || this.attempts >= this.maxAttempts) return;
    if (this.rising) {
      this.power += this.speed * dt * 60;
      if (this.power >= 100) { this.power = 100; this.rising = false; }
    } else {
      this.power -= this.speed * dt * 60;
      if (this.power <= 0) { this.power = 0; this.rising = true; }
    }
  }

  handleClick(x, y) {
    if (this.done || this.attempts >= this.maxAttempts) return;
    this.attempts++;

    // Sweet spots depend on difficulty
    const minTarget = 30 + this.difficulty * 10;
    const maxTarget = 90 - (5 - this.difficulty) * 5;

    if (this.power >= minTarget && this.power <= maxTarget) {
      this.score += 100;
      audioManager.playTone(700, 0.1, 'square', 0.08);
    } else {
      this.score += Math.max(10, 50 - Math.abs(this.power - (minTarget + maxTarget) / 2));
      audioManager.playTone(300, 0.1, 'square', 0.06);
    }

    if (this.attempts >= this.maxAttempts) {
      const threshold = 60 + this.difficulty * 15;
      this.done = true;
      this.winner = this.score >= threshold ? 'attacker' : 'defender';
    }
  }

  render(ctx, x, y, w, h) {
    const cols = ThemeManager.getTheme(store.get('theme')).colors;
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('POWER METER', x + w / 2, y + 20);

    ctx.font = '11px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Click when the bar is in the green zone!', x + w / 2, y + 38);

    // Bar
    const bx = x + 50;
    const by = y + 60;
    const bw = w - 100;
    const bh = 30;

    // Zones
    const minTarget = 30 + this.difficulty * 10;
    const maxTarget = 90 - (5 - this.difficulty) * 5;
    ctx.fillStyle = '#225522';
    ctx.fillRect(bx + bw * (minTarget / 100), by, bw * ((maxTarget - minTarget) / 100), bh);

    ctx.fillStyle = cols.text + '22';
    ctx.fillRect(bx, by, bw, bh);

    // Marker
    const mx = bx + (this.power / 100) * bw;
    ctx.fillStyle = this.power >= minTarget && this.power <= maxTarget ? '#44ff44' : '#ff4444';
    ctx.fillRect(mx - 3, by - 4, 6, bh + 8);

    // Score
    ctx.fillStyle = cols.accent;
    ctx.font = 'bold 13px monospace';
    ctx.fillText('Score: ' + this.score + ' | Attempt ' + this.attempts + '/' + this.maxAttempts, x + w / 2, y + 115);

    if (this.done) {
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 16px monospace';
      ctx.fillText(this.winner === 'attacker' ? 'YOU WIN!' : 'Defender wins!', x + w / 2, y + 150);
    }
  }
}
