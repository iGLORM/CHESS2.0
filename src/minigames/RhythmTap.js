class RhythmTap {
  constructor() {
    this.name = 'Rhythm Tap';
    this.done = false;
    this.winner = null;
    this.beats = [];
    this.currentBeat = 0;
    this.score = 0;
    this.timeLeft = 12;
    this.difficulty = 1;
    this.combo = 0;
    this.feedbacks = [];
    this.lastTrackW = 660;
  }

  init(attacker, defender, difficulty, isDuel) {
    this.done = false;
    this.winner = null;
    this.score = 0;
    this.currentBeat = 0;
    this.timeLeft = isDuel ? 18 : 12;
    this.difficulty = difficulty || 1;
    this.beatInterval = Math.max(0.5, 1.2 - difficulty * 0.15);
    this.beatTimer = 0;
    this.beats = [];
    this.window = 0.25;
    this.combo = 0;
    this.feedbacks = [];
    if (audioManager) audioManager.playMiniGameStart();
  }

  update(dt) {
    if (this.done) return;
    this.timeLeft -= dt;
    this.beatTimer += dt;

    // Spawn beats
    if (this.beatTimer >= this.beatInterval) {
      this.beatTimer = 0;
      this.beats.push({
        x: 0,
        life: 1.5,
        hit: false,
      });
    }

    // Update beats
    for (const b of this.beats) {
      b.x += ((this.lastTrackW || 660) / 1.5) * dt;
      b.life -= dt;
    }
    this.beats = this.beats.filter(b => b.life > 0 && !b.hit);
    for (let i = this.feedbacks.length - 1; i >= 0; i--) {
      const f = this.feedbacks[i];
      f.life -= dt;
      f.y -= 26 * dt;
      if (f.life <= 0) this.feedbacks.splice(i, 1);
    }

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.done = true;
      const needed = 4 + this.difficulty * 2;
      this.winner = this.score >= needed ? 'attacker' : 'defender';
      if (audioManager) {
        if (this.winner === 'attacker') audioManager.playMiniGameWin();
        else audioManager.playMiniGameLose();
      }
    }
  }

  botPlay(dt, timer) {
    if (this.done) return;
    const targetX = (this.lastTrackW || 660) * 0.455;
    const window = 50;
    for (const b of this.beats) {
      if (!b.hit && Math.abs(b.x - targetX) < window * 0.6) {
        if (Math.random() < 0.8) this.handleClick(0, 0);
        return;
      }
    }
  }

  handleKey(key) {
    if (key === ' ' || key === 'Enter') this.handleClick(0, 0);
  }

  handleClick(x, y) {
    if (this.done) return;
    // Check if any beat is in the target zone
    const targetX = (this.lastTrackW || 660) * 0.455;
    const window = 50;
    let hit = false;
    for (const b of this.beats) {
      if (!b.hit && Math.abs(b.x - targetX) < window) {
        b.hit = true;
        this.score++;
        this.combo++;
        hit = true;
        const accuracy = 1 - Math.abs(b.x - targetX) / window;
        const label = accuracy > 0.82 ? 'Perfect!' : 'Good';
        this.feedbacks.push({ text: label, life: 0.7, maxLife: 0.7, y: 0, accuracy });
        const pitch = 400 + accuracy * 400;
        audioManager.playTone(pitch, 0.1, 'square', 0.08);
        break;
      }
    }
    if (!hit) {
      this.combo = 0;
      this.feedbacks.push({ text: 'Miss', life: 0.65, maxLife: 0.65, y: 0, accuracy: 0 });
      audioManager.playTone(200, 0.05, 'sawtooth', 0.04);
    }
  }

  _roundRect(ctx, rx, ry, rw, rh, r) {
    r = Math.min(r, rw / 2, rh / 2);
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
    ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
    ctx.arcTo(rx, ry + rh, rx, ry, r);
    ctx.arcTo(rx, ry, rx + rw, ry, r);
    ctx.closePath();
  }

  _resultOverlay(ctx, x, y, w, h, cols) {
    if (!this.done) return;
    const win = this.winner === 'attacker';
    ctx.save();
    ctx.fillStyle = win ? 'rgba(80, 220, 130, 0.30)' : 'rgba(220, 70, 80, 0.30)';
    ctx.fillRect(x, y, w, h);
    ctx.shadowColor = win ? cols.accent : (cols.highlight || cols.accent);
    ctx.shadowBlur = 14;
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(win ? 'You Win!' : 'You Lose!', x + w / 2, y + h / 2);
    ctx.restore();
  }

  render(ctx, x, y, w, h) {
    const cols = ThemeManager.getTheme(store.get('theme')).colors;
    ctx.fillStyle = cols.background || cols.bg || cols.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RHYTHM TAP', x + w / 2, y + 30);
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Tap when the blocks reach the green zone!', x + w / 2, y + 50);

    // Track
    const trackX = x + 20;
    const trackY = y + h * 0.28;
    const trackW = w - 40;
    this.lastTrackW = trackW;
    ctx.fillStyle = cols.text + '11';
    ctx.fillRect(trackX, trackY, trackW, 30);

    // Target zone with glow
    const pulse = 0.5 + 0.5 * Math.sin((this.beatTimer / this.beatInterval) * Math.PI * 2);
    const targetX = trackX + trackW * 0.455;
    ctx.shadowColor = cols.accent;
    ctx.shadowBlur = 8 + pulse * 16;
    ctx.fillStyle = cols.accent + '66';
    ctx.fillRect(targetX - 25, trackY, 50, 30);
    ctx.strokeStyle = cols.highlight || cols.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(targetX - 25, trackY, 50, 30);
    ctx.shadowBlur = 0;

    // Beats with rounded rects and glow
    for (const b of this.beats) {
      const bx = trackX + b.x - 8;
      const by = trackY + 5;
      ctx.shadowColor = b.hit ? cols.accent : (cols.highlight || cols.accent);
      ctx.shadowBlur = b.hit ? 12 : 6;
      ctx.fillStyle = b.hit ? cols.accent : (cols.highlight || cols.accent);
      // Rounded rect
      const r = 4;
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + 16 - r, by);
      ctx.arcTo(bx + 16, by, bx + 16, by + r, r);
      ctx.lineTo(bx + 16, by + 20 - r);
      ctx.arcTo(bx + 16, by + 20, bx + 16 - r, by + 20, r);
      ctx.lineTo(bx + r, by + 20);
      ctx.arcTo(bx, by + 20, bx, by + 20 - r, r);
      ctx.lineTo(bx, by + r);
      ctx.arcTo(bx, by, bx + r, by, r);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // Inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(bx + 3, by + 2, 10, 6);
    }

    for (const f of this.feedbacks) {
      const alpha = Math.max(0, f.life / f.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = f.accuracy > 0 ? cols.accent : (cols.highlight || cols.text);
      ctx.font = 'bold 13px monospace';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.fillText(f.text, x + w / 2, trackY - 18 + f.y);
      ctx.restore();
    }

    // Score panel
    this._roundRect(ctx, x + w / 2 - 150, trackY + 48, 300, 48, 7);
    ctx.fillStyle = cols.panel + 'dd';
    ctx.fill();
    ctx.fillStyle = cols.accent;
    ctx.font = 'bold 13px monospace';
    ctx.fillText('Score: ' + this.score + ' | Time: ' + Math.ceil(this.timeLeft) + 's', x + w / 2, trackY + 68);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 13px monospace';
    ctx.fillText('Combo: ' + this.combo, x + w / 2, trackY + 88);

    if (this.combo > 2) {
      ctx.save();
      ctx.fillStyle = cols.highlight || cols.accent;
      ctx.font = 'bold 18px monospace';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.fillText(this.combo + 'x', x + w / 2, trackY + 128);
      ctx.restore();
    }

    this._resultOverlay(ctx, x, y, w, h, cols);
  }

  cleanup() {}
}
