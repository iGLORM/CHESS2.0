// Joy Stick, Arcade Coach: a live character portrait.
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the game HUD and dialogue bubbles. A pink hologram of a pawn projected
// from a pad in the Training Camp at dusk, with chunky headphones and an arcade stick
// held in both hands: one on the ball-top lever, one over the buttons.
// Moods: hyped (default), focused, highscore, gameover.
// Idle: breathes, blinks, bobs to the beat in the headphones (music notes rise from
// the cups) and waggles the stick; the hologram scans, drifts scanlines and glitches.
LiveScenes.register({
  id: 'char_joystick',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['hyped', 'focused', 'highscore', 'gameover'],
  frames: { face: [11, 6, 40, 40] },
  moodFor(category) {
    return {
      gameStart: 'focused', playerCheck: 'focused', milestone: 'hyped', bossTaunt: 'hyped',
      bossCapture: 'highscore', bossCaptureBig: 'highscore', bossCheck: 'highscore', playerLowHealth: 'highscore',
      playerCapture: 'gameover', playerCaptureBig: 'gameover', lowHealth: 'gameover',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, clamp, sq, frac, bay, ramp, hash, blend } = PixelKit;
    const K = PixelKit.surface(W, H), { put, blendAt, over } = K;
    let buf = null;

    // Hologram colours: a pink ramp (pale core, deep plum shade) and a violet ramp for
    // the headphones and the arcade stick.
    const HOLO = C('#ff6fd8'), HOLO_HI = C('#ffe0f6'), HOLO_DK = C('#a8307f');
    const BODY = ['#ffe6f8', '#ffa4ea', '#fb68d4', '#c8429e', '#86287e'].map(C);
    const DEV = ['#c678e8', '#9050c8', '#6a36a0', '#482676', '#2e1852'].map(C);
    const LINE = C('#2a0c2a');

    // ---------- backdrop: a corner of the Training Camp at dusk ----------
    const BG = new Uint32Array(W * H);
    const SKYC = ['#0e1230', '#18204a', '#262e62', '#3e3c78', '#645086', '#9a6690', '#d08a94', '#f2b49a'].map(C);
    const WOOD = ['#8a5a34', '#5e3a24', '#3e2418', '#24140e'].map(C);
    const PAPER = ['#fff0c8', '#f4d8a4', '#d8b088', '#a8806a'].map(C);
    const DX0 = 11, DX1 = 51, DY0 = 7, DY1 = 52;          // the open doorway
    const PAPERM = new Uint8Array(W * H);                  // flat-lit paper: no dithered glow on it
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - 31, (y - 50) * 1.4);
      BG[y * W + x] = ramp(SKYC, (y - DY0) / 46 + 0.16 * Math.exp(-sq(d / 22)), x, y);
    }
    // Crescent moon, peaks, the pagoda on the far ridge.
    for (let y = 6; y < 22; y++) for (let x = 38; x < 52; x++) {
      const d = Math.hypot(x - 45, y - 13), d2 = Math.hypot(x - 46.5, y - 12);
      if (d < 3 && d2 > 2.4) put(BG, x, y, C(d < 2.2 ? '#f4f0ff' : '#c8c4f0'));
      else if (d < 6.5 && d >= 3 && (6.5 - d) / 6.5 * 0.5 > bay(x, y)) blend(BG, y * W + x, C('#6a70b0'), 0.35);
    }
    const PEAKS = [
      { top: x => 32 + 8 * Math.sin(x / 8 + 4) + 3 * Math.sin(x / 3.3), cols: ['#5a5a92', '#6a6498'], rim: '#b0a0d0' },
      { top: x => 42 + 4 * Math.sin(x / 5) - 5 * Math.exp(-sq((x - 19) / 5)), cols: ['#3c4078', '#46487e'], rim: '#8a88c0' },
    ];
    for (const p of PEAKS) {
      const cols = p.cols.map(C), rim = C(p.rim);
      for (let x = DX0; x < DX1; x++) {
        const ty = Math.round(p.top(x));
        for (let y = ty; y < DY1; y++) BG[y * W + x] = y === ty ? rim : ramp(cols, (y - ty) / 8, x, y);
      }
    }
    const pgx = 19, pgy = Math.round(PEAKS[1].top(19));
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
      const out = x0 === 0 ? 1 - x / x1 : (x - x0) / (W - x0);
      const lt = 0.9 - (y - DY0) / 55 - out * 0.35;
      BG[y * W + x] = frame ? WOOD[2] : PAPER[lt > 0.62 ? 0 : lt > 0.42 ? 1 : lt > 0.22 ? 2 : 3];
      PAPERM[y * W + x] = 1;
    }
    for (const px of [DX0 - 2, DX1]) for (let y = 0; y < 58; y++) for (let x = px; x < px + 2; x++) BG[y * W + x] = WOOD[x === px ? 1 : 3];
    // Tatami floor in perspective, lantern pools both sides, darker toward the front.
    const MAT = ['#1c1e26', '#2e2e30', '#4a4634', '#6e6842', '#968c52'].map(C);
    for (let y = 56; y < H; y++) for (let x = 0; x < W; x++) {
      const Z = 220 / (y - 44), X = (x - 31) * Z / 12;
      const seam = frac(Z / 4) < 0.07 * (18 / Z) || frac(X / 7 + (Math.floor(Z / 4) % 2) * 0.5) < 0.05 * (18 / Z);
      let light = 0.42 - (y - 56) / 60 + 0.35 * (Math.exp(-sq((x - 6) / 12) - sq((y - 60) / 7)) + Math.exp(-sq((x - 56) / 12) - sq((y - 60) / 7)));
      light -= 0.25 * clamp((y - 72) / 8);
      BG[y * W + x] = seam ? C(light > 0.45 ? '#3a3c52' : '#20222e') : ramp(MAT, light, x, y);
    }
    for (let x = 0; x < W; x++) for (let y = 54; y < 56; y++) if (x < DX0 || x >= DX1 || y >= DY1) BG[y * W + x] = ramp(WOOD, y === 54 ? 0.1 : 0.6, x, y);
    // A second, far projector at the back right (its little cyan pawn is drawn per frame).
    for (let x = 51; x <= 59; x++) { put(BG, x, 62, C('#3a4050')); put(BG, x, 63, C('#1e222e')); }
    // Hologram glow behind the head (dithered bands), and a darker, cooler rim.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (PAPERM[y * W + x]) continue;
      const g = Math.exp(-sq(Math.hypot(x - CX, (y - 27) * 0.9) / 20));
      if (g * 0.95 > bay(x, y)) blend(BG, y * W + x, HOLO_DK, 0.34);
      if (g * g * 0.9 > bay(x + 2, y + 1)) blend(BG, y * W + x, HOLO, 0.2);
      const v = sq((x - W / 2) / (W / 2)) * 0.6 + sq((y - H / 2) / (H / 2)) * 0.6;
      if (clamp((v - 0.35) * 1.3) > bay(x, y)) blend(BG, y * W + x, C('#0a0814'), 0.4);
    }

    // ---------- the figure ----------
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H), MATI = new Uint8Array(W * H);
    const MATS = [null,
      { t: BODY, rim: C('#ffd4f4'), soft: C('#e05cbc'), hard: C('#7a2272') },
      { t: DEV, rim: C('#e0a8ff'), soft: C('#482676'), hard: C('#241040') },
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
    function disc(cx, cy, rx, ry, part, m) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.95, ny * 0.95, part, m);
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
    const BOXY = 51;
    const P_BASE = 1, P_SKIRT = 2, P_COLLAR = 3, P_BAND = 4, P_HEAD = 5, P_CUPS = 6, P_BOX = 7, P_STICK = 8, P_HANDL = 9, P_BALL = 10, P_HANDR = 11;
    HARD[P_CUPS] = HARD[P_BOX] = HARD[P_STICK] = HARD[P_HANDL] = HARD[P_BALL] = HARD[P_HANDR] = 1;

    function body(ox, ho, pose) {
      SPR.fill(0); PART.fill(0); MATI.fill(0);
      for (let y = 63; y <= 70; y++) {
        const top = y - 63, hw = 14 - (top < 2 ? 2 - top : 0) - (y === 70 ? 1 : 0);
        for (let x = CX - hw; x <= CX + hw; x++) shade(x + ox, y, (x - CX) / 15, y < 65 ? -0.6 : 0.1, P_BASE, 1);
      }
      for (let y = 41; y <= 63; y++) {
        const hw = 5.5 + Math.pow((y - 41) / 22, 1.8) * 9.5;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) shade(x + ox, y, (x - CX) / (hw + 0.5), 0.12, P_SKIRT, 1);
      }
      disc(CX + ox, 40 + ho, 10, 2.8, P_COLLAR, 1);
      // Headphone band over the top of the head.
      const hx = CX + ox, hy = 26 + ho, tilt = pose.tilt || 0;
      for (let y = hy - 16; y <= hy; y++) for (let x = hx - 15; x <= hx + 15; x++) {
        const d = Math.hypot(x - hx, y - hy);
        if (d >= 12 && d <= 14.2) shade(x, y + (x > hx ? tilt : 0), (x - hx) / 15, (y - hy) / 15, P_BAND, 2);
      }
      disc(hx, hy, 11, 11, P_HEAD, 1);
      disc(hx - 12, hy + 1, 3.6, 5, P_CUPS, 2);
      disc(hx + 12, hy + 1 + tilt, 3.6, 5, P_CUPS, 2);
      // The arcade stick: a box with a lit top, a lever with a ball.
      const by = BOXY + pose.boxY;
      for (let y = by; y <= by + 6; y++) for (let x = CX - 12 + (y === by ? 1 : 0); x <= CX + 12 - (y === by ? 1 : 0); x++) {
        const topFace = y < by + 3;
        shade(x + ox, y, (x - CX) / 13 * (topFace ? 0.3 : 1), topFace ? -0.8 : 0.3, P_BOX, 2);
      }
      const sx = CX - 6 + ox + pose.lever;
      for (let y = by - 7; y <= by; y++) shade(Math.round(CX - 6 + ox + pose.lever * (by - y) / 7), y, 0.2, 0, P_STICK, 2);
      disc(sx, by - 8, 2.7, 2.5, P_BALL, 2);
      for (const h of pose.hands) disc(h.x + ox, h.y + (h.box ? pose.boxY : 0), h.rx || 3.6, h.ry || 3.2, h.p, 1);
      outline();
    }

    const EYE = C('#2a0a24'), SHINE = C('#ffffff'), BROW = C('#9a3884'), MOUTH = C('#4a1038');
    const TONGUE = C('#ff4a88'), BLUSH = C('#ff5ab0'), SPARK = C('#fff4fc'), STAR = C('#fff2a0');
    const BTN = [C('#ffffff'), C('#ffa4ea'), C('#b8f4ff')];
    const sp = (x, y, c) => put(SPR, x, y, c);

    function eyes(hx, hy, kind) {
      for (const s of [-1, 1]) {
        const ex = s < 0 ? hx - 5 : hx + 3, ey = hy;
        if (kind === 'blink') { sp(ex, ey + 2, EYE); sp(ex + 1, ey + 2, EYE); continue; }
        if (kind === 'x') {                                          // game over: X X
          for (let i = 0; i < 3; i++) { sp(ex - 1 + i, ey + i, EYE); sp(ex + 1 - i, ey + i, EYE); }
          continue;
        }
        if (kind === 'star') {                                       // high score: stars
          const cx = ex + (s < 0 ? 0 : 1);
          sp(cx, ey - 1, STAR); sp(cx, ey, STAR); sp(cx - 1, ey + 1, STAR); sp(cx, ey + 1, SHINE); sp(cx + 1, ey + 1, STAR);
          sp(cx - 2, ey + 1, STAR); sp(cx + 2, ey + 1, STAR); sp(cx, ey + 2, STAR); sp(cx - 1, ey + 3, STAR); sp(cx + 1, ey + 3, STAR);
          for (const [dx, dy] of [[-1, -1], [1, -1], [-2, 0], [2, 0], [-3, 1], [3, 1], [-2, 2], [2, 2], [-2, 3], [0, 3], [2, 3], [-1, 4], [1, 4]]) sp(cx + dx, ey + dy, EYE);
          continue;
        }
        if (kind === 'focus') {                                      // narrowed and locked on
          for (let y = ey + 1; y <= ey + 2; y++) for (let x = ex; x <= ex + 1; x++) sp(x, y, EYE);
          sp(ex + (s < 0 ? 1 : 0), ey + 1, SHINE);
          continue;
        }
        for (let y = ey; y <= ey + 2; y++) for (let x = ex; x <= ex + 1; x++) sp(x, y, EYE);
        sp(ex, ey, SHINE);
      }
    }
    function note(x, y, c) {                                         // a quaver: stem, flag, head
      for (let j = 0; j < 4; j++) put(buf, x + 1, y + j, c);
      put(buf, x + 2, y, c); put(buf, x + 3, y + 1, c);
      put(buf, x, y + 3, c); put(buf, x, y + 4, c); put(buf, x + 1, y + 4, c);
    }

    // Hologram effects: projector pad, light cone, rising motes, scanlines, glitch.
    const PADY = 73;
    const MOTES = Array.from({ length: 7 }, (_, i) => ({ x: CX - 14 + hash(i, 15) * 28, k: 3 + (i % 3), p: hash(i, 19) }));
    const PETALS = Array.from({ length: 4 }, (_, i) => ({ x0: hash(i, 31), y0: 12 + hash(i, 32) * 30, k: 1 + (i % 2), ky: 5 + i, p: hash(i, 33) * TAU }));
    const STARS = [[16, 10, 11], [26, 13, 17], [34, 9, 13], [30, 20, 19], [22, 22, 23]];
    const FAR = ['.xx.', 'xxxx', '.xx.', '.xx.', 'xxxx'];         // the far projector's little pawn
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
    function scan(u, broken) {
      const off = Math.floor(frac(20 * u) * 3);
      const bar = Math.round(PADY - frac(6 * u + 0.7) * 90);
      for (let y = 0; y < H; y++) {
        const dim = (y + off) % 3 === 0, hot = y === bar || y === bar + 1;
        if (!dim && !hot) continue;
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          if (!PART[i]) continue;
          if (hot) blend(SPR, i, HOLO_HI, y === bar ? 0.45 : 0.2); else blend(SPR, i, HOLO_DK, broken ? 0.3 : 0.16);
        }
      }
      // A one-row glitch now and then (often, when the game is over).
      const kk = broken ? 60 : 7, g = frac(kk * u + 0.8);
      if (g < (broken ? 0.12 : 0.014)) {
        const n = Math.floor(kk * u + 0.8), row = 10 + Math.floor(hash(n, 11) * 56), sh = hash(n, 12) > 0.5 ? 2 : -2;
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
      for (let y = 40; y < 50; y++) for (let x = DX0; x < DX1; x++) {
        const n = PixelKit.noiseLoop(x / 9 - 24 * u, (y >> 1) + 5, 24) - 0.35 - Math.abs(y - 45) / 12;
        if (n > bay(x, y) * 0.5) blend(buf, y * W + x, C('#9a94c8'), 0.3);
      }
      for (const [lx, p] of [[4, 1.4], [58, 0.3]]) {
        const sw = Math.round(Math.sin(TAU * 12 * u + p)), fl = 0.8 + 0.2 * Math.sin(TAU * 83 * u + p * 3) * Math.sin(TAU * 29 * u + p);
        put(buf, lx, 7, C('#1a1010')); put(buf, lx + sw, 8, C('#1a1010'));
        K.glow(buf, lx + sw, 12, 12, C('#ffb050'), 0.3 * fl);
        for (let y = 9; y <= 15; y++) for (let x = lx + sw - 2; x <= lx + sw + 2; x++) {
          if ((y === 10 || y === 14) && Math.abs(x - lx - sw) === 2) continue;
          const edge = x === lx + sw - 2 || x === lx + sw + 2 || y === 9 || y === 15;
          put(buf, x, y, C(y === 9 || y === 15 ? '#2a1a14' : edge ? '#9a3028' : (y === 12 ? '#e0603a' : fl > 0.85 && x < lx + sw + 1 ? '#ffd08a' : '#ff9a50')));
        }
      }
      // The far projector's small cyan pawn, turning and flickering.
      const wv = Math.max(0.3, Math.abs(Math.cos(TAU * 6 * u))), fflk = Math.sin(TAU * 71 * u) > 0.9 ? 0.3 : 0.75;
      FAR.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch === 'x') for (let r = 0; r < 2; r++) blendAt(buf, 55 + (i - 1.5) * wv * 1.5, 52 + j * 2 + r, C(r ? '#2aa8e0' : '#6fe3ff'), fflk);
      }));
      for (let x = 53; x <= 57; x++) put(buf, x, 61, C('#6fe3ff'));
      for (const p of PETALS) {
        const v = frac(p.x0 + p.k * u), x = W + 4 - v * (W + 8), y = p.y0 + v * 20 + 2 * Math.sin(TAU * p.ky * u + p.p);
        put(buf, x, y, C(Math.sin(TAU * p.ky * 3 * u + p.p) > 0 ? '#ffc8d8' : '#e890b0'));
      }
      const broken = mood === 'gameover';
      cone(u, broken ? (Math.sin(TAU * 180 * u) > 0.2 ? 0.5 : 1) : Math.sin(TAU * 97 * u + 2) > 0.96 ? 0.6 : 1);
      pad(u);

      // Breathing, the beat (2 per second), and each mood's pose.
      const breath = Math.sin(TAU * 20 * u) > 0.35 ? 1 : 0, beat = Math.sin(TAU * 120 * u);
      let ox = 0, ho = breath, boxY = 0, lever = 0, tilt = 0, press = -1;
      if (mood === 'hyped') {
        ho = beat > 0.3 ? 1 : 0;                                          // bobbing to the music
        lever = Math.round(Math.sin(TAU * 30 * u) * 1.4);
        press = Math.sin(TAU * 60 * u) > 0.6 ? Math.floor(frac(5 * u) * 3) : -1;
      } else if (mood === 'focused') {
        lever = Math.sin(TAU * 240 * u) > 0 ? 2 : -1;                     // wiggling hard
        press = Math.floor(frac(90 * u) * 3);                             // mashing
        ox = Math.sin(TAU * 480 * u) > 0.7 ? 1 : 0;
      } else if (mood === 'highscore') {
        const hop = Math.round(Math.max(0, Math.sin(TAU * 60 * u)) * 3);
        ho = -hop; boxY = -hop - 2; lever = -2; press = 0;
        if (age < 0.4) { ho -= 2; boxY -= 2; }
      } else {
        ho = 2; boxY = 2; lever = 2; tilt = 1;                            // slumped, headphones askew
      }
      const hands = [
        { x: CX - 6 + Math.round(lever * 0.3), y: BOXY - 1, p: P_HANDL, box: true, rx: 3.4, ry: 2.6 },
        { x: CX + 9, y: BOXY - 2 + (press >= 0 ? 1 : 0), p: P_HANDR, box: true, rx: 3.4, ry: 2.8 },
      ];
      body(ox, ho, { boxY, lever, tilt, hands });

      const hx = CX + ox, hy = 26 + ho;
      sp(hx - 6, hy - 7, SHINE); sp(hx - 5, hy - 7, SHINE); sp(hx - 6, hy - 6, SHINE);
      // Buttons on the stick (a pressed one goes dark), LEDs on the headphone cups.
      const by = BOXY + boxY;
      for (let i = 0; i < 3; i++) {
        const bx = CX - 1 + i * 3 + ox, down = i === press, byy = by + 1 - (i === 1 ? 1 : 0);
        if (PART[byy * W + bx] !== P_BOX) continue;                          // under the hand
        sp(bx, byy, down ? DEV[3] : BTN[i]); sp(bx + 1, byy, down ? DEV[4] : BTN[i]); sp(bx, byy + 1, DEV[4]); sp(bx + 1, byy + 1, DEV[4]);
      }
      for (let x = CX - 9; x <= CX + 9; x += 2) sp(x + ox, by + 5, frac(x / 19 + 2 * u * 30) < 0.5 ? HOLO : DEV[3]);   // running lights
      for (const [cx, cy] of [[hx - 12, hy + 1], [hx + 12, hy + 1 + tilt]]) {
        const on = broken ? false : beat > 0;
        sp(cx, cy - 1, on ? HOLO_HI : DEV[2]); sp(cx, cy, on ? HOLO : DEV[3]); sp(cx, cy + 1, on ? HOLO_HI : DEV[2]);
      }
      const blink = (mood === 'hyped' || mood === 'focused') && frac(16 * u + 0.45) < 0.03;
      if (mood === 'hyped') {
        eyes(hx, hy, blink ? 'blink' : 'dot');
        for (let x = hx - 3; x <= hx + 3; x++) sp(x, hy + 6, MOUTH);
        for (let x = hx - 2; x <= hx + 2; x++) sp(x, hy + 7, MOUTH);
        sp(hx - 1, hy + 7, TONGUE); sp(hx, hy + 7, TONGUE); sp(hx - 4, hy + 5, MOUTH); sp(hx + 4, hy + 5, MOUTH);
        for (const bx of [hx - 9, hx + 7]) for (const d of [0, 1]) blend(SPR, (hy + 4) * W + bx + d, BLUSH, 0.6);
      } else if (mood === 'focused') {
        eyes(hx, hy, blink ? 'blink' : 'focus');
        for (let x = hx - 2; x <= hx + 2; x++) sp(x, hy + 6, MOUTH);
        sp(hx + 2, hy + 7, TONGUE); sp(hx + 3, hy + 7, TONGUE); sp(hx + 3, hy + 6, MOUTH);   // tongue out of the corner
        for (let i = 0; i < 4; i++) { sp(hx - 7 + i, hy - 2 + (i >> 1), BROW); sp(hx + 6 - i, hy - 2 + (i >> 1), BROW); }
        sp(hx - 4, hy, BROW); sp(hx + 3, hy, BROW);
      } else if (mood === 'highscore') {
        eyes(hx, hy, 'star');
        for (let y = hy + 5; y <= hy + 8; y++) for (let x = hx - 3; x <= hx + 3; x++) {
          if (y === hy + 8 && Math.abs(x - hx) > 1) continue;
          sp(x, y, y >= hy + 7 && Math.abs(x - hx) < 2 ? TONGUE : MOUTH);
        }
        for (const bx of [hx - 9, hx + 7]) for (const d of [0, 1]) { blend(SPR, (hy + 4) * W + bx + d, BLUSH, 0.8); blend(SPR, (hy + 5) * W + bx + d, BLUSH, 0.5); }
      } else {
        eyes(hx, hy, 'x');
        for (let i = 0; i < 6; i++) sp(hx - 3 + i, hy + 7 - (i & 1), MOUTH);             // wobbly mouth
      }

      scan(u, broken);
      over(buf, SPR);

      // Music notes rising from the headphones, alternating sides.
      if (mood === 'hyped' || mood === 'focused') for (let i = 0; i < 2; i++) {
        const v = frac(15 * u + i * 0.5);
        if (v > 0.7) continue;
        const s = i ? 1 : -1, x = hx + s * (16 + v * 6) - (s < 0 ? 3 : 0), y = hy - 2 - v * 16;
        note(x + Math.round(Math.sin(TAU * v * 2)), y, v < 0.5 ? HOLO_HI : HOLO);
      }
      if (mood === 'highscore') for (let i = 0; i < 6; i++) {                          // confetti sparkles
        const v = frac(20 * u + i / 6), s = Math.sin(TAU * (30 + i * 7) * u + i);
        const x = [8, 54, 12, 50, 6, 56][i], y = [14, 10, 30, 28, 44, 40][i] - Math.round(v * 3);
        if (s < 0.2) continue;
        const c = i % 2 ? STAR : SPARK;
        put(buf, x, y, c);
        if (s > 0.7) { put(buf, x - 1, y, c); put(buf, x + 1, y, c); put(buf, x, y - 1, c); put(buf, x, y + 1, c); }
      }
      if (broken) {                                                                   // a dizzy little swirl
        const a = TAU * 30 * u;
        for (let k = 0; k < 3; k++) put(buf, hx + 13 + Math.round(Math.cos(a + k * TAU / 3) * 3), hy - 14 + Math.round(Math.sin(a + k * TAU / 3) * 1.5), k ? HOLO : HOLO_HI);
      }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'hyped', (state && state.since) || 0);
    };
  },
});
