class UndertaleDodge {
  constructor() {
    this.name = 'Soul Dodge';
    this.done = false;
    this.winner = null;
    this.playerX = 0;
    this.playerY = 0;
    this.playerSize = 14;
    this.bullets = [];
    this.hp = 20;
    this.maxHp = 20;
    this.survivalTime = 15;
    this.timeLeft = 15;
    this.phase = 0;
    this.spawnTimer = 0;
    this.keys = {};
    this.running = false;
  }

  init(attacker, defender) {
    this.done = false;
    this.winner = null;
    this.playerX = 320;
    this.playerY = 240;
    this.playerSize = 14;
    this.bullets = [];
    this.hp = 20;
    this.maxHp = 20;
    this.timeLeft = this.survivalTime;
    this.phase = 0;
    this.spawnTimer = 0;
    this.running = true;
    this.keys = {};

    document.addEventListener('keydown', this.keyHandler = (e) => {
      this.keys[e.key] = true;
    });
    document.addEventListener('keyup', this.keyHandlerUp = (e) => {
      this.keys[e.key] = false;
    });

    audioManager.playMiniGameStart();
  }

  update(dt) {
    if (!this.running || this.done) return;

    // Player movement
    const speed = 200 * dt;
    if (this.keys['ArrowLeft'] || this.keys['a']) this.playerX -= speed;
    if (this.keys['ArrowRight'] || this.keys['d']) this.playerX += speed;
    if (this.keys['ArrowUp'] || this.keys['w']) this.playerY -= speed;
    if (this.keys['ArrowDown'] || this.keys['s']) this.playerY += speed;

    // Arena bounds
    const arena = { x: 200, y: 140, w: 240, h: 200 };
    this.playerX = Math.max(arena.x + this.playerSize, Math.min(arena.x + arena.w - this.playerSize, this.playerX));
    this.playerY = Math.max(arena.y + this.playerSize, Math.min(arena.y + arena.h - this.playerSize, this.playerY));

    // Phase progression
    this.timeLeft -= dt;
    this.phase = Math.floor((1 - this.timeLeft / this.survivalTime) * 4);

    // Spawn bullets
    this.spawnTimer += dt;
    const spawnRate = Math.max(0.1, 0.5 - this.phase * 0.08);
    if (this.spawnTimer > spawnRate) {
      this.spawnTimer = 0;
      this.spawnBullets();
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Remove if out of bounds
      if (b.x < arena.x - 30 || b.x > arena.x + arena.w + 30 ||
          b.y < arena.y - 30 || b.y > arena.y + arena.h + 30) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Collision
      const dx = this.playerX - b.x;
      const dy = this.playerY - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.playerSize + b.size) {
        this.hp--;
        this.bullets.splice(i, 1);
        audioManager.playTone(200, 0.08, 'sawtooth', 0.1);
        if (this.hp <= 0) {
          this.hp = 0;
          this.done = true;
          this.winner = 'defender';
          this.running = false;
          audioManager.playMiniGameLose();
          this.cleanup();
          return;
        }
      }
    }

    // Check win
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.done = true;
      this.winner = 'attacker';
      this.running = false;
      audioManager.playMiniGameWin();
      this.cleanup();
    }
  }

  spawnBullets() {
    const arena = { x: 200, y: 140, w: 240, h: 200 };

    switch (this.phase % 4) {
      case 0: // Left-right waves
        for (let i = 0; i < 3; i++) {
          const fromLeft = Math.random() > 0.5;
          this.bullets.push({
            x: fromLeft ? arena.x - 10 : arena.x + arena.w + 10,
            y: arena.y + 30 + i * 60,
            vx: fromLeft ? 80 + this.phase * 20 : -(80 + this.phase * 20),
            vy: 0,
            size: 6,
            color: '#ff6666',
          });
        }
        break;
      case 1: // Top-bottom
        for (let i = 0; i < 3; i++) {
          const fromTop = Math.random() > 0.5;
          this.bullets.push({
            x: arena.x + 30 + i * 80,
            y: fromTop ? arena.y - 10 : arena.y + arena.h + 10,
            vx: 0,
            vy: fromTop ? 80 + this.phase * 20 : -(80 + this.phase * 20),
            size: 6,
            color: '#ffaa44',
          });
        }
        break;
      case 2: // Diagonal
        for (let i = 0; i < 4; i++) {
          const angle = Math.PI / 4 + i * Math.PI / 2 + Math.random() * 0.3;
          this.bullets.push({
            x: arena.x + arena.w / 2,
            y: arena.y + arena.h / 2,
            vx: Math.cos(angle) * (60 + this.phase * 15),
            vy: Math.sin(angle) * (60 + this.phase * 15),
            size: 5,
            color: '#ff44ff',
          });
        }
        break;
      case 3: // Spiral
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + Date.now() / 1000;
          const speed = 50 + this.phase * 10;
          this.bullets.push({
            x: arena.x + arena.w / 2,
            y: arena.y + arena.h / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 4,
            color: '#44aaff',
          });
        }
        break;
    }
  }

  render(ctx, x, y, w, h) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SOUL DODGE', x + w / 2, y + 30);

    // HP bar
    const hpBarW = 200;
    const hpBarH = 12;
    ctx.fillStyle = '#440000';
    ctx.fillRect(x + w / 2 - hpBarW / 2, y + 45, hpBarW, hpBarH);
    const hpPct = this.hp / this.maxHp;
    ctx.fillStyle = hpPct > 0.5 ? '#44cc44' : hpPct > 0.25 ? '#cccc44' : '#cc4444';
    ctx.fillRect(x + w / 2 - hpBarW / 2, y + 45, hpBarW * hpPct, hpBarH);
    ctx.fillStyle = cols.text;
    ctx.font = '9px monospace';
    ctx.fillText('HP: ' + this.hp + '/' + this.maxHp, x + w / 2, y + 55);

    // Timer
    ctx.fillStyle = cols.text + '88';
    ctx.font = '11px monospace';
    ctx.fillText('Survive: ' + Math.ceil(this.timeLeft) + 's', x + w / 2, y + 75);

    // Arena
    const arenaX = x + (w - 240) / 2;
    const arenaY = y + 95;
    const arenaW = 240;
    const arenaH = 200;

    ctx.strokeStyle = cols.text + '66';
    ctx.lineWidth = 2;
    ctx.strokeRect(arenaX, arenaY, arenaW, arenaH);

    // Bullets
    for (const b of this.bullets) {
      ctx.fillStyle = b.color;
      const bx = arenaX + (b.x - 200);
      const by = arenaY + (b.y - 140);
      ctx.beginPath();
      ctx.arc(bx, by, b.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player (soul/heart)
    const px = arenaX + (this.playerX - 200);
    const py = arenaY + (this.playerY - 140);
    const ps = this.playerSize;

    ctx.fillStyle = '#ff4444';
    // Heart shape
    ctx.beginPath();
    ctx.moveTo(px, py + ps * 0.3);
    ctx.bezierCurveTo(px, py - ps * 0.3, px - ps, py - ps * 0.3, px - ps, py + ps * 0.1);
    ctx.bezierCurveTo(px - ps, py + ps * 0.6, px, py + ps, px, py + ps * 1.2);
    ctx.bezierCurveTo(px, py + ps, px + ps, py + ps * 0.6, px + ps, py + ps * 0.1);
    ctx.bezierCurveTo(px + ps, py - ps * 0.3, px, py - ps * 0.3, px, py + ps * 0.3);
    ctx.fill();

    // Controls hint
    ctx.fillStyle = cols.text + '44';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Arrow keys / WASD to dodge', x + w / 2, y + 320);

    if (this.done) {
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 18px monospace';
      ctx.fillText(this.winner === 'attacker' ? 'YOU SURVIVED!' : 'Defeated!', x + w / 2, y + 360);
    }
  }

  handleClick(x, y) {}

  cleanup() {
    document.removeEventListener('keydown', this.keyHandler);
    document.removeEventListener('keyup', this.keyHandlerUp);
  }
}
