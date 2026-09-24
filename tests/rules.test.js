const test = require('node:test');
const assert = require('node:assert');
const { loadGame, ENGINE } = require('./load');

const G = loadGame(ENGINE);
const sq = s => ({ row: 8 - Number(s[1]), col: 'abcdefgh'.indexOf(s[0]) });
function findMove(board, from, to, promotion) {
  const f = sq(from), t = sq(to);
  const m = G.GameRules.getLegalMoves(board, board.turn).find(m =>
    m.from.row === f.row && m.from.col === f.col && m.to.row === t.row && m.to.col === t.col &&
    (m.promotion || null) === (promotion || null));
  assert.ok(m, `no legal move ${from}-${to}`);
  return m;
}

test('a normal capture can be challenged with a Defense', () => {
  const b = G.FEN.toBoard('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
  const m = findMove(b, 'e4', 'd5');
  assert.strictEqual(G.CaptureRules.isChallengeable(b, m), true);
  assert.strictEqual(G.CaptureRules.canDefend(b, m, 2), true);
  assert.strictEqual(G.CaptureRules.canDefend(b, m, 0), false);
});

test('a capture that escapes check cannot be challenged', () => {
  // White king in check from the queen on e2; Kxe2 is the only move.
  const b = G.FEN.toBoard('7k/8/8/8/8/8/4q3/4K3 w - - 0 1');
  const m = findMove(b, 'e1', 'e2');
  assert.strictEqual(G.CaptureRules.isChallengeable(b, m), false);
});

test('capturing the checking piece with another piece cannot be challenged', () => {
  // Black rook on a1 checks the white king on g1; the white rook on a2 takes it.
  const b = G.FEN.toBoard('k7/8/8/8/8/8/R7/r5K1 w - - 0 1');
  const m = findMove(b, 'a2', 'a1');
  assert.strictEqual(G.CaptureRules.isChallengeable(b, m), false);
});

test('en passant is recognised as a capture', () => {
  const b = G.FEN.toBoard('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3');
  const m = findMove(b, 'e5', 'f6');
  const captured = G.CaptureRules.capturedPiece(b, m);
  assert.deepStrictEqual({ ...captured }, { type: 'pawn', color: 'black' });
  assert.strictEqual(G.CaptureRules.isChallengeable(b, m), true);
});

test('standard algebraic notation', () => {
  const start = new G.Board();
  assert.strictEqual(G.Notation.toSAN(start, findMove(start, 'e2', 'e4')), 'e4');
  assert.strictEqual(G.Notation.toSAN(start, findMove(start, 'g1', 'f3')), 'Nf3');

  const cap = G.FEN.toBoard('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
  assert.strictEqual(G.Notation.toSAN(cap, findMove(cap, 'e4', 'd5')), 'exd5');

  const castle = G.FEN.toBoard('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.strictEqual(G.Notation.toSAN(castle, findMove(castle, 'e1', 'g1')), 'O-O');
  assert.strictEqual(G.Notation.toSAN(castle, findMove(castle, 'e1', 'c1')), 'O-O-O');

  const knights = G.FEN.toBoard('k7/8/8/8/8/8/8/1N3N1K w - - 0 1');
  assert.strictEqual(G.Notation.toSAN(knights, findMove(knights, 'b1', 'd2')), 'Nbd2');

  const mate = G.FEN.toBoard('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2');
  assert.strictEqual(G.Notation.toSAN(mate, findMove(mate, 'd8', 'h4')), 'Qh4#');

  const promo = G.FEN.toBoard('7k/4P3/8/8/8/8/8/K7 w - - 0 1');
  assert.strictEqual(G.Notation.toSAN(promo, findMove(promo, 'e7', 'e8', 'queen')), 'e8=Q+');
});
