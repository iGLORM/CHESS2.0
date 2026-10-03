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
    this._session = (this._session || 0) + 1;

    if (this._levelId) {
      this._level = TRAINING_LEVELS.find(l => l.id === this._levelId);
      if (!this._level) {
        switchScreen('levelSelect');
        return;
      }
      this._board = FEN.toBoard(this._level.fen);
      this._sideToMove = this._level.sideToMove || 'white';
      this._line = [this._level.solution.primary, ...(this._level.solution.continuation || [])];
    } else if (data && data.fen) {
      this._level = null;
      this._line = null;
      this._board = FEN.toBoard(data.fen);
      this._sideToMove = this._board.turn;
    } else {
      switchScreen('trainingHub');
      return;
    }

    this._state = 'playing';
    this._selectedSquare = null;
    this._legalMoves = [];
    this._hintsUsed = 0;
    this._revealed = false;
    this._moveCount = 0;
    this._wrongMoveCount = 0;
    this._startTime = Date.now();
    this._elapsedSeconds = 0;
    this._stars = 0;
    this._lineIdx = 0;
    this._result = null;
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
    const themeId = store.get('theme') || 'chess20';

    const title = this._level ? `Level ${this._level.id}` : 'Your Position';
    const subtitle = this._level ? this._level.title : `Play it out as ${this._sideToMove === 'white' ? 'White' : 'Black'} against the coach`;

    this.pixiContainer = PixiPremiumScene.root(title, subtitle, {
      footer: false,
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    // --- Board ---
    PixiBoardRenderer.init(this.pixiContainer);
    PixiBoardRenderer.flipped = this._sideToMove === 'black';
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

  // Side panels match the board's height with a 30px gutter; Back and Hint sit
  // under them, aligned to their outer edges.
  _buildLandscapeUI(cols, s, W, H) {
    const G = PixiPremiumScene.sidePanels();
    const pad = 22;
    const heading = (card, text, y) => {
      const t = PixiPremiumScene.text(text, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 14, fill: cols.accent });
      t.x = pad;
      t.y = y;
      card.addChild(t);
      return t;
    };

    // --- Left: the coach (portrait, his line in a speech card), then this puzzle:
    // its place in its set, the lesson, and the set's progress ---
    PixiPremiumScene.card(this.pixiContainer, G.leftX, G.top, G.w, G.h, {
      interactive: false,
      alpha: 0.6,
      draw: (card) => {
        const P = PixiPremiumScene;
        const face = 64;
        card.addChild(new PIXI.Graphics()
          .roundRect(pad, 34, face, face, 8).fill({ color: P.color(cols.accent), alpha: 0.16 })
          .roundRect(pad, 34, face, face, 8).stroke({ color: P.color(cols.accent), alpha: 0.7, width: 2 }));
        const kingTex = PixiPieceRenderer.getTexture(PixiPieceRenderer.withArt(store.get('theme')), 'white', 'king');
        if (kingTex) {
          const k = new PIXI.Sprite(kingTex);
          k.width = k.height = face - 10;
          k.x = pad + 5; k.y = 39;
          card.addChild(k);
        }
        const name = heading(card, 'Coach ' + CoachCharacter.name, 44);
        name.x = pad + face + 14;
        P.fit(name, G.w - pad * 2 - face - 14);
        const role = P.text(CoachCharacter.title, { fontSize: 14, fill: PixiColorUtil.alpha(cols.text, '88') });
        role.x = pad + face + 14; role.y = 68;
        P.fit(role, G.w - pad * 2 - face - 14);
        card.addChild(role);

        // His line, in a speech card with a tail up to the portrait.
        const by = 114, bh = 96;
        card.addChild(new PIXI.Graphics()
          .poly([pad + 22, by, pad + 34, by - 10, pad + 46, by]).fill({ color: 0x000000, alpha: 0.28 })
          .roundRect(pad, by, G.w - pad * 2, bh, 8).fill({ color: 0x000000, alpha: 0.28 })
          .roundRect(pad, by, G.w - pad * 2, bh, 8).stroke({ color: P.color(cols.text), alpha: 0.14, width: 2 }));
        this._coachTextObj = P.text('', {
          fontSize: 16, lineHeight: 22, fill: PixiColorUtil.alpha(cols.text, 'ee'),
          wordWrap: true, wordWrapWidth: G.w - pad * 2 - 24,
        });
        this._coachTextObj.x = pad + 12;
        this._coachTextObj.y = by + 12;
        card.addChild(this._coachTextObj);

        let y = by + bh + 26;
        const band = this._level && typeof TRAINING_BANDS !== 'undefined' && TRAINING_BANDS.find(b => b.id === this._level.band);
        if (this._level) {
          card.addChild(new PIXI.Graphics().rect(pad, y - 10, G.w - pad * 2, 2).fill({ color: P.color(cols.text), alpha: 0.12 }));
          const tag = P.text(band ? `PUZZLE ${band.levels.indexOf(this._level.id) + 1} OF ${band.levels.length}  ·  ${band.name.toUpperCase()}` : `PUZZLE ${this._level.id}`,
            { fontSize: 12, fontWeight: '900', fill: PixiColorUtil.alpha(cols.text, '77') });
          tag.x = pad; tag.y = y + 4;
          P.fit(tag, G.w - pad * 2);
          card.addChild(tag);
          const title = heading(card, this._level.title, y + 26);
          P.fit(title, G.w - pad * 2);
          y += 60;
        }
        if (this._level && this._level.concept) {
          const concept = P.text(this._level.concept, {
            fontSize: 16, lineHeight: 23, fill: PixiColorUtil.alpha(cols.text, 'bb'),
            wordWrap: true, wordWrapWidth: G.w - pad * 2,
          });
          concept.x = pad;
          concept.y = y;
          card.addChild(concept);
        }

        // The set's five puzzles as pips: solved (with its stars), this one, still to do.
        if (band) {
          const levels = (store.get('trainingProgress') || {}).levels || {};
          const pip = 30, gap = 10, total = band.levels.length * pip + (band.levels.length - 1) * gap;
          const px = Math.round((G.w - total) / 2), py = G.h - 70;
          const lbl = P.text('THIS SET', { fontSize: 12, fontWeight: '900', fill: PixiColorUtil.alpha(cols.text, '66') });
          lbl.anchor.set(0.5, 0);
          lbl.x = G.w / 2; lbl.y = py - 24;
          card.addChild(lbl);
          band.levels.forEach((id, i) => {
            const d = levels[id] || {}, current = id === this._level.id;
            const x = px + i * (pip + gap);
            const g = new PIXI.Graphics().roundRect(x, py, pip, pip, 6)
              .fill({ color: d.solved ? P.color(cols.accent) : 0x000000, alpha: d.solved ? 0.85 : 0.3 })
              .roundRect(x, py, pip, pip, 6)
              .stroke({ color: P.color(current ? cols.accent : cols.text), alpha: current ? 1 : 0.25, width: current ? 3 : 2 });
            card.addChild(g);
            const n = P.text(String(i + 1), { fontSize: 14, fontWeight: '900', fill: d.solved ? '#1a1024' : PixiColorUtil.alpha(cols.text, current ? 'ff' : '88') });
            n.anchor.set(0.5);
            n.x = x + pip / 2; n.y = py + pip / 2 + 1;
            card.addChild(n);
            if (d.solved && typeof PixiStar !== 'undefined') {
              const row = PixiStar.row(3, d.stars || 0, 3, 1);
              row.x = x + pip / 2 - row.width / 2; row.y = py + pip + 8;
              card.addChild(row);
            }
          });
        }
      },
    });

    // --- Right: timer, moves, hints and stars ---
    PixiPremiumScene.card(this.pixiContainer, G.rightX, G.top, G.w, G.h, {
      interactive: false,
      alpha: 0.6,
      draw: (card) => {
        heading(card, 'Progress', 36);
        let cy = 84;
        const addStat = (label, valueKey) => {
          const lbl = PixiPremiumScene.text(label, { fontSize: 17, fontWeight: '700', fill: PixiColorUtil.alpha(cols.text, '99') });
          lbl.anchor.set(0, 0.5);
          lbl.x = pad;
          lbl.y = cy;
          card.addChild(lbl);
          const val = PixiPremiumScene.text('0', { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 22, fill: cols.text });
          val.anchor.set(1, 0.5);
          val.x = G.w - pad;
          val.y = cy;
          card.addChild(val);
          this[valueKey] = val;
          card.addChild(new PIXI.Graphics().rect(pad, cy + 28, G.w - pad * 2, 2).fill({ color: PixiPremiumScene.color(cols.text), alpha: 0.1 }));
          cy += 60;
        };
        addStat('Time', '_timerText');
        addStat('Moves', '_moveCountText');
        addStat('Hints', '_hintCountText');

        const starSize = 30;
        const starGap = 14;
        const startX = Math.round((G.w - (3 * starSize + 2 * starGap)) / 2);
        this._starGraphics = [];
        for (let i = 0; i < 3; i++) {
          const sx = startX + i * (starSize + starGap) + starSize / 2;
          const sy = cy + 10;
          const star = new PIXI.Graphics();
          star.star(sx, sy, 5, starSize / 2, starSize / 4).fill({
            color: PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '33')),
            alpha: 0.5,
          });
          card.addChild(star);
          this._starGraphics.push({ g: star, cx: sx, cy: sy, r: starSize / 2 });
        }
        this._hintCountText.text = this._level ? '0/3' : '0';
      },
    });

    PixiPremiumScene.button(this.pixiContainer, G.leftX, G.buttonY, 160, 44, 'Back', () => this._goBack(), { icon: 'back' });
    PixiPremiumScene.button(this.pixiContainer, G.rightX + G.w - 160, G.buttonY, 160, 44, 'Hint', () => this._requestHint(), { icon: 'spark' });
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
      const targets = this._legalMoves.filter(m => m.to.row === row && m.to.col === col);
      if (targets.length > 0) {
        // Promotions: take the queen unless the solution wants another piece.
        const wanted = this._line && this._line[this._lineIdx];
        const move = targets.find(m => wanted && this._moveToUci(m) === wanted)
          || targets.find(m => !m.promotion || m.promotion === 'queen') || targets[0];
        this._attemptMove(move);
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
    return BotPersonality.moveToUci(move);
  },

  _clearSelection() {
    this._selectedSquare = null;
    this._legalMoves = [];
    PixiBoardRenderer.clearHighlights();
  },

  // True while this screen is still showing the same attempt (timers and
  // engine replies can arrive after the player has left or retried).
  _alive(session) {
    return session === this._session && this.pixiContainer && !this.pixiContainer.destroyed;
  },

  // Plays a move on the board with its animation and sound, then calls done.
  _applyMove(move, color, done) {
    const session = this._session;
    const themeId = store.get('theme') || 'chess20';
    const captured = this._board.getPiece(move.to.row, move.to.col);
    if (captured) {
      // Remove the captured sprite first so the tween never touches a destroyed one.
      const capKey = `${move.to.col},${move.to.row}`;
      const capSprite = PixiBoardRenderer.pieceSprites[capKey];
      if (capSprite) {
        if (capSprite.parent) capSprite.parent.removeChild(capSprite);
        capSprite.destroy();
        delete PixiBoardRenderer.pieceSprites[capKey];
      }
    }
    MoveExecutor.executeMove(this._board, move, color);
    PixiBoardRenderer.movePiece(move.from.col, move.from.row, move.to.col, move.to.row, themeId, () => {
      if (!this._alive(session)) return;
      PixiBoardRenderer.setPieces(this._board, themeId);
      PixiBoardRenderer.clearHighlights();
      PixiBoardRenderer.highlightSquare(move.from.col, move.from.row, 0xffe066, 0.22);
      PixiBoardRenderer.highlightSquare(move.to.col, move.to.row, 0xffe066, 0.32);
      if (done) done();
    });
    if (typeof audioManager !== 'undefined') {
      if (captured && typeof audioManager.playCapture === 'function') audioManager.playCapture();
      else if (typeof audioManager.playMove === 'function') audioManager.playMove();
    }
  },

  _attemptMove(move) {
    this._moveCount++;
    this._clearSelection();
    this._updateInfoDisplay();
    if (!this._level) {
      this._sandboxMove(move);
      return;
    }

    const uci = this._moveToUci(move);
    if (this._isSolutionMove(uci, move)) {
      this._state = 'animating';
      this._applyMove(move, this._sideToMove, () => this._afterCorrectMove());
      return;
    }

    // Not the move we had in mind: let Stockfish judge whether it wins just as well.
    const session = this._session;
    this._state = 'checking';
    this._setCoachText(CoachCharacter.getLine('checking'));
    this._engineAccepts(move).then((ok) => {
      if (!this._alive(session)) return;
      if (ok) {
        this._state = 'animating';
        this._applyMove(move, this._sideToMove, () => {
          this._setCoachText(CoachCharacter.getLine('alsoWorks'));
          this._solvePuzzle(true);
        });
      } else {
        this._wrongMove();
      }
    });
  },

  _wrongMove() {
    const session = this._session;
    this._wrongMoveCount++;
    this._state = 'wrongMove';
    this._setCoachText(CoachCharacter.getLine('wrongMove'));
    PixiBoardRenderer.flash(0xff4444);
    PixiBoardRenderer.shake(6);
    if (typeof audioManager !== 'undefined' && typeof audioManager.playError === 'function') {
      audioManager.playError();
    }
    setTimeout(() => {
      if (this._alive(session) && this._state === 'wrongMove') this._state = 'playing';
    }, 700);
  },

  // The next move of the solution line, or any other checkmate on the last move.
  _isSolutionMove(uci, move) {
    const line = this._line;
    if (uci === line[this._lineIdx]) return true;
    if (this._lineIdx === 0 && (this._level.solution.alternatives || []).includes(uci)) return true;
    return this._lineIdx === line.length - 1 && this._givesMate(move);
  },

  _givesMate(move) {
    const after = this._board.clone();
    MoveExecutor.executeMove(after, move, this._sideToMove);
    return GameRules.isCheckmate(after, after.turn);
  },

  // Player's score for a position with the other side to move, in centipawns
  // (mates count as +/-100000), or null if Stockfish can't answer.
  async _scoreAfter(move) {
    const after = this._board.clone();
    MoveExecutor.executeMove(after, move, this._sideToMove);
    const status = GameRules.getGameStatus(after, after.turn);
    if (status.status === 'checkmate') return 100000;
    if (status.status === 'stalemate' || status.status === 'draw') return 0;
    const res = await BotPersonality.analyse(FEN.fromBoard(after, after.turn), 12);
    if (!res) return null;
    if (res.mate !== null) return res.mate < 0 ? 100000 : -100000;
    return res.scoreCp === null ? null : -res.scoreCp;
  },

  // A different move counts only when the intended one wins and this one wins about as well.
  async _engineAccepts(move) {
    try {
      const legal = GameRules.getLegalMoves(this._board, this._sideToMove);
      const intended = BotPersonality._uciToMove(this._line[this._lineIdx], legal);
      if (!intended) return false;
      const target = await this._scoreAfter(intended);
      if (target === null || target < 300) return false;
      const mine = await this._scoreAfter(move);
      return mine !== null && mine >= 300 && mine >= Math.min(target, 20000) - 150;
    } catch (_) {
      return false;
    }
  },

  _afterCorrectMove() {
    this._lineIdx++;
    const reply = this._line[this._lineIdx];
    if (!reply) {
      this._solvePuzzle();
      return;
    }
    // The opponent's scripted reply, then it's the player's turn again.
    this._setCoachText(CoachCharacter.getLine('good'));
    const session = this._session;
    setTimeout(() => {
      if (!this._alive(session)) return;
      const opp = this._sideToMove === 'white' ? 'black' : 'white';
      const move = BotPersonality._uciToMove(reply, GameRules.getLegalMoves(this._board, opp));
      if (!move) { this._solvePuzzle(); return; }
      this._applyMove(move, opp, () => {
        this._lineIdx++;
        if (this._lineIdx >= this._line.length) { this._solvePuzzle(); return; }
        this._state = 'playing';
        this._setCoachText(CoachCharacter.getLine('levelStart'));
      });
    }, 450);
  },

  // --- Custom positions: play them out against Stockfish ---

  _sandboxMove(move) {
    const session = this._session;
    this._state = 'animating';
    this._applyMove(move, this._sideToMove, () => {
      const opp = this._sideToMove === 'white' ? 'black' : 'white';
      if (this._sandboxOver(opp)) return;
      this._setCoachText(CoachCharacter.getLine('opponentThinking'));
      const fen = FEN.fromBoard(this._board, opp);
      const started = Date.now();
      BotPersonality.bestMove(fen, { skill: 20, movetime: 700 }).then((uci) => {
        if (!this._alive(session)) return;
        const legal = GameRules.getLegalMoves(this._board, opp);
        const reply = (uci && BotPersonality._uciToMove(uci, legal)) || legal[Math.floor(Math.random() * legal.length)];
        setTimeout(() => {
          if (!this._alive(session)) return;
          this._applyMove(reply, opp, () => {
            if (this._sandboxOver(this._sideToMove)) return;
            this._state = 'playing';
            this._setCoachText(this._board.inCheck ? 'Check! Get your king to safety.' : 'Your move.');
          });
        }, Math.max(0, 450 - (Date.now() - started)));
      });
    });
  },

  // Ends the custom game if `color` (to move) is mated, stalemated or it's a draw.
  _sandboxOver(color) {
    const status = GameRules.getGameStatus(this._board, color);
    if (status.status === 'checkmate') {
      this._result = status.winner === this._sideToMove ? 'win' : 'loss';
    } else if (status.status === 'stalemate' || status.status === 'draw') {
      this._result = 'draw';
    } else {
      return false;
    }
    this._state = 'solved';
    this._elapsedSeconds = Math.floor((Date.now() - this._startTime) / 1000);
    this._setCoachText(CoachCharacter.getLine({ win: 'sandboxWin', loss: 'sandboxLoss', draw: 'sandboxDraw' }[this._result]));
    if (this._result === 'win') this._updateStarDisplay(3, ThemeManager.getCurrentColors());
    const session = this._session;
    setTimeout(() => { if (this._alive(session)) this._showCompletionOverlay(); }, 700);
    return true;
  },

  // --- Puzzle completion ---

  _solvePuzzle(keepCoachText) {
    this._state = 'solved';
    this._result = 'win';
    this._elapsedSeconds = Math.floor((Date.now() - this._startTime) / 1000);
    this._stars = this._calculateStars();
    if (!keepCoachText) this._setCoachText(CoachCharacter.getLine('solved'));

    const cols = ThemeManager.getCurrentColors();
    this._updateStarDisplay(this._stars, cols);
    this._saveProgress();

    const session = this._session;
    setTimeout(() => { if (this._alive(session)) this._showCompletionOverlay(); }, 700);
  },

  // Super User's W x3: solves the puzzle (or wins the board-editor game) at once.
  superWin() {
    if (!this._board || this._state === 'solved') return false;
    this._session = (this._session || 0) + 1;   // drop any pending reply or check
    if (this._level) {
      this._solvePuzzle();
    } else {
      this._state = 'solved';
      this._result = 'win';
      this._elapsedSeconds = Math.floor((Date.now() - this._startTime) / 1000);
      this._setCoachText(CoachCharacter.getLine('sandboxWin'));
      this._updateStarDisplay(3, ThemeManager.getCurrentColors());
      const session = this._session;
      setTimeout(() => { if (this._alive(session)) this._showCompletionOverlay(); }, 700);
    }
    if (typeof audioManager !== 'undefined' && audioManager.playVictory) audioManager.playVictory();
    return true;
  },

  _calculateStars() {
    if (this._revealed) return 1;
    const targets = this._level.starTargets;
    const t = this._elapsedSeconds;
    if (this._hintsUsed > (targets.maxHintsForThree || 0) || this._wrongMoveCount > 0) {
      return (t <= targets.twoStarSeconds && this._hintsUsed <= 1 && this._wrongMoveCount <= 1) ? 2 : 1;
    }
    if (t <= targets.threeStarSeconds) return 3;
    return t <= targets.twoStarSeconds ? 2 : 1;
  },

  _saveProgress() {
    const progress = store.get('trainingProgress');
    progress.levels = progress.levels || {};
    progress.coachMemory = progress.coachMemory || { missedTags: {} };
    progress.coachMemory.missedTags = progress.coachMemory.missedTags || {};
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

    // The streak counts days in a row with at least one solved puzzle.
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (progress.lastPlayedDate !== today) {
      progress.currentStreak = progress.lastPlayedDate === yesterday ? (progress.currentStreak || 0) + 1 : 1;
    }
    progress.bestStreak = Math.max(progress.bestStreak || 0, progress.currentStreak || 1);
    progress.lastPlayedDate = today;

    const nextId = this._level.id + 1;
    if (nextId <= TRAINING_LEVELS.length && (!progress.unlockedLevel || nextId > progress.unlockedLevel)) {
      progress.unlockedLevel = nextId;
    }

    if (this._wrongMoveCount > 2) {
      for (const tag of (this._level.coachTags || [])) {
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
    const custom = !this._level;

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

    const heading = custom
      ? { win: 'You Won!', loss: 'Checkmated', draw: 'Draw' }[this._result]
      : 'Puzzle Complete!';
    const titleText = PixiPremiumScene.text(heading, {
      fontFamily: PixiTextStyles.FONT_TITLE,
      fontSize: Math.round(26 * s),
      fill: this._result === 'loss' ? '#ff7a7a' : cols.accent,
    });
    titleText.anchor.set(0.5);
    titleText.x = W / 2;
    titleText.y = panelY + Math.round(50 * s);
    overlay.addChild(titleText);

    // Stars (puzzles only)
    const accentNum = PixiColorUtil.hexToNum(cols.accent);
    const starR = Math.round(18 * s);
    const starCY = panelY + Math.round(100 * s);
    if (!custom) {
      const starGap = Math.round(16 * s);
      const totalStarW = 3 * starR * 2 + 2 * starGap;
      let starCX = (W - totalStarW) / 2 + starR;
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
    }

    const mins = Math.floor(this._elapsedSeconds / 60);
    const secs = this._elapsedSeconds % 60;
    const statsLines = [
      `Time: ${mins}:${secs.toString().padStart(2, '0')}`,
      `Moves: ${this._moveCount}`,
      custom ? '' : `Hints: ${this._revealed ? 'answer shown' : this._hintsUsed}`,
    ].filter(Boolean);
    const statsY = custom ? panelY + Math.round(105 * s) : starCY + starR + Math.round(22 * s);
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
    const leftX = panelX + 15;
    const rightX = panelX + panelW - btnW - 15;
    const fontSize = Math.round(16 * s);

    if (custom) {
      PixiPremiumScene.button(overlay, leftX, btnY, btnW, 48, 'Edit Board', () => this._goBack(), { fontSize, icon: 'back' });
      PixiPremiumScene.button(overlay, rightX, btnY, btnW, 48, 'Play Again', () => switchScreen('puzzle', this._lastInitData), { primary: true, fontSize, icon: 'play' });
    } else {
      PixiPremiumScene.button(overlay, leftX, btnY, btnW, 48, 'Retry', () => switchScreen('puzzle', this._lastInitData), { fontSize });
      const nextId = this._level.id + 1;
      const progress = store.get('trainingProgress');
      const hasNext = TRAINING_LEVELS.some(l => l.id === nextId) && LevelSelectScreen._isLevelUnlocked(nextId, progress);
      if (hasNext) {
        PixiPremiumScene.button(overlay, rightX, btnY, btnW, 48, 'Next Level', () => {
          switchScreen('puzzle', { levelId: nextId, source: this._source });
        }, { primary: true, fontSize, icon: 'play' });
      } else {
        PixiPremiumScene.button(overlay, rightX, btnY, btnW, 48, 'Level Select', () => switchScreen('levelSelect'), { primary: true, fontSize });
      }
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
    if (this._state !== 'playing') return;
    if (!this._level) {
      this._sandboxHint();
      return;
    }
    if (this._hintsUsed >= 3) {
      this._revealSolution();
      return;
    }

    const hintText = StockfishCoach.getHintForLevel(this._level, this._hintsUsed);
    this._hintsUsed++;
    this._setCoachText(hintText);
    this._showHintSquares(false);
    this._updateInfoDisplay();
  },

  // Highlights the next move of the line: from-square only, or the whole move.
  _showHintSquares(full) {
    if (!this._level || this._hintsUsed < 3) return;
    const uci = this._line[this._lineIdx];
    PixiBoardRenderer.clearHighlights();
    PixiBoardRenderer.highlightSquare(uci.charCodeAt(0) - 97, 8 - parseInt(uci[1], 10), 0x44ff44, 0.4);
    if (full) PixiBoardRenderer.highlightSquare(uci.charCodeAt(2) - 97, 8 - parseInt(uci[3], 10), 0x44ff44, 0.4);
  },

  _revealSolution() {
    const sol = this._level.solution;
    this._revealed = true;
    this._setCoachText(this._lineIdx === 0
      ? CoachCharacter.getLine('reveal', { move: sol.san, concept: this._level.concept })
      : 'Play the highlighted move.');
    this._showHintSquares(true);
    this._updateInfoDisplay();
  },

  // Custom positions: Stockfish shows the best move.
  _sandboxHint() {
    const session = this._session;
    this._state = 'checking';
    this._setCoachText(CoachCharacter.getLine('checking'));
    BotPersonality.analyse(FEN.fromBoard(this._board, this._sideToMove), 14).then((res) => {
      if (!this._alive(session)) return;
      this._state = 'playing';
      if (!res || !res.bestMove) { this._setCoachText('I could not find a move. Trust your instincts!'); return; }
      this._hintsUsed++;
      this._updateInfoDisplay();
      const u = res.bestMove;
      PixiBoardRenderer.clearHighlights();
      PixiBoardRenderer.highlightSquare(u.charCodeAt(0) - 97, 8 - parseInt(u[1], 10), 0x44ff44, 0.4);
      PixiBoardRenderer.highlightSquare(u.charCodeAt(2) - 97, 8 - parseInt(u[3], 10), 0x44ff44, 0.4);
      const verdict = res.mate !== null
        ? (res.mate > 0 ? `You have mate in ${res.mate}!` : `Careful: you are getting mated in ${-res.mate}.`)
        : (res.scoreCp > 150 ? 'You are winning.' : res.scoreCp < -150 ? 'You are worse here. Fight on!' : 'The position is about equal.');
      this._setCoachText(`${verdict} Try the highlighted move.`);
    });
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
      const shown = this._level ? `${hintsDisplay}/3` : String(this._hintsUsed);
      this._hintCountText.text = Layout.isPortrait ? `Hints: ${shown}` : shown;
    }
  },

  _goBack() {
    if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') {
      audioManager.playButton();
    }
    if (this._level) switchScreen('levelSelect');
    else switchScreen('boardEditor', { keep: true });
  },

  // --- Lifecycle ---

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);

    if (this._state !== 'solved' && this._timerText) {
      this._elapsedSeconds = Math.floor((Date.now() - this._startTime) / 1000);
      const mins = Math.floor(this._elapsedSeconds / 60);
      const secs = this._elapsedSeconds % 60;
      this._timerText.text = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  },

  destroy() {
    this._session = (this._session || 0) + 1;
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
