const PixiBackgroundRenderer = {
  container: null,
  bgSprite: null,
  _particleLayer: null,
  _ambientLayer: null,
  _vignetteLayer: null,
  _parallaxLayer: null,
  _glowLayer: null,
  _themeId: null,
  _tickerFn: null,
  _particles: [],
  _ambientElements: [],
  _parallaxLayers: [],
  _glowSources: [],
  _time: 0,

  init(parentStage) {
    this.container = new PIXI.Container();
    parentStage.addChildAt(this.container, 0);
  },

  render(themeId) {
    if (!this.container) return;
    this._cleanup();
    this._themeId = themeId;
    this._time = 0;
    this._particles = [];
    this._ambientElements = [];
    this._parallaxLayers = [];
    this._glowSources = [];

    const theme = ThemeManager.getTheme(themeId);
    const cols = theme.colors;

    // --- Background image or gradient ---
    const img = TextureManager.getBackgroundTexture(themeId);
    if (img) {
      this.bgSprite = PIXI.Sprite.from(img);
      this.bgSprite.width = 1280;
      this.bgSprite.height = 800;
      this.container.addChild(this.bgSprite);
    } else {
      this._renderGradientBg(cols);
    }

    // --- Parallax fog/mist layers ---
    this._parallaxLayer = new PIXI.Container();
    this.container.addChild(this._parallaxLayer);
    this._createParallaxLayers(cols);

    // --- Ambient particle layer ---
    this._ambientLayer = new PIXI.Container();
    this.container.addChild(this._ambientLayer);
    this._spawnThemeParticles(themeId, cols);

    // --- Pulsing glow sources ---
    this._glowLayer = new PIXI.Container();
    this.container.addChild(this._glowLayer);
    this._spawnGlowSources(cols);

    // --- Particle overlay layer ---
    this._particleLayer = new PIXI.Container();
    this.container.addChild(this._particleLayer);
    this._spawnFloatingParticles(cols);

    // --- Vignette overlay ---
    this._vignetteLayer = new PIXI.Graphics();
    this._drawVignette();
    this.container.addChild(this._vignetteLayer);

    // --- Animation ticker ---
    if (PixiApp.app) {
      this._tickerFn = (ticker) => this._animate(ticker.deltaTime / 60);
      PixiApp.app.ticker.add(this._tickerFn);
    }
  },

  _renderGradientBg(cols) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 800);
    const bg = cols.background || '#0a0a1a';
    const panel = cols.panel || '#141428';
    grad.addColorStop(0, bg);
    grad.addColorStop(0.5, panel);
    grad.addColorStop(1, PixiColorUtil.darken(bg, 20));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 800);
    const texture = PIXI.Texture.from({ resource: canvas, scaleMode: 'linear' });
    const sprite = new PIXI.Sprite(texture);
    sprite.width = 1280;
    sprite.height = 800;
    this.container.addChild(sprite);
  },

  // =============================================
  // PARALLAX FOG / MIST LAYERS
  // =============================================
  _createParallaxLayers(cols) {
    const panelColor = PixiColorUtil.hexToNum(cols.panel || '#141428');

    // Back fog layer: slow, leftward scroll
    const backFog = new PIXI.Graphics();
    backFog.rect(0, 0, 2560, 800).fill({ color: panelColor, alpha: 0.06 });
    // Add noise patches for texture
    for (let i = 0; i < 40; i++) {
      const nx = Math.random() * 2560;
      const ny = Math.random() * 800;
      const nw = Math.random() * 60 + 20;
      const nh = Math.random() * 30 + 10;
      backFog.rect(nx, ny, nw, nh).fill({ color: panelColor, alpha: 0.03 });
    }
    this._parallaxLayer.addChild(backFog);
    this._parallaxLayers.push({
      gfx: backFog,
      speed: -0.15, // leftward
      resetAt: -1280,
    });

    // Front mist layer: faster, rightward scroll
    const frontMist = new PIXI.Graphics();
    frontMist.rect(-1280, 0, 2560, 800).fill({ color: panelColor, alpha: 0.04 });
    for (let i = 0; i < 30; i++) {
      const nx = -1280 + Math.random() * 2560;
      const ny = Math.random() * 800;
      const nw = Math.random() * 80 + 30;
      const nh = Math.random() * 40 + 15;
      frontMist.rect(nx, ny, nw, nh).fill({ color: panelColor, alpha: 0.02 });
    }
    this._parallaxLayer.addChild(frontMist);
    this._parallaxLayers.push({
      gfx: frontMist,
      speed: 0.35, // rightward
      resetAt: 1280,
    });
  },

  // =============================================
  // PULSING GLOW SOURCES (all themes)
  // =============================================
  _spawnGlowSources(cols) {
    const accentNum = PixiColorUtil.hexToNum(cols.accent || '#ffffff');
    const count = 4;
    for (let i = 0; i < count; i++) {
      const g = new PIXI.Graphics();
      const radius = 40 + Math.random() * 40;
      g.circle(0, 0, radius).fill({ color: accentNum, alpha: 0.03 });
      g.circle(0, 0, radius * 0.6).fill({ color: accentNum, alpha: 0.02 });
      g.x = 100 + Math.random() * 1080;
      g.y = 100 + Math.random() * 600;
      this._glowLayer.addChild(g);
      this._glowSources.push({
        gfx: g,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.4, // 3-6 second cycle
        baseAlpha: 0.02 + Math.random() * 0.02,
      });
    }
  },

  _drawVignette() {
    const g = this._vignetteLayer;
    g.clear();
    // Top edge darkening
    for (let i = 0; i < 60; i++) {
      const a = (1 - i / 60) * 0.25;
      g.rect(0, i, 1280, 1).fill({ color: 0x000000, alpha: a });
    }
    // Bottom edge darkening
    for (let i = 0; i < 80; i++) {
      const a = (1 - i / 80) * 0.35;
      g.rect(0, 800 - i, 1280, 1).fill({ color: 0x000000, alpha: a });
    }
    // Left edge
    for (let i = 0; i < 40; i++) {
      const a = (1 - i / 40) * 0.15;
      g.rect(i, 0, 1, 800).fill({ color: 0x000000, alpha: a });
    }
    // Right edge
    for (let i = 0; i < 40; i++) {
      const a = (1 - i / 40) * 0.15;
      g.rect(1280 - i, 0, 1, 800).fill({ color: 0x000000, alpha: a });
    }
  },

  _spawnFloatingParticles(cols) {
    for (let i = 0; i < 70; i++) {
      const p = new PIXI.Graphics();
      const size = Math.random() * 2 + 0.5;
      p.rect(0, 0, size, size).fill({ color: 0xffffff, alpha: 0.3 });
      p.x = Math.random() * 1280;
      p.y = Math.random() * 800;
      this._particleLayer.addChild(p);
      this._particles.push({
        gfx: p, type: 'float',
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(Math.random() * 0.3 + 0.1),
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 2 + 1,
        baseAlpha: 0.15 + Math.random() * 0.35,
      });
    }
  },

  _spawnThemeParticles(themeId, cols) {
    const accentNum = PixiColorUtil.hexToNum(cols.accent);
    const id = themeId.toLowerCase();

    if (id === 'ocean' || id.includes('ocean')) {
      this._spawnBubbles(60);
      this._spawnLightRays(cols, 8);
    } else if (id === 'japanese' || id.includes('japan')) {
      this._spawnCherryBlossoms(50);
    } else if (id === 'crystal' || id.includes('crystal')) {
      this._spawnCrystalSparkles(70, cols);
    } else if (id === 'wildwest' || id.includes('west')) {
      this._spawnDustParticles(45, cols);
    } else if (id === 'space' || id.includes('space')) {
      this._spawnStarField(120, cols);
      this._spawnShootingStars(3);
    } else if (id === 'cyberpunk' || id.includes('cyber')) {
      this._spawnDataStreaks(30, cols);
    } else if (id === 'medieval' || id.includes('medieval')) {
      this._spawnMedievalEmbers(40, cols);
      this._spawnTorchGlows(3, cols);
    } else if (id === 'egypt' || id.includes('egypt')) {
      this._spawnSandParticles(50, cols);
      this._spawnHeatShimmer(3);
    } else if (id === 'steampunk' || id.includes('steampunk') || id.includes('steam')) {
      this._spawnSteamWisps(25, cols);
      this._spawnTinyGears(10, cols);
    } else if (id === 'prehistoric' || id.includes('prehistoric') || id.includes('dino')) {
      this._spawnFloatingSpores(40, cols);
      this._spawnMistBanks(4, cols);
    } else if (id === 'artdeco' || id.includes('artdeco') || id.includes('art_deco') || id.includes('deco')) {
      this._spawnArtDecoGeometrics(30, cols);
    } else {
      this._spawnGenericAmbient(40, cols);
    }
  },

  // =============================================
  // EXISTING THEME PARTICLES (with doubled counts)
  // =============================================

  _spawnBubbles(count) {
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const r = Math.random() * 4 + 1;
      p.circle(0, 0, r).fill({ color: 0xaaddff, alpha: 0.15 });
      p.circle(0, 0, r).stroke({ width: 0.5, color: 0xffffff, alpha: 0.2 });
      p.x = Math.random() * 1280;
      p.y = 800 + Math.random() * 200;
      this._ambientLayer.addChild(p);
      this._ambientElements.push({
        gfx: p, type: 'bubble',
        speed: Math.random() * 0.6 + 0.2,
        wobbleSpeed: Math.random() * 2 + 1,
        wobbleAmp: Math.random() * 15 + 5,
        phase: Math.random() * Math.PI * 2,
        baseX: p.x,
      });
    }
  },

  _spawnLightRays(cols, count) {
    for (let i = 0; i < count; i++) {
      const ray = new PIXI.Graphics();
      const x = Math.random() * 1280;
      const w = Math.random() * 40 + 20;
      ray.poly([x, 0, x + w, 0, x + w * 0.6, 800, x + w * 0.4, 800])
        .fill({ color: 0xffffff, alpha: 0.02 });
      this._ambientLayer.addChild(ray);
      this._ambientElements.push({
        gfx: ray, type: 'lightray',
        speed: Math.random() * 0.1 + 0.05,
        phase: Math.random() * Math.PI * 2,
        baseAlpha: 0.015 + Math.random() * 0.015,
      });
    }
  },

  _spawnCherryBlossoms(count) {
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const size = Math.random() * 3 + 2;
      p.circle(0, 0, size).fill({ color: 0xffaacc, alpha: 0.5 + Math.random() * 0.3 });
      p.circle(-size * 0.3, -size * 0.3, size * 0.6).fill({ color: 0xffccdd, alpha: 0.3 });
      p.x = Math.random() * 1400 - 100;
      p.y = -20 - Math.random() * 400;
      this._ambientLayer.addChild(p);
      this._ambientElements.push({
        gfx: p, type: 'blossom',
        vx: Math.random() * 0.4 + 0.2,
        vy: Math.random() * 0.5 + 0.3,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmp: Math.random() * 20 + 10,
        baseX: p.x,
      });
    }
  },

  _spawnCrystalSparkles(count, cols) {
    const accentNum = PixiColorUtil.hexToNum(cols.accent);
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const size = Math.random() * 2 + 1;
      p.star(0, 0, 4, size, size * 0.3).fill({ color: 0xffffff, alpha: 0.6 });
      p.x = Math.random() * 1280;
      p.y = Math.random() * 800;
      p.alpha = 0;
      this._ambientLayer.addChild(p);
      this._ambientElements.push({
        gfx: p, type: 'sparkle',
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 1.5 + 0.5,
        duration: Math.random() * 2 + 1,
      });
    }
  },

  _spawnDustParticles(count, cols) {
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const size = Math.random() * 2 + 1;
      p.rect(0, 0, size, size).fill({ color: 0xddbb88, alpha: 0.2 });
      p.x = -10 - Math.random() * 200;
      p.y = 300 + Math.random() * 400;
      this._ambientLayer.addChild(p);
      this._ambientElements.push({
        gfx: p, type: 'dust',
        vx: Math.random() * 0.8 + 0.3,
        vy: (Math.random() - 0.5) * 0.1,
        wobblePhase: Math.random() * Math.PI * 2,
      });
    }
  },

  _spawnStarField(count, cols) {
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const size = Math.random() * 2.5 + 0.5;
      const brightness = Math.random();
      const color = brightness > 0.7 ? 0xaaccff : (brightness > 0.4 ? 0xffffff : 0xffddaa);
      p.rect(0, 0, size, size).fill({ color, alpha: 0.6 });
      p.x = Math.random() * 1280;
      p.y = Math.random() * 800;
      this._ambientLayer.addChild(p);
      this._ambientElements.push({
        gfx: p, type: 'star',
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 3 + 0.5,
        baseAlpha: 0.3 + Math.random() * 0.6,
      });
    }
  },

  _spawnDataStreaks(count, cols) {
    const accentNum = PixiColorUtil.hexToNum(cols.accent);
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const len = Math.random() * 30 + 10;
      p.rect(0, 0, 1, len).fill({ color: accentNum, alpha: 0.3 });
      p.x = Math.random() * 1280;
      p.y = -len - Math.random() * 400;
      this._ambientLayer.addChild(p);
      this._ambientElements.push({
        gfx: p, type: 'streak',
        speed: Math.random() * 3 + 2,
        len: len,
      });
    }
  },

  _spawnGenericAmbient(count, cols) {
    const accentNum = PixiColorUtil.hexToNum(cols.accent);
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const size = Math.random() * 2 + 0.5;
      p.circle(0, 0, size).fill({ color: accentNum, alpha: 0.15 });
      p.x = Math.random() * 1280;
      p.y = Math.random() * 800;
      this._ambientLayer.addChild(p);
      this._ambientElements.push({
        gfx: p, type: 'ambient',
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
        baseAlpha: 0.1 + Math.random() * 0.2,
      });
    }
  },

  // =============================================
  // NEW THEME-SPECIFIC PARTICLES
  // =============================================

  // SHOOTING STARS (space theme)
  _spawnShootingStars(count) {
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      // Bright head pixel
      p.rect(0, 0, 2, 2).fill({ color: 0xffffff, alpha: 0.9 });
      // Trail
      for (let t = 1; t <= 6; t++) {
        p.rect(-t * 3, t * 2, 2, 1).fill({ color: 0xaaccff, alpha: 0.7 - t * 0.1 });
      }
      p.x = -50;
      p.y = -50;
      p.alpha = 0;
      this._ambientLayer.addChild(p);
      this._ambientElements.push({
        gfx: p, type: 'shootingstar',
        startX: 0, startY: 0,
        speed: 6 + Math.random() * 4,
        angle: Math.PI * 0.2 + Math.random() * 0.15, // roughly diagonal
        active: false,
        delay: Math.random() * 8, // initial random delay 0-8s
        timer: 0,
        traveled: 0,
        maxTravel: 400 + Math.random() * 300,
      });
    }
  },

  // MEDIEVAL: Floating embers
  _spawnMedievalEmbers(count, cols) {
    const colors = [0xff6622, 0xff4400, 0xffaa33, 0xff8811];
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const size = Math.random() * 1.5 + 0.5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      p.circle(0, 0, size).fill({ color, alpha: 0.5 + Math.random() * 0.3 });
      p.x = Math.random() * 1280;
      p.y = 600 + Math.random() * 200;
      this._ambientLayer.addChild(p);
      this._ambientElements.push({
        gfx: p, type: 'ember',
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(Math.random() * 0.5 + 0.2),
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmp: Math.random() * 10 + 5,
        baseX: p.x,
        baseAlpha: 0.4 + Math.random() * 0.4,
        flickerSpeed: Math.random() * 4 + 2,
      });
    }
  },

  // MEDIEVAL: Torch glow pulses
  _spawnTorchGlows(count, cols) {
    for (let i = 0; i < count; i++) {
      const g = new PIXI.Graphics();
      const radius = 50 + Math.random() * 30;
      g.circle(0, 0, radius).fill({ color: 0xff6622, alpha: 0.04 });
      g.circle(0, 0, radius * 0.5).fill({ color: 0xffaa44, alpha: 0.03 });
      g.x = 100 + Math.random() * 1080;
      g.y = 500 + Math.random() * 250;
      this._ambientLayer.addChild(g);
      this._ambientElements.push({
        gfx: g, type: 'torchglow',
        phase: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * 1.5,
        baseAlpha: 0.03 + Math.random() * 0.02,
      });
    }
  },

  // EGYPT: Sand particles drifting right
  _spawnSandParticles(count, cols) {
    const sandColors = [0xddbb66, 0xccaa55, 0xeedd88, 0xbbaa44];
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const size = Math.random() * 1.5 + 0.5;
      const color = sandColors[Math.floor(Math.random() * sandColors.length)];
      p.rect(0, 0, size, size).fill({ color, alpha: 0.25 });
      p.x = -10 - Math.random() * 300;
      p.y = Math.random() * 800;
      this._ambientLayer.addChild(p);
      this._ambientElements.push({
        gfx: p, type: 'sand',
        vx: Math.random() * 0.6 + 0.2,
        vy: (Math.random() - 0.5) * 0.15,
        wobblePhase: Math.random() * Math.PI * 2,
        baseAlpha: 0.15 + Math.random() * 0.15,
      });
    }
  },

  // EGYPT: Heat shimmer bands
  _spawnHeatShimmer(count) {
    for (let i = 0; i < count; i++) {
      const g = new PIXI.Graphics();
      const y = 200 + Math.random() * 400;
      g.rect(0, y, 1280, 3).fill({ color: 0xffffff, alpha: 0.015 });
      this._ambientLayer.addChild(g);
      this._ambientElements.push({
        gfx: g, type: 'heatshimmer',
        baseY: y,
        phase: Math.random() * Math.PI * 2,
        speed: 1.0 + Math.random() * 0.5,
        wobbleAmp: 2 + Math.random() * 2,
      });
    }
  },

  // STEAMPUNK: Steam wisps rising and expanding
  _spawnSteamWisps(count, cols) {
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const r = Math.random() * 4 + 2;
      p.circle(0, 0, r).fill({ color: 0xdddddd, alpha: 0.12 });
      p.x = Math.random() * 1280;
      p.y = 700 + Math.random() * 150;
      this._ambientLayer.addChild(p);
      this._ambientElements.push({
        gfx: p, type: 'steamwisp',
        vy: -(Math.random() * 0.4 + 0.2),
        vx: (Math.random() - 0.5) * 0.2,
        expandRate: 1 + Math.random() * 0.003,
        baseAlpha: 0.1 + Math.random() * 0.08,
        life: 0,
        maxLife: 300 + Math.random() * 200,
        startScale: 0.5 + Math.random() * 0.5,
      });
      p.scale.set(this._ambientElements[this._ambientElements.length - 1].startScale);
    }
  },

  // STEAMPUNK: Tiny rotating gear shapes (squares)
  _spawnTinyGears(count, cols) {
    const accentNum = PixiColorUtil.hexToNum(cols.accent || '#886644');
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const size = Math.random() * 3 + 2;
      p.rect(-size / 2, -size / 2, size, size).fill({ color: accentNum, alpha: 0.2 });
      // Cross shape for gear teeth
      p.rect(-size * 0.2, -size * 0.7, size * 0.4, size * 1.4).fill({ color: accentNum, alpha: 0.15 });
      p.rect(-size * 0.7, -size * 0.2, size * 1.4, size * 0.4).fill({ color: accentNum, alpha: 0.15 });
      p.x = Math.random() * 1280;
      p.y = Math.random() * 800;
      this._ambientLayer.addChild(p);
      this._ambientElements.push({
        gfx: p, type: 'gear',
        rotSpeed: (Math.random() - 0.5) * 0.03,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(Math.random() * 0.15 + 0.05),
        baseAlpha: 0.15 + Math.random() * 0.1,
      });
    }
  },

  // PREHISTORIC: Floating spores
  _spawnFloatingSpores(count, cols) {
    const sporeColors = [0xaacc44, 0xbbdd55, 0x99bb33, 0xccdd66];
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const r = Math.random() * 1.5 + 0.5;
      const color = sporeColors[Math.floor(Math.random() * sporeColors.length)];
      p.circle(0, 0, r).fill({ color, alpha: 0.25 + Math.random() * 0.2 });
      p.x = Math.random() * 1280;
      p.y = Math.random() * 800;
      this._ambientLayer.addChild(p);
      this._ambientElements.push({
        gfx: p, type: 'spore',
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.15,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmpX: Math.random() * 15 + 5,
        wobbleAmpY: Math.random() * 10 + 5,
        wobbleSpeed: Math.random() * 1.5 + 0.5,
        baseX: p.x,
        baseY: p.y,
        baseAlpha: 0.2 + Math.random() * 0.2,
      });
    }
  },

  // PREHISTORIC: Mist banks (large drifting ellipses)
  _spawnMistBanks(count, cols) {
    for (let i = 0; i < count; i++) {
      const g = new PIXI.Graphics();
      const rx = 80 + Math.random() * 120;
      const ry = 20 + Math.random() * 30;
      g.ellipse(0, 0, rx, ry).fill({ color: 0x99bb77, alpha: 0.04 });
      g.x = Math.random() * 1280;
      g.y = 400 + Math.random() * 350;
      this._ambientLayer.addChild(g);
      this._ambientElements.push({
        gfx: g, type: 'mistbank',
        vx: (Math.random() - 0.5) * 0.15,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.2 + Math.random() * 0.3,
        baseAlpha: 0.03 + Math.random() * 0.02,
      });
    }
  },

  // ART DECO: Geometric particles (diamonds and triangles)
  _spawnArtDecoGeometrics(count, cols) {
    const goldColor = 0xddaa44;
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const size = Math.random() * 3 + 2;
      const shape = Math.random() > 0.5 ? 'diamond' : 'triangle';
      if (shape === 'diamond') {
        p.poly([0, -size, size * 0.6, 0, 0, size, -size * 0.6, 0])
          .fill({ color: goldColor, alpha: 0.2 });
        p.poly([0, -size, size * 0.6, 0, 0, size, -size * 0.6, 0])
          .stroke({ width: 0.5, color: goldColor, alpha: 0.15 });
      } else {
        p.poly([0, -size, size * 0.7, size * 0.5, -size * 0.7, size * 0.5])
          .fill({ color: goldColor, alpha: 0.2 });
        p.poly([0, -size, size * 0.7, size * 0.5, -size * 0.7, size * 0.5])
          .stroke({ width: 0.5, color: goldColor, alpha: 0.15 });
      }
      p.x = Math.random() * 1280;
      p.y = Math.random() * 800;
      this._ambientLayer.addChild(p);
      this._ambientElements.push({
        gfx: p, type: 'artdeco',
        rotSpeed: (Math.random() - 0.5) * 0.01,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(Math.random() * 0.15 + 0.05),
        phase: Math.random() * Math.PI * 2,
        baseAlpha: 0.15 + Math.random() * 0.15,
      });
    }
  },

  // =============================================
  // ANIMATION
  // =============================================
  _animate(dt) {
    this._time += dt;

    // --- Parallax fog/mist layers ---
    for (const layer of this._parallaxLayers) {
      layer.gfx.x += layer.speed;
      if (layer.speed < 0 && layer.gfx.x <= layer.resetAt) {
        layer.gfx.x = 0;
      } else if (layer.speed > 0 && layer.gfx.x >= layer.resetAt) {
        layer.gfx.x = 0;
      }
    }

    // --- Pulsing glow sources ---
    for (const g of this._glowSources) {
      g.phase += dt * g.speed;
      g.gfx.alpha = g.baseAlpha * (0.5 + 0.5 * Math.sin(g.phase));
    }

    // --- Floating particles ---
    for (const p of this._particles) {
      p.gfx.x += p.vx;
      p.gfx.y += p.vy;
      p.twinkle += dt * p.twinkleSpeed;
      p.gfx.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(p.twinkle));
      if (p.gfx.y < -10) { p.gfx.y = 810; p.gfx.x = Math.random() * 1280; }
      if (p.gfx.x < -10) p.gfx.x = 1290;
      if (p.gfx.x > 1290) p.gfx.x = -10;
    }

    // --- Theme-specific ambient ---
    for (const e of this._ambientElements) {
      switch (e.type) {
        case 'bubble':
          e.gfx.y -= e.speed;
          e.phase += dt * e.wobbleSpeed;
          e.gfx.x = e.baseX + Math.sin(e.phase) * e.wobbleAmp;
          if (e.gfx.y < -20) {
            e.gfx.y = 820;
            e.baseX = Math.random() * 1280;
            e.gfx.x = e.baseX;
          }
          break;

        case 'lightray':
          e.phase += dt * e.speed;
          e.gfx.alpha = e.baseAlpha * (0.5 + 0.5 * Math.sin(e.phase));
          break;

        case 'blossom':
          e.gfx.x += e.vx;
          e.gfx.y += e.vy;
          e.gfx.rotation += e.rotSpeed;
          e.wobblePhase += dt;
          e.gfx.x = e.baseX + Math.sin(e.wobblePhase) * e.wobbleAmp;
          e.baseX += e.vx;
          if (e.gfx.y > 820 || e.gfx.x > 1400) {
            e.gfx.y = -20 - Math.random() * 100;
            e.baseX = Math.random() * 1400 - 100;
            e.gfx.x = e.baseX;
          }
          break;

        case 'sparkle':
          e.phase += dt * e.speed;
          const sparkleAlpha = Math.max(0, Math.sin(e.phase) * 0.8);
          e.gfx.alpha = sparkleAlpha;
          e.gfx.rotation += dt * 0.5;
          if (e.phase > Math.PI * 2) {
            e.phase = 0;
            e.gfx.x = Math.random() * 1280;
            e.gfx.y = Math.random() * 800;
          }
          break;

        case 'dust':
          e.gfx.x += e.vx;
          e.wobblePhase += dt;
          e.gfx.y += Math.sin(e.wobblePhase) * 0.2;
          if (e.gfx.x > 1300) {
            e.gfx.x = -10;
            e.gfx.y = 300 + Math.random() * 400;
          }
          break;

        case 'star':
          e.twinkle += dt * e.twinkleSpeed;
          e.gfx.alpha = e.baseAlpha * (0.4 + 0.6 * Math.sin(e.twinkle));
          break;

        case 'streak':
          e.gfx.y += e.speed;
          if (e.gfx.y > 820) {
            e.gfx.y = -e.len - Math.random() * 200;
            e.gfx.x = Math.random() * 1280;
          }
          break;

        case 'ambient':
          e.gfx.x += e.vx;
          e.gfx.y += e.vy;
          e.phase += dt;
          e.gfx.alpha = e.baseAlpha * (0.5 + 0.5 * Math.sin(e.phase));
          if (e.gfx.x < -20 || e.gfx.x > 1300) e.vx *= -1;
          if (e.gfx.y < -20 || e.gfx.y > 820) e.vy *= -1;
          break;

        // --- SHOOTING STARS ---
        case 'shootingstar':
          e.timer += dt;
          if (!e.active) {
            if (e.timer >= e.delay) {
              // Activate the shooting star
              e.active = true;
              e.timer = 0;
              e.traveled = 0;
              e.startX = Math.random() * 800;
              e.startY = Math.random() * 300;
              e.gfx.x = e.startX;
              e.gfx.y = e.startY;
              e.gfx.alpha = 0.9;
            }
          } else {
            const dx = Math.cos(e.angle) * e.speed;
            const dy = Math.sin(e.angle) * e.speed;
            e.gfx.x += dx;
            e.gfx.y += dy;
            e.traveled += e.speed;
            // Fade out as it travels
            e.gfx.alpha = Math.max(0, 0.9 * (1 - e.traveled / e.maxTravel));
            if (e.traveled >= e.maxTravel || e.gfx.x > 1400 || e.gfx.y > 900) {
              e.active = false;
              e.gfx.alpha = 0;
              e.delay = 3 + Math.random() * 5; // 3-8 second delay
              e.timer = 0;
            }
          }
          break;

        // --- MEDIEVAL EMBERS ---
        case 'ember':
          e.gfx.y += e.vy;
          e.wobblePhase += dt * 2;
          e.gfx.x = e.baseX + Math.sin(e.wobblePhase) * e.wobbleAmp;
          e.baseX += e.vx;
          // Flicker effect
          e.gfx.alpha = e.baseAlpha * (0.5 + 0.5 * Math.sin(this._time * e.flickerSpeed + e.wobblePhase));
          if (e.gfx.y < -20) {
            e.gfx.y = 650 + Math.random() * 200;
            e.baseX = Math.random() * 1280;
            e.gfx.x = e.baseX;
          }
          if (e.baseX < -20) e.baseX = 1300;
          if (e.baseX > 1300) e.baseX = -20;
          break;

        // --- MEDIEVAL TORCH GLOWS ---
        case 'torchglow':
          e.phase += dt * e.speed;
          e.gfx.alpha = e.baseAlpha * (0.6 + 0.4 * Math.sin(e.phase));
          // Slight scale pulse for warmth feel
          const tScale = 1.0 + 0.05 * Math.sin(e.phase * 0.7);
          e.gfx.scale.set(tScale);
          break;

        // --- EGYPT SAND ---
        case 'sand':
          e.gfx.x += e.vx;
          e.wobblePhase += dt * 1.5;
          e.gfx.y += Math.sin(e.wobblePhase) * 0.15;
          e.gfx.alpha = e.baseAlpha * (0.7 + 0.3 * Math.sin(e.wobblePhase));
          if (e.gfx.x > 1300) {
            e.gfx.x = -10;
            e.gfx.y = Math.random() * 800;
          }
          break;

        // --- EGYPT HEAT SHIMMER ---
        case 'heatshimmer':
          e.phase += dt * e.speed;
          e.gfx.y = e.baseY + Math.sin(e.phase) * e.wobbleAmp;
          e.gfx.alpha = 0.01 + 0.01 * Math.sin(e.phase * 0.5);
          break;

        // --- STEAMPUNK STEAM WISPS ---
        case 'steamwisp':
          e.gfx.y += e.vy;
          e.gfx.x += e.vx;
          e.life++;
          // Expand as it rises
          const scaleInc = e.expandRate;
          e.gfx.scale.x *= scaleInc;
          e.gfx.scale.y *= scaleInc;
          // Fade out as it rises
          const lifeRatio = e.life / e.maxLife;
          e.gfx.alpha = e.baseAlpha * (1 - lifeRatio);
          if (e.life >= e.maxLife || e.gfx.y < -50) {
            e.gfx.y = 700 + Math.random() * 150;
            e.gfx.x = Math.random() * 1280;
            e.life = 0;
            e.gfx.scale.set(e.startScale);
            e.gfx.alpha = e.baseAlpha;
          }
          break;

        // --- STEAMPUNK GEARS ---
        case 'gear':
          e.gfx.rotation += e.rotSpeed;
          e.gfx.x += e.vx;
          e.gfx.y += e.vy;
          if (e.gfx.y < -20) {
            e.gfx.y = 810;
            e.gfx.x = Math.random() * 1280;
          }
          if (e.gfx.x < -20 || e.gfx.x > 1300) e.vx *= -1;
          break;

        // --- PREHISTORIC SPORES ---
        case 'spore':
          e.wobblePhase += dt * e.wobbleSpeed;
          e.gfx.x = e.baseX + Math.sin(e.wobblePhase) * e.wobbleAmpX;
          e.gfx.y = e.baseY + Math.cos(e.wobblePhase * 0.7) * e.wobbleAmpY;
          e.baseX += e.vx;
          e.baseY += e.vy;
          e.gfx.alpha = e.baseAlpha * (0.6 + 0.4 * Math.sin(e.wobblePhase * 0.5));
          // Wrap around
          if (e.baseX < -30) e.baseX = 1310;
          if (e.baseX > 1310) e.baseX = -30;
          if (e.baseY < -30) e.baseY = 830;
          if (e.baseY > 830) e.baseY = -30;
          break;

        // --- PREHISTORIC MIST BANKS ---
        case 'mistbank':
          e.gfx.x += e.vx;
          e.phase += dt * e.pulseSpeed;
          e.gfx.alpha = e.baseAlpha * (0.6 + 0.4 * Math.sin(e.phase));
          if (e.gfx.x < -200) e.gfx.x = 1400;
          if (e.gfx.x > 1500) e.gfx.x = -200;
          break;

        // --- ART DECO GEOMETRICS ---
        case 'artdeco':
          e.gfx.rotation += e.rotSpeed;
          e.gfx.x += e.vx;
          e.gfx.y += e.vy;
          e.phase += dt;
          e.gfx.alpha = e.baseAlpha * (0.6 + 0.4 * Math.sin(e.phase));
          // Wrap around
          if (e.gfx.y < -20) {
            e.gfx.y = 810;
            e.gfx.x = Math.random() * 1280;
          }
          if (e.gfx.x < -20) e.gfx.x = 1300;
          if (e.gfx.x > 1300) e.gfx.x = -20;
          break;
      }
    }
  },

  _cleanup() {
    if (this._tickerFn && PixiApp.app) {
      PixiApp.app.ticker.remove(this._tickerFn);
      this._tickerFn = null;
    }
    if (this.container) {
      const removed = this.container.removeChildren();
      for (const child of removed) child.destroy({ children: true });
    }
    this._particles = [];
    this._ambientElements = [];
    this._parallaxLayers = [];
    this._glowSources = [];
    this._particleLayer = null;
    this._ambientLayer = null;
    this._vignetteLayer = null;
    this._parallaxLayer = null;
    this._glowLayer = null;
    this.bgSprite = null;
  },

  destroy() {
    this._cleanup();
    if (this.container) {
      this.container.destroy({ children: true });
      this.container = null;
    }
  },
};
