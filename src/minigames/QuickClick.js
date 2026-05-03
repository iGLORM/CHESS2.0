class QuickClick {
  constructor() {
    this.name = 'Quick Click';
    this.done = false;
    this.winner = null;
    this.p1Clicks = 0;
    this.p2Clicks = 0;
    this.timeLeft = 5;
    this.startTime = 0;
    this.running = false;
  }

  init(attacker, defender) {
    this.attacker = attacker;
    this.defender = defender;
    this.done = false;
    this.winner = null;
    this.p1Clicks = 0;
    this.p2Clicks = 0;
    this.timeLeft = 5;
    this.running = false;
    this.startTime = Date.now();
    this.running = true;
    audioManager.playMiniGameStart();
  }

  update(dt) {
    if (!this.running || this.done) return;
    this.timeLeft = 5 - (Date.now() - this.startTime) / 1000;

    // CPU auto-clicks for defender (slower than human)
    if (Math.random() < dt * 3) {
      this.p2Clicks++;
    }
    if (Math.random() < dt * 2) {
      this.p2Clicks++;
    }

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.running = false;
      this.done = true;
      this.winner = this.p1Clicks >= this.p2Clicks ? 'attacker' : 'defender';
      if (this.winner === 'attacker') audioManager.playMiniGameWin();
      else audioManager.playMiniGameLose();
    }
  }

  handleClick(x, y) {
    if (!this.running || this.done) return;
    this.p1Clicks++;
    audioManager.playTone(400 + Math.random() * 200, 0.05, 'square', 0.05);
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
    ctx.fillText('QUICK CLICK!', x + w / 2, y + 40);

    ctx.font = '12px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Click as fast as you can!', x + w / 2, y + 60);

    // Timer
    ctx.fillStyle = this.timeLeft < 2 ? '#ff4444' : cols.text;
    ctx.font = 'bold 28px monospace';
    ctx.fillText(Math.ceil(this.timeLeft) + 's', x + w / 2, y + 110);

    // Progress bars
    const barW = 200;
    const barH = 30;
    const maxClicks = 20;

    // Attacker (Player 1)
    ctx.fillStyle = cols.text + '44';
    ctx.fillRect(x + w / 2 - barW - 20, y + 140, barW, barH);
    ctx.fillStyle = '#44cc44';
    ctx.fillRect(x + w / 2 - barW - 20, y + 140, barW * Math.min(1, this.p1Clicks / maxClicks), barH);
    ctx.fillStyle = cols.text;
    ctx.font = '12px monospace';
    ctx.fillText('You: ' + this.p1Clicks, x + w / 2 - barW - 20 + 10, y + 162);

    // Defender (Player 2 / CPU)
    ctx.fillStyle = cols.text + '44';
    ctx.fillRect(x + w / 2 + 20, y + 140, barW, barH);
    ctx.fillStyle = '#cc4444';
    ctx.fillRect(x + w / 2 + 20, y + 140, barW * Math.min(1, this.p2Clicks / maxClicks), barH);
    ctx.fillStyle = cols.text;
    ctx.font = '12px monospace';
    ctx.fillText('Defender: ' + this.p2Clicks, x + w / 2 + 30, y + 162);

    // Instructions
    ctx.fillStyle = cols.text + '66';
    ctx.font = '11px monospace';
    ctx.fillText('Click anywhere to mash!', x + w / 2, y + 210);

    // Result
    if (this.done) {
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 18px monospace';
      if (this.winner === 'attacker') {
        ctx.fillText('YOU WIN!', x + w / 2, y + 260);
      } else {
        ctx.fillText('Defender wins!', x + w / 2, y + 260);
      }
    }
  }
}
