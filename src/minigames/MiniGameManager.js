class MiniGameManager {
  static INTRO_SECONDS = 0.9;

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
    this.fadeDuration = 1900;

    // Every mini-game is 3D; with no WebGL, captures simply skip the challenge.
    this.allGames = MiniGameManager.GAMES_3D().map(type => ({ type, weight: 1, needs3D: true }));

    this.overlayCtx = null;
    this.animFrame = null;

    this._calcOverlayBounds();
  }

  static GAMES_3D() {
    return [
      CheckmateRun, LavaTilt, RookStack, SiegeCannon, MeteorStorm, KnightCollapse,
      MemoryMatch, TimingStrike, PatternPress, ReactionTest, UndertaleDodge, PowerMeter,
      TargetPractice, DodgeFalling, RhythmTap, BarBalance, ShieldBlock, WhackMole,
    ];
  }

  _calcOverlayBounds() {
    // Header (tag, title, difficulty, piece badges) takes the top 118px.
    if (Layout.isPortrait) {
      this.overlayW = Layout.W - 40;
      this.overlayH = Math.min(Layout.H - 120, 1000);
      this.overlayX = 20;
      this.overlayY = Math.floor((Layout.H - this.overlayH) / 2);
      this.gameX = this.overlayX + 18;
      this.gameY = this.overlayY + 118;
      this.gameW = this.overlayW - 36;
      this.gameH = this.overlayH - 136;
    } else {
      this.overlayW = 820;
      this.overlayH = 600;
      this.overlayX = Math.floor((Layout.W - this.overlayW) / 2);
      this.overlayY = Math.floor((Layout.H - this.overlayH) / 2);
      this.gameX = this.overlayX + 22;
      this.gameY = this.overlayY + 118;
      this.gameW = this.overlayW - 44;
      this.gameH = this.overlayH - 140;
    }
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
      MemoryMatch: 'memoryMatch', TimingStrike: 'timingStrike',
      PatternPress: 'patternPress', ReactionTest: 'reactionTest', UndertaleDodge: 'undertaleDodge',
      PowerMeter: 'powerMeter', TargetPractice: 'targetPractice', DodgeFalling: 'dodgeFalling',
      RhythmTap: 'rhythmTap', BarBalance: 'barBalance', ShieldBlock: 'shieldBlock', WhackMole: 'whackMole',
      CheckmateRun: 'checkmateRun', LavaTilt: 'lavaTilt', RookStack: 'rookStack',
      SiegeCannon: 'siegeCannon', MeteorStorm: 'meteorStorm', KnightCollapse: 'knightCollapse',
    };
    const key = gameKeyMap[gameType.name];
    return key ? customMg[key] !== false : true;
  }

  static isDuel(attacker, defender) {
    return attacker.type === defender.type;
  }

  static getAllowedGames(allGames) {
    return allGames.filter(g => MiniGameManager.isMinigameAllowed(g.type) && (!g.needs3D || Mini3D.available()));
  }

  startDefensiveMiniGame(options, callback) {
    if (!store.get('miniGamesEnabled')) return false;

    const attacker = options.attacker;
    const defender = options.defender;
    const boardPos = options.boardPos || { row: 0, col: 0 };
    const challengePlayerIsAI = !!options.challengePlayerIsAI;
    this.botSkillLevel = options.botSkillLevel || 5;
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

    // A story boss's signature games come up more often (3x by default).
    const signature = options.signature || [];
    const boost = options.signatureWeight || 3;
    const weightOf = g => g.weight * (signature.includes(g.type.name) ? boost : 1);
    const totalWeight = allowedGames.reduce((s, g) => s + weightOf(g), 0);
    let r = Math.random() * totalWeight;
    let selected = allowedGames[0];
    for (const g of allowedGames) {
      r -= weightOf(g);
      if (r <= 0) { selected = g; break; }
    }

    this.currentGame = new selected.type();
    this.currentGame.botControlled = challengePlayerIsAI;
    this.currentGame.botSkill = this.botSkillLevel;
    this.currentGame.init(defender, attacker, difficulty, this.isDuel);
    this.active = true;
    this.callback = callback;
    this.startTime = Date.now();
    this.introTime = 0;
    this.challengeIsPractice = false;
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
    this._lastFrameAt = 0;
    this.gameLoop();
    return true;
  }

  startMiniGame(attacker, defender, boardPos, isAIAttacking, callback, botSkillLevel, signature, signatureWeight) {
    const started = this.startDefensiveMiniGame({
      attacker: defender,
      defender: attacker,
      boardPos,
      challengePlayerIsAI: isAIAttacking,
      botSkillLevel: botSkillLevel || 5,
      signature,
      signatureWeight,
    }, (result) => {
      if (callback) callback(result === 'defended' ? 'attacker' : 'defender');
    });
    if (!started && callback) callback('attacker');
    return started;
  }


  startPracticeMiniGame(gameType, callback, options = {}) {
    audioManager.init();
    this.practiceFailText = options.failText || null;

    const difficulty = 2;
    this.isDuel = false;
    this.isAIAttacking = false;
    // No real capture in practice, so play as a random piece each time.
    const types = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
    const pick = () => types[(Math.random() * types.length) | 0];
    const color = Math.random() < 0.5 ? 'white' : 'black';
    this.attackerPiece = { type: pick(), color };
    this.defenderPiece = { type: pick(), color: color === 'white' ? 'black' : 'white' };
    this.challengePiece = this.attackerPiece;
    this.threatPiece = this.defenderPiece;
    this.challengeResult = null;
    this.challengeDifficulty = difficulty;
    this.challengePlayerIsAI = false;
    this.botTimer = 0;
    this.nextBotAction = 0;

    if (typeof Mini3D === 'undefined' || !Mini3D.available()) return;
    this.currentGame = new gameType();
    this.currentGame.init(this.attackerPiece, this.defenderPiece, difficulty, false);
    this.active = true;
    this.callback = callback;
    this.startTime = Date.now();
    this.introTime = 0;
    this.challengeIsPractice = true;
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
    this._lastFrameAt = 0;
    this.gameLoop();
  }

  gameLoop() {
    if (!this.active) return;

    // Real elapsed time, so minigames run at the same speed on 60Hz and 120Hz screens.
    const now = performance.now();
    const dt = this._lastFrameAt ? Math.min(0.05, (now - this._lastFrameAt) / 1000) : 1 / 60;
    this._lastFrameAt = now;

    // Short "READY / GO" intro before play starts, so nobody loses time to surprise.
    this.introTime = (this.introTime || 0) + dt;
    const inIntro = this.introTime < MiniGameManager.INTRO_SECONDS;

    if (!inIntro) {
      try {
        this.currentGame.update(dt);
      } catch (e) {
        this._failSafe(e);
      }

      // Bot AI plays the minigame when the challenge owner is AI-controlled.
      if ((this.challengePlayerIsAI || this.isAIAttacking) && !this.currentGame.done) {
        this.botTimer += dt;
        const lvl = this.botSkillLevel || 5;
        const baseDelay = lvl <= 2 ? 0.8 : lvl <= 4 ? 0.5 : lvl <= 6 ? 0.3 : 0.15;
        const variance = lvl <= 2 ? 0.6 : lvl <= 4 ? 0.4 : lvl <= 6 ? 0.2 : 0.15;
        if (!this.nextBotAction || this.botTimer >= this.nextBotAction) {
          this.nextBotAction = this.botTimer + baseDelay + Math.random() * variance;
          const missChance = lvl <= 1 ? 0.5 : lvl <= 3 ? 0.3 : lvl <= 5 ? 0.1 : 0;
          if (this.currentGame.botPlay && Math.random() >= missChance) {
            this.currentGame.botPlay(dt, this.botTimer);
          }
        }
      }
    }

    const ctx = this.overlayCtx;
    const ox = this.overlayX;
    const oy = this.overlayY;
    const ow = this.overlayW;
    const oh = this.overlayH;
    const pal = MiniGameUtils.colors();

    const scaleX = ctx.canvas.width / Layout.W;
    const scaleY = ctx.canvas.height / Layout.H;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.clearRect(0, 0, Layout.W, Layout.H);

    // Fade-out when done
    let globalAlpha = 1;
    if (this.currentGame.done) {
      if (!this.doneTime) this.doneTime = Date.now();
      const elapsed = Date.now() - this.doneTime;
      globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - this.fadeDuration * 0.55) / (this.fadeDuration * 0.45));
      if (elapsed >= this.fadeDuration) {
        this.hideOverlay();
        return;
      }
    }

    ctx.save();
    ctx.globalAlpha = globalAlpha;

    // Dim the board with a vignette so the challenge reads as a separate moment.
    const vignette = ctx.createRadialGradient(Layout.cx, Layout.cy, Math.min(Layout.W, Layout.H) * 0.2, Layout.cx, Layout.cy, Math.max(Layout.W, Layout.H) * 0.75);
    vignette.addColorStop(0, 'rgba(6,4,16,0.72)');
    vignette.addColorStop(1, 'rgba(2,1,8,0.92)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, Layout.W, Layout.H);

    // Entrance animation
    const elapsed = Date.now() - this.startTime;
    const entranceProgress = Math.min(1, elapsed / 350);
    const eased = 1 - Math.pow(1 - entranceProgress, 3);
    const scale = 0.9 + eased * 0.1;

    ctx.save();
    ctx.globalAlpha = eased * globalAlpha;
    ctx.translate(Layout.cx, Layout.cy);
    ctx.scale(scale, scale);
    ctx.translate(-Layout.cx, -Layout.cy);

    this._drawFrame(ctx, ox, oy, ow, oh, pal);
    this._drawHeader(ctx, ox, oy, ow, pal);

    // The game itself, clipped to its area.
    ctx.save();
    MiniGameUtils.roundRect(ctx, this.gameX, this.gameY, this.gameW, this.gameH, 10);
    ctx.clip();
    try {
      const r = this._gameRect();
      this.currentGame.render(ctx, r.x, r.y, r.w, r.h);
    } catch (e) {
      this._failSafe(e);
    }
    ctx.restore();

    if (inIntro) this._drawIntro(ctx, pal);
    if (this.currentGame.done && this.doneTime) this._drawResult(ctx, pal);

    ctx.restore();

    if (this.challengePlayerIsAI && !this.currentGame.done) {
      const bossName = (typeof GameScreen !== 'undefined' && GameScreen.currentCharacter && typeof GameScreen.currentCharacter === 'object')
        ? GameScreen.currentCharacter.name : 'Your opponent';
      const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 250);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, Layout.W, 48);
      ctx.fillStyle = MiniGameUtils.colorWithAlpha(pal.warn, pulse);
      ctx.font = 'bold 20px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bossName + ' is defending their piece...', Layout.W / 2, 25);
      ctx.textBaseline = 'alphabetic';
    }

    ctx.restore();

    this.animFrame = requestAnimationFrame(() => this.gameLoop());
  }

  _gameRect() {
    return { x: this.gameX, y: this.gameY, w: this.gameW, h: this.gameH };
  }

  // A mini-game bug must never freeze a chess game: end it and let the capture stand.
  _failSafe(error) {
    console.error('Mini-game error:', error);
    if (this.currentGame && !this.currentGame.done) {
      this.currentGame.done = true;
      this.currentGame.winner = 'defender';
    }
  }

  _drawFrame(ctx, ox, oy, ow, oh, pal) {
    ctx.save();
    // Drop shadow + body
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 12;
    MiniGameUtils.roundRect(ctx, ox, oy, ow, oh, 18);
    const body = ctx.createLinearGradient(0, oy, 0, oy + oh);
    body.addColorStop(0, '#221a44');
    body.addColorStop(1, '#130f28');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Outer and inner borders
    ctx.lineWidth = 3;
    ctx.strokeStyle = MiniGameUtils.colorWithAlpha(this._frameColor(pal), 0.9);
    MiniGameUtils.roundRect(ctx, ox, oy, ow, oh, 18);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    MiniGameUtils.roundRect(ctx, ox + 6, oy + 6, ow - 12, oh - 12, 13);
    ctx.stroke();

    // Game well with a faint pixel grid
    const gx = this.gameX, gy = this.gameY, gw = this.gameW, gh = this.gameH;
    MiniGameUtils.roundRect(ctx, gx, gy, gw, gh, 10);
    ctx.fillStyle = pal.background;
    ctx.fill();
    ctx.save();
    MiniGameUtils.roundRect(ctx, gx, gy, gw, gh, 10);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let x = gx; x < gx + gw; x += 24) ctx.fillRect(x, gy, 1, gh);
    for (let y = gy; y < gy + gh; y += 24) ctx.fillRect(gx, y, gw, 1);
    const glow = ctx.createRadialGradient(gx + gw / 2, gy, 0, gx + gw / 2, gy, gh);
    glow.addColorStop(0, MiniGameUtils.colorWithAlpha(this._frameColor(pal), 0.10));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(gx, gy, gw, gh);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    MiniGameUtils.roundRect(ctx, gx, gy, gw, gh, 10);
    ctx.stroke();
    ctx.restore();
  }

  _frameColor(pal) {
    if (this.currentGame && this.currentGame.done && this.doneTime) {
      return this.currentGame.winner === 'attacker' ? pal.success : pal.danger;
    }
    return this.isDuel ? pal.warn : pal.info;
  }

  _drawHeader(ctx, ox, oy, ow, pal) {
    const cx = ox + ow / 2;
    const headerY = oy + 18;
    const practice = this.challengeIsPractice;
    const names = { pawn: 'Pawn', knight: 'Knight', bishop: 'Bishop', rook: 'Rook', queen: 'Queen', king: 'King' };
    const threatened = this.challengePiece ? names[this.challengePiece.type] : 'Piece';

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // Tag above the title
    const tag = practice ? 'PRACTICE' : (this.isDuel ? 'DUEL' : 'CAPTURE CHALLENGE');
    ctx.font = 'bold 13px "Pixelify Sans", sans-serif';
    const tagW = ctx.measureText(tag).width + 24;
    MiniGameUtils.roundRect(ctx, cx - tagW / 2, headerY, tagW, 22, 11);
    ctx.fillStyle = MiniGameUtils.colorWithAlpha(this.isDuel ? pal.warn : pal.info, 0.18);
    ctx.fill();
    ctx.fillStyle = this.isDuel ? pal.warn : pal.info;
    ctx.fillText(tag, cx, headerY + 16);

    // Title
    const title = practice ? (this.currentGame.name || 'Mini-Game') : `Save the ${threatened}!`;
    ctx.font = 'bold 26px "Silkscreen", monospace';
    ctx.fillStyle = pal.text;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowOffsetY = 3;
    ctx.fillText(title.toUpperCase(), cx, headerY + 54);
    ctx.shadowColor = 'transparent';

    // Difficulty pips
    const diff = Math.max(1, Math.min(5, Math.ceil((this.challengeDifficulty || 1) / 2)));
    const pipW = 16, gap = 6;
    const totalW = 5 * pipW + 4 * gap;
    for (let i = 0; i < 5; i++) {
      const px = cx - totalW / 2 + i * (pipW + gap);
      MiniGameUtils.roundRect(ctx, px, headerY + 66, pipW, 6, 3);
      ctx.fillStyle = i < diff ? pal.gold : 'rgba(255,255,255,0.14)';
      ctx.fill();
    }

    // Pieces: threatened on the left, attacker on the right.
    if (!practice && this.challengePiece && this.threatPiece) {
      this._drawPieceBadge(ctx, ox + 30, headerY - 2, this.challengePiece, 'DEFENDING', pal.success, pal);
      this._drawPieceBadge(ctx, ox + ow - 30 - 64, headerY - 2, this.threatPiece, 'ATTACKING', pal.danger, pal);
    }
    ctx.restore();
  }

  _drawPieceBadge(ctx, x, y, piece, label, color, pal) {
    ctx.save();
    MiniGameUtils.roundRect(ctx, x, y, 64, 64, 12);
    ctx.fillStyle = MiniGameUtils.colorWithAlpha(color, 0.14);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = MiniGameUtils.colorWithAlpha(color, 0.7);
    ctx.stroke();
    this._drawPieceIcon(ctx, x + 8, y + 6, piece);
    ctx.font = 'bold 11px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(label, x + 32, y + 80);
    ctx.restore();
  }

  _drawIntro(ctx, pal) {
    const t = this.introTime / MiniGameManager.INTRO_SECONDS;
    const go = t > 0.62;
    const local = go ? (t - 0.62) / 0.38 : t / 0.62;
    const gx = this.gameX, gy = this.gameY, gw = this.gameW, gh = this.gameH;
    ctx.save();
    ctx.fillStyle = `rgba(8,6,20,${go ? 0.55 * (1 - local) : 0.62})`;
    MiniGameUtils.roundRect(ctx, gx, gy, gw, gh, 10);
    ctx.fill();
    const size = go ? 72 + local * 30 : 56;
    ctx.font = `bold ${Math.round(size)}px "Silkscreen", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha *= go ? 1 - local * 0.8 : Math.min(1, local * 3);
    ctx.fillStyle = go ? pal.success : pal.text;
    ctx.shadowColor = go ? pal.success : 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = go ? 24 : 0;
    ctx.fillText(go ? 'GO!' : 'READY', gx + gw / 2, gy + gh / 2);
    if (!go && this.currentGame.name) {
      ctx.shadowBlur = 0;
      ctx.font = 'bold 20px "Pixelify Sans", sans-serif';
      ctx.fillStyle = pal.textDim;
      ctx.fillText(this.currentGame.name, gx + gw / 2, gy + gh / 2 + 56);
    }
    ctx.restore();
  }

  _drawResult(ctx, pal) {
    const t = Math.min(1, (Date.now() - this.doneTime) / 250);
    const ease = 1 - Math.pow(1 - t, 3);
    const defended = this.currentGame.winner === 'attacker';
    const color = defended ? pal.success : pal.danger;
    const gx = this.gameX, gy = this.gameY, gw = this.gameW, gh = this.gameH;
    ctx.save();
    ctx.fillStyle = `rgba(8,6,20,${0.7 * ease})`;
    MiniGameUtils.roundRect(ctx, gx, gy, gw, gh, 10);
    ctx.fill();

    const bandH = 130;
    const by = gy + gh / 2 - bandH / 2;
    ctx.globalAlpha *= ease;
    const band = ctx.createLinearGradient(gx, 0, gx + gw, 0);
    band.addColorStop(0, MiniGameUtils.colorWithAlpha(color, 0));
    band.addColorStop(0.5, MiniGameUtils.colorWithAlpha(color, 0.28));
    band.addColorStop(1, MiniGameUtils.colorWithAlpha(color, 0));
    ctx.fillStyle = band;
    ctx.fillRect(gx, by, gw, bandH);
    ctx.fillStyle = color;
    ctx.fillRect(gx + gw * 0.2, by, gw * 0.6, 2);
    ctx.fillRect(gx + gw * 0.2, by + bandH - 2, gw * 0.6, 2);

    const practice = this.challengeIsPractice;
    const title = practice ? (defended ? 'CLEARED!' : 'FAILED') : (defended ? 'SAVED!' : 'CAPTURED!');
    const sub = practice
      ? (defended ? 'You beat the challenge' : (this.practiceFailText || 'Try again from the practice menu'))
      : (defended ? 'The capture is cancelled' : 'The capture goes through');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(44 + (1 - ease) * 20)}px "Silkscreen", monospace`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.fillText(title, gx + gw / 2, by + 52);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 18px "Pixelify Sans", sans-serif';
    ctx.fillStyle = pal.text;
    ctx.fillText(sub, gx + gw / 2, by + 98);
    ctx.restore();
  }

  _drawPieceIcon(ctx, x, y, piece) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const size = 48;
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
      // Only count minigames a human actually played.
      if (!this.challengePlayerIsAI && !this.isAIAttacking) {
        const stats = store.get('stats');
        stats.miniGamesPlayed++;
        if (winner === 'attacker') stats.miniGamesWon++;
        // Per-game record, so Grandmaster X can pick the games you lose most.
        const name = this.currentGame && this.currentGame.constructor.name;
        if (name) {
          stats.miniGameByType = stats.miniGameByType || {};
          const rec = stats.miniGameByType[name] || (stats.miniGameByType[name] = { played: 0, won: 0 });
          rec.played++;
          if (winner === 'attacker') rec.won++;
        }
        store.set('stats', stats);
      }
      this.challengeResult = result;
      this.callback(result);
      this.callback = null;
    }

    this.currentGame = null;
    this.doneTime = 0;
    this.challengePlayerIsAI = false;
  }

  get inIntro() {
    return (this.introTime || 0) < MiniGameManager.INTRO_SECONDS;
  }

  handleClick(x, y) {
    if (!this.active || !this.currentGame || this.inIntro) return;
    if (this.challengePlayerIsAI && this.currentGame && !this.currentGame.done) return;
    if (this.currentGame.done && this.doneTime) return;

    if (this.currentGame.handleClick) {
      this.currentGame.handleClick(x, y);
    }
  }

  handleKey(key) {
    if (!this.active || !this.currentGame || this.inIntro) return;
    if (this.challengePlayerIsAI && this.currentGame && !this.currentGame.done) return;
    if (this.currentGame.handleKey) {
      this.currentGame.handleKey(key);
    }
  }

  handleKeyUp(key) {
    if (this.active && this.currentGame && this.currentGame.handleKeyUp) this.currentGame.handleKeyUp(key);
  }

  // Pointer down/move/up for games that steer or aim with the mouse.
  handlePointer(type, x, y) {
    if (!this.active || !this.currentGame || !this.currentGame.handlePointer) return;
    if (this.challengePlayerIsAI && !this.currentGame.done) return;
    if (type === 'down' && this.inIntro) return;
    this.currentGame.handlePointer(type, x, y);
  }
}

const miniGameManager = new MiniGameManager();
