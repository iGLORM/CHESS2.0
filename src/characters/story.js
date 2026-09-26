// The script of "The Shattered Board": cutscenes played by StoryScene.
//
//   bg     theme whose painted scene is the backdrop (a beat can change it)
//   beats  in order; `who` is a character id, 'narrator', or an extra speaker
//          from STORY_SPEAKERS. `fx` plays an effect as the beat starts:
//          crystal, fragment, crack, shatter, fragments, fuse, title (or a list).
//
// The mystery: you wake in Pawn Hollow with no memory and a fragment. Each
// guardian you beat lets slip a clue: you were the piece crossing the Great
// Board when Grandmaster X (the First Piece) broke it to stop you.
// When they play (StoryScenes.before / after): the prologue before Pawnie's
// first match, the handover after the Training Camp, an interlude after each
// guardian and the ending after Grandmaster X, which leads into the Credits.
const STORY_SPEAKERS = {
  narrator: { name: '', piece: null },
  firstpiece: { name: 'The First Piece', piece: 'pawn', colors: { primary: '#f4f0e8' } },
};

// The piece each character walks onto the board as (StoryScene portraits for
// speakers without art, and GameScreen's walk-on).
const STORY_PIECES = {
  pawnie: 'pawn', bishbosh: 'bishop', rokee: 'rook', knightsade: 'knight', queenie: 'queen',
  castle: 'rook', endgamer: 'king', forkmaster: 'knight', checkmate: 'king', grandmasterx: 'king',
};

const STORY_SCENES = {
  // You wake with no memory. The only clue: the Hollow stopped fading the night you arrived.
  prologue: {
    bg: 'pawnhollow',
    beats: [
      { who: 'narrator', text: 'You wake in the hay behind a windmill. You do not remember your name. You do not remember how you got here.' },
      { who: 'narrator', text: 'In your hand is a shard of glowing board.', fx: 'fragment' },
      { who: 'pawnie', text: "You're awake! I'm Pawnie. You fell out of the sky three nights ago, holding that. The same night the Great Board shattered." },
      { who: 'pawnie', text: 'Every world has been fading since. Every world except Pawn Hollow. It stopped fading the moment you landed here.' },
      { who: 'pawnie', text: "So whoever you are... you matter. Nine guardians hold the other fragments. Maybe one of them knows who you are." },
      { who: 'pawnie', text: "But first, let's see if you remember how to play. One normal game. Ready?" },
    ],
  },

  // The Camp notices you learn too fast.
  handover: {
    bg: 'trainingcamp',
    beats: [
      { who: 'senseitactic', text: 'You do not learn like a beginner. You learn like someone remembering.' },
      { who: 'pawnie', text: "I'll keep your fragment safe here... no. It's yours. It was always yours. Take it.", fx: 'fragment' },
      { who: 'pawnie', text: "I'm staying in the Hollow. If it's still standing because of you, someone should be here when you come home." },
      { who: 'pawnie', text: "Bish-Bosh guards the Slanted Sands. Go get some answers." },
    ],
  },

  // Interludes, keyed by the stage just beaten: the loser lets slip a clue,
  // the next guardian raises the stakes.
  after7: {
    bg: 'ironkeep',
    beats: [
      { who: 'bishbosh', text: 'Wait. Wait wait wait. I KNOW that walk. You crossed my sands before, the night the sky cracked!' },
      { who: 'bishbosh', text: "You were heading for the far edge of the board. Nobody heads for the edge. What were you THINKING?" },
      { who: 'rokee', text: "Bish-Bosh talks too much. If that is who I think it is, the Iron Keep's gates stay shut." },
    ],
  },
  after8: {
    bg: 'mistymoors',
    beats: [
      { who: 'rokee', text: 'I had orders, before the shattering: stop the piece that is crossing. You got past me then as well.' },
      { who: 'rokee', text: 'Whose orders? I swore not to say. But I think you will find out.' },
      { who: 'knightsade', text: "*from the fog* ... Every guardian is whispering about you now, and you still don't know your own name." },
    ],
  },
  after9: {
    bg: 'royalpalace',
    beats: [
      { who: 'knightsade', text: '*the mist parts* ... I saw it happen. You were three ranks from the far edge when the board broke under your feet.' },
      { who: 'queenie', text: 'Three ranks? Nobody gets that close, darling. Nobody except...' },
      { who: 'queenie', text: '...oh. Oh no. It is YOU. Guards! Hide the fragment! And somebody warn the Grandmaster!' },
    ],
  },
  after10: {
    bg: 'clockworkcitadel',
    beats: [
      { who: 'queenie', text: 'Fine. Grandmaster X gave me this palace to keep quiet. He was terrified of you, darling. Of YOU.' },
      { who: 'queenie', text: 'He said if you ever reached the edge, the board would choose you, and he would be nothing at all.' },
      { who: 'castle', text: 'Queenie always did sell secrets cheaply. My walls were not built to keep invaders out. They were built for one piece. You.' },
    ],
  },
  after11: {
    bg: 'grandlibrary',
    beats: [
      { who: 'castle', text: 'The walls have fallen. They were never going to hold you twice.' },
      { who: 'endgamer', text: 'I have a book about you. Chapter one: a piece begins to cross. Final chapter: the board breaks.' },
      { who: 'endgamer', text: 'Every page in between is blank. I have always wondered who would fill them in.' },
    ],
  },
  after12: {
    bg: 'forkedgulch',
    beats: [
      { who: 'endgamer', text: "Here is the page you are missing: the board did not break by accident. Someone broke it. With you standing on it." },
      { who: 'forkmaster', text: "The bookworm's right for once. And there's a bounty on your head, partner. Posted by the one who did it." },
    ],
  },
  after13: {
    bg: 'obsidiancourt',
    beats: [
      { who: 'forkmaster', text: "Bounty's signed: Grandmaster X. He wants you stopped before you reach the edge. Again." },
      { who: 'checkmate', text: 'The shattering should have finished you. It only took your memory. I will finish the job.' },
      { who: 'checkmate', text: 'Forty moves. Then the sand runs out, and this time you stay down.' },
    ],
  },
  after14: {
    bg: 'crystal',
    beats: [
      { who: 'checkmate', text: 'The sand has never stopped for anyone. It stopped for you. Go. He is waiting.' },
      { who: 'grandmasterx', text: 'You. I broke the whole world to stop you, and you walked straight back into it.' },
      { who: 'grandmasterx', text: 'One square from the edge. That is where you were. Come and finish it, if you can.' },
    ],
  },

  // The First Piece broke the board to stop you crossing; you finish the crossing.
  ending: {
    bg: 'crystal',
    beats: [
      { who: 'narrator', text: "The third checkmate lands. Grandmaster X's crystal cracks from crown to base...", fx: ['crystal', 'crack'] },
      { who: 'narrator', text: '...and shatters. Inside stands one small, very old pawn.', fx: 'shatter' },
      { who: 'firstpiece', text: 'I was the first piece ever to cross the Great Board. It chose me as its Guardian. I guarded it alone, for an age.' },
      { who: 'firstpiece', text: 'Then you came, and you were going to reach the edge. It would choose you. So I broke it, with you on it.' },
      { who: 'firstpiece', text: 'You lost your memory. The Hollow kept you safe. I lost everything else.' },
      { who: 'narrator', text: 'The ten fragments rise from your hands and lock together.', fx: 'fragments' },
      { who: 'narrator', text: 'You take the last step and reach the far edge. The Great Board wakes, and the worlds drift home into one land.', fx: 'fuse', bg: 'pawnhollow' },
      { who: 'firstpiece', text: 'It chose you. Just... do not guard it alone, like I did.' },
      { who: 'narrator', text: 'You remember now. You are the Guardian of the Great Board.', fx: 'title' },
    ],
  },
};

const StoryScenes = {
  // Scene to play before a stage starts (first time only), or null.
  before(save, stage) {
    return stage === 1 && !this.seen(save, 'prologue') ? 'prologue' : null;
  },

  // Scene to play after a first win on a stage, or null.
  after(stage) {
    if (stage === 6) return 'handover';
    if (stage === STORY_STAGES.length) return 'ending';
    return STORY_SCENES['after' + stage] ? 'after' + stage : null;
  },

  seen(save, id) {
    return !!(save && save.seenScenes && save.seenScenes.includes(id));
  },

  markSeen(id) {
    const save = store.getActiveSave();
    if (!save || this.seen(save, id)) return;
    store.setActiveSave({ seenScenes: [...(save.seenScenes || []), id] });
    store.saveProgress();
  },

  speaker(who) {
    if (STORY_SPEAKERS[who]) return { id: who, ...STORY_SPEAKERS[who] };
    const ch = STORY_STAGES.find(c => c.id === who);
    return ch ? { id: ch.id, name: ch.name, colors: ch.colors, portrait: true } : { id: who, name: who };
  },
};
