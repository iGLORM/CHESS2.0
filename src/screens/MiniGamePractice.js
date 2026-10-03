// Mini-game practice: a large preview of the chosen game on the left (description,
// your record, Play), and a page of six games on the right, filtered by kind.
// Keyboard: arrows choose (past the edge turns the page), Enter plays, Q/E change the filter.
const MiniGamePractice = {
  isPixiScreen: true,
  pixiContainer: null,
  _filter: 'all',
  _page: 0,
  _selected: 'checkmateRun',

  gameDescriptions: {
    checkmateRun: 'Dodge the charging army.',
    lavaTilt: 'Tilt the board to the gold square.',
    rookStack: 'Stack slabs into a tower.',
    siegeCannon: 'Blast the army off its island.',
    meteorStorm: 'Shoot down falling pieces.',
    knightCollapse: 'Hop like a knight, grab crowns.',
    memoryMatch: 'Open the lids, find the pairs.',
    timingStrike: 'Hammer the enemy in the zone.',
    patternPress: 'Repeat the singing pieces.',
    reactionTest: 'Draw faster at high noon.',
    undertaleDodge: 'Survive the bullet storm.',
    powerMeter: 'Swing at the peak, ring the bell.',
    targetPractice: 'Shoot enemies, spare friends.',
    dodgeFalling: 'Dodge pieces falling from the sky.',
    rhythmTap: 'Tap the lanes on the beat.',
    barBalance: 'Balance across the canyon.',
    shieldBlock: 'Turn your shield to block.',
    whackMole: 'Flatten the pop-up enemies.',
  },

  // Display names by class name (the key saved in stats.miniGameByType).
  NAMES_BY_CLASS: {
    CheckmateRun: 'Checkmate Run', LavaTilt: 'Lava Tilt', RookStack: 'Rook Stack', SiegeCannon: 'Siege Cannon',
    MeteorStorm: 'Meteor Storm', KnightCollapse: 'Knight Collapse', MemoryMatch: 'Memory Match',
    TimingStrike: 'Timing Strike', PatternPress: 'Pattern Press', ReactionTest: 'Quick Draw',
    UndertaleDodge: 'Soul Dodge', PowerMeter: 'High Striker', TargetPractice: 'Crossbow Gallery',
    DodgeFalling: 'Falling Sky', RhythmTap: 'Rhythm Rush', BarBalance: 'Tightrope', ShieldBlock: 'Shield Wall',
    WhackMole: 'Whack-a-Pawn',
  },

  // Every practisable game, by settings key.
  get GAME_LIST() { return Object.keys(this.gameDescriptions); },

  FILTERS: [
    { id: 'all', label: 'All' },
    { id: 'dodge', label: 'Dodge', games: ['checkmateRun', 'undertaleDodge', 'dodgeFalling', 'reactionTest'] },
    { id: 'aim', label: 'Aim', games: ['siegeCannon', 'meteorStorm', 'targetPractice', 'whackMole'] },
    { id: 'timing', label: 'Timing', games: ['timingStrike', 'powerMeter', 'rhythmTap', 'rookStack', 'shieldBlock'] },
    { id: 'balance', label: 'Balance', games: ['lavaTilt', 'barBalance', 'knightCollapse'] },
    { id: 'memory', label: 'Memory', games: ['memoryMatch', 'patternPress'] },
  ],

  // data.from: the screen Back returns to (Training by default).
  init(data) {
    if (data && data.from) this._from = data.from;
    else if (!this._from) this._from = 'trainingHub';
    this.games = typeof Mini3D !== 'undefined' && Mini3D.available() ? [
      { name: 'Checkmate Run', key: 'checkmateRun', type: CheckmateRun },
      { name: 'Lava Tilt', key: 'lavaTilt', type: LavaTilt },
      { name: 'Rook Stack', key: 'rookStack', type: RookStack },
      { name: 'Siege Cannon', key: 'siegeCannon', type: SiegeCannon },
      { name: 'Meteor Storm', key: 'meteorStorm', type: MeteorStorm },
      { name: 'Knight Collapse', key: 'knightCollapse', type: KnightCollapse },
      { name: 'Memory Match', key: 'memoryMatch', type: MemoryMatch },
      { name: 'Timing Strike', key: 'timingStrike', type: TimingStrike },
      { name: 'Pattern Press', key: 'patternPress', type: PatternPress },
      { name: 'Quick Draw', key: 'reactionTest', type: ReactionTest },
      { name: 'Soul Dodge', key: 'undertaleDodge', type: UndertaleDodge },
      { name: 'High Striker', key: 'powerMeter', type: PowerMeter },
      { name: 'Crossbow Gallery', key: 'targetPractice', type: TargetPractice },
      { name: 'Falling Sky', key: 'dodgeFalling', type: DodgeFalling },
      { name: 'Rhythm Rush', key: 'rhythmTap', type: RhythmTap },
      { name: 'Tightrope', key: 'barBalance', type: BarBalance },
      { name: 'Shield Wall', key: 'shieldBlock', type: ShieldBlock },
      { name: 'Whack-a-Pawn', key: 'whackMole', type: WhackMole },
    ] : [];
    this.build();
  },

  get _lastInitData() {
    return { from: this._from };
  },

  destroy() {
    clearTimeout(this._bigTimer);
    this._tiles = [];
    PixiPremiumScene.destroy(this);
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  _visible() {
    const f = this.FILTERS.find(x => x.id === this._filter);
    return f && f.games ? this.games.filter(g => f.games.includes(g.key)) : this.games;
  },

  _kind(key) {
    const f = this.FILTERS.find(x => x.games && x.games.includes(key));
    return f ? f.label : '';
  },

  _record(game) {
    const byType = ((store.get('stats') || {}).miniGameByType || {})[game.type.name] || {};
    return { played: byType.played || 0, won: byType.won || 0 };
  },

  geom() {
    const s = Layout.uiScale || 1;
    const bottom = PixiPremiumScene.contentBottom;
    if (Layout.isPortrait) {
      const x = 36, w = Layout.W - 72, y = 152;
      const featH = Math.round(330 * s);
      const gridY = y + featH + 18;
      return { portrait: true, feat: { x, y, w, h: featH }, grid: { x, y: gridY, w, h: bottom - gridY }, cols: 3 };
    }
    const x = 56, y = 152, featW = 500, gap = 20;
    return {
      portrait: false,
      feat: { x, y, w: featW, h: bottom - y },
      grid: { x: x + featW + gap, y, w: Layout.W - x * 2 - featW - gap, h: bottom - y },
      cols: 3,
    };
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Mini-Games', null, {
      footerHint: 'Arrows choose  ·  Enter plays  ·  Q / E game type',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);
    this._ui = new PIXI.Container();
    this.pixiContainer.addChild(this._ui);
    this._refresh();
  },

  _refresh() {
    this._ui.removeChildren().forEach(c => c.destroy({ children: true }));
    const G = this.geom();
    this._G = G;
    this._featLayer = new PIXI.Container();
    this._ui.addChild(this._featLayer);
    this._buildFeatured();
    this._buildGrid(G);

    const btnY = PixiPremiumScene.bottomButtonY();
    PixiPremiumScene.button(this._ui, 36, btnY, 160, 44, 'Back', () => switchScreen(this._from), { icon: 'back' });
    PixiPremiumScene.button(this._ui, Layout.W - 216, btnY, 180, 44, 'Random', () => {
      const list = this._visible();
      if (list.length) this.startGame(list[Math.floor(Math.random() * list.length)].type);
    }, { icon: 'spark' });
  },

  // ---- Featured game ----

  _buildFeatured() {
    const layer = this._featLayer;
    layer.removeChildren().forEach(c => c.destroy({ children: true }));
    const game = this.games.find(g => g.key === this._selected) || this.games[0];
    if (!game) return;
    const F = this._G.feat;
    const cols = ThemeManager.getCurrentColors();
    const s = Layout.uiScale || 1;
    const portrait = this._G.portrait;
    PixiPremiumScene.panel(layer, F.x, F.y, F.w, F.h, { accentAlpha: 0.55, alpha: 0.8 });
    const pad = 26;

    // Preview: the small thumbnail at once, a sharp large one a moment later.
    const pw = portrait ? Math.round(F.w * 0.48) : F.w - pad * 2;
    const ph = Math.round(pw / 1.8);
    const px = F.x + pad, py = F.y + (portrait ? Math.round((F.h - ph) / 2) : 34);
    const frame = new PIXI.Graphics()
      .poly(PixiPremiumScene.pixelShape(px - 5, py - 5, pw + 10, ph + 10, 3)).fill({ color: 0x07080d, alpha: 0.95 })
      .poly(PixiPremiumScene.pixelShape(px - 4, py - 4, pw + 8, ph + 8, 3)).stroke({ color: PixiPremiumScene.color(cols.accent), alpha: 0.7, width: 2, alignment: 1 });
    layer.addChild(frame);
    const thumb = new PIXI.Sprite(this._bigTexture(game.key) || PixiPremiumAssets.minigame(game.key));
    thumb.x = px;
    thumb.y = py;
    thumb.width = pw;
    thumb.height = ph;
    layer.addChild(thumb);
    clearTimeout(this._bigTimer);
    if (!this._bigTexture(game.key)) {
      this._bigTimer = setTimeout(() => {
        const tex = this._bigTexture(game.key, true);
        if (tex && !thumb.destroyed) { thumb.texture = tex; thumb.width = pw; thumb.height = ph; }
      }, 140);
    }

    const tx = portrait ? px + pw + 26 : F.x + pad;
    const tw = portrait ? F.x + F.w - pad - tx : F.w - pad * 2;
    let y = portrait ? F.y + 30 : py + ph + 26;
    const kind = this._kind(game.key);
    if (kind) {
      const tag = PixiPremiumScene.text(kind.toUpperCase(), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(12 * s), fill: '#10131c' });
      const bw = tag.width + 16, bh = tag.height + 8;
      layer.addChild(new PIXI.Graphics().poly(PixiPremiumScene.pixelShape(tx, y, bw, bh, 2)).fill({ color: PixiPremiumScene.color(cols.accent) }));
      tag.x = tx + 8;
      tag.y = y + 4;
      layer.addChild(tag);
      y += bh + 12;
    }
    const name = PixiPremiumScene.text(game.name.toUpperCase(), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(26 * s), fontWeight: 'bold', fill: cols.text });
    name.x = tx;
    name.y = y;
    PixiPremiumScene.fit(name, tw, 0.6);
    layer.addChild(name);
    y += name.height + 10;
    const desc = PixiPremiumScene.text(this.gameDescriptions[game.key] || '', {
      fontSize: Math.round(19 * s), fill: PixiPremiumScene.alpha(cols.text, 'cc'), wordWrap: true, wordWrapWidth: tw,
    });
    desc.x = tx;
    desc.y = y;
    layer.addChild(desc);
    y += desc.height + 18;

    // Record: played, won, win rate.
    const rec = this._record(game);
    const stats = [
      ['Played', `${rec.played}`],
      ['Won', `${rec.won}`],
      ['Win rate', rec.played ? `${Math.round(rec.won / rec.played * 100)}%` : '-'],
    ];
    const cw = Math.floor(tw / 3);
    stats.forEach(([label, value], i) => {
      const v = PixiPremiumScene.text(value, { fontFamily: value.endsWith('%') ? PixiTextStyles.FONT_BODY : PixiTextStyles.FONT_TITLE, fontSize: Math.round(22 * s), fontWeight: 'bold', fill: cols.accent });
      const l = PixiPremiumScene.text(label, { fontSize: Math.round(14 * s), fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, '99') });
      v.x = tx + i * cw;
      l.x = tx + i * cw;
      v.y = y;
      l.y = y + v.height + 2;
      layer.addChild(v, l);
    });

    const bw = portrait ? tw : F.w - pad * 2;
    const bx = portrait ? tx : F.x + pad;
    PixiPremiumScene.button(layer, bx, F.y + F.h - pad - PixiPremiumScene.buttonHeight(50), bw, 50, 'Play', () => this.startGame(game.type), { primary: true, icon: 'play', fontSize: 20 });
  },

  // Large preview texture (rendered once per game), or null when not made yet.
  _bigCache: {},
  _bigTexture(key, make) {
    if (this._bigCache[key]) return this._bigCache[key];
    if (!make || typeof MiniGameThumbnails === 'undefined') return null;
    try {
      const canvas = MiniGameThumbnails.generate(key, 432, 240);
      if (!canvas) return null;
      this._bigCache[key] = PIXI.Texture.from({ resource: canvas, scaleMode: 'nearest' });
      return this._bigCache[key];
    } catch (_) {
      return null;
    }
  },

  _select(key) {
    if (this._selected === key) return;
    const old = this._selected;
    this._selected = key;
    for (const t of this._tiles || []) {
      if (t.key === key || t.key === old) t.redraw();
    }
    this._buildFeatured();
  },

  // ---- Grid ----

  _buildGrid(G) {
    const cols = ThemeManager.getCurrentColors();
    const s = Layout.uiScale || 1;
    const P = G.grid;
    PixiPremiumScene.panel(this._ui, P.x, P.y, P.w, P.h, { accentAlpha: 0.4, alpha: 0.72 });
    const pad = 24;

    // Filter chips.
    const chipGap = 8;
    const chipH = PixiPremiumScene.buttonHeight(38);
    const chipW = Math.floor((P.w - pad * 2 - chipGap * (this.FILTERS.length - 1)) / this.FILTERS.length);
    const chipY = P.y + 30;
    this.FILTERS.forEach((f, i) => {
      const n = f.games ? f.games.length : this.games.length;
      PixiPremiumScene.button(this._ui, P.x + pad + i * (chipW + chipGap), chipY, chipW, 38, `${f.label} ${n}`, () => this._setFilter(f.id), {
        primary: this._filter === f.id, fontSize: 15,
      });
    });

    // Tiles for this page.
    const list = this._visible();
    const barH = PixiPremiumScene.buttonHeight(44);
    const top = chipY + chipH + 18;
    const gridH = P.y + P.h - pad - barH - 10 - top;
    const gap = 14;
    const cw = Math.floor((P.w - pad * 2 - gap * (G.cols - 1)) / G.cols);
    const idealH = Math.round(cw / 1.8) + Math.round(58 * s);
    const rows = Math.max(1, Math.min(4, Math.floor((gridH + gap) / (idealH + gap))));
    const ch = Math.min(Math.round(idealH * 1.15), Math.floor((gridH - gap * (rows - 1)) / rows));
    this._perPage = rows * G.cols;
    const pages = Math.max(1, Math.ceil(list.length / this._perPage));
    this._pages = pages;
    if (this._page >= pages) this._page = pages - 1;
    const slice = list.slice(this._page * this._perPage, (this._page + 1) * this._perPage);
    this._tiles = slice.map((game, i) => this._tile(game,
      P.x + pad + (i % G.cols) * (cw + gap), top + Math.floor(i / G.cols) * (ch + gap), cw, ch, s));

    // Page bar: arrows and one pip per page.
    const barY = P.y + P.h - pad - barH;
    const arrowW = 64;
    PixiPremiumScene.button(this._ui, P.x + pad, barY, arrowW, 44, '<', () => this._turn(-1), { disabled: pages < 2, fontSize: 20 });
    PixiPremiumScene.button(this._ui, P.x + P.w - pad - arrowW, barY, arrowW, 44, '>', () => this._turn(1), { disabled: pages < 2, fontSize: 20 });
    const label = PixiPremiumScene.text(`Page ${this._page + 1} of ${pages}`, { fontSize: Math.round(16 * s), fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, 'aa') });
    label.anchor.set(0.5, 0);
    label.x = P.x + P.w / 2;
    label.y = barY + 2;
    this._ui.addChild(label);
    const pipW = 18, pipGap = 6;
    const pipsX = Math.round(P.x + P.w / 2 - (pages * pipW + (pages - 1) * pipGap) / 2);
    const pips = new PIXI.Graphics();
    for (let i = 0; i < pages; i++) {
      pips.rect(pipsX + i * (pipW + pipGap), barY + barH - 10, pipW, 4).fill({ color: i === this._page ? PixiPremiumScene.color(cols.accent) : 0xffffff, alpha: i === this._page ? 1 : 0.2 });
    }
    this._ui.addChild(pips);
  },

  _tile(game, x, y, w, h, s) {
    const tile = { key: game.key };
    const group = PixiPremiumScene.card(this._ui, x, y, w, h, {
      accentStrip: false,
      onClick: () => this.startGame(game.type),
      draw: (card, { hover }) => {
        const cols = ThemeManager.getCurrentColors();
        const sel = this._selected === game.key;
        if (sel && !hover) {
          card.addChild(new PIXI.Graphics().poly(PixiPremiumScene.pixelShape(1, 1, w - 2, h - 2, 4)).stroke({ color: PixiPremiumScene.color(cols.accent), alpha: 0.9, width: 2, alignment: 1 }));
        }
        const pad = 10;
        const nameSize = Math.round(16 * s);
        const tw = w - pad * 2;
        const th = Math.min(Math.round(tw / 1.8), h - pad * 2 - nameSize - 16);
        const thW = Math.round(th * 1.8);
        const thumb = new PIXI.Sprite(PixiPremiumAssets.minigame(game.key));
        thumb.width = thW;
        thumb.height = th;
        thumb.x = Math.round((w - thW) / 2);
        thumb.y = pad + 2 + (hover ? -2 : 0);
        card.addChild(thumb);
        const name = PixiPremiumScene.text(game.name, { fontSize: nameSize, fontWeight: '900', fill: hover || sel ? cols.accent : cols.text });
        name.anchor.set(0.5, 0.5);
        name.x = Math.round(w / 2);
        name.y = Math.round((pad + 2 + th + h) / 2);
        PixiPremiumScene.fit(name, tw, 0.6);
        card.addChild(name);
      },
    });
    group.on('pointerover', () => this._select(game.key));
    tile.redraw = () => group._setHover && group._setHover(false);
    tile.group = group;
    return tile;
  },

  _setFilter(id) {
    if (this._filter === id) return;
    this._filter = id;
    this._page = 0;
    const list = this._visible();
    if (list.length && !list.some(g => g.key === this._selected)) this._selected = list[0].key;
    this._refresh();
  },

  _turn(dir) {
    if (this._pages < 2) return;
    this._page = (this._page + dir + this._pages) % this._pages;
    const first = this._visible()[this._page * this._perPage];
    if (first) this._selected = first.key;
    this._refresh();
  },

  startGame(gameType) {
    if (typeof miniGameManager !== 'undefined') {
      miniGameManager.startPracticeMiniGame(gameType, () => {});
    }
  },

  handleKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Backspace') { switchScreen(this._from); return; }
    const ids = this.FILTERS.map(f => f.id);
    const fi = ids.indexOf(this._filter);
    if (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E') {
      const dir = e.key.toLowerCase() === 'q' ? -1 : 1;
      this._setFilter(ids[(fi + dir + ids.length) % ids.length]);
      return;
    }
    const list = this._visible();
    const idx = list.findIndex(g => g.key === this._selected);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (idx >= 0) this.startGame(list[idx].type);
      return;
    }
    const cols = this._G ? this._G.cols : 3;
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
    if (!(e.key in moves) || !list.length) return;
    e.preventDefault();
    let next = (idx < 0 ? 0 : idx + moves[e.key]);
    next = Math.max(0, Math.min(list.length - 1, next));
    const page = Math.floor(next / this._perPage);
    if (page !== this._page) {
      this._page = page;
      this._selected = list[next].key;
      this._refresh();
    } else {
      this._select(list[next].key);
    }
  },
};
