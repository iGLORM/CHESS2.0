const BoardEditorScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  _board: null,
  _selectedPieceType: 'queen',
  _selectedPieceColor: 'white',
  _eraseMode: false,
  _fenText: null,
  _paletteSprites: [],
  _statusText: null,
  _boardHitArea: null,

  _turn: 'white',

  // data.keep: coming back from playing the position, so keep the board.
  init(data) {
    if (!(data && data.keep && this._board)) {
      this._board = Board.createEmpty();
      this._turn = 'white';
    }
    this._selectedPieceType = 'queen';
    this._selectedPieceColor = 'white';
    this._eraseMode = false;
    this.build();
    this._updateFenDisplay();
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });

    const cols = ThemeManager.getCurrentColors();
    const W = PixiPremiumScene.W;
    const H = PixiPremiumScene.H;
    const s = Layout.uiScale || 1;
    const isPortrait = Layout.isPortrait;
    const themeId = store.get('theme') || 'chess20';

    this.pixiContainer = PixiPremiumScene.root('Board Editor', 'Create custom positions', {
      footer: false,
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    PixiBoardRenderer.init(this.pixiContainer);
    PixiBoardRenderer.drawBoard(themeId);
    PixiBoardRenderer.setPieces(this._board, themeId);

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
      this._buildPortraitUI(cols, s, W, H, themeId);
    } else {
      this._buildLandscapeUI(cols, s, W, H, themeId);
    }
  },

  _buildLandscapeUI(cols, s, W, H, themeId) {
    const G = PixiPremiumScene.sidePanels();
    const pad = 22;
    const heading = (card, text, y) => {
      const t = PixiPremiumScene.text(text, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 14, fill: cols.accent });
      t.x = pad;
      t.y = y;
      card.addChild(t);
    };

    // --- Left: piece palette ---
    PixiPremiumScene.card(this.pixiContainer, G.leftX, G.top, G.w, G.h, {
      interactive: false,
      alpha: 0.6,
      draw: (card) => {
        heading(card, 'Pieces', 36);
        this._buildPaletteInCard(card, pad, 70, cols, 1, themeId, G.w - pad * 2);
      },
    });

    // --- Right: FEN and actions ---
    PixiPremiumScene.card(this.pixiContainer, G.rightX, G.top, G.w, G.h, {
      interactive: false,
      alpha: 0.6,
      draw: (card) => {
        heading(card, 'FEN', 36);
        this._fenText = PixiPremiumScene.text('8/8/8/8/8/8/8/8 w - - 0 1', {
          fontSize: 14, lineHeight: 19, fill: PixiColorUtil.alpha(cols.text, 'bb'),
          wordWrap: true, wordWrapWidth: G.w - pad * 2, breakWords: true,
        });
        this._fenText.x = pad;
        this._fenText.y = 64;
        card.addChild(this._fenText);
        this._statusText = PixiPremiumScene.text('', { fontSize: 14, fontWeight: '700', fill: cols.accent, wordWrap: true, wordWrapWidth: G.w - pad * 2 });
        this._statusText.x = pad;
        this._statusText.y = 110;
        card.addChild(this._statusText);
      },
    });

    const actions = [
      { text: 'Paste FEN', action: () => this._importFen() },
      { text: 'Copy FEN', action: () => this._exportFen() },
      { text: 'Standard Setup', action: () => this._loadStandardPosition(themeId) },
      { text: 'Clear Board', action: () => this._clearBoard(themeId) },
    ];
    const btnH = 46;
    const btnGap = 12;
    const btnW = G.w - pad * 2;
    let y = G.top + 150;
    actions.forEach((act) => {
      PixiPremiumScene.button(this.pixiContainer, G.rightX + pad, y, btnW, btnH, act.text, act.action, { fontSize: 16 });
      y += btnH + btnGap;
    });
    PixiPremiumScene.button(this.pixiContainer, G.rightX + pad, G.top + G.h - pad - 54, btnW, 54, 'Play From Here', () => this._playFromHere(), { primary: true, icon: 'play', fontSize: 18 });

    PixiPremiumScene.button(this.pixiContainer, G.leftX, G.buttonY, 160, 44, 'Back', () => switchScreen('trainingHub'), { icon: 'back' });
  },

  _buildPortraitUI(cols, s, W, H, themeId) {
    const boardBottom = PixiBoardRenderer.boardOffsetY + PixiBoardRenderer.squareSize * 8 + 5;
    const paletteY = PixiBoardRenderer.boardOffsetY - 55;

    this._buildPaletteRow(paletteY, cols, s, themeId, W);

    this._fenText = PixiPremiumScene.text('8/8/8/8/8/8/8/8 w - - 0 1', {
      fontFamily: PixiTextStyles.FONT_BODY,
      fontSize: Math.round(11 * s),
      fill: PixiColorUtil.alpha(cols.text, 'aa'),
      wordWrap: true, wordWrapWidth: W - 30,
    });
    this._fenText.x = 15;
    this._fenText.y = boardBottom + 5;
    this.pixiContainer.addChild(this._fenText);

    this._statusText = PixiPremiumScene.text('', {
      fontFamily: PixiTextStyles.FONT_BODY,
      fontSize: Math.round(12 * s),
      fill: cols.accent,
    });
    this._statusText.anchor.set(0.5, 0);
    this._statusText.x = W / 2;
    this._statusText.y = boardBottom + 28;
    this.pixiContainer.addChild(this._statusText);

    const btnY = PixiPremiumScene.bottomButtonY(42);
    const btnW = Math.floor((W - 72 - 30) / 4);
    let bx = 36;
    const portActions = [
      { text: 'Back', action: () => { if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton(); switchScreen('trainingHub'); } },
      { text: 'Import', action: () => this._importFen() },
      { text: 'Clear', action: () => this._clearBoard(themeId) },
      { text: 'Play', action: () => this._playFromHere(), primary: true },
    ];
    portActions.forEach((act) => {
      PixiPremiumScene.button(this.pixiContainer, bx, btnY, btnW, 42, act.text, act.action, {
        primary: act.primary || false,
        fontSize: Math.round(14 * s),
      });
      bx += btnW + 10;
    });
  },

  _buildPaletteInCard(card, startX, startY, cols, s, themeId, availW) {
    const types = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
    const gap = 10;
    const pieceSize = Math.min(72, Math.floor((availW - gap * 2) / 3));
    this._paletteSprites = [];

    types.forEach((type, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const px = startX + col * (pieceSize + gap);
      const py = startY + row * (pieceSize + gap);

      const container = new PIXI.Container();
      container.x = px;
      container.y = py;

      const bg = new PIXI.Graphics();
      const isSelected = (type === this._selectedPieceType && !this._eraseMode);
      bg.roundRect(0, 0, pieceSize, pieceSize, 6).fill({
        color: isSelected ? PixiColorUtil.hexToNum(cols.accent) : PixiColorUtil.hexToNum(cols.panel),
        alpha: isSelected ? 0.5 : 0.25,
      });
      if (isSelected) {
        bg.roundRect(0, 0, pieceSize, pieceSize, 6).stroke({ color: PixiColorUtil.hexToNum(cols.accent), alpha: 0.9, width: 2 });
      }
      container.addChild(bg);

      const sprite = PixiPieceRenderer.createSprite(themeId, this._selectedPieceColor, type);
      sprite.width = pieceSize - 10;
      sprite.height = pieceSize - 10;
      sprite.anchor.set(0.5);
      sprite.x = pieceSize / 2;
      sprite.y = pieceSize / 2;
      container.addChild(sprite);

      container.eventMode = 'static';
      container.cursor = 'pointer';
      container.hitArea = new PIXI.Rectangle(0, 0, pieceSize, pieceSize);
      container.on('pointerdown', () => {
        this._selectedPieceType = type;
        this._eraseMode = false;
        this._updatePaletteSelection(cols);
      });

      card.addChild(container);
      this._paletteSprites.push({ container, bg, type, pieceSize });
    });

    // Color toggle below palette
    const toggleY = startY + 2 * (pieceSize + gap) + 14;
    const toggleW = availW;

    const colorBtn = this._makeInCardButton(card, startX, toggleY, toggleW, 42,
      `Color: ${this._selectedPieceColor}`, cols, s, () => {
        this._selectedPieceColor = this._selectedPieceColor === 'white' ? 'black' : 'white';
        colorBtn._label.text = `Color: ${this._selectedPieceColor}`;
        this._refreshPalette(themeId);
      });

    const eraseBtn = this._makeInCardButton(card, startX, toggleY + 54, toggleW, 42,
      `Erase Mode: ${this._eraseMode ? 'ON' : 'OFF'}`, cols, s, () => {
        this._eraseMode = !this._eraseMode;
        eraseBtn._label.text = `Erase Mode: ${this._eraseMode ? 'ON' : 'OFF'}`;
        this._updatePaletteSelection(cols);
      });

    const turnBtn = this._makeInCardButton(card, startX, toggleY + 108, toggleW, 42,
      this._turnLabel(), cols, s, () => {
        this._turn = this._turn === 'white' ? 'black' : 'white';
        turnBtn._label.text = this._turnLabel();
        this._updateFenDisplay();
      });
  },

  _buildPaletteRow(y, cols, s, themeId, W) {
    const types = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
    const pieceSize = Math.round(40 * s);
    const gap = Math.round(6 * s);
    const totalW = types.length * (pieceSize + gap) - gap;
    const startX = Math.floor((W - totalW - 120) / 2);
    this._paletteSprites = [];

    types.forEach((type, i) => {
      const px = startX + i * (pieceSize + gap);
      const container = new PIXI.Container();
      container.x = px;
      container.y = y;

      const bg = new PIXI.Graphics();
      const isSelected = (type === this._selectedPieceType && !this._eraseMode);
      bg.roundRect(0, 0, pieceSize, pieceSize, 6).fill({
        color: isSelected ? PixiColorUtil.hexToNum(cols.accent) : PixiColorUtil.hexToNum(cols.panel),
        alpha: isSelected ? 0.5 : 0.25,
      });
      if (isSelected) {
        bg.roundRect(0, 0, pieceSize, pieceSize, 6).stroke({ color: PixiColorUtil.hexToNum(cols.accent), alpha: 0.9, width: 2 });
      }
      container.addChild(bg);

      const sprite = PixiPieceRenderer.createSprite(themeId, this._selectedPieceColor, type);
      sprite.width = pieceSize - 8;
      sprite.height = pieceSize - 8;
      sprite.anchor.set(0.5);
      sprite.x = pieceSize / 2;
      sprite.y = pieceSize / 2;
      container.addChild(sprite);

      container.eventMode = 'static';
      container.cursor = 'pointer';
      container.hitArea = new PIXI.Rectangle(0, 0, pieceSize, pieceSize);
      container.on('pointerdown', () => {
        this._selectedPieceType = type;
        this._eraseMode = false;
        this._updatePaletteSelection(cols);
      });

      this.pixiContainer.addChild(container);
      this._paletteSprites.push({ container, bg, type, pieceSize });
    });

    // Toggle buttons
    const toggleX = startX + totalW + Math.round(10 * s);
    const tSize = Math.round(34 * s);
    this._makeToggleBtn(toggleX, y, tSize, this._selectedPieceColor === 'white' ? 'W' : 'B', cols, s, (btn) => {
      this._selectedPieceColor = this._selectedPieceColor === 'white' ? 'black' : 'white';
      btn._label.text = this._selectedPieceColor === 'white' ? 'W' : 'B';
      this._refreshPalette(themeId);
    });
    this._makeToggleBtn(toggleX + tSize + 4, y, tSize, 'X', cols, s, (btn) => {
      this._eraseMode = !this._eraseMode;
      this._updatePaletteSelection(cols);
    });
    // Side to move: the player plays this side from the position.
    this._makeToggleBtn(toggleX + (tSize + 4) * 2, y, tSize, this._turn === 'white' ? 'w' : 'b', cols, s, (btn) => {
      this._turn = this._turn === 'white' ? 'black' : 'white';
      btn._label.text = this._turn === 'white' ? 'w' : 'b';
      this._updateFenDisplay();
    });
  },

  _makeInCardButton(card, x, y, w, h, text, cols, s, onClick) {
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;

    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, w, h, 6).fill({ color: PixiColorUtil.hexToNum(cols.panel), alpha: 0.4 });
    bg.roundRect(0, 0, w, h, 6).stroke({ color: PixiColorUtil.hexToNum(cols.text), alpha: 0.25, width: 1 });
    container.addChild(bg);

    const label = PixiPremiumScene.text(text, {
      fontFamily: PixiTextStyles.FONT_BODY,
      fontSize: 16,
      fontWeight: '700',
      fill: cols.text,
    });
    label.anchor.set(0.5);
    label.x = w / 2;
    label.y = h / 2;
    container.addChild(label);
    container._label = label;

    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.hitArea = new PIXI.Rectangle(0, 0, w, h);
    container.on('pointerdown', onClick);

    card.addChild(container);
    return container;
  },

  _makeToggleBtn(x, y, size, text, cols, s, onClick) {
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;

    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, size, size, 6).fill({ color: PixiColorUtil.hexToNum(cols.panel), alpha: 0.4 });
    bg.roundRect(0, 0, size, size, 6).stroke({ color: PixiColorUtil.hexToNum(cols.text), alpha: 0.25, width: 1 });
    container.addChild(bg);

    const label = PixiPremiumScene.text(text, {
      fontFamily: PixiTextStyles.FONT_TITLE,
      fontSize: Math.round(14 * s),
      fill: cols.text,
    });
    label.anchor.set(0.5);
    label.x = size / 2;
    label.y = size / 2;
    container.addChild(label);
    container._label = label;

    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.hitArea = new PIXI.Rectangle(0, 0, size, size);
    container.on('pointerdown', () => onClick(container));

    this.pixiContainer.addChild(container);
    return container;
  },

  _updatePaletteSelection(cols) {
    for (const item of this._paletteSprites) {
      const isSelected = (item.type === this._selectedPieceType && !this._eraseMode);
      item.bg.clear();
      item.bg.roundRect(0, 0, item.pieceSize, item.pieceSize, 6).fill({
        color: isSelected ? PixiColorUtil.hexToNum(cols.accent) : PixiColorUtil.hexToNum(cols.panel),
        alpha: isSelected ? 0.5 : 0.25,
      });
      if (isSelected) {
        item.bg.roundRect(0, 0, item.pieceSize, item.pieceSize, 6).stroke({ color: PixiColorUtil.hexToNum(cols.accent), alpha: 0.9, width: 2 });
      }
    }
  },

  _refreshPalette(themeId) {
    for (const item of this._paletteSprites) {
      const sprite = item.container.children[1];
      if (sprite) {
        const tex = PixiPieceRenderer.getTexture(themeId, this._selectedPieceColor, item.type);
        if (tex) sprite.texture = tex;
      }
    }
  },

  // --- Board interaction ---

  _onBoardClick(e) {
    const local = this.pixiContainer.toLocal(e.global);
    const sq = PixiBoardRenderer.getSquareAt(local.x, local.y);
    if (!sq) return;

    const { row, col } = sq;
    const themeId = store.get('theme') || 'chess20';

    if (this._eraseMode) {
      this._board.removePiece(row, col);
    } else {
      const existing = this._board.getPiece(row, col);
      if (existing && existing.type === this._selectedPieceType && existing.color === this._selectedPieceColor) {
        this._board.removePiece(row, col);
      } else {
        this._board.setPiece(row, col, {
          type: this._selectedPieceType,
          color: this._selectedPieceColor,
        });
      }
    }

    PixiBoardRenderer.setPieces(this._board, themeId);
    this._updateFenDisplay();

    if (typeof audioManager !== 'undefined' && typeof audioManager.playSelect === 'function') {
      audioManager.playSelect();
    }
  },

  _turnLabel() {
    return `To Move: ${this._turn === 'white' ? 'White' : 'Black'}`;
  },

  // Castling is only possible with king and rook still on their home squares.
  _fixCastling() {
    const home = (r, c, type, color) => {
      const p = this._board.getPiece(r, c);
      return !!p && p.type === type && p.color === color;
    };
    const rights = this._board.castlingRights;
    for (const [color, r] of [['white', 7], ['black', 0]]) {
      const king = home(r, 4, 'king', color);
      rights[color].kingside = king && home(r, 7, 'rook', color);
      rights[color].queenside = king && home(r, 0, 'rook', color);
    }
    this._board.enPassantTarget = null;
  },

  _fen() {
    this._fixCastling();
    return FEN.fromBoard(this._board, this._turn);
  },

  _updateFenDisplay() {
    if (this._fenText) this._fenText.text = this._fen();
  },

  // Why the position can't be played, or null if it can.
  _positionProblem() {
    const kings = { white: 0, black: 0 };
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this._board.getPiece(r, c);
        if (!p) continue;
        if (p.type === 'king') kings[p.color]++;
        if (p.type === 'pawn' && (r === 0 || r === 7)) return 'Pawns cannot stand on the first or last rank';
      }
    }
    if (kings.white !== 1 || kings.black !== 1) return 'Each side needs exactly one king';
    const board = FEN.toBoard(this._fen());
    const other = this._turn === 'white' ? 'black' : 'white';
    const k = board.findKing(other);
    if (MoveGen.isSquareAttacked(board, k.row, k.col, this._turn)) {
      return `${other === 'white' ? 'White' : 'Black'} is in check but it is not their move`;
    }
    const status = GameRules.getGameStatus(board, this._turn);
    if (status.status === 'checkmate') return 'That position is already checkmate';
    if (status.status === 'stalemate') return 'That position is already stalemate';
    return null;
  },

  _loadFen(fen) {
    try {
      const board = FEN.toBoard(fen.trim());
      if (!board.findKing('white') && !board.findKing('black') && !/[pnbrqk]/i.test(fen.split(' ')[0])) throw new Error('empty');
      this._board = board;
      this._turn = board.turn || 'white';
      const themeId = store.get('theme') || 'chess20';
      PixiBoardRenderer.setPieces(this._board, themeId);
      this.build();
      this._updateFenDisplay();
      this._setStatus('FEN loaded');
    } catch (e) {
      this._setStatus('That is not a valid FEN');
    }
  },

  // Reads a FEN from the clipboard (window.prompt does nothing in Electron).
  _importFen() {
    const ask = () => {
      const fen = typeof window.prompt === 'function' ? window.prompt('Enter FEN string:', this._fen()) : null;
      if (fen) this._loadFen(fen);
      else this._setStatus('Copy a FEN first, then press Paste FEN');
    };
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then((text) => {
        if (text && text.includes('/')) this._loadFen(text);
        else ask();
      }).catch(ask);
    } else {
      ask();
    }
  },

  _exportFen() {
    const fen = this._fen();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fen);
      this._setStatus('FEN copied to clipboard');
    } else {
      this._setStatus(fen);
    }
  },

  _loadStandardPosition(themeId) {
    this._board = new Board();
    PixiBoardRenderer.setPieces(this._board, themeId);
    this._updateFenDisplay();
    this._setStatus('Standard position loaded');
  },

  _clearBoard(themeId) {
    this._board = Board.createEmpty();
    PixiBoardRenderer.setPieces(this._board, themeId);
    this._updateFenDisplay();
    this._setStatus('Board cleared');
  },

  _playFromHere() {
    const problem = this._positionProblem();
    if (problem) {
      this._setStatus(problem);
      if (typeof audioManager !== 'undefined' && typeof audioManager.playError === 'function') audioManager.playError();
      return;
    }
    const fen = this._fen();

    // Keep the last few positions so players can find them again later.
    const progress = store.get('trainingProgress');
    const recent = (progress.customPuzzles || []).filter(p => p.fen !== fen);
    recent.push({ fen, created: Date.now(), title: `Custom #${recent.length + 1}` });
    progress.customPuzzles = recent.slice(-20);
    store.set('trainingProgress', progress);
    store.saveProgress();

    switchScreen('puzzle', { fen, source: 'custom' });
  },

  _setStatus(text) {
    if (!this._statusText) return;
    this._statusText.text = text;
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => {
      if (this._statusText) this._statusText.text = '';
    }, 3500);
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  destroy() {
    this._paletteSprites = [];
    this._boardHitArea = null;
    this._fenText = null;
    this._statusText = null;
    PixiBoardRenderer.destroy();
    PixiPremiumScene.destroy(this);
  },

  handleKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
      switchScreen('trainingHub');
    }
  },
};
