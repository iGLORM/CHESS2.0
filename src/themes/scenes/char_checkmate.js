// Checkmate, The Executioner: a live character portrait.
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the game HUD and dialogue bubbles. A tall king in a dark-red executioner's
// cowl, a bronze crown with a ball on its peak, nothing inside the hood but two glowing red
// eyes. Bony hands hold his hourglass, whose sand runs out every 20 s; then he turns it
// over. Lit from below by the Obsidian Court's lava, cold violet glass light from above.
// Moods: grim (default), amused (cold: narrowed eyes and a thin red grin), wrath (eyes
// flare, embers swirl, the lava behind him flares), shaken (the glass cracks, the sand
// stops, the eyes flicker).
LiveScenes.register({
  id: 'char_checkmate',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['grim', 'amused', 'wrath', 'shaken'],
  frames: { face: [11, 1, 40, 40] },
  moodFor(category) {
    return {
      gameStart: 'grim', bossCapture: 'grim', bossCheck: 'grim', bossTaunt: 'grim', milestone: 'grim', clockLow: 'grim',
      bossCaptureBig: 'amused', playerLowHealth: 'amused', playerCapture: 'amused', playerCheck: 'amused',
      playerCaptureBig: 'wrath', lowHealth: 'wrath',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, clamp, sq, frac, bay, ramp, hash, noiseLoop, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over } = K;
    let buf = null;

    // ---------- backdrop: the Obsidian Court, a lava glow behind the hood ----------
    const BG = new Uint32Array(W * H);
    const GLASS = ['#3a2e4a', '#261e34', '#181224', '#0e0a16', '#07050c'].map(C);
    const HALO = ['#07050c', '#120a16', '#200c1a', '#34101c', '#50161c', '#76201a', '#9e3418', '#c85a1e'].map(C);
    const LAVA_Y = 63, FLOOR = 70;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, slab = Math.floor((x + 3) / 14), edge = (x + 3) % 14 === 0;
      const d = Math.hypot(x - CX, (y - 27) * 0.95);
      const halo = 1.22 * Math.exp(-sq(d / 19)) + 0.25 * Math.exp(-sq((y - LAVA_Y) / 9));
      BG[i] = halo > 0.12 ? ramp(HALO, halo + (hash(slab, 3) - 0.5) * 0.06, x, y)
        : edge ? GLASS[4] : ramp(GLASS, 0.9 - y / 150 + (hash(slab, 3) - 0.5) * 0.15, x, y);
      if (!edge && (x + 3) % 14 === 1 && halo < 0.3 && y > 8 && y < LAVA_Y) BG[i] = C('#4a3a66');   // slab bevels
    }
    // Pillars at the edges: faceted glass, violet above, lava-lit below.
    const PILLARS = [[3, 7], [58, 7]];
    for (const [px, pw] of PILLARS) for (let y = 0; y < LAVA_Y; y++) for (let x = px - pw / 2; x < px + pw / 2; x++) {
      const rel = (x - (px - pw / 2)) / pw, warm = Math.exp(-sq((y - LAVA_Y) / 16));
      let c = rel < 0.2 ? (warm > 0.35 ? C('#c86a3a') : C('#9a7ad0')) : rel > 0.8 ? GLASS[4] : ramp(GLASS, 0.45 + rel * 0.4, x, y);
      if (warm > 0.4 + bay(x, y) * 0.4 && rel >= 0.2 && rel <= 0.8) c = ramp(['#8a3a24', '#5a2a24', '#3a1e22'].map(C), 1 - warm, x, y);
      put(BG, x, y, c);
    }
    // Obsidian floor in front of the lava, tiles fanning out in perspective.
    for (let y = FLOOR; y < H; y++) for (let x = 0; x < W; x++) {
      const tile = (x + Math.round((y - FLOOR) * (x - CX) / 12)) % 12 === 0 || (y - FLOOR) % 5 === 0;
      BG[y * W + x] = tile ? C('#3a2e4a') : ramp(GLASS, 0.45 + (y - FLOOR) / 16, x, y);
    }
    for (let x = 0; x < W; x++) { put(BG, x, FLOOR - 1, C('#8a4a3a')); put(BG, x, FLOOR, C('#2a0e0a')); }

    // ---------- Checkmate ----------
    const MATS = [
      ['#b83a34', '#8a2424', '#6a1a22', '#4a1220', '#2c0c1a'],   // 0 robe and hood
      ['#4a3e62', '#302640', '#201a2e', '#140f20', '#0a0712'],   // 1 obsidian base
      ['#ffd08a', '#e0a060', '#a86a3a', '#6a3a2a', '#3a1e1e'],   // 2 bronze trim, crown, hourglass
      ['#f6ecdc', '#dccab6', '#aa968c', '#6e5a66', '#44344a'],   // 3 bony hands
    ].map(m => m.map(C));
    const RIM = C('#8a78c8'), LINE = C('#140a12'), HANDLINE = C('#4a3450');
    const VOID = [C('#040206'), C('#0a0408'), C('#160810')];
    // Key light from the lava below-left; cool violet rim from the glass above right.
    const LN = Math.hypot(0.4, 0.55, 0.72), LX = -0.4 / LN, LY = 0.55 / LN, LZ = 0.72 / LN;
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H), MAT = new Uint8Array(W * H);

    function shade(x, y, nx, ny, part, mat) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * LX + ny * LY + nz * LZ, T = MATS[mat], i = y * W + x;
      SPR[i] = T[Math.round(clamp(1 - (l * 0.75 + 0.2)) * (T.length - 1))];
      PART[i] = part; MAT[i] = mat;
    }
    function setp(x, y, c, part, mat) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = y * W + x; SPR[i] = c; PART[i] = part; MAT[i] = mat;
    }
    function disc(cx, cy, rx, ry, part, mat) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.95, ny * 0.95, part, mat);
      }
    }
    // The hood's half-width per row: a pointed tip, a dome, then the drape over the shoulders.
    const hoodHW = y => y < 10 ? -1 : Math.max(y < 16 ? (y - 10) * 0.9 : 0, y <= 27 ? 12 * Math.sqrt(Math.max(0, 1 - sq((y - 27) / 13.6))) : 12 + (y - 27) * 0.2 + (y > 38 ? (y - 38) * 0.25 : 0));
    // The face opening: a gothic arch.
    const inVoid = (dx, dy) => dy >= 0 ? sq(dx / 7.2) + sq(dy / 8.2) <= 1 : Math.abs(dx) <= 7.2 * Math.pow(Math.max(0, 1 - (-dy) / 8.8), 0.55);

    // pose: ox, oy offsets, breath, sand {a: angle, f: fraction run, flow: stream on, crack}
    function body(ox, oy, breath, sand) {
      SPR.fill(0); PART.fill(0);
      for (let y = 70; y <= 77; y++) {                                           // obsidian plinth
        const top = y - 70, hw = 15.5 - (top < 2 ? 2 - top : 0) - (y === 77 ? 1 : 0);
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) shade(x + ox, y + oy, (x - CX) / 16.5, y < 72 ? -0.6 : 0.2, 1, 1);
      }
      for (let x = CX - 14; x <= CX + 14; x++) if (PART[(71 + oy) * W + x + ox]) setp(x + ox, 71 + oy, MATS[2][x < CX ? 1 : 2], 1, 1);  // bronze rim
      for (let y = 44; y <= 70; y++) {                                           // robe, flaring to the base
        const hw = 8 + Math.pow((y - 44) / 26, 1.8) * 7;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) {
          const fold = Math.sin((x - CX) * 0.9 + (y - 46) * 0.05) > 0.7 ? 0.25 : 0;     // long folds
          shade(x + ox, y + oy, (x - CX) / (hw + 0.5) * 0.9 + fold * 0.3, 0.35 - fold, 2, 0);
        }
      }
      const bo = oy + breath;
      disc(CX + ox, 44.5 + bo, 9.5, 2, 3, 2);                                    // bronze collar
      for (let y = 10; y <= 47; y++) {                                           // the cowl, a pointed cape tab in front
        const hw = y <= 43 ? hoodHW(y) : (47.5 - y) * 1.6;
        if (hw < 0) continue;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) {
          const fold = y > 31 ? 0.22 * Math.sin((x - CX) * 0.75 + 0.6) * clamp((y - 31) / 8) : 0;   // cloth folds
          const nx = (x - CX) / (hw + 0.5) + fold, ny = y < 27 ? (y - 27) / 14 : 0.25 + (y - 27) / 60;
          shade(x + ox, y + bo, clamp(nx * 0.92, -0.98, 0.98), ny * 0.9, 4, 0);
        }
      }
      // The opening: dark void, the hood's lip lit from below, a shadowed overhang above.
      for (let y = 16; y <= 37; y++) for (let x = 21; x <= 41; x++) {
        const dx = x - CX, dy = y - 27;
        if (inVoid(dx, dy)) setp(x + ox, y + bo, VOID[dy < -3 ? 0 : dy < 4 ? 1 : 2], 4, 0);
        else if (inVoid(dx * 0.86, dy * 0.9) || inVoid(dx * 0.86, (dy - 1) * 0.9)) setp(x + ox, y + bo, dy > 2 ? MATS[0][1] : MATS[0][4], 4, 0);
      }
      // The crown on the peak: four points and a bronze ball on a centre stem.
      // No cross on kings or bishops (AGENTS.md, Art Rules).
      for (let y = 11; y <= 13; y++) for (let x = CX - 5; x <= CX + 5; x++) shade(x + ox, y + bo, (x - CX) / 6, (y - 12) * 0.5, 5, 2);   // crown band
      for (const dx of [-5, -2, 2, 5]) for (let y = Math.abs(dx) > 3 ? 8 : 9; y <= 10; y++) shade(CX + dx + ox, y + bo, dx / 6, -0.4, 5, 2);
      for (let y = 7; y <= 10; y++) shade(CX + ox, y + bo, 0, -0.3, 6, 2);                                  // stem
      disc(CX + ox, 4.5 + bo, 2.3, 2.3, 6, 2);                                                               // the ball
      setp(CX + ox, 12 + bo, C('#ff4444'), 5, 2); setp(CX - 3 + ox, 12 + bo, C('#aa2222'), 5, 2); setp(CX + 3 + ox, 12 + bo, C('#aa2222'), 5, 2);
      // The hourglass, turning about its middle, between the hands.
      const hx = CX + ox, hy = 56 + bo, ca = Math.cos(sand.a), sa = Math.sin(sand.a);
      const surfT = -5.4 * Math.pow(1 - sand.f, 0.8), surfB = 5.6 - 5.2 * sand.f;
      for (let y = hy - 9; y <= hy + 9; y++) for (let x = hx - 9; x <= hx + 9; x++) {
        const dx = x - hx, dy = y - hy, lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca, al = Math.abs(ly), ax = Math.abs(lx);
        let c = 0;
        if (al > 6.2 && al <= 8 && ax <= 5.6) c = MATS[2][al < 6.9 ? 3 : ly * ca > 0 ? 1 : 2];
        else if (al <= 6.2 && ax >= 4.4 && ax <= 5.4) c = MATS[2][lx * ca < 0 ? 2 : 3];
        else if (al <= 6.2) {
          const w = 0.7 + 3.3 * Math.sin(Math.PI / 2 * Math.min(1, al / 4.8));
          if (ax > w + 0.4) continue;
          const sandTop = ly < 0 && ly > surfT - (ax < 1 && sand.f > 0.02 && sand.f < 0.98 ? -0.8 : 0);
          const sandBot = ly > 0 && ly >= surfB - (sand.f > 0.04 ? (1 - ax / 4) * 1.4 : 0);
          const stream = sand.flow && ax < 0.5 && ly > -0.5 && ly < surfB;
          if (sandTop || sandBot || stream) c = C(stream ? '#fff0b0' : lx < -1 ? '#ffe090' : lx < 1.2 ? '#f0c060' : '#c08a3a');
          else if (ax > w - 0.6) c = C(lx < 0 ? '#c8b8f0' : '#6a5a90');
          else c = C(lx < -w + 1.6 ? '#8a7ab0' : '#43345a');
          if (sand.crack) for (const [cxl, cyl] of [[-1, -5], [-1, -4], [0, -3], [0, -2], [1, -1], [-2, -3], [1, 1], [2, 2], [1, 3]]) if (Math.round(lx) === cxl && Math.round(ly) === cyl) c = C('#f4f0ff');
        }
        if (c) setp(x, y, c, 7, 2);
      }
      // Bony hands: a palm outside each post, three long fingers wrapped round it.
      for (const s of [-1, 1]) {
        const part = s < 0 ? 8 : 9, px = CX + s * 8.3 + ox;
        disc(px, 56 + bo, 1.8, 3.1, part, 3);
        for (const fy of [-2, 0, 2]) for (let x = 5; x <= 7; x++) shade(CX + s * x + ox, 56 + bo + fy, s * (x - 5) / 4, fy * 0.15, part, 3);
      }
      // Outline; seams where parts overlap (dark for the hourglass and hands).
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        const n0 = PART[i - 1], n1 = PART[i + 1], n2 = PART[i - W], n3 = PART[i + W];
        if (!p) { if (n0 || n1 || n2 || n3) SPR[i] = LINE; continue; }
        if (MAT[i] === 0 && x >= CX + ox - 1 && (!n1 || !n2) && (x > CX + ox + 3 || !n2)) { SPR[i] = RIM; continue; }  // cold rim, upper right
        const lo = (n0 && n0 < p) || (n1 && n1 < p) || (n2 && n2 < p) || (n3 && n3 < p);
        if (!lo) continue;
        if (p >= 7) SPR[i] = p === 7 ? LINE : HANDLINE;
        else if (p === 4 && y + 0 > 40 + bo) SPR[i] = MATS[0][4];                // hood hem over the collar
        else if (p === 3) SPR[i] = MATS[2][3];
      }
    }

    const RED = C('#ff4444'), CORE = C('#ffc8b0'), HOT = C('#fff4d8'), DIM = C('#aa2222');
    function glowAt(x, y, r, a) {
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        const d = Math.hypot(i, j);
        if (d > 0 && d <= r + 0.3) blendAt(buf, x + i, y + j, RED, a * (1 - d / (r + 1)));
      }
    }
    // Eyes: lists of [dx, dy, kind] per eye (left eye; the right one is mirrored).
    const EYES = {
      grim: [[-1, 0, 1], [0, 0, 2], [1, 0, 1], [1, 1, 1], [-2, -1, 1]],          // narrow slits, angled in
      amused: [[-2, 0, 1], [-1, 0, 2], [0, 0, 2], [1, 0, 1], [1, -1, 1]],        // narrowed, one brow of light cocked
      wrath: [[-3, -2, 1], [-2, -1, 2], [-1, -1, 2], [-2, 0, 1], [-1, 0, 3], [0, 0, 3], [1, 0, 3], [0, 1, 2], [1, 1, 3], [2, 1, 2], [1, 2, 1]],
      shaken: [[0, -1, 1], [-1, 0, 1], [0, 0, 2], [1, 0, 1], [0, 1, 1]],
      blink: [[-1, 0, 4], [0, 0, 4], [1, 0, 4]],
    };
    function eyes(fx, fy, kind, bright, dx2) {
      for (const s of [-1, 1]) {
        const ex = CX + fx + s * 4 + (s > 0 ? dx2 : 0), ey = 26 + fy;
        if (kind !== 'blink') glowAt(ex, ey, kind === 'wrath' ? 4 : 2, (kind === 'wrath' ? 0.6 : 0.4) * bright);
        for (const [dx, dy, k] of EYES[kind]) {
          const c = k === 4 ? DIM : k === 3 ? HOT : k === 2 ? (bright > 0.9 ? HOT : CORE) : bright < 0.6 ? DIM : RED;
          put(buf, ex + dx * -s, ey + dy, c);
        }
      }
    }

    // ---------- backdrop motion ----------
    const EMBERS = Array.from({ length: 16 }, (_, i) => ({ x: hash(i, 1) * W, k: 2 + (i % 4), p: hash(i, 2), w: hash(i, 3) * TAU, ash: i % 3 === 0 }));
    const CHAINS = [[11, 14, 0], [51, 10, 2]];
    const vignette = K.vignette(C('#030206'), 0.45, 0.4);
    function lavaN(xs, ys, P, seed) {
      const j = Math.floor(ys), f = ys - j, s = f * f * (3 - 2 * f);
      return noiseLoop(xs, j + seed, P) * (1 - s) + noiseLoop(xs, j + 1 + seed, P) * s;
    }
    const LAVA = ['#fff0a0', '#ffc040', '#ff7a1a', '#d03a0a', '#7a1a08', '#3a0e08'].map(C);

    function frame(t, mood, since) {
      const u = t / LOOP, age = ((t - since) % LOOP + LOOP) % LOOP;
      buf.set(BG);
      const flare = mood === 'wrath' ? 0.55 + 0.25 * Math.sin(TAU * 60 * u) : mood === 'shaken' ? -0.2 : 0;
      // Lava river behind him, flowing right, crust veins where the noise crosses its bands.
      for (let y = LAVA_Y; y < FLOOR - 1; y++) {
        const d = (y - LAVA_Y) / (FLOOR - LAVA_Y);
        for (let x = 0; x < W; x++) {
          const n = lavaN(x / 11 - 6 * u, y / 2.5, 6, 3) * 0.7 + lavaN(x / 5 - 13 * u, y / 1.5, 13, 31) * 0.3;
          const vein = Math.abs(frac(n * 4) - 0.5) < 0.08;
          buf[y * W + x] = vein ? LAVA[4 + (d > 0.5 ? 1 : 0)] : ramp(LAVA, 0.95 - n * 1.1 + d * 0.3 - flare * 0.2, x, y);
        }
      }
      // The glow behind the hood breathes (and flares in wrath).
      const br = 0.5 + 0.5 * Math.sin(TAU * 4 * u);
      for (let y = 6; y < 50; y += 1) for (let x = 12; x < 50; x++) {
        const d = Math.hypot(x - CX, (y - 27) * 0.95) / 20;
        if (d < 1 && (1 - d) * (0.12 + 0.06 * br + flare * 0.25) > bay(x, y) * 0.5) blend(buf, y * W + x, flare < 0 ? C('#3a1830') : C('#ff6a20'), 0.18 + Math.max(0, flare) * 0.2);
      }
      // Reflections of the lava rippling on the glossy floor.
      for (let y = FLOOR + 1; y < H; y += 2) for (let x = 0; x < W; x++)
        if (Math.sin(x * 0.45 + TAU * 10 * u + y * 1.3) > 0.82) blendAt(buf, x, y, C('#ff9040'), 0.45 - (y - FLOOR) * 0.03);
      // Violet glints sliding down the pillars.
      for (const [k, gx] of [[3, 0], [4, 55]]) { const y = frac(k * u) * 90 - 14; for (let j = 0; j < 5; j++) put(buf, gx, y + j, C(j < 2 ? '#ffffff' : '#c8b0ff')); }
      // Chains from the dark ceiling, swaying.
      for (const [x0, len, p] of CHAINS) {
        const sw = Math.sin(TAU * 5 * u + p);
        for (let j = 0; j < len; j++) if (j % 3 !== 2) put(buf, x0 + sw * j / len * 1.5 + (j % 3 === 1 ? 1 : 0), j, C(j % 3 === 0 ? '#5a4a6a' : '#2a2234'));
      }
      vignette(buf);
      // Embers and ash rising from the lava.
      for (const e of EMBERS) {
        const v = frac(e.k * u + e.p), x = e.x + Math.sin(v * 6 + e.w) * 3 + v * 5, y = LAVA_Y + 2 - v * 66;
        if (e.ash) put(buf, x, y, C('#5a5060'));
        else if (v < 0.7) put(buf, x, y, C(v < 0.2 ? '#ffe080' : v < 0.45 ? '#ff8a2a' : '#a8300a'));
      }

      // ---------- the figure ----------
      const breath = Math.sin(TAU * 15 * u) > 0.3 ? 1 : 0;                         // slow, 4 s breaths
      let ox = 0, oy = 0;
      // Habit: the sand runs 18 s, then he turns the glass over (2 s). Shaken: it stops.
      const v = frac(3 * u + 0.8);
      const sand = { a: 0, f: Math.min(1, v / 0.9), flow: v < 0.9, crack: false };
      if (v >= 0.9) { const q = (v - 0.9) / 0.1; sand.a = Math.PI * q * q * (3 - 2 * q); sand.f = 1; }
      if (mood === 'wrath') { if (age < 0.6) ox = Math.sin(TAU * 900 * u) > 0 ? 1 : -1; }
      if (mood === 'shaken') {
        ox = Math.sin(TAU * 240 * u) > 0.7 ? 1 : 0;                                 // a small, unsteady tremor
        sand.a = 0; sand.f = 0.45; sand.flow = false; sand.crack = true;
      }
      body(ox, oy, breath, sand);
      over(buf, SPR);

      const fx = ox, fy = oy + breath;
      const blink = (mood === 'grim' || mood === 'amused') && frac(7 * u + 0.2) < 0.02;
      const pulse = 0.85 + 0.15 * Math.sin(TAU * 12 * u);
      if (mood === 'grim') eyes(fx, fy, blink ? 'blink' : 'grim', pulse, 0);
      else if (mood === 'amused') {
        eyes(fx, fy, blink ? 'blink' : 'amused', pulse, 0);
        // A thin red crescent of a grin, low in the dark.
        for (const [dx, dy] of [[-3, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 1], [3, 0], [4, -1]]) put(buf, CX + fx + dx, 30 + fy + dy, dx > -1 && dx < 2 ? RED : DIM);
      } else if (mood === 'wrath') {
        for (let y = 16; y <= 37; y++) for (let x = 21; x <= 41; x++) if (inVoid(x - CX, y - 27)) blendAt(buf, x + fx, y + fy, C('#ff2a1a'), 0.14 + 0.06 * Math.sin(TAU * 60 * u));
        eyes(fx, fy, 'wrath', 1, 0);
        // Embers swirl round him.
        for (let k = 0; k < 8; k++) {
          const a = TAU * (6 * u + k / 8), r = 18 + 3 * Math.sin(TAU * 12 * u + k), px = CX + Math.cos(a) * r, py = 34 + Math.sin(a) * r * 0.9 - frac(10 * u + k / 8) * 6;
          put(buf, px, py, C(k % 2 ? '#ffd060' : '#ff6a20'));
        }
      } else {
        // Shaken: one eye wide, the other guttering like a candle, both darting.
        const gut = Math.sin(TAU * 45 * u) + Math.sin(TAU * 71 * u) > 0.4 ? 0.4 : 0.8;
        const dart = Math.sin(TAU * 8 * u) > 0 ? 0 : 1;
        for (const s of [-1, 1]) {
          const ex = CX + fx + s * 4 + dart * (s > 0 ? 1 : 0) - dart, ey = 26 + fy + (s > 0 ? 1 : 0);
          const b = s < 0 ? 0.85 : gut;
          glowAt(ex, ey, 2, 0.35 * b);
          if (s < 0) for (const [dx, dy] of [[0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [2, 0], [0, 1], [1, 1]]) put(buf, ex + dx, ey + dy, dx === 0 && dy === 0 ? HOT : dx === 1 && dy === 0 ? CORE : RED);
          else { put(buf, ex, ey, b > 0.5 ? CORE : RED); put(buf, ex - 1, ey, b > 0.5 ? RED : DIM); }
        }
        // Grains of sand trickling out of the crack.
        for (let k = 0; k < 3; k++) { const q = frac(6 * u + k / 3); put(buf, CX + fx - 1 - q * 2, 52 + fy + q * 20, C('#f0c060')); }
      }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'grim', (state && state.since) || 0);
    };
  },
});
