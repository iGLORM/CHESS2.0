// Web Audio instruments for the music and sound effects. Every instrument is
// a function (ctx, out, time, freq, duration, velocity, opts) that schedules
// its own short-lived nodes, so it works with a live AudioContext or an
// OfflineAudioContext alike.
const Synth = {
  _noise: new WeakMap(),
  _curves: {},

  mtof(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  },

  noiseBuffer(ctx) {
    let buf = this._noise.get(ctx);
    if (!buf) {
      buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this._noise.set(ctx, buf);
    }
    return buf;
  },

  // Stereo impulse response: decaying noise with a darker tail.
  reverbBuffer(ctx, seconds = 2.6, decay = 2.8) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        lp += (Math.random() * 2 - 1 - lp) * (0.9 - t * 0.7);
        d[i] = lp * Math.pow(1 - t, decay);
      }
    }
    return buf;
  },

  // Attack / decay-to-sustain / release on a gain param. Never starts at 0
  // with an exponential ramp, and never clicks.
  env(param, t, dur, peak, a = 0.005, d = 0.1, s = 0.6, r = 0.08) {
    const sus = Math.max(0.0001, peak * s);
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(peak, t + a);
    param.setTargetAtTime(sus, t + a, d / 3);
    const end = t + Math.max(dur, a + 0.01);
    param.setTargetAtTime(0.0001, end, r / 3);
    return end + r * 1.5;
  },

  _osc(ctx, type, freq, t, detune = 0) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (detune) o.detune.setValueAtTime(detune, t);
    return o;
  },

  _vibrato(ctx, osc, t, rate, cents, delay = 0.25) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = rate;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(cents, t + delay + 0.2);
    lfo.connect(depth);
    depth.connect(osc.detune);
    return lfo; // the caller starts and stops it with the note
  },

  // ---------------------------------------------------------------- tones --

  // Warm detuned-saw pad through a low-pass filter; slow swell.
  pad(ctx, out, t, f, dur, vel = 1, o = {}) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(o.cutoff || 1200, t);
    lp.Q.value = 0.4;
    const oscs = [-7, 7].map(det => this._osc(ctx, o.wave || 'sawtooth', f, t, det));
    if (o.sub) oscs.push(this._osc(ctx, 'sine', f / 2, t));
    oscs.forEach(x => x.connect(lp));
    lp.connect(g);
    g.connect(out);
    const end = this.env(g.gain, t, dur, 0.05 * vel, o.attack || 0.6, 0.8, 0.8, o.release || 1.2);
    oscs.forEach(x => { x.start(t); x.stop(end); });
  },

  // Plucked string (lute, harp, koto, oud, guitar): bright attack that dulls.
  pluck(ctx, out, t, f, dur, vel = 1, o = {}) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    const bright = o.bright || 3500;
    lp.frequency.setValueAtTime(bright, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.5), t + (o.damp || 0.35));
    lp.Q.value = o.q || 1.2;
    const a = this._osc(ctx, 'triangle', f, t);
    const b = this._osc(ctx, o.wave || 'sawtooth', f, t, 4);
    const bg = ctx.createGain();
    bg.gain.value = o.body != null ? o.body : 0.35;
    a.connect(lp);
    b.connect(bg);
    bg.connect(lp);
    lp.connect(g);
    g.connect(out);
    const ring = Math.min(dur + 0.4, o.ring || 1.4);
    const end = this.env(g.gain, t, ring * 0.2, 0.16 * vel, 0.003, ring * 0.6, 0.15, ring * 0.5);
    [a, b].forEach(x => { x.start(t); x.stop(end); });
  },

  // FM bell / marimba / music box / glass.
  bell(ctx, out, t, f, dur, vel = 1, o = {}) {
    const car = this._osc(ctx, 'sine', f, t);
    const mod = this._osc(ctx, 'sine', f * (o.ratio || 3.5), t);
    const mg = ctx.createGain();
    const idx = f * (o.index || 2.2);
    mg.gain.setValueAtTime(idx, t);
    mg.gain.exponentialRampToValueAtTime(Math.max(1, idx * 0.05), t + (o.bright || 0.6));
    mod.connect(mg);
    mg.connect(car.frequency);
    const g = ctx.createGain();
    car.connect(g);
    g.connect(out);
    const ring = o.ring || 1.8;
    const end = this.env(g.gain, t, 0.01, 0.12 * vel, 0.002, ring, 0.0001, 0.1);
    [car, mod].forEach(x => { x.start(t); x.stop(end + ring); });
  },

  // Round bass: sine + soft triangle, short pluck or held.
  bass(ctx, out, t, f, dur, vel = 1, o = {}) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(o.cutoff || 700, t);
    const a = this._osc(ctx, o.wave || 'triangle', f, t);
    const b = this._osc(ctx, 'sine', f, t);
    a.connect(lp);
    b.connect(lp);
    lp.connect(g);
    g.connect(out);
    const end = this.env(g.gain, t, dur * (o.gate || 0.85), 0.22 * vel, 0.006, 0.25, o.sustain != null ? o.sustain : 0.7, 0.08);
    [a, b].forEach(x => { x.start(t); x.stop(end); });
  },

  // Synth/reed lead with delayed vibrato (harmonica, calliope, synth lead).
  lead(ctx, out, t, f, dur, vel = 1, o = {}) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(o.cutoff || 2400, t);
    lp.Q.value = o.q || 0.8;
    const a = this._osc(ctx, o.wave || 'square', f, t);
    const b = this._osc(ctx, o.wave2 || 'sawtooth', f, t, o.detune || 6);
    const bg = ctx.createGain();
    bg.gain.value = o.mix2 != null ? o.mix2 : 0.4;
    a.connect(lp);
    b.connect(bg);
    bg.connect(lp);
    lp.connect(g);
    g.connect(out);
    const lfos = [this._vibrato(ctx, a, t, o.vibRate || 5.5, o.vib || 14), this._vibrato(ctx, b, t, o.vibRate || 5.5, o.vib || 14)];
    const end = this.env(g.gain, t, dur * 0.92, 0.07 * vel, o.attack || 0.02, 0.2, 0.75, o.release || 0.12);
    [a, b, ...lfos].forEach(x => { x.start(t); x.stop(end); });
  },

  // Breathy flute / ney / shakuhachi: sine + a little noise, slow vibrato.
  flute(ctx, out, t, f, dur, vel = 1, o = {}) {
    const g = ctx.createGain();
    const a = this._osc(ctx, 'sine', f, t);
    const h = this._osc(ctx, 'triangle', f * 2, t);
    const hg = ctx.createGain();
    hg.gain.value = o.edge || 0.12;
    a.connect(g);
    h.connect(hg);
    hg.connect(g);
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 2;
    bp.Q.value = 2;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime((o.breath || 0.25) * 0.09 * vel, t + 0.04);
    ng.gain.setTargetAtTime(0.012 * vel, t + 0.05, 0.08);
    n.connect(bp);
    bp.connect(ng);
    ng.connect(out);
    g.connect(out);
    const lfos = [this._vibrato(ctx, a, t, o.vibRate || 5, o.vib || 16, 0.35), this._vibrato(ctx, h, t, o.vibRate || 5, o.vib || 16, 0.35)];
    const end = this.env(g.gain, t, dur * 0.95, 0.1 * vel, o.attack || 0.06, 0.2, 0.85, 0.15);
    ng.gain.setTargetAtTime(0.0001, t + dur * 0.95, 0.05);
    [a, h, n, ...lfos].forEach(x => { x.start(t); x.stop(end); });
  },

  // Brass section: saw with an opening filter (swell or stab).
  brass(ctx, out, t, f, dur, vel = 1, o = {}) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 1.5;
    lp.frequency.setValueAtTime(f * 1.2, t);
    lp.frequency.linearRampToValueAtTime(f * (o.open || 5), t + (o.swell || 0.08));
    lp.frequency.setTargetAtTime(f * 2.5, t + (o.swell || 0.08), 0.2);
    const a = this._osc(ctx, 'sawtooth', f, t, -5);
    const b = this._osc(ctx, 'sawtooth', f, t, 5);
    a.connect(lp);
    b.connect(lp);
    lp.connect(g);
    g.connect(out);
    const end = this.env(g.gain, t, dur * 0.9, 0.06 * vel, o.attack || 0.03, 0.2, 0.7, 0.1);
    [a, b].forEach(x => { x.start(t); x.stop(end); });
  },

  // Airy choir: stacked sines through two formant band-passes.
  choir(ctx, out, t, f, dur, vel = 1, o = {}) {
    const g = ctx.createGain();
    const mixN = ctx.createGain();
    const oscs = [-9, 0, 9].map(det => this._osc(ctx, 'sawtooth', f, t, det));
    oscs.forEach(x => x.connect(mixN));
    [700, 1150].forEach(ff => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = ff;
      bp.Q.value = 5;
      mixN.connect(bp);
      bp.connect(g);
    });
    g.connect(out);
    const end = this.env(g.gain, t, dur, 0.09 * vel, o.attack || 0.8, 1, 0.85, 1.4);
    oscs.forEach(x => { x.start(t); x.stop(end); });
  },

  // ---------------------------------------------------------------- drums --

  _noiseHit(ctx, out, t, vel, type, freq, q, decay, peak) {
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer(ctx);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak * vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    n.connect(f);
    f.connect(g);
    g.connect(out);
    n.start(t, Math.random() * 1.5);
    n.stop(t + decay + 0.02);
  },

  _tone(ctx, out, t, vel, f0, f1, sweep, decay, peak, type = 'sine') {
    const o = this._osc(ctx, type, f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak * vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + decay + 0.02);
  },

  kick(ctx, out, t, vel = 1) {
    this._tone(ctx, out, t, vel, 150, 42, 0.12, 0.42, 0.9);
    this._noiseHit(ctx, out, t, vel, 'lowpass', 1800, 0.7, 0.02, 0.2);
  },

  snare(ctx, out, t, vel = 1) {
    this._noiseHit(ctx, out, t, vel, 'bandpass', 2200, 0.8, 0.18, 0.5);
    this._tone(ctx, out, t, vel, 240, 160, 0.05, 0.1, 0.3, 'triangle');
  },

  clap(ctx, out, t, vel = 1) {
    [0, 0.012, 0.024].forEach(d => this._noiseHit(ctx, out, t + d, vel, 'bandpass', 1400, 1.2, 0.09, 0.35));
  },

  hat(ctx, out, t, vel = 1) {
    this._noiseHit(ctx, out, t, vel, 'highpass', 8000, 0.7, 0.045, 0.22);
  },

  openHat(ctx, out, t, vel = 1) {
    this._noiseHit(ctx, out, t, vel, 'highpass', 7000, 0.7, 0.22, 0.16);
  },

  shaker(ctx, out, t, vel = 1) {
    this._noiseHit(ctx, out, t, vel, 'bandpass', 6000, 1.5, 0.06, 0.18);
  },

  // Brushes on a snare for swing.
  brush(ctx, out, t, vel = 1) {
    this._noiseHit(ctx, out, t, vel, 'bandpass', 3500, 0.6, 0.14, 0.14);
  },

  ride(ctx, out, t, vel = 1) {
    this._noiseHit(ctx, out, t, vel, 'bandpass', 5500, 3, 0.35, 0.1);
    this._tone(ctx, out, t, vel, 3200, 3100, 0.3, 0.3, 0.012, 'square');
  },

  taiko(ctx, out, t, vel = 1) {
    this._tone(ctx, out, t, vel, 130, 55, 0.18, 0.7, 0.9);
    this._noiseHit(ctx, out, t, vel, 'lowpass', 600, 0.8, 0.12, 0.35);
  },

  tom(ctx, out, t, vel = 1) {
    this._tone(ctx, out, t, vel, 220, 110, 0.12, 0.3, 0.55);
  },

  // Darbuka: 'doum' is low, 'tek' is a bright rim hit.
  doum(ctx, out, t, vel = 1) {
    this._tone(ctx, out, t, vel, 110, 70, 0.1, 0.35, 0.8);
  },

  tek(ctx, out, t, vel = 1) {
    this._noiseHit(ctx, out, t, vel, 'highpass', 3000, 1, 0.05, 0.4);
    this._tone(ctx, out, t, vel, 900, 700, 0.02, 0.05, 0.15, 'triangle');
  },

  woodblock(ctx, out, t, vel = 1) {
    this._tone(ctx, out, t, vel, 1200, 1000, 0.02, 0.07, 0.35, 'sine');
  },

  tick(ctx, out, t, vel = 1) {
    this._tone(ctx, out, t, vel, 3000, 2600, 0.01, 0.025, 0.2, 'square');
  },
};
