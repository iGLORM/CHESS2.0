// The Obsidian Court, the place map: World 10 seen from above.
//
// A plateau of black volcanic glass under an ash-red sky, split by a river of lava that
// runs down from the smoking volcano on the horizon. Every rock has a height (a 3/4
// bird's-eye map): cliffs of glass glow orange where the lava licks them and catch cold
// violet light on their rims. A road of pale basalt flagstones winds through the court's
// grounds, over two glass bridges, to the Court of Judgement, where Checkmate waits on his
// dais beside his giant hourglass.
// Stops: Short Sentence (the Bailiff's gate tower), Verdicts (the Judge's bench and three
// tablets), Trial by Fire (stepping stones over a lava pool), The Jury (twelve pawn statues
// in their box), Last Appeal (the executioner's block and axe), Embers of the Court (four
// braziers), The Hourglass Turns (a ghostly hourglass over glowing footprints, looking
// across the lava to a far crystal glint), and the Court.
// Moves: lava flows and bubbles, its glow breathes on the banks; heat shimmers; the
// volcano smokes and its crater pulses; ash falls and embers rise; a fire jet erupts from
// the pool; braziers burn; the jurors' eyes flicker; the ghost hourglass turns and the
// footprints light one by one; violet glints slide down the glass spires; the giant
// hourglass pours; chains sway; Checkmate breathes, his eyes burn and his robe stirs.
// State: { map: { cleared, beaten } }: cleared stops get a flag and their landmark lights
// (the tablets, the jury's eyes, the braziers...); beaten, the hourglass stops, cracked,
// and Checkmate stands shaken.
LiveScenes.register({
  id: 'map_obsidiancourt',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  stops: [[40, 136], [84, 112], [126, 137], [176, 126], [232, 138], [272, 102], [212, 84], [122, 79]],
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noiseLoop, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const hyp = (a, b) => Math.sqrt(a * a + b * b);
    // PixelKit.noise2, inlined (same values, much faster over whole-map loops).
    function noise2(x, y, seed = 0) {
      const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, s = seed * 1013;
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      const a = hash(i + s, j), b = hash(i + 1 + s, j), c = hash(i + s, j + 1), d = hash(i + 1 + s, j + 1);
      return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
    }
    const { put, blendAt, glow } = K;
    const STOPS = LiveScenes.get('map_obsidiancourt').stops;
    let buf = null;

    const HZ = 26, GH = H + 26, N = W * GH;
    const HT = new Float32Array(N), GT = new Uint8Array(N);
    const T_GLASS = 0, T_ASH = 1, T_LAVA = 2, T_ROAD = 3, T_EDGE = 4, T_CLEAR = 5, T_STONE = 6, T_BRIDGE = 7, T_CRUST = 8, T_DAIS = 9;

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
    function field(samples, w, R = w + 12, F = new Float32Array(N).fill(99)) {
      for (const [sx, sy] of samples) for (let y = Math.floor(sy - R); y <= sy + R; y++) {
        if (y < 0 || y >= GH) continue;
        for (let x = Math.floor(sx - R); x <= sx + R; x++) {
          if (x < 0 || x >= W) continue;
          const i = y * W + x, dx = x - sx, dy = y - sy, d2 = dx * dx + dy * dy, cur = F[i] + w;
          if (cur > 0 && d2 >= cur * cur) continue;
          const v = Math.sqrt(d2) - w;
          if (v < F[i]) F[i] = v;
        }
      }
      return F;
    }
    function stamp(samples, r, type, only) {
      for (const [sx, sy] of samples) for (let y = Math.floor(sy - r); y <= sy + r; y++) for (let x = Math.floor(sx - r); x <= sx + r; x++) {
        if (x < 0 || y < 0 || x >= W || y >= GH || hyp(x - sx, y - sy) > r) continue;
        const i = y * W + x;
        if (!only || only(GT[i], i)) GT[i] = type;
      }
    }

    // ---------- the land ----------
    // The road runs along a valley floor of ash (height 0, so the stops sit where they are
    // drawn); black glass terraces rise on both sides; lava runs through both.
    const ROAD = spline([[-6, 142], [18, 140], STOPS[0], [58, 128], STOPS[1], [100, 116], [112, 128], STOPS[2], [142, 138], [158, 132], STOPS[3], [196, 131], [214, 134], STOPS[4],
      [252, 131], [266, 118], STOPS[5], [262, 88], [240, 82], STOPS[6], [190, 79], [160, 78], [140, 76], STOPS[7]]);
    // The valley reaches further toward the viewer, so its near bank never hides the road.
    const VALLEY = field(ROAD, 7, 22);
    field(ROAD.map(([x, y]) => [x, y + 7]), 7, 22, VALLEY);
    field(STOPS.map(p => p.slice()), 14, 26, VALLEY);
    field(STOPS.map(([x, y]) => [x, y + 10]), 14, 26, VALLEY);
    field([[122, 57]], 30, 40, VALLEY);                                    // the court's forecourt
    field([[166, 106]], 14, 24, VALLEY); field([[126, 138]], 24, 34, VALLEY); field([[248, 126]], 6, 18, VALLEY); field([[22, 126]], 8, 20, VALLEY);
    const RIVER = spline([[204, 16], [194, 44], [183, 72], [188, 102], [204, 130], [202, 160], [188, 190], [192, 232]]);
    const CHANNEL = spline([[196, 168], [170, 162], [148, 154], [136, 146]]);
    const LAVA_F = field(RIVER, 7);
    // The fire pool of the Trial, and lava lakes off in the corners.
    for (const [cx, cy, rx, ry] of [[126, 138, 25, 13], [30, 196, 46, 22], [304, 182, 34, 16], [30, 40, 26, 8]])
      for (let y = 0; y < GH; y++) for (let x = 0; x < W; x++) {
        const v = (hyp((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry), i = y * W + x;
        if (v < LAVA_F[i]) LAVA_F[i] = v;
      }
    // Glass spires (sharp crags) standing on the terraces.
    const SPIRES = [[12, 70, 5, 30], [298, 58, 6, 32], [312, 88, 4, 22], [250, 52, 4, 22], [66, 168, 5, 26], [150, 184, 4, 24], [236, 176, 5, 28], [62, 62, 4, 20], [286, 150, 4, 22], [20, 110, 4, 20]];
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < W; gx++) {
      const i = gy * W + gx;
      const n = noise2(gx / 46, gy / 30, 3) * 0.75 + noise2(gx / 14, gy / 9, 4) * 0.25;
      let h = n > 0.6 ? 14 : 9;
      const e = VALLEY[i] > 8 ? 99 : VALLEY[i] + (noise2(gx / 5, gy / 5, 9) - 0.5) * 3;
      if (e < 0) h = 0; else if (e < 2.5) h = e * 1.3; else if (e < 6 && noise2(gx / 18, gy / 18, 5) > 0.55) h = Math.min(h, 6);
      for (const [sx, sy, r, sh] of SPIRES) {
        if (Math.abs(gx - sx) > r || Math.abs(gy - sy) > r) continue;
        const d = hyp((gx - sx) / r, (gy - sy) / (r * 0.6));
        if (d < 1) h = Math.max(h, sh * (1 - d * 0.4) - (hash(gx, 7) > 0.5 ? 2 : 0));
      }
      const le = LAVA_F[i] > 3 ? 99 : LAVA_F[i] + (noise2(gx / 4, gy / 4, 19) - 0.5) * 2;
      if (le < 0) h = 0;
      HT[i] = h;
      GT[i] = le < 0 ? T_LAVA : h < 3 ? T_ASH : T_GLASS;
    }

    // The Court's dais: two broad steps of glass.
    for (let gy = 39; gy < 69; gy++) for (let gx = 88; gx <= 156; gx++) {
      const i = gy * W + gx;
      if (gy < 65 && gx >= 90 && gx <= 154) { HT[i] = 3; GT[i] = T_DAIS; }
      if (gy < 57 && gx >= 98 && gx <= 146) HT[i] = 6;
    }
    // ---------- the road, clearings, bridges, stepping stones ----------
    const inPool = (x, y) => hyp((x - 126) / 25, (y - 138) / 13) < 1.1;
    ROAD.forEach(([sx, sy]) => {
      for (let y = Math.floor(sy - 3); y <= sy + 3; y++) for (let x = Math.floor(sx - 3); x <= sx + 3; x++) {
        if (x < 0 || y < 0 || x >= W || y >= GH) continue;
        const d = hyp(x - sx, y - sy), i = y * W + x;
        if (d > 2.8 || inPool(x, y)) continue;
        if (GT[i] === T_LAVA || GT[i] === T_BRIDGE) { if (d < 2.6) { GT[i] = T_BRIDGE; HT[i] = 2; } continue; }
        HT[i] = 0;
        GT[i] = d < 1.7 ? T_ROAD : GT[i] === T_ROAD ? T_ROAD : T_EDGE;
      }
    });
    for (let k = 0; k < ROAD.length; k += 9) {
      const [sx, sy] = ROAD[k];
      if (!inPool(sx, sy)) continue;
      for (let y = Math.floor(sy - 2); y <= sy + 2; y++) for (let x = Math.floor(sx - 2); x <= sx + 2; x++) if (hyp(x - sx, (y - sy) * 1.3) <= 1.6) { GT[y * W + x] = T_STONE; HT[y * W + x] = 1; }
    }
    STOPS.forEach(([sx, sy], n) => {
      const r = n === 2 ? 7 : 10;
      for (let y = sy - 12; y <= sy + 12; y++) for (let x = sx - 12; x <= sx + 12; x++) {
        if (x < 0 || y < 0 || x >= W || y >= GH) continue;
        const d = hyp(x - sx, y - sy), i = y * W + x;
        if (d <= r) { GT[i] = T_CLEAR; HT[i] = n === 2 ? 1 : 0; }
        else if (d <= r + 1.2 && GT[i] !== T_ROAD && GT[i] !== T_BRIDGE) { GT[i] = T_EDGE; HT[i] = n === 2 ? 1 : 0; }
      }
    });
    // Lava crust: dark cooled plates floating on the lake edges.
    for (let i = 0; i < N; i++) if (GT[i] === T_LAVA && LAVA_F[i] > -2.2 && hash(i % W >> 1, (i / W | 0) >> 1) > 0.55) GT[i] = T_CRUST;

    // Distance to open lava (for glow on banks and cliff faces).
    const DL = new Float32Array(N).fill(99);
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < W; gx++) if (GT[gy * W + gx] === T_LAVA || GT[gy * W + gx] === T_CRUST) {
      if (gx > 0 && gy > 0 && gx < W - 1 && gy < GH - 1 && (GT[gy * W + gx - 1] === T_LAVA) && GT[gy * W + gx + 1] === T_LAVA && GT[(gy - 1) * W + gx] === T_LAVA && GT[(gy + 1) * W + gx] === T_LAVA) { DL[gy * W + gx] = 0; continue; }
      for (let y = gy - 12; y <= gy + 12; y++) for (let x = gx - 12; x <= gx + 12; x++) {
        if (x < 0 || y < 0 || x >= W || y >= GH) continue;
        const i = y * W + x, d2 = (x - gx) * (x - gx) + (y - gy) * (y - gy);
        if (d2 < DL[i] * DL[i]) DL[i] = Math.sqrt(d2);
      }
    }

    // ---------- palettes ----------
    const P = (...a) => a.map(C);
    const GLASS = P('#4a3c5e', '#342a46', '#241c34', '#181226', '#0e0a18');
    const ASH = P('#5e5260', '#4c4252', '#3c3444', '#2c2634');
    const GLASS_T = P('#342a44', '#261e34', '#1a1426', '#110c1a');
    const VIOLET = C('#a88ae0'), VIOLET2 = C('#6a58a0');
    const ROADC = P('#b0a4b0', '#948898', '#786e80'), MORTAR = C('#3a3040'), EDGEC = C('#241c2c');
    const LAVA = P('#fff0a0', '#ffc040', '#ff7a1a', '#d03a0a', '#7a1a08', '#3a0e08');
    const CRUST = P('#3a1e1e', '#2a1418', '#4a2418');
    const FACE = P('#3a2e4c', '#2a2238', '#1c1628', '#120e1c', '#0a0812');
    const FACE_HOT = P('#ffb050', '#e86a20', '#b04418', '#6a2a1e', '#3a1a20');
    const WARM = C('#ff6a20'), EMBER = C('#ffb050');

    // ---------- ground colours ----------
    const GC = new Uint32Array(N);
    const SEEDS = 7;
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < W; gx++) {
      const i = gy * W + gx, g = GT[i];
      let c;
      if (g === T_GLASS) {
        // Black glass: broad calm tones, a few long cracks, glossy diagonal sheens.
        const tn = noise2(gx / 20, gy / 13, 41);
        c = ramp(GLASS_T, 0.3 + tn * 0.65 + (HT[i] > 12 ? -0.2 : 0), gx, gy);
        const cx = Math.floor(gx / 14), cy = Math.floor(gy / 10);
        let f1 = 99, f2 = 99, id = 0;
        for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
          const px = (cx + k + hash(cx + k, cy + j) * 0.8 + 0.1) * 14, py = (cy + j + hash(cy + j, cx + k + 99) * 0.8 + 0.1) * 10;
          const d = hyp(gx - px, gy - py);
          if (d < f1) { f2 = f1; f1 = d; id = (cx + k) * 7919 + cy + j; } else if (d < f2) f2 = d;
        }
        if (f2 - f1 < 0.7 && hash(id, 9) > 0.45) c = GLASS[4];
        const sh = frac((gx * 0.7 + gy) / 29 + noise2(gx / 34, gy / 34, 43) * 0.6);
        if (sh < 0.07 && hash(id, 13) > 0.84 && f1 < 5) c = tn > 0.6 && sh < 0.03 ? VIOLET : VIOLET2;
      } else if (g === T_ASH) {
        c = ramp(ASH, 0.25 + noise2(gx / 11, gy / 7, 45) * 0.6, gx, gy);
        if (hash(gx, gy) > 0.965) c = ASH[3]; else if (hash(gy, gx) > 0.985) c = ASH[0];
      } else if (g === T_ROAD || g === T_CLEAR) {
        const mortar = (gx + (gy >> 1 & 1) * 2) % 4 === 0 || gy % 3 === 0;
        c = mortar ? MORTAR : ROADC[g === T_CLEAR ? 1 + (hash(gx >> 2, gy / 3 | 0) > 0.5 ? 1 : 0) : (hash(gx >> 2, gy / 3 | 0) > 0.6 ? 0 : 1)];
      } else if (g === T_EDGE) c = EDGEC;
      else if (g === T_STONE) c = ROADC[2];
      else if (g === T_BRIDGE) c = (gx % 3 === 0) ? GLASS[2] : C('#5a4a6a');
      else if (g === T_CRUST) c = CRUST[hash(gx >> 1, gy >> 1) > 0.7 ? 2 : 0];
      else if (g === T_DAIS) c = (gx - 90) % 8 === 0 || gy % 6 === 0 ? GLASS[3] : (gx + gy) % 17 === 0 ? VIOLET2 : GLASS[1];
      else c = LAVA[2];
      // Lava light spilling over the banks.
      const dl = DL[i];
      if (g !== T_LAVA && g !== T_CRUST && dl < 9) { const a = sq(1 - dl / 9) * (g === T_ROAD || g === T_CLEAR || g === T_STONE ? 0.35 : 0.6), q = Math.floor(a * 3 + bay(gx, gy) * 0.99) / 3; if (q > 0) c = mixc(c, WARM, q * 0.6); }
      GC[i] = c;
    }
    function mixc(a, b, t) { const r = (a & 255) + ((b & 255) - (a & 255)) * t, g = (a >> 8 & 255) + ((b >> 8 & 255) - (a >> 8 & 255)) * t, bl = (a >> 16 & 255) + ((b >> 16 & 255) - (a >> 16 & 255)) * t; return (0xff000000 | (bl << 16) | (g << 8) | r) >>> 0; }

    // ---------- the ash sky and the volcano ----------
    const BASE = new Uint32Array(W * H), DEPTH = new Float32Array(W * H).fill(-1);
    const VX = 262, VTOP = 5;
    const SKY = P('#0a0810', '#140c18', '#22101c', '#34141c', '#4a1a1a', '#6a2618', '#8a3818');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = hyp(x - VX, (y - 12) * 1.8);
      BASE[y * W + x] = ramp(SKY, y / 30 * 0.7 + 0.45 * Math.exp(-sq(d / 60)), x, y);
    }
    for (let y = VTOP; y < 26; y++) {
      const hw = 5 + (y - VTOP) * 2.3;
      for (let x = Math.round(VX - hw); x <= Math.round(VX + hw); x++) {
        const rel = (x - VX) / hw;
        let c = rel < -0.7 ? C('#2a1a2a') : rel < 0.2 ? C('#1a1220') : C('#120c18');
        if (y === VTOP || (y === VTOP + 1 && Math.abs(rel) < 0.8)) c = C('#ff9a30');
        // Lava streaks down the flank.
        if (Math.abs(x - VX - 2 - Math.sin(y / 3) * 2) < 0.7 && y < 20) c = C(y < 12 ? '#ffb040' : '#c04a18');
        if (Math.abs(x - VX + 7 + (y - VTOP) * 0.9) < 0.6 && y < 17) c = C('#d05a18');
        BASE[y * W + x] = c;
      }
    }
    // Far ridges of the horizon.
    for (let x = 0; x < W; x++) {
      const top = Math.round(19 + 3 * noise2(x / 14, 0, 31) + 2 * Math.sin(x / 9));
      for (let y = top; y < 26; y++) if (Math.abs(x - VX) > 5 + (y - VTOP) * 2.3) BASE[y * W + x] = y === top ? C('#5a2a2a') : C('#1a1018');
    }

    // ---------- project the land ----------
    const LAVA_PIX = [], LAVA_G = [];
    for (let x = 0; x < W; x++) {
      let ymin = H;
      for (let gy = GH - 1; gy >= HZ; gy--) {
        const i = gy * W + x, h = HT[i], sy = Math.round(gy - h);
        if (sy >= ymin) continue;
        const span = ymin - sy, dl = Math.min(DL[i], DL[Math.min(N - 1, i + 3 * W)]);
        for (let y = Math.max(0, sy); y < Math.min(ymin, H); y++) {
          const o = y * W + x;
          DEPTH[o] = gy;
          if (y === sy || span < 3) {
            BASE[o] = y === sy && span >= 3 && h > 2 ? (dl < 7 ? C('#ffb060') : noise2(x / 9, gy / 9, 47) > 0.72 ? VIOLET : VIOLET2) : GC[i];
            if (GT[i] === T_LAVA && y === sy) { LAVA_PIX.push(o); LAVA_G.push(i); }
          } else {
            const z = h - (y - sy), rel = 1 - z / (h + 1);
            const glint = (x + Math.round(z * 0.5)) % 7 === 0;
            BASE[o] = dl < 6 ? ramp(FACE_HOT, 0.15 + (1 - rel) * 0.5 + dl / 8, x, y) : glint ? FACE[0] : ramp(FACE, 0.25 + rel * 0.6, x, y);
          }
        }
        ymin = sy;
        if (ymin <= 0) break;
      }
    }
    for (let y = 0; y < 34; y++) for (let x = 0; x < W; x++) { const o = y * W + x; if (DEPTH[o] >= 0 && DEPTH[o] < HZ + 12 && bay(x, y) < 0.5) blend(BASE, o, C('#4a1a1a'), 0.4); }

    function oput(b, x, y, c, d) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const o = y * W + x;
      if (DEPTH[o] <= d + 0.5) { b[o] = c; if (b === BASE) DEPTH[o] = d; }
    }
    const sAt = (x, gy) => Math.round(gy - HT[Math.round(gy) * W + Math.round(x)]);   // screen y of the ground
    const OUT = C('#0a0610');
    const BR = P('#ffd08a', '#e0a060', '#a86a3a', '#6a3a2a', '#3a1e1e');   // bronze

    // ---------- landmarks ----------
    const HGS = [], TABLETS = [], JURY = [], PILLARS = [], CORALS = [];
    // 1. Short Sentence: the Bailiff's gate tower, a rook with an hourglass on its roof.
    (function gateTower() {
      const cx = 22, gy = 128, base = sAt(cx, gy), r = 6, hh = 18;
      for (let z = 0; z < hh; z++) for (let dx = -r; dx <= r; dx++) {
        const rel = dx / r, c = rel < -0.6 ? C('#6a58a0') : rel < 0.1 ? GLASS[1] : rel < 0.7 ? GLASS[2] : GLASS[4];
        oput(BASE, cx + dx, base - z, z % 5 === 4 ? GLASS[3] : c, gy);
      }
      for (let dx = -r - 1; dx <= r + 1; dx++) { oput(BASE, cx + dx, base - hh, C('#5a4a70'), gy); oput(BASE, cx + dx, base - hh - 1, VIOLET, gy); }
      for (let dx = -r - 1; dx <= r + 1; dx++) if (((dx + r + 1) >> 1) % 2 === 0) for (let z = 2; z < 4; z++) oput(BASE, cx + dx, base - hh - z, dx < 0 ? VIOLET2 : GLASS[2], gy);
      for (let z = 0; z < 6; z++) for (let dx = -2; dx <= 1; dx++) oput(BASE, cx + dx, base - z, OUT, gy + 0.2);       // the gate
      oput(BASE, cx - 1, base - 6, C('#ff6a20'), gy + 0.2); oput(BASE, cx, base - 6, C('#ff6a20'), gy + 0.2);
      HGS.push({ x: cx, y: base - hh - 4, s: 1, stop: 0 });
    })();
    // 2. Verdicts: the Judge's high bench with three verdict tablets before it.
    (function bench() {
      const cx = 84, gb = 92, gf = 98, hh = 8, base = n => n;
      for (let gy = gb; gy < gf; gy++) for (let x = cx - 9; x <= cx + 9; x++) oput(BASE, x, sAt(x, gf) - hh - (gf - gy), x === cx - 9 ? VIOLET2 : GLASS[1], gy);
      const fy = sAt(cx, gf);
      for (let z = 0; z < hh; z++) for (let x = cx - 9; x <= cx + 9; x++) oput(BASE, x, fy - z, z === hh - 1 ? VIOLET : x === cx + 9 ? GLASS[4] : z % 4 === 1 ? GLASS[3] : GLASS[2], gf);
      for (let x = cx - 9; x <= cx + 9; x++) oput(BASE, x, fy - 3, BR[2], gf + 0.1);
      // The gavel on top.
      for (const [dx, dz, c] of [[3, hh + 6, BR[1]], [4, hh + 6, BR[1]], [5, hh + 6, BR[2]], [4, hh + 5, BR[3]], [4, hh + 7, BR[1]]]) oput(BASE, cx + dx, fy - (gf - gb) - dz + 6, c, gb);
      TABLETS.push([cx - 10, fy + 4], [cx - 1, fy + 5], [cx + 8, fy + 4]);
      for (const [tx, ty] of TABLETS) for (let z = 0; z < 7; z++) for (let dx = -2; dx <= 2; dx++) {
        if (z === 6 && Math.abs(dx) === 2) continue;
        oput(BASE, tx + dx, ty - z, dx === -2 ? VIOLET2 : z === 6 ? C('#7a6a9a') : GLASS[2], ty + 1);
      }
    })();
    // 4. The Jury: twelve pawn statues in two rows inside a low stone box.
    (function jury() {
      // A tiered box: the back bench raised on a step, a low wall in front, pale stone jurors.
      const x0 = 149, gy0 = 110, ST = P('#c0b4cc', '#8a7e9a', '#524660');
      for (let gy = gy0 - 7; gy < gy0 - 3; gy++) for (let x = x0 - 2; x <= x0 + 31; x++) oput(BASE, x, gy - 3, gy === gy0 - 7 ? VIOLET2 : GLASS[2], gy);
      for (let x = x0 - 2; x <= x0 + 31; x++) for (let z = 0; z < 3; z++) oput(BASE, x, gy0 - 4 - z, z === 2 ? VIOLET2 : GLASS[3], gy0 - 3);
      for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) {
        const x = x0 + 2 + k * 5 + (r ? 2 : 0), gy = r ? gy0 + 1 : gy0 - 5, y = gy - (r ? 0 : 3);
        for (const [dx, dz, t] of [[-1, 0, 1], [0, 0, 1], [1, 0, 2], [-1, 1, 0], [0, 1, 1], [1, 1, 2], [0, 2, 1], [-1, 3, 0], [0, 3, 1], [1, 3, 2], [0, 4, 0], [1, 4, 1]]) oput(BASE, x + dx, y - dz, ST[t], gy);
        JURY.push([x, y - 3, gy]);
      }
      for (let x = x0 - 2; x <= x0 + 31; x++) for (let z = 0; z < 2; z++) oput(BASE, x, gy0 + 3 - z, z === 1 ? VIOLET2 : GLASS[2], gy0 + 3);
    })();
    // 5. Last Appeal: the executioner's block with the giant axe bitten into it.
    (function block() {
      const cx = 248, gy = 128, y = sAt(cx, gy);
      for (let z = 0; z < 4; z++) for (let dx = -4; dx <= 4; dx++) oput(BASE, cx + dx, y - z, z === 3 ? C('#8a5a44') : dx < -2 ? C('#6a3a30') : C('#4a2624'), gy);
      for (let dx = -4; dx <= 4; dx++) oput(BASE, cx + dx, y - 4, C('#a87050'), gy);
      for (let k = 0; k < 12; k++) oput(BASE, cx - 1 + k * 0.35, y - 4 - k, C(k > 9 ? '#8a5a3e' : '#5a3424'), gy + 0.2);     // the haft
      for (let j = -3; j <= 3; j++) for (let k = 0; k < 5; k++) { const edge = k === 0; oput(BASE, cx - 2 - k + j * 0.2, y - 5 + j, edge ? C('#ffffff') : k < 2 ? C('#c8c8e0') : C('#6a6a88'), gy + 0.3); }
    })();
    // 6. Embers of the Court: four braziers around a small plaza.
    const BRAZ = [[256, 90], [288, 90], [258, 116], [288, 114]].map(([x, gy]) => {
      const y = sAt(x, gy);
      for (const [dx, dz] of [[-2, 0], [2, 0], [-1, 1], [1, 1], [0, 2], [-3, 3], [-2, 3], [-1, 3], [0, 3], [1, 3], [2, 3], [3, 3], [-2, 4], [2, 4]]) oput(BASE, x + dx, y - dz, dz === 3 ? BR[1] : BR[3], gy);
      return { x, y: y - 4, gy };
    });
    // 7. The Hourglass Turns: footprints in the glass leading to the brink.
    const PRINTS = [];
    for (let k = 0; k < 6; k++) { const x = 212 + (k % 2 ? 2 : -2), gy = 72 - k * 3; PRINTS.push([x, sAt(x, gy), gy]); }
    // 8. The Court of Judgement: dais, pillars, the throne and the giant hourglass.
    // 8. The Court of Judgement: pillars along the back of the dais, the throne, chains.
    const COURT = { cx: 122, gy: 58 };
    (function court() {
      const cx = COURT.cx;
      for (const px of [96, 106, 138, 148]) {
        const gy = 41, pb = gy - 6, ph = 22;
        for (let z = 0; z < ph; z++) for (let dx = -2; dx <= 2; dx++) oput(BASE, px + dx, pb - z, dx === -2 ? VIOLET : dx === -1 ? VIOLET2 : dx === 2 ? GLASS[4] : GLASS[2], gy);
        for (let dx = -3; dx <= 3; dx++) { oput(BASE, px + dx, pb - ph, VIOLET, gy); oput(BASE, px + dx, pb - ph + 1, GLASS[1], gy); oput(BASE, px + dx, pb, C('#9a6a5a'), gy); oput(BASE, px + dx, pb - 1, GLASS[3], gy); }
        PILLARS.push([px - 2, pb - ph + 2, pb - 1]);
      }
      // The throne: a tall black back crowned with spikes, a bronze-trimmed seat.
      const gy = 47, tb = gy - 6;
      for (let z = 0; z < 22; z++) { const hw = z < 7 ? 7 : 5; for (let dx = -hw; dx <= hw; dx++) oput(BASE, cx + dx, tb - z, dx === -hw ? VIOLET : dx === hw ? GLASS[4] : z === 6 ? BR[2] : GLASS[z < 7 ? 1 : 2], gy); }
      for (const [dx, h] of [[-4, 3], [-2, 5], [0, 7], [2, 5], [4, 3]]) for (let j = 0; j < h; j++) oput(BASE, cx + dx, tb - 22 - j, j === h - 1 ? VIOLET : GLASS[3], gy);
      // Braziers of red coals at the dais corners.
      for (const bx of [92, 152]) { const by = 65 - 3; for (let dx = -2; dx <= 2; dx++) { oput(BASE, bx + dx, by - 2, BR[1], 65); oput(BASE, bx + dx, by - 1, BR[3], 65); } CORALS.push([bx, by - 3]); }
    })();
    // ---------- animated ----------
    const vignette = K.vignette(C('#040208'), 0.42, 0.42);
    const HG = { x: 74, top: 36, mid: 50, bot: 64, r: 8 };                 // the giant hourglass (screen)
    const EMBERS = Array.from({ length: 46 }, (_, i) => ({ k: 2 + (i % 5), p: hash(i, 2), w: hash(i, 3) * TAU, src: LAVA_PIX[Math.floor(hash(i, 1) * LAVA_PIX.length)] }));
    const ASHF = Array.from({ length: 40 }, (_, i) => ({ x: hash(i, 11) * W * 1.4, k: 1 + (i % 3), p: hash(i, 12) }));
    const BUBBLES = Array.from({ length: 9 }, (_, i) => ({ o: LAVA_PIX[Math.floor(hash(i, 21) * LAVA_PIX.length)], k: 6 + (i % 4), p: hash(i, 22) }));
    const CHAINS = [[101, 12], [143, 12], [66, 24]];
    // Glow on the lava's banks, breathing (precomputed pixel list).
    const GL = [], GLA = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = y * W + x, d = DEPTH[o];
      if (d < 0) continue;
      const dl = DL[Math.round(d) * W + x];
      if (dl > 0.5 && dl < 4 && bay(x, y) < 0.5) { GL.push(o); GLA.push((1 - dl / 4) * 0.25); }
    }
    const GL_I = Int32Array.from(GL), GL_A = Float32Array.from(GLA);
    const RX = new Float32Array(H);
    for (const [x, y] of RIVER) if (y >= 0 && y < H) RX[Math.round(y)] = x;
    for (let y = 1; y < H; y++) if (!RX[y]) RX[y] = RX[y - 1];

    function dput(x, y, c, d) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const o = y * W + x; if (DEPTH[o] <= d + 0.5) buf[o] = c; }
    function lavaN(xs, ys, P, seed) {
      const j = Math.floor(ys), f = ys - j, s = f * f * (3 - 2 * f);
      return noiseLoop(xs, j + seed, P) * (1 - s) + noiseLoop(xs, j + 1 + seed, P) * s;
    }
    // Noise per pixel pair (the lava is the most expensive part of the frame).
    const LN = new Float32Array((W >> 1) * (GH >> 1)), LSTAMP = new Int32Array((W >> 1) * (GH >> 1)).fill(-1);
    let lavaFrame = 0;
    function lava(u) {
      lavaFrame++;
      for (let k = 0; k < LAVA_PIX.length; k += 1) {
        const o = LAVA_PIX[k], g = LAVA_G[k], gx = g % W, gy = (g / W) | 0, key = (gy >> 1) * (W >> 1) + (gx >> 1);
        // Flow down the river, and a slower churn across it.
        let n = LN[key];
        if (LSTAMP[key] !== lavaFrame) { const hx = gx & ~1, hy = gy & ~1; n = LN[key] = lavaN(hy / 6 - 72 * u + hx / 30, hx / 10, 24, 3) * 0.6 + lavaN(hx / 7 - 20 * u, hy / 4, 20, 31) * 0.4; LSTAMP[key] = lavaFrame; }
        const vein = Math.abs(frac(n * 4) - 0.5) < 0.07;
        buf[o] = vein ? LAVA[4] : ramp(LAVA, 0.95 - n * 1.15, gx, gy);
      }
    }
    function hourglass(u, beaten) {
      const { x, top, mid, bot, r } = HG, d = 66;
      const hw = y => { const q = y < mid ? (mid - y) / (mid - top) : (y - mid) / (bot - mid); return 1 + (r - 1) * Math.sin(Math.PI / 2 * Math.min(1, q * 1.3)); };
      for (const yy of [top - 3, bot]) for (let dx = -r - 3; dx <= r + 3; dx++) { dput(x + dx, yy, BR[yy === bot ? 2 : 1], d); dput(x + dx, yy + 1, BR[3], d); dput(x + dx, yy + 2, BR[yy === bot ? 3 : 4], d); }
      for (const px of [x - r - 2, x + r + 2]) for (let yy = top - 1; yy < bot; yy++) dput(px, yy, BR[px < x ? 2 : 3], d);
      const cyc = beaten ? 0.55 : frac(3 * u), level = cyc;                  // sand runs down over 40 s
      const topSand = mid - (mid - top - 2) * (1 - level), botSand = bot - (bot - mid - 3) * level;
      for (let yy = top; yy < bot; yy++) {
        const w = hw(yy);
        for (let xx = Math.round(x - w); xx <= Math.round(x + w); xx++) {
          const edge = Math.abs(xx - x) > w - 1;
          const sand = (yy < mid && yy > topSand) || (yy > botSand);
          if (sand) dput(xx, yy, C((xx + yy) % 5 === 0 ? '#ffe8a0' : xx < x ? '#f0c060' : '#c89040'), d);
          else if (edge) dput(xx, yy, C(xx < x ? '#c8b8f0' : '#6a5a90'), d);
          else { const o = yy * W + xx; if (o >= 0 && o < W * H) blend(buf, o, C('#8a7ab0'), 0.2); }
        }
      }
      if (!beaten) {
        for (let yy = mid; yy < botSand; yy++) dput(x + ((yy + Math.floor(u * LOOP * 20)) % 3 === 0 ? 1 : 0), yy, C('#ffe8a0'), d);
        glow(buf, x, mid + 6, 14, C('#ffd070'), 0.12);
      } else for (const [dx, dy] of [[-2, -6], [-1, -5], [0, -4], [0, -3], [1, -2], [2, -1], [1, 2], [2, 3], [3, 4]]) dput(x + dx, mid + dy, C('#f4f0ff'), d);
    }
    function smoke(u) {
      for (let i = 0; i < 16; i++) {
        const a = frac(2 * u + i / 16), x = VX + a * -60 + Math.sin(a * 6 + i) * 3, y = VTOP - 1 - a * 22 + a * a * 10, r = 1.5 + a * 7;
        for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++)
          if (sq(xx - x) + sq(yy - y) <= r * r && yy >= 0 && yy < H && xx >= 0 && xx < W && DEPTH[yy * W + xx] < 0) blend(buf, yy * W + xx, C(a < 0.2 ? '#6a3a30' : '#2e2230'), (1 - a) * 0.5);
      }
      const pulse = 0.5 + 0.5 * Math.sin(TAU * 8 * u);
      glow(buf, VX, VTOP + 1, 10, C('#ff8a30'), 0.25 + 0.2 * pulse);
    }
    function fireJet(u) {
      const v = frac(4 * u), cx = 143, cy = 143;
      if (v < 0.25) {
        const hgt = Math.sin(v / 0.25 * Math.PI) * 16;
        for (let j = 0; j < hgt; j++) { const w = 1.5 - j / hgt; for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) dput(cx + dx + Math.round(Math.sin(j * 0.8 + u * 900) * 0.6), cy - j, C(j < hgt * 0.3 ? '#fff0a0' : j < hgt * 0.7 ? '#ffc040' : '#ff7a1a'), cy + 1); }
        glow(buf, cx, cy - hgt / 2, 12, C('#ff8a30'), 0.25);
      }
      for (let i = 0; i < 5; i++) { const a = frac(4 * u + i / 5); if (v < 0.4) put(buf, cx + Math.sin(i * 2.1) * a * 8, cy - 4 - a * 18, C(a < 0.5 ? '#ffc040' : '#a8300a')); }
    }
    function braziers(u, cleared) {
      CORALS.forEach(([x, y], n) => { K.flame(buf, x - 2, y, 5, 4, u, 3 + n, ['#ffd0a0', '#ff6a3a', '#d02a1a', '#6a1010']); glow(buf, x, y - 1, 9, C('#ff4a2a'), 0.2); });
      BRAZ.forEach((b, n) => {
        K.flame(buf, b.x - 2, b.y, 5, 6, u, n * 1.7);
        glow(buf, b.x, b.y - 2, 10, C('#ff9a40'), 0.2 + 0.05 * Math.sin(TAU * (29 + n) * u));
      });
    }
    function ghostHourglass(u, lit) {
      // A pale, see-through hourglass hanging over the spot of the memory, turning over every 30 s.
      const cx = 214, cy = 58, v = frac(4 * u), turn = v > 0.9 ? (v - 0.9) / 0.1 * Math.PI : 0;
      const ca = Math.cos(turn), sa = Math.sin(turn), a = 0.35 + 0.1 * Math.sin(TAU * 12 * u) + (lit ? 0.15 : 0);
      for (let j = -7; j <= 7; j++) {
        const w = 1 + 4 * Math.abs(j) / 7;
        for (let i = -w; i <= w; i += 0.5) {
          const edge = Math.abs(i) > w - 1 || Math.abs(j) === 7, x = cx + i * ca - j * sa * 0.3, y = cy + j * ca + i * sa * 0.2;
          if (edge) blendAt(buf, x, y, C('#d8e8ff'), a + 0.2);
          else if ((j > 2 && v < 0.9) || (j < -2 && v >= 0.9)) blendAt(buf, x, y, C('#fff4c0'), a);
        }
      }
      glow(buf, cx, cy, 14, C('#b8c8ff'), 0.08);
      // Footprints light up one after another toward the brink, then fade.
      PRINTS.forEach(([x, y, gy], k) => {
        const on = frac(6 * u - k / 10);
        const al = on < 0.5 ? 0.8 * (1 - on * 2) : 0;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, -1], [1, -1]]) { const o = (y + dy) * W + x + dx; if (DEPTH[o] <= gy + 0.5) blend(buf, o, C('#c8e0ff'), 0.3 + al * 0.7); }
      });
      // Far across the lava, a crystal glint: the one who watched.
      const tw = Math.sin(TAU * 10 * u);
      if (tw > -0.2) { put(buf, 305, 22, C('#f0a0ff')); if (tw > 0.6) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blendAt(buf, 305 + dx, 22 + dy, C('#d932ff'), 0.6); }
    }
    function tablets(lit, u) {
      TABLETS.forEach(([tx, ty], n) => {
        const on = lit || Math.sin(TAU * 5 * u + n * 2) > 0.6;
        const c = C(lit ? '#ffe080' : on ? '#ff8a30' : '#8a3a24');
        for (const [dx, dz] of [[-1, 4], [0, 4], [1, 4], [0, 3], [-1, 2], [1, 2], [0, 1]]) dput(tx + dx, ty - dz, c, ty + 1);
      });
    }
    function juryEyes(u, lit) {
      JURY.forEach(([x, y, gy], n) => {
        const on = lit ? true : Math.sin(TAU * 4 * u - n * 0.5) > 0.7;
        if (on) dput(x, y, C(lit ? '#ffe080' : '#ff4444'), gy);
      });
    }
    function flag(x, y, u) {
      for (let z = 0; z < 9; z++) put(buf, x, y - z, C('#1a1020'));
      for (let i = 1; i <= 5; i++) for (let j = 0; j < 3; j++) {
        if (j === 2 && i > 3) continue;
        put(buf, x + i, y - 8 + j + Math.round(Math.sin(TAU * 30 * u - i * 0.9) * 0.8 * (i / 5)), C(j === 0 ? '#ffd23a' : '#e84a34'));
      }
    }

    // ---------- Checkmate ----------
    const CM = [
      '........o........',
      '.......oBo.......',
      '...o...oBo...o...',
      '..oBo.oBbBo.oBo..',
      '..oBBoBBbBBoBBo..',
      '..oBBBBBBBBBBBo..',
      '..obbbbbbbbbbbo..',
      '.oRRRRRRRRRRRRRo.',
      'oRRRvvvvvvvvvRRro',
      'oRRvvvvvvvvvvvRro',
      'oRRvvEvvvvvEvvRro',
      'oRRvvvvvvvvvvvRro',
      'oLRRvvvvvvvvvRRro',
      '.oLRRvvvvvvvRRro.',
      '.oLRRRRRRRRRRRro.',
      'oLLRRRRRRRRRRRrro',
      'oLRRRRRRRRRRRRRro',
      'oLRRRRRRRRRRRRRro',
      'oLRRRRRRRRRRRRRro',
      '.oLRRRRRRRRRRRro.',
      '.oLRRRRRRRRRRRro.',
      '.oLRRRRRRRRRRRro.',
      'oLLRRRRRRRRRRRrro',
      'oLRRRRRRRRRRRRRro',
      'oBBBBBBBBBBBBBBBo',
      'okkkkkkkkkkkkkkko',
      'oKkkkkkkkkkkkkkko',
      '.ooooooooooooooo.',
    ];
    const CMPAL = { o: C('#0a0610'), B: C('#e0a060'), b: C('#a86a3a'), R: C('#8a2424'), r: C('#4a1220'), L: C('#d8583a'), v: C('#0a0408'), E: C('#ff4444'), k: C('#201a2e'), K: C('#6a58a0') };
    const CMW = 17, CMH = CM.length, CMX = COURT.cx, CMY = 59;
    function checkmate(u, beaten) {
      const breath = Math.sin(TAU * 20 * u) > 0.3 ? 1 : 0, sway = beaten ? (Math.sin(TAU * 30 * u) > 0.6 ? 1 : 0) : Math.round(Math.sin(TAU * 4 * u) * 1);
      const ox = CMX - (CMW >> 1) + sway, oy = CMY - CMH + 1, d = 63;
      for (let j = 0; j < CMH; j++) for (let i = 0; i < CMW; i++) {
        const ch = CM[j][i];
        if (ch === '.' || !ch) continue;
        const top = j < 24;
        let c = CMPAL[ch];
        // The robe's hem stirs in the heat.
        if (j >= 20 && j < 24 && ch === 'R' && Math.sin(TAU * 40 * u + i * 0.9 + j) > 0.75) c = C('#b83a34');
        dput(ox + i - (top ? 0 : sway), oy + j + (top && j < 15 ? -breath : 0), c, d);
      }
      // Eyes burning in the hood.
      const ey = oy + 10 - breath, eg = beaten ? (Math.sin(TAU * 50 * u) > 0 ? 0.4 : 0.1) : 0.4 + 0.2 * Math.sin(TAU * 10 * u);
      for (const ex of [ox + 5, ox + 11]) { dput(ex, ey, C(beaten && eg < 0.2 ? '#aa2222' : '#ffc8b0'), d); glow(buf, ex, ey, 3, C('#ff2a1a'), eg); }
      // Bony hands clasped in front, holding a small hourglass.
      const hy = oy + 16 - breath, hx = ox + 8;
      for (let dy = -2; dy <= 2; dy++) { const w = Math.abs(dy) === 2 ? 2 : Math.abs(dy) === 1 ? 1 : 0; for (let dx = -w; dx <= w; dx++) dput(hx + dx, hy + dy, C(Math.abs(dy) === 2 ? '#e0a060' : (dy > 0) === (frac(3 * u) > 0.5) ? '#f0c060' : '#6a5a90'), d + 1); }
      for (const dx of [-3, 3]) { dput(hx + dx, hy, C('#f6ecdc'), d + 1); dput(hx + dx, hy + 1, C('#aa968c'), d + 1); }
    }

    function frame(t, cleared, beaten) {
      const u = t / LOOP;
      buf.set(BASE);
      lava(u);
      for (const b of BUBBLES) {
        const v = frac(b.k * u + b.p), r = v < 0.7 ? v * 2 : (1 - v) * 4.5, x = b.o % W, y = (b.o / W) | 0;
        if (r > 0.4) K.disc(buf, x, y, r, (dx, dy, dd) => dd > 0.7 ? LAVA[1] : LAVA[0]);
      }
      const br = 0.8 + 0.2 * Math.sin(TAU * 5 * u);
      for (let k = 0; k < GL_I.length; k++) blend(buf, GL_I[k], WARM, GL_A[k] * br);
      // Heat shimmer over the river.
      for (let y = 60; y < 150; y += 1) {
        const dx = Math.round(Math.sin(TAU * 30 * u + y * 0.8) * 0.7);
        if (!dx) continue;
        const cxr = RX[y];
        const row = buf.slice(y * W, y * W + W);
        for (let x = Math.max(1, Math.round(cxr) - 12); x < Math.min(W - 1, cxr + 12); x++) buf[y * W + x] = row[x - dx];
      }
      smoke(u);
      // Violet glints sliding down the pillars.
      PILLARS.forEach(([px, top, bot], n) => { const y = top + frac((3 + n) * u) * (bot - top + 20) - 10; for (let j = 0; j < 4; j++) if (y + j >= top && y + j < bot) put(buf, px, y + j, C(j < 2 ? '#ffffff' : '#c8b0ff')); });
      for (const [cx, len] of CHAINS) { const sw = Math.sin(TAU * 6 * u + cx) * 1.5; for (let j = 0; j < len; j++) if (j % 3 !== 2) dput(cx + sw * j / len + (j % 3 === 1 ? 1 : 0), j, C(j % 3 === 0 ? '#5a4a6a' : '#2a2234'), 30); }
      for (const hg of HGS) {                                               // the Bailiff's little hourglass
        const flip = frac(6 * u) < 0.5;
        for (let j = -2; j <= 2; j++) for (let i = -Math.abs(j) + (Math.abs(j) === 2 ? -1 : 0); i <= Math.abs(j) + (Math.abs(j) === 2 ? 1 : 0); i++) put(buf, hg.x + i, hg.y + j, C(Math.abs(j) === 2 ? '#e0a060' : (j > 0) === flip ? '#f0c060' : '#6a5a90'));
        if (cleared > hg.stop) glow(buf, hg.x, hg.y, 6, C('#ffd070'), 0.25);
      }
      tablets(cleared > 1, u);
      fireJet(u);
      juryEyes(u, cleared > 3);
      braziers(u, cleared > 5);
      ghostHourglass(u, cleared > 6);
      hourglass(u, beaten);
      checkmate(u, beaten);
      for (let s = 0; s < STOPS.length - 1; s++) if (cleared > s) flag(STOPS[s][0] + 14, STOPS[s][1] - 2, u);
      if (beaten) flag(STOPS[7][0] + 18, STOPS[7][1] - 2, u);
      // Embers rising from the lava, ash drifting down.
      for (const e of EMBERS) {
        if (e.src === undefined) continue;
        const v = frac(e.k * u + e.p), x = e.src % W + Math.sin(v * 6 + e.w) * 4 + v * 6, y = ((e.src / W) | 0) - v * 60;
        if (v < 0.8) put(buf, x, y, C(v < 0.25 ? '#ffe080' : v < 0.55 ? '#ff8a2a' : '#a8300a'));
      }
      for (const a of ASHF) {
        const v = frac(a.k * u + a.p), x = (a.x - v * 80) % (W + 40), y = v * (H + 10) - 5;
        blendAt(buf, x < 0 ? x + W + 40 : x, y, C('#8a8090'), 0.55);
      }
      vignette(buf);
    }

    return (t, out, state) => {
      buf = out;
      const m = (state && state.map) || {};
      frame(t, m.cleared | 0, !!m.beaten);
    };
  },
});
