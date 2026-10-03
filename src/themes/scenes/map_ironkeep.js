// The Iron Keep from above: the local map of World 4.
//
// 320x200, shown at 4x when the world map zooms into the Iron Keep. The fortress at night
// under a cold moon, seen from the air: an outer curtain wall with a moat, an outer bailey
// of cobbles, an inner ring of riveted iron round Rook-E's great rook-shaped keep. The
// only warmth is firelight: the forge, torches on the walls, braziers, the siege camp.
// The road climbs from the forge past seven places, each marked by its mission: the forge
// and anvil (Forge Runner), a battering ram at the west gate (Battering Ram), four rook
// sentry towers (Iron Sentries), four empty plinths where towers stood (Without Towers),
// the barricaded east gate with a siege camp outside (Hold the Gate), glowing ingots
// and a pair of bellows (Forge Ingots), and the inner gate standing open in a ghostly
// light, footprints walking through it (The Open Gate). At the end, Rook-E stands
// before the gate of his keep, arms crossed, eyes glowing through his visor.
// Moves: the smith's hammer and the forge's sparks, forge smoke, torches and braziers,
// moat glints, moonlit cloud shadows, banners, guards patrolling the walls, the siege
// catapult swinging, campfires, the bellows pumping, ingots pulsing, the ghostly
// footprints, stars and the moon, Rook-E's eyes scanning and his slow breathing.
// State (LiveScenes.setState('map_ironkeep', { map: { cleared, beaten } })): cleared
// places raise a red Iron Keep pennant; when Rook-E is beaten he lowers his arms and
// salutes, and the keep's gate glows open.
LiveScenes.register({
  id: 'map_ironkeep',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  stops: [[40, 138], [92, 126], [150, 110], [198, 118], [262, 96], [236, 66], [202, 58], [112, 80]],
  create() {
    const W = 320, H = 200, N = W * H, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise2, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, glow } = K;
    const STOPS = LiveScenes.get('map_ironkeep').stops;
    let buf = null;

    const BACK = new Uint32Array(N), OBJ = new Uint8Array(N), OH = new Float32Array(N);
    const FREE = new Uint8Array(N), MASK = new Uint8Array(N), MASKC = new Uint32Array(N);
    const P = (...h) => h.map(C);
    // Moonlight from the north-west; shadows fall south-east.
    const SHX = 0.7, SHY = 0.35;

    // ---------- helpers ----------
    function spline(Pts, step = 0.35) {
      const out = [];
      for (let i = 0; i < Pts.length - 1; i++) {
        const p0 = Pts[Math.max(0, i - 1)], p1 = Pts[i], p2 = Pts[i + 1], p3 = Pts[Math.min(Pts.length - 1, i + 2)];
        const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
        for (let k = 0; k < n; k++) {
          const t = k / n, t2 = t * t, t3 = t2 * t;
          const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
          out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        }
      }
      out.push(Pts[Pts.length - 1]);
      return out;
    }
    function distField(S, R) {
      const D = new Float32Array(N).fill(99), A = new Float32Array(N);
      let len = 0;
      for (let k = 0; k < S.length; k++) {
        if (k) len += Math.hypot(S[k][0] - S[k - 1][0], S[k][1] - S[k - 1][1]);
        const [sx, sy] = S[k];
        for (let y = Math.floor(sy - R); y <= sy + R; y++) for (let x = Math.floor(sx - R); x <= sx + R; x++) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const d = Math.hypot(x - sx, y - sy), i = y * W + x;
          if (d < D[i]) { D[i] = d; A[i] = len; }
        }
      }
      return { D, A, len };
    }
    function op(x, y, c, h) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = y * W + x;
      BACK[i] = c; OBJ[i] = 1; OH[i] = Math.max(0, h);
    }
    const DRAW = [];
    const add = (by, fn) => DRAW.push({ by, fn });

    // ---------- the ground: night grass and rock outside, cobbles within the walls ----------
    const GRASS = P('#080c18', '#0c1222', '#121a2e', '#18243a', '#203048', '#2a3c56');
    const COB = P('#10141f', '#181e2e', '#222a3e', '#2e3850', '#3e4a64', '#56627c');
    const OUTER = spline([[-6, 112], [44, 110], [92, 106], [132, 124], [180, 140], [228, 134], [266, 114], [326, 104]]);
    const OW = distField(OUTER, 16);
    const wallY = new Float32Array(W).fill(0);
    for (const [x, y] of OUTER) if (x >= 0 && x < W) wallY[Math.round(x)] = y;
    for (let x = 1; x < W; x++) if (!wallY[x]) wallY[x] = wallY[x - 1];
    const IC = { x: 118, y: 44, rx: 66, ry: 44 };            // the paved inner ward round the keep
    const insideOuter = (x, y) => y < wallY[x] - 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, n = noise2(x / 8, y / 8, 3) - 0.5, n2 = noise2(x / 30, y / 26, 4) - 0.5;
      const moon = 0.1 * clamp(1 - Math.hypot(x - 60, y - 20) / 260);
      if (insideOuter(x, y)) {
        const inner = sq((x - IC.x) / IC.rx) + sq((y - IC.y) / IC.ry) + (noise2(x / 5, y / 5, 12) - 0.5) * 0.35 < 1;
        if (inner) {
          // Flagstones in the inner court: big slabs on a jittered grid, dark joints.
          const gy = Math.floor(y / 5), sx = x + Math.floor(hash(gy, 5) * 6), jx = sx % 6, jy = y % 5;
          const cell = hash(Math.floor(sx / 6), gy);
          BACK[i] = (jx === 0 || jy === 4) && cell > 0.25 ? COB[1] : ramp(COB, 0.34 + (cell - 0.5) * 0.18 + n2 * 0.3 + moon, x, y);
        } else {
          // The outer bailey: trodden earth and worn grass, with scattered stones.
          BACK[i] = ramp(P('#0e1220', '#141a2a', '#1a2234', '#222c40', '#2c384e'), 0.5 + n * 0.25 + n2 * 0.5 + moon, x, y);
          if (hash(x, y) > 0.988) BACK[i] = C(hash(x + 1, y) > 0.5 ? '#2c3850' : '#0a0e18');
        }
      } else {
        BACK[i] = ramp(GRASS, 0.5 + n * 0.3 + n2 * 0.5 + moon - clamp((y - 150) / 50) * 0.2, x, y);
        if (hash(x, y) > 0.985) BACK[i] = C('#34465e');
      }
    }

    // ---------- the moat, outside the curtain wall ----------
    const MOATC = P('#060a16', '#0a1224', '#0e1a32', '#142440', '#1c3050');
    for (let i = 0; i < N; i++) {
      const x = i % W, y = i / W | 0, d = OW.D[i];
      if (insideOuter(x, y) || d < 5 || d > 11) continue;
      if (d > 10) { BACK[i] = C('#2a3244'); continue; }                 // the outer bank's stone lip
      BACK[i] = ramp(MOATC, 0.5 - (d - 5) * 0.05 + (noise2(x / 5, y / 3, 8) - 0.5) * 0.3, x, y); MASK[i] = 2; MASKC[i] = BACK[i];
    }

    // ---------- the road ----------
    const TRAIL = spline([
      [-8, 150], [18, 146], STOPS[0], [62, 142], [80, 136], STOPS[1], [92, 110], [104, 100], [126, 102], STOPS[2], [172, 116], STOPS[3],
      [218, 116], [242, 108], STOPS[4], [256, 80], [246, 72], STOPS[5], [218, 60], STOPS[6], [182, 54], [160, 54], [136, 66], STOPS[7],
    ]);
    const TF = distField(TRAIL, 6);
    const ROAD = P('#1a1e2c', '#2e3446', '#464e64', '#626c84', '#8a94aa');
    const BRIDGE = [];
    for (let i = 0; i < N; i++) {
      const d = TF.D[i];
      if (d > 3.8) continue;
      const x = i % W, y = i / W | 0;
      FREE[i] = 1;
      if (MASK[i] === 2) { BRIDGE.push(i); continue; }
      if (d > 3) { BACK[i] = C('#080a14'); continue; }
      const a = TF.A[i], cell = hash(Math.floor(a / 2.2), Math.floor(d + 3));
      const seam = frac(a / 2.2) < 0.2 || Math.abs(d - 1.5) < 0.3;
      BACK[i] = seam ? C('#141828') : ramp(ROAD, 0.45 + cell * 0.35 - d * 0.06, x, y);
    }
    // Landings: round cobbled yards with an iron ring.
    for (const [sx, sy] of STOPS) for (let y = sy - 10; y <= sy + 10; y++) for (let x = sx - 15; x <= sx + 15; x++) {
      const e = sq((x - sx) / 12.5) + sq((y - sy) / 8.2);
      if (e > 1 || x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x, a = Math.atan2(y - sy, (x - sx) * 0.66), r = Math.sqrt(e);
      const ring = r > 0.9, band = r > 0.78 && r <= 0.9, joint = Math.floor((a / TAU + 1) * 16) !== Math.floor((a / TAU + 1) * 16 + 0.08);
      BACK[i] = ring ? C('#0a0c16') : band ? (joint ? C('#a8b8d0') : C('#46526a')) : ramp(ROAD, 0.42 - r * 0.2 + (hash(Math.floor(a * 4), Math.floor(r * 4)) - 0.5) * 0.2, x, y);
      FREE[i] = 1; MASK[i] = 0;
    }
    // Plank bridges over the moat.
    add(0, () => {
      for (const i of BRIDGE) {
        const x = i % W, y = i / W | 0, d = TF.D[i];
        if (d > 3) { op(x, y - 1, C(d > 3.4 ? '#1a0e0a' : '#8a6a4a'), 2); continue; }
        op(x, y, Math.floor(TF.A[i] / 1.5) % 2 ? C('#4a3428') : C('#6a4a34'), 0.5);
        MASK[i] = 0;
      }
    });

    // ---------- walls, towers, gates ----------
    const STONE = P('#141620', '#22242e', '#30323e', '#40424e', '#565866', '#747684');
    const IRON = P('#141824', '#20263a', '#323a4e', '#46526a', '#5e6c86', '#8a9ab4');
    const RIVET = C('#a8b8d0');
    const GATES = [], TORCHES = [], WINDOWS = [], BANNERS = [], WALKS = [];
    // A wall along a sampled curve: a south-facing face and a walkway with merlons.
    function wall(S, h, pal, o = {}) {
      const cols = [];
      for (let k = 0; k < S.length; k += 1) cols.push([Math.round(S[k][0]), Math.round(S[k][1]), k]);
      const seen = new Set();
      for (const [x, y, k] of cols) {
        if (x < 0 || x >= W || seen.has(x * 1000 + y)) continue;
        seen.add(x * 1000 + y);
        if (o.skip && o.skip(x, y)) continue;
        add(y, () => {
          for (let j = 0; j < h; j++) {
            const course = (h - j) % 4 === 0;
            const plate = pal === IRON && ((x + (j >> 2) * 3) % 6 === 0);
            let c = ramp(pal, 0.28 + j / h * 0.3 + (course ? -0.12 : 0) + (plate ? -0.15 : 0), x, y - j);
            if (pal === IRON && (x % 8 === 2) && ((h - j) % 5 === 2)) c = IRON[5];
            op(x, y - j, c, j);
          }
          // Walkway on top, with merlons on the outer (south) edge.
          for (let w = 0; w < 3; w++) op(x, y - h - w, ramp(pal, w === 2 ? 0.72 : 0.5 - w * 0.08, x, y - h - w), h + w);
          if ((x >> 1) % 2 === 0) { op(x, y - h + 1, pal[4], h - 1); op(x, y - h, pal[4], h); }
        });
      }
    }
    // A square tower in 3/4 view: lit west face, shaded south face, crenellated top.
    function tower(cx, by, w, h, pal, o = {}) {
      add(by, () => {
        const hw = w >> 1, depth = o.depth || Math.round(w * 0.5);
        for (let j = 0; j < h; j++) for (let x = cx - hw; x <= cx + hw; x++) {
          const rel = (x - (cx - hw)) / w;
          let c = ramp(pal, (rel < 0.18 ? 0.8 : 0.35) + j / h * 0.2 + (((h - j) % 5 === 0) ? -0.1 : 0), x, by - j);
          if (pal === IRON && (x - cx + hw) % 4 === 1 && (h - j) % 5 === 2) c = RIVET;
          op(x, by - j, c, j);
        }
        // The top: a flat roof seen from above, its rim of merlons (a rook's crown).
        for (let d = 0; d < depth; d++) for (let x = cx - hw; x <= cx + hw; x++) {
          const y = by - h - d, rimF = d === 0 || d === depth - 1 || x === cx - hw || x === cx + hw;
          op(x, y, rimF ? (d === depth - 1 ? pal[5] : pal[4]) : pal[1], h + d);
        }
        for (let x = cx - hw; x <= cx + hw; x++) if (((x - cx + hw) >> 1) % 2 === 0) { op(x, by - h + 1 - 1, pal[5], h); op(x, by - h - depth, pal[5], h + depth); }
        if (o.window) for (const [wx, wy] of o.window) WINDOWS.push({ x: cx + wx, y: by - wy });
        if (o.torch) TORCHES.push({ x: cx + o.torch[0], y: by - h - o.torch[1], p: cx * 0.3, big: false });
        if (o.banner) BANNERS.push({ x: cx + o.banner[0], y: by - o.banner[1], p: cx * 0.1 });
      });
    }
    // Outer curtain wall (stone), with the west gate (stop 2) and the east gate (stop 5).
    const WG = { x: 92, y: 106 }, EG = { x: 266, y: 114 };
    wall(OUTER, 9, STONE, { skip: (x, y) => Math.abs(x - WG.x) < 6 || Math.abs(x - EG.x) < 6 });
    for (const G of [WG, EG]) {
      tower(G.x - 9, G.y + 1, 7, 14, STONE, { torch: [4, 1] });
      tower(G.x + 9, G.y + 1, 7, 14, STONE, { torch: [-4, 1] });
      GATES.push(G);
      add(G.y + 2, () => {
        for (let j = 0; j < 9; j++) for (let x = G.x - 5; x <= G.x + 5; x++) {
          const arch = j > 6 && Math.abs(x - G.x) > 5 - (j - 6) * 1.5;
          if (arch) continue;
          const bar = (x - G.x + 5) % 3 === 0 || j % 3 === 0;
          op(x, G.y - j, j > 6 ? STONE[3] : bar && G === WG ? C('#3a4258') : C('#05060c'), j);
        }
        for (let x = G.x - 6; x <= G.x + 6; x++) for (let w = 0; w < 3; w++) op(x, G.y - 9 - w, STONE[w === 2 ? 5 : 3], 9 + w);
      });
    }
    // Towers along the outer wall.
    for (const tx of [18, 150, 206, 306]) tower(tx, Math.round(wallY[tx]) + 1, 8, 15, STONE, { torch: [0, 2], banner: tx === 206 ? [-1, 12] : null });
    // The inner ring (riveted iron) round the keep, with the Open Gate at stop 7.
    // It only closes the east side: the keep's own walls guard the rest.
    const INNER = spline([[140, 14], [164, 26], [178, 40], [182, 54], [178, 68], [166, 78]], 0.3);
    const OG = { x: 182, y: 54 };
    wall(INNER, 11, IRON, { skip: (x, y) => Math.abs(y - OG.y) < 6 || y < 22 });
    tower(OG.x - 1, OG.y - 6, 7, 16, IRON, { torch: [0, 2] });
    tower(OG.x - 1, OG.y + 9, 7, 16, IRON, { torch: [0, 2] });
    tower(166, 80, 8, 17, IRON, { torch: [0, 2] });

    // The great keep: Rook-E's own tower, shaped like a rook, riveted iron.
    const KEEP = { x: 106, by: 62 };
    add(KEEP.by, () => {
      const { x: cx, by } = KEEP, hw = 21, h = 26;
      // The body: riveted iron plates, lit down the west edge.
      for (let j = 0; j < h; j++) for (let x = cx - hw; x <= cx + hw; x++) {
        const px = (x - cx + hw) % 6, band = (h - j) % 7 === 0;
        let t = x < cx - hw + 3 ? 0.78 : 0.42 - (x - cx) / hw * 0.12;
        if (px === 0) t += 0.14; else if (px === 5) t -= 0.14;
        if (band) t -= 0.18;
        let c = ramp(IRON, t + j / h * 0.08, x, by - j);
        if ((px === 1 || px === 4) && (h - j) % 7 === 2) c = RIVET;
        op(x, by - j, c, j);
      }
      // The rook's crown: a wider ring round the top, then its merlons.
      for (let j = 0; j < 5; j++) for (let x = cx - hw - 2; x <= cx + hw + 2; x++) op(x, by - h - j, ramp(IRON, (x < cx - hw ? 0.85 : 0.5) + (j === 0 ? -0.2 : 0) + (j === 4 ? 0.25 : 0), x, by - h - j), h + j);
      for (let d = 0; d < 7; d++) for (let x = cx - hw - 2; x <= cx + hw + 2; x++) {
        const rim = d === 6 || x < cx - hw || x > cx + hw;
        op(x, by - h - 5 - d, rim ? IRON[4] : IRON[1], h + 5 + d);
      }
      for (let x = cx - hw - 2; x <= cx + hw + 2; x++) if (((x - cx + hw + 2) % 6) < 3) for (let j = 0; j < 3; j++) op(x, by - h - 5 - j, ramp(IRON, x < cx - hw ? 0.95 : 0.7, x, by - h - 5 - j), h + 5 + j);
      for (const [wx, wy] of [[-16, 19], [-8, 21], [14, 21], [-16, 10], [16, 10]]) { op(cx + wx, by - wy, C('#05060c'), wy); op(cx + wx + 1, by - wy, C('#05060c'), wy); op(cx + wx, by - wy + 1, C('#05060c'), wy); op(cx + wx + 1, by - wy + 1, C('#05060c'), wy); WINDOWS.push({ x: cx + wx, y: by - wy }); }
    });
    BANNERS.push({ x: KEEP.x - 12, y: KEEP.by - 24, p: 0 }, { x: KEEP.x + 20, y: KEEP.by - 24, p: 2 });
    const KGATE = { x: 112, y: 62 };
    add(KEEP.by + 0.5, () => {
      for (let j = 0; j < 12; j++) for (let x = KGATE.x - 6; x <= KGATE.x + 6; x++) {
        const arch = j > 8 && Math.abs(x - KGATE.x) > 6 - (j - 8) * 1.8;
        if (!arch) op(x, KGATE.y - j, C(Math.abs(x - KGATE.x) > 5 || j > 10 ? '#5e6c86' : '#04050a'), j);
      }
    });

    // 1. Forge Runner: the forge outside the walls, the anvil in front of it.
    const FORGE = { x: 22, by: 128 };
    add(FORGE.by, () => {
      const { x: cx, by } = FORGE;
      for (let j = 0; j < 12; j++) for (let x = cx - 12; x <= cx + 12; x++) {
        const bx = (x + ((j >> 2) % 2) * 3) % 6, by2 = (12 - j) % 4;
        op(x, by - j, ramp(STONE, (x < cx - 10 ? 0.75 : 0.4) + (bx === 0 || by2 === 0 ? -0.15 : 0), x, by - j), j);
      }
      for (let d = 0; d < 8; d++) for (let x = cx - 13 + d * 0.6; x <= cx + 13 - d * 0.6; x++) op(x, by - 12 - d, C(d === 7 ? '#5a4a52' : x < cx ? '#3a2e36' : '#2a2028'), 12 + d);
      for (let j = 0; j < 12; j++) { op(cx + 7, by - 14 - j, STONE[3], 14 + j); op(cx + 8, by - 14 - j, STONE[1], 14 + j); op(cx + 9, by - 14 - j, STONE[1], 14 + j); }
      for (let j = 0; j < 7; j++) for (let x = cx - 6; x <= cx + 6; x++) if (!(j > 4 && Math.abs(x - cx) > 6 - (j - 4) * 2)) op(x, by - j, C('#1a0806'), j);
    });
    const FMOUTH = { x: FORGE.x, y: FORGE.by - 2 }, CHIM = { x: FORGE.x + 8, y: FORGE.by - 27 };
    const ANVIL = { x: 50, y: 124 };
    add(ANVIL.y, () => {
      for (let x = -4; x <= 4; x++) { op(ANVIL.x + x, ANVIL.y - 4, C(x < 0 ? '#c8d0e0' : '#8a96aa'), 4); op(ANVIL.x + x, ANVIL.y - 3, C('#3a4052'), 3); }
      op(ANVIL.x + 5, ANVIL.y - 4, C('#5e6c86'), 4);
      for (let j = 0; j < 3; j++) for (let x = -1; x <= 1; x++) op(ANVIL.x + x, ANVIL.y - j, C('#262a38'), j);
    });

    // 2. Battering Ram: a ram on wheels under a little roof, in front of the west gate.
    const RAM = { x: 70, y: 122 };
    add(RAM.y, () => {
      // A peaked shed on four wheels; the ram's iron head pokes out toward the gate.
      for (const wx of [-7, -1, 3]) for (const [dx, dy] of [[0, 0], [1, 0], [0, -1], [1, -1]]) op(RAM.x + wx + dx, RAM.y + dy, C('#1a120e'), 0);
      for (let x = -8; x <= 5; x++) for (let j = 2; j < 5; j++) op(RAM.x + x, RAM.y - j, C(j === 4 ? '#6a4a34' : '#3a2820'), j);
      for (let j = 0; j < 7; j++) for (let x = -9 + j; x <= 6 - j; x++) op(RAM.x + x - 1, RAM.y - 5 - j, C(j === 6 ? '#8a6a4a' : x < -2 + j * 0.2 ? '#6a4a34' : '#3a2820'), 5 + j);
      for (let x = 6; x <= 10; x++) { op(RAM.x + x, RAM.y - 4 - (x - 6) * 0.5, C(x > 8 ? '#c8d0e0' : '#5a3e2c'), 4); op(RAM.x + x, RAM.y - 3 - (x - 6) * 0.5, C(x > 8 ? '#6a7892' : '#3a2820'), 3); }
    });

    // 3. Iron Sentries: four small rook towers round the place.
    const SENT = STOPS[2];
    for (const [dx, dy] of [[-14, -15], [0, -19], [14, -14], [-22, 11]]) tower(SENT[0] + dx, SENT[1] + dy, 7, 11, IRON, { torch: [0, 2], window: [[0, 6]] });

    // 4. Without Towers: four empty plinths where rook towers stood, one broken stump.
    const EMPTY = STOPS[3];
    for (const [dx, dy, k] of [[-12, -15, 0], [0, -17, 2], [12, -17, 1], [24, -14, 3]]) add(EMPTY[1] + dy, () => {
      const x0 = EMPTY[0] + dx, y0 = EMPTY[1] + dy;
      for (let j = 0; j < 2; j++) for (let x = -4; x <= 4; x++) op(x0 + x, y0 - j, STONE[x < -2 ? 5 : 3], j);
      for (let d = 0; d < 4; d++) for (let x = -4; x <= 4; x++) op(x0 + x, y0 - 2 - d, d === 0 || d === 3 || Math.abs(x) > 2 ? STONE[x < -2 ? 5 : 4] : C('#07080e'), 2 + d);
      if (k === 1) for (let j = 0; j < 4; j++) for (let x = -2; x <= 2; x++) if (hash(x, j) > 0.25 || j < 2) op(x0 + x, y0 - 3 - j, IRON[x < 0 ? 4 : 2], 3 + j);
    });

    // 5. Hold the Gate: a barricade inside the east gate; the siege camp outside it.
    add(EG.y - 3, () => {
      for (let k = 0; k < 5; k++) for (let s = 0; s < 12; s++) op(EG.x - 7 + s, EG.y - 12 + (k * 2) + Math.round((s - 6) * (k % 2 ? 0.25 : -0.25)), C(k % 2 ? '#6a4a34' : '#4a3428'), 3);
    });
    const TENTS = [[282, 140], [302, 134], [272, 154], [300, 152]];
    for (const [tx, ty] of TENTS) add(ty, () => {
      for (let j = 0; j < 7; j++) for (let x = -6 + j * 0.85; x <= 6 - j * 0.85; x++) op(tx + x, ty - j, C(x < 0 ? '#a82a34' : '#6a1a28'), j);
      op(tx, ty - 7, C('#e8b040'), 7); op(tx, ty - 8, C('#e8b040'), 8);
      for (let j = 0; j < 3; j++) op(tx, ty - j, C('#140608'), j);
    });
    const CATA = { x: 246, y: 150 };
    add(CATA.y, () => {
      for (let x = -6; x <= 6; x++) { op(CATA.x + x, CATA.y - 2, C('#5a3e2c'), 2); op(CATA.x + x, CATA.y - 1, C('#3a2820'), 1); }
      for (const wx of [-5, 5]) op(CATA.x + wx, CATA.y, C('#1a120e'), 0);
      for (let j = 2; j < 7; j++) { op(CATA.x - 1, CATA.y - j, C('#4a3428'), j); op(CATA.x + 1, CATA.y - j, C('#4a3428'), j); }
    });
    const LADDERS = [[236, 128], [288, 110]];
    for (const [lx, ly] of LADDERS) add(ly, () => { for (let j = 0; j < 12; j++) { op(lx - 1, ly - j, C('#6a4a34'), j); op(lx + 2, ly - j, C('#6a4a34'), j); if (j % 3 === 0) { op(lx, ly - j, C('#4a3428'), j); op(lx + 1, ly - j, C('#4a3428'), j); } } });
    const CAMPFIRES = [[290, 146], [258, 138]];

    // 6. Forge Ingots: four glowing ingots dropped on the cobbles, a brazier and bellows.
    const INGOTS = [[222, 56], [252, 54], [250, 78], [224, 78]];
    for (const [ix, iy] of INGOTS) add(iy, () => { for (let x = -2; x <= 2; x++) { op(ix + x, iy, C('#7a2a10'), 0); op(ix + x, iy - 1, C(x < 0 ? '#ffe080' : '#ff9a30'), 1); } });
    const BELLOWS = { x: 272, y: 66 };
    add(BELLOWS.y, () => {
      for (let j = 0; j < 5; j++) for (let x = -2; x <= 2; x++) op(BELLOWS.x - 7 + x, BELLOWS.y - j, C(j > 3 ? '#8a6a4a' : x < 0 ? '#3a4052' : '#262a38'), j);
    });

    // Torches on posts along the road, braziers in the bailey.
    const POSTS = [[30, 150], [74, 138], [116, 110], [176, 126], [232, 124], [258, 64], [220, 70], [146, 72]];
    for (const [px, py] of POSTS) { add(py, () => { for (let j = 0; j < 7; j++) op(px, py - j, C('#2a1e1e'), j); op(px - 1, py - 7, C('#4a3a38'), 7); op(px + 1, py - 7, C('#4a3a38'), 7); }); TORCHES.push({ x: px, y: py - 8, p: px * 0.37, big: false }); }

    // Pines in the dark outside the walls.
    for (let k = 0; k < 260; k++) {
      const x = Math.round(hash(k, 301) * W), y = Math.round(hash(k, 302) * H);
      const i = y * W + x;
      if (insideOuter(x, y) || OW.D[i] < 13 || FREE[i] || y < 116) continue;
      let near = false;
      for (const [sx, sy] of STOPS) if (Math.hypot(x - sx, y - sy) < 22) near = true;
      if (Math.hypot(x - FORGE.x, y - FORGE.by) < 22 || x > 230 && y < 160 || Math.hypot(x - RAM.x, y - RAM.y) < 14) near = true;
      if (near || hash(k, 303) > 0.3 + noise2(x / 30, y / 30, 9) * 0.8) continue;
      const h = 6 + Math.round(hash(k, 304) * 5);
      add(y, () => {
        for (let j = 0; j < h; j++) {
          const hw = (1 - j / h) * h * 0.36 + ((j % 3) === 0 ? 0.5 : 0);
          for (let xx = Math.round(x - hw); xx <= Math.round(x + hw); xx++) op(xx, y - j, j === 0 ? C('#05060c') : C(xx < x - hw * 0.4 ? '#2a3c50' : xx < x + 0.5 ? '#16222e' : '#0c141e'), j);
        }
      });
    }

    DRAW.sort((a, b) => a.by - b.by);
    for (const d of DRAW) d.fn();

    // Moon shadows to the south-east.
    const SHM = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (!OBJ[i] || OH[i] < 0.6) continue;
      const x = i % W, y = i / W | 0, h = OH[i], by = y + h;
      for (let s = 0; s <= h; s += 0.7) {
        const sx = Math.round(x + s * SHX), sy = Math.round(by + s * SHY);
        if (sx >= 0 && sy >= 0 && sx < W && sy < H) SHM[sy * W + sx] = 1;
      }
    }
    for (let i = 0; i < N; i++) if (SHM[i] && !OBJ[i]) blend(BACK, i, C('#02030a'), 0.5);

    // ---------- the sky over the mountains, under the header ----------
    const SKYC = P('#04050c', '#06070f', '#0a0e1e', '#10182e', '#18243e');
    const RIDGE = x => 9 + 6 * noise2(x / 26, 0.5, 41) + 4 * noise2(x / 9, 1.5, 42);
    const MX = 262, MY = 7;
    const STARS = [];
    for (let x = 0; x < W; x++) {
      const ry = Math.round(RIDGE(x));
      for (let y = 0; y < ry; y++) if (!OBJ[y * W + x]) BACK[y * W + x] = ramp(SKYC, y / 16 + 0.3 * Math.exp(-sq((x - MX) / 40)), x, y);
      for (let y = ry; y < ry + 2; y++) if (!OBJ[y * W + x]) BACK[y * W + x] = C(y === ry ? '#3a4a6a' : '#1a2238');
      if (hash(x, 44) > 0.88 && ry > 5) STARS.push({ x, y: Math.floor(hash(x, 45) * (ry - 2)), k: 9 + (x % 19), p: hash(x, 46) * TAU });
    }
    const MOON = [];
    for (let y = 0; y < 16; y++) for (let x = MX - 8; x <= MX + 8; x++) {
      const d = Math.hypot(x - MX, y - MY);
      if (d < 5.5 && !OBJ[y * W + x]) MOON.push(y * W + x, C(d > 4.6 ? '#b8c4dc' : Math.hypot(x - MX - 1.5, y - MY + 1) < 1.5 ? '#d4dcee' : '#eef2fa'));
      else if (d < 10 && !OBJ[y * W + x]) blend(BACK, y * W + x, C('#3a4a7a'), 0.3 * (1 - d / 10));
    }

    // Warm pools of firelight, baked into the ground (the flames themselves flicker live).
    const pool = (x0, y0, r, c, a) => {
      for (let y = y0 - r; y <= y0 + r; y++) for (let x = x0 - r; x <= x0 + r; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const d = Math.hypot(x - x0, (y - y0) * 1.35) / r;
        if (d < 1) blend(BACK, y * W + x, C(c), a * (1 - d) * (1 - d));
      }
    };
    for (const T of TORCHES) pool(T.x, T.y + 6, 18, '#ff8a3a', 0.32);
    pool(FMOUTH.x, FMOUTH.y + 4, 34, '#ff7a2a', 0.45);
    for (const [cx, cy] of CAMPFIRES) pool(cx, cy, 20, '#ff8a3a', 0.4);
    for (const [ix, iy] of INGOTS) pool(ix, iy, 10, '#ff9a30', 0.35);
    pool(OG.x, OG.y, 22, '#6a9aff', 0.25);                            // the ghostly light in the open gate
    const WATERI = [];
    for (let i = 0; i < N; i++) { if (MASK[i] && BACK[i] !== MASKC[i]) MASK[i] = 0; if (MASK[i] === 2) WATERI.push(i); }
    const vignette = K.vignette(C('#02030a'), 0.42, 0.36);

    // Guards walking the outer wall walk.
    const WALK = OUTER.filter(([x]) => x > 4 && x < 316 && Math.abs(x - WG.x) > 12 && Math.abs(x - EG.x) > 12);

    // ---------- Rook-E, cel-shaded, redrawn each frame ----------
    const RW = 30, RH = 36, SPR = new Uint32Array(RW * RH), PART = new Uint8Array(RW * RH);
    const STEEL = P('#dce4ee', '#b0bccc', '#8a9ab0', '#6a7892', '#4e5a76', '#363e58', '#262a40');
    const CLOTH = P('#ff7a5a', '#e04a40', '#b02c36', '#861e30', '#5a1428');
    const GOLD = P('#fff0b0', '#f0c050', '#c08a38', '#8a5a2a', '#5a3622');
    const RLINE = C('#0a0812'), WARMR = C('#ffb070'), MOONR = C('#c0d4f4');
    const RLN = Math.hypot(0.6, 0.6, 0.53), RLX = -0.6 / RLN, RLY = -0.6 / RLN, RLZ = 0.53 / RLN;
    function rshade(x, y, nx, ny, part, T) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= RW || y >= RH) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), l = nx * RLX + ny * RLY + nz * RLZ, i = y * RW + x;
      SPR[i] = nx > 0.74 && l < 0.2 ? WARMR : nx < -0.8 ? MOONR : T[Math.round(clamp(1 - (l * 0.66 + 0.4)) * (T.length - 1))];
      PART[i] = part;
    }
    function rookE(u, beaten) {
      SPR.fill(0); PART.fill(0);
      const cx = 15, br = Math.sin(TAU * 20 * u) > 0.4 ? 1 : 0;
      // Base, body, tabard.
      for (let y = 30; y <= 34; y++) { const hw = 9 - (y === 30 ? 1 : 0) - (y === 34 ? 1 : 0); for (let x = cx - hw; x <= cx + hw; x++) rshade(x, y, (x - cx) / 10, y < 32 ? -0.6 : 0.1, 1, STEEL); }
      for (let y = 16 + br; y <= 30; y++) { const hw = 6 + (y > 26 ? (y - 26) * 0.5 : 0); for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) rshade(x, y, (x - cx) / (hw + 0.5), 0.05, 2, STEEL); }
      for (let y = 19 + br; y <= 29; y++) { const hw = 3.2 + (y - 19) * 0.12; for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) rshade(x, y, (x - cx) / (hw + 0.5) * 0.6, 0.05, 3, CLOTH); }
      // The turret head: a crenellated crown, a visor slit.
      for (let y = 4 + br; y <= 16 + br; y++) for (let x = cx - 7; x <= cx + 7; x++) {
        const top = y < 7 + br, notch = top && ((x - cx + 7) % 5 === 2 || (x - cx + 7) % 5 === 3);
        if (!notch) rshade(x, y, (x - cx) / 8, top ? -0.7 : -0.1, 4, STEEL);
      }
      // Arms crossed over the tabard, or lowered in a salute when beaten.
      if (!beaten) {
        for (let x = cx - 7; x <= cx + 7; x++) for (let y = 21 + br; y <= 23 + br; y++) rshade(x, y, (x - cx) / 9, (y - 22 - br) / 2, 5, STEEL);
        rshade(cx - 8, 22 + br, -0.9, 0, 5, STEEL); rshade(cx + 8, 22 + br, 0.9, 0, 5, STEEL);
      } else {
        for (let y = 18; y <= 27; y++) { rshade(cx - 8, y + br, -0.7, 0, 5, STEEL); rshade(cx - 7, y + br, -0.3, 0, 5, STEEL); }
        for (let k = 0; k < 7; k++) { rshade(cx + 7 - Math.round(k * 0.4), 20 - k + br, 0.5, -0.4, 5, STEEL); rshade(cx + 8 - Math.round(k * 0.4), 20 - k + br, 0.8, -0.4, 5, STEEL); }
      }
      for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
        const i = y * RW + x, p = PART[i];
        const a = x > 0 ? PART[i - 1] : 0, b = x < RW - 1 ? PART[i + 1] : 0, c = y > 0 ? PART[i - RW] : 0, d = y < RH - 1 ? PART[i + RW] : 0;
        if (!p) { if (a || b || c || d) SPR[i] = RLINE; }
        else if ((a && a < p) || (b && b < p) || (c && c < p) || (d && d < p)) SPR[i] = p === 3 ? CLOTH[4] : STEEL[5];
      }
      const pp = (x, y, c) => { if (x >= 0 && y >= 0 && x < RW && y < RH) SPR[y * RW + x] = c; };
      // Rivets, the gold emblem on the tabard (a little rook), the visor slit and its eyes.
      for (const [dx, dy] of [[-5, 9], [5, 9], [-5, 14], [5, 14]]) pp(cx + dx, dy + br, STEEL[0]);
      for (const [dx, dy] of [[-1, 25], [0, 25], [1, 25], [-1, 26], [0, 26], [1, 26], [-1, 24], [1, 24], [-1, 27], [0, 27], [1, 27]]) pp(cx + dx, dy + br, GOLD[dx < 0 ? 1 : 2]);
      const vy = 11 + br;
      for (let x = cx - 5; x <= cx + 5; x++) { pp(x, vy, C('#05060c')); pp(x, vy + 1, STEEL[1]); }
      const scan = beaten ? 0 : Math.round(Math.sin(TAU * 6 * u) * 2);
      const blink = frac(5 * u + 0.1) < 0.025;
      if (!blink) for (const ex of [cx - 2, cx + 2]) { pp(ex + scan, vy, C('#e8ffff')); pp(ex + scan + (ex < cx ? -1 : 1), vy, C('#5ae0ff')); }
      return vy;
    }

    const FL = P('#fff4c0', '#ffd060', '#ff8a2a', '#c83a1a');
    const CLOUDS = [0, 1].map(k => {
      const w = 110 + k * 30, h = 50 + k * 10, m = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const e = sq((x - w / 2) / (w / 2)) + sq((y - h / 2) / (h / 2));
        if ((1 - e) * 1.3 + (noise2(x / 14, y / 10, 60 + k) - 0.5) * 1.1 > 0.3 + bay(x, y) * 0.3) m.push(x, y);
      }
      return { m, y0: [60, 120][k], x0: k * 260 };
    });
    const EMBERS = Array.from({ length: 22 }, (_, i) => ({ x: FMOUTH.x - 6 + hash(i, 4) * 12, k: 4 + (i % 5), p: hash(i, 5), dr: hash(i, 6) * 30 }));
    const GHOSTSTEPS = Array.from({ length: 9 }, (_, k) => [Math.round(OG.x + 14 - k * 4), Math.round(OG.y + 10 - k * 1.6 + (k % 2 ? 1 : -1))]);

    function frame(t, state) {
      const u = t / LOOP, map = (state && state.map) || {}, cleared = map.cleared | 0, beaten = !!map.beaten;
      buf.set(BACK);
      for (const s of STARS) { const b = Math.sin(TAU * s.k * u + s.p); if (b > 0.3) put(buf, s.x, s.y, C(b > 0.85 ? '#ffffff' : '#8a9ac8')); }

      // The moat: a slow ripple, and the moon glinting in it.
      for (const i of WATERI) {
        const x = i % W, y = (i / W) | 0, g = Math.sin(TAU * 20 * u + hash(x >> 1, y) * TAU), r = Math.sin(x * 0.5 - TAU * 30 * u + y * 0.8);
        if (g > 0.993) buf[i] = C('#dce4f4'); else if (g > 0.98) buf[i] = C('#6a82b0'); else if (r > 0.9) blend(buf, i, C('#2a3c60'), 0.5);
      }

      // The forge: the mouth breathes, coals glow, the smith's hammer strikes the anvil.
      const beat = frac(80 * u), strike = beat < 0.08;
      const fb = 0.75 + 0.15 * Math.sin(TAU * 17 * u) + 0.1 * Math.sin(TAU * 71 * u) + (strike ? 0.2 : 0);
      glow(buf, FMOUTH.x, FMOUTH.y - 2, 22, C('#ff8a3a'), 0.3 * fb);
      for (let x = FMOUTH.x - 5; x <= FMOUTH.x + 5; x++) for (let y = FMOUTH.y - 2; y <= FMOUTH.y + 1; y++) {
        const hot = Math.sin(TAU * (9 + (x % 4) * 3) * u + x * 1.7 + y) * 0.5 + 0.5;
        put(buf, x, y, FL[(x + y) % 4 === 0 ? 3 : hot > 0.7 ? 0 : hot > 0.35 ? 1 : 2]);
      }
      for (let i = 0; i < 3; i++) K.flame(buf, FMOUTH.x - 4 + i * 3, FMOUTH.y - 2, 3, 4 * fb, u, i * 2.3);
      glow(buf, ANVIL.x, ANVIL.y - 5, 12, C('#ffb060'), strike ? 0.5 : 0.1);
      for (let i = 0; i < 12; i++) {
        const age = beat * 1.5, a = -Math.PI / 2 + (hash(i, 50) - 0.5) * 2.4, sp = 14 + hash(i, 51) * 20;
        if (age > 0.6) break;
        put(buf, ANVIL.x + Math.cos(a) * sp * age, ANVIL.y - 5 + Math.sin(a) * sp * age + 30 * age * age, C(age < 0.25 ? '#fff6c0' : '#ff9a40'));
      }
      {
        const hy = strike ? ANVIL.y - 6 : ANVIL.y - 11 - Math.round(Math.sin(Math.PI * beat) * 2);
        K.line(buf, ANVIL.x + 3, hy, ANVIL.x + 7, hy + 4, C('#5a3a2a')); K.rect(buf, ANVIL.x + 1, hy - 1, 4, 2, C('#a8b4c8'));
      }
      for (let i = 0; i < 12; i++) {
        const v = frac(10 * u + i / 12), x = CHIM.x + v * 12 + Math.sin(v * 5 + i) * 1.5, y = CHIM.y - v * 20, r = 0.8 + v * 3;
        for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) if (sq(xx - x) + sq(yy - y) <= r * r) blendAt(buf, xx, yy, C(v < 0.3 ? '#5a4a52' : '#2a3044'), (1 - v) * 0.32);
      }
      for (const e of EMBERS) {
        const v = frac(e.k * u + e.p), x = e.x + Math.sin(v * 8 + e.dr) * 3 + v * 8, y = FMOUTH.y - 4 - v * 40;
        if (v < 0.8) put(buf, x, y, C(v < 0.3 ? '#ffd070' : v < 0.6 ? '#ff8a30' : '#a83a20'));
      }
      // Torches, windows, campfires, the bellows and the ingots.
      TORCHES.forEach(T => {
        const f = 0.8 + 0.2 * Math.sin(TAU * 61 * u + T.p) * Math.sin(TAU * 19 * u + T.p);
        glow(buf, T.x, T.y, 9, C('#ff9a40'), 0.35 * f);
        K.flame(buf, T.x - 1, T.y + 1, 3, 4, u, T.p);
      });
      WINDOWS.forEach((w, n) => {
        const f = 0.5 + 0.3 * Math.sin(TAU * 29 * u + n * 2) + 0.2 * Math.sin(TAU * 73 * u + n);
        put(buf, w.x, w.y, C(f > 0.7 ? '#ffd080' : f > 0.35 ? '#ffa850' : '#d86a30')); put(buf, w.x, w.y + 1, C('#d86a30'));
      });
      for (const [cx, cy] of CAMPFIRES) { K.flame(buf, cx - 2, cy, 5, 6, u, cx); for (let x = -3; x <= 3; x++) put(buf, cx + x, cy + 1, C('#3a2018')); }
      {
        const pump = Math.round((Math.sin(TAU * 40 * u) * 0.5 + 0.5) * 2);
        for (let x = -3; x <= 3; x++) put(buf, BELLOWS.x + x, BELLOWS.y - 3 - pump + Math.abs(x) * 0.3, C('#8a6a4a'));
        for (let x = -3; x <= 3; x++) put(buf, BELLOWS.x + x, BELLOWS.y - 1, C('#5a3e2c'));
        for (let j = 0; j < 2 - pump + 1; j++) put(buf, BELLOWS.x - 4, BELLOWS.y - 2 - j, C('#3a2820'));
        const bf = 0.7 + 0.3 * Math.sin(TAU * 40 * u);
        glow(buf, BELLOWS.x - 7, BELLOWS.y - 6, 8, C('#ff8a3a'), 0.3 * bf);
        K.flame(buf, BELLOWS.x - 9, BELLOWS.y - 5, 5, 4 + 2 * bf, u, 3);
      }
      INGOTS.forEach(([x, y], k) => { const f = 0.5 + 0.5 * Math.sin(TAU * 8 * u + k * 1.7); if (f > 0.6) { put(buf, x - 1, y - 1, C('#fffbe0')); put(buf, x, y - 1, C('#fff0a0')); } glow(buf, x, y - 1, 5, C('#ffb040'), 0.25 * f); });
      // The catapult's arm swinging back and throwing.
      {
        const v = frac(5 * u), a = v < 0.75 ? -0.3 - v / 0.75 * 1.1 : -1.4 + (v - 0.75) / 0.25 * 2.2;
        for (let r = 0; r <= 9; r += 0.5) put(buf, CATA.x + Math.cos(a - Math.PI / 2) * r * 0.9, CATA.y - 6 + Math.sin(a - Math.PI / 2) * r, C('#6a4a34'));
        if (v > 0.75 && v < 0.95) { const s = (v - 0.75) / 0.2; put(buf, CATA.x - 4 - s * 20, CATA.y - 16 - Math.sin(s * Math.PI) * 14, C('#c8b0a0')); }
      }
      // Banners on the towers.
      for (const B of BANNERS) for (let j = 0; j < 9; j++) for (let i = 0; i < 4; i++) {
        const wave = Math.round(Math.sin(TAU * 20 * u - j * 0.5 + B.p) * (j / 9) * 1.4);
        if (j > 6 && Math.abs(i - 1.5) < j - 6) continue;
        put(buf, B.x + i + wave, B.y + j, C(i === 0 || i === 3 ? '#e8b040' : j === 3 ? '#e8b040' : wave > 0 ? '#a82a34' : '#7a1e2e'));
      }
      // Guards on the wall walk.
      for (let g = 0; g < 2; g++) {
        const v = frac(2 * u + g * 0.5), s = v < 0.5 ? v * 2 : 2 - v * 2, k = Math.floor(s * (WALK.length - 1)), [gx, gy] = WALK[k];
        const x = Math.round(gx), y = Math.round(gy) - 12, step = Math.floor(t * 4 + g) % 2;
        put(buf, x, y - 3, C('#c8d0e0')); put(buf, x, y - 2, C('#10121c')); put(buf, x, y - 1, C('#10121c')); put(buf, x - 1 + step, y, C('#10121c')); put(buf, x + 1 - step, y, C('#10121c'));
        put(buf, x + 1, y - 5, C('#8a96aa')); put(buf, x + 1, y - 4, C('#3a4050'));
      }

      // The Open Gate: a memory. Ghostly light spills out, footprints glow one by one.
      {
        const f = 0.6 + 0.25 * Math.sin(TAU * 6 * u);
        glow(buf, OG.x, OG.y - 4, 12, C('#8ab8ff'), 0.35 * f);
        for (let j = 0; j < 9; j++) for (let x = OG.x - 3; x <= OG.x + 3; x++) blendAt(buf, x, OG.y - j, C('#a8c8ff'), 0.25 * f + (j < 2 ? 0.2 : 0));
        const walk = frac(4 * u) * (GHOSTSTEPS.length + 3);
        GHOSTSTEPS.forEach(([x, y], k) => {
          const age = walk - k, a = age > 0 && age < 3 ? 1 - age / 3 : 0.3;
          blendAt(buf, x, y, C('#dff0ff'), 0.4 + 0.6 * a); blendAt(buf, x + 1, y, C('#8ab8ff'), 0.3 + 0.5 * a);
        });
      }

      // Pennants on cleared places.
      for (let k = 0; k < Math.min(cleared, 7); k++) {
        const [sx, sy] = STOPS[k], fx = sx + 13, fy = sy - 3;
        for (let j = 0; j < 9; j++) put(buf, fx, fy - j, C('#8a96aa'));
        for (let j = 0; j < 3; j++) for (let i = 1; i <= 4 - j; i++) put(buf, fx + i, fy - 8 + j + Math.round(Math.sin(TAU * 30 * u - i * 0.8 + k) * 0.6), C(j === 1 ? '#e8b040' : '#a82a34'));
      }

      // Rook-E before the keep's gate, lit by the gate torches, a shadow cast behind.
      {
        if (beaten) glow(buf, KGATE.x, KGATE.y - 6, 14, C('#ffb060'), 0.35);
        const vy = rookE(u, beaten);
        const X0 = KGATE.x - 15, Y0 = KGATE.y + 11 - RH + 1;
        for (let s = 0; s < 10; s++) for (let w = -2; w <= 2; w++) blendAt(buf, KGATE.x + 3 + s * 0.8, KGATE.y + 11 + s * 0.4 + w * 0.5, C('#02030a'), 0.45 * (1 - s / 10));
        for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) { const v = SPR[y * RW + x]; if (v) put(buf, X0 + x, Y0 + y, v); }
        glow(buf, X0 + 15, Y0 + vy, 7, C('#5ae0ff'), beaten ? 0.15 : 0.3);
        // A glint crossing the turret now and then.
        const g = frac(3 * u);
        if (g < 0.1) { const gx = X0 + 8 + Math.round(g * 140); put(buf, gx, Y0 + 7, C('#ffffff')); put(buf, gx + 1, Y0 + 8, C('#dce4ee')); }
      }

      // Moonlit cloud shadows sliding over the fortress.
      for (const c of CLOUDS) {
        const X = Math.round(frac(c.x0 / 520 + u) * 520) - 150, Y = c.y0 + Math.round(Math.sin(TAU * u) * 5);
        for (let k = 0; k < c.m.length; k += 2) {
          const x = X + c.m[k], y = Y + c.m[k + 1];
          if (x >= 0 && y >= 0 && x < W && y < H) blend(buf, y * W + x, C('#02030a'), 0.22);
        }
      }
      vignette(buf);
      for (let k = 0; k < MOON.length; k += 2) buf[MOON[k]] = MOON[k + 1];
    }

    return (t, out, state) => { buf = out; frame(t, state); };
  },
});
