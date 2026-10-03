// The First Piece: a live character portrait (Story Mode ending).
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the dialogue bubble. The small, very old pawn that stood inside Grandmaster
// X's crystal: worn ivory, long drooping white brows and moustache, leaning on a little
// cane. The last shards of the crystal drift up around it and fade, and behind it dawn
// comes up over the Great Board. Moods: weary (default), remorse, peace. Breathes slowly,
// blinks slowly, and its cane hand trembles now and then.
LiveScenes.register({
  id: 'char_firstpiece',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['weary', 'remorse', 'peace'],
  frames: { face: [10, 17, 40, 40] },
  moodFor(category) {
    // Only appears in the ending cutscene; fights never show it.
    return null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, clamp, sq, frac, ramp, hash, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over } = K;
    let buf = null;

    // ---------- backdrop: the last of the night over the Great Board, dawn coming up ----------
    const BG = new Uint32Array(W * H);
    const SKY = ['#0c0818', '#1a0c2c', '#2e1044', '#4a1a5a', '#74296a', '#a84468', '#d86c68', '#f4a070', '#ffd49a', '#fff0c8'].map(C);
    const HOR = 66;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - CX - 4, (y - HOR - 2) * 2.2);
      const t = y / 104 + 0.36 * Math.exp(-sq(d / 26)) + 0.12 * Math.exp(-sq(Math.hypot(x - CX, y - 36) / 15));
      BG[y * W + x] = ramp(SKY, t, x, y);
    }
    // Far fragments of board, dark against the dawn (drawn in frame(), they bob).
    function fragSprite(cells, tw, th, skew) {
      const w = 4 * tw + 3 * skew, h = 3 * th + 2, px = new Uint32Array(w * h);
      const set = new Set(cells.map(([i, j]) => i + ',' + j));
      const at = (x, y) => { const jf = y / th, j = Math.floor(jf), i = Math.floor((x - jf * skew) / tw); return set.has(i + ',' + j) ? (i + j) % 2 : -1; };
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = at(x, y);
        if (v >= 0) px[y * w + x] = C(y === 0 || at(x, y - 1) < 0 ? '#e8a080' : v ? '#5a2a5a' : '#7a4270');
        else if (y > 0 && at(x, y - 1) >= 0) px[y * w + x] = C('#3a1a44');
      }
      return { w, h, px };
    }
    const FRAGS = [
      { spr: fragSprite([[0, 0], [1, 0], [1, 1]], 3, 2, 1), x: 3, y: 40, k: 2, p: 0.3 },
      { spr: fragSprite([[0, 0], [1, 0], [0, 1]], 2, 1, 1), x: 50, y: 30, k: 3, p: 2.2 },
      { spr: fragSprite([[0, 0], [1, 0], [2, 0], [1, 1]], 2, 2, 1), x: 47, y: 52, k: 2, p: 4.4 },
    ];
    // The Great Board underfoot, lit warm by the dawn.
    const FL = ['#f0e0c8', '#d8c0a8', '#a88878'].map(C), FD = ['#6a3a60', '#502a50', '#3a1c40'].map(C);
    for (let y = HOR + 4; y < H; y++) {
      const Z = 40 / (y - HOR);
      for (let x = 0; x < W; x++) {
        const X = (x - CX) * Z / 11, i = Math.floor(X + 40), j = Math.floor(Z * 0.9);
        const row = Math.min(2, ((y - HOR - 4) / 3) | 0);
        let c = (i + j) % 2 ? FD[row] : FL[row];
        if (y === HOR + 4) c = C('#ffe0a0');
        BG[y * W + x] = c;
      }
    }
    const STARS = Array.from({ length: 12 }, (_, i) => ({ x: hash(i, 31) * W | 0, y: hash(i, 32) * 22 | 0, k: 3 + (i % 7), p: hash(i, 33) * TAU }));
    // The last crystal shards: they rise, turn to light and fade.
    const SHARDS = Array.from({ length: 6 }, (_, i) => ({ x: [8, 52, 14, 47, 21, 42][i], k: [2, 2, 3, 3, 2, 3][i], p: i / 6 + hash(i, 41) * 0.1, w: hash(i, 42) * TAU, s: 1 + (i % 2) * 0.8 }));
    // Vignette on the sky only (dither over the checker floor reads as noise).
    const VIG = [];
    for (let y = 0; y < HOR + 4; y++) for (let x = 0; x < W; x++) {
      const v = ((x - W / 2) / (W / 2)) ** 2 * 0.55 + ((y - H / 2) / (H / 2)) ** 2 * 0.7;
      if (clamp((v - 0.42) * 1.2) > PixelKit.bay(x, y)) VIG.push(y * W + x);
    }
    const VIGC = C('#0a0612');
    const vignette = b => { for (const i of VIG) blend(b, i, VIGC, 0.35); };

    // ---------- The First Piece ----------
    const IVORY = ['#fbf2e0', '#efe4cc', '#d8c8b0', '#ac9c98', '#7e6e80', '#5e4e66'].map(C);
    const RIM = C('#ffd48a'), LINE = C('#2e1e2e'), SEAM = C('#b4a4a4'), HANDLINE = C('#6e5a6a'), HAIRLINE = C('#8a7a90');
    const HAIR = ['#ffffff', '#ece8f0', '#c0b8cc'].map(C);
    const WOOD = ['#b07848', '#7a4a2c', '#4a2a1c'].map(C);
    const LN = Math.hypot(0.55, 0.62, 0.56), LX = -0.55 / LN, LY = -0.62 / LN, LZ = 0.56 / LN;
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H);
    const P_BASE = 1, P_SKIRT = 2, P_COLLAR = 3, P_HEAD = 4, P_CANE = 5, P_HAIR = 6, P_HAND = 7;

    function shade(x, y, nx, ny, part, T = IVORY) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * LX + ny * LY + nz * LZ;
      const i = y * W + x;
      SPR[i] = T === IVORY && nx > 0.74 && l < 0.3 ? RIM : T[Math.round(clamp(1 - (l * 0.6 + 0.44)) * (T.length - 2))];
      PART[i] = part;
    }
    function flat(x, y, c, part) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      SPR[y * W + x] = c; PART[y * W + x] = part;
    }
    function disc(cx, cy, rx, ry, part, T) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.95, ny * 0.95, part, T);
      }
    }

    // Brows and moustache, long and white, drooping past the edge of the head.
    function hair(hx, hy, kind) {
      // Brows: a thick white tuft over each eye whose outer end hangs down past the head.
      const BROWS = {
        weary: [[2, -4], [3, -4], [4, -4], [5, -4], [6, -4], [3, -3], [4, -3], [5, -3], [6, -3], [7, -3], [8, -3], [7, -2], [8, -2], [9, -2], [9, -1], [10, -1], [10, 0], [11, 0], [11, 1]],
        sad: [[2, -5], [3, -5], [4, -5], [3, -4], [4, -4], [5, -4], [6, -4], [5, -3], [6, -3], [7, -3], [8, -3], [7, -2], [8, -2], [9, -2], [9, -1], [10, -1], [10, 0], [11, 0], [11, 1], [11, 2]],
        peace: [[2, -5], [3, -5], [4, -5], [5, -5], [6, -5], [3, -4], [4, -4], [5, -4], [6, -4], [7, -4], [8, -4], [8, -3], [9, -3], [10, -3], [10, -2]],
      }[kind];
      for (const s of [-1, 1]) {
        for (const [dx, dy] of BROWS) flat(hx + s * dx, hy + dy, HAIR[dx > 8 ? 1 : 0], P_HAIR);
        // Moustache: two soft curls drooping from the middle.
        for (const [dx, dy] of [[0, 5], [1, 5], [2, 5], [3, 5], [1, 4], [2, 4], [3, 6], [4, 6], [4, 7]]) flat(hx + s * dx, hy + dy, HAIR[dx > 2 ? 1 : 0], P_HAIR);
      }
    }

    function body(ox, oy, headDX, mood, tremble, wave) {
      SPR.fill(0); PART.fill(0);
      // Base: squat, worn at the rim.
      for (let y = 66; y <= 74; y++) {
        const top = y - 66, hw = 13 - (top < 2 ? 2 - top : 0) - (y === 74 ? 1 : 0);
        for (let x = CX - hw; x <= CX + hw; x++) shade(x + ox, y, (x - CX) / 14, y < 68 ? -0.6 : 0.1, P_BASE);
      }
      // Skirt, slightly bowed with age.
      for (let y = 50; y <= 66; y++) {
        const hw = 5 + Math.pow((y - 50) / 16, 1.7) * 8;
        const lean = Math.round((66 - y) / 16 * -1);
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) shade(x + ox + lean, y + (y < 54 ? oy : 0), (x - CX) / (hw + 0.5), 0.12, P_SKIRT);
      }
      disc(CX - 1 + ox, 49 + oy, 8.5, 2.4, P_COLLAR);
      const hx = CX - 1 + ox + headDX, hy = 38 + oy;
      disc(hx, hy, 10.4, 10.2, P_HEAD);
      // Cane: a crook at the top, down to the floor.
      const cx0 = 17 + ox;
      for (let y = 55; y <= 74; y++) flat(cx0 + (y > 66 ? -1 : 0), y, WOOD[y % 5 === 0 ? 1 : 0], P_CANE);
      for (const [dx, dy] of [[0, -1], [1, -2], [2, -2], [3, -1], [3, 0]]) flat(cx0 + dx, 55 + dy, WOOD[0], P_CANE);
      // Hands: one on the cane (it trembles), one at the chest (on the heart in remorse).
      disc(18 + ox, 54 + tremble, 2.6, 2.3, P_HAND);
      // The other hand: behind its back when weary, on its heart in remorse, a small wave in peace.
      if (mood === 'remorse') disc(CX + 3 + ox, 53 + oy, 2.6, 2.3, P_HAND + 1);
      else if (mood === 'peace') disc(CX + 12 + ox + wave, 47 + oy, 2.6, 2.4, P_HAND + 1);
      hair(hx, hy, mood === 'remorse' ? 'sad' : mood === 'peace' ? 'peace' : 'weary');
      // Worn chips in the ivory (static, a very old piece).
      for (const [x, y] of [[CX + 8, 70], [CX + 9, 71], [CX - 10, 69], [CX + 4, 59], [CX + 5, 60], [CX + 5, 61], [CX + 6, 62], [CX - 4, 63], [CX - 5, 64], [CX + 1, 71], [CX + 2, 72]])
        if (PART[y * W + x + ox] && PART[y * W + x + ox] <= P_SKIRT) SPR[y * W + x + ox] = IVORY[3];

      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        const a = PART[i - 1], b = PART[i + 1], c = PART[i - W], d = PART[i + W];
        if (!p) { if (a || b || c || d) SPR[i] = LINE; }
        else if (p === P_HAIR) { if (d && d < p) SPR[i] = HAIRLINE; }          // hair: only a shadow underneath
        else if ((a && a < p) || (b && b < p) || (c && c < p) || (d && d < p)) SPR[i] = p >= P_HAND ? HANDLINE : p === P_CANE ? WOOD[2] : SEAM;
      }
      return { hx, hy };
    }

    const EYE = C('#2a1a2a'), LID = C('#9a8a94'), MOUTH = C('#5a3a44'), WRINKLE = C('#c4b4ac');
    const TEAR = C('#8ae0ff'), TEARD = C('#3a8ab0'), BLUSH = C('#f4a8a8'), GLOW = C('#fff0c0');

    function eyes(hx, hy, kind) {
      for (const s of [-1, 1]) {
        const ex = s < 0 ? hx - 5 : hx + 4;          // eye pixels ex, ex+1
        const ey = hy;
        if (kind === 'weary') {                      // heavy lids half down
          put(buf, ex, ey, EYE); put(buf, ex + 1, ey, EYE);
          put(buf, ex, ey - 1, LID); put(buf, ex + 1, ey - 1, LID); put(buf, s < 0 ? ex - 1 : ex + 2, ey, LID);
        } else if (kind === 'blink') {
          put(buf, ex, ey, LID); put(buf, ex + 1, ey, LID);
        } else if (kind === 'sad') {                 // closed, lids sloping down outward
          put(buf, ex, ey, EYE); put(buf, ex + 1, ey, EYE);
          put(buf, s < 0 ? ex - 1 : ex + 2, ey + 1, EYE);
        } else {                                     // peace: gentle closed smile
          put(buf, ex - 1, ey + 1, EYE); put(buf, ex, ey, EYE); put(buf, ex + 1, ey, EYE); put(buf, ex + 2, ey + 1, EYE);
        }
        // crow's feet
        const wx = s < 0 ? ex - 2 : ex + 3;
        put(buf, wx, ey + 1, WRINKLE); put(buf, wx + (s < 0 ? -1 : 1), ey + 2, WRINKLE);
      }
    }

    function frame(t, mood, since) {
      const u = t / LOOP;
      buf.set(BG);
      for (const s of STARS) { const v = Math.sin(TAU * s.k * u + s.p); if (v > 0.2) put(buf, s.x, s.y, C(v > 0.8 ? '#ffffff' : '#c8a0ff')); }
      for (const f of FRAGS) K.blit(buf, f.spr, f.x + Math.round(Math.sin(TAU * (f.k - 1) * u + f.p)), f.y + Math.round(1.5 * Math.sin(TAU * f.k * u + f.p * 2)));
      // Dawn light breathing on the horizon.
      const dawn = 0.5 + 0.5 * Math.sin(TAU * 2 * u);
      for (let x = 0; x < W; x++) blendAt(buf, x, HOR + 3, C('#fff0c8'), (0.25 + 0.2 * dawn) * Math.exp(-sq((x - CX - 4) / 22)));
      vignette(buf);
      // In peace the dawn warms the whole card behind it.
      if (mood === 'peace') K.glow(buf, CX, 46, 34, C('#ffd49a'), 0.38 + 0.06 * dawn);

      // Shards rising and dissolving into light (fewer and golden in peace).
      for (const s of SHARDS) {
        if (mood === 'peace' && s.s > 1) continue;
        const v = frac(s.k * u + s.p), x = s.x + Math.sin(v * 5 + s.w) * 2, y = 72 - v * 60;
        if (v < 0.55) {
          const c1 = mood === 'peace' ? C('#fff0c0') : C('#f0b0ff'), c2 = mood === 'peace' ? C('#f0c060') : C('#9a40d0');
          const a = v < 0.1 ? v / 0.1 : 1 - (v - 0.1) / 0.45 * 0.6;
          const sz = Math.max(1, Math.round(s.s * (1.2 - v)));             // shrinking as it fades
          for (let j = -2 * sz; j <= 2 * sz; j++) {
            const w = Math.floor(sz - Math.abs(j) / 2);
            for (let i = -w; i <= w; i++) blendAt(buf, x + i, y + j, i < 0 || (i === 0 && j < 0) ? c1 : c2, a);
          }
          blendAt(buf, x, y - 2 * sz, C('#ffffff'), a);
        } else if (v < 0.9) {                        // dust of light
          const a = (0.9 - v) / 0.35;
          blendAt(buf, x, y, GLOW, a * 0.9);
          if (Math.sin(TAU * 40 * u + s.w) > 0) blendAt(buf, x + 1, y - 1, GLOW, a * 0.5);
        }
      }

      // Pose: slow breath, a stoop, a slow nod; the cane hand trembles now and then.
      const breath = Math.sin(TAU * 14 * u) > 0.4 ? 1 : 0;
      let oy = breath, headDX = -1;
      if (mood === 'remorse') oy += 1;
      if (mood === 'peace') headDX = 0;
      const tremble = frac(6 * u) < 0.2 && Math.sin(TAU * 600 * u) > 0.3 ? 1 : 0;
      const wave = Math.sin(TAU * 30 * u) > 0.3 ? 1 : 0;
      const { hx, hy } = body(0, oy, headDX, mood, tremble, wave);
      over(buf, SPR);

      put(buf, hx - 5, hy - 6, C('#ffffff')); put(buf, hx - 4, hy - 7, C('#ffffff'));
      const blink = frac(10 * u + 0.2) < 0.045;
      if (mood === 'weary') {
        eyes(hx, hy, blink ? 'blink' : 'weary');
        put(buf, hx - 1, hy + 7, MOUTH); put(buf, hx, hy + 7, MOUTH); put(buf, hx + 1, hy + 7, MOUTH);
      } else if (mood === 'remorse') {
        eyes(hx, hy, 'sad');
        put(buf, hx - 1, hy + 7, MOUTH); put(buf, hx, hy + 7, MOUTH); put(buf, hx + 1, hy + 7, MOUTH);
        put(buf, hx - 2, hy + 8, MOUTH); put(buf, hx + 2, hy + 8, MOUTH);
        // A tear sliding down.
        const v = frac(8 * u);
        if (v < 0.7) { const ty = hy + 3 + Math.round(v * 6); put(buf, hx + 5, ty, TEAR); put(buf, hx + 5, ty + 1, TEARD); }
      } else {
        eyes(hx, hy, 'peace');
        put(buf, hx - 2, hy + 7, MOUTH); put(buf, hx - 1, hy + 8, MOUTH); put(buf, hx, hy + 8, MOUTH); put(buf, hx + 1, hy + 8, MOUTH); put(buf, hx + 2, hy + 7, MOUTH);
        for (const bx of [hx - 8, hx + 7]) { blendAt(buf, bx, hy + 4, BLUSH, 0.7); blendAt(buf, bx + 1, hy + 4, BLUSH, 0.7); }
        // A warm glow of dawn on its face.
        for (let i = 0; i < 3; i++) {
          const s = Math.sin(TAU * (12 + i * 5) * u + i * 2);
          if (s < 0.5) continue;
          const sx = [12, 50, 46][i], sy = [30, 24, 44][i];
          put(buf, sx, sy, GLOW);
          if (s > 0.8) { put(buf, sx - 1, sy, GLOW); put(buf, sx + 1, sy, GLOW); put(buf, sx, sy - 1, GLOW); put(buf, sx, sy + 1, GLOW); }
        }
      }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'weary', (state && state.since) || 0);
    };
  },
});
