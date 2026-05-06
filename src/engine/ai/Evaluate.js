class Evaluate {
  static PIECE_VALUES = {
    pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 20000,
  };

  static PST = {
    pawn: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [5, 5, 10, 25, 25, 10, 5, 5],
      [0, 0, 0, 20, 20, 0, 0, 0],
      [5, -5, -10, 0, 0, -10, -5, 5],
      [5, 10, 10, -20, -20, 10, 10, 5],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    knight: [
      [-50, -40, -30, -30, -30, -30, -40, -50],
      [-40, -20, 0, 0, 0, 0, -20, -40],
      [-30, 0, 10, 15, 15, 10, 0, -30],
      [-30, 5, 15, 20, 20, 15, 5, -30],
      [-30, 0, 15, 20, 20, 15, 0, -30],
      [-30, 5, 10, 15, 15, 10, 5, -30],
      [-40, -20, 0, 5, 5, 0, -20, -40],
      [-50, -40, -30, -30, -30, -30, -40, -50],
    ],
    bishop: [
      [-20, -10, -10, -10, -10, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 10, 10, 10, 10, 0, -10],
      [-10, 5, 5, 10, 10, 5, 5, -10],
      [-10, 0, 10, 10, 10, 10, 0, -10],
      [-10, 10, 10, 10, 10, 10, 10, -10],
      [-10, 5, 0, 0, 0, 0, 5, -10],
      [-20, -10, -10, -10, -10, -10, -10, -20],
    ],
    rook: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [5, 10, 10, 10, 10, 10, 10, 5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [0, 0, 0, 5, 5, 0, 0, 0],
    ],
    queen: [
      [-20, -10, -10, -5, -5, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 5, 5, 5, 5, 0, -10],
      [-5, 0, 5, 5, 5, 5, 0, -5],
      [0, 0, 5, 5, 5, 5, 0, -5],
      [-10, 5, 5, 5, 5, 5, 0, -10],
      [-10, 0, 5, 0, 0, 0, 0, -10],
      [-20, -10, -10, -5, -5, -10, -10, -20],
    ],
    king: [
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-20, -30, -30, -40, -40, -30, -30, -20],
      [-10, -20, -20, -20, -20, -20, -20, -10],
      [20, 20, 0, 0, 0, 0, 20, 20],
      [20, 30, 10, 0, 0, 10, 30, 20],
    ],
  };

  static evaluate(board, color) {
    let score = 0;
    const enemy = color === 'white' ? 'black' : 'white';
    let ourBishops = 0, theirBishops = 0;
    let ourRooks = 0, theirRooks = 0;
    let ourPawns = 0, theirPawns = 0;
    let ourKing = null, theirKing = null;
    let pawnFiles = { white: new Set(), black: new Set() };
    const pawnPositions = { white: [], black: [] };

    // First pass: material + PST + piece counting
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board.grid[r][c];
        if (!p) continue;
        const pstRow = p.color === 'white' ? r : 7 - r;
        let val = this.PIECE_VALUES[p.type];
        if (this.PST[p.type]) {
          val += this.PST[p.type][pstRow][c];
        }
        score += p.color === color ? val : -val;

        if (p.type === 'bishop') {
          if (p.color === color) ourBishops++;
          else theirBishops++;
        }
        if (p.type === 'rook') {
          if (p.color === color) ourRooks++;
          else theirRooks++;
        }
        if (p.type === 'pawn') {
          if (p.color === color) { ourPawns++; pawnFiles.white.add(c); pawnPositions.white.push({ r, c }); }
          else { theirPawns++; pawnFiles.black.add(c); pawnPositions.black.push({ r, c }); }
        }
        if (p.type === 'king') {
          if (p.color === color) ourKing = { r, c };
          else theirKing = { r, c };
        }
      }
    }

    // Bishop pair bonus
    if (ourBishops >= 2) score += 50;
    if (theirBishops >= 2) score -= 50;

    // Rook on open file bonus
    for (let c = 0; c < 8; c++) {
      const hasOurPawn = pawnFiles.white.has(c);
      const hasTheirPawn = pawnFiles.black.has(c);
      if (!hasOurPawn && !hasTheirPawn) {
        // Completely open file
        for (let r = 0; r < 8; r++) {
          const p = board.grid[r][c];
          if (p && p.type === 'rook') {
            if (p.color === color) score += 25;
            else score -= 25;
          }
        }
      } else if (!hasOurPawn || !hasTheirPawn) {
        // Semi-open file
        for (let r = 0; r < 8; r++) {
          const p = board.grid[r][c];
          if (p && p.type === 'rook') {
            if (p.color === color && !hasOurPawn) score += 15;
            else if (p.color === enemy && !hasTheirPawn) score -= 15;
          }
        }
      }
    }

    // Pawn structure
    for (const wp of pawnPositions.white) {
      const isOurs = true;
      const isIsolated = !pawnFiles.white.has(wp.c - 1) && !pawnFiles.white.has(wp.c + 1);
      const isDoubled = pawnPositions.white.filter(p => p.c === wp.c).length > 1;
      if (isIsolated) score -= 20;
      if (isDoubled) score -= 15;
    }
    for (const bp of pawnPositions.black) {
      const isIsolated = !pawnFiles.black.has(bp.c - 1) && !pawnFiles.black.has(bp.c + 1);
      const isDoubled = pawnPositions.black.filter(p => p.c === bp.c).length > 1;
      if (isIsolated) score += 20;
      if (isDoubled) score += 15;
    }

    // Passed pawns (no enemy pawns ahead on same or adjacent files)
    for (const wp of pawnPositions.white) {
      let blocked = false;
      for (const bp of pawnPositions.black) {
        if (bp.r <= wp.r) continue; // enemy pawn is behind
        if (Math.abs(bp.c - wp.c) <= 1) { blocked = true; break; }
      }
      if (!blocked) {
        const promoDist = wp.r;
        score += (7 - promoDist) * 15 + 20;
      }
    }
    for (const bp of pawnPositions.black) {
      let blocked = false;
      for (const wp of pawnPositions.white) {
        if (wp.r >= bp.r) continue; // enemy pawn is behind
        if (Math.abs(wp.c - bp.c) <= 1) { blocked = true; break; }
      }
      if (!blocked) {
        const promoDist = 7 - bp.r;
        score -= (7 - promoDist) * 15 + 20;
      }
    }

    // King safety
    if (ourKing) {
      let pawnShield = 0;
      const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      for (const [dr, dc] of dirs) {
        const nr = ourKing.r + (color === 'white' ? -dr : dr);
        const nc = ourKing.c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const p = board.grid[nr][nc];
          if (p && p.type === 'pawn' && p.color === color) pawnShield++;
        }
      }
      score += pawnShield * 8;

      // Penalty for exposed king in middle game
      if (ourPawns + theirPawns > 12) {
        const kingDistFromCenter = Math.abs(ourKing.r - 3.5) + Math.abs(ourKing.c - 3.5);
        score -= kingDistFromCenter * 5;
      }
    }
    if (theirKing) {
      let pawnShield = 0;
      const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      for (const [dr, dc] of dirs) {
        const nr = theirKing.r + (enemy === 'white' ? -dr : dr);
        const nc = theirKing.c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const p = board.grid[nr][nc];
          if (p && p.type === 'pawn' && p.color === enemy) pawnShield++;
        }
      }
      score -= pawnShield * 8;
    }

    // Center control
    const centerSquares = [[3, 3], [3, 4], [4, 3], [4, 4]];
    for (const [r, c] of centerSquares) {
      const p = board.grid[r][c];
      if (p && p.color === color) score += 12;
      else if (p && p.color === enemy) score -= 12;
    }
    const extendedCenter = [[2, 2], [2, 3], [2, 4], [2, 5], [3, 2], [3, 5], [4, 2], [4, 5], [5, 2], [5, 3], [5, 4], [5, 5]];
    for (const [r, c] of extendedCenter) {
      const p = board.grid[r][c];
      if (p && p.color === color) score += 4;
      else if (p && p.color === enemy) score -= 4;
    }

    // Tempo bonus (side to move gets a small advantage)
    if (board.turn === color) score += 15;
    else score -= 15;

    // Development bonus (knights/bishops not on back rank)
    for (let c = 0; c < 8; c++) {
      const backRank = color === 'white' ? 7 : 0;
      const p = board.grid[backRank][c];
      if (p && p.color === color && (p.type === 'knight' || p.type === 'bishop')) score -= 15;
      const ep = board.grid[backRank === 7 ? 0 : 7][c];
      if (ep && ep.color === enemy && (ep.type === 'knight' || ep.type === 'bishop')) score += 15;
    }

    return score;
  }
}
