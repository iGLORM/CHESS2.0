// Sergeant Square, Drill Instructor: a live character portrait.
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the game HUD and dialogue bubbles. A cyan hologram of a rook, projected
// from a pad in the Training Camp at dusk: his crenellated top is a peaked drill cap
// with a visor and badge, a square moustache, fists on his hips, a whistle on a cord.
// Moods: stern (default), barking, proud (salutes), doubtful (hand on chin).
// Idle: breathes, blinks, glances left and right inspecting the recruit; the hologram
// scans, drifts scanlines and glitches a row now and then.
LiveScenes.register({
  id: 'char_sergeantsquare',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['stern', 'barking', 'proud', 'doubtful'],
  frames: { face: [11, 5, 40, 40] },
  moodFor(category) {
    return {
      gameStart: 'barking', playerCheck: 'barking', bossTaunt: 'barking', bossCheck: 'barking',
      bossCapture: 'stern', bossCaptureBig: 'stern',
      playerCapture: 'doubtful', playerCaptureBig: 'doubtful', playerLowHealth: 'doubtful',
      milestone: 'proud', lowHealth: 'proud',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, clamp, sq, frac, bay, ramp, hash, blend } = PixelKit;
    const K = PixelKit.surface(W, H), { put, blendAt, over } = K;
    let buf = null;

    // Hologram colours: a cyan ramp (warm-white core where the lanterns catch it,
    // deep blue shade), a navy ramp for the cap and moustache.
    const HOLO = C('#56d8ff'), HOLO_HI = C('#d8faff'), HOLO_DK = C('#1f7fa8');
    const BODY = ['#e6fdff', '#86e8ff', '#4ccdf6', '#2c92cc', '#23589a'].map(C);
    const CAP = ['#74c4ee', '#3e8cc8', '#27639e', '#1c4378', '#162c58'].map(C);
    const LINE = C('#0e1830');

    // ---------- backdrop: a corner of the Training Camp at dusk ----------
    const BG = new Uint32Array(W * H);
    const SKYC = ['#0e1230', '#18204a', '#262e62', '#3e3c78', '#645086', '#9a6690', '#d08a94', '#f2b49a'].map(C);
    const WOOD = ['#8a5a34', '#5e3a24', '#3e2418', '#24140e'].map(C);
    const PAPER = ['#fff0c8', '#f4d8a4', '#d8b088', '#a8806a'].map(C);
    const DX0 = 11, DX1 = 51, DY0 = 7, DY1 = 52;          // the open doorway
    const PAPERM = new Uint8Array(W * H);                  // flat-lit paper: no dithered glow on it
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - 36, (y - 50) * 1.4);
      BG[y * W + x] = ramp(SKYC, (y - DY0) / 46 + 0.16 * Math.exp(-sq(d / 22)), x, y);
    }
    // Moon, peaks, a pagoda on the far ridge.
    for (let y = 8; y < 22; y++) for (let x = 12; x < 26; x++) {
      const d = Math.hypot(x - 18, y - 14);
      if (d < 2.6) put(BG, x, y, C(d < 1.8 ? '#f4f0ff' : '#c8c4f0'));
      else if (d < 6 && (6 - d) / 6 * 0.5 > bay(x, y)) blend(BG, y * W + x, C('#6a70b0'), 0.35);
    }
    const PEAKS = [
      { top: x => 33 + 7 * Math.sin(x / 7 + 1) + 3 * Math.sin(x / 3.1), cols: ['#5a5a92', '#6a6498'], rim: '#b0a0d0' },
      { top: x => 41 + 4 * Math.sin(x / 5 + 3) - 5 * Math.exp(-sq((x - 42) / 5)), cols: ['#3c4078', '#46487e'], rim: '#8a88c0' },
    ];
    for (const p of PEAKS) {
      const cols = p.cols.map(C), rim = C(p.rim);
      for (let x = DX0; x < DX1; x++) {
        const ty = Math.round(p.top(x));
        for (let y = ty; y < DY1; y++) BG[y * W + x] = y === ty ? rim : ramp(cols, (y - ty) / 8, x, y);
      }
    }
    const pgx = 42, pgy = Math.round(PEAKS[1].top(42));
    for (let i = 0; i < 2; i++) {
      const y = pgy - 3 - i * 4, hw = 3 - i;
      for (let x = pgx - hw; x <= pgx + hw; x++) { put(BG, x, y, C('#1e2044')); put(BG, x, y + 1, C('#1e2044')); }
      for (let x = pgx - hw - 2; x <= pgx + hw + 2; x++) put(BG, x, y - 1, C('#2a2850'));
      put(BG, pgx - hw - 2, y - 2, C('#2a2850')); put(BG, pgx + hw + 2, y - 2, C('#2a2850'));
      put(BG, pgx, y + 1, C('#ffc870'));
    }
    // Veranda boards, then the room: ceiling beam, lintel, posts, glowing shoji.
    for (let y = DY1 - 3; y < DY1; y++) for (let x = DX0; x < DX1; x++) BG[y * W + x] = ramp(['#6a4a3a', '#4a3028'].map(C), (y - DY1 + 3) / 3, x, y);
    for (let y = 0; y < DY0; y++) for (let x = 0; x < W; x++)
      BG[y * W + x] = ramp(WOOD, y === 3 || y === DY0 - 1 ? 0.25 : 0.72 + (x % 20 < 2 && y < 3 ? -0.3 : 0), x, y);
    for (const [x0, x1] of [[0, DX0 - 2], [DX1 + 2, W]]) for (let y = DY0; y < 56; y++) for (let x = x0; x < x1; x++) {
      const frame = (x - x0) % 9 === 4 || (y - DY0) % 12 === 11;
      const out = x0 === 0 ? 1 - x / x1 : (x - x0) / (W - x0);       // darker toward the frame edge
      const lt = 0.9 - (y - DY0) / 55 - out * 0.35;
      BG[y * W + x] = frame ? WOOD[2] : PAPER[lt > 0.62 ? 0 : lt > 0.42 ? 1 : lt > 0.22 ? 2 : 3];
      PAPERM[y * W + x] = 1;
    }
    for (const px of [DX0 - 2, DX1]) for (let y = 0; y < 58; y++) for (let x = px; x < px + 2; x++) BG[y * W + x] = WOOD[x === px ? 1 : 3];
    // Tatami floor in perspective, a lantern pool on the left, darker toward the front.
    const MAT = ['#1c1e26', '#2e2e30', '#4a4634', '#6e6842', '#968c52'].map(C);
    for (let y = 56; y < H; y++) for (let x = 0; x < W; x++) {
      const Z = 220 / (y - 44), X = (x - 31) * Z / 12;
      const seam = frac(Z / 4) < 0.07 * (18 / Z) || frac(X / 7 + (Math.floor(Z / 4) % 2) * 0.5) < 0.05 * (18 / Z);
      let light = 0.45 - (y - 56) / 60 + 0.4 * Math.exp(-sq((x - 8) / 16) - sq((y - 60) / 8));
      light -= 0.25 * clamp((y - 72) / 8);
      BG[y * W + x] = seam ? C(light > 0.45 ? '#3a3c52' : '#20222e') : ramp(MAT, light, x, y);
    }
    for (let x = 0; x < W; x++) for (let y = 54; y < 56; y++) if (x < DX0 || x >= DX1 || y >= DY1) BG[y * W + x] = ramp(WOOD, y === 54 ? 0.1 : 0.6, x, y);
    // A training dummy on the left, in front of the shoji.
    for (let y = 44; y <= 66; y++) for (let x = 3; x <= 5; x++) put(BG, x, y, WOOD[x === 3 ? 0 : x === 4 ? 1 : 2]);
    for (let y = 44; y <= 49; y++) for (let x = 2; x <= 6; x++) put(BG, x, y, C(x < 4 ? '#e8d090' : x < 6 ? '#c0a060' : '#8a6a3a'));
    for (let i = 0; i < 4; i++) { put(BG, 6 + i, 53 - (i >> 1), WOOD[1]); put(BG, 2 - (i >> 1), 57 + (i >> 1), WOOD[1]); }
    for (let x = 1; x <= 8; x++) put(BG, x, 67, C('#140e10'));
    // Hologram glow behind the head (dithered bands), and a darker, cooler rim.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (PAPERM[y * W + x]) continue;
      const g = Math.exp(-sq(Math.hypot(x - CX, (y - 26) * 0.9) / 20));
      if (g * 0.95 > bay(x, y)) blend(BG, y * W + x, HOLO_DK, 0.34);
      if (g * g * 0.9 > bay(x + 2, y + 1)) blend(BG, y * W + x, HOLO, 0.2);
      const v = sq((x - W / 2) / (W / 2)) * 0.6 + sq((y - H / 2) / (H / 2)) * 0.6;
      if (clamp((v - 0.35) * 1.3) > bay(x, y)) blend(BG, y * W + x, C('#0a0814'), 0.4);
    }

    // ---------- the figure ----------
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H), MATI = new Uint8Array(W * H);
    const MATS = [null,
      { t: BODY, rim: C('#c8fbff'), soft: C('#4ab4e4'), hard: C('#1e5690') },
      { t: CAP, rim: C('#8ad8ff'), soft: C('#1c4378'), hard: C('#122446') },
    ];
    const HARD = new Uint8Array(16);                     // parts whose edge is a dark seam
    const LN = Math.hypot(0.55, 0.65, 0.53), LX = -0.55 / LN, LY = -0.65 / LN, LZ = 0.53 / LN;
    function shade(x, y, nx, ny, part, m) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const M = MATS[m], nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * LX + ny * LY + nz * LZ, i = y * W + x;
      SPR[i] = nx > 0.8 && l < 0.25 ? M.rim : M.t[Math.round(clamp(1 - (l * 0.62 + 0.42)) * (M.t.length - 1))];
      PART[i] = part; MATI[i] = m;
    }
    function disc(cx, cy, rx, ry, part, m) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.95, ny * 0.95, part, m);
      }
    }
    // A column (surface of revolution) from y0 to y1 with half-width hw(y).
    function column(y0, y1, hw, part, m, ox, oy, nyf) {
      for (let y = y0; y <= y1; y++) {
        const h = hw(y);
        for (let x = Math.round(CX - h); x <= Math.round(CX + h); x++) shade(x + ox, y + oy, (x - CX) / (h + 0.5), nyf(y), part, m);
      }
    }
    function outline() {
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        const a = PART[i - 1], b = PART[i + 1], c = PART[i - W], d = PART[i + W];
        if (!p) { if (a || b || c || d) SPR[i] = LINE; continue; }
        let q = -1;
        for (const j of [i - 1, i + 1, i - W, i + W]) if (PART[j] && PART[j] < p && (q < 0 || PART[j] < PART[q])) q = j;
        if (q >= 0) SPR[i] = HARD[p] || MATI[q] !== MATI[i] ? MATS[MATI[i]].hard : MATS[MATI[i]].soft;
      }
    }

    // Parts, back to front.
    const P_BASE = 1, P_BODY = 2, P_COLLAR = 3, P_HEAD = 4, P_CAP = 5, P_VISOR = 6, P_WHISTLE = 7, P_HANDL = 8, P_HANDR = 9;
    HARD[P_VISOR] = HARD[P_WHISTLE] = HARD[P_HANDL] = HARD[P_HANDR] = 1;
    const MERLONS = [[-14, -9], [-3, 3], [9, 14]];

    function body(ox, oy, hands) {
      SPR.fill(0); PART.fill(0); MATI.fill(0);
      const bo = oy.body, ho = oy.head;
      // Base plinth, flaring column.
      for (let y = 62; y <= 70; y++) {
        const top = y - 62, hw = 15 - (top < 2 ? 2 - top : 0) - (y === 70 ? 1 : 0);
        for (let x = CX - hw; x <= CX + hw; x++) shade(x + ox, y + bo, (x - CX) / 16, y < 64 ? -0.6 : 0.1, P_BASE, 1);
      }
      column(40, 62, y => 9.5 + sq((y - 40) / 22) * 4 + (y > 58 ? (y - 58) * 0.6 : 0), P_BODY, 1, ox, bo, () => 0.1);
      disc(CX + ox, 40 + ho, 12.5, 2.2, P_COLLAR, 1);
      // The turret is his head: a slightly rounded block.
      column(12, 37, y => 12 - (y > 35 ? y - 35 : 0), P_HEAD, 1, ox, ho, y => y > 34 ? 0.45 : y < 16 ? -0.4 : 0);
      // Cap: crenellations become the crown, a band with a badge, a visor.
      for (const [a, b] of MERLONS) for (let y = 7; y <= 12; y++) for (let x = CX + a; x <= CX + b; x++)
        shade(x + ox, y + ho, (x - CX) / 15, y === 7 ? -0.7 : -0.25, P_CAP, 2);
      column(12, 16, () => 14, P_CAP, 2, ox, ho, y => y === 12 ? -0.6 : 0);
      for (let y = 17; y <= 18; y++) {
        const hw = y === 17 ? 13 : 11;
        for (let x = CX - hw; x <= CX + hw; x++) shade(x + ox, y + ho, (x - CX) / 14 * 0.6, 0.7, P_VISOR, 2);
      }
      // Whistle on its cord.
      for (let y = 46; y <= 47; y++) for (let x = CX - 3; x <= CX + 1; x++) shade(x + ox, y + ho, -0.3, (y - 46.5) * 0.8, P_WHISTLE, 1);
      disc(CX + 3 + ox, 47.5 + ho, 2.4, 2.2, P_WHISTLE, 1);
      // Hands.
      for (const h of hands) {
        const hy = h.y + (h.head ? ho : bo);
        if (h.arm) for (let s = 0; s <= 1; s += 0.1) {           // the saluting arm: shoulder, elbow out, hand
          const ax = h.sh[0] + (h.arm[0] - h.sh[0]) * s, ay = h.sh[1] + (h.arm[1] - h.sh[1]) * s + ho;
          const fx = h.arm[0] + (h.x - h.arm[0]) * s, fy = h.arm[1] + ho + (hy - h.arm[1] - ho) * s;
          disc(ax + ox, ay, 2, 2, h.p, 1); disc(fx + ox, fy, 1.8, 1.8, h.p, 1);
        }
        disc(h.x + ox, hy, h.rx || 3.8, h.ry || 3.5, h.p, 1);
      }
      outline();
    }

    const EYE = C('#0b1a2a'), SHINE = C('#ffffff'), BROW = CAP[3], MOUTH = C('#0f2040');
    const TONGUE = C('#ff8aa8'), TEETH = C('#f4feff'), BLUSH = C('#ff9ac8'), SPARK = C('#f4ffff');
    const sp = (x, y, c) => put(SPR, x, y, c);

    function eyes(hx, hy, kind, look) {
      for (const s of [-1, 1]) {
        const ex = (s < 0 ? hx - 6 : hx + 4) + look, ey = hy - 4;
        if (kind === 'blink') { sp(ex, ey + 2, EYE); sp(ex + 1, ey + 2, EYE); continue; }
        if (kind === 'closed') { sp(ex - 1, ey + 2, EYE); sp(ex, ey + 1, EYE); sp(ex + 1, ey + 1, EYE); sp(ex + 2, ey + 2, EYE); continue; }
        if (kind === 'squint' && s < 0) { sp(ex - 1, ey + 2, EYE); sp(ex, ey + 2, EYE); sp(ex + 1, ey + 2, EYE); continue; }
        if (kind === 'squint') {                                   // the raised-brow eye opens wide
          for (let y = ey; y <= ey + 2; y++) for (let x = ex; x <= ex + 1; x++) sp(x, y, EYE);
          sp(ex, ey, SHINE); continue;
        }
        if (kind === 'wide') {
          for (let y = ey - 1; y <= ey + 2; y++) for (let x = ex - (s < 0 ? 1 : 0); x <= ex + (s < 0 ? 1 : 2); x++) sp(x, y, EYE);
          sp(ex - (s < 0 ? 1 : 0), ey - 1, SHINE);
          continue;
        }
        // Narrow drill-instructor eyes: 2x2 under a heavy brow.
        for (let y = ey + 1; y <= ey + 2; y++) for (let x = ex; x <= ex + 1; x++) sp(x, y, EYE);
        sp(ex, ey + 1, SHINE);
      }
    }
    function brows(hx, hy, kind) {
      const y = hy - 6, L = hx - 7, R = hx + 4;
      if (kind === 'angry') {                                     // heavy, down at the middle
        for (let i = 0; i < 4; i++) { sp(L + i, y + (i >> 1), BROW); sp(R + 3 - i, y + (i >> 1), BROW); }
        sp(L + 3, y + 2, BROW); sp(R, y + 2, BROW);
      } else if (kind === 'stern') {
        for (let i = 0; i < 4; i++) { sp(L + i, y + (i > 2 ? 1 : 0), BROW); sp(R + 3 - i, y + (i > 2 ? 1 : 0), BROW); }
        sp(L + 1, y + 1, BROW); sp(L + 2, y + 1, BROW); sp(R + 1, y + 1, BROW); sp(R + 2, y + 1, BROW);
      } else if (kind === 'proud') {
        for (let i = 0; i < 4; i++) { sp(L + i, y - (i === 1 || i === 2 ? 1 : 0), BROW); sp(R + i, y - (i === 1 || i === 2 ? 1 : 0), BROW); }
      } else if (kind === 'doubt') {                               // left low and flat, right cocked up
        for (let i = 0; i < 4; i++) { sp(L + i, y + 1 + (i === 3 ? 1 : 0), BROW); sp(L + i, y + 2 + (i === 3 ? 1 : 0), BROW); }
        for (let i = 0; i < 4; i++) sp(R + i, y - 1 - (i === 1 || i === 2 ? 1 : 0), BROW);
      }
    }
    // The square moustache: his namesake. Lifts a pixel when he twitches it.
    function moustache(hx, hy, lift, tilt) {
      const y0 = hy + 2 - lift;
      for (let y = y0; y <= y0 + 2; y++) for (let x = hx - 4; x <= hx + 4; x++) {
        const yy = y + (tilt && x > hx ? -1 : 0);
        sp(x, yy, y === y0 ? CAP[1] : x === hx ? CAP[4] : CAP[y === y0 + 1 ? 2 : 3]);
      }
      for (let x = hx - 5; x <= hx + 5; x++) { sp(x, y0 + 3 + (tilt && x > hx ? -1 : 0), LINE); }
      sp(hx - 5, y0 + 2, LINE); sp(hx + 5, y0 + 2 + (tilt ? -1 : 0), LINE);
    }
    function shoutLines(hx, hy, on) {
      if (!on) return;
      for (const s of [-1, 1]) {
        const x0 = hx + s * 17;
        for (let i = 0; i < 3; i++) put(buf, x0 + s * i, hy + 3 - i, HOLO_HI);
        for (let i = 0; i < 3; i++) put(buf, x0 + s * (i + 1), hy + 8, HOLO_HI);
        for (let i = 0; i < 2; i++) put(buf, x0 + s * i, hy + 12 + i, HOLO_HI);
      }
    }

    // Hologram effects: projector pad, light cone, rising motes, scanlines, glitch.
    const PADY = 73;
    const MOTES = Array.from({ length: 7 }, (_, i) => ({ x: CX - 14 + hash(i, 5) * 28, k: 3 + (i % 3), p: hash(i, 9) }));
    const PETALS = Array.from({ length: 4 }, (_, i) => ({ x0: hash(i, 21), y0: 12 + hash(i, 22) * 30, k: 1 + (i % 2), ky: 5 + i, p: hash(i, 23) * TAU }));
    const STARS = [[28, 10, 11], [40, 9, 17], [46, 16, 13], [33, 17, 19], [22, 24, 23]];
    function cone(u, flick) {
      for (let y = 4; y < PADY; y++) {
        const f = (PADY - y) / (PADY - 4), hw = 15 + f * 9;
        const a = (1 - f) * 0.55 + 0.1;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) {
          const e = Math.abs(x - CX) / hw;
          const edge = e > 0.9 ? 0.3 : 0;
          if ((a + edge) * flick > bay(x, y) + 0.15) blendAt(buf, x, y, HOLO, 0.14 + edge * 0.3);
        }
      }
      for (const m of MOTES) {
        const v = frac(m.k * u + m.p), y = PADY - 2 - v * 60;
        if (v < 0.85) put(buf, m.x + Math.sin(TAU * (m.k + 2) * u + m.p * 9), y, v < 0.5 ? HOLO_HI : HOLO);
      }
    }
    function pad(u) {
      for (let y = PADY - 3; y <= PADY + 4; y++) for (let x = CX - 19; x <= CX + 19; x++) {
        const nx = (x - CX) / 18, ny = (y - PADY) / 3;
        const top = nx * nx + ny * ny <= 1;
        const side = !top && Math.abs(nx) <= 1 && y > PADY && y <= PADY + 3 && (nx * nx + sq((y - 3 - PADY) / 3) <= 1 || y <= PADY + 2);
        if (top) put(buf, x, y, nx * nx + ny * ny > 0.72 ? (ny < 0.2 ? HOLO_HI : HOLO) : C(ny < -0.2 ? '#4a5268' : '#343a4c'));
        else if (side) put(buf, x, y, C(y === PADY + 3 ? '#161a24' : '#232838'));
      }
      for (let i = 0; i < 3; i++) {                                    // blinking status lights
        const on = Math.sin(TAU * (6 + i * 5) * u + i * 2) > 0;
        put(buf, CX - 8 + i * 8, PADY + 2, on ? HOLO_HI : HOLO_DK);
      }
    }
    function scan(u) {
      const off = Math.floor(frac(20 * u) * 3);                          // drifting scanlines
      const bar = Math.round(PADY - frac(6 * u) * 90);                   // a bright scan sweeping up
      for (let y = 0; y < H; y++) {
        const dim = (y + off) % 3 === 0, hot = y === bar || y === bar + 1;
        if (!dim && !hot) continue;
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          if (!PART[i]) continue;
          if (hot) blend(SPR, i, HOLO_HI, y === bar ? 0.45 : 0.2); else blend(SPR, i, HOLO_DK, 0.16);
        }
      }
      // A one-row glitch now and then: the row slips sideways for a moment.
      const g = frac(7 * u + 0.13);
      if (g < 0.014) {
        const row = 10 + Math.floor(hash(Math.floor(7 * u), 3) * 56), sh = hash(Math.floor(7 * u), 4) > 0.5 ? 2 : -2;
        for (const y of [row, row + 1]) {
          const tmp = SPR.slice(y * W, y * W + W);
          for (let x = 0; x < W; x++) { const sx = x - (y === row ? sh : sh >> 1); SPR[y * W + x] = sx >= 0 && sx < W ? tmp[sx] : 0; }
        }
      }
    }

    function frame(t, mood, since) {
      const u = t / LOOP, age = ((t - since) % LOOP + LOOP) % LOOP;
      buf.set(BG);
      for (const [x, y, k] of STARS) if (Math.sin(TAU * k * u + x) > 0.3) put(buf, x, y, C('#e8e4ff'));
      // Mist through the valley.
      for (let y = 40; y < 50; y++) for (let x = DX0; x < DX1; x++) {
        const n = PixelKit.noiseLoop(x / 9 + 6 * u * 4, y >> 1, 24) - 0.35 - Math.abs(y - 45) / 12;
        if (n > bay(x, y) * 0.5) blend(buf, y * W + x, C('#9a94c8'), 0.3);
      }
      // Lanterns in the top corners, swaying and flickering.
      for (const [lx, p] of [[4, 0], [58, 2.1]]) {
        const sw = Math.round(Math.sin(TAU * 12 * u + p)), fl = 0.8 + 0.2 * Math.sin(TAU * 83 * u + p * 3) * Math.sin(TAU * 29 * u + p);
        put(buf, lx, 7, C('#1a1010')); put(buf, lx + sw, 8, C('#1a1010'));
        K.glow(buf, lx + sw, 12, 12, C('#ffb050'), 0.3 * fl);
        for (let y = 9; y <= 15; y++) for (let x = lx + sw - 2; x <= lx + sw + 2; x++) {
          if ((y === 10 || y === 14) && Math.abs(x - lx - sw) === 2) continue;
          const edge = x === lx + sw - 2 || x === lx + sw + 2 || y === 9 || y === 15;
          put(buf, x, y, C(y === 9 || y === 15 ? '#2a1a14' : edge ? '#9a3028' : (y === 12 ? '#e0603a' : fl > 0.85 && x < lx + sw + 1 ? '#ffd08a' : '#ff9a50')));
        }
      }
      for (const p of PETALS) {
        const v = frac(p.x0 + p.k * u), x = W + 4 - v * (W + 8), y = p.y0 + v * 20 + 2 * Math.sin(TAU * p.ky * u + p.p);
        put(buf, x, y, C(Math.sin(TAU * p.ky * 3 * u + p.p) > 0 ? '#ffc8d8' : '#e890b0'));
      }
      const flick = Math.sin(TAU * 97 * u) > 0.96 ? 0.6 : 1;
      cone(u, flick);
      pad(u);

      // Breathing, and each mood's pose.
      const breath = Math.sin(TAU * 20 * u) > 0.35 ? 1 : 0;
      let ox = 0, head = breath, bod = 0, look = 0, lift = 0;
      const fistL = { x: CX - 12, y: 53, p: P_HANDL }, fistR = { x: CX + 12, y: 53, p: P_HANDR };
      let hands = [fistL, fistR];
      if (mood === 'stern') {
        const g = frac(5 * u + 0.2);                                   // inspection glance every 12 s
        look = g > 0.3 && g < 0.36 ? -1 : g > 0.38 && g < 0.44 ? 1 : 0;
        lift = frac(8 * u + 0.6) < 0.025 ? 1 : 0;                       // moustache twitch
      } else if (mood === 'barking') {
        ox = Math.sin(TAU * 600 * u) > 0.6 ? 1 : 0;                     // shaking with volume
        head += Math.sin(TAU * 60 * u) > 0.5 ? 1 : 0;                   // bark, bark
      } else if (mood === 'proud') {
        head = Math.min(head, 0); bod = 0;
        hands = [{ x: CX - 15, y: 17, rx: 4, ry: 2.3, p: P_HANDL, head: true, arm: [CX - 19, 25], sh: [CX - 12, 41] }, fistR];   // salute
      } else if (mood === 'doubtful') {
        hands = [fistL, { x: CX + 8, y: 39, rx: 3.6, ry: 3, p: P_HANDR, head: true }];     // hand on chin
        if (age < 0.25) head += 1;
      }
      body(ox, { head, body: bod }, hands);

      const hx = CX + ox, hy = 27 + head;
      // Face.
      sp(hx - 10, hy - 6, BODY[0]); sp(hx - 9, hy - 6, BODY[0]); sp(hx - 10, hy - 5, BODY[0]);
      for (let x = hx - 11; x <= hx + 11; x++) if (PART[(hy - 8) * W + x] === P_HEAD) blend(SPR, (hy - 8) * W + x, CAP[3], 0.55); // visor shadow
      const blink = frac(13 * u + 0.3) < 0.03;
      if (mood === 'stern') {
        eyes(hx, hy, blink ? 'blink' : 'narrow', look); brows(hx, hy, 'stern'); moustache(hx, hy, lift, false);
        for (let x = hx - 2; x <= hx + 2; x++) sp(x, hy + 7, MOUTH);
      } else if (mood === 'barking') {
        eyes(hx, hy, blink ? 'blink' : 'wide', 0); brows(hx, hy, 'angry');
        for (let y = hy + 5; y <= hy + 10; y++) for (let x = hx - 3; x <= hx + 3; x++) {
          const corner = (y === hy + 10) && (x === hx - 3 || x === hx + 3);
          if (!corner) sp(x, y, y === hy + 5 ? TEETH : y >= hy + 9 && Math.abs(x - hx) < 2 ? TONGUE : MOUTH);
        }
        moustache(hx, hy, 1, false);
        shoutLines(hx, hy, Math.sin(TAU * 60 * u) > -0.2);
      } else if (mood === 'proud') {
        eyes(hx, hy, blink ? 'blink' : 'closed', 0); brows(hx, hy, 'proud'); moustache(hx, hy, 0, false);
        sp(hx - 3, hy + 6, MOUTH); for (let x = hx - 2; x <= hx + 2; x++) sp(x, hy + 7, MOUTH); sp(hx + 3, hy + 6, MOUTH);
        for (const bx of [hx - 10, hx + 8]) { blend(SPR, (hy + 1) * W + bx, BLUSH, 0.6); blend(SPR, (hy + 1) * W + bx + 1, BLUSH, 0.6); }
      } else {
        eyes(hx, hy, blink ? 'blink' : 'squint', 0); brows(hx, hy, 'doubt'); moustache(hx, hy, 0, true);
        sp(hx - 1, hy + 7, MOUTH); sp(hx, hy + 7, MOUTH); sp(hx + 1, hy + 6, MOUTH);
      }
      // Cap badge: a chevron, with a glint sweeping across in the proud mood.
      const bx = hx, by = hy - 13;
      sp(bx - 2, by, HOLO_HI); sp(bx - 1, by + 1, HOLO_HI); sp(bx, by + 2, HOLO_HI); sp(bx + 1, by + 1, HOLO_HI); sp(bx + 2, by, HOLO_HI);
      sp(bx - 2, by - 1, BODY[1]); sp(bx - 1, by, BODY[1]); sp(bx, by + 1, BODY[1]); sp(bx + 1, by, BODY[1]); sp(bx + 2, by - 1, BODY[1]);
      // Whistle cord and mouthpiece hole.
      const cy0 = hy + 13;
      for (let i = 0; i <= 4; i++) { sp(hx - 7 + i, cy0 + 2 + (i >> 1), CAP[4]); sp(hx + 7 - i, cy0 + 2 + (i >> 1), CAP[4]); }
      sp(hx - 3, cy0 + 5, CAP[4]); sp(hx + 3, cy0 + 5, CAP[4]);
      sp(hx + 3, cy0 + 7, MOUTH); sp(hx + 2, cy0 + 6, SHINE); sp(hx - 3, cy0 + 6, SHINE);
      // Knuckle lines on the fists.
      for (const h of hands) if (!h.head || mood === 'doubtful') {
        const x = Math.round(h.x + ox), y = Math.round(h.y + (h.head ? head : 0));
        sp(x - 1, y, MATS[1].hard); sp(x + 1, y, MATS[1].hard);
      }

      scan(u);
      over(buf, SPR);

      if (mood === 'proud') {                                       // a twinkle off the badge
        const s = Math.sin(TAU * 15 * u);
        if (s > 0.5) { put(buf, hx + 5, by - 3, SPARK); if (s > 0.8) { put(buf, hx + 4, by - 3, SPARK); put(buf, hx + 6, by - 3, SPARK); put(buf, hx + 5, by - 4, SPARK); put(buf, hx + 5, by - 2, SPARK); } }
      }
      if (mood === 'doubtful' && age > 0.3) {                         // "..." thinking dots
        const n = Math.floor(frac(15 * u) * 4);
        for (let i = 0; i < Math.min(3, n); i++) { put(buf, hx + 14 + i * 2, hy - 15, HOLO_HI); put(buf, hx + 14 + i * 2, hy - 16, LINE); put(buf, hx + 14 + i * 2, hy - 14, LINE); }
      }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'stern', (state && state.since) || 0);
    };
  },
});
