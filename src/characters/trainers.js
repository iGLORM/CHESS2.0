// The Training Camp: five holographic trainers between Pawnie and the bosses.
// Each teaches with a few lesson pages, then sets a test (its rule lives in
// BossRules under the same id). They share the character shape so the game
// screen, dialogue and story progress treat them like any opponent.
// Each trainer projects in their own colour (matches scripts/generate_trainer_art.js).
const holo = (primary, secondary) => ({ primary, secondary, skin: '#e8fbff', eye: '#ffffff', pupil: '#0b1a2a' });

const TRAINERS = [
  {
    id: 'sergeantsquare',
    name: 'Sergeant Square',
    title: 'Drill Instructor',
    level: 1,
    trainer: true,
    hologram: 'rook',
    lesson: [
      { title: 'How Pieces Move', lines: [
        'Listen up, recruit! Every piece moves its own way.',
        'Pawns march forward and capture diagonally. Knights jump in an L. Bishops slide diagonally, rooks in straight lines, the queen does both, and the king steps one square.',
      ] },
      { title: 'Check and Mate', lines: [
        'Attack the enemy king: that is CHECK. He must escape, block, or take the attacker.',
        'If he cannot do any of that, it is CHECKMATE and the game is yours. That is the only goal that matters.',
      ] },
    ],
    dialogue: {
      before: 'Recruit! Before you face a single guardian, you will learn to finish a king. Ten positions, easy to hard. One move each. Find the mate.',
      after: 'Ten for ten! You can finish a king. Dismissed, recruit. Report to Captain Capture.',
      win: 'That was not mate, recruit. Reset and try again. The drill does not end until you get it right.',
    },
    gameDialogue: {
      gameStart: ['Eyes on the king, recruit!', 'One move. Make it count.'],
      playerCheck: ['Check is not mate! Look again!'],
    },
    personality: 'stern',
    theme: 'trainingcamp',
    colors: holo('#56d8ff', '#1f7fa8'),
  },
  {
    id: 'captaincapture',
    name: 'Captain Capture',
    title: 'Master of the Endgame',
    level: 1,
    trainer: true,
    hologram: 'knight',
    lesson: [
      { title: 'Captures Are Not Free', lines: [
        'In Chess 2.0, taking a piece can start a CHALLENGE: a quick minigame.',
        'The ATTACKER plays it. Win, and the capture goes through.',
      ] },
      { title: 'Losing a Challenge', lines: [
        'Lose, and your capture is cancelled. That square locks and you must choose another move.',
        'Out there, about one capture in three starts a challenge.',
      ] },
      { title: 'Finishing a Won Game', lines: [
        'Being ahead is not winning. Trade pieces, push your passed pawns, and bring your king forward.',
        'Box the enemy king towards an edge, then deliver the mate. Do not rush and do not give anything back.',
      ] },
    ],
    dialogue: {
      before: 'Ahoy! My crew is outgunned: you start this endgame ahead. But a lead is not a win. Sink my king and you pass.',
      after: 'Sunk, fair and square! You know how to finish a won game. On to Joy Stick!',
      win: 'Ha! You were ahead and let me off the hook. A lead is only a lead. Try again!',
    },
    gameDialogue: {
      gameStart: ['You are ahead, sailor. Now finish it!', 'A lead is not a win!'],
      bossCapture: ['Your {piece} walks the plank!', 'Earned that {piece} fair and square!'],
      playerCapture: ['You won my {piece}! Well played!', 'Ooh, my {piece}! Nice challenge!'],
    },
    personality: 'cheerful',
    theme: 'trainingcamp',
    colors: holo('#5dffb9', '#1f9a6b'),
  },
  {
    id: 'joystick',
    name: 'Joy Stick',
    title: 'Arcade Coach',
    level: 1,
    trainer: true,
    hologram: 'pawn',
    lesson: [
      { title: 'The Challenges', lines: [
        'Challenges are short arcade games: dodge, aim, time, remember. There are eighteen of them.',
        'Today you play every single one, one by one. Each explains itself on the READY screen, so read it before GO.',
      ] },
      { title: 'How to Win Them', lines: [
        'Watch the first second, then commit. Most challenges are lost by hesitating, not by missing.',
        'Lose one and you get two more tries at it. If you stop, you carry on from the same game next time.',
      ] },
    ],
    dialogue: {
      before: 'Player one, ready? Every challenge in my arcade, one after another. Clear them all and you are ready for the real world!',
      after: 'ALL CLEAR! You have played every game in the arcade. The Rulekeeper is waiting for you.',
      win: 'Game over, man! But in my arcade you always get another credit. Insert coin and try again!',
    },
    gameDialogue: {
      gameStart: ['Get ready!', 'Hands on the controls!'],
    },
    personality: 'hyper',
    theme: 'trainingcamp',
    colors: holo('#ff6fd8', '#a8307f'),
  },
  {
    id: 'rulekeeper',
    name: 'The Rulekeeper',
    title: 'Keeper of the Twists',
    level: 1,
    trainer: true,
    hologram: 'bishop',
    lesson: [
      { title: 'Every Guardian Cheats', lines: [
        'Each guardian out there bends the rules of chess in their own way.',
        'Before every fight you will see a BOSS RULE card. Read it. It is the key to the whole fight.',
      ] },
      { title: 'Kinds of Twists', lines: [
        'Some twists change the board. Some change the challenges. Some hide things from you.',
        'And some ask for more than checkmate: take every piece, or hunt down one hidden piece.',
      ] },
      { title: 'The Mystery Piece', lines: [
        'One enemy piece is secretly the target. At first every one of them wears a "?".',
        'Every few moves a hint clears some suspects. Taking a suspect clears it too. When one "!" is left, strike.',
      ] },
    ],
    dialogue: {
      before: 'A rule you have read is a rule you can beat. One of my pieces is the Mystery Piece, and there is mist over the middle. Find it. Take it.',
      after: 'You read the clues and caught it. The guardians will not find you so easy to fool.',
      win: 'The clues were there. Read them again, and watch where the "?" marks go.',
    },
    gameDialogue: {
      gameStart: ['Mind the mist.', 'Read the board, not just the pieces.'],
      bossCapture: ['Out of the mist, and your {piece} is gone.'],
      playerCapture: ['My {piece} falls. But was it the one?', 'A {piece}. Check your clues.'],
      mysteryHint: ['A clue. Read it twice.', 'The truth narrows. Watch where the "?" marks remain.'],
    },
    personality: 'calm',
    theme: 'trainingcamp',
    colors: holo('#a98bff', '#5b3fb0'),
  },
  {
    id: 'senseitactic',
    name: 'Sensei Tactic',
    title: 'The Final Exam',
    level: 2,
    trainer: true,
    hologram: 'king',
    lesson: [
      { title: 'Forks and Pins', lines: [
        'A FORK is one piece attacking two at once. A PIN freezes a piece in front of a bigger one.',
        'Every move, ask: what does this attack? What is standing in a line?',
      ] },
      { title: 'The Endgame', lines: [
        'When the board empties, bring your king forward. It becomes a fighter.',
        'Push passed pawns. A pawn that reaches the last rank becomes a queen.',
      ] },
    ],
    dialogue: {
      before: 'Your last lesson has no pages. A full game, against a real opponent. Win it, and Pawnie will trust you with the fragment.',
      after: 'You are ready. The student has become a player. Go now. The shattered worlds are waiting.',
      win: 'A good game, but not yet a winning one. Breathe, reset, and play again. I will be here.',
    },
    gameDialogue: {
      gameStart: ['Show me what you have learned.', 'Begin.'],
      bossCheck: ['Check. What will you do?'],
      playerCheck: ['A fine check. Continue.'],
      bossCapture: ['Your {piece}. Did you see it coming?'],
      playerCapture: ['Good. You took my {piece}.'],
    },
    personality: 'wise',
    theme: 'trainingcamp',
    colors: holo('#ffd166', '#a8801f'),
  },
];

// The story in order: Pawnie, the Training Camp, then the nine guardians.
const STORY_STAGES = [CHARACTERS[0], ...TRAINERS, ...CHARACTERS.slice(1)];
STORY_STAGES.forEach((ch, i) => { ch.stage = i + 1; });
