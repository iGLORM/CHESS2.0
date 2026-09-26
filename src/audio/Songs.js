// One song per theme (story world), played by MusicPlayer.
//
//   root      MIDI note of the key's tonic (50 = D3); voice octaves are relative to it
//   harmony   7-note scale the chords are built on; prog lists chord degrees (0 = tonic)
//   melody    scale the tune uses (defaults to harmony)
//   level     loudness trim so every song plays at about the same volume
//   sections  played in order, then looped; `layers` picks the voices that play,
//             'voice:variant' picks a pattern variant
//   voices    pad, bass, arp, comp, lead, lead2 (the tune an octave down on another
//             instrument) and drums; vel is the voice level, verb its reverb send
const Songs = {
  SCALES: {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    phrygianDominant: [0, 1, 4, 5, 7, 8, 10],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
    pentMinor: [0, 3, 5, 7, 10],
    pentMajor: [0, 2, 4, 7, 9],
    miyako: [0, 1, 5, 7, 8],
  },

  // Melody rhythms: [beat, length] within one 4-beat bar.
  RHYTHMS: {
    flowing: [
      [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1], [3, 1]],
      [[0, 1.5], [1.5, 0.5], [2, 2]],
      [[0, 0.5], [0.5, 0.5], [1, 1], [2, 0.5], [2.5, 0.5], [3, 1]],
      [[0, 2], [2, 1], [3, 1]],
    ],
    sparse: [
      [[0, 2], [2, 2]],
      [[0, 3], [3, 1]],
      [[0, 1], [1, 3]],
      [[0, 1.5], [1.5, 2.5]],
    ],
    busy: [
      [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 1], [3, 0.5], [3.5, 0.5]],
      [[0, 0.75], [0.75, 0.25], [1, 0.5], [1.5, 0.5], [2, 0.5], [2.5, 0.5], [3, 1]],
      [[0, 1], [1, 0.5], [1.5, 0.5], [2, 0.5], [2.5, 0.5], [3, 1]],
      [[0, 0.5], [0.5, 1], [1.5, 0.5], [2, 1.5], [3.5, 0.5]],
    ],
    dotted: [
      [[0, 1.5], [1.5, 0.5], [2, 1.5], [3.5, 0.5]],
      [[0, 0.75], [0.75, 0.25], [1, 1], [2, 0.75], [2.75, 0.25], [3, 1]],
      [[0, 1.5], [1.5, 0.5], [2, 2]],
      [[0, 1], [1, 0.75], [1.75, 0.25], [2, 2]],
    ],
    ending: [
      [[0, 1], [1, 1], [2, 2]],
      [[0, 2], [2, 2]],
      [[0, 0.5], [0.5, 0.5], [1, 3]],
    ],
  },

  THEMES: {
    // From Cosmic Abyss: slower, candlelit, a flute reading over the bells.
    grandlibrary: {
      bpm: 62, root: 50, harmony: 'lydian', reverb: 0.6,
      sections: [
        { bars: 2, prog: [0, 1], layers: ['pad', 'bass', 'arp'] },
        { bars: 8, prog: [0, 1, 5, 2], layers: ['pad', 'bass', 'arp', 'lead'] },
        { bars: 8, prog: [5, 1, 0, 4], layers: ['pad', 'bass', 'arp:alt', 'lead2', 'drums'] },
        { bars: 8, prog: [0, 1, 5, 2], layers: ['pad', 'bass', 'arp', 'lead', 'drums'] },
        { bars: 4, prog: [5, 4], layers: ['pad', 'arp:alt'] },
      ],
      voices: {
        pad: { inst: 'pad', oct: 0, vel: 0.8, verb: 0.6, opts: { cutoff: 900, attack: 1.5, release: 2 } },
        bass: { inst: 'bass', pattern: 'whole', oct: -1, vel: 0.9, opts: { wave: 'sine', cutoff: 300 } },
        arp: { inst: 'bell', oct: 1, step: 0.5, vel: 0.45, verb: 0.7, pattern: [0, 2, 1, 3, 2, 1, -1, 2],
          alt: [3, -1, 2, -1, 1, 2, 0, -1], opts: { ratio: 3.5, index: 1.4, ring: 2.4 } },
        lead: { inst: 'flute', oct: 1, style: 'sparse', vel: 0.75, verb: 0.65, opts: { vib: 10, breath: 0.35 } },
        lead2: { inst: 'choir', oct: 0, vel: 0.7, verb: 0.6 },
        drums: { vel: 0.3, kit: { k: 'kick', h: 'tick' },
          main: { k: 'x...............', h: '..-...-...-...o.' } },
      },
    },

    // From King's Fortress: minor, heavier, brass over the lute.
    ironkeep: {
      bpm: 92, root: 45, harmony: 'minor', reverb: 0.45,
      sections: [
        { bars: 4, prog: [0, 6], layers: ['arp', 'bass'] },
        { bars: 8, prog: [0, 6, 0, 4], layers: ['arp', 'bass', 'lead', 'drums'] },
        { bars: 8, prog: [2, 6, 3, 4], layers: ['pad', 'arp:alt', 'bass', 'lead2', 'drums'] },
        { bars: 8, prog: [0, 6, 0, 4], layers: ['pad', 'arp', 'bass', 'lead', 'drums'] },
      ],
      voices: {
        pad: { inst: 'choir', oct: 0, vel: 0.5, verb: 0.5 },
        bass: { inst: 'bass', pattern: 'half', oct: -1, vel: 0.8, opts: { cutoff: 500 } },
        arp: { inst: 'pluck', oct: 0, step: 0.5, vel: 0.7, verb: 0.3, pattern: [0, 2, 1, 2, 3, 2, 1, 2],
          alt: [0, 1, 2, 3, 2, 1, 2, 1], opts: { bright: 2800, damp: 0.3, ring: 1.2 } },
        lead: { inst: 'brass', oct: 1, style: 'dotted', vel: 0.85, verb: 0.4, opts: { open: 2.5, swell: 0.06 } },
        lead2: { inst: 'pluck', oct: 1, vel: 0.9, verb: 0.3, opts: { bright: 3000, ring: 1.4 } },
        drums: { vel: 0.5, kit: { k: 'taiko', t: 'tom', h: 'shaker' },
          main: { k: 'x.......x..o....', t: '....x.......x.o.', h: '..o...o...o...o.' },
          fill: { k: 'x.......x.......', t: '....x.o.x.o.xoxo', h: '..o...o...o...o.' } },
      },
    },

    // From Deep Blue, retuned darker: minor key, slower, low flute in the fog.
    mistymoors: {
      bpm: 64, root: 45, harmony: 'dorian', reverb: 0.65,
      sections: [
        { bars: 2, prog: [0, 5], layers: ['pad', 'bass', 'arp'] },
        { bars: 8, prog: [0, 5, 3, 4], layers: ['pad', 'bass', 'arp', 'lead'] },
        { bars: 8, prog: [3, 4, 2, 5], layers: ['pad', 'bass', 'arp:alt', 'lead2', 'drums'] },
        { bars: 8, prog: [0, 5, 3, 4], layers: ['pad', 'bass', 'arp', 'lead', 'drums'] },
      ],
      voices: {
        pad: { inst: 'pad', oct: 0, vel: 0.75, verb: 0.65, opts: { cutoff: 650, attack: 2, wave: 'triangle' } },
        bass: { inst: 'bass', pattern: 'whole', oct: -1, vel: 0.8, opts: { wave: 'sine', cutoff: 300 } },
        arp: { inst: 'pluck', oct: 1, step: 1 / 3, vel: 0.5, verb: 0.55, pattern: [0, 1, 2, 3, 2, 1],
          alt: [3, 2, 1, 0, 1, 2], opts: { bright: 2400, body: 0.15, ring: 1.6 } },
        lead: { inst: 'flute', oct: 1, style: 'sparse', vel: 0.85, verb: 0.6, opts: { vib: 16, vibRate: 4, breath: 0.7 } },
        lead2: { inst: 'bell', oct: 1, vel: 0.65, verb: 0.65, opts: { ratio: 4, index: 1.1, ring: 1.6 } },
        drums: { vel: 0.3, kit: { k: 'taiko', h: 'shaker' },
          main: { k: 'x.......o.......', h: '..-.o.-...-.o.-.' } },
      },
    },

    // From Golden Dunes: a step lower and a touch slower.
    slantedsands: {
      level: 0.85, bpm: 90, root: 50, harmony: 'phrygianDominant', reverb: 0.4,
      sections: [
        { bars: 4, prog: [0, 1], layers: ['bass', 'drums'] },
        { bars: 8, prog: [0, 1, 0, 6], layers: ['bass', 'arp', 'lead', 'drums'] },
        { bars: 8, prog: [3, 1, 6, 0], layers: ['pad', 'bass', 'arp:alt', 'lead2', 'drums'] },
        { bars: 8, prog: [0, 1, 0, 6], layers: ['pad', 'bass', 'arp', 'lead', 'drums'] },
      ],
      voices: {
        pad: { inst: 'pad', oct: 0, vel: 0.5, verb: 0.5, opts: { cutoff: 800, attack: 1 } },
        bass: { inst: 'bass', pattern: 'drone', oct: -1, vel: 0.7, opts: { cutoff: 350, wave: 'sine' } },
        arp: { inst: 'pluck', oct: 0, step: 0.5, vel: 0.7, verb: 0.3, pattern: [0, 1, 2, 1, 0, 2, 1, 2],
          alt: [2, 1, 0, -1, 2, 3, 2, 1], opts: { bright: 4200, damp: 0.25, wave: 'square', ring: 0.9 } },
        lead: { inst: 'flute', oct: 1, style: 'dotted', vel: 0.85, verb: 0.4, opts: { vib: 28, vibRate: 5.5, breath: 0.6 } },
        lead2: { inst: 'pluck', oct: 1, vel: 0.9, verb: 0.35, opts: { bright: 4200, wave: 'square', ring: 1.1 } },
        drums: { vel: 0.55, kit: { d: 'doum', t: 'tek', h: 'shaker' },
          main: { d: 'x.......x.......', t: '..x...x.....x...', h: '.-.-.-.-.-.-.-.-' },
          fill: { d: 'x.......x...x...', t: '..x...x.xxx.x.xx', h: '.-.-.-.-.-.-.-.-' } },
      },
    },

    // From Neon Tokyo: dorian and a steadier drill tempo.
    trainingcamp: {
      bpm: 104, root: 45, harmony: 'dorian', reverb: 0.35,
      sections: [
        { bars: 4, prog: [0, 5], layers: ['pad', 'arp', 'drums:hats'] },
        { bars: 8, prog: [0, 5, 2, 6], layers: ['pad', 'bass', 'arp', 'drums'] },
        { bars: 8, prog: [0, 5, 2, 6], layers: ['pad', 'bass', 'arp', 'lead', 'drums'] },
        { bars: 8, prog: [3, 5, 0, 4], layers: ['pad', 'bass', 'arp:alt', 'lead2', 'drums:hats'] },
        { bars: 8, prog: [0, 5, 2, 6], layers: ['pad', 'bass', 'arp', 'lead', 'drums'] },
      ],
      voices: {
        pad: { inst: 'pad', oct: 0, vel: 0.8, verb: 0.4, opts: { cutoff: 1600, attack: 0.4 } },
        bass: { inst: 'bass', pattern: 'synth8', oct: -1, vel: 0.9, opts: { wave: 'sawtooth', cutoff: 800, gate: 0.6 } },
        arp: { inst: 'pluck', oct: 1, step: 0.25, vel: 0.4, verb: 0.3, pattern: [0, 1, 2, 3, 2, 1, 2, 1],
          alt: [3, 2, 1, 0, 1, 2, 3, 2], opts: { bright: 4500, wave: 'square', damp: 0.12, ring: 0.5 } },
        lead: { inst: 'lead', oct: 1, style: 'flowing', vel: 0.8, verb: 0.4, opts: { wave: 'sawtooth', wave2: 'square', cutoff: 2600, vib: 10 } },
        lead2: { inst: 'bell', oct: 1, vel: 0.8, verb: 0.5, opts: { ratio: 3, index: 1.2, ring: 1 } },
        drums: { vel: 0.6, kit: { k: 'kick', s: 'snare', c: 'clap', h: 'hat', o: 'openHat' },
          main: { k: 'x.......x..x....', s: '....x.......x...', c: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..............x.' },
          hats: { h: '..x...x...x...x.', o: '......x.......x.' },
          fill: { k: 'x.......x.x.x.x.', s: '....x.....x.xxxx', h: 'x.x.x.x.x.x.x.x.' } },
      },
    },

    // From Sakura Garden: a sunny major-pentatonic village tune.
    pawnhollow: {
      level: 1.3, bpm: 88, root: 48, harmony: 'major', melody: 'pentMajor', reverb: 0.4,
      sections: [
        { bars: 2, prog: [0, 5], layers: ['arp', 'pad', 'bass'] },
        { bars: 8, prog: [0, 5, 3, 0], layers: ['pad', 'arp', 'bass', 'lead', 'drums'] },
        { bars: 8, prog: [3, 4, 5, 0], layers: ['pad', 'arp:alt', 'bass', 'lead2', 'drums'] },
        { bars: 8, prog: [0, 5, 3, 0], layers: ['pad', 'arp', 'bass', 'lead', 'drums'] },
      ],
      voices: {
        pad: { inst: 'pad', oct: 0, vel: 0.45, verb: 0.6, opts: { cutoff: 700, attack: 2, wave: 'triangle' } },
        bass: { inst: 'bass', pattern: 'whole', oct: -1, vel: 0.6, opts: { wave: 'sine', cutoff: 300 } },
        arp: { inst: 'pluck', oct: 1, step: 0.5, vel: 0.65, verb: 0.5, pattern: [0, -1, 2, 1, -1, 3, -1, -1],
          alt: [3, -1, 2, -1, 0, 1, -1, 2], opts: { bright: 3200, damp: 0.5, body: 0.2, ring: 1.8 } },
        lead: { inst: 'flute', oct: 1, style: 'flowing', vel: 0.9, verb: 0.4, opts: { vib: 14, vibRate: 5, breath: 0.5, edge: 0.05 } },
        lead2: { inst: 'pluck', oct: 1, vel: 0.9, verb: 0.5, opts: { bright: 3200, damp: 0.5, ring: 2 } },
        drums: { vel: 0.45, kit: { k: 'kick', w: 'woodblock', h: 'shaker' },
          main: { k: 'x.......x.......', w: '....x.......x...', h: '..-...-...-...-.' } },
      },
    },

    // From Art Deco: grander and less swung, a choir under the court band.
    royalpalace: {
      level: 1.3, bpm: 106, root: 53, harmony: 'major', swing: 0.15, sevenths: true, reverb: 0.3,
      sections: [
        { bars: 4, prog: [1, 4], layers: ['bass', 'comp', 'drums'] },
        { bars: 8, prog: [1, 4, 0, 5], layers: ['bass', 'comp', 'lead', 'drums'] },
        { bars: 8, prog: [3, 2, 1, 4], layers: ['pad', 'bass', 'comp', 'lead2', 'drums'] },
        { bars: 8, prog: [1, 4, 0, 5], layers: ['bass', 'comp', 'lead', 'drums'] },
      ],
      voices: {
        pad: { inst: 'choir', oct: 0, vel: 0.45, verb: 0.5 },
        bass: { inst: 'bass', pattern: 'walk', oct: -1, vel: 0.9, opts: { cutoff: 600, gate: 0.7, sustain: 0.4 } },
        comp: { inst: 'pluck', oct: 0, beats: [1, 3], len: 0.5, vel: 0.5, verb: 0.3, opts: { bright: 2200, body: 0.1, ring: 0.6 } },
        lead: { inst: 'brass', oct: 1, style: 'dotted', vel: 0.9, verb: 0.3, opts: { open: 3, swell: 0.05 } },
        lead2: { inst: 'lead', oct: 1, vel: 0.8, verb: 0.3, opts: { wave: 'triangle', wave2: 'square', mix2: 0.25, cutoff: 1800, vib: 12 } },
        drums: { vel: 0.5, kit: { k: 'kick', s: 'brush', r: 'ride', h: 'hat' },
          main: { k: 'o.......o.......', s: '....x.......x...', r: 'x...x.x.x...x.x.', h: '....x.......x...' } },
      },
    },

    // From Dusty Frontier: a little quicker, for the duel.
    forkedgulch: {
      level: 1.9, bpm: 98, root: 43, harmony: 'major', reverb: 0.35,
      sections: [
        { bars: 4, prog: [0, 4], layers: ['bass', 'comp', 'drums'] },
        { bars: 8, prog: [0, 3, 0, 4], layers: ['bass', 'comp', 'lead', 'drums'] },
        { bars: 8, prog: [5, 3, 0, 4], layers: ['pad', 'bass', 'comp', 'lead2', 'drums'] },
        { bars: 8, prog: [0, 3, 0, 4], layers: ['bass', 'comp', 'lead', 'drums'] },
      ],
      voices: {
        pad: { inst: 'pad', oct: 1, vel: 0.4, verb: 0.5, opts: { cutoff: 900, attack: 1 } },
        bass: { inst: 'bass', pattern: 'rootfifth', oct: 0, vel: 0.9, opts: { cutoff: 500, gate: 0.5, sustain: 0.3 } },
        comp: { inst: 'pluck', oct: 1, beats: [1, 3], len: 0.4, strum: 0.018, vel: 0.5, verb: 0.2, opts: { bright: 3000, ring: 0.5 } },
        lead: { inst: 'lead', oct: 2, style: 'dotted', vel: 0.75, verb: 0.35, opts: { wave: 'square', wave2: 'triangle', mix2: 0.6, cutoff: 1700, vib: 16, vibRate: 5 } },
        lead2: { inst: 'flute', oct: 2, vel: 0.7, verb: 0.5, opts: { edge: 0.02, breath: 0.1, vib: 18 } },
        drums: { vel: 0.5, kit: { w: 'woodblock', h: 'shaker', k: 'kick' },
          main: { w: 'x..x..x.x..x..x.', h: '..-...-...-...-.', k: 'o.......o.......' } },
      },
    },

    // From Jurassic Jungle, darker: harmonic minor, lower, a choir in the hall.
    obsidiancourt: {
      level: 0.85, bpm: 96, root: 47, harmony: 'harmonicMinor', reverb: 0.5,
      sections: [
        { bars: 4, prog: [0, 6], layers: ['drums', 'bass'] },
        { bars: 8, prog: [0, 6, 5, 6], layers: ['bass', 'arp', 'lead', 'drums'] },
        { bars: 8, prog: [0, 3, 6, 4], layers: ['pad', 'bass', 'arp:alt', 'lead2', 'drums'] },
        { bars: 8, prog: [0, 6, 5, 6], layers: ['pad', 'bass', 'arp', 'lead', 'drums'] },
      ],
      voices: {
        pad: { inst: 'choir', oct: 0, vel: 0.5, verb: 0.5 },
        bass: { inst: 'bass', pattern: 'drone', oct: -1, vel: 0.6, opts: { wave: 'sine', cutoff: 250 } },
        arp: { inst: 'bell', oct: 1, step: 0.5, vel: 0.6, verb: 0.3, pattern: [0, 2, 1, 2, 0, 3, 1, 2],
          alt: [3, 1, 2, 0, 3, 2, 1, 0], opts: { ratio: 4, index: 1, ring: 0.7, bright: 0.2 } },
        lead: { inst: 'flute', oct: 1, style: 'flowing', vel: 0.85, verb: 0.4, opts: { edge: 0.25, breath: 0.6, vib: 20 } },
        lead2: { inst: 'bell', oct: 1, vel: 0.8, verb: 0.4, opts: { ratio: 4, index: 1, ring: 0.9 } },
        drums: { vel: 0.6, kit: { k: 'taiko', t: 'tom', h: 'shaker' },
          main: { k: 'x..x..x...x.x...', t: '....x.......x.x.', h: '.-.-.-.-.-.-.-.-' },
          fill: { k: 'x..x..x.x.x.x.x.', t: '....x.x.x.xxxxxx', h: '.-.-.-.-.-.-.-.-' } },
      },
    },

    // From Steampunk Skies: wound a little tighter.
    clockworkcitadel: {
      level: 2.6, bpm: 112, root: 48, harmony: 'harmonicMinor', reverb: 0.3,
      sections: [
        { bars: 4, prog: [0, 4], layers: ['bass', 'drums'] },
        { bars: 8, prog: [0, 3, 4, 0], layers: ['bass', 'comp', 'lead', 'drums'] },
        { bars: 8, prog: [5, 3, 4, 4], layers: ['pad', 'bass', 'comp', 'lead2', 'drums'] },
        { bars: 8, prog: [0, 3, 4, 0], layers: ['bass', 'comp', 'lead', 'drums'] },
      ],
      voices: {
        pad: { inst: 'pad', oct: 0, vel: 0.5, verb: 0.4, opts: { cutoff: 1000 } },
        bass: { inst: 'brass', pattern: 'oompah', oct: -1, vel: 1.0, opts: { open: 2.5, swell: 0.04 } },
        comp: { inst: 'brass', oct: 0, beats: [1, 3], len: 0.35, vel: 0.6, verb: 0.25, opts: { open: 4, swell: 0.03 } },
        lead: { inst: 'lead', oct: 1, style: 'busy', vel: 0.75, verb: 0.3, opts: { wave: 'square', wave2: 'triangle', mix2: 0.6, cutoff: 3200, vib: 9, vibRate: 7 } },
        lead2: { inst: 'bell', oct: 1, vel: 0.8, verb: 0.35, opts: { ratio: 3.01, index: 1.6, ring: 0.8 } },
        drums: { vel: 0.45, kit: { k: 'kick', s: 'snare', t: 'tick', w: 'woodblock' },
          main: { k: 'x.......x.......', s: '....o.......o...', t: 'x-x-x-x-x-x-x-x-', w: '..............x.' } },
      },
    },

    crystal: {
      bpm: 72, root: 47, harmony: 'minor', reverb: 0.6,
      sections: [
        { bars: 2, prog: [0, 5], layers: ['pad', 'bass', 'arp'] },
        { bars: 8, prog: [0, 5, 2, 6], layers: ['pad', 'bass', 'arp', 'lead', 'drums'] },
        { bars: 8, prog: [3, 0, 4, 5], layers: ['pad', 'bass', 'arp:alt', 'lead2', 'drums'] },
        { bars: 8, prog: [0, 5, 2, 6], layers: ['pad', 'bass', 'arp', 'lead', 'drums'] },
      ],
      voices: {
        pad: { inst: 'choir', oct: 0, vel: 0.7, verb: 0.6 },
        bass: { inst: 'bass', pattern: 'whole', oct: -1, vel: 0.8, opts: { wave: 'sine', cutoff: 250 } },
        arp: { inst: 'bell', oct: 2, step: 0.5, vel: 0.35, verb: 0.7, pattern: [0, 2, 1, 3, 2, 1, 0, 2],
          alt: [3, 1, 2, -1, 3, 2, 0, -1], opts: { ratio: 5, index: 1, ring: 1.5 } },
        lead: { inst: 'flute', oct: 1, style: 'sparse', vel: 0.8, verb: 0.6, opts: { vib: 14, breath: 0.3 } },
        lead2: { inst: 'bell', oct: 1, vel: 0.7, verb: 0.7, opts: { ratio: 2, index: 0.8, ring: 2.5 } },
        drums: { vel: 0.4, kit: { k: 'kick' }, main: { k: 'x..x............' } },
      },
    },
  },

  // Tension music while a king is in check: same key and instruments,
  // faster, with a pulsing bass and a flat-second chord against the tonic.
  suspense(song) {
    const arp = song.voices.arp || song.voices.lead2 || song.voices.lead;
    return {
      bpm: Math.max(116, song.bpm + 20), root: song.root, harmony: 'phrygian', reverb: 0.35,
      sections: [{ bars: 4, prog: [0, 1, 0, 1], layers: ['pad', 'bass', 'arp', 'drums'] }],
      voices: {
        pad: { inst: 'pad', oct: 0, vel: 0.6, verb: 0.4, opts: { cutoff: 700, attack: 0.3 } },
        bass: { inst: 'bass', pattern: 'synth8', oct: -1, vel: 0.9, opts: { wave: 'sawtooth', cutoff: 500, gate: 0.5 } },
        arp: { inst: arp.inst, oct: 1, step: 0.25, vel: 0.35, verb: 0.3, pattern: [0, -1, 0, 1, -1, 0, -1, 1], opts: arp.opts },
        drums: { vel: 0.5, kit: { k: 'kick', t: 'tick' },
          main: { k: 'x..x....x..x....', t: 'x.x.x.x.x.x.x.x.' } },
      },
    };
  },

  get(themeId, suspense) {
    const song = this.THEMES[themeId] || this.THEMES.pawnhollow;
    return suspense ? this.suspense(song) : song;
  },
};
