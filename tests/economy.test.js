// Stars, coins and the Shop (Wallet), side matches and the side content on the map.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadGame, ENGINE } = require('./load');

const G = loadGame([...ENGINE, '../tests/stubs/store.js', 'engine/BossRules.js', 'engine/StoryStars.js',
  'characters/characters.js', 'characters/trainers.js', 'characters/worlds.js', 'characters/missions.js',
  'state/Wallet.js', 'characters/SideMatches.js', 'characters/sidecontent.js']);
const store = G.store, Wallet = G.Wallet;

function fresh(save = {}) {
  store.state.wallet = { coins: 0, owned: [], planePaint: null, token: null };
  store.state.storySaves = [{ maxUnlockedLevel: 1, ...save }];
}

test('stars to spend are the story stars plus bonus stars, minus what was spent', () => {
  fresh({ stars: { pawnie: [true, true, false], bishbosh: [true, false, false] }, bonusStars: 2, starsSpent: 1 });
  assert.strictEqual(Wallet.starsEarned(), 5);
  assert.strictEqual(Wallet.stars(), 4);
});

test('buying a story item spends stars and adds one to the save', () => {
  fresh({ bonusStars: 9 });
  assert.ok(Wallet.buy('rewind').ok);
  assert.strictEqual(Wallet.count('rewind'), 1);
  assert.strictEqual(Wallet.stars(), 3);
  assert.ok(Wallet.use('rewind'));
  assert.strictEqual(Wallet.count('rewind'), 0);
  assert.ok(!Wallet.use('rewind'));
});

test('the plane is not sold: Pawnie gives it, once', () => {
  fresh({ bonusStars: 70 });
  assert.strictEqual(Wallet.item('plane'), null);
  assert.ok(!Wallet.buy('plane').ok);
  assert.ok(!Wallet.hasPlane());
  Wallet.givePlane();
  assert.ok(Wallet.hasPlane());
  assert.strictEqual(Wallet.stars(), 70, 'a gift costs nothing');
});

test('a save that bought the plane gets its stars back, once', () => {
  const ctx = vm.createContext({ console, Math, JSON, Date, localStorage: { getItem: () => null, setItem() {} } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/state/Store.js'), 'utf8'), ctx);
  const Store = vm.runInContext('Store', ctx);
  const bought = Store.migrateSave({ stages: 15, plane: true, starsSpent: 66 });
  assert.strictEqual(bought.starsSpent, 6);
  assert.ok(bought.planeGift);
  assert.strictEqual(Store.migrateSave(bought).starsSpent, 6, 'not twice');
  assert.strictEqual(Store.migrateSave({ stages: 15, starsSpent: 9 }).starsSpent, 9);
});

test('coins buy cosmetics, which are put on and can be taken off', () => {
  fresh();
  assert.ok(!Wallet.buy('token_queen').ok);
  Wallet.earn('classicWin');
  Wallet.earn('side', 600);
  assert.strictEqual(Wallet.coins(), 608);
  assert.ok(Wallet.buy('token_queen').ok);
  assert.strictEqual(Wallet.tokenPiece(), 'queen');
  Wallet.unequip('token');
  assert.strictEqual(Wallet.tokenPiece(), 'king');
  assert.ok(Wallet.equip('token_queen'));
  assert.ok(!Wallet.equip('token_rook'), 'not owned');
  assert.strictEqual(Wallet.coins(), 608 - 240);
});

test('the shop costs three times what it used to', () => {
  const was = { rewind: 2, hint: 1, remove: 4, paint_sunset: 60, paint_crystal: 150, token_queen: 80, token_pawn: 40 };
  for (const [id, price] of Object.entries(was)) assert.strictEqual(Wallet.item(id).price, price * 3, id);
  assert.strictEqual(Wallet.THEME_PRICE, 750);
});

test('characters: the King is yours from the start, others have a piece, colour and set', () => {
  fresh();
  assert.ok(Wallet.owns('token_king'));
  assert.strictEqual(Wallet.equipped('token'), 'token_king');
  assert.deepStrictEqual({ ...Wallet.token() }, { piece: 'king', color: 'white', art: null });
  Wallet.earn('side', 2000);
  assert.ok(Wallet.buy('token_obsidianqueen').ok);
  assert.deepStrictEqual({ ...Wallet.token() }, { piece: 'queen', color: 'black', art: 'obsidiancourt' });
  assert.ok(Wallet.equip('token_king'));
  assert.strictEqual(Wallet.tokenPiece(), 'king');
  assert.strictEqual(Wallet.buy('token_king').reason, 'owned');
  const sets = new Set(['pawnhollow', 'slantedsands', 'ironkeep', 'mistymoors', 'clockworkcitadel', 'obsidiancourt', 'chess20', 'crystal', 'greatboard']);
  for (const it of Wallet.ITEMS.filter(i => i.kind === 'token')) {
    assert.ok(['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'].includes(it.piece), it.id);
    assert.ok(!it.color || ['white', 'black'].includes(it.color), it.id);
    assert.ok(!it.art || sets.has(it.art), it.id);
  }
});

test('every shop item has a price, a name and a description', () => {
  for (const it of Wallet.ITEMS) {
    assert.ok((it.price > 0 || it.free) && it.name && it.desc, it.id);
    assert.ok(['stars', 'coins'].includes(it.currency), it.id);
  }
});

test('a side match pays its bonus stars only once', () => {
  fresh();
  const ch = G.SideMatches.make({ id: 'rival_test_0', name: 'Test', reward: { coins: 10, stars: 2 }, once: 'rival_test_0' });
  assert.deepStrictEqual({ ...G.SideMatches.finish(ch, 'win') }, { coins: 10, stars: 2 });
  assert.deepStrictEqual({ ...G.SideMatches.finish(ch, 'win') }, { coins: 10, stars: 0 });
  assert.deepStrictEqual({ ...G.SideMatches.finish(ch, 'loss') }, { coins: 0, stars: 0 });
  assert.strictEqual(Wallet.stars(), 2);
});

test('rivals come back stronger after each win, up to three tiers', () => {
  fresh({ maxUnlockedLevel: 15 });
  const r = G.SideContent.RIVALS[0];
  for (let t = 0; t < 3; t++) {
    const def = G.SideContent.rivalDef(r, G.SideContent.rivalTier(store.getActiveSave(), r.id));
    assert.strictEqual(def.level, r.level + t);
    def.onResult('win');
  }
  assert.strictEqual(G.SideContent.rivalTier(store.getActiveSave(), r.id), 3);
  // Resolvers rebuild a match from its id.
  assert.strictEqual(G.SideMatches.character(`rival_${r.id}_1`).level, r.level + 1);
});

test('a road blocker leaves the map once beaten, and the road opens', () => {
  fresh({ maxUnlockedLevel: 15 });
  const r = G.SideContent.RIVALS[0];
  assert.ok(G.SideContent.rivalVisible(store.getActiveSave(), r));
  assert.ok(!G.SideContent.roadOpen(store.getActiveSave(), r.gate));
  G.SideContent.rivalDef(r, 0).onResult('win');
  assert.ok(!G.SideContent.rivalVisible(store.getActiveSave(), r));
  assert.ok(G.SideContent.roadOpen(store.getActiveSave(), r.gate));
});

test('side content positions are legal with White to move', () => {
  const ka = (b, c) => { const k = b.findKing(c); return G.MoveGen.isSquareAttacked(b, k.row, k.col, c === 'white' ? 'black' : 'white'); };
  const rules = [...G.SideContent.RIVALS.map(r => r.rule), ...Object.values(G.SideContent.QUESTS).flatMap(q => q.steps.map(s => s.rule))];
  for (const rule of rules) {
    const b = G.BossRules.startBoard(rule, () => 0.5, []);
    assert.ok(b.findKing('white') && b.findKing('black'), rule.title);
    assert.ok(!ka(b, 'black'), `${rule.title}: Black in check`);
    assert.ok(G.GameRules.getLegalMoves(b, 'white').length > 0, `${rule.title}: no move`);
  }
});

test('side quests open after their guardian, advance step by step and pay a prize', () => {
  fresh({ maxUnlockedLevel: 8 });   // Bish-Bosh (stage 7) beaten
  assert.ok(G.SideContent.questOpen(store.getActiveSave(), 'bishbosh'));
  assert.ok(!G.SideContent.questOpen(store.getActiveSave(), 'endgamer'));
  for (let i = 0; i < 3; i++) G.SideContent.questDef('bishbosh', i).onResult('win');
  assert.ok(G.SideContent.questDone(store.getActiveSave(), 'bishbosh'));
  assert.ok(store.get('wallet').owned.includes('paint_sunset'));
});

test('the Arena opens after three guardians and keeps the best streak', () => {
  fresh({ maxUnlockedLevel: 9 });
  assert.ok(!G.SideContent.arenaUnlocked(store.getActiveSave()));
  fresh({ maxUnlockedLevel: 10 });
  assert.ok(G.SideContent.arenaUnlocked(store.getActiveSave()));
  G.SideContent.arenaDef(0).onResult('win');
  G.SideContent.arenaDef(1).onResult('win');
  G.SideContent.arenaDef(2).onResult('loss');
  const a = G.SideContent.arena(store.getActiveSave());
  assert.strictEqual(a.best, 2);
  assert.strictEqual(a.run, 0);
  assert.strictEqual(G.SideContent.arenaDef(0).face, 'bishbosh');
});

test('wandering rivals block the roads to the guardians, and the Arena guards the Court', () => {
  const S = G.StoryProgress, SC = G.SideContent;
  // One rival per road from the Iron Keep to the Court, none to Forked Gulch.
  assert.strictEqual(JSON.stringify(SC.RIVALS.map(r => r.gate).sort((a, b) => a - b)), "[8,9,10,11,12,14]");
  assert.strictEqual(SC.gateRival(13), null);
  fresh({ maxUnlockedLevel: 8 });
  assert.ok(!S.isUnlocked(store.getActiveSave(), 8), 'Salt-Beard blocks the road to the Iron Keep');
  assert.strictEqual(S.roadBlock(store.getActiveSave(), 8).rival.id, 'saltbeard');
  assert.ok(S.isUnlocked(store.getActiveSave(), 7), 'stages already beaten stay open');
  SC.rivalDef(SC.rival('saltbeard'), 0).onResult('win');
  assert.ok(S.isUnlocked(store.getActiveSave(), 8));
  assert.deepStrictEqual({ ...store.get('storyMapEvent') }, { stage: 7, road: true });
  // The Court needs Jungle Jack and a three-game Arena streak.
  fresh({ maxUnlockedLevel: 14, rivals: { junglejack: 1 } });
  assert.strictEqual(S.roadBlock(store.getActiveSave(), 14).type, 'arena');
  SC.arenaDef(0).onResult('win');
  SC.arenaDef(1).onResult('win');
  assert.ok(!S.isUnlocked(store.getActiveSave(), 14));
  SC.arenaDef(2).onResult('win');
  assert.ok(S.isUnlocked(store.getActiveSave(), 14));
  // A save that already beat the stage is never blocked.
  fresh({ maxUnlockedLevel: 15 });
  assert.ok(S.isUnlocked(store.getActiveSave(), 14));
});

test('only three guardians hold fragments; yours makes four', () => {
  const S = G.StoryProgress;
  assert.strictEqual(S.FRAGMENT_COUNT, 4);
  assert.strictEqual(S.fragments({ maxUnlockedLevel: 12 }), 1);
  assert.strictEqual(S.fragments({ maxUnlockedLevel: 13 }), 2);
  assert.strictEqual(S.fragments({ maxUnlockedLevel: 15, completed: true }), 4);
});
