// Rules for the Chess 2.0 twist: the owner of a piece about to be captured may
// spend a Defense charge on a minigame; if they win, the capture is cancelled
// and the attacker loses their turn.
class CaptureRules {
  // The piece a move actually removes (en passant captures an empty square).
  static capturedPiece(board, move) {
    if (move.enPassantCapture) {
      const pawn = board.grid[move.from.row][move.to.col];
      return pawn && pawn.type === 'pawn' ? pawn : null;
    }
    return board.grid[move.to.row][move.to.col] || null;
  }

  // Whether the capture may be challenged with a minigame at all.
  // A capture made while in check is never challengeable: cancelling it would
  // leave the attacker's king in check with the opponent to move.
  static isChallengeable(board, move) {
    const piece = board.grid[move.from.row][move.from.col];
    const captured = this.capturedPiece(board, move);
    if (!piece || !captured || captured.type === 'king') return false;
    const king = board.findKing(piece.color);
    const enemy = piece.color === 'white' ? 'black' : 'white';
    if (king && MoveGen.isSquareAttacked(board, king.row, king.col, enemy)) return false;
    return true;
  }

  static canDefend(board, move, charges) {
    return (charges || 0) > 0 && this.isChallengeable(board, move);
  }
}
