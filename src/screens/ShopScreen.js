// The Shop: the Crossroads Bazaar on the world map (middle of Africa), laid out like an
// old-time shop. The live scene `shop` is the lamp-lit interior; Nour, the shopkeeper, a
// living chess board with eyes and a mouth and a red fez (live character `char_shopkeeper`,
// moods idle/greet/talk/happy/nope/bye), stands in the doorway behind the counter. The goods sit in a row on the counter,
// four at a time: browse them with the arrow keys, the mouse or a tap; the one picked
// lifts up and glows, and the note pinned on the wall tells its name, use and price.
// Four drawers in the counter front are the tabs: the Star Shop (story helpers bought
// with the stars of the active save: rewinds, hints, removing a piece), the
// Coin Shop (plane paints), Characters (who you are on the map: a piece, a colour and a
// piece set, for coins) and Themes (world themes unlocked early, for coins). What everything costs and does lives in src/state/Wallet.js.
// init({ from, tab }) — the screen to go back to (default: the world map), the drawer.
const SHOP_LINES = {
  greet: [
    'Welcome, welcome to the Crossroads Bazaar!',
    'Ah, a traveller! Come in, mind the cat.',
    'Every road meets here, and so do bargains!',
    'Back again? I polished everything for you.',
  ],
  buy: [
    'Thank you kindly!',
    'A fine choice! Wear it well.',
    'Pleasure doing business!',
    'Sold! To the traveller with taste!',
    'Ha ha! My old cash box sings!',
  ],
  plane: ['The plane is yours! Summon it on the map and fly wherever you like!'],
  worn: ['That is you already, friend!', 'Already wearing it. Very dashing!'],
  item: ['Thank you! Keep it for a tight spot.', 'Sold! Use it wisely in a fight.'],
  nope: [
    'Tsk tsk. Not quite enough, friend.',
    'Ah... your purse is a little light.',
    'Come back with a few more, eh?',
    'Not yet! Not a single square of it is free, friend.',
  ],
  noSave: ['Stars belong to a story. Start one first, friend!'],
  owned: ['That one is already yours!', 'You have it already. One is plenty!'],
  wear: ['Oh, that suits you!', 'Very dashing!'],
  off: ['Off it comes. It will keep.'],
  bye: ['Safe roads, traveller!', 'Come back soon!', 'Goodbye! Mind the rifts!', 'Farewell! Tell your friends!'],
  empty: ['Every world theme is yours already. Splendid!'],
  // With Queenie's Signet the story items cost a third less (Wallet.price).
  signet: ["Is that Queenie's signet? A third off every rewind, hint and removal!", 'The royal seal! For friends of the crown, a third off.'],
  quip: {
    rewind: 'Turn back one move. Even I make mistakes... once a year.',
    hint: 'A whisper from the engine. Very wise, very quiet.',
    remove: 'Poof! One enemy piece gone. Not a king or a queen, mind.',
    plane: 'My pride and joy! She flies you from world to world.',
    paint: 'A fresh coat for your wings!',
    token: 'Who will you be out there? A king, a queen, a new colour?',
    theme: 'A whole world, framed! Hang it on your board today.',
  },
};

const ShopScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  KEEPER: 'char_shopkeeper',
  PER_PAGE: 4,
  TABS: [
    { id: 'stars', label: 'STAR SHOP' },
    { id: 'coins', label: 'COIN SHOP' },
    { id: 'characters', label: 'CHARACTERS' },
    { id: 'themes', label: 'THEMES' },
  ],

  // Kept so a rotation or resize rebuilds the same drawer, without a second greeting.
  get _lastInitData() { return { from: this.from, tab: this.tab, quiet: true }; },

  init(data = {}) {
    this.from = data.from || this.from || 'worldMap';
    this.tab = data.tab || this.tab || 'stars';
    this.sel = 0;
    this.time = 0;
    this.leaveAt = 0;
    this.bubble = null;
    this.moodUntil = 0;
    this.parts = [];
    this.quipped = new Set();
    this._timers = [];
    this._build();
    if (!data.quiet) {
      this._mood('greet', 2.4);
      const signet = typeof Keepsakes !== 'undefined' && Keepsakes.has('signet') && Math.random() < 0.5;
      this._say(this._pick(signet ? 'signet' : 'greet'));
    } else this._mood('idle');
  },

  /* ----------------------------- layout ------------------------------ */

  _layout() {
    const W = Layout.W, H = Layout.H, P = Layout.isPortrait;
    const sx = P ? -240 : 0;                      // portrait: the middle 200 scene pixels
    const L = { W, H, portrait: P, sceneX: sx, keeper: { x: sx + 448, y: 112, w: 384, h: 424 } };
    L.slotW = P ? 180 : 184;
    L.base = 574;                                 // where the goods stand on the counter
    L.tagY = 598;
    const rowW = L.slotW * this.PER_PAGE;
    L.rowX = Math.round(W / 2 - rowW / 2) - (P ? 0 : 24);   // landscape: clear of the note
    L.slots = Array.from({ length: this.PER_PAGE }, (_, i) => Math.round(L.rowX + L.slotW * (i + 0.5)));
    if (!P) {
      L.note = { x: 936, y: 238, w: 316, h: 214 };
      L.drawers = { y: 664, h: 84, w: 186, gap: 12 };
      L.leave = { x: 28, y: 672, w: 196, h: 68 };
      L.purse = { x: W - 224, y: 664, w: 196, h: 84 };
      L.bubble = { x: 150, y: 206, w: 320, tailX: 610, tailY: 384 };   // the tail ends at Nour's mouth
      L.hintY = 780;
    } else {
      // Below the counter: the note, the drawers and the bottom row, evenly spaced.
      const bottom = H - Layout.SAFE_BOTTOM - 80;
      L.leave = { x: 40, y: bottom, w: 250, h: 76 };
      L.purse = { x: W - 290, y: bottom - 6, w: 250, h: 88 };
      const top = 660, end = bottom - 16, dh = 104;
      const nh = Math.max(230, Math.min(380, end - top - dh - 60));
      const gap = Math.max(12, (end - top - nh - dh) / 3);
      L.note = { x: 40, y: Math.round(top + gap), w: W - 80, h: nh };
      L.drawers = { y: Math.round(top + gap * 2 + nh), h: 92, w: Math.min(232, Math.floor((W - 40 - 36) / this.TABS.length)), gap: 12 };
      L.bubble = { x: 20, y: 112, w: 360, tailX: 370, tailY: 384 };
    }
    L.ts = P ? Math.max(1.25, Layout.uiScale || 1) : 1;   // bigger text on phones
    L.drawers.x0 = Math.round(W / 2 - (this.TABS.length * L.drawers.w + (this.TABS.length - 1) * L.drawers.gap) / 2);
    return L;
  },

  /* ----------------------------- building ---------------------------- */

  _build() {
    if (this.pixiContainer) {
      PixiScreenManager.setScreenContainer(null);
      this._killTweens(this.pixiContainer);
      this.pixiContainer.destroy({ children: true });
    }
    this.save = store.getActiveSave();
    const L = this.L = this._layout();
    const root = this.pixiContainer = new PIXI.Container();
    root.label = 'ShopScreen';
    PixiScreenManager.setScreenContainer(root);

    // The shop, and Nour hanging in the doorway.
    if (LiveScenes.has('shop')) {
      const bg = LiveScenes.sprite('shop');
      bg.x = L.sceneX; bg.width = 1280; bg.height = 800;
      root.addChild(bg);
    } else {
      root.addChild(new PIXI.Graphics().rect(0, 0, L.W, L.H).fill(0x1a1216));
    }
    if (L.portrait) this._counterFront(root, 800, L.H);
    if (LiveScenes.has(this.KEEPER)) {
      const k = this.keeper = LiveScenes.sprite(this.KEEPER);
      k.x = L.keeper.x; k.y = L.keeper.y; k.width = L.keeper.w; k.height = L.keeper.h;
      root.addChild(k);
    }

    this.goodsLayer = new PIXI.Container();
    this.noteLayer = new PIXI.Container();
    this.uiLayer = new PIXI.Container();
    this.fxLayer = new PIXI.Container();
    this.bubbleLayer = new PIXI.Container();
    root.addChild(this.goodsLayer, this.noteLayer, this.uiLayer, this.fxLayer, this.bubbleLayer);

    this._buildGoods();
    this._buildNote();
    this._buildDrawers();
    this._buildPurse();
    this._buildLeave();
    if (L.hintY) {
      const h = this._text('Arrows browse  ·  Enter buys  ·  Up/Down opens a drawer  ·  Esc leaves', { fontSize: 14, fill: '#e8d4b0' });
      h.alpha = 0.5; h.anchor.set(0.5); h.x = L.W / 2; h.y = L.hintY;
      this.uiLayer.addChild(h);
    }
    this._buildFilm(root);
    if (this.bubble) this._drawBubble();
  },

  // Portrait: the counter's panelled front continues below the scene.
  _counterFront(root, y0, y1) {
    const g = new PIXI.Graphics().rect(0, y0, this.L.W, y1 - y0).fill(0x1e1216);
    for (let x = ((this.L.sceneX / 4 + 20) % 64 + 64) % 64 * -4; x < this.L.W; x += 256) {
      g.rect(x, y0, 24, y1 - y0).fill(0x2a1a1a).rect(x + 20, y0, 4, y1 - y0).fill(0x140c10);
    }
    g.rect(0, y0, this.L.W, 4).fill(0x140c10);
    root.addChild(g);
  },

  _items() {
    if (this.tab === 'stars') return Wallet.ITEMS.filter(i => i.currency === 'stars');
    if (this.tab === 'coins') return Wallet.ITEMS.filter(i => i.currency === 'coins' && i.kind !== 'token');
    if (this.tab === 'characters') return Wallet.ITEMS.filter(i => i.kind === 'token');
    // Themes: the world themes the story has not given you yet.
    return THEMES.filter(t => t.id !== 'custom' && !ThemeManager.isThemeUnlocked(t.id)).map(t => Wallet.item('theme_' + t.id));
  },

  _buildGoods() {
    const L = this.L, layer = this.goodsLayer;
    this._killTweens(layer);
    layer.removeChildren().forEach(c => c.destroy({ children: true }));
    const items = this.items = this._items();
    this.slots = [];
    this.sel = Math.max(0, Math.min(this.sel, items.length - 1));
    const per = this.PER_PAGE, pages = Math.max(1, Math.ceil(items.length / per));
    const page = this.page = Math.floor(this.sel / per);
    if (!items.length) {
      const sign = this._paper(layer, L.W / 2 - 180, L.base - 96, 360, 80);
      const t = this._text('Every world theme is already yours.', { fontFamily: PixiTextStyles.FONT_BODY, fontSize: 20, fontWeight: '800', fill: '#3a2418', wordWrap: true, wordWrapWidth: 320, align: 'center' });
      t.anchor.set(0.5); t.x = 180; t.y = 40;
      sign.addChild(t);
      return;
    }
    items.slice(page * per, page * per + per).forEach((item, i) => {
      const idx = page * per + i;
      const slot = new PIXI.Container();
      slot.x = L.slots[i]; slot.y = L.base;
      layer.addChild(slot);
      const act = this._action(item);
      const owned = item.kind !== 'item' && Wallet.owns(item.id);
      const sw = L.slotW;

      // Glow behind the picked item (shown when selected).
      const glow = new PIXI.Graphics();
      for (const [r, a] of [[78, 0.06], [62, 0.08], [46, 0.1], [30, 0.1]]) glow.circle(0, -62, r).fill({ color: 0xffd890, alpha: a });
      glow.ellipse(0, 0, sw * 0.42, 14).fill({ color: 0xffd890, alpha: 0.14 });
      glow.visible = false;
      slot.addChild(glow);
      // A shadow and a little velvet cushion to stand on.
      const cush = new PIXI.Graphics()
        .ellipse(0, 4, sw * 0.36, 9).fill({ color: 0x000000, alpha: 0.45 })
        .poly(PixiPremiumScene.pixelShape(-sw * 0.3, -12, sw * 0.6, 16, 4)).fill(0x5a1a2a)
        .rect(-sw * 0.3 + 8, -12, sw * 0.6 - 16, 3).fill(0x8a2e3e)
        .rect(-sw * 0.3 + 8, 1, sw * 0.6 - 16, 3).fill(0x34101c)
        .rect(-sw * 0.3 + 4, -5, sw * 0.6 - 8, 2).fill({ color: 0xd8a040, alpha: 0.8 });
      slot.addChild(cush);

      const lift = new PIXI.Container();
      slot.addChild(lift);
      const bob = new PIXI.Container();
      lift.addChild(bob);
      const art = this._art(item, 92);
      if (art) { art.y = -58; bob.addChild(art); }
      if (item.kind === 'item' && this.save) {
        const n = Wallet.count(item.id);
        if (n > 0) {
          const b = new PIXI.Graphics().circle(40, -104, 15).fill(0x1c1018).circle(40, -104, 13).fill(0xd8a040).circle(40, -106, 11).fill(0xf0c050);
          const bt = this._text(`x${n}`, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 13, fill: '#3a2010' });
          bt.anchor.set(0.5); bt.x = 40; bt.y = -105;
          bob.addChild(b, bt);
        }
      }
      if (owned) {
        // Bought: a SOLD stamp across the foot of an unlock; a green tick on a cosmetic.
        const cosmetic = item.kind === 'paint' || item.kind === 'token';
        if (cosmetic) {
          const on = Wallet.equipped(item.kind) === item.id;
          const tick = new PIXI.Graphics().circle(40, -100, 14).fill(0x1c1018).circle(40, -100, 12).fill(on ? 0x3aa05a : 0x6a8a6a)
            .rect(32, -101, 5, 4).fill(0xffffff).rect(36, -98, 4, 4).fill(0xffffff).rect(39, -106, 4, 9).fill(0xffffff).rect(42, -110, 4, 5).fill(0xffffff);
          bob.addChild(tick);
        } else {
          const st = this._stamp('SOLD', 0xc83a32);
          st.y = -24; st.scale.set(0.85);
          bob.addChild(st);
          if (art) art.alpha = 0.75;
        }
      }
      // The price tag hanging off the counter's edge.
      const tag = new PIXI.Container();
      tag.y = L.tagY - L.base;
      slot.addChild(tag);
      const tw = 108, th = 32;
      tag.addChild(new PIXI.Graphics().rect(-1, -26, 2, 26).fill(0xd8c8a8)
        .poly(PixiPremiumScene.pixelShape(-tw / 2, 0, tw, th, 3)).fill(0x1c1018)
        .poly(PixiPremiumScene.pixelShape(-tw / 2 + 2, 2, tw - 4, th - 4, 3)).fill(0xf2e2bc)
        .rect(-tw / 2 + 5, th - 7, tw - 10, 3).fill(0xd8c090)
        .circle(-tw / 2 + 10, th / 2, 3).fill(0x1c1018));
      const poor = act.buy && act.disabled;
      let label;
      if (owned) label = this._text(Wallet.equipped(item.kind) === item.id ? 'WORN' : 'OWNED', { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 14, fill: '#2e6a3a' });
      else label = this._price(item, poor ? '#b02a1a' : '#3a2418', 15);
      if (label.anchor) label.anchor.set(0.5);
      label.x = 6; label.y = th / 2;
      tag.addChild(label);

      // Browse with the mouse (hover), buy with a click; a tap picks, a second tap buys.
      slot.eventMode = 'static';
      slot.cursor = 'pointer';
      slot.hitArea = new PIXI.Rectangle(-sw / 2 + 4, -140, sw - 8, 140 + (L.tagY - L.base) + th);
      slot.on('pointerover', (e) => { if (e.pointerType === 'mouse') this._select(idx); });
      slot.on('pointertap', (e) => {
        if (this.sel !== idx && e.pointerType !== 'mouse') { this._select(idx); return; }
        this._select(idx);
        this._press();
      });
      this.slots.push({ idx, item, slot, glow, lift, bob, art, tag });
    });
    if (pages > 1) {
      for (const dir of [-1, 1]) {
        const x = dir < 0 ? L.rowX - 26 : L.rowX + L.slotW * per + 26;
        const b = new PIXI.Container();
        b.x = x; b.y = L.base - 60;
        const g = new PIXI.Graphics()
          .poly(PixiPremiumScene.pixelShape(-20, -24, 40, 48, 4)).fill({ color: 0x1c1018, alpha: 0.85 })
          .poly(dir < 0 ? [8, -12, -8, 0, 8, 12] : [-8, -12, 8, 0, -8, 12]).fill(0xf0c050);
        b.addChild(g);
        b.eventMode = 'static'; b.cursor = 'pointer';
        b.hitArea = new PIXI.Rectangle(-26, -32, 52, 64);
        b.on('pointertap', () => this._move(dir * per, true));
        layer.addChild(b);
      }
      const dots = new PIXI.Graphics();
      for (let p = 0; p < pages; p++) dots.rect(L.W / 2 - pages * 9 + p * 18 + 4, L.tagY + 44, 10, 6).fill({ color: p === page ? 0xf0c050 : 0x6a4a3a });
      layer.addChild(dots);
    }
    this._highlight(true);
  },

  // Lifts the picked item with a little bounce; settles the others.
  _highlight(instant) {
    for (const s of this.slots || []) {
      const on = s.idx === this.sel;
      s.glow.visible = on;
      const y = on ? -18 : 0, sc = on ? 1.08 : 1;
      if (instant || typeof gsap === 'undefined') { s.lift.y = y; s.lift.scale.set(sc); }
      else {
        gsap.to(s.lift, { y, duration: on ? 0.32 : 0.2, ease: on ? 'back.out(3)' : 'power2.out' });
        gsap.to(s.lift.scale, { x: sc, y: sc, duration: 0.25, ease: 'back.out(2)' });
      }
    }
  },

  _select(idx) {
    if (!this.items || !this.items.length) return;
    idx = Math.max(0, Math.min(this.items.length - 1, idx));
    if (idx === this.sel) return;
    const pageChanged = Math.floor(idx / this.PER_PAGE) !== this.page;
    this.sel = idx;
    if (typeof audioManager !== 'undefined') audioManager.playSelect();
    if (pageChanged) this._later(() => { this._buildGoods(); this._buildNote(); });
    else { this._highlight(false); this._buildNote(true); }
    const item = this.items[idx];
    const key = item.kind === 'item' || item.kind === 'unlock' ? item.id : item.kind;
    if (!this.quipped.has(key) && SHOP_LINES.quip[key]) {
      this.quipped.add(key);
      this._say(SHOP_LINES.quip[key]);
    }
  },

  _move(d, byPage) {
    const n = this.items ? this.items.length : 0;
    if (!n) return;
    let i = this.sel + d;
    if (byPage) {
      const pages = Math.ceil(n / this.PER_PAGE);
      const p = ((this.page + Math.sign(d)) % pages + pages) % pages;
      i = p * this.PER_PAGE;
    } else i = (i + n) % n;
    this._select(i);
  },

  /* ----------------------------- the note ---------------------------- */

  _buildNote(bounce) {
    const L = this.L, N = L.note, layer = this.noteLayer;
    this._killTweens(layer);
    layer.removeChildren().forEach(c => c.destroy({ children: true }));
    const item = this.items && this.items[this.sel];
    const note = this._paper(layer, N.x, N.y, N.w, N.h, true);
    this.note = note;
    const pad = 22, ink = '#3a2418';
    if (!item) {
      const t = this._text(this.tab === 'themes' ? 'No themes left to sell. You have every world already!' : 'Nothing here today.', { fontSize: 18, fill: ink, wordWrap: true, wordWrapWidth: N.w - pad * 2 });
      t.x = pad; t.y = 40;
      note.addChild(t);
      return;
    }
    const act = this._action(item);
    const ts = L.ts;
    const title = this._text(item.name.toUpperCase(), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(22 * ts), fill: ink });
    title.x = pad; title.y = 24;
    PixiPremiumScene.fit(title, N.w - pad * 2, 0.6);
    const ry = Math.round(30 + title.height);
    const rule = new PIXI.Graphics().rect(pad, ry, N.w - pad * 2, 2).fill({ color: 0x3a2418, alpha: 0.5 })
      .rect(pad, ry + 3, N.w - pad * 2, 1).fill({ color: 0xffffff, alpha: 0.3 });
    const desc = this._text(item.desc, { fontSize: Math.round(16 * ts), fill: '#4a3424', wordWrap: true, wordWrapWidth: N.w - pad * 2, lineHeight: Math.round(19 * ts) });
    desc.x = pad; desc.y = ry + 10;
    note.addChild(title, rule, desc);

    const owned = item.kind !== 'item' && Wallet.owns(item.id);
    const status = act.noSave ? ['Start a story save to spend stars.', '#b02a1a']
      : item.kind === 'item' ? [`You have ${Wallet.count(item.id)}.`, '#6a4a2a']
        : act.noPlane ? ['Paints go on the plane: you have none yet.', '#8a5a1a']
          : owned && (act.on || act.worn) ? ['Yours, and worn on the map.', '#2e6a3a']
            : owned ? ['Yours already.', '#2e6a3a'] : null;
    const statusTop = N.h - 36 - Math.round(64 * ts);
    let statusText = null;
    if (status) {
      statusText = this._text(status[0], { fontSize: Math.round(15 * ts), fontWeight: '700', fill: status[1], wordWrap: true, wordWrapWidth: N.w - pad * 2 });
    }
    // A long description (some languages) steps down in size so it never runs
    // into the status line or the price.
    const descRoom = (statusText ? statusTop : N.h - 20 - Math.round(44 * ts)) - 6 - desc.y;
    for (let size = 15; desc.height > descRoom && size >= 12; size--) {
      desc.style.fontSize = Math.round(size * ts);
      desc.style.lineHeight = Math.round((size + 3) * ts);
    }
    if (statusText) {
      statusText.x = pad; statusText.y = Math.min(desc.y + desc.height + 6, statusTop);
      note.addChild(statusText);
    }

    // Price on the left, the action as a stamp-like button on the right.
    const by = N.h - 12 - Math.round(44 * L.ts);
    if (!owned || item.kind === 'item') {
      const p = this._price(item, act.buy && act.disabled ? '#b02a1a' : ink, Math.round(22 * ts));
      p.x = pad + p.width / 2; p.y = by + Math.round(22 * ts);
      note.addChild(p);
    }
    const label = act.worn ? 'WORN' : act.toggle ? (act.on ? 'TAKE OFF' : 'WEAR IT') : act.buy ? 'BUY' : act.noSave ? 'NO SAVE' : 'SOLD';
    const live = act.toggle || act.buy;
    const bw = Math.max(110, Math.min(160 * ts, N.w * 0.42)), bh = Math.round(44 * ts);
    const btn = new PIXI.Container();
    btn.x = N.w - pad - bw; btn.y = by;
    const color = act.toggle || act.worn ? 0x2e7a4a : live ? (act.disabled ? 0x8a5a4a : 0xb8342c) : 0x8a8078;
    const g = new PIXI.Graphics();
    const draw = (hover) => {
      g.clear()
        .poly(PixiPremiumScene.pixelShape(0, 4, bw, bh, 4)).fill({ color: 0x000000, alpha: 0.25 })
        .poly(PixiPremiumScene.pixelShape(0, 0, bw, bh, 4)).fill(0x1c1018)
        .poly(PixiPremiumScene.pixelShape(3, 3, bw - 6, bh - 6, 3)).fill(hover ? this._lighten(color) : color)
        .rect(10, 5, bw - 20, 2).fill({ color: 0xffffff, alpha: 0.25 });
    };
    draw(false);
    const bt = this._text(label, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(17 * ts), fill: '#fff4dc' });
    bt.anchor.set(0.5); bt.x = bw / 2; bt.y = bh / 2;
    PixiPremiumScene.fit(bt, bw - 16, 0.6);
    btn.addChild(g, bt);
    if (live) {
      btn.eventMode = 'static'; btn.cursor = 'pointer';
      btn.on('pointerover', () => draw(true));
      btn.on('pointerout', () => draw(false));
      btn.on('pointertap', () => this._press());
    }
    note.addChild(btn);
    this.noteButton = btn;
    if (bounce && typeof gsap !== 'undefined') gsap.fromTo(note, { y: N.y - 8 }, { y: N.y, duration: 0.35, ease: 'bounce.out' });
  },

  _lighten(c) {
    const r = Math.min(255, (c >> 16 & 255) + 30), g = Math.min(255, (c >> 8 & 255) + 30), b = Math.min(255, (c & 255) + 30);
    return (r << 16) | (g << 8) | b;
  },

  // A pinned sheet of paper: returns its container (children are placed inside it).
  _paper(parent, x, y, w, h, pin) {
    const c = new PIXI.Container();
    c.x = x; c.y = y;
    const g = new PIXI.Graphics()
      .poly(PixiPremiumScene.pixelShape(6, 8, w, h, 4)).fill({ color: 0x000000, alpha: 0.4 })
      .poly(PixiPremiumScene.pixelShape(0, 0, w, h, 4)).fill(0x2a1a14)
      .poly(PixiPremiumScene.pixelShape(3, 3, w - 6, h - 6, 4)).fill(0xf2e2bc)
      .rect(8, 3, w - 16, 3).fill(0xfff4d8)
      .rect(3, h - 12, w - 6, 4).fill(0xe0cc9c)
      .rect(3, h - 8, w - 6, 5).fill(0xd4bc88);
    // A folded corner and a few age spots.
    g.poly([w - 3, h - 30, w - 3, h - 3, w - 30, h - 3]).fill(0x2a1a14)
      .poly([w - 6, h - 28, w - 28, h - 6, w - 28, h - 28]).fill(0xd8c090);
    for (let i = 0; i < 5; i++) g.rect(((i * 97) % (w - 60)) + 20, ((i * 53) % (h - 50)) + 20, 4, 4).fill({ color: 0xc8a870, alpha: 0.5 });
    c.addChild(g);
    if (pin) {
      c.addChild(new PIXI.Graphics().circle(w / 2, 8, 8).fill(0x1c1018).circle(w / 2, 7, 6).fill(0xc83a3a).circle(w / 2 - 2, 5, 2).fill(0xff9a8a));
    }
    parent.addChild(c);
    return c;
  },

  // "12 [star]" or "60 [coin]" as a container centred on (0, 0).
  // With Queenie's Signet the story items show their old price struck through.
  _price(item, fill, size) {
    const c = new PIXI.Container();
    const off = Wallet.signetOff(item.id);
    const t = this._text(`${Wallet.price(item.id)}`, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: size, fill: off ? '#c8327a' : fill });
    t.anchor.set(0, 0.5);
    const r = Math.round(size * 0.42);
    const icon = item.currency === 'stars' ? PixiStar.create(r + 1, true) : this._coinArt(r);
    let old = null, oldW = 0;
    if (off) {
      old = this._text(`${item.price}`, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(size * 0.9), fill: '#9a8068' });
      old.anchor.set(0, 0.5);
      oldW = old.width + 8;
    }
    const w = oldW + t.width + 6 + r * 2;
    if (old) {
      old.x = -w / 2; old.y = 1;
      // A slash through the old price.
      const sl = new PIXI.Graphics();
      for (let k = 0; k <= old.width + 2; k += 2) sl.rect(old.x - 1 + k, Math.round(old.height * 0.3 - k * old.height * 0.6 / (old.width + 2)), 2, 2).fill({ color: 0xc8327a, alpha: 0.85 });
      c.addChild(old, sl);
    }
    t.x = -w / 2 + oldW; t.y = 0;
    icon.x = w / 2 - r; icon.y = 0;
    c.addChild(t, icon);
    return c;
  },

  _stamp(text, color) {
    const c = new PIXI.Container();
    const t = this._text(text, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 18, fill: '#fff4dc' });
    t.anchor.set(0.5);
    const w = t.width + 20, h = 30;
    c.addChild(new PIXI.Graphics()
      .poly(PixiPremiumScene.pixelShape(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 3)).fill(0x1c1018)
      .poly(PixiPremiumScene.pixelShape(-w / 2, -h / 2, w, h, 3)).fill(color)
      .rect(-w / 2 + 4, -h / 2 + 3, w - 8, 2).fill({ color: 0xffffff, alpha: 0.3 }), t);
    return c;
  },

  /* ----------------------------- drawers, purse, door ----------------- */

  _buildDrawers() {
    const D = this.L.drawers;
    this.TABS.forEach((tab, i) => {
      const active = tab.id === this.tab;
      const c = new PIXI.Container();
      c.x = D.x0 + i * (D.w + D.gap); c.y = D.y;
      this.uiLayer.addChild(c);
      const g = new PIXI.Graphics();
      c.addChild(g);
      const draw = (hover) => {
        g.clear();
        const w = D.w, h = D.h;
        // The hole the drawer slides out of.
        g.poly(PixiPremiumScene.pixelShape(-4, -4, w + 8, h + 8, 4)).fill(0x0e0808);
        const pull = active ? 12 : 0, ex = active ? 6 : 0;
        const x = -ex, y = pull, fw = w + ex * 2;
        if (active) g.rect(x + 6, y - pull, fw - 12, pull).fill(0x3a2016).rect(x + 6, y - pull, fw - 12, 3).fill(0x6a4028);
        g.poly(PixiPremiumScene.pixelShape(x, y, fw, h, 4)).fill(0x1c0e0a)
          .poly(PixiPremiumScene.pixelShape(x + 3, y + 3, fw - 6, h - 6, 3)).fill(hover || active ? 0x6e4028 : 0x56321f)
          .rect(x + 10, y + 5, fw - 20, 3).fill({ color: 0xffd8a0, alpha: active ? 0.35 : 0.18 })
          .rect(x + 8, y + h - 10, fw - 16, 4).fill({ color: 0x000000, alpha: 0.3 });
        // Brass label plate and handle.
        const pw = fw - 44, ph = 30, px = x + 22, py = y + 12;
        g.poly(PixiPremiumScene.pixelShape(px, py, pw, ph, 3)).fill(0x4a2a14)
          .poly(PixiPremiumScene.pixelShape(px + 2, py + 2, pw - 4, ph - 4, 3)).fill(active ? 0xf0c050 : hover ? 0xd8a848 : 0xb8863a)
          .rect(px + 6, py + 4, pw - 12, 2).fill({ color: 0xfff0a0, alpha: 0.6 });
        g.circle(px + 7, py + ph / 2, 2).fill(0x4a2a14).circle(px + pw - 7, py + ph / 2, 2).fill(0x4a2a14);
        const hy = y + h - 26;
        g.poly(PixiPremiumScene.pixelShape(x + fw / 2 - 26, hy, 52, 12, 3)).fill(0x2a160c)
          .poly(PixiPremiumScene.pixelShape(x + fw / 2 - 24, hy + 1, 48, 8, 2)).fill(active ? 0xf0c050 : 0xc8963e);
      };
      draw(false);
      const pull = active ? 12 : 0;
      const icon = tab.id === 'stars' ? PixiStar.create(8, true) : tab.id === 'coins' ? this._coinArt(8)
        : tab.id === 'characters' ? this._kingIcon() : this._frameIcon();
      icon.x = 44; icon.y = pull + 27;
      const t = this._text(tab.label, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 15, fill: '#3a2010' });
      t.anchor.set(0.5); t.x = D.w / 2 + 10; t.y = pull + 27;
      PixiPremiumScene.fit(t, D.w - 96, 0.6);
      c.addChild(icon, t);
      if (active) {
        const glow = new PIXI.Graphics().rect(-6, pull + D.h - 3, D.w + 12, 3).fill({ color: 0xffd890, alpha: 0.5 });
        c.addChild(glow);
      }
      c.eventMode = 'static'; c.cursor = 'pointer';
      c.hitArea = new PIXI.Rectangle(-8, -8, D.w + 16, D.h + 24);
      c.on('pointerover', () => draw(true));
      c.on('pointerout', () => draw(false));
      c.on('pointertap', () => this._openTab(tab.id));
    });
  },

  _kingIcon() {
    const sp = PixiPieceRenderer.createSprite(PixiPieceRenderer.withArt(store.get('theme')), 'white', 'king');
    sp.width = sp.height = 30;
    return sp;
  },

  _frameIcon() {
    return new PIXI.Graphics().rect(-9, -8, 18, 16).fill(0x4a2a14).rect(-7, -6, 14, 12).fill(0xd8a040)
      .rect(-5, -4, 10, 8).fill(0x4a7ab0).rect(-5, 0, 10, 4).fill(0x5a8a50).rect(1, -3, 3, 3).fill(0xfff0a0);
  },

  _openTab(id) {
    if (id === this.tab) return;
    this.tab = id;
    this.sel = 0;
    this._sfx('drawer');
    this._later(() => {
      this._build();
      const D = this.L.drawers;
      const i = this.TABS.findIndex(t => t.id === id);
      const drawer = this.uiLayer.children[i];
      if (drawer && typeof gsap !== 'undefined') gsap.fromTo(drawer, { y: D.y - 10 }, { y: D.y, duration: 0.3, ease: 'back.out(2)' });
      for (const s of this.slots || []) if (typeof gsap !== 'undefined') gsap.fromTo(s.bob, { y: 30, alpha: 0 }, { y: 0, alpha: 1, duration: 0.3, delay: 0.04 * (s.idx % this.PER_PAGE), ease: 'back.out(2)' });
      if (!this.items.length) this._say(this._pick('empty'));
    });
  },

  _buildPurse() {
    const P = this.L.purse;
    const c = new PIXI.Container();
    c.x = P.x; c.y = P.y;
    this.uiLayer.addChild(c);
    c.addChild(new PIXI.Graphics()
      .poly(PixiPremiumScene.pixelShape(0, 6, P.w, P.h, 4)).fill({ color: 0x000000, alpha: 0.4 })
      .poly(PixiPremiumScene.pixelShape(0, 0, P.w, P.h, 4)).fill(0x1c0e0a)
      .poly(PixiPremiumScene.pixelShape(3, 3, P.w - 6, P.h - 6, 3)).fill(0x3a2016)
      .poly(PixiPremiumScene.pixelShape(7, 7, P.w - 14, P.h - 14, 3)).stroke({ color: 0xb8863a, width: 2 }));
    const stars = this.save ? `${Wallet.stars()}` : '-';
    const rows = [
      [PixiStar.create(11, true), stars, '#ffe08a', 'stars'],
      [this._coinArt(11), `${Wallet.coins()}`, '#ffd24a', 'coins'],
    ];
    this.purseTexts = {};
    rows.forEach(([icon, v, fill, key], i) => {
      const y = P.h / 2 + (i ? 18 : -18);
      icon.x = 32; icon.y = y;
      const t = this._text(v, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 22, fill });
      t.anchor.set(0, 0.5); t.x = 54; t.y = y;
      const lab = this._text(key, { fontSize: 14, fill: '#c8a878' });
      lab.anchor.set(1, 0.5); lab.x = P.w - 18; lab.y = y + 1;
      c.addChild(icon, t, lab);
      this.purseTexts[key] = t;
    });
    this.purse = c;
  },

  _buildLeave() {
    const B = this.L.leave;
    const c = new PIXI.Container();
    c.x = B.x; c.y = B.y;
    this.uiLayer.addChild(c);
    const g = new PIXI.Graphics();
    const t = this._text('LEAVE', { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 20, fill: '#f4e2c0' });
    t.anchor.set(0, 0.5); t.x = 62; t.y = B.h / 2;
    const draw = (hover) => {
      g.clear()
        .poly(PixiPremiumScene.pixelShape(0, 6, B.w, B.h, 4)).fill({ color: 0x000000, alpha: 0.4 })
        .poly(PixiPremiumScene.pixelShape(0, 0, B.w, B.h, 4)).fill(0x1c0e0a)
        .poly(PixiPremiumScene.pixelShape(3, 3, B.w - 6, B.h - 6, 3)).fill(hover ? 0x6e4028 : 0x4a2a1a)
        .rect(12, 6, B.w - 24, 3).fill({ color: 0xffd8a0, alpha: 0.2 })
        .poly([46 - (hover ? 4 : 0), B.h / 2 - 12, 26 - (hover ? 4 : 0), B.h / 2, 46 - (hover ? 4 : 0), B.h / 2 + 12]).fill(0xf0c050);
      t.style.fill = hover ? '#ffe08a' : '#f4e2c0';
    };
    draw(false);
    c.addChild(g, t);
    c.eventMode = 'static'; c.cursor = 'pointer';
    c.hitArea = new PIXI.Rectangle(0, 0, B.w, B.h);
    c.on('pointerover', () => draw(true));
    c.on('pointerout', () => draw(false));
    c.on('pointertap', () => this.back());
  },

  /* ----------------------------- buying ------------------------------ */

  // What an item's button says and does.
  _action(item) {
    if (item.currency === 'stars' && !this.save) return { label: 'No save', disabled: true, noSave: true };
    if (item.kind === 'item') return { buy: true, disabled: !Wallet.canAfford(item.id) };
    // The King is yours from the start: it can be put back on, not taken off.
    if (item.free) return Wallet.equipped(item.kind) === item.id ? { worn: true } : { toggle: true, on: false };
    if (Wallet.owns(item.id)) {
      if (item.kind === 'paint' || item.kind === 'token') return { toggle: true, on: Wallet.equipped(item.kind) === item.id };
      return { owned: true, disabled: true };
    }
    return { buy: true, disabled: !Wallet.canAfford(item.id), noPlane: item.kind === 'paint' && !Wallet.hasPlane() };
  },

  _press() {
    if (this.leaveAt) return;
    this.save = store.getActiveSave();
    const item = this.items && this.items[this.sel];
    if (!item) return;
    const act = this._action(item);
    if (act.toggle) {
      if (act.on) Wallet.unequip(item.kind);
      else Wallet.equip(item.id);
      this._sfx('select');
      this._mood(act.on ? 'talk' : 'happy', 1.4);
      this._say(this._pick(act.on ? 'off' : 'wear'));
      this._later(() => { this._buildGoods(); this._buildNote(); });
      return;
    }
    if (act.worn) { this._mood('talk', 1.4); this._say(this._pick('worn')); return; }
    if (act.noSave) { this._refuse(this._pick('noSave')); return; }
    if (act.owned) { this._mood('talk', 1.4); this._say(this._pick('owned')); return; }
    if (!act.buy) return;
    if (act.disabled) { this._refuse(this._pick('nope')); return; }
    const r = Wallet.buy(item.id);
    if (!r.ok) { this._refuse(r.reason === 'owned' ? this._pick('owned') : this._pick('nope')); return; }
    this._sold(item);
  },

  _refuse(line) {
    this._mood('nope', 2.0);
    this._say(line);
    this._sfx('nope');
    const s = (this.slots || []).find(q => q.idx === this.sel);
    if (s && typeof gsap !== 'undefined') {
      gsap.fromTo(s.tag, { x: -6 }, { x: 0, duration: 0.45, ease: 'elastic.out(1.2, 0.25)' });
      gsap.fromTo(s.bob, { rotation: -0.06 }, { rotation: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.3)' });
    }
  },

  // The sale: the item hops off the counter and flies into the purse, coins clink,
  // Nour glows with joy.
  _sold(item) {
    this._mood('happy', 2.4);
    this._say(item.id === 'plane' ? this._pick('plane') : item.kind === 'item' ? this._pick('item') : this._pick('buy'));
    this._sfx('sold');
    const s = (this.slots || []).find(q => q.idx === this.sel);
    const P = this.L.purse;
    const tx = P.x + 40, ty = P.y + P.h / 2;
    if (s && typeof gsap !== 'undefined') {
      const gp = s.art ? s.art.getGlobalPosition() : s.slot.getGlobalPosition();
      const local = this.pixiContainer.toLocal(gp);
      const ghost = this._art(item, 92);
      if (ghost) {
        ghost.x = local.x; ghost.y = local.y;
        this.fxLayer.addChild(ghost);
        const tl = gsap.timeline({ onComplete: () => { if (!ghost.destroyed) ghost.destroy({ children: true }); } });
        tl.to(ghost, { y: local.y - 90, duration: 0.28, ease: 'power2.out' })
          .to(ghost.scale, { x: 1.25, y: 1.25, duration: 0.28, ease: 'power2.out' }, 0)
          .to(ghost, { x: tx, duration: 0.5, ease: 'power1.in' }, 0.3)
          .to(ghost, { y: ty, duration: 0.5, ease: 'back.in(1.6)' }, 0.3)
          .to(ghost.scale, { x: 0.2, y: 0.2, duration: 0.5, ease: 'power2.in' }, 0.3)
          .to(ghost, { alpha: 0, duration: 0.12 }, 0.7);
      }
      this._burst(local.x, local.y, item.currency === 'stars' ? 0xffe08a : 0xffd24a, 18);
      this._at(0.8, () => { this._burst(tx, ty, 0xfff0a0, 10); this._sfx('purse'); });
      s.bob.visible = false;
    }
    this._at(0.85, () => {
      this._buildGoods(); this._buildNote();
      this.uiLayer.removeChild(this.purse); this.purse.destroy({ children: true }); this._buildPurse();
      if (typeof gsap !== 'undefined') gsap.fromTo(this.purse.scale, { x: 1.08, y: 1.08 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(3)' });
      const ns = (this.slots || []).find(q => q.idx === this.sel);
      if (ns && typeof gsap !== 'undefined') gsap.fromTo(ns.bob, { y: -20, alpha: 0 }, { y: 0, alpha: 1, duration: 0.35, ease: 'bounce.out' });
    });
  },

  _burst(x, y, color, n) {
    const k = typeof Graphics !== 'undefined' ? Graphics.particles() : 1;
    for (let i = 0; i < Math.round(n * k); i++) {
      const g = new PIXI.Graphics().rect(-3, -3, 6, 6).fill(i % 3 ? color : 0xffffff);
      g.x = x; g.y = y;
      this.fxLayer.addChild(g);
      const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 220;
      this.parts.push({ g, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 180, life: 0.6 + Math.random() * 0.4, age: 0 });
    }
  },

  /* ----------------------------- Nour -------------------------------- */

  _pick(kind) {
    const list = SHOP_LINES[kind];
    this._pickN = (this._pickN || 0) + 1;
    return list[Math.floor(Math.random() * list.length)];
  },

  _mood(mood, hold = 0) {
    if (!LiveScenes.has(this.KEEPER)) return;
    const live = LiveScenes.instance(this.KEEPER);
    if (live && live.state.mood === mood) live.state.since = LiveScenes.now() % LiveScenes.get(this.KEEPER).loop;
    else LiveScenes.setMood(this.KEEPER, mood);
    this.mood = mood;
    this.moodUntil = hold ? this.time + hold : 0;
  },

  _say(text) {
    text = I18n.display(text);   // typed out letter by letter: translate the whole line first
    this.bubble = { text, shown: 0, until: this.time + 2.6 + text.length * 0.045 };
    this._drawBubble();
  },

  _drawBubble() {
    const layer = this.bubbleLayer;
    this._killTweens(layer);
    layer.removeChildren().forEach(c => c.destroy({ children: true }));
    const b = this.bubble;
    if (!b) return;
    const B = this.L.bubble, pad = 18, ts = this.L.ts;
    const full = this._text(b.text, { fontSize: Math.round(20 * ts), fontWeight: '700', fill: '#2a1a14', wordWrap: true, wordWrapWidth: B.w - pad * 2, lineHeight: Math.round(25 * ts) });
    full.__noI18n = true;   // translated whole in _say, then typed out
    const h = Math.max(70, full.height + pad * 2 + 14);
    const c = new PIXI.Container();
    c.x = B.x; c.y = B.y;
    const tx = B.tailX - B.x, ty = B.tailY - B.y;
    const g = new PIXI.Graphics()
      .poly(PixiPremiumScene.pixelShape(4, 6, B.w, h, 4)).fill({ color: 0x000000, alpha: 0.35 })
      .poly([B.w - 70, h - 8, tx, ty, B.w - 30, h - 8]).fill(0x1c1018)
      .poly(PixiPremiumScene.pixelShape(0, 0, B.w, h, 4)).fill(0x1c1018)
      .poly(PixiPremiumScene.pixelShape(3, 3, B.w - 6, h - 6, 3)).fill(0xfff6e0)
      .poly([B.w - 64, h - 6, tx - 5, ty - 6, B.w - 36, h - 6]).fill(0xfff6e0)
      .rect(10, h - 10, B.w - 20, 4).fill(0xecdcc0);
    const name = this._text('NOUR', { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 12, fill: '#a0302a' });
    name.x = pad; name.y = 10;
    full.x = pad; full.y = 28;
    full.text = b.text.slice(0, Math.floor(b.shown));
    c.addChild(g, name, full);
    layer.addChild(c);
    this.bubbleText = full;
    if (b.shown === 0 && typeof gsap !== 'undefined') {
      c.pivot.set(tx, ty); c.x += tx; c.y += ty;
      gsap.fromTo(c.scale, { x: 0.6, y: 0.6 }, { x: 1, y: 1, duration: 0.25, ease: 'back.out(2.5)' });
    }
  },

  /* ----------------------------- film look --------------------------- */

  _buildFilm(root) {
    this.film = null;
    if (typeof Graphics !== 'undefined' && Graphics.retro && !Graphics.retro()) return;
    const W = this.L.W, H = this.L.H;
    if (!ShopScreen._grainTex) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      const ctx = cv.getContext('2d');
      const img = ctx.createImageData(128, 128);
      for (let i = 0; i < 128 * 128; i++) {
        const r = Math.random();
        if (r < 0.035) { img.data.set([255, 240, 210, 70 + Math.random() * 80], i * 4); }
        else if (r < 0.07) { img.data.set([0, 0, 0, 60 + Math.random() * 80], i * 4); }
      }
      ctx.putImageData(img, 0, 0);
      ShopScreen._grainTex = PIXI.Texture.from({ resource: cv, scaleMode: 'nearest' });
    }
    const grain = new PIXI.TilingSprite({ texture: ShopScreen._grainTex, width: W, height: H });
    grain.tileScale.set(2);
    grain.alpha = 0.35;
    const flicker = new PIXI.Graphics().rect(0, 0, W, H).fill(0x000000);
    flicker.alpha = 0;
    const scratch = new PIXI.Graphics().rect(0, 0, 2, H).fill(0xf0e0c0);
    scratch.alpha = 0;
    const film = new PIXI.Container();
    film.eventMode = 'none';
    film.addChild(flicker, grain, scratch);
    root.addChild(film);
    this.film = { grain, flicker, scratch, t: 0, scratchT: 0 };
  },

  pixiUpdate(dt) {
    if (!this.pixiContainer) return;
    dt = Math.min(0.1, dt || 0.016);
    this.time += dt;
    const t = this.time;
    // Nour goes back to idle after a reaction; talks while its bubble types.
    const b = this.bubble;
    if (b) {
      if (b.shown < b.text.length) {
        const before = Math.floor(b.shown);
        b.shown = Math.min(b.text.length, b.shown + dt * 42);
        const now = Math.floor(b.shown);
        if (this.bubbleText && !this.bubbleText.destroyed && now !== before) {
          this.bubbleText.text = b.text.slice(0, now);
          if (now % 3 === 0 && typeof audioManager !== 'undefined' && audioManager.playVoice) audioManager.playVoice(45 + (b.text.charCodeAt(now - 1) % 6));
        }
        if (!this.moodUntil && this.mood !== 'talk') this._mood('talk');
      } else if (!this.moodUntil && this.mood === 'talk') this._mood('idle');
      if (t > b.until) {
        this.bubble = null;
        const layer = this.bubbleLayer;
        if (typeof gsap !== 'undefined' && layer.children[0]) {
          const c = layer.children[0];
          gsap.to(c, { alpha: 0, duration: 0.2, onComplete: () => { if (!c.destroyed) c.destroy({ children: true }); } });
        } else this._drawBubble();
      }
    }
    if (this.moodUntil && t > this.moodUntil) {
      this.moodUntil = 0;
      this._mood(this.bubble && this.bubble.shown < this.bubble.text.length ? 'talk' : 'idle');
    }
    // The picked item bobs gently.
    for (const s of this.slots || []) if (s.art && !s.art.destroyed) s.art.y = -58 + (s.idx === this.sel ? Math.round(Math.sin(t * 3.2) * 3) : 0);
    // Sparks from a sale.
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.age += dt;
      p.vy += 700 * dt;
      p.g.x += p.vx * dt; p.g.y += p.vy * dt;
      p.g.alpha = Math.max(0, 1 - p.age / p.life);
      if (p.age >= p.life) { p.g.destroy(); this.parts.splice(i, 1); }
    }
    // Timed steps.
    for (let i = this._timers.length - 1; i >= 0; i--) {
      if (t >= this._timers[i].at) { const f = this._timers[i].fn; this._timers.splice(i, 1); f(); }
    }
    // Old film: grain jumps, the light flickers, a scratch now and then.
    const f = this.film;
    if (f) {
      f.t += dt;
      if (f.t > 1 / 15) {
        f.t = 0;
        f.grain.tilePosition.set(Math.floor(Math.random() * 64) * 2, Math.floor(Math.random() * 64) * 2);
        f.flicker.alpha = Math.random() < 0.08 ? 0.07 : 0.015 + Math.random() * 0.025;
      }
      f.scratchT -= dt;
      if (f.scratchT <= 0 && Math.random() < dt * 0.4) { f.scratchT = 0.12 + Math.random() * 0.15; f.scratch.x = Math.round(Math.random() * this.L.W / 2) * 2; }
      f.scratch.alpha = f.scratchT > 0 ? 0.1 : 0;
    }
    if (this.leaveAt && t >= this.leaveAt) {
      this.leaveAt = Infinity;
      switchScreen(this.from || 'worldMap');
    }
  },

  /* ----------------------------- helpers ----------------------------- */

  _text(text, style = {}) {
    return PixiPremiumScene.text(text, style);
  },

  _at(delay, fn) {
    this._timers.push({ at: this.time + delay, fn });
  },

  // Runs after the Pixi event that asked for it (a clicked object must not be destroyed
  // while its event is still being dispatched).
  _later(fn) {
    setTimeout(() => { if (this.pixiContainer) fn(); }, 0);
  },

  _killTweens(node) {
    if (!node || typeof gsap === 'undefined') return;
    const walk = n => { gsap.killTweensOf(n); if (n.scale) gsap.killTweensOf(n.scale); (n.children || []).forEach(walk); };
    walk(node);
  },

  _sfx(kind) {
    if (typeof audioManager === 'undefined') return;
    const a = audioManager;
    const phrase = (notes) => { try { if (a._phrase) a._phrase(notes); } catch (e) { /* audio is optional */ } };
    if (kind === 'select') a.playSelect();
    else if (kind === 'nope') a.playError();
    else if (kind === 'drawer') phrase([[0, 'woodblock', null, 0, 0.7], [0.06, 'tom', null, 0, 0.35], [0.12, 'woodblock', null, 0, 0.35]]);
    else if (kind === 'sold') phrase([                                          // the cash box: ka-ching
      [0, 'woodblock', null, 0, 0.6], [0.05, 'tek', null, 0, 0.4],
      [0.08, 'bell', 91, 0.5, 0.9, { ratio: 3.5, index: 1.2, ring: 1.2 }],
      [0.08, 'bell', 98, 0.5, 0.6, { ratio: 3.5, index: 1.2, ring: 1.2 }],
    ]);
    else if (kind === 'purse') phrase([96, 100, 103, 108].map((m, i) => [i * 0.06, 'bell', m, 0.12, 0.45, { ratio: 2.7, index: 0.9, ring: 0.35 }]));
  },

  /* ----------------------------- art ------------------------------- */

  _art(item, size) {
    const theme = store.get('theme') || 'chess20';
    const piece = (color, type, sc = 0.9) => {
      const sp = PixiPieceRenderer.createSprite(theme, color, type);
      sp.width = sp.height = Math.round(size * sc);
      sp.anchor.set(0.5);
      return sp;
    };
    if (item.id === 'rewind') {
      const c = new PIXI.Container();
      const g = new PIXI.Graphics(), r = size * 0.4;
      // A circular arrow turning back, around a pawn.
      for (let a = 0.5; a < 5.6; a += 0.12) g.rect(Math.cos(a) * r - 4, Math.sin(a) * r - 4, 8, 8).fill(0x1c1018);
      for (let a = 0.5; a < 5.6; a += 0.12) g.rect(Math.cos(a) * r - 3, Math.sin(a) * r - 3, 6, 6).fill(0x9ff0ff);
      g.poly([Math.cos(0.5) * r - 12, Math.sin(0.5) * r - 14, Math.cos(0.5) * r + 10, Math.sin(0.5) * r - 6, Math.cos(0.5) * r - 6, Math.sin(0.5) * r + 10]).fill(0x9ff0ff);
      c.addChild(g, piece('white', 'pawn', 0.55));
      return c;
    }
    if (item.id === 'hint') {
      const c = new PIXI.Container();
      const g = new PIXI.Graphics(), q = size / 10;
      // A glowing square, like the hint marks on the board.
      g.rect(-4 * q, -4 * q, 8 * q, 8 * q).fill({ color: 0x7dffa0, alpha: 0.25 }).rect(-4 * q, -4 * q, 8 * q, 8 * q).stroke({ color: 0x7dffa0, width: 4 });
      c.addChild(g, piece('white', 'knight', 0.66));
      return c;
    }
    if (item.id === 'remove') {
      const c = new PIXI.Container();
      const p = piece('black', 'rook', 0.66);
      p.y = -size * 0.08;
      const g = new PIXI.Graphics(), q = size / 10;
      g.rect(-4 * q, 1 * q, 8 * q, 3 * q).fill({ color: 0xff6a5a, alpha: 0.3 }).rect(-4 * q, 1 * q, 8 * q, 3 * q).stroke({ color: 0xff6a5a, width: 3 });
      // Arrows lifting it off the board.
      for (const dx of [-3.4 * q, 3.4 * q]) g.poly([dx - q, -2 * q, dx + q, -2 * q, dx, -3.6 * q]).fill(0xffd24a).rect(dx - q / 3, -2 * q, q * 0.66, 2.4 * q).fill(0xffd24a);
      c.addChild(g, p);
      return c;
    }
    if (item.id === 'plane' || item.kind === 'paint') {
      const colors = item.kind === 'paint' ? item.colors : Wallet.planeColors();
      const c = this._plane(colors);
      c.scale.set(size / 44);
      const holder = new PIXI.Container();
      holder.addChild(c);
      if (item.id === 'plane') {                 // the king, flying it
        const k = piece('white', 'king', 0.42);
        k.x = -size * 0.02; k.y = -size * 0.24;
        holder.addChildAt(k, 0);
      }
      return holder;
    }
    if (item.kind === 'token') {
      // A character in its own piece set, or in the pieces of the world you are in.
      const sp = PixiPieceRenderer.createSprite(PixiPieceRenderer.withArt(item.art || theme), item.color || 'white', item.piece);
      sp.width = sp.height = Math.round(size * 0.95);
      sp.anchor.set(0.5);
      return sp;
    }
    if (item.kind === 'theme') {
      // The world as a little framed painting.
      const holder = new PIXI.Container();
      const sp = new PIXI.Sprite(PixiPremiumAssets.theme(item.themeId));
      sp.anchor.set(0.5);
      const tw = sp.texture.width || 1, th = sp.texture.height || 1;
      const k = Math.min(size * 1.1 / tw, size * 0.9 / th);
      sp.width = tw * k; sp.height = th * k;
      const fw = sp.width + 16, fh = sp.height + 16;
      holder.addChild(new PIXI.Graphics()
        .rect(-fw / 2 - 2, -fh / 2 - 2, fw + 4, fh + 4).fill(0x1c1018)
        .rect(-fw / 2, -fh / 2, fw, fh).fill(0xc8923a)
        .rect(-fw / 2 + 2, -fh / 2 + 2, fw - 4, 2).fill(0xfff0a0)
        .rect(-fw / 2 + 5, -fh / 2 + 5, fw - 10, fh - 10).fill(0x4a2a14), sp);
      return holder;
    }
    return null;
  },

  // The same little biplane the world map flies.
  _plane(colors) {
    const [body, trim, shade] = colors.map(c => PixiPremiumScene.color(c));
    const c = new PIXI.Container();
    c.addChild(new PIXI.Graphics()
      .rect(-25, -13, 9, 12).fill(0x1a1420).rect(-27, -5, 46, 12).fill(0x1a1420).rect(15, -4, 8, 10).fill(0x1a1420)
      .rect(-11, -15, 28, 6).fill(0x1a1420).rect(-13, 3, 32, 6).fill(0x1a1420)
      .rect(-24, -12, 7, 10).fill(trim)
      .rect(-26, -4, 44, 10).fill(body)
      .rect(-26, 3, 44, 3).fill(shade)
      .rect(16, -3, 6, 8).fill(trim)
      .rect(-10, -14, 26, 4).fill(body)
      .rect(-10, -11, 26, 1).fill(shade)
      .rect(-8, -10, 2, 7).fill(shade).rect(12, -10, 2, 7).fill(shade)
      .rect(-12, 4, 30, 4).fill(trim)
      .rect(-6, -4, 10, 3).fill(0x2a2a3a)
      .rect(22, -9, 2, 20).fill({ color: 0xe8e8f0, alpha: 0.8 }));
    return c;
  },

  _coinArt(r) {
    const g = new PIXI.Graphics();
    g.circle(0, 0, r + 1.5).fill(0x1c1018).circle(0, 0, r).fill(0x8a5a10).circle(0, -0.5, r - 1.5).fill(0xe0a830)
      .circle(0, -0.5, r * 0.62).stroke({ color: 0xb07a1c, width: Math.max(1, r * 0.12) })
      .circle(-r * 0.3, -r * 0.35, r * 0.22).fill(0xfff0a0);
    return g;
  },

  /* ----------------------------- input ------------------------------ */

  back() {
    if (this.leaveAt) return;
    this._mood('bye', 5);
    this._say(this._pick('bye'));
    this._sfx('select');
    this.leaveAt = this.time + 1.1;
  },

  handleKeyDown(e) {
    const k = e.key;
    if (k === 'Escape' || k === 'Backspace') this.back();
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') this._move(1);
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') this._move(-1);
    else if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Tab' || k === 's' || k === 'w') {
      if (e.preventDefault) e.preventDefault();
      const order = this.TABS.map(t => t.id);
      const d = k === 'ArrowUp' || k === 'w' || (k === 'Tab' && e.shiftKey) ? -1 : 1;
      this._openTab(order[(order.indexOf(this.tab) + d + order.length) % order.length]);
    } else if (k >= '1' && k <= String(this.TABS.length) && k.length === 1) this._openTab(this.TABS[+k - 1].id);
    else if (k === 'Enter' || k === ' ') this._press();
  },

  handleClick() {},

  destroy() {
    if (this.pixiContainer) this._killTweens(this.pixiContainer);
    for (const p of this.parts || []) if (!p.g.destroyed) p.g.destroy();
    this.parts = [];
    this._timers = [];
    this.slots = [];
    if (LiveScenes.has(this.KEEPER)) LiveScenes.setMood(this.KEEPER, 'idle');
    PixiBackgroundRenderer.destroy();
    PixiPremiumScene.destroy(this);
  },
};
