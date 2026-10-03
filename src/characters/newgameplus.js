// New Game+: unlocked by finishing the story. The save starts over with the Great
// Board whole: the freed First Piece (Grandmaster X's true self) is the first
// opponent at full strength, the Training Camp and the world missions are skipped,
// and each guardian also plays with the previous guardian's rule, one level stronger.
// A save in New Game+ has save.ngPlus = true; save.ngCleared once the run is won.
const NewGamePlus = {
  // Each guardian's extra rule: the guardian before it on the journey.
  STACK: {
    rokee: 'bishbosh', knightsade: 'rokee', queenie: 'knightsade', castle: 'queenie',
    endgamer: 'castle', forkmaster: 'endgamer', checkmate: 'forkmaster', grandmasterx: 'checkmate',
  },

  // New greetings: they remember you, and the board is whole.
  GREETINGS: {
    bishbosh: "You again! Crowned and everything. The sands still lean my way, though. Let's see if the Guardian can walk straight.",
    rokee: "Guardian. My gate is rebuilt, and I have borrowed Bish-Bosh's bishops for it. You enter without rooks, as before.",
    knightsade: "*the mist parts a little* ...The board chose well. But the Moors keep their fog, and tonight my riders fight without their rooks.",
    queenie: "Darling, you came back to visit! My court is bigger now, and the mist followed you in. Try to keep up.",
    castle: "The Citadel was rebuilt stronger. Walls, locks, and two queens at the gate. A proper siege, at last.",
    endgamer: "The ending again, Guardian, and the gear walls are still in the way. I have read how your story ends. Let us check the proof.",
    forkmaster: "Well, if it isn't the Guardian. Endgame rules, double-take rules. Out here we don't pick one, partner.",
    checkmate: "The sand has been turned again. Forty moves, and every fork of mine takes two. The sentence stands.",
    grandmasterx: "No crystal this time. Only the lesson I never finished teaching: forty moves, every capture a test. Crack me three times.",
  },

  // The freed First Piece: plain chess at full strength, as a friend.
  FIRST_PIECE: {
    id: 'firstpiece',
    name: 'The First Piece',
    title: 'The Freed Guardian',
    level: 10,
    piece: 'pawn',
    personality: 'serious',
    colors: { primary: '#f4f0e8', secondary: '#9a8ae0', skin: '#fff4dc', eye: '#8ad4ff', pupil: '#1a1a2a' },
    dialogue: {
      before: "The board is whole, and I am only a pawn again. Will you cross it once more? Then play me first. No tricks. Just chess, as it was before any of this.",
      after: "Still the Guardian. Go on, then. They are all waiting for you, and they have learned new tricks.",
      win: "Once more. I had an age to practise, remember? Again, when you are ready.",
      rematch: "Back so soon. Good. I waited much longer than this for you the first time.",
    },
    gameDialogue: {
      gameStart: ['Just chess. Show me.', 'I have not played for fun in an age.'],
      bossCapture: ['Your {piece}. I remember that trap. I invented it.', 'Your {piece}. Gently taken.'],
      playerCapture: ['My {piece}. Well played.', 'Ah, my {piece}. You have grown.'],
      bossCheck: ['Check. Just a nudge.'],
      playerCheck: ['Check! Good. Again.'],
    },
  },

  active(save) {
    return !!(save && save.ngPlus);
  },

  // A finished story (and not already on a New Game+ run that is still going).
  available(save) {
    return !!(save && save.completed && (!save.ngPlus || save.ngCleared));
  },

  // Starts (or restarts) a run on the active save. Stars, records and themes stay.
  start() {
    store.setActiveSave({ ngPlus: true, ngCleared: false, maxUnlockedLevel: 1, storyLevel: 1, selectedCharacter: null });
    store.saveProgress();
  },

  // The character standing on a stage: the First Piece takes Pawnie's place.
  character(stageOrId, save) {
    if (stageOrId === 'firstpiece') return this._firstPiece();
    const ch = STORY_STAGES[stageOrId - 1];
    return this.active(save) && stageOrId === 1 ? this._firstPiece() : ch;
  },

  _firstPiece() {
    if (!this._fp) {
      this._fp = { ...this.FIRST_PIECE, stage: 1, theme: WORLDS[0].art, world: WORLDS[0] };
    }
    return this._fp;
  },

  // The rule a guardian plays with on this run.
  rule(ch, save) {
    const base = BossRules.get(ch.id);
    if (!this.active(save) || ch.trainer || ch.mission) return base;
    const extra = this.STACK[ch.id];
    return extra ? BossRules.stack(base, BossRules.get(extra)) : base;
  },

  // One level stronger, and no easing for a twist.
  aiLevel(level) {
    return Math.min(12, level + 1);
  },

  // After a win on a run: the next stage (the Training Camp is skipped).
  nextStage(stage) {
    return stage === 1 ? 7 : stage + 1;
  },

  greeting(ch, save) {
    return this.active(save) ? this.GREETINGS[ch.id] || null : null;
  },
};
