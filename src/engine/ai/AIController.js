class AIController {
  // Every level is played by the bundled Stockfish, in a background worker.
  // Levels 0-5 (`human`) make deliberate, human-sized mistakes: `noise` is how
  // often the bot slips and how big the slips can be. Levels 6+ use Stockfish's
  // own skill setting.
  static LEVEL_CONFIG = {
    0:  { name: 'Newcomer',     human: { depth: 1, noise: 0.70 } },
    1:  { name: 'Beginner',     human: { depth: 2, noise: 0.45 } },
    2:  { name: 'Novice',       human: { depth: 2, noise: 0.28 } },
    3:  { name: 'Apprentice',   human: { depth: 3, noise: 0.15 } },
    4:  { name: 'Intermediate', human: { depth: 3, noise: 0.07 } },
    5:  { name: 'Skilled',      human: { depth: 4, noise: 0.03 } },
    6:  { name: 'Advanced',     stockfish: { skill: 1,  depth: 6 } },
    7:  { name: 'Expert',       stockfish: { skill: 4,  depth: 8 } },
    8:  { name: 'Master',       stockfish: { skill: 8,  depth: 10 } },
    9:  { name: 'Grandmaster',  stockfish: { skill: 12, movetime: 800 } },
    10: { name: 'Chess 2.0',    stockfish: { skill: 16, movetime: 1200 } },
    11: { name: 'Impossible',   stockfish: { skill: 20, movetime: 1500 } },
    12: { name: 'Madness',      stockfish: { skill: 20, movetime: 2500 } },
  };

  static async getMoveAsync(board, color, level, legalMoves) {
    const config = this.LEVEL_CONFIG[level] || this.LEVEL_CONFIG[1];
    const fen = FEN.fromBoard(board, color);

    // Stockfish cannot see CastlE's walls (FEN leaves them out). If hiding them
    // would put the other king in check, the position is illegal to Stockfish.
    const walls = board.grid.some(row => row.some(p => p && p.type === 'wall'));
    if (walls && this._wallsHideCheck(board, color)) return this._fallbackMove(legalMoves);

    // Some moves may be ruled out by the game (locked tiles, walls); tell Stockfish which remain.
    const restricted = walls || legalMoves.length < GameRules.getLegalMoves(board, color).length;
    const searchmoves = restricted ? legalMoves.map(m => BotPersonality.moveToUci(m)) : null;

    const uci = config.human
      ? await BotPersonality.humanMove(fen, { ...config.human, searchmoves })
      : await BotPersonality.bestMove(fen, { ...config.stockfish, searchmoves });
    const move = BotPersonality._uciToMove(uci, legalMoves);
    if (move) return move;

    // Stockfish didn't answer (it should always load): don't leave the player waiting.
    console.warn('Stockfish gave no move; playing a fallback move');
    return this._fallbackMove(legalMoves);
  }

  static _wallsHideCheck(board, color) {
    const open = board.clone();
    open.grid = open.grid.map(row => row.map(p => (p && p.type === 'wall' ? null : p)));
    const enemy = color === 'white' ? 'black' : 'white';
    const king = open.findKing(enemy);
    return !!king && MoveGen.isSquareAttacked(open, king.row, king.col, color);
  }

  // Takes the most valuable piece on offer, otherwise plays any move.
  static _fallbackMove(legalMoves) {
    const VALUES = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
    const captures = legalMoves.filter(m => m.captured);
    if (captures.length) {
      return captures.reduce((a, b) => (VALUES[b.captured.type] > VALUES[a.captured.type] ? b : a));
    }
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }
}
