// Sensei Tactic, the Final Exam: a live character portrait.
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the game HUD and dialogue bubbles. An old, wise king hologram in gold,
// standing on a projector pad in the Training Camp at dusk under the cherry blossom:
// a small domed crown with a ball on top, bushy brows, a drooping moustache and a long
// beard, a tall staff in one hand. Moods: serene (default, eyes closed), watchful,
// approving, intrigued. Breathes, strokes his beard, and now and then peeks with one
// eye; as a hologram he has drifting scanlines, a scan sweep, a light cone and the odd
// 1-row glitch.
LiveScenes.register({
  id: 'char_senseitactic',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['serene', 'watchful', 'approving', 'intrigued'],
  frames: { face: [11, 3, 40, 40] },
  moodFor(category) {
    return {
      gameStart: 'serene', milestone: 'serene', playerLowHealth: 'serene',
      bossCheck: 'watchful', bossCapture: 'watchful', bossCaptureBig: 'watchful', bossTaunt: 'watchful',
      playerCheck: 'approving', playerCapture: 'approving',
      playerCaptureBig: 'intrigued', lowHealth: 'intrigued', eyes: 'intrigued', mysteryHint: 'watchful',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, clamp, sq, frac, bay, ramp, hash, noiseLoop, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over, glow } = K;
    let buf = null;

    // ---------- backdrop: a tiny Training Camp, the cherry tree in the doorway ----------
    const SKYL = new Uint32Array(W * H), WALL = new Uint32Array(W * H);
    const SKYC = ['#0e1230', '#18204a', '#262e62', '#3e3c78', '#645086', '#9a6690', '#d08a94', '#f2b49a'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - CX, (y - 24) * 1.1);
      SKYL[y * W + x] = ramp(SKYC, (y - 4) / 58 + 0.2 * Math.exp(-sq(d / 17)) + 0.08 * Math.exp(-sq(d / 7)), x, y);
    }
    const peaks = [
      { top: x => 41 + 6 * fbm1(x / 9, 5), cols: ['#5a5a92', '#6a6498', '#8a78a0'], rim: '#b0a0d0' },
      { top: x => 47 + 4 * fbm1(x / 7, 11) - 4 * Math.exp(-sq((x - 47) / 4)), cols: ['#3c4078', '#46487e', '#6a5e90'], rim: '#8a88c0' },
      { top: x => 53 + 2 * fbm1(x / 5, 19), cols: ['#262a58', '#2e3262', '#484878'], rim: '#6a6aa8' },
    ];
    for (const p of peaks) {
      const cols = p.cols.map(C), rim = C(p.rim);
      for (let x = 0; x < W; x++) {
        const ty = Math.round(p.top(x));
        for (let y = ty; y < H; y++) SKYL[y * W + x] = y === ty ? rim : ramp(cols, (y - ty) / 9, x, y);
      }
    }
    (function pagoda() {
      const px = 47, base = Math.round(peaks[1].top(px)) + 1, dark = C('#1e2044'), roof = C('#2a2850');
      for (let i = 0; i < 2; i++) {
        const y = base - 3 - i * 4, hw = 2 - i;
        for (let yy = y; yy < y + 3; yy++) for (let x = px - hw; x <= px + hw; x++) put(SKYL, x, yy, dark);
        for (let x = px - hw - 2; x <= px + hw + 2; x++) put(SKYL, x, y - 1, roof);
        put(SKYL, px, y + 1, C(i === 0 ? '#ffc870' : '#e8a050'));
      }
      put(SKYL, px, base - 10, dark); put(SKYL, px, base - 11, dark);
    })();
    // Cherry blossom reaching in from the top left of the doorway.
    const BARK = C('#2a1a24'), BL = ['#ffd8e4', '#f4a8c4', '#d0789c', '#8a4a74'].map(C);
    for (const [x0, y0, x1, y1] of [[10, 18, 18, 12], [18, 12, 24, 10], [16, 13, 17, 7]])
      for (let i = 0; i <= 16; i++) put(SKYL, x0 + (x1 - x0) * i / 16, y0 + (y1 - y0) * i / 16, BARK);
    const CLUMPS = [[13, 13, 3.5], [18, 8, 3], [23, 10, 3], [12, 19, 2.5]];
    for (const [cx, cy, r] of CLUMPS) for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) / r;
      if (d > 1 || (d > 0.8 && hash(x, y) < 0.5)) continue;
      put(SKYL, x, y, ramp(BL, 0.15 + d * 0.3 + (dx + dy > 0 ? 0.35 : 0), x, y));
    }
    for (let y = 57; y < 60; y++) for (let x = 0; x < W; x++) SKYL[y * W + x] = ramp(['#6a4a3a', '#4a3028', '#2e1c1c'].map(C), (y - 57) / 3, x, y);

    const WOOD = ['#8a5a34', '#5e3a24', '#3e2418', '#24140e'].map(C);
    const PAPER = ['#fff0c8', '#f4d8a4', '#d8b088', '#a8806a'].map(C);
    for (let y = 0; y < 6; y++) for (let x = 0; x < W; x++)
      WALL[y * W + x] = ramp(WOOD, y === 5 ? 0.15 : y === 4 ? 0.5 : 0.85 + (hash(x >> 2, y) - 0.5) * 0.1, x, y);
    for (const [x0, x1] of [[0, 8], [54, 62]]) for (let y = 6; y < 60; y++) for (let x = x0; x < x1; x++) {
      const frame = (x - x0) % 4 === 0 || (y - 6) % 7 === 0;
      const light = 0.85 - (y - 6) / 54 * 0.6;
      WALL[y * W + x] = frame ? ramp(WOOD, 0.55, x, y) : PAPER[light > 0.65 ? 1 : light > 0.45 ? 2 : 3];
    }
    for (const [px, tones] of [[8, [0.6, 0.3, 0.85]], [51, [0.85, 0.3, 0.6]]])
      for (let y = 6; y < 62; y++) for (let k = 0; k < 3; k++) WALL[y * W + px + k] = ramp(WOOD, tones[k], px + k, y);
    for (let x = 0; x < W; x++) { WALL[60 * W + x] = ramp(WOOD, 0.1, x, 60); WALL[61 * W + x] = ramp(WOOD, 0.6, x, 61); }
    const MAT = ['#1c1e26', '#2e2e30', '#4a4634', '#6e6842', '#968c52', '#c2b46a'].map(C);
    const EDGE = C('#20222e'), EDGE_L = C('#3a3c52');
    for (let y = 62; y < H; y++) for (let x = 0; x < W; x++) {
      const Z = 260 / (y - 44), X = (x - CX) * Z / 26;
      const row = Math.floor(Z / 3), off = row % 2 ? 3 : 0;
      const seam = frac(Z / 3) < 0.1 || frac((X + off) / 6) < 0.05 * (12 / Z);
      const light = 0.18 + 0.5 * Math.exp(-sq((x - CX) / 20) - sq((y - 72) / 9)) - 0.25 * clamp(Math.abs(x - CX) / 31);
      WALL[y * W + x] = seam ? (light > 0.45 ? EDGE_L : EDGE) : ramp(MAT, light, x, y);
    }

    // ---------- the hologram ----------
    const ROBE = ['#ffe6a0', '#ffd166', '#e4a844', '#b4782e', '#74482e'].map(C);
    const TRIM = ['#e0a040', '#bc8030', '#946024', '#6a4220', '#4a2c1c'].map(C);
    const FACE = ['#fcd894', '#f2be70', '#dc9c52', '#ae763e', '#704830'].map(C);
    const BEARD = ['#ffffff', '#fff4dc', '#f0dcae', '#c8a878', '#8a6a50'].map(C);
    const MATS = [ROBE, TRIM, FACE, BEARD];
    const RIM = C('#c8f4ff'), LINE = C('#2a1a1c'), SEAM = C('#c08a3a'), HANDLINE = C('#8a5a34');
    const HOLO = C('#ffd166'), HOLOD = C('#a8801f'), HOT = C('#ffffff'), SCAN = C('#5a3620');
    const LN = Math.hypot(0.55, 0.65, 0.53), LX = -0.55 / LN, LY = -0.65 / LN, LZ = 0.53 / LN;
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H);

    // Warm key light from the upper left (the lanterns), a cool cyan rim on the right.
    function shade(x, y, nx, ny, part, mat) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * LX + ny * LY + nz * LZ, T = MATS[mat || 0];
      const i = y * W + x;
      SPR[i] = nx > 0.78 && l < 0.25 ? RIM : T[Math.round(clamp(1 - (l * 0.7 + 0.3)) * (T.length - 1))];
      PART[i] = part;
    }
    function disc(cx, cy, rx, ry, part, mat) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.95, ny * 0.95, part, mat);
      }
    }
    const setP = (x, y, c, part) => { if (x >= 0 && y >= 0 && x < W && y < H) { SPR[y * W + x] = c; PART[y * W + x] = part; } };
    const beardHW = y => y < 41 ? 5 + (y - 35) * 0.45 : 7.7 * Math.pow(Math.max(0, 1 - (y - 41) / 15), 0.85);

    // lift moves the whole hologram, b (breath) the upper body; strokeY is the beard hand.
    function body(lift, b, nod, strokeY, stache) {
      SPR.fill(0); PART.fill(0);
      const oy = lift, uy = lift + b, hy = uy + nod;
      for (let y = 66; y <= 73; y++) {                                        // base
        const top = y - 66, hw = 15 - (top < 2 ? 2 - top : 0) - (y === 73 ? 1 : 0);
        for (let x = CX - hw; x <= CX + hw; x++) shade(x, y + oy, (x - CX) / 16, y < 68 ? -0.6 : 0.1, 1, y === 68 || y === 69 ? 1 : 0);
      }
      for (let y = 44; y <= 66; y++) {                                        // robe, with a sash
        const hw = 10 + Math.pow((y - 44) / 22, 1.5) * 5.5;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++)
          shade(x, y + oy, (x - CX) / (hw + 0.5), 0.12, 2, y === 57 || y === 58 || y === 63 || y === 64 ? 1 : 0);
      }
      disc(CX, 45 + uy, 13, 5.5, 3, 0);                                       // shoulders
      disc(17, 49 + uy, 4.2, 5, 3, 0);                                        // sleeves
      disc(42, 50 + uy, 4, 5, 3, 0);
      disc(CX, 27 + hy, 10.5, 10.5, 4, 2);                                    // head
      // No cross on kings or bishops (AGENTS.md, Art Rules): a gold ball tops the crown.
      disc(CX, 7 + hy, 2.3, 2.3, 6, 0);                                       // the ball
      for (let x = CX - 1; x <= CX + 1; x++) shade(x, 10 + hy, (x - CX) / 2, 0, 7, 1);   // on a trim collar
      [2, 4, 5, 6, 7].forEach((hw, j) => {                                    // the crown: a dome on a band
        for (let x = CX - hw; x <= CX + hw; x++) shade(x, 11 + j + hy, (x - CX) / (hw + 1), -0.6 + j * 0.1, 7, 0);
      });
      for (const s of [-1, 1]) disc(CX + s * 8, 15 + hy, 1.4, 1.6, 7, 0);
      for (let y = 16; y <= 18; y++) for (let x = CX - 9; x <= CX + 9; x++) shade(x, y + hy, (x - CX) / 10, -0.3 + (y - 16) * 0.2, 7, 1);
      for (let y = 35; y <= 56; y++) {                                        // the long beard
        const hw = beardHW(y);
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) {
          const strand = ((x - CX + 20) % 3 === 0 && y > 38) ? 0.25 : 0;
          shade(x, y + hy, (x - CX) / (hw + 0.6) + strand, 0.1 + (y - 44) / 30, 8, 3);
        }
      }
      // Moustache: two drooping tails from under the nose.
      for (const s of [-1, 1]) for (let k = 0; k <= 8; k++) {
        const x = CX + s * k, y = 32 + (k < 3 ? 0 : k - 2) - (stache && k > 3 ? 2 : 0);
        shade(x, y + hy, s * 0.4, -0.4, 9, 3);
        if (k < 7) shade(x, y + 1 + hy, s * 0.4, 0.3, 9, 3);
      }
      // Staff, held in the left hand, standing on the pad.
      for (let y = 10; y <= 73; y++) for (let x = 11; x <= 12; x++) shade(x, y + (y < 70 ? uy : oy), x === 11 ? -0.5 : 0.5, 0, 10, 1);
      disc(11.5, 9 + uy, 2.3, 2.3, 10, 1);
      disc(12, 48 + uy, 3, 3, 11, 2);                                          // hand on the staff
      disc(37, strokeY + hy, 3, 2.8, 12, 2);                                  // hand stroking the beard
      setP(CX, 17 + hy, HOT, 7);                                              // the crown jewel
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        const n0 = PART[i - 1], n1 = PART[i + 1], n2 = PART[i - W], n3 = PART[i + W];
        if (!p) { if (n0 || n1 || n2 || n3) SPR[i] = LINE; }
        else if ((n0 && n0 < p) || (n1 && n1 < p) || (n2 && n2 < p) || (n3 && n3 < p)) SPR[i] = p >= 7 ? HANDLINE : SEAM;
      }
    }

    // ---------- face ----------
    const EYE = C('#1e1420'), SHINE = C('#ffffff'), BROW = BEARD[1], BROWD = BEARD[3], MOUTH = C('#3a1e1a');
    const BLUSH = C('#ffa080'), SPARK = C('#fff4c0');
    const f = (x, y, c) => put(SPR, x, y, c);
    function eye(ex, hy, kind, s) {
      if (kind === 'closed') { f(ex - 1, hy + 1, EYE); f(ex, hy + 2, EYE); f(ex + 1, hy + 2, EYE); f(ex + 2, hy + 1, EYE); return; }
      if (kind === 'smile') { f(ex - 1, hy + 2, EYE); f(ex, hy + 1, EYE); f(ex + 1, hy + 1, EYE); f(ex + 2, hy + 2, EYE); return; }
      if (kind === 'blink') { f(ex, hy + 2, EYE); f(ex + 1, hy + 2, EYE); return; }
      if (kind === 'round') { const x0 = s > 0 ? ex : ex - 1; for (let y = hy; y < hy + 3; y++) for (let x = x0; x < x0 + 3; x++) f(x, y, EYE); f(x0, hy, SHINE); return; }
      for (let y = hy; y <= hy + 2; y++) { f(ex, y, EYE); f(ex + 1, y, EYE); }
      f(ex, hy, SHINE);
    }
    // Bushy white brows: kind 'soft' (drooping at the ends), 'stern' (inner ends down), 'high', 'up' (one raised).
    function brows(hx, hy, kind) {
      for (const s of [-1, 1]) {
        const ex = s < 0 ? hx - 5 : hx + 4, inner = s < 0 ? ex + 2 : ex - 1, outer = s < 0 ? ex - 2 : ex + 3;
        let yIn = hy - 2, yOut = hy - 1;
        if (kind === 'stern') { yIn = hy - 1; yOut = hy - 3; }
        if (kind === 'high' || (kind === 'up' && s > 0)) { yIn = hy - 4; yOut = hy - 4; }
        const n = Math.abs(outer - inner);
        for (let k = 0; k <= n; k++) {
          const x = inner + (outer - inner) * k / n, y = Math.round(yIn + (yOut - yIn) * k / n);
          f(x, y, BROW); f(x, y - 1, BROW); f(x, y + 1, BROWD);
        }
        if (kind === 'soft') { f(outer, yOut + 1, BROW); f(outer, yOut + 2, BROWD); }
      }
    }

    // ---------- lanterns, petals ----------
    const STARS = [[30, 7], [40, 8], [46, 13], [34, 12], [48, 22], [27, 16]].map(([x, y], i) => ({ x, y, k: 9 + i * 4, p: hash(i, 3) * TAU }));
    const PETALS = Array.from({ length: 9 }, (_, i) => ({ x0: hash(i, 71), y0: 8 + hash(i, 72) * 30, k: 1 + (i % 2), ky: 5 + i, fall: 16 + hash(i, 73) * 30, p: hash(i, 74) * TAU }));
    const LANTS = [{ x: 4, y: 16, p: 0 }, { x: 57, y: 18, p: 1.7 }];
    const LRED = ['#ffd08a', '#ff9a50', '#e0603a', '#9a3028'].map(C), LWARM = C('#ffb050');
    const vignette = K.vignette(C('#0a0814'), 0.4, 0.55);

    function frame(t, mood, since) {
      const u = t / LOOP, age = ((t - since) % LOOP + LOOP) % LOOP;
      buf.set(SKYL);
      for (const s of STARS) if (Math.sin(TAU * s.k * u + s.p) > 0.2) put(buf, s.x, s.y, C('#e8e4ff'));
      for (let y = 44; y < 58; y++) for (let x = 10; x < 52; x++) {
        const n = noiseLoop(x / 8 + 8 * u, y >> 1, 8) * 0.6 + noiseLoop(x / 5 - 10 * u, (y >> 1) + 40, 10) * 0.4;
        const a = n * Math.exp(-sq((y - 51) / 4)) - 0.3;
        if (a > bay(x, y) * 0.5) blend(buf, y * W + x, C('#9a94c8'), 0.3);
      }
      // Blossoms stir in the breeze.
      for (const [cx, cy] of CLUMPS) if (Math.sin(TAU * 12 * u + cx) > 0.6) put(buf, cx + 1, cy - 1, BL[0]);
      over(buf, WALL);
      for (const L of LANTS) {
        const sw = Math.round(Math.sin(TAU * 15 * u + L.p) * 0.8);
        const fl = 0.8 + 0.2 * Math.sin(TAU * 83 * u + L.p * 3) * Math.sin(TAU * 29 * u + L.p);
        for (let y = 6; y < L.y - 4; y++) put(buf, L.x, y, C('#1a1010'));
        const cx = L.x + sw, cy = L.y;
        glow(buf, cx, cy, 10, LWARM, 0.3 * fl);
        for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
          const d = Math.hypot(x / 3.2, y / 3.4);
          if (d > 1) continue;
          put(buf, cx + x, cy + y, d > 0.8 ? LRED[3] : y === 0 && d > 0.3 ? LRED[2] : LRED[Math.min(3, Math.round(d * 1.6 + (x > 0 ? 1 : 0) + (1 - fl)))]);
        }
        for (let x = -1; x <= 1; x++) { put(buf, cx + x, cy - 4, C('#2a1a14')); put(buf, cx + x, cy + 4, C('#2a1a14')); }
        put(buf, cx, cy + 5, C('#c83a2a'));
      }
      for (const p of PETALS) {
        const v = frac(p.x0 + p.k * u);
        const x = 4 + v * (W + 8) - 8, y = p.y0 + v * p.fall + 2 * Math.sin(TAU * p.ky * u + p.p);
        put(buf, x, y, C(Math.sin(TAU * p.ky * 3 * u + p.p) > 0 ? '#ffc8d8' : '#e890b0'));
      }
      vignette(buf);

      // The projector pad and its light cone.
      const pulse = 0.5 + 0.5 * Math.sin(TAU * 30 * u);
      glow(buf, CX, 26, 22, HOLOD, 0.22);
      for (let y = 4; y <= 73; y++) {
        const hw = 13 + (73 - y) * 0.12, a0 = 0.02 + 0.12 * (y - 4) / 69;
        for (let x = Math.ceil(CX - hw); x <= Math.floor(CX + hw); x++) {
          const edge = x - (CX - hw) < 1 || (CX + hw) - x < 1;
          const streak = Math.sin(TAU * (3 + (x & 3)) * u + x * 1.7) > 0.6 ? 0.04 : 0;
          blendAt(buf, x, y, HOLO, a0 + streak + (edge ? 0.1 + 0.08 * (y - 4) / 69 : 0));
        }
      }
      for (let i = 0; i < 8; i++) {
        const v = frac(4 * u + i / 8), y = 72 - v * 62;
        const x = CX + (hash(i, 51) - 0.5) * (24 + (72 - y) * 0.2) + Math.sin(TAU * 5 * u + i);
        if (Math.sin(TAU * (12 + i) * u + i) > -0.2) blendAt(buf, x, y, C('#fff0c0'), 0.7 * Math.sin(Math.PI * v));
      }
      for (let y = 69; y <= 79; y++) for (let x = CX - 20; x <= CX + 20; x++) {
        const d = sq((x - CX) / 18.5) + sq((y - 74) / 3);
        if (d <= 1) put(buf, x, y, d > 0.62 && d < 0.94 ? (y < 74 ? C('#6fe3ff') : pulse > 0.5 ? C('#ffe6a0') : HOLO) : C(y < 74 ? '#3a4050' : '#2a3040'));
        else if (y > 74 && y <= 77 && sq((x - CX) / 18.5) <= 1) put(buf, x, y, C(y === 77 ? '#14161e' : '#1e222e'));
        else if (sq((x - CX) / 19.5) + sq((y - 74) / 3.8) <= 1 || (y === 78 && Math.abs(x - CX) <= 17)) put(buf, x, y, LINE);
      }

      // Idle: breathing, stroking the beard, one eye peeking open now and then.
      const breath = Math.sin(TAU * 20 * u) > 0.35 ? 1 : 0;
      const sp = frac(8 * u);
      const strokeY = 42 + Math.round(8 * (0.5 - 0.5 * Math.cos(TAU * Math.min(1, sp / 0.7))));
      let nod = 0;
      if (mood === 'approving') nod = Math.sin(TAU * 40 * u) > 0.6 ? 1 : 0;
      if (mood === 'intrigued' && age < 0.5) nod = -Math.round(2 * Math.sin(Math.PI * age / 0.5));
      body(0, breath, nod, strokeY, mood === 'approving');

      const hx = CX, hy = 27 + breath + nod;
      f(hx - 7, hy - 5, SHINE); f(hx - 6, hy - 5, SHINE); f(hx - 7, hy - 4, SHINE);
      const blink = frac(15 * u + 0.3) < 0.03;
      if (mood === 'serene') {
        const peek = frac(6 * u + 0.5) < 0.05;
        eye(hx - 5, hy, 'closed', -1); eye(hx + 4, hy, peek ? 'dot' : 'closed', 1);
        brows(hx, hy, peek ? 'up' : 'soft');
      } else if (mood === 'watchful') {
        eye(hx - 5, hy, blink ? 'blink' : 'dot', -1); eye(hx + 4, hy, blink ? 'blink' : 'dot', 1);
        brows(hx, hy, 'stern');
      } else if (mood === 'approving') {
        eye(hx - 5, hy, 'smile', -1); eye(hx + 4, hy, 'smile', 1);
        brows(hx, hy, 'soft');
        for (let x = hx - 2; x <= hx + 2; x++) f(x, hy + 7, MOUTH);
        f(hx - 3, hy + 6, MOUTH); f(hx + 3, hy + 6, MOUTH);
        blendAt(SPR, hx - 8, hy + 4, BLUSH, 0.55); blendAt(SPR, hx - 7, hy + 4, BLUSH, 0.55);
        blendAt(SPR, hx + 7, hy + 4, BLUSH, 0.55); blendAt(SPR, hx + 8, hy + 4, BLUSH, 0.55);
      } else {
        eye(hx - 5, hy, blink ? 'blink' : 'dot', -1); eye(hx + 4, hy, blink ? 'blink' : 'round', 1);
        brows(hx, hy, 'up');
        f(hx, hy + 7, MOUTH); f(hx - 1, hy + 7, MOUTH); f(hx, hy + 8, MOUTH); f(hx - 1, hy + 8, MOUTH);
      }

      // Hologram composite: drifting scanlines, a scan sweep, the odd glitched row.
      const g = Math.floor(frac(u) * 240);
      const glitch = hash(g, 21) < 0.07, gy = 6 + Math.floor(hash(g, 22) * 66), gs = hash(g, 23) < 0.5 ? -2 : 2;
      const scanOff = Math.floor(frac(20 * u) * 3), sweep = Math.round(78 - frac(6 * u + 0.4) * 90);
      for (let y = 0; y < H; y++) {
        const sh = glitch && y === gy ? gs : 0;
        for (let x = 0; x < W; x++) {
          const i = y * W + x, v = SPR[i];
          if (!v) continue;
          const xx = x + sh;
          if (xx < 0 || xx >= W) continue;
          const j = i + sh;
          buf[j] = v;
          if (PART[i]) {
            if ((y + 3 - scanOff) % 3 === 0) blend(buf, j, SCAN, 0.14);
            if (y === sweep) blend(buf, j, HOT, 0.45); else if (Math.abs(y - sweep) === 1) blend(buf, j, HOT, 0.15);
          }
          if (sh) blend(buf, j, RIM, 0.4);
        }
      }

      // Mood extras.
      if (mood === 'approving' || mood === 'intrigued') {
        for (let i = 0; i < 3; i++) {
          const s = Math.sin(TAU * (30 + i * 10) * u + i * 2);
          if (s < 0.4 || (mood === 'intrigued' && i)) continue;
          const sx = [46, 16, 48][i], sy = [14, 26, 34][i];
          put(buf, sx, sy, SPARK);
          if (s > 0.75) { put(buf, sx - 1, sy, SPARK); put(buf, sx + 1, sy, SPARK); put(buf, sx, sy - 1, SPARK); put(buf, sx, sy + 1, SPARK); }
        }
      }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'serene', (state && state.since) || 0);
    };
  },
});
