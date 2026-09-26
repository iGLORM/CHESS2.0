// Missions: five short challenges on the path to each guardian, played in
// order on the world's own map (WorldMissionsScreen). Each mission is fought
// against one of the guardian's minions and has a rule like a boss (see
// BossRules), registered in BOSS_RULES under the mission id.
//
//   kind   puzzle | trial | hunt | taster | wild  (the map icon)
//   rule   BossRules fields; missions also use goal.promote (crown a pawn),
//          goal.survive (don't lose for N of your moves) and
//          minigameTrial.pool (which challenges the trial draws from)
//
// Puzzle positions were found with the engine (a single mating move each);
// tests/missions.test.js checks every position.
const MISSION_KINDS = {
  puzzle: { label: 'Puzzle', icon: '?' },
  trial: { label: 'Challenges', icon: '★' },
  hunt: { label: 'Hunt', icon: '⚔' },
  taster: { label: 'Rule Taster', icon: '!' },
  wild: { label: 'Wild Card', icon: '♙' },
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
      greet: '*clicking* ... Four bishops and a wall of us. Try to dig through.',
      after: '*retreating clicks* ... The swarm scatters.',
      fail: '*triumphant clicking*',
      rule: {
        title: 'Dig Them Out', lines: ['The Scarabs field four bishops behind their pawns.', 'Win 4 captures to clear the swarm.'],
        fen: 'b1b1kb1b/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1', goal: { captures: 4 },
      },
    },
    {
      kind: 'trial', name: 'Dune Dash',
      minion: { name: 'Sand Sprite', title: 'Wind on the Dunes', piece: 'knight' },
      greet: 'No board here, only sand in your eyes. Three challenges. Win two!',
      after: 'Fast feet! The dunes let you pass.',
      fail: 'Swallowed by the sand! Shake it off and try again.',
      rule: {
        title: 'Three Challenges', lines: ['Three desert challenges in a row. Win 2 of them.'],
        minigameTrial: { games: 3, need: 2, pool: ['LavaTilt', 'DodgeFalling', 'MeteorStorm'] },
      },
    },
    {
      kind: 'taster', name: 'Diagonal Duel',
      minion: { name: 'Bishling', title: "Bish-Bosh's Apprentice", piece: 'bishop' },
      greet: 'Master says only bishops matter. So only bishops play! Ha!',
      after: 'I leaned the wrong way... Master will be furious.',
      fail: 'Diagonals forever! Tell Master I won!',
      rule: {
        title: 'Only Bishops', lines: ['Both sides have just bishops, pawns and a king.', 'Win 3 captures.'],
        fen: 'bb2k1bb/pppppppp/8/8/8/8/PPPPPPPP/BB2K1BB w - - 0 1', goal: { captures: 3 },
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
  ],

  ironkeep: [
    {
      kind: 'trial', name: 'Forge Runner',
      minion: { name: 'Anvil', title: 'Keeper of the Forge', piece: 'rook' },
      greet: 'The forge tests everyone who comes to the gate. Three trials. Win two.',
      after: 'Tempered steel. The forge approves.',
      fail: 'Cracked in the heat. Cool down and try again.',
      rule: {
        title: 'Three Challenges', lines: ['Three forge challenges in a row. Win 2 of them.'],
        minigameTrial: { games: 3, need: 2, pool: ['RookStack', 'SiegeCannon', 'ShieldBlock'] },
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
      greet: 'Four rooks guard this wall. You will not take three of us.',
      after: 'Three sentries down. The wall has a hole in it.',
      fail: 'The wall holds. It always holds.',
      rule: {
        title: 'Four Rooks', lines: ['The sentries field four rooks and no minor pieces.', 'Win 3 captures.'],
        fen: 'rr2k1rr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1', goal: { captures: 3 },
      },
    },
    {
      kind: 'taster', name: 'Without Towers',
      minion: { name: 'Rivet', title: "Rook-E's Squire", piece: 'rook' },
      greet: 'Rook-E wants to see how you do without rooks. Badly, I bet.',
      after: 'You did fine without them. Rook-E will not like that.',
      fail: 'See? Nobody wins without towers.',
      rule: {
        title: 'No Rooks for You', lines: ['You start without rooks. Taking one of his rooks always starts a challenge.', 'Win 3 captures.'],
        fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBN1 w kq - 0 1', goal: { captures: 3 }, alwaysChallengeWhenTaking: ['rook'],
      },
    },
    {
      kind: 'wild', name: 'Hold the Gate',
      minion: { name: 'Siege Captain', title: 'Breaker of Keeps', piece: 'queen' },
      greet: 'One rook against my whole siege. Hold out for twelve moves and I will call it off.',
      after: 'Twelve moves and you are still standing. Siege lifted.',
      fail: 'The gate falls. Every gate falls.',
      rule: {
        title: 'Survive 12 Moves', lines: ['You have a king, a rook and pawns. He has everything else.', "Don't get checkmated for 12 of your moves."],
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/4K2R w K - 0 1', goal: { survive: 12 },
      },
    },
  ],

  mistymoors: [
    {
      kind: 'taster', name: 'Fogbank',
      minion: { name: 'Wisp', title: 'Light in the Mist', piece: 'pawn' },
      greet: '*flickers* ... Follow me into the fog. If you can see me.',
      after: '*fades* ... You see better than most.',
      fail: '*giggles from nowhere*',
      rule: {
        title: 'The Mist', lines: ['Fog covers the board: you only see squares your pieces touch or attack.', 'Win 3 captures.'],
        fog: true, goal: { captures: 3 },
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
        title: 'Three Challenges', lines: ['Three challenges in the marsh. Win 2 of them.'],
        minigameTrial: { games: 3, need: 2, pool: ['KnightCollapse', 'MemoryMatch', 'PatternPress'] },
      },
    },
    {
      kind: 'hunt', name: 'Ghost Riders',
      minion: { name: 'Phantom Riders', title: 'Knights of the Fog', piece: 'knight' },
      greet: 'Four knights ride the moor tonight. Checkmate us before the fog lifts.',
      after: 'The riders fall. The fog thins a little.',
      fail: 'The fog lifts, and you are gone.',
      rule: {
        title: 'Mate in 30', lines: ['The riders have four knights and no queen.', 'Checkmate them within 30 of your moves.'],
        fen: 'nn2k1nn/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1', moveLimit: 30,
      },
    },
    {
      kind: 'wild', name: 'Lost in the Mist',
      minion: { name: 'Barrow Wight', title: 'Cold Hands', piece: 'king' },
      greet: 'Lost? Good. Nobody finds the way out of my fog. Last ten moves, if you can.',
      after: 'You... found your way. How?',
      fail: 'Another one for the barrow.',
      rule: {
        title: 'Survive 10 Moves in Fog', lines: ['Fog covers the board and he has a stronger army.', "Don't get checkmated for 10 of your moves."],
        fog: true, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R2QK2R w KQ - 0 1', goal: { survive: 10 },
      },
    },
  ],

  royalpalace: [
    {
      kind: 'puzzle', name: 'Royal Decrees',
      minion: { name: 'The Herald', title: 'Voice of the Queen', piece: 'pawn' },
      greet: 'Hear ye! Her Majesty decrees three checkmates. With the queen, naturally.',
      after: 'Decreed and delivered!',
      fail: 'Hear ye... that was not a checkmate.',
      rule: {
        title: 'Mate in One', lines: ['Three positions. In each one your queen can checkmate in a single move.'],
        puzzles: ['r7/k3b3/pp4n1/N5r1/P7/8/B3K2P/7Q w - - 0 1', '4nNrk/6p1/4b2P/2r2Q1P/8/K7/4B3/8 w - - 0 1', '2k2n2/bpp5/2r2r2/8/4QP2/3NP3/4B3/K7 w - - 0 1'],
      },
    },
    {
      kind: 'trial', name: 'The Grand Ball',
      minion: { name: 'Dance Master', title: 'Keeper of Rhythm', piece: 'knight' },
      greet: 'And a one, and a two! Keep the rhythm, darling, or leave the floor.',
      after: 'Divine footwork!',
      fail: 'Off beat! From the top!',
      rule: {
        title: 'Three Challenges', lines: ['Three challenges on the ballroom floor. Win 2 of them.'],
        minigameTrial: { games: 3, need: 2, pool: ['RhythmTap', 'TimingStrike', 'BarBalance'] },
      },
    },
    {
      kind: 'hunt', name: 'Palace Guards',
      minion: { name: 'Royal Guard', title: 'Pikes and Polish', piece: 'rook' },
      greet: 'By order of the queen, every capture we make is a challenge for you. Mostly.',
      after: 'The guard stands aside. Grudgingly.',
      fail: 'Escorted out. Please mind the marble.',
      rule: {
        title: 'Guarded Halls', lines: ['His captures start a challenge 60% of the time.', 'Win 4 captures.'],
        bossChallengeChance: 0.6, goal: { captures: 4 },
      },
    },
    {
      kind: 'taster', name: 'Two Crowns',
      minion: { name: 'Lady-in-Waiting', title: "Queenie's Shadow", piece: 'queen' },
      greet: 'Her Majesty lent me her second crown. Two queens! Try not to faint.',
      after: 'Oh dear. I shall have to return the crown.',
      fail: 'Two queens beat one, darling. Simple arithmetic.',
      rule: {
        title: 'Two Queens', lines: ['She starts with two queens and no bishops.', 'Win 3 captures.'],
        fen: 'rnq1kqnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', goal: { captures: 3 },
      },
    },
    {
      kind: 'wild', name: 'Coronation',
      minion: { name: 'Crown Keeper', title: 'Guardian of Crowns', piece: 'king' },
      greet: 'Every pawn dreams of a crown. Can yours reach the throne room?',
      after: 'Crowned! The palace has a new queen, and she is yours.',
      fail: 'No crown for you today.',
      rule: {
        title: 'Crown a Pawn', lines: ['A king-and-pawns ending. Get a pawn to the last rank to win.'],
        fen: '4k3/pppp4/8/8/8/8/4PPPP/4K3 w - - 0 1', goal: { promote: true }, noChallenges: true,
      },
    },
  ],

  clockworkcitadel: [
    {
      kind: 'taster', name: 'Gear Maze',
      minion: { name: 'Cog', title: 'Wall Winder', piece: 'pawn' },
      greet: '*tick* Walls in the middle. *tock* Nothing goes through. *tick* Good luck.',
      after: '*tick... tock...* Unwound.',
      fail: '*tick tock tick tock* Wound up and won!',
      rule: {
        title: 'Gear Walls', lines: ['Four gear walls stand in the centre. Nothing can stop on them or slide through; knights jump over.', 'Win 3 captures.'],
        walls: [{ row: 4, col: 2 }, { row: 4, col: 5 }, { row: 3, col: 2 }, { row: 3, col: 5 }], goal: { captures: 3 },
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
      greet: 'Wind me up. Carefully. Three turns, and two must be perfect.',
      after: 'Perfectly wound. The Citadel ticks on.',
      fail: 'SPROING. Overwound. Again.',
      rule: {
        title: 'Three Challenges', lines: ['Three clockwork challenges. Win 2 of them.'],
        minigameTrial: { games: 3, need: 2, pool: ['ShieldBlock', 'TimingStrike', 'PowerMeter'] },
      },
    },
    {
      kind: 'hunt', name: 'Clockwork Rush',
      minion: { name: 'Tin Soldiers', title: 'Wound for Battle', piece: 'pawn' },
      greet: 'We march for twenty moves, then our springs run down. Catch four of us before then.',
      after: 'Four of us, unwound. Well played.',
      fail: 'Tick... tock... time is up.',
      rule: {
        title: 'Four in Twenty', lines: ['Win 4 captures within 20 of your moves.', 'If time runs out first, you lose.'],
        goal: { captures: 4 }, moveLimit: 20,
      },
    },
    {
      kind: 'wild', name: 'Siege Engine',
      minion: { name: 'The Engine', title: 'Steam and Iron', piece: 'rook' },
      greet: 'The engine rolls. Lose a challenge and I jam that square for three turns. Survive twelve moves.',
      after: 'Steam spent. You outlasted the engine.',
      fail: 'Crushed under the wheels.',
      rule: {
        title: 'Survive 12 Moves', lines: ['He has an extra queen. Lose a challenge and that square locks for 3 turns.', "Don't get checkmated for 12 of your moves."],
        fen: 'rnbqkqnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', lockPlies: 4, goal: { survive: 12 },
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
      kind: 'taster', name: 'Chapter Endings',
      minion: { name: 'Archivist', title: "EndGamer's Assistant", piece: 'king' },
      greet: "I opened one of the master's books to a random ending. It favours me. Last fifteen moves.",
      after: 'You rewrote the ending. I must file a correction.',
      fail: 'As the book foretold.',
      rule: {
        title: 'Survive the Ending', lines: ['The game starts in a random endgame that favours him.', "Don't lose for 15 of your moves."],
        endgames: true, goal: { survive: 15 },
      },
    },
    {
      kind: 'trial', name: 'Speed Reading',
      minion: { name: 'Page Turner', title: 'Quickest Fingers', piece: 'pawn' },
      greet: 'Can you read faster than the pages turn? Three tries, two passes.',
      after: 'Remarkable reading speed!',
      fail: 'You lost your place. From the top.',
      rule: {
        title: 'Three Challenges', lines: ['Three quick-thinking challenges. Win 2 of them.'],
        minigameTrial: { games: 3, need: 2, pool: ['MemoryMatch', 'PatternPress', 'WhackMole'] },
      },
    },
    {
      kind: 'hunt', name: 'Bookworms',
      minion: { name: 'Bookworms', title: 'Paper Eaters', piece: 'pawn' },
      greet: '*munch munch* We are eating the shelves. Chase us off with your rooks!',
      after: '*scurrying* The shelves are safe. For now.',
      fail: '*munch* Delicious.',
      rule: {
        title: 'Two Rooks vs Pawns', lines: ['Your rooks against a wall of eight pawns.', 'Win 5 captures.'],
        fen: '4k3/pppppppp/8/8/8/8/8/R3K2R w KQ - 0 1', goal: { captures: 5 },
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
  ],

  forkedgulch: [
    {
      kind: 'puzzle', name: 'High Noon',
      minion: { name: 'The Kid', title: 'Fastest Knight in the West', piece: 'knight' },
      greet: 'Draw, partner! Three showdowns, one knight jump each.',
      after: 'Faster than me. Nobody is faster than me.',
      fail: 'Missed! Holster up and try again.',
      rule: {
        title: 'Mate in One', lines: ['Three positions. In each one a knight can checkmate in a single move.'],
        puzzles: ['1krb3q/ppp5/1N6/p1N5/8/P3Q3/7P/3K4 w - - 0 1', '1qbr1QN1/2p1P2k/6pp/5P2/8/4N3/8/7K w - - 0 1', '5QN1/2Nq3k/P2P2pp/2b4r/8/3K4/8/8 w - - 0 1'],
      },
    },
    {
      kind: 'trial', name: 'Shooting Gallery',
      minion: { name: 'Deadeye', title: 'Never Misses', piece: 'bishop' },
      greet: 'Three rounds at the gallery. Hit two, and you can walk into town.',
      after: 'Sharp shooting, stranger.',
      fail: 'Missed the bottles. Reload.',
      rule: {
        title: 'Three Challenges', lines: ['Three sharpshooting challenges. Win 2 of them.'],
        minigameTrial: { games: 3, need: 2, pool: ['ReactionTest', 'TargetPractice', 'SiegeCannon'] },
      },
    },
    {
      kind: 'taster', name: 'Double Trouble',
      minion: { name: 'Two-Gun', title: "ForkMaster's Deputy", piece: 'knight' },
      greet: 'Line up two of your pieces for me and I take both. Just like the boss.',
      after: 'You never gave me a pair. Smart.',
      fail: 'Two for one! Yee-haw!',
      rule: {
        title: 'Double Take', lines: ['If his capturing piece also attacks another of your queen, rooks, bishops or knights, he takes both.', 'Win 3 captures.'],
        doubleTake: true, goal: { captures: 3 },
      },
    },
    {
      kind: 'hunt', name: 'Tumbleweeds',
      minion: { name: 'Tumbleweeds', title: 'Rolling Through', piece: 'pawn' },
      greet: '*rolls in* ... *rolls out* ... Two knights against eight of us? Catch four.',
      after: '*rolls away*',
      fail: '*rolls over your king*',
      rule: {
        title: 'Knights vs Pawns', lines: ['Two knights against a line of pawns.', 'Win 4 captures.'],
        fen: '4k3/pppppppp/8/8/8/8/8/1N2K1N1 w - - 0 1', goal: { captures: 4 },
      },
    },
    {
      kind: 'wild', name: 'Standoff',
      minion: { name: 'Sheriff', title: 'Law of the Gulch', piece: 'king' },
      greet: 'This town ain\'t big enough for the both of us. Last twelve moves and I\'ll let you ride on.',
      after: 'You earned your spurs.',
      fail: 'Run out of town.',
      rule: {
        title: 'Survive 12 Moves', lines: ['He has an extra rook and double take.', "Don't get checkmated for 12 of your moves."],
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBN1 w - - 0 1', doubleTake: true, goal: { survive: 12 },
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
        title: 'Mate in 25', lines: ['He has no queen and no rooks.', 'Checkmate him within 25 of your moves.'],
        fen: '1nb1kbn1/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1', moveLimit: 25,
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
      greet: 'The floor is lava. Literally. Three trials, win two.',
      after: 'Not even singed.',
      fail: 'Toasted. Cool off and try again.',
      rule: {
        title: 'Three Challenges', lines: ['Three fiery challenges. Win 2 of them.'],
        minigameTrial: { games: 3, need: 2, pool: ['CheckmateRun', 'LavaTilt', 'UndertaleDodge'] },
      },
    },
    {
      kind: 'hunt', name: 'The Jury',
      minion: { name: 'The Jury', title: 'Twelve Grim Faces', piece: 'pawn' },
      greet: 'Take five of us before the hourglass runs dry, and we find you not guilty.',
      after: 'Not guilty.',
      fail: 'Guilty.',
      rule: {
        title: 'Five in Twenty', lines: ['Win 5 captures within 20 of your moves.', 'If time runs out first, you lose.'],
        goal: { captures: 5 }, moveLimit: 20,
      },
    },
    {
      kind: 'wild', name: 'Last Appeal',
      minion: { name: 'Executioner\'s Axe', title: 'Sharp and Patient', piece: 'queen' },
      greet: 'Your appeal is heard. Survive fifteen moves with what you have left.',
      after: 'Appeal granted. How irritating.',
      fail: 'Appeal denied.',
      rule: {
        title: 'Survive 15 Moves', lines: ['You have no queen and no rooks.', "Don't get checkmated for 15 of your moves."],
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NB1KBN1 w - - 0 1', goal: { survive: 15 },
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
      greet: 'Here every capture is a challenge. Every single one. Take three.',
      after: 'You pay your debts. Pass.',
      fail: 'Too expensive for you.',
      rule: {
        title: 'Every Capture', lines: ['Every capture starts a challenge, for both of you.', 'Win 3 captures.'],
        everyCapture: true, goal: { captures: 3 },
      },
    },
    {
      kind: 'trial', name: 'Weak Spots',
      minion: { name: 'Mirror', title: 'Shows Your Worst', piece: 'queen' },
      greet: 'I know which challenges you lose most. I will give you only those. Win three of five.',
      after: 'Your weak spots... are not so weak.',
      fail: 'Exactly as I showed you.',
      rule: {
        title: 'Five Challenges', lines: ['Five challenges, picked from the ones you lose most. Win 3 of them.'],
        minigameTrial: { games: 5, need: 3, weakest: true },
      },
    },
    {
      kind: 'hunt', name: 'Shattered Sight',
      minion: { name: 'Prism', title: 'Bends the Light', piece: 'knight' },
      greet: 'Fog, and every capture a challenge. Take two pieces you cannot see.',
      after: 'You see clearly now.',
      fail: 'Refracted.',
      rule: {
        title: 'Fog and Challenges', lines: ['Fog covers the board, and every capture starts a challenge.', 'Win 2 captures.'],
        fog: true, everyCapture: true, goal: { captures: 2 },
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
  ],
};

// Mission characters for GameScreen: a minion per mission, fighting one or
// two levels below its world's guardian, in the world's theme.
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
      level: Math.max(1, boss.level - 2),
      mission: m,
      world,
      theme: world.art,
      dialogue: { before: m.greet, after: m.after, win: m.fail },
      gameDialogue: {},
      personality: 'minion',
      colors: { ...boss.colors },
    });
  });
}

const StoryMissions = {
  COUNT: 5,

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
    if (!StoryProgress.isUnlocked(save, world.stages[0])) return false;
    return StoryProgress.isRestored(save, world) || index <= this.cleared(save, world.id);
  },

  // The guardian waits at the end of the path.
  bossReady(save, world) {
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
