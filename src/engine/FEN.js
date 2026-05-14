class FEN {
  static fromBoard(board, turn) {
    let fen = '';

    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        const p = board.grid[r][c];
        if (!p) {
          empty++;
        } else {
          if (empty > 0) { fen += empty; empty = 0; }
          fen += FEN.pieceChar(p);
        }
      }
      if (empty > 0) fen += empty;
      if (r < 7) fen += '/';
    }

    fen += ' ' + (turn === 'white' ? 'w' : 'b');

    let castling = '';
    if (board.castlingRights.white.kingside) castling += 'K';
    if (board.castlingRights.white.queenside) castling += 'Q';
    if (board.castlingRights.black.kingside) castling += 'k';
    if (board.castlingRights.black.queenside) castling += 'q';
    fen += ' ' + (castling || '-');

    if (board.enPassantTarget) {
      const file = 'abcdefgh'[board.enPassantTarget.col];
      const rank = String(8 - board.enPassantTarget.row);
      fen += ' ' + file + rank;
    } else {
      fen += ' -';
    }

    fen += ' ' + board.halfMoveClock;
    fen += ' ' + board.fullMoveNumber;

    return fen;
  }

  static pieceChar(piece) {
    const chars = { king: 'k', queen: 'q', rook: 'r', bishop: 'b', knight: 'n', pawn: 'p' };
    const c = chars[piece.type] || '?';
    return piece.color === 'white' ? c.toUpperCase() : c;
  }

  static toBoard(fen) {
    const fields = fen.trim().split(/\s+/);
    if (fields.length !== 6) throw new Error('Invalid FEN');

    const board = Board.createEmpty();
    const ranks = fields[0].split('/');
    const pieces = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };

    for (let r = 0; r < 8; r++) {
      let col = 0;
      for (const ch of ranks[r]) {
        if (/\d/.test(ch)) {
          col += parseInt(ch, 10);
        } else {
          const type = pieces[ch.toLowerCase()];
          board.grid[r][col] = {
            type,
            color: ch === ch.toUpperCase() ? 'white' : 'black',
          };
          col++;
        }
      }
    }

    board.turn = fields[1] === 'w' ? 'white' : 'black';
    board.castlingRights = {
      white: { kingside: fields[2].includes('K'), queenside: fields[2].includes('Q') },
      black: { kingside: fields[2].includes('k'), queenside: fields[2].includes('q') },
    };
    board.enPassantTarget = fields[3] === '-' ? null : {
      row: 8 - parseInt(fields[3][1], 10),
      col: 'abcdefgh'.indexOf(fields[3][0]),
    };
    board.halfMoveClock = parseInt(fields[4], 10);
    board.fullMoveNumber = parseInt(fields[5], 10);

    const king = board.findKing(board.turn);
    const enemy = board.turn === 'white' ? 'black' : 'white';
    board.inCheck = king ? MoveGen.isSquareAttacked(board, king.row, king.col, enemy) : false;
    board.positionHistory = [board.posKey()];

    return board;
  }
}
