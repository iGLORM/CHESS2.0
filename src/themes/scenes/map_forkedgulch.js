// Forked Gulch, the place map: World 9 seen from above at sunset.
//
// A red-rock plateau cut by a winding canyon that forks in two, seen from high up
// (a 3/4 bird's-eye map: every rock has a height, cliffs show their striped faces, the
// low sun in the notch of the forked butte on the horizon throws long purple shadows).
// Two stops: the Shootout in the frontier town's plaza, under the great wanted-poster
// bracket board, and ForkMaster's Two Prongs Saloon where the canyon forks.
// Moves: a steam train crosses the two trestles, smoke trailing; the town windmill turns;
// tumbleweeds roll down the canyon trail; hawks circle with their shadows sliding over the
// rock; a dust devil wanders the town basin; posters flap on the board and a loose one
// blows down the street; the camp fire burns and smokes; horses flick their tails in the
// corral; saloon doors swing and windows flicker; dust blows off the rims; clouds drift in
// the sunset; ForkMaster paces his porch, chews his straw and twirls his fork.
// State: { map: { cleared, beaten } } from the map screen: a cleared Shootout pins a gold
// star on your poster and plants a flag; a beaten ForkMaster stops pacing and waves his hat.
LiveScenes.register({
  id: 'map_forkedgulch',
  width: 320,
  height: 200,
  loop: 120,
  still: 30,
  stops: [[112, 117], [248, 94]],
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const hyp = (a, b) => Math.sqrt(a * a + b * b);
    // PixelKit.noise2, inlined (same values, much faster over whole-map loops).
    function noise2(x, y, seed = 0) {
      const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, s = seed * 1013;
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      const a = hash(i + s, j), b = hash(i + 1 + s, j), c = hash(i + s, j + 1), d = hash(i + 1 + s, j + 1);
      return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
    }
    const { put, blendAt, line, glow } = K;
    const STOPS = LiveScenes.get('map_forkedgulch').stops;
    let buf = null;

    // Ground grid: gx = screen x, gy = depth. A ground point at height h shows at
    // screen (gx, gy - h). Rows below the screen feed the cliffs that rise into view.
    const HZ = 30, GH = H + 26, N = W * GH;
    const HT = new Float32Array(N), OHT = new Float32Array(N), GT = new Uint8Array(N);
    const T_TOP = 0, T_TALUS = 1, T_FLOOR = 2, T_TRAIL = 3, T_EDGE = 4, T_BED = 5, T_CLEAR = 6, T_STREET = 7, T_RAIL = 8, T_TIE = 9, T_STONE = 10;

    // ---------- curves ----------
    function spline(pts, step = 0.6) {
      const out = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        const n = Math.max(2, Math.ceil(hyp(p2[0] - p1[0], p2[1] - p1[1]) / step));
        for (let k = 0; k < n; k++) {
          const t = k / n, t2 = t * t, t3 = t2 * t;
          const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
          out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        }
      }
      out.push(pts[pts.length - 1].slice());
      return out;
    }
    // Stamp min(distance - w) of a curve into E.
    const E = new Float32Array(N).fill(99);
    function carve(samples, w, R = w + 10) {
      for (const [sx, sy] of samples) for (let y = Math.floor(sy - R); y <= sy + R; y++) {
        if (y < 0 || y >= GH) continue;
        for (let x = Math.floor(sx - R); x <= sx + R; x++) {
          if (x < 0 || x >= W) continue;
          const i = y * W + x, dx = x - sx, dy = y - sy, d2 = dx * dx + dy * dy, cur = E[i] + w;
          if (cur > 0 && d2 >= cur * cur) continue;
          const v = Math.sqrt(d2) - w;
          if (v < E[i]) E[i] = v;
        }
      }
    }
    function basin(cx, cy, rx, ry) {
      for (let y = 0; y < GH; y++) for (let x = 0; x < W; x++) {
        const v = (hyp((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry), i = y * W + x;
        if (v < E[i]) E[i] = v;
      }
    }

    // ---------- the land: mesas, the forking canyon, two basins ----------
    const CANYON = spline([[104, 116], [138, 121], [158, 131], [180, 131], [195, 117], [199, 100], [212, 89], [232, 87], [246, 84]]);
    const BRANCH_A = spline([[238, 70], [226, 58], [218, 46], [214, 34], [212, 20]]);
    const BRANCH_B = spline([[256, 70], [270, 58], [284, 47], [296, 36], [306, 20]]);
    const SW = spline([[30, 124], [16, 142], [4, 158], [-10, 170]]);
    const SOUTH = spline([[176, 132], [170, 156], [174, 180], [168, 230]]);
    carve(CANYON, 11); carve(BRANCH_A, 8); carve(BRANCH_B, 8); carve(SW, 9); carve(SOUTH, 7);
    basin(72, 112, 62, 27);         // the town basin
    basin(247, 84, 32, 22);         // the fork, where the saloon stands
    const RAILY = 50;
    const BUTTES = [[62, 66, 12, 28], [300, 122, 12, 32], [44, 182, 14, 30], [216, 172, 11, 30]];
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < W; gx++) {
      const i = gy * W + gx;
      // A few big high mesas (never near the railway), the rest one level of plateau.
      const n = noise2(gx / 64, gy / 40, 3) * 0.8 + noise2(gx / 18, gy / 12, 4) * 0.2;
      let plat = n > 0.6 && gy > RAILY + 14 ? 17 : 10;
      const e = E[i] + (noise2(gx / 5, gy / 5, 9) - 0.5) * 3.2;
      let h = plat;
      if (e < 0) h = 0;
      else if (e < 3) h = e * 1.1;
      else if (e < 6 && noise2(gx / 20, gy / 20, 5) > 0.62) h = Math.min(plat, 6);
      // Tall buttes standing alone, Monument Valley style, with a scree apron.
      for (const [bx, by, br, bh] of BUTTES) {
        const q = hyp((gx - bx) / br, (gy - by) / (br * 0.6)) + (noise2(gx / 3, gy / 3, 29) - 0.5) * 0.25;
        if (q < 1) h = Math.max(h, bh); else if (q < 1.5) h = Math.max(h, (h > 5 ? h : 0) + (1.5 - q) * 7);
      }
      HT[i] = h;
      GT[i] = h <= 0 ? T_FLOOR : h < 4 ? T_TALUS : T_TOP;
    }

    // ---------- ground marks: street, trail, riverbed, clearings, rails ----------
    function stamp(samples, r, type, only) {
      for (const [sx, sy] of samples) for (let y = Math.floor(sy - r); y <= sy + r; y++) for (let x = Math.floor(sx - r); x <= sx + r; x++) {
        if (x < 0 || y < 0 || x >= W || y >= GH || hyp(x - sx, y - sy) > r) continue;
        const i = y * W + x;
        if (!only || only(GT[i], i)) GT[i] = type;
      }
    }
    const floorish = g => g === T_FLOOR || g === T_TALUS;
    // Dry riverbed winding down the canyon floor and out through the south-west.
    const BED = spline([[250, 90], [228, 92], [206, 94], [192, 110], [190, 124], [172, 136], [150, 132], [132, 128], [110, 130], [80, 128], [52, 128], [30, 130], [14, 146], [0, 160]]);
    stamp(BED, 1.3, T_BED, floorish);
    // Main street through the town.
    const STREET = spline([[20, 109], [60, 108], [100, 110]]);
    stamp(STREET, 5.2, T_EDGE, g => g !== T_TOP); stamp(STREET, 4.2, T_STREET);
    // The trail: from the Shootout plaza down the canyon to the saloon.
    const TRAIL = spline([STOPS[0], [128, 121], [146, 128], [166, 133], [186, 127], [196, 113], [201, 99], [214, 92], [232, 93], STOPS[1]]);
    stamp(TRAIL, 2.3, T_EDGE, g => g !== T_STREET); stamp(TRAIL, 1.3, T_TRAIL);
    for (const [sx, sy] of STOPS) { stamp([[sx, sy]], 11, T_EDGE, g => g !== T_STREET && g !== T_TRAIL); stamp([[sx, sy]], 10, T_CLEAR, g => g !== T_STREET); }
    for (const [sx, sy] of STOPS) for (let a = 0; a < TAU; a += 0.21) { const x = Math.round(sx + Math.cos(a) * 11), y = Math.round(sy + Math.sin(a) * 11); if (hash(x, y) > 0.35 && GT[y * W + x] !== T_TRAIL && GT[y * W + x] !== T_STREET) GT[y * W + x] = T_STONE; }
    // Stepping stones where the trail crosses the riverbed.
    for (let i = 0; i < N; i++) if (GT[i] === T_TRAIL) {
      const x = i % W, y = (i / W) | 0;
      for (const [bx, by] of BED) if (Math.abs(bx - x) < 2 && Math.abs(by - y) < 2) { if (hash(x, y) > 0.5) GT[i] = T_STONE; break; }
    }
    // Rails across the plateau top (trestles over the canyons are objects).
    for (let gx = 0; gx < W; gx++) for (const gy of [RAILY - 1, RAILY + 1]) { const i = gy * W + gx; if (HT[i] > 8) GT[i] = T_RAIL; }
    for (let gx = 0; gx < W; gx += 3) for (let gy = RAILY - 2; gy <= RAILY + 2; gy++) { const i = gy * W + gx; if (HT[i] > 8 && GT[i] !== T_RAIL) GT[i] = T_TIE; }

    // ---------- objects: footprints first (they cast shadows), drawn after the land ----------
    const OBJ = [];
    function solid(x0, x1, gb, gf, hh) { for (let y = gb; y < gf; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && x < W && y >= 0 && y < GH) OHT[y * W + x] = Math.max(OHT[y * W + x], hh); }
    // Town: north row faces the street, south row shows its backs.
    const NORTH_ROW = [[26, 39, 93, 102, 9, 5, '#6a3a4a'], [41, 51, 95, 102, 8, 3, '#5e3a52'], [53, 67, 91, 102, 12, 3, '#6e3e44'], [69, 80, 95, 102, 8, 4, '#5a3446']];
    const SOUTH_ROW = [[30, 42, 116, 122, 8, '#523046'], [46, 58, 116, 123, 9, '#5a3448'], [62, 72, 116, 121, 7, '#4e2e44']];
    for (const [x0, x1, gb, gf, hh, p] of NORTH_ROW) solid(x0, x1, gb, gf, hh + p);
    for (const [x0, x1, gb, gf, hh] of SOUTH_ROW) solid(x0, x1, gb, gf, hh);
    const BOARD = { x0: 96, x1: 128, gy: 101, hh: 19 };
    solid(BOARD.x0, BOARD.x1, BOARD.gy - 1, BOARD.gy + 1, BOARD.hh);
    const SALOON = { x0: 230, x1: 265, gb: 61, gf: 70, hh: 13, p: 9 };
    solid(SALOON.x0, SALOON.x1, SALOON.gb, SALOON.gf, SALOON.hh + SALOON.p);
    const TOWER = { x: 90, gy: 126 }; solid(TOWER.x - 5, TOWER.x + 5, TOWER.gy - 3, TOWER.gy, 18);
    const MILL = { x: 16, gy: 116 }; solid(MILL.x - 1, MILL.x + 1, MILL.gy - 1, MILL.gy, 18);
    const WAGON = { x: 182, gy: 123 }; solid(WAGON.x - 6, WAGON.x + 6, WAGON.gy - 4, WAGON.gy, 7);
    // Saguaros on the rock and in the canyon (height grows with hash).
    const CACTI = [[20, 60], [44, 74], [150, 64], [168, 50], [130, 92], [286, 104], [300, 128], [260, 140], [212, 150], [140, 150], [96, 150], [60, 152], [8, 94], [196, 64], [276, 22 + 60], [124, 138], [230, 118], [306, 80]]
      .filter(([x, y]) => GT[y * W + x] === T_TOP || GT[y * W + x] === T_FLOOR)
      .map(([x, y], n) => ({ x, y, h: 6 + Math.round(hash(n, 4) * 4), arms: hash(n, 5) }));
    for (const c of CACTI) solid(c.x, c.x + 1, c.y - 1, c.y, c.h);

    // ---------- light: the sun low in the east-north-east, long shadows ----------
    const SDX = 0.86, SDY = -0.5, SDZ = 0.25;
    // One sweep from the sun's side: each pixel takes the shadow height of the pixel two
    // steps toward the sun, less the sun's climb. Objects' shadows fade faster (S2).
    const SHADOW = new Uint8Array(N), S1 = new Float32Array(N), S2 = new Float32Array(N);
    for (let gy = 0; gy < GH; gy++) for (let gx = W - 1; gx >= 0; gx--) {
      const i = gy * W + gx;
      let up1 = -99, up2 = -99;
      const xa = gx - SDX / SDY, x0 = Math.floor(xa), f = xa - x0;
      if (gy > 0 && x0 + 1 < W) { const r = (gy - 1) * W; up1 = S1[r + x0] * (1 - f) + S1[r + x0 + 1] * f - SDZ * 2; up2 = S2[r + x0] * (1 - f) + S2[r + x0 + 1] * f - SDZ * 5; }
      S1[i] = Math.max(HT[i], up1); S2[i] = Math.max(HT[i] + OHT[i], up2);
      if (up1 > HT[i] + 0.3 || up2 > HT[i] + 0.3) SHADOW[i] = 1;
    }

    // ---------- palettes ----------
    const P = (...a) => a.map(C);
    const TOP_LIT = P('#ffcf96', '#f6ae70', '#e8925c', '#d27a50', '#b8664a');
    const TOP_SH = P('#a8586a', '#944c62', '#7e425a', '#6a3852');
    const FLOOR_LIT = P('#f8c890', '#eeac76', '#dc9462');
    const FLOOR_SH = P('#9c5e6c', '#885266', '#74485e', '#603e58');
    const TRAIL_LIT = P('#fff2c8', '#ffdca2'), TRAIL_SH = P('#f0c8aa', '#dcae98');
    const EDGE_LIT = C('#c47a52'), EDGE_SH = C('#5e3650');
    const BED_LIT = P('#fbe6c0', '#e8c8a0'), BED_SH = P('#b8a0aa', '#a08696');
    const STONE_LIT = C('#8a7a78'), STONE_SH = C('#4e3c52');
    const RAIL = C('#2a1a26'), TIE_LIT = C('#8a5a3e'), TIE_SH = C('#4a2c3a');
    const FACE = P('#8e3e4a', '#763242', '#5e283a', '#481f34', '#34182c');
    const FACE_WARM = P('#e0704e', '#c45a48', '#a04840', '#7a3a3c');
    const RIM_LIT = C('#ffe0a0'), RIM_SH = C('#c46a58');
    const HAZE = '#e0706a';
    const SCRUB_LIT = C('#8a8a48'), SCRUB_DK = C('#4a4a34'), SCRUB_SH = C('#5a4a52');

    // ---------- ground colours ----------
    const GC = new Uint32Array(N);
    const hx = i => (HT[Math.min(N - 1, i + 1)] - HT[Math.max(0, i - 1)]) / 2;
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < W; gx++) {
      const i = gy * W + gx, lit = !SHADOW[i], g = GT[i];
      let c;
      if (g === T_TOP) {
        const band = noise2(gx / 22, gy / 7 + HT[i] * 0.2, 11), t = band * 0.9 + (HT[i] > 12 ? 0.05 : 0.1) + hash(gx >> 1, gy >> 1) * 0.12;
        c = lit ? ramp(TOP_LIT, t, gx, gy) : ramp(TOP_SH, t * 0.8, gx, gy);
      } else if (g === T_TALUS) {
        const t = 0.5 + HT[i] * 0.12 - hx(i) * 0.2;
        c = lit ? ramp(FLOOR_LIT, t + 0.4, gx, gy) : ramp(FLOOR_SH, t + 0.2, gx, gy);
      } else if (g === T_FLOOR) {
        const t = noise2(gx / 9, gy / 6, 13) * 0.8;
        c = lit ? ramp(FLOOR_LIT, t, gx, gy) : ramp(FLOOR_SH, t * 0.7, gx, gy);
      } else if (g === T_TRAIL || g === T_STREET || g === T_CLEAR) {
        const rut = g === T_STREET && (gy === 106 || gy === 111) && hash(gx, 3) > 0.3;
        if (g === T_CLEAR) c = lit ? (hash(gx, gy) > 0.92 ? TRAIL_LIT[1] : FLOOR_LIT[0]) : (hash(gx, gy) > 0.92 ? FLOOR_SH[0] : C('#aa6a70'));
        else { const t = 0.35 + (hash(gx, gy) > 0.9 ? 0.6 : 0) + (rut ? 0.8 : 0); c = lit ? ramp(TRAIL_LIT, t, gx, gy) : ramp(TRAIL_SH, t, gx, gy); }
      } else if (g === T_EDGE) c = lit ? EDGE_LIT : EDGE_SH;
      else if (g === T_BED) { const crack = hash(gx, gy) > 0.72; c = lit ? BED_LIT[crack ? 1 : 0] : BED_SH[crack ? 1 : 0]; }
      else if (g === T_STONE) c = lit ? STONE_LIT : STONE_SH;
      else if (g === T_RAIL) c = RAIL;
      else c = lit ? TIE_LIT : TIE_SH;
      // Sagebrush dots on open rock and floor.
      if ((g === T_TOP || g === T_FLOOR) && noise2(gx / 14, gy / 14, 17) > 0.6 && hash(gx, gy + 7) > 0.95) c = lit ? SCRUB_LIT : SCRUB_SH;
      else if ((g === T_TOP || g === T_FLOOR) && gx > 0 && GC[i - 1] === SCRUB_LIT) c = SCRUB_DK;
      GC[i] = c;
    }
    // Haze toward the horizon.
    const hazeC = C(HAZE);
    for (let gy = 0; gy < HZ + 36; gy++) {
      const t = clamp((HZ + 36 - gy) / 36) * 2, k = t | 0, f = clamp((t - k - 0.5) * 3 + 0.5);
      for (let gx = 0; gx < W; gx++) { const q = k + (f > bay(gx, gy) ? 1 : 0); if (q > 0) blend(GC, gy * W + gx, hazeC, q * 0.22); }
    }

    // ---------- the sunset sky with the forked butte on the horizon ----------
    const BASE = new Uint32Array(W * H), DEPTH = new Float32Array(W * H).fill(-1);
    const SX = 238, SY = 12;
    const SKY = P('#2e1648', '#4e1c5a', '#7a2462', '#aa3462', '#d84e56', '#f07848', '#fca24a', '#ffd070', '#fff0b0');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = hyp(x - SX, (y - SY) * 1.6);
      BASE[y * W + x] = ramp(SKY, y / 34 + 0.25 * Math.exp(-sq(d / 70)) + 0.35 * Math.exp(-sq(d / 18)), x, y);
    }
    K.disc(BASE, SX, SY, 6.5, (dx, dy, d) => C(d < 0.6 ? '#ffffff' : d < 0.85 ? '#fff6d0' : '#ffe090'));
    // Far mesas along the horizon.
    for (let x = 0; x < W; x++) {
      const top = Math.round(Math.min(x > 30 && x < 80 ? 13 : 17, x > 120 && x < 150 ? 14 : 18, 16 + 2 * Math.sin(x / 7) + noise2(x / 9, 0, 21) * 2));
      for (let y = top; y < 24; y++) BASE[y * W + x] = y === top ? C(Math.abs(x - SX) < 60 ? '#ffb070' : '#d0605a') : C(mix('#8a3458', HAZE, 0.5));
    }
    // The fork: a butte splitting into two spires, the sun sitting in the notch.
    for (let y = 0; y < 26; y++) for (let x = SX - 22; x <= SX + 22; x++) {
      const dx = x - SX, rough = (noise2(y / 3, dx > 0 ? 3 : 4, 23) - 0.5) * 2;
      let inside = false, edge = 0;
      if (y >= 17) { const hw = 12 + (y - 17) * 0.8 + rough; inside = Math.abs(dx) < hw; edge = hw - Math.abs(dx); }
      else for (const [px, top, w] of [[-8, 0, 4.2], [8, 4, 3.8]]) {
        const hw = w + (y - top) * 0.06 + rough, capY = top + w * 0.8;
        const inP = y < capY ? hyp(dx - px, (y - capY) * 1.3) < hw : Math.abs(dx - px) < hw;
        if (inP && y >= top - 1) { inside = true; edge = hw - Math.abs(dx - px); }
      }
      if (inside) BASE[y * W + x] = edge < 1 ? C('#ffb060') : edge < 1.9 ? C('#b8483a') : ramp(P('#5a1e3e', '#4a1838', '#3a1430'), y / 26, x, y);
    }

    // ---------- project the land ----------
    for (let x = 0; x < W; x++) {
      let ymin = H;
      for (let gy = GH - 1; gy >= HZ; gy--) {
        const i = gy * W + x, h = HT[i], sy = Math.round(gy - h);
        if (sy >= ymin) continue;
        const span = ymin - sy, warm = hx(i) < -1.2;
        for (let y = Math.max(0, sy); y < Math.min(ymin, H); y++) {
          const o = y * W + x;
          DEPTH[o] = gy;
          if (y === sy || span < 3) BASE[o] = y === sy && span >= 3 && h > 3 ? (SHADOW[i] ? RIM_SH : RIM_LIT) : GC[i];
          else {
            const z = h - (y - sy), band = (Math.round(z) % 4 === 0) ? 0.18 : 0;
            BASE[o] = warm ? ramp(FACE_WARM, 1 - z / (h + 1) + band, x, y) : ramp(FACE, 0.15 + (1 - z / (h + 1)) * 0.75 + band, x, y);
          }
        }
        ymin = sy;
        if (ymin <= 0) break;
      }
    }
    // Near the horizon, the cliffs fade into the haze too.
    for (let y = 0; y < 40; y++) for (let x = 0; x < W; x++) {
      const o = y * W + x;
      if (DEPTH[o] >= 0 && DEPTH[o] < HZ + 14 && bay(x, y) < 0.5) blend(BASE, o, hazeC, 0.35);
    }

    // ---------- drawing objects with depth ----------
    function oput(b, x, y, c, d) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const o = y * W + x;
      if (DEPTH[o] <= d + 0.5) { b[o] = c; if (b === BASE) DEPTH[o] = d; }
    }
    const OUT = C('#24121e');
    // A 3/4-view box: roof from gb to gf at height hh, front wall below it, a false front p above.
    function box(x0, x1, gb, gf, hh, p, roof, wall, opts = {}) {
      for (let gy = gb; gy < gf; gy++) for (let x = x0; x <= x1; x++) {
        const edge = x === x0 || x === x1 || gy === gb;
        oput(BASE, x, gy - hh, edge ? roof[2] : ramp(roof, (gy - gb) / (gf - gb) * 0.6 + (x % 3 === 0 ? 0.3 : 0), x, gy), gy);
      }
      const top = hh + p;
      for (let z = 0; z < top; z++) for (let x = x0; x <= x1; x++) {
        const y = gf - 1 - z;
        let c = wall[(x - x0) % 3 === 0 ? 1 : 0];
        if (x === x1) c = wall[2];
        if (x === x0) c = wall[3];
        if (z === top - 1) c = x > (x0 + x1) / 2 ? C('#ffb070') : C('#e08a5a');     // sunlit cornice
        if (z === top - 2) c = wall[3];
        oput(BASE, x, y, c, gf);
      }
      if (opts.windows) for (const [wx, wz] of opts.windows) { WIN.push({ x: wx, y: gf - 1 - wz, d: gf }); }
      if (opts.door) for (let z = 0; z < 4; z++) for (let x = opts.door; x < opts.door + 2; x++) oput(BASE, x, gf - 1 - z, OUT, gf);
    }
    const WIN = [], LAMPS = [];
    const WOOD = P('#6e3e44', '#5e3440', '#3a1e2c', '#4a2634');
    const ROOF = P('#d89a6a', '#bc7c56', '#8a5444');
    const ROOF2 = P('#c8a080', '#a88068', '#6e5058');

    // ---------- the town ----------
    for (const [x0, x1, gb, gf, hh, p, wc] of NORTH_ROW) {
      const w = P(wc, mix(wc, '#000000', 0.15), mix(wc, '#ffb070', 0.35), mix(wc, '#000000', 0.4));
      const wins = [];
      for (let x = x0 + 2; x <= x1 - 3; x += 4) wins.push([x, 5 + (hh > 10 ? 4 : 0)]);
      if (hh > 10) for (let x = x0 + 2; x <= x1 - 3; x += 4) wins.push([x, 5]);
      box(x0, x1, gb, gf, hh, p, ROOF, w, { windows: wins, door: Math.round((x0 + x1) / 2) });
      for (let x = x0 - 1; x <= x1 + 1; x++) oput(BASE, x, gf - 5, C('#3a1e2a'), gf + 0.4);   // porch awning
      for (const px of [x0, x1]) for (let z = 0; z < 4; z++) oput(BASE, px, gf - 1 - z + 1, C('#2a1420'), gf + 0.4);
    }
    for (const [x0, x1, gb, gf, hh, wc] of SOUTH_ROW) {
      const w = P(wc, mix(wc, '#000000', 0.15), mix(wc, '#ffb070', 0.3), mix(wc, '#000000', 0.4));
      box(x0, x1, gb, gf, hh, 0, ROOF2, w, { windows: [[x0 + 3, 4], [x1 - 3, 4]] });
      // A little chimney on the backs.
      oput(BASE, x1 - 2, gb - hh - 1, C('#3a1e2a'), gb); oput(BASE, x1 - 2, gb - hh - 2, C('#3a1e2a'), gb);
    }
    // Water tower: four legs, a round tank with a cone lid.
    (function tower() {
      const { x, gy } = TOWER;
      for (const lx of [x - 4, x + 4]) for (let z = 0; z < 10; z++) oput(BASE, lx, gy - 1 - z, C('#2a1420'), gy);
      line(BASE, x - 4, gy - 3, x + 4, gy - 9, C('#3a1e2a')); line(BASE, x + 4, gy - 3, x - 4, gy - 9, C('#3a1e2a'));
      for (let z = 10; z < 17; z++) for (let dx = -5; dx <= 5; dx++) oput(BASE, x + dx, gy - 1 - z, dx > 3 ? C('#4a2634') : (z % 3 === 0 ? C('#3a1e2c') : dx < -3 ? C('#c06a4a') : C('#6e3e44')), gy);
      for (let dx = -5; dx <= 5; dx++) oput(BASE, x + dx, gy - 18, C(dx > 0 ? '#ffb070' : '#e08a5a'));
      for (let j = 0; j < 3; j++) for (let dx = -4 + j * 2; dx <= 4 - j * 2; dx++) oput(BASE, x + dx, gy - 19 - j, C(dx > 0 ? '#d89a6a' : '#8a5444'), gy);
    })();
    // Windmill tower (the wheel turns in the frame).
    (function mill() {
      const { x, gy } = MILL;
      line(BASE, x - 3, gy, x - 1, gy - 15, C('#2a1420')); line(BASE, x + 3, gy, x + 1, gy - 15, C('#2a1420'));
      for (let z = 3; z < 15; z += 4) line(BASE, x - 3 + z * 0.13, gy - z, x + 3 - z * 0.13, gy - z, C('#3a1e2a'));
      for (let dx = -2; dx <= 2; dx++) oput(BASE, x + dx + 3, gy - 22, C('#8a5a3e'), gy);   // water trough beside it
    })();
    // Water trough and hitching rails along the street.
    for (let x = 84; x < 92; x++) { oput(BASE, x, 105, C('#4a2634'), 105); oput(BASE, x, 104, C('#6ab0c0'), 105); }
    // Corral: a ring of posts and rails.
    const CORRAL = { x: 40, y: 134, rx: 13, ry: 6 };
    for (let a = 0; a < TAU; a += 0.05) {
      const x = CORRAL.x + Math.cos(a) * CORRAL.rx, y = CORRAL.y + Math.sin(a) * CORRAL.ry, d = y;
      oput(BASE, x, y - 2, C(Math.sin(a) > 0 ? '#8a5a3e' : '#5a3440'), d);
      if (Math.round(a / 0.05) % 7 === 0) for (let z = 0; z < 3; z++) oput(BASE, x, y - z, C('#2a1420'), d);
    }
    // Covered wagon by the camp in the canyon.
    (function wagon() {
      const { x, gy } = WAGON;
      for (let dx = -6; dx <= 6; dx++) for (let z = 2; z < 4; z++) oput(BASE, x + dx, gy - 1 - z, C(z === 3 ? '#8a5a3e' : '#5a3440'), gy);
      for (let dx = -5; dx <= 5; dx++) { const top = 4 + Math.round(3 * Math.sqrt(1 - sq(dx / 5.6))); for (let z = 4; z <= top; z++) oput(BASE, x + dx, gy - 1 - z, C(z === top ? '#fff4e0' : dx > 2 ? '#c8b0a8' : '#e8d8c8'), gy); }
      for (const wx of [x - 4, x + 4]) for (const [dx, dz] of [[0, 0], [-1, 1], [1, 1], [0, 2], [-1, 0], [1, 0], [0, 1]]) oput(BASE, wx + dx, gy - 1 - dz, C(dx === 0 && dz === 1 ? '#8a5a3e' : '#2a1420'), gy + 0.3);
    })();
    // Cow skull on the trail side, rocks.
    for (const [dx, dy, c] of [[0, 0, '#fff4e0'], [1, 0, '#fff4e0'], [2, 0, '#fff4e0'], [-1, -1, '#e8d8c8'], [3, -1, '#e8d8c8'], [1, 1, '#c8b0a8'], [0, 1, '#2a1420'], [2, 1, '#2a1420']]) oput(BASE, 152 + dx, 123 + dy, C(c), 124);
    // The signpost at the fork: two arrows pointing up each branch.
    (function sign() {
      const x = 222, gy = 94;
      for (let z = 0; z < 9; z++) oput(BASE, x, gy - 1 - z, C('#3a1e2a'), gy);
      for (let i = 0; i < 6; i++) { oput(BASE, x - 1 - i, gy - 8 - (i >> 1), C('#c89060'), gy); oput(BASE, x - 1 - i, gy - 7 - (i >> 1), C('#8a5a3e'), gy); }
      for (let i = 0; i < 6; i++) { oput(BASE, x + 1 + i, gy - 6 - (i >> 1), C('#e0a870'), gy); oput(BASE, x + 1 + i, gy - 5 - (i >> 1), C('#8a5a3e'), gy); }
    })();
    // Saguaros: trunk and arms, lit on the sunward (right) side, with a warm rim.
    function saguaro(b, x, y, h, arms, d) {
      const G = P('#e0c070', '#6a8448', '#3e5234', '#24301e');
      for (let z = 0; z < h; z++) { oput(b, x, y - z, z === h - 1 ? G[1] : G[2], d); oput(b, x + 1, y - z, z === h - 1 ? G[0] : G[1], d); }
      oput(b, x + 1, y - h, G[0], d);
      if (arms > 0.3) { const az = Math.round(h * 0.45); oput(b, x - 1, y - az, G[2], d); oput(b, x - 2, y - az, G[2], d); for (let z = 1; z < 3; z++) oput(b, x - 2, y - az - z, G[2], d); oput(b, x - 2, y - az - 3, G[1], d); }
      if (arms > 0.6) { const az = Math.round(h * 0.6); oput(b, x + 2, y - az, G[1], d); oput(b, x + 3, y - az, G[1], d); for (let z = 1; z < 3; z++) oput(b, x + 3, y - az - z, G[1], d); oput(b, x + 3, y - az - 3, G[0], d); }
    }
    for (const c of CACTI) { const hh = HT[c.y * W + c.x]; saguaro(BASE, c.x, Math.round(c.y - hh), c.h, c.arms, c.y); }

    // ---------- the wanted-poster bracket board ----------
    const BX = BOARD.x0, BY = BOARD.gy - 1;                     // screen y of the board's foot
    const BOARD_TOP = BY - BOARD.hh;
    (function board() {
      const d = BOARD.gy;
      for (const px of [BX + 3, BX + 29]) for (let z = 0; z < BOARD.hh; z++) { oput(BASE, px, BY - z, C('#2a1420'), d); oput(BASE, px + 1, BY - z, C('#4a2634'), d); }
      for (let y = BOARD_TOP; y < BOARD_TOP + 16; y++) for (let x = BX; x <= BX + 32; x++) {
        const plank = (y - BOARD_TOP) % 4 === 3;
        let c = plank ? C('#4a2a34') : x > BX + 26 ? C('#6e4048') : C('#5e3640');
        if (y === BOARD_TOP) c = C(x > BX + 16 ? '#ffc080' : '#e89a64');
        if (x === BX || x === BX + 32) c = C('#2a1420');
        oput(BASE, x, y, c, d);
      }
      // The bracket: four posters a side, then two, then one, meeting at yours in the middle.
      const L = C('#2a1420');
      const cols = [[BX + 2, 4], [BX + 7, 2], [BX + 11, 1]];
      const poster = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) oput(BASE, x + i, y + j, C(j === 0 ? '#c84a3a' : i === (w >> 1) && j === h - 2 ? '#6a4a40' : '#f4e2b8'), d); };
      for (const side of [0, 1]) {
        const X = x => side ? BX + 32 - (x - BX) - 2 : x;
        cols.forEach(([cx, n], ci) => {
          const gap = 14 / n;
          for (let k = 0; k < n; k++) {
            const y = BOARD_TOP + 2 + Math.round(gap * k + gap / 2 - 2);
            poster(X(cx), y, 3, 3);
            if (ci < 2) {  // connector to the next column
              const nx = cols[ci + 1][0];
              for (let x = cx + 3; x < nx; x++) oput(BASE, X(x), y + 1, L, d);
            }
          }
        });
        for (let x = BX + 14; x < BX + 14; x++) oput(BASE, X(x), BOARD_TOP + 8, L, d);
      }
      for (const x of [BX + 14, BX + 15, BX + 17, BX + 18]) oput(BASE, x, BOARD_TOP + 8, L, d);
      // Your poster, bigger, at the top of the bracket.
      for (let j = 0; j < 9; j++) for (let i = 0; i < 5; i++) oput(BASE, BX + 14 + i, BOARD_TOP + 3 + j, C(j < 2 ? '#c84a3a' : j === 8 ? '#e0c898' : '#fff0c8'), d);
      // A little king on it: that's you.
      for (const [i, j] of [[2, 3], [1, 4], [2, 4], [3, 4], [2, 5], [1, 6], [2, 6], [3, 6], [1, 7], [2, 7], [3, 7]]) oput(BASE, BX + 14 + i, BOARD_TOP + 3 + j, C('#3a2030'), d);
      // Lamps on the posts.
      LAMPS.push([BX + 3, BOARD_TOP - 1], [BX + 30, BOARD_TOP - 1]);
    })();

    // ---------- the Two Prongs Saloon ----------
    (function saloon() {
      const { x0, x1, gb, gf, hh, p } = SALOON;
      const w = P('#5a2e40', '#4e283a', '#b85a4a', '#2e1624');
      box(x0, x1, gb, gf, hh, p, ROOF, w, {});
      // Balcony rail across the upper floor, and its posts down to the porch.
      for (let x = x0; x <= x1; x++) { oput(BASE, x, gf - 8, C('#2a1420'), gf + 0.5); if ((x - x0) % 3 === 0) oput(BASE, x, gf - 7, C('#8a5a3e'), gf + 0.5); }
      for (let x = x0 - 1; x <= x1 + 1; x++) oput(BASE, x, gf - 9, C(x > (x0 + x1) / 2 ? '#e0a870' : '#8a5a3e'), gf + 0.5);
      for (const px of [x0 + 1, x0 + 12, x1 - 12, x1 - 1]) for (let z = 0; z < 7; z++) oput(BASE, px, gf - 1 - z + 1, C('#2a1420'), gf + 0.6);
      // Porch deck.
      for (let y = gf; y < gf + 4; y++) for (let x = x0 - 1; x <= x1 + 1; x++) oput(BASE, x, y, C(y === gf + 3 ? '#3a1e2a' : (x % 4 === 0 ? '#6a4038' : '#8a5a44')), y);
      // The sign on the false front: a two-pronged fork.
      const sx = Math.round((x0 + x1) / 2), sy = gf - hh - p + 1;
      for (let j = 0; j < 5; j++) for (let i = -7; i <= 7; i++) oput(BASE, sx + i, sy + j, C(j === 0 || j === 4 || Math.abs(i) === 7 ? '#8a5a3e' : '#2a1826'), gf);
      for (let i = -4; i <= 3; i++) oput(BASE, sx + i, sy + 2, C('#ffd070'), gf);
      for (const [i, j] of [[4, 1], [5, 1], [4, 3], [5, 3], [3, 1], [3, 3]]) oput(BASE, sx + i, sy + j, C('#ffd070'), gf);
      // Windows either side of the doors.
      for (const wx of [x0 + 4, x0 + 8, x1 - 9, x1 - 5]) WIN.push({ x: wx, y: gf - 4, d: gf, big: true });
      for (const wx of [x0 + 5, x0 + 15, x1 - 16, x1 - 6]) WIN.push({ x: wx, y: gf - 12, d: gf });
      SALOON.doorX = sx - 2;
    })();

    // Trestles over the two branches, level with the rails.
    const TRESTLES = [];
    for (let gx = 0; gx < W; gx++) if (HT[RAILY * W + gx] < 9) TRESTLES.push(gx);
    for (const gx of TRESTLES) {
      const deck = RAILY - 10;
      oput(BASE, gx, deck - 1, C('#2a1a26'), RAILY - 1); oput(BASE, gx, deck + 1, C('#2a1a26'), RAILY + 1);
      oput(BASE, gx, deck, C(gx % 3 === 0 ? '#8a5a3e' : '#4a2c3a'), RAILY);
      const floorY = Math.round(RAILY + 1 - HT[(RAILY + 1) * W + gx]);
      for (let y = deck + 2; y <= floorY; y++) {
        const k = gx % 8, v = (y - deck) % 8;
        if (k === 0 || k === v || 8 - k === v) oput(BASE, gx, y, C('#2a1420'), RAILY + 1);
      }
    }

    // ---------- animated things ----------
    const vignette = K.vignette(C('#140818'), 0.38, 0.45);
    // Long thin sunset streaks, lit from below.
    const CLOUDS = [[20, 3, 60], [150, 7, 44], [300, 2, 38], [400, 9, 52]].map(([x0, y, w], n) => {
      const px = new Uint32Array(w * 3);
      for (let x = 0; x < w; x++) {
        const e = Math.min(x, w - 1 - x);
        px[x] = e > 6 ? C('#8a3a6a') : 0; px[w + x] = e > 2 ? C(e > 8 ? '#c85068' : '#a8406a') : 0; px[2 * w + x] = e > 4 ? C('#ffb070') : 0;
      }
      return { s: { w, h: 3, px }, x0, y, k: 1 + (n % 2) };
    });
    const TWEEDS = [0, 1].map(i => ({ p: i / 2, k: 3 + i * 2 }));
    const DUST = Array.from({ length: 36 }, (_, i) => ({ x: hash(i, 1) * W | 0, k: 3 + (i % 4), p: hash(i, 2) }));
    // Rim pixels (tops of cliffs in the sun) for dust to blow from.
    const RIMS = [];
    for (let y = 34; y < H; y++) for (let x = 0; x < W; x++) if (BASE[y * W + x] === RIM_LIT) RIMS.push(y * W + x);
    const DUSTS = DUST.map(d => RIMS[Math.floor(hash(d.x, 9) * RIMS.length)]);
    // Horses in the corral.
    const HORSES = [{ x: 34, y: 134, c: '#8a4a2c', m: '#3a1e1a', dir: 1, p: 0 }, { x: 46, y: 136, c: '#e8d8c8', m: '#6a5a5a', dir: -1, p: 2 }];
    const FIRE = { x: 172, y: 127 };

    function dput(x, y, c, d) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const o = y * W + x; if (DEPTH[o] <= d + 0.5) buf[o] = c; }
    function dblend(x, y, c, a, d) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const o = y * W + x; if (DEPTH[o] <= d + 0.5) blend(buf, o, c, a); }

    function train(u) {
      const v = frac(2 * u), x0 = W + 20 - v * (W + 110), d = RAILY + 2, top = RAILY - 10;
      const cars = [[0, 11, 6, '#2a1622'], [13, 7, 5, '#3a1e2a'], [22, 12, 5, '#6a2e36'], [36, 12, 5, '#5a2e44'], [50, 12, 5, '#6a2e36']];
      for (const [off, len, hh, col] of cars) {
        const x = Math.round(x0 + off);
        for (let i = 0; i < len; i++) {
          for (let z = 1; z <= hh; z++) dput(x + i, top - z + 1, z === hh ? C(i > len / 2 ? '#ffb070' : '#c06a4a') : C(col), d);
          dput(x + i, top - hh, C(off === 0 ? '#1a0e16' : '#3a1e2a'), d);
          if (off >= 22 && i % 3 === 1) dput(x + i, top - 2, C('#ffd070'), d);
        }
      }
      for (let z = 0; z < 4; z++) dput(Math.round(x0) + 2, top - 6 - z, C('#1a0e16'), d);     // smokestack
      dput(Math.round(x0) - 1, top, C('#1a0e16'), d); dput(Math.round(x0) - 2, top + 1, C('#1a0e16'), d);
      for (let i = 0; i < 12; i++) {
        const a = frac(u * 60 + i / 12), sx = x0 + 3 + a * 20, sy = top - 10 - a * 16, r = 0.8 + a * 3.5;
        for (let yy = Math.floor(sy - r); yy <= sy + r; yy++) for (let xx = Math.floor(sx - r); xx <= sx + r; xx++)
          if (hyp(xx - sx, yy - sy) <= r) blendAt(buf, xx, yy, C(a < 0.3 ? '#f4e0d0' : '#c08a90'), (1 - a) * 0.4);
      }
    }
    function windmill(u) {
      const cx = MILL.x, cy = MILL.gy - 17, ang = (TAU / 8) * 64 * u;
      for (let k = 0; k < 8; k++) {
        const a = ang + k * TAU / 8;
        for (let r = 1; r <= 5; r += 0.5) put(buf, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, C(r > 4 ? '#ffc080' : k % 2 ? '#c89060' : '#8a5a3e'));
      }
      put(buf, cx, cy, C('#2a1420'));
      for (let i = 1; i <= 4; i++) put(buf, cx + i, cy, C('#6a3a3e')); put(buf, cx + 5, cy - 1, C('#e0a870')); put(buf, cx + 5, cy, C('#e0a870'));
    }
    function hawk(u, n) {
      const a = TAU * (2 + n) * u + n * 2.4, x = 150 + n * 70 + Math.cos(a) * 30, y = 62 + n * 26 + Math.sin(a) * 12;
      const up = Math.sin(TAU * 90 * u + n) > 0.3;
      const shape = up ? [[-3, -1], [-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1], [3, -1]] : [[-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0]];
      // Its shadow on the land below, thrown away from the sun.
      for (const [dx, dy] of shape) { const sx = x - 22 + dx, sy = y + 22 + dy; if (sx >= 0 && sy >= 0 && sx < W && sy < H && DEPTH[Math.round(sy) * W + Math.round(sx)] >= 0) blendAt(buf, sx, sy, C('#2a1030'), 0.35); }
      for (const [dx, dy] of shape) put(buf, x + dx, y + dy, C('#2a1022'));
      put(buf, x, y + 1, C('#2a1022'));
    }
    function tumbleweed(w, u) {
      const v = frac(w.k * u + w.p), s = TRAIL[Math.floor((1 - v) * (TRAIL.length - 1))];
      const bounce = Math.abs(Math.sin(v * TAU * 14)) * 3, x = s[0], y = s[1] - 2 - bounce, ang = v * TAU * 30;
      for (let k = 0; k < 10; k++) {
        const a = ang + k / 10 * TAU, r = 1.4 + (k % 3) * 0.7;
        dput(x + Math.cos(a) * r, y + Math.sin(a) * r, C(k % 2 ? '#8a5040' : '#d8a068'), s[1]);
      }
      dput(x, y, C('#6a3a30'), s[1]);
      dblend(x - 1, s[1], C('#3a1830'), 0.3, s[1]); dblend(x, s[1], C('#3a1830'), 0.3, s[1]); dblend(x + 1, s[1], C('#3a1830'), 0.3, s[1]);
    }
    function dustDevil(u) {
      const a = TAU * u * 2, cx = 70 + Math.cos(a) * 34, cy = 120 + Math.sin(a * 2) * 6;
      for (let k = 0; k < 24; k++) {
        const z = (k / 24) * 14, r = 0.8 + z * 0.35, sp = TAU * 40 * u + k * 1.7;
        dblend(cx + Math.cos(sp) * r, cy - z, C('#ffe0b0'), 0.55 * (1 - k / 30), cy);
      }
      dblend(cx, cy, C('#3a1830'), 0.25, cy); dblend(cx + 1, cy, C('#3a1830'), 0.25, cy);
    }
    // The loose poster blowing down the street now and then.
    function loosePoster(u) {
      const v = frac(3 * u);
      if (v > 0.45) return;
      const q = v / 0.45, x = BX + 30 - q * 90, y = BOARD_TOP + 6 + q * 12 - Math.abs(Math.sin(q * TAU * 3)) * 6, f = Math.sin(TAU * 240 * u) > 0;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) put(buf, x + i, y + j + (f && i === 2 ? -1 : 0), C(j === 0 && !f ? '#c84a3a' : '#f4e2b8'));
    }
    function horse(hs, u) {
      const walk = Math.sin(TAU * 2 * u + hs.p), x = Math.round(hs.x + walk * 3), y = hs.y, dir = Math.cos(TAU * 2 * u + hs.p) > 0 ? hs.dir : -hs.dir;
      const body = C(hs.c), mane = C(hs.m), dk = C('#2a1420');
      for (let i = -2; i <= 2; i++) { dput(x + i, y - 2, body, y); dput(x + i, y - 3, body, y); }
      for (const lx of [-2, 2]) dput(x + lx, y - 1, dk, y);
      dput(x + dir * 3, y - 3, body, y); dput(x + dir * 3, y - 4, body, y); dput(x + dir * 4, y - 4, body, y); dput(x + dir * 2, y - 4, mane, y);
      const flick = Math.sin(TAU * 20 * u + hs.p * 3) > 0.5;
      dput(x - dir * 3, y - 3 + (flick ? -1 : 0), mane, y); dput(x - dir * 3, y - 2, mane, y);
    }
    function campfire(u) {
      K.flame(buf, FIRE.x - 1, FIRE.y - 1, 3, 4, u, 1.3);
      dput(FIRE.x - 2, FIRE.y, C('#3a1e2a'), FIRE.y); dput(FIRE.x + 2, FIRE.y, C('#3a1e2a'), FIRE.y);
      glow(buf, FIRE.x, FIRE.y - 1, 9, C('#ffb050'), 0.22 + 0.05 * Math.sin(TAU * 37 * u));
      for (let i = 0; i < 8; i++) {
        const a = frac(8 * u + i / 8), x = FIRE.x + a * 10 + Math.sin(a * 5 + i) * 1.5, y = FIRE.y - 5 - a * 22;
        blendAt(buf, x, y, C(a < 0.3 ? '#e8c8b8' : '#a07888'), (1 - a) * 0.35);
        blendAt(buf, x + 1, y, C('#a07888'), (1 - a) * 0.25);
      }
    }
    function windows(u, beaten) {
      WIN.forEach((w, n) => {
        const f = Math.sin(TAU * (7 + n % 5) * u + n * 1.3) + 0.5 * Math.sin(TAU * 23 * u + n);
        const c = C(beaten && w.big ? '#fff0b0' : f > -0.4 ? '#ffd070' : '#e08a40');
        dput(w.x, w.y, c, w.d); dput(w.x + 1, w.y, c, w.d);
        if (w.big) { dput(w.x, w.y - 1, c, w.d); dput(w.x + 1, w.y - 1, c, w.d); dput(w.x, w.y - 2, C('#ffb050'), w.d); dput(w.x + 1, w.y - 2, C('#ffb050'), w.d); }
      });
      // Saloon swinging doors.
      const sw = Math.sin(TAU * 12 * u), open = Math.round(Math.max(0, sw) * 1.5), gf = SALOON.gf, dx = SALOON.doorX;
      for (let z = 0; z < 5; z++) for (let i = 0; i < 5; i++) dput(dx + i, gf - 1 - z, C(z < 1 || z > 3 ? '#1a0a14' : '#ffc060'), gf);
      for (let z = 1; z < 4; z++) { dput(dx - open, gf - 1 - z, C('#8a5a3e'), gf + 0.5); dput(dx + 1 - open, gf - 1 - z, C('#6a4038'), gf + 0.5); dput(dx + 3 + open, gf - 1 - z, C('#6a4038'), gf + 0.5); dput(dx + 4 + open, gf - 1 - z, C('#8a5a3e'), gf + 0.5); }
      glow(buf, dx + 2, gf + 2, 8, C('#ffb050'), 0.16);
    }
    function lamps(u) {
      for (const [x, y] of LAMPS) { const f = 0.8 + 0.2 * Math.sin(TAU * 31 * u + x); put(buf, x, y, C('#ffe8a0')); put(buf, x + 1, y, C('#ffd070')); glow(buf, x, y, 5, C('#ffc060'), 0.25 * f); }
    }
    function flag(x, y, u, cols) {
      for (let z = 0; z < 9; z++) put(buf, x, y - z, C('#2a1420'));
      for (let i = 1; i <= 5; i++) for (let j = 0; j < 3; j++) {
        const wv = Math.round(Math.sin(TAU * 30 * u - i * 0.9) * 0.8 * (i / 5));
        if (j === 2 && i > 3) continue;
        put(buf, x + i, y - 8 + j + wv, C(j === 0 ? cols[0] : cols[1]));
      }
    }

    // ---------- ForkMaster ----------
    const FM = [
      '.......oooo........',
      '......ohhHHo.......',
      '......ohhhHHo......',
      '......obbbbbo.oo...',
      '..ooooohhhhhHoMo...',
      '.ohhhhhhhhhhhHHHo..',
      '..oooocccccccMMoo..',
      '....occEEcccccMMo..',
      '...occcccccccccMMo.',
      '..occccccccccccMMo.',
      '.ommcccccccccccCMMo',
      'ommmmccccccccdcCMMo',
      'ommmmmoccccccddCMMo',
      '.ooooo.occcccddMMo.',
      '.......oRRRRRRRMMo.',
      '......oRwRRRwRRRMo.',
      '.......oRRRRRRRdo..',
      '........oRRRccddo..',
      '........occcccddo..',
      '.......occccccddo..',
      '......occcccccCddo.',
      '.....occcccccccCdeo',
      '....orrrrrrrrrrrrro',
      '....occcccccccCCdeo',
      '...occcccccccccCdeo',
      '...ooooooooooooooo.',
    ];
    const FMPAL = {
      o: C('#2a1422'), h: C('#6a4030'), H: C('#a06a48'), b: C('#1e1016'), c: C('#ec9850'), C: C('#ffc486'), d: C('#b8683c'),
      e: C('#7e4232'), M: C('#4a2218'), m: C('#f8d8aa'), E: C('#1a0e14'), R: C('#e84a34'), w: C('#ffe8d8'), r: C('#8a2a2a'),
    };
    const FMW = 19, FMH = FM.length;
    const FMX = 248, FMY = 80;                                  // where his base stands (ground = screen here)
    function forkmaster(u, beaten) {
      // Paces his porch (turning at each end), unless beaten: then he stands and waves his hat.
      const pace = beaten ? 0 : Math.sin(TAU * 6 * u), facing = beaten ? 1 : (Math.cos(TAU * 6 * u) > 0 ? 1 : -1);
      const x0 = Math.round(FMX + pace * 10), step = !beaten && Math.abs(Math.cos(TAU * 6 * u)) > 0.3 && Math.sin(TAU * 96 * u) > 0 ? 1 : 0;
      const breath = Math.sin(TAU * 30 * u) > 0.2 ? 1 : 0, hatLift = beaten && frac(20 * u) < 0.5 ? 3 + Math.round(Math.sin(TAU * 40 * u) * 1) : 0;
      const d = FMY + 1, ox = x0 - (FMW >> 1), oy = FMY - FMH + 1 - step;
      // Shadow on the porch, thrown to the lower left.
      for (let i = -9; i <= 6; i++) dblend(x0 + i - 3, FMY + 1, C('#2a1030'), 0.35, d);
      for (let j = 0; j < FMH; j++) for (let i = 0; i < FMW; i++) {
        const ch = FM[j][facing > 0 ? i : FMW - 1 - i];
        if (!ch || ch === '.') continue;
        const hat = j <= 5, body = j < 22;
        const yy = oy + j + (body ? -breath : 0) - (hat ? hatLift : 0);
        dput(ox + i, yy, FMPAL[ch], d);
      }
      // Straw in his mouth, chewing.
      const mx = facing > 0 ? ox - 1 : ox + FMW, my = oy + 12 - breath, chew = Math.sin(TAU * 60 * u) > 0 ? 1 : 0;
      for (let k = 0; k < 3; k++) dput(mx - facing * k, my - (k === 2 ? chew : 0), C(k === 2 ? '#fff0a0' : '#e0c060'), d);
      // Gloved hand and the fork: held up like a six-shooter, twirled every 10 s.
      const hxp = facing > 0 ? ox + 7 : ox + FMW - 8, hy = oy + 18 - breath;
      const tw = frac(12 * u), twirl = tw < 0.12 ? tw / 0.12 * TAU * 3 : 0;
      const ang = (facing > 0 ? -2.2 : -0.94) + twirl * facing;
      const ca = Math.cos(ang), sa = Math.sin(ang), steel = C('#e0e6f4'), dsteel = C('#8890b0');
      for (let r = 0; r <= 5; r += 0.5) dput(hxp + ca * r, hy + sa * r, r < 2 ? C('#804a2c') : steel, d + 0.5);
      for (const off of [-1.2, 1.2]) for (let r = 5; r <= 8; r += 0.5) dput(hxp + ca * r - sa * off, hy + sa * r + ca * off, r > 7.5 ? C('#ffffff') : dsteel, d + 0.5);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) dput(hxp + dx - (facing > 0 ? 1 : 0), hy + dy, dx + dy === 0 ? C('#fff4dc') : C('#e4b07c'), d + 0.6);
    }

    function frame(t, cleared, beaten) {
      const u = t / LOOP;
      buf.set(BASE);
      for (const c of CLOUDS) {
        const x = frac(c.x0 / 440 + c.k * u) * 440 - 60;
        for (let y = 0; y < c.s.h; y++) for (let i = 0; i < c.s.w; i++) { const v = c.s.px[y * c.s.w + i], xx = Math.round(x) + i, yy = c.y + y; if (v && xx >= 0 && xx < W && DEPTH[yy * W + xx] < 0) buf[yy * W + xx] = v; }
      }
      train(u);
      windmill(u);
      windows(u, beaten);
      lamps(u);
      campfire(u);
      for (const hs of HORSES) horse(hs, u);
      dustDevil(u);
      for (const w of TWEEDS) tumbleweed(w, u);
      // A poster flapping on the board.
      if (Math.sin(TAU * 48 * u) > 0.3) { put(buf, BX + 3, BOARD_TOP + 5, C('#fff8e0')); put(buf, BX + 29, BOARD_TOP + 11, C('#fff8e0')); }
      loosePoster(u);
      // Cleared: a gold star on your poster, a flag in the plaza.
      if (cleared >= 1) {
        const sx = BX + 16, sy = BOARD_TOP + 1, tw = Math.sin(TAU * 20 * u) > 0;
        for (const [dx, dy] of [[0, 0], [-1, 1], [0, 1], [1, 1], [0, 2], [-1, 3], [1, 3]]) put(buf, sx + dx, sy + dy, C('#ffd23a'));
        if (tw) { put(buf, sx, sy - 1, C('#ffffff')); put(buf, sx - 2, sy + 1, C('#fff4b0')); put(buf, sx + 2, sy + 1, C('#fff4b0')); }
        flag(STOPS[0][0] + 14, STOPS[0][1] - 1, u, ['#ffd23a', '#c84a3a']);
      }
      if (beaten) flag(STOPS[1][0] + 16, STOPS[1][1] - 2, u, ['#ffd23a', '#c84a3a']);
      forkmaster(u, beaten);
      for (const hwk of [0, 1]) hawk(u, hwk);
      // Dust blowing off the sunlit rims.
      DUST.forEach((d, n) => {
        const v = frac(d.k * u + d.p), o = DUSTS[n];
        if (o === undefined) return;
        blendAt(buf, (o % W) - v * 14, ((o / W) | 0) - 1 - Math.sin(v * Math.PI) * 4, C('#ffd8a0'), 0.55 * (1 - v));
      });
      vignette(buf);
    }

    return (t, out, state) => {
      buf = out;
      const m = (state && state.map) || {};
      frame(t, m.cleared | 0, !!m.beaten);
    };
  },
});
