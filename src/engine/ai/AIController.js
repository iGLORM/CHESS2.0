class AIController {
  // Every level is played by the bundled Stockfish, in a background worker.
  // Levels 0-5 (`human`) make deliberate, human-sized mistakes: `noise` is how
  // often the bot slips and how big the slips can be. Levels 6+ use Stockfish's
  // own skill setting.
  // `elo` is a rough guide for players (shown in Classic and Custom), `blurb` one line about the bot.
  static LEVEL_CONFIG = {
    0:  { name: 'Newcomer',     elo: 250,  blurb: 'Still learning how the pieces move.',      human: { depth: 1, noise: 0.70 } },
    1:  { name: 'Beginner',     elo: 400,  blurb: 'Leaves pieces hanging. Learn the rules.',  human: { depth: 2, noise: 0.45 } },
    2:  { name: 'Novice',       elo: 600,  blurb: 'Knows the basics, misses easy tactics.',   human: { depth: 2, noise: 0.28 } },
    3:  { name: 'Apprentice',   elo: 800,  blurb: 'Spots simple threats most of the time.',   human: { depth: 3, noise: 0.15 } },
    4:  { name: 'Intermediate', elo: 1000, blurb: 'Solid club play with the odd slip.',       human: { depth: 3, noise: 0.07 } },
    5:  { name: 'Skilled',      elo: 1200, blurb: 'Rarely blunders. Punishes yours.',         human: { depth: 4, noise: 0.03 } },
    6:  { name: 'Advanced',     elo: 1400, blurb: 'Plays real plans and sharp tactics.',      stockfish: { skill: 1,  depth: 6 } },
    7:  { name: 'Expert',       elo: 1600, blurb: 'Strong in every phase of the game.',       stockfish: { skill: 4,  depth: 8 } },
    8:  { name: 'Master',       elo: 1800, blurb: 'Near-perfect calculation.',                stockfish: { skill: 8,  depth: 10 } },
    9:  { name: 'Grandmaster',  elo: 2000, blurb: 'Deep, patient and precise.',               stockfish: { skill: 12, movetime: 800 } },
    10: { name: 'Chess 2.0',    elo: 2300, blurb: 'Beyond most humans.',                      stockfish: { skill: 16, movetime: 1200 } },
    11: { name: 'Impossible',   elo: 2700, blurb: 'Full-strength Stockfish.',                 stockfish: { skill: 20, movetime: 1500 } },
    12: { name: 'Madness',      elo: 3000, blurb: 'Full strength, thinking even longer.',     stockfish: { skill: 20, movetime: 2500 } },
  };

  static MAX_LEVEL = 12;

  static levelInfo(level) {
    return this.LEVEL_CONFIG[level] || this.LEVEL_CONFIG[4];
  }

  // The level whose Elo is closest (old saves kept an Elo from 200 to 2000).
  static levelFromElo(elo) {
    let best = 0;
    for (let l = 0; l <= this.MAX_LEVEL; l++) {
      if (Math.abs(this.LEVEL_CONFIG[l].elo - elo) < Math.abs(this.LEVEL_CONFIG[best].elo - elo)) best = l;
    }
    return best;
  }

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
