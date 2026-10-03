// ForkMaster, The Tactician: a live character portrait.
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the game HUD and dialogue bubbles. A smug cowboy knight in Forked Gulch at
// sunset: orange-brown horse head under a dark stetson, red bandana, a straw in his mouth
// and a two-pronged fork holstered in his fist like a six-shooter. Lit warm from the sun
// setting in the notch of the forked butte (left), purple canyon shade on the right.
// Moods: smug (default), yeehaw, rattled, impressed. Breathes, blinks, chews his straw,
// and twirls the fork like a gunslinger every 10 s. Fires both prongs when he whoops,
// loses the straw and the hat slips when rattled, tips his hat when impressed.
LiveScenes.register({
  id: 'char_forkmaster',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['smug', 'yeehaw', 'rattled', 'impressed'],
  frames: { face: [9, 3, 40, 40] },
  moodFor(category) {
    return {
      gameStart: 'smug', bossCapture: 'smug', bossCheck: 'smug', bossTaunt: 'smug', playerCheck: 'smug',
      bossCaptureBig: 'yeehaw', doubleTake: 'yeehaw', playerLowHealth: 'yeehaw',
      playerCapture: 'rattled', playerCaptureBig: 'rattled', lowHealth: 'rattled',
      milestone: 'impressed',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, mix, clamp, sq, frac, bay, ramp, hash, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over, line } = K;
    let buf = null;

    // ---------- backdrop: Forked Gulch at sunset, the sun in the notch of the fork ----------
    const BG = new Uint32Array(W * H);
    const SX = 10, SY = 50;
    const SKY = ['#1a1238', '#2e1648', '#4e1c5a', '#7a2462', '#aa3462', '#d84e56', '#f07848', '#fca24a', '#ffd070', '#fff0b0'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - SX, (y - SY) * 1.4), dh = Math.hypot(x - 33, (y - 26) * 1.1);
      BG[y * W + x] = ramp(SKY, y / 74 + 0.3 * Math.exp(-sq(d / 28)) + 0.2 * Math.exp(-sq(d / 8)) + 0.09 * Math.exp(-sq(dh / 16)), x, y);
    }
    K.disc(BG, SX, SY, 4.6, (dx, dy, d) => C(d < 0.55 ? '#ffffff' : d < 0.85 ? '#fff6d0' : '#ffe090'));
    // Far mesas across the valley, hazed toward the glow, flat tops lit on the rim.
    const HAZE = '#e06a5a';
    const MESA = ['#9a3a5a', '#8a3458', '#7a2e54'].map(h => C(mix(h, HAZE, 0.4)));
    const mesaTop = x => Math.min(x > 22 && x < 38 ? 55 : 62, x > 44 && x < 60 ? 53 + (x > 52 ? 1 : 0) : 62, 58 + 2 * fbm1(x / 9, 2));
    for (let x = 0; x < W; x++) {
      const ty = Math.round(mesaTop(x));
      for (let y = ty; y < H; y++) BG[y * W + x] = y === ty ? C(x < 40 ? '#ffb070' : '#d0605a') : ramp(MESA, (y - ty) / 8, x, y);
    }
    // The fork: a butte splitting into two spires, backlit, the sun sitting in the notch.
    for (let y = 30; y < 64; y++) for (let x = 0; x < 24; x++) {
      const rough = (fbm1(y / 3, x > SX ? 3 : 4) - 0.5) * 1.6;
      let inside = false, edge = 0;
      if (y >= 53) { const hw = 9 + (y - 53) * 0.8 + rough; inside = Math.abs(x - SX) < hw; edge = hw - Math.abs(x - SX); }
      else for (const [px, top, w] of [[3.5, 34, 3.2], [17, 39, 2.8]]) {
        const hw = w + (y - top) * 0.07 + rough, capY = top + w * 0.8;
        const inP = y < capY ? Math.hypot(x - px, (y - capY) * 1.3) < hw : Math.abs(x - px) < hw;
        if (inP) { inside = true; edge = hw - Math.abs(x - px); }
      }
      if (!inside) continue;
      const strata = (y + Math.round(x * 0.2)) % 5 === 0;
      BG[y * W + x] = edge < 1 && Math.abs(y - SY) < 16 ? C('#ffb060') : edge < 1.8 ? C('#a8403a')
        : ramp(['#5a1e3e', '#4a1838', '#3a1430', '#2c1028'].map(C), (y - 30) / 40 + (strata ? 0.25 : 0), x, y);
    }
    // Valley floor, warm near the sun, then the shaded cliff edge we stand on.
    const VALLEY = ['#e89a60', '#c8744e', '#a45a4a', '#7a4046'].map(C);
    for (let y = 62; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (BG[i] !== 0 && y < 64 && Math.hypot(x - SX, y - 60) < 12) { /* keep butte foot */ }
      BG[i] = ramp(VALLEY, (y - 62) / 12 + Math.abs(x - SX) / 90, x, y);
    }
    const CLIFF = ['#6a2a3a', '#521f34', '#3e182e', '#2c1026'].map(C);
    const cliffTop = x => 72 + Math.round(1.3 * Math.sin(x / 6 + 1) + (x > 48 ? (x - 48) * -0.25 : 0));
    for (let x = 0; x < W; x++) {
      const ty = cliffTop(x);
      for (let y = ty; y < H; y++) BG[y * W + x] = y === ty ? C(x < 30 ? '#ffa060' : '#c05a44') : y === ty + 1 ? C('#8a3a40') : ramp(CLIFF, (y - ty) / 8, x, y);
    }
    // Cacti: a saguaro on the right, a prickly pear on the left; silhouettes with a warm rim
    // on the side facing the sun.
    function sil(pts) {
      const set = new Set(pts.map(([x, y]) => x + ',' + y));
      for (const [x, y] of pts) put(BG, x, y, set.has((x - 1) + ',' + y) ? C('#1a0a18') : C('#ff9a50'));
    }
    (function saguaro() {
      const pts = [], col = (cx, y0, y1, w) => { for (let y = y0; y <= y1; y++) for (let i = -w; i <= w; i++) if (y > y0 || Math.abs(i) < w) pts.push([cx + i, y]); };
      col(56, 52, 76, 1);
      for (let i = 2; i <= 3; i++) for (let j = 0; j < 2; j++) pts.push([56 + i, 64 + j]);
      col(59, 58, 65, 0.6); col(60, 58, 60, 0);
      for (let i = 2; i <= 3; i++) for (let j = 0; j < 2; j++) pts.push([56 - i, 68 + j]);
      col(53, 62, 69, 0.6);
      sil(pts);
    })();
    (function pear() {
      const pts = [];
      for (const [cx, cy, r] of [[5, 74, 2.6], [8, 71, 2.2], [3, 70, 1.8]])
        for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r * 0.8); x <= cx + r * 0.8; x++)
          if (sq((x - cx) / (r * 0.8)) + sq((y - cy) / r) <= 1) pts.push([x, y]);
      sil(pts);
    })();

    // ---------- ForkMaster ----------
    const MATS = [
      ['#ffc486', '#ec9850', '#d07a3c', '#9e5432', '#66303e'],   // 0 coat: the orange-brown knight
      ['#fff4dc', '#f8d8aa', '#e4b07c', '#b47a5a', '#7a4650'],   // 1 muzzle and gloves
      ['#a06a48', '#80503a', '#62382e', '#46262a', '#2e1a22'],   // 2 hat
      ['#ff8a64', '#e84a34', '#b82c2c', '#7a1a2c'],              // 3 bandana
      ['#7a3a22', '#5a2a1e', '#42201e', '#2c1620'],              // 4 mane
      ['#ffffff', '#d0d6e8', '#8890b0', '#4a4a68'],              // 5 fork steel
      ['#b07040', '#804a2c', '#5a3020', '#3a1e1a'],              // 6 fork grip (wood)
    ].map(m => m.map(C));
    const RIM = C('#b49ae0'), LINE = C('#2e1e2e'), HANDLINE = C('#7a4650');
    const LN = Math.hypot(0.7, 0.45, 0.55), LX = -0.7 / LN, LY = -0.45 / LN, LZ = 0.55 / LN;
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H), MAT = new Uint8Array(W * H);
    const FRONT = 12;                                            // parts from here on get a dark seam

    function shade(x, y, nx, ny, part, mat) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * LX + ny * LY + nz * LZ, T = MATS[mat], i = y * W + x;
      SPR[i] = nx > 0.78 && l < 0.25 && mat !== 5 && mat !== 4 && part !== 7 && part !== 12 ? RIM : T[Math.round(clamp(1 - (l * 0.7 + 0.3)) * (T.length - 1))];
      PART[i] = part; MAT[i] = mat;
    }
    function flat(x, y, tone, part, mat) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = y * W + x; SPR[i] = MATS[mat][tone]; PART[i] = part; MAT[i] = mat;
    }
    function disc(cx, cy, rx, ry, part, mat) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.95, ny * 0.95, part, mat);
      }
    }

    // The knight's neck, front (chest, left) and back (right) edges per row.
    const neckL = y => 23 - 3 * Math.sin(Math.PI * clamp((y - 34) / 16)) + (y < 36 ? (36 - y) * 1.2 : 0);
    const neckR = y => 42 - (y - 30) * 0.12;
    const headR = y => 33 + 10 * Math.sqrt(Math.max(0, 1 - sq((y - 24) / 9.5)));

    // pose: ox, oy body offset; hat {dx, dy, tilt}; left hand {x, y}; fork angle; mane flutter
    function body(ox, oy, pose) {
      SPR.fill(0); PART.fill(0);
      // Base plinth and skirt of the knight piece.
      for (let y = 68; y <= 75; y++) {
        const top = y - 68, hw = 15 - (top < 2 ? 2 - top : 0) - (y === 75 ? 1 : 0);
        for (let x = CX - hw; x <= CX + hw; x++) shade(x + ox, y + oy, (x - CX) / 16, y < 70 ? -0.6 : 0.1, 1, 0);
      }
      for (let y = 51; y <= 68; y++) {
        const hw = 7 + Math.pow((y - 51) / 17, 1.7) * 7;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) shade(x + ox, y + oy, (x - CX) / (hw + 0.5), 0.12, 2, 0);
      }
      disc(CX + ox, 51 + oy, 10.5, 2.5, 3, 0);                                   // collar
      const bo = oy + pose.breath;                                               // the breathing top half
      for (let y = 30; y <= 50; y++) {                                           // neck
        const L = neckL(y), R = neckR(y), mid = (L + R) / 2, hw = (R - L) / 2;
        for (let x = Math.round(L); x <= Math.round(R); x++) shade(x + ox, y + (y < 48 ? bo : oy), (x - mid) / hw * 0.9, 0.05, 4, 0);
      }
      disc(33 + ox, 24 + bo, 10, 9.5, 5, 0);                                     // cranium
      for (let y = 13; y <= 47; y++) {                                           // mane down the back
        const b = y < 30 ? headR(y) : neckR(y), tuft = ((y + 1) >> 1) & 1;
        const fl = Math.sin(TAU * pose.wind + y * 0.7) > 0.4 ? 1 : 0;
        const len = 1 + tuft + (tuft ? fl : 0) + (y > 20 && y < 42 ? 1 : 0);
        for (let x = Math.round(b) - 2; x <= Math.round(b) + len; x++) shade(x + ox, y + (y < 48 ? bo : oy), clamp((x - b + 2) / (len + 2)) * 1.1 - 0.2, 0, 6, 4);
      }
      disc(22 + ox, 31 + bo, 8.5, 5.6, 7, 1);                                    // muzzle
      // Bandana: a band round the neck and a triangle hanging at the chest, white polka dots.
      for (let y = 41; y <= 44; y++) {
        const L = neckL(y) - 0.5, R = neckR(y) + 0.5, mid = (L + R) / 2, hw = (R - L) / 2;
        for (let x = Math.round(L); x <= Math.round(R); x++) shade(x + ox, y + bo + (x > mid ? 0 : 0), (x - mid) / hw * 0.9, (y - 42.5) / 3, 8, 3);
      }
      for (let y = 45; y <= 51; y++) {
        const hw = (51 - y) * 0.85, c = 26 + (y - 45) * 0.15;
        for (let x = Math.round(c - hw); x <= Math.round(c + hw); x++) shade(x + ox, y + bo, (x - c) / (hw + 1) * 0.8, 0.25, 9, 3);
      }
      for (const [dx, dy] of [[24, 42], [31, 43], [37, 42], [26, 47], [25, 45]]) if (PART[(dy + bo) * W + dx + ox] >= 8) flat(dx + ox, dy + bo, 0, PART[(dy + bo) * W + dx + ox], 3), SPR[(dy + bo) * W + dx + ox] = C('#ffe8d8');
      // Stetson: a curled brim and a pinched crown with a dark band and a silver concho.
      const hcx = 32 + ox + pose.hat.dx, hcy = 15 + bo + pose.hat.dy, tl = pose.hat.tilt;
      for (let y = hcy - 4; y <= hcy + 4; y++) for (let x = hcx - 17; x <= hcx + 17; x++) {
        const dx = x - hcx, curl = sq(dx / 16) * 2.4, yy = y - tl * dx + curl;
        const nx = dx / 16.5, ny = (yy - hcy) / 2.6;
        if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.5, ny * 0.9 - 0.2, 10, 2);
      }
      for (let y = hcy - 10; y <= hcy - 1; y++) {
        const r = hcy - 1 - y, hw = 6.6 - r * 0.12, sh = Math.round(-tl * 6 - r * tl * 0.6);
        for (let x = Math.round(hcx - hw); x <= Math.round(hcx + hw); x++) {
          const dx = x - hcx;
          if (r === 9 && (Math.abs(dx) < 1.5 || Math.abs(dx) > hw - 1)) continue;   // the pinch on top
          if (r === 8 && Math.abs(dx) > hw - 0.5) continue;
          const tone = r <= 1 ? null : r === 9 || r === 8 ? -0.5 : -0.1;
          if (tone === null) flat(x + sh, y, dx < -4 ? 2 : 3, 11, 2), SPR[y * W + x + sh] = dx === -3 ? C('#e8e0d0') : dx < -4 ? C('#3a1e20') : C('#26141a');
          else shade(x + sh, y, dx / (hw + 0.5) * 0.95, tone, 11, 2);
        }
      }
      // An ear poking up behind the crown.
      for (let y = hcy - 9; y <= hcy - 2; y++) {
        const v = (y - (hcy - 9)) / 7, c = hcx + 10.5 - v * 2, hw = 0.4 + v * 1.4;
        for (let x = Math.round(c - hw); x <= Math.round(c + hw); x++) shade(x, y, (x - c) / (hw + 0.5) * 0.8, -0.2, 12, 0);
      }
      put(SPR, Math.round(hcx + 9.5), hcy - 4, MATS[0][4]);
      // The fork, gripped like a six-shooter; then the gloved hands in front.
      const hx = 46 + ox, hy = 55 + bo, a = pose.fork, dx = Math.sin(a), dy = -Math.cos(a);
      for (let r = -3; r <= 12.5; r += 0.5) {
        const px = hx + dx * r, py = hy + dy * r;
        if (r < 4) { for (const s of [-0.5, 0.5]) flat(px - dy * s, py + dx * s, s < 0 ? 0 : 2, 13, 6); continue; }
        if (r < 8) { flat(px, py, 1, 13, 5); continue; }
        if (r < 9) { for (let s = -1; s <= 1; s += 0.5) flat(px - dy * s, py + dx * s, 1, 13, 5); continue; }
        for (const s of [-1, 1]) flat(px - dy * s, py + dx * s, r > 11.5 ? 0 : s < 0 ? 0 : 2, 13, 5);
      }
      disc(hx, hy, 3.5, 3.2, 14, 1);
      disc(pose.hand.x + ox, pose.hand.y + (pose.hand.y < 40 ? 0 : bo), 3.4, 3.1, 15, 1);
      // Outline around the figure; seams where parts overlap.
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        const n0 = PART[i - 1], n1 = PART[i + 1], n2 = PART[i - W], n3 = PART[i + W];
        if (!p) { if (n0 || n1 || n2 || n3) SPR[i] = LINE; continue; }
        const lower = (q, j) => q && q < p ? j : -1;
        for (const j of [lower(n0, i - 1), lower(n1, i + 1), lower(n2, i - W), lower(n3, i + W)]) {
          if (j < 0) continue;
          if (p >= FRONT) { SPR[i] = p === 13 ? LINE : HANDLINE; break; }
          if (MAT[j] === MAT[i] && MAT[i] !== 3) { SPR[i] = MATS[MAT[i]][3]; break; }
          if (MAT[i] === 4 || MAT[i] === 3) { SPR[i] = MATS[MAT[i]][MATS[MAT[i]].length - 1]; break; }
          if (MAT[i] === 1) { SPR[i] = MATS[1][3]; break; }
        }
      }
      // The fork is thin: give it a full dark outline even where it crosses the body.
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (PART[i] === 13 || PART[i] >= 14) continue;
        if (PART[i - 1] === 13 || PART[i + 1] === 13 || PART[i - W] === 13 || PART[i + W] === 13) SPR[i] = LINE;
      }
    }

    const EYE = C('#1e1420'), SHINE = C('#ffffff'), BROW = C('#5a2a26'), MOUTH = C('#3a1420');
    const TEETH = C('#fff8ec'), TONGUE = C('#e86a6a'), STRAW = C('#ffe48a'), STRAWD = C('#9a6a2a');
    const DROP = C('#8ae0ff'), DROPD = C('#3a8ab0'), FLASH = C('#fff6c0'), FLASH2 = C('#ffb040'), BLUSH = C('#ff8a70');

    function eye(x, y, kind, look) {
      if (kind === 'blink') { put(buf, x - 1, y + 1, EYE); put(buf, x, y + 1, EYE); put(buf, x + 1, y + 1, EYE); return; }
      if (kind === 'smile') { put(buf, x - 1, y + 1, EYE); put(buf, x, y, EYE); put(buf, x + 1, y + 1, EYE); return; }
      if (kind === 'lidded') {                                       // half-shut, looking down his nose
        put(buf, x - 1, y, EYE); put(buf, x, y, EYE); put(buf, x + 1, y, EYE);
        put(buf, x + look, y + 1, EYE); put(buf, x + look - 1, y + 1, EYE);
        put(buf, x + look, y + 2, EYE); put(buf, x + look - 1, y + 2, EYE);
        return;
      }
      if (kind === 'wide') {                                         // whites and a small pupil
        for (let j = -1; j <= 2; j++) for (let i = -1; i <= 1; i++) put(buf, x + i, y + j, TEETH);
        for (let i = -1; i <= 1; i++) { put(buf, x + i, y - 2, EYE); put(buf, x + i, y + 3, EYE); }
        for (let j = -1; j <= 2; j++) { put(buf, x - 2, y + j, EYE); put(buf, x + 2, y + j, EYE); }
        put(buf, x + look, y, EYE); put(buf, x + look, y + 1, EYE);
        return;
      }
      // 'open': 2x3 with a shine, like Pawnie's
      for (let j = 0; j < 3; j++) { put(buf, x - 1, y + j, EYE); put(buf, x, y + j, EYE); }
      put(buf, x - 1, y, SHINE);
    }
    function drop(x, y) {
      put(buf, x, y, DROP); put(buf, x, y + 1, DROP); put(buf, x - 1, y + 1, DROPD); put(buf, x + 1, y + 1, DROP);
      put(buf, x, y + 2, DROPD); put(buf, x - 1, y, LINE); put(buf, x + 1, y, LINE); put(buf, x, y - 1, LINE);
    }
    function flash(x, y, big) {
      put(buf, x, y, FLASH);
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(buf, x + a, y + b, big ? FLASH : FLASH2);
      if (big) {
        for (const [a, b] of [[1, -1], [-1, -1], [1, 1], [-1, 1]]) put(buf, x + a, y + b, FLASH);
        for (const [a, b] of [[2, 0], [-2, 0], [0, -2], [0, 2], [3, 0], [-3, 0], [0, -3], [2, -2], [-2, -2], [2, 2], [-2, 2]]) put(buf, x + a, y + b, FLASH2);
        for (const [a, b] of [[0, -4], [4, 0], [-4, 0], [3, -3], [-3, -3]]) put(buf, x + a, y + b, C('#ff6a2a'));
      }
    }

    // ---------- backdrop motion ----------
    const CLOUDS = [
      { s: K.cloud(26, 5, 4, ['#6a2a6a', '#8a3a6a', '#b04a6a', '#e0685e', '#ff9a60'], '#ffd080'), x0: 5, y: 11, k: 1 },
      { s: K.cloud(18, 4, 9, ['#5a2462', '#7a3068', '#a0406a', '#d05c60', '#ff8a5a'], '#ffc070'), x0: 50, y: 30, k: 2 },
    ];
    const DUST = Array.from({ length: 8 }, (_, i) => ({ x: hash(i, 1) * 62, k: 3 + (i % 3), p: hash(i, 2) }));
    const vignette = K.vignette(C('#0e0614'), 0.38, 0.42);

    function frame(t, mood, since) {
      const u = t / LOOP, age = ((t - since) % LOOP + LOOP) % LOOP;
      buf.set(BG);
      for (const c of CLOUDS) K.blit(buf, c.s, frac(c.x0 / 100 + c.k * u) * 100 - 30, c.y);
      // Sun shimmer: its rim breathes.
      if (Math.sin(TAU * 12 * u) > 0) { put(buf, SX - 5, SY - 1, C('#ffe090')); put(buf, SX + 5, SY - 2, C('#ffe090')); }
      // A hawk circling high on the right.
      {
        const a = TAU * 4 * u, x = 49 + Math.cos(a) * 6, y = 14 + Math.sin(a) * 2.2, up = Math.sin(TAU * 90 * u) > 0.3;
        for (const [dx, dy] of up ? [[-3, -1], [-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1], [3, -1]] : [[-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0]]) put(buf, x + dx, y + dy, C('#2a1022'));
      }
      // A tumbleweed bouncing along the valley floor.
      {
        const v = frac(4 * u + 0.35), tx = -8 + v * 78, ty = 67 - Math.abs(Math.sin(v * TAU * 4)) * 3.5, ta = v * TAU * 6;
        for (let k = 0; k < 9; k++) {
          const a = ta + k / 9 * TAU, r = 1.4 + (k % 3) * 0.6;
          line(buf, tx + Math.cos(a) * r * 0.3, ty + Math.sin(a) * r * 0.3, tx + Math.cos(a + 1) * r, ty + Math.sin(a + 1) * r, C(k % 2 ? '#8a5040' : '#d09a68'));
        }
      }
      // Dust blowing off the cliff edge.
      for (const d of DUST) {
        const v = frac(d.k * u + d.p), x = d.x + v * 14, y = cliffTop(Math.round(d.x)) - 1 - Math.sin(v * Math.PI) * 4;
        blendAt(buf, x, y, C('#ffc890'), 0.55 * (1 - v));
      }
      vignette(buf);

      // ---------- the figure ----------
      const breath = Math.sin(TAU * 20 * u) > 0.35 ? 1 : 0;
      let ox = 0, oy = 0, fork = 0;
      const hat = { dx: 0, dy: 0, tilt: 0.06 };
      const hand = { x: 21, y: 59 };
      // Signature habit: every 10 s he spins the fork twice round his finger.
      const w = frac(6 * u + 0.62);
      if (w < 0.1) fork = TAU * 2 * (1 - sq(1 - w / 0.1));
      let shot = false;
      if (mood === 'yeehaw') {
        oy -= Math.round(Math.max(0, Math.sin(TAU * 40 * u)) * 2);                // whooping hops
        hat.dy = oy < 0 ? -1 : 0;
        const s = frac(20 * u);
        shot = age < 0.25 || s < 0.05;
        fork = 0.3 + (shot ? 0.2 : 0);
        hand.x = 15; hand.y = 50;
      } else if (mood === 'rattled') {
        ox = Math.sin(TAU * 600 * u) > 0.6 ? 1 : 0;                                  // a jittery shake
        hat.dx = 1; hat.dy = -1; hat.tilt = -0.07;                                  // hat knocked askew
        if (age < 0.5) oy -= Math.round(2 * Math.sin(Math.PI * age / 0.5));
        fork = 0.25;
      } else if (mood === 'impressed') {
        const lift = age < 0.3 ? age / 0.3 : 1;
        hat.dy = -Math.round(2 * lift); hat.tilt = 0.06 - 0.09 * lift;              // tips his hat
        hand.x = 21; hand.y = 59 - Math.round(46 * lift);
      }
      body(ox, oy, { breath, hat, hand, fork, wind: 15 * u });
      over(buf, SPR);

      // ---------- face ----------
      const bo = oy + breath, fx = ox, fy = bo;
      const E1 = [26 + fx, 21 + fy], E2 = [33 + fx, 21 + fy];                        // far eye, near eye
      const blink = mood !== 'yeehaw' && frac(13 * u + 0.4) < 0.025;
      put(buf, 36 + fx, 16 + fy + 2, SHINE); put(buf, 37 + fx, 18 + fy, SHINE);   // gloss under the brim
      put(buf, 17 + fx, 28 + fy, SHINE);                                             // on the muzzle
      // Nostrils.
      put(buf, 15 + fx, 30 + fy, MOUTH); put(buf, 18 + fx, 29 + fy, MOUTH);
      if (mood === 'smug') {
        const look = frac(5 * u) < 0.35 ? -1 : 0;                                    // sizing you up
        eye(E1[0], E1[1], blink ? 'blink' : 'lidded', look); eye(E2[0], E2[1], blink ? 'blink' : 'lidded', look);
        for (let i = -1; i <= 1; i++) put(buf, E1[0] + i, E1[1] - 2, BROW);          // one brow flat...
        put(buf, E2[0] - 1, E2[1] - 2, BROW); put(buf, E2[0], E2[1] - 3, BROW); put(buf, E2[0] + 1, E2[1] - 3, BROW); // ...one cocked
        for (let x = 17; x <= 23; x++) put(buf, x + fx, 34 + fy, MOUTH);             // a lopsided grin
        put(buf, 24 + fx, 33 + fy, MOUTH); put(buf, 25 + fx, 32 + fy, MOUTH);
        const chew = Math.sin(TAU * 36 * u) > 0 ? 1 : 0;                             // chewing the straw
        line(buf, 18 + fx, 36 + fy, 12 + fx, 37 + fy + chew, STRAWD);
        line(buf, 18 + fx, 35 + fy, 12 + fx, 36 + fy + chew, STRAW);
        put(buf, 11 + fx, 36 + fy + chew, STRAWD); put(buf, 10 + fx, 36 + fy + chew * 2, STRAW); put(buf, 10 + fx, 35 + fy + chew * 2, STRAWD);
      } else if (mood === 'yeehaw') {
        eye(E1[0], E1[1] + 1, 'smile'); eye(E2[0], E2[1] + 1, 'smile');
        for (let x = 16; x <= 25; x++) put(buf, x + fx, 33 + fy, MOUTH);             // wide open whoop
        for (let x = 17; x <= 24; x++) put(buf, x + fx, 34 + fy, x < 19 || x > 22 ? MOUTH : TONGUE);
        for (let x = 18; x <= 23; x++) put(buf, x + fx, 35 + fy, MOUTH);
        for (let x = 17; x <= 24; x++) put(buf, x + fx, 32 + fy, TEETH);
        put(buf, 26 + fx, 32 + fy, MOUTH);
        blendAt(buf, 36 + fx, 26 + fy, BLUSH, 0.6); blendAt(buf, 37 + fx, 26 + fy, BLUSH, 0.6);
        if (shot) {                                                                  // bang, bang: both prongs fire
          const a = fork, dx = Math.sin(a), dy = -Math.cos(a), hx = 46 + ox, hy = 55 + bo;
          for (const s of [-1, 1]) flash(Math.round(hx + dx * 15 - dy * s * 2.5), Math.round(hy + dy * 15 + dx * s * 2.5), s > 0);
        } else {
          const s = frac(20 * u), a = fork, dx = Math.sin(a), dy = -Math.cos(a);
          if (s < 0.3) for (const k of [0, 1]) blendAt(buf, 46 + ox + dx * (15 + s * 20) + k * 2 - 1, 55 + bo + dy * (15 + s * 20) - s * 10, C('#e8d8d0'), 0.5 * (1 - s / 0.3));
        }
      } else if (mood === 'rattled') {
        const look = Math.sin(TAU * 30 * u) > 0 ? 1 : -1;
        eye(E1[0], E1[1], blink ? 'blink' : 'wide', look); eye(E2[0] + 1, E2[1], blink ? 'blink' : 'wide', look);
        for (let i = -1; i <= 1; i++) { put(buf, E1[0] + i, E1[1] - 4 + (i < 0 ? 0 : 1), BROW); put(buf, E2[0] + 1 + i, E2[1] - 4 + (i > 0 ? 0 : 1), BROW); }
        for (let x = 17; x <= 24; x++) put(buf, x + fx, 34 + fy, (x & 1) ? TEETH : MOUTH); // gritted teeth
        for (let x = 17; x <= 24; x++) { put(buf, x + fx, 33 + fy, MOUTH); put(buf, x + fx, 35 + fy, MOUTH); }
        const v = frac(15 * u);
        if (v < 0.6) drop(41 + fx, 26 + fy + Math.round(v * 6));
        // The straw falls out of his mouth when the mood starts.
        if (age < 0.8) { const f = age / 0.8; line(buf, 17 + fx - f * 3, 36 + fy + f * 30, 11 + fx - f * 4, 37 + fy + f * 33, STRAW); }
      } else {                                                                       // impressed: "well I'll be"
        eye(E1[0], E1[1], blink ? 'blink' : 'open'); eye(E2[0], E2[1], blink ? 'blink' : 'open');
        for (let i = -1; i <= 1; i++) { put(buf, E1[0] + i, E1[1] - 3, BROW); put(buf, E2[0] + i, E2[1] - 3, BROW); }
        for (let x = 18; x <= 23; x++) put(buf, x + fx, 34 + fy, MOUTH);             // an easy smile
        put(buf, 17 + fx, 33 + fy, MOUTH); put(buf, 24 + fx, 33 + fy, MOUTH);
        line(buf, 18 + fx, 35 + fy, 12 + fx, 35 + fy, STRAW); put(buf, 11 + fx, 34 + fy, STRAWD);
      }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'smug', (state && state.since) || 0);
    };
  },
});
