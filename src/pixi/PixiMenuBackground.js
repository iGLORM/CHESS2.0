const PixiMenuBackground = {
  container: null,
  particles: [],
  stars: [],
  shootingStars: [],
  petals: [],
  bubbles: [],
  embers: [],
  initialized: false,
  themeId: null,
  _tickerFn: null,
  _shootingStarTimer: 0,
  _petalTimer: 0,
  _bubbleTimer: 0,
  _emberTimer: 0,

  init() {
    if (!PixiApp.app || !PixiApp.stage) return;
    this.destroy();

    this.container = new PIXI.Container();
    PixiApp.stage.addChildAt(this.container, 0);

    const theme = ThemeManager.getTheme(store.get('theme') || 'space');
    this.themeId = theme.id;
    this.colors = theme.colors;

    this._initForTheme(theme);

    this._tickerFn = (delta) => this._update(delta);
    PixiApp.app.ticker.add(this._tickerFn);
    this.initialized = true;
  },

  _initForTheme(theme) {
    this.particles = [];
    this.stars = [];
    this.shootingStars = [];
    this.petals = [];
    this.bubbles = [];
    this.embers = [];

    const id = theme.id;

    // --- Space / default: stars + floating particles + shooting stars ---
    if (id === 'space' || id === 'cyberpunk' || id === 'artdeco') {
      for (let i = 0; i < 60; i++) {
        const s = this._createStar();
        this.stars.push(s);
        this.container.addChild(s.sprite);
      }
      for (let i = 0; i < 30; i++) {
        const p = this._createParticle();
        this.particles.push(p);
        this.container.addChild(p.sprite);
      }
    }

    // --- Ocean: bubbles + light rays ---
    if (id === 'ocean') {
      for (let i = 0; i < 40; i++) {
        const b = this._createBubble();
        this.bubbles.push(b);
        this.container.addChild(b.sprite);
      }
      for (let i = 0; i < 20; i++) {
        const p = this._createParticle();
        this.particles.push(p);
        this.container.addChild(p.sprite);
      }
    }

    // --- Japanese: sakura petals ---
    if (id === 'japanese') {
      for (let i = 0; i < 35; i++) {
        const p = this._createPetal();
        this.petals.push(p);
        this.container.addChild(p.sprite);
      }
    }

    // --- Medieval / wildwest / egyptian: embers / dust ---
    if (id === 'medieval' || id === 'wildwest' || id === 'egypt' || id === 'prehistoric' || id === 'steampunk') {
      for (let i = 0; i < 45; i++) {
        const e = this._createEmber();
        this.embers.push(e);
        this.container.addChild(e.sprite);
      }
      for (let i = 0; i < 20; i++) {
        const p = this._createParticle();
        this.particles.push(p);
        this.container.addChild(p.sprite);
      }
    }

    // --- Crystal: floating crystal shards ---
    if (id === 'crystal') {
      for (let i = 0; i < 40; i++) {
        const p = this._createCrystalShard();
        this.particles.push(p);
        this.container.addChild(p.sprite);
      }
    }

    // --- Custom / fallback: generic particles ---
    if (this.particles.length === 0 && this.stars.length === 0 && this.petals.length === 0 && this.bubbles.length === 0 && this.embers.length === 0) {
      for (let i = 0; i < 40; i++) {
        const p = this._createParticle();
        this.particles.push(p);
        this.container.addChild(p.sprite);
      }
    }
  },

  _createStar() {
    const sprite = new PIXI.Graphics();
    const size = 1 + Math.random() * 2;
    sprite.rect(-size / 2, -size / 2, size, size).fill({ color: 0xffffff, alpha: 0.8 });
    return {
      sprite,
      x: Math.random() * Layout.W,
      y: Math.random() * Layout.H,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 1 + Math.random() * 2,
      baseAlpha: 0.3 + Math.random() * 0.5,
    };
  },

  _createParticle() {
    const sprite = new PIXI.Graphics();
    const size = 2 + Math.random() * 4;
    const isAccent = Math.random() > 0.5;
    const hex = isAccent ? this.colors.accent : '#ffffff';
    const color = parseInt(hex.replace('#', '0x'), 16);

    sprite.rect(-size / 2, -size / 2, size, size).fill({ color, alpha: 0.5 });

    return {
      sprite,
      x: Math.random() * Layout.W,
      y: Math.random() * Layout.H,
      vx: (Math.random() - 0.5) * 15,
      vy: -8 - Math.random() * 25,
      baseAlpha: 0.2 + Math.random() * 0.5,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.5 + Math.random() * 1.5,
    };
  },

  _createShootingStar() {
    const sprite = new PIXI.Graphics();
    sprite.rect(0, -1, 30, 2).fill({ color: 0xffffff, alpha: 0.9 });
    sprite.alpha = 0;
    return {
      sprite,
      x: Math.random() * Layout.W,
      y: Math.random() * 400,
      vx: 200 + Math.random() * 300,
      vy: 50 + Math.random() * 100,
      life: 0,
      maxLife: 0.6 + Math.random() * 0.4,
      active: false,
    };
  },

  _createPetal() {
    const sprite = new PIXI.Graphics();
    const w = 4 + Math.random() * 4;
    const h = 3 + Math.random() * 3;
    const pink = Math.random() > 0.5 ? 0xffb7c5 : 0xffc0cb;
    sprite.ellipse(0, 0, w / 2, h / 2).fill({ color: pink, alpha: 0.7 });
    return {
      sprite,
      x: Math.random() * Layout.W,
      y: -20 - Math.random() * 100,
      vx: 10 + Math.random() * 30,
      vy: 15 + Math.random() * 25,
      rotSpeed: (Math.random() - 0.5) * 3,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.5 + Math.random() * 1,
    };
  },

  _createBubble() {
    const sprite = new PIXI.Graphics();
    const r = 2 + Math.random() * 5;
    sprite.circle(0, 0, r)
      .fill({ color: 0xaaddff, alpha: 0.1 })
      .stroke({ width: 1, color: 0xaaddff, alpha: 0.4 });
    return {
      sprite,
      x: Math.random() * Layout.W,
      y: 810 + Math.random() * 100,
      vx: (Math.random() - 0.5) * 10,
      vy: -(20 + Math.random() * 40),
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 1 + Math.random() * 2,
    };
  },

  _createEmber() {
    const sprite = new PIXI.Graphics();
    const size = 1.5 + Math.random() * 2.5;
    const warm = Math.random() > 0.5 ? 0xff6644 : 0xffaa33;
    sprite.rect(-size / 2, -size / 2, size, size).fill({ color: warm, alpha: 0.7 });
    return {
      sprite,
      x: Math.random() * Layout.W,
      y: 810 + Math.random() * 50,
      vx: (Math.random() - 0.5) * 15,
      vy: -(15 + Math.random() * 35),
      flicker: Math.random() * Math.PI * 2,
      flickerSpeed: 2 + Math.random() * 3,
    };
  },

  _createCrystalShard() {
    const sprite = new PIXI.Graphics();
    const size = 2 + Math.random() * 3;
    const cyan = Math.random() > 0.5 ? 0x44ffff : 0x88ccff;
    sprite.rect(-size / 2, -size / 2, size, size).fill({ color: cyan, alpha: 0.5 });
    return {
      sprite,
      x: Math.random() * Layout.W,
      y: Math.random() * Layout.H,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      baseAlpha: 0.3 + Math.random() * 0.5,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.5 + Math.random() * 1.5,
    };
  },

  _update(delta) {
    const dt = delta / 60;

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.pulse += p.pulseSpeed * dt;
      p.sprite.x = p.x;
      p.sprite.y = p.y;
      p.sprite.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(p.pulse));
      if (p.y < -20) { p.y = 820; p.x = Math.random() * Layout.W; }
      if (p.x < -20) p.x = 1300;
      if (p.x > 1300) p.x = -20;
    }

    for (const s of this.stars) {
      s.twinkle += s.twinkleSpeed * dt;
      s.sprite.alpha = s.baseAlpha * (0.5 + 0.5 * Math.sin(s.twinkle));
    }

    // Shooting stars (space themes)
    if (this.stars.length > 0) {
      this._shootingStarTimer += dt;
      if (this._shootingStarTimer > 2 + Math.random() * 4) {
        this._shootingStarTimer = 0;
        const ss = this._createShootingStar();
        this.shootingStars.push(ss);
        this.container.addChild(ss.sprite);
      }
    }
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const ss = this.shootingStars[i];
      if (!ss.active) {
        ss.active = true;
        ss.sprite.alpha = 1;
        ss.sprite.rotation = Math.atan2(ss.vy, ss.vx);
      }
      ss.x += ss.vx * dt;
      ss.y += ss.vy * dt;
      ss.life += dt;
      ss.sprite.x = ss.x;
      ss.sprite.y = ss.y;
      ss.sprite.alpha = Math.max(0, 1 - ss.life / ss.maxLife);
      if (ss.life >= ss.maxLife) {
        this.container.removeChild(ss.sprite);
        ss.sprite.destroy();
        this.shootingStars.splice(i, 1);
      }
    }

    // Sakura petals
    for (const p of this.petals) {
      p.sway += p.swaySpeed * dt;
      p.x += p.vx * dt + Math.sin(p.sway) * 20 * dt;
      p.y += p.vy * dt;
      p.sprite.x = p.x;
      p.sprite.y = p.y;
      p.sprite.rotation += p.rotSpeed * dt;
      if (p.y > 820) { p.y = -20; p.x = Math.random() * Layout.W; }
    }

    // Bubbles
    for (const b of this.bubbles) {
      b.wobble += b.wobbleSpeed * dt;
      b.x += b.vx * dt + Math.sin(b.wobble) * 8 * dt;
      b.y += b.vy * dt;
      b.sprite.x = b.x;
      b.sprite.y = b.y;
      if (b.y < -20) { b.y = 820; b.x = Math.random() * Layout.W; }
    }

    // Embers
    for (const e of this.embers) {
      e.flicker += e.flickerSpeed * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.sprite.x = e.x;
      e.sprite.y = e.y;
      e.sprite.alpha = 0.5 + 0.5 * Math.sin(e.flicker);
      if (e.y < -20) { e.y = 820; e.x = Math.random() * Layout.W; }
    }

    // Theme change detection
    const currentTheme = store.get('theme') || 'space';
    if (this.themeId !== currentTheme) {
      this.destroy();
      this.init();
    }
  },

  destroy() {
    if (PixiApp.app && PixiApp.app.ticker && this._tickerFn) {
      PixiApp.app.ticker.remove(this._tickerFn);
      this._tickerFn = null;
    }
    if (this.container) {
      this.container.removeChildren();
      if (this.container.parent) {
        this.container.parent.removeChild(this.container);
      }
      this.container.destroy({ children: true });
      this.container = null;
    }
    this.particles = [];
    this.stars = [];
    this.shootingStars = [];
    this.petals = [];
    this.bubbles = [];
    this.embers = [];
    this.initialized = false;
  },
};
