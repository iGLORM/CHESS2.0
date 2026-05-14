const CoachCharacter = {
  id: 'magnus',
  name: 'Magnus',
  title: 'The Pixel Coach',
  personality: 'calm_coach',

  dialogue: {
    welcome: [
      'Welcome to training! Ready to sharpen your chess?',
      'Good to see you. Let us work on your game.',
      'Every master was once a beginner. Let us begin.',
      'Training time. Focus and you will improve.',
    ],
    levelStart: [
      'Take your time and study the position.',
      'Look at the whole board before you move.',
      'What do you notice about this position?',
      'Find the key idea here.',
    ],
    brilliant: [
      'Excellent! That is exactly the move.',
      'Perfect. You saw the idea instantly.',
      'Outstanding. That is master-level thinking.',
      'Brilliant! You found the only winning move.',
      'Spot on. That is precisely what I would play.',
    ],
    good: [
      'Good move. You are on the right track.',
      'Well played. That keeps the advantage.',
      'Solid choice. You understood the idea.',
      'Nice. That is a strong continuation.',
    ],
    inaccuracy: [
      'Playable, but there is something stronger.',
      'Not bad, but you missed the sharpest idea.',
      'Close. Think about what forces a reaction.',
      'That works, but the best move is more precise.',
    ],
    blunder: [
      'Careful. That move loses the point of the position.',
      'Stop and reconsider. Something changed.',
      'That gives away the advantage. Look again.',
      'Not quite. Think about what your opponent gains.',
      'That is a mistake. Reset and find the pattern.',
    ],
    wrongMove: [
      'That is not the right move. Try again.',
      'Not this one. Look for the forcing idea.',
      'Think again. The solution is more specific.',
      'Close, but not quite. Focus on the key squares.',
    ],
    solved: [
      'Well done! Puzzle complete.',
      'Excellent work! You solved it.',
      'That is correct! Moving on.',
      'Perfect. You cracked this one.',
      'Solved! Your pattern recognition is improving.',
    ],
    hint1: [
      'Here is a nudge: look for a forcing move — check, capture, or threat.',
      'Think about which piece can do the most damage right now.',
      'Consider what your opponent cannot defend against.',
    ],
    hint2: [
      'Getting warmer. Focus on {piece} possibilities.',
      'The key piece in this position is your {piece}.',
      'Look at what your {piece} can achieve.',
    ],
    hint3: [
      'The critical square is {square}.',
      'Aim for {square} — that is where the magic happens.',
      'The answer involves {square}.',
    ],
    reveal: [
      'The solution is {move}. Here is why: {concept}.',
      'The correct move was {move}. {concept}.',
      'Let me show you: {move}. {concept}.',
    ],
    encouragement: [
      'Keep going. Every puzzle makes you stronger.',
      'Do not worry about mistakes — they are how we learn.',
      'You are making progress. I can see it.',
      'Persistence is the key to improvement.',
      'Each attempt brings you closer to mastery.',
    ],
    streak: [
      'That is {count} in a row! You are on fire.',
      '{count} consecutive solves! Impressive streak.',
      'A streak of {count}! Your pattern recognition is sharp.',
    ],
    bandComplete: [
      'Outstanding! You completed the {band} section!',
      'Congratulations! {band} mastered. New challenges await.',
      'Impressive work finishing {band}. You are ready for the next level.',
    ],
    idle: [
      'Take your time. There is no rush.',
      'Still thinking? Look for checks and captures first.',
      'Need a hint? The hint button is right here.',
      'No hurry. The best players think before they move.',
    ],
    patternStruggle: [
      'I notice {tag} puzzles have been tricky for you. Watch what cannot move.',
      '{tag} patterns take practice. Focus on the defender.',
      'You will get {tag} positions — keep at it. They click with repetition.',
    ],
    customPuzzle: [
      'Interesting position. Let me analyze it for you.',
      'Let us see what Stockfish thinks about this setup.',
      'An original creation! I will find the best move.',
    ],
    returnVisit: [
      'Welcome back! Ready to continue where we left off?',
      'Good to see you again. Let us keep improving.',
      'You are back! Your current streak is {streak}.',
    ],
  },

  getLine(category, replacements = {}) {
    const pool = this.dialogue[category];
    if (!pool || pool.length === 0) return '';
    let line = pool[Math.floor(Math.random() * pool.length)];
    for (const [key, value] of Object.entries(replacements)) {
      line = line.replace(`{${key}}`, value);
    }
    return line;
  },

  getMoveQualityLine(quality) {
    const map = {
      brilliant: 'brilliant',
      good: 'good',
      inaccuracy: 'inaccuracy',
      mistake: 'blunder',
      blunder: 'blunder',
    };
    return this.getLine(map[quality] || 'good');
  },

  getHintLine(hintIndex, replacements = {}) {
    const category = hintIndex <= 0 ? 'hint1' : hintIndex === 1 ? 'hint2' : 'hint3';
    return this.getLine(category, replacements);
  },
};
