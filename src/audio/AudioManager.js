class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;
    this.musicGain = null;
    this.masterGain = null;
    this.currentLoop = null;
    this.nextLoopTime = 0;
    this.bpm = 100;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);

      this._createMusicGain();

      this.initialized = true;
    } catch (e) {}
    const settings = store.get('settings') || {};
    this.enabled = settings.audioEnabled !== false;
    this.setMusicVolume(settings.musicVolume || 0.5);
    this.setMasterVolume(settings.sfxVolume || 0.5);
  }

  _createMusicGain() {
    if (this.musicGain) {
      try { this.musicGain.disconnect(); } catch (e) {}
    }
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.12;
    this.musicGain.connect(this.masterGain);
  }

  _playNote(freq, duration, type, volume, when, isMusic) {
    if (!this.enabled || !this.ctx) return;
    const t = when || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume || 0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(isMusic ? this.musicGain : this.masterGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  playTone(freq, duration, type, volume) {
    this._playNote(freq, duration, type, volume);
  }

  _playChord(freqs, duration, volume, when) {
    if (!this.enabled || !this.ctx) return;
    freqs.forEach(f => this._playNote(f, duration, 'triangle', volume, when, true));
  }

  // --- Pentatonic melody composition ---
  // C major pentatonic: C, D, E, G, A (261.63, 293.66, 329.63, 392.00, 440.00)
  // A minor pentatonic: A, C, D, E, G (220.00, 261.63, 293.66, 329.63, 392.00)
  // F major pentatonic: F, G, A, C, D (349.23, 392.00, 440.00, 523.25, 587.33)

  startMusic() {
    if (!this.enabled || !this.ctx || this.musicPlaying) return;
    this._createMusicGain();
    this.musicPlaying = true;
    this.nextLoopTime = this.ctx.currentTime + 0.1;
    this._scheduleLoop();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.currentLoop) {
      clearTimeout(this.currentLoop);
      this.currentLoop = null;
    }
    // Disconnect old music gain to silence all scheduled music notes
    if (this.musicGain) {
      this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
      try { this.musicGain.disconnect(); } catch (e) {}
    }
  }

  _getMusicThemeId() {
    const themeId = store.get('theme');
    if (themeId === 'custom') {
      return store.get('customMusicTheme') || 'space';
    }
    return themeId;
  }

  _scheduleLoop() {
    if (!this.musicPlaying) return;
    const themeId = this._getMusicThemeId();
    const bpm = this._getThemeBPM(themeId);
    const beat = 60 / bpm;
    const now = this.ctx.currentTime;

    // Schedule 4 bars ahead
    while (this.nextLoopTime < now + 4 * beat * 4) {
      this._playBar(this.nextLoopTime, beat);
      this.nextLoopTime += beat * 4;
    }

    this.currentLoop = setTimeout(() => this._scheduleLoop(), 500);
  }

  _getThemeBPM(themeId) {
    switch (themeId) {
      case 'cyberpunk': return 120;
      case 'prehistoric': return 90;
      case 'wildwest': return 70;
      case 'medieval': return 80;
      case 'steampunk': return 110;
      case 'ocean': return 60;
      case 'space': return 50;
      case 'japanese': return 65;
      case 'artdeco': return 100;
      case 'egypt': return 75;
      default: return 80;
    }
  }

  _playBar(startTime, beat) {
    if (!this.musicPlaying) return;
    const themeId = this._getMusicThemeId();
    switch (themeId) {
      case 'space': this._playSpaceBar(startTime, beat); break;
      case 'medieval': this._playMedievalBar(startTime, beat); break;
      case 'ocean': this._playOceanBar(startTime, beat); break;
      case 'egypt': this._playEgyptBar(startTime, beat); break;
      case 'cyberpunk': this._playCyberpunkBar(startTime, beat); break;
      case 'japanese': this._playJapaneseBar(startTime, beat); break;
      case 'artdeco': this._playArtDecoBar(startTime, beat); break;
      case 'wildwest': this._playWildWestBar(startTime, beat); break;
      case 'prehistoric': this._playPrehistoricBar(startTime, beat); break;
      case 'steampunk': this._playSteampunkBar(startTime, beat); break;
      default: this._playSpaceBar(startTime, beat); break;
    }
  }

  // --- Theme-specific music bars ---

  _playSpaceBar(startTime, beat) {
    // Ambient ethereal pads + slow arpeggios
    const b = beat * 2; // half speed
    const roots = [174.61, 196.00, 220.00, 196.00]; // F3, G3, A3
    const intervals = [[0, 4, 7, 11], [0, 3, 7, 10], [0, 4, 7, 11], [0, 3, 7, 10]];
    for (let bar = 0; bar < 2; bar++) {
      const r = roots[bar % 4];
      const freqs = intervals[bar % 4].map(semi => r * Math.pow(2, semi / 12));
      this._playChord(freqs, b * 2, 0.025, startTime + bar * b);
    }
    // High twinkling notes
    const twinkle = [698.46, 783.99, 880.00, 1046.50, 1174.66];
    for (let i = 0; i < 6; i++) {
      const f = twinkle[Math.floor(Math.random() * twinkle.length)];
      const t = startTime + i * b * 0.6 + Math.random() * 0.2;
      this._playNote(f, b * 0.8, 'sine', 0.03, t, true);
    }
  }

  _playMedievalBar(startTime, beat) {
    // Dorian mode (minor with raised 6th) - medieval feel
    const bass = [146.83, 164.81, 174.61, 196.00, 220.00, 196.00, 174.61, 164.81];
    bass.forEach((f, i) => this._playNote(f, beat * 0.7, 'square', 0.035, startTime + i * beat * 0.5, true));
    // Lute-like melody
    const melody = [
      { f: 587.33, d: 0.5 }, { f: 523.25, d: 0.5 }, { f: 587.33, d: 1.0 },
      { f: 659.25, d: 0.5 }, { f: 587.33, d: 0.5 }, { f: 523.25, d: 1.0 },
      { f: 440.00, d: 0.5 }, { f: 392.00, d: 0.5 },
    ];
    let t = startTime;
    melody.forEach(({ f, d }) => {
      this._playNote(f, d * beat * 0.9, 'triangle', 0.05, t, true);
      t += d * beat;
    });
    // Drone
    this._playNote(146.83, beat * 4, 'sine', 0.03, startTime, true);
  }

  _playOceanBar(startTime, beat) {
    // Flowing 6/8 feel, wave-like arpeggios
    const arp = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63];
    arp.forEach((f, i) => this._playNote(f, beat * 0.6, 'sine', 0.04, startTime + i * beat * 0.66, true));
    // Deep swell
    this._playNote(130.81, beat * 3, 'sine', 0.04, startTime, true);
    this._playNote(164.81, beat * 3, 'sine', 0.03, startTime + beat, true);
    // Sparkle
    const sparkle = [523.25, 587.33, 659.25, 783.99];
    sparkle.forEach((f, i) => this._playNote(f, beat * 0.4, 'triangle', 0.025, startTime + i * beat * 0.5 + beat * 2, true));
  }

  _playEgyptBar(startTime, beat) {
    // Phrygian dominant - mysterious desert scale
    const scale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
    // Bass drone on root
    this._playNote(130.81, beat * 4, 'sine', 0.04, startTime, true);
    // Plucked melody
    const melody = [329.63, 392.00, 440.00, 523.25, 440.00, 392.00, 349.23, 329.63];
    melody.forEach((f, i) => this._playNote(f, beat * 0.5, 'triangle', 0.04, startTime + i * beat * 0.5, true));
    // Percussive clicks
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) this._playNote(800, 0.03, 'square', 0.02, startTime + i * beat * 0.5, true);
    }
  }

  _playCyberpunkBar(startTime, beat) {
    // Driving bass + synthwave arpeggios
    const bass = [65.41, 65.41, 73.42, 65.41, 87.31, 65.41, 73.42, 65.41];
    bass.forEach((f, i) => this._playNote(f, beat * 0.45, 'sawtooth', 0.05, startTime + i * beat * 0.5, true));
    // Arp
    const arp = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 493.88];
    arp.forEach((f, i) => this._playNote(f, beat * 0.35, 'square', 0.035, startTime + i * beat * 0.5 + beat * 0.25, true));
    // Pad chord
    const chord = [261.63, 329.63, 392.00];
    this._playChord(chord, beat * 2, 0.025, startTime);
  }

  _playJapaneseBar(startTime, beat) {
    // A minor pentatonic - koto/shakuhachi feel
    const scale = [220.00, 261.63, 293.66, 329.63, 392.00];
    // Plucked pentatonic melody
    const melody = [
      { f: 440.00, d: 0.75 }, { f: 523.25, d: 0.25 }, { f: 587.33, d: 1.0 },
      { f: 523.25, d: 0.5 }, { f: 440.00, d: 0.5 }, { f: 392.00, d: 1.0 },
    ];
    let t = startTime;
    melody.forEach(({ f, d }) => {
      this._playNote(f, d * beat * 0.85, 'triangle', 0.05, t, true);
      t += d * beat;
    });
    // Low drone
    this._playNote(110.00, beat * 4, 'sine', 0.03, startTime, true);
    // Bell-like accents
    const bells = [880.00, 1046.50, 783.99];
    bells.forEach((f, i) => this._playNote(f, beat * 0.6, 'sine', 0.025, startTime + i * beat * 1.5 + beat, true));
  }

  _playArtDecoBar(startTime, beat) {
    // Jazz / swing feel - brassy chords + walking bass
    const bass = [130.81, 146.83, 164.81, 174.61, 196.00, 174.61, 164.81, 146.83];
    bass.forEach((f, i) => this._playNote(f, beat * 0.55, 'square', 0.03, startTime + i * beat * 0.5, true));
    // Brass stabs
    const chords = [
      [261.63, 329.63, 392.00], [293.66, 349.23, 440.00],
      [329.63, 392.00, 493.88], [293.66, 349.23, 440.00],
    ];
    chords.forEach((c, i) => this._playChord(c, beat, 0.025, startTime + i * beat));
    // High trumpet accents
    const accents = [659.25, 783.99, 880.00, 1046.50];
    accents.forEach((f, i) => this._playNote(f, beat * 0.4, 'triangle', 0.035, startTime + i * beat + beat * 0.5, true));
  }

  _playWildWestBar(startTime, beat) {
    // Slow, lonely harmonica + acoustic bass
    const bass = [82.41, 82.41, 98.00, 82.41, 110.00, 82.41, 98.00, 82.41];
    bass.forEach((f, i) => this._playNote(f, beat * 0.7, 'triangle', 0.035, startTime + i * beat * 0.5, true));
    // Harmonica melody
    const melody = [
      { f: 493.88, d: 1.0 }, { f: 440.00, d: 0.5 }, { f: 392.00, d: 1.0 },
      { f: 440.00, d: 0.5 }, { f: 493.88, d: 1.5 },
    ];
    let t = startTime;
    melody.forEach(({ f, d }) => {
      this._playNote(f, d * beat * 0.9, 'sine', 0.04, t, true);
      t += d * beat;
    });
    // Sparse high notes
    this._playNote(587.33, beat * 0.5, 'triangle', 0.025, startTime + beat * 2, true);
    this._playNote(659.25, beat * 0.5, 'triangle', 0.025, startTime + beat * 3, true);
  }

  _playPrehistoricBar(startTime, beat) {
    // Tribal drums + primitive flute
    // Drum pattern
    const drumPattern = [1, 0, 1, 1, 0, 1, 0, 1];
    drumPattern.forEach((hit, i) => {
      if (hit) this._playNote(60, 0.08, 'square', 0.06, startTime + i * beat * 0.5, true);
    });
    // Flute melody (pentatonic)
    const flute = [
      { f: 392.00, d: 0.5 }, { f: 440.00, d: 0.5 }, { f: 523.25, d: 0.5 },
      { f: 440.00, d: 0.5 }, { f: 392.00, d: 1.0 },
    ];
    let t = startTime;
    flute.forEach(({ f, d }) => {
      this._playNote(f, d * beat * 0.8, 'triangle', 0.035, t, true);
      t += d * beat;
    });
    // Low drone
    this._playNote(130.81, beat * 4, 'sine', 0.025, startTime, true);
  }

  _playSteampunkBar(startTime, beat) {
    // Mechanical, brass-band feel - oom-pah + melody
    // Bass oom-pah
    const oompah = [130.81, 164.81, 130.81, 164.81, 146.83, 174.61, 146.83, 174.61];
    oompah.forEach((f, i) => this._playNote(f, beat * 0.45, 'square', 0.04, startTime + i * beat * 0.5, true));
    // Brass melody
    const melody = [
      { f: 392.00, d: 0.5 }, { f: 440.00, d: 0.5 }, { f: 523.25, d: 0.5 }, { f: 440.00, d: 0.5 },
      { f: 392.00, d: 0.5 }, { f: 349.23, d: 0.5 }, { f: 329.63, d: 1.0 },
    ];
    let t = startTime;
    melody.forEach(({ f, d }) => {
      this._playNote(f, d * beat * 0.85, 'sawtooth', 0.035, t, true);
      t += d * beat;
    });
    // High whistle
    this._playNote(783.99, beat * 0.3, 'triangle', 0.025, startTime + beat * 2.5, true);
    this._playNote(880.00, beat * 0.3, 'triangle', 0.025, startTime + beat * 3, true);
  }

  // --- Sound Effects ---
  playMove() {
    this._playNote(329.63, 0.08, 'triangle', 0.06);
    setTimeout(() => this._playNote(392.00, 0.06, 'triangle', 0.04), 50);
  }

  playSelect() {
    this._playNote(440, 0.05, 'triangle', 0.05);
  }

  playCapture() {
    // Hit sound
    this._playNote(150, 0.12, 'square', 0.12);
    setTimeout(() => this._playNote(100, 0.15, 'sawtooth', 0.1), 80);
    setTimeout(() => this._playNote(80, 0.2, 'sawtooth', 0.08), 160);
    // Debris
    setTimeout(() => this._playNote(600, 0.03, 'square', 0.05), 100);
    setTimeout(() => this._playNote(800, 0.03, 'square', 0.05), 150);
  }

  playCheck() {
    this._playNote(523.25, 0.12, 'square', 0.1);
    setTimeout(() => this._playNote(659.25, 0.15, 'square', 0.1), 120);
    setTimeout(() => this._playNote(783.99, 0.2, 'square', 0.08), 240);
  }

  playGameOver() {
    const notes = [523, 440, 349, 261];
    notes.forEach((n, i) => {
      setTimeout(() => this._playNote(n, 0.3, 'sine', 0.1), i * 250);
    });
  }

  playVictory() {
    const notes = [523, 659, 783, 1046];
    notes.forEach((n, i) => {
      setTimeout(() => this._playNote(n, 0.4, 'triangle', 0.1), i * 200);
    });
  }

  playMiniGameStart() {
    this._playNote(440, 0.1, 'square', 0.08);
    setTimeout(() => this._playNote(554, 0.1, 'square', 0.08), 100);
    setTimeout(() => this._playNote(659, 0.15, 'square', 0.08), 200);
  }

  playMiniGameWin() {
    this._playNote(523, 0.1, 'square', 0.1);
    setTimeout(() => this._playNote(659, 0.1, 'square', 0.1), 100);
    setTimeout(() => this._playNote(783, 0.15, 'square', 0.1), 200);
    setTimeout(() => this._playNote(1046, 0.2, 'triangle', 0.12), 300);
  }

  playMiniGameLose() {
    this._playNote(300, 0.15, 'sawtooth', 0.1);
    setTimeout(() => this._playNote(250, 0.2, 'sawtooth', 0.1), 150);
    setTimeout(() => this._playNote(200, 0.3, 'sawtooth', 0.08), 300);
  }

  playScreenShake() {
    this._playNote(80, 0.1, 'sawtooth', 0.15);
    this._playNote(60, 0.15, 'sawtooth', 0.12);
  }

  playDuelStart() {
    this._playNote(330, 0.15, 'square', 0.08);
    setTimeout(() => this._playNote(330, 0.15, 'square', 0.08), 200);
    setTimeout(() => this._playNote(440, 0.3, 'square', 0.12), 500);
  }

  playTileLock() {
    this._playNote(200, 0.1, 'square', 0.06);
    setTimeout(() => this._playNote(150, 0.15, 'square', 0.04), 80);
  }

  playPromotion() {
    this._playNote(440, 0.1, 'triangle', 0.08);
    setTimeout(() => this._playNote(554, 0.1, 'triangle', 0.08), 100);
    setTimeout(() => this._playNote(659, 0.15, 'triangle', 0.1), 200);
  }

  setEnabled(val) {
    this.enabled = val;
    if (val && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!val) {
      this.stopMusic();
    } else if (val) {
      this.startMusic();
    }
  }

  setMusicVolume(vol) {
    const v = Math.max(0, Math.min(1, vol));
    if (this.musicGain) this.musicGain.gain.value = v * 0.3;
  }

  setMasterVolume(vol) {
    const v = Math.max(0, Math.min(1, vol));
    if (this.masterGain) this.masterGain.gain.value = v * 0.6;
  }
}

const audioManager = new AudioManager();
