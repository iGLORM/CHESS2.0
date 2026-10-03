// Story cutscenes: the world's painted scene behind a dialogue box, the
// speaker's portrait beside it, text typed out a letter at a time with the
// speaker's little "voice". Letterbox bars and a chapter card open the scene;
// pips under the box show how far through it you are. Click, Enter or Space
// finishes the line or moves on; Skip ends the scene.
// init({ scene, next, nextData }): plays STORY_SCENES[scene], marks it seen,
// then switches to `next`.
const StoryScene = {
  isPixiScreen: true,
  pixiContainer: null,

  L: {
    BOX_W: 1000,
    BOX_H: 142,
    BOX_BOTTOM: 58,       // gap under the dialogue box
    BAR_H: 40,            // letterbox bars
    MOTES: 36,
    PAD: 26,
    NAME_H: 40,
    PORTRAIT_W: 250,
    PORTRAIT_H: 320,
    PORTRAIT_GAP: 18,     // portrait bottom to the box top
    TYPE_SPEED: 75,       // letters per second
    VOICE_EVERY: 3,       // a voice blip every N letters
  },

  // The pitch (MIDI note) of each speaker's typing voice: small pieces high,
  // big villains low.
  VOICES: {
    pawnie: 76, sergeantsquare: 62, captaincapture: 67, joystick: 79, rulekeeper: 64, senseitactic: 58,
    bishbosh: 72, rokee: 53, knightsade: 50, queenie: 74, castle: 48, endgamer: 60, forkmaster: 57,
    checkmate: 45, grandmasterx: 43, firstpiece: 66,
  },

  // The chapter card shown as a scene opens: [kicker, title].
  _chapter(id) {
    const fixed = { prologue: ['Prologue', 'The Hollow Wakes'], handover: ['Chapter I', 'The Fragment'], ending: ['Finale', 'The Far Edge'] };
    if (fixed[id]) return fixed[id];
    if (id === 'arena_intro' || id === 'arena_won') return ['The Arena', id === 'arena_won' ? 'The Court Opens' : 'Three in a Row'];
    const road = /^road(won)?_(\w+)$/.exec(id || '');
    const rival = road && typeof SideContent !== 'undefined' && SideContent.rival(road[2]);
    if (rival) return [road[1] ? 'The Road Opens' : 'On the Road', rival.name];
    const stage = Number((id || '').replace('after', ''));
    const world = typeof WORLDS !== 'undefined' && WORLDS.find(w => w.stages.includes(stage + 1));
    if (!stage || !world) return null;
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'][stage - 6] || '';
    return [`Chapter ${roman}`, world.name];
  },

  init(data = {}) {
    this.sceneId = data.scene;
    this.scene = STORY_SCENES[data.scene] || { bg: 'pawnhollow', beats: [] };
    // Lines are typed out a letter at a time, so translate each whole line first.
    if (I18n.lang !== 'en') {
      this.scene = { ...this.scene, beats: (this.scene.beats || []).map(b => (b && b.text ? { ...b, text: I18n.display(b.text) } : b)) };
    }
    this.next = data.next || 'worldMap';
    this.nextData = data.nextData;
    this.index = -1;
    this.typed = 0;
    this.done = false;
    this.sides = {};      // speaker id -> 'left' | 'right'
    this.time = 0;
    this._temp = [];      // effect objects that fade when the next line starts

    this.pixiContainer = new PIXI.Container();
    PixiScreenManager.setScreenContainer(this.pixiContainer);
    this.bgLayer = new PIXI.Container();
    this.pixiContainer.addChild(this.bgLayer);
    this._setBackground(this.scene.bg, true);
    const shade = new PIXI.Graphics();
    for (let i = 0; i < 24; i++) {
      shade.rect(0, Layout.H * (0.45 + i * 0.023), Layout.W, Layout.H * 0.023 + 1).fill({ color: 0x000000, alpha: i * 0.028 });
    }
    this.pixiContainer.addChild(shade);
    this._buildMotes();
    this.portraitLayer = new PIXI.Container();
    this.fxLayer = new PIXI.Container();
    this.uiLayer = new PIXI.Container();
    this.pixiContainer.addChild(this.portraitLayer, this.fxLayer, this.uiLayer);
    this._buildLetterbox();
    this._buildBox();
    this._buildPips();
    this._chapterCard();

    const cols = ThemeManager.getCurrentColors();
    this.skipBtn = PixiPremiumScene.button(this.uiLayer, Layout.W - 150, 5, 124, 30, 'Skip', () => this._finish(), { icon: 'play', fontSize: 14 });
    this.hint = PixiPremiumScene.text('Click or press Enter', { fontSize: 14, fill: PixiPremiumScene.alpha(cols.text, '88') });
    this.hint.anchor.set(1, 1);
    this.uiLayer.addChild(this.hint);

    this.pixiContainer.eventMode = 'static';
    this.pixiContainer.hitArea = new PIXI.Rectangle(0, 0, Layout.W, Layout.H);
    this.pixiContainer.on('pointertap', () => this.advance());
    this.advance();
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
  },

  pixiUpdate(dt) {   // dt in seconds
    if (!this.pixiContainer) return;
    this.time += dt;
    const beat = this.scene.beats[this.index];
    const talking = beat && this.typed < beat.text.length;
    if (talking) {
      const before = Math.floor(this.typed);
      this.typed = Math.min(beat.text.length, this.typed + this.L.TYPE_SPEED * dt);
      const now = Math.floor(this.typed);
      if (now !== before) {
        this.text.text = beat.text.slice(0, now);
        this._voice(beat, before, now);
      }
    }
    this.arrow.visible = !!beat && this.typed >= beat.text.length && Math.sin(this.time * 6) > -0.3;
    this.arrow.y = this.arrowY + (Math.sin(this.time * 6) > 0 ? 2 : 0);
    // The speaker's card nods along while the line types.
    for (const p of this.portraitLayer.children) {
      p.pivot.y = talking && p._speaker === (beat && beat.who) && Math.floor(this.typed / 4) % 2 ? 3 : 0;
    }
    this._updateMotes(dt);
  },

  // A voice blip for each few letters typed (none for the narrator or on spaces).
  _voice(beat, from, to) {
    if (beat.who === 'narrator' || typeof audioManager === 'undefined' || !audioManager.playVoice) return;
    const every = this.L.VOICE_EVERY;
    if (Math.floor(to / every) === Math.floor(from / every)) return;
    const ch = beat.text[to - 1];
    if (!ch || !/[A-Za-z0-9]/.test(ch)) return;
    const base = this.VOICES[beat.who] || 64;
    const lift = ch === ch.toUpperCase() && /[A-Z]/.test(ch) ? 3 : 0;
    audioManager.playVoice(base + lift + [0, 2, -1, 4, 1][(to / every | 0) % 5]);
  },

  /* ------------------------------------------------------------------ */
  /*  Framing: letterbox, chapter card, motes, progress pips             */
  /* ------------------------------------------------------------------ */

  _buildLetterbox() {
    const h = this.L.BAR_H;
    const top = new PIXI.Graphics().rect(0, 0, Layout.W, h).fill(0x05030a).rect(0, h - 2, Layout.W, 2).fill({ color: 0xffffff, alpha: 0.06 });
    const bottom = new PIXI.Graphics().rect(0, Layout.H - h, Layout.W, h).fill(0x05030a).rect(0, Layout.H - h, Layout.W, 2).fill({ color: 0xffffff, alpha: 0.06 });
    this.uiLayer.addChild(top, bottom);
    gsap.from(top, { y: -h, duration: 0.6, ease: 'power2.out' });
    gsap.from(bottom, { y: h, duration: 0.6, ease: 'power2.out' });
  },

  _chapterCard() {
    const ch = this._chapter(this.sceneId);
    if (!ch) return;
    const cols = ThemeManager.getCurrentColors();
    const c = new PIXI.Container();
    c.x = Layout.cx;
    c.y = 118;
    const kicker = PixiPremiumScene.text(ch[0].toUpperCase(), { fontSize: 16, fontWeight: '900', fill: cols.accent, letterSpacing: 6 });
    kicker.anchor.set(0.5);
    const title = PixiPremiumScene.text(ch[1].toUpperCase(), {
      fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 40, fontWeight: 'bold', fill: '#fff4dc', letterSpacing: 3,
      stroke: { color: '#0a0610', width: 6 },
    });
    title.anchor.set(0.5);
    title.y = 38;
    const w = Math.max(title.width, 260) + 60;
    const rule = new PIXI.Graphics();
    for (const s of [-1, 1]) {
      rule.rect(s < 0 ? -w / 2 : w / 2 - 120, 68, 120, 2).fill({ color: PixiPremiumScene.color(cols.accent), alpha: 0.8 });
      rule.rect(s * (w / 2 - 128) - 4, 65, 8, 8).fill(PixiPremiumScene.color(cols.accent));
    }
    c.addChild(kicker, title, rule);
    c.alpha = 0;
    this.fxLayer.addChild(c);
    gsap.timeline({ onComplete: () => c.destroy({ children: true }) })
      .to(c, { alpha: 1, duration: 0.6, delay: 0.3 })
      .from(title.scale, { x: 1.25, y: 1.25, duration: 0.8, ease: 'power3.out' }, '<')
      .to(c, { alpha: 0, y: c.y - 16, duration: 0.8 }, '+=2.2');
  },

  // Specks of light drifting up through the scene (whole pixels, like the art).
  _buildMotes() {
    this.motes = [];
    const layer = new PIXI.Container();
    this.pixiContainer.addChild(layer);
    for (let i = 0; i < this.L.MOTES; i++) {
      const s = i % 5 === 0 ? 8 : 4;
      const m = new PIXI.Graphics().rect(0, 0, s, s).fill(i % 3 ? 0xfff0c8 : 0xffffff);
      m.x = ((i * 367) % Layout.W);
      m.y = ((i * 211) % Layout.H);
      m._vx = 6 + (i % 4) * 3;
      m._vy = -(10 + (i % 7) * 4);
      m._phase = i * 0.9;
      layer.addChild(m);
      this.motes.push(m);
    }
  },

  _updateMotes(dt) {
    for (const m of this.motes || []) {
      m.x += m._vx * dt;
      m.y += m._vy * dt;
      if (m.y < -10) { m.y = Layout.H + 10; m.x = (m.x + 431) % Layout.W; }
      if (m.x > Layout.W + 10) m.x = -10;
      m.alpha = 0.12 + 0.3 * Math.max(0, Math.sin(this.time * 1.3 + m._phase));
    }
  },

  // One pip per beat under the box; the current one is lit.
  _buildPips() {
    this.pips = new PIXI.Graphics();
    this.uiLayer.addChild(this.pips);
  },

  _drawPips() {
    const n = this.scene.beats.length;
    const cols = ThemeManager.getCurrentColors();
    const accent = PixiPremiumScene.color(cols.accent);
    const gap = 16;
    const x0 = Math.round(Layout.cx - ((n - 1) * gap) / 2), y = this.box.y + this.box.h + 12;
    this.pips.clear();
    for (let i = 0; i < n; i++) {
      const s = i === this.index ? 8 : 6;
      const x = x0 + i * gap - s / 2;
      if (i <= this.index) this.pips.rect(x, y - s / 2, s, s).fill({ color: accent, alpha: i === this.index ? 1 : 0.55 });
      else this.pips.rect(x, y - s / 2, s, s).stroke({ color: accent, width: 2, alpha: 0.4 });
    }
  },

  /* ------------------------------------------------------------------ */

  // The world's painted scene (fallback art until it has loaded), crossfading
  // over the previous one.
  _setBackground(themeId, instant) {
    const holder = new PIXI.Container();
    const fill = () => {
      if (holder.destroyed) return;
      holder.removeChildren().forEach(o => o.destroy({ children: true }));
      if (!PixiPremiumScene._paintedScene(holder, themeId)) {
        holder.addChild(PixiPremiumScene.image(PixiPremiumAssets.background(themeId), 0, 0, Layout.W, Layout.H));
      }
    };
    fill();
    if (!PixiBackgroundScene.ready(themeId) || !TextureManager.getBackgroundTexture(themeId)) {
      TextureManager.preloadTheme(themeId).then(fill);
    }
    const old = this.bgLayer.children.slice();
    this.bgLayer.addChild(holder);
    if (instant) return;
    holder.alpha = 0;
    gsap.to(holder, { alpha: 1, duration: 1.2, ease: 'power1.inOut', onComplete: () => old.forEach(o => o.destroy({ children: true })) });
  },

  _buildBox() {
    const L = this.L;
    const cols = ThemeManager.getCurrentColors();
    const w = Math.min(L.BOX_W, Layout.W - 60);
    const x = Math.round((Layout.W - w) / 2);
    const y = Layout.H - L.BOX_BOTTOM - L.BOX_H;
    this.box = { x, y, w, h: L.BOX_H };
    PixiPremiumScene.panel(this.uiLayer, x, y, w, L.BOX_H, { alpha: 0.94, accentAlpha: 0.8 });
    this.namePlate = new PIXI.Container();
    this.uiLayer.addChild(this.namePlate);
    this.text = PixiPremiumScene.text('', {
      fontSize: 22, fill: cols.text, lineHeight: 32, wordWrap: true, wordWrapWidth: w - L.PAD * 2,
    });
    this.text.__noI18n = true;   // lines are translated whole in init, then typed out
    this.text.x = x + L.PAD;
    this.text.y = y + L.PAD;
    this.uiLayer.addChild(this.text);
    this.arrow = new PIXI.Graphics().poly([0, 0, 16, 0, 8, 10]).fill(PixiPremiumScene.color(cols.accent));
    this.arrow.x = x + w - L.PAD - 16;
    this.arrow.y = this.arrowY = y + L.BOX_H - L.PAD;
    this.uiLayer.addChild(this.arrow);
  },

  _setName(speaker) {
    const L = this.L;
    const cols = ThemeManager.getCurrentColors();
    this.namePlate.removeChildren().forEach(c => c.destroy());
    if (!speaker.name) return;
    const tint = (speaker.colors && speaker.colors.primary) || cols.accent;
    const t = PixiPremiumScene.text(speaker.name.toUpperCase(), {
      fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 20, fontWeight: 'bold', fill: tint, letterSpacing: 1,
      stroke: { color: '#0a0610', width: 3 },
    });
    const w = t.width + 36;
    const side = this.sides[speaker.id] || 'left';
    const x = side === 'left' ? this.box.x + 20 : this.box.x + this.box.w - 20 - w;
    const y = this.box.y - L.NAME_H + 8;
    this.namePlate.addChild(new PIXI.Graphics()
      .roundRect(x, y, w, L.NAME_H, 8).fill({ color: PixiPremiumScene.color(cols.panel), alpha: 0.98 })
      .roundRect(x, y, w, L.NAME_H, 8).stroke({ color: PixiPremiumScene.color(tint), width: 2, alpha: 0.9 })
      .rect(x + 10, y + L.NAME_H - 8, 6, 6).fill(PixiPremiumScene.color(tint))
      .rect(x + w - 16, y + L.NAME_H - 8, 6, 6).fill(PixiPremiumScene.color(tint)));
    t.anchor.set(0.5, 0.5);
    t.x = x + w / 2;
    t.y = y + L.NAME_H / 2;
    this.namePlate.addChild(t);
  },

  // Portraits stand either side of the box; the one speaking is lit.
  _showPortrait(speaker) {
    const L = this.L;
    for (const p of this.portraitLayer.children) {
      if (p._speaker !== speaker.id) gsap.to(p, { alpha: 0.45, duration: 0.25 });
    }
    if (speaker.id === 'narrator') return;
    if (!this.sides[speaker.id]) {
      const used = Object.values(this.sides);
      this.sides[speaker.id] = used.includes('left') ? (used.includes('right') ? 'left' : 'right') : 'left';
      // A third speaker takes the old one's place.
      const old = this.portraitLayer.children.find(p => p._side === this.sides[speaker.id]);
      if (old) {
        delete this.sides[old._speaker];
        gsap.to(old, { alpha: 0, duration: 0.25, onComplete: () => old.destroy({ children: true }) });
      }
    }
    let p = this.portraitLayer.children.find(c => c._speaker === speaker.id);
    if (!p) {
      p = this._portrait(speaker);
      p._speaker = speaker.id;
      p._side = this.sides[speaker.id];
      const left = p._side === 'left';
      const baseX = left ? this.box.x + 10 : this.box.x + this.box.w - L.PORTRAIT_W - 10;
      p.x = baseX + (left ? -60 : 60);
      p.y = this.box.y - L.PORTRAIT_GAP - L.PORTRAIT_H - L.NAME_H;
      p.alpha = 0;
      this.portraitLayer.addChild(p);
      gsap.to(p, { x: baseX, alpha: 1, duration: 0.35, ease: 'power2.out' });
    } else {
      gsap.to(p, { alpha: 1, duration: 0.2 });
      gsap.fromTo(p, { y: p.y - 6 }, { y: p.y, duration: 0.25, ease: 'bounce.out' });
    }
  },

  // Characters with live art (src/themes/scenes/char_<id>.js) act out each line's mood.
  _setMood(speaker, mood) {
    const live = typeof LiveScenes !== 'undefined' && LiveScenes.character(speaker.id);
    if (live) LiveScenes.setMood(live, mood || LiveScenes.get(live).moods[0]);
  },

  _portrait(speaker) {
    const L = this.L;
    const c = new PIXI.Container();
    if (speaker.portrait) {
      const cols = ThemeManager.getCurrentColors();
      const live = typeof LiveScenes !== 'undefined' && LiveScenes.character(speaker.id);
      const card = (live && LiveScenes.sprite(live)) || new PIXI.Sprite(PixiPremiumAssets.character(speaker.id));
      card.width = L.PORTRAIT_W;
      card.height = L.PORTRAIT_H;
      if (live) {
        // Whole-pixel scale: 62x80 at 4x.
        card.width = LiveScenes.get(live).width * 4;
        card.x = Math.round((L.PORTRAIT_W - card.width) / 2);
      }
      c.addChild(this._frame(PixiPremiumScene.color(speaker.colors ? speaker.colors.primary : cols.accent), live ? card.width : L.PORTRAIT_W, card.x));
      c.addChild(card);
      c.addChild(this._frameCorners(PixiPremiumScene.color(speaker.colors ? speaker.colors.primary : cols.accent), live ? card.width : L.PORTRAIT_W, card.x));
    } else if (speaker.piece) {
      // Speakers without art stand as a big glowing piece.
      const glow = new PIXI.Graphics().circle(L.PORTRAIT_W / 2, L.PORTRAIT_H * 0.6, 110).fill({ color: 0xfff4c8, alpha: 0.18 })
        .circle(L.PORTRAIT_W / 2, L.PORTRAIT_H * 0.6, 70).fill({ color: 0xfff4c8, alpha: 0.18 });
      c.addChild(glow);
      gsap.to(glow, { alpha: 0.6, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      const piece = PixiPieceRenderer.createSprite(PixiPieceRenderer.withArt(store.get('theme')), 'white', speaker.piece);
      piece.anchor.set(0.5, 1);
      piece.width = piece.height = 200;
      piece.x = L.PORTRAIT_W / 2;
      piece.y = L.PORTRAIT_H - 10;
      c.addChild(piece);
    }
    return c;
  },

  // A pixel frame for a portrait card: drop shadow, dark mat, a double border in
  // the speaker's colour (the corner studs go on top, see _frameCorners).
  _frame(color, w, x0) {
    const h = this.L.PORTRAIT_H;
    return new PIXI.Graphics()
      .rect(x0 + 4, 10, w + 8, h + 8).fill({ color: 0x000000, alpha: 0.45 })
      .rect(x0 - 8, -8, w + 16, h + 16).fill(0x0a0610)
      .rect(x0 - 6, -6, w + 12, h + 12).fill(color)
      .rect(x0 - 3, -3, w + 6, h + 6).fill(0x0a0610);
  },

  _frameCorners(color, w, x0) {
    const h = this.L.PORTRAIT_H;
    const g = new PIXI.Graphics();
    for (const [x, y] of [[x0 - 10, -10], [x0 + w - 2, -10], [x0 - 10, h - 2], [x0 + w - 2, h - 2]]) {
      g.rect(x, y, 12, 12).fill(0x0a0610).rect(x + 2, y + 2, 8, 8).fill(color).rect(x + 2, y + 2, 4, 4).fill({ color: 0xffffff, alpha: 0.5 });
    }
    return g;
  },

  advance() {
    if (this.done) return;
    const beat = this.scene.beats[this.index];
    if (beat && this.typed < beat.text.length) {
      this.typed = beat.text.length;
      this.text.text = beat.text;
      return;
    }
    this.index++;
    const next = this.scene.beats[this.index];
    if (!next) { this._finish(); return; }
    const speaker = StoryScenes.speaker(next.who);
    this._showPortrait(speaker);
    this._setMood(speaker, next.mood);
    this._setName(speaker);
    this.text.style.fontStyle = next.who === 'narrator' ? 'italic' : 'normal';
    this.text.text = '';
    this.typed = 0;
    this.hint.x = this.box.x + this.box.w;
    this.hint.y = this.box.y - 12;
    this.hint.visible = this.index === 0;
    for (const o of this._temp) {
      gsap.killTweensOf(o);
      gsap.killTweensOf(o.scale);
      gsap.to(o, { alpha: 0, duration: 0.4, onComplete: () => { PixiShard.kill(o); o.destroy({ children: true }); } });
    }
    this._temp = [];
    if (next.bg) this._setBackground(next.bg);
    [].concat(next.fx || []).forEach(fx => this._fx(fx));
    this._drawPips();
  },

  _finish() {
    if (this.done) return;
    this.done = true;
    StoryScenes.markSeen(this.sceneId);
    audioManager.playButton();
    switchScreen(this.next, this.nextData);
  },

  handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') this.advance();
    else if (e.key === 'Escape') this._finish();
  },

  /* ------------------------------------------------------------------ */
  /*  Effects                                                            */
  /* ------------------------------------------------------------------ */

  _flash(color = 0xffffff, peak = 0.9, duration = 0.8) {
    const f = new PIXI.Graphics().rect(0, 0, Layout.W, Layout.H).fill(color);
    f.alpha = peak;
    this.fxLayer.addChild(f);
    gsap.to(f, { alpha: 0, duration, ease: 'power2.out', onComplete: () => f.destroy() });
  },

  _shake(strength = 10, duration = 0.4) {
    if (typeof Graphics !== 'undefined' && !Graphics.shake()) return;
    const c = this.pixiContainer;
    const t = { v: 0 };
    gsap.to(t, {
      v: 1, duration,
      onUpdate: () => { const k = strength * (1 - t.v); c.x = (Math.random() - 0.5) * k; c.y = (Math.random() - 0.5) * k; },
      onComplete: () => { c.x = 0; c.y = 0; },
    });
  },

  _fx(kind) {
    const cx = Layout.cx, cy = Math.round(this.box.y / 2);
    if (kind === 'crystal') {
      // Grandmaster X's crystal: a tall faceted gem, glowing.
      const c = new PIXI.Container();
      c.x = cx;
      c.y = cy + 10;
      const h = 150, w = 70;
      c.addChild(new PIXI.Graphics().circle(0, 0, 150).fill({ color: 0xd932ff, alpha: 0.12 }).circle(0, 0, 100).fill({ color: 0x00e5ff, alpha: 0.1 }));
      c.addChild(new PIXI.Graphics()
        .poly([0, -h, w, -h * 0.35, w * 0.8, h * 0.6, 0, h, -w * 0.8, h * 0.6, -w, -h * 0.35]).fill(0x2b0d36)
        .poly([0, -h, w, -h * 0.35, 0, -h * 0.1]).fill(0xd932ff)
        .poly([0, -h, 0, -h * 0.1, -w, -h * 0.35]).fill(0xf0a8ff)
        .poly([-w, -h * 0.35, 0, -h * 0.1, 0, h, -w * 0.8, h * 0.6]).fill(0x6a2a9a)
        .poly([w, -h * 0.35, w * 0.8, h * 0.6, 0, h, 0, -h * 0.1]).fill(0x3a1060)
        .poly([0, -h, w, -h * 0.35, w * 0.8, h * 0.6, 0, h, -w * 0.8, h * 0.6, -w, -h * 0.35]).stroke({ color: 0x00e5ff, width: 3, alpha: 0.8 }));
      this.fxLayer.addChild(c);
      gsap.to(c, { y: c.y - 8, duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      this._crystal = c;
    } else if (kind === 'fragment') {
      const gem = PixiShard.create(34, 'pawnhollow');
      gem.x = cx;
      gem.y = cy + 40;
      gem.alpha = 0;
      gem.scale.set(0.2);
      const halo = new PIXI.Graphics().circle(0, 0, 70).fill({ color: 0xffe08a, alpha: 0.22 }).circle(0, 0, 44).fill({ color: 0xffffff, alpha: 0.15 });
      halo.x = gem.x;
      halo.y = cy;
      halo.alpha = 0;
      this.fxLayer.addChild(halo, gem);
      gsap.timeline()
        .to(gem, { alpha: 1, y: cy, duration: 0.6, ease: 'back.out(2)' })
        .to(gem.scale, { x: 1, y: 1, duration: 0.6, ease: 'back.out(2)' }, '<')
        .to(halo, { alpha: 1, duration: 0.6 }, '<');
      gsap.to(gem, { rotation: 0.25, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.to(halo.scale, { x: 1.2, y: 1.2, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      audioManager.playCapture();
      this._temp.push(gem, halo);
    } else if (kind === 'crack') {
      const g = new PIXI.Graphics();
      const branches = 7;
      for (let b = 0; b < branches; b++) {
        let x = cx, y = cy;
        let a = (b / branches) * Math.PI * 2 + Math.random() * 0.4;
        g.moveTo(x, y);
        for (let k = 0; k < 7; k++) {
          a += (Math.random() - 0.5) * 0.9;
          x += Math.cos(a) * (30 + Math.random() * 40);
          y += Math.sin(a) * (30 + Math.random() * 40);
          g.lineTo(x, y);
        }
      }
      g.stroke({ color: 0xffffff, width: 3, alpha: 0.9 });
      g.alpha = 0;
      this.fxLayer.addChild(g);
      this._cracks = g;
      gsap.to(g, { alpha: 1, duration: 0.15, repeat: 3, yoyo: true, onComplete: () => { g.alpha = 1; } });
      this._shake(8, 0.5);
      audioManager.playCheck();
    } else if (kind === 'shatter') {
      for (const k of ['_cracks', '_crystal']) {
        if (this[k]) { gsap.killTweensOf(this[k]); this[k].destroy({ children: true }); this[k] = null; }
      }
      this._flash(0xffffff, 1, 1.2);
      this._shake(18, 0.7);
      for (let i = 0; i < 46; i++) {
        const s = 6 + Math.random() * 16;
        const shard = new PIXI.Graphics().poly([0, -s, s * 0.5, s * 0.3, -s * 0.4, s * 0.6])
          .fill({ color: [0xd932ff, 0x00e5ff, 0xf4f0e8][i % 3], alpha: 0.9 });
        shard.x = cx;
        shard.y = cy;
        this.fxLayer.addChild(shard);
        const a = Math.random() * Math.PI * 2, d = 200 + Math.random() * 500;
        gsap.to(shard, {
          x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d + 200, rotation: (Math.random() - 0.5) * 12, alpha: 0,
          duration: 1.4 + Math.random() * 0.8, ease: 'power2.out', onComplete: () => shard.destroy(),
        });
      }
      audioManager.playGameOver();
    } else if (kind === 'fragments') {
      // Ten shards fly in from the edges and form a ring, then fuse.
      const ring = new PIXI.Container();
      ring.x = cx;
      ring.y = cy;
      this.fxLayer.addChild(ring);
      for (let i = 0; i < 10; i++) {
        const gem = PixiShard.create(18, i === 0 ? 'pawnhollow' : WORLDS[i + 1].art);
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const from = a + Math.PI * 0.3;
        gem.x = Math.cos(from) * 900;
        gem.y = Math.sin(from) * 600;
        ring.addChild(gem);
        gsap.to(gem, { x: Math.cos(a) * 110, y: Math.sin(a) * 110, rotation: 3, duration: 1.1, delay: i * 0.12, ease: 'power3.out',
          onComplete: () => audioManager.playSelect() });
      }
      gsap.to(ring, { rotation: Math.PI * 2, duration: 2.6, delay: 1.3, ease: 'power2.in' });
      gsap.to(ring.scale, { x: 0.05, y: 0.05, duration: 0.6, delay: 3.3, ease: 'power3.in',
        onComplete: () => { this._flash(0xfff4c8, 0.9, 1); ring.children.forEach(g => { gsap.killTweensOf(g); PixiShard.kill(g); }); ring.destroy({ children: true }); } });
    } else if (kind === 'fuse') {
      // A golden board rises: squares light in a wave from the centre.
      const n = 8, sq = 34, size = n * sq;
      const board = new PIXI.Container();
      board.x = cx - size / 2;
      board.y = cy - size / 2 + 10;
      this.fxLayer.addChild(board);
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const tile = new PIXI.Graphics().rect(c * sq, r * sq, sq, sq).fill((r + c) % 2 ? 0x8a5a2c : 0xf4dca0);
          tile.alpha = 0;
          board.addChild(tile);
          const d = Math.hypot(r - 3.5, c - 3.5);
          gsap.to(tile, { alpha: 0.95, duration: 0.3, delay: 0.3 + d * 0.18 });
        }
      }
      board.addChild(new PIXI.Graphics().rect(-4, -4, size + 8, size + 8).stroke({ color: 0xffd060, width: 4 }));
      gsap.to(board, { y: board.y - 6, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    } else if (kind === 'title') {
      const t = PixiPremiumScene.text('GUARDIAN OF THE GREAT BOARD', {
        fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 44, fontWeight: 'bold', fill: '#ffe08a',
        stroke: { color: '#2a1a06', width: 6 }, letterSpacing: 2,
      });
      t.anchor.set(0.5);
      t.x = cx;
      t.y = 90;
      t.alpha = 0;
      t.scale.set(1.6);
      this.fxLayer.addChild(t);
      gsap.to(t, { alpha: 1, duration: 0.6 });
      gsap.to(t.scale, { x: 1, y: 1, duration: 0.8, ease: 'back.out(1.6)' });
      this._flash(0xffe08a, 0.5, 1);
      audioManager.playVictory();
    }
  },
};
