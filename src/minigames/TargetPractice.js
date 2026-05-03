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
      t.life -= dt;
      if (t.life <= 0) {
        this.targets.splice(i, 1);
        this.misses++;
      }
    }

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.done = true;
      const needed = 3 + this.difficulty * 2;
      this.winner = this.hits >= needed ? 'attacker' : 'defender';
    }
  }

  spawnTarget() {
    this.targets.push({
      x: 50 + Math.random() * (this.gameW || 500),
      y: 50 + Math.random() * (this.gameH || 250),
      size: 18 + Math.random() * 12,
      life: 2.5 - this.difficulty * 0.2,
      maxLife: 2.5 - this.difficulty * 0.2,
    });
  }

  handleClick(x, y) {
    if (this.done) return;
    const w = 700;
    const h = 460;
    const gx = (1280 - w) / 2;
    const gy = (800 - h) / 2;
    // Adjust for render offset: targets drawn at x + 20 + t.x, y + 75 + t.y
    const lx = x - (gx + 20) - 20;
    const ly = y - (gy + 95) - 75;

    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      const dx = lx - t.x;
      const dy = ly - t.y;
      if (Math.sqrt(dx * dx + dy * dy) < t.size) {
        this.hits++;
        this.score += Math.ceil(t.life / t.maxLife * 100);
        this.targets.splice(i, 1);
        audioManager.playTone(600 + Math.random() * 300, 0.08, 'square', 0.08);
        return;
      }
    }
    this.misses++;
    audioManager.playTone(200, 0.05, 'sawtooth', 0.04);
  }

  render(ctx, x, y, w, h) {
    const cols = ThemeManager.getTheme(store.get('theme')).colors;
    this.gameW = w - 40;
    this.gameH = h - 140;

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET PRACTICE', x + w / 2, y + 20);
    ctx.font = '11px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Click the targets before they disappear!', x + w / 2, y + 38);

    // Score
    ctx.fillStyle = cols.accent;
    ctx.font = '13px monospace';
    ctx.fillText('Hits: ' + this.hits + ' | Time: ' + Math.ceil(this.timeLeft) + 's', x + w / 2, y + 55);

    // Targets
    for (const t of this.targets) {
      const alpha = t.life / t.maxLife;
      ctx.fillStyle = `rgba(68, 170, 68, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x + 20 + t.x, y + 75 + t.y, t.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (this.done) {
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 16px monospace';
      ctx.fillText(this.winner === 'attacker' ? 'YOU WIN!' : 'Defender wins!', x + w / 2, y + h - 20);
    }
  }
}
