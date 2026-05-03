class MiniGameManager {
  constructor() {
    this.currentGame = null;
    this.active = false;
    this.callback = null;
    this.gameIndex = 0;
    this.attackerPiece = null;
    this.defenderPiece = null;
    this.isDuel = false;
    this.startTime = 0;
    this.doneTime = 0;
    this.fadeDuration = 1200;

    this.allGames = [
      { type: QuickClick, weight: 1 },
      { type: MemoryMatch, weight: 1 },
      { type: TimingStrike, weight: 1 },
      { type: PatternPress, weight: 1 },
      { type: ReactionTest, weight: 1 },
      { type: UndertaleDodge, weight: 1 },
      { type: PowerMeter, weight: 1 },
      { type: BarBalance, weight: 1 },
      { type: TargetPractice, weight: 1 },
      { type: DodgeFalling, weight: 1 },
      { type: RhythmTap, weight: 1 },
      { type: NumberGuess, weight: 1 },
      { type: CoinFlip, weight: 1 },
    ];

    this.overlayCtx = null;
    this.animFrame = null;

    // Cached overlay bounds (screen coordinates)
    this.overlayW = 700;
    this.overlayH = 460;
    this.overlayX = Math.floor((1280 - this.overlayW) / 2);
    this.overlayY = Math.floor((800 - this.overlayH) / 2);
    this.gameX = this.overlayX + 20;
    this.gameY = this.overlayY + 95;
    this.gameW = this.overlayW - 40;
    this.gameH = this.overlayH - 115;
  }

  static calculateDifficulty(attacker, defender, boardPos) {
    const values = { pawn: 1, knight: 2, bishop: 2, rook: 3, queen: 5, king: 5 };
    let diff = values[defender.type] || 1;
    if (defender.type === 'pawn') {
      const rank = defender.color === 'white' ? boardPos.row : 7 - boardPos.row;
      if (rank <= 2) diff += 3;
      else if (rank <= 4) diff += 1;
    }
    if (defender.type === 'queen') diff = 5;
    if (defender.type === 'king') diff = 5;
    return Math.min(5, Math.max(1, diff));
  }

  static shouldTriggerMiniGame() {
    if (!store.get('miniGamesEnabled')) return false;
    return Math.random() < 0.30;
  }

  static isDuel(attacker, defender) {
    return attacker.type === defender.type;
  }

  startMiniGame(attacker, defender, boardPos, isAIAttacking, callback) {
    if (!store.get('miniGamesEnabled')) {
      if (callback) callback('attacker');
      return;
    }

    audioManager.init();
    audioManager.stopMusic();

    const difficulty = MiniGameManager.calculateDifficulty(attacker, defender, boardPos);
    this.isDuel = MiniGameManager.isDuel(attacker, defender);
    this.attackerPiece = attacker;
    this.defenderPiece = defender;

    const totalWeight = this.allGames.reduce((s, g) => s + g.weight, 0);
    let r = Math.random() * totalWeight;
    let selected = this.allGames[0];
    for (const g of this.allGames) {
      r -= g.weight;
      if (r <= 0) { selected = g; break; }
    }

    this.currentGame = new selected.type();
    this.currentGame.init(attacker, defender, difficulty, this.isDuel);
    this.active = true;
    this.callback = callback;
    this.startTime = Date.now();
    this.doneTime = 0;

    const overlay = document.getElementById('miniGameOverlay');
    overlay.classList.add('active');
    this.overlayCtx = overlay.getContext('2d');
    store.set('miniGameActive', true);

    if (this.isDuel) audioManager.playDuelStart();
    else audioManager.playMiniGameStart();

    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.gameLoop();
  }

  gameLoop() {
    if (!this.active) return;

    const dt = 1 / 60;
    this.currentGame.update(dt);

    const ctx = this.overlayCtx;
    const ox = this.overlayX;
    const oy = this.overlayY;
    const ow = this.overlayW;
    const oh = this.overlayH;

    ctx.clearRect(0, 0, 1280, 800);

    // Fade-out when done
    let globalAlpha = 1;
    if (this.currentGame.done) {
      if (!this.doneTime) this.doneTime = Date.now();
      const elapsed = Date.now() - this.doneTime;
      globalAlpha = Math.max(0, 1 - elapsed / this.fadeDuration);
      if (elapsed >= this.fadeDuration) {
        this.hideOverlay();
        return;
      }
    }

    ctx.save();
    ctx.globalAlpha = globalAlpha;

    // Background dim
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, 1280, 800);

    // Entrance animation
    const elapsed = Date.now() - this.startTime;
    const entranceProgress = Math.min(1, elapsed / 400);
    const scale = 0.8 + entranceProgress * 0.2;
    const alpha = entranceProgress;

    ctx.save();
    ctx.globalAlpha = alpha * globalAlpha;
    ctx.translate(640, 400);
    ctx.scale(scale, scale);
    ctx.translate(-640, -400);

    // Game container
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(ox, oy, ow, oh);
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 3;
    ctx.strokeRect(ox, oy, ow, oh);

    // Duel banner
    if (this.isDuel) {
      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚔ DUEL ⚔', 640, oy + 20);
    }

    // Piece icons at top
    this._drawPieceIcon(ctx, ox + 40, oy + 30, this.attackerPiece, 'left');
    this._drawPieceIcon(ctx, ox + ow - 90, oy + 30, this.defenderPiece, 'right');

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VS', 640, oy + 55);

    // Difficulty stars
    const diff = MiniGameManager.calculateDifficulty(this.attackerPiece, this.defenderPiece, { row: 0, col: 0 });
    ctx.fillStyle = '#ffcc00';
    ctx.font = '14px monospace';
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < diff ? '★' : '☆';
    ctx.fillText('Difficulty: ' + stars, 640, oy + 75);

    // Render the mini-game
    this.currentGame.render(ctx, this.gameX, this.gameY, this.gameW, this.gameH);

    ctx.restore();
    ctx.restore();

    this.animFrame = requestAnimationFrame(() => this.gameLoop());
  }

  _drawPieceIcon(ctx, x, y, piece, side) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const size = 40;
    PieceRenderer.drawPiece(ctx, piece.type, piece.color, theme, x, y, size);
  }

  hideOverlay() {
    this.active = false;
    store.set('miniGameActive', false);
    const overlay = document.getElementById('miniGameOverlay');
    overlay.classList.remove('active');

    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }

    // Cleanup keyboard listeners for games that use them
    if (this.currentGame && this.currentGame.cleanup) {
      this.currentGame.cleanup();
    }

    audioManager.startMusic();

    if (this.callback) {
      this.callback(this.currentGame ? this.currentGame.winner : 'attacker');
      this.callback = null;
    }

    this.currentGame = null;
    this.doneTime = 0;
  }

  handleClick(x, y) {
    if (!this.active || !this.currentGame) return;
    // Only accept clicks during entrance animation and gameplay, not during fade-out
    if (this.currentGame.done && this.doneTime) return;

    // Pass screen coordinates to the game
    if (this.currentGame.handleClick) {
      this.currentGame.handleClick(x, y);
    }
  }

  handleKey(key) {
    if (!this.active || !this.currentGame) return;
    if (this.currentGame.handleKey) {
      this.currentGame.handleKey(key);
    }
  }
}

const miniGameManager = new MiniGameManager();
