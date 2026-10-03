// Story keepsakes (src/characters/keepsakes.js), drawn in code as 40x40 pixel
// art: light from the top left, a coloured dark outline, a glint. Frames are
// painted into small canvases and shown as nearest-scaled PIXI textures.
//
//   PixiKeepsake.texture(id, frame?)  -> PIXI.Texture (cached; frame 0 = rest)
//   PixiKeepsake.sprite(id, size)     -> PIXI.Sprite centred on (0, 0)
//   PixiKeepsake.icon(id, size)       -> same, for small collection slots
//   PixiKeepsake.animated(id, size)   -> Container with update(dt) and destroy():
//                                        flame flicker, needle wobble, sand shimmer, glint sweep
//   PixiKeepsake.reveal(parent, id, { onDone, subtitle }) -> { container, advance(), skip(), finish() }
//
// The painting (PixiKeepsake.pixels) is plain JavaScript with no PIXI, so the
// art can be rendered in Node for checking.
const PixiKeepsake = {
  N: 40,          // art pixels per side
  FRAMES: 24,     // frames in one idle cycle
  CYCLE: 3,       // seconds per idle cycle
  IDS: ['compass', 'ironkey', 'lantern', 'signet', 'seal', 'map', 'poster', 'hourglass'],
  _tex: {},

  // ---------- painting (no PIXI) ----------

  // ABGR-free: returns Uint32Array N*N of 0xFFRRGGBB (0 = transparent).
  // t in [0, 1) is the idle phase; opts.unroll (0..1) rolls the map up.
  pixels(id, t = 0, opts = {}) {
    const K = PixiKeepsake._kit;
    const p = K.pad(this.N);
    const art = this._art[id];
    if (!art) return p.px;
    art(p, t, opts, K);
    if (!opts.noGlint) K.sweep(p, t);
    K.outline(p);
    return p.px;
  },

  _kit: (() => {
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const H = s => parseInt(s.replace('#', ''), 16);
    const R = arr => arr.map(H);
    const pick = (r, v) => r[clamp(Math.floor(v * r.length), 0, r.length - 1)];
    const mix = (a, b, t) => {
      const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
      const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
      return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
    };
    const hash = (x, y, s = 0) => {
      let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const TAU = Math.PI * 2;
    const NO_GLINT = 1, GLOW = 2;

    function pad(N) {
      const px = new Uint32Array(N * N);
      const tag = new Uint8Array(N * N);
      return {
        N, px, tag,
        set(x, y, c, tg = 0) {
          x |= 0; y |= 0;
          if (x < 0 || y < 0 || x >= N || y >= N) return;
          if (c === -1) { px[y * N + x] = 0; tag[y * N + x] = 0; return; }
          px[y * N + x] = (0xff000000 | c) >>> 0;
          tag[y * N + x] = tg;
        },
        get(x, y) {
          if (x < 0 || y < 0 || x >= N || y >= N) return -1;
          const v = px[y * N + x];
          return v ? v & 0xffffff : -1;
        },
        has(x, y) { return x >= 0 && y >= 0 && x < N && y < N && px[y * N + x] !== 0; },
      };
    }

    // Paint every pixel inside(x, y); shade(x, y, edge) gives its colour,
    // edge 1 on the lit (top/left) border, -1 on the dark (bottom/right) one.
    function fill(p, inside, shade, tg = 0) {
      const N = p.N;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          if (!inside(x, y)) continue;
          const lit = !inside(x - 1, y) || !inside(x, y - 1);
          const dk = !inside(x + 1, y) || !inside(x, y + 1);
          const c = shade(x, y, lit && !dk ? 1 : dk && !lit ? -1 : 0);
          if (c !== null && c !== undefined) p.set(x, y, c, tg);
        }
      }
    }

    // A 1 px outline around everything, in a much darker version of the
    // colour it borders (coloured "sel-out" outline, not flat black).
    function outline(p) {
      const N = p.N, src = p.px.slice();
      const INK = 0x140c1c;
      const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : src[y * N + x]);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          if (src[y * N + x]) continue;
          const n = at(x, y - 1) || at(x - 1, y) || at(x + 1, y) || at(x, y + 1);
          if (!n) continue;
          p.px[y * N + x] = (0xff000000 | mix(n & 0xffffff, INK, 0.78)) >>> 0;
        }
      }
    }

    // A bright diagonal band sweeping over the item early in each cycle.
    function sweep(p, t) {
      const N = p.N;
      const k = t / 0.32;
      if (k <= 0 || k >= 1) return;
      const s = -8 + k * (N * 2 + 16);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = y * N + x;
          if (!p.px[i] || p.tag[i] & NO_GLINT) continue;
          const d = Math.abs(x + y - s);
          if (d > 2.2) continue;
          const c = p.px[i] & 0xffffff;
          p.px[i] = (0xff000000 | mix(c, 0xffffff, d < 1.1 ? 0.6 : 0.3)) >>> 0;
        }
      }
    }

    // Small 3x5 letters (W is 5 wide) for the poster.
    const FONT = {
      W: ['10001', '10001', '10101', '10101', '01010'],
      A: ['010', '101', '111', '101', '101'],
      N: ['101', '111', '111', '111', '101'],
      T: ['111', '010', '010', '010', '010'],
      E: ['111', '100', '110', '100', '111'],
      D: ['110', '101', '101', '101', '110'],
    };
    function text(p, str, x, y, c) {
      for (const ch of str) {
        const g = FONT[ch];
        if (!g) { x += 2; continue; }
        g.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '1') p.set(x + i, y + j, c); });
        x += g[0].length + 1;
      }
    }

    return { clamp, H, R, pick, mix, hash, TAU, NO_GLINT, GLOW, pad, fill, outline, sweep, text };
  })(),

  _art: {
    // The Tilted Compass: brass case, cream face, needle leaning on the diagonal.
    compass(p, t, o, K) {
      const { R, pick, fill, TAU } = K;
      const brass = R(['#4a2c14', '#7a4e20', '#a86e2c', '#d09a40', '#f0c860', '#fff0b0']);
      const face = R(['#a88a5a', '#ccb080', '#e6d4a8', '#f8eed4']);
      const CX = 20, CY = 23, RC = 15.2;
      // Bow ring and stem on top.
      fill(p, (x, y) => {
        const dx = x + 0.5 - CX, dy = y + 0.5 - 5.5;
        const d = Math.hypot(dx, dy);
        return d <= 4.3 && d >= 2.1 && y <= 8;
      }, (x, y, e) => pick(brass, 0.5 + e * 0.35 - (x + 0.5 - CX) * 0.03));
      fill(p, (x, y) => y >= 7 && y <= 9 && x >= 17 && x <= 22,
        (x, y, e) => (y === 8 ? pick(brass, x < 20 ? 0.9 : 0.6) : pick(brass, 0.45 + e * 0.3)));
      // Case.
      const ang = -Math.PI / 4 + 0.13 * Math.sin(TAU * 2 * t) + 0.05 * Math.sin(TAU * 5 * t);
      const nc = Math.cos(ang), ns = Math.sin(ang);
      for (let y = 0; y < 40; y++) {
        for (let x = 0; x < 40; x++) {
          const dx = x + 0.5 - CX, dy = y + 0.5 - CY;
          const d = Math.hypot(dx, dy);
          if (d > RC) continue;
          const l = -(dx + dy) / (Math.max(d, 0.01) * Math.SQRT2);
          let c;
          if (d > 12.6) {
            c = pick(brass, 0.48 + 0.4 * l + (d > 14.4 && l > 0.55 ? 0.3 : 0));
          } else if (d > 11.4) {
            c = pick(brass, 0.3 - 0.28 * l);
          } else {
            let v = 0.7 + 0.22 * (-(dx + dy) / 16);
            if (d > 9.8 && l > 0.15) v -= 0.35;   // the rim's shadow on the face
            c = pick(face, v);
            const a = Math.atan2(dy, dx);
            // Compass rose, faint.
            const ax = Math.abs(dx), ay = Math.abs(dy);
            if ((ay < 7.5 && ax < 1.8 * (1 - ay / 7.5)) || (ax < 7.5 && ay < 1.8 * (1 - ax / 7.5))) c = pick(face, v - (dx < 0 || dy < 0 ? 0.22 : 0.34));
            // Ticks: four long, four short.
            for (let k = 0; k < 8; k++) {
              const ta = k * Math.PI / 4 - Math.PI / 2;
              let da = Math.abs(a - ta); if (da > Math.PI) da = TAU - da;
              const major = k % 2 === 0;
              if (da * d < 0.75 && d > (major ? 7.6 : 9) && d < 11) c = k === 0 ? 0xc83030 : 0x5a3a20;
            }
            // Needle.
            const s = dx * nc + dy * ns, q = -dx * ns + dy * nc;
            const len = 9.8, w = 3.1 * Math.min(1, 1.25 * (1 - Math.abs(s) / len));
            if (Math.abs(s) <= len && Math.abs(q) <= w) {
              if (s > 0) c = q < 0 ? (s > 7 ? 0xffb0a0 : 0xff5a4a) : 0xb01e24;
              else c = q < 0 ? 0xb8c0d8 : 0x3a405a;
            }
            // Glass reflection arc.
            if (d > 7 && d < 8.3 && a > -2.6 && a < -1.9) c = 0xffffff;
            if (Math.abs(dx + 4.5) < 0.6 && Math.abs(dy + 4.5) < 0.6) c = 0xffffff;
          }
          if (d < 1.9) c = pick(brass, 0.55 + 0.4 * l);
          p.set(x, y, c);
        }
      }
    },

    // The Iron Key: a rook-tower bow with an arched window, riveted iron.
    ironkey(p, t, o, K) {
      const { R, pick, fill, hash } = K;
      const iron = R(['#1e2028', '#343844', '#50566a', '#737a90', '#9aa2b8', '#d4dcec']);
      const win = (x, y) => x >= 18 && x <= 21 && y >= 10 && y <= 14 && !(y === 10 && (x === 18 || x === 21));
      const bow = (x, y) => {
        if (y >= 2 && y <= 4) return (x >= 10 && x <= 14) || (x >= 18 && x <= 21) || (x >= 25 && x <= 29);
        if (y >= 5 && y <= 7) return x >= 10 && x <= 29;
        if (y >= 8 && y <= 15) return x >= 12 && x <= 27 && !win(x, y);
        if (y >= 16 && y <= 17) return x >= 11 && x <= 28;
        return false;
      };
      const bit = (x, y) => x >= 22 && x <= 28 && y >= 26 && y <= 34 &&
        !(y >= 28 && y <= 29 && x >= 25) && !(y === 32 && x >= 26) && !(y === 34 && x === 28);
      const shaft = (x, y) => (x >= 18 && x <= 21 && y >= 18 && y <= 35 && !(y === 35 && (x === 18 || x === 21))) ||
        (y >= 20 && y <= 21 && x >= 16 && x <= 23);
      const key = (x, y) => bow(x, y) || shaft(x, y) || bit(x, y);
      fill(p, key, (x, y, e) => {
        let v;
        if (shaft(x, y) && !bow(x, y) && !(y >= 20 && y <= 21) && !bit(x, y)) v = [0.85, 0.65, 0.45, 0.25][x - 18];
        else v = 0.5 - (x - 20) * 0.012 - (y - 10) * 0.006;
        if (e === 1) v = 0.86; else if (e === -1) v = 0.2;
        if (y === 7 && bow(x, 8) && e === 0) v = 0.25;       // shadow under the parapet
        if (y === 17 && e !== 1) v = 0.2;
        if (e === 0 && hash(x, y, 3) > 0.965) return 0x6a4a3a; // rust fleck
        return pick(iron, v);
      });
      // Brick seams and rivets.
      for (let x = 13; x <= 26; x++) if (!win(x, 12)) p.set(x, 12, iron[1]);
      for (const [x, y] of [[12, 6], [16, 6], [23, 6], [27, 6], [14, 9], [25, 9], [14, 14], [25, 14], [13, 16], [26, 16]]) {
        p.set(x, y, iron[5]); p.set(x + 1, y, iron[1]);
      }
      // Warm light seen through the window (a hint of the keep's forge).
      p.set(19, 14, 0xff9a40, K.NO_GLINT); p.set(20, 14, 0xffd070, K.NO_GLINT);
      p.set(19, 13, 0xc05a20, K.NO_GLINT); p.set(20, 13, 0xff9a40, K.NO_GLINT);
    },

    // The Mist Lantern: bronze hood and cage, a pale blue-green flame.
    lantern(p, t, o, K) {
      const { R, pick, fill, TAU, NO_GLINT } = K;
      const metal = R(['#161c1a', '#26302c', '#3c4a42', '#5a6c5e', '#82988a', '#bcd0c0']);
      const glass = R(['#1e4a4a', '#2c6a64', '#3e8c80', '#5ab4a0', '#8adcc4']);
      const flame = R(['#18908a', '#40d0b4', '#90f8dc', '#e8fff8']);
      const CX = 20;
      // Handle.
      fill(p, (x, y) => {
        const dx = x + 0.5 - CX, dy = y + 0.5 - 6;
        const d = Math.hypot(dx, dy);
        return y <= 6 && d >= 3.2 && d <= 4.6;
      }, (x, y, e) => pick(metal, 0.55 + 0.3 * e));
      // Hood: a cone with a wide brim.
      const hoodW = y => (y < 6 ? -1 : y <= 12 ? 1.5 + (y - 6) * 1.35 : y <= 14 ? 12 : -1);
      fill(p, (x, y) => Math.abs(x + 0.5 - CX) <= hoodW(y), (x, y, e) => {
        const dx = x + 0.5 - CX;
        let v = 0.55 - dx * 0.04;
        if (y === 13) v = 0.72 - dx * 0.03; if (y === 14) v = 0.22;
        if (e === 1) v += 0.3;
        return pick(metal, v);
      });
      p.set(19, 5, metal[4]); p.set(20, 5, metal[3]);
      // Cage frame and glass.
      const fl = 0.5 + 0.5 * Math.sin(TAU * 3 * t) * Math.sin(TAU * 7 * t + 1);
      const sway = Math.sin(TAU * 2 * t) * 0.9 + Math.sin(TAU * 5 * t) * 0.4;
      const tip = 18.2 - fl * 1.6;
      for (let y = 15; y <= 31; y++) {
        for (let x = 10; x <= 29; x++) {
          const dx = x + 0.5 - CX;
          let c;
          const post = x <= 11 || x >= 28;
          if (y <= 16 || y >= 30 || post) {
            let v = 0.5 - dx * 0.03;
            if (y === 15 || y === 30 || x === 10) v = 0.8;
            if (y === 16 && !post) v = 0.3;
            if (x === 29 || y === 31) v = 0.18;
            c = pick(metal, v);
            p.set(x, y, c);
            continue;
          }
          if (x === 15 || x === 24) { p.set(x, y, metal[2]); continue; }
          // Glass lit by the flame.
          const d = Math.hypot(dx, (y + 0.5 - 24) * 0.8);
          let v = 0.95 - d / 10 + fl * 0.08;
          if (x === 12 && y > 17 && y < 28) v += 0.35;          // reflection strip
          c = pick(glass, v);
          // Flame: a teardrop that flickers and sways.
          const fy = y + 0.5;
          if (fy > tip && fy < 28) {
            const h = (fy - tip) / (28 - tip);
            const w = 3.6 * Math.sin(Math.PI * Math.pow(h, 0.75)) * (0.9 + fl * 0.15);
            const off = sway * (1 - h);
            const q = Math.abs(dx - off);
            if (q <= w) {
              const core = 1 - q / Math.max(w, 0.1);
              c = pick(flame, 0.15 + core * 0.7 + (h > 0.45 && h < 0.85 ? 0.25 : 0));
              p.set(x, y, c, NO_GLINT);
              continue;
            }
          }
          p.set(x, y, c, NO_GLINT);
        }
      }
      // Wick and a little oil cup under the flame.
      p.set(19, 28, 0x0e1a18, NO_GLINT); p.set(20, 28, 0x0e1a18, NO_GLINT);
      for (let x = 17; x <= 22; x++) p.set(x, 29, x < 19 ? metal[4] : metal[2]);
      // Base with feet.
      const baseW = y => (y === 32 ? 11 : y === 33 ? 12 : y === 34 ? 11 : -1);
      fill(p, (x, y) => Math.abs(x + 0.5 - CX) <= baseW(y) || (y === 35 && (x === 9 || x === 10 || x === 29 || x === 30)),
        (x, y, e) => pick(metal, (y === 32 ? 0.75 : 0.45) - (x + 0.5 - CX) * 0.03 + (e === 1 ? 0.2 : 0) - (e === -1 ? 0.25 : 0)));
    },

    // Queenie's Signet: a gold band, a seal plate engraved with a crown, a pink gem.
    signet(p, t, o, K) {
      const { R, pick, fill } = K;
      const gold = R(['#5a3410', '#8a5a1c', '#c08a2c', '#e8b840', '#ffdc70', '#fff6c8']);
      const pink = R(['#8a1850', '#d0408c', '#ff88c4', '#ffe0f2']);
      const CX = 20;
      // Band (3/4 view).
      const inO = (x, y) => { const a = (x + 0.5 - CX) / 13.5, b = (y + 0.5 - 27) / 9.5; return a * a + b * b <= 1; };
      const inI = (x, y) => { const a = (x + 0.5 - CX) / 8.6, b = (y + 0.5 - 25.6) / 5.4; return a * a + b * b <= 1; };
      fill(p, (x, y) => inO(x, y) && !inI(x, y), (x, y, e) => {
        const nx = (x + 0.5 - CX) / 13.5, ny = (y + 0.5 - 27) / 9.5;
        let v;
        if (ny < -0.15) v = 0.3 - nx * 0.15;                 // far side: inside of the band, in shade
        else v = 0.62 - nx * 0.35 + (inI(x, y - 1) ? 0.35 : 0);
        if (e === 1 && ny > 0) v += 0.2;
        if (Math.abs(nx + 0.55) < 0.05 && ny > 0.2) v = 1;   // a hard highlight on the front
        return pick(gold, v);
      });
      // Shoulders from band to plate.
      fill(p, (x, y) => y >= 17 && y <= 21 && Math.abs(x + 0.5 - CX) <= 7.5 - (y - 17) * 0.7,
        (x, y, e) => pick(gold, 0.5 - (x + 0.5 - CX) * 0.05 + (e === 1 ? 0.25 : 0)));
      // Seal plate: an oval with a thick edge under it.
      const plate = (x, y, oy) => { const a = (x + 0.5 - CX) / 10.5, b = (y + 0.5 - oy) / 8; return a * a + b * b <= 1; };
      fill(p, (x, y) => plate(x, y, 13.5), (x, y) => pick(gold, 0.28 - (x + 0.5 - CX) * 0.02));
      fill(p, (x, y) => plate(x, y, 11.5), (x, y, e) => {
        const dx = x + 0.5 - CX, dy = y + 0.5 - 11.5;
        let v = 0.66 - (dx + dy) * 0.02;
        if (e === 1) v = 0.95; else if (e === -1) v = 0.45;
        return pick(gold, v);
      });
      // Engraved crown (three points, each with a ball): cut into the plate,
      // so its top-left walls are dark and its bottom-right walls catch light.
      const CROWN = [
        '......##......',
        '.##...##...##.',
        '.##..####..##.',
        '.##..####..##.',
        '.###.####.###.',
        '.############.',
        '.############.',
        '##############',
        '##############',
        '.############.',
      ];
      const crown = (x, y) => {
        const r = CROWN[y - 4], i = x - 13;
        return !!r && i >= 0 && i < 14 && r[i] === '#';
      };
      fill(p, crown, (x, y, e) => (e === -1 ? gold[4] : gold[1]));
      for (const [x, y] of [[19, 4], [14, 5], [25, 5]]) p.set(x, y, gold[3]);
      // The pink gem set in the crown's band.
      const GEM = ['.####.', '######', '######', '.####.'];
      GEM.forEach((row, j) => {
        for (let i = 0; i < 6; i++) {
          if (row[i] !== '#') continue;
          const x = 17 + i, y = 10 + j;
          p.set(x, y, j === 3 || i === 5 ? pink[0] : i + j < 4 ? pink[2] : pink[1]);
        }
      });
      p.set(18, 10, pink[3]); p.set(17, 11, pink[3]); p.set(18, 11, 0xffffff);
      p.set(16, 11, gold[4]); p.set(23, 12, gold[1]);   // prongs
    },

    // The Broken Seal: red wax stamped with an X, cracked, on a ribbon, a brass gear clasp.
    seal(p, t, o, K) {
      const { R, pick, fill, hash } = K;
      const brass = R(['#4a2c14', '#7a4e20', '#a86e2c', '#d09a40', '#f0c860', '#fff0b0']);
      const wax = R(['#4a0816', '#7a1020', '#a81a28', '#d42e34', '#ff6a5a', '#ffb0a0']);
      const rib = R(['#1a1636', '#2a2458', '#40387e', '#5a52a8']);
      const CX = 19, CY = 21;
      // Ribbon tails with notched ends.
      const tail = (x, y, dir) => {
        const u = (y - 26), along = x + 0.5 - (CX + dir * (3 + u * 0.55));
        return y >= 26 && y <= 38 && Math.abs(along) <= 2.4 && !(y >= 37 && Math.abs(along) < 1);
      };
      fill(p, (x, y) => tail(x, y, -1), (x, y, e) => pick(rib, 0.55 + e * 0.3 - (y - 26) * 0.02));
      fill(p, (x, y) => tail(x, y, 1), (x, y, e) => pick(rib, 0.35 + e * 0.25 - (y - 26) * 0.02));
      // Gear clasp behind the wax, top right.
      const GX = 30, GY = 10;
      fill(p, (x, y) => {
        const dx = x + 0.5 - GX, dy = y + 0.5 - GY;
        const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        const tooth = Math.cos(a * 7 + 0.4) > -0.15 ? 9 : 6.8;
        return d <= tooth && d >= 2.4;
      }, (x, y, e) => {
        const dx = x + 0.5 - GX, dy = y + 0.5 - GY;
        const d = Math.hypot(dx, dy);
        let v = 0.55 - (dx + dy) * 0.03;
        if (d > 3.6 && d < 4.6) v -= 0.25;
        if (e === 1) v += 0.3; else if (e === -1) v -= 0.25;
        return pick(brass, v);
      });
      // Wax blob with uneven edge, domed rim, flat stamped centre.
      const rad = a => 13 + 0.9 * Math.sin(a * 5 + 0.7) + 0.5 * Math.sin(a * 9 + 2);
      const crackX = y => 20.5 + (y % 4 < 2 ? 0 : -1) + (y > 20 ? -1 : 0) + (hash(0, y, 5) > 0.6 ? 1 : 0);
      for (let y = 0; y < 40; y++) {
        for (let x = 0; x < 40; x++) {
          const dx = x + 0.5 - CX, dy = y + 0.5 - CY;
          const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
          const r = rad(a);
          if (d > r) continue;
          const l = -(dx + dy) / (Math.max(d, 0.01) * Math.SQRT2);
          let v;
          if (d > r - 3) v = 0.5 + 0.42 * l * ((d - (r - 3)) / 3) + 0.1;
          else v = 0.5 - (dx + dy) * 0.012;
          // The stamp's ring, pressed in.
          if (d > 8.2 && d < 9.6) v = l > 0 ? 0.2 : 0.62;
          else if (d >= 9.6 && d < 10.6 && l < 0) v = 0.75;
          // The X, pressed in.
          const s1 = Math.abs(dx - dy), s2 = Math.abs(dx + dy);
          if (d < 6.6 && (s1 < 1.5 || s2 < 1.5)) v = (dx + dy < -1 && s2 >= 1.5) || (dx - dy < -1 && s1 >= 1.5) ? 0.02 : 0.2;
          p.set(x, y, pick(wax, v));
        }
      }
      // The crack: a jagged gap from top to bottom.
      for (let y = 6; y <= 36; y++) {
        const x = Math.floor(crackX(y));
        if (p.has(x, y) && p.get(x, y) !== -1) {
          const inWax = Math.hypot(x + 0.5 - CX, y + 0.5 - CY) < 14.5;
          if (!inWax) continue;
          p.set(x, y, -1);
          if (p.has(x + 1, y)) p.set(x + 1, y, wax[4]);
        }
      }
      // Wax gloss.
      for (const [x, y] of [[11, 13], [12, 12], [13, 11], [10, 15]]) p.set(x, y, wax[5]);
    },

    // The Map of the Crossing: a parchment scroll (o.unroll 0..1 rolls it up)
    // showing a chequered land, a dotted trail of footsteps, a crack at the edge.
    map(p, t, o, K) {
      const { R, pick, fill, hash, NO_GLINT } = K;
      const paper = R(['#8a6238', '#b08a58', '#d4b27c', '#ecd6a4', '#f8ecc8']);
      const wood = R(['#3a2010', '#5e361a', '#8a5428', '#b87a3c']);
      const k = o.unroll === undefined ? 1 : Math.max(0, Math.min(1, o.unroll));
      const CX = 20, HW = Math.round(13 * k);    // half the visible paper width
      const Y0 = 8, Y1 = 32;
      // Paper, in map coordinates mx (-13..12).
      for (let y = Y0; y <= Y1; y++) {
        for (let x = CX - HW; x < CX + HW; x++) {
          const mx = x - CX;
          const edge = Math.min(y - Y0, Y1 - y);
          let v = 0.72 - (mx + y - 20) * 0.006;
          if (edge === 0) v = y === Y0 ? 0.55 : 0.35;
          else if (hash(mx, y, 9) > 0.93) v -= 0.18;           // stains
          let c = pick(paper, v);
          // The land: 4 px chequered squares, 6 wide and 5 high.
          const bx = mx + 12, by = y - 10;
          if (bx >= 0 && bx < 24 && by >= 0 && by < 20) {
            const dark = ((bx >> 2) + (by >> 2)) % 2 === 1;
            c = pick(paper, dark ? v - 0.22 : v + 0.02);
            if (bx === 0 || bx === 23 || by === 0 || by === 19) c = paper[0];
          }
          // The far edge is broken: a jagged dark crack along the top rank.
          const zz = [0, 1, 2, 1, 1, 2, 3, 2, 1, 1, 0, 1][bx % 12];
          if (bx > 0 && bx < 23 && by === 1 + zz) c = 0x4a2a18;
          else if (bx > 0 && bx < 23 && by === 2 + zz) c = paper[4];
          p.set(x, y, c);
        }
      }
      // Footsteps: pairs of dots climbing the ranks, ending one square from the edge.
      const steps = [[-10, 28], [-8, 26], [-7, 24], [-5, 23], [-4, 21], [-2, 20], [-1, 18], [1, 17], [3, 18]];
      steps.forEach(([sx, sy], i) => {
        const x = CX + sx;
        if (x < CX - HW || x >= CX + HW) return;
        p.set(x, sy, 0xa02020, NO_GLINT);
        if (i % 2) p.set(x, sy - 1, 0xa02020, NO_GLINT);
      });
      // The last step: a red ring.
      const EX = CX + 6, EY = 15;
      for (let dy = -2; dy <= 1; dy++) {
        for (let dx = -2; dx <= 1; dx++) {
          const edge = dx === -2 || dx === 1 || dy === -2 || dy === 1;
          const corner = (dx === -2 || dx === 1) && (dy === -2 || dy === 1);
          const x = EX + dx;
          if (edge && !corner && x >= CX - HW && x < CX + HW) p.set(x, EY + dy, 0xc82828, NO_GLINT);
        }
      }
      // Rolls at both edges, with wooden knobs.
      for (const side of [-1, 1]) {
        const rx = side < 0 ? CX - HW - 3 : CX + HW - 1;   // left column of the 4 px roll
        fill(p, (x, y) => x >= rx && x <= rx + 3 && y >= Y0 - 2 && y <= Y1 + 2, (x, y, e) => {
          const u = x - rx;
          let v = [0.92, 0.72, 0.5, 0.3][u];
          if (y === Y0 - 2 || y === Y1 + 2) v -= 0.25;
          return pick(paper, v);
        });
        for (let x = rx + 1; x <= rx + 2; x++) {
          for (const y of [Y0 - 4, Y0 - 3, Y1 + 3, Y1 + 4]) p.set(x, y, pick(wood, x === rx + 1 ? 0.9 : 0.4));
        }
      }
    },

    // The Wanted Poster: aged paper nailed up, WANTED, a pawn, a big X signature, a torn corner.
    poster(p, t, o, K) {
      const { R, pick, hash, text } = K;
      const paper = R(['#7a5230', '#a87c48', '#d0aa6c', '#e8cc92', '#f6e2b4']);
      const INK = 0x3a2014;
      const X0 = 7, X1 = 32, Y0 = 3, Y1 = 37;
      for (let y = Y0; y <= Y1; y++) {
        for (let x = X0; x <= X1; x++) {
          // Torn top-right corner and ragged bottom edge.
          if (x + (Y0 - y) > X1 - 6 + (hash(y, 0, 2) > 0.5 ? 1 : 0)) continue;
          if (y >= Y1 - 1 && hash(x, 1, 7) > (y === Y1 ? 0.45 : 0.85)) continue;
          const edge = Math.min(x - X0, X1 - x, y - Y0, Y1 - y);
          let v = 0.7 - (x - X0 + y - Y0) * 0.005;
          if (edge <= 1 && hash(x, y, 1) > 0.35) v -= 0.25;       // burnt, grubby edge
          if (hash(x >> 1, y >> 1, 3) > 0.9) v -= 0.12;
          p.set(x, y, pick(paper, v));
        }
      }
      // Nail.
      p.set(19, 5, 0x6a6a78); p.set(20, 5, 0x3a3a48); p.set(19, 6, 0x3a3a48); p.set(20, 6, 0x202028);
      text(p, 'WANTED', 8, 8, INK);
      // Portrait frame and pawn silhouette.
      for (let x = 12; x <= 27; x++) { p.set(x, 15, INK); p.set(x, 29, INK); }
      for (let y = 15; y <= 29; y++) { p.set(12, y, INK); p.set(27, y, INK); }
      for (let y = 16; y <= 28; y++) for (let x = 13; x <= 26; x++) p.set(x, y, pick(paper, 0.52 + (y - 16) * 0.012));
      for (let y = 17; y <= 28; y++) {
        for (let x = 13; x <= 26; x++) {
          const dx = x + 0.5 - 20;
          const head = Math.hypot(dx, y + 0.5 - 19.5) <= 2.8;
          const collar = y === 23 && Math.abs(dx) <= 3.5;
          const body = y >= 24 && y <= 26 && Math.abs(dx) <= 1.8 + (y - 24) * 1.1;
          const base = y >= 27 && Math.abs(dx) <= 5;
          const neck = y === 22 && Math.abs(dx) <= 1.5;
          if (head || collar || body || base || neck) p.set(x, y, INK);
        }
      }
      // Reward lines.
      for (let x = 10; x <= 29; x++) if (hash(x, 31, 5) > 0.25 && x !== 17) p.set(x, 31, paper[1]);
      for (let x = 10; x <= 20; x++) if (hash(x, 33, 6) > 0.3) p.set(x, 33, paper[1]);
      // The big X signature in red-brown ink.
      for (let i = 0; i <= 5; i++) {
        for (const [x, y] of [[23 + i, 32 + i * 0.8], [28 - i, 32 + i * 0.8]]) {
          p.set(x, Math.round(y), 0x9a2418); p.set(x + 1, Math.round(y), 0x6a1410);
        }
      }
    },

    // The Stopped Hourglass: gold caps, obsidian posts, sand frozen mid-fall.
    hourglass(p, t, o, K) {
      const { R, pick, fill, hash, TAU, NO_GLINT } = K;
      const gold = R(['#5a3410', '#8a5a1c', '#c08a2c', '#e8b840', '#ffdc70', '#fff6c8']);
      const obs = R(['#0e0a14', '#1c1428', '#2e2440', '#4a3e64', '#7a6aa0', '#b0a0d8']);
      const sand = R(['#8a5a24', '#c89038', '#f0c860', '#fff0c0']);
      const glass = R(['#221a3a', '#322a54', '#4a4478', '#8a90c8', '#d8e4ff']);
      const CX = 20;
      // Glass bulbs.
      const hw = y => 1.3 + 7.6 * Math.pow(Math.min(1, Math.abs(y + 0.5 - 20) / 11.5), 0.8);
      const bulb = (x, y) => y >= 8 && y <= 31 && Math.abs(x + 0.5 - CX) <= hw(y);
      fill(p, bulb, (x, y, e) => {
        const dx = x + 0.5 - CX, w = hw(y);
        let v = 0.35;
        if (dx < -w + 1.6 && Math.abs(y - 20) > 2) v = 0.72;   // bright left curve
        if (e === -1 || dx > w - 1) v = 0.52;
        return pick(glass, v);
      }, NO_GLINT);
      // Sand: the top bulb's lower half, a mound below, grains hanging in the neck.
      const top = y => y >= 13 && y <= 19;
      for (let y = 8; y <= 31; y++) {
        for (let x = 0; x < 40; x++) {
          if (!bulb(x, y)) continue;
          const dx = x + 0.5 - CX, w = hw(y);
          if (Math.abs(dx) > w - 1) continue;
          const inTop = top(y) && y >= 13 + (Math.abs(dx) < 2.5 ? 1 : 0);
          const inPile = y >= 26 && Math.abs(dx) <= (y - 25) * 1.9;
          if (inTop || inPile) {
            let v = 0.55 - dx * 0.04 + (y === 13 || y === 14 && Math.abs(dx) < 2.5 || y === 26 ? 0.3 : 0);
            if (hash(x, y, 11) > 0.85) v += 0.2;
            p.set(x, y, pick(sand, v), NO_GLINT);
          }
        }
      }
      // Frozen grains, shimmering.
      const grains = [[19, 20], [20, 21], [19, 22], [20, 23.4], [19, 24.6], [21, 24], [18, 25.4], [20, 25.8]];
      grains.forEach(([gx, gy], i) => {
        const tw = Math.sin(TAU * (2 + i) * t + i * 1.7);
        p.set(gx, Math.round(gy), tw > 0.4 ? sand[3] : sand[2], NO_GLINT);
      });
      const sp = Math.sin(TAU * 3 * t);
      if (sp > 0.6) p.set(18, 27, 0xffffff, NO_GLINT);
      if (sp < -0.6) p.set(22, 16, 0xffffff, NO_GLINT);
      // Obsidian posts.
      fill(p, (x, y) => (x >= 8 && x <= 10 || x >= 29 && x <= 31) && y >= 7 && y <= 32,
        (x, y, e) => {
          const u = x <= 10 ? x - 8 : x - 29;
          let v = [0.72, 0.45, 0.25][u];
          if (y % 8 === 3) v = 0.85;          // facet glints
          return pick(obs, v);
        });
      // Gold caps (top and bottom), with a band of ornament.
      for (const [ya, yb] of [[3, 7], [32, 36]]) {
        fill(p, (x, y) => y >= ya && y <= yb && x >= 6 - (y === ya + 1 || y === yb - 1 ? 1 : 0) && x <= 33 + (y === ya + 1 || y === yb - 1 ? 1 : 0),
          (x, y, e) => {
            let v = 0.6 - (x - 20) * 0.012;
            const r = y - ya;
            if (r === 0) v = 0.92; else if (r === 4) v = 0.25;
            if (r === 2 && x % 3 === 0) v = 0.3;       // engraved dots
            if (e === 1) v = Math.max(v, 0.85);
            return pick(gold, v);
          });
      }
      // Finials.
      for (const y of [2, 37]) { p.set(19, y, gold[4]); p.set(20, y, gold[2]); }
    },
  },

  // ---------- PIXI ----------

  _canvas(px) {
    const N = this.N;
    const c = document.createElement('canvas');
    c.width = N; c.height = N;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const v = px[i];
      if (!v) continue;
      img.data[i * 4] = (v >> 16) & 255;
      img.data[i * 4 + 1] = (v >> 8) & 255;
      img.data[i * 4 + 2] = v & 255;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  },

  // Frame 0 is the item at rest (no glint). opts.unroll for the map's roll-up.
  texture(id, frame = 0, opts = {}) {
    const key = id + ':' + frame + (opts.unroll !== undefined ? ':u' + opts.unroll.toFixed(2) : '');
    if (this._tex[key] && !this._tex[key].destroyed) return this._tex[key];
    const t = frame / this.FRAMES;
    const px = this.pixels(id, t, { ...opts, noGlint: frame === 0 });
    const tex = PIXI.Texture.from({ resource: this._canvas(px), scaleMode: 'nearest' });
    this._tex[key] = tex;
    return tex;
  },

  // Whole-number art scale when it fits, so every art pixel is the same size.
  _scaleFor(size) {
    const s = size / this.N;
    return s >= 1 ? Math.max(1, Math.floor(s + 0.001)) : s;
  },

  sprite(id, size = 120) {
    const sp = new PIXI.Sprite(this.texture(id));
    sp.anchor.set(0.5);
    sp.scale.set(this._scaleFor(size));
    return sp;
  },

  icon(id, size = 64) {
    return this.sprite(id, size);
  },

  // An item that idles: frames of its own motion plus a glint sweep, and a
  // twinkle star. Call update(dt) every frame (dt in seconds).
  animated(id, size = 120) {
    const c = new PIXI.Container();
    c.label = 'keepsake';
    const sp = new PIXI.Sprite(this.texture(id, 0));
    sp.anchor.set(0.5);
    const sc = this._scaleFor(size);
    sp.scale.set(sc);
    c.addChild(sp);
    const star = this._star(0xffffff, sc * 3.2);
    star.x = -sc * 11; star.y = -sc * 12;
    star.scale.set(0);
    c.addChild(star);
    let time = Math.random() * this.CYCLE * 0.3 + this.CYCLE * 0.4;
    let last = -1;
    c.sprite = sp;
    c.update = (dt) => {
      time = (time + (dt || 0)) % this.CYCLE;
      const f = Math.floor((time / this.CYCLE) * this.FRAMES);
      if (f !== last) {
        last = f;
        sp.texture = this.texture(id, f === 0 ? 1 : f);
      }
      // The star twinkles right after the sweep passes its corner.
      const u = time / this.CYCLE;
      const k = u > 0.3 && u < 0.42 ? Math.sin(((u - 0.3) / 0.12) * Math.PI) : 0;
      star.scale.set(k);
      star.rotation = u * 2;
    };
    return c;
  },

  _star(color, r) {
    const q = r * 0.22;
    return new PIXI.Graphics()
      .poly([0, -r, q, -q, r, 0, q, q, 0, r, -q, q, -r, 0, -q, -q])
      .fill(color);
  },

  // ---------- reveal ----------

  // Full-screen "you got it" moment over `parent` (a Pixi container at the
  // game's virtual resolution). Returns { container, advance, skip, finish }:
  // advance() skips the intro, or finishes if it has already played (wire
  // Enter/Space to it); finish() cleans up and calls onDone once.
  reveal(parent, id, opts = {}) {
    const data = (typeof Keepsakes !== 'undefined' && Keepsakes.get(id)) || { id, name: id, desc: '', color: '#ffe080' };
    const W = (typeof Layout !== 'undefined' && Layout.W) || 1280;
    const H = (typeof Layout !== 'undefined' && Layout.H) || 800;
    const portrait = H > W;
    const col = parseInt((data.color || '#ffe080').replace('#', ''), 16);
    const FT = (typeof PixiTextStyles !== 'undefined' && PixiTextStyles.FONT_TITLE) || '"Silkscreen", monospace';
    const FB = (typeof PixiTextStyles !== 'undefined' && PixiTextStyles.FONT_BODY) || '"Pixelify Sans", sans-serif';
    const CX = W / 2, IY = (portrait ? H * 0.38 : H * 0.36) - (data.use && !portrait ? 40 : 0);
    const ITEM = 240;

    const root = new PIXI.Container();
    root.label = 'keepsakeReveal';
    root.eventMode = 'static';
    root.cursor = 'pointer';
    root.hitArea = new PIXI.Rectangle(0, 0, W, H);
    parent.addChild(root);

    const tweens = [];
    const T = (target, vars) => { const tw = gsap.to(target, vars); tweens.push(tw); return tw; };
    const tl = gsap.timeline();
    tweens.push(tl);

    // Dim.
    const dim = new PIXI.Graphics().rect(0, 0, W, H).fill({ color: 0x06040c, alpha: 0.82 });
    dim.alpha = 0;
    root.addChild(dim);

    // Light rays: two wheels of wedges turning opposite ways.
    const rays = new PIXI.Container();
    rays.x = CX; rays.y = IY;
    const wheel = (n, len, width, color, alpha) => {
      const g = new PIXI.Graphics();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const a0 = a - width / 2, a1 = a + width / 2;
        g.poly([0, 0, Math.cos(a0) * len, Math.sin(a0) * len, Math.cos(a1) * len, Math.sin(a1) * len]).fill({ color, alpha });
      }
      g.blendMode = 'add';
      return g;
    };
    const R1 = wheel(12, Math.max(W, H), 0.16, col, 0.17);
    const R2 = wheel(8, Math.max(W, H) * 0.7, 0.1, 0xffffff, 0.1);
    rays.addChild(R1, R2);
    rays.scale.set(0);
    root.addChild(rays);

    // Soft stepped glow behind the item.
    const glow = new PIXI.Graphics();
    [[1.3, 0.08], [1.0, 0.1], [0.75, 0.14], [0.52, 0.2]].forEach(([k, a]) => glow.circle(0, 0, ITEM * k).fill({ color: col, alpha: a }));
    glow.blendMode = 'add';
    glow.x = CX; glow.y = IY; glow.alpha = 0;
    root.addChild(glow);

    // Shockwave ring and the flash.
    // Redrawn as they grow so the stroke thins out instead of scaling up.
    const ring = new PIXI.Graphics();
    ring.x = CX; ring.y = IY;
    root.addChild(ring);
    const wave = { r: 30, a: 0 }, wave2 = { r: 30, a: 0 };
    const drawRings = () => {
      ring.clear();
      if (wave.a > 0.01) ring.circle(0, 0, wave.r).stroke({ color: 0xffffff, width: Math.max(2, 18 * (1 - wave.r / 720)), alpha: wave.a });
      if (wave2.a > 0.01) ring.circle(0, 0, wave2.r).stroke({ color: col, width: Math.max(2, 10 * (1 - wave2.r / 560)), alpha: wave2.a });
    };

    // The item.
    const holder = new PIXI.Container();
    holder.x = CX; holder.y = H + ITEM;
    const item = this.animated(id, ITEM);
    holder.addChild(item);
    root.addChild(holder);
    // The map arrives rolled up and unrolls when it lands.
    const roll = { k: id === 'map' ? 0 : 1 };
    if (id === 'map') item.sprite.texture = this.texture('map', 0, { unroll: 0 });

    // Sparkles (pixel squares), made on impact.
    const sparks = new PIXI.Container();
    root.addChild(sparks);
    const live = [];
    const burst = () => {
      for (let i = 0; i < 44; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 260 + Math.random() * 520;
        const sz = [4, 6, 8, 8, 12][i % 5];
        const g = new PIXI.Graphics().rect(-sz / 2, -sz / 2, sz, sz).fill(i % 3 === 0 ? 0xffffff : col);
        g.x = CX; g.y = IY;
        sparks.addChild(g);
        live.push({ g, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.7 + Math.random() * 0.7, age: 0 });
      }
    };
    // Twinkle stars that keep popping around the item at rest.
    const twinkles = [];
    for (let i = 0; i < 6; i++) {
      const s = this._star(i % 2 ? col : 0xffffff, 10 + (i % 3) * 5);
      s.scale.set(0);
      root.addChild(s);
      twinkles.push({ s, phase: i / 6 });
    }

    // Banner with the name, the description, the prompt.
    // A little higher when the use line is shown below the description.
    const bannerY = (portrait ? H * 0.64 : H * 0.665) - (data.use ? (portrait ? 40 : 64) : 0);
    const banner = new PIXI.Container();
    banner.x = CX; banner.y = bannerY;
    const caption = new PIXI.Text({ text: (opts.caption || 'KEEPSAKE FOUND').toUpperCase(), style: { fontFamily: FT, fontSize: 20, fill: data.color || '#ffe080', letterSpacing: 4 } });
    caption.anchor.set(0.5);
    caption.y = -62;
    const name = new PIXI.Text({ text: data.name, style: { fontFamily: FT, fontSize: portrait ? 34 : 40, fontWeight: 'bold', fill: '#fff6dc', dropShadow: { color: '#000000', distance: 4, angle: Math.PI / 2, blur: 0, alpha: 0.8 } } });
    name.anchor.set(0.5);
    const maxW = W - 120;
    if (name.width > maxW) name.scale.set(maxW / name.width);
    const bw = Math.min(W - 60, Math.max(name.width * name.scale.x + 120, 520));
    const plate = new PIXI.Graphics();
    const step = 6, bh = 84;
    // A stepped-corner pixel plate with ribbon tails.
    const tailW = 46;
    plate.poly([-bw / 2 - tailW, -bh / 2 + 14, -bw / 2, -bh / 2 + 14, -bw / 2, bh / 2 + 14, -bw / 2 - tailW, bh / 2 + 14, -bw / 2 - tailW + 22, 14]).fill(PixiKeepsake._dark(col, 0.45));
    plate.poly([bw / 2 + tailW, -bh / 2 + 14, bw / 2, -bh / 2 + 14, bw / 2, bh / 2 + 14, bw / 2 + tailW, bh / 2 + 14, bw / 2 + tailW - 22, 14]).fill(PixiKeepsake._dark(col, 0.45));
    plate.poly([
      -bw / 2 + step, -bh / 2, bw / 2 - step, -bh / 2, bw / 2 - step, -bh / 2 + step, bw / 2, -bh / 2 + step,
      bw / 2, bh / 2 - step, bw / 2 - step, bh / 2 - step, bw / 2 - step, bh / 2, -bw / 2 + step, bh / 2,
      -bw / 2 + step, bh / 2 - step, -bw / 2, bh / 2 - step, -bw / 2, -bh / 2 + step, -bw / 2 + step, -bh / 2 + step,
    ]).fill(0x1a1226).stroke({ color: col, width: 4, alignment: 1 });
    plate.rect(-bw / 2 + 12, -bh / 2 + 8, bw - 24, 4).fill({ color: 0xffffff, alpha: 0.12 });
    const desc = new PIXI.Text({ text: data.desc || '', style: { fontFamily: FB, fontSize: portrait ? 24 : 24, fill: '#e8dcc8', align: 'center', wordWrap: true, wordWrapWidth: Math.min(W - 100, 760), lineHeight: 32 } });
    desc.anchor.set(0.5, 0);
    desc.y = bh / 2 + 22;
    // What it does, in its own colour (Keepsakes `use`).
    let use = null;
    if (data.use) {
      use = new PIXI.Text({ text: data.use, style: { fontFamily: FB, fontSize: 21, fontWeight: 'bold', fill: data.color || '#ffe080', align: 'center', wordWrap: true, wordWrapWidth: Math.min(W - 100, 760), lineHeight: 28 } });
      use.anchor.set(0.5, 0);
      use.y = desc.y + desc.height + 12;
    }
    let sub = null;
    if (opts.subtitle) {
      sub = new PIXI.Text({ text: opts.subtitle, style: { fontFamily: FB, fontSize: 20, fill: '#b8a8d0', fontStyle: 'italic', align: 'center', wordWrap: true, wordWrapWidth: Math.min(W - 100, 760) } });
      sub.anchor.set(0.5, 0);
      sub.y = (use || desc).y + (use || desc).height + 12;
    }
    banner.addChild(plate, caption, name, desc);
    if (use) banner.addChild(use);
    if (sub) banner.addChild(sub);
    banner.alpha = 0; banner.scale.set(0.6);
    root.addChild(banner);

    const prompt = new PIXI.Text({ text: 'Click to continue', style: { fontFamily: FB, fontSize: 22, fill: '#ffffff' } });
    prompt.anchor.set(0.5);
    prompt.x = CX; prompt.y = H - (portrait ? 90 : 46);
    prompt.alpha = 0;
    root.addChild(prompt);

    // ---- timeline ----
    const land = () => {
      burst();
      if (typeof audioManager !== 'undefined' && audioManager.playVictory) audioManager.playVictory();
      // A short thump: the whole overlay jolts a few pixels (off when Graphics turns shake off).
      if (typeof Graphics === 'undefined' || !Graphics.shake || Graphics.shake()) {
        const j = { k: 1 };
        T(j, { k: 0, duration: 0.3, ease: 'power2.out', onUpdate: () => { root.x = (Math.random() - 0.5) * 12 * j.k; root.y = (Math.random() - 0.5) * 12 * j.k; }, onComplete: () => { root.x = 0; root.y = 0; } });
      }
    };
    tl.to(dim, { alpha: 1, duration: 0.35, ease: 'power1.out' }, 0);
    tl.call(() => { if (typeof audioManager !== 'undefined' && audioManager.playPromotion) audioManager.playPromotion(); }, null, 0.1);
    // Rise with a coin-flip spin, overshoot, drop back.
    tl.to(holder, { y: IY - 40, duration: 0.7, ease: 'power2.out' }, 0.15);
    const flip = { a: 0 };
    tl.to(flip, {
      a: Math.PI * 6, duration: 0.85, ease: 'power2.out',
      onUpdate: () => { holder.scale.x = Math.cos(flip.a) * (0.6 + 0.4 * (flip.a / (Math.PI * 6))); },
    }, 0.15);
    holder.scale.y = 0.5;
    tl.to(holder.scale, { y: 1, duration: 0.7, ease: 'power2.out' }, 0.15);
    tl.to(holder, { y: IY, duration: 0.45, ease: 'bounce.out' }, 0.85);
    tl.call(land, null, 1.0);
    tl.set(holder.scale, { x: 1.25, y: 0.8 }, 1.0);
    tl.to(holder.scale, { x: 1, y: 1, duration: 0.5, ease: 'elastic.out(1, 0.45)' }, 1.02);
    if (id === 'map') {
      tl.to(roll, {
        k: 1, duration: 0.6, ease: 'power2.out',
        onUpdate: () => { item.sprite.texture = this.texture('map', 0, { unroll: Math.round(roll.k * 13) / 13 }); },
      }, 1.0);
    }
    tl.to(rays.scale, { x: 1, y: 1, duration: 0.6, ease: 'back.out(1.6)' }, 0.95);
    tl.to(glow, { alpha: 1, duration: 0.4 }, 0.95);
    tl.set(wave, { a: 1, r: 40 }, 1.0);
    tl.to(wave, { r: 700, a: 0, duration: 0.7, ease: 'power2.out', onUpdate: drawRings }, 1.0);
    tl.set(wave2, { a: 0.9, r: 40 }, 1.1);
    tl.to(wave2, { r: 540, a: 0, duration: 0.85, ease: 'power2.out', onUpdate: drawRings }, 1.1);
    const flash = new PIXI.Graphics().rect(0, 0, W, H).fill(0xffffff);
    flash.alpha = 0; flash.blendMode = 'add';
    root.addChild(flash);
    tl.set(flash, { alpha: 0.4 }, 1.0);
    tl.to(flash, { alpha: 0, duration: 0.35, ease: 'power2.out' }, 1.01);
    tl.to(banner, { alpha: 1, duration: 0.3 }, 1.3);
    tl.to(banner.scale, { x: 1, y: 1, duration: 0.5, ease: 'back.out(2)' }, 1.3);
    tl.to(prompt, { alpha: 1, duration: 0.3 }, 2.0);
    tl.call(() => {
      T(prompt, { alpha: 0.35, duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }, null, 2.3);

    // ---- per-frame ----
    let clock = 0;
    const tick = (ticker) => {
      const dt = Math.min(0.05, (ticker && ticker.deltaMS ? ticker.deltaMS : 16.7) / 1000);
      clock += dt;
      item.update(dt);
      R1.rotation += dt * 0.25;
      R2.rotation -= dt * 0.4;
      if (tl.progress() >= 1) holder.y = IY + Math.sin(clock * 2.2) * 6;
      glow.scale.set(1 + Math.sin(clock * 3) * 0.04);
      for (let i = live.length - 1; i >= 0; i--) {
        const s = live[i];
        s.age += dt;
        s.vy += 700 * dt;
        s.vx *= 0.985;
        s.g.x += s.vx * dt; s.g.y += s.vy * dt;
        s.g.alpha = Math.max(0, 1 - s.age / s.life);
        if (s.age >= s.life) { s.g.destroy(); live.splice(i, 1); }
      }
      if (clock > 1.2) {
        for (const w of twinkles) {
          const u = (clock / 1.6 + w.phase) % 1;
          if (u < 0.02) {
            const a = Math.random() * Math.PI * 2, r = ITEM * (0.55 + Math.random() * 0.35);
            w.s.x = CX + Math.cos(a) * r; w.s.y = IY + Math.sin(a) * r;
          }
          w.s.scale.set(u < 0.3 ? Math.sin((u / 0.3) * Math.PI) : 0);
          w.s.rotation = u * 3;
        }
      }
    };
    const ticker = (typeof PixiApp !== 'undefined' && PixiApp.app && PixiApp.app.ticker) || null;
    const gtick = () => tick({ deltaMS: gsap.ticker.deltaRatio() * 16.67 });
    if (ticker) ticker.add(tick); else gsap.ticker.add(gtick);

    let done = false;
    const api = {
      container: root,
      // Jump to the end of the intro (banner up, item landed).
      skip() {
        if (done || tl.progress() >= 1) return;
        tl.progress(1);
      },
      advance() {
        if (done) return;
        if (tl.progress() < 0.8) api.skip(); else api.finish();
      },
      finish() {
        if (done) return;
        done = true;
        if (ticker) ticker.remove(tick); else gsap.ticker.remove(gtick);
        for (const tw of tweens) tw.kill();
        gsap.to(root, {
          alpha: 0, duration: 0.25, onComplete: () => {
            if (root.parent) root.parent.removeChild(root);
            root.destroy({ children: true });
            if (opts.onDone) opts.onDone();
          },
        });
      },
    };
    root.on('pointertap', () => api.advance());
    return api;
  },

  _dark(c, k) {
    const r = ((c >> 16) & 255) * k, g = ((c >> 8) & 255) * k, b = (c & 255) * k;
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
  },
};

if (typeof module !== 'undefined') module.exports = PixiKeepsake;
