class Search {
  static nodesSearched = 0;
  static maxNodes = 10000;
  static abortSearch = false;
  static startTime = 0;
  static maxTime = 200;
  static maxDepth = 3;

  static SEARCH_LIMITS = {
    1: { maxNodes: 8000, maxTime: 800 },
    2: { maxNodes: 15000, maxTime: 1200 },
    3: { maxNodes: 40000, maxTime: 2000 },
    4: { maxNodes: 80000, maxTime: 3500 },
    5: { maxNodes: 150000, maxTime: 5000 },
    6: { maxNodes: 250000, maxTime: 7000 },
    7: { maxNodes: 400000, maxTime: 10000 },
    8: { maxNodes: 600000, maxTime: 15000 },
  };

  static applyLimits(depth) {
    const limits = this.SEARCH_LIMITS[depth] || this.SEARCH_LIMITS[8];
    this.maxNodes = limits.maxNodes;
    this.maxTime = limits.maxTime;
  }

  static search(board, depth, color, alpha, beta, isMaximizing, precomputedMoves = null) {
    this.nodesSearched++;
    if (this.abortSearch || this.nodesSearched > this.maxNodes || (this.nodesSearched & 255) === 0 && Date.now() - this.startTime > this.maxTime) {
      this.abortSearch = true;
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

    let bestMove = moves[0];
    let bestScore = isMaximizing ? -Infinity : Infinity;

    for (const move of moves) {
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
    if (qDepth > 4 || this.abortSearch || this.nodesSearched > this.maxNodes) {
      return Evaluate.evaluate(board, color);
    }

    this.nodesSearched++;
    if ((this.nodesSearched & 255) === 0 && Date.now() - this.startTime > this.maxTime) {
      this.abortSearch = true;
      return Evaluate.evaluate(board, color);
    }

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
    const captures = allMoves.filter(m => m.captured);

    captures.sort((a, b) => {
      const aVal = Evaluate.PIECE_VALUES[a.captured.type] - (Evaluate.PIECE_VALUES[board.grid[a.from.row]?.[a.from.col]?.type] || 0) * 0.1;
      const bVal = Evaluate.PIECE_VALUES[b.captured.type] - (Evaluate.PIECE_VALUES[board.grid[b.from.row]?.[b.from.col]?.type] || 0) * 0.1;
      return bVal - aVal;
    });

    for (const move of captures) {
      const delta = Evaluate.PIECE_VALUES[move.captured.type] - 200;
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

    if (moves.length > 1 && depth > 1) {
      const scored = moves.map(move => {
        const score = this.evaluateMove(board, color, move, 1);
        return { move, score };
      });
      scored.sort((a, b) => b.score - a.score);
      const sortedMoves = scored.map(s => s.move);
      const result = this.search(board, depth, color, -Infinity, Infinity, true, sortedMoves);
      return result.move || sortedMoves[0];
    }

    const result = this.search(board, depth, color, -Infinity, Infinity, true);
    return result.move || moves[0];
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

    const sortedMoves = scored.map(s => s.move);
    const result = this.search(board, depth, color, -Infinity, Infinity, true, sortedMoves);
    return result.move || sortedMoves[0];
  }
}