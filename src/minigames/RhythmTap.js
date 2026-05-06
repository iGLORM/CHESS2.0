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
      b.x += (600 / 1.5) * dt;
      b.life -= dt;
    }
    this.beats = this.beats.filter(b => b.life > 0 && !b.hit);

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
    const targetX = 300;
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
    const targetX = 300;
    const window = 50;
    let hit = false;
    for (const b of this.beats) {
      if (!b.hit && Math.abs(b.x - targetX) < window) {
        b.hit = true;
        this.score++;
        hit = true;
        const accuracy = 1 - Math.abs(b.x - targetX) / window;
        const pitch = 400 + accuracy * 400;
        audioManager.playTone(pitch, 0.1, 'square', 0.08);
        break;
      }
    }
    if (!hit) {
      audioManager.playTone(200, 0.05, 'sawtooth', 0.04);
    }
  }

  render(ctx, x, y, w, h) {
    const cols = ThemeManager.getTheme(store.get('theme')).colors;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RHYTHM TAP', x + w / 2, y + 30);
    ctx.font = '11px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Tap when the blocks reach the green zone!', x + w / 2, y + 50);

    // Track
    const trackY = y + 100;
    ctx.fillStyle = cols.text + '11';
    ctx.fillRect(x + 20, trackY, w - 40, 30);

    // Target zone with glow
    const targetX = x + 20 + 300;
    ctx.shadowColor = '#44aa44';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#225522';
    ctx.fillRect(targetX - 25, trackY, 50, 30);
    ctx.strokeStyle = '#66ff66';
    ctx.lineWidth = 2;
    ctx.strokeRect(targetX - 25, trackY, 50, 30);
    ctx.shadowBlur = 0;

    // Beats with rounded rects and glow
    for (const b of this.beats) {
      const bx = x + 20 + b.x - 8;
      const by = trackY + 5;
      ctx.shadowColor = b.hit ? '#44ff44' : '#ffaa00';
      ctx.shadowBlur = b.hit ? 12 : 6;
      ctx.fillStyle = b.hit ? '#44ff44' : '#ffaa00';
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

    // Score
    ctx.fillStyle = cols.accent;
    ctx.font = '13px monospace';
    ctx.fillText('Score: ' + this.score + ' | Time: ' + Math.ceil(this.timeLeft) + 's', x + w / 2, trackY + 55);

    if (this.done) {
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 16px monospace';
      ctx.fillText(this.winner === 'attacker' ? 'YOU WIN!' : 'Defender wins!', x + w / 2, y + h - 20);
    }
  }
}
