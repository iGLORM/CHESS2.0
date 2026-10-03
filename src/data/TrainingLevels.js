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
    type: 'pin', concept: 'Pin a piece to the king and it cannot run away.',
    fen: '6k1/5qpp/8/1B6/8/3P4/5PPP/6K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'b5c4', san: 'Bc4', alternatives: [], continuation: ['f7c4', 'd3c4'] },
    hints: [
      'Line up an attack on the queen and the king behind it.',
      'The black queen and king share the a2-g8 diagonal.',
      'Bc4 pins the queen: she is lost for a bishop.',
    ],
    coachTags: ['pin', 'bishop'],
    starTargets: { threeStarSeconds: 45, twoStarSeconds: 120, maxHintsForThree: 0 },
  },
  {
    id: 10, band: 2, title: 'Queen Fork',
    type: 'fork', concept: 'The queen is the best piece for forks due to her range.',
    fen: '4k3/8/8/8/7n/8/8/3QK3 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'd1a4', san: 'Qa4+', alternatives: ['d1h5'], continuation: ['e8f7', 'a4h4'] },
    hints: [
      'Your queen can check and attack a second target.',
      'Find a check that also hits the knight on h4.',
      'Qa4+ checks the king and attacks the knight along the 4th rank.',
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
    fen: '6k1/p2q4/8/8/8/3B4/8/3R2K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'd3c4', san: 'Bc4+', alternatives: [], continuation: ['g8h8', 'd1d7'] },
    hints: [
      'Your bishop is blocking the rook on the d-file.',
      'Move the bishop with check so Black has no time to save the queen.',
      'Bc4+ uncovers the rook: next you take the queen on d7.',
    ],
    coachTags: ['discovered_attack', 'bishop', 'rook'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 150, maxHintsForThree: 0 },
  },
  {
    id: 12, band: 3, title: 'Double Check',
    type: 'double_check', concept: 'A double check can only be answered by moving the king.',
    fen: '3qkb2/3p1p2/8/8/4N3/8/8/4R1K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'e4d6', san: 'Nd6#', alternatives: ['e4f6'], continuation: [] },
    hints: [
      'Your knight is blocking the rook on the e-file.',
      'Move the knight so that both pieces give check.',
      'Nd6 is a double check, and the king has nowhere to go: mate!',
    ],
    coachTags: ['double_check', 'knight', 'checkmate'],
    starTargets: { threeStarSeconds: 45, twoStarSeconds: 120, maxHintsForThree: 0 },
  },
  {
    id: 13, band: 3, title: 'Remove the Defender',
    type: 'remove_defender', concept: 'Capture the piece that guards a key square.',
    fen: '6k1/pp3ppp/2n5/1B6/8/8/PPr2PPP/3R2K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'b5c6', san: 'Bxc6', alternatives: [], continuation: ['b7c6', 'd1d8'] },
    hints: [
      'Black\'s back rank has no escape square.',
      'Only the knight on c6 stops Rd8.',
      'Bxc6 removes the guard; after bxc6, Rd8 is mate.',
    ],
    coachTags: ['remove_defender', 'back_rank'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 150, maxHintsForThree: 0 },
  },
  {
    id: 14, band: 3, title: 'Discovered File Attack',
    type: 'discovered_attack', concept: 'A knight move can open a file and give check at the same time.',
    fen: '3q1k2/8/8/8/3N4/8/8/3R2K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'd4e6', san: 'Ne6+', alternatives: [], continuation: [] },
    hints: [
      'Your knight blocks the rook from the black queen.',
      'Move the knight with check so Black has no time to save the queen.',
      'Ne6+ checks the king and opens the d-file onto the queen.',
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
    type: 'positional', concept: 'Double your rooks on an open file to break through.',
    fen: '3r2k1/5ppp/8/8/8/8/3R1PPP/3R2K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'd2d8', san: 'Rxd8#', alternatives: [], continuation: [] },
    hints: [
      'Two rooks on one open file beat one.',
      'Black\'s rook on d8 is the only guard of the back rank.',
      'Rxd8 is mate: the second rook backs up the first.',
    ],
    coachTags: ['open_file', 'rook', 'back_rank'],
    starTargets: { threeStarSeconds: 45, twoStarSeconds: 120, maxHintsForThree: 0 },
  },
  {
    id: 18, band: 4, title: 'Knight Outpost',
    type: 'positional', concept: 'A knight on a strong central square attacks many targets.',
    fen: '2q3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'd5e7', san: 'Ne7+', alternatives: [], continuation: ['g8h8', 'e7c8'] },
    hints: [
      'Your knight sits on a great central square.',
      'Look for a knight check that also hits the queen.',
      'Ne7+ forks the king and the queen on c8.',
    ],
    coachTags: ['outpost', 'knight', 'fork'],
    starTargets: { threeStarSeconds: 45, twoStarSeconds: 120, maxHintsForThree: 0 },
  },
  {
    id: 19, band: 4, title: 'Pawn Breakthrough',
    type: 'positional', concept: 'Sacrifice pawns to create a passed pawn that cannot be stopped.',
    fen: '8/ppp3k1/8/PPP5/8/8/8/7K w - - 0 1', sideToMove: 'white',
    solution: { primary: 'b5b6', san: 'b6', alternatives: [], continuation: [] },
    hints: [
      'The black king is far from your pawns.',
      'Give up a pawn to break through Black\'s pawn chain.',
      'b6! After axb6 c6! or cxb6 a6! one pawn queens.',
    ],
    coachTags: ['passed_pawn', 'pawn', 'breakthrough'],
    starTargets: { threeStarSeconds: 90, twoStarSeconds: 180, maxHintsForThree: 0 },
  },
  {
    id: 20, band: 4, title: 'Seventh Rank Invasion',
    type: 'positional', concept: 'A rook on the seventh rank traps the king on the back rank.',
    fen: '6k1/R7/8/8/8/8/8/1R4K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'b1b8', san: 'Rb8#', alternatives: [], continuation: [] },
    hints: [
      'Your rook on the seventh keeps the king on the last rank.',
      'Bring the second rook to the back rank.',
      'Rb8 is mate: the king cannot step up to the seventh.',
    ],
    coachTags: ['seventh_rank', 'rook', 'checkmate'],
    starTargets: { threeStarSeconds: 30, twoStarSeconds: 90, maxHintsForThree: 0 },
  },

  // ═══════════════════════════════════════════════════════════════
  // BAND 5: Advanced Tactics (Levels 21-25)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 21, band: 5, title: 'Greek Gift Sacrifice',
    type: 'sacrifice', concept: 'Bxh7+ opens the king; the knight and queen follow.',
    fen: 'rnbq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 0 1', sideToMove: 'white',
    solution: { primary: 'd3h7', san: 'Bxh7+', alternatives: [], continuation: ['g8h7', 'f3g5'] },
    hints: [
      'Your bishop points at h7, next to the black king.',
      'Sacrifice on h7 to drag the king out.',
      'Bxh7+! Kxh7 Ng5+ and your queen joins the attack.',
    ],
    coachTags: ['sacrifice', 'bishop', 'king_attack'],
    starTargets: { threeStarSeconds: 90, twoStarSeconds: 180, maxHintsForThree: 0 },
  },
  {
    id: 22, band: 5, title: 'Mating Net',
    type: 'checkmate', concept: 'Win material with check, then finish the king on the back rank.',
    fen: '6k1/5rpp/8/7Q/8/8/6PP/5RK1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'h5f7', san: 'Qxf7+', alternatives: [], continuation: ['g8h8', 'f7f8'] },
    hints: [
      'Your queen and rook both aim at f7.',
      'Take on f7 with check.',
      'Qxf7+ Kh8, then Qf8 is mate.',
    ],
    coachTags: ['checkmate', 'queen', 'back_rank'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 150, maxHintsForThree: 0 },
  },
  {
    id: 23, band: 5, title: 'Back Rank Breakthrough',
    type: 'sacrifice', concept: 'Sacrifice the queen to break the back-rank guard, then mate.',
    fen: '2r3k1/3q1ppp/8/8/8/8/2Q2PPP/2R3K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'c2c8', san: 'Qxc8+', alternatives: [], continuation: ['d7c8', 'c1c8'] },
    hints: [
      'Your queen and rook are stacked on the open c-file.',
      'The black queen guards c8. Make her take.',
      'Qxc8+! Qxc8 Rxc8 is mate.',
    ],
    coachTags: ['sacrifice', 'back_rank', 'checkmate'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 150, maxHintsForThree: 0 },
  },
  {
    id: 24, band: 5, title: 'Decoy Sacrifice',
    type: 'sacrifice', concept: 'Sacrifice a piece to lure a defender onto a fatal square.',
    fen: '2r3k1/5ppp/8/1Q6/8/8/5PPP/4R1K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'e1e8', san: 'Re8+', alternatives: ['b5e8'], continuation: ['c8e8', 'b5e8'] },
    hints: [
      'Black\'s back rank is weak and only the rook defends it.',
      'Offer a piece on e8 with check.',
      'Re8+! Rxe8 Qxe8 is mate.',
    ],
    coachTags: ['sacrifice', 'decoy', 'back_rank'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 150, maxHintsForThree: 0 },
  },
  {
    id: 25, band: 5, title: 'Quiet Move',
    type: 'quiet', concept: 'Sometimes the winning move is not a check or a capture.',
    fen: '7k/R7/5K2/8/8/8/8/8 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'f6g6', san: 'Kg6', alternatives: [], continuation: ['h8g8', 'a7a8'] },
    hints: [
      'A check now lets the king escape. Careful: some moves are stalemate!',
      'Use your king to take away squares.',
      'Kg6! The king must go to g8, then Ra8 is mate.',
    ],
    coachTags: ['quiet', 'king', 'checkmate'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 150, maxHintsForThree: 0 },
  },

  // ═══════════════════════════════════════════════════════════════
  // BAND 6: Master Level (Levels 26-30)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 26, band: 6, title: 'King in Front',
    type: 'endgame', concept: 'In king and pawn endings, put your king in front of the pawn.',
    fen: '4k3/8/2K5/8/4P3/8/8/8 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'c6d6', san: 'Kd6', alternatives: [], continuation: [] },
    hints: [
      'Pushing the pawn now lets Black draw.',
      'Your king should lead the pawn, not follow it.',
      'Kd6 grabs the key square in front of the pawn.',
    ],
    coachTags: ['endgame', 'king', 'pawn'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 150, maxHintsForThree: 0 },
  },
  {
    id: 27, band: 6, title: 'Opposition',
    type: 'endgame', concept: 'Face the enemy king with one square between to push it back.',
    fen: '8/8/4k3/8/8/3KP3/8/8 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'd3e4', san: 'Ke4', alternatives: [], continuation: [] },
    hints: [
      'The kings are fighting for the squares in front of your pawn.',
      'Stand directly opposite the black king.',
      'Ke4 takes the opposition: Black must give way.',
    ],
    coachTags: ['endgame', 'opposition', 'king'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 150, maxHintsForThree: 0 },
  },
  {
    id: 28, band: 6, title: 'Underpromotion',
    type: 'endgame', concept: 'Sometimes a knight is better than a queen.',
    fen: '8/3q1P1k/8/8/8/8/P7/K7 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'f7f8n', san: 'f8=N+', alternatives: [], continuation: [] },
    hints: [
      'A new queen on f8 would not stop Black\'s queen.',
      'Which new piece gives check and attacks d7?',
      'f8=N+ forks the king and queen.',
    ],
    coachTags: ['endgame', 'promotion', 'fork'],
    starTargets: { threeStarSeconds: 60, twoStarSeconds: 150, maxHintsForThree: 0 },
  },
  {
    id: 29, band: 6, title: 'Smothered Mate',
    type: 'checkmate', concept: 'A king boxed in by its own pieces can be mated by a lone knight.',
    fen: '5rk1/5Npp/8/3Q4/8/8/6PP/6K1 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'f7h6', san: 'Nh6++', alternatives: [], continuation: ['g8h8', 'd5g8', 'f8g8', 'h6f7'] },
    hints: [
      'Your knight and queen can both reach g8.',
      'A double check drives the king into the corner.',
      'Nh6++ Kh8 Qg8+! Rxg8 Nf7 is smothered mate.',
    ],
    coachTags: ['checkmate', 'knight', 'sacrifice'],
    starTargets: { threeStarSeconds: 120, twoStarSeconds: 240, maxHintsForThree: 0 },
  },
  {
    id: 30, band: 6, title: 'Promotion Technique',
    type: 'endgame', concept: 'Support your passed pawn all the way to promotion.',
    fen: '8/1PK5/k7/8/8/8/8/8 w - - 0 1', sideToMove: 'white',
    solution: { primary: 'b7b8q', san: 'b8=Q', alternatives: ['b7b8r'], continuation: [] },
    hints: [
      'Your pawn is one step from promotion.',
      'The black king cannot reach b8 in time.',
      'b8=Q makes a new queen and wins.',
    ],
    coachTags: ['endgame', 'promotion', 'pawn'],
    starTargets: { threeStarSeconds: 30, twoStarSeconds: 90, maxHintsForThree: 0 },
  },
];

const TRAINING_BANDS = [
  { id: 1, name: 'Fundamentals', desc: 'Learn how each piece moves and captures', levels: [1, 2, 3, 4, 5], starsToUnlockNext: 10 },
  { id: 2, name: 'Basic Tactics', desc: 'Forks, pins, and skewers', levels: [6, 7, 8, 9, 10], starsToUnlockNext: 10 },
  { id: 3, name: 'Intermediate', desc: 'Discovered attacks and back rank threats', levels: [11, 12, 13, 14, 15], starsToUnlockNext: 10 },
  { id: 4, name: 'Positional Play', desc: 'Open files, outposts, pawn breaks and the seventh rank', levels: [16, 17, 18, 19, 20], starsToUnlockNext: 10 },
  { id: 5, name: 'Advanced Tactics', desc: 'Sacrifices and quiet winning moves', levels: [21, 22, 23, 24, 25], starsToUnlockNext: 12 },
  { id: 6, name: 'Master', desc: 'Endgame technique and master mating patterns', levels: [26, 27, 28, 29, 30], starsToUnlockNext: null },
];
