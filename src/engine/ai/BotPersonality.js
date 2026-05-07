/**
 * BotPersonality - Stockfish.js wrapper for Chess 2.0
 *
 * Wraps the Stockfish 18 (lite) engine and exposes three personalities:
 *   Noob         - Skill Level 0,  depth 1, 30% chance of random move
 *   Intermediate - Skill Level 5,  depth 5
 *   Pro          - Skill Level 20, depth 20
 */
class BotPersonality {
  static engine = null;
  static ready = false;
  static outputBuffer = [];
  static pendingResolve = null;
  static pendingReject = null;
  static initPromise = null;

  static PERSONALITIES = {
    noob:         { skillLevel: 0,  depth: 1,  randomChance: 0.30, movetime: null },
    intermediate: { skillLevel: 5,  depth: 5,  randomChance: 0.00, movetime: null },
    pro:          { skillLevel: 20, depth: 20, randomChance: 0.00, movetime: 5000 },
  };

  /**
   * Initialise the Stockfish engine (singleton).
   */
  static async init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._doInit();
    return this.initPromise;
  }

  static async _doInit() {
    // Try to grab the factory that stockfish.js stashed on its <script> node
    const script = document.querySelector('script[src*="stockfish"]');
    const factory = script ? script._exports : null;

    if (!factory) {
      throw new Error('Stockfish factory not found. Is stockfish.js loaded?');
    }

    const basePath = script.src.replace(/\/[^\/]+$/, '/');

    this.engine = factory({
      locateFile: (file) => basePath + file,
      listener: (line) => this._onEngineOutput(line),
    });

    // Wait until the WASM module has finished initialising
    if (this.engine.ready && typeof this.engine.ready.then === 'function') {
      await this.engine.ready;
    } else {
      await this._pollReady();
    }

    // UCI handshake
    this._send('uci');
    await this._waitFor('uciok');

    this._send('isready');
    await this._waitFor('readyok');

    this.ready = true;
    return true;
  }

  /**
   * Ask Stockfish for the best move for a given FEN and personality.
   *
   * @param {string} fen          – position in FEN notation
   * @param {string} profileKey   – 'noob' | 'intermediate' | 'pro'
   * @param {Array}  legalMoves   – game's legal-move objects (for UCI→move lookup)
   * @returns {Promise<Object>}   – resolves to a move object or null
   */
  static async getMove(fen, profileKey, legalMoves) {
    await this.init();

    const profile = this.PERSONALITIES[profileKey] || this.PERSONALITIES.noob;

    // Personality: random-move injection for Noob
    if (profile.randomChance > 0 && Math.random() < profile.randomChance) {
      return legalMoves[Math.floor(Math.random() * legalMoves.length)] || null;
    }

    // Configure Stockfish
    this._send(`setoption name Skill Level value ${profile.skillLevel}`);
    this._send(`setoption name UCI_LimitStrength value ${profile.skillLevel < 20 ? 'true' : 'false'}`);

    this._send(`position fen ${fen}`);

    if (profile.movetime) {
      this._send(`go movetime ${profile.movetime}`);
    } else {
      this._send(`go depth ${profile.depth}`);
    }

    const bestMoveUci = await this._waitForBestMove();
    if (!bestMoveUci) return null;

    return this._uciToMove(bestMoveUci, legalMoves);
  }

  /* ------------------------------------------------------------------ */
  /*  UCI helpers                                                        */
  /* ------------------------------------------------------------------ */

  static _send(cmd) {
    if (!this.engine) return;
    if (typeof this.engine.ccall === 'function') {
      this.engine.ccall('command', null, ['string'], [cmd], { async: /^go\b/.test(cmd) });
    } else if (typeof this.engine.postMessage === 'function') {
      this.engine.postMessage(cmd);
    }
  }

  static _onEngineOutput(line) {
    if (!line) return;
    // Best-move resolution
    if (line.startsWith('bestmove')) {
      const parts = line.trim().split(/\s+/);
      const uci = parts[1];
      if (this.pendingResolve) {
        this.pendingResolve(uci);
        this.pendingResolve = null;
        this.pendingReject  = null;
      }
      return;
    }
    // Buffer everything else for _waitFor()
    this.outputBuffer.push(line);
  }

  static _pollReady() {
    return new Promise((resolve) => {
      const check = () => {
        if (this.engine && typeof this.engine._isReady === 'function' && this.engine._isReady()) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  static _waitFor(token, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const check = () => {
        const idx = this.outputBuffer.findIndex(l => l.includes(token));
        if (idx !== -1) {
          this.outputBuffer.splice(0, idx + 1);
          resolve();
          return;
        }
        if (Date.now() > deadline) {
          reject(new Error(`Timeout waiting for "${token}"`));
          return;
        }
        setTimeout(check, 20);
      };
      check();
    });
  }

  static _waitForBestMove(timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject  = reject;
      setTimeout(() => {
        if (this.pendingReject) {
          this.pendingReject(new Error('Stockfish bestmove timeout'));
          this.pendingResolve = null;
          this.pendingReject  = null;
        }
      }, timeoutMs);
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

    return (
      legalMoves.find(m =>
        m.from.row === fromRow && m.from.col === fromCol &&
        m.to.row   === toRow   && m.to.col   === toCol &&
        (m.promotion || null) === (promotion || null)
      ) || null
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Level → personality mapping                                        */
  /* ------------------------------------------------------------------ */

  static mapLevel(level) {
    if (level <= 4)  return 'noob';
    if (level <= 8)  return 'intermediate';
    return 'pro';
  }
}
