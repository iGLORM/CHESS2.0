/**
 * BotPersonality - runs the bundled Stockfish (WebAssembly) in a Web Worker,
 * spoken to over UCI, so the game never freezes while the computer thinks.
 *
 * Strong levels use Stockfish's own skill setting. Easy levels ask Stockfish to
 * score many moves at once (MultiPV) and then sometimes pick a worse one, so the
 * bot makes human-sized mistakes instead of random ones.
 *
 * Everything is local; nothing is sent over the network.
 */
class BotPersonality {
  static STOCKFISH_PATH = 'engine/stockfish/stockfish-18-lite-single.js';

  static _sf = null;          // Stockfish worker
  static _sfReady = null;     // Promise<boolean>
  static _sfQueue = Promise.resolve();
  static _sfListener = null;

  /* ------------------------------------------------------------------ */
  /*  Stockfish                                                          */
  /* ------------------------------------------------------------------ */

  static init() {
    if (this._sfReady) return this._sfReady;
    this._sfReady = new Promise((resolve) => {
      try {
        this._sf = new Worker(this.STOCKFISH_PATH);
      } catch (e) {
        console.warn('Stockfish worker unavailable:', e.message);
        resolve(false);
        return;
      }
      const timer = setTimeout(() => resolve(false), 10000);
      this._sf.onmessage = (e) => {
        const line = String(e.data);
        if (line === 'readyok' && timer) {
          clearTimeout(timer);
          resolve(true);
        }
        if (this._sfListener) this._sfListener(line);
      };
      this._sf.onerror = (e) => {
        console.warn('Stockfish worker error:', e.message);
        clearTimeout(timer);
        resolve(false);
      };
      this._sf.postMessage('uci');
      this._sf.postMessage('isready');
    });
    return this._sfReady;
  }

  static get available() {
    return !!this._sf;
  }

  // Runs one UCI search at a time. Resolves with { bestMove, info } or null.
  static _runSearch(commands, timeoutMs) {
    const job = this._sfQueue.then(async () => {
      if (!(await this.init())) return null;
      return new Promise((resolve) => {
        let lastInfo = '';
        const lines = [];
        const finish = (result) => {
          clearTimeout(timer);
          this._sfListener = null;
          resolve(result);
        };
        const timer = setTimeout(() => {
          // Ask for the move now; if Stockfish is wedged, give up.
          this._sf.postMessage('stop');
          setTimeout(() => finish(null), 1000);
        }, timeoutMs);
        this._sfListener = (line) => {
          if (line.startsWith('info') && line.includes(' pv ')) { lastInfo = line; lines.push(line); }
          if (line.startsWith('bestmove')) {
            const uci = line.split(/\s+/)[1];
            finish({ bestMove: uci && uci !== '(none)' ? uci : null, info: lastInfo, lines });
          }
        };
        for (const cmd of commands) this._sf.postMessage(cmd);
      });
    });
    this._sfQueue = job.catch(() => null);
    return job;
  }

  /**
   * Best move from Stockfish as a UCI string (e.g. "e2e4"), or null.
   * opts: { skill 0-20, depth?, movetime? }
   */
  static async bestMove(fen, opts = {}) {
    const skill = Math.max(0, Math.min(20, opts.skill ?? 20));
    const go = (opts.movetime ? `go movetime ${opts.movetime}` : `go depth ${opts.depth || 10}`) +
      this._searchMoves(opts);
    const result = await this._runSearch([
      'ucinewgame',
      'setoption name MultiPV value 1',
      `setoption name Skill Level value ${skill}`,
      `position fen ${fen}`,
      go,
    ], (opts.movetime || 4000) + 6000);
    return result ? result.bestMove : null;
  }

  /** Evaluation for the coach: { bestMove, scoreCp, mate, pv } or null. */
  static async analyse(fen, depth = 12) {
    const result = await this._runSearch([
      'setoption name MultiPV value 1',
      'setoption name Skill Level value 20',
      `position fen ${fen}`,
      `go depth ${depth}`,
    ], 15000);
    if (!result) return null;
    const cp = result.info.match(/score cp (-?\d+)/);
    const mate = result.info.match(/score mate (-?\d+)/);
    const pv = result.info.match(/\bpv\s+(.+)/);
    return {
      bestMove: result.bestMove,
      scoreCp: cp ? parseInt(cp[1], 10) : null,
      mate: mate ? parseInt(mate[1], 10) : null,
      pv: pv ? pv[1].trim().split(/\s+/) : [],
    };
  }

  /**
   * Move for the easy levels as a UCI string, or null. Stockfish scores up to
   * `multipv` moves at `depth`; with probability `noise` the bot then picks one
   * at random, weighted so small slips are far more likely than big blunders.
   * opts: { depth, noise 0-1, multipv? }
   */
  static async humanMove(fen, opts = {}) {
    const noise = opts.noise || 0;
    const result = await this._runSearch([
      'ucinewgame',
      `setoption name MultiPV value ${opts.multipv || 40}`,
      'setoption name Skill Level value 20',
      `position fen ${fen}`,
      `go depth ${opts.depth || 4}` + this._searchMoves(opts),
    ], 10000);
    if (!result) return null;
    if (Math.random() >= noise) return result.bestMove;

    // Latest line per MultiPV slot = that move's score at the deepest depth reached.
    const byMove = new Map();
    for (const line of result.lines) {
      const move = line.match(/\bpv\s+(\S+)/);
      const cp = line.match(/score cp (-?\d+)/);
      const mate = line.match(/score mate (-?\d+)/);
      if (!move) continue;
      const score = cp ? parseInt(cp[1], 10) : mate ? (parseInt(mate[1], 10) > 0 ? 3000 : -3000) : 0;
      byMove.set(move[1], Math.max(-3000, Math.min(3000, score)));
    }
    if (byMove.size === 0) return result.bestMove;

    const best = Math.max(...byMove.values());
    const temperature = 30 + 450 * noise;
    const weighted = [...byMove].map(([move, score]) => [move, Math.exp((score - best) / temperature)]);
    let r = Math.random() * weighted.reduce((sum, [, w]) => sum + w, 0);
    for (const [move, w] of weighted) {
      r -= w;
      if (r <= 0) return move;
    }
    return result.bestMove;
  }

  // opts.searchmoves: UCI moves Stockfish may choose from (e.g. when tiles are locked).
  static _searchMoves(opts) {
    return opts.searchmoves && opts.searchmoves.length ? ` searchmoves ${opts.searchmoves.join(' ')}` : '';
  }

  static moveToUci(move) {
    const promo = { queen: 'q', rook: 'r', bishop: 'b', knight: 'n' };
    return 'abcdefgh'[move.from.col] + (8 - move.from.row) + 'abcdefgh'[move.to.col] + (8 - move.to.row) +
      (move.promotion ? promo[move.promotion] : '');
  }

  /* ------------------------------------------------------------------ */
  /*  Move conversion                                                    */
  /* ------------------------------------------------------------------ */

  static _uciToMove(uci, legalMoves) {
    if (!uci || uci.length < 4) return null;

    const fromCol = uci.charCodeAt(0) - 97;
    const fromRow = 8 - parseInt(uci[1]);
    const toCol   = uci.charCodeAt(2) - 97;
    const toRow   = 8 - parseInt(uci[3]);

    let promotion = null;
    if (uci.length === 5) {
      const promoMap = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
      promotion = promoMap[uci[4]] || null;
    }

    return this._findLegal({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, promotion }, legalMoves);
  }

  static _findLegal(move, legalMoves) {
    if (!move) return null;
    return legalMoves.find(m =>
      m.from.row === move.from.row && m.from.col === move.from.col &&
      m.to.row === move.to.row && m.to.col === move.to.col &&
      (m.promotion || null) === (move.promotion || null)
    ) || null;
  }
}
