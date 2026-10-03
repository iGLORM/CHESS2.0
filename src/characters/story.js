// The script of "The Shattered Board": cutscenes played by StoryScene.
//
//   bg     theme whose painted scene is the backdrop (a beat can change it)
//   beats  in order; `who` is a character id, 'narrator', or an extra speaker
//          from STORY_SPEAKERS. `fx` plays an effect as the beat starts:
//          crystal, fragment, crack, shatter, fragments, fuse, title (or a list).
//          `mood` sets a live character's expression for that line (see its moods).
//
// The mystery: for an age the world has been splitting apart, crack by crack.
// Then you fell into Pawn Hollow with a fragment, and the splitting stopped.
// Every guardian you beat gives you a clue and sends you on to the next one
// for something they hold (a key, a map, a poster). Some guardians are on your
// side (Bish-Bosh, the Knight of the Mist, the EndGamer: they fight you only
// because what a guardian keeps leaves them only when they lose); the others serve
// Grandmaster X (the First Piece), who has been breaking the Great Board so no
// piece could cross it, and broke it all at once when you nearly did.
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
  // The world has been splitting apart for an age. It stopped the night you fell.
  prologue: {
    bg: 'pawnhollow',
    beats: [
      { who: 'narrator', text: 'For as long as anyone can remember, the world has been coming apart. Every year the rifts grow wider, and the lands drift further from each other.' },
      { who: 'narrator', text: 'You wake in the hay behind a windmill. You do not remember your name. In your hand is a shard of glowing board.', fx: 'fragment' },
      { who: 'pawnie', mood: 'surprised', text: "You're awake! I'm Pawnie. You fell out of the sky three nights ago, right into our village, holding that." },
      { who: 'pawnie', mood: 'nervous', text: "And since you landed, the world has stopped breaking. Not one new crack, anywhere. That hasn't happened since before my grandpa's grandpa." },
      { who: 'pawnie', mood: 'nervous', text: 'So whoever you are... you matter. The Great Board broke into four pieces. You hold one. The other three are kept by guardians, out past the rifts. Some are kind, some are not. One of them must know who you are.' },
      { who: 'pawnie', mood: 'happy', text: "But first, let's see if you remember how to play. One normal game, no challenges. Ready?" },
    ],
  },

  // The Camp notices you learn too fast; Pawnie sends you to a friend.
  handover: {
    bg: 'trainingcamp',
    beats: [
      { who: 'senseitactic', mood: 'intrigued', text: 'You do not learn like a beginner. You learn like someone remembering.' },
      { who: 'pawnie', mood: 'nervous', text: "I'll keep your fragment safe here... no. It's yours. It was always yours. Take it.", fx: 'fragment' },
      { who: 'pawnie', mood: 'happy', text: "I'm staying in the Hollow. If it's still whole because of you, someone should be here when you come home." },
      { who: 'pawnie', mood: 'happy', text: "Go to the Slanted Sands first. Bish-Bosh is the only guardian who still sends us letters. He's a friend, in his own tilted way." },
    ],
  },

  // Interludes, keyed by the stage just beaten: the loser gives a clue and sends
  // you on for something the next guardian holds; then the next one speaks.
  after7: {
    bg: 'slantedsands',
    beats: [
      { who: 'bishbosh', mood: 'shocked', text: 'Wait. Wait wait wait. I KNOW that walk. You crossed my sands before, the night the sky cracked!' },
      { who: 'bishbosh', mood: 'gleeful', text: 'Sorry about the four bishops. What a guardian keeps only leaves them when they lose. Oldest rule of the Board. I WANTED to lose. Mostly.' },
      { who: 'bishbosh', mood: 'scheming', text: 'You want answers? My old friend the Knight of the Mist sees everything from the Misty Moors. But the only road there runs through the Iron Keep.' },
      { who: 'bishbosh', mood: 'huffy', text: "Rook-E holds the key to that road. He won't hand it over. He takes orders from somebody, and he never says who." },
      { who: 'rokee', mood: 'stern', bg: 'ironkeep', text: "Bish-Bosh talks too much. If that is who I think it is, the Iron Keep's gates stay shut." },
    ],
  },
  after8: {
    bg: 'ironkeep',
    beats: [
      { who: 'rokee', mood: 'strained', text: 'I had orders, long before the sky cracked: stop any piece that tries to cross. You got past me that night as well.' },
      { who: 'rokee', mood: 'stern', text: 'Take the Iron Key, by right of siege. The road to the Moors is open. But my orders came sealed, and my brother CastlE keeps the seal.' },
      { who: 'knightsade', mood: 'watching', bg: 'mistymoors', text: "*from the fog* ... So Bish-Bosh sent you. Good. I have waited a long time. Find me in my mist, and I'll tell you what I saw." },
    ],
  },
  after9: {
    bg: 'mistymoors',
    beats: [
      { who: 'knightsade', mood: 'revealed', text: '*the mist parts* ... I saw it happen. You were three ranks from the far edge when the board broke under your feet.' },
      { who: 'knightsade', mood: 'sly', text: 'The guardians all pretend to serve the Grandmaster. I only pretend better. And I know what they hide: a map of your crossing, every step you took.' },
      { who: 'knightsade', mood: 'watching', text: 'Queenie keeps it in her palace, far to the south across the sea, where the great desert begins. Take my lantern. It shows what people try to hide.' },
      { who: 'queenie', mood: 'smug', bg: 'royalpalace', text: 'A map? In MY palace? Darling, I have no idea what that hooded gossip is talking about.' },
    ],
  },
  after10: {
    bg: 'royalpalace',
    beats: [
      { who: 'queenie', mood: 'outraged', text: 'Fine! Grandmaster X gave me this palace to keep that map hidden. He was terrified of you, darling. Of YOU.' },
      { who: 'queenie', mood: 'panicked', text: "But I don't have it any more! CastlE came for it. It's locked in the Clockwork Citadel now, behind walls he built for one piece only." },
      { who: 'castle', mood: 'stern', bg: 'clockworkcitadel', text: 'Queenie always did sell secrets cheaply. My brother failed at the Keep. My walls will not. They were built for you.' },
    ],
  },
  after11: {
    bg: 'clockworkcitadel',
    beats: [
      { who: 'castle', mood: 'resigned', text: 'The walls have fallen. They were never going to hold you twice.' },
      { who: 'castle', mood: 'rattled', text: 'The map? Gone. The EndGamer borrowed it, and he never returns anything. It is in the Grand Library, across the ocean.' },
      { who: 'endgamer', mood: 'calm', bg: 'grandlibrary', text: 'I have a book about you. Chapter one: a piece begins to cross. Final chapter: the board breaks.' },
      { who: 'endgamer', mood: 'intrigued', text: 'Your map is here, and safe. I took it before the Grandmaster could burn it. Win it from me, and every page is yours.' },
    ],
  },
  after12: {
    bg: 'grandlibrary',
    beats: [
      { who: 'endgamer', mood: 'grave', text: 'Read what your map shows. The world did not split by accident. For an age, someone has been breaking it, one crack at a time, so no piece could cross.' },
      { who: 'endgamer', mood: 'grave', text: 'You nearly did. So he broke it all at once, with you on it. And when you fell, the breaking stopped. The board had already chosen you.' },
      { who: 'endgamer', mood: 'pleased', text: "You will need proof of who did it. ForkMaster carries the bounty he was paid to hunt you with. Take it from him." },
      { who: 'forkmaster', mood: 'smug', bg: 'forkedgulch', text: "The bookworm's right for once. There's a bounty on your head, partner, and I aim to collect it." },
    ],
  },
  after13: {
    bg: 'forkedgulch',
    beats: [
      { who: 'forkmaster', mood: 'impressed', text: 'Alright, alright. Here, take the poster. Signed at the bottom: Grandmaster X. He wants you stopped before you reach the edge. Again.' },
      { who: 'forkmaster', mood: 'rattled', text: 'Free advice: Checkmate works for him. He guards the last road at the Obsidian Court, and nobody gets past his hourglass.' },
      { who: 'checkmate', mood: 'grim', bg: 'obsidiancourt', text: 'The breaking should have finished you. It only took your memory. I will finish the job.' },
      { who: 'checkmate', mood: 'amused', text: 'Forty moves. Then the sand runs out, and this time you stay down.' },
    ],
  },
  after14: {
    bg: 'obsidiancourt',
    beats: [
      { who: 'checkmate', mood: 'shaken', text: 'The sand has never stopped for anyone. It stopped for you. Go. He is waiting.' },
      { who: 'grandmasterx', mood: 'contempt', bg: 'crystal', text: 'You. I spent an age breaking this world so that no one could cross it, and you walked straight back in.' },
      { who: 'grandmasterx', mood: 'cold', text: 'One square from the edge. That is where you were. Come and finish it, if you can.' },
    ],
  },

  // On the roads: a wandering rival blocks the way to the next guardian
  // (SideContent: `road_<id>` before the first match, `roadwon_<id>` after the first win),
  // and the Arena guards the road to the Obsidian Court.
  road_saltbeard: {
    bg: 'ironkeep',
    beats: [
      { who: 'narrator', text: 'The road north to the Iron Keep runs down to the Middle Sea. A ship with patched red sails is moored across the only ferry.' },
      { who: 'saltbeard', text: "Arr! This sea's been mine since the rifts split the shore. Every piece that crosses pays Salt-Beard's toll." },
      { who: 'saltbeard', text: "No coin? Then ye pay in challenges. Every capture, a fight. Beat me, and the ferry's yours." },
    ],
  },
  roadwon_saltbeard: {
    bg: 'ironkeep',
    beats: [
      { who: 'saltbeard', text: "Sunk by a landlubber! Fine, fine. The ferry's yours." },
      { who: 'saltbeard', text: "A word, since ye beat me fair: the Keep's gate has been shut since the night the sky cracked. Rook-E has orders to stop anyone crossing. Whose orders, he never says." },
    ],
  },
  road_frostbite: {
    bg: 'clockworkcitadel',
    beats: [
      { who: 'narrator', text: 'Past the Iron Keep the road climbs into the high passes. Snow falls, though it is summer. In the middle of the path sits a very old, very cold pawn.' },
      { who: 'frostbite', text: 'Brr. The pass is frozen, and so am I. I froze the night the Great Board broke. I have not moved since.' },
      { who: 'frostbite', text: 'Nobody crosses my pass unless they can play around my ice. Two blocks, right in the middle. Mind them.' },
    ],
  },
  roadwon_frostbite: {
    bg: 'mistymoors',
    beats: [
      { who: 'frostbite', text: 'Hm. You warmed me up. First time in an age.' },
      { who: 'frostbite', text: 'The Misty Moors are below. The Knight in the fog saw more than anyone that night. Listen to him. He only lies to his enemies.' },
    ],
  },
  road_tidewitch: {
    bg: 'mistymoors',
    beats: [
      { who: 'narrator', text: "The Moors end at a grey sea. Somewhere south, past the mist, lies Queenie's palace. On a rock above the water, someone is singing." },
      { who: 'tidewitch', text: 'The tide brings me travellers, and the mist keeps them. The sea between here and the palace is mine.' },
      { who: 'tidewitch', text: 'The middle of the board is under my mist. Win through it, and the waves will carry you south.' },
    ],
  },
  roadwon_tidewitch: {
    bg: 'royalpalace',
    beats: [
      { who: 'tidewitch', text: 'The mist parts for you. It has never done that before.' },
      { who: 'tidewitch', text: 'Queenie pays me to keep this sea closed. She is afraid of something, little crossing piece. I think she is afraid of you.' },
    ],
  },
  road_dunejester: {
    bg: 'slantedsands',
    beats: [
      { who: 'narrator', text: 'From the Palace the road runs east across the great desert, toward the Clockwork Citadel. A striped silk tent stands right in the way. A bell jingles inside.' },
      { who: 'dunejester', text: 'Ha-HA! A visitor! I am the Dune Jester, and this road is my stage. Nobody passes without laughing first.' },
      { who: 'dunejester', text: 'My joke? I swapped everyone around while you slept. Your bishops jump now. My knights slide. Good luck, sleepyhead!' },
    ],
  },
  roadwon_dunejester: {
    bg: 'clockworkcitadel',
    beats: [
      { who: 'dunejester', text: 'You juggled four knights and did not drop one! Fine, the road is yours.' },
      { who: 'dunejester', text: "A tip, free of charge: CastlE's walls were built for ONE piece only. Everyone in the desert knows which. Ha... you don't? Oh. Oh dear." },
    ],
  },
  road_pacificghost: {
    bg: 'obsidiancourt',
    beats: [
      { who: 'narrator', text: 'The Grand Library lies across the ocean. Halfway over, the sea goes still, and a pale lantern swings above the water.' },
      { who: 'pacificghost', text: 'Ooooh. I have sailed this ocean since before the board broke. I saw you fall, you know. A little light, dropping out of the sky.' },
      { who: 'pacificghost', text: 'Forty moves, traveller. Mate me in forty, or drift with me for ever.' },
    ],
  },
  roadwon_pacificghost: {
    bg: 'grandlibrary',
    beats: [
      { who: 'pacificghost', text: 'Mated... by the living. How refreshing.' },
      { who: 'pacificghost', text: 'Go on to the Library. The EndGamer keeps a book about you. Read the last chapter first. Endings are where the truth hides.' },
    ],
  },
  road_junglejack: {
    bg: 'forkedgulch',
    beats: [
      { who: 'narrator', text: 'South of the Gulch, the canyon turns to jungle. Every vine forks two ways, and something big swings from branch to branch.' },
      { who: 'junglejack', text: 'Ooo-ooo! The Obsidian Court is past my jungle. Nobody gets there without getting forked.' },
      { who: 'junglejack', text: 'In my jungle, when one piece hits two, it takes both. Watch your pieces!' },
    ],
  },
  roadwon_junglejack: {
    bg: 'obsidiancourt',
    beats: [
      { who: 'junglejack', text: 'You swung past every fork! The jungle opens for you.' },
      { who: 'junglejack', text: 'But the Court is guarded twice. Checkmate lets in nobody who has not proved themselves in the Arena. Go to the red sands of the south.' },
    ],
  },
  arena_intro: {
    bg: 'obsidiancourt',
    beats: [
      { who: 'narrator', text: 'In the red sands of the south stands the Arena, older than the rifts. The guardians you have beaten sit in its stands, and wait.' },
      { who: 'checkmate', mood: 'grim', text: 'My Court opens only to one who wins here three times in a row. Those are my terms. They have never been met.' },
      { who: 'narrator', text: 'The guardians you beat come down, one after another, each with their own rule. Lose once, and the streak starts over.' },
    ],
  },
  arena_won: {
    bg: 'obsidiancourt',
    beats: [
      { who: 'narrator', text: 'Three in a row. The old guardians rise to their feet, and the Arena shakes.' },
      { who: 'checkmate', mood: 'grim', text: 'Three. As agreed. The Obsidian Court is open. Come, then, and bring your time with you. You will need all of it.' },
    ],
  },

  // The First Piece broke the board, slowly and then all at once, to stop anyone
  // crossing; you finish the crossing.
  ending: {
    bg: 'crystal',
    beats: [
      { who: 'narrator', text: "The third checkmate lands. Grandmaster X's crystal cracks from crown to base...", fx: ['crystal', 'crack'] },
      { who: 'narrator', text: '...and shatters. Inside stands one small, very old pawn.', fx: 'shatter' },
      { who: 'firstpiece', mood: 'weary', text: 'I was the first piece ever to cross the Great Board. It chose me as its Guardian. I guarded it alone, for an age.' },
      { who: 'firstpiece', mood: 'remorse', text: 'I grew afraid that someone would cross and take my place. So I began to break it, crack by crack, world by world, so no one ever could.' },
      { who: 'firstpiece', mood: 'remorse', text: 'Then you came, and you almost reached the edge. I broke it all at once, with you on it. The moment you fell, it stopped breaking. It had chosen you.' },
      { who: 'firstpiece', mood: 'remorse', text: 'You lost your memory. The Hollow kept you safe. I lost everything else.' },
      { who: 'narrator', text: 'The four fragments rise from your hands and lock together.', fx: 'fragments' },
      { who: 'narrator', text: 'You take the last step and reach the far edge. The Great Board wakes, and the worlds drift home into one land.', fx: 'fuse', bg: 'pawnhollow' },
      { who: 'narrator', text: 'In Pawn Hollow, Pawnie looks up at a whole sky. Far away, Bish-Bosh, the Knight of the Mist and the EndGamer look up too.' },
      { who: 'firstpiece', mood: 'peace', text: 'It chose you. Just... do not guard it alone, like I did.' },
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
    if (STORY_SPEAKERS[who]) {
      // Extra speakers with live art (src/themes/scenes/char_<id>.js) get a portrait card too.
      const live = typeof LiveScenes !== 'undefined' && LiveScenes.character(who);
      return { id: who, ...STORY_SPEAKERS[who], portrait: !!live };
    }
    const ch = STORY_STAGES.find(c => c.id === who);
    if (ch) return { id: ch.id, name: ch.name, colors: ch.colors, portrait: true };
    // Wandering rivals stand as their piece.
    const rival = typeof SideContent !== 'undefined' && SideContent.rival(who);
    if (rival) return { id: rival.id, name: rival.name, piece: rival.piece, colors: rival.colors };
    return { id: who, name: who };
  },
};
