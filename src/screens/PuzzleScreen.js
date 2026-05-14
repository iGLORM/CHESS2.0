const PuzzleScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  _lastInitData: null,
  _level: null,
  _levelId: null,
  _source: 'curriculum',
  _board: null,
  _sideToMove: 'white',
  _state: 'loading',
  _selectedSquare: null,
  _legalMoves: [],
  _hintsUsed: 0,
  _moveCount: 0,
  _wrongMoveCount: 0,
  _startTime: 0,
  _elapsedSeconds: 0,
  _stars: 0,
  _solutionMoveIndex: 0,
  _coachText: '',
  _timerText: null,
  _coachTextObj: null,
  _hintCountText: null,
  _moveCountText: null,
  _completionOverlay: null,
  _boardHitArea: null,

  init(data) {
    this._lastInitData = data || {};
    this._levelId = data && data.levelId;
    this._source = (data && data.source) || 'curriculum';

    if (this._levelId) {
      this._level = TRAINING_LEVELS.find(l => l.id === this._levelId);
      if (!this._level) {
        switchScreen('levelSelect');
        return;
      }
      this._board = FEN.toBoard(this._level.fen);
      this._sideToMove = this._level.sideToMove || 'white';
    } else if (data && data.fen) {
      this._level = null;
      this._board = FEN.toBoard(data.fen);
      this._sideToMove = data.fen.split(' ')[1] === 'w' ? 'white' : 'black';
    } else {
      switchScreen('trainingHub');
      return;
    }

    this._state = 'playing';
    this._selectedSquare = null;
    this._legalMoves = [];
    this._hintsUsed = 0;
    this._moveCount = 0;
    this._wrongMoveCount = 0;
    this._startTime = Date.now();
    this._elapsedSeconds = 0;
    this._stars = 0;
    this._solutionMoveIndex = 0;
    this._completionOverlay = null;

    this.build();
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });

    const cols = ThemeManager.getCurrentColors();
    const W = PixiPremiumScene.W;
    const H = PixiPremiumScene.H;
    const s = Layout.uiScale || 1;
    const isPortrait = Layout.isPortrait;
    const themeId = store.get('theme') || 'space';

    const title = this._level ? `Level ${this._level.id}` : 'Custom Puzzle';
    const subtitle = this._level ? this._level.title : 'Find the best move';

    this.pixiContainer = PixiPremiumScene.root(title, subtitle, {
      footer: false,
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    // --- Board ---
    PixiBoardRenderer.init(this.pixiContainer);
    PixiBoardRenderer.drawBoard(themeId);
    PixiBoardRenderer.setPieces(this._board, themeId);

    // Board hit area for pointer events (Container + hitArea, not Graphics —
    // Graphics containsPoint is unreliable on Telegram WebView)
    const bx = PixiBoardRenderer.boardOffsetX;
    const by = PixiBoardRenderer.boardOffsetY;
    const bs = PixiBoardRenderer.squareSize * 8;
    this._boardHitArea = new PIXI.Container();
    this._boardHitArea.hitArea = new PIXI.Rectangle(bx, by, bs, bs);
    this._boardHitArea.eventMode = 'static';
    this._boardHitArea.cursor = 'pointer';
    this._boardHitArea.on('pointerdown', (e) => this._onBoardClick(e));
    this.pixiContainer.addChild(this._boardHitArea);

    if (isPortrait) {
      this._buildPortraitUI(cols, s, W, H);
    } else {
      this._buildLandscapeUI(cols, s, W, H);
    }

    this._setCoachText(
      this._level
        ? CoachCharacter.getLine('levelStart')
        : CoachCharacter.getLine('customPuzzle')
    );
  },

  _buildLandscapeUI(cols, s, W, H) {
    const bx = PixiBoardRenderer.boardOffsetX;
    const boardRight = bx + PixiBoardRenderer.squareSize * 8 + 24;
    const panelTop = PixiBoardRenderer.boardOffsetY;
    const boardBottom = panelTop + PixiBoardRenderer.squareSize * 8;

    // --- Left: Coach card ---
    const leftW = Math.max(180, bx - 38);
    const coachH = Math.min(Math.round(200 * s), boardBottom - panelTop);
    PixiPremiumScene.card(this.pixiContainer, 15, panelTop, leftW, coachH, {
      interactive: false,
      alpha: 0.55,
      draw: (card) => {
        const title = PixiPremiumScene.text('Coach Magnus', {
          fontFamily: PixiTextStyles.FONT_TITLE,
          fontSize: Math.round(13 * s),
          fill: cols.accent,
        });
        title.x = 14;
        title.y = 14;
        card.addChild(title);

        this._coachTextObj = PixiPremiumScene.text('', {
          fontFamily: PixiTextStyles.FONT_BODY,
          fontSize: Math.round(14 * s),
          fill: PixiColorUtil.alpha(cols.text, 'cc'),
          wordWrap: true, wordWrapWidth: leftW - 32,
        });
        this._coachTextObj.x = 14;
        this._coachTextObj.y = 38;
        card.addChild(this._coachTextObj);
      },
    });

    // --- Right: Info card ---
    const rightX = boardRight;
    const rightW = Math.max(180, W - boardRight - 15);
    const infoH = Math.min(Math.round(280 * s), boardBottom - panelTop);
    PixiPremiumScene.card(this.pixiContainer, rightX, panelTop, rightW, infoH, {
      interactive: false,
      alpha: 0.55,
      draw: (card) => {
        const pad = 16;
        let cy = 16;

        const addStat = (label, valueKey, fontSize) => {
          const lbl = PixiPremiumScene.text(label, {
            fontFamily: PixiTextStyles.FONT_BODY,
            fontSize: Math.round(12 * s),
            fill: PixiColorUtil.alpha(cols.text, '88'),
          });
          lbl.x = pad;
          lbl.y = cy;
          card.addChild(lbl);
          cy += Math.round(16 * s);

          const val = PixiPremiumScene.text('0', {
            fontFamily: PixiTextStyles.FONT_TITLE,
            fontSize: Math.round((fontSize || 22) * s),
            fill: cols.text,
          });
          val.x = pad;
          val.y = cy;
          card.addChild(val);
          this[valueKey] = val;
          cy += Math.round(32 * s);
        };

        addStat('Time', '_timerText', 22);
        addStat('Moves', '_moveCountText', 20);
        addStat('Hints', '_hintCountText', 20);

        // Stars
        const starSize = Math.round(16 * s);
        const starGap = Math.round(6 * s);
        this._starGraphics = [];
        for (let i = 0; i < 3; i++) {
          const sx = pad + i * (starSize + starGap) + starSize / 2;
          const sy = cy + starSize / 2;
          const star = new PIXI.Graphics();
          star.star(sx, sy, 5, starSize / 2, starSize / 4).fill({
            color: PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '33')),
            alpha: 0.5,
          });
          card.addChild(star);
          this._starGraphics.push({ g: star, cx: sx, cy: sy, r: starSize / 2 });
        }
        this._hintCountText.text = '0/3';
      },
    });

    // --- Bottom bar ---
    const btnY = H - 72;
    PixiPremiumScene.button(this.pixiContainer, 15, btnY, 130, 44, 'Back', () => {
      this._goBack();
    }, { fontSize: Math.round(16 * s) });

    PixiPremiumScene.button(this.pixiContainer, W - 165, btnY, 150, 44, 'Hint', () => {
      this._requestHint();
    }, { fontSize: Math.round(16 * s) });

    if (this._level && this._level.concept) {
      const conceptText = PixiPremiumScene.text(this._level.concept, {
        fontFamily: PixiTextStyles.FONT_BODY,
        fontSize: Math.round(13 * s),
        fill: PixiColorUtil.alpha(cols.text, '66'),
        wordWrap: true, wordWrapWidth: W - 360,
      });
      conceptText.anchor.set(0.5, 0.5);
      conceptText.x = W / 2;
      conceptText.y = btnY + 34;
      this.pixiContainer.addChild(conceptText);
    }
  },

  _buildPortraitUI(cols, s, W, H) {
    const boardBottom = PixiBoardRenderer.boardOffsetY + PixiBoardRenderer.squareSize * 8 + 10;

    // Coach bubble above board
    const coachY = PixiBoardRenderer.boardOffsetY - 50;
    this._coachTextObj = PixiPremiumScene.text('', {
      fontFamily: PixiTextStyles.FONT_BODY,
      fontSize: Math.round(14 * s),
      fill: PixiColorUtil.alpha(cols.text, 'cc'),
      wordWrap: true, wordWrapWidth: W - 60,
    });
    this._coachTextObj.anchor.set(0.5, 1);
    this._coachTextObj.x = W / 2;
    this._coachTextObj.y = coachY;
    this.pixiContainer.addChild(this._coachTextObj);

    // Bottom info bar
    const infoY = boardBottom + 5;
    const colW = W / 4;

    // Timer
    this._timerText = PixiPremiumScene.text('0:00', {
      fontFamily: PixiTextStyles.FONT_TITLE,
      fontSize: Math.round(20 * s),
      fill: cols.text,
    });
    this._timerText.anchor.set(0.5, 0);
    this._timerText.x = colW * 0.5;
    this._timerText.y = infoY;
    this.pixiContainer.addChild(this._timerText);

    // Moves
    this._moveCountText = PixiPremiumScene.text('Moves: 0', {
      fontFamily: PixiTextStyles.FONT_BODY,
      fontSize: Math.round(16 * s),
      fill: cols.text,
    });
    this._moveCountText.anchor.set(0.5, 0);
    this._moveCountText.x = colW * 1.5;
    this._moveCountText.y = infoY;
    this.pixiContainer.addChild(this._moveCountText);

    // Hints
    this._hintCountText = PixiPremiumScene.text('Hints: 0/3', {
      fontFamily: PixiTextStyles.FONT_BODY,
      fontSize: Math.round(16 * s),
      fill: cols.text,
    });
    this._hintCountText.anchor.set(0.5, 0);
    this._hintCountText.x = colW * 2.5;
    this._hintCountText.y = infoY;
    this.pixiContainer.addChild(this._hintCountText);

    // Stars
    this._buildStarDisplay(colW * 3.2, infoY + 2, cols, s);

    // Bottom buttons
    const btnY = H - 65;
    const btnW = Math.min(140, (W - 40) / 2);
    PixiPremiumScene.button(this.pixiContainer, 15, btnY, btnW, 44, 'Back', () => {
      this._goBack();
    }, { fontSize: Math.round(16 * s) });

    PixiPremiumScene.button(this.pixiContainer, W - btnW - 15, btnY, btnW, 44, 'Hint', () => {
      this._requestHint();
    }, { fontSize: Math.round(16 * s) });
  },

  _buildStarDisplay(x, y, cols, s) {
    this._starGraphics = [];
    const starSize = Math.round(16 * s);
    const starGap = Math.round(6 * s);
    for (let i = 0; i < 3; i++) {
      const cx = x + i * (starSize + starGap) + starSize / 2;
      const cy = y + starSize / 2;
      const star = new PIXI.Graphics();
      star.star(cx, cy, 5, starSize / 2, starSize / 4).fill({
        color: PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '33')),
        alpha: 0.5,
      });
      this.pixiContainer.addChild(star);
      this._starGraphics.push({ g: star, cx, cy, r: starSize / 2 });
    }
  },

  _updateStarDisplay(earnedStars, cols) {
    if (!this._starGraphics) return;
    const accentNum = PixiColorUtil.hexToNum(cols.accent);
    for (let i = 0; i < 3; i++) {
      const { g, cx, cy, r } = this._starGraphics[i];
      g.clear();
      const filled = i < earnedStars;
      g.star(cx, cy, 5, r, r / 2).fill({
        color: filled ? accentNum : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '33')),
        alpha: filled ? 1 : 0.5,
      });
    }
  },

  // --- Board interaction ---

  _onBoardClick(e) {
    if (this._state !== 'playing') return;

    const local = this.pixiContainer.toLocal(e.global);
    const sq = PixiBoardRenderer.getSquareAt(local.x, local.y);
    if (!sq) return;

    const { col, row } = sq;
    const piece = this._board.getPiece(row, col);

    if (this._selectedSquare) {
      const move = this._legalMoves.find(m =>
        m.to.row === row && m.to.col === col && !m.promotion
      );
      if (move) {
        this._attemptMove(move);
        return;
      }
      const promoMoves = this._legalMoves.filter(m =>
        m.to.row === row && m.to.col === col && m.promotion
      );
      if (promoMoves.length > 0) {
        const queenPromo = promoMoves.find(m => m.promotion === 'queen') || promoMoves[0];
        this._attemptMove(queenPromo);
        return;
      }
    }

    if (piece && piece.color === this._sideToMove) {
      this._selectedSquare = { row, col };
      const allMoves = GameRules.getLegalMoves(this._board, this._sideToMove);
      this._legalMoves = allMoves.filter(m => m.from.row === row && m.from.col === col);

      PixiBoardRenderer.clearHighlights();
      PixiBoardRenderer.selectSquare(col, row, 0xffff00);
      PixiBoardRenderer.drawLegalMoves(this._legalMoves);

      if (typeof audioManager !== 'undefined' && typeof audioManager.playSelect === 'function') {
        audioManager.playSelect();
      }
    } else {
      this._selectedSquare = null;
      this._legalMoves = [];
      PixiBoardRenderer.clearHighlights();
    }
  },

  // --- Move logic ---

  _moveToUci(move) {
    const fromFile = String.fromCharCode(97 + move.from.col);
    const fromRank = 8 - move.from.row;
    const toFile = String.fromCharCode(97 + move.to.col);
    const toRank = 8 - move.to.row;
    let uci = `${fromFile}${fromRank}${toFile}${toRank}`;
    if (move.promotion) {
      const promoMap = { queen: 'q', rook: 'r', bishop: 'b', knight: 'n' };
      uci += promoMap[move.promotion] || 'q';
    }
    return uci;
  },

  _attemptMove(move) {
    this._moveCount++;
    const themeId = store.get('theme') || 'space';
    const uci = this._moveToUci(move);
    const isCorrect = this._isSolutionMove(uci);

    if (isCorrect) {
      const captured = this._board.getPiece(move.to.row, move.to.col);

      // Remove captured piece sprite immediately to avoid GSAP null ref
      if (captured) {
        const capKey = `${move.to.col},${move.to.row}`;
        const capSprite = PixiBoardRenderer.pieceSprites[capKey];
        if (capSprite) {
          if (capSprite.parent) capSprite.parent.removeChild(capSprite);
          capSprite.destroy();
          delete PixiBoardRenderer.pieceSprites[capKey];
        }
      }

      MoveExecutor.executeMove(this._board, move, this._sideToMove);

      PixiBoardRenderer.movePiece(
        move.from.col, move.from.row,
        move.to.col, move.to.row,
        themeId, () => {
          PixiBoardRenderer.setPieces(this._board, themeId);
          this._afterCorrectMove();
        }
      );

      if (captured && typeof audioManager !== 'undefined' && typeof audioManager.playCapture === 'function') {
        audioManager.playCapture();
      } else if (typeof audioManager !== 'undefined' && typeof audioManager.playMove === 'function') {
        audioManager.playMove();
      }
    } else {
      this._wrongMoveCount++;
      this._state = 'wrongMove';
      this._setCoachText(CoachCharacter.getLine('wrongMove'));
      PixiBoardRenderer.flash(0xff4444);
      PixiBoardRenderer.shake(6);
      if (typeof audioManager !== 'undefined' && typeof audioManager.playError === 'function') {
        audioManager.playError();
      }

      setTimeout(() => {
        if (this._state === 'wrongMove') {
          this._state = 'playing';
        }
      }, 1500);
    }

    this._selectedSquare = null;
    this._legalMoves = [];
    PixiBoardRenderer.clearHighlights();
    this._updateInfoDisplay();
  },

  _isSolutionMove(uci) {
    if (!this._level) return true;

    const sol = this._level.solution;
    if (this._solutionMoveIndex === 0) {
      return uci === sol.primary || (sol.alternatives && sol.alternatives.includes(uci));
    }
    if (sol.continuation && sol.continuation.length > 0) {
      const playerMoveIdx = Math.floor(this._solutionMoveIndex / 2) * 2;
      if (playerMoveIdx < sol.continuation.length) {
        return uci === sol.continuation[playerMoveIdx];
      }
    }
    return true;
  },

  _afterCorrectMove() {
    this._solutionMoveIndex++;
    this._setCoachText(CoachCharacter.getLine('good'));

    if (!this._level) {
      this._solvePuzzle();
      return;
    }

    const sol = this._level.solution;
    const hasCont = sol.continuation && sol.continuation.length > 0;

    if (hasCont) {
      const opponentIdx = this._solutionMoveIndex - 1;
      if (opponentIdx < sol.continuation.length) {
        const opponentUci = sol.continuation[opponentIdx];
        this._solutionMoveIndex++;
        this._playOpponentMove(opponentUci, () => {
          const nextPlayerIdx = this._solutionMoveIndex - 1;
          if (nextPlayerIdx < sol.continuation.length) {
            this._state = 'playing';
            this._setCoachText(CoachCharacter.getLine('good'));
          } else {
            this._solvePuzzle();
          }
        });
        return;
      }
    }

    this._solvePuzzle();
  },

  _playOpponentMove(uci, callback) {
    const opponentColor = this._sideToMove === 'white' ? 'black' : 'white';
    const legalMoves = GameRules.getLegalMoves(this._board, opponentColor);
    const move = BotPersonality._uciToMove(uci, legalMoves);

    if (!move) {
      if (callback) callback();
      return;
    }

    const themeId = store.get('theme') || 'space';
    setTimeout(() => {
      const captured = this._board.getPiece(move.to.row, move.to.col);
      if (captured) {
        const capKey = `${move.to.col},${move.to.row}`;
        const capSprite = PixiBoardRenderer.pieceSprites[capKey];
        if (capSprite) {
          if (capSprite.parent) capSprite.parent.removeChild(capSprite);
          capSprite.destroy();
          delete PixiBoardRenderer.pieceSprites[capKey];
        }
      }

      MoveExecutor.executeMove(this._board, move, opponentColor);

      PixiBoardRenderer.movePiece(
        move.from.col, move.from.row,
        move.to.col, move.to.row,
        themeId, () => {
          PixiBoardRenderer.setPieces(this._board, themeId);
          if (callback) callback();
        }
      );

      if (typeof audioManager !== 'undefined' && typeof audioManager.playMove === 'function') {
        audioManager.playMove();
      }
    }, 600);
  },

  // --- Puzzle completion ---

  _solvePuzzle() {
    this._state = 'solved';
    this._elapsedSeconds = Math.floor((Date.now() - this._startTime) / 1000);
    this._stars = this._calculateStars();
    this._setCoachText(CoachCharacter.getLine('solved'));

    const cols = ThemeManager.getCurrentColors();
    this._updateStarDisplay(this._stars, cols);

    if (this._level) {
      this._saveProgress();
    }

    setTimeout(() => this._showCompletionOverlay(), 600);
  },

  _calculateStars() {
    if (!this._level) return 3;
    const targets = this._level.starTargets;

    if (this._hintsUsed > (targets.maxHintsForThree || 0)) {
      if (this._elapsedSeconds <= targets.twoStarSeconds) return 2;
      return 1;
    }

    if (this._elapsedSeconds <= targets.threeStarSeconds && this._wrongMoveCount === 0) return 3;
    if (this._elapsedSeconds <= targets.twoStarSeconds) return 2;
    return 1;
  },

  _saveProgress() {
    const progress = store.get('trainingProgress');
    const levelData = progress.levels[this._level.id] || {};
    const prevStars = levelData.stars || 0;

    progress.levels[this._level.id] = {
      solved: true,
      stars: Math.max(prevStars, this._stars),
      bestTime: levelData.bestTime
        ? Math.min(levelData.bestTime, this._elapsedSeconds)
        : this._elapsedSeconds,
      attempts: (levelData.attempts || 0) + 1,
    };

    progress.totalStars = Object.values(progress.levels)
      .reduce((sum, l) => sum + (l.stars || 0), 0);

    progress.currentStreak = (progress.currentStreak || 0) + 1;
    progress.bestStreak = Math.max(progress.bestStreak || 0, progress.currentStreak);
    progress.lastPlayedDate = new Date().toISOString().split('T')[0];

    const nextId = this._level.id + 1;
    if (nextId <= 30 && (!progress.unlockedLevel || nextId > progress.unlockedLevel)) {
      progress.unlockedLevel = nextId;
    }

    for (const tag of (this._level.coachTags || [])) {
      if (this._wrongMoveCount > 2) {
        progress.coachMemory.missedTags[tag] = (progress.coachMemory.missedTags[tag] || 0) + 1;
      }
    }

    store.set('trainingProgress', progress);
    store.saveProgress();
  },

  _showCompletionOverlay() {
    const cols = ThemeManager.getCurrentColors();
    const W = PixiPremiumScene.W;
    const H = PixiPremiumScene.H;
    const s = Layout.uiScale || 1;

    const overlay = new PIXI.Container();
    overlay.label = 'completionOverlay';
    overlay.zIndex = 100;

    const bg = new PIXI.Graphics();
    bg.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    bg.eventMode = 'static';
    overlay.addChild(bg);

    const panelW = Math.min(460, W - 60);
    const panelH = Math.round(320 * s);
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;
    PixiPremiumScene.panel(overlay, panelX, panelY, panelW, panelH, {});

    const titleText = PixiPremiumScene.text('Puzzle Complete!', {
      fontFamily: PixiTextStyles.FONT_TITLE,
      fontSize: Math.round(26 * s),
      fill: cols.accent,
    });
    titleText.anchor.set(0.5);
    titleText.x = W / 2;
    titleText.y = panelY + Math.round(45 * s);
    overlay.addChild(titleText);

    // Stars
    const accentNum = PixiColorUtil.hexToNum(cols.accent);
    const starR = Math.round(18 * s);
    const starGap = Math.round(16 * s);
    const totalStarW = 3 * starR * 2 + 2 * starGap;
    let starCX = (W - totalStarW) / 2 + starR;
    const starCY = panelY + Math.round(95 * s);
    for (let i = 0; i < 3; i++) {
      const star = new PIXI.Graphics();
      const filled = i < this._stars;
      star.star(starCX, starCY, 5, starR, starR / 2).fill({
        color: filled ? accentNum : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '33')),
        alpha: filled ? 1 : 0.5,
      });
      overlay.addChild(star);
      starCX += starR * 2 + starGap;
    }

    // Stats
    const mins = Math.floor(this._elapsedSeconds / 60);
    const secs = this._elapsedSeconds % 60;
    const statsLines = [
      `Time: ${mins}:${secs.toString().padStart(2, '0')}`,
      `Moves: ${this._moveCount}`,
      `Hints: ${this._hintsUsed}`,
    ];
    const statsY = starCY + starR + Math.round(20 * s);
    statsLines.forEach((line, i) => {
      const t = PixiPremiumScene.text(line, {
        fontFamily: PixiTextStyles.FONT_BODY,
        fontSize: Math.round(17 * s),
        fill: PixiColorUtil.alpha(cols.text, 'cc'),
      });
      t.anchor.set(0.5);
      t.x = W / 2;
      t.y = statsY + i * Math.round(26 * s);
      overlay.addChild(t);
    });

    // Buttons
    const btnY = panelY + panelH - Math.round(70 * s);
    const btnW = Math.round((panelW - 50) / 2);
    const hasNext = this._level && this._level.id < 30;

    PixiPremiumScene.button(overlay, panelX + 15, btnY, btnW, 48, 'Retry', () => {
      this._removeOverlay();
      this.init(this._lastInitData);
    }, { fontSize: Math.round(16 * s) });

    if (hasNext) {
      PixiPremiumScene.button(overlay, panelX + panelW - btnW - 15, btnY, btnW, 48, 'Next Level', () => {
        this._removeOverlay();
        this.init({ levelId: this._level.id + 1, source: this._source });
      }, { primary: true, fontSize: Math.round(16 * s) });
    } else {
      PixiPremiumScene.button(overlay, panelX + panelW - btnW - 15, btnY, btnW, 48, 'Level Select', () => {
        this._removeOverlay();
        switchScreen('levelSelect');
      }, { primary: true, fontSize: Math.round(16 * s) });
    }

    this.pixiContainer.addChild(overlay);
    this._completionOverlay = overlay;
  },

  _removeOverlay() {
    if (this._completionOverlay && this._completionOverlay.parent) {
      this._completionOverlay.parent.removeChild(this._completionOverlay);
      this._completionOverlay.destroy({ children: true });
    }
    this._completionOverlay = null;
  },

  // --- Hints ---

  _requestHint() {
    if (this._state !== 'playing' || !this._level) return;
    if (this._hintsUsed >= 3) {
      this._revealSolution();
      return;
    }

    const hintText = StockfishCoach.getHintForLevel(this._level, this._hintsUsed);
    this._hintsUsed++;
    this._setCoachText(hintText);

    if (this._hintsUsed >= 3) {
      const sol = this._level.solution.primary;
      const fromCol = sol.charCodeAt(0) - 97;
      const fromRow = 8 - parseInt(sol[1]);
      PixiBoardRenderer.highlightSquare(fromCol, fromRow, 0x44ff44, 0.3);
    }

    this._updateInfoDisplay();
  },

  _revealSolution() {
    if (!this._level) return;
    const sol = this._level.solution;
    this._setCoachText(
      CoachCharacter.getLine('reveal', { move: sol.san, concept: this._level.concept })
    );
    this._hintsUsed = 99;

    const fromCol = sol.primary.charCodeAt(0) - 97;
    const fromRow = 8 - parseInt(sol.primary[1]);
    const toCol = sol.primary.charCodeAt(2) - 97;
    const toRow = 8 - parseInt(sol.primary[3]);
    PixiBoardRenderer.highlightSquare(fromCol, fromRow, 0x00ff00, 0.4);
    PixiBoardRenderer.highlightSquare(toCol, toRow, 0x00ff00, 0.4);

    this._updateInfoDisplay();
  },

  // --- UI updates ---

  _setCoachText(text) {
    this._coachText = text;
    if (this._coachTextObj) {
      this._coachTextObj.text = text;
    }
  },

  _updateInfoDisplay() {
    if (this._moveCountText) {
      this._moveCountText.text = Layout.isPortrait ? `Moves: ${this._moveCount}` : String(this._moveCount);
    }
    if (this._hintCountText) {
      const hintsDisplay = Math.min(this._hintsUsed, 3);
      this._hintCountText.text = Layout.isPortrait ? `Hints: ${hintsDisplay}/3` : `${hintsDisplay}/3`;
    }
  },

  _goBack() {
    if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') {
      audioManager.playButton();
    }
    if (this._completionOverlay) {
      switchScreen('levelSelect');
    } else {
      switchScreen(this._source === 'curriculum' ? 'trainingHub' : 'levelSelect');
    }
  },

  // --- Lifecycle ---

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);

    if (this._state === 'playing' && this._timerText) {
      this._elapsedSeconds = Math.floor((Date.now() - this._startTime) / 1000);
      const mins = Math.floor(this._elapsedSeconds / 60);
      const secs = this._elapsedSeconds % 60;
      this._timerText.text = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  },

  destroy() {
    this._removeOverlay();
    PixiBoardRenderer.destroy();
    this._boardHitArea = null;
    this._timerText = null;
    this._coachTextObj = null;
    this._hintCountText = null;
    this._moveCountText = null;
    this._starGraphics = null;
    PixiPremiumScene.destroy(this);
  },

  handleKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      this._goBack();
    }
    if ((e.key === 'h' || e.key === 'H') && this._state === 'playing') {
      e.preventDefault();
      this._requestHint();
    }
  },
};
