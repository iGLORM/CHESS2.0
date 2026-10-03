// The app icon: a golden queen on the last floating piece of the Great Board, at dusk.
//
// 128x128, exported by `node scripts/live-scene.js icon app_icon` at 2x (icon.png),
// 4x (icon_512.png) and 8x (icon_1024.png), plus icon.ico, so every scene pixel stays a
// clean square. The tile is a rounded square with transparent corners and a soft drop
// shadow (opaque: false). Warm gold key light from the upper left on the queen, a cold
// mint rim (the game's accent) on her right; violet dusk sky with a rose horizon.
// Her crown has ball-tipped points and a ball finial: never a cross on a king or bishop
// (AGENTS.md, Art Rules).
// Moves: stars twinkle, mint shards and broken tiles bob, a shine sweeps down the queen,
// her finial glints, the crack in the board pulses, motes rise from the board.
LiveScenes.register({
  id: 'app_icon',
  width: 128,
  height: 128,
  loop: 24,
  still: 8,
  opaque: false,
  create() {
    const W = 128, H = 128, LOOP = 24, CX = 64;
    const { TAU, C, clamp, sq, frac, bay, ramp, hash, noise1, blend } = PixelKit;
    const { over } = PixelKit.surface(W, H);
    let buf = null;

    // ---------- the tile: a rounded square with pixel-stepped corners ----------
    const T0 = 10, T1 = 118, R = 22;                 // tile spans [T0, T1) in both axes
    const MID = (T0 + T1) / 2, HALF = (T1 - T0) / 2;
    // Signed distance to the tile's edge (negative inside).
    function sdf(px, py, oy = 0) {
      const qx = Math.abs(px - MID) - (HALF - R), qy = Math.abs(py - MID - oy) - (HALF - R);
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - R;
    }
    const DEPTH = new Float32Array(W * H);           // pixels inside the edge (<= 0 outside)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) DEPTH[y * W + x] = -sdf(x + 0.5, y + 0.5);
    const INNER = i => DEPTH[i] >= 2.5;              // where the picture is painted

    const BASE = new Uint32Array(W * H);             // everything that never moves
    const PIECE = new Uint32Array(W * H);            // the queen, over the board
    const clipPut = (b, x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H && INNER(y * W + x)) b[y * W + x] = c; };
    const clipBlend = (b, x, y, c, a) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H && INNER(y * W + x)) blend(b, y * W + x, c, a); };

    // ---------- sky: indigo dusk, a violet glow behind the queen, rose on the horizon ----------
    const SKY = ['#0c0820', '#150f34', '#1f164a', '#2c1c60', '#3c2274', '#522a84', '#6c328e', '#8a3c94',
      '#aa4a92', '#c85c8a', '#e27a7c', '#f29c6c', '#fac27a'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - CX, (y - 50) * 0.9);
      const t = (y - T0) / 84 * 0.86 + 0.2 * Math.exp(-sq(d / 30)) + 0.1 * Math.exp(-sq(d / 12));
      BASE[y * W + x] = ramp(SKY, t, x, y);
    }
    const MINT = '#9ff0d0';

    // ---------- the board: a floating chunk of the Great Board ----------
    const BY0 = 76, BY1 = 95;                        // top face, back and front edges
    const bL = y => 29 - 12 * (y - BY0) / (BY1 - BY0), bR = y => 99 + 12 * (y - BY0) / (BY1 - BY0);
    const COLS = 6, ROWS = 4;
    const LIGHT_T = ['#fff0cc', '#f2d8a8', '#dcbc8a', '#c29c72'].map(C);
    const DARK_T = ['#7c4c8a', '#643a78', '#4c2a62', '#3a1e4e'].map(C);
    const BOARD = new Uint8Array(W * H);             // 1 = top face, 2 = front face, 3 = rock
    const SHADE = new Uint32Array(W * H);            // each top-face pixel's own shadow tone
    for (let y = BY0; y <= BY1; y++) {
      const v = (y - BY0) / (BY1 - BY0), row = Math.min(ROWS - 1, Math.floor(Math.pow(v, 0.8) * ROWS));
      for (let x = Math.ceil(bL(y)); x <= Math.floor(bR(y)); x++) {
        const uu = (x - bL(y)) / (bR(y) - bL(y)), col = Math.min(COLS - 1, Math.floor(uu * COLS));
        // Nearer is darker; the left (towards the light) a little brighter.
        const tone = 0.1 + v * 0.62 + (uu - 0.5) * 0.35;
        const pal = (col + row) % 2 ? DARK_T : LIGHT_T;
        BASE[y * W + x] = y === BY0 ? C((col % 2) ? '#c07aa0' : '#ffe0b0') : ramp(pal, tone, x, y);
        BOARD[y * W + x] = 1;
        SHADE[y * W + x] = pal[3];
      }
    }
    // Front face: the board's wooden frame, lit from the left.
    const FRAME = ['#b0704a', '#8a4e36', '#633428', '#44201e'].map(C);
    const FY0 = BY1 + 1, FY1 = BY1 + 6;
    for (let y = FY0; y <= FY1; y++) for (let x = Math.ceil(bL(BY1)); x <= Math.floor(bR(BY1)); x++) {
      const uu = (x - bL(BY1)) / (bR(BY1) - bL(BY1));
      BASE[y * W + x] = y === FY0 ? C('#d8925a') : ramp(FRAME, (y - FY0) / 4 * 0.6 + uu * 0.45, x, y);
      BOARD[y * W + x] = 2;
    }
    // "2.0" engraved in gold on the frame, under the queen.
    const GLYPHS = { '2': ['111', '001', '111', '100', '111'], '.': ['0', '0', '0', '0', '1'], '0': ['111', '101', '101', '101', '111'] };
    let gx = CX - 4;
    for (const ch of '2.0') {
      const g = GLYPHS[ch];
      g.forEach((row, j) => [...row].forEach((b, i) => {
        if (b !== '1') return;
        const x = gx + i, y = FY0 + 1 + j;
        BASE[y * W + x] = C(j < 2 ? '#fff2b8' : '#ffd862');
        if (BASE[(y + 1) * W + x] !== C('#ffd862') && BOARD[(y + 1) * W + x] === 2) BASE[(y + 1) * W + x] = C('#3a1a18');
      }));
      gx += g[0].length + 1;
    }
    // The broken underside: rock hanging to a ragged point, with a glowing crack.
    const ROCK = ['#4a2838', '#3a1e30', '#2a1426', '#1c0c1c'].map(C);
    const rockBottom = x => FY1 + 1 + 11 * (1 - sq((x - 62) / 47)) + 2.4 * (noise1(x / 3.2, 7) - 0.5) + (x % 5 === 0 ? 1 : 0);
    for (let x = Math.ceil(bL(BY1)) + 2; x <= Math.floor(bR(BY1)) - 2; x++) {
      const bot = Math.round(rockBottom(x));
      for (let y = FY1 + 1; y <= bot; y++) {
        const uu = (x - bL(BY1)) / (bR(BY1) - bL(BY1));
        BASE[y * W + x] = ramp(ROCK, (y - FY1) / 12 * 0.7 + uu * 0.35, x, y);
        BOARD[y * W + x] = 3;
      }
    }
    // The crack zig-zags down from the frame into the rock, with one small branch.
    const CRACK = [];
    for (const [x, y] of [[43, 97], [43, 98], [44, 99], [44, 100], [43, 101], [42, 102], [42, 103], [43, 104],
      [44, 105], [44, 106], [43, 107], [45, 101], [46, 102], [47, 102]]) if (BOARD[y * W + x] >= 2) CRACK.push(y * W + x);

    // ---------- the queen ----------
    const GOLD = ['#5a2e10', '#8e4e16', '#c47e22', '#eab038', '#ffd862', '#fff2b8'].map(C);
    const RIM = C('#b6f0c8'), LINE = C('#240a1c');
    const PM = new Uint8Array(W * H), PB = new Int8Array(W * H).fill(-1);
    const paint = (i, b) => { PIECE[i] = b === 6 ? RIM : GOLD[b]; PM[i] = 1; PB[i] = b; };
    // Half-width per row, like a lathe: [y0, y1, w0, w1, curve, lip]. lip = the top row
    // faces up (catches light); a row under a wider one is in the lip's shadow.
    const PROFILE = [
      [43, 45, 11.5, 11.5, 1, 1],      // band under the crown
      [46, 48, 7.5, 7, 1, 0],          // neck
      [49, 69, 7, 12.5, 1.8, 0],       // body
      [70, 73, 15.5, 15.5, 1, 1],      // collar
      [74, 75, 12.5, 12.5, 1, 0],
      [76, 83, 12.5, 19.5, 1.6, 0],    // base flare
      [84, 89, 21, 21, 1, 1],          // plinth
      [90, 91, 20, 20, 1, 0],
    ];
    const HW = new Float32Array(H), LIP = new Uint8Array(H);
    for (const [y0, y1, w0, w1, k, lip] of PROFILE) for (let y = y0; y <= y1; y++) {
      HW[y] = w0 + (w1 - w0) * Math.pow(y1 === y0 ? 0 : (y - y0) / (y1 - y0), k);
      if (lip && y === y0) LIP[y] = 1;
    }
    const lightAt = (nx, lip, under) => {
      let L = 0.56 - 0.58 * nx - 0.12 * nx * nx;
      if (lip) L += 0.28;
      if (under) L -= 0.34;
      if (nx > -0.62 && nx < -0.38 && !under) L += 0.22;     // the long specular stripe
      return clamp(Math.floor(L * 5 + 0.5), 0, 5);
    };
    for (let y = 0; y < H; y++) {
      const w = HW[y]; if (!w) continue;
      const under = HW[y - 1] > w + 1.5;             // just below a wider lip
      for (let x = Math.floor(CX - w); x <= Math.ceil(CX + w) - 1; x++) {
        const nx = (x + 0.5 - CX) / w; if (Math.abs(nx) > 1) continue;
        paint(y * W + x, lightAt(nx, LIP[y], under));
      }
    }
    // The crown: a cup flaring up to five points with deep gaps between them.
    const CW = y => 7 + 7.8 * Math.pow((42 - y) / 18, 0.9);          // half-width, y 24..42
    const TOPY = nx => 24 + 7 * (1 - Math.cos(TAU * nx)) / 2;         // points at nx = 0, +-0.5, +-1
    for (let y = 24; y <= 42; y++) {
      const w = CW(y);
      for (let x = Math.floor(CX - w); x <= Math.ceil(CX + w) - 1; x++) {
        const nx = (x + 0.5 - CX) / w; if (Math.abs(nx) > 1 || y < TOPY(nx)) continue;
        paint(y * W + x, lightAt(nx, y < TOPY(nx) + 1, 0));
      }
    }
    // Round, lit balls on the points' tips and the finial on top.
    const ball = (bx, by, r) => {
      for (let y = Math.floor(by - r); y <= by + r; y++) for (let x = Math.floor(bx - r); x <= bx + r; x++) {
        const nx = (x + 0.5 - bx) / r, ny = (y + 0.5 - by) / r, d = Math.hypot(nx, ny);
        if (d <= 1) paint(y * W + x, clamp(Math.floor((0.95 - 0.45 * d - 0.35 * ny - 0.3 * nx) * 5.6), 0, 5));
      }
    };
    for (const f of [-0.93, -0.5, 0.5, 0.93]) ball(CX + f * CW(24), 22.6, 2);
    ball(CX, 19.4, 3.8);
    // A 1 px cool rim down the right edge, the sky's light.
    for (let y = 0; y < H; y++) {
      if (HW[y] && HW[y - 1] > HW[y] + 1.5) continue;
      for (let x = W - 1; x > CX; x--) if (PM[y * W + x]) { paint(y * W + x, 6); break; }
    }
    // Dark outline round the whole queen, so she reads at 16 px.
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; if (PM[i]) continue;
      if (PM[i - 1] || PM[i + 1] || PM[i - W] || PM[i + W] || PM[i - W - 1] || PM[i - W + 1] || PM[i + W - 1] || PM[i + W + 1]) PIECE[i] = LINE;
    }
    // Her shadow on the board, falling right, away from the light.
    for (let y = 88; y <= 96; y++) for (let x = 50; x <= 104; x++) {
      const e = sq((x - 74) / 24) + sq((y - 92.5) / 3.6);
      if (e < 1 && BOARD[y * W + x] === 1 && (e < 0.6 || e < bay(x, y) + 0.3)) BASE[y * W + x] = SHADE[y * W + x];
    }
    over(BASE, PIECE);

    // ---------- the tile's frame and drop shadow ----------
    const EDGE = C('#0a0512'), BEV_L = C('#8a64c8'), BEV_D = C('#1c0e30');
    const blendC = (a, b, t) => { const tmp = new Uint32Array([a]); blend(tmp, 0, b, t); return tmp[0]; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, d = DEPTH[i];
      if (d <= 0) {
        // Outside: transparent, apart from a soft shadow under the tile.
        const s = -sdf(x + 0.5, y + 0.5, 3), a = clamp((s + 3) / 5) * 0.45;
        BASE[i] = a > 0.02 ? ((Math.round(a * 255) << 24) | 0x0a0410) >>> 0 : 0;
        continue;
      }
      if (d < 1.2) { BASE[i] = EDGE; continue; }
      if (d < 2.5) {
        // Bevel: lit along the top and left, dark along the bottom and right.
        const nx = x + 0.5 - MID, ny = y + 0.5 - MID;
        BASE[i] = (nx + ny * 1.4 < -8) ? BEV_L : (nx + ny * 1.4 > 8 ? BEV_D : blendC(BASE[i], BEV_L, 0.25));
      }
    }

    // ---------- animated parts ----------
    const STARS = [];
    for (let i = 0; STARS.length < 22 && i < 400; i++) {
      const x = 16 + Math.floor(hash(i, 1) * 96), y = 15 + Math.floor(hash(i, 2) * 50);
      if (Math.abs(x - CX) < 24 && y > 10) continue;                 // keep the queen clear
      if (STARS.some(s => Math.abs(s.x - x) + Math.abs(s.y - y) < 9)) continue;
      STARS.push({ x, y, k: 3 + (hash(i, 3) * 6 | 0), p: hash(i, 4) * TAU, big: hash(i, 5) > 0.72 });
    }
    const STAR = C('#fff6e0'), STAR_D = C('#b8a8e8');
    // Mint crystal shards and broken tiles drifting around the board.
    const SHARD = ['#e8fff4', '#9ff0d0', '#4ab8a0', '#1e6a6a'].map(C);
    const SHARDS = [{ x: 22, y: 52, s: 1, k: 2, p: 0.3 }, { x: 105, y: 42, s: 1.3, k: 3, p: 2.1 }, { x: 99, y: 70, s: 0.8, k: 2, p: 4.4 }];
    const TILES = [{ x: 14, y: 82, k: 2, p: 1.2, light: 1 }, { x: 99, y: 108, k: 3, p: 3.7, light: 0 }];
    const MOTES = Array.from({ length: 9 }, (_, i) => ({ x: 30 + hash(i, 11) * 68, k: 1 + (i % 3), p: hash(i, 12) }));
    // Queen pixels for the shine.
    const SHINE = [];
    for (let i = 0; i < W * H; i++) if (PM[i] && PB[i] >= 0 && PB[i] < 6) SHINE.push(i);

    function shard(x, y, s) {
      // A tall diamond, lit on its left facet.
      const hh = Math.round(5 * s), ww = Math.max(1, Math.round(2 * s));
      for (let j = -hh; j <= hh; j++) {
        const w = Math.round(ww * (1 - Math.abs(j) / (hh + 1)) + 0.4);
        for (let i = -w; i <= w; i++) clipPut(buf, x + i, y + j, i < 0 ? SHARD[1] : i === 0 ? SHARD[j < 0 ? 0 : 1] : SHARD[2]);
        clipPut(buf, x - w - 1, y + j, SHARD[3]); clipPut(buf, x + w + 1, y + j, SHARD[3]);
      }
      clipPut(buf, x, y - hh - 1, SHARD[3]); clipPut(buf, x, y + hh + 1, SHARD[3]);
    }
    function tile(x, y, light) {
      // A lost board square: top face and a sliver of frame.
      const top = light ? LIGHT_T[1] : DARK_T[1], edge = light ? LIGHT_T[0] : DARK_T[0];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 7; i++) clipPut(buf, x + i + (2 - j), y + j, j === 0 ? edge : top);
      for (let i = 0; i < 7; i++) clipPut(buf, x + i, y + 3, FRAME[1]);
      for (let i = 1; i < 6; i++) clipPut(buf, x + i, y + 4, ROCK[2]);
    }

    function frame(t) {
      const u = t / LOOP;
      buf.set(BASE);
      for (const s of STARS) {
        const tw = Math.sin(TAU * s.k * u + s.p);
        if (tw < -0.35) continue;
        clipPut(buf, s.x, s.y, tw > 0.2 ? STAR : STAR_D);
        if (s.big && tw > 0.55) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) clipBlend(buf, s.x + dx, s.y + dy, STAR, 0.5);
      }
      for (const s of SHARDS) shard(s.x, Math.round(s.y + 1.6 * Math.sin(TAU * s.k * u + s.p)), s.s);
      for (const b of TILES) tile(b.x, Math.round(b.y + 1.2 * Math.sin(TAU * b.k * u + b.p)), b.light);
      // Motes rise off the board and fade.
      for (const m of MOTES) {
        const v = frac(m.k * u + m.p), y = 82 - v * 34, x = m.x + 2 * Math.sin(TAU * (m.k * u * 3 + m.p));
        const i = Math.round(y) * W + Math.round(x);
        if (!PM[i] && v < 0.85) clipBlend(buf, x, y, v < 0.4 ? C('#fff0c0') : C(MINT), 0.75 * (1 - v));
      }
      // The crack glows and dims.
      const glowA = 0.55 + 0.45 * Math.sin(TAU * 4 * u);
      for (const i of CRACK) blend(buf, i, C(MINT), glowA);
      // A shine sweeps down the queen twice a loop.
      const ph = frac(2 * u);
      if (ph < 0.3) {
        const p = -10 + ph / 0.3 * 150;
        for (const i of SHINE) {
          const x = i % W, y = (i / W) | 0;
          if (Math.abs(y + (x - CX) * 0.5 - p) < 2.2) buf[i] = GOLD[Math.min(5, PB[i] + 2)];
        }
      }
      // The finial glints just after the shine passes: a small diagonal sparkle.
      const g = frac(2 * u) - 0.34;
      if (g > 0 && g < 0.12) {
        const r = Math.round(3 * Math.sin(Math.PI * g / 0.12));
        clipBlend(buf, 62, 17, C('#fffbe8'), 1);
        for (let k = 1; k <= r; k++) {
          const a = 1 - k / (r + 1);
          for (const [dx, dy] of [[k, k], [-k, k], [k, -k], [-k, -k]]) clipBlend(buf, 62 + dx, 17 + dy, C('#fffbe8'), a);
        }
      }
    }

    return (t, out) => { buf = out; frame(t); };
  },
});
