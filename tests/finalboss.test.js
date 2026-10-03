// Grandmaster X Unbound: the last game, with every guardian's power (FinalBoss).
const test = require('node:test');
const assert = require('node:assert');
const { loadGame, ENGINE } = require('./load');

const G = loadGame([...ENGINE, '../tests/stubs/store.js', 'engine/BossRules.js', 'engine/StoryStars.js',
  'characters/characters.js', 'characters/trainers.js', 'characters/worlds.js', 'characters/story.js',
  'characters/missions.js', 'state/Wallet.js', 'characters/keepsakes.js', 'characters/SideMatches.js',
  'characters/finalboss.js']);
const { store, FinalBoss, BossRules, StoryProgress } = G;
const LAST = G.STORY_STAGES.length;

function fresh(save = {}) {
  store.state.wallet = { coins: 0, owned: [], planePaint: null, token: null };
  store.state.storySaves = [{ maxUnlockedLevel: LAST, storyLevel: LAST, ...save }];
  store.state.slot = 0;
}
const count = (b, color, type) => b.grid.flat().filter(p => p && p.color === color && p.type === type).length;

test('the last game starts legal: his stolen armies, your missing rooks, the gear walls', () => {
  const b = BossRules.startBoard(FinalBoss.RULE);
  assert.strictEqual(count(b, 'black', 'queen'), 2);
  assert.strictEqual(count(b, 'black', 'bishop'), 4);
  assert.strictEqual(count(b, 'black', 'knight'), 0);
  assert.strictEqual(count(b, 'white', 'rook'), 0);
  assert.strictEqual(b.grid.flat().filter(p => p && p.type === 'wall').length, 4);
  assert.ok(b.findKing('white') && b.findKing('black'));
  const inCheck = color => { const k = b.findKing(color); return G.MoveGen.isSquareAttacked(b, k.row, k.col, color === 'white' ? 'black' : 'white'); };
  assert.ok(!inCheck('white') && !inCheck('black'));
  assert.ok(G.GameRules.getLegalMoves(b, 'white').length > 0);
});

test('he has every guardian power but Pawnie\'s plain chess', () => {
  const r = FinalBoss.RULE;
  assert.ok(r.fog && r.doubleTake && r.everyCapture && r.maxBotSkill && r.weakestGames && r.tenseMusic);
  assert.strictEqual(r.moveLimit, 40);
  assert.strictEqual(r.lockPlies, 4);
  assert.ok(!r.noChallenges && !r.endgames && !r.rewinds);
  assert.ok(r.lines.join(' ').includes('40'));
});

test('beating Grandmaster X leaves the story waiting for the last game', () => {
  fresh({ unbound: true });
  assert.ok(FinalBoss.pending(store.getActiveSave()));
  assert.ok(!StoryProgress.isBeaten(store.getActiveSave(), LAST), 'Grandmaster X only counts after the last game');
  assert.strictEqual(StoryProgress.fragments(store.getActiveSave()), 3);
  assert.strictEqual(G.StoryScenes.after(LAST), null, 'the ending waits for the last game');
  assert.ok(G.STORY_SCENES.ascension.beats.some(b => [].concat(b.fx || []).includes('absorb')));
});

test('a loss changes nothing; the first win finishes the story and plays the ending', () => {
  fresh({ unbound: true });
  const def = FinalBoss.def();
  def.onResult('loss');
  assert.ok(FinalBoss.pending(store.getActiveSave()));
  def.onResult('win');
  const save = store.getActiveSave();
  assert.ok(save.completed && !FinalBoss.pending(save));
  assert.ok(StoryProgress.isBeaten(save, LAST));
  assert.strictEqual(store.get('storyScenePending'), 'ending');
  assert.strictEqual(store.get('storyMapEvent').stage, LAST);
  assert.strictEqual(def.returnTo.screen, 'credits');
});

test('a replay on a finished save goes back to the map', () => {
  fresh({ unbound: true, completed: true });
  store.set('storyScenePending', null);
  const def = FinalBoss.def();
  def.onResult('win');
  assert.strictEqual(store.get('storyScenePending'), null);
  assert.strictEqual(def.returnTo.screen, 'worldMap');
});

test('a restored game finds Grandmaster X Unbound again', () => {
  const ch = G.SideMatches.character(FinalBoss.ID);
  assert.ok(ch && ch.face === 'grandmasterx' && ch.theme === 'greatboard');
  assert.strictEqual(BossRules.get(FinalBoss.ID), FinalBoss.RULE);
});
