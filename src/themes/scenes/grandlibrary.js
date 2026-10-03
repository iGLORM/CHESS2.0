// The Grand Library at night: the World 8 live background.
//
// Endgamer's library: shelves of books rising out of sight on both sides, a gallery rail,
// a tall arched window at the far end letting in cold moonlight, a patterned rug. Warm
// candles on a reading desk and a candelabra against the blue moonbeam.
// Moves: candles flicker and light the shelves, the open book's pages turn, books float
// and flap in the air, dust drifts in the moonbeam, stars twinkle in the window, a
// hanging lamp sways, the quill writes.
LiveScenes.register({
  id: 'grandlibrary',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, noise2, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over, rect, line, disc, glow } = K;
    let buf = null;

    const VX = 160, VY = 100, F = 100, HALF = 58, TOP = 140;
    const floorY = Z => VY + 2600 / Z;
    const sx = (X, Z) => VX + X * F / Z;
    const sy = (h, Z) => floorY(Z) - h * F / Z;
    const BACK = new Uint32Array(W * H);

    const WOOD = ['#8a5a36', '#6a4028', '#4a2a1c', '#301a12', '#1c0e0a'].map(C);
    const SPINES = ['#8a2a2a', '#2a4a7a', '#2a6a4a', '#7a5a2a', '#5a2a6a', '#9a6a3a', '#3a3a5a', '#6a2a3a'].map(h => [C(h), C(mix(h, '#000000', 0.45)), C(mix(h, '#ffe0a0', 0.35))]);
    const GILT = C('#d8a850');
    // Candle positions (screen) used to light the shelves.
    const LIGHTS = [[262, 150, 1], [34, 118, 0.8], [160, 34, 0.4]];
    const warmAt = (x, y) => LIGHTS.reduce((a, [lx, ly, s]) => a + s * Math.exp(-sq((x - lx) / 70) - sq((y - ly) / 50)), 0);

    // A shelf pixel: wall height h (world), position along the wall p (world), light.
    function shelf(x, y, h, p, light) {
      const row = Math.floor(h / 13), inRow = h - row * 13;
      if (inRow < 1.3) return ramp(WOOD, 0.35 - light * 0.3, x, y);                  // plank
      const book = Math.floor(p * 1.1 + row * 13.7), bh = 7 + hash(book, row) * 4.5;
      if (inRow > bh + 1.3) return ramp(WOOD, 0.95, x, y);                            // gap above books
      const sp = SPINES[Math.floor(hash(book, row + 3) * SPINES.length)];
      const edge = frac(p * 1.1 + row * 13.7) < 0.14;
      if (edge) return WOOD[4];
      if (Math.abs(inRow - 1.3 - bh * 0.72) < 0.5) return GILT;                       // gilt band
      return light > 0.35 + bay(x, y) * 0.3 ? sp[2] : light > 0.05 + bay(x, y) * 0.15 ? sp[0] : sp[1];
    }

    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, bx0 = sx(-HALF, F), bx1 = sx(HALF, F);
      const Zw = HALF * F / Math.abs(x - VX + 0.001);
      const light = warmAt(x, y) - clamp((90 - y) / 90) * 0.35;              // the heights fade into gloom
      if (x >= bx0 && x < bx1 && y < floorY(F)) {
        // Back wall: shelves around the arched window.
        const h = (floorY(F) - y), p = (x - bx0) * 0.6;
        const wx = Math.abs(x - VX), top = sy(90, F), arch = sy(64, F);
        const inWin = wx < 24 && y > top + (y < arch ? 24 - Math.sqrt(Math.max(0, 576 - wx * wx)) : 0) && y < sy(14, F);
        if (inWin) { BACK[i] = 0; continue; }
        if (wx < 27 && y > top - 3 && y < sy(12, F)) { BACK[i] = ramp(WOOD, 0.2 + (wx > 25.5 ? 0.3 : 0), x, y); continue; }
        BACK[i] = shelf(x, y, h, p, light * 0.8);
        continue;
      }
      if (Zw < F && y < floorY(Zw)) {
        // Side walls of shelves; the gallery walkway at h = 62.
        const h = (floorY(Zw) - y) * Zw / F;
        if (Math.abs(h - 62) < 1.2 * Zw / 40 || Math.abs(h - 66) < 0.6 * Zw / 40) { BACK[i] = ramp(WOOD, 0.15, x, y); continue; }
        BACK[i] = shelf(x, y, h, Zw, light);
        continue;
      }
      if (y >= floorY(F) || (Zw >= F && y > VY)) {
        // Floor: parquet, with a rug in the middle.
        const Z = 2600 / Math.max(0.5, y - VY), X = (x - VX) * Z / F;
        const rug = Math.abs(X) < 30 && Z > 26 && Z < 80;
        if (rug) {
          const border = Math.abs(X) > 26 || Z < 30 || Z > 76, band = Math.abs(X) > 24 && Math.abs(X) < 25.5;
          const motif = (Math.floor(X / 6) + Math.floor(Z / 6)) % 2 === 0 && Math.abs(frac(X / 6) - 0.5) < 0.2;
          BACK[i] = C(border ? (band ? '#d8a850' : '#6a1e24') : motif ? '#8a3a2a' : '#4a1a26');
        } else {
          const plank = Math.floor(X / 5), seam = frac(X / 5) < 0.12 || frac((Z + plank * 7) / 18) < 0.05;
          BACK[i] = seam ? WOOD[4] : ramp(WOOD, 0.45 - light * 0.4 + (hash(plank, 3) - 0.5) * 0.15 + clamp((y - 175) / 25) * 0.4, x, y);
        }
        continue;
      }
      BACK[i] = ramp(WOOD, 0.9, x, y);                     // far ceiling gloom
    }
    // Window: night sky, moon, mullions (drawn behind BACK's hole).
    const SKYW = new Uint32Array(W * H);
    const WY0 = Math.floor(sy(90, F)), WY1 = Math.ceil(sy(14, F));
    for (let y = WY0 - 2; y < WY1 + 2; y++) for (let x = VX - 26; x < VX + 26; x++) {
      const i = y * W + x;
      SKYW[i] = ramp(['#0a1030', '#142050', '#1e3068', '#2a4480'].map(C), (y - WY0) / (WY1 - WY0), x, y);
      if (x === VX || y === Math.round((WY0 + WY1) / 2) + 6) SKYW[i] = WOOD[3];
    }
    disc(SKYW, VX + 10, WY0 + 18, 6, (dx, dy, d) => C(d > 0.85 ? '#b8c8f0' : '#f0f4ff'));
    // Rolling ladder on the left wall.
    for (let j = 0; j < 90; j++) { put(BACK, 54 + j * 0.12, 190 - j * 1.4, WOOD[0]); put(BACK, 66 + j * 0.12, 190 - j * 1.4, WOOD[0]); if (j % 8 === 0) line(BACK, 54 + j * 0.12, 190 - j * 1.4, 66 + j * 0.12, 190 - j * 1.4, WOOD[1]); }
    // Reading desk at the front right, with an open book, inkwell and candles.
    for (let y = 160; y < H; y++) for (let x = 214; x < W; x++) {
      const top = y < 166;
      BACK[y * W + x] = top ? ramp(WOOD, y === 160 ? 0 : 0.3, x, y) : ramp(WOOD, 0.75 + (x % 20 === 0 ? 0.2 : 0), x, y);
    }
    const BOOK = { x: 246, y: 158 };
    rect(BACK, BOOK.x - 1, BOOK.y - 1, 34, 6, WOOD[3]);
    disc(BACK, 294, 158, 3, C('#141420')); put(BACK, 293, 156, C('#4a4a6a'));
    // Candelabra on the left.
    for (let y = 124; y < 190; y++) put(BACK, 34, y, C('#b88a40')), put(BACK, 35, y, C('#6a4a20'));
    rect(BACK, 28, 188, 14, 3, C('#6a4a20'));
    for (const cx of [26, 34, 42]) { rect(BACK, cx - 1, 118, 3, 7, C('#f4ecd8')); if (cx !== 34) line(BACK, cx, 126, 34, 130, C('#b88a40')); }

    // ---------- animated ----------
    const CANDLES = [[26, 117], [34, 117], [42, 117], [230, 150], [238, 146], [304, 152]].map(([x, y], i) => ({ x, y, p: i * 1.3 }));
    for (const c of CANDLES.slice(3)) rect(BACK, c.x - 1, c.y + 1, 3, 160 - c.y - 1, C('#f4ecd8'));
    const FLOATERS = Array.from({ length: 5 }, (_, i) => ({ x: [86, 118, 206, 240, 140][i], y: [64, 40, 52, 86, 76][i], k: 2 + i % 3, p: i * 1.7, c: SPINES[i * 2 % SPINES.length] }));
    const DUST = Array.from({ length: 40 }, (_, i) => ({ s: hash(i, 1), w: hash(i, 2), k: 1, p: hash(i, 3) * TAU }));
    const STARS = Array.from({ length: 10 }, (_, i) => ({ x: VX - 22 + hash(i, 5) * 44, y: WY0 + 4 + hash(i, 6) * 40, k: 8 + i * 3, p: hash(i, 7) * TAU }));
    const BEAM = [[VX - 22, WY1 - 4], [VX + 22, WY1 - 4], [VX + 4, 196], [VX - 58, 196]];
    const BEAM_PIX = [];
    for (let y = WY1 - 4; y < H; y++) {
      const v = (y - (WY1 - 4)) / (196 - WY1 + 4), xl = VX - 22 + (-58 + 22) * v, xr = VX + 22 + (4 - 22) * v;
      for (let x = Math.ceil(xl); x < xr; x++) BEAM_PIX.push(y * W + x);
    }
    const vignette = K.vignette(C('#08050a'), 0.45, 0.35);
    const PAGE = C('#f4ead0'), PAGE2 = C('#d8c8a8'), INK = C('#3a2a2a');

    function frame(t) {
      const u = t / LOOP;
      buf.set(BACK);
      for (let i = 0; i < W * H; i++) if (!BACK[i]) buf[i] = SKYW[i];
      for (const s of STARS) if (Math.sin(TAU * s.k * u + s.p) > 0.4) put(buf, s.x, s.y, C('#e8eeff'));
      // The moonbeam and its dust.
      for (const i of BEAM_PIX) { const x = i % W, y = (i / W) | 0; if (bay(x, y) < 0.75) blend(buf, i, C('#9ac0f0'), 0.17 + 0.04 * Math.sin(TAU * 4 * u)); }
      for (const d of DUST) {
        const v = frac(d.s + d.k * u), y = WY1 + v * (196 - WY1), xl = VX - 22 - 36 * v, xr = VX + 22 - 18 * v;
        const x = xl + (xr - xl) * (0.5 + 0.45 * Math.sin(TAU * 3 * u + d.p + d.w * 6));
        if (Math.sin(TAU * 15 * u + d.p) > 0) put(buf, x, y, C('#dce8ff'));
      }
      // Hanging lamp over the rug.
      const sw = Math.sin(TAU * 8 * u) * 2, lx = VX + sw, ly = 34;
      line(buf, VX, 0, lx, ly - 4, C('#2a1a14'));
      glow(buf, lx, ly, 40, C('#ffc070'), 0.18);
      rect(buf, lx - 3, ly - 4, 7, 7, C('#6a4a20')); rect(buf, lx - 2, ly - 3, 5, 5, C(Math.sin(TAU * 53 * u) > -0.5 ? '#ffe0a0' : '#ffc060'));
      // Floating books, flapping.
      for (const b of FLOATERS) {
        const x = b.x + 6 * Math.sin(TAU * b.k * u + b.p), y = b.y + 4 * Math.sin(TAU * (b.k + 1) * u + b.p * 2);
        const open = Math.round(3 + 2 * Math.sin(TAU * 60 * u + b.p));
        rect(buf, x - 1, y, 3, 5, b.c[1]);
        for (let j = 0; j < 5; j++) { line(buf, x - 1, y + j, x - 1 - 5, y + j - open + 2, j === 0 ? b.c[0] : PAGE); line(buf, x + 1, y + j, x + 1 + 5, y + j - open + 2, j === 0 ? b.c[0] : PAGE2); }
        glow(buf, x, y + 2, 10, C('#ffe8b0'), 0.12);
      }
      // The open book: a page turns every 6 s.
      const pv = frac(20 * u);
      rect(buf, BOOK.x, BOOK.y - 2, 15, 5, PAGE2); rect(buf, BOOK.x + 17, BOOK.y - 2, 15, 5, PAGE);
      for (let l = 0; l < 3; l++) { line(buf, BOOK.x + 2, BOOK.y - 1 + l * 1.3, BOOK.x + 12, BOOK.y - 1 + l * 1.3, C('#a89880')); line(buf, BOOK.x + 19, BOOK.y - 1 + l * 1.3, BOOK.x + 29, BOOK.y - 1 + l * 1.3, C('#a89880')); }
      if (pv < 0.12) { const a = pv / 0.12, px = BOOK.x + 16 + Math.cos(Math.PI * a) * 14, py = BOOK.y - 3 - Math.sin(Math.PI * a) * 6; line(buf, BOOK.x + 16, BOOK.y - 2, px, py, PAGE); line(buf, BOOK.x + 16, BOOK.y, px, py + 3, PAGE); }
      // The quill, writing.
      const qx = 286 + Math.round(Math.sin(TAU * 90 * u) * 1.5), qy = 154;
      line(buf, qx, qy, qx + 6, qy - 12, C('#f0f0f0')); line(buf, qx + 1, qy - 3, qx + 5, qy - 11, C('#c8c8d8'));
      // Candles flicker and light the room around them.
      for (const c of CANDLES) {
        const f = 0.8 + 0.2 * Math.sin(TAU * (47 + Math.round(c.p * 7)) * u + c.p) * Math.sin(TAU * 13 * u + c.p);
        glow(buf, c.x, c.y - 2, 28, C('#ffb860'), 0.2 * f);
        put(buf, c.x, c.y - 1, C('#fff4c0')); put(buf, c.x, c.y - 2, C(f > 0.85 ? '#ffe080' : '#ffb040'));
        if (f > 0.9) put(buf, c.x, c.y - 3, C('#ff9030'));
      }
      vignette(buf);
    }

    return (t, out) => { buf = out; frame(t); };
  },
});
