// Graphics options (Settings > Display / Graphics), saved in settings.graphics.
// Other modules ask this object instead of reading the save directly:
//   Graphics.renderCap()     render resolution cap in game units (Layout.renderScale)
//   Graphics.fpsCap()        frame limit, 0 = unlimited (pacer() in the main.js loop)
//   Graphics.sceneRate()     live background frame rate factor, 0 = still (LiveScenes)
//   Graphics.particles()     particle count factor (0.25 to 1)
//   Graphics.mini3d()        { pixel, shadows } for the 3D mini-games (Mini3D)
//   Graphics.retro()         scanlines and colour split in the 3D mini-games
//   Graphics.shake()         whether screen shake is on
// The quality preset only sets motion, particles and 3D quality; resolution, frame
// limit and the rest are chosen on their own, as in most PC games.
const Graphics = {
  DEFAULTS: {
    preset: 'high',
    resolution: 'native',
    fps: 60,
    sceneMotion: 'full',
    particles: 'high',
    mini3d: 'high',
    retro: true,
    shake: true,
    brightness: 1,
    showFps: false,
  },

  PRESETS: {
    low:    { sceneMotion: 'off',  particles: 'low',    mini3d: 'low' },
    medium: { sceneMotion: 'half', particles: 'medium', mini3d: 'medium' },
    high:   { sceneMotion: 'full', particles: 'high', mini3d: 'high' },
    ultra:  { sceneMotion: 'full', particles: 'high', mini3d: 'ultra' },
  },

  // Landscape sizes (16:10, the game's shape); portrait swaps width and height.
  RESOLUTIONS: [
    { id: 'native', label: 'Native' },
    { id: '2560', w: 2560, h: 1600 },
    { id: '1920', w: 1920, h: 1200 },
    { id: '1680', w: 1680, h: 1050 },
    { id: '1440', w: 1440, h: 900 },
    { id: '1280', w: 1280, h: 800 },
    { id: '960', w: 960, h: 600 },
  ],

  CHOICES: {
    preset: [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['ultra', 'Ultra']],
    fps: [[30, '30 FPS'], [45, '45 FPS'], [60, '60 FPS'], [90, '90 FPS'], [120, '120 FPS'], [144, '144 FPS'],
      [165, '165 FPS'], [0, 'Unlimited']],
    sceneMotion: [['off', 'Still'], ['half', 'Half rate'], ['full', 'Full']],
    particles: [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']],
    mini3d: [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['ultra', 'Ultra']],
  },

  // pixel: screen pixels per rendered pixel (1 = the screen's own resolution,
  // below 1 supersamples).
  MINI3D: {
    low:    { pixel: 2, shadows: false },
    medium: { pixel: 1.33, shadows: true },
    high:   { pixel: 1, shadows: true },
    ultra:  { pixel: 0.75, shadows: true },
  },

  // Read every frame, so cached until the settings object is replaced (store.set).
  _all() {
    const settings = typeof store !== 'undefined' ? store.get('settings') : null;
    if (settings && settings === this._src) return this._cache;
    this._src = settings;
    this._cache = { ...this.DEFAULTS, ...((settings && settings.graphics) || {}) };
    // The preset names what the options really are: an older save whose options no
    // longer match its preset (High used to mean Medium 3D) reads as Custom.
    this._cache.preset = this._matchPreset(this._cache);
    return this._cache;
  },

  get(key) {
    return this._all()[key];
  },

  set(key, value) {
    const g = { ...this._all() };
    g[key] = value;
    if (key === 'preset' && this.PRESETS[value]) Object.assign(g, this.PRESETS[value]);
    else if (key in this.PRESETS.high) g.preset = this._matchPreset(g);
    this._save(g);
    this.apply(key);
  },

  // The preset whose settings match, or 'custom'.
  _matchPreset(g) {
    for (const [name, p] of Object.entries(this.PRESETS)) {
      if (Object.keys(p).every(k => g[k] === p[k])) return name;
    }
    return 'custom';
  },

  _save(g) {
    const settings = { ...store.get('settings'), graphics: g };
    store.set('settings', settings);
    store.saveProgress();
  },

  // The label for the current value of a choice setting.
  label(key) {
    const value = this.get(key);
    if (key === 'resolution') {
      const r = this.RESOLUTIONS.find(x => x.id === value) || this.RESOLUTIONS[0];
      if (!r.w) return r.label;
      return Layout.isPortrait ? `${r.h} x ${r.w}` : `${r.w} x ${r.h}`;
    }
    if (key === 'preset' && value === 'custom') return 'Custom';
    const hit = (this.CHOICES[key] || []).find(c => c[0] === value);
    return hit ? hit[1] : String(value);
  },

  // Steps a choice setting by dir (-1 or 1), wrapping round.
  step(key, dir) {
    const list = key === 'resolution'
      ? this.RESOLUTIONS.map(r => r.id)
      : (this.CHOICES[key] || []).map(c => c[0]);
    if (!list.length) return;
    const i = list.indexOf(this.get(key));
    const next = list[((i < 0 ? 0 : i + dir) + list.length) % list.length];
    this.set(key, next);
  },

  // Largest render scale (device pixels per game unit) the chosen resolution allows.
  renderCap() {
    const r = this.RESOLUTIONS.find(x => x.id === this.get('resolution'));
    if (!r || !r.w) return Infinity;
    return r.w / 1280;
  },

  fpsCap() { return this.get('fps') || 0; },
  sceneRate() { return { off: 0, half: 0.5, full: 1 }[this.get('sceneMotion')] ?? 1; },
  particles() { return { low: 0.25, medium: 0.6, high: 1 }[this.get('particles')] ?? 1; },
  mini3d() { return this.MINI3D[this.get('mini3d')] || this.MINI3D.medium; },
  retro() { return this.get('retro') !== false; },
  shake() { return this.get('shake') !== false; },

  // Pushes settings that live outside the renderer's per-frame reads.
  apply(changed) {
    // GSAP tweens tick on their own (240 a second at most by default).
    if (typeof gsap !== 'undefined' && gsap.ticker) gsap.ticker.fps(this.fpsCap() || 240);
    const shell = typeof document !== 'undefined' && document.getElementById('gameShell');
    if (shell) {
      const b = this.get('brightness');
      shell.style.filter = Math.abs(b - 1) < 0.01 ? '' : `brightness(${b})`;
    }
    this._fpsMeter(this.get('showFps'));
    if (changed === 'resolution') {
      this._resizeWindow();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('resize'));
    }
  },

  // In a desktop window, a fixed resolution also sizes the window (clamped to the
  // screen by the main process). Fullscreen only changes the render resolution.
  _resizeWindow() {
    const r = this.RESOLUTIONS.find(x => x.id === this.get('resolution'));
    if (!r || !r.w || typeof window === 'undefined' || !window.electron || !window.electron.setWindowSize) return;
    const w = Layout.isPortrait ? r.h : r.w;
    const h = Layout.isPortrait ? r.w : r.h;
    window.electron.setWindowSize(w, h);
  },

  // Frame pacing for a requestAnimationFrame loop: pacer.ready(now) says whether to draw.
  // The desktop app turns off the screen's refresh limit (main.js), so the cap here is
  // what holds the frame rate. Chromium then hands out frames in bursts (several in a
  // row, then a wait for the screen), so time earns frames (cap per second) and each
  // drawn frame spends one; the small store lets a burst draw the frames its wait earned.
  pacer() {
    let credit = 0, last = 0;
    return {
      ready: (now) => {
        const cap = this.fpsCap();
        if (!cap) return true;
        if (last) credit = Math.min(credit + (now - last) * cap / 1000, 1 + cap / 60);
        else credit = 1;
        last = now;
        // A frame a little early (screen jitter) still counts; the debt is paid next time.
        if (credit < 0.9) return false;
        credit -= 1;
        return true;
      },
    };
  },

  // Small frame counter in the top-left corner, fed by tick() from the game loop.
  _fpsMeter(on) {
    if (typeof document === 'undefined') return;
    if (!on) {
      if (this._meter) { this._meter.remove(); this._meter = null; }
      return;
    }
    if (this._meter) return;
    const el = document.createElement('div');
    el.id = 'fpsMeter';
    el.style.cssText = 'position:fixed;left:6px;top:6px;z-index:500;padding:2px 6px;background:rgba(0,0,0,0.6);'
      + 'color:#7dea99;font:14px "Pixelify Sans",monospace;pointer-events:none;';
    el.textContent = '-- FPS';
    document.body.appendChild(el);
    this._meter = el;
    this._frames = 0;
    this._since = performance.now();
  },

  // Called once per drawn frame.
  tick(now) {
    if (!this._meter) return;
    this._frames++;
    if (now - this._since >= 500) {
      this._meter.textContent = `${Math.round(this._frames * 1000 / (now - this._since))} FPS`;
      this._frames = 0;
      this._since = now;
    }
  },
};
