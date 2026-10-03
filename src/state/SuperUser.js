// Super User: press T ten times in a row (anywhere outside a text box or a
// challenge) and everything in the game shows as unlocked: every story stage,
// mission, theme and song, the Madness tier and all training puzzles. It only
// overrides the unlock checks, so real progress is kept, and ten more presses
// switch it back off. While it is on, W three times wins whatever you are
// playing: a match, a trainer's test or mission, a puzzle or a mini-game.
const SuperUser = {
  PRESSES: 10,
  WINDOW_MS: 4000,   // the presses must come within this long of each other
  WIN_PRESSES: 3,
  WIN_WINDOW_MS: 1500,
  _winCount: 0,
  _winLast: 0,
  REFRESH: ['home', 'worldMap', 'worldMissions', 'characterSelect', 'themeSelect', 'levelSelect', 'trainingHub'],
  _count: 0,
  _last: 0,

  active() {
    return typeof store !== 'undefined' && !!store.get('superUser');
  },

  // Called for every keydown; returns true when it toggled.
  handleKey(e) {
    const target = e.target || {};
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return false;
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.key !== 't' && e.key !== 'T')) {
      if (e.key !== 'Shift') this._count = 0;
      return false;
    }
    const now = Date.now();
    this._count = now - this._last > this.WINDOW_MS ? 1 : this._count + 1;
    this._last = now;
    if (this._count < this.PRESSES) return false;
    this._count = 0;
    this.toggle();
    return true;
  },

  // Called for every keydown (mini-games included); returns true when it won.
  handleWinKey(e, screen) {
    if (!this.active()) return false;
    const target = e.target || {};
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return false;
    if (e.repeat) return false;
    if (e.ctrlKey || e.metaKey || e.altKey || (e.key !== 'w' && e.key !== 'W')) {
      if (e.key !== 'Shift') this._winCount = 0;
      return false;
    }
    const now = Date.now();
    this._winCount = now - this._winLast > this.WIN_WINDOW_MS ? 1 : this._winCount + 1;
    this._winLast = now;
    if (this._winCount < this.WIN_PRESSES) return false;
    this._winCount = 0;
    const won = this.winNow(screen);
    if (won) this._banner(true, 'SUPER USER: you win!');
    return won;
  },

  // Wins the mini-game on screen, or else the current screen's game.
  winNow(screen) {
    if (typeof store !== 'undefined' && store.get('miniGameActive') && typeof miniGameManager !== 'undefined') {
      const mgr = miniGameManager;
      const game = mgr.currentGame;
      if (!game || game.done) return false;
      mgr.introTime = Math.max(mgr.introTime || 0, MiniGameManager.INTRO_SECONDS);
      // When the bot plays the challenge, you are the other side.
      if (mgr.challengePlayerIsAI) game.lose(); else game.win();
      return true;
    }
    return !!(screen && typeof screen.superWin === 'function' && screen.superWin());
  },

  toggle() {
    const on = !this.active();
    store.set('superUser', on);
    store.saveProgress();
    if (typeof audioManager !== 'undefined') {
      if (on && audioManager.playVictory) audioManager.playVictory();
      else if (audioManager.playSelect) audioManager.playSelect();
    }
    this._banner(on);
    // Rebuild the current menu so locks disappear (or come back) right away.
    const screen = store.get('screen');
    if (this.REFRESH.includes(screen) && typeof switchScreen === 'function') {
      const data = window.currentScreenData;
      switchScreen(screen, screen === 'worldMap' ? undefined : data);
    }
  },

  _banner(on, text) {
    const el = document.createElement('div');
    el.textContent = text || (on ? 'SUPER USER ON: everything unlocked' : 'SUPER USER OFF');
    Object.assign(el.style, {
      position: 'fixed', left: '50%', top: '9%', transform: 'translate(-50%, -12px)', zIndex: 10000,
      padding: '14px 26px', borderRadius: '10px', pointerEvents: 'none',
      font: '700 22px "Pixelify Sans", sans-serif', letterSpacing: '1px',
      color: on ? '#1a1200' : '#f2ead8', background: on ? '#ffd35a' : '#3a3542',
      border: '3px solid ' + (on ? '#fff3c4' : '#8a8494'), boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
      opacity: '0', transition: 'opacity 0.25s, transform 0.25s',
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translate(-50%, 0)'; });
    setTimeout(() => { el.style.opacity = '0'; }, 2200);
    setTimeout(() => el.remove(), 2600);
  },
};
