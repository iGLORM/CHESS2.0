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
    this.difficulty = 1;
    this.hitFlashTimer = 0;
    this.shakeTimer = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  init(attacker, defender, difficulty, isDuel) {
    this.done = false;
    this.winner = null;
    this.playerX = 320;
    this.playerY = 240;
    this.playerSize = 14;
    this.bullets = [];
    this.difficulty = difficulty || 1;
    // Scale difficulty: more HP for easy, faster bullets for hard
    this.hp = isDuel ? 25 : Math.max(10, 20 - this.difficulty);
    this.maxHp = this.hp;
    this.timeLeft = this.survivalTime;
    this.phase = 0;
    this.spawnTimer = 0;
    this.running = true;
    this.keys = {};
    this.hitFlashTimer = 0;
    this.shakeTimer = 0;
    this.shakeX = 0;
    this.shakeY = 0;

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
    if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      const s = (this.shakeTimer / 0.16) * 5;
      this.shakeX = (Math.random() - 0.5) * s;
      this.shakeY = (Math.random() - 0.5) * s;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    // Player movement
    const sens = (store.get('settings').miniGameSensitivity || 1.0);
    const speed = 200 * dt * sens;
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
        this.hitFlashTimer = 1;
        this.shakeTimer = 0.16;
        this.bullets.splice(i, 1);
        audioManager.playTone(200, 0.08, 'sawtooth', 0.1);
        if (typeof PixiMiniGameFX !== 'undefined' && this._bounds) {
          const cx = this._bounds.x + this._bounds.w / 2;
          const cy = this._bounds.y + this._bounds.h / 2;
          PixiMiniGameFX.spawnHitFlash(this._bounds.x, this._bounds.y, this._bounds.w, this._bounds.h);
          PixiMiniGameFX.shakeScreen(5);
        }
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
    const diffBonus = (this.difficulty - 1) * 10;

    switch (this.phase % 4) {
      case 0: // Left-right waves
        for (let i = 0; i < 3; i++) {
          const fromLeft = Math.random() > 0.5;
          this.bullets.push({
            x: fromLeft ? arena.x - 10 : arena.x + arena.w + 10,
            y: arena.y + 30 + i * 60,
            vx: fromLeft ? 80 + this.phase * 20 + diffBonus : -(80 + this.phase * 20 + diffBonus),
            vy: 0,
            size: 6,
            color: 'danger',
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
            vy: fromTop ? 80 + this.phase * 20 + diffBonus : -(80 + this.phase * 20 + diffBonus),
            size: 6,
            color: 'warm',
          });
        }
        break;
      case 2: // Diagonal
        for (let i = 0; i < 4; i++) {
          const angle = Math.PI / 4 + i * Math.PI / 2 + Math.random() * 0.3;
          const spd = 60 + this.phase * 15 + diffBonus;
          this.bullets.push({
            x: arena.x + arena.w / 2,
            y: arena.y + arena.h / 2,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            size: 5,
            color: 'magic',
          });
        }
        break;
      case 3: // Spiral
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + Date.now() / 1000;
          const speed = 50 + this.phase * 10 + diffBonus;
          this.bullets.push({
            x: arena.x + arena.w / 2,
            y: arena.y + arena.h / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 4,
            color: 'cool',
          });
        }
        break;
    }
  }

  render(ctx, x, y, w, h) {
    this._bounds = { x, y, w, h };
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    ctx.fillStyle = cols.background || cols.bg || cols.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SOUL DODGE', x + w / 2, y + 30);

    // HP bar
    const hpBarW = 200;
    const hpBarH = 12;
    ctx.fillStyle = cols.panel;
    ctx.fillRect(x + w / 2 - hpBarW / 2, y + 45, hpBarW, hpBarH);
    const hpPct = this.hp / this.maxHp;
    ctx.fillStyle = hpPct > 0.5 ? cols.accent : hpPct > 0.25 ? (cols.highlight || cols.accent) : (cols.highlight || cols.text);
    ctx.fillRect(x + w / 2 - hpBarW / 2, y + 45, hpBarW * hpPct, hpBarH);
    ctx.fillStyle = cols.text;
    ctx.font = '12px monospace';
    ctx.fillText('HP: ' + this.hp + '/' + this.maxHp, x + w / 2, y + 55);

    // Timer
    ctx.fillStyle = cols.text + '88';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Survive: ' + Math.ceil(this.timeLeft) + 's', x + w / 2, y + 75);

    // Arena
    const arenaX = x + (w - 240) / 2;
    const arenaY = y + 95;
    const arenaW = 240;
    const arenaH = 200;

    // Arena background
    ctx.fillStyle = cols.panel + 'aa';
    ctx.fillRect(arenaX, arenaY, arenaW, arenaH);
    ctx.shadowColor = cols.accent;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = cols.text + '88';
    ctx.lineWidth = 2;
    ctx.strokeRect(arenaX, arenaY, arenaW, arenaH);
    ctx.shadowBlur = 0;

    // Bullets with glow
    for (const b of this.bullets) {
      const bx = arenaX + (b.x - 200);
      const by = arenaY + (b.y - 140);
      const bulletColor = b.color === 'warm' ? (cols.highlight || cols.accent)
        : b.color === 'magic' ? cols.text
        : b.color === 'cool' ? cols.accent
        : (cols.highlight || cols.accent);
      ctx.shadowColor = bulletColor;
      ctx.shadowBlur = 8;
      ctx.fillStyle = bulletColor;
      ctx.beginPath();
      ctx.arc(bx, by, b.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(bx - b.size * 0.2, by - b.size * 0.2, b.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player (soul/heart) with glow
    const px = arenaX + (this.playerX - 200);
    const py = arenaY + (this.playerY - 140);
    const ps = this.playerSize;

    const flashWhite = this.hitFlashTimer > 0 && Math.floor(this.hitFlashTimer * 12) % 2 === 0;
    ctx.shadowColor = flashWhite ? cols.text : (cols.highlight || cols.accent);
    ctx.shadowBlur = 12;
    ctx.fillStyle = flashWhite ? cols.text : (cols.highlight || cols.accent);
    // Heart shape
    ctx.beginPath();
    ctx.moveTo(px, py + ps * 0.3);
    ctx.bezierCurveTo(px, py - ps * 0.3, px - ps, py - ps * 0.3, px - ps, py + ps * 0.1);
    ctx.bezierCurveTo(px - ps, py + ps * 0.6, px, py + ps, px, py + ps * 1.2);
    ctx.bezierCurveTo(px, py + ps, px + ps, py + ps * 0.6, px + ps, py + ps * 0.1);
    ctx.bezierCurveTo(px + ps, py - ps * 0.3, px, py - ps * 0.3, px, py + ps * 0.3);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Inner highlight
    ctx.fillStyle = 'rgba(255, 120, 120, 0.5)';
    ctx.beginPath();
    ctx.ellipse(px - ps * 0.2, py, ps * 0.3, ps * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Controls hint
    ctx.fillStyle = cols.text + '44';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Arrow keys / WASD to dodge', x + w / 2, y + 320);

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

    ctx.restore();
  }

  botPlay(dt, timer) {
    if (this.done || !this.running) return;
    const arena = { x: 200, y: 140, w: 240, h: 200 };
    const speed = 200 * dt;
    const lookAhead = 0.3;

    // Calculate evasion force from all bullets weighted by proximity
    let evadeX = 0;
    let evadeY = 0;
    let totalWeight = 0;

    for (const b of this.bullets) {
      // Predict bullet position shortly into the future
      const bx = b.x + b.vx * lookAhead;
      const by = b.y + b.vy * lookAhead;
      const dx = this.playerX - bx;
      const dy = this.playerY - by;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const threatRange = this.playerSize + b.size + 50;
      if (dist < threatRange && dist > 0.01) {
        // Evade away from bullet, weighted by inverse distance
        const weight = (threatRange - dist) / threatRange;
        evadeX += (dx / dist) * weight;
        evadeY += (dy / dist) * weight;
        totalWeight += weight;
      }
    }

    // Also avoid arena edges
    const edgeMargin = 25;
    if (this.playerX < arena.x + this.playerSize + edgeMargin) evadeX += 0.5;
    if (this.playerX > arena.x + arena.w - this.playerSize - edgeMargin) evadeX -= 0.5;
    if (this.playerY < arena.y + this.playerSize + edgeMargin) evadeY += 0.5;
    if (this.playerY > arena.y + arena.h - this.playerSize - edgeMargin) evadeY -= 0.5;

    if (totalWeight > 0) {
      const mag = Math.sqrt(evadeX * evadeX + evadeY * evadeY) || 1;
      this.playerX += (evadeX / mag) * speed;
      this.playerY += (evadeY / mag) * speed;
    }

    this.playerX = Math.max(arena.x + this.playerSize, Math.min(arena.x + arena.w - this.playerSize, this.playerX));
    this.playerY = Math.max(arena.y + this.playerSize, Math.min(arena.y + arena.h - this.playerSize, this.playerY));
  }

  handleClick(x, y) {}

  handleKey(key) {}

  cleanup() {
    document.removeEventListener('keydown', this.keyHandler);
    document.removeEventListener('keyup', this.keyHandlerUp);
  }
}
