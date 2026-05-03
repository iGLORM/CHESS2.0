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
  }

  init(attacker, defender) {
    this.done = false;
    this.winner = null;
    this.state = 'waiting';
    this.timer = 0;
    this.reactionTime = 0;
    this.trials = 0;
    this.totalTime = 0;
    this.startWaiting();
    audioManager.playMiniGameStart();
  }

  startWaiting() {
    this.state = 'waiting';
    this.readyTime = Math.random() * 2000 + 1000;
    this.timer = 0;
  }

  update(dt) {
    if (this.done) return;

    if (this.state === 'waiting') {
      this.timer += dt * 1000;
      if (this.timer >= this.readyTime) {
        this.state = 'ready';
        this.timer = 0;
        audioManager.playTone(800, 0.1, 'square', 0.1);
      }
    }

    if (this.state === 'reacting') {
      this.timer += dt * 1000;
    }
  }

  handleClick(x, y) {
    if (this.done) return;

    if (this.state === 'waiting') {
      // Too early!
      this.state = 'result';
      this.reactionTime = -1;
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

      if (this.reactionTime < 200) audioManager.playTone(900, 0.1, 'square', 0.1);
      else if (this.reactionTime < 350) audioManager.playTone(700, 0.1, 'square', 0.08);
      else audioManager.playTone(400, 0.1, 'sawtooth', 0.08);

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

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('REACTION TEST', x + w / 2, y + 35);

    ctx.font = '11px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Click when the screen turns green!', x + w / 2, y + 55);

    // Reaction area
    const areaX = x + 100;
    const areaY = y + 80;
    const areaW = w - 200;
    const areaH = 120;

    if (this.state === 'waiting') {
      ctx.fillStyle = '#4444ff';
      ctx.fillRect(areaX, areaY, areaW, areaH);
      ctx.fillStyle = cols.text;
      ctx.font = 'bold 18px monospace';
      ctx.fillText('Wait...', x + w / 2, areaY + areaH / 2 + 6);
    } else if (this.state === 'ready' || this.state === 'reacting') {
      ctx.fillStyle = '#44ff44';
      ctx.fillRect(areaX, areaY, areaW, areaH);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('CLICK NOW!', x + w / 2, areaY + areaH / 2 + 6);
    } else if (this.state === 'result') {
      if (this.reactionTime < 0) {
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(areaX, areaY, areaW, areaH);
        ctx.fillStyle = cols.text;
        ctx.font = 'bold 16px monospace';
        ctx.fillText('Too early!', x + w / 2, areaY + areaH / 2 + 6);
      } else {
        ctx.fillStyle = this.reactionTime < 300 ? '#44aa44' : '#888800';
        ctx.fillRect(areaX, areaY, areaW, areaH);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(Math.round(this.reactionTime) + 'ms', x + w / 2, areaY + areaH / 2 + 6);
      }
    }

    // Stats
    ctx.fillStyle = cols.text + '66';
    ctx.font = '11px monospace';
    ctx.fillText('Trial: ' + (this.trials + 1) + '/' + this.maxTrials, x + w / 2, areaY + areaH + 25);
    if (this.trials > 0) {
      ctx.fillText('Avg: ' + Math.round(this.totalTime / this.trials) + 'ms', x + w / 2, areaY + areaH + 45);
    }
    ctx.fillStyle = cols.accent;
    ctx.font = '10px monospace';
    ctx.fillText('Target: <' + this.targetTime + 'ms to win', x + w / 2, areaY + areaH + 65);

    if (this.done) {
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 18px monospace';
      ctx.fillText(this.winner === 'attacker' ? 'YOU WIN!' : 'Defender wins!', x + w / 2, y + 270);
    }
  }
}
