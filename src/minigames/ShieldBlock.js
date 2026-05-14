class ShieldBlock {
  constructor() {
    this.shieldX = 0.5;
    this.shieldW = 80;
    this.arrows = [];
    this.sparks = [];
    this.hp = 20;
    this.maxHp = 20;
    this.timer = 0;
    this.duration = 12;
    this.spawnTimer = 0;
    this.spawnInterval = 1.2;
    this.done = false;
    this.winner = null;
    this.difficulty = 1;
    this.isDuel = false;
    this.phase = 'playing';
    this.shakeTimer = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.blockCount = 0;
    this.comboTimer = 0;
    this.comboCount = 0;
    this.flashTimer = 0;
    this.flashColor = null;
  }

  init(attacker, defender, difficulty, isDuel) {
    this.difficulty = difficulty;
    this.isDuel = isDuel;
    this.shieldX = 0.5;
    this.shieldW = isDuel ? 70 : Math.max(40, 90 - difficulty * 5);
    this.hp = isDuel ? 25 : 20;
    this.maxHp = this.hp;
    this.timer = 0;
    this.duration = isDuel ? 15 : 12;
    this.arrows = [];
    this.sparks = [];
    this.spawnTimer = 0;
    this.spawnInterval = Math.max(0.3, 1.4 - difficulty * 0.2);
    this.done = false;
    this.winner = null;
    this.phase = 'playing';
    this.shakeTimer = 0;
    this.blockCount = 0;
    this.comboTimer = 0;
    this.comboCount = 0;
    this.flashTimer = 0;
    this.flashColor = null;
    this._keys = {};
    this._keyHandler = (e) => { this._keys[e.key] = true; };
    this._keyUpHandler = (e) => { this._keys[e.key] = false; };
    document.addEventListener('keydown', this._keyHandler);
    document.addEventListener('keyup', this._keyUpHandler);
    if (audioManager) audioManager.playMiniGameStart();
  }

  cleanup() {
    document.removeEventListener('keydown', this._keyHandler);
    document.removeEventListener('keyup', this._keyUpHandler);
    this._keys = {};
  }

  botPlay(dt, totalTime) {
    if (this.done) return;
    // Find the most urgent arrow (highest y = closest to shield line)
    let mostUrgent = null;
    let highestY = -Infinity;
    for (const a of this.arrows) {
      if (!a.blocked && a.y > highestY) {
        highestY = a.y;
        mostUrgent = a;
      }
    }
    if (mostUrgent && mostUrgent.y > 0.15) {
      const targetX = mostUrgent.x;
      const urgency = Math.min(1, (mostUrgent.y - 0.15) / 0.7);
      const moveSpeed = dt * (3.5 + urgency * 5);
      if (this.shieldX < targetX - 0.03) this.shieldX += moveSpeed;
      else if (this.shieldX > targetX + 0.03) this.shieldX -= moveSpeed;
    }
  }

  update(dt) {
    if (this.done) return;
    this.timer += dt;
    this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);

    if (this.comboTimer <= 0) this.comboCount = 0;

    if (this.shakeTimer > 0) {
      this.shakeX = (Math.random() - 0.5) * 6 * (this.shakeTimer / 0.2);
      this.shakeY = (Math.random() - 0.5) * 6 * (this.shakeTimer / 0.2);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    if (this.timer >= this.duration) {
      this.done = true;
      this.winner = 'attacker';
      if (audioManager) audioManager.playMiniGameWin();
      this.cleanup();
      return;
    }

    const moveSpeed = 3.2 * (store.get('settings').shieldSensitivity || 1.0);
    if (this._keys['ArrowLeft'] || this._keys['a'] || this._keys['A']) this.shieldX -= dt * moveSpeed;
    if (this._keys['ArrowRight'] || this._keys['d'] || this._keys['D']) this.shieldX += dt * moveSpeed;
    this.shieldX = Math.max(0.1, Math.min(0.9, this.shieldX));

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnInterval = Math.max(0.25, this.spawnInterval - 0.01);
      this.arrows.push({
        x: 0.15 + Math.random() * 0.7,
        y: -0.05,
        speed: 0.6 + this.difficulty * 0.12 + Math.random() * 0.15,
        angle: (Math.random() - 0.5) * 0.3,
        blocked: false,
        alpha: 1,
      });
    }

    const shieldLeft = this.shieldX - this.shieldW / 2 / 600;
    const shieldRight = this.shieldX + this.shieldW / 2 / 600;

    for (const arrow of this.arrows) {
      if (arrow.blocked) continue;
      arrow.y += arrow.speed * dt;
      arrow.x += arrow.angle * dt;

      if (arrow.y >= 0.85 && arrow.y <= 0.95) {
        if (arrow.x >= shieldLeft && arrow.x <= shieldRight) {
          arrow.blocked = true;
          this.blockCount++;
          this.comboCount++;
          this.comboTimer = 1.5;
          for (let i = 0; i < 6; i++) {
            this.sparks.push({
              x: arrow.x, y: arrow.y,
              vx: (Math.random() - 0.5) * 3,
              vy: -Math.random() * 2 - 1,
              life: 0.5 + Math.random() * 0.3,
              color: 'spark',
            });
          }
          this.flashTimer = 0.1;
          this.flashColor = 'block';
          audioManager.playSelect();
          if (typeof PixiMiniGameFX !== 'undefined' && this._bounds) {
            const cx = this._bounds.x + this._bounds.w / 2;
            const cy = this._bounds.y + this._bounds.h * 0.88;
            PixiMiniGameFX.spawnSparks(cx, cy, '#ffdd44', 8);
            if (this.comboCount > 1) {
              PixiMiniGameFX.spawnCombo(cx, cy - 20, this.comboCount);
            }
          }
          continue;
        }
      }

      if (arrow.y > 1.05) {
        arrow.blocked = true;
        this.hp -= 2;
        this.shakeTimer = 0.2;
        this.flashTimer = 0.15;
        this.flashColor = 'hit';
        this.comboCount = 0;
        audioManager.playCapture();
        audioManager.playScreenShake();
        if (typeof PixiMiniGameFX !== 'undefined' && this._bounds) {
          const cx = this._bounds.x + this._bounds.w / 2;
          const cy = this._bounds.y + this._bounds.h / 2;
          PixiMiniGameFX.spawnHitFlash(this._bounds.x, this._bounds.y, this._bounds.w, this._bounds.h);
          PixiMiniGameFX.shakeScreen(6);
        }
        if (this.hp <= 0) {
          this.hp = 0;
          this.done = true;
          this.winner = 'defender';
          if (audioManager) audioManager.playMiniGameLose();
          this.cleanup();
          return;
        }
      }
    }

    this.arrows = this.arrows.filter(a => !a.blocked || a.alpha > 0);
    for (const arrow of this.arrows) {
      if (arrow.blocked) arrow.alpha -= dt * 5;
    }

    for (const spark of this.sparks) {
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vy += dt * 5;
      spark.life -= dt;
    }
    this.sparks = this.sparks.filter(s => s.life > 0);
  }

  render(ctx, x, y, w, h) {
    this._bounds = { x, y, w, h };
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    // Background
    ctx.fillStyle = cols.background || cols.bg || cols.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    const arenaX = x + 10;
    const arenaY = y + 10;
    const arenaW = w - 20;
    const arenaH = h - 20;

    if (this.flashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashTimer * 3;
      ctx.fillStyle = this.flashColor === 'block' ? cols.accent : (cols.highlight || cols.accent);
      ctx.fillRect(arenaX, arenaY, arenaW, arenaH);
      ctx.restore();
    }

    ctx.fillStyle = cols.panel + 'dd';
    ctx.fillRect(arenaX, arenaY, arenaW, arenaH);

    ctx.strokeStyle = cols.text + '33';
    ctx.lineWidth = 1;
    for (let i = 0; i < arenaW; i += 30) {
      ctx.beginPath();
      ctx.moveTo(arenaX + i, arenaY);
      ctx.lineTo(arenaX + i, arenaY + arenaH);
      ctx.stroke();
    }

    for (const arrow of this.arrows) {
      if (arrow.alpha <= 0) continue;
      const ax = arenaX + arrow.x * arenaW;
      const ay = arenaY + arrow.y * arenaH;
      ctx.globalAlpha = arrow.alpha;

      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(arrow.angle * 2);

      ctx.fillStyle = cols.highlight || cols.accent;
      ctx.shadowColor = cols.highlight || cols.accent;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(-4, 4);
      ctx.lineTo(0, 2);
      ctx.lineTo(4, 4);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = cols.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(0, 12);
      ctx.stroke();

      ctx.fillStyle = cols.text;
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(-3, 10);
      ctx.lineTo(3, 10);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    for (const spark of this.sparks) {
      ctx.save();
      ctx.globalAlpha = spark.life / 0.8;
      ctx.fillStyle = cols.highlight || cols.accent;
      ctx.shadowColor = cols.highlight || cols.accent;
      ctx.shadowBlur = 6;
      ctx.fillRect(arenaX + spark.x * arenaW - 2, arenaY + spark.y * arenaH - 2, 4, 4);
      ctx.restore();
    }

    const shieldPx = arenaX + this.shieldX * arenaW;
    const shieldY = arenaY + arenaH * 0.88;
    const sw = this.shieldW;
    const sh = 18;

    ctx.save();
    ctx.fillStyle = cols.accent;
    ctx.shadowColor = cols.accent;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(shieldPx - sw / 2, shieldY);
    ctx.lineTo(shieldPx - sw / 2 + 6, shieldY + sh);
    ctx.lineTo(shieldPx, shieldY + sh + 6);
    ctx.lineTo(shieldPx + sw / 2 - 6, shieldY + sh);
    ctx.lineTo(shieldPx + sw / 2, shieldY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = cols.accent + '88';
    ctx.fillRect(shieldPx - sw / 2 + 4, shieldY + 2, 6, sh - 2);
    ctx.fillRect(shieldPx + sw / 2 - 10, shieldY + 2, 6, sh - 2);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 12px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← →', shieldPx, shieldY + sh + 14);

    const hpW = arenaW * 0.6;
    const hpH = 10;
    const hpX = arenaX + (arenaW - hpW) / 2;
    const hpY = arenaY + 8;

    ctx.fillStyle = cols.panel + 'cc';
    ctx.fillRect(hpX, hpY, hpW, hpH);
    const hpRatio = this.hp / this.maxHp;
    const hpColor = hpRatio > 0.5 ? cols.accent : hpRatio > 0.25 ? (cols.highlight || cols.accent) : (cols.highlight || cols.text);
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpX, hpY, hpW * hpRatio, hpH);
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpX, hpY, hpW, hpH);
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 10px "Pixelify Sans", sans-serif';
    ctx.fillText('HP ' + this.hp + '/' + this.maxHp, hpX + hpW / 2, hpY + 9);

    const timeLeft = Math.max(0, this.duration - this.timer);
    ctx.fillStyle = timeLeft < 3 ? (cols.highlight || cols.accent) : cols.text;
    ctx.font = 'bold 12px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(timeLeft.toFixed(1) + 's', arenaX + arenaW - 8, hpY + 9);

    ctx.textAlign = 'left';
    ctx.fillStyle = cols.text + '88';
    ctx.font = '10px "Pixelify Sans", sans-serif';
    ctx.fillText('Blocks: ' + this.blockCount, arenaX + 8, hpY + 9);

    if (this.comboCount > 1) {
      ctx.save();
      ctx.fillStyle = cols.highlight || cols.accent;
      ctx.font = 'bold 14px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = cols.highlight || cols.accent;
      ctx.shadowBlur = 8;
      ctx.fillText(this.comboCount + 'x COMBO', arenaX + arenaW / 2, arenaY + arenaH - 12);
      ctx.restore();
    }

    if (!this.done && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = cols.text;
      ctx.font = 'bold 28px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('◀', x + 40, y + h / 2 + 10);
      ctx.fillText('▶', x + w - 40, y + h / 2 + 10);
      ctx.restore();
    }

    if (this.done) {
      MiniGameUtils.drawResultOverlay(ctx, x, y, w, h, this.winner === 'attacker', cols);
    }

    ctx.restore();
  }

  handleClick(x, y) {
    const rect = this._bounds || { x: 0, y: 0, w: 1, h: 1 };
    const cx = rect.x + rect.w / 2;
    if (x < cx) {
      this._keys['ArrowLeft'] = true;
      setTimeout(() => this._keys['ArrowLeft'] = false, 150);
    } else {
      this._keys['ArrowRight'] = true;
      setTimeout(() => this._keys['ArrowRight'] = false, 150);
    }
  }

  handleKey(key) {}
}
