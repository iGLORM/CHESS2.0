class StockfishCoach {
  static _infoLines = [];
  static _origListener = null;
  static _analysisResolve = null;
  static _analysisReject = null;
  static _initialized = false;

  static async init() {
    if (this._initialized) return;
    await BotPersonality.init();
    this._initialized = true;
  }

  static async evaluatePosition(fen, depth = 12) {
    await this.init();

    if (BotPersonality.useServerAPI) {
      return this._evaluateViaServer(fen, depth);
    }

    return this._evaluateViaWasm(fen, depth);
  }

  static async _evaluateViaWasm(fen, depth) {
    this._infoLines = [];

    const origListener = BotPersonality.engine.listener;
    BotPersonality.engine.listener = (line) => {
      if (!line) return;
      if (line.startsWith('info') && line.includes('score')) {
        this._infoLines.push(line);
      }
      if (origListener) origListener(line);
    };

    BotPersonality._send('isready');
    await BotPersonality._waitFor('readyok', 5000);

    BotPersonality._send(`position fen ${fen}`);
    BotPersonality._send(`go depth ${depth}`);

    const bestMove = await BotPersonality._waitForBestMove(15000);

    BotPersonality.engine.listener = origListener;

    const lastInfo = this._infoLines[this._infoLines.length - 1] || '';
    const parsed = this._parseInfoLine(lastInfo);

    return {
      bestMove: bestMove || null,
      scoreCp: parsed.scoreCp,
      mate: parsed.mate,
      pv: parsed.pv,
    };
  }

  static async _evaluateViaServer(fen, depth) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(BotPersonality.serverAPIUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, depth, mode: 'analysis' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) return this._fallbackEval(fen);

      const data = await response.json();
      return {
        bestMove: data.bestmove || null,
        scoreCp: data.score != null ? data.score : null,
        mate: data.mate || null,
        pv: data.pv ? data.pv.split(' ') : [],
      };
    } catch (e) {
      clearTimeout(timeout);
      return this._fallbackEval(fen);
    }
  }

  static _fallbackEval(fen) {
    const board = FEN.toBoard(fen);
    const color = fen.split(' ')[1] === 'w' ? 'white' : 'black';
    const bestMove = Search.findBestMove(board, color, 4);
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
