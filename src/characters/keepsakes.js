// Story keepsakes: what a guardian hands over when you beat them. EndGamer,
// Checkmate and Grandmaster X still hold Great Board fragments (PixiShard);
// the rest give one of these. `color` tints the reveal's light rays and
// sparkles. Art and reveal animation: src/pixi/PixiKeepsake.js.
// Every keepsake does something (`use`): on the world map (compass: charts the map;
// iron key: opens chests; map: the way to the crystal), in the Shop (signet: cheaper
// story items) or in story fights (lantern, seal, hourglass: once per fight; poster:
// a bounty on one enemy piece). Keepsakes.has(id, save) says whether a save holds one.
const KEEPSAKES = {
  bishbosh: {
    id: 'compass',
    use: "Charts the world map: lands you have not been to stay an old sepia sketch without it. Its needle points to your next stop.",
    name: 'The Tilted Compass',
    desc: 'A brass desert compass. Its needle leans on the diagonal, and it points to the Moors.',
    color: '#f0c860',
  },
  rokee: {
    id: 'ironkey',
    use: "Opens the iron-bound chests hidden around the map: coins and a star in each.",
    name: 'The Iron Key',
    desc: 'Heavy, riveted, cold. Won by right of siege, it opens the road through the Iron Keep.',
    color: '#9ab8e8',
  },
  knightsade: {
    id: 'lantern',
    use: "In a fight, once: lights up every square the enemy attacks and every piece he threatens, and burns away the fog.",
    name: 'The Mist Lantern',
    desc: 'Its pale flame never goes out, and it shows what people try to hide.',
    color: '#70f0d0',
  },
  queenie: {
    id: 'signet',
    use: "The Bazaar honours the royal seal: rewinds, hints and removals cost a third less.",
    name: "Queenie's Signet",
    desc: 'A gold ring with a crown seal: her proof that Grandmaster X paid for her silence.',
    color: '#ff8ccc',
  },
  castle: {
    id: 'seal',
    use: "In a fight, once: seal one of your pieces. The enemy cannot take it for three turns.",
    name: 'The Broken Seal',
    desc: 'Stamped with an X. It closed the sealed orders that told Rook-E to stop you.',
    color: '#ff6a5a',
  },
  endgamer: {
    id: 'map',
    use: "Shows the way through the storm to Grandmaster X's crystal.",
    name: 'The Map of the Crossing',
    desc: 'Every step you took across the Board, ending one square from the far edge.',
    color: '#ffe0a0',
  },
  forkmaster: {
    id: 'poster',
    use: "In every fight one enemy piece is WANTED. Take it for a bounty in coins.",
    name: 'The Wanted Poster',
    desc: 'The bounty ForkMaster was paid to hunt you. Signed at the bottom with a big X.',
    color: '#ffa860',
  },
  checkmate: {
    id: 'hourglass',
    use: "In a fight, once: time stops for you. A free rewind of your last move.",
    name: 'The Stopped Hourglass',
    desc: 'The sand has never stopped for anyone. It stopped for you.',
    color: '#c89cff',
  },
};

// Iron-bound chests on the world map (scene px), opened with the Iron Key: each once per
// save (save.chests), for coins and a bonus star. They show once the map is charted.
const MAP_CHESTS = [
  { id: 'chest_fjord', at: [69, 37], name: 'The Fjord Chest' },
  { id: 'chest_tundra', at: [315, 34], name: 'The Tundra Chest' },
  { id: 'chest_yukon', at: [421, 37], name: 'The Yukon Chest' },
  { id: 'chest_jungle', at: [599, 206], name: 'The Jungle Chest' },
  { id: 'chest_cape', at: [91, 247], name: 'The Cape Chest' },
];
const CHEST_REWARD = { coins: 40, stars: 1 };

const Keepsakes = {
  CHESTS: MAP_CHESTS,
  CHEST_REWARD,
  // The keepsake a guardian gives, or null (trainers, Pawnie, Grandmaster X).
  forGuardian(guardianId) {
    const k = KEEPSAKES[guardianId];
    return k ? { ...k, guardian: guardianId } : null;
  },

  // A keepsake by its own id ('compass', 'ironkey'...), or null.
  get(id) {
    for (const g of Object.keys(KEEPSAKES)) {
      if (KEEPSAKES[g].id === id) return { ...KEEPSAKES[g], guardian: g };
    }
    return null;
  },

  // Whether a save holds a keepsake: its guardian is beaten (every keepsake on New
  // Game+, and with Super User on).
  has(id, save = typeof store !== 'undefined' ? store.getActiveSave() : null) {
    if (!save) return false;
    if (typeof SuperUser !== 'undefined' && SuperUser.active && SuperUser.active()) return true;
    if (save.ngPlus) return true;
    const k = this.get(id);
    const g = k && typeof STORY_STAGES !== 'undefined' && STORY_STAGES.find(c => c.id === k.guardian);
    return !!g && typeof StoryProgress !== 'undefined' && StoryProgress.isBeaten(save, g.stage);
  },

  chestOpened(id, save = store.getActiveSave()) {
    return !!(save && save.chests && save.chests.includes(id));
  },

  // Opens a chest with the Iron Key. Returns the reward, or null (no key, opened already).
  openChest(id, save = store.getActiveSave()) {
    if (!save || !MAP_CHESTS.some(c => c.id === id) || this.chestOpened(id, save) || !this.has('ironkey', save)) return null;
    store.setActiveSave({ chests: [...(save.chests || []), id] });
    if (typeof Wallet !== 'undefined') {
      Wallet.earn('chest', CHEST_REWARD.coins);
      Wallet.addBonusStars(CHEST_REWARD.stars);
    }
    store.saveProgress();
    return { ...CHEST_REWARD };
  },

  // Every keepsake in story order.
  all() {
    return Object.keys(KEEPSAKES).map(g => ({ ...KEEPSAKES[g], guardian: g }));
  },
};

if (typeof module !== 'undefined') module.exports = { KEEPSAKES, MAP_CHESTS, Keepsakes };
