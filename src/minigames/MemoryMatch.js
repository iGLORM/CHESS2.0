class MemoryMatch {
  constructor() {
    this.name = 'Memory Match';
    this.done = false;
    this.winner = null;
    this.cards = [];
    this.flipped = [];
    this.matched = [];
    this.canFlip = true;
    this.attempts = 0;
    this.maxAttempts = 8;
    this.pairs = 0;
    this.totalPairs = 4;
    this.flipAnims = {};
    this.lastRect = { x: 0, y: 0, w: 1, h: 1 };
  }

  init(attacker, defender, difficulty) {
    this.done = false;
    this.winner = null;
    this.difficulty = difficulty || 1;
    this.flipped = [];
    this.matched = [];
    this.canFlip = true;
    this.attempts = 0;
    this.pairs = 0;
    this.totalPairs = 4;
    this.flipAnims = {};

    const symbols = ['♔', '♕', '♖', '♗'];
    this.cards = [...symbols, ...symbols];
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }

    audioManager.playMiniGameStart();
  }

  update(dt) {
    if (this.done) return;
    for (const k of Object.keys(this.flipAnims)) {
      this.flipAnims[k] += dt;
      if (this.flipAnims[k] >= 0.28) delete this.flipAnims[k];
    }
    if (this.matched.length === this.totalPairs * 2) {
      this.done = true;
      const maxAttempts = this.totalPairs + 4 - Math.floor((this.difficulty || 1) / 3);
      this.winner = this.attempts <= maxAttempts ? 'attacker' : 'defender';
    }
    if (this.attempts >= this.maxAttempts && this.pairs < this.totalPairs) {
      this.done = true;
      this.winner = 'defender';
    }
  }

  botPlay(dt, timer) {
    if (this.done || !this.canFlip || this.flipped.length >= 2) return;
    if (!this.botMemory) this.botMemory = {};

    // Remember flipped cards
    for (const idx of this.flipped) {
      if (!(idx in this.botMemory)) this.botMemory[idx] = this.cards[idx];
    }

    // Find a match from memory
    for (const [i, sym] of Object.entries(this.botMemory)) {
      for (const [j, sym2] of Object.entries(this.botMemory)) {
        if (i !== j && sym === sym2 &&
            !this.matched.includes(Number(i)) && !this.matched.includes(Number(j)) &&
            !this.flipped.includes(Number(i)) && !this.flipped.includes(Number(j))) {
          this.handleClickAtIndex(Number(i));
          setTimeout(() => this.handleClickAtIndex(Number(j)), 500);
          return;
        }
      }
    }

    // Random guess
    if (timer > 0.3 && this.flipped.length < 2) {
      const unknown = [];
      for (let i = 0; i < this.cards.length; i++) {
        if (!this.matched.includes(i) && !this.flipped.includes(i)) unknown.push(i);
      }
      if (unknown.length > 0) {
        this.handleClickAtIndex(unknown[Math.floor(Math.random() * unknown.length)]);
      }
    }
  }

  handleKey(key) {
    if (!this.canFlip || this.done) return;
    const idx = parseInt(key, 10) - 1;
    if (idx >= 0 && idx < this.cards.length) {
      this.handleClickAtIndex(idx);
    }
  }

  handleClickAtIndex(idx) {
    const cardW = 55;
    const cardH = 65;
    const gap = 10;
    const rect = this.lastRect || { x: 0, y: 0, w: 1, h: 1 };
    const gameX = rect.x;
    const gameY = rect.y;
    const totalW = 4 * (cardW + gap) - gap;
    const startX = gameX + (rect.w - totalW) / 2;
    const startY = gameY + 80;
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const screenX = startX + col * (cardW + gap) + cardW / 2;
    const screenY = startY + row * (cardH + gap) + cardH / 2;
    this.handleClick(screenX, screenY);
  }

  handleClick(screenX, screenY) {
    if (!this.canFlip || this.done) return;

    const cardW = 55;
    const cardH = 65;
    const gap = 10;
    const gridW = 4;
    const gridH = 2;
    const totalW = gridW * (cardW + gap) - gap;
    const totalH = gridH * (cardH + gap) - gap;

    // Game render area bounds
    const rect = this.lastRect || { x: 0, y: 0, w: 1, h: 1 };
    const gameX = rect.x;
    const gameY = rect.y;
    const startX = gameX + (rect.w - totalW) / 2;
    const startY = gameY + 80;

    const col = Math.floor((screenX - startX) / (cardW + gap));
    const row = Math.floor((screenY - startY) / (cardH + gap));
    const idx = row * 4 + col;

    if (idx < 0 || idx >= this.cards.length) return;
    if (this.flipped.includes(idx) || this.matched.includes(idx)) return;

    this.flipped.push(idx);
    this.flipAnims[idx] = 0;
    audioManager.playTone(500, 0.08, 'square', 0.05);

    if (this.flipped.length === 2) {
      this.attempts++;
      this.canFlip = false;
      const [a, b] = this.flipped;
      if (this.cards[a] === this.cards[b]) {
        this.matched.push(a, b);
        this.pairs++;
        this.flipped = [];
        this.canFlip = true;
        audioManager.playTone(800, 0.1, 'square', 0.08);
        if (this.pairs === this.totalPairs) {
          this.done = true;
          const maxAttempts = this.totalPairs + 4 - Math.floor((this.difficulty || 1) / 3);
          this.winner = this.attempts <= maxAttempts ? 'attacker' : 'defender';
        }
      } else {
        setTimeout(() => {
          this.flipped = [];
          this.canFlip = true;
        }, 800);
      }
    }
  }

  render(ctx, x, y, w, h) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;
    this.lastRect = { x, y, w, h };

    ctx.fillStyle = cols.background || cols.bg || cols.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 18px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MEMORY MATCH', x + w / 2, y + 35);

    ctx.font = 'bold 12px "Pixelify Sans", sans-serif';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Match the pairs! Attempts: ' + this.attempts + '/' + this.maxAttempts, x + w / 2, y + 55);

    // Card grid
    const cardW = 55;
    const cardH = 65;
    const gap = 10;
    const gridW = 4;
    const gridH = 2;
    const totalW = gridW * (cardW + gap) - gap;
    const totalH = gridH * (cardH + gap) - gap;
    const startX = x + (w - totalW) / 2;
    const startY = y + 80;

    for (let i = 0; i < this.cards.length; i++) {
      const cx = startX + (i % 4) * (cardW + gap);
      const cy = startY + Math.floor(i / 4) * (cardH + gap);
      const isFlipped = this.flipped.includes(i) || this.matched.includes(i);
      const anim = this.flipAnims[i];
      const animT = anim === undefined ? 1 : Math.min(1, anim / 0.28);
      const scaleX = anim === undefined ? 1 : Math.max(0.08, Math.abs(Math.cos(animT * Math.PI)));
      const showFace = anim === undefined || animT >= 0.5;
      const r = 6;

      ctx.save();
      ctx.translate(cx + cardW / 2, cy + cardH / 2);
      ctx.scale(scaleX, 1);
      ctx.translate(-(cx + cardW / 2), -(cy + cardH / 2));

      if (isFlipped && showFace) {
        const isMatched = this.matched.includes(i);
        ctx.fillStyle = isMatched ? cols.accent : cols.buttonHover;
        if (isMatched) {
          ctx.shadowColor = cols.accent;
          ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.moveTo(cx + r, cy);
        ctx.lineTo(cx + cardW - r, cy);
        ctx.arcTo(cx + cardW, cy, cx + cardW, cy + r, r);
        ctx.lineTo(cx + cardW, cy + cardH - r);
        ctx.arcTo(cx + cardW, cy + cardH, cx + cardW - r, cy + cardH, r);
        ctx.lineTo(cx + r, cy + cardH);
        ctx.arcTo(cx, cy + cardH, cx, cy + cardH - r, r);
        ctx.lineTo(cx, cy + r);
        ctx.arcTo(cx, cy, cx + r, cy, r);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = isMatched ? cols.highlight || cols.accent : cols.text + '44';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = cols.text;
        ctx.font = '28px "Pixelify Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.cards[i], cx + cardW / 2, cy + cardH / 2 + 8);
      } else {
        ctx.fillStyle = cols.buttonBg;
        ctx.beginPath();
        ctx.moveTo(cx + r, cy);
        ctx.lineTo(cx + cardW - r, cy);
        ctx.arcTo(cx + cardW, cy, cx + cardW, cy + r, r);
        ctx.lineTo(cx + cardW, cy + cardH - r);
        ctx.arcTo(cx + cardW, cy + cardH, cx + cardW - r, cy + cardH, r);
        ctx.lineTo(cx + r, cy + cardH);
        ctx.arcTo(cx, cy + cardH, cx, cy + cardH - r, r);
        ctx.lineTo(cx, cy + r);
        ctx.arcTo(cx, cy, cx + r, cy, r);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = cols.text + '44';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Decorative pattern on back
        ctx.fillStyle = cols.text + '22';
        ctx.font = 'bold 18px "Pixelify Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', cx + cardW / 2, cy + cardH / 2 + 6);
      }
      ctx.restore();
    }

    // Progress
    ctx.fillStyle = cols.text + '66';
    ctx.font = '11px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Pairs: ' + this.pairs + '/' + this.totalPairs, x + w / 2, y + 230);

    if (this.done) {
      MiniGameUtils.drawResultOverlay(ctx, x, y, w, h, this.winner === 'attacker', cols);
    }
  }

  cleanup() {}
}
