// Queenie, the Royal Tyrant: a live character portrait.
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the game HUD and dialogue bubbles. A pink queen piece in a lace ruff and
// a towering gold crown, standing in her throne hall with the rose window behind the crown
// and the late sun slanting in from the right. One hand on her hip, the other fanning
// herself (her habit). Moods: smug (default), delighted, outraged, panicked.
LiveScenes.register({
  id: 'char_queenie',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['smug', 'delighted', 'outraged', 'panicked'],
  frames: { face: [11, 2, 40, 40] },
  moodFor(category) {
    return {
      gameStart: 'smug', bossTaunt: 'smug', milestone: 'smug', playerLowHealth: 'smug',
      bossCapture: 'delighted', bossCaptureBig: 'delighted', bossCheck: 'delighted',
      playerCapture: 'outraged', playerCaptureBig: 'outraged', lowHealth: 'outraged',
      playerCheck: 'panicked',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, clamp, sq, frac, bay, ramp, hash, blend } = PixelKit;
    const { put, blendAt, over, glow } = PixelKit.surface(W, H);
    let buf = null;

    const GOLD = ['#fff0a0', '#ffcf40', '#c8902a', '#7a5020'].map(C);

    // ---------- backdrop: the throne hall, the rose window glowing behind the crown ----------
    const BG = new Uint32Array(W * H);
    const WALL = ['#1c1630', '#2a2040', '#3c2e50', '#523e62', '#6e4e72', '#94647e', '#c08488', '#e8ac94', '#ffd8a8'].map(C);
    const RX = CX, RY = 14, RR = 21;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - RX, (y - 22) * 1.05);
      BG[y * W + x] = ramp(WALL, 0.18 + 0.5 * Math.exp(-sq(d / 22)) + 0.2 * Math.exp(-sq(d / 10)) + (x - 31) / 200, x, y);
    }
    const WALLC = C('#6e4e72'); const blend2 = (c, y) => { const tmp = new Uint32Array([c]); blend(tmp, 0, WALLC, 0.55); return tmp[0]; };
    // The rose window: stained glass in a gold tracery, half hidden by the crown.
    const GLASS = [];
    for (let y = RY - RR - 1; y <= RY + RR + 1; y++) for (let x = RX - RR - 1; x <= RX + RR + 1; x++) {
      const dx = x - RX, dy = y - RY, d = Math.hypot(dx, dy) / RR, a = Math.atan2(dy, dx);
      if (d > 1.08) continue;
      const i = y * W + x;
      if (d > 0.94 || Math.abs(Math.sin(6 * a)) < 0.13 * (1 + d) && d > 0.28 || Math.abs(d - 0.56) < 0.06) { BG[i] = blend2(d > 1 ? GOLD[3] : GOLD[2]); continue; }
      const seg = Math.floor((a + Math.PI) / (TAU / 12));
      BG[i] = C(d < 0.28 ? '#fff0a0' : d < 0.56 ? ['#ffcf40', '#ff7aa8'][seg % 2] : ['#e8506a', '#ffcf40', '#6a7ae0', '#ffcf40'][seg % 4]);
      BG[i] = blend2(BG[i], y);
      if (d >= 0.28) GLASS.push(i, seg);
    }
    // Floor: a checkered marble floor in perspective, the red carpet down the middle.
    const FY = 67;
    const MARBLE_L = ['#fffaf2', '#efe4dc', '#d8c8c8', '#b8a4b0'].map(C), MARBLE_D = ['#c88a98', '#9a6272', '#76485c', '#54344a'].map(C);
    const CARPET = ['#e04a4a', '#b02a3a', '#7a1a2e'].map(C);
    for (let y = FY; y < H; y++) for (let x = 0; x < W; x++) {
      const Z = 24 / (y - FY + 2.5), X = (x - CX) * Z / 4;
      const i = y * W + x, shadeT = (y - FY) / 30 + Math.abs(x - CX) / 90;
      if (Math.abs(X) < 3.2) BG[i] = Math.abs(X) > 2.7 ? GOLD[2] : ramp(CARPET, 0.3 + shadeT, x, y);
      else {
        const dark = (Math.floor(X / 5 + 20) + Math.floor(Z * 0.9)) % 2 === 1, P = dark ? MARBLE_D : MARBLE_L;
        BG[i] = P[Math.min(3, Math.round((0.2 + shadeT + (x < CX ? 0.2 : 0)) * 3))];
      }
    }
    for (let x = 0; x < W; x++) BG[FY * W + x] = GOLD[3];
    // Marble columns at both edges: lit on the right (the sun), gold capitals and bases.
    const SHADE = ['#6a5074', '#523e62', '#3c2e50', '#2a2040'].map(C);
    const GOLDPIX = [];
    for (const [c0, c1] of [[0, 7], [55, 62]]) for (let y = 0; y < FY; y++) for (let x = c0; x < c1; x++) {
      const rel = (x - c0) / (c1 - c0), i = y * W + x;
      let col = rel > 0.6 ? ramp(MARBLE_L, 0.2 + (1 - rel), x, y) : ramp(SHADE, 0.2 + (0.6 - rel) * 2.5, x, y);
      if ((x - c0) % 2 === 1 && rel > 0.1 && rel < 0.9) col = rel > 0.6 ? MARBLE_L[2] : SHADE[2];     // flutes
      if ((y >= 8 && y <= 11) || y >= FY - 4) { col = y === 8 || y === FY - 4 ? GOLD[3] : ramp(GOLD, rel > 0.6 ? 0.2 : 0.75, x, y); GOLDPIX.push(i); }
      BG[i] = col;
    }
    // Wall sconces on the columns (their candles flicker in frame()).
    const SCONCES = [[9, 36], [52, 36]];
    for (const [sx, sy] of SCONCES) { put(BG, sx, sy + 1, GOLD[2]); put(BG, sx - 1, sy + 2, GOLD[3]); put(BG, sx, sy + 2, GOLD[1]); put(BG, sx + 1, sy + 2, GOLD[3]); put(BG, sx, sy, C('#fff6e0')); }
    // Darker, cooler corners.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = sq((x - 31) / 31) * 0.55 + sq((y - 30) / 50) * 0.8;
      if (clamp((v - 0.42) * 1.4) > bay(x, y)) blend(BG, y * W + x, C('#140a18'), 0.35);
    }
    // The sunbeam from the high window on the right, down across the floor.
    const BEAM = [], inBeam = (x, y) => { const e = x - (62 - (y - 4) * 0.55); return e > -12 && e < 0 && y > 4; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inBeam(x, y)) BEAM.push(y * W + x);

    // ---------- Queenie ----------
    const PINK = ['#ffd6e8', '#ff9ac8', '#ff66aa', '#cc4488', '#7a2a66'].map(C);
    const SKIN = ['#fff6ee', '#ffe0cc', '#f4bcac', '#cc8c9c', '#8a5a7a'].map(C);
    const LACE = ['#ffffff', '#f6ecf4', '#dcc6dc', '#a890b8'].map(C);
    const VELVET = ['#ff6a8a', '#d8305a', '#a01c44', '#661030'].map(C);
    const SPIRES = [[-8, 5], [-4, 8], [0, 11], [4, 8], [8, 5]], SPIRE_GEMS = ['#6a7ae0', '#ff3a8a', null, '#ff3a8a', '#6a7ae0'];
    const ROSEB = ['#c05090', '#963474', '#6a2258', '#46143e'].map(C);
    const HAIR = ['#b0507e', '#7e2e62', '#561c48', '#3a1236'].map(C);
    const RIM = C('#b0b8f0'), LINE = C('#2e1e2e'), SEAM = C('#b0708e'), HANDLINE = C('#8a4a6a');
    // Key light: the low sun through the windows on the right. Rim: cool marble shade, left.
    const LN = Math.hypot(0.6, 0.6, 0.55), LX = 0.6 / LN, LY = -0.6 / LN, LZ = 0.55 / LN;
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H);

    function shade(x, y, nx, ny, part, P) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * LX + ny * LY + nz * LZ;
      const i = y * W + x;
      SPR[i] = nx < -0.82 && l < 0.2 ? RIM : P[Math.round(clamp(1 - (l * 0.62 + 0.42)) * (P.length - 1))];
      PART[i] = part;
    }
    function disc(cx, cy, rx, ry, part, P) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.95, ny * 0.95, part, P);
      }
    }

    // Fan: a pleated half-circle opening from the hand; `ang` points its middle, `open` 0..1.
    function fan(px, py, ang, open, part) {
      const span = 0.2 + open * 0.85, R = 10;
      for (let y = Math.floor(py - R); y <= py + R; y++) for (let x = Math.floor(px - R); x <= px + R; x++) {
        const dx = x - px, dy = y - py, r = Math.hypot(dx, dy);
        if (r > R || r < 1) continue;
        let da = Math.atan2(dy, dx) - ang;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) > span) continue;
        const i = y * W + x, pleat = Math.floor((da + span) / (span * 2) * (open > 0.3 ? 9 : 3));
        SPR[i] = r > R - 1.3 ? GOLD[(pleat & 1) ? 1 : 2] : r < 3.5 ? GOLD[2] : (pleat & 1) ? PINK[0] : PINK[1];
        if (r > 3.5 && r < R - 1.3 && Math.abs(Math.abs(da) - span) < 0.12) SPR[i] = GOLD[2];
        PART[i] = part;
      }
    }

    function body(ox, oy, hoy, crownTilt, fanAng, fanOpen, fanX, fanY) {
      SPR.fill(0); PART.fill(0);
      // Gold plinth.
      for (let y = 67; y <= 74; y++) {
        const top = y - 67, hw = 15 - (top < 2 ? 2 - top : 0) - (y === 74 ? 1 : 0);
        for (let x = CX - hw; x <= CX + hw; x++) shade(x + ox, y + oy, (x - CX) / 16, y < 69 ? -0.6 : 0.1, 1, y === 70 ? GOLD : ROSEB);
      }
      // The gown: a slim waist flaring to the floor.
      for (let y = 41; y <= 67; y++) {
        const hw = 5.5 + Math.pow((y - 41) / 26, 1.6) * 9.5;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) shade(x + ox, y + oy, (x - CX) / (hw + 0.5), 0.1, 2, PINK);
      }
      // Hair behind the head, curling at the sides.
      disc(CX + ox, 28 + oy + hoy, 13.5, 10.5, 3, HAIR);
      disc(CX - 12 + ox, 34 + oy + hoy, 3, 3, 3, HAIR); disc(CX + 12 + ox, 34 + oy + hoy, 3, 3, 3, HAIR);
      // Lace ruff, scalloped at the edge.
      for (let y = 36; y <= 42; y++) for (let x = CX - 12; x <= CX + 12; x++) {
        const nx = (x - CX) / 12, ny = (y - 39) / 3.2, e = nx * nx + ny * ny;
        if (e > 1 && !(y === 42 && x % 2 === 0 && e < 1.5) && !(y === 36 && x % 2 === 1 && e < 1.5)) continue;
        shade(x + ox, y + oy + hoy, nx * 0.9, ny * 0.6, 4, LACE);
      }
      disc(CX + ox, 27.5 + oy + hoy, 11, 10.5, 5, SKIN);                                       // head
      // The crown: a gold band and five pointed spires (the middle one tallest), pearls on top.
      const t = crownTilt, ty = dx => Math.round(t * dx / 9);
      for (const [dx, h] of SPIRES) for (let j = 0; j <= h; j++) {
        const w = 2.6 * (1 - j / (h + 1));
        for (let x = Math.ceil(dx - w); x <= Math.floor(dx + w); x++) shade(CX + x + ox, 15 - j + ty(x) + oy + hoy, (x - dx) / 3 + dx / 14, -0.25, 7, GOLD);
      }
      for (let x = CX - 10; x <= CX + 10; x++)
        for (let y = 16; y <= 18; y++) shade(x + ox, y + ty(x - CX) + oy + hoy, (x - CX) / 11, y === 16 ? -0.7 : 0.1, 7, GOLD);
      // Hand on her hip.
      disc(CX - 8 + ox, 51 + oy, 3.2, 3, 8, SKIN);
      // The fan and the hand that holds it.
      fan(fanX + ox, fanY + oy, fanAng, fanOpen, 9);
      disc(fanX + ox, fanY + 1 + oy, 3, 2.8, 10, SKIN);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        if (!p) { if (PART[i - 1] || PART[i + 1] || PART[i - W] || PART[i + W]) SPR[i] = LINE; continue; }
        const a = PART[i - 1], b = PART[i + 1], c = PART[i - W], d = PART[i + W];
        if ((a && a < p) || (b && b < p) || (c && c < p) || (d && d < p)) SPR[i] = p >= 8 ? HANDLINE : p === 7 ? GOLD[3] : p === 6 ? VELVET[3] : p === 5 ? SKIN[3] : SEAM;
      }
      // Pearls on the spires, a pink orb on the tallest, gems on the band.
      for (const [dx, h] of SPIRES) {
        const x = CX + dx + ox, y = 15 - h + ty(dx) + oy + hoy;
        if (dx === 0) { for (const [a, b2, c] of [[0, -1, '#ff9ac8'], [-1, 0, '#ff3a8a'], [0, 0, '#ff3a8a'], [1, 0, '#c01a60'], [0, 1, '#c01a60']]) put(SPR, x + a, y + b2, C(c)); put(SPR, x, y - 2, LINE); put(SPR, x - 1, y - 1, LINE); put(SPR, x + 1, y - 1, LINE); put(SPR, x - 2, y, LINE); put(SPR, x + 2, y, LINE); continue; }
        put(SPR, x, y, C('#ffffff')); put(SPR, x, y - 1, LINE); put(SPR, x - 1, y, LINE); put(SPR, x + 1, y, LINE);
        const g = SPIRE_GEMS[SPIRES.findIndex(q => q[0] === dx)]; if (g) put(SPR, x, 14 + ty(dx) + oy + hoy, C(g));
      }
      const gy = 17 + oy + hoy;
      put(SPR, CX + ox, gy - 1, C('#ff9ac8')); put(SPR, CX - 1 + ox, gy, C('#ff3a8a')); put(SPR, CX + ox, gy, C('#ff3a8a')); put(SPR, CX + 1 + ox, gy, C('#c01a60')); put(SPR, CX + ox, gy + 1, C('#c01a60'));
      put(SPR, CX - 5 + ox, gy + ty(-5), C('#6a7ae0')); put(SPR, CX + 5 + ox, gy + ty(5), C('#6a7ae0')); put(SPR, CX - 5 + ox, gy + ty(-5) - 1, C('#b0c0ff')); put(SPR, CX + 5 + ox, gy + ty(5) - 1, C('#b0c0ff'));
      // Pleats down the skirt.
      for (let y = 50; y <= 66; y++) {
        const hw = 5.5 + Math.pow((y - 41) / 26, 1.6) * 9.5;
        for (const k of [-0.6, 0, 0.6]) { const i = (y + oy) * W + Math.round(CX + k * hw) + ox; if (PART[i] === 2 && SPR[i] !== SEAM && SPR[i] !== RIM) SPR[i] = PINK[Math.min(4, PINK.indexOf(SPR[i]) + 1)]; }
      }
      // Bodice: a gold V and a pink jewel at the neckline.
      for (let k = 0; k < 4; k++) { put(SPR, CX - 4 + k + ox, 44 + k + oy, GOLD[2]); put(SPR, CX + 4 - k + ox, 44 + k + oy, GOLD[1]); }
      put(SPR, CX + ox, 44 + oy, C('#ff3a8a'));
      for (let x = CX - 13; x <= CX + 13; x++) if (PART[64 * W + x + ox] === 2 && SPR[64 * W + x + ox] !== SEAM) put(SPR, x + ox, 64 + oy, GOLD[x > CX ? 1 : 2]);
    }

    const EYE = C('#3a0e2a'), PUP = C('#661144'), SHINE = C('#ffffff'), LASH = C('#2e1e2e'), LID = C('#c8889a');
    const BROW = C('#6a2450'), LIP = C('#d8306a'), LIPD = C('#8a1a44'), MOUTH = C('#4a1030'), TEETH = C('#ffffff');
    const BLUSH = C('#ff8aa8'), FLUSH = C('#ff3a4a'), DROP = C('#8ae0ff'), DROPD = C('#3a8ab0'), SPARK = C('#fff4c0'), VEIN = C('#e0203a');

    // Eyes: s = -1 left, +1 right; x0 is the eye's left pixel.
    function eyes(hx, hy, kind) {
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? hx - 5 : hx + 3, y0 = hy;
        if (kind === 'blink' || kind === 'smile') {
          if (kind === 'smile') { put(buf, x0 - 1, y0 + 1, EYE); put(buf, x0, y0, EYE); put(buf, x0 + 1, y0, EYE); put(buf, x0 + 2, y0 + 1, EYE); }
          else for (let x = x0; x < x0 + 2; x++) put(buf, x, y0 + 1, EYE);
          put(buf, s < 0 ? x0 - 2 : x0 + 3, y0 + (kind === 'smile' ? 0 : 1), LASH);
          continue;
        }
        if (kind === 'wide') {                                    // panicked: whites and tiny pupils
          for (let y = y0 - 1; y <= y0 + 2; y++) for (let x = x0 - 1; x <= x0 + 2; x++) put(buf, x, y, (y === y0 - 1 || y === y0 + 2 || x === x0 - 1 || x === x0 + 2) ? EYE : SHINE);
          put(buf, x0 + (s < 0 ? 1 : 0), y0 + 1, PUP);
          continue;
        }
        for (let y = y0; y < y0 + 3; y++) for (let x = x0; x < x0 + 2; x++) put(buf, x, y, y === y0 + 2 ? PUP : EYE);
        put(buf, x0 + (s < 0 ? 0 : 1), y0, SHINE);
        if (kind === 'lidded') { put(buf, x0, y0, LID); put(buf, x0 + 1, y0, LID); put(buf, x0, y0 - 1, LASH); put(buf, x0 + 1, y0 - 1, LASH); put(buf, x0 + (s < 0 ? 0 : 1), y0 + 1, SHINE); }
        if (kind === 'glare') { put(buf, s < 0 ? x0 + 1 : x0, y0, LID); }
        // Lashes flick out at the outer corner.
        put(buf, s < 0 ? x0 - 1 : x0 + 2, y0 - (kind === 'lidded' ? 1 : 0), LASH);
        put(buf, s < 0 ? x0 - 2 : x0 + 3, y0 - 1 - (kind === 'lidded' ? 1 : 0), LASH);
      }
    }
    function brows(hx, hy, kind) {
      const L = hx - 6, R = hx + 3;
      const row = (x, y, n) => { for (let i = 0; i < n; i++) put(buf, x + i, y, BROW); };
      if (kind === 'arched') { row(L, hy - 3, 1); row(L + 1, hy - 4, 2); row(R, hy - 5, 2); row(R + 2, hy - 4, 1); }     // one raised: smug
      else if (kind === 'happy') { row(L, hy - 3, 1); row(L + 1, hy - 4, 2); row(R, hy - 4, 2); row(R + 2, hy - 3, 1); }
      else if (kind === 'angry') { put(buf, L, hy - 4, BROW); put(buf, L + 1, hy - 3, BROW); put(buf, L + 2, hy - 2, BROW); put(buf, R + 2, hy - 4, BROW); put(buf, R + 1, hy - 3, BROW); put(buf, R, hy - 2, BROW); }
      else { put(buf, L, hy - 3, BROW); put(buf, L + 1, hy - 3, BROW); put(buf, L + 2, hy - 4, BROW); put(buf, R, hy - 4, BROW); put(buf, R + 1, hy - 3, BROW); put(buf, R + 2, hy - 3, BROW); }   // worried
    }
    function blush(hx, hy, c, a) {
      for (const bx of [hx - 8, hx + 6]) { blendAt(buf, bx, hy + 4, c, a); blendAt(buf, bx + 1, hy + 4, c, a); blendAt(buf, bx, hy + 5, c, a * 0.5); blendAt(buf, bx + 1, hy + 5, c, a * 0.5); }
    }
    function drop(x, y) {
      put(buf, x, y, DROP); put(buf, x, y + 1, DROP); put(buf, x - 1, y + 1, DROPD); put(buf, x + 1, y + 1, DROP);
      put(buf, x, y + 2, DROPD); put(buf, x - 1, y, LINE); put(buf, x + 1, y, LINE); put(buf, x, y - 1, LINE);
    }

    const DUST = Array.from({ length: 10 }, (_, i) => ({ s: hash(i, 7), k: 1 + (i % 3), w: hash(i, 9), p: hash(i, 8) * TAU }));
    const BEAMC = C('#ffe6a0');

    function frame(t, mood, since) {
      t = ((t % LOOP) + LOOP) % LOOP;
      const u = t / LOOP, age = ((t - since) % LOOP + LOOP) % LOOP;
      buf.set(BG);
      // Rose window: the glass brightens in a slow turn.
      for (let n = 0; n < GLASS.length; n += 2) if (Math.sin(TAU * 3 * u - GLASS[n + 1] * TAU / 12) > 0.8) blend(buf, GLASS[n], C('#fff6d0'), 0.45);
      // Gold glints travel up the columns.
      for (const i of GOLDPIX) if (Math.sin(TAU * 10 * u - (i % W) * 0.5 - ((i / W) | 0) * 0.1) > 0.95) buf[i] = GOLD[0];
      // Candles.
      for (const [sx, sy] of SCONCES) {
        const f = Math.sin(TAU * 43 * u + sx) + 0.5 * Math.sin(TAU * 97 * u + sx * 2);
        glow(buf, sx, sy - 1, 5, C('#ffc060'), 0.3);
        put(buf, sx, sy - 1, C(f > 0 ? '#ffd060' : '#ffa030')); if (f > 0.6) put(buf, sx, sy - 2, C('#fff0b0'));
      }
      // Sunbeam, breathing, with dust drifting down it.
      const ba = 0.16 + 0.06 * Math.sin(TAU * 4 * u);
      for (const i of BEAM) blend(buf, i, BEAMC, ba);
      for (const d of DUST) {
        const v = frac(d.s + d.k * u), y = 6 + v * 70, x = 62 - (y - 4) * 0.55 - 2 - d.w * 9 + Math.sin(TAU * 5 * u + d.p);
        if (Math.sin(TAU * 13 * u + d.p) > 0) put(buf, x, y, C('#fff8d8'));
      }

      // Breathing (every 3 s), the fan (her habit), and each mood's body language.
      const breath = Math.sin(TAU * 20 * u) > 0.35 ? 1 : 0;
      let ox = 0, oy = 0, hoy = breath, tilt = 0;
      let fanAng = -1.05, fanOpen = 1, fx = 45, fy = 45;
      const fanning = frac(4 * u) < 0.6;                                   // she fans in bursts
      fanAng += fanning ? 0.22 * Math.sin(TAU * 90 * u) : 0;
      if (mood === 'delighted') { oy -= Math.round(Math.max(0, Math.sin(TAU * 45 * u)) * 1.5); fx = 43; fy = 41; fanAng = -1.9 + 0.1 * Math.sin(TAU * 120 * u); }
      if (mood === 'outraged') { fanOpen = 0; fanAng = -1.35 + (Math.sin(TAU * 150 * u) > 0 ? 0.12 : -0.12); fx = 46; fy = 44; ox = age < 0.5 && Math.sin(TAU * 600 * u) > 0 ? 1 : 0; }
      if (mood === 'panicked') { fanAng = -1.05 + 0.4 * Math.sin(TAU * 240 * u); tilt = 2; ox = Math.sin(TAU * 900 * u) > 0 ? 1 : 0; }
      body(ox, oy, hoy, tilt, fanAng, fanOpen, fx, fy);
      over(buf, SPR);

      const hx = CX + ox, hy = 27 + oy + hoy;
      put(buf, hx + 5, hy - 7, SHINE); put(buf, hx + 6, hy - 6, SHINE); put(buf, hx + 4, hy - 7, SHINE);
      const blink = mood !== 'delighted' && frac(13 * u + 0.4) < 0.03;
      // Crown gem sparkle.
      const sp = Math.sin(TAU * 7 * u);
      if (sp > 0.85) { const gx = hx + 3, gy = 2 + oy + hoy; put(buf, gx - 1, gy, SPARK); put(buf, gx + 1, gy, SPARK); put(buf, gx, gy - 1, SPARK); put(buf, gx, gy + 1, SPARK); }
      put(buf, hx + 5, hy + 6, C('#4a1030'));                                            // beauty mark
      if (mood === 'smug') {
        eyes(hx, hy, blink ? 'blink' : 'lidded'); brows(hx, hy, 'arched'); blush(hx, hy, BLUSH, 0.45);
        // A lopsided smirk, the right corner up.
        put(buf, hx - 2, hy + 7, LIP); put(buf, hx - 1, hy + 7, LIP); put(buf, hx, hy + 7, LIP); put(buf, hx + 1, hy + 6, LIP); put(buf, hx + 2, hy + 5, LIPD);
        put(buf, hx - 1, hy + 8, LIPD); put(buf, hx, hy + 8, LIPD);
      } else if (mood === 'delighted') {
        eyes(hx, hy, 'smile'); brows(hx, hy, 'happy'); blush(hx, hy, BLUSH, 0.75);
        // "Ho ho ho!" open laugh.
        for (let x = hx - 2; x <= hx + 1; x++) { put(buf, x, hy + 6, LIP); put(buf, x, hy + 7, MOUTH); }
        put(buf, hx - 1, hy + 8, LIP); put(buf, hx, hy + 8, LIP); put(buf, hx - 1, hy + 7, C('#e86a7a'));
        for (let i = 0; i < 3; i++) {                                                   // sparkles
          const s = Math.sin(TAU * (30 + i * 10) * u + i * 2);
          if (s < 0.3) continue;
          const sx = [10, 53, 12][i], sy = [26, 20, 44][i];
          put(buf, sx, sy, SPARK);
          if (s > 0.7) { put(buf, sx - 1, sy, SPARK); put(buf, sx + 1, sy, SPARK); put(buf, sx, sy - 1, SPARK); put(buf, sx, sy + 1, SPARK); }
        }
      } else if (mood === 'outraged') {
        // Face flushes red; brows slam down; a shout.
        for (let y = hy - 9; y <= hy + 9; y++) for (let x = hx - 10; x <= hx + 10; x++) { const i = y * W + x; if (PART[i] === 5 && SPR[i] !== LINE && y > hy - 3) blend(buf, i, FLUSH, 0.18 + (y - hy) * 0.012); }
        eyes(hx, hy, blink ? 'blink' : 'glare'); brows(hx, hy, 'angry'); blush(hx, hy, FLUSH, 0.5);
        for (let x = hx - 2; x <= hx + 2; x++) { put(buf, x, hy + 5, LIP); put(buf, x, hy + 6, x === hx - 2 || x === hx + 2 ? LIP : TEETH); put(buf, x, hy + 7, x === hx - 2 || x === hx + 2 ? LIP : MOUTH); put(buf, x, hy + 8, LIP); }
        if (age > 0.15) {                                                              // an anger mark pops
          const vx = hx - 12, vy = hy - 12 + (age < 0.3 ? 1 : 0);
          for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) put(buf, vx + dx, vy + dy, VEIN);
        }
      } else {
        eyes(hx, hy, blink ? 'blink' : 'wide'); brows(hx, hy, 'worried');
        // A wobbling "oh no" mouth.
        put(buf, hx - 2, hy + 7, LIPD); put(buf, hx - 1, hy + 6, LIPD); put(buf, hx, hy + 7, LIPD); put(buf, hx + 1, hy + 6, LIPD); put(buf, hx + 2, hy + 7, LIPD);
        drop(hx - 12, hy - 3 + Math.round(frac(30 * u) * 5));
        drop(hx + 12, hy - 6 + Math.round(frac(30 * u + 0.5) * 5));
      }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'smug', (state && state.since) || 0);
    };
  },
});
