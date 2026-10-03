// CastlE, the Unbreakable Fortress: a live character portrait.
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the game HUD and dialogue bubbles. A heavy green-bronze clockwork rook
// on the Clockwork Citadel's brass walls at smoggy dusk: battlements for a head, brass
// gauntlets folded over its belly, a porthole in its chest where a gear ticks round once
// a second. Moods: patient (default), stern, satisfied, rattled, resigned. Breathes,
// blinks, ticks, and lets off steam from between its battlements; the steam bursts when
// stern, a crack opens and the gear judders when rattled, and the gear stops when resigned.
LiveScenes.register({
  id: 'char_castle',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['patient', 'stern', 'satisfied', 'rattled', 'resigned'],
  frames: { face: [11, 5, 40, 40] },
  moodFor(category) {
    return {
      gameStart: 'patient', bossTaunt: 'patient', milestone: 'patient', playerCapture: 'patient',
      bossCheck: 'stern', lock: 'stern',
      bossCapture: 'satisfied', bossCaptureBig: 'satisfied', playerLowHealth: 'satisfied',
      playerCheck: 'rattled', playerCaptureBig: 'rattled', lowHealth: 'rattled',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, mix, clamp, sq, frac, ramp, hash, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over } = K;
    let buf = null;

    // ---------- backdrop: the Citadel at smoggy dusk, the sun glowing behind the head ----------
    const BG = new Uint32Array(W * H);
    const SKY = ['#1a2230', '#26303c', '#3a3e44', '#5a5048', '#8a6a4a', '#c08a4a', '#eaaa5a', '#ffd488'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - CX, (y - 22) * 1.1);
      BG[y * W + x] = ramp(SKY, y / 100 + 0.75 * Math.exp(-sq(d / 28)) + 0.2 * Math.exp(-sq(d / 12)), x, y);
    }
    // Hazy smokestacks on the skyline: flat silhouettes, a warm rim on the side facing the sun.
    const HAZE = ['#7a5e4a', '#5e4a40', '#4a3a3a', '#3a2e32'].map(C), HRIM = C('#d89a58');
    const STACKS = [[9, 34, 4], [17, 42, 5], [40, 44, 4]];
    for (const [sx, top, w] of STACKS) {
      for (let y = top; y < 60; y++) for (let x = sx; x < sx + w; x++) put(BG, x, y, (x === sx + w - 1 && sx < CX) || (x === sx && sx > CX) ? HRIM : HAZE[2]);
      for (let x = sx - 1; x <= sx + w; x++) put(BG, x, top, HAZE[3]);
    }
    for (let x = 0; x < W; x++) {
      const ty = 50 + Math.round(2 * Math.sin(x / 5) + (x % 9 < 3 ? -2 : 0));
      for (let y = ty; y < 60; y++) put(BG, x, y, y === ty ? (Math.abs(x - CX) < 16 ? HRIM : HAZE[1]) : HAZE[y < ty + 4 ? 1 : 2]);
    }
    // A clock tower on the right, its teal face lit (the hands turn in frame()).
    const CTX = 53, CTY = 24;
    for (let y = 18; y < 60; y++) for (let x = 47; x <= 59; x++) put(BG, x, y, C(x < 49 ? '#6e5a44' : '#4a3a34'));
    for (let y = 12; y < 18; y++) for (let x = 47 + (18 - y); x <= 59 - (18 - y); x++) put(BG, x, y, C('#3a5a58'));
    K.disc(BG, CTX, CTY, 4.2, (dx, dy, d) => C(d > 0.78 ? '#8a5a24' : '#bff0e0'));
    const TWIN = [[50, 34], [55, 34], [50, 42], [55, 42]];
    // Brass wall with a pipe along the bottom.
    const BRW = ['#f0c060', '#c08a38', '#8a5a24', '#4e3018'].map(C);
    for (let y = 60; y < H; y++) for (let x = 0; x < W; x++) {
      const px = x % 14, py = (y - 60) % 9;
      let t = 0.3 + (y - 60) / 26 + Math.abs(x - CX) / 60;
      if (px === 0 || py === 0) t += 0.3;
      BG[y * W + x] = ramp(BRW, t, x, y);
    }
    for (let x = 0; x < W; x += 7) for (let y = 57; y < 60; y++) for (let i = 0; i < 4; i++) put(BG, x + i, y, y === 57 ? BRW[0] : BRW[1]);
    const IRON = ['#6a6a70', '#4a4850', '#302e38', '#1e1c24'].map(C);
    for (let x = 0; x < W; x++) for (let j = -2; j <= 2; j++) put(BG, x, 70 + j, x % 20 < 2 ? BRW[2] : ramp(IRON, (j + 2) / 4 * 0.9, x, 70 + j));
    const TEAL = C('#4ae0d0'), TEALD = C('#1e8a88');
    const GEARC = ['#d8a050', '#4a3830', '#2e2428', '#1a1418'];

    // ---------- CastlE ----------
    // Green bronze (verdigris), lit warm from the low sun, dark end leaning cool teal.
    const BRONZE = ['#dce6ac', '#a6c692', '#82a686', '#5a7e6e', '#3a524e'].map(C);
    const BRASS = ['#fff0b0', '#f0c060', '#c08a38', '#8a5a24', '#4e3018'].map(C);
    const RIM = C('#7adccc'), LINE = C('#1e1a22'), SEAM = C('#52705e'), HANDLINE = C('#4e3018');
    const LN = Math.hypot(0.55, 0.6, 0.58), LX = -0.55 / LN, LY = -0.6 / LN, LZ = 0.58 / LN;
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H);

    // Shade one pixel from its surface normal: warm key from the upper left, teal rim right.
    function shade(x, y, nx, ny, part, pal, dark = 0) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * LX + ny * LY + nz * LZ;
      const i = y * W + x;
      const v = pal === BRONZE ? 1 - (l * 0.9 + 0.3) + 0.1 : 1 - (l * 0.62 + 0.42);
      SPR[i] = nx > 0.88 && l < 0.25 && !dark ? RIM : pal[Math.round(clamp(v + dark) * (pal.length - 1))];
      PART[i] = part;
    }
    function disc(cx, cy, rx, ry, part, pal) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.95, ny * 0.95, part, pal);
      }
    }
    const MERLONS = [[-15, -9], [-3, 3], [9, 15]];

    function body(ox, oy, hoy) {
      SPR.fill(0); PART.fill(0);
      // Base: a broad plinth with a brass ring on top.
      for (let y = 66; y <= 75; y++) {
        const top = y - 66, hw = 17 - (top < 2 ? 2 - top : 0) - (y === 75 ? 1 : 0);
        for (let x = CX - hw; x <= CX + hw; x++) shade(x + ox, y + oy, (x - CX) / 18, y < 68 ? -0.6 : 0.1, 1, y <= 67 ? BRASS : BRONZE);
      }
      // Tower: a stout column flaring out to the base.
      for (let y = 36; y <= 66; y++) {
        const hw = 11 + Math.pow((y - 36) / 30, 2.2) * 5;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) {
          const nx = (x - CX) / (hw + 0.5), band = y === 61 || y === 62;
          shade(x + ox, y + oy, nx, 0.1, 2, band ? BRASS : BRONZE);
        }
      }
      // Chest porthole rim (the gear inside is drawn in frame()).
      for (let y = 38; y <= 54; y++) for (let x = 22; x <= 40; x++) {
        const d = Math.hypot(x - CX, y - 46);
        if (d <= 7.2 && d > 5.4) shade(x + ox, y + oy, (x - CX) / 8, (y - 46) / 8, 3, BRASS);
      }
      // Collar: a brass ring under the head.
      disc(CX + ox, 36 + hoy, 13, 2.6, 4, BRASS);
      // Head: the turret, battlements on top, a brass band beneath them.
      for (let y = 13; y <= 33; y++) {
        const hw = 15 - (y === 33 ? 1 : 0);
        for (let x = CX - hw; x <= CX + hw; x++) {
          const ny = y <= 14 ? -0.55 : y >= 32 ? 0.55 : -0.05;
          shade(x + ox, y + hoy, (x - CX) / 15.5, ny, 5, y === 15 || y === 16 ? BRASS : BRONZE);
        }
      }
      // Inner back wall, seen through the gaps between the front merlons.
      for (let y = 10; y <= 12; y++) for (let x = CX - 14; x <= CX + 14; x++) shade(x + ox, y + hoy, (x - CX) / 15.5, 0.3, 5, BRONZE, 0.55);
      for (const [a, b] of MERLONS) for (let y = 7; y <= 12; y++) for (let x = CX + a; x <= CX + b; x++) {
        const nx = (x - CX) / 15.5 * 0.85 + ((x - CX - (a + b) / 2) / 4) * 0.25;
        shade(x + ox, y + hoy, nx, y === 7 ? -0.8 : -0.1, 5, BRONZE);
      }
      // Gauntlets folded over the belly, one resting on the other.
      disc(CX - 4 + ox, 58 + oy, 4.6, 3.6, 6, BRASS);
      disc(CX + 4 + ox, 58 + oy, 4.6, 3.6, 7, BRASS);
      // Outline around the figure, seams where parts overlap.
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        const n = [PART[i - 1], PART[i + 1], PART[i - W], PART[i + W]];
        if (!p) { if (n.some(q => q)) SPR[i] = LINE; }
        else if (n.some(q => q && q < p)) SPR[i] = p >= 6 ? HANDLINE : p === 3 ? BRASS[3] : SEAM;
      }
      // Merlon gaps: a dark notch line down each side so the battlements read.
      for (const [a, b] of MERLONS) for (let y = 8; y <= 12; y++) {
        if (a > -15) put(SPR, CX + a - 1 + ox, y + hoy, LINE);
        if (b < 15) put(SPR, CX + b + 1 + ox, y + hoy, LINE);
      }
      // Panel seams and rivets on the turret; a riveted seam down the tower.
      for (let y = 18; y <= 31; y++) { put(SPR, CX - 10 + ox, y + hoy, SEAM); put(SPR, CX + 10 + ox, y + hoy, SEAM); }
      for (const rx of [-13, -7, 7, 13]) put(SPR, CX + rx + ox, 15 + hoy, BRASS[3]);
      // Knuckle marks on the gauntlets.
      for (const fx of [-6, -4, 3, 5]) put(SPR, CX + fx + ox, 56 + oy, BRASS[3]);
    }

    // ---------- face ----------
    const EYE = C('#141a1c'), SHINE = C('#ffffff'), GLOW = C('#9afff0'), BROW = C('#2e3e38'), MOUTH = C('#1e2624');
    const CRACK = C('#1e2a26'), CRACKL = C('#e0e8b8'), OIL = C('#2a2a2a'), OILS = C('#8aa0a0'), STEAM = C('#f4ecde');
    function eyes(hx, hy, kind) {
      for (const s of [-1, 1]) {
        const ex = s < 0 ? hx - 7 : hx + 5;                 // each eye is ex..ex+2
        if (kind === 'closed') { for (let i = 0; i < 3; i++) put(buf, ex + i, hy + 2, EYE); continue; }
        if (kind === 'content') { put(buf, ex, hy + 1, EYE); put(buf, ex + 1, hy + 2, EYE); put(buf, ex + 2, hy + 1, EYE); continue; }
        if (kind === 'down') { put(buf, ex, hy + 2, EYE); put(buf, ex + 1, hy + 3, EYE); put(buf, ex + 2, hy + 2, EYE); continue; }
        if (kind === 'lidded') {                            // heavy lids: patient, unhurried
          for (let i = 0; i < 3; i++) put(buf, ex + i, hy + 1, EYE);
          put(buf, ex + 1, hy + 2, EYE); put(buf, ex + (s < 0 ? 2 : 1), hy + 2, EYE); put(buf, ex + (s < 0 ? 1 : 2), hy + 2, SHINE);
          continue;
        }
        if (kind === 'glare') {                             // narrowed, teal machine-light pupils
          for (let i = 0; i < 3; i++) put(buf, ex + i, hy + 1, EYE);
          put(buf, ex, hy + 2, EYE); put(buf, ex + 1, hy + 2, GLOW); put(buf, ex + 2, hy + 2, EYE);
          blendAt(buf, ex + 1, hy + 3, TEAL, 0.35);
          continue;
        }
        // 'wide' (rattled): the left eye pops round, the right squints.
        if (s < 0) { for (let y = hy; y <= hy + 2; y++) for (let i = 1; i < 3; i++) put(buf, ex + i, y, EYE); put(buf, ex + 1, hy, SHINE); }
        else { for (let i = 0; i < 3; i++) put(buf, ex + i, hy + 2, EYE); put(buf, ex + 1, hy + 1, EYE); }
      }
    }
    function brows(hx, hy, kind) {
      const L = hx - 8, R = hx + 5;
      if (kind === 'flat') for (let i = 0; i < 4; i++) { put(buf, L + i, hy - 2, BROW); put(buf, R + i, hy - 2, BROW); }
      else if (kind === 'down') {                           // a V: brows pressed down at the middle
        put(buf, L, hy - 3, BROW); put(buf, L + 1, hy - 2, BROW); put(buf, L + 2, hy - 2, BROW); put(buf, L + 3, hy - 1, BROW);
        put(buf, R, hy - 1, BROW); put(buf, R + 1, hy - 2, BROW); put(buf, R + 2, hy - 2, BROW); put(buf, R + 3, hy - 3, BROW);
      } else if (kind === 'uneven') {
        for (let i = 0; i < 4; i++) put(buf, L + i, hy - 4 + (i === 3 ? 1 : 0), BROW);
        put(buf, R, hy - 1, BROW); put(buf, R + 1, hy - 1, BROW); put(buf, R + 2, hy - 2, BROW); put(buf, R + 3, hy - 2, BROW);
      } else if (kind === 'sad') {                          // outer ends drooping
        put(buf, L, hy - 1, BROW); put(buf, L + 1, hy - 2, BROW); put(buf, L + 2, hy - 2, BROW); put(buf, L + 3, hy - 3, BROW);
        put(buf, R, hy - 3, BROW); put(buf, R + 1, hy - 2, BROW); put(buf, R + 2, hy - 2, BROW); put(buf, R + 3, hy - 1, BROW);
      }
    }
    function mouth(hx, hy, kind) {
      const y = hy + 6;
      if (kind === 'line') for (let x = hx - 2; x <= hx + 2; x++) put(buf, x, y, MOUTH);
      else if (kind === 'frown') { for (let x = hx - 2; x <= hx + 2; x++) put(buf, x, y, MOUTH); put(buf, hx - 3, y + 1, MOUTH); put(buf, hx + 3, y + 1, MOUTH); }
      else if (kind === 'smile') { for (let x = hx - 2; x <= hx + 2; x++) put(buf, x, y + 1, MOUTH); put(buf, hx - 3, y, MOUTH); put(buf, hx + 3, y, MOUTH); }
      else if (kind === 'wavy') { put(buf, hx - 3, y + 1, MOUTH); put(buf, hx - 2, y, MOUTH); put(buf, hx - 1, y + 1, MOUTH); put(buf, hx, y, MOUTH); put(buf, hx + 1, y + 1, MOUTH); put(buf, hx + 2, y, MOUTH); }
      else if (kind === 'soft') { for (let x = hx - 1; x <= hx + 1; x++) put(buf, x, y + 1, MOUTH); put(buf, hx - 2, y, MOUTH); put(buf, hx + 2, y, MOUTH); }
    }
    // A puff of steam from between the battlements: age 0..1.
    function puff(x0, y0, age, drift, big) {
      if (age < 0 || age > 1) return;
      for (let i = 0; i < 3; i++) {
        const a = clamp(age - i * 0.08);
        if (a <= 0) continue;
        const x = x0 + drift * a * 8 + Math.sin(a * 6 + i) * 1, y = y0 - a * (big ? 18 : 12) + i * 2, r = 1.2 + a * (big ? 4 : 3);
        for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++)
          if (Math.hypot(xx - x, yy - y) <= r) blendAt(buf, xx, yy, STEAM, (1 - a) * (big ? 0.65 : 0.55));
      }
    }
    // The chest gear: 8 teeth round a solid hub, turned by angle, teal glow behind it.
    const PORT = [C('#0a1618'), C('#0e2a2c'), C('#16504e')];
    function chestGear(cx, cy, angle, glow) {
      for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 6; x <= cx + 6; x++) {
        const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
        if (d > 5.4) continue;
        const a = Math.atan2(dy, dx) - angle, tooth = Math.cos(a * 8) > 0.15;
        let c = ramp(PORT, glow * (1 - d / 6), x, y);
        if (d < 3.6 || (tooth && d < 5)) {
          c = d > 3.6 || d > 2.6 && dx + dy > 0 ? (dy + dx * 0.4 < -1 ? BRASS[1] : BRASS[3]) : dy + dx * 0.4 < -1.2 ? BRASS[0] : BRASS[1];
          if (d < 1.5) c = BRASS[4];
        }
        put(buf, x, y, c);
      }
    }

    const vig = K.vignette(C('#0e0a0c'), 0.35, 0.5);
    const SPARKS = Array.from({ length: 3 }, (_, i) => ({ x: [9, 18, 43][i], y: [48, 44, 47][i], k: 6 + i * 2, p: hash(i, 7) }));

    function frame(t, mood, since) {
      const u = t / LOOP, age = ((t - since) % LOOP + LOOP) % LOOP;
      buf.set(BG);
      // Backdrop motion: stack smoke, the clock hands, window pulses, a steam vent on the wall.
      // A great gear turning slowly on the left, a smaller one meshed beside it.
      K.gear(buf, 1, 30, 12, 12, TAU * u, GEARC);
      K.gear(buf, 8, 50, 6, 6, -TAU * 2 * u + 0.3, GEARC);
      for (const [sx, top, w] of STACKS) for (let i = 0; i < 6; i++) {
        const v = frac(4 * u + i / 6 + sx * 0.01), x = sx + w / 2 + v * 8, y = top - 1 - v * 16, r = 0.8 + v * 2.6;
        for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++)
          if (Math.hypot(xx - x, yy - y) <= r) blendAt(buf, xx, yy, C('#6a5a54'), (1 - v) * 0.3);
      }
      const mA = TAU * 12 * u - Math.PI / 2, hA = TAU * u - Math.PI / 2 + 1.3;
      K.line(buf, CTX, CTY, CTX + Math.cos(hA) * 2, CTY + Math.sin(hA) * 2, C('#1e2a28'));
      K.line(buf, CTX, CTY, CTX + Math.cos(mA) * 3, CTY + Math.sin(mA) * 3, C('#1e2a28'));
      TWIN.forEach(([wx, wy], n) => {
        const f = Math.sin(TAU * (7 + n) * u + n * 1.7);
        const c = f > 0.2 ? TEAL : TEALD;
        put(buf, wx, wy, c); put(buf, wx + 1, wy, c); put(buf, wx, wy + 1, c); put(buf, wx + 1, wy + 1, c);
        if (f > 0.2) K.glow(buf, wx + 0.5, wy + 0.5, 4, TEAL, 0.14);
      });
      const vent = frac(6 * u + 0.35);
      if (vent < 0.5) puff(6, 64, vent / 0.5, 0.5, false);
      for (const s of SPARKS) {                           // gauge lights along the wall
        const on = Math.sin(TAU * s.k * u + s.p * TAU) > 0.3;
        if (s.y > 56) continue;
        put(buf, s.x, 64, on ? TEAL : TEALD);
      }
      vig(buf);

      // Breathing: the head sinks a pixel on the out-breath (every 4 s). Resigned slumps.
      const breath = Math.sin(TAU * 15 * u) > 0.35 ? 1 : 0;
      let ox = 0, oy = 0, hoy = breath;
      if (mood === 'resigned') hoy += 1;
      if (mood === 'rattled' && age < 0.5) ox = Math.sin(TAU * age * 14) > 0 ? 1 : 0;   // a jolt as the wall cracks
      if (mood === 'stern' && age < 0.35) hoy -= Math.round(2 * Math.sin(Math.PI * age / 0.35)); // rises up
      body(ox, oy, hoy);
      over(buf, SPR);

      // The chest gear ticks once a second (12 degrees, snapping quickly); faster when stern,
      // smooth when satisfied, juddering when rattled, stopped when resigned.
      const snap = s => Math.floor(s) + Math.min(1, frac(s) * 8);
      let ang;
      if (mood === 'resigned') ang = 0.26;
      else if (mood === 'stern') ang = snap(t * 2) * (TAU / 30);
      else if (mood === 'satisfied') ang = t * (TAU / 30);
      else if (mood === 'rattled') ang = snap(t) * (TAU / 30) + (Math.sin(TAU * 360 * u) > 0 ? 0.12 : -0.12);
      else ang = snap(t) * (TAU / 30);
      const gl = mood === 'resigned' ? 0.2 : mood === 'stern' ? 1 : 0.6 + 0.2 * Math.sin(TAU * 15 * u);
      chestGear(CX + ox, 46 + oy, ang, gl);
      if (mood !== 'resigned') K.glow(buf, CX + ox, 46 + oy, 9, TEAL, mood === 'stern' ? 0.18 : 0.08);

      const hx = CX + ox, hy = 22 + hoy;
      put(buf, hx - 12, hy - 5, SHINE); put(buf, hx - 11, hy - 5, SHINE); put(buf, hx - 12, hy - 4, SHINE);
      const blink = frac(12 * u + 0.3) < 0.03;
      if (mood === 'patient') {
        eyes(hx, hy, blink ? 'closed' : 'lidded'); brows(hx, hy, 'flat'); mouth(hx, hy, 'line');
        const p = frac(6 * u + 0.1);                                           // a lazy puff every 10 s
        if (p < 0.3) puff(hx - 6, hy - 14, p / 0.3, -0.4, false);
      } else if (mood === 'stern') {
        eyes(hx, hy, blink ? 'closed' : 'glare'); brows(hx, hy, 'down'); mouth(hx, hy, 'frown');
        for (const [dx, ph] of [[-6, 0], [6, 0.5]]) {                          // steam blasts from both gaps
          const p = frac(12 * u + ph);
          if (p < 0.45) puff(hx + dx, hy - 13, p / 0.45, dx < 0 ? -0.7 : 0.7, true);
        }
        if (age < 0.6) puff(hx, hy - 14, age / 0.6, 0, true);
      } else if (mood === 'satisfied') {
        eyes(hx, hy, 'content'); brows(hx, hy, 'flat'); mouth(hx, hy, 'smile');
        const p = frac(4 * u + 0.2);
        if (p < 0.35) puff(hx + 6, hy - 14, p / 0.35, 0.5, false);
      } else if (mood === 'rattled') {
        eyes(hx, hy, blink ? 'closed' : 'wide'); brows(hx, hy, 'uneven'); mouth(hx, hy, 'wavy');
        // A crack running down the turret from the right merlon.
        const CR = [[8, -10], [8, -9], [7, -8], [7, -7], [8, -6], [9, -5], [9, -4], [8, -3]];
        for (const [dx, dy] of CR) { put(buf, hx + dx, hy + dy, CRACK); put(buf, hx + dx - 1, hy + dy, CRACKL); }
        put(buf, hx + 10, hy - 6, CRACK); put(buf, hx + 11, hy - 7, CRACK);
        // An oil drop sliding down the cheek.
        const v = frac(15 * u);
        if (v < 0.7) {
          const dy = Math.round(v * 8), x = hx + 12;
          put(buf, x, hy - 2 + dy, OIL); put(buf, x, hy - 1 + dy, OIL); put(buf, x, hy - 3 + dy, OILS);
        }
        // Hissing leak from the side of the head.
        const p = frac(20 * u);
        if (p < 0.4) puff(hx + 15, hy + 2, p / 0.4, 1, false);
      } else {
        eyes(hx, hy, 'closed'); brows(hx, hy, 'sad');
        for (let x = hx - 1; x <= hx + 1; x++) put(buf, x, hy + 6, MOUTH);
        const p = frac(3 * u + 0.1);                                           // one last thin wisp
        if (p < 0.25) puff(hx, hy - 14, p / 0.25, 0.2, false);
      }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'patient', (state && state.since) || 0);
    };
  },
});
