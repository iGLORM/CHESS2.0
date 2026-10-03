// Keepsakes do something: who holds one, the Iron Key's chests, Queenie's Signet in the
// Shop, and the world map's uncharted Earth and storm (worldmap scene state).
const test = require('node:test');
const assert = require('node:assert');
const { loadGame, ENGINE } = require('./load');
const { loadScene, stats } = require('../scripts/live-scene.js');

const G = loadGame([...ENGINE, '../tests/stubs/store.js', 'engine/BossRules.js', 'engine/StoryStars.js',
  'characters/characters.js', 'characters/trainers.js', 'characters/worlds.js', 'characters/missions.js',
  'state/Wallet.js', 'characters/keepsakes.js']);
const { store, Wallet, Keepsakes } = G;

function fresh(save = {}) {
  store.state.wallet = { coins: 0, owned: [], planePaint: null, token: null };
  store.state.storySaves = [{ maxUnlockedLevel: 1, ...save }];
  store.state.slot = 0;
}
const stageOf = id => G.STORY_STAGES.find(c => c.id === id).stage;

test('every keepsake says what it does', () => {
  for (const k of Keepsakes.all()) assert.ok(k.use && k.use.length > 20, `${k.id} has no use`);
});

test('a keepsake is held once its guardian is beaten', () => {
  fresh({ maxUnlockedLevel: stageOf('bishbosh') });
  assert.ok(!Keepsakes.has('compass'));
  fresh({ maxUnlockedLevel: stageOf('bishbosh') + 1 });
  assert.ok(Keepsakes.has('compass'));
  assert.ok(!Keepsakes.has('ironkey'));
  fresh({ maxUnlockedLevel: stageOf('checkmate') + 1 });
  assert.ok(Keepsakes.has('hourglass'));
});

test('chests need the Iron Key and open once, for coins and a star', () => {
  const id = Keepsakes.CHESTS[0].id;
  fresh({ maxUnlockedLevel: stageOf('rokee') });
  assert.strictEqual(Keepsakes.openChest(id), null, 'no key yet');
  fresh({ maxUnlockedLevel: stageOf('rokee') + 1 });
  const r = Keepsakes.openChest(id);
  assert.deepStrictEqual({ ...r }, { ...Keepsakes.CHEST_REWARD });
  assert.strictEqual(Wallet.coins(), Keepsakes.CHEST_REWARD.coins);
  assert.strictEqual(store.getActiveSave().bonusStars, Keepsakes.CHEST_REWARD.stars);
  assert.ok(Keepsakes.chestOpened(id));
  assert.strictEqual(Keepsakes.openChest(id), null, 'a chest opens once');
  assert.strictEqual(new Set(Keepsakes.CHESTS.map(c => c.id)).size, Keepsakes.CHESTS.length);
});

test("Queenie's Signet takes a third off the story items, not the plane", () => {
  fresh({ maxUnlockedLevel: stageOf('queenie'), bonusStars: 20 });
  assert.strictEqual(Wallet.price('remove'), 12);
  fresh({ maxUnlockedLevel: stageOf('queenie') + 1, bonusStars: 20 });
  assert.strictEqual(Wallet.price('remove'), 8);
  assert.strictEqual(Wallet.price('rewind'), 4);
  assert.strictEqual(Wallet.price('plane'), Wallet.item('plane').price);
  assert.ok(Wallet.buy('remove').ok);
  assert.strictEqual(Wallet.stars(), 12, 'paid the lower price');
});

test('the uncharted map: charted round known places, sepia beyond; the storm and the wave loop', () => {
  const { def } = loadScene('worldmap');
  const known = ['pawnhollow', 'shop'];
  assert.ok(def.knownDist(...def.places.pawnhollow, known) < 0, 'a known landmark is charted');
  assert.ok(def.knownDist(...def.places.grandlibrary, known) > 0, 'a far world is not');
  const F = def.knownField(known);
  // Near a known place the field and the point query agree; far off, both say uncharted.
  const [px, py] = def.places.pawnhollow, x = px + 50, y = py;
  assert.ok(Math.abs(F[y * 640 + x] - def.knownDist(x, y, known)) < 1e-3);
  const [fx, fy] = def.places.forkedgulch;
  assert.ok(F[fy * 640 + fx] > 0);
  for (const map of [{ chart: { v: 0, known }, veil: 1 }, { chart: { v: 0.5, from: [297, 99], known }, veil: 0.5 }]) {
    loadScene.state = { map: { heal: { pawnhollow: 1 }, ...map } };
    const s = stats('worldmap');
    loadScene.state = {};
    assert.ok(s.seam <= s.n * 0.001, `${s.seam} px differ one loop apart`);
    assert.ok(s.ms < 40, `${s.ms.toFixed(1)} ms per frame is too slow`);
  }
});
