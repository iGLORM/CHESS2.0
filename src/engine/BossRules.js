// Story-mode Boss Rules: the twist each boss plays with. A rule can change the
// starting position, how often captures start a challenge, and which minigames
// show up most. GameScreen asks this file; the rules themselves stay data.
const BOSS_RULES = {
  pawnie: {
    title: 'A Normal Match',
    lines: ['Plain chess. Any capture has a 30% chance to start a challenge.'],
    signature: ['MeteorStorm'],
  },
  // Training Camp tests (see characters/trainers.js).
  sergeantsquare: {
    title: 'Mate in One',
    lines: [
      'Three positions. In each one, find the move that checkmates right away.',
      'Miss it and the position resets. No challenges in this drill.',
    ],
    noChallenges: true,
    puzzles: [
      '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
      'k7/7Q/1K6/8/8/8/8/8 w - - 0 1',
      '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
    ],
  },
  captaincapture: {
    title: 'Every Capture Counts',
    lines: [
      'Every capture starts a challenge, for both of you.',
      'Make 3 captures to pass. A capture only counts if you win its challenge.',
    ],
    everyCapture: true,
    goal: { captures: 3 },
  },
  joystick: {
    title: 'Five Challenges',
    lines: [
      'No board this time: five challenges in a row.',
      'Win 3 of them to pass.',
    ],
    minigameTrial: { games: 5, need: 3 },
  },
  rulekeeper: {
    title: 'Mist in the Middle',
    lines: [
      'Ranks 5 and 6 are covered in mist. You only see squares there that your pieces attack.',
      'Make 2 captures to pass.',
    ],
    fog: true,
    fogRows: [2, 3],
    goal: { captures: 2 },
  },
  senseitactic: {
    title: 'The Final Exam',
    lines: [
      'A full game against a real opponent. Captures can start challenges, just like out there.',
      'Win it to finish your training.',
    ],
  },
  bishbosh: {
    title: 'Four Bishops',
    lines: ['Bish-Bosh swapped both knights for bishops: four bishops, no knights.'],
    twisted: true,
    fen: 'rbbqkbbr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    signature: ['LavaTilt'],
  },
  rokee: {
    title: 'The Iron Tower',
    lines: [
      'You start without your rooks, so you cannot castle.',
      'Taking one of his rooks ALWAYS starts a challenge.',
    ],
    twisted: true,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBN1 w kq - 0 1',
    alwaysChallengeWhenTaking: ['rook'],
    signature: ['RookStack', 'SiegeCannon'],
  },
  knightsade: {
    title: 'The Mist',
    lines: [
      'Mist covers the board. You only see squares your pieces stand on, attack, or could advance to.',
      'Watch for glowing eyes: his knights give themselves away now and then.',
    ],
    twisted: true,
    fog: true,
    signature: ['KnightCollapse'],
  },
  queenie: {
    title: 'The Royal Court',
    lines: [
      'Queenie has two queens in the corners and a rook beside her king.',
      'In return, her captures start a challenge 60% of the time.',
    ],
    twisted: true,
    fen: 'qnbrkbnq/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1',
    bossChallengeChance: 0.6,
    signature: ['TimingStrike'],
  },
  castle: {
    title: 'The Fortress',
    lines: [
      'Four gear walls stand on c4, f4, c5 and f5. Nothing can stop on them or slide through them; only knights can jump over.',
      'Lose a challenge and that square stays locked for 3 turns, not 1.',
    ],
    twisted: true,
    walls: [{ row: 4, col: 2 }, { row: 4, col: 5 }, { row: 3, col: 2 }, { row: 3, col: 5 }],
    lockPlies: 4,
    signature: ['ShieldBlock'],
  },
  endgamer: {
    title: 'Straight to the Endgame',
    lines: [
      'The game starts in an endgame. Material is equal, but his position is better.',
      'A different endgame every time you face him.',
    ],
    twisted: true,
    endgames: true,
    signature: ['TargetPractice'],
  },
  forkmaster: {
    title: 'Double Take',
    lines: [
      'If one of his pieces attacks two of your queen, rooks, bishops or knights, and he takes one, he takes BOTH.',
      'Break his forks before he fires. A fork on your king is normal chess.',
    ],
    twisted: true,
    doubleTake: true,
    signature: ['ReactionTest'],
  },
  checkmate: {
    title: 'The Clock',
    lines: [
      'The hourglass is turned. Checkmate him within 40 of your moves.',
      'If the sand runs out, you lose.',
    ],
    twisted: true,
    moveLimit: 40,
    signature: ['CheckmateRun'],
  },
  grandmasterx: {
    title: 'The Absolute',
    lines: [
      'Every capture starts a challenge, and he plays them at full strength, choosing the ones you lose most.',
      'Checkmate him and time rewinds: he gains a bishop or knight. Crack his crystal three times to win.',
    ],
    twisted: true,
    everyCapture: true,
    maxBotSkill: true,
    weakestGames: true,
    rewinds: 2,
  },
};

// Endgame starts for EndGamer (White to move). Material is equal and Stockfish
// scores each one 0.35-1.35 pawns better for Black, with no quick tactic for White.
const ENDGAMES = [
    // king and pawns
    '8/pppp4/5k2/8/3P4/1KP5/PP6/8',
    '4k3/ppppp3/7p/8/8/P1P4P/1P1PP3/2K5',
    '8/p2p3p/2p5/2k5/8/8/PP2P1KP/8',
    '8/2p1pp2/3p2p1/1k5p/8/3P4/1KP1PPPP/8',
    // rook
    '8/2kpp2p/1p6/p4r2/P2P4/8/1P1RP2P/K7',
    '8/p2r2pp/1p3p2/6k1/2P2R2/P2P3K/5PP1/8',
    '8/3p2p1/7p/kp3p2/1r5P/8/1P1P1PP1/3K2R1',
    '8/p4p2/kr1p4/2p5/8/P2P4/2P2P1K/2R5',
    // your knight vs his bishop
    '8/1kpp3p/1b6/8/8/8/1P1P3P/K5N1',
    '8/2ppp1p1/1b3k2/p7/2PN4/8/PP2P1PK/8',
    '7b/1p2p2p/8/1k6/8/8/1P1PN2P/3K4',
    '8/5p1p/p1p3b1/5k2/8/8/P1P2PKP/6N1',
    // your bishop vs his knight
    '8/p2pp2p/1p4k1/2p3n1/8/8/PPPPP2P/5B1K',
    '8/2p4n/8/1p2pk1p/1B6/2P4P/1P2P3/2K5',
    '8/1p3pp1/3pk3/p7/2nP4/6K1/PP3PP1/1B6',
    '8/p1p2p1p/3n2p1/k7/8/8/P1P1KPPP/7B',
    // knights
    '1k6/p5pp/3pn3/5p2/P4P1P/8/2NP2P1/2K5',
    '5n2/1pp2p1p/3p4/3pk3/2P5/1P4P1/K2PP2P/5N2',
    '8/3pp3/4k3/1p6/2n5/7N/1P1PPK2/8',
    '8/3p4/1p4p1/p1p3k1/1n6/1N1P1K2/PPP3P1/8',
    // bishops
    '7b/p7/1pkp4/8/P4B2/8/1P1P4/6K1',
    '6b1/3pppp1/p1k5/8/P7/4P3/1KP2PP1/3B4',
    '8/1p1p2pp/pp5b/5k2/2P5/8/PP1P1PPB/6K1',
    '2b5/1ppp3p/8/p3k3/P7/1PP5/1K1P3P/7B',
    // queen
    '5k2/p3pp1p/1p1p4/q7/4P3/1P5P/P2P1P1Q/6K1',
    '8/p1k1pppp/2q5/8/8/4P3/P4PPP/1K5Q',
    '3k4/p2p3p/8/3q2p1/8/3PQ3/P2K2PP/8',
    // two rooks
    '1k4r1/1r1pp3/2p4p/8/4P2P/3P3R/2P2R2/K7',
    '8/1p1p2pp/p4k2/6r1/3P2r1/3R4/PP4PP/R2K4',
    '1k1r4/ppp5/2r4p/6p1/6R1/6R1/PPP3PP/5K2',
    '8/1p3k1p/5p2/5pr1/r7/3R4/1P3PPP/2K4R',
    // rook + minor piece
    '4b3/1pp2p2/5kr1/8/N7/1PP5/6P1/K6R',
    'k7/pp4pp/4b3/2p1p2r/1RP5/8/PPK1P1PP/6N1',
    '8/4kpp1/p6r/6p1/3b4/2R2PK1/P5PP/1N6',
    '8/4p2p/1p4bk/7r/8/2N5/KP2P2P/4R3',
    '7n/2kpp2p/2p5/p7/2r5/8/P1PPKPBP/1R6',
    '3k4/1p1p2pp/2r1n3/5p2/8/5K2/2P1PPPP/1RB5',
    '4k3/2rppp2/2pp2n1/1p6/4P3/7K/PPPP1PB1/2R5',
    '8/1p6/pk4p1/8/1P1n1r2/5B2/P3R1P1/4K3',
];

const BossRules = {
  DEFAULT_CHANCE: 0.3,
  RECENT_KEY: 'chess2_recent_endgames',
  RECENT_LIMIT: 20,
  ENDGAMES,

  get(characterId) {
    return BOSS_RULES[characterId] || null;
  },

  // Twisted fights play the AI one level weaker to make up for the twist.
  aiLevel(rule, level) {
    return rule && rule.twisted ? Math.max(0, level - 1) : level;
  },

  // The board a fight starts from. `random` and `recent` are injectable for tests.
  startBoard(rule, random = Math.random, recent = null) {
    if (!rule) return new Board();
    if (rule.endgames) return FEN.toBoard(this.pickEndgame(random, recent));
    if (rule.puzzles) return FEN.toBoard(rule.puzzles[0]);
    const board = rule.fen ? FEN.toBoard(rule.fen) : new Board();
    for (const w of rule.walls || []) board.grid[w.row][w.col] = { type: 'wall', color: 'none' };
    if (rule.walls) board.resetHistory();
    return board;
  },

  // Picks an endgame (or its left-right mirror) not played recently.
  pickEndgame(random = Math.random, recent = null) {
    const history = recent || this._loadRecent();
    const all = [];
    for (const placement of ENDGAMES) {
      all.push(placement, this.mirrorPlacement(placement));
    }
    const fresh = all.filter(p => !history.includes(p));
    const pool = fresh.length ? fresh : all;
    const placement = pool[Math.floor(random() * pool.length)];
    if (!recent) this._saveRecent([placement, ...history].slice(0, this.RECENT_LIMIT));
    return placement + ' w - - 0 1';
  },

  mirrorPlacement(placement) {
    return placement.split('/').map(rank => {
      let expanded = '';
      for (const ch of rank) expanded += /\d/.test(ch) ? '.'.repeat(Number(ch)) : ch;
      const flipped = expanded.split('').reverse().join('');
      return flipped.replace(/\.+/g, dots => String(dots.length));
    }).join('/');
  },

  // Chance that a capture starts a challenge under this rule.
  challengeChance(rule, captured, bossIsAttacker) {
    if (!rule) return this.DEFAULT_CHANCE;
    if (rule.noChallenges) return 0;
    if (rule.everyCapture) return 1;
    if (!bossIsAttacker && rule.alwaysChallengeWhenTaking &&
        rule.alwaysChallengeWhenTaking.includes(captured.type)) return 1;
    if (bossIsAttacker && rule.bossChallengeChance !== undefined) return rule.bossChallengeChance;
    return this.DEFAULT_CHANCE;
  },

  isWall(rule, row, col) {
    return !!(rule && rule.walls && rule.walls.some(w => w.row === row && w.col === col));
  },

  // Fog of war: squares `color` can see (its own pieces, every square they
  // attack, and the squares its pawns could advance to). Returns 8x8 booleans.
  visibleSquares(board, color) {
    const seen = Array.from({ length: 8 }, () => Array(8).fill(false));
    const dir = color === 'white' ? -1 : 1;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board.grid[r][c];
        if (p && p.color === color) {
          seen[r][c] = true;
          if (p.type === 'pawn') {
            const r1 = r + dir;
            if (r1 >= 0 && r1 < 8) {
              seen[r1][c] = true;
              const home = color === 'white' ? 6 : 1;
              if (r === home && !board.grid[r1][c]) seen[r + dir * 2][c] = true;
            }
          }
        }
        if (MoveGen.isSquareAttacked(board, r, c, color)) seen[r][c] = true;
      }
    }
    return seen;
  },

  // Does the piece on (fromRow, fromCol) attack (toRow, toCol)?
  attacks(board, fromRow, fromCol, toRow, toCol) {
    const piece = board.grid[fromRow][fromCol];
    if (!piece) return false;
    if (piece.type === 'pawn') {
      const dir = piece.color === 'white' ? -1 : 1;
      return toRow === fromRow + dir && Math.abs(toCol - fromCol) === 1;
    }
    return MoveGen.canPieceAttack(board, piece, fromRow, fromCol, toRow, toCol);
  },

  FORK_TARGETS: ['queen', 'rook', 'bishop', 'knight'],

  // ForkMaster's double take: when the capturing piece also attacks another of
  // the victim's queen/rooks/bishops/knights, that piece goes too. Returns
  // { row, col, piece } or null. Skipped if removing it would leave the
  // capturer's own king in check (an opened line).
  doubleTakeVictim(board, move) {
    const attacker = board.grid[move.from.row][move.from.col];
    const captured = board.grid[move.to.row][move.to.col];
    if (!attacker || !captured || !this.FORK_TARGETS.includes(captured.type)) return null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (r === move.to.row && c === move.to.col) continue;
        const p = board.grid[r][c];
        if (!p || p.color !== captured.color || !this.FORK_TARGETS.includes(p.type)) continue;
        if (!this.attacks(board, move.from.row, move.from.col, r, c)) continue;
        const after = board.clone();
        after.grid[r][c] = null;
        MoveExecutor.executeMoveRaw(after, move);
        const king = after.findKing(attacker.color);
        if (king && MoveGen.isSquareAttacked(after, king.row, king.col, captured.color)) continue;
        return { row: r, col: c, piece: { ...p } };
      }
    }
    return null;
  },

  // Grandmaster X's rewind gift: a random bishop or knight on a free square next
  // to his king (or one ring further out) that does not attack the enemy king.
  rewindPiece(board, color, random = Math.random) {
    const king = board.findKing(color);
    if (!king) return null;
    const enemy = color === 'white' ? 'black' : 'white';
    const enemyKing = board.findKing(enemy);
    const types = random() < 0.5 ? ['bishop', 'knight'] : ['knight', 'bishop'];
    for (const ring of [1, 2]) {
      for (const type of types) {
        const spots = [];
        for (let dr = -ring; dr <= ring; dr++) {
          for (let dc = -ring; dc <= ring; dc++) {
            if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
            const r = king.row + dr, c = king.col + dc;
            if (r < 0 || r > 7 || c < 0 || c > 7 || board.grid[r][c]) continue;
            board.grid[r][c] = { type, color };
            const checks = enemyKing && MoveGen.canPieceAttack(board, board.grid[r][c], r, c, enemyKing.row, enemyKing.col);
            board.grid[r][c] = null;
            if (!checks) spots.push({ row: r, col: c });
          }
        }
        if (spots.length) return { ...spots[Math.floor(random() * spots.length)], type };
      }
    }
    return null;
  },

  // The minigames the player loses most (at least one loss), worst first.
  weakestGames(byType, limit = 4) {
    return Object.entries(byType || {})
      .map(([name, s]) => ({ name, lost: (s.played || 0) - (s.won || 0), rate: s.played ? 1 - (s.won || 0) / s.played : 0 }))
      .filter(g => g.lost > 0)
      .sort((a, b) => b.rate - a.rate || b.lost - a.lost)
      .slice(0, limit)
      .map(g => g.name);
  },

  _loadRecent() {
    try { return JSON.parse(localStorage.getItem(this.RECENT_KEY)) || []; } catch (e) { return []; }
  },

  _saveRecent(list) {
    try { localStorage.setItem(this.RECENT_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable */ }
  },
};
