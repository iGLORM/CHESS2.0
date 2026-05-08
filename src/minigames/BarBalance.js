class BarBalance {
  constructor() {
    this.name = 'Bar Balance';
    this.done = false;
    this.winner = null;
    this.angle = 0;
    this.angularVelocity = 0;
    this.timeLeft = 10;
    this.difficulty = 1;
    // Visual polish state
    this.shakeTimer = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.particles = [];
    this.flashTimer = 0;
    this.flashColor = null;
    this.bgOffset = 0;
    this.lastRect = { x: 0, y: 0, w: 1, h: 1 };
  }

  init(attacker, defender, difficulty, isDuel) {
    this.done = false;
    this.winner = null;
    this.angle = 0;
    this.angularVelocity = (Math.random() - 0.5) * 0.5;
    this.timeLeft = isDuel ? 15 : 10;
    this.difficulty = difficulty || 1;
    this.clicksLeft = 0;
    this.clicksRight = 0;
    // Reset visual state
    this.shakeTimer = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.particles = [];
    this.flashTimer = 0;
    this.flashColor = null;
    this.bgOffset = 0;
  }

  _spawnParticles(px, py, cols) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 120,
        vy: (Math.random() - 0.5) * 120 - 30,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.4 + Math.random() * 0.3,
        color: cols.accent,
        size: 2 + Math.random() * 3,
      });
    }
  }

  update(dt) {
    if (this.done) {
      // Decay flash
      if (this.flashTimer > 0) this.flashTimer -= dt;
      return;
    }
    this.timeLeft -= dt;

    // Gravity pulls toward center
    this.angularVelocity -= this.angle * 0.02;
    // Wind/difficulty adds random force
    this.angularVelocity += (Math.random() - 0.5) * (0.01 + this.difficulty * 0.005);
    // Friction
    this.angularVelocity *= 0.98;

    this.angle += this.angularVelocity;

    // Click inputs
    if (this.clicksLeft > 0) {
      this.angularVelocity -= 0.08;
      this.clicksLeft--;
    }
    if (this.clicksRight > 0) {
      this.angularVelocity += 0.08;
      this.clicksRight--;
    }

    // Spawn spark particles when tilting dangerously
    if (Math.abs(this.angle) > 0.6) {
      const theme = ThemeManager.getTheme(store.get('theme'));
      this._spawnParticles(0, 0, theme.colors);
      // Small shake when tilting hard
      if (this.shakeTimer <= 0) {
        this.shakeTimer = 0.08;
      }
    }

    // Decay shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const intensity = Math.max(0, this.shakeTimer / 0.2) * 4;
      this.shakeX = (Math.random() - 0.5) * intensity;
      this.shakeY = (Math.random() - 0.5) * intensity;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt; // gravity
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Scroll background
    this.bgOffset += dt * 20;

    if (Math.abs(this.angle) > 1.2) {
      this.done = true;
      this.winner = 'defender';
      this.shakeTimer = 0.2;
      this.flashTimer = 0.4;
      this.flashColor = 'rgba(255,60,60,';
      audioManager.playMiniGameLose();
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.done = true;
      this.winner = 'attacker';
      this.flashTimer = 0.4;
      this.flashColor = 'rgba(60,255,60,';
      audioManager.playMiniGameWin();
    }
  }

  botPlay(dt, timer) {
    if (this.done) return;
    // Bot pushes against the tilt
    if (this.angle > 0.2) {
      this.clicksLeft++;
    } else if (this.angle < -0.2) {
      this.clicksRight++;
    } else if (Math.abs(this.angle) > 0.05 && Math.random() < 0.3) {
      if (this.angle > 0) this.clicksLeft++;
      else this.clicksRight++;
    }
  }

  handleKey(key) {
    if (this.done) return;
    if (key === 'ArrowLeft' || key === 'a') {
      this.clicksLeft++;
      audioManager.playTone(400, 0.05, 'square', 0.04);
    } else if (key === 'ArrowRight' || key === 'd') {
      this.clicksRight++;
      audioManager.playTone(400, 0.05, 'square', 0.04);
    }
  }

  handleClick(x, y) {
    if (this.done) return;
    const rect = this.lastRect || { x: 0, y: 0, w: 1, h: 1 };
    const cx = rect.x + rect.w / 2;
    if (x < cx) {
      this.clicksLeft++;
    } else {
      this.clicksRight++;
    }
    audioManager.playTone(400, 0.05, 'square', 0.04);
  }

  render(ctx, x, y, w, h) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;
    this.lastRect = { x, y, w, h };

    ctx.fillStyle = cols.background || cols.bg || cols.panel;
    ctx.fillRect(x, y, w, h);

    // Animated background pattern: scrolling dots
    ctx.save();
    ctx.globalAlpha = 0.08;
    const dotSpacing = 30;
    const offX = this.bgOffset % dotSpacing;
    const offY = (this.bgOffset * 0.5) % dotSpacing;
    ctx.fillStyle = cols.text;
    for (let dx = -dotSpacing + offX; dx < w + dotSpacing; dx += dotSpacing) {
      for (let dy = -dotSpacing + offY; dy < h + dotSpacing; dy += dotSpacing) {
        ctx.fillRect(x + dx, y + dy, 2, 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Panel background
    ctx.fillStyle = cols.panel;
    ctx.globalAlpha = 0.4;
    const panelPad = 12;
    this._roundRect(ctx, x + panelPad, y + panelPad, w - panelPad * 2, h - panelPad * 2, 10);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Apply shake offset
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    // Title
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BAR BALANCE', x + w / 2, y + 24);
    ctx.font = 'bold 12px monospace';
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = cols.text;
    ctx.fillText('Click LEFT side to push left, RIGHT side to push right', x + w / 2, y + 42);
    ctx.globalAlpha = 1;

    const cx = x + w / 2;
    const cy = y + 100;
    const barW = 200;
    const barH = 10;

    // Balance meter: thin glowing line at center
    const balanceRatio = 1 - Math.min(1, Math.abs(this.angle) / 1.2);
    ctx.save();
    ctx.globalAlpha = 0.3 + balanceRatio * 0.7;
    ctx.shadowColor = cols.accent;
    ctx.shadowBlur = balanceRatio * 16;
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 55);
    ctx.lineTo(cx, cy + 15);
    ctx.stroke();
    ctx.restore();

    // Pivot triangle
    ctx.fillStyle = cols.text + '66';
    ctx.beginPath();
    ctx.moveTo(cx, cy + 8);
    ctx.lineTo(cx - 8, cy + 18);
    ctx.lineTo(cx + 8, cy + 18);
    ctx.closePath();
    ctx.fill();

    // Pivot circle
    ctx.fillStyle = cols.text + '55';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = cols.text + '88';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Bar with 3D gradient and rounded corners
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);

    // Bar shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    this._roundRect(ctx, -barW / 2, 2, barW, barH, 5);
    ctx.fill();

    // 3D gradient bar
    const isBalanced = Math.abs(this.angle) < 0.3;
    const barGrad = ctx.createLinearGradient(0, -barH / 2, 0, barH / 2);
    if (isBalanced) {
      barGrad.addColorStop(0, this._lightenColor(cols.accent, 40));
      barGrad.addColorStop(0.4, cols.accent);
      barGrad.addColorStop(1, this._darkenColor(cols.accent, 50));
    } else {
      barGrad.addColorStop(0, cols.highlight || cols.accent);
      barGrad.addColorStop(0.4, cols.highlight || cols.text);
      barGrad.addColorStop(1, cols.panel);
    }
    ctx.fillStyle = barGrad;
    this._roundRect(ctx, -barW / 2, -barH / 2, barW, barH, 5);
    ctx.fill();

    // Top highlight stripe
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = cols.text;
    this._roundRect(ctx, -barW / 2 + 4, -barH / 2 + 1, barW - 8, 3, 2);
    ctx.fill();
    ctx.restore();

    // Ball / weight indicator on the bar
    const ballOffset = this.angle * barW * 0.4;
    const ballRadius = 10;

    // Ball shadow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(ballOffset, barH / 2 + 6, ballRadius * 0.8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ball glow
    ctx.save();
    ctx.shadowColor = isBalanced ? cols.accent : (cols.highlight || cols.accent);
    ctx.shadowBlur = 10;
    const ballGrad = ctx.createRadialGradient(
      ballOffset - 2, -barH / 2 - ballRadius + 2, 2,
      ballOffset, -barH / 2 - ballRadius, ballRadius
    );
    ballGrad.addColorStop(0, cols.text);
    ballGrad.addColorStop(0.6, isBalanced ? cols.accent : (cols.highlight || cols.accent));
    ballGrad.addColorStop(1, this._darkenColor(isBalanced ? cols.accent : (cols.highlight || cols.accent), 60));
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(ballOffset, -barH / 2 - ballRadius, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ball highlight
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = cols.text;
    ctx.beginPath();
    ctx.arc(ballOffset - 3, -barH / 2 - ballRadius - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // End caps / weights on bar ends
    const capSize = 14;
    ctx.fillStyle = this._darkenColor(isBalanced ? cols.accent : (cols.highlight || cols.accent), 30);
    ctx.beginPath();
    ctx.arc(-barW / 2, 0, capSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(barW / 2, 0, capSize / 2, 0, Math.PI * 2);
    ctx.fill();
    // Cap shine
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = cols.text;
    ctx.beginPath();
    ctx.arc(-barW / 2 - 1, -2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(barW / 2 - 1, -2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Particles (rendered in bar-local space)
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.restore(); // un-rotate

    // Angle text
    ctx.fillStyle = cols.text;
    ctx.font = '12px monospace';
    ctx.fillText('Angle: ' + Math.round(this.angle * 57.3) + '°', x + w / 2, y + 155);
    ctx.fillText('Time: ' + Math.ceil(this.timeLeft) + 's', x + w / 2, y + 175);

    // Balance quality indicator
    ctx.font = '10px monospace';
    if (balanceRatio > 0.8) {
      ctx.fillStyle = cols.accent;
      ctx.fillText('STEADY', x + w / 2, y + 192);
    } else if (balanceRatio > 0.5) {
      ctx.fillStyle = cols.text + 'aa';
      ctx.fillText('WOBBLING', x + w / 2, y + 192);
    } else {
      ctx.fillStyle = cols.highlight || cols.accent;
      ctx.fillText('DANGER!', x + w / 2, y + 192);
    }

    if (this.done) {
      const win = this.winner === 'attacker';
      ctx.fillStyle = win ? 'rgba(80, 220, 130, 0.30)' : 'rgba(220, 70, 80, 0.30)';
      ctx.fillRect(x - this.shakeX, y - this.shakeY, w, h);
      ctx.fillStyle = cols.text;
      ctx.shadowColor = win ? cols.accent : (cols.highlight || cols.accent);
      ctx.shadowBlur = 14;
      ctx.font = 'bold 18px monospace';
      ctx.fillText(win ? 'You Win!' : 'You Lose!', x + w / 2, y + h / 2);
      ctx.shadowBlur = 0;
    }

    ctx.restore(); // un-shake

    // Flash overlay (outside shake transform)
    if (this.flashTimer > 0 && this.flashColor) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.flashTimer / 0.15) * 0.4;
      ctx.fillStyle = this.flashColor + '1)';
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
  }

  // Helper: draw a rounded rectangle path using arcTo
  _roundRect(ctx, rx, ry, rw, rh, radius) {
    const r = Math.min(radius, rw / 2, rh / 2);
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.arcTo(rx + rw, ry, rx + rw, ry + r, r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.arcTo(rx + rw, ry + rh, rx + rw - r, ry + rh, r);
    ctx.lineTo(rx + r, ry + rh);
    ctx.arcTo(rx, ry + rh, rx, ry + rh - r, r);
    ctx.lineTo(rx, ry + r);
    ctx.arcTo(rx, ry, rx + r, ry, r);
    ctx.closePath();
  }

  // Helper: lighten a hex color
  _lightenColor(hex, amount) {
    const rgb = this._hexToRgb(hex);
    if (!rgb) return hex;
    return 'rgb(' +
      Math.min(255, rgb.r + amount) + ',' +
      Math.min(255, rgb.g + amount) + ',' +
      Math.min(255, rgb.b + amount) + ')';
  }

  // Helper: darken a hex color
  _darkenColor(hex, amount) {
    const rgb = this._hexToRgb(hex);
    if (!rgb) return hex;
    return 'rgb(' +
      Math.max(0, rgb.r - amount) + ',' +
      Math.max(0, rgb.g - amount) + ',' +
      Math.max(0, rgb.b - amount) + ')';
  }

  // Helper: parse hex to rgb
  _hexToRgb(hex) {
    if (!hex || hex[0] !== '#') return null;
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  cleanup() {}
}
