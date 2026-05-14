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

  init() {
    this._board = Board.createEmpty();
    this._selectedPieceType = 'queen';
    this._selectedPieceColor = 'white';
    this._eraseMode = false;
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
    this._boardHitArea = new PIXI.Graphics();
    this._boardHitArea.rect(bx, by, bs, bs).fill({ color: 0x000000, alpha: 0.001 });
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
    const bx = PixiBoardRenderer.boardOffsetX;
    const boardRight = bx + PixiBoardRenderer.squareSize * 8 + 24;
    const panelTop = PixiBoardRenderer.boardOffsetY;
    const boardBottom = panelTop + PixiBoardRenderer.squareSize * 8;

    // --- Left: Piece palette card ---
    const leftW = Math.max(180, bx - 38);
    const leftH = boardBottom - panelTop;
    PixiPremiumScene.card(this.pixiContainer, 15, panelTop, leftW, leftH, {
      interactive: false,
      alpha: 0.55,
      draw: (card) => {
        const title = PixiPremiumScene.text('Pieces', {
          fontFamily: PixiTextStyles.FONT_TITLE,
          fontSize: Math.round(13 * s),
          fill: cols.accent,
        });
        title.x = 14;
        title.y = 14;
        card.addChild(title);

        this._buildPaletteInCard(card, 14, 42, cols, s, themeId, leftW - 28);
      },
    });

    // --- Right: FEN + Actions card ---
    const rightX = boardRight;
    const rightW = Math.max(180, W - boardRight - 15);
    const rightH = boardBottom - panelTop;
    PixiPremiumScene.card(this.pixiContainer, rightX, panelTop, rightW, rightH, {
      interactive: false,
      alpha: 0.55,
      draw: (card) => {
        const fenLabel = PixiPremiumScene.text('FEN', {
          fontFamily: PixiTextStyles.FONT_TITLE,
          fontSize: Math.round(13 * s),
          fill: cols.accent,
        });
        fenLabel.x = 14;
        fenLabel.y = 14;
        card.addChild(fenLabel);

        this._fenText = PixiPremiumScene.text('8/8/8/8/8/8/8/8 w - - 0 1', {
          fontFamily: PixiTextStyles.FONT_BODY,
          fontSize: Math.round(11 * s),
          fill: PixiColorUtil.alpha(cols.text, 'aa'),
          wordWrap: true, wordWrapWidth: rightW - 32,
        });
        this._fenText.x = 14;
        this._fenText.y = 36;
        card.addChild(this._fenText);

        this._statusText = PixiPremiumScene.text('', {
          fontFamily: PixiTextStyles.FONT_BODY,
          fontSize: Math.round(12 * s),
          fill: cols.accent,
        });
        this._statusText.x = 14;
        this._statusText.y = 72;
        card.addChild(this._statusText);
      },
    });

    // Action buttons on the right below the card
    const actionBtnW = rightW;
    const actionBtnH = 44;
    const actionGap = 6;
    let actionY = panelTop + 100;

    const actions = [
      { text: 'Import FEN', action: () => this._importFen() },
      { text: 'Copy FEN', action: () => this._exportFen() },
      { text: 'Standard', action: () => this._loadStandardPosition(themeId) },
      { text: 'Clear Board', action: () => this._clearBoard(themeId) },
      { text: 'Play From Here', action: () => this._playFromHere(), primary: true },
    ];

    actions.forEach((act) => {
      PixiPremiumScene.button(this.pixiContainer, rightX, actionY, actionBtnW, actionBtnH, act.text, act.action, {
        primary: act.primary || false,
        fontSize: Math.round(14 * s),
      });
      actionY += 68 + actionGap;
    });

    // Back button
    PixiPremiumScene.button(this.pixiContainer, 15, H - 72, 140, 44, 'Back', () => {
      if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
      switchScreen('trainingHub');
    }, { fontSize: Math.round(16 * s) });
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

    const btnY = H - 60;
    const btnW = Math.round((W - 50) / 4);
    let bx = 10;
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
    const pieceSize = Math.round(44 * s);
    const gap = Math.round(6 * s);
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
    const toggleY = startY + 2 * (pieceSize + gap) + Math.round(12 * s);
    const toggleW = 3 * pieceSize + 2 * gap;

    const colorBtn = this._makeInCardButton(card, startX, toggleY, toggleW, Math.round(34 * s),
      `Color: ${this._selectedPieceColor}`, cols, s, () => {
        this._selectedPieceColor = this._selectedPieceColor === 'white' ? 'black' : 'white';
        colorBtn._label.text = `Color: ${this._selectedPieceColor}`;
        this._refreshPalette(themeId);
      });

    const eraseBtn = this._makeInCardButton(card, startX, toggleY + Math.round(42 * s), toggleW, Math.round(34 * s),
      'Erase Mode: OFF', cols, s, () => {
        this._eraseMode = !this._eraseMode;
        eraseBtn._label.text = `Erase Mode: ${this._eraseMode ? 'ON' : 'OFF'}`;
        this._updatePaletteSelection(cols);
      });
  },

  _buildPaletteRow(y, cols, s, themeId, W) {
    const types = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
    const pieceSize = Math.round(40 * s);
    const gap = Math.round(6 * s);
    const totalW = types.length * (pieceSize + gap) - gap;
    const startX = Math.floor((W - totalW - 80) / 2);
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
      fontSize: Math.round(13 * s),
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
    const themeId = store.get('theme') || 'space';

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

  _updateFenDisplay() {
    const fen = FEN.fromBoard(this._board, this._selectedPieceColor);
    if (this._fenText) this._fenText.text = fen;
  },

  _importFen() {
    const fen = window.prompt('Enter FEN string:',
      FEN.fromBoard(this._board, this._selectedPieceColor));
    if (fen) {
      try {
        this._board = FEN.toBoard(fen);
        this._selectedPieceColor = fen.split(' ')[1] === 'b' ? 'black' : 'white';
        const themeId = store.get('theme') || 'space';
        PixiBoardRenderer.setPieces(this._board, themeId);
        this._updateFenDisplay();
        this._setStatus('FEN imported');
      } catch (e) {
        this._setStatus('Invalid FEN');
      }
    }
  },

  _exportFen() {
    const fen = FEN.fromBoard(this._board, this._selectedPieceColor);
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
    const fen = FEN.fromBoard(this._board, this._selectedPieceColor);
    if (fen.startsWith('8/8/8/8/8/8/8/8')) {
      this._setStatus('Place some pieces first');
      return;
    }

    const progress = store.get('trainingProgress');
    progress.customPuzzles = progress.customPuzzles || [];
    progress.customPuzzles.push({
      fen,
      created: Date.now(),
      title: `Custom #${progress.customPuzzles.length + 1}`,
    });
    store.set('trainingProgress', progress);
    store.saveProgress();

    switchScreen('puzzle', { fen, source: 'custom' });
  },

  _setStatus(text) {
    if (this._statusText) {
      this._statusText.text = text;
      setTimeout(() => {
        if (this._statusText) this._statusText.text = '';
      }, 3000);
    }
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
