// The Clockwork Citadel: World 7's local map, where the world-map zoom lands.
//
// 320x200, shown at 4x. CastlE's fortress-city from above at smoggy dusk, the amber sun low
// in the upper left behind a skyline of smokestacks: riveted brass decks over the machine
// depths, where giant gears turn in teal-lit shafts. The trail is a rail track on sleepers
// that crosses the shafts on iron bridges. One landmark per stop:
//   1 Gear Maze          a little maze of brass walls with cogs on its corners
//   2 Tower Clock        a clock tower whose hands sweep and whose bell swings (Chime)
//   3 Wind the Spring    a drum with a coiled mainspring and a great wind-up key turning
//   4 Clockwork Rush     tin soldiers marching up and down a parade deck
//   5 Siege Engine       a rook-shaped steam engine rolling on its rails, puffing
//   6 Loose Cogs         four cogs lying loose on the deck (they spin once cleared)
//   7 The Stopped Clocks a square of clock posts all frozen at the same second, ghost-lit
//   8 the lair           CastlE, the green-bronze fortress rook, in a keep ringed by turning
//                        gear walls; steam hisses from his battlements, his porthole ticks
// Moves: gears in the shafts and walls, the clock, the bell, the key, soldiers, the engine,
// smoke from the stacks, steam vents, an airship and its shadow, teal lights pulsing, sparks,
// CastlE (breathing, ticking, steam; when beaten the walls stop and he stands still).
// State (LiveScenes.setState('map_clockworkcitadel', { map: { cleared, beaten } })): cleared
// stops get a brass pennant; the loose cogs spin once stop 6 is cleared.
LiveScenes.register({
  id: 'map_clockworkcitadel',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  stops: [[38, 132], [78, 100], [112, 136], [150, 96], [188, 134], [222, 94], [256, 132], [280, 90]],
  create() {
    const W = 320, H = 200, N = W * H, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, noise2, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, rect, line, glow } = K;
    const S = LiveScenes.get('map_clockworkcitadel').stops;
    let buf = null;
    const P = h => h.map(C);
    const band = (cols, t, x, y, w = 0.22) => {
      t = clamp(t) * (cols.length - 1);
      const i = t | 0, f = clamp((t - i - 0.5) / w + 0.5);
      return cols[Math.min(cols.length - 1, i + (f > bay(x, y) ? 1 : 0))];
    };

    const BASE = new Uint32Array(N);
    const KIND = new Uint8Array(N);          // 1 deck, 2 track, 3 shaft, 4 built
    const HGT = new Uint8Array(N);

    // ---------- palette ----------
    const SKY = P(['#1a2230', '#26303c', '#3a3e44', '#5a5048', '#8a6a4a', '#c08a4a', '#eaaa5a', '#ffd488']);
    const BRASS = P(['#fff0b0', '#f0c060', '#c08a38', '#8a5a24', '#4e3018']);
    const DECK = P(['#d0a052', '#ac7e3a', '#8a622e', '#6a4824', '#4a321c']);
    const IRON = P(['#8a8a90', '#6a6a70', '#4a4850', '#302e38', '#1e1c24']);
    const COPPER = P(['#f0a070', '#c86a40', '#8a4028']);
    const TEAL = C('#4ae0d0'), TEALD = C('#1e8a88'), TEALL = C('#bff8f0');
    const SOOT = C('#1a1418'), LINE = C('#140e10'), SHAD = C('#1e1420');
    const STEAM = C('#f4ecde');
    const BRONZE = P(['#dce6ac', '#a6c692', '#82a686', '#5a7e6e', '#3a524e']);
    const GEAR_B = ['#fff0b0', '#e0a848', '#8a5a24', '#1a1418'], GEAR_I = ['#c8c8d0', '#8a8a98', '#4a4a58', '#1a1418'];
    const GEAR_D = ['#a08050', '#6a5030', '#3a2a1e', '#0e0c10'], GEAR_DI = ['#6a7a80', '#46505a', '#2a3038', '#0e0c10'];

    // ---------- sky strip: smoggy dusk, the sun low on the left, a skyline of stacks ----------
    const SUN = { x: 70, y: 18 };
    for (let y = 0; y < 44; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - SUN.x, (y - SUN.y) * 1.5);
      BASE[y * W + x] = ramp(SKY, y / 30 + 0.45 * Math.exp(-sq(d / 60)) + (noise2(x / 30, y / 6, 4) - 0.5) * 0.12, x, y);
    }
    K.disc(BASE, SUN.x, SUN.y, 7, (dx, dy, d) => C(d < 0.75 ? '#fff4d0' : '#ffe0a0'));
    const SKYLINE = [];
    for (let i = 0; i < 16; i++) {
      const x = 4 + i * 20 + hash(i, 3) * 10, h = 8 + hash(i, 4) * 12, w = 4 + hash(i, 5) * 7;
      const c = C(mix('#4a3e3e', '#c08a4a', 0.35 + 0.25 * Math.exp(-sq((x - SUN.x) / 60))));
      rect(BASE, x, 30 - h, w, h + 6, c);
      if (i % 3 === 0) { rect(BASE, x + w / 2 - 1, 30 - h - 6, 2, 6, c); SKYLINE.push([x + w / 2, 30 - h - 7]); }
    }

    // ---------- helpers ----------
    function spline(pts) {
      const out = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        const n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 2);
        for (let k = 0; k < n; k++) {
          const s = k / n, s2 = s * s, s3 = s2 * s;
          const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s2 + (-a + 3 * b - 3 * c + d) * s3);
          out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        }
      }
      out.push(pts[pts.length - 1]);
      return out;
    }
    function chamfer(D, I) {
      const pass = (y, x, dx, dy) => {
        const i = y * W + x;
        for (const [ox, oy, c] of [[dx, 0, 1], [0, dy, 1], [dx, dy, 1.414], [-dx, dy, 1.414]]) {
          const xx = x + ox, yy = y + oy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const j = yy * W + xx;
          if (D[j] + c < D[i]) { D[i] = D[j] + c; if (I) I[i] = I[j]; }
        }
      };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) pass(y, x, -1, -1);
      for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) pass(y, x, 1, 1);
    }
    // Raised things in 3/4 view: top face lifted by h, front face, shadow cast down-right.
    function extrude(M, h, topFn, sideFn, shadowLen = h * 1.4) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!M[y * W + x]) continue;
        for (let k = 1; k <= shadowLen; k++) {
          const xx = x + k, yy = y + Math.round(k * 0.35);
          if (xx >= W || yy >= H || M[yy * W + xx]) continue;
          if (HGT[yy * W + xx] < h) blendAt(BASE, xx, yy, SHAD, 0.3);
        }
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!M[i]) continue;
        if (!(y + 1 < H && M[i + W])) for (let j = 0; j < h; j++) { put(BASE, x, y - j, sideFn(x, y - j, j, h)); HGT[Math.max(0, y - j) * W + x] = h; }
        const ty = y - h;
        if (ty >= 0) { BASE[ty * W + x] = topFn(x, ty, i); HGT[ty * W + x] = h; KIND[ty * W + x] = 4; }
      }
    }
    const shadowEllipse = (cx, cy, rx, ry, a) => {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
        if (sq((x - cx) / rx) + sq((y - cy) / ry) <= 1) blendAt(BASE, x, y, SHAD, a);
    };

    // ---------- the trail ----------
    const TRAIL = spline([[-6, 152], [20, 142], S[0], [52, 112], S[1], [100, 108], [102, 128], S[2], [132, 126], [136, 104], S[3],
      [168, 104], [172, 124], S[4], [206, 126], [208, 104], S[5], [240, 104], [240, 124], S[6], [272, 124], [278, 106], S[7]]);
    const DT = new Float32Array(N).fill(999), DI = new Int32Array(N).fill(-1), ARC = new Float32Array(TRAIL.length);
    for (let i = 1; i < TRAIL.length; i++) ARC[i] = ARC[i - 1] + Math.hypot(TRAIL[i][0] - TRAIL[i - 1][0], TRAIL[i][1] - TRAIL[i - 1][1]);
    TRAIL.forEach(([x, y], k) => { const xi = Math.round(x), yi = Math.round(y); if (xi >= 0 && yi >= 0 && xi < W && yi < H) { DT[yi * W + xi] = 0; DI[yi * W + xi] = k; } });
    chamfer(DT, DI);
    const DS = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = i % W, y = (i / W) | 0; let b = 999; for (const [sx, sy] of S) b = Math.min(b, Math.hypot(x - sx, (y - sy) * 1.15)); DS[i] = b; }

    // ---------- the decks and the shafts into the machine depths ----------
    const SHAFTS = [{ x0: 58, y0: 116, x1: 106, y1: 158 }, { x0: 100, y0: 42, x1: 134, y1: 88 }, { x0: 168, y0: 42, x1: 202, y1: 82 },
      { x0: 136, y0: 142, x1: 176, y1: 200 }, { x0: 204, y0: 142, x1: 244, y1: 200 }, { x0: 0, y0: 44, x1: 44, y1: 90 }];
    const inShaft = (x, y) => SHAFTS.find(s => { const r = 5; const dx = Math.max(s.x0 + r - x, 0, x - s.x1 + r), dy = Math.max(s.y0 + r - y, 0, y - s.y1 + r); return dx * dx + dy * dy <= r * r; });
    const DEPTH_GEARS = [];
    const SHAFT_IDX = [];
    for (let y = 28; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, sh = inShaft(x, y);
      if (sh) {
        // Inside a shaft: the far wall's face at the top, then darkness with a teal glow.
        const fromTop = y - Math.max(sh.y0, 28);
        let c;
        if (fromTop < 7) c = band(DECK, 0.55 + fromTop / 10, x, y), c = (fromTop % 3 === 2) ? DECK[4] : c;
        else c = band(P(['#2a2430', '#201a26', '#16121c', '#0e0c12']), (fromTop - 7) / 24 - 0.1 * Math.exp(-sq((x - (sh.x0 + sh.x1) / 2) / 14)), x, y);
        BASE[i] = c; KIND[i] = 3; SHAFT_IDX.push(i);
        continue;
      }
      // Deck plates: big riveted brass panels lit from the upper left, sootier toward the bottom.
      const row = Math.floor((y - 28) / 18), px = x % 30, py = (y - 28) % 18;
      const plate = hash(Math.floor(x / 30), row);
      const lit = 0.3 * Math.exp(-sq((x - SUN.x) / 150) - sq((y - 30) / 90));
      let t = 0.3 - lit + (plate - 0.5) * 0.14 + (x / W) * 0.18 + clamp((y - 60) / 140) * 0.42 + (noise2(x / 20, y / 12, 7) - 0.5) * 0.08;
      let c = band(DECK, t, x, y);
      if (px === 0 || py === 0) c = DECK[4];
      else if (py === 1 || px === 1) c = DECK[Math.max(0, Math.round(clamp(t) * 4) - 1)];
      if ((px === 3 || px === 27) && (py === 3 || py === 15)) c = DECK[4];
      if (px > 1 && py > 1 && (px === 2 || py === 2)) c = DECK[Math.max(0, Math.round(clamp(t) * 4) - 1)];
      if (plate > 0.9) c = px === 0 || py === 0 ? IRON[4] : ((x + y) % 3 === 0 ? IRON[4] : band(IRON, t + 0.15, x, y));   // grating panels
      BASE[i] = c; KIND[i] = 1;
    }
    // A lip round each shaft: a brass rim on the near side, iron railing posts.
    for (let y = 28; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (KIND[i] !== 1) continue;
      const nb = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && KIND[yy * W + xx] === 3;
      if (nb(x, y + 1) || nb(x, y - 1) || nb(x + 1, y) || nb(x - 1, y)) BASE[i] = nb(x, y + 1) ? BRASS[1] : BRASS[3];
    }
    // Gears turning in the depths (drawn per frame, clipped to the shafts).
    SHAFTS.forEach((sh, k) => {
      const cx = (sh.x0 + sh.x1) / 2, cy = (sh.y0 + sh.y1) / 2 + 6, r = Math.min(sh.x1 - sh.x0, sh.y1 - sh.y0) * 0.42;
      DEPTH_GEARS.push({ x: cx - r * 0.3, y: cy, r, n: Math.round(r * 0.7), dir: k % 2 ? 1 : -1, turns: 2, c: k % 2 ? GEAR_D : GEAR_DI, sh });
      DEPTH_GEARS.push({ x: cx + r * 0.75, y: cy - r * 0.6, r: r * 0.5, n: Math.round(r * 0.35), dir: k % 2 ? -1 : 1, turns: 4, c: GEAR_DI, sh });
    });

    // ---------- the rail track, iron bridges over the shafts ----------
    for (let i = 0; i < N; i++) {
      const d = DT[i], x = i % W, y = (i / W) | 0;
      if (d > 4.2 || y < 30) continue;
      const k = DI[i], a = ARC[Math.max(0, k)];
      const over = KIND[i] === 3;
      if (d < 3.4) {
        // Sleepers across, two rails along.
        const sleeper = frac(a / 3) < 0.45;
        let c = over ? (sleeper ? IRON[2] : IRON[3]) : sleeper ? C('#5a3e2a') : C('#2a2026');
        if (Math.abs(d - 1.8) < 0.5) c = d < 1.8 ? IRON[0] : IRON[1];
        if (!sleeper && !over && Math.abs(d - 1.8) >= 0.5 && hash(x, y) > 0.7) c = C('#3a2e2c');
        BASE[i] = c; KIND[i] = 2;
      } else { BASE[i] = over ? IRON[4] : BRASS[4]; KIND[i] = 2; }
    }
    // Bridge girders under the track where it crosses a shaft.
    for (let i = 0; i < N; i++) {
      const x = i % W, y = (i / W) | 0;
      if (KIND[i] !== 3 || DT[i] > 6 || DT[i] < 3.4) continue;
      if (y > 0 && KIND[i - W] === 2) BASE[i] = (x & 1) ? IRON[2] : IRON[3];
    }
    // Turntables at the stops: a round iron plate with a brass rim.
    for (let i = 0; i < N; i++) {
      const d = DS[i], x = i % W, y = (i / W) | 0;
      if (d > 11.5 || y < 30) continue;
      const st = S.reduce((m, p) => Math.hypot(x - p[0], y - p[1]) < Math.hypot(x - m[0], y - m[1]) ? p : m, S[0]);
      BASE[i] = d > 10.5 ? BRASS[4] : d > 9.5 ? BRASS[1] : Math.abs(d - 5) < 0.5 ? IRON[3] : band(IRON, 0.5 + ((x - st[0]) + (y - st[1])) * 0.03, x, y);
      KIND[i] = 2;
    }

    // ---------- objects ----------
    const OBJ = [];
    // Smokestacks: brick-and-iron chimneys in 3/4, a teal-lit window band.
    const STACKS = [];
    function stack(x, y, h, r) {
      shadowEllipse(x + h * 0.5, y + 2, h * 0.5, 2, 0.4);
      for (let j = 0; j < h; j++) for (let dx = -r; dx <= r; dx++) {
        const rel = (dx + r) / (2 * r);
        let c = rel < 0.3 ? COPPER[0] : rel < 0.7 ? COPPER[1] : COPPER[2];
        if (j % 4 === 0) c = rel < 0.3 ? COPPER[1] : C('#5a2a1e');
        if (j > h - 3) c = rel < 0.3 ? IRON[0] : IRON[2];
        put(BASE, x + dx, y - j, c);
      }
      for (let dx = -r; dx <= r; dx++) put(BASE, x + dx, y - h, SOOT);
      put(BASE, x - r - 1, y - h + 1, IRON[1]); put(BASE, x + r + 1, y - h + 1, IRON[3]);
      STACKS.push([x, y - h - 1]);
    }
    for (const [x, y, h, r] of [[16, 112, 20, 3], [58, 50, 18, 3], [150, 60, 22, 3], [214, 60, 16, 2], [300, 150, 20, 3], [236, 140, 14, 2], [120, 176, 16, 2], [14, 188, 18, 3]])
      OBJ.push({ y, f: () => stack(x, y, h, r) });
    // Workshops: brass sheds with copper roofs and teal-lit windows.
    function workshop(x0, y0, w, d, h) {
      shadowEllipse(x0 + w / 2 + h, y0 + d + 2, w / 2 + h * 0.6, 3, 0.4);
      for (let y = y0 + d - h; y < y0 + d; y++) for (let x = x0; x < x0 + w; x++) {
        let c = (y - (y0 + d - h)) % 4 === 3 ? BRASS[4] : x < x0 + 2 ? BRASS[1] : BRASS[2];
        if ((x - x0) % 6 >= 2 && (x - x0) % 6 <= 3 && y > y0 + d - h + 1 && y < y0 + d - 2) c = TEALD;
        put(BASE, x, y, c);
      }
      for (let y = y0; y < y0 + d - h; y++) for (let x = x0 - 1; x <= x0 + w; x++) {
        const ridge = (y - y0) < (d - h) / 2;
        put(BASE, x, y, (x - x0) % 4 === 0 ? COPPER[2] : ridge ? COPPER[0] : COPPER[1]);
      }
      for (let x = x0 - 1; x <= x0 + w; x++) put(BASE, x, y0 + d - h, C('#5a2a1e'));
    }
    OBJ.push({ y: 58, f: () => workshop(206, 38, 34, 20, 8) }, { y: 142, f: () => workshop(284, 118, 34, 24, 9) }, { y: 190, f: () => workshop(30, 166, 28, 24, 9) });
    // Pipes running over the decks, with flanges.
    function pipe(pts, r) {
      const sp = spline(pts);
      for (const [x, y] of sp) {
        blendAt(BASE, x + 2, y + 3, SHAD, 0.08);
      }
      for (const [x, y] of sp) for (let j = -r; j <= r; j++) {
        const c = j < -r * 0.3 ? COPPER[0] : j < r * 0.4 ? COPPER[1] : COPPER[2];
        if (KIND[Math.round(y + j) * W + Math.round(x)] === 2) continue;
        put(BASE, x, y + j - 3, c);
      }
    }
    OBJ.push({ y: 60, f: () => pipe([[0, 100], [30, 96], [46, 70], [90, 66], [100, 56]], 1) });
    OBJ.push({ y: 170, f: () => pipe([[180, 200], [186, 172], [230, 168], [250, 150], [290, 146], [320, 150]], 1) });

    // 1: the Gear Maze: brass walls in a grid maze, cogs on the corners.
    const MZ = { x: 6, y: 96, cw: 7, n: 5 };
    const MAZE_COGS = [];
    OBJ.push({ y: MZ.y + MZ.n * MZ.cw, f() {
      const M = new Uint8Array(N), n = MZ.n, cw = MZ.cw;
      const wallsH = (r, c) => hash(r * 7 + c, 91) > 0.45, wallsV = (r, c) => hash(r * 5 + c, 92) > 0.55;
      for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) {
        const x = MZ.x + c * cw, y = MZ.y + r * cw;
        if (c < n && (r === 0 || r === n || wallsH(r, c)) && !(r === n && c === n - 1)) for (let k = 0; k <= cw; k++) M[y * W + x + k] = 1;
        if (r < n && (c === 0 || c === n || wallsV(r, c)) && !(c === n && r === n - 1)) for (let k = 0; k <= cw; k++) M[(y + k) * W + x] = 1;
        if ((r === 0 || r === n) && (c === 0 || c === n)) MAZE_COGS.push([x, y - 3]);
      }
      for (let y = MZ.y; y <= MZ.y + n * cw; y++) for (let x = MZ.x; x <= MZ.x + n * cw; x++) if (!M[y * W + x]) BASE[y * W + x] = band(IRON, 0.5 + ((x + y) & 1) * 0.1, x, y);
      extrude(M, 3, (x, y) => BRASS[(x + y) % 5 === 0 ? 0 : 1], (x, y, j) => j === 0 ? BRASS[4] : BRASS[3]);
    } });
    // 2: the Tower Clock.
    const TC = { x: 96, y: 92, w: 14, h: 40 };
    OBJ.push({ y: TC.y, f() {
      const { x: x0, y: by, w, h } = TC;
      shadowEllipse(x0 + w + 8, by + 3, 14, 3, 0.45);
      for (let y = by - h; y <= by; y++) for (let x = x0; x < x0 + w; x++) {
        const rel = (x - x0) / (w - 1);
        let c = rel < 0.25 ? BRASS[1] : rel < 0.75 ? BRASS[2] : BRASS[3];
        if ((by - y) % 8 === 0) c = BRASS[4];
        put(BASE, x, y, c);
      }
      // Belfry: open arches, a teal-green copper roof and a finial.
      for (let y = by - h - 9; y < by - h; y++) for (let x = x0; x < x0 + w; x++) {
        const open = x > x0 + 2 && x < x0 + w - 3 && y > by - h - 7;
        put(BASE, x, y, open ? SOOT : x < x0 + 3 ? BRASS[1] : BRASS[3]);
      }
      for (let j = 0; j < 7; j++) { const hw = w / 2 + 1 - j * 1.1; for (let dx = -Math.ceil(hw); dx <= hw; dx++) put(BASE, x0 + w / 2 + dx - 0.5, by - h - 10 - j, dx < -hw * 0.3 ? C('#7ac8b0') : dx < hw * 0.3 ? C('#4a9a88') : C('#2e6a60')); }
      put(BASE, x0 + w / 2, by - h - 17, BRASS[1]); put(BASE, x0 + w / 2, by - h - 18, BRASS[0]);
      K.disc(BASE, x0 + w / 2 - 0.5, by - h + 8, 5.5, (dx, dy, d) => d > 0.82 ? BRASS[4] : C('#f4ecd8'));
      for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; put(BASE, x0 + w / 2 - 0.5 + Math.cos(a) * 4, by - h + 8 + Math.sin(a) * 4, C('#8a7a6a')); }
      rect(BASE, x0 + 5, by - 6, 4, 6, SOOT);
      for (const yy of [by - 18, by - 28]) { rect(BASE, x0 + 3, yy, 2, 4, TEALD); rect(BASE, x0 + 9, yy, 2, 4, TEALD); }
    } });
    const CLOCK = { x: TC.x + TC.w / 2 - 0.5, y: TC.y - TC.h + 8 }, BELL = { x: TC.x + TC.w / 2 - 0.5, y: TC.y - TC.h - 7 };
    // 3: the Mainspring drum (the key turns in the frame).
    const MS = { x: 134, y: 118, r: 10 };
    OBJ.push({ y: MS.y + 4, f() {
      shadowEllipse(MS.x + 8, MS.y + 5, 14, 3.5, 0.45);
      for (let y = MS.y - 7; y <= MS.y + 4; y++) for (let x = MS.x - MS.r; x <= MS.x + MS.r; x++) {
        const rel = (x - MS.x + MS.r) / (2 * MS.r), bottom = MS.y + Math.sqrt(Math.max(0, 1 - sq((x - MS.x) / MS.r))) * 4;
        if (y > bottom) continue;
        put(BASE, x, y, (y - MS.y) % 3 === 0 ? BRASS[4] : rel < 0.3 ? BRASS[1] : rel < 0.7 ? BRASS[2] : BRASS[3]);
      }
      for (let y = MS.y - 12; y <= MS.y - 3; y++) for (let x = MS.x - MS.r; x <= MS.x + MS.r; x++) {
        const dx = (x - MS.x) / MS.r, dy = (y - MS.y + 7) / 4.2, e = dx * dx + dy * dy;
        if (e > 1) continue;
        // The coiled spring seen from above: a spiral of bright steel.
        const a = Math.atan2(dy, dx), rr = Math.sqrt(e);
        const coil = frac(rr * 4 - a / TAU);
        put(BASE, x, y, e > 0.8 ? (dx + dy < 0 ? BRASS[0] : BRASS[2]) : coil < 0.4 ? (dx + dy < 0 ? IRON[0] : IRON[1]) : IRON[4]);
      }
    } });
    // 4: the parade deck: painted lines; the soldiers march in the frame.
    const PARADE = { x0: 138, x1: 164, y: 80 };
    OBJ.push({ y: PARADE.y - 8, f() {
      for (let y = PARADE.y - 1; y <= PARADE.y + 3; y++) for (let x = PARADE.x0 - 2; x <= PARADE.x1 + 2; x++)
        put(BASE, x, y, y === PARADE.y - 1 || y === PARADE.y + 3 ? BRASS[2] : (x >> 1) % 3 === 0 ? C('#6a1e1e') : C('#8a2a24'));
      // A little bandstand drum at the end.
      for (let j = 0; j < 5; j++) for (let dx = -2; dx <= 2; dx++) put(BASE, PARADE.x0 - 6 + dx, PARADE.y + 1 - j, j === 4 ? C('#f4ecd8') : (dx + j) % 3 === 0 ? BRASS[1] : C('#c83a2a'));
    } });
    // 5: the siege engine's rails.
    const RAIL = { x0: 194, x1: 238, y: 118 };
    OBJ.push({ y: RAIL.y, f() {
      for (let x = RAIL.x0; x <= RAIL.x1; x++) { if (x % 3 === 0) for (let j = -3; j <= 3; j++) put(BASE, x, RAIL.y + j * 0.4, C('#4a3426')); put(BASE, x, RAIL.y - 1, IRON[0]); put(BASE, x, RAIL.y + 1, IRON[1]); }
      rect(BASE, RAIL.x0 - 2, RAIL.y - 2, 2, 5, C('#c83a2a')); rect(BASE, RAIL.x1 + 1, RAIL.y - 2, 2, 5, C('#c83a2a'));
    } });
    // 6: sockets for the loose cogs (the cogs lie beside them until cleared).
    const COGS = [[-15, -8], [15, -9], [-14, 9], [16, 8]].map(([dx, dy]) => ({ x: S[5][0] + dx, y: S[5][1] + dy }));
    for (const cg of COGS) OBJ.push({ y: cg.y, f() { for (let j = 0; j < 4; j++) { put(BASE, cg.x, cg.y - j, IRON[1]); put(BASE, cg.x + 1, cg.y - j, IRON[3]); } shadowEllipse(cg.x + 3, cg.y + 1, 3, 1, 0.4); } });
    // 7: the clock posts of the Stopped Clocks.
    const CLOCKS = [[-18, -4], [-8, -14], [8, -14], [18, -4], [-16, 10], [17, 11]].map(([dx, dy]) => ({ x: S[6][0] + dx, y: S[6][1] + dy }));
    for (const cp of CLOCKS) OBJ.push({ y: cp.y, f() {
      shadowEllipse(cp.x + 5, cp.y + 2, 5, 1.2, 0.4);
      for (let j = 0; j < 10; j++) { put(BASE, cp.x, cp.y - j, IRON[1]); put(BASE, cp.x + 1, cp.y - j, IRON[3]); }
      K.disc(BASE, cp.x + 0.5, cp.y - 12, 3.2, (dx, dy, d) => d > 0.72 ? BRASS[3] : C('#e8e0d0'));
      // Every clock stopped at the same second.
      put(BASE, cp.x + 1, cp.y - 12, C('#2a1a14')); put(BASE, cp.x + 1, cp.y - 13, C('#2a1a14')); put(BASE, cp.x + 1, cp.y - 14, C('#2a1a14'));
      put(BASE, cp.x + 2, cp.y - 11, C('#2a1a14'));
    } });

    // 8: the keep: a raised court ringed by gear walls.
    const KP = { x: 282, y: 66, rx: 30, ry: 17 };
    const WALL_GEARS = [];
    OBJ.push({ y: KP.y - 4, f() {
      const M = new Uint8Array(N);
      for (let y = KP.y - KP.ry - 3; y <= KP.y + KP.ry; y++) for (let x = KP.x - KP.rx - 3; x <= Math.min(W - 1, KP.x + KP.rx + 3); x++) {
        const e = sq((x - KP.x) / KP.rx) + sq((y - KP.y) / KP.ry);
        const a = Math.atan2((y - KP.y) / KP.ry, (x - KP.x) / KP.rx), seg = frac((a + Math.PI) / (TAU / 6));
        const front = y > KP.y + 2 && Math.abs(x - S[7][0]) < 12;
        if (e <= 1 && e > 0.6 && !front && y < KP.y + KP.ry && (seg > 0.12 && seg < 0.88)) M[y * W + x] = 1;
      }
      extrude(M, 8, (x, y) => ((x >> 2) & 1) && ((x + y) % 7) ? BRASS[1] : BRASS[0],
        (x, y, j, h) => j === h - 1 ? BRASS[2] : ((x % 6) === 0 ? BRASS[4] : j < 2 ? BRASS[4] : x < KP.x ? BRASS[2] : BRASS[3]), 10);
      // The court inside: iron flagstones.
      for (let y = KP.y - KP.ry + 4; y < KP.y + KP.ry - 6; y++) for (let x = KP.x - KP.rx + 5; x < KP.x + KP.rx - 5; x++) {
        const i = y * W + x;
        if (sq((x - KP.x) / (KP.rx - 5)) + sq((y - KP.y + 3) / (KP.ry - 5)) > 1 || KIND[i] === 4 || HGT[i]) continue;
        BASE[i] = ((x >> 2) + (y >> 2)) & 1 ? IRON[2] : IRON[3];
      }
      // Big gears set into the wall (turned in the frame).
      for (const [a, r] of [[-2.62, 6], [-1.57, 7], [-0.52, 6], [-3.67, 5]]) WALL_GEARS.push({ x: KP.x + Math.cos(a) * KP.rx * 0.8, y: KP.y + Math.sin(a) * KP.ry * 0.8 - 10, r, n: r + 3 });
    } });

    OBJ.sort((a, b) => a.y - b.y);
    const PRE = BASE.slice();
    for (const o of OBJ) o.f();
    for (let i = 0; i < N; i++) if (KIND[i] === 3 && BASE[i] !== PRE[i]) KIND[i] = 4;     // objects stand in front of the shafts

    // ---------- animated ----------
    const LAMPS = [];
    for (let i = 0; i < N; i++) if (BASE[i] === TEALD) LAMPS.push(i);
    const vignette = K.vignette(C('#0a0608'), 0.35, 0.45);
    // CastlE: a green-bronze rook, battlement head with eyes, brass gauntlets, porthole gear.
    const CAST = [
      '.bbbb.bbbbb.bbbb.',
      '.bbbb.bbbbb.bbbb.',
      '.bbbbbbbbbbbbbbb.',
      '.bbbbbbbbbbbbbbb.',
      '.bbbeebbbbbeebbb.',
      '.bbbeebbbbbeebbb.',
      '.bbbbbbbbbbbbbbb.',
      '.bbbbbbmmmbbbbbb.',
      '..bbbbbbbbbbbbb..',
      '..rrrrrrrrrrrrr..',
      '...bbbbbbbbbbb...',
      '...bbbbooobbbb...',
      '...bbbooooobbb...',
      '...bbbooooobbb...',
      '...bbbbooobbbb...',
      '...bbbbbbbbbbb...',
      '..ggggggggggggg..',
      '..gggbbbbbbbggg..',
      '...bbbbbbbbbbb...',
      '..bbbbbbbbbbbbb..',
      '..rrrrrrrrrrrrr..',
      '.bbbbbbbbbbbbbbb.',
      '.bbbbbbbbbbbbbbb.',
      'bbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbb'];
    const CM = { b: BRONZE, r: BRASS.slice(0, 4), g: BRASS.slice(0, 4), e: [C('#141a1c')], m: [C('#1e2624')], o: [C('#0e2a2c')] };
    function figure(rows, mats, X, Y, s, out) {
      const h = rows.length, w = rows[0].length;
      const at = (i, j) => (j < 0 || j >= h || i < 0 || i >= w) ? '.' : rows[j][i];
      for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
        const ch = at(i, j);
        for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) {
          const x = X + i * s + a, y = Y + j * s + b;
          if (ch === '.') {
            const n = [at(i - 1, j), at(i + 1, j), at(i, j - 1), at(i, j + 1)];
            if ((a === 0 && n[0] !== '.') || (a === s - 1 && n[1] !== '.') || (b === 0 && n[2] !== '.') || (b === s - 1 && n[3] !== '.')) put(out, x, y, LINE);
            continue;
          }
          const m = mats[ch];
          if (m.length === 1) { put(out, x, y, m[0]); continue; }
          let l = i, r = i; while (at(l - 1, j) !== '.') l--; while (at(r + 1, j) !== '.') r++;
          const rel = ((i - l) * s + a) / ((r - l + 1) * s - 1), n = m.length;
          let k = rel < 0.18 ? 0 : rel < 0.5 ? 1 : rel < 0.82 ? 2 : 3;
          if (rel > 0.93 && n > 4) k = 4;
          if (j * s + b === 0 || (at(i, j - 1) === '.' && b === 0)) k = Math.max(0, k - 1);
          put(out, x, y, m[Math.min(n - 1, k)]);
        }
      }
    }

    function frame(t, state) {
      const u = t / LOOP;
      const M = (state && state.map) || {}, cleared = M.cleared | 0, beaten = !!M.beaten;
      buf.set(BASE);
      // Gears in the depths, clipped to their shafts.
      for (const g of DEPTH_GEARS) {
        const ang = g.dir * TAU * g.turns * u;
        const tmp = GTMP; tmp.fill(0);
        K.gear(tmp, g.x, g.y, g.r, g.n, ang, g.c);
        const sh = g.sh;
        for (let y = Math.max(28, Math.floor(g.y - g.r - 3)); y <= Math.min(H - 1, g.y + g.r + 3); y++) for (let x = Math.max(0, Math.floor(g.x - g.r - 3)); x <= Math.min(W - 1, g.x + g.r + 3); x++) {
          const i = y * W + x;
          if (tmp[i] && KIND[i] === 3 && BASE[i] === buf[i] && y > sh.y0 + 7) buf[i] = tmp[i];
        }
      }
      // Teal glow breathing up out of the shafts.
      SHAFTS.forEach((sh, k) => glow(buf, (sh.x0 + sh.x1) / 2, Math.min(H - 4, sh.y1 - 4), 24, TEAL, 0.1 + 0.05 * Math.sin(TAU * 6 * u + k)));
      // Smoke from the far stacks and the near ones.
      for (const [sx, sy] of SKYLINE) for (let i = 0; i < 6; i++) { const v = frac(4 * u + i / 6 + sx * 0.01), r = 1 + v * 4; K.glow(buf, sx + v * 16, sy - v * 14, r + 1, C('#5a4a4a'), (1 - v) * 0.5); }
      for (const [sx, sy] of STACKS) for (let i = 0; i < 8; i++) {
        const v = frac(6 * u + i / 8 + sx * 0.013), x = sx + v * 22, y = sy - v * 20, r = 1.2 + v * 4.5;
        for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++)
          if (Math.hypot(xx - x, yy - y) <= r) blendAt(buf, xx, yy, v < 0.2 ? C('#8a7a70') : C('#5a4a4a'), (1 - v) * 0.3);
      }
      // Windows and lamps pulse teal.
      const pulse = 0.5 + 0.5 * Math.sin(TAU * 9 * u);
      for (const i of LAMPS) buf[i] = pulse > 0.35 ? TEAL : TEALD;
      // 1: cogs spin on the maze corners.
      MAZE_COGS.forEach(([x, y], n) => K.gear(buf, x, y, 2.6, 6, TAU * 8 * u * (n % 2 ? 1 : -1), GEAR_I));
      // 2: the clock's hands sweep; the bell swings and rings every 10 s.
      const mA = TAU * 12 * u - Math.PI / 2, hA = TAU * u - Math.PI / 2 + 1.2;
      line(buf, CLOCK.x, CLOCK.y, CLOCK.x + Math.cos(hA) * 2.5, CLOCK.y + Math.sin(hA) * 2.5, C('#2a1a14'));
      line(buf, CLOCK.x, CLOCK.y, CLOCK.x + Math.cos(mA) * 4, CLOCK.y + Math.sin(mA) * 4, C('#2a1a14'));
      const bv = frac(12 * u), swing = bv < 0.3 ? Math.sin(bv / 0.3 * TAU * 2) * (1 - bv / 0.3) * 2 : 0;
      for (let j = 0; j < 4; j++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) <= 1 + j * 0.4) put(buf, BELL.x + dx + swing * (j / 4), BELL.y + j, j === 3 ? BRASS[3] : dx < 0 ? BRASS[0] : BRASS[1]);
      if (bv < 0.3) for (let r = 0; r < 2; r++) { const rr = 6 + (bv / 0.3) * 10 + r * 4; for (let a = -1; a <= 1; a += 0.25) { blendAt(buf, BELL.x + Math.cos(a) * rr, BELL.y + 2 + Math.sin(a) * rr * 0.6, BRASS[0], 0.5 * (1 - bv / 0.3)); blendAt(buf, BELL.x - Math.cos(a) * rr, BELL.y + 2 + Math.sin(a) * rr * 0.6, BRASS[0], 0.5 * (1 - bv / 0.3)); } }
      // 3: the great key turns in the drum (seen edge-on as it rotates).
      { const a = TAU * 6 * u, wdt = Math.cos(a), kx = MS.x + MS.r, ky = MS.y - 4;
        rect(buf, kx, ky - 1, 5, 3, LINE); rect(buf, kx, ky, 5, 1, BRASS[1]);
        // The bow: two round loops (an 8 on its side), foreshortened as the key turns.
        const sx = 0.3 + Math.abs(wdt) * 0.7, bx = kx + 11;
        for (const side of [-1, 1]) for (let j = -3; j <= 3; j++) for (let i = -6; i <= 6; i++) {
          const dx = i / 4.2, dy = j / 3.2, e = dx * dx + dy * dy;
          if (e > 1) continue;
          const xx = bx + Math.round(i * sx), yy = ky + j + side * 3.5;
          put(buf, xx, yy, e < 0.25 ? (e < 0.12 ? DECK[3] : BRASS[3]) : e > 0.72 ? BRASS[3] : (wdt > 0) === (i < 0) ? BRASS[0] : BRASS[2]);
        }
        rect(buf, bx - 1, ky - 1, 3, 3, BRASS[2]); }
      // 4: tin soldiers march up and down the parade deck.
      for (let k = 0; k < 4; k++) {
        const v = frac(4 * u), dir = v < 0.5 ? 1 : -1, pos = v < 0.5 ? v * 2 : 2 - v * 2;
        const x = Math.round(PARADE.x0 + 1 + k * 6 + pos * (PARADE.x1 - PARADE.x0 - 22)), y = PARADE.y + 1;
        const step = Math.sin(TAU * 96 * u + k) > 0;
        put(buf, x, y, C('#2a3a8a')); put(buf, x + 1, y, C('#2a3a8a'));
        put(buf, x + (step ? 0 : 1), y + 1, C('#141418'));
        for (let j = 1; j <= 3; j++) { put(buf, x, y - j, C('#d83a2a')); put(buf, x + 1, y - j, C(j === 2 ? '#fff0b0' : '#a82a20')); }
        put(buf, x, y - 4, C('#f4d0b0')); put(buf, x + 1, y - 4, C('#f4d0b0'));
        for (let j = 5; j <= 7; j++) { put(buf, x, y - j, C('#141418')); put(buf, x + 1, y - j, C('#141418')); }
        put(buf, x + (dir > 0 ? 2 : -1), y - 6, BRASS[1]);
        for (let j = 1; j <= 5; j++) put(buf, x + (dir > 0 ? 2 : -1), y - 3 - j, IRON[0]);                // rifle
      }
      // 5: the siege engine rolls to and fro, puffing smoke.
      { const v = Math.sin(TAU * 4 * u), ex = Math.round((RAIL.x0 + RAIL.x1) / 2 + v * 12), ey = RAIL.y - 1;
        for (let y = ey - 16; y <= ey - 3; y++) for (let x = ex - 6; x <= ex + 6; x++) {
          const rel = (x - ex + 6) / 12, merlon = y < ey - 13 && ((x - ex + 6) % 4 === 3);
          if (merlon) continue;
          put(buf, x, y, (y - ey + 16) % 5 === 3 ? BRASS[2] : rel < 0.3 ? IRON[0] : rel < 0.7 ? IRON[1] : IRON[2]);
        }
        rect(buf, ex - 2, ey - 10, 4, 4, C('#ff8a30')); glow(buf, ex, ey - 8, 6, C('#ff8a30'), 0.3);
        for (const wx of [-4, 4]) K.gear(buf, ex + wx, ey - 1, 2.6, 6, -v * 4 + TAU * 0, GEAR_I);
        for (let i = 0; i < 6; i++) { const q = frac(10 * u + i / 6), r = 1 + q * 4; K.glow(buf, ex + 3 - q * 6, ey - 18 - q * 16, r + 1.5, C('#e8e0d8'), (1 - q) * 0.45); }
      }
      // 6: the loose cogs: lying about and glinting, or spinning on their posts once cleared.
      COGS.forEach((cg, n) => {
        if (cleared >= 6) K.gear(buf, cg.x + 0.5, cg.y - 5, 3, 7, TAU * 10 * u * (n % 2 ? 1 : -1), GEAR_B);
        else {
          const lx = cg.x + (n % 2 ? -5 : 5), ly = cg.y + 2;
          for (let yy = -3; yy <= 3; yy++) for (let xx = -5; xx <= 5; xx++) {
            const e = sq(xx / 5) + sq(yy / 2.6), tooth = Math.cos(Math.atan2(yy / 2.6, xx / 5) * 8) > 0.2;
            if (e <= (tooth ? 1 : 0.72)) put(buf, lx + xx, ly + yy, e < 0.12 ? SOOT : e > 0.72 ? BRASS[3] : xx + yy < 0 ? BRASS[0] : BRASS[1]);
            else if (e <= 1.25 && yy >= 0) put(buf, lx + xx + 1, ly + yy + 1, SHAD);
          }
          if (Math.sin(TAU * 5 * u + n * 1.6) > 0.85) { put(buf, lx - 2, ly - 1, BRASS[0]); put(buf, lx - 2, ly - 2, C('#ffffff')); }
        }
      });
      // 7: the Stopped Clocks shimmer with a ghostly light; faint footprints cross the square.
      CLOCKS.forEach((cp, n) => { if (Math.sin(TAU * 3 * u + n * 1.1) > 0.4) glow(buf, cp.x + 0.5, cp.y - 12, 6, TEAL, 0.2); });
      for (let k = 0; k < 7; k++) {
        const s2 = k / 6, x = S[6][0] - 22 + s2 * 44, y = S[6][1] + 16 - Math.sin(s2 * Math.PI) * 3 + (k & 1 ? 1 : -1);
        const a = Math.max(0, 0.6 - frac(3 * u - s2 * 0.3) * 1.5);
        if (a > 0) { blendAt(buf, x, y, TEALL, a); blendAt(buf, x + 1, y, TEALL, a * 0.6); }
      }
      // Steam vents on the decks.
      for (const [vx, vy, p] of [[62, 96, 0], [176, 116, 0.3], [252, 108, 0.6], [30, 160, 0.15], [126, 104, 0.45]]) {
        const age = frac(8 * u + p);
        if (age > 0.5) continue;
        const a = age / 0.5;
        for (let i = 0; i < 5; i++) K.glow(buf, vx + (hash(i, 9) - 0.5) * 6 * a, vy - 2 - a * 16 - i * 1.5, 2.5 + a * 4, STEAM, (1 - a) * 0.4);
      }
      // Sparks from a grinder near the engine.
      for (let i = 0; i < 8; i++) { const v = frac(24 * u + i / 8), a = -2.4 + hash(i, 40) * 0.9; put(buf, 170 + Math.cos(a) * v * 14, 146 + Math.sin(a) * v * 10 + v * v * 10, C(v < 0.4 ? '#fff4a0' : '#ff9a30')); }

      // 8: the gear walls turn (and stop once CastlE is beaten); CastlE stands in his gate.
      WALL_GEARS.forEach((g, n) => K.gear(buf, g.x, g.y, g.r, g.n, beaten ? 0.3 * n : TAU * 3 * u * (n % 2 ? 1 : -1), GEAR_I));
      const [gx, gy] = S[7];
      const breath = beaten ? 0 : (Math.sin(TAU * 20 * u) > 0.5 ? 1 : 0);
      const CX = gx - 8, CY = gy - 36 + breath + (beaten ? 1 : 0);
      shadowEllipseBuf(gx + 4, gy - 11, 11, 2.2, 0.5);
      figure(CAST, CM, CX, CY, 1, buf);
      // Eyes: a teal glint, blinking; half shut when beaten.
      const blink = frac(5 * u + 0.3) < 0.03;
      if (!blink) { put(buf, CX + 4, CY + 4, C('#9afff0')); put(buf, CX + 11, CY + 4, C('#9afff0')); }
      if (beaten || blink) { put(buf, CX + 4, CY + 4, BRONZE[3]); put(buf, CX + 5, CY + 4, BRONZE[3]); put(buf, CX + 11, CY + 4, BRONZE[3]); put(buf, CX + 12, CY + 4, BRONZE[3]); }
      // The porthole gear ticks round once a second (stopped when beaten).
      K.gear(buf, CX + 8, CY + 12.5, 1.6, 5, beaten ? 0 : Math.floor(t * 5) * TAU / 25, GEAR_B);
      // Steam from between the battlements.
      if (!beaten) for (let i = 0; i < 6; i++) {
        const v = frac(5 * u + i / 6), side = i % 2 ? 1 : 0;
        K.glow(buf, CX + (side ? 11.5 : 5.5) + (side ? v * 4 : -v * 4), CY - v * 10, 1.5 + v * 3, STEAM, (1 - v) * 0.55);
      }

      // Pennants on cleared stops.
      for (let k = 0; k < Math.min(cleared, 7); k++) {
        const [sx, sy] = S[k], px = sx + 12, py = sy - 13;
        for (let j = 0; j < 9; j++) put(buf, px, py + j, IRON[3]);
        for (let j = 0; j < 3; j++) for (let i = 1; i <= 4 - j; i++) put(buf, px + i, py + j + (i > 2 && Math.sin(TAU * 24 * u - i + k) > 0 ? 1 : 0), j === 0 ? BRASS[0] : BRASS[1]);
      }
      // The airship drifts over, its shadow sliding across the decks.
      { const av = frac(u), ax = -70 + av * (W + 140), ay = 44 + Math.sin(TAU * 3 * u) * 2;
        for (let y = -5; y <= 5; y++) for (let x = -18; x <= 18; x++) if (sq(x / 18) + sq(y / 5.5) <= 1) blendAt(buf, ax + x + 26, ay + y + 52, SHAD, 0.28);
        for (let y = -6; y <= 6; y++) for (let x = -20; x <= 20; x++) {
          if (sq(x / 20) + sq(y / 6.5) > 1) continue;
          put(buf, ax + x, ay + y, C(y < -2 ? '#e8b878' : y < 3 ? '#b07a44' : '#6a4428'));
          if (x % 8 === 0) put(buf, ax + x, ay + y, C('#7a4e2c'));
        }
        rect(buf, ax - 6, ay + 7, 12, 4, C('#3a2a24')); put(buf, ax + 2, ay + 8, TEAL); put(buf, ax - 2, ay + 8, TEAL);
        for (let j = -3; j <= 3; j++) put(buf, ax - 22 + (Math.floor(t * 12) % 2), ay + j, C('#3a2a24')); }
      vignette(buf);
    }
    const GTMP = new Uint32Array(N);
    function shadowEllipseBuf(cx, cy, rx, ry, a) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
        if (sq((x - cx) / rx) + sq((y - cy) / ry) <= 1) blendAt(buf, x, y, SHAD, a);
    }

    return (t, out, state) => { buf = out; frame(t, state); };
  },
});
