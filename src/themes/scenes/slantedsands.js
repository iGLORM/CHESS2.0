// The Slanted Sands in the late afternoon: the World 3 live background.
//
// A desert that tilts: the whole horizon runs downhill to the right, and the pyramids
// lean along Bish-Bosh's diagonal. Blazing low sun and gold sand against a turquoise sky,
// cool blue dune shadows and a turquoise oasis. A mitre-shaped monument, a half-buried
// bishop, palms, a caravan on the far ridge.
// Moves: sand streams off the dune crests, heat shimmer on the horizon, palms sway, the
// oasis glints, the caravan walks, vultures circle, high cirrus drifts, dust devils.
LiveScenes.register({
  id: 'slantedsands',
  width: 320,
  height: 200,
  loop: 120,
  still: 30,
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, noiseLoop, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over, rect, line, disc, glow } = K;
    let buf = null;

    const TILT = 0.075;                                   // the land runs downhill to the right
    const tilt = x => (x - 160) * TILT;
    const SX = 64, SY = 58, SR = 12;
    const SKYB = new Uint32Array(W * H), BACK = new Uint32Array(W * H);
    const MASK = new Uint8Array(W * H), MASKC = new Uint32Array(W * H);

    // ---------- sky ----------
    const SKY = ['#1e4a8a', '#2a64a4', '#3a82b8', '#58a2c4', '#84bcc8', '#b8d2c0', '#e8dca8', '#fce8b0', '#fff6d8'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - SX, (y - SY) * 1.2);
      SKYB[y * W + x] = ramp(SKY, (y - tilt(x) * 0.3) / 130 + 0.4 * Math.exp(-sq(d / 70)) + 0.3 * Math.exp(-sq(d / 22)), x, y);
    }
    K.disc(SKYB, SX, SY, SR + 1.3, (dx, dy, d) => d * (SR + 1.3) < SR ? C(d < 0.7 ? '#ffffff' : '#fffae0') : C('#ffeaa0'));

    // ---------- land layers along the tilted horizon ----------
    const HAZE = '#e8d0a8';
    function dune(topf, lit, shade, haze, crest, seed, wind) {
      const L = lit.map(h => C(mix(h, HAZE, haze))), S = shade.map(h => C(mix(h, HAZE, haze))), CR = C(mix(crest, HAZE, haze * 0.5));
      for (let x = 0; x < W; x++) {
        const ty = Math.round(topf(x)), slope = topf(x + 1) - topf(x - 1);
        for (let y = Math.max(0, ty); y < H; y++) {
          const dy = y - ty, i = y * W + x;
          // Lee faces (sloping away from the sun on the left) are in cool shade, down to a
          // depth that grows with the slope: a slip-face wedge, not a whole column.
          const sunny = slope > -0.15 || dy > (-slope - 0.15) * 30;
          let c;
          if (dy === 0) c = sunny ? CR : S[0];
          else {
            let t = dy / 24;
            if (((y + Math.round(x * 0.35 + 3 * Math.sin(x / 11 + seed))) % 5) === 0) t += 0.3;   // wind ripples
            c = ramp(sunny ? L : S, t, x, y);
          }
          BACK[i] = c;
          if (wind && dy < 2 && sunny) { MASK[i] = 1; MASKC[i] = c; }
        }
      }
    }
    // Far dunes and the far ridge the caravan walks on.
    const ridgeFar = x => 112 + tilt(x) + 6 * fbm1(x / 40, 2);
    dune(ridgeFar, ['#f0d0a0', '#e0b888', '#c89a78'], ['#a88aa0', '#9a7c98', '#8a7090'], 0.45, '#fff0c8', 1, false);
    // Leaning pyramids, sheared along the tilt.
    function pyramid(cx, baseY, hw, h, lean) {
      const LIT = ['#fce0a0', '#f0c878', '#d8a860'].map(C), SH = ['#9a7890', '#806480', '#6a5070'].map(C), EDGE = C('#fff4c8');
      for (let j = 0; j <= h; j++) {
        const y = baseY - j, w = hw * (1 - j / h), apx = cx + lean * j;
        for (let x = Math.round(apx - w); x <= Math.round(apx + w); x++) {
          const litFace = x < apx + 0.5;                       // sun on the left
          const course = j % 4 === 0;
          let c = litFace ? ramp(LIT, (1 - j / h) * 0.5 + (course ? 0.35 : 0), x, y) : ramp(SH, (course ? 0.5 : 0.1), x, y);
          if (Math.abs(x - apx) < 0.6) c = EDGE;
          put(BACK, x, y + Math.round(tilt(x) - tilt(cx)), c);
        }
      }
    }
    pyramid(214, 118 + tilt(214), 22, 34, 0.35);
    pyramid(262, 122 + tilt(262), 30, 46, 0.4);
    pyramid(300, 124 + tilt(300), 16, 22, 0.35);
    const ridgeMid = x => 124 + tilt(x) + 8 * Math.sin(x / 34 + 1) + 3 * Math.sin(x / 13);
    dune(ridgeMid, ['#f8d898', '#ecc07c', '#d49c64'], ['#9a86a8', '#86709a', '#70608c'], 0.2, '#fff6d0', 2, true);

    // The oasis: a turquoise pool in a hollow, with palms.
    const OX = 92, OY = 146;
    for (let y = OY - 6; y <= OY + 6; y++) for (let x = OX - 40; x <= OX + 40; x++) {
      const e = sq((x - OX) / 38) + sq((y - OY) / 5.5);
      if (e > 1) continue;
      const yy = y + Math.round(tilt(x) - tilt(OX)), i = yy * W + x;
      if (e > 0.82) BACK[i] = C('#6a8a5a');
      else { BACK[i] = ramp(['#9ae8e0', '#4ac0c8', '#2a8aa8', '#1e6088'].map(C), 0.2 + (y - OY + 6) / 14, x, yy); MASK[i] = 2; MASKC[i] = BACK[i]; }
    }
    const PALMS = [[64, 142, 30], [78, 140, 24], [126, 144, 26]].map(([x, y, h], i) => ({ x, y: y + Math.round(tilt(x) - tilt(OX)), h, p: i * 2.1 }));
    for (const P of PALMS) for (let j = 0; j < P.h; j++) {
      const x = P.x + Math.round(Math.sin(j / P.h * 1.6) * 4);
      put(BACK, x, P.y - j, C(j % 3 === 0 ? '#5a3a2a' : '#7a5234')); put(BACK, x + 1, P.y - j, C('#4a2e24'));
    }

    // The mitre monument on the left, and its long shadow.
    (function mitre() {
      const cx = 30, base = Math.round(142 + tilt(30));
      // A giant bishop: plinth, tapering body, collar, and a mitre head with its slit.
      const width = j => j < 5 ? 11 : j < 30 ? 9 - (j - 5) * 0.2 : j < 34 ? 7.5 : j < 60 ? 7.5 * Math.sin(Math.PI * Math.min(1, (j - 30) / 34 + 0.12)) : 0;
      for (let j = 0; j < 60; j++) {
        const y = base - j, w = width(j);
        for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
          const lit = x < cx + 1;
          let c = lit ? (x < cx - w + 2 ? '#fff0c0' : '#e8c080') : '#8a6a80';
          if (j === 4 || j === 30 || j === 33) c = lit ? '#b88850' : '#5a4468';
          if (j > 42 && j < 56 && Math.abs(x - (cx + 3 - (j - 42) * 0.45)) < 0.8) c = '#3a2a3a';   // the slit
          put(BACK, x, y, C(c));
        }
      }
      disc(BACK, cx, base - 62, 2.4, (dx, dy) => C(dx < 0 ? '#fff0c0' : '#c8a078'));
      for (let i = 0; i < 70; i++) for (let w = -2; w <= 2; w++) blendAt(BACK, cx + 6 + i, base + 1 + Math.round(i * 0.18) + w, C('#5a4a78'), 0.45 * (1 - i / 70));
    })();

    // Foreground dune in shade, with a half-buried bishop.
    const ridgeNear = x => 168 + tilt(x) * 0.6 + 6 * Math.sin(x / 50 + 2) + 2 * Math.sin(x / 17);
    dune(ridgeNear, ['#e8b878', '#c89060', '#9a6a50'], ['#6a5a84', '#54487a', '#40386a'], 0, '#ffe4a8', 3, true);
    (function buried() {
      const cx = 250, base = Math.round(ridgeNear(250)) + 6;
      for (let j = 0; j < 22; j++) {
        const y = base - j, w = j < 11 ? 7 : 7 * Math.sqrt(Math.max(0, 1 - sq((j - 11) / 11))) + 0.5;
        for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) put(BACK, x, y + Math.round((x - cx) * 0.35), C(x < cx - 2 ? '#f4e0c0' : x < cx + 2 ? '#c8b4a0' : '#6a5a78'));
      }
      disc(BACK, cx - 4, base - 24, 2, C('#f4e0c0'));
      for (let x = cx - 9; x <= cx + 9; x++) put(BACK, x, base + 1 + Math.round((x - cx) * 0.35), C('#e0b070'));
    })();

    const WIND_IDX = [], WATER_IDX = [];
    for (let i = 0; i < W * H; i++) {
      if (MASK[i] && BACK[i] !== MASKC[i]) MASK[i] = 0;
      if (MASK[i] === 1) WIND_IDX.push(i); else if (MASK[i] === 2) WATER_IDX.push(i);
    }

    // ---------- animated bits ----------
    const CIRRUS = Array.from({ length: 5 }, (_, i) => ({ x0: hash(i, 11) * 480, y: 14 + i * 9 + hash(i, 12) * 6, w: 30 + hash(i, 13) * 50, k: 1 }));
    const SPRAY = Array.from({ length: 70 }, (_, i) => ({ s: hash(i, 21), k: 6 + (i % 5), p: hash(i, 22), near: i % 3 !== 0 }));
    const CAMELS = Array.from({ length: 4 }, (_, i) => i * 9);
    const vignette = K.vignette(C('#2a1a3a'), 0.3, 0.45);
    const PALM_L = ['#8ab050', '#5a8a3a', '#3a6030'].map(C);

    function camel(x, y, step) {
      const c = C('#7a6078');
      rect(buf, x - 3, y - 4, 7, 3, c); put(buf, x - 1, y - 5, c); put(buf, x + 1, y - 5, c);
      line(buf, x + 3, y - 3, x + 5, y - 7, c); put(buf, x + 6, y - 7, c);
      for (const [lx, ph] of [[-3, 0], [-2, 1], [2, 0], [3, 1]]) put(buf, x + lx + ((step + ph) % 2), y - 1, c), put(buf, x + lx, y, c);
    }

    function frame(t) {
      const u = t / LOOP;
      buf.set(SKYB);
      // High cirrus drifting.
      for (const c of CIRRUS) {
        const x0 = frac(c.x0 / 480 + c.k * u) * 480 - 80;
        for (let i = 0; i < c.w; i++) {
          const y = Math.round(c.y + Math.sin(i / 7) * 1.2), a = Math.sin(Math.PI * i / c.w) * 0.45;
          if (a > bay(i, y) * 0.8) blendAt(buf, x0 + i, y, C('#f0f4f0'), 0.5);
        }
      }
      // Vultures circling.
      for (let v = 0; v < 2; v++) {
        const a = TAU * (3 + v) * u + v * 2, x = 150 + v * 40 + Math.cos(a) * 18, y = 40 + v * 10 + Math.sin(a) * 6;
        const up = Math.sin(TAU * 60 * u + v) > 0.6;
        for (const [dx, dy] of up ? [[-3, -1], [-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1], [3, -1]] : [[-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0]]) put(buf, x + dx, y + dy, C('#3a2a3a'));
      }
      over(buf, BACK);

      // Heat shimmer: rows near the horizon wobble sideways.
      for (let y = 100; y < 128; y++) {
        const dx = Math.round(Math.sin(TAU * 40 * u + y * 0.9) * 0.9 * Math.sin(TAU * 7 * u + y * 0.3));
        if (!dx) continue;
        const row = buf.slice(y * W, y * W + W);
        for (let x = 0; x < W; x++) buf[y * W + x] = row[Math.min(W - 1, Math.max(0, x - dx))];
      }
      // The caravan on the far ridge.
      const cu = frac(2 * u);
      for (const off of CAMELS) {
        const x = -30 + cu * (W + 60) - off;
        camel(x, ridgeFar(x) - 1, Math.floor(t * 4) % 2);
      }
      // Oasis glints.
      for (const i of WATER_IDX) {
        const x = i % W, y = (i / W) | 0, s = Math.sin(TAU * 30 * u + hash(x >> 1, y) * TAU);
        if (s > 0.97) buf[i] = C('#ffffff'); else if (s > 0.9) buf[i] = C('#c8fff4');
      }
      // Palms: fronds sway from the crown.
      for (const P of PALMS) {
        const tx = P.x + Math.round(Math.sin(1.6) * 4), ty = P.y - P.h;
        for (let f = 0; f < 6; f++) {
          const a = -Math.PI / 2 + (f - 2.5) * 0.62 + Math.sin(TAU * 24 * u + P.p + f) * 0.08;
          for (let r = 0; r < 12; r++) {
            const droop = r * r * 0.05;
            put(buf, tx + Math.cos(a) * r, ty + Math.sin(a) * r * 0.6 + droop, PALM_L[r < 4 ? 2 : r < 9 ? 1 : 0]);
          }
        }
        disc(buf, tx, ty + 1, 1.6, C('#6a4a2a'));
      }
      // Sand streaming off the sunlit crests.
      for (const i of WIND_IDX) {
        const x = i % W, y = (i / W) | 0;
        if (Math.sin(TAU * 20 * u - x * 0.12) > 0.8 && bay(x, y) < 0.5) buf[i] = C('#fff8e0');
      }
      for (const s of SPRAY) {
        const v = frac(s.k * u + s.p), x0 = s.s * W, top = s.near ? ridgeNear(x0) : ridgeMid(x0);
        const x = x0 + v * 26, y = top - 1 - Math.sin(v * Math.PI) * 4 + v * 3;
        blendAt(buf, x, y, C('#fff0c8'), 0.6 * (1 - v));
      }
      // A dust devil crossing the flats.
      const dv = frac(u * 2 + 0.3), dx0 = -20 + dv * (W + 40), dbase = ridgeMid(dx0) + 14;
      for (let j = 0; j < 22; j++) {
        const r = 1 + j * 0.18, a = TAU * 90 * u + j * 0.7;
        blendAt(buf, dx0 + Math.cos(a) * r + j * 0.2, dbase - j, C('#f4dcb0'), 0.35);
      }
      vignette(buf);
    }

    return (t, out) => { buf = out; frame(t); };
  },
});
