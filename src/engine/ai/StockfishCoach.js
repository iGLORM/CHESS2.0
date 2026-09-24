class StockfishCoach {
  static _initialized = false;

  static async init() {
    if (this._initialized) return;
    await BotPersonality.init();
    this._initialized = true;
  }

  static async evaluatePosition(fen, depth = 12) {
    const result = await BotPersonality.analyse(fen, depth);
    return result || this._fallbackEval(fen);
  }

  static _fallbackEval(fen) {
    const board = FEN.toBoard(fen);
    const color = fen.split(' ')[1] === 'w' ? 'white' : 'black';
    const bestMove = Search.findBestMove(board, color, 3);
    const score = Evaluate.evaluate(board, color);
    const uci = bestMove ? this._moveToUci(bestMove) : null;
    return { bestMove: uci, scoreCp: score, mate: null, pv: uci ? [uci] : [] };
  }

  static async evaluateMove(fen, playerMoveUci, depth = 10) {
    await this.init();

    const evalBefore = await this.evaluatePosition(fen, depth);
    if (!evalBefore.bestMove) {
      return { quality: 'good', cpLoss: 0, bestMove: null };
    }

    const board = FEN.toBoard(fen);
    const color = fen.split(' ')[1] === 'w' ? 'white' : 'black';
    const legalMoves = GameRules.getLegalMoves(board, color);
    const playerMove = BotPersonality._uciToMove(playerMoveUci, legalMoves);

    if (!playerMove) {
      return { quality: 'blunder', cpLoss: 9999, bestMove: evalBefore.bestMove };
    }

    if (playerMoveUci === evalBefore.bestMove) {
      return { quality: 'brilliant', cpLoss: 0, bestMove: evalBefore.bestMove };
    }

    MoveExecutor.executeMove(board, playerMove, color);
    const nextColor = color === 'white' ? 'black' : 'white';
    const fenAfter = FEN.fromBoard(board, nextColor);
    const evalAfter = await this.evaluatePosition(fenAfter, depth);

    let cpLoss = 0;
    if (evalBefore.mate && !evalAfter.mate) {
      cpLoss = 500;
    } else if (evalBefore.scoreCp != null && evalAfter.scoreCp != null) {
      cpLoss = Math.abs(evalBefore.scoreCp + evalAfter.scoreCp);
    }

    let quality;
    if (cpLoss <= 20) quality = 'brilliant';
    else if (cpLoss <= 60) quality = 'good';
    else if (cpLoss <= 150) quality = 'inaccuracy';
    else if (cpLoss <= 300) quality = 'mistake';
    else quality = 'blunder';

    return { quality, cpLoss, bestMove: evalBefore.bestMove };
  }

  static getHintForLevel(level, hintIndex) {
    if (!level || !level.hints) return 'Think carefully about the position.';
    const idx = Math.min(hintIndex, level.hints.length - 1);
    return level.hints[idx] || 'Try to find the best move.';
  }

  static _parseInfoLine(line) {
    let scoreCp = null;
    let mate = null;
    let pv = [];

    const cpMatch = line.match(/score cp (-?\d+)/);
    if (cpMatch) scoreCp = parseInt(cpMatch[1], 10);

    const mateMatch = line.match(/score mate (-?\d+)/);
    if (mateMatch) mate = parseInt(mateMatch[1], 10);

    const pvMatch = line.match(/\bpv\s+(.+)/);
    if (pvMatch) pv = pvMatch[1].trim().split(/\s+/);

    return { scoreCp, mate, pv };
  }

  static _moveToUci(move) {
    if (!move) return null;
    const fromFile = String.fromCharCode(97 + move.from.col);
    const fromRank = 8 - move.from.row;
    const toFile = String.fromCharCode(97 + move.to.col);
    const toRank = 8 - move.to.row;
    let uci = `${fromFile}${fromRank}${toFile}${toRank}`;
    if (move.promotion) {
      const promoMap = { queen: 'q', rook: 'r', bishop: 'b', knight: 'n' };
      uci += promoMap[move.promotion] || 'q';
    }
    return uci;
  }
}
