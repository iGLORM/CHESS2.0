class TimingStrike {
  constructor() {
    this.name = 'Timing Strike';
    this.done = false;
    this.winner = null;
    this.pos = 0;
    this.speed = 3;
    this.direction = 1;
    this.strikes = 0;
    this.maxStrikes = 3;
    this.score = 0;
    this.targets = [];
    this.waitingForStrike = false;
    this.particles = [];
    this.flashTimer = 0;
  }

  init(attacker, defender) {
    this.done = false;
    this.winner = null;
    this.pos = 0;
    this.speed = 2.5;
    this.direction = 1;
    this.strikes = 0;
    this.score = 0;
    this.waitingForStrike = true;
    this.particles = [];
    this.flashTimer = 0;
    audioManager.playMiniGameStart();
  }

  update(dt) {
    if (!this.done && this.waitingForStrike) {
      this.pos += this.speed * this.direction * dt * 60;
      if (this.pos > 100) { this.pos = 100; this.direction = -1; }
      if (this.pos < 0) { this.pos = 0; this.direction = 1; }
    }
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  botPlay(dt, timer) {
    if (this.done) return;
    if (this.waitingForStrike) {
      // Bot clicks when marker is in the green zone (center ±15)
      const center = 50;
      if (Math.abs(this.pos - center) < 18) {
        if (Math.random() < 0.7) this.handleClick(0, 0);
      }
    }
  }

  handleKey(key) {
    if (key === ' ' || key === 'Enter') this.handleClick(0, 0);
  }

  handleClick(x, y) {
    if (this.done) return;
    if (this.waitingForStrike) {
      this.strikes++;
      const center = 50;
      const diff = Math.abs(this.pos - center);
      let points = 0;
      if (diff < 5) { points = 100; } // Perfect!
      else if (diff < 10) { points = 75; }
      else if (diff < 20) { points = 50; }
      else if (diff < 35) { points = 25; }
      else { points = 0; }

      this.score += points;
      this._impactBurst(this.pos, points);
      if (points === 100) this.flashTimer = 0.18;

      if (points >= 75) {
        audioManager.playTone(800, 0.1, 'square', 0.1);
      } else if (points >= 50) {
        audioManager.playTone(600, 0.1, 'square', 0.08);
      } else {
        audioManager.playTone(300, 0.1, 'sawtooth', 0.08);
      }

      if (this.strikes >= this.maxStrikes) {
        this.done = true;
        this.winner = this.score >= 150 ? 'attacker' : 'defender';
        if (this.winner === 'attacker') audioManager.playMiniGameWin();
        else audioManager.playMiniGameLose();
      } else {
        // Immediate reset for next strike - no delay
        this.pos = Math.random() * 100;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.speed = 2.5 + this.strikes * 0.5;
      }
    }
  }

  _impactBurst(pos, points) {
    for (let i = 0; i < 14; i++) {
      const a = (Math.PI * 2 * i) / 14 + Math.random() * 0.35;
      const spd = 70 + Math.random() * 120;
      this.particles.push({
        pos,
        x: 0,
        y: 0,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 0.45 + Math.random() * 0.2,
        maxLife: 0.45 + Math.random() * 0.2,
        size: points >= 75 ? 4 : 3,
        points,
      });
    }
  }

  render(ctx, x, y, w, h) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    ctx.fillStyle = cols.background || cols.bg || cols.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TIMING STRIKE', x + w / 2, y + 35);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Stop the bar in the green zone!', x + w / 2, y + 55);

    // Score
    ctx.save();
    ctx.fillStyle = cols.panel + 'dd';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x + w / 2 - 95, y + 64, 190, 24, 6) : ctx.rect(x + w / 2 - 95, y + 64, 190, 24);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = cols.accent;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Score: ' + this.score + '/300', x + w / 2, y + 78);

    // The bar
    const barX = x + 80;
    const barY = y + 110;
    const barW = w - 160;
    const barH = 40;

    // Bar track with subtle gradient
    const grad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    grad.addColorStop(0, cols.text + '15');
    grad.addColorStop(0.5, cols.text + '22');
    grad.addColorStop(1, cols.text + '15');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Sweet spot (green zone) with glow
    const center = barX + barW * 0.4;
    const zoneW = barW * 0.2;
    const greenGrad = ctx.createLinearGradient(center, barY, center, barY + barH);
    greenGrad.addColorStop(0, cols.highlight || cols.accent);
    greenGrad.addColorStop(0.5, cols.accent);
    greenGrad.addColorStop(1, cols.panel);
    ctx.fillStyle = greenGrad;
    ctx.fillRect(center, barY, zoneW, barH);
    ctx.shadowColor = cols.accent;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = cols.highlight || cols.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(center, barY, zoneW, barH);
    ctx.shadowBlur = 0;

    // Good zones
    ctx.fillStyle = cols.highlight || cols.text;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(center - barW * 0.1, barY, barW * 0.1, barH);
    ctx.fillRect(center + zoneW, barY, barW * 0.1, barH);
    ctx.globalAlpha = 1;

    // The moving marker with glow
    const markerX = barX + (this.pos / 100) * barW;
    ctx.shadowColor = cols.highlight || cols.accent;
    ctx.shadowBlur = 10;
    ctx.fillStyle = cols.highlight || cols.accent;
    ctx.beginPath();
    ctx.moveTo(markerX, barY - 8);
    ctx.lineTo(markerX - 6, barY - 2);
    ctx.lineTo(markerX - 4, barY + barH + 2);
    ctx.lineTo(markerX + 4, barY + barH + 2);
    ctx.lineTo(markerX + 6, barY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.points >= 75 ? cols.accent : (cols.highlight || cols.text);
      ctx.beginPath();
      ctx.arc(barX + (p.pos / 100) * barW + p.x, barY + barH / 2 + p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Labels
    ctx.fillStyle = cols.text + '66';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('0%', barX, barY + barH + 20);
    ctx.fillText('100%', barX + barW, barY + barH + 20);

    // Hit indicator
    if (!this.waitingForStrike && !this.done) {
      ctx.fillStyle = cols.text + '88';
      ctx.font = '14px monospace';
      ctx.fillText('Get ready...', x + w / 2, barY + barH + 50);
    }

    // Strikes
    ctx.fillStyle = cols.text + '66';
    ctx.font = '11px monospace';
    ctx.fillText('Strike ' + (this.strikes + 1) + '/' + this.maxStrikes, x + w / 2, y + 220);

    if (this.flashTimer > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (this.flashTimer / 0.18 * 0.28).toFixed(3) + ')';
      ctx.fillRect(x, y, w, h);
    }

    if (this.done) {
      const win = this.winner === 'attacker';
      ctx.fillStyle = win ? 'rgba(80, 220, 130, 0.30)' : 'rgba(220, 70, 80, 0.30)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = cols.text;
      ctx.shadowColor = win ? cols.accent : (cols.highlight || cols.accent);
      ctx.shadowBlur = 14;
      ctx.font = 'bold 18px monospace';
      ctx.fillText(win ? 'You Win!' : 'You Lose!', x + w / 2, y + h / 2);
      ctx.shadowBlur = 0;
    }
  }

  cleanup() {}
}
