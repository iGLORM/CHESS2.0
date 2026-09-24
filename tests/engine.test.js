const test = require('node:test');
const assert = require('node:assert');
const { loadGame, ENGINE } = require('./load');

const G = loadGame(ENGINE);

function perft(board, depth) {
  const moves = G.GameRules.getLegalMoves(board, board.turn);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) {
    board.makeMove(m);
    n += perft(board, depth - 1);
    board.unmakeMove();
  }
  return n;
}

test('start position move counts match standard chess (perft)', () => {
  const b = new G.Board();
  assert.strictEqual(perft(b, 1), 20);
  assert.strictEqual(perft(b, 2), 400);
  assert.strictEqual(perft(b, 3), 8902);
});

test('tricky position with castling, en passant and promotions (perft)', () => {
  const b = G.FEN.toBoard('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
  assert.strictEqual(perft(b, 1), 48);
  assert.strictEqual(perft(b, 2), 2039);
});

test('en passant position (perft)', () => {
  const b = G.FEN.toBoard('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
  assert.strictEqual(perft(b, 1), 14);
  assert.strictEqual(perft(b, 2), 191);
  assert.strictEqual(perft(b, 3), 2812);
});

test('fool\'s mate is checkmate', () => {
  const b = G.FEN.toBoard('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
  b.inCheck = true;
  assert.strictEqual(G.GameRules.getGameStatus(b, 'white').status, 'checkmate');
});

test('FEN round trip', () => {
  const fen = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
  assert.strictEqual(G.FEN.fromBoard(G.FEN.toBoard(fen), 'white'), fen);
});
