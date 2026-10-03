const PixiBoardRenderer = {
  container: null,
  frameContainer: null,
  boardContainer: null,
  piecesContainer: null,
  overlayContainer: null,
  pieceSprites: {},
  squareSize: 80,
  boardOffsetX: 320,
  boardOffsetY: 58,
  flashGraphics: null,
  selectedSprite: null,
  markersContainer: null,
  flipped: false,

  FRAME_PAD: 6,
  PIECE_SIZE: 72,

  // Board squares are addressed by engine row/col; when flipped (playing Black)
  // they are drawn rotated 180 degrees so the player's pieces sit at the bottom.
  squareX(col) {
    return this.boardOffsetX + (this.flipped ? 7 - col : col) * this.squareSize;
  },

  squareY(row) {
    return this.boardOffsetY + (this.flipped ? 7 - row : row) * this.squareSize;
  },

  squareCenter(row, col) {
    return { x: this.squareX(col) + this.squareSize / 2, y: this.squareY(row) + this.squareSize / 2 };
  },

  computeLayout() {
    if (Layout.isPortrait) {
      const maxBoard = Layout.W - 80;
      this.squareSize = Math.floor(maxBoard / 8);
      const boardPx = this.squareSize * 8;
      this.boardOffsetX = Math.floor((Layout.W - boardPx) / 2);
      const topPanelBottom = 40 + 120;
      const statusBarTop = Layout.H - 70;
      const bottomPanelH = 180;
      this.portraitGap = Math.floor((statusBarTop - topPanelBottom - boardPx - bottomPanelH) / 3);
      this.boardOffsetY = topPanelBottom + this.portraitGap;
      this.PIECE_SIZE = Math.floor(this.squareSize * 0.9);
    } else {
      this.squareSize = 80;
      this.boardOffsetX = 320;
      this.boardOffsetY = 58;
      this.PIECE_SIZE = 72;
    }
  },

  init(parentStage) {
    this.flipped = false;
    this.container = new PIXI.Container();
    parentStage.addChild(this.container);

    this.frameContainer = new PIXI.Container();
    this.boardContainer = new PIXI.Container();
    this.piecesContainer = new PIXI.Container();
    this.overlayContainer = new PIXI.Container();
    this.markersContainer = new PIXI.Container();

    this.container.addChild(this.frameContainer);
    this.coordsContainer = new PIXI.Container();
    this.coordsContainer.eventMode = 'none';
    this.container.addChild(this.boardContainer);
    this.container.addChild(this.coordsContainer);
    this.container.addChild(this.markersContainer);
    this.container.addChild(this.piecesContainer);
    this.container.addChild(this.overlayContainer);

    this.flashGraphics = new PIXI.Graphics();
    this.flashGraphics.eventMode = 'none';
    this.container.addChild(this.flashGraphics);

    this.pieceSprites = {};
  },

  drawBoard(themeId) {
    this.computeLayout();
    const theme = ThemeManager.getTheme(themeId);
    const cols = theme.colors;
    this.boardContainer.removeChildren();
    this.frameContainer.removeChildren();
    if (this.coordsContainer) this.coordsContainer.removeChildren();

    const bx = this.boardOffsetX;
    const by = this.boardOffsetY;
    const boardPx = this.squareSize * 8;
    const fp = this.FRAME_PAD;

    // --- Board frame ---
    const frame = new PIXI.Graphics();
    const accentNum = PixiColorUtil.hexToNum(cols.accent);
    const panelNum = PixiColorUtil.hexToNum(cols.panel);

    // Premium board stage: shadow, glassy plate, and restrained accent rails.
    frame.roundRect(bx - 18, by - 18, boardPx + 36, boardPx + 36, 10)
      .fill({ color: 0x000000, alpha: 0.46 });
    frame.roundRect(bx - 14, by - 14, boardPx + 28, boardPx + 28, 9)
      .fill({ color: panelNum, alpha: 0.80 })
      .stroke({ color: accentNum, alpha: 0.28, width: 2 });
    frame.roundRect(bx - 8, by - 8, boardPx + 16, boardPx + 16, 6)
      .fill({ color: 0x050914, alpha: 0.72 });
    frame.rect(bx - 6, by - 15, boardPx + 12, 4).fill({ color: accentNum, alpha: 0.55 });
    frame.rect(bx - 6, by + boardPx + 11, boardPx + 12, 4).fill({ color: accentNum, alpha: 0.28 });

    // Frame background (dark wood-like)
    const frameDark = PixiColorUtil.hexToNum(PixiColorUtil.darken(cols.darkSquare, 40));
    frame.roundRect(bx - fp, by - fp, boardPx + fp * 2, boardPx + fp * 2, 5)
      .fill(frameDark);

    // Inner frame border highlight
    const frameLight = PixiColorUtil.hexToNum(PixiColorUtil.lighten(cols.darkSquare, 20));
    frame.rect(bx - 1, by - 1, boardPx + 2, boardPx + 2)
      .fill(frameLight);

    // Coordinate labels (a-h, 1-8)
    this.frameContainer.addChild(frame);

    // Coordinates sit inside the edge squares' corners: files along the bottom
    // row (bottom-right), ranks down the left column (top-left).
    const coordStyle = {
      fontFamily: '"Pixelify Sans", sans-serif', fontSize: 13, fontWeight: '700',
      fill: '#ffffff', stroke: { color: 0x000000, width: 3 },
    };
    const inset = 4;
    for (let i = 0; i < 8; i++) {
      const file = String.fromCharCode(97 + (this.flipped ? 7 - i : i));
      const rank = String(this.flipped ? i + 1 : 8 - i);
      const fileLabel = new PIXI.Text({ text: file, style: coordStyle });
      fileLabel.anchor.set(1, 1);
      fileLabel.x = bx + (i + 1) * this.squareSize - inset;
      fileLabel.y = by + boardPx - inset + 2;
      fileLabel.alpha = 0.7;
      const rankLabel = new PIXI.Text({ text: rank, style: coordStyle });
      rankLabel.x = bx + inset;
      rankLabel.y = by + i * this.squareSize + inset - 2;
      rankLabel.alpha = 0.7;
      if (this.coordsContainer) this.coordsContainer.addChild(fileLabel, rankLabel);
    }

    // --- Board squares: the theme's painted board if it has one ---
    const boardImg = TextureManager.getBoardImage(themeId);
    if (boardImg) {
      if (!this._boardTextures) this._boardTextures = {};
      if (!this._boardTextures[themeId]) {
        this._boardTextures[themeId] = PIXI.Texture.from({ resource: boardImg, scaleMode: 'nearest' });
      }
      const sprite = new PIXI.Sprite(this._boardTextures[themeId]);
      sprite.x = bx;
      sprite.y = by;
      sprite.width = boardPx;
      sprite.height = boardPx;
      this.boardContainer.addChild(sprite);
      this.boardContainer.addChild(this._calmSquares(themeId, boardImg, bx, by));

      // Soft bevel so the squares read as inlaid tiles.
      const bevel = new PIXI.Graphics();
      for (let i = 0; i <= 8; i++) {
        const p = i * this.squareSize;
        bevel.rect(bx + p, by, 1, boardPx).fill({ color: 0x000000, alpha: 0.10 });
        bevel.rect(bx, by + p, boardPx, 1).fill({ color: 0x000000, alpha: 0.10 });
      }
      bevel.rect(bx, by, boardPx, boardPx).stroke({ color: 0x000000, alpha: 0.35, width: 2 });
      this.boardContainer.addChild(bevel);
      return;
    }
    if (TextureManager.BOARD_THEMES.includes(themeId)) {
      // Still loading: draw flat squares now, the painted board once it arrives.
      TextureManager.preloadTheme(themeId).then(() => {
        if (TextureManager.getBoardImage(themeId) && this.boardContainer && !this.boardContainer.destroyed &&
            store.get('theme') === themeId) {
          this.drawBoard(themeId);
        }
      });
    }

    // --- Board squares (single Graphics for all 64 squares) ---
    const boardGfx = new PIXI.Graphics();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const color = isLight ? cols.lightSquare : cols.darkSquare;
        const x = bx + col * this.squareSize;
        const y = by + row * this.squareSize;

        boardGfx.rect(x, y, this.squareSize, this.squareSize).fill(PixiColorUtil.hexToNum(color));
        boardGfx.rect(x + 6, y + 6, this.squareSize - 12, this.squareSize - 12)
          .stroke({ color: isLight ? 0xffffff : 0x000000, alpha: isLight ? 0.035 : 0.05, width: 1 });

        if (!isLight) {
          boardGfx.rect(x, y, this.squareSize, 1).fill({ color: 0x000000, alpha: 0.08 });
          boardGfx.rect(x, y, 1, this.squareSize).fill({ color: 0x000000, alpha: 0.06 });
        } else {
          boardGfx.rect(x, y, this.squareSize, 1).fill({ color: 0xffffff, alpha: 0.04 });
          boardGfx.rect(x, y, 1, this.squareSize).fill({ color: 0xffffff, alpha: 0.03 });
        }
      }
    }
    this.boardContainer.addChild(boardGfx);
  },

  // The painted boards are speckled; laying each square's own average colour over it
  // at CALM alpha halves the texture so the pieces stand out, without changing the palette.
  CALM: 0.45,
  _squareAverages: {},

  _calmSquares(themeId, img, bx, by) {
    let avg = this._squareAverages[themeId];
    if (!avg) {
      const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      let data;
      try { data = ctx.getImageData(0, 0, w, h).data; } catch (e) { return new PIXI.Graphics(); }
      avg = [];
      for (let r = 0; r < 8; r++) for (let q = 0; q < 8; q++) {
        let R = 0, G = 0, B = 0, n = 0;
        const x0 = Math.floor(q * w / 8), x1 = Math.floor((q + 1) * w / 8);
        const y0 = Math.floor(r * h / 8), y1 = Math.floor((r + 1) * h / 8);
        for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
          const i = (y * w + x) * 4;
          R += data[i]; G += data[i + 1]; B += data[i + 2]; n++;
        }
        avg.push((Math.round(R / n) << 16) | (Math.round(G / n) << 8) | Math.round(B / n));
      }
      this._squareAverages[themeId] = avg;
    }
    const g = new PIXI.Graphics();
    avg.forEach((color, i) => {
      g.rect(bx + (i % 8) * this.squareSize, by + Math.floor(i / 8) * this.squareSize, this.squareSize, this.squareSize)
        .fill({ color, alpha: this.CALM });
    });
    return g;
  },

  setPieces(board, themeId) {
    for (const key in this.pieceSprites) {
      const sprite = this.pieceSprites[key];
      if (sprite.parent) sprite.parent.removeChild(sprite);
      sprite.destroy();
    }
    this.pieceSprites = {};

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board.getPiece(row, col);
        if (piece && piece.type !== 'wall') {   // walls are drawn by PixiBossFX
          const key = `${col},${row}`;
          const sprite = PixiPieceRenderer.createSprite(themeId, piece.color, piece.type);
          sprite.width = this.PIECE_SIZE;
          sprite.height = this.PIECE_SIZE;
          const center = this.squareCenter(row, col);
          sprite.x = center.x;
          sprite.y = center.y;
          this.piecesContainer.addChild(sprite);
          this.pieceSprites[key] = sprite;
        }
      }
    }
  },

  movePiece(fromCol, fromRow, toCol, toRow, themeId, onComplete) {
    const key = `${fromCol},${fromRow}`;
    const sprite = this.pieceSprites[key];
    if (!sprite) {
      if (onComplete) onComplete();
      return;
    }
    const { x: toX, y: toY } = this.squareCenter(toRow, toCol);
    PixiAnimator.movePiece(sprite, sprite.x, sprite.y, toX, toY, 0.3, () => {
      delete this.pieceSprites[key];
      this.pieceSprites[`${toCol},${toRow}`] = sprite;
      if (onComplete) onComplete();
    });
  },

  capturePiece(col, row, onComplete) {
    const key = `${col},${row}`;
    const sprite = this.pieceSprites[key];
    if (sprite) {
      PixiAnimator.capturePiece(sprite, () => {
        delete this.pieceSprites[key];
        if (onComplete) onComplete();
      });
    } else if (onComplete) {
      onComplete();
    }
  },

  highlightSquare(col, row, color, alpha) {
    const x = this.squareX(col);
    const y = this.squareY(row);
    const highlight = new PIXI.Graphics();
    highlight.rect(x + 2, y + 2, this.squareSize - 4, this.squareSize - 4)
      .fill({ color: color, alpha: alpha || 0.3 });
    this.overlayContainer.addChild(highlight);
    return highlight;
  },

  clearHighlights() {
    this.overlayContainer.removeChildren();
    this.selectedSprite = null;
  },

  drawLegalMoves(moves) {
    for (const move of moves) {
      const { x: cx, y: cy } = this.squareCenter(move.to.row, move.to.col);
      const dot = new PIXI.Graphics();
      if (move.captured) {
        // Ring around capturable pieces so the target stays visible.
        const r = this.squareSize / 2 - 4;
        dot.circle(cx, cy, r).stroke({ width: 4, color: 0xffffff, alpha: 0.35 });
      } else {
        dot.circle(cx, cy, 10).fill({ color: 0xffffff, alpha: 0.3 });
        dot.circle(cx, cy, 10).stroke({ width: 1, color: 0xffffff, alpha: 0.15 });
      }
      this.overlayContainer.addChild(dot);
    }
  },

  // Last-move and check markers drawn under the pieces.
  setMarkers(lastMove, checkSquare, accentColor) {
    if (!this.markersContainer) return;
    this.markersContainer.removeChildren().forEach(c => c.destroy());
    const g = new PIXI.Graphics();
    if (lastMove) {
      for (const sq of [lastMove.from, lastMove.to]) {
        g.rect(this.squareX(sq.col), this.squareY(sq.row), this.squareSize, this.squareSize)
          .fill({ color: accentColor || 0xffe066, alpha: 0.22 });
      }
    }
    if (checkSquare) {
      const { x, y } = this.squareCenter(checkSquare.row, checkSquare.col);
      g.circle(x, y, this.squareSize * 0.48).fill({ color: 0xff2a3a, alpha: 0.28 });
      g.circle(x, y, this.squareSize * 0.34).fill({ color: 0xff2a3a, alpha: 0.30 });
    }
    this.markersContainer.addChild(g);
  },

  selectSquare(col, row, color) {
    this.clearSelection();
    const x = this.squareX(col);
    const y = this.squareY(row);
    const select = new PIXI.Graphics();
    select.rect(x + 1, y + 1, this.squareSize - 2, this.squareSize - 2)
      .fill({ color: color || 0xffff00, alpha: 0.2 })
      .stroke({ width: 2, color: color || 0xffff00, alpha: 0.5 });
    this.overlayContainer.addChild(select);
    this.selectedSprite = select;
    return select;
  },

  clearSelection() {
    if (this.selectedSprite) {
      this.overlayContainer.removeChild(this.selectedSprite);
      this.selectedSprite.destroy();
      this.selectedSprite = null;
    }
  },

  flash(color) {
    PixiAnimator.flashScreen(this.flashGraphics, color || 0xffffff, 0.3);
  },

  shake(intensity) {
    PixiAnimator.screenShake(this.container, intensity || 8, 0.4);
  },

  getSquareAt(x, y) {
    const dc = Math.floor((x - this.boardOffsetX) / this.squareSize);
    const dr = Math.floor((y - this.boardOffsetY) / this.squareSize);
    if (dc >= 0 && dc < 8 && dr >= 0 && dr < 8) {
      return this.flipped ? { col: 7 - dc, row: 7 - dr } : { col: dc, row: dr };
    }
    return null;
  },

  destroy() {
    if (this.container) {
      this.container.destroy({ children: true });
      this.container = null;
    }
    this.pieceSprites = {};
    this.frameContainer = null;
    this.boardContainer = null;
    this.piecesContainer = null;
    this.overlayContainer = null;
    this.markersContainer = null;
    this.flashGraphics = null;
    this.selectedSprite = null;
  },
};
