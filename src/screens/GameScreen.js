const GameScreen = {
  board: null,
  boardRenderer: null,
  animator: null,
  particleFX: null,
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
  aiThinking: false,
  mode: '1v1',
  currentCharacter: null,
  characterLevel: 1,
  lastMove: null,
  lockedTiles: [],
  pendingRevertMove: null,

  init(data) {
    this.board = new Board();
    this.boardRenderer = new BoardRenderer();
    this.animator = new Animator(this.boardRenderer);
    this.particleFX = new ParticleFX(this.boardRenderer);
    this.selectedSquare = null;
    this.legalMoves = [];
    this.turn = 'white';
    this.gameStatus = 'playing';
    this.gameOver = false;
    this.gameResult = null;
    this.capturedPieces = { white: [], black: [] };
    this.moveHistory = [];
    this.aiThinking = false;
    this.lastMove = null;
    this.lockedTiles = [];
    this.pendingRevertMove = null;

    this.mode = store.get('mode');
    if (this.mode === 'story') {
      this.currentCharacter = store.get('selectedCharacter');
      this.characterLevel = this.currentCharacter ? this.currentCharacter.level : 1;
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
    audioManager.startMusic();
  },

  destroy() {
    this.boardRenderer.clearAnimations();
    audioManager.stopMusic();
  },

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    if (this.mode === 'story' && this.turn === 'black' && !this.aiThinking && !this.gameOver) {
      this.doAIMove();
    }

    this.boardRenderer.render(
      ctx, this.board, theme,
      this.selectedSquare,
      this.legalMoves,
      this.lastMove,
      this.turn,
      this.gameStatus,
      this.boardRenderer.animations.length > 0,
      this.lockedTiles
    );

    this.renderSidePanel(ctx, cols, 'left', 'white');
    this.renderSidePanel(ctx, cols, 'right', 'black');
    this.renderStatusBar(ctx, cols);

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, 1280, 800);
      ctx.fillStyle = cols.panel;
      ctx.fillRect(340, 230, 600, 300);
      ctx.strokeStyle = cols.accent;
      ctx.lineWidth = 3;
      ctx.strokeRect(340, 230, 600, 300);
      ctx.fillStyle = cols.text;
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      let msg = '';
      if (this.gameResult === 'white') msg = 'White Wins!';
      else if (this.gameResult === 'black') msg = 'Black Wins!';
      else if (this.gameResult === 'draw') msg = 'Draw!';
      ctx.fillText(msg, 640, 310);
      if (this.gameResult && this.currentCharacter) {
        ctx.fillStyle = cols.text + 'aa';
        ctx.font = '16px monospace';
        const dlg = this.gameResult === 'white'
          ? this.currentCharacter.dialogue.after
          : this.currentCharacter.dialogue.win;
        this.wrapText(ctx, dlg, 380, 340, 520, 22);
      }
      const buttons = [
        { text: 'Play Again', action: 'rematch', x: 440, y: 420 },
        { text: 'Menu', action: 'menu', x: 640, y: 420 },
        { text: 'Themes', action: 'themes', x: 840, y: 420 },
      ];
      if (this.mode === 'story' && this.gameResult === 'white') {
        buttons.push({ text: 'Next Level', action: 'next', x: 540, y: 480 });
      }
      for (const btn of buttons) {
        ctx.fillStyle = cols.buttonBg;
        ctx.fillRect(btn.x - 80, btn.y, 160, 40);
        ctx.strokeStyle = cols.text + '44';
        ctx.lineWidth = 1;
        ctx.strokeRect(btn.x - 80, btn.y, 160, 40);
        ctx.fillStyle = cols.text;
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(btn.text, btn.x, btn.y + 26);
        btn._bounds = { x: btn.x - 80, y: btn.y, w: 160, h: 40 };
      }
    }

    if (this.aiThinking) {
      ctx.fillStyle = cols.text + '88';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      const dots = '.'.repeat(Math.floor(Date.now() / 500) % 4);
      ctx.fillText('Opponent is thinking' + dots, 640, 30);
    }
  },

  renderSidePanel(ctx, cols, side, color) {
    const isLeft = side === 'left';
    const x = isLeft ? 20 : 1280 - 200;
    const y = 100;
    const w = 160;
    const h = 600;
    ctx.fillStyle = cols.panel + 'aa';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.text + '22';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    const playerName = color === 'white' ? store.get('whitePlayer') : store.get('blackPlayer');
    const isPlayerTurn = this.turn === color;
    if (isPlayerTurn && !this.gameOver) {
      ctx.fillStyle = cols.accent;
      ctx.fillRect(x, y, 4, h);
    }
    ctx.fillStyle = isPlayerTurn && !this.gameOver ? cols.accent : cols.text;
    ctx.font = isPlayerTurn ? 'bold 13px monospace' : '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(playerName, x + 10, y + 25);
    ctx.fillStyle = color === 'white' ? '#fff' : '#222';
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.fillRect(x + 10, y + 33, 14, 14);
    ctx.strokeRect(x + 10, y + 33, 14, 14);
    const captured = this.capturedPieces[color];
    ctx.fillStyle = cols.text + '66';
    ctx.font = '10px monospace';
    ctx.fillText('Captured: ' + captured.length, x + 10, y + 65);
    const pieceSymbols = { pawn: 'p', knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' };
    let px = x + 10;
    let py = y + 75;
    ctx.font = '12px monospace';
    for (const p of captured.slice(0, 20)) {
      ctx.fillStyle = p.color === 'white' ? '#fff' : '#222';
      ctx.fillText(pieceSymbols[p.type] || '?', px, py);
      px += 14;
      if (px > x + w - 10) { px = x + 10; py += 14; }
    }
    if (this.mode === 'story' && color === 'black' && this.currentCharacter) {
      ctx.fillStyle = cols.text + '88';
      ctx.font = '10px monospace';
      ctx.fillText('Level ' + this.currentCharacter.level, x + 10, y + 550);
      ctx.fillStyle = this.currentCharacter.colors.primary;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(this.currentCharacter.name, x + 10, y + 570);
    }
  },

  renderStatusBar(ctx, cols) {
    const y = 745;
    ctx.fillStyle = cols.panel + 'aa';
    ctx.fillRect(200, y, 880, 35);
    ctx.fillStyle = cols.text;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    const turnText = this.turn === 'white' ? "White's Turn" : "Black's Turn";
    ctx.fillText(turnText, 640, y + 22);
    if (this.gameStatus === 'check') {
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('CHECK!', 640, y + 22);
    }
    ctx.fillStyle = cols.text + '66';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Move #' + this.moveHistory.length, 1060, y + 22);
    const mgEnabled = store.get('miniGamesEnabled');
    ctx.fillStyle = mgEnabled ? cols.accent : cols.text + '44';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Mini-games: ' + (mgEnabled ? 'ON' : 'OFF'), 220, y + 22);
    if (this.lockedTiles.length > 0) {
      ctx.fillStyle = '#ff4444';
      ctx.fillText('Locked: ' + this.lockedTiles.length, 320, y + 22);
    }
    ctx.fillStyle = cols.text + '44';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ESC: Pause', 640, y + 32);
  },

  handleClick(x, y) {
    if (this.gameOver) {
      for (const btn of [
        { text: 'Play Again', action: 'rematch', bx: 360, by: 420 },
        { text: 'Menu', action: 'menu', bx: 560, by: 420 },
        { text: 'Themes', action: 'themes', bx: 760, by: 420 },
        { text: 'Next Level', action: 'next', bx: 460, by: 480 },
      ]) {
        if (x >= btn.bx && x <= btn.bx + 160 && y >= btn.by && y <= btn.by + 40) {
          this.handleGameOverAction(btn.action);
          return;
        }
      }
      return;
    }
    if (this.aiThinking) return;

    const boardPos = this.boardRenderer.screenToBoard(x, y);
    if (!boardPos) return;
    const { row, col } = boardPos;

    // Check if tile is locked
    if (this.lockedTiles.some(t => t.row === row && t.col === col)) {
      audioManager.playTileLock();
      return;
    }

    const clicked = this.board.grid[row][col];

    if (this.selectedSquare) {
      const move = this.legalMoves.find(m =>
        m.to.row === row && m.to.col === col &&
        (!m.promotion || m.promotion === 'queen')
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
      // Filter out locked tiles
      moves = moves.filter(m => !this.lockedTiles.some(t => t.row === m.to.row && t.col === m.to.col));
      this.legalMoves = moves.filter(m => m.from.row === row && m.from.col === col);
    } else {
      this.selectedSquare = null;
      this.legalMoves = [];
    }
  },

  handleMouseMove(x, y) {},

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      if (!this.gameOver) {
        audioManager.stopMusic();
      }
      switchScreen('home');
    }
  },

  executePlayerMove(move) {
    const piece = this.board.grid[move.from.row][move.from.col];
    const captured = this.board.grid[move.to.row][move.to.col];
    const isCapture = !!captured;

    if (isCapture) {
      // 30% chance to trigger mini-game
      if (MiniGameManager.shouldTriggerMiniGame()) {
        // Show mini-game: attacker (current player) plays
        const isDuel = MiniGameManager.isDuel(piece, captured);
        const isAIAttacking = this.mode === 'story' && this.turn === 'black';

        this.pendingRevertMove = { move, piece, captured };

        miniGameManager.startMiniGame(
          piece, captured, move.to,
          isAIAttacking,
          (winner) => {
            if (winner === 'attacker') {
              // Attacker wins: capture succeeds
              this.executeCaptureMove(move, piece, captured);
            } else {
              // Attacker loses: revert piece, lock the tile
              this.revertMoveAndLockTile(move);
            }
          }
        );
        return;
      }
    }

    // Normal move (no mini-game or no capture)
    this.executeCaptureMove(move, piece, captured);
  },

  executeCaptureMove(move, piece, captured) {
    if (captured) {
      this.capturedPieces[this.turn].push(captured);

      const theme = ThemeManager.getTheme(store.get('theme'));
      const toScreen = this.boardRenderer.boardToScreen(move.to.row, move.to.col);
      const cx = toScreen.x + this.boardRenderer.squareSize / 2;
      const cy = toScreen.y + this.boardRenderer.squareSize / 2;
      this.particleFX.captureEffect(cx, cy, theme);

      // Screen shake on capture
      this.boardRenderer.triggerScreenShake(8);
      audioManager.playCapture();
      audioManager.playScreenShake();
    } else {
      audioManager.playMove();
    }

    MoveExecutor.executeMove(this.board, move, this.turn);
    this.afterMove(move);
  },

  revertMoveAndLockTile(move) {
    // Don't execute the move - piece stays where it is
    // Lock the destination tile for this turn
    this.lockedTiles.push({ row: move.to.row, col: move.to.col });
    audioManager.playTileLock();

    // Clear selection and recompute legal moves
    this.selectedSquare = null;
    this.legalMoves = [];

    // Show notification
    store.update({ board: this.board });
  },

  afterMove(move) {
    this.lastMove = { from: move.from, to: move.to };
    this.moveHistory.push(move);
    this.turn = this.turn === 'white' ? 'black' : 'white';
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lockedTiles = []; // Clear locked tiles on turn change
    this.pendingRevertMove = null;

    const status = GameRules.getGameStatus(this.board, this.turn);
    this.gameStatus = status.status;

    if (status.status === 'checkmate' || status.status === 'stalemate') {
      this.gameOver = true;
      this.gameResult = status.winner || 'draw';
      this.handleGameEnd();
      if (this.gameResult !== 'draw') audioManager.playVictory();
      else audioManager.playGameOver();
    } else if (status.status === 'draw') {
      this.gameOver = true;
      this.gameResult = 'draw';
      audioManager.playGameOver();
    }

    if (this.gameStatus === 'check') {
      audioManager.playCheck();
    }

    store.update({
      board: this.board,
      turn: this.turn,
      gameStatus: this.gameStatus,
      gameOver: this.gameOver,
      gameResult: this.gameResult,
    });
  },

  doAIMove() {
    this.aiThinking = true;

    setTimeout(() => {
      if (this.gameOver) { this.aiThinking = false; return; }

      // Get all legal moves and filter out locked tiles
      let legalMoves = GameRules.getLegalMoves(this.board, 'black');
      legalMoves = legalMoves.filter(m =>
        !this.lockedTiles.some(t => t.row === m.to.row && t.col === m.to.col)
      );

      if (legalMoves.length === 0) {
        this.aiThinking = false;
        const status = GameRules.getGameStatus(this.board, 'black');
        this.gameStatus = status.status;
        if (status.status === 'checkmate' || status.status === 'stalemate') {
          this.gameOver = true;
          this.gameResult = 'white';
        }
        return;
      }

      let move = AIController.getMove(this.board, 'black', this.characterLevel);
      // If AI chose a locked tile, pick the best alternative
      if (move && this.lockedTiles.some(t => t.row === move.to.row && t.col === move.to.col)) {
        move = null;
      }
      if (!move) {
        // Fallback: pick from valid moves
        if (legalMoves.length === 1) {
          move = legalMoves[0];
        } else {
          move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        }
      }

      const piece = this.board.grid[move.from.row][move.from.col];
      const captured = this.board.grid[move.to.row][move.to.col];
      const isCapture = !!captured;

      if (isCapture && MiniGameManager.shouldTriggerMiniGame()) {
        this.aiThinking = false;
        miniGameManager.startMiniGame(
          piece, captured, move.to,
          true, // AI is attacking
          (winner) => {
            if (winner === 'attacker') {
              this.executeCaptureMove(move, piece, captured);
            } else {
              // AI lost: revert and lock tile for AI's turn
              this.lockedTiles.push({ row: move.to.row, col: move.to.col });
              audioManager.playTileLock();
              this.selectedSquare = null;
              this.legalMoves = [];
              // AI must try a different move
              this.aiThinking = false;
            }
          }
        );
        return;
      }

      this.executeCaptureMove(move, piece, captured);
      this.aiThinking = false;
    }, 500 + Math.random() * 500);
  },

  handleGameEnd() {
    if (this.mode === 'story' && this.gameResult === 'white') {
      const currentLevel = this.characterLevel || store.get('storyLevel');
      const maxUnlocked = store.get('maxUnlockedLevel');
      if (currentLevel >= maxUnlocked && currentLevel < 10) {
        store.set('maxUnlockedLevel', currentLevel + 1);
        store.set('storyLevel', currentLevel + 1);
      } else if (currentLevel >= maxUnlocked) {
        store.set('storyLevel', currentLevel);
      }
      store.saveProgress();
    }
  },

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let ly = y;
    for (const word of words) {
      const test = line + word + ' ';
      const m = ctx.measureText(test);
      if (m.width > maxWidth && line !== '') {
        ctx.fillText(line, x, ly);
        line = word + ' ';
        ly += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, ly);
  },

  handleGameOverAction(action) {
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
            store.set('selectedCharacter', nextChar);
            store.set('storyLevel', nextLevel);
            this.init();
          } else {
            switchScreen('home');
          }
        }
        break;
    }
  },
};
