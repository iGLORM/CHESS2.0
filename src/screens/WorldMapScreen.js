// Story mode's world map: the Shattered Earth, a live pixel scene
// (src/themes/scenes/worldmap.js) shown at 4x and dragged around in both directions.
// Each world is a landmark on the map where it belongs on Earth; worlds not yet
// restored are grey and frozen. Your king stands at the furthest stage you have
// reached; click a world (or a Training Camp stop) to see who waits there and fight.
// The info panel hides itself after a few seconds (or with its x) to leave the map
// clear; clicking a place brings it back.
// Story mode shows the theme of the world the king stands in (it changes as he travels).
// With the plane (a Shop item), "Summon the Plane" lets you fly anywhere with WASD / ZQSD
// (or the arrows, or by holding the pointer where to go) and land where you like; the
// king stays where he landed (save.mapPos, scene px).
// After a win the map plays the reward: colour washes over the world, its fragment
// flies to the counter, and the king walks the route to the next world. After the
// ending the rifts close and the continents join.
// Keepsakes show here: before the Tilted Compass the Earth beyond the places you know is
// an uncharted sepia sketch (its plates, markers and route hidden), and winning the
// compass charts it in a wave from the king; the compass needle by the king points to
// the next stop. The Iron Key opens the chests on the map (Keepsakes.CHESTS). A storm
// hides Soulbound Pixel until the Map of the Crossing lifts it. Tapping a keepsake on
// the shelf tells what it does.
const WorldMapScreen = {
  isPixiScreen: true,
  pixiContainer: null,

  L: {
    S: 4,                 // screen pixels per map pixel
    BAR: 64,              // the top bar (title, fragments, keepsakes, purse); two rows in portrait
    BAR_ROW: 48,          // portrait: the keepsakes' second row
    BAR_SIDE: 24,         // screen edge to the bar's contents
    BAR_GAP: 10,          // between the bar's boxes
    BOX_H: 40,            // height of the boxes in the bar
    STAND: 6,             // the king stands this far in front of a landmark (map px)
    PLATE_Y: 13,          // name plate below a landmark (map px)
    // Plates moved where the map is crowded (map px from the landmark).
    PLATE_AT: { mistymoors: [-4, -19] },
    PLATE_NAME_W: 145,    // widest name on a plate (the longest English one); longer ones shrink a little
    TAG_NAME_W: 115,      // the same for a rival's name tag
    HIT_R: 76,            // click radius around a landmark (screen px)
    PANEL_H: 162,
    PANEL_W: 940,
    PANEL_GAP: 12,        // info panel to the footer
    PANEL_SHOW: 10,       // the info panel hides itself after this many seconds (tap a place to see it again)
    CLOSE: 30,            // size of the panel's close button
    DOT_STEP: 14,         // spacing of the route's dots
    HOP: 46,              // length of one king hop along the route
  },

  init(data = {}) {
    this.save = store.getActiveSave() || {};
    this.special = null;
    this.event = store.get('storyMapEvent') || null;
    store.set('storyMapEvent', null);
    this.busy = false;
    // Left over from the last visit: the zoom into a place set _zooming and nothing
    // cleared it, so the map stopped following the camera and could not be dragged.
    this._zooming = false;
    this.modal = null;
    this._reveal = null;
    this.flight = null;
    this.planeBtn = null;
    this.flightHint = null;
    this.cam = { x: 0, y: 0 };
    this.camTarget = { x: 0, y: 0 };
    this.drag = null;
    this.time = 0;
    this.panel = null;
    this.panelShown = false;
    this.panelHover = false;
    this.panelTime = 0;

    const frontier = Math.min(this.save.maxUnlockedLevel || 1, STORY_STAGES.length);
    // During a travel event the king starts on the stage just beaten.
    this.tokenStage = this.event ? this.event.stage : frontier;
    this.selected = this.event ? this.event.stage : Math.min(this.save.storyLevel || frontier, frontier);
    // Where the king stands: at his stage, or where the plane last set him down. A win's
    // reward walks him along the route again.
    if (this.event && this.save.mapPos) {
      store.setActiveSave({ mapPos: null });
      this.save = store.getActiveSave() || {};
    }
    const mp = !this.event && this._hasPlane() && this.save.mapPos;
    this.tokenAt = mp ? { x: mp[0] * this.L.S, y: mp[1] * this.L.S } : null;
    // The map has its own song, whatever world's theme is showing.
    if (typeof audioManager !== 'undefined' && audioManager.useSong) audioManager.useSong('worldmap');
    // Story mode shows the theme of the land you are in.
    // (Between worlds, as at the Bazaar, it stays the last world he was in.)
    const last = this.tokenAt && WORLDS.find(w => w.id === this.save.mapWorld);
    this.here = (this.tokenAt && this._worldAtMap(this.tokenAt)) || last || this._world(this.tokenStage);
    ThemeManager.useStoryTheme(this.here.art);
    this.cols = ThemeManager.getCurrentColors();

    // Keepsakes that change the map; one just won is given during the event.
    const holds = (id, guardian) => (typeof Keepsakes !== 'undefined' && Keepsakes.has(id, this.save) && !(this.event && this.event.keepsake === guardian));
    this.hasCompass = holds('compass', 'bishbosh');
    this.hasMapKs = holds('map', 'endgamer') || !!this.save.completed;
    this.fogged = [];
    this.note = null;
    this.pixiContainer = PixiPremiumScene.root('Story Mode', 'The Shattered Earth', {
      footerHint: 'Drag or use the arrow keys to explore the map',
    });
    // The map is the background: drop the theme scene behind it. The big menu header
    // is replaced by a slim bar of our own, so the map shows as much as it can.
    for (const label of ['premiumBackground', 'premiumHeader']) {
      const c = this.pixiContainer.children.find(ch => ch.label === label);
      if (c) { this.pixiContainer.removeChild(c); c.destroy({ children: true }); }
    }
    this.pixiContainer._premiumDrift = [];
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    this._buildPath();
    this._setupChart();
    this._buildMap();
    this._buildTopBar();
    this._applyHeal();
    this._highlight();
    this._buildInfoPanel();
    const s = Layout.uiScale || 1;
    PixiPremiumScene.button(this.pixiContainer, 36, PixiPremiumScene.bottomButtonY(44), Math.round(160 * s), 44, 'Saves', () => this.back(), { icon: 'back' });
    this._buildPlaneButton();

    const p = this._tokenHome();
    this._focus(p.x, p.y, true);
    this._wheel = (e) => {
      if (this.busy) return;
      const sx = e.shiftKey ? e.deltaY : e.deltaX, sy = e.shiftKey ? 0 : e.deltaY;
      this.camTarget = this._clampCam(this.camTarget.x + sx, this.camTarget.y + sy);
    };
    if (PixiApp.app && PixiApp.app.canvas) PixiApp.app.canvas.addEventListener('wheel', this._wheel, { passive: true });
    // Keys held for flying are dropped when the window loses focus.
    this._blur = () => { if (this.flight) this.flight.keys.clear(); };
    window.addEventListener('blur', this._blur);

    if (this.event) this._playEvent(this.event);
    // Coming back from a side match (the Arena) selects where it was played.
    else if (data.select) {
      const sp = this.specials.find(d => d.type === data.select.type && (!data.select.id || d.id === data.select.id));
      if (sp) this._selectSpecial(sp, true);
    }
  },

  destroy() {
    if (PixiApp.app && PixiApp.app.canvas && this._wheel) PixiApp.app.canvas.removeEventListener('wheel', this._wheel);
    this._wheel = null;
    if (typeof audioManager !== 'undefined' && audioManager.useSong) audioManager.useSong(null);
    if (this._blur) window.removeEventListener('blur', this._blur);
    this._blur = null;
    // Leaving mid-flight sets the king down where the plane was.
    if (this.flight) this._setMapPos(this.flight);
    this.flight = null;
    if (this._flightTl) { this._flightTl.kill(); this._flightTl = null; }
    if (this._timeline) { this._timeline.kill(); this._timeline = null; }
    if (this._healTween) { this._healTween.kill(); this._healTween = null; }
    if (this.pixiContainer) {
      const all = [];
      const walk = n => { all.push(n, n.scale); (n.children || []).forEach(walk); };
      walk(this.pixiContainer);
      all.forEach(o => gsap.killTweensOf(o));
    }
    PixiPremiumScene.destroy(this);
    this.nodes = null;
    this.needle = null;
    this.note = null;
  },

  pixiUpdate(dt) {
    if (!this.pixiContainer) return;
    this.time += dt;
    if (this.flight && this.flight.ready) this._flyUpdate(dt);
    if (!this.drag) {
      const k = Math.min(1, dt * 7);
      this.cam.x += (this.camTarget.x - this.cam.x) * k;
      this.cam.y += (this.camTarget.y - this.cam.y) * k;
    }
    if (!this._zooming) {
      this.map.x = -Math.round(this.cam.x);
      this.map.y = -Math.round(this.cam.y);
    }
    // The frontier's ring pulses; the selection ring breathes; the king bobs.
    for (const n of this.nodes) {
      if (n.pulse.visible) n.pulse.alpha = 0.4 + Math.sin(this.time * 3) * 0.3;
    }
    if (this.ring.visible) this.ring.scale.set(1 + Math.sin(this.time * 2.5) * 0.04);
    if (this.token && !this.token._hopping) this.token.y = this.token._baseY + Math.sin(this.time * 2.4) * 3;
    for (const sp of this.specials || []) if (sp.bob) sp.bob.y = sp.bobY + Math.sin(this.time * 2.2 + sp.phase) * 3;
    this._updateNeedle(dt);
    // The info panel gets out of the way of the map after a while (not while the
    // pointer rests on it, nor during the reward after a win).
    if (this.panel && this.panelShown && !this.panelHover && !this.busy) {
      this.panelTime += dt;
      if (this.panelTime >= this.L.PANEL_SHOW) this._hidePanel();
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Map                                                                */
  /* ------------------------------------------------------------------ */

  get _def() { return LiveScenes.get('worldmap'); },
  get _mapW() { return this._def.width * this.L.S; },
  get _mapH() { return this._def.height * this.L.S; },
  // The part of the screen the map shows between the header and the info panel.
  get _viewTop() { return this.barH || this.L.BAR; },
  get _viewBottom() { return PixiPremiumScene.footerY - this.L.PANEL_H - this.L.PANEL_GAP; },

  _place(worldId) {
    const [x, y] = this._def.places[worldId];
    return { x: x * this.L.S, y: y * this.L.S };
  },

  _buildMap() {
    const L = this.L;
    this.map = new PIXI.Container();
    this.pixiContainer.addChildAt(this.map, 0);

    // The live scene, which also serves as the drag surface.
    const scene = LiveScenes.sprite('worldmap');
    scene.width = this._mapW;
    scene.height = this._mapH;
    scene.eventMode = 'static';
    scene.cursor = 'grab';
    this._draggable(scene);
    scene.on('globalpointermove', (e) => {
      if (this.flight && this.flight.pointer) {
        if (e.pointerType === 'mouse' && e.buttons === 0) { this.flight.pointer = null; return; }
        this.flight.pointer = { x: e.global.x, y: e.global.y };
        return;
      }
      if (!this.drag) return;
      // A mouse released outside the window never sent pointerup: end that drag.
      if (e.pointerType === 'mouse' && e.buttons === 0) { this.drag = null; return; }
      const dx = e.global.x - this.drag.x, dy = e.global.y - this.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) this.drag.moved = true;
      const c = this._clampCam(this.drag.cx - dx, this.drag.cy - dy);
      this.cam.x = this.camTarget.x = c.x;
      this.cam.y = this.camTarget.y = c.y;
    });
    this.map.addChild(scene);
    this.mapScene = scene;

    this.pathLayer = new PIXI.Container();
    this.map.addChild(this.pathLayer);
    this._drawPath();

    // The selection ring on the ground in front of the chosen landmark.
    this.ring = new PIXI.Graphics();
    this.map.addChild(this.ring);

    this.nodes = [];
    this._plates = [];
    this.nodeLayer = new PIXI.Container();
    this.map.addChild(this.nodeLayer);
    for (const world of WORLDS) this.nodes.push(this._buildWorld(world));
    this.stopNodes = [];
    this._buildSpecials();
    this._unstackTags();

    // Your character (a Shop cosmetic; the king by default) wears the pieces of the
    // world it stands in, unless it has a piece set of its own.
    const p = this._tokenHome();
    const shadow = new PIXI.Graphics().ellipse(0, 0, 16, 5).fill({ color: 0x000000, alpha: 0.45 });
    shadow.x = p.x;
    shadow.y = p.y + 2;
    this.tokenShadow = shadow;
    const look = this._tokenLook(this.here);
    this.token = PixiPieceRenderer.createSprite(look.art, look.color, look.piece);
    this.token.width = this.token.height = 48;
    this.token.anchor.set(0.5, 0.92);
    this.token.x = p.x;
    this.token.y = this.token._baseY = p.y;
    this.map.addChild(shadow, this.token);
    this._buildNeedle();
  },

  // Dragging can start anywhere on the map, markers included; a marker only counts
  // as clicked if the pointer did not move.
  // In flight, holding the pointer on the map steers the plane towards it instead.
  _draggable(obj, onlySelf) {
    obj.on('pointerdown', (e) => {
      if (this.busy || (onlySelf && e.target !== obj)) return;
      if (this.flight) { this.flight.pointer = { x: e.global.x, y: e.global.y }; return; }
      this.drag = { x: e.global.x, y: e.global.y, cx: this.cam.x, cy: this.cam.y, moved: false };
    });
    const end = () => {
      if (this.flight) this.flight.pointer = null;
      setTimeout(() => { this.drag = null; }, 0);
    };
    obj.on('pointerup', end);
    obj.on('pointerupoutside', end);
  },

  // The map always covers the screen; the header and panel may hide its edges.
  _clampCam(x, y) {
    const maxX = Math.max(0, this._mapW - Layout.W), maxY = Math.max(0, this._mapH - Layout.H);
    return { x: Math.max(0, Math.min(maxX, x)), y: Math.max(0, Math.min(maxY, y)) };
  },

  // Centre a map point in the part of the screen the map shows.
  _focus(mapX, mapY, instant) {
    const cy = (this._viewTop + this._viewBottom) / 2;
    this.camTarget = this._clampCam(mapX - Layout.W / 2, mapY - cy);
    if (instant) { this.cam.x = this.camTarget.x; this.cam.y = this.camTarget.y; }
  },

  _world(stage) {
    return WORLDS.find(w => w.stages.includes(stage));
  },

  // The character on a stage.
  _char(stage) {
    return STORY_STAGES[stage - 1];
  },

  // Where the king stands for a stage: in front of its world's landmark (the five
  // Training Camp lessons share the camp; its own map shows them).
  _stopPos(stage) {
    const S = this.L.S;
    const p = this._place(this._world(stage).id);
    return { x: p.x, y: p.y + this.L.STAND * S };
  },

  // The route as a list of points: a gentle curve between consecutive stops.
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
      const bend = (i % 2 ? 1 : -1) * Math.min(160, len * 0.16);
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

  // Dots along the route; the part already walked glows in gold.
  _drawPath() {
    this.pathLayer.removeChildren().forEach(c => c.destroy());
    const g = new PIXI.Graphics();
    const walked = this.stopIndex[Math.max(0, this.tokenStage - 1)];
    // The last leg, to Soulbound Pixel, only shows once the storm is gone.
    const lastLeg = this.veil > 0 ? this.stopIndex[STORY_STAGES.length - 2] : Infinity;
    let acc = 0;
    for (let i = 1; i < this.path.length; i++) {
      acc += Math.hypot(this.path[i].x - this.path[i - 1].x, this.path[i].y - this.path[i - 1].y);
      if (acc < this.L.DOT_STEP) continue;
      acc = 0;
      const p = this.path[i];
      if (i > lastLeg || !this._charted(p)) continue;
      const done = i <= walked;
      const x = Math.round(p.x / 2) * 2, y = Math.round(p.y / 2) * 2;
      g.rect(x - 4, y - 4, 8, 8).fill({ color: 0x0a0612, alpha: done ? 0.7 : 0.45 });
      g.rect(x - 2, y - 2, 4, 4).fill({ color: done ? 0xffd66a : 0xe8e0f0, alpha: done ? 1 : 0.6 });
    }
    this.pathLayer.addChild(g);
  },

  _state(world) {
    const first = world.stages[0];
    if (!StoryProgress.isUnlocked(this.save, first)) return 'locked';
    if (StoryProgress.isRestored(this.save, world)) return 'restored';
    return 'open';
  },

  // How restored each world looks on the map (1 = in colour), and whether the lands
  // have joined (after the ending).
  _applyHeal() {
    const heal = {};
    for (const n of this.nodes) heal[n.world.id] = n.state === 'restored' ? 1 : 0;
    // The Bazaar is always open; the Arena lights up once it opens.
    heal.shop = 1;
    heal.arena = typeof SideContent !== 'undefined' && SideContent.arenaUnlocked(this.save) ? 1 : 0;
    this.heal = heal;
    this.fuse = this.save.completed && !(this.event && this.event.stage === STORY_STAGES.length) ? 1 : 0;
    this._pushHeal();
  },

  _pushHeal() {
    const map = { heal: { ...this.heal }, fuse: this.fuse, veil: this.veil };
    if (this.chart) map.chart = { ...this.chart };
    LiveScenes.setState('worldmap', { map });
  },

  /* ------------------------------------------------------------------ */
  /*  Keepsakes on the map: the uncharted Earth, the storm, the needle    */
  /* ------------------------------------------------------------------ */

  // Before the compass: the places you have been to (and the Bazaar) are charted.
  _setupChart() {
    const bb = STORY_STAGES.find(c => c.id === 'bishbosh');
    const upTo = Math.min(this.save.maxUnlockedLevel || 1, bb ? bb.stage : 7);
    const reached = WORLDS.filter(w => w.stages[0] <= upTo).map(w => w.id);
    // The road already walked is charted too: a band along the route.
    const trail = [], S = this.L.S, end = this.stopIndex ? this.stopIndex[Math.max(0, upTo - 1)] : 0;
    for (let i = 0; i <= end; i += 3) trail.push([Math.round(this.path[i].x / S), Math.round(this.path[i].y / S), 11]);
    this.chart = this.hasCompass ? null : { v: 0, known: ['shop', ...reached, ...trail], from: null };
    this.veil = this.hasMapKs ? 0 : 1;
  },

  // Whether a map point (screen px on the map) is charted: always, once the compass
  // has charted the Earth; in its wave, once the wave has passed.
  _charted(p) {
    const c = this.chart;
    if (!c || c.v >= 1) return true;
    const S = this.L.S, x = p.x / S, y = p.y / S;
    if (this._def.knownDist(x, y, c.known) < 0) return true;
    if (!c.from || c.v <= 0) return false;
    let dx = Math.abs(x - c.from[0]);
    if (dx > this._def.width / 2) dx = this._def.width - dx;
    return Math.hypot(dx, y - c.from[1]) < c.v * 480 - 5;
  },

  // Hides a map marker while its land is uncharted; the compass's wave shows it again.
  _fogHide(obj, p) {
    if (this._charted(p)) return;
    obj.visible = false;
    this.fogged.push({ obj, p });
  },

  // The compass charts the Earth: a wave from the king, markers appearing as it passes.
  _chartWave(tl) {
    if (!this.chart) return;
    const S = this.L.S;
    this.chart.from = [this.token.x / S, this.token._baseY / S];
    const w = { v: 0 };
    audioManager.playPromotion && audioManager.playPromotion();
    tl.to(w, {
      v: 1,
      duration: 3.2,
      ease: 'power1.in',
      onUpdate: () => {
        this.chart.v = w.v;
        this._pushHeal();
        this.fogged = this.fogged.filter(f => {
          if (!this._charted(f.p)) return true;
          f.obj.visible = true;
          f.obj.alpha = 0;
          gsap.to(f.obj, { alpha: 1, duration: 0.4 });
          return false;
        });
      },
      onComplete: () => {
        this.chart = null;
        this.hasCompass = true;
        this._pushHeal();
        this._drawPath();
        this._banner('THE MAP IS CHARTED');
        this._rebuildSpecials();
      },
    });
  },

  // The Map of the Crossing: the storm over Soulbound Pixel clears and the way shows.
  _liftVeil(tl) {
    if (!this.veil) return;
    const p = this._place('soulboundpixel');
    tl.add(() => this._focus(p.x, p.y));
    const v = { v: 1 };
    tl.to(v, {
      v: 0,
      duration: 2.6,
      ease: 'power1.inOut',
      onUpdate: () => { this.veil = v.v; this._pushHeal(); },
      onComplete: () => {
        this.veil = 0;
        this.hasMapKs = true;
        this._pushHeal();
        this._drawPath();
        for (const n of this.nodes) if (n.world.id === 'soulboundpixel') { n.node.visible = true; n.node.alpha = 0; gsap.to(n.node, { alpha: 1, duration: 0.5 }); }
        this._banner('THE WAY IS CLEAR');
      },
    }, '+=0.4');
  },

  // The compass by the king: its needle turns to the next stop.
  _buildNeedle() {
    const c = new PIXI.Container();
    const dial = new PIXI.Graphics()
      .circle(0, 0, 13).fill({ color: 0x000000, alpha: 0.45 })
      .circle(0, -1, 12).fill(0x8a5a1c).circle(0, -1, 10).fill(0xf2e2bc)
      .circle(0, -1, 10).stroke({ color: 0xe0a830, width: 2 })
      .rect(-1, -10, 2, 2).fill(0x6a4a2a).rect(-1, 6, 2, 2).fill(0x6a4a2a).rect(-10, -2, 2, 2).fill(0x6a4a2a).rect(8, -2, 2, 2).fill(0x6a4a2a);
    const needle = new PIXI.Graphics()
      .poly([0, -9, 3, 0, -3, 0]).fill(0xd8322a)
      .poly([0, 9, 3, 0, -3, 0]).fill(0x3a3448)
      .circle(0, 0, 2).fill(0xffe08a);
    needle.y = -1;
    c.addChild(dial, needle);
    c.needle = needle;
    c.eventMode = 'none';
    c.visible = false;
    this.map.addChild(c);
    this.needle = c;
  },

  // Where the needle points: the next stop you have not won yet (null when you stand there).
  _needleTarget() {
    const stage = Math.min(this.save.maxUnlockedLevel || 1, STORY_STAGES.length);
    if (this.save.completed) return null;
    const p = this._stopPos(stage);
    return Math.hypot(p.x - this.token.x, p.y - this.token._baseY) < 90 ? null : p;
  },

  _updateNeedle(dt) {
    const c = this.needle;
    if (!c || !this.token) return;
    c.visible = this.hasCompass && !this.token._hopping;
    if (!c.visible) return;
    c.x = this.token.x + 30;
    c.y = this.token.y - 44;
    const tgt = this._needleTarget();
    // Pointing at the next stop, with a little wobble; at the stop it turns slowly.
    const want = tgt ? Math.atan2(tgt.y - this.token._baseY, tgt.x - this.token.x) + Math.PI / 2 + Math.sin(this.time * 5) * 0.06
      : c.needle.rotation + dt * 1.2;
    let d = want - c.needle.rotation;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    c.needle.rotation += d * Math.min(1, dt * 6);
  },

  // A small note under the top bar (what a keepsake does); it goes after a few seconds.
  _showNote(title, text, color) {
    if (this.note) { gsap.killTweensOf(this.note); this.note.destroy({ children: true }); }
    const w = Math.min(460, Layout.W - 40), pad = 14;
    const c = new PIXI.Container();
    const t1 = PixiPremiumScene.text(title, { fontSize: 17, fontWeight: '900', fill: color || this.cols.accent });
    t1.x = pad; t1.y = pad - 2;
    PixiPremiumScene.fit(t1, w - pad * 2);
    const t2 = PixiPremiumScene.text(text, { fontSize: 15, fontWeight: '700', fill: this.cols.text, wordWrap: true, wordWrapWidth: w - pad * 2, lineHeight: 20 });
    t2.x = pad; t2.y = t1.y + t1.height + 4;
    const h = t2.y + t2.height + pad;
    c.addChild(new PIXI.Graphics().roundRect(4, 4, w, h, 8).fill({ color: 0x000000, alpha: 0.4 })
      .roundRect(0, 0, w, h, 8).fill({ color: 0x140e1e, alpha: 0.96 })
      .roundRect(0, 0, w, h, 8).stroke({ color: PixiPremiumScene.color(color || this.cols.accent), width: 2 }), t1, t2);
    const shelf = this.keepsakeShelf;
    c.x = Math.round(Math.max(20, Math.min(Layout.W - w - 20, shelf ? shelf.x + shelf.width / 2 - w / 2 : (Layout.W - w) / 2)));
    c.y = this._viewTop + 12;
    c.eventMode = 'static';
    c.on('pointertap', () => this._hideNote());
    this.pixiContainer.addChild(c);
    this.note = c;
    c.alpha = 0;
    gsap.timeline().to(c, { alpha: 1, duration: 0.2 }).to(c, { alpha: 0, duration: 0.4, delay: 5, onComplete: () => this._hideNote() });
  },

  _hideNote() {
    if (!this.note) return;
    gsap.killTweensOf(this.note);
    this.note.destroy({ children: true });
    this.note = null;
  },

  // A world's marker: its name plate with the guardian's face, and the rings the
  // map uses to show the frontier. The landmark itself is part of the map scene.
  _buildWorld(world) {
    const S = this.L.S;
    const { x, y } = this._place(world.id);
    const node = new PIXI.Container();
    node.x = x;
    node.y = y;
    this.nodeLayer.addChild(node);
    const state = this._state(world);
    // During a travel event, the world just finished starts un-restored.
    const eventWorld = this.event && this._world(this.event.stage) === world && world.id !== 'pawnhollow';
    const showState = eventWorld && state === 'restored' ? 'open' : state;
    const locked = showState === 'locked';
    const accent = PixiPremiumScene.color(this.cols.accent);

    // Pulsing ring round the frontier world's landmark.
    const pulse = new PIXI.Graphics().ellipse(0, this.L.STAND * S - 6, 58, 18).stroke({ color: 0xffd66a, width: 4 });
    const isFrontier = world.stages.includes(Math.min(this.save.maxUnlockedLevel || 1, STORY_STAGES.length)) && !this.event;
    pulse.visible = isFrontier && showState !== 'restored';
    node.addChild(pulse);

    // Name plate with the guardian's face on its left end.
    const [plateDX, plateDY] = this.L.PLATE_AT[world.id] || [0, this.L.PLATE_Y];
    const plateY = plateDY * S;
    const name = PixiPremiumScene.text(world.name, { fontFamily: PixiTextStyles.FONT_BODY, fontSize: 15, fontWeight: '800', fill: locked ? '#8a8494' : '#f3ead8' });
    name.anchor.set(0, 0.5);
    PixiPremiumScene.fit(name, this.L.PLATE_NAME_W, 0.78);   // a long translated name must not reach the next plate
    const face = 30;
    // Stars earned here: three small ones, or a count for the Training Camp's five lessons.
    const starBox = new PIXI.Container();
    if (!locked) {
      const chars = world.stages.map(st => STORY_STAGES[st - 1]);
      if (chars.length === 1) {
        starBox.addChild(PixiStar.row(3, StoryStars.best(this.save, chars[0].id), 5, 2));
      } else {
        const got = StoryStars.total(this.save, chars);
        const icon = PixiStar.create(6, got > 0);
        icon.x = 6; icon.y = 6;
        const txt = PixiPremiumScene.text(`${got}/${StoryStars.max(chars)}`, { fontFamily: PixiTextStyles.FONT_BODY, fontSize: 12, fontWeight: '800', fill: '#ffe08a' });
        txt.anchor.set(0, 0.5);
        txt.x = 15; txt.y = 6;
        starBox.addChild(icon, txt);
      }
    }
    const starW = starBox.children.length ? starBox.width + 8 : 0;
    const plateW = name.width + face + 26 + starW;
    const px = plateDX * S - plateW / 2;
    const plate = new PIXI.Graphics();
    const drawPlate = (lockedNow, restored) => plate.clear()
      .rect(px + 2, plateY - 13, plateW, 28).fill({ color: 0x000000, alpha: 0.45 })
      .rect(px, plateY - 15, plateW, 28).fill({ color: 0x0c0912, alpha: 0.9 })
      .rect(px, plateY - 15, plateW, 28).stroke({ color: restored ? 0xffd66a : lockedNow ? 0x4a4452 : 0xc9c2b8, width: 2 });
    drawPlate(locked, showState === 'restored');
    name.x = px + face + 14;
    name.y = plateY - 1;
    const ch = this._char(world.stages[world.stages.length - 1]);
    const portrait = PixiPremiumAssets.characterSprite(world.id === 'trainingcamp' ? 'sergeantsquare' : ch.id);
    portrait.width = portrait.height = face;
    portrait.anchor.set(0.5);
    portrait.x = px + 6 + face / 2;
    portrait.y = plateY - 1;
    const faceBack = new PIXI.Graphics().rect(portrait.x - face / 2 - 2, portrait.y - face / 2 - 2, face + 4, face + 4).fill(0x120d18)
      .rect(portrait.x - face / 2 - 2, portrait.y - face / 2 - 2, face + 4, face + 4).stroke({ color: PixiPremiumScene.color(ch.colors.primary), width: 2 });
    if (locked) portrait.tint = 0x000000;
    const unknown = PixiPremiumScene.text('?', { fontFamily: PixiTextStyles.FONT_BODY, fontWeight: 'bold', fontSize: 18, fill: '#8a8494' });
    unknown.anchor.set(0.5);
    unknown.x = portrait.x;
    unknown.y = portrait.y;
    unknown.visible = locked;
    starBox.x = name.x + name.width + 8;
    starBox.y = plateY - 1 - 6;
    node.addChild(plate, faceBack, portrait, unknown, name, starBox);
    this._plates.push(plate);

    // What the world gave you, once it is restored: its guardian's keepsake, and a
    // fragment where the guardian held one (EndGamer, Checkmate, Grandmaster X).
    const lastStage = world.stages[world.stages.length - 1];
    const gem = new PIXI.Container();
    const ks = typeof Keepsakes !== 'undefined' && Keepsakes.forGuardian(STORY_STAGES[lastStage - 1].id);
    let gx = px + plateW + 4;
    if (ks && typeof PixiKeepsake !== 'undefined') {
      const icon = PixiKeepsake.icon(ks.id, 28);
      icon.x = gx + 14;
      icon.y = plateY - 1;
      gem.addChild(icon);
      gx += 30;
    }
    if (StoryProgress.hasFragment(lastStage) && world.id !== 'trainingcamp') {
      const shard = PixiShard.create(11, world.art);
      shard.x = gx;
      shard.y = plateY - 15;
      gem.addChild(shard);
    }
    gem.visible = showState === 'restored' && world.id !== 'pawnhollow' && world.id !== 'trainingcamp';
    node.addChild(gem);

    const unlock = () => {
      drawPlate(false, false);
      portrait.tint = 0xffffff;
      unknown.visible = false;
      name.style.fill = '#f3ead8';
      pulse.visible = true;
    };
    const restore = () => drawPlate(false, true);

    node.eventMode = 'static';
    node.cursor = 'pointer';
    node.hitArea = new PIXI.Circle(0, 0, this.L.HIT_R);
    this._draggable(node);
    node.on('pointertap', () => this._tapWorld(world));
    // Uncharted before the compass; Soulbound Pixel hides in its storm until the Map.
    if (world.id === 'soulboundpixel' && this.veil > 0) node.visible = false;
    else this._fogHide(node, { x, y });

    return { world, node, gem, pulse, unlock, restore, state: showState };
  },

  /* ------------------------------------------------------------------ */
  /*  Fragment counter and info panel                                    */
  /* ------------------------------------------------------------------ */

  // The bar across the top: "Story Mode" and where you are on the left; the fragments,
  // the keepsakes and your purse on the right (portrait: the keepsakes on a second row).
  _buildTopBar() {
    const L = this.L, P = Layout.isPortrait;
    const top = P ? Layout.SAFE_TOP : 0;
    const barH = this.barH = top + L.BAR + (P ? L.BAR_ROW : 0);
    const accent = PixiPremiumScene.color(this.cols.accent);
    const bar = new PIXI.Graphics()
      .rect(0, 0, Layout.W, barH).fill({ color: 0x0a0712, alpha: 0.97 })
      .rect(0, barH - 2, Layout.W, 2).fill({ color: accent, alpha: 0.55 });
    // A soft shadow under the bar.
    for (let i = 0; i < 4; i++) bar.rect(0, barH + i * 3, Layout.W, 3).fill({ color: 0x000000, alpha: 0.22 - i * 0.05 });
    bar.eventMode = 'static';          // the bar is not part of the map: no drags through it
    this.pixiContainer.addChild(bar);
    // The footer bar goes solid too, so map labels don't show behind its buttons.
    const footer = this.pixiContainer.children.find(c => c.label === 'premiumFooter');
    const fy = PixiPremiumScene.footerY;
    const back = new PIXI.Graphics().rect(0, fy, Layout.W, Layout.H - fy).fill({ color: 0x0a0712, alpha: 0.92 });
    for (let i = 1; i <= 4; i++) back.rect(0, fy - i * 3, Layout.W, 3).fill({ color: 0x000000, alpha: 0.22 - (i - 1) * 0.05 });
    back.eventMode = 'static';
    this.pixiContainer.addChildAt(back, footer ? this.pixiContainer.getChildIndex(footer) : this.pixiContainer.children.length);

    const rowY = top + L.BAR / 2;
    const title = PixiPremiumScene.text('STORY MODE', { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 24, fill: this.cols.text, stroke: { color: '#000000', width: 3 } });
    title.anchor.set(0, 0.5);
    title.x = L.BAR_SIDE;
    title.y = rowY - 9;
    const sub = PixiPremiumScene.text('The Shattered Earth', { fontSize: 14, fontWeight: '700', fill: PixiPremiumScene.alpha(this.cols.text, 'aa') });
    sub.anchor.set(0, 0.5);
    sub.x = L.BAR_SIDE + 2;
    sub.y = rowY + 14;
    this.pixiContainer.addChild(title, sub);

    // Right to left: purse, fragments, keepsakes (landscape) or keepsakes below (portrait).
    let x = Layout.W - L.BAR_SIDE;
    const boxY = Math.round(rowY - L.BOX_H / 2);
    x = this._buildWalletCounter(x, boxY) - L.BAR_GAP;
    x = this._buildFragmentCounter(x, boxY) - L.BAR_GAP;
    if (P) this._buildKeepsakeShelf(null, top + L.BAR + (L.BAR_ROW - L.BOX_H) / 2 - 6);
    else this._buildKeepsakeShelf(x, boxY);
  },

  // A dark rounded box of the bar, with a coloured edge.
  _barBox(w, color, alpha = 0.6) {
    return new PIXI.Graphics().roundRect(0, 0, w, this.L.BOX_H, 8).fill({ color: 0x140e1e, alpha: 0.95 })
      .roundRect(0, 0, w, this.L.BOX_H, 8).stroke({ color, width: 2, alpha });
  },

  // Fragments found, ending at screen x `right`. Returns its left edge.
  _buildFragmentCounter(right, y) {
    const w = 124, h = this.L.BOX_H;
    const c = new PIXI.Container();
    c.x = right - w;
    c.y = y;
    const gem = PixiShard.create(9, 'crystal', { glow: false });
    gem.x = 22;
    gem.y = h / 2;
    this.fragmentText = PixiPremiumScene.text('', { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 16, fill: '#e7d6ff' });
    this.fragmentText.anchor.set(0, 0.5);
    this.fragmentText.x = 40;
    this.fragmentText.y = h / 2 + 1;
    c.addChild(this._barBox(w, 0xc9a6ff), gem, this.fragmentText);
    this.pixiContainer.addChild(c);
    this.fragmentCounter = c;
    this.fragmentGem = gem;
    const shown = StoryProgress.fragments(this.save) - (this.event && this.event.fragment ? 1 : 0);
    this._setFragments(shown);
    return c.x;
  },

  _setFragments(n) {
    this.fragmentCount = n;
    this.fragmentText.text = `${n} / ${StoryProgress.FRAGMENT_COUNT}`;
  },

  _buildInfoPanel() {
    if (this.panel) { gsap.killTweensOf(this.panel); this.panel.destroy({ children: true }); }
    const L = this.L;
    const s = Layout.uiScale || 1;
    const w = Math.min(L.PANEL_W, Layout.W - 56);
    const h = L.PANEL_H;
    const x = Math.round((Layout.W - w) / 2);
    const y = PixiPremiumScene.footerY - h - L.PANEL_GAP;
    const panel = new PIXI.Container();
    this.pixiContainer.addChild(panel);
    this.panel = panel;
    if (this.special) {
      const accent = this._buildSpecialPanel(panel, x, y, w, h);
      this._finishPanel(panel, x, y, w, h, accent);
      return;
    }
    const ch = this._char(this.selected);
    const world = this._world(this.selected);
    const rule = BossRules.get(ch.id);
    const unlocked = StoryProgress.isUnlocked(this.save, ch.stage);
    const beaten = StoryProgress.isBeaten(this.save, ch.stage);
    const block = ch.stage <= (this.save.maxUnlockedLevel || 1) && StoryProgress.roadBlock(this.save, ch.stage);
    PixiPremiumScene.panel(panel, x, y, w, h, { accent: ch.colors.primary, accentAlpha: 0.8 });

    const pad = 18;
    const STRIP = 30;                               // the stars strip along the bottom
    const portraitSize = h - pad * 2 - 6 - STRIP;
    const portrait = PixiPremiumAssets.characterSprite(ch.id);
    portrait.width = portrait.height = portraitSize;
    portrait.x = x + pad;
    portrait.y = y + pad + 4;
    if (!unlocked) portrait.tint = 0x000000;
    panel.addChild(new PIXI.Graphics().roundRect(portrait.x - 3, portrait.y - 3, portraitSize + 6, portraitSize + 6, 6)
      .fill(0x120d18).stroke({ color: PixiPremiumScene.color(ch.colors.primary), width: 2, alpha: 0.9 }));
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
    const tournament = typeof Tournaments !== 'undefined' && Tournaments.forWorld(world.id);
    const statusText = beaten ? (ch.trainer ? 'Passed' : 'Defeated')
      : block ? (block.type === 'rival' ? `Road blocked by ${block.rival.name}` : `Win ${SideContent.ARENA.streak} Arena rounds in a row`)
      : !unlocked ? `Reach stage ${ch.stage} first`
        : tournament ? Tournaments.progressLabel(this.save, world.id)
          : missions ? `Missions ${cleared} / ${StoryMissions.COUNT}` : ch.trainer ? 'Next lesson' : 'Next battle';
    const status = PixiPremiumScene.text(statusText, { fontSize: Math.round(15 * s), fontWeight: '800', fill: beaten ? '#7dea99' : unlocked ? this.cols.text : '#8a8494' });
    status.x = rx;
    status.y = ruleTitle.y + ruleTitle.height + 10;
    panel.addChild(label, ruleTitle, status);

    if (unlocked || block) {
      const label2 = block ? (block.type === 'rival' ? 'Find Them' : 'The Arena') : missions || tournament || world.id === 'trainingcamp' ? 'Enter' : beaten ? 'Replay' : ch.trainer ? 'Train' : 'Fight';
      PixiPremiumScene.button(panel, x + w - btnW - pad, y + Math.round((h - STRIP - btnH) / 2), btnW, btnH, label2, () => this.start(), { primary: true, icon: 'play', fontSize: 20 });
    }

    // The three stars for this stage and what each one asks for.
    const sy = y + h - STRIP - 8;
    panel.addChild(new PIXI.Graphics().rect(x + pad, sy, w - pad * 2, 1).fill({ color: 0xffffff, alpha: 0.12 }));
    const best = StoryStars.best(this.save, ch.id);
    const texts = !StoryStars.has(ch) ? ['Win', '-', '-'] : unlocked ? StoryStars.texts(ch) : ['Win', '???', '???'];
    let sx = x + pad;
    const colW = (w - pad * 2) / 3;
    texts.forEach((t, i) => {
      const st = PixiStar.create(7, best[i]);
      st.x = sx + 8;
      st.y = sy + STRIP / 2 + 4;
      const label = PixiPremiumScene.text(t, { fontSize: Math.round(13 * s), fontWeight: '700', fill: best[i] ? '#ffe08a' : PixiPremiumScene.alpha(this.cols.text, '99') });
      label.anchor.set(0, 0.5);
      label.x = st.x + 14;
      label.y = st.y;
      PixiPremiumScene.fit(label, colW - 30);
      panel.addChild(st, label);
      sx += colW;
    });

    this._finishPanel(panel, x, y, w, h, ch.colors.primary);
  },

  // The parts every info panel shares: the close button, pointer handling and its timer.
  _finishPanel(panel, x, y, w, h, accentColor) {
    const L = this.L;
    // The close button in the top right corner.
    const cs = L.CLOSE, cx = x + w - cs - 10, cy = y + 10;
    const close = new PIXI.Container();
    const box = new PIXI.Graphics();
    const drawBox = (hover) => {
      const a = cs * 0.3, m = cs / 2;
      box.clear()
        .roundRect(0, 0, cs, cs, 6).fill({ color: hover ? 0x2a1f36 : 0x120d18, alpha: 0.9 })
        .roundRect(0, 0, cs, cs, 6).stroke({ color: PixiPremiumScene.color(hover ? this.cols.accent : accentColor), width: 2, alpha: 0.9 })
        .moveTo(m - a, m - a).lineTo(m + a, m + a).moveTo(m + a, m - a).lineTo(m - a, m + a)
        .stroke({ color: hover ? 0xffffff : 0xe8dcf0, width: 3, cap: 'round' });
    };
    drawBox(false);
    close.addChild(box);
    close.x = cx;
    close.y = cy;
    close.eventMode = 'static';
    close.cursor = 'pointer';
    close.hitArea = new PIXI.Rectangle(-8, -8, cs + 16, cs + 16);
    close.on('pointerover', () => drawBox(true));
    close.on('pointerout', () => drawBox(false));
    close.on('pointertap', (e) => { e.stopPropagation(); this._hidePanel(); audioManager.playSelect(); });
    panel.addChild(close);

    // The panel takes the pointer, so clicks on it don't fall through to the map,
    // but pressing its background still drags the map (its buttons don't).
    panel.eventMode = 'static';
    panel.hitArea = new PIXI.Rectangle(x, y, w, h);
    this._draggable(panel, true);
    panel.on('pointerover', () => { this.panelHover = true; });
    panel.on('pointerout', () => { this.panelHover = false; });
    this.panelHover = false;
    this._showPanel();
  },

  // Show the info panel (fading in if it was hidden) and restart its timer.
  _showPanel() {
    if (!this.panel) return;
    this.panelTime = 0;
    if (this.panelShown && this.panel.visible) return;
    this.panelShown = true;
    gsap.killTweensOf(this.panel);
    this.panel.visible = true;
    gsap.to(this.panel, { alpha: 1, duration: 0.25, ease: 'power1.out' });
  },

  _hidePanel() {
    if (!this.panel || !this.panelShown) return;
    this.panelShown = false;
    this.panelHover = false;
    gsap.killTweensOf(this.panel);
    gsap.to(this.panel, { alpha: 0, duration: 0.35, ease: 'power1.in', onComplete: () => { if (this.panel && !this.panelShown) this.panel.visible = false; } });
  },

  /* ------------------------------------------------------------------ */
  /*  Selection and starting a fight                                     */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /*  Places that are not worlds: the Shop, the Arena, rivals, side quests */
  /* ------------------------------------------------------------------ */

  // Stars to spend and coins, ending at screen x `right`. Returns its left edge.
  _buildWalletCounter(right, y) {
    if (typeof Wallet === 'undefined') return right;
    const w = 196, h = this.L.BOX_H;
    const c = new PIXI.Container();
    c.x = right - w;
    c.y = y;
    const star = PixiStar.create(7, true);
    star.x = 20; star.y = h / 2;
    const st = PixiPremiumScene.text(String(Wallet.stars(this.save)), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 15, fill: '#ffe08a' });
    st.anchor.set(0, 0.5); st.x = 32; st.y = h / 2 + 1;
    const coin = this._coinIcon(8);
    coin.x = 104; coin.y = h / 2;
    const co = PixiPremiumScene.text(String(Wallet.coins()), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 15, fill: '#ffd24a' });
    co.anchor.set(0, 0.5); co.x = 116; co.y = h / 2 + 1;
    PixiPremiumScene.fit(co, w - 122);
    c.addChild(this._barBox(w, 0xffd66a, 0.5), star, st, coin, co);
    this.pixiContainer.addChild(c);
    this.walletCounter = c;
    this.walletStars = st;
    this.walletCoins = co;
    return c.x;
  },

  // The keepsakes won from the guardians, in one row: empty slots as dark shapes. Ends at
  // screen x `right` (null: centred).
  _buildKeepsakeShelf(right, y) {
    if (typeof Keepsakes === 'undefined' || typeof PixiKeepsake === 'undefined') return right;
    const items = Keepsakes.all();
    const cell = 32, pad = 10, h = this.L.BOX_H, w = items.length * cell + pad * 2;
    const c = new PIXI.Container();
    c.x = right === null ? Math.round((Layout.W - w) / 2) : right - w;
    c.y = y;
    c.addChild(this._barBox(w, 0xc9a6ff, 0.4));
    this.keepsakeSlots = {};
    items.forEach((k, i) => {
      const g = STORY_STAGES.find(ch => ch.id === k.guardian);
      const has = g && StoryProgress.isBeaten(this.save, g.stage) && !(this.event && this.event.keepsake === k.guardian);
      const icon = PixiKeepsake.icon(k.id, 28);
      icon.x = pad + i * cell + cell / 2;
      icon.y = h / 2;
      if (!has) { icon.tint = 0x000000; icon.alpha = 0.45; }
      c.addChild(icon);
      this.keepsakeSlots[k.id] = icon;
      // Tap a keepsake to read what it does (or who holds it).
      const hit = new PIXI.Container();
      hit.hitArea = new PIXI.Rectangle(pad + i * cell, 0, cell, h);
      hit.eventMode = 'static';
      hit.cursor = 'pointer';
      hit.on('pointertap', () => {
        const got = this.keepsakeSlots[k.id].alpha === 1 && this.keepsakeSlots[k.id].tint === 0xffffff;
        this._showNote(got ? k.name : '???', got ? k.use : `Not found yet. ${g ? g.name : 'A guardian'} holds it.`, k.color);
        audioManager.playSelect();
      });
      c.addChild(hit);
    });
    this.pixiContainer.addChild(c);
    this.keepsakeShelf = c;
    return c.x;
  },

  // A small pixel coin.
  _coinIcon(r) {
    const g = new PIXI.Graphics();
    g.circle(0, 0, r).fill(0x8a5a10).circle(0, -0.5, r - 1.5).fill(0xe0a830).circle(0, -0.5, r * 0.62).stroke({ color: 0xb07a1c, width: Math.max(1, r * 0.12) })
      .circle(-r * 0.3, -r * 0.35, r * 0.22).fill(0xfff0a0);
    return g;
  },

  // A little trophy (the Arena).
  _trophyIcon(sz) {
    const g = new PIXI.Graphics(), u = sz / 8;
    g.rect(-3 * u, -4 * u, 6 * u, 4 * u).fill(0xe0a830).rect(-2 * u, 0, 4 * u, u).fill(0xb07a1c)
      .rect(-u / 2, u, u, 2 * u).fill(0xb07a1c).rect(-2 * u, 3 * u, 4 * u, u).fill(0x8a5a10)
      .rect(-4 * u, -4 * u, u, 2 * u).fill(0xe0a830).rect(3 * u, -4 * u, u, 2 * u).fill(0xe0a830)
      .rect(-2 * u, -4 * u, u, 2 * u).fill(0xfff0a0);
    return g;
  },

  _buildSpecials() {
    const S = this.L.S;
    this.specials = [];
    const at = ([x, y]) => ({ x: x * S, y: y * S });
    if (typeof Wallet !== 'undefined') {
      this.specials.push(this._buildSpecial({ type: 'shop', id: 'shop', at: this._place('shop'), label: 'The Bazaar', plate: true }));
    }
    // Iron-bound chests, once the map is charted.
    if (this.hasCompass && typeof Keepsakes !== 'undefined') {
      for (const ch of Keepsakes.CHESTS) {
        if (Keepsakes.chestOpened(ch.id, this.save)) continue;
        this.specials.push(this._buildSpecial({ type: 'chest', id: ch.id, at: at(ch.at), label: ch.name, chest: ch }));
      }
    }
    if (typeof SideContent === 'undefined') return;
    const arenaOpen = SideContent.arenaUnlocked(this.save);
    this.specials.push(this._buildSpecial({ type: 'arena', id: 'arena', at: this._place('arena'), label: 'The Arena', plate: true, locked: !arenaOpen }));
    for (const r of SideContent.RIVALS) {
      if (!SideContent.rivalVisible(this.save, r)) continue;
      this.specials.push(this._buildSpecial({ type: 'rival', id: r.id, at: this._roadPoint(r.gate) || at(r.at), label: r.name, rival: r, tier: SideContent.rivalTier(this.save, r.id), blocking: !SideContent.roadOpen(this.save, r.gate) }));
    }
    for (const gid of Object.keys(SideContent.QUESTS)) {
      if (!SideContent.questOpen(this.save, gid) || SideContent.questDone(this.save, gid)) continue;
      const q = SideContent.QUESTS[gid], home = this._place(q.world);
      this.specials.push(this._buildSpecial({ type: 'quest', id: gid, at: { x: home.x + q.at[0] * S, y: home.y + q.at[1] * S }, label: q.name, quest: q }));
    }
  },

  // A rival's name tag that would cover a place's name plate (longer names in
  // some languages) drops below the plate.
  _unstackTags() {
    const hit = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    for (const def of this.specials || []) {
      if (!def.tagParts) continue;
      const tag = def.tagParts[0];
      for (const plate of this._plates || []) {
        const t = tag.getBounds(), p = plate.getBounds();
        if (!hit(t, p)) continue;
        const scale = t.height / 20 || 1;
        const dy = Math.ceil((p.y + p.height - t.y) / scale) + 3;
        for (const part of def.tagParts) part.y += dy;
      }
    }
  },

  // The middle of the road into a stage (where the rival blocking it camps).
  _roadPoint(stage) {
    if (!stage || stage < 2 || !this.stopIndex) return null;
    const a = this.stopIndex[stage - 2], b = this.stopIndex[stage - 1];
    const p = this.path[Math.round((a + b) / 2)];
    return p ? { x: Math.round(p.x), y: Math.round(p.y) } : null;
  },

  _buildSpecial(def) {
    const c = new PIXI.Container();
    c.x = def.at.x;
    c.y = def.at.y;
    def.node = c;
    def.phase = Math.random() * 6;
    if (def.plate) {
      // Shop and Arena: a name plate under their landmark, with an icon.
      const plateY = this.L.PLATE_Y * this.L.S;
      const name = PixiPremiumScene.text(def.label, { fontFamily: PixiTextStyles.FONT_BODY, fontSize: 15, fontWeight: '800', fill: def.locked ? '#8a8494' : '#f3ead8' });
      name.anchor.set(0, 0.5);
      PixiPremiumScene.fit(name, this.L.PLATE_NAME_W, 0.78);
      const pw = name.width + 44, px = -pw / 2;
      const color = def.type === 'shop' ? 0xffd24a : 0xff8a4a;
      c.addChild(new PIXI.Graphics()
        .rect(px + 2, plateY - 13, pw, 28).fill({ color: 0x000000, alpha: 0.45 })
        .rect(px, plateY - 15, pw, 28).fill({ color: 0x0c0912, alpha: 0.9 })
        .rect(px, plateY - 15, pw, 28).stroke({ color: def.locked ? 0x4a4452 : color, width: 2 }));
      const icon = def.type === 'shop' ? this._coinIcon(8) : this._trophyIcon(16);
      icon.x = px + 16; icon.y = plateY - 1;
      if (def.locked) icon.alpha = 0.4;
      name.x = px + 30; name.y = plateY - 1;
      c.addChild(icon, name);
      c.hitArea = new PIXI.Circle(0, 0, this.L.HIT_R);
    } else if (def.type === 'rival') {
      // A wandering rival: their piece on a little base, with a name tag and tier pips.
      const base = new PIXI.Graphics().ellipse(0, 4, 18, 6).fill({ color: 0x000000, alpha: 0.4 })
        .ellipse(0, 2, 16, 5).fill({ color: PixiPremiumScene.color(def.rival.colors.secondary), alpha: 0.9 })
        .ellipse(0, 2, 16, 5).stroke({ color: PixiPremiumScene.color(def.rival.colors.primary), width: 2 });
      const piece = PixiPieceRenderer.createSprite(PixiPieceRenderer.withArt(def.rival.theme), 'black', def.rival.piece);
      piece.width = piece.height = 40;
      piece.anchor.set(0.5, 0.95);
      const bob = new PIXI.Container();
      bob.addChild(piece);
      def.bob = bob; def.bobY = 0;
      const name = PixiPremiumScene.text(def.label, { fontFamily: PixiTextStyles.FONT_BODY, fontSize: 13, fontWeight: '800', fill: '#f3ead8' });
      name.anchor.set(0.5, 0.5);
      PixiPremiumScene.fit(name, this.L.TAG_NAME_W, 0.78);
      const tw = name.width + 16, ty = 22;
      const tag = new PIXI.Graphics().rect(-tw / 2, ty - 10, tw, 20).fill({ color: 0x0c0912, alpha: 0.88 })
        .rect(-tw / 2, ty - 10, tw, 20).stroke({ color: PixiPremiumScene.color(def.rival.colors.primary), width: 2 });
      name.y = ty;
      const pips = new PIXI.Graphics();
      for (let i = 0; i < SideContent.TIERS; i++) pips.rect(-13 + i * 10, ty + 13, 6, 6).fill(i < def.tier ? 0xffd24a : 0x3a3442);
      if (def.blocking) {
        // A striped barrier across the road behind them.
        const bar = new PIXI.Graphics();
        for (let i = 0; i < 6; i++) bar.rect(-30 + i * 10, -4, 10, 6).fill(i % 2 ? 0xf3ead8 : 0xd9423a);
        bar.rect(-32, -8, 4, 14).fill(0x2a1a14).rect(28, -8, 4, 14).fill(0x2a1a14);
        c.addChild(bar);
        const warn = PixiPremiumScene.text('ROAD BLOCKED', { fontFamily: PixiTextStyles.FONT_BODY, fontSize: 11, fontWeight: '900', fill: '#ff8a7a', stroke: { color: '#000000', width: 3 } });
        warn.anchor.set(0.5, 1);
        warn.y = -46;
        c.addChild(warn);
      }
      c.addChild(base, bob, tag, name, pips);
      def.tagParts = [tag, name, pips];
      c.hitArea = new PIXI.Circle(0, -6, 40);
    } else if (def.type === 'chest') {
      // An iron-bound chest with a padlock, glinting now and then.
      const bob = new PIXI.Container();
      const art = this._chestArt(3, false);
      bob.addChild(art);
      def.bob = bob; def.bobY = 0; def.art = art;
      c.addChild(new PIXI.Graphics().ellipse(0, 2, 20, 6).fill({ color: 0x000000, alpha: 0.4 }), bob);
      c.hitArea = new PIXI.Circle(0, -10, 34);
    } else if (def.type === 'quest') {
      // A side quest: a golden "!" bubble over the guardian's world.
      const bob = new PIXI.Container();
      const g = new PIXI.Graphics().roundRect(-15, -36, 30, 30, 6).fill({ color: 0x0c0912, alpha: 0.92 })
        .roundRect(-15, -36, 30, 30, 6).stroke({ color: 0xffd24a, width: 3 })
        .poly([-5, -6, 5, -6, 0, 2]).fill(0xffd24a)
        .rect(-2, -31, 4, 13).fill(0xffe890).rect(-2, -15, 4, 4).fill(0xffe890);
      bob.addChild(g);
      def.bob = bob; def.bobY = 0;
      c.addChild(bob);
      c.hitArea = new PIXI.Circle(0, -20, 30);
    }
    c.eventMode = 'static';
    c.cursor = 'pointer';
    this._draggable(c);
    c.on('pointertap', () => { if (!this.busy && !this.flight && (!this.drag || !this.drag.moved)) this._selectSpecial(def); });
    this.nodeLayer.addChild(c);
    this._fogHide(c, def.at);
    return def;
  },

  _selectSpecial(def, quiet) {
    this.special = def;
    const p = def.at;
    this._focus(p.x, p.y);
    const big = def.plate;
    this.ring.clear()
      .ellipse(0, 0, big ? 62 : 30, big ? 20 : 11).fill({ color: 0xffe8a0, alpha: 0.16 })
      .ellipse(0, 0, big ? 62 : 30, big ? 20 : 11).stroke({ color: 0xffe8a0, width: 3, alpha: 0.9 });
    this.ring.x = p.x;
    this.ring.y = p.y + (big ? this.L.STAND * this.L.S - 6 : 4);
    this.ring.visible = true;
    for (const st of this.stopNodes) st.c.scale.set(1);
    this._buildInfoPanel();
    if (!quiet) audioManager.playSelect();
  },

  // The info panel for a special place. Returns its accent colour.
  _buildSpecialPanel(panel, x, y, w, h) {
    const d = this.special, save = this.save;
    const s = Layout.uiScale || 1;
    const pad = 18, STRIP = 30;
    let accent = '#ffd24a', name = d.label, title = '', meta = '', label = '', ruleTitle = '', status = '', strip = '', button = null, portraitId = null, icon = null;
    if (d.type === 'shop') {
      title = 'The Shop';
      meta = 'Spend stars on rewinds, hints and the plane; coins on paint, characters and themes.';
      label = 'YOUR PURSE';
      ruleTitle = `${Wallet.stars(save)} star${Wallet.stars(save) === 1 ? '' : 's'}  ·  ${Wallet.coins()} coin${Wallet.coins() === 1 ? '' : 's'}`;
      status = 'Stars come from battles, coins from every win.';
      strip = 'Stars: rewind a move, get a hint, remove a piece, fly the plane. Coins: plane paint, characters, themes.';
      button = 'Enter';
      icon = this._coinIcon(34);
    } else if (d.type === 'arena') {
      accent = '#ff8a4a';
      const a = SideContent.arena(save), open = SideContent.arenaUnlocked(save);
      title = 'A gauntlet of guardians';
      meta = open ? `Best streak ${a.best}  ·  next: round ${a.run + 1}` : `Beat ${SideContent.ARENA.unlockBeaten} guardians to open it`;
      label = 'NEXT OPPONENT';
      const def = open ? SideContent.arenaDef(a.run) : null;
      ruleTitle = def ? def.name : '???';
      status = def ? `${def.rule.title}  ·  +${def.reward.coins} coins` : 'Locked';
      strip = `Fight the guardians you have beaten, one after another. One loss ends the run. Win ${SideContent.ARENA.streak} in a row to open the road to the Obsidian Court.`;
      button = open ? (a.run ? 'Continue' : 'Fight') : null;
      if (def) portraitId = def.face;
      else icon = this._trophyIcon(60);
    } else if (d.type === 'rival') {
      const r = d.rival, tier = SideContent.rivalTier(save, r.id);
      const def = SideContent.rivalDef(r, tier);
      SideMatches.make(def);
      accent = r.colors.primary;
      name = def.name;
      title = r.title;
      meta = !SideContent.roadOpen(save, r.gate) ? `Blocks the road to ${this._world(r.gate).name}. Beat them to pass.`
        : tier >= SideContent.TIERS ? 'Beaten three times. Still up for a game.' : `Wandering rival  ·  tier ${Math.min(tier + 1, SideContent.TIERS)} of ${SideContent.TIERS}`;
      label = 'THEIR TWIST';
      ruleTitle = r.rule.title;
      status = `+${def.reward.coins} coins${save.sideWins && save.sideWins.includes(def.once) ? '' : '  ·  +2 stars'}`;
      strip = r.lines.before;
      button = 'Challenge';
      portraitId = def.id;
    } else if (d.type === 'chest') {
      const key = Keepsakes.has('ironkey', save), R = Keepsakes.CHEST_REWARD;
      accent = '#9ab8e8';
      title = 'An iron-bound chest';
      meta = key ? 'Your Iron Key fits the padlock.' : 'Shut with an iron padlock. The key must be somewhere in the Iron Keep.';
      label = 'INSIDE';
      ruleTitle = `${R.coins} coins  ·  ${R.stars} star`;
      status = key ? 'Ready to open' : 'Locked';
      strip = Keepsakes.get('ironkey').use;
      button = key ? 'Open' : null;
      icon = this._chestArt(5, false);
      icon.y = 22;                                        // the art hangs from its bottom middle
      const holder = new PIXI.Container();
      holder.addChild(icon);
      icon = holder;
    } else if (d.type === 'quest') {
      const q = d.quest, step = SideContent.questStep(save, d.id), g = STORY_STAGES.find(c => c.id === d.id);
      const def = SideContent.questDef(d.id, Math.min(step, 2));
      SideMatches.make(def);
      accent = g.colors.primary;
      name = q.name;
      title = `A favour for ${g.name}`;
      meta = `Step ${step + 1} of 3: ${def.name}`;
      label = 'THIS STEP';
      ruleTitle = def.rule.title;
      status = step >= 2 ? `Reward: ${q.reward.coins} coins, ${q.reward.stars} stars and a prize` : `+${def.reward.coins} coins`;
      strip = step === 0 ? q.intro : def.dialogue.before;
      button = 'Play';
      portraitId = d.id;
    }
    PixiPremiumScene.panel(panel, x, y, w, h, { accent, accentAlpha: 0.8 });
    const portraitSize = h - pad * 2 - 6 - STRIP;
    const px = x + pad, py = y + pad + 4;
    panel.addChild(new PIXI.Graphics().roundRect(px - 3, py - 3, portraitSize + 6, portraitSize + 6, 6)
      .fill(0x120d18).stroke({ color: PixiPremiumScene.color(accent), width: 2, alpha: 0.9 }));
    if (portraitId) {
      const portrait = PixiPremiumAssets.characterSprite(portraitId);
      portrait.width = portrait.height = portraitSize;
      portrait.x = px; portrait.y = py;
      panel.addChild(portrait);
    } else if (icon) {
      icon.x = px + portraitSize / 2; icon.y = py + portraitSize / 2;
      panel.addChild(icon);
    }
    const tx = px + portraitSize + 18;
    const btnW = 180, btnH = 52, RULE_W = 250;
    const rx = x + w - btnW - pad * 2 - RULE_W;
    const textMax = rx - tx - 20;
    const t1 = PixiPremiumScene.text(name, { fontSize: Math.round(26 * s), fontWeight: '900', fill: this.cols.text });
    t1.x = tx; t1.y = y + pad + 2;
    PixiPremiumScene.fit(t1, textMax);
    const t2 = PixiPremiumScene.text(title, { fontSize: Math.round(16 * s), fontWeight: '800', fill: accent });
    t2.x = tx; t2.y = t1.y + t1.height + 4;
    PixiPremiumScene.fit(t2, textMax);
    const t3 = PixiPremiumScene.text(meta, { fontSize: Math.round(14 * s), fill: PixiPremiumScene.alpha(this.cols.text, 'aa'), wordWrap: true, wordWrapWidth: textMax });
    t3.x = tx; t3.y = t2.y + t2.height + 8;
    const l1 = PixiPremiumScene.text(label, { fontSize: 12, fontWeight: '900', fill: PixiPremiumScene.alpha(this.cols.text, '88'), letterSpacing: 1 });
    l1.x = rx; l1.y = y + pad + 6;
    const r1 = PixiPremiumScene.text(ruleTitle, { fontSize: Math.round(19 * s), fontWeight: '800', fill: this.cols.accent });
    r1.x = rx; r1.y = l1.y + 20;
    PixiPremiumScene.fit(r1, RULE_W - 10);
    const r2 = PixiPremiumScene.text(status, { fontSize: Math.round(14 * s), fontWeight: '800', fill: button ? this.cols.text : '#8a8494', wordWrap: true, wordWrapWidth: RULE_W - 10 });
    r2.x = rx; r2.y = r1.y + r1.height + 10;
    panel.addChild(t1, t2, t3, l1, r1, r2);
    if (button) PixiPremiumScene.button(panel, x + w - btnW - pad, y + Math.round((h - STRIP - btnH) / 2), btnW, btnH, button, () => this.start(), { primary: true, icon: 'play', fontSize: 20 });
    const sy = y + h - STRIP - 8;
    panel.addChild(new PIXI.Graphics().rect(x + pad, sy, w - pad * 2, 1).fill({ color: 0xffffff, alpha: 0.12 }));
    const st = PixiPremiumScene.text(strip, { fontSize: Math.round(13 * s), fontWeight: '700', fill: PixiPremiumScene.alpha(this.cols.text, '99') });
    st.anchor.set(0, 0.5);
    st.x = x + pad + 4; st.y = sy + STRIP / 2 + 4;
    PixiPremiumScene.fit(st, w - pad * 2 - 8, 0.6);
    panel.addChild(st);
    return accent;
  },

  // A little pixel chest (u screen px per pixel), centred on its bottom middle; open: lid up.
  _chestArt(u, open) {
    const g = new PIXI.Graphics(), R = (x, y, w, h, c) => g.rect(x * u, y * u, w * u, h * u).fill(c);
    const X = -7, Y = -11;
    R(X - 1, Y + 4, 16, 8, 0x1a1014);                                   // outline
    R(X, Y + 5, 14, 6, 0x8a5424); R(X, Y + 9, 14, 2, 0x5e3618);         // body
    R(X + 3, Y + 5, 1, 6, 0x4a4e5e); R(X + 10, Y + 5, 1, 6, 0x4a4e5e);  // iron bands
    if (open) {
      R(X - 1, Y - 3, 16, 5, 0x1a1014); R(X, Y - 2, 14, 3, 0xa86a30); R(X, Y + 1, 14, 3, 0x3a2010);
      R(X + 1, Y + 2, 12, 2, 0xffd24a); R(X + 3, Y + 1, 2, 1, 0xfff0a0); R(X + 8, Y + 1, 3, 1, 0xfff0a0);
    } else {
      R(X - 1, Y + 1, 16, 4, 0x1a1014); R(X, Y + 2, 14, 3, 0xa86a30); R(X, Y + 2, 14, 1, 0xc88a48);
      R(X + 3, Y + 2, 1, 3, 0x6a6e80); R(X + 10, Y + 2, 1, 3, 0x6a6e80);
      R(X + 5, Y + 4, 4, 4, 0x1a1014); R(X + 6, Y + 5, 2, 2, 0x9aa0b8); // the padlock
      R(X + 6, Y + 3, 2, 1, 0x9aa0b8);
    }
    return g;
  },

  // Opens a chest with the Iron Key: the lid springs, coins fly out, the purse updates.
  _openChest(d) {
    const reward = Keepsakes.openChest(d.id, store.getActiveSave());
    this.save = store.getActiveSave() || this.save;
    if (!reward) { this.busy = false; return; }
    const open = this._chestArt(3, true);
    d.bob.removeChildren().forEach(c => c.destroy());
    d.bob.addChild(open);
    audioManager.playCapture && audioManager.playCapture();
    for (let i = 0; i < 16; i++) {
      const coin = this._coinIcon(5);
      coin.x = d.at.x; coin.y = d.at.y - 20;
      this.map.addChild(coin);
      const a = -Math.PI / 2 + (i / 15 - 0.5) * 2.2;
      gsap.to(coin, { x: d.at.x + Math.cos(a) * (60 + (i % 3) * 20), y: d.at.y - 20 + Math.sin(a) * 70, alpha: 0, duration: 0.9, ease: 'power2.out', onComplete: () => coin.destroy() });
    }
    this._banner(`+${reward.coins} COINS  +${reward.stars} STAR`);
    if (this.walletStars) this.walletStars.text = String(Wallet.stars(this.save));
    if (this.walletCoins) this.walletCoins.text = String(Wallet.coins());
    gsap.fromTo(this.walletCounter.scale, { x: 1.2, y: 1.2 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(3)' });
    gsap.to(d.node, { alpha: 0, duration: 0.5, delay: 1.4, onComplete: () => {
      this.specials = this.specials.filter(sp => sp !== d);
      d.node.destroy({ children: true });
      this.busy = false;
      this._select(this.selected);
    } });
    this._hidePanel();
  },

  // Rebuilds the markers that are not worlds (after the map is charted: the chests).
  _rebuildSpecials() {
    for (const sp of this.specials || []) if (sp.node && !sp.node.destroyed) sp.node.destroy({ children: true });
    this.fogged = this.fogged.filter(f => !f.obj.destroyed);
    this._buildSpecials();
    for (const sp of this.specials) if (sp.type === 'chest') { sp.node.alpha = 0; gsap.to(sp.node, { alpha: 1, duration: 0.5 }); }
  },

  _startSpecial() {
    const d = this.special;
    // The king goes to stand in front of the Bazaar or the Arena.
    const at = d.plate ? { x: d.at.x, y: d.at.y + this.L.STAND * this.L.S } : d.at;
    if (d.type === 'shop') {
      audioManager.playButton && audioManager.playButton();
      this._flyThen(at, () => switchScreen('shop', { from: 'worldMap' }));
      return;
    }
    if (d.type === 'chest') {
      if (!Keepsakes.has('ironkey', this.save)) return;
      this.busy = true;
      this._flyThen(d.at, () => this._openChest(d));
      return;
    }
    if (d.type === 'arena' && !SideContent.arenaUnlocked(this.save)) return;
    const run = d.type === 'arena' ? () => SideContent.startArena()
      : d.type === 'rival' ? () => SideContent.startRival(d.id)
        : () => SideContent.startQuest(d.id);
    this.busy = true;
    this._flyThen(at, () => this._zoomInto(at, run));
  },

  /* ------------------------------------------------------------------ */
  /*  The plane (a Shop item): your king flies instead of walking         */
  /* ------------------------------------------------------------------ */

  _hasPlane() {
    return typeof Wallet !== 'undefined' && Wallet.hasPlane(this.save);
  },

  // A little pixel biplane in the plane's paint, facing right; the king rides in it.
  _makePlane() {
    const [body, trim, shade] = (typeof Wallet !== 'undefined' ? Wallet.planeColors() : ['#f4f0e8', '#d94a4a', '#5a5a6a']).map(c => PixiPremiumScene.color(c));
    const c = new PIXI.Container();
    const g = new PIXI.Graphics()
      .rect(-25, -13, 9, 12).fill(0x1a1420).rect(-27, -5, 46, 12).fill(0x1a1420).rect(15, -4, 8, 10).fill(0x1a1420)
      .rect(-11, -15, 28, 6).fill(0x1a1420).rect(-13, 3, 32, 6).fill(0x1a1420)
      .rect(-24, -12, 7, 10).fill(trim)                 // tail fin
      .rect(-26, -4, 44, 10).fill(body)                 // fuselage
      .rect(-26, 3, 44, 3).fill(shade)
      .rect(16, -3, 6, 8).fill(trim)                    // nose
      .rect(-10, -14, 26, 4).fill(body)                 // top wing
      .rect(-10, -11, 26, 1).fill(shade)
      .rect(-8, -10, 2, 7).fill(shade).rect(12, -10, 2, 7).fill(shade)   // struts
      .rect(-12, 4, 30, 4).fill(trim)                   // lower wing
      .rect(-6, -4, 10, 3).fill(0x2a2a3a);              // cockpit
    const prop = new PIXI.Graphics().rect(22, -9, 2, 20).fill({ color: 0xe8e8f0, alpha: 0.8 });
    c.addChild(g, prop);
    c._prop = prop;
    return c;
  },

  // Fly the token along points [{x, y}], the plane under it, a shadow on the ground.
  _flyAlong(points, duration, done) {
    const plane = this._makePlane();
    const shadow = new PIXI.Graphics().ellipse(0, 0, 26, 6).fill({ color: 0x000000, alpha: 0.35 });
    this.map.addChild(shadow);
    this.map.addChild(plane);
    this.map.setChildIndex(this.token, this.map.children.length - 1);
    this.token._hopping = true;
    const lens = [0];
    for (let i = 1; i < points.length; i++) lens.push(lens[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
    const total = lens[lens.length - 1] || 1;
    const at = (d) => {
      let i = 1;
      while (i < points.length - 1 && lens[i] < d) i++;
      const a = points[i - 1], b = points[i] || a, seg = (lens[i] - lens[i - 1]) || 1, f = Math.min(1, Math.max(0, (d - lens[i - 1]) / seg));
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dir: b.x >= a.x ? 1 : -1 };
    };
    this.tokenShadow.visible = false;
    // The king sits in the cockpit, a little smaller than when it stands.
    const size = this.token.width;
    this.token.width = this.token.height = size * 0.72;
    const PS = 1.9;
    const t = { v: 0 };
    gsap.to(t, {
      v: 1, duration, ease: 'power1.inOut',
      onUpdate: () => {
        const p = at(t.v * total), alt = Math.sin(Math.PI * t.v) * 70 + 10 * Math.min(1, t.v * 6, (1 - t.v) * 6);
        plane.x = p.x; plane.y = p.y - alt - 8;
        plane.scale.set(PS * p.dir, PS);
        plane._prop.visible = Math.floor(performance.now() / 50) % 2 === 0;
        this.token.x = p.x - 2 * PS * p.dir;
        this.token.y = plane.y - 3 * PS;
        shadow.x = p.x + alt * 0.3; shadow.y = p.y + 4;
        shadow.scale.set(PS * (1 - alt / 200));
        this._focus(p.x, p.y);
      },
      onComplete: () => {
        const end = points[points.length - 1];
        gsap.to(plane, { alpha: 0, duration: 0.3, onComplete: () => { plane.destroy({ children: true }); shadow.destroy(); } });
        this.token.width = this.token.height = size;
        this.token.x = end.x;
        this.token._baseY = end.y;
        this.token.y = end.y;
        this.token._hopping = false;
        this.tokenShadow.visible = true;
        this.tokenShadow.x = end.x;
        this.tokenShadow.y = end.y + 2;
        if (done) done();
      },
    });
  },

  // With the plane, the king flies to a place before its fight or shop opens.
  _flyThen(target, done) {
    const from = { x: this.token.x, y: this.token._baseY };
    if (!this._hasPlane()) { done(); return; }
    // Coming back, he stands where he flew to.
    this._setMapPos(target);
    if (Math.hypot(target.x - from.x, target.y - from.y) < 60) { done(); return; }
    this.busy = true;
    const mid = { x: (from.x + target.x) / 2, y: Math.min(from.y, target.y) - 80 };
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push({ x: (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * mid.x + t * t * target.x, y: (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * mid.y + t * t * target.y });
    }
    const dist = Math.hypot(target.x - from.x, target.y - from.y);
    audioManager.playButton && audioManager.playButton();
    this._flyAlong(pts, Math.min(6, 1.5 + dist / 370), done);
  },

  _tapWorld(world) {
    if (this.busy || this.flight || (this.drag && this.drag.moved)) return;
    // The Training Camp picks the next unfinished lesson.
    let stage = world.stages[0];
    if (world.stages.length > 1) {
      stage = world.stages.find(s => !StoryProgress.isBeaten(this.save, s) && StoryProgress.isUnlocked(this.save, s)) || world.stages[0];
    }
    this._select(stage);
  },

  _select(stage) {
    this.special = null;
    this.selected = stage;
    const p = this._stopPos(stage);
    this._focus(p.x, p.y);
    this._highlight();
    this._buildInfoPanel();
    audioManager.playSelect();
  },

  _highlight() {
    const p = this._stopPos(this.selected);
    this.ring.clear()
      .ellipse(0, 0, 62, 20).fill({ color: 0xffe8a0, alpha: 0.16 })
      .ellipse(0, 0, 62, 20).stroke({ color: 0xffe8a0, width: 3, alpha: 0.9 });
    this.ring.x = p.x;
    this.ring.y = p.y - 6;
    this.ring.visible = true;
  },

  // Arrow keys step from world to world.
  _step(dir) {
    const i = WORLDS.indexOf(this._world(this.selected)) + dir;
    if (i < 0 || i >= WORLDS.length) return;
    this._tapWorld(WORLDS[i], true);
  },

  // A world whose own place map (src/themes/scenes/map_<id>.js) opens when you enter it.
  _placeMap(world) {
    return typeof LiveScenes !== 'undefined' && LiveScenes.has('map_' + world.id);
  },

  start() {
    if (this.busy) return;
    if (this.special) { this._startSpecial(); return; }
    const ch = this._char(this.selected);
    const world = this._world(ch.stage);
    // A wandering rival (or the Arena) blocking the road: go to them instead.
    const block = StoryProgress.roadBlock(this.save, ch.stage);
    if (block && ch.stage <= (this.save.maxUnlockedLevel || 1)) { this._showBlock(block); return; }
    if (!StoryProgress.isUnlocked(this.save, ch.stage)) return;
    this.busy = true;
    const p = this._stopPos(ch.stage);
    // Every world opens its own place map: its missions, tournament or lessons, and
    // the guardian at the end.
    if (this._placeMap(world)) {
      this._flyThen(p, () => this._zoomInto(p, () => switchScreen('worldMissions', { world: world.id, fromZoom: true }, { instant: true }), world.id));
      return;
    }
    const missions = StoryMissions.forWorld(world.id);
    const tournament = typeof Tournaments !== 'undefined' && Tournaments.forWorld(world.id);
    this._flyThen(p, () => this._zoomInto(p, () => {
      if (tournament) { switchScreen('tournament', { world: world.id }); return; }
      if (missions) { switchScreen('worldMissions', { world: world.id }); return; }
      store.setActiveSave({ selectedCharacter: ch.id, storyLevel: ch.stage });
      store.update({ selectedCharacter: ch.id, storyLevel: ch.stage, mode: 'story' });
      if (ch.theme) ThemeManager.useStoryTheme(ch.theme);
      store.saveProgress();
      const scene = StoryScenes.before(store.getActiveSave(), ch.stage);
      if (scene) switchScreen('storyScene', { scene, next: 'game' });
      else switchScreen('game');
    }));
  },

  // The road ahead is blocked: show who blocks it.
  _showBlock(block, quiet) {
    const sp = block.type === 'rival'
      ? this.specials.find(d => d.type === 'rival' && d.id === block.rival.id)
      : this.specials.find(d => d.type === 'arena');
    if (!sp) return;
    this._selectSpecial(sp, quiet);
    this._banner(block.type === 'rival' ? `${block.rival.name.toUpperCase()} BLOCKS THE ROAD` : 'WIN THE ARENA FIRST');
  },

  // Zoom into a map point, fade out, then go. With `placeId`, the place's own map
  // opens out of the landmark as a growing circle instead of the fade to black.
  _zoomInto(p, done, placeId) {
    this.busy = true;
    const zoom = 2.4;
    const fade = new PIXI.Graphics().rect(0, 0, Layout.W, Layout.H).fill(0x000000);
    fade.alpha = 0;
    this.pixiContainer.addChild(fade);
    const iris = placeId ? this._irisInto(placeId, p) : null;
    const tl = gsap.timeline({ onComplete: done });
    // The point stays under the same screen spot while the map scales up round it.
    this.drag = null;
    this._zooming = true;
    const sx = p.x - this.cam.x, sy = p.y - this.cam.y;
    const z = { v: 1 };
    tl.to(z, {
      v: zoom,
      duration: 0.7,
      ease: 'power2.in',
      onUpdate: () => {
        const tx = Layout.W / 2 + (sx - Layout.W / 2) * (1 - (z.v - 1) / (zoom - 1));
        const ty = Layout.H / 2 + (sy - Layout.H / 2) * (1 - (z.v - 1) / (zoom - 1));
        this.map.scale.set(z.v);
        this.map.x = tx - p.x * z.v;
        this.map.y = ty - p.y * z.v;
      },
    }, 0);
    if (iris) {
      const r = { v: 0 };
      const full = Math.hypot(Layout.W, Layout.H);
      tl.to(r, { v: 1, duration: 0.75, ease: 'power2.in', onUpdate: () => iris.set(r.v * full, this.map.x + p.x * this.map.scale.x, this.map.y + p.y * this.map.scale.y) }, 0.25);
      tl.to({}, { duration: 0.05 });
    } else {
      tl.to(fade, { alpha: 1, duration: 0.35 }, 0.4);
    }
    this._timeline = tl;
    audioManager.playButton && audioManager.playButton();
  },

  // The place map, laid out exactly as WorldMissionsScreen will show it, seen through
  // a circle that grows from the landmark. set(radius, cx, cy).
  _irisInto(placeId, p) {
    const t = WorldMissionsScreen.WorldMapTransform(placeId);
    const c = new PIXI.Container();
    const sprite = LiveScenes.sprite('map_' + placeId);
    sprite.width = t.w;
    sprite.height = t.h;
    sprite.x = t.ox;
    sprite.y = t.oy;
    const back = new PIXI.Graphics().rect(0, 0, Layout.W, Layout.H).fill(0x05030a);
    const holder = new PIXI.Container();
    holder.addChild(back, sprite);
    const mask = new PIXI.Graphics();
    const rim = new PIXI.Graphics();
    holder.mask = mask;
    c.addChild(holder, mask, rim);
    this.pixiContainer.addChild(c);
    return {
      set: (r, cx, cy) => {
        mask.clear().circle(cx, cy, Math.max(1, r)).fill(0xffffff);
        rim.clear().circle(cx, cy, Math.max(1, r)).stroke({ color: 0xffe8a0, width: 6, alpha: 0.9 * (1 - r / Math.hypot(Layout.W, Layout.H)) });
      },
    };
  },

  back() {
    if (this.busy) return;
    switchScreen('characterSelect');
  },

  handleKeyDown(e) {
    if (this._reveal) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') this._reveal.advance();
      return;
    }
    if (this.modal) {
      if (e.key === 'Escape') this._closeModal();
      else if (e.key === 'Enter') this.modal.yes();
      return;
    }
    // Flying: WASD / ZQSD or the arrows steer; Space, Enter or Escape lands.
    if (this.flight) {
      const dir = this._flyDir(e);
      if (dir) { this.flight.keys.add(dir); if (e.preventDefault) e.preventDefault(); return; }
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') this._land();
      return;
    }
    if (this.busy) return;
    if (e.key === 'Escape') this.back();
    else if (e.key === 'ArrowRight') this._step(1);
    else if (e.key === 'ArrowLeft') this._step(-1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // Up and down look around the map.
      const dy = e.key === 'ArrowUp' ? -1 : 1;
      this.camTarget = this._clampCam(this.camTarget.x, this.camTarget.y + dy * 160);
    } else if (e.key === 'Enter' || e.key === ' ') {
      // A hidden panel comes back first, so you see who you are about to fight.
      if (!this.panelShown) this._showPanel();
      else this.start();
    }
  },

  handleKeyUp(e) {
    const dir = this.flight && this._flyDir(e);
    if (dir) this.flight.keys.delete(dir);
  },

  /* ------------------------------------------------------------------ */
  /*  After a win: restore the world, fly the fragment, travel onwards   */
  /* ------------------------------------------------------------------ */

  _playEvent(event) {
    this.busy = true;
    const beatenWorld = this._world(event.stage);
    const node = this.nodes.find(n => n.world === beatenWorld);
    const nextStage = Math.min(event.stage + 1, STORY_STAGES.length);
    const tl = gsap.timeline({ delay: 0.5, onComplete: () => { this.busy = false; this._timeline = null; if (!after()) this._select(this.tokenStage); } });
    this._timeline = tl;
    // A road still blocked by a rival (or the Arena) stops the king at the world he won.
    const block = event.stage < STORY_STAGES.length && StoryProgress.roadBlock(store.getActiveSave(), nextStage);
    const after = () => {
      if (!block) return false;
      this._showBlock(block);
      return true;
    };

    const worldDone = !event.road && beatenWorld.id !== 'pawnhollow' && beatenWorld.stages[beatenWorld.stages.length - 1] === event.stage;
    if (worldDone && node) {
      // Colour washes out from the landmark over the whole world, and it comes alive.
      const p = this._place(beatenWorld.id);
      this._focus(p.x, p.y);
      const wave = { v: 0 };
      tl.to(wave, {
        v: 1,
        duration: 1.8,
        ease: 'power1.inOut',
        onUpdate: () => { this.heal[beatenWorld.id] = wave.v; this._pushHeal(); },
        onComplete: () => { node.restore(); node.state = 'restored'; },
      }, 0.3);
      tl.add(() => this._sparkle(node), '<0.2');
      audioManager.playCapture && tl.add(() => audioManager.playCapture(), '<');
    }
    // The guardian's keepsake: a full-screen reveal that waits for a click.
    const ks = event.keepsake && typeof Keepsakes !== 'undefined' && Keepsakes.forGuardian(event.keepsake);
    if (ks && typeof PixiKeepsake !== 'undefined') {
      tl.add(() => {
        tl.pause();
        this._reveal = PixiKeepsake.reveal(this.pixiContainer, ks.id, {
          subtitle: `From ${STORY_STAGES[event.stage - 1].name}`,
          onDone: () => {
            this._reveal = null;
            this._flyKeepsake(ks.id, node);
            tl.resume();
          },
        });
      }, '+=0.2');
      tl.add(() => {}, '+=0.9');
      // What it does, shown on the map at once.
      if (ks.id === 'compass' && this.chart) {
        tl.add(() => this._focus(this.token.x, this.token._baseY));
        this._chartWave(tl);
        tl.add(() => {}, '+=1.2');
      } else if (ks.id === 'map' && this.veil) {
        this._liftVeil(tl);
        tl.add(() => {}, '+=1.4');
      } else {
        tl.add(() => this._showNote(ks.name, ks.use, ks.color));
        if (ks.id === 'ironkey') {
          tl.add(() => { for (const sp of this.specials) if (sp.type === 'chest' && sp.node.visible) this._sparkle({ node: sp.node }); });
        }
        tl.add(() => {}, '+=1.2');
      }
    }
    if (event.fragment && node) {
      tl.add(() => this._flyFragment(node), '+=0.1');
      tl.add(() => {}, '+=1.1');
    }
    if (event.stage < STORY_STAGES.length && !block) {
      tl.add(() => this._travel(event.stage, nextStage), '+=0.1');
      tl.add(() => {}, `+=${this._travelTime(event.stage, nextStage) + 0.2}`);
      tl.add(() => this._unlockNext(nextStage));
    } else if (event.stage >= STORY_STAGES.length) {
      // The last guardian: the rifts close and the lands join into one.
      tl.add(() => this._focus(this._mapW / 2, this._mapH / 2), '+=0.2');
      const f = { v: 0 };
      tl.to(f, { v: 1, duration: 3, ease: 'power1.inOut', onUpdate: () => { this.fuse = f.v; this._pushHeal(); } }, '+=0.4');
    }
  },

  // After its reveal, the keepsake shrinks into its slot on the keepsake shelf.
  _flyKeepsake(id, node) {
    const slot = this.keepsakeSlots && this.keepsakeSlots[id];
    if (!slot) return;
    const icon = PixiKeepsake.sprite(id, 160);
    icon.x = Layout.W / 2;
    icon.y = Layout.H * 0.4;
    this.pixiContainer.addChild(icon);
    const end = slot.getGlobalPosition();
    gsap.timeline({ onComplete: () => { icon.destroy(); slot.tint = 0xffffff; slot.alpha = 1; gsap.fromTo(slot.scale, { x: slot.scale.x * 1.6, y: slot.scale.y * 1.6 }, { x: slot.scale.x, y: slot.scale.y, duration: 0.4, ease: 'back.out(3)' }); } })
      .to(icon, { x: end.x, y: end.y, duration: 0.7, ease: 'power2.in' })
      .to(icon.scale, { x: slot.scale.x, y: slot.scale.y, duration: 0.7, ease: 'power2.in' }, 0);
    if (node && node.gem) {
      node.gem.visible = true;
      node.gem.scale.set(0);
      gsap.to(node.gem.scale, { x: 1, y: 1, duration: 0.4, delay: 0.6, ease: 'back.out(3)' });
    }
  },

  // A big line of text that rises and fades over the map.
  _banner(text) {
    const t = PixiPremiumScene.text(text, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 40, fill: '#ffe08a', stroke: { color: '#140e1a', width: 8 } });
    t.anchor.set(0.5);
    t.x = Layout.W / 2;
    t.y = (this._viewTop + this._viewBottom) / 2;
    t.alpha = 0;
    this.pixiContainer.addChild(t);
    gsap.timeline({ onComplete: () => t.destroy() })
      .to(t, { alpha: 1, duration: 0.4 })
      .to(t, { y: t.y - 30, duration: 2.2, ease: 'power1.out' }, 0)
      .to(t, { alpha: 0, duration: 0.6 }, 1.8);
  },

  _openModal(title, lines, yesLabel, onYes) {
    this._closeModal();
    const c = new PIXI.Container();
    this.modal = { c, yes: onYes };
    this.busy = true;
    const shade = new PIXI.Graphics().rect(0, 0, Layout.W, Layout.H).fill({ color: 0x000000, alpha: 0.6 });
    shade.eventMode = 'static';
    c.addChild(shade);
    const w = Math.min(640, Layout.W - 60), h = 280;
    const x = Math.round((Layout.W - w) / 2), y = Math.round((Layout.H - h) / 2);
    PixiPremiumScene.panel(c, x, y, w, h, { accent: this.cols.accent, accentAlpha: 0.9 });
    const t = PixiPremiumScene.text(title, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 26, fill: this.cols.text });
    t.anchor.set(0.5, 0);
    t.x = Layout.W / 2;
    t.y = y + 26;
    c.addChild(t);
    let ty = y + 76;
    for (const line of lines) {
      const l = PixiPremiumScene.text(line, { fontSize: 16, fontWeight: '600', fill: PixiPremiumScene.alpha(this.cols.text, 'cc'), wordWrap: true, wordWrapWidth: w - 64, lineHeight: 22 });
      l.x = x + 32;
      l.y = ty;
      c.addChild(l);
      ty += l.height + 10;
    }
    const bw = 190, bh = 50, by = y + h - bh - 22;
    PixiPremiumScene.button(c, Layout.W / 2 - bw - 10, by, bw, bh, 'Cancel', () => this._closeModal(), { icon: 'back' });
    PixiPremiumScene.button(c, Layout.W / 2 + 10, by, bw, bh, yesLabel, onYes, { primary: true, icon: 'play' });
    this.pixiContainer.addChild(c);
  },

  _closeModal() {
    if (!this.modal) return;
    this.modal.c.destroy({ children: true });
    this.modal = null;
    this.busy = false;
  },

  _sparkle(node) {
    const cx = node.node.x, cy = node.node.y - 20;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const p = new PIXI.Graphics().rect(-3, -3, 6, 6).fill(i % 2 ? 0xffe9a8 : 0xffffff);
      p.x = cx + Math.cos(a) * 30;
      p.y = cy + Math.sin(a) * 18;
      this.map.addChild(p);
      gsap.to(p, {
        x: cx + Math.cos(a) * 130,
        y: cy + Math.sin(a) * 80,
        alpha: 0,
        duration: 1.1,
        ease: 'power2.out',
        onComplete: () => p.destroy(),
      });
    }
  },

  // The world's shard rises, then arcs into the fragment counter.
  _flyFragment(node) {
    const gem = PixiShard.create(18, PixiShard.themeForStage(this.event ? this.event.stage : 7));
    const start = { x: node.node.x + this.map.x, y: node.node.y - 30 + this.map.y };
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
    return this._hops(from, to).length * this._hopTime(from, to);
  },

  // Long voyages hop faster so no trip takes more than a few seconds.
  _hopTime(from, to) {
    const n = this._hops(from, to).length;
    return n > 20 ? Math.max(0.09, 4 / n) : 0.2;
  },

  _hops(from, to) {
    const a = this.stopIndex[from - 1], b = this.stopIndex[to - 1];
    const hops = [];
    let acc = 0;
    for (let i = a + 1; i <= b; i++) {
      acc += Math.hypot(this.path[i].x - this.path[i - 1].x, this.path[i].y - this.path[i - 1].y);
      if (acc >= this.L.HOP || i === b) { hops.push(this.path[i]); acc = 0; }
    }
    return hops;
  },

  // The king hops along the dotted route from one stop to the next (or flies it, with
  // the plane); the camera follows.
  _travel(from, to) {
    if (this._hasPlane()) {
      const a = this.stopIndex[from - 1], b = this.stopIndex[to - 1];
      const pts = this.path.slice(a, b + 1);
      if (pts.length > 1) {
        this._flyAlong(pts, Math.max(0.2, this._travelTime(from, to)), () => {
          this.tokenStage = to;
          this._arrive(this._world(to));
          this._drawPath();
        });
        return;
      }
    }
    const hops = this._hops(from, to), dur = this._hopTime(from, to);
    const tl = gsap.timeline({ onComplete: () => { this.token._hopping = false; } });
    this.token._hopping = true;
    let prev = { x: this.token.x, y: this.token._baseY };
    hops.forEach((p) => {
      const target = { x: p.x, y: p.y };
      const from2 = { ...prev };
      const t = { v: 0 };
      tl.to(t, {
        v: 1,
        duration: dur,
        ease: 'none',
        onUpdate: () => {
          this.token.x = from2.x + (target.x - from2.x) * t.v;
          this.token.y = from2.y + (target.y - from2.y) * t.v - Math.sin(Math.PI * t.v) * 16;
          this.tokenShadow.x = this.token.x;
          this.tokenShadow.y = from2.y + (target.y - from2.y) * t.v + 2;
          this._focus(this.token.x, this.token.y);
        },
      });
      prev = target;
    });
    tl.add(() => {
      this.token._baseY = prev.y;
      this.tokenStage = to;
      this._arrive(this._world(to));
      this._drawPath();
    });
  },

  // What your token looks like in a world: the character worn (a Shop cosmetic; the king
  // by default) in its own piece set, or else in the world's.
  _tokenLook(world) {
    const t = typeof Wallet !== 'undefined' ? Wallet.token() : { piece: 'king', color: 'white', art: null };
    return { piece: t.piece, color: t.color, art: PixiPieceRenderer.withArt(t.art || (world ? world.art : 'pawnhollow')) };
  },

  _setTokenLook() {
    if (!this.token) return;
    const look = this._tokenLook(this.here);
    const set = () => {
      if (!this.token || this.token.destroyed) return;
      const w = this.token.width, h = this.token.height;
      this.token.texture = PixiPieceRenderer.getTexture(look.art, look.color, look.piece);
      this.token.width = w;
      this.token.height = h;
    };
    set();
    // The world's pieces may still be loading.
    if (typeof TextureManager !== 'undefined') Promise.resolve(TextureManager.preloadTheme(look.art)).then(set);
  },

  // The king is now in `world`: story mode takes on its theme and the token its pieces.
  _arrive(world) {
    if (!world) return;
    this.here = world;
    if (this.save.mapWorld !== world.id) {
      store.setActiveSave({ mapWorld: world.id });
      this.save = store.getActiveSave() || this.save;
    }
    ThemeManager.useStoryTheme(world.art);
    this.cols = ThemeManager.getCurrentColors();
    this._setTokenLook();
  },

  // Where the king stands when the map opens.
  _tokenHome() {
    return this.tokenAt || this._stopPos(this.tokenStage);
  },

  // The world whose land a map point (screen px on the map) is in, or null.
  _worldAtMap(p) {
    const def = this._def;
    const id = def && def.worldAt ? def.worldAt(p.x / this.L.S, p.y / this.L.S) : null;
    return id ? WORLDS.find(w => w.id === id) || null : null;
  },

  // Remembers where the plane set the king down (scene px, in the story save).
  _setMapPos(p) {
    if (!p || !this._hasPlane()) return;
    store.setActiveSave({ mapPos: [Math.round(p.x / this.L.S), Math.round(p.y / this.L.S)] });
    store.saveProgress();
    this.save = store.getActiveSave() || this.save;
  },

  /* ------------------------------------------------------------------ */
  /*  Flying the plane by hand                                           */
  /* ------------------------------------------------------------------ */

  FLY: {
    SPEED: 187,     // top speed (map px per second; a third of the first version's)
    ACCEL: 5,       // how quickly it reaches the speed you steer for
    ALT: 64,        // height above the ground while flying
    LOW: 18,        // height when picking up or setting down the king
    PS: 1.9,        // the plane's scale
    EDGE: 40,       // keeps the plane this far inside the map
    CROSS: 0.5,     // seconds over another world's land before its theme takes over
    LAND_R: 130,    // landing this close to a place selects it
  },

  // "Summon the Plane" (bottom right) once the plane is bought; "Land" while flying.
  _buildPlaneButton() {
    if (this.planeBtn) { this.planeBtn.destroy({ children: true }); this.planeBtn = null; }
    if (!this._hasPlane()) return;
    const s = Layout.uiScale || 1;
    const bw = Math.round(250 * s);
    const x = Layout.W - 36 - bw;
    const flying = !!this.flight;
    this.planeBtn = PixiPremiumScene.button(this.pixiContainer, x, PixiPremiumScene.bottomButtonY(44), bw, 44,
      flying ? 'Land the Plane' : 'Summon the Plane', () => (flying ? this._land() : this._summon()),
      { icon: flying ? 'play' : 'spark', primary: !flying });
  },

  // Which way a key steers: WASD, ZQSD (AZERTY) or the arrows.
  _flyDir(e) {
    const k = (e.key || '').toLowerCase(), c = e.code || '';
    if (k === 'arrowup' || k === 'w' || k === 'z' || c === 'KeyW') return 'up';
    if (k === 'arrowdown' || k === 's' || c === 'KeyS') return 'down';
    if (k === 'arrowleft' || k === 'a' || k === 'q' || c === 'KeyA') return 'left';
    if (k === 'arrowright' || k === 'd' || c === 'KeyD') return 'right';
    return null;
  },

  // A line under the header telling how to fly, shown while flying.
  _showFlightHint(on) {
    if (this.flightHint) { this.flightHint.destroy({ children: true }); this.flightHint = null; }
    if (!on) return;
    const c = new PIXI.Container();
    const t = PixiPremiumScene.text('WASD / ZQSD or arrows to fly  ·  hold the map to steer  ·  Space to land', { fontSize: 15, fontWeight: '800', fill: '#f3ead8' });
    t.anchor.set(0.5);
    const w = t.width + 36, h = 34;
    c.addChild(new PIXI.Graphics().roundRect(-w / 2, -h / 2, w, h, 8).fill({ color: 0x0c0912, alpha: 0.85 })
      .roundRect(-w / 2, -h / 2, w, h, 8).stroke({ color: 0xffd66a, width: 2, alpha: 0.6 }), t);
    c.x = Layout.W / 2;
    c.y = this._viewTop + 28;
    this.pixiContainer.addChild(c);
    this.flightHint = c;
  },

  // Puts the plane, the king in its cockpit and its shadow where the flight is.
  _placePlane() {
    const f = this.flight, F = this.FLY;
    const bob = f.ready ? Math.sin(this.time * 3) * 3 : 0;
    f.plane.x = f.x;
    f.plane.y = f.y - f.alt - 8 + bob;
    f.plane.scale.set(F.PS * f.dir, F.PS);
    f.plane.rotation = f.tilt;
    f.plane._prop.visible = Math.floor(performance.now() / 50) % 2 === 0;
    if (f.carrying) {
      this.token.x = f.plane.x - 2 * F.PS * f.dir;
      this.token.y = f.plane.y - 3 * F.PS;
    }
    f.shadow.x = f.x + f.alt * 0.3;
    f.shadow.y = f.y + 4;
    f.shadow.scale.set(F.PS * (1 - f.alt / 200));
  },

  // The plane flies in, dips down, the king hops in and up they go.
  _summon() {
    if (this.busy || this.flight || !this._hasPlane() || !this.token) return;
    this.busy = true;
    this.drag = null;
    this._hidePanel();
    this.ring.visible = false;
    const F = this.FLY;
    const plane = this._makePlane();
    const shadow = new PIXI.Graphics().ellipse(0, 0, 26, 6).fill({ color: 0x000000, alpha: 0.35 });
    this.map.addChild(shadow, plane);
    this.map.setChildIndex(this.token, this.map.children.length - 1);
    const home = { x: this.token.x, y: this.token._baseY };
    const f = this.flight = {
      plane, shadow, x: home.x, y: home.y, vx: 0, vy: 0, dir: 1, tilt: 0, alt: F.LOW,
      keys: new Set(), pointer: null, ready: false, carrying: false, cross: 0, size: this.token.width,
    };
    this._buildPlaneButton();
    const from = { x: home.x - 760, y: home.y - 300 };
    f.shadow.alpha = 0;
    const tl = this._flightTl = gsap.timeline({
      onComplete: () => {
        this._flightTl = null;
        if (this.flight !== f) return;
        f.ready = true;
        this.busy = false;
        this._showFlightHint(true);
      },
    });
    const a = { v: 0 };
    tl.to(a, {
      v: 1, duration: 1.1, ease: 'power2.out',
      onUpdate: () => {
        f.x = from.x + (home.x - from.x) * a.v;
        f.y = from.y + (home.y - from.y) * a.v;
        f.alt = F.LOW + (1 - a.v) * 120;
        f.shadow.alpha = a.v;
        this._placePlane();
        this._focus(home.x, home.y);
      },
    });
    // The king hops into the cockpit.
    const size = f.size, k = { v: 0 };
    let sx = 0, sy = 0;
    tl.to(k, {
      v: 1, duration: 0.35, ease: 'none',
      onStart: () => { this.token._hopping = true; this.tokenShadow.visible = false; sx = this.token.x; sy = this.token.y; },
      onUpdate: () => {
        const tx = plane.x - 2 * F.PS * f.dir, ty = plane.y - 3 * F.PS;
        this.token.x = sx + (tx - sx) * k.v;
        this.token.y = sy + (ty - sy) * k.v - Math.sin(Math.PI * k.v) * 30;
        this.token.width = this.token.height = size * (1 - 0.28 * k.v);
      },
      onComplete: () => { f.carrying = true; },
    });
    if (audioManager.playButton) tl.add(() => audioManager.playButton(), '<');
    const up = { v: 0 };
    tl.to(up, { v: 1, duration: 0.6, ease: 'power1.inOut', onUpdate: () => { f.alt = F.LOW + (F.ALT - F.LOW) * up.v; this._placePlane(); } });
  },

  // One frame of flight: steer, move, follow with the camera, and take on the theme of
  // the land below.
  _flyUpdate(dt) {
    const f = this.flight, F = this.FLY;
    let ix = 0, iy = 0;
    if (f.keys.has('left')) ix -= 1;
    if (f.keys.has('right')) ix += 1;
    if (f.keys.has('up')) iy -= 1;
    if (f.keys.has('down')) iy += 1;
    if (!ix && !iy && f.pointer) {
      // Holding the pointer: head for the point under it.
      const dx = f.pointer.x - this.map.x - f.x, dy = f.pointer.y - this.map.y - (f.y - f.alt);
      if (Math.hypot(dx, dy) > 24) { ix = dx; iy = dy; }
    }
    const len = Math.hypot(ix, iy);
    if (len > 0) { ix /= len; iy /= len; }
    const k = Math.min(1, dt * F.ACCEL);
    f.vx += (ix * F.SPEED - f.vx) * k;
    f.vy += (iy * F.SPEED - f.vy) * k;
    f.x = Math.max(F.EDGE, Math.min(this._mapW - F.EDGE, f.x + f.vx * dt));
    f.y = Math.max(F.ALT + F.EDGE, Math.min(this._mapH - F.EDGE, f.y + f.vy * dt));
    if (Math.abs(f.vx) > 40) f.dir = f.vx > 0 ? 1 : -1;
    f.tilt = Math.max(-0.18, Math.min(0.18, (f.vy / F.SPEED) * 0.18)) * f.dir;
    this._placePlane();
    // The camera keeps the plane in the middle of the screen.
    const cy = (this._viewTop + PixiPremiumScene.footerY) / 2;
    this.camTarget = this._clampCam(f.x - Layout.W / 2, f.y - f.alt / 2 - cy);
    // Over another world's land for a moment: story mode takes on its theme.
    const w = this._worldAtMap(f);
    if (w && w !== this.here) {
      f.cross += dt;
      if (f.cross >= F.CROSS) { f.cross = 0; this._arrive(w); this._banner(w.name.toUpperCase()); }
    } else f.cross = 0;
  },

  // The plane comes down, the king hops out, and the plane flies off.
  _land() {
    const f = this.flight;
    if (!f || !f.ready || this.busy) return;
    this.busy = true;
    f.ready = false;
    f.keys.clear();
    f.pointer = null;
    this._showFlightHint(false);
    const F = this.FLY, size = f.size;
    const tl = this._flightTl = gsap.timeline({ onComplete: () => { this._flightTl = null; this._landed(f); } });
    const a = { v: f.alt }, t0 = f.tilt;
    tl.to(a, { v: F.LOW, duration: 0.55, ease: 'power2.inOut', onUpdate: () => { f.alt = a.v; f.tilt = t0 * (a.v - F.LOW) / Math.max(1, F.ALT - F.LOW); this._placePlane(); } });
    const k = { v: 0 };
    let sx = 0, sy = 0;
    tl.to(k, {
      v: 1, duration: 0.35, ease: 'none',
      onStart: () => { f.carrying = false; sx = this.token.x; sy = this.token.y; },
      onUpdate: () => {
        this.token.x = sx + (f.x - sx) * k.v;
        this.token.y = sy + (f.y - sy) * k.v - Math.sin(Math.PI * k.v) * 26;
        this.token.width = this.token.height = size * (0.72 + 0.28 * k.v);
      },
      onComplete: () => {
        this.token.x = f.x;
        this.token.y = this.token._baseY = f.y;
        this.token._hopping = false;
        this.tokenShadow.visible = true;
        this.tokenShadow.x = f.x;
        this.tokenShadow.y = f.y + 2;
      },
    });
    const o = { v: 0 };
    let ox = 0, oy = 0;
    tl.to(o, {
      v: 1, duration: 0.9, ease: 'power2.in',
      onStart: () => { ox = f.plane.x; oy = f.plane.y; },
      onUpdate: () => {
        f.plane.x = ox + f.dir * 900 * o.v;
        f.plane.y = oy - 320 * o.v;
        f.plane.rotation = -0.25 * f.dir * o.v;
        f.plane._prop.visible = Math.floor(performance.now() / 50) % 2 === 0;
        f.shadow.alpha = 1 - o.v;
      },
    });
  },

  // Down on the ground: remember the spot, and select a place landed next to.
  _landed(f) {
    if (!f.plane.destroyed) f.plane.destroy({ children: true });
    if (!f.shadow.destroyed) f.shadow.destroy();
    if (this.flight !== f) return;
    this.flight = null;
    this.busy = false;
    this._setMapPos(f);
    this._buildPlaneButton();
    const at = { x: f.x, y: f.y };
    const R = this.FLY.LAND_R;
    let best = null, bestD = R;
    for (const n of this.nodes) {
      const p = this._stopPos(n.world.stages[0]), d = Math.hypot(p.x - at.x, p.y - at.y);
      if (d < bestD) { best = { world: n.world }; bestD = d; }
    }
    for (const sp of this.specials || []) {
      const d = Math.hypot(sp.at.x - at.x, sp.at.y - at.y);
      if (d < bestD) { best = { special: sp }; bestD = d; }
    }
    if (best && best.world) this._tapWorld(best.world);
    else if (best && best.special) this._selectSpecial(best.special);
  },

  // The next world's plate lights up and its guardian steps out of shadow.
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
