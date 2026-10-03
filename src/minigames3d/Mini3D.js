// Shared Three.js plumbing for the 3D mini-games.
//
// One WebGL renderer is created on first use and kept for the whole session
// (browsers cap WebGL contexts, so games never make their own). Each frame a
// game renders its scene into a target at the screen's own resolution, a post
// shader adds the arcade look (dark outlines at silhouettes, a light sharpen,
// chromatic split, flash, faint scanlines, vignette, light colour steps), and
// the result is drawn into the 2D mini-game overlay pixel for pixel, so it stays crisp.
const Mini3D = {
  // Screen pixels per rendered pixel (Settings > Graphics > 3D Mini-Games);
  // below 1 renders bigger and scales down (supersampling).
  get PIXEL() {
    if (this._pixel) return this._pixel;     // thumbnails
    return typeof Graphics !== 'undefined' ? Graphics.mini3d().pixel : 1.33;
  },
  // Rendered size is capped so huge screens stay fast.
  MAX_SIDE: 2560,
  _pixel: null,
  renderer: null,
  target: null,
  post: null,
  _failed: false,

  available() {
    if (this._failed || typeof THREE === 'undefined') return false;
    if (this.renderer) return true;
    try {
      const canvas = document.createElement('canvas');
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(1);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.target = new THREE.WebGLRenderTarget(4, 4, {
        minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true,
      });
      // Depth is read back by the post pass to draw the outlines.
      this.target.depthTexture = new THREE.DepthTexture(4, 4);
      this._buildPost();
      return true;
    } catch (e) {
      console.warn('3D mini-games unavailable:', e);
      this._failed = true;
      this.renderer = null;
      return false;
    }
  },

  _buildPost() {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        near: { value: 0.1 },
        far: { value: 400 },
        outline: { value: new THREE.Color(0x07080d) },
        edgePx: { value: 1 },
        sharpen: { value: 0.35 },
        resolution: { value: new THREE.Vector2(1, 1) },
        time: { value: 0 },
        aberration: { value: 0 },
        flash: { value: 0 },
        flashColor: { value: new THREE.Color(1, 1, 1) },
        warp: { value: 0 },
        tint: { value: 0 },
        retro: { value: 1 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform vec2 resolution;
        uniform float time, aberration, flash, warp, tint, retro, near, far, edgePx, sharpen;
        uniform vec3 flashColor, outline;
        varying vec2 vUv;
        float viewZ(vec2 p) {
          float d = texture2D(tDepth, p).x;
          return (near * far) / (far - d * (far - near));
        }
        void main() {
          vec2 uv = vUv;
          vec2 c = uv - 0.5;
          // Speed warp: pull the picture towards the edges.
          uv += c * dot(c, c) * warp;
          vec2 dir = c * (aberration + 0.001) * retro;
          vec3 col;
          col.r = texture2D(tDiffuse, uv + dir).r;
          col.g = texture2D(tDiffuse, uv).g;
          col.b = texture2D(tDiffuse, uv - dir).b;
          // Light sharpen: push each pixel away from its neighbours' average.
          vec2 px = 1.0 / resolution;
          vec3 around = texture2D(tDiffuse, uv + vec2(px.x, 0.0)).rgb + texture2D(tDiffuse, uv - vec2(px.x, 0.0)).rgb
                      + texture2D(tDiffuse, uv + vec2(0.0, px.y)).rgb + texture2D(tDiffuse, uv - vec2(0.0, px.y)).rgb;
          col = max(col + (col - around * 0.25) * sharpen, 0.0);
          // Render targets hold linear light: tone map and gamma-encode here.
          col *= 1.15;
          col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), 0.0, 1.0);
          col = pow(col, vec3(1.0 / 2.2));
          // Light colour steps (a hint of retro banding).
          col = mix(col, floor(col * 48.0 + 0.5) / 48.0, retro);
          // Dark outline where something stands in front of what is behind it,
          // so pieces and props read like the game's outlined sprites. 1/depth
          // changes linearly across any flat surface on screen, so its second
          // difference is ~0 on walls and floors (even seen edge-on) and only
          // jumps at silhouettes; the line goes on the nearer side.
          vec2 o = px * edgePx;
          float z = viewZ(uv);
          float zl = viewZ(uv - vec2(o.x, 0.0)), zr = viewZ(uv + vec2(o.x, 0.0));
          float zd = viewZ(uv - vec2(0.0, o.y)), zu = viewZ(uv + vec2(0.0, o.y));
          float w = 1.0 / z;
          float bend = max(abs(1.0 / zl + 1.0 / zr - 2.0 * w), abs(1.0 / zd + 1.0 / zu - 2.0 * w)) / w;
          // A far neighbour with this surface again just past it is a hairline
          // crack between tiles, not a silhouette: no line there.
          float gap = z * 0.02;
          float behind = 0.0;
          if (zl - z > gap && abs(viewZ(uv - vec2(2.0 * o.x, 0.0)) - z) > gap) behind = 1.0;
          if (zr - z > gap && abs(viewZ(uv + vec2(2.0 * o.x, 0.0)) - z) > gap) behind = 1.0;
          if (zd - z > gap && abs(viewZ(uv - vec2(0.0, 2.0 * o.y)) - z) > gap) behind = 1.0;
          if (zu - z > gap && abs(viewZ(uv + vec2(0.0, 2.0 * o.y)) - z) > gap) behind = 1.0;
          float edge = step(0.25, bend) * behind * step(z, far * 0.5);
          col = mix(col, outline, edge * 0.95);
          // Scanlines on every other rendered row.
          float line = mod(floor(uv.y * resolution.y), 2.0);
          col *= 1.0 - (0.025 - 0.025 * line) * retro;
          // Danger tint and vignette.
          col = mix(col, col * vec3(1.35, 0.55, 0.6), tint);
          float v = smoothstep(0.85, 0.25, length(c * vec2(1.1, 1.0)));
          col *= mix(0.7, 1.0, v);
          col = mix(col, flashColor, flash);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(quad);
    this.post = { scene, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), material };
  },

  // Renders `scene` through the post pass and draws it into the 2D overlay.
  draw(ctx, scene, camera, x, y, w, h, fx) {
    if (!this.available()) throw new Error('WebGL is not available');
    // The overlay is drawn in game units scaled to the screen: render at the
    // screen's own pixels so nothing is blown up.
    const screen = Math.abs(ctx.getTransform().a) || 1;
    const k = Math.min(screen / this.PIXEL, this.MAX_SIDE / Math.max(w, h));
    const rw = Math.max(32, Math.round(w * k));
    const rh = Math.max(32, Math.round(h * k));
    const r = this.renderer;
    const quality = typeof Graphics !== 'undefined' ? Graphics.mini3d() : { shadows: true };
    if (r.shadowMap.enabled !== quality.shadows) {
      r.shadowMap.enabled = quality.shadows;
      scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
    }
    const size = r.getSize(new THREE.Vector2());
    if (size.x !== rw || size.y !== rh) {
      r.setSize(rw, rh, false);
      this.target.setSize(rw, rh);
    }
    if (camera.isPerspectiveCamera && Math.abs(camera.aspect - rw / rh) > 0.001) {
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
    }
    r.setRenderTarget(this.target);
    r.render(scene, camera);
    r.setRenderTarget(null);

    const u = this.post.material.uniforms;
    u.tDiffuse.value = this.target.texture;
    u.tDepth.value = this.target.depthTexture;
    u.near.value = camera.near;
    u.far.value = camera.far;
    // Outline about 2.5 game units thick, whatever the resolution.
    u.edgePx.value = Math.max(1, 2.5 * k);
    u.resolution.value.set(rw, rh);
    u.time.value = performance.now() / 1000;
    u.aberration.value = (fx && fx.aberration) || 0;
    u.flash.value = (fx && fx.flash) || 0;
    u.warp.value = (fx && fx.warp) || 0;
    u.tint.value = (fx && fx.tint) || 0;
    u.retro.value = typeof Graphics === 'undefined' || Graphics.retro() ? 1 : 0;
    if (fx && fx.flashColor) u.flashColor.value.set(fx.flashColor);
    r.render(this.post.scene, this.post.camera);

    const smoothing = ctx.imageSmoothingEnabled;
    // Scaling down (supersampled) wants smoothing; scaling up stays crisp.
    ctx.imageSmoothingEnabled = rw > w * screen + 1;
    ctx.drawImage(r.domElement, x, y, w, h);
    ctx.imageSmoothingEnabled = smoothing;
  },

  // Frees everything a game's scene owns (the shared renderer stays).
  disposeScene(scene) {
    if (!scene) return;
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    });
    scene.clear();
  },

  THUMB_GAMES() {
    const out = {};
    for (const type of MiniGameManager.GAMES_3D()) out[type.name.charAt(0).toLowerCase() + type.name.slice(1)] = type;
    return out;
  },

  // A still of the game after a couple of seconds of bot play, for menus.
  thumbnail(GameClass, ctx, w, h) {
    const game = new GameClass();
    game.botControlled = true;
    game.botSkill = 8;
    game.isThumb = true;
    const quiet = typeof audioManager !== 'undefined' ? audioManager._phrase : null;
    try {
      if (quiet) audioManager._phrase = () => {};
      game.init({ type: 'knight', color: 'white' }, { type: 'queen', color: 'black' }, 4, false);
      for (let i = 0; i < 90 && !game.done; i++) game.update(1 / 30);
      game.flash = 0;
      game.banner = null;
      this._pixel = 1;
      game.render(ctx, 0, 0, w, h);
      this._pixel = null;
    } catch (e) {
      console.warn('3D thumbnail failed:', e);
    } finally {
      this._pixel = null;
      if (quiet) audioManager._phrase = quiet;
      game.cleanup();
    }
  },

  // ----------------------------------------------------------- materials --

  // Colours of a piece in the active theme, sampled from its sprite so the
  // 3D piece matches the one on the board. Null when the art isn't loaded.
  _palettes: {},
  themePalette(color, type) {
    const theme = typeof store !== 'undefined' ? store.get('theme') : null;
    const key = `${theme}_${color}_${type}`;
    if (this._palettes[key]) return this._palettes[key];
    const img = theme && typeof TextureManager !== 'undefined' ? TextureManager.getPieceTexture(theme, color, type) : null;
    if (!img) return null;
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, 32, 32);
      const data = g.getImageData(0, 0, 32, 32).data;
      const px = [];
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 200) continue;
        const r = data[i], gr = data[i + 1], b = data[i + 2];
        px.push({ r, g: gr, b, l: 0.3 * r + 0.59 * gr + 0.11 * b });
      }
      if (px.length < 20) return null;
      px.sort((a, b) => a.l - b.l);
      // Body: the mid tones (skips outlines and shine). Trim: the brightest tenth.
      const avg = (from, to) => {
        const part = px.slice(Math.floor(px.length * from), Math.max(Math.floor(px.length * from) + 1, Math.floor(px.length * to)));
        const sum = part.reduce((acc, p) => [acc[0] + p.r, acc[1] + p.g, acc[2] + p.b], [0, 0, 0]);
        return new THREE.Color().setRGB(sum[0] / part.length / 255, sum[1] / part.length / 255, sum[2] / part.length / 255, THREE.SRGBColorSpace);
      };
      const pal = { body: avg(0.35, 0.85), trim: avg(0.9, 1) };
      this._palettes[key] = pal;
      return pal;
    } catch (e) {
      return null;
    }
  },

  pieceMaterial(color, glow, type) {
    const white = color === 'white';
    const pal = type ? this.themePalette(color, type) : null;
    const body = pal ? pal.body : new THREE.Color(white ? 0xf1e4c8 : 0x2b2140);
    const shade = pal ? pal.body.clone().multiplyScalar(0.18) : new THREE.Color(white ? 0x2a2418 : 0x1a0f33);
    return new THREE.MeshStandardMaterial({
      color: body,
      emissive: glow != null ? new THREE.Color(glow) : shade,
      emissiveIntensity: glow != null ? 0.5 : 1,
      roughness: white ? 0.45 : 0.3,
      metalness: white ? 0.05 : 0.35,
      flatShading: true,
    });
  },

  // A checkerboard texture; `cells` squares per side.
  // How far mini-game colours lean toward the world you are in (0 = the game's own).
  WORLD_TINT: 0.55,

  // A colour pulled toward the current theme's palette, keeping its own lightness, so
  // a dark road stays dark and a pale floor pale, just in the world's hues. role picks
  // the theme colour: 'light'/'dark' squares, 'sky' (the dark squares) or 'glow' (accent).
  // Takes and returns a hex number or a '#rrggbb' string.
  worldTint(color, role, k) {
    const cols = typeof ThemeManager !== 'undefined' && ThemeManager.getCurrentColors && ThemeManager.getCurrentColors();
    const key = { light: 'lightSquare', dark: 'darkSquare', sky: 'darkSquare', glow: 'accent' }[role] || 'darkSquare';
    if (!cols || !cols[key] || !/^#[0-9a-f]{6}$/i.test(cols[key])) return color;
    // Hue and saturation move toward the world's colour (round the colour wheel, so
    // purple to green never passes through grey); lightness stays the game's own.
    const src = new THREE.Color(color), to = new THREE.Color(cols[key]);
    const a = {}, b = {};
    src.getHSL(a); to.getHSL(b);
    const t = k == null ? this.WORLD_TINT : k;
    let dh = b.h - a.h;
    if (dh > 0.5) dh -= 1; else if (dh < -0.5) dh += 1;
    // A greyish world colour (Iron Keep's steel) has no real hue: it mostly calms the
    // colour down instead of turning it.
    const th = t * Math.min(1, b.s * 2.5);
    const h = a.s < 0.04 ? b.h : (a.h + dh * th + 1) % 1;
    src.setHSL(h, a.s + (b.s - a.s) * t, a.l);
    return typeof color === 'string' ? '#' + src.getHexString() : src.getHex();
  },

  // Recolours a built scene toward the world: sky, fog and the lights.
  tintScene(scene) {
    if (scene.background && scene.background.isColor) scene.background.setHex(this.worldTint(scene.background.getHex(), 'sky'));
    if (scene.fog && scene.fog.color) scene.fog.color.setHex(this.worldTint(scene.fog.color.getHex(), 'sky'));
    scene.traverse((o) => {
      if (o.isHemisphereLight) {
        o.color.setHex(this.worldTint(o.color.getHex(), 'glow', 0.3));
        o.groundColor.setHex(this.worldTint(o.groundColor.getHex(), 'dark'));
      } else if (o.isDirectionalLight) {
        o.color.setHex(this.worldTint(o.color.getHex(), 'glow', 0.35));
      }
    });
  },

  checkerTexture(cells, light, dark, px) {
    light = this.worldTint(light, 'light');
    dark = this.worldTint(dark, 'dark');
    const size = cells * (px || 8);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const step = size / cells;
    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        g.fillStyle = (i + j) % 2 ? dark : light;
        g.fillRect(i * step, j * step, step, step);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  // Soft round sprite texture for glows and sparks.
  glowTexture() {
    if (this._glowCanvas) return new THREE.CanvasTexture(this._glowCanvas);
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    this._glowCanvas = c;
    return new THREE.CanvasTexture(c);
  },

  glowSprite(color, scale) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    s.scale.setScalar(scale || 1);
    return s;
  },

  // Text drawn on a canvas, shown as a sprite that always faces the camera.
  labelSprite(text, color, height) {
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    g.font = 'bold 48px "Silkscreen", monospace';
    c.width = Math.ceil(g.measureText(text).width) + 16;
    c.height = 64;
    g.font = 'bold 48px "Silkscreen", monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(0,0,0,0.8)';
    g.strokeText(text, c.width / 2, 34);
    g.fillStyle = color || '#ffffff';
    g.fillText(text, c.width / 2, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const h = height || 0.5;
    s.scale.set(h * c.width / c.height, h, 1);
    return s;
  },

  starfield(count, radius, color) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(radius * (0.6 + Math.random() * 0.4));
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ color: color || 0xffffff, size: 1.5, sizeAttenuation: false }));
  },
};

// Low-poly chess pieces built from lathe profiles, about one unit tall,
// standing on y = 0.
const Pieces3D = {
  SEG: 10,

  _lathe(profile) {
    const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y));
    return new THREE.LatheGeometry(pts, this.SEG);
  },

  _base() {
    return [[0, 0], [0.4, 0], [0.4, 0.07], [0.34, 0.11], [0.3, 0.15], [0.24, 0.2]];
  },

  _ball(cx, cy, r, from, to, steps) {
    const out = [];
    for (let i = 0; i <= steps; i++) {
      const a = from + (to - from) * (i / steps);
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return out;
  },

  geometries(type) {
    const H = Math.PI / 2;
    switch (type) {
      case 'pawn':
        return [this._lathe([...this._base(), [0.15, 0.42], [0.24, 0.47], [0.24, 0.5], [0.13, 0.53],
          ...this._ball(0, 0.68, 0.17, -H + 0.5, H, 5)])];
      case 'rook': {
        const body = this._lathe([...this._base(), [0.21, 0.62], [0.3, 0.66], [0.3, 0.84], [0.2, 0.84], [0.2, 0.78], [0, 0.78]]);
        const out = [body];
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2 + Math.PI / 4;
          const b = new THREE.BoxGeometry(0.14, 0.14, 0.1);
          b.rotateY(-a);
          b.translate(Math.cos(a) * 0.24, 0.9, Math.sin(a) * 0.24);
          out.push(b);
        }
        return out;
      }
      case 'bishop':
        return [this._lathe([...this._base(), [0.13, 0.55], [0.23, 0.6], [0.23, 0.63], [0.13, 0.65],
          [0.17, 0.72], [0.18, 0.8], [0.14, 0.9], [0.06, 0.98], [0.04, 1.0],
          ...this._ball(0, 1.05, 0.06, -H + 0.4, H, 3)])];
      case 'queen': {
        const body = this._lathe([...this._base(), [0.13, 0.65], [0.25, 0.7], [0.25, 0.73], [0.14, 0.76],
          [0.2, 0.95], [0.26, 1.03], [0.12, 1.05], [0, 1.06]]);
        const out = [body];
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          const s = new THREE.IcosahedronGeometry(0.05, 0);
          s.translate(Math.cos(a) * 0.24, 1.07, Math.sin(a) * 0.24);
          out.push(s);
        }
        const top = new THREE.IcosahedronGeometry(0.08, 0);
        top.translate(0, 1.13, 0);
        out.push(top);
        return out;
      }
      case 'king': {
        const body = this._lathe([...this._base(), [0.14, 0.66], [0.26, 0.71], [0.26, 0.74], [0.15, 0.77],
          [0.22, 0.98], [0.18, 1.02], [0, 1.03]]);
        // Crown top: a solid band, four short points and one big orb (the queen has
        // a ring of eight small balls instead).
        const band = new THREE.CylinderGeometry(0.2, 0.18, 0.07, 8);
        band.translate(0, 1.04, 0);
        const out = [body, band];
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2 + Math.PI / 4;
          const pt = new THREE.ConeGeometry(0.045, 0.1, 4);
          pt.translate(Math.cos(a) * 0.16, 1.12, Math.sin(a) * 0.16);
          out.push(pt);
        }
        const orb = new THREE.SphereGeometry(0.085, 6, 4);
        orb.translate(0, 1.16, 0);
        out.push(orb);
        return out;
      }
      case 'knight': {
        const base = this._lathe([...this._base(), [0.2, 0.3], [0.26, 0.34], [0.26, 0.37], [0, 0.37]]);
        const shape = new THREE.Shape();
        const pts = [[-0.2, 0.34], [0.2, 0.34], [0.16, 0.5], [0.08, 0.62], [0.2, 0.7], [0.22, 0.78],
          [0.1, 0.94], [0.02, 1.0], [-0.02, 1.08], [-0.08, 0.98], [-0.2, 0.9], [-0.3, 0.72], [-0.32, 0.64],
          [-0.24, 0.62], [-0.14, 0.68], [-0.1, 0.6], [-0.2, 0.48]];
        shape.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
        const head = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 1 });
        head.translate(0, 0, -0.1);
        head.rotateY(-Math.PI / 2);
        return [base, head];
      }
      default:
        return this.geometries('pawn');
    }
  },

  create(type, color, glow) {
    const group = new THREE.Group();
    const mat = Mini3D.pieceMaterial(color, glow, type);
    const pal = Mini3D.themePalette(color, type);
    // Crowns, finials and battlements pick up the theme's trim colour.
    const trim = pal ? mat.clone() : mat;
    if (pal) trim.color.copy(pal.trim);
    this.geometries(type).forEach((geo, i) => {
      const m = new THREE.Mesh(geo, i === 0 ? mat : trim);
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
    });
    group.userData.pieceType = type;
    return group;
  },
};

// Pooled cube debris / sparks drawn with one InstancedMesh.
class Burst3D {
  constructor(scene, max) {
    this.max = max || 300;
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      this.max,
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.parts = [];
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._s = new THREE.Vector3();
    this._c = new THREE.Color();
    scene.add(this.mesh);
    this.mesh.count = 0;
  }

  spawn(pos, color, count, speed, opts) {
    opts = opts || {};
    for (let i = 0; i < count; i++) {
      if (this.parts.length >= this.max) this.parts.shift();
      const v = new THREE.Vector3().randomDirection().multiplyScalar(speed * (0.35 + Math.random() * 0.65));
      if (opts.up) v.y = Math.abs(v.y) + opts.up;
      const life = (opts.life || 0.7) * (0.6 + Math.random() * 0.6);
      this.parts.push({
        p: pos.clone(), v, life, max: life,
        size: (opts.size || 0.12) * (0.5 + Math.random()),
        rot: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        spin: new THREE.Vector3().randomDirection().multiplyScalar(10),
        color: Array.isArray(color) ? color[(Math.random() * color.length) | 0] : color,
        gravity: opts.gravity != null ? opts.gravity : 9,
      });
    }
  }

  update(dt) {
    let n = 0;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      p.v.y -= p.gravity * dt;
      p.p.addScaledVector(p.v, dt);
      p.rot.addScaledVector(p.spin, dt);
    }
    for (const p of this.parts) {
      const k = p.life / p.max;
      this._q.setFromEuler(this._e.set(p.rot.x, p.rot.y, p.rot.z));
      this._s.setScalar(p.size * (0.3 + 0.7 * k));
      this._m.compose(p.p, this._q, this._s);
      this.mesh.setMatrixAt(n, this._m);
      this.mesh.setColorAt(n, this._c.set(p.color).multiplyScalar(1 + k));
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// Short synth hits built from the game's instruments.
const Sfx3D = {
  _p(notes) {
    if (typeof audioManager !== 'undefined' && audioManager._phrase) {
      try { audioManager._phrase(notes); } catch (_) {}
    }
  },
  boom() { this._p([[0, 'kick', null, 0, 1], [0, 'taiko', null, 0, 0.8], [0.02, 'snare', null, 0, 0.6]]); },
  hit() { this._p([[0, 'snare', null, 0, 0.8], [0, 'tom', null, 0, 0.6]]); },
  zap(m) { this._p([[0, 'pluck', m || 84, 0.08, 0.7, { wave: 'square', bright: 5000 }], [0, 'tek', null, 0, 0.4]]); },
  blip(m) { this._p([[0, 'pluck', m || 76, 0.06, 0.6, { wave: 'square', bright: 3500 }]]); },
  ding(m) { this._p([[0, 'bell', m || 84, 0.2, 0.8, { ratio: 3.5, index: 1.2, ring: 0.5 }]]); },
  whoosh() { this._p([[0, 'openHat', null, 0, 0.5], [0.04, 'hat', null, 0, 0.4]]); },
  thud() { this._p([[0, 'tom', null, 0, 0.8], [0, 'woodblock', null, 0, 0.3]]); },
};

// Base class: scene, camera, shake/flash state, 2D HUD helpers and the
// hooks MiniGameManager expects (init/update/render/handleClick/handleKey).
class Game3D {
  constructor(name) {
    this.name = name;
    this.is3D = true;
    this.done = false;
    this.winner = null;
    this.keys = new Set();
    this.pointer = { x: 0.5, y: 0.5, down: false, inside: false };
    this.shake = 0;
    this.flash = 0;
    this.flashColor = 0xffffff;
    this.aberration = 0;
    this.tint = 0;
    this.warp = 0;
    this.time = 0;
    this.rect = { x: 0, y: 0, w: 1, h: 1 };
    this.botControlled = false;
    this.botSkill = 5;
    this.banner = null;
  }

  init(mine, enemy, difficulty, isDuel) {
    this.mine = mine || { type: 'pawn', color: 'white' };
    this.enemy = enemy || { type: 'pawn', color: 'black' };
    this.difficulty = difficulty || 1;
    this.isDuel = !!isDuel;
    this.enemyColor = this.mine.color === 'white' ? 'black' : 'white';
    this.done = false;
    this.winner = null;
    this.time = 0;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 400);
    this.burst = new Burst3D(this.scene, 320);
    this.setup();
    Mini3D.tintScene(this.scene);   // the game's own look, in the colours of the world you are in
  }

  // 0..1 across difficulty 1..10, with duels pushed harder.
  get hard() {
    return Math.min(1, (this.difficulty - 1) / 9 + (this.isDuel ? 0.15 : 0));
  }

  win() {
    if (this.done) return;
    this.done = true;
    this.winner = 'attacker';
    this.flash = 0.6;
    this.flashColor = 0x3ee07f;
    audioManager.playMiniGameWin();
  }

  lose() {
    if (this.done) return;
    this.done = true;
    this.winner = 'defender';
    this.flash = 0.7;
    this.flashColor = 0xff4d6d;
    this.shake = Math.max(this.shake, 0.8);
    audioManager.playMiniGameLose();
  }

  hitFx(amount, color) {
    this.shake = Math.max(this.shake, amount);
    this.aberration = Math.max(this.aberration, amount * 0.03);
    this.flash = Math.max(this.flash, amount * 0.4);
    this.flashColor = color != null ? color : 0xffffff;
  }

  say(text, color) {
    this.banner = { text, color: color || '#ffd166', t: 0 };
  }

  update(dt) {
    this.time += dt;
    if (!this.done) {
      if (this.botControlled) this.bot(dt);
      this.tick(dt);
      if (!this.done && this.timeLimit && this.time >= this.timeLimit) {
        this.say('TIME!', '#ff4d6d');
        this.lose();
      }
    } else if (this.afterTick) {
      this.afterTick(dt);
    }
    this.burst.update(dt);
    this.shake = Math.max(0, this.shake - dt * 2.2);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.aberration = Math.max(0, this.aberration - dt * 0.08);
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > 1.1) this.banner = null;
    }
  }

  render(ctx, x, y, w, h) {
    this.rect = { x, y, w, h };
    const cam = this.camera;
    const saved = cam.position.clone();
    if (this.shake > 0 && (typeof Graphics === 'undefined' || Graphics.shake())) {
      const s = this.shake * this.shake * 0.35;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
    }
    Mini3D.draw(ctx, this.scene, cam, x, y, w, h, {
      aberration: this.aberration, flash: this.flash, flashColor: this.flashColor, warp: this.warp, tint: this.tint,
    });
    cam.position.copy(saved);
    if (this.isThumb) return;
    this.hud(ctx, x, y, w, h);
    this._drawBanner(ctx, x, y, w, h);
  }

  _drawBanner(ctx, x, y, w, h) {
    if (!this.banner) return;
    const t = this.banner.t;
    const a = t < 0.1 ? t / 0.1 : Math.max(0, 1 - (t - 0.6) / 0.5);
    const s = 1 + Math.max(0, 0.15 - t) * 3;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x + w / 2, y + h * 0.3 - t * 20);
    ctx.scale(s, s);
    ctx.font = 'bold 34px "Silkscreen", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(this.banner.text, 0, 0);
    ctx.fillStyle = this.banner.color;
    ctx.fillText(this.banner.text, 0, 0);
    ctx.restore();
  }

  // Shared HUD pieces.
  hudText(ctx, text, x, y, opts) {
    opts = opts || {};
    ctx.save();
    ctx.font = `bold ${opts.size || 18}px ${opts.title ? '"Silkscreen", monospace' : '"Pixelify Sans", sans-serif'}`;
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = opts.color || '#f4f0ff';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  hudBar(ctx, x, y, w, h, k, color) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    MiniGameUtils.roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    if (k > 0) {
      ctx.fillStyle = color;
      MiniGameUtils.roundRect(ctx, x + 2, y + 2, Math.max(h - 4, (w - 4) * Math.min(1, k)), h - 4, (h - 4) / 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    MiniGameUtils.roundRect(ctx, x, y, w, h, h / 2);
    ctx.stroke();
    ctx.restore();
  }

  hudHearts(ctx, x, y, n, max) {
    for (let i = 0; i < max; i++) {
      this.hudText(ctx, '♥', x + i * 22, y, { size: 22, color: i < n ? '#ff4d6d' : 'rgba(255,255,255,0.2)' });
    }
  }

  hudTimer(ctx, x, y) {
    const left = Math.max(0, this.timeLimit - this.time);
    this.hudText(ctx, left.toFixed(1) + 's', x, y, { size: 22, align: 'right', color: left < 4 ? '#ff4d6d' : '#f4f0ff' });
  }

  hudHint(ctx, text) {
    const r = this.rect;
    this.hudText(ctx, text, r.x + r.w / 2, r.y + r.h - 16, { size: 14, align: 'center', color: 'rgba(244,240,255,0.7)' });
  }

  // Pointer position inside the game rect, 0..1.
  _setPointer(x, y) {
    const r = this.rect;
    this.pointer.x = (x - r.x) / r.w;
    this.pointer.y = (y - r.y) / r.h;
    this.pointer.inside = this.pointer.x >= 0 && this.pointer.x <= 1 && this.pointer.y >= 0 && this.pointer.y <= 1;
  }

  ndc() {
    return new THREE.Vector2(this.pointer.x * 2 - 1, -(this.pointer.y * 2 - 1));
  }

  handlePointer(type, x, y) {
    if (this.done) return;
    this._setPointer(x, y);
    if (type === 'down') {
      this.pointer.down = true;
      if (this.pointer.inside && this.onPress) this.onPress();
    } else if (type === 'up') {
      this.pointer.down = false;
      if (this.onRelease) this.onRelease();
    } else if (type === 'move' && this.onMove) {
      this.onMove();
    }
  }

  // Clicks arrive after pointer down/up; games use onPress instead.
  handleClick(x, y) {
    this._setPointer(x, y);
  }

  handleKey(key) {
    if (this.done) return;
    const k = key.length === 1 ? key.toLowerCase() : key;
    if (!this.keys.has(k) && this.onKey) this.onKey(k);
    this.keys.add(k);
  }

  handleKeyUp(key) {
    const k = key.length === 1 ? key.toLowerCase() : key;
    this.keys.delete(k);
  }

  held(...names) {
    return names.some(n => this.keys.has(n));
  }

  // Manager calls this on an interval; 3D games steer their bot every frame
  // in bot(dt) instead.
  botPlay() {}
  bot() {}
  setup() {}
  tick() {}
  hud() {}

  // The captured piece, in the theme's colours, with a green ring at its
  // feet so you can always tell which one is yours.
  playerPiece() {
    const piece = Pieces3D.create(this.mine.type, this.mine.color);
    // Dark sets vanish against the night scenes, so lift their shadows a little.
    piece.traverse(o => {
      if (!o.isMesh) return;
      const c = o.material.color;
      if (0.3 * c.r + 0.59 * c.g + 0.11 * c.b < 0.35) {
        o.material = o.material.clone();
        o.material.emissive.copy(c).lerp(new THREE.Color(0x8a7ab0), 0.5).multiplyScalar(0.55);
      }
    });
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0x3ee07f, transparent: true, opacity: 0.28, toneMapped: false, depthWrite: false }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.025;
    piece.add(pad);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.5, 20), new THREE.MeshBasicMaterial({ color: 0x3ee07f, toneMapped: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    piece.add(ring);
    return piece;
  }

  // Nearest item to the pointer on screen, within `tol` (in screen heights).
  screenPick(items, posFn, tol) {
    const n = this.ndc();
    let best = null, bestD = tol || 0.14;
    for (const it of items) {
      const p = posFn(it).clone().project(this.camera);
      if (p.z > 1) continue;
      const d = Math.hypot((p.x - n.x) * this.camera.aspect, p.y - n.y);
      if (d < bestD) { best = it; bestD = d; }
    }
    return best;
  }

  // Where the pointer ray meets the horizontal plane y = h.
  groundPoint(h) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(this.ndc(), this.camera);
    const out = new THREE.Vector3();
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -(h || 0)), out) ? out : null;
  }

  // Moves an actor {x, z} around a square arena: arrow keys/WASD, or towards
  // the pointer, or (bot) away from `dangers` [{x, z, r}].
  moveActor(dt, a, opts) {
    const speed = opts.speed || 6, bound = opts.bound || 3.6;
    let dx = 0, dz = 0;
    if (this.botControlled) {
      const skill = this.botSkill / 10;
      for (const d of opts.dangers || []) {
        const ox = a.x - d.x, oz = a.z - d.z;
        const dist = Math.hypot(ox, oz) || 0.01;
        const reach = (d.r || 0.5) + 1.2 + skill;
        if (dist < reach) {
          const push = (reach - dist) / reach * (d.w || 1);
          dx += ox / dist * push;
          dz += oz / dist * push;
        }
      }
      dx += -a.x * 0.08;
      dz += -a.z * 0.08;
      if (Math.random() < (1 - skill) * 0.05) { a._jx = (Math.random() - 0.5) * 2; a._jz = (Math.random() - 0.5) * 2; }
      dx += (a._jx || 0) * (1 - skill) * 0.4;
      dz += (a._jz || 0) * (1 - skill) * 0.4;
      const len = Math.hypot(dx, dz);
      if (len > 1) { dx /= len; dz /= len; }
      if (len < 0.08) { dx = 0; dz = 0; }
      const k = 0.6 + skill * 0.4;
      dx *= k; dz *= k;
    } else if (this.held('ArrowLeft', 'a', 'ArrowRight', 'd', 'ArrowUp', 'w', 'ArrowDown', 's')) {
      if (this.held('ArrowLeft', 'a')) dx -= 1;
      if (this.held('ArrowRight', 'd')) dx += 1;
      if (this.held('ArrowUp', 'w')) dz -= 1;
      if (this.held('ArrowDown', 's')) dz += 1;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
    } else if (this.pointer.inside) {
      const g = this.groundPoint(opts.planeY || 0);
      if (g) {
        const ox = g.x - a.x, oz = g.z - a.z;
        const len = Math.hypot(ox, oz);
        if (len > 0.08) { const k = Math.min(1, len * 2.5) / len; dx = ox * k; dz = oz * k; }
      }
    }
    a.x = Math.max(-bound, Math.min(bound, a.x + dx * speed * dt));
    a.z = Math.max(-bound, Math.min(bound, a.z + dz * speed * dt));
    a.moving = Math.hypot(dx, dz);
    if (a.moving > 0.1) a.facing = Math.atan2(dx, dz);
  }

  cleanup() {
    Mini3D.disposeScene(this.scene);
    this.scene = null;
  }

  // Standard lighting rig: sky/ground fill, a shadow-casting key light and a rim.
  lights(opts) {
    opts = opts || {};
    const hemi = new THREE.HemisphereLight(opts.sky || 0x9fb6ff, opts.ground || 0x2a1640, opts.hemi || 1.1);
    const key = new THREE.DirectionalLight(opts.key || 0xfff0dd, opts.keyI || 2.2);
    key.position.set(4, 9, 5);
    key.castShadow = !!opts.shadows;
    if (opts.shadows) {
      key.shadow.mapSize.set(512, 512);
      const s = opts.shadowSize || 8;
      Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 40 });
    }
    const rim = new THREE.DirectionalLight(opts.rim || 0xb06cff, opts.rimI || 1.4);
    rim.position.set(-5, 3, -6);
    this.scene.add(hemi, key, rim);
    return { hemi, key, rim };
  }
}
