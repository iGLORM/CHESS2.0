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
    this.hitHistory = [];
    this.particles = [];
    this.shakeTimer = 0;
    this.shakeX = 0;
    this.shakeY = 0;
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
    this.hitHistory = [];
    this.particles = [];
    this.shakeTimer = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.elapsed = 0;
    this.timeLimit = isDuel ? 8 : 6;
    if (audioManager) audioManager.playMiniGameStart();
  }

  update(dt) {
    if (!this.done) {
      this.elapsed += dt;
      if (this.elapsed >= this.timeLimit) {
        this.done = true;
        this.winner = this.score >= (60 + this.difficulty * 15) ? 'attacker' : 'defender';
        if (audioManager) {
          if (this.winner === 'attacker') audioManager.playMiniGameWin();
          else audioManager.playMiniGameLose();
        }
        return;
      }
    }
    if (!this.done && this.attempts < this.maxAttempts) {
      if (this.rising) {
        this.power += this.speed * dt * 60;
        if (this.power >= 100) { this.power = 100; this.rising = false; }
      } else {
        this.power -= this.speed * dt * 60;
        if (this.power <= 0) { this.power = 0; this.rising = true; }
      }
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      const amt = (this.shakeTimer / 0.22) * 6;
      this.shakeX = (Math.random() - 0.5) * amt;
      this.shakeY = (Math.random() - 0.5) * amt;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 160 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
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
      this.hitHistory.push(true);
      this._burst(this.power, true);
      audioManager.playTone(700, 0.1, 'square', 0.08);
    } else {
      this.score += Math.max(10, 50 - Math.abs(this.power - (minTarget + maxTarget) / 2));
      this.hitHistory.push(false);
      this._burst(this.power, false);
      this.shakeTimer = 0.22;
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

  _burst(power, success) {
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.25;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        power,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.45 + Math.random() * 0.25,
        size: success ? 4 : 3,
        success,
      });
    }
  }


  render(ctx, x, y, w, h) {
    const cols = ThemeManager.getTheme(store.get('theme')).colors;
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    ctx.fillStyle = cols.background || cols.bg || cols.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 18px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POWER METER', x + w / 2, y + 30);

    ctx.font = 'bold 12px "Pixelify Sans", sans-serif';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Click when the bar is in the green zone!', x + w / 2, y + 50);

    // Bar
    const bx = x + Math.max(44, w * 0.08);
    const by = y + h * 0.22;
    const bw = w - (bx - x) * 2;
    const bh = Math.max(28, h * 0.07);

    // Zones with glow
    const minTarget = 30 + this.difficulty * 10;
    const maxTarget = 90 - (5 - this.difficulty) * 5;
    const zoneX = bx + bw * (minTarget / 100);
    const zoneW = bw * ((maxTarget - minTarget) / 100);
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 130);
    const zoneGrad = ctx.createLinearGradient(bx + bw * (minTarget / 100), by, bx + bw * (minTarget / 100), by + bh);
    zoneGrad.addColorStop(0, cols.highlight || cols.accent);
    zoneGrad.addColorStop(0.45, cols.accent);
    zoneGrad.addColorStop(1, cols.highlight || cols.accent);
    ctx.fillStyle = zoneGrad;
    ctx.fillRect(zoneX, by, zoneW, bh);
    ctx.shadowColor = cols.accent;
    ctx.shadowBlur = 8 + pulse * 12;
    ctx.strokeStyle = cols.highlight || cols.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(zoneX, by, zoneW, bh);
    ctx.shadowBlur = 0;

    // Bar track
    const fillW = bw * (this.power / 100);
    const trackGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
    trackGrad.addColorStop(0, cols.panel);
    trackGrad.addColorStop(Math.max(0.02, this.power / 100), cols.accent);
    trackGrad.addColorStop(1, cols.text + '22');
    ctx.fillStyle = cols.text + '18';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = trackGrad;
    ctx.fillRect(bx, by, fillW, bh);
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    // Marker with glow
    const mx = bx + (this.power / 100) * bw;
    const inZone = this.power >= minTarget && this.power <= maxTarget;
    ctx.shadowColor = inZone ? cols.accent : (cols.highlight || cols.accent);
    ctx.shadowBlur = 12;
    ctx.fillStyle = inZone ? cols.accent : (cols.highlight || cols.accent);
    ctx.beginPath();
    ctx.arc(mx, by + bh / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Particles
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      const px = bx + (p.power / 100) * bw + p.x;
      const py = by + bh / 2 + p.y;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.success ? cols.accent : (cols.highlight || cols.text);
      ctx.beginPath();
      ctx.arc(px, py, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Score panel
    const panelW = Math.min(360, w - 80);
    const panelX = x + (w - panelW) / 2;
    const panelY = by + bh + 20;
    MiniGameUtils.roundRect(ctx, panelX, panelY, panelW, 54, 8);
    ctx.fillStyle = cols.panel + 'dd';
    ctx.fill();
    ctx.strokeStyle = cols.text + '22';
    ctx.stroke();

    ctx.fillStyle = cols.accent;
    ctx.font = 'bold 13px "Pixelify Sans", sans-serif';
    ctx.fillText('Score: ' + Math.round(this.score) + ' | Attempt ' + this.attempts + '/' + this.maxAttempts, x + w / 2, panelY + 20);

    const dotR = 5;
    const totalDots = this.maxAttempts * 16;
    const startX = x + w / 2 - totalDots / 2 + 8;
    for (let i = 0; i < this.maxAttempts; i++) {
      ctx.fillStyle = i >= this.hitHistory.length ? cols.text + '33' : (this.hitHistory[i] ? cols.accent : cols.highlight || cols.text);
      ctx.beginPath();
      ctx.arc(startX + i * 16, panelY + 38, dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    if (this.done) {
      MiniGameUtils.drawResultOverlay(ctx, x, y, w, h, this.winner === 'attacker', cols);
    }
  }

  cleanup() {}
}
