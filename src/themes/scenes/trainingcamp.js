// The Training Camp at dusk: the World 2 live background.
//
// Inside a mountain dojo as evening falls. Warm paper lanterns and glowing shoji against
// the cool blue dusk outside and the cyan light of the holographic trainers. Open doors
// look out on misty peaks, a pagoda and a cherry tree; straw tatami, a wooden training
// dummy, and two hologram projectors raising a pawn and a knight.
// Moves: lanterns sway and flicker, holograms turn, scan and glitch, cherry petals drift
// in, mist rolls through the valley, stars and fireflies, dust in the lamplight.
LiveScenes.register({
  id: 'trainingcamp',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, noiseLoop, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over, rect, line, disc, glow } = K;
    let buf = null;

    const SKY = new Uint32Array(W * H), BACK = new Uint32Array(W * H);
    const OX0 = 62, OX1 = 258, OY0 = 30, OY1 = 118;        // the open doorway onto the valley
    const HORIZON = 100;                                    // vanishing point height

    // ---------- outside: dusk sky, moon, misty peaks, pagoda ----------
    const SKYC = ['#0e1230', '#18204a', '#262e62', '#3e3c78', '#645086', '#9a6690', '#d08a94', '#f2b49a'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - 190, (y - 112) * 1.6);
      SKY[y * W + x] = ramp(SKYC, (y - OY0) / 84 + 0.18 * Math.exp(-sq(d / 60)), x, y);
    }
    const MX = 104, MY = 48;
    for (let y = MY - 12; y <= MY + 12; y++) for (let x = MX - 12; x <= MX + 12; x++) {
      const d = Math.hypot(x - MX, y - MY);
      if (d < 6) put(SKY, x, y, C(d < 4.8 ? '#f4f0ff' : '#c8c4f0'));
      else if (d < 12 && (12 - d) / 12 * 0.55 > bay(x, y)) blend(SKY, y * W + x, C('#6a70b0'), 0.35);
    }
    const peaks = [
      { top: x => 74 + 22 * fbm1(x / 30, 3), cols: ['#5a5a92', '#6a6498', '#8a78a0'], rim: '#b0a0d0' },
      { top: x => 86 + 18 * fbm1(x / 22, 9) - 10 * Math.exp(-sq((x - 200) / 16)), cols: ['#3c4078', '#46487e', '#6a5e90'], rim: '#8a88c0' },
      { top: x => 102 + 8 * fbm1(x / 16, 17), cols: ['#262a58', '#2e3262', '#484878'], rim: '#6a6aa8' },
    ];
    for (const p of peaks) {
      const cols = p.cols.map(C), rim = C(p.rim);
      for (let x = 0; x < W; x++) {
        const ty = Math.round(p.top(x));
        for (let y = ty; y < H; y++) SKY[y * W + x] = y === ty ? rim : ramp(cols, (y - ty) / 22, x, y);
      }
    }
    // Pagoda on the middle peak: stacked roofs with upturned eaves and one lit window.
    (function pagoda() {
      const cx = 200, base = Math.round(peaks[1].top(200)) + 1, dark = C('#1e2044'), roof = C('#2a2850');
      for (let i = 0; i < 3; i++) {
        const y = base - 4 - i * 6, hw = 8 - i * 2;
        rect(SKY, cx - hw + 2, y, (hw - 2) * 2 + 1, 4, dark);
        for (let x = cx - hw - 1; x <= cx + hw + 1; x++) put(SKY, x, y - 1, roof);
        put(SKY, cx - hw - 2, y - 2, roof); put(SKY, cx + hw + 2, y - 2, roof);
        put(SKY, cx, y + 1, C(i === 0 ? '#ffc870' : '#e8a050'));
      }
      line(SKY, cx, base - 22, cx, base - 17, dark);
    })();
    // A cherry tree in bloom beside the veranda.
    (function cherry() {
      const bark = C('#2a1a24');
      const branches = [[92, 118, 88, 80], [88, 90, 70, 66], [88, 86, 108, 64], [90, 100, 120, 88], [72, 70, 62, 56]];
      for (const [x0, y0, x1, y1] of branches) { line(SKY, x0, y0, x1, y1, bark); line(SKY, x0 + 1, y0, x1 + 1, y1, bark); }
      const BL = ['#ffd8e4', '#f4a8c4', '#d0789c', '#8a4a74'].map(C);
      const clumps = [[70, 64, 10], [62, 54, 7], [108, 62, 10], [120, 84, 8], [88, 74, 9], [98, 56, 7]];
      for (const [cx, cy, r] of clumps) disc(SKY, cx, cy, r, (dx, dy, d) => d > 0.9 && hash(cx + dx, cy + dy) < 0.5 ? 0
        : ramp(BL, 0.2 + d * 0.3 + (dx + dy > 0 ? 0.35 : 0) + (hash(cx + dx >> 1, cy + dy >> 1) - 0.5) * 0.3, cx + dx, cy + dy));
    })();
    // Veranda boards under the doorway.
    for (let y = 112; y < OY1; y++) for (let x = OX0; x < OX1; x++) SKY[y * W + x] = ramp(['#6a4a3a', '#4a3028', '#2e1c1c'].map(C), (y - 112) / 6, x, y);

    // ---------- the room: ceiling, beams, posts, shoji ----------
    const WOOD = ['#8a5a34', '#5e3a24', '#3e2418', '#24140e'].map(C);
    for (let y = 0; y < OY0; y++) for (let x = 0; x < W; x++) {
      let t = 0.75 + (y < 16 ? 0.15 : 0);
      if (y === 15 || y === 29) t = 0.2;
      if ((x % 40) < 3 && y < 15) t = 0.45;                        // rafters
      BACK[y * W + x] = ramp(WOOD, t + (hash(x >> 2, y) - 0.5) * 0.1, x, y);
    }
    // Shoji panels either side of the opening, lit warm from inside.
    const PAPER = ['#fff0c8', '#f4d8a4', '#d8b088', '#a8806a'].map(C);
    function shoji(x0, x1, y0, y1) {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const lx = x - x0, ly = y - y0;
        const frame = lx % 11 === 0 || ly % 12 === 0 || x === x1 - 1 || y === y1 - 1;
        const light = 0.75 - (y - y0) / (y1 - y0) * 0.5;
        BACK[y * W + x] = frame ? ramp(WOOD, 0.55, x, y) : PAPER[light > 0.6 ? 0 : light > 0.4 ? 1 : 2];
      }
    }
    shoji(8, 58, OY0, 124); shoji(262, 312, OY0, 124);
    // Posts, and the lintel over the doorway.
    for (const px of [0, 58, 258, 312]) for (let y = 0; y < 128; y++) for (let x = px; x < px + (px === 0 || px === 312 ? 8 : 4); x++) {
      const rel = (x - px);
      BACK[y * W + x] = ramp(WOOD, rel === 0 ? 0.25 : rel === 1 ? 0.5 : 0.85, x, y);
    }
    for (let y = OY0 - 4; y < OY0; y++) for (let x = 58; x < 262; x++) BACK[y * W + x] = ramp(WOOD, y === OY0 - 4 ? 0.2 : 0.7, x, y);
    // Hanging scroll on the left post: an ink knight.
    rect(BACK, 18, 38, 30, 52, C('#2e1c14'));
    for (let y = 40; y < 88; y++) for (let x = 20; x < 46; x++) BACK[y * W + x] = ramp(['#f6ecd0', '#e4d4b0'].map(C), (y - 40) / 60, x, y);
    const INK = C('#2a2430');
    const knightInk = ['..xxx..', '.xxxxx.', 'xx.xxxx', 'xxxxxxx', '...xxxx', '..xxxx.', '..xxxx.', '.xxxxxx', 'xxxxxxx'];
    knightInk.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'x') { put(BACK, 26 + i * 2, 50 + j * 3, INK); put(BACK, 27 + i * 2, 50 + j * 3, INK); put(BACK, 26 + i * 2, 51 + j * 3, INK); put(BACK, 27 + i * 2, 51 + j * 3, INK); put(BACK, 26 + i * 2, 52 + j * 3, INK); put(BACK, 27 + i * 2, 52 + j * 3, INK); } }));
    put(BACK, 40, 80, C('#c83a2a')); put(BACK, 41, 80, C('#c83a2a')); put(BACK, 40, 81, C('#c83a2a')); put(BACK, 41, 81, C('#c83a2a'));
    for (let x = 16; x < 50; x++) { put(BACK, x, 37, C('#5e3a24')); put(BACK, x, 90, C('#5e3a24')); }

    // ---------- the floor: tatami in perspective, lit by lantern pools ----------
    const FLOOR0 = 124;
    const MAT = ['#1c1e26', '#2e2e30', '#4a4634', '#6e6842', '#968c52', '#c2b46a'].map(C);
    const EDGE = C('#20222e'), EDGE_L = C('#3a3c52');
    const POOLS = [[40, 150], [120, 138], [200, 138], [280, 150]];
    for (let y = FLOOR0; y < H; y++) for (let x = 0; x < W; x++) {
      const Z = 1100 / (y - HORIZON), X = (x - 160) * Z / 55;
      const row = Math.floor(Z / 7), off = row % 2 ? 6 : 0;
      const seamZ = frac(Z / 7) < 0.06 * (40 / Z), seamX = frac((X + off) / 12) < 0.05 * (40 / Z);
      let light = 0.1 + 0.25 * (1 - (y - FLOOR0) / 76);
      for (const [px, py] of POOLS) light += 0.55 * Math.exp(-sq((x - px) / 34) - sq((y - py) / 16));
      light -= 0.25 * clamp((y - 175) / 25);                        // the front is in shade
      const i = y * W + x;
      if (seamZ || seamX) BACK[i] = light > 0.5 ? EDGE_L : EDGE;
      else BACK[i] = ramp(MAT, light + ((y + row) % 2 ? -0.05 : 0), x, y);
    }
    // Wooden threshold where wall meets floor.
    for (let x = 0; x < W; x++) for (let y = FLOOR0 - 4; y < FLOOR0; y++) if (x < OX0 || x >= OX1 || y >= OY1) BACK[y * W + x] = ramp(WOOD, y === FLOOR0 - 4 ? 0.1 : 0.6, x, y);

    // Training dummy (makiwara) on the left.
    (function dummy() {
      const cx = 38, base = 172;
      for (let y = base - 46; y <= base; y++) for (let x = cx - 3; x <= cx + 3; x++) put(BACK, x, y, ramp(WOOD, x < cx - 1 ? 0.05 : x > cx + 1 ? 0.8 : 0.4, x, y));
      for (const [ay, dir] of [[base - 38, -1], [base - 30, 1], [base - 22, -1]])
        for (let i = 0; i < 9; i++) { put(BACK, cx + dir * (3 + i), ay - (i >> 2), WOOD[1]); put(BACK, cx + dir * (3 + i), ay + 1 - (i >> 2), WOOD[2]); }
      for (let y = base - 46; y <= base - 38; y++) for (let x = cx - 4; x <= cx + 4; x++) put(BACK, x, y, ramp(['#e8d090', '#c0a060', '#8a6a3a'].map(C), (x - cx + 4) / 9, x, y));
      for (let x = cx - 8; x <= cx + 8; x++) { put(BACK, x, base + 1, C('#140e10')); put(BACK, x, base, WOOD[2]); }
    })();

    // ---------- lanterns, holograms, particles ----------
    const LANTERNS = [[40, 26], [120, 22], [200, 22], [280, 26]].map(([x, y], i) => ({ x, y, p: i * 1.3 }));
    const LRED = ['#ffd08a', '#ff9a50', '#e0603a', '#9a3028'].map(C), LWARM = C('#ffb050');
    const HOLO = C('#6fe3ff'), HOLO2 = C('#2aa8e0'), HOLO3 = C('#c8f8ff');
    const PAWN = ['...xxxx...', '..xxxxxx..', '..xxxxxx..', '...xxxx...', '..xxxxxx..', '...xxxx...', '...xxxx...', '..xxxxxx..', '.xxxxxxxx.', 'xxxxxxxxxx', 'xxxxxxxxxx'];
    const KNIGHT = ['....xxx...', '..xxxxxx..', '.xxx.xxxx.', 'xxxxxxxxx.', 'xxxxxxxxxx', '.x..xxxxxx', '...xxxxxx.', '..xxxxxxx.', '..xxxxxx..', '.xxxxxxxx.', 'xxxxxxxxxx', 'xxxxxxxxxx'];
    const PROJ = [{ x: 282, y: 164, grid: KNIGHT, k: 3 }, { x: 96, y: 140, grid: PAWN, k: 2 }];
    const PETALS = Array.from({ length: 34 }, (_, i) => ({ x0: hash(i, 71), y0: 20 + hash(i, 72) * 110, k: 1 + (i % 2), ky: 6 + (i % 7), fall: 30 + hash(i, 73) * 50, p: hash(i, 74) * TAU }));
    const FLIES = Array.from({ length: 8 }, (_, i) => ({ x: OX0 + 10 + hash(i, 81) * 176, y: 96 + hash(i, 82) * 16, k: 2 + (i % 4), kb: 16 + i * 3, p: hash(i, 83) * TAU }));
    const MOTES = Array.from({ length: 30 }, (_, i) => ({ l: i % 4, a: hash(i, 91) * TAU, r: 6 + hash(i, 92) * 24, k: 1 + (i % 3), p: hash(i, 93) * TAU }));
    const STARS = Array.from({ length: 24 }, (_, i) => ({ x: OX0 + hash(i, 61) * (OX1 - OX0), y: OY0 + hash(i, 62) * 30, k: 10 + (i % 17), p: hash(i, 63) * TAU }));
    const vignette = K.vignette(C('#0a0814'), 0.35, 0.5);

    function hologram(pr, u) {
      const s = 2, gw = pr.grid[0].length, gh = pr.grid.length;
      const turn = Math.cos(TAU * pr.k * u);                     // fake rotation: squash width
      const wv = Math.max(0.25, Math.abs(turn));
      const flick = Math.sin(TAU * 97 * u + pr.x) > 0.93 ? 0.35 : 1;
      const glitch = Math.sin(TAU * 13 * u + pr.x) > 0.97 ? 2 : 0;
      // Light cone up from the projector.
      for (let j = 0; j < gh * s + 8; j++) {
        const hw = 3 + j * 0.35;
        for (let i = -hw; i <= hw; i++) if ((i + j) % 2 === 0) blendAt(buf, pr.x + i, pr.y - 2 - j, HOLO2, 0.12 * flick);
      }
      const top = pr.y - 6 - gh * s, scan = Math.floor(frac(4 * pr.k * u) * gh * s);
      for (let j = 0; j < gh * s; j++) {
        const row = pr.grid[Math.floor(j / s)];
        for (let i = 0; i < gw * s; i++) {
          if (row[Math.floor(i / s)] !== 'x') continue;
          const xs = pr.x + ((i - gw * s / 2) * wv) + (j === scan ? glitch : 0);
          const edge = row[Math.floor(i / s) - 1] !== 'x' || row[Math.floor(i / s) + 1] !== 'x';
          const c = j === scan ? HOLO3 : edge ? HOLO : HOLO2;
          blendAt(buf, xs, top + j, c, (j % 2 ? 0.55 : 0.85) * flick);
        }
      }
      // Projector disc.
      for (let i = -6; i <= 6; i++) { put(buf, pr.x + i, pr.y, C('#3a4050')); put(buf, pr.x + i, pr.y + 1, C('#1e222e')); }
      for (let i = -4; i <= 4; i++) put(buf, pr.x + i, pr.y - 1, HOLO);
    }

    function frame(t) {
      const u = t / LOOP;
      buf.set(SKY);
      for (const s of STARS) if (Math.sin(TAU * s.k * u + s.p) > 0.3) put(buf, s.x, s.y, C('#e8e4ff'));
      // Mist rolling through the valley, between the peaks.
      for (let y = 84; y < 116; y++) for (let x = OX0; x < OX1; x++) {
        const n = noiseLoop(x / 26 + 20 * u, y >> 2, 20) * 0.6 + noiseLoop(x / 13 - 40 * u, (y >> 1) + 40, 40) * 0.4;
        const a = n * Math.exp(-sq((y - 100) / 9)) - 0.3;
        if (a > bay(x, y) * 0.5) blend(buf, y * W + x, C('#9a94c8'), 0.35);
      }
      for (const f of FLIES) {
        if (Math.sin(TAU * f.kb * u + f.p) < 0.3) continue;
        put(buf, f.x + 5 * Math.sin(TAU * f.k * u + f.p), f.y + 2 * Math.sin(TAU * (f.k + 1) * u), C('#e8ff90'));
      }
      over(buf, BACK);

      // Shoji glow breathing with the lanterns.
      const breathe = 0.5 + 0.5 * Math.sin(TAU * 6 * u);
      for (const x0 of [8, 262]) glow(buf, x0 + 25, 70, 40, C('#ffe0a0'), 0.12 + 0.06 * breathe);

      for (const pr of PROJ) hologram(pr, u);

      // Lanterns: sway from their cords, flame flicker lights a pool around them.
      for (const L of LANTERNS) {
        const sw = Math.round(Math.sin(TAU * 20 * u + L.p) * 1.2);
        const fl = 0.8 + 0.2 * Math.sin(TAU * 83 * u + L.p * 3) * Math.sin(TAU * 29 * u + L.p);
        line(buf, L.x, 0, L.x + sw, L.y - 9, C('#1a1010'));
        glow(buf, L.x + sw, L.y, 36, LWARM, 0.3 * fl);
        const cx = L.x + sw, cy = L.y;
        disc(buf, cx, cy, 7, (dx, dy, d) => d > 0.85 ? LRED[3] : dy % 3 === 0 && d > 0.2 ? LRED[2] : ramp(LRED, d * 0.9 + 0.1 * (1 - fl) + (dx > 0 ? 0.2 : 0), cx + dx, cy + dy));
        rect(buf, cx - 3, cy - 9, 7, 2, C('#2a1a14')); rect(buf, cx - 3, cy + 7, 7, 2, C('#2a1a14')); put(buf, cx, cy + 9, C('#c83a2a')); put(buf, cx, cy + 10, C('#c83a2a'));
      }
      // Dust in the lamplight.
      for (const m of MOTES) {
        const L = LANTERNS[m.l], a = m.a + TAU * m.k * u;
        const x = L.x + Math.cos(a) * m.r, y = L.y + 14 + Math.sin(a) * m.r * 0.5 + 8 * Math.sin(TAU * 3 * u + m.p);
        if (Math.sin(TAU * 20 * u + m.p) > 0) blendAt(buf, x, y, C('#fff0c0'), 0.7);
      }
      // Cherry petals drifting in through the doorway.
      for (const p of PETALS) {
        const v = frac(p.x0 + p.k * u);
        const x = W + 10 - v * (W + 40), y = p.y0 + v * p.fall + 4 * Math.sin(TAU * p.ky * u + p.p);
        const flip = Math.sin(TAU * p.ky * 3 * u + p.p) > 0;
        put(buf, x, y, C(flip ? '#ffc8d8' : '#e890b0'));
        if (flip) put(buf, x + 1, y, C('#f0a8c0'));
      }
      vignette(buf);
    }

    return (t, out) => { buf = out; frame(t); };
  },
});
