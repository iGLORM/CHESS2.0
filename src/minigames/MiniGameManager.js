class MiniGameManager {
  constructor() {
    this.currentGame = null;
    this.active = false;
    this.callback = null;
    this.gameIndex = 0;
    this.attackerPiece = null;
    this.defenderPiece = null;
    this.challengePiece = null;
    this.threatPiece = null;
    this.challengeResult = null;
    this.challengeDifficulty = 1;
    this.isDuel = false;
    this.challengePlayerIsAI = false;
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
      { type: TargetPractice, weight: 1 },
      { type: DodgeFalling, weight: 1 },
      { type: RhythmTap, weight: 1 },
      { type: NumberGuess, weight: 1 },
      { type: CoinFlip, weight: 1 },
      { type: BarBalance, weight: 1 },
      { type: ShieldBlock, weight: 1 },
      { type: WhackMole, weight: 1 },
    ];

    this.overlayCtx = null;
    this.animFrame = null;

    this._calcOverlayBounds();
  }

  _calcOverlayBounds() {
    this.overlayW = 700;
    this.overlayH = 460;
    this.overlayX = Math.floor((Layout.W - this.overlayW) / 2);
    this.overlayY = Math.floor((Layout.H - this.overlayH) / 2);
    this.gameX = this.overlayX + 20;
    this.gameY = this.overlayY + 95;
    this.gameW = this.overlayW - 40;
    this.gameH = this.overlayH - 115;
  }

  static calculateDifficulty(attacker, defender, boardPos) {
    const values = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 8, king: 8 };
    let diff = values[defender.type] || 1;
    if (defender.type === 'pawn') {
      const rank = defender.color === 'white' ? boardPos.row : 7 - boardPos.row;
      if (rank <= 2) diff += 4;
      else if (rank <= 4) diff += 2;
    }
    return Math.min(10, Math.max(1, diff));
  }

  static shouldTriggerMiniGame() {
    return !!store.get('miniGamesEnabled');
  }

  static isMinigameAllowed(gameType) {
    const mode = store.get('mode');
    if (mode !== 'custom') return true;
    const customMg = store.get('customMinigames');
    if (!customMg) return true;
    const gameKeyMap = {
      QuickClick: 'quickClick', MemoryMatch: 'memoryMatch', TimingStrike: 'timingStrike',
      PatternPress: 'patternPress', ReactionTest: 'reactionTest', UndertaleDodge: 'undertaleDodge',
      PowerMeter: 'powerMeter', TargetPractice: 'targetPractice', DodgeFalling: 'dodgeFalling',
      RhythmTap: 'rhythmTap', NumberGuess: 'numberGuess', CoinFlip: 'coinFlip',
      BarBalance: 'barBalance', ShieldBlock: 'shieldBlock', WhackMole: 'whackMole',
    };
    const key = gameKeyMap[gameType.name];
    return key ? customMg[key] !== false : true;
  }

  static isDuel(attacker, defender) {
    return attacker.type === defender.type;
  }

  static getAllowedGames(allGames) {
    return allGames.filter(g => MiniGameManager.isMinigameAllowed(g.type));
  }

  startDefensiveMiniGame(options, callback) {
    if (!store.get('miniGamesEnabled')) return false;

    const attacker = options.attacker;
    const defender = options.defender;
    const boardPos = options.boardPos || { row: 0, col: 0 };
    const challengePlayerIsAI = !!options.challengePlayerIsAI;
    const allowedGames = MiniGameManager.getAllowedGames(this.allGames);
    if (!attacker || !defender || allowedGames.length === 0) return false;

    audioManager.init();

    const difficulty = MiniGameManager.calculateDifficulty(attacker, defender, boardPos);
    this.challengeDifficulty = difficulty;
    this.isDuel = MiniGameManager.isDuel(attacker, defender);
    this.isAIAttacking = false;
    this.challengePlayerIsAI = challengePlayerIsAI;
    this.challengePiece = defender;
    this.threatPiece = attacker;
    this.attackerPiece = defender;
    this.defenderPiece = attacker;
    this.challengeResult = null;
    this.botTimer = 0;
    this.nextBotAction = 0.3 + Math.random() * 0.3;

    const totalWeight = allowedGames.reduce((s, g) => s + g.weight, 0);
    let r = Math.random() * totalWeight;
    let selected = allowedGames[0];
    for (const g of allowedGames) {
      r -= g.weight;
      if (r <= 0) { selected = g; break; }
    }

    this.currentGame = new selected.type();
    this.currentGame.init(defender, attacker, difficulty, this.isDuel);
    this.active = true;
    this.callback = callback;
    this.startTime = Date.now();
    this.doneTime = 0;

    this._calcOverlayBounds();
    const overlay = document.getElementById('miniGameOverlay');
    overlay.classList.add('active');
    this.overlayCtx = overlay.getContext('2d');
    store.set('miniGameActive', true);

    if (typeof PixiMiniGameFX !== 'undefined') {
      PixiMiniGameFX.init();
    }

    if (this.isDuel) audioManager.playDuelStart();
    else audioManager.playMiniGameStart();

    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.gameLoop();
    return true;
  }

  startMiniGame(attacker, defender, boardPos, isAIAttacking, callback) {
    const started = this.startDefensiveMiniGame({
      attacker: defender,
      defender: attacker,
      boardPos,
      challengePlayerIsAI: isAIAttacking,
    }, (result) => {
      if (callback) callback(result === 'defended' ? 'attacker' : 'defender');
    });
    if (!started && callback) callback('attacker');
    return started;
  }


  startPracticeMiniGame(gameType, callback) {
    audioManager.init();

    const difficulty = 2;
    this.isDuel = false;
    this.isAIAttacking = false;
    this.attackerPiece = { type: 'pawn', color: 'white' };
    this.defenderPiece = { type: 'pawn', color: 'black' };
    this.challengePiece = this.attackerPiece;
    this.threatPiece = this.defenderPiece;
    this.challengeResult = null;
    this.challengeDifficulty = difficulty;
    this.challengePlayerIsAI = false;
    this.botTimer = 0;
    this.nextBotAction = 0;

    this.currentGame = new gameType();
    this.currentGame.init(this.attackerPiece, this.defenderPiece, difficulty, false);
    this.active = true;
    this.callback = callback;
    this.startTime = Date.now();
    this.doneTime = 0;

    this._calcOverlayBounds();
    const overlay = document.getElementById('miniGameOverlay');
    overlay.classList.add('active');
    this.overlayCtx = overlay.getContext('2d');
    store.set('miniGameActive', true);

    if (typeof PixiMiniGameFX !== 'undefined') {
      PixiMiniGameFX.init();
    }

    audioManager.playMiniGameStart();

    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.gameLoop();
  }

  gameLoop() {
    if (!this.active) return;

    const dt = 1 / 60;
    this.currentGame.update(dt);

    // Bot AI plays the minigame when the challenge owner is AI-controlled.
    if ((this.challengePlayerIsAI || this.isAIAttacking) && !this.currentGame.done) {
      this.botTimer += dt;
      // Human-like reaction delay: bot only acts every 0.15-0.4s
      if (!this.nextBotAction || this.botTimer >= this.nextBotAction) {
        this.nextBotAction = this.botTimer + 0.15 + Math.random() * 0.25;
        if (this.currentGame.botPlay) {
          this.currentGame.botPlay(dt, this.botTimer);
        }
      }
    }

    const ctx = this.overlayCtx;
    const ox = this.overlayX;
    const oy = this.overlayY;
    const ow = this.overlayW;
    const oh = this.overlayH;

    const scaleX = ctx.canvas.width / Layout.W;
    const scaleY = ctx.canvas.height / Layout.H;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.clearRect(0, 0, Layout.W, Layout.H);

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

    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    // Background dim
    ctx.fillStyle = 'rgba(0,0,0,0.70)';
    ctx.fillRect(0, 0, Layout.W, Layout.H);

    // Entrance animation
    const elapsed = Date.now() - this.startTime;
    const entranceProgress = Math.min(1, elapsed / 400);
    const eased = 1 - Math.pow(1 - entranceProgress, 3);
    const scale = 0.85 + eased * 0.15;
    const alpha = eased;

    ctx.save();
    ctx.globalAlpha = alpha * globalAlpha;
    ctx.translate(640, 400);
    ctx.scale(scale, scale);
    ctx.translate(-640, -400);

    // Game container with theme colors
    ctx.shadowColor = cols.accent;
    ctx.shadowBlur = 20;
    ctx.fillStyle = cols.background + 'ee';
    ctx.fillRect(ox, oy, ow, oh);
    ctx.shadowBlur = 0;

    // Border with glow
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, ow, oh);

    // Inner border
    ctx.strokeStyle = cols.text + '15';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 3, oy + 3, ow - 6, oh - 6);

    // Corner accents
    const cSize = 12;
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 2;
    // Top-left
    ctx.beginPath(); ctx.moveTo(ox, oy + cSize); ctx.lineTo(ox, oy); ctx.lineTo(ox + cSize, oy); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(ox + ow - cSize, oy); ctx.lineTo(ox + ow, oy); ctx.lineTo(ox + ow, oy + cSize); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(ox, oy + oh - cSize); ctx.lineTo(ox, oy + oh); ctx.lineTo(ox + cSize, oy + oh); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(ox + ow - cSize, oy + oh); ctx.lineTo(ox + ow, oy + oh); ctx.lineTo(ox + ow, oy + oh - cSize); ctx.stroke();

    // Duel banner
    if (this.isDuel) {
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 14px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = cols.accent;
      ctx.shadowBlur = 8;
      ctx.fillText('DUEL', 640, oy + 20);
      ctx.shadowBlur = 0;
    }

    // Piece icons at top. Left is the threatened piece trying to survive.
    this._drawPieceIcon(ctx, ox + 40, oy + 30, this.attackerPiece, 'left');
    this._drawPieceIcon(ctx, ox + ow - 90, oy + 30, this.defenderPiece, 'right');

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 18px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SURVIVE', 640, oy + 55);

    // Difficulty stars
    const diff = this.challengeDifficulty || 1;
    ctx.fillStyle = '#ffcc00';
    ctx.font = '14px "Pixelify Sans", sans-serif';
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < diff ? '★' : '☆';
    ctx.fillText('Difficulty: ' + stars, 640, oy + 75);

    // Render the mini-game
    this.currentGame.render(ctx, this.gameX, this.gameY, this.gameW, this.gameH);

    // Result banner when done
    if (this.currentGame.done && this.doneTime) {
      const doneElapsed = Date.now() - this.doneTime;
      const resultAlpha = Math.min(1, doneElapsed / 300);
      ctx.globalAlpha = resultAlpha;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(ox + ow * 0.15, oy + oh * 0.35, ow * 0.7, oh * 0.3);

      const defended = this.currentGame.winner === 'attacker';
      ctx.strokeStyle = defended ? '#44ff44' : '#ff4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(ox + ow * 0.15, oy + oh * 0.35, ow * 0.7, oh * 0.3);

      ctx.fillStyle = defended ? '#44ff44' : '#ff4444';
      ctx.shadowColor = defended ? '#44ff44' : '#ff4444';
      ctx.shadowBlur = 12;
      ctx.font = 'bold 28px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(defended ? 'SAVED!' : 'CAPTURED!', 640, oy + oh * 0.55);
      ctx.shadowBlur = 0;

      ctx.fillStyle = cols.text + 'bb';
      ctx.font = '13px "Pixelify Sans", sans-serif';
      ctx.fillText(defended ? 'The threatened piece survives' : 'The capture goes through', 640, oy + oh * 0.62);

      ctx.globalAlpha = alpha * globalAlpha;
    }

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

    if (typeof PixiMiniGameFX !== 'undefined') {
      PixiMiniGameFX.destroy();
    }

    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }

    // Cleanup keyboard listeners for games that use them
    if (this.currentGame && this.currentGame.cleanup) {
      this.currentGame.cleanup();
    }

    if (this.callback) {
      const winner = this.currentGame ? this.currentGame.winner : 'attacker';
      const result = winner === 'attacker' ? 'defended' : 'captured';
      const stats = store.get('stats');
      stats.miniGamesPlayed++;
      if (winner === 'attacker') stats.miniGamesWon++;
      store.set('stats', stats);
      this.challengeResult = result;
      this.callback(result);
      this.callback = null;
    }

    this.currentGame = null;
    this.doneTime = 0;
    this.challengePlayerIsAI = false;
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
