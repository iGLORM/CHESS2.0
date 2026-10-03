// Story stars: every story stage gives 1 to 3 stars. The first is for winning (or
// passing a trainer's test); the other two are objectives that fit the opponent.
// A save keeps the best result per stage in save.stars[characterId] ([won, a, b]).
// check(ctx) gets what GameScreen knows at the end of a fight (see StoryStars.context).
const StoryStars = (() => {
  const count = (list, type) => list.filter(p => p && p.type === type).length;
  // Objectives, as small builders so the list below reads like a table.
  const O = {
    keepQueen: () => ({ text: 'Keep your queen', check: c => count(c.lost, 'queen') === 0 }),
    within: n => ({ text: `Win in ${n} moves or fewer`, check: c => c.playerMoves <= n }),
    take: (type, n, text) => ({ text, check: c => count(c.taken, type) >= n }),
    keep: (type, n, text) => ({ text, check: c => count(c.lost, type) <= n }),
    noLostChallenge: () => ({ text: 'Lose no challenge', check: c => c.challenges.lost === 0 }),
    lostAtMost: n => ({ text: `Lose at most ${n} challenges`, check: c => c.challenges.lost <= n }),
    lostPieces: (n, text) => ({ text, check: c => c.lost.length <= n }),
    noMinorLost: () => ({ text: 'Lose no piece (pawns aside)', check: c => c.lost.filter(p => p.type !== 'pawn').length === 0 }),
    promote: () => ({ text: 'Promote a pawn', check: c => c.promoted }),
  };

  const OBJECTIVES = {
    pawnie: [O.keepQueen(), O.within(30)],
    sergeantsquare: [
      { text: 'Solve all ten without a miss', check: c => c.misses === 0 },
      { text: 'Finish the drill in 3 minutes', check: c => c.seconds <= 180 },
    ],
    captaincapture: [O.within(30), O.lostPieces(0, 'Lose no piece')],
    joystick: [
      { text: 'Win 12 on the first try', check: c => (c.trial.firstTry || 0) >= 12 },
      { text: 'Win 16 on the first try', check: c => (c.trial.firstTry || 0) >= 16 },
    ],
    rulekeeper: [
      { text: 'Catch it within 15 moves', check: c => c.playerMoves <= 15 },
      O.lostPieces(2, 'Lose at most 2 pieces'),
    ],
    senseitactic: [O.keepQueen(), O.within(40)],
    bishbosh: [O.take('bishop', 2, 'Capture two of his bishops'), O.keep('bishop', 0, 'Keep both your bishops')],
    rokee: [O.take('rook', 2, 'Capture both his rooks'), O.keepQueen()],
    knightsade: [O.take('knight', 2, 'Capture both his knights'), O.keep('knight', 0, 'Keep both your knights')],
    queenie: [O.take('queen', 2, 'Capture both her queens'), O.noLostChallenge()],
    castle: [{ text: 'Never get a square locked', check: c => c.challenges.lost === 0 }, O.within(40)],
    endgamer: [O.promote(), O.noMinorLost()],
    forkmaster: [{ text: 'Never lose two pieces to one fork', check: c => c.doubleTakes === 0 }, O.keepQueen()],
    checkmate: [{ text: 'Win with 15 moves to spare', check: c => c.playerMoves <= 25 }, O.keepQueen()],
    grandmasterx: [O.lostAtMost(2), O.keepQueen()],
  };

  return {
    MAX_PER_STAGE: 3,
    OBJECTIVES,

    // The three star texts for a story character: the win, then its two objectives.
    texts(ch) {
      const objs = OBJECTIVES[ch.id] || [];
      return [ch.trainer ? 'Pass the test' : 'Win', ...objs.map(o => o.text)];
    },

    has(ch) {
      return !!(ch && OBJECTIVES[ch.id] && !ch.mission);
    },

    // What a fight's end looks like to the objectives. g: the game state
    // ({ won, playerColor, aiColor, moveHistory, capturedPieces, bossState, trial, seconds }).
    context(g) {
      const history = g.moveHistory || [];
      const mine = m => m && m.piece && m.piece.color === g.playerColor && !m.defended;
      return {
        won: !!g.won,
        playerMoves: history.filter(m => m && m.piece && m.piece.color === g.playerColor).length,
        lost: (g.capturedPieces && g.capturedPieces[g.aiColor]) || [],
        taken: (g.capturedPieces && g.capturedPieces[g.playerColor]) || [],
        challenges: { won: 0, lost: 0, ...((g.bossState && g.bossState.challenges) || {}) },
        misses: (g.bossState && g.bossState.misses) || 0,
        seconds: g.seconds === undefined ? Infinity : g.seconds,
        trial: g.trial || { played: 0, won: 0 },
        doubleTakes: history.filter(m => m && m.doubleTake && m.piece && m.piece.color === g.aiColor && !m.defended).length,
        promoted: history.some(m => mine(m) && m.promotion),
      };
    },

    // [won, objective 1, objective 2] for one fight. Objectives only count on a win.
    evaluate(ch, ctx) {
      const objs = OBJECTIVES[ch.id] || [];
      return [ctx.won, ...objs.map(o => ctx.won && !!o.check(ctx))];
    },

    // The best result kept for a character in a save ([false, false, false] if none).
    best(save, id) {
      const s = save && save.stars && save.stars[id];
      return [0, 1, 2].map(i => !!(s && s[i]));
    },

    // Merges a fight's result into the save's best. Returns { best, fresh } where
    // fresh marks the stars earned for the first time.
    merge(save, id, result) {
      const old = this.best(save, id);
      const best = old.map((v, i) => v || !!result[i]);
      const fresh = best.map((v, i) => v && !old[i]);
      return { best, fresh, stars: { ...((save && save.stars) || {}), [id]: best } };
    },

    countFor(save, id) {
      return this.best(save, id).filter(Boolean).length;
    },

    // Stars in a save over a list of story characters (default: all of them).
    total(save, chars = typeof STORY_STAGES !== 'undefined' ? STORY_STAGES : []) {
      return chars.reduce((n, ch) => n + this.countFor(save, ch.id), 0);
    },

    max(chars = typeof STORY_STAGES !== 'undefined' ? STORY_STAGES : []) {
      return chars.length * this.MAX_PER_STAGE;
    },
  };
})();

if (typeof module !== 'undefined') module.exports = StoryStars;
