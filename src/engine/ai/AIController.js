class AIController {
  static LEVEL_CONFIG = {
    1:  { depth: 4, noise: 0.45, name: 'Beginner' },
    2:  { depth: 5, noise: 0.25, name: 'Novice' },
    3:  { depth: 6, noise: 0.12, name: 'Apprentice' },
    4:  { depth: 7, noise: 0.06, name: 'Intermediate' },
    5:  { depth: 8, noise: 0.03, name: 'Skilled' },
    6:  { depth: 9, noise: 0.0,  name: 'Advanced' },
    7:  { depth: 10, noise: 0.0, name: 'Expert' },
    8:  { depth: 11, noise: 0.0, name: 'Master' },
    9:  { depth: 12, noise: 0.0, name: 'Grandmaster' },
    10: { depth: 13, noise: 0.0, name: 'Chess 2.0' },
    11: { depth: 14, noise: 0.0, name: 'Impossible' },
    12: { depth: 15, noise: 0.0, name: 'Madness' },
  };

  static getMove(board, color, level) {
    const config = this.LEVEL_CONFIG[level] || this.LEVEL_CONFIG[1];

    if (config.noise > 0) {
      return Search.findBestMoveWithNoise(board, color, config.depth, config.noise);
    }
    return Search.findBestMove(board, color, config.depth);
  }

  static async getMoveAsync(board, color, level, legalMoves) {
    // Try cloud eval first for levels 3+
    if (level >= 3 && level <= 10) {
      try {
        const fen = FEN.fromBoard(board, color);
        const uciMove = await CloudEval.getBestMove(fen, level);
        if (uciMove) {
          const move = CloudEval.findMatchingMove(uciMove, legalMoves);
          if (move) return move;
        }
      } catch (e) {
        // Cloud eval failed, fall through to local
      }
    }

    // Fallback to local engine
    return this.getMove(board, color, level);
  }
}