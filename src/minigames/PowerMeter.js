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
    if (audioManager) audioManager.playMiniGameStart();
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

  botPlay(dt, timer) {
    if (this.done || this.attempts >= this.maxAttempts) return;
    const minTarget = 30 + this.difficulty * 10;
    const maxTarget = 90 - (5 - this.difficulty) * 5;
    if (this.power >= minTarget && this.power <= maxTarget) {
      if (Math.random() < 0.75) this.handleClick(0, 0);
    }
  }

  handleKey(key) {
    if (key === ' ' || key === 'Enter') this.handleClick(0, 0);
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
      if (audioManager) {
        if (this.winner === 'attacker') audioManager.playMiniGameWin();
        else audioManager.playMiniGameLose();
      }
    }
  }

  render(ctx, x, y, w, h) {
    const cols = ThemeManager.getTheme(store.get('theme')).colors;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('POWER METER', x + w / 2, y + 30);

    ctx.font = '11px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Click when the bar is in the green zone!', x + w / 2, y + 50);

    // Bar
    const bx = x + 50;
    const by = y + 70;
    const bw = w - 100;
    const bh = 30;

    // Zones with glow
    const minTarget = 30 + this.difficulty * 10;
    const maxTarget = 90 - (5 - this.difficulty) * 5;
    const zoneGrad = ctx.createLinearGradient(bx + bw * (minTarget / 100), by, bx + bw * (minTarget / 100), by + bh);
    zoneGrad.addColorStop(0, '#448844');
    zoneGrad.addColorStop(0.5, '#225522');
    zoneGrad.addColorStop(1, '#448844');
    ctx.fillStyle = zoneGrad;
    ctx.fillRect(bx + bw * (minTarget / 100), by, bw * ((maxTarget - minTarget) / 100), bh);
    ctx.shadowColor = '#44ff44';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#44aa44';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + bw * (minTarget / 100), by, bw * ((maxTarget - minTarget) / 100), bh);
    ctx.shadowBlur = 0;

    // Bar track
    const trackGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
    trackGrad.addColorStop(0, cols.text + '15');
    trackGrad.addColorStop(0.5, cols.text + '28');
    trackGrad.addColorStop(1, cols.text + '15');
    ctx.fillStyle = trackGrad;
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    // Marker with glow
    const mx = bx + (this.power / 100) * bw;
    const inZone = this.power >= minTarget && this.power <= maxTarget;
    ctx.shadowColor = inZone ? '#44ff44' : '#ff4444';
    ctx.shadowBlur = 12;
    ctx.fillStyle = inZone ? '#66ff66' : '#ff6666';
    ctx.beginPath();
    ctx.arc(mx, by + bh / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Score
    ctx.fillStyle = cols.accent;
    ctx.font = 'bold 13px monospace';
    ctx.fillText('Score: ' + this.score + ' | Attempt ' + this.attempts + '/' + this.maxAttempts, x + w / 2, y + 125);

    if (this.done) {
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 16px monospace';
      ctx.fillText(this.winner === 'attacker' ? 'YOU WIN!' : 'Defender wins!', x + w / 2, y + 155);
    }
  }
}
