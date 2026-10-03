// The Knight of the Mist, the Shadow Lancer: a live character portrait.
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the game HUD and dialogue bubbles. A violet knight piece in a horse-head
// helm, standing on the Misty Moors at night with the moon behind him and his lance at
// his side. The helm's eye slit is dark; only two amber eyes glow in it. His mane is mist
// that streams off him, fog drifts across his legs, and now and then he snorts a puff of it.
// Moods: watching (default), sly, startled, vanishing, revealed.
LiveScenes.register({
  id: 'char_knightsade',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['watching', 'sly', 'startled', 'vanishing', 'revealed'],
  frames: { face: [8, 7, 40, 40] },
  moodFor(category) {
    return {
      gameStart: 'watching', milestone: 'watching', bossTaunt: 'watching',
      bossCapture: 'vanishing', bossCaptureBig: 'vanishing', eyes: 'vanishing',
      bossCheck: 'sly', playerLowHealth: 'sly',
      playerCapture: 'startled', playerCaptureBig: 'startled', playerCheck: 'startled',
      lowHealth: 'revealed',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60;
    const { TAU, C, clamp, sq, frac, bay, ramp, hash, noiseLoop, blend } = PixelKit;
    const { put, blendAt, over, glow } = PixelKit.surface(W, H);
    let buf = null;

    // ---------- backdrop: the Moors at night, the moon behind his head ----------
    const BG = new Uint32Array(W * H);
    const MX = 40, MY = 17;
    const SKY = ['#0a1220', '#101c2e', '#182a3c', '#22384a', '#34505a', '#4e6a66', '#7a8e78'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - 33, (y - 24) * 1.1), dm = Math.hypot(x - MX, y - MY);
      const edge = sq((x - 31) / 31) * 0.25;
      BG[y * W + x] = ramp(SKY, 0.1 + y / 150 + 0.3 * Math.exp(-sq(d / 19)) + 0.22 * Math.exp(-sq(dm / 11)) - edge, x, y);
    }
    // The moon, low behind the helm.
    for (let y = MY - 8; y <= MY + 8; y++) for (let x = MX - 8; x <= MX + 8; x++) {
      const dx = x - MX, dy = y - MY, d = Math.hypot(dx, dy) / 7.5;
      if (d <= 1) put(BG, x, y, C(d > 0.88 ? '#a8c4c0' : dx + dy > 4 ? '#c8dcd4' : '#e8f4ec'));
    }
    put(BG, MX + 2, MY - 3, C('#c8dcd4')); put(BG, MX + 3, MY - 3, C('#c8dcd4')); put(BG, MX - 3, MY + 2, C('#c8dcd4'));
    // Far moor with the ring of standing stones on the right, the ruined tower on the left.
    const moorTop = x => Math.round(55 + 2 * Math.sin(x / 8 + 2) + 1.5 * Math.sin(x / 3.3));
    const MOOR = ['#2a4448', '#243a40', '#1e3238', '#182a30'].map(C), MRIM = C('#4a6a66');
    for (let x = 0; x < W; x++) {
      const ty = moorTop(x);
      for (let y = ty; y < H; y++) BG[y * W + x] = y === ty ? MRIM : ramp(MOOR, (y - ty) / 16, x, y);
    }
    const STONE = C('#34484e'), STONEL = C('#6a8a88');
    for (const [sx, sh] of [[50, 5], [54, 7], [58, 4]]) {
      const top = moorTop(sx);
      for (let y = top - sh; y <= top; y++) { put(BG, sx, y, STONEL); put(BG, sx + 1, y, STONE); }
    }
    for (let x = 53; x <= 57; x++) put(BG, x, moorTop(54) - 8, STONE);
    const TWX = 5;                                                    // the watchtower, lantern at TWX, 44
    for (let y = 36; y < 60; y++) for (let x = TWX - 4; x <= TWX + 4; x++) {
      if (y < 40 && x - TWX > 4 - (y - 36) * 1.5) continue;           // broken top
      const mortar = y % 4 === 0 || (y % 4 && (x + (Math.floor(y / 4) % 2) * 3) % 6 === 0);
      put(BG, x, y, C(mortar ? '#1a242a' : x === TWX - 4 ? '#5a7a76' : x > TWX + 1 ? '#1e2a32' : '#34464c'));
    }
    for (let y = 42; y <= 46; y++) for (let x = TWX - 1; x <= TWX + 1; x++) put(BG, x, y, C('#0a1014'));
    // Near moor: heather and dark grass, the darkest part of the picture.
    const nearTop = x => Math.round(69 + 1.5 * Math.sin(x / 6 + 1));
    const GR = ['#2e4a40', '#243c36', '#1a2e2c', '#12201e'].map(C), HEA = ['#7a4a8a', '#5a3a70', '#3e2a54', '#2a1e3c'].map(C);
    const HEATHER = [];
    for (let x = 0; x < W; x++) {
      const ty = nearTop(x);
      for (let y = ty; y < H; y++) {
        const patch = PixelKit.noise2(x / 7, y / 3, 50) > 0.52;
        BG[y * W + x] = y === ty ? C('#4a6a58') : ramp(patch ? HEA : GR, (y - ty) / 12, x, y);
        if (patch && y > ty && hash(x, y) > 0.9) HEATHER.push(y * W + x);
      }
    }
    // Darker, cooler corners.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = sq((x - 31) / 31) * 0.6 + sq((y - 36) / 44) * 0.7;
      if (clamp((v - 0.45) * 1.4) > bay(x, y)) blend(BG, y * W + x, C('#050a10'), 0.35);
    }

    // ---------- the knight ----------
    const VIO = ['#a47ebc', '#7052a2', '#51358e', '#37246a', '#221540'].map(C), WARM = C('#e0a0a8');
    const CLOAK = ['#4e4280', '#382c66', '#282050', '#1a1434'].map(C);
    const MANE = ['#8490c4', '#565a98', '#3a3674', '#241e4c'].map(C);
    const STEEL = ['#e6e2f0', '#b0a8cc', '#7a70a0', '#4a4270'].map(C);
    const RIM = C('#8ae0cc'), RIM2 = C('#4e9a94'), LINE = C('#140c1e'), SEAM = C('#3a2668'), HANDLINE = C('#2c1e50');
    const VISOR = C('#0c0814'), BROW = C('#cdb0e4');
    // Key light: the tower lantern, low on the left (warm). Rim: moonlit fog on the right.
    const LN = Math.hypot(0.7, 0.45, 0.55), LX = -0.7 / LN, LY = -0.45 / LN, LZ = 0.55 / LN;
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H);
    let bright = 0;                                     // mood lift: revealed stands in more light

    function shade(x, y, nx, ny, part, P = VIO) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * LX + ny * LY + nz * LZ - Math.max(0, y - 50) / 70;
      const i = y * W + x;
      SPR[i] = nx > 0.72 && l < 0.2 ? (y > 48 ? RIM2 : RIM) : nx < -0.8 && l > 0.45 && P === VIO ? WARM : P[Math.round(clamp(1 - (l * 0.62 + 0.2 + bright)) * (P.length - 1))];
      PART[i] = part;
    }
    function disc(cx, cy, rx, ry, part, P) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.95, ny * 0.95, part, P);
      }
    }
    // The horse head: cranium, nose and muzzle blended into one smooth shape.
    const ell = (x, y, cx, cy, rx, ry) => Math.hypot((x - cx) / rx, (y - cy) / ry) - 1;
    const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k / 4; };
    function headF(x, y) {
      let f = ell(x, y, 34, 23, 9.5, 9.5);
      f = smin(f, ell(x, y, 26, 26, 6.5, 5.5), 0.6);
      f = smin(f, ell(x, y, 19.5, 31, 6, 4.8), 0.5);
      return f;
    }
    const HEAD = [];                                    // precomputed pixels and normals, offset at draw
    for (let y = 8; y < 42; y++) for (let x = 8; x < 48; x++) {
      const f = headF(x, y);
      if (f > 0) continue;
      const gx = headF(x + 0.5, y) - headF(x - 0.5, y), gy = headF(x, y + 0.5) - headF(x, y - 0.5), gl = Math.hypot(gx, gy) || 1;
      const m = clamp(1 + f * 1.1) * 0.95;
      HEAD.push([x, y, gx / gl * m, gy / gl * m]);
    }
    // Ears: two points on top of the helm, the far one a little behind.
    const EARS = [[32, 8, 5], [37, 9, 5]];
    const neckL = y => 28 - 6.5 * Math.pow(clamp((y - 33) / 14), 1.4), neckR = y => 42.5 - 0.12 * (y - 28);

    const MANE_TIPS = [];
    let mu = 0, bristle = false;
    function body(ox, oy, hoy, lanceLift) {
      SPR.fill(0); PART.fill(0);
      // Base.
      for (let y = 66; y <= 74; y++) {
        const top = y - 66, hw = 15 - (top < 2 ? 2 - top : 0) - (y === 74 ? 1 : 0);
        for (let x = 31 - hw; x <= 31 + hw; x++) shade(x + ox, y + oy, (x - 31) / 16, y < 68 ? -0.6 : 0.1, 1);
      }
      // Skirt, with a band of trim near the top.
      for (let y = 49; y <= 66; y++) {
        const hw = 8 + Math.pow((y - 49) / 17, 1.8) * 9;
        for (let x = Math.round(31 - hw); x <= Math.round(31 + hw); x++) shade(x + ox, y + oy, (x - 31) / (hw + 0.5), 0.12, 2);
      }
      // A short mantle of shadow hanging from the collar, its tattered points stirring.
      const sway = Math.sin(TAU * 6 * mu) * 0.8;
      for (let y = 48; y <= 60; y++) {
        const cw = 11.5 + (y - 48) * 0.5;
        for (let x = Math.round(31 - cw); x <= Math.round(31 + cw); x++) {
          const tri = Math.abs(((x + 400) % 5) - 2.5);
          const hem = 54 + Math.round(tri * 1.6 + sway * (x - 31) / 16 + hash(Math.floor(x / 5), 7) * 1.5);
          if (y > hem) continue;
          shade(x + ox, y + oy + hoy, (x - 31) / (cw + 0.5) * 0.7, -0.2 + (y - 48) * 0.03, 3, CLOAK);
        }
      }
      disc(31 + ox, 48 + oy + hoy, 10.5, 2.6, 4);                                       // collar
      // Neck and chest.
      for (let y = 28; y <= 47; y++) {
        const l = neckL(y), r = neckR(y), mid = (l + r) / 2, hw = (r - l) / 2;
        for (let x = Math.round(l); x <= Math.round(r); x++) shade(x + ox, y + oy + hoy, (x - mid) / (hw + 0.8) * 0.9, 0.05, 5);
      }
      // Mane: a crest of dark tufts down the back of the head and neck that ripples
      // backwards; its tips are pale mist (drawn translucent in maneMist).
      MANE_TIPS.length = 0;
      for (let y = 12; y <= 46; y++) {
        const base = y < 28 ? 34 + Math.sqrt(Math.max(0, 90 - sq(y - 23))) : neckR(y);
        const wave = Math.sin(y * 0.62 - TAU * 4 * mu), len = (y < 16 ? 1 + (y - 12) * 0.6 : y > 40 ? 3 - (y - 40) * 0.4 : 3.5) + wave * 1.2 + (bristle && (y & 1) ? 2 : 0);
        const xe = Math.round(base + len);
        for (let x = Math.round(base) - 3; x <= xe; x++) shade(x + ox, y + oy + hoy, clamp(-0.1 + (x - base) * 0.16, -0.6, 0.65), -0.35, 6, MANE);
        MANE_TIPS.push(xe + ox, y + oy + hoy);
      }
      // Head and ears.
      for (const [ex, ey, h] of EARS) for (let j = 0; j <= h + 1; j++) {
        const w = Math.floor((j + 1) / 2.5), lean = Math.round((h + 1 - j) * -0.35);
        for (let i = -w; i <= w; i++) shade(ex + i + lean + ox, ey + j + oy + hoy, i * 0.3 + (ex > 35 ? 0.35 : -0.1), -0.6, 7);
      }
      for (const [x, y, nx, ny] of HEAD) shade(x + ox, y + oy + hoy, nx, ny, 7);
      // The lance, upright on the right, and the gauntlet that holds it.
      const LXs = 50 + ox, ly = oy - lanceLift;
      for (let y = 10; y <= 75; y++) { shade(LXs, y + ly, -0.5, 0, 8, STEEL); shade(LXs + 1, y + ly, 0.6, 0, 8, STEEL); }
      for (let j = 0; j < 9; j++) {                                                      // leaf-shaped head
        const hw = j < 5 ? j * 0.5 : (9 - j) * 0.45;
        for (let x = Math.round(LXs + 0.5 - hw - 0.5); x <= Math.round(LXs + 0.5 + hw); x++) shade(x, 1 + j + ly, (x - LXs - 0.5) / 2.2, -0.3, 8, STEEL);
      }
      for (let x = LXs - 2; x <= LXs + 3; x++) shade(x, 10 + ly, (x - LXs - 0.5) / 3, -0.4, 8, STEEL);  // guard
      for (let i = 0; i < 8; i++) {                                                      // pennant
        const wv = Math.round(Math.sin(TAU * 15 * mu - i * 0.8) * (i / 8) * 1.6), h = Math.max(1, Math.round(4 - i * 0.45));
        for (let j = 0; j < h; j++) shade(LXs + 2 + i, 11 + j + wv + ly + (i > 5 ? 0 : 0), 0.2, j === 0 ? -0.8 : 0.2, 8, VIO);
      }
      disc(48.5 + ox, 53 + oy - lanceLift, 3.4, 3.2, 9, STEEL);                          // gauntlet
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        if (!p) { if (PART[i - 1] || PART[i + 1] || PART[i - W] || PART[i + W]) SPR[i] = LINE; continue; }
        const a = PART[i - 1], b = PART[i + 1], c = PART[i - W], d = PART[i + W];
        if ((a && a < p) || (b && b < p) || (c && c < p) || (d && d < p)) SPR[i] = p >= 8 ? HANDLINE : SEAM;
      }
      // Knuckle lines on the gauntlet, wrapped round the shaft.
      for (const dy of [-1, 1]) for (let x = 46; x <= 50; x++) if (PART[(53 + oy - lanceLift + dy) * W + x + ox] === 9) put(SPR, x + ox, 53 + oy - lanceLift + dy, STEEL[2]);
    }

    const EYE = C('#ffcc00'), EYEC = C('#fff4b0'), EYEG = C('#ffb040'), MIST = C('#9ab8c8'), MISTL = C('#c8dce0');
    const FOG = C('#8ab8b0'), FOGD = C('#4a7270'), WISP = C('#9ff0d0');

    // Deep eye sockets under a lit brow ridge; the brows carry the mood like Pawnie's:
    // level (watching), knitted down to the middle (sly), raised (startled), soft (revealed).
    const SOCK = [[-10, 1], [-3, -1]];              // eye x offset from hx, and which side is "inner"
    function sockets(hx, hy, kind) {
      for (const [dx, inner] of SOCK) {
        const ex = hx + dx, ey = hy - 1;
        const tall = kind === 'startled' ? 2.2 : kind === 'revealed' ? 1.3 : 1.7;
        for (let y = ey - 3; y <= ey + 3; y++) for (let x = ex - 3; x <= ex + 4; x++) {
          const i = y * W + x;
          if (PART[i] !== 6 || SPR[i] === LINE) continue;
          if (sq((x - ex - 0.5) / 2.6) + sq((y - ey - 0.5) / tall) <= 1) buf[i] = VISOR;
        }
        // Brow ridge: 4 px above the socket, its tilt is the expression.
        for (let k = -1; k <= 2; k++) {
          let by = ey - (kind === 'startled' ? 3 : 2);
          const toward = (k - 0.5) * inner;          // > 0 on the inner end
          if (kind === 'sly') by += toward > 0 ? 1 : 0;
          if (kind === 'revealed') by -= toward > 1 ? 1 : 0;
          if (kind === 'startled') by -= Math.abs(k - 0.5) < 1 ? 1 : 0;
          const i = by * W + ex + k;
          if (PART[i] === 7 && SPR[i] !== LINE) { buf[i] = BROW; }
        }
      }
      // Cheek: the round jowl of a horse's head, and the line of the mouth.
      for (let a = 0.2; a < 2.6; a += 0.12) {
        const x = Math.round(hx + 2 + Math.cos(a) * 5.5), y = Math.round(hy + 5 + Math.sin(a) * 4.5), i = y * W + x;
        if (PART[i] === 7 && SPR[i] !== LINE) buf[i] = VIO[3];
      }
      const mouthPx = (x, y, c) => { const i = y * W + x; if (PART[i] === 7 && SPR[i] !== LINE) buf[i] = c; };
      for (let x = hx - 19; x <= hx - 14; x++) mouthPx(x, hy + 12, VIO[4]);
      if (kind === 'sly') { mouthPx(hx - 13, hy + 11, VIO[4]); mouthPx(hx - 12, hy + 10, VIO[4]); }           // a thin smile
      if (kind === 'startled') for (let x = hx - 19; x <= hx - 16; x++) mouthPx(x, hy + 13, VISOR);         // mouth drops open
      put(buf, hx - 19, hy + 8, VISOR); put(buf, hx - 18, hy + 8, VISOR); put(buf, hx - 19, hy + 7, VIO[4]);   // nostril
    }
    function eye(x, y, kind, glowA) {
      if (glowA > 0) for (let dy = -3; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.hypot(dx / 1.5, dy);
        if (d < 2.6 && d > 0.9) { const i = Math.round(y + dy) * W + Math.round(x + dx); if (buf[i] !== VISOR) blendAt(buf, x + dx, y + dy, EYEG, glowA * (d < 1.6 ? 0.3 : 0.14)); }
      }
      const P = (px, py, c) => put(buf, x + px, y + py, c);
      if (kind === 'shut') { P(-1, 1, EYEG); P(0, 1, EYEG); P(1, 1, EYEG); return; }
      if (kind === 'narrow') { P(-1, 1, EYE); P(0, 1, EYEC); P(1, 1, EYE); return; }
      // Sly: slanted slits, the inner end low, like a narrowed glare.
      if (kind === 'sly') { P(-1, 0, EYE); P(0, 0, EYEC); P(1, 1, EYE); P(0, 1, EYEG); return; }
      if (kind === 'slyR') { P(1, 0, EYE); P(0, 0, EYEC); P(-1, 1, EYE); P(0, 1, EYEG); return; }
      if (kind === 'wide') {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) P(dx, dy, EYE);
        P(0, 0, C('#ffffff')); P(-1, -1, EYEC); return;
      }
      if (kind === 'soft') { P(-1, 0, EYEG); P(0, 0, EYE); P(1, 0, EYEG); return; }
      P(0, 0, EYEC); P(1, 0, EYE); P(0, 1, EYE); P(1, 1, EYEG);   // 'glow': 2x2, bright in the top corner
    }

    const STARS = Array.from({ length: 10 }, (_, i) => ({ x: 2 + (hash(i, 1) * 58 | 0), y: 1 + (hash(i, 2) * 26 | 0), k: 7 + i * 3, p: hash(i, 3) * TAU }));
    const WISPS = [{ x: 12, y: 64, k1: 2, k2: 3, kb: 5, p: 0.4 }, { x: 54, y: 60, k1: 3, k2: 2, kb: 7, p: 2.6 }, { x: 44, y: 76, k1: 1, k2: 4, kb: 6, p: 4.1 }];

    // A fog bank: looping noise scrolled by whole periods; alpha in three flat steps.
    function fogBand(y0, y1, k, scale, seed, col, a0, u, xs = 0, xe = W) {
      const period = Math.ceil(W / scale) + 2, off = period * k * u;
      for (let y = y0; y < y1; y++) {
        const fall = Math.sin(Math.PI * (y - y0) / (y1 - y0)), r = y / 5, r0 = Math.floor(r), f = r - r0, g = f * f * (3 - 2 * f);
        for (let x = xs; x < xe; x++) {
          const X = x / scale + off;
          const n = (noiseLoop(X + r0 * 0.37, seed + r0, period) * (1 - g) + noiseLoop(X + (r0 + 1) * 0.37, seed + r0 + 1, period) * g) * 0.75
            + noiseLoop(x / (scale / 2) - 2 * off, seed + 40 + (y >> 1), 2 * period) * 0.25;
          const a = n * fall - 0.3;
          if (a > 0.02) blend(buf, y * W + x, col, a0 * (a > 0.22 ? 1 : a > 0.1 ? 0.62 : 0.3));
        }
      }
    }
    // Mist streaming off the mane to the right, and snorted from the nostril.
    function maneMist(u, a0) {
      for (let n = 0; n < MANE_TIPS.length; n += 2) {
        const tx = MANE_TIPS[n], ty = MANE_TIPS[n + 1], row = n >> 1;
        if (row % 4) continue;
        for (let j = 0; j < 4; j++) {
          const v = frac(4 * u + row * 0.13 + j / 4);           // wisps drifting back off each tuft
          const x = tx + 1 + v * 9, y = ty - v * 3 + Math.sin(TAU * 5 * u + row + v * 4) * 1.2;
          glow(buf, x, y, 1.6 + v * 2.2, v < 0.3 ? MISTL : MIST, a0 * (1 - v) * 0.5);
        }
      }
    }

    function frame(t, mood, since) {
      t = ((t % LOOP) + LOOP) % LOOP;
      const u = t / LOOP, age = ((t - since) % LOOP + LOOP) % LOOP;
      buf.set(BG);
      for (const s of STARS) { const v = Math.sin(TAU * s.k * u + s.p); if (v > 0.45 && Math.hypot(s.x - MX, s.y - MY) > 10) put(buf, s.x, s.y, C(v > 0.9 ? '#e8fff4' : '#6a8a90')); }
      // The lantern in the tower.
      const fl = 0.75 + 0.15 * Math.sin(TAU * 47 * u) + 0.1 * Math.sin(TAU * 113 * u);
      glow(buf, TWX, 44, 12, C('#ffb050'), 0.3 * fl);
      put(buf, TWX, 44, C(fl > 0.85 ? '#fff0b0' : '#ffc060')); put(buf, TWX, 45, C('#ffa040'));
      fogBand(50, 68, 1, 14, 1, FOG, 0.45, u);
      for (const i of HEATHER) if (Math.sin(TAU * 20 * u - (i % W) * 0.25) > 0.75) buf[i] = C('#a870b8');

      // Breathing (every 3 s); the head tosses up before a snort (every 7.5 s).
      const breath = Math.sin(TAU * 20 * u) > 0.35 ? 1 : 0;
      const sn = frac(8 * u);                                  // snort cycle
      let ox = 0, oy = 0, hoy = breath, lift = 0;
      if (sn > 0.9 && sn < 0.96) hoy -= 1;
      if (mood === 'startled') { hoy -= age < 0.5 ? Math.round(2 * Math.sin(Math.PI * age / 0.5)) : 0; ox = age < 0.5 ? 1 : 0; lift = age < 0.6 ? 1 : 0; }
      if (mood === 'sly') hoy += Math.sin(TAU * 60 * u) > 0.6 && frac(6 * u) < 0.15 ? 1 : 0;       // a silent chuckle
      if (mood === 'revealed') lift = 1;
      bright = mood === 'revealed' ? 0.12 : mood === 'vanishing' ? -0.12 : 0;
      mu = u; bristle = mood === 'startled';
      body(ox, oy, hoy, lift);
      over(buf, SPR);

      const hx = 34 + ox, hy = 22 + oy + hoy;
      // A cool glint on the helm's brow and the lance tip.
      put(buf, hx - 3, hy - 7, C('#e0d0f0')); put(buf, hx - 2, hy - 8, C('#e0d0f0'));
      if (Math.sin(TAU * 5 * u) > 0.9) put(buf, 50 + ox, 3 + oy - lift, C('#ffffff'));
      // A clasp on the collar: an amber stone that glows with his eyes.
      const bx = 31 + ox, by = 48 + oy + hoy;
      put(buf, bx, by - 1, STEEL[1]); put(buf, bx - 1, by, STEEL[2]); put(buf, bx + 1, by, STEEL[2]); put(buf, bx, by + 1, STEEL[3]);
      put(buf, bx, by, Math.sin(TAU * 15 * u) > 0.3 ? EYEC : EYE);
      sockets(hx, hy, mood);
      const blink = frac(12 * u + 0.3) < 0.025 || (mood === 'watching' && frac(12 * u + 0.35) < 0.02);
      const pulse = 0.75 + 0.25 * Math.sin(TAU * 15 * u);
      const E1 = hx - 10, E2 = hx - 3;
      if (mood === 'watching') { eye(E1, hy - 1, blink ? 'shut' : 'glow', pulse); eye(E2, hy - 1, blink ? 'shut' : 'glow', pulse); }
      else if (mood === 'sly') { eye(E1, hy - 1, 'sly', 0.8); eye(E2, hy - 1, 'slyR', 0.8); }
      else if (mood === 'startled') { const f = age < 0.8 ? 1.6 : 1; eye(E1, hy - 1, blink ? 'shut' : 'wide', f); eye(E2, hy - 1, blink ? 'shut' : 'wide', f); }
      else if (mood === 'revealed') { eye(E1, hy, blink ? 'shut' : 'soft', 0.5); eye(E2, hy, blink ? 'shut' : 'soft', 0.5); }

      // Mist: mane streaming, snorts, fog.
      maneMist(u, mood === 'vanishing' ? 1 : mood === 'startled' ? 0.4 : mood === 'revealed' ? 0.35 : 0.8);
      if (sn < 0.14) {
        const v = sn / 0.14;
        for (let j = 0; j < 4; j++) blendAt(buf, 13 + ox - v * 8 - j, 30 + oy + hoy + v * 3 + (j & 1), MISTL, (1 - v) * 0.75);
        glow(buf, 10 + ox - v * 7, 31 + oy + hoy + v * 3, 2.5 + v * 3, MISTL, (1 - v) * 0.6);
      }
      if (mood === 'vanishing') {
        // The fog closes round him: only the eyes stay, blinking twice now and then.
        fogBand(4, 80, -1, 10, 7, FOG, 0.8, u, 0, W);
        fogBand(20, 60, 2, 8, 11, C('#6a9a98'), 0.5, u, 8, 54);
        const twice = frac(6 * u), off = (twice > 0.8 && twice < 0.83) || (twice > 0.87 && twice < 0.9);
        if (!off) { eye(E1, hy - 1, 'narrow', 1.2); eye(E2, hy - 1, 'narrow', 1.2); }
      } else if (mood === 'startled') {
        if (age < 0.6) for (let k = 0; k < 10; k++) {                                    // mist blown back
          const a = TAU * k / 10, r = 14 + age * 18;
          blendAt(buf, hx - 6 + Math.cos(a) * r, hy + Math.sin(a) * r * 0.8, MISTL, 0.5 * (1 - age / 0.6));
        }
      }
      fogBand(60, 80, mood === 'revealed' ? 1 : -1, 12, 3, mood === 'revealed' ? FOGD : FOG, mood === 'revealed' ? 0.35 : 0.55, u);
      for (const w of WISPS) {
        const b = Math.sin(TAU * w.kb * u + w.p);
        if (b < -0.1) continue;
        const x = w.x + 4 * Math.sin(TAU * w.k1 * u + w.p), y = w.y + 2 * Math.sin(TAU * w.k2 * u + w.p * 2);
        blendAt(buf, x + 1, y, WISP, 0.45); blendAt(buf, x - 1, y, WISP, 0.45); blendAt(buf, x, y + 1, WISP, 0.45); blendAt(buf, x, y - 1, WISP, 0.45);
        put(buf, x, y, C('#f0fff8'));
      }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'watching', (state && state.since) || 0);
    };
  },
});
