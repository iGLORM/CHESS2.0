// Standard algebraic notation (e4, Nxf3+, O-O, e8=Q#) for the move list.
class Notation {
  static square(row, col) {
    return 'abcdefgh'[col] + (8 - row);
  }

  // `board` is the position before the move is played.
  static toSAN(board, move) {
    const piece = board.grid[move.from.row][move.from.col];
    if (!piece) return '?';
    const color = piece.color;
    let san;

    if (move.castling) {
      san = move.castling === 'kingside' ? 'O-O' : 'O-O-O';
    } else {
      const letters = { knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' };
      const isCapture = !!CaptureRules.capturedPiece(board, move);
      const to = this.square(move.to.row, move.to.col);
      if (piece.type === 'pawn') {
        san = (isCapture ? 'abcdefgh'[move.from.col] + 'x' : '') + to;
        if (move.promotion) san += '=' + letters[move.promotion];
      } else {
        const rivals = GameRules.getLegalMoves(board, color).filter(m =>
          m.to.row === move.to.row && m.to.col === move.to.col &&
          !(m.from.row === move.from.row && m.from.col === move.from.col) &&
          board.grid[m.from.row][m.from.col].type === piece.type);
        let disambig = '';
        if (rivals.length) {
          const sameFile = rivals.some(m => m.from.col === move.from.col);
          const sameRank = rivals.some(m => m.from.row === move.from.row);
          if (!sameFile) disambig = 'abcdefgh'[move.from.col];
          else if (!sameRank) disambig = String(8 - move.from.row);
          else disambig = this.square(move.from.row, move.from.col);
        }
        san = letters[piece.type] + disambig + (isCapture ? 'x' : '') + to;
      }
    }

    const after = board.clone();
    MoveExecutor.executeMove(after, move, color);
    const enemy = color === 'white' ? 'black' : 'white';
    if (after.inCheck) {
      san += GameRules.getLegalMoves(after, enemy).length === 0 ? '#' : '+';
    }
    return san;
  }
}
