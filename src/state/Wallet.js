// Stars, coins and what they buy in the Shop (ShopScreen, the bazaar on the map).
//
// Stars belong to a story save: every star won in a story fight (the best kept per
// stage, save.stars) plus bonus stars from side content (save.bonusStars), minus what
// the save has spent (save.starsSpent). They buy story helpers: rewinds, hints,
// removing an enemy piece, and the plane that carries your king across the map.
// Coins are one purse for the whole game (store.wallet.coins), earned by winning
// matches, puzzles, tournaments, rivals and quests. They buy cosmetics, kept for the
// whole game too (store.wallet.owned): plane paints, the piece your map token wears,
// and world themes before the story unlocks them.
// Prices were tripled on 2026-09-29 (the owner wanted the shop "way expensive").
const SHOP_ITEMS = [
  // Star items: story helpers (per save).
  { id: 'rewind', currency: 'stars', price: 6, kind: 'item', name: 'Rewind', icon: 'rewind',
    desc: 'Take back your last move in a story fight (and his reply).' },
  { id: 'hint', currency: 'stars', price: 3, kind: 'item', name: 'Hint', icon: 'hint',
    desc: 'The engine lights up a strong move for you.' },
  { id: 'remove', currency: 'stars', price: 12, kind: 'item', name: 'Remove a Piece', icon: 'remove',
    desc: 'On your turn, lift one enemy piece off the board. Not the king or the queen.' },
  // The plane is the big prize: most of the stars a whole story save can earn (about 80).
  { id: 'plane', currency: 'stars', price: 60, kind: 'unlock', name: 'The Plane', icon: 'plane',
    desc: 'Summon it on the world map and fly anywhere with WASD or ZQSD.' },

  // Coin items: cosmetics (whole game).
  { id: 'paint_sunset', currency: 'coins', price: 180, kind: 'paint', name: 'Sunset Paint', colors: ['#ff8a3c', '#ffd166', '#7a2a1a'],
    desc: 'Orange and gold wings for your plane.' },
  { id: 'paint_royal', currency: 'coins', price: 270, kind: 'paint', name: 'Royal Paint', colors: ['#6a3ac8', '#ffd24a', '#2a1450'],
    desc: 'Purple with gold trim, as Queenie would want.' },
  { id: 'paint_mist', currency: 'coins', price: 270, kind: 'paint', name: 'Mist Paint', colors: ['#9ff0d0', '#e8fff8', '#1c3a34'],
    desc: 'Pale green, like a lantern in the fog.' },
  { id: 'paint_crystal', currency: 'coins', price: 450, kind: 'paint', name: 'Crystal Paint', colors: ['#d932ff', '#00e5ff', '#2b0d36'],
    desc: 'Magenta and cyan, cut from the crystal itself.' },

  // Characters (the Characters drawer): who you are on the world map. A character is a
  // piece, a colour and a piece set; without `art` it wears the pieces of the world it
  // stands in. The King is yours from the start.
  { id: 'token_king', currency: 'coins', price: 0, free: true, kind: 'token', piece: 'king', name: 'The King',
    desc: 'You, as you woke up. Wears the pieces of each world.' },
  { id: 'token_pawn', currency: 'coins', price: 120, kind: 'token', piece: 'pawn', name: 'Pawn',
    desc: 'A humble pawn stands for you on the world map.' },
  { id: 'token_rook', currency: 'coins', price: 180, kind: 'token', piece: 'rook', name: 'Rook',
    desc: 'A rook stands for you on the world map.' },
  { id: 'token_bishop', currency: 'coins', price: 180, kind: 'token', piece: 'bishop', name: 'Bishop',
    desc: 'A bishop stands for you on the world map.' },
  { id: 'token_knight', currency: 'coins', price: 240, kind: 'token', piece: 'knight', name: 'Knight',
    desc: 'A knight stands for you on the world map.' },
  { id: 'token_queen', currency: 'coins', price: 240, kind: 'token', piece: 'queen', name: 'Queen',
    desc: 'A queen stands for you on the world map.' },
  { id: 'token_shadowking', currency: 'coins', price: 300, kind: 'token', piece: 'king', color: 'black', name: 'Shadow King',
    desc: 'The king in black, in the pieces of each world.' },
  { id: 'token_pharaoh', currency: 'coins', price: 360, kind: 'token', piece: 'bishop', art: 'slantedsands', name: 'Pharaoh Bishop',
    desc: 'A sandstone bishop from the Slanted Sands.' },
  { id: 'token_ironrook', currency: 'coins', price: 360, kind: 'token', piece: 'rook', color: 'black', art: 'ironkeep', name: 'Iron Rook',
    desc: 'A black iron tower from the Iron Keep.' },
  { id: 'token_mistknight', currency: 'coins', price: 450, kind: 'token', piece: 'knight', color: 'black', art: 'mistymoors', name: 'Mist Knight',
    desc: 'A dark rider out of the Misty Moors fog.' },
  { id: 'token_clockknight', currency: 'coins', price: 450, kind: 'token', piece: 'knight', art: 'clockworkcitadel', name: 'Clockwork Knight',
    desc: 'A brass knight, wound up in the Clockwork Citadel.' },
  { id: 'token_goldqueen', currency: 'coins', price: 540, kind: 'token', piece: 'queen', art: 'chess20', name: 'Golden Queen',
    desc: 'The golden queen of Chess 2.0 herself.' },
  { id: 'token_obsidianqueen', currency: 'coins', price: 540, kind: 'token', piece: 'queen', color: 'black', art: 'obsidiancourt', name: 'Obsidian Queen',
    desc: 'A queen of black glass from the Obsidian Court.' },
  { id: 'token_crystalking', currency: 'coins', price: 600, kind: 'token', piece: 'king', art: 'crystal', name: 'Crystal King',
    desc: 'A king cut from Soulbound crystal.' },
  { id: 'token_greatking', currency: 'coins', price: 900, kind: 'token', piece: 'king', art: 'greatboard', name: 'Great Board King',
    desc: 'The king of the whole Great Board, mended.' },
];

// Coins for each kind of win (Wallet.earn(reason)).
const COIN_REWARDS = {
  storyWin: 10, missionWin: 6, classicWin: 8, puzzle: 5, rival: 25, quest: 30, arena: 15,
  tournamentMatch: 10, tournamentWin: 120, tournamentFinal: 60,
};

const Wallet = {
  ITEMS: SHOP_ITEMS,
  REWARDS: COIN_REWARDS,
  THEME_PRICE: 750,

  item(id) {
    if (id && id.startsWith('theme_')) {
      const themeId = id.slice(6);
      const t = typeof ThemeManager !== 'undefined' && ThemeManager.getTheme(themeId);
      return { id, currency: 'coins', price: this.THEME_PRICE, kind: 'theme', themeId, name: t ? t.name : themeId,
        desc: 'Unlock this world theme now, before the story gets there.' };
    }
    return SHOP_ITEMS.find(i => i.id === id) || null;
  },

  _wallet() {
    const w = store.get('wallet') || {};
    return { coins: 0, owned: [], planePaint: null, token: null, ...w };
  },

  _setWallet(changes) {
    store.set('wallet', { ...this._wallet(), ...changes });
  },

  /* ----------------------------- stars ----------------------------- */

  starsEarned(save = store.getActiveSave()) {
    if (!save) return 0;
    const story = typeof StoryStars !== 'undefined' ? StoryStars.total(save) : 0;
    return story + (save.bonusStars || 0);
  },

  stars(save = store.getActiveSave()) {
    return Math.max(0, this.starsEarned(save) - ((save && save.starsSpent) || 0));
  },

  addBonusStars(n) {
    const save = store.getActiveSave();
    if (!save || !n) return;
    store.setActiveSave({ bonusStars: (save.bonusStars || 0) + n });
  },

  count(id, save = store.getActiveSave()) {
    return ((save && save.items) || {})[id] || 0;
  },

  // Uses one story item. Returns false if the save has none.
  use(id) {
    const save = store.getActiveSave();
    const n = this.count(id, save);
    if (n <= 0) return false;
    store.setActiveSave({ items: { ...((save && save.items) || {}), [id]: n - 1 } });
    store.saveProgress();
    return true;
  },

  // Gives story items back (a hint that found nothing is refunded).
  give(id, n = 1) {
    const save = store.getActiveSave();
    if (!save) return;
    store.setActiveSave({ items: { ...(save.items || {}), [id]: this.count(id, save) + n } });
    store.saveProgress();
  },

  hasPlane(save = store.getActiveSave()) {
    return !!(save && save.plane);
  },

  /* ----------------------------- coins ----------------------------- */

  coins() {
    return this._wallet().coins;
  },

  earn(reason, amount) {
    const n = amount !== undefined ? amount : (COIN_REWARDS[reason] || 0);
    if (!n) return 0;
    this._setWallet({ coins: this.coins() + n });
    return n;
  },

  owns(id) {
    const item = this.item(id);
    if (!item) return false;
    if (item.free) return true;
    if (item.kind === 'unlock') return id === 'plane' && this.hasPlane();
    if (item.kind === 'theme') return typeof ThemeManager !== 'undefined' && ThemeManager.isThemeUnlocked(item.themeId);
    return this._wallet().owned.includes(id);
  },

  /* ----------------------------- buying ---------------------------- */

  // What an item costs this save: Queenie's Signet takes a third off the story items.
  price(id, save = store.getActiveSave()) {
    const item = this.item(id);
    if (!item) return 0;
    return this.signetOff(id, save) ? Math.ceil(item.price * 2 / 3) : item.price;
  },

  signetOff(id, save = store.getActiveSave()) {
    const item = this.item(id);
    return !!item && item.kind === 'item' && typeof Keepsakes !== 'undefined' && Keepsakes.has('signet', save);
  },

  canAfford(id) {
    const item = this.item(id);
    if (!item) return false;
    return item.currency === 'stars' ? this.stars() >= this.price(id) : this.coins() >= item.price;
  },

  // Buys an item. Returns { ok, reason }.
  buy(id) {
    const item = this.item(id);
    if (!item) return { ok: false, reason: 'unknown' };
    if (item.kind !== 'item' && this.owns(id)) return { ok: false, reason: 'owned' };
    if (!this.canAfford(id)) return { ok: false, reason: item.currency === 'stars' ? 'Not enough stars' : 'Not enough coins' };
    if (item.currency === 'stars') {
      const save = store.getActiveSave();
      if (!save) return { ok: false, reason: 'No story save' };
      const changes = { starsSpent: (save.starsSpent || 0) + this.price(id, save) };
      if (item.kind === 'item') changes.items = { ...(save.items || {}), [id]: this.count(id, save) + 1 };
      if (id === 'plane') changes.plane = true;
      store.setActiveSave(changes);
    } else {
      const w = this._wallet();
      const changes = { coins: w.coins - item.price };
      if (item.kind === 'theme') {
        const list = store.get('unlockedThemes') || [];
        if (!list.includes(item.themeId)) store.set('unlockedThemes', [...list, item.themeId]);
      } else {
        changes.owned = [...w.owned, id];
        // A new cosmetic is put on straight away.
        if (item.kind === 'paint') changes.planePaint = id;
        if (item.kind === 'token') changes.token = id;
      }
      this._setWallet(changes);
    }
    store.saveProgress();
    return { ok: true };
  },

  /* --------------------------- cosmetics --------------------------- */

  // A cosmetic given as a reward (a side quest's prize), put on straight away.
  grant(id) {
    const item = this.item(id);
    if (!item || item.currency !== 'coins' || item.kind === 'theme') return false;
    const w = this._wallet();
    const changes = { owned: w.owned.includes(id) ? w.owned : [...w.owned, id] };
    if (item.kind === 'paint') changes.planePaint = id;
    if (item.kind === 'token') changes.token = id;
    this._setWallet(changes);
    store.saveProgress();
    return true;
  },

  equip(id) {
    const item = this.item(id);
    if (!item || !this.owns(id)) return false;
    if (item.kind === 'paint') this._setWallet({ planePaint: id });
    else if (item.kind === 'token') this._setWallet({ token: id });
    store.saveProgress();
    return true;
  },

  unequip(kind) {
    if (kind === 'paint') this._setWallet({ planePaint: null });
    if (kind === 'token') this._setWallet({ token: null });
    store.saveProgress();
  },

  // The paint on the plane (null: the plain one) or the character worn (the King by default).
  equipped(kind) {
    const w = this._wallet();
    return kind === 'paint' ? w.planePaint : kind === 'token' ? (w.token || 'token_king') : null;
  },

  // The plane's colours: [body, trim, shade].
  planeColors() {
    const paint = this.item(this.equipped('paint'));
    return paint ? paint.colors : ['#f4f0e8', '#d94a4a', '#5a5a6a'];
  },

  // The character worn on the map: { piece, color, art } (art null: the world's pieces).
  token() {
    const t = this.item(this.equipped('token')) || {};
    return { piece: t.piece || 'king', color: t.color || 'white', art: t.art || null };
  },

  // The piece the map token wears.
  tokenPiece() {
    return this.token().piece;
  },
};

if (typeof module !== 'undefined') module.exports = Wallet;
