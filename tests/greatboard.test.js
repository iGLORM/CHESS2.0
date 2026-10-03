// Great Board mode: four quarters with four different guardian rules.
const test = require('node:test');
const assert = require('node:assert');
const { loadGame, ENGINE } = require('./load');

const G = loadGame([...ENGINE, 'engine/BossRules.js', 'engine/GreatBoard.js']);
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

test('every Great Board has four different regions covering the board', () => {
  for (let s = 1; s < 40; s++) {
    const rule = G.GreatBoard.make(seeded(s));
    const ids = rule.regions.map(r => r.rule);
    assert.strictEqual(new Set(ids).size, 4);
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      assert.ok(G.GreatBoard.regionAt(rule, row, col), `no region at ${row},${col}`);
      assert.strictEqual(G.BossRules.regionAt(rule, { row, col }), G.GreatBoard.regionAt(rule, row, col));
    }
  }
});

test('gear walls stand on empty middle squares of the gears quarter', () => {
  for (let s = 1; s < 60; s++) {
    const rule = G.GreatBoard.make(seeded(s));
    const gears = rule.regions.find(r => r.rule === 'gears');
    if (!gears) { assert.ok(!rule.walls); continue; }
    assert.strictEqual(rule.walls.length, 2);
    const board = G.BossRules.startBoard(rule);
    for (const w of rule.walls) {
      assert.strictEqual(G.GreatBoard.regionAt(rule, w.row, w.col), 'gears');
      assert.ok(w.row >= 2 && w.row <= 5);
      assert.strictEqual(board.grid[w.row][w.col].type, 'wall');
    }
  }
});

test('iron quarters always challenge, calm sands never do', () => {
  const rule = G.GreatBoard.make(seeded(7));
  const at = id => { const r = rule.regions.find(q => q.rule === id); return r && { row: r.rows[0], col: r.cols[0] }; };
  const pawn = { type: 'pawn', color: 'black' };
  if (at('iron')) assert.strictEqual(G.BossRules.challengeChance(rule, pawn, false, at('iron')), 1);
  if (at('sands')) assert.strictEqual(G.BossRules.challengeChance(rule, pawn, true, at('sands')), 0);
  const other = rule.regions.find(q => q.rule !== 'iron' && q.rule !== 'sands');
  assert.strictEqual(G.BossRules.challengeChance(rule, pawn, false, { row: other.rows[0], col: other.cols[0] }), G.BossRules.DEFAULT_CHANCE);
});
