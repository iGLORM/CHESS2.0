// Captain Capture, Master of Challenges: a live character portrait.
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the game HUD and dialogue bubbles. A green hologram of a knight in a
// captain's coat, projected from a pad in the Training Camp at dusk: a pirate bicorne
// with a skull badge, an eyepatch, a flowing mane, a cutlass in one hand, the other on
// his hip. Moods: jolly (default), laughing, impressed, fierce.
// Idle: breathes, blinks, the mane sways, and he snorts little puffs from his nostril;
// the hologram scans, drifts scanlines and glitches a row now and then.
LiveScenes.register({
  id: 'char_captaincapture',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['jolly', 'laughing', 'impressed', 'fierce'],
  frames: { face: [11, 2, 40, 40] },
  moodFor(category) {
    return {
      gameStart: 'jolly', milestone: 'jolly',
      bossCapture: 'laughing', bossCaptureBig: 'laughing', playerLowHealth: 'laughing',
      playerCapture: 'impressed', playerCaptureBig: 'impressed', playerCheck: 'impressed',
      bossCheck: 'fierce', bossTaunt: 'fierce', lowHealth: 'fierce',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, clamp, sq, frac, bay, ramp, hash, blend } = PixelKit;
    const K = PixelKit.surface(W, H), { put, blendAt, over } = K;
    let buf = null;

    // Hologram colours: a mint-green ramp (pale core, deep teal shade) and a darker
    // green-teal ramp for the hat, mane, eyepatch and belt.
    const HOLO = C('#5dffb9'), HOLO_HI = C('#dcfff0'), HOLO_DK = C('#1f9a6b');
    const BODY = ['#e0fff2', '#8ef8cc', '#50e4a6', '#2aa87e', '#1e6a62'].map(C);
    const HAT = ['#62d0a4', '#33967a', '#226a5a', '#194a44', '#12302e'].map(C);
    const LINE = C('#0c2024');

    // ---------- backdrop: a corner of the Training Camp at dusk ----------
    const BG = new Uint32Array(W * H);
    const SKYC = ['#0e1230', '#18204a', '#262e62', '#3e3c78', '#645086', '#9a6690', '#d08a94', '#f2b49a'].map(C);
    const WOOD = ['#8a5a34', '#5e3a24', '#3e2418', '#24140e'].map(C);
    const PAPER = ['#fff0c8', '#f4d8a4', '#d8b088', '#a8806a'].map(C);
    const DX0 = 11, DX1 = 51, DY0 = 7, DY1 = 52;          // the open doorway
    const PAPERM = new Uint8Array(W * H);                  // flat-lit paper: no dithered glow on it
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - 28, (y - 50) * 1.4);
      BG[y * W + x] = ramp(SKYC, (y - DY0) / 46 + 0.16 * Math.exp(-sq(d / 22)), x, y);
    }
    // Moon on the right, peaks, and a cherry tree in bloom on the left.
    for (let y = 6; y < 22; y++) for (let x = 36; x < 50; x++) {
      const d = Math.hypot(x - 44, y - 13);
      if (d < 2.6) put(BG, x, y, C(d < 1.8 ? '#f4f0ff' : '#c8c4f0'));
      else if (d < 6 && (6 - d) / 6 * 0.5 > bay(x, y)) blend(BG, y * W + x, C('#6a70b0'), 0.35);
    }
    const PEAKS = [
      { top: x => 35 + 6 * Math.sin(x / 6 + 2) + 3 * Math.sin(x / 2.7), cols: ['#5a5a92', '#6a6498'], rim: '#b0a0d0' },
      { top: x => 43 + 3 * Math.sin(x / 5 + 1), cols: ['#3c4078', '#46487e'], rim: '#8a88c0' },
    ];
    for (const p of PEAKS) {
      const cols = p.cols.map(C), rim = C(p.rim);
      for (let x = DX0; x < DX1; x++) {
        const ty = Math.round(p.top(x));
        for (let y = ty; y < DY1; y++) BG[y * W + x] = y === ty ? rim : ramp(cols, (y - ty) / 8, x, y);
      }
    }
    const BARK = C('#2a1a24');
    for (const [x0, y0, x1, y1] of [[12, 50, 14, 30], [14, 32, 21, 18], [13, 36, 11, 24], [14, 28, 17, 11]])
      for (let s = 0; s <= 1; s += 0.05) { put(BG, x0 + (x1 - x0) * s, y0 + (y1 - y0) * s, BARK); put(BG, x0 + (x1 - x0) * s + 1, y0 + (y1 - y0) * s, BARK); }
    const BL = ['#ffd8e4', '#f4a8c4', '#d0789c', '#8a4a74'].map(C);
    for (const [cx, cy, r] of [[20, 18, 4.5], [15, 13, 3.5], [25, 12, 3], [14, 22, 2.5]])
      K.disc(BG, cx, cy, r, (dx, dy, d) => d > 0.85 && hash(cx + dx, cy + dy) < 0.5 ? 0
        : ramp(BL, 0.15 + d * 0.3 + (dx + dy > 0 ? 0.35 : 0) + (hash(cx + dx >> 1, cy + dy >> 1) - 0.5) * 0.3, cx + dx, cy + dy));
    // Veranda boards, then the room: ceiling beam, lintel, posts, glowing shoji.
    for (let y = DY1 - 3; y < DY1; y++) for (let x = DX0; x < DX1; x++) BG[y * W + x] = ramp(['#6a4a3a', '#4a3028'].map(C), (y - DY1 + 3) / 3, x, y);
    for (let y = 0; y < DY0; y++) for (let x = 0; x < W; x++)
      BG[y * W + x] = ramp(WOOD, y === 3 || y === DY0 - 1 ? 0.25 : 0.72 + (x % 20 < 2 && y < 3 ? -0.3 : 0), x, y);
    for (const [x0, x1] of [[0, DX0 - 2], [DX1 + 2, W]]) for (let y = DY0; y < 56; y++) for (let x = x0; x < x1; x++) {
      const frame = (x - x0) % 9 === 4 || (y - DY0) % 12 === 11;
      const out = x0 === 0 ? 1 - x / x1 : (x - x0) / (W - x0);
      const lt = 0.9 - (y - DY0) / 55 - out * 0.35;
      BG[y * W + x] = frame ? WOOD[2] : PAPER[lt > 0.62 ? 0 : lt > 0.42 ? 1 : lt > 0.22 ? 2 : 3];
      PAPERM[y * W + x] = 1;
    }
    for (const px of [DX0 - 2, DX1]) for (let y = 0; y < 58; y++) for (let x = px; x < px + 2; x++) BG[y * W + x] = WOOD[x === px ? 1 : 3];
    // A hanging scroll with an ink knight on the right-hand shoji.
    for (let y = 18; y <= 42; y++) for (let x = 54; x <= 60; x++) {
      const i = y * W + x, edge = y === 18 || y === 42;
      BG[i] = edge ? WOOD[1] : x === 54 || x === 60 ? C('#2e1c14') : C(y < 30 ? '#f6ecd0' : '#e4d4b0');
    }
    const INK = C('#2a2430');
    ['.xx..', 'xxxx.', 'x.xxx', '..xxx', '.xxx.', '.xxx.', 'xxxxx'].forEach((row, j) =>
      [...row].forEach((ch, i) => { if (ch === 'x') put(BG, 55 + i, 23 + j * 2, INK), put(BG, 55 + i, 24 + j * 2, INK); }));
    put(BG, 59, 39, C('#c83a2a'));
    // Tatami floor in perspective, a lantern pool on the right, darker toward the front.
    const MAT = ['#1c1e26', '#2e2e30', '#4a4634', '#6e6842', '#968c52'].map(C);
    for (let y = 56; y < H; y++) for (let x = 0; x < W; x++) {
      const Z = 220 / (y - 44), X = (x - 31) * Z / 12;
      const seam = frac(Z / 4) < 0.07 * (18 / Z) || frac(X / 7 + (Math.floor(Z / 4) % 2) * 0.5) < 0.05 * (18 / Z);
      let light = 0.45 - (y - 56) / 60 + 0.4 * Math.exp(-sq((x - 54) / 16) - sq((y - 60) / 8));
      light -= 0.25 * clamp((y - 72) / 8);
      BG[y * W + x] = seam ? C(light > 0.45 ? '#3a3c52' : '#20222e') : ramp(MAT, light, x, y);
    }
    for (let x = 0; x < W; x++) for (let y = 54; y < 56; y++) if (x < DX0 || x >= DX1 || y >= DY1) BG[y * W + x] = ramp(WOOD, y === 54 ? 0.1 : 0.6, x, y);
    // Hologram glow behind the head (dithered bands), and a darker, cooler rim.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (PAPERM[y * W + x]) continue;
      const g = Math.exp(-sq(Math.hypot(x - CX, (y - 25) * 0.9) / 20));
      if (g * 0.95 > bay(x, y)) blend(BG, y * W + x, HOLO_DK, 0.34);
      if (g * g * 0.9 > bay(x + 2, y + 1)) blend(BG, y * W + x, HOLO, 0.2);
      const v = sq((x - W / 2) / (W / 2)) * 0.6 + sq((y - H / 2) / (H / 2)) * 0.6;
      if (clamp((v - 0.35) * 1.3) > bay(x, y)) blend(BG, y * W + x, C('#0a0814'), 0.4);
    }

    // ---------- the figure ----------
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H), MATI = new Uint8Array(W * H);
    const MATS = [null,
      { t: BODY, rim: C('#c4ffe4'), soft: C('#40c492'), hard: C('#1a5a50') },
      { t: HAT, rim: C('#86f0c4'), soft: C('#194a44'), hard: C('#0e2826') },
    ];
    const HARD = new Uint8Array(16);
    const LN = Math.hypot(0.55, 0.65, 0.53), LX = -0.55 / LN, LY = -0.65 / LN, LZ = 0.53 / LN;
    function shade(x, y, nx, ny, part, m) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const M = MATS[m], nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * LX + ny * LY + nz * LZ, i = y * W + x;
      SPR[i] = nx > 0.8 && l < 0.25 ? M.rim : M.t[Math.round(clamp(1 - (l * 0.62 + 0.42)) * (M.t.length - 1))];
      PART[i] = part; MATI[i] = m;
    }
    // An ellipse, optionally turned by angle a (radians, clockwise on screen).
    function disc(cx, cy, rx, ry, part, m, a = 0) {
      const ca = Math.cos(a), sa = Math.sin(a), R = Math.max(rx, ry);
      for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
        const dx = x - cx, dy = y - cy, p = (dx * ca + dy * sa) / rx, q = (-dx * sa + dy * ca) / ry;
        if (p * p + q * q > 1) continue;
        shade(x, y, (p * ca - q * sa) * 0.95, (p * sa + q * ca) * 0.95, part, m);
      }
    }
    function outline() {
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        if (!p) { if (PART[i - 1] || PART[i + 1] || PART[i - W] || PART[i + W]) SPR[i] = LINE; continue; }
        let q = -1;
        for (const j of [i - 1, i + 1, i - W, i + W]) if (PART[j] && PART[j] < p && (q < 0 || PART[j] < PART[q])) q = j;
        if (q >= 0) SPR[i] = HARD[p] || MATI[q] !== MATI[i] ? MATS[MATI[i]].hard : MATS[MATI[i]].soft;
      }
    }

    // Parts, back to front.
    const P_BASE = 1, P_BODY = 2, P_COLLAR = 3, P_MANE = 4, P_HEAD = 5, P_SNOUT = 6, P_HAT = 7, P_BLADE = 8, P_HANDL = 9, P_HANDR = 10;
    HARD[P_SNOUT] = 0; HARD[P_HAT] = HARD[P_BLADE] = HARD[P_HANDL] = HARD[P_HANDR] = 1;
    const MANE = [[40, 17], [42, 22], [43, 27], [42, 32], [41, 37], [39, 41]];

    function body(ox, ho, u, pose) {
      SPR.fill(0); PART.fill(0); MATI.fill(0);
      // Base plinth.
      for (let y = 62; y <= 70; y++) {
        const top = y - 62, hw = 15 - (top < 2 ? 2 - top : 0) - (y === 70 ? 1 : 0);
        for (let x = CX - hw; x <= CX + hw; x++) shade(x + ox, y, (x - CX) / 16, y < 64 ? -0.6 : 0.1, P_BASE, 1);
      }
      // Neck curving down into the coat.
      for (let y = 34; y <= 62; y++) {
        const cx = y < 46 ? 34 - (y - 34) / 12 * 3 : CX;
        const hw = y < 46 ? 7.5 + (y - 34) * 0.12 : 9 + sq((y - 46) / 16) * 4.5 + (y > 58 ? (y - 58) * 0.6 : 0);
        const oy = y < 46 ? ho : 0;
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) shade(x + ox, y + oy, (x - cx) / (hw + 0.5), 0.1, P_BODY, 1);
      }
      disc(CX + ox, 46 + ho, 12, 2.6, P_COLLAR, 1);
      // Mane down the back of the neck, swaying a little.
      MANE.forEach(([mx, my], k) => {
        const sw = Math.round(Math.sin(TAU * 10 * u - k * 0.7) * 0.8);
        disc(mx + ox + sw, my + ho, 3.6, 3.2, P_MANE, 2);
        disc(mx + ox + sw + 3, my + ho + 1, 1.6, 1.4, P_MANE, 2);                 // tufts
      });
      disc(33 + ox, 26 + ho, 10.5, 10.5, P_HEAD, 1);                                // head
      disc(24 + ox, 32 + ho, 8.5, 5.4, P_SNOUT, 1, -0.3);                            // snout, tipped down
      // Pirate bicorne worn athwart, cocked a little.
      const hat = pose.hatLift || 0;
      for (let dx = -17; dx <= 17; dx++) {
        const f = sq(dx / 17), tilt = dx * 0.06;
        const y0 = Math.round(4 + f * 8 - tilt) - hat, y1 = Math.round(16 - f * 3 - tilt) - hat;
        for (let y = y0; y <= y1; y++) shade(32 + dx + ox, y + ho, dx / 18, (y - (y0 + y1) / 2) / Math.max(2, (y1 - y0) / 2) * 0.55, P_HAT, 2);
      }
      // Cutlass and hands.
      if (pose.blade) {
        const [bx0, by0, bx1, by1] = pose.blade;
        // A curved cutlass: widest near the tip, then a point, lit along its left edge.
        for (let s = 0; s <= 1; s += 0.02) {
          const bend = Math.sin(Math.PI * s) * 1.8, x = bx0 + (bx1 - bx0) * s + bend, y = by0 + (by1 - by0) * s;
          const w = s < 0.85 ? 1.2 + s * 1.2 : (1 - s) / 0.15 * 2.2;
          for (let j = -0.5; j <= w; j += 0.5) shade(x + j + ox, y, (j / Math.max(1, w)) * 1.1 - 0.5, -0.2, P_BLADE, 1);
        }
        disc(bx0 + ox, by0 + 1, 3.4, 1.3, P_BLADE, 2);                                  // guard
      }
      for (const h of pose.hands) disc(h.x + ox, h.y + (h.head ? ho : 0), h.rx || 3.8, h.ry || 3.5, h.p, 1);
      outline();
    }

    const EYE = C('#0a1c1a'), SHINE = C('#ffffff'), BROW = HAT[3], MOUTH = C('#0c2826');
    const TONGUE = C('#ff8aa8'), TEETH = C('#f0fff8'), BLUSH = C('#ff9ac8'), SPARK = C('#f0fff8'), GOLD = C('#fff0a0');
    const sp = (x, y, c) => put(SPR, x, y, c);

    // Eyepatch over the far eye, and its strap.
    function eyepatch(hx, hy) {
      for (let y = hy - 5; y <= hy - 2; y++) for (let x = hx - 6; x <= hx - 3; x++) {
        const corner = (y === hy - 5 || y === hy - 2) && (x === hx - 6 || x === hx - 3);
        if (!corner) sp(x, y, y === hy - 5 ? HAT[2] : HAT[4]);
      }
      for (let i = 0; i < 4; i++) { sp(hx - 7 - i, hy - 4 - i, HAT[4]); sp(hx - 2 + i, hy - 6 - (i >> 1), HAT[4]); }
    }
    function eye(hx, hy, kind, look) {
      const ex = hx + 3 + look, ey = hy - 5;
      if (kind === 'blink') { sp(ex, ey + 2, EYE); sp(ex + 1, ey + 2, EYE); return; }
      if (kind === 'closed') { sp(ex - 1, ey + 2, EYE); sp(ex, ey + 1, EYE); sp(ex + 1, ey + 1, EYE); sp(ex + 2, ey + 2, EYE); return; }
      if (kind === 'squint') { for (let x = ex - 1; x <= ex + 1; x++) sp(x, ey + 2, EYE); sp(ex, ey + 1, EYE); sp(ex + 1, ey + 1, EYE); return; }
      const wide = kind === 'wide';
      for (let y = ey - (wide ? 1 : 0); y <= ey + 2; y++) for (let x = ex; x <= ex + (wide ? 2 : 1); x++) sp(x, y, EYE);
      sp(ex, ey - (wide ? 1 : 0), SHINE);
      if (wide) sp(ex + 1, ey + 1, SHINE);
    }
    function brow(hx, hy, kind) {
      const x0 = hx + 2, y = hy - 7;
      const rows = kind === 'high' ? [-2, -3, -3, -2] : kind === 'down' ? [-1, 0, 1, 1] : [-1, -2, -2, -1];
      rows.forEach((d, i) => sp(x0 + i, y + d, BROW));
    }
    // Mouths along the underside of the snout.
    function mouth(hx, hy, kind) {
      const y = hy + 8;
      if (kind === 'grin') {
        sp(hx - 13, y - 1, MOUTH); for (let x = hx - 12; x <= hx - 6; x++) sp(x, y, MOUTH); sp(hx - 5, y - 1, MOUTH);
        for (let x = hx - 11; x <= hx - 7; x++) sp(x, y - 1, TEETH);
      } else if (kind === 'laugh') {
        sp(hx - 13, y - 1, MOUTH);
        for (let yy = y - 1; yy <= y + 2; yy++) for (let x = hx - 12; x <= hx - 5; x++) {
          if (yy === y + 2 && (x === hx - 12 || x === hx - 5)) continue;
          sp(x, yy, yy === y - 1 ? TEETH : yy === y + 2 || (yy === y + 1 && x > hx - 11 && x < hx - 6) ? TONGUE : MOUTH);
        }
      } else if (kind === 'ooh') {
        for (let yy = y - 1; yy <= y + 1; yy++) for (let x = hx - 10; x <= hx - 8; x++) sp(x, yy, MOUTH);
      } else if (kind === 'fierce') {
        for (let x = hx - 13; x <= hx - 5; x++) { sp(x, y, MOUTH); sp(x, y - 1, (x & 1) ? TEETH : MOUTH); }
        sp(hx - 14, y - 2, MOUTH); sp(hx - 4, y - 2, MOUTH);
      }
    }
    // "HA" in a tiny pixel font, for the big laugh.
    const HA = ['x.x..x.', 'x.x.x.x', 'xxx.xxx', 'x.x.x.x', 'x.x.x.x'];
    function ha(x0, y0) {
      HA.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch !== 'x') return;
        put(buf, x0 + i, y0 + j, HOLO_HI);
        for (const [dx, dy] of [[1, 0], [0, 1], [1, 1]]) if (HA[j + dy] === undefined || HA[j + dy][i + dx] !== 'x') {
          const bi = (y0 + j + dy) * W + x0 + i + dx;
          if (bi >= 0 && bi < W * H) blend(buf, bi, LINE, 0.7);
        }
      }));
    }

    // Hologram effects: projector pad, light cone, rising motes, scanlines, glitch.
    const PADY = 73;
    const MOTES = Array.from({ length: 7 }, (_, i) => ({ x: CX - 14 + hash(i, 5) * 28, k: 3 + (i % 3), p: hash(i, 9) }));
    const PETALS = Array.from({ length: 7 }, (_, i) => ({ x0: hash(i, 21), y0: 10 + hash(i, 22) * 40, k: 1 + (i % 2), ky: 5 + i, p: hash(i, 23) * TAU }));
    const STARS = [[30, 10, 11], [36, 18, 17], [28, 22, 13], [48, 22, 19], [25, 9, 23]];
    function cone(u, flick) {
      for (let y = 4; y < PADY; y++) {
        const f = (PADY - y) / (PADY - 4), hw = 15 + f * 9;
        const a = (1 - f) * 0.55 + 0.1;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) {
          const edge = Math.abs(x - CX) / hw > 0.9 ? 0.3 : 0;
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
      for (let i = 0; i < 3; i++) put(buf, CX - 8 + i * 8, PADY + 2, Math.sin(TAU * (6 + i * 5) * u + i * 2) > 0 ? HOLO_HI : HOLO_DK);
    }
    function scan(u) {
      const off = Math.floor(frac(20 * u) * 3);
      const bar = Math.round(PADY - frac(6 * u + 0.4) * 90);
      for (let y = 0; y < H; y++) {
        const dim = (y + off) % 3 === 0, hot = y === bar || y === bar + 1;
        if (!dim && !hot) continue;
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          if (!PART[i]) continue;
          if (hot) blend(SPR, i, HOLO_HI, y === bar ? 0.45 : 0.2); else blend(SPR, i, HOLO_DK, 0.16);
        }
      }
      const g = frac(7 * u + 0.55);
      if (g < 0.014) {
        const row = 10 + Math.floor(hash(Math.floor(7 * u + 0.55), 7) * 56), sh = hash(Math.floor(7 * u + 0.55), 8) > 0.5 ? 2 : -2;
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
      for (let y = 42; y < 51; y++) for (let x = DX0; x < DX1; x++) {
        const n = PixelKit.noiseLoop(x / 9 + 24 * u, y >> 1, 24) - 0.35 - Math.abs(y - 46) / 12;
        if (n > bay(x, y) * 0.5) blend(buf, y * W + x, C('#9a94c8'), 0.3);
      }
      for (const [lx, p] of [[4, 0.7], [58, 2.9]]) {
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
        const v = frac(p.x0 + p.k * u), x = -4 + v * (W + 8), y = p.y0 + v * 22 + 2 * Math.sin(TAU * p.ky * u + p.p);
        put(buf, x, y, C(Math.sin(TAU * p.ky * 3 * u + p.p) > 0 ? '#ffc8d8' : '#e890b0'));
      }
      cone(u, Math.sin(TAU * 97 * u + 1) > 0.96 ? 0.6 : 1);
      pad(u);

      // Breathing, and each mood's pose.
      const breath = Math.sin(TAU * 20 * u) > 0.35 ? 1 : 0;
      let ox = 0, ho = breath, look = 0;
      const hip = { x: CX - 12, y: 54, p: P_HANDL };
      const pose = { hands: [hip, { x: CX + 14, y: 53, p: P_HANDR }], blade: [CX + 14, 50, CX + 18, 29] };
      if (mood === 'laughing') {
        ho = -Math.round(Math.max(0, Math.sin(TAU * 90 * u)) * 1.4);                 // ho ho ho
      } else if (mood === 'impressed') {
        pose.hands = [{ x: CX - 13, y: 13, rx: 3.4, ry: 3, p: P_HANDL, head: true }, pose.hands[1]];   // tips his hat
        pose.hatLift = 1;
        if (age < 0.3) ho -= 1;
      } else if (mood === 'fierce') {
        pose.hands = [hip, { x: CX + 15, y: 43, p: P_HANDR }];
        pose.blade = [CX + 15, 40, CX + 21, 12];
        ox = age < 0.25 ? -1 : 0;                                                     // lunges in
      } else {
        const g = frac(4 * u + 0.1);
        look = g > 0.5 && g < 0.56 ? -1 : 0;                                          // a sly glance
      }
      body(ox, ho, u, pose);

      const hx = 33 + ox, hy = 26 + ho;
      sp(hx - 4, hy - 8, BODY[0]); sp(hx - 3, hy - 8, BODY[0]);                        // shine under the hat
      sp(hx - 14, hy + 3, BODY[0]);                                                     // snout shine
      sp(hx - 13, hy + 5, MOUTH); sp(hx - 12, hy + 5, MOUTH);                           // nostril
      eyepatch(hx, hy);
      const blink = frac(14 * u + 0.6) < 0.03;
      if (mood === 'jolly') { eye(hx, hy, blink ? 'blink' : 'dot', look); brow(hx, hy, 'arch'); mouth(hx, hy, 'grin'); }
      else if (mood === 'laughing') { eye(hx, hy, 'closed', 0); brow(hx, hy, 'high'); mouth(hx, hy, 'laugh'); }
      else if (mood === 'impressed') { eye(hx, hy, blink ? 'blink' : 'wide', 0); brow(hx, hy, 'high'); mouth(hx, hy, 'ooh'); }
      else { eye(hx, hy, 'squint', 0); brow(hx, hy, 'down'); mouth(hx, hy, 'fierce'); }
      if (mood !== 'fierce') for (let i = 0; i < 2; i++) blend(SPR, (hy + 3) * W + hx + 5 + i, BLUSH, 0.6);
      // Hat trim, skull badge, coat buttons and belt.
      const hl = pose.hatLift || 0;
      for (let dx = -16; dx <= 16; dx++) {
        const x = 32 + dx + ox, y = Math.round(4 + sq(dx / 17) * 8 - dx * 0.06) - hl + ho;
        if (PART[(y) * W + x] === P_HAT) sp(x, y, GOLD);
      }
      const kx = 32 + ox, ky = 8 - hl + ho;
      ['.xxx.', 'x.x.x', '.xxx.', 'x.x.x'].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'x') sp(kx - 2 + i, ky + j, j === 3 ? HAT[0] : TEETH); }));
      for (const [bx, by] of [[CX - 3, 50], [CX + 3, 50], [CX - 3, 54], [CX + 3, 54]]) { sp(bx + ox, by, GOLD); sp(bx + ox, by + 1, HAT[2]); }
      for (let x = CX - 10; x <= CX + 10; x++) if (PART[58 * W + x + ox] === P_BODY) { sp(x + ox, 58, HAT[2]); sp(x + ox, 59, HAT[3]); }
      sp(CX + ox, 58, GOLD); sp(CX + 1 + ox, 58, GOLD); sp(CX + ox, 59, GOLD); sp(CX + 1 + ox, 59, GOLD);

      scan(u);
      over(buf, SPR);

      // Snorts: two puffs from the nostril every 6 s (twice as often when fierce).
      const sv = frac((mood === 'fierce' ? 20 : 10) * u + 0.3);
      if (sv < 0.12) {
        const a = sv / 0.12;
        for (const [dy, s] of [[-1, 1], [2, 0.7]]) {
          const px = hx - 18 - a * 6 * s, py = hy + 5 + dy - a * 3, al = 0.9 * (1 - a);
          if (a < 0.45) put(buf, px, py, HOLO_HI); else blendAt(buf, px, py, HOLO_HI, al);
          for (const [ddx, ddy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) blendAt(buf, px + ddx, py + ddy, HOLO_HI, al * (a > 0.3 ? 0.6 : 0.3));
        }
      }
      if (mood === 'laughing' && Math.sin(TAU * 45 * u) > -0.3) ha(hx - 22, hy - 20);
      if (mood === 'impressed') for (let i = 0; i < 3; i++) {
        const s = Math.sin(TAU * (24 + i * 8) * u + i * 2);
        if (s < 0.3) continue;
        const [x, y] = [[12, 18], [52, 12], [50, 34]][i];
        put(buf, x, y, SPARK);
        if (s > 0.7) { put(buf, x - 1, y, SPARK); put(buf, x + 1, y, SPARK); put(buf, x, y - 1, SPARK); put(buf, x, y + 1, SPARK); }
      }
      if (mood === 'fierce') {                                                         // a glint runs up the blade
        const v = frac(15 * u);
        if (v < 0.4) { const s = v / 0.4; put(buf, CX + 15 + 6 * s + ox + Math.sin(Math.PI * s) * 1.6, 40 - 28 * s, SPARK); }
      }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'jolly', (state && state.since) || 0);
    };
  },
});
