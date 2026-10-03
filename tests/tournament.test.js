// Story tournaments: the Queen's Cup (groups + knockout) and the Gulch Shootout.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadGame, ENGINE } = require('./load');

const G = loadGame([...ENGINE, 'engine/BossRules.js', 'engine/Tournament.js', 'characters/characters.js',
  'characters/trainers.js', 'characters/worlds.js', 'characters/tournaments.js']);
const T = G.Tournament;
// Objects made inside the vm have other prototypes: compare them as plain data.
const same = (a, b, msg) => assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), msg);
const DEFS = G.TOURNAMENTS;

const cup = (seed) => T.create({ seed, format: 'groups', pools: DEFS.royalpalace.pools, top: 5 });
const shootout = (seed) => T.create({ seed, format: 'knockout', pools: DEFS.forkedgulch.pools, top: 8 });

// Plays the player's games with `pick(match, t)` -> 'win' | 'loss' | 'draw' until the end.
function run(t, pick) {
  let guard = 50;
  while (T.playerMatch(t) && guard--) T.recordPlayer(t, pick(T.playerMatch(t), t));
  return t;
}

test('16 distinct entrants with levels between guardian - 3 and the guardian', () => {
  for (let s = 1; s < 30; s++) {
    for (const [t, top] of [[cup(s), 5], [shootout(s), 8]]) {
      assert.strictEqual(t.entrants.length, 16);
      assert.ok(t.entrants[0].player);
      assert.strictEqual(new Set(t.entrants.map(e => e.id)).size, 16);
      assert.strictEqual(new Set(t.entrants.map(e => e.name)).size, 16);
      for (const e of t.entrants.slice(1)) {
        assert.ok(e.level >= Math.max(1, top - 3) && e.level <= top, `${e.name} level ${e.level}`);
        assert.ok(e.piece && e.title && e.colors.primary);
      }
      assert.ok(t.entrants.some(e => e.level === top), 'someone plays at the guardian level');
    }
  }
  assert.ok(T.levels(15, 2).every(l => l >= 1), 'never below 1');
});

test('four groups of four; every group plays a complete round robin', () => {
  const t = cup(7);
  assert.strictEqual(t.groups.length, 4);
  same(t.groups.flat().sort((a, b) => a - b), [...Array(16).keys()]);
  run(t, () => 'win');
  for (let g = 0; g < 4; g++) {
    const games = t.matches.filter(m => m.group === g);
    assert.strictEqual(games.length, 6);
    const pairs = new Set(games.map(m => [m.a, m.b].sort((x, y) => x - y).join('-')));
    assert.strictEqual(pairs.size, 6, 'each pair meets once');
    for (const e of t.groups[g]) assert.strictEqual(games.filter(m => m.a === e || m.b === e).length, 3);
  }
  // The player plays on every matchday.
  for (const md of ['md1', 'md2', 'md3']) assert.strictEqual(T.matchesIn(t, md).filter(m => T.hasPlayer(m)).length, 1);
});

test('standings: 3 points a win, 1 a draw, tiebreaks by head-to-head then strength of results', () => {
  const t = cup(3);
  const g = t.groups[0];
  const set = (a, b, result) => {
    const m = t.matches.find(x => x.group === 0 && ((x.a === a && x.b === b) || (x.a === b && x.b === a))) ||
      (() => { const x = { id: `x${a}${b}`, phase: 'md1', group: 0, slot: 9, a, b, result: null, replays: 0 }; t.matches.push(x); return x; })();
    m.result = result === 'draw' ? 'draw' : (result === a ? (m.a === a ? 'a' : 'b') : (m.a === b ? 'a' : 'b'));
  };
  // Clear any group-0 results and write a full group by hand.
  t.matches = t.matches.filter(m => m.group !== 0);
  const [p, q, r, s] = g;
  set(p, q, p); set(r, s, 'draw');
  set(p, r, r); set(q, s, q);
  set(p, s, p); set(q, r, q);
  // p: W L W = 6, q: L W W = 6, r: D W L = 4, s: D L L = 1. p beat q head-to-head.
  const rows = T.standings(t, 0);
  same(rows.map(x => x.entrant), [p, q, r, s]);
  same(rows.map(x => x.pts), [6, 6, 4, 1]);
  same([rows[0].w, rows[0].d, rows[0].l, rows[0].p], [2, 0, 1, 3]);
  same(T.qualifiers(t)[0], [p, q]);

  // Three-way tie with a circle of wins: head-to-head is level, strength of results decides.
  t.matches = t.matches.filter(m => m.group !== 0);
  set(p, q, p); set(q, r, q); set(r, p, r);
  set(p, s, 'draw'); set(q, s, q); set(r, s, r);
  // p 4, q 6, r 6: q and r are level and q beat r, so q is first.
  let rows2 = T.standings(t, 0);
  same(rows2.slice(0, 2).map(x => x.entrant), [q, r]);
  // All of p, q, r on 6 with a circle: order falls to the strength of results, then lots.
  t.matches = t.matches.filter(m => m.group !== 0);
  set(p, q, p); set(q, r, q); set(r, p, r);
  set(p, s, p); set(q, s, q); set(r, s, r);
  rows2 = T.standings(t, 0);
  same(rows2.map(x => x.pts), [6, 6, 6, 0]);
  assert.strictEqual(rows2[3].entrant, s);
  const lots = [p, q, r].sort((x, y) => t.entrants[x].lot - t.entrants[y].lot);
  same(rows2.slice(0, 3).map(x => x.entrant), lots, 'fully tied: drawing of lots');
});

test('quarter-finals pair group winners with runners-up: A1-B2, B1-A2, C1-D2, D1-C2', () => {
  const t = cup(11);
  run(t, (m) => (m.phase.startsWith('md') ? 'win' : 'loss'));
  const q = t.groups.map((_, g) => T.standings(t, g).slice(0, 2).map(r => r.entrant));
  const qf = T.matchesIn(t, 'qf').map(m => [m.a, m.b]);
  const want = [[q[0][0], q[1][1]], [q[2][0], q[3][1]], [q[1][0], q[0][1]], [q[3][0], q[2][1]]];
  same(qf.map(p => p.slice().sort()), want.map(p => p.slice().sort()));
  // Both group mates are in different halves: they can only meet in the final.
  for (let g = 0; g < 4; g++) {
    const half = e => (T.matchesIn(t, 'qf').findIndex(m => m.a === e || m.b === e) < 2 ? 0 : 1);
    assert.notStrictEqual(half(q[g][0]), half(q[g][1]));
  }
});

test('winning every game takes the cup; the knockout advances winners', () => {
  const t = run(cup(5), () => 'win');
  assert.strictEqual(t.status, 'champion');
  assert.strictEqual(t.champion, 0);
  assert.strictEqual(T.playerWins(t), 6);
  for (const [prev, next] of [['qf', 'sf'], ['sf', 'final']]) {
    const winners = T.matchesIn(t, prev).map(m => T.winner(m));
    const entrants = T.matchesIn(t, next).flatMap(m => [m.a, m.b]);
    same(entrants, winners);
  }
  assert.strictEqual(T.playerMatch(t), null);
});

test('the shootout is a straight knockout: four wins, the player starts against the weakest seed', () => {
  const t = shootout(9);
  const r16 = T.matchesIn(t, 'r16');
  assert.strictEqual(r16.length, 8);
  same(r16.flatMap(m => [m.a, m.b]).sort((a, b) => a - b), [...Array(16).keys()]);
  const first = T.opponent(t);
  assert.strictEqual(first.level, Math.min(...t.entrants.slice(1).map(e => e.level)));
  run(t, () => 'win');
  assert.strictEqual(t.status, 'champion');
  assert.strictEqual(T.playerWins(t), 4);
  same(['r16', 'qf', 'sf', 'final'].map(p => T.matchesIn(t, p).length), [8, 4, 2, 1]);
});

test('a knockout loss ends the attempt and the rest is played out to a champion', () => {
  const t = shootout(4);
  T.recordPlayer(t, 'win');
  const info = T.recordPlayer(t, 'loss');
  assert.strictEqual(info.event, 'out');
  assert.strictEqual(t.status, 'out');
  assert.strictEqual(t.outAt, 'qf');
  assert.ok(t.champion !== null && t.champion !== 0);
  assert.strictEqual(T.playerMatch(t), null);
  assert.ok(t.matches.every(m => m.result && m.result !== 'draw'));
});

test('a drawn knockout game is replayed; group draws give a point', () => {
  const t = shootout(2);
  const m = T.playerMatch(t);
  const info = T.recordPlayer(t, 'draw');
  assert.strictEqual(info.event, 'replay');
  assert.strictEqual(T.playerMatch(t), m);
  assert.strictEqual(m.replays, 1);
  assert.strictEqual(m.result, null);
  const c = cup(2);
  T.recordPlayer(c, 'draw');
  const row = T.standings(c, T.playerGroup(c)).find(r => r.entrant === 0);
  same([row.p, row.d, row.pts], [1, 1, 1]);
});

test('finishing 3rd or 4th in the group ends the attempt', () => {
  const t = run(cup(8), () => 'loss');
  assert.strictEqual(t.status, 'out');
  assert.strictEqual(t.outAt, 'group');
  assert.ok(t.champion !== null && t.champion !== 0);
  assert.strictEqual(t.matches.filter(m => T.hasPlayer(m)).length, 3);
});

test('simulated results follow from the seed and the player results', () => {
  const picks = ['win', 'draw', 'win', 'win', 'loss'];
  const play = (seed) => { const t = cup(seed); let i = 0; return run(t, () => picks[i++] || 'loss'); };
  same(JSON.parse(JSON.stringify(play(42))), JSON.parse(JSON.stringify(play(42))));
  assert.notStrictEqual(JSON.stringify(play(42).entrants.map(e => e.name)), JSON.stringify(play(43).entrants.map(e => e.name)));
  // The stronger side wins more often, and group games can be drawn.
  let strong = 0, draws = 0;
  for (let s = 0; s < 400; s++) {
    const t = cup(1000 + s);
    const m = { id: 'x', phase: 'md1', group: 0, slot: 0, a: 1, b: 2, result: null, replays: 0 };
    t.entrants[1].level = 8; t.entrants[2].level = 5;
    const r = T.simulate(t, m);
    if (r === 'a') strong++;
    if (r === 'draw') draws++;
  }
  assert.ok(strong > 250, `strong side won ${strong}/400`);
  assert.ok(draws > 5, `draws ${draws}/400`);
});

/* ------------------------------------------------------------------ */
/*  Save glue (characters/tournaments.js with a stub store)             */
/* ------------------------------------------------------------------ */

function glue() {
  const SRC = path.join(__dirname, '..', 'src');
  const started = [];
  const ctx = vm.createContext({ console, Math, JSON, Date });
  vm.runInContext(`
    const store = {
      state: { storySaves: [{ maxUnlockedLevel: 10 }], activeSaveSlot: 1, wallet: { coins: 0 } },
      get(k) { return this.state[k]; }, set(k, v) { this.state[k] = v; }, update(o) { Object.assign(this.state, o); },
      getActiveSave() { return this.state.storySaves[0]; },
      setActiveSave(u) { this.state.storySaves[0] = { ...this.state.storySaves[0], ...u }; },
      saveProgress() {},
    };
    var switched = [];
    function switchScreen(name, data) { switched.push(name); }
  `, ctx);
  for (const f of [...ENGINE, 'engine/BossRules.js', 'engine/StoryStars.js', 'state/Wallet.js', 'engine/Tournament.js',
    'characters/characters.js', 'characters/trainers.js', 'characters/worlds.js', 'characters/SideMatches.js', 'characters/tournaments.js']) {
    vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  }
  return { get: (n) => vm.runInContext(n, ctx), started };
}

test('save glue: attempts, match ids, the resolver, rewards and the first win', () => {
  const g = glue();
  const Tn = g.get('Tournaments'), SM = g.get('SideMatches'), store = g.get('store');
  assert.strictEqual(Tn.forWorld('ironkeep'), null);
  const t = Tn.state(store.getActiveSave(), 'royalpalace');
  assert.strictEqual(t.attempt, 1);
  assert.ok(g.get('TOURNAMENTS').royalpalace.say.intro.includes(Tn.hostLine('royalpalace', t)), 'the host opens the cup');
  assert.strictEqual(Tn.state(store.getActiveSave(), 'royalpalace').seed, t.seed, 'state is kept');

  const def = Tn.nextMatch('royalpalace');
  assert.ok(def.id.startsWith('tour_royalpalace_1_md1_'));
  assert.ok(def.noRematch);
  assert.match(def.kicker, /^THE QUEEN'S CUP · GROUP [A-D] · MATCHDAY 1$/);
  same(def.returnTo, { screen: 'tournament', data: { world: 'royalpalace' } });
  assert.strictEqual(def.theme, 'royalpalace');
  assert.ok(def.level >= 2 && def.level <= 5);

  // The resolver rebuilds the same opponent from the id alone.
  const ch = SM.character(def.id);
  assert.strictEqual(ch.name, def.name);
  assert.strictEqual(ch.level, def.level);

  // Win every game through SideMatches.finish (as GameScreen does).
  let guard = 20;
  while (guard--) {
    const d = Tn.nextMatch('royalpalace');
    if (!d) break;
    const c = SM.make(d);
    SM.finish(c, 'win');
    assert.strictEqual(Tn.record(d.id, 'win'), null, 'a result is recorded once');
  }
  const save = store.getActiveSave();
  assert.strictEqual(save.tournaments.royalpalace.status, 'champion');
  assert.ok(Tn.won(save, 'royalpalace'));
  assert.ok(Tn.guardianReady(save, g.get('WORLDS').find(w => w.id === 'royalpalace')));
  assert.strictEqual(save.bonusStars, 3);
  const W = g.get('Wallet.REWARDS');
  assert.strictEqual(store.state.wallet.coins, 6 * W.tournamentMatch + W.tournamentFinal + W.tournamentWin);
  assert.strictEqual(save.tournaments.royalpalace.event.event, 'champion');
  assert.ok(Tn.hostLine('royalpalace', save.tournaments.royalpalace));

  // Enter again: a fresh draw, next attempt; the win stays on the save, no more bonus stars.
  const t2 = Tn.enter('royalpalace');
  assert.strictEqual(t2.attempt, 2);
  assert.strictEqual(t2.status, 'playing');
  assert.notStrictEqual(t2.seed, t.seed);
  assert.ok(Tn.won(store.getActiveSave(), 'royalpalace'));
  assert.strictEqual(Tn.resolve(def.id), null, 'an old attempt does not resolve');
});

test('save glue: the shootout rounds carry their twists', () => {
  const g = glue();
  const Tn = g.get('Tournaments'), store = g.get('store');
  const titles = [];
  let guard = 10;
  while (guard--) {
    const d = Tn.nextMatch('forkedgulch');
    if (!d) break;
    titles.push(d.rule.title);
    if (d.tournament.phase === 'r16') assert.ok(!d.rule.doubleTake && !d.rule.moveLimit && !d.rule.fen, 'round of 16 is plain');
    Tn.record(d.id, 'win');
  }
  same(titles, ['A Straight Game', 'Double Barrel', 'High Noon', 'The Showdown']);
  assert.strictEqual(store.getActiveSave().tournaments.forkedgulch.status, 'champion');
  // A knockout loss ends the attempt.
  Tn.enter('forkedgulch');
  const d = Tn.nextMatch('forkedgulch');
  Tn.record(d.id, 'loss');
  const t = store.getActiveSave().tournaments.forkedgulch;
  assert.strictEqual(t.status, 'out');
  assert.strictEqual(Tn.nextMatch('forkedgulch'), null);
  assert.strictEqual(Tn.finishLabel(t), 'Round of 16');
});
