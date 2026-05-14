const TRAINING_LEVELS = [
  // ═══════════════════════════════════════════════════════════════
  // BAND 1: Fundamentals — Piece movement & captures (Levels 1-5)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 1, band: 1, title: 'Rook Capture',
    type: 'capture', concept: 'Rooks move in straight lines along files and ranks.',
    fen: 'r3k3/8/8/8/8/8/8/R3K3 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'a1a8', san: 'Rxa8+', alternatives: [], continuation: [] },
    hints: [
      'Look for a piece you can capture.',
      'Your rook can move along the a-file.',
      'Capture the black rook on a8.',
    ],
    coachTags: ['capture', 'rook'],
    starTargets: { threeStarSeconds: 30, twoStarSeconds: 90, maxHintsForThree: 0 },
  },
  {
    id: 2, band: 1, title: 'Bishop Diagonal',
    type: 'capture', concept: 'Bishops move diagonally across the board.',
    fen: '4k3/8/7n/8/8/8/8/2B1K3 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'c1h6', san: 'Bxh6', alternatives: [], continuation: [] },
    hints: [
      'Look for a diagonal capture.',
      'Your bishop on c1 has a long diagonal.',
      'Capture the knight on h6.',
    ],
    coachTags: ['capture', 'bishop'],
    starTargets: { threeStarSeconds: 30, twoStarSeconds: 90, maxHintsForThree: 0 },
  },
  {
    id: 3, band: 1, title: 'Knight Jump',
    type: 'capture', concept: 'Knights jump in L-shapes and can leap over pieces.',
    fen: '4k3/8/8/3p4/8/2N5/8/4K3 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'c3d5', san: 'Nxd5', alternatives: [], continuation: [] },
    hints: [
      'Knights move in an L-shape.',
      'Your knight can reach the pawn.',
      'Jump to d5 and capture the pawn.',
    ],
    coachTags: ['capture', 'knight'],
    starTargets: { threeStarSeconds: 30, twoStarSeconds: 90, maxHintsForThree: 0 },
  },
  {
    id: 4, band: 1, title: 'Queen Power',
    type: 'capture', concept: 'The queen combines rook and bishop movement.',
    fen: '6k1/3r4/8/8/8/8/8/3QK3 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'd1d7', san: 'Qxd7', alternatives: [], continuation: [] },
    hints: [
      'The queen can move like a rook or bishop.',
      'Your queen has a clear file to the target.',
      'Capture the rook on d7.',
    ],
    coachTags: ['capture', 'queen'],
    starTargets: { threeStarSeconds: 30, twoStarSeconds: 90, maxHintsForThree: 0 },
  },
  {
    id: 5, band: 1, title: 'King Safety',
    type: 'capture', concept: 'Kings can capture, but only if the square is safe.',
    fen: '8/8/8/8/8/8/4p3/4K2k w - - 0 1', sideToMove: 'white',
    solution: { primary: 'e1e2', san: 'Kxe2', alternatives: [], continuation: [] },
    hints: [
      'Your king can capture adjacent pieces.',
      'Check that the destination square is safe.',
      'Take the pawn on e2 — it is undefended.',
    ],
    coachTags: ['capture', 'king'],
    starTargets: { threeStarSeconds: 45, twoStarSeconds: 120, maxHintsForThree: 0 },
  },

  // ═══════════════════════════════════════════════════════════════
  // BAND 2: Basic Tactics (Levels 6-10)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 6, band: 2, title: 'Knight Fork',
    type: 'fork', concept: 'A fork attacks two pieces at once with a single move.',
    fen: '8/8/1q3k2/8/8/2N5/8/7K w - - 0 1', sideToMove: 'white',
    solution: { primary: 'c3d5', san: 'Nd5+', alternatives: [], continuation: [] },
    hints: [
      'Look for a move that attacks two pieces at once.',
      'Your knight can give check and attack another piece.',
      'Move the knight to d5 — it forks king and queen.',
    ],
    coachTags: ['fork', 'knight'],
    starTargets: { threeStarSeconds: 30, twoStarSeconds: 90, maxHintsForThree: 0 },
  },
  {
    id: 7, band: 2, title: 'Absolute Pin',
    type: 'pin', concept: 'A pinned piece cannot move without exposing the king.',
    fen: '4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'b5c6', san: 'Bxc6+', alternatives: [], continuation: [] },
    hints: [
      'A pinned piece is stuck defending the king.',
      'The knight on c6 is pinned to the king.',
      'Capture the pinned knight with Bxc6.',
    ],
    coachTags: ['pin', 'bishop'],
    starTargets: { threeStarSeconds: 30, twoStarSeconds: 90, maxHintsForThree: 0 },
  },
  {
    id: 8, band: 2, title: 'Rook Skewer',
    type: 'skewer', concept: 'A skewer forces a valuable piece to move, exposing one behind it.',
    fen: '1K6/8/8/8/8/8/R7/3k3q w - - 0 1', sideToMove: 'white',
    solution: { primary: 'a2a1', san: 'Ra1+', alternatives: [], continuation: [] },
    hints: [
      'Look for a check that attacks something behind the king.',
      'Your rook can give check along the first rank.',
      'Ra1+ skewers the king and queen.',
    ],
    coachTags: ['skewer', 'rook'],
    starTargets: { threeStarSeconds: 30, twoStarSeconds: 90, maxHintsForThree: 0 },
  },
  {
    id: 9, band: 2, title: 'Pin and Win',
    type: 'pin', concept: 'Capture a piece that is pinned to the king.',
    fen: '4k3/4q3/8/8/8/8/8/4R1K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'e1e7', san: 'Rxe7+', alternatives: [], continuation: [] },
    hints: [
      'Look for a piece that cannot escape.',
      'The queen on e7 is on the same file as the king.',
      'Capture the queen — she is pinned to the king.',
    ],
    coachTags: ['pin', 'rook'],
    starTargets: { threeStarSeconds: 30, twoStarSeconds: 90, maxHintsForThree: 0 },
  },
  {
    id: 10, band: 2, title: 'Queen Fork',
    type: 'fork', concept: 'The queen is the best piece for forks due to her range.',
    fen: '4k2r/8/8/8/8/8/8/3QK3 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'd1h5', san: 'Qh5+', alternatives: [], continuation: [] },
    hints: [
      'Your queen can check and attack a second target.',
      'Find a square where the queen checks the king and attacks the rook.',
      'Qh5+ forks the king on e8 and the rook on h8.',
    ],
    coachTags: ['fork', 'queen'],
    starTargets: { threeStarSeconds: 45, twoStarSeconds: 120, maxHintsForThree: 0 },
  },

  // ═══════════════════════════════════════════════════════════════
  // BAND 3: Intermediate Tactics (Levels 11-15)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 11, band: 3, title: 'Discovered Attack',
    type: 'discovered_attack', concept: 'Moving one piece reveals an attack by another.',
    fen: '6k1/3q4/8/8/8/3B4/8/3R2K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'd3h7', san: 'Bh7+', alternatives: [], continuation: [] },
    hints: [
      'Look for a move that reveals a hidden attack.',
      'Your bishop is blocking the rook on d1.',
      'Move the bishop with check — the rook then attacks the queen.',
    ],
    coachTags: ['discovered_attack', 'bishop'],
    starTargets: { threeStarSeconds: 45, twoStarSeconds: 120, maxHintsForThree: 0 },
  },
  {
    id: 12, band: 3, title: 'Double Check',
    type: 'double_check', concept: 'Two pieces give check — the king must move.',
    fen: '4k3/8/8/8/8/8/4B3/4R1K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'e2b5', san: 'Bb5+', alternatives: [], continuation: [] },
    hints: [
      'Can you give check with two pieces at once?',
      'Moving the bishop can reveal a rook check too.',
      'Bb5+ gives double check — bishop and rook both attack the king.',
    ],
    coachTags: ['double_check', 'discovered_attack'],
    starTargets: { threeStarSeconds: 45, twoStarSeconds: 120, maxHintsForThree: 0 },
  },
  {
    id: 13, band: 3, title: 'Remove the Defender',
    type: 'removing_defender', concept: 'Eliminate the piece that guards a key target.',
    fen: '2kr4/pp6/2n5/8/8/8/6B1/4K3 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'g2c6', san: 'Bxc6', alternatives: [], continuation: [] },
    hints: [
      'One piece is defending a critical square or piece.',
      'The knight on c6 is defending important squares.',
      'Capture the knight — it is the key defender.',
    ],
    coachTags: ['removing_defender', 'bishop'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 120, maxHintsForThree: 0 },
  },
  {
    id: 14, band: 3, title: 'Discovered File Attack',
    type: 'discovered_attack', concept: 'Clear a file to reveal your rook or queen attack.',
    fen: '6k1/3q4/8/8/3N4/8/8/3R2K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'd4e6', san: 'Ne6+', alternatives: ['d4f5', 'd4c6', 'd4b5', 'd4f3', 'd4e2', 'd4c2', 'd4b3'], continuation: [] },
    hints: [
      'Your knight is blocking the d-file.',
      'Move the knight to uncover the rook attack.',
      'Ne6 attacks near the king while your rook attacks the queen.',
    ],
    coachTags: ['discovered_attack', 'knight'],
    starTargets: { threeStarSeconds: 45, twoStarSeconds: 120, maxHintsForThree: 0 },
  },
  {
    id: 15, band: 3, title: 'Back Rank Threat',
    type: 'back_rank', concept: 'An exposed back rank is a deadly weakness.',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'e1e8', san: 'Re8#', alternatives: [], continuation: [] },
    hints: [
      'Look at the opponent king — is the back rank safe?',
      'The black king is trapped behind its own pawns.',
      'Re8 delivers checkmate on the back rank!',
    ],
    coachTags: ['back_rank', 'checkmate'],
    starTargets: { threeStarSeconds: 30, twoStarSeconds: 90, maxHintsForThree: 0 },
  },

  // ═══════════════════════════════════════════════════════════════
  // BAND 4: Positional Play (Levels 16-20)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 16, band: 4, title: 'Pawn Structure',
    type: 'positional', concept: 'Capture toward the center to build a strong pawn chain.',
    fen: '4k3/8/8/3p4/2P1P3/8/8/4K3 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'c4d5', san: 'cxd5', alternatives: ['e4d5'], continuation: [] },
    hints: [
      'Which capture creates a better pawn structure?',
      'Capturing toward the center strengthens your pawns.',
      'Play cxd5 to build a central pawn duo.',
    ],
    coachTags: ['pawn_structure', 'positional'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 120, maxHintsForThree: 0 },
  },
  {
    id: 17, band: 4, title: 'Open File Control',
    type: 'positional', concept: 'Place rooks on open files for maximum activity.',
    fen: '4k3/8/8/8/8/8/8/R5K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'a1e1', san: 'Re1+', alternatives: [], continuation: [] },
    hints: [
      'Rooks are strongest on open files.',
      'The e-file is open and leads to the enemy king.',
      'Re1+ seizes the open file with check.',
    ],
    coachTags: ['open_file', 'rook', 'positional'],
    starTargets: { threeStarSeconds: 45, twoStarSeconds: 120, maxHintsForThree: 0 },
  },
  {
    id: 18, band: 4, title: 'Knight Outpost',
    type: 'positional', concept: 'A knight on a supported square that pawns cannot attack is powerful.',
    fen: '4k3/2p1p3/8/8/2P1PN2/8/8/4K3 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'f4d5', san: 'Nd5', alternatives: [], continuation: [] },
    hints: [
      'Knights love outposts — squares pawns cannot attack.',
      'Is there a central square where your knight is untouchable?',
      'Nd5 places the knight on a perfect outpost.',
    ],
    coachTags: ['outpost', 'knight', 'positional'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 120, maxHintsForThree: 0 },
  },
  {
    id: 19, band: 4, title: 'Passed Pawn',
    type: 'positional', concept: 'A passed pawn with no opposing pawns in its path is a powerful asset.',
    fen: '4k3/8/8/2p5/3P4/8/8/4K3 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'd4c5', san: 'dxc5', alternatives: ['d4d5'], continuation: [] },
    hints: [
      'Think about pawn promotion paths.',
      'Removing the enemy pawn creates a passer.',
      'dxc5 or d5 creates a passed pawn.',
    ],
    coachTags: ['passed_pawn', 'positional'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 120, maxHintsForThree: 0 },
  },
  {
    id: 20, band: 4, title: 'Seventh Rank Invasion',
    type: 'positional', concept: 'A rook on the 7th rank attacks pawns and traps the king.',
    fen: '6k1/1p4p1/8/8/8/8/8/R5K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'a1a7', san: 'Ra7', alternatives: [], continuation: [] },
    hints: [
      'Rooks are extremely powerful on the 7th rank.',
      'The 7th rank attacks pawns and restricts the king.',
      'Ra7 invades the 7th rank, attacking both pawns.',
    ],
    coachTags: ['seventh_rank', 'rook', 'positional'],
    starTargets: { threeStarSeconds: 45, twoStarSeconds: 120, maxHintsForThree: 0 },
  },

  // ═══════════════════════════════════════════════════════════════
  // BAND 5: Advanced Tactics (Levels 21-25)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 21, band: 5, title: 'Greek Gift Sacrifice',
    type: 'sacrifice', concept: 'Sacrifice on h7 to expose the castled king.',
    fen: 'r1bq1rk1/ppp2ppp/2nbpn2/3p4/2PP4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'd3h7', san: 'Bxh7+', alternatives: [], continuation: ['g8h7', 'f3g5'] },
    hints: [
      'The classic attacking sacrifice targets h7.',
      'Your bishop can sacrifice itself to rip open the kingside.',
      'Bxh7+ starts the Greek Gift — after Kxh7, Ng5+ continues the attack.',
    ],
    coachTags: ['sacrifice', 'greek_gift', 'attack'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 120, maxHintsForThree: 0 },
  },
  {
    id: 22, band: 5, title: 'Decoy Sacrifice',
    type: 'sacrifice', concept: 'Lure a piece to a bad square with a sacrifice.',
    fen: '6k1/5rpp/8/7Q/8/8/6PP/5RK1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'f1f7', san: 'Rxf7', alternatives: [], continuation: [] },
    hints: [
      'Can you sacrifice to deflect a defender?',
      'The rook on f7 is guarding critical squares.',
      'Rxf7 removes the defender — if Kxf7, Qh7 is devastating.',
    ],
    coachTags: ['sacrifice', 'decoy', 'deflection'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 120, maxHintsForThree: 0 },
  },
  {
    id: 23, band: 5, title: 'Back Rank Breakthrough',
    type: 'back_rank', concept: 'Use the vulnerable back rank to deliver checkmate.',
    fen: '3rk3/5pp1/8/8/8/8/5PP1/3RK3 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'd1d8', san: 'Rxd8+', alternatives: [], continuation: ['e8d8'] },
    hints: [
      'Look for a way to penetrate the back rank.',
      'Can you exchange rooks favorably?',
      'Rxd8+ forces Kxd8 — the back rank was the weakness.',
    ],
    coachTags: ['back_rank', 'rook', 'attack'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 120, maxHintsForThree: 0 },
  },
  {
    id: 24, band: 5, title: 'Exchange Sacrifice',
    type: 'sacrifice', concept: 'Give up material to gain a lasting positional advantage.',
    fen: 'r4rk1/pp3ppp/2p1b3/8/3NP3/6P1/PP3PBP/R4RK1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'f1f8', san: 'Rxf8+', alternatives: [], continuation: [] },
    hints: [
      'Sometimes giving up the exchange wins the game.',
      'Your rook can sacrifice to eliminate a key defender.',
      'Rxf8+ disrupts the coordination of black pieces.',
    ],
    coachTags: ['sacrifice', 'exchange', 'positional'],
    starTargets: { threeStarSeconds: 90, twoStarSeconds: 180, maxHintsForThree: 0 },
  },
  {
    id: 25, band: 5, title: 'Quiet Move',
    type: 'quiet_move', concept: 'The strongest move is not always a check or capture.',
    fen: '6k1/5ppp/8/8/8/8/3Q1PPP/5RK1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'd2h6', san: 'Qh6', alternatives: [], continuation: [] },
    hints: [
      'Not every winning move is a check or capture.',
      'Can you build an unstoppable threat?',
      'Qh6 threatens Qg7# and there is no good defense.',
    ],
    coachTags: ['quiet_move', 'attack', 'threat'],
    starTargets: { threeStarSeconds: 90, twoStarSeconds: 180, maxHintsForThree: 0 },
  },

  // ═══════════════════════════════════════════════════════════════
  // BAND 6: Master Level (Levels 26-30)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 26, band: 6, title: 'Rook Endgame Technique',
    type: 'endgame', concept: 'Active rook placement is key in rook endgames.',
    fen: '8/8/8/3K4/8/8/4P1k1/R7 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'a1a8', san: 'Ra8', alternatives: ['a1a7', 'a1a6'], continuation: [] },
    hints: [
      'In rook endgames, activate your rook first.',
      'Place the rook behind your passed pawn or on an active rank.',
      'Ra8 puts the rook on an active square to support the pawn advance.',
    ],
    coachTags: ['endgame', 'rook', 'technique'],
    starTargets: { threeStarSeconds: 90, twoStarSeconds: 180, maxHintsForThree: 0 },
  },
  {
    id: 27, band: 6, title: 'Opposition',
    type: 'endgame', concept: 'The opposition is key to winning king-and-pawn endgames.',
    fen: '8/8/8/3k4/3P4/3K4/8/8 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'd3c3', san: 'Kc3', alternatives: ['d3e3'], continuation: [] },
    hints: [
      'In king-pawn endgames, king position is everything.',
      'Take the opposition — face the enemy king with one square between.',
      'Kc3 or Ke3 takes the opposition to support your pawn.',
    ],
    coachTags: ['endgame', 'opposition', 'king'],
    starTargets: { threeStarSeconds: 90, twoStarSeconds: 180, maxHintsForThree: 0 },
  },
  {
    id: 28, band: 6, title: 'Triangulation',
    type: 'endgame', concept: 'Lose a tempo to put the opponent in zugzwang.',
    fen: '8/8/8/2k5/8/2K5/2P5/8 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'c3d3', san: 'Kd3', alternatives: [], continuation: [] },
    hints: [
      'Sometimes you need to waste a move to gain the advantage.',
      'Triangulation means the king takes three moves to reach a square it could reach in one.',
      'Kd3 starts the triangulation to put Black in zugzwang.',
    ],
    coachTags: ['endgame', 'triangulation', 'zugzwang'],
    starTargets: { threeStarSeconds: 120, twoStarSeconds: 240, maxHintsForThree: 0 },
  },
  {
    id: 29, band: 6, title: 'Complex Deflection',
    type: 'deflection', concept: 'Force a defender away from its duty.',
    fen: '5r1k/6pp/8/7Q/8/8/6PP/5RK1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'f1f8', san: 'Rxf8+', alternatives: [], continuation: [] },
    hints: [
      'Which piece is holding the defense together?',
      'The rook on f8 is the only defender of the back rank.',
      'Rxf8+ deflects the defense — after Rxf8, Qg6 or Qh6 mates.',
    ],
    coachTags: ['deflection', 'sacrifice', 'checkmate'],
    starTargets: { threeStarSeconds: 90, twoStarSeconds: 180, maxHintsForThree: 0 },
  },
  {
    id: 30, band: 6, title: 'Promotion Technique',
    type: 'endgame', concept: 'Support your passed pawn all the way to promotion.',
    fen: '8/1PK5/k7/8/8/8/8/8 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'b7b8q', san: 'b8=Q+', alternatives: ['b7b8r'], continuation: [] },
    hints: [
      'Your pawn is one step from promotion.',
      'Promote with check if possible.',
      'b8=Q+ promotes to a queen with check — winning!',
    ],
    coachTags: ['endgame', 'promotion', 'pawn'],
    starTargets: { threeStarSeconds: 30, twoStarSeconds: 90, maxHintsForThree: 0 },
  },
];

const TRAINING_BANDS = [
  { id: 1, name: 'Fundamentals', desc: 'Learn how each piece moves and captures', levels: [1, 2, 3, 4, 5], starsToUnlockNext: 10 },
  { id: 2, name: 'Basic Tactics', desc: 'Forks, pins, and skewers', levels: [6, 7, 8, 9, 10], starsToUnlockNext: 10 },
  { id: 3, name: 'Intermediate', desc: 'Discovered attacks and back rank threats', levels: [11, 12, 13, 14, 15], starsToUnlockNext: 10 },
  { id: 4, name: 'Positional Play', desc: 'Pawn structure, outposts, and open files', levels: [16, 17, 18, 19, 20], starsToUnlockNext: 10 },
  { id: 5, name: 'Advanced Tactics', desc: 'Sacrifices and quiet winning moves', levels: [21, 22, 23, 24, 25], starsToUnlockNext: 12 },
  { id: 6, name: 'Master', desc: 'Endgame technique and complex combinations', levels: [26, 27, 28, 29, 30], starsToUnlockNext: null },
];
