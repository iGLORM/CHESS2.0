class AIController {
  static LEVEL_CONFIG = {
    1:  { depth: 2, noise: 0.45, name: 'Beginner',     stockfish: false },
    2:  { depth: 3, noise: 0.30, name: 'Novice',       stockfish: false },
    3:  { depth: 3, noise: 0.15, name: 'Apprentice',   stockfish: false },
    4:  { depth: 4, noise: 0.08, name: 'Intermediate', stockfish: false },
    5:  { depth: 4, noise: 0.04, name: 'Skilled',      stockfish: false },
    6:  { depth: 5, noise: 0.0,  name: 'Advanced',     stockfish: true  },
    7:  { depth: 5, noise: 0.0,  name: 'Expert',       stockfish: true  },
    8:  { depth: 6, noise: 0.0,  name: 'Master',       stockfish: true  },
    9:  { depth: 7, noise: 0.0,  name: 'Grandmaster',  stockfish: true  },
    10: { depth: 8, noise: 0.0,  name: 'Chess 2.0',    stockfish: true  },
    11: { depth: 8, noise: 0.0,  name: 'Impossible',   stockfish: true  },
    12: { depth: 8, noise: 0.0,  name: 'Madness',      stockfish: true  },
  };

  static getMove(board, color, level) {
    const config = this.LEVEL_CONFIG[level] || this.LEVEL_CONFIG[1];

    if (config.noise > 0) {
      return Search.findBestMoveWithNoise(board, color, config.depth, config.noise);
    }
    return Search.findBestMove(board, color, config.depth);
  }

  static async getMoveAsync(board, color, level, legalMoves) {
    const config = this.LEVEL_CONFIG[level] || this.LEVEL_CONFIG[1];

    // Try Stockfish for high-level personalities (level 6+)
    if (config.stockfish) {
      try {
        const fen = FEN.fromBoard(board, color);
        const personality = BotPersonality.mapLevel(level);
        const move = await BotPersonality.getMove(fen, personality, legalMoves);
        if (move) return move;
      } catch (e) {
        console.warn('Stockfish failed, falling back to local engine:', e);
      }
    }

    // Try cloud eval for levels 3+
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