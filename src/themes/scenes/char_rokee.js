// Rook-E, the Iron Tower: a live character portrait.
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the game HUD and dialogue bubbles. A riveted steel rook with a
// crenellated turret for a helmet, eyes glowing through the visor slit, arms crossed
// over a red Iron Keep tabard. Lit by the forge on the left, rimmed by the moon on the
// right, in front of the Keep's curtain wall at night.
// Habit: a glint runs across the turret now and then; forge sparks drift past.
// Moods: stern (default), satisfied, alert, intense, strained.
LiveScenes.register({
  id: 'char_rokee',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['stern', 'satisfied', 'alert', 'intense', 'strained'],
  frames: { face: [11, 6, 40, 40] },
  moodFor(category) {
    return {
      gameStart: 'stern',
      bossCapture: 'satisfied', bossCaptureBig: 'satisfied', playerLowHealth: 'satisfied', milestone: 'satisfied',
      bossCheck: 'intense', bossTaunt: 'intense',
      playerCapture: 'alert', playerCheck: 'alert',
      playerCaptureBig: 'strained', lowHealth: 'strained',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, clamp, sq, frac, bay, ramp, hash } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over, glow } = K;
    let buf = null;

    // ---------- backdrop: the Iron Keep at night, forge-lit from the left ----------
    const BG = new Uint32Array(W * H);
    const MX = 50, MY = 11;
    const SKY = ['#06070f', '#0a0e1e', '#10182e', '#18243e', '#223250', '#2e4262', '#3e5474'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - CX, (y - 28) * 1.1), dm = Math.hypot(x - MX, y - MY);
      BG[y * W + x] = ramp(SKY, y / 72 + 0.42 * Math.exp(-sq(d / 16)) + 0.18 * Math.exp(-sq(dm / 9)), x, y);
    }
    const IRON = ['#8a9ab4', '#5e6c86', '#46526a', '#323a4e', '#20263a'].map(C);
    const RIVET = C('#a8b8d0'), RIVETD = C('#141824');
    const forgeLight = (x, y) => 0.45 * Math.exp(-sq(x / 26) - sq((y - 70) / 26));
    // Riveted plating: lit top-left edges, dark bottom-right edges, rivets at the corners.
    function plate(x0, y0, w, h, pw, ph, light) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
        const lx = (x - x0) % pw, ly = (y - y0) % ph;
        let t = 0.55 - light(x, y);
        if (lx === 0 || ly === 0) t -= 0.25;
        if (lx === pw - 1 || ly === ph - 1) t += 0.3;
        let c = IRON[Math.round(clamp(t + 0.12) * (IRON.length - 1))];
        if (lx === 2 && ly === 2) c = RIVET;
        else if (lx === 3 && ly === 3) c = RIVETD;
        put(BG, x, y, c);
      }
    }
    // A tower on the right with a lit window, then the curtain wall with its crenels.
    plate(51, 22, 11, 30, 11, 10, () => -0.05);
    for (let x = 50; x < W; x += 6) plate(x, 17, 4, 5, 4, 5, () => 0);
    const WIN = { x: 55, y: 30 };
    const WALL = 50;
    plate(0, WALL, W, 22, 12, 11, (x, y) => forgeLight(x, y) - (y - WALL) / 70);
    for (let x = -2; x < W; x += 10) plate(x, WALL - 5, 6, 5, 6, 5, (x2, y2) => forgeLight(x2, y2) * 0.6);
    // Cobbles, warm near the forge, dark at the front.
    const COB = ['#5a6078', '#444a60', '#30364a', '#20243a', '#141828'].map(C);
    for (let y = 72; y < H; y++) {
      const row = y < 75 ? 0 : y < 79 ? 1 : 2, rh = [3, 4, 5][row], ry = [72, 75, 79][row], sw = rh * 2 + 1, off = (row % 2) * rh;
      for (let x = 0; x < W; x++) {
        const lx = (x + off) % sw, ly = y - ry, edge = lx === 0 || ly === rh - 1;
        const tt = 0.35 + (y - 72) / 14 + (hash(Math.floor((x + off) / sw), row) - 0.5) * 0.3 - forgeLight(x, y) * 1.2 - (ly === 0 ? 0.2 : 0);
        BG[y * W + x] = edge ? COB[4] : ramp(COB, tt, x, y);
      }
    }
    // A torch on a post, left of the figure.
    const TORCH = { x: 7, y: 42 };
    for (let y = TORCH.y; y < 74; y++) { put(BG, TORCH.x - 1, y, C('#3a2a26')); put(BG, TORCH.x, y, C('#2a1e1e')); }
    for (let x = TORCH.x - 2; x <= TORCH.x + 1; x++) { put(BG, x, TORCH.y, C('#5a4a48')); put(BG, x, TORCH.y + 1, C('#3a2e2c')); }

    K.vignette(C('#04050a'), 0.4, 0.45)(BG);           // edges darker (static)
    K.disc(BG, MX, MY, 4.5, (dx, dy, d) => C(d > 0.85 ? '#b8c4dc' : Math.hypot(dx + 1, dy - 1) < 1.5 ? '#d4dcee' : '#eef2fa'));

    // ---------- Rook-E ----------
    const MAT = {
      steel: { tones: ['#dce4ee', '#b0bccc', '#8a9ab0', '#6a7892', '#4e5a76', '#363e58', '#262a40'].map(C) },
      cloth: { tones: ['#ff7a5a', '#e04a40', '#b02c36', '#861e30', '#5a1428', '#3a1022'].map(C) },
      gold: { tones: ['#fff0b0', '#f0c050', '#c08a38', '#8a5a2a', '#5a3622'].map(C) },
    };
    const WARM = C('#ffb070'), WARMR = C('#ff9050'), MOONR = C('#c0d4f4');
    const LINE = C('#221a2a');
    const SEAM = [0, C('#3c4460'), C('#3c4460'), C('#3a1022'), C('#58647e'), C('#3c4460'), C('#1e2030'), C('#1e2030'), C('#1e2030'), C('#1e2030')];
    const LN = Math.hypot(0.8, 0.35, 0.5), LX = -0.8 / LN, LY = -0.35 / LN, LZ = 0.5 / LN;
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H);

    // Warm forge key light from the left, cold moon rim on the right.
    function shade(x, y, nx, ny, part, m, dark = 0) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * LX + ny * LY + nz * LZ, i = y * W + x, T = m.tones;
      const k = Math.min(T.length - 1, Math.round(clamp(1 - (l * 0.62 + 0.42)) * (T.length - 1)) + dark);
      SPR[i] = nx > 0.8 && l < 0.2 ? MOONR : nx < -0.86 && l > 0.55 && dark === 0 ? (m === MAT.cloth ? WARMR : WARM) : T[k];
      PART[i] = part;
    }
    function disc(cx, cy, rx, ry, part, m) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.95, ny * 0.95, part, m);
      }
    }
    // A capsule (an arm) from a to b of radius r, shaded as a cylinder.
    function capsule(ax, ay, bx, by, r, part, m, dark = 0) {
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      for (let y = Math.floor(Math.min(ay, by) - r); y <= Math.max(ay, by) + r; y++)
        for (let x = Math.floor(Math.min(ax, bx) - r); x <= Math.max(ax, bx) + r; x++) {
          const s = clamp(((x - ax) * dx + (y - ay) * dy) / L2), px = ax + dx * s, py = ay + dy * s;
          const nx = (x - px) / r, ny = (y - py) / r;
          if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.9, ny * 0.9, part, m, dark);
        }
    }
    const sput = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) SPR[y * W + x] = c; };

    const HX = CX, HY = 25;                                 // visor slit row (head centre)
    function body(oy, headDY) {
      SPR.fill(0); PART.fill(0);
      const S = MAT.steel;
      // Base plinth.
      for (let y = 67; y <= 74; y++) {
        const top = y - 67, hw = 15 - (top < 2 ? 2 - top : 0) - (y === 74 ? 1 : 0);
        for (let x = CX - hw; x <= CX + hw; x++) shade(x, y + oy, (x - CX) / 16, y < 69 ? -0.6 : 0.1, 1, S, y === 70 ? 1 : 0);
      }
      // The tower body: a straight riveted column, flaring a little at the foot.
      for (let y = 44; y <= 67; y++) {
        const hw = 10.5 + Math.pow((y - 44) / 23, 2.5) * 4;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) shade(x, y + oy, (x - CX) / (hw + 0.5), 0.1, 2, S, (y - 44) % 7 === 6 ? 1 : 0);
      }
      // Red tabard with a gold edge and a notched hem.
      for (let y = 45; y <= 65; y++) {
        const hw = 6 + (y - 45) * 0.06;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) {
          const dx = Math.abs(x - CX);
          if (y > 61 && dx < y - 61) continue;
          const edge = dx >= Math.round(hw) - 0.5 || (y > 60 && dx === y - 61);
          shade(x, y + oy, (x - CX) / 11, 0.1, 3, edge ? MAT.gold : MAT.cloth);
        }
      }
      // A little gold rook on the tabard, below the crossed arms.
      for (const [dx, dy] of [[-2, 0], [0, 0], [2, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-1, 2], [0, 2], [1, 2], [-1, 3], [0, 3], [1, 3], [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4]])
        sput(CX + dx, 55 + dy + oy, dx < 0 ? MAT.gold.tones[1] : MAT.gold.tones[2]);
      const ho = oy + headDY;
      // Gorget ring under the turret.
      disc(CX, 42 + oy, 12, 2.6, 4, S);
      // The turret helmet: crenellated crown, a step, then the straight tower.
      for (let y = 8; y <= 39; y++) {
        let hw, ny = 0, dark = 0;
        if (y <= 12) hw = 13;
        else if (y <= 16) { hw = 13; ny = y === 13 ? -0.75 : 0; dark = y === 16 ? 1 : 0; }
        else hw = y >= 38 ? 11 : 11.5;
        if (y === 17) dark = 2;                            // shadow under the crown
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) {
          const dx = x - CX;
          if (y <= 12 && !((dx >= -13 && dx <= -8) || (dx >= -3 && dx <= 3) || (dx >= 8 && dx <= 13))) continue;
          shade(x, y + ho, dx / (hw + 0.5), y === 8 ? -0.8 : ny, 5, S, dark);
        }
      }
      // Rivets around the turret.
      for (const [dx, y] of [[-9, 20], [-3, 20], [3, 20], [9, 20], [-9, 35], [9, 35]]) { sput(CX + dx, y + ho, S.tones[0]); sput(CX + dx + 1, y + 1 + ho, S.tones[5]); }
      // Pauldrons, then arms crossed over the chest (back arm, then front arm).
      capsule(CX - 14, 46 + oy, CX - 14, 54 + oy, 3.2, 6, S, 1);   // upper arms
      capsule(CX + 14, 46 + oy, CX + 14, 54 + oy, 3.2, 6, S, 1);
      disc(CX - 13, 44.5 + oy, 5.5, 4, 7, S);                     // pauldrons
      disc(CX + 13, 44.5 + oy, 5.5, 4, 7, S);
      // Forearms crossed on the diagonal, each fist tucked by the other arm.
      capsule(CX + 13, 55 + oy, CX - 7, 50 + oy, 2.8, 8, S, 1);
      disc(CX - 9, 49.5 + oy, 3, 2.8, 8, S);
      capsule(CX - 13, 55 + oy, CX + 7, 50 + oy, 2.8, 9, S, 1);
      disc(CX + 9, 49.5 + oy, 3, 2.8, 9, S);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        const a = PART[i - 1], b = PART[i + 1], c = PART[i - W], d = PART[i + W];
        if (!p) { if (a || b || c || d) SPR[i] = LINE; }
        else if ((a && a < p) || (b && b < p) || (c && c < p) || (d && d < p)) SPR[i] = SEAM[p];
      }
      // Gauntlet cuffs: a dark line across each forearm.
      for (const dx of [-1, 1]) { sput(CX + 9 + dx, 48 + oy, SEAM[9]); sput(CX - 9 + dx, 48 + oy, SEAM[8]); }   // knuckles
    }

    const SLIT = C('#0a0c16'), BLUE = C('#5ae0ff'), CORE = C('#e8ffff'), DIM = C('#2a7a98');
    const RED = C('#ff6a3a'), REDC = C('#ffe0a0'), SPARK = C('#ffd070'), SPARK2 = C('#ff8a30');
    let hx = HX, hy = HY;

    function slit(rows) {
      for (let y = hy - rows + 3; y <= hy + 2; y++) {
        const end = (y === hy - rows + 3 || y === hy + 2) ? 7 : 8;
        for (let x = hx - end; x <= hx + end; x++) put(buf, x, y, SLIT);
      }
      for (let x = hx - 7; x <= hx + 7; x++) put(buf, x, hy + 3, MAT.steel.tones[1]);   // lit lower lip
    }
    function eye(x, y, c, a = 0.35) {
      put(buf, x, y, c);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (buf[(y + dy) * W + x + dx] === SLIT) blendAt(buf, x + dx, y + dy, c, a);
    }
    function eyes(kind, flick) {
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? hx - 5 : hx + 3;               // eye spans x0..x0+2
        if (kind === 'stern') { eye(x0, hy + 1, BLUE); eye(x0 + 1, hy + 1, CORE); eye(x0 + 2, hy + 1, BLUE); }
        else if (kind === 'blink') { put(buf, x0 + 1, hy + 1, DIM); }
        else if (kind === 'content') { eye(x0, hy + 2, CORE, 0.5); eye(x0 + 1, hy + 1, CORE, 0.5); eye(x0 + 2, hy + 2, CORE, 0.5); }
        else if (kind === 'wide') {
          for (let y = hy; y <= hy + 2; y++) for (let x = x0; x <= x0 + 2; x++) eye(x, y, (x === x0 + 1 && y === hy + 1) ? CORE : BLUE, 0.3);
          put(buf, x0 + 1, hy - 1, BLUE);
        } else if (kind === 'angry') {                     // inner ends pressed down
          const inner = s < 0 ? x0 + 2 : x0, outer = s < 0 ? x0 : x0 + 2;
          eye(outer, hy + 1, RED, 0.45); eye(x0 + 1, hy + 1, REDC, 0.45); eye(inner, hy + 2, RED, 0.45);
          put(buf, inner, hy, MAT.steel.tones[3]); put(buf, inner, hy + 1, MAT.steel.tones[4]); put(buf, x0 + 1, hy, MAT.steel.tones[4]);
        } else if (kind === 'strain') {                    // dim and askew
          const c = flick ? DIM : BLUE;
          if (s < 0) { eye(x0, hy + 1, c); eye(x0 + 1, hy + 1, flick ? DIM : CORE); eye(x0 + 2, hy + 1, c); }
          else { eye(x0, hy + 2, c); eye(x0 + 1, hy + 2, c); }
        }
      }
    }
    const DROP = C('#8ae0ff'), DROPD = C('#3a8ab0');
    function drop(x, y) {
      put(buf, x, y, DROP); put(buf, x, y + 1, DROP); put(buf, x - 1, y + 1, DROPD); put(buf, x + 1, y + 1, DROP);
      put(buf, x, y + 2, DROPD); put(buf, x - 1, y, LINE); put(buf, x + 1, y, LINE); put(buf, x, y - 1, LINE);
    }
    function grille() {
      for (const dx of [-3, -1, 1, 3]) for (let y = hy + 6; y <= hy + 8; y++) put(buf, hx + dx, y, y === hy + 6 ? MAT.steel.tones[6] : SLIT);
    }
    const STARS = Array.from({ length: 14 }, (_, i) => ({ x: hash(i, 1) * W | 0, y: hash(i, 2) * 30 | 0, k: 7 + (i % 11), p: hash(i, 3) * TAU }));
    const EMBERS = Array.from({ length: 12 }, (_, i) => ({ x: hash(i, 4) * 26, k: 3 + (i % 4), p: hash(i, 5), dr: hash(i, 6) * TAU }));

    function frame(t, mood, since) {
      const u = t / LOOP, age = ((t - since) % LOOP + LOOP) % LOOP;
      buf.set(BG);
      for (const s of STARS) {
        const v = Math.sin(TAU * s.k * u + s.p);
        if (v > 0.2 && !(s.x > 49 && s.y > 16)) put(buf, s.x, s.y, C(v > 0.85 ? '#ffffff' : '#7a8ac0'));
      }
      // The forge breathes warm light over the lower left, the torch flickers.
      const fb = 0.8 + 0.12 * Math.sin(TAU * 17 * u) + 0.08 * Math.sin(TAU * 71 * u);
      glow(buf, 0, 72, 34, C('#ff8a3a'), 0.3 * fb);
      const tf = 0.8 + 0.2 * Math.sin(TAU * 61 * u) * Math.sin(TAU * 19 * u);
      glow(buf, TORCH.x, TORCH.y - 3, 14, C('#ff9a40'), 0.35 * tf);
      K.flame(buf, TORCH.x - 2, TORCH.y - 1, 4, 6, u, 1.3);
      // The tower window flickers.
      {
        const f = 0.5 + 0.3 * Math.sin(TAU * 29 * u) + 0.2 * Math.sin(TAU * 73 * u);
        for (let y = WIN.y; y < WIN.y + 6; y++) for (let x = WIN.x; x < WIN.x + 3; x++) put(buf, x, y, C(x === WIN.x + 1 || y === WIN.y + 2 ? '#2a1e20' : f > 0.7 ? '#ffd080' : f > 0.35 ? '#ffa850' : '#d86a30'));
      }
      // A red banner on the wall, rippling in the night wind.
      for (let j = 0; j < 17; j++) for (let i = 0; i < 6; i++) {
        const wave = Math.round(Math.sin(TAU * 15 * u - j * 0.4) * (j / 17) * 1.5);
        if (j > 13 && Math.abs(i - 2.5) < j - 13) continue;
        const c = i === 0 || i === 5 ? '#e8b040' : (wave > 0 ? '#a82a34' : '#7a1e2e');
        put(buf, 50 + i + wave, 51 + j, C(j === 6 && i > 1 && i < 4 ? '#e8b040' : c));
      }
      // Embers drifting up from the forge.
      for (const e of EMBERS) {
        const v = frac(e.k * u + e.p), x = e.x + v * 16 + Math.sin(v * 7 + e.dr) * 2, y = 78 - v * 64;
        if (v < 0.85) put(buf, x, y, v < 0.3 ? SPARK : v < 0.6 ? SPARK2 : C('#a83a20'));
      }

      // ----- the figure -----
      const breath = Math.sin(TAU * 20 * u) > 0.35 ? 1 : 0;
      let oy = breath, headDY = 0;
      if (mood === 'satisfied') headDY = age > 0.2 && age < 0.9 ? 1 : 0;                      // a slow nod
      if (mood === 'alert') oy -= age < 0.3 ? Math.round(2 * Math.sin(Math.PI * age / 0.3)) : 0; // a jolt
      if (mood === 'strained') headDY = 1 + (frac(6 * u) < 0.05 && Math.sin(TAU * 600 * u) > 0 ? 1 : 0);
      body(oy, headDY);
      over(buf, SPR);

      hx = HX; hy = HY + oy + headDY;
      // The habit: a glint runs across the turret every 7.5 s.
      const gv = frac(8 * u + 0.1);
      if (gv < 0.1) {
        const gx = CX - 16 + gv / 0.1 * 34;
        for (let y = 8; y < 40; y++) for (let w = 0; w < 2; w++) {
          const x = Math.round(gx + w - (y - 8) * 0.4), i = (y + oy + headDY) * W + x;
          if (x >= 0 && x < W && PART[i] === 5 && SPR[i] !== LINE) blendAt(buf, x, y + oy + headDY, C('#ffffff'), w ? 0.45 : 0.75);
        }
      }
      const blink = frac(10 * u + 0.6) < 0.025;
      if (mood === 'alert') slit(4); else slit(3);
      grille();
      if (mood === 'stern') eyes(blink ? 'blink' : 'stern');
      else if (mood === 'satisfied') {
        eyes('content');
        const g = Math.sin(TAU * 12 * u);                  // the visor gleams, pleased
        if (g > 0.5) { put(buf, hx - 11, hy - 5, C('#ffffff')); if (g > 0.85) { put(buf, hx - 12, hy - 5, C('#ffffff')); put(buf, hx - 10, hy - 5, C('#ffffff')); put(buf, hx - 11, hy - 6, C('#ffffff')); put(buf, hx - 11, hy - 4, C('#ffffff')); } }
      } else if (mood === 'alert') eyes(blink ? 'blink' : 'wide');
      else if (mood === 'intense') {
        eyes('angry');
        // Heat haze of the eyes on the visor.
        const p = 0.25 + 0.15 * Math.sin(TAU * 30 * u);
        for (let x = hx - 8; x <= hx + 8; x++) blendAt(buf, x, hy - 1, RED, p * 0.5);
      } else {
        eyes('strain', Math.sin(TAU * 45 * u) * Math.sin(TAU * 13 * u) > 0.4);
        // A crack in the turret, spitting sparks.
        for (const [dx, dy] of [[7, -13], [8, -12], [8, -11], [9, -10], [8, -9], [9, -8], [10, -7], [10, -6]]) { put(buf, hx + dx, hy + dy, SLIT); put(buf, hx + dx - 1, hy + dy + 1, MAT.steel.tones[1]); }
        const dv = frac(15 * u);
        if (dv < 0.7) drop(hx - 8, hy - 9 + Math.round(dv * 6));
        for (let k = 0; k < 3; k++) {
          const v = frac(12 * u + k / 3);
          if (v > 0.5) continue;
          const x = hx + 11 + v * 10 + k, y = hy - 9 + v * v * 40;
          put(buf, x, y, v < 0.2 ? SPARK : SPARK2);
        }
      }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'stern', (state && state.since) || 0);
    };
  },
});
