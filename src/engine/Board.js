// 'wall' is CastlE's neutral blocker: it never moves and cannot be captured.
const PIECE_CHARS = { king: 'k', queen: 'q', rook: 'r', bishop: 'b', knight: 'n', pawn: 'p', wall: 'x' };

class Board {
  constructor() {
    this.grid = this.createInitialGrid();
    this.turn = 'white';
    this.castlingRights = {
      white: { kingside: true, queenside: true },
      black: { kingside: true, queenside: true },
    };
    this.enPassantTarget = null;
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.inCheck = false;
    this.undoStack = [];
    this.positionHistory = [this.posKey()];
  }

  createInitialGrid() {
    const grid = Array(8).fill(null).map(() => Array(8).fill(null));
    const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

    for (let col = 0; col < 8; col++) {
      grid[0][col] = { type: backRank[col], color: 'black' };
      grid[1][col] = { type: 'pawn', color: 'black' };
      grid[6][col] = { type: 'pawn', color: 'white' };
      grid[7][col] = { type: backRank[col], color: 'white' };
    }

    return grid;
  }

  static createEmpty() {
    const b = new Board();
    b.grid = Array(8).fill(null).map(() => Array(8).fill(null));
    return b;
  }

  clone() {
    const b = new Board();
    b.grid = this.grid.map(row => row.map(cell => cell ? { ...cell } : null));
    b.turn = this.turn;
    b.castlingRights = JSON.parse(JSON.stringify(this.castlingRights));
    b.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
    b.halfMoveClock = this.halfMoveClock;
    b.fullMoveNumber = this.fullMoveNumber;
    b.inCheck = this.inCheck;
    return b;
  }

  getPiece(row, col) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return this.grid[row][col];
  }

  setPiece(row, col, piece) {
    this.grid[row][col] = piece;
  }

  removePiece(row, col) {
    this.grid[row][col] = null;
  }

  findKing(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.grid[r][c];
        if (p && p.type === 'king' && p.color === color) return { row: r, col: c };
      }
    }
    return null;
  }

  isInBounds(row, col) {
    return row >= 0 && row <= 7 && col >= 0 && col <= 7;
  }

  resetHistory() {
    this.positionHistory = [this.posKey()];
  }

  posKey() {
    let key = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.grid[r][c];
        key += p ? (p.color === 'white' ? PIECE_CHARS[p.type].toUpperCase() : PIECE_CHARS[p.type]) : '.';
      }
    }
    key += this.turn;
    key += this.castlingRights.white.kingside ? 'K' : '';
    key += this.castlingRights.white.queenside ? 'Q' : '';
    key += this.castlingRights.black.kingside ? 'k' : '';
    key += this.castlingRights.black.queenside ? 'q' : '';
    key += this.enPassantTarget ? 'abcdefgh'[this.enPassantTarget.col] + String(8 - this.enPassantTarget.row) : '-';
    return key;
  }

  makeMove(move) {
    const piece = this.grid[move.from.row][move.from.col];
    const captured = this.grid[move.to.row][move.to.col];

    const undo = {
      from: move.from,
      to: move.to,
      piece: piece,
      captured: captured,
      enPassantTarget: this.enPassantTarget,
      castlingRights: {
        white: { ...this.castlingRights.white },
        black: { ...this.castlingRights.black },
      },
      halfMoveClock: this.halfMoveClock,
      fullMoveNumber: this.fullMoveNumber,
      inCheck: this.inCheck,
      castling: move.castling || null,
      enPassantCapture: move.enPassantCapture || false,
      promotion: move.promotion || null,
    };

    if (!this.undoStack) this.undoStack = [];
    this.undoStack.push(undo);

    // Move piece
    this.grid[move.to.row][move.to.col] = piece;
    this.grid[move.from.row][move.from.col] = null;

    // Handle castling
    if (move.castling) {
      const row = move.from.row;
      if (move.to.col > move.from.col) {
        const rook = this.grid[row][7];
        if (rook && rook.type === 'rook') {
          this.grid[row][5] = rook;
          this.grid[row][7] = null;
        }
      } else {
        const rook = this.grid[row][0];
        if (rook && rook.type === 'rook') {
          this.grid[row][3] = rook;
          this.grid[row][0] = null;
        }
      }
    }

    // Handle en passant capture
    if (move.enPassantCapture) {
      const epTarget = this.grid[move.from.row][move.to.col];
      if (epTarget && epTarget.type === 'pawn') {
        this.grid[move.from.row][move.to.col] = null;
      }
    }

    // Handle promotion
    if (move.promotion) {
      this.grid[move.to.row][move.to.col] = { type: move.promotion, color: piece.color };
    }

    // Update en passant target
    if (piece.type === 'pawn' && Math.abs(move.to.row - move.from.row) === 2) {
      this.enPassantTarget = { row: (move.from.row + move.to.row) / 2, col: move.from.col };
    } else {
      this.enPassantTarget = null;
    }

    // Update castling rights
    if (piece.type === 'king') {
      this.castlingRights[piece.color].kingside = false;
      this.castlingRights[piece.color].queenside = false;
    }
    if (piece.type === 'rook') {
      if (move.from.col === 0) this.castlingRights[piece.color].queenside = false;
      if (move.from.col === 7) this.castlingRights[piece.color].kingside = false;
    }
    if (captured && captured.type === 'rook') {
      if (move.to.col === 0) this.castlingRights[captured.color].queenside = false;
      if (move.to.col === 7) this.castlingRights[captured.color].kingside = false;
    }

    // Update half move clock
    if (piece.type === 'pawn' || captured) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }

    // Update full move number
    if (piece.color === 'black') this.fullMoveNumber++;

    // Switch turn
    const enemyColor = piece.color === 'white' ? 'black' : 'white';
    this.turn = enemyColor;

    // Update check status
    const enemyKing = this.findKing(enemyColor);
    this.inCheck = enemyKing ? MoveGen.isSquareAttacked(this, enemyKing.row, enemyKing.col, piece.color) : false;
  }

  unmakeMove() {
    const undo = this.undoStack.pop();

    // Restore piece to original position
    this.grid[undo.from.row][undo.from.col] = undo.piece;
    this.grid[undo.to.row][undo.to.col] = undo.captured;

    // Undo en passant capture
    if (undo.enPassantCapture) {
      const capturedColor = undo.piece.color === 'white' ? 'black' : 'white';
      this.grid[undo.from.row][undo.to.col] = { type: 'pawn', color: capturedColor };
    }

    // Undo castling
    if (undo.castling) {
      const row = undo.from.row;
      if (undo.to.col > undo.from.col) {
        this.grid[row][7] = this.grid[row][5];
        this.grid[row][5] = null;
      } else {
        this.grid[row][0] = this.grid[row][3];
        this.grid[row][3] = null;
      }
    }

    // Restore state
    this.enPassantTarget = undo.enPassantTarget;
    this.castlingRights = undo.castlingRights;
    this.halfMoveClock = undo.halfMoveClock;
    this.fullMoveNumber = undo.fullMoveNumber;
    this.inCheck = undo.inCheck;
    this.turn = undo.piece.color;
  }
}
