// The Grand Library: World 8's local map, where the world-map zoom lands.
//
// 320x200, shown at 4x. The Library at night as a cut-away floor plan seen from above, like
// a dungeon map: the north wall's tall arched windows along the top let in the moon, whose
// beams fall in pale blue slabs across the floors, against warm pools of candle and fire
// light. The Library is a puzzle hall, so each stop is a room, joined by a red runner that
// passes through the doorways:
//   1 Footnotes                the lobby: the Librarian's desk, paper slips fluttering
//   2 The Back Rank Wing       rows of tall shelves ending on the last row, a rolling ladder
//   3 The Knight's Alcove      a knight statue on a plinth and a spilled inkwell, ink shining
//   4 The Queen's Reading Room a great rug, armchairs, a fire, a marble queen on a pedestal
//   5 The Closed Stacks        shelves behind iron bars and a padlock; the Night Porter's
//                              lantern patrols the aisle
//   6 Turn the Page            a giant book on a lectern turning its pages, king bookends
//   7 The Blank Chapter        a writing desk with a blank book; a ghostly pen writes the
//                              first letter of your name (a memory of the crossing)
//   8 the lair                 the round Great Reading Room under a glass dome: a star-map
//                              floor in a pool of moonlight, where the EndGamer (a blue king,
//                              crown with points and a ball, no cross) reads and paces, and
//                              waves once beaten
// Moves: candles and the fire flicker, moon beams breathe with dust in them, floating books
// flap about, the ladder rolls, pages turn, the porter patrols, the pen writes, stars
// twinkle in the windows and in the floor, an owl blinks, ink glistens, slips flutter.
// State (LiveScenes.setState('map_grandlibrary', { map: { cleared, beaten } })): cleared
// rooms get a gold bookmark ribbon by their stop.
LiveScenes.register({
  id: 'map_grandlibrary',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  stops: [[34, 134], [40, 70], [102, 62], [110, 130], [162, 64], [176, 134], [240, 146], [262, 98]],
  create() {
    const W = 320, H = 200, N = W * H, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, noise2, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, rect, line, glow } = K;
    const S = LiveScenes.get('map_grandlibrary').stops;
    let buf = null;
    const P = h => h.map(C);
    const band = (cols, t, x, y, w = 0.22) => {
      t = clamp(t) * (cols.length - 1);
      const i = t | 0, f = clamp((t - i - 0.5) / w + 0.5);
      return cols[Math.min(cols.length - 1, i + (f > bay(x, y) ? 1 : 0))];
    };

    const BASE = new Uint32Array(N);
    const KIND = new Uint8Array(N);         // 1 floor, 2 runner, 4 built
    const HGT = new Uint8Array(N);

    // ---------- palette ----------
    const WOOD = P(['#8a5a36', '#6a4028', '#4a2a1c', '#301a12', '#1c0e0a']);
    const WOODW = P(['#c8884a', '#a0663a', '#7a4a2a', '#56321e', '#3a2016']);        // candle-lit wood
    const STONE = P(['#8a8098', '#6a6078', '#4a4458', '#322e40', '#221e2e']);
    const NIGHT = P(['#0a1030', '#142050', '#1e3068', '#2a4480', '#3a5a9c']);
    const SPINES = ['#8a2a2a', '#2a4a7a', '#2a6a4a', '#7a5a2a', '#5a2a6a', '#9a6a3a', '#3a3a5a', '#6a2a3a'].map(h => [C(mix(h, '#ffd8a0', 0.3)), C(h), C(mix(h, '#000000', 0.45))]);
    const GILT = C('#d8a850'), GILTD = C('#8a6428');
    const RUNNER = P(['#b03a3a', '#8a2430', '#641a26']);
    const MOON = C('#9ac0f0'), MOONL = C('#dce8ff'), CANDLE = C('#ffb860'), FLAME = C('#ffe080');
    const LINE = C('#0a0608'), SHAD = C('#06040c');
    const PAGE = C('#f4ead0'), PAGE2 = C('#d8c8a8'), INK = C('#141020');

    // ---------- the north wall's inner face, with tall arched windows (under the header) ----------
    const WINS = [26, 92, 158, 220, 286];
    const MOONW = 158;
    for (let y = 0; y < 36; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const wIdx = WINS.findIndex(wx => Math.abs(x - wx) < 11);
      if (wIdx >= 0) {
        const wx = WINS[wIdx], dx = x - wx, archY = 6 + 11 - Math.sqrt(Math.max(0, 121 - dx * dx));
        if (y >= archY && y < 32) {
          const frame = Math.abs(dx) > 9.5 || y < archY + 1.2 || dx === 0 || y === 20;
          BASE[i] = frame ? (Math.abs(dx) > 9.5 ? WOOD[2] : WOOD[3]) : band(NIGHT, (y - 6) / 30, x, y);
          continue;
        }
      }
      // Shelves between the windows: rows of spines, planks, the heights lost in gloom.
      const row = Math.floor(y / 7), inRow = y % 7, book = Math.floor(x / 2.2 + row * 13.7);
      const sp = SPINES[Math.floor(hash(book, row) * SPINES.length)];
      let c = inRow === 0 ? WOOD[2] : frac(x / 2.2 + row * 13.7) < 0.18 ? WOOD[4] : inRow === 3 && hash(book, 7) > 0.6 ? GILTD : sp[y < 14 ? 2 : 1];
      if (y >= 32) c = y === 32 ? WOOD[1] : WOOD[3];
      BASE[i] = c;
    }
    disc2(BASE, MOONW + 3, 14, 4.2, (dx, dy, d) => d > 0.8 ? C('#b8c8f0') : C('#f0f4ff'));
    function disc2(b, cx, cy, r, col) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x - cx, y - cy) / r; if (d <= 1) put(b, x, y, col(x - cx, y - cy, d)); } }

    // ---------- rooms ----------
    const ROOMS = [
      { id: 1, x0: 0, y0: 106, x1: 74, y1: 200, floor: 'check' },
      { id: 2, x0: 0, y0: 36, x1: 74, y1: 106, floor: 'parquet' },
      { id: 3, x0: 74, y0: 36, x1: 128, y1: 96, floor: 'stone' },
      { id: 4, x0: 74, y0: 96, x1: 142, y1: 200, floor: 'parquet' },
      { id: 5, x0: 128, y0: 36, x1: 196, y1: 96, floor: 'grate' },
      { id: 6, x0: 142, y0: 96, x1: 206, y1: 200, floor: 'parquet' },
      { id: 7, x0: 206, y0: 122, x1: 320, y1: 200, floor: 'boards' },
      { id: 8, x0: 196, y0: 36, x1: 320, y1: 122, floor: 'stars' },
    ];
    const roomAt = (x, y) => ROOMS.find(r => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1) || ROOMS[0];
    const RT = { x: 258, y: 80, rx: 54, ry: 36 };            // the rotunda

    // Light: candles and the fire (warm), the moon through the windows and the dome (cool).
    const WARM = [[58, 114, 30], [97, 100, 36], [118, 44, 22], [176, 110, 30], [252, 138, 26], [212, 56, 22], [306, 56, 22], [34, 180, 20], [180, 176, 20]];
    const warmAt = (x, y) => WARM.reduce((a, [lx, ly, r]) => a + Math.exp(-sq((x - lx) / r) - sq((y - ly) / (r * 0.8))), 0);
    // Moon beams: slabs from each window falling down and to the right across the floor.
    const beamAt = (x, y) => {
      let m = 0;
      for (const wx of WINS) {
        const v = (y - 36) / 60; if (v < 0 || v > 1) continue;
        const cx = wx + 4 + v * 26, hw = 8 + v * 3;
        if (Math.abs(x - cx) < hw) m = Math.max(m, (1 - v) * (1 - sq((x - cx) / hw)));
      }
      const e = sq((x - RT.x) / 20) + sq((y - RT.y - 2) / 13);
      if (e < 1) m = Math.max(m, 1.1 - e * 0.6);
      return m;
    };

    // ---------- the runner (trail) ----------
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
    function chamfer(D) {
      const pass = (y, x, dx, dy) => {
        const i = y * W + x;
        for (const [ox, oy, c] of [[dx, 0, 1], [0, dy, 1], [dx, dy, 1.414], [-dx, dy, 1.414]]) {
          const xx = x + ox, yy = y + oy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const j = yy * W + xx;
          if (D[j] + c < D[i]) D[i] = D[j] + c;
        }
      };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) pass(y, x, -1, -1);
      for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) pass(y, x, 1, 1);
    }
    const TRAIL = spline([[-6, 152], [14, 150], S[0], [30, 116], [30, 100], S[1], [58, 56], [80, 56], S[2], [104, 84], [104, 102], S[3],
      [132, 112], [136, 92], S[4], [176, 84], [176, 104], S[5], [198, 150], [214, 150], S[6], [252, 128], [254, 114], S[7]]);
    const DT = new Float32Array(N).fill(999);
    for (const [x, y] of TRAIL) { const xi = Math.round(x), yi = Math.round(y); if (xi >= 0 && yi >= 0 && xi < W && yi < H) DT[yi * W + xi] = 0; }
    chamfer(DT);
    const DS = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = i % W, y = (i / W) | 0; let b = 999; for (const [sx, sy] of S) b = Math.min(b, Math.hypot(x - sx, (y - sy) * 1.15)); DS[i] = b; }

    // ---------- floors ----------
    const FLOORS = {
      parquet: (x, y) => { const bx = x >> 3, by = y >> 3, horiz = (bx + by) & 1, seam = x % 8 === 0 || y % 8 === 0 || (horiz ? (y & 7) === 4 : (x & 7) === 4); return [seam ? 0.8 : 0.35 + hash(bx * 2 + (horiz ? (y & 7) > 4 : (x & 7) > 4), by) * 0.18, 'wood']; },
      boards: (x, y) => { const pl = Math.floor(y / 4), seam = y % 4 === 0 || (x + pl * 11) % 23 === 0; return [seam ? 0.85 : 0.4 + hash(pl, (x + pl * 11) / 23 | 0) * 0.15, 'wood']; },
      check: (x, y) => [(((x >> 3) + (y >> 3)) & 1) ? 0.38 : 0.6, 'stone'],
      stone: (x, y) => { const r = Math.floor(y / 6), seam = y % 6 === 0 || (x + r * 5) % 10 === 0; return [seam ? 0.9 : 0.45 + hash(r, (x + r * 5) / 10 | 0) * 0.15, 'stone']; },
      grate: (x, y) => [(x % 3 === 0 || y % 3 === 0) ? 0.95 : 0.55, 'stone'],
      stars: (x, y) => [0.7, 'stars'],
    };
    const STARFLOOR = [];
    for (let y = 36; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, room = roomAt(x, y);
      let [t, mat] = FLOORS[room.floor](x, y);
      const warm = clamp(warmAt(x, y)), moon = beamAt(x, y);
      let c;
      if (room.id === 8) {
        const e = sq((x - RT.x) / RT.rx) + sq((y - RT.y) / RT.ry);
        if (e > 1) { [t, mat] = FLOORS.stone(x, y); }
        else {
          // The star-map floor: deep blue mosaic, gold rings, constellations.
          const ring = Math.abs(Math.sqrt(e) - 0.72) < 0.03 || Math.abs(Math.sqrt(e) - 0.96) < 0.025;
          const spoke = Math.abs(Math.sin(Math.atan2((y - RT.y) / RT.ry, (x - RT.x) / RT.rx) * 4)) < 0.03 && e > 0.52;
          c = ring || spoke ? (moon > 0.3 ? C('#ffe8a0') : GILT) : band(moon > 0.5 + bay(x, y) * 0.3 ? P(['#4a6ab0', '#3a5498', '#2c4080']) : P(['#243468', '#1c2856', '#141c40']), 0.3 + e * 0.6, x, y);
          if (!ring && !spoke && hash(x, y) > 0.985) { c = C('#e8f0ff'); STARFLOOR.push(i); }
          BASE[i] = c; KIND[i] = 1; continue;
        }
      }
      const pal = mat === 'wood' ? (warm > 0.42 + (bay(x, y) - 0.5) * 0.18 ? WOODW : WOOD) : STONE;
      t = t + 0.3 - warm * 0.35 + clamp((y - 150) / 60) * 0.2;
      c = band(pal, t, x, y);
      if (moon > 0.4 + (bay(x, y) - 0.5) * 0.2) { const tmp = new Uint32Array([c]); blend(tmp, 0, MOON, 0.28); c = tmp[0]; }
      BASE[i] = c; KIND[i] = 1;
    }
    // Rugs: the Queen's great rug, a round one under the lectern, one in the lobby.
    function rug(cx, cy, rx, ry, round) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const u = (x - cx) / rx, v = (y - cy) / ry, e = round ? u * u + v * v : Math.max(Math.abs(u), Math.abs(v));
        if (e > 1) continue;
        const border = e > 0.84, band2 = e > 0.76 && e < 0.8;
        const motif = (Math.floor(u * 6) + Math.floor(v * 4)) & 1;
        const warm = warmAt(x, y) > 0.35;
        put(BASE, x, y, band2 ? GILT : border ? C(warm ? '#8a2a30' : '#5a1a24') : motif ? C(warm ? '#a84a34' : '#6a2a2a') : C(warm ? '#6a2432' : '#441626'));
      }
    }
    rug(110, 160, 26, 22, false); rug(176, 128, 22, 13, true); rug(34, 150, 20, 16, false); rug(240, 160, 22, 14, false);

    // The runner: deep red with gold edges, through the doorways.
    for (let i = 0; i < N; i++) {
      const d = DT[i], x = i % W, y = (i / W) | 0;
      if (d > 3.4 || y < 36) continue;
      const warm = warmAt(x, y) > 0.3;
      BASE[i] = d > 2.6 ? LINE : d > 1.9 ? (warm ? C('#ffd070') : GILT) : band(RUNNER, 0.15 + d * 0.2 + (warm ? -0.1 : 0.3), x, y);
      KIND[i] = 2;
    }
    // Landings at the stops: a round gold-rimmed medallion in the floor.
    for (let i = 0; i < N; i++) {
      const d = DS[i], x = i % W, y = (i / W) | 0;
      if (d > 11) continue;
      BASE[i] = d > 10 ? LINE : d > 9 ? GILT : band(RUNNER, 0.35 + (d < 6 ? 0.3 : 0) + ((x + y) & 1 ? 0.05 : 0), x, y);
      KIND[i] = 2;
    }

    // ---------- helpers for raised things ----------
    function extrude(M, h, topFn, sideFn, shadowLen = 3) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!M[y * W + x]) continue;
        for (let k = 1; k <= shadowLen; k++) { const xx = x + k, yy = y + k; if (xx < W && yy < H && !M[yy * W + xx] && HGT[yy * W + xx] < h) blendAt(BASE, xx, yy, SHAD, 0.35); }
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!M[i]) continue;
        if (!(y + 1 < H && M[i + W])) for (let j = 0; j < h; j++) { put(BASE, x, y - j, sideFn(x, y - j, j, h)); HGT[Math.max(0, y - j) * W + x] = h; KIND[Math.max(0, y - j) * W + x] = 4; }
        const ty = y - h;
        if (ty >= 0) { BASE[ty * W + x] = topFn(x, ty, i); HGT[ty * W + x] = h; KIND[ty * W + x] = 4; }
      }
    }
    const booksFace = (x, y, j, h) => {
      if (j === 0) return WOOD[4];
      if (j === h - 1) return WOOD[1];
      const row = (j - 1) % 4, book = Math.floor(x / 2.1 + Math.floor((j - 1) / 4) * 7.3);
      if (row === 3) return WOOD[2];
      if (frac(x / 2.1 + Math.floor((j - 1) / 4) * 7.3) < 0.2) return WOOD[4];
      const sp = SPINES[Math.floor(hash(book, j >> 2) * SPINES.length)];
      return warmAt(x, y) > 0.4 ? sp[0] : beamAt(x, y) > 0.4 ? sp[0] : sp[1];
    };
    const woodTop = (x, y) => (x + y) % 9 === 0 ? WOOD[1] : warmAt(x, y) > 0.4 ? WOODW[2] : WOOD[2];

    // ---------- walls (doorways are cut wherever the runner passes) ----------
    const WM = new Uint8Array(N);
    const WALLS = [[0, 36, 3, 200], [317, 36, 320, 200], [0, 197, 320, 200], [73, 36, 76, 200], [0, 105, 74, 108], [74, 95, 196, 98],
      [127, 36, 130, 96], [141, 96, 144, 200], [195, 36, 198, 122], [205, 122, 208, 200], [206, 121, 320, 124]];
    for (const [x0, y0, x1, y1] of WALLS) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (DT[y * W + x] > 5.5) WM[y * W + x] = 1;
    // The west door, where the runner comes in.
    for (let y = 144; y < 158; y++) for (let x = 0; x < 3; x++) WM[y * W + x] = 0;
    extrude(WM, 8, (x, y) => (y % 5 === 0 || x % 7 === 0) ? STONE[3] : STONE[2], booksFace, 3);
    // Door frames: a gilt jamb either side of each gap.
    for (let y = 37; y < H; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (WM[i] && (!WM[i - 1] || !WM[i + 1]) && DT[i] < 8 && KIND[i] === 4) for (let j = 0; j < 8; j++) if (y - j > 36 && KIND[(y - j) * W + x] === 4) put(BASE, x, y - j, j === 7 ? GILT : GILTD);
    }

    // ---------- furniture and landmarks (painter's order) ----------
    const OBJ = [];
    const shadowEllipse = (cx, cy, rx, ry, a) => {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
        if (sq((x - cx) / rx) + sq((y - cy) / ry) <= 1) blendAt(BASE, x, y, SHAD, a);
    };
    const box = (x0, y0, x1, y1) => { const M = new Uint8Array(N); for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (DT[y * W + x] > 5 && DS[y * W + x] > 13) M[y * W + x] = 1; return M; };
    function shelf(x0, y0, x1, y1, h = 9) { OBJ.push({ y: y1, f: () => extrude(box(x0, y0, x1, y1), h, woodTop, booksFace, 4) }); }
    function table(x0, y0, x1, y1, h = 4) { OBJ.push({ y: y1, f: () => extrude(box(x0, y0, x1, y1), h, (x, y) => warmAt(x, y) > 0.4 ? WOODW[1] : WOOD[1], (x, y, j) => j === 0 ? WOOD[4] : WOOD[3], 3) }); }

    // 2: the Back Rank Wing: tall shelves in rows, the last one along the far wall.
    shelf(8, 46, 26, 50); shelf(8, 62, 26, 66); shelf(8, 78, 26, 82); shelf(8, 94, 26, 98); shelf(52, 74, 70, 78); shelf(52, 88, 70, 92);
    const LADDER = { x0: 9, x1: 24, y: 92 };
    // 1: Footnotes: the Librarian's desk, a green lamp, slips of paper.
    table(46, 116, 68, 121); table(62, 121, 68, 132);
    OBJ.push({ y: 121, f() { rect(BASE, 50, 110, 3, 1, C('#2a6a4a')); rect(BASE, 49, 111, 5, 1, C('#1e4a36')); put(BASE, 51, 112, GILT); for (const [x, y] of [[56, 111], [59, 112], [63, 110]]) { rect(BASE, x, y, 3, 2, PAGE); put(BASE, x + 1, y, PAGE2); } } });
    shelf(6, 184, 30, 188); shelf(44, 184, 70, 188);
    // 3: the Knight's Alcove: a knight statue on a plinth, and the spilled inkwell.
    OBJ.push({ y: 58, f() {
      extrude(box(110, 52, 122, 58), 4, () => STONE[1], (x, y, j) => j === 0 ? STONE[4] : STONE[3], 3);
      const kn = ['..xxx..', '.xxxxx.', 'xxx.xxx', 'xxxxxxx', '..xxxxx', '..xxxxx', '.xxxxxx', 'xxxxxxx'];
      kn.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'x') put(BASE, 112 + i, 40 + j, i < 3 ? STONE[0] : i < 5 ? STONE[1] : STONE[2]); }));
      put(BASE, 114, 42, C('#141020'));
    } });
    const INKPOOL = [];
    OBJ.push({ y: 86, f() {
      for (let y = 78; y <= 90; y++) for (let x = 82; x <= 100; x++) {
        const e = sq((x - 91) / 9) + sq((y - 84) / 5) + (noise2(x / 3, y / 2, 5) - 0.5) * 0.5;
        if (e < 1 && DS[y * W + x] > 12 && DT[y * W + x] > 4) { BASE[y * W + x] = e < 0.85 ? INK : C('#2a2040'); INKPOOL.push(y * W + x); }
      }
      // The tipped bottle.
      for (let y = 76; y <= 81; y++) for (let x = 80; x <= 87; x++) { const e = sq((x - 83.5) / 4) + sq((y - 78.5) / 3); if (e <= 1) put(BASE, x, y, e < 0.3 ? C('#4a5a8a') : C('#2a3058')); }
      rect(BASE, 88, 77, 2, 3, C('#2a3058')); put(BASE, 82, 77, C('#8aa0d0'));
      line(BASE, 96, 74, 102, 68, PAGE); line(BASE, 97, 74, 103, 68, PAGE2);
    } });
    // 4: the Queen's Reading Room: fireplace in the north wall, armchairs, the marble queen.
    const FIRE = { x: 97, y: 102 };
    OBJ.push({ y: 99, f() { rect(BASE, FIRE.x - 8, 89, 17, 10, STONE[1]); rect(BASE, FIRE.x - 9, 88, 19, 2, STONE[0]); rect(BASE, FIRE.x - 5, 92, 11, 7, C('#140a08')); } });
    function armchair(x, y, facing) {
      OBJ.push({ y, f() {
        shadowEllipse(x + 3, y + 1, 6, 2, 0.4);
        for (let j = 0; j < 7; j++) for (let i = -4; i <= 4; i++) {
          const back = facing > 0 ? i < -2 : i > 2;
          if (!back && j > 3) continue;
          put(BASE, x + i, y - j, j === 0 ? C('#3a0e16') : back ? C(j > 5 ? '#b04a3a' : '#7a2430') : C(i * facing > 0 ? '#c05a44' : '#9a3a34'));
        }
      } });
    }
    armchair(88, 128, 1); armchair(132, 146, -1); armchair(84, 170, 1);
    table(100, 172, 116, 178, 3);
    OBJ.push({ y: 114, f() {
      extrude(box(126, 110, 134, 114), 5, () => STONE[1], (x, y, j) => j === 0 ? STONE[4] : STONE[2], 3);
      const q = ['.x.x.x.', '.xxxxx.', '..xxx..', '.xxxxx.', '..xxx..', '..xxx..', '.xxxxx.', 'xxxxxxx'];
      q.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'x') put(BASE, 127 + i, 97 + j, i < 3 ? MOONL : i < 5 ? C('#c8c0d8') : C('#8a80a0')); }));
      put(BASE, 130, 96, C('#e8f0ff'));
    } });
    shelf(78, 184, 138, 188);
    // 5: the Closed Stacks: shelves behind iron bars, the gate and its padlock.
    shelf(134, 44, 160, 48); shelf(170, 44, 192, 48); shelf(134, 80, 150, 84); shelf(180, 80, 192, 84);
    const BARS = [[132, 50, 194, 52], [132, 86, 150, 88], [178, 86, 194, 88]];
    OBJ.push({ y: 52, f() {
      for (const [x0, y0, x1] of BARS) {
        for (let x = x0; x <= x1; x++) { put(BASE, x, y0 - 12, C('#6a6a78')); put(BASE, x, y0, C('#4a4a58')); }
        for (let x = x0; x <= x1; x += 3) for (let j = 0; j <= 12; j++) put(BASE, x, y0 - j, j === 12 ? C('#8a8a98') : C('#4a4a58'));
      }
      rect(BASE, 160, 42, 5, 5, C('#c8a040')); rect(BASE, 161, 40, 3, 2, C('#8a8a98')); put(BASE, 162, 44, INK);
    } });
    // 6: Turn the Page: a lectern with a giant book, and two king bookends.
    const LECT = { x: 176, y: 114 };
    OBJ.push({ y: LECT.y, f() {
      shadowEllipse(LECT.x + 4, LECT.y + 1, 9, 2, 0.4);
      for (let j = 0; j < 6; j++) { put(BASE, LECT.x, LECT.y - j, WOOD[1]); put(BASE, LECT.x + 1, LECT.y - j, WOOD[3]); }
      for (let x = LECT.x - 12; x <= LECT.x + 13; x++) for (let y = LECT.y - 11; y <= LECT.y - 6; y++) put(BASE, x, y, y === LECT.y - 6 ? WOOD[3] : WOOD[2]);
    } });
    function kingEnd(x, y) {
      OBJ.push({ y, f() {
        shadowEllipse(x + 2, y + 1, 4, 1.2, 0.4);
        const k = ['x.x.x', 'xxxxx', '.xxx.', '.xxx.', '.xxx.', '.xxx.', '.xxx.', 'xxxxx'];
        k.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'x') put(BASE, x + i - 2, y - 8 + j, j < 1 ? GILT : i < 2 ? C('#d8c0a0') : i < 4 ? C('#a88a70') : C('#6a5040')); }));
      } });
    }
    kingEnd(158, 118); kingEnd(196, 118);
    shelf(150, 184, 200, 188); shelf(198, 104, 204, 120, 9);
    // 7: The Blank Chapter: a writing desk with a blank book, a candle.
    const DESK = { x: 244, y: 132 };
    table(DESK.x - 14, DESK.y - 6, DESK.x + 14, DESK.y, 4);
    OBJ.push({ y: DESK.y + 0.5, f() { rect(BASE, DESK.x - 6, DESK.y - 13, 13, 5, PAGE); put(BASE, DESK.x, DESK.y - 13, PAGE2); for (let y = DESK.y - 13; y < DESK.y - 8; y++) put(BASE, DESK.x, y, PAGE2);
      rect(BASE, DESK.x + 10, DESK.y - 15, 2, 5, C('#f4ecd8')); } });
    shelf(284, 128, 314, 132); shelf(284, 150, 314, 154); shelf(212, 184, 316, 188);
    // 8: the Great Reading Room: a colonnade round the star floor, candelabras.
    const PILLARS = [];
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * TAU, x = Math.round(RT.x + Math.cos(a) * (RT.rx + 3)), y = Math.round(RT.y + Math.sin(a) * (RT.ry + 2));
      if (y > RT.y + RT.ry - 4 && Math.abs(x - S[7][0]) < 14) continue;
      if (x < 200 || x > 316 || y < 40 || y > 120) continue;
      PILLARS.push([x, y]);
      OBJ.push({ y, f() {
        shadowEllipse(x + 3, y + 2, 3, 1.5, 0.4);
        for (let j = 0; j < 14; j++) for (let dx = -1; dx <= 1; dx++) put(BASE, x + dx, y - j, j === 13 || j === 0 ? STONE[0] : dx < 0 ? STONE[0] : dx === 0 ? STONE[1] : STONE[3]);
        put(BASE, x - 2, y - 13, STONE[1]); put(BASE, x + 2, y - 13, STONE[2]);
      } });
    }
    const CANDELABRA = [[212, 56], [306, 56], [216, 106], [302, 106]];
    for (const [x, y] of CANDELABRA) OBJ.push({ y, f() { for (let j = 0; j < 8; j++) put(BASE, x, y - j, GILTD); for (let i = -2; i <= 2; i++) put(BASE, x + i, y - 7, GILT); for (const i of [-2, 0, 2]) { put(BASE, x + i, y - 8, C('#f4ecd8')); put(BASE, x + i, y - 9, C('#f4ecd8')); } } });
    // An owl on top of a shelf.
    const OWL = { x: 18, y: 36 };

    OBJ.sort((a, b) => a.y - b.y);
    for (const o of OBJ) o.f();

    // ---------- animated ----------
    const BEAMPIX = [];
    for (let y = 36; y < H; y++) for (let x = 0; x < W; x++) { const m = beamAt(x, y); if (m > 0.2 && KIND[y * W + x] !== 4) BEAMPIX.push(y * W + x); }
    const FLOATERS = Array.from({ length: 6 }, (_, i) => ({ x: [40, 100, 160, 226, 262, 290][i], y: [124, 76, 60, 144, 62, 92][i], k: 2 + i % 3, p: i * 1.7, c: SPINES[(i * 3) % SPINES.length], r: i === 4 || i === 5 ? 1 : 0 }));
    const DUST = Array.from({ length: 40 }, (_, i) => ({ w: WINS[i % 5], s: hash(i, 1), p: hash(i, 3) * TAU }));
    const vignette = K.vignette(C('#04020a'), 0.4, 0.45);
    const FLAMES = [[51, 109], [FIRE.x, FIRE.y - 8], [DESK.x + 11, DESK.y - 16], [LECT.x - 10, LECT.y - 13], [LECT.x + 11, LECT.y - 13], ...CANDELABRA.flatMap(([x, y]) => [[x - 2, y - 10], [x, y - 10], [x + 2, y - 10]])];

    // EndGamer: blue robe, ivory head, round gold spectacles, a crown with points and a gold ball.
    const KING = [
      '........o........',
      '.......ooo.......',
      '...g...ooo...g...',
      '...gg.vvvvv.gg...',
      '...ggvvvvvvvgg...',
      '...ggggggggggg...',
      '...gjgggjgggjg...',
      '....fffffffff....',
      '...fffffffffff...',
      '...fRlRfffRlRf...',
      '...ffRffRffRff...',
      '...fffffffffff...',
      '...fffffffffff...',
      '....fffmmmfff....',
      '.....fffffff.....',
      '...ggggggggggg...',
      '....rrrrrrrrr....',
      '....rrrrrrrrr....',
      '...rrrrrrrrrrr...',
      '...rrrrrrrrrrr...',
      '...rrrrrgrrrrr...',
      '..rrrrrrgrrrrrr..',
      '..rrrrrrgrrrrrr..',
      '.rrrrrrrgrrrrrrr.',
      '.ggggggggggggggg.',
      '.rrrrrrrrrrrrrrr.',
      'rrrrrrrrrrrrrrrrr'];
    const KM = {
      o: P(['#fff4c0', '#f0c860', '#c8903a']), g: P(['#fff4c0', '#f0c860', '#c8903a', '#8a5a28']), j: [C('#3a6ec8')],
      v: P(['#7ab4e0', '#5599cc', '#3a6ea8']), f: P(['#fffaf0', '#f2e8d4', '#dccdbc', '#a89cac']),
      R: [C('#d8a850')], l: [C('#bfe0ff')], m: [C('#6a4a50')],
      r: P(['#b4d8f0', '#7ab4e0', '#5599cc', '#3a6ea8', '#283e70']),
    };
    function figure(rows, mats, X, Y, out) {
      const h = rows.length, w = rows[0].length;
      const at = (i, j) => (j < 0 || j >= h || i < 0 || i >= w) ? '.' : rows[j][i];
      for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
        const ch = at(i, j), x = X + i, y = Y + j;
        if (ch === '.') { if (at(i - 1, j) !== '.' || at(i + 1, j) !== '.' || at(i, j - 1) !== '.' || at(i, j + 1) !== '.') put(out, x, y, LINE); continue; }
        const m = mats[ch];
        if (m.length === 1) { put(out, x, y, m[0]); continue; }
        let l = i, r = i; while (at(l - 1, j) !== '.' && mats[at(l - 1, j)].length > 1) l--; while (at(r + 1, j) !== '.' && mats[at(r + 1, j)].length > 1) r++;
        const rel = r > l ? (i - l) / (r - l) : 0.5, n = m.length;
        // Warm key from the candles on the left, cold moon rim on the right.
        put(out, x, y, rel > 0.92 && n > 3 ? C('#d4ecff') : m[Math.min(n - 1, Math.round(clamp(rel * 0.9 + 0.05) * (n - 1)))]);
      }
    }

    function frame(t, state) {
      const u = t / LOOP;
      const M = (state && state.map) || {}, cleared = M.cleared | 0, beaten = !!M.beaten;
      buf.set(BASE);
      // Stars twinkle in the windows and in the star-map floor.
      for (let k = 0; k < 24; k++) {
        const wx = WINS[k % 5], x = wx - 7 + (hash(k, 11) * 14 | 0), y = 10 + (hash(k, 12) * 18 | 0);
        if (Math.sin(TAU * (6 + k % 7) * u + k) > 0.3 && Math.abs(x - wx) > 0 && y !== 20 && !(wx === MOONW && Math.hypot(x - MOONW - 3, y - 14) < 6)) put(buf, x, y, C('#e8eeff'));
      }
      STARFLOOR.forEach((i, n) => { if (Math.sin(TAU * (5 + n % 6) * u + n) > 0.2) buf[i] = C('#ffe8a0'); });
      // Moon beams breathe; dust drifts down them.
      const mb = 0.07 + 0.03 * Math.sin(TAU * 4 * u);
      for (const i of BEAMPIX) { const x = i % W, y = (i / W) | 0; if (bay(x, y) < 0.5) blend(buf, i, MOON, mb); }
      for (const d of DUST) {
        const v = frac(d.s + u * 2), y = 38 + v * 58, x = d.w + 4 + v * 26 + Math.sin(TAU * 3 * u + d.p) * 5;
        if (Math.sin(TAU * 15 * u + d.p) > 0 && KIND[Math.round(y) * W + Math.round(x)] !== 4) put(buf, x, y, MOONL);
      }
      // Candle, lamp and fire light.
      for (const [fx, fy] of FLAMES) {
        const f = 0.8 + 0.2 * Math.sin(TAU * (47 + ((fx * 7) % 13)) * u + fx) * Math.sin(TAU * 13 * u + fy);
        glow(buf, fx, fy, 12, CANDLE, 0.16 * f);
        put(buf, fx, fy, f > 0.85 ? FLAME : CANDLE); if (f > 0.9) put(buf, fx, fy - 1, C('#fff4c0'));
      }
      // The fire in the Queen's Reading Room.
      K.flame(buf, FIRE.x - 4, FIRE.y - 4, 9, 6, u, 1);
      glow(buf, FIRE.x, FIRE.y + 2, 26, C('#ff9a40'), 0.2 + 0.05 * Math.sin(TAU * 31 * u));
      // 1: paper slips flutter up from the Librarian's desk and settle again.
      for (let k = 0; k < 4; k++) {
        const v = frac(3 * u + k / 4), x = 56 + k * 3 + Math.sin(TAU * 9 * u + k) * 3, y = 110 - Math.sin(Math.PI * v) * 12;
        put(buf, x, y, Math.sin(TAU * 20 * u + k) > 0 ? PAGE : PAGE2); put(buf, x + 1, y, PAGE2);
      }
      // 2: the rolling ladder slides along the last row.
      { const lx = LADDER.x0 + (0.5 + 0.5 * Math.sin(TAU * 3 * u)) * (LADDER.x1 - LADDER.x0);
        for (let j = 0; j < 11; j++) { put(buf, lx, LADDER.y - j, WOOD[0]); put(buf, lx + 3, LADDER.y - j, WOOD[0]); if (j % 3 === 1) { put(buf, lx + 1, LADDER.y - j, WOOD[1]); put(buf, lx + 2, LADDER.y - j, WOOD[1]); } } }
      // 3: ink glistens.
      for (const i of INKPOOL) if (Math.sin(TAU * 7 * u - (i % W) * 0.3 + ((i / W) | 0) * 0.5) > 0.96) buf[i] = C('#6a7ab0');
      // 5: the Night Porter patrols the closed stacks with his lantern.
      { const v = Math.sin(TAU * 3 * u), px = Math.round(162 + v * 20), py = 62 + (Math.abs(v) > 0.95 ? 0 : 0);
        const step = Math.sin(TAU * 60 * u) > 0 ? 1 : 0;
        glow(buf, px + (v >= 0 ? 3 : -3), py - 4, 16, CANDLE, 0.3);
        if (Math.abs(px - S[4][0]) > 9) {
          for (const [dx, dy] of [[0, 0], [1, 0], [0, -1], [1, -1], [0, -2], [1, -2], [0, -3], [1, -3], [-1, -2], [2, -2], [0, -4], [1, -4], [0, -5], [1, -5], [0, -6]]) put(buf, px + dx, py + dy, C('#2a2238'));
          put(buf, px + step, py + 1, LINE); put(buf, px + 1 - step, py + 1, LINE);
          put(buf, px + (v >= 0 ? 3 : -2), py - 3, FLAME); put(buf, px + (v >= 0 ? 3 : -2), py - 4, C('#8a6428'));
        }
      }
      // 6: the giant book turns a page every 5 seconds.
      { const bx = LECT.x, by = LECT.y - 13;
        rect(buf, bx - 11, by, 11, 6, PAGE2); rect(buf, bx + 1, by, 11, 6, PAGE); put(buf, bx, by, WOOD[3]);
        for (let l = 0; l < 3; l++) { line(buf, bx - 9, by + 1.5 + l * 1.5, bx - 2, by + 1.5 + l * 1.5, C('#a89880')); line(buf, bx + 3, by + 1.5 + l * 1.5, bx + 10, by + 1.5 + l * 1.5, C('#a89880')); }
        const pv = frac(24 * u);
        if (pv < 0.2) { const a = pv / 0.2, px = bx + Math.cos(Math.PI * a) * 10, py = by - Math.sin(Math.PI * a) * 5; for (let j = 0; j < 6; j++) line(buf, bx, by + j, px, py + j, j === 0 ? PAGE2 : PAGE); } }
      // 7: a ghostly pen writes a letter in the blank book, again and again.
      { const v = frac(4 * u), pts = [[0, 4], [1, 0], [2, 4], [0.5, 2.5], [1.5, 2.5]], n = Math.floor(v * 1.6 * pts.length);
        const bx = DESK.x - 4, by = DESK.y - 13;
        for (let k = 1; k < Math.min(n, pts.length); k++) line(buf, bx + pts[k - 1][0] * 1.2, by + pts[k - 1][1] * 1, bx + pts[k][0] * 1.2, by + pts[k][1], k === 3 ? PAGE : C('#5a7ab0'));
        const q = pts[Math.min(pts.length - 1, n)], qx = bx + q[0] * 1.2, qy = by + q[1];
        glow(buf, qx + 3, qy - 3, 10, C('#9ac0f0'), 0.25);
        line(buf, qx, qy, qx + 4, qy - 6, C('#dce8ff')); line(buf, qx + 1, qy - 1, qx + 5, qy - 6, C('#9ac0f0')); }
      // Floating books flap through the rooms.
      for (const b of FLOATERS) {
        const x = b.x + (b.r ? Math.cos(TAU * b.k * u + b.p) * 26 : 7 * Math.sin(TAU * b.k * u + b.p)), y = b.y + (b.r ? Math.sin(TAU * b.k * u + b.p) * 14 - 14 : 4 * Math.sin(TAU * (b.k + 1) * u + b.p * 2));
        const open = Math.round(2 + 1.5 * Math.sin(TAU * 60 * u + b.p));
        blendAt(buf, x + 4, y + 10, SHAD, 0.3); blendAt(buf, x + 5, y + 10, SHAD, 0.3);
        rect(buf, x, y, 2, 4, b.c[1]);
        for (let j = 0; j < 4; j++) { line(buf, x - 1, y + j, x - 4, y + j - open + 1, j === 0 ? b.c[0] : PAGE); line(buf, x + 2, y + j, x + 5, y + j - open + 1, j === 0 ? b.c[0] : PAGE2); }
      }
      // The owl on the shelf top blinks and turns its head.
      { const turn = Math.sin(TAU * 2 * u) > 0.6 ? 1 : 0, blink = frac(7 * u + 0.2) < 0.04;
        const o = ['.x.x.', 'xxxxx', 'xeaex', '.xxx.', '.xxx.'];
        o.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '.') return; put(buf, OWL.x + i + (j < 3 ? turn : 0), OWL.y + j, ch === 'e' ? (blink ? C('#6a5040') : C('#ffd040')) : ch === 'a' ? C('#e0a040') : j > 2 ? C('#8a6a4a') : C('#a8845a')); })); }

      // 8: the EndGamer reads in the pool of moonlight, pacing a step now and then; waves once beaten.
      const [gx, gy] = S[7];
      const pace = beaten ? 0 : Math.round(2 * Math.sin(TAU * 2 * u));
      const breath = Math.sin(TAU * 24 * u) > 0.5 ? 1 : 0;
      const EX = gx - 8 + pace, EY = gy - 38 + breath;
      glow(buf, gx, gy - 22, 22, MOONL, 0.14);
      blendAt(buf, gx + 2, gy - 11, SHAD, 0.4);
      for (let dx = -8; dx <= 10; dx++) for (let dy = -2; dy <= 1; dy++) if (sq(dx / 9) + sq(dy / 2) <= 1) blendAt(buf, gx + pace + dx + 2, gy - 11 + dy, SHAD, 0.35);
      figure(KING, KM, EX, EY, buf);
      // Eyes behind the spectacles: reading (down), blinking; they glint.
      const read = Math.sin(TAU * 6 * u) > -0.2;
      const blink = frac(5 * u + 0.6) < 0.03;
      for (const ex of [5, 11]) { put(buf, EX + ex, EY + 9, blink ? KM.R[0] : read ? C('#141a2a') : C('#2a3a6a')); if (Math.sin(TAU * 9 * u + ex) > 0.95) put(buf, EX + ex, EY + 9, C('#ffffff')); }
      // The open book in his hands (or tucked away while he waves).
      if (!beaten) {
        const bx = EX + 3, by = EY + 18;
        rect(buf, bx - 1, by - 1, 13, 5, C('#6a1e24'));
        rect(buf, bx, by, 5, 3, PAGE2); rect(buf, bx + 6, by, 5, 3, PAGE); put(buf, bx + 5, by, C('#3a0e16'));
        const pv = frac(12 * u);
        if (pv < 0.12) { const a = pv / 0.12, px = bx + 5 + Math.cos(Math.PI * a) * 5; line(buf, bx + 5, by, px, by - Math.sin(Math.PI * a) * 3, PAGE); }
        put(buf, bx - 2, by + 1, KM.f[1]); put(buf, bx + 12, by + 1, KM.f[2]);
      } else {
        const wave = Math.sin(TAU * 40 * u) > 0 ? 1 : 0;
        for (let j = 0; j < 5; j++) put(buf, EX + 16 + (j > 2 ? wave : 0), EY + 17 - j, KM.r[2]);
        put(buf, EX + 16 + wave, EY + 11, KM.f[0]); put(buf, EX + 17 + wave, EY + 11, KM.f[1]); put(buf, EX + 16 + wave, EY + 10, KM.f[1]);
        rect(buf, EX + 3, EY + 18, 11, 3, C('#6a1e24'));
      }
      // Books orbit him slowly (drawn with the floaters above).

      // Gold bookmark ribbons by cleared rooms.
      for (let k = 0; k < Math.min(cleared, 7); k++) {
        const [sx, sy] = S[k], px = sx + 11, py = sy - 12;
        for (let j = 0; j < 9; j++) { put(buf, px, py + j, GILT); if (j < 8) put(buf, px + 1, py + j, GILTD); }
        if (Math.sin(TAU * 20 * u + k) > 0) put(buf, px + 1, py + 9, GILT);
        put(buf, px - 1, py, GILTD); put(buf, px + 2, py, GILTD);
      }
      vignette(buf);
    }

    return (t, out, state) => { buf = out; frame(t, state); };
  },
});
