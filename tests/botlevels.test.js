const test = require('node:test');
const assert = require('node:assert');
const { loadGame } = require('./load');

const G = loadGame(['engine/ai/AIController.js']);

test('every bot level has a name, a rising Elo and a blurb', () => {
  const C = G.AIController;
  let last = 0;
  for (let l = 0; l <= C.MAX_LEVEL; l++) {
    const info = C.LEVEL_CONFIG[l];
    assert.ok(info && info.name && info.blurb, `level ${l}`);
    assert.ok(info.elo > last, `level ${l} Elo rises`);
    last = info.elo;
  }
  assert.strictEqual(C.LEVEL_CONFIG[C.MAX_LEVEL + 1], undefined);
});

test('old saved Elo values map to the nearest level', () => {
  const C = G.AIController;
  assert.strictEqual(C.levelFromElo(200), 0);
  assert.strictEqual(C.levelFromElo(1000), 4);
  assert.strictEqual(C.levelFromElo(2000), 9);
  assert.strictEqual(C.levelFromElo(5000), C.MAX_LEVEL);
});
