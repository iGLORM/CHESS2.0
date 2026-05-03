class Search {
  static nodesSearched = 0;
  static maxNodes = 30000;
  static abortSearch = false;

  static search(board, depth, color, alpha, beta, isMaximizing) {
    this.nodesSearched++;
    if (this.nodesSearched > this.maxNodes) {
      this.abortSearch = true;
      return { score: Evaluate.evaluate(board, color) };
    }

    if (depth === 0) {
      return { score: Evaluate.evaluate(board, color) };
    }

    const moves = GameRules.getLegalMoves(board, isMaximizing ? color : (color === 'white' ? 'black' : 'white'));

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

  static evaluateMove(board, color, move, depth) {
    // Quick 1-ply evaluation for move sorting and noise selection
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
    this.maxDepth = depth;
    const moves = GameRules.getLegalMoves(board, color);

    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    const result = this.search(board, depth, color, -Infinity, Infinity, true);
    return result.move || moves[0];
  }

  static findBestMoveWithNoise(board, color, depth, noiseLevel) {
    const moves = GameRules.getLegalMoves(board, color);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    // Evaluate all moves at depth 1 (fast) for sorting
    const scored = moves.map(move => {
      const score = this.evaluateMove(board, color, move, 1);
      return { move, score };
    });

    // Sort best to worst for the current player
    scored.sort((a, b) => b.score - a.score);

    // Pure random for very high noise (level 1-2)
    if (noiseLevel >= 0.6) {
      if (Math.random() < noiseLevel) {
        // Pick from the bottom half of moves
        const badMoves = scored.slice(Math.floor(scored.length * 0.4));
        return badMoves[Math.floor(Math.random() * badMoves.length)].move;
      }
    }

    // Medium noise: weighted random toward worse moves
    if (noiseLevel > 0) {
      if (Math.random() < noiseLevel) {
        // Create a weighted pool favoring worse moves
        const totalWeight = scored.length * (scored.length + 1) / 2;
        let r = Math.random() * totalWeight;
        for (let i = 0; i < scored.length; i++) {
          // Lower index = better move, higher weight for worse moves
          const weight = i + 1;
          r -= weight;
          if (r <= 0) {
            return scored[scored.length - 1 - i].move;
          }
        }
        return scored[0].move;
      }
    }

    // No noise or noise didn't trigger: use full-depth search for best move
    if (depth <= 1) {
      return scored[0].move;
    }

    const result = this.search(board, depth, color, -Infinity, Infinity, true);
    return result.move || scored[0].move;
  }
}
