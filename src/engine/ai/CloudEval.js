class CloudEval {
  static cache = new Map();
  static pending = 0;
  static maxPending = 2;
  static requestTimeout = 4000;

  static async getBestMove(fen, level) {
    if (level <= 2) return null;

    const cached = this.cache.get(fen);
    if (cached !== undefined) return cached;

    if (this.pending >= this.maxPending) return null;

    this.pending++;
    try {
      const multiPv = level >= 7 ? 1 : level >= 4 ? 3 : 5;
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), this.requestTimeout);

      const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=${multiPv}`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(tid);

      if (!response.ok) return null;

      const data = await response.json();
      if (!data || !data.pvs || data.pvs.length === 0) return null;

      const uciMove = this.pickMove(data.pvs, level);
      this.cache.set(fen, uciMove);
      return uciMove;
    } catch (e) {
      return null;
    } finally {
      this.pending--;
    }
  }

  static pickMove(pvs, level) {
    if (pvs.length === 0) return null;

    const getUci = (pv) => pv.moves.split(' ')[0];

    if (level >= 9) return getUci(pvs[0]);

    if (level >= 7) {
      if (Math.random() < 0.95) return getUci(pvs[0]);
      if (pvs.length > 1) return getUci(pvs[1]);
      return getUci(pvs[0]);
    }

    if (level >= 5) {
      const r = Math.random();
      if (r < 0.7) return getUci(pvs[0]);
      if (pvs.length > 1 && r < 0.9) return getUci(pvs[1]);
      return getUci(pvs[Math.min(pvs.length - 1, Math.floor(Math.random() * pvs.length))]);
    }

    if (level >= 3) {
      const r = Math.random();
      if (r < 0.5) return getUci(pvs[0]);
      if (pvs.length > 1 && r < 0.75) return getUci(pvs[1]);
      return getUci(pvs[Math.min(pvs.length - 1, Math.floor(Math.random() * pvs.length))]);
    }

    return getUci(pvs[Math.floor(Math.random() * pvs.length)];
  }

  static uciToMoveCoords(uci) {
    if (!uci || uci.length < 4) return null;

    const fromCol = uci.charCodeAt(0) - 97;
    const fromRow = 8 - parseInt(uci[1]);
    const toCol = uci.charCodeAt(2) - 97;
    const toRow = 8 - parseInt(uci[3]);

    let promotion = null;
    if (uci.length === 5) {
      const promoMap = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
      promotion = promoMap[uci[4]] || null;
    }

    return { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, promotion };
  }

  static findMatchingMove(uciMove, legalMoves) {
    const coords = this.uciToMoveCoords(uciMove);
    if (!coords) return null;

    return legalMoves.find(m =>
      m.from.row === coords.from.row &&
      m.from.col === coords.from.col &&
      m.to.row === coords.to.row &&
      m.to.col === coords.to.col &&
      (m.promotion || null) === (coords.promotion || null)
    ) || null;
  }
}