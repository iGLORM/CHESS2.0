const PIECE_CHARS = { king: 'k', queen: 'q', rook: 'r', bishop: 'b', knight: 'n', pawn: 'p' };

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
}
