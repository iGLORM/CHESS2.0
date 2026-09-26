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

test('every guardian world has five missions, and every mission a rule', () => {
  const guardians = G.WORLDS.filter(w => w.stages[0] >= 7);
  assert.strictEqual(guardians.length, 9);
  for (const w of guardians) assert.strictEqual(MISSIONS[w.id].length, 5, w.id);
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
    if (goal) assert.ok(goal.captures > 0 || goal.promote || goal.survive > 0, m.id);
    if (trial) {
      assert.ok(trial.need <= trial.games, m.id);
      for (const name of trial.pool || []) assert.ok(GAMES.includes(name), `${m.id}: unknown challenge ${name}`);
    }
  }
});
