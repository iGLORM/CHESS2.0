class TargetPractice {
  constructor() {
    this.name = 'Target Practice';
    this.done = false;
    this.winner = null;
    this.targets = [];
    this.score = 0;
    this.hits = 0;
    this.misses = 0;
    this.timeLeft = 12;
    this.difficulty = 1;
    this.particles = [];
    this.ripples = [];
    this.popups = [];
    this.cursorX = 0;
    this.cursorY = 0;
    this.lastRect = { x: 0, y: 0, w: 1, h: 1 };
  }

  init(attacker, defender, difficulty, isDuel) {
    this.done = false;
    this.winner = null;
    this.targets = [];
    this.score = 0;
    this.hits = 0;
    this.misses = 0;
    this.timeLeft = isDuel ? 18 : 12;
    this.difficulty = difficulty || 1;
    this.spawnRate = Math.max(0.4, 1.2 - difficulty * 0.15);
    this.spawnTimer = 0;
    this.particles = [];
    this.ripples = [];
    this.popups = [];
    this.cursorX = 0;
    this.cursorY = 0;
    if (audioManager) audioManager.playMiniGameStart();
  }

  update(dt) {
    if (this.done) return;
    this.timeLeft -= dt;
    this.spawnTimer += dt;

    if (this.spawnTimer >= this.spawnRate) {
      this.spawnTimer = 0;
      this.spawnTarget();
    }

    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      t.age = Math.min(t.maxLife, (t.age || 0) + dt);
      t.life -= dt;
      if (t.life <= 0) {
        this.targets.splice(i, 1);
        this.misses++;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].life -= dt;
      if (this.ripples[i].life <= 0) this.ripples.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y -= 32 * dt;
      p.life -= dt;
      if (p.life <= 0) this.popups.splice(i, 1);
    }

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.done = true;
      const needed = 3 + this.difficulty * 2;
      this.winner = this.hits >= needed ? 'attacker' : 'defender';
      if (audioManager) {
        if (this.winner === 'attacker') audioManager.playMiniGameWin();
        else audioManager.playMiniGameLose();
      }
    }
  }

  spawnTarget() {
    this.targets.push({
      x: 50 + Math.random() * (this.gameW || 500),
      y: 50 + Math.random() * (this.gameH || 250),
      size: 18 + Math.random() * 12,
      life: 2.5 - this.difficulty * 0.2,
      maxLife: 2.5 - this.difficulty * 0.2,
      age: 0,
    });
  }

  botPlay(dt, timer) {
    if (this.done) return;
    if (this.targets.length > 0 && timer > 0.2) {
      const t = this.targets[0];
      const rect = this.lastRect || { x: 0, y: 0, w: 1, h: 1 };
      const lx = rect.x + 20 + t.x;
      const ly = rect.y + 95 + t.y;
      if (Math.random() < 0.7) {
        this.handleClick(lx, ly);
      }
    }
  }

  handleKey(key) {
    if (key === ' ' || key === 'Enter') {
      const rect = this.lastRect || { x: 0, y: 0, w: 1, h: 1 };
      this.handleClick(rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
  }

  handleClick(x, y) {
    if (this.done) return;
    this.cursorX = x;
    this.cursorY = y;
    const rect = this.lastRect || { x: 0, y: 0, w: 1, h: 1 };
    const lx = x - (rect.x + 20);
    const ly = y - (rect.y + 95);

    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      const dx = lx - t.x;
      const dy = ly - t.y;
      if (Math.sqrt(dx * dx + dy * dy) < t.size) {
        this.hits++;
        const gained = Math.ceil(t.life / t.maxLife * 100);
        this.score += gained;
        this._hitBurst(t.x, t.y, t.size, gained);
        this.targets.splice(i, 1);
        audioManager.playTone(600 + Math.random() * 300, 0.08, 'square', 0.08);
        return;
      }
    }
    this.misses++;
    audioManager.playTone(200, 0.05, 'sawtooth', 0.04);
  }

  _hitBurst(tx, ty, size, gained) {
    this.ripples.push({ x: tx, y: ty, size, life: 0.45, maxLife: 0.45 });
    this.popups.push({ x: tx, y: ty - size, text: '+' + gained, life: 0.75, maxLife: 0.75 });
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16 + Math.random() * 0.35;
      const spd = 70 + Math.random() * 140;
      this.particles.push({
        x: tx,
        y: ty,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.45 + Math.random() * 0.25,
        size: 2 + Math.random() * 4,
      });
    }
  }


  render(ctx, x, y, w, h) {
    const cols = ThemeManager.getTheme(store.get('theme')).colors;
    this.lastRect = { x, y, w, h };
    this.gameW = w - 40;
    this.gameH = h - 140;

    ctx.fillStyle = cols.background || cols.bg || cols.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 18px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET PRACTICE', x + w / 2, y + 30);
    ctx.font = 'bold 12px "Pixelify Sans", sans-serif';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Click the targets before they disappear!', x + w / 2, y + 50);

    MiniGameUtils.roundRect(ctx, x + w / 2 - 125, y + 58, 250, 26, 7);
    ctx.fillStyle = cols.panel + 'dd';
    ctx.fill();
    ctx.fillStyle = cols.accent;
    ctx.font = 'bold 13px "Pixelify Sans", sans-serif';
    ctx.fillText('Hits: ' + this.hits + ' | Time: ' + Math.ceil(this.timeLeft) + 's', x + w / 2, y + 76);

    const targetBaseY = y + 95;
    for (const r of this.ripples) {
      const alpha = Math.max(0, r.life / r.maxLife);
      const tx = x + 20 + r.x;
      const ty = targetBaseY + r.y;
      ctx.strokeStyle = 'rgba(255,255,255,' + (alpha * 0.8).toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, ty, r.size + (1 - alpha) * 36, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const t of this.targets) {
      ctx.save();
      const alpha = t.life / t.maxLife;
      const spawnScale = Math.min(1, (t.age || 0) / 0.22);
      const tx = x + 20 + t.x;
      const ty = targetBaseY + t.y;
      const ts = t.size * alpha * spawnScale;
      ctx.shadowColor = cols.accent;
      ctx.shadowBlur = 10 * alpha;
      ctx.strokeStyle = cols.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, ty, ts, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = cols.accent;
      ctx.beginPath();
      ctx.arc(tx, ty, ts * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = cols.text;
      ctx.beginPath();
      ctx.arc(tx, ty, ts * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = cols.accent;
      ctx.fillRect(x + 20 + p.x - p.size / 2, targetBaseY + p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }

    for (const p of this.popups) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = cols.highlight || cols.accent;
      ctx.font = 'bold 13px "Pixelify Sans", sans-serif';
      ctx.fillText(p.text, x + 20 + p.x, targetBaseY + p.y);
      ctx.restore();
    }

    if (this.cursorX || this.cursorY) {
      const cx = this.cursorX;
      const cy = this.cursorY;
      ctx.strokeStyle = cols.highlight || cols.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.moveTo(cx - 22, cy);
      ctx.lineTo(cx - 6, cy);
      ctx.moveTo(cx + 6, cy);
      ctx.lineTo(cx + 22, cy);
      ctx.moveTo(cx, cy - 22);
      ctx.lineTo(cx, cy - 6);
      ctx.moveTo(cx, cy + 6);
      ctx.lineTo(cx, cy + 22);
      ctx.stroke();
    }

    if (this.done) {
      MiniGameUtils.drawResultOverlay(ctx, x, y, w, h, this.winner === 'attacker', cols);
    }
  }

  cleanup() {}
}
