// A tiny in-memory store for tests that need one (the real Store saves to localStorage).
const store = {
  state: { wallet: { coins: 0, owned: [], planePaint: null, token: null }, unlockedThemes: [], storySaves: [{ maxUnlockedLevel: 1 }], slot: 0 },
  get(k) { return this.state[k]; },
  set(k, v) { this.state[k] = v; },
  update(o) { Object.assign(this.state, o); },
  getActiveSave() { return this.state.storySaves[this.state.slot]; },
  setActiveSave(o) { this.state.storySaves[this.state.slot] = { ...this.state.storySaves[this.state.slot], ...o }; },
  saveProgress() {},
};
let switched = null;
function switchScreen(name, data) { switched = { name, data }; }
