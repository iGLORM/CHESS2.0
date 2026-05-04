class TimingStrike {
  constructor() {
    this.name = 'Timing Strike';
    this.done = false;
    this.winner = null;
    this.pos = 0;
    this.speed = 3;
    this.direction = 1;
    this.strikes = 0;
    this.maxStrikes = 3;
    this.score = 0;
    this.targets = [];
    this.waitingForStrike = false;
  }

  init(attacker, defender) {
    this.done = false;
    this.winner = null;
    this.pos = 0;
    this.speed = 2.5;
    this.direction = 1;
    this.strikes = 0;
    this.score = 0;
    this.waitingForStrike = true;
    audioManager.playMiniGameStart();
  }

  update(dt) {
    if (this.done || !this.waitingForStrike) return;
    this.pos += this.speed * this.direction * dt * 60;
    if (this.pos > 100) { this.pos = 100; this.direction = -1; }
    if (this.pos < 0) { this.pos = 0; this.direction = 1; }
  }

  botPlay(dt, timer) {
    if (this.done) return;
    if (this.waitingForStrike) {
      // Bot clicks when marker is in the green zone (center ±15)
      const center = 50;
      if (Math.abs(this.pos - center) < 18) {
        if (Math.random() < 0.7) this.handleClick(0, 0);
      }
    }
  }

  handleKey(key) {
    if (key === ' ' || key === 'Enter') this.handleClick(0, 0);
  }

  handleClick(x, y) {
    if (this.done) return;
    if (this.waitingForStrike) {
      this.strikes++;
      const center = 50;
      const diff = Math.abs(this.pos - center);
      let points = 0;
      if (diff < 5) { points = 100; } // Perfect!
      else if (diff < 10) { points = 75; }
      else if (diff < 20) { points = 50; }
      else if (diff < 35) { points = 25; }
      else { points = 0; }

      this.score += points;

      if (points >= 75) {
        audioManager.playTone(800, 0.1, 'square', 0.1);
      } else if (points >= 50) {
        audioManager.playTone(600, 0.1, 'square', 0.08);
      } else {
        audioManager.playTone(300, 0.1, 'sawtooth', 0.08);
      }

      if (this.strikes >= this.maxStrikes) {
        this.done = true;
        this.winner = this.score >= 150 ? 'attacker' : 'defender';
        if (this.winner === 'attacker') audioManager.playMiniGameWin();
        else audioManager.playMiniGameLose();
      } else {
        // Immediate reset for next strike - no delay
        this.pos = Math.random() * 100;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.speed = 2.5 + this.strikes * 0.5;
      }
    }
  }

  render(ctx, x, y, w, h) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TIMING STRIKE', x + w / 2, y + 35);

    ctx.font = '11px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Stop the bar in the green zone!', x + w / 2, y + 55);

    // Score
    ctx.fillStyle = cols.accent;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Score: ' + this.score + '/300', x + w / 2, y + 78);

    // The bar
    const barX = x + 80;
    const barY = y + 110;
    const barW = w - 160;
    const barH = 40;

    // Bar track with subtle gradient
    const grad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    grad.addColorStop(0, cols.text + '15');
    grad.addColorStop(0.5, cols.text + '22');
    grad.addColorStop(1, cols.text + '15');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Sweet spot (green zone) with glow
    const center = barX + barW * 0.4;
    const zoneW = barW * 0.2;
    const greenGrad = ctx.createLinearGradient(center, barY, center, barY + barH);
    greenGrad.addColorStop(0, '#66cc66');
    greenGrad.addColorStop(0.5, '#44aa44');
    greenGrad.addColorStop(1, '#338833');
    ctx.fillStyle = greenGrad;
    ctx.fillRect(center, barY, zoneW, barH);
    ctx.shadowColor = '#44ff44';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#66ff66';
    ctx.lineWidth = 2;
    ctx.strokeRect(center, barY, zoneW, barH);
    ctx.shadowBlur = 0;

    // Good zones
    ctx.fillStyle = '#888800';
    ctx.fillRect(center - barW * 0.1, barY, barW * 0.1, barH);
    ctx.fillRect(center + zoneW, barY, barW * 0.1, barH);

    // The moving marker with glow
    const markerX = barX + (this.pos / 100) * barW;
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff6666';
    ctx.beginPath();
    ctx.moveTo(markerX, barY - 8);
    ctx.lineTo(markerX - 6, barY - 2);
    ctx.lineTo(markerX - 4, barY + barH + 2);
    ctx.lineTo(markerX + 4, barY + barH + 2);
    ctx.lineTo(markerX + 6, barY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Labels
    ctx.fillStyle = cols.text + '66';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('0%', barX, barY + barH + 20);
    ctx.fillText('100%', barX + barW, barY + barH + 20);

    // Hit indicator
    if (!this.waitingForStrike && !this.done) {
      ctx.fillStyle = cols.text + '88';
      ctx.font = '14px monospace';
      ctx.fillText('Get ready...', x + w / 2, barY + barH + 50);
    }

    // Strikes
    ctx.fillStyle = cols.text + '66';
    ctx.font = '11px monospace';
    ctx.fillText('Strike ' + (this.strikes + 1) + '/' + this.maxStrikes, x + w / 2, y + 220);

    if (this.done) {
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 18px monospace';
      ctx.fillText(this.winner === 'attacker' ? 'YOU WIN!' : 'Defender wins!', x + w / 2, y + 265);
    }
  }
}
