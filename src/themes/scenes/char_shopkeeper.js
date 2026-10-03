// Nour, keeper of the Crossroads Bazaar: the Shop's live shopkeeper.
//
// 96x106, see-through, shown at 4x over the `shop` scene (ShopScreen puts it in the
// curtained doorway; the bottom edge is the counter). A living chess board standing on
// the counter on two stubby legs in pointed babouche slippers, a red bazaar fez with a
// swinging tassel on its top corner, and a big cartoon face drawn right over its squares:
// two round eyes with brows and a wide mouth. Drawn as a flat 2D cartoon: every part a
// simple shape in one flat colour, a hard shadow band on its lower right, a highlight on
// its upper left, a bold dark outline, and a varnish shine across the squares. Warm
// lamplight from above, a cool moonlit rim on the right edge.
// Moods: idle (default: sways, breathes, blinks, glances about; every 12 s a ripple of
// flipping squares runs down the diagonals), greet (a hop, brows up, a big open smile,
// sparkles), talk (the mouth flaps with the words, brows bob), happy (a sale: ^ ^ eyes,
// blush, a grin with its tongue out, bouncing, coins), nope (can't afford it: a frown,
// grumpy brows, a shake, a sweat drop, the squares go dim), bye (a wink, and it tips its
// fez).
LiveScenes.register({
  id: 'char_shopkeeper',
  width: 96,
  height: 106,
  loop: 60,
  still: 1,
  opaque: false,
  moods: ['idle', 'greet', 'talk', 'happy', 'nope', 'bye'],
  frames: { face: [18, 22, 60, 60] },
  create() {
    const W = 96, H = 106, LOOP = 60;
    const { TAU, C, frac, hash } = PixelKit;
    const { put } = PixelKit.surface(W, H);
    let buf = null;

    // Flat cel palettes: [highlight, base, shadow].
    const P = hs => hs.map(C);
    const WOOD = P(['#d4965a', '#8e5632', '#5a3420']);
    const BRASS = P(['#ffe08a', '#e0a640', '#9c6228']);
    const FEZ = P(['#ff8a6a', '#d8322a', '#8a1a24']);
    const SLIP = P(['#fff4a0', '#ffc83a', '#b07a1c']);
    const LEG = P(['#8e5632', '#6a3e24', '#4a2a18']);
    // The squares: light and dark, lit and in the lower-right shade, and dimmed (nope).
    const SQ = { light: C('#f2dcae'), lightS: C('#dcc08c'), dark: C('#9a6238'), darkS: C('#7c4a2a'),
      lightDim: C('#c8b08a'), darkDim: C('#6a4228'), shineL: C('#fff6e0'), shineD: C('#c08050') };
    const RIM = C('#8a9ad0'), LINE = C('#1c1018'), WHITE = C('#ffffff');
    const EYE = C('#ffffff'), EYES = C('#d8dcee'), PUPIL = C('#1c1018'), LID = C('#8e5632');
    const MOUTH = C('#5a1428'), TONGUE = C('#ff7a8a'), TEETH = C('#ffffff'), BLUSH = C('#ff9a8a');
    const SPARK = C('#fff4c0'), SPARK2 = C('#ffd24a'), SWEAT = [C('#e0f4ff'), C('#6ab8f0')], SMOKE = [C('#d8d0dc'), C('#a89cb0')];

    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H);
    const SLIPPER = 1, LEGP = 2, FRAME = 3, SQUARE = 4, CAPP = 5, FEZP = 6, TASSEL = 7;

    // Fill every pixel where f(x, y), flat: base colour, a shadow band where the shape
    // ends toward the lower right (sd), a highlight where it ends toward the upper left (hl).
    function fill(part, f, [x0, y0, x1, y1], pal, sd = [2, 2], hl = [1, 1]) {
      for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
        if (!f(x, y)) continue;
        let c = pal[1];
        if (sd && !f(x + sd[0], y + sd[1])) c = pal[2];
        else if (hl && !f(x - hl[0], y - hl[1])) c = pal[0];
        const i = y * W + x;
        SPR[i] = c; PART[i] = part;
      }
    }
    const box = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

    // The board: outer 64x64 at (16, 26), a 4 px frame, 8x8 squares of 7 px.
    const BX = 16, BY = 26, BS = 64, IN = BX + 4, INY = BY + 4, SQS = 7;

    function build(o) {
      const { ox, oy, fez, tass, ripple, dim } = o;
      SPR.fill(0); PART.fill(0);
      // Slippers and legs stay on the counter; the rest sways (ox) and bobs (oy).
      for (const [lx, dir] of [[33, -1], [61, 1]]) {
        fill(LEGP, box(lx - 1 + Math.round(ox / 2), 88 + oy, lx + 1 + Math.round(ox / 2), 99), [lx - 3, 86, lx + 3, 100], LEG, [1, 0], [1, 0]);
        // A pointed babouche, its toe curling up and out.
        const sl = (x, y) => {
          const a = (x - lx) * dir;                        // along the foot, toward the toe
          if (y >= 99 && y <= 103) return a >= -4 && a <= 6 - (y === 99 ? 2 : 0);
          return (y === 98 && a >= 6 && a <= 8) || (y === 97 && a === 9);
        };
        fill(SLIPPER, sl, [lx - 11, 96, lx + 11, 104], SLIP, [0, 1], [0, 1]);
      }
      // The frame and the squares.
      const bx = BX + ox, by = BY + oy;
      fill(FRAME, box(bx, by, bx + BS - 1, by + BS - 1), [bx, by, bx + BS - 1, by + BS - 1], WOOD, [2, 2], [1, 1]);
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        let light = (r + c) % 2 === 0;
        if (ripple !== null && r + c === ripple) light = !light;          // the idle ripple flips a diagonal
        const x0 = IN + ox + c * SQS, y0 = INY + oy + r * SQS;
        for (let y = y0; y < y0 + SQS; y++) for (let x = x0; x < x0 + SQS; x++) {
          const i = y * W + x, edge = x === x0 + SQS - 1 || y === y0 + SQS - 1;
          // Lower-right squares sit a little in the shade of the lamp.
          const shade = r + c >= 11 || (edge && (r === 7 || c === 7));
          SPR[i] = dim ? (light ? SQ.lightDim : SQ.darkDim) : light ? (shade ? SQ.lightS : SQ.light) : (shade ? SQ.darkS : SQ.dark);
          PART[i] = SQUARE;
          // A varnish shine: one diagonal streak across the upper left.
          const d = (x - IN - ox) + (y - INY - oy);
          if (!dim && (d === 14 || d === 15 || d === 19)) SPR[i] = light ? SQ.shineL : SQ.shineD;
        }
      }
      // Brass caps on the corners.
      for (const [cx, cy] of [[bx, by], [bx + BS - 5, by], [bx, by + BS - 5], [bx + BS - 5, by + BS - 5]]) {
        fill(CAPP, box(cx, cy, cx + 4, cy + 4), [cx, cy, cx + 4, cy + 4], BRASS, [1, 1], [1, 1]);
      }
      // The fez on the top right corner, leaning a little, and its tassel.
      const fx = bx + 47, fy = by - 1 - fez, FH = 13;
      const fz = (x, y) => {
        const k = fy - y;                                  // height above the rim
        if (k < 0 || k > FH) return false;
        const lean = Math.floor(k / 5), half = 8 - k * 0.22;
        return x >= Math.round(fx - half + lean) && x <= Math.round(fx + half + lean);
      };
      fill(FEZP, fz, [fx - 10, fy - FH - 1, fx + 12, fy], FEZ, [2, 1], [1, 1]);
      for (let x = fx - 9; x <= fx + 9; x++) for (const y of [fy - 1, fy - 2]) if (PART[y * W + x] === FEZP) SPR[y * W + x] = FEZ[2];   // its band
      // Tassel: a cord from the top of the crown down its right side, and a golden end.
      const t0x = fx + 3, t0y = fy - FH;
      for (let k = 0; k <= 9; k++) {
        const x = Math.round(t0x + k * 0.8 + tass * k / 9), y = t0y + k;
        if (x >= 0 && x < W && y >= 0) { SPR[y * W + x] = LINE; PART[y * W + x] = TASSEL; }
      }
      const ex = Math.round(t0x + 7 + tass), ey = t0y + 10;
      fill(TASSEL, box(ex - 1, ey, ex + 1, ey + 4), [ex - 1, ey, ex + 1, ey + 4], BRASS, [1, 1], [1, 0]);
      // Bold outline around everything; seams where a front part meets one behind it.
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, p = PART[i];
        const l = x > 0 ? PART[i - 1] : 0, r = x < W - 1 ? PART[i + 1] : 0, u = y > 0 ? PART[i - W] : 0, d = y < H - 1 ? PART[i + W] : 0;
        if (!p) { if (l || r || u || d) SPR[i] = LINE; continue; }
        if (p !== SQUARE && p !== TASSEL && (l > p || r > p || u > p || d > p)) SPR[i] = LINE;
      }
      // The cool rim of moonlight down the frame's right edge.
      for (let y = by + 3; y < by + BS - 6; y++) { const i = y * W + bx + BS - 2; if (PART[i] === FRAME) SPR[i] = RIM; }
    }

    // ---------- the face (hand-placed pixels over the squares) ----------
    const EYE_Y = 46, EYE_L = 37, EYE_R = 58, MOUTH_X = 48, MOUTH_Y = 68;
    const pp = (x, y, c) => put(buf, x, y, c);
    // An open eye: white oval, outline, pupil looking (lx, ly), a shine; `lid` 0..1 closes it from the top.
    function eye(cx, cy, lx, ly, lid = 0, wide = 0) {
      const rx = 5.5 + wide, ry = 6.5 + wide;
      for (let y = -8; y <= 8; y++) for (let x = -7; x <= 7; x++) {
        const v = (x / rx) ** 2 + (y / ry) ** 2;
        if (v > 1.32) continue;
        if (v > 1) { pp(cx + x, cy + y, LINE); continue; }
        const lidY = -ry + lid * ry * 2;
        pp(cx + x, cy + y, y < lidY ? LID : (x + y > 5 ? EYES : EYE));
        if (lid > 0 && Math.abs(y - Math.round(lidY)) < 1) pp(cx + x, cy + y, LINE);
      }
      if (lid >= 0.8) return;
      const px = cx + lx - 1, py = cy + ly - 1;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) if (py + y > cy - ry + lid * ry * 2) pp(px + x, py + y, PUPIL);
      pp(px, py, WHITE);
    }
    // A closed happy eye (^) or a blink (a flat line).
    function arc(cx, cy, up) {
      for (let x = -5; x <= 5; x++) {
        const y = up ? Math.round(Math.abs(x) * 0.6) - 2 : 0;
        pp(cx + x, cy + y, LINE); pp(cx + x, cy + y + 1, LINE);
      }
    }
    // Brows: tilt > 0 lowers the inner ends (grumpy), < 0 raises them (worried).
    function brow(cx, cy, side, tilt, raise) {
      for (let x = -5; x <= 5; x++) {
        const inner = side < 0 ? x : -x;                 // toward the middle of the face
        const y = cy - raise + Math.round((inner / 5) * tilt * 2) - (Math.abs(x) < 3 ? 1 : 0);
        pp(cx + x, y, LINE); pp(cx + x, y + 1, LINE);
      }
    }
    function mouth(kind, open) {
      const cx = MOUTH_X, cy = MOUTH_Y;
      if (kind === 'smile' || kind === 'grin') {
        const w = kind === 'grin' ? 11 : 8;
        for (let x = -w; x <= w; x++) { const y = Math.round((1 - (x / w) ** 2) * (kind === 'grin' ? 4 : 3)); pp(cx + x, cy + y, LINE); pp(cx + x, cy + y - 1, LINE); }
        pp(cx - w - 1, cy - 2, LINE); pp(cx + w + 1, cy - 2, LINE);
        return;
      }
      if (kind === 'frown') {
        for (let x = -7; x <= 7; x++) { const y = Math.round((x / 7) ** 2 * 3) + (x & 1); pp(cx + x, cy + 2 + y - 3, LINE); pp(cx + x, cy + 3 + y - 3, LINE); }
        return;
      }
      // Open: a D-shaped mouth (big), or an oval that grows with `open` (talking).
      const big = kind === 'open';
      const rx = big ? 11 : 4 + open * 2, ry = big ? 8 : 1 + open * 2;
      const top = big ? cy - 3 : cy - ry;
      for (let y = top - 1; y <= cy + ry + 1; y++) for (let x = -rx - 1; x <= rx + 1; x++) {
        const inside = big ? (y >= top && y <= cy + ry && (x / rx) ** 2 + ((Math.max(0, y - top)) / (ry + 3)) ** 2 <= 1)
          : (x / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
        const near = big ? (y >= top - 1 && y <= cy + ry + 1 && (x / (rx + 1)) ** 2 + ((Math.max(0, y - top + 1)) / (ry + 4)) ** 2 <= 1)
          : (x / (rx + 1)) ** 2 + ((y - cy) / (ry + 1)) ** 2 <= 1;
        if (!near) continue;
        if (!inside) { pp(cx + x, y, LINE); continue; }
        let c = MOUTH;
        if (y <= top + 1 && (big || open > 1)) c = TEETH;                  // the top teeth
        else if (y >= cy + ry - (big ? 3 : 1) && Math.abs(x) < rx * 0.6) c = TONGUE;
        pp(cx + x, y, c);
      }
    }
    function sparkle(x, y, big) {
      put(buf, x, y, SPARK);
      if (big) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(buf, x + dx, y + dy, SPARK2);
    }
    function coin(x, y) {
      for (const [dx, dy, c] of [[0, 0, BRASS[1]], [1, 0, BRASS[1]], [0, 1, BRASS[2]], [1, 1, BRASS[2]], [0, -1, BRASS[0]], [1, -1, BRASS[1]]]) put(buf, x + dx, y + dy, c);
    }
    function puff(x, y, r, c) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + r) put(buf, x + dx, y + dy, c);
    }
    // Speech: the mouth flaps like a talking puppet's.
    const talkFlap = u => { const v = Math.sin(TAU * 420 * u) + 0.6 * Math.sin(TAU * 260 * u + 1); return v > 0.2 ? (v > 1 ? 2 : 1) : 0; };

    function frame(t, mood, since) {
      const u = t / LOOP, age = ((t - since) % LOOP + LOOP) % LOOP;
      // Idle life: a slow sway, a breath every 3 s, glances, blinks, the tassel swinging.
      let ox = Math.round(Math.sin(TAU * 6 * u) * 1.2), oy = Math.sin(TAU * 20 * u) > 0.6 ? 1 : 0;
      const glance = [0, -2, 0, 2, 0, 1][Math.floor(frac(7 * u) * 6)];
      let look = [glance, 0], blink = frac(13 * u + 0.3) < 0.025;
      let tass = Math.round(Math.sin(TAU * 30 * u - 1) * 1.5);
      let fez = 0, ripple = null, dim = false;
      let face = { brow: [0, 0], lid: 0, wide: 0, mouth: 'smile', open: 0, left: 'eye', right: 'eye' };
      let blush = false, sparks = null, happy = false, sweat = null, smoke = null, bye = false;

      if (mood === 'greet') {
        oy = age < 0.45 ? -Math.round(4 * Math.sin(Math.PI * age / 0.45)) : oy;
        face = { brow: [-1, 3], lid: 0, wide: 1, mouth: 'open', open: 2, left: 'eye', right: 'eye' };
        look = [0, 0];
        sparks = age < 1.3 ? age / 1.3 : null;
        blink = false;
      } else if (mood === 'talk') {
        const flap = talkFlap(u);
        face = { brow: [0, flap > 1 ? 2 : 1], lid: 0, wide: 0, mouth: flap ? 'talk' : 'smile', open: flap, left: 'eye', right: 'eye' };
        look = [Math.round(Math.sin(TAU * 4 * u)), 0];
      } else if (mood === 'happy') {
        oy = age < 0.45 ? -Math.round(4 * Math.sin(Math.PI * age / 0.45)) : (Math.sin(TAU * 60 * u) > 0.7 ? -1 : 0);
        ox = Math.round(Math.sin(TAU * 12 * u) * 1.5);
        face = { brow: [-1, 2], lid: 0, wide: 0, mouth: 'open', open: 2, left: 'happy', right: 'happy' };
        blush = true; happy = true; blink = false;
      } else if (mood === 'nope') {
        const k = Math.max(0, 1 - age / 1.8);
        ox = Math.round(2 * Math.sin(TAU * age * 3.5) * k);
        face = { brow: [2, 0], lid: 0.35, wide: 0, mouth: 'frown', open: 0, left: 'eye', right: 'eye' };
        look = [0, 1];
        dim = age < 2.4;
        sweat = age < 2.2 ? age / 2.2 : null;
        smoke = age < 2.4 ? age / 2.4 : null;
      } else if (mood === 'bye') {
        ox = Math.round(Math.sin(TAU * 8 * u) * 2);
        // It tips its fez: up and back down every 2.5 s.
        const f = frac(age / 2.5);
        fez = f < 0.4 ? Math.round(5 * Math.sin(Math.PI * f / 0.4)) : 0;
        face = { brow: [0, 2], lid: 0, wide: 0, mouth: 'grin', open: 0, left: 'eye', right: 'happy' };
        bye = true; blink = false;
      } else {
        // Idle habit: every 12 s a ripple of flipped squares runs down the diagonals.
        const rp = frac(5 * u + 0.6);
        if (rp < 0.09) ripple = Math.floor(rp / 0.09 * 15);
        if (rp >= 0.09 && rp < 0.12) face.mouth = 'grin';          // pleased with itself
      }

      build({ ox, oy, fez, tass, ripple, dim });
      buf.set(SPR);

      const X = ox, Y = oy;
      if (face.left === 'happy') arc(EYE_L + X, EYE_Y + Y, true);
      else if (blink) arc(EYE_L + X, EYE_Y + Y + 1, false);
      else eye(EYE_L + X, EYE_Y + Y, look[0], look[1], face.lid, face.wide);
      if (face.right === 'happy') arc(EYE_R + X, EYE_Y + Y, true);
      else if (blink) arc(EYE_R + X, EYE_Y + Y + 1, false);
      else eye(EYE_R + X, EYE_Y + Y, look[0], look[1], face.lid, face.wide);
      brow(EYE_L + X, EYE_Y - 9 + Y, -1, face.brow[0], face.brow[1]);
      brow(EYE_R + X, EYE_Y - 9 + Y, 1, face.brow[0], face.brow[1]);
      mouth(face.mouth, face.open);
      if (face.mouth !== 'talk' && face.mouth !== 'open') { /* drawn at rest */ }
      if (blush) for (const bx of [EYE_L - 6, EYE_R + 3]) for (let dx = 0; dx < 4; dx++) { pp(bx + dx + X, EYE_Y + 9 + Y, BLUSH); if (dx % 2) pp(bx + dx + X, EYE_Y + 10 + Y, BLUSH); }

      // Greet: a ring of sparkles bursting out.
      if (sparks !== null) {
        for (let r = 0; r < 10; r++) {
          const a = TAU * r / 10 + 0.3, d = 34 + sparks * 10;
          sparkle(Math.round(48 + Math.cos(a) * d), Math.round(58 + Math.sin(a) * d * 0.8), r % 2 === 0);
        }
      }
      // Happy: sparkles round it and coins bobbing up.
      if (happy) {
        const pts = [[8, 30], [88, 26], [6, 58], [90, 56], [14, 12], [84, 10]];
        pts.forEach(([x, y], i) => { const v = Math.sin(TAU * (40 + i * 7) * u + i); if (v > 0.2) sparkle(x, y - Math.round(Math.min(age, 1) * 3), v > 0.7); });
        for (let i = 0; i < 4; i++) {
          const v = frac(4 * u + i / 4);
          coin(i % 2 ? 86 - i * 2 : 8 + i * 2, Math.round(96 - v * 40));
        }
      }
      // Nope: a sweat drop slides down the frame, a grey puff rises.
      if (sweat !== null) {
        const sx = 80 + X, sy = 34 + Math.round(sweat * 16);
        pp(sx, sy - 1, SWEAT[0]); pp(sx, sy, SWEAT[1]); pp(sx - 1, sy + 1, SWEAT[1]); pp(sx + 1, sy + 1, SWEAT[1]); pp(sx, sy + 1, SWEAT[0]); pp(sx, sy + 2, SWEAT[1]);
      }
      if (smoke !== null) {
        const k = smoke;
        puff(14 + Math.round(Math.sin(TAU * k) * 2), 24 - Math.round(k * 14), 1 + Math.round(k * 2), SMOKE[1]);
        puff(20, 20 - Math.round(k * 12), 1 + Math.round(k * 1.5), SMOKE[0]);
      }
      if (bye) { const v = Math.sin(TAU * 50 * u); if (v > 0.3) sparkle(88, 18, v > 0.8); }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'idle', (state && state.since) || 0);
    };
  },
});
