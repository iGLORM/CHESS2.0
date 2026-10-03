const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Graphics.js with a stand-in store (settings live in memory) and no DOM.
function load() {
  const state = { settings: { musicVolume: 0.5 } };
  const context = vm.createContext({
    console, Math, JSON,
    store: { get: (k) => state[k], set: (k, v) => { state[k] = v; }, saveProgress() {} },
    Layout: { isPortrait: false },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'state', 'Graphics.js'), 'utf8'), context);
  return { G: vm.runInContext('Graphics', context), state };
}

test('defaults match the old fixed behaviour', () => {
  const { G } = load();
  assert.strictEqual(G.get('preset'), 'high');
  assert.strictEqual(G.fpsCap(), 60);
  assert.strictEqual(G.sceneRate(), 1);
  assert.strictEqual(G.particles(), 1);
  assert.strictEqual(G.mini3d().pixel, 1.33);
  assert.strictEqual(G.renderCap(), Infinity);
});

test('a preset sets its options, and changing one makes it custom', () => {
  const { G, state } = load();
  G.set('preset', 'low');
  assert.strictEqual(G.get('sceneMotion'), 'off');
  assert.strictEqual(G.sceneRate(), 0);
  assert.strictEqual(G.mini3d().shadows, false);
  G.set('particles', 'high');
  assert.strictEqual(G.get('preset'), 'custom');
  G.set('particles', 'low');
  assert.strictEqual(G.get('preset'), 'low', 'matching the preset again names it');
  assert.strictEqual(state.settings.musicVolume, 0.5, 'other settings are kept');
});

test('options outside the preset leave it alone', () => {
  const { G } = load();
  G.set('fps', 30);
  G.set('resolution', '1920');
  assert.strictEqual(G.get('preset'), 'high');
  assert.strictEqual(G.fpsCap(), 30);
  assert.strictEqual(G.renderCap(), 1.5);
});

test('pacer holds the frame limit from a much faster loop', () => {
  const { G } = load();
  for (const cap of [30, 45, 90, 144, 165]) {
    G.set('fps', cap);
    const pacer = G.pacer();
    let drawn = 0;
    // A loop firing every 0.7 ms for ten seconds, with a little jitter.
    for (let t = 0; t < 10000; t += 0.7) if (pacer.ready(t + Math.sin(t) * 0.3)) drawn++;
    assert.ok(Math.abs(drawn / 10 - cap) <= 1, `${cap} cap drew ${drawn / 10} per second`);
  }
  // Chromium without the refresh limit on a 60 Hz Mac: bursts of frames every 16.7 ms.
  for (const cap of [90, 120, 165]) {
    G.set('fps', cap);
    const pacer = G.pacer();
    let drawn = 0;
    for (let v = 0; v < 10000; v += 1000 / 60) for (let i = 0; i < 8; i++) if (pacer.ready(v + i * 0.1)) drawn++;
    assert.ok(Math.abs(drawn / 10 - cap) <= 1, `${cap} cap drew ${drawn / 10} per second in bursts`);
  }
  G.set('fps', 0);
  const pacer = G.pacer();
  assert.ok(pacer.ready(1) && pacer.ready(1.1));
});

test('step wraps round the choices and labels them', () => {
  const { G } = load();
  G.step('fps', 1);
  assert.strictEqual(G.label('fps'), '90 FPS');
  for (const want of ['120 FPS', '144 FPS', '165 FPS']) {
    G.step('fps', 1);
    assert.strictEqual(G.label('fps'), want);
  }
  G.step('fps', 1);
  assert.strictEqual(G.label('fps'), 'Unlimited');
  assert.strictEqual(G.fpsCap(), 0);
  G.step('fps', 1);
  assert.strictEqual(G.label('fps'), '30 FPS');
  G.step('resolution', -1);
  assert.strictEqual(G.label('resolution'), '960 x 600');
});
