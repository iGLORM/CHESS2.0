// Every story character has live pixel art, and the story only asks for moods it has.
const test = require('node:test');
const assert = require('node:assert');
const { loadGame, ENGINE } = require('./load');
const { loadScene } = require('../scripts/live-scene.js');

const G = loadGame([...ENGINE, 'engine/BossRules.js', 'characters/characters.js', 'characters/trainers.js',
  'characters/worlds.js', 'characters/story.js']);
const ids = [...G.STORY_STAGES.map(c => c.id), ...Object.keys(G.STORY_SPEAKERS).filter(id => id !== 'narrator')];
const defs = {};
for (const id of ids) defs[id] = loadScene('char_' + id).def;

test('every story character is a live character with moods and a face close-up', () => {
  for (const id of ids) {
    const d = defs[id];
    assert.strictEqual(d.width, 62, id);
    assert.strictEqual(d.height, 80, id);
    assert.ok(d.moods && d.moods.length >= 3, `${id}: needs at least 3 moods`);
    const [x, y, w, h] = d.frames.face;
    assert.ok(w === 40 && h === 40 && x >= 0 && y >= 0 && x + w <= d.width && y + h <= d.height, `${id}: face frame`);
  }
});

test('moodFor only returns moods the character has', () => {
  const categories = ['gameStart', 'bossCapture', 'playerCapture', 'bossCaptureBig', 'playerCaptureBig', 'bossCheck',
    'playerCheck', 'bossTaunt', 'milestone', 'lowHealth', 'playerLowHealth', 'eyes', 'lock', 'clockLow', 'mysteryHint',
    'doubleTake', 'crack', 'rewind'];
  for (const id of ids) {
    const d = defs[id];
    for (const c of categories) {
      const m = d.moodFor ? d.moodFor(c) : null;
      if (m) assert.ok(d.moods.includes(m), `${id}: moodFor(${c}) = ${m} is not one of its moods`);
    }
  }
});

test('story beats use moods their speaker has', () => {
  for (const [key, scene] of Object.entries(G.STORY_SCENES)) {
    scene.beats.forEach((b, i) => {
      if (!b.mood) return;
      assert.ok(defs[b.who], `${key}[${i}]: ${b.who} has no live art`);
      assert.ok(defs[b.who].moods.includes(b.mood), `${key}[${i}]: ${b.who} has no mood '${b.mood}'`);
    });
  }
});
