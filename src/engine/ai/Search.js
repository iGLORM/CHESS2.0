class Search {
  static nodesSearched = 0;
  static maxNodes = 10000;
  static abortSearch = false;
  static startTime = 0;
  static maxTime = 200;
  static maxDepth = 3;

  static SEARCH_LIMITS = {
    1: { maxNodes: 30000,   maxTime: 1500 },
    2: { maxNodes: 60000,   maxTime: 2500 },
    3: { maxNodes: 150000,  maxTime: 4000 },
    4: { maxNodes: 300000,  maxTime: 6000 },
    5: { maxNodes: 600000,  maxTime: 9000 },
    6: { maxNodes: 1200000, maxTime: 14000 },
    7: { maxNodes: 2500000, maxTime: 20000 },
    8: { maxNodes: 5000000, maxTime: 30000 },
    9: { maxNodes: 6000000, maxTime: 35000 },
    10:{ maxNodes: 7000000, maxTime: 40000 },
    11:{ maxNodes: 8000000, maxTime: 45000 },
    12:{ maxNodes: 9000000, maxTime: 50000 },
    13:{ maxNodes: 10000000, maxTime: 55000 },
    14:{ maxNodes: 12000000, maxTime: 60000 },
    15:{ maxNodes: 15000000, maxTime: 70000 },
  };

  static PIECE_ATTACK_ORDER = {
    pawn: 1, knight: 2, bishop: 3, rook: 4, queen: 5, king: 6,
  };

  static applyLimits(depth) {
    const limits = this.SEARCH_LIMITS[depth] || this.SEARCH_LIMITS[8];
    this.maxNodes = limits.maxNodes;
    this.maxTime = limits.maxTime;
  }

  static mvvLvaScore(move, board) {
    if (!move.captured) return 0;
    const attackerVal = this.PIECE_ATTACK_ORDER[board.grid[move.from.row][move.from.col]?.type] || 6;
    const victimVal = this.PIECE_ATTACK_ORDER[move.captured.type] || 1;
    return victimVal * 10 - attackerVal;
  }

  static orderMoves(moves, board, prioritizeHash = null) {
    return moves.slice().sort((a, b) => {
      // Prioritize the hash move first
      if (prioritizeHash) {
        if (a.from.row === prioritizeHash.from.row && a.from.col === prioritizeHash.from.col &&
            a.to.row === prioritizeHash.to.row && a.to.col === prioritizeHash.to.col) return -1;
        if (b.from.row === prioritizeHash.from.row && b.from.col === prioritizeHash.from.col &&
            b.to.row === prioritizeHash.to.row && b.to.col === prioritizeHash.to.col) return 1;
      }
      const aCapture = this.mvvLvaScore(a, board);
      const bCapture = this.mvvLvaScore(b, board);
      if (aCapture !== bCapture) return bCapture - aCapture;
      // Prioritize promotions
      if (a.promotion && !b.promotion) return -1;
      if (b.promotion && !a.promotion) return 1;
      return 0;
    });
  }

  static shouldAbort() {
    if (this.abortSearch) return true;
    if (this.nodesSearched > this.maxNodes) {
      this.abortSearch = true;
      return true;
    }
    if ((this.nodesSearched & 511) === 0 && Date.now() - this.startTime > this.maxTime) {
      this.abortSearch = true;
      return true;
    }
    return false;
  }

  static search(board, depth, color, alpha, beta, isMaximizing, precomputedMoves = null) {
    this.nodesSearched++;
    if (this.shouldAbort()) {
      return { score: Evaluate.evaluate(board, color) };
    }

    if (depth === 0) {
      return { score: this.quiescence(board, color, alpha, beta, isMaximizing, 0) };
    }

    const moves = precomputedMoves || GameRules.getLegalMoves(board, isMaximizing ? color : (color === 'white' ? 'black' : 'white'));

    if (moves.length === 0) {
      if (board.inCheck) {
        return { score: isMaximizing ? -99999 + (Search.maxDepth - depth) : 99999 - (Search.maxDepth - depth) };
      }
      return { score: 0 };
    }

    // Order moves for better alpha-beta pruning
    const orderedMoves = precomputedMoves ? moves : this.orderMoves(moves, board);

    let bestMove = orderedMoves[0];
    let bestScore = isMaximizing ? -Infinity : Infinity;

    for (const move of orderedMoves) {
      const sim = board.clone();
      MoveExecutor.executeMove(sim, move, isMaximizing ? color : (color === 'white' ? 'black' : 'white'));
      const { score } = this.search(sim, depth - 1, color, alpha, beta, !isMaximizing);

      if (isMaximizing) {
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
        alpha = Math.max(alpha, score);
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
        beta = Math.min(beta, score);
      }

      if (beta <= alpha) break;
    }

    return { score: bestScore, move: bestMove };
  }

  static quiescence(board, color, alpha, beta, isMaximizing, qDepth) {
    if (qDepth > 6 || this.shouldAbort()) {
      return Evaluate.evaluate(board, color);
    }

    this.nodesSearched++;

    const standPat = Evaluate.evaluate(board, color);

    if (isMaximizing) {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
    } else {
      if (standPat <= alpha) return alpha;
      if (standPat < beta) beta = standPat;
    }

    const moveColor = isMaximizing ? color : (color === 'white' ? 'black' : 'white');
    const allMoves = MoveGen.generateMoves(board, moveColor);
    const captures = allMoves.filter(m => m.captured || m.promotion);

    if (captures.length === 0) return standPat;

    // Sort captures by MVV-LVA for better pruning
    captures.sort((a, b) => this.mvvLvaScore(b, board) - this.mvvLvaScore(a, board));

    for (const move of captures) {
      // Delta pruning: if even capturing the most valuable piece won't help, skip
      const capturedValue = move.captured ? Evaluate.PIECE_VALUES[move.captured.type] : 0;
      const delta = capturedValue + 200;
      if (isMaximizing && standPat + delta < alpha) continue;
      if (!isMaximizing && standPat - delta > beta) continue;

      const sim = board.clone();
      MoveExecutor.executeMoveRaw(sim, move);
      const king = sim.findKing(moveColor);
      if (!king) continue;
      if (MoveGen.isSquareAttacked(sim, king.row, king.col, moveColor === 'white' ? 'black' : 'white')) continue;

      const score = this.quiescence(sim, color, alpha, beta, !isMaximizing, qDepth + 1);

      if (isMaximizing) {
        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      } else {
        if (score <= alpha) return alpha;
        if (score < beta) beta = score;
      }
    }

    return isMaximizing ? alpha : beta;
  }

  static evaluateMove(board, color, move, depth) {
    const sim = board.clone();
    MoveExecutor.executeMove(sim, move, color);
    if (depth <= 1) {
      return Evaluate.evaluate(sim, color);
    }
    const { score } = this.search(sim, depth - 1, color, -Infinity, Infinity, false);
    return score;
  }

  static findBestMove(board, color, depth) {
    this.nodesSearched = 0;
    this.abortSearch = false;
    this.startTime = Date.now();
    this.maxDepth = depth;
    this.applyLimits(depth);
    const moves = GameRules.getLegalMoves(board, color);

    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    // Initial move ordering with shallow search
    const scored = moves.map(move => {
      const score = this.evaluateMove(board, color, move, 1);
      return { move, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const sortedMoves = scored.map(s => s.move);

    // Iterative deepening
    let bestMove = sortedMoves[0];
    for (let d = 2; d <= depth; d++) {
      if (this.shouldAbort()) break;
      const result = this.search(board, d, color, -Infinity, Infinity, true, sortedMoves);
      if (result.move && !this.abortSearch) {
        bestMove = result.move;
      }
    }

    return bestMove || sortedMoves[0];
  }

  static findBestMoveWithNoise(board, color, depth, noiseLevel) {
    this.nodesSearched = 0;
    this.abortSearch = false;
    this.startTime = Date.now();
    this.applyLimits(depth);
    const moves = GameRules.getLegalMoves(board, color);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    const scored = moves.map(move => {
      const score = this.evaluateMove(board, color, move, 1);
      return { move, score };
    });

    scored.sort((a, b) => b.score - a.score);

    if (noiseLevel >= 0.6) {
      if (Math.random() < noiseLevel) {
        const badMoves = scored.slice(Math.floor(scored.length * 0.4));
        return badMoves[Math.floor(Math.random() * badMoves.length)].move;
      }
    }

    if (noiseLevel > 0) {
      if (Math.random() < noiseLevel) {
        const totalWeight = scored.length * (scored.length + 1) / 2;
        let r = Math.random() * totalWeight;
        for (let i = 0; i < scored.length; i++) {
          const weight = i + 1;
          r -= weight;
          if (r <= 0) {
            return scored[scored.length - 1 - i].move;
          }
        }
        return scored[0].move;
      }
    }

    if (depth <= 1) {
      return scored[0].move;
    }

    // Iterative deepening even with noise
    const sortedMoves = scored.map(s => s.move);
    let bestMove = sortedMoves[0];
    for (let d = 2; d <= depth; d++) {
      if (this.shouldAbort()) break;
      const result = this.search(board, d, color, -Infinity, Infinity, true, sortedMoves);
      if (result.move && !this.abortSearch) {
        bestMove = result.move;
      }
    }

    return bestMove || sortedMoves[0];
  }
}
