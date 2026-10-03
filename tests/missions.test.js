const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadGame, ENGINE } = require('./load');

const G = loadGame([...ENGINE, 'engine/BossRules.js', 'characters/characters.js', 'characters/trainers.js',
  'characters/worlds.js', 'characters/missions.js']);
const MISSIONS = G.MISSIONS;
const all = Object.values(MISSIONS).flat();
const GAMES = fs.readFileSync(path.join(__dirname, '..', 'src/minigames/MiniGameManager.js'), 'utf8')
  .match(/static GAMES_3D\(\) \{[\s\S]*?\]/)[0].match(/[A-Z]\w+/g);

function kingAttacked(board, color) {
  const k = board.findKing(color);
  return G.MoveGen.isSquareAttacked(board, k.row, k.col, color === 'white' ? 'black' : 'white');
}

function mates(board) {
  return G.GameRules.getLegalMoves(board, 'white').filter(m => {
    const after = board.clone();
    G.MoveExecutor.executeMoveRaw(after, m);
    return kingAttacked(after, 'black') && G.GameRules.getLegalMoves(after, 'black').length === 0;
  });
}

// The Royal Palace and Forked Gulch hold tournaments instead of missions (tournament.test.js).
const TOURNAMENT_WORLDS = ['royalpalace', 'forkedgulch'];

test('every guardian world has seven missions (or a tournament), and every mission a rule', () => {
  const guardians = G.WORLDS.filter(w => w.stages[0] >= 7);
  assert.strictEqual(guardians.length, 9);
  for (const w of guardians) {
    if (TOURNAMENT_WORLDS.includes(w.id)) assert.ok(!MISSIONS[w.id], w.id);
    else assert.strictEqual(MISSIONS[w.id].length, G.StoryMissions.COUNT, w.id);
  }
  assert.strictEqual(G.StoryMissions.COUNT, 7);
  for (const m of all) {
    assert.ok(G.BossRules.get(m.id), m.id);
    assert.ok(G.MISSION_KINDS[m.kind], m.id);
    assert.ok(m.rule.title && m.rule.lines.length, m.id);
  }
});

test('mission puzzles each have a mate in one for White', () => {
  for (const m of all.filter(m => m.rule.puzzles)) {
    for (const fen of m.rule.puzzles) {
      const b = G.FEN.toBoard(fen);
      assert.ok(!kingAttacked(b, 'black'), `${m.id}: Black already in check in ${fen}`);
      assert.ok(mates(b).length >= 1, `${m.id}: no mate in one in ${fen}`);
    }
  }
});

test('mission start positions are legal with White to move', () => {
  for (const m of all.filter(m => !m.rule.puzzles && !m.rule.minigameTrial)) {
    const b = G.BossRules.startBoard(m.rule, () => 0.5, []);
    assert.ok(b.findKing('white') && b.findKing('black'), m.id);
    assert.ok(!kingAttacked(b, 'black'), `${m.id}: Black in check before White moves`);
    assert.ok(G.GameRules.getLegalMoves(b, 'white').length > 0, `${m.id}: White has no move`);
  }
});

test('mission goals and trials are well formed', () => {
  for (const m of all) {
    const { goal, minigameTrial: trial } = m.rule;
    if (goal) assert.ok(goal.mystery || goal.captureAll || goal.promote || goal.survive > 0 || goal.relics || goal.crossing, m.id);
    if (trial) {
      assert.ok(trial.need <= trial.games, m.id);
      for (const name of trial.pool || []) assert.ok(GAMES.includes(name), `${m.id}: unknown challenge ${name}`);
    }
  }
});

test('relic runs put every relic on an empty, distinct square', () => {
  const runs = all.filter(m => m.rule.goal && m.rule.goal.relics);
  assert.strictEqual(runs.length, 6);   // not in the tournament worlds or the Grand Library's puzzle hall
  for (const m of runs) {
    const b = G.BossRules.startBoard(m.rule, () => 0.5, []);
    const seen = new Set();
    for (const name of m.rule.goal.relics) {
      assert.match(name, /^[a-h][1-8]$/, m.id);
      const s = G.BossRules.square(name);
      assert.ok(!b.grid[s.row][s.col], `${m.id}: relic ${name} starts under a piece`);
      assert.ok(!seen.has(name), `${m.id}: relic ${name} twice`);
      seen.add(name);
    }
    assert.ok(m.rule.moveLimit >= 12, m.id);
  }
});

test('relics are picked up by your moves only, castling included', () => {
  const rule = { goal: { relics: ['e4', 'f1', 'd5'] } };
  const mv = (color, from, to, extra = {}) => ({ piece: { color, type: 'pawn' }, from: G.BossRules.square(from), to: G.BossRules.square(to), ...extra });
  const hist = [
    mv('white', 'e2', 'e4'),
    mv('black', 'd7', 'd5'),
    mv('white', 'c4', 'd5', { defended: true }),
    { piece: { color: 'white', type: 'king' }, from: G.BossRules.square('e1'), to: G.BossRules.square('g1'), castling: 'kingside' },
  ];
  assert.deepStrictEqual(G.BossRules.relicsTaken(rule, hist, 'white').map(s => s.row * 8 + s.col).sort(),
    [G.BossRules.square('e4'), G.BossRules.square('f1')].map(s => s.row * 8 + s.col).sort());
});

test('memory missions start with the king on the first ranks and room to cross', () => {
  const walks = all.filter(m => m.rule.goal && m.rule.goal.crossing);
  assert.strictEqual(walks.length, 7);   // one per mission world
  for (const m of walks) {
    const b = G.BossRules.startBoard(m.rule, () => 0.5, []);
    const k = b.findKing('white');
    assert.ok(k.row >= 6, `${m.id}: king starts too far up`);
    assert.ok(m.rule.moveLimit >= 8 - k.row + 8, `${m.id}: not enough moves to walk`);
    assert.strictEqual(G.BossRules.crossingProgress(b, 'white', k.row), 0);
  }
});
