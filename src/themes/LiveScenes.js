// Live scenes: animated pixel art drawn in code, one file per scene in
// src/themes/scenes/ (see .claude/skills/pixel-scene/SKILL.md for how to make one).
// World backgrounds use the theme id (`pawnhollow`); characters use `char_<id>`.
//
// A scene registers { id, width, height, loop, fps, still, create } and optionally
//   moods:  ['nervous', 'happy', ...]  first is the default; setMood() switches
//   frames: { face: [x, y, w, h] }      named crops (a character's close-up)
//   moodFor(category)                   the mood for a dialogue category, or null
// create() builds the static parts once and returns draw(t, buf, state), which paints
// time t (seconds, 0 <= t < loop) into buf, a Uint32Array of width * height ABGR
// pixels. state is { mood, since } (since = seconds when the mood was set), plus
// anything a screen passes with setState() (the world map's restored worlds).
//
// Every sprite showing the same scene shares one canvas, drawn at most once per 1/fps
// seconds from a global clock, and only while one of its sprites is on screen.
// scripts/live-scene.js runs the same files under Node (stills, loop checks).
const LiveScenes = {
  _defs: {},
  _live: {},
  _ticking: false,

  register(def) {
    this._defs[def.id] = { fps: 30, still: 0, ...def };
  },

  has(id) {
    return !!this._defs[id];
  },

  get(id) {
    return this._defs[id] || null;
  },

  // The live character art for a story character id, or null.
  character(characterId) {
    // Side matches (SideMatches) can borrow a story character's face.
    const face = typeof SideMatches !== 'undefined' && SideMatches.faceOf(characterId);
    const id = 'char_' + (face || characterId);
    return this._defs[id] ? id : null;
  },

  // A character's figure alone, its backdrop cut away (the opponent walking onto
  // the board). Its own instance, so it keeps the scene's default mood.
  cutout(id) {
    return this._defs[id] ? this.sprite(id + this.CUT) : null;
  },
  CUT: ':cutout',

  // Keeps only the figure. Character scenes paint the figure as a layer with
  // over(buf, SPR) (PixelKit), so fig marks its pixels: keep what differs from the
  // backdrop the scene copied in (bg) on or next to them. A scene without such a
  // layer keeps the largest changed blob plus small bits wholly inside its box.
  _cut(buf, bg, w, h, fig) {
    if (fig && fig.some(v => v)) {
      for (let i = 0; i < w * h; i++) {
        if (buf[i] === bg[i]) { buf[i] = 0; continue; }
        const x = i % w, y = (i - x) / w;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) {
          const nx = x + dx, ny = y + dy;
          near = nx >= 0 && ny >= 0 && nx < w && ny < h && fig[ny * w + nx] === 1;
        }
        if (!near) buf[i] = 0;
      }
      return;
    }
    const comp = new Int32Array(w * h).fill(-1), boxes = [];
    for (let i = 0; i < w * h; i++) {
      if (comp[i] !== -1 || buf[i] === bg[i]) continue;
      const box = { n: 0, x0: w, y0: h, x1: 0, y1: 0 }, id = boxes.length, stack = [i];
      comp[i] = id;
      while (stack.length) {
        const j = stack.pop(), x = j % w, y = (j - x) / w;
        box.n++;
        if (x < box.x0) box.x0 = x; if (x > box.x1) box.x1 = x;
        if (y < box.y0) box.y0 = y; if (y > box.y1) box.y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy, k = ny * w + nx;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || comp[k] !== -1 || buf[k] === bg[k]) continue;
          comp[k] = id;
          stack.push(k);
        }
      }
      boxes.push(box);
    }
    let main = null;
    for (const b of boxes) if (!main || b.n > main.n) main = b;
    const M = 3;
    const keep = boxes.map(b => b === main || (main && b.x0 >= main.x0 - M && b.x1 <= main.x1 + M && b.y0 >= main.y0 - M && b.y1 <= main.y1 + M));
    for (let i = 0; i < w * h; i++) if (comp[i] === -1 || !keep[comp[i]]) buf[i] = 0;
  },

  // The shared running instance for a scene.
  instance(id) {
    if (this._live[id]) return this._live[id];
    const cut = id.endsWith(this.CUT);
    const def = this._defs[cut ? id.slice(0, -this.CUT.length) : id];
    if (!def) return null;
    const { width: w, height: h } = def;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const buf = new Uint32Array(w * h);
    // A cutout notes the full-size backdrop the scene copies in each frame.
    let bg = null;
    if (cut) buf.set = function (src, offset) {
      if (!offset && src.length === w * h && !bg) bg = src;
      return Uint32Array.prototype.set.call(this, src, offset);
    };
    const img = new ImageData(new Uint8ClampedArray(buf.buffer), w, h);
    // A cutout also notes which pixels the scene's figure layers cover (see _cut).
    const fig = cut ? new Uint8Array(w * h) : null;
    const surface = typeof PixelKit !== 'undefined' && PixelKit.surface;
    if (cut && surface) {
      PixelKit.surface = (sw, sh) => {
        const k = surface(sw, sh), over = k.over;
        k.over = (b, layer) => {
          if (b === buf) for (let i = 0; i < layer.length; i++) if (layer[i]) fig[i] = 1;
          over(b, layer);
        };
        return k;
      };
    }
    let draw;
    try { draw = def.create(); } finally { if (surface) PixelKit.surface = surface; }
    const state = { mood: def.moods ? def.moods[0] : null, since: 0 };
    let lastFrame = -1;
    const live = {
      canvas,
      state,
      sprites: new Set(),
      textures: {},
      paint(t) {
        bg = null;
        if (fig) fig.fill(0);
        draw(t, buf, state);
        if (cut && bg) LiveScenes._cut(buf, bg, w, h, fig);
        ctx.putImageData(img, 0, 0);
        const base = live.textures[''];
        if (base) base.source.update();
      },
      // Draws the current frame if it's due. Cheap to call often. Backgrounds follow
      // Settings > Graphics > Background Motion (characters always move).
      tick() {
        const rate = def.moods || typeof Graphics === 'undefined' ? 1 : Graphics.sceneRate();
        const dirty = live.dirty;
        live.dirty = false;
        if (!rate) {
          if (lastFrame !== 'still' || dirty) { lastFrame = 'still'; live.paint(def.still % def.loop); }
          return;
        }
        const fps = def.fps * rate;
        const frame = Math.floor(LiveScenes.now() * fps);
        if (frame === lastFrame && !dirty) return;
        lastFrame = frame;
        live.paint((frame / fps) % def.loop);
      },
      // The whole scene, or one of its named frames, as a texture on the shared canvas.
      texture(frameName = '') {
        if (live.textures[frameName]) return live.textures[frameName];
        if (!live.textures['']) live.textures[''] = PIXI.Texture.from({ resource: canvas, scaleMode: 'nearest' });
        if (frameName) {
          const [x, y, fw, fh] = (def.frames || {})[frameName];
          live.textures[frameName] = new PIXI.Texture({ source: live.textures[''].source, frame: new PIXI.Rectangle(x, y, fw, fh) });
        }
        return live.textures[frameName];
      },
    };
    live.paint(def.still % def.loop);
    this._live[id] = live;
    return live;
  },

  now() {
    return performance.now() / 1000;
  },

  setMood(id, mood) {
    const live = this.instance(id);
    if (!live || live.state.mood === mood) return;
    live.state.mood = mood;
    live.state.since = this.now() % this._defs[id].loop;
  },

  // Passes extra state to a scene's draw (merged into its state); repaints on the next tick.
  setState(id, patch) {
    const live = this.instance(id);
    if (!live) return;
    Object.assign(live.state, patch);
    live.dirty = true;
  },

  // A sprite showing the scene (or a named frame). It animates while it is on stage.
  sprite(id, frameName = '') {
    if (typeof PIXI === 'undefined') return null;
    return this.attach(id, new PIXI.Sprite(), frameName);
  },

  // Points an existing sprite at the scene (or a named frame) and keeps it animated.
  attach(id, sprite, frameName = '') {
    const live = this.instance(id);
    if (!live || typeof PIXI === 'undefined') return null;
    sprite.texture = live.texture(frameName);
    live.sprites.add(sprite);
    live.tick();
    this._startTicker();
    return sprite;
  },

  // Adds the scene to a PixiJS container, covering w x h. Returns update() (kept for
  // callers that tick themselves; the shared ticker already animates it).
  addTo(id, parent, w, h) {
    const sprite = this.sprite(id);
    if (!sprite) return null;
    sprite.width = w;
    sprite.height = h;
    parent.addChild(sprite);
    return () => {};
  },

  _startTicker() {
    if (this._ticking || typeof PixiApp === 'undefined' || !PixiApp.app) return;
    this._ticking = true;
    PixiApp.app.ticker.add(() => {
      for (const live of Object.values(this._live)) {
        let shown = false;
        for (const s of live.sprites) {
          if (s.destroyed) live.sprites.delete(s);
          else if (s.parent) shown = true;
        }
        if (shown) live.tick();
      }
    });
  },
};

if (typeof module !== 'undefined') module.exports = LiveScenes;
