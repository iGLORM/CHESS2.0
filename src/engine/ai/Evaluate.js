class Evaluate {
  static PIECE_VALUES = {
    pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 20000,
  };

  static PST = {
    pawn: [
      [0,0,0,0,0,0,0,0], [50,50,50,50,50,50,50,50],
      [10,10,20,30,30,20,10,10], [5,5,10,25,25,10,5,5],
      [0,0,0,20,20,0,0,0], [5,-5,-10,0,0,-10,-5,5],
      [5,10,10,-20,-20,10,10,5], [0,0,0,0,0,0,0,0],
    ],
    knight: [
      [-50,-40,-30,-30,-30,-30,-40,-50], [-40,-20,0,0,0,0,-20,-40],
      [-30,0,10,15,15,10,0,-30], [-30,5,15,20,20,15,5,-30],
      [-30,0,15,20,20,15,0,-30], [-30,5,10,15,15,10,5,-30],
      [-40,-20,0,5,5,0,-20,-40], [-50,-40,-30,-30,-30,-30,-40,-50],
    ],
    bishop: [
      [-20,-10,-10,-10,-10,-10,-10,-20], [-10,0,0,0,0,0,0,-10],
      [-10,0,10,10,10,10,0,-10], [-10,5,5,10,10,5,5,-10],
      [-10,0,10,10,10,10,0,-10], [-10,10,10,10,10,10,10,-10],
      [-10,5,0,0,0,0,5,-10], [-20,-10,-10,-10,-10,-10,-10,-20],
    ],
    rook: [
      [0,0,0,0,0,0,0,0], [5,10,10,10,10,10,10,5],
      [-5,0,0,0,0,0,0,-5], [-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5], [-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5], [0,0,0,5,5,0,0,0],
    ],
    queen: [
      [-20,-10,-10,-5,-5,-10,-10,-20], [-10,0,0,0,0,0,0,-10],
      [-10,0,5,5,5,5,0,-10], [-5,0,5,5,5,5,0,-5],
      [0,0,5,5,5,5,0,-5], [-10,5,5,5,5,5,0,-10],
      [-10,0,5,0,0,0,0,-10], [-20,-10,-10,-5,-5,-10,-10,-20],
    ],
    king: [
      [-30,-40,-40,-50,-50,-40,-40,-30], [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30], [-30,-40,-40,-50,-50,-40,-40,-30],
      [-20,-30,-30,-40,-40,-30,-30,-20], [-10,-20,-20,-20,-20,-20,-20,-10],
      [20,20,0,0,0,0,20,20], [20,30,10,0,0,10,30,20],
    ],
  };

  static evaluate(board, color) {
    let score = 0;
    const enemy = color === 'white' ? 'black' : 'white';

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
      }
    }

    // Pawn structure analysis
    let ourPawns = 0, theirPawns = 0;
    let ourDoubled = 0, theirDoubled = 0;
    let ourIsolated = 0, theirIsolated = 0;

    for (let c = 0; c < 8; c++) {
      let foundOurPawn = false, foundTheirPawn = false;
      for (let r = 0; r < 8; r++) {
        const p = board.grid[r][c];
        if (!p || p.type !== 'pawn') continue;
        if (p.color === color) {
          if (foundOurPawn) ourDoubled++;
          foundOurPawn = true;
          // Check if isolated (no friendly pawns on adjacent files)
          const leftFile = c > 0 && board.grid[r][c - 1]?.find(p2 => p2.color === color && p2.type === 'pawn');
          const rightFile = c < 7 && board.grid[r][c + 1]?.find(p2 => p2.color === color && p2.type === 'pawn');
          if (!leftFile && !rightFile) ourIsolated++;
        } else {
          if (foundTheirPawn) theirDoubled++;
          foundTheirPawn = true;
          const leftFile = c > 0 && board.grid[r][c - 1]?.find(p2 => p2.color === enemy && p2.type === 'pawn');
          const rightFile = c < 7 && board.grid[r][c + 1]?.find(p2 => p2.color === enemy && p2.type === 'pawn');
          if (!leftFile && !rightFile) theirIsolated++;
        }
      }
    }

    // Penalize doubled and isolated pawns
    score -= ourDoubled * 15 + ourIsolated * 20;
    score += theirDoubled * 15 + theirIsolated * 20;

    // Passed pawns (no enemy pawns ahead)
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board.grid[r][c];
        if (!p || p.type !== 'pawn') continue;
        const dir = p.color === 'white' ? 1 : -1;
        let blocked = false;
        for (let nr = r + dir; nr >= 0 && nr < 8; nr += dir) {
          if (board.grid[nr][c]) { blocked = true; break; }
        }
        if (!blocked) {
          const promoRow = p.color === 'white' ? 7 : 0;
          const distToPromo = Math.abs(r - promoRow);
          const bonus = (8 - distToPromo) * 25;
          if (p.color === color) score += bonus;
          else score -= bonus;
        }
      }
    }

    // King safety (penalize exposed king)
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board.grid[r][c];
        if (!p || p.type !== 'king') continue;
        let pawnDefenders = 0;
        const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const defender = board.grid[nr][nc];
            if (defender && defender.color === p.color && defender.type === 'pawn') pawnDefenders++;
          }
        }
        if (p.color === color) score += pawnDefenders * 10;
        else score -= pawnDefenders * 10;
      }
    }

    // Center control bonus
    const centerSquares = [[3,3],[3,4],[4,3],[4,4]];
    for (const [r, c] of centerSquares) {
      const p = board.grid[r][c];
      if (p && p.color === color) score += 15;
      else if (p && p.color === enemy) score -= 15;
    }

    // Mobility: count legal moves
    const ourMoves = GameRules.getLegalMoves(board, color);
    const theirMoves = GameRules.getLegalMoves(board, enemy);
    score += (ourMoves.length - theirMoves.length) * 3;

    return score;
  }
}
