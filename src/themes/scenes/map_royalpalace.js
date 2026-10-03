// The Royal Palace: World 6's local map, where the world-map zoom lands.
//
// 320x200, shown at 4x. Queenie's palace gardens from above in the late afternoon, the low
// sun on the right throwing long shadows to the left, the great desert glowing beyond the
// garden wall. This world has no missions: it holds The Queen's Cup, so the map has two
// stops, far apart, joined by a rose-gravel promenade through the gardens:
//   1 the Tournament grounds  an oval arena with a chessboard lawn, striped stands full of
//                             courtiers, pavilion tents and banners, and the bracket board
//                             (a gold cup appears on it once the Cup is won)
//   2 Queenie's balcony       the white-and-rose palace with pink domes, across the moat and
//                             its bridge; Queenie struts on the balcony fanning herself
// Between them: box-hedge parterres with chess-piece topiaries, the great fountain, a
// peacock, cypresses and date palms. Moves: fountain jets and ripples, moat glints, banners
// and pennants, the crowd, Queenie (fanning, pacing; outraged and fanning hard once beaten),
// the peacock's tail, doves, butterflies, drifting petals, cloud shadows, gold glints.
// Crowns here have points and gems or balls, never a cross.
LiveScenes.register({
  id: 'map_royalpalace',
  width: 320,
  height: 200,
  loop: 120,
  still: 30,
  stops: [[62, 128], [250, 99]],
  create() {
    const W = 320, H = 200, N = W * H, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, noise2, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, rect, line, glow } = K;
    const STOPS = LiveScenes.get('map_royalpalace').stops;
    const S = STOPS;
    let buf = null;
    const P = h => h.map(C);
    const band = (cols, t, x, y, w = 0.22) => {
      t = clamp(t) * (cols.length - 1);
      const i = t | 0, f = clamp((t - i - 0.5) / w + 0.5);
      return cols[Math.min(cols.length - 1, i + (f > bay(x, y) ? 1 : 0))];
    };

    const BASE = new Uint32Array(N);
    const KIND = new Uint8Array(N);          // 1 lawn, 2 path, 3 water, 4 built, 5 bed, 6 hedge
    const HGT = new Uint8Array(N);           // height of whatever stands on a pixel (for shadows)

    // ---------- palette ----------
    const SKY = P(['#4a4a8a', '#6a5c9a', '#9a6e9e', '#cc8494', '#f0a480', '#ffc88a', '#ffe2a8']);
    const DUNE = P(['#ffe0a0', '#f4c47a', '#dca060', '#b87a4a']);
    const LAWN = P(['#b8d070', '#8ab656', '#66984a', '#4a7a44', '#355e3e']);
    const HEDGE = P(['#a8cc6a', '#6a9e48', '#46783c', '#2e5634', '#1e3a2a']);
    const GRAVEL = P(['#fff0dc', '#f4d8c4', '#e0b8a8', '#c49490']);
    const MARBLE = P(['#fffaf2', '#f4e6de', '#e2ccc8', '#c8aab4', '#a08498']);
    const ROSE = P(['#ffc8c8', '#f09aa8', '#d0708a', '#a04e72', '#6e345a']);
    const GOLD = P(['#fff4b0', '#ffd048', '#d09a30', '#8a5a22']);
    const WATER = P(['#a8e8f0', '#6ac4dc', '#3e98c4', '#2c6ea4', '#244c84']);
    const SHADE = P(['#6a5074', '#523e62', '#3c2e50']);
    const LINE = C('#2e1e2e'), SHAD = C('#3a2a5a');
    const BANNER = P(['#b050c0', '#8a3a9a', '#5a2a6a']);
    const FLOWERS = P(['#ff5a7a', '#ffd048', '#ffffff', '#ff8ac8', '#c070ff']);
    const SUN = { x: 322, y: 8 };

    // ---------- sky, desert, garden wall (under the header) ----------
    const wallY = x => 33;
    for (let y = 0; y < 40; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - SUN.x, (y - SUN.y) * 1.4);
      BASE[y * W + x] = ramp(SKY, y / 26 + 0.45 * Math.exp(-sq(d / 70)), x, y);
    }
    const duneTop = x => Math.round(17 + 3 * Math.sin(x / 23) + 2 * Math.sin(x / 9 + 1) + 2 * fbm1(x / 30, 3));
    for (let x = 0; x < W; x++) for (let y = duneTop(x); y < 34; y++) {
      const ph = Math.sin(x / 23) * 0.5 + Math.sin(x / 9 + 1) * 0.3, lit = Math.cos(x / 23) < 0;
      BASE[y * W + x] = y === duneTop(x) ? DUNE[0] : band(DUNE, (y - duneTop(x)) / 14 + (lit ? 0 : 0.35) + ph * 0.1, x, y);
    }

    // ---------- ground: warm lawn, lit from the low sun on the right ----------
    for (let y = 34; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, warm = x / W * 0.25 + 0.1 * Math.exp(-sq((x - 300) / 80) - sq((y - 60) / 60));
      const stripe = (Math.floor((x + y * 0.4) / 9) & 1) ? 0.07 : 0;            // mowing stripes
      BASE[i] = band(LAWN, 0.62 - warm + stripe + clamp((y - 150) / 60) * 0.25 + (noise2(x / 26, y / 14, 2) - 0.5) * 0.16, x, y);
      KIND[i] = 1;
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
    const distField = pts => {
      const D = new Float32Array(N).fill(999);
      for (const [x, y] of pts) { const xi = Math.round(x), yi = Math.round(y); if (xi >= 0 && yi >= 0 && xi < W && yi < H) D[yi * W + xi] = 0; }
      chamfer(D); return D;
    };
    // Something raised (hedge, wall, stand) from a footprint mask, in 3/4 view: the top
    // face lifted by h, a front face below it, a long shadow cast to the left (sun on the right).
    function extrude(M, h, topFn, sideFn, shadowLen = h * 1.6) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!M[y * W + x]) continue;
        for (let k = 1; k <= shadowLen; k++) {
          const xx = x - k, yy = y - Math.round(k * 0.15);
          if (xx < 0 || yy < 0 || M[yy * W + xx]) continue;
          if (HGT[yy * W + xx] < h) blendAt(BASE, xx, yy, SHAD, 0.32);
        }
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!M[i]) continue;
        const south = y + 1 < H && M[i + W];
        if (!south) for (let j = 0; j < h; j++) { put(BASE, x, y - j, sideFn(x, y - j, j, h)); HGT[Math.max(0, y - j) * W + x] = h; }
        const ty = y - h;
        if (ty >= 0) { BASE[ty * W + x] = topFn(x, ty, M, i); HGT[ty * W + x] = h; KIND[ty * W + x] = 6; }
      }
    }
    const shadowEllipse = (cx, cy, rx, ry, a) => {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
        if (sq((x - cx) / rx) + sq((y - cy) / ry) <= 1) blendAt(BASE, x, y, SHAD, a);
    };

    // ---------- the outer garden wall, rose stone with merlons ----------
    for (let x = 0; x < 172; x++) {
      for (let y = 30; y <= 37; y++) {
        let c = y === 30 ? ROSE[0] : y < 33 ? ROSE[1] : y === 37 ? ROSE[4] : (x % 6 === 0 ? ROSE[3] : ROSE[2]);
        if (y < 30 + 0 || (y === 30 && (x >> 2) % 2)) c = ROSE[0];
        put(BASE, x, y, c);
      }
      if ((x >> 2) % 2 === 0) { put(BASE, x, 29, ROSE[1]); put(BASE, x, 28, ROSE[0]); }
      for (let k = 1; k <= 3; k++) blendAt(BASE, x, 37 + k, SHAD, 0.25);
    }

    // ---------- the trail: a promenade of rose gravel edged in white stone ----------
    const TRAIL = spline([[-6, 152], [24, 144], S[0], [86, 142], [112, 144], [134, 136], [150, 134], [168, 138], [196, 142], [222, 136], [242, 126], [250, 116], S[1]]);
    const DT = distField(TRAIL);
    const DS = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = i % W, y = (i / W) | 0; DS[i] = Math.min(...S.map(([sx, sy]) => Math.hypot(x - sx, (y - sy) * 1.15))); }

    // ---------- water: the moat round the palace, the great fountain's basin ----------
    const MOAT = (x, y) => (y >= 108 && y <= 119 && x >= 166) || (x >= 168 && x <= 176 && y >= 46 && y <= 119);
    const FT = { x: 152, y: 112, rx: 17, ry: 9 };
    const WATER_IDX = [];
    for (let y = 38; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, fe = sq((x - FT.x) / FT.rx) + sq((y - FT.y) / FT.ry);
      if (MOAT(x, y) || fe < 0.78) {
        const edgeTop = MOAT(x, y) ? !MOAT(x, y - 1) : fe >= 0.62 && y < FT.y;
        const canal = MOAT(x, y) && y < 108;
        BASE[i] = edgeTop ? SHADE[1] : band(WATER, canal ? 0.5 + (x - 168) / 20 + (y < 60 ? 0.1 : 0) : 0.25 + (MOAT(x, y) ? (y - 108) / 22 : 0.2), x, y);
        KIND[i] = 3; WATER_IDX.push(i);
      } else if (fe < 1) { BASE[i] = fe < 0.9 ? MARBLE[1] : MARBLE[3]; KIND[i] = 4; }
      // Moat banks: dressed stone.
      if (!MOAT(x, y) && (MOAT(x, y + 1) || MOAT(x, y - 1) || MOAT(x + 1, y) || MOAT(x - 1, y))) { BASE[i] = MOAT(x, y + 1) ? MARBLE[2] : MARBLE[4]; KIND[i] = 4; }
    }

    // Promenade (after the water so the bridge sits on the moat).
    for (let i = 0; i < N; i++) {
      const d = DT[i], x = i % W, y = (i / W) | 0;
      if (d > 4.5 || y < 38) continue;
      if (KIND[i] === 3) continue;                                     // the bridge is built below
      if (d < 3.4) BASE[i] = band(GRAVEL, 0.2 + d * 0.12 + (hash(x, y) > 0.9 ? 0.3 : 0) + x / W * -0.1, x, y), KIND[i] = 2;
      else BASE[i] = d < 4.1 ? MARBLE[0] : MARBLE[3], KIND[i] = 2;
    }
    // Landings at the stops: a round of paving with a gold inlaid ring.
    for (let i = 0; i < N; i++) {
      const d = DS[i], x = i % W, y = (i / W) | 0;
      if (d > 11.5) continue;
      BASE[i] = d > 10.6 ? MARBLE[3] : Math.abs(d - 8) < 0.6 ? GOLD[2] : ((Math.floor(x / 3) + Math.floor(y / 3)) & 1) ? MARBLE[0] : MARBLE[1];
      KIND[i] = 2;
    }

    // ---------- the parterres: box hedges in patterns, flower beds inside ----------
    const HM = new Uint8Array(N), BED = new Uint8Array(N);
    const PARTERRES = [{ x0: 100, y0: 46, x1: 160, y1: 94 }, { x0: 10, y0: 44, x1: 96, y1: 58 }, { x0: 104, y0: 156, x1: 230, y1: 196 }, { x0: 0, y0: 160, x1: 90, y1: 198 }, { x0: 184, y0: 124, x1: 240, y1: 150 }, { x0: 248, y0: 164, x1: 318, y1: 198 }];
    for (const p of PARTERRES) {
      const cx = (p.x0 + p.x1) / 2, cy = (p.y0 + p.y1) / 2, w = p.x1 - p.x0, h = p.y1 - p.y0;
      for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
        const i = y * W + x;
        if (DT[i] < 7 || DS[i] < 16 || KIND[i] === 3 || KIND[i] === 4) continue;
        const u = (x - cx) / (w / 2), v = (y - cy) / (h / 2);
        const border = x === p.x0 || x === p.x1 || y === p.y0 || y === p.y1;
        const cross = Math.abs(Math.abs(u) - Math.abs(v)) < 0.06 * 2;               // diagonals
        const ring = Math.abs(Math.hypot(u, v * 1.1) - 0.55) < 0.07;
        if (border || ring || (cross && Math.hypot(u, v) > 0.62)) HM[i] = 1;
        else BED[i] = 1 + ((Math.floor((u + 1) * 2) + Math.floor((v + 1) * 2)) & 1);
      }
    }
    for (let i = 0; i < N; i++) if (BED[i]) {
      const x = i % W, y = (i / W) | 0;
      BASE[i] = BED[i] === 1 ? band(LAWN, 0.3 + noise2(x / 5, y / 4, 5) * 0.3, x, y) : (hash(x, y) > 0.55 ? FLOWERS[(hash(x >> 1, y >> 1) * 5) | 0] : C('#4a7a44'));
      KIND[i] = 5;
    }
    extrude(HM, 2, (x, y) => band(HEDGE, 0.2 + (HM[(y + 2) * W + x + 1] ? 0.1 : -0.15) + (x & 1 ? 0.05 : 0), x, y), (x, y, j) => j === 0 ? HEDGE[4] : HEDGE[3]);

    // ---------- objects in painter's order ----------
    const OBJ = [];
    // A cone or ball topiary, or a chess-piece topiary (pawn, queen), lit from the right.
    function topiary(x, y, kind) {
      shadowEllipse(x - 9, y, 9, 1.8, 0.35);
      const prof = kind === 'cone' ? j => Math.max(0.5, 4 - j * 0.33) : kind === 'ball' ? j => j < 1 ? 1 : j < 9 ? Math.sqrt(Math.max(0, 16 - sq(j - 5))) : 0
        : kind === 'pawn' ? j => j < 3 ? 4 : j < 6 ? 2.5 : j < 7 ? 3 : j < 11 ? Math.sqrt(Math.max(0, 5 - sq(j - 8.8))) * 1.3 : 0
        : j => j < 3 ? 4.2 : j < 10 ? 3.2 - j * 0.12 : j < 11 ? 3.4 : j < 14 ? 2.2 + (j - 11) * 0.5 : j < 15 ? (x & 1 ? 3.5 : 3.5) : 0;
      const hh = kind === 'cone' ? 12 : kind === 'ball' ? 10 : kind === 'pawn' ? 11 : 16;
      for (let j = 0; j < hh; j++) {
        const hw = prof(j);
        for (let dx = -Math.ceil(hw); dx <= Math.ceil(hw); dx++) {
          if (Math.abs(dx) > hw + 0.3) continue;
          const rel = dx / (hw + 0.5);
          put(BASE, x + dx, y - j, rel > 0.45 ? HEDGE[0] : rel > -0.1 ? HEDGE[1] : rel > -0.6 ? HEDGE[2] : HEDGE[3]);
        }
      }
      if (kind === 'queen') for (const dx of [-3, -1, 1, 3]) put(BASE, x + dx, y - 15 - (Math.abs(dx) === 1 ? 1 : 0), HEDGE[1]);
      put(BASE, x, y + 1, HEDGE[4]);
    }
    const TOPI = [[104, 100, 'cone'], [160, 100, 'cone'], [118, 70, 'queen'], [142, 70, 'pawn'], [130, 58, 'ball'], [28, 104, 'cone'],
      [100, 150, 'ball'], [180, 102, 'cone'], [206, 150, 'pawn'], [232, 150, 'queen'], [8, 150, 'ball'], [190, 176, 'cone'], [140, 170, 'pawn']];
    for (const [x, y, k] of TOPI) if (DT[y * W + x] > 6 && DS[y * W + x] > 15) OBJ.push({ y, f: () => topiary(x, y, k) });
    // Cypresses along the wall, date palms by the desert and the moat.
    function cypress(x, y, h) {
      shadowEllipse(x - h * 0.7, y, h * 0.7, 1.5, 0.35);
      for (let j = 0; j < h; j++) {
        const hw = Math.sin(Math.PI * Math.min(1, (j + 2) / (h + 1))) * 2.6;
        for (let dx = -3; dx <= 3; dx++) if (Math.abs(dx) <= hw) put(BASE, x + dx, y - j, dx >= hw - 1 ? C('#6aa048') : dx > -0.5 ? C('#2e5a34') : C('#1e3e2a'));
      }
    }
    for (let x = 6; x < 170; x += 11) OBJ.push({ y: 42, f: () => cypress(x, 42, 12 + (x % 3) * 2) });
    function palm(x, y, h, seed) {
      shadowEllipse(x - h, y, h * 0.9, 1.5, 0.3);
      for (let j = 0; j < h; j++) { const bx = x + Math.round(Math.sin(j / h * 1.6) * 3); put(BASE, bx, y - j, j % 2 ? C('#8a5a3a') : C('#6a4430')); put(BASE, bx + 1, y - j, C('#c08a58')); }
      const tx = x + Math.round(Math.sin(1.6) * 3), ty = y - h;
      for (let f = 0; f < 7; f++) {
        const a = -Math.PI / 2 + (f - 3) * 0.55 + (hash(f, seed) - 0.5) * 0.2, len = 7 + (f % 2) * 2;
        for (let s = 0; s <= len; s += 0.5) {
          const px = tx + Math.cos(a) * s, py = ty + Math.sin(a) * s * 0.7 + sq(s / len) * 4;
          put(BASE, px, py, s > len * 0.7 ? C('#9ac858') : Math.cos(a) > 0 ? C('#6aa048') : C('#3e7038'));
          if (s > 2) put(BASE, px, py + 1, C('#2e5a34'));
        }
      }
      put(BASE, tx, ty + 1, C('#c89a40')); put(BASE, tx + 1, ty + 1, C('#e0b050'));
    }
    for (const [x, y, h] of [[16, 76, 16], [96, 38, 14], [160, 40, 15], [186, 106, 14], [314, 104, 16], [6, 132, 13]]) OBJ.push({ y, f: () => palm(x, y, h, x) });

    // 1: the Tournament grounds.
    const AR = { x: 54, y: 86, rx: 40, ry: 20 };
    const CROWD = [];
    OBJ.push({ y: AR.y - AR.ry, f() {
      // The stands: a raised elliptical ring, striped seats in rose and white.
      const M = new Uint8Array(N);
      for (let y = AR.y - AR.ry - 2; y <= AR.y + AR.ry + 2; y++) for (let x = AR.x - AR.rx - 2; x <= AR.x + AR.rx + 2; x++) {
        const e = sq((x - AR.x) / AR.rx) + sq((y - AR.y) / AR.ry);
        const gate = Math.abs(x - AR.x) < 5 && y > AR.y;
        if (e <= 1 && e > 0.58 && !gate) M[y * W + x] = 1;
      }
      extrude(M, 4, (x, y) => {
        const e = Math.sqrt(sq((x - AR.x) / AR.rx) + sq((y + 4 - AR.y) / AR.ry));
        const row = Math.floor((e - 0.76) * 22);
        if (e > 0.97) return GOLD[2];
        if (hash(x, y) > 0.6 && row % 2 === 0) { CROWD.push(y * W + x); return FLOWERS[(hash(x, y + 1) * 5) | 0]; }
        return row % 2 ? MARBLE[1] : ROSE[1];
      }, (x, y, j) => (x >> 1) % 2 ? ROSE[3] : MARBLE[3], 5);
      // The field: a chessboard lawn.
      for (let y = AR.y - AR.ry; y <= AR.y + AR.ry; y++) for (let x = AR.x - AR.rx; x <= AR.x + AR.rx; x++) {
        const e = sq((x - AR.x) / AR.rx) + sq((y - AR.y) / AR.ry);
        if (e > 0.56) continue;
        const sq8 = (Math.floor((x - AR.x + 24) / 6) + Math.floor((y - AR.y + 12) / 3.5)) & 1;
        put(BASE, x, y, Math.abs(x - AR.x) < 24 && Math.abs(y - AR.y) < 12.5 ? (sq8 ? C('#f4e6c8') : C('#6a9e48')) : LAWN[2]);
      }
      // Gold trim on the royal box, top of the stands.
      for (let x = AR.x - 8; x <= AR.x + 8; x++) { put(BASE, x, AR.y - AR.ry - 5, GOLD[1]); put(BASE, x, AR.y - AR.ry - 6, GOLD[0]); }
      for (let x = AR.x - 6; x <= AR.x + 6; x++) for (let y = AR.y - AR.ry - 10; y < AR.y - AR.ry - 6; y++) put(BASE, x, y, y === AR.y - AR.ry - 10 ? GOLD[1] : BANNER[1]);
    } });
    // Pavilion tents: striped cones with a pennant pole.
    const TENTS = [[18, 124, 0], [104, 108, 1], [96, 64, 2], [10, 94, 1]];
    function tent(x, y, v) {
      shadowEllipse(x - 8, y, 9, 2, 0.35);
      const cols = [[ROSE[1], MARBLE[0]], [BANNER[0], GOLD[1]], [C('#6ac4dc'), MARBLE[0]]][v];
      for (let j = 0; j < 12; j++) {
        const hw = j < 5 ? 6 : 6 - (j - 5) * 0.85;
        for (let dx = -Math.ceil(hw); dx <= hw; dx++) {
          const stripe = Math.floor((dx + 7) / 2.4 + j * 0.0) & 1, lit = dx > hw * 0.3;
          let c = cols[stripe];
          if (!lit && dx < -hw * 0.3) c = mixC(c, 0.35);
          put(BASE, x + dx, y - j, j === 0 ? (dx === 0 || dx === 1 ? C('#3a1e2e') : mixC(c, 0.5)) : c);
        }
      }
      for (let j = 12; j < 16; j++) put(BASE, x, y - j, C('#5a3a2a'));
    }
    const mixC = (c, a) => { const t = new Uint32Array([c]); blend(t, 0, C('#3a2a5a'), a); return t[0]; };
    for (const [x, y, v] of TENTS) OBJ.push({ y, f: () => tent(x, y, v) });
    // The bracket board: a wooden board on two posts, the draw inked on parchment.
    const BR = { x: 92, y: 122 };
    OBJ.push({ y: BR.y, f() {
      shadowEllipse(BR.x - 8, BR.y, 10, 1.5, 0.35);
      for (let j = 0; j < 6; j++) { put(BASE, BR.x - 8, BR.y - j, C('#5a3a2a')); put(BASE, BR.x + 8, BR.y - j, C('#5a3a2a')); }
      rect(BASE, BR.x - 11, BR.y - 18, 23, 13, C('#6a4430'));
      rect(BASE, BR.x - 10, BR.y - 17, 21, 11, C('#f4e6c8'));
      for (let k = 0; k < 4; k++) { const yy = BR.y - 16 + k * 3; line(BASE, BR.x - 9, yy, BR.x - 5, yy, C('#8a5a3a')); line(BASE, BR.x + 5, yy, BR.x + 9, yy, C('#8a5a3a')); }
      for (const s of [-1, 1]) { line(BASE, BR.x + s * 5, BR.y - 16, BR.x + s * 5, BR.y - 13, C('#8a5a3a')); line(BASE, BR.x + s * 5, BR.y - 10, BR.x + s * 5, BR.y - 7, C('#8a5a3a'));
        line(BASE, BR.x + s * 5, BR.y - 14.5, BR.x + s * 2, BR.y - 14.5, C('#8a5a3a')); line(BASE, BR.x + s * 5, BR.y - 8.5, BR.x + s * 2, BR.y - 8.5, C('#8a5a3a')); line(BASE, BR.x + s * 2, BR.y - 14.5, BR.x + s * 2, BR.y - 8.5, C('#8a5a3a')); line(BASE, BR.x + s * 2, BR.y - 11.5, BR.x, BR.y - 11.5, C('#8a5a3a')); }
      for (let x = BR.x - 11; x <= BR.x + 11; x++) put(BASE, x, BR.y - 19, GOLD[2]);
    } });

    // The great fountain: a tiered centre in the basin (the jets are animated).
    OBJ.push({ y: FT.y + 1, f() {
      for (let j = 0; j < 6; j++) { const hw = j < 2 ? 3 : 1.5; for (let dx = -3; dx <= 3; dx++) if (Math.abs(dx) <= hw) put(BASE, FT.x + dx, FT.y - j, dx > 0 ? MARBLE[0] : dx < -1 ? MARBLE[3] : MARBLE[1]); }
      for (let dx = -5; dx <= 5; dx++) { put(BASE, FT.x + dx, FT.y - 6, dx > 1 ? MARBLE[0] : MARBLE[2]); put(BASE, FT.x + dx, FT.y - 5, MARBLE[4]); }
      for (let j = 7; j < 10; j++) put(BASE, FT.x, FT.y - j, MARBLE[1]);
      put(BASE, FT.x, FT.y - 10, GOLD[1]); put(BASE, FT.x + 1, FT.y - 10, GOLD[0]);
    } });

    // ---------- the palace ----------
    const PAL = { x0: 184, x1: 316, top: 52, base: 90 };
    OBJ.push({ y: PAL.base, f() {
      // Terrace in front: marble paving with a balustrade along the moat.
      for (let y = PAL.base; y < 107; y++) for (let x = 180; x < W; x++) {
        const i = y * W + x; if (DS[i] < 11.5 || DT[i] < 4.5) continue;
        BASE[i] = ((Math.floor(x / 5) + Math.floor(y / 4)) & 1) ? MARBLE[1] : MARBLE[2]; KIND[i] = 4;
      }
      for (let x = 180; x < W; x++) if (Math.abs(x - 250) > 8) {
        put(BASE, x, 103, MARBLE[0]); put(BASE, x, 106, MARBLE[3]);
        if (x % 3 === 0) { put(BASE, x, 104, MARBLE[1]); put(BASE, x, 105, MARBLE[2]); } else { put(BASE, x, 104, SHADE[0]); put(BASE, x, 105, SHADE[1]); }
      }
      // Main facade: marble with rose bands, rows of gold-framed arched windows.
      for (let y = PAL.top; y < PAL.base; y++) for (let x = PAL.x0; x < PAL.x1; x++) {
        const rel = (x - PAL.x0) / (PAL.x1 - PAL.x0);
        let c = band(MARBLE, 0.55 - rel * 0.5 + (y - PAL.top) / 90, x, y);
        if ((y - PAL.top) % 13 === 0) c = ROSE[2];
        const wx = (x - PAL.x0 - 6) % 14, wy = (y - PAL.top - 3) % 13;
        if (wx >= 0 && wx < 5 && wy >= 0 && wy < 8 && x < PAL.x1 - 4) {
          const arch = wy < 2 && (wx === 0 || wx === 4 || (wy === 0 && (wx === 1 || wx === 3)));
          c = arch ? (wy === 0 && wx !== 2 ? c : GOLD[2]) : wx === 0 || wx === 4 ? GOLD[2] : C(wy < 4 ? '#3a4a8a' : '#2a2a5a');
          if (!arch && wx > 0 && wx < 4) WINDOWS.push(y * W + x);
        }
        BASE[y * W + x] = c; KIND[y * W + x] = 4;
      }
      // The flat roof seen from above, sky and desert beyond it.
      for (let y = 30; y < PAL.top - 6; y++) for (let x = 180; x < W; x++) {
        const i = y * W + x;
        BASE[i] = y < 38 ? BASE[(Math.min(y, 33)) * W + x] : band(ROSE, 0.1 + (y - 38) / 16 + (x - 180) / -400, x, y);
        if (y === 38) BASE[i] = MARBLE[0];
      }
      // Roof terrace and battlements.
      for (let x = PAL.x0 - 2; x < PAL.x1 + 2; x++) {
        for (let y = PAL.top - 6; y < PAL.top; y++) put(BASE, x, y, y === PAL.top - 6 ? MARBLE[0] : y === PAL.top - 1 ? MARBLE[4] : ROSE[1]);
        if ((x >> 2) % 2 === 0) { put(BASE, x, PAL.top - 7, MARBLE[0]); put(BASE, x, PAL.top - 8, MARBLE[1]); }
        put(BASE, x, PAL.top, GOLD[2]);
      }
      // A deep arched alcove behind the balcony, so the queen stands out against it.
      for (let y = PAL.top + 1; y < 76; y++) for (let x = 238; x <= 262; x++) {
        const d = Math.hypot(x - 250, (y - (PAL.top + 12)) * 1.1);
        if (y < PAL.top + 12 && d > 12) continue;
        const edge = Math.abs(x - 250) > 10.5 || (y < PAL.top + 12 && d > 10.8);
        put(BASE, x, y, edge ? GOLD[2] : band(P(['#6a3a6a', '#4a2a56', '#34203e']), (x - 238) / 24 * -0.6 + 0.8, x, y));
      }
      // The grand door under the balcony.
      for (let y = PAL.base - 14; y < PAL.base; y++) for (let x = 243; x <= 257; x++) {
        const arch = y < PAL.base - 10 && Math.hypot(x - 250, y - (PAL.base - 10)) > 7.5;
        if (!arch) put(BASE, x, y, x === 243 || x === 257 || Math.hypot(x - 250, y - (PAL.base - 10)) > 6.6 && y < PAL.base - 9 ? GOLD[2] : C(x < 250 ? '#4a1e3a' : '#6a2a4a'));
      }
      for (let k = 0; k < 3; k++) for (let x = 240 - k * 2; x <= 260 + k * 2; x++) put(BASE, x, PAL.base + k, k % 2 ? MARBLE[3] : MARBLE[0]);
    } });
    const WINDOWS = [];
    // Towers and domes (drawn after the facade, they rise above it).
    function tower(x, w, top, base) {
      for (let y = top; y < base; y++) for (let xx = x; xx < x + w; xx++) {
        const rel = (xx - x) / (w - 1);
        put(BASE, xx, y, (y - top) % 12 === 0 ? ROSE[2] : rel > 0.75 ? MARBLE[0] : rel > 0.3 ? MARBLE[1] : MARBLE[3]);
      }
      for (let xx = x - 1; xx <= x + w; xx++) { put(BASE, xx, top, MARBLE[0]); if ((xx - x) % 3 === 0) put(BASE, xx, top - 1, MARBLE[1]); }
      rect(BASE, x + (w >> 1) - 1, top + 6, 2, 5, C('#2a2a5a')); put(BASE, x + (w >> 1) - 1, top + 5, GOLD[2]); put(BASE, x + (w >> 1), top + 5, GOLD[2]);
    }
    function dome(cx, by, r, h) {
      for (let y = by - h; y <= by; y++) for (let x = cx - r - 1; x <= cx + r + 1; x++) {
        const v = (by - y) / h, hw = r * Math.sqrt(Math.max(0, 1 - sq(v * 1.05))) * (1 + 0.25 * Math.sin(Math.PI * Math.min(1, v * 1.4))) * (v > 0.8 ? (1 - v) / 0.2 : 1);
        const dx = x - cx;
        if (Math.abs(dx) > hw) continue;
        const rel = dx / (hw + 0.01);
        put(BASE, x, y, rel > 0.55 ? ROSE[0] : rel > 0 ? ROSE[1] : rel > -0.55 ? ROSE[2] : ROSE[3]);
        if (Math.abs(rel) < 0.12 && v < 0.9 && (y & 1)) put(BASE, x, y, GOLD[2]);
      }
      for (let x = cx - r - 1; x <= cx + r + 1; x++) put(BASE, x, by, GOLD[2]);
      // Gold ball finial on a short spire (no cross).
      // Gold ball finial on a short spire (a ball, never a cross).
      put(BASE, cx, by - h - 1, GOLD[2]); put(BASE, cx, by - h - 2, GOLD[2]);
      for (const [dx, dy, c] of [[-1, -3, 2], [0, -3, 1], [1, -3, 1], [-1, -4, 1], [0, -4, 0], [1, -4, 1], [0, -5, 1]]) put(BASE, cx + dx, by - h + dy, GOLD[c]);
      FINIALS.push([cx, by - h - 5]);
    }
    const FINIALS = [];
    OBJ.push({ y: PAL.base + 0.5, f() {
      tower(186, 12, 30, PAL.base); dome(192, 30, 6, 11);
      tower(302, 14, 28, PAL.base); dome(309, 28, 7, 12);
      tower(214, 8, 40, PAL.top); dome(218, 40, 4, 8);
      tower(278, 8, 40, PAL.top); dome(282, 40, 4, 8);
      // The great central dome on a drum.
      for (let y = 34; y < PAL.top - 6; y++) for (let x = 234; x <= 266; x++) put(BASE, x, y, (x - 234) % 5 === 0 ? GOLD[2] : x > 256 ? MARBLE[0] : x > 242 ? MARBLE[1] : MARBLE[3]);
      dome(250, 34, 15, 20);
      // Banners hang from the roof line (animated in the frame).
      // The balcony: a semicircular slab with a gold-railed balustrade (drawn over Queenie per frame).
      for (let y = 74; y <= 80; y++) for (let x = 236; x <= 264; x++) {
        const e = sq((x - 250) / 14) + sq((y - 74) / 6);
        if (e > 1) continue;
        put(BASE, x, y, y >= 78 ? MARBLE[4] : e > 0.8 ? MARBLE[2] : MARBLE[1]);
      }
      for (let y = 80; y <= 82; y++) for (let x = 240; x <= 260; x++) if (sq((x - 250) / 11) + sq((y - 80) / 3) <= 1) put(BASE, x, y, SHADE[1]);
    } });
    const BANNERS = [[200, 46], [228, 46], [272, 46], [296, 46]];
    // The bridge over the moat.
    OBJ.push({ y: 121, f() {
      for (let y = 106; y <= 121; y++) for (let x = 243; x <= 257; x++) {
        const edge = x === 243 || x === 257;
        put(BASE, x, y, edge ? (x === 257 ? MARBLE[0] : MARBLE[3]) : band(GRAVEL, 0.25 + (y & 1) * 0.1, x, y));
        KIND[y * W + x] = 2;
      }
      for (let x = 243; x <= 257; x++) { put(BASE, x, 122, MARBLE[4]); put(BASE, x, 123, SHADE[2]); }
      for (let y = 106; y <= 121; y += 3) { put(BASE, 242, y, MARBLE[1]); put(BASE, 258, y, MARBLE[0]); }
      for (let x = 244; x <= 256; x++) blendAt(BASE, x, 124, SHAD, 0.4);
    } });

    // The orange grove and the gazebo, below the moat on the right.
    function orangeTree(x, y) {
      shadowEllipse(x - 7, y, 7, 1.8, 0.35);
      put(BASE, x, y, C('#5a3a2a')); put(BASE, x, y - 1, C('#6a4430'));
      for (let yy = y - 9; yy <= y - 1; yy++) for (let xx = x - 5; xx <= x + 5; xx++) {
        const dx = (xx - x) / 5, dy = (yy - (y - 5)) / 4.2, e = dx * dx + dy * dy;
        if (e > 1) continue;
        const l = dx * 0.7 - dy * 0.5;
        let c = l > 0.45 ? HEDGE[0] : l > 0 ? HEDGE[1] : l > -0.5 ? HEDGE[2] : HEDGE[3];
        if (hash(xx, yy) > 0.86 && e < 0.8) c = hash(xx, yy + 1) > 0.5 ? C('#ffa030') : C('#ff7a20');
        put(BASE, xx, yy, c);
      }
    }
    for (const [x, y] of [[268, 134], [290, 130], [312, 136], [262, 152], [304, 156], [240, 186], [12, 190]]) if (DT[y * W + x] > 6) OBJ.push({ y, f: () => orangeTree(x, y) });
    const GZ = { x: 284, y: 150 };
    OBJ.push({ y: GZ.y + 5, f() {
      shadowEllipse(GZ.x - 10, GZ.y + 4, 11, 2.5, 0.35);
      for (let y = GZ.y + 2; y <= GZ.y + 5; y++) for (let x = GZ.x - 9; x <= GZ.x + 9; x++) if (sq((x - GZ.x) / 9) + sq((y - GZ.y - 3.5) / 2.2) <= 1) put(BASE, x, y, y === GZ.y + 5 ? MARBLE[4] : MARBLE[1]);
      for (const dx of [-7, -3, 3, 7]) for (let j = 0; j < 9; j++) put(BASE, GZ.x + dx, GZ.y + 3 - j, dx > 0 ? MARBLE[0] : MARBLE[2]);
      for (let j = 0; j < 8; j++) { const hw = 9 - j * 1.1; for (let dx = -Math.ceil(hw); dx <= hw; dx++) put(BASE, GZ.x + dx, GZ.y - 6 - j, dx > hw * 0.4 ? ROSE[0] : dx > -hw * 0.3 ? ROSE[1] : ROSE[3]); }
      for (let x = GZ.x - 9; x <= GZ.x + 9; x++) put(BASE, x, GZ.y - 6, GOLD[2]);
      put(BASE, GZ.x, GZ.y - 14, GOLD[2]); put(BASE, GZ.x, GZ.y - 15, GOLD[1]); put(BASE, GZ.x + 1, GZ.y - 15, GOLD[0]);
    } });
    // A few urns and benches along the promenade.
    for (const [x, y] of [[124, 130], [178, 128], [206, 132], [40, 144], [110, 152]]) if (DT[y * W + x] > 5) OBJ.push({ y, f() {
      shadowEllipse(x - 4, y, 4, 1, 0.35);
      for (let j = 0; j < 5; j++) { const hw = j < 1 ? 1 : j < 4 ? 2 : 1.5; for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) <= hw) put(BASE, x + dx, y - j, dx > 0 ? MARBLE[0] : dx < 0 ? MARBLE[3] : MARBLE[1]); }
      put(BASE, x, y - 5, FLOWERS[0]); put(BASE, x - 1, y - 6, FLOWERS[3]); put(BASE, x + 1, y - 6, FLOWERS[1]); put(BASE, x, y - 6, C('#4a7a44'));
    } });

    OBJ.sort((a, b) => a.y - b.y);
    for (const o of OBJ) o.f();

    // ---------- animated ----------
    const WATER_FX = WATER_IDX.filter(i => KIND[i] === 3);
    const GOLD_FX = []; for (let i = 0; i < N; i++) if (BASE[i] === GOLD[1] || BASE[i] === GOLD[2]) GOLD_FX.push(i);
    const vignette = K.vignette(C('#2a1a3a'), 0.28, 0.5);
    const PETALS = Array.from({ length: 22 }, (_, i) => ({ y: 40 + hash(i, 1) * 110, k: 1 + (i % 3), p: hash(i, 2), s: hash(i, 3) * TAU }));
    const BUTTER = [[118, 84], [40, 150], [220, 160], [146, 150]].map(([x, y], i) => ({ x, y, p: i * 1.7, c: FLOWERS[[3, 1, 4, 2][i]] }));

    // Small figures from ASCII rows, shaded across each row with the light on the right.
    function figure(rows, mats, X, Y, flip, out) {
      const h = rows.length, w = rows[0].length;
      const at = (i, j) => (j < 0 || j >= h || i < 0 || i >= w) ? '.' : rows[j][flip ? w - 1 - i : i];
      for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
        const ch = at(i, j), x = X + i, y = Y + j;
        if (ch === '.') { if (at(i - 1, j) !== '.' || at(i + 1, j) !== '.' || at(i, j - 1) !== '.' || at(i, j + 1) !== '.') put(out, x, y, LINE); continue; }
        const m = mats[ch];
        if (!m) continue;
        if (m.length === 1) { put(out, x, y, m[0]); continue; }
        let l = i, r = i; while (at(l - 1, j) === ch) l--; while (at(r + 1, j) === ch) r++;
        const rel = r > l ? (r - i) / (r - l) : 0.5, n = m.length;
        put(out, x, y, m[Math.min(n - 1, Math.round(clamp(rel * 0.95) * (n - 1)))]);
      }
    }
    // Queenie: towering gold crown (points with gems, a ball on the tallest), magenta hair,
    // lace ruff, pink gown on a gold-rimmed base.
    const QUEEN = [
      '.......ooo.......',
      '.......ooo.......',
      '..g.....g.....g..',
      '..g..g..g..g..g..',
      '..gg.gg.g.gg.gg..',
      '..ggggggggggggg..',
      '..jgjgjgjgjgjgj..',
      '...hhhhhhhhhhh...',
      '..hhfffffffffhh..',
      '..hhfeffffefhhh..',
      '..hhfffffffffhh..',
      '..hhhfffLffffhh..',
      '...hh.fffff.hh...',
      '.wwwwwwwwwwwwwww.',
      'wwwwwwwwwwwwwwwww',
      '.wwwwwwwwwwwwwww.',
      '....ppppppppp....',
      '....ppppppppp....',
      '.....ppppppp.....',
      '.....vvvvvvv.....',
      '....ppppppppp....',
      '...ppppppppppp...',
      '..ppppppppppppp..',
      '..ppppppppppppp..',
      '.ppppppppppppppp.',
      '.ggggggggggggggg.',
      'ppppppppppppppppp'];
    const QMATS = {
      g: GOLD, o: P(['#ffb0d0', '#ff3a8a', '#c01a60']), j: [C('#ff3a8a')],
      h: P(['#b0507e', '#8a3a6a', '#6a2a56', '#4a1a42']),
      f: P(['#fff6ee', '#ffe0cc', '#f4bcac', '#cc8c9c']),
      e: [C('#3a0e2a')], L: [C('#d8306a')],
      w: P(['#ffffff', '#f6ecf4', '#dcc6dc', '#a890b8']),
      p: P(['#ffd6e8', '#ff9ac8', '#ff66aa', '#cc4488', '#7a2a66']),
      v: P(['#ff6a8a', '#d8305a', '#a01c44']),
    };

    function frame(t, state) {
      const u = t / LOOP;
      const M = (state && state.map) || {}, cleared = M.cleared | 0, beaten = !!M.beaten;
      buf.set(BASE);
      // Heat shimmer over the far dunes.
      for (let x = 0; x < 172; x++) { const y = duneTop(x); if (Math.sin(TAU * 10 * u + x * 0.3) > 0.7) put(buf, x, y - 1, DUNE[0]); }
      // Water: glints on the moat, ripples in the fountain basin.
      for (const i of WATER_FX) {
        const x = i % W, y = (i / W) | 0;
        if (Math.sin(TAU * 14 * u + hash(x >> 1, y) * TAU) > 0.97) buf[i] = WATER[0];
        else if (y < 106 === false && Math.sin(TAU * 6 * u - x * 0.2 + y * 1.3) > 0.93) buf[i] = WATER[1];
      }
      for (let r = 0; r < 3; r++) {
        const v = frac(3 * u + r / 3), rx = 4 + v * 11, ry = rx * 0.5;
        for (let a = 0; a < 40; a++) { const x = FT.x + Math.cos(a / 40 * TAU) * rx, y = FT.y + 1 + Math.sin(a / 40 * TAU) * ry; if (sq((x - FT.x) / FT.rx) + sq((y - FT.y) / FT.ry) < 0.7) blendAt(buf, x, y, WATER[0], 0.6 * (1 - v)); }
      }
      // Fountain jets: arcs of droplets from the top tier.
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * TAU, v = frac(20 * u + hash(k, 4));
        const x = FT.x + Math.cos(a) * v * 10, y = FT.y - 10 + (-2.2 * v + 12 * v * v) + Math.sin(a) * v * 4;
        put(buf, x, y, v < 0.5 ? C('#ffffff') : WATER[0]);
      }
      { const v = frac(30 * u); put(buf, FT.x, FT.y - 11 - Math.round(v * 3), C('#ffffff')); }
      // Cloud shadows drift over the gardens.
      for (let c = 0; c < 2; c++) {
        const cx = frac(u + c / 2) * (W + 200) - 100, cy = 80 + c * 50, rx = 46, ry = 14;
        for (let y = Math.max(40, Math.floor(cy - ry)); y <= Math.min(H - 1, cy + ry); y++) for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(W - 1, cx + rx); x++) {
          const e = sq((x - cx) / rx) + sq((y - cy) / ry) + (noise2(x / 10, y / 6, c) - 0.5) * 0.7;
          if (e < 1) blend(buf, y * W + x, SHAD, e < 0.7 ? 0.14 : 0.08);
        }
      }
      // Gold glints travel over the trim and domes.
      for (const i of GOLD_FX) { const x = i % W, y = (i / W) | 0; if (Math.sin(TAU * 10 * u - x * 0.12 - y * 0.05) > 0.975) buf[i] = GOLD[0]; }
      for (const [fx, fy] of FINIALS) if (Math.sin(TAU * 7 * u + fx) > 0.9) { put(buf, fx, fy + 1, C('#ffffff')); put(buf, fx - 1, fy + 2, GOLD[0]); }
      // Windows catch the low sun in turn.
      WINDOWS.forEach((i, n) => { const x = i % W; if (Math.sin(TAU * 4 * u + x * 0.05) > 0.8 && (i / W | 0) % 13 < 7) buf[i] = C('#ffd8a0'); });
      // The crowd in the stands bobs and cheers.
      for (const i of CROWD) if (Math.sin(TAU * 40 * u + hash(i, 5) * TAU) > 0.6) { buf[i] = MARBLE[0]; }
      // Banners: on the palace, the royal box and the tents.
      for (const [bx, by] of BANNERS) for (let j = 0; j < 14; j++) for (let i = 0; i < 6; i++) {
        const wv = Math.round(Math.sin(TAU * 15 * u - j * 0.35 + bx) * (j / 14) * 1.5);
        if (j > 10 && Math.abs(i - 2.5) < j - 10) continue;
        const crown = j >= 4 && j <= 6 && i >= 1 && i <= 4 && (j === 6 || i % 2 === 1);
        put(buf, bx + i + wv, by + j, crown ? GOLD[1] : i === 0 || i === 5 ? GOLD[2] : BANNER[wv > 0 ? 0 : 1]);
      }
      for (const [x, y] of TENTS) for (let i = 1; i <= 5; i++) {
        const wv = Math.sin(TAU * 24 * u - i * 0.8 + x) > 0 ? 1 : 0;
        put(buf, x + i, y - 15 + (i > 2 ? wv : 0), i < 3 ? GOLD[1] : BANNER[0]);
        if (i < 4) put(buf, x + i, y - 14 + (i > 2 ? wv : 0), BANNER[1]);
      }
      // The bracket board: the Cup appears on it once won; names light up as you go.
      if (cleared >= 1) {
        const cx = BR.x, cy = BR.y - 13;
        for (const [dx, dy] of [[-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [-2, -1], [2, -1], [-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [0, 1], [-1, 2], [0, 2], [1, 2]]) put(buf, cx + dx, cy + dy, dx > 0 ? GOLD[0] : GOLD[1]);
        glow(buf, cx, cy, 8, GOLD[0], 0.3);
      }
      // A peacock by the fountain fans its tail now and then.
      { const px = 184, py = 148, open = clamp(Math.sin(TAU * 5 * u) * 2.5 - 0.5);
        if (open > 0.05) for (let a = -1.3; a <= 1.3; a += 0.18) for (let r = 2; r < 2 + open * 7; r++) {
          const x = px + 3 + Math.sin(a) * r, y = py - 2 - Math.cos(a) * r * 0.9;
          put(buf, x, y, r > 1 + open * 7 - 1.5 ? C('#e8c040') : (r & 1) ? C('#2aa088') : C('#1a7a78'));
          if (r > 1 + open * 7 - 2.5 && r < 1 + open * 7 - 1.5) put(buf, x, y, C('#3a4ab0'));
        }
        else for (let k = 0; k < 7; k++) put(buf, px + 3 + k, py - 1 + (k >> 2), C('#1a7a78'));
        const step = Math.sin(TAU * 12 * u) > 0 ? 1 : 0;
        for (const [dx, dy, c] of [[0, 0, '#2a60c0'], [1, 0, '#2a60c0'], [2, 0, '#2a60c0'], [1, -1, '#3a7ae0'], [2, -1, '#3a7ae0'], [0, -2, '#3a7ae0'], [0, -3, '#3a7ae0'], [-1, -3, '#e8c040'], [0, -4, '#2aa088'], [1, 1, '#8a6a3a'], [2, 1 + step, '#8a6a3a']])
          put(buf, px + dx, py + dy, C(c));
      }
      // Petals drift on the breeze; butterflies flutter over the beds.
      for (const p of PETALS) {
        const v = frac(p.k * u + p.p), x = W + 10 - v * (W + 20), y = p.y + Math.sin(TAU * 6 * u + p.s) * 4 + v * 10;
        put(buf, x, y, Math.sin(TAU * 20 * u + p.s) > 0 ? FLOWERS[3] : FLOWERS[0]);
      }
      for (const b of BUTTER) {
        const x = b.x + 10 * Math.sin(TAU * 3 * u + b.p), y = b.y + 5 * Math.sin(TAU * 5 * u + b.p * 2), up = Math.sin(TAU * 150 * u + b.p) > 0;
        put(buf, x, y, b.c); put(buf, x - 1, y - (up ? 1 : 0), b.c); put(buf, x + 1, y - (up ? 1 : 0), b.c);
      }
      // Doves wheel over the palace.
      for (let d = 0; d < 4; d++) {
        const a = TAU * (2 * u + d / 4), x = 150 + Math.cos(a) * 60, y = 60 + Math.sin(a) * 14 - d * 3;
        const up = Math.sin(TAU * 140 * u + d) > 0;
        for (const [dx, dy] of up ? [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]] : [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]]) put(buf, x + dx, y + dy, C('#ffffff'));
        put(buf, x, y + 1, C('#c8b8d0'));
      }

      // Queenie on her balcony: fanning herself, strutting a step or two either way.
      const [gx, gy] = S[1];
      const strut = beaten ? 0 : Math.round(3 * Math.sin(TAU * 3 * u));
      const bob = Math.sin(TAU * (beaten ? 60 : 30) * u) > 0.4 ? 1 : 0;
      const QX = gx - 8 + strut, QY = gy - 50 + bob;
      glow(buf, gx, gy - 36, 18, C('#ffe0a0'), 0.18);
      figure(QUEEN, QMATS, QX, QY, false, buf);
      if (frac(6 * u + 0.2) < 0.03 && !beaten) { put(buf, QX + 5, QY + 9, QMATS.f[1]); put(buf, QX + 10, QY + 9, QMATS.f[1]); }
      // Hand on hip (left), the fan (right) fluttering; when beaten she fans furiously, flushed.
      put(buf, QX + 2, QY + 20, QMATS.f[2]); put(buf, QX + 3, QY + 19, QMATS.f[1]); put(buf, QX + 1, QY + 20, LINE);
      const fanA = Math.sin(TAU * (beaten ? 120 : 45) * u) * 0.5;
      const fx = QX + 15, fy = QY + 15;
      for (let a = -0.9; a <= 0.9; a += 0.15) for (let r = 1; r <= 5; r++) {
        const ang = -Math.PI / 2 + a * 0.9 + fanA + 0.4;
        put(buf, fx + Math.cos(ang) * r, fy + Math.sin(ang) * r, r === 5 ? C('#ff66aa') : (Math.round(a * 7) & 1) ? C('#ffffff') : C('#f6c8e0'));
      }
      put(buf, fx, fy, QMATS.f[2]); put(buf, fx, fy + 1, QMATS.f[3]);
      if (beaten) { put(buf, QX + 4, QY + 10, C('#ff3a4a')); put(buf, QX + 12, QY + 10, C('#ff3a4a'));
        if (Math.sin(TAU * 30 * u) > 0) { put(buf, QX - 2, QY + 6, C('#ffffff')); put(buf, QX - 3, QY + 5, C('#ffffff')); put(buf, QX + 19, QY + 5, C('#ffffff')); put(buf, QX + 20, QY + 4, C('#ffffff')); } }
      // The balcony's gold-railed balustrade in front of her.
      for (let x = 236; x <= 264; x++) {
        const y = 74 + Math.round(6 * Math.sqrt(Math.max(0, 1 - sq((x - 250) / 14))));
        put(buf, x, y - 5, GOLD[x > 252 ? 0 : 1]); put(buf, x, y - 4, GOLD[3]);
        if (x % 2 === 0) for (let j = -3; j <= -1; j++) put(buf, x, y + j, x > 252 ? MARBLE[0] : MARBLE[2]);
      }
      // Pennants for a cleared stop (the tournament).
      if (cleared >= 1) {
        const [sx, sy] = S[0], px = sx + 12, py = sy - 13;
        for (let j = 0; j < 9; j++) put(buf, px, py + j, C('#5a3a2a'));
        for (let j = 0; j < 3; j++) for (let i = 1; i <= 4 - j; i++) put(buf, px + i, py + j + (i > 2 && Math.sin(TAU * 24 * u - i) > 0 ? 1 : 0), j === 0 ? GOLD[0] : GOLD[1]);
      }
      vignette(buf);
    }

    return (t, out, state) => { buf = out; frame(t, state); };
  },
});
