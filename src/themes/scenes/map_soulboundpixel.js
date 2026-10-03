// Soulbound Pixel, the place map: World 11 (theme `crystal`), the last world.
//
// What is left of the Great Board: fragments of the board floating in glowing ether, each
// a slab of whole squares with a striped glass edge and a jagged crystal root hanging
// under it, joined in order by bridges of cyan crystal. The trail is a thread of light
// running across the squares. At the far edge of the biggest fragment, under the magenta
// spire of the background scene, stands Grandmaster X, the crystal king, his greatsword
// planted in the board; beside it, on its own fragment, the spot where you fell, one
// square from the edge.
// Stops: Crystal Echoes (three echo kings), Everything Costs (the Shardling bishop's toll,
// shard coins), Weak Spots (a tall mirror), Shattered Sight (a prism in the fog), The
// Last Rank (the glowing last row and a crown), Shard Storm (five shards orbiting), One
// Square Away (footprints stopping at the edge, the crack), and Grandmaster X.
// Moves: stars twinkle; far fragments bob and drift; shards orbit the spire, whose core
// pulses; energy arcs flicker; pulses of light run along the trail; bridges shimmer;
// crumbs of crystal fall from the fragments; ether motes rise; the echo kings fade in and
// out; coins spin; a glint sweeps the mirror; the prism's rainbow shivers and fog drifts;
// the last rank breathes and the crown bobs; the shard storm turns; the footprints light
// one by one and the crack flickers; Grandmaster X breathes, his eyes burn, a glint runs
// down his crystal and his shards circle him.
// State: { map: { cleared, beaten } }: cleared stops plant a small banner and light their
// landmark; beaten, the spire dims, the eyes go out and the board's crack heals to gold.
LiveScenes.register({
  id: 'map_soulboundpixel',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  stops: [[40, 134], [84, 102], [128, 136], [196, 134], [252, 138], [284, 98], [236, 74], [160, 86]],
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, line, glow } = K;
    const hyp = (a, b) => Math.sqrt(a * a + b * b);
    function noise2(x, y, seed = 0) {
      const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, s = seed * 1013;
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      const a = hash(i + s, j), b = hash(i + 1 + s, j), c = hash(i + s, j + 1), d = hash(i + 1 + s, j + 1);
      return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
    }
    const STOPS = LiveScenes.get('map_soulboundpixel').stops;
    let buf = null;

    const P = (...a) => a.map(C);
    const LIGHT = P('#fffaf0', '#e8dfcf', '#c8bcb0'), DARK = P('#4a1a5a', '#2b0d36', '#1e0828');
    const CYAN = C('#5af0ff'), CYAN2 = C('#2aa0c0'), MAG = C('#d932ff'), WHITE = C('#ffffff');
    const FACE = P('#b07ac8', '#8a5aa0', '#5a2a70', '#3a1650', '#1a0a24');
    const ROOT = P('#6a3a90', '#4a1e6a', '#30104a', '#1c0830', '#0e0418');

    // ---------- deep space: nebulae, the spire ----------
    const BASE = new Uint32Array(W * H), DEPTH = new Float32Array(W * H).fill(-1);
    const SKY = P('#050508', '#0c0818', '#1a0c2c', '#2e1044', '#4a1660');
    const NEB = P('#050508', '#081828', '#0e2a40', '#1a4a62');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const m = noise2(x / 60, y / 40, 1) * 0.7 + noise2(x / 20, y / 14, 2) * 0.3;
      const c = noise2(x / 50 + 9, y / 36, 5) * 0.7 + noise2(x / 16, y / 12, 6) * 0.3;
      const core = Math.exp(-sq((x - 160) / 80) - sq((y - 30) / 50));
      const tm = clamp((m - 0.45) * 2.2) + core * 0.45, tc = clamp((c - 0.5) * 2.4) * (1 - core);
      BASE[y * W + x] = tc > tm ? ramp(NEB, tc, x, y) : ramp(SKY, tm, x, y);
    }
    // Grandmaster X's spire, far behind his fragment: a cluster of magenta crystal.
    const SP = { x: 160, base: 58 };
    for (const [dx, dy, hw, h] of [[0, 0, 9, 62], [-11, 5, 6, 42], [11, 3, 6, 48], [-20, 10, 4, 26], [20, 9, 4, 30], [-5, 8, 4, 22], [6, 7, 4, 26]].sort((a, b) => b[1] - a[1] || a[3] - b[3])) {
      const cx = SP.x + dx, base = SP.base + dy;
      for (let j = 0; j < h; j++) {
        const w = j < h * 0.2 ? hw * (0.2 + 0.8 * j / (h * 0.2)) : j < h * 0.7 ? hw : hw * (h - j) / (h * 0.3);
        for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
          const rel = (x - cx) / Math.max(1, w);
          let c = rel < -0.55 ? '#f0a8ff' : rel < -0.1 ? '#c860f0' : rel < 0.45 ? '#8a18c0' : '#50107a';
          if (Math.abs(rel + 0.1) < 0.09) c = '#ffd0ff';
          put(BASE, x, base - j, C(mix(c, '#1a0c2c', 0.25)));
        }
      }
    }

    // ---------- fragments of the board ----------
    const SW = 11, SH = 7;
    // ox, oy: top-left of the top face; rows of squares ('X'); T: glass edge; D: root depth.
    const FRAGS = [
      { ox: 116, oy: 50, rows: ['..XXXX..', '.XXXXXX.', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..'], T: 6, D: 26, par: 0, edge: true },
      { ox: 209, oy: 54, rows: ['XXXXX', 'XXXXX', '.XXXX', '..XX.'], T: 5, D: 16, par: 1, edge: true },
      { ox: 262, oy: 76, rows: ['.XX.', 'XXXX', 'XXXX', '.XXX'], T: 5, D: 14, par: 0 },
      { ox: 57, oy: 86, rows: ['XXXX.', 'XXXXX', '.XXXX'], T: 5, D: 16, par: 1 },
      { ox: 12, oy: 114, rows: ['.XXX.', 'XXXXX', 'XXXXX', '.XXXX'], T: 6, D: 18, par: 0 },
      { ox: 169, oy: 114, rows: ['..XXX', 'XXXXX', 'XXXXX', 'XXXX.'], T: 6, D: 18, par: 1 },
      { ox: 101, oy: 118, rows: ['.XXXX', 'XXXXX', 'XXXX.'], T: 5, D: 16, par: 0 },
      { ox: 225, oy: 118, rows: ['XXXXX', 'XXXXX', '.XXXX', '..XX.'], T: 6, D: 18, par: 1 },
      // Loose pieces near the viewer, under the panel.
      { ox: -8, oy: 168, rows: ['XXX', 'XX.'], T: 7, D: 20, par: 1, dim: true },
      { ox: 284, oy: 166, rows: ['.XXX', 'XXXX'], T: 7, D: 20, par: 0, dim: true },
      { ox: 150, oy: 176, rows: ['XX'], T: 6, D: 14, par: 1, dim: true },
    ];
    const TOP = new Uint8Array(W * H);                     // 1 = a fragment's top face
    function buildFrag(f, n) {
      const cols = f.rows[0].length, rowsN = f.rows.length, has = (i, j) => j >= 0 && j < rowsN && i >= 0 && i < cols && f.rows[j][i] === 'X';
      const w = cols * SW, h = rowsN * SH, mask = new Uint8Array(w * h);
      for (let j = 0; j < rowsN; j++) for (let i = 0; i < cols; i++) {
        if (!has(i, j)) continue;
        // Squares on a convex corner of the fragment have that corner broken off.
        const corner = Math.floor(hash(i + n * 17, j) * 4), sx = corner & 1 ? 1 : -1, sy = corner & 2 ? 1 : -1;
        const convex = !has(i + sx, j) && !has(i, j + sy) && !has(i + sx, j + sy) && hash(i, j + n * 31) > 0.3;
        for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
          const fx = corner & 1 ? SW - 1 - x : x, fy = corner & 2 ? SH - 1 - y : y;
          if (convex && fx * 0.64 + fy < 3.6) continue;
          // Cracked edges: small irregular bites out of every open side.
          const X = i * SW + x, Y = j * SH + y;
          if (!has(i - 1, j) && x < Math.floor(hash(Y >> 1, n * 7 + 1) * 2.6)) continue;
          if (!has(i + 1, j) && SW - 1 - x < Math.floor(hash(Y >> 1, n * 7 + 2) * 2.6)) continue;
          if (!has(i, j - 1) && y < Math.floor(hash(X >> 1, n * 7 + 3) * 2.2)) continue;
          if (!has(i, j + 1) && SH - 1 - y < Math.floor(hash(X >> 1, n * 7 + 4) * 1.8)) continue;
          mask[(j * SH + y) * w + i * SW + x] = 1;
        }
      }
      const M = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x];
      const front = f.oy + h;
      // Top face: checkered squares with a cyan rim on the broken edges.
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!M(x, y)) continue;
        const i = Math.floor(x / SW), j = Math.floor(y / SH), fx = x % SW, fy = y % SH, light = (i + j + f.par) % 2 === 0;
        let c = light ? ramp(LIGHT, (fx + fy) / 16 + y / h * 0.4, x, y) : ramp(DARK, 0.2 + (fx + fy) / 20 + y / h * 0.5, x, y);
        if (!M(x, y - 1) || !M(x - 1, y) || !M(x + 1, y)) c = CYAN;
        else if (!M(x, y + 1)) c = light ? WHITE : C('#8a5aa0');
        if (f.dim) c = mixc(c, C('#0a0418'), 0.45);
        const X = f.ox + x, Y = f.oy + y;
        if (X < 0 || X >= W || Y < 0 || Y >= H) continue;
        BASE[Y * W + X] = c; DEPTH[Y * W + X] = front; if (!f.dim) TOP[Y * W + X] = 1;
      }
      // The glass edge below the front of each column, then the crystal root.
      for (let x = 0; x < w; x++) {
        let yb = -1;
        for (let y = h - 1; y >= 0; y--) if (M(x, y)) { yb = y; break; }
        if (yb < 0) continue;
        const X = f.ox + x, i = Math.floor(x / SW), light = (i + Math.floor(yb / SH) + f.par) % 2 === 0;
        const cx = w / 2, taper = Math.pow(clamp(1 - Math.abs(x - cx) / (w / 2 + 2)), 0.7);
        const depth = Math.round(f.T + f.D * taper * (0.6 + 0.4 * noise2(X / 5, n, 7)) + (hash(X, n) > 0.8 ? 3 : 0));
        for (let d = 1; d <= depth; d++) {
          const Y = f.oy + yb + d;
          if (X < 0 || X >= W || Y < 0 || Y >= H) continue;
          if (DEPTH[Y * W + X] > front) continue;
          let c;
          if (d <= f.T) c = x % SW === 0 ? FACE[3] : d === f.T ? FACE[4] : ramp(FACE, (light ? 0 : 0.35) + d / f.T * 0.5, X, Y);
          else {
            const r = (d - f.T) / (depth - f.T + 1);
            c = ramp(ROOT, 0.1 + r * 0.9 + (x < cx ? -0.1 : 0.1), X, Y);
            if (X % 13 === 5 && r < 0.6 && hash(X, n) > 0.4) c = CYAN2;              // glowing veins
            if (d === depth) c = C('#2a0a40');
          }
          if (f.dim) c = mixc(c, C('#0a0418'), 0.45);
          BASE[Y * W + X] = c; DEPTH[Y * W + X] = front;
        }
        // A few magenta crystals hanging from the root.
        if (!f.dim && hash(X, n + 5) > 0.86) for (let d = 0; d < 5; d++) { const Y = f.oy + yb + depth - 2 + d; if (Y < H && X + 1 < W) { put(BASE, X, Y, C(d < 3 ? '#f090ff' : '#a030d0')); if (d < 3) put(BASE, X + 1, Y, C('#8a18c0')); } }
      }
      f.w = w; f.h = h; f.mask = mask;
    }
    function mixc(a, b, t) { const r = (a & 255) + ((b & 255) - (a & 255)) * t, g = (a >> 8 & 255) + ((b >> 8 & 255) - (a >> 8 & 255)) * t, bl = (a >> 16 & 255) + ((b >> 16 & 255) - (a >> 16 & 255)) * t; return (0xff000000 | (bl << 16) | (g << 8) | r) >>> 0; }
    // Glow of ether under each fragment first, then the fragments back to front.
    for (const f of FRAGS) if (!f.dim) glow(BASE, f.ox + f.rows[0].length * SW / 2, f.oy + f.rows.length * SH + 8, f.rows[0].length * SW * 0.6, CYAN, 0.1);
    FRAGS.map((f, n) => [f, n]).sort((a, b) => (a[0].oy + a[0].rows.length * SH) - (b[0].oy + b[0].rows.length * SH)).forEach(([f, n]) => buildFrag(f, n));

    // ---------- the far edge of the Great Board: a gilded rim along the back ----------
    function rim(f, row = 0) {
      const y0 = f.oy - 1;
      for (let x = 0; x < f.w; x++) {
        let top = -1;
        for (let y = 0; y < f.h; y++) if (f.mask[y * f.w + x]) { top = y; break; }
        if (top < 0 || top > SH * 1.5) continue;
        const X = f.ox + x, Y = f.oy + top;
        for (let z = 0; z < 3; z++) put(BASE, X, Y - z, C(z === 2 ? '#fff4b0' : z === 1 ? '#ffd23a' : '#a86c10'));
      }
    }
    rim(FRAGS[0]); rim(FRAGS[1]);

    // ---------- the trail: a thread of light over the squares, crystal bridges between ----------
    function spline(pts, step = 0.5) {
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
    const TRAIL = spline([STOPS[0], [62, 116], STOPS[1], [104, 118], STOPS[2], [160, 140], STOPS[3], [224, 134], STOPS[4], [270, 120], STOPS[5], [264, 84], STOPS[6], [206, 80], STOPS[7]]);
    const onTop = (x, y) => { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < W && y < H && TOP[y * W + x]; };
    const BRIDGE_PIX = [];
    let prev = null;
    for (let k = 0; k < TRAIL.length; k++) {
      const [x, y] = TRAIL[k], X = Math.round(x), Y = Math.round(y);
      if (prev && prev[0] === X && prev[1] === Y) continue;
      prev = [X, Y];
      if (onTop(X, Y)) {
        // Thread of light on the board: a bright core with a faint halo.
        put(BASE, X, Y, C('#c8faff'));
        for (const [dx, dy] of [[0, 1], [0, -1]]) if (onTop(X + dx, Y + dy)) blendAt(BASE, X + dx, Y + dy, CYAN, 0.35);
      } else {
        // A crystal bridge: a plank of cyan glass with a dark underside and hanging teeth.
        for (let d = -1; d <= 3; d++) {
          if (onTop(X, Y + d)) continue;
          const c = d === -1 ? C('#e0faff') : d === 0 ? CYAN : d === 1 ? C('#2a8aa8') : d === 2 ? C('#1a4a6a') : (X % 3 === 0 ? C('#b040e0') : 0);
          if (c) { put(BASE, X, Y + d, c); DEPTH[(Y + d) * W + X] = Y + 4; }
        }
        BRIDGE_PIX.push([X, Y]);
      }
    }
    // Clearings: a faint ring of light on the squares round each stop.
    for (const [sx, sy] of STOPS) for (let a = 0; a < TAU; a += 0.04) {
      const x = Math.round(sx + Math.cos(a) * 11), y = Math.round(sy + Math.sin(a) * 7.5);
      if (onTop(x, y)) blendAt(BASE, x, y, CYAN, 0.35);
    }

    // ---------- landmarks ----------
    const dk = C('#1e1024');
    // 2. The Shardling's toll: a crystal bishop (mitre with a slit and a ball on top, no cross).
    function bishop(b, x, y, cols) {
      const [L, M2, D2] = cols;
      const rows = [[0, 0, 'L'], [-1, 1, 'LM'], [-1, 2, 'LMD'], [-2, 3, 'LLMDD'], [-2, 4, 'LMsMD'], [-2, 5, 'LMMDD'], [-1, 6, 'LMD'], [-2, 7, 'LMMMD'], [-1, 8, 'LMD'], [-1, 9, 'LMD'], [-2, 10, 'LMMMD'], [-3, 11, 'LLMMMDD']];
      for (const [x0, dy, s] of rows) for (let k = 0; k < s.length; k++) put(b, x + x0 + k, y - 11 + dy, s[k] === 'L' ? L : s[k] === 'M' ? M2 : s[k] === 's' ? dk : D2);
    }
    bishop(BASE, 100, 96, [C('#f0c8ff'), C('#b060e0'), C('#6a1a90')]);
    // The toll arch it guards.
    for (let z = 0; z < 12; z++) { put(BASE, 64, 96 - z, C('#b060e0')); put(BASE, 65, 96 - z, C('#6a1a90')); put(BASE, 74, 96 - z, C('#b060e0')); put(BASE, 75, 96 - z, C('#6a1a90')); }
    for (let x = 64; x <= 75; x++) { put(BASE, x, 84 - Math.round(2 * Math.sin((x - 64) / 11 * Math.PI)), C('#f0c8ff')); put(BASE, x, 85 - Math.round(2 * Math.sin((x - 64) / 11 * Math.PI)), C('#8a30c0')); }
    // 3. The mirror that shows your worst: a tall oval glass in a crystal frame.
    const MIR = { x: 128, y: 112, rx: 5, ry: 9 };
    for (let y = -MIR.ry - 1; y <= MIR.ry + 1; y++) for (let x = -MIR.rx - 1; x <= MIR.rx + 1; x++) {
      const d = hyp(x / (MIR.rx + 0.5), y / (MIR.ry + 0.5));
      if (d > 1.12) continue;
      put(BASE, MIR.x + x, MIR.y + y, d > 0.88 ? C(x < 0 ? '#fff4b0' : '#c89020') : ramp(P('#c8f0ff', '#8ab8d8', '#4a6a9a', '#2a3a6a'), 0.3 + (y + x * 0.5) / 18, x, y));
    }
    for (let z = 0; z < 5; z++) put(BASE, MIR.x, MIR.y + MIR.ry + 1 + z, C('#c89020'));
    for (let x = -3; x <= 3; x++) put(BASE, MIR.x + x, MIR.y + MIR.ry + 6, C(x < 0 ? '#fff4b0' : '#a86c10'));
    // 4. The prism: a triangle of clear crystal.
    const PR = { x: 208, y: 120 };
    for (let j = 0; j < 9; j++) for (let i = -Math.floor(j * 0.6); i <= Math.floor(j * 0.6); i++) put(BASE, PR.x + i, PR.y - 9 + j, C(i < -j * 0.3 ? '#ffffff' : i < 0 ? '#c8f0ff' : i < j * 0.3 ? '#8ad0f0' : '#4a8ab8'));
    // 5. The Last Rank: the fragment's back row glows; a pawn statue waits in front.
    const RANK = [];
    for (let i = 0; i < 5; i++) RANK.push([225 + i * SW, 118]);
    function pawn(b, x, y, c1, c2, c3) {
      const rows = [[-1, 0, 'LMD'], [-1, 1, 'LMD'], [0, 2, 'M'], [-1, 3, 'LMD'], [-1, 4, 'LMD'], [-2, 5, 'LLMDD'], [-2, 6, 'LMMMD']];
      for (const [x0, dy, s] of rows) for (let k = 0; k < s.length; k++) put(b, x + x0 + k, y - 6 + dy, s[k] === 'L' ? c1 : s[k] === 'M' ? c2 : c3);
    }
    pawn(BASE, 268, 130, C('#fffaf0'), C('#c8bcb0'), C('#7a6a78'));
    // 7. One Square Away: the last square before the edge, cracked.
    const EDGE_SQ = { x: 226, y: 55 };
    const CRACK = [];
    { let x = EDGE_SQ.x + 1, y = EDGE_SQ.y + 3; for (let k = 0; k < 22; k++) { x += 1; y += (hash(k, 77) - 0.5) * 1.8; const X = Math.round(x), Y = Math.round(y); if (onTop(X, Y)) CRACK.push(Y * W + X); } }
    const PRINTS = [];
    for (let k = 0; k < 5; k++) PRINTS.push([236 + (k % 2 ? 2 : -2), 86 - k * 4]);

    // ---------- animated ----------
    const vignette = K.vignette(C('#020104'), 0.4, 0.42);
    const STARS = Array.from({ length: 90 }, (_, i) => ({ x: hash(i, 1) * W | 0, y: hash(i, 2) * H | 0, k: 6 + (i % 29), p: hash(i, 3) * TAU, big: i % 11 === 0 }))
      .filter(s => DEPTH[s.y * W + s.x] < 0);
    const ORBIT = Array.from({ length: 8 }, (_, i) => ({ a: i / 8 * TAU, r: 34 + (i % 3) * 10, y: 22 + (i % 4) * 6, k: i % 2 ? 2 : 3, s: 1 + (i % 3) }));
    const MOTES = Array.from({ length: 40 }, (_, i) => ({ x: hash(i, 5) * W, k: 2 + (i % 4), p: hash(i, 6), w: hash(i, 7) * TAU, mag: i % 2 }));
    const CRUMBS = Array.from({ length: 14 }, (_, i) => { const f = FRAGS[i % 8]; return { x: f.ox + 8 + hash(i, 41) * (f.rows[0].length * SW - 16), y: f.oy + f.rows.length * SH + f.T + 6, k: 3 + (i % 4), p: hash(i, 42) }; });
    const FAR = [[20, 44, 1], [296, 30, 2], [70, 60, 3], [300, 132, 4], [100, 162, 3], [226, 186, 2], [4, 92, 5]].map(([x, y, k], n) => ({ x, y, k, p: hash(n, 9) * TAU, s: n % 3 }));
    const TRAIL_ON = TRAIL.filter((_, k) => k % 2 === 0);

    function dput(x, y, c, d) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const o = y * W + x; if (DEPTH[o] <= d + 0.5) buf[o] = c; }
    function shard(x, y, s, front) {
      for (let j = -s * 2; j <= s * 2; j++) { const w = s - Math.abs(j) / 2; for (let i = -w; i <= w; i++) dput(x + i, y + j, C(i < 0 ? (front ? '#ffe0ff' : '#c060e0') : (front ? '#d040ff' : '#6a1a90')), front ? 999 : 0); }
    }
    function farFrag(f, u) {
      const x = f.x + 3 * Math.sin(TAU * f.k * u + f.p), y = f.y + 3 * Math.sin(TAU * (f.k + 1) * u + f.p * 2), w = 6 + f.s * 2;
      for (let j = 0; j < 3; j++) for (let i = 0; i < w; i++) { const X = Math.round(x + i + j), Y = Math.round(y + j); if (X >= 0 && X < W && Y >= 0 && Y < H && DEPTH[Y * W + X] < 0) buf[Y * W + X] = C(j === 0 ? '#5af0ff' : ((i >> 2) + j) % 2 ? '#3a1a4a' : '#9a8ea0'); }
      for (let i = 1; i < w - 1; i++) { const X = Math.round(x + i + 3), Y = Math.round(y + 3); if (X >= 0 && X < W && Y < H && DEPTH[Y * W + X] < 0) buf[Y * W + X] = C('#4a1e6a'); }
    }
    function flag(x, y, u) {
      for (let z = 0; z < 9; z++) put(buf, x, y - z, C('#e0faff'));
      for (let i = 1; i <= 5; i++) for (let j = 0; j < 3; j++) {
        if (j === 2 && i > 3) continue;
        put(buf, x + i, y - 8 + j + Math.round(Math.sin(TAU * 30 * u - i * 0.9) * 0.8 * (i / 5)), C(j === 0 ? '#ffd23a' : '#d932ff'));
      }
    }

    // ---------- Grandmaster X ----------
    const GX = [
      '...o...ooo...o...',
      '..oYo.oYGYo.oYo..',
      '..oYYoYYYYYoYYo..',
      '..oYYYYYYYYYYYo..',
      '..oYYYYYYYYYYYo..',
      '..oyRyyRyyyRyyo..',
      '..ooooooooooooo..',
      '...oCCCcccccVo...',
      '...oCCccccccVo...',
      '...oCEEcccEEVo...',
      '...oCccccccVVo...',
      '....oCcccccVo....',
      '...ooPPPPPPPoo...',
      '..oPPpPPPPPpPPo..',
      '.oPPPpPPPPPpPPPo.',
      '.oPPpPPgggPPpPPo.',
      '.oPPpPPgGgPPpPPo.',
      '.oPPpPPPBPPPpPPo.',
      '.oPPpPPPBPPPpPPo.',
      '.oPPpPPPBPPPpPPo.',
      'oPPPpPPPBPPPpPPPo',
      'oPPpPPPPBPPPPpPPo',
      'oPPpPPPPBPPPPpPPo',
      'oPPpPPPPBPPPPpPPo',
      'oYYYYYYYBYYYYYYYo',
      'oKKKKKKKBKKKKKKKo',
      'oKkkkkkkBkkkkkkko',
      '.ooooooobooooooo.',
    ];
    const GXPAL = {
      o: C('#1e1024'), Y: C('#ffd23a'), y: C('#e0a010'), G: C('#5af0ff'), R: C('#d932ff'), C: C('#fbe0ff'), c: C('#d070ff'), V: C('#7a24c0'),
      E: C('#ff6600'), P: C('#9a48d8'), p: C('#5a1a90'), g: C('#fff0ff'), B: C('#b4f0ff'), b: C('#6ac8e0'), K: C('#b448e8'), k: C('#56109a'),
    };
    const GXW = 17, GXH = GX.length, GXX = 160, GXY = 73;
    function gmx(u, beaten) {
      const breath = Math.sin(TAU * 20 * u) > 0.2 ? 1 : 0, ox = GXX - (GXW >> 1), oy = GXY - GXH + 1, d = 999;
      for (let i = -8; i <= 8; i++) { const o = (GXY + 1) * W + GXX + i - 2; blend(buf, o, C('#12041a'), 0.45); }
      glow(buf, GXX, GXY - 12, 22, beaten ? CYAN : MAG, beaten ? 0.1 : 0.16 + 0.06 * Math.sin(TAU * 10 * u));
      const sweep = frac(8 * u) * 40 - 10;                                   // a glint running down his crystal
      for (let j = 0; j < GXH; j++) for (let i = 0; i < GXW; i++) {
        const ch = GX[j][i];
        if (ch === '.') continue;
        let c = GXPAL[ch];
        if ((ch === 'C' || ch === 'c' || ch === 'K') && Math.abs(j + i * 0.4 - sweep) < 0.8) c = WHITE;
        if (ch === 'E') c = beaten ? C('#6a2a96') : Math.sin(TAU * 24 * u) > -0.6 ? C('#ff8a20') : C('#ffe080');
        const top = j < 17;
        dput(ox + i, oy + j - (top ? breath : 0), c, d);
        // Cold rim light down his right side, against the board.
        if (ch === 'o' && (i === GXW - 1 || GX[j][i + 1] === '.') && j > 5) dput(ox + i + 1, oy + j - (top ? breath : 0), j % 2 ? CYAN : CYAN2, d);
      }
      if (!beaten) for (const ex of [ox + 5, ox + 11]) glow(buf, ex, oy + 8 - breath, 3, C('#ff7a30'), 0.35);
      // The blade, planted in the board below him, and its glow.
      for (let z = 0; z < 3; z++) dput(GXX, GXY + 1 + z, z < 2 ? C('#b4f0ff') : C('#6ac8e0'), d);
      glow(buf, GXX, GXY + 2, 5, CYAN, 0.3 + 0.1 * Math.sin(TAU * 15 * u));
      // His shards circling him, in front and behind.
      for (let s = 0; s < 3; s++) {
        const a = TAU * (3 * u + s / 3), x = GXX + Math.cos(a) * 15, y = GXY - 14 + Math.sin(a) * 4;
        shard(x, y, 1, Math.sin(a) > 0);
      }
    }

    function frame(t, cleared, beaten) {
      const u = t / LOOP;
      buf.set(BASE);
      const pulse = 0.5 + 0.5 * Math.sin(TAU * 10 * u);
      for (const s of STARS) {
        const v = Math.sin(TAU * s.k * u + s.p);
        if (v < 0) continue;
        put(buf, s.x, s.y, C(v > 0.85 ? '#ffffff' : s.x % 2 ? '#c8a0ff' : '#a0e8ff'));
        if (s.big && v > 0.7) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const o = (s.y + dy) * W + s.x + dx; if (DEPTH[o] < 0) blend(buf, o, C('#e8d0ff'), 0.6); }
      }
      for (const f of FAR) farFrag(f, u);
      // The spire's core and its orbiting shards (behind the board).
      const core = beaten ? 0.08 : 0.16 + 0.12 * pulse;
      for (let y = 0; y < 60; y++) for (let x = 120; x < 200; x++) { const o = y * W + x, dd = hyp(x - SP.x, (y - 26) * 1.2) / 40; if (dd < 1 && DEPTH[o] < 0 && (1 - dd) * (1 - dd) * core > bay(x, y) * 0.6) blend(buf, o, MAG, 0.3); }
      const orbitPos = ORBIT.map(o => { const a = o.a + TAU * o.k * u; return { x: SP.x + Math.cos(a) * o.r, y: o.y + Math.sin(a) * 6, front: Math.sin(a) > 0, s: o.s }; });
      for (const p of orbitPos) shard(p.x, p.y, p.s, false);
      if (!beaten && frac(6 * u) < 0.07) {
        const a = orbitPos[Math.floor(frac(3 * u) * orbitPos.length)], b = { x: SP.x, y: 28 };
        let x = a.x, y = a.y;
        for (let k = 1; k <= 8; k++) { const nx = a.x + (b.x - a.x) * k / 8 + (hash(k, Math.floor(t * 20)) - 0.5) * 5, ny = a.y + (b.y - a.y) * k / 8 + (hash(k + 9, Math.floor(t * 20)) - 0.5) * 5; for (let q = 0; q <= 4; q++) dput(x + (nx - x) * q / 4, y + (ny - y) * q / 4, C('#f8d0ff'), 0); x = nx; y = ny; }
      }
      // Pulses of light running along the trail, and bridges shimmering.
      for (let p = 0; p < 6; p++) {
        const k = Math.floor(frac(2 * u + p / 6) * (TRAIL_ON.length - 1)), [x, y] = TRAIL_ON[k];
        put(buf, x, y, WHITE); blendAt(buf, x - 1, y, CYAN, 0.6); blendAt(buf, x + 1, y, CYAN, 0.6); blendAt(buf, x, y - 1, CYAN, 0.4);
      }
      for (let k = 0; k < BRIDGE_PIX.length; k++) { const [x, y] = BRIDGE_PIX[k]; if (Math.sin(TAU * 20 * u - x * 0.5) > 0.9) put(buf, x, y - 1, WHITE); }
      // Crumbs of crystal falling from the fragments.
      for (const c of CRUMBS) { const v = frac(c.k * u + c.p); if (v < 0.7) put(buf, c.x, c.y + v * 30, C(v < 0.3 ? '#f0a0ff' : '#8a30c0')); }

      // 1. Crystal Echoes: three echo kings, fading in and out one after another.
      for (let e = 0; e < 3; e++) {
        const a = 0.25 + 0.3 * Math.max(0, Math.sin(TAU * 8 * u - e * 2.1)) + (cleared > 0 ? 0.25 : 0), ex = 26 + e * 14, ey = 122 - (e === 1 ? 4 : 0);
        for (let j = 0; j < 11; j++) { const w = j < 3 ? (j === 0 ? 0 : 2) : j < 5 ? 1 : j < 9 ? 2 : 3; for (let i = -w; i <= w; i++) blendAt(buf, ex + i, ey - 11 + j, C(j < 3 ? '#fff4b0' : Math.abs(i) === w ? '#ffffff' : '#b8e8ff'), a); }
      }
      // 2. Shard coins spinning at the toll.
      for (let k = 0; k < 3; k++) {
        const x = 70 + k * 3 - 1, y = 80 - k * 2 + Math.round(Math.sin(TAU * 12 * u + k) * 1.2), w = Math.abs(Math.cos(TAU * 16 * u + k * 1.3));
        put(buf, x, y, C('#ffd23a')); if (w > 0.4) { put(buf, x - 1, y, C('#fff4b0')); put(buf, x + 1, y, C('#a86c10')); }
      }
      // 3. A glint sliding across the mirror.
      { const g = frac(4 * u) * 30 - 8; for (let y = -MIR.ry + 1; y < MIR.ry; y++) { const x = Math.round(g - y * 0.5); if (Math.abs(x) < MIR.rx * Math.sqrt(1 - sq(y / MIR.ry)) - 0.5) { put(buf, MIR.x + x, MIR.y + y, WHITE); put(buf, MIR.x + x + 1, MIR.y + y, C('#e0faff')); } } }
      // 4. The prism: a beam in, a shivering rainbow out, fog drifting across the fragment.
      for (let k = 0; k < 10; k++) put(buf, PR.x - 14 + k, PR.y - 6 + Math.round(k * 0.2), C('#ffffff'));
      ['#ff5a5a', '#ffb040', '#ffe860', '#6aff8a', '#5ab0ff', '#b060ff'].forEach((c, n) => {
        const sh = Math.sin(TAU * 30 * u + n) > 0.5 ? 1 : 0;
        for (let k = 0; k < 9; k++) dput(PR.x + 3 + k, PR.y - 6 + n * 0.5 + k * (0.2 + n * 0.12) + sh * (k > 5 ? 1 : 0), C(c), 999);
      });
      for (let f = 0; f < 5; f++) {
        const v = frac(2 * u + f / 5), fx = 170 + v * 60, fy = 118 + f * 4 + Math.sin(v * TAU) * 2;
        for (let i = -6; i <= 6; i++) if ((i + f) % 2 === 0) blendAt(buf, fx + i, fy, C('#d8e8ff'), 0.18 * Math.sin(v * Math.PI));
      }
      // 5. The Last Rank breathes; its crown bobs.
      { const br = 0.3 + 0.15 * Math.sin(TAU * 6 * u) + (cleared > 4 ? 0.2 : 0);
        for (const [x0, y0] of RANK) for (let y = y0 + 1; y < y0 + SH; y++) for (let x = x0 + 1; x < x0 + SW - 1; x++) if (onTop(x, y)) blend(buf, y * W + x, C('#ffd23a'), br);
        const cy = 113 + Math.round(Math.sin(TAU * 10 * u) * 1.5), cx = 252;
        for (const [dx, dy] of [[-3, 0], [-1, 0], [1, 0], [3, 0], [-3, 1], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1], [-3, 2], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2], [3, 2]]) put(buf, cx + dx, cy + dy, C(dy === 2 ? '#e0a010' : '#ffd23a'));
        put(buf, cx - 3, cy - 1, C('#fff4b0')); put(buf, cx, cy - 1, C('#5af0ff')); put(buf, cx + 3, cy - 1, C('#fff4b0'));
        glow(buf, cx, cy, 6, C('#ffd23a'), 0.2);
      }
      // 6. Shard Storm: five shards of the Board spinning over the fragment.
      for (let s = 0; s < 5; s++) {
        const a = TAU * (4 * u + s / 5), x = 284 + Math.cos(a) * 12, y = 82 + Math.sin(a) * 4;
        const front = Math.sin(a) > 0;
        for (let j = -2; j <= 2; j++) for (let i = -1; i <= 1; i++) if (Math.abs(i) + Math.abs(j) <= 2) put(buf, x + i, y + j, C((s + (i < 0 ? 0 : 1)) % 2 ? (front ? '#fffaf0' : '#b8aca0') : (front ? '#4a1a5a' : '#2b0d36')));
        put(buf, x, y - 2, CYAN);
      }
      // 7. One Square Away: footprints light one by one toward the edge; the crack flickers.
      PRINTS.forEach(([x, y], k) => {
        const on = frac(5 * u - k / 8), a = on < 0.5 ? 0.9 * (1 - on * 2) : 0.15;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, -1]]) blendAt(buf, x + dx, y + dy, C('#e0faff'), a);
      });
      // The ghost of you, standing one square from the edge, as on the night of the crossing.
      { const a = 0.55 + 0.3 * Math.max(0, Math.sin(TAU * 6 * u)) + (cleared > 6 ? 0.15 : 0), gx = 236, gy = 67;
        for (let j = 0; j < 12; j++) { const w = j < 1 ? 0 : j < 3 ? 1 : j < 4 ? 2 : j < 8 ? 1 : 2; for (let i = -w; i <= w; i++) blendAt(buf, gx + i, gy - 12 + j, C(Math.abs(i) === w ? '#ffffff' : '#a8ecff'), a); }
        glow(buf, gx, gy - 6, 9, C('#c8f4ff'), 0.15 * a);
        for (const dx of [-2, 0, 2]) blendAt(buf, gx + dx, gy - 13, C('#ffffff'), a); }
      for (let k = 0; k < CRACK.length; k++) buf[CRACK[k]] = beaten ? C('#ffd23a') : Math.sin(TAU * 12 * u - k * 0.4) > 0.2 ? WHITE : CYAN;
      glow(buf, EDGE_SQ.x + 11, EDGE_SQ.y + 3, 10, beaten ? C('#ffd23a') : CYAN, 0.18 + 0.08 * Math.sin(TAU * 12 * u));
      if (!beaten && frac(3 * u) < 0.04) glow(buf, EDGE_SQ.x + 8, EDGE_SQ.y + 4, 16, WHITE, 0.35);

      for (let s = 0; s < STOPS.length - 1; s++) if (cleared > s) flag(STOPS[s][0] + 14, STOPS[s][1] - 2, u);
      if (beaten) flag(STOPS[7][0] + 18, STOPS[7][1] - 2, u);
      gmx(u, beaten);
      for (const p of orbitPos) if (p.front && p.y > 30) shard(p.x, p.y, p.s, true);
      // Ether motes rising.
      for (const m of MOTES) {
        const v = frac(m.k * u + m.p), x = m.x + Math.sin(v * 6 + m.w) * 5, y = H - v * 190;
        if (v < 0.9) blendAt(buf, x, y, m.mag ? MAG : CYAN, 0.7 * (1 - v));
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
