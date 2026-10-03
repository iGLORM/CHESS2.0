// The Ascension: the backdrop of Grandmaster X's last stand (story scene 'ascension').
//
// The void of Soulbound Pixel, just after his third defeat. His crystal spire hangs in
// the middle, cracked from crown to base, his crowned shape dark inside it. Around the
// edges, one small emblem per guardian world glows in its colour. The story drives it
// with scene state:
//   charge 0..1  he takes the powers back: a stream of light leaves each emblem in turn
//                (the emblem drains to grey), pours along a curve into the crystal, and the
//                crystal fills with dithered red from the core out until it burns.
//   board  0..1  the ground drops away: the cracked Great Board dithers in under him.
// Cold violet and cyan ether against the warm stolen lights and the red of his rage.
// Moves: the crystal bobs and shimmers, its crack flickers, eyes glow, streams flow with
// sparks, shockwaves ring out while he absorbs, lightning crackles and red rays turn
// once he is full, board fragments drift, stars twinkle, motes of ether rise.
// No cross on the king: his crown has three points and a ball.
LiveScenes.register({
  id: 'ascension',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, C, clamp, sq, frac, bay, ramp, hash, noise2, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt } = K;
    let buf = null;

    const CX = 160, CY = 66;                         // the crystal's core

    // ---------- the void: deep space, violet and cyan nebulae, a glow behind him ----------
    const SPACE = new Uint32Array(W * H);
    const SKY = ['#040308', '#0a0716', '#150b28', '#24103c', '#3a1452'].map(C);
    const NEB = ['#040308', '#071420', '#0c2434', '#14384a'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const m = noise2(x / 56, y / 38, 21) * 0.7 + noise2(x / 18, y / 13, 22) * 0.3;
      const c = noise2(x / 46 + 7, y / 30, 23) * 0.7 + noise2(x / 15, y / 11, 24) * 0.3;
      const core = Math.exp(-sq((x - CX) / 80) - sq((y - CY) / 56));
      const tm = clamp((m - 0.45) * 2) + core * 0.45, tc = clamp((c - 0.52) * 2.4) * (1 - core);
      SPACE[y * W + x] = tc > tm ? ramp(NEB, tc, x, y) : ramp(SKY, tm, x, y);
    }
    const STARS = Array.from({ length: 70 }, (_, i) => ({
      x: hash(i, 31) * W | 0, y: hash(i, 32) * H | 0, k: 10 + (hash(i, 33) * 40 | 0), p: hash(i, 34) * TAU, big: hash(i, 35) > 0.85,
    }));
    const STAR = C('#f4ecff'), STAR2 = C('#8ad8ff');

    // ---------- the crystal: a faceted spire, his shape inside, a crack ----------
    // Half-width of the spire at row dy (relative to the core).
    const hw = dy => dy < -30 ? 20 * (dy + 48) / 18 : dy <= 26 ? 20 - (dy + 30) * 2 / 56 : 18 * (48 - dy) / 22;
    const inside = (dx, dy) => dy >= -48 && dy <= 48 && Math.abs(dx) <= hw(dy);
    // His crown: a band and three tapering points, a ball on each (no cross).
    const crown = (dx, dy) => {
      if (dy >= -25 && dy <= -22 && Math.abs(dx) <= 7) return true;                     // band
      for (const [px, top] of [[-6, -31], [0, -34], [6, -31]]) {
        if (dy >= top && dy < -25 && Math.abs(dx - px) <= (dy - top) / (-25 - top) * 2.2 + 0.4) return true;
        if (sq(dx - px) + sq(dy - top + 1.5) <= 1.6) return true;                        // the balls
      }
      return false;
    };
    // His figure under it: head, raised arms, robe.
    const figure = (dx, dy) => {
      if (sq(dx) + sq((dy + 16) * 1.1) <= 30) return true;                                // head
      for (const s of [-1, 1]) {                                                           // arms, raised
        const t = clamp(((dx * s) - 5) / 11);
        const ax = 5 + t * 11, ay = -8 - t * 14;
        if (dx * s >= 4 && Math.abs(dx * s - ax) <= 1.5 && Math.abs(dy - ay) <= 1.6) return true;
      }
      if (dy >= -13 && dy <= 40 && Math.abs(dx) <= 5 + (dy + 13) * 0.34) return true;     // robe
      return false;
    };
    // The crack, from crown to base, with three branches (deterministic walk).
    const CRACK = new Set();
    let cx0 = 1;
    for (let dy = -47; dy <= 47; dy++) {
      if (dy % 5 === 0) cx0 = clamp(cx0 + Math.round((hash(dy, 41) - 0.5) * 5), -8, 8);
      CRACK.add(cx0 + ',' + dy);
      if (hash(dy, 42) > 0.6) CRACK.add((cx0 + 1) + ',' + dy);
    }
    for (const [by, dir, len] of [[-22, -1, 9], [4, 1, 11], [24, -1, 8]]) {
      let bx = 0;
      for (const p of CRACK) { const [px, py] = p.split(',').map(Number); if (py === by) { bx = px; break; } }
      for (let s = 1; s <= len; s++) CRACK.add((bx + dir * s) + ',' + (by + Math.round(s * 0.6 + (hash(s, by) > 0.5 ? 1 : 0))));
    }
    // Two palettes: the violet crystal and the burning one. Light (0) to dark (4).
    const VIO = ['#f6c4ff', '#d468ee', '#9a34c4', '#5a1a80', '#2c0a44'].map(C);
    const RED = ['#ffe0a8', '#ff7a3a', '#d42630', '#82102a', '#3e0616'].map(C);
    const RIM_V = C('#7af0ff'), RIM_R = C('#ffb060');
    const CRK_V = [C('#ffffff'), C('#b8f8ff')], CRK_R = [C('#fff4d0'), C('#ffcc60')];
    const EYE_V = C('#9af4ff'), EYE_R = C('#fff0a0');
    const CROWN = [C('#ffe490'), C('#d8a440'), C('#8a5a20')];
    const CRYS = [];   // { dx, dy, kind (0 face, 1 rim, 2 figure, 3 crack, 4 eye), tone, key, d }
    for (let dy = -48; dy <= 48; dy++) for (let dx = -21; dx <= 21; dx++) {
      if (!inside(dx, dy)) continue;
      const x = CX + dx, y = CY + dy;
      const rim = !inside(dx - 1, dy) || !inside(dx + 1, dy) || !inside(dx, dy - 1) || !inside(dx, dy + 1);
      let tone;
      if (dy < -30) tone = dx < 0 ? 0 : 1;
      else if (dy > 26) tone = dx < 0 ? 2 : 3;
      else { const f = dx / hw(dy); tone = f < -0.5 ? 0 : f < 0 ? 1 : f < 0.5 ? 2 : 3; }
      if (dy > -30 && (dy + 30) / 56 * 0.9 > bay(x, y)) tone = Math.min(4, tone + 1);   // darker toward the base
      const d = Math.hypot(dx, dy * 0.7) / 40;
      let kind = rim ? 1 : 0;
      if (!rim && crown(dx, dy)) kind = 5;
      else if (!rim && figure(dx, dy)) { kind = 2; tone = 4; }
      if ((dx === -2 || dx === 2) && dy === -17) kind = 4;
      if (!rim && kind !== 5 && CRACK.has(dx + ',' + dy)) kind = 3;
      // The red fills from the core outward, dithered.
      CRYS.push({ dx, dy, kind, tone, key: clamp(d * 0.7 + bay(x, y) * 0.3), d });
    }
    // The soft light round him.
    const AURA = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - CX, (y - CY) * 0.8) / 78;
      if (d < 1) AURA.push(y * W + x, (1 - d) * (1 - d));
    }
    const AURA_V = C('#b040e0'), AURA_R = C('#ff3a30');
    // Rays once he is full: angle bin and falloff per pixel near him, built once.
    const RAY_I = [], RAY_B = [], RAY_F = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = x - CX, dy = y - CY, d = Math.hypot(dx, dy);
      if (d < 24 || d > 150) continue;
      RAY_I.push(y * W + x);
      RAY_B.push(((Math.atan2(dy, dx) + Math.PI) / TAU * 360 | 0) % 360);
      RAY_F.push(1 - d / 150);
    }
    const RAYS = new Float32Array(360), RAY_C = C('#ff4a2a');

    // ---------- the worlds' emblems and the paths their light takes ----------
    const ICONS = {
      pyramid: ['....#....', '...###...', '...##o#..', '..###o#..', '..####o#.', '.#####o#.', '.######o#', '#########'],
      tower: ['#.#.#.#..', '#######..', '.#####...', '.##o##...', '.##o##...', '.#####...', '.##.##...', '#######..'],
      lantern: ['...#.....', '..###....', '.#ooo#...', '.#ooo#...', '.#ooo#...', '..###....', '...#.....', '..###....'],
      dome: ['....#....', '...###...', '..#####..', '.##o####.', '.##o####.', '#########', '#.#.#.#.#', '#########'],
      gear: ['.#.#.#...', '#######..', '.##.##...', '###.###..', '.##.##...', '#######..', '.#.#.#...', '.........'],
      book: ['.........', '##.......', '#o##.##..', '#oo#.#o#.', '#oo#.#o#.', '#oo#.#oo#', '#########', '.........'],
      cactus: ['...#.....', '...##....', '#..##....', '##.##..#.', '.####.##.', '...#####.', '...##....', '..####...'],
      hourglass: ['#######..', '.#ooo#...', '..#o#....', '...#.....', '..#.#....', '.#ooo#...', '#######..', '.........'],
    };
    const WORLDS = [
      { icon: 'pyramid', col: '#f3c45a', x: 20, y: 18, bend: 30 },     // the Slanted Sands
      { icon: 'tower', col: '#ff8a3a', x: 10, y: 70, bend: -26 },      // the Iron Keep
      { icon: 'lantern', col: '#8fe0c4', x: 26, y: 126, bend: 34 },    // the Misty Moors
      { icon: 'dome', col: '#ff6ad5', x: 98, y: 8, bend: -30 },        // the Royal Palace
      { icon: 'gear', col: '#ffb347', x: 222, y: 8, bend: 30 },        // the Clockwork Citadel
      { icon: 'book', col: '#8ab4ff', x: 298, y: 18, bend: -30 },      // the Grand Library
      { icon: 'cactus', col: '#e0703f', x: 308, y: 70, bend: 26 },     // Forked Gulch
      { icon: 'hourglass', col: '#b070ff', x: 292, y: 126, bend: -34 }, // the Obsidian Court
    ].map((w, i) => {
      const c = C(w.col), grey = C('#4a4458'), greyH = C('#6a6478'), hi = C('#fff6e0');
      const px = [];
      ICONS[w.icon].forEach((row, j) => [...row].forEach((ch, k) => { if (ch !== '.') px.push(k - 4, j - 4, ch === 'o'); }));
      // The stream: a quadratic curve from the emblem into the core, sampled once.
      const ex = w.x, ey = w.y, mx = (ex + CX) / 2, my = (ey + CY) / 2;
      const len = Math.hypot(CX - ex, CY - ey), nx = -(CY - ey) / len, ny = (CX - ex) / len;
      const kx = mx + nx * w.bend, ky = my + ny * w.bend;
      const N = 120, path = new Float32Array(N * 2);
      for (let s = 0; s < N; s++) {
        const v = s / (N - 1), a = 1 - v;
        path[s * 2] = a * a * ex + 2 * a * v * kx + v * v * CX;
        path[s * 2 + 1] = a * a * ey + 2 * a * v * ky + v * v * CY;
      }
      return { ...w, c, grey, greyH, hi, px, path, N, start: i * 0.075, seed: hash(i, 51) };
    });
    const HALO = [];
    for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) {
      const d = Math.hypot(dx, dy) / 9;
      if (d < 1) HALO.push(dx, dy, (1 - d) * (1 - d));
    }

    // ---------- floating board fragments ----------
    function fragment(cells, seed) {
      const tw = 5, th = 3, skew = 2, thick = 3;
      const maxI = Math.max(...cells.map(c => c[0])) + 1, maxJ = Math.max(...cells.map(c => c[1])) + 1;
      const w = maxI * tw + maxJ * skew + 2, h = maxJ * th + thick + 2, px = new Uint32Array(w * h);
      const set = new Set(cells.map(([i, j]) => i + ',' + j));
      const at = (x, y) => { const j = Math.floor(y / th), i = Math.floor((x - (y / th) * skew) / tw); return set.has(i + ',' + j) ? [i, j] : null; };
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const top = at(x, y);
        if (top) { px[y * w + x] = C((top[0] + top[1] + seed) % 2 ? '#3a1450' : '#d8cfe0'); continue; }
        for (let d = 1; d <= thick; d++) if (y - d >= 0 && at(x, y - d)) { px[y * w + x] = C(d === 1 ? '#7af0ff' : d === thick ? '#140820' : '#4a2066'); break; }
      }
      return { w, h, px };
    }
    const FRAGS = [
      { s: fragment([[0, 0], [1, 0], [0, 1]], 0), x: 58, y: 150, k: 3, a: 3 },
      { s: fragment([[0, 0], [1, 0], [2, 0], [1, 1]], 1), x: 236, y: 154, k: 2, a: 4 },
      { s: fragment([[0, 0], [1, 1], [0, 1]], 1), x: 118, y: 30, k: 4, a: 2 },
      { s: fragment([[0, 0], [1, 0]], 0), x: 214, y: 40, k: 3, a: 3 },
      { s: fragment([[0, 0], [0, 1], [1, 1], [2, 1]], 0), x: 262, y: 100, k: 2, a: 3 },
      { s: fragment([[0, 0], [1, 0], [1, 1]], 1), x: 62, y: 96, k: 4, a: 2 },
    ];

    // ---------- the Great Board under him (revealed by state.board) ----------
    // A floor in perspective: 8x8 squares from Z 10 (near) to 90 (far), world square 10.
    const FLOOR = new Uint32Array(W * H), FLOOR_I = [], FLOOR_K = [];
    const HZ = 104, FAR = 90, NEAR = 10;
    const BLT = ['#f2eadc', '#d8cbb8', '#a89a90'].map(C), BDK = ['#4a1a62', '#34104a', '#200a30'].map(C);
    const GOLD = C('#f0c060'), GOLD2 = C('#9a6a28'), CRK = C('#120618'), CRK2 = C('#6ae8ff');
    for (let y = HZ + 9; y < H; y++) for (let x = 0; x < W; x++) {
      const Z = 900 / (y - HZ), X = (x - CX) * Z / 90;
      if (Z > FAR + 0.6 || Math.abs(X) > 40.6) continue;
      const i = Math.floor((X + 40) / 10), j = Math.floor((Z - NEAR) / 10);
      if (j < 0 || i < 0 || i > 7) continue;
      const edgeSq = i === 0 || i === 7 || j === 7;
      if (edgeSq && hash(i, j + 61) < 0.3) continue;                      // broken-off squares
      let c;
      const fx = (X + 40) / 10 - i, fz = (Z - NEAR) / 10 - j;
      const fade = clamp((Z - 30) / 70);                                   // far squares fade into the dark
      if (Math.abs(X) > 39.4 || Z > FAR - 0.4) c = (y & 1) ? GOLD2 : GOLD;
      else if ((i + j) % 2) c = ramp(BDK, fade, x, y);
      else c = ramp(BLT, fade + (fx + fz < 0.2 ? -0.3 : 0), x, y);
      const cr = Math.abs(noise2(X / 13, Z / 13, 71) - 0.5) / (Z / 90);   // thin at any depth
      if (cr < 0.03) c = cr < 0.012 ? CRK2 : CRK;
      FLOOR[y * W + x] = c;
      FLOOR_I.push(y * W + x);
      FLOOR_K.push(clamp(Math.hypot((x - CX) / 160, (y - 150) / 50) * 0.6 + bay(x, y) * 0.4));
    }
    // Under him, the board catches his light.
    const POOL = [];
    for (let y = HZ + 9; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - CX) / 70, (y - 128) / 16);
      if (d < 1 && FLOOR[y * W + x]) POOL.push(y * W + x, (1 - d) * 0.45);
    }

    // ---------- motes of ether ----------
    const MOTES = Array.from({ length: 40 }, (_, i) => ({
      x: hash(i, 81) * W, k: 2 + (hash(i, 82) * 3 | 0), p: hash(i, 83), w: hash(i, 84) * TAU,
    }));
    const MOTE = C('#c8f4ff');

    function frame(t, st) {
      const u = t / LOOP;
      const charge = clamp(+st.charge || 0), board = clamp(+st.board || 0);
      buf.set(SPACE);

      // Stars.
      for (const s of STARS) {
        const v = Math.sin(TAU * s.k * u + s.p);
        if (v > 0.1) put(buf, s.x, s.y, v > 0.8 && s.big ? STAR : STAR2);
        if (s.big && v > 0.85) { blendAt(buf, s.x - 1, s.y, STAR, 0.4); blendAt(buf, s.x + 1, s.y, STAR, 0.4); blendAt(buf, s.x, s.y - 1, STAR, 0.4); blendAt(buf, s.x, s.y + 1, STAR, 0.4); }
      }

      // Red rays turning behind him once he is full.
      const rays = clamp((charge - 0.8) / 0.2);
      if (rays > 0) {
        for (let b = 0; b < 360; b++) RAYS[b] = Math.sin(b / 360 * TAU * 7 + TAU * 3 * u) * 0.5 + 0.5;
        for (let n = 0; n < RAY_I.length; n++) {
          const i = RAY_I[n], v = RAYS[RAY_B[n]] * RAY_F[n] * rays;
          if (v > 0.25) blend(buf, i, RAY_C, (v - 0.25) * 0.4);
        }
      }

      // His light: violet, turning red as he fills, breathing.
      const breathe = 0.75 + 0.25 * Math.sin(TAU * 20 * u);
      const auraC = charge > 0.5 ? AURA_R : AURA_V, auraA = (0.32 + charge * 0.3) * breathe;
      for (let n = 0; n < AURA.length; n += 2) blend(buf, AURA[n], auraC, AURA[n + 1] * auraA);

      // The Great Board appears under him.
      if (board > 0) {
        for (let n = 0; n < FLOOR_I.length; n++) if (FLOOR_K[n] < board || board >= 1) buf[FLOOR_I[n]] = FLOOR[FLOOR_I[n]];
        const pc = charge > 0.5 ? AURA_R : AURA_V;
        for (let n = 0; n < POOL.length; n += 2) if (buf[POOL[n]] === FLOOR[POOL[n]]) blend(buf, POOL[n], pc, POOL[n + 1] * breathe * board);
      }

      // Board fragments drift (pulled a little toward him as he absorbs).
      for (const f of FRAGS) {
        const pull = charge * 0.12;
        const fx = f.x + (CX - f.x) * pull + f.a * Math.sin(TAU * f.k * u + f.x);
        const fy = f.y + (CY - f.y) * pull + f.a * Math.cos(TAU * f.k * u + f.y);
        K.blit(buf, f.s, fx - f.s.w / 2, fy - f.s.h / 2);
      }

      // Shockwaves while he absorbs.
      const act = clamp(charge * 4) * (1 - clamp((charge - 0.9) / 0.1) * 0.6);
      if (act > 0) {
        // Phase rounded: the ring blends each pixel many times, so float noise would show.
        const v = Math.round(frac(20 * u) * 960) / 960, a = (1 - v) * (1 - v) * 0.3 * act;
        for (let w = 0; w < 3; w++) {
          const rad = 14 + v * 130 - w, steps = Math.ceil(rad * 4.5);
          for (let s = 0; s < steps; s++) {
            const ang = s / steps * TAU;
            blendAt(buf, CX + Math.cos(ang) * rad, CY + Math.sin(ang) * rad * 0.8, charge > 0.5 ? RIM_R : RIM_V, a * (w === 1 ? 1 : 0.5));
          }
        }
      }

      // The streams: each world's light, along its curve, into the core.
      for (const w of WORLDS) {
        const I = clamp((charge - w.start) / 0.12) * (1 - clamp((charge - 0.86) / 0.12));
        if (I <= 0) continue;
        // The ribbon: a bright core with a soft edge, rippling.
        for (let s = 0; s < w.N; s++) {
          const wob = Math.sin(TAU * 12 * u + s * 0.3 + w.seed * TAU) * 0.7;
          const x = w.path[s * 2] + wob, y = w.path[s * 2 + 1] - wob;
          const swell = 0.75 + 0.25 * Math.sin(TAU * 24 * u - s * 0.25);
          blendAt(buf, x, y, w.c, 0.55 * I * swell);
          blendAt(buf, x + 1, y, w.c, 0.18 * I); blendAt(buf, x, y + 1, w.c, 0.18 * I);
        }
        for (let j = 0; j < 6; j++) {
          const v = frac(40 * u + j / 6 + w.seed), s = v * v;
          for (let tr = 8; tr >= 0; tr--) {
            const sv = clamp(s - tr * 0.012), n = Math.round(sv * (w.N - 1)) * 2;
            const x = w.path[n], y = w.path[n + 1];
            if (tr === 0) {
              blendAt(buf, x, y, w.hi, 0.95 * I);
              blendAt(buf, x - 1, y, w.c, 0.7 * I); blendAt(buf, x + 1, y, w.c, 0.7 * I);
              blendAt(buf, x, y - 1, w.c, 0.7 * I); blendAt(buf, x, y + 1, w.c, 0.7 * I);
            } else blendAt(buf, x, y, tr < 3 ? w.hi : w.c, (0.75 - tr * 0.08) * I);
          }
        }
      }

      // The emblems: lit, then drained to grey once their light is gone.
      for (const w of WORLDS) {
        const drain = clamp((charge - w.start - 0.1) / 0.22);
        const lit = 1 - drain;
        const pulse = 0.6 + 0.4 * Math.sin(TAU * 10 * u + w.seed * TAU);
        if (lit > 0) for (let n = 0; n < HALO.length; n += 3) blendAt(buf, w.x + HALO[n], w.y + HALO[n + 1], w.c, HALO[n + 2] * 0.55 * lit * pulse);
        for (let n = 0; n < w.px.length; n += 3) {
          const x = w.x + w.px[n], y = w.y + w.px[n + 1];
          const grey = drain > bay(x & 3, y & 3) * 0.999;
          put(buf, x, y, w.px[n + 2] ? (grey ? w.greyH : w.hi) : (grey ? w.grey : w.c));
        }
      }

      // The crystal, bobbing; red spreads from the core out as he fills.
      const by = Math.round(1.5 * Math.sin(TAU * 20 * u));
      const red = charge * 1.08;
      const crk = Math.sin(TAU * 36 * u) + Math.sin(TAU * 53 * u) > 0.3;
      for (const p of CRYS) {
        const x = CX + p.dx, y = CY + p.dy + by;
        const hot = p.key < red;
        let c;
        if (p.kind === 1) c = hot ? RIM_R : RIM_V;
        else if (p.kind === 3) c = hot ? CRK_R[crk ? 0 : 1] : CRK_V[crk ? 0 : 1];
        else if (p.kind === 4) c = charge > 0.4 ? EYE_R : EYE_V;
        else if (p.kind === 5) c = CROWN[p.dy < -25 ? 0 : p.dy < -22 ? 1 : 2];   // lit tips, band, shaded rim
        else {
          const wave = Math.sin(TAU * 15 * u - p.d * 9) > 0.75 && p.kind === 0 ? 1 : 0;
          c = (hot ? RED : VIO)[Math.max(0, p.tone - wave)];
        }
        put(buf, x, y, c);
      }
      // His eyes glow a little past the crystal.
      const eyeC = charge > 0.4 ? EYE_R : EYE_V, eyeA = 0.35 + 0.25 * Math.sin(TAU * 24 * u);
      for (const ex of [-2, 2]) { blendAt(buf, CX + ex - 1, CY - 17 + by, eyeC, eyeA); blendAt(buf, CX + ex + 1, CY - 17 + by, eyeC, eyeA); }

      // Lightning once the stolen power fills him.
      if (charge > 0.5) {
        const slot = Math.floor(t * 8 + 1e-6) % (LOOP * 8);
        for (let b = 0; b < 4; b++) {
          if (hash(slot, b + 91) > 0.25 + (1 - charge) * 1.2) continue;
          let ang = hash(slot, b + 92) * TAU, x = CX + Math.cos(ang) * 20, y = CY + by + Math.sin(ang) * 36;
          const col = hash(slot, b + 93) > 0.5 ? C('#fff0d0') : C('#ff9a50');
          for (let s = 0; s < 6; s++) {
            ang += (hash(slot * 7 + s, b + 94) - 0.5) * 1.4;
            const nx = x + Math.cos(ang) * 5, ny = y + Math.sin(ang) * 4;
            K.line(buf, x, y, nx, ny, col);
            x = nx; y = ny;
          }
        }
      }

      // Motes of ether rise through the void.
      for (const m of MOTES) {
        const v = frac(m.k * u + m.p), y = H + 4 - v * (H + 8), x = m.x + 3 * Math.sin(TAU * 6 * u + m.w);
        blendAt(buf, x, y, MOTE, 0.55 * Math.sin(Math.PI * v));
      }
    }

    return (t, out, state) => { buf = out; frame(t, state || {}); };
  },
});
