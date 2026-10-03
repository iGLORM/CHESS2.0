// Story stars: the objectives read a fight's end correctly, and a save keeps the best.
const test = require('node:test');
const assert = require('node:assert');
const { loadGame, ENGINE } = require('./load');

const G = loadGame([...ENGINE, 'engine/BossRules.js', 'engine/StoryStars.js', 'characters/characters.js', 'characters/trainers.js']);
const S = G.StoryStars;
// Arrays from the sandbox belong to another realm; copy them before deep comparisons.
const A = x => Array.from(x);
const P = (type, color) => ({ type, color });
const move = (color, extra = {}) => ({ from: { row: 0, col: 0 }, to: { row: 1, col: 1 }, piece: P('pawn', color), ...extra });

function ctx(over = {}) {
  return S.context({ won: true, playerColor: 'white', aiColor: 'black', moveHistory: [], capturedPieces: { white: [], black: [] }, bossState: {}, ...over });
}

test('every story stage has two objectives', () => {
  for (const ch of G.STORY_STAGES) {
    assert.ok(S.has(ch), `${ch.id} has no objectives`);
    assert.strictEqual(S.texts(ch).length, 3, ch.id);
  }
  assert.strictEqual(S.max(G.STORY_STAGES), 45);
});

test('a loss gives no stars at all', () => {
  const rokee = G.STORY_STAGES.find(c => c.id === 'rokee');
  assert.deepStrictEqual(A(S.evaluate(rokee, ctx({ won: false }))), [false, false, false]);
});

test('Rook-E: both rooks taken, queen kept', () => {
  const rokee = G.STORY_STAGES.find(c => c.id === 'rokee');
  const one = ctx({ capturedPieces: { white: [P('rook', 'black')], black: [] } });
  assert.deepStrictEqual(A(S.evaluate(rokee, one)), [true, false, true]);
  const both = ctx({ capturedPieces: { white: [P('rook', 'black'), P('rook', 'black')], black: [P('queen', 'white')] } });
  assert.deepStrictEqual(A(S.evaluate(rokee, both)), [true, true, false]);
});

test('moves are counted for the player only; cancelled captures still count as moves', () => {
  const pawnie = G.STORY_STAGES.find(c => c.id === 'pawnie');
  const hist = [];
  for (let i = 0; i < 31; i++) hist.push(move('white'), move('black'));
  assert.strictEqual(S.context({ won: true, playerColor: 'white', aiColor: 'black', moveHistory: hist }).playerMoves, 31);
  assert.deepStrictEqual(A(S.evaluate(pawnie, ctx({ moveHistory: hist }))), [true, true, false]);
});

test('ForkMaster: a double take he landed costs the star', () => {
  const fm = G.STORY_STAGES.find(c => c.id === 'forkmaster');
  const hit = ctx({ moveHistory: [move('black', { doubleTake: { row: 1, col: 1 } })] });
  assert.strictEqual(S.evaluate(fm, hit)[1], false);
  const blocked = ctx({ moveHistory: [move('black', { doubleTake: { row: 1, col: 1 }, defended: true })] });
  assert.strictEqual(S.evaluate(fm, blocked)[1], true);
});

test('challenges, misses, trial and promotion feed their objectives', () => {
  const q = G.STORY_STAGES.find(c => c.id === 'queenie');
  assert.strictEqual(S.evaluate(q, ctx({ bossState: { challenges: { won: 3, lost: 1 } } }))[2], false);
  const sq = G.STORY_STAGES.find(c => c.id === 'sergeantsquare');
  assert.deepStrictEqual(A(S.evaluate(sq, ctx({ bossState: { misses: 0 }, seconds: 42 }))), [true, true, true]);
  assert.deepStrictEqual(A(S.evaluate(sq, ctx({ bossState: { misses: 2 }, seconds: 200 }))), [true, false, false]);
  const js = G.STORY_STAGES.find(c => c.id === 'joystick');
  assert.deepStrictEqual(A(S.evaluate(js, ctx({ trial: { played: 18, won: 18, firstTry: 13 } }))), [true, true, false]);
  assert.deepStrictEqual(A(S.evaluate(js, ctx({ trial: { played: 18, won: 18, firstTry: 17 } }))), [true, true, true]);
  const eg = G.STORY_STAGES.find(c => c.id === 'endgamer');
  assert.strictEqual(S.evaluate(eg, ctx({ moveHistory: [move('white', { promotion: 'queen' })] }))[1], true);
});

test('a save keeps the best result per stage', () => {
  let save = {};
  let m = S.merge(save, 'rokee', [true, true, false]);
  assert.deepStrictEqual(A(m.fresh), [true, true, false]);
  save = { stars: m.stars };
  m = S.merge(save, 'rokee', [true, false, true]);
  assert.deepStrictEqual(A(m.best), [true, true, true]);
  assert.deepStrictEqual(A(m.fresh), [false, false, true]);
  assert.strictEqual(S.total({ stars: m.stars }, G.STORY_STAGES), 3);
});
