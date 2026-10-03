// Missions: seven short challenges on the path to each guardian, played in
// order on the world's own map (WorldMissionsScreen). Not every world has them:
// the Royal Palace and Forked Gulch hold tournaments instead (tournaments.js), and
// the Grand Library's path is a hall of puzzle rooms. Each mission is fought
// against one of the guardian's minions and has a rule like a boss (see
// BossRules), registered in BOSS_RULES under the mission id.
//
//   kind   puzzle | trial | hunt | taster | wild | relic | memory  (the map icon)
//   rule   BossRules fields; missions also use goal.mystery (capture the
//          hidden Mystery Piece; hints narrow it down), goal.captureAll (take
//          every piece but the king), goal.promote (crown a pawn),
//          goal.survive (don't lose for N of your moves), goal.relics
//          (squares to step on: Relic Run), goal.crossing (walk your king to
//          the last rank: a Memory of the night you crossed the board) and
//          minigameTrial.pool (which challenges the trial draws from).
//          Checkmate always wins a board mission too.
//
// Puzzle positions were found with the engine (a single mating move each);
// tests/missions.test.js checks every position.
const MISSION_KINDS = {
  puzzle: { label: 'Puzzle', icon: '?' },
  trial: { label: 'Challenges', icon: '★' },
  hunt: { label: 'Hunt', icon: '⚔' },
  taster: { label: 'Rule Taster', icon: '!' },
  wild: { label: 'Wild Card', icon: '♙' },
  relic: { label: 'Relic Run', icon: '◆' },
  memory: { label: 'Memory', icon: '☾' },
};

const MISSIONS = {
  slantedsands: [
    {
      kind: 'puzzle', name: 'Sunstroke Mates',
      minion: { name: 'Mirage', title: 'Heat Shimmer', piece: 'bishop' },
      greet: 'Three positions, three diagonals. One move mates in each. Or is it a mirage?',
      after: 'You saw straight through me. Well, diagonally.',
      fail: 'Not mate! The sand plays tricks on the eyes. Again.',
      rule: {
        title: 'Mate in One', lines: ['Three positions. In each one a bishop can checkmate in a single move. Find it.'],
        puzzles: ['1r1k4/2pP4/7B/p1n5/B7/3P4/4K3/6R1 w - - 0 1', 'k5r1/B6n/5p2/R7/B7/2P5/1P5K/8 w - - 0 1', '2R1B2k/5rp1/6B1/4pn1P/8/P7/8/5K2 w - - 0 1'],
      },
    },
    {
      kind: 'hunt', name: 'Scarab Swarm',
      minion: { name: 'The Scarabs', title: 'Dune Diggers', piece: 'pawn' },
      greet: '*clicking* ... One of us carries the Sun Scarab. Which one? *click* Dig and find out.',
      after: '*retreating clicks* ... You found the Scarab. The swarm scatters.',
      fail: '*triumphant clicking*',
      rule: {
        title: 'The Sun Scarab', lines: ['Four bishops behind a wall of pawns. One of their pieces carries the Sun Scarab.', 'Hints narrow it down every 4 moves. Capture it, or checkmate, to win.'],
        fen: 'b1b1kb1b/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1', goal: { mystery: true, hintEvery: 4 },
      },
    },
    {
      kind: 'trial', name: 'Dune Dash',
      minion: { name: 'Sand Sprite', title: 'Wind on the Dunes', piece: 'knight' },
      greet: 'No board here, only sand in your eyes. Three challenges. Win all three!',
      after: 'Fast feet! The dunes let you pass.',
      fail: 'Swallowed by the sand! Shake it off and try again.',
      rule: {
        title: 'Three Challenges', lines: ['Three desert challenges in a row. Win all three.'],
        minigameTrial: { games: 3, need: 3, pool: ['LavaTilt', 'DodgeFalling', 'MeteorStorm'] },
      },
    },
    {
      kind: 'taster', name: 'Diagonal Duel',
      minion: { name: 'Bishling', title: "Bish-Bosh's Apprentice", piece: 'bishop' },
      greet: 'Master says only bishops matter. So only bishops play! Ha!',
      after: 'I leaned the wrong way... Master will be furious.',
      fail: 'Diagonals forever! Tell Master I won!',
      rule: {
        title: 'Only Bishops', lines: ['Both sides have just bishops, pawns and a king.', 'Checkmate him to win.'],
        fen: 'bb2k1bb/pppppppp/8/8/8/8/PPPPPPPP/BB2K1BB w - - 0 1',
      },
    },
    {
      kind: 'wild', name: 'Pawn Race',
      minion: { name: 'Dust Devil', title: 'Racer of the Sands', piece: 'pawn' },
      greet: 'Four pawns each, a whole desert between us. First one to crown wins!',
      after: 'You crowned first! Whoa, you really do know the way to the far edge.',
      fail: 'Crowned! The race is mine. Line up again?',
      rule: {
        title: 'Crown a Pawn', lines: ['A pawn race: get one of your pawns to the last rank to win.', 'Stopping his pawns helps too.'],
        fen: 'k7/pppp4/8/8/8/8/4PPPP/7K w - - 0 1', goal: { promote: true }, noChallenges: true,
      },
    },
    {
      kind: 'relic', name: 'Buried Sunstones',
      minion: { name: 'Sidewinder', title: 'Snake of the Dunes', piece: 'bishop' },
      greet: 'Sssunstones, buried in my sand. Four of them. Dig them up before the sun sets, if you can.',
      after: 'You dug them all up. The dunes feel lighter.',
      fail: 'The sand covers everything again. Ssso sorry.',
      rule: {
        title: 'Relic Run', lines: ['Four sunstones lie on the board. Move a piece onto each one to dig it up.', 'Find all four within 17 moves (or checkmate) to win.'],
        fen: 'b3k2b/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1', goal: { relics: ['c4', 'f5', 'b5', 'g4'] }, moveLimit: 17,
      },
    },
    {
      kind: 'memory', name: 'The First Crossing',
      minion: { name: 'A Memory', title: 'The Night of the Crossing', piece: 'bishop' },
      greet: '*the dunes blur* ... You remember this. Night. The sky still whole. Your king walking toward the far edge.',
      after: 'A memory: the sand was warm under you, and someone far ahead was waiting at the edge.',
      fail: '*the memory fades* ... Not yet. Close your eyes and try again.',
      rule: {
        title: 'Walk the Crossing', lines: ['A memory of the night you crossed. Two bishops try to stop you.', 'Walk your king to the far edge (the 8th rank) within 18 moves.'],
        fen: '7k/2b5/8/8/5b2/8/PPP5/1K4N1 w - - 0 1', goal: { crossing: true }, moveLimit: 18, noChallenges: true,
      },
    },
  ],

  ironkeep: [
    {
      kind: 'trial', name: 'Forge Runner',
      minion: { name: 'Anvil', title: 'Keeper of the Forge', piece: 'rook' },
      greet: 'The forge tests everyone who comes to the gate. Three trials. Win all three.',
      after: 'Tempered steel. The forge approves.',
      fail: 'Cracked in the heat. Cool down and try again.',
      rule: {
        title: 'Three Challenges', lines: ['Three forge challenges in a row. Win all three.'],
        minigameTrial: { games: 3, need: 3, pool: ['RookStack', 'SiegeCannon', 'ShieldBlock'] },
      },
    },
    {
      kind: 'puzzle', name: 'Battering Ram',
      minion: { name: 'Portcullis', title: 'Gate Warden', piece: 'rook' },
      greet: 'Straight lines only. Find the rook move that ends it.',
      after: 'The gate lifts for you.',
      fail: 'The ram bounced off. That was not mate.',
      rule: {
        title: 'Mate in One', lines: ['Three positions. In each one a rook can checkmate in a single move.'],
        puzzles: ['k1N3n1/pRb5/5r2/2P5/8/R1P5/1K6/8 w - - 0 1', '1k6/ppp5/1R2R3/b5rn/1P6/P7/8/N3K3 w - - 0 1', '3k1b2/3pp3/1r6/nPR2R2/2P5/3K4/8/5N2 w - - 0 1'],
      },
    },
    {
      kind: 'hunt', name: 'Iron Sentries',
      minion: { name: 'Sentry Towers', title: 'Four Rooks Strong', piece: 'rook' },
      greet: 'One of us holds the key to the keep. Guess wrong and the wall stays shut.',
      after: 'You found the key. The wall has a hole in it now.',
      fail: 'The wall holds. It always holds.',
      rule: {
        title: 'The Gate Key', lines: ['Four rooks and a wall of pawns. One of their pieces holds the gate key.', 'Hints narrow it down every 4 moves. Capture it, or checkmate, to win.'],
        fen: 'rr2k1rr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1', goal: { mystery: true, hintEvery: 4 },
      },
    },
    {
      kind: 'taster', name: 'Without Towers',
      minion: { name: 'Rivet', title: "Rook-E's Squire", piece: 'rook' },
      greet: 'Rook-E wants to see how you do without rooks. Badly, I bet.',
      after: 'You did fine without them. Rook-E will not like that.',
      fail: 'See? Nobody wins without towers.',
      rule: {
        title: 'No Rooks for You', lines: ['You start without rooks. Taking one of his rooks always starts a challenge.', 'Checkmate him to win.'],
        fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBN1 w kq - 0 1', alwaysChallengeWhenTaking: ['rook'],
      },
    },
    {
      kind: 'wild', name: 'Hold the Gate',
      minion: { name: 'Siege Captain', title: 'Breaker of Keeps', piece: 'queen' },
      greet: 'One rook against my whole siege. Hold out for twelve moves and I will call it off.',
      after: 'Twelve moves and you are still standing. Siege lifted.',
      fail: 'The gate falls. Every gate falls.',
      rule: {
        title: 'Survive 12 Moves', lines: ['You have a king, a rook and pawns. He has everything else.', "Don't get checkmated for 15 of your moves."],
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/4K2R w K - 0 1', goal: { survive: 15 },
      },
    },
    {
      kind: 'relic', name: 'Forge Ingots',
      minion: { name: 'Bellows', title: 'Breath of the Forge', piece: 'rook' },
      greet: 'Four hot ingots, dropped all over the courtyard. Carry them off before they cool. Or before I catch you.',
      after: 'Every ingot, still glowing. You have a smith\'s hands.',
      fail: 'Cooled and cracked. Back to the furnace.',
      rule: {
        title: 'Relic Run', lines: ['Four ingots lie on the board. Move a piece onto each one to pick it up.', 'Find all four within 19 moves (or checkmate) to win.'],
        fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', goal: { relics: ['a5', 'h5', 'd6', 'e3'] }, moveLimit: 19,
      },
    },
    {
      kind: 'memory', name: 'The Open Gate',
      minion: { name: 'A Memory', title: 'The Night of the Crossing', piece: 'rook' },
      greet: '*iron creaks* ... The Keep\'s gate, open for you that night. Then a message came, and it began to close.',
      after: 'A memory: Rook-E lowering the bar for you... then raising it again when the message came.',
      fail: '*the gate slams* ... The memory shuts. Try again.',
      rule: {
        title: 'Walk the Crossing', lines: ['A memory of the Keep. A rook tries to cut your king off.', 'Walk your king to the far edge (the 8th rank) within 18 moves.'],
        fen: '4k3/8/8/r7/8/8/5PPP/4K2R w K - 0 1', goal: { crossing: true }, moveLimit: 18, noChallenges: true,
      },
    },
  ],

  mistymoors: [
    {
      kind: 'taster', name: 'Fogbank',
      minion: { name: 'Wisp', title: 'Light in the Mist', piece: 'pawn' },
      greet: '*flickers* ... One of my lights is the real me. Find it in the fog. If you can.',
      after: '*fades* ... You found me. You see better than most.',
      fail: '*giggles from nowhere*',
      rule: {
        title: 'The Real Wisp', lines: ['Fog covers the board: you only see squares your pieces touch or attack.', 'One of his pieces is the real Wisp. Hints every 4 moves. Capture it, or checkmate, to win.'],
        fog: true, goal: { mystery: true, hintEvery: 4 },
      },
    },
    {
      kind: 'puzzle', name: 'Knight Riddles',
      minion: { name: 'Crow', title: 'Watcher on the Tower', piece: 'knight' },
      greet: 'Caw! Knights jump where eyes cannot follow. Find the mating leap.',
      after: 'Caw! Sharp eyes.',
      fail: 'Caw caw! Wrong jump.',
      rule: {
        title: 'Mate in One', lines: ['Three positions. In each one a knight can checkmate in a single move.'],
        puzzles: ['3R1N1k/5rpp/2P1b3/4p3/8/8/3N1P2/2K5 w - - 0 1', 'kNR5/pp1N4/2r2Pp1/b7/8/3P4/7K/8 w - - 0 1', 'k4r2/p7/1R2b3/3N2p1/6N1/1P1K4/4P3/8 w - - 0 1'],
      },
    },
    {
      kind: 'trial', name: "Will-o'-Wisps",
      minion: { name: 'Bog Lantern', title: 'Lure of the Marsh', piece: 'bishop' },
      greet: 'The lights dance. Keep up with them, or sink.',
      after: 'You kept your footing. Rare, out here.',
      fail: 'Glub. Try again, before the bog gets comfortable.',
      rule: {
        title: 'Three Challenges', lines: ['Three challenges in the marsh. Win all three.'],
        minigameTrial: { games: 3, need: 3, pool: ['KnightCollapse', 'MemoryMatch', 'PatternPress'] },
      },
    },
    {
      kind: 'hunt', name: 'Ghost Riders',
      minion: { name: 'Phantom Riders', title: 'Knights of the Fog', piece: 'knight' },
      greet: 'Four knights ride the moor tonight. Checkmate us before the fog lifts.',
      after: 'The riders fall. The fog thins a little.',
      fail: 'The fog lifts, and you are gone.',
      rule: {
        title: 'Mate in 30', lines: ['The riders have four knights and no queen.', 'Checkmate them within 26 of your moves.'],
        fen: 'nn2k1nn/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1', moveLimit: 26,
      },
    },
    {
      kind: 'wild', name: 'Lost in the Mist',
      minion: { name: 'Barrow Wight', title: 'Cold Hands', piece: 'king' },
      greet: 'Lost? Good. Nobody finds the way out of my fog. Last ten moves, if you can.',
      after: 'You... found your way. How?',
      fail: 'Another one for the barrow.',
      rule: {
        title: 'Survive 10 Moves in Fog', lines: ['Fog covers the board and he has a stronger army.', "Don't get checkmated for 13 of your moves."],
        fog: true, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R2QK2R w KQ - 0 1', goal: { survive: 13 },
      },
    },
    {
      kind: 'relic', name: 'Wisp Lanterns',
      minion: { name: 'Glimmer', title: 'A Wisp Gone Astray', piece: 'knight' },
      greet: 'Four lanterns, lost in the fog. Light them all and the Moors will show you the way.',
      after: 'Four lanterns, lit. The mist is thinner already.',
      fail: 'Out go the lights. Out, out, out.',
      rule: {
        title: 'Relic Run', lines: ['Fog covers the board. Four lanterns glow in it: move a piece onto each.', 'Light all four within 21 moves (or checkmate) to win.'],
        fog: true, goal: { relics: ['b5', 'g5', 'd6', 'e6'] }, moveLimit: 21,
      },
    },
    {
      kind: 'memory', name: 'A Light in the Fog',
      minion: { name: 'A Memory', title: 'The Night of the Crossing', piece: 'knight' },
      greet: '*the fog thickens* ... You walked these moors in the dark, with only a lantern and a voice: yours.',
      after: 'A memory: a lantern in the fog, and your own voice saying: just a few more ranks.',
      fail: '*the lantern gutters out* ... Lost in the mist. Try again.',
      rule: {
        title: 'Walk the Crossing', lines: ['A memory in the mist: you only see what your pieces see. Knights hunt you.', 'Walk your king to the far edge (the 8th rank) within 20 moves.'],
        fog: true, fen: '4k3/8/2n5/8/8/5n2/PPP5/2KR4 w - - 0 1', goal: { crossing: true }, moveLimit: 20, noChallenges: true,
      },
    },
  ],

  clockworkcitadel: [
    {
      kind: 'taster', name: 'Gear Maze',
      minion: { name: 'Cog', title: 'Wall Winder', piece: 'pawn' },
      greet: '*tick* Walls in the middle. *tock* And one of my pieces holds my winding key. *tick* Find it.',
      after: '*tick... tock...* You took my key. Unwound.',
      fail: '*tick tock tick tock* Wound up and won!',
      rule: {
        title: 'The Winding Key', lines: ['Four gear walls stand in the centre: nothing stops on them or slides through; knights jump over.', 'One of his pieces holds the winding key. Capture it, or checkmate, to win.'],
        walls: [{ row: 4, col: 2 }, { row: 4, col: 5 }, { row: 3, col: 2 }, { row: 3, col: 5 }], goal: { mystery: true, hintEvery: 4 },
      },
    },
    {
      kind: 'puzzle', name: 'Tower Clock',
      minion: { name: 'Chime', title: 'Bell of the Hour', piece: 'rook' },
      greet: 'DONG. Three positions. DONG. One mating move each.',
      after: 'DONG DONG DONG! Right on time.',
      fail: 'Clunk. Wrong hour.',
      rule: {
        title: 'Mate in One', lines: ['Three positions. In each one a rook can checkmate in a single move.'],
        puzzles: ['q4k2/4pp2/5BP1/R1n2r1p/2P5/8/5Q2/1K6 w - - 0 1', '4q2k/2P1r2p/n4R2/5p2/8/K2Q2P1/1B6/8 w - - 0 1', '2kn4/1ppp2r1/3Q1p2/R4P1q/8/5B1P/8/3K4 w - - 0 1'],
      },
    },
    {
      kind: 'trial', name: 'Wind the Spring',
      minion: { name: 'Mainspring', title: 'Heart of the Clock', piece: 'queen' },
      greet: 'Wind me up. Carefully. Three turns, and all three must be perfect.',
      after: 'Perfectly wound. The Citadel ticks on.',
      fail: 'SPROING. Overwound. Again.',
      rule: {
        title: 'Three Challenges', lines: ['Three clockwork challenges. Win all three.'],
        minigameTrial: { games: 3, need: 3, pool: ['ShieldBlock', 'TimingStrike', 'PowerMeter'] },
      },
    },
    {
      kind: 'hunt', name: 'Clockwork Rush',
      minion: { name: 'Tin Soldiers', title: 'Wound for Battle', piece: 'pawn' },
      greet: 'Ten tin soldiers march for twenty-five moves, then our springs run down. Catch every one of us before then.',
      after: 'All of us, unwound. Well played.',
      fail: 'Tick... tock... time is up.',
      rule: {
        title: 'Round Them Up', lines: ['Ten tin soldiers: two knights and eight pawns.', 'Capture all of them (or checkmate) within 21 of your moves.'],
        fen: '1n2k1n1/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1', goal: { captureAll: true }, moveLimit: 21,
      },
    },
    {
      kind: 'wild', name: 'Siege Engine',
      minion: { name: 'The Engine', title: 'Steam and Iron', piece: 'rook' },
      greet: 'The engine rolls. Lose a challenge and I jam that square for three turns. Survive twelve moves.',
      after: 'Steam spent. You outlasted the engine.',
      fail: 'Crushed under the wheels.',
      rule: {
        title: 'Survive 12 Moves', lines: ['He has an extra queen. Lose a challenge and that square locks for 3 turns.', "Don't get checkmated for 15 of your moves."],
        fen: 'rnbqkqnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', lockPlies: 4, goal: { survive: 15 },
      },
    },
    {
      kind: 'relic', name: 'Loose Cogs',
      minion: { name: 'Sprocket', title: 'The Spare Part', piece: 'pawn' },
      greet: 'Four cogs fell out of the great clock! Put your pieces on them before the Citadel winds down. Tick tock!',
      after: 'Click, click, click, click! The clock runs again.',
      fail: 'Wound down. Tick... tock... tick...',
      rule: {
        title: 'Relic Run', lines: ['Gear walls block the middle. Four cogs lie on the board: move a piece onto each.', 'A lost challenge locks its square for 3 turns. Find all four within 21 moves.'],
        walls: [{ row: 4, col: 2 }, { row: 4, col: 5 }, { row: 3, col: 2 }, { row: 3, col: 5 }], lockPlies: 4,
        goal: { relics: ['b5', 'g5', 'd6', 'e3'] }, moveLimit: 21,
      },
    },
    {
      kind: 'memory', name: 'The Stopped Clocks',
      minion: { name: 'A Memory', title: 'The Night of the Crossing', piece: 'rook' },
      greet: '*every clock stops* ... You remember the ticking. Thousands of clocks. And then, all at once, silence.',
      after: 'A memory: every clock in the Citadel stopped at the same second. The second the board broke.',
      fail: '*tick... tock...* The memory winds down. Try again.',
      rule: {
        title: 'Walk the Crossing', lines: ['A memory of the Citadel: gear walls block the middle and a rook guards the way.', 'Walk your king to the far edge (the 8th rank) within 18 moves.'],
        walls: [{ row: 4, col: 2 }, { row: 4, col: 5 }, { row: 3, col: 2 }, { row: 3, col: 5 }],
        fen: '1r2k3/8/8/8/8/8/PPP5/1K1R4 w - - 0 1', goal: { crossing: true }, moveLimit: 18, noChallenges: true,
      },
    },
  ],

  grandlibrary: [
    {
      kind: 'puzzle', name: 'Footnotes',
      minion: { name: 'Librarian', title: 'Shh!', piece: 'bishop' },
      greet: 'Shh. Three quiet mates, written in the margins. No captures. Find them.',
      after: 'Shh... very good.',
      fail: 'SHH! That was not mate.',
      rule: {
        title: 'Quiet Mates', lines: ['Three positions. In each one a bishop checkmates with a quiet move (no capture).'],
        puzzles: ['1B1rkn2/3pp3/1PPq4/1N1B1R2/8/8/4K3/8 w - - 0 1', '4kr1q/1B3p1P/1B1Pn3/1p6/8/3R4/K1N5/8 w - - 0 1', 'B6R/3k1p1r/B1ppp3/nq1N4/P7/3P4/5K2/8 w - - 0 1'],
      },
    },
    {
      kind: 'puzzle', name: 'The Back Rank Wing',
      minion: { name: 'The Archivist', title: "EndGamer's Assistant", piece: 'rook' },
      greet: 'The back-rank wing. Every book here ends on the last row. Three positions: a rook finishes each one.',
      after: 'Filed under "Back Rank". Correctly, for once.',
      fail: 'That is not how the chapter ends. Again.',
      rule: {
        title: 'Rook Mates', lines: ['Three positions. In each one a rook checkmates in one move. Find it.'],
        puzzles: ['5k2/4p2R/5p2/8/3R4/6R1/8/6K1 w - - 0 1', '3k4/2pp4/1B1N4/8/4R3/8/P7/3K4 w - - 0 1', '2k5/1p5R/3p4/7n/6r1/5R2/K7/8 w - - 0 1'],
      },
    },
    {
      kind: 'puzzle', name: "The Knight's Alcove",
      minion: { name: 'Inkwell', title: 'A Spilled Knight', piece: 'knight' },
      greet: 'In my alcove kings hide behind their own pieces. Too well. A knight jumps in and... you tell me.',
      after: 'Smothered! Every one of them. Delicious.',
      fail: 'The king breathes. Not a mate.',
      rule: {
        title: 'Smothered', lines: ['Three positions. In each one a knight checkmates a king boxed in by its own pieces.'],
        puzzles: ['kr6/pp6/8/3N4/8/5q2/PPP5/1K1R4 w - - 0 1', '6rk/1p4pp/8/4N3/1n6/8/5PPP/2R3K1 w - - 0 1', '6rk/p5pp/1p6/4N3/8/2q5/5PPP/3R2K1 w - - 0 1'],
      },
    },
    {
      kind: 'puzzle', name: "The Queen's Reading Room",
      minion: { name: 'Madam Folio', title: 'Keeper of the Reading Room', piece: 'queen' },
      greet: 'Silence in the reading room. My queen may go anywhere, which makes her very hard to aim. Three positions.',
      after: 'Beautifully read. You may borrow a book.',
      fail: 'That book is overdue. Try again.',
      rule: {
        title: 'Queen Mates', lines: ['Three positions. In each one the queen checkmates in a single move.'],
        puzzles: ['4qk2/1p2p3/2Q5/8/1R6/NB6/8/5K2 w - - 0 1', '7k/7p/6p1/8/8/5Q2/7K/4N3 w - - 0 1', 'k7/p7/8/QR6/2N2n2/8/8/3K4 w - - 0 1'],
      },
    },
    {
      kind: 'puzzle', name: 'The Closed Stacks',
      minion: { name: 'The Night Porter', title: 'Locks the Stacks at Dusk', piece: 'king' },
      greet: 'The closed stacks. Here every piece can give check, and only one check is mate. Choose carefully.',
      after: 'You chose well. I shall leave the door unlocked for you.',
      fail: 'Check is not mate. The stacks stay closed.',
      rule: {
        title: 'Many Checks, One Mate', lines: ['Three positions full of checks. Only one move in each is checkmate.'],
        puzzles: ['k7/p7/1p6/8/1p2R3/8/2KR4/7B w - - 0 1', '5k2/5pp1/4pB2/8/Q7/8/8/6NK w - - 0 1', '3k4/2ppp3/3P4/8/2Q5/8/4K3/8 w - - 0 1'],
      },
    },
    {
      kind: 'wild', name: 'Turn the Page',
      minion: { name: 'Bookend', title: 'Holder of the Last Page', piece: 'king' },
      greet: 'Two pawns and a king against me alone. Crown one and the chapter is yours.',
      after: 'A new chapter begins!',
      fail: 'The book closes.',
      rule: {
        title: 'Crown a Pawn', lines: ['King and two pawns against a lone king. Get a pawn to the last rank.'],
        fen: '4k3/8/8/8/8/8/3PP3/4K3 w - - 0 1', goal: { promote: true }, noChallenges: true,
      },
    },
    {
      kind: 'memory', name: 'The Blank Chapter',
      minion: { name: 'A Memory', title: 'The Night of the Crossing', piece: 'king' },
      greet: '*a page turns by itself* ... You sat here once, with a blank book, and a pen that fitted your hand.',
      after: 'A memory: a blank book, and your hand writing the first letter of your name.',
      fail: '*the book snaps shut* ... Not this chapter. Try again.',
      rule: {
        title: 'Walk the Crossing', lines: ['A memory of the Library. A rook and a bishop guard the far shelves.', 'Walk your king to the far edge (the 8th rank) within 18 moves.'],
        fen: '4k3/3r4/6b1/8/8/8/3PP3/3KN3 w - - 0 1', goal: { crossing: true }, moveLimit: 18, noChallenges: true,
      },
    },
  ],

  obsidiancourt: [
    {
      kind: 'taster', name: 'Short Sentence',
      minion: { name: 'Bailiff', title: 'Keeper of the Hourglass', piece: 'rook' },
      greet: 'The court gives you twenty-five moves to checkmate a half-army. The sand is already falling.',
      after: 'Sentence served. Early.',
      fail: 'Time. The court finds against you.',
      rule: {
        title: 'Mate in 25', lines: ['He has no queen and no rooks.', 'Checkmate him within 21 of your moves.'],
        fen: '1nb1kbn1/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1', moveLimit: 21,
      },
    },
    {
      kind: 'puzzle', name: 'Verdicts',
      minion: { name: 'The Judge', title: 'Black Robes', piece: 'king' },
      greet: 'Three cases. Each ends in a quiet queen move. Deliver the verdict.',
      after: 'Case closed.',
      fail: 'Overruled. That was not mate.',
      rule: {
        title: 'Quiet Mates', lines: ['Three positions. In each one your queen checkmates with a quiet move (no capture).'],
        puzzles: ['R1Q5/1r1n1Pk1/5p1p/2rqp3/6P1/2B5/8/6KN w - - 0 1', 'r2rq3/3k2Pp/2ppp3/R5n1/8/1Q2B3/N6P/5K2 w - - 0 1', '8/2n1rN1k/2B3pp/q2r2pP/6P1/2Q5/1R5K/8 w - - 0 1'],
      },
    },
    {
      kind: 'trial', name: 'Trial by Fire',
      minion: { name: 'Magma', title: 'Floor of the Court', piece: 'pawn' },
      greet: 'The floor is lava. Literally. Three trials, win all three.',
      after: 'Not even singed.',
      fail: 'Toasted. Cool off and try again.',
      rule: {
        title: 'Three Challenges', lines: ['Three fiery challenges. Win all three.'],
        minigameTrial: { games: 3, need: 3, pool: ['CheckmateRun', 'LavaTilt', 'UndertaleDodge'] },
      },
    },
    {
      kind: 'hunt', name: 'The Jury',
      minion: { name: 'The Jury', title: 'Twelve Grim Faces', piece: 'pawn' },
      greet: 'Twelve of us sit in judgement. Dismiss the whole jury before the hourglass runs dry, and we find you not guilty.',
      after: 'Not guilty.',
      fail: 'Guilty.',
      rule: {
        title: 'Dismiss the Jury', lines: ['Twelve jurors: four minor pieces and eight pawns, no queen or rooks.', 'Capture all of them (or checkmate) within 26 of your moves.'],
        fen: '1nb1kbn1/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1', goal: { captureAll: true }, moveLimit: 26,
      },
    },
    {
      kind: 'wild', name: 'Last Appeal',
      minion: { name: 'Executioner\'s Axe', title: 'Sharp and Patient', piece: 'queen' },
      greet: 'Your appeal is heard. Survive fifteen moves with what you have left.',
      after: 'Appeal granted. How irritating.',
      fail: 'Appeal denied.',
      rule: {
        title: 'Survive 15 Moves', lines: ['You have no queen and no rooks.', "Don't get checkmated for 18 of your moves."],
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NB1KBN1 w - - 0 1', goal: { survive: 18 },
      },
    },
    {
      kind: 'relic', name: 'Embers of the Court',
      minion: { name: 'Cinder', title: 'Spark of the Verdict', piece: 'pawn' },
      greet: 'Four embers of old verdicts. Pick them up quickly. The sand is already falling.',
      after: 'Every ember gathered. The court grows cold.',
      fail: 'Burned out. Sentence carried out.',
      rule: {
        title: 'Relic Run', lines: ['Four embers lie on the board. Move a piece onto each one.', 'The hourglass is short: find all four within 13 moves.'],
        goal: { relics: ['c5', 'f5', 'd6', 'e4'] }, moveLimit: 13,
      },
    },
    {
      kind: 'memory', name: 'The Hourglass Turns',
      minion: { name: 'A Memory', title: 'The Night of the Crossing', piece: 'king' },
      greet: '*sand falling* ... Across the lava, far away, a king made of crystal watched you. He turned an hourglass over.',
      after: 'A memory: the hourglass turned, and the crystal king whispered: not this one. Not this piece.',
      fail: '*the sand runs out* ... The memory burns away. Try again.',
      rule: {
        title: 'Walk the Crossing', lines: ['A memory of the Court. A rook stands in your way and the sand is short.', 'Walk your king to the far edge (the 8th rank) within 14 moves.'],
        fen: '2r1k3/8/8/8/8/8/PPP5/1K1R4 w - - 0 1', goal: { crossing: true }, moveLimit: 14, noChallenges: true,
      },
    },
  ],

  soulboundpixel: [
    {
      kind: 'puzzle', name: 'Crystal Echoes',
      minion: { name: 'Echo', title: 'A Memory of X', piece: 'king' },
      greet: 'I am what he remembers of every game. Three quiet mates. He could never solve these.',
      after: 'He could never solve them. You did.',
      fail: 'An echo of an echo. Again.',
      rule: {
        title: 'Quiet Mates', lines: ['Three hard positions. A rook checkmates with a quiet move (no capture).'],
        puzzles: ['6r1/2Pnq2Q/3k3p/3ppb1p/B7/4PN2/3R4/2R1K3 w - - 0 1', '1R2r1b1/3kP3/2p1p1np/2BqPp2/4N3/2K5/1R6/1Q6 w - - 0 1', '2k5/pbPp4/qQB1pR2/6nr/4P3/6R1/8/3K2N1 w - - 0 1'],
      },
    },
    {
      kind: 'taster', name: 'Everything Costs',
      minion: { name: 'Shardling', title: 'Splinter of the Crystal', piece: 'bishop' },
      greet: 'Here every capture is a challenge. Every single one. Pay your way to my king.',
      after: 'You pay your debts. Pass.',
      fail: 'Too expensive for you.',
      rule: {
        title: 'Every Capture', lines: ['Every capture starts a challenge, for both of you.', 'Checkmate him to win.'],
        everyCapture: true,
      },
    },
    {
      kind: 'trial', name: 'Weak Spots',
      minion: { name: 'Mirror', title: 'Shows Your Worst', piece: 'queen' },
      greet: 'I know which challenges you lose most. I will give you only those. Win four of five.',
      after: 'Your weak spots... are not so weak.',
      fail: 'Exactly as I showed you.',
      rule: {
        title: 'Five Challenges', lines: ['Five challenges, picked from the ones you lose most. Win 4 of them.'],
        minigameTrial: { games: 5, need: 4, weakest: true },
      },
    },
    {
      kind: 'hunt', name: 'Shattered Sight',
      minion: { name: 'Prism', title: 'Bends the Light', piece: 'knight' },
      greet: 'Fog, and every capture a challenge. Somewhere in it is my true face. Find it.',
      after: 'You see clearly now.',
      fail: 'Refracted.',
      rule: {
        title: 'The True Face', lines: ['Fog covers the board, and every capture starts a challenge.', 'One of his pieces is his true face. Capture it, or checkmate, to win.'],
        fog: true, everyCapture: true, goal: { mystery: true, hintEvery: 4 },
      },
    },
    {
      kind: 'wild', name: 'The Last Rank',
      minion: { name: 'The Edge', title: 'Where You Fell', piece: 'pawn' },
      greet: 'You stood here once, one square from me. Crown a pawn this time.',
      after: 'You reached the edge. It remembers you.',
      fail: 'Not yet. Not this time.',
      rule: {
        title: 'Crown a Pawn', lines: ['Both armies, and every capture is a challenge.', 'Get one of your pawns to the last rank to win.'],
        everyCapture: true, goal: { promote: true },
      },
    },
    {
      kind: 'relic', name: 'Shard Storm',
      minion: { name: 'Splinter', title: 'A Piece of the Break', piece: 'bishop' },
      greet: 'Five shards of the Great Board, spinning in the void. Every capture is a challenge. Gather them.',
      after: 'Five shards, back in your hands. They are warm. They know you.',
      fail: 'Scattered to the void again.',
      rule: {
        title: 'Relic Run', lines: ['Five shards float on the board. Move a piece onto each one. Every capture is a challenge.', 'Find all five within 21 moves (or checkmate) to win.'],
        everyCapture: true, goal: { relics: ['a5', 'h5', 'c6', 'f6', 'd4'] }, moveLimit: 21,
      },
    },
    {
      kind: 'memory', name: 'One Square Away',
      minion: { name: 'A Memory', title: 'The Night of the Crossing', piece: 'king' },
      greet: '*everything goes quiet* ... The last memory. You were one square from the edge. Take the step.',
      after: 'A memory: one square from the edge, the board cracked like ice, and everything went white. You remember now. All of it but your name.',
      fail: '*white light* ... The board breaks again. Try again.',
      rule: {
        title: 'Walk the Crossing', lines: ['The last memory. A queen and a knight try to stop you, and every capture is a challenge.', 'Walk your king to the far edge (the 8th rank) within 20 moves.'],
        fen: '3qk3/8/8/2n5/8/8/PPP5/1KR5 w - - 0 1', goal: { crossing: true }, moveLimit: 20, everyCapture: true,
      },
    },
  ],
};

// What a minion says during its fight, by the mission's goal.
function minionLines(m) {
  const goal = m.rule.goal || {};
  const lines = {
    bossCapture: ['Got your {piece}!', 'Your {piece} is mine now.', 'One {piece} fewer. Keep coming.'],
    bossCheck: ['Check! Watch your king.', 'Check. Did not see that coming?'],
    playerCheck: ['Hey! My king!', 'Check?! Not fair!'],
  };
  if (goal.mystery) {
    lines.playerCapture = ['Wrong one! Keep guessing.', 'Not that one. Heh.', 'Close... or not. Who can say?'];
    lines.mysteryHint = ['Stop reading the clues!', 'Who told you that?!', 'The clues are closing in...'];
  } else if (goal.captureAll) {
    lines.playerCapture = ['You got my {piece}. {myPieces} of us left!', 'That {piece} was one of the good ones!', 'Still {myPieces} of us. We scatter!'];
    lines.lowHealth = ['Only {myPieces} left... run!', 'They are rounding us up!'];
  } else if (goal.relics) {
    lines.playerCapture = ['Hands off my {piece}! And my relics!', 'You took my {piece}. The relics are still mine!'];
    lines.relic = ['That one was mine!', 'Put that back!', 'Only {left} left... you will never find them all.'];
  } else if (goal.crossing) {
    lines.bossCapture = ['*the memory darkens* ... Your {piece} is lost in it.', 'Something took your {piece}. Keep walking.'];
    lines.playerCapture = ['*the memory brightens* ... The way is clearer.', 'The shadow of a {piece} fades.'];
    lines.bossCheck = ['*a cold wind* ... Check. They tried to stop you here, too.'];
    lines.milestone = ['*the edge glows* ... Keep walking. Move {moveNum}.'];
  } else if (goal.survive) {
    lines.playerCapture = ['You bit back. Hold on while you can.', 'My {piece}? Fine. Still coming.'];
    lines.milestone = ['Move {moveNum}. Still standing? Hm.', 'Move {moveNum}. You are stubborn.'];
  } else {
    lines.playerCapture = ['My {piece}! Hey!', 'Ow. That was my {piece}.', 'Lucky. Lucky, lucky.'];
  }
  return lines;
}

// Mission characters for GameScreen: a minion per mission, fighting one level
// below its world's guardian, in the world's theme.
const MISSION_CHARS = [];
for (const [worldId, list] of Object.entries(MISSIONS)) {
  const world = WORLDS.find(w => w.id === worldId);
  const boss = STORY_STAGES[world.stages[world.stages.length - 1] - 1];
  list.forEach((m, i) => {
    m.id = `${worldId}_${i + 1}`;
    m.index = i;
    m.world = world;
    BOSS_RULES[m.id] = m.rule;
    MISSION_CHARS.push({
      id: m.id,
      name: m.minion.name,
      title: m.minion.title,
      piece: m.minion.piece,
      level: Math.max(1, boss.level - 1),
      mission: m,
      world,
      theme: world.art,
      dialogue: { before: m.greet, after: m.after, win: m.fail },
      gameDialogue: minionLines(m),
      personality: 'minion',
      colors: { ...boss.colors },
    });
  });
}

const StoryMissions = {
  COUNT: 7,

  forWorld(worldId) {
    return MISSIONS[worldId] || null;
  },

  character(id) {
    return MISSION_CHARS.find(c => c.id === id) || null;
  },

  cleared(save, worldId) {
    return Math.min(this.COUNT, ((save && save.missions) || {})[worldId] || 0);
  },

  // Missions open in order; a restored world's missions are all open (replays).
  isOpen(save, world, index) {
    if (typeof SuperUser !== 'undefined' && SuperUser.active()) return true;
    if (!StoryProgress.isUnlocked(save, world.stages[0])) return false;
    return StoryProgress.isRestored(save, world) || index <= this.cleared(save, world.id);
  },

  // The guardian waits at the end of the path.
  bossReady(save, world) {
    if (typeof SuperUser !== 'undefined' && SuperUser.active()) return true;
    // Tournament worlds: the guardian waits for the champion.
    if (typeof Tournaments !== 'undefined' && Tournaments.forWorld(world.id)) {
      return StoryProgress.isRestored(save, world) ||
        (StoryProgress.isUnlocked(save, world.stages[0]) && Tournaments.won(save, world.id));
    }
    if (!MISSIONS[world.id]) return StoryProgress.isUnlocked(save, world.stages[0]);
    return StoryProgress.isRestored(save, world) ||
      (StoryProgress.isUnlocked(save, world.stages[0]) && this.cleared(save, world.id) >= this.COUNT);
  },

  // Records a cleared mission; returns true if it was the next one on the path.
  markCleared(worldId, index) {
    const save = store.getActiveSave();
    const done = this.cleared(save, worldId);
    if (index !== done) return false;
    store.setActiveSave({ missions: { ...(save.missions || {}), [worldId]: done + 1 } });
    return true;
  },
};
