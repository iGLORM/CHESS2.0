class MoveGen {
  static generateMoves(board, color) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board.grid[r][c];
        if (piece && piece.color === color) {
          this.generatePieceMoves(board, piece, r, c, moves);
        }
      }
    }
    return moves;
  }

  static generatePieceMoves(board, piece, row, col, moves) {
    switch (piece.type) {
      case 'pawn': this.pawnMoves(board, piece, row, col, moves); break;
      case 'knight': this.slidingMoves(board, piece, row, col, moves, [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]], false); break;
      case 'king': this.slidingMoves(board, piece, row, col, moves, [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]], false); this.castlingMoves(board, piece, row, col, moves); break;
      case 'rook': this.slidingMoves(board, piece, row, col, moves, [[1,0],[-1,0],[0,1],[0,-1]], true); break;
      case 'bishop': this.slidingMoves(board, piece, row, col, moves, [[1,1],[1,-1],[-1,1],[-1,-1]], true); break;
      case 'queen': this.slidingMoves(board, piece, row, col, moves, [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]], true); break;
    }
  }

  static pawnMoves(board, piece, row, col, moves) {
    const dir = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? 6 : 1;
    const promoRow = piece.color === 'white' ? 0 : 7;

    const addPromo = (toRow, toCol, captured) => {
      if (toRow === promoRow) {
        ['queen', 'rook', 'bishop', 'knight'].forEach(promoType => {
          moves.push({ from: { row, col }, to: { row: toRow, col: toCol }, captured, promotion: promoType });
        });
      } else {
        moves.push({ from: { row, col }, to: { row: toRow, col: toCol }, captured });
      }
    };

    const oneStep = row + dir;
    if (board.isInBounds(oneStep, col) && !board.grid[oneStep][col]) {
      addPromo(oneStep, col, null);

      const twoStep = row + 2 * dir;
      if (row === startRow && !board.grid[twoStep][col]) {
        moves.push({ from: { row, col }, to: { row: twoStep, col }, captured: null, enPassant: true });
      }
    }

    for (const dc of [-1, 1]) {
      const nc = col + dc;
      if (board.isInBounds(oneStep, nc)) {
        const target = board.grid[oneStep][nc];
        if (target && target.color !== piece.color) {
          addPromo(oneStep, nc, target);
        }
        if (board.enPassantTarget && board.enPassantTarget.row === oneStep && board.enPassantTarget.col === nc) {
          moves.push({
            from: { row, col },
            to: { row: oneStep, col: nc },
            captured: { type: 'pawn', color: piece.color === 'white' ? 'black' : 'white' },
            enPassantCapture: true,
          });
        }
      }
    }
  }

  static slidingMoves(board, piece, row, col, moves, directions, sliding) {
    for (const [dr, dc] of directions) {
      let nr = row + dr, nc = col + dc;
      while (board.isInBounds(nr, nc)) {
        const target = board.grid[nr][nc];
        if (!target) {
          moves.push({ from: { row, col }, to: { row: nr, col: nc }, captured: null });
        } else {
          if (target.color !== piece.color) {
            moves.push({ from: { row, col }, to: { row: nr, col: nc }, captured: target });
          }
          break;
        }
        if (!sliding) break;
        nr += dr;
        nc += dc;
      }
    }
  }

  static castlingMoves(board, piece, row, col, moves) {
    if (board.inCheck) return;
    const rights = board.castlingRights[piece.color];
    const enemy = piece.color === 'white' ? 'black' : 'white';

    if (rights.kingside) {
      const safe = !MoveGen.isSquareAttacked(board, row, col, enemy) &&
                   !MoveGen.isSquareAttacked(board, row, col + 1, enemy) &&
                   !MoveGen.isSquareAttacked(board, row, col + 2, enemy);
      const clear = !board.grid[row][col + 1] && !board.grid[row][col + 2];
      if (safe && clear) {
        moves.push({ from: { row, col }, to: { row, col: col + 2 }, castling: 'kingside' });
      }
    }
    if (rights.queenside) {
      const safe = !MoveGen.isSquareAttacked(board, row, col, enemy) &&
                   !MoveGen.isSquareAttacked(board, row, col - 1, enemy) &&
                   !MoveGen.isSquareAttacked(board, row, col - 2, enemy);
      const clear = !board.grid[row][col - 1] && !board.grid[row][col - 2] && !board.grid[row][col - 3];
      if (safe && clear) {
        moves.push({ from: { row, col }, to: { row, col: col - 2 }, castling: 'queenside' });
      }
    }
  }

  static isSquareAttacked(board, row, col, byColor) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board.grid[r][c];
        if (!p || p.color !== byColor) continue;
        if (p.type === 'pawn') {
          const dir = byColor === 'white' ? -1 : 1;
          if (r + dir === row && (c - 1 === col || c + 1 === col)) return true;
          continue;
        }
        if (MoveGen.canPieceAttack(board, p, r, c, row, col)) return true;
      }
    }
    return false;
  }

  static canPieceAttack(board, piece, fromRow, fromCol, toRow, toCol) {
    const dr = toRow - fromRow;
    const dc = toCol - fromCol;
    const adr = Math.abs(dr);
    const adc = Math.abs(dc);

    switch (piece.type) {
      case 'knight':
        return (adr === 2 && adc === 1) || (adr === 1 && adc === 2);
      case 'king':
        return adr <= 1 && adc <= 1;
      case 'rook':
        if (dr !== 0 && dc !== 0) return false;
        return MoveGen.clearPath(board, fromRow, fromCol, toRow, toCol);
      case 'bishop':
        if (adr !== adc) return false;
        return MoveGen.clearPath(board, fromRow, fromCol, toRow, toCol);
      case 'queen':
        if (dr !== 0 && dc !== 0 && adr !== adc) return false;
        return MoveGen.clearPath(board, fromRow, fromCol, toRow, toCol);
    }
    return false;
  }

  static clearPath(board, fromRow, fromCol, toRow, toCol) {
    const dr = Math.sign(toRow - fromRow);
    const dc = Math.sign(toCol - fromCol);
    let r = fromRow + dr, c = fromCol + dc;
    while (r !== toRow || c !== toCol) {
      if (board.grid[r][c]) return false;
      r += dr;
      c += dc;
    }
    return true;
  }
}
