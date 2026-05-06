class WhackMole {
  constructor() {
    this.grid = [];
    this.cols = 4;
    this.rows = 3;
    this.moles = [];
    this.sparks = [];
    this.score = 0;
    this.target = 0;
    this.timer = 0;
    this.duration = 10;
    this.spawnTimer = 0;
    this.spawnInterval = 1.0;
    this.done = false;
    this.winner = null;
    this.difficulty = 1;
    this.isDuel = false;
    this.shakeTimer = 0;
    this.flashTimer = 0;
    this.missFlash = 0;
    this.streak = 0;
    this.bestStreak = 0;
  }

  init(attacker, defender, difficulty, isDuel) {
    this.difficulty = difficulty;
    this.isDuel = isDuel;
    this.score = 0;
    this.target = 3 + difficulty * 2;
    this.timer = 0;
    this.duration = isDuel ? 14 : 10;
    this.moles = [];
    this.sparks = [];
    this.spawnTimer = 0;
    this.spawnInterval = Math.max(0.5, 1.1 - difficulty * 0.12);
    this.done = false;
    this.winner = null;
    this.streak = 0;
    this.bestStreak = 0;
    this.shakeTimer = 0;
    this.flashTimer = 0;
    this.missFlash = 0;

    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.grid.push({ row: r, col: c, active: false, type: 'normal', timer: 0, maxTime: 0, hit: false, hitTimer: 0, popUp: 0 });
      }
    }
    if (audioManager) audioManager.playMiniGameStart();
  }

  cleanup() {}

  botPlay(dt, totalTime) {
    if (this.done) return;
    for (const cell of this.grid) {
      if (cell.active && !cell.hit && cell.popUp > 0.3 && Math.random() < 0.15) {
        this.whack(cell);
        break;
      }
    }
  }

  whack(cell) {
    if (!cell.active || cell.hit) return;
    cell.hit = true;
    cell.hitTimer = 0.3;
    const bonus = cell.type === 'gold' ? 2 : 1;
    this.score += bonus;
    this.streak++;
    if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    this.flashTimer = 0.1;

    const cx = (cell.col + 0.5) / this.cols;
    const cy = (cell.row + 0.5) / this.rows;
    const color = cell.type === 'gold' ? '#ffdd44' : '#44ff88';
    for (let i = 0; i < 5; i++) {
      this.sparks.push({
        x: cx, y: cy,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2.5 - 0.5,
        life: 0.4 + Math.random() * 0.2,
        color: color,
      });
    }
    audioManager.playSelect();
  }

  update(dt) {
    if (this.done) return;
    this.timer += dt;
    this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.missFlash = Math.max(0, this.missFlash - dt);

    if (this.timer >= this.duration) {
      this.done = true;
      this.winner = this.score >= this.target ? 'attacker' : 'defender';
      if (audioManager) {
        if (this.winner === 'attacker') audioManager.playMiniGameWin();
        else audioManager.playMiniGameLose();
      }
      return;
    }

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnInterval = Math.max(0.35, this.spawnInterval - 0.008);
      const inactive = this.grid.filter(c => !c.active);
      if (inactive.length > 0) {
        const cell = inactive[Math.floor(Math.random() * inactive.length)];
        cell.active = true;
        cell.hit = false;
        cell.hitTimer = 0;
        cell.popUp = 0;
        cell.maxTime = Math.max(1.2, 2.5 - this.difficulty * 0.25);
        cell.timer = cell.maxTime;
        cell.type = Math.random() < 0.15 ? 'gold' : 'normal';
      }
    }

    for (const cell of this.grid) {
      if (!cell.active) continue;
      if (cell.hit) {
        cell.hitTimer -= dt;
        if (cell.hitTimer <= 0) {
          cell.active = false;
          cell.hit = false;
        }
      } else {
        cell.timer -= dt;
        cell.popUp = Math.min(1, cell.popUp + dt * 8);
        if (cell.timer <= 0) {
          cell.active = false;
          this.streak = 0;
          this.missFlash = 0.15;
        }
      }
    }

    for (const spark of this.sparks) {
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vy += dt * 4;
      spark.life -= dt;
    }
    this.sparks = this.sparks.filter(s => s.life > 0);
  }

  render(ctx, x, y, w, h) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    const arenaX = x + 10;
    const arenaY = y + 10;
    const arenaW = w - 20;
    const arenaH = h - 20;

    this._arenaX = arenaX;
    this._arenaY = arenaY;
    this._arenaW = arenaW;
    this._arenaH = arenaH;

    if (this.flashTimer > 0) {
      ctx.globalAlpha = this.flashTimer * 2;
      ctx.fillStyle = '#44ff4422';
      ctx.fillRect(arenaX, arenaY, arenaW, arenaH);
      ctx.globalAlpha = 1;
    }
    if (this.missFlash > 0) {
      ctx.globalAlpha = this.missFlash;
      ctx.fillStyle = '#ff444422';
      ctx.fillRect(arenaX, arenaY, arenaW, arenaH);
      ctx.globalAlpha = 1;
    }

    const cellW = arenaW / this.cols;
    const cellH = arenaH / this.rows;
    const holeH = cellH * 0.3;
    const holePad = 6;

    for (const cell of this.grid) {
      const cx = arenaX + cell.col * cellW;
      const cy = arenaY + cell.row * cellH;

      ctx.fillStyle = cols.panel;
      ctx.fillRect(cx + holePad, cy + holePad, cellW - holePad * 2, cellH - holePad * 2);

      ctx.strokeStyle = cols.text + '22';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + holePad, cy + holePad, cellW - holePad * 2, cellH - holePad * 2);

      const holeTop = cy + cellH - holeH - holePad;

      ctx.fillStyle = '#22222288';
      ctx.beginPath();
      ctx.ellipse(cx + cellW / 2, holeTop + holeH / 2, (cellW - holePad * 2) / 2.2, holeH / 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = cols.text + '33';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (cell.active) {
        const moleH = (cellH - holePad * 2) * 0.55;
        const moleW = (cellW - holePad * 2) * 0.5;
        const moleX = cx + cellW / 2;
        const moleBaseY = holeTop + holeH / 2;
        const popOffset = moleH * cell.popUp * 0.5;
        const moleY = moleBaseY - popOffset;

        const moleColor = cell.type === 'gold' ? '#ffcc33' : '#cc8855';
        const moleHighlight = cell.type === 'gold' ? '#ffee88' : '#ddaa77';
        const eyeColor = cell.type === 'gold' ? '#884400' : '#332211';

        ctx.save();
        ctx.beginPath();
        ctx.rect(cx + holePad, cy + holePad, cellW - holePad * 2, cellH - holeH - holePad);
        ctx.clip();

        if (cell.hit) {
          ctx.globalAlpha = cell.hitTimer / 0.3;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(moleX, moleY, moleW / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = 'bold 14px monospace';
          ctx.fillStyle = cell.type === 'gold' ? '#ffcc33' : '#44ff44';
          ctx.textAlign = 'center';
          ctx.fillText(cell.type === 'gold' ? '+2' : '+1', moleX, moleY + 5);
        } else {
          ctx.shadowColor = moleColor;
          ctx.shadowBlur = 8;
          ctx.fillStyle = moleColor;
          ctx.beginPath();
          ctx.arc(moleX, moleY, moleW / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.fillStyle = moleHighlight;
          ctx.beginPath();
          ctx.arc(moleX, moleY - moleW * 0.15, moleW / 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = eyeColor;
          ctx.beginPath();
          ctx.arc(moleX - moleW * 0.2, moleY - moleW * 0.08, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(moleX + moleW * 0.2, moleY - moleW * 0.08, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(moleX - moleW * 0.2 - 1, moleY - moleW * 0.08 - 1, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(moleX + moleW * 0.2 - 1, moleY - moleW * 0.08 - 1, 1.5, 0, Math.PI * 2);
          ctx.fill();

          if (!cell.hit) {
            const noseWobble = Math.sin(Date.now() / 300 + cell.col) * 1;
            ctx.fillStyle = '#ff6688';
            ctx.beginPath();
            ctx.arc(moleX + noseWobble, moleY + moleW * 0.12, 3, 0, Math.PI * 2);
            ctx.fill();
          }

          if (cell.type === 'gold') {
            ctx.fillStyle = '#ffee44';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#ffee44';
            ctx.shadowBlur = 6;
            ctx.fillText('★', moleX, moleY - moleW / 2 - 4);
            ctx.shadowBlur = 0;
          }

          const urgency = cell.timer / cell.maxTime;
          if (urgency < 0.3) {
            ctx.strokeStyle = '#ff4444aa';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(moleX, moleY, moleW / 2 + 3, 0, Math.PI * 2 * (1 - urgency / 0.3));
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    for (const spark of this.sparks) {
      ctx.globalAlpha = spark.life / 0.6;
      ctx.fillStyle = spark.color;
      ctx.shadowColor = spark.color;
      ctx.shadowBlur = 6;
      const sx = arenaX + spark.x * arenaW;
      const sy = arenaY + spark.y * arenaH;
      ctx.fillRect(sx - 2, sy - 2, 4, 4);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    const barY = y - 2;
    const barH = 18;
    ctx.fillStyle = cols.panel + 'cc';
    ctx.fillRect(x, barY, w, barH);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Hits: ' + this.score + '/' + this.target, x + 8, barY + 13);

    ctx.textAlign = 'center';
    const timeLeft = Math.max(0, this.duration - this.timer);
    ctx.fillStyle = timeLeft < 3 ? '#ff4444' : cols.text;
    ctx.fillText(timeLeft.toFixed(1) + 's', x + w / 2, barY + 13);

    if (this.streak > 1) {
      ctx.fillStyle = '#ffdd44';
      ctx.textAlign = 'right';
      ctx.fillText(this.streak + 'x streak', x + w - 8, barY + 13);
    }

    const progW = w * 0.4;
    const progX = x + (w - progW) / 2;
    const progY = barY + 1;
    ctx.fillStyle = '#33333388';
    ctx.fillRect(progX, progY + barH - 5, progW, 3);
    ctx.fillStyle = this.score >= this.target ? '#44dd44' : cols.accent;
    ctx.fillRect(progX, progY + barH - 5, progW * Math.min(1, this.score / this.target), 3);
  }

  handleClick(x, y) {
    if (this.done) return;
    const arenaX = this._arenaX || 0;
    const arenaY = this._arenaY || 0;
    const arenaW = this._arenaW || 1;
    const arenaH = this._arenaH || 1;

    const cellW = arenaW / this.cols;
    const cellH = arenaH / this.rows;
    const pad = 6;

    for (const cell of this.grid) {
      if (!cell.active || cell.hit) continue;
      const cx = arenaX + cell.col * cellW + pad;
      const cy = arenaY + cell.row * cellH + pad;
      if (x >= cx && x <= cx + cellW - pad * 2 && y >= cy && y <= cy + cellH - pad * 2) {
        this.whack(cell);
        return;
      }
    }
  }

  handleKey(key) {}
}