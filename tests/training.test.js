const test = require('node:test');
const assert = require('node:assert');
const { loadGame, ENGINE } = require('./load');

const G = loadGame([...ENGINE, 'data/TrainingLevels.js']);
const LEVELS = G.TRAINING_LEVELS;

function uci(m) {
  const sq = (s) => 'abcdefgh'[s.col] + (8 - s.row);
  const promo = { queen: 'q', rook: 'r', bishop: 'b', knight: 'n' };
  return sq(m.from) + sq(m.to) + (m.promotion ? promo[m.promotion] : '');
}

function play(board, move) {
  const color = board.turn;
  const m = G.GameRules.getLegalMoves(board, color).find(x => uci(x) === move);
  assert.ok(m, `illegal move ${move}`);
  G.MoveExecutor.executeMove(board, m, color);
}

test('there are 30 levels in six bands of five', () => {
  assert.strictEqual(LEVELS.length, 30);
  for (const band of G.TRAINING_BANDS) {
    assert.strictEqual(band.levels.length, 5, band.name);
    for (const id of band.levels) assert.strictEqual(LEVELS.find(l => l.id === id).band, band.id);
  }
});

test('every level starts legal, with the side to move not giving check', () => {
  for (const lv of LEVELS) {
    const b = G.FEN.toBoard(lv.fen);
    assert.strictEqual(b.turn, lv.sideToMove, `level ${lv.id}`);
    for (const color of ['white', 'black']) assert.ok(b.findKing(color), `level ${lv.id}: no ${color} king`);
    const them = b.turn === 'white' ? 'black' : 'white';
    const k = b.findKing(them);
    assert.ok(!G.MoveGen.isSquareAttacked(b, k.row, k.col, b.turn), `level ${lv.id}: ${them} already in check`);
    assert.strictEqual(lv.hints.length, 3, `level ${lv.id}: needs three hints`);
  }
});

test('every solution line and alternative is legal', () => {
  for (const lv of LEVELS) {
    const b = G.FEN.toBoard(lv.fen);
    for (const move of [lv.solution.primary, ...lv.solution.continuation]) play(b, move);
    for (const alt of lv.solution.alternatives) play(G.FEN.toBoard(lv.fen), alt);
  }
});

test('mate puzzles end in checkmate', () => {
  for (const lv of LEVELS.filter(l => l.solution.san.includes('#') || l.type === 'checkmate')) {
    const b = G.FEN.toBoard(lv.fen);
    for (const move of [lv.solution.primary, ...lv.solution.continuation]) play(b, move);
    assert.ok(G.GameRules.isCheckmate(b, b.turn), `level ${lv.id} does not end in mate`);
  }
});

test('lines end on the player\'s own move', () => {
  for (const lv of LEVELS) assert.strictEqual(lv.solution.continuation.length % 2, 0, `level ${lv.id}`);
});
