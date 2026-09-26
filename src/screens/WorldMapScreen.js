// Story mode's world map: the eleven worlds of the Shattered Board joined by a
// dotted path. Your king token stands at the furthest stage you have reached;
// click a world (or a Training Camp stop) to see who waits there and fight.
// After a win the map plays the reward: the world is restored in a wave of
// colour, its fragment flies to the counter, and the king hops onwards.
const WorldMapScreen = {
  isPixiScreen: true,
  pixiContainer: null,

  L: {
    MAP_W: 3620,
    MAP_H: 470,
    TOP: 116,             // map area starts under the header
    STOP_R: 16,           // Training Camp stops
    STOP_Y: 300,
    STOP_X: [420, 490, 560, 630, 700],
    PLATE_GAP: 16,        // medallion edge to its name plate
    PANEL_H: 132,
    PANEL_W: 940,
    PANEL_GAP: 12,        // info panel to the footer
    DOT_STEP: 14,         // spacing of the path's dots
    HOP: 46,              // length of one king hop along the path
  },

  init() {
    this.save = store.getActiveSave() || {};
    this.cols = ThemeManager.getCurrentColors();
    this.event = store.get('storyMapEvent') || null;
    store.set('storyMapEvent', null);
    this.busy = false;
    this.camX = 0;
    this.camTarget = 0;
    this.drag = null;
    this.time = 0;

    const frontier = Math.min(this.save.maxUnlockedLevel || 1, STORY_STAGES.length);
    // During a travel event the king starts on the stage just beaten.
    this.tokenStage = this.event ? this.event.stage : frontier;
    this.selected = this.event ? this.event.stage : Math.min(this.save.storyLevel || frontier, frontier);

    this.pixiContainer = PixiPremiumScene.root('Story Mode', 'The Shattered Board', {
      footerHint: 'Drag or use the arrow keys to explore the map',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);
    const shade = new PIXI.Graphics().rect(0, 0, Layout.W, Layout.H).fill({ color: 0x03050c, alpha: 0.55 });
    this.pixiContainer.addChildAt(shade, 1);

    this._buildMap();
    this._highlight();
    this._buildFragmentCounter();
    this._buildInfoPanel();
    const s = Layout.uiScale || 1;
    PixiPremiumScene.button(this.pixiContainer, 36, PixiPremiumScene.bottomButtonY(44), Math.round(160 * s), 44, 'Saves', () => this.back(), { icon: 'back' });

    this._focus(this._stopPos(this.tokenStage).x, true);
    this._wheel = (e) => {
      if (this.busy) return;
      this.camTarget = this._clampCam(this.camTarget + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY));
    };
    if (PixiApp.app && PixiApp.app.canvas) PixiApp.app.canvas.addEventListener('wheel', this._wheel, { passive: true });

    if (this.event) this._playEvent(this.event);
  },

  destroy() {
    if (PixiApp.app && PixiApp.app.canvas && this._wheel) PixiApp.app.canvas.removeEventListener('wheel', this._wheel);
    this._wheel = null;
    if (this._timeline) { this._timeline.kill(); this._timeline = null; }
    if (this.pixiContainer) {
      const all = [];
      const walk = n => { all.push(n, n.scale); (n.children || []).forEach(walk); };
      walk(this.pixiContainer);
      all.forEach(o => gsap.killTweensOf(o));
    }
    PixiPremiumScene.destroy(this);
    this.nodes = null;
  },

  pixiUpdate(dt) {
    if (!this.pixiContainer) return;
    PixiPremiumScene.update(this.pixiContainer, dt);
    this.time += dt;
    if (!this.drag) this.camX += (this.camTarget - this.camX) * Math.min(1, dt * 8);
    this.map.x = -this.camX + this._mapOffsetX;
    // The current world's ring pulses; the king bobs.
    for (const n of this.nodes) {
      if (n.pulse.visible) n.pulse.alpha = 0.35 + Math.sin(this.time * 3) * 0.25;
    }
    if (this.token && !this.token._hopping) this.token.y = this.token._baseY + Math.sin(this.time * 2.4) * 3;
  },

  /* ------------------------------------------------------------------ */
  /*  Map                                                                */
  /* ------------------------------------------------------------------ */

  get _viewH() { return PixiPremiumScene.footerY - this.L.PANEL_H - this.L.PANEL_GAP - this.L.TOP; },

  _buildMap() {
    const L = this.L;
    this.map = new PIXI.Container();
    this._mapOffsetX = 0;
    this.map.y = L.TOP + Math.max(0, Math.round((this._viewH - L.MAP_H) / 2));
    this.pixiContainer.addChild(this.map);

    // Invisible drag surface behind everything on the map.
    const surface = new PIXI.Graphics().rect(-400, -200, L.MAP_W + 800, L.MAP_H + 400).fill({ color: 0x000000, alpha: 0.001 });
    surface.eventMode = 'static';
    surface.cursor = 'grab';
    surface.on('pointerdown', (e) => { if (!this.busy) this.drag = { x: e.global.x, cam: this.camX, moved: false }; });
    surface.on('globalpointermove', (e) => {
      if (!this.drag) return;
      const dx = e.global.x - this.drag.x;
      if (Math.abs(dx) > 4) this.drag.moved = true;
      this.camX = this.camTarget = this._clampCam(this.drag.cam - dx);
    });
    const end = () => { this.drag = null; };
    surface.on('pointerup', end);
    surface.on('pointerupoutside', end);
    this.map.addChild(surface);

    this._buildPath();
    this.pathLayer = new PIXI.Container();
    this.map.addChild(this.pathLayer);
    this._drawPath();

    this.nodes = [];
    this.nodeLayer = new PIXI.Container();
    this.map.addChild(this.nodeLayer);
    for (const world of WORLDS) this.nodes.push(this._buildWorld(world));
    this.stopNodes = L.STOP_X.map((x, i) => this._buildStop(i + 2, x));

    this.token = PixiPieceRenderer.createSprite(store.get('theme') || 'pawnhollow', 'white', 'king');
    this.token.width = this.token.height = 52;
    this.token.anchor.set(0.5, 0.92);
    const p = this._stopPos(this.tokenStage);
    this.token.x = p.x;
    this.token.y = this.token._baseY = p.y - this._stopRadius(this.tokenStage) * 0.2;
    const shadow = new PIXI.Graphics().ellipse(0, 0, 18, 6).fill({ color: 0x000000, alpha: 0.45 });
    this.tokenShadow = shadow;
    shadow.x = p.x;
    shadow.y = p.y - this._stopRadius(this.tokenStage) * 0.2 + 2;
    this.map.addChild(shadow, this.token);
  },

  // Painted scene textures, shared by every visit to the map.
  _artCache: {},
  _artTexture(themeId) {
    if (!this._artCache[themeId]) {
      this._artCache[themeId] = TextureManager.loadImage(TextureManager.backgroundPath(themeId))
        .then(img => (img ? PIXI.Texture.from({ resource: img, scaleMode: 'linear' }) : null));
    }
    return this._artCache[themeId];
  },

  _clampCam(x) {
    const max = Math.max(0, this.L.MAP_W - Layout.W);
    return Math.max(0, Math.min(max, x));
  },

  _focus(mapX, instant) {
    this.camTarget = this._clampCam(mapX - Layout.W / 2);
    if (instant) this.camX = this.camTarget;
  },

  _world(stage) {
    return WORLDS.find(w => w.stages.includes(stage));
  },

  // Where the king stands for a stage: a world's centre, or a Training Camp stop.
  _stopPos(stage) {
    if (stage >= 2 && stage <= 6) return { x: this.L.STOP_X[stage - 2], y: this.L.STOP_Y };
    const w = this._world(stage);
    return { x: w.pos[0], y: w.pos[1] };
  },

  _stopRadius(stage) {
    return stage >= 2 && stage <= 6 ? this.L.STOP_R : this._world(stage).r;
  },

  // The path as a list of points: a gentle curve between consecutive stops.
  _buildPath() {
    const stops = STORY_STAGES.map(ch => this._stopPos(ch.stage));
    this.path = [];
    this.stopIndex = [];
    for (let i = 0; i < stops.length; i++) {
      this.stopIndex.push(this.path.length);
      if (i === stops.length - 1) { this.path.push(stops[i]); break; }
      const a = stops[i], b = stops[i + 1];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const bend = (i % 2 ? 1 : -1) * Math.min(60, len * 0.18);
      const cx = mx - (dy / len) * bend, cy = my + (dx / len) * bend;
      const steps = Math.max(2, Math.round(len / 4));
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        this.path.push({
          x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * cx + t * t * b.x,
          y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * cy + t * t * b.y,
        });
      }
    }
  },

  // Dots along the path; the part already walked glows in the accent colour.
  _drawPath() {
    this.pathLayer.removeChildren().forEach(c => c.destroy());
    const g = new PIXI.Graphics();
    const walked = this.stopIndex[Math.max(0, this.tokenStage - 1)];
    const accent = PixiPremiumScene.color(this.cols.accent);
    let acc = 0;
    for (let i = 1; i < this.path.length; i++) {
      acc += Math.hypot(this.path[i].x - this.path[i - 1].x, this.path[i].y - this.path[i - 1].y);
      if (acc < this.L.DOT_STEP) continue;
      acc = 0;
      const p = this.path[i];
      const done = i <= walked;
      g.rect(Math.round(p.x) - 3, Math.round(p.y) - 3, 6, 6).fill({ color: done ? accent : 0xc9c2b8, alpha: done ? 0.95 : 0.35 });
    }
    this.pathLayer.addChild(g);
  },

  _state(world) {
    const first = world.stages[0];
    if (!StoryProgress.isUnlocked(this.save, first)) return 'locked';
    if (StoryProgress.isRestored(this.save, world)) return 'restored';
    return 'open';
  },

  _buildWorld(world) {
    const [x, y] = world.pos;
    const r = world.r;
    const node = new PIXI.Container();
    node.x = x;
    node.y = y;
    this.nodeLayer.addChild(node);
    const state = this._state(world);
    // During a travel event, the world just finished starts un-restored.
    const eventWorld = this.event && this._world(this.event.stage) === world && world.id !== 'pawnhollow';
    const showState = eventWorld && state === 'restored' ? 'open' : state;

    // The world's painted scene, cropped to the medallion (loaded on demand).
    const fitArt = (sprite, tex) => {
      sprite.texture = tex;
      sprite.scale.set((r * 2.3) / Math.min(tex.width || 1280, tex.height || 800));
    };
    const makeArt = () => {
      const s = new PIXI.Sprite(PIXI.Texture.EMPTY);
      s.anchor.set(0.5);
      return s;
    };
    const glow = new PIXI.Graphics().circle(0, 0, r + 14).fill({ color: PixiPremiumScene.color(this.cols.accent), alpha: 0.35 });
    glow.alpha = 0;
    node.addChild(glow);
    const ring = new PIXI.Graphics();
    const drawRing = (locked) => ring.clear()
      .circle(0, 4, r + 6).fill({ color: 0x000000, alpha: 0.5 })
      .circle(0, 0, r + 5).fill(locked ? 0x3a3542 : 0xe9dcc0)
      .circle(0, 0, r + 1).fill(0x120d18);
    drawRing(showState === 'locked');
    node.addChild(ring);

    const grey = makeArt();
    const greyFilter = new PIXI.ColorMatrixFilter();
    greyFilter.desaturate();
    const dim = new PIXI.ColorMatrixFilter();
    dim.brightness(showState === 'locked' ? 0.35 : 0.6, false);
    grey.filters = [greyFilter, dim];
    const greyMask = new PIXI.Graphics().circle(0, 0, r).fill(0xffffff);
    grey.mask = greyMask;
    node.addChild(grey, greyMask);

    const colour = makeArt();
    const colourMask = new PIXI.Graphics().circle(0, 0, showState === 'restored' ? r : 0).fill(0xffffff);
    colour.mask = colourMask;
    node.addChild(colour, colourMask);
    this._artTexture(world.art).then(tex => {
      if (!tex || grey.destroyed || colour.destroyed) return;
      fitArt(grey, tex);
      fitArt(colour, tex);
    });

    const cracks = this._cracks(r);
    cracks.alpha = showState === 'locked' ? 0.85 : showState === 'open' ? 0.35 : 0;
    node.addChild(cracks);

    // The world's guardian (a silhouette until you reach them).
    const ch = STORY_STAGES[world.stages[world.stages.length - 1] - 1];
    const portraitSize = Math.round(r * 0.8);
    const portrait = new PIXI.Sprite(PixiPremiumAssets.character(world.id === 'trainingcamp' ? 'sergeantsquare' : ch.id));
    portrait.width = portrait.height = portraitSize;
    portrait.anchor.set(0.5);
    portrait.x = r * 0.72;
    portrait.y = -r * 0.72;
    const portraitRing = new PIXI.Graphics().circle(portrait.x, portrait.y, portraitSize * 0.56).fill(0x120d18)
      .circle(portrait.x, portrait.y, portraitSize * 0.56).stroke({ color: 0xe9dcc0, width: 3 });
    if (showState === 'locked') portrait.tint = 0x000000;
    const unknown = PixiPremiumScene.text('?', { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(r * 0.42), fill: '#8a8494' });
    unknown.anchor.set(0.5);
    unknown.x = portrait.x;
    unknown.y = portrait.y + 2;
    unknown.visible = showState === 'locked';
    node.addChild(portraitRing, portrait, unknown);

    // Name plate.
    const name = PixiPremiumScene.text(world.name, { fontFamily: PixiTextStyles.FONT_BODY, fontSize: 16, fontWeight: '800', fill: showState === 'locked' ? '#8a8494' : '#f3ead8' });
    name.anchor.set(0.5);
    const plateW = name.width + 28;
    const plateY = r + this.L.PLATE_GAP + 12;
    const plate = new PIXI.Graphics().roundRect(-plateW / 2, plateY - 14, plateW, 28, 8).fill({ color: 0x0c0912, alpha: 0.88 })
      .roundRect(-plateW / 2, plateY - 14, plateW, 28, 8).stroke({ color: showState === 'restored' ? PixiPremiumScene.color(this.cols.accent) : 0x5a5462, width: 2 });
    name.y = plateY;
    node.addChild(plate, name);

    const gem = PixiShard.create(12, world.art);
    gem.x = plateW / 2 + 4;
    gem.y = plateY - 14;
    gem.visible = showState === 'restored' && world.id !== 'pawnhollow' && world.id !== 'trainingcamp';
    node.addChild(gem);

    const pulse = new PIXI.Graphics().circle(0, 0, r + 9).stroke({ color: PixiPremiumScene.color(this.cols.accent), width: 4 });
    const isFrontier = world.stages.includes(Math.min(this.save.maxUnlockedLevel || 1, STORY_STAGES.length)) && !this.event;
    pulse.visible = isFrontier && showState !== 'restored';
    node.addChild(pulse);
    const unlock = () => {
      drawRing(false);
      dim.brightness(0.6, false);
      portrait.tint = 0xffffff;
      unknown.visible = false;
      name.style.fill = '#f3ead8';
      pulse.visible = true;
      gsap.to(cracks, { alpha: 0.35, duration: 0.6 });
    };

    node.eventMode = 'static';
    node.cursor = 'pointer';
    node.hitArea = new PIXI.Circle(0, 0, r + 8);
    node.on('pointertap', () => this._tapWorld(world));

    return { world, node, glow, colourMask, cracks, gem, pulse, unlock, r, state: showState };
  },

  _buildStop(stage, x) {
    const L = this.L;
    const c = new PIXI.Container();
    c.x = x;
    c.y = L.STOP_Y;
    const unlocked = StoryProgress.isUnlocked(this.save, stage);
    const beaten = StoryProgress.isBeaten(this.save, stage);
    const holo = 0x6fe3ff;
    const g = new PIXI.Graphics()
      .circle(0, 3, L.STOP_R + 3).fill({ color: 0x000000, alpha: 0.45 })
      .circle(0, 0, L.STOP_R + 2).fill(unlocked ? 0xbff4ff : 0x3a3542)
      .circle(0, 0, L.STOP_R - 1).fill(beaten ? holo : 0x0d1d26);
    const num = PixiPremiumScene.text(String(stage - 1), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 14, fill: beaten ? '#08222c' : unlocked ? '#bff4ff' : '#6b6575' });
    num.anchor.set(0.5);
    c.addChild(g, num);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.hitArea = new PIXI.Circle(0, 0, L.STOP_R + 8);
    c.on('pointertap', () => { if (!this.busy && (!this.drag || !this.drag.moved)) this._select(stage); });
    this.nodeLayer.addChild(c);
    return { stage, c, g, num };
  },

  _cracks(r) {
    const g = new PIXI.Graphics();
    const lines = [
      [[-0.1, -0.95], [0.05, -0.5], [-0.12, -0.2], [0.1, 0.15]],
      [[0.9, 0.2], [0.45, 0.1], [0.3, 0.4], [0.05, 0.5]],
      [[-0.85, 0.35], [-0.4, 0.25], [-0.3, 0.6], [-0.05, 0.9]],
    ];
    for (const line of lines) {
      g.moveTo(line[0][0] * r, line[0][1] * r);
      for (const [px, py] of line.slice(1)) g.lineTo(px * r, py * r);
      g.stroke({ color: 0x050308, width: 4, alpha: 0.9 });
      g.moveTo(line[0][0] * r + 1, line[0][1] * r);
      for (const [px, py] of line.slice(1)) g.lineTo(px * r + 1, py * r);
      g.stroke({ color: 0xffffff, width: 1, alpha: 0.25 });
    }
    return g;
  },

  // A pixel shard of the Great Board.
  /* ------------------------------------------------------------------ */
  /*  Fragment counter and info panel                                    */
  /* ------------------------------------------------------------------ */

  _buildFragmentCounter() {
    const c = new PIXI.Container();
    const w = 188, h = 46;
    c.x = Layout.W - w - 28;
    c.y = 30;
    const bg = new PIXI.Graphics().roundRect(0, 0, w, h, 10).fill({ color: 0x0c0912, alpha: 0.8 })
      .roundRect(0, 0, w, h, 10).stroke({ color: 0xc9a6ff, width: 2, alpha: 0.7 });
    const gem = PixiShard.create(11, 'crystal', { glow: false });
    gem.x = 26;
    gem.y = h / 2;
    this.fragmentText = PixiPremiumScene.text('', { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 18, fill: '#e7d6ff' });
    this.fragmentText.anchor.set(0, 0.5);
    this.fragmentText.x = 48;
    this.fragmentText.y = h / 2 + 1;
    c.addChild(bg, gem, this.fragmentText);
    this.pixiContainer.addChild(c);
    this.fragmentCounter = c;
    this.fragmentGem = gem;
    const shown = StoryProgress.fragments(this.save) - (this.event && this.event.fragment ? 1 : 0);
    this._setFragments(shown);
  },

  _setFragments(n) {
    this.fragmentCount = n;
    this.fragmentText.text = `${n} / 10`;
  },

  _buildInfoPanel() {
    if (this.panel) this.panel.destroy({ children: true });
    const L = this.L;
    const s = Layout.uiScale || 1;
    const w = Math.min(L.PANEL_W, Layout.W - 56);
    const h = L.PANEL_H;
    const x = Math.round((Layout.W - w) / 2);
    const y = PixiPremiumScene.footerY - h - L.PANEL_GAP;
    const panel = new PIXI.Container();
    this.pixiContainer.addChild(panel);
    this.panel = panel;
    const ch = STORY_STAGES[this.selected - 1];
    const world = this._world(this.selected);
    const rule = BossRules.get(ch.id);
    const unlocked = StoryProgress.isUnlocked(this.save, ch.stage);
    const beaten = StoryProgress.isBeaten(this.save, ch.stage);
    PixiPremiumScene.panel(panel, x, y, w, h, { accent: ch.colors.primary, accentAlpha: 0.8 });

    const pad = 18;
    const portraitSize = h - pad * 2 - 6;
    const portrait = new PIXI.Sprite(PixiPremiumAssets.character(ch.id));
    portrait.width = portrait.height = portraitSize;
    portrait.x = x + pad;
    portrait.y = y + pad + 4;
    if (!unlocked) portrait.tint = 0x000000;
    panel.addChild(portrait);

    const tx = portrait.x + portraitSize + 18;
    const btnW = 180, btnH = 52;
    const RULE_W = 250;
    const rx = x + w - btnW - pad * 2 - RULE_W;   // rule column
    const textMax = rx - tx - 20;
    const name = PixiPremiumScene.text(unlocked ? ch.name : '???', { fontSize: Math.round(26 * s), fontWeight: '900', fill: this.cols.text });
    name.x = tx;
    name.y = y + pad + 2;
    PixiPremiumScene.fit(name, textMax);
    const title = PixiPremiumScene.text(unlocked ? ch.title : 'Locked', { fontSize: Math.round(16 * s), fontWeight: '800', fill: ch.colors.primary });
    title.x = tx;
    title.y = name.y + name.height + 4;
    PixiPremiumScene.fit(title, textMax);
    const where = ch.trainer ? `${world.name}  ·  Lesson ${ch.stage - 1} of 5` : `${world.name}  ·  Stage ${ch.stage} / ${STORY_STAGES.length}`;
    const meta = PixiPremiumScene.text(where, { fontSize: Math.round(14 * s), fill: PixiPremiumScene.alpha(this.cols.text, 'aa') });
    meta.x = tx;
    meta.y = title.y + title.height + 8;
    PixiPremiumScene.fit(meta, textMax);
    panel.addChild(name, title, meta);

    // Rule column: what twist (or test) waits here.
    const label = PixiPremiumScene.text(ch.trainer ? 'YOUR TEST' : 'BOSS RULE', { fontSize: 12, fontWeight: '900', fill: PixiPremiumScene.alpha(this.cols.text, '88'), letterSpacing: 1 });
    label.x = rx;
    label.y = y + pad + 6;
    const ruleTitle = PixiPremiumScene.text(unlocked && rule ? rule.title : '???', { fontSize: Math.round(19 * s), fontWeight: '800', fill: this.cols.accent });
    ruleTitle.x = rx;
    ruleTitle.y = label.y + 20;
    PixiPremiumScene.fit(ruleTitle, RULE_W - 10);
    const missions = StoryMissions.forWorld(world.id);
    const cleared = StoryMissions.cleared(this.save, world.id);
    const statusText = beaten ? (ch.trainer ? 'Passed' : 'Defeated')
      : !unlocked ? `Reach stage ${ch.stage} first`
        : missions ? `Missions ${cleared} / ${StoryMissions.COUNT}` : ch.trainer ? 'Next lesson' : 'Next battle';
    const status = PixiPremiumScene.text(statusText, { fontSize: Math.round(15 * s), fontWeight: '800', fill: beaten ? '#7dea99' : unlocked ? this.cols.text : '#8a8494' });
    status.x = rx;
    status.y = ruleTitle.y + ruleTitle.height + 10;
    panel.addChild(label, ruleTitle, status);

    if (unlocked) {
      const label2 = missions ? 'Enter' : beaten ? 'Replay' : ch.trainer ? 'Train' : 'Fight';
      PixiPremiumScene.button(panel, x + w - btnW - pad, y + Math.round((h - btnH) / 2), btnW, btnH, label2, () => this.start(), { primary: true, icon: 'play', fontSize: 20 });
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Selection and starting a fight                                     */
  /* ------------------------------------------------------------------ */

  _tapWorld(world) {
    if (this.busy || (this.drag && this.drag.moved)) return;
    // The Training Camp medallion picks the next unfinished lesson.
    let stage = world.stages[0];
    if (world.stages.length > 1) {
      stage = world.stages.find(s => !StoryProgress.isBeaten(this.save, s) && StoryProgress.isUnlocked(this.save, s)) || world.stages[0];
    }
    this._select(stage);
  },

  _select(stage) {
    this.selected = stage;
    this._focus(this._stopPos(stage).x);
    this._highlight();
    this._buildInfoPanel();
    audioManager.playSelect();
  },

  _highlight() {
    for (const n of this.nodes) n.glow.alpha = n.world.stages.includes(this.selected) ? 1 : 0;
    for (const st of this.stopNodes) st.c.scale.set(st.stage === this.selected ? 1.3 : 1);
  },

  _step(dir) {
    const next = this.selected + dir;
    if (next < 1 || next > STORY_STAGES.length) return;
    this._select(next);
  },

  start() {
    if (this.busy) return;
    const ch = STORY_STAGES[this.selected - 1];
    if (!StoryProgress.isUnlocked(this.save, ch.stage)) return;
    this.busy = true;
    // Zoom into the world, then into the fight.
    const p = this._stopPos(ch.stage);
    const zoom = 2.6;
    const fade = new PIXI.Graphics().rect(0, 0, Layout.W, Layout.H).fill(0x000000);
    fade.alpha = 0;
    this.pixiContainer.addChild(fade);
    // Guardian worlds open their own mission map; the rest go straight to the fight.
    const missions = StoryMissions.forWorld(this._world(ch.stage).id);
    const tl = gsap.timeline({
      onComplete: () => {
        if (missions) {
          switchScreen('worldMissions', { world: this._world(ch.stage).id });
          return;
        }
        store.setActiveSave({ selectedCharacter: ch.id, storyLevel: ch.stage });
        store.update({ selectedCharacter: ch.id, storyLevel: ch.stage, mode: 'story' });
        const settings = store.get('settings') || {};
        if (settings.bossThemeEnabled !== false && ch.theme) ThemeManager.applyTheme(ch.theme);
        store.saveProgress();
        const scene = StoryScenes.before(store.getActiveSave(), ch.stage);
        if (scene) switchScreen('storyScene', { scene, next: 'game' });
        else switchScreen('game');
      },
    });
    // map.x = -camX + _mapOffsetX; after scaling, the node sits at map.x + p.x * zoom.
    this.drag = null;
    this.camTarget = this.camX;
    tl.to(this.map.scale, { x: zoom, y: zoom, duration: 0.7, ease: 'power2.in' }, 0)
      .to(this.map, { y: Layout.H / 2 - p.y * zoom, duration: 0.7, ease: 'power2.in' }, 0)
      .to(this, { _mapOffsetX: Layout.W / 2 - p.x * zoom + this.camX, duration: 0.7, ease: 'power2.in' }, 0)
      .to(fade, { alpha: 1, duration: 0.35 }, 0.4);
    this._timeline = tl;
    audioManager.playButton && audioManager.playButton();
  },

  back() {
    if (this.busy) return;
    switchScreen('characterSelect');
  },

  handleKeyDown(e) {
    if (this.busy) return;
    if (e.key === 'Escape') this.back();
    else if (e.key === 'ArrowRight') this._step(1);
    else if (e.key === 'ArrowLeft') this._step(-1);
    else if (e.key === 'Enter' || e.key === ' ') this.start();
  },

  /* ------------------------------------------------------------------ */
  /*  After a win: restore the world, fly the fragment, travel onwards   */
  /* ------------------------------------------------------------------ */

  _playEvent(event) {
    this.busy = true;
    const beatenWorld = this._world(event.stage);
    const node = this.nodes.find(n => n.world === beatenWorld);
    const nextStage = Math.min(event.stage + 1, STORY_STAGES.length);
    const tl = gsap.timeline({ delay: 0.5, onComplete: () => { this.busy = false; this._timeline = null; this._select(this.tokenStage); } });
    this._timeline = tl;

    const worldDone = beatenWorld.id !== 'pawnhollow' && beatenWorld.stages[beatenWorld.stages.length - 1] === event.stage;
    if (worldDone && node) {
      // A wave of colour from the centre, and the cracks heal.
      const wave = { r: 0 };
      tl.to(wave, {
        r: node.r,
        duration: 1.1,
        ease: 'power2.out',
        onUpdate: () => node.colourMask.clear().circle(0, 0, wave.r).fill(0xffffff),
      });
      tl.to(node.cracks, { alpha: 0, duration: 0.8 }, '<');
      tl.add(() => this._sparkle(node), '<0.2');
    }
    if (event.fragment && node) {
      tl.add(() => this._flyFragment(node), '+=0.1');
      tl.add(() => {}, '+=1.1');
    }
    if (event.stage < STORY_STAGES.length) {
      tl.add(() => this._travel(event.stage, nextStage), '+=0.1');
      tl.add(() => {}, `+=${this._travelTime(event.stage, nextStage) + 0.2}`);
      tl.add(() => this._unlockNext(nextStage));
    }
  },

  _sparkle(node) {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const p = new PIXI.Graphics().rect(-3, -3, 6, 6).fill(i % 2 ? 0xffe9a8 : 0xffffff);
      p.x = node.node.x + Math.cos(a) * node.r * 0.6;
      p.y = node.node.y + Math.sin(a) * node.r * 0.6;
      this.map.addChild(p);
      gsap.to(p, {
        x: node.node.x + Math.cos(a) * (node.r + 50),
        y: node.node.y + Math.sin(a) * (node.r + 50),
        alpha: 0,
        duration: 0.9,
        ease: 'power2.out',
        onComplete: () => p.destroy(),
      });
    }
  },

  // The world's shard rises, then arcs into the fragment counter.
  _flyFragment(node) {
    const gem = PixiShard.create(18, PixiShard.themeForStage(this.event ? this.event.stage : 7));
    const start = { x: node.node.x - this.camX + this._mapOffsetX, y: this.map.y + node.node.y };
    gem.x = start.x;
    gem.y = start.y;
    this.pixiContainer.addChild(gem);
    const end = { x: this.fragmentCounter.x + this.fragmentGem.x, y: this.fragmentCounter.y + this.fragmentGem.y };
    const t = { v: 0 };
    gsap.timeline({ onComplete: () => { PixiShard.kill(gem); gem.destroy({ children: true }); } })
      .to(gem, { y: start.y - 60, duration: 0.35, ease: 'power2.out' })
      .to(gem.scale, { x: 1.4, y: 1.4, duration: 0.35 }, '<')
      .to(t, {
        v: 1,
        duration: 0.7,
        ease: 'power2.in',
        onUpdate: () => {
          const sx = start.x, sy = start.y - 60;
          gem.x = sx + (end.x - sx) * t.v;
          gem.y = sy + (end.y - sy) * t.v - Math.sin(Math.PI * t.v) * 120;
          gem.rotation = t.v * 6;
          gem.scale.set(1.4 - t.v * 0.7);
        },
        onComplete: () => {
          this._setFragments(this.fragmentCount + 1);
          gsap.fromTo(this.fragmentCounter.scale, { x: 1.25, y: 1.25 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(3)' });
          audioManager.playCapture && audioManager.playCapture();
        },
      });
    node.gem.visible = true;
    node.gem.scale.set(0);
    gsap.to(node.gem.scale, { x: 1, y: 1, duration: 0.4, delay: 1.0, ease: 'back.out(3)' });
  },

  _travelTime(from, to) {
    const a = this.stopIndex[from - 1], b = this.stopIndex[to - 1];
    let len = 0;
    for (let i = a + 1; i <= b; i++) len += Math.hypot(this.path[i].x - this.path[i - 1].x, this.path[i].y - this.path[i - 1].y);
    return Math.max(1, Math.round(len / this.L.HOP)) * 0.2;
  },

  // The king hops along the dotted path from one stop to the next.
  _travel(from, to) {
    const a = this.stopIndex[from - 1], b = this.stopIndex[to - 1];
    const hops = [];
    let acc = 0;
    for (let i = a + 1; i <= b; i++) {
      acc += Math.hypot(this.path[i].x - this.path[i - 1].x, this.path[i].y - this.path[i - 1].y);
      if (acc >= this.L.HOP || i === b) { hops.push(this.path[i]); acc = 0; }
    }
    const lift = (stage) => this._stopRadius(stage) * 0.2;
    const tl = gsap.timeline({ onComplete: () => { this.token._hopping = false; } });
    this.token._hopping = true;
    let prev = { x: this.token.x, y: this.token._baseY };
    hops.forEach((p, i) => {
      const target = { x: p.x, y: i === hops.length - 1 ? p.y - lift(to) : p.y };
      const from = { ...prev };
      const t = { v: 0 };
      tl.to(t, {
        v: 1,
        duration: 0.2,
        ease: 'none',
        onUpdate: () => {
          this.token.x = from.x + (target.x - from.x) * t.v;
          this.token.y = from.y + (target.y - from.y) * t.v - Math.sin(Math.PI * t.v) * 16;
          this.tokenShadow.x = this.token.x;
          this.tokenShadow.y = from.y + (target.y - from.y) * t.v + 2;
          this._focus(this.token.x);
        },
      });
      prev = target;
    });
    tl.add(() => {
      this.token._baseY = prev.y;
      this.tokenStage = to;
      this._drawPath();
    });
  },

  // The next world's cracks fade to "open" and its guardian steps out of shadow.
  _unlockNext(stage) {
    const world = this._world(stage);
    const node = this.nodes.find(n => n.world === world);
    for (const n of this.nodes) if (n.state !== 'restored' || n === node) n.pulse.visible = false;
    if (node && node.state === 'locked') {
      node.unlock();
      node.state = 'open';
    } else if (node && node.state === 'open') {
      node.pulse.visible = true;
    }
    const stop = this.stopNodes.find(s => s.stage === stage);
    if (stop) gsap.fromTo(stop.c.scale, { x: 1.6, y: 1.6 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(3)' });
  },
};
