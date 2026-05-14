class QuickClick {
  constructor() {
    this.name = 'Quick Click';
    this.done = false;
    this.winner = null;
    this.p1Clicks = 0;
    this.p2Clicks = 0;
    this.timeLeft = 5;
    this.startTime = 0;
    this.running = false;
    // Visual polish state
    this.flashTimer = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.particles = [];
    this.p2ShakeTimer = 0;
    this.p2FlashTimer = 0;
    this.cursorTrail = [];
    this.lastRect = { x: 0, y: 0, w: 1, h: 1 };
  }

  init(attacker, defender, difficulty) {
    this.attacker = attacker;
    this.defender = defender;
    this.difficulty = difficulty || 1;
    this.done = false;
    this.winner = null;
    this.p1Clicks = 0;
    this.p2Clicks = 0;
    this.timeLeft = 5;
    this.running = false;
    this.startTime = Date.now();
    this.running = true;
    // Reset visual polish state
    this.flashTimer = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.particles = [];
    this.p2ShakeTimer = 0;
    this.p2FlashTimer = 0;
    this.cursorTrail = [];
    audioManager.playMiniGameStart();
  }

  update(dt) {
    if (!this.running || this.done) return;
    this.timeLeft = 5 - (Date.now() - this.startTime) / 1000;

    // CPU auto-clicks for defender (scales with difficulty)
    const cpuRate = dt * (1.5 + (this.difficulty || 1) * 0.8);
    if (Math.random() < cpuRate) {
      this.p2Clicks++;
      this.p2ShakeTimer = 0.15;
      this.p2FlashTimer = 0.1;
    }

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.running = false;
      this.done = true;
      this.winner = this.p1Clicks >= this.p2Clicks ? 'attacker' : 'defender';
      if (this.winner === 'attacker') audioManager.playMiniGameWin();
      else audioManager.playMiniGameLose();
    }

    // Decay visual timers
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer <= 0) this.comboCount = 0;
    }
    if (this.p2FlashTimer > 0) this.p2FlashTimer = Math.max(0, this.p2FlashTimer - dt);
    if (this.p2ShakeTimer > 0) this.p2ShakeTimer = Math.max(0, this.p2ShakeTimer - dt);
    for (let i = this.cursorTrail.length - 1; i >= 0; i--) {
      this.cursorTrail[i].life -= dt;
      if (this.cursorTrail[i].life <= 0) this.cursorTrail.splice(i, 1);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  handleKey(key) {
    if (key === ' ' || key === 'Enter') this.handleClick(0, 0);
  }

  handleClick(x, y) {
    if (!this.running || this.done) return;
    this.p1Clicks++;
    audioManager.playTone(400 + Math.random() * 200, 0.05, 'square', 0.05);

    // Click flash
    this.flashTimer = 0.1;

    // Screen shake
    this.shakeTimer = 0.15;
    this.shakeIntensity = 4;

    // Combo tracking
    if (this.comboTimer > 0) {
      this.comboCount++;
    } else {
      this.comboCount = 1;
    }
    this.comboTimer = 0.5;

    // Particle burst (4-6 small colored squares)
    const count = 4 + Math.floor(Math.random() * 3);
    const rect = this.lastRect || { x: 0, y: 0, w: 1, h: 1 };
    const cx = (x > 0) ? x : rect.x + rect.w / 2;
    const cy = (y > 0) ? y : rect.y + rect.h / 2;
    this.cursorTrail.push({ x: cx, y: cy, life: 0.38, maxLife: 0.38 });
    if (this.cursorTrail.length > 14) this.cursorTrail.shift();
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.3 + Math.random() * 0.2,
        size: 3 + Math.random() * 3,
        color: null,
      });
    }

    // PixiFX enhancements
    if (typeof PixiMiniGameFX !== 'undefined') {
      const fxX = this._bounds ? this._bounds.x + this._bounds.w / 2 : cx;
      const fxY = this._bounds ? this._bounds.y + this._bounds.h / 2 : cy;
      PixiMiniGameFX.spawnSparks(fxX, fxY, '#44ff44', 6);
      if (this.comboCount >= 2) {
        PixiMiniGameFX.spawnCombo(fxX, fxY - 30, this.comboCount);
      }
    }
  }

  botPlay(dt, timer) {
    if (!this.running || this.done) return;
    // Bot clicks at random intervals, slightly faster than default CPU
    if (Math.random() < dt * 8) {
      this.handleClick(0, 0);
    }
  }

  _drawRoundedBar(ctx, bx, by, bw, bh, radius) {
    ctx.beginPath();
    ctx.moveTo(bx + radius, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + bh, radius);
    ctx.arcTo(bx + bw, by + bh, bx, by + bh, radius);
    ctx.arcTo(bx, by + bh, bx, by, radius);
    ctx.arcTo(bx, by, bx + bw, by, radius);
    ctx.closePath();
  }

  render(ctx, x, y, w, h) {
    this._bounds = { x, y, w, h };
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;
    this.lastRect = { x, y, w, h };

    // Apply screen shake offset
    let shakeX = 0, shakeY = 0;
    if (this.shakeTimer > 0) {
      const factor = this.shakeTimer / 0.15;
      shakeX = (Math.random() * 2 - 1) * this.shakeIntensity * factor;
      shakeY = (Math.random() * 2 - 1) * this.shakeIntensity * factor;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Background
    ctx.fillStyle = cols.background || cols.bg || cols.panel;
    ctx.fillRect(x, y, w, h);

    // Border with accent glow
    ctx.save();
    ctx.shadowColor = cols.accent;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();

    // Click flash overlay (green, fades over 0.1s)
    if (this.flashTimer > 0) {
      const alpha = (this.flashTimer / 0.1) * 0.15;
      ctx.fillStyle = 'rgba(68,255,68,' + alpha.toFixed(3) + ')';
      ctx.fillRect(x, y, w, h);
    }

    // Title
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 18px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QUICK CLICK!', x + w / 2, y + 40);

    // Subtitle
    ctx.font = 'bold 12px "Pixelify Sans", sans-serif';
    ctx.save();
    ctx.fillStyle = cols.text;
    ctx.globalAlpha = 0.5;
    ctx.fillText('Click as fast as you can!', x + w / 2, y + 60);
    ctx.restore();

    // Timer
    const timerColor = this.timeLeft < 2 ? (cols.highlight || cols.accent) : cols.text;
    ctx.save();
    if (this.timeLeft < 2) {
      ctx.shadowColor = cols.highlight || cols.accent;
      ctx.shadowBlur = 10;
    }
    ctx.fillStyle = timerColor;
    ctx.font = 'bold 28px "Pixelify Sans", sans-serif';
    ctx.fillText(Math.ceil(this.timeLeft) + 's', x + w / 2, y + 110);
    ctx.restore();

    // Progress bars
    const barW = 200;
    const barH = 30;
    const barRadius = 6;
    const maxClicks = 20;

    // --- Attacker (Player 1) bar ---
    const a1x = x + w / 2 - barW - 20;
    const a1y = y + 140;
    const a1Fill = Math.min(1, this.p1Clicks / maxClicks);

    // Background track
    ctx.save();
    this._drawRoundedBar(ctx, a1x, a1y, barW, barH, barRadius);
    ctx.fillStyle = cols.panel;
    ctx.globalAlpha = 0.3;
    ctx.fill();
    ctx.restore();

    // Filled portion with gradient + glow
    if (a1Fill > 0) {
      const fillW = barW * a1Fill;
      ctx.save();
      this._drawRoundedBar(ctx, a1x, a1y, fillW, barH, barRadius);
      const grad = ctx.createLinearGradient(a1x, a1y, a1x, a1y + barH);
      grad.addColorStop(0, cols.highlight || cols.accent);
      grad.addColorStop(1, cols.accent);
      ctx.fillStyle = grad;
      ctx.shadowColor = cols.accent;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    }

    // Defender flash on bar
    if (this.flashTimer > 0) {
      const alpha = (this.flashTimer / 0.1) * 0.25;
      ctx.save();
      this._drawRoundedBar(ctx, a1x, a1y, barW, barH, barRadius);
      ctx.fillStyle = 'rgba(68,255,68,' + alpha.toFixed(3) + ')';
      ctx.fill();
      ctx.restore();
    }

    // Label
    ctx.fillStyle = cols.text;
    ctx.font = '12px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('You: ' + this.p1Clicks, a1x + barW / 2, a1y + barH / 2 + 4);

    // --- Defender (Player 2 / CPU) bar ---
    const a2x = x + w / 2 + 20;
    const a2y = y + 140;
    const a2Fill = Math.min(1, this.p2Clicks / maxClicks);

    // Background track
    ctx.save();
    this._drawRoundedBar(ctx, a2x, a2y, barW, barH, barRadius);
    ctx.fillStyle = cols.panel;
    ctx.globalAlpha = 0.3;
    ctx.fill();
    ctx.restore();

    // Filled portion with gradient + glow
    if (a2Fill > 0) {
      const fillW = barW * a2Fill;
      ctx.save();
      this._drawRoundedBar(ctx, a2x, a2y, fillW, barH, barRadius);
      const grad2 = ctx.createLinearGradient(a2x, a2y, a2x, a2y + barH);
      grad2.addColorStop(0, cols.highlight || cols.accent);
      grad2.addColorStop(1, cols.panel);
      ctx.fillStyle = grad2;
      ctx.shadowColor = cols.highlight || cols.accent;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    }

    // P2 flash on bar
    if (this.p2FlashTimer > 0) {
      const alpha = (this.p2FlashTimer / 0.1) * 0.25;
      ctx.save();
      this._drawRoundedBar(ctx, a2x, a2y, barW, barH, barRadius);
      ctx.fillStyle = 'rgba(255,68,68,' + alpha.toFixed(3) + ')';
      ctx.fill();
      ctx.restore();
    }

    // Label
    ctx.fillStyle = cols.text;
    ctx.font = '12px "Pixelify Sans", sans-serif';
    ctx.fillText('Defender: ' + this.p2Clicks, a2x + barW / 2, a2y + barH / 2 + 4);

    // Combo counter
    if (this.comboCount >= 2 && this.comboTimer > 0) {
      const comboAlpha = Math.min(1, this.comboTimer / 0.2);
      ctx.save();
      ctx.globalAlpha = comboAlpha;
      ctx.shadowColor = cols.accent;
      ctx.shadowBlur = 16;
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 22px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.comboCount + 'x COMBO!', x + w / 2, y + 195);
      ctx.restore();
    }

    // Particles
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color || cols.accent;
      const half = p.size / 2;
      ctx.fillRect(p.x - half, p.y - half, p.size, p.size);
      ctx.restore();
    }

    // Cursor trail
    for (const p of this.cursorTrail) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha * 0.65;
      ctx.fillStyle = cols.highlight || cols.accent;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 + alpha * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Instructions
    ctx.save();
    ctx.fillStyle = cols.text;
    ctx.font = '11px "Pixelify Sans", sans-serif';
    ctx.globalAlpha = 0.4;
    ctx.fillText('Click anywhere to mash!', x + w / 2, y + 220);
    ctx.restore();

    // Result
    if (this.done) {
      ctx.save();
      const win = this.winner === 'attacker';
      ctx.fillStyle = win ? 'rgba(80, 220, 130, 0.30)' : 'rgba(220, 70, 80, 0.30)';
      ctx.fillRect(x, y, w, h);
      ctx.shadowColor = win ? cols.accent : (cols.highlight || cols.accent);
      ctx.shadowBlur = 14;
      ctx.fillStyle = cols.text;
      ctx.font = 'bold 18px "Pixelify Sans", sans-serif';
      if (this.winner === 'attacker') {
        ctx.fillText('You Win!', x + w / 2, y + h / 2);
      } else {
        ctx.fillText('You Lose!', x + w / 2, y + h / 2);
      }
      ctx.restore();
    }

    ctx.restore(); // undo shake translate
  }

  cleanup() {}
}
