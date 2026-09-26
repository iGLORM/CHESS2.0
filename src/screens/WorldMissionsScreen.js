// A guardian world's own map: five missions on a winding path, the guardian
// at the end. The big map zooms into the world, then this screen zooms out of
// the world's painted scene. Missions open one after another; the guardian
// waits until all five are cleared (a restored world's path is all open).
// init({ world }) — after a first clear, store.missionEvent plays the step:
// the node is stamped, the king hops on and the next stop opens.
const WorldMissionsScreen = {
  isPixiScreen: true,
  pixiContainer: null,

  L: {
    NODE_R: 38,
    BOSS_R: 54,
    SIDE: 130,            // path inset from the screen edges
    PANEL_H: 132,
    PANEL_W: 940,
    PANEL_GAP: 12,
    DOT_STEP: 14,
    HOP: 42,
  },

  init(data = {}) {
    this.world = WORLDS.find(w => w.id === data.world) || WORLDS[2];
    this.save = store.getActiveSave() || {};
    this.missions = StoryMissions.forWorld(this.world.id) || [];
    this.bossStage = this.world.stages[this.world.stages.length - 1];
    this.boss = STORY_STAGES[this.bossStage - 1];
    this.cols = ThemeManager.getTheme(this.world.art).colors;
    const ev = store.get('missionEvent');
    this.event = ev && ev.world === this.world.id ? ev : null;
    store.set('missionEvent', null);
    this.busy = false;
    this.time = 0;

    const cleared = StoryMissions.cleared(this.save, this.world.id);
    const next = StoryProgress.isRestored(this.save, this.world) ? this.missions.length : cleared;
    this.tokenAt = this.event ? this.event.index : Math.min(next, this.missions.length);
    this.selected = this.event ? this.event.index + 1 : Math.min(cleared, this.missions.length);

    TextureManager.preloadTheme(this.world.art);
    const cleared5 = `${cleared} / ${StoryMissions.COUNT} missions`;
    this.pixiContainer = PixiPremiumScene.root(this.world.name, StoryProgress.isRestored(this.save, this.world) ? 'Restored  ·  replay any mission' : cleared5, {
      themeId: this.world.art,
      footerHint: 'Arrow keys to choose  ·  Enter to play',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);
    this.mapLayer = new PIXI.Container();
    this.pixiContainer.addChild(this.mapLayer);

    this._layout();
    this._buildPath();
    this._buildNodes();
    this._buildToken();
    this._buildInfoPanel();
    PixiPremiumScene.button(this.pixiContainer, 36, PixiPremiumScene.bottomButtonY(44), 180, 44, 'World Map', () => this.back(), { icon: 'back' });

    // Zoom out of the world as it appears.
    this.mapLayer.pivot.set(Layout.cx, Layout.cy);
    this.mapLayer.position.set(Layout.cx, Layout.cy);
    this.mapLayer.scale.set(1.35);
    this.mapLayer.alpha = 0;
    gsap.to(this.mapLayer, { alpha: 1, duration: 0.5, ease: 'power2.out' });
    gsap.to(this.mapLayer.scale, { x: 1, y: 1, duration: 0.8, ease: 'power3.out',
      onComplete: () => { if (this.event) this._playEvent(this.event); } });
    if (this.event) this.busy = true;
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
  },

  pixiUpdate(dt) {
    if (!this.pixiContainer) return;
    PixiPremiumScene.update(this.pixiContainer, dt);
    this.time += dt;
    for (const n of this.nodes) {
      if (n.pulse.visible) n.pulse.alpha = 0.35 + Math.sin(this.time * 3) * 0.3;
    }
    if (this.token && !this.token._hopping) this.token.y = this.token._baseY + Math.sin(this.time * 2.4) * 3;
  },

  /* ------------------------------------------------------------------ */
  /*  Layout                                                             */
  /* ------------------------------------------------------------------ */

  // Six stops zigzagging across the screen between header and info panel.
  _layout() {
    const L = this.L;
    const top = 150, bottom = PixiPremiumScene.footerY - L.PANEL_H - L.PANEL_GAP - 40;
    const mid = (top + bottom) / 2, amp = Math.min(90, (bottom - top) / 2 - L.BOSS_R);
    const count = this.missions.length + 1;
    this.stops = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      this.stops.push({
        x: Math.round(L.SIDE + t * (Layout.W - L.SIDE * 2)),
        y: Math.round(mid + (i % 2 ? amp : -amp) * (i === count - 1 ? 0 : 1)),
      });
    }
  },

  _buildPath() {
    this.path = [];
    this.stopIndex = [];
    for (let i = 0; i < this.stops.length; i++) {
      this.stopIndex.push(this.path.length);
      if (i === this.stops.length - 1) { this.path.push(this.stops[i]); break; }
      const a = this.stops[i], b = this.stops[i + 1];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const cx = mx + (i % 2 ? -30 : 30), cy = my + (i % 2 ? 40 : -40);
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

  _state(i) {
    if (i === this.missions.length) {
      if (StoryProgress.isBeaten(this.save, this.bossStage)) return 'cleared';
      return StoryMissions.bossReady(this.save, this.world) ? 'open' : 'locked';
    }
    if (i < StoryMissions.cleared(this.save, this.world.id)) return 'cleared';
    return StoryMissions.isOpen(this.save, this.world, i) ? 'open' : 'locked';
  },

  _buildNodes() {
    this.nodeLayer = new PIXI.Container();
    this.mapLayer.addChild(this.nodeLayer);
    this.nodes = this.stops.map((p, i) => this._buildNode(i, p));
    this._highlight();
  },

  _buildNode(i, p) {
    const isBoss = i === this.missions.length;
    const r = isBoss ? this.L.BOSS_R : this.L.NODE_R;
    // During an event the stop just cleared starts as it was before the win.
    let state = this._state(i);
    if (this.event && i === this.event.index) state = 'open';
    if (this.event && i === this.event.index + 1 && !isBoss) state = 'locked';
    if (this.event && isBoss && this.event.index === this.missions.length - 1 && state === 'open') state = 'locked';

    const c = new PIXI.Container();
    c.x = p.x;
    c.y = p.y;
    this.nodeLayer.addChild(c);
    const accent = PixiPremiumScene.color(this.cols.accent);
    const glow = new PIXI.Graphics().circle(0, 0, r + 16).fill({ color: accent, alpha: 0.35 });
    glow.alpha = 0;
    const ring = new PIXI.Graphics();
    const face = new PIXI.Container();
    c.addChild(glow, ring, face);

    const pulse = new PIXI.Graphics().circle(0, 0, r + 9).stroke({ color: accent, width: 4 });
    c.addChild(pulse);

    const drawRing = (st) => {
      ring.clear()
        .circle(0, 5, r + 6).fill({ color: 0x000000, alpha: 0.5 })
        .circle(0, 0, r + 5).fill(st === 'cleared' ? accent : st === 'open' ? 0xe9dcc0 : 0x4a4452)
        .circle(0, 0, r + 1).fill(PixiPremiumScene.color(this.cols.panel));
    };

    if (isBoss) {
      const portrait = new PIXI.Sprite(PixiPremiumAssets.character(this.boss.id));
      portrait.anchor.set(0.5);
      portrait.width = portrait.height = r * 2;
      const mask = new PIXI.Graphics().circle(0, 0, r).fill(0xffffff);
      portrait.mask = mask;
      face.addChild(portrait, mask);
      c._portrait = portrait;
    } else {
      face.addChild(this._icon(this.missions[i].kind, r));
    }
    const lock = new PIXI.Sprite(PixiPremiumAssets.icon('lock'));
    lock.anchor.set(0.5);
    lock.width = lock.height = r * 0.9;
    c.addChild(lock);
    const check = new PIXI.Graphics()
      .circle(r * 0.7, -r * 0.7, 13).fill(0x2fa84f).circle(r * 0.7, -r * 0.7, 13).stroke({ color: 0xffffff, width: 2 })
      .moveTo(r * 0.7 - 6, -r * 0.7).lineTo(r * 0.7 - 1, -r * 0.7 + 5).lineTo(r * 0.7 + 7, -r * 0.7 - 5).stroke({ color: 0xffffff, width: 3 });
    c.addChild(check);

    const label = PixiPremiumScene.text(isBoss ? this.boss.name : this.missions[i].name, {
      fontSize: 15, fontWeight: '800', fill: '#f3ead8', stroke: { color: '#000000', width: 4 },
    });
    label.anchor.set(0.5, 0);
    label.y = r + 12;
    PixiPremiumScene.fit(label, 170);
    c.addChild(label);

    const apply = (st) => {
      drawRing(st);
      face.alpha = st === 'locked' ? 0.3 : 1;
      if (c._portrait) c._portrait.tint = st === 'locked' ? 0x000000 : 0xffffff;
      lock.visible = st === 'locked';
      check.visible = st === 'cleared' && !isBoss;
      pulse.visible = st === 'open' && (isBoss || i === StoryMissions.cleared(this.save, this.world.id));
      label.alpha = st === 'locked' ? 0.6 : 1;
    };
    apply(state);

    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.hitArea = new PIXI.Circle(0, 0, r + 10);
    c.on('pointertap', () => { if (!this.busy) this._select(i); });
    return { i, c, r, glow, pulse, check, apply, isBoss };
  },

  // Mission kind symbols, drawn so they read on any world's colours.
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
    } else if (kind === 'wild') {
      g.circle(0, -s * 0.55, s * 0.32).fill(col)
        .poly([-s * 0.28, -s * 0.2, s * 0.28, -s * 0.2, s * 0.45, s * 0.6, -s * 0.45, s * 0.6]).fill(col)
        .rect(-s * 0.7, s * 0.6, s * 1.4, s * 0.3).fill(col);
    } else {
      const t = PixiPremiumScene.text(kind === 'puzzle' ? '?' : '!', { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(r * 1.05), fontWeight: 'bold', fill: this.cols.accent });
      t.anchor.set(0.5);
      t.y = 2;
      return t;
    }
    return g;
  },

  _buildToken() {
    const p = this.stops[this.tokenAt];
    this.tokenShadow = new PIXI.Graphics().ellipse(0, 0, 20, 6).fill({ color: 0x000000, alpha: 0.45 });
    this.token = PixiPieceRenderer.createSprite(this.world.art, 'white', 'king');
    this.token.anchor.set(0.5, 1);
    this.token.width = this.token.height = 64;
    this._placeToken(p);
    this.mapLayer.addChild(this.tokenShadow, this.token);
  },

  _placeToken(p) {
    const r = this.L.NODE_R;
    this.token.x = this.tokenShadow.x = p.x - r * 0.9;
    this.token._baseY = p.y - r * 0.3;
    this.token.y = this.token._baseY;
    this.tokenShadow.y = this.token._baseY + 2;
  },

  _highlight() {
    for (const n of this.nodes) n.glow.alpha = n.i === this.selected ? 1 : 0;
  },

  _select(i) {
    this.selected = Math.max(0, Math.min(this.missions.length, i));
    this._highlight();
    this._buildInfoPanel();
    audioManager.playSelect();
  },

  /* ------------------------------------------------------------------ */
  /*  Info panel and starting                                            */
  /* ------------------------------------------------------------------ */

  _current() {
    const i = this.selected;
    if (i === this.missions.length) return { ch: this.boss, rule: BossRules.get(this.boss.id), boss: true };
    const m = this.missions[i];
    return { ch: StoryMissions.character(m.id), rule: m.rule, mission: m };
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
    const { ch, rule, boss, mission } = this._current();
    const state = this._state(this.selected);
    const open = state !== 'locked';
    PixiPremiumScene.panel(panel, x, y, w, h, { accent: this.cols.accent, accentAlpha: 0.8 });

    const pad = 18;
    const portraitSize = h - pad * 2 - 6;
    const portrait = new PIXI.Sprite(PixiPremiumAssets.character(ch.id));
    portrait.width = portrait.height = portraitSize;
    portrait.x = x + pad;
    portrait.y = y + pad + 4;
    if (!open) portrait.tint = 0x000000;
    panel.addChild(portrait);

    const tx = portrait.x + portraitSize + 18;
    const btnW = 180, btnH = 52;
    const RULE_W = 300;
    const rx = x + w - btnW - pad * 2 - RULE_W;
    const textMax = rx - tx - 20;
    const kicker = boss ? `GUARDIAN  ·  ${this.world.name}` : `MISSION ${mission.index + 1} / ${StoryMissions.COUNT}  ·  ${MISSION_KINDS[mission.kind].label.toUpperCase()}`;
    const k = PixiPremiumScene.text(kicker, { fontSize: 12, fontWeight: '900', fill: PixiPremiumScene.alpha(this.cols.text, '99'), letterSpacing: 1 });
    k.x = tx;
    k.y = y + pad + 2;
    PixiPremiumScene.fit(k, textMax);
    const name = PixiPremiumScene.text(boss ? ch.name : mission.name, { fontSize: Math.round(26 * s), fontWeight: '900', fill: this.cols.text });
    name.x = tx;
    name.y = k.y + 20;
    PixiPremiumScene.fit(name, textMax);
    const who = PixiPremiumScene.text(boss ? ch.title : `vs ${ch.name}, ${ch.title}`, { fontSize: Math.round(15 * s), fontWeight: '800', fill: this.cols.accent });
    who.x = tx;
    who.y = name.y + name.height + 4;
    PixiPremiumScene.fit(who, textMax);
    panel.addChild(k, name, who);

    const label = PixiPremiumScene.text(boss ? 'BOSS RULE' : rule.title.toUpperCase(), { fontSize: 12, fontWeight: '900', fill: PixiPremiumScene.alpha(this.cols.text, '88'), letterSpacing: 1 });
    label.x = rx;
    label.y = y + pad + 2;
    PixiPremiumScene.fit(label, RULE_W - 10);
    const desc = boss ? rule.title : rule.lines[rule.lines.length - 1];
    const d = PixiPremiumScene.text(desc, { fontSize: Math.round(15 * s), fontWeight: '700', fill: this.cols.text, wordWrap: true, wordWrapWidth: RULE_W - 10, lineHeight: 20 });
    d.x = rx;
    d.y = label.y + 20;
    const statusText = state === 'cleared' ? (boss ? 'Defeated' : 'Cleared') : open ? (boss ? 'The guardian awaits' : 'Next mission')
      : boss ? `Clear all ${StoryMissions.COUNT} missions first` : 'Clear the mission before it';
    const st = PixiPremiumScene.text(statusText, { fontSize: Math.round(14 * s), fontWeight: '800', fill: state === 'cleared' ? '#7dea99' : open ? this.cols.accent : '#8a8494' });
    st.x = rx;
    st.y = y + h - pad - 18;
    panel.addChild(label, d, st);

    if (open) {
      const btn = state === 'cleared' ? 'Replay' : boss ? 'Fight' : 'Play';
      PixiPremiumScene.button(panel, x + w - btnW - pad, y + Math.round((h - btnH) / 2), btnW, btnH, btn, () => this.start(), { primary: true, icon: 'play', fontSize: 20 });
    }
  },

  start() {
    if (this.busy || this._state(this.selected) === 'locked') return;
    this.busy = true;
    const { ch, boss } = this._current();
    const p = this.stops[this.selected];
    const tl = gsap.timeline({
      onComplete: () => {
        if (boss) store.setActiveSave({ selectedCharacter: ch.id, storyLevel: ch.stage });
        store.update({ selectedCharacter: ch.id, mode: 'story' });
        if (boss) store.set('storyLevel', ch.stage);
        const settings = store.get('settings') || {};
        if (settings.bossThemeEnabled !== false) ThemeManager.applyTheme(this.world.art);
        store.saveProgress();
        switchScreen('game');
      },
    });
    this.mapLayer.pivot.set(p.x, p.y);
    this.mapLayer.position.set(p.x, p.y);
    tl.to(this.mapLayer.scale, { x: 2.2, y: 2.2, duration: 0.6, ease: 'power2.in' })
      .to(this.mapLayer.position, { x: Layout.cx, y: Layout.cy, duration: 0.6, ease: 'power2.in' }, 0);
    audioManager.playButton();
  },

  back() {
    if (this.busy) return;
    switchScreen('worldMap');
  },

  handleKeyDown(e) {
    if (this.busy) return;
    if (e.key === 'Escape') this.back();
    else if (e.key === 'ArrowRight') this._select(this.selected + 1);
    else if (e.key === 'ArrowLeft') this._select(this.selected - 1);
    else if (e.key === 'Enter' || e.key === ' ') this.start();
  },

  /* ------------------------------------------------------------------ */
  /*  After a first clear                                                */
  /* ------------------------------------------------------------------ */

  _playEvent(ev) {
    const done = this.nodes[ev.index];
    const next = this.nodes[ev.index + 1];
    const tl = gsap.timeline({ onComplete: () => { this.busy = false; this._select(ev.index + 1); } });
    // Stamp the cleared stop.
    tl.add(() => {
      done.apply('cleared');
      done.pulse.visible = false;
      gsap.fromTo(done.check.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(3)' });
      gsap.fromTo(done.c.scale, { x: 1.2, y: 1.2 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(2)' });
      this._sparkle(done);
      audioManager.playVictory();
    });
    // The king hops along the path.
    tl.add(() => this._travel(ev.index, ev.index + 1), '+=0.5');
    tl.add(() => {}, `+=${this._travelTime(ev.index, ev.index + 1) + 0.1}`);
    // The next stop opens (the guardian with a flourish).
    tl.add(() => {
      next.apply('open');
      next.pulse.visible = true;
      gsap.fromTo(next.c.scale, { x: 1.4, y: 1.4 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(3)' });
      if (next.isBoss) {
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
    t.y = 130;
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
    const r = this.L.NODE_R;
    const tl = gsap.timeline({ onComplete: () => { this.token._hopping = false; } });
    this.token._hopping = true;
    let prev = { x: this.token.x, y: this.token._baseY };
    hops.forEach((p, i) => {
      const last = i === hops.length - 1;
      const target = { x: last ? p.x - r * 0.9 : p.x, y: last ? p.y - r * 0.3 : p.y };
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
