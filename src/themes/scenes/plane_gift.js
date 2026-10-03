// Pawnie's gift: Grandpa's old biplane on the Pawn Hollow airstrip at golden hour.
//
// 320x200, drawn in code and scaled up with nearest-neighbour. Shown on the world map
// when Pawnie hands you the plane after your first game (WorldMapScreen._planeGift).
// State { gone: true } leaves the strip empty: the map screen's own plane has taken off.
// The low sun on the right warms the plane's wings against the cool shade of the old
// wooden hangar on the left, its doors flung open, a lantern still lit inside. The
// cream-and-red biplane (the same paint as on the map) idles on the mown strip, its
// propeller a blur; bunting runs from the hangar to the windsock, and the village
// windmill turns on the far hill. Every motion runs a whole number of cycles per
// loop, so the loop is seamless.
LiveScenes.register({
  id: 'plane_gift',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, fbm1, blend } = PixelKit;
    const kit = PixelKit.surface(W, H);
    const { put, blendAt, over, glow } = kit;
    let buf = null;

    const SX = 274, SY = 104, SR = 10;     // the sun, low over the far hills
    const HAZE = '#e8a890';

    // ---------- layers ----------
    const SKYB = new Uint32Array(W * H);   // sky and sun
    const BACK = new Uint32Array(W * H);   // hills, windmill tower, meadow, hangar (0 = transparent)
    const FRONT = new Uint32Array(W * H);  // the near grass bank (over the plane's wheels)

    // ---------- sky ----------
    const SKY = ['#1c1c46', '#2c2758', '#46346c', '#6a3e7c', '#94507e', '#c0627a', '#e07e6c', '#f4a062', '#ffc678', '#ffe4a8'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - SX, (y - SY) * 1.3);
      SKYB[y * W + x] = ramp(SKY, y / 128 + 0.3 * Math.exp(-sq(d / 80)) + 0.2 * Math.exp(-sq(d / 22)), x, y);
    }
    for (let y = SY - SR - 2; y <= SY + SR + 2; y++) for (let x = SX - SR - 2; x <= SX + SR + 2; x++) {
      const d = Math.hypot(x - SX, y - SY);
      if (d < SR) put(SKYB, x, y, C(d < SR - 3 ? '#fffbea' : '#fff2c4'));
      else if (d < SR + 1.3) put(SKYB, x, y, C('#ffe2a0'));
    }
    const STARS = [];
    for (let i = 0; i < 26; i++) STARS.push({ x: hash(i, 11) * W | 0, y: (hash(i, 12) ** 1.6 * 34) | 0, k: 10 + (hash(i, 13) * 24 | 0), p: hash(i, 14) * TAU });

    // ---------- far hills, hazed toward the sky ----------
    const far = x => 116 + 10 * fbm1(x / 40, 31) - 6 * Math.exp(-sq((x - 240) / 30));
    const FARC = ['#a0708e', '#8a6488', '#74587e'].map(h => C(mix(h, HAZE, 0.25)));
    for (let x = 0; x < W; x++) {
      const ty = Math.round(far(x));
      for (let y = ty; y < H; y++) BACK[y * W + x] = y === ty ? C(Math.abs(x - SX) < 70 ? '#ffc890' : '#c08ca0') : ramp(FARC, (y - ty) / 22, x, y);
    }
    // Nearer rolling fields, gold on the crests.
    const mid = x => 130 + 5 * fbm1(x / 30, 41) + 3 * Math.sin(x / 23);
    const MIDC = ['#7a8a4a', '#5a7444', '#44603e', '#34503a'].map(C);
    for (let x = 0; x < W; x++) {
      const ty = Math.round(mid(x));
      for (let y = ty; y < H; y++) {
        const lit = y === ty ? C(x > 150 ? '#f4d070' : '#c8b060') : y === ty + 1 && x > 180 ? C('#c0a85a') : 0;
        BACK[y * W + x] = lit || ramp(MIDC, (y - ty) / 18 + (noise1(x / 9, 42) - 0.5) * 0.3, x, y);
      }
    }
    // Hedgerows dividing the fields.
    for (let x = 0; x < W; x++) {
      const y = Math.round(mid(x)) + 4 + Math.round(2 * Math.sin(x / 17));
      if (noise1(x / 6, 43) > 0.35) { put(BACK, x, y, C('#2a4434')); put(BACK, x, y - 1, C(x > 170 ? '#5a7a3a' : '#3a5a3a')); }
    }

    // ---------- the village windmill on the far hill ----------
    const WM = { x: 238, yb: Math.round(far(238)) + 2, hx: 238, hy: 0 };
    WM.hy = WM.yb - 15;
    {
      const T = [C('#5a4048'), C('#8a6460'), C('#c49880')];
      for (let y = WM.hy; y <= WM.yb; y++) {
        const hw = 2 + (y - WM.hy) / 6;
        for (let x = Math.round(WM.x - hw); x <= Math.round(WM.x + hw); x++) put(BACK, x, y, x > WM.x + hw - 1.5 ? T[2] : x > WM.x - 1 ? T[1] : T[0]);
      }
      for (let x = WM.x - 3; x <= WM.x + 3; x++) put(BACK, x, WM.hy - 1, C('#6a2a30'));
      for (let x = WM.x - 2; x <= WM.x + 2; x++) put(BACK, x, WM.hy - 2, C(x > WM.x ? '#a8404a' : '#6a2a30'));
      put(BACK, WM.x, WM.yb - 4, C('#ffd070'));
    }
    const SAIL = C('#f0dcc0'), SAIL2 = C('#c8a890'), SPAR = C('#4a3030');

    // ---------- the meadow and the mown strip ----------
    const GROUND = 140;
    const MEAD = ['#6a8a46', '#4e7440', '#3a5e3c', '#2c4a38', '#1e3630'].map(C);
    const STRIP = [C('#8aa452'), C('#7a9a4c')];
    for (let y = GROUND; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      // A low bank of light from the sun across the meadow.
      const t = (y - GROUND) / 62 + (noise1(x / 11 + y * 0.3, 51) - 0.5) * 0.25 - 0.25 * Math.exp(-sq((x - 260) / 70));
      BACK[i] = ramp(MEAD, t, x, y);
      // The strip: mown in bands, lit on the right.
      if (y >= 150 && y < 170) BACK[i] = ((x + (y >> 2) * 3) >> 4) % 2 ? STRIP[0] : STRIP[1];
      if (y === 150) BACK[i] = C(x > 180 ? '#c8c870' : '#a0b05c');
      if (y === 169) BACK[i] = C('#4e6e3a');
    }
    // White-painted stones along the strip.
    for (let x = 6; x < W; x += 22) {
      for (const [dx, dy, c] of [[0, 0, '#f4ecd8'], [1, 0, '#f4ecd8'], [0, 1, '#a8a49c'], [1, 1, '#c8c0b0'], [2, 1, '#8a8478']]) put(BACK, x + dx, 171 + dy, C(c));
    }
    // Wildflowers in the meadow below.
    for (let i = 0; i < 26; i++) {
      const x = hash(i, 61) * W | 0, y = 176 + (hash(i, 62) * 12 | 0);
      put(BACK, x, y, C(['#f4e0a0', '#f08a8a', '#c8a0f0', '#ffffff'][i % 4]));
    }

    // ---------- the hangar ----------
    const HG = { x0: 6, x1: 104, wall: 84, base: 152, peak: 50, dl: 26, dr: 84, dt: 96 };
    const PLANK = ['#3a2420', '#5a3a2c', '#7a5236', '#9a6a40', '#c08a54'].map(C);
    const ROOF = ['#2a1418', '#4a2024', '#6a2c2a', '#8a3c30', '#b85a3c'].map(C);
    {
      // Walls and gable: vertical planks in shade, lit on the right edge.
      const mx = (HG.x0 + HG.x1) / 2;
      for (let x = HG.x0 + 2; x <= HG.x1 - 2; x++) {
        const gable = HG.wall - (HG.wall - HG.peak - 4) * (1 - Math.abs(x - mx) / (mx - HG.x0));
        for (let y = Math.round(gable); y <= HG.base; y++) {
          const seam = (x - HG.x0) % 6 === 0;
          const k = seam ? 0 : x > HG.x1 - 5 ? 4 : 1 + ((hash(x / 6 | 0, 71) * 2) | 0) + (y > HG.base - 6 ? -1 : 0);
          put(BACK, x, y, PLANK[clamp(k, 0, 4)]);
        }
      }
      // Roof: shingle rows down each slope, an overhang, the ridge catching the sun.
      for (let x = HG.x0 - 4; x <= HG.x1 + 4; x++) {
        const top = HG.peak + Math.abs(x - mx) * (HG.wall - HG.peak) / (mx - HG.x0 + 4);
        for (let y = Math.round(top); y <= Math.round(top) + 5; y++) {
          const row = (y - Math.round(top));
          const k = row === 0 ? (x > mx ? 4 : 3) : row === 5 ? 0 : ((x + row * 3) % 5 === 0 ? 1 : row < 3 && x > mx ? 3 : 2);
          put(BACK, x, y, ROOF[k]);
        }
      }
      // The open doorway: a dark barn with a lit lantern, the workbench and a spare propeller.
      const IN = ['#0e0a14', '#1a1220', '#2a1a22', '#3c2420'].map(C);
      for (let y = HG.dt; y <= HG.base; y++) for (let x = HG.dl; x <= HG.dr; x++) {
        const d = Math.hypot(x - 55, (y - 106) * 1.2) / 40;
        put(BACK, x, y, ramp(IN, 1.1 - d * 1.3 + (y > 140 ? 0.25 : 0), x, y));
      }
      for (let x = HG.dl - 1; x <= HG.dr + 1; x++) { put(BACK, x, HG.dt - 1, PLANK[0]); put(BACK, x, HG.dt - 2, PLANK[3]); }
      // Workbench and tools on the back wall.
      for (let x = 30; x <= 48; x++) { put(BACK, x, 128, C('#6a4428')); put(BACK, x, 129, C('#3a2418')); }
      for (const lx of [31, 47]) for (let y = 130; y <= 140; y++) put(BACK, lx, y, C('#2a1a14'));
      for (const [tx, h] of [[33, 6], [36, 8], [39, 5], [43, 7]]) for (let y = 0; y < h; y++) put(BACK, tx, 112 + y, C(y < 2 ? '#8a8a9a' : '#4a3a34'));
      // The spare propeller hanging on the wall.
      for (let r = -9; r <= 9; r++) { put(BACK, 68 + r, 114 + Math.round(r * 0.15), C('#7a4a2a')); if (Math.abs(r) > 3) put(BACK, 68 + r, 115 + Math.round(r * 0.15), C('#4a2a1a')); }
      put(BACK, 68, 114, C('#c8a048'));
      // The doors, swung open: planks with a Z brace.
      const door = (x0, x1) => {
        for (let x = x0; x <= x1; x++) for (let y = HG.dt; y <= HG.base; y++) put(BACK, x, y, (x - x0) % 4 === 0 ? PLANK[0] : PLANK[x === x1 && x1 > 90 ? 4 : 2]);
        for (let y = 0; y <= HG.base - HG.dt; y++) {
          const t = y / (HG.base - HG.dt);
          for (const yy of [HG.dt + 4, HG.base - 4]) { put(BACK, x0 + 1 + ((x1 - x0 - 2) * (yy === HG.dt + 4 ? 0 : 1)), yy, PLANK[3]); }
          put(BACK, Math.round(x0 + 1 + (x1 - x0 - 2) * t), HG.dt + 4 + Math.round(t * (HG.base - HG.dt - 8)), PLANK[3]);
        }
        for (let x = x0; x <= x1; x++) { put(BACK, x, HG.dt + 4, PLANK[3]); put(BACK, x, HG.base - 4, PLANK[3]); }
      };
      door(HG.x0 + 3, HG.dl - 3);
      door(HG.dr + 3, HG.x1 - 3);
      // The pawn emblem in the gable: a gold disc with a pawn on it.
      const EX = Math.round(mx), EY = 72;
      kit.disc(BACK, EX, EY, 7.5, (dx, dy, d) => C(d > 0.86 ? '#6a4210' : dx + dy < -3 ? '#ffe080' : '#e0a830'));
      const PAWN = ['..##..', '.####.', '..##..', '..##..', '.####.', '######'];
      PAWN.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') put(BACK, EX - 3 + x, EY - 3 + y, C('#3a2210')); }));
      // A rain barrel, the toolbox and an oil drum by the door.
      for (let y = 140; y <= HG.base; y++) for (let x = 90; x <= 99; x++) put(BACK, x, y, (y - 140) % 5 === 0 ? C('#2a2a34') : x > 96 ? C('#8aa0b0') : C('#4a6070'));
      for (let y = 144; y <= HG.base; y++) for (let x = 104; x <= 113; x++) put(BACK, x, y, y === 144 ? C('#ff8070') : x > 110 ? C('#e05040') : C('#a83030'));
      for (let x = 107; x <= 110; x++) put(BACK, x, 142, C('#3a3a44'));
    }
    const LANTERN = { x: 55, y: 104 };
    // The hangar's shadow on the grass.
    for (let y = HG.base + 1; y <= HG.base + 4; y++) for (let x = HG.x0 - 2; x <= HG.x1 + 14 - (y - HG.base) * 2; x++) blend(BACK, y * W + x, C('#14242a'), 0.45);

    // ---------- the windsock pole and the bunting's other end ----------
    const POLE = { x: 300, top: 100, base: 160 };
    for (let y = POLE.top; y <= POLE.base; y++) { put(BACK, POLE.x, y, C('#d8d0c0')); put(BACK, POLE.x + 1, y, C('#7a7468')); }
    put(BACK, POLE.x, POLE.top - 1, C('#ffd070'));

    // ---------- the plane (a sprite, idling on the strip) ----------
    const PW = 96, PH = 50;
    const PL = { w: PW, h: PH, px: new Uint32Array(PW * PH) };
    const sput = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < PW && y < PH) PL.px[y * PW + x] = c; };
    const BODY = ['#3a3848', '#8a8490', '#d8d0c4', '#f4f0e8', '#fffaf0'].map(C);
    const TRIM = ['#4a1418', '#8a2a2c', '#c03a38', '#d94a4a', '#f47a62'].map(C);
    const OUT = C('#1a1420');
    const fill = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = f(x, y); if (c) sput(x, y, c); } };
    // Fuselage: slim at the tail, full behind the cockpit; cel bands top to bottom.
    const half = x => x < 12 ? 0 : x < 52 ? 2 + 5 * Math.sin((x - 12) / 40 * Math.PI / 2) : x < 80 ? 7 - (x - 52) / 28 : 6;
    const CY = 22;
    for (let x = 12; x <= 84; x++) {
      const h = half(x), top = Math.round(CY - h), bot = Math.round(CY + h);
      for (let y = top - 1; y <= bot + 1; y++) {
        let c;
        if (y < top || y > bot) c = OUT;
        else {
          const t = (y - top) / Math.max(1, bot - top);
          c = t < 0.15 ? BODY[4] : t < 0.5 ? BODY[3] : t < 0.8 ? BODY[2] : BODY[1];
          if (Math.abs(y - (CY + 1)) < 1 && x > 18 && x < 78) c = TRIM[3];        // the red pinstripe
          if (Math.abs(y - (CY + 2)) < 1 && x > 18 && x < 78) c = TRIM[1];
        }
        sput(x, y, c);
      }
    }
    // Red cowling and the gold spinner.
    for (let x = 76; x <= 86; x++) {
      const h = x < 84 ? 6 : 6 - (x - 83) * 1.5, top = Math.round(CY - h), bot = Math.round(CY + h);
      for (let y = top - 1; y <= bot + 1; y++) {
        const t = (y - top) / Math.max(1, bot - top);
        sput(x, y, y < top || y > bot ? OUT : t < 0.15 ? TRIM[4] : t < 0.55 ? TRIM[3] : t < 0.85 ? TRIM[2] : TRIM[1]);
      }
      if (x % 3 === 0 && x < 84) for (let y = CY - 4; y <= CY + 3; y += 2) sput(x, y, TRIM[1]);   // cooling louvres
    }
    fill(87, CY - 2, 90, CY + 2, (x, y) => Math.abs(y - CY) > (90 - x) * 0.8 + 0.5 ? 0 : y < CY ? C('#ffe080') : C('#b07a1c'));
    // Tail fin and stabiliser.
    fill(10, 6, 26, CY, (x, y) => {
      const front = 10 + (CY - y) * 0.15, back = 26 - (CY - y) * 0.6;
      if (x < front || x > back || y < 7) return 0;
      if (x < front + 1 || x > back - 1 || y === 7) return OUT;
      return y < 11 ? TRIM[4] : x > back - 3 ? TRIM[2] : TRIM[3];
    });
    fill(6, CY - 1, 24, CY + 2, (x, y) => (y === CY - 1 || y === CY + 2 || x === 6) ? OUT : y === CY ? BODY[4] : BODY[2]);
    // Open cockpit with a leather seat and a little windscreen.
    fill(42, CY - 7, 54, CY - 4, (x, y) => (y === CY - 7 ? OUT : y === CY - 6 ? C('#2a1a18') : x < 46 ? C('#6a3a24') : C('#1e1418')));
    fill(55, CY - 11, 57, CY - 6, (x, y) => (x === 55 ? C('#c8f0ff') : x === 56 ? C('#78a8c8') : OUT));
    // The roundel: red ring, cream ring, gold centre.
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) {
      const d = Math.hypot(x, y);
      if (d <= 5) sput(32 + x, CY - 1 + y, d > 4.2 ? OUT : d > 3 ? TRIM[3] : d > 1.6 ? BODY[4] : C('#e0a830'));
    }
    // Wings: the top one cream, the lower one red, with struts and rigging.
    fill(30, 2, 80, 7, (x, y) => (y === 2 || y === 7 || x === 30 || x === 80) ? OUT : y === 3 ? BODY[4] : y < 6 ? BODY[3] : BODY[1]);
    fill(77, 3, 79, 6, (x, y) => (y < 5 ? TRIM[4] : TRIM[2]));                   // red wingtip
    fill(32, 29, 78, 33, (x, y) => (y === 29 || y === 33 || x === 32 || x === 78) ? OUT : y === 30 ? TRIM[4] : y < 32 ? TRIM[3] : TRIM[1]);
    const strut = (x0, y0, x1, y1) => { const n = 30; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; sput(x, y, OUT); sput(x + 1, y, C('#8a7a6a')); } };
    strut(36, 8, 37, 28); strut(72, 8, 71, 28);                                   // interplane struts
    strut(48, 8, 50, CY - 7); strut(64, 8, 62, CY - 7);                           // cabane struts
    for (let i = 0; i <= 20; i++) { sput(37 + i * 34 / 20, 8 + i, C('#5a5060')); }  // a rigging wire
    // Landing gear: two legs to the wheel, then the tail skid.
    strut(52, CY + 6, 56, 40); strut(66, CY + 6, 59, 40);
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
      const d = Math.hypot(x, y);
      if (d <= 6) sput(58 + x, 42 + y, d > 5.2 ? OUT : d > 3.2 ? (x + y < -2 ? C('#4a4450') : C('#26222c')) : d > 1.5 ? C('#b8b0a8') : C('#ffe080'));
    }
    strut(14, CY + 3, 11, CY + 7);
    // Exhaust stub under the cowling.
    fill(70, CY + 6, 75, CY + 7, (x, y) => (y === CY + 6 ? C('#5a5a64') : C('#2a2a34')));
    // Warm light on the right-facing edges (the sun is ahead of the nose).
    for (let y = 0; y < PH; y++) for (let x = PW - 1; x > 0; x--) {
      const i = y * PW + x, c = PL.px[i];
      if (!c || c === OUT) continue;
      if (!PL.px[i + 1] || PL.px[i + 1] === OUT) { if (c === BODY[3] || c === BODY[2] || c === BODY[4]) PL.px[i] = C('#ffe6b0'); else if (c === TRIM[3] || c === TRIM[2]) PL.px[i] = TRIM[4]; }
      break;
    }
    const PX0 = 112, PY0 = 112;   // where the sprite sits (its wheel touches the strip)
    const NOSE = { x: PX0 + 91, y: PY0 + CY };
    const EXH = { x: PX0 + 70, y: PY0 + CY + 7 };
    // Its shadow on the grass.
    const SHADOW = [];
    for (let y = -3; y <= 3; y++) for (let x = -48; x <= 48; x++) {
      if (sq(x / 48) + sq(y / 3.5) <= 1) SHADOW.push((PY0 + 48 + y) * W + PX0 + 52 + x);
    }
    const SHADC = C('#1a3028');

    // ---------- the near grass bank (in front of everything) ----------
    const bank = x => 188 + 4 * fbm1(x / 20, 81);
    const NEAR = ['#2a4a34', '#1e3a2e', '#142a26', '#0e1e1e'].map(C);
    for (let x = 0; x < W; x++) {
      const ty = Math.round(bank(x));
      for (let y = ty; y < H; y++) FRONT[y * W + x] = y === ty ? C('#4a6e3a') : ramp(NEAR, (y - ty) / 10, x, y);
    }
    const TUFTS = [];
    for (let i = 0; i < 60; i++) {
      const x = hash(i, 91) * W | 0;
      TUFTS.push({ x, y: Math.round(bank(x)), h: 4 + (hash(i, 92) * 7 | 0), p: hash(i, 93) * TAU, c: hash(i, 94) > 0.6 ? C('#6a8a40') : C('#3a5a34') });
    }

    // ---------- clouds ----------
    const CLOUD_COLS = ['#a87a9a', '#d0909a', '#ecaa94', '#f8c89a', '#ffe2b4'];
    const CLOUDS = [
      { s: kit.cloud(60, 16, 101, CLOUD_COLS, '#ffecc0'), y: 26, x0: 0.1, k: 1 },
      { s: kit.cloud(42, 12, 102, CLOUD_COLS, '#ffecc0'), y: 48, x0: 0.55, k: 2 },
      { s: kit.cloud(30, 9, 103, CLOUD_COLS, '#ffecc0'), y: 70, x0: 0.8, k: 2 },
    ];

    // ---------- moving bits ----------
    const SOCK = [C('#e04a3a'), C('#f4ece0')], SOCKD = [C('#8a2a24'), C('#a8a094')];
    const FLAGS = [C('#d94a4a'), C('#f4f0e8'), C('#e0a830'), C('#3a7ac8')];
    const BUNT = { x0: HG.x1 + 2, y0: HG.wall - 2, x1: POLE.x - 1, y1: POLE.top + 2 };
    const BIRD = C('#2a1e30'), MOTE = C('#fff0c0'), GLINT = C('#ffffff'), BLUR = C('#7a6460'), BLADE = C('#5a3420');
    const SMOKE = C('#9aa0b4'), SMOKE2 = C('#c8c4cc'), LAMP = C('#ffd070');
    const MOTES = Array.from({ length: 36 }, (_, i) => ({ x0: hash(i, 21), y0: 60 + hash(i, 22) * 110, ky: 6 + (hash(i, 23) * 8 | 0), p: hash(i, 24) * TAU, k: 1 + (i % 2) }));
    const vig = kit.vignette(C('#140c20'), 0.32, 0.4);

    function frame(t, gone) {
      const u = t / LOOP;
      buf.set(SKYB);
      for (const s of STARS) if (Math.sin(TAU * s.k * u + s.p) > 0.3) put(buf, s.x, s.y, C('#fff6dc'));
      // Clouds drift right to left.
      for (const c of CLOUDS) kit.blit(buf, c.s, frac(c.x0 - c.k * u) * (W + c.s.w + 40) - c.s.w - 20, c.y);
      // Birds crossing the sky.
      for (let b = 0; b < 3; b++) {
        const v = frac(2 * u + b * 0.13);
        const x = W + 10 - v * (W + 40) + b * 9, y = 40 + b * 5 + 4 * Math.sin(TAU * 6 * u + b);
        const up = Math.sin(TAU * 180 * u + b * 2) > 0;
        put(buf, x, y, BIRD); put(buf, x - 1, y + (up ? -1 : 1), BIRD); put(buf, x + 1, y + (up ? -1 : 1), BIRD);
      }
      over(buf, BACK);
      // Windmill sails: twelve quarter turns per loop.
      {
        const a0 = TAU / 4 * 12 * u;
        for (let k = 0; k < 4; k++) {
          const a = a0 + k * Math.PI / 2, dx = Math.cos(a), dy = Math.sin(a), qx = -dy, qy = dx;
          for (let r = 3; r <= 12; r += 0.5) for (let s = 0.5; s <= 2.5; s += 0.5) put(buf, WM.hx + dx * r + qx * s, WM.hy + dy * r + qy * s, s >= 2.5 || r >= 11.5 ? SAIL2 : SAIL);
          for (let r = 0; r <= 12; r += 0.5) put(buf, WM.hx + dx * r, WM.hy + dy * r, SPAR);
        }
        put(buf, WM.hx, WM.hy, C('#3a2228'));
      }
      // The lantern inside the hangar flickers.
      {
        const f = 0.8 + 0.12 * Math.sin(TAU * 43 * u) + 0.08 * Math.sin(TAU * 97 * u + 1);
        glow(buf, LANTERN.x, LANTERN.y + 2, 20, LAMP, 0.22 * f);
        for (let y = HG.dt; y < LANTERN.y - 1; y++) put(buf, LANTERN.x, y, C('#2a1a14'));
        kit.rect(buf, LANTERN.x - 1, LANTERN.y - 1, 3, 1, C('#3a2a20'));
        kit.rect(buf, LANTERN.x - 1, LANTERN.y, 3, 3, f > 0.82 ? C('#fff0b0') : LAMP);
      }
      if (!gone) for (const i of SHADOW) blend(buf, i, SHADC, 0.5);
      // Exhaust puffs drift back from the idling engine.
      if (!gone) for (let i = 0; i < 14; i++) {
        const v = frac(30 * u + i / 14);
        const x = EXH.x - v * 46, y = EXH.y - v * 14 + Math.sin(v * 7 + i) * 1.5, r = 0.8 + v * 3;
        const col = v < 0.35 ? SMOKE : SMOKE2, a = (1 - v) * 0.4;
        for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) if (Math.hypot(xx - x, yy - y) <= r) blendAt(buf, xx, yy, col, a);
      }
      // The plane shakes on its idling engine.
      const shake = Math.sin(TAU * 480 * u) > 0.4 ? 1 : 0;
      if (!gone) kit.blit(buf, PL, PX0, PY0 - shake);
      // Propeller: a pale blur with a blade flicking through it.
      if (!gone) {
        const nx = NOSE.x, ny = NOSE.y - shake;
        for (let y = -14; y <= 14; y++) {
          const e = 1 - sq(y / 14.5);
          const hw = Math.round(2.5 * Math.sqrt(e));
          for (let dx = -hw; dx <= hw; dx++) blendAt(buf, nx + dx, ny + y, BLUR, (0.62 - Math.abs(dx) * 0.1) * (0.45 + 0.55 * e));
          if (Math.abs(y) === 13) blendAt(buf, nx, ny + y, C('#ffe080'), 0.6);
        }
        const a = TAU * 1500 * u, ext = Math.round(14 * Math.cos(a));
        for (let y = Math.min(0, ext); y <= Math.max(0, ext); y++) put(buf, nx, ny + y, BLADE);
        for (let y = Math.min(0, -ext); y <= Math.max(0, -ext); y++) put(buf, nx, ny + y, BLADE);
        if (Math.abs(ext) > 10) { put(buf, nx, ny + ext, C('#ffe080')); put(buf, nx, ny - ext, C('#ffe080')); }
      }
      // A glint runs along the top wing now and then.
      if (!gone) {
        const v = frac(8 * u);
        if (v < 0.18) {
          const gx = Math.round(PX0 + 32 + v / 0.18 * 46), dip = y0 => y0 + - shake;
          for (let d = -2; d <= 2; d++) blendAt(buf, gx + d, dip(PY0 + 3), GLINT, 0.9 - Math.abs(d) * 0.3);
          if (v > 0.06 && v < 0.12) { put(buf, gx, dip(PY0 + 1), GLINT); put(buf, gx, dip(PY0 + 5), GLINT); }
        }
      }
      // Bunting from the hangar to the windsock pole, swaying.
      {
        const n = Math.round((BUNT.x1 - BUNT.x0) / 9);
        for (let s = 0; s <= 120; s++) {
          const q = s / 120, sway = Math.sin(Math.PI * q) * (1.5 * Math.sin(TAU * 20 * u));
          put(buf, BUNT.x0 + (BUNT.x1 - BUNT.x0) * q, BUNT.y0 + (BUNT.y1 - BUNT.y0) * q + Math.sin(Math.PI * q) * 8 + sway, C('#3a2a2a'));
        }
        for (let f = 1; f < n; f++) {
          const q = f / n, x = BUNT.x0 + (BUNT.x1 - BUNT.x0) * q;
          const y = BUNT.y0 + (BUNT.y1 - BUNT.y0) * q + Math.sin(Math.PI * q) * 8 + Math.sin(Math.PI * q) * (1.5 * Math.sin(TAU * 20 * u));
          const lean = Math.round(1.5 * Math.sin(TAU * 30 * u + f * 0.9));
          const col = FLAGS[f % 4];
          for (let j = 1; j <= 5; j++) {
            const w = Math.max(0, Math.round((5 - j) / 2));
            for (let i = -w; i <= w; i++) put(buf, x + i + Math.round(lean * j / 5), y + j, col);
          }
        }
      }
      // The windsock flaps in the evening breeze, blowing toward the hangar.
      for (let s = 0; s <= 20; s++) {
        const q = s / 20, x = POLE.x - 1 - s, wav = Math.sin(TAU * 40 * u - s * 0.5) * 1.5 * q + q * 2;
        const half2 = 3 - q * 1.6;
        const band = (s >> 2) % 2;
        for (let y = -half2; y <= half2; y += 0.5) put(buf, x, POLE.top + 3 + y + wav, y > half2 - 1 ? SOCKD[band] : SOCK[band]);
      }
      over(buf, FRONT);
      // Grass tufts in the near bank, swaying.
      for (const tf of TUFTS) {
        const sway = Math.sin(TAU * 24 * u + tf.p) * 1.2;
        for (let j = 0; j < tf.h; j++) put(buf, tf.x + sway * j / tf.h, tf.y - j, tf.c);
      }
      // Dust motes in the low sun.
      for (const m of MOTES) {
        const x = frac(m.x0 - m.k * u) * (W + 20) - 10, y = m.y0 + 4 * Math.sin(TAU * m.ky * u + m.p);
        blendAt(buf, x, y, MOTE, 0.35 + 0.35 * clamp((x - 140) / 140));
      }
      vig(buf);
    }

    return (t, out, state) => { buf = out; frame(t, !!(state && state.gone)); };
  },
});
