class MemoryMatch {
  static PIECE_FOR_SYMBOL = { '♔': 'king', '♕': 'queen', '♖': 'rook', '♗': 'bishop' };

  constructor() {
    this.name = 'Memory Match';
    this.done = false;
    this.winner = null;
    this.cards = [];
    this.flipped = [];
    this.matched = [];
    this.canFlip = true;
    this.attempts = 0;
    this.maxAttempts = 12;
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
      const maxAttempts = this.totalPairs + 5 - Math.floor((this.difficulty || 1) / 4);
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

  _cardLayout(rect) {
    const w = rect.w;
    const h = rect.h;
    const gap = Math.max(8, Math.min(14, w * 0.02));
    const headerSpace = h * 0.15;
    const availW = w - gap * 2;
    const availH = h - headerSpace - h * 0.08;
    // Cards are 4:5 and must fit both the width and the height available.
    const cardH = Math.min((availH - gap) / 2, ((availW - gap * 3) / 4) * 1.25);
    const cardW = cardH / 1.25;
    const totalW = 4 * (cardW + gap) - gap;
    const totalH = 2 * (cardH + gap) - gap;
    const startX = rect.x + (w - totalW) / 2;
    const startY = rect.y + headerSpace + (availH - totalH) / 2;
    return { cardW, cardH, gap, startX, startY };
  }

  handleClickAtIndex(idx) {
    const rect = this.lastRect || { x: 0, y: 0, w: 1, h: 1 };
    const { cardW, cardH, gap, startX, startY } = this._cardLayout(rect);
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const screenX = startX + col * (cardW + gap) + cardW / 2;
    const screenY = startY + row * (cardH + gap) + cardH / 2;
    this.handleClick(screenX, screenY);
  }

  handleClick(screenX, screenY) {
    if (!this.canFlip || this.done) return;

    const rect = this.lastRect || { x: 0, y: 0, w: 1, h: 1 };
    const { cardW, cardH, gap, startX, startY } = this._cardLayout(rect);

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
          const maxAttempts = this.totalPairs + 5 - Math.floor((this.difficulty || 1) / 4);
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
    const cols = MiniGameUtils.colors();
    this.lastRect = { x, y, w, h };

    // Scale fonts based on available height
    const titleSize = Math.max(18, Math.min(24, h * 0.035));
    const bodySize = Math.max(12, Math.min(16, h * 0.022));
    const labelSize = Math.max(11, Math.min(14, h * 0.018));


    const titleY = y + h * 0.06;
    ctx.fillStyle = cols.text;
    ctx.font = 'bold ' + Math.round(titleSize) + 'px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MEMORY MATCH', x + w / 2, titleY);

    ctx.font = 'bold ' + Math.round(bodySize) + 'px "Pixelify Sans", sans-serif';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Match the pairs! Attempts: ' + this.attempts + '/' + this.maxAttempts, x + w / 2, titleY + titleSize * 1.3);

    // Card grid - use shared layout calculation
    const { cardW, cardH, gap, startX, startY } = this._cardLayout({ x, y, w, h });
    const symbolSize = Math.max(22, Math.min(36, cardW * 0.5));
    const backSymbolSize = Math.max(14, Math.min(22, cardW * 0.35));
    const r = Math.max(4, cardW * 0.08);

    for (let i = 0; i < this.cards.length; i++) {
      const cx = startX + (i % 4) * (cardW + gap);
      const cy = startY + Math.floor(i / 4) * (cardH + gap);
      const isFlipped = this.flipped.includes(i) || this.matched.includes(i);
      const anim = this.flipAnims[i];
      const animT = anim === undefined ? 1 : Math.min(1, anim / 0.28);
      const scaleX = anim === undefined ? 1 : Math.max(0.08, Math.abs(Math.cos(animT * Math.PI)));
      const showFace = anim === undefined || animT >= 0.5;

      ctx.save();
      ctx.translate(cx + cardW / 2, cy + cardH / 2);
      ctx.scale(scaleX, 1);
      ctx.translate(-(cx + cardW / 2), -(cy + cardH / 2));

      if (isFlipped && showFace) {
        const isMatched = this.matched.includes(i);
        // Face: parchment card with the piece artwork.
        MiniGameUtils.roundRect(ctx, cx, cy, cardW, cardH, r);
        const face = ctx.createLinearGradient(cx, cy, cx, cy + cardH);
        face.addColorStop(0, isMatched ? '#d9ffe6' : '#f6f0ff');
        face.addColorStop(1, isMatched ? '#8fe8b0' : '#c9bde8');
        ctx.fillStyle = face;
        if (isMatched) {
          ctx.shadowColor = cols.success;
          ctx.shadowBlur = 16;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 3;
        ctx.strokeStyle = isMatched ? cols.success : '#ffffff';
        ctx.stroke();
        const pieceType = MemoryMatch.PIECE_FOR_SYMBOL[this.cards[i]] || 'pawn';
        const size = Math.min(cardW, cardH) * 0.72;
        const theme = ThemeManager.getTheme('space');
        PieceRenderer.drawPiece(ctx, pieceType, 'black', theme, cx + (cardW - size) / 2, cy + (cardH - size) / 2, size);
      } else {
        // Back: deep violet with a diamond lattice and a gold emblem.
        MiniGameUtils.roundRect(ctx, cx, cy, cardW, cardH, r);
        const back = ctx.createLinearGradient(cx, cy, cx + cardW, cy + cardH);
        back.addColorStop(0, '#3b2d7a');
        back.addColorStop(1, '#241a52');
        ctx.fillStyle = back;
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 2;
        for (let d = -cardH; d < cardW + cardH; d += 16) {
          ctx.beginPath();
          ctx.moveTo(cx + d, cy);
          ctx.lineTo(cx + d - cardH, cy + cardH);
          ctx.moveTo(cx + d - cardH, cy);
          ctx.lineTo(cx + d, cy + cardH);
          ctx.stroke();
        }
        ctx.restore();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,209,102,0.55)';
        MiniGameUtils.roundRect(ctx, cx + 5, cy + 5, cardW - 10, cardH - 10, Math.max(2, r - 3));
        ctx.stroke();
        const em = Math.min(cardW, cardH) * 0.16;
        ctx.fillStyle = cols.gold;
        ctx.beginPath();
        ctx.moveTo(cx + cardW / 2, cy + cardH / 2 - em);
        ctx.lineTo(cx + cardW / 2 + em, cy + cardH / 2);
        ctx.lineTo(cx + cardW / 2, cy + cardH / 2 + em);
        ctx.lineTo(cx + cardW / 2 - em, cy + cardH / 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Progress - positioned below the card grid
    const progressY = startY + 2 * (cardH + gap) + gap;
    ctx.fillStyle = cols.textDim;
    ctx.font = 'bold ' + Math.round(labelSize + 2) + 'px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Pairs: ' + this.pairs + '/' + this.totalPairs, x + w / 2, progressY + 6);

    if (this.done) {
      MiniGameUtils.drawResultOverlay(ctx, x, y, w, h, this.winner === 'attacker', cols);
    }
  }

  cleanup() {}
}
