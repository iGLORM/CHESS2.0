// Plays a song from Songs.js: schedules bars ahead of time on an AudioContext
// (or an OfflineAudioContext, for rendering to a file). Melodies are written
// once per section from a two-bar motif, so each section has a tune that
// comes back every time the song loops.
class MusicPlayer {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.input.connect(out);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = Synth.reverbBuffer(ctx);
    this.reverbIn = ctx.createGain();
    this.reverbIn.connect(this.reverb);
    this.reverb.connect(this.input);
    this.buses = {};
  }

  play(song, startTime) {
    this.song = song;
    this.beat = 60 / song.bpm;
    this.barLen = this.beat * 4;
    this.nextBar = startTime;
    this.barIndex = 0;
    this.harmony = Songs.SCALES[song.harmony] || Songs.SCALES.major;
    this.melodyScale = Songs.SCALES[song.melody || song.harmony] || this.harmony;
    this.reverbIn.gain.value = song.reverb != null ? song.reverb : 0.4;
    this.input.gain.value = song.level || 1; // evens out loudness between songs

    // Section lookup: bar index within the looped song -> [section, bar in section].
    this.map = [];
    song.sections.forEach((s, si) => { for (let b = 0; b < s.bars; b++) this.map.push([si, b]); });

    this._rng = this._seeded(song.bpm * 131 + song.root);
    this.melodies = song.sections.map(s => this._writeMelody(s));
  }

  // Schedules every bar that starts before `time`.
  scheduleUntil(time) {
    if (!this.song) return;
    while (this.nextBar < time) {
      const [si, bar] = this.map[this.barIndex % this.map.length];
      this._renderBar(this.song.sections[si], si, bar, this.nextBar);
      this.nextBar += this.barLen;
      this.barIndex++;
    }
  }

  // ------------------------------------------------------------- helpers --

  _seeded(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  _bus(name, voice) {
    if (this.buses[name]) return this.buses[name];
    const g = this.ctx.createGain();
    g.gain.value = voice.vel != null ? voice.vel : 1;
    g.connect(this.input);
    const send = this.ctx.createGain();
    send.gain.value = voice.verb != null ? voice.verb : 0.3;
    g.connect(send);
    send.connect(this.reverbIn);
    this.buses[name] = g;
    return g;
  }

  // Chord for a scale degree as semitone offsets from the key root.
  _chord(degree) {
    const s = this.harmony;
    const n = this.song.sevenths ? 4 : 3;
    const out = [];
    for (let k = 0; k < n; k++) {
      const i = degree + k * 2;
      out.push(s[i % 7] + 12 * Math.floor(i / 7));
    }
    // Keep every chord near the tonic so the bass and pads don't leap.
    return out[0] >= 7 ? out.map(x => x - 12) : out;
  }

  _chordAt(section, bar) {
    return this._chord(section.prog[bar % section.prog.length]);
  }

  _swing(beatPos) {
    const sw = this.song.swing || 0;
    const frac = beatPos % 1;
    return Math.abs(frac - 0.5) < 1e-6 ? beatPos + sw * 0.5 : beatPos;
  }

  _play(inst, bus, t, midi, dur, vel, opts) {
    const fn = Synth[inst];
    if (!fn) return;
    const human = (Math.random() - 0.5) * 0.008;
    fn.call(Synth, this.ctx, bus, Math.max(this.ctx.currentTime, t + human), Synth.mtof(midi), dur,
      vel * (0.92 + Math.random() * 0.16), opts || {});
  }

  // ------------------------------------------------------------- melody --

  _writeMelody(section) {
    const rng = this._rng;
    const lead = this.song.voices.lead || this.song.voices.lead2;
    if (!lead) return [];
    const style = Songs.RHYTHMS[lead.style || 'flowing'];
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const steps = () => Array.from({ length: 8 }, () => pick([-2, -1, -1, -1, 1, 1, 1, 2, 0, -3, 3]));

    // Pool of melody pitches around the lead's octave.
    const base = this.song.root + 12 * (lead.oct || 1);
    const pool = [];
    for (let o = -1; o <= 3; o++) {
      for (const off of this.melodyScale) {
        const m = this.song.root + 12 * o + off;
        if (m >= base - 3 && m <= base + 17) pool.push(m);
      }
    }
    pool.sort((a, b) => a - b);

    const motif = [
      { r: pick(style), s: steps() },
      { r: pick(style), s: steps() },
    ];
    const answer = { r: motif[1].r, s: steps() };
    const plan = [];
    for (let b = 0; b < section.bars; b++) {
      if (b === section.bars - 1) plan.push('end');
      else if (b % 4 === 3) plan.push(answer);
      else plan.push(motif[b % 2]);
    }

    const nearestChordTone = (idx, pcs, reach) => {
      let best = idx, bestD = 99;
      for (let j = Math.max(0, idx - reach); j <= Math.min(pool.length - 1, idx + reach); j++) {
        if (pcs.includes(((pool[j] - this.song.root) % 12 + 12) % 12) && Math.abs(j - idx) < bestD) {
          best = j;
          bestD = Math.abs(j - idx);
        }
      }
      return best;
    };

    const notes = [];
    let idx = Math.floor(pool.length / 2);
    for (let b = 0; b < section.bars; b++) {
      const pcs = this._chordAt(section, b).map(x => ((x % 12) + 12) % 12);
      const p = plan[b];
      const rhythm = p === 'end' ? pick(Songs.RHYTHMS.ending) : p.r;
      rhythm.forEach(([beat, len], i) => {
        const last = p === 'end' && i === rhythm.length - 1;
        const strong = beat % 2 === 0;
        if (!strong && !last && rng() < 0.08) return; // breathe
        let cand = idx + (p === 'end' ? pick([-1, 1, -1]) : p.s[i % p.s.length]);
        cand = Math.max(0, Math.min(pool.length - 1, cand));
        if (last) cand = nearestChordTone(cand, [0], 4);
        else if (strong) cand = nearestChordTone(cand, pcs, 2);
        idx = cand;
        notes.push({ bar: b, beat, len, midi: pool[idx] });
      });
    }
    return notes;
  }

  // ------------------------------------------------------------- render --

  _renderBar(section, si, bar, t0) {
    const v = this.song.voices;
    const beat = this.beat;
    const chord = this._chordAt(section, bar);
    const nextChord = this._chordAt(section, bar + 1);
    const root = this.song.root;
    const lastBar = bar === section.bars - 1;

    for (const spec of section.layers) {
      const [name, variant] = spec.split(':');
      const voice = v[name];
      if (!voice) continue;
      const bus = this._bus(name, voice);
      const oct = 12 * (voice.oct || 0);

      switch (name) {
        case 'pad':
          chord.forEach(off => this._play(voice.inst, bus, t0, root + oct + off, this.barLen, 1, voice.opts));
          break;

        case 'bass': {
          const r = root + oct + chord[0];
          const fifth = r + (chord[2] - chord[0]);
          const vel = 1;
          const hit = (b, m, len) => this._play(voice.inst, bus, t0 + this._swing(b) * beat, m, len * beat, vel, voice.opts);
          switch (voice.pattern) {
            case 'whole': hit(0, r, 4); break;
            case 'half': hit(0, r, 2); hit(2, fifth - 12, 2); break;
            case 'drone': hit(0, r, 4); hit(0, fifth, 4); break;
            case 'rootfifth': hit(0, r, 1); hit(2, fifth - 12, 1); break;
            case 'oompah': hit(0, r, 1); hit(2, fifth - 12, 1); break;
            case 'synth8': for (let i = 0; i < 8; i++) hit(i * 0.5, i % 2 ? r + 12 : r, 0.5); break;
            case 'walk': {
              const target = root + oct + nextChord[0];
              const approach = target + (Math.random() < 0.5 ? -1 : 1);
              [r, root + oct + chord[1], fifth, approach].forEach((m, i) => hit(i, m, 1));
              break;
            }
            default: hit(0, r, 4);
          }
          break;
        }

        case 'arp': {
          const pattern = (variant && voice[variant]) || voice.pattern;
          const step = voice.step || 0.5;
          const count = Math.round(4 / step);
          for (let i = 0; i < count; i++) {
            const k = pattern[i % pattern.length];
            if (k < 0) continue;
            const off = k < chord.length ? chord[k] : chord[k % chord.length] + 12;
            this._play(voice.inst, bus, t0 + this._swing(i * step) * beat, root + oct + off, step * beat * 1.6, 1, voice.opts);
          }
          break;
        }

        case 'comp':
          for (const b of voice.beats) {
            chord.forEach((off, i) => {
              const t = t0 + this._swing(b) * beat + i * (voice.strum || 0);
              this._play(voice.inst, bus, t, root + oct + 12 + off, (voice.len || 0.5) * beat, 1, voice.opts);
            });
          }
          break;

        case 'lead':
        case 'lead2': {
          const shift = name === 'lead2' ? 12 * ((voice.oct || 0) - ((v.lead && v.lead.oct) || 1)) : 0;
          for (const n of this.melodies[si]) {
            if (n.bar !== bar) continue;
            this._play(voice.inst, bus, t0 + this._swing(n.beat) * beat, n.midi + shift, n.len * beat, 1, voice.opts);
          }
          break;
        }

        case 'drums': {
          const pat = (lastBar && voice.fill) || (variant && voice[variant]) || voice.main;
          for (const key in pat) {
            const inst = voice.kit[key];
            if (!inst || !Synth[inst]) continue;
            const row = pat[key];
            for (let i = 0; i < 16; i++) {
              const c = row[i];
              if (c === '.' || !c) continue;
              const vel = c === 'x' ? 1 : c === 'o' ? 0.6 : 0.35; // voice.vel is the bus level
              const t = t0 + this._swing(i * 0.25) * beat + (Math.random() - 0.5) * 0.006;
              Synth[inst](this.ctx, bus, Math.max(this.ctx.currentTime, t), vel);
            }
          }
          break;
        }
      }
    }
  }
}
