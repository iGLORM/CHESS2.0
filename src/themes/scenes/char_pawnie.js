// Pawnie, the Village Rookie: a live character portrait.
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the game HUD and dialogue bubbles. A small, round, worried pawn standing
// in Pawn Hollow's golden-hour light, hands clasped. Moods: nervous (default), happy,
// scared, surprised. Breathes, blinks, fidgets; sweats when nervous, hops when happy,
// trembles when scared, and a "!" pops up when surprised.
LiveScenes.register({
  id: 'char_pawnie',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['nervous', 'happy', 'scared', 'surprised'],
  frames: { face: [11, 8, 40, 40] },
  moodFor(category) {
    return {
      gameStart: 'nervous', milestone: 'nervous',
      bossCapture: 'happy', bossCaptureBig: 'happy', bossCheck: 'happy', bossTaunt: 'happy', playerLowHealth: 'happy',
      playerCapture: 'scared', playerCaptureBig: 'scared', playerCheck: 'scared', lowHealth: 'scared',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, clamp, sq, frac, bay, ramp, hash, blend } = PixelKit;
    const { put, blendAt, over } = PixelKit.surface(W, H);
    let buf = null;

    // ---------- backdrop: Pawn Hollow at golden hour, glowing behind the head ----------
    const BG = new Uint32Array(W * H);
    const SKY = ['#352f64', '#523a78', '#7c4684', '#a85584', '#d06a7c', '#ea8a6c', '#f6ae66', '#ffd28a', '#ffecb8'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - CX, (y - 30) * 1.1);
      BG[y * W + x] = ramp(SKY, y / 72 + 0.34 * Math.exp(-sq(d / 20)) + 0.12 * Math.exp(-sq(d / 8)), x, y);
    }
    const hill = x => 60 + 3 * Math.sin(x / 9 + 1) + 2 * Math.sin(x / 4);
    const HILL = ['#a07a9a', '#8a6a96', '#7a5e8e'].map(C), HRIM = C('#f4c090');
    for (let x = 0; x < W; x++) {
      const ty = Math.round(hill(x));
      for (let y = ty; y < H; y++) BG[y * W + x] = y === ty ? HRIM : ramp(HILL, (y - ty) / 10, x, y);
    }
    // A tiny windmill on the far hill, the one from the prologue (sails turn in frame()).
    for (let y = 52; y <= 60; y++) for (let x = 7 - (y > 56 ? 1 : 0); x <= 8 + (y > 56 ? 1 : 0); x++) put(BG, x, y, C('#5e4a70'));
    put(BG, 7, 51, C('#5e4a70')); put(BG, 8, 51, C('#5e4a70'));
    const ground = x => 71 + Math.round(1.2 * Math.sin(x / 7));
    const GR = ['#3a6452', '#2c4c48', '#213a40'].map(C);
    for (let x = 0; x < W; x++) {
      const ty = ground(x);
      for (let y = ty; y < H; y++) BG[y * W + x] = y === ty ? C(x < 40 ? '#e0c070' : '#6a9a5c') : ramp(GR, (y - ty) / 8, x, y);
    }

    // ---------- Pawnie ----------
    const CREAM = ['#fffaf0', '#f6e8d0', '#e2ccb0', '#b89c8c', '#7e6272'].map(C);
    const RIM = C('#b8c8f0'), LINE = C('#2e1e2e'), SEAM = C('#b09aa0'), HANDLINE = C('#7e6272');
    const LN = Math.hypot(0.55, 0.65, 0.53), LX = -0.55 / LN, LY = -0.65 / LN, LZ = 0.53 / LN;
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H);

    // Shade one pixel of a round surface from its normal: warm key light from the
    // upper left (the sun), a cool sky rim on the right.
    function shade(x, y, nx, ny, part) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * LX + ny * LY + nz * LZ;
      const i = y * W + x;
      SPR[i] = nx > 0.78 && l < 0.25 ? RIM : CREAM[Math.round(clamp(1 - (l * 0.62 + 0.42)) * (CREAM.length - 1))];
      PART[i] = part;
    }
    function disc(cx, cy, rx, ry, part) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.95, ny * 0.95, part);
      }
    }

    function body(ox, oy, hands, handDX) {
      SPR.fill(0); PART.fill(0);
      // Base: a squat rounded plinth.
      for (let y = 66; y <= 74; y++) {
        const top = y - 66, hw = 16 - (top < 2 ? 2 - top : 0) - (y === 74 ? 1 : 0);
        for (let x = CX - hw; x <= CX + hw; x++) shade(x + ox, y + oy, (x - CX) / 17, y < 68 ? -0.6 : 0.1, 1);
      }
      // Skirt flaring down to the base.
      for (let y = 44; y <= 66; y++) {
        const hw = 6 + Math.pow((y - 44) / 22, 1.8) * 11;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) shade(x + ox, y + oy, (x - CX) / (hw + 0.5), 0.12, 2);
      }
      disc(CX + ox, 42 + oy, 11, 3, 3);                     // collar
      disc(CX + ox, 27 + oy, 12.5, 12.5, 4);                 // head
      if (hands) {                                          // clasped at the chest
        disc(CX - 3 + ox + handDX, 49 + oy, 3.8, 3.4, 5);
        disc(CX + 3 + ox - handDX, 49 + oy, 3.8, 3.4, 6);
      }
      // Outline around the figure; a softer seam where parts overlap.
      // Parts are numbered back to front, so a pixel next to a lower-numbered part is
      // the front part's edge.
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        const n = [PART[i - 1], PART[i + 1], PART[i - W], PART[i + W]];
        if (!p) { if (n.some(q => q)) SPR[i] = LINE; }
        else if (n.some(q => q && q < p)) SPR[i] = p >= 5 ? HANDLINE : SEAM;
      }
    }

    const EYE = C('#1e1420'), SHINE = C('#ffffff'), BROW = C('#6e5460'), MOUTH = C('#3a1e2a');
    const TONGUE = C('#e86a7a'), BLUSH = C('#f4a0a8'), DROP = C('#8ae0ff'), DROPD = C('#3a8ab0');
    const BANG = C('#ffd23f'), SPARK = C('#fff4c0');

    function eyes(hx, hy, kind) {
      for (const s of [-1, 1]) {
        const ex = s < 0 ? hx - 5 : hx + 4;            // left eye x..x+1, right eye x..x+1
        if (kind === 'blink') { put(buf, ex, hy + 2, EYE); put(buf, ex + 1, hy + 2, EYE); continue; }
        if (kind === 'smile') {                        // closed, happy arcs
          put(buf, ex - 1, hy + 2, EYE); put(buf, ex, hy + 1, EYE); put(buf, ex + 1, hy + 1, EYE); put(buf, ex + 2, hy + 2, EYE);
          continue;
        }
        const tall = kind === 'wide' ? 4 : 3, wide = kind === 'wide' || kind === 'round' ? 3 : 2;
        const x0 = wide === 3 && s > 0 ? ex : wide === 3 ? ex - 1 : ex, y0 = kind === 'wide' ? hy : hy + 1;
        for (let y = y0; y < y0 + tall; y++) for (let x = x0; x < x0 + wide; x++) put(buf, x, y, EYE);
        put(buf, x0, y0, SHINE);
        if (kind === 'wide') put(buf, x0 + 1, y0 + 2, SHINE);
      }
    }
    function brows(hx, hy, kind) {
      const L = hx - 6, R = hx + 4;
      if (kind === 'worried') {
        put(buf, L, hy - 2, BROW); put(buf, L + 1, hy - 2, BROW); put(buf, L + 2, hy - 3, BROW);
        put(buf, R, hy - 3, BROW); put(buf, R + 1, hy - 2, BROW); put(buf, R + 2, hy - 2, BROW);
      } else if (kind === 'high') {
        for (let i = 0; i < 3; i++) { put(buf, L + i, hy - 4, BROW); put(buf, R + i, hy - 4, BROW); }
      }
    }
    function blush(hx, hy, big) {
      for (const bx of [hx - 9, hx + 7]) {
        blendAt(buf, bx, hy + 4, BLUSH, 0.8); blendAt(buf, bx + 1, hy + 4, BLUSH, 0.8);
        if (big) { blendAt(buf, bx, hy + 5, BLUSH, 0.5); blendAt(buf, bx + 1, hy + 5, BLUSH, 0.5); }
      }
    }
    function drop(x, y) {
      put(buf, x, y, DROP); put(buf, x, y + 1, DROP); put(buf, x - 1, y + 1, DROPD); put(buf, x + 1, y + 1, DROP);
      put(buf, x, y + 2, DROPD); put(buf, x - 1, y, LINE); put(buf, x + 1, y, LINE); put(buf, x, y - 1, LINE);
    }

    const FLIES = Array.from({ length: 4 }, (_, i) => ({ ax: 6 + hash(i, 3) * 50, ay: 62 + hash(i, 4) * 12, k: 2 + i, kb: 14 + i * 3, p: hash(i, 5) * TAU }));
    const WHEAT = [3, 5, 8, 52, 55, 58];

    function frame(t, mood, since) {
      const u = t / LOOP, age = ((t - since) % LOOP + LOOP) % LOOP;
      buf.set(BG);
      // Wheat at the front edges, swaying.
      for (const wx of WHEAT) {
        const lean = Math.sin(TAU * 20 * u + wx) * 1.2;
        for (let j = 0; j < 9; j++) put(buf, wx + lean * (j / 9) ** 2, 79 - j, C(j > 6 ? '#f0c060' : '#8a7a40'));
      }
      const sa = TAU / 4 * 12 * u;
      for (let k = 0; k < 4; k++) for (let r = 1; r <= 5; r += 0.5) {
        const a = sa + k * Math.PI / 2;
        put(buf, 7.5 + Math.cos(a) * r, 51 + Math.sin(a) * r, C('#6e5a80'));
      }
      for (const f of FLIES) {
        if (Math.sin(TAU * f.kb * u + f.p) < 0.3) continue;
        const x = f.ax + 4 * Math.sin(TAU * f.k * u + f.p), y = f.ay + 2 * Math.sin(TAU * (f.k + 1) * u);
        blendAt(buf, x + 1, y, C('#c8f070'), 0.4); blendAt(buf, x - 1, y, C('#c8f070'), 0.4); put(buf, x, y, C('#fffcb0'));
      }

      // Breathing: head and collar sink a pixel on the out-breath (every 3 s).
      const breath = Math.sin(TAU * 20 * u) > 0.35 ? 1 : 0;
      let ox = 0, oy = breath, handDX = 0;
      if (mood === 'happy') oy -= Math.round(Math.max(0, Math.sin(TAU * 40 * u)) * 2);          // little hops
      if (mood === 'scared') ox = Math.sin(TAU * 900 * u) > 0 ? 1 : 0;                           // trembling
      if (mood === 'surprised') oy -= age < 0.4 ? Math.round(3 * Math.sin(Math.PI * age / 0.4)) : 0; // jump
      if (mood === 'nervous') handDX = frac(10 * u) < 0.25 && Math.sin(TAU * 480 * u) > 0 ? 1 : 0;  // fidgeting
      body(ox, oy, true, handDX);
      over(buf, SPR);

      const hx = CX + ox, hy = 27 + oy;
      put(buf, hx - 6, hy - 7, SHINE); put(buf, hx - 5, hy - 7, SHINE); put(buf, hx - 6, hy - 6, SHINE);
      const blink = mood !== 'happy' && frac(15 * u + 0.3) < 0.03;
      if (mood === 'nervous') {
        eyes(hx, hy, blink ? 'blink' : 'dot'); brows(hx, hy, 'worried'); blush(hx, hy, false);
        put(buf, hx - 2, hy + 7, MOUTH); put(buf, hx - 1, hy + 6, MOUTH); put(buf, hx, hy + 6, MOUTH); put(buf, hx + 1, hy + 7, MOUTH);
        const v = frac(15 * u);
        if (v < 0.6) drop(hx + 11, hy - 7 + Math.round(v * 6));
      } else if (mood === 'happy') {
        eyes(hx, hy, 'smile'); blush(hx, hy, true);
        for (let x = hx - 2; x <= hx + 2; x++) put(buf, x, hy + 6, MOUTH);
        for (let x = hx - 1; x <= hx + 1; x++) put(buf, x, hy + 7, MOUTH);
        put(buf, hx, hy + 7, TONGUE);
        for (let i = 0; i < 3; i++) {                                                     // sparkles
          const s = Math.sin(TAU * (30 + i * 10) * u + i * 2);
          if (s < 0.4) continue;
          const sx = [8, 52, 50][i], sy = [22, 14, 36][i];
          put(buf, sx, sy, SPARK);
          if (s > 0.75) { put(buf, sx - 1, sy, SPARK); put(buf, sx + 1, sy, SPARK); put(buf, sx, sy - 1, SPARK); put(buf, sx, sy + 1, SPARK); }
        }
      } else if (mood === 'scared') {
        eyes(hx, hy, blink ? 'blink' : 'wide'); brows(hx, hy, 'worried');
        for (let y = hy + 6; y <= hy + 7; y++) for (let x = hx - 1; x <= hx; x++) put(buf, x, y, MOUTH);
        drop(hx + 11, hy - 6 + Math.round(frac(30 * u) * 5));
        drop(hx - 12, hy - 4 + Math.round(frac(30 * u + 0.5) * 5));
      } else {
        eyes(hx, hy, blink ? 'blink' : 'round'); brows(hx, hy, 'high');
        for (let y = hy + 5; y <= hy + 7; y++) for (let x = hx - 1; x <= hx + 1; x++) put(buf, x, y, (y === hy + 6 && x === hx) ? C('#8a3040') : MOUTH);
        if (age > 0.1) {                                                                // "!" pops up
          const bx = hx + 13, by = hy - 16 + (age < 0.3 ? 2 : 0);
          for (let y = by; y < by + 5; y++) { put(buf, bx, y, BANG); put(buf, bx - 1, y, LINE); put(buf, bx + 1, y, LINE); }
          put(buf, bx, by + 6, BANG); put(buf, bx, by - 1, LINE); put(buf, bx, by + 5, LINE); put(buf, bx, by + 7, LINE);
          put(buf, bx - 1, by + 6, LINE); put(buf, bx + 1, by + 6, LINE);
        }
      }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'nervous', (state && state.since) || 0);
    };
  },
});
