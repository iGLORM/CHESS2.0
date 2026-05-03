class LegalFilter {
  static filterMoves(board, moves, color) {
    return moves.filter(move => {
      if (move.castling) {
        return this.isCastlingLegal(board, move, color);
      }
      const sim = board.clone();
      MoveExecutor.executeMoveRaw(sim, move);
      const king = sim.findKing(color);
      return !MoveGen.isSquareAttacked(sim, king.row, king.col, color === 'white' ? 'black' : 'white');
    });
  }

  static isCastlingLegal(board, move, color) {
    const enemy = color === 'white' ? 'black' : 'white';
    const row = move.from.row;
    const dir = move.to.col > move.from.col ? 1 : -1;

    if (MoveGen.isSquareAttacked(board, row, move.from.col, enemy)) return false;
    let c = move.from.col + dir;
    while (c !== move.to.col) {
      if (MoveGen.isSquareAttacked(board, row, c, enemy)) return false;
      c += dir;
    }
    return true;
  }
}
