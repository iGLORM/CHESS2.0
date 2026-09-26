// Music and sound effects, all synthesised with Web Audio (no audio files).
// Music: one song per theme (Songs.js) played by MusicPlayer; while a king is
// in check a tense variant plays. Effects: short phrases on Synth instruments.
class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;
    this.musicGain = null;
    this.masterGain = null;
    this.player = null;
    this.currentLoop = null;
    this.suspenseActive = false;
    this.musicPlaying = false;
    this._musicVolume = 0.5;
    this._matchDuck = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Master -> gentle limiter -> speakers, so stacked sounds never clip.
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -10;
      this.limiter.knee.value = 8;
      this.limiter.ratio.value = 6;
      this.limiter.attack.value = 0.004;
      this.limiter.release.value = 0.2;
      this.limiter.connect(this.ctx.destination);
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.9;
      this.masterGain.connect(this.limiter);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.masterGain);
      // A little room on the effects.
      const verb = this.ctx.createConvolver();
      verb.buffer = Synth.reverbBuffer(this.ctx, 1.2, 3);
      this.sfxVerb = this.ctx.createGain();
      this.sfxVerb.gain.value = 0.18;
      this.sfxVerb.connect(verb);
      verb.connect(this.masterGain);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.sfxGain);
      this.sfxBus.connect(this.sfxVerb);

      this._createMusicGain();
      this.initialized = true;
    } catch (e) {}
    const settings = store.get('settings') || {};
    this.enabled = settings.audioEnabled !== false;
    this.setMusicVolume(settings.musicVolume != null ? settings.musicVolume : 0.5);
    this.setSFXVolume(settings.sfxVolume != null ? settings.sfxVolume : 0.5);
  }

  _createMusicGain() {
    if (!this.ctx) return;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this._musicLevel();
    this.musicGain.connect(this.masterGain);
  }

  // Music sits lower during a match so moves and captures come through.
  _musicLevel() {
    return this._musicVolume * 0.7 * (this._matchDuck ? 0.45 : 1);
  }

  setMatchDuck(active) {
    this._matchDuck = !!active;
    if (!this.musicGain || !this.ctx) return;
    const g = this.musicGain.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(this._musicLevel(), now + 0.8);
  }

  _ready() {
    if (!this.initialized) this.init();
    if (!this.enabled || !this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  // Simple tone with a click-free envelope (used by the mini-games).
  _playNote(freq, duration, type, volume, when) {
    if (!this._ready()) return;
    const t = when || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    const end = Synth.env(gain.gain, t, duration * 0.6, volume || 0.15, 0.004, duration * 0.4, 0.5, duration * 0.4);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(t);
    osc.stop(end);
  }

  playTone(freq, duration, type, volume) {
    this._playNote(freq, duration, type, volume);
  }

  // Plays notes [[offsetSeconds, instrument, midi, duration, velocity, opts]].
  _phrase(notes) {
    if (!this._ready()) return;
    const t0 = this.ctx.currentTime + 0.005;
    for (const [dt, inst, midi, dur, vel, opts] of notes) {
      const fn = Synth[inst];
      if (!fn) continue;
      if (midi == null) fn.call(Synth, this.ctx, this.sfxBus, t0 + dt, vel || 1);
      else fn.call(Synth, this.ctx, this.sfxBus, t0 + dt, Synth.mtof(midi), dur, vel || 1, opts || {});
    }
  }

  // ----------------------------------------------------------------- music --

  startMusic() {
    if (!this.enabled || !this.ctx || this.musicPlaying) return;
    this._createMusicGain();
    this.musicPlaying = true;
    this.player = new MusicPlayer(this.ctx, this.musicGain);
    this.player.play(Songs.get(this._getMusicThemeId(), this.suspenseActive), this.ctx.currentTime + 0.1);
    this._scheduleLoop();
  }

  stopMusic() {
    this.musicPlaying = false;
    this.player = null;
    if (this.currentLoop) {
      clearTimeout(this.currentLoop);
      this.currentLoop = null;
    }
    if (this.musicGain && this.ctx) {
      const gain = this.musicGain;
      const now = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.4);
      setTimeout(() => {
        try { gain.disconnect(); } catch (e) {}
      }, 500);
      this.musicGain = null;
    }
  }

  setSuspense(active) {
    const next = !!active;
    if (this.suspenseActive === next) return;
    this.suspenseActive = next;
    if (!this.musicPlaying || !this.player) return;
    // Hand over to the other version at the next bar, keeping the song's
    // place, so a check (often right after a capture challenge) never
    // restarts the song. The old player's already-scheduled notes play out.
    const old = this.player;
    this.player = new MusicPlayer(this.ctx, this.musicGain);
    this.player.play(Songs.get(this._getMusicThemeId(), next), Math.max(old.nextBar, this.ctx.currentTime + 0.05));
    this.player.barIndex = old.barIndex;
  }

  _getMusicThemeId() {
    const themeId = store.get('theme');
    if (themeId === 'custom') {
      return store.get('customMusicTheme') || 'pawnhollow';
    }
    return themeId;
  }

  _scheduleLoop() {
    if (!this.musicPlaying || !this.player) return;
    // Schedule ~1.5 s ahead; the timer may be throttled in the background.
    this.player.scheduleUntil(this.ctx.currentTime + 1.5);
    this.currentLoop = setTimeout(() => this._scheduleLoop(), 250);
  }

  _getThemeAudioProfile(themeId) {
    const profiles = {
      pawnhollow: { root: 60, wave: 'pluck' },
      trainingcamp: { root: 57, wave: 'pluck' },
      slantedsands: { root: 64, wave: 'pluck' },
      ironkeep: { root: 57, wave: 'pluck' },
      mistymoors: { root: 57, wave: 'bell' },
      royalpalace: { root: 65, wave: 'bell' },
      clockworkcitadel: { root: 60, wave: 'bell' },
      grandlibrary: { root: 62, wave: 'bell' },
      forkedgulch: { root: 55, wave: 'pluck' },
      obsidiancourt: { root: 59, wave: 'bell' },
      crystal: { root: 59, wave: 'bell' },
    };
    return profiles[themeId] || profiles.pawnhollow;
  }

  // ---------------------------------------------------------- sound effects --

  playButton() {
    this._phrase([[0, 'bell', 88, 0.05, 0.35, { ratio: 2, index: 0.6, ring: 0.12 }]]);
  }

  playSelect() {
    this._phrase([[0, 'woodblock', null, 0, 0.5]]);
  }

  // Wooden piece set down on the board; heavier pieces sound lower.
  playMove(pieceType) {
    const drop = { pawn: 0, knight: -2, bishop: -2, rook: -4, queen: -5, king: -7 }[pieceType] || 0;
    this._phrase([
      [0, 'tom', null, 0, 0.35],
      [0, 'bell', 79 + drop, 0.08, 0.6, { ratio: 1.5, index: 0.5, ring: 0.15 }],
      [0.012, 'woodblock', null, 0, 0.35],
    ]);
  }

  playCapture() {
    this._phrase([
      [0, 'kick', null, 0, 0.8],
      [0, 'snare', null, 0, 0.5],
      [0.01, 'bell', 50, 0.2, 0.6, { ratio: 1.41, index: 3, ring: 0.35 }],
      [0.06, 'tek', null, 0, 0.5],
    ]);
  }

  playCheck() {
    this._phrase([
      [0, 'brass', 67, 0.14, 1, { open: 5 }],
      [0, 'brass', 72, 0.14, 0.8, { open: 5 }],
      [0.16, 'brass', 68, 0.35, 1, { open: 5 }],
      [0.16, 'brass', 73, 0.35, 0.8, { open: 5 }],
      [0.16, 'taiko', null, 0, 0.6],
    ]);
  }

  playGameOver() {
    const notes = [[0, 67], [0.3, 63], [0.6, 60], [0.9, 55]];
    this._phrase([
      ...notes.map(([dt, m]) => [dt, 'lead', m, 0.35, 0.9, { wave: 'triangle', wave2: 'sine', cutoff: 1400, vib: 10 }]),
      [0.9, 'pad', 48, 1.6, 1.2, { cutoff: 700, attack: 0.1 }],
      [0.9, 'pad', 51, 1.6, 1.2, { cutoff: 700, attack: 0.1 }],
      [0.9, 'pad', 55, 1.6, 1.2, { cutoff: 700, attack: 0.1 }],
    ]);
  }

  playVictory() {
    const fanfare = [[0, 60], [0.14, 64], [0.28, 67], [0.42, 72]];
    this._phrase([
      ...fanfare.map(([dt, m]) => [dt, 'brass', m, 0.16, 1, { open: 6 }]),
      [0.56, 'brass', 72, 0.9, 1, { open: 6 }],
      [0.56, 'brass', 76, 0.9, 0.8, { open: 6 }],
      [0.56, 'brass', 79, 0.9, 0.8, { open: 6 }],
      [0.56, 'bell', 84, 1, 0.7, { ratio: 3.5, index: 1.5, ring: 1.5 }],
      [0.56, 'taiko', null, 0, 0.7],
      [0.56, 'openHat', null, 0, 0.6],
    ]);
  }

  playMiniGameStart() {
    this._phrase([
      [0, 'pluck', 69, 0.1, 0.9, { wave: 'square', bright: 4000 }],
      [0.1, 'pluck', 73, 0.1, 0.9, { wave: 'square', bright: 4000 }],
      [0.2, 'pluck', 76, 0.2, 1, { wave: 'square', bright: 4000 }],
      [0.2, 'hat', null, 0, 0.6],
    ]);
  }

  playMiniGameWin() {
    this._phrase([
      [0, 'bell', 72, 0.1, 0.8, { ratio: 3.5, index: 1.2, ring: 0.4 }],
      [0.09, 'bell', 76, 0.1, 0.8, { ratio: 3.5, index: 1.2, ring: 0.4 }],
      [0.18, 'bell', 79, 0.1, 0.8, { ratio: 3.5, index: 1.2, ring: 0.4 }],
      [0.27, 'bell', 84, 0.5, 1, { ratio: 3.5, index: 1.2, ring: 1.2 }],
      [0.27, 'brass', 72, 0.4, 0.7, { open: 5 }],
      [0.27, 'brass', 76, 0.4, 0.6, { open: 5 }],
    ]);
  }

  playMiniGameLose() {
    this._phrase([
      [0, 'lead', 62, 0.18, 0.8, { wave: 'sawtooth', cutoff: 1200, vib: 30, vibRate: 8 }],
      [0.18, 'lead', 61, 0.18, 0.8, { wave: 'sawtooth', cutoff: 1100, vib: 30, vibRate: 8 }],
      [0.36, 'lead', 60, 0.5, 0.8, { wave: 'sawtooth', cutoff: 900, vib: 40, vibRate: 6 }],
      [0.36, 'tom', null, 0, 0.5],
    ]);
  }

  playError() {
    this._phrase([
      [0, 'lead', 50, 0.1, 0.7, { wave: 'square', cutoff: 900, vib: 0 }],
      [0.12, 'lead', 49, 0.18, 0.7, { wave: 'square', cutoff: 800, vib: 0 }],
    ]);
  }

  playScreenShake() {
    this._phrase([[0, 'taiko', null, 0, 0.9], [0.02, 'kick', null, 0, 0.6]]);
  }

  playDuelStart() {
    this._phrase([
      [0, 'taiko', null, 0, 0.8],
      [0, 'brass', 55, 0.15, 0.9, { open: 4 }],
      [0.22, 'brass', 55, 0.15, 0.9, { open: 4 }],
      [0.5, 'brass', 62, 0.45, 1, { open: 6 }],
      [0.5, 'taiko', null, 0, 1],
    ]);
  }

  playTileLock() {
    this._phrase([[0, 'woodblock', null, 0, 0.8], [0.05, 'tom', null, 0, 0.4]]);
  }

  playPromotion() {
    this._phrase([67, 71, 74, 79, 83].map((m, i) => [i * 0.07, 'bell', m, 0.3, 0.7, { ratio: 3.5, index: 1.4, ring: 0.9 }]));
  }

  playThemeStinger(themeId) {
    const p = this._getThemeAudioProfile(themeId || this._getMusicThemeId());
    const inst = p.wave;
    this._phrase([0, 4, 7, 12].map((iv, i) => [i * 0.08, inst, p.root + iv, 0.3, 0.8, { ratio: 3.5, index: 1.2, ring: 0.8, bright: 3500 }]));
  }

  destroy() {
    this.stopMusic();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.initialized = false;
  }

  setEnabled(val) {
    this.enabled = val;
    if (val && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!val) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
  }

  setMusicVolume(vol) {
    this._musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain) {
      this.musicGain.gain.cancelScheduledValues(0);
      this.musicGain.gain.value = this._musicLevel();
    }
  }

  setSFXVolume(vol) {
    const v = Math.max(0, Math.min(1, vol));
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }
}

const audioManager = new AudioManager();
