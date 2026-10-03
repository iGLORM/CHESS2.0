// The Royal Palace, late afternoon: the World 6 live background.
//
// Queenie's throne hall, drawn in true perspective: a checkered marble floor (a chess
// board fit for a queen) with a red carpet running to the gilded throne under a rose
// window, marble columns, tall arched windows. Golden beams of low sun cross the hall
// from the right against cool violet marble shade.
// Moves: sunbeams breathe, dust glitters in them, chandeliers sway and their candles
// flicker, the floor reflects the flames, banners ripple, the rose window shimmers,
// gold glints travel along the trim.
LiveScenes.register({
  id: 'royalpalace',
  width: 320,
  height: 200,
  loop: 120,
  still: 30,
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, noise2, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over, rect, line, disc, glow } = K;
    let buf = null;

    // Room geometry: eye at y=88, back wall at depth 100, walls at X = +-50, ceiling 70 high.
    const VX = 160, VY = 88, F = 100, HALF = 50, CEIL = 70, NEAR_Z = 16;
    const floorY = Z => VY + 2200 / Z;                       // floor line at depth Z
    const sx = (X, Z) => VX + X * F / Z;                     // screen x of world X at depth Z
    const sy = (h, Z) => floorY(Z) - h * F / Z;              // screen y of height h at depth Z
    const BACKB = new Uint32Array(W * H);

    const MARBLE_L = ['#fffaf2', '#efe4dc', '#d8c8c8', '#b8a4b0'].map(C);
    const MARBLE_D = ['#c88a98', '#9a6272', '#76485c', '#54344a'].map(C);
    const SHADE = ['#6a5074', '#523e62', '#3c2e50', '#2a2040', '#1c1630'].map(C);
    const GOLD = ['#fff0a0', '#ffcf40', '#c8902a', '#7a5020'].map(C);
    const CARPET = ['#e04a4a', '#b02a3a', '#7a1a2e'].map(C);

    // ---------- ceiling, back wall, side walls ----------
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      // Which surface? Back wall first.
      const bx0 = sx(-HALF, F), bx1 = sx(HALF, F), by0 = sy(CEIL, F), by1 = floorY(F);
      if (x >= bx0 && x < bx1 && y >= by0 && y < by1) {
        const h = (by1 - y);
        BACKB[i] = ramp(SHADE, 0.45 + h / 140 + (hash(x >> 2, y >> 2) > 0.9 ? 0.1 : 0), x, y);
        continue;
      }
      if (y < by0 || (y < VY && Math.abs(x - VX) > (VY - y) * (bx1 - VX) / (VY - by0))) {
        // Side walls (upper part) or ceiling: decide by comparing with the wall/ceiling edge lines.
      }
      const side = x < VX ? -1 : 1;
      const Zw = HALF * F / Math.abs(x - VX + 0.001);          // depth of the side wall at this column
      const top = sy(CEIL, Zw), bot = floorY(Zw);
      if (Zw < F && y >= top && y < bot) {
        const h = (bot - y) * Zw / F;
        let t = 0.35 + (side < 0 ? 0.25 : 0) + h / 160;
        // Arched windows between the columns.
        for (const zc of [34, 50, 70]) {
          const dz = Math.abs(Zw - zc);
          if (dz < 5 && h > 14 && h < 52 + Math.sqrt(Math.max(0, 25 - dz * dz)) * 1.2) {
            BACKB[i] = side > 0 ? ramp(['#fff6d0', '#ffe090', '#f8c070'].map(C), (h - 14) / 50, x, y) : ramp(['#a8b8e8', '#8a9ad0', '#6a78b0'].map(C), (h - 14) / 50, x, y);
            if (dz > 4.2 || Math.abs(h - 34) < 0.6) BACKB[i] = GOLD[2];
            t = -1;
          }
        }
        if (t >= 0) BACKB[i] = ramp(SHADE, t, x, y);
        if (Math.abs(h - 8) < 0.7 * F / Zw * 0.4 + 0.3 && t >= 0) BACKB[i] = GOLD[2];          // dado rail
        continue;
      }
      if (y < top || y < by0) {
        // Vaulted ceiling with gold ribs converging on the vanishing point.
        const Zc = CEIL * F / Math.max(1, floorY(F) - VY + (VY - y) * 1) ;
        const ang = Math.atan2(y - VY, x - VX), rib = Math.abs(Math.sin(ang * 9)) < 0.05;
        BACKB[i] = rib ? GOLD[3] : ramp(SHADE, 0.7 + (1 - y / 40) * 0.3, x, y);
        continue;
      }
      // Floor.
      const Z = 2200 / Math.max(0.5, y - VY), X = (x - VX) * Z / F;
      if (Math.abs(X) < 13) {
        const trim = Math.abs(X) > 11.5;
        BACKB[i] = trim ? GOLD[1 + (Math.floor(Z / 4) % 2)] : ramp(CARPET, 0.3 + (y - 110) / 200 + (Math.floor(Z / 3) % 2 ? 0.1 : 0), x, y);
      } else {
        const tile = 12.5, dark = (Math.floor(X / tile + 8) + Math.floor(Z / tile)) % 2 === 1;
        const vein = noise2(X / 4, Z / 4, dark ? 3 : 1) > 0.72;
        const P = dark ? MARBLE_D : MARBLE_L;
        let t = 0.15 + (1 - Z / F) * 0.2 + (vein ? 0.35 : 0);
        t += 0.35 * clamp((y - 170) / 30);                     // the front is in shade
        BACKB[i] = ramp(P, t, x, y);
      }
    }
    // Columns on both sides, in front of the walls.
    const COLS = [];
    for (const Z of [26, 42, 60, 82]) for (const s of [-1, 1]) COLS.push({ X: s * 43, Z });
    COLS.sort((a, b) => b.Z - a.Z);
    for (const c of COLS) {
      const cx = sx(c.X, c.Z), w = 7 * F / c.Z, top = sy(CEIL, c.Z), bot = floorY(c.Z);
      for (let y = Math.floor(top); y < bot; y++) for (let x = Math.floor(cx - w / 2); x <= cx + w / 2; x++) {
        const rel = (x - (cx - w / 2)) / w, h = (bot - y) * c.Z / F;
        const lit = c.X < 0 ? rel > 0.55 : rel > 0.7;          // the sun comes from the right-hand windows
        let col = ramp(lit ? MARBLE_L : SHADE, lit ? 0.1 + (1 - rel) * 0.4 : 0.2 + rel * 0.3, x, y);
        if (h < 5 || h > CEIL - 7) col = h < 2 || h > CEIL - 3 ? GOLD[2] : ramp(GOLD, lit ? 0.1 : 0.7, x, y);
        else if (Math.floor(rel * 6) !== Math.floor((rel + 1 / w) * 6) && rel < 0.95) col = lit ? MARBLE_L[2] : SHADE[3];     // flutes
        put(BACKB, x, y, col);
      }
    }
    // The throne on its dais, under the rose window.
    const TY = floorY(F);
    for (let s = 0; s < 3; s++) rect(BACKB, VX - 22 + s * 4, TY - 3 - s * 3, 45 - s * 8, 3, s % 2 ? CARPET[1] : GOLD[2]);
    (function throne() {
      const x0 = VX - 9, y0 = TY - 36;
      for (let y = y0; y < TY - 9; y++) for (let x = x0; x < x0 + 19; x++) {
        const back = y < y0 + 18, seat = y >= TY - 16;
        const rel = (x - x0) / 19;
        if (back && (x < x0 + 2 || x > x0 + 16 || y < y0 + 2)) put(BACKB, x, y, ramp(GOLD, rel > 0.6 ? 0.1 : 0.5, x, y));
        else if (back) put(BACKB, x, y, ramp(CARPET, 0.4 + rel * 0.3, x, y));
        else put(BACKB, x, y, ramp(GOLD, seat ? 0.2 + rel * 0.4 : 0.6, x, y));
      }
      // A crown on top.
      for (const [dx, dy] of [[-4, 0], [-4, -1], [-4, -2], [0, 0], [0, -1], [0, -2], [0, -3], [4, 0], [4, -1], [4, -2], [-3, 0], [-2, 0], [-1, 0], [1, 0], [2, 0], [3, 0], [-2, -1], [2, -1]])
        put(BACKB, VX + dx, y0 - 1 + dy, GOLD[1]);
      put(BACKB, VX, y0 - 5, C('#e03a5a'));
    })();
    // Rose window.
    const RX = VX, RY = sy(CEIL, F) + 14, RR = 11;
    disc(BACKB, RX, RY, RR + 1.5, GOLD[3]);
    disc(BACKB, RX, RY, RR, (dx, dy, d) => {
      const a = Math.atan2(dy, dx), seg = Math.floor((a + Math.PI) / (TAU / 12));
      if (Math.abs(Math.sin(6 * a)) < 0.12 || Math.abs(d - 0.55) < 0.06) return GOLD[2];
      return C(d < 0.3 ? '#fff0a0' : ['#e8506a', '#ffcf40', '#5a7ae0', '#ffcf40'][seg % 4]);
    });
    // Banners either side of the throne.
    const BANNERS = [VX - 36, VX + 28].map((x, i) => ({ x, y: sy(CEIL, F) + 6, p: i * 2 }));

    // ---------- animated bits ----------
    // Sunbeams: from each right-hand window down-left across the floor.
    const BEAMS = [34, 50, 70].map((Z, i) => {
      const x = sx(HALF, Z), yTop = sy(52, Z), yBot = sy(14, Z);
      const fx = sx(-5, Z - 12), fy = floorY(Z - 12);
      return { quad: [[x, yTop], [x, yBot], [fx - 40 * F / Z, fy + 4], [fx, fy - 6]], k: 3 + i, p: i * 1.9 };
    });
    function inQuad(px, py, q) {
      let inside = false;
      for (let i = 0, j = 3; i < 4; j = i++) {
        const [xi, yi] = q[i], [xj, yj] = q[j];
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
    const BEAM_PIX = BEAMS.map(b => {
      const xs = b.quad.map(p => p[0]), ys = b.quad.map(p => p[1]), list = [];
      for (let y = Math.max(0, Math.floor(Math.min(...ys))); y < Math.min(H, Math.max(...ys)); y++)
        for (let x = Math.max(0, Math.floor(Math.min(...xs))); x < Math.min(W, Math.max(...xs)); x++) if (inQuad(x, y, b.quad)) list.push(y * W + x);
      return list;
    });
    const CHANDELIERS = [[-24, 30], [24, 30], [-22, 50], [22, 50]].map(([X, Z], i) => ({ X, Z, p: i * 1.4 }));
    const DUST = Array.from({ length: 50 }, (_, i) => ({ b: i % 3, s: hash(i, 7), k: 1 + (i % 3), p: hash(i, 8) * TAU }));
    const GOLDSPOTS = [];
    for (let i = 0; i < W * H; i++) if (BACKB[i] === GOLD[1] || BACKB[i] === GOLD[2]) GOLDSPOTS.push(i);
    const BEAMC = C('#ffe6a0'), DUSTC = C('#fff8d8');
    const vignette = K.vignette(C('#140a18'), 0.4, 0.42);

    function frame(t) {
      const u = t / LOOP;
      buf.set(BACKB);
      // Gold glints travelling along the trim.
      for (const i of GOLDSPOTS) { const x = i % W, y = (i / W) | 0; if (Math.sin(TAU * 12 * u - x * 0.15 - y * 0.08) > 0.97) buf[i] = GOLD[0]; }
      // Rose window shimmer.
      if (Math.sin(TAU * 8 * u) > 0) glow(buf, RX, RY, 18, C('#ffe0a0'), 0.15 + 0.1 * Math.sin(TAU * 8 * u));
      // Banners.
      for (const B of BANNERS) for (let j = 0; j < 26; j++) for (let i = 0; i < 9; i++) {
        const wv = Math.round(Math.sin(TAU * 15 * u - j * 0.3 + B.p) * (j / 26) * 1.5);
        if (j > 20 && Math.abs(i - 4) < j - 20) continue;
        const crown = j >= 6 && j <= 9 && i >= 2 && i <= 6 && (j === 9 || i % 2 === 0);
        put(buf, B.x + i + wv, B.y + j, crown ? GOLD[1] : i === 0 || i === 8 ? GOLD[2] : C(wv > 0 ? '#8a3a9a' : '#6a2a7a'));
      }
      // Sunbeams, breathing.
      BEAM_PIX.forEach((list, n) => {
        const b = BEAMS[n], a = 0.14 + 0.06 * Math.sin(TAU * b.k * u + b.p);
        for (const i of list) { const x = i % W, y = (i / W) | 0; if (a * 4 > bay(x, y) * 0.9) blend(buf, i, BEAMC, a); }
      });
      for (const d of DUST) {
        const q = BEAMS[d.b].quad, v = frac(d.s + d.k * u), w = 0.5 + 0.4 * Math.sin(TAU * 5 * u + d.p);
        const x = q[0][0] + (q[3][0] - q[0][0]) * v + (q[1][0] - q[0][0]) * w, y = q[0][1] + (q[3][1] - q[0][1]) * v + (q[1][1] - q[0][1]) * w;
        if (Math.sin(TAU * 17 * u + d.p) > 0.2) put(buf, x, y, DUSTC);
      }
      // Chandeliers: sway, flicker, and throw reflections on the marble.
      for (const ch of CHANDELIERS) {
        const sw = Math.sin(TAU * 10 * u + ch.p) * 1.5, ax = sx(ch.X, ch.Z), cx = ax + sw, cy = sy(CEIL - 24, ch.Z), r = 60 / ch.Z * 5;
        line(buf, ax, sy(CEIL, ch.Z), cx, cy, GOLD[3]);
        for (let i = -r; i <= r; i++) { put(buf, cx + i, cy + 2, GOLD[2]); put(buf, cx + i * 0.7, cy + 4, GOLD[3]); }
        for (let k = 0; k < 5; k++) {
          const x = cx - r + k * r / 2, fl = Math.sin(TAU * (41 + k * 7) * u + k + ch.p) > -0.6;
          put(buf, x, cy + 1, C('#fff6e0'));
          if (fl) put(buf, x, cy, C('#ffd060'));
          glow(buf, x, cy, 6, C('#ffc060'), 0.2);
          // Reflection on the floor below.
          const ry = floorY(ch.Z) + (floorY(ch.Z) - cy) * 0.15;
          if (Math.sin(TAU * 7 * u + k) > -0.3) blendAt(buf, x, ry, C('#ffd890'), 0.5);
        }
      }
      vignette(buf);
    }

    return (t, out) => { buf = out; frame(t); };
  },
});
