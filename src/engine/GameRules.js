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

    let pieces = { white: [], black: [] };
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board.grid[r][c];
        if (p) pieces[p.color].push(p);
      }
    }
    const total = pieces.white.length + pieces.black.length;
    if (total === 2) return true;
    if (total === 3) {
      const hasKnight = pieces.white.some(p => p.type === 'knight') ||
                        pieces.black.some(p => p.type === 'knight');
      if (hasKnight) return true;
    }
    if (total === 4) {
      const wb = pieces.white.filter(p => p.type === 'bishop');
      const bb = pieces.black.filter(p => p.type === 'bishop');
      if (wb.length === 1 && !pieces.white.some(p => p.type !== 'king' && p.type !== 'bishop') &&
          bb.length === 1 && !pieces.black.some(p => p.type !== 'king' && p.type !== 'bishop')) {
        return true;
      }
    }

    return false;
  }

  static getGameStatus(board, color) {
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
