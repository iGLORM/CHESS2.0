// The Great Board at dawn: the background of the Great Board theme (after the ending).
//
// 320x200 (exactly 4x smaller than the game's 1280x800), drawn in code and scaled up
// with nearest-neighbour. The long night is over: the restored Great Board floats as one
// land over a sea of clouds, its cream and blue-violet squares catching the first sun,
// which rises on the cloud horizon right behind it. Everything is backlit: gold rims and
// a golden glare path on the polished board against blue-violet shade and cloud troughs.
// The eleven worlds sit fused along its edges: Pawn Hollow's windmill, Iron Keep's rook
// tower, the Training Camp pagoda, the leaning pyramids of Slanted Sands and the Misty
// Moors watchtower on the left; Obsidian Court's volcano, the Forked Gulch butte, the
// Royal Palace dome and its crown, the Clockwork Citadel clock tower and the Grand
// Library on the right; the magenta crystal floats above them, dormant and calm.
// Moves: four layers of the cloud sea roll by, high clouds drift, sun rays breathe,
// the last stars twinkle out, an aurora shimmers and fades, gold glints run round the
// board's rim, the glare path sparkles, windmill sails turn, banners and pennants flap,
// waterfalls pour off the board into the clouds, birds cross, motes of light rise, the
// volcano smokes, the clock's hand turns, windows and the watchtower lantern flicker,
// mist curls round the watchtower and the crystal bobs with a slow pulse. Every motion
// runs a whole number of cycles per loop, so the 120-second loop is seamless.
LiveScenes.register({
  id: 'greatboard',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, BAY, bay, ramp, hash, noise1, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over } = K;
    let buf = null;

    // ---------- geometry and light ----------
    const HY = 88;                          // the cloud horizon
    const SX = 168, SY = 88, SR = 11;       // the sun, half risen out of the clouds
    const HAZE = '#e8b4a8';                 // warm morning air
    // The board in perspective: row depth Z runs from D (near edge) to D + 12 (far edge).
    const D = 6, ROWS = 12, AY = 68 * D, FX = 150;   // y = HY + AY / Z, x = 160 + FX * X / Z
    const boardY = Z => HY + AY / Z;
    const boardX = (X, Z) => 160 + FX * X / Z;
    const NEAR_Y = 156, FAR_Y = Math.round(boardY(D + ROWS));
    const edgeHW = y => (y - HY) * FX / 68;         // half-width of the board at row y

    const SKYB = new Uint32Array(W * H);   // sky, sun (opaque)
    const BACK = new Uint32Array(W * H);   // the board, underside and landmarks (0 = transparent)
    const BOARD = new Uint8Array(W * H);   // 1 = board top surface
    const SHADOW = new Float32Array(W * H);

    // A ramp whose steps dither only in a narrow seam, for clean wide bands.
    const crisp = (cols, t, x, y) => {
      t = clamp(t) * (cols.length - 1);
      const i = t | 0, f = clamp((t - i - 0.5) * 3.5 + 0.5);
      return cols[Math.min(cols.length - 1, i + (f > bay(x, y) ? 1 : 0))];
    };

    // ---------- sky ----------
    const SKY = ['#121440', '#1a1c52', '#232866', '#303478', '#44428a', '#5e4e96', '#7e5c9e', '#a26ca2',
      '#c67ea0', '#e2949a', '#f4ae94', '#ffc894', '#ffdea8', '#fff0c8'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - SX, (y - SY) * 1.4);
      const t = Math.min(y, HY) / HY * 0.74 + 0.22 * Math.exp(-sq(d / 95)) + 0.2 * Math.exp(-sq(d / 32));
      SKYB[y * W + x] = crisp(SKY, t, x, y);
    }
    for (let y = SY - SR - 3; y <= SY + SR + 3; y++) for (let x = SX - SR - 3; x <= SX + SR + 3; x++) {
      const d = Math.hypot(x - SX, y - SY);
      if (d < SR - 3) put(SKYB, x, y, C('#fffdf2'));
      else if (d < SR) put(SKYB, x, y, C('#fff4cc'));
      else if (d < SR + 1.3) put(SKYB, x, y, C('#ffe2a4'));
      else if (d < SR + 3.2 && bay(x, y) < 0.5) put(SKYB, x, y, C('#ffe8b4'));
    }
    const STARS = [];
    for (let i = 0; i < 46; i++) {
      const x = hash(i, 901) * W | 0, y = (hash(i, 902) ** 1.6 * 40) | 0;
      if (Math.abs(x - SX) < 70 && y > 12) continue;          // the sky near the sun is too bright
      STARS.push({ x, y, k: 10 + (hash(i, 903) * 28 | 0), p: hash(i, 904) * TAU, big: hash(i, 905) > 0.85 });
    }

    // High clouds, lit pink-gold underneath by the low sun: round puffs on a flat base,
    // cel-shaded in clean bands (gold hem, warm underside, cool body, pale top edge).
    function skyCloud(w, h, seed, pal) {
      const m = new Uint8Array(w * h), px = new Uint32Array(w * h), n = Math.max(3, Math.round(w / 14)), blobs = [];
      for (let i = 0; i < n; i++) {
        const bump = Math.sin(Math.PI * (i + 0.5) / n), r = h * (0.32 + 0.6 * bump * (0.6 + 0.4 * hash(i, seed + 2)));
        blobs.push({ cx: clamp(w * (i + 0.5) / n + (hash(i, seed) - 0.5) * 6, r + 1, w - r - 2), cy: h - 1 - r * 0.4, r });
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
        for (const bl of blobs) if (Math.hypot(x - bl.cx, (y - bl.cy) * 1.2) <= bl.r) { m[y * w + x] = 1; break; }
      const P = pal.map(C);          // [top edge, body, lower body, underside, hem]
      for (let x = 0; x < w; x++) {
        let bot = -1; for (let y = h - 1; y >= 0; y--) if (m[y * w + x]) { bot = y; break; }
        for (let y = 0; y < h; y++) {
          if (!m[y * w + x]) continue;
          const db = bot - y, top = y === 0 || !m[(y - 1) * w + x];
          px[y * w + x] = db === 0 ? P[4] : db <= 2 ? P[3] : top ? P[0] : db <= 4 ? P[2] : P[1];
        }
      }
      return { w, h, px };
    }
    const CPAL1 = ['#8e86c0', '#5e5c9c', '#7a68a4', '#d08ca0', '#ffc8a0'], CPAL2 = ['#a896c4', '#6e64a2', '#8e70a6', '#e49ca0', '#ffdcaa'];
    const CLOUDS = [
      { c: skyCloud(70, 9, 21, CPAL1), x0: 20, y: 20, k: 1 },
      { c: skyCloud(48, 7, 22, CPAL1), x0: 300, y: 34, k: 1 },
      { c: skyCloud(96, 12, 23, CPAL2), x0: 170, y: 56, k: 2 },
      { c: skyCloud(62, 10, 24, CPAL2), x0: 420, y: 66, k: 2 },
    ];
    const CLOUD_SPAN = 480;

    // ---------- the sea of clouds: tileable strips, rolled sideways per frame ----------
    // Each strip is a row of round puffs over a solid bank, cel-shaded in clean bands:
    // backlit, so each puff's top carries a silver-gold lining, then a lit band, then
    // cooler shade below; troughs where a nearer puff overlaps are darkest. A warm and a
    // cool version of each strip: the warm one is used near the sun.
    function seaStrip(P, h, base, n, r0, r1, jit, seed, pal) {
      const PU = [];
      for (let i = 0; i < n; i++) {
        const r = r0 + hash(i, seed + 1) * (r1 - r0);
        PU.push({ cx: (i + 0.5 + (hash(i, seed) - 0.5) * 0.7) * P / n, cy: base - r * 0.3 + hash(i, seed + 2) * jit, r });
      }
      PU.sort((a, b) => a.cy - b.cy);          // later = lower = nearer
      const own = new Int16Array(P * h).fill(-2), dtop = new Float32Array(P * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < P; x++) {
        let o = y >= base ? -1 : -2, dt = y - base;
        for (let i = PU.length - 1; i >= 0; i--) {
          const p = PU[i]; let dx = Math.abs(x - p.cx); dx = Math.min(dx, P - dx);
          if (dx * dx + sq((y - p.cy) * 1.3) <= p.r * p.r) { o = i; dt = y - (p.cy - Math.sqrt(p.r * p.r - dx * dx) / 1.3); break; }
        }
        own[y * P + x] = o; dtop[y * P + x] = dt;
      }
      const make = pc => {
        const rim = C(pc.rim), edge = C(pc.edge), B = pc.body.map(C), px = new Uint32Array(P * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < P; x++) {
          const k = y * P + x, o = own[k]; if (o === -2) continue;
          const up = y > 0 ? own[k - P] : -2, dn = y + 1 < h ? own[k + P] : o, dt = dtop[k];
          let c;
          if (o >= 0) {
            const r = PU[o].r;
            if (up === -2 || dt < 1) c = rim;
            else if (dt < 2.4 + r * 0.08) c = edge;
            else if (dn !== o && dn > o) c = B[3];
            else c = dt < r * 0.62 ? B[0] : dt < r * 0.62 + 1 && bay(x, y) < 0.5 ? B[0] : dt < r * 1.05 ? B[1] : B[2];
          } else c = up === -2 ? edge : up >= 0 ? B[3] : (y - base) < 4 ? B[2] : (y - base) < 5 && bay(x, y) < 0.5 ? B[2] : B[4];
          px[k] = c;
        }
        return px;
      };
      const mid = {};
      for (const key of ['rim', 'edge']) mid[key] = mix(pal.warm[key], pal.cool[key], 0.5);
      mid.body = pal.warm.body.map((c, i) => mix(c, pal.cool.body[i], 0.5));
      return { P, h, tone: [make(pal.cool), make(mid), make(pal.warm)] };
    }
    const SEA_FAR = seaStrip(320, 40, 7, 30, 2.5, 5.5, 2, 31, {
      warm: { rim: '#fff8dc', edge: '#ffe4b8', body: ['#f8cca8', '#e8b0a8', '#d09cac', '#b890b0', '#a488b0'] },
      cool: { rim: '#f8dcd4', edge: '#e4c4d0', body: ['#ccb0cc', '#b8a2c6', '#a496c0', '#9490ba', '#8a88b4'] },
    });
    const SEA_MID = seaStrip(400, 46, 13, 20, 5, 11, 4, 41, {
      warm: { rim: '#fff0c8', edge: '#ffd6ac', body: ['#eab4a8', '#cc9cac', '#ac8aae', '#9480aa', '#8078a4'] },
      cool: { rim: '#ecd0d8', edge: '#ccb4d4', body: ['#aa9cc8', '#9890c0', '#8686b6', '#787cac', '#6c72a2'] },
    });
    const SEA_LOW = seaStrip(480, 80, 18, 15, 8, 16, 6, 51, {
      warm: { rim: '#ffe2b8', edge: '#eebaa8', body: ['#c49aae', '#a486aa', '#8676a2', '#6e6a9a', '#5e5e90'] },
      cool: { rim: '#d8c4e0', edge: '#aea2d0', body: ['#8e86be', '#7a78b0', '#686aa2', '#5a5e96', '#4e548a'] },
    });
    const SEA_NEAR = seaStrip(640, 26, 17, 15, 9, 15, 3, 61, {
      warm: { rim: '#f0c8b8', edge: '#c6a0b8', body: ['#8a78aa', '#6e669c', '#5a568c', '#4a4a7e', '#3e3e70'] },
      cool: { rim: '#b0a6dc', edge: '#8a84c0', body: ['#6a66a6', '#585894', '#4a4a84', '#3e3e74', '#343466'] },
    });
    const SEAS = [
      { s: SEA_FAR, y: HY - 7, k: 1 }, { s: SEA_MID, y: HY + 2, k: 1 },
      { s: SEA_LOW, y: HY + 26, k: 1 }, { s: SEA_NEAR, y: 176, k: 1 },
    ];
    const WARMSEL = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const w = Math.exp(-sq((x - SX) / (80 + (y - HY) * 1.3))) * clamp(1.3 - (y - HY) / 100);
      const th = (bay(x, y) - 0.5) * 0.1;
      WARMSEL[y * W + x] = w > 0.62 + th ? 2 : w > 0.32 + th ? 1 : 0;
    }

    // ---------- the landmarks (positions on the board) ----------
    // Each stands on the board at column X (edge is +-6) and depth row r.
    const at = (X, r) => { const Z = D + r; return { x: Math.round(boardX(X, Z)), y: Math.round(boardY(Z)), s: D / Z }; };
    const P_MILL = at(-5.2, 0.9), P_ROOK = at(-5.35, 2.7), P_PAGODA = at(-5.4, 4.7), P_PYR = at(-5.6, 7), P_WATCH = at(-5.4, 9.8);
    const P_VOLC = at(5.0, 0.9), P_BUTTE = at(5.3, 2.7), P_PALACE = at(5.3, 4.7), P_CLOCK = at(5.4, 7), P_LIB = at(5.4, 9.8);
    // Long dawn shadows run from each landmark straight away from the sun.
    const CASTERS = [[P_MILL, 6, 34], [P_ROOK, 5, 26], [P_PAGODA, 4, 18], [P_PYR, 6, 12], [P_WATCH, 2, 10],
      [P_VOLC, 14, 26], [P_BUTTE, 6, 22], [P_PALACE, 6, 14], [P_CLOCK, 2, 16], [P_LIB, 4, 8]];
    for (const [p, hw, len] of CASTERS) {
      let dx = p.x - SX, dy = p.y - HY; const n = Math.hypot(dx, dy); dx /= n; dy /= n;
      for (let s = 0; s <= len; s += 0.5) {
        const w = hw * (1 + 0.5 * s / len), a = 1 - s / len * 0.6;
        for (let q = -w; q <= w; q += 0.5) {
          const x = Math.round(p.x + dx * s - dy * q), y = Math.round(p.y + dy * s * 0.5 + dx * q * 0.2);
          if (x >= 0 && y >= 0 && x < W && y < H) SHADOW[y * W + x] = Math.max(SHADOW[y * W + x], a * (1 - Math.abs(q) / (w + 1) * 0.4));
        }
      }
    }

    // ---------- the board's top surface ----------
    const LSQH = ['#7e76a4', '#9a8eb4', '#b8a8bc', '#d6c2c2', '#ecd8c6', '#f8e8cc', '#fff4de', '#fffbee'];
    const DSQH = ['#16143e', '#1e1a4c', '#28225c', '#342a6a', '#463476', '#5e4280', '#7c5286', '#a06688'];
    const LSQ = LSQH.map(C), DSQ = DSQH.map(C);
    // Far away the squares fade into the warm morning air (less contrast, fewer flickery pixels).
    const LSQF = LSQH.map(c => C(mix(c, HAZE, 0.3))), DSQF = DSQH.map(c => C(mix(c, HAZE, 0.5)));
    const GLARE_IDX = [];
    for (let y = FAR_Y; y <= NEAR_Y; y++) {
      for (let x = 0; x < W; x++) {
        let inside = 0, light = 0;
        for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
          const yy = y + (sy + 0.5) / 4, xx = x + (sx + 0.5) / 4;
          if (yy <= HY) continue;
          const Z = AY / (yy - HY), X = (xx - 160) * Z / FX, r = Z - D;
          if (Math.abs(X) > 6 || r < 0 || r > ROWS) continue;
          inside++;
          if (((Math.floor(X + 6) + Math.floor(r)) & 1) === 0) light++;
        }
        if (inside < 8) continue;
        const Z = AY / (y + 0.5 - HY), fz = clamp((Z - D) / ROWS);
        const r = Z - D, rowPx = AY / Z - AY / (Z + 1);            // this row's height in pixels
        const wg = 5 + 42 * (1 - fz) ** 1.4;
        const g = Math.exp(-sq((x + 0.5 - SX) / wg)) * (0.45 + 0.55 * fz);
        let b = 0.28 + 0.4 * fz + g * 0.75 - SHADOW[y * W + x] * 0.42;
        if (rowPx > 4 && frac(r) > 1 - 1.1 / rowPx) b += 0.12;      // the far lip of each near square catches the light
        const isL = light * 2 > inside ? light / inside > 0.5 + (bay(x, y) - 0.5) * 0.9 : light / inside > bay(x, y);
        const i = y * W + x;
        const fog = fz > 0.58 + (bay(x, y) - 0.5) * 0.12;
        BACK[i] = isL ? ramp(fog ? LSQF : LSQ, clamp(b + 0.08), x, y) : ramp(fog ? DSQF : DSQ, clamp(b * 0.85 + fz * 0.18), x, y);
        BOARD[i] = 1;
        if (isL && g > 0.3 && SHADOW[i] < 0.1) GLARE_IDX.push(i);
      }
    }

    // ---------- the gold rim, the near face and the underside ----------
    const RIM_PATH = [];                      // pixel indices round the rim, in order, for travelling glints
    const GOLD = ['#6e4424', '#a0682c', '#d49a3c', '#f4c460', '#ffe49a', '#fff8d8'].map(C);
    const rimCol = (x, y) => {
      const d = Math.hypot(x - SX, (y - HY) * 2.5);
      return d < 30 ? GOLD[5] : d < 70 ? GOLD[4] : GOLD[3];
    };
    // Far edge.
    for (let x = Math.round(160 - edgeHW(FAR_Y)); x <= Math.round(160 + edgeHW(FAR_Y)); x++) put(BACK, x, FAR_Y - 1, rimCol(x, FAR_Y));
    // Side edges: a bright outer run and a darker inner one on every row.
    const sideRim = [];
    for (let y = FAR_Y; y <= NEAR_Y; y++) {
      const hw0 = edgeHW(y), hw1 = edgeHW(y + 1);
      for (const sgn of [-1, 1]) {
        const xa = Math.round(160 + sgn * hw0), xb = Math.round(160 + sgn * hw1);
        const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
        for (let x = lo; x <= hi; x++) {
          const i = y * W + x;
          BACK[i] = y > NEAR_Y - 2 ? GOLD[4] : (Math.abs(x - SX) < 60 ? GOLD[4] : GOLD[3]);
          BOARD[i] = 0; sideRim.push({ i, sgn, y, x });
        }
        const xi = sgn < 0 ? hi + 1 : lo - 1;
        if (y < NEAR_Y && BOARD[y * W + xi]) BACK[y * W + xi] = GOLD[2];
      }
    }
    // Near edge top and the studded face below it.
    const NX0 = Math.round(160 - edgeHW(NEAR_Y)), NX1 = Math.round(160 + edgeHW(NEAR_Y));
    const FACE = ['#2e2a64', '#26225a', '#201c4e'].map(C);
    for (let x = NX0; x <= NX1; x++) {
      put(BACK, x, NEAR_Y, GOLD[4]); BOARD[NEAR_Y * W + x] = 0;
      put(BACK, x, NEAR_Y + 1, GOLD[2]);
      for (let y = NEAR_Y + 2; y <= NEAR_Y + 5; y++) put(BACK, x, y, ramp(FACE, (y - NEAR_Y - 2) / 4, x, y));
      put(BACK, x, NEAR_Y + 6, GOLD[1]);
      put(BACK, x, NEAR_Y + 7, C('#141032'));
    }
    for (let k = -6; k <= 6; k++) {
      const sx = 160 + 25 * k;
      for (let y = NEAR_Y + 3; y <= NEAR_Y + 4; y++) { put(BACK, sx, y, y === NEAR_Y + 3 ? GOLD[4] : GOLD[2]); put(BACK, sx + 1, y, y === NEAR_Y + 3 ? GOLD[2] : GOLD[1]); }
    }
    for (let x = NX0; x <= NX0 + 1; x++) for (let y = NEAR_Y; y <= NEAR_Y + 6; y++) put(BACK, x, y, GOLD[x === NX0 ? 3 : 2]);
    for (let x = NX1 - 1; x <= NX1; x++) for (let y = NEAR_Y; y <= NEAR_Y + 6; y++) put(BACK, x, y, GOLD[x === NX1 ? 1 : 2]);

    // The rim loop, for the glints: near edge left to right, right side up, far edge, left side down.
    for (let x = NX0; x <= NX1; x++) RIM_PATH.push(NEAR_Y * W + x);
    const rightSide = sideRim.filter(r => r.sgn > 0).sort((a, b) => b.y - a.y || b.x - a.x);
    const leftSide = sideRim.filter(r => r.sgn < 0).sort((a, b) => a.y - b.y || b.x - a.x);
    for (const r of rightSide) RIM_PATH.push(r.i);
    for (let x = Math.round(160 + edgeHW(FAR_Y)); x >= Math.round(160 - edgeHW(FAR_Y)); x--) RIM_PATH.push((FAR_Y - 1) * W + x);
    for (const r of leftSide) RIM_PATH.push(r.i);

    // The underside: a floating continent's rock, an upside-down mountain. Faceted in cool
    // shade, darkest under the lip, lighter toward the bottom where the clouds bounce light
    // up onto it; stalactite crags, gold ore and a few pale crystals hanging off it.
    const UTOP = NEAR_Y + 8;
    const ROCK = ['#5a52a0', '#443e86', '#342f70', '#28245c', '#1e1a4a', '#15123a'].map(C);
    const BOUNCE = C('#8a82c4');
    const SPIKES = Array.from({ length: 11 }, (_, n) => ({ x: 22 + n * 27 + (hash(n, 76) - 0.5) * 14, d: 5 + hash(n, 77) * 11, w: 3 + hash(n, 78) * 3 }));
    const ubot = x => {
      const e = Math.abs(x - 160) / 151;
      if (e > 1) return UTOP - 1;
      let b = UTOP + 3 + 26 * Math.pow(1 - e * e, 1.4) + 4 * (fbm1(x / 6, 71) - 0.5);
      for (const sp of SPIKES) { const q = 1 - Math.abs(x - sp.x) / sp.w; if (q > 0) b = Math.max(b, UTOP + 3 + 26 * Math.pow(1 - e * e, 1.4) + sp.d * q * (1 - e * 0.6)); }
      return Math.round(b);
    };
    const UBOT = new Int16Array(W);
    for (let x = 0; x < W; x++) UBOT[x] = ubot(x);
    const UMASK = new Uint8Array(W * H);
    for (let x = 0; x < W; x++) for (let y = UTOP; y <= Math.min(H - 1, UBOT[x]); y++) UMASK[y * W + x] = 1;
    for (let x = 0; x < W; x++) for (let y = UTOP; y <= Math.min(H - 1, UBOT[x]); y++) {
      const i = y * W + x, span = Math.max(4, UBOT[x] - UTOP), vy = (y - UTOP) / span;
      const fx = x + 4 * noise1(y / 6, 75), fi = Math.floor(fx / 8), ff = fx / 8 - fi;
      let t = 0.9 - vy * 0.55 + (hash(fi, 79) - 0.5) * 0.22;
      if (ff < 0.14) t -= 0.18;                                   // each facet's lit edge
      if (y - UTOP < 3) t = 1;                                    // the shadow under the lip
      if ((y + Math.floor(x / 9)) % 6 === 0 && noise1(x / 5, 80 + (y >> 3)) > 0.55) t += 0.2;   // strata
      let c = crisp(ROCK, t, x, y);
      if (y >= UBOT[x] - 1 && y > UTOP + 4) c = y === UBOT[x] ? BOUNCE : ROCK[1];
      else if ((!UMASK[i - 1] || !UMASK[i + 1]) && y > UTOP + 2) c = ROCK[1];
      BACK[i] = c;
    }
    // Gold ore, and pale crystals hanging from the crags.
    for (let n = 0; n < 14; n++) {
      const x = Math.round(30 + hash(n, 84) * 260), y = Math.round(UTOP + 5 + hash(n, 85) * (UBOT[x] - UTOP - 8));
      if (!UMASK[y * W + x] || y >= UBOT[x] - 2) continue;
      put(BACK, x, y, GOLD[4]); put(BACK, x + 1, y, GOLD[2]); if (n % 3 === 0) put(BACK, x, y + 1, GOLD[1]);
    }
    for (const sp of SPIKES.filter((_, n) => n % 3 === 1)) {
      const x = Math.round(sp.x), y0 = UBOT[x];
      for (let j = 1; j <= 5; j++) { put(BACK, x, y0 + j, C(j < 3 ? '#dce0ff' : '#9aa4f0')); if (j < 4) put(BACK, x + 1, y0 + j, C('#6a70c8')); }
    }
    for (let n = 0; n < 14; n++) {
      const x = Math.round(24 + hash(n, 81) * 272), y = UBOT[x];
      if (y < UTOP + 4) continue;
      const len = 2 + (hash(n, 82) * 4 | 0);
      for (let j = 1; j <= len; j++) put(BACK, x + (j > len / 2 && hash(n, 83) > 0.5 ? 1 : 0), y + j, C(j === len ? '#5a6a8a' : '#2a3050'));
    }

    // ---------- landmark helpers ----------
    const mat = (cols, h) => cols.map(c => C(mix(c, HAZE, h)));
    const sideOf = x => (SX > x ? 1 : -1);
    // A trapezoid lit on the sun side: M = [dark, mid, lit, rim].
    function trap(cx, yb, yt, hwb, hwt, M, opt = {}) {
      const side = sideOf(cx);
      for (let y = yt; y <= yb; y++) {
        const s = yb === yt ? 1 : (y - yt) / (yb - yt), hw = hwt + (hwb - hwt) * s;
        const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw);
        for (let x = x0; x <= x1; x++) {
          const rel = x1 === x0 ? 0 : ((x - x0) / (x1 - x0)) * 2 - 1, sw = rel * side;
          let c = sw > 0.72 ? M[3] : sw > 0.28 ? M[2] : sw < -0.5 ? M[0] : M[1];
          if (opt.topRim && y === yt && sw > -0.3) c = M[3];
          if (opt.bands && (y - yt) % opt.bands === opt.bands - 1 && sw < 0.72) c = M[0];
          put(BACK, x, y, c);
        }
      }
    }
    // A patch of a world's ground laid on the board around a landmark (foreshortened).
    function patch(cx, cy, rx, ry, cols, rimc, seed) {
      const P = cols.map(C), R = C(rimc), side = sideOf(cx);
      for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
        const e = sq((x - cx) / rx) + sq((y - cy) / ry) - 0.25 * (noise1(x / 3, seed) - 0.5);
        if (e > 1) continue;
        const i = y * W + x; if (!BOARD[i]) continue;
        const top = sq((x - cx) / rx) + sq((y - 1 - cy) / ry) - 0.25 * (noise1(x / 3, seed) - 0.5) > 1;
        BACK[i] = top && (x - cx) * side > -rx * 0.3 ? R : ramp(P, 0.3 + (y - cy) / ry * 0.35 + (hash(x, y + seed) > 0.85 ? 0.3 : 0), x, y);
      }
    }
    function tree(cx, gy, r, h) {
      const cols = mat(['#5a8a58', '#3e6a4c', '#2c4c44', '#20363c'], h), rimc = C(mix('#e8d078', HAZE, h * 0.5)), side = sideOf(cx), cy = gy - r - 1;
      for (let y = cy + r; y <= gy; y++) put(BACK, cx, y, C(mix('#2a2030', HAZE, h)));
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) / r;
        if (d > 1) continue;
        const l = (dx * side) / r * 0.6 - dy / r * 0.5;
        put(BACK, x, y, d > 0.65 && l > 0.3 ? rimc : ramp(cols, 0.55 - l * 0.5 + (hash(x, y) - 0.5) * 0.25, x, y));
      }
    }
    const WINDOWS = [];      // {x, y} warm lights, flickering
    const BANNERS = [];      // {x, y, len, dir, cols}
    const SMOKES = [];       // {x, y, n, k, spread, cols}

    // ---------- Pawn Hollow: the windmill ----------
    const WM = { x: P_MILL.x, base: P_MILL.y };
    patch(WM.x, WM.base, 17, 4.5, ['#6a9a58', '#4e7c4c', '#3a6046'], '#dcd878', 5);
    patch(WM.x + 10, WM.base + 2, 7, 2.2, ['#f0cc78', '#d0a45a', '#a8804c'], '#fff0a8', 6);
    (function windmill() {
      const cx = WM.x, base = WM.base, top = base - 25;
      const M = ['#3e3462', '#54467a', '#c49a94', '#ffdca0'];
      trap(cx, base, top, 5.5, 3.2, M.map(C));
      const mortar = C('#463a6c');
      for (let y = top + 3; y < base; y += 4) for (let x = cx - 4; x <= cx + 1; x++) if (BACK[y * W + x] === C(M[1])) put(BACK, x, y, mortar);
      for (let y = base - 5; y <= base; y++) for (let x = cx - 1; x <= cx; x++) put(BACK, x, y, C('#1e1638'));
      WINDOWS.push({ x: cx, y: top + 8 }, { x: cx - 1, y: top + 15 });
      // A little cap roof.
      for (let i = 0; i < 6; i++) {
        const y = top - 1 - i, hw = 4.6 - i * 0.8;
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
          const rel = (x - (cx - hw)) / (2 * hw + 0.01);
          put(BACK, x, y, C(i === 5 || rel > 0.72 ? '#ff9c70' : rel < 0.3 ? '#3e1a30' : '#6a2a3a'));
        }
      }
      WM.hx = cx; WM.hy = top - 3;
    })();
    tree(WM.x - 13, WM.base + 1, 2.5, 0.05); tree(WM.x + 15, WM.base + 3, 3, 0.02); tree(WM.x - 7, WM.base + 3, 2, 0.05);

    // ---------- Iron Keep: the rook tower ----------
    patch(P_ROOK.x, P_ROOK.y, 11, 3, ['#5a5c78', '#484a66', '#3a3c56'], '#d8c0a0', 7);
    (function rook() {
      const cx = P_ROOK.x, base = P_ROOK.y, M = mat(['#262844', '#383c5a', '#8a88a6', '#ffd49c'], 0.08);
      trap(cx, base, base - 17, 4.5, 3.5, M, { bands: 4 });
      trap(cx, base - 18, base - 20, 5, 5, M, { topRim: true });
      for (let y = base - 23; y <= base - 21; y++) for (let x = cx - 5; x <= cx + 5; x++) {
        const m = x - (cx - 5);
        if (m <= 2 || (m >= 4 && m <= 6) || m >= 8) {
          const sw = ((x - cx) / 5) * sideOf(cx);
          put(BACK, x, y, y === base - 23 && sw > -0.3 ? M[3] : sw > 0.6 ? M[2] : sw < -0.4 ? M[0] : M[1]);
        }
      }
      WINDOWS.push({ x: cx, y: base - 12 }, { x: cx - 1, y: base - 6 });
      for (let y = base - 32; y <= base - 24; y++) put(BACK, cx, y, C('#1e1a34'));
      put(BACK, cx, base - 33, C('#ffe49a'));
      BANNERS.push({ x: cx + 1, y: base - 32, len: 7, h: 3, cols: ['#e05a48', '#a8343a', '#6e2234'] });
    })();

    // ---------- Training Camp: the pagoda ----------
    patch(P_PAGODA.x, P_PAGODA.y, 9, 2.4, ['#8aa070', '#6c8660', '#566e54'], '#e8dc8c', 8);
    (function pagoda() {
      const cx = P_PAGODA.x; let y = P_PAGODA.y;
      const body = mat(['#3a1830', '#5e2436', '#c05a4e', '#ffc884'], 0.12), roof = mat(['#18243c', '#243650', '#4e7488', '#ffe09a'], 0.12);
      const tiers = [[3, 4, 6.5], [3, 3, 5.5], [2, 2.2, 4.5]];
      for (const [bh, bhw, rhw] of tiers) {
        trap(cx, y, y - bh + 1, bhw, bhw, body);
        y -= bh;
        // Eave: flat underside, upturned tips, sloping top.
        for (let j = 0; j < 3; j++) {
          const hw = rhw - j * 1.4;
          for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
            const rel = (x - cx) / hw * sideOf(cx);
            put(BACK, x, y - j, j === 2 || rel > 0.55 ? roof[3] : rel < -0.4 ? roof[0] : roof[1]);
          }
        }
        put(BACK, Math.round(cx - rhw) - 1, y - 1, roof[3]); put(BACK, Math.round(cx + rhw) + 1, y - 1, roof[3]);
        y -= 3;
      }
      for (let j = 0; j < 4; j++) put(BACK, cx, y - j, C(j === 3 ? '#ffe49a' : '#6a4a34'));
      WINDOWS.push({ x: cx, y: P_PAGODA.y - 1 });
    })();

    // ---------- Slanted Sands: two leaning pyramids ----------
    patch(P_PYR.x, P_PYR.y, 10, 2, ['#e8c07a', '#c8985c', '#a07650'], '#fff0b0', 9);
    function pyramid(cx, base, hw, h, lean, hz) {
      const lit = mat(['#ffd48a', '#eab060', '#fff4c4'], hz), shade = mat(['#9a6a74', '#86586a'], hz);
      const ax = cx + lean, ay = base - h;
      for (let y = ay; y <= base; y++) {
        const s = (y - ay) / h, xl = ax + (cx - hw - ax) * s, xr = ax + (cx + hw - ax) * s, xm = ax + (cx - hw * 0.25 - ax) * s;
        for (let x = Math.round(xl); x <= Math.round(xr); x++) {
          const right = x > xm;
          let c = right ? (x >= Math.round(xr) || y === ay ? lit[2] : ((y - ay) % 3 === 2 ? lit[1] : lit[0])) : ((y - ay) % 3 === 2 ? shade[1] : shade[0]);
          if (Math.abs(x - xm) < 0.6) c = lit[2];
          put(BACK, x, y, c);
        }
      }
    }
    pyramid(P_PYR.x - 6, P_PYR.y + 1, 4.5, 7, 2, 0.12);
    pyramid(P_PYR.x + 2, P_PYR.y, 7, 12, 4, 0.1);

    // ---------- Misty Moors: the watchtower ----------
    patch(P_WATCH.x, P_WATCH.y, 6, 1.6, ['#6a7a78', '#56666a', '#46545c'], '#c8d0b0', 10);
    const WT = { x: P_WATCH.x, base: P_WATCH.y };
    (function watchtower() {
      const cx = WT.x, base = WT.base, M = mat(['#2e3848', '#445062', '#a0a4a8', '#ffe0b0'], 0.28);
      trap(cx, base, base - 11, 2, 1.5, M);
      trap(cx, base - 12, base - 12, 2.5, 2.5, M, { topRim: true });
      for (let j = 0; j < 4; j++) for (let x = cx - 2 + Math.ceil(j * 0.6); x <= cx + 2 - Math.ceil(j * 0.6); x++) put(BACK, x, base - 14 - j, C(mix(x >= cx ? '#c86a5a' : '#4a2a3a', HAZE, 0.28)));
      put(BACK, cx, base - 18, C(mix('#4a2a3a', HAZE, 0.28)));
      WT.lx = cx; WT.ly = base - 13;
    })();

    // ---------- Obsidian Court: the volcano, now only smoking ----------
    patch(P_VOLC.x, P_VOLC.y + 1, 20, 4.5, ['#3a3040', '#2a2234', '#1e1828'], '#b08070', 11);
    const VC = { x: P_VOLC.x, base: P_VOLC.y + 1 };
    const LAVA_IDX = [];
    (function volcano() {
      const cx = VC.x, base = VC.base, top = base - 21, M = ['#120e1c', '#1e1828', '#4a3a4c', '#ffb878'].map(C), side = sideOf(cx);
      for (let y = top; y <= base; y++) {
        const s = (y - top) / (base - top), hw = 4 + 15 * Math.pow(s, 1.25) + 1.2 * (noise1(y / 2, 12) - 0.5);
        const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw);
        for (let x = x0; x <= x1; x++) {
          const rel = ((x - x0) / Math.max(1, x1 - x0)) * 2 - 1, sw = rel * side;
          let c = sw > 0.86 ? M[3] : sw > 0.55 ? M[2] : sw < -0.3 ? M[0] : M[1];
          if (hash(x, y >> 1) > 0.9 && sw < 0.5) c = M[2];
          if (y === top && Math.abs(x - cx) > 1.5) c = M[3];
          put(BACK, x, y, c);
        }
      }
      for (let x = cx - 2; x <= cx + 2; x++) { put(BACK, x, top, C('#ff9a40')); put(BACK, x, top + 1, C('#c83a24')); }
      // Two thin lava seams, cooling.
      for (const [dx0, dir] of [[-1, -0.55], [1, 0.4]]) {
        let x = cx + dx0;
        for (let y = top + 2; y < base - 3; y++) {
          x += dir + (hash(y, dx0 + 20) - 0.5) * 0.8;
          LAVA_IDX.push(y * W + Math.round(x));
        }
      }
      SMOKES.push({ x: cx, y: top - 1, n: 16, k: 6, rise: 34, drift: 18, r: 3.5, cols: ['#8a7a8e', '#6a6080'], a: 0.32 });
    })();

    // ---------- Forked Gulch: the forked red butte ----------
    patch(P_BUTTE.x, P_BUTTE.y, 12, 3, ['#c8744c', '#a45a3e', '#824636'], '#ffc890', 12);
    (function butte() {
      const cx = P_BUTTE.x, base = P_BUTTE.y, M = mat(['#4a1e30', '#8a3a32', '#d8744a', '#ffc88e'], 0.06);
      trap(cx, base, base - 9, 8.5, 6.5, M, { bands: 3 });
      trap(cx - 3, base - 10, base - 22, 3, 2, M, { topRim: true, bands: 3 });
      trap(cx + 3.5, base - 10, base - 18, 2.5, 1.8, M, { topRim: true, bands: 3 });
      trap(cx, base - 10, base - 11, 6, 6, M);
      // Scrub at its foot.
      for (const dx of [-9, -6, 7, 10]) { put(BACK, cx + dx, base, C('#5a6a3a')); put(BACK, cx + dx, base - 1, C('#8a9a4a')); }
    })();

    // ---------- Royal Palace: marble dome and crown ----------
    patch(P_PALACE.x, P_PALACE.y, 11, 2.4, ['#d8d0e0', '#b0a8c8', '#9088b0'], '#fff4d0', 13);
    const CROWN = [];
    (function palace() {
      const cx = P_PALACE.x, base = P_PALACE.y, M = mat(['#5a5480', '#8c86b0', '#e8e0f0', '#fffbea'], 0.1), side = sideOf(cx);
      // Colonnade: a marble block with dark gaps between its columns.
      trap(cx, base, base - 4, 8, 8, M);
      trap(cx, base - 5, base - 5, 9, 9, M, { topRim: true });
      for (let x = cx - 6; x <= cx + 6; x += 3) for (let y = base - 3; y <= base - 1; y++) put(BACK, x, y, C(mix('#3e3864', HAZE, 0.1)));
      // Drum and a tall onion-ish dome.
      trap(cx, base - 6, base - 7, 4.5, 4.5, M);
      const dcy = base - 8, dr = 5.5;
      for (let y = dcy - 8; y <= dcy; y++) for (let x = cx - 6; x <= cx + 6; x++) {
        const dx = x - cx, dy = y - dcy, d = Math.hypot(dx, dy * 0.75);
        if (d > dr || dy > 0) continue;
        const l = (dx * side) / dr * 0.75 - dy / dr * 0.35;
        put(BACK, x, y, d > dr - 1.1 && l > 0.15 ? M[3] : l > 0.3 ? M[2] : l < -0.3 ? M[0] : M[1]);
      }
      // The crown on top: a gold band, three points, a gem on each point (never a cross).
      const g = ['#8a5a28', '#e0a840', '#ffe890'].map(C), yb = dcy - 8;
      for (let x = cx - 3; x <= cx + 3; x++) {
        put(BACK, x, yb, (x - cx) * side > 0 ? g[2] : g[1]); CROWN.push(yb * W + x);
        put(BACK, x, yb + 1, g[0]);
      }
      for (const dx of [-3, 0, 3]) { put(BACK, cx + dx, yb - 1, g[dx * side > 0 ? 2 : 1]); CROWN.push((yb - 1) * W + cx + dx); }
      put(BACK, cx, yb - 2, g[1]); put(BACK, cx, yb - 3, C('#ff6a8a'));
      put(BACK, cx - 3, yb - 2, C('#8ac8ff')); put(BACK, cx + 3, yb - 2, C('#8ac8ff'));
      // Corner towers with pennants.
      for (const dx of [-8, 8]) {
        trap(cx + dx, base - 6, base - 9, 1.2, 1.2, M, { topRim: true });
        for (let y = base - 14; y <= base - 10; y++) put(BACK, cx + dx, y, C('#3a3050'));
        BANNERS.push({ x: cx + dx + 1, y: base - 14, len: 4, h: 2, cols: ['#6a8aff', '#3e54c0', '#2a3480'] });
      }
      WINDOWS.push({ x: cx - 5, y: base - 2 }, { x: cx + 4, y: base - 2 });
    })();

    // ---------- Clockwork Citadel: the brass clock tower ----------
    patch(P_CLOCK.x, P_CLOCK.y, 7, 1.8, ['#8a7058', '#6a5448', '#54443e'], '#f0c070', 14);
    const CK = {};
    (function clocktower() {
      const cx = P_CLOCK.x, base = P_CLOCK.y, M = mat(['#3a2a30', '#7a5634', '#e0ae5a', '#fff0b4'], 0.22);
      trap(cx, base, base - 16, 2.6, 2, M, { bands: 5 });
      trap(cx, base - 17, base - 17, 3, 3, M, { topRim: true });
      for (let j = 0; j < 4; j++) { const hw = 2 - j * 0.6; for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) put(BACK, x, base - 18 - j, (x - cx) * sideOf(cx) < 0 ? M[1] : M[3]); }
      put(BACK, cx, base - 22, M[3]);
      CK.x = cx; CK.y = base - 12;
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
        const d = Math.hypot(x, y);
        if (d <= 2.3) put(BACK, cx + x, CK.y + y, d > 1.6 ? M[2] : C('#fff4d4'));
      }
      put(BACK, cx, CK.y, C('#3a2a30'));
      for (let y = base - 7; y <= base - 3; y++) put(BACK, cx + 3, y, M[1]);
      SMOKES.push({ x: cx + 3, y: base - 8, n: 8, k: 10, rise: 14, drift: 8, r: 1.6, cols: ['#fff4ec', '#d8cce0'], a: 0.45 });
    })();

    // ---------- Grand Library: the domed library ----------
    patch(P_LIB.x, P_LIB.y, 7, 1.5, ['#7a6a70', '#645866', '#544a5c'], '#e8c8a0', 15);
    (function library() {
      const cx = P_LIB.x, base = P_LIB.y, M = mat(['#3e3a58', '#6a6480', '#d0c0b4', '#ffeec4'], 0.3);
      trap(cx, base, base - 3, 5, 5, M, { topRim: true });
      const D2 = mat(['#1e3a44', '#2e5a5e', '#7ab0a0', '#fff0c0'], 0.3), side = sideOf(cx);
      for (let y = base - 7; y <= base - 4; y++) for (let x = cx - 3; x <= cx + 3; x++) {
        const dx = x - cx, dy = y - (base - 4), d = Math.hypot(dx, dy * 1.15);
        if (d > 3.3) continue;
        const l = (dx * side) / 3 * 0.7 - dy / 3 * 0.4;
        put(BACK, x, y, d > 2.4 && l > 0.1 ? D2[3] : l > 0.2 ? D2[2] : l < -0.3 ? D2[0] : D2[1]);
      }
      put(BACK, cx, base - 8, D2[3]);
      WINDOWS.push({ x: cx - 3, y: base - 1 }, { x: cx - 1, y: base - 1 }, { x: cx + 1, y: base - 1 }, { x: cx + 3, y: base - 1 });
    })();

    // ---------- waterfalls off the board into the clouds ----------
    // Each: a column range that pours from y0 to y1 (per frame, streaks run down).
    const FALLS = [];
    function fall(x, w, y0, y1, face) {
      const pix = [];
      for (let y = y0; y <= y1; y++) {
        const ww = w + (y - y0) / 14;
        for (let dx = 0; dx < ww; dx++) pix.push({ x: Math.round(x - (ww - w) / 2 + dx), y, e: dx === 0 || dx >= Math.floor(ww) - 1 });
      }
      FALLS.push({ pix, x: x + w / 2, y1, face });
      if (face) for (let dx = 0; dx < w; dx++) { put(BACK, x + dx, NEAR_Y - 1, C('#8ab0e8')); put(BACK, x + dx, NEAR_Y, C('#e8f4ff')); }
    }
    fall(92, 3, NEAR_Y + 1, 190, true);
    fall(236, 3, NEAR_Y + 1, 190, true);
    fall(Math.round(160 - edgeHW(146)) - 2, 2, 147, 186, false);
    fall(Math.round(160 + edgeHW(150)) + 1, 2, 151, 188, false);
    const WF = ['#5a64b0', '#8c9ce0', '#c8d8ff', '#f4f8ff'].map(C);

    // ---------- the dormant crystal ----------
    const CR = { x: 288, y: 54 };
    const CRYS = [];
    for (let j = -11; j <= 11; j++) {
      const hw = j < -5 ? 4 * (11 + j) / 6 : j > 5 ? 4 * (11 - j) / 6 : 4;
      for (let x = Math.round(-hw); x <= Math.round(hw); x++) {
        const rel = hw < 0.5 ? 0 : x / hw;
        let c = rel < -0.5 ? '#6a3a8a' : rel < 0 ? '#9a5ab8' : rel < 0.5 ? '#d09ae4' : '#f6dcff';
        if (Math.abs(x) === Math.round(hw)) c = x < 0 ? '#4a2a6a' : '#fff0ff';
        if (x === 0 && Math.abs(j) < 8) c = '#e8b8f4';
        CRYS.push({ dx: x, dy: j, c: C(c) });
      }
    }
    const CRYS_BITS = [0, 1, 2].map(i => ({ a: i / 3 * TAU, r: 10 + i * 2.5, k: 1 + i }));

    // ---------- light: rays and vignette ----------
    const RBIN = new Uint16Array(W * H), RD = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, dx = x - SX, dy = y - SY, d = Math.hypot(dx, dy);
      RBIN[i] = Math.floor((Math.atan2(dy, dx) + Math.PI) / TAU * 720) % 720;
      RD[i] = d < SR + 4 ? 0 : Math.exp(-d / 90) * 1.2 * clamp((HY + 1 - y) / 10);
    }
    const RAYS = [-2.95, -2.5, -2.05, -1.65, -1.2, -0.75, -0.35, -0.12].map((a, i) => ({ a, w: 0.07 + hash(i, 44) * 0.07, k: 2 + (i % 4), p: hash(i, 45) * TAU }));
    const SG_I = [], SG_D = [];          // the sunrise glow: distance (in glow radii) per pixel
    for (let y = HY + 6 - 76; y <= HY + 6 + 76; y++) for (let x = SX - 76; x <= SX + 76; x++) {
      const d = Math.hypot(x - SX, (y - HY - 6) * 1.3) / 70;
      if (d < 1.08 && Math.hypot(x - SX, y - SY) > SR + 1.5 && x >= 0 && x < W && y >= 0 && y < H) { SG_I.push(y * W + x); SG_D.push(d); }
    }
    const SUNGLOW = C('#ffd08a'), RAYC = C('#ffe6a8'), RLUT = new Float32Array(720);
    const VIG_I = [], VIG_A = [], VIGC = C('#0c0a26');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = ((x - W / 2) / (W / 2)) ** 2 * 0.5 + ((y - H / 2) / (H / 2)) ** 2 * 0.62;
      const lv = Math.floor(clamp((v - 0.36) * 1.6) * 4);        // 0..4 steps
      if (lv > 0) { VIG_I.push(y * W + x); VIG_A.push(lv * 0.08); }
    }
    const vignette = b => { for (let n = 0; n < VIG_I.length; n++) blend(b, VIG_I[n], VIGC, VIG_A[n]); };

    // ---------- particles ----------
    const MOTES = Array.from({ length: 44 }, (_, i) => ({
      x: 8 + hash(i, 61) * 304, y0: 118 + hash(i, 62) * 40, k: 2 + (i % 3), p: hash(i, 63), sw: hash(i, 64) * TAU,
      rise: 40 + hash(i, 65) * 50, big: i % 6 === 0,
    }));
    const BIRDS = Array.from({ length: 5 }, (_, i) => ({ row: Math.ceil(i / 2), sgn: i % 2 ? 1 : -1, ph: i * 1.3 }));

    // ---------- per-frame drawing ----------
    const STAR = C('#fff6e4'), STAR2 = C('#aeb0e8');
    const AUR1 = C('#7ef0c8'), AUR2 = C('#b89cff');
    const SAIL = C('#ffe6c0'), SAIL2 = C('#d8b0a8'), SAILF = C('#5a3e50'), SPAR = C('#2a1e36');
    const WIN = ['#ff9a40', '#ffc860', '#fff0a0'].map(C);
    const BIRD = C('#2c2454');
    const GLINT = C('#fffff4'), GLINT2 = C('#ffeaa4');
    const LAVA = ['#6a1e24', '#c8401e', '#ff8a30'].map(C);
    const MIST = C('#c8c4d8'), SPRAY = C('#e8ecff');
    const M1 = C('#fff8dc'), M2 = C('#ffd88c');

    function drawSea(L, u) {
      const { s } = L, off = Math.floor(frac(L.k * u) * s.P + 1e-6) % s.P;   // epsilon: exact at whole pixels, on either loop
      for (let y = 0; y < s.h; y++) {
        const yy = L.y + y; if (yy < 0 || yy >= H) continue;
        const row = y * s.P, o = yy * W;
        for (let x = 0; x < W; x++) {
          const sx = (x - off + s.P) % s.P, v = s.tone[WARMSEL[o + x]][row + sx];
          if (v) buf[o + x] = v;
        }
      }
    }

    function frame(t) {
      const u = t / LOOP;
      buf.set(SKYB);

      // The last stars.
      for (const s of STARS) {
        const b = Math.sin(TAU * s.k * u + s.p);
        if (b > 0.3) put(buf, s.x, s.y, b > 0.85 ? STAR : STAR2);
        if (s.big && b > 0.75) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blendAt(buf, s.x + dx, s.y + dy, STAR2, 0.45);
      }
      // A faint aurora: two ribbons of soft light in the cold corners, breathing in and out
      // twice per loop. Flat low-alpha bands (no dithering), a brighter hem at the bottom.
      {
        const fade = 0.5 + 0.5 * Math.sin(TAU * 2 * u - 1);
        if (fade > 0.08) for (let x = 0; x < W; x++) {
          const side = clamp(Math.abs(x - SX) / 70 - 0.35);
          if (side <= 0) continue;
          const yb = 26 + 6 * Math.sin(x / 41 + TAU * u) + 3 * Math.sin(x / 17 - TAU * 3 * u);
          const hgt = 12 + 5 * Math.sin(x / 23 + TAU * 2 * u);
          const ray = 0.6 + 0.4 * Math.sin(x * 0.21 + TAU * 4 * u);
          const lvl = fade * side * ray;
          for (let y = Math.max(0, Math.floor(yb - hgt)); y <= yb; y++) {
            const v = (1 - (yb - y) / hgt) * lvl;
            if (v < 0.12) continue;
            blend(buf, y * W + x, yb - y < 2.5 ? AUR1 : AUR2, v > 0.45 ? 0.2 : 0.1);
          }
        }
      }
      for (const cl of CLOUDS) K.blit(buf, cl.c, Math.round(frac(cl.x0 / CLOUD_SPAN + cl.k * u) * CLOUD_SPAN) - 130, cl.y);
      // The crystal, dormant: a slow pulse and a gentle bob.
      {
        const bob = Math.round(2 * Math.sin(TAU * 4 * u)), pulse = 0.5 + 0.5 * Math.sin(TAU * 3 * u);
        K.glow(buf, CR.x, CR.y + bob, 20, C('#d880ff'), 0.12 + 0.1 * pulse);
        for (const b of CRYS_BITS) {
          const a = b.a + TAU * b.k * u, x = CR.x + Math.cos(a) * b.r, y = CR.y + bob + Math.sin(a) * 3;
          if (Math.sin(a) < 0) { put(buf, x, y, C('#9a60c0')); put(buf, x, y + 1, C('#6a3a90')); }
        }
        for (const p of CRYS) put(buf, CR.x + p.dx, CR.y + bob + p.dy, p.c);
        if (pulse > 0.6) put(buf, CR.x + 1, CR.y + bob - 3, GLINT);
        for (const b of CRYS_BITS) {
          const a = b.a + TAU * b.k * u, x = CR.x + Math.cos(a) * b.r, y = CR.y + bob + Math.sin(a) * 3;
          if (Math.sin(a) >= 0) { put(buf, x, y, C('#f4c8ff')); put(buf, x, y + 1, C('#b474cc')); }
        }
      }
      // Birds crossing, twice per loop.
      {
        const bu = frac(2 * u), bx = -40 + bu * (W + 100), by = 44 + 6 * Math.sin(bu * TAU);
        for (const b of BIRDS) {
          const x = Math.round(bx - b.row * 6), y = Math.round(by + b.sgn * b.row * 3 + Math.sin(TAU * 20 * u + b.ph) * 0.6);
          const up = Math.sin(TAU * 240 * u + b.ph) > 0;
          const pts = up ? [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]] : [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]];
          for (const [dx, dy] of pts) put(buf, x + dx, y + dy, BIRD);
        }
      }

      // The sea of clouds, far to near (the board floats between the low and near banks).
      drawSea(SEAS[0], u); drawSea(SEAS[1], u); drawSea(SEAS[2], u);

      // Sun rays, in the air only.
      RLUT.fill(0);
      for (const r of RAYS) {
        const amp = 0.5 + 0.5 * Math.sin(TAU * r.k * u + r.p);
        for (let bn = 0; bn < 720; bn++) {
          const ang = bn / 720 * TAU - Math.PI;
          let da = Math.abs(ang - r.a); if (da > Math.PI) da = TAU - da;
          const v = 1 - da / r.w;
          if (v > 0) RLUT[bn] = Math.min(1, RLUT[bn] + v * amp);
        }
      }
      for (let i = 0; i < (HY + 2) * W; i++) {
        const f = RLUT[RBIN[i]] * RD[i];
        if (f > 0.16) blend(buf, i, RAYC, f > 0.45 ? 0.14 : 0.07);
      }

      over(buf, BACK);
      // Warm light breathing out of the sunrise over the far board and the horizon.
      {
        const re = 1 + 0.08 * Math.sin(TAU * 3 * u);
        for (let n = 0; n < SG_I.length; n++) {
          const lv = Math.floor(sq(clamp(1 - SG_D[n] / re)) * 4);
          if (lv > 0) blend(buf, SG_I[n], SUNGLOW, lv * 0.06);
        }
      }

      // Glare sparkling on the polished squares.
      for (let n = 0; n < GLARE_IDX.length; n++) {
        const i = GLARE_IDX[n], x = i % W, y = (i / W) | 0;
        const s = Math.sin(TAU * 30 * u + hash(x >> 1, y) * TAU);
        if (s > 0.992) buf[i] = GLINT; else if (s > 0.975) buf[i] = GLINT2;
      }
      // Gold glints running round the rim.
      {
        const N = RIM_PATH.length;
        for (let g = 0; g < 3; g++) {
          const head = Math.floor(frac(2 * u + g / 3) * N + 1e-6) % N;
          for (let d = -5; d <= 5; d++) {
            const i = RIM_PATH[(head + d + N) % N], a = Math.abs(d);
            if (a <= 1) buf[i] = GLINT; else if (a <= 3) buf[i] = GLINT2; else blend(buf, i, GLINT2, 0.5);
          }
        }
      }
      // The crown catching the light.
      if (Math.sin(TAU * 8 * u) > 0.9) for (const i of CROWN) blend(buf, i, GLINT, 0.7);

      // Windmill sails: twelve quarter turns per loop.
      {
        const a0 = TAU / 4 * 12 * u;
        for (let k = 0; k < 4; k++) {
          const a = a0 + k * Math.PI / 2, dx = Math.cos(a), dy = Math.sin(a), qx = -dy, qy = dx;
          for (let r = 4; r <= 18; r += 0.5) for (let s = 0.5; s <= 4.5; s += 0.5) {
            const x = WM.hx + dx * r + qx * s, y = WM.hy + dy * r + qy * s;
            const onFrame = s >= 4.5 || r >= 17.5 || (r % 4.5) < 0.5;
            put(buf, x, y, onFrame ? SAILF : s < 2.5 ? SAIL : SAIL2);
          }
          for (let r = 0; r <= 19; r += 0.5) put(buf, WM.hx + dx * r, WM.hy + dy * r, SPAR);
        }
        for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) put(buf, WM.hx + x, WM.hy + y, x === 1 && y === -1 ? C('#ffc890') : SPAR);
      }
      // Banners and pennants flapping.
      BANNERS.forEach((b, n) => {
        const cols = b.cols.map(C);
        for (let i = 0; i < b.len; i++) {
          const wv = Math.round(Math.sin(TAU * 40 * u - i * 0.9 + n) * (i / b.len) * 1.5);
          const hh = Math.max(1, b.h - Math.floor(i / b.len * (b.h - 0.5)));
          for (let j = 0; j < hh; j++) put(buf, b.x + i, b.y + j + wv, cols[j === 0 ? 0 : j === hh - 1 ? 2 : 1]);
        }
      });
      // Warm windows and the watchtower lantern.
      WINDOWS.forEach((w, n) => {
        const f = 0.5 + 0.28 * Math.sin(TAU * 37 * u + n * 2.1) + 0.22 * Math.sin(TAU * 91 * u + n * 5.3);
        put(buf, w.x, w.y, WIN[f > 0.72 ? 2 : f > 0.38 ? 1 : 0]);
      });
      {
        const f = 0.55 + 0.25 * Math.sin(TAU * 43 * u) + 0.2 * Math.sin(TAU * 101 * u);
        K.glow(buf, WT.lx, WT.ly, 5, WIN[1], 0.3 * f);
        put(buf, WT.lx, WT.ly, WIN[f > 0.7 ? 2 : 1]);
      }
      // Mist curling round the watchtower's foot.
      for (let n = 0; n < 7; n++) {
        const v = frac(3 * u + n / 7), x = WT.x - 12 + v * 24, y = WT.base - 1 + Math.sin(TAU * v + n) * 1.2, r = 1.5 + Math.sin(Math.PI * v) * 1.8;
        const a = Math.sin(Math.PI * v) * 0.35;
        for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r * 1.6); xx <= x + r * 1.6; xx++)
          if (sq((xx - x) / 1.6) + sq(yy - y) <= r * r) blendAt(buf, xx, yy, MIST, a);
      }
      // Cooling lava seams on the volcano.
      for (let n = 0; n < LAVA_IDX.length; n++) {
        const v = Math.sin(TAU * 4 * u - n * 0.35);
        buf[LAVA_IDX[n]] = LAVA[v > 0.6 ? 2 : v > -0.2 ? 1 : 0];
      }
      // Smoke and steam.
      for (const sm of SMOKES) {
        const c0 = C(sm.cols[0]), c1 = C(sm.cols[1]);
        for (let i = 0; i < sm.n; i++) {
          const v = frac(sm.k * u + i / sm.n);
          const x = sm.x + v * sm.drift + Math.sin(v * 5 + i) * 1.5 * v, y = sm.y - v * sm.rise, r = 0.6 + v * sm.r;
          const a = (1 - v) * sm.a * Math.min(1, v * 6);
          for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++)
            if (sq(xx - x) + sq(yy - y) <= r * r) blendAt(buf, xx, yy, v < 0.4 ? c0 : c1, a);
        }
      }
      // The clock's minute hand: ten turns per loop.
      {
        const a = TAU * 10 * u - Math.PI / 2;
        put(buf, CK.x + Math.round(Math.cos(a) * 1.4), CK.y + Math.round(Math.sin(a) * 1.4), C('#3a2a30'));
      }

      // Waterfalls pouring into the clouds.
      for (const f of FALLS) {
        for (const p of f.pix) {
          const s = frac((p.y - f.pix[0].y) / 9 - 12 * u + hash(p.x, 7) * 0.7);
          buf[p.y * W + p.x] = p.e ? WF[s > 0.7 ? 1 : 0] : WF[s > 0.82 ? 3 : s > 0.45 ? 2 : 1];
        }
      }

      drawSea(SEAS[3], u);

      // Spray where the falls meet the clouds.
      for (const f of FALLS) for (let n = 0; n < 6; n++) {
        const v = frac(8 * u + n / 6), x = f.x + (n - 2.5) * 1.6 + Math.sin(v * 6 + n) * 1.5, y = f.y1 - v * 6;
        const r = 1 + v * 2.2;
        for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++)
          if (sq(xx - x) + sq(yy - y) <= r * r) blendAt(buf, xx, yy, SPRAY, (1 - v) * 0.35);
      }

      // Motes of light rising off the board.
      for (const m of MOTES) {
        const v = frac(m.k * u + m.p);
        const x = m.x + Math.sin(v * 5 + m.sw) * 4, y = m.y0 - v * m.rise;
        const tw = Math.sin(Math.PI * v);
        if (tw < 0.15) continue;
        if (m.big && tw > 0.6) {
          put(buf, x, y, M1);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blendAt(buf, x + dx, y + dy, M2, 0.55 * tw);
        } else if (tw > 0.55) put(buf, x, y, M1);
        else blendAt(buf, x, y, M2, 0.7);
      }

      vignette(buf);
    }

    return (t, out) => { buf = out; frame(t); };
  },
});
