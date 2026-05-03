class DodgeFalling {
  constructor() {
    this.name = 'Dodge Falling';
    this.done = false;
    this.winner = null;
    this.playerX = 320;
    this.blocks = [];
    this.hp = 3;
    this.timeLeft = 10;
    this.difficulty = 1;
    this.keys = {};
  }

  init(attacker, defender, difficulty, isDuel) {
    this.done = false;
    this.winner = null;
    this.playerX = 320;
    this.blocks = [];
    this.hp = 3;
    this.timeLeft = isDuel ? 15 : 10;
    this.difficulty = difficulty || 1;
    this.spawnTimer = 0;
    this.keys = {};

    this.keyDown = (e) => { this.keys[e.key] = true; };
    this.keyUp = (e) => { this.keys[e.key] = false; };
    document.addEventListener('keydown', this.keyDown);
    document.addEventListener('keyup', this.keyUp);
  }

  update(dt) {
    if (this.done) return;
    this.timeLeft -= dt;

    // Movement
    const speed = 250 * dt;
    if (this.keys['ArrowLeft'] || this.keys['a']) this.playerX -= speed;
    if (this.keys['ArrowRight'] || this.keys['d']) this.playerX += speed;
    this.playerX = Math.max(20, Math.min(620, this.playerX));

    // Spawn blocks
    this.spawnTimer += dt;
    const rate = Math.max(0.2, 0.6 - this.difficulty * 0.08);
    if (this.spawnTimer >= rate) {
      this.spawnTimer = 0;
      const bw = 30 + Math.random() * 40;
      this.blocks.push({
        x: Math.random() * (640 - bw),
        y: -20,
        w: bw,
        h: 15,
        speed: 120 + this.difficulty * 30,
      });
    }

    // Update blocks
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const b = this.blocks[i];
      b.y += b.speed * dt;
      if (b.y > 300) {
        this.blocks.splice(i, 1);
        continue;
      }
      // Collision with player
      if (b.y + b.h > 240 && b.y < 260 &&
          b.x < this.playerX + 15 && b.x + b.w > this.playerX - 15) {
        this.hp--;
        this.blocks.splice(i, 1);
        audioManager.playTone(200, 0.08, 'sawtooth', 0.1);
        if (this.hp <= 0) {
          this.done = true;
          this.winner = 'defender';
          audioManager.playMiniGameLose();
          this.cleanup();
          return;
        }
      }
    }

    if (this.timeLeft <= 0) {
      this.done = true;
      this.winner = 'attacker';
      audioManager.playMiniGameWin();
      this.cleanup();
    }
  }

  cleanup() {
    document.removeEventListener('keydown', this.keyDown);
    document.removeEventListener('keyup', this.keyUp);
  }

  handleClick(x, y) {
    const cx = 640;
    if (x < cx) {
      this.keys['ArrowLeft'] = true;
      setTimeout(() => this.keys['ArrowLeft'] = false, 150);
    } else {
      this.keys['ArrowRight'] = true;
      setTimeout(() => this.keys['ArrowRight'] = false, 150);
    }
  }

  handleKey(key) {
    if (key === 'ArrowLeft' || key === 'a') this.playerX -= 30;
    if (key === 'ArrowRight' || key === 'd') this.playerX += 30;
  }

  render(ctx, x, y, w, h) {
    const cols = ThemeManager.getTheme(store.get('theme')).colors;
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DODGE FALLING', x + w / 2, y + 20);
    ctx.font = '11px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Dodge the falling blocks! Use arrow keys or click sides.', x + w / 2, y + 38);

    // HP
    ctx.fillStyle = '#cc4444';
    ctx.font = '12px monospace';
    ctx.fillText('HP: ' + '♥'.repeat(this.hp), x + w / 2, y + 55);
    ctx.fillStyle = cols.text + '66';
    ctx.fillText('Time: ' + Math.ceil(this.timeLeft) + 's', x + w / 2, y + 72);

    // Player
    const px = x + 20 + this.playerX;
    const py = y + 90 + 160;
    ctx.fillStyle = '#44aaff';
    ctx.fillRect(px - 12, py, 24, 16);

    // Blocks
    for (const b of this.blocks) {
      ctx.fillStyle = '#cc4444';
      ctx.fillRect(x + 20 + b.x, y + 90 + b.y, b.w, b.h);
    }

    if (this.done) {
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 16px monospace';
      ctx.fillText(this.winner === 'attacker' ? 'YOU WIN!' : 'Defender wins!', x + w / 2, y + h - 20);
    }
  }
}
