const GameScreen = {
  board: null,
  selectedSquare: null,
  legalMoves: [],
  turn: 'white',
  currentPlayer: null,
  opponentPlayer: null,
  gameStatus: 'playing',
  gameOver: false,
  gameResult: null,
  capturedPieces: { white: [], black: [] },
  moveHistory: [],
  boardSnapshots: [],
  reviewingAt: null,
  aiThinking: false,
  mode: '1v1',
  currentCharacter: null,
  characterLevel: 1,
  lastMove: null,
  lockedTiles: [],
  pendingRevertMove: null,
  captureCombo: 0,
  defensiveMiniGames: { white: 2, black: 2 },
  captureRewardProgress: { white: 0, black: 0 },
  comboDisplayTimer: 0,
  promotionPending: null,
  promotionHover: null,
  hoveredSquare: null,
  gameOverTimer: 0,
  hoveredGameOverBtn: null,
  aiColor: 'black',
  gameplayMode: true,

  _lastInitData: null,

  init(data) {
    // Returning from Settings opened via the pause menu: keep the game as it was.
    if (data && data.resume && this.board && !this.gameOver) {
      this._resume();
      return;
    }
    this._lastInitData = data;
    this._aiToken = (this._aiToken || 0) + 1;
    this.board = new Board();
    this.selectedSquare = null;
    this.legalMoves = [];
    this.turn = 'white';
    this.gameStatus = 'playing';
    this.gameOver = false;
    this.gameResult = null;
    this.capturedPieces = { white: [], black: [] };
    this.moveHistory = [];
    this.boardSnapshots = [];
    this.reviewingAt = null;
    this.aiThinking = false;
    this.aiCooldown = 0;
    this.promotionPending = null;
    this.promotionHover = null;
    this.hoveredSquare = null;
    this.gameOverTimer = 0;
    this.hoveredGameOverBtn = null;
    this.lastMove = null;
    this.drawReason = null;
    this.lockedTiles = [];
    this.pendingRevertMove = null;
    this.captureCombo = 0;
    this.defensiveMiniGames = { white: 2, black: 2 };
    this.captureRewardProgress = { white: 0, black: 0 };
    this.comboDisplayTimer = 0;
    const canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.style.pointerEvents = 'auto';

    this.mode = store.get('mode');
    this.isAIMode = this.mode === 'story' || this.mode === 'classic' || this.mode === 'custom';
    // Every mode sets its own options so nothing leaks over from the last mode played.
    if (this.mode === 'story') {
      store.set('p1IsWhite', true);
      store.set('miniGamesEnabled', (store.get('settings') || {}).miniGamesEnabled !== false);
    }
    const p1IsWhite = store.get('p1IsWhite') !== false;
    this.playerColor = p1IsWhite ? 'white' : 'black';
    this.aiColor = p1IsWhite ? 'black' : 'white';
    this.flipped = this.isAIMode && this.playerColor === 'black';
    this.gameplayMode = this.mode === 'custom' ? store.get('customGameplayMode') !== false : true;
    if (this.mode === 'story') {
      this.currentCharacter = store.get('selectedCharacter');
      if (typeof this.currentCharacter === 'string') {
        this.currentCharacter = CharacterManager.getCharacter(this.currentCharacter);
      }
      const charLevel = this.currentCharacter ? this.currentCharacter.level : 1;
      const save = store.getActiveSave();
      const tier = save ? save.difficultyTier : 'beginner';
      this.characterLevel = DifficultyScaler.getAiLevel(tier, charLevel);
    } else if (this.mode === 'classic') {
      this.currentCharacter = null;
      this.characterLevel = store.get('classicDifficulty') || 5;
    } else if (this.mode === 'custom') {
      this.currentCharacter = null;
      this.characterLevel = store.get('customDifficulty') || 5;
    } else {
      this.currentCharacter = null;
      this.characterLevel = 0;
    }

    store.update({
      board: this.board,
      turn: 'white',
      gameStatus: 'playing',
      gameOver: false,
      gameResult: null,
      selectedSquare: null,
      legalMoves: [],
      animating: false,
    });

    audioManager.init();
    if (typeof audioManager.setSuspense === 'function') {
      audioManager.setSuspense(false);
    }
    audioManager.startMusic();

    this._initVisuals();

    this._dialogueBubble = null;
    this._initDialogue();
    this.saveSnapshot();

    // First game with Chess 2.0 rules: explain Defenses before anyone moves.
    const settings = store.get('settings') || {};
    if (this.gameplayMode && store.get('miniGamesEnabled') && !settings.seenRulesIntro) {
      this._showRulesIntro();
    }
  },

  _showRulesIntro() {
    this.introVisible = true;
    const cols = ThemeManager.getCurrentColors();
    const c = new PIXI.Container();
    c.zIndex = 950;
    const shade = new PIXI.Graphics().rect(0, 0, Layout.W, Layout.H).fill({ color: 0x000000, alpha: 0.66 });
    c.addChild(shade);
    const w = Math.min(660, Layout.W - 60);
    const h = 440;
    const x = Math.round(Layout.cx - w / 2);
    const y = Math.round(Layout.cy - h / 2);
    PixiPremiumScene.panel(c, x, y, w, h, { alpha: 0.96, accentAlpha: 0.9 });
    const title = PixiPremiumScene.text('CHESS 2.0 RULES', { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 30, fontWeight: 'bold', fill: cols.accent });
    title.anchor.set(0.5, 0);
    title.x = Layout.cx;
    title.y = y + 34;
    c.addChild(title);
    const paragraphs = [
      'Normal chess, with one twist.',
      'When one of your pieces is about to be captured, you can spend a Defense to play a quick mini-game. Win it and the capture is cancelled: your opponent loses their turn.',
      'You start with 2 Defenses and earn 1 more for every 2 captures. A capture that gets a king out of check cannot be blocked.',
    ];
    let ty = y + 96;
    for (const para of paragraphs) {
      const t = PixiPremiumScene.text(para, { fontSize: 19, fill: cols.text, lineHeight: 27, wordWrap: true, wordWrapWidth: w - 76 });
      t.x = x + 38;
      t.y = ty;
      c.addChild(t);
      ty += t.height + 16;
    }
    const bw = 200, bh = 52;
    const bx = Math.round(Layout.cx - bw / 2), by = y + h - bh - 26;
    PixiPremiumScene.button(c, bx, by, bw, bh, "Let's play", () => this._dismissRulesIntro(), { primary: true, fontSize: 20 });
    this._introButton = { x: bx, y: by, w: bw, h: Layout.isPortrait ? Math.max(bh, 68) : bh };
    PixiApp.stage.addChild(c);
    PixiApp.stage.sortableChildren = true;
    this._introContainer = c;
  },

  _dismissRulesIntro() {
    if (!this.introVisible) return;
    this.introVisible = false;
    if (this._introContainer) { this._introContainer.destroy({ children: true }); this._introContainer = null; }
    store.set('settings', { ...(store.get('settings') || {}), seenRulesIntro: true });
    store.saveProgress();
    this.aiCooldown = 400;
  },

  _initVisuals() {
    if (typeof PixiGameScreen !== 'undefined') {
      PixiGameScreen.init();
      PixiBoardRenderer.flipped = !!this.flipped;
      PixiGameScreen.renderBoard(this.board, store.get('theme') || 'space');
    }
    if (typeof PixiGameHud !== 'undefined') {
      PixiGameHud.init();
    }
    if (typeof PixiGameOverOverlay !== 'undefined') {
      PixiGameOverOverlay.init(this);
    }
  },

  _initDialogue() {
    if (this.mode === 'story' && this.currentCharacter && typeof DialogueManager !== 'undefined') {
      DialogueManager.init(this.currentCharacter, (text, character) => {
        this._showDialogueBubble(text, character);
      });
    }
  },

  _resume() {
    this._aiToken = (this._aiToken || 0) + 1;
    this.aiThinking = false;
    this.aiCooldown = 400;
    this.selectedSquare = null;
    this.legalMoves = [];
    const canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.style.pointerEvents = 'auto';
    audioManager.init();
    audioManager.startMusic();
    this._initVisuals();
    this._dialogueBubble = null;
    this._initDialogue();
  },

  destroy() {
    this._aiToken = (this._aiToken || 0) + 1;
    this.introVisible = false;
    if (this._introContainer) { this._introContainer.destroy({ children: true }); this._introContainer = null; }
    if (this._aiTimeout) {
      clearTimeout(this._aiTimeout);
      this._aiTimeout = null;
    }
    audioManager.stopMusic();
    if (typeof audioManager.setSuspense === 'function') {
      audioManager.setSuspense(false);
    }
    if (typeof PixiGameScreen !== 'undefined') {
      PixiGameScreen.destroy();
    }
    if (typeof PixiGameHud !== 'undefined') {
      PixiGameHud.destroy();
    }
    if (typeof PixiGameOverOverlay !== 'undefined') {
      PixiGameOverOverlay.destroy();
    }
    if (typeof DialogueManager !== 'undefined') {
      DialogueManager.destroy();
    }
    if (this._dialogueBubble) {
      this._dialogueBubble.dismiss();
      this._dialogueBubble = null;
    }
    const canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.style.pointerEvents = 'auto';
  },

  rebuildVisuals() {
    // Tear down only the visual layer (PixiJS components), preserve all game state
    if (typeof PixiGameScreen !== 'undefined') {
      PixiGameScreen.destroy();
    }
    if (typeof PixiGameHud !== 'undefined') {
      PixiGameHud.destroy();
    }
    if (typeof PixiGameOverOverlay !== 'undefined') {
      PixiGameOverOverlay.destroy();
    }

    this._initVisuals();
  },

  saveSnapshot() {
    const snap = {
      grid: this.board.grid.map(row => row.map(cell => cell ? { type: cell.type, color: cell.color } : null)),
      turn: this.turn,
      castlingRights: JSON.parse(JSON.stringify(this.board.castlingRights)),
      enPassantTarget: this.board.enPassantTarget ? { ...this.board.enPassantTarget } : null,
      halfMoveClock: this.board.halfMoveClock,
      fullMoveNumber: this.board.fullMoveNumber,
      positionHistory: [...this.board.positionHistory],
      moveHistory: this.moveHistory.map(m => ({ ...m, from: { ...m.from }, to: { ...m.to }, piece: m.piece ? { ...m.piece } : null, captured: m.captured ? { ...m.captured } : null })),
      capturedPieces: JSON.parse(JSON.stringify(this.capturedPieces)),
      gameStatus: this.gameStatus,
      gameOver: this.gameOver,
      gameResult: this.gameResult,
      selectedSquare: this.selectedSquare ? { ...this.selectedSquare } : null,
      legalMoves: this.legalMoves.map(m => ({ ...m })),
      lastMove: this.lastMove ? { from: { ...this.lastMove.from }, to: { ...this.lastMove.to } } : null,
      lockedTiles: this.lockedTiles.map(t => ({ ...t })),
      defensiveMiniGames: { ...this.defensiveMiniGames },
      captureRewardProgress: { ...this.captureRewardProgress },
      gameplayMode: this.gameplayMode,
      inCheck: this.board.inCheck,
    };
    // Keep only last 200 snapshots
    if (this.boardSnapshots.length > 200) this.boardSnapshots.shift();
    this.boardSnapshots.push(snap);
  },

  restoreSnapshot(snap) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        this.board.grid[r][c] = snap.grid[r][c];
      }
    }
    this.board.castlingRights = snap.castlingRights;
    this.board.enPassantTarget = snap.enPassantTarget;
    this.board.halfMoveClock = snap.halfMoveClock;
    this.board.fullMoveNumber = snap.fullMoveNumber || this.board.fullMoveNumber;
    if (snap.positionHistory) this.board.positionHistory = [...snap.positionHistory];
    this.board.inCheck = snap.inCheck;
    this.board.turn = snap.turn;
    this.turn = snap.turn;
    this.moveHistory = snap.moveHistory.map(m => ({ ...m }));
    this.capturedPieces = JSON.parse(JSON.stringify(snap.capturedPieces));
    this.gameStatus = snap.gameStatus;
    this.gameOver = snap.gameOver;
    this.gameResult = snap.gameResult;
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = snap.lastMove;
    this.lockedTiles = snap.lockedTiles.map(t => ({ ...t }));
    this.defensiveMiniGames = { ...(snap.defensiveMiniGames || { white: 2, black: 2 }) };
    this.captureRewardProgress = { ...(snap.captureRewardProgress || { white: 0, black: 0 }) };
    this.gameplayMode = snap.gameplayMode !== false;
  },

  goToMove(index) {
    if (index < 0 || index >= this.boardSnapshots.length) return;
    this.restoreSnapshot(this.boardSnapshots[index]);
    this.reviewingAt = index;
  },

  goToLive() {
    if (this.reviewingAt === null) return;
    const last = this.boardSnapshots[this.boardSnapshots.length - 1];
    if (last) {
      this.restoreSnapshot(last);
      this.aiThinking = false;
    }
    this.reviewingAt = null;
  },

  stepBack() {
    if (this.boardSnapshots.length < 2 || this.reviewingAt === 0) return;
    const idx = this.reviewingAt === null ? this.boardSnapshots.length - 2 : this.reviewingAt - 1;
    this.goToMove(Math.max(0, idx));
  },

  stepForward() {
    if (this.reviewingAt === null) return;
    if (this.reviewingAt < this.boardSnapshots.length - 2) this.goToMove(this.reviewingAt + 1);
    else this.goToLive();
  },

  // Snapshot to return to on Undo: against the AI, the last position where it
  // was the player's turn; in local 1v1, simply the previous position.
  _undoTargetIndex() {
    const last = this.boardSnapshots.length - 1;
    if (last < 1) return -1;
    if (!this.isAIMode) return last - 1;
    for (let i = last - 1; i >= 0; i--) {
      if (this.boardSnapshots[i].turn === this.playerColor) return i;
    }
    return -1;
  },

  canUndo() {
    return !this.gameOver && this.reviewingAt === null && !this.promotionPending &&
      !store.get('miniGameActive') && this._undoTargetIndex() !== -1;
  },

  undo() {
    if (!this.canUndo()) return;
    const idx = this._undoTargetIndex();
    this._aiToken = (this._aiToken || 0) + 1;
    if (this._aiTimeout) { clearTimeout(this._aiTimeout); this._aiTimeout = null; }
    this.aiThinking = false;
    this.aiCooldown = 400;
    this.restoreSnapshot(this.boardSnapshots[idx]);
    this.boardSnapshots.length = idx + 1;
    this.selectedSquare = null;
    this.legalMoves = [];
    this.pendingRevertMove = null;
    store.update({ board: this.board, turn: this.turn, gameStatus: this.gameStatus });
    audioManager.playSelect();
  },

  flipBoard() {
    this.flipped = !this.flipped;
    if (typeof PixiBoardRenderer !== 'undefined') PixiBoardRenderer.flipped = this.flipped;
  },

  // The colour shown at the bottom of the board / on the left panel.
  get bottomColor() {
    return this.flipped ? 'black' : 'white';
  },

  getPlayerName(color) {
    if (this.isAIMode) {
      if (color === this.playerColor) return 'You';
      if (this.currentCharacter) return this.currentCharacter.name;
      return 'Computer';
    }
    const name = color === 'white' ? store.get('whitePlayer') : store.get('blackPlayer');
    return name || (color === 'white' ? 'White' : 'Black');
  },

  playerWon() {
    return this.gameResult === this.playerColor;
  },

  resultTitle() {
    if (!this.gameResult || this.gameResult === 'draw') return 'Draw!';
    if (this.isAIMode) return this.playerWon() ? 'You Win!' : 'You Lose';
    return this.getPlayerName(this.gameResult) + ' Wins!';
  },

  resultReason() {
    switch (this.gameStatus) {
      case 'checkmate': return 'by Checkmate';
      case 'stalemate': return 'by Stalemate';
      case 'draw': return this.drawReason || 'by Draw';
      case 'resigned': return 'by Resignation';
      default: return 'Game Over';
    }
  },

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;
    if (typeof audioManager !== 'undefined' && typeof audioManager.setSuspense === 'function') {
      audioManager.setSuspense(this.gameStatus === 'check' && !this.gameOver);
    }

    UIHelpers.drawDitheredRect(ctx, 0, 0, Layout.W, 3, cols.accent, '33');

    if (this.aiCooldown > 0) {
      this.aiCooldown -= dt * 1000;
      if (this.aiCooldown < 0) this.aiCooldown = 0;
    }
    const isLive = this.reviewingAt === null && !this.introVisible;
    if (isLive && this.isAIMode && this.turn === this.aiColor && !this.aiThinking && !this.gameOver && this.aiCooldown <= 0) {
      this.doAIMove();
    }

    // Pixi handles board, pieces, backgrounds, particles
    if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
      const filteredMoves = this.legalMoves.filter(m =>
        !this.lockedTiles.some(t => t.row === m.to.row && t.col === m.to.col)
      );
      const inCheck = this.gameStatus === 'check' || this.gameStatus === 'checkmate';
      PixiGameScreen.update(dt, {
        board: this.board,
        selectedSquare: this.selectedSquare,
        legalMoves: filteredMoves,
        lastMove: this.lastMove,
        checkSquare: inCheck ? this.board.findKing(this.turn) : null,
      });
    }

    if (typeof PixiGameHud !== 'undefined') {
      PixiGameHud.update(this);
    }

    if (typeof PixiGameOverOverlay !== 'undefined') {
      PixiGameOverOverlay.update(this);
    }

    const canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.style.pointerEvents = 'auto';

    // AI thinking indicator
    if (this.aiThinking) {
      UIHelpers.drawIcon(ctx, Layout.cx - 60, 20, 'hourglass', 10, cols, { color: cols.text + '88' });
      ctx.fillStyle = cols.text + '88';
      ctx.font = '14px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      const dots = '.'.repeat(Math.floor(Date.now() / 500) % 4);
      ctx.fillText('Opponent is thinking' + dots, Layout.cx, 30);
    }

    // Promotion dialog
    if (this.promotionPending) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, Layout.W, Layout.H);

      const sqSize = 80;
      const types = ['queen', 'rook', 'bishop', 'knight'];
      const totalW = types.length * sqSize + (types.length - 1) * 10;
      const startX = Layout.cx - totalW / 2;
      const startY = Layout.cy - sqSize / 2;

      UIHelpers.drawPanel(ctx, startX - 20, startY - 40, totalW + 40, sqSize + 60, cols, { accentTop: true });

      ctx.fillStyle = cols.text;
      ctx.font = 'bold 18px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PROMOTE TO:', Layout.cx, startY - 10);

      for (let i = 0; i < types.length; i++) {
        const bx = startX + i * (sqSize + 10);
        const isHovered = this.promotionHover === types[i];
        ctx.fillStyle = isHovered ? cols.highlight + '40' : cols.lightSquare;
        ctx.fillRect(bx, startY, sqSize, sqSize);
        ctx.strokeStyle = isHovered ? cols.highlight : cols.text + '44';
        ctx.lineWidth = isHovered ? 3 : 1;
        ctx.strokeRect(bx, startY, sqSize, sqSize);
        const padding = Math.max(2, Math.floor(sqSize * 0.06));
        PieceRenderer.drawPiece(ctx, types[i], this.turn, theme, bx + padding, startY + padding, sqSize - padding * 2);
      }
    }

    // Combo display
    if (this.comboDisplayTimer > 0) {
      this.comboDisplayTimer -= dt;
      if (this.captureCombo > 1) {
        const alpha = Math.min(1, this.comboDisplayTimer);
        const bounce = Math.sin(this.comboDisplayTimer * 10) * 5;
        ctx.fillStyle = `rgba(255,200,50,${alpha})`;
        ctx.font = 'bold 24px "Pixelify Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.captureCombo + 'x COMBO!', Layout.cx, 80 + bounce);
      }
    }
  },

  getGameOverButtons() {
    if (typeof PixiGameOverOverlay !== 'undefined' && PixiGameOverOverlay.buttonRects) {
      return PixiGameOverOverlay.buttonRects;
    }
    return [];
  },

  _hudActionAt(x, y) {
    const rects = (typeof PixiGameHud !== 'undefined' && PixiGameHud.hitRects) || [];
    const hit = rects.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    return hit ? hit.action : null;
  },

  handleHudAction(action) {
    switch (action) {
      case 'back': this.stepBack(); break;
      case 'forward': this.stepForward(); break;
      case 'live': this.goToLive(); break;
      case 'undo': this.undo(); break;
      case 'flip': this.flipBoard(); break;
      case 'pause': PauseMenu.show(); break;
    }
  },

  handleClick(x, y) {
    if (this.introVisible) {
      const b = this._introButton;
      if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) this._dismissRulesIntro();
      return;
    }

    // Promotion dialog
    if (this.promotionPending) {
      const sqSize = 80;
      const types = ['queen', 'rook', 'bishop', 'knight'];
      const totalW = types.length * sqSize + (types.length - 1) * 10;
      const startX = Layout.cx - totalW / 2;
      const startY = Layout.cy - sqSize / 2;

      for (let i = 0; i < types.length; i++) {
        const bx = startX + i * (sqSize + 10);
        if (x >= bx && x <= bx + sqSize && y >= startY && y <= startY + sqSize) {
          const move = this.promotionPending.moves.find(m => m.promotion === types[i]);
          if (move) {
            this.promotionPending = null;
            this.promotionHover = null;
            this.executePlayerMove(move);
            audioManager.playPromotion();
          }
          return;
        }
      }
      return;
    }

    // Game over buttons
    if (this.gameOver) {
      const buttons = this.getGameOverButtons();
      for (const btn of buttons) {
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          this.handleGameOverAction(btn.action);
          return;
        }
      }
      return;
    }

    const hudAction = this._hudActionAt(x, y);
    if (hudAction) {
      if (typeof audioManager.playButton === 'function') audioManager.playButton();
      this.handleHudAction(hudAction);
      return;
    }

    // Don't allow moves while reviewing
    if (this.reviewingAt !== null) return;
    if (this.aiThinking) return;

    let boardPos = null;
    if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
      boardPos = PixiGameScreen.getSquareAt(x, y);
    }
    if (!boardPos) return;
    const row = boardPos.row;
    const col = boardPos.col;

    if (this.lockedTiles.some(t => t.row === row && t.col === col)) {
      audioManager.playTileLock();
      return;
    }

    const clicked = this.board.grid[row][col];

    if (this.selectedSquare) {
      const selectedPiece = this.board.grid[this.selectedSquare.row][this.selectedSquare.col];
      const isPromotion = selectedPiece && selectedPiece.type === 'pawn' && (row === 0 || row === 7);

      if (isPromotion) {
        const promoMoves = this.legalMoves.filter(m =>
          m.to.row === row && m.to.col === col && m.promotion
        );
        if (promoMoves.length > 0) {
          this.promotionPending = { moves: promoMoves, toSquare: { row, col } };
          audioManager.playSelect();
          return;
        }
      }

      const move = this.legalMoves.find(m =>
        m.to.row === row && m.to.col === col && !m.promotion
      );
      if (move) {
        this.executePlayerMove(move);
        return;
      }
    }

    if (clicked && clicked.color === this.turn) {
      this.selectedSquare = { row, col };
      audioManager.playSelect();
      let moves = GameRules.getLegalMoves(this.board, this.turn);
      moves = moves.filter(m => !this.lockedTiles.some(t => t.row === m.to.row && t.col === m.to.col));
      this.legalMoves = moves.filter(m => m.from.row === row && m.from.col === col);
    } else {
      this.selectedSquare = null;
      this.legalMoves = [];
    }
  },

  handleMouseMove(x, y) {
    const canvas = document.getElementById('gameCanvas');

    if (this.promotionPending) {
      const sqSize = 80;
      const types = ['queen', 'rook', 'bishop', 'knight'];
      const totalW = types.length * sqSize + (types.length - 1) * 10;
      const startX = Layout.cx - totalW / 2;
      const startY = Layout.cy - sqSize / 2;
      let hovered = null;
      for (let i = 0; i < types.length; i++) {
        const bx = startX + i * (sqSize + 10);
        if (x >= bx && x <= bx + sqSize && y >= startY && y <= startY + sqSize) {
          hovered = types[i];
          break;
        }
      }
      this.promotionHover = hovered;
      canvas.style.cursor = hovered ? 'pointer' : 'default';
      return;
    }

    this.hoveredSquare = null;

    if (this.gameOver) {
      this.hoveredGameOverBtn = null;
      const buttons = this.getGameOverButtons();
      for (const btn of buttons) {
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          this.hoveredGameOverBtn = btn.action;
          canvas.style.cursor = 'pointer';
          return;
        }
      }
      canvas.style.cursor = 'default';
      return;
    }

    if (this._hudActionAt(x, y)) {
      canvas.style.cursor = 'pointer';
      return;
    }

    let boardPos = null;
    if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
      boardPos = PixiGameScreen.getSquareAt(x, y);
    }
    if (boardPos && !this.aiThinking && this.reviewingAt === null) {
      const piece = this.board.grid[boardPos.row][boardPos.col];
      const isLegalTarget = this.legalMoves.some(m => m.to.row === boardPos.row && m.to.col === boardPos.col);
      const isOwnPiece = piece && piece.color === this.turn;
      canvas.style.cursor = (isLegalTarget || isOwnPiece) ? 'pointer' : 'default';
    } else {
      canvas.style.cursor = 'default';
    }
  },

  handleKeyDown(e) {
    if (this.introVisible) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') this._dismissRulesIntro();
      return;
    }
    if (e.key === 'Escape') {
      if (this.gameOver) {
        switchScreen('home');
      } else {
        PauseMenu.show();
      }
    }
    if (PauseMenu.visible) return;
    if (e.key === 'ArrowLeft') this.stepBack();
    if (e.key === 'ArrowRight') this.stepForward();
    if (e.key === 'f' || e.key === 'F') this.flipBoard();
    if (e.key === 'u' || e.key === 'U' || ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z'))) {
      e.preventDefault();
      this.undo();
    }
  },

  executePlayerMove(move) {
    this.playMove(move, false);
  },

  // Plays a move for either side, giving the defender a chance to block a
  // capture with a minigame first. Returns true if a minigame was started.
  playMove(move, isAIMove) {
    const piece = this.board.grid[move.from.row][move.from.col];
    const captured = CaptureRules.capturedPiece(this.board, move);
    move.san = Notation.toSAN(this.board, move);

    if (captured && this.gameplayMode && this.tryStartDefensiveMiniGame(move, piece, captured, isAIMove)) {
      return true;
    }

    // Legacy "locked tile" rules (Custom Game with Chess 2.0 rules off).
    if (captured && !this.gameplayMode && Math.random() < 0.3 && MiniGameManager.shouldTriggerMiniGame() &&
        CaptureRules.isChallengeable(this.board, move)) {
      const token = this._aiToken;
      this.pendingRevertMove = { move, piece, captured };
      const started = miniGameManager.startMiniGame(
        piece, captured, move.to,
        isAIMove,
        (winner) => {
          if (token !== this._aiToken) return;
          if (winner === 'attacker') {
            this.executeCaptureMove(move, piece, captured);
          } else {
            this.revertMoveAndLockTile(move);
          }
          if (isAIMove) {
            this.aiThinking = false;
            this.aiCooldown = 600;
          }
        },
        this.characterLevel
      );
      if (started) return true;
    }

    if (!captured) this.captureCombo = 0;
    this.executeCaptureMove(move, piece, captured);
    return false;
  },

  tryStartDefensiveMiniGame(move, piece, captured, isAIMove) {
    if (!captured || !MiniGameManager.shouldTriggerMiniGame()) return false;
    if (!CaptureRules.canDefend(this.board, move, this.defensiveMiniGames[captured.color])) return false;

    const token = this._aiToken;
    const challengePlayerIsAI = this.isAIMode && captured.color === this.aiColor;
    const started = miniGameManager.startDefensiveMiniGame({
      attacker: piece,
      defender: captured,
      boardPos: move.to,
      challengePlayerIsAI,
      botSkillLevel: this.characterLevel,
    }, (result) => {
      if (token !== this._aiToken) return;
      if (result === 'defended') {
        this.cancelCaptureAndPassTurn(move, piece, captured);
      } else {
        this.executeCaptureMove(move, piece, captured);
      }
      if (isAIMove) {
        this.aiThinking = false;
        this.aiCooldown = 600;
      }
    });

    if (!started) return false;
    this.defensiveMiniGames[captured.color] = Math.max(0, (this.defensiveMiniGames[captured.color] || 0) - 1);
    this.pendingRevertMove = { move, piece, captured };
    store.update({ board: this.board });
    return true;
  },

  cancelCaptureAndPassTurn(move, piece, captured) {
    move.piece = piece;
    move.captured = captured;
    move.defended = true;
    this.lastMove = { from: move.from, to: move.to };
    this.moveHistory.push(move);
    this.lastMoveWasCapture = false;
    this.captureCombo = 0;
    this.comboDisplayTimer = 0;
    const previousTurn = this.turn;
    this.turn = this.turn === 'white' ? 'black' : 'white';
    this.board.turn = this.turn;
    this.board.halfMoveClock++;
    this.board.enPassantTarget = null;
    if (previousTurn === 'black') this.board.fullMoveNumber++;
    this.board.positionHistory.push(this.board.posKey());
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lockedTiles = [];
    this.pendingRevertMove = null;
    this.updateCheckStateForTurn();
    this.finishTurnStatus();
    this.saveSnapshot();
    audioManager.playTileLock();
  },

  updateCheckStateForTurn() {
    const king = this.board.findKing(this.turn);
    const attackerColor = this.turn === 'white' ? 'black' : 'white';
    this.board.inCheck = king ? MoveGen.isSquareAttacked(this.board, king.row, king.col, attackerColor) : false;
  },

  executeCaptureMove(move, piece, captured) {
    if (captured) {
      const capturingColor = this.turn;
      this.capturedPieces[capturingColor].push(captured);
      this.captureCombo++;
      if (this.gameplayMode) {
        this.captureRewardProgress[capturingColor] = (this.captureRewardProgress[capturingColor] || 0) + 1;
        if (this.captureRewardProgress[capturingColor] >= 2) {
          this.defensiveMiniGames[capturingColor] = (this.defensiveMiniGames[capturingColor] || 0) + 1;
          this.captureRewardProgress[capturingColor] = 0;
        }
      }
      this.comboDisplayTimer = 2;
      this.lastMoveWasCapture = true;
      const stats = store.get('stats');
      stats.captures++;
      store.set('stats', stats);

      const theme = ThemeManager.getTheme(store.get('theme'));
      if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
        const { x: cx, y: cy } = PixiGameScreen.squareCenter(move.to.row, move.to.col);
        const isMajor = captured.type === 'rook' || captured.type === 'queen';
        PixiGameScreen.spawnCaptureParticles(cx, cy, PixiColorUtil.hexToNum(theme.colors.accent), captured.type);
        PixiGameScreen.shakeScreen(isMajor ? 14 : 8);
        PixiGameScreen.flashScreen(isMajor ? 0xffeeaa : 0xffffff);
      }

      audioManager.playCapture();
      audioManager.playScreenShake();

      if (this.mode === 'story' && typeof DialogueManager !== 'undefined') {
        DialogueManager.onCapture(this.turn, captured, this.aiColor, this.board);
      }
    } else {
      audioManager.playMove(piece ? piece.type : null);
      if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
        const theme = ThemeManager.getTheme(store.get('theme'));
        const { x: cx, y: cy } = PixiGameScreen.squareCenter(move.to.row, move.to.col);
        PixiGameScreen.spawnMoveParticles(cx, cy, PixiColorUtil.hexToNum(theme.colors.accent));
      }
    }

    move.piece = piece;
    move.captured = captured;
    MoveExecutor.executeMove(this.board, move, this.turn);
    this.afterMove(move);
  },

  revertMoveAndLockTile(move) {
    this.lockedTiles.push({ row: move.to.row, col: move.to.col });
    audioManager.playTileLock();
    this.selectedSquare = null;
    this.legalMoves = [];
    store.update({ board: this.board });

    // After locking a square, check if the current player is now in checkmate/stalemate
    this.checkForLockedTileGameEnd();
  },

  checkForLockedTileGameEnd() {
    const legalMoves = GameRules.getLegalMoves(this.board, this.turn);
    const availableMoves = legalMoves.filter(m =>
      !this.lockedTiles.some(t => t.row === m.to.row && t.col === m.to.col)
    );

    if (availableMoves.length === 0) {
      // No legal moves that avoid locked tiles
      if (this.board.inCheck) {
        // In check with no escape = checkmate
        this.gameOver = true;
        this.gameStatus = 'checkmate';
        this.gameResult = this.turn === 'white' ? 'black' : 'white';
        this.handleGameEnd();
        audioManager.playVictory();
      } else {
        // Not in check with no legal moves = stalemate
        this.gameOver = true;
        this.gameStatus = 'stalemate';
        this.gameResult = 'draw';
        this.handleGameEnd();
        audioManager.playGameOver();
      }
    }
  },

  finishTurnStatus() {
    const status = GameRules.getGameStatus(this.board, this.turn);
    this.gameStatus = status.status;

    if (status.status === 'checkmate' || status.status === 'stalemate') {
      this.gameOver = true;
      this.gameResult = status.winner || 'draw';
      this.handleGameEnd();
      if (this.gameResult !== 'draw') {
        audioManager.playVictory();
        if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
          const colors = this.gameResult === 'white'
            ? [0xffd700, 0xff4444, 0xffffff, 0xffaa00]
            : [0x8844ff, 0x4444ff, 0x44aaff, 0xaa44ff];
          PixiGameScreen.spawnFireworks(Layout.cx, Layout.cy, colors);
        }
      } else {
        audioManager.playGameOver();
      }
    } else if (status.status === 'draw') {
      this.gameOver = true;
      this.gameResult = 'draw';
      this.drawReason = this._drawReason();
      this.handleGameEnd();
      audioManager.playGameOver();
    }

    if (this.gameStatus === 'check') {
      audioManager.playCheck();
      if (this.mode === 'story' && typeof DialogueManager !== 'undefined') {
        DialogueManager.onCheck(this.turn, this.aiColor, this.board);
      }
    }
    if (typeof audioManager.setSuspense === 'function') {
      audioManager.setSuspense(this.gameStatus === 'check' && !this.gameOver);
    }

    store.update({
      board: this.board,
      turn: this.turn,
      gameStatus: this.gameStatus,
      gameOver: this.gameOver,
      gameResult: this.gameResult,
    });
  },

  _drawReason() {
    if (this.board.halfMoveClock >= 100) return 'by the 50-move rule';
    const key = this.board.posKey();
    if (this.board.positionHistory.filter(k => k === key).length >= 3) return 'by repetition';
    return 'by insufficient material';
  },

  afterMove(move) {
    this.lastMove = { from: move.from, to: move.to };
    this.moveHistory.push(move);
    this.turn = this.turn === 'white' ? 'black' : 'white';
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lockedTiles = [];
    this.pendingRevertMove = null;
    this.finishTurnStatus();
    this.saveSnapshot();

    if (this.mode === 'story' && typeof DialogueManager !== 'undefined') {
      if (this.moveHistory.length === 1) {
        DialogueManager.onGameStart();
      }
      DialogueManager.onMoveComplete(this.moveHistory.length, this.board, this.aiColor);
    }
  },

  doAIMove() {
    this.aiThinking = true;
    // Any undo, restart, or screen change bumps the token so a late AI answer is dropped.
    const token = this._aiToken = (this._aiToken || 0) + 1;

    if (this.mode === 'story' && typeof DialogueManager !== 'undefined') {
      DialogueManager.onAIThinkStart(this.board, this.aiColor);
    }

    // Safety net: if the engine never answers, play a random legal move.
    const safetyTimer = setTimeout(() => {
      if (token !== this._aiToken) return;
      console.error('AI safety timeout triggered — playing a fallback move');
      this._aiToken++;
      this._playAIMove(null);
    }, 12000);

    this._aiTimeout = setTimeout(async () => {
      let move = null;
      try {
        const legalMoves = this._aiLegalMoves();
        if (!this.gameOver && legalMoves.length > 0) {
          move = await AIController.getMoveAsync(this.board, this.aiColor, this.characterLevel, legalMoves);
        }
      } catch (e) {
        console.error('AIController.getMoveAsync error:', e);
      }
      if (token !== this._aiToken) return;
      clearTimeout(safetyTimer);
      this._playAIMove(move);
    }, 500 + Math.random() * 700);
  },

  _aiLegalMoves() {
    return GameRules.getLegalMoves(this.board, this.aiColor).filter(m =>
      !this.lockedTiles.some(t => t.row === m.to.row && t.col === m.to.col));
  },

  _playAIMove(move) {
    try {
      if (this.gameOver) { this.aiThinking = false; return; }
      const legalMoves = this._aiLegalMoves();
      if (legalMoves.length === 0) {
        this.aiThinking = false;
        // Only reachable with locked tiles; normal mates are caught after the previous move.
        this.gameOver = true;
        this.gameStatus = this.board.inCheck ? 'checkmate' : 'stalemate';
        this.gameResult = this.board.inCheck ? this.playerColor : 'draw';
        this.handleGameEnd();
        return;
      }
      // Only trust the engine's move if it is actually legal right now.
      const chosen = move && legalMoves.find(m =>
        m.from.row === move.from.row && m.from.col === move.from.col &&
        m.to.row === move.to.row && m.to.col === move.to.col &&
        (m.promotion || null) === (move.promotion || null));
      const finalMove = chosen || legalMoves[Math.floor(Math.random() * legalMoves.length)];

      if (this.mode === 'story' && typeof DialogueManager !== 'undefined') {
        DialogueManager.onAIThinkEnd();
      }

      if (this.playMove(finalMove, true)) {
        // A minigame is running; its callback clears aiThinking.
        this.aiCooldown = 600;
        return;
      }
      this.aiThinking = false;
    } catch (e) {
      console.error('AI move error:', e);
      this.aiThinking = false;
    }
  },

  _showDialogueBubble(text, character) {
    if (!PixiApp.stage || typeof PixiDialogueBubble === 'undefined') return;
    if (this._dialogueBubble) {
      this._dialogueBubble.dismiss();
    }
    const bubble = new PixiDialogueBubble({
      name: character.name,
      text: text,
      colors: character.colors,
      characterId: character.id,
      cols: ThemeManager.getTheme(store.get('theme')).colors,
      duration: 5000,
    });
    PixiApp.stage.addChild(bubble);
    PixiApp.stage.sortableChildren = true;
    this._dialogueBubble = bubble;
  },

  // Against the AI the player resigns; in local 1v1 the side to move resigns.
  surrender() {
    if (this.gameOver) return;
    const loser = this.isAIMode ? this.playerColor : this.turn;
    this._aiToken++;
    this.aiThinking = false;
    this.gameOver = true;
    this.gameStatus = 'resigned';
    this.gameResult = loser === 'white' ? 'black' : 'white';
    this.handleGameEnd();
    audioManager.playGameOver();
  },

  // Leaving an AI game part-way counts as resigning; leaving a 1v1 game does not.
  quitToMenu() {
    if (!this.gameOver && this.isAIMode && this.moveHistory.length > 0) {
      this.surrender();
    }
    switchScreen('home');
  },

  handleGameEnd() {
    if (typeof DialogueManager !== 'undefined') DialogueManager.destroy();
    if (this._dialogueBubble) { this._dialogueBubble.dismiss(); this._dialogueBubble = null; }

    // Stats are kept from Player 1's point of view (the human against the AI).
    const stats = store.get('stats');
    stats.gamesPlayed++;
    if (this.gameResult === 'draw' || !this.gameResult) stats.draws++;
    else if (this.playerWon()) stats.wins++;
    else stats.losses++;
    store.set('stats', stats);

    if (this.mode === 'story' && this.playerWon()) {
      const save = store.getActiveSave();
      const charLevel = this.currentCharacter ? this.currentCharacter.level : 1;
      if (charLevel >= save.maxUnlockedLevel && charLevel < 10) {
        save.maxUnlockedLevel = charLevel + 1;
        save.storyLevel = charLevel + 1;
        store.setActiveSave(save);
      } else if (charLevel >= save.maxUnlockedLevel) {
        save.storyLevel = charLevel;
        save.completed = true;
        if (save.difficultyTier === 'expert' && !store.get('madnessUnlocked')) {
          store.set('madnessUnlocked', true);
        }
        store.setActiveSave(save);
      }
    }
    store.saveProgress();
  },


  handleGameOverAction(action) {
    if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') {
      audioManager.playButton();
    }
    switch (action) {
      case 'rematch':
        this.destroy();
        this.init(this._lastInitData);
        break;
      case 'menu':
        switchScreen('home');
        break;
      case 'next':
        if (this.mode === 'story' && this.currentCharacter) {
          const nextLevel = this.currentCharacter.level + 1;
          if (nextLevel <= 10) {
            const nextChar = CharacterManager.getCharacterByLevel(nextLevel);
            const save = store.getActiveSave();
            save.selectedCharacter = nextChar;
            save.storyLevel = nextLevel;
            store.set('selectedCharacter', nextChar);
            store.setActiveSave(save);
            this.destroy();
            this.init(this._lastInitData);
          } else {
            switchScreen('home');
          }
        }
        break;
    }
  },
};
