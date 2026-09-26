const test = require('node:test');
const assert = require('node:assert');
const { loadGame, ENGINE } = require('./load');

const G = loadGame([...ENGINE, 'engine/BossRules.js']);
const VALUE = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };

function material(board) {
  const total = { white: 0, black: 0 };
  for (const row of board.grid) for (const p of row) if (p) total[p.color] += VALUE[p.type];
  return total;
}

const sq = s => ({ row: 8 - Number(s[1]), col: 'abcdefgh'.indexOf(s[0]) });
function findMove(board, from, to) {
  const f = sq(from), t = sq(to);
  const m = G.GameRules.getLegalMoves(board, board.turn).find(m =>
    m.from.row === f.row && m.from.col === f.col && m.to.row === t.row && m.to.col === t.col);
  assert.ok(m, `no legal move ${from}-${to}`);
  return m;
}

function count(board, color, type) {
  return board.grid.flat().filter(p => p && p.color === color && p.type === type).length;
}

test('Bish-Bosh starts with four bishops and no knights', () => {
  const b = G.BossRules.startBoard(G.BossRules.get('bishbosh'));
  assert.strictEqual(count(b, 'black', 'bishop'), 4);
  assert.strictEqual(count(b, 'black', 'knight'), 0);
  assert.strictEqual(count(b, 'white', 'knight'), 2);
});

test('Rook-E: you start without rooks and cannot castle', () => {
  const b = G.BossRules.startBoard(G.BossRules.get('rokee'));
  assert.strictEqual(count(b, 'white', 'rook'), 0);
  assert.strictEqual(count(b, 'black', 'rook'), 2);
  assert.deepStrictEqual({ ...b.castlingRights.white }, { kingside: false, queenside: false });
});

test('Rook-E: taking his rook always starts a challenge, other captures do not', () => {
  const rule = G.BossRules.get('rokee');
  assert.strictEqual(G.BossRules.challengeChance(rule, { type: 'rook' }, false), 1);
  assert.strictEqual(G.BossRules.challengeChance(rule, { type: 'pawn' }, false), 0.3);
  // His own rook captures are not affected.
  assert.strictEqual(G.BossRules.challengeChance(rule, { type: 'rook' }, true), 0.3);
});

test('Queenie: two queens on the rook squares, a rook beside the king, 60% on her captures', () => {
  const rule = G.BossRules.get('queenie');
  const b = G.BossRules.startBoard(rule);
  assert.deepStrictEqual(Array.from(b.grid[0], p => p.type),
    ['queen', 'knight', 'bishop', 'rook', 'king', 'bishop', 'knight', 'queen']);
  assert.strictEqual(b.castlingRights.black.kingside || b.castlingRights.black.queenside, false);
  assert.strictEqual(G.BossRules.challengeChance(rule, { type: 'pawn' }, true), 0.6);
  assert.strictEqual(G.BossRules.challengeChance(rule, { type: 'pawn' }, false), 0.3);
});

test('every EndGamer endgame and its mirror is legal, equal and playable', () => {
  for (const placement of G.BossRules.ENDGAMES) {
    for (const p of [placement, G.BossRules.mirrorPlacement(placement)]) {
      const b = G.FEN.toBoard(p + ' w - - 0 1');
      const m = material(b);
      assert.strictEqual(m.white, m.black, `unequal material in ${p}`);
      assert.ok(b.findKing('white') && b.findKing('black'), `missing king in ${p}`);
      assert.strictEqual(b.inCheck, false, `white starts in check in ${p}`);
      const bk = b.findKing('black');
      assert.strictEqual(G.MoveGen.isSquareAttacked(b, bk.row, bk.col, 'white'), false, `black in check in ${p}`);
      assert.ok(G.GameRules.getLegalMoves(b, 'white').length > 0, `no moves in ${p}`);
    }
  }
});

test('EndGamer avoids endgames played recently', () => {
  const all = [];
  for (const p of G.BossRules.ENDGAMES) all.push(p, G.BossRules.mirrorPlacement(p));
  const recent = all.slice(1);
  const fen = G.BossRules.pickEndgame(() => 0.5, recent);
  assert.strictEqual(fen, all[0] + ' w - - 0 1');
});

test('mirroring flips the files', () => {
  assert.strictEqual(G.BossRules.mirrorPlacement('k7/8/8/8/8/8/8/1K5R'), '7k/8/8/8/8/8/8/R5K1');
});

test('twisted fights play the AI one level weaker, never below zero', () => {
  assert.strictEqual(G.BossRules.aiLevel(G.BossRules.get('queenie'), 5), 4);
  assert.strictEqual(G.BossRules.aiLevel(G.BossRules.get('queenie'), 0), 0);
  assert.strictEqual(G.BossRules.aiLevel(G.BossRules.get('pawnie'), 5), 5);
});

test('fog: you see your own squares, what you attack and your pawn pushes, nothing else', () => {
  const b = new G.Board();
  const seen = G.BossRules.visibleSquares(b, 'white');
  assert.strictEqual(seen[6][4], true);   // e2 pawn
  assert.strictEqual(seen[4][4], true);   // e4: double push
  assert.strictEqual(seen[5][0], true);   // a3: attacked by the b2 pawn
  assert.strictEqual(seen[3][4], false);  // e5
  assert.strictEqual(seen[0][6], false);  // g8: his knight is hidden
  assert.strictEqual(seen[1][4], false);  // e7
});

test('double take: a fork on two pieces takes both', () => {
  // Black knight on c2 forks the white rooks on a1 and e1.
  const b = G.FEN.toBoard('7k/8/8/8/8/8/2n5/R3R1K1 b - - 0 1');
  const move = findMove(b, 'c2', 'a1');
  const victim = G.BossRules.doubleTakeVictim(b, move);
  assert.ok(victim);
  assert.deepStrictEqual([victim.row, victim.col, victim.piece.type], [7, 4, 'rook']);
});

test('double take: pawns do not count as the second piece', () => {
  const b = G.FEN.toBoard('4k3/8/8/8/8/8/2n5/R2P2K1 b - - 0 1');
  // c2 knight attacks a1 rook; nothing else of value is forked.
  assert.strictEqual(G.BossRules.doubleTakeVictim(b, findMove(b, 'c2', 'a1')), null);
});

test('double take: a king fork stays normal chess', () => {
  // The knight on c2 checks the king on e1 and attacks the rook on a1.
  const b = G.FEN.toBoard('4k3/8/8/8/8/8/2n5/R3K3 b - - 0 1');
  assert.strictEqual(G.BossRules.doubleTakeVictim(b, findMove(b, 'c2', 'a1')), null);
});

test('double take is skipped when removing the piece would expose his king', () => {
  // The c2 knight forks the a1 rook and the e3 bishop, but the bishop shields
  // the black king from the e2 rook, so only the rook is taken.
  const b = G.FEN.toBoard('4k3/8/8/8/8/4B3/2n1R3/R5K1 b - - 0 1');
  assert.strictEqual(G.BossRules.doubleTakeVictim(b, findMove(b, 'c2', 'a1')), null);
});

test('rewind gift: a bishop or knight next to his king that gives no check', () => {
  const b = G.FEN.toBoard('4k3/8/8/8/8/8/8/4K3 b - - 0 1');
  for (let i = 0; i < 20; i++) {
    const gift = G.BossRules.rewindPiece(b, 'black', Math.random);
    assert.ok(gift && ['bishop', 'knight'].includes(gift.type));
    assert.ok(Math.max(Math.abs(gift.row - 0), Math.abs(gift.col - 4)) <= 2);
    assert.strictEqual(b.grid[gift.row][gift.col], null);
    b.grid[gift.row][gift.col] = { type: gift.type, color: 'black' };
    assert.strictEqual(G.MoveGen.isSquareAttacked(b, 7, 4, 'black'), false);
    b.grid[gift.row][gift.col] = null;
  }
});

test('Grandmaster X: every capture is a challenge', () => {
  const rule = G.BossRules.get('grandmasterx');
  assert.strictEqual(G.BossRules.challengeChance(rule, { type: 'pawn' }, true), 1);
  assert.strictEqual(G.BossRules.challengeChance(rule, { type: 'pawn' }, false), 1);
});

test('weakest minigames: worst loss rate first, only games lost at least once', () => {
  const names = G.BossRules.weakestGames({
    LavaTilt: { played: 4, won: 1 },
    RookStack: { played: 2, won: 0 },
    MemoryMatch: { played: 5, won: 5 },
    WhackMole: { played: 3, won: 2 },
  });
  assert.deepStrictEqual(Array.from(names), ['RookStack', 'LavaTilt', 'WhackMole']);
});

test('CastlE walls sit on c4, f4, c5 and f5', () => {
  const rule = G.BossRules.get('castle');
  for (const s of ['c4', 'f4', 'c5', 'f5']) assert.ok(G.BossRules.isWall(rule, sq(s).row, sq(s).col), s);
  assert.strictEqual(G.BossRules.isWall(rule, sq('e4').row, sq('e4').col), false);
});

test('story has 15 stages: Pawnie, five trainers, nine guardians', () => {
  const S = loadGame([...ENGINE, 'engine/BossRules.js', 'characters/characters.js', 'characters/trainers.js']);
  const ids = Array.from(S.STORY_STAGES, c => c.id);
  assert.strictEqual(ids.length, 15);
  assert.deepStrictEqual(ids.slice(0, 7), ['pawnie', 'sergeantsquare', 'captaincapture', 'joystick', 'rulekeeper', 'senseitactic', 'bishbosh']);
  assert.strictEqual(ids[14], 'grandmasterx');
  S.STORY_STAGES.forEach((c, i) => assert.strictEqual(c.stage, i + 1));
  for (const t of S.TRAINERS) assert.ok(S.BossRules.get(t.id), `no rule for ${t.id}`);
});

test("Sergeant Square's puzzles each have a mate in one", () => {
  for (const fen of G.BossRules.get('sergeantsquare').puzzles) {
    const b = G.FEN.toBoard(fen);
    const mates = G.GameRules.getLegalMoves(b, 'white').filter(m => {
      const after = b.clone();
      G.MoveExecutor.executeMove(after, m, 'white');
      return G.GameRules.isCheckmate(after, 'black');
    });
    assert.ok(mates.length >= 1, `no mate in one in ${fen}`);
  }
});

test("no challenges in the mate drill; every capture in Captain Capture's camp", () => {
  assert.strictEqual(G.BossRules.challengeChance(G.BossRules.get('sergeantsquare'), { type: 'rook' }, false), 0);
  assert.strictEqual(G.BossRules.challengeChance(G.BossRules.get('captaincapture'), { type: 'pawn' }, false), 1);
});

test('CastlE walls block sliding pieces and pawns for both sides, and cannot be taken', () => {
  const b = G.BossRules.startBoard(G.BossRules.get('castle'));
  const wall = sq('c4');
  assert.strictEqual(b.grid[wall.row][wall.col].type, 'wall');
  // A white rook on c1 with the c-file open up to the wall on c4.
  b.grid[6][2] = null;
  b.grid[7][0] = null;
  b.grid[7][2] = { type: 'rook', color: 'white' };
  const rookTargets = G.GameRules.getLegalMoves(b, 'white')
    .filter(m => m.from.row === 7 && m.from.col === 2).map(m => 'abcdefgh'[m.to.col] + (8 - m.to.row));
  assert.ok(rookTargets.includes('c3'));
  assert.ok(!rookTargets.includes('c4'), 'rook cannot land on the wall');
  assert.ok(!rookTargets.includes('c5') && !rookTargets.includes('c6'), 'rook cannot slide through the wall');
});

test('walls: pawns cannot push into them, knights cannot land on them', () => {
  const b = G.BossRules.startBoard(G.BossRules.get('castle'));
  b.grid[6][5] = null;                              // f2 pawn gone
  b.grid[5][5] = { type: 'pawn', color: 'white' };   // pawn on f3, wall on f4
  const moves = G.GameRules.getLegalMoves(b, 'white');
  assert.ok(!moves.some(m => m.from.row === 5 && m.from.col === 5), 'f3 pawn is blocked by the wall');
  // A knight on d3 reaches its free squares but never the walls on c5 and f4.
  b.grid[5][3] = { type: 'knight', color: 'white' };
  const k = G.GameRules.getLegalMoves(b, 'white').filter(m => m.from.row === 5 && m.from.col === 3)
    .map(m => 'abcdefgh'[m.to.col] + (8 - m.to.row)).sort();
  assert.deepStrictEqual(Array.from(k), ['b4', 'e5', 'f2']);   // not c5 or f4: walls
});

test('walls are left out of the FEN given to Stockfish and do not affect draws', () => {
  const b = G.BossRules.startBoard(G.BossRules.get('castle'));
  assert.strictEqual(G.FEN.fromBoard(b, 'white'), 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const bare = G.FEN.toBoard('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
  bare.grid[4][2] = { type: 'wall', color: 'none' };
  assert.strictEqual(G.GameRules.isDraw(bare), true);
});

test('mystery piece: one hidden target, every other piece a suspect, never the king', () => {
  for (let seed = 0; seed < 20; seed++) {
    const b = new G.Board();
    const target = G.BossRules.hideMystery(b, 'black', () => seed / 20);
    assert.notStrictEqual(target.type, 'king');
    const suspects = G.BossRules.suspects(b, 'black');
    assert.strictEqual(suspects.length, 15);
    assert.strictEqual(suspects.filter(s => s.piece.mystery).length, 1);
  }
});

test('mystery hints always keep the target and narrow it down to one', () => {
  for (let seed = 1; seed < 30; seed++) {
    let x = seed;
    const random = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
    const b = new G.Board();
    G.BossRules.hideMystery(b, 'black', random);
    let hints = 0;
    while (G.BossRules.suspects(b, 'black').length > 1) {
      const before = G.BossRules.suspects(b, 'black').length;
      const hint = G.BossRules.mysteryHint(b, 'black', random);
      assert.ok(hint && hint.cleared.length >= 1, 'a hint clears at least one suspect');
      if (before - 1 > 2) assert.ok(hint.cleared.length < before - 1, 'never clears every other suspect at once');
      for (const s of hint.cleared) {
        assert.ok(!b.grid[s.row][s.col].mystery, 'the target is never cleared');
        b.grid[s.row][s.col].suspect = false;
      }
      hints++;
    }
    assert.ok(G.BossRules.suspects(b, 'black')[0].piece.mystery);
    assert.ok(hints <= 8, `took ${hints} hints`);
  }
});

test('a promoted pawn keeps its mystery tag; armyLeft counts non-king pieces', () => {
  const b = G.FEN.toBoard('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  b.grid[1][0].mystery = true;
  G.MoveExecutor.executeMove(b, { from: { row: 1, col: 0 }, to: { row: 0, col: 0 }, promotion: 'queen' }, 'white');
  assert.strictEqual(b.grid[0][0].type, 'queen');
  assert.ok(b.grid[0][0].mystery);
  assert.strictEqual(G.BossRules.armyLeft(b, 'white'), 1);
  assert.strictEqual(G.BossRules.armyLeft(b, 'black'), 0);
});
