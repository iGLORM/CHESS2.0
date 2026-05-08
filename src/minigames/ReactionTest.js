class ReactionTest {
  constructor() {
    this.name = 'Reaction Test';
    this.done = false;
    this.winner = null;
    this.state = 'waiting'; // waiting, ready, reacting, result
    this.timer = 0;
    this.reactionTime = 0;
    this.readyTime = 0;
    this.trials = 0;
    this.maxTrials = 3;
    this.totalTime = 0;
    this.targetTime = 1200;

    // Visual polish state
    this.shakeTimer = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flashTimer = 0;
    this.flashColor = null;
    this.particles = [];
    this.pulsePhase = 0;

    // Store last-rendered area dimensions for particle spawning
    this._lastAreaLocalX = 100;
    this._lastAreaLocalY = 80;
    this._lastAreaW = 200;
    this._lastAreaH = 120;
  }

  init(attacker, defender) {
    this.done = false;
    this.winner = null;
    this.state = 'waiting';
    this.timer = 0;
    this.reactionTime = 0;
    this.trials = 0;
    this.totalTime = 0;
    this.shakeTimer = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flashTimer = 0;
    this.flashColor = null;
    this.particles = [];
    this.pulsePhase = 0;
    this.startWaiting();
    audioManager.playMiniGameStart();
  }

  startWaiting() {
    this.state = 'waiting';
    this.readyTime = Math.random() * 2000 + 1000;
    this.timer = 0;
  }

  spawnParticles(areaX, areaY, areaW, areaH, color) {
    const cx = areaX + areaW / 2;
    const cy = areaY + areaH / 2;
    const count = 8 + Math.floor(Math.random() * 3); // 8-10 particles
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 1.2 + Math.random() * 0.8,
        size: 2 + Math.random() * 3,
        color: color
      });
    }
  }

  update(dt) {
    if (this.done) return;

    this.pulsePhase = Date.now();

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt; // gravity
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Decay flash
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flashTimer = 0;
        this.flashColor = null;
      }
    }

    // Decay shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      if (this.shakeTimer <= 0) {
        this.shakeTimer = 0;
        this.shakeX = 0;
        this.shakeY = 0;
      } else {
        const intensity = this.shakeTimer / 0.2;
        this.shakeX = (Math.random() - 0.5) * 8 * intensity;
        this.shakeY = (Math.random() - 0.5) * 8 * intensity;
      }
    }

    if (this.state === 'waiting') {
      this.timer += dt * 1000;
      if (this.timer >= this.readyTime) {
        this.state = 'ready';
        this.timer = 0;
        this.flashTimer = 0.3;
        this.flashColor = 'green';
        audioManager.playTone(800, 0.1, 'square', 0.1);
      }
    }

    if (this.state === 'reacting') {
      this.timer += dt * 1000;
    }
  }

  botPlay(dt, timer) {
    if (this.done) return;
    if (this.state === 'ready') {
      // Bot has fast reaction with 85% success rate
      if (Math.random() < 0.85) this.handleClick(0, 0);
    }
  }

  handleKey(key) {
    if (key === ' ' || key === 'Enter') this.handleClick(0, 0);
  }

  handleClick(x, y) {
    if (this.done) return;

    if (this.state === 'waiting') {
      // Too early!
      this.state = 'result';
      this.reactionTime = -1;
      this.flashTimer = 0.3;
      this.flashColor = 'red';
      this.shakeTimer = 0.2;
      setTimeout(() => {
        if (this.trials < this.maxTrials) {
          this.startWaiting();
        } else {
          this.finish();
        }
      }, 1000);
      return;
    }

    if (this.state === 'ready') {
      this.state = 'reacting';
      this.timer = 0;
      return;
    }

    if (this.state === 'reacting') {
      this.reactionTime = this.timer;
      this.totalTime += this.reactionTime;
      this.trials++;
      this.state = 'result';

      // Use last-rendered area bounds for particle spawning
      const areaX = this._lastAreaLocalX;
      const areaY = this._lastAreaLocalY;
      const areaW = this._lastAreaW;
      const areaH = this._lastAreaH;

      if (this.reactionTime < 200) {
        audioManager.playTone(900, 0.1, 'square', 0.1);
        this.spawnParticles(areaX, areaY, areaW, areaH, 'green');
      } else if (this.reactionTime < 350) {
        audioManager.playTone(700, 0.1, 'square', 0.08);
        this.spawnParticles(areaX, areaY, areaW, areaH, 'yellow');
      } else {
        audioManager.playTone(400, 0.1, 'sawtooth', 0.08);
        this.spawnParticles(areaX, areaY, areaW, areaH, 'red');
      }

      setTimeout(() => {
        if (this.trials < this.maxTrials) {
          this.startWaiting();
        } else {
          this.finish();
        }
      }, 1000);
    }
  }

  finish() {
    this.done = true;
    const avgTime = this.totalTime / this.maxTrials;
    this.winner = avgTime < this.targetTime ? 'attacker' : 'defender';
    if (this.winner === 'attacker') audioManager.playMiniGameWin();
    else audioManager.playMiniGameLose();
  }

  render(ctx, x, y, w, h) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    // Pulsing background alpha
    const pulseAlpha = 0.8 + 0.05 * Math.sin(this.pulsePhase / 500);

    // Animated gradient background using cols.panel
    const panelR = parseInt(cols.panel.slice(1, 3), 16) || 0;
    const panelG = parseInt(cols.panel.slice(3, 5), 16) || 0;
    const panelB = parseInt(cols.panel.slice(5, 7), 16) || 0;
    const bgGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    bgGrad.addColorStop(0, `rgba(${panelR},${panelG},${panelB},${pulseAlpha})`);
    bgGrad.addColorStop(0.5, `rgba(${Math.min(255, panelR + 10)},${Math.min(255, panelG + 10)},${Math.min(255, panelB + 20)},${pulseAlpha + 0.05})`);
    bgGrad.addColorStop(1, `rgba(${panelR},${panelG},${panelB},${pulseAlpha})`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Title
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('REACTION TEST', x + w / 2, y + 35);

    // Subtitle
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Click when the screen turns green!', x + w / 2, y + 55);

    // Reaction area
    const areaX = x + 100;
    const areaY = y + 80;
    const areaW = w - 200;
    const areaH = 120;

    // Store local coords for particle spawning from handleClick
    this._lastAreaLocalX = 100;
    this._lastAreaLocalY = 80;
    this._lastAreaW = areaW;
    this._lastAreaH = areaH;

    // Apply shake transform
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    // Pulsing border glow
    const glowStrength = 5 + 10 * (0.5 + 0.5 * Math.sin(this.pulsePhase / 300));

    if (this.state === 'waiting') {
      // Diagonal line pattern overlay
      ctx.save();
      ctx.beginPath();
      ctx.rect(areaX, areaY, areaW, areaH);
      ctx.clip();

      // Blue gradient background for waiting
      const waitGrad = ctx.createLinearGradient(areaX, areaY, areaX, areaY + areaH);
      waitGrad.addColorStop(0, cols.panel);
      waitGrad.addColorStop(1, cols.background || cols.bg || cols.panel);
      ctx.fillStyle = waitGrad;
      ctx.fillRect(areaX, areaY, areaW, areaH);

      // Subtle diagonal line pattern
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let i = -areaH; i < areaW + areaH; i += 12) {
        ctx.beginPath();
        ctx.moveTo(areaX + i, areaY);
        ctx.lineTo(areaX + i + areaH, areaY + areaH);
        ctx.stroke();
      }
      ctx.restore();

      // Glowing border (accent color for "ready" state border per spec)
      ctx.shadowColor = cols.accent;
      ctx.shadowBlur = glowStrength;
      ctx.strokeStyle = cols.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(areaX, areaY, areaW, areaH);
      ctx.shadowBlur = 0;

      ctx.fillStyle = cols.text;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Wait...', x + w / 2, areaY + areaH / 2 + 6);

    } else if (this.state === 'ready' || this.state === 'reacting') {
      // Green gradient background
      ctx.save();
      ctx.beginPath();
      ctx.rect(areaX, areaY, areaW, areaH);
      ctx.clip();

      const readyGrad = ctx.createLinearGradient(areaX, areaY, areaX + areaW, areaY + areaH);
      readyGrad.addColorStop(0, cols.accent);
      readyGrad.addColorStop(1, cols.panel);
      ctx.fillStyle = readyGrad;
      ctx.fillRect(areaX, areaY, areaW, areaH);

      // Dot pattern overlay
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      for (let dy = 8; dy < areaH; dy += 16) {
        for (let dx = 8; dx < areaW; dx += 16) {
          ctx.beginPath();
          ctx.arc(areaX + dx, areaY + dy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // Pulsing glow border
      ctx.shadowColor = cols.accent;
      ctx.shadowBlur = glowStrength;
      ctx.strokeStyle = cols.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(areaX, areaY, areaW, areaH);
      ctx.shadowBlur = 0;

      ctx.fillStyle = cols.background || cols.bg || cols.panel;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CLICK NOW!', x + w / 2, areaY + areaH / 2 + 6);

    } else if (this.state === 'result') {
      if (this.reactionTime < 0) {
        // Too early - red with pattern
        ctx.save();
        ctx.beginPath();
        ctx.rect(areaX, areaY, areaW, areaH);
        ctx.clip();

        const redGrad = ctx.createLinearGradient(areaX, areaY, areaX, areaY + areaH);
        redGrad.addColorStop(0, cols.highlight || cols.accent);
        redGrad.addColorStop(1, cols.panel);
        ctx.fillStyle = redGrad;
        ctx.fillRect(areaX, areaY, areaW, areaH);

        // Diagonal cross-hatch pattern
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let i = -areaH; i < areaW + areaH; i += 12) {
          ctx.beginPath();
          ctx.moveTo(areaX + i, areaY);
          ctx.lineTo(areaX + i + areaH, areaY + areaH);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(areaX + i, areaY + areaH);
          ctx.lineTo(areaX + i + areaH, areaY);
          ctx.stroke();
        }
        ctx.restore();

        // Red glow border
        ctx.shadowColor = cols.highlight || cols.accent;
        ctx.shadowBlur = glowStrength;
        ctx.strokeStyle = cols.highlight || cols.accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(areaX, areaY, areaW, areaH);
        ctx.shadowBlur = 0;

        ctx.fillStyle = cols.text;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Too early!', x + w / 2, areaY + areaH / 2 + 6);

      } else {
        // Result time display
        const isFast = this.reactionTime < 300;
        const bgTop = isFast ? cols.accent : (cols.highlight || cols.text);
        const bgBot = cols.panel;

        ctx.save();
        ctx.beginPath();
        ctx.rect(areaX, areaY, areaW, areaH);
        ctx.clip();

        const resultGrad = ctx.createLinearGradient(areaX, areaY, areaX + areaW, areaY + areaH);
        resultGrad.addColorStop(0, bgTop);
        resultGrad.addColorStop(1, bgBot);
        ctx.fillStyle = resultGrad;
        ctx.fillRect(areaX, areaY, areaW, areaH);

        // Dot pattern
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        for (let dy = 8; dy < areaH; dy += 16) {
          for (let dx = 8; dx < areaW; dx += 16) {
            ctx.beginPath();
            ctx.arc(areaX + dx, areaY + dy, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // Glow border matching result quality
        ctx.shadowColor = isFast ? cols.accent : (cols.highlight || cols.accent);
        ctx.shadowBlur = glowStrength;
        ctx.strokeStyle = isFast ? cols.accent : (cols.highlight || cols.accent);
        ctx.lineWidth = 2;
        ctx.strokeRect(areaX, areaY, areaW, areaH);
        ctx.shadowBlur = 0;

        ctx.fillStyle = cols.text;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(this.reactionTime) + 'ms', x + w / 2, areaY + areaH / 2 + 6);
      }
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color === 'green' ? cols.accent
                     : p.color === 'yellow' ? (cols.highlight || cols.accent)
                     : (cols.highlight || cols.text);
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x + x, p.y + y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Screen flash overlay
    if (this.flashTimer > 0 && this.flashColor) {
      const flashAlpha = this.flashTimer / 0.3 * 0.3;
      ctx.fillStyle = this.flashColor === 'green'
        ? `rgba(68,255,68,${flashAlpha})`
        : `rgba(255,68,68,${flashAlpha})`;
      ctx.fillRect(x, y, w, h);
    }

    // Restore shake transform
    ctx.restore();

    // Stats (outside shake transform so they stay stable)
    ctx.fillStyle = cols.text + '66';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Trial: ' + (this.trials + 1) + '/' + this.maxTrials, x + w / 2, areaY + areaH + 25);
    if (this.trials > 0) {
      ctx.fillText('Avg: ' + Math.round(this.totalTime / this.trials) + 'ms', x + w / 2, areaY + areaH + 45);
    }
    ctx.fillStyle = cols.accent;
    ctx.font = '10px monospace';
    ctx.fillText('Target: <' + this.targetTime + 'ms to win', x + w / 2, areaY + areaH + 65);

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
  }

  cleanup() {}
}
