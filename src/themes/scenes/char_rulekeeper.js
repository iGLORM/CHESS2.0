// The Rulekeeper, Keeper of the Twists: a live character portrait.
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the game HUD and dialogue bubbles. A calm violet bishop hologram standing
// on a projector pad in the Training Camp at dusk: a pointed mitre with the bishop's
// slit, heavy-lidded patient eyes, a rulebook marked "?" in one hand and a swinging
// lantern in the other. Moods: calm (default), knowing, pondering, impressed.
// Breathes, blinks, the lantern swings and mist curls around the pad; as a hologram it
// has drifting scanlines, a scan sweep, a light cone and the odd 1-row glitch.
LiveScenes.register({
  id: 'char_rulekeeper',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['calm', 'knowing', 'pondering', 'impressed'],
  frames: { face: [11, 5, 40, 40] },
  moodFor(category) {
    return {
      gameStart: 'calm', milestone: 'calm', playerLowHealth: 'calm',
      bossCapture: 'knowing', bossCaptureBig: 'knowing', bossCheck: 'knowing', bossTaunt: 'knowing',
      playerCapture: 'pondering', mysteryHint: 'pondering', eyes: 'pondering',
      playerCaptureBig: 'impressed', playerCheck: 'impressed', lowHealth: 'impressed',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, clamp, sq, frac, bay, ramp, hash, noiseLoop, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over, glow } = K;
    let buf = null;

    // ---------- backdrop: a tiny Training Camp, looking out of the dojo at dusk ----------
    const SKYL = new Uint32Array(W * H), WALL = new Uint32Array(W * H);
    const SKYC = ['#0e1230', '#18204a', '#262e62', '#3e3c78', '#645086', '#9a6690', '#d08a94', '#f2b49a'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - CX, (y - 26) * 1.1);
      SKYL[y * W + x] = ramp(SKYC, (y - 4) / 60 + 0.2 * Math.exp(-sq(d / 17)) + 0.08 * Math.exp(-sq(d / 7)), x, y);
    }
    const MX = 16, MY = 13;                                         // the moon
    for (let y = MY - 7; y <= MY + 7; y++) for (let x = MX - 7; x <= MX + 7; x++) {
      const d = Math.hypot(x - MX, y - MY);
      if (d < 2.8) put(SKYL, x, y, C(d < 1.9 ? '#f4f0ff' : '#c8c4f0'));
      else if (d < 7 && (7 - d) / 7 * 0.5 > bay(x, y)) blend(SKYL, y * W + x, C('#6a70b0'), 0.35);
    }
    const peaks = [
      { top: x => 41 + 6 * fbm1(x / 9, 3), cols: ['#5a5a92', '#6a6498', '#8a78a0'], rim: '#b0a0d0' },
      { top: x => 47 + 4 * fbm1(x / 7, 9) - 4 * Math.exp(-sq((x - 15) / 4)), cols: ['#3c4078', '#46487e', '#6a5e90'], rim: '#8a88c0' },
      { top: x => 53 + 2 * fbm1(x / 5, 17), cols: ['#262a58', '#2e3262', '#484878'], rim: '#6a6aa8' },
    ];
    for (const p of peaks) {
      const cols = p.cols.map(C), rim = C(p.rim);
      for (let x = 0; x < W; x++) {
        const ty = Math.round(p.top(x));
        for (let y = ty; y < H; y++) SKYL[y * W + x] = y === ty ? rim : ramp(cols, (y - ty) / 9, x, y);
      }
    }
    (function pagoda() {                                             // on the middle peak
      const px = 15, base = Math.round(peaks[1].top(px)) + 1, dark = C('#1e2044'), roof = C('#2a2850');
      for (let i = 0; i < 2; i++) {
        const y = base - 3 - i * 4, hw = 2 - i;
        for (let yy = y; yy < y + 3; yy++) for (let x = px - hw; x <= px + hw; x++) put(SKYL, x, yy, dark);
        for (let x = px - hw - 2; x <= px + hw + 2; x++) put(SKYL, x, y - 1, roof);
        put(SKYL, px, y + 1, C(i === 0 ? '#ffc870' : '#e8a050'));
      }
      put(SKYL, px, base - 10, dark); put(SKYL, px, base - 11, dark);
    })();
    for (let y = 57; y < 60; y++) for (let x = 0; x < W; x++) SKYL[y * W + x] = ramp(['#6a4a3a', '#4a3028', '#2e1c1c'].map(C), (y - 57) / 3, x, y);

    const WOOD = ['#8a5a34', '#5e3a24', '#3e2418', '#24140e'].map(C);
    const PAPER = ['#fff0c8', '#f4d8a4', '#d8b088', '#a8806a'].map(C);
    for (let y = 0; y < 6; y++) for (let x = 0; x < W; x++)                  // ceiling beam
      WALL[y * W + x] = ramp(WOOD, y === 5 ? 0.15 : y === 4 ? 0.5 : 0.85 + (hash(x >> 2, y) - 0.5) * 0.1, x, y);
    for (const [x0, x1] of [[0, 8], [54, 62]]) for (let y = 6; y < 60; y++) for (let x = x0; x < x1; x++) {
      const frame = (x - x0) % 4 === 0 || (y - 6) % 7 === 0;                 // shoji, lit warm
      const light = 0.85 - (y - 6) / 54 * 0.6;
      WALL[y * W + x] = frame ? ramp(WOOD, 0.55, x, y) : PAPER[light > 0.65 ? 1 : light > 0.45 ? 2 : 3];
    }
    for (const [px, tones] of [[8, [0.6, 0.3, 0.85]], [51, [0.85, 0.3, 0.6]]]) // door posts
      for (let y = 6; y < 62; y++) for (let k = 0; k < 3; k++) WALL[y * W + px + k] = ramp(WOOD, tones[k], px + k, y);
    for (let x = 0; x < W; x++) { WALL[60 * W + x] = ramp(WOOD, 0.1, x, 60); WALL[61 * W + x] = ramp(WOOD, 0.6, x, 61); }
    // Tatami in perspective, a lamp pool around the projector.
    const MAT = ['#1c1e26', '#2e2e30', '#4a4634', '#6e6842', '#968c52', '#c2b46a'].map(C);
    const EDGE = C('#20222e'), EDGE_L = C('#3a3c52');
    for (let y = 62; y < H; y++) for (let x = 0; x < W; x++) {
      const Z = 260 / (y - 44), X = (x - CX) * Z / 26;
      const row = Math.floor(Z / 3), off = row % 2 ? 3 : 0;
      const seam = frac(Z / 3) < 0.1 || frac((X + off) / 6) < 0.05 * (12 / Z);
      let light = 0.18 + 0.5 * Math.exp(-sq((x - CX) / 20) - sq((y - 72) / 9)) - 0.25 * clamp(Math.abs(x - CX) / 31);
      WALL[y * W + x] = seam ? (light > 0.45 ? EDGE_L : EDGE) : ramp(MAT, light, x, y);
    }

    // ---------- the hologram ----------
    const ROBE = ['#e6dcff', '#c2a8ff', '#9a78f4', '#7050d4', '#46329a'].map(C);
    const TRIM = ['#9a80f8', '#7a5ce8', '#5c40c0', '#44308e', '#2e2070'].map(C);
    const HAND = ['#fbf8ff', '#e2d6ff', '#c2a8ff', '#9a78f4', '#6a50c0'].map(C);
    const MATS = [ROBE, TRIM, HAND];
    const RIM = C('#c8f4ff'), LINE = C('#1c1233'), SEAM = C('#8a70e0'), HANDLINE = C('#4e3aa0');
    const HOLO = C('#a98bff'), HOLOD = C('#5b3fb0'), HOT = C('#ffffff'), SCAN = C('#2e2070');
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
    const QMARK = ['###', '..#', '.##', '...', '.#.'];

    // lift moves the whole hologram, b (breath) the upper body only.
    function body(ox, lift, b, lanDX, lanLit, bookGlow) {
      SPR.fill(0); PART.fill(0);
      const oy = lift, uy = lift + b;
      for (let y = 66; y <= 73; y++) {                                        // base
        const top = y - 66, hw = 14 - (top < 2 ? 2 - top : 0) - (y === 73 ? 1 : 0);
        for (let x = CX - hw; x <= CX + hw; x++) shade(x + ox, y + oy, (x - CX) / 15, y < 68 ? -0.6 : 0.1, 1, y === 68 || y === 69 ? 1 : 0);
      }
      for (let y = 41; y <= 66; y++) {                                        // robe
        const hw = 6 + Math.pow((y - 41) / 25, 1.6) * 8.5;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++)
          shade(x + ox, y + oy, (x - CX) / (hw + 0.5), 0.12, 2, Math.abs(x - CX) <= 1 ? 1 : 0);
      }
      disc(CX + ox, 40 + uy, 9, 2.6, 3, 0);                                  // collar
      for (let ry = 11; ry <= 39; ry++) {                                     // mitre
        const hw = ry >= 28 ? 11.5 * Math.sqrt(Math.max(0, 1 - sq((ry - 28) / 11.6)))
          : 11.5 * Math.pow(Math.max(0, 1 - Math.pow((28 - ry) / 17, 1.7)), 0.6);
        const ny = ry < 28 ? -(28 - ry) / 17 * 0.85 : (ry - 28) / 11.6 * 0.85;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) shade(x + ox, ry + uy, (x - CX) / (hw + 0.5) * 0.95, ny, 4, 0);
      }
      disc(CX + ox, 9 + uy, 2.4, 2.4, 5, 0);                                 // finial
      // Rulebook against the chest, a "?" on its cover.
      for (let y = 45; y <= 52; y++) for (let x = 16; x <= 27; x++) {
        const edge = y === 45 || x === 27;
        if (edge) setP(x + ox, y + uy, (x + y) % 2 ? ROBE[0] : ROBE[1], 6);
        else setP(x + ox, y + uy, x === 16 ? TRIM[4] : x < 19 || y === 46 ? TRIM[2] : TRIM[3], 6);
      }
      QMARK.forEach((row, j) => [...row].forEach((ch, k) => { if (ch === '#') setP(21 + k + ox, 46 + j + uy, bookGlow ? HOT : ROBE[0], 6); }));
      disc(17 + ox, 52 + uy, 3, 2.8, 7, 2);                                  // hand on the book
      disc(43 + ox, 50 + uy, 3, 2.8, 8, 2);                                  // hand with the lantern
      // Lantern hanging from the right hand, swinging a pixel either way.
      const lx = 43 + ox, ly = 53 + uy;
      setP(lx, ly, TRIM[3], 9); setP(lx + lanDX, ly + 1, TRIM[3], 9);
      for (let x = -2; x <= 2; x++) { setP(lx + lanDX + x, ly + 2, TRIM[3], 9); setP(lx + lanDX + x, ly + 8, TRIM[4], 9); }
      for (let y = 3; y <= 7; y++) for (let x = -2; x <= 2; x++) {
        const bar = x === -2 || x === 2;
        setP(lx + lanDX + x, ly + y, bar ? TRIM[x < 0 ? 2 : 4] : lanLit[Math.min(2, Math.abs(x) + (y === 3 || y === 7 ? 1 : 0))], 9);
      }
      for (let x = -1; x <= 1; x++) setP(lx + lanDX + x, ly + 9, TRIM[4], 9);
      // Outline around the figure; seams where a front part overlaps one behind it.
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        const n0 = PART[i - 1], n1 = PART[i + 1], n2 = PART[i - W], n3 = PART[i + W];
        if (!p) { if (n0 || n1 || n2 || n3) SPR[i] = LINE; }
        else if ((n0 && n0 < p) || (n1 && n1 < p) || (n2 && n2 < p) || (n3 && n3 < p)) SPR[i] = p >= 6 ? HANDLINE : SEAM;
      }
      // The bishop's slit across the mitre, with a lit lower lip.
      for (let k = 0; k < 7; k++) {
        const x = CX + 5 - k + ox, y = 15 + k + uy;
        if (PART[y * W + x] === 4) SPR[y * W + x] = TRIM[3];
        if (PART[(y + 1) * W + x] === 4) SPR[(y + 1) * W + x] = ROBE[0];
      }
    }

    // ---------- face ----------
    const EYE = C('#1e1420'), SHINE = C('#ffffff'), BROW = C('#4e3aa0'), MOUTH = C('#2e1a40');
    const BLUSH = C('#f0a8e0'), BANG = C('#ffd23f'), SPARK = C('#f4eeff'), QC = C('#f4eeff');
    const f = (x, y, c) => put(SPR, x, y, c);
    function eyes(hx, hy, kind, look) {
      for (const s of [-1, 1]) {
        const ex = s < 0 ? hx - 5 : hx + 4;
        if (kind === 'blink') { f(ex - (s < 0 ? 1 : 0), hy + 2, EYE); f(ex, hy + 2, EYE); f(ex + 1, hy + 2, EYE); if (s > 0) f(ex + 2, hy + 2, EYE); continue; }
        if (kind === 'lid') {                            // heavy lids, patient pupils below
          const dy = look === 'down' ? 1 : 0, dx = look === 'side' ? 1 : 0;
          const o = s < 0 ? ex - 1 : ex;
          for (let x = o; x < o + 3; x++) f(x, hy + 1 + dy, EYE);
          f(ex + dx, hy + 2 + dy, EYE); f(ex + 1 + dx, hy + 2 + dy, EYE);
          continue;
        }
        const x0 = s > 0 ? ex : ex - 1;                  // round, wide open
        for (let y = hy; y < hy + 3; y++) for (let x = x0; x < x0 + 3; x++) f(x, y, EYE);
        f(x0, hy, SHINE);
      }
    }

    // ---------- mist, stars, petals, lanterns ----------
    const STARS = [[24, 8], [36, 7], [44, 11], [13, 22], [48, 20], [28, 14]].map(([x, y], i) => ({ x, y, k: 9 + i * 4, p: hash(i, 3) * TAU }));
    const PETALS = Array.from({ length: 5 }, (_, i) => ({ x0: hash(i, 71), y0: 14 + hash(i, 72) * 40, k: 1 + (i % 2), ky: 5 + i, fall: 10 + hash(i, 73) * 14, p: hash(i, 74) * TAU }));
    const LANTS = [{ x: 4, y: 16, p: 0 }, { x: 57, y: 18, p: 1.7 }];
    const LRED = ['#ffd08a', '#ff9a50', '#e0603a', '#9a3028'].map(C), LWARM = C('#ffb050');
    const WISPS = Array.from({ length: 6 }, (_, i) => ({ s: i % 2 ? 1 : -1, v0: i / 6, p: hash(i, 41) * TAU }));
    const vignette = K.vignette(C('#0a0814'), 0.4, 0.55);

    function frame(t, mood, since) {
      const u = t / LOOP, age = ((t - since) % LOOP + LOOP) % LOOP;
      buf.set(SKYL);
      for (const s of STARS) if (Math.sin(TAU * s.k * u + s.p) > 0.2) put(buf, s.x, s.y, C('#e8e4ff'));
      for (let y = 44; y < 58; y++) for (let x = 10; x < 52; x++) {           // mist in the valley
        const n = noiseLoop(x / 8 + 8 * u, y >> 1, 8) * 0.6 + noiseLoop(x / 5 - 10 * u, (y >> 1) + 40, 10) * 0.4;
        const a = n * Math.exp(-sq((y - 51) / 4)) - 0.28;
        if (a > bay(x, y) * 0.5) blend(buf, y * W + x, C('#9a94c8'), 0.35);
      }
      over(buf, WALL);
      for (const L of LANTS) {                                                 // paper lanterns
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
      for (const p of PETALS) {                                                 // cherry petals drift in
        const v = frac(p.x0 + p.k * u);
        const x = W + 4 - v * (W + 8), y = p.y0 + v * p.fall + 2 * Math.sin(TAU * p.ky * u + p.p);
        put(buf, x, y, C(Math.sin(TAU * p.ky * 3 * u + p.p) > 0 ? '#ffc8d8' : '#e890b0'));
      }
      vignette(buf);

      // The projector pad and its light cone.
      const pulse = 0.5 + 0.5 * Math.sin(TAU * 30 * u);
      glow(buf, CX, 28, 22, HOLOD, 0.2);
      for (let y = 6; y <= 73; y++) {
        const hw = 12 + (73 - y) * 0.12, a0 = 0.02 + 0.12 * (y - 6) / 67;
        for (let x = Math.ceil(CX - hw); x <= Math.floor(CX + hw); x++) {
          const edge = x - (CX - hw) < 1 || (CX + hw) - x < 1;
          const streak = Math.sin(TAU * (3 + (x & 3)) * u + x * 1.7) > 0.6 ? 0.04 : 0;
          blendAt(buf, x, y, HOLO, a0 + streak + (edge ? 0.1 + 0.08 * (y - 6) / 67 : 0));
        }
      }
      for (let i = 0; i < 8; i++) {                                           // motes rising in the beam
        const v = frac(4 * u + i / 8), y = 72 - v * 62;
        const x = CX + (hash(i, 51) - 0.5) * (22 + (72 - y) * 0.2) + Math.sin(TAU * 5 * u + i);
        if (Math.sin(TAU * (12 + i) * u + i) > -0.2) blendAt(buf, x, y, C('#e6dcff'), 0.7 * Math.sin(Math.PI * v));
      }
      for (let y = 69; y <= 79; y++) for (let x = CX - 19; x <= CX + 19; x++) {
        const d = sq((x - CX) / 17.5) + sq((y - 74) / 3);
        if (d <= 1) put(buf, x, y, d > 0.62 && d < 0.94 ? (y < 74 ? C('#6fe3ff') : pulse > 0.5 ? C('#d4c4ff') : HOLO) : C(y < 74 ? '#3a4050' : '#2a3040'));
        else if (y > 74 && y <= 77 && sq((x - CX) / 17.5) <= 1) put(buf, x, y, C(y === 77 ? '#14161e' : '#1e222e'));
        else if (sq((x - CX) / 18.5) + sq((y - 74) / 3.8) <= 1 || (y === 78 && Math.abs(x - CX) <= 16)) put(buf, x, y, LINE);
      }

      // Idle: breathing, the lantern swinging, blinking.
      const breath = Math.sin(TAU * 20 * u) > 0.35 ? 1 : 0;
      let lift = 0;
      if (mood === 'impressed') lift -= age < 0.5 ? Math.round(3 * Math.sin(Math.PI * age / 0.5)) : 0;
      const lanDX = Math.round(Math.sin(TAU * 15 * u) * 1.1);
      const fl = Math.sin(TAU * 71 * u) * Math.sin(TAU * 23 * u + 1);
      const lanLit = fl > 0.3 ? [HOT, HOT, ROBE[0]] : [HOT, ROBE[0], ROBE[1]];
      const bookGlow = mood === 'knowing' && Math.sin(TAU * 30 * u) > 0;
      body(0, lift, breath, lanDX, lanLit, bookGlow);

      const hx = CX, hy = 28 + lift + breath;
      f(hx - 6, hy - 9, SHINE); f(hx - 5, hy - 9, SHINE); f(hx - 6, hy - 8, SHINE);
      const blink = frac(15 * u + 0.3) < 0.03;
      if (mood === 'calm') {
        eyes(hx, hy, blink ? 'blink' : 'lid');
        f(hx - 2, hy + 6, MOUTH); f(hx - 1, hy + 7, MOUTH); f(hx, hy + 7, MOUTH); f(hx + 1, hy + 6, MOUTH);
      } else if (mood === 'knowing') {
        eyes(hx, hy, blink ? 'blink' : 'lid', 'side');
        f(hx + 4, hy - 2, BROW); f(hx + 5, hy - 3, BROW); f(hx + 6, hy - 3, BROW);        // one brow up
        f(hx - 6, hy - 1, BROW); f(hx - 5, hy - 1, BROW); f(hx - 4, hy - 1, BROW);
        f(hx - 1, hy + 7, MOUTH); f(hx, hy + 7, MOUTH); f(hx + 1, hy + 7, MOUTH); f(hx + 2, hy + 6, MOUTH); // smirk
        blendAt(SPR, hx - 8, hy + 4, BLUSH, 0.5); blendAt(SPR, hx + 7, hy + 4, BLUSH, 0.5);
      } else if (mood === 'pondering') {
        eyes(hx, hy, blink ? 'blink' : 'lid', 'down');
        f(hx - 6, hy - 2, BROW); f(hx - 5, hy - 3, BROW); f(hx - 4, hy - 3, BROW);
        f(hx + 4, hy - 3, BROW); f(hx + 5, hy - 3, BROW); f(hx + 6, hy - 2, BROW);
        f(hx - 1, hy + 7, MOUTH); f(hx, hy + 7, MOUTH);
      } else {
        eyes(hx, hy, blink ? 'blink' : 'round');
        for (let i = 0; i < 3; i++) { f(hx - 6 + i, hy - 3, BROW); f(hx + 4 + i, hy - 3, BROW); }
        for (let y = hy + 5; y <= hy + 7; y++) for (let x = hx - 1; x <= hx; x++) f(x, y, MOUTH);
      }

      // Hologram composite: drifting scanlines, a scan sweep, the odd glitched row.
      const g = Math.floor(frac(u) * 240);
      const glitch = hash(g, 11) < 0.07, gy = 10 + Math.floor(hash(g, 12) * 62), gs = hash(g, 13) < 0.5 ? -2 : 2;
      const scanOff = Math.floor(frac(20 * u) * 3), sweep = Math.round(78 - frac(6 * u) * 90);
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
      glow(buf, 43 + lanDX, 58 + lift + breath, 8, C('#e8dcff'), fl > 0.3 ? 0.22 : 0.15);

      // Mist curling round the pad (the Keeper of the mist).
      for (const w of WISPS) {
        const v = frac(3 * u + w.v0);
        const x = CX + w.s * (9 + v * 9) + Math.sin(TAU * 7 * u + w.p), y = 75 - v * 7;
        const a = Math.sin(Math.PI * v) * 0.45;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -3; dx <= 3; dx++) if (Math.abs(dx) + Math.abs(dy) * 2 < 4) blendAt(buf, x + dx, y + dy, C('#d8ccff'), a * (dx || dy ? 0.55 : 1));
      }

      // Mood extras above the head.
      if (mood === 'pondering') {                                                 // a "?" floats up
        const v = frac(15 * u);
        if (v < 0.75) {
          const qx = hx + 13, qy = hy - 12 - Math.round(v * 5);
          QMARK.forEach((row, j) => [...row].forEach((ch, k) => {
            if (ch !== '#') return;
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const xx = qx + k + dx, yy = qy + j + dy; if (!(QMARK[j + dy] && QMARK[j + dy][k + dx] === '#')) put(buf, xx, yy, LINE); }
          }));
          QMARK.forEach((row, j) => [...row].forEach((ch, k) => { if (ch === '#') put(buf, qx + k, qy + j, QC); }));
        }
      } else if (mood === 'impressed') {
        if (age > 0.1) {                                                          // "!" pops up
          const bx = hx + 14, by = hy - 17 + (age < 0.3 ? 2 : 0);
          for (let y = by; y < by + 5; y++) { put(buf, bx, y, BANG); put(buf, bx - 1, y, LINE); put(buf, bx + 1, y, LINE); }
          put(buf, bx, by + 6, BANG); put(buf, bx, by - 1, LINE); put(buf, bx, by + 5, LINE); put(buf, bx, by + 7, LINE);
          put(buf, bx - 1, by + 6, LINE); put(buf, bx + 1, by + 6, LINE);
        }
        for (let i = 0; i < 3; i++) {
          const s = Math.sin(TAU * (30 + i * 10) * u + i * 2);
          if (s < 0.4) continue;
          const sx = [12, 50, 14][i], sy = [20, 30, 36][i];
          put(buf, sx, sy, SPARK);
          if (s > 0.75) { put(buf, sx - 1, sy, SPARK); put(buf, sx + 1, sy, SPARK); put(buf, sx, sy - 1, SPARK); put(buf, sx, sy + 1, SPARK); }
        }
      }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'calm', (state && state.since) || 0);
    };
  },
});
