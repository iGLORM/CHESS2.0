// The Crossroads Bazaar at night: the Shop's live backdrop (ShopScreen).
//
// 320x200, shown at 4x. A cosy, cluttered shop interior: two brass oil lamps hang from
// the beam and pool warm light on the counter, against teal damask walls sinking into
// cold shadow and moonlight from a little window. The centre back is a curtained
// doorway where the shopkeeper (char_shopkeeper) stands; the counter fills the lower
// third, its top left clear for the goods the screen lays out.
// Signature details: the painted "CROSSROADS BAZAAR" sign, a map of the Shattered Earth
// with the Bazaar's pin in Africa, star jars, coin piles, chess-piece curios (the king
// wears a crown and orb, the bishop a mitre and ball), a model biplane hanging from the
// ceiling (the shop sells the plane), a grandfather clock, a sleeping black cat.
// Moves: lamps sway and flicker, the plane swings and its propeller spins, stars drift
// and twinkle in their jars, coins glint, the globe turns, the teapot steams, the clock's
// pendulum swings, the map pin blinks, the cat's tail swishes (and it peeks now and then),
// a moth circles a lamp, dust drifts in the lamplight, the window stars twinkle.
LiveScenes.register({
  id: 'shop',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, C, clamp, sq, frac, bay, ramp, hash, noise2, noiseLoop, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, rect, glow } = K;
    let buf = null;

    // ---------- light ----------
    const LAMPS = [{ x: 108, y: 40, p: 0 }, { x: 212, y: 40, p: 2.1 }];
    const COUNTER = 134;                                     // back edge of the counter top
    function lightAt(x, y) {
      let l = 0;
      for (const L of LAMPS) l += Math.exp(-sq((x - L.x) / 64) - sq((y - L.y - 14) / 56));
      l += 0.5 * Math.exp(-sq((x - 160) / 70) - sq((y - 128) / 34));   // the pool on the counter
      return clamp(l * 0.95);
    }
    const LMAP = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) LMAP[y * W + x] = lightAt(x, y);
    const Lt = (x, y) => LMAP[clamp(Math.round(y), 0, H - 1) * W + clamp(Math.round(x), 0, W - 1)];
    const moonAt = (x, y) => Math.exp(-sq((x - 20) / 44) - sq((y - 14) / 30));

    // ---------- palettes (lit and warm -> dark and cold) ----------
    const WALL = ['#8a7448', '#6a5c3c', '#4a4634', '#34383a', '#262c34', '#1c2230', '#141826'].map(C);
    const WOOD = ['#e0a462', '#b0703e', '#80492c', '#563020', '#381e1c', '#221418', '#140c12'].map(C);
    const VELVET = ['#9a3444', '#742236', '#52182e', '#381226', '#260c20', '#180818'].map(C);
    const BRASS = ['#fff0a0', '#f0c050', '#b8803a', '#7a4a2a', '#42281e'].map(C);
    const IVORY = ['#fff4dc', '#e8d2ac', '#b8987c', '#6e5a58'].map(C);
    const EBONY = ['#8a7a98', '#4a3e58', '#2c2438', '#1a1422'].map(C);
    const GILT = ['#fff0a0', '#f0c050', '#b8803a', '#6a3a22'].map(C);
    const INK = C('#140e14');
    // Like ramp, but dithered only in a narrow seam between tones: clean flat bands.
    function bandIdx(n, t, x, y) {
      t = clamp(t) * (n - 1);
      const i = t | 0, f = clamp((t - i - 0.5) * 4 + 0.5);
      return Math.min(n - 1, i + (f > bay(x, y) ? 1 : 0));
    }
    const band = (pal, t, x, y) => pal[bandIdx(pal.length, t, x, y)];
    const tone = (pal, x, y, bias = 0) => band(pal, 1 - Lt(x, y) + bias, x, y);

    const BG = new Uint32Array(W * H);

    // ---------- back wall: damask wallpaper, chair rail, wainscot ----------
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (y < 98) {
        // Damask: the motif is one flat tone lighter than the paper around it.
        const gx = ((x + (Math.floor(y / 14) % 2) * 8) % 16) - 8, gy = (y % 14) - 7;
        const d = Math.abs(gx) + Math.abs(gy) * 1.1;
        const motif = (d > 4.2 && d < 5.4) || d < 1.2;
        const k = bandIdx(WALL.length, 1 - LMAP[i] * 1.05 + 0.05, x, y);
        BG[i] = WALL[Math.max(0, k - (motif ? 1 : 0))];
      } else if (y < 101) {
        BG[i] = y === 98 ? tone(WOOD, x, y, -0.1) : tone(WOOD, x, y, 0.15 + (y - 98) * 0.1);
      } else {
        const px = x % 40;
        const stile = px < 3, inner = px === 3 || px === 39 || y === 104 || y === 132;
        BG[i] = tone(WOOD, x, y, stile ? 0.12 : inner ? (px === 3 || y === 104 ? 0.34 : 0.02) : 0.24);
      }
    }
    // The ceiling beam.
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < 3; y++) BG[y * W + x] = WOOD[y === 2 ? 4 : 5];
      blend(BG, 3 * W + x, WOOD[6], 0.5);
    }

    // ---------- the window (moonlight) ----------
    const WX0 = 7, WX1 = 33, WY0 = 5, WY1 = 24;
    const NIGHT = ['#0c1430', '#14224a', '#1e3462', '#2c4a7a'].map(C);
    for (let y = WY0 - 2; y <= WY1 + 1; y++) for (let x = WX0 - 2; x <= WX1 + 2; x++) {
      const cx = (WX0 + WX1) / 2, r = (WX1 - WX0) / 2;
      const top = WY0 + r - Math.sqrt(Math.max(0, r * r - sq(x - cx)));
      const inside = x >= WX0 && x <= WX1 && y >= top && y <= WY1;
      const frame = x >= WX0 - 2 && x <= WX1 + 2 && y >= top - 2 && y <= WY1 + 1;
      if (inside) BG[y * W + x] = Math.abs(x - cx) < 0.6 ? WOOD[4] : ramp(NIGHT, (y - WY0) / (WY1 - WY0), x, y);
      else if (frame && y >= 0) BG[y * W + x] = y > WY1 ? WOOD[3] : WOOD[4];
    }
    // A crescent moon.
    for (let y = 8; y <= 15; y++) for (let x = 22; x <= 30; x++) {
      const d1 = Math.hypot(x - 26, y - 11.5), d2 = Math.hypot(x - 28, y - 10.5);
      if (d1 <= 3.6 && d2 > 3) BG[y * W + x] = C(d1 > 3 ? '#b8c8f0' : '#f0f4ff');
    }
    const WSTARS = [[11, 11], [15, 18], [19, 9], [12, 20], [29, 20], [18, 14]].map(([x, y], i) => ({ x, y, k: 10 + i * 3, p: i * 1.9 }));

    // ---------- chess-piece curios ----------
    const GLYPHS = {
      pawn: ['.###.', '.###.', '..#..', '.###.', '.###.', '#####'],
      rook: ['#.#.#.#', '#######', '.#####.', '..###..', '..###..', '..###..', '.#####.', '#######'],
      knight: ['..##...', '.####..', '#####..', '##.###.', '...###.', '..####.', '..####.', '.#####.', '#######'],
      bishop: ['..##..', '..##..', '.####.', '.#.##.', '.####.', '..##..', '..##..', '.####.', '######'],
      queen: ['...o...', 'o.o.o.o', '#######', '.#####.', '..###..', '..###..', '..###..', '.#####.', '#######'],
      king: ['..ooo..', '#.ooo.#', '#######', '.#####.', '..###..', '..###..', '..###..', '.#####.', '#######'],
      cup: ['#######', '#.###.#', '#.###.#', '.#####.', '..###..', '...#...', '...#...', '.#####.'],
    };
    function curio(b, type, cx, baseY, pal) {
      const rows = GLYPHS[type], w = rows[0].length, x0 = cx - (w >> 1), y0 = baseY - rows.length + 1;
      const litRight = cx < 108 || (cx > 160 && cx < 212);
      const dim = Lt(cx, baseY) < 0.32 ? 1 : 0;
      rows.forEach((r, j) => {
        let a = r.search(/[#o]/), z = r.length - 1 - [...r].reverse().join('').search(/[#o]/);
        for (let i = 0; i < w; i++) {
          const ch = r[i];
          if (ch === '.') continue;
          if (ch === 'o') { put(b, x0 + i, y0 + j, GILT[(litRight ? i > w / 2 : i < w / 2) ? 0 : 1]); continue; }
          const lit = litRight ? i === z : i === a, dark = litRight ? i === a : i === z;
          let k = lit || j === 0 ? 0 : dark || j === rows.length - 1 ? 2 : 1;
          put(b, x0 + i, y0 + j, pal[Math.min(pal.length - 1, k + dim)]);
        }
      });
    }

    // ---------- glass jars of stars ----------
    const JARS = [];
    const GLASS = C('#9ac8d8'), GLASSD = C('#16203c'), CORK = ['#b88a5a', '#8a5e3a', '#5a3a28'].map(C);
    function jar(b, cx, baseY, w, h, big) {
      const x0 = cx - (w >> 1), y0 = baseY - h + 1;
      rect(b, x0 + 2, y0, w - 4, 1, CORK[0]); rect(b, x0 + 2, y0 + 1, w - 4, 1, CORK[1]);
      for (let y = y0 + 2; y <= baseY; y++) for (let x = x0; x < x0 + w; x++) {
        if (y === y0 + 2 && (x === x0 || x === x0 + w - 1)) continue;
        const edge = x === x0 || x === x0 + w - 1 || y === baseY || y === y0 + 2;
        const i = y * W + x;
        if (edge) blend(b, i, GLASS, 0.55); else blend(b, i, GLASSD, 0.55);
      }
      for (let y = y0 + 4; y <= baseY - 3; y++) blend(b, y * W + x0 + 1, C('#e0f4ff'), 0.45);
      JARS.push({ cx, cy: (y0 + baseY) / 2 + 1, x0: x0 + 2, y0: y0 + 4, w: w - 4, h: h - 7, big, n: big ? 6 : 3 + (JARS.length % 2), id: JARS.length });
    }

    // ---------- coins ----------
    const GLINTS = [];
    const COIN = ['#fff0a0', '#ffd24a', '#d89a30', '#8a5418'].map(C);
    function coinStack(b, x, baseY, n) {
      for (let j = 0; j < n; j++) {
        const cx = x + Math.round((hash(x, j) - 0.5) * 1.6), y = baseY - 1 - j * 2;
        for (let i = 0; i < 5; i++) { put(b, cx + i, y + 1, COIN[i === 0 ? 2 : 3]); put(b, cx + i, y, COIN[i === 4 ? 2 : 1]); }
        if (j === n - 1) { for (let i = 1; i < 4; i++) put(b, cx + i, y - 1, COIN[i === 1 ? 0 : 1]); GLINTS.push([cx + 1, y - 1]); }
      }
    }
    function coinHeap(b, x0, x1, baseY, hgt) {
      const mid = (x0 + x1) / 2, half = (x1 - x0) / 2;
      for (let x = x0; x <= x1; x++) {
        const h = Math.round(hgt * (1 - sq((x - mid) / half)) + (hash(x, 3) - 0.5) * 1.5);
        for (let j = 0; j <= h; j++) {
          const y = baseY - j, top = j === h;
          const rim = (x * 3 + y * 5) % 7 === 0;
          put(b, x, y, top ? COIN[x < mid ? 1 : 0] : rim ? COIN[3] : COIN[j < 2 ? 2 : (x + y) % 3 === 0 ? 1 : 2]);
        }
        if (x % 4 === 1) GLINTS.push([x, baseY - h]);
      }
    }

    // ---------- the cabinet of curiosities (left) ----------
    const CAB0 = 2, CAB1 = 104, CABT = 27, SHELF = [53, 77, 101, 125];
    for (let y = CABT; y < COUNTER; y++) for (let x = CAB0; x <= CAB1; x++) {
      const i = y * W + x;
      const side = x <= CAB0 + 2 || x >= CAB1 - 2 || (x >= 52 && x <= 54);
      const crown = y < CABT + 4;
      const plank = SHELF.some(s => y >= s && y <= s + 2);
      if (crown) BG[i] = tone(WOOD, x, y, y === CABT ? -0.15 : y === CABT + 3 ? 0.35 : 0.05);
      else if (side) BG[i] = tone(WOOD, x, y, x === CAB0 || x === 52 ? 0.3 : x === CAB1 - 2 || x === 54 ? -0.05 : 0.1);
      else if (plank) { const s = SHELF.find(q => y >= q && y <= q + 2); BG[i] = tone(WOOD, x, y, y === s ? -0.12 : y === s + 2 ? 0.4 : 0.08); }
      else {
        const under = SHELF.some(s => y >= s + 3 && y <= s + 4) || (y >= CABT + 4 && y <= CABT + 5);
        BG[i] = tone(WOOD, x, y, 0.42 + (under ? 0.2 : 0) + ((x % 9 === 0) ? 0.05 : 0));
      }
      // Cold moonlight on the top edge.
      if (y === CABT && moonAt(x, y) > 0.25) BG[i] = C('#8aa0c8');
    }
    // Row 0: star jars, a globe on a stand, books.
    jar(BG, 12, SHELF[0] - 1, 9, 13); jar(BG, 25, SHELF[0] - 1, 9, 15); jar(BG, 39, SHELF[0] - 1, 10, 12);
    const GLOBE = { x: 66, y: 41, r: 6 };
    for (let y = 48; y < SHELF[0]; y++) put(BG, 66, y, BRASS[2]);
    rect(BG, 62, SHELF[0] - 1, 9, 1, BRASS[2]);
    for (let a = -1.2; a <= 1.2; a += 0.08) put(BG, 66 + Math.cos(a + Math.PI / 2) * 0 + Math.sin(a) * 7.5, 41 + Math.cos(a) * 7.5 * -1 + 0, BRASS[1]);
    const SPINES = ['#8a2a2a', '#2a4a7a', '#2a6a4a', '#7a5a2a', '#5a2a6a', '#9a6a3a'].map(h => C(h));
    function books(b, x0, x1, baseY, seed) {
      for (let x = x0; x <= x1;) {
        const w = 2 + (hash(x, seed) * 2.4 | 0), h = 10 + (hash(x, seed + 1) * 8 | 0);
        const c = SPINES[(hash(x, seed + 2) * SPINES.length) | 0];
        for (let i = 0; i < w && x + i <= x1; i++) for (let j = 0; j < h; j++) {
          const yy = baseY - j;
          const lit = i === w - 1 ? 0.0 : i === 0 ? 0.5 : 0.25;
          put(b, x + i, yy, j === h - 1 ? INK : (j === 3 || j === h - 4) ? GILT[2] : lit < 0.1 ? blendC(c, '#ffe0a0', 0.3) : lit > 0.4 ? blendC(c, '#000000', 0.4) : c);
        }
        x += w + (hash(x, seed + 3) > 0.8 ? 1 : 0);
      }
    }
    function blendC(c, hex, a) { const t = new Uint32Array([c]); blend(t, 0, C(hex), a); return t[0]; }
    books(BG, 78, 100, SHELF[0] - 1, 11);
    // Row 1: chess curios, a stack of books, potion bottles.
    curio(BG, 'king', 12, SHELF[1] - 1, IVORY); curio(BG, 'queen', 22, SHELF[1] - 1, EBONY);
    curio(BG, 'knight', 33, SHELF[1] - 1, GILT); curio(BG, 'rook', 44, SHELF[1] - 1, IVORY);
    for (let k = 0; k < 3; k++) {
      const c = SPINES[(k * 2 + 1) % SPINES.length], y = SHELF[1] - 1 - k * 3, x0 = 58 + k, x1 = 76 - k * 2;
      for (let x = x0; x <= x1; x++) for (let j = 0; j < 3; j++) put(BG, x, y - j, j === 1 ? (x === x1 ? IVORY[2] : c) : x === x1 ? IVORY[1] : blendC(c, '#000000', j === 0 ? 0.35 : 0));
    }
    const POTIONS = [];
    function bottle(b, cx, baseY, liquid, tall) {
      const L = C(liquid), LD = blendC(L, '#000000', 0.45), LL = blendC(L, '#ffffff', 0.4);
      for (let y = baseY - 5; y <= baseY; y++) for (let x = cx - 3; x <= cx + 3; x++) {
        const d = Math.hypot((x - cx) / 3.4, (y - (baseY - 2.5)) / 3);
        if (d > 1) continue;
        put(b, x, y, d > 0.8 ? LD : y < baseY - 3 ? blendC(GLASSD, '#9ac8d8', 0.3) : x < cx ? LL : L);
      }
      for (let y = baseY - 5 - tall; y < baseY - 5; y++) { put(b, cx, y, GLASS); put(b, cx - 1, y, blendC(GLASSD, '#9ac8d8', 0.5)); }
      put(b, cx, baseY - 6 - tall, CORK[0]); put(b, cx - 1, baseY - 6 - tall, CORK[1]);
      POTIONS.push({ cx, baseY, L: LL });
    }
    bottle(BG, 83, SHELF[1] - 1, '#5ac878', 4); bottle(BG, 91, SHELF[1] - 1, '#b060e0', 2); bottle(BG, 98, SHELF[1] - 1, '#e0504a', 5);
    // Row 2: a treasure chest, coin stacks, a teapot, bishop and pawns.
    for (let y = 91; y < SHELF[2]; y++) for (let x = 7; x <= 21; x++) {
      const lid = y < 94, band = x === 10 || x === 18, edge = x === 7 || x === 21 || y === 91;
      put(BG, x, y, lid ? (edge ? WOOD[4] : y === 92 ? WOOD[2] : WOOD[3]) : band ? BRASS[2] : edge ? WOOD[4] : tone(WOOD, x, y, 0.2));
    }
    rect(BG, 13, 94, 3, 2, BRASS[1]); put(BG, 14, 95, INK);
    for (let x = 9; x <= 19; x++) put(BG, x, 90, COIN[(x % 3) ? 1 : 0]);
    coinStack(BG, 25, SHELF[2], 4); coinStack(BG, 31, SHELF[2], 7); coinStack(BG, 37, SHELF[2], 3); coinStack(BG, 43, SHELF[2], 5);
    const TEA = ['#7ab0c8', '#4a7a98', '#2a4a68', '#1a2a44'].map(C);
    for (let y = 92; y < SHELF[2]; y++) for (let x = 59; x <= 71; x++) {
      const d = Math.hypot((x - 65) / 5.5, (y - 96.5) / 4.2);
      if (d > 1) continue;
      put(BG, x, y, TEA[d > 0.8 ? 3 : x > 67 ? 0 : x > 63 ? 1 : 2]);
    }
    for (let k = 0; k < 4; k++) put(BG, 72 + k, 95 - k, TEA[k < 2 ? 1 : 0]);
    for (let k = 0; k < 3; k++) put(BG, 58 - (k === 1 ? 1 : 0), 94 + k, TEA[2]);
    rect(BG, 63, 91, 5, 1, TEA[1]); put(BG, 65, 90, BRASS[1]);
    curio(BG, 'bishop', 81, SHELF[2] - 1, EBONY); curio(BG, 'pawn', 89, SHELF[2] - 1, IVORY); curio(BG, 'pawn', 96, SHELF[2] - 1, EBONY);
    // Row 3: scrolls and a leaning chessboard; a big star jar and a heap of coins.
    for (let k = 0; k < 3; k++) {
      const y = SHELF[3] - 2 - k * 3 + (k === 2 ? 1 : 0), x0 = 6 + k * 3, x1 = x0 + 12;
      for (let x = x0; x <= x1; x++) for (let j = -1; j <= 1; j++) put(BG, x, y + j, x === x1 ? IVORY[2] : j < 0 ? IVORY[0] : j > 0 ? IVORY[2] : IVORY[1]);
      put(BG, x0 + 5, y, VELVET[1]); put(BG, x0 + 5, y - 1, VELVET[0]); put(BG, x0 + 5, y + 1, VELVET[2]);
    }
    for (let j = 0; j < 16; j++) for (let i = 0; i < 14; i++) {
      const x = 33 + i + Math.round(j * 0.25), y = SHELF[3] - 1 - j;
      const sq2 = ((i >> 1) + (j >> 1)) % 2 === 0;
      put(BG, x, y, i === 0 || i === 13 || j === 0 || j === 15 ? WOOD[3] : sq2 ? IVORY[1] : WOOD[4]);
    }
    jar(BG, 66, SHELF[3] - 1, 13, 17, true);
    coinHeap(BG, 77, 100, SHELF[3] - 1, 8);

    // The cat, asleep on top of the cabinet (tail drawn per frame): a black loaf with
    // pointed ears, rimmed by the moonlight from the window.
    const CAT = C('#16101c'), CATM = C('#2a2236'), CATR = C('#7a8ac0'), CATX = 40;
    const inCat = (x, y) => Math.hypot((x - (CATX + 11)) / 9.5, (y - (CABT - 0.5)) / 6.5) <= 1 ||
      Math.hypot((x - (CATX + 3.5)) / 4.2, (y - (CABT - 4.5)) / 3.8) <= 1 ||
      (y >= CABT - 10 && y <= CABT - 7 && ((x === CATX + 1 && y >= CABT - 9) || (x === CATX + 2 && y >= CABT - 10 + 1) || (x === CATX + 5 && y >= CABT - 9) || (x === CATX + 6 && y >= CABT - 10 + 1)));
    for (let y = CABT - 11; y < CABT; y++) for (let x = CATX - 2; x <= CATX + 22; x++) {
      if (!inCat(x, y)) continue;
      const edgeUp = !inCat(x, y - 1), edgeL = !inCat(x - 1, y);
      put(BG, x, y, (edgeUp || edgeL) && x < CATX + 14 ? CATR : y > CABT - 3 ? CAT : CATM);
    }
    for (const ex of [CATX + 1, CATX + 5]) put(BG, ex, CABT - 7, C('#6a4a5a'));      // inner ears
    put(BG, CATX + 2, CABT - 4, C('#4a4058')); put(BG, CATX + 3, CABT - 4, C('#4a4058'));   // closed eyes
    put(BG, CATX + 5, CABT - 4, C('#4a4058')); put(BG, CATX + 6, CABT - 4, C('#4a4058'));
    put(BG, CATX + 4, CABT - 3, C('#8a5a6a'));                                                // nose
    for (let x = CATX + 6; x <= CATX + 10; x++) put(BG, x, CABT - 1, CATM);                   // paw tucked

    // ---------- the doorway and its curtain (behind the shopkeeper) ----------
    const DCX = 160, DR = 34, DCY = 66;
    for (let y = DCY - DR - 4; y < COUNTER; y++) for (let x = DCX - DR - 4; x <= DCX + DR + 4; x++) {
      const dx = x - DCX, dist = y < DCY ? Math.hypot(dx, y - DCY) : Math.abs(dx);
      if (dist > DR + 3.5) continue;
      const i = y * W + x;
      if (dist > DR) { BG[i] = tone(WOOD, x, y, dist > DR + 2.5 ? 0.35 : dist < DR + 1 ? 0.3 : -0.05); continue; }
      // Velvet folds: soft vertical bands, the lamplight on the fold crests.
      const f = Math.cos(TAU * (x - DCX + 2) / 9) * 0.5 + 0.5;
      const t = clamp(1.12 - LMAP[i] * 0.8 - f * 0.3 + (y > 118 ? (y - 118) / 40 : 0));
      BG[i] = band(VELVET, t, x, y);
      if (Math.abs(dx) < 0.6) BG[i] = VELVET[5];
    }
    // Valance with a gold fringe along the arch.
    for (let x = DCX - DR; x <= DCX + DR; x++) {
      const dx = x - DCX, top = DCY - Math.sqrt(Math.max(0, DR * DR - dx * dx));
      const depth = 5 + Math.round(1.5 * Math.cos(TAU * dx / 12));
      for (let j = 0; j < depth; j++) put(BG, x, top + j, j === depth - 1 ? (x % 2 ? GILT[1] : GILT[2]) : tone(VELVET, x, top + j, -0.25 + j * 0.05));
      if (x % 6 === 0) { put(BG, x, top + depth, GILT[1]); put(BG, x, top + depth + 1, GILT[2]); }
    }

    // ---------- the grandfather clock ----------
    const CL = { x0: 205, x1: 219, cx: 212, face: 60 };
    for (let y = 52; y < COUNTER; y++) for (let x = CL.x0 - 1; x <= CL.x1 + 1; x++) {
      const hood = y < 68, base = y >= 118;
      const hw = hood ? 7 : base ? 8 : 6;
      if (Math.abs(x - CL.cx) > hw) continue;
      if (hood && y < 56 && Math.hypot(x - CL.cx, (y - 56) * 1.7) > 7.5) continue;
      const edge = Math.abs(x - CL.cx) === hw;
      put(BG, x, y, tone(WOOD, x, y, edge ? (x < CL.cx ? 0.05 : 0.35) : 0.18));
    }
    for (let y = 54; y <= 66; y++) for (let x = CL.cx - 6; x <= CL.cx + 6; x++) {
      const d = Math.hypot(x - CL.cx, y - CL.face);
      if (d <= 5.5) put(BG, x, y, d > 4.6 ? BRASS[1] : C('#f4e8cc'));
    }
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; put(BG, CL.cx + Math.cos(a) * 3.8, CL.face + Math.sin(a) * 3.8, C('#8a7a70')); }
    for (let y = 74; y <= 110; y++) for (let x = CL.cx - 3; x <= CL.cx + 3; x++) put(BG, x, y, Math.abs(x - CL.cx) === 3 || y === 74 || y === 110 ? BRASS[2] : C('#141224'));

    // ---------- the map of the Shattered Earth (right wall) ----------
    const MP = { x0: 236, x1: 306, y0: 14, y1: 49 };
    const PARCH = ['#f4dca4', '#e0c080', '#c09a60', '#8a6a44'].map(C);
    const LAND = ['#9aa864', '#7a8a50', '#5a6a40'].map(C);
    const blob = (x, y, cx, cy, rx, ry) => sq((x - cx) / rx) + sq((y - cy) / ry) <= 1;
    const land = (x, y) =>
      blob(x, y, 248, 24, 6, 5) || blob(x, y, 251, 30, 3, 3) || blob(x, y, 253, 38, 3.5, 6) ||   // the Americas
      blob(x, y, 268, 23, 4, 3) || blob(x, y, 270, 33, 5, 6) ||                                   // Europe, Africa
      blob(x, y, 284, 25, 10, 5) || blob(x, y, 289, 31, 4, 3) ||                                  // Asia
      blob(x, y, 294, 42, 4, 2.5);                                                                // Australia
    for (let y = MP.y0; y <= MP.y1; y++) for (let x = MP.x0; x <= MP.x1; x++) {
      const e = Math.min(x - MP.x0, MP.x1 - x, y - MP.y0, MP.y1 - y);
      if (e === 0 && hash(x, y) > 0.7) continue;                       // ragged edge
      const n = noise2(x / 6, y / 6, 3);
      let c = PARCH[e < 2 ? 2 : n > 0.72 ? 2 : Lt(x, y) > 0.3 ? 0 : 1];
      if (land(x, y)) {
        const coast = !land(x - 1, y) || !land(x + 1, y) || !land(x, y - 1) || !land(x, y + 1);
        c = coast ? PARCH[3] : LAND[n > 0.6 ? 2 : Lt(x, y) > 0.3 ? 0 : 1];
      }
      BG[y * W + x] = c;
    }
    for (const [x0, y0, x1, y1] of [[251, 30, 268, 33], [270, 33, 284, 25], [270, 33, 294, 42]])
      for (let s = 0; s <= 1; s += 0.04) if ((s * 25 | 0) % 2 === 0) put(BG, x0 + (x1 - x0) * s, y0 + (y1 - y0) * s - Math.sin(Math.PI * s) * 3, C('#b04030'));
    // Compass rose.
    for (const [dx, dy] of [[0, -2], [0, 2], [-2, 0], [2, 0], [0, 0]]) put(BG, 300 + dx, 20 + dy, dx || dy ? PARCH[3] : C('#b04030'));
    for (const [x, y] of [[MP.x0 + 1, MP.y0 + 1], [MP.x1 - 1, MP.y0 + 1], [MP.x0 + 1, MP.y1 - 1], [MP.x1 - 1, MP.y1 - 1]]) { put(BG, x, y, C('#c83a3a')); put(BG, x + 1, y + 1, C('#6a1a1a')); }
    const PIN = { x: 270, y: 34 };

    // The shelf under the map, and its wares.
    for (let x = 232; x <= 314; x++) { put(BG, x, 62, tone(WOOD, x, 62, -0.1)); put(BG, x, 63, tone(WOOD, x, 63, 0.25)); put(BG, x, 64, WOOD[5]); }
    for (const bx of [236, 310]) for (let j = 0; j < 4; j++) put(BG, bx - (j >> 1), 65 + j, WOOD[4]);
    jar(BG, 241, 61, 8, 10);
    coinStack(BG, 250, 62, 3); coinStack(BG, 256, 62, 5);
    curio(BG, 'cup', 270, 61, GILT); curio(BG, 'queen', 285, 61, IVORY); curio(BG, 'knight', 296, 61, EBONY); curio(BG, 'pawn', 307, 61, GILT);

    // ---------- the sign ----------
    const FONT = {
      C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
      R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
      O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
      S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
      A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
      D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
      B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
      Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    };
    const SG = { x0: 116, x1: 204, y0: 6, y1: 28 };
    const LAC = ['#8a2a2a', '#6a1e24', '#4a141e', '#2e0e18'].map(C);
    for (let y = SG.y0; y <= SG.y1; y++) for (let x = SG.x0; x <= SG.x1; x++) {
      const e = Math.min(x - SG.x0, SG.x1 - x, y - SG.y0, SG.y1 - y);
      if (e === 0 && (x === SG.x0 || x === SG.x1) && (y === SG.y0 || y === SG.y1)) continue;
      BG[y * W + x] = e === 0 ? WOOD[5] : e === 1 ? (y === SG.y0 + 1 ? GILT[1] : GILT[2]) : e === 2 ? LAC[3] : ramp(LAC, clamp(0.25 + (y - SG.y0) / 30 + (1 - Lt(x, y)) * 0.4), x, y);
    }
    for (let y = SG.y1 + 1; y <= SG.y1 + 2; y++) for (let x = SG.x0 + 2; x <= SG.x1 - 1; x++) blend(BG, y * W + x, WOOD[6], 0.55);
    for (const cx of [122, 198]) for (let y = 3; y < SG.y0; y++) put(BG, cx, y, y % 2 ? BRASS[2] : BRASS[3]);
    function word(s, x0, y0) {
      for (const ch of s) {
        const g = FONT[ch];
        if (g) g.forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] === '#') {
          put(BG, x0 + i + 1, y0 + j + 1, LAC[3]);
          put(BG, x0 + i, y0 + j, j < 2 ? GILT[0] : j > 4 ? GILT[2] : GILT[1]);
        } });
        x0 += 6;
      }
    }
    word('CROSSROADS', 131, 9); word('BAZAAR', 143, 18);
    // A star and a coin at the ends of the sign.
    for (const [dx, dy] of [[0, -2], [0, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [0, 1], [-1, 2], [1, 2]]) put(BG, 124 + dx, 17 + dy, GILT[dy < 0 ? 0 : 1]);
    for (let y = 14; y <= 20; y++) for (let x = 193; x <= 199; x++) { const d = Math.hypot(x - 196, y - 17); if (d <= 3.2) put(BG, x, y, d > 2.3 ? COIN[3] : x < 196 && y < 17 ? COIN[0] : COIN[1]); }

    // ---------- the counter ----------
    for (let y = COUNTER; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (y < 146) {
        const seam = (y - COUNTER) % 4 === 3 && hash(x >> 4, y) > 0.2;
        const grain = noise2(x / 14, y / 1.5, 9) > 0.62 ? 0.08 : 0;
        BG[i] = y === COUNTER ? tone(WOOD, x, y, 0.2) : band(WOOD, 0.82 - LMAP[i] * 1.0 + (seam ? 0.2 : 0) + grain + (y - COUNTER) * 0.01, x, y);
      } else if (y === 146) BG[i] = LMAP[i] > 0.45 + bay(x, y) * 0.2 ? WOOD[0] : WOOD[1];
      else if (y < 149) BG[i] = WOOD[y === 147 ? 3 : 5];
      else {
        const px = (x + 20) % 64, depth = (y - 149) / 51;
        const stile = px < 6, rail = y < 154 || y > 194;
        let b = 0.5 + depth * 0.35 + (1 - LMAP[i]) * 0.25;
        if (y === 151) { BG[i] = LMAP[i] > 0.4 ? BRASS[1] : BRASS[2]; continue; }
        if (!stile && !rail) {
          const lx = px - 6, ly = y - 154, pw = 58, ph = 41;
          if (lx < 2 || ly < 2) b -= 0.12; else if (lx > pw - 3 || ly > ph - 3) b += 0.15;
          else b += 0.06;
        }
        BG[i] = band(WOOD, b, x, y);
      }
    }
    // A brass scale on the left end of the counter.
    for (let y = 122; y <= 140; y++) put(BG, 27, y, BRASS[y < 128 ? 1 : 2]);
    rect(BG, 21, 140, 13, 1, BRASS[1]); rect(BG, 20, 141, 15, 1, BRASS[3]);
    for (let x = 16; x <= 38; x++) put(BG, x, 122 + Math.round((x - 27) * 0.06), BRASS[x < 27 ? 0 : 1]);
    put(BG, 27, 121, BRASS[0]);
    for (const [px, py] of [[17, 123], [37, 124]]) {
      for (let y = py; y < py + 8; y++) { put(BG, px - 3 + (y - py) * 0 - Math.round((y - py) * 0.3), y, BRASS[3]); put(BG, px + 3 + Math.round((y - py) * 0.3), y, BRASS[3]); }
      for (let x = px - 5; x <= px + 5; x++) { put(BG, x, py + 8, BRASS[1]); put(BG, x, py + 9, BRASS[3]); }
    }
    coinStack(BG, 14, 131, 2);
    // Coin stacks and a service bell on the right end.
    coinStack(BG, 262, 142, 5); coinStack(BG, 268, 142, 3); coinStack(BG, 275, 142, 7); coinStack(BG, 281, 142, 2);
    for (let y = 134; y <= 141; y++) for (let x = 286; x <= 300; x++) {
      const d = Math.hypot((x - 293) / 6, (y - 141) / 6);
      if (y <= 139 && d <= 1) put(BG, x, y, d > 0.85 ? BRASS[3] : x < 291 && y < 138 ? BRASS[0] : x > 296 ? BRASS[2] : BRASS[1]);
      if (y >= 140) put(BG, x, y, y === 140 ? BRASS[2] : WOOD[5]);
    }
    rect(BG, 292, 133, 3, 1, BRASS[1]); put(BG, 293, 132, BRASS[0]);
    GLINTS.push([290, 136]);

    // ---------- animated parts ----------
    const DUST = Array.from({ length: 46 }, (_, i) => ({ x0: 70 + hash(i, 1) * 180, y0: 46 + hash(i, 2) * 86, kx: 1 + (i % 3), ky: 3 + (i % 5), kt: 7 + (i % 11), p: hash(i, 3) * TAU }));
    const JSTARS = [];
    for (const j of JARS) for (let s = 0; s < j.n; s++) JSTARS.push({ j, fx: hash(j.id, s + 10), fy: hash(j.id, s + 20), k: 2 + ((hash(j.id, s + 30) * 4) | 0), kt: 9 + ((hash(j.id, s + 40) * 14) | 0), p: hash(j.id, s + 50) * TAU });
    const GL = GLINTS.map(([x, y], i) => ({ x, y, k: 3 + (i % 5), p: hash(i, 77) }));
    const STAR = C('#fff6b0'), STARD = C('#ffd24a'), STARG = C('#ffcc55'), WARM = C('#ffd890'), HOT = C('#fff4d0');
    const FLAME = ['#fffbe8', '#ffe890', '#ffb040', '#e06a20'].map(C);
    const VIGC = C('#070a16');
    // Vignette in three flat steps (only the seams between them dithered): cold dark
    // corners without a checker pattern over the art.
    const VIG = [[], [], []];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = ((x - W / 2) / (W / 2)) ** 2 * 0.6 + ((y - H / 2 + 10) / (H / 2)) ** 2 * 0.55;
      const k = bandIdx(4, (v - 0.3) * 1.5, x, y);
      if (k > 0) VIG[k - 1].push(y * W + x);
    }
    const vignette = b => { VIG.forEach((list, k) => { const a = [0.16, 0.3, 0.44][k]; for (const i of list) blend(b, i, VIGC, a); }); };
    const MOTE = C('#ffe8b0');
    const STEAM = C('#e8e0d8');

    // The model biplane (the shop sells the real thing), hanging on two strings.
    const PB = C('#f4f0e8'), PT = C('#d94a4a'), PS = C('#8a8a9a'), PD = C('#3a2a3a');
    function plane(ox, oy, u, dir, small) {
      const s = (x, y, c) => put(buf, ox + (dir > 0 ? x : -x), oy + y, c);
      const L = small ? 14 : 20;
      for (let x = 2; x <= L; x++) { s(x, 4, PB); s(x, 5, PB); s(x, 6, x > L - 3 ? PT : PS); }
      for (let x = 0; x <= 2; x++) for (let y = x < 2 ? 1 : 2; y <= 5; y++) s(x, y, PT);
      const w0 = small ? 5 : 7, w1 = small ? 11 : 15;
      for (let x = w0; x <= w1; x++) { s(x, 0, x === w1 ? PT : PB); s(x, 1, PS); s(x, 7, x === w1 ? PT : PB); }
      s(w0 + 1, 2, PD); s(w0 + 1, 3, PD); s(w1 - 1, 2, PD); s(w1 - 1, 3, PD);
      s(L - 7, 3, PD); s(L - 6, 3, C('#6ac0e0'));
      s(L + 1, 4, PT); s(L + 1, 5, PT); s(L + 1, 6, PT);
      const f = Math.floor(frac(90 * u) * 3);          // the propeller: long, medium, short
      const half = [3, 2, 0][f];
      for (let y = -half; y <= half; y++) blendAt(buf, ox + (dir > 0 ? L + 2 : -(L + 2)), oy + 5 + y, C('#d8d8e8'), 0.75);
      s(w0 + 2, 8, PD); s(w1 - 2, 8, PD); s(w0 + 2, 9, INK); s(w1 - 2, 9, INK);
    }

    function lamp(L, u) {
      const sw = Math.round(1.4 * Math.sin(TAU * 5 * u + L.p));
      const fl = 0.84 + 0.1 * Math.sin(TAU * 67 * u + L.p) + 0.06 * Math.sin(TAU * 151 * u);
      const x = L.x + sw;
      for (let y = 3; y < 28; y++) put(buf, L.x + sw * (y - 3) / 25, y, y % 2 ? BRASS[3] : BRASS[4]);
      glow(buf, x, 40, 30, WARM, 0.16 * fl);
      glow(buf, x, 40, 11, HOT, 0.38 * fl);
      // Shade: a flared brass hood, lit gold on its rim.
      for (let y = 28; y <= 35; y++) {
        const hw = 2 + (y - 28) * 1.2;
        for (let dx = -Math.round(hw); dx <= Math.round(hw); dx++) put(buf, x + dx, y, y === 35 ? BRASS[0] : y === 28 ? BRASS[3] : dx < -hw + 1.5 ? BRASS[3] : dx < 0 ? BRASS[2] : BRASS[1]);
      }
      // Glass globe with the flame inside.
      for (let y = 36; y <= 44; y++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.hypot(dx / 4.5, (y - 40) / 4.6);
        if (d > 1) continue;
        put(buf, x + dx, y, d > 0.82 ? C('#f0d890') : C('#fff2c0'));
      }
      const fh = 4 + (fl > 0.9 ? 1 : 0);
      for (let j = 0; j < fh; j++) {
        const w = j < 1 ? 1 : j < fh - 1 ? 1 : 0;
        for (let dx = -w; dx <= w; dx++) put(buf, x + dx, 42 - j, FLAME[Math.min(3, j === 0 ? 2 : Math.abs(dx) + (j > 2 ? 0 : 1))]);
      }
      put(buf, x, 43, FLAME[3]);
      for (let dx = -3; dx <= 3; dx++) { put(buf, x + dx, 45, BRASS[1]); if (Math.abs(dx) < 3) put(buf, x + dx, 46, BRASS[2]); }
      put(buf, x, 47, BRASS[3]); put(buf, x, 48, BRASS[2]);
      return x;
    }

    function frame(t) {
      const u = t / LOOP;
      buf.set(BG);

      for (const s of WSTARS) {
        const v = Math.sin(TAU * s.k * u + s.p);
        if (v > 0.1) put(buf, s.x, s.y, v > 0.7 ? C('#f0f4ff') : C('#8aa0d0'));
      }

      // The cat's tail swishes over the edge of the cabinet; now and then it peeks.
      const sw = Math.sin(TAU * 20 * u) * 0.5 + Math.sin(TAU * 7 * u) * 0.5;
      for (let j = 0; j <= 12; j++) {
        const s = j / 12, x = CATX + 20 + Math.round(sw * 3 * s * s + s * 2);
        put(buf, x, CABT - 1 + j, j === 0 ? CATM : CAT); put(buf, x + 1, CABT - 1 + j, CAT);
        if (j > 1) put(buf, x - 1, CABT - 1 + j, CATM);
      }
      if (frac(3 * u + 0.4) < 0.025) { put(buf, CATX + 2, CABT - 4, C('#e8d040')); put(buf, CATX + 3, CABT - 4, C('#e8d040')); }

      // The globe turns.
      for (let y = -GLOBE.r; y <= GLOBE.r; y++) for (let x = -GLOBE.r; x <= GLOBE.r; x++) {
        const d = Math.hypot(x, y) / GLOBE.r;
        if (d > 1) continue;
        const lon = Math.asin(clamp(x / (GLOBE.r * Math.sqrt(Math.max(0.05, 1 - sq(y / GLOBE.r)))), -1, 1)) / Math.PI;
        const lx = (lon + 2 * u * 6) * 8;
        const n = noiseLoop(lx, 5 + (y + GLOBE.r >> 2), 8) * 0.7 + noiseLoop(lx * 2, 9, 16) * 0.3;
        const lit = x > 1 || (x === 1 && y < 0);
        let c = n > 0.55 ? (lit ? C('#8ab860') : C('#4a7040')) : (lit ? C('#4a8ac0') : C('#2a4a80'));
        if (d > 0.86) c = C('#1e2a4a');
        put(buf, GLOBE.x + x, GLOBE.y + y, c);
      }

      // Stars drifting in their jars, glowing.
      for (const j of JARS) glow(buf, j.cx, j.cy, j.big ? 14 : 9, STARG, (j.big ? 0.2 : 0.13) * (0.8 + 0.2 * Math.sin(TAU * (9 + j.id) * u)));
      for (const s of JSTARS) {
        const j = s.j;
        const x = j.x0 + Math.round(s.fx * (j.w - 1) + Math.sin(TAU * s.k * u + s.p) * 1);
        const y = j.y0 + Math.round(clamp(s.fy + 0.25 * Math.sin(TAU * (s.k + 1) * u + s.p), 0, 1) * (j.h - 1));
        const tw = Math.sin(TAU * s.kt * u + s.p);
        put(buf, x, y, tw > 0.2 ? STAR : STARD);
        if (tw > 0.75 && j.big) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blendAt(buf, x + dx, y + dy, STAR, 0.6);
      }

      // Coins glint.
      for (const g of GL) {
        const v = frac(g.k * u + g.p);
        if (v > 0.035) continue;
        const a = 1 - Math.abs(v / 0.035 - 0.5) * 2;
        put(buf, g.x, g.y, HOT);
        if (a > 0.4) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blendAt(buf, g.x + dx, g.y + dy, HOT, 0.7);
      }

      // A bubble rising in the green potion.
      const pb = frac(12 * u);
      if (pb < 0.6) put(buf, POTIONS[0].cx + (pb > 0.3 ? 1 : 0), POTIONS[0].baseY - 1 - Math.round(pb * 7), POTIONS[0].L);

      // Steam from the teapot's spout.
      for (let i = 0; i < 4; i++) {
        const v = frac(4 * u + i / 4);
        const x = 76 + v * 3 + Math.sin(TAU * (8 * u + i / 4) * 2) * 1.2, y = 91 - v * 11;
        blendAt(buf, x, y, STEAM, (1 - v) * 0.35);
        if (v > 0.3) blendAt(buf, x + 1, y, STEAM, (1 - v) * 0.2);
      }

      // The clock: its pendulum swings once every 2 s, the minute hand goes round.
      const pa = 0.26 * Math.sin(TAU * 60 * u);
      for (let r = 0; r <= 28; r += 0.5) put(buf, CL.cx + Math.sin(pa) * r, 76 + Math.cos(pa) * r, r > 26 ? BRASS[1] : BRASS[2]);
      const bx = CL.cx + Math.sin(pa) * 29, by = 76 + Math.cos(pa) * 29;
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 4.5) put(buf, bx + x, by + y, x + y < 0 ? BRASS[0] : BRASS[1]);
      const ma = TAU * u - Math.PI / 2;
      for (let r = 0; r <= 3.5; r += 0.5) put(buf, CL.cx + Math.cos(ma) * r, CL.face + Math.sin(ma) * r, INK);
      for (let r = 0; r <= 2; r += 0.5) put(buf, CL.cx + r * 0.7, CL.face - r * 0.7, INK);

      // The Bazaar's pin on the map blinks.
      const pv = Math.sin(TAU * 40 * u);
      put(buf, PIN.x, PIN.y, pv > 0 ? C('#ff4a3a') : C('#a02a2a'));
      if (pv > 0.6) { blendAt(buf, PIN.x - 1, PIN.y, C('#ff8a6a'), 0.6); blendAt(buf, PIN.x + 1, PIN.y, C('#ff8a6a'), 0.6); blendAt(buf, PIN.x, PIN.y - 1, C('#ff8a6a'), 0.6); }

      // The hanging planes swing on their strings.
      const s1 = Math.round(Math.sin(TAU * 6 * u) * 1.2), s2 = Math.round(Math.sin(TAU * 8 * u + 1) * 1);
      for (let y = 3; y < 10; y++) { put(buf, 68 + s1 * (y - 3) / 7, y, C('#8a8078')); put(buf, 80 + s1 * (y - 3) / 7, y, C('#8a8078')); }
      plane(60 + s1, 9, u, 1, false);
      for (let y = 3; y < 6; y++) { put(buf, 298 + s2 * (y - 3) / 3, y, C('#6a6058')); put(buf, 306 + s2 * (y - 3) / 3, y, C('#6a6058')); }
      plane(314 + s2, 6, u + 0.3, -1, true);

      // The lamps sway and flicker; a moth circles the right one.
      for (const L of LAMPS) lamp(L, u);
      const ma2 = TAU * 20 * u;
      const mx = 212 + Math.cos(ma2) * 11 + Math.sin(TAU * 7 * u) * 3, my = 42 + Math.sin(ma2 * 2) * 5;
      const wing = Math.sin(TAU * 600 * u) > 0;
      put(buf, mx, my, C('#d8c8a8'));
      if (wing) { put(buf, mx - 1, my - 1, C('#b8a888')); put(buf, mx + 1, my - 1, C('#b8a888')); }
      else { put(buf, mx - 1, my, C('#a89878')); put(buf, mx + 1, my, C('#a89878')); }

      // Dust in the lamplight.
      for (const m of DUST) {
        const tw = Math.sin(TAU * m.kt * u + m.p);
        if (tw < 0) continue;
        const x = m.x0 + 6 * Math.sin(TAU * m.kx * u + m.p), y = m.y0 + 5 * Math.sin(TAU * m.ky * u + m.p * 2);
        const l = Lt(x, y);
        if (l > 0.3) blendAt(buf, x, y, MOTE, Math.min(0.8, tw * l));
      }

      vignette(buf);
    }

    return (t, out) => { buf = out; frame(t); };
  },
});
