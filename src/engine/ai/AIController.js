class AIController {
  // Levels 0-5 use the built-in engine with deliberate mistakes ("noise");
  // levels 6+ use Stockfish at increasing skill. Both run in background workers.
  static LEVEL_CONFIG = {
    0:  { depth: 1, noise: 0.70, name: 'Newcomer' },
    1:  { depth: 2, noise: 0.45, name: 'Beginner' },
    2:  { depth: 2, noise: 0.28, name: 'Novice' },
    3:  { depth: 3, noise: 0.15, name: 'Apprentice' },
    4:  { depth: 3, noise: 0.07, name: 'Intermediate' },
    5:  { depth: 4, noise: 0.03, name: 'Skilled' },
    6:  { depth: 4, noise: 0, name: 'Advanced',     stockfish: { skill: 1,  depth: 6 } },
    7:  { depth: 4, noise: 0, name: 'Expert',       stockfish: { skill: 4,  depth: 8 } },
    8:  { depth: 5, noise: 0, name: 'Master',       stockfish: { skill: 8,  depth: 10 } },
    9:  { depth: 5, noise: 0, name: 'Grandmaster',  stockfish: { skill: 12, movetime: 800 } },
    10: { depth: 5, noise: 0, name: 'Chess 2.0',    stockfish: { skill: 16, movetime: 1200 } },
    11: { depth: 5, noise: 0, name: 'Impossible',   stockfish: { skill: 20, movetime: 1500 } },
    12: { depth: 5, noise: 0, name: 'Madness',      stockfish: { skill: 20, movetime: 2500 } },
  };

  // Synchronous fallback (blocks the page; only used if workers are unavailable).
  static getMove(board, color, level) {
    const config = this.LEVEL_CONFIG[level] || this.LEVEL_CONFIG[1];
    const depth = Math.min(config.depth, 3);
    if (config.noise > 0) {
      return Search.findBestMoveWithNoise(board, color, depth, config.noise);
    }
    return Search.findBestMove(board, color, depth);
  }

  static async getMoveAsync(board, color, level, legalMoves) {
    const config = this.LEVEL_CONFIG[level] || this.LEVEL_CONFIG[1];
    const fen = FEN.fromBoard(board, color);

    if (config.stockfish) {
      const uci = await BotPersonality.bestMove(fen, config.stockfish);
      const move = BotPersonality._uciToMove(uci, legalMoves);
      if (move) return move;
    }

    const found = await BotPersonality.searchMove(fen, color, config.depth, config.noise);
    const move = BotPersonality._findLegal(found, legalMoves);
    if (move) return move;

    return this.getMove(board, color, level);
  }
}
