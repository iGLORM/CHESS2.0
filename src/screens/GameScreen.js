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
    this._lastInitData = data;
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
    this.lockedTiles = [];
    this.pendingRevertMove = null;
    this.captureCombo = 0;
    this.defensiveMiniGames = { white: 2, black: 2 };
    this.captureRewardProgress = { white: 0, black: 0 };
    this.comboDisplayTimer = 0;
    const canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.style.pointerEvents = 'auto';

    this.mode = store.get('mode');
    const p1IsWhite = store.get('p1IsWhite') !== false;
    this.aiColor = p1IsWhite ? 'black' : 'white';
    this.gameplayMode = store.get('customGameplayMode') !== false;
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

    // Initialize Pixi rendering
    if (typeof PixiGameScreen !== 'undefined') {
      PixiGameScreen.init();
      PixiGameScreen.renderBoard(this.board, store.get('theme') || 'space');
    }
    if (typeof PixiGameHud !== 'undefined') {
      PixiGameHud.init();
    }
    if (typeof PixiGameOverOverlay !== 'undefined') {
      PixiGameOverOverlay.init(this);
    }

    this._dialogueBubble = null;
    if (this.mode === 'story' && this.currentCharacter && typeof DialogueManager !== 'undefined') {
      DialogueManager.init(this.currentCharacter, (text, character) => {
        this._showDialogueBubble(text, character);
      });
    }
  },

  destroy() {
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

    // Re-init the visual layer
    if (typeof PixiGameScreen !== 'undefined') {
      PixiGameScreen.init();
      PixiGameScreen.renderBoard(this.board, store.get('theme') || 'space');
    }
    if (typeof PixiGameHud !== 'undefined') {
      PixiGameHud.init();
    }
    if (typeof PixiGameOverOverlay !== 'undefined') {
      PixiGameOverOverlay.init(this);
    }
  },

  saveSnapshot() {
    const snap = {
      grid: this.board.grid.map(row => row.map(cell => cell ? { type: cell.type, color: cell.color } : null)),
      turn: this.turn,
      castlingRights: JSON.parse(JSON.stringify(this.board.castlingRights)),
      enPassantTarget: this.board.enPassantTarget ? { ...this.board.enPassantTarget } : null,
      halfMoveClock: this.board.halfMoveClock,
      moveHistory: [...this.moveHistory.map(m => ({ from: { ...m.from }, to: { ...m.to }, piece: m.piece ? { ...m.piece } : null, captured: m.captured ? { ...m.captured } : null }))],
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
    this.board.inCheck = snap.inCheck;
    this.moveHistory = snap.moveHistory;
    this.capturedPieces = snap.capturedPieces;
    this.gameStatus = snap.gameStatus;
    this.gameOver = snap.gameOver;
    this.gameResult = snap.gameResult;
    this.selectedSquare = snap.selectedSquare;
    this.legalMoves = snap.legalMoves;
    this.lastMove = snap.lastMove;
    this.lockedTiles = snap.lockedTiles;
    this.defensiveMiniGames = snap.defensiveMiniGames || { white: 2, black: 2 };
    this.captureRewardProgress = snap.captureRewardProgress || { white: 0, black: 0 };
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
      this.turn = last.turn;
      this.aiThinking = false;
    }
    this.reviewingAt = null;
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
    const isAIMode = this.mode === 'story' || this.mode === 'classic' || this.mode === 'custom';
    const isLive = this.reviewingAt === null;
    if (isLive && isAIMode && this.turn === this.aiColor && !this.aiThinking && !this.gameOver && this.aiCooldown <= 0) {
      this.doAIMove();
    }

    // Pixi handles board, pieces, backgrounds, particles
    if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
      PixiGameScreen.update(dt, {
        board: this.board,
        selectedSquare: this.selectedSquare,
        legalMoves: this.legalMoves,
      });
    }

    if (typeof PixiGameHud !== 'undefined' && PixiGameHud.initialized) {
      PixiGameHud.update(this);
    } else {
      this.renderSidePanel(ctx, cols, 'left', 'white');
      this.renderSidePanel(ctx, cols, 'right', 'black');
      this.renderStatusBar(ctx, cols);
    }

    if (this.gameOver) {
      if (typeof PixiGameOverOverlay !== 'undefined' && PixiGameOverOverlay.initialized) {
        PixiGameOverOverlay.update(this);
      } else {
        this.renderGameOverOverlay(ctx, cols);
      }
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
    const cx = Layout.cx;
    const panelY = Layout.cy - 155;
    const btnRow1Y = panelY + 160;
    const buttons = [
      { text: 'Play Again', action: 'rematch', x: cx - 250, y: btnRow1Y, w: 150, h: 42 },
      { text: 'Main Menu', action: 'menu', x: cx - 75, y: btnRow1Y, w: 150, h: 42 },
      { text: 'Themes', action: 'themes', x: cx + 100, y: btnRow1Y, w: 150, h: 42 },
    ];
    if (this.mode === 'story' && this.gameResult === 'white') {
      buttons.push({ text: 'Next Level', action: 'next', x: cx - 75, y: btnRow1Y + 60, w: 150, h: 42 });
    }
    return buttons;
  },

  renderGameOverOverlay(ctx, cols) {
    this.gameOverTimer = Math.min(1, this.gameOverTimer + 0.08);
    ctx.save();
    ctx.globalAlpha = this.gameOverTimer;
    ctx.fillStyle = 'rgba(0,0,0,0.64)';
    ctx.fillRect(0, 0, Layout.W, Layout.H);

    const panelW = 640;
    const panelX = Layout.cx - panelW / 2;
    const panelY = Layout.cy - 155;
    const panelH = (this.mode === 'story' && this.gameResult === 'white') ? 300 : 245;
    UIHelpers.drawPanel(ctx, panelX, panelY, panelW, panelH, cols, { accentTop: true });

    if (this.gameResult && this.gameResult !== 'draw') {
      UIHelpers.drawIcon(ctx, Layout.cx - 12, panelY + 54, 'crown', 14, cols, {
        color: this.gameResult === 'white' ? cols.lightPiece : cols.darkPiece,
      });
    }

    let msg = 'Draw!';
    if (this.gameResult === 'white') msg = 'White Wins!';
    else if (this.gameResult === 'black') msg = 'Black Wins!';

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 34px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(msg, Layout.cx, panelY + 112);

    let reason = 'Game Over';
    if (this.gameStatus === 'checkmate') reason = 'by Checkmate';
    else if (this.gameStatus === 'stalemate') reason = 'by Stalemate';
    else if (this.gameStatus === 'draw') reason = 'by Draw';
    else if (this.gameStatus === 'resigned') reason = 'by Resignation';
    ctx.fillStyle = cols.text + 'aa';
    ctx.font = '15px "Pixelify Sans", sans-serif';
    ctx.fillText(reason, Layout.cx, panelY + 140);

    if (this.gameResult && this.currentCharacter) {
      ctx.fillStyle = cols.text + 'bb';
      ctx.font = '15px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'left';
      const dlg = this.gameResult === 'white'
        ? this.currentCharacter.dialogue.after
        : this.currentCharacter.dialogue.win;
      UIHelpers.wrapText(ctx, dlg || '', panelX + 48, panelY + 168, panelW - 96, 20, 5);
    }

    for (const btn of this.getGameOverButtons()) {
      UIHelpers.drawButton(ctx, btn.x, btn.y, btn.w, btn.h, btn.text, cols, {
        font: 'bold 14px "Pixelify Sans", sans-serif',
        hover: this.hoveredGameOverBtn === btn.action,
      });
    }
    ctx.restore();
  },

  renderSidePanel(ctx, cols, side, color) {
    const isLeft = side === 'left';
    const x = isLeft ? 16 : Layout.W - 210;
    const y = 80;
    const w = 194;
    const h = 640;
    const pad = 14;
    const isPlayerTurn = this.turn === color;
    const playerName = color === 'white' ? store.get('whitePlayer') : store.get('blackPlayer');

    // Panel background — rounded with transparency
    ctx.save();
    this._roundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = cols.panel + 'dd';
    ctx.fill();
    ctx.strokeStyle = isPlayerTurn && !this.gameOver ? cols.accent + '88' : cols.text + '22';
    ctx.lineWidth = isPlayerTurn ? 2 : 1;
    ctx.stroke();
    ctx.restore();

    // Active turn indicator — glowing left/right stripe
    if (isPlayerTurn && !this.gameOver) {
      ctx.fillStyle = cols.accent + '44';
      if (isLeft) {
        ctx.fillRect(x, y + 4, 3, h - 8);
      } else {
        ctx.fillRect(x + w - 3, y + 4, 3, h - 8);
      }
    }

    // Player name
    let cy = y + pad + 4;
    ctx.fillStyle = isPlayerTurn && !this.gameOver ? cols.accent : cols.text;
    ctx.font = 'bold 16px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(UIHelpers.truncateText(ctx, playerName, w - pad * 2), x + pad, cy);
    cy += 6;

    // Color indicator
    ctx.fillStyle = color === 'white' ? '#e8e0d0' : '#3a3530';
    this._roundRect(ctx, x + pad, cy, 18, 18, 3);
    ctx.fill();
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Turn label next to indicator
    if (isPlayerTurn && !this.gameOver) {
      ctx.fillStyle = cols.accent + 'cc';
      ctx.font = '14px "Pixelify Sans", sans-serif';
      ctx.fillText('YOUR TURN', x + pad + 24, cy + 14);
    }
    cy += 28;

    // Separator
    ctx.fillStyle = cols.text + '22';
    ctx.fillRect(x + pad, cy, w - pad * 2, 1);
    cy += 12;

    if (this.gameplayMode) {
      const charges = this.defensiveMiniGames[color] || 0;
      ctx.fillStyle = charges > 0 ? cols.accent : cols.text + '44';
      ctx.font = 'bold 13px "Pixelify Sans", sans-serif';
      ctx.fillText('DEFENSES: ' + charges, x + pad, cy);
      cy += 22;
    }

    // Captured pieces section
    const captured = this.capturedPieces[color];
    const pieceValues = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
    const pieceSymbols = { pawn: '♟', knight: '♞', bishop: '♝', rook: '♜', queen: '♛', king: '♚' };

    ctx.fillStyle = cols.text + '88';
    ctx.font = '14px "Pixelify Sans", sans-serif';
    ctx.fillText('CAPTURED', x + pad, cy);
    cy += 8;

    if (captured.length === 0) {
      ctx.fillStyle = cols.text + '33';
      ctx.font = '14px "Pixelify Sans", sans-serif';
      ctx.fillText('None yet', x + pad, cy + 8);
      cy += 20;
    } else {
      let px = x + pad;
      ctx.font = '18px "Pixelify Sans", sans-serif';
      for (const p of captured.slice(0, 20)) {
        ctx.fillStyle = p.color === 'white' ? '#e8e0d0' : '#888';
        ctx.fillText(pieceSymbols[p.type] || '?', px, cy + 10);
        px += 16;
        if (px > x + w - pad) { px = x + pad; cy += 18; }
      }
      cy += 22;
    }

    // Material advantage
    const whiteCaptures = this.capturedPieces.white;
    const blackCaptures = this.capturedPieces.black;
    const whiteMatCaptured = whiteCaptures.reduce((s, p) => s + (pieceValues[p.type] || 0), 0);
    const blackMatCaptured = blackCaptures.reduce((s, p) => s + (pieceValues[p.type] || 0), 0);
    const whiteAdvantage = whiteMatCaptured - blackMatCaptured;

    if (whiteAdvantage !== 0) {
      const isWhiteSide = color === 'white';
      const advantage = isWhiteSide ? whiteAdvantage : -whiteAdvantage;
      if (advantage > 0) {
        ctx.fillStyle = '#44dd44';
        ctx.font = 'bold 16px "Pixelify Sans", sans-serif';
        ctx.fillText('+' + advantage + ' material', x + pad, cy);
      } else if (advantage < 0) {
        ctx.fillStyle = '#dd4444';
        ctx.font = 'bold 16px "Pixelify Sans", sans-serif';
        ctx.fillText(advantage + ' material', x + pad, cy);
      }
      cy += 18;
    }

    // Separator
    cy += 4;
    ctx.fillStyle = cols.text + '22';
    ctx.fillRect(x + pad, cy, w - pad * 2, 1);
    cy += 12;

    // Story mode character info
    if (this.mode === 'story' && color === 'black' && this.currentCharacter) {
      ctx.fillStyle = this.currentCharacter.colors.primary;
      ctx.font = 'bold 16px "Pixelify Sans", sans-serif';
      ctx.fillText(UIHelpers.truncateText(ctx, this.currentCharacter.name, w - pad * 2), x + pad, cy);
      cy += 4;
      ctx.fillStyle = cols.text + '66';
      ctx.font = '14px "Pixelify Sans", sans-serif';
      ctx.fillText('Level ' + this.currentCharacter.level, x + pad, cy + 8);
      cy += 20;
    }

    // Move history (left panel only)
    if (isLeft && this.moveHistory.length > 0) {
      ctx.fillStyle = cols.text + '66';
      ctx.font = '14px "Pixelify Sans", sans-serif';
      ctx.fillText('MOVE HISTORY', x + pad, cy);
      cy += 8;

      ctx.fillStyle = cols.text + '88';
      ctx.font = '16px "Pixelify Sans", sans-serif';
      const files = 'abcdefgh';
      const recentMoves = this.moveHistory.slice(-10);
      for (let i = 0; i < recentMoves.length; i++) {
        const m = recentMoves[i];
        const moveNum = this.moveHistory.length - recentMoves.length + i + 1;
        const pieceChar = { pawn: '', knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' }[m.piece?.type || 'pawn'] || '';
        const to = files[m.to.col] + (8 - m.to.row);
        const isLast = i === recentMoves.length - 1;
        ctx.fillStyle = isLast ? cols.accent : cols.text + '77';
        ctx.fillText(moveNum + '. ' + pieceChar + to, x + pad, cy + 10);
        cy += 16;
      }
    }
  },

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },

  renderStatusBar(ctx, cols) {
    const barX = 210;
    const barW = Layout.W - 420;
    const y = Layout.H - 55;
    // Rounded status bar
    ctx.save();
    this._roundRect(ctx, barX, y, barW, 38, 6);
    ctx.fillStyle = cols.panel + 'dd';
    ctx.fill();
    ctx.strokeStyle = cols.text + '22';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = cols.text;
    ctx.font = '18px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    const turnText = this.turn === 'white' ? "White's Turn" : "Black's Turn";
    if (this.gameStatus === 'check') {
      ctx.fillStyle = cols.checkHighlight || cols.accent;
      ctx.font = 'bold 12px "Silkscreen", monospace';
      ctx.fillText('CHECK!', Layout.cx, y + 18);
      ctx.fillStyle = cols.text + '88';
      ctx.font = '14px "Pixelify Sans", sans-serif';
      ctx.fillText(turnText, Layout.cx, y + 32);
    } else {
      ctx.fillText(turnText, Layout.cx, y + 22);
    }

    // Move navigation buttons
    const isReviewing = this.reviewingAt !== null;
    const navY = y + 5;
    const navEnabled = this.boardSnapshots.length > 1;

    // Back button
    ctx.fillStyle = navEnabled && this.reviewingAt !== 0 ? cols.text : cols.text + '22';
    ctx.font = 'bold 16px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('◀', barX, navY + 18);

    // Forward button
    ctx.fillStyle = navEnabled && isReviewing && this.reviewingAt < this.boardSnapshots.length - 1 ? cols.text : cols.text + '22';
    ctx.fillText('▶', barX + 18, navY + 18);

    // Live button
    ctx.fillStyle = isReviewing ? cols.accent : cols.text + '22';
    ctx.font = '9px "Pixelify Sans", sans-serif';
    ctx.fillText('LIVE', barX + 38, navY + 18);

    ctx.fillStyle = cols.text + '66';
    ctx.font = '10px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'right';
    const snapIdx = isReviewing ? (this.reviewingAt + 1) : this.boardSnapshots.length;
    ctx.fillText('Move #' + snapIdx, barX + barW - 10, y + 22);

    if (this.lockedTiles.length > 0) {
      ctx.fillStyle = cols.checkHighlight || cols.accent;
      ctx.font = '10px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Locked: ' + this.lockedTiles.length, barX + 110, y + 22);
    }
    ctx.fillStyle = cols.text + '44';
    ctx.font = '10px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ESC: Pause', Layout.cx, y + 32);
  },

  handleClick(x, y) {
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

    // Move navigation buttons in status bar
    const barX = 210;
    const statusY = Layout.H - 55;
    const navHitY = statusY;
    if (y >= navHitY && y <= navHitY + 38) {
      if (x >= barX && x <= barX + 18) {
        // Back
        if (this.reviewingAt !== 0 && this.boardSnapshots.length > 1) {
          const idx = this.reviewingAt === null ? this.boardSnapshots.length - 2 : this.reviewingAt - 1;
          this.goToMove(Math.max(0, idx));
        }
        return;
      }
      if (x >= barX + 18 && x <= barX + 36) {
        // Forward
        if (this.reviewingAt !== null && this.reviewingAt < this.boardSnapshots.length - 1) {
          this.goToMove(this.reviewingAt + 1);
        }
        return;
      }
      if (x >= barX + 38 && x <= barX + 80) {
        // Live
        this.goToLive();
        return;
      }
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
    if (e.key === 'Escape') {
      if (this.gameOver) {
        switchScreen('home');
      } else {
        PauseMenu.show();
      }
    }
    if (e.key === 'ArrowLeft' && this.boardSnapshots.length > 1) {
      const idx = this.reviewingAt === null ? this.boardSnapshots.length - 2 : this.reviewingAt - 1;
      this.goToMove(Math.max(0, idx));
    }
    if (e.key === 'ArrowRight') {
      if (this.reviewingAt !== null && this.reviewingAt < this.boardSnapshots.length - 1) {
        this.goToMove(this.reviewingAt + 1);
      } else if (this.reviewingAt !== null && this.reviewingAt === this.boardSnapshots.length - 1) {
        this.goToLive();
      }
    }
  },

  executePlayerMove(move) {
    const piece = this.board.grid[move.from.row][move.from.col];
    const captured = this.board.grid[move.to.row][move.to.col];
    const isCapture = !!captured;

    if (isCapture && this.gameplayMode && this.tryStartDefensiveMiniGame(move, piece, captured, false)) {
      return;
    }

    if (isCapture && !this.gameplayMode && Math.random() < 0.3 && MiniGameManager.shouldTriggerMiniGame()) {
      const isAIMode = this.mode === 'story' || this.mode === 'classic' || this.mode === 'custom';
      const isAIAttacking = isAIMode && this.turn === this.aiColor;

      this.pendingRevertMove = { move, piece, captured };
      miniGameManager.startMiniGame(
        piece, captured, move.to,
        isAIAttacking,
        (winner) => {
          if (winner === 'attacker') {
            this.executeCaptureMove(move, piece, captured);
          } else {
            this.revertMoveAndLockTile(move);
          }
        }
      );
      return;
    }

    this.lastMoveWasCapture = !!captured;
    if (!captured) this.captureCombo = 0;
    this.executeCaptureMove(move, piece, captured);
  },

  tryStartDefensiveMiniGame(move, piece, captured, isAIMove) {
    if (!captured || !MiniGameManager.shouldTriggerMiniGame()) return false;
    if ((this.defensiveMiniGames[captured.color] || 0) <= 0) return false;

    const isAIMode = this.mode === 'story' || this.mode === 'classic' || this.mode === 'custom';
    const challengePlayerIsAI = isAIMode && captured.color === this.aiColor;
    const started = miniGameManager.startDefensiveMiniGame({
      attacker: piece,
      defender: captured,
      boardPos: move.to,
      challengePlayerIsAI,
      botSkillLevel: this.characterLevel,
    }, (result) => {
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
      const sqSize = 80;
      const offsetX = 320;
      const offsetY = 80;
      const cx = offsetX + move.to.col * sqSize + sqSize / 2;
      const cy = offsetY + move.to.row * sqSize + sqSize / 2;

      if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
        const isMajor = captured && (captured.type === 'rook' || captured.type === 'queen');
        PixiGameScreen.spawnCaptureParticles(cx, cy, PixiColorUtil.hexToNum(theme.colors.accent), captured.type);
        PixiGameScreen.shakeScreen(isMajor ? 14 : 8);
        PixiGameScreen.flashScreen(isMajor ? 0xffeeaa : 0xffffff);
      } else {
        this.particleFX.captureEffect(cx, cy, theme);
        this.boardRenderer.triggerScreenShake(8);
        this.boardRenderer.triggerCaptureFlash(move.to.row, move.to.col);
      }

      audioManager.playCapture();
      audioManager.playScreenShake();

      if (this.mode === 'story' && typeof DialogueManager !== 'undefined') {
        DialogueManager.onCapture(this.turn, captured, this.aiColor);
      }
    } else {
      audioManager.playMove(piece ? piece.type : null);
      const theme = ThemeManager.getTheme(store.get('theme'));
      const sqSize = 80;
      const offsetX = 320;
      const offsetY = 80;
      const cx = offsetX + move.to.col * sqSize + sqSize / 2;
      const cy = offsetY + move.to.row * sqSize + sqSize / 2;

      if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
        PixiGameScreen.spawnMoveParticles(cx, cy, PixiColorUtil.hexToNum(theme.colors.accent));
      } else {
        this.particleFX.moveEffect(cx, cy, theme);
      }
    }

    move.piece = piece;
    move.captured = captured;
    MoveExecutor.executeMove(this.board, move, this.turn);
    this.saveSnapshot();
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
      this.handleGameEnd();
      audioManager.playGameOver();
    }

    if (this.gameStatus === 'check') {
      audioManager.playCheck();
      if (this.mode === 'story' && typeof DialogueManager !== 'undefined') {
        DialogueManager.onCheck(this.turn, this.aiColor);
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

  afterMove(move) {
    this.lastMove = { from: move.from, to: move.to };
    this.moveHistory.push(move);
    this.turn = this.turn === 'white' ? 'black' : 'white';
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lockedTiles = [];
    this.pendingRevertMove = null;
    this.finishTurnStatus();

    if (this.mode === 'story' && typeof DialogueManager !== 'undefined') {
      if (this.moveHistory.length === 1) {
        DialogueManager.onGameStart();
      }
      DialogueManager.onMoveComplete(this.moveHistory.length, this.board, this.aiColor);
    }
  },

  doAIMove() {
    this.aiThinking = true;

    if (this.mode === 'story' && typeof DialogueManager !== 'undefined') {
      DialogueManager.onAIThinkStart();
    }

    // Safety timeout: if AI takes longer than 10 seconds, force-reset
    const safetyTimer = setTimeout(() => {
      console.error('AI safety timeout triggered — forcing aiThinking = false');
      this.aiThinking = false;
      this.aiCooldown = 500;
    }, 10000);

    setTimeout(async () => {
      try {
        if (this.gameOver) { this.aiThinking = false; clearTimeout(safetyTimer); return; }

        let legalMoves = GameRules.getLegalMoves(this.board, this.aiColor);
        legalMoves = legalMoves.filter(m =>
          !this.lockedTiles.some(t => t.row === m.to.row && t.col === m.to.col)
        );

        if (legalMoves.length === 0) {
          this.aiThinking = false;
          clearTimeout(safetyTimer);
          if (this.board.inCheck) {
            // Checkmate (or locked tiles blocking all escape — same result)
            this.gameOver = true;
            this.gameStatus = 'checkmate';
            this.gameResult = this.aiColor === 'white' ? 'black' : 'white';
            this.handleGameEnd();
            audioManager.playVictory();
          } else {
            // Stalemate (no legal moves, not in check)
            this.gameOver = true;
            this.gameStatus = 'stalemate';
            this.gameResult = 'draw';
            this.handleGameEnd();
            audioManager.playGameOver();
          }
          return;
        }

        let move = null;
        try {
          move = await AIController.getMoveAsync(this.board, this.aiColor, this.characterLevel, legalMoves);
        } catch (e) {
          console.error('AIController.getMoveAsync error:', e);
          try {
            move = AIController.getMove(this.board, this.aiColor, this.characterLevel);
          } catch (e2) {
            console.error('AIController.getMove error:', e2);
          }
        }
        if (move && this.lockedTiles.some(t => t.row === move.to.row && t.col === move.to.col)) {
          move = null;
        }
        if (!move) {
          move = legalMoves.length === 1 ? legalMoves[0] : legalMoves[Math.floor(Math.random() * legalMoves.length)];
        }

        if (this.mode === 'story' && typeof DialogueManager !== 'undefined') {
          DialogueManager.onAIThinkEnd();
        }

        const piece = this.board.grid[move.from.row][move.from.col];
        const captured = this.board.grid[move.to.row][move.to.col];
        const isCapture = !!captured;

        if (isCapture && this.gameplayMode && this.tryStartDefensiveMiniGame(move, piece, captured, true)) {
          clearTimeout(safetyTimer);
          this.aiCooldown = 600;
          return;
        }

        if (isCapture && !this.gameplayMode && Math.random() < 0.3 && MiniGameManager.shouldTriggerMiniGame()) {
          miniGameManager.startMiniGame(
            piece, captured, move.to,
            true,
            (winner) => {
              if (winner === 'attacker') {
                this.executeCaptureMove(move, piece, captured);
              } else {
                this.revertMoveAndLockTile(move);
              }
              this.aiThinking = false;
              this.aiCooldown = 600;
            }
          );
          clearTimeout(safetyTimer);
          return;
        }

        this.executeCaptureMove(move, piece, captured);
        this.aiThinking = false;
      } catch (e) {
        console.error('doAIMove error:', e);
        this.aiThinking = false;
      }
      clearTimeout(safetyTimer);
    }, 500 + Math.random() * 700);
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

  surrender() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.gameStatus = 'resigned';
    this.gameResult = this.turn === 'white' ? 'black' : 'white';
    this.handleGameEnd();
    audioManager.playGameOver();
  },

  handleGameEnd() {
    if (typeof DialogueManager !== 'undefined') DialogueManager.destroy();
    if (this._dialogueBubble) { this._dialogueBubble.dismiss(); this._dialogueBubble = null; }

    const stats = store.get('stats');
    stats.gamesPlayed++;
    if (this.gameResult === 'white') stats.wins++;
    else if (this.gameResult === 'black') stats.losses++;
    else stats.draws++;
    store.set('stats', stats);

    if (this.mode === 'story' && this.gameResult === 'white') {
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
        this.init();
        break;
      case 'menu':
        switchScreen('home');
        break;
      case 'themes':
        switchScreen('themeSelect', { returnTo: 'game' });
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
            this.init();
          } else {
            switchScreen('home');
          }
        }
        break;
    }
  },
};
