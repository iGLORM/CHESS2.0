// Every theme ships its art and song; Chess 2.0 is the default theme and always open.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function load(state = {}) {
  const context = vm.createContext({ console, Math, JSON, store: { get: k => state[k] } });
  for (const f of ['src/themes/themes.js', 'src/themes/ThemeManager.js', 'src/audio/Songs.js']) {
    vm.runInContext(read(f), context, { filename: f });
  }
  return name => vm.runInContext(name, context);
}

const get = load();
const THEMES = get('THEMES');
const TYPES = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];
const exists = f => fs.existsSync(path.join(ROOT, f));

test('Chess 2.0 comes first and is the default for a new player', () => {
  assert.strictEqual(THEMES[0].id, 'chess20');
  assert.match(read('src/state/Store.js'), /^\s*theme: 'chess20',/m);
});

test('Chess 2.0 is unlocked on a brand-new save', () => {
  const ThemeManager = load({ storySaves: [], unlockedThemes: [] })('ThemeManager');
  assert.strictEqual(ThemeManager.isThemeUnlocked('chess20'), true);
});

for (const theme of THEMES.filter(t => t.id !== 'custom')) {
  test(`theme ${theme.id} has its art, scene and song`, () => {
    const id = theme.id;
    assert.ok(exists(`src/themes/scenes/${id}.js`), 'live scene');
    assert.ok(exists(`assets/textures/backgrounds/${id}_bg.png`), 'background still');
    assert.ok(exists(`assets/textures/boards/${id}_board.png`), 'board');
    for (const c of ['white', 'black']) for (const t of TYPES) assert.ok(exists(`assets/textures/pieces/${id}_${c}_${t}.png`), `${c} ${t}`);
    for (const f of [`premium_theme_${id}.png`, `premium_bg_${id}.png`]) {
      assert.ok(exists(`assets/textures/premium/${f}`), f);
      assert.ok(read('src/pixi/PixiPremiumAssets.js').includes(`'${f}'`), `${f} listed in PixiPremiumAssets`);
    }
    assert.ok(get('Songs').THEMES[id], 'song');
    assert.ok(read('src/index.html').includes(`themes/scenes/${id}.js`), 'scene script tag');
  });
}

test('the world map has its own song, and every section plays voices it has', () => {
  const song = get('Songs').THEMES.worldmap;
  assert.ok(song, 'worldmap song');
  for (const sec of song.sections) {
    for (const layer of sec.layers) {
      const [voice, variant] = layer.split(':');
      assert.ok(song.voices[voice], `${layer}: voice`);
      if (variant) assert.ok(song.voices[voice][variant], `${layer}: variant`);
    }
  }
});

test('while a screen plays its own song, the music is that song', () => {
  assert.match(read('src/audio/AudioManager.js'), /if \(this\.songOverride\) return this\.songOverride;/);
  assert.match(read('src/screens/WorldMapScreen.js'), /useSong\('worldmap'\)/);
});
