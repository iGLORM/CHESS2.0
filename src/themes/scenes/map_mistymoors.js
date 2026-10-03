// The Misty Moors: World 5's local map, where the world-map zoom lands.
//
// 320x200, shown at 4x. A bird's-eye adventure map of the Moors before dawn, the moon low
// in the strip of sky at the top: rolling moor shaded like hills from above, purple heather,
// a loch with the moon in it, bog pools, and banks of teal fog drifting over everything
// (thinned around each stop so the markers stay readable). A pale stony track winds from
// the Iron Keep road on the left to the Knight of the Mist's crag on the right, with a
// boardwalk across the marsh. One landmark per stop:
//   1 Fogbank            a hollow brimming with fog; one real wisp among false ones
//   2 Knight Riddles     the ruined watchtower, its lantern lit, crows on the parapet
//   3 Will-o'-Wisps      the marsh: pools, reeds, wisps dancing over the water
//   4 Ghost Riders       a ring of standing stones; four phantom knights ride round it
//   5 Lost in the Mist   a barrow mound; two cold eyes blink in its doorway
//   6 Wisp Lanterns      four lantern posts, unlit (Glimmer flits between them) until cleared
//   7 A Light in the Fog glowing footprints and a ghostly lantern: the night of the crossing
//   8 the lair           the knight crag; the Knight of the Mist paces at its foot with the
//                        Mist Lantern, half hidden in fog (waves it when beaten)
// State (LiveScenes.setState('map_mistymoors', { map: { cleared, beaten } })): cleared
// stops get a lantern-coloured pennant, the lanterns light at 6. Every motion runs a whole
// number of cycles per loop, so the 120 s loop is seamless.
LiveScenes.register({
  id: 'map_mistymoors',
  width: 320,
  height: 200,
  loop: 120,
  still: 24,
  stops: [[34, 134], [66, 92], [108, 120], [150, 80], [184, 128], [228, 100], [252, 140], [282, 100]],
  create() {
    const W = 320, H = 200, N = W * H, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, noise2, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, rect, line, glow } = K;
    const STOPS = LiveScenes.get('map_mistymoors').stops;
    let buf = null;

    const BASE = new Uint32Array(N);           // everything static, opaque
    const KIND = new Uint8Array(N);            // 1 grass, 2 heather, 3 water, 4 path, 5 clearing, 6 object
    const P = h => h.map(C);
    // Like ramp, but the dithered seam between two bands is narrow, so broad gentle
    // slopes read as clean bands instead of fields of checkerboard.
    const band = (cols, t, x, y, w = 0.22) => {
      t = clamp(t) * (cols.length - 1);
      const i = t | 0, f = clamp((t - i - 0.5) / w + 0.5);
      return cols[Math.min(cols.length - 1, i + (f > bay(x, y) ? 1 : 0))];
    };

    // ---------- palette ----------
    const SKY = P(['#0a1220', '#101c2e', '#182a3c', '#22384a', '#34505a', '#4e6a66', '#7a8e78', '#a8ae88']);
    const HZC = '#5e807e';
    const hazed = (list, a) => P(list.map(h => mix(h, HZC, a)));
    const GR0 = ['#4a6e62', '#34584a', '#26443c', '#1a3230', '#102424'], HE0 = ['#76588c', '#5e4676', '#4a3862', '#382c50', '#282240'];
    const GRASS = [P(GR0), hazed(GR0, 0.3), hazed(GR0, 0.55)];
    const HEATH = [P(HE0), hazed(HE0, 0.3), hazed(HE0, 0.55)];
    const WATER = P(['#5a7e84', '#3e5e68', '#2c4652', '#1e3240', '#142432']);
    const STONE = P(['#9ab4ae', '#7a9894', '#5a7676', '#40585c', '#2a3c42', '#1a262c']);
    const PATH = P(['#a4ac9c', '#8a9488', '#747e74', '#5e6862']);
    const PATHE = C('#1c2826'), PATHD = C('#4a524e');
    const PLANK = P(['#9a8870', '#7a6a58', '#5a4c42']), GAP = C('#141a1e');
    const CLEAR = P(['#8a9a88', '#7a8a7a', '#6a7a6e', '#5a6a62']);
    const LINE = C('#0a1014'), SHAD = C('#0c1418');
    const FOG = C('#a4ccc4'), FOGD = C('#6a9894'), WISP = C('#9ff0d0'), WISPW = C('#f0fff8');
    const LAMP = P(['#fff4c0', '#ffd070', '#ffa040', '#c86a28']);
    const PENNANT = P(['#ffc060', '#e08a30', '#8a4a20']);

    // ---------- sky strip and horizon (under the header) ----------
    const MX = 44, MY = 11;
    const hz = x => Math.round(27 + 3 * Math.sin(x / 31 + 1) + 3 * fbm1(x / 24, 5) - 4 * Math.exp(-sq((x - 300) / 30)));
    for (let y = 0; y < 44; y++) for (let x = 0; x < W; x++) {
      const dawn = 0.22 * Math.exp(-sq((x - 300) / 90)), dm = Math.hypot(x - MX, y - MY);
      BASE[y * W + x] = ramp(SKY, y / 36 + dawn + 0.18 * Math.exp(-sq(dm / 16)), x, y);
    }
    for (let y = MY - 8; y <= MY + 8; y++) for (let x = MX - 8; x <= MX + 8; x++) {
      const dx = x - MX, dy = y - MY, d = Math.hypot(dx, dy) / 7;
      if (d <= 1) put(BASE, x, y, C(d > 0.86 ? '#a8c4c0' : dx + dy > 3 ? '#c8dcd4' : '#eef8f0'));
    }
    put(BASE, MX + 2, MY - 2, C('#c8dcd4')); put(BASE, MX - 3, MY + 1, C('#c8dcd4'));
    // Far hills: two hazy ridges, the far one paler.
    const ridge1 = x => Math.round(hz(x) - 7 - 5 * fbm1(x / 40, 8) - 3 * Math.sin(x / 19));
    for (let x = 0; x < W; x++) {
      const r1 = ridge1(x);
      for (let y = r1; y < hz(x); y++) BASE[y * W + x] = y === r1 ? C('#5a7a78') : ramp(P(['#40605e', '#34524e', '#2c4846']), (y - r1) / 8, x, y);
    }

    // ---------- terrain ----------
    const HT = new Float32Array(N);
    const KNOLLS = [[186, 106, 15, 9, 0.5], [20, 116, -16, 8, -0.4], [296, 70, 22, 18, 0.35], [120, 50, 30, 10, 0.2]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let h = 0.55 * noise2(x / 46, y / 28, 1) + 0.28 * noise2(x / 21, y / 13, 2);
      for (const [kx, ky, rx, ry, a] of KNOLLS) h += a * Math.exp(-sq((x - kx) / Math.abs(rx)) - sq((y - ky) / ry));
      HT[y * W + x] = h;
    }
    // Water: the loch (upper left) and bog pools.
    const POOLS = [[86, 134, 12, 4.5], [130, 110, 10, 3.6], [128, 138, 9, 4], [88, 112, 7, 3], [144, 126, 6, 2.6],
      [214, 146, 8, 3], [270, 124, 5, 2.4], [164, 108, 6, 2.5], [20, 160, 12, 4], [300, 160, 10, 4], [240, 60, 7, 2.6]];
    const isWater = (x, y) => {
      const lx = (x - 64) / 62, ly = (y - 44) / 11 + (noise2(x / 12, y / 6, 9) - 0.5) * 0.9;
      if (y >= hz(x) + 2 && lx * lx + ly * ly < 1) return true;
      if (DSW[y * W + x] < 0.8 + clamp((y - 50) / 120) * 1.6) return true;          // the burn
      for (const [px, py, rx, ry] of POOLS) if (sq((x - px) / rx) + sq((y - py) / ry) + (noise2(x / 4, y / 3, 11) - 0.5) * 0.6 < 1) return true;
      return false;
    };

    // ---------- the trail ----------
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
    const S = STOPS;
    const TRAIL = spline([[-6, 152], [14, 146], S[0], [44, 112], S[1], [86, 96], [94, 114], S[2], [124, 104], [132, 86], S[3],
      [168, 94], [170, 116], S[4], [202, 122], [210, 104], S[5], [240, 114], [236, 132], S[6], [268, 132], [276, 116], S[7]]);
    // Distance to the trail (and the nearest sample, for the boardwalk's planks): chamfer.
    const DT = new Float32Array(N).fill(999), DI = new Int32Array(N).fill(-1), ARC = new Float32Array(TRAIL.length);
    for (let i = 1; i < TRAIL.length; i++) ARC[i] = ARC[i - 1] + Math.hypot(TRAIL[i][0] - TRAIL[i - 1][0], TRAIL[i][1] - TRAIL[i - 1][1]);
    TRAIL.forEach(([x, y], k) => { const xi = Math.round(x), yi = Math.round(y); if (xi >= 0 && yi >= 0 && xi < W && yi < H) { DT[yi * W + xi] = 0; DI[yi * W + xi] = k; } });
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
    chamfer(DT, DI);
    // A burn runs out of the loch, under the trail and down into the marsh.
    const DSW = new Float32Array(N).fill(999);
    for (const [x, y] of spline([[100, 48], [101, 62], [93, 76], [91, 90], [88, 104], [84, 118], [90, 130], [80, 150], [72, 172], [66, 204]]))
      { const xi = Math.round(x), yi = Math.round(y); if (xi >= 0 && yi >= 0 && xi < W && yi < H) DSW[yi * W + xi] = 0; }
    chamfer(DSW, null);
    const DS = new Float32Array(N), SI = new Uint8Array(N);   // distance to the nearest stop
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let best = 999, bi = 0;
      S.forEach(([sx, sy], k) => { const d = Math.hypot(x - sx, (y - sy) * 1.15); if (d < best) { best = d; bi = k; } });
      DS[y * W + x] = best; SI[y * W + x] = bi;
    }

    // ---------- paint the ground ----------
    const WATER_IDX = [], HEATH_IDX = [], HCOL = new Map();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const top = hz(x);
      if (y < top) continue;
      const i = y * W + x;
      const h = HT[i], hx = HT[i + (x < W - 1 ? 1 : 0)] - HT[i - (x > 0 ? 1 : 0)], hy = y < H - 1 ? HT[i + W] - HT[i - W] : 0;
      const l = clamp((hx * 0.8 + hy * 0.9) * 38, -1, 1);                 // lit where the ground faces the moon
      const haze = clamp((58 - y) / 30) * 2;
      const lv = Math.min(2, Math.floor(haze + 0.5 + (bay(x, y) - 0.5) * 0.3));
      const moonlit = 0.2 * Math.exp(-sq((x - 60) / 110) - sq((y - 60) / 70));
      const tone = 0.52 - l * 0.5 - moonlit + x / W * 0.12 + clamp((y - 130) / 70) * 0.35;
      if (isWater(x, y)) {
        const edge = !isWater(x, y - 1);
        BASE[i] = edge ? STONE[4] : band(WATER, 0.15 + (y - top) / 300 + (isWater(x, y - 2) ? 0.2 : 0), x, y);
        KIND[i] = 3; WATER_IDX.push(i); HCOL.set(i, BASE[i]);
        continue;
      }
      const heather = noise2(x / 24, y / 13, 7) + (noise2(x / 7, y / 5, 8) - 0.5) * 0.25 > 0.64;
      if (heather) { BASE[i] = band(HEATH[lv], tone, x, y); KIND[i] = 2; if (hash(x, y + 7) > 0.93 && lv === 0) { HEATH_IDX.push(i); HCOL.set(i, BASE[i]); } }
      else BASE[i] = band(GRASS[lv], tone, x, y), KIND[i] = 1;
      // Tufts: now and then a darker pixel with a lit one above it.
      if (hash(x, y + 91) > 0.988 && y > 44) { BASE[i] = (heather ? HEATH : GRASS)[lv][4]; if (y > 0) BASE[i - W] = (heather ? HEATH : GRASS)[lv][1]; }
    }
    // Moonlit crests: a pale pixel where a lit slope tips over into shade.
    for (let y = 40; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if ((KIND[i] !== 1 && KIND[i] !== 2) || (KIND[i + W] !== 1 && KIND[i + W] !== 2)) continue;
      const l0 = (HT[i + 1] - HT[i - 1]) * 0.8 + (HT[i + W] - HT[i - W]) * 0.9, l1 = (HT[i + W + 1] - HT[i + W - 1]) * 0.8 + (HT[i + 2 * W] - HT[i]) * 0.9;
      if (l0 > 0.006 && l1 <= 0.006 && y < 140) BASE[i] = (KIND[i] === 2 ? HEATH : GRASS)[y < 50 ? 1 : 0][0];
    }
    // Shore line: a pale rim where water meets land on the lit side.
    for (const i of WATER_IDX) { const x = i % W; if (x > 0 && KIND[i - 1] !== 3 && KIND[i - 1]) BASE[i - 1] = STONE[2]; }

    // The trail: stony track, a boardwalk where it crosses water.
    for (let i = 0; i < N; i++) {
      const d = DT[i], x = i % W, y = (i / W) | 0;
      if (d > 3.6 || y < hz(x)) continue;
      const wet = KIND[i] === 3;
      if (wet) {
        const k = DI[i], a = ARC[Math.max(0, k)];
        if (d < 3.2) BASE[i] = d > 2.5 ? C('#2a221e') : frac(a / 2.2) < 0.3 ? GAP : ramp(PLANK, 0.1 + d * 0.2 + hash(Math.floor(a / 2.2), 3) * 0.4, x, y);
        continue;
      }
      if (d < 2.3) BASE[i] = hash(x >> 1, y >> 1) > 0.9 ? PATHD : ramp(PATH, 0.1 + d * 0.22 + (hash(x, y) > 0.92 ? 0.35 : 0), x, y), KIND[i] = 4;
      else if (d < 3.3) BASE[i] = PATHE, KIND[i] = 4;
    }
    // Clearings at the stops: worn ground with a ring of small stones.
    for (let i = 0; i < N; i++) {
      const d = DS[i], x = i % W, y = (i / W) | 0;
      if (d > 11) continue;
      const [sx, sy] = S[SI[i]], dx = (x - sx) / 11, dy = (y - sy) / 9;
      if (d < 10) { BASE[i] = ramp(PATH, 0.62 + (dx + dy) * 0.25 + (hash(x >> 1, y >> 1) > 0.88 ? 0.25 : 0), x, y); KIND[i] = 5; }
      else BASE[i] = PATHE, KIND[i] = 5;
    }

    // ---------- static objects (painter's order by base y) ----------
    const OBJ = [];
    const shadowEllipse = (b, cx, cy, rx, ry, a) => {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
        if (sq((x - cx) / rx) + sq((y - cy) / ry) <= 1) blendAt(b, x, y, SHAD, a);
    };
    // A standing stone (3/4 view): lit left face, dark right, top cap.
    function stone(b, x, y, w, h, seed) {
      shadowEllipse(b, x + w / 2 + 3, y + 1, w / 2 + 3, 1.6, 0.5);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const rel = i / Math.max(1, w - 1);
        let c = j === 0 ? STONE[0] : rel < 0.34 ? STONE[1] : rel > 0.7 ? STONE[4] : STONE[3];
        if (hash(x + i, y - j + seed) > 0.88 && j > 0) c = C('#3e5a48');                     // lichen
        put(b, x + i, y - j, c);
      }
      for (let j = -1; j <= h; j++) { put(b, x - 1, y - j, LINE); put(b, x + w, y - j, LINE); }
      for (let i = 0; i < w; i++) { put(b, x + i, y - h, LINE); put(b, x + i, y + 1, LINE); }
    }
    // A bare, twisted tree.
    function deadTree(b, x, y) {
      shadowEllipse(b, x + 4, y + 1, 5, 1.5, 0.45);
      for (const [x0, y0, x1, y1] of [[0, 0, -1, -12], [-1, -7, -6, -12], [-1, -10, 4, -16], [-6, -12, -8, -15], [4, -16, 7, -17], [-1, -12, -2, -18]])
        { line(b, x + x0, y + y0, x + x1, y + y1, C('#10181c')); line(b, x + x0 + 1, y + y0, x + x1 + 1, y + y1, C('#26343a')); }
    }
    OBJ.push({ y: 60, f: b => deadTree(b, 132, 60) }, { y: 104, f: b => deadTree(b, 16, 104) }, { y: 150, f: b => deadTree(b, 160, 150) });

    // 2: the ruined watchtower (a round tower in 3/4: stones, broken crown, a lit window).
    const TW = { x: 44, y: 80, r: 7, h: 26 };
    OBJ.push({ y: TW.y, f(b) {
      const { x: cx, y: by, r, h } = TW;
      shadowEllipse(b, cx + 9, by + 1, 12, 3, 0.55);
      for (let y = by - h; y <= by + 2; y++) for (let x = cx - r; x <= cx + r; x++) {
        const dx = (x - cx) / r, bottom = by + Math.sqrt(Math.max(0, 1 - dx * dx)) * 2.4;
        const topEdge = by - h + Math.sqrt(Math.max(0, 1 - dx * dx)) * 2.4 - (dx > 0.1 ? Math.round(4 + 3 * Math.sin(x * 1.7)) : 0);
        if (y > bottom || y < topEdge) continue;
        const brick = ((x + (Math.floor(y / 3) % 2) * 2) % 4 === 0) || y % 3 === 0;
        let c = dx < -0.45 ? STONE[1] : dx > 0.55 ? STONE[4] : STONE[3];
        if (brick) c = dx < -0.45 ? STONE[2] : STONE[5];
        if (hash(x >> 1, y >> 1) > 0.84 && dx > -0.3) c = C('#2e4a38');                  // ivy
        put(b, x, y, c);
      }
      // The broken top: the inside of the far wall, lit.
      for (let x = cx - r + 1; x < cx + 1; x++) { put(b, x, by - h + 1, STONE[0]); put(b, x, by - h + 2, STONE[5]); }
      rect(b, cx - 1, by - 3, 3, 5, C('#070b0e'));                                       // door
      for (let y = by - h - 1; y <= by + 3; y++) for (let x = cx - r - 1; x <= cx + r + 1; x++) {
        const i = y * W + x; if (x < 0 || y < 0 || x >= W || y >= H) continue;
      }
    } });
    const TWIN = { x: TW.x - 2, y: TW.y - 17 };                                          // lantern window
    const TWTOP = [[TW.x - 5, TW.y - TW.h], [TW.x - 1, TW.y - TW.h - 1], [TW.x + 3, TW.y - TW.h + 4]];

    // 4: the ring of standing stones round the clearing.
    const RING = { x: S[3][0], y: S[3][1], rx: 25, ry: 15 };
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI / 2 + k * TAU / 9;
      if (Math.sin(a) > 0.55) continue;                                                  // keep the front open
      const x = Math.round(RING.x + Math.cos(a) * RING.rx), y = Math.round(RING.y + Math.sin(a) * RING.ry);
      OBJ.push({ y, f: b => stone(b, x - 1, y, 3, 6 + (k % 3) * 2, k) });
    }
    OBJ.push({ y: RING.y - RING.ry - 1, f(b) {                                            // a trilithon at the back
      stone(b, RING.x - 5, RING.y - RING.ry + 1, 3, 9, 20); stone(b, RING.x + 3, RING.y - RING.ry + 1, 3, 9, 21);
      for (let x = RING.x - 6; x <= RING.x + 6; x++) { put(b, x, RING.y - RING.ry - 9, LINE); put(b, x, RING.y - RING.ry - 8, STONE[1]); put(b, x, RING.y - RING.ry - 7, STONE[3]); put(b, x, RING.y - RING.ry - 6, LINE); }
    } });

    // 5: the barrow: a grass dome with a stone doorway on its front.
    const BW = { x: 186, y: 107 };
    OBJ.push({ y: BW.y + 8, f(b) {
      shadowEllipse(b, BW.x + 5, BW.y + 7, 18, 4, 0.4);
      for (let y = BW.y - 10; y <= BW.y + 7; y++) for (let x = BW.x - 18; x <= BW.x + 18; x++) {
        const dx = (x - BW.x) / 18, dy = (y - BW.y - 7) / 17;
        if (dx * dx + dy * dy > 1 || y > BW.y + 7) continue;
        const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy)), l = -dx * 0.6 - dy * 0.5 + nz * 0.4;
        let c = ramp(GRASS[0], 0.75 - l * 0.6, x, y);
        if (dx * dx + dy * dy > 0.86) c = GRASS[0][5];
        if (hash(x, y + 3) > 0.9) c = HEATH[0][2];
        put(b, x, y, c);
      }
      // Doorway: two uprights and a lintel, darkness inside.
      rect(b, BW.x - 3, BW.y - 1, 7, 7, C('#05080a'));
      for (let y = BW.y - 2; y <= BW.y + 6; y++) { put(b, BW.x - 4, y, STONE[1]); put(b, BW.x + 4, y, STONE[3]); }
      for (let x = BW.x - 5; x <= BW.x + 5; x++) { put(b, x, BW.y - 3, STONE[0]); put(b, x, BW.y - 2, STONE[3]); }
      for (let x = BW.x - 4; x <= BW.x + 4; x++) put(b, x, BW.y + 7, STONE[4]);
    } });

    // 6: four lantern posts (the lanterns themselves are drawn per frame).
    const LANTERNS = [[-16, -10], [16, -10], [-15, 11], [15, 11]].map(([dx, dy]) => ({ x: S[5][0] + dx, y: S[5][1] + dy }));
    for (const L of LANTERNS) OBJ.push({ y: L.y, f(b) {
      shadowEllipse(b, L.x + 3, L.y + 1, 3, 1, 0.5);
      for (let j = 0; j <= 7; j++) { put(b, L.x, L.y - j, C('#3a2e28')); put(b, L.x + 1, L.y - j, C('#1a1412')); }
      put(b, L.x + 2, L.y - 7, C('#3a2e28'));
    } });

    // 3: reeds round the marsh pools.
    for (let k = 0; k < 40; k++) {
      const pl = POOLS[k % 5], a = hash(k, 51) * TAU, x = Math.round(pl[0] + Math.cos(a) * (pl[2] + 1)), y = Math.round(pl[1] + Math.sin(a) * (pl[3] + 0.5));
      if (DT[y * W + x] < 4 || DS[y * W + x] < 15) continue;
      OBJ.push({ y, f: b => { const hh = 2 + (hash(k, 52) * 3 | 0); for (let j = 0; j < hh; j++) put(b, x, y - j, j === hh - 1 ? C('#8a9a60') : C('#3a5040')); if (k % 3 === 0) put(b, x, y - hh, C('#5a3a2a')); } });
    }
    // Boulders scattered over the moor.
    function boulder(b, x, y, w, h) {
      shadowEllipse(b, x + w / 2 + 2, y + 1, w / 2 + 2, 1.5, 0.5);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const e = sq((i - (w - 1) / 2) / (w / 2)) + sq((j - h + 0.5) / h);
        if (e > 1.05) continue;
        put(b, x + i, y - j, j >= h - 1 ? STONE[1] : i < w * 0.35 ? STONE[2] : i > w * 0.7 ? STONE[4] : STONE[3]);
      }
    }
    for (let k = 0; k < 26; k++) {
      const x = 6 + (hash(k, 61) * 308 | 0), y = 44 + (hash(k, 62) * 146 | 0), i = y * W + x;
      if (y < hz(x) + 4 || DT[i] < 6 || DS[i] < 18 || KIND[i] === 3) continue;
      const w = 3 + (hash(k, 63) * 3 | 0);
      OBJ.push({ y, f: b => boulder(b, x, y, w, 2 + (w > 4 ? 1 : 0)) });
    }
    // Heather bushes in drifts: round clumps, lit on top, a few in bloom.
    const HB = P(['#a07ab2', '#825e98', '#664a7e', '#4a3662']);
    for (let k = 0; k < 150; k++) {
      const x = 4 + (hash(k, 71) * 312 | 0), y = 44 + (hash(k, 72) * 150 | 0), i = y * W + x;
      if (y < hz(x) + 6 || DT[i] < 5 || DS[i] < 16 || KIND[i] === 3 || noise2(x / 24, y / 13, 7) < 0.5) continue;
      const r = 1.5 + hash(k, 73) * 1.5;
      OBJ.push({ y, f: b => {
        blendAt(b, x + 2, y + 1, SHAD, 0.4);
        for (let yy = Math.floor(y - r * 1.6); yy <= y; yy++) for (let xx = Math.floor(x - r - 1); xx <= x + r + 1; xx++) {
          const dx = (xx - x) / (r + 0.6), dy = (yy - y + r * 0.8) / (r * 0.9);
          const e = dx * dx + dy * dy;
          if (e > 1) continue;
          put(b, xx, yy, e > 0.7 && dy > 0 ? HB[3] : dx + dy < -0.5 ? HB[0] : dx + dy < 0.3 ? HB[1] : HB[2]);
        }
      } });
    }

    // 8: the knight crag: a pinnacle of rock whose top is a horse's head in profile.
    const CRAG = { x: 300, y: 92 };
    OBJ.push({ y: CRAG.y - 2, f(b) {
      const head = [
        '.......xxxx.....', '.....xxxxxxxx...', '....xxxxxxxxxxx.', '...xxxx.xxxxxxxx', '..xxxxxxxxxxxxxx',
        '.xxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxx..xxxxxxxxx', 'xx.....xxxxxxxxx', '......xxxxxxxxxx',
        '.....xxxxxxxxxxx', '....xxxxxxxxxxxx', '...xxxxxxxxxxxxx', '..xxxxxxxxxxxxxx'];
      const x0 = 282, y0 = 34, s = 2;
      const M = new Uint8Array(W * H);
      head.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'x') for (let a = 0; a < s; a++) for (let c = 0; c < s; c++) M[(y0 + j * s + c) * W + x0 + i * s + a] = 1; }));
      for (let y = y0 + 14 * s; y < CRAG.y; y++) {
        const w = 12 + (y - y0 - 14 * s) * 0.55;
        for (let x = Math.round(x0 + 16 - w * 0.7); x < Math.min(W, x0 + 30 + (y - y0 - 28) * 0.4); x++) M[y * W + x] = 1;
      }
      shadowEllipse(b, 300, CRAG.y, 26, 4, 0.5);
      for (let y = y0 - 1; y < CRAG.y + 1; y++) for (let x = 262; x < W; x++) {
        const i = y * W + x;
        if (!M[i]) { if (M[i + 1] || M[i - 1] || M[i + W] || (y > 0 && M[i - W])) b[i] = LINE; continue; }
        const lit = !M[i - 1] || !M[i - 2];
        let lx = 0; while (lx < 6 && M[i - lx - 1]) lx++;
        let c = lx < 1 ? STONE[1] : lx < 3 ? STONE[3] : !M[i + 1] ? STONE[5] : STONE[4];
        if (!M[i - W]) c = STONE[0];
        if (noise2(x / 5, y / 3, 44) > 0.7 && lx >= 3) c = C('#243832');
        b[i] = c;
      }
      put(b, x0 + 7 * s + 1, y0 + 3 * s + 1, C('#9ff0d0'));
    } });

    // A shepherd's bothy: stone walls, a turf roof, one warm window.
    const BOTHY = { x: 200, y: 66 };
    OBJ.push({ y: BOTHY.y, f(b) {
      const { x: x0, y: by } = BOTHY;
      shadowEllipse(b, x0 + 10, by + 1, 11, 2, 0.5);
      for (let y = by - 6; y <= by; y++) for (let x = x0; x < x0 + 15; x++) put(b, x, y, (y - by) % 3 === 0 || (x + (y >> 1)) % 5 === 0 ? STONE[4] : x < x0 + 3 ? STONE[2] : STONE[3]);
      for (let j = 0; j < 6; j++) for (let x = x0 - 1 + j; x <= x0 + 15 - j; x++) put(b, x, by - 7 - j, j === 5 ? C('#5a6a3a') : x < x0 + 7 ? C('#4a5a34') : C('#34422a'));
      for (let x = x0 - 1; x <= x0 + 15; x++) put(b, x, by - 6, C('#1a2018'));
      rect(b, x0 + 10, by - 16, 2, 5, STONE[3]); put(b, x0 + 10, by - 16, STONE[1]);
      rect(b, x0 + 2, by - 3, 2, 4, C('#0a0c0e'));
      for (let x = x0 - 1; x <= x0 + 16; x++) put(b, x, by + 1, LINE);
    } });
    const BWIN = { x: BOTHY.x + 7, y: BOTHY.y - 4 }, BCHIM = { x: BOTHY.x + 11, y: BOTHY.y - 17 };

    OBJ.sort((a, b) => a.y - b.y);
    for (const o of OBJ) o.f(BASE);
    for (let i = 0; i < N; i++) if (!BASE[i]) BASE[i] = GRASS[0][3];
    // Effects only on pixels nothing was painted over.
    const HEATH_FX = HEATH_IDX.filter(i => KIND[i] === 2 && BASE[i] === HCOL.get(i));
    const WATER_FX = WATER_IDX.filter(i => KIND[i] === 3 && BASE[i] === HCOL.get(i));

    // Fog is thinned near the stops so the markers stay readable.
    const FOGK = new Float32Array(N);
    // ...and it lies thickest in the low ground.
    for (let i = 0; i < N; i++) FOGK[i] = clamp((DS[i] - 9) / 16) * (i / W < 34 ? 1.3 : 0.3 + 0.9 * clamp((0.62 - HT[i]) / 0.3));

    // ---------- animated ----------
    const STARS = Array.from({ length: 30 }, (_, i) => ({ x: hash(i, 1) * W | 0, y: hash(i, 2) * 20 | 0, k: 7 + (i % 17), p: hash(i, 3) * TAU }))
      .filter(s => Math.hypot(s.x - MX, s.y - MY) > 11 && s.y < hz(s.x) - 9);
    const GLINT = WATER_FX.filter(i => DT[i] > 3);
    const LOCH_MOON = WATER_FX.filter(i => { const x = i % W, y = (i / W) | 0; return Math.abs(x - MX - (y - 34) * 0.1) < 5 && y < 60; });
    const vignette = K.vignette(C('#04080c'), 0.3, 0.5);

    // Cloud shadows: soft-edged blobs, built once.
    const HZ = Array.from({ length: W }, (_, x) => hz(x));
    const CLOUDS = [0, 1, 2].map(c => {
      const rx = 40 - c * 6, ry = 12, w = rx * 2 + 1, h = ry * 2 + 1, a = new Float32Array(w * h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const e = sq((i - rx) / rx) + sq((j - ry) / ry) + (noise2(i / 9, j / 5, c) - 0.5) * 0.7;
        a[j * w + i] = e < 0.7 ? 0.22 : e < 1 ? 0.12 : 0;
      }
      return { rx, ry, w, h, a, cy: 70 + c * 34 };
    });
    // Looping 2D value noise (x wraps every `per` units) on a coarse grid, for the fog.
    const GX = 82, GY = 52, FG = new Float32Array(GX * GY);
    function nloop(x, y, seed, per) {
      const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), m = n => ((n % per) + per) % per;
      const h = (a, b2) => hash(m(a) + seed * 1013, b2);
      return (h(i, j) * (1 - ux) + h(i + 1, j) * ux) * (1 - uy) + (h(i, j + 1) * (1 - ux) + h(i + 1, j + 1) * ux) * uy;
    }
    function fogField(u) {
      for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
        const x = gx * 4, y = gy * 4;
        FG[gy * GX + gx] = 0.6 * nloop(x / 44 + 10 * u, y / 20, 1, 10) + 0.4 * nloop(x / 20 - 20 * u, y / 11 + 3, 2, 20);
      }
    }
    function fog(t, u) {
      fogField(u);
      for (let y = 22; y < H; y++) {
        const gy = y >> 2, fy = (y & 3) / 4, row = y * W;
        for (let x = 0; x < W; x++) {
          const k = FOGK[row + x];
          if (k <= 0) continue;
          const gx = x >> 2, fx = (x & 3) / 4, g = gy * GX + gx;
          const f = (FG[g] * (1 - fx) + FG[g + 1] * fx) * (1 - fy) + (FG[g + GX] * (1 - fx) + FG[g + GX + 1] * fx) * fy;
          const a = clamp((f - 0.44) * 3) * k;
          if (a <= 0) continue;
          const lvl = Math.floor(a * 3 + 0.5 + (bay(x, y) - 0.5) * 0.3);
          if (lvl > 0) blend(buf, row + x, y > 124 ? FOGD : FOG, lvl * 0.2);
        }
      }
    }

    // Small figures, from ASCII rows: each letter is a material; shaded by where a pixel sits
    // across its row (the moon lights the left), outlined in LINE.
    function figure(rows, mats, X, Y, flip, out) {
      const h = rows.length, w = rows[0].length;
      const at = (i, j) => { if (j < 0 || j >= h || i < 0 || i >= w) return '.'; return rows[j][flip ? w - 1 - i : i]; };
      for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
        const ch = at(i, j), x = X + i, y = Y + j;
        if (ch === '.') { if (at(i - 1, j) !== '.' || at(i + 1, j) !== '.' || at(i, j - 1) !== '.' || at(i, j + 1) !== '.') put(out, x, y, LINE); continue; }
        const m = mats[ch];
        if (!m) continue;
        if (m.length === 1) { put(out, x, y, m[0]); continue; }
        let l = i, r = i; while (at(l - 1, j) !== '.') l--; while (at(r + 1, j) !== '.') r++;
        const rel = r > l ? (i - l) / (r - l) : 0.5, n = m.length;
        let k = Math.round(clamp(rel * 0.9 + j / h * 0.25) * (n - 2));
        if (i === l && n > 2) k = 0;
        put(out, x, y, i === r && r > l ? m[n - 1] : m[Math.min(n - 2, k)]);
      }
    }
    // The Knight of the Mist, facing left: steel horse helm, amber eye, dark hood and cloak.
    const KNIGHT = [
      '.......cc.c........',
      '......cccccc.......',
      '.....ssccccccc.....',
      '....sssscccccccc...',
      '...ssskkesccccccc..',
      '..ssssssssscccccc..',
      '.sssssssssssccccc..',
      'sssssssssssscccccc.',
      'ssss..ssssssscccccc',
      '.ss....sssssscccccc',
      '.......sssssscccccc',
      '......bbbbbbbcccccc',
      '.....ggggggggcccccc',
      '......bbbbbbbbcccc.',
      '......bbbbbbbbbccc.',
      '.....bbbbbbbbbbccc.',
      '.....bbbbbbbbbbbcc.',
      '....bbbbbbbbbbbbbc.',
      '...gggggggggggggg..',
      '..bbbbbbbbbbbbbbbb.',
      '..bbbbbbbbbbbbbbbb.',
      '...bbbbbbbbbbbbbb..'];
    const KMATS = {
      s: P(['#eeeaf6', '#c4bcdc', '#9a90bc', '#6e6498', '#8ae0cc']),
      c: P(['#3e3272', '#2c2258', '#201a44', '#161032', '#4e9a94']),
      b: P(['#b08acc', '#8a62b2', '#6a4696', '#4e3278', '#8ae0cc']),
      g: P(['#d8d0ec', '#a098c0', '#6e6498', '#4a4270', '#8ae0cc']),
      k: [C('#0c0814')], e: [C('#ffcc00')],
    };

    function frame(t, state) {
      const u = t / LOOP;
      const M = (state && state.map) || {}, cleared = M.cleared | 0, beaten = !!M.beaten;
      buf.set(BASE);
      for (const s of STARS) { const v = Math.sin(TAU * s.k * u + s.p); if (v > 0.3) put(buf, s.x, s.y, C(v > 0.9 ? '#e8fff4' : '#6a8a90')); }
      // Moon on the loch, and slow glints over all the water.
      for (const i of LOCH_MOON) { const y = (i / W) | 0; if (Math.sin(y * 2.3 + TAU * 20 * u + (i % W) * 0.7) > 0.1) buf[i] = C(y < 44 ? '#c8e0d8' : '#8ab8b8'); }
      for (const i of GLINT) if (Math.sin(TAU * 17 * u + hash(i % W >> 1, (i / W) | 0) * TAU) > 0.975) buf[i] = C('#9ac4c4');
      // Heather stirs in the wind.
      for (const i of HEATH_FX) if (Math.sin(TAU * 18 * u - (i % W) * 0.08 + ((i / W) | 0) * 0.2) > 0.8) buf[i] = C('#b27cc0');
      // Cloud shadows drift over the moor.
      CLOUDS.forEach((cl, c) => {
        const X = Math.round(frac(u + c / 3) * (W + 160) - 80 - cl.rx), Y = Math.round(cl.cy - cl.ry);
        for (let j = 0; j < cl.h; j++) { const y = Y + j; if (y < 34 || y >= H) continue;
          for (let i = 0; i < cl.w; i++) { const x = X + i, a = cl.a[j * cl.w + i]; if (a && x >= 0 && x < W && y >= HZ[x]) blend(buf, y * W + x, SHAD, a); } }
      });

      // 1: the Fogbank: fog brims in the hollow, one real wisp among faint false ones.
      const FB = { x: 20, y: 116 };
      for (let y = FB.y - 7; y <= FB.y + 7; y++) for (let x = FB.x - 16; x <= FB.x + 16; x++) {
        const e = sq((x - FB.x) / 15) + sq((y - FB.y) / 6.5), sw = Math.sin(TAU * 6 * u + x * 0.3 - y * 0.5) * 0.08;
        if (e < 1) blendAt(buf, x, y, e + sw < 0.55 ? FOG : FOGD, e + sw < 0.55 ? 0.55 : 0.4);
      }
      for (let k = 0; k < 4; k++) {
        const a = TAU * (2 * u + k / 4), x = FB.x + Math.cos(a) * 9, y = FB.y + Math.sin(a) * 3.5;
        const real = k === 0, v = Math.sin(TAU * (9 + k * 3) * u + k);
        if (v > -0.3) { glow(buf, x, y - 2, real ? 7 : 4, WISP, real ? 0.35 : 0.18); put(buf, x, y - 2, real ? WISPW : C('#5ab8a0')); if (real) { put(buf, x, y - 3, WISPW); put(buf, x - 1, y - 1, WISP); put(buf, x + 1, y - 1, WISP); } }
      }
      // 2: the tower's lantern flickers, crows circle and settle on the parapet.
      const f = 0.75 + 0.15 * Math.sin(TAU * 47 * u) + 0.1 * Math.sin(TAU * 113 * u);
      glow(buf, TWIN.x + 1, TWIN.y + 1, 14, LAMP[2], 0.3 * f);
      rect(buf, TWIN.x, TWIN.y, 2, 3, f > 0.84 ? LAMP[0] : LAMP[1]);
      for (let c = 0; c < 3; c++) {
        const v = frac(3 * u + c / 3), flying = v < 0.5, perch = TWTOP[c];
        let x, y;
        if (flying) { const a = TAU * v * 4 + c * 2; x = TW.x + Math.cos(a) * (14 + c * 4); y = TW.y - 34 + Math.sin(a) * 5 - c * 2; }
        else { x = perch[0]; y = perch[1] - 1; }
        const up = flying && Math.sin(TAU * 160 * u + c) > 0;
        const pts = flying ? (up ? [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]] : [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]]) : [[0, 0], [0, -1], [1, -1], [-1, 0]];
        for (const [dx, dy] of pts) put(buf, x + dx, y + dy, C('#04060a'));
      }
      // The bothy's window glows and its chimney smokes.
      { const fw = 0.8 + 0.2 * Math.sin(TAU * 37 * u + 1) * Math.sin(TAU * 11 * u);
        glow(buf, BWIN.x + 1, BWIN.y + 1, 10, LAMP[2], 0.25 * fw); rect(buf, BWIN.x, BWIN.y, 3, 2, fw > 0.9 ? LAMP[0] : LAMP[1]);
        for (let k = 0; k < 7; k++) { const v = frac(5 * u + k / 7), r = 1 + v * 3.5; K.glow(buf, BCHIM.x + v * 14, BCHIM.y - v * 14, r + 1.5, C('#8aa4a0'), (1 - v) * 0.4); } }
      // 3: will-o'-wisps dance over the marsh pools.
      for (let k = 0; k < 4; k++) {
        const pl = POOLS[k], b = Math.sin(TAU * (6 + k) * u + k * 1.7);
        if (b < -0.25) continue;
        const x = pl[0] + pl[2] * 0.8 * Math.sin(TAU * (1 + k % 2) * u + k), y = pl[1] - 4 + 2 * Math.sin(TAU * (3 + k) * u + k * 2);
        glow(buf, x, y, 7, WISP, 0.32 * (b + 0.25));
        put(buf, x, y, WISPW); blendAt(buf, x - Math.cos(TAU * (1 + k % 2) * u + k) * 2, y + 1, WISP, 0.5);
      }
      // 4: the phantom riders gallop round the stone ring (four knights, see-through).
      for (let k = 0; k < 4; k++) {
        const a = TAU * (3 * u + k / 4), x = RING.x + Math.cos(a) * (RING.rx + 6), y = RING.y + Math.sin(a) * (RING.ry + 5) + 2;
        const dir = -Math.sin(a) > 0 ? 1 : -1, bob = Math.round(Math.sin(TAU * 90 * u + k * 1.3));
        const shape = ['...xx..', '..xxxx.', '.xxxxxx', 'xx.xxxx', '...xxx.', '..xxxx.', '.xxxxx.'];
        shape.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'x') blendAt(buf, x + (dir > 0 ? i - 3 : 3 - i), y - 8 + j + bob, j < 2 ? WISPW : WISP, 0.7); }));
        put(buf, x + dir, y - 6 + bob, C('#ffcc00'));
        for (let j = 1; j <= 4; j++) blendAt(buf, x - dir * (3 + j * 2), y - 4 + bob + (j & 1), WISP, 0.4 - j * 0.08);
      }
      // 5: cold eyes blink in the barrow's doorway; fog creeps round it.
      if (frac(4 * u + 0.3) > 0.06) { put(buf, BW.x - 1, BW.y + 2, C('#bfeaff')); put(buf, BW.x + 1, BW.y + 2, C('#bfeaff')); }
      glow(buf, BW.x, BW.y + 2, 6, C('#6ab0d8'), 0.15);
      // 6: the Wisp Lanterns: unlit (Glimmer flits between them) until the stop is cleared.
      const lit = cleared >= 6;
      LANTERNS.forEach((L, n) => {
        const fl = 0.8 + 0.2 * Math.sin(TAU * (41 + n * 6) * u + n);
        rect(buf, L.x - 1, L.y - 10, 4, 1, LINE); rect(buf, L.x - 1, L.y - 6, 4, 1, LINE);
        rect(buf, L.x - 1, L.y - 9, 4, 3, LINE);
        if (lit) { glow(buf, L.x + 1, L.y - 8, 10, LAMP[2], 0.28 * fl); rect(buf, L.x, L.y - 9, 2, 3, fl > 0.9 ? LAMP[0] : LAMP[1]); }
        else rect(buf, L.x, L.y - 9, 2, 3, C('#1e3a3a'));
      });
      if (!lit) {
        const v = frac(6 * u), n = Math.floor(v * 4), s2 = frac(v * 4), A = LANTERNS[n], B = LANTERNS[(n + 1) % 4];
        const x = A.x + (B.x - A.x) * s2 + 1, y = A.y - 8 + (B.y - A.y) * s2 - Math.sin(Math.PI * s2) * 6;
        glow(buf, x, y, 6, WISP, 0.35); put(buf, x, y, WISPW);
      }
      // 8: the Knight of the Mist paces at the foot of his crag, the Mist Lantern in hand.
      const G = S[7];
      const pace = beaten ? 0 : Math.round(3 * Math.sin(TAU * 3 * u)), facing = beaten ? false : Math.cos(TAU * 3 * u) > 0;
      const bob = Math.sin(TAU * 30 * u) > 0.3 ? 1 : 0;
      const KX = G[0] - 9 + pace, KY = G[1] - 31 + bob;
      glow(buf, G[0], G[1] - 18, 20, C('#9ab8c8'), 0.12);
      figure(KNIGHT, KMATS, KX, KY, facing, buf);
      glow(buf, facing ? KX + 11 : KX + 7, KY + 4, 5, C('#ffcc00'), 0.35);
      // The mist mane streams off the hood.
      for (let k = 0; k < 10; k++) {
        const v = frac(8 * u + k / 10), dir = facing ? 1 : -1;
        const x = KX + (facing ? 2 : 16) - dir * v * 14 + Math.sin(TAU * 24 * u + k) * 0.8, y = KY + 3 + k % 4 * 2 - v * 6;
        blendAt(buf, x, y, C('#c8e4ec'), 0.75 * (1 - v)); blendAt(buf, x, y + 1, C('#9ab8c8'), 0.4 * (1 - v));
      }
      // Cloak hem flutters.
      for (let j = 0; j < 3; j++) if (Math.sin(TAU * 20 * u + j * 2) > 0) put(buf, facing ? KX - 1 : KX + 19, KY + 12 + j * 2, KMATS.c[2]);
      // The eye blinks now and then.
      if (frac(5 * u + 0.4) < 0.03) put(buf, facing ? KX + 18 - 8 : KX + 8, KY + 4, KMATS.k[0]);
      // The Mist Lantern: held out front, swinging; raised and waved when he is beaten.
      const hx = facing ? KX + 20 : KX - 2, hy = KY + 15;
      const sw = beaten ? Math.sin(TAU * 20 * u) * 3 : Math.sin(TAU * 12 * u) * 1.2;
      const lx = hx + (facing ? 1 : -1) + sw, ly = beaten ? KY + 2 : hy + 3;
      line(buf, hx, beaten ? KY + 9 : hy, lx, ly - 2, C('#2a2238'));
      glow(buf, lx, ly, 16, LAMP[2], 0.32 * f);
      rect(buf, lx - 1, ly - 1, 3, 4, LINE); put(buf, lx, ly, f > 0.85 ? LAMP[0] : LAMP[1]); put(buf, lx, ly + 1, LAMP[1]); put(buf, lx, ly - 2, C('#8a7a6a'));
      // Fog pools round his feet (thinner once he has been beaten).
      for (let k = 0; k < 6; k++) {
        const x = G[0] - 14 + k * 6 + Math.sin(TAU * 4 * u + k) * 3, y = G[1] - 10 + (k & 1);
        for (let dy = -2; dy <= 2; dy++) for (let dx = -6; dx <= 6; dx++)
          if (sq(dx / 6) + sq(dy / 2.4) < 1 && bay(x + dx, y + dy) < (beaten ? 0.35 : 0.7)) blendAt(buf, x + dx, y + dy, FOG, 0.35);
      }

      // Pennants on cleared stops.
      for (let k = 0; k < Math.min(cleared, 7); k++) {
        const [sx, sy] = S[k], px = sx + 12, py = sy - 12;
        for (let j = 0; j < 8; j++) put(buf, px, py + j, C('#2a1e18'));
        for (let j = 0; j < 3; j++) for (let i = 1; i <= 4 - j; i++) put(buf, px + i + (Math.sin(TAU * 24 * u - i + k) > 0.3 ? 0 : 0), py + j + (i > 2 && Math.sin(TAU * 24 * u - i * 0.8 + k) > 0 ? 1 : 0), PENNANT[j === 0 ? 0 : 1]);
      }
      // Fog over everything, drifting; thinner near the stops.
      fog(t, u);
      // 7: a memory: footprints glow one after another as a ghostly lantern walks them in.
      const STEPS = 9;
      for (let k = 0; k < STEPS; k++) {
        const s2 = k / (STEPS - 1), x = 300 - s2 * 36 + (k & 1) * 1.5, y = 124 + s2 * 14 + (k & 1 ? 1.5 : -1.5);
        const age = frac(2 * u - s2 * 0.35);
        const a = age < 0.5 ? 0.9 * (1 - age * 2) : 0;
        if (a > 0.05) { blendAt(buf, x, y, WISPW, a); blendAt(buf, x + 1, y, WISP, a * 0.8); blendAt(buf, x, y + 1, WISP, a * 0.5); }
      }
      { const v = frac(2 * u), s2 = clamp(v / 0.35), x = 300 - s2 * 36, y = 124 + s2 * 14 - 7 + Math.sin(TAU * 8 * u);
        if (v < 0.42) { glow(buf, x, y, 8, LAMP[1], 0.25 * (1 - v)); put(buf, x, y, LAMP[0]); put(buf, x, y - 2, C('#8a7a6a')); } }
      vignette(buf);
    }

    return (t, out, state) => { buf = out; frame(t, state); };
  },
});
