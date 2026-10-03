// Side content on the world map, all played through SideMatches:
//
// - Wandering rivals: six travelling players camped on the roads between the worlds,
//   each with their own twist. Each one blocks the road to a guardian (`gate`, the
//   stage behind them): beat them once to pass, and they leave the map.
// - Side quests: the guardians on your side (Bish-Bosh, the Knight of the Mist and
//   the EndGamer) each ask a favour after you beat them: three matches in a row
//   with a story reward at the end.
// - The Arena (in Australia): a gauntlet of the guardians you have beaten, one
//   after another with their own rules; the run ends at the first loss.
//
// Progress lives in the story save: save.rivals { id: tier beaten }, save.quests
// { guardianId: steps done }, save.arena { best, run }.
const RIVALS = [
  {
    id: 'saltbeard', name: 'Salt-Beard', title: 'Pirate of the Middle Sea', piece: 'rook', theme: 'ironkeep',
    at: [80, 97], gate: 8, level: 2, colors: { primary: '#5ab0e0', secondary: '#1e4a7a' },
    rule: { title: 'Boarding Party', lines: ['Every capture starts a challenge, for both of you.'], everyCapture: true },
    lines: {
      before: 'Arr! Nobody sails the Middle Sea without paying Salt-Beard. Every piece ye take, ye fight for!',
      after: 'Sunk by a landlubber! Fine, take the toll. But I will be back with a bigger ship.',
      win: 'Overboard with ye! Come back when ye can swim.',
    },
  },
  {
    id: 'dunejester', name: 'The Dune Jester', title: 'Trickster of the Sands', piece: 'bishop', theme: 'slantedsands',
    at: [141, 116], gate: 11, level: 5, colors: { primary: '#ffb040', secondary: '#8a3a1a' },
    rule: { title: 'Knights Against Bishops', lines: ['Your bishops became knights, and his knights became bishops.', 'Four knights against four bishops.'],
      twisted: true, fen: 'rbbqkbbr/pppppppp/8/8/8/8/PPPPPPPP/RNNQKNNR w KQkq - 0 1' },
    lines: {
      before: 'Ha-HA! I swapped everyone around while you slept. Your bishops jump now. Mine slide. Good luck, sleepyhead!',
      after: 'You juggled four knights and did not drop one! I shall think of a nastier joke.',
      win: 'The joke is on you! Ha-HA!',
    },
  },
  {
    id: 'frostbite', name: 'Frostbite', title: 'Hermit of the Ice', piece: 'pawn', theme: 'clockworkcitadel',
    at: [52, 57], gate: 9, level: 3, colors: { primary: '#c8f0ff', secondary: '#4a7a9a' },
    rule: { title: 'Ice Blocks', lines: ['Two blocks of ice stand on d5 and e4. Nothing can stop on them or slide through; knights jump over.'],
      twisted: true, walls: [{ row: 3, col: 3 }, { row: 4, col: 4 }] },
    lines: {
      before: 'Brr. Visitors. Mind the ice. It does not melt, and it does not move, and neither do I.',
      after: 'You thawed me out a little. Come back when it is colder.',
      win: 'Frozen solid. Warm up and try again.',
    },
  },
  {
    id: 'tidewitch', name: 'The Tide Witch', title: 'Mist over the Deep', piece: 'queen', theme: 'mistymoors',
    at: [44, 80], gate: 10, level: 4, colors: { primary: '#6ae0c8', secondary: '#1a4a5a' },
    rule: { title: 'Sea Mist', lines: ['Mist lies over the middle four ranks. You only see there what your pieces touch.'],
      twisted: true, fog: true, fogRows: [2, 3, 4, 5] },
    lines: {
      before: 'The tide brings me travellers, and the mist keeps them. Let us see what you can see.',
      after: 'The mist parts for you. The tide will turn again.',
      win: 'Lost at sea. The tide always wins in the end.',
    },
  },
  {
    id: 'junglejack', name: 'Jungle Jack', title: 'Vine Swinger', piece: 'knight', theme: 'forkedgulch',
    at: [606, 200], gate: 14, level: 7, colors: { primary: '#7ad84a', secondary: '#2a5a1a' },
    rule: { title: 'Double Take', lines: ['If one of his pieces attacks two of your queen, rooks, bishops or knights and takes one, he takes BOTH.'],
      twisted: true, doubleTake: true },
    lines: {
      before: 'Ooo-ooo! In my jungle every vine forks two ways. Watch your pieces!',
      after: 'You swung past every fork! Next time I bring more vines.',
      win: 'Two for one! The jungle provides.',
    },
  },
  {
    id: 'pacificghost', name: 'The Pacific Ghost', title: 'Lantern on the Waves', piece: 'king', theme: 'obsidiancourt',
    at: [412, 137], gate: 12, level: 6, colors: { primary: '#b8a8ff', secondary: '#3a2a6a' },
    rule: { title: 'The Ghost Clock', lines: ['Checkmate him within 40 of your moves, or the ghost takes the game.'], twisted: true, moveLimit: 40 },
    lines: {
      before: 'Ooooh. I have sailed this ocean since before the board broke. Forty moves, traveller. Then you drift with me.',
      after: 'Mated... by the living. How refreshing. I will haunt you again soon.',
      win: 'Forty moves gone. Drift with me a while.',
    },
  },
];

// Side quests: favours asked by the guardians on your side, three steps each.
const QUESTS = {
  bishbosh: {
    name: 'The Lost Diagonal', world: 'slantedsands', at: [16, -14], reward: { coins: 80, stars: 3, item: 'paint_sunset' },
    intro: "Psst! Somebody stole my favourite diagonal. The long one, a1 to h8. Help me get it back? I'll owe you. I'll owe you a LOT.",
    steps: [
      { name: 'Bishling Again', title: "Bish-Bosh's Apprentice", piece: 'bishop',
        rule: { title: 'Bishops Only', lines: ['Kings, pawns and bishops. Nothing else.'], twisted: true, fen: '2b1kb2/pppppppp/8/8/8/8/PPPPPPPP/2B1KB2 w - - 0 1', noChallenges: true },
        before: 'Master says you are helping him? Then show me. Bishops only!', after: 'You slide better than me! Go on, the thief went east.', win: 'Ha! Diagonal-ed!' },
      { name: 'The Sand Thief', title: 'Stealer of Lines', piece: 'knight',
        rule: { title: 'Stolen Lines', lines: ['The thief has four knights and no bishops: he hid every diagonal.'], twisted: true, fen: 'rnnqknnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
        before: 'Diagonals? Never heard of them. I only jump. Heh.', after: 'Fine! The diagonal is buried under the big dune. Take it!', win: 'Jumped you!' },
      { name: 'Bish-Bosh', title: 'The Diagonal Dreamer', face: 'bishbosh',
        rule: { title: 'A Friendly Rematch', lines: ['Four bishops again, and his captures start challenges 60% of the time.', 'Just for fun. Mostly.'], twisted: true,
          fen: 'rbbqkbbr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', bossChallengeChance: 0.6 },
        before: 'You found it! My diagonal! Now... one friendly game with it? For old times?', after: "Best friend ever. Here, take my sunset paint. Your plane will look fabulous.", win: 'Ha! The diagonal likes ME better!' },
    ],
  },
  knightsade: {
    name: 'Lanterns in the Fog', world: 'mistymoors', at: [14, -14], reward: { coins: 90, stars: 3, item: 'paint_mist' },
    intro: '*from the fog* ... Three lanterns went out on the Moors. Without them the fog creeps south. Help me light them.',
    steps: [
      { name: 'Bog Lantern', title: 'Lure of the Marsh', piece: 'bishop',
        rule: { title: 'The First Lantern', lines: ['Mist over ranks 5 to 8. Checkmate the lantern thief.'], twisted: true, fog: true, fogRows: [0, 1, 2, 3] },
        before: '*glowing* ... Come closer. Closer. Into the marsh.', after: '*the lantern flares* ... One lit.', win: '*the light goes out* ...' },
      { name: 'The Hidden Keeper', title: 'Keeper of the Second Lantern', piece: 'knight',
        rule: { title: 'The Second Lantern', lines: ['One of his pieces carries the lantern. Find it in the mist and take it (or checkmate).'],
          twisted: true, fog: true, fogRows: [1, 2, 3], goal: { mystery: true, hintEvery: 3 } },
        before: 'The lantern? Somewhere among my pieces. Guess.', after: 'Two lit. The fog thins.', win: 'Wrong one, traveller.' },
      { name: 'The Knight of the Mist', title: 'The Shadow Lancer', face: 'knightsade',
        rule: { title: 'The Last Lantern', lines: ['Full fog, like before. The Knight plays you for the last lantern.'], twisted: true, fog: true },
        before: '*from the fog* ... The last lantern is mine to give. Win it. Properly, this time.', after: '*the Moors glow* ... All three lit. Take this paint: the colour of a lantern in the mist.', win: '*a whisper* ... Again.' },
    ],
  },
  endgamer: {
    name: 'The Missing Chapters', world: 'grandlibrary', at: [16, -16], reward: { coins: 100, stars: 3, item: 'token_queen' },
    intro: 'Three chapters are missing from my greatest book. Their last pages were endings, played out. Play them for me, and I shall rewrite them.',
    steps: [
      { name: 'Chapter Nine', title: 'An Ending, Played Out', piece: 'pawn',
        rule: { title: 'Crown the Pawn', lines: ['King and pawns against king and pawns. Crown a pawn (or checkmate) to win.'], twisted: true,
          fen: '4k3/pp6/8/8/8/8/PPP5/4K3 w - - 0 1', goal: { promote: true }, noChallenges: true },
        before: 'Chapter nine ends when a pawn becomes a queen. Whose?', after: 'Written. Chapter nine is yours.', win: 'Not quite the ending I remember.' },
      { name: 'Chapter Thirteen', title: 'An Ending, Played Out', piece: 'rook',
        rule: { title: 'Rook Endgame', lines: ['A rook endgame that favours him. Survive 20 of your moves, or win.'], twisted: true, endgames: true, goal: { survive: 20 } },
        before: 'Chapter thirteen is a rook ending. Unlucky number. For you.', after: 'Written. Only one chapter left.', win: 'The ending wins.' },
      { name: 'The EndGamer', title: 'The Patient Scholar', face: 'endgamer',
        rule: { title: 'The Final Chapter', lines: ['Straight to the endgame, like before. The EndGamer plays the last chapter himself.'], twisted: true, endgames: true },
        before: 'The final chapter. I have waited a long time to read how it ends.', after: 'A perfect ending. Take this queen: she stands for you on the map now.', win: 'I shall read it again.' },
    ],
  },
};

const ARENA = {
  // Before the Obsidian Court (stage `gate`) you must win `streak` Arena rounds in a row.
  id: 'arena', name: 'The Arena', at: [286, 238], unlockBeaten: 3, gate: 14, streak: 3,
};

const SideContent = {
  RIVALS,
  QUESTS,
  ARENA,
  TIERS: 3,

  _guardian(id) {
    return STORY_STAGES.find(c => c.id === id);
  },

  /* ----------------------------- rivals ---------------------------- */

  rival(id) {
    return RIVALS.find(r => r.id === id) || null;
  },

  rivalTier(save, id) {
    return Math.min(this.TIERS, ((save && save.rivals) || {})[id] || 0);
  },

  // Rivals appear once your story reaches the road they block, and leave the map once
  // beaten: the road is open.
  rivalVisible(save, rival) {
    if (this.rivalTier(save, rival.id) >= 1) return false;
    if (typeof SuperUser !== 'undefined' && SuperUser.active()) return true;
    return !!save && (save.maxUnlockedLevel || 1) >= rival.gate;
  },

  // The rival blocking the road to a stage, or null.
  gateRival(stage) {
    return RIVALS.find(r => r.gate === stage) || null;
  },

  // Is the road to `stage` open? (Its rival beaten once, and for the Obsidian Court
  // an Arena streak of ARENA.streak.)
  roadOpen(save, stage) {
    const r = this.gateRival(stage);
    if (r && this.rivalTier(save, r.id) < 1) return false;
    if (stage === ARENA.gate && this.arena(save).best < ARENA.streak) return false;
    return true;
  },

  // What still blocks the road to `stage`: { type: 'rival', rival } or { type: 'arena' }, or null.
  roadBlock(save, stage) {
    const r = this.gateRival(stage);
    if (r && this.rivalTier(save, r.id) < 1) return { type: 'rival', rival: r };
    if (stage === ARENA.gate && this.arena(save).best < ARENA.streak) return { type: 'arena' };
    return null;
  },

  // Once the last block on a road falls: the scene to play, and the map travels on.
  _roadCleared(save, stage, scene) {
    if (!this.roadOpen(save, stage) || StoryProgress.isBeaten(save, stage)) return;
    if (typeof StoryScenes !== 'undefined' && STORY_SCENES[scene] && !StoryScenes.seen(save, scene)) store.set('storyScenePending', scene);
    store.set('storyMapEvent', { stage: stage - 1, road: true });
  },

  rivalDef(rival, tier) {
    const t = Math.min(this.TIERS - 1, tier);
    const names = ['', ' II', ' III'];
    return {
      id: `rival_${rival.id}_${t}`,
      name: rival.name + names[t],
      title: t ? `${rival.title} · back, stronger` : rival.title,
      piece: rival.piece,
      level: rival.level + t,
      theme: rival.theme,
      colors: rival.colors,
      rule: { ...rival.rule, lines: [...rival.rule.lines, ...(t ? [`Tier ${t + 1}: he plays ${t} level${t > 1 ? 's' : ''} stronger.`] : [])] },
      dialogue: rival.lines,
      kicker: `WANDERING RIVAL  ·  ${rival.name.toUpperCase()}${t ? `  ·  TIER ${t + 1}` : ''}`,
      winTitle: 'Rival Beaten!',
      reward: { coins: Wallet.REWARDS.rival * (t + 1), stars: 2 },
      once: `rival_${rival.id}_${t}`,
      returnTo: { screen: 'worldMap' },
      onResult: (result) => {
        if (result !== 'win') return;
        const save = store.getActiveSave();
        const now = this.rivalTier(save, rival.id);
        if (t >= now) store.setActiveSave({ rivals: { ...((save && save.rivals) || {}), [rival.id]: Math.min(this.TIERS, t + 1) } });
        if (now === 0) this._roadCleared(store.getActiveSave(), rival.gate, 'roadwon_' + rival.id);
      },
    };
  },

  startRival(id) {
    const rival = this.rival(id);
    if (!rival) return;
    const save = store.getActiveSave();
    const scene = 'road_' + rival.id;
    const first = this.rivalTier(save, id) === 0 && typeof STORY_SCENES !== 'undefined' && STORY_SCENES[scene] && !StoryScenes.seen(save, scene);
    SideMatches.start(this.rivalDef(rival, this.rivalTier(save, id)), first ? { scene } : undefined);
  },

  /* ----------------------------- quests ---------------------------- */

  quest(guardianId) {
    return QUESTS[guardianId] || null;
  },

  questStep(save, guardianId) {
    return Math.min(3, ((save && save.quests) || {})[guardianId] || 0);
  },

  questDone(save, guardianId) {
    return this.questStep(save, guardianId) >= 3;
  },

  // A quest opens once you have beaten the guardian who asks it.
  questOpen(save, guardianId) {
    const g = this._guardian(guardianId);
    if (!g || !QUESTS[guardianId]) return false;
    if (typeof SuperUser !== 'undefined' && SuperUser.active()) return true;
    return StoryProgress.isBeaten(save, g.stage);
  },

  questDef(guardianId, stepIndex) {
    const q = QUESTS[guardianId], g = this._guardian(guardianId);
    const step = q.steps[stepIndex];
    const last = stepIndex === q.steps.length - 1;
    return {
      id: `quest_${guardianId}_${stepIndex}`,
      name: step.name,
      title: step.title,
      piece: step.piece || 'pawn',
      face: step.face || null,
      level: Math.max(1, g.level - (last ? 0 : 1)),
      theme: g.theme,
      colors: g.colors,
      rule: step.rule,
      dialogue: { before: step.before, after: step.after, win: step.win },
      kicker: `SIDE QUEST  ·  ${q.name.toUpperCase()}  ·  ${stepIndex + 1} / ${q.steps.length}`,
      winTitle: last ? 'Quest Complete!' : 'Step Complete!',
      reward: last ? { coins: q.reward.coins, stars: q.reward.stars } : { coins: Wallet.REWARDS.quest },
      once: `quest_${guardianId}_${stepIndex}`,
      returnTo: { screen: 'worldMap' },
      onResult: (result) => {
        if (result !== 'win') return;
        const save = store.getActiveSave();
        const done = this.questStep(save, guardianId);
        if (stepIndex !== done) return;
        store.setActiveSave({ quests: { ...((save && save.quests) || {}), [guardianId]: done + 1 } });
        if (last && q.reward.item) Wallet.grant(q.reward.item);
      },
    };
  },

  startQuest(guardianId) {
    const save = store.getActiveSave();
    const step = this.questStep(save, guardianId);
    // A finished quest can replay its last match.
    SideMatches.start(this.questDef(guardianId, Math.min(step, QUESTS[guardianId].steps.length - 1)));
  },

  /* ----------------------------- arena ----------------------------- */

  // Guardians beaten, in story order: the Arena's opponents.
  arenaRoster(save) {
    const out = [];
    for (let s = 7; s <= STORY_STAGES.length; s++) if (StoryProgress.isBeaten(save, s)) out.push(STORY_STAGES[s - 1]);
    return out;
  },

  arenaUnlocked(save) {
    if (typeof SuperUser !== 'undefined' && SuperUser.active()) return true;
    return this.arenaRoster(save).length >= ARENA.unlockBeaten;
  },

  arena(save) {
    return { best: 0, run: 0, ...((save && save.arena) || {}) };
  },

  arenaDef(round) {
    const save = store.getActiveSave();
    let roster = this.arenaRoster(save);
    if (!roster.length) roster = STORY_STAGES.slice(6, 9);   // Super User before any guardian
    const g = roster[round % roster.length];
    const lap = Math.floor(round / roster.length);
    const base = BossRules.get(g.id) || { title: 'A Straight Game', lines: ['Plain chess.'] };
    return {
      id: `arena_${round}`,
      name: g.name,
      title: lap ? `${g.title} · lap ${lap + 1}` : g.title,
      face: g.id,
      level: g.level + lap,
      theme: g.theme,
      colors: g.colors,
      rule: { ...base, lines: [...base.lines] },
      dialogue: { before: `The Arena. Round ${round + 1}. ${g.dialogue.rematch || g.dialogue.before}`, after: g.dialogue.after, win: g.dialogue.win },
      kicker: `THE ARENA  ·  ROUND ${round + 1}`,
      winTitle: `Round ${round + 1} Won!`,
      reward: { coins: Wallet.REWARDS.arena + 5 * round },
      returnTo: { screen: 'worldMap', data: { select: { type: 'arena' } } },
      onResult: (result) => {
        const save2 = store.getActiveSave();
        const a = this.arena(save2);
        if (result === 'win') {
          const run = round + 1;
          const best = Math.max(a.best, run);
          // A new best streak is worth a bonus star.
          if (run > a.best) Wallet.addBonusStars(1);
          store.setActiveSave({ arena: { best, run } });
          if (a.best < ARENA.streak && best >= ARENA.streak) this._roadCleared(store.getActiveSave(), ARENA.gate, 'arena_won');
        } else {
          store.setActiveSave({ arena: { best: a.best, run: 0, last: round } });
        }
      },
    };
  },

  startArena() {
    const save = store.getActiveSave();
    const a = this.arena(save);
    const first = typeof STORY_SCENES !== 'undefined' && STORY_SCENES.arena_intro && !StoryScenes.seen(save, 'arena_intro');
    SideMatches.start(this.arenaDef(a.run), first ? { scene: 'arena_intro' } : undefined);
  },
};

// Matches rebuilt from their id after a restart.
if (typeof SideMatches !== 'undefined') {
  SideMatches.addResolver('rival_', (id) => {
    const m = id.match(/^rival_(\w+?)_(\d)$/);
    const r = m && SideContent.rival(m[1]);
    return r ? SideContent.rivalDef(r, +m[2]) : null;
  });
  SideMatches.addResolver('quest_', (id) => {
    const m = id.match(/^quest_(\w+?)_(\d)$/);
    return m && QUESTS[m[1]] ? SideContent.questDef(m[1], +m[2]) : null;
  });
  SideMatches.addResolver('arena_', (id) => {
    const m = id.match(/^arena_(\d+)$/);
    return m ? SideContent.arenaDef(+m[1]) : null;
  });
}
