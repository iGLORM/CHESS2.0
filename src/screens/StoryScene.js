// Story cutscenes: the world's painted scene behind a dialogue box, the
// speaker's portrait beside it, text typed out a letter at a time. Click,
// Enter or Space finishes the line or moves on; Skip ends the scene.
// init({ scene, next, nextData }): plays STORY_SCENES[scene], marks it seen,
// then switches to `next`.
const StoryScene = {
  isPixiScreen: true,
  pixiContainer: null,

  L: {
    BOX_W: 1000,
    BOX_H: 170,
    BOX_BOTTOM: 44,       // gap under the dialogue box
    PAD: 30,
    NAME_H: 40,
    PORTRAIT_W: 250,
    PORTRAIT_H: 320,
    PORTRAIT_GAP: 18,     // portrait bottom to the box top
    TYPE_SPEED: 75,       // letters per second
  },

  init(data = {}) {
    this.sceneId = data.scene;
    this.scene = STORY_SCENES[data.scene] || { bg: 'pawnhollow', beats: [] };
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
    this.portraitLayer = new PIXI.Container();
    this.fxLayer = new PIXI.Container();
    this.uiLayer = new PIXI.Container();
    this.pixiContainer.addChild(this.portraitLayer, this.fxLayer, this.uiLayer);
    this._buildBox();

    const cols = ThemeManager.getCurrentColors();
    this.skipBtn = PixiPremiumScene.button(this.uiLayer, Layout.W - 176, 28, 148, 42, 'Skip', () => this._finish(), { icon: 'play', fontSize: 16 });
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
    if (beat && this.typed < beat.text.length) {
      const before = Math.floor(this.typed);
      this.typed = Math.min(beat.text.length, this.typed + this.L.TYPE_SPEED * dt);
      if (Math.floor(this.typed) !== before) this.text.text = beat.text.slice(0, Math.floor(this.typed));
    }
    this.arrow.visible = !!beat && this.typed >= beat.text.length && Math.sin(this.time * 6) > -0.3;
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
    this.text.x = x + L.PAD;
    this.text.y = y + L.PAD;
    this.uiLayer.addChild(this.text);
    this.arrow = new PIXI.Graphics().poly([0, 0, 16, 0, 8, 10]).fill(PixiPremiumScene.color(cols.accent));
    this.arrow.x = x + w - L.PAD - 16;
    this.arrow.y = y + L.BOX_H - L.PAD;
    this.uiLayer.addChild(this.arrow);
  },

  _setName(speaker) {
    const L = this.L;
    const cols = ThemeManager.getCurrentColors();
    this.namePlate.removeChildren().forEach(c => c.destroy());
    if (!speaker.name) return;
    const t = PixiPremiumScene.text(speaker.name.toUpperCase(), {
      fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 20, fontWeight: 'bold', fill: cols.accent, letterSpacing: 1,
    });
    const w = t.width + 36;
    const side = this.sides[speaker.id] || 'left';
    const x = side === 'left' ? this.box.x + 20 : this.box.x + this.box.w - 20 - w;
    const y = this.box.y - L.NAME_H + 8;
    this.namePlate.addChild(new PIXI.Graphics()
      .roundRect(x, y, w, L.NAME_H, 8).fill({ color: PixiPremiumScene.color(cols.panel), alpha: 0.98 })
      .roundRect(x, y, w, L.NAME_H, 8).stroke({ color: PixiPremiumScene.color(cols.accent), width: 2, alpha: 0.9 }));
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

  _portrait(speaker) {
    const L = this.L;
    const c = new PIXI.Container();
    if (speaker.portrait) {
      const cols = ThemeManager.getCurrentColors();
      const card = new PIXI.Sprite(PixiPremiumAssets.character(speaker.id));
      card.width = L.PORTRAIT_W;
      card.height = L.PORTRAIT_H;
      c.addChild(new PIXI.Graphics().roundRect(-4, -4, L.PORTRAIT_W + 8, L.PORTRAIT_H + 8, 10)
        .fill({ color: 0x000000, alpha: 0.5 })
        .roundRect(-4, -4, L.PORTRAIT_W + 8, L.PORTRAIT_H + 8, 10)
        .stroke({ color: PixiPremiumScene.color(speaker.colors ? speaker.colors.primary : cols.accent), width: 3, alpha: 0.9 }));
      c.addChild(card);
    } else if (speaker.piece) {
      // Speakers without art stand as a big glowing piece.
      const glow = new PIXI.Graphics().circle(L.PORTRAIT_W / 2, L.PORTRAIT_H * 0.6, 110).fill({ color: 0xfff4c8, alpha: 0.18 })
        .circle(L.PORTRAIT_W / 2, L.PORTRAIT_H * 0.6, 70).fill({ color: 0xfff4c8, alpha: 0.18 });
      c.addChild(glow);
      gsap.to(glow, { alpha: 0.6, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      const piece = PixiPieceRenderer.createSprite(store.get('theme'), 'white', speaker.piece);
      piece.anchor.set(0.5, 1);
      piece.width = piece.height = 200;
      piece.x = L.PORTRAIT_W / 2;
      piece.y = L.PORTRAIT_H - 10;
      c.addChild(piece);
    }
    return c;
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
