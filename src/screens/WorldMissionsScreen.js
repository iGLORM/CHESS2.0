// A world's own map: the place itself, drawn as a live pixel map
// (src/themes/scenes/map_<worldId>.js, whose `stops` say where each stop stands),
// with a trail from stop to stop and the guardian, alive, waiting at the end.
// The big map zooms into the world and this map opens out of it (no fade to black).
//
// The stops depend on the world: seven missions then the guardian; a tournament
// then the guardian (Royal Palace, Forked Gulch); the five trainers (the Training
// Camp); Pawnie (Pawn Hollow). Stops open one after another. Each has a line of
// lore (src/characters/lore.js), shown on its card the first time you play it.
// init({ world, fromZoom }). After a first clear, store.missionEvent plays the
// step: the stop is stamped, the king hops on and the next stop opens.
const WorldMissionsScreen = {
  isPixiScreen: true,
  pixiContainer: null,

  L: {
    NODE_R: 30,           // mission stop disc radius (screen px)
    RING_RX: 46,          // ground ring under a character stop
    RING_RY: 15,
    SIDE: 130,            // fallback path inset from the screen edges (no map scene)
    PANEL_H: 150,
    PANEL_W: 980,
    PANEL_GAP: 12,
    DOT_STEP: 14,
    HOP: 42,
    LORE_W: 620,
    PANEL_SHOW: 8,        // the info panel fades after this many idle seconds (tap a stop to see it again)
  },

  init(data = {}) {
    this.world = WORLDS.find(w => w.id === data.world) || WORLDS[2];
    this.save = store.getActiveSave() || {};
    this.stopsDef = this._stopList();
    this.mapId = 'map_' + this.world.id;
    this.hasMap = typeof LiveScenes !== 'undefined' && LiveScenes.has(this.mapId);
    ThemeManager.useStoryTheme(this.world.art);   // story mode shows the land you are in
    this.cols = ThemeManager.getTheme(this.world.art).colors;
    const ev = store.get('missionEvent');
    this.event = ev && ev.world === this.world.id ? ev : null;
    store.set('missionEvent', null);
    this.busy = false;
    this.time = 0;
    this.lore = null;

    const next = this._firstOpen();
    this.tokenAt = this.event ? this.event.index : next;
    this.selected = this.event ? Math.min(this.event.index + 1, this.stopsDef.length - 1) : next;

    TextureManager.preloadTheme(this.world.art);
    this.pixiContainer = PixiPremiumScene.root(this.world.name, this._subtitle(), {
      themeId: this.world.art,
      footerHint: 'Arrow keys to choose  ·  Enter to play',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);
    this.mapLayer = new PIXI.Container();
    // Under the header and footer bands, over the root's backdrop.
    this.pixiContainer.addChildAt(this.mapLayer, Math.min(1, this.pixiContainer.children.length));

    this._buildBackdrop();
    this._layout();
    this._buildPath();
    this._buildNodes();
    this._buildToken();
    this._buildInfoPanel();
    this._pushState();
    PixiPremiumScene.button(this.pixiContainer, 36, PixiPremiumScene.bottomButtonY(44), 180, 44, 'World Map', () => this.back(), { icon: 'back' });

    const after = () => { if (this.event) this._playEvent(this.event); };
    if (this.event) this.busy = true;
    this.mapLayer.pivot.set(Layout.cx, Layout.cy);
    this.mapLayer.position.set(Layout.cx, Layout.cy);
    if (data.fromZoom) {
      // The world map has already opened this map out of its landmark: settle in.
      this.mapLayer.scale.set(1.04);
      gsap.to(this.mapLayer.scale, { x: 1, y: 1, duration: 0.6, ease: 'power2.out', onComplete: after });
      this._fadeInUI();
    } else {
      this.mapLayer.scale.set(1.35);
      this.mapLayer.alpha = 0;
      gsap.to(this.mapLayer, { alpha: 1, duration: 0.5, ease: 'power2.out' });
      gsap.to(this.mapLayer.scale, { x: 1, y: 1, duration: 0.8, ease: 'power3.out', onComplete: after });
    }
  },

  destroy() {
    if (this.pixiContainer) {
      const all = [];
      const walk = n => { all.push(n, n.scale); (n.children || []).forEach(walk); };
      walk(this.pixiContainer);
      all.forEach(o => gsap.killTweensOf(o));
    }
    PixiBackgroundRenderer.destroy();
    PixiPremiumScene.destroy(this);
    this.nodes = null;
    this.lore = null;
  },

  pixiUpdate(dt) {
    if (!this.pixiContainer) return;
    PixiPremiumScene.update(this.pixiContainer, dt);
    this.time += dt;
    for (const n of this.nodes) {
      if (n.pulse.visible) n.pulse.alpha = 0.35 + Math.sin(this.time * 3) * 0.3;
    }
    // The panel gets out of the way of the map's lower stops after a while.
    if (this.panel && this.panelShown && !this.panelHover && !this.busy && !this.lore) {
      this.panelTime += dt;
      if (this.panelTime >= this.L.PANEL_SHOW) this._hidePanel();
    }
    if (this.token && !this.token._hopping) this.token.y = this.token._baseY + Math.sin(this.time * 2.4) * 3;
  },

  /* ------------------------------------------------------------------ */
  /*  Stops                                                              */
  /* ------------------------------------------------------------------ */

  // What stands on this world's map, in trail order.
  _stopList() {
    const w = this.world;
    const missions = StoryMissions.forWorld(w.id);
    const tour = typeof Tournaments !== 'undefined' && Tournaments.forWorld(w.id);
    const out = [];
    if (missions) missions.forEach((m, i) => out.push({ kind: 'mission', mission: m, index: i }));
    else if (tour) out.push({ kind: 'tournament', def: tour });
    const last = w.stages[w.stages.length - 1];
    for (const st of w.stages) {
      out.push({ kind: 'fight', ch: STORY_STAGES[st - 1], stage: st, guardian: st === last && !!(missions || tour) });
    }
    out.forEach((s, i) => { s.i = i; });
    return out;
  },

  _state(i) {
    const s = this.stopsDef[i], save = this.save, w = this.world;
    if (s.kind === 'mission') {
      if (s.index < StoryMissions.cleared(save, w.id)) return 'cleared';
      return StoryMissions.isOpen(save, w, s.index) ? 'open' : 'locked';
    }
    if (s.kind === 'tournament') {
      if (Tournaments.won(save, w.id)) return 'cleared';
      return StoryProgress.isUnlocked(save, w.stages[0]) ? 'open' : 'locked';
    }
    if (StoryProgress.isBeaten(save, s.stage)) return 'cleared';
    if (s.guardian) return StoryMissions.bossReady(save, w) ? 'open' : 'locked';
    return StoryProgress.isUnlocked(save, s.stage) ? 'open' : 'locked';
  },

  // The first stop not yet cleared (or the last one when all are).
  _firstOpen() {
    for (let i = 0; i < this.stopsDef.length; i++) if (this._state(i) !== 'cleared') return i;
    return this.stopsDef.length - 1;
  },

  _cleared() {
    let n = 0;
    while (n < this.stopsDef.length && this._state(n) === 'cleared') n++;
    return n;
  },

  _subtitle() {
    if (StoryProgress.isRestored(this.save, this.world) && this.world.id !== 'pawnhollow') return 'Restored  ·  replay any stop';
    const missions = StoryMissions.forWorld(this.world.id);
    if (missions) return `${StoryMissions.cleared(this.save, this.world.id)} / ${StoryMissions.COUNT} missions`;
    if (this.world.id === 'trainingcamp') return `${this._cleared()} / ${this.stopsDef.length} lessons`;
    const tour = typeof Tournaments !== 'undefined' && Tournaments.forWorld(this.world.id);
    if (tour) return Tournaments.progressLabel(this.save, this.world.id);
    return this.world.id === 'pawnhollow' ? 'Where you woke up' : '';
  },

  _lore(i) {
    const list = typeof PLACE_LORE !== 'undefined' && PLACE_LORE[this.world.id];
    return (list && list[i]) || null;
  },

  _pushState() {
    if (!this.hasMap) return;
    const last = this.stopsDef[this.stopsDef.length - 1];
    const cleared = this.event ? this.event.index : this._cleared();
    LiveScenes.setState(this.mapId, { map: { cleared, beaten: StoryProgress.isBeaten(this.save, last.stage) } });
  },

  /* ------------------------------------------------------------------ */
  /*  Layout                                                             */
  /* ------------------------------------------------------------------ */

  // The place map fills the screen (fits the width in portrait); scene pixels map to
  // screen pixels through this.mapT.
  _buildBackdrop() {
    if (!this.hasMap) { this.mapT = null; return; }
    const def = LiveScenes.get(this.mapId);
    const s = Layout.isPortrait ? Layout.W / def.width : Math.max(Layout.W / def.width, Layout.H / def.height);
    const w = def.width * s, h = def.height * s;
    this.mapT = { s, ox: Math.round((Layout.W - w) / 2), oy: Math.round((Layout.H - h) / 2) };
    const sprite = LiveScenes.sprite(this.mapId);
    sprite.width = w;
    sprite.height = h;
    sprite.x = this.mapT.ox;
    sprite.y = this.mapT.oy;
    this.mapLayer.addChild(sprite);
    this.mapSprite = sprite;
  },

  WorldMapTransform(worldId) {
    const def = LiveScenes.get('map_' + worldId);
    if (!def) return null;
    const s = Layout.isPortrait ? Layout.W / def.width : Math.max(Layout.W / def.width, Layout.H / def.height);
    return { s, w: def.width * s, h: def.height * s, ox: Math.round((Layout.W - def.width * s) / 2), oy: Math.round((Layout.H - def.height * s) / 2) };
  },

  _layout() {
    const count = this.stopsDef.length;
    const def = this.hasMap && LiveScenes.get(this.mapId);
    if (def && def.stops && def.stops.length >= count) {
      const { s, ox, oy } = this.mapT;
      this.stops = def.stops.slice(0, count).map(([x, y]) => ({ x: Math.round(ox + x * s), y: Math.round(oy + y * s) }));
      return;
    }
    // No map yet: stops zigzag across the screen between the header and the panel.
    const L = this.L;
    const top = 170, bottom = PixiPremiumScene.footerY - L.PANEL_H - L.PANEL_GAP - 50;
    const mid = (top + bottom) / 2, amp = Math.min(90, (bottom - top) / 2 - 20);
    this.stops = [];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      this.stops.push({
        x: Math.round(L.SIDE + t * (Layout.W - L.SIDE * 2)),
        y: Math.round(mid + (i % 2 ? amp : -amp) * (i === count - 1 ? 0 : 1)),
      });
    }
  },

  // The king's route between stops (drawn as dots only when there is no map; the
  // map scene paints its own trail).
  _buildPath() {
    this.path = [];
    this.stopIndex = [];
    for (let i = 0; i < this.stops.length; i++) {
      this.stopIndex.push(this.path.length);
      if (i === this.stops.length - 1) { this.path.push(this.stops[i]); break; }
      const a = this.stops[i], b = this.stops[i + 1];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const cx = mx + (i % 2 ? -20 : 20), cy = my + (i % 2 ? 24 : -24);
      const steps = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 4));
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        this.path.push({
          x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * cx + t * t * b.x,
          y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * cy + t * t * b.y,
        });
      }
    }
    this.pathLayer = new PIXI.Container();
    this.mapLayer.addChild(this.pathLayer);
    this._drawPath();
  },

  _drawPath() {
    this.pathLayer.removeChildren().forEach(c => c.destroy());
    if (this.hasMap) return;
    const g = new PIXI.Graphics();
    const walked = this.stopIndex[this.tokenAt];
    const accent = PixiPremiumScene.color(this.cols.accent);
    let acc = 0;
    for (let i = 1; i < this.path.length; i++) {
      acc += Math.hypot(this.path[i].x - this.path[i - 1].x, this.path[i].y - this.path[i - 1].y);
      if (acc < this.L.DOT_STEP) continue;
      acc = 0;
      const p = this.path[i];
      const done = i <= walked;
      g.rect(Math.round(p.x) - 4, Math.round(p.y) - 4, 8, 8).fill({ color: 0x000000, alpha: 0.4 });
      g.rect(Math.round(p.x) - 3, Math.round(p.y) - 3, 6, 6).fill({ color: done ? accent : 0xe9e2d8, alpha: done ? 1 : 0.55 });
    }
    this.pathLayer.addChild(g);
  },

  /* ------------------------------------------------------------------ */
  /*  Nodes                                                              */
  /* ------------------------------------------------------------------ */

  _buildNodes() {
    this.nodeLayer = new PIXI.Container();
    this.mapLayer.addChild(this.nodeLayer);
    this.nodes = this.stops.map((p, i) => this._buildNode(i, p));
    this._highlight();
  },

  _buildNode(i, p) {
    const s = this.stopsDef[i];
    // Characters on a map are drawn by the scene: they get a ring on the ground.
    const figure = s.kind === 'fight' && this.hasMap;
    const r = figure ? this.L.RING_RX : this.L.NODE_R;
    // During an event the stop just cleared starts as it was before the win.
    let state = this._state(i);
    if (this.event && i === this.event.index) state = 'open';
    if (this.event && i === this.event.index + 1) state = 'locked';

    const c = new PIXI.Container();
    c.x = p.x;
    c.y = p.y;
    this.nodeLayer.addChild(c);
    const accent = PixiPremiumScene.color(this.cols.accent);
    const glow = figure
      ? new PIXI.Graphics().ellipse(0, 0, this.L.RING_RX + 12, this.L.RING_RY + 6).fill({ color: accent, alpha: 0.3 })
      : new PIXI.Graphics().circle(0, 0, r + 16).fill({ color: accent, alpha: 0.35 });
    glow.alpha = 0;
    const ring = new PIXI.Graphics();
    const face = new PIXI.Container();
    c.addChild(glow, ring, face);
    const pulse = figure
      ? new PIXI.Graphics().ellipse(0, 0, this.L.RING_RX + 6, this.L.RING_RY + 3).stroke({ color: accent, width: 4 })
      : new PIXI.Graphics().circle(0, 0, r + 9).stroke({ color: accent, width: 4 });
    c.addChild(pulse);

    const drawRing = (st) => {
      ring.clear();
      const col = st === 'cleared' ? accent : st === 'open' ? 0xe9dcc0 : 0x4a4452;
      if (figure) {
        ring.ellipse(0, 0, this.L.RING_RX, this.L.RING_RY).fill({ color: 0x000000, alpha: 0.28 })
          .ellipse(0, 0, this.L.RING_RX, this.L.RING_RY).stroke({ color: col, width: 3, alpha: 0.95 });
        return;
      }
      ring.circle(0, 5, r + 6).fill({ color: 0x000000, alpha: 0.5 })
        .circle(0, 0, r + 5).fill(col)
        .circle(0, 0, r + 1).fill(PixiPremiumScene.color(this.cols.panel));
    };

    if (s.kind === 'fight' && !figure) {
      const portrait = PixiPremiumAssets.characterSprite(s.ch.id);
      portrait.anchor.set(0.5);
      portrait.width = portrait.height = r * 2;
      const mask = new PIXI.Graphics().circle(0, 0, r).fill(0xffffff);
      portrait.mask = mask;
      face.addChild(portrait, mask);
      c._portrait = portrait;
    } else if (s.kind !== 'fight') {
      face.addChild(this._icon(s.kind === 'mission' ? s.mission.kind : 'tournament', r));
    }
    // Lock and tick badges sit above a character (so they don't cover the figure).
    const bx = figure ? r * 0.7 : 0, by = figure ? -r * 1.35 : 0;
    const lock = new PIXI.Sprite(PixiPremiumAssets.icon('lock'));
    lock.anchor.set(0.5);
    lock.width = lock.height = figure ? 30 : r * 0.9;
    lock.x = bx; lock.y = by;
    c.addChild(lock);
    const cx = figure ? bx : r * 0.7, cy = figure ? by : -r * 0.7;
    const check = new PIXI.Graphics()
      .circle(cx, cy, 13).fill(0x2fa84f).circle(cx, cy, 13).stroke({ color: 0xffffff, width: 2 })
      .moveTo(cx - 6, cy).lineTo(cx - 1, cy + 5).lineTo(cx + 7, cy - 5).stroke({ color: 0xffffff, width: 3 });
    c.addChild(check);

    const labelText = s.kind === 'mission' ? s.mission.name : s.kind === 'tournament' ? s.def.name : s.ch.name;
    const label = PixiPremiumScene.text(labelText, {
      fontSize: 15, fontWeight: '800', fill: '#f3ead8', stroke: { color: '#000000', width: 4 },
    });
    label.anchor.set(0.5, 0);
    label.y = figure ? this.L.RING_RY + 8 : r + 12;
    PixiPremiumScene.fit(label, 170);
    c.addChild(label);

    const apply = (st) => {
      drawRing(st);
      face.alpha = st === 'locked' ? 0.3 : 1;
      if (c._portrait) c._portrait.tint = st === 'locked' ? 0x000000 : 0xffffff;
      lock.visible = st === 'locked';
      check.visible = st === 'cleared';
      pulse.visible = st === 'open' && i === this._firstOpen();
      label.alpha = st === 'locked' ? 0.6 : 1;
    };
    apply(state);

    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.hitArea = figure ? new PIXI.Ellipse(0, -30, r + 10, 60) : new PIXI.Circle(0, 0, r + 10);
    c.on('pointertap', () => { if (!this.busy && !this.lore) this._select(i); });
    return { i, c, r, glow, pulse, check, apply, figure };
  },

  // Stop symbols, drawn so they read on any world's colours.
  _icon(kind, r) {
    const g = new PIXI.Graphics();
    const col = PixiPremiumScene.color(this.cols.accent);
    const s = r * 0.5;
    if (kind === 'trial') {
      const pts = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? s * 0.45 : s;
        pts.push(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.poly(pts).fill(col);
    } else if (kind === 'hunt') {
      for (const d of [-1, 1]) {
        g.moveTo(-s * d, -s).lineTo(s * 0.7 * d, s * 0.7).stroke({ color: col, width: 6 });
        g.moveTo(s * 0.35 * d, s * 0.95).lineTo(s * 0.95 * d, s * 0.35).stroke({ color: col, width: 5 });
      }
    } else if (kind === 'relic') {
      g.poly([-s * 0.9, -s * 0.25, -s * 0.45, -s * 0.8, s * 0.45, -s * 0.8, s * 0.9, -s * 0.25, 0, s * 0.95]).fill(col)
        .poly([-s * 0.45, -s * 0.8, s * 0.45, -s * 0.8, s * 0.2, -s * 0.25, -s * 0.2, -s * 0.25]).fill({ color: 0xffffff, alpha: 0.45 })
        .poly([-s * 0.9, -s * 0.25, s * 0.9, -s * 0.25, 0, s * 0.95]).stroke({ color: 0x000000, width: 2, alpha: 0.35 });
    } else if (kind === 'memory') {
      g.circle(-s * 0.1, -s * 0.1, s * 0.8).fill(col)
        .circle(s * 0.25, -s * 0.35, s * 0.68).fill(PixiPremiumScene.color(this.cols.panel));
      for (const [x, y] of [[s * 0.55, s * 0.45], [s * 0.15, s * 0.75]]) g.rect(x - 3, y - 3, 6, 6).fill(col);
    } else if (kind === 'wild') {
      g.circle(0, -s * 0.55, s * 0.32).fill(col)
        .poly([-s * 0.28, -s * 0.2, s * 0.28, -s * 0.2, s * 0.45, s * 0.6, -s * 0.45, s * 0.6]).fill(col)
        .rect(-s * 0.7, s * 0.6, s * 1.4, s * 0.3).fill(col);
    } else if (kind === 'tournament') {
      // A cup.
      g.rect(-s * 0.6, -s * 0.8, s * 1.2, s * 0.9).fill(col)
        .rect(-s * 0.95, -s * 0.75, s * 0.3, s * 0.45).fill(col).rect(s * 0.65, -s * 0.75, s * 0.3, s * 0.45).fill(col)
        .rect(-s * 0.15, s * 0.1, s * 0.3, s * 0.45).fill(col).rect(-s * 0.55, s * 0.55, s * 1.1, s * 0.3).fill(col)
        .rect(-s * 0.4, -s * 0.7, s * 0.2, s * 0.6).fill({ color: 0xffffff, alpha: 0.4 });
    } else {
      const t = PixiPremiumScene.text(kind === 'puzzle' ? '?' : '!', { fontFamily: PixiTextStyles.FONT_BODY, fontSize: Math.round(r * 1.05), fontWeight: 'bold', fill: this.cols.accent });
      t.anchor.set(0.5);
      t.y = 2;
      return t;
    }
    return g;
  },

  _buildToken() {
    const p = this.stops[this.tokenAt];
    this.tokenShadow = new PIXI.Graphics().ellipse(0, 0, 18, 5).fill({ color: 0x000000, alpha: 0.45 });
    // You, as the character worn on the world map (a Shop cosmetic; the king by default).
    const look = typeof Wallet !== 'undefined' ? Wallet.token() : { piece: 'king', color: 'white', art: null };
    this.token = PixiPieceRenderer.createSprite(PixiPieceRenderer.withArt(look.art || this.world.art), look.color, look.piece);
    this.token.anchor.set(0.5, 1);
    this.token.width = this.token.height = 56;
    this._placeToken(p, this.tokenAt);
    this.mapLayer.addChild(this.tokenShadow, this.token);
  },

  // The king waits beside a stop (a little further out beside a character's ring).
  _tokenOffset(i) {
    const n = this.nodes && this.nodes[i];
    return n && n.figure ? this.L.RING_RX + 18 : this.L.NODE_R + 8;
  },

  _placeToken(p, i) {
    const dx = this._tokenOffset(i);
    this.token.x = this.tokenShadow.x = p.x - dx;
    this.token._baseY = p.y + 6;
    this.token.y = this.token._baseY;
    this.tokenShadow.y = this.token._baseY + 2;
  },

  _highlight() {
    for (const n of this.nodes) n.glow.alpha = n.i === this.selected ? 1 : 0;
  },

  _select(i) {
    this.selected = Math.max(0, Math.min(this.stopsDef.length - 1, i));
    this._highlight();
    this._buildInfoPanel();
    audioManager.playSelect();
  },

  /* ------------------------------------------------------------------ */
  /*  Info panel and starting                                            */
  /* ------------------------------------------------------------------ */

  _showPanel() {
    if (!this.panel) return;
    this.panelTime = 0;
    if (this.panelShown) return;
    this.panelShown = true;
    gsap.killTweensOf(this.panel);
    this.panel.visible = true;
    gsap.to(this.panel, { alpha: 1, duration: 0.25 });
  },

  _hidePanel() {
    if (!this.panel || !this.panelShown) return;
    this.panelShown = false;
    this.panelHover = false;
    gsap.killTweensOf(this.panel);
    gsap.to(this.panel, { alpha: 0, duration: 0.35, onComplete: () => { if (this.panel && !this.panelShown) this.panel.visible = false; } });
  },

  _buildInfoPanel() {
    if (this.panel) { gsap.killTweensOf(this.panel); this.panel.destroy({ children: true }); }
    this.panelShown = true;
    this.panelTime = 0;
    this.panelHover = false;
    const L = this.L;
    const s = Layout.uiScale || 1;
    const w = Math.min(L.PANEL_W, Layout.W - 56);
    // In portrait the panel is too narrow for three columns: the rule and the
    // button go on a second row under the name and the lore.
    const stacked = Layout.isPortrait;
    const ROW1 = stacked ? L.PANEL_H + 20 : L.PANEL_H;
    const h = stacked ? ROW1 + 100 : L.PANEL_H;
    const x = Math.round((Layout.W - w) / 2);
    const y = PixiPremiumScene.footerY - h - L.PANEL_GAP;
    const panel = new PIXI.Container();
    this.pixiContainer.addChild(panel);
    this.panel = panel;
    const stop = this.stopsDef[this.selected];
    const state = this._state(this.selected);
    const open = state !== 'locked';
    const lore = this._lore(this.selected);
    const world = this.world;
    let portraitId, kicker, name, who, label, desc, statusText, btn;
    if (stop.kind === 'mission') {
      const m = stop.mission, ch = StoryMissions.character(m.id);
      portraitId = ch.id;
      kicker = `MISSION ${m.index + 1} / ${StoryMissions.COUNT}  ·  ${MISSION_KINDS[m.kind].label.toUpperCase()}`;
      name = m.name;
      who = `vs ${ch.name}, ${ch.title}`;
      label = m.rule.title.toUpperCase();
      desc = m.rule.lines[m.rule.lines.length - 1];
      statusText = state === 'cleared' ? 'Cleared' : open ? 'Next mission' : 'Clear the mission before it';
      btn = state === 'cleared' ? 'Replay' : 'Play';
    } else if (stop.kind === 'tournament') {
      const g = Tournaments.guardian(world.id);
      portraitId = g.id;
      kicker = `TOURNAMENT  ·  ${world.name.toUpperCase()}`;
      name = stop.def.name;
      who = Tournaments.progressLabel(this.save, world.id);
      label = 'THE PRIZE';
      desc = `Win it, and ${g.name} will face you.`;
      statusText = state === 'cleared' ? 'Champion' : open ? 'Enter the draw' : 'Locked';
      btn = 'Enter';
    } else {
      const ch = stop.ch, rule = BossRules.get(ch.id);
      portraitId = ch.id;
      kicker = ch.trainer ? `LESSON ${ch.stage - 1} / 5  ·  ${world.name.toUpperCase()}`
        : stop.guardian ? `GUARDIAN  ·  ${world.name.toUpperCase()}` : world.name.toUpperCase();
      name = ch.name;
      who = ch.title;
      label = ch.trainer ? 'YOUR TEST' : 'BOSS RULE';
      desc = rule ? rule.title : 'A normal match';
      const before = this.stopsDef[this.selected - 1];
      statusText = state === 'cleared' ? (ch.trainer ? 'Passed' : 'Defeated')
        : open ? (stop.guardian ? 'The guardian awaits' : ch.trainer ? 'Next lesson' : 'Next battle')
          : stop.guardian ? (before && before.kind === 'tournament' ? `Win ${before.def.name} first` : `Clear all ${StoryMissions.COUNT} missions first`)
            : 'Finish the stop before it';
      btn = state === 'cleared' ? 'Replay' : ch.trainer ? 'Train' : 'Fight';
    }
    PixiPremiumScene.panel(panel, x, y, w, h, { accent: this.cols.accent, accentAlpha: 0.8 });

    const pad = 18;
    const portraitSize = L.PANEL_H - pad * 2 - 6;
    const portrait = PixiPremiumAssets.characterSprite(portraitId);
    portrait.width = portrait.height = portraitSize;
    portrait.x = x + pad;
    portrait.y = y + pad + 4;
    if (!open) portrait.tint = 0x000000;
    panel.addChild(new PIXI.Graphics().roundRect(portrait.x - 3, portrait.y - 3, portraitSize + 6, portraitSize + 6, 6)
      .fill(0x120d18).stroke({ color: PixiPremiumScene.color(this.cols.accent), width: 2, alpha: 0.9 }));
    panel.addChild(portrait);

    const tx = portrait.x + portraitSize + 18;
    const btnW = 170, btnH = 52;
    const RULE_W = 270;
    const rx = stacked ? x + pad : x + w - btnW - pad * 2 - RULE_W;
    const ruleW = stacked ? w - btnW - pad * 4 : RULE_W;
    const ruleY = stacked ? y + ROW1 - 4 : y + pad + 2;
    const textMax = stacked ? x + w - pad - tx : rx - tx - 20;
    const k = PixiPremiumScene.text(kicker, { fontSize: 12, fontWeight: '900', fill: PixiPremiumScene.alpha(this.cols.text, '99'), letterSpacing: 1 });
    k.x = tx;
    k.y = y + pad;
    PixiPremiumScene.fit(k, textMax);
    const nm = PixiPremiumScene.text(name, { fontSize: Math.round(24 * s), fontWeight: '900', fill: this.cols.text });
    nm.x = tx;
    nm.y = k.y + 18;
    PixiPremiumScene.fit(nm, textMax);
    const wh = PixiPremiumScene.text(who, { fontSize: Math.round(14 * s), fontWeight: '800', fill: this.cols.accent });
    wh.x = tx;
    wh.y = nm.y + nm.height + 2;
    PixiPremiumScene.fit(wh, textMax);
    panel.addChild(k, nm, wh);
    if (lore) {
      // The place's lore, under the name.
      const lt = PixiPremiumScene.text(`${lore.place}: ${lore.text}`, {
        fontSize: Math.round(13 * s), fontStyle: 'italic', fontWeight: '600', fill: PixiPremiumScene.alpha(this.cols.text, 'bb'),
        wordWrap: true, wordWrapWidth: textMax - 14, lineHeight: 17,   // italics lean past the measured width
      });
      lt.x = tx;
      lt.y = wh.y + wh.height + 6;
      const room = (stacked ? ruleY - 10 : y + h - pad) - lt.y;
      if (lt.height > room) lt.scale.set(Math.max(0.75, room / lt.height));
      panel.addChild(lt);
    }

    const lb = PixiPremiumScene.text(label, { fontSize: 12, fontWeight: '900', fill: PixiPremiumScene.alpha(this.cols.text, '88'), letterSpacing: 1 });
    lb.x = rx;
    lb.y = ruleY;
    PixiPremiumScene.fit(lb, ruleW - 10);
    const d = PixiPremiumScene.text(desc, { fontSize: Math.round(15 * s), fontWeight: '700', fill: this.cols.text, wordWrap: true, wordWrapWidth: ruleW - 10, lineHeight: 20 });
    d.x = rx;
    d.y = lb.y + 20;
    const st = PixiPremiumScene.text(statusText, { fontSize: Math.round(14 * s), fontWeight: '800', fill: state === 'cleared' ? '#7dea99' : open ? this.cols.accent : '#8a8494' });
    st.x = rx;
    st.y = y + h - pad - 18;
    PixiPremiumScene.fit(st, ruleW - 10);
    panel.addChild(lb, d, st);

    if (open) {
      const by = stacked ? ruleY + Math.round((y + h - ruleY - btnH) / 2) : y + Math.round((h - btnH) / 2);
      PixiPremiumScene.button(panel, x + w - btnW - pad, by, btnW, btnH, btn, () => this.start(), { primary: true, icon: 'play', fontSize: 20 });
    }
    panel.eventMode = 'static';
    panel.hitArea = new PIXI.Rectangle(x, y, w, h);
    panel.on('pointerover', () => { this.panelHover = true; this.panelTime = 0; });
    panel.on('pointerout', () => { this.panelHover = false; });
  },

  start() {
    if (this.busy || this.lore || this._state(this.selected) === 'locked') return;
    const i = this.selected;
    const lore = this._lore(i);
    const key = `${this.world.id}:${i}`;
    const seen = this.save.loreSeen || [];
    if (lore && !seen.includes(key)) {
      store.setActiveSave({ loreSeen: [...seen, key] });
      this.save = store.getActiveSave();
      store.saveProgress();
      this._showLore(lore, () => this._go(i));
      return;
    }
    this._go(i);
  },

  _go(i) {
    this.busy = true;
    const stop = this.stopsDef[i];
    const p = this.stops[i];
    const world = this.world;
    const tl = gsap.timeline({
      onComplete: () => {
        if (stop.kind === 'tournament') { switchScreen('tournament', { world: world.id }); return; }
        const ch = stop.kind === 'mission' ? StoryMissions.character(stop.mission.id) : stop.ch;
        if (stop.kind === 'fight') store.setActiveSave({ selectedCharacter: ch.id, storyLevel: ch.stage });
        store.update({ selectedCharacter: ch.id, mode: 'story' });
        if (stop.kind === 'fight') store.set('storyLevel', ch.stage);
        ThemeManager.useStoryTheme(world.art);
        store.saveProgress();
        const scene = stop.kind === 'fight' && StoryScenes.before(store.getActiveSave(), ch.stage);
        if (scene) switchScreen('storyScene', { scene, next: 'game' });
        else switchScreen('game');
      },
    });
    this.mapLayer.pivot.set(p.x, p.y);
    this.mapLayer.position.set(p.x, p.y);
    tl.to(this.mapLayer.scale, { x: 2.2, y: 2.2, duration: 0.6, ease: 'power2.in' })
      .to(this.mapLayer.position, { x: Layout.cx, y: Layout.cy, duration: 0.6, ease: 'power2.in' }, 0);
    audioManager.playButton();
  },

  // A parchment card with the place's lore, the first time a stop is played.
  _showLore(lore, done) {
    const L = this.L;
    const c = new PIXI.Container();
    this.lore = { c, done };
    const shade = new PIXI.Graphics().rect(0, 0, Layout.W, Layout.H).fill({ color: 0x000000, alpha: 0.55 });
    shade.eventMode = 'static';
    c.addChild(shade);
    const w = Math.min(L.LORE_W, Layout.W - 60);
    const text = PixiPremiumScene.text(lore.text, {
      fontSize: 19, fontWeight: '700', fill: '#3a2614', wordWrap: true, wordWrapWidth: w - 80, lineHeight: 27, align: 'center',
    });
    const h = Math.max(230, text.height + 170);
    const x = Math.round((Layout.W - w) / 2), y = Math.round((Layout.H - h) / 2) - 20;
    // Parchment with stepped pixel corners and a darker rim.
    const g = new PIXI.Graphics();
    const step = 6;
    g.rect(x + step, y, w - step * 2, h).fill(0x6a4a26).rect(x, y + step, w, h - step * 2).fill(0x6a4a26);
    g.rect(x + step, y + 4, w - step * 2, h - 8).fill(0xe8d5a8).rect(x + 4, y + step, w - 8, h - step * 2).fill(0xe8d5a8);
    for (let i = 0; i < 40; i++) {
      const px = x + 10 + ((i * 97) % (w - 20)), py = y + 10 + ((i * 53) % (h - 20));
      g.rect(px, py, 4, 4).fill({ color: 0xc9ae7a, alpha: 0.5 });
    }
    g.rect(x + 30, y + 72, w - 60, 2).fill({ color: 0x8a6a3a, alpha: 0.6 });
    c.addChild(g);
    const title = PixiPremiumScene.text(lore.place.toUpperCase(), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 26, fill: '#5a3a18' });
    title.anchor.set(0.5, 0);
    title.x = Layout.W / 2;
    title.y = y + 26;
    PixiPremiumScene.fit(title, w - 60);
    text.anchor.set(0.5, 0);
    text.x = Layout.W / 2;
    text.y = y + 92;
    c.addChild(title, text);
    PixiPremiumScene.button(c, Layout.W / 2 - 90, y + h - 70, 180, 48, 'Continue', () => this._closeLore(), { primary: true, icon: 'play' });
    this.pixiContainer.addChild(c);
    c.alpha = 0;
    gsap.to(c, { alpha: 1, duration: 0.3 });
    gsap.from(g.scale, { x: 0.96, y: 0.96, duration: 0.3, ease: 'back.out(2)' });
    audioManager.playSelect();
  },

  _closeLore() {
    if (!this.lore) return;
    const { c, done } = this.lore;
    this.lore = null;
    gsap.killTweensOf(c);
    c.destroy({ children: true });
    done();
  },

  _fadeInUI() {
    for (const child of this.pixiContainer.children) {
      if (child === this.mapLayer || child.label === 'premiumBackground') continue;
      child.alpha = 0;
      gsap.to(child, { alpha: 1, duration: 0.45, delay: 0.15 });
    }
  },

  back() {
    if (this.busy) return;
    switchScreen('worldMap');
  },

  handleKeyDown(e) {
    if (this.lore) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') this._closeLore();
      return;
    }
    if (this.busy) return;
    if (e.key === 'Escape') this.back();
    else if (e.key === 'ArrowRight') this._select(this.selected + 1);
    else if (e.key === 'ArrowLeft') this._select(this.selected - 1);
    else if (e.key === 'Enter' || e.key === ' ') {
      if (!this.panelShown) this._showPanel();
      else this.start();
    }
  },

  /* ------------------------------------------------------------------ */
  /*  After a first clear                                                */
  /* ------------------------------------------------------------------ */

  _playEvent(ev) {
    const done = this.nodes[ev.index];
    const next = this.nodes[ev.index + 1];
    const tl = gsap.timeline({ onComplete: () => { this.busy = false; if (next) this._select(ev.index + 1); } });
    tl.add(() => {
      done.apply('cleared');
      done.pulse.visible = false;
      gsap.fromTo(done.check.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(3)' });
      gsap.fromTo(done.c.scale, { x: 1.2, y: 1.2 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(2)' });
      this._sparkle(done);
      if (this.hasMap) LiveScenes.setState(this.mapId, { map: { cleared: ev.index + 1, beaten: false } });
      audioManager.playVictory();
    });
    if (!next) return;
    tl.add(() => this._travel(ev.index, ev.index + 1), '+=0.5');
    tl.add(() => {}, `+=${this._travelTime(ev.index, ev.index + 1) + 0.1}`);
    tl.add(() => {
      const st = this._state(ev.index + 1);
      next.apply(st);
      next.pulse.visible = st === 'open';
      gsap.fromTo(next.c.scale, { x: 1.4, y: 1.4 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(3)' });
      const stop = this.stopsDef[ev.index + 1];
      if (stop.guardian && st === 'open') {
        this._sparkle(next);
        this._banner('THE GUARDIAN AWAITS');
      }
      audioManager.playSelect();
    });
  },

  _banner(text) {
    const t = PixiPremiumScene.text(text, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 40, fontWeight: 'bold', fill: this.cols.accent, stroke: { color: '#000000', width: 6 } });
    t.anchor.set(0.5);
    t.x = Layout.cx;
    t.y = 150;
    t.alpha = 0;
    this.pixiContainer.addChild(t);
    gsap.timeline({ onComplete: () => t.destroy() })
      .to(t, { alpha: 1, duration: 0.3 })
      .from(t.scale, { x: 1.6, y: 1.6, duration: 0.4, ease: 'back.out(2)' }, '<')
      .to(t, { alpha: 0, duration: 0.5 }, '+=1.4');
  },

  _sparkle(node) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const p = new PIXI.Graphics().rect(-3, -3, 6, 6).fill(i % 2 ? PixiPremiumScene.color(this.cols.accent) : 0xffffff);
      p.x = node.c.x + Math.cos(a) * node.r * 0.6;
      p.y = node.c.y + Math.sin(a) * node.r * 0.6;
      this.mapLayer.addChild(p);
      gsap.to(p, { x: node.c.x + Math.cos(a) * (node.r + 46), y: node.c.y + Math.sin(a) * (node.r + 46), alpha: 0, duration: 0.8, ease: 'power2.out', onComplete: () => p.destroy() });
    }
  },

  _hops(from, to) {
    const a = this.stopIndex[from], b = this.stopIndex[to];
    const hops = [];
    let acc = 0;
    for (let i = a + 1; i <= b; i++) {
      acc += Math.hypot(this.path[i].x - this.path[i - 1].x, this.path[i].y - this.path[i - 1].y);
      if (acc >= this.L.HOP || i === b) { hops.push(this.path[i]); acc = 0; }
    }
    return hops;
  },

  _travelTime(from, to) {
    return this._hops(from, to).length * 0.18;
  },

  _travel(from, to) {
    const hops = this._hops(from, to);
    const tl = gsap.timeline({ onComplete: () => { this.token._hopping = false; } });
    this.token._hopping = true;
    let prev = { x: this.token.x, y: this.token._baseY };
    hops.forEach((p, i) => {
      const last = i === hops.length - 1;
      const target = { x: last ? p.x - this._tokenOffset(to) : p.x, y: last ? p.y + 6 : p.y };
      const start = { ...prev };
      const t = { v: 0 };
      tl.to(t, {
        v: 1, duration: 0.18, ease: 'none',
        onUpdate: () => {
          this.token.x = this.tokenShadow.x = start.x + (target.x - start.x) * t.v;
          this.token.y = start.y + (target.y - start.y) * t.v - Math.sin(Math.PI * t.v) * 14;
          this.tokenShadow.y = start.y + (target.y - start.y) * t.v + 2;
        },
      });
      prev = target;
    });
    tl.add(() => {
      this.token._baseY = prev.y;
      this.tokenAt = to;
      this._drawPath();
    });
  },
};
