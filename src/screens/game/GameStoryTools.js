// GameScreen's story-fight parts, kept apart so GameScreen.js stays readable: the Shop's
// items (rewind, hint, remove), the keepsake powers, the boss twists (locks, fog, mystery
// piece, relics, double take...) and the Training Camp's tests. They are mixed into
// GameScreen when this file loads (after GameScreen.js in index.html), so `this` is GameScreen.
const GameStoryTools = {
  /* ------------------------------------------------------------------ */
  /*  Story items (bought with stars in the Shop, see src/state/Wallet.js) */
  /* ------------------------------------------------------------------ */

  // Items work in story fights against a real opponent: not in the Training Camp,
  // puzzle drills or challenge trials.
  itemsAvailable() {
    const ch = this.currentCharacter, rule = this.bossRule || {};
    return typeof Wallet !== 'undefined' && this.mode === 'story' && !!ch && !ch.trainer && !rule.puzzles && !rule.minigameTrial;
  },

  // Whether an item can be used now. `rules` skips the turn checks (Undo checks its own).
  canUseItem(id, rules = false) {
    if (!this.itemsAvailable() || Wallet.count(id) <= 0) return false;
    if (rules) return true;
    if (this.gameOver || this.bossEvent || this.reviewingAt !== null || this.promotionPending || this.trial) return false;
    if (store.get('miniGameActive') || this.aiThinking || this.turn !== this.playerColor) return false;
    if (id === 'rewind') return this.canUndo();
    if (id === 'hint') return !this._hintPending && !(this.hint && this.hint.at === this.moveHistory.length);
    if (id === 'remove') {
      const goal = (this.bossRule && this.bossRule.goal) || {};
      return !goal.mystery && !goal.captureAll && this._removable().length > 0;
    }
    return false;
  },

  useItem(id) {
    if (!this.canUseItem(id)) {
      if (this.itemsAvailable() && Wallet.count(id) <= 0) this._shopHint();
      else if (audioManager.playTileLock) audioManager.playTileLock();
      return;
    }
    if (id === 'rewind') this.undo();
    else if (id === 'hint') this._useHint();
    else if (id === 'remove') {
      this.removeMode = !this.removeMode;
      this.sealMode = false;
      this.selectedSquare = null;
      this.legalMoves = [];
      audioManager.playSelect();
    }
  },

  // A short note in the status bar (none left: buy more in the Shop).
  _shopHint() {
    this._itemMsg = { text: 'None left: buy more in the Shop (on the world map)', until: performance.now() + 2600 };
    if (audioManager.playTileLock) audioManager.playTileLock();
  },

  itemMessage() {
    if (this.removeMode) return 'Click an enemy piece to remove it';
    if (this.sealMode) return 'Click one of your pieces to seal it';
    if (this._hintPending) return 'Finding a good move...';
    return this._itemMsg && performance.now() < this._itemMsg.until ? this._itemMsg.text : null;
  },

  // Enemy pieces that can be lifted off: not the king or queen, not a wall, and not
  // one whose removal would leave his king in check on your move.
  _removable() {
    const out = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board.grid[r][c];
        if (!p || p.color !== this.aiColor || p.type === 'king' || p.type === 'queen' || p.type === 'wall') continue;
        const test = this.board.clone();
        test.grid[r][c] = null;
        const k = test.findKing(this.aiColor);
        if (k && MoveGen.isSquareAttacked(test, k.row, k.col, this.playerColor)) continue;
        out.push({ row: r, col: c });
      }
    }
    return out;
  },

  _removePiece(row, col) {
    if (!this._removable().some(s => s.row === row && s.col === col)) return false;
    if (!Wallet.use('remove')) return false;
    const piece = this.board.grid[row][col];
    this.board.grid[row][col] = null;
    this.capturedPieces[this.playerColor].push({ ...piece });
    this.removeMode = false;
    this.hint = null;
    this._fogCache = null;
    if (typeof PixiParticleFX !== 'undefined' && PixiParticleFX.spawnCaptureExplosion) {
      const c = PixiBoardRenderer.squareCenter(row, col);
      PixiParticleFX.spawnCaptureExplosion(c.x, c.y, 0xffd24a, piece.type);
    }
    audioManager.playCapture();
    store.update({ board: this.board });
    this._persistGame();
    return true;
  },

  // The engine's move for you, marked on the board until you move.
  _useHint() {
    if (!Wallet.use('hint')) return;
    this._hintPending = true;
    const at = this.moveHistory.length;
    const legal = GameRules.getLegalMoves(this.board, this.playerColor).filter(m => !this._isLockedSquare(m.to.row, m.to.col));
    const done = (move) => {
      this._hintPending = false;
      if (this.moveHistory.length !== at || this.gameOver) { Wallet.give('hint', 1); return; }
      if (!move) { Wallet.give('hint', 1); return; }
      this.hint = { from: { ...move.from }, to: { ...move.to }, at };
      audioManager.playSelect();
    };
    const walls = this.board.grid.some(r => r.some(p => p && p.type === 'wall'));
    if (!legal.length) { done(null); return; }
    if (walls && AIController._wallsHideCheck(this.board, this.playerColor)) { done(AIController._fallbackMove(legal)); return; }
    const restricted = walls || legal.length < GameRules.getLegalMoves(this.board, this.playerColor).length;
    const searchmoves = restricted ? legal.map(m => BotPersonality.moveToUci(m)) : null;
    BotPersonality.bestMove(FEN.fromBoard(this.board, this.playerColor), { skill: 20, depth: 12, searchmoves })
      .then(uci => done(BotPersonality._uciToMove(uci, legal) || null))
      .catch(() => done(null));
  },

  // Hint squares and removable pieces, drawn over the board.
  _drawItemMarks() {
    const board = typeof PixiBoardRenderer !== 'undefined' && PixiBoardRenderer.container;
    if (!board) return;
    if (!this._itemG || this._itemG.destroyed || this._itemG.parent !== board) {
      this._itemG = new PIXI.Graphics();
      this._itemG.eventMode = 'none';
      board.addChild(this._itemG);
    }
    const g = this._itemG.clear();
    const sq = PixiBoardRenderer.squareSize;
    const pulse = 0.55 + 0.35 * Math.sin(performance.now() / 180);
    if (this.hint && this.hint.at === this.moveHistory.length && !this.gameOver) {
      for (const s of [this.hint.from, this.hint.to]) {
        const x = PixiBoardRenderer.squareX(s.col), y = PixiBoardRenderer.squareY(s.row);
        g.rect(x + 3, y + 3, sq - 6, sq - 6).fill({ color: 0x5dff8a, alpha: 0.28 * pulse });
        g.rect(x + 4, y + 4, sq - 8, sq - 8).stroke({ color: 0x5dff8a, width: 6, alpha: 0.5 + 0.5 * pulse });
        g.rect(x + 10, y + 10, sq - 20, sq - 20).stroke({ color: 0xeafff0, width: 2, alpha: 0.6 * pulse });
      }
    }
    if (this.removeMode && !this.gameOver) {
      for (const s of this._removable()) {
        const x = PixiBoardRenderer.squareX(s.col), y = PixiBoardRenderer.squareY(s.row);
        g.rect(x + 3, y + 3, sq - 6, sq - 6).stroke({ color: 0xff6a5a, width: 3, alpha: pulse });
        g.rect(x + 3, y + 3, sq - 6, sq - 6).fill({ color: 0xff6a5a, alpha: 0.14 });
      }
    }
    // The Mist Lantern: every square he attacks gets a pale-green ember, your pieces
    // in danger a ring.
    if (this.lanternLit()) {
      for (const s of this.lantern.attacked) {
        const x0 = PixiBoardRenderer.squareX(s.col), y0 = PixiBoardRenderer.squareY(s.row), x = x0 + sq / 2, y = y0 + sq / 2;
        g.rect(x0 + 2, y0 + 2, sq - 4, sq - 4).fill({ color: 0x3adcb4, alpha: 0.16 + 0.1 * pulse });
        g.rect(x - 7, y - 7, 14, 14).fill({ color: 0x70f0d0, alpha: 0.55 * pulse + 0.25 });
        g.rect(x - 3, y - 3, 6, 6).fill({ color: 0xe8fff8, alpha: 0.95 });
      }
      for (const s of this.lantern.threatened) {
        const x = PixiBoardRenderer.squareX(s.col), y = PixiBoardRenderer.squareY(s.row);
        g.rect(x + 3, y + 3, sq - 6, sq - 6).stroke({ color: 0xff5a5a, width: 4, alpha: 0.5 + 0.5 * pulse });
      }
    }
    // Seal mode: your pieces that can be sealed; sealed squares: a red wax seal.
    if (this.sealMode && !this.gameOver) {
      for (const s of this._sealable()) {
        const x = PixiBoardRenderer.squareX(s.col), y = PixiBoardRenderer.squareY(s.row);
        g.rect(x + 3, y + 3, sq - 6, sq - 6).stroke({ color: 0xff6a5a, width: 3, alpha: pulse }).fill({ color: 0xff6a5a, alpha: 0.12 });
      }
    }
    for (const t of this.lockedTiles) {
      if (!t.seal) continue;
      const x = PixiBoardRenderer.squareX(t.col), y = PixiBoardRenderer.squareY(t.row), cx = x + sq - 16, cy = y + 16;
      g.rect(x + 2, y + 2, sq - 4, sq - 4).stroke({ color: 0xd8322a, width: 3, alpha: 0.85 });
      // Red wax stamped with an X, as the Broken Seal was.
      g.circle(cx, cy, 11).fill(0x5a0a14).circle(cx, cy - 1, 9).fill(0xc8262e).circle(cx - 3, cy - 4, 3).fill(0xff7a6a);
      for (let k = -3; k <= 3; k++) g.rect(cx + k - 1, cy + k - 2, 2, 2).fill(0x5a0a14).rect(cx - k - 1, cy + k - 2, 2, 2).fill(0x5a0a14);
    }
    this._drawBounty(board, sq);
  },

  // The Wanted Poster's mark over the wanted piece, with the bounty below it.
  _drawBounty(board, sq) {
    let at = !this.gameOver && this.bountySquare();
    const hidden = at && this._hiddenSquares();
    if (hidden && hidden[at.row][at.col]) at = null;          // no giving it away in the fog
    if (!at || typeof PixiKeepsake === 'undefined') {
      if (this._bountyMark && !this._bountyMark.destroyed) this._bountyMark.visible = false;
      return;
    }
    if (!this._bountyMark || this._bountyMark.destroyed || this._bountyMark.parent !== board) {
      const c = new PIXI.Container();
      const icon = PixiKeepsake.icon('poster', 26);
      const tag = new PIXI.Text({ text: `+${this.BOUNTY}`, style: { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 11, fill: '#ffd24a', stroke: { color: '#1a1024', width: 4 } } });
      tag.anchor.set(0.5, 0);
      tag.y = 12;
      c.addChild(icon, tag);
      c.eventMode = 'none';
      board.addChild(c);
      this._bountyMark = c;
    }
    const m = this._bountyMark;
    m.visible = true;
    m.x = PixiBoardRenderer.squareX(at.col) + 15;
    m.y = PixiBoardRenderer.squareY(at.row) + 15 + Math.sin(performance.now() / 260) * 2;
  },

  /* ------------------------------------------------------------------ */
  /*  Keepsake powers (src/characters/keepsakes.js), in story fights      */
  /* ------------------------------------------------------------------ */

  // Once per fight each: the Stopped Hourglass (a free rewind), the Mist Lantern (his
  // threats shown and the fog gone for your turn), the Broken Seal (one of your pieces
  // cannot be taken for three of his turns). The Wanted Poster puts a bounty on one of
  // his pieces. `powers` records what was used (kept outside the snapshots, so an undo
  // never gives a power back).
  KEEPSAKE_POWERS: ['hourglass', 'lantern', 'seal'],
  BOUNTY: 25,

  hasKeepsake(id) {
    return this.itemsAvailable() && typeof Keepsakes !== 'undefined' && Keepsakes.has(id);
  },

  powerUsed(id) {
    return !!(this.powers && this.powers[id]);
  },

  canUsePower(id) {
    if (!this.hasKeepsake(id) || this.powerUsed(id)) return false;
    if (this.gameOver || this.bossEvent || this.reviewingAt !== null || this.promotionPending || this.trial) return false;
    if (store.get('miniGameActive') || this.aiThinking || this.turn !== this.playerColor) return false;
    if (id === 'hourglass') return this._canRewind();
    if (id === 'seal') return this._sealable().length > 0;
    return true;
  },

  usePower(id) {
    if (id === 'seal' && this.sealMode) { this.sealMode = false; audioManager.playSelect(); return; }
    if (!this.canUsePower(id)) {
      if (this.powerUsed(id)) this._itemMsg = { text: 'Used already: once per fight', until: performance.now() + 2200 };
      if (audioManager.playTileLock) audioManager.playTileLock();
      return;
    }
    if (id === 'hourglass') {
      this.powers = { ...this.powers, hourglass: true };
      this.undo(true);
      this._itemMsg = { text: 'The sand stops for you. Your move again.', until: performance.now() + 2600 };
      this._persistGame();
    } else if (id === 'lantern') {
      this.powers = { ...this.powers, lantern: true };
      this.lantern = { at: this.moveHistory.length, ...this._threats() };
      this._fogCache = null;
      this._itemMsg = { text: 'The lantern shows what he hides', until: performance.now() + 2600 };
      if (audioManager.playPromotion) audioManager.playPromotion();
      this._persistGame();
    } else if (id === 'seal') {
      this.sealMode = true;
      this.removeMode = false;
      this.selectedSquare = null;
      this.legalMoves = [];
      audioManager.playSelect();
    }
  },

  // Whether the lantern is lit (your turn after using it).
  lanternLit() {
    return !!this.lantern && this.lantern.at === this.moveHistory.length && !this.gameOver;
  },

  // Squares his pieces attack, and your pieces standing on them.
  _threats() {
    const attacked = [], threatened = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (!MoveGen.isSquareAttacked(this.board, r, c, this.aiColor)) continue;
      attacked.push({ row: r, col: c });
      const p = this.board.grid[r][c];
      if (p && p.color === this.playerColor) threatened.push({ row: r, col: c });
    }
    return { attacked, threatened };
  },

  // Your pieces the seal can hold (not the king).
  _sealable() {
    const out = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = this.board.grid[r][c];
      if (p && p.color === this.playerColor && p.type !== 'king' && !this._isLockedSquare(r, c)) out.push({ row: r, col: c });
    }
    return out;
  },

  // Seals a piece: he cannot move onto (take) its square for three of his turns.
  _sealPiece(row, col) {
    if (!this._sealable().some(s => s.row === row && s.col === col)) return false;
    this.sealMode = false;
    this.powers = { ...this.powers, seal: true };
    this.lockedTiles.push({ row, col, until: this.moveHistory.length + 6, seal: true });
    if (typeof PixiParticleFX !== 'undefined' && PixiParticleFX.spawnCaptureExplosion) {
      const c = PixiBoardRenderer.squareCenter(row, col);
      PixiParticleFX.spawnCaptureExplosion(c.x, c.y, 0xff6a5a, 'pawn');
    }
    audioManager.playTileLock();
    this._itemMsg = { text: 'Sealed: he cannot take it for 3 turns', until: performance.now() + 2600 };
    store.update({ board: this.board });
    this._persistGame();
    return true;
  },

  // The Wanted Poster: one of his minor pieces or rooks carries a bounty (a story tag
  // that moves with the piece, like the Mystery Piece).
  _placeBounty() {
    if (!this.hasKeepsake('poster') || (this.bossRule && this.bossRule.goal && (this.bossRule.goal.mystery || this.bossRule.goal.captureAll))) return;
    const pool = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = this.board.grid[r][c];
      if (p && p.color === this.aiColor && ['knight', 'bishop', 'rook'].includes(p.type)) pool.push(p);
    }
    if (pool.length) pool[Math.floor(Math.random() * pool.length)].wanted = true;
  },

  // Where the wanted piece stands, or null.
  bountySquare() {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = this.board.grid[r][c];
      if (p && p.wanted && p.color === this.aiColor) return { row: r, col: c, type: p.type };
    }
    return null;
  },

  // Taking the wanted piece pays the bounty (once per fight).
  _collectBounty(captured) {
    if (!captured || !captured.wanted || captured.color !== this.aiColor || this.powerUsed('bounty')) return;
    this.powers = { ...this.powers, bounty: true };
    const coins = Wallet.earn('bounty', this.BOUNTY);
    this._itemMsg = { text: `Bounty collected: +${coins} coins`, until: performance.now() + 3200 };
    if (audioManager.playVictory) audioManager.playVictory();
  },

  /* ------------------------------------------------------------------ */
  /*  Story boss twists (rules live in BossRules, visuals in PixiBossFX)  */
  /* ------------------------------------------------------------------ */

  // Squares locked by a lost challenge. (CastlE's walls are real blockers on the board.)
  _isLockedSquare(row, col) {
    return this.lockedTiles.some(t => t.row === row && t.col === col);
  },

  // Plain locks last for the rest of one turn; timed ones until their ply.
  _expireLocks() {
    this.lockedTiles = this.lockedTiles.filter(t => t.until && t.until > this.moveHistory.length &&
      !(t.seal && !(this.board.grid[t.row][t.col] && this.board.grid[t.row][t.col].color === this.playerColor)));
  },

  // The Knight of the Mist: 8x8 booleans (true = hidden from you), or null.
  _hiddenSquares() {
    if (!this.bossRule || !this.bossRule.fog || this.gameOver || this.lanternLit()) return null;
    const key = PixiGameScreen._getBoardKey(this.board);
    if (!this._fogCache || this._fogCache.key !== key) {
      const seen = BossRules.visibleSquares(this.board, this.playerColor);
      const rule = this.bossRule;
      const rows = rule.fogRows;   // a band of mist (the Rulekeeper), a Great Board quarter, or the whole board
      const misted = (r, c) => (rule.regions ? BossRules.regionAt(rule, { row: r, col: c }) === 'mist' : !rows || rows.includes(r));
      this._fogCache = { key, hidden: seen.map((row, r) => row.map((v, c) => !v && misted(r, c))) };
    }
    return this._fogCache.hidden;
  },

  _playerMoves() {
    return Math.floor((this.moveHistory.length + (this.playerColor === 'white' ? 1 : 0)) / 2);
  },

  // The Clock: how many of your moves are left.
  movesLeft() {
    const limit = this.bossRule && this.bossRule.moveLimit;
    return limit ? limit - Math.ceil(this.moveHistory.length / 2) : Infinity;
  },

  // Boss-rule checks after every completed turn.
  _afterBossMoveChecks(move) {
    const rule = this.bossRule;
    if (!rule || this.bossEvent) return;
    const bossMoved = this.turn === this.playerColor;
    if (rule.fog && bossMoved) {
      const hidden = this._hiddenSquares();
      if (hidden && hidden[move.to.row][move.to.col]) move.hidden = true;
      // Every third move of his, his hidden knights' eyes glow in the mist.
      if (hidden && Math.floor(this.moveHistory.length / 2) % 3 === 0 && typeof PixiBossFX !== 'undefined') {
        const knights = [];
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const p = this.board.grid[r][c];
            if (hidden[r][c] && p && p.type === 'knight' && p.color === this.aiColor) knights.push({ row: r, col: c });
          }
        }
        if (knights.length) {
          setTimeout(() => PixiBossFX.showEyes(knights), 350);
          this._twistLine('eyes');
        }
      }
    }
    const goal = rule.goal || {};
    if (goal.captures && !bossMoved && this.capturedPieces[this.playerColor].length >= goal.captures) {
      this._endTraining(true, 'goal');
      return;
    }
    if (goal.captureAll && !bossMoved && BossRules.armyLeft(this.board, this.aiColor) === 0) {
      this._endTraining(true, 'cleared');
      return;
    }
    if (goal.mystery && !bossMoved && this._mysteryMove(move)) return;
    if (goal.promote && !bossMoved && move.promotion) {
      this._endTraining(true, 'crowned');
      return;
    }
    if (goal.relics && !bossMoved) {
      const taken = BossRules.relicsTaken(rule, this.moveHistory, this.playerColor);
      const before = BossRules.relicsTaken(rule, this.moveHistory.slice(0, -1), this.playerColor);
      if (taken.length > before.length && typeof PixiBossFX !== 'undefined') PixiBossFX.relicTaken(move.to, taken.length, goal.relics.length);
      if (taken.length >= goal.relics.length) {
        this._endTraining(true, 'relics');
        return;
      }
      if (taken.length > before.length) this._twistLine('relic', { left: goal.relics.length - taken.length });
    }
    if (goal.crossing && !bossMoved) {
      const k = this.board.findKing(this.playerColor);
      if (k && k.row === BossRules.crossingRow(this.playerColor)) {
        this._endTraining(true, 'crossed');
        return;
      }
    }
    if (goal.survive && bossMoved && this._playerMoves() >= goal.survive) {
      this._endTraining(true, 'survived');
      return;
    }
    if (rule.moveLimit && !bossMoved && (this.movesLeft() === 10 || this.movesLeft() === 5)) {
      this._twistLine('clockLow', { left: this.movesLeft() });
    }
    if (rule.moveLimit && !bossMoved && this.movesLeft() <= 0) {
      this.gameOver = true;
      this.gameStatus = 'timeout';
      this.gameResult = this.aiColor;
      this.handleGameEnd();
      audioManager.playGameOver();
      store.update({ gameStatus: this.gameStatus, gameOver: true, gameResult: this.gameResult });
      return;
    }
    // Timed locks can leave a side with no move that normal chess would allow.
    if (this.lockedTiles.length) this.checkForLockedTileGameEnd();
  },

  // The opponent reacts to its own twist (lines in gameDialogue[category]).
  _twistLine(category, context) {
    if (this.mode === 'story' && typeof DialogueManager !== 'undefined') DialogueManager.onTwist(category, context);
  },

  // Mystery piece, after each of your moves: taking it wins, taking a
  // suspect clears it, and every few moves a hint clears more. Returns true
  // when the game is over.
  _mysteryMove(move) {
    const fx = typeof PixiBossFX !== 'undefined' ? PixiBossFX : null;
    const taken = move.captured;
    if (taken && taken.mystery) {
      if (fx) fx.mysteryFound(move.to, taken);
      this._endTraining(true, 'mystery');
      return true;
    }
    if (taken && taken.suspect) {
      if (fx) fx.banner('NOT THIS ONE', '#ffb347');
      audioManager.playTileLock();
    }
    const every = this.bossRule.goal.hintEvery || 3;
    const left = BossRules.suspects(this.board, this.aiColor);
    if (left.length > 1 && this._playerMoves() % every === 0) {
      const hint = BossRules.mysteryHint(this.board, this.aiColor);
      if (hint) {
        for (const s of hint.cleared) this.board.grid[s.row][s.col].suspect = false;
        this.bossState = { ...this.bossState, hint: hint.text, hints: (this.bossState.hints || 0) + 1 };
        if (fx) fx.mysteryHint(hint);
        audioManager.playSelect();
        this._twistLine('mysteryHint');
      }
    }
    if (BossRules.suspects(this.board, this.aiColor).length === 1 && !this.bossState.found) {
      this.bossState = { ...this.bossState, found: true, hint: 'Only one suspect left. That is the one!' };
      if (fx) setTimeout(() => fx.banner('FOUND IT!', '#ffd35a'), 900);
    }
    return false;
  },

  // Memory missions: the rank the king started the crossing on.
  _crossingStart() {
    const rule = this.bossRule;
    if (!this._crossStart || this._crossStart.rule !== rule) {
      const k = BossRules.startBoard(rule, () => 0).findKing(this.playerColor);
      this._crossStart = { rule, row: k ? k.row : (this.playerColor === 'white' ? 7 : 0) };
    }
    return this._crossStart.row;
  },

  // Moves until the next mystery hint.
  mysteryHintIn() {
    const every = (this.bossRule && this.bossRule.goal && this.bossRule.goal.hintEvery) || 3;
    return every - (this._playerMoves() % every);
  },

  // ForkMaster: the second forked piece is taken along with the first.
  _applyDoubleTake(move, captured) {
    const v = move.doubleTake;
    const still = this.board.grid[v.row][v.col];
    if (!still || still.color !== v.piece.color || still.type !== v.piece.type) {
      move.doubleTake = null;
      return;
    }
    this.board.grid[v.row][v.col] = null;
    this.capturedPieces[this.turn].push(v.piece);
    move.san = (move.san || '?') + ' x2';
    this._twistLine('doubleTake');
    if (typeof PixiBossFX !== 'undefined') {
      PixiBossFX.doubleTake(move.from, [
        { row: move.to.row, col: move.to.col, piece: captured },
        { row: v.row, col: v.col, piece: v.piece },
      ], store.get('theme'));
    }
    audioManager.playCapture();
  },

  // Minigames a boss favours: his signature games, or for Grandmaster X the
  // ones you lose most.
  _bossSignature() {
    const rule = this.bossRule;
    if (!rule) return null;
    if (rule.weakestGames) {
      if (!this._weakestGames) this._weakestGames = BossRules.weakestGames((store.get('stats') || {}).miniGameByType);
      return this._weakestGames;
    }
    return rule.signature || null;
  },

  // What a trainer's test panel shows, or null outside the Training Camp.
  trainingProgress() {
    const rule = this.bossRule;
    if (!rule) return null;
    if (rule.puzzles) {
      const solved = this.gameOver && this.playerWon() ? rule.puzzles.length : (this.bossState.puzzle || 0);
      return { label: 'PUZZLES SOLVED', done: solved, total: rule.puzzles.length, slots: rule.puzzles.length };
    }
    if (rule.goal && rule.goal.captures) {
      const n = Math.min(rule.goal.captures, this.capturedPieces[this.playerColor].length);
      return { label: 'CAPTURES WON', done: n, total: rule.goal.captures, slots: rule.goal.captures };
    }
    if (rule.goal && rule.goal.captureAll) {
      const taken = this.capturedPieces[this.playerColor].length;
      const total = taken + BossRules.armyLeft(this.board, this.aiColor);
      return { label: 'PIECES TAKEN', done: taken, total, slots: Math.min(total, 9) };
    }
    if (rule.goal && rule.goal.survive) {
      const n = Math.min(rule.goal.survive, this._playerMoves());
      return { label: 'MOVES SURVIVED', done: n, total: rule.goal.survive, slots: Math.min(rule.goal.survive, 15) };
    }
    if (rule.goal && rule.goal.relics) {
      const n = BossRules.relicsTaken(rule, this.moveHistory, this.playerColor).length;
      return { label: 'RELICS FOUND', done: n, total: rule.goal.relics.length, slots: rule.goal.relics.length };
    }
    if (rule.goal && rule.goal.crossing) {
      const start = this._crossingStart();
      const total = Math.abs(start - BossRules.crossingRow(this.playerColor));
      const n = this.gameOver && this.playerWon() ? total : Math.min(total, BossRules.crossingProgress(this.board, this.playerColor, start));
      return { label: 'RANKS CROSSED', done: n, total, slots: total };
    }
    if (rule.goal && rule.goal.promote) {
      return { label: 'PAWN CROWNED', done: this.gameOver && this.playerWon() ? 1 : 0, total: 1, slots: 1 };
    }
    if (rule.minigameTrial && rule.minigameTrial.all) {
      // Joy Stick's lesson: every game, one by one.
      const n = MiniGameManager.getAllowedGames(miniGameManager.allGames).length;
      const t = this.trial || { played: ((store.getActiveSave() || {}).lesson || {}).at || 0 };
      return { label: 'GAMES LEARNED', done: t.played, total: n, slots: n };
    }
    if (rule.minigameTrial) {
      const t = this.trial || { played: 0, won: 0 };
      return { label: 'CHALLENGES WON', done: t.won, failed: t.played - t.won, total: rule.minigameTrial.need, slots: rule.minigameTrial.games };
    }
    return null;
  },

  // Puzzle drills and the minigame trial have no opponent moving pieces.
  _noOpponent() {
    const rule = this.bossRule;
    return !!(rule && (rule.puzzles || rule.minigameTrial));
  },

  // Called once the lesson cards are dismissed.
  _startTraining() {
    const rule = this.bossRule;
    this._fightStart = performance.now();
    if (rule && rule.minigameTrial && !this.gameOver) this._runTrial();
  },

  // Ends a trainer's test with a pass (player wins) or a fail.
  _endTraining(passed, status) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.gameStatus = status;
    this.gameResult = passed ? this.playerColor : this.aiColor;
    this.handleGameEnd();
    if (passed) {
      audioManager.playVictory();
      if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
        PixiGameScreen.spawnFireworks(Layout.cx, Layout.cy, [0x6fe3ff, 0xbff4ff, 0xffffff, 0x2a8fb8]);
      }
    } else {
      audioManager.playGameOver();
    }
    store.update({ gameStatus: this.gameStatus, gameOver: true, gameResult: this.gameResult });
  },

  // Sergeant Square's drill: after the player's move, a mate moves on to the
  // next puzzle (or passes); anything else resets the puzzle. Returns true when
  // it has taken over from the normal end-of-turn handling.
  _puzzleMoveMade(status) {
    const rule = this.bossRule;
    const index = this.bossState.puzzle || 0;
    const solved = status.status === 'checkmate' && status.winner === this.playerColor;
    if (solved && index >= rule.puzzles.length - 1) return false;   // last one: a normal win
    if (!solved) this.bossState.misses = (this.bossState.misses || 0) + 1;
    this.bossEvent = true;
    if (typeof PixiBossFX !== 'undefined') {
      PixiBossFX.banner(solved ? 'CHECKMATE!' : 'NOT MATE', solved ? '#7dea99' : '#ff6b6b');
    }
    if (solved) audioManager.playVictory(); else audioManager.playTileLock();
    setTimeout(() => {
      if (this.mode !== 'story' || !this.bossRule || !this.bossRule.puzzles) return;
      this._loadPuzzle(solved ? index + 1 : index);
      this.bossEvent = false;
    }, 1300);
    return true;
  },

  _loadPuzzle(index) {
    this.board = FEN.toBoard(this.bossRule.puzzles[index]);
    this.turn = this.board.turn;
    this.bossState = { ...this.bossState, puzzle: index };
    this.moveHistory = [];
    this.capturedPieces = { white: [], black: [] };
    this.lastMove = null;
    this.lockedTiles = [];
    this.selectedSquare = null;
    this.legalMoves = [];
    this.gameStatus = 'playing';
    this.boardSnapshots = [];
    this.saveSnapshot();
    store.update({ board: this.board, turn: this.turn, gameStatus: this.gameStatus });
  },

  // Joy Stick's trial: a run of practice minigames; win `need` of `games` to pass.
  _runTrial() {
    const spec = this.bossRule.minigameTrial;
    let games = MiniGameManager.getAllowedGames(miniGameManager.allGames).map(g => g.type);
    // Missions draw from a themed pool, or from the games you lose most.
    const pool = spec.weakest ? BossRules.weakestGames((store.get('stats') || {}).miniGameByType, 5) : spec.pool;
    if (pool && pool.length) {
      const picked = games.filter(g => pool.includes(g.name));
      if (picked.length) games = picked;
    }
    if (!games.length || typeof Mini3D === 'undefined' || !Mini3D.available()) {
      this._endTraining(true, 'trial');   // No WebGL: challenges cannot run, so the lesson is waived.
      return;
    }
    if (spec.all) { this._runLesson(games, spec); return; }
    const order = games.sort(() => Math.random() - 0.5);
    this.trial = { played: 0, won: 0, games: spec.games, need: spec.need };
    const next = () => {
      if (this.gameOver || !this.trial) return;
      const type = order[this.trial.played % order.length];
      miniGameManager.startPracticeMiniGame(type, (result) => {
        if (!this.trial) return;
        this.trial.played++;
        if (result === 'defended') this.trial.won++;
        const left = this.trial.games - this.trial.played;
        if (this.trial.won >= this.trial.need) this._endTraining(true, 'trial');
        else if (this.trial.won + left < this.trial.need) this._endTraining(false, 'trial');
        else setTimeout(next, 700);
      }, { failText: this.currentCharacter && this.currentCharacter.mission ? 'Keep going!' : 'Joy Stick: keep going!' });
    };
    setTimeout(next, 400);
  },

  // Joy Stick's lesson: every challenge once, in a fixed order. A lost game gets
  // `retries` more tries, then counts as learned anyway, so the lesson always ends
  // in a pass. Progress stays in the save (save.lesson), so leaving mid-way resumes.
  _runLesson(games, spec) {
    const saved = (store.getActiveSave() || {}).lesson || {};
    const at = Math.min(saved.at || 0, games.length - 1);
    this.trial = { played: at, won: at, firstTry: saved.firstTry || 0, games: games.length, need: games.length, lesson: true, tries: 0 };
    const keep = () => store.setActiveSave({ lesson: { at: this.trial.played, firstTry: this.trial.firstTry } });
    const next = () => {
      if (this.gameOver || !this.trial) return;
      const type = games[this.trial.played];
      if (typeof PixiBossFX !== 'undefined' && this.trial.tries === 0) {
        PixiBossFX.banner(`GAME ${this.trial.played + 1} / ${games.length}`, '#ff6fd8');
      }
      miniGameManager.startPracticeMiniGame(type, (result) => {
        if (!this.trial) return;
        const won = result === 'defended';
        if (won && this.trial.tries === 0) this.trial.firstTry++;
        if (won || this.trial.tries >= spec.retries) {
          this.trial.played++;
          this.trial.won = this.trial.played;
          this.trial.tries = 0;
        } else {
          this.trial.tries++;
        }
        if (this.trial.played >= games.length) {
          store.setActiveSave({ lesson: null });
          this._endTraining(true, 'trial');
          return;
        }
        keep();
        store.saveProgress();
        setTimeout(next, 700);
      }, { failText: this.trial.tries >= spec.retries ? 'Joy Stick: lesson learned, next game!' : `Joy Stick: try again! (${spec.retries - this.trial.tries} left)` });
    };
    setTimeout(next, 400);
  },

  REWIND_LINES: [
    'Not yet. Time bends for me.',
    'Again? The crystal remembers every move.',
    'You found the mate. Find it twice.',
  ],

  // Grandmaster X: checkmate him and time rewinds two full rounds (4 plies);
  // he gains a bishop or knight. Returns true if the rewind started.
  _tryBossRewind() {
    const rule = this.bossRule;
    if (!rule || !rule.rewinds || this.bossEvent) return false;
    if ((this.bossState.rewindsUsed || 0) >= rule.rewinds) return false;
    const used = this.bossState.rewindsUsed || 0;
    const len = this.moveHistory.length;
    const snapFor = n => {
      for (let i = this.boardSnapshots.length - 1; i >= 0; i--) {
        if (this.boardSnapshots[i].moveHistory.length === n) return i;
      }
      return -1;
    };
    // Never rewind past the previous rewind (that would take back his last gift).
    let target = Math.max(0, len - 4);
    while (target < len && (snapFor(target) === -1 ||
      ((this.boardSnapshots[snapFor(target)].bossState || {}).rewindsUsed || 0) < used)) target++;
    if (target >= len) return false;

    this.bossEvent = true;
    this.gameStatus = 'playing';
    this.selectedSquare = null;
    this.legalMoves = [];
    this._aiToken = (this._aiToken || 0) + 1;
    this.aiThinking = false;
    const theme = store.get('theme');
    const setPieces = () => {
      if (typeof PixiBoardRenderer !== 'undefined' && PixiBoardRenderer.container) {
        PixiBoardRenderer.setPieces(this.board, theme);
        PixiGameScreen._lastBoardKey = PixiGameScreen._getBoardKey(this.board);
      }
    };
    const steps = [];
    for (let n = len - 1; n >= target; n--) {
      const move = this.moveHistory[n];
      const moved = move && !move.defended;
      steps.push({
        from: moved ? move.from : move.to,
        to: move.to,
        apply: () => { this.restoreSnapshot(this.boardSnapshots[snapFor(n)]); setPieces(); },
      });
    }
    const gift = BossRules.rewindPiece(this._boardAt(snapFor(target)), this.aiColor);

    const finish = () => {
      if (this.mode !== 'story') return;
      this.boardSnapshots.length = snapFor(target) + 1;
      if (gift) {
        this.board.grid[gift.row][gift.col] = { type: gift.type, color: this.aiColor };
        this.board.positionHistory[this.board.positionHistory.length - 1] = this.board.posKey();
      }
      this.bossState = { rewindsUsed: used + 1 };
      this.updateCheckStateForTurn();
      this.gameStatus = this.board.inCheck ? 'check' : 'playing';
      setPieces();
      this.saveSnapshot();
      this.bossEvent = false;
      this.aiCooldown = 900;
      store.update({ board: this.board, turn: this.turn, gameStatus: this.gameStatus });
      const line = this.REWIND_LINES[(this.bossState.rewindsUsed - 1) % this.REWIND_LINES.length];
      if (this.currentCharacter) {
        this._showDialogueBubble(line, this.currentCharacter);
        this._setCharacterMood(this.currentCharacter, 'crack');   // his crystal has just cracked
      }
    };
    if (typeof PixiBossFX !== 'undefined' && PixiBossFX.initialized) {
      PixiBossFX.rewind(steps, gift, theme, finish);
    } else {
      steps.forEach(s => s.apply());
      finish();
    }
    return true;
  },

  // A Board rebuilt from a snapshot (used to plan the rewind gift ahead of time).
  _boardAt(index) {
    const snap = this.boardSnapshots[index];
    const b = Board.createEmpty();
    b.grid = snap.grid.map(row => row.map(cell => cell ? { ...cell } : null));
    b.castlingRights = JSON.parse(JSON.stringify(snap.castlingRights));
    b.enPassantTarget = snap.enPassantTarget ? { ...snap.enPassantTarget } : null;
    b.halfMoveClock = snap.halfMoveClock;
    b.fullMoveNumber = snap.fullMoveNumber || 1;
    return b;
  },
};

Object.assign(GameScreen, GameStoryTools);
