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

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.12;
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {}
    this.enabled = store.get('settings').audioEnabled;
  }

  _playNote(freq, duration, type, volume, when) {
    if (!this.enabled || !this.ctx) return;
    const t = when || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume || 0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  playTone(freq, duration, type, volume) {
    this._playNote(freq, duration, type, volume);
  }

  _playChord(freqs, duration, volume, when) {
    if (!this.enabled || !this.ctx) return;
    freqs.forEach(f => this._playNote(f, duration, 'triangle', volume, when));
  }

  // --- Pentatonic melody composition ---
  // C major pentatonic: C, D, E, G, A (261.63, 293.66, 329.63, 392.00, 440.00)
  // A minor pentatonic: A, C, D, E, G (220.00, 261.63, 293.66, 329.63, 392.00)
  // F major pentatonic: F, G, A, C, D (349.23, 392.00, 440.00, 523.25, 587.33)

  startMusic() {
    if (!this.enabled || !this.ctx || this.musicPlaying) return;
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
  }

  _scheduleLoop() {
    if (!this.musicPlaying) return;
    const beat = 60 / this.bpm;
    const now = this.ctx.currentTime;

    // Schedule 4 bars ahead
    while (this.nextLoopTime < now + 4 * beat * 4) {
      this._playBar(this.nextLoopTime, beat);
      this.nextLoopTime += beat * 4;
    }

    this.currentLoop = setTimeout(() => this._scheduleLoop(), 500);
  }

  _playBar(startTime, beat) {
    if (!this.musicPlaying) return;

    // Bassline - simple walking pattern
    const bassNotes = [130.81, 146.83, 164.81, 196.00, 220.00, 196.00, 164.81, 146.83]; // C3 pentatonic
    bassNotes.forEach((freq, i) => {
      this._playNote(freq, beat * 0.8, 'square', 0.04, startTime + i * beat * 0.5);
    });

    // Melody - gentle pentatonic phrase
    const melodyNotes = [
      { f: 523.25, d: 0.5 }, // C5
      { f: 587.33, d: 0.5 }, // D5
      { f: 659.25, d: 1.0 }, // E5
      { f: 523.25, d: 0.5 },
      { f: 440.00, d: 0.5 },
      { f: 392.00, d: 1.0 },
      { f: 440.00, d: 0.5 },
      { f: 523.25, d: 0.5 },
    ];

    let t = startTime;
    melodyNotes.forEach(({ f, d }) => {
      this._playNote(f, d * beat * 0.9, 'triangle', 0.06, t);
      t += d * beat;
    });

    // Harmony chords - gentle pads
    const chordRoots = [261.63, 329.63, 392.00, 293.66];
    const chordIntervals = [[0, 4, 7], [0, 3, 7], [0, 4, 7], [0, 3, 7]];

    for (let bar = 0; bar < 4; bar++) {
      const root = chordRoots[bar % 4];
      const intervals = chordIntervals[bar % 4];
      const freqs = intervals.map(semi => root * Math.pow(2, semi / 12));
      this._playChord(freqs, beat * 2, 0.02, startTime + bar * beat);
    }
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
}

const audioManager = new AudioManager();
