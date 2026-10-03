// Story tournaments: two worlds hold a 16-player tournament instead of missions.
// Win it and the world's guardian comes out to fight you.
//
//   royalpalace   The Queen's Cup: four groups of four (3 points a win, 1 a draw),
//                 the top two of each group go through to the quarter-finals.
//   forkedgulch   The Gulch Shootout: a straight knockout, round of 16 to the final.
//
// The bracket logic is engine/Tournament.js. This file holds the two definitions
// (name pools, twists, what the host says) and the save glue: the current attempt
// lives in save.tournaments[worldId], the worlds whose tournament the save has won
// in save.tournamentsWon. The player's games are side matches (SideMatches) with
// ids like tour_royalpalace_2_md1_B1 (world, attempt, match), so a game restored
// after a restart is rebuilt from the save by the 'tour_' resolver.
const TOURNAMENTS = {
  royalpalace: {
    id: 'royalpalace',
    name: "The Queen's Cup",
    short: 'Cup',
    format: 'groups',
    host: 'queenie',
    hostName: 'Queenie',
    entryName: 'You',
    winTitles: { default: 'Match Won!', final: 'The Cup Is Yours!' },
    rules: [
      'Sixteen players, four groups of four. Everyone in a group plays everyone once.',
      'A win is 3 points, a draw 1. The top two of each group go through.',
      'Then knockout: quarter-finals, semi-finals, the final. A drawn knockout game is played again.',
    ],
    twists: {
      sf: {
        title: 'Court Etiquette',
        lines: ['A semi-final at court: your opponent\'s captures start a challenge half the time.'],
        bossChallengeChance: 0.5,
      },
      final: {
        title: 'Under the Chandeliers',
        lines: ['The final, in the grand ballroom: every capture starts a challenge, for both of you.'],
        everyCapture: true,
      },
    },
    pools: [
      {
        kind: 'courtier', pieces: ['bishop', 'pawn'],
        names: ['Lord Pemberton', 'Sir Reginald Fop', 'Baron von Tiara', 'Count Cravat', 'Lord Snuffbox', 'Sir Percival Pout', 'Marquis de Minuet', 'Viscount Velvet'],
        titles: ['Courtier of the East Wing', 'Keeper of the Royal Fan', 'Master of Ceremonies', 'Chief Taster', 'Gossip-in-Waiting'],
        colors: [{ primary: '#c9a0dc', secondary: '#6a3a8a' }, { primary: '#f0d58a', secondary: '#8a6a2a' }],
        greets: ['Charmed, I am sure. Do mind the carpet, it is older than you.', 'The whole court is watching. Try not to embarrass yourself. Or me.', 'I have played in this cup eleven times. I have curtsied in it eleven times too.'],
        afters: ['Oh dear. The court will be talking about this for weeks.', 'Beaten! I shall need a lie-down and a very small cake.'],
        wins: ['Ha! A courtier never loses at court. Well. Hardly ever.', 'Do run along, darling. The court has seen enough.'],
      },
      {
        kind: 'duchess', pieces: ['queen'],
        names: ['Duchess Delphine', 'Lady Marigold', 'Duchess of Doilies', 'Countess Crinoline', 'Lady Opaline', 'Baroness Brocade', 'Duchess Rosalind', 'Lady Cressida'],
        titles: ['Duchess of the Rose Garden', 'Lady of the Long Gloves', 'Patron of the Ballroom', 'Heiress of Nine Tiaras'],
        colors: [{ primary: '#ff9ac8', secondary: '#8a2a5a' }, { primary: '#9ad8ff', secondary: '#2a5a8a' }],
        greets: ['A duchess does not lose, sweetie. She simply declines to win.', 'Queenie invited me personally. Did she invite you? I thought not.', 'Let us be quick. My tea is getting cold.'],
        afters: ['How vulgar of you to win. Congratulations, I suppose.', 'My gloves! I have lost in my good gloves!'],
        wins: ['As expected. Do give my regards to the exit.', 'Lovely game. For me.'],
      },
      {
        kind: 'knight', pieces: ['knight'],
        names: ['Sir Galloway', 'Sir Tristan Trot', 'Dame Ironheart', 'Sir Clatterby', 'Dame Wyvern', 'Sir Lance-a-Little', 'Sir Hedgerow', 'Dame Bramble'],
        titles: ['Knight-Errant', 'Champion of the Joust', 'Sworn Sword of Nowhere', 'Wandering Blade'],
        colors: [{ primary: '#c8ccd8', secondary: '#4a5068' }, { primary: '#e8b070', secondary: '#6a3a1a' }],
        greets: ['I rode nine days to reach this cup. I will not ride home empty-handed!', 'Have at thee! Politely. We are indoors.', 'For honour, for glory, and for the little silver cup!'],
        afters: ['Well fought! I yield, and I will tell every tavern of it.', 'Unhorsed! A fair fall. On to the next quest.'],
        wins: ['Victory! Er, sorry about that. Good game, friend.', 'The lance strikes true! Better luck at the next joust.'],
      },
      {
        kind: 'foreign', pieces: ['rook', 'bishop', 'knight'],
        names: ['Ingrid Frostgard', 'Aurelio Vance', 'Zahir al-Rukh', 'Mei Lin Shu', 'Olek Stolba', 'Pita Kahurangi', 'Sven Tornby', 'Amara Okafor'],
        titles: ['Champion of the Northern Fjords', 'Champion of the Spice Coast', 'Envoy from the Far Isles', 'Grandmaster of the Eastern Court', 'Champion of the River Kingdom'],
        colors: [{ primary: '#7fe0b0', secondary: '#1f6a4a' }, { primary: '#ffb070', secondary: '#8a3a1a' }, { primary: '#b0c8ff', secondary: '#34407a' }],
        greets: ['Where I come from, we play this game on ice. This marble is almost warm.', 'I crossed the sea for this cup. I hope you are worth the trip.', 'In my country I am the champion. Here, we will see.'],
        afters: ['A worthy opponent. I will speak of you back home.', 'The long road home just got longer. Well played.'],
        wins: ['A good game. Come and visit my country; we have a rematch waiting.', 'The cup comes home with me! Maybe.'],
      },
    ],
    gameDialogue: {
      bossCapture: ['Your {piece}? The court applauds. For me.', 'One {piece} fewer. Terribly sorry. Not really.', 'I shall keep your {piece} as a souvenir.'],
      playerCapture: ['My {piece}! How rude!', 'You took my {piece}? In front of the court?!', 'That {piece} was my favourite, darling.'],
      bossCheck: ['Check! Do curtsy on your way out.', 'Check, sweetie.'],
      playerCheck: ['Check?! The impudence!', 'Oh! My king is not amused.'],
    },
    say: {
      intro: ["Welcome to MY cup, darling. Sixteen enter, one gets to curtsy to me.", 'Four groups, three games each. Do try to be entertaining, sweetie.', "The court has placed its bets. None of them on you. Prove them wrong, if you must."],
      group: ['Top two go through, darling. Third place gets a lovely view of the exit.', 'Every point counts. Unlike some of my courtiers.', 'Chin up, sweetie. The chandeliers are watching.'],
      win: ['A win? How... unexpected. Carry on.', 'Three points! The court is almost impressed. Almost.', 'Oh, well played. Do not let it go to your head, darling.'],
      draw: ['A draw? How terribly middle-class.', 'One point. One is more than nothing, I suppose.'],
      loss: ['Lost? In MY ballroom? Pick yourself up, the marble is cold.', 'Ouch, darling. There are still points to play for. Technically.'],
      advance: ['Through to the next round! Try not to trip on the marble.', 'Still standing? How very stubborn of you. I rather like it.'],
      knockout: ['Knockout now, sweetie. Lose and you are out. No pressure. Well, all the pressure.', 'A draw here is played again. I do not do ties, darling.'],
      replay: ['A draw in MY knockout? Oh no, darling. Again. Until someone wins.', 'Nobody leaves a knockout with a handshake. Play it again.'],
      final: ['The final! Win this and you get my cup. And then, darling, you get ME.', 'One more game. The whole court is holding its breath. I am not; I am fabulous.'],
      out: ['Out already? Such a shame. The door is that way, darling.', 'Nobody curtsies to a loser, sweetie. Enter again if you dare.', 'Knocked out! The court will dine on this gossip for weeks.'],
      champion: ['You won my cup. Fine. FINE. Come and take my signet from me, if you dare.', 'Champion?! Well. Do not keep your queen waiting, darling.'],
      replayCup: ['Back for another cup? The court does love a rerun.', 'Again? You simply cannot stay away from me, can you?'],
    },
  },

  forkedgulch: {
    id: 'forkedgulch',
    name: 'The Gulch Shootout',
    short: 'Shootout',
    format: 'knockout',
    host: 'forkmaster',
    hostName: 'ForkMaster',
    entryName: 'You',
    winTitles: { default: 'Showdown Won!', final: 'Last One Standing!' },
    rules: [
      'Sixteen guns, one knockout. Win four showdowns in a row to take the purse.',
      'Lose once and you are out. A drawn game is played again.',
      'The later rounds carry twists from around the Gulch.',
    ],
    twists: {
      qf: {
        title: 'Double Barrel',
        lines: ['If one of his pieces attacks two of your queen, rooks, bishops or knights and takes one, it takes BOTH.'],
        doubleTake: true,
        twisted: true,
      },
      sf: {
        title: 'High Noon',
        lines: ['The clock tower strikes noon: checkmate him within 45 of your moves, or you lose.'],
        moveLimit: 45,
        twisted: true,
      },
      final: {
        title: 'The Showdown',
        lines: ['The sheriff took both queens at the door, and his forks fire both barrels (Double Take).'],
        fen: 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1',
        doubleTake: true,
        twisted: true,
      },
    },
    pools: [
      {
        kind: 'hunter', pieces: ['knight'],
        names: ['Jesse "Two-Fork" McCoy', 'Calamity Kate', 'Deadeye Dobbs', 'Rattlesnake Rita', 'Silver Sam Colter', 'Buckshot Betty', 'Hank Hollister', 'Dusty Rhodes'],
        titles: ['Bounty Hunter', 'Tracker of the Mesa', 'Hired Gun', 'Collector of Posters'],
        colors: [{ primary: '#e0a060', secondary: '#6a3a1a' }, { primary: '#c8b890', secondary: '#5a4a2a' }],
        greets: ['Your face is on a poster, partner. And posters pay.', 'I have tracked you three days across the mesa. Draw.', 'Nothing personal. Just business. Big business.'],
        afters: ['Well, shoot. There goes my payday.', 'Fastest hands I ever saw. Keep your bounty.'],
        wins: ['Bounty collected. Tip your hat on the way out.', 'Another poster off the wall. Yours.'],
      },
      {
        kind: 'outlaw', pieces: ['pawn', 'bishop'],
        names: ['Black Bart Blunder', 'The Sundance Pawn', 'Billy the Bishop', 'Mad Dog Magee', 'Wild Wanda', 'One-Eyed Jack', 'Loco Lupe', 'Snake-Eye Sal'],
        titles: ['Outlaw', 'Train Robber', 'Wanted in Three Territories', 'Bank Bandit'],
        colors: [{ primary: '#d05a4a', secondary: '#5a1a1a' }, { primary: '#9a8a7a', secondary: '#3a2a22' }],
        greets: ['Hands where I can see them. On the pieces, I mean.', 'They say there is gold in this shootout. I aim to steal it.', 'Ha! Another greenhorn. Easy pickings.'],
        afters: ['Caught red-handed. Guess I will be riding out of town.', 'You got me. I will be back when the sheriff sleeps.'],
        wins: ['Yee-haw! Robbed you blind!', 'Too slow, partner. Much too slow.'],
      },
      {
        kind: 'lawman', pieces: ['rook'],
        names: ['Sheriff Wyatt Rook', 'Marshal Mae Dillon', 'Deputy Dewey', 'Ranger Rosa Vega', 'Judge Hollis Crane', 'Sheriff Tess Walker', 'Marshal Obadiah Stone', 'Deputy Clem'],
        titles: ['Sheriff of Dry Creek', 'Federal Marshal', 'Deputy', 'Desert Ranger'],
        colors: [{ primary: '#f0d070', secondary: '#6a5a1a' }, { primary: '#b0b8c8', secondary: '#3a4058' }],
        greets: ['This here is a lawful shootout. Keep it clean.', 'I have a warrant for your king. Let us settle it.', 'The law does not lose in its own town, stranger.'],
        afters: ['Fair and square. The law respects that.', 'Hand me my badge back, will you? Good game.'],
        wins: ['Justice served. Next!', 'Case closed, stranger.'],
      },
      {
        kind: 'drifter', pieces: ['bishop', 'queen', 'knight'],
        names: ['The Stranger', 'Preacher Pike', 'Doc Holloway', 'Prairie Rose', 'Tumbleweed Tom', 'Gambler Gus', 'Cactus Clara', 'Old Man Mesa'],
        titles: ['Drifter', 'Card Sharp', 'Snake-Oil Seller', 'Gunslinger', 'Poker Queen'],
        colors: [{ primary: '#a0d0a0', secondary: '#2a5a3a' }, { primary: '#c0a0e0', secondary: '#4a2a6a' }],
        greets: ['I just drifted in. Might as well drift out rich.', 'Care for a wager? I always win my wagers.', '*tips hat* ... Let us get this over with.'],
        afters: ['The wind blows me on. Well played, friend.', 'I had a bad hand. You played a good one.'],
        wins: ['House always wins, partner.', '*tips hat* ... Better luck in the next town.'],
      },
    ],
    gameDialogue: {
      bossCapture: ['Bang! Your {piece} is down.', 'Got your {piece}. Keep your hands up.', 'One {piece} fewer. The Gulch is hungry.'],
      playerCapture: ['My {piece}! Lucky shot.', 'You winged my {piece}. Won\'t happen twice.', 'Dang. That was my best {piece}.'],
      bossCheck: ['Check! Reach for the sky.', 'Check, partner. Draw or run.'],
      playerCheck: ['Whoa! My king!', 'Check?! Sneaky varmint.'],
    },
    say: {
      intro: ['Sixteen guns ride into the Gulch. Only one rides out with the purse, partner.', 'Four showdowns. Lose one and you leave town. Simple as that.', 'Posters are up. Yours is on the top of the board. Big bounty, big target.'],
      group: ['Keep your eyes on his forks, partner.'],
      win: ['Clean shot. Your poster moves up the board.'],
      draw: ['A standoff. Nobody walks away from a standoff.'],
      loss: ['Bang. That is the end of your trail.'],
      advance: ['Your poster moves up the board. The bounty is getting bigger.', 'Still standing, partner. The Gulch is starting to talk about you.', 'Next round. The guns get faster from here.'],
      knockout: ['One loss and you ride out of town. Keep your holster low.', 'Draws do not count out here. You shoot again until someone falls.'],
      replay: ['A standoff? Nobody walks away from a standoff. Draw again.', 'Even? Then you go again, partner. Until one of you drops.'],
      final: ['One more showdown and the purse is yours. Then you face me.', 'The final. The whole Gulch is watching from the saloon roof.'],
      out: ['Bang. That is the end of your trail, partner. Saddle up and try again.', 'Your poster came down. Plenty more posters where it came from. Ride back in.'],
      champion: ['Last one standing. Reckon you have earned a shot at me.', 'You cleaned out the whole Gulch. Now come and see if you can fork a ForkMaster.'],
      replayCup: ['Back in town? The Gulch always has room for one more shootout.', 'Fresh posters on the board, partner. Yours is the biggest one.'],
    },
  },
};

const TOURNAMENT_PLAIN = { title: 'A Straight Game', lines: ['Plain chess. Captures can start challenges, like out there.'] };

const Tournaments = {
  PREFIX: 'tour_',
  BONUS_STARS: 3,

  forWorld(worldId) {
    return TOURNAMENTS[worldId] || null;
  },

  world(worldId) {
    return typeof WORLDS !== 'undefined' ? WORLDS.find(w => w.id === worldId) : null;
  },

  // The world's guardian (a story character).
  guardian(worldId) {
    const world = this.world(worldId);
    return world && typeof STORY_STAGES !== 'undefined' ? STORY_STAGES[world.stages[world.stages.length - 1] - 1] : null;
  },

  guardianLevel(worldId) {
    const g = this.guardian(worldId);
    return (g && g.level) || 4;
  },

  /* ----------------------------- save ------------------------------ */

  won(save, worldId) {
    return !!(save && Array.isArray(save.tournamentsWon) && save.tournamentsWon.includes(worldId));
  },

  // The guardian waits for the tournament (a restored world, New Game+ and Super
  // User skip the wait).
  guardianReady(save, world) {
    if (typeof SuperUser !== 'undefined' && SuperUser.active()) return true;
    if (!world || !this.forWorld(world.id)) return true;
    if (save && save.ngPlus) return true;
    if (typeof StoryProgress !== 'undefined' && StoryProgress.isRestored(save, world)) return true;
    return this.won(save, world.id);
  },

  // The current attempt, created if the save has none.
  state(save, worldId) {
    if (!save || !this.forWorld(worldId)) return null;
    const cur = save.tournaments && save.tournaments[worldId];
    if (cur && cur.version === 1) return cur;
    return this.enter(worldId, 1);
  },

  // Draws a fresh tournament (the next attempt) and saves it.
  enter(worldId, attempt) {
    const def = this.forWorld(worldId);
    const save = store.getActiveSave();
    if (!def || !save) return null;
    const prev = save.tournaments && save.tournaments[worldId];
    const t = Tournament.create({
      format: def.format,
      pools: def.pools,
      top: this.guardianLevel(worldId),
      attempt: attempt || ((prev && prev.attempt) || 0) + 1,
      player: { name: def.entryName, title: 'The Challenger', piece: 'king' },
    });
    t.event = { event: 'intro' };
    this._save(worldId, t);
    return t;
  },

  _save(worldId, t) {
    const save = store.getActiveSave() || {};
    store.setActiveSave({ tournaments: { ...(save.tournaments || {}), [worldId]: t } });
  },

  // The screen marks the last event seen once it has played its banner (the host
  // keeps talking about it).
  markSeen(worldId) {
    const save = store.getActiveSave();
    const t = save && save.tournaments && save.tournaments[worldId];
    if (!t || !t.event || t.event.seen) return;
    this._save(worldId, { ...t, event: { ...t.event, seen: true } });
  },

  /* ----------------------------- labels ---------------------------- */

  // 'GROUP B · MATCHDAY 2', 'QUARTER-FINAL', 'ROUND OF 16'...
  stageLabel(t, m) {
    const phase = Tournament.phaseName(t, Tournament.phases(t).indexOf(m.phase));
    if (m.group !== null && m.group !== undefined) return `Group ${Tournament.GROUP_LETTERS[m.group]} · ${phase}`;
    return phase;
  },

  // A short line for the map: where the save stands in the world's tournament.
  progressLabel(save, worldId) {
    const def = this.forWorld(worldId);
    const t = save && save.tournaments && save.tournaments[worldId];
    if (!def) return '';
    if (!t) return this.won(save, worldId) ? `${def.name}: won` : `${def.name}: 16 players`;
    if (t.status === 'champion') return `${def.name}: champion`;
    if (t.status === 'out') return `${def.name}: out (${this.finishLabel(t)})`;
    const m = Tournament.playerMatch(t);
    return m ? `${def.name}: ${this.stageLabel(t, m)}` : def.name;
  },

  finishLabel(t) {
    const at = Tournament.playerFinish(t);
    if (at === 'champion') return 'Champion';
    if (at === 'group') {
      const g = Tournament.playerGroup(t);
      const pos = Tournament.standings(t, g).find(r => r.entrant === 0).pos;
      return `${pos === 3 ? '3rd' : '4th'} in Group ${Tournament.GROUP_LETTERS[g]}`;
    }
    if (at === 'final') return 'Runner-up';
    return at ? `${Tournament.PHASE_NAMES[at]}` : '';
  },

  // What the host says right now, picked from the save's seed so it stays put.
  hostLine(worldId, t) {
    const def = this.forWorld(worldId);
    if (!def || !t) return '';
    const H = def.say;
    const ev = t.event && t.event.event;
    let pool;
    if (t.status === 'champion') pool = H.champion;
    else if (t.status === 'out') pool = H.out;
    else if (ev === 'replay') pool = H.replay;
    else {
      const phase = Tournament.phaseId(t);
      if (ev === 'intro') pool = t.attempt > 1 ? H.replayCup : H.intro;
      else if (phase === 'final') pool = H.final;
      else if (ev === 'advance') pool = H.advance;
      else if (ev === 'result' && t.event.result && H[t.event.result]) pool = H[t.event.result];
      else pool = Tournament.isGroupPhase(t) ? H.group : H.knockout;
    }
    const r = Tournament.streamFor(t.seed, `host#${t.phase}#${ev}#${t.status}`);
    return pool[Math.floor(r() * pool.length)];
  },

  /* ----------------------------- matches --------------------------- */

  uid(worldId, t, m) {
    return `${this.PREFIX}${worldId}_${t.attempt}_${m.id}`;
  },

  parseUid(id) {
    if (!id || !id.startsWith(this.PREFIX)) return null;
    const parts = id.slice(this.PREFIX.length).split('_');
    if (parts.length < 3) return null;
    return { worldId: parts[0], attempt: Number(parts[1]), matchId: parts.slice(2).join('_') };
  },

  // The rule for a phase: the round's twist, or plain chess, plus the format note.
  rule(def, t, m) {
    const base = (def.twists && def.twists[m.phase]) || TOURNAMENT_PLAIN;
    const note = m.group !== null && m.group !== undefined
      ? 'Group game: a win is worth 3 points, a draw 1.'
      : 'Knockout: lose and you are out. A draw is played again.';
    return { ...base, lines: [...base.lines, note] };
  },

  // The side-match definition of match m (the player's game) in attempt t.
  matchDef(worldId, t, m) {
    const def = this.forWorld(worldId);
    const world = this.world(worldId);
    const opp = Tournament.opponent(t, m);
    if (!def || !opp) return null;
    const pool = def.pools.find(p => p.kind === opp.kind) || def.pools[0];
    const r = Tournament.streamFor(t.seed, `talk#${m.id}#${m.replays || 0}`);
    const pick = arr => arr[Math.floor(r() * arr.length)];
    const id = this.uid(worldId, t, m);
    const replay = m.replays > 0;
    const before = replay ? pick(def.say.replay) : pick(pool.greets);
    const kicker = `${def.name} · ${this.stageLabel(t, m)}${replay ? ' · Replay' : ''}`.toUpperCase();
    return {
      id,
      name: opp.name,
      title: opp.title,
      level: opp.level,
      piece: opp.piece,
      colors: { ...opp.colors },
      theme: world ? world.art : worldId,
      world,
      rule: this.rule(def, t, m),
      dialogue: { before, after: pick(pool.afters), win: pick(pool.wins) },
      gameDialogue: def.gameDialogue,
      personality: 'minion',
      kicker,
      noRematch: true,
      winTitle: m.phase === 'final' ? def.winTitles.final : def.winTitles.default,
      reward: { coins: typeof Wallet !== 'undefined' ? Wallet.REWARDS.tournamentMatch : 10 },
      returnTo: { screen: 'tournament', data: { world: worldId } },
      tournament: { worldId, attempt: t.attempt, match: m.id, phase: m.phase },
      onResult: (result) => this.record(id, result),
    };
  },

  // The player's next match as a side-match definition (null when out or champion).
  nextMatch(worldId) {
    const t = this.state(store.getActiveSave(), worldId);
    const m = t && Tournament.playerMatch(t);
    return m ? this.matchDef(worldId, t, m) : null;
  },

  startMatch(worldId) {
    const def = this.nextMatch(worldId);
    if (!def) return false;
    SideMatches.start(def);
    return true;
  },

  // A game ended: record it, play the rest of the round, pay rewards.
  record(id, result) {
    const p = this.parseUid(id);
    const save = store.getActiveSave();
    const cur = p && save && save.tournaments && save.tournaments[p.worldId];
    if (!cur || cur.attempt !== p.attempt) return null;
    const m = Tournament.playerMatch(cur);
    if (!m || m.id !== p.matchId) return null;         // already recorded
    const t = JSON.parse(JSON.stringify(cur));
    const opp = Tournament.opponent(t);
    const info = Tournament.recordPlayer(t, result);
    const event = { ...info, result, opponent: opp ? opp.id : null, coins: 0, stars: 0 };
    const pay = (reason) => (typeof Wallet !== 'undefined' ? Wallet.earn(reason) : 0);
    if (info.event === 'advance' && info.phase === 'sf') event.coins += pay('tournamentFinal');
    if (info.event === 'champion') {
      event.coins += pay('tournamentWin');
      if (!this.won(save, p.worldId)) {
        store.setActiveSave({ tournamentsWon: [...(save.tournamentsWon || []), p.worldId] });
        if (typeof Wallet !== 'undefined') Wallet.addBonusStars(this.BONUS_STARS);
        event.stars = this.BONUS_STARS;
        event.firstWin = true;
      }
    }
    t.event = event;
    this._save(p.worldId, t);
    return event;
  },

  // Rebuilds a tournament game from its id (a game restored after a restart).
  resolve(id) {
    const p = this.parseUid(id);
    const save = typeof store !== 'undefined' && store.getActiveSave();
    const t = p && save && save.tournaments && save.tournaments[p.worldId];
    if (!t || t.attempt !== p.attempt) return null;
    const m = Tournament.match(t, p.matchId);
    return m && Tournament.hasPlayer(m) ? this.matchDef(p.worldId, t, m) : null;
  },
};

if (typeof SideMatches !== 'undefined') SideMatches.addResolver(Tournaments.PREFIX, id => Tournaments.resolve(id));

if (typeof module !== 'undefined') module.exports = Tournaments;
