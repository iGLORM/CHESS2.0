const Layout = {
  W: 1280,
  H: 800,
  orientation: 'landscape',

  SAFE_X: 48,
  SAFE_TOP: 48,
  SAFE_BOTTOM: 40,

  get cx() { return this.W / 2; },
  get cy() { return this.H / 2; },
  get isPortrait() { return this.orientation === 'portrait'; },
  get isLandscape() { return this.orientation === 'landscape'; },
  get safeLeft() { return this.SAFE_X; },
  get safeRight() { return this.W - this.SAFE_X; },
  get safeTop() { return this.SAFE_TOP; },
  get safeBottom() { return this.H - this.SAFE_BOTTOM; },
  get safeWidth() { return this.W - this.SAFE_X * 2; },
  get safeHeight() { return this.H - this.SAFE_TOP - this.SAFE_BOTTOM; },

  get uiScale() {
    const vw = window.innerWidth;
    if (vw <= 480) return 1.4;
    if (vw <= 1024) return 1.2;
    return 1.0;
  },

  // Device pixels per game unit. The game is laid out at 1280x800 (or 800x1280)
  // but drawn at the screen's real resolution so small pixel text stays sharp.
  get renderScale() {
    const shell = document.getElementById('gameShell');
    const cssW = shell ? shell.getBoundingClientRect().width : window.innerWidth;
    const px = (cssW || this.W) * (window.devicePixelRatio || 1) / this.W;
    return Math.min(3, Math.max(1, Math.round(px * 4) / 4));
  },

  scaledFont(baseSize) {
    return Math.round(baseSize * (this.uiScale || 1));
  },

  _listeners: [],
  onChange(fn) { this._listeners.push(fn); },
  offChange(fn) { this._listeners = this._listeners.filter(f => f !== fn); },
  _notify() { for (const fn of this._listeners) fn(this); },

  // Space available for the game after the body's safe-area padding.
  _available() {
    const body = document.body;
    if (!body) return { w: window.innerWidth, h: window.innerHeight };
    const cs = getComputedStyle(body);
    return {
      w: window.innerWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0),
      h: window.innerHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0),
    };
  },

  // Portrait is 800 wide and as tall as the phone's shape allows, so the game
  // fills tall screens instead of leaving black bars.
  _portraitHeight() {
    const { w, h } = this._available();
    return Math.max(1100, Math.min(1800, Math.round(800 * h / Math.max(1, w))));
  },

  // Size the game shell to the largest box of the game's aspect ratio that fits.
  fitShell() {
    const shell = document.getElementById('gameShell');
    if (!shell) return;
    const { w, h } = this._available();
    const scale = Math.min(w / this.W, h / this.H);
    shell.style.width = Math.floor(this.W * scale) + 'px';
    shell.style.height = Math.floor(this.H * scale) + 'px';
  },

  detect() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ratio = vw / vh;

    let newOrientation;
    if (ratio <= 0.90) {
      newOrientation = 'portrait';
    } else if (ratio >= 1.10) {
      newOrientation = 'landscape';
    } else {
      newOrientation = this.orientation;
    }

    const newH = newOrientation === 'portrait' ? this._portraitHeight() : 800;
    if (newOrientation === this.orientation && newH === this.H) {
      this.fitShell();
      return false;
    }

    this.orientation = newOrientation;
    if (newOrientation === 'portrait') {
      this.W = 800;
      this.H = newH;
      this.SAFE_X = 32;
      this.SAFE_TOP = 64;
      this.SAFE_BOTTOM = 48;
    } else {
      this.W = 1280;
      this.H = 800;
      this.SAFE_X = 48;
      this.SAFE_TOP = 48;
      this.SAFE_BOTTOM = 40;
    }
    this.fitShell();
    return true;
  },

  init() {
    // Resize handling (and notifying listeners) lives in main.js.
    this.detect();
  },
};
