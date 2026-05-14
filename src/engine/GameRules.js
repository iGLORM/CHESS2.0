class GameRules {
  static getLegalMoves(board, color) {
    const pseudoMoves = MoveGen.generateMoves(board, color);
    return LegalFilter.filterMoves(board, pseudoMoves, color);
  }

  static isCheckmate(board, color) {
    return this.getLegalMoves(board, color).length === 0 && board.inCheck;
  }

  static isStalemate(board, color) {
    return this.getLegalMoves(board, color).length === 0 && !board.inCheck;
  }

  static isDraw(board) {
    if (board.halfMoveClock >= 100) return true;

    const currentKey = board.posKey();
    let count = 0;
    for (const key of board.positionHistory) {
      if (key === currentKey) count++;
      if (count >= 3) return true;
    }

    const nonKingPieces = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board.grid[r][c];
        if (p && p.type !== 'king') {
          nonKingPieces.push({ type: p.type, color: p.color, squareColor: (r + c) % 2 });
        }
      }
    }
    if (nonKingPieces.length === 0) return true;
    if (nonKingPieces.length === 1 &&
        (nonKingPieces[0].type === 'knight' || nonKingPieces[0].type === 'bishop')) return true;
    if (nonKingPieces.every(p => p.type === 'bishop') &&
        nonKingPieces.every(p => p.squareColor === nonKingPieces[0].squareColor)) return true;

    return false;
  }

  static getGameStatus(board, color) {
    const king = board.findKing(color);
    if (!king) {
      return { status: 'checkmate', winner: color === 'white' ? 'black' : 'white' };
    }

    const moves = this.getLegalMoves(board, color);
    if (moves.length === 0) {
      if (board.inCheck) return { status: 'checkmate', winner: color === 'white' ? 'black' : 'white' };
      return { status: 'stalemate', winner: null };
    }
    if (this.isDraw(board)) return { status: 'draw', winner: null };
    if (board.inCheck) return { status: 'check', winner: null };
    return { status: 'playing', winner: null };
  }
}
