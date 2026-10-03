// Side matches: story fights off the main path (tournament games, wandering rivals,
// guardians' side quests, the Arena). Each one is a character-shaped object that
// GameScreen plays like a mission: its rule is registered in BOSS_RULES under its
// id, and when the game ends GameScreen calls SideMatches.finish(), which pays the
// reward and tells the owner (a tournament, a rival, a quest) how it went. Continue
// goes back to where the match was started from.
//
// A match definition:
//   id          unique, prefixed by its owner ('tour_', 'rival_', 'quest_', 'arena_')
//   name, title, level (AI difficulty index like a character's), theme, colors
//   face        a story character id whose portrait and live face it uses, or
//   piece       the piece its minion portrait shows (PixiMinion) when it has no face
//   rule        a BossRules rule (title, lines, twists); default: plain chess
//   dialogue    { before, after, win }  and optional gameDialogue lines
//   kicker      the small line over the rule card ('THE QUEEN'S CUP · GROUP A')
//   noRematch   true for tournament games: a result stands
//   winTitle    the game-over title after a win ('Match Won!')
//   reward      { coins, stars } paid on a win (stars only on the first win of `once`)
//   once        a key: bonus stars are paid only the first time it is won
//   returnTo    { screen, data } for Continue (default: the world map)
//   onResult    (result, info) => void, result 'win' | 'loss' | 'draw'
//
// Owners register a resolver for their prefix so a match can be rebuilt from its id
// alone (a game restored after the app was closed).
const SideMatches = {
  _chars: {},
  _resolvers: {},

  addResolver(prefix, fn) {
    this._resolvers[prefix] = fn;
  },

  make(def) {
    const plain = { title: 'A Straight Game', lines: ['Plain chess. Captures can start challenges, like out there.'] };
    const ch = {
      id: def.id,
      name: def.name,
      title: def.title || '',
      level: def.level || 1,
      theme: def.theme || 'pawnhollow',
      colors: def.colors || { primary: '#f4f0e8', secondary: '#8a8494' },
      piece: def.piece || 'pawn',
      face: def.face || null,
      world: def.world || null,
      side: def,
      dialogue: def.dialogue || {},
      gameDialogue: def.gameDialogue || {},
      personality: def.personality || 'minion',
    };
    if (typeof BOSS_RULES !== 'undefined') BOSS_RULES[def.id] = def.rule || plain;
    this._chars[def.id] = ch;
    return ch;
  },

  character(id) {
    if (!id || typeof id !== 'string') return null;
    if (this._chars[id]) return this._chars[id];
    for (const prefix of Object.keys(this._resolvers)) {
      if (!id.startsWith(prefix)) continue;
      const def = this._resolvers[prefix](id);
      if (def) return this.make(def);
    }
    return null;
  },

  // The story character whose portrait a side match borrows, if any.
  faceOf(id) {
    const ch = this._chars[id];
    return (ch && ch.face) || null;
  },

  // Side matches without a face get a minion portrait of their piece.
  isMinion(id) {
    const ch = this._chars[id];
    return !!ch && !ch.face;
  },

  // Starts a side match straight away (no zoom, no story scene).
  // opts.scene: a story scene to play before the match.
  start(def, opts = {}) {
    const ch = this.make(def);
    store.setActiveSave({ selectedCharacter: ch.id });
    store.update({ selectedCharacter: ch.id, mode: 'story' });
    if (ch.theme && typeof ThemeManager !== 'undefined') ThemeManager.useStoryTheme(ch.theme);
    store.saveProgress();
    if (opts.scene) switchScreen('storyScene', { scene: opts.scene, next: 'game' });
    else switchScreen('game');
  },

  // Called by GameScreen when a side match ends. Pays the reward for a win and
  // returns what was paid: { coins, stars }.
  finish(ch, result, info = {}) {
    const def = ch.side || {};
    const paid = { coins: 0, stars: 0 };
    if (result === 'win' && def.reward) {
      if (def.reward.coins && typeof Wallet !== 'undefined') paid.coins = Wallet.earn('side', def.reward.coins);
      if (def.reward.stars && typeof Wallet !== 'undefined') {
        const save = store.getActiveSave();
        const seen = (save && save.sideWins) || [];
        const key = def.once || def.id;
        if (!seen.includes(key)) {
          Wallet.addBonusStars(def.reward.stars);
          store.setActiveSave({ sideWins: [...seen, key] });
          paid.stars = def.reward.stars;
        }
      }
    }
    if (typeof def.onResult === 'function') def.onResult(result, info);
    store.saveProgress();
    return paid;
  },

  // Where Continue leads after a side match.
  back(ch) {
    const ret = (ch && ch.side && ch.side.returnTo) || { screen: 'worldMap' };
    // A win that opened a road plays its story scene first (SideContent._roadCleared).
    const scene = store.get('storyScenePending');
    store.set('storyScenePending', null);
    if (scene) switchScreen('storyScene', { scene, next: ret.screen, nextData: ret.data });
    else switchScreen(ret.screen, ret.data);
  },
};
