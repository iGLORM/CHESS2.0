// The Training Camp from above: the local map of World 2.
//
// 320x200, shown at 4x when the world map zooms into the Training Camp. A mountainside
// of stone terraces at dusk, seen from the air: cold violet rock and snow, dark pines,
// cherry trees in bloom, and warm lanterns along the stone stairs that climb from the
// valley mist to the dojo. Five stations, one per hologram trainer: Sergeant Square's
// drill yard (ten small puzzle boards), Captain Capture's endgame ring (three pieces
// against a lone king), Joy Stick's arcade hall (eighteen lamps, one per mini-game),
// the Rulekeeper's misty hall of rules (a "?" over the door), and Sensei Tactic's dojo,
// where the old golden king himself stands on his projector pad.
// Moves: holograms flicker, scan and glitch, Sensei breathes and strokes his beard, the
// waterfall pours and foams, the stream glints, lanterns flicker, mist drifts through
// the valley and round the hall of rules, the arcade lamps chase, prayer flags flutter,
// petals drift, stars twinkle above the ridge, the dojo smokes, fireflies blink.
// State (LiveScenes.setState('map_trainingcamp', { map: { cleared, beaten } })): each
// cleared station plants a pennant and its trainer glows steady; when Sensei is beaten
// he opens his eyes and nods, and the dojo lanterns burn brighter.
LiveScenes.register({
  id: 'map_trainingcamp',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  stops: [[48, 136], [122, 128], [212, 138], [262, 94], [176, 78]],
  create() {
    const W = 320, H = 200, N = W * H, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise2, noiseLoop, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, glow } = K;
    const STOPS = LiveScenes.get('map_trainingcamp').stops;
    let buf = null;

    const BACK = new Uint32Array(N), OBJ = new Uint8Array(N), OH = new Float32Array(N), CANOPY = new Uint8Array(N);
    const FREE = new Uint8Array(N), MASK = new Uint8Array(N), MASKC = new Uint32Array(N);
    const P = (...h) => h.map(C);
    // Dusk: the last light low in the west, cold sky light from above.
    const LX = -0.8, LY = -0.5, SHX = 0.9, SHY = 0.3;

    // ---------- helpers ----------
    function spline(Pts, step = 0.35) {
      const out = [];
      for (let i = 0; i < Pts.length - 1; i++) {
        const p0 = Pts[Math.max(0, i - 1)], p1 = Pts[i], p2 = Pts[i + 1], p3 = Pts[Math.min(Pts.length - 1, i + 2)];
        const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
        for (let k = 0; k < n; k++) {
          const t = k / n, t2 = t * t, t3 = t2 * t;
          const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
          out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        }
      }
      out.push(Pts[Pts.length - 1]);
      return out;
    }
    function distField(S, R) {
      const D = new Float32Array(N).fill(99), A = new Float32Array(N);
      let len = 0;
      for (let k = 0; k < S.length; k++) {
        if (k) len += Math.hypot(S[k][0] - S[k - 1][0], S[k][1] - S[k - 1][1]);
        const [sx, sy] = S[k];
        for (let y = Math.floor(sy - R); y <= sy + R; y++) for (let x = Math.floor(sx - R); x <= sx + R; x++) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const d = Math.hypot(x - sx, y - sy), i = y * W + x;
          if (d < D[i]) { D[i] = d; A[i] = len; }
        }
      }
      return { D, A, len };
    }
    function op(x, y, c, h) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = y * W + x;
      BACK[i] = c; OBJ[i] = 1; OH[i] = Math.max(0, h);
    }
    const DRAW = [];
    const add = (by, fn) => DRAW.push({ by, fn });

    // ---------- the mountain: terraces stepping up to the north ----------
    const TR = 6, FACE = 9;                                   // terrace levels, face height per level
    const FLAT = [...STOPS, [130, 60], [100, 64]];            // the stations (and the dojo yard) sit on level ground
    const hAt = (x, y) => {
      let h = (214 - y) / 214 * 1.02 + 0.13 * noise2(x / 64, y / 40, 3) + 0.035 * noise2(x / 22, y / 16, 4);
      for (const [sx, sy] of FLAT) {
        const w = Math.exp(-sq((x - sx) / 26) - sq((y - sy) / 15));
        const hs = Math.floor(((214 - sy) / 214 * 1.02 + 0.13 * noise2(sx / 64, sy / 40, 3)) * TR + 0.5) / TR + 0.5 / TR;
        h = h * (1 - w) + hs * w;
      }
      return h;
    };
    const LV = new Int8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) LV[y * W + x] = clamp(Math.floor(hAt(x, y) * TR), 0, TR + 2);
    // Faces: where a terrace steps down toward the viewer, its rock face hangs in front.
    const FD = new Int8Array(N).fill(-1), FL = new Int8Array(N), FH = new Int8Array(N);
    for (let x = 0; x < W; x++) {
      let rem = 0, top = 0, tot = 0;
      for (let y = 1; y < H; y++) {
        const i = y * W + x, l = LV[i], up = LV[i - W];
        if (up > l) { top = up; tot = FACE * (up - l); rem = tot; }
        if (rem > 0) { FD[i] = tot - rem; FH[i] = tot; FL[i] = top; rem--; }
      }
    }
    // Colours: moss on the low terraces, frost higher, snow at the top; violet rock faces.
    const MOSS = P('#1c2a3c', '#263c4c', '#32505a', '#426866', '#56806e', '#739a78', '#9cb48a');
    const FROST = P('#343658', '#44486e', '#585e86', '#747aa4', '#969cc4', '#bcc0de', '#e4e4f6');
    const ROCK = P('#141228', '#1e1a36', '#2a2446', '#3a3258', '#52466c', '#6e5a80');
    const warmW = x => clamp(1 - x / 200);                  // the last warm light, from the west
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, n = (noise2(x / 6, y / 5, 7) - 0.5) * 0.2;
      let c;
      if (FD[i] >= 0) {
        const f = FD[i] / FH[i];
        let t = 0.75 - f * 0.65 + n + (hash(x, 3) > 0.7 ? -0.12 : 0) + ((x + (FD[i] >> 1)) % 7 === 0 ? -0.15 : 0);
        if (FD[i] === 0) c = FL[i] >= 7 ? C('#e8e4f8') : warmW(x) > 0.35 + bay(x, y) * 0.3 ? C('#f2b49a') : C('#9a94c8');   // lit lip
        else c = ramp(ROCK, t, x, y);
      } else {
        const l = LV[i], snow = clamp((l - 3.6) / 1.6);
        const lip = y + 1 < H && FD[i + W] === 0;           // the terrace edge, just above the drop
        const dLip = FD[Math.min(N - 1, i + 2 * W)] >= 0 ? 1 : 0;   // a lighter strip along the edge
        let t = 0.48 + n * 0.7 + warmW(x) * 0.12 - clamp((y - 150) / 50) * 0.2 + dLip * 0.12;
        c = snow > 0.5 + (noise2(x / 12, y / 9, 8) - 0.5) * 0.5 ? ramp(FROST, 0.62 + (t - 0.48) * 0.5 + (hash(x >> 2, y >> 1) > 0.8 ? 0.12 : 0), x, y) : ramp(MOSS, t, x, y);
        if (lip) c = C(snow > 0.5 ? '#6a7098' : '#2e4254');
        if (hash(x, y) > 0.996) c = C(snow > 0.5 ? '#ffffff' : '#9cb48a');
      }
      BACK[i] = c;
    }

    // ---------- the waterfall stream ----------
    const STREAM = spline([[212, -6], [204, 18], [214, 40], [200, 64], [206, 90], [192, 112], [184, 134], [168, 156], [174, 180], [160, 210]]);
    const SF = distField(STREAM, 8);
    const WATER = P('#141a3a', '#1e2a52', '#28406a', '#346080', '#4a8aa0', '#8ac0d0');
    const FALLS = [];                                         // waterfall pixels (on faces)
    for (let i = 0; i < N; i++) {
      const y = i / W | 0, x = i % W, d = SF.D[i], hw = 2 + clamp(y / 200) * 2;
      if (d > hw + 1.2) continue;
      FREE[i] = 1;
      if (d > hw) { BACK[i] = C('#10142a'); continue; }
      if (FD[i] >= 0) { BACK[i] = ramp(P('#8ab4d8', '#c8e0f4', '#ffffff'), 0.5 - d / hw * 0.4, x, y); FALLS.push(i); }
      else { BACK[i] = ramp(WATER, 0.55 - d / hw * 0.35 + (noise2(x / 4, y / 3, 12) - 0.5) * 0.2, x, y); MASK[i] = 2; MASKC[i] = BACK[i]; }
    }

    // ---------- the trail: stone stairs and paths linking the stations ----------
    const TRAIL = spline([
      [-6, 150], [18, 144], STOPS[0], [72, 142], [98, 140], STOPS[1], [148, 136], [176, 140], [196, 144], STOPS[2],
      [236, 132], [252, 122], [240, 110], STOPS[3], [244, 84], [222, 80], [202, 84], STOPS[4],
    ]);
    const TF = distField(TRAIL, 6);
    const STONE = P('#3a3450', '#5a5270', '#7e7490', '#a89ab0', '#d0c4cc');
    const BRIDGES = [];
    for (let i = 0; i < N; i++) {
      const d = TF.D[i];
      if (d > 3.4) continue;
      const x = i % W, y = i / W | 0;
      FREE[i] = 1;
      if (SF.D[i] <= 4.2) { if (d <= 3.4) BRIDGES.push(i); continue; }
      if (d > 2.4) { BACK[i] = C('#141228'); continue; }
      if (FD[i] >= 0) {
        // Steps where the path climbs a rock face.
        BACK[i] = FD[i] % 2 === 0 ? ramp(STONE, 0.85 - d * 0.1, x, y) : C('#3a3450');
      } else {
        const cell = hash(Math.floor((TF.A[i] + (d > 1.2 ? 1 : 0)) / 2.5), d > 1.2 ? 1 : 0);
        BACK[i] = Math.floor(TF.A[i] / 2.5 + (d > 1.2 ? 0.5 : 0)) % 1 === 0 && frac(TF.A[i] / 2.5) < 0.2 ? C('#3a3450') : ramp(STONE, 0.4 + cell * 0.4 - d * 0.1 + warmW(x) * 0.1, x, y);
      }
      MASK[i] = 0;
    }
    // Landings: a round terrace of flagstones at each station.
    for (const [sx, sy] of STOPS) for (let y = sy - 10; y <= sy + 10; y++) for (let x = sx - 14; x <= sx + 14; x++) {
      const e = sq((x - sx) / 12.5) + sq((y - sy) / 8.2);
      if (e > 1 || x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x, gx = x - sx + 40, gy = y - sy + 40;
      const edge = (gx + (gy >> 2) * 2) % 5 === 0 || gy % 4 === 0;
      BACK[i] = e > 0.86 ? C('#221c34') : e > 0.7 ? C(e > 0.78 ? '#8a3038' : '#c85a4a') : edge ? C('#4a4262') : ramp(STONE, 0.45 + hash(Math.floor((gx + (gy >> 2) * 2) / 5), gy >> 2) * 0.35 + (sx - x) * 0.012, x, y);
      FREE[i] = 1; MASK[i] = 0; FD[i] = -1;
    }
    // Red wooden bridges where the trail crosses the stream.
    add(0, () => {
      for (const i of BRIDGES) {
        const x = i % W, y = i / W | 0, d = TF.D[i];
        if (d > 2.6) { op(x, y - 1, C(d > 3 ? '#4a1418' : '#e05a44'), 2); continue; }
        op(x, y, Math.floor(TF.A[i] / 1.5) % 2 ? C('#8a5a34') : C('#b07a48'), 0.5);
        MASK[i] = 0;
      }
    });

    // ---------- upright things ----------
    const PINE = P('#0c1622', '#122030', '#1a2c3a', '#243c46', '#34504e');
    function pine(cx, by, h, snowy) {
      add(by, () => {
        for (let j = 0; j < 2; j++) op(cx, by - j, C('#1a1016'), j);
        for (let j = 2; j < h; j++) {
          const f = (j - 2) / (h - 2), tier = (j - 2) % 4, hw = (1 - f) * h * 0.34 + (tier < 1 ? 0.6 : 0) + 0.3;
          for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
            const nx = (x - cx) / (hw + 0.5);
            let c = ramp(PINE, 0.35 - nx * 0.35 + (tier === 0 ? -0.15 : 0.05) + f * 0.1, x, by - j);
            if (nx < -0.5 && tier === 1) c = C(snowy ? '#e8e8ff' : '#6a8074');
            if (snowy && tier === 0 && hash(x, j) > 0.4) c = C('#c8cce8');
            op(x, by - j, c, j);
          }
        }
        op(cx, by - h, C(snowy ? '#ffffff' : '#34504e'), h);
      });
    }
    function blossom(cx, by, r) {
      add(by, () => {
        for (let j = 0; j < 3 + r * 0.5; j++) op(cx, by - j, C('#2a1a24'), j);
        const cy = by - 3 - r;
        for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
          const dx = x - cx, dy = y - cy, d = Math.hypot(dx / 1.15, dy) / r, q = hash((x + 50) >> 1, (y + 50) >> 1);
          if (d > 1 || (d > 0.8 && q < 0.45)) continue;
          const l = dx / r * LX + dy / r * LY;
          op(x, y, d > 0.65 && l > 0.4 ? C('#ffe8f0') : ramp(P('#5a2a54', '#8a4a74', '#d0789c', '#f4a8c4', '#ffd8e4'), 0.5 + l * 0.45 + (q - 0.5) * 0.35, x, y), by - y);
          CANOPY[y * W + x] = 1;
        }
      });
    }
    // A timber building in 3/4 view: a front wall, shoji or plank panels, and a hipped roof
    // with flared eaves. roofs: number of stacked roofs (a pagoda has three).
    const WINDOWS = [];
    function hall(cx, by, w, h, o) {
      add(by, () => {
        const hw = w >> 1, WALL = o.wall || P('#3e2418', '#5e3a24', '#8a5a34'), ROOF = o.roof || P('#1e1a30', '#2e2a48', '#46406a', '#6a6090');
        let base = by, cw = hw, ch = h;
        for (let r = 0; r < (o.roofs || 1); r++) {
          // Walls.
          for (let y = base - ch; y < base; y++) for (let x = cx - cw; x <= cx + cw; x++) {
            const post = (x - cx + cw) % 5 === 0 || x === cx + cw;
            let c = post ? WALL[0] : o.paper ? (y > base - 2 ? WALL[1] : C(o.violet ? (y < base - ch + 2 ? '#8a70d0' : '#c8b0ff') : y < base - ch + 2 ? '#e8c890' : '#fff0c8')) : WALL[(x + y) % 3 ? 2 : 1];
            op(x, y, c, by - y);
            if (o.paper && !post && y > base - ch + 1 && y < base - 1) WINDOWS.push({ x, y, k: r, v: !!o.violet });
          }
          // Roof: a low hip whose eaves flare out, lit ridge, snow dusting.
          const top = base - ch, rh = o.rh || 5, ew = cw + 3;
          for (let j = 0; j < rh; j++) {
            const y = top - j, span = ew - j * (ew - 2) / rh + (j === 0 ? 1 : 0);
            for (let x = Math.round(cx - span); x <= Math.round(cx + span); x++) {
              const edge = x <= Math.round(cx - span) || x >= Math.round(cx + span);
              const c = j === rh - 1 ? C(o.ridge || (o.snow ? '#e8e8ff' : '#8a80b0')) : edge ? ROOF[0] : ramp(ROOF, 0.75 - j / rh * 0.3 - (x - cx) / span * 0.4, x, y);
              op(x, y, c, by - y);
            }
          }
          if (o.snow) for (let x = cx - ew + 2; x <= cx + ew - 2; x++) if (hash(x, r + 9) > 0.5) op(x, top - rh + 1, C('#dcdcf4'), by - top + rh);
          op(cx - ew - 1, top - 1, ROOF[1], by - top); op(cx + ew + 1, top - 1, ROOF[1], by - top);
          base = top - rh + 1; cw = Math.max(2, cw - 2); ch = Math.max(3, ch - 2);
        }
        if (o.spire) { for (let j = 1; j <= 4; j++) op(cx, base - j, C('#ffd060'), by - base + j); op(cx, base - 5, C('#fff0a0'), by - base + 5); }
      });
    }

    // Station 1: Sergeant Square's drill yard: ten small puzzle boards laid in two rows,
    // a flagpole, and his cyan rook hologram on its pad.
    const YARD = { x: 48, y: 136 };
    for (let b = 0; b < 10; b++) {
      const bx = 18 + (b % 5) * 12, byy = 108 + (b >> 1 & 0) + Math.floor(b / 5) * 8;
      for (let y = 0; y < 5; y++) for (let x = 0; x < 8; x++) {
        const i = (byy + y) * W + bx + x, light = ((x >> 1) + (y >> 1 | 0)) % 2 === 0;
        BACK[i] = y === 0 ? C('#d8d0e0') : light ? C('#e8dcc8') : C('#5a4a6a'); FREE[i] = 1;
      }
      for (let x = -1; x <= 8; x++) put(BACK, bx + x, byy + 5, C('#141228'));
    }
    add(118, () => { for (let j = 0; j < 20; j++) op(78, 118 - j, C(j % 5 ? '#8a8aa0' : '#c8c8d8'), j); op(78, 98, C('#ffd060'), 20); });

    // Station 2: Captain Capture's endgame ring: a sand circle ringed with stones, three
    // big white pieces facing one black king (you start ahead).
    const RING = { x: 122, y: 106 };
    for (let y = RING.y - 12; y <= RING.y + 12; y++) for (let x = RING.x - 22; x <= RING.x + 22; x++) {
      const e = sq((x - RING.x) / 20) + sq((y - RING.y) / 11);
      if (e > 1) continue;
      const i = y * W + x;
      BACK[i] = e > 0.8 ? (hash(x >> 1, y) > 0.5 ? C('#8a82a0') : C('#4a4262')) : ramp(P('#6a5a6a', '#9a8478', '#c4a88a', '#e4c8a0'), 0.55 - e * 0.3 + (RING.x - x) * 0.01 + (hash(x, y) - 0.5) * 0.15, x, y);
      FREE[i] = 1;
    }
    function bigPiece(x, by, kind, white) {
      add(by, () => {
        const L = white ? P('#fffaf0', '#e2ccb0', '#9a8490') : P('#6a5a7a', '#3a2e4a', '#1a1428');
        const rows = {
          pawn: ['.xx.', 'xxxx', '.xx.', '.xx.', 'xxxx'],
          rook: ['x.xx.x', 'xxxxxx', '.xxxx.', '.xxxx.', '.xxxx.', 'xxxxxx'],
          knight: ['.xxx.', 'xxxxx', 'x.xxx', '..xxx', '.xxxx', 'xxxxx'],
          king: ['x.x.x', 'xxxxx', '.xxx.', '.xxx.', 'xxxxx', '.xxx.', '.xxx.', 'xxxxx'],   // crown points and a ball, no cross
        }[kind];
        const g = rows;
        g.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === 'x') op(x - (r.length >> 1) + i, by - g.length + j, L[i < r.length / 2 - 0.5 ? 0 : i < r.length - 1 ? 1 : 2], g.length - j); });
        if (kind === 'king') op(x, by - g.length - 1, C(white ? '#ffffff' : '#8a7aa0'), g.length + 1);
      });
    }
    bigPiece(112, 108, 'rook', true); bigPiece(120, 104, 'knight', true); bigPiece(106, 101, 'pawn', true); bigPiece(134, 104, 'king', false);

    // Station 3: Joy Stick's arcade hall, with a row of eighteen lamps on its front
    // (one for each mini-game) that light one by one.
    const ARC = { x: 248, by: 128 };
    hall(ARC.x, ARC.by, 30, 10, { wall: P('#1a1030', '#2a1848', '#3a2458'), roof: P('#1a1030', '#2a2048', '#4a3070', '#7a50a0'), rh: 8, ridge: '#ff9ae8' });
    const LAMPS = Array.from({ length: 18 }, (_, k) => [ARC.x - 14 + Math.round(k * 28 / 17), ARC.by - 11]);
    const SCREENS = [[ARC.x - 11, ARC.by - 7], [ARC.x - 4, ARC.by - 7], [ARC.x + 6, ARC.by - 7], [ARC.x + 11, ARC.by - 7]];

    // Station 4: the Rulekeeper's hall of rules, half lost in violet mist, a "?" over the door.
    const RULE = { x: 282, by: 76 };
    hall(RULE.x, RULE.by, 26, 9, { paper: true, violet: true, wall: P('#1a1428', '#2a2240', '#3a3058'), roof: P('#0e0a1c', '#241c40', '#382e5e', '#524680'), rh: 9, ridge: '#b8a0ff' });
    for (const [px, py] of [[266, 86], [298, 86]]) add(py, () => { for (let j = 0; j < 9; j++) op(px, py - j, C(j > 6 ? '#8a70d0' : '#3a3058'), j); });

    // Station 5: Sensei Tactic's dojo, a three-roofed pagoda on the top terrace with a
    // cherry tree, stone lanterns, and his golden projector pad on the yard in front.
    const DOJO = { x: 136, by: 66 };
    hall(DOJO.x, DOJO.by, 26, 9, { paper: true, rh: 5, roofs: 3, snow: true, spire: true, roof: P('#2a1418', '#5a2030', '#8a3038', '#b84a44') });
    const PAD = { x: 176, y: 64 };
    for (let y = PAD.y - 3; y <= PAD.y + 3; y++) for (let x = PAD.x - 8; x <= PAD.x + 8; x++) {
      const e = sq((x - PAD.x) / 7.5) + sq((y - PAD.y) / 2.8);
      if (e > 1) continue;
      BACK[y * W + x] = e > 0.7 ? C('#2a2030') : e > 0.4 ? C('#6a5a48') : C('#a8801f'); FREE[y * W + x] = 1;
    }
    // Stone lanterns (tōrō) along the trail and by the dojo; their flames are drawn live.
    const LANTS = [[34, 124], [64, 124], [96, 132], [150, 128], [196, 128], [228, 146], [252, 110], [234, 88], [206, 74], [156, 72], [112, 74]];
    for (const [lx, ly] of LANTS) add(ly, () => {
      for (let j = 0; j < 3; j++) for (let dx = -1; dx <= 1; dx++) op(lx + dx, ly - j, C(dx < 0 ? '#9a94b0' : '#4a4262'), j);
      for (let dx = -2; dx <= 2; dx++) { op(lx + dx, ly - 6, C(dx < 0 ? '#c8c0d8' : '#5a5270'), 6); op(lx + dx, ly - 3, C('#3a3450'), 3); }
      op(lx - 1, ly - 5, C('#3a3450'), 5); op(lx + 1, ly - 5, C('#3a3450'), 5); op(lx, ly - 7, C('#8a82a0'), 7);
    });
    // Prayer flags strung across the stairs below the dojo.
    const FLAGLINE = [[92, 78], [118, 88]];
    for (const [px, py] of FLAGLINE) add(py, () => { for (let j = 0; j < 12; j++) op(px, py - j, C('#3e2418'), j); });

    // Trees: pines on the terraces (snowy up high), cherries by the dojo and the camp.
    blossom(104, 60, 6); blossom(166, 52, 5); blossom(28, 118, 4.5); blossom(150, 112, 4);
    for (let k = 0; k < 520; k++) {
      const x = Math.round(hash(k, 301) * (W + 10) - 5), y = Math.round(hash(k, 302) * (H + 10));
      if (x < 0 || x >= W || y < 2 || y >= H) continue;
      const i = y * W + x;
      if (FREE[i] || FD[i] >= 0) continue;
      let near = false;
      for (const [sx, sy] of STOPS) if (Math.hypot(x - sx, (y - sy) * 1.3) < 24) near = true;
      if (Math.hypot(x - DOJO.x, y - DOJO.by) < 26 || Math.hypot(x - RING.x, (y - RING.y) * 1.6) < 26 || (x < 84 && x > 12 && y > 102 && y < 126)) near = true;
      if (Math.hypot(x - ARC.x, y - ARC.by + 6) < 24 || Math.hypot(x - RULE.x, y - RULE.by + 5) < 18) near = true;
      if (near || SF.D[i] < 7 || TF.D[i] < 6) continue;
      const dens = 0.35 + 0.65 * noise2(x / 26, y / 22, 31);
      if (hash(k, 303) > dens) continue;
      pine(x, y, 7 + Math.round(hash(k, 304) * 6), LV[i] >= 6);
    }

    DRAW.sort((a, b) => a.by - b.by);
    for (const d of DRAW) d.fn();

    // Cast shadows toward the east.
    const SHM = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (!OBJ[i] || OH[i] < 0.6) continue;
      const x = i % W, y = i / W | 0, h = OH[i], by = y + h;
      for (let s = CANOPY[i] ? Math.max(0, h - 3) : 0; s <= h; s += 0.7) {
        const sx = Math.round(x + s * SHX), sy = Math.round(by + s * SHY);
        if (sx >= 0 && sy >= 0 && sx < W && sy < H) SHM[sy * W + sx] = 1;
      }
    }
    for (let i = 0; i < N; i++) if (SHM[i] && !OBJ[i]) blend(BACK, i, C('#080a1c'), 0.38);

    // ---------- the sky above the ridge, under the header ----------
    const SKYC = P('#0e1230', '#18204a', '#262e62', '#3e3c78', '#645086', '#9a6690', '#d08a94');
    const RIDGE = x => 10 + 7 * noise2(x / 22, 0.5, 41) + 5 * noise2(x / 8, 1.5, 42) - 6 * Math.exp(-sq((x - 60) / 30));
    const STARS = [];
    for (let x = 0; x < W; x++) {
      const ry = Math.round(RIDGE(x));
      for (let y = 0; y < ry; y++) BACK[y * W + x] = ramp(SKYC, y / 22 + 0.25 * Math.exp(-sq((x - 30) / 80)), x, y);
      for (let y = ry; y < ry + 3 && y < H; y++) if (!OBJ[y * W + x]) BACK[y * W + x] = C(y === ry ? '#ffffff' : '#c8cce8');
      if (hash(x, 44) > 0.9 && ry > 6) STARS.push({ x, y: Math.floor(hash(x, 45) * (ry - 3)), k: 9 + (x % 17), p: hash(x, 46) * TAU });
    }

    // Masks and lists.
    const WATERI = [];
    for (let i = 0; i < N; i++) { if (MASK[i] && BACK[i] !== MASKC[i]) MASK[i] = 0; if (MASK[i] === 2) WATERI.push(i); }
    const FALLA = FALLS.filter(i => !OBJ[i]);
    // Mist: over the valley at the bottom, and around the hall of rules.
    const MISTI = [], MISTW = [];
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const valley = clamp((y - 146) / 30), hallm = Math.exp(-sq((x - RULE.x + 6) / 40) - sq((y - RULE.by - 2) / 14)) * 1.6;
      const w = Math.max(valley, hallm);
      if (w > 0.05) { MISTI.push(y * W + x); MISTW.push(w); }
    }
    const vignette = K.vignette(C('#060414'), 0.4, 0.36);
    // Warm pools of lantern light, baked into the ground.
    for (const [lx, ly] of LANTS) for (let y = ly - 16; y <= ly + 10; y++) for (let x = lx - 19; x <= lx + 19; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const d = Math.hypot(x - lx, (y - ly + 3) * 1.4) / 19;
      if (d < 1) blend(BACK, y * W + x, C('#ffa860'), 0.42 * (1 - d) * (1 - d));
    }

    for (const [gx, gy, r, c, a] of [[DOJO.x, DOJO.by - 4, 30, '#ffc070', 0.3], [RULE.x, RULE.by - 5, 26, '#a98bff', 0.3], [ARC.x, ARC.by - 4, 24, '#ff6fd8', 0.2]])
      for (let y = gy - r; y <= gy + r; y++) for (let x = gx - r; x <= gx + r; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const d = Math.hypot(x - gx, (y - gy) * 1.4) / r;
        if (d < 1) blend(BACK, y * W + x, C(c), a * (1 - d) * (1 - d));
      }

    // ---------- holograms ----------
    const G = {
      rook: ['x.xx.xx.x', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '..xxxxx..', '..xxxxx..', '..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx'],
      knight: ['...xx....', '..xxxxx..', '.xxx.xxx.', 'xxxxxxxx.', 'xxxxxxxxx', '.x..xxxxx', '...xxxxx.', '..xxxxxx.', '.xxxxxxx.', 'xxxxxxxxx'],
      pawn: ['...xxx...', '..xxxxx..', 'x.xxxxx.x', 'x.xxxxx.x', '...xxx...', '..xxxxx..', '...xxx...', '...xxx...', '..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx'],
      bishop: ['....x....', '...xxx...', '..xx.xx..', '..xxx.x..', '..xxxxx..', '...xxx...', '..xxxxx..', '...xxx...', '...xxx...', '..xxxxx..', 'xxxxxxxxx'],
    };
    const TRAINERS = [
      { g: 'rook', x: 72, y: 128, c: P('#0e4a6a', '#1f7fa8', '#56d8ff', '#d8f8ff') },
      { g: 'knight', x: 146, y: 112, c: P('#0e5a3e', '#1f9a6b', '#5dffb9', '#e0fff0') },
      { g: 'pawn', x: 226, y: 118, c: P('#5a1a48', '#a8307f', '#ff6fd8', '#ffe0f8') },
      { g: 'bishop', x: 264, y: 76, c: P('#2e1e6a', '#5b3fb0', '#a98bff', '#f0e8ff') },
    ];
    function hologram(T, idx, u, steady) {
      const g = G[T.g], gh = g.length, gw = g[0].length;
      const flick = steady ? 1 : Math.sin(TAU * 97 * u + idx * 2) > 0.9 ? 0.35 : 1;
      const glitch = !steady && Math.sin(TAU * 13 * u + idx) > 0.96 ? 1 : 0;
      const bob = Math.round(Math.sin(TAU * 8 * u + idx) * 0.6);
      const turn = Math.abs(Math.cos(TAU * (2 + idx) * u)), wv = 0.55 + 0.45 * turn;   // slow turn: width breathes
      const scan = Math.floor(frac(5 * u + idx * 0.23) * (gh + 4)) - 2;
      glow(buf, T.x, T.y - 5, 12, T.c[2], 0.12 * flick);
      for (let j = 0; j < gh + 3; j++) { const hw = 2 + j * 0.3; for (let i = -hw; i <= hw; i++) if ((i + j) % 2 === 0) blendAt(buf, T.x + i, T.y - 1 - j, T.c[1], 0.1 * flick); }
      const top = T.y - 2 - gh + bob;
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
        if (g[j][i] !== 'x') continue;
        const xs = Math.round(T.x + (i - (gw - 1) / 2) * wv) + (j === scan ? glitch : 0);
        const edge = g[j][i - 1] !== 'x' || g[j][i + 1] !== 'x' || !g[j - 1] || g[j - 1][i] !== 'x';
        const c = j === scan ? T.c[3] : edge ? T.c[2] : T.c[1];
        blendAt(buf, xs, top + j, c, (j % 2 ? 0.6 : 0.9) * flick);
      }
      for (let i = -3; i <= 3; i++) { put(buf, T.x + i, T.y, C('#3a4050')); put(buf, T.x + i, T.y + 1, C('#1e222e')); }
      for (let i = -2; i <= 2; i++) put(buf, T.x + i, T.y - 1, T.c[2]);
    }

    // Sensei Tactic: the golden king hologram, cel-shaded, redrawn each frame.
    const SW = 26, SH = 31, SPR = new Uint32Array(SW * SH), PART = new Uint8Array(SW * SH);
    const ROBE = P('#ffe6a0', '#ffd166', '#e4a844', '#b4782e', '#74482e'), TRIM = P('#e0a040', '#bc8030', '#946024', '#6a4220', '#4a2c1c');
    const SKIN = P('#fff6e0', '#f8e4bc', '#e8c894', '#c09868', '#7a5a40'), BEARD = P('#ffffff', '#fff4dc', '#f0dcae', '#c8a878', '#8a6a50');
    const SRIM = C('#c8f4ff'), SLINE = C('#2a1a1c');
    const SLN = Math.hypot(0.55, 0.65, 0.53), SLX = -0.55 / SLN, SLY = -0.65 / SLN, SLZ = 0.53 / SLN;
    function sshade(x, y, nx, ny, part, T) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= SW || y >= SH) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), l = nx * SLX + ny * SLY + nz * SLZ, i = y * SW + x;
      SPR[i] = nx > 0.72 && l < 0.2 ? SRIM : T[Math.round(clamp(1 - (l * 0.62 + 0.42)) * 4)];
      PART[i] = part;
    }
    function sdisc(cx, cy, rx, ry, part, T) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) sshade(x, y, nx * 0.95, ny * 0.95, part, T);
      }
    }
    function sensei(u, approving) {
      SPR.fill(0); PART.fill(0);
      const cx = 13, br = Math.sin(TAU * 30 * u) > 0.5 ? 1 : 0;
      // A king's base and robe, a collar, the head.
      for (let y = 26; y <= 29; y++) { const hw = 7 - (y === 26 ? 1 : 0) - (y === 29 ? 1 : 0); for (let x = cx - hw; x <= cx + hw; x++) sshade(x, y, (x - cx) / 8, y < 28 ? -0.5 : 0.1, 1, y === 27 ? TRIM : ROBE); }
      for (let y = 15; y <= 26; y++) { const hw = 2.8 + Math.pow((y - 15) / 11, 1.5) * 3.6; for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) sshade(x, y, (x - cx) / (hw + 0.5), 0.1, 2, ROBE); }
      sdisc(cx, 14.5 + br * 0.5, 4.6, 1.4, 3, TRIM);
      const hy = 10 + br * 0.5;
      sdisc(cx, hy, 3.8, 3.7, 4, SKIN);
      // The beard, long and white, over the chest.
      for (let y = Math.round(hy + 1); y <= hy + 8; y++) { const hw = 3 - (y - hy - 1) * 0.3; for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) sshade(x, y, (x - cx) / (hw + 0.6), 0.2, 5, BEARD); }
      // A small domed crown: a band, a dome, three points and a ball on top (no cross).
      for (let x = cx - 3; x <= cx + 3; x++) sshade(x, hy - 4, (x - cx) / 4, -0.3, 6, TRIM);
      sdisc(cx, hy - 6, 3, 2.4, 6, ROBE);
      for (const dx of [-3, 3]) sshade(cx + dx, hy - 5, dx / 4, -0.6, 6, TRIM);
      sdisc(cx, hy - 9.4, 1.2, 1.2, 7, ROBE);
      // The staff in his right hand (our left), and the other hand stroking the beard.
      for (let y = 4; y <= 29; y++) sshade(cx - 8, y, -0.4, 0, 8, TRIM);
      sdisc(cx - 8, 4, 1.5, 1.5, 8, ROBE);
      sdisc(cx - 7, 18, 1.6, 1.6, 9, SKIN);
      const stroke = Math.round(Math.sin(TAU * 10 * u) * 1.5);
      sdisc(cx + 2, 17 + stroke, 1.6, 1.6, 9, SKIN);
      for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
        const i = y * SW + x, p = PART[i];
        const a = x > 0 ? PART[i - 1] : 0, b = x < SW - 1 ? PART[i + 1] : 0, c = y > 0 ? PART[i - SW] : 0, d = y < SH - 1 ? PART[i + SW] : 0;
        if (!p) { if (a || b || c || d) SPR[i] = SLINE; }
        else if ((a && a < p) || (b && b < p) || (c && c < p) || (d && d < p)) SPR[i] = p === 9 ? C('#8a5a34') : p === 5 ? C('#c8a878') : C('#c08a3a');
      }
      // Face: bushy brows, closed serene eyes (open and approving when beaten), moustache.
      const pp = (x, y, c) => { if (x >= 0 && y >= 0 && x < SW && y < SH) SPR[y * SW + x] = c; };
      const hyr = Math.round(hy), peek = !approving && frac(6 * u + 0.4) < 0.06;
      for (const s of [-1, 1]) {
        pp(cx + s * 2, hyr - 2, C('#ffffff')); pp(cx + s * 3, hyr - 2, C('#ffffff')); pp(cx + s * 1, hyr - 2, C('#f0dcae'));
        if (approving || (peek && s > 0)) { pp(cx + s * 2, hyr - 1, C('#2a1a1c')); pp(cx + s * 2, hyr, C('#2a1a1c')); }
        else { pp(cx + s * 2, hyr, C('#704830')); pp(cx + s * 3, hyr - 1, C('#704830')); pp(cx + s * 1, hyr - 1 + (s > 0 ? 0 : 0), C('#ae763e')); }
      }
      pp(cx - 2, hyr + 2, C('#fff4dc')); pp(cx - 1, hyr + 2, C('#ffffff')); pp(cx + 1, hyr + 2, C('#ffffff')); pp(cx + 2, hyr + 2, C('#fff4dc'));
      pp(cx - 3, hyr + 3, C('#f0dcae')); pp(cx + 3, hyr + 3, C('#f0dcae')); pp(cx, hyr + 2, C('#c8a878'));
      pp(cx - 2, hyr - 5, C('#ffffff'));
    }

    const LANT = P('#ff9a40', '#ffc860', '#fff0a0');
    const PETALS = Array.from({ length: 26 }, (_, i) => ({ x0: hash(i, 71), y0: 40 + hash(i, 72) * 100, k: 1 + (i % 2), ky: 5 + (i % 7), p: hash(i, 74) * TAU }));
    const FLIES = Array.from({ length: 16 }, (_, i) => ({ x: hash(i, 81) * W, y: 110 + hash(i, 82) * 60, k1: 2 + (i % 4), k2: 3 + (i % 3), kb: 17 + i * 2, p: hash(i, 83) * TAU }));
    const PFL = P('#e84a4a', '#ffd23f', '#5ac8e0', '#fff4dc', '#8ae070');

    function frame(t, state) {
      const u = t / LOOP, map = (state && state.map) || {}, cleared = map.cleared | 0, beaten = !!map.beaten;
      buf.set(BACK);
      for (const s of STARS) { const b = Math.sin(TAU * s.k * u + s.p); if (b > 0.3) put(buf, s.x, s.y, C(b > 0.85 ? '#ffffff' : '#9a9ad0')); }

      // The stream: ripples flowing down, rare glints; the falls pour and foam.
      for (const i of WATERI) {
        const x = i % W, y = (i / W) | 0, r = Math.sin(y * 0.8 - TAU * 60 * u + x * 0.3), g = Math.sin(TAU * 30 * u + hash(x >> 1, y) * TAU);
        if (g > 0.996) buf[i] = C('#ffffff'); else if (r > 0.88) blend(buf, i, C('#8ac0d0'), 0.35);
      }
      for (const i of FALLA) {
        const x = i % W, y = (i / W) | 0, v = frac(y / 7 - 30 * u + hash(x, 5));
        buf[i] = v < 0.18 ? C('#6a90c0') : v < 0.5 ? C('#c8e0f4') : C('#ffffff');
      }
      for (let k = 0; k < 10; k++) {
        const v = frac(20 * u + k / 10), sx = STREAM[Math.floor(STREAM.length * (0.35 + (k % 3) * 0.18))];
        blendAt(buf, sx[0] + Math.sin(k * 3) * 3 * v, sx[1] - v * 3, C('#ffffff'), 0.5 * (1 - v));
      }

      // Lantern flames and window light.
      LANTS.forEach(([lx, ly], n) => {
        const f = 0.55 + 0.25 * Math.sin(TAU * 37 * u + n * 2.1) + 0.2 * Math.sin(TAU * 83 * u + n * 5);
        put(buf, lx, ly - 5, LANT[f > 0.75 ? 2 : f > 0.45 ? 1 : 0]);
        blendAt(buf, lx - 1, ly - 4, LANT[0], 0.4); blendAt(buf, lx + 1, ly - 4, LANT[0], 0.4);
      });
      WINDOWS.forEach((w, n) => {
        const f = 0.5 + 0.3 * Math.sin(TAU * 11 * u + (w.x >> 2) * 1.7) + (beaten && !w.v ? 0.3 : 0);
        if (f > 0.55) put(buf, w.x, w.y, w.v ? C(f > 0.8 ? '#f0e8ff' : '#d8c8ff') : C(f > 0.8 ? '#fff8d8' : '#ffe0a0'));
      });
      // Smoke from the dojo's kitchen.
      for (let i = 0; i < 7; i++) {
        const v = frac(8 * u + i / 7), x = DOJO.x + 10 + v * 8, y = DOJO.by - 22 - v * 12, r = 0.8 + v * 2.6;
        for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) if (sq(xx - x) + sq(yy - y) <= r * r) blendAt(buf, xx, yy, C(v < 0.4 ? '#c8c0d8' : '#6a6090'), (1 - v) * (1 - v) * 0.3);
      }
      // The arcade: lamps light one by one along the front (one per mini-game), screens glow.
      {
        const lit = Math.floor(frac(4 * u) * 22);
        LAMPS.forEach(([x, y], k) => {
          const on = k < lit || (lit >= 18 && Math.sin(TAU * 120 * u) > 0);
          put(buf, x, y, C(on ? ['#ff6fd8', '#6fe3ff', '#ffd23f'][k % 3] : '#3a2450'));
          if (on) blendAt(buf, x, y + 1, C('#ff6fd8'), 0.3);
        });
        SCREENS.forEach(([x, y], k) => {
          const f = Math.sin(TAU * (17 + k * 6) * u + k);
          for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) put(buf, x + dx, y + dy, C(f > 0.3 ? (dy === 1 ? '#ff9ae8' : '#6fe3ff') : f > -0.4 ? '#8a50c0' : '#ffd23f'));
        });
        glow(buf, ARC.x, ARC.by - 4, 20, C('#ff6fd8'), 0.12 + 0.04 * Math.sin(TAU * 16 * u));
      }
      // The "?" over the hall of rules, pulsing violet.
      {
        const q = ['.xxx.', 'x...x', '...x.', '..x..', '.....', '..x..'], f = 0.6 + 0.4 * Math.sin(TAU * 12 * u);
        glow(buf, RULE.x, RULE.by - 18, 14, C('#a98bff'), 0.3 * f);
        const qy = RULE.by - 24;
        for (let y = qy - 2; y <= qy + 7; y++) for (let x = RULE.x - 4; x <= RULE.x + 4; x++) put(buf, x, y, C(y === qy - 2 || x === RULE.x - 4 ? '#6a5a8a' : y === qy + 7 || x === RULE.x + 4 ? '#0e0a1a' : '#1e1634'));
        q.forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] === 'x') put(buf, RULE.x - 2 + i, qy + j, C(f > 0.7 ? '#ffffff' : '#c8b0ff')); });
        put(buf, RULE.x, RULE.by - 3, C(f > 0.5 ? '#c8b0ff' : '#6a50c0'));
      }
      // Prayer flags.
      {
        const [ax, ay] = FLAGLINE[0], [bx, by] = FLAGLINE[1];
        for (let x = ax; x <= bx; x++) {
          const s = (x - ax) / (bx - ax), y = Math.round(ay - 11 + (by - ay) * s + Math.sin(Math.PI * s) * 3);
          put(buf, x, y, C('#2a1a1c'));
          if ((x - ax) % 3 === 1) { const c = PFL[((x - ax) / 3 | 0) % 5], f = Math.sin(TAU * 40 * u + x) > 0 ? 1 : 0; put(buf, x, y + 1, c); put(buf, x + f, y + 2, c); put(buf, x + 1, y + 1, c); }
        }
      }

      // Mist drifting through the valley and curling round the hall of rules.
      for (let k = 0; k < MISTI.length; k++) {
        const i = MISTI[k], x = i % W, y = (i / W) | 0;
        const n = noiseLoop(x / 24 + 12 * u, y >> 3, 12) * 0.6 + noiseLoop(x / 11 - 24 * u, (y >> 2) + 30, 24) * 0.4;
        const a = (n - 0.38) * MISTW[k] * 0.9;
        if (a <= 0) continue;
        const c = y > 140 ? C('#9a94c8') : C('#b8a8f0');
        const aa = Math.min(0.38, a);
        blend(buf, i, c, aa); if (x + 1 < W) blend(buf, i + 1, c, aa);
        if (y + 1 < H) { blend(buf, i + W, c, aa); if (x + 1 < W) blend(buf, i + W + 1, c, aa); }
      }

      // The four trainers' holograms; cleared ones glow steady with a pennant beside them.
      TRAINERS.forEach((T, k) => {
        hologram(T, k, u, k < cleared);
        if (k < cleared) {
          const fx = T.x + 7, fy = T.y;
          for (let j = 0; j < 8; j++) put(buf, fx, fy - j, C('#3e2418'));
          for (let j = 0; j < 3; j++) for (let i = 1; i <= 4; i++) put(buf, fx + i, fy - 7 + j + Math.round(Math.sin(TAU * 30 * u - i * 0.8 + k) * 0.6), T.c[j === 1 ? 3 : 2]);
        }
      });
      // Sensei on his pad: a light cone, the golden figure with scanlines, a scan sweep, glitches.
      {
        sensei(u, beaten);
        const flick = Math.sin(TAU * 89 * u) > 0.95 ? 0.55 : 1, glitchRow = Math.sin(TAU * 11 * u) > 0.93 ? Math.floor(frac(37 * u) * SH) : -1;
        const scan = Math.floor(frac(3 * u) * (SH + 8)) - 4, nod = beaten ? Math.round(Math.max(0, Math.sin(TAU * 20 * u)) * 1) : 0;
        for (let j = 0; j < 30; j++) { const hw = 4 + j * 0.3; for (let i = -hw; i <= hw; i++) if ((i + j) % 2 === 0) blendAt(buf, PAD.x + i, PAD.y - 1 - j, C('#ffd166'), 0.07 * flick); }
        glow(buf, PAD.x, PAD.y - 14, 22, C('#ffd166'), 0.14 * flick);
        const X0 = PAD.x - 13, Y0 = PAD.y - SH + 1;
        for (let y = 0; y < SH; y++) {
          const gx = y === glitchRow ? 2 : 0, line = (y + Math.floor(t * 6)) % 3 === 0;
          for (let x = 0; x < SW; x++) {
            const v = SPR[y * SW + x];
            if (!v) continue;
            const yy = Y0 + y + (y < 16 ? nod : 0);
            if (Math.abs(y - scan) < 1) blendAt(buf, X0 + x + gx, yy, C('#ffffff'), 0.7);
            else if (line) blendAt(buf, X0 + x + gx, yy, v, 0.7 * flick);
            else if (flick < 1) blendAt(buf, X0 + x + gx, yy, v, 0.8); else put(buf, X0 + x + gx, yy, v);
          }
        }
      }

      // Petals drifting from the cherries, fireflies in the valley.
      for (const p of PETALS) {
        const v = frac(p.x0 + p.k * u), x = W + 10 - v * (W + 40), y = p.y0 + v * 40 + 4 * Math.sin(TAU * p.ky * u + p.p);
        const flip = Math.sin(TAU * p.ky * 3 * u + p.p) > 0;
        put(buf, x, y, C(flip ? '#ffc8d8' : '#e890b0')); if (flip) put(buf, x + 1, y, C('#f0a8c0'));
      }
      for (const f of FLIES) {
        const b = Math.sin(TAU * f.kb * u + f.p);
        if (b < 0.3) continue;
        const x = Math.round(f.x + 8 * Math.sin(TAU * f.k1 * u + f.p)), y = Math.round(f.y + 4 * Math.sin(TAU * f.k2 * u));
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blendAt(buf, x + dx, y + dy, C('#c8f070'), 0.4 * b);
        put(buf, x, y, C('#fffcb0'));
      }
      vignette(buf);
    }

    return (t, out, state) => { buf = out; frame(t, state); };
  },
});
