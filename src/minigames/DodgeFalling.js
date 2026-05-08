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
    this.playerTrail = [];
    this.lastRect = { x: 0, y: 0, w: 1, h: 1 };
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
    this.playerTrail = [];

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
    const oldX = this.playerX;
    const sens = (store.get('settings').miniGameSensitivity || 1.0);
    const speed = 160 * dt * sens;
    if (this.keys['ArrowLeft'] || this.keys['a']) this.playerX -= speed;
    if (this.keys['ArrowRight'] || this.keys['d']) this.playerX += speed;
    this.playerX = Math.max(20, Math.min(620, this.playerX));
    if (Math.abs(this.playerX - oldX) > 0.2) {
      this.playerTrail.push({ x: this.playerX, life: 0.28, maxLife: 0.28 });
      if (this.playerTrail.length > 5) this.playerTrail.shift();
    }
    for (let i = this.playerTrail.length - 1; i >= 0; i--) {
      this.playerTrail[i].life -= dt;
      if (this.playerTrail[i].life <= 0) this.playerTrail.splice(i, 1);
    }

    // Spawn blocks
    this.spawnTimer += dt;
    const rate = Math.max(0.15, 0.6 - this.difficulty * 0.05);
    if (this.spawnTimer >= rate) {
      this.spawnTimer = 0;
      const bw = 30 + Math.random() * 40;
      this.blocks.push({
        x: Math.random() * (640 - bw),
        y: -20,
        w: bw,
        h: 15,
        speed: 100 + this.difficulty * 20,
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
      // Collision with player — tight hitbox matching the character sprite
      const playerTop = 245;
      const playerBottom = 258;
      const playerHalfW = 9;
      if (b.y + b.h > playerTop && b.y < playerBottom &&
          b.x + b.w > this.playerX - playerHalfW && b.x < this.playerX + playerHalfW) {
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
    const speed = 200 * dt;
    const playerLeft = this.playerX - 14;
    const playerRight = this.playerX + 14;

    // Find all threats that overlap with player's current position
    let bestEscapeDir = 0;
    let mostUrgentDist = -Infinity;

    for (const b of this.blocks) {
      if (b.y < 0 || b.y > 270) continue;
      const blockLeft = b.x;
      const blockRight = b.x + b.w;
      const overlap = blockLeft < playerRight && blockRight > playerLeft;
      const distToPlayer = 240 - b.y;

      if (overlap && distToPlayer > mostUrgentDist) {
        mostUrgentDist = distToPlayer;
        // Escape toward the side that gives more clearance
        const spaceLeft = this.playerX - 20;
        const spaceRight = 620 - this.playerX;
        // Also consider other blocks when choosing direction
        let blockedLeft = false;
        let blockedRight = false;
        for (const other of this.blocks) {
          if (other === b) continue;
          if (other.y > 100 && other.y < 270) {
            const oLeft = other.x;
            const oRight = other.x + other.w;
            if (oRight > this.playerX - 60 && oLeft < this.playerX) blockedLeft = true;
            if (oLeft < this.playerX + 60 && oRight > this.playerX) blockedRight = true;
          }
        }
        if (blockedLeft && !blockedRight) bestEscapeDir = 1;
        else if (blockedRight && !blockedLeft) bestEscapeDir = -1;
        else bestEscapeDir = spaceRight > spaceLeft ? 1 : -1;
      }
    }

    if (bestEscapeDir !== 0) {
      this.playerX += bestEscapeDir * speed;
    }

    this.playerX = Math.max(20, Math.min(620, this.playerX));
  }

  handleClick(x, y) {
    const rect = this.lastRect || { x: 0, y: 0, w: 1, h: 1 };
    const cx = rect.x + rect.w / 2;
    if (x < cx) {
      this.keys['ArrowLeft'] = true;
      setTimeout(() => this.keys['ArrowLeft'] = false, 150);
    } else {
      this.keys['ArrowRight'] = true;
      setTimeout(() => this.keys['ArrowRight'] = false, 150);
    }
  }

  handleKey(key) {
    if (key === 'ArrowLeft' || key === 'a') this.playerX -= 15;
    if (key === 'ArrowRight' || key === 'd') this.playerX += 15;
  }

  render(ctx, x, y, w, h) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;
    this.lastRect = { x, y, w, h };

    ctx.save();

    // Apply screen shake
    if (this.shakeTimer > 0) {
      ctx.translate(this.shakeX, this.shakeY);
    }

    // Background
    ctx.fillStyle = cols.background || cols.bg || cols.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Title
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DODGE FALLING', x + w / 2, y + 28);
    ctx.font = 'bold 12px monospace';
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
    const areaX = x + 20;
    const areaY = y + 96;
    const areaW = w - 40;
    const areaH = h - 240;
    const sx = areaW / 640;
    const sy = areaH / 220;
    ctx.fillStyle = cols.panel + '44';
    ctx.fillRect(areaX, areaY, areaW, areaH);

    // Trail particles
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = cols.accent;
      ctx.fillRect(areaX + (p.x - p.w / 2) * sx, areaY - 6 + p.y * sy, p.w * sx, p.h * sy);
    }
    ctx.globalAlpha = 1;

    // Falling blocks with highlight and glow
    for (const b of this.blocks) {
      const bx = areaX + b.x * sx;
      const by = areaY - 6 + b.y * sy;

      // Glow
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = cols.accent;

      // Main block body
      ctx.fillStyle = cols.accent;
      ctx.fillRect(bx, by, b.w * sx, b.h * sy);

      ctx.restore();

      // Top highlight stripe
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(bx, by, b.w * sx, Math.max(2, 3 * sy));
    }

    // Player character with glow
    const py = areaY + 160 * sy;

    for (const p of this.playerTrail) {
      const alpha = Math.max(0, p.life / p.maxLife);
      const tx = areaX + p.x * sx;
      ctx.save();
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = cols.accent;
      ctx.fillRect(tx - 10 * sx, py - 18 * sy, 20 * sx, 28 * sy);
      ctx.restore();
    }

    const px = areaX + this.playerX * sx;

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
      ctx.fillStyle = 'rgba(220,70,80,' + flashAlpha.toFixed(3) + ')';
      ctx.fillRect(areaX, areaY, areaW, areaH);
    }

    // Game over text
    if (this.done) {
      const win = this.winner === 'attacker';
      ctx.fillStyle = win ? 'rgba(80, 220, 130, 0.30)' : 'rgba(220, 70, 80, 0.30)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = cols.text;
      ctx.shadowColor = win ? cols.accent : (cols.highlight || cols.accent);
      ctx.shadowBlur = 14;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(win ? 'You Win!' : 'You Lose!', x + w / 2, y + h / 2);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
