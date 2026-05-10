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

  _listeners: [],
  onChange(fn) { this._listeners.push(fn); },
  offChange(fn) { this._listeners = this._listeners.filter(f => f !== fn); },
  _notify() { for (const fn of this._listeners) fn(this); },

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
      return false;
    }

    if (newOrientation === this.orientation) return false;

    this.orientation = newOrientation;
    if (newOrientation === 'portrait') {
      this.W = 800;
      this.H = 1280;
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
    return true;
  },

  init() {
    this.detect();
    let debounceTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (this.detect()) {
          this._notify();
        }
      }, 300);
    });
  },
};
