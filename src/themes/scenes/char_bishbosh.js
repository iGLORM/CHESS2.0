// Bish-Bosh, the Diagonal Dreamer: a live character portrait.
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the game HUD and dialogue bubbles. A terracotta-orange bishop with a
// slit mitre, a turquoise sash worn on the diagonal and a gold staff topped with an
// oasis-blue orb, standing in the Slanted Sands under a low afternoon sun.
// Habit: the whole figure leans along a diagonal, the way the desert slopes.
// Moods: gleeful (default), cackle, scheming, huffy, shocked.
LiveScenes.register({
  id: 'char_bishbosh',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['gleeful', 'cackle', 'scheming', 'huffy', 'shocked'],
  frames: { face: [11, 6, 40, 40] },
  moodFor(category) {
    return {
      gameStart: 'gleeful', milestone: 'gleeful',
      bossCapture: 'cackle', bossCaptureBig: 'cackle', bossCheck: 'cackle', playerLowHealth: 'cackle',
      bossTaunt: 'scheming',
      playerCapture: 'huffy', lowHealth: 'huffy',
      playerCaptureBig: 'shocked', playerCheck: 'shocked',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, clamp, sq, frac, bay, ramp, hash } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over } = K;
    let buf = null;

    // ---------- backdrop: the Slanted Sands, glowing gold behind the head ----------
    const BG = new Uint32Array(W * H);
    const SUNX = 8, SUNY = 15;
    const tilt = x => (x - CX) * 0.1;                      // the land runs downhill to the right
    const SKY = ['#1e4a8a', '#2a64a4', '#3a82b8', '#58a2c4', '#84bcc8', '#b8d2c0', '#e8dca8', '#fce8b0', '#fff6d8'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - CX, (y - 28) * 1.1), ds = Math.hypot(x - SUNX, y - SUNY);
      BG[y * W + x] = ramp(SKY, (y - tilt(x) * 0.5) / 64 + 0.26 * Math.exp(-sq(d / 17)) + 0.1 * Math.exp(-sq(d / 7)) + 0.4 * Math.exp(-sq(ds / 11)), x, y);
    }

    // Dunes, far to near: lit faces warm, lee faces lilac, crests pale.
    function dune(top, lit, shade, crest, depth) {
      const L = lit.map(C), S = shade.map(C), CR = C(crest);
      for (let x = 0; x < W; x++) {
        const ty = Math.round(top(x)), slope = top(x + 1) - top(x - 1);
        for (let y = Math.max(0, ty); y < H; y++) {
          const dy = y - ty, sunny = slope > -0.2 || dy > (-slope - 0.2) * 12;
          BG[y * W + x] = dy === 0 ? (sunny ? CR : S[0]) : ramp(sunny ? L : S, dy / depth + (((y + Math.round(x * 0.4)) % 4) === 0 ? 0.25 : 0), x, y);
        }
      }
    }
    const farTop = x => 52 + tilt(x) + 1.5 * Math.sin(x / 7 + 2);
    dune(farTop, ['#f0d4a8', '#e2bc90', '#cca080'], ['#b494a8', '#a486a0', '#94789a'], '#fff0c8', 14);
    // Leaning pyramids on the far dunes, sheared along the slant (sun on the left).
    function pyramid(cx, baseY, hw, h, lean) {
      const LIT = ['#fce0a0', '#f0c878', '#d8a860'].map(C), SH = ['#a4849a', '#8e7090', '#7a5e80'].map(C), EDGE = C('#fff4c8');
      for (let j = 0; j <= h; j++) {
        const y = baseY - j, w = hw * (1 - j / h), apx = cx + lean * j;
        for (let x = Math.round(apx - w); x <= Math.round(apx + w); x++) {
          const course = j % 3 === 0;
          let c = x < apx + 0.5 ? ramp(LIT, (1 - j / h) * 0.5 + (course ? 0.4 : 0), x, y) : ramp(SH, course ? 0.6 : 0.1, x, y);
          if (Math.abs(x - apx) < 0.6) c = EDGE;
          put(BG, x, y + Math.round(tilt(x) - tilt(cx)), c);
        }
      }
    }
    pyramid(9, 57, 13, 17, 0.35);
    pyramid(55, 60, 8, 10, 0.35);
    const midTop = x => 62 + tilt(x) + 2 * Math.sin(x / 9 + 1);
    dune(midTop, ['#f8d898', '#ecc07c', '#d49c64'], ['#9a86a8', '#86709a', '#70608c'], '#fff6d0', 10);
    // A small palm on the mid dune, right of the figure (its fronds sway in frame()).
    const PALM = { x: 55, y: Math.round(midTop(55)) + 1 };
    for (let j = 0; j < 11; j++) {
      const x = PALM.x + Math.round(Math.sin(j / 11 * 1.4) * 2);
      put(BG, x, PALM.y - j, C(j % 3 === 0 ? '#5a3a2a' : '#7a5234'));
    }
    const nearTop = x => 70 + tilt(x) * 0.6 + 1.5 * Math.sin(x / 6 + 2);
    dune(nearTop, ['#e8b878', '#c89060', '#9a6a50'], ['#6a5a84', '#54487a', '#40386a'], '#ffe4a8', 8);
    // The figure's long shadow across the near dune, cast down the slope.
    for (let i = 0; i < 18; i++) for (let w = -2; w <= 2; w++) blendAt(BG, 42 + i, 76 + Math.round(i * 0.25) + w, C('#3a3066'), 0.4 * (1 - i / 18));

    K.vignette(C('#2a1a3a'), 0.32, 0.5)(BG);           // edges darker (static)
    K.disc(BG, SUNX, SUNY, 3.6, (dx, dy, d) => C(d < 0.65 ? '#ffffff' : '#fffae0'));

    // ---------- Bish-Bosh ----------
    const MAT = {
      robe: { tones: ['#ffd8a4', '#ffa872', '#ff8a52', '#e0643e', '#a8423e', '#6a2a46'].map(C), rim: C('#9ae0dc') },
      gold: { tones: ['#fff4c0', '#ffd060', '#e0a038', '#a86a30', '#6a3a30'].map(C), rim: C('#c8f0e0') },
      sash: { tones: ['#aaf4e4', '#5ad0c8', '#2a9aa8', '#1e6a88', '#1a4466'].map(C), rim: C('#c8fff4') },
      gem: { tones: ['#ffffff', '#b8fff0', '#4ad8d8', '#1e8aa8', '#1a4a78'].map(C), rim: C('#e0fff8') },
      hand: { tones: ['#fffaf0', '#f6e8d0', '#e2ccb0', '#b89c8c', '#7e6272'].map(C), rim: C('#c0e8ec') },
    };
    const LINE = C('#2e1e2e');
    // Seam colour per part (parts are numbered back to front).
    const SEAM = [0, C('#c8704c'), C('#c8704c'), C('#1a4466'), C('#a86a30'), C('#c8704c'), C('#6a3a30'), C('#1a4a78'), C('#7e4a4a'), C('#7e4a4a')];
    const LN = Math.hypot(0.6, 0.6, 0.52), LX = -0.6 / LN, LY = -0.6 / LN, LZ = 0.52 / LN;
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H);
    let LEAN = 0;                                          // how far the top leans right, px
    const sh = y => Math.round(LEAN * (70 - y) / 60);      // the lean is a shear: the base stays

    function shade(x, y, nx, ny, part, m) {
      y = Math.round(y); x = Math.round(x) + sh(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * LX + ny * LY + nz * LZ, i = y * W + x, T = m.tones;
      SPR[i] = nx > 0.74 && l < 0.25 ? m.rim : T[Math.round(clamp(1 - (l * 0.62 + 0.42)) * (T.length - 1))];
      PART[i] = part;
    }
    function disc(cx, cy, rx, ry, part, m) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.95, ny * 0.95, part, m);
      }
    }
    const sput = (x, y, c) => { y = Math.round(y); x = Math.round(x) + sh(y); if (x >= 0 && y >= 0 && x < W && y < H) SPR[y * W + x] = c; };

    const HX = CX, HY = 30;                                // head centre (before the lean)
    function body(oy, hand) {
      SPR.fill(0); PART.fill(0);
      const skirtHW = y => 4.5 + Math.pow((y - 44) / 23, 1.7) * 10.5;
      // Base: a squat plinth.
      for (let y = 67; y <= 74; y++) {
        const top = y - 67, hw = 15 - (top < 2 ? 2 - top : 0) - (y === 74 ? 1 : 0);
        for (let x = CX - hw; x <= CX + hw; x++) shade(x, y + oy, (x - CX) / 16, y < 69 ? -0.6 : 0.1, 1, y === 69 ? MAT.gold : MAT.robe);
      }
      // Slender body flaring to the base, with the sash worn on the diagonal.
      for (let y = 44; y <= 67; y++) {
        const hw = skirtHW(y);
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) {
          const nx = (x - CX) / (hw + 0.5), onSash = y < 65 && Math.abs((x - CX) - (y - 52) * 0.9) < 2.3;
          shade(x, y + oy, nx, 0.12, onSash ? 3 : 2, onSash ? MAT.sash : MAT.robe);
        }
      }
      disc(CX, 9.5 + oy, 2.3, 2.3, 4, MAT.gold);          // finial
      disc(CX, 43 + oy, 8.5, 2.4, 4, MAT.gold);           // collar
      // The mitre: a teardrop, round at the face, pointed at the top.
      for (let y = 12; y <= 40; y++) {
        let hw, ny;
        if (y < HY) { const v = (y - 12) / (HY - 12); hw = 10.5 * Math.pow(Math.sin(v * Math.PI / 2), 0.85); ny = -0.6 * (1 - v) - 0.1; }
        else { const v = (y - HY) / 10.8; hw = 10.5 * Math.sqrt(Math.max(0, 1 - v * v)); ny = v * 0.95; }
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) shade(x, y + oy, (x - CX) / (hw + 0.5) * 0.95, ny, 5, MAT.robe);
      }
      // The mitre's slit, cut on the diagonal, with a lit lower lip.
      for (let i = 0; i < 7; i++) { sput(HX - 1 + i, 15 + i + oy, C('#5a2438')); sput(HX - 2 + i, 16 + i + oy, MAT.robe.tones[0]); }
      // The staff, planted by the base, gold with an oasis-blue orb.
      const SX = CX + 15;
      for (let y = 21; y <= 75; y++) { shade(SX, y + oy, -0.5, 0, 6, MAT.gold); shade(SX + 1, y + oy, 0.55, 0, 6, MAT.gold); }
      disc(SX + 0.5, 21.5 + oy, 2.6, 1.2, 6, MAT.gold);
      disc(SX + 0.5, 17.5 + oy, 3, 3, 7, MAT.gem);
      disc(SX + 0.5, 50 + oy, 3.2, 3, 8, MAT.hand);       // hand on the staff
      if (hand) disc(hand.x, hand.y + oy, 3.2, 3, 9, MAT.hand);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        const a = PART[i - 1], b = PART[i + 1], c = PART[i - W], d = PART[i + W];
        if (!p) { if (a || b || c || d) SPR[i] = LINE; }
        else if ((a && a < p) || (b && b < p) || (c && c < p) || (d && d < p)) SPR[i] = SEAM[p];
      }
      if (hand && hand.finger) for (const [dx, dy] of hand.finger) {   // a pointing finger, on the diagonal
        const fx = hand.x + dx, fy = hand.y + oy + dy;
        sput(fx, fy, MAT.hand.tones[1]); sput(fx - 1, fy, LINE); sput(fx, fy - 1, LINE);
      }
    }

    const EYE = C('#1e1420'), SHINE = C('#ffffff'), BROW = C('#6a2a2a'), MOUTH = C('#3a1e2a'), INSIDE = C('#8a3040');
    const TEETH = C('#fffaf0'), TONGUE = C('#e86a7a'), BLUSH = C('#ff7a6a'), DROP = C('#8ae0ff'), DROPD = C('#3a8ab0');
    const BANG = C('#ffd23f'), SPARK = C('#fff4c0'), PUFF = C('#fffaf0');
    let hx = HX, hy = HY;
    const fput = (x, y, c) => put(buf, x + sh(y), y, c);
    const fblend = (x, y, c, a) => blendAt(buf, x + sh(Math.round(y)), y, c, a);

    function eyes(kind) {
      for (const s of [-1, 1]) {
        const ex = s < 0 ? hx - 5 : hx + 4;
        if (kind === 'blink') { fput(ex, hy + 2, EYE); fput(ex + 1, hy + 2, EYE); continue; }
        if (kind === 'arc') { fput(ex - 1, hy + 2, EYE); fput(ex, hy + 1, EYE); fput(ex + 1, hy + 1, EYE); fput(ex + 2, hy + 2, EYE); continue; }
        if (kind === 'lid') {                              // half-lidded, sly
          for (let x = ex - 1; x <= ex + 2; x++) fput(x, hy + 1, BROW);
          for (let y = hy + 2; y <= hy + 3; y++) { fput(ex, y, EYE); fput(ex + 1, y, EYE); }
          fput(s < 0 ? ex : ex + 1, hy + 2, SHINE);
          continue;
        }
        if (kind === 'small') { for (let y = hy + 2; y <= hy + 3; y++) { fput(ex, y, EYE); fput(ex + 1, y, EYE); } continue; }
        const wide = kind === 'wide', x0 = wide ? (s < 0 ? ex - 1 : ex) : ex, w = wide ? 3 : 2, y0 = wide ? hy : hy + 1, h = wide ? 4 : 3;
        for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) fput(x, y, EYE);
        fput(x0, y0, SHINE);
        if (wide) fput(x0 + 1, y0 + 2, SHINE);
      }
    }
    function brows(kind) {
      const L = hx - 6, R = hx + 4;
      const row = (pts) => { for (const [x, y] of pts) fput(x, y, BROW); };
      if (kind === 'arched') row([[L, hy - 1], [L + 1, hy - 2], [L + 2, hy - 2], [R, hy - 2], [R + 1, hy - 2], [R + 2, hy - 1]]);
      else if (kind === 'high') row([[L, hy - 3], [L + 1, hy - 3], [L + 2, hy - 3], [R, hy - 3], [R + 1, hy - 3], [R + 2, hy - 3]]);
      else if (kind === 'angry') row([[L, hy - 2], [L + 1, hy - 1], [L + 2, hy], [R, hy], [R + 1, hy - 1], [R + 2, hy - 2]]);
      else if (kind === 'sly') row([[L, hy], [L + 1, hy], [L + 2, hy], [R, hy - 2], [R + 1, hy - 3], [R + 2, hy - 2]]);
      else if (kind === 'joy') row([[L, hy - 2], [L + 1, hy - 3], [L + 2, hy - 3], [R, hy - 3], [R + 1, hy - 3], [R + 2, hy - 2]]);
    }
    function blush(a, big) {
      for (const bx of [hx - 9, hx + 7]) {
        fblend(bx, hy + 4, BLUSH, a); fblend(bx + 1, hy + 4, BLUSH, a);
        if (big) { fblend(bx, hy + 5, BLUSH, a * 0.6); fblend(bx + 1, hy + 5, BLUSH, a * 0.6); fblend(bx + (bx < hx ? -1 : 2), hy + 4, BLUSH, a * 0.5); }
      }
    }
    function mouth(kind) {
      if (kind === 'grin') {                               // a big toothy grin
        fput(hx - 4, hy + 5, MOUTH); fput(hx + 4, hy + 5, MOUTH);
        fput(hx - 3, hy + 6, MOUTH); fput(hx + 3, hy + 6, MOUTH);
        for (let x = hx - 2; x <= hx + 2; x++) { fput(x, hy + 6, TEETH); fput(x, hy + 7, MOUTH); }
      } else if (kind === 'laugh') {                       // head thrown back, mouth wide
        for (let x = hx - 3; x <= hx + 3; x++) fput(x, hy + 5, MOUTH);
        fput(hx - 3, hy + 6, MOUTH); fput(hx + 3, hy + 6, MOUTH);
        for (let x = hx - 2; x <= hx + 2; x++) fput(x, hy + 6, TEETH);
        fput(hx - 2, hy + 7, MOUTH); fput(hx + 2, hy + 7, MOUTH);
        for (let x = hx - 1; x <= hx + 1; x++) { fput(x, hy + 7, x === hx - 1 ? INSIDE : TONGUE); fput(x, hy + 8, MOUTH); }
      } else if (kind === 'smirk') {                       // a sly smile, on the diagonal
        for (const [x, y] of [[hx - 2, hy + 7], [hx - 1, hy + 7], [hx, hy + 7], [hx + 1, hy + 6], [hx + 2, hy + 6], [hx + 3, hy + 5]]) fput(x, y, MOUTH);
      } else if (kind === 'pout') {
        for (const [x, y] of [[hx - 2, hy + 7], [hx - 1, hy + 6], [hx, hy + 6], [hx + 1, hy + 6], [hx + 2, hy + 7]]) fput(x, y, MOUTH);
      } else if (kind === 'o') {
        for (let y = hy + 5; y <= hy + 7; y++) for (let x = hx - 1; x <= hx + 1; x++) fput(x, y, y === hy + 6 && x === hx ? INSIDE : MOUTH);
      }
    }
    function drop(x, y) {
      fput(x, y, DROP); fput(x, y + 1, DROP); fput(x - 1, y + 1, DROPD); fput(x + 1, y + 1, DROP);
      fput(x, y + 2, DROPD); fput(x - 1, y, LINE); fput(x + 1, y, LINE); fput(x, y - 1, LINE);
    }
    function sparkle(x, y, big) {
      put(buf, x, y, SPARK);
      if (big) { put(buf, x - 1, y, SPARK); put(buf, x + 1, y, SPARK); put(buf, x, y - 1, SPARK); put(buf, x, y + 1, SPARK); }
    }

    const SPRAY = Array.from({ length: 12 }, (_, i) => ({ x: hash(i, 7) * W, k: 4 + (i % 4), p: hash(i, 8) }));
    const PALM_L = ['#8ab050', '#5a8a3a', '#3a6030'].map(C);
    const ROW = new Uint32Array(W);

    function frame(t, mood, since) {
      const u = t / LOOP, age = ((t - since) % LOOP + LOOP) % LOOP;
      buf.set(BG);
      // A vulture circling high on the right.
      {
        const a = TAU * 4 * u, x = 47 + Math.cos(a) * 7, y = 8 + Math.sin(a) * 2, up = Math.sin(TAU * 45 * u) > 0.5;
        for (const [dx, dy] of up ? [[-3, -2], [-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1], [3, -2]] : [[-3, 1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 1]]) put(buf, x + dx, y + dy, C('#3a2a4a'));
      }
      // Heat shimmer: rows over the far dunes wobble sideways.
      for (let y = 44; y < 62; y++) {
        const dx = Math.round(Math.sin(TAU * 30 * u + y * 0.9) * 0.9 * Math.sin(TAU * 5 * u + y * 0.3));
        if (!dx) continue;
        const o = y * W;
        ROW.set(buf.subarray(o, o + W));
        for (let x = 0; x < W; x++) buf[o + x] = ROW[Math.min(W - 1, Math.max(0, x - dx))];
      }
      // Palm fronds swaying.
      {
        const tx = PALM.x + 2, ty = PALM.y - 11;
        for (let f = 0; f < 5; f++) {
          const a = -Math.PI / 2 + (f - 2) * 0.75 + Math.sin(TAU * 12 * u + f) * 0.1;
          for (let r = 0; r < 6; r++) put(buf, tx + Math.cos(a) * r, ty + Math.sin(a) * r * 0.6 + r * r * 0.08, PALM_L[r < 2 ? 2 : r < 4 ? 1 : 0]);
        }
      }
      // Sand streaming off the near crest, down the slope.
      for (const s of SPRAY) {
        const v = frac(s.k * u + s.p), x = s.x + v * 12, y = Math.round(70 + tilt(s.x) * 0.6 + 1.5 * Math.sin(s.x / 6 + 2)) - 1 - Math.sin(v * Math.PI) * 3 + v * 2;
        blendAt(buf, x, y, C('#fff0c8'), 0.7 * (1 - v));
      }


      // ----- the figure -----
      const breath = Math.sin(TAU * 20 * u) > 0.35 ? 1 : 0;
      let oy = breath, hand = null;
      LEAN = 2 + 2 * Math.sin(TAU * 6 * u);               // the habit: a slow lean down the slope
      if (mood === 'gleeful') {
        hand = { x: CX - 13, y: 46, finger: [[-2, -2], [-3, -3]] };            // pointing up the diagonal
      } else if (mood === 'cackle') {
        LEAN = 2 + 2.5 * Math.sin(TAU * 80 * u);                               // rocking with laughter
        oy -= Math.sin(TAU * 160 * u) > 0.3 ? 1 : 0;
        hand = { x: CX - 7, y: 56 };                                            // holding the belly
      } else if (mood === 'scheming') {
        LEAN = 5;                                                               // leaning right in
        hand = { x: CX - 8, y: 44 - (frac(30 * u) < 0.12 ? 1 : 0) };            // tapping the chin
      } else if (mood === 'huffy') {
        LEAN = -2;                                                              // reeling back, indignant
        hand = { x: CX - 14, y: 39 + (Math.sin(TAU * 240 * u) > 0 ? 1 : 0) };   // shaking a fist
      } else if (mood === 'shocked') {
        LEAN = age < 0.25 ? 3 * (1 - age / 0.25) : 0;                           // snaps upright
        oy -= age < 0.4 ? Math.round(3 * Math.sin(Math.PI * age / 0.4)) : 0;
        hand = { x: CX - 15, y: 36 };                                           // hand thrown up
      }
      body(oy, hand);
      over(buf, SPR);

      hx = HX; hy = HY + oy;
      // Shine on the mitre and a glint on the orb.
      fput(hx - 6, hy - 6, SHINE); fput(hx - 5, hy - 7, SHINE); fput(hx - 6, hy - 5, SHINE);
      fput(CX + 14, 16 + oy, SHINE);
      const blink = mood !== 'cackle' && frac(12 * u + 0.4) < 0.03;
      if (mood === 'gleeful') {
        eyes(blink ? 'blink' : 'dot'); brows('arched'); blush(0.55, false); mouth('grin');
        const s = Math.sin(TAU * 10 * u + 1);
        if (s > 0.6) sparkle(CX + 15 + sh(15), 13 + oy, s > 0.85);
      } else if (mood === 'cackle') {
        eyes('arc'); brows('joy'); blush(0.7, true); mouth('laugh');
        // Tears of laughter and "heh heh" lines bursting on alternate sides.
        const ph = frac(20 * u);
        drop(hx - 8, hy + 2 + Math.round(ph * 3)); drop(hx + 8, hy + 2 + Math.round(frac(ph + 0.5) * 3));
        const side = Math.sin(TAU * 40 * u) > 0 ? -1 : 1, lx = side < 0 ? hx - 14 : hx + 12;
        for (let i = 0; i < 3; i++) {
          const ly = hy - 9 + i * 4, dx = side * (i === 1 ? 1 : 0);
          fput(lx + dx, ly, SPARK); fput(lx + dx + side, ly - 1, SPARK);
        }
      } else if (mood === 'scheming') {
        eyes(blink ? 'blink' : 'lid'); brows('sly'); mouth('smirk');
        // The orb pulses: he is calculating an angle.
        const p = Math.sin(TAU * 15 * u);
        if (p > 0.2) sparkle(CX + 16 + sh(17), 17 + oy, p > 0.7);
      } else if (mood === 'huffy') {
        eyes(blink ? 'blink' : 'small'); brows('angry'); blush(0.9, true); mouth('pout');
        // Steam puffs out of the mitre.
        for (let k = 0; k < 2; k++) {
          const v = frac(15 * u + k * 0.5), side = k ? 1 : -1;
          if (v > 0.8) continue;
          const px = hx + side * (4 + v * 6), py = 11 + oy - v * 7, r = 1.6 + v * 1.8;
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            const d = Math.hypot(dx, dy) / r;
            if (d < 0.6 && v < 0.6) put(buf, px + dx + sh(10), py + dy, PUFF);
            else if (d < 1) blendAt(buf, px + dx + sh(10), py + dy, PUFF, (1 - d * 0.5) * (1 - v));
          }
        }
      } else {
        eyes(blink ? 'blink' : 'wide'); brows('high'); mouth('o');
        if (age > 0.1) {                                    // "!" pops up, left of the mitre
          const bx = 14, by = 10 + (age < 0.3 ? 2 : 0);
          for (let y = by; y < by + 5; y++) { put(buf, bx, y, BANG); put(buf, bx - 1, y, LINE); put(buf, bx + 1, y, LINE); }
          put(buf, bx, by + 6, BANG); put(buf, bx, by - 1, LINE); put(buf, bx, by + 5, LINE); put(buf, bx, by + 7, LINE);
          put(buf, bx - 1, by + 6, LINE); put(buf, bx + 1, by + 6, LINE);
        }
      }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'gleeful', (state && state.since) || 0);
    };
  },
});
