// The world map's hand-flown plane, kept apart so WorldMapScreen.js stays readable:
// summoning, steering (WASD / ZQSD / arrows / pointer), landing, the zone of opened
// lands it may fly over, and Pawnie's gift of the plane. Mixed into WorldMapScreen when this file loads (after
// WorldMapScreen.js in index.html), so `this` is the world map screen.
const WorldMapFlight = {
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
  _showFlightHint(on, text, color) {
    if (this.flightHint) { this.flightHint.destroy({ children: true }); this.flightHint = null; }
    if (!on) return;
    const c = new PIXI.Container();
    const t = PixiPremiumScene.text(text || 'WASD / ZQSD or arrows to fly  ·  hold the map to steer  ·  Space to land', { fontSize: 15, fontWeight: '800', fill: color || '#f3ead8' });
    PixiPremiumScene.fit(t, Layout.W - 80);
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
      this.token.x = f.plane.x + PixiPlane.SEAT.x * F.PS * f.dir;
      this.token.y = f.plane.y + PixiPlane.SEAT.y * F.PS;
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
    PixiPlane.ride(plane, this.map);
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
        this._showZone(true);
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
        const tx = plane.x + PixiPlane.SEAT.x * F.PS * f.dir, ty = plane.y + PixiPlane.SEAT.y * F.PS;
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
    const nx = Math.max(F.EDGE, Math.min(this._mapW - F.EDGE, f.x + f.vx * dt));
    const ny = Math.max(F.ALT + F.EDGE, Math.min(this._mapH - F.EDGE, f.y + f.vy * dt));
    // Only over the lands the story has opened (out of them, any way back in is fine).
    if (this._canFly(nx, ny) || !this._canFly(f.x, f.y)) { f.x = nx; f.y = ny; }
    else {
      if (this._canFly(nx, f.y)) { f.x = nx; f.vy *= 0.6; }
      else if (this._canFly(f.x, ny)) { f.y = ny; f.vx *= 0.6; }
      else { f.vx *= 0.3; f.vy *= 0.3; }
      this._bumpZone();
    }
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
    this._showZone(false);
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

  /* ------------------------------------------------------------------ */
  /*  Where the plane may fly                                            */
  /* ------------------------------------------------------------------ */

  // The plane flies over the lands the story has opened: the worlds you have reached,
  // the Bazaar's southern Africa, the Arena once it opens, the road walked so far, and
  // the next destination. A mask in scene pixels (1 = open).
  _buildFlyZone() {
    const def = this._def, W = def.width, H = def.height, S = this.L.S;
    const z = new Uint8Array(W * H);
    this.flyZone = z;
    if (this.zoneSprite) { this.zoneSprite.destroy({ texture: true }); this.zoneSprite = null; }
    if (this.save.completed) { z.fill(1); return; }
    const disc = (cx, cy, r) => {
      for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H - 1, Math.ceil(cy + r)); y++) {
        for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.ceil(cx + r)); x++) {
          if (Math.hypot(x - cx, y - cy) <= r) z[y * W + x] = 1;
        }
      }
    };
    const band = (a, b, r) => {
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (S * 4)));
      for (let i = 0; i <= n; i++) disc((a.x + (b.x - a.x) * i / n) / S, (a.y + (b.y - a.y) * i / n) / S, r);
    };
    for (const n of this.nodes) {
      if (n.state === 'locked') continue;
      const id = n.world.id, [x, y] = def.places[id];
      disc(x, y, id === 'soulboundpixel' ? 40 : (def.reach[id] !== undefined ? def.reach[id] : 78) + 10);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (def.shopLand(x, y)) z[y * W + x] = 1;
    disc(def.places.shop[0], def.places.shop[1], 30);
    if (typeof SideContent !== 'undefined' && SideContent.arenaUnlocked(this.save)) disc(def.places.arena[0], def.places.arena[1], 36);
    const frontier = Math.min(this.save.maxUnlockedLevel || 1, STORY_STAGES.length);
    const block = StoryProgress.roadBlock(this.save, frontier);
    const last = block ? Math.max(1, frontier - 1) : frontier;
    for (let i = 1; i <= this.stopIndex[last - 1]; i++) band(this.path[i - 1], this.path[i], 14);
    const dest = this._destination();
    if (dest) {
      disc(dest.x / S, dest.y / S, 30);
      if (block) band(this._stopPos(last), dest, 14);
    }
    const home = this._tokenHome();
    disc(home.x / S, home.y / S, 18);
  },

  _canFly(x, y) {
    const z = this.flyZone;
    if (!z) return true;
    const W = this._def.width, S = this.L.S;
    const xi = Math.floor(x / S), yi = Math.floor(y / S);
    return z[yi * W + xi] === 1;
  },

  // While flying, the lands not opened yet are shaded, edged with gold dots.
  _showZone(on) {
    if (on && !this.zoneSprite && this.flyZone && !this.save.completed && typeof document !== 'undefined') {
      const W = this._def.width, H = this._def.height, z = this.flyZone;
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d');
      const img = ctx.createImageData(W, H), d = img.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, o = i * 4;
        if (!z[i]) { d[o] = 10; d[o + 1] = 6; d[o + 2] = 20; d[o + 3] = 120; continue; }
        const edge = (x > 0 && !z[i - 1]) || (x < W - 1 && !z[i + 1]) || (y > 0 && !z[i - W]) || (y < H - 1 && !z[i + W]);
        if (edge && (x + y) % 3 === 0) { d[o] = 255; d[o + 1] = 214; d[o + 2] = 90; d[o + 3] = 220; }
      }
      ctx.putImageData(img, 0, 0);
      const sp = new PIXI.Sprite(PIXI.Texture.from({ resource: cv, scaleMode: 'nearest' }));
      sp.scale.set(this.L.S);
      sp.eventMode = 'none';
      sp.alpha = 0;
      this.map.addChildAt(sp, this.map.getChildIndex(this.mapScene) + 1);
      this.zoneSprite = sp;
    }
    if (!this.zoneSprite) return;
    gsap.killTweensOf(this.zoneSprite);
    gsap.to(this.zoneSprite, { alpha: on ? 0.8 : 0, duration: 0.4 });
  },

  // The plane meets the edge of the opened lands: the edge glows and the hint says why.
  _bumpZone() {
    if (this.zoneSprite) {
      gsap.killTweensOf(this.zoneSprite);
      this.zoneSprite.alpha = 1;
      gsap.to(this.zoneSprite, { alpha: 0.8, duration: 0.8 });
    }
    if (this._bumpAt !== undefined && this.time - this._bumpAt < 3) return;
    this._bumpAt = this.time;
    const d = this._destination();
    this._showFlightHint(true, d ? I18n.t('The story has not opened this land yet. Next stop: {0}', d.label) : 'The story has not opened this land yet.', '#ffd66a');
    gsap.delayedCall(3, () => { if (this.flight && this.flight.ready) this._showFlightHint(true); });
  },

  /* ------------------------------------------------------------------ */
  /*  Pawnie's gift: Grandpa's plane                                     */
  /* ------------------------------------------------------------------ */

  // A save past Pawnie with no plane is owed one (saves from before it was his gift).
  _owedPlane() {
    return !this._hasPlane() && StoryProgress.isBeaten(this.save, 1);
  },

  // The old hangar (the live scene plane_gift) and Pawnie handing you the plane; then
  // it takes off out of the picture, loops the loop and the plane is yours.
  _planeGift(done) {
    if (this._gift || !this.pixiContainer) return;
    this.busy = true;
    if (this._hidePanel) this._hidePanel();
    const W = Layout.W, H = Layout.H, portrait = H > W;
    const FT = PixiTextStyles.FONT_TITLE;
    const root = new PIXI.Container();
    root.eventMode = 'static';
    root.cursor = 'pointer';
    root.hitArea = new PIXI.Rectangle(0, 0, W, H);
    this.pixiContainer.addChild(root);
    const tweens = [];
    const T = (target, vars) => { const tw = gsap.to(target, vars); tweens.push(tw); return tw; };
    LiveScenes.setState('plane_gift', { gone: false });

    const dim = new PIXI.Graphics().rect(0, 0, W, H).fill({ color: 0x06040c, alpha: 0.88 });
    dim.alpha = 0;
    root.addChild(dim);
    T(dim, { alpha: 1, duration: 0.4 });

    // The picture in a gold frame.
    const below = portrait ? 430 : 250;
    const cw = Math.round(Math.min(W - 56, (H - below) * 1.6, 820)), ch = Math.round(cw * 200 / 320);
    const title = PixiPremiumScene.text('A gift from Pawnie'.toUpperCase(), { fontFamily: FT, fontSize: portrait ? 26 : 30, fill: '#ffe08a', stroke: { color: '#140e1a', width: 6 } });
    title.anchor.set(0.5, 0);
    PixiPremiumScene.fit(title, W - 40);
    title.x = W / 2;
    title.y = portrait ? 60 : 18;
    title.alpha = 0;
    root.addChild(title);
    T(title, { alpha: 1, duration: 0.5, delay: 0.3 });
    const card = new PIXI.Container();
    card.x = W / 2;
    card.y = title.y + title.height + 16 + ch / 2;
    const frame = new PIXI.Graphics()
      .rect(-cw / 2 - 12, -ch / 2 - 12, cw + 24, ch + 24).fill(0x140e1a)
      .rect(-cw / 2 - 8, -ch / 2 - 8, cw + 16, ch + 16).stroke({ color: 0xe0a830, width: 4 })
      .rect(-cw / 2 - 2, -ch / 2 - 2, cw + 4, ch + 4).stroke({ color: 0x6a4210, width: 2 });
    const scene = LiveScenes.sprite('plane_gift');
    if (scene) { scene.width = cw; scene.height = ch; scene.anchor.set(0.5); }
    card.addChild(frame);
    if (scene) card.addChild(scene);
    card.scale.set(0.6);
    card.alpha = 0;
    root.addChild(card);
    T(card, { alpha: 1, duration: 0.35 });
    T(card.scale, { x: 1, y: 1, duration: 0.6, ease: 'back.out(1.6)' });

    // Pawnie, and what he says in a comic bubble.
    const faceS = portrait ? 120 : 132;
    const rowY = card.y + ch / 2 + 24;
    const face = PixiPremiumAssets.characterSprite('pawnie');
    face.width = face.height = faceS;
    face.x = W / 2 - cw / 2;
    face.y = rowY;
    const faceBack = new PIXI.Graphics().rect(face.x - 4, face.y - 4, faceS + 8, faceS + 8).fill(0x140e1a)
      .rect(face.x - 4, face.y - 4, faceS + 8, faceS + 8).stroke({ color: 0xe0a830, width: 3 });
    const bx = face.x + faceS + 26, bw = W / 2 + cw / 2 - bx, bh = faceS;
    const bubble = new PIXI.Graphics()
      .roundRect(bx + 4, rowY + 4, bw, bh, 10).fill({ color: 0x000000, alpha: 0.4 })
      .poly([bx + 2, rowY + 30, bx - 18, rowY + 44, bx + 2, rowY + 56]).fill(0xfff4dc)
      .roundRect(bx, rowY, bw, bh, 10).fill(0xfff4dc)
      .roundRect(bx, rowY, bw, bh, 10).stroke({ color: 0x3a2418, width: 3 });
    const who = PixiPremiumScene.text('PAWNIE', { fontFamily: FT, fontSize: 15, fill: '#a8302e' });
    who.x = bx + 18; who.y = rowY + 10;
    const say = PixiPremiumScene.text('', { fontSize: portrait ? 17 : 19, fontWeight: '700', fill: '#2a1a20', wordWrap: true, wordWrapWidth: bw - 36, lineHeight: portrait ? 22 : 25 });
    say.x = bx + 18; say.y = rowY + 34;
    const next = PixiPremiumScene.text('Click to continue', { fontSize: 13, fontWeight: '800', fill: '#8a5a3a' });
    next.anchor.set(1, 1);
    next.x = bx + bw - 14; next.y = rowY + bh - 8;
    const talk = new PIXI.Container();
    talk.addChild(faceBack, face, bubble, who, say, next);
    talk.alpha = 0;
    root.addChild(talk);
    T(talk, { alpha: 1, duration: 0.4, delay: 0.5 });
    T(next, { alpha: 0.35, duration: 0.6, repeat: -1, yoyo: true });

    const LINES = [
      ['surprised', 'Wait! Before you go any further... come and see what Grandpa kept in the old hangar.'],
      ['happy', "His plane! She hasn't flown since the rifts opened. But the world stopped breaking when you landed, so maybe she can fly again."],
      ['happy', "She's yours now. She'll take you over every land you have opened, and on to the next stop. Follow the yellow marker!"],
    ];
    let step = -1, phase = 'talk';
    const line = (i) => {
      LiveScenes.setMood('char_pawnie', LINES[i][0]);
      say.text = LINES[i][1];
      say.alpha = 0;
      T(say, { alpha: 1, duration: 0.25 });
      if (audioManager.playSelect) audioManager.playSelect();
    };
    tweens.push(gsap.delayedCall(0.9, () => { if (step < 0) { step = 0; line(0); } }));

    // Up she goes: off the strip, out of the picture, a loop over the map, and away.
    const sparks = new PIXI.Container();
    root.addChild(sparks);
    const launch = () => {
      phase = 'fly';
      Wallet.givePlane();
      this.save = store.getActiveSave() || this.save;
      T(talk, { alpha: 0, duration: 0.3 });
      LiveScenes.setState('plane_gift', { gone: true });
      const k = cw / 320;
      const plane = this._makePlane();
      const PS = 1.9 * k;
      plane.scale.set(PS);
      const P0 = { x: card.x + (156 - 160) * k, y: card.y + (131 - 100) * k };   // where the plane stands in the picture
      plane.x = P0.x; plane.y = P0.y;
      root.addChild(plane);
      if (audioManager.playButton) audioManager.playButton();
      const A = { x: P0.x + 70 * k, y: P0.y };
      const R = Math.min(H * 0.2, 170);
      const C = { x: Math.min(W - R - 40, A.x + 130), y: Math.max(R + 30, A.y - 50 - R) };
      const E = { x: C.x, y: C.y + R };
      const X = { x: W + 260, y: -140 };
      const q = (a, c, b, t) => ({ x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y });
      const pos = (v) => {
        if (v < 0.18) { const t = v / 0.18; return { x: P0.x + (A.x - P0.x) * t * t, y: P0.y }; }
        if (v < 0.36) return q(A, { x: A.x + (E.x - A.x) * 0.55, y: A.y }, E, (v - 0.18) / 0.18);
        if (v < 0.8) { const th = Math.PI / 2 - ((v - 0.36) / 0.44) * Math.PI * 2; return { x: C.x + R * Math.cos(th), y: C.y + R * Math.sin(th) }; }
        return q(E, { x: E.x + 260, y: E.y }, X, (v - 0.8) / 0.2);
      };
      const f = { v: 0 };
      let last = P0, n = 0;
      tweens.push(gsap.to(f, {
        v: 1, duration: 4.2, ease: 'none',
        onUpdate: () => {
          const p = pos(f.v);
          plane.x = p.x; plane.y = p.y;
          // Smaller as she climbs away from the picture.
          plane.scale.set(PS * (1 - 0.45 * Math.min(1, Math.max(0, (f.v - 0.15) / 0.3))));
          const dx = p.x - last.x, dy = p.y - last.y;
          if (Math.hypot(dx, dy) > 0.5) plane.rotation = Math.atan2(dy, dx);
          plane._prop.visible = Math.floor(performance.now() / 50) % 2 === 0;
          last = p;
          // A trail of sparkles once she is off the ground.
          if (f.v > 0.2 && (n++ % 2 === 0)) {
            const tx = p.x - Math.cos(plane.rotation) * 26 * PS, ty = p.y - Math.sin(plane.rotation) * 26 * PS;
            const sz = [6, 8, 10][n % 3];
            const g = new PIXI.Graphics().rect(-sz / 2, -sz / 2, sz, sz).fill(n % 4 === 0 ? 0xffffff : n % 4 === 2 ? 0xffd23a : 0xf4f0e8);
            g.x = tx; g.y = ty;
            sparks.addChild(g);
            T(g, { alpha: 0, duration: 0.9, onComplete: () => g.destroy() });
            T(g.scale, { x: 0.2, y: 0.2, duration: 0.9 });
          }
        },
        onComplete: () => plane.destroy({ children: true }),
      }));
      // The title bursts in while she loops.
      tweens.push(gsap.delayedCall(1.6, () => {
        if (audioManager.playPromotion) audioManager.playPromotion();
        const big = PixiPremiumScene.text('The plane is yours!'.toUpperCase(), { fontFamily: FT, fontSize: portrait ? 34 : 46, fill: '#ffe08a', stroke: { color: '#140e1a', width: 8 } });
        big.anchor.set(0.5);
        PixiPremiumScene.fit(big, W - 40);
        big.x = W / 2; big.y = rowY + 26;
        const sub = PixiPremiumScene.text('Summon it on the world map and fly over every land you have opened.', { fontSize: portrait ? 16 : 19, fontWeight: '800', fill: '#f3ead8', wordWrap: true, wordWrapWidth: W - 80, align: 'center' });
        sub.anchor.set(0.5, 0);
        sub.x = W / 2; sub.y = big.y + big.height / 2 + 10;
        const cont = PixiPremiumScene.text('Click to continue', { fontSize: 14, fontWeight: '800', fill: '#c9b89a' });
        cont.anchor.set(0.5, 0);
        cont.x = W / 2; cont.y = sub.y + sub.height + 12;
        root.addChild(big, sub, cont);
        big.scale.set(0.2);
        T(big.scale, { x: 1, y: 1, duration: 0.6, ease: 'back.out(2.5)' });
        for (const t of [sub, cont]) { t.alpha = 0; T(t, { alpha: 1, duration: 0.4, delay: 0.4 }); }
        T(cont, { alpha: 0.4, duration: 0.6, delay: 1, repeat: -1, yoyo: true });
        tweens.push(gsap.delayedCall(0.8, () => { phase = 'done'; }));
      }));
    };

    let finished = false;
    const kill = () => {
      tweens.forEach(tw => tw.kill());
      if (!root.destroyed) root.destroy({ children: true });
      LiveScenes.setState('plane_gift', { gone: false });
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      phase = 'gone';
      T(root, {
        alpha: 0, duration: 0.35,
        onComplete: () => {
          kill();
          this._gift = null;
          this._buildPlaneButton();
          this._buildFlyZone();
          if (!this._eventPlaying) this.busy = false;
          if (done) done();
        },
      });
    };
    const advance = () => {
      if (phase === 'talk') {
        step++;
        if (step < LINES.length) line(step);
        else launch();
      } else if (phase === 'done') finish();
    };
    root.on('pointertap', advance);
    this._gift = { advance, kill };
  },
};

Object.assign(WorldMapScreen, WorldMapFlight);
