class AIController {
  static LEVEL_CONFIG = {
    1:  { depth: 2, noise: 0.4,  name: 'Beginner' },
    2:  { depth: 3, noise: 0.2, name: 'Novice' },
    3:  { depth: 3, noise: 0.1, name: 'Apprentice' },
    4:  { depth: 4, noise: 0.05, name: 'Intermediate' },
    5:  { depth: 4, noise: 0.02, name: 'Skilled' },
    6:  { depth: 5, noise: 0.0, name: 'Advanced' },
    7:  { depth: 5, noise: 0.0, name: 'Expert' },
    8:  { depth: 6, noise: 0.0, name: 'Master' },
    9:  { depth: 7, noise: 0.0, name: 'Grandmaster' },
    10: { depth: 8, noise: 0.0, name: 'Chess 2.0' },
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
    if (level >= 3) {
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