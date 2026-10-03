// Chess 2.0: the Great Board at dusk, the game's own theme (the one a new player sees first).
//
// 320x200 (exactly 4x smaller than the game's 1280x800), drawn in code and scaled up with
// nearest-neighbour. The sun has just gone down behind the Great Board, which floats over
// a sea of clouds, tipped a little towards us. Two giant pieces stand on it like monuments:
// the golden queen of the app icon on the left, a violet king with a gold crown (points,
// balls and an orb, never a cross) on the right, and smaller pearl and violet pieces
// between them. Everything is backlit by the afterglow: warm gold rims on the pieces and
// the board's frame against violet shade, first stars and a crescent moon in the deep sky
// above. "2.0" is engraved in gold on the board's front, and the board is cracked at its
// edges, where the rifts glow magenta and cyan.
// Moves: four layers of the cloud sea roll by, thin clouds drift, the afterglow's rays
// breathe, stars twinkle, a shooting star falls three times a loop, the rifts pulse and
// light the rock and the clouds under them, their sparks drift up, gold motes rise off the
// board, a shine runs down the queen and her finial glints, the king's gem turns magenta
// and cyan, glints run along the gold frame, "2.0" shimmers, glare sparkles on the far
// squares and broken tiles bob in the air around the board. Every motion runs a whole
// number of cycles per loop, so the 120-second loop is seamless.
LiveScenes.register({
  id: 'chess20',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over } = K;
    let buf = null;

    // A ramp whose steps dither only in a narrow seam, for clean wide bands.
    const crisp = (cols, t, x, y) => {
      t = clamp(t) * (cols.length - 1);
      const i = t | 0, f = clamp((t - i - 0.5) * 3.5 + 0.5);
      return cols[Math.min(cols.length - 1, i + (f > bay(x, y) ? 1 : 0))];
    };

    // ---------- geometry ----------
    const HY = 112;                          // the cloud horizon
    const SX = 160, SY = 118, SR = 10;       // the sun, just gone down behind the board
    // The board, tipped towards us: rows run from Z = ZN (near edge) to ZN + 8 (far edge),
    // y = VY + AY / Z, x = 160 + FX * X / Z, with X in squares from -4 to 4.
    const VY = 40, ZN = 20.903, AY = 2341.2, FX = 658.4;
    const boardY = Z => VY + AY / Z;
    const boardX = (X, Z) => 160 + FX * X / Z;
    const FAR_Y = 121, NEAR_Y = 152;
    const edgeHW = y => FX * 4 * (y - VY) / AY;      // half-width of the top face at row y

    const SKYB = new Uint32Array(W * H);   // sky, sun, moon (opaque)
    const BACK = new Uint32Array(W * H);   // board, rock and pieces (0 = transparent)
    const TOP = new Uint8Array(W * H);     // 1 = board top face
    const SHADOW = new Float32Array(W * H);

    // ---------- sky: deep violet above, rose, then amber afterglow on the horizon ----------
    const SKY = ['#0a0720', '#100b2c', '#170f3a', '#1f1348', '#291754', '#351b60', '#43206c', '#532676',
      '#652c7e', '#793284', '#8e3a88', '#a44488', '#b85086', '#ca5e80', '#da6e7a', '#e68272', '#f0986c',
      '#f8b06c', '#fec878', '#ffdc96', '#ffeebc'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const yy = Math.min(y, HY + 4);
      const d = Math.hypot(x - SX, (yy - SY) * 1.7);
      const t = Math.pow(yy / (HY + 4), 1.25) * 0.8 + 0.2 * Math.exp(-sq(d / 120)) + 0.17 * Math.exp(-sq(d / 40));
      SKYB[y * W + x] = crisp(SKY, t, x, y);
    }
    // The sun's last sliver (mostly hidden by the clouds and the board).
    for (let y = SY - SR - 3; y <= SY + SR; y++) for (let x = SX - SR - 3; x <= SX + SR + 3; x++) {
      const d = Math.hypot(x - SX, y - SY);
      if (d < SR - 3) put(SKYB, x, y, C('#fff2c4'));
      else if (d < SR - 0.5) put(SKYB, x, y, C('#ffd48a'));
      else if (d < SR + 1) put(SKYB, x, y, C('#ffb066'));
    }
    // A thin crescent moon, high on the right, with a faint halo.
    const MX = 290, MY = 22, MR = 6;
    for (let y = MY - 16; y <= MY + 16; y++) for (let x = MX - 16; x <= MX + 16; x++) {
      const d = Math.hypot(x - MX, y - MY);
      if (d < 15 && d > MR + 0.5) {
        const lv = Math.floor((1 - d / 15) * 3);
        if (lv > 0 && x >= 0 && x < W && y >= 0) blend(SKYB, y * W + x, C('#6a4aa0'), lv * 0.12);
      }
    }
    for (let y = MY - MR; y <= MY + MR; y++) for (let x = MX - MR; x <= MX + MR; x++) {
      const d = Math.hypot(x - MX, y - MY), d2 = Math.hypot(x - MX + 2.6, y - MY + 1.6);
      if (d > MR || d2 < MR - 0.4) continue;
      put(SKYB, x, y, d2 < MR + 0.8 ? C('#f2dcc0') : d > MR - 1 ? C('#fff0d4') : C('#fffaec'));
    }
    const STARS = [];
    for (let i = 0; STARS.length < 70 && i < 600; i++) {
      const x = hash(i, 901) * W | 0, y = (Math.pow(hash(i, 902), 1.5) * 78) | 0;
      if (Math.hypot(x - SX, (y - SY) * 1.7) < 150) continue;       // too bright near the afterglow
      if (Math.hypot(x - MX, y - MY) < 12) continue;
      STARS.push({ x, y, k: 6 + (hash(i, 903) * 30 | 0), p: hash(i, 904) * TAU, big: hash(i, 905) > 0.88,
        c: hash(i, 906) > 0.7 ? 1 : hash(i, 906) > 0.45 ? 2 : 0 });
    }
    const STARC = ['#fff6e4', '#c8c0ff', '#b8f0ff'].map(C), STARD = C('#8a7ab8');

    // ---------- thin dusk clouds: long lenses lit pink-gold from below ----------
    function lens(w, h, seed, pal) {
      const P = pal.map(C);       // [top edge, body, underside, hem]
      const px = new Uint32Array(w * h);
      for (let x = 0; x < w; x++) {
        const e = Math.sin(Math.PI * (x + 0.5) / w);
        const th = h * Math.pow(e, 0.7) * (0.55 + 0.45 * noise1(x / 7, seed));
        if (th < 1) continue;
        const bot = h - 1 - Math.round((1 - e) * 1.2), top = Math.round(bot - th + 1);
        for (let y = Math.max(0, top); y <= bot; y++) {
          const db = bot - y;
          px[y * w + x] = db === 0 ? P[3] : db === 1 ? P[2] : y === top ? P[0] : P[1];
        }
      }
      return { w, h, px };
    }
    const LPAL_HI = ['#8a5c9c', '#5a3a7e', '#9a5890', '#e08aa0'];
    const LPAL_LO = ['#b0709a', '#7e4a88', '#d27c92', '#ffc49a'];
    const LENSES = [
      { c: lens(90, 6, 11, LPAL_HI), x0: 10, y: 62, k: 1 },
      { c: lens(60, 5, 12, LPAL_HI), x0: 250, y: 56, k: 1 },
      { c: lens(120, 7, 13, LPAL_LO), x0: 150, y: 84, k: 2 },
      { c: lens(70, 6, 14, LPAL_LO), x0: 360, y: 92, k: 2 },
      { c: lens(50, 5, 15, LPAL_LO), x0: 60, y: 98, k: 2 },
    ];
    const LENS_SPAN = 480;

    // ---------- the sea of clouds: tileable strips, rolled sideways per frame ----------
    // Round puffs over a solid bank, cel-shaded: backlit tops carry a gold-rose lining,
    // shade below turns violet; troughs where a nearer puff overlaps are darkest. A warm and
    // a cool version of each strip: the warm one is used near the afterglow.
    function seaStrip(P, h, base, n, r0, r1, jit, seed, pal) {
      const PU = [];
      for (let i = 0; i < n; i++) {
        const r = r0 + hash(i, seed + 1) * (r1 - r0);
        PU.push({ cx: (i + 0.5 + (hash(i, seed) - 0.5) * 0.7) * P / n, cy: base - r * 0.3 + hash(i, seed + 2) * jit, r });
      }
      PU.sort((a, b) => a.cy - b.cy);
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
    const SEA_FAR = seaStrip(320, 36, 7, 32, 2.5, 5, 2, 131, {
      warm: { rim: '#fff0c4', edge: '#ffd29a', body: ['#f4aa88', '#dc9088', '#bc7a8c', '#9c6a8e', '#86608c'] },
      cool: { rim: '#f4b8a8', edge: '#d8969e', body: ['#b0749a', '#966494', '#7e588e', '#6c5088', '#5e4a82'] },
    });
    const SEA_MID = seaStrip(400, 44, 12, 22, 5, 10, 4, 141, {
      warm: { rim: '#ffe4b0', edge: '#f8b690', body: ['#dc948c', '#bc7c8e', '#9a6a8e', '#7e5c8a', '#6a5284'] },
      cool: { rim: '#e4a8b0', edge: '#c08aa8', body: ['#946496', '#7c5890', '#684e88', '#584680', '#4c4078'] },
    });
    const SEA_LOW = seaStrip(480, 70, 16, 16, 7, 14, 6, 151, {
      warm: { rim: '#f8c8a8', edge: '#dca0a0', body: ['#a87494', '#8c648e', '#745888', '#604e80', '#524676'] },
      cool: { rim: '#c8a0c8', edge: '#a484bc', body: ['#7a5c98', '#66508e', '#564684', '#4a3e78', '#40386c'] },
    });
    const SEA_NEAR = seaStrip(640, 30, 17, 16, 9, 15, 3, 161, {
      warm: { rim: '#d8a8c8', edge: '#a882b4', body: ['#6c5096', '#5a4488', '#4a3a7a', '#3e326c', '#342a5e'] },
      cool: { rim: '#a890d4', edge: '#8470ba', body: ['#5a4890', '#4a3e82', '#3e3474', '#342c66', '#2a2458'] },
    });
    const SEAS = [
      { s: SEA_FAR, y: HY - 8, k: 1 }, { s: SEA_MID, y: HY + 1, k: 1 },
      { s: SEA_LOW, y: HY + 24, k: 1 }, { s: SEA_NEAR, y: 172, k: 1 },
    ];
    const WARMSEL = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const w = Math.exp(-sq((x - SX) / (90 + (y - HY) * 1.2))) * clamp(1.3 - (y - HY) / 90);
      const th = (bay(x, y) - 0.5) * 0.1;
      WARMSEL[y * W + x] = w > 0.6 + th ? 2 : w > 0.3 + th ? 1 : 0;
    }

    // ---------- the board's top face: pearl and twilight violet ----------
    const LSQH = ['#5c4a7e', '#76608e', '#927aa0', '#ae92aa', '#c8a8b0', '#dec0b8', '#eed4c0', '#f8e4c8', '#fff2d8'];
    const DSQH = ['#140c28', '#1c1234', '#261842', '#301e50', '#3e245c', '#4e2c68', '#62346e', '#7a4274', '#985476'];
    const LSQ = LSQH.map(C), DSQ = DSQH.map(C);
    const GLARE_IDX = [];
    // Piece shadows first (they darken the squares below).
    const CASTERS = [];
    const addCaster = (x, y, hw, len) => CASTERS.push([x, y, hw, len]);
    const Zof = y => AY / (y - VY);
    // Board squares, supersampled 4x4 per pixel so the seams stay straight.
    const squareAt = (xx, yy) => {
      if (yy <= VY) return -1;
      const Z = AY / (yy - VY), X = (xx - 160) * Z / FX, r = Z - ZN;
      if (Math.abs(X) > 4 || r < 0 || r > 8) return -1;
      return ((Math.floor(X + 4) + Math.floor(r)) & 1) ? 1 : 0;       // 1 = light (a1 is dark)
    };
    function paintTop() {
      for (let y = FAR_Y; y <= NEAR_Y; y++) for (let x = 0; x < W; x++) {
        let inside = 0, light = 0;
        for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
          const s = squareAt(x + (sx + 0.5) / 4, y + (sy + 0.5) / 4);
          if (s < 0) continue;
          inside++; light += s;
        }
        if (inside < 8) continue;
        const Z = Zof(y + 0.5), fz = clamp((Math.floor(Z - ZN) + 0.5) / 8);
        const wg = 22 + 70 * (1 - fz);
        const g = Math.exp(-sq((x + 0.5 - SX) / wg)) * (0.3 + 0.7 * fz * fz);
        const i = y * W + x;
        let b = 0.3 + 0.22 * fz + g * 0.62 - SHADOW[i] * 0.45;
        const isL = light * 2 >= inside;
        BACK[i] = isL ? crisp(LSQ, clamp(b + 0.06), x, y) : crisp(DSQ, clamp(b * 0.8 + g * 0.18), x, y);
        TOP[i] = 1;
        if (isL && g > 0.45 && SHADOW[i] < 0.1) GLARE_IDX.push(i);
      }
    }

    // ---------- gold: the frame, the pieces' trim ----------
    const GOLDH = ['#2a1224', '#4a2020', '#7a4018', '#b06e20', '#e0a430', '#ffd45a', '#fff0b0'];
    const GOLD = GOLDH.map(C);
    const GLINT = C('#fffff0'), GLINT2 = C('#ffeaa4');
    const RIM_PATH = [];

    function paintFrame() {
      // Far rim: a bright gold line against the afterglow.
      const fhw = edgeHW(FAR_Y);
      for (let x = Math.round(160 - fhw); x <= Math.round(160 + fhw); x++) {
        const c = Math.abs(x - SX) < 40 ? GOLD[6] : Math.abs(x - SX) < 80 ? GOLD[5] : GOLD[4];
        put(BACK, x, FAR_Y - 1, c); TOP[(FAR_Y - 1) * W + x] = 0;
      }
      // Side rims, down the converging edges.
      for (let y = FAR_Y; y <= NEAR_Y; y++) {
        const hw0 = edgeHW(y), hw1 = edgeHW(y + 1);
        for (const sgn of [-1, 1]) {
          const xa = Math.round(160 + sgn * hw0), xb = Math.round(160 + sgn * hw1);
          for (let x = Math.min(xa, xb); x <= Math.max(xa, xb); x++) {
            const i = y * W + x; BACK[i] = y < FAR_Y + 8 ? GOLD[5] : GOLD[4]; TOP[i] = 0;
          }
          const xi = sgn < 0 ? Math.max(xa, xb) + 1 : Math.min(xa, xb) - 1;
          if (TOP[y * W + xi]) BACK[y * W + xi] = GOLD[2];
        }
      }
      // The front face: gold lip, violet enamel with studs and "2.0", gold trim, shadow.
      const X0 = Math.round(160 - edgeHW(NEAR_Y)), X1 = Math.round(160 + edgeHW(NEAR_Y));
      const FACE = ['#3a2258', '#2e1a4a', '#24143e', '#1c0f32'].map(C);
      for (let x = X0; x <= X1; x++) {
        const dc = Math.abs(x - SX);
        put(BACK, x, NEAR_Y + 1, dc < 50 ? GOLD[6] : GOLD[5]); TOP[(NEAR_Y + 1) * W + x] = 0;
        put(BACK, x, NEAR_Y + 2, GOLD[3]);
        for (let y = NEAR_Y + 3; y <= NEAR_Y + 7; y++) put(BACK, x, y, crisp(FACE, (y - NEAR_Y - 3) / 5 + dc / 600, x, y));
        put(BACK, x, NEAR_Y + 8, GOLD[2]);
        put(BACK, x, NEAR_Y + 9, C('#140a20'));
      }
      for (let x = X0; x <= X1; x++) RIM_PATH.push((NEAR_Y + 1) * W + x);
      // Studs at the square seams.
      for (let k = -4; k <= 4; k++) {
        if (k === 0) continue;
        const sx = Math.round(160 + k * edgeHW(NEAR_Y) / 4) - (k > 0 ? 1 : 0);
        if (Math.abs(k) === 4) continue;
        put(BACK, sx, NEAR_Y + 4, GOLD[5]); put(BACK, sx + 1, NEAR_Y + 4, GOLD[3]);
        put(BACK, sx, NEAR_Y + 5, GOLD[3]); put(BACK, sx + 1, NEAR_Y + 5, GOLD[2]);
      }
      // End caps.
      for (let y = NEAR_Y + 1; y <= NEAR_Y + 8; y++) {
        put(BACK, X0, y, GOLD[4]); put(BACK, X0 + 1, y, GOLD[3]);
        put(BACK, X1, y, GOLD[2]); put(BACK, X1 - 1, y, GOLD[3]);
      }
      return { X0, X1 };
    }

    // "2.0" engraved on the front, with two diamonds either side.
    const GLYPHS = { '2': ['111', '001', '111', '100', '111'], '.': ['0', '0', '0', '0', '1'], '0': ['111', '101', '101', '101', '111'] };
    const ENGRAVE = [];
    function paintEngraving() {
      let gx = 160 - 4;
      const gy = NEAR_Y + 3;
      for (const ch of '2.0') {
        const g = GLYPHS[ch];
        g.forEach((row, j) => [...row].forEach((b, i) => {
          if (b !== '1') return;
          const x = gx + i, y = gy + j, idx = y * W + x;
          BACK[idx] = j < 2 ? GOLD[6] : GOLD[5];
          ENGRAVE.push(idx);
          if (y + 1 <= NEAR_Y + 7 && !g[j + 1]?.[i]?.includes('1')) BACK[idx + W] = C('#0e0618');
        }));
        gx += g[0].length + 1;
      }
      for (const dx of [-12, 12]) {
        const cx = 160 + dx - (dx > 0 ? 1 : 0), cy = gy + 2;
        // A filled diamond (a thin plus would read as a cross at this size).
        for (let j = -2; j <= 2; j++) for (let i = -(2 - Math.abs(j)); i <= 2 - Math.abs(j); i++) {
          put(BACK, cx + i, cy + j, j < 0 || (j === 0 && i < 0) ? GOLD[5] : GOLD[3]);
        }
        put(BACK, cx, cy, C('#ff7ad8'));
      }
    }

    // ---------- the underside: rock hanging into the clouds ----------
    const UTOP = NEAR_Y + 10;
    const ROCK = ['#7a4676', '#62386a', '#4c2c5a', '#3a2149', '#2a173a', '#1e0f2c'].map(C);
    const BOUNCE = C('#9a74b4');
    const UMASK = new Uint8Array(W * H);
    function paintRock(X0, X1) {
      const mid = (X0 + X1) / 2, half = (X1 - X0) / 2 - 3;
      const SPIKES = Array.from({ length: 10 }, (_, n) => ({ x: X0 + 14 + n * 25 + (hash(n, 76) - 0.5) * 12, d: 4 + hash(n, 77) * 10, w: 3 + hash(n, 78) * 3 }));
      const UB = new Int16Array(W).fill(-1);
      for (let x = X0 + 1; x < X1; x++) {
        const e = Math.abs(x - mid) / half; if (e > 1) continue;
        const body = UTOP + 2 + 30 * Math.pow(1 - e * e, 1.3) + 4 * (fbm1(x / 6, 71) - 0.5);
        let b = body;
        for (const sp of SPIKES) { const q = 1 - Math.abs(x - sp.x) / sp.w; if (q > 0) b = Math.max(b, body + sp.d * q * (1 - e * 0.5)); }
        UB[x] = Math.round(b);
      }
      for (let x = 0; x < W; x++) for (let y = UTOP; y <= Math.min(H - 1, UB[x]); y++) UMASK[y * W + x] = 1;
      for (let x = 0; x < W; x++) for (let y = UTOP; y <= Math.min(H - 1, UB[x]); y++) {
        const i = y * W + x, span = Math.max(4, UB[x] - UTOP), vy = (y - UTOP) / span;
        const fx = x + 4 * noise1(y / 6, 75), fi = Math.floor(fx / 9), ff = fx / 9 - fi;
        let t = 0.95 - vy * 0.5 + (hash(fi, 79) - 0.5) * 0.24;
        if (ff < 0.14) t -= 0.2;
        if (y - UTOP < 2) t = 1;
        if ((y + Math.floor(x / 9)) % 6 === 0 && noise1(x / 5, 80 + (y >> 3)) > 0.55) t += 0.2;
        let c = crisp(ROCK, t, x, y);
        if (y >= UB[x] - 1 && y > UTOP + 4) c = y === UB[x] ? BOUNCE : ROCK[1];
        else if ((!UMASK[i - 1] || !UMASK[i + 1]) && y > UTOP + 2) c = ROCK[1];
        BACK[i] = c;
      }
      // Gold ore, and pale crystals hanging from the crags.
      for (let n = 0; n < 7; n++) {
        const x = Math.round(X0 + 12 + hash(n, 84) * (X1 - X0 - 24)), y = Math.round(UTOP + 4 + hash(n, 85) * (UB[x] - UTOP - 7));
        if (!UMASK[y * W + x] || y >= UB[x] - 2) continue;
        put(BACK, x, y, GOLD[5]); put(BACK, x + 1, y, GOLD[3]); if (n % 3 === 0) put(BACK, x, y + 1, GOLD[2]);
      }
      for (const sp of SPIKES.filter((_, n) => n % 3 === 1)) {
        const x = Math.round(sp.x), y0 = UB[x];
        for (let j = 1; j <= 5; j++) { put(BACK, x, y0 + j, C(j < 3 ? '#ffd8f4' : '#e070c8')); if (j < 4) put(BACK, x + 1, y0 + j, C('#9a3a98')); }
      }
      return UB;
    }

    // ---------- the rifts: glowing cracks at the board's edges ----------
    const RIFTS = [];          // { px: [indices], col: [core, edge], k, p }
    function crack(x0, y0, n, drift, seed, col, onTop) {
      const px = [];
      let x = x0, y = y0;
      for (let s = 0; s < n; s++) {
        px.push([x, y]);
        const r = hash(s, seed);
        if (onTop) { x += drift; if (r > 0.55) y += r > 0.8 ? 1 : -1; }
        else { y += 1; if (r > 0.6) x += drift; else if (r < 0.2) x -= drift; }
        if (s === (n >> 1)) {                     // one short branch
          let bx = x, by = y;
          for (let b = 0; b < 4; b++) { bx += onTop ? drift : -drift; by += onTop ? (b % 2 ? 1 : 0) : 1; px.push([bx, by]); }
        }
      }
      RIFTS.push({ px: px.map(([a, b]) => b * W + a).filter(i => BACK[i] && !TOP[i] || onTop), pts: px, col: col.map(C), k: 3 + RIFTS.length, p: hash(seed, 3) * TAU, top: onTop });
    }

    // ---------- the pieces ----------
    const PIECE_MASK = new Uint8Array(W * H);
    const MAT = {
      gold: { ramp: GOLD, rim: C('#fff8dc'), cool: C('#b06ac0') },
      pearl: { ramp: ['#3a2a52', '#5c4a72', '#86709a', '#b09cb4', '#d6c4c8', '#f0e2d8', '#fffaf0'].map(C), rim: C('#fff0c0'), cool: C('#9a82d8') },
      violet: { ramp: ['#0c0618', '#170c2a', '#23143e', '#322052', '#463068', '#5e4284', '#7c5aa0'].map(C), rim: C('#ffcc84'), cool: C('#a04aa8') },
    };
    const LINE = C('#12081e');
    // Light from the afterglow behind the board: side = +1 lights the right edge.
    const shadeIdx = (q, lip, under, n) => {
      let L = 0.34 + 0.36 * q - 0.1 * q * q;
      if (lip) L += 0.24;
      if (under) L -= 0.3;
      if (q > 0.3 && q < 0.52 && !under) L += 0.18;
      return clamp(Math.floor(L * n + 0.5), 0, n - 1);
    };
    // A lathe body: prof rows [t0, t1, w0, w1, curve, lip] in units from the piece's top.
    function lathe(id, cx, by, sc, prof, height, mat, side, extra) {
      const top = by - height * sc;
      const HW = new Map();
      for (let y = Math.floor(top); y <= by; y++) {
        const t = (y + 0.5 - top) / sc;
        for (const [t0, t1, w0, w1, k, lip] of prof) {
          if (t < t0 || t >= t1) continue;
          const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
          HW.set(y, { w: (w0 + (w1 - w0) * Math.pow(f, k)) * sc, lip: lip && (y === Math.floor(top + t0 * sc) || y === Math.ceil(top + t0 * sc - 0.5)) });
          break;
        }
      }
      for (const [y, r] of HW) {
        const up = HW.get(y - 1), under = up && up.w > r.w + 1.5;
        for (let x = Math.floor(cx - r.w); x <= Math.ceil(cx + r.w); x++) {
          const nx = (x + 0.5 - cx) / r.w; if (Math.abs(nx) > 1) continue;
          const q = nx * side;
          let c;
          if (q > 0.8 && !under) c = mat.rim;
          else if (q < -0.86) c = mat.cool;
          else c = mat.ramp[shadeIdx(q, r.lip, under, mat.ramp.length)];
          if (extra) { const e = extra(x, y, nx, (y - top) / sc, r); if (e) c = e; }
          put(BACK, x, y, c); if (x >= 0 && x < W && y >= 0 && y < H) PIECE_MASK[y * W + x] = id;
        }
      }
      return top;
    }
    function ball(id, bx, by, r, mat, side) {
      for (let y = Math.floor(by - r); y <= by + r; y++) for (let x = Math.floor(bx - r); x <= bx + r; x++) {
        const nx = (x + 0.5 - bx) / r, ny = (y + 0.5 - by) / r, d = Math.hypot(nx, ny);
        if (d > 1) continue;
        const q = nx * side;
        let c;
        if (d > 0.72 && q > 0.45) c = mat.rim;
        else if (d > 0.8 && q < -0.6) c = mat.cool;
        else {
          const L = 0.62 - 0.35 * d - 0.3 * ny + 0.3 * q;
          c = mat.ramp[clamp(Math.floor(L * mat.ramp.length + 0.5), 0, mat.ramp.length - 1)];
          if (nx * side > 0.1 && nx * side < 0.5 && ny > -0.6 && ny < -0.15) c = mat.ramp[mat.ramp.length - 1];
        }
        put(BACK, x, y, c); if (x >= 0 && x < W && y >= 0 && y < H) PIECE_MASK[y * W + x] = id;
      }
    }
    function outline(id, col = LINE) {
      const add = [];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x; if (PIECE_MASK[i] === id) continue;
        if (PIECE_MASK[i - 1] === id || PIECE_MASK[i + 1] === id || PIECE_MASK[i - W] === id || PIECE_MASK[i + W] === id) add.push(i);
      }
      for (const i of add) { BACK[i] = col; PIECE_MASK[i] = 255; }
    }
    // A long dusk shadow on the board, falling towards us and away from the afterglow.
    function castShadow(x, y, hw, len) {
      const sl = (x - SX) / 260;           // splays outwards, away from the middle
      for (let s = 0; s <= len; s += 0.5) {
        const w = hw * (1 + 0.3 * s / len), a = 1 - s / len * 0.6;
        for (let q = -w; q <= w; q += 0.5) {
          const xx = Math.round(x + q + sl * s * 2.2), yy = Math.round(y + s * 0.5);
          if (xx >= 0 && yy >= 0 && xx < W && yy < H) SHADOW[yy * W + xx] = Math.max(SHADOW[yy * W + xx], a * (1 - Math.abs(q) / (w + 1) * 0.35));
        }
      }
    }

    // Where each piece stands: board column X (-4..4) and depth row r (0 near .. 8 far).
    const at = (X, r) => { const Z = ZN + r; return { x: Math.round(boardX(X, Z)), y: Math.round(boardY(Z)), s: ZN / Z }; };
    const Q = { x: 82, y: 137, s: 1.0 };                  // the golden queen
    const KG = { x: 240, y: 135, s: 0.92 };               // the violet king
    const P_ROOK = at(-1.3, 5.5), P_BISH = at(1.25, 4.8), P_KNIGHT = at(-2.05, 7.0), P_PAWN = at(-0.9, 2.0), P_PAWN2 = at(0.9, 3.2);

    // Shadows before the top face is painted.
    castShadow(Q.x, Q.y, 20, 30);
    castShadow(KG.x, KG.y, 19, 30);
    castShadow(P_ROOK.x, P_ROOK.y, 5, 10);
    castShadow(P_BISH.x, P_BISH.y, 4, 10);
    castShadow(P_KNIGHT.x, P_KNIGHT.y, 4, 8);
    castShadow(P_PAWN.x, P_PAWN.y, 4, 9);
    castShadow(P_PAWN2.x, P_PAWN2.y, 3, 6);

    paintTop();
    const { X0, X1 } = paintFrame();
    paintEngraving();
    paintRock(X0, X1);

    // Rifts: down the front face and rock at both ends, and across the corner squares.
    crack(X0 + 18, NEAR_Y + 2, 22, 1, 301, ['#ffb4f0', '#ff58d0'], false);
    crack(X1 - 22, NEAR_Y + 2, 20, 1, 302, ['#c8fbff', '#46d8ff'], false);
    crack(X0 + 7, 150, 12, 1, 303, ['#ffb4f0', '#e048c0'], true);
    crack(X1 - 30, 128, 10, 1, 304, ['#c8fbff', '#38c0f0'], true);
    // Paint their resting colour into BACK.
    for (const r of RIFTS) for (const i of r.px) BACK[i] = r.col[1];

    // Small pieces far to near, then the king and the queen.
    const PAWN = [[0, 7, 2.2, 3.4, 1, 0], [7, 9, 4.6, 4.6, 1, 1], [9, 12, 3, 3, 1, 0], [12, 18, 3, 5.8, 1.6, 0], [18, 21, 7, 7, 1, 1], [21, 22, 6.6, 6.6, 1, 0]];
    function pawn(id, p, sc, mat, side) {
      lathe(id, p.x, p.y, sc, PAWN, 22, mat, side);
      ball(id, p.x, p.y - 22 * sc + 3.6 * sc, 3.8 * sc, mat, side);
      outline(id);
    }
    const ROOKP = [[0, 6, 7, 7, 1, 1], [6, 8, 5.4, 5.4, 1, 0], [8, 26, 5, 6.4, 1.4, 0], [26, 29, 8, 8, 1, 1], [29, 31, 7.6, 7.6, 1, 0]];
    function rook(id, p, sc, mat, side) {
      const top = p.y - 31 * sc;
      lathe(id, p.x, p.y, sc, ROOKP, 31, mat, side, (x, y, nx, t) => {
        if (t < 3 && Math.abs(nx) < 0.8 && Math.abs(nx) > 0.22) return -1;   // notches in the battlements
        return 0;
      });
      // Clear the notches (marked -1 = 0xffffffff).
      for (let y = Math.floor(top); y < top + 3 * sc; y++) for (let x = p.x - 10; x <= p.x + 10; x++) {
        const i = y * W + x; if (BACK[i] === 0xffffffff) { BACK[i] = 0; PIECE_MASK[i] = 0; }
      }
      outline(id);
      // Repaint what the notches uncovered (board or sky shows through later via BACK=0).
    }
    const BISHP = [[13, 16, 2, 2, 1, 0], [16, 18, 5.4, 5.4, 1, 1], [18, 30, 3, 6.2, 1.5, 0], [30, 33, 8, 8, 1, 1], [33, 35, 7.4, 7.4, 1, 0]];
    function bishop(id, p, sc, mat, side) {
      const top = p.y - 35 * sc;
      lathe(id, p.x, p.y, sc, BISHP, 35, mat, side);
      // The mitre: a tall egg with a slanted slit, and a ball finial (never a cross).
      const mx = p.x, my = top + 9 * sc, rx = 4.4 * sc, ry = 6 * sc;
      for (let y = Math.floor(my - ry); y <= my + ry; y++) for (let x = Math.floor(mx - rx); x <= mx + rx; x++) {
        const nx = (x + 0.5 - mx) / rx, ny = (y + 0.5 - my) / ry;
        const d = Math.hypot(nx, ny * (ny < 0 ? 1 : 0.9)); if (d > 1 || ny < -1 + 0.35 * Math.abs(nx) * 0) continue;
        const pointed = ny < -0.55 && Math.abs(nx) > (1 + ny) * 1.6; if (pointed) continue;
        const q = nx * side;
        let c = q > 0.72 ? mat.rim : q < -0.82 ? mat.cool : mat.ramp[shadeIdx(q, 0, 0, mat.ramp.length)];
        if (Math.abs((nx * rx) - (ny * ry) * 0.55 - rx * 0.35) < 0.7 && ny > -0.5 && ny < 0.45) c = mat.ramp[0];
        put(BACK, x, y, c); PIECE_MASK[y * W + x] = id;
      }
      ball(id, mx, my - ry - 1.2 * sc, 1.8 * sc, mat, side);
      outline(id);
    }
    // The knight: a hand-drawn head (facing left), shaded by columns.
    const KNIGHT = [
      '.......#.#....',
      '......#####...',
      '.....#######..',
      '....#########.',
      '...##########.',
      '..##o########.',
      '.############.',
      '#############.',
      '#############.',
      '.####..######.',
      '......#######.',
      '......#######.',
      '.....########.',
      '.....########.',
      '....#########.',
      '.....#######..',
      '...##########.',
      '..############',
      '..############',
    ];
    function knight(id, p, sc, mat, side) {
      const kw = KNIGHT[0].length, kh = KNIGHT.length, s = Math.max(1, Math.round(sc * 1.4));
      const x0 = p.x - Math.round(kw * s / 2) - 1, y0 = p.y - kh * s + 1;
      for (let j = 0; j < kh * s; j++) for (let i = 0; i < kw * s; i++) {
        const ch = KNIGHT[(j / s) | 0][(i / s) | 0]; if (ch === '.') continue;
        const row = KNIGHT[(j / s) | 0], ii = (i / s) | 0;
        let l = ii, r = ii; while (l > 0 && row[l - 1] !== '.') l--; while (r < row.length - 1 && row[r + 1] !== '.') r++;
        const nx = r === l ? 0 : ((ii - l) / (r - l)) * 2 - 1, q = nx * side;
        let c = ch === 'o' ? LINE : q > 0.7 ? mat.rim : q < -0.8 ? mat.cool : mat.ramp[shadeIdx(q, j < s * 2, 0, mat.ramp.length)];
        if (j >= (kh - 3) * s && j < (kh - 2) * s) c = mat.ramp[shadeIdx(q, 1, 0, mat.ramp.length)];
        put(BACK, x0 + i, y0 + j, c); PIECE_MASK[(y0 + j) * W + x0 + i] = id;
      }
      outline(id);
    }

    // Side of the light for a piece at x: the afterglow is behind the middle.
    const sideAt = x => (x < SX ? 1 : -1);
    knight(6, P_KNIGHT, 0.9 * P_KNIGHT.s, MAT.pearl, sideAt(P_KNIGHT.x));
    rook(5, P_ROOK, 0.85 * P_ROOK.s, MAT.pearl, sideAt(P_ROOK.x));
    bishop(4, P_BISH, 0.85 * P_BISH.s, MAT.violet, sideAt(P_BISH.x));
    pawn(7, P_PAWN2, 0.85 * P_PAWN2.s, MAT.violet, sideAt(P_PAWN2.x));
    pawn(3, P_PAWN, 0.85 * P_PAWN.s, MAT.pearl, sideAt(P_PAWN.x));

    // The violet king: obsidian body, gold collar and crown, a closed crown with an orb.
    const KINGP = [
      [23, 28, 13.5, 13.5, 1, 1],       // crown band (gold)
      [28, 31, 10.5, 10, 1, 0],
      [31, 35, 9, 8.8, 1, 0],           // neck
      [35, 68, 8.8, 16, 1.8, 0],        // body
      [68, 72, 19.5, 19.5, 1, 1],       // collar (gold)
      [72, 74, 16, 16, 1, 0],
      [74, 87, 16, 24.5, 1.6, 0],       // base flare
      [87, 95, 26, 26, 1, 1],           // plinth
      [95, 100, 25, 25, 1, 0],
    ];
    const KING_GEM = [];
    {
      const sc = KG.s, side = -1, top = KG.y - 100 * sc;
      lathe(1, KG.x, KG.y, sc, KINGP, 100, MAT.violet, side, (x, y, nx, t) => {
        const q = nx * side;
        const goldAt = (t >= 23 && t < 28) || (t >= 68 && t < 72) || (t >= 87 && t < 88.2) || (t >= 93.8 && t < 95);
        if (!goldAt) return 0;
        if (q > 0.8) return MAT.gold.rim;
        return GOLD[shadeIdx(q, t < 24.2 || (t >= 68 && t < 69.2), 0, 7)];
      });
      // The crown: a violet velvet dome between gold arches, rising out of a gold cup
      // with five ball-tipped points; an orb on top (never a cross).
      const dcx = KG.x, cupTop = top + 15 * sc, cupBot = top + 23 * sc;
      const dcy = top + 18 * sc, drx = 10.5 * sc, dry = 12 * sc;
      for (let y = Math.floor(dcy - dry); y < cupBot; y++) for (let x = Math.floor(dcx - drx); x <= dcx + drx; x++) {
        const nx = (x + 0.5 - dcx) / drx, ny = (y + 0.5 - dcy) / dry;
        if (nx * nx + ny * ny > 1) continue;
        const q = nx * side;
        const arch = Math.abs(nx) < 0.09 || Math.abs(Math.abs(nx) - 0.6 * Math.sqrt(Math.max(0, 1 - ny * ny))) < 0.09;
        let c;
        if (arch) c = q > 0.4 ? GOLD[6] : GOLD[q > -0.3 ? 5 : 3];
        else c = q > 0.8 ? MAT.violet.rim : C(q > 0.35 ? '#8a44a6' : q > -0.2 ? '#662e88' : q > -0.7 ? '#4a2068' : '#34164e');
        if (!arch && ny < -0.5 && ny > -0.8 && q > 0.1 && q < 0.45) c = C('#b070c4');     // velvet sheen
        put(BACK, x, y, c); PIECE_MASK[y * W + x] = 1;
      }
      const cupW = y => (13 + 2.2 * (cupBot - y) / (cupBot - cupTop)) * sc;
      const cupEdge = nx => cupTop + 3.6 * sc * (1 - Math.cos(TAU * nx)) / 2;     // points at nx = 0, +-0.5, +-1
      for (let y = Math.floor(cupTop); y < cupBot; y++) {
        const w = cupW(y);
        for (let x = Math.floor(dcx - w); x <= Math.ceil(dcx + w); x++) {
          const nx = (x + 0.5 - dcx) / w; if (Math.abs(nx) > 1 || y < cupEdge(nx)) continue;
          const q = nx * side;
          const c = q > 0.82 ? MAT.gold.rim : q < -0.88 ? MAT.gold.cool : GOLD[shadeIdx(q, y < cupEdge(nx) + 1.2, 0, 7)];
          put(BACK, x, y, c); PIECE_MASK[y * W + x] = 1;
        }
      }
      for (const f of [-0.94, -0.5, 0.5, 0.94]) ball(1, dcx + f * cupW(cupTop), cupTop - 0.6 * sc, 1.8 * sc, MAT.gold, side);
      const dby = dcy;
      // The orb on top, on a short stem.
      for (let y = Math.round(top + 6.5 * sc); y <= Math.round(dby - dry) + 1; y++) { put(BACK, dcx, y, GOLD[5]); put(BACK, dcx - 1, y, GOLD[3]); PIECE_MASK[y * W + dcx] = 1; PIECE_MASK[y * W + dcx - 1] = 1; }
      ball(1, dcx - 0.5, top + 3.8 * sc, 4 * sc, MAT.gold, side);
      // A gem in the band (it turns magenta and cyan).
      const gy = Math.round(top + 26 * sc);
      for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) { const i = (gy + dy) * W + dcx + dx; KING_GEM.push(i); }
      outline(1);
    }

    // The golden queen: the app icon's queen, grown into a monument.
    const QUEENP = [
      [26, 29, 13.5, 13.5, 1, 1],       // band under the crown
      [29, 33, 9, 8.5, 1, 0],           // neck
      [33, 62, 8.5, 15, 1.8, 0],        // body
      [62, 66, 18.5, 18.5, 1, 1],       // collar
      [66, 68, 15, 15, 1, 0],
      [68, 80, 15, 23.5, 1.6, 0],       // base flare
      [80, 88, 25, 25, 1, 1],           // plinth
      [88, 92, 24, 24, 1, 0],
    ];
    const QSHINE = [];
    {
      const sc = Q.s, side = 1, top = Q.y - 92 * sc;
      lathe(2, Q.x, Q.y, sc, QUEENP, 92, MAT.gold, side);
      // The coronet: a cup flaring up to five points with deep gaps between them.
      const cTop = top + 8 * sc, cBot = top + 26 * sc;
      const CW = y => (8.5 + 9 * Math.pow((cBot - y) / (cBot - cTop), 0.9)) * sc;
      const TOPY = nx => cTop + 7.5 * sc * (1 - Math.cos(TAU * nx)) / 2;
      for (let y = Math.floor(cTop); y < cBot; y++) {
        const w = CW(y);
        for (let x = Math.floor(Q.x - w); x <= Math.ceil(Q.x + w); x++) {
          const nx = (x + 0.5 - Q.x) / w; if (Math.abs(nx) > 1 || y < TOPY(nx)) continue;
          const q = nx * side;
          const c = q > 0.82 ? MAT.gold.rim : q < -0.88 ? MAT.gold.cool : GOLD[shadeIdx(q, y < TOPY(nx) + 1.2, 0, 7)];
          put(BACK, x, y, c); PIECE_MASK[y * W + x] = 2;
        }
      }
      // A row of jewels round the coronet's rim.
      for (const f of [-0.6, -0.2, 0.2, 0.6]) {
        const x = Math.round(Q.x + f * CW(cBot - 3 * sc)), y = Math.round(cBot - 3 * sc);
        put(BACK, x, y, C(f < 0 ? '#ff5ad0' : '#5ae0ff')); put(BACK, x, y - 1, C(f < 0 ? '#ffb0ec' : '#c0f8ff'));
      }
      for (const f of [-0.93, -0.5, 0.5, 0.93]) ball(2, Q.x + f * CW(cTop), cTop - 1.2 * sc, 2.3 * sc, MAT.gold, side);
      ball(2, Q.x, top + 4.4 * sc, 4.4 * sc, MAT.gold, side);
      outline(2);
      for (let i = 0; i < W * H; i++) if (PIECE_MASK[i] === 2) QSHINE.push(i);
    }
    // Rift pixels hidden behind a piece stay hidden.
    for (const r of RIFTS) r.px = r.px.filter(i => !PIECE_MASK[i]);
    const Q_FINIAL = { x: Q.x + 1, y: Math.round(Q.y - 92 * Q.s + 3) };
    const KG_ORB = { x: KG.x - 2, y: Math.round(KG.y - 100 * KG.s + 2) };
    // Map each queen pixel to its gold step, for the shine.
    const QLV = new Int8Array(QSHINE.length);
    QSHINE.forEach((i, n) => { QLV[n] = GOLD.indexOf(BACK[i]); });

    // ---------- floating fragments of the board ----------
    function fragment(w, light, seed, withPawn) {
      const h = 16 + (withPawn ? 12 : 0), px = new Uint32Array(w * h), oy = withPawn ? 12 : 0;
      const sw = Math.floor(w / 2);
      const LS = ['#b09ab0', '#dcc4c0', '#f4e0cc'].map(C), DS = ['#261842', '#3a2458', '#523070'].map(C);
      // top face: two squares, a little perspective
      for (let y = 0; y < 4; y++) for (let x = 1 + (3 - y) >> 1; x < w - 1 - ((3 - y) >> 1); x++) {
        const sqi = x < sw ? 0 : 1, isL = (sqi + (light ? 0 : 1)) % 2 === 0;
        px[(oy + y) * w + x] = (isL ? LS : DS)[y === 0 ? 2 : y < 2 ? 1 : 0];
      }
      for (let x = 0; x < w; x++) { px[(oy + 4) * w + x] = x < 2 ? GOLD[4] : GOLD[5]; px[(oy + 5) * w + x] = GOLD[2]; }
      const bot = x => 6 + Math.round(8 * Math.sin(Math.PI * (x + 0.5) / w) * (0.7 + 0.3 * hash(x >> 1, seed)));
      for (let x = 1; x < w - 1; x++) for (let y = 6; y <= bot(x); y++) {
        const t = (y - 6) / 9 + (x / w) * 0.3;
        px[(oy + y) * w + x] = y === bot(x) ? BOUNCE : ROCK[Math.min(5, 1 + Math.floor(t * 4))];
      }
      if (withPawn) {
        // A small pearl pawn standing on it.
        const cx = sw, pb = oy + 1;
        const prof = [[2.2, 1], [2.2, 1], [3.2, 0], [2, 0], [1.6, 0], [1.8, 0], [2.4, 0], [3.2, 0], [3.8, 0], [4.2, 1], [4.2, 0]];
        const mat = MAT.pearl;
        for (let j = 0; j < prof.length; j++) {
          const y = pb - prof.length + j, [hw, lip] = prof[j];
          for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw) - 1; x++) {
            const nx = (x + 0.5 - cx) / hw; if (Math.abs(nx) > 1 || y < 0) continue;
            px[y * w + x] = nx > 0.6 ? mat.rim : nx < -0.7 ? mat.cool : mat.ramp[shadeIdx(nx, lip, 0, 7)];
          }
        }
      }
      return { w, h, px };
    }
    const FRAGS = [
      { s: fragment(14, 1, 1, false), x: 10, y: 98, k: 2, p: 0.4, dx: 0 },
      { s: fragment(18, 0, 2, true), x: 293, y: 90, k: 3, p: 2.2, dx: 0 },
      { s: fragment(10, 0, 3, false), x: 22, y: 150, k: 3, p: 4.1, dx: 0 },
      { s: fragment(9, 1, 4, false), x: 302, y: 150, k: 2, p: 1.3, dx: 0 },
    ];

    // ---------- light: rays, afterglow, glows, vignette ----------
    const RBIN = new Uint16Array(W * H), RD = new Float32Array(W * H);
    for (let y = 0; y < HY; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, dx = x - SX, dy = y - SY, d = Math.hypot(dx, dy);
      RBIN[i] = Math.floor((Math.atan2(dy, dx) + Math.PI) / TAU * 720) % 720;
      RD[i] = d < SR + 5 ? 0 : Math.exp(-d / 80) * 1.25 * clamp((HY - 2 - y) / 12);
    }
    const RAYS = [-2.85, -2.45, -2.1, -1.8, -1.35, -1.0, -0.62, -0.3].map((a, i) => ({ a, w: 0.06 + hash(i, 44) * 0.06, k: 2 + (i % 4), p: hash(i, 45) * TAU }));
    const RLUT = new Float32Array(720), RAYC = C('#ffc8a0');
    const AG_I = [], AG_D = [];
    for (let y = HY - 40; y <= HY + 14; y++) for (let x = SX - 110; x <= SX + 110; x++) {
      const d = Math.hypot((x - SX) / 110, (y - HY - 4) / 34);
      if (d < 1 && x >= 0 && x < W) { AG_I.push(y * W + x); AG_D.push(d); }
    }
    const AGLOW = C('#ffb67a');
    // Rift glow: pixels near each rift, with a falloff level.
    for (const r of RIFTS) {
      const seen = new Map();
      const R = r.top ? 8 : 14;
      for (const [px, py] of r.pts) for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const x = px + dx, y = py + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const d = Math.hypot(dx, dy * 1.2) / R; if (d >= 1) continue;
        const i = y * W + x, v = Math.pow(1 - d, 1.4);
        if (!seen.has(i) || seen.get(i) < v) seen.set(i, v);
      }
      r.gI = Int32Array.from(seen.keys()); r.gV = Float32Array.from(seen.values());
    }
    // Pools of rift light on the clouds under the board's two ends.
    const POOLS = [RIFTS[0], RIFTS[1]].map(r => {
      const [ex, ey] = r.pts[r.pts.length - 1], I = [], V = [];
      for (let y = ey - 6; y <= ey + 22; y++) for (let x = ex - 44; x <= ex + 44; x++) {
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const d = Math.hypot((x - ex) / 44, (y - ey - 8) / 14); if (d >= 1) continue;
        I.push(y * W + x); V.push(1 - d);
      }
      return { r, I, V };
    });
    const VIG_I = [], VIG_A = [], VIGC = C('#0a0618');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = ((x - W / 2) / (W / 2)) ** 2 * 0.5 + ((y - H / 2) / (H / 2)) ** 2 * 0.6;
      const lv = Math.floor(clamp((v - 0.36) * 1.6) * 4);
      if (lv > 0) { VIG_I.push(y * W + x); VIG_A.push(lv * 0.08); }
    }
    const vignette = b => { for (let n = 0; n < VIG_I.length; n++) blend(b, VIG_I[n], VIGC, VIG_A[n]); };

    // ---------- particles ----------
    const MOTES = Array.from({ length: 30 }, (_, i) => {
      const y0 = 124 + hash(i, 62) * 28, hw = edgeHW(y0) - 4;
      return { x: 160 + (hash(i, 61) * 2 - 1) * hw, y0, k: 2 + (i % 3), p: hash(i, 63), sw: hash(i, 64) * TAU, rise: 30 + hash(i, 65) * 44, big: i % 5 === 0 };
    });
    const M1 = C('#fff4c0'), M2 = C('#ffc860');
    const SPARKS = [];
    RIFTS.forEach((r, n) => {
      if (n > 1) return;
      for (let i = 0; i < 9; i++) SPARKS.push({ r, a: r.pts[(hash(i, 70 + n) * r.pts.length) | 0], k: 3 + (i % 3), p: hash(i, 72 + n), sw: hash(i, 74) * TAU });
    });
    const SHOOT = [
      { x: 70, y: 10, dx: -1, dy: 0.45 }, { x: 260, y: 36, dx: -1, dy: 0.5 }, { x: 200, y: 6, dx: 1, dy: 0.55 },
    ];

    function drawSea(L, u) {
      const { s } = L, off = Math.floor(frac(L.k * u) * s.P + 1e-6) % s.P;
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

      // Stars.
      for (const s of STARS) {
        const tw = Math.sin(TAU * s.k * u + s.p);
        if (tw < -0.45) continue;
        const i = s.y * W + s.x;
        if (tw > 0.1) buf[i] = STARC[s.c]; else blend(buf, i, STARD, 0.7);
        if (s.big && tw > 0.6) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blendAt(buf, s.x + dx, s.y + dy, STARC[s.c], 0.45);
      }
      // Shooting stars: three a loop, each for a little over a second.
      {
        const f = 3 * u, n = Math.floor(f) % 3, ph = frac(f + 1e-9);
        if (ph < 0.035) {
          const s = SHOOT[n], v = ph / 0.035, len = 70, hx = s.x + s.dx * v * len, hy = s.y + s.dy * v * len;
          const fade = Math.sin(Math.PI * v);
          for (let k = 0; k < 16; k++) {
            const x = hx - s.dx * k, y = hy - s.dy * k, a = (1 - k / 16) * fade;
            if (a > 0.05) blendAt(buf, x, y, k < 2 ? C('#ffffff') : C('#ffd8f0'), Math.min(1, a * 1.1));
          }
        }
      }
      // Afterglow rays, in the air only.
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
      for (let i = 0; i < HY * W; i++) {
        const f = RLUT[RBIN[i]] * RD[i];
        if (f > 0.16) blend(buf, i, RAYC, f > 0.45 ? 0.12 : 0.06);
      }
      // Thin clouds drifting.
      for (const L of LENSES) K.blit(buf, L.c, frac(L.x0 / LENS_SPAN + L.k * u) * LENS_SPAN - 90, L.y);

      drawSea(SEAS[0], u); drawSea(SEAS[1], u);
      // The afterglow breathing over the horizon.
      {
        const re = 1 + 0.07 * Math.sin(TAU * 3 * u);
        for (let n = 0; n < AG_I.length; n++) {
          const lv = Math.floor(sq(clamp(1 - AG_D[n] / re)) * 4);
          if (lv > 0) blend(buf, AG_I[n], AGLOW, lv * 0.05);
        }
      }
      drawSea(SEAS[2], u);
      // Far fragments (behind the board's level).
      for (const f of FRAGS.slice(0, 2)) K.blit(buf, f.s, f.x - (f.s.w >> 1), Math.round(f.y + 1.8 * Math.sin(TAU * f.k * u + f.p)));

      over(buf, BACK);

      // Glare sparkling on the far squares.
      for (let n = 0; n < GLARE_IDX.length; n++) {
        const i = GLARE_IDX[n], x = i % W, y = (i / W) | 0;
        const s = Math.sin(TAU * 30 * u + hash(x >> 1, y) * TAU);
        if (s > 0.993) buf[i] = GLINT; else if (s > 0.978) buf[i] = GLINT2;
      }
      // Glints running along the gold lip.
      {
        const N = RIM_PATH.length;
        for (let g = 0; g < 2; g++) {
          const head = Math.floor(frac(3 * u + g / 2) * N + 1e-6) % N;
          for (let d = -5; d <= 5; d++) {
            const i = RIM_PATH[(head + d + N) % N], a = Math.abs(d);
            if (a <= 1) buf[i] = GLINT; else if (a <= 3) buf[i] = GLINT2; else blend(buf, i, GLINT2, 0.5);
          }
        }
      }
      // "2.0" shimmering.
      {
        const ph = frac(6 * u);
        if (ph < 0.12) {
          const p = 152 + ph / 0.12 * 18;
          for (const i of ENGRAVE) if (Math.abs((i % W) - p) < 1.5) buf[i] = GLINT;
        }
      }
      // A shine sweeps down the queen twice a loop; her finial glints after it.
      {
        const ph = frac(2 * u);
        if (ph < 0.3) {
          const p = Q.y - 110 + ph / 0.3 * 140;
          for (let n = 0; n < QSHINE.length; n++) {
            const i = QSHINE[n]; if (QLV[n] < 0) continue;
            const x = i % W, y = (i / W) | 0;
            if (Math.abs(y + (x - Q.x) * 0.5 - p) < 2.5) buf[i] = GOLD[Math.min(6, QLV[n] + 2)];
          }
        }
        const g = ph - 0.33;
        if (g > 0 && g < 0.1) {
          const r = Math.round(4 * Math.sin(Math.PI * g / 0.1));
          put(buf, Q_FINIAL.x, Q_FINIAL.y, GLINT);
          for (let k = 1; k <= r; k++) {
            const a = 1 - k / (r + 1);
            for (const [dx, dy] of [[k, 0], [-k, 0], [0, k], [0, -k]]) blendAt(buf, Q_FINIAL.x + dx, Q_FINIAL.y + dy, GLINT, a);
          }
        }
      }
      // The king's orb catches the light; his gem turns magenta and cyan.
      {
        const g = frac(2 * u + 0.5) - 0.33;
        if (g > 0 && g < 0.08) {
          const r = Math.round(3 * Math.sin(Math.PI * g / 0.08));
          put(buf, KG_ORB.x, KG_ORB.y, GLINT);
          for (let k = 1; k <= r; k++) for (const [dx, dy] of [[k, k], [-k, k], [k, -k], [-k, -k]]) blendAt(buf, KG_ORB.x + dx, KG_ORB.y + dy, GLINT, 1 - k / (r + 1));
        }
        const m = Math.sin(TAU * 4 * u);
        const gc = m > 0.3 ? ['#ff5ad0', '#ffb4f0'] : m < -0.3 ? ['#40d8ff', '#c0f8ff'] : ['#b070f0', '#e0c0ff'];
        KING_GEM.forEach((i, n) => { buf[i] = C(gc[n === 3 ? 1 : 0]); });
      }

      // Rifts pulse.
      for (const r of RIFTS) {
        const a = 0.5 + 0.3 * Math.sin(TAU * r.k * u + r.p) + 0.2 * Math.sin(TAU * (r.k * 3 + 1) * u);
        for (let n = 0; n < r.px.length; n++) {
          const i = r.px[n], v = Math.sin(TAU * 8 * u - n * 0.5);
          buf[i] = (a > 0.55 && v > -0.2) ? r.col[0] : r.col[1];
        }
      }

      // Near fragments, then the near cloud sea in front of the rock.
      for (const f of FRAGS.slice(2)) K.blit(buf, f.s, f.x - (f.s.w >> 1), Math.round(f.y + 1.5 * Math.sin(TAU * f.k * u + f.p)));
      drawSea(SEAS[3], u);

      // Rift light on the rock and the clouds under it.
      for (const r of RIFTS) {
        const a = 0.7 + 0.2 * Math.sin(TAU * r.k * u + r.p) + 0.1 * Math.sin(TAU * (r.k * 3 + 1) * u);
        const c = r.col[1];
        for (let n = 0; n < r.gI.length; n++) {
          const lv = Math.floor(r.gV[n] * a * 4.6);
          if (lv > 0) blend(buf, r.gI[n], c, lv * 0.12);
        }
      }
      for (const pl of POOLS) {
        const a = 0.8 + 0.2 * Math.sin(TAU * pl.r.k * u + pl.r.p);
        for (let n = 0; n < pl.I.length; n++) {
          const lv = Math.floor(pl.V[n] * a * 4 + bay(pl.I[n] % W, (pl.I[n] / W) | 0) * 0.5);
          if (lv > 0) blend(buf, pl.I[n], pl.r.col[1], lv * 0.085);
        }
      }
      // Sparks drifting up from the two big rifts.
      for (const s of SPARKS) {
        const v = frac(s.k * u + s.p);
        const x = s.a[0] + Math.sin(v * 6 + s.sw) * 3, y = s.a[1] - v * 26;
        const tw = Math.sin(Math.PI * v);
        if (tw < 0.2) continue;
        if (tw > 0.6) put(buf, x, y, s.r.col[0]); else blendAt(buf, x, y, s.r.col[1], 0.8);
      }
      // Gold motes rising off the board.
      for (const m of MOTES) {
        const v = frac(m.k * u + m.p);
        const x = m.x + Math.sin(v * 5 + m.sw) * 4, y = m.y0 - v * m.rise;
        const tw = Math.sin(Math.PI * v);
        if (tw < 0.15) continue;
        const i = Math.round(y) * W + Math.round(x);
        if (m.big && tw > 0.6) {
          put(buf, x, y, M1);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blendAt(buf, x + dx, y + dy, M2, 0.5 * tw);
        } else if (tw > 0.55) put(buf, x, y, M1);
        else if (i >= 0 && i < W * H) blend(buf, i, M2, 0.7);
      }

      vignette(buf);
    }

    return (t, out) => { buf = out; frame(t); };
  },
});
