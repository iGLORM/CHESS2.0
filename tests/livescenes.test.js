// Every live pixel scene must loop seamlessly, move, paint every pixel and stay cheap.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { stats, loadScene } = require('../scripts/live-scene.js');

const dir = path.join(__dirname, '../src/themes/scenes');
const scenes = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'PixelKit.js').map(f => f.slice(0, -3));

test('there is at least one live scene', () => assert.ok(scenes.length > 0));

for (const id of scenes) {
  test(`live scene ${id}`, () => {
    const s = stats(id);
    assert.strictEqual(s.def.id, id, 'the file name must match the scene id');
    assert.ok(s.seam <= s.n * 0.001, `${s.seam} px differ one loop apart: a motion is not a whole number of cycles per loop`);
    if (s.def.animated !== false) assert.ok(s.moving > 0, 'nothing moves between frames');
    if (s.def.opaque !== false) assert.strictEqual(s.transparent, 0, 'some pixels are never painted');
    assert.ok(s.ms < 40, `${s.ms.toFixed(1)} ms per frame is too slow`);
  });
}

test('the Bazaar holds southern Africa, not the worlds to the north', () => {
  const { def } = loadScene('worldmap');
  const [sx, sy] = def.places.shop;
  assert.ok(def.shopLand(sx, sy), 'its own landmark');
  assert.ok(def.shopLand(88, 240), 'the Cape');
  assert.ok(def.shopLand(132, 220), 'Madagascar');
  for (const id of ['slantedsands', 'royalpalace', 'trainingcamp', 'arena']) assert.ok(!def.shopLand(...def.places[id]), id);
});
