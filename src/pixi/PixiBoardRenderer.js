const PixiBoardRenderer = {
  container: null,
  frameContainer: null,
  boardContainer: null,
  piecesContainer: null,
  overlayContainer: null,
  pieceSprites: {},
  squareSize: 80,
  boardOffsetX: 320,
  boardOffsetY: 80,
  flashGraphics: null,
  selectedSprite: null,

  FRAME_PAD: 6,
  PIECE_SIZE: 72,

  init(parentStage) {
    this.container = new PIXI.Container();
    parentStage.addChild(this.container);

    this.frameContainer = new PIXI.Container();
    this.boardContainer = new PIXI.Container();
    this.piecesContainer = new PIXI.Container();
    this.overlayContainer = new PIXI.Container();

    this.container.addChild(this.frameContainer);
    this.container.addChild(this.boardContainer);
    this.container.addChild(this.piecesContainer);
    this.container.addChild(this.overlayContainer);

    this.flashGraphics = new PIXI.Graphics();
    this.flashGraphics.eventMode = 'none';
    this.container.addChild(this.flashGraphics);

    this.pieceSprites = {};
  },

  drawBoard(themeId) {
    const theme = ThemeManager.getTheme(themeId);
    const cols = theme.colors;
    this.boardContainer.removeChildren();
    this.frameContainer.removeChildren();

    const bx = this.boardOffsetX;
    const by = this.boardOffsetY;
    const boardPx = this.squareSize * 8;
    const fp = this.FRAME_PAD;

    // --- Board frame ---
    const frame = new PIXI.Graphics();

    // Outer shadow
    frame.roundRect(bx - fp - 4, by - fp - 4, boardPx + fp * 2 + 8, boardPx + fp * 2 + 8, 4)
      .fill({ color: 0x000000, alpha: 0.5 });

    // Frame background (dark wood-like)
    const frameDark = PixiColorUtil.hexToNum(PixiColorUtil.darken(cols.darkSquare, 40));
    frame.roundRect(bx - fp, by - fp, boardPx + fp * 2, boardPx + fp * 2, 3)
      .fill(frameDark);

    // Inner frame border highlight
    const frameLight = PixiColorUtil.hexToNum(PixiColorUtil.lighten(cols.darkSquare, 20));
    frame.rect(bx - 1, by - 1, boardPx + 2, boardPx + 2)
      .fill(frameLight);

    // Coordinate labels (a-h, 1-8)
    this.frameContainer.addChild(frame);

    for (let i = 0; i < 8; i++) {
      const file = String.fromCharCode(97 + i);
      const rank = String(8 - i);
      const labelStyle = { fontFamily: '"Pixelify Sans", sans-serif', fontSize: 14, fill: PixiColorUtil.alpha(cols.text, '55') };

      // File labels (bottom)
      const fileLabel = new PIXI.Text({ text: file, style: labelStyle });
      fileLabel.anchor.set(0.5);
      fileLabel.x = bx + i * this.squareSize + this.squareSize / 2;
      fileLabel.y = by + boardPx + fp - 1;
      this.frameContainer.addChild(fileLabel);

      // Rank labels (left)
      const rankLabel = new PIXI.Text({ text: rank, style: labelStyle });
      rankLabel.anchor.set(0.5);
      rankLabel.x = bx - fp + 1;
      rankLabel.y = by + i * this.squareSize + this.squareSize / 2;
      this.frameContainer.addChild(rankLabel);
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
        if (piece) {
          const key = `${col},${row}`;
          const sprite = PixiPieceRenderer.createSprite(themeId, piece.color, piece.type);
          sprite.width = this.PIECE_SIZE;
          sprite.height = this.PIECE_SIZE;
          const x = this.boardOffsetX + col * this.squareSize + this.squareSize / 2;
          const y = this.boardOffsetY + row * this.squareSize + this.squareSize / 2;
          sprite.x = x;
          sprite.y = y;
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
    const toX = this.boardOffsetX + toCol * this.squareSize + this.squareSize / 2;
    const toY = this.boardOffsetY + toRow * this.squareSize + this.squareSize / 2;
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
    const x = this.boardOffsetX + col * this.squareSize;
    const y = this.boardOffsetY + row * this.squareSize;
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
      const cx = this.boardOffsetX + move.to.col * this.squareSize + this.squareSize / 2;
      const cy = this.boardOffsetY + move.to.row * this.squareSize + this.squareSize / 2;
      const dot = new PIXI.Graphics();
      dot.circle(cx, cy, 10).fill({ color: 0xffffff, alpha: 0.3 });
      dot.circle(cx, cy, 10).stroke({ width: 1, color: 0xffffff, alpha: 0.15 });
      this.overlayContainer.addChild(dot);
    }
  },

  selectSquare(col, row, color) {
    this.clearSelection();
    const x = this.boardOffsetX + col * this.squareSize;
    const y = this.boardOffsetY + row * this.squareSize;
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
    const col = Math.floor((x - this.boardOffsetX) / this.squareSize);
    const row = Math.floor((y - this.boardOffsetY) / this.squareSize);
    if (col >= 0 && col < 8 && row >= 0 && row < 8) {
      return { col, row };
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
    this.flashGraphics = null;
    this.selectedSprite = null;
  },
};
