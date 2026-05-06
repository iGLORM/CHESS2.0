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
    this.shakeTimer = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flashTimer = 0;
    this.particles = [];
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
    this.shakeTimer = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flashTimer = 0;
    this.particles = [];

    this.keyDown = (e) => { this.keys[e.key] = true; };
    this.keyUp = (e) => { this.keys[e.key] = false; };
    document.addEventListener('keydown', this.keyDown);
    document.addEventListener('keyup', this.keyUp);
    if (audioManager) audioManager.playMiniGameStart();
  }

  update(dt) {
    if (this.done) return;
    this.timeLeft -= dt;

    // Decay screen shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      if (this.shakeTimer <= 0) {
        this.shakeTimer = 0;
        this.shakeX = 0;
        this.shakeY = 0;
      } else {
        const intensity = this.shakeTimer / 0.15;
        this.shakeX = (Math.random() - 0.5) * 6 * intensity;
        this.shakeY = (Math.random() - 0.5) * 6 * intensity;
      }
    }

    // Decay flash
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer < 0) this.flashTimer = 0;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

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
        hue: Math.random(),
      });
    }

    // Update blocks
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const b = this.blocks[i];
      b.y += b.speed * dt;

      // Spawn trail particles behind each block
      if (Math.random() < 0.4) {
        this.particles.push({
          x: b.x + Math.random() * b.w,
          y: b.y,
          w: 3 + Math.random() * 4,
          h: 2 + Math.random() * 3,
          life: 0.3 + Math.random() * 0.2,
          maxLife: 0.3 + Math.random() * 0.2,
          hue: b.hue || 0,
        });
      }

      if (b.y > 300) {
        this.blocks.splice(i, 1);
        continue;
      }
      // Collision with player
      if (b.y + b.h > 240 && b.y < 260 &&
          b.x < this.playerX + 15 && b.x + b.w > this.playerX - 15) {
        this.hp--;
        this.shakeTimer = 0.15;
        this.flashTimer = 0.15;
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

  botPlay(dt, timer) {
    if (this.done) return;
    const speed = 250 * dt;
    const playerLeft = this.playerX - 12;
    const playerRight = this.playerX + 12;

    // Find dangerous blocks (above player and falling)
    let threatLeft = 0;
    let threatRight = 0;
    let nearestThreat = null;
    let minThreatDist = Infinity;

    for (const b of this.blocks) {
      if (b.y < 0 || b.y > 260) continue;
      const blockLeft = b.x;
      const blockRight = b.x + b.w;
      const overlap = blockLeft < playerRight && blockRight > playerLeft;
      const dist = 240 - b.y;
      if (overlap && dist < minThreatDist) {
        minThreatDist = dist;
        nearestThreat = b;
      }
      // Count threats on each side for general danger
      if (b.y > 100 && b.y < 260) {
        if (blockRight < this.playerX) threatLeft++;
        else if (blockLeft > this.playerX) threatRight++;
      }
    }

    if (nearestThreat) {
      // Move to the side with more escape room
      const blockCenter = nearestThreat.x + nearestThreat.w / 2;
      const spaceLeft = blockCenter;
      const spaceRight = 640 - blockCenter;
      if (spaceLeft > spaceRight) {
        this.playerX -= speed;
      } else {
        this.playerX += speed;
      }
    } else {
      // Drift toward the side with fewer threats
      if (threatLeft > threatRight && timer > 0.2) {
        this.playerX += speed * 0.5;
      } else if (threatRight > threatLeft && timer > 0.2) {
        this.playerX -= speed * 0.5;
      }
    }

    this.playerX = Math.max(20, Math.min(620, this.playerX));
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
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    ctx.save();

    // Apply screen shake
    if (this.shakeTimer > 0) {
      ctx.translate(this.shakeX, this.shakeY);
    }

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Title
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DODGE FALLING', x + w / 2, y + 28);
    ctx.font = '11px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Dodge the falling blocks! Use arrow keys or click sides.', x + w / 2, y + 46);

    // HP as heart circles
    const heartSize = 6;
    const heartSpacing = 18;
    const heartsStartX = x + w / 2 - ((this.hp - 1) * heartSpacing) / 2;
    const heartsY = y + 60;
    for (let i = 0; i < this.hp; i++) {
      ctx.save();
      ctx.shadowBlur = 6;
      ctx.shadowColor = cols.accent;
      ctx.fillStyle = cols.accent;
      ctx.beginPath();
      ctx.arc(heartsStartX + i * heartSpacing, heartsY, heartSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Timer
    ctx.fillStyle = cols.text + '66';
    ctx.font = '12px monospace';
    ctx.fillText('Time: ' + Math.ceil(this.timeLeft) + 's', x + w / 2, y + 78);

    // Play area background
    ctx.fillStyle = cols.panel + '44';
    ctx.fillRect(x + 20, y + 96, 640, 220);

    // Trail particles
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = cols.accent;
      ctx.fillRect(x + 20 + p.x - p.w / 2, y + 90 + p.y, p.w, p.h);
    }
    ctx.globalAlpha = 1;

    // Falling blocks with highlight and glow
    for (const b of this.blocks) {
      const bx = x + 20 + b.x;
      const by = y + 90 + b.y;

      // Glow
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = cols.accent;

      // Main block body
      ctx.fillStyle = cols.accent;
      ctx.fillRect(bx, by, b.w, b.h);

      ctx.restore();

      // Top highlight stripe
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(bx, by, b.w, 3);
    }

    // Player character with glow
    const px = x + 20 + this.playerX;
    const py = y + 96 + 160;

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = cols.accent;

    // Body
    ctx.fillStyle = cols.accent;
    ctx.fillRect(px - 8, py - 10, 16, 14);

    // Head
    ctx.beginPath();
    ctx.arc(px, py - 16, 7, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (tiny dark dots)
    ctx.fillStyle = cols.panel;
    ctx.fillRect(px - 3, py - 17, 2, 2);
    ctx.fillRect(px + 1, py - 17, 2, 2);

    ctx.restore();

    // Legs (small rectangles below body, no glow)
    ctx.fillStyle = cols.accent + 'cc';
    ctx.fillRect(px - 6, py + 4, 4, 5);
    ctx.fillRect(px + 2, py + 4, 4, 5);

    // Flash overlay on hit
    if (this.flashTimer > 0) {
      const flashAlpha = this.flashTimer / 0.15 * 0.3;
      ctx.fillStyle = 'rgba(255,50,50,' + flashAlpha.toFixed(3) + ')';
      ctx.fillRect(x + 20, y + 96, 640, 220);
    }

    // Game over text
    if (this.done) {
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.winner === 'attacker' ? 'YOU WIN!' : 'Defender wins!', x + w / 2, y + h - 20);
    }

    ctx.restore();
  }
}