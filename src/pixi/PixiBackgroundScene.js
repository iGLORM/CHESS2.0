// Gentle motion for the painted backgrounds: swaying trees, drifting clouds
// and sand, turning gears, flickering lights (layers made by
// scripts/generate_backgrounds.py), and ripples on regions of the
// hand-painted scenes. Layout comes from BACKGROUND_SCENES.
const PixiBackgroundScene = {
  ART_W: 640,
  ART_H: 400,
  _textures: {},
  _noiseTexture: null,

  path(file) {
    return `../assets/textures/backgrounds/${file}`;
  },

  // A theme with a live scene (src/themes/scenes/) is drawn in code, not from layers.
  isLive(themeId) {
    return typeof LiveScenes !== 'undefined' && LiveScenes.has(themeId);
  },

  // Kept backdrops reuse the animated effects of the art they came from.
  ALIASES: { crystal_classic: 'crystal' },

  _scene(id) {
    return typeof BACKGROUND_SCENES !== 'undefined' && (BACKGROUND_SCENES[id] || BACKGROUND_SCENES[this.ALIASES[id]]);
  },

  files(themeId) {
    if (this.isLive(themeId)) return [];
    const scene = this._scene(themeId);
    return scene && scene.layers ? scene.layers.map(l => this.path(l.file)) : [];
  },

  ready(themeId) {
    return this.files(themeId).every(f => TextureManager.getImage(f));
  },

  load(themeId) {
    return Promise.all(this.files(themeId).map(f => TextureManager.loadImage(f)));
  },

  _texture(file, scaleMode = 'nearest') {
    const key = file + '|' + scaleMode;
    const img = TextureManager.getImage(this.path(file));
    if (!img) return null;
    const cached = this._textures[key];
    if (cached && cached.source && cached.source.resource === img && !cached.destroyed) return cached;
    const tex = PIXI.Texture.from({ resource: img, scaleMode });
    this._textures[key] = tex;
    return tex;
  },

  // Tileable displacement map: sums of sines with whole periods.
  _noise() {
    if (this._noiseTexture) return this._noiseTexture;
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const data = ctx.createImageData(size, size);
    const TAU = Math.PI * 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        const r = Math.sin(TAU * (u * 2 + v)) * 0.6 + Math.sin(TAU * (u * 3 - v * 2) + 1.7) * 0.4;
        const g = Math.sin(TAU * (v * 2 - u)) * 0.6 + Math.sin(TAU * (v * 3 + u * 2) + 0.4) * 0.4;
        const i = (y * size + x) * 4;
        data.data[i] = 128 + r * 110;
        data.data[i + 1] = 128 + g * 110;
        data.data[i + 2] = 128;
        data.data[i + 3] = 255;
      }
    }
    ctx.putImageData(data, 0, 0);
    this._noiseTexture = PIXI.Texture.from({ resource: canvas, scaleMode: 'linear', addressMode: 'repeat' });
    return this._noiseTexture;
  },

  // Builds the scene into `parent`. Returns update(time, dt) or null.
  build(themeId, parent, bgTexture) {
    if (this.isLive(themeId)) {
      // Covers the painted still, which stays underneath as the loading picture.
      const tick = LiveScenes.addTo(themeId, parent, Layout.W, Layout.H);
      if (tick) return () => tick();
    }
    const scene = this._scene(themeId);
    if (!scene) return null;
    const sx = Layout.W / this.ART_W;
    const sy = Layout.H / this.ART_H;
    const updates = [];
    for (const layer of scene.layers || []) {
      const u = this._layer(layer, parent, sx, sy);
      if (u) updates.push(u);
    }
    for (const effect of scene.effects || []) {
      const u = this._effect(effect, parent, bgTexture);
      if (u) updates.push(u);
    }
    return (t, dt) => { for (const u of updates) u(t, dt); };
  },

  _layer(layer, parent, sx, sy) {
    const m = layer.motion || { type: 'static' };
    const tex = this._texture(layer.file, m.type === 'spin' ? 'linear' : 'nearest');
    if (!tex) return null;
    const TAU = Math.PI * 2;
    const wave = (t, period, phase = 0) => Math.sin(TAU * t / (period || 4) + phase);

    if (m.type === 'drift') {
      const tile = new PIXI.TilingSprite({ texture: tex, width: Layout.W, height: layer.h * sy });
      tile.tileScale.set(sx, sy);
      tile.y = layer.y * sy;
      parent.addChild(tile);
      return (t, dt) => { tile.tilePosition.x += m.speed * sx * dt; };
    }

    const sprite = new PIXI.Sprite(tex);
    sprite.scale.set(sx, sy);
    sprite.x = layer.x * sx;
    sprite.y = layer.y * sy;
    parent.addChild(sprite);

    switch (m.type) {
      case 'sway': {
        // Bend from the base, with a slower gust on top of the sway.
        sprite.pivot.set(m.pivot[0], m.pivot[1]);
        sprite.x = (layer.x + m.pivot[0]) * sx;
        sprite.y = (layer.y + m.pivot[1]) * sy;
        const phase = m.phase || 0;
        return (t) => {
          sprite.skew.x = m.amount * (0.7 * wave(t, m.period, phase) + 0.3 * wave(t, m.period * 2.7, phase + 1));
        };
      }
      case 'spin': {
        sprite.pivot.set(m.center[0], m.center[1]);
        sprite.x = (layer.x + m.center[0]) * sx;
        sprite.y = (layer.y + m.center[1]) * sy;
        if (m.clip) {
          const mask = new PIXI.Graphics()
            .rect(m.clip[0] * sx, m.clip[1] * sy, (m.clip[2] - m.clip[0]) * sx, (m.clip[3] - m.clip[1]) * sy)
            .fill(0xffffff);
          parent.addChild(mask);
          sprite.mask = mask;
        }
        return (t, dt) => { sprite.rotation += m.speed * dt; };
      }
      case 'pulse':
        return (t) => {
          sprite.alpha = m.min + (m.max - m.min) * (0.5 + 0.5 * wave(t, m.period, m.phase || 0));
        };
      case 'flicker':
        return (t) => {
          const s = m.speed || 3;
          const v = 0.55 * Math.sin(t * s) + 0.3 * Math.sin(t * s * 2.71 + 1.3) + 0.15 * Math.sin(t * s * 7.3 + 0.2);
          sprite.alpha = m.min + (m.max - m.min) * (0.5 + 0.5 * v);
        };
      case 'bob':
      case 'fly': {
        const baseY = sprite.y;
        const span = Layout.W + layer.w * sx;
        return (t, dt) => {
          sprite.x += (m.speed || 0) * sx * dt;
          if (sprite.x > Layout.W) sprite.x -= span;
          if (sprite.x < -layer.w * sx) sprite.x += span;
          sprite.y = baseY + wave(t, m.period, m.phase || 0) * (m.amp || 3) * sy;
          if (m.type === 'fly') {
            // Wing beats: squash vertically around the body.
            sprite.scale.y = sy * (0.8 + 0.2 * wave(t, (m.period || 1) / 2, m.phase || 0));
          }
        };
      }
      default:
        return null;
    }
  },

  _effect(e, parent, bgTexture) {
    if (!bgTexture || !bgTexture.source) return null;
    const srcW = bgTexture.source.width;
    const srcH = bgTexture.source.height;
    const [x0, y0, x1, y1] = e.rect;
    const frame = new PIXI.Rectangle(Math.round(x0 * srcW), Math.round(y0 * srcH),
      Math.round((x1 - x0) * srcW), Math.round((y1 - y0) * srcH));
    const gx = x0 * Layout.W, gy = y0 * Layout.H;
    const gw = (x1 - x0) * Layout.W, gh = (y1 - y0) * Layout.H;

    if (e.type === 'skyDrift') {
      // Band + its mirror image tile seamlessly; fade the bottom so it
      // melts into the static picture below.
      const img = bgTexture.source.resource;
      const canvas = document.createElement('canvas');
      canvas.width = frame.width * 2;
      canvas.height = frame.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height);
      ctx.save();
      ctx.translate(frame.width * 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height);
      ctx.restore();
      ctx.globalCompositeOperation = 'destination-out';
      const grad = ctx.createLinearGradient(0, frame.height * 0.7, 0, frame.height);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const tex = PIXI.Texture.from({ resource: canvas, scaleMode: 'nearest' });
      const tile = new PIXI.TilingSprite({ texture: tex, width: gw, height: gh });
      tile.tileScale.set(gw / frame.width, gh / frame.height);
      tile.x = gx;
      tile.y = gy;
      parent.addChild(tile);
      return (t, dt) => { tile.tilePosition.x += e.speed * dt; };
    }

    if (e.type === 'ripple') {
      const sprite = new PIXI.Sprite(new PIXI.Texture({ source: bgTexture.source, frame }));
      sprite.x = gx;
      sprite.y = gy;
      sprite.width = gw;
      sprite.height = gh;
      const map = new PIXI.Sprite(this._noise());
      const cell = (e.cell || 40) * 2;
      map.scale.set(cell / 64);
      map.renderable = false;
      parent.addChild(map);
      const filter = new PIXI.DisplacementFilter({ sprite: map, scale: { x: e.amp[0], y: e.amp[1] } });
      sprite.filters = [filter];
      parent.addChild(sprite);
      return (t, dt) => {
        map.x += (e.speed[0] || 0) * dt;
        map.y += (e.speed[1] || 0) * dt;
      };
    }
    return null;
  },
};
