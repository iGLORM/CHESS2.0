class MoveExecutor {
  static executeMoveRaw(board, move) {
    const piece = board.grid[move.from.row][move.from.col];
    if (!piece) return;

    board.grid[move.to.row][move.to.col] = piece;
    board.grid[move.from.row][move.from.col] = null;

    if (move.castling) {
      const row = move.from.row;
      if (move.to.col > move.from.col) {
        const rook = board.grid[row][7];
        board.grid[row][5] = rook;
        board.grid[row][7] = null;
      } else {
        const rook = board.grid[row][0];
        board.grid[row][3] = rook;
        board.grid[row][0] = null;
      }
    }

    if (move.enPassantCapture) {
      // The captured pawn is on the same row as the capturing pawn,
      // in the same column as the destination square.
      board.grid[move.from.row][move.to.col] = null;
    }
  }

  static executeMove(board, move, color) {
    const piece = board.grid[move.from.row][move.from.col];
    const captured = move.captured || null;

    this.executeMoveRaw(board, move);

    // Half-move clock for 50-move rule
    if (piece.type === 'pawn' || captured) {
      board.halfMoveClock = 0;
    } else {
      board.halfMoveClock++;
    }

    if (move.promotion && piece.type === 'pawn') {
      board.grid[move.to.row][move.to.col] = { type: move.promotion, color };
    }

    board.turn = color === 'white' ? 'black' : 'white';

    if (piece.type === 'pawn' && Math.abs(move.to.row - move.from.row) === 2) {
      board.enPassantTarget = {
        row: (move.from.row + move.to.row) / 2,
        col: move.from.col,
      };
    } else {
      board.enPassantTarget = null;
    }

    if (piece.type === 'king') {
      board.castlingRights[color].kingside = false;
      board.castlingRights[color].queenside = false;
    }
    if (piece.type === 'rook') {
      if (move.from.col === 0) board.castlingRights[color].queenside = false;
      if (move.from.col === 7) board.castlingRights[color].kingside = false;
    }
    if (move.to.row === 0 && move.to.col === 0) board.castlingRights['black'].queenside = false;
    if (move.to.row === 0 && move.to.col === 7) board.castlingRights['black'].kingside = false;
    if (move.to.row === 7 && move.to.col === 0) board.castlingRights['white'].queenside = false;
    if (move.to.row === 7 && move.to.col === 7) board.castlingRights['white'].kingside = false;

    board.positionHistory.push(board.posKey());

    const enemyKing = board.findKing(board.turn);
    board.inCheck = enemyKing ? MoveGen.isSquareAttacked(board, enemyKing.row, enemyKing.col, color) : false;

    return { captured, piece, move };
  }

  static isMoveLegal(board, move, color) {
    const pseudoMoves = MoveGen.generateMoves(board, color);
    const legalMoves = LegalFilter.filterMoves(board, pseudoMoves, color);
    return legalMoves.some(m =>
      m.from.row === move.from.row && m.from.col === move.from.col &&
      m.to.row === move.to.row && m.to.col === move.to.col &&
      (m.promotion || null) === (move.promotion || null)
    );
  }
}
