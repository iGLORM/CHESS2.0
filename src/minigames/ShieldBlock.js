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
    this.shieldW = isDuel ? 70 : 90 - difficulty * 5;
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

    const moveSpeed = 3.2;
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
              color: Math.random() > 0.5 ? '#ffdd44' : '#ff8833',
            });
          }
          this.flashTimer = 0.1;
          this.flashColor = '#44ff44';
          audioManager.playSelect();
          continue;
        }
      }

      if (arrow.y > 1.05) {
        arrow.blocked = true;
        this.hp -= 2;
        this.shakeTimer = 0.2;
        this.flashTimer = 0.15;
        this.flashColor = '#ff4444';
        this.comboCount = 0;
        audioManager.playCapture();
        audioManager.playScreenShake();
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
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    const arenaX = x + 10;
    const arenaY = y + 10;
    const arenaW = w - 20;
    const arenaH = h - 20;

    if (this.flashTimer > 0) {
      ctx.globalAlpha = this.flashTimer * 3;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(arenaX, arenaY, arenaW, arenaH);
      ctx.globalAlpha = 1;
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

      ctx.fillStyle = '#ff6644';
      ctx.shadowColor = '#ff4422';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(-4, 4);
      ctx.lineTo(0, 2);
      ctx.lineTo(4, 4);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffaa44';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(0, 12);
      ctx.stroke();

      ctx.fillStyle = '#ffcc88';
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
      ctx.globalAlpha = spark.life / 0.8;
      ctx.fillStyle = spark.color;
      ctx.shadowColor = spark.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(arenaX + spark.x * arenaW - 2, arenaY + spark.y * arenaH - 2, 4, 4);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    const shieldPx = arenaX + this.shieldX * arenaW;
    const shieldY = arenaY + arenaH * 0.88;
    const sw = this.shieldW;
    const sh = 18;

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

    ctx.fillStyle = cols.accent + '88';
    ctx.fillRect(shieldPx - sw / 2 + 4, shieldY + 2, 6, sh - 2);
    ctx.fillRect(shieldPx + sw / 2 - 10, shieldY + 2, 6, sh - 2);
    ctx.shadowBlur = 0;

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('← →', shieldPx, shieldY + sh + 14);

    const hpW = arenaW * 0.6;
    const hpH = 10;
    const hpX = arenaX + (arenaW - hpW) / 2;
    const hpY = arenaY + 8;

    ctx.fillStyle = '#33333388';
    ctx.fillRect(hpX, hpY, hpW, hpH);
    const hpRatio = this.hp / this.maxHp;
    const hpColor = hpRatio > 0.5 ? '#44dd44' : hpRatio > 0.25 ? '#ddaa22' : '#dd3333';
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpX, hpY, hpW * hpRatio, hpH);
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpX, hpY, hpW, hpH);
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 10px monospace';
    ctx.fillText('HP ' + this.hp + '/' + this.maxHp, hpX + hpW / 2, hpY + 9);

    const timeLeft = Math.max(0, this.duration - this.timer);
    ctx.fillStyle = timeLeft < 3 ? '#ff4444' : cols.text;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(timeLeft.toFixed(1) + 's', arenaX + arenaW - 8, hpY + 9);

    ctx.textAlign = 'left';
    ctx.fillStyle = cols.text + '88';
    ctx.font = '10px monospace';
    ctx.fillText('Blocks: ' + this.blockCount, arenaX + 8, hpY + 9);

    if (this.comboCount > 1) {
      ctx.fillStyle = '#ffdd44';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ffdd44';
      ctx.shadowBlur = 8;
      ctx.fillText(this.comboCount + 'x COMBO', arenaX + arenaW / 2, arenaY + arenaH - 12);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  handleClick(x, y) {}

  handleKey(key) {}
}