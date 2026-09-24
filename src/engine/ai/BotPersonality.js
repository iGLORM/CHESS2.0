/**
 * BotPersonality - runs the game's two chess engines off the main thread so
 * the game never freezes while the computer thinks:
 *
 *   - Stockfish (bundled WebAssembly build) in a Web Worker, spoken to over UCI.
 *   - The built-in alpha-beta engine (Search.js) in its own worker, used for
 *     the weakest levels where human-like mistakes matter more than strength.
 *
 * Everything is local; nothing is sent over the network.
 */
class BotPersonality {
  static STOCKFISH_PATH = 'engine/stockfish/stockfish-18-lite-single.js';
  static SEARCH_WORKER_PATH = 'engine/ai/searchWorker.js';

  static _sf = null;          // Stockfish worker
  static _sfReady = null;     // Promise<boolean>
  static _sfQueue = Promise.resolve();
  static _sfListener = null;

  static _search = null;      // built-in engine worker
  static _searchId = 0;
  static _searchPending = new Map();

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
          if (line.startsWith('info') && line.includes(' pv ')) lastInfo = line;
          if (line.startsWith('bestmove')) {
            const uci = line.split(/\s+/)[1];
            finish({ bestMove: uci && uci !== '(none)' ? uci : null, info: lastInfo });
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
    const go = opts.movetime ? `go movetime ${opts.movetime}` : `go depth ${opts.depth || 10}`;
    const result = await this._runSearch([
      'ucinewgame',
      `setoption name Skill Level value ${skill}`,
      `position fen ${fen}`,
      go,
    ], (opts.movetime || 4000) + 6000);
    return result ? result.bestMove : null;
  }

  /** Evaluation for the coach: { bestMove, scoreCp, mate, pv } or null. */
  static async analyse(fen, depth = 12) {
    const result = await this._runSearch([
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

  /* ------------------------------------------------------------------ */
  /*  Built-in engine                                                    */
  /* ------------------------------------------------------------------ */

  /** Best move from the built-in engine as { from, to, promotion }, or null. */
  static searchMove(fen, color, depth, noise, timeoutMs = 8000) {
    if (!this._search) {
      try {
        this._search = new Worker(this.SEARCH_WORKER_PATH);
        this._search.onmessage = (e) => {
          const pending = this._searchPending.get(e.data.id);
          if (pending) {
            this._searchPending.delete(e.data.id);
            pending(e.data.move);
          }
        };
        this._search.onerror = (e) => console.warn('Search worker error:', e.message);
      } catch (e) {
        return Promise.resolve(null);
      }
    }
    const id = ++this._searchId;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this._searchPending.delete(id);
        resolve(null);
      }, timeoutMs);
      this._searchPending.set(id, (move) => {
        clearTimeout(timer);
        resolve(move);
      });
      this._search.postMessage({ id, fen, color, depth, noise });
    });
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
