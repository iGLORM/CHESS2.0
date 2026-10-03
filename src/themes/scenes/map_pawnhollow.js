// Pawn Hollow from above: the local map of World 1.
//
// 320x200, shown at 4x when the world map zooms into Pawn Hollow. The whole village at
// golden hour, seen from a hill: a low sun in the west throws long shadows to the east.
// The world road comes in from the west edge, passes under the windmill of the prologue
// (with the hay behind it where you woke, the shard still glowing in the flattened
// straw), crosses the stream on the old bridge and ends on the village green, where
// Pawnie waits on the stone chessboard. The chapel with its pawn finial, thatched
// cottages, patchwork fields, an orchard and the woods around it all.
// Moves: sails turn, wheat rolls in the wind, the stream flows and glints, ducks
// paddle, chimneys smoke, cloud shadows cross the fields, birds fly over, bunting
// flutters, windows flicker, the shard pulses, pollen drifts, Pawnie waves and hops.
// State (LiveScenes.setState('map_pawnhollow', { map: { cleared, beaten } })): when
// Pawnie is beaten he hops for joy with both hands up and a flag flies on the green.
LiveScenes.register({
  id: 'map_pawnhollow',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  stops: [[216, 114]],
  create() {
    const W = 320, H = 200, N = W * H, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise2, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, glow } = K;
    let buf = null;

    const BACK = new Uint32Array(N);          // the whole static map
    const OBJ = new Uint8Array(N);            // 1 = an upright thing stands here (buildings, trees)
    const OH = new Float32Array(N);           // its height above the ground, for shadows
    const CANOPY = new Uint8Array(N);         // 1 = a tree crown (its shadow is a blob, not a wall)
    const FREE = new Uint8Array(N);           // 1 = keep clear (road, green, water): no trees
    const MASK = new Uint8Array(N);           // 1 = wheat, 2 = water
    const MASKC = new Uint32Array(N);
    const STOP = [216, 114];

    // Light: a low sun in the west-north-west. Shadows run east and a little south.
    const LX = -0.82, LY = -0.42;
    const SHX = 1.25, SHY = 0.42;

    // ---------- helpers ----------
    function spline(P, step = 0.35) {
      const out = [];
      for (let i = 0; i < P.length - 1; i++) {
        const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
        const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
        for (let k = 0; k < n; k++) {
          const t = k / n, t2 = t * t, t3 = t2 * t;
          const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
          out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        }
      }
      out.push(P[P.length - 1]);
      return out;
    }
    // Distance to a sampled curve (and the running length at the nearest sample).
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
      return { D, A };
    }
    // An upright pixel: its colour, and how high above its base (for the shadow pass).
    function op(x, y, c, h) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = y * W + x;
      BACK[i] = c; OBJ[i] = 1; OH[i] = Math.max(0, h);
    }
    const P = (...h) => h.map(C);
    const DRAW = [];                          // upright things, drawn back to front by base y
    const add = (by, fn) => DRAW.push({ by, fn });

    // ---------- the land: rolling hills lit from the west ----------
    const hillAt = (x, y) => 0.42 * noise2(x / 52, y / 40, 3) + 0.24 * noise2(x / 23, y / 20, 4) + 0.08 * noise2(x / 9, y / 8, 5)
      + 0.34 * Math.exp(-sq((x - 90) / 34) - sq((y - 80) / 26))            // the windmill hill
      - 0.16 * Math.exp(-sq((x - 214) / 50) - sq((y - 104) / 30));         // the hollow the village sits in
    const HG = new Float32Array((W + 2) * (H + 2));
    for (let y = -1; y <= H; y++) for (let x = -1; x <= W; x++) HG[(y + 1) * (W + 2) + x + 1] = hillAt(x, y);
    const hg = (x, y) => HG[(y + 1) * (W + 2) + x + 1];
    const slope = (x, y) => -((hg(x + 1, y) - hg(x - 1, y)) * LX + (hg(x, y + 1) - hg(x, y - 1)) * LY) * 9;   // > 0 faces the sun
    const GRASS = P('#122232', '#18303a', '#203e40', '#2c5044', '#3c6448', '#52784a', '#6e8e4e', '#92a654', '#bcbc5e', '#e2cc70');
    // The low sun's warmth: strongest on the west side of the map, fading east.
    const sunAt = (x, y) => 0.12 * clamp(1 - x / 260) - 0.06 * clamp((y - 150) / 50);
    // Woods along the north edge, down the east edge and in the south-west corner.
    const woodAt = (x, y) => {
      const n = noise2(x / 30, y / 30, 21);
      const north = y < 28 + n * 16 - (x > 180 && x < 240 ? 6 : 0);
      const east = x > 302 - n * 12 && y < 150;
      const sw0 = x < 34 + n * 20 && y > 166;
      return north || east || sw0 ? 1 : 0;
    };

    // The stream, from the woods in the north down past the village to the south edge.
    const STREAM = spline([[164, -8], [154, 18], [162, 44], [150, 70], [134, 96], [140, 122], [128, 150], [112, 176], [104, 210]]);
    const SF = distField(STREAM, 12);
    const sw = y => 2.6 + clamp(y / 200) * 3.2;
    const isWater = i => SF.D[i] <= sw(i / W | 0);
    const SCX = new Float32Array(H);                        // the stream's middle, row by row
    for (const [x, y] of STREAM) if (y >= 0 && y < H) SCX[Math.round(y)] = x;

    // The road: in from the west edge, under the windmill, over the bridge, onto the green.
    const ROAD = spline([[-10, 134], [20, 129], [48, 119], [78, 111], [104, 117], [124, 125], [141, 124], [164, 120], [190, 118], [STOP[0], STOP[1]]]);
    const RF = distField(ROAD, 7);
    // A footpath from the road up to the windmill door and round to the hay behind it.
    const LANE = spline([[80, 111], [88, 101], [92, 92], [84, 86], [74, 80], [64, 72], [58, 66]]);
    const LF = distField(LANE, 5);
    const GREEN = { x: 216, y: 102, rx: 34, ry: 19 };
    const onGreen = (x, y) => sq((x - GREEN.x) / GREEN.rx) + sq((y - GREEN.y) / GREEN.ry);

    // Patchwork fields west of the stream and in the south-east, on a slanted grid.
    const FA = 0.36, FC = Math.cos(FA), FS = Math.sin(FA);
    const CROPS = [
      P('#8a5a34', '#c08448', '#e8b25c', '#f8d884', '#fff0b8'),   // wheat
      P('#3e5a3a', '#5e7e44', '#8ca84e', '#bccb70', '#dcdc90'),   // young green
      P('#4a3034', '#704842', '#9c664a', '#cc9064', '#e8b484'),   // ploughed
      P('#3a5a44', '#527852', '#7aa060', '#a8c47a', '#cadc94'),   // meadow
      P('#4a3a5a', '#6a5078', '#8a6a98', '#b090b8', '#d8b8d8'),   // lavender
    ];
    const fieldZone = (x, y) => {
      if (y < 34 || x > 300) return false;
      const west = x < SCX[y] - 9;
      const southEast = y > 150 && x > SCX[y] + 9 && x < 262;
      const hill = sq((x - 90) / 22) + sq((y - 76) / 18) < 1;
      const hay = sq((x - 60) / 22) + sq((y - 60) / 13) < 1;
      return (west || southEast) && !hill && !hay;
    };

    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, s = slope(x, y), h = hg(x, y);
      const tex = (noise2(x / 7, y / 7, 9) - 0.5) * 0.16;
      const wood = woodAt(x, y);
      let c = ramp(GRASS, 0.5 + s * 1.2 + h * 0.3 + tex + sunAt(x, y) - wood * 0.45, x, y);
      if (!wood && hash(x, y) > 0.985) c = ramp(GRASS, 0.75 + s + sunAt(x, y), x, y);          // tufts catching the light
      if (fieldZone(x, y)) {
        const u = x * FC + y * FS, v = -x * FS + y * FC;
        const cu = Math.floor(u / 26), cv = Math.floor(v / 15), fu = frac(u / 26) * 26, fv = frac(v / 15) * 15;
        const cell = hash(cu + 40, cv + 70), crop = cell < 0.38 ? 0 : cell < 0.56 ? 1 : cell < 0.72 ? 2 : cell < 0.9 ? 3 : 4;
        if (fu < 1 || fv < 1) {
          c = ramp(P('#1a2e30', '#243e38', '#34543e'), 0.5 + s * 0.8 + (hash(x >> 1, y >> 1) > 0.6 ? 0.4 : 0), x, y);   // hedges
        } else {
          let t = 0.5 + s * 1.1 + tex * 0.6;
          const rows = crop === 2 || crop === 4 ? (Math.floor(fv) % 2 ? -0.22 : 0.1) : crop === 0 ? (Math.floor(fu / 2) % 2 ? -0.06 : 0.04) : 0;
          c = ramp(CROPS[crop], t + rows, x, y);
          if (crop === 0) { MASK[i] = 1; MASKC[i] = c; }
        }
      }
      BACK[i] = c;
    }

    // Village green: short bright grass in the hollow, trodden paler toward the middle.
    const GREENC = P('#4e7a4a', '#6e9450', '#94ae5a', '#bcc268', '#e0d480');
    for (let y = GREEN.y - GREEN.ry - 1; y <= GREEN.y + GREEN.ry + 1; y++) for (let x = GREEN.x - GREEN.rx - 1; x <= GREEN.x + GREEN.rx + 1; x++) {
      const e = onGreen(x, y) + (noise2(x / 4, y / 4, 11) - 0.5) * 0.25;
      if (e > 1 || x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      BACK[i] = ramp(GREENC, 0.35 + (1 - e) * 0.35 + slope(x, y) * 0.8 + (hash(x, y) - 0.5) * 0.15, x, y);
      FREE[i] = 1;
    }

    // The stream: dusk sky in the water, a lit east bank and a shaded west bank.
    const WATER = P('#1a1c42', '#232656', '#2e3068', '#3c3878', '#523f84', '#7a4c8c', '#b06488');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, d = SF.D[i], hw = sw(y);
      if (d <= hw) {
        const t = 0.58 - d / hw * 0.4 + (noise2(x / 6, y / 4, 13) - 0.5) * 0.16 + (y < 60 ? 0.08 : 0);
        BACK[i] = ramp(WATER, t, x, y); MASK[i] = 2; MASKC[i] = BACK[i]; FREE[i] = 1;
      } else if (d <= hw + 1.6) {
        // Which side of the stream: sample the distance field one step east.
        const east = x + 1 < W && SF.D[i + 1] < d;
        BACK[i] = C(east ? '#1e3638' : '#c09a64');
        if (!east && d > hw + 0.9) BACK[i] = C('#7a8a4c');
        FREE[i] = 1;
      }
    }

    // Road and lane: packed earth, lighter in the wheel ruts' crown, with a dark kerb.
    const ROADC = P('#6a4838', '#9a7050', '#c89a70', '#e2bc8c', '#f4d8a8');
    function earth(F, w, crown) {
      for (let i = 0; i < N; i++) {
        const d = F.D[i];
        if (d > w + 1.3) continue;
        const x = i % W, y = i / W | 0;
        if (isWater(i)) continue;
        FREE[i] = 1;
        if (d > w) { if (!(MASK[i] === 2)) blend(BACK, i, C('#1c2e30'), 0.45); continue; }
        let t = 0.62 - d / w * 0.25 + slope(x, y) * 0.9 + (hash(x, y) - 0.5) * 0.18;
        if (crown && Math.abs(d - w * 0.5) < 0.5) t -= 0.18;                // ruts
        BACK[i] = ramp(ROADC, t, x, y);
        if (hash(x * 3, y * 7) > 0.975) BACK[i] = C('#fff0c8');              // pebbles
        MASK[i] = 0;
      }
    }
    earth(LF, 1.1, false);
    earth(RF, 2.6, true);
    // The landing where the road meets the green: a round of flagstones.
    for (let y = STOP[1] - 10; y <= STOP[1] + 10; y++) for (let x = STOP[0] - 14; x <= STOP[0] + 14; x++) {
      const e = sq((x - STOP[0]) / 12.5) + sq((y - STOP[1]) / 8.2);
      if (e > 1) continue;
      const i = y * W + x, cell = hash(Math.floor((x + (y >> 2) * 2) / 4), y >> 2);
      const edge = (x + (y >> 2) * 2) % 4 === 0 || y % 4 === 0;
      BACK[i] = e > 0.84 ? C('#5a4a4a') : edge ? C('#8a7468') : ramp(P('#a8907c', '#c8b09a', '#e6d0b0', '#fbe8c8'), 0.4 + cell * 0.4 + slope(x, y) + (x - STOP[0]) * -0.02, x, y);
      FREE[i] = 1; MASK[i] = 0;
    }

    // The bridge over the stream, where the road crosses it.
    const BR = { x: 141, y: 124 };
    {
      let bx = 0, by = 0, n = 0;
      for (let i = 0; i < N; i++) if (RF.D[i] <= 3.4 && isWater(i)) { bx += i % W; by += i / W | 0; n++; }
      if (n) { BR.x = Math.round(bx / n); BR.y = Math.round(by / n); }
    }
    add(BR.y + 4, () => {
      for (let i = 0; i < N; i++) {
        const d = RF.D[i], x = i % W, y = i / W | 0;
        if (Math.abs(x - BR.x) > 11 || Math.abs(y - BR.y) > 9 || d > 4.2) continue;
        const nearWater = SF.D[i] <= sw(y) + 2.4;
        if (!nearWater) continue;
        const plank = Math.floor(RF.A[i] / 1.6) % 2;
        if (d > 3.2) op(x, y - 1, C(d > 3.7 ? '#3a2420' : '#e0a860'), 2);           // rails, lit on top
        else op(x, y, C(plank ? '#b07a48' : '#d8a060'), 0.5);
        MASK[i] = 0;
      }
    });

    // ---------- upright things ----------
    const LEAF = P('#12242a', '#1a3232', '#244434', '#335a38', '#4a743e', '#6c9044', '#9aae52');
    const LEAFRIM = C('#e8c860'), TRUNK = C('#3a2a2a'), TRUNKL = C('#a0704a');
    function tree(cx, by, r, opts = {}) {
      add(by, () => {
        const th = opts.trunk || Math.max(1, Math.round(r * 0.5));
        for (let j = 0; j < th + r; j++) { op(cx, by - j, TRUNK, j); if (j < th) op(cx - 1, by - j, TRUNKL, j); }
        const cy = by - th - r;
        for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
          const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy * 1.08) / r;
          const q = hash((x + 300) >> 1, (y + 300) >> 1);
          if (d > 1 || (d > 0.82 && q < 0.4)) continue;
          const l = dx / r * LX + dy / r * LY;
          let c = d > 0.66 && l > 0.42 ? LEAFRIM : ramp(opts.pal || LEAF, 0.5 + l * 0.5 + (q - 0.5) * 0.35 - dy / r * 0.08, x, y);
          if (opts.fruit && q > 0.9 && d < 0.8) c = C(l > 0 ? '#ff7a5a' : '#b82e34');
          if (opts.bloom) c = d > 0.66 && l > 0.42 ? C('#ffe8f0') : ramp(P('#5a2a4a', '#8a3a64', '#c45a88', '#ec8ab0', '#ffc2d8'), 0.5 + l * 0.5 + (q - 0.5) * 0.35, x, y);
          op(x, y, c, by - y); if (x >= 0 && y >= 0 && x < W && y < H) CANOPY[y * W + x] = 1;
        }
      });
    }
    // A thatched cottage seen from above the south: gable wall in front, roof slopes behind
    // (west slope in the sun, east slope in shade), a chimney and a lit window or two.
    const WINDOWS = [], CHIMNEYS = [];
    const THATCH_L = P('#b07840', '#dca25a', '#f2c878', '#ffe29e'), THATCH_D = P('#4a2e34', '#6a4038', '#8a5a42');
    const PLASTER = P('#8a7090', '#b89aa4', '#e0c4b0', '#fbe0bc');
    function cottage(cx, by, w, h, rd, o = {}) {
      add(by, () => {
        const hw = w / 2, eave = by - h, apex = eave - Math.round(hw * 0.7);
        const f = y => (y - apex) / (eave - apex) * (hw + 1.5);
        // Roof: the gable triangle pushed back by rd.
        for (let y = apex - rd; y <= eave; y++) for (let x = Math.floor(cx - hw - 2); x <= cx + hw + 2; x++) {
          const yb = Math.min(y + rd, eave);
          if (yb < apex || Math.abs(x - cx) > f(yb)) continue;
          const dx = x - cx, back = y + rd < apex + 1.5;
          let c;
          if (Math.abs(dx) < 0.6) c = C('#fff0b0');
          else if (dx < 0) c = ramp(THATCH_L, 0.55 + (hash(x, 5) - 0.5) * 0.5 + (back ? 0.3 : 0) - (Math.abs(dx) > f(yb) - 1 ? 0.35 : 0), x, y);
          else c = ramp(THATCH_D, 0.6 + (hash(x, 6) - 0.5) * 0.6 - (Math.abs(dx) > f(yb) - 1 ? 0.3 : 0), x, y);
          op(x, y, c, by - y);
        }
        // Gable wall and front wall.
        for (let y = apex; y < by; y++) for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
          if (y < eave && Math.abs(x - cx) > f(y) - 1.6) continue;
          const lit = x < cx - hw + 2;
          op(x, y, ramp(PLASTER, (lit ? 0.85 : 0.55) - (y - apex) / (by - apex) * 0.25 + (hash(x, y) > 0.9 ? -0.2 : 0), x, y), by - y);
        }
        for (let x = Math.floor(cx - hw); x <= cx + hw; x++) op(x, eave, C('#6a4a4a'), h);
        const dx0 = Math.round(cx + (o.door || 0)) - 1;
        for (let y = by - 4; y < by; y++) { op(dx0, y, C('#3a2228'), by - y); op(dx0 + 1, y, C('#4a2e30'), by - y); }
        WINDOWS.push({ x: Math.round(cx - hw + 2), y: by - h + 2 }, { x: Math.round(cx + hw - 3), y: by - h + 2 });
        const chx = Math.round(cx + hw * 0.45), cht = apex - rd + Math.round(rd * 0.4);
        for (let y = cht; y <= cht + 5; y++) { op(chx, y, C('#6a5060'), by - y); op(chx + 1, y, C('#4a3440'), by - y); }
        op(chx, cht - 1, C('#2a1a24'), by - cht + 1); op(chx + 1, cht - 1, C('#2a1a24'), by - cht + 1);
        CHIMNEYS.push({ x: chx + 0.5, y: cht - 2 });
      });
    }
    // Hay: a domed stack, gold in the sun, rust in its shade.
    function haystack(cx, by, r) {
      add(by, () => {
        for (let y = by - r * 1.6; y <= by; y++) for (let x = cx - r; x <= cx + r; x++) {
          const dx = (x - cx) / r, dy = (y - (by - r * 0.6)) / r;
          const top = y < by - r * 0.6 ? Math.hypot(dx, dy * 1) : Math.abs(dx);
          if (top > 1) continue;
          const l = dx * LX + (y < by - r * 0.6 ? dy : 0) * LY;
          op(x, y, ramp(P('#7a4a2a', '#b0783c', '#e0a850', '#f8d478', '#fff0b0'), 0.45 + l * 0.6 + (hash(x, y) - 0.5) * 0.25 + ((y | 0) % 3 === 0 ? -0.12 : 0), x, y), by - y);
        }
      });
    }

    // The windmill on its hill: a tapering tower, a red cap. The sails turn in frame().
    const WM = { x: 92, by: 90, top: 66 };
    add(WM.by, () => {
      const BODY = P('#5e4a6a', '#8a7488', '#bca4a0', '#e6caa8', '#fbe4bc');
      for (let y = WM.top; y <= WM.by; y++) {
        const s = (y - WM.top) / (WM.by - WM.top), hw = 4 + s * 3.4;
        for (let x = Math.round(WM.x - hw); x <= Math.round(WM.x + hw); x++) {
          const nx = (x - WM.x) / hw;
          let c = ramp(BODY, 0.55 - nx * 0.45, x, y);
          if (y % 4 === 0 && Math.abs(nx) < 0.85) c = C('#7a6478');
          op(x, y, c, WM.by - y);
        }
      }
      for (let i = 0; i < 7; i++) {
        const y = WM.top - i, hw = 5.5 - i * 0.72;
        for (let x = Math.round(WM.x - hw); x <= Math.round(WM.x + hw); x++) op(x, y, C(i === 6 ? '#ffb08a' : x < WM.x - hw * 0.3 ? '#e07a58' : x < WM.x + hw * 0.4 ? '#a8443a' : '#6a2a30'), WM.by - y);
      }
      for (let y = WM.by - 5; y <= WM.by; y++) for (let x = WM.x - 1; x <= WM.x + 1; x++) op(x, y, C('#3a2228'), WM.by - y);
      WINDOWS.push({ x: WM.x - 1, y: WM.top + 8 });
    });
    const HUB = { x: WM.x, y: WM.top - 2 };

    // The hay behind the windmill, and the nest of flattened straw where you woke up.
    const NEST = { x: 60, y: 66 };
    for (let y = NEST.y - 8; y <= NEST.y + 8; y++) for (let x = NEST.x - 14; x <= NEST.x + 14; x++) {
      const e = sq((x - NEST.x) / 13) + sq((y - NEST.y) / 7) + (noise2(x / 3, y / 3, 17) - 0.5) * 0.4;
      if (e > 1) continue;
      const i = y * W + x, a = Math.atan2(y - NEST.y, x - NEST.x);
      BACK[i] = ramp(P('#8a5a30', '#c08a44', '#e8b85c', '#fbe08a'), 0.35 + e * 0.35 + (Math.sin(a * 9 + e * 6) > 0.4 ? 0.25 : 0) + slope(x, y), x, y);
      if (e < 0.22) BACK[i] = ramp(P('#6a4230', '#9a6a3c', '#c89048'), 0.3 + e * 3, x, y);   // the hollow you lay in
      FREE[i] = 1; MASK[i] = 0;
    }
    haystack(44, 60, 6); haystack(52, 54, 5); haystack(76, 56, 5.5); haystack(36, 70, 4.5);
    for (const [bx, byy] of [[70, 78], [28, 88]]) haystack(bx, byy, 3.5);

    // The chapel: a nave, and a tall tower whose pawn finial catches the last sun.
    const CH = { x: 272, by: 76 };
    cottage(258, 80, 12, 9, 11, { door: 0 });
    add(CH.by, () => {
      const top = CH.by - 26;
      for (let y = top; y <= CH.by; y++) for (let x = CH.x - 4; x <= CH.x + 4; x++) {
        const rel = x - (CH.x - 4);
        const c = rel < 2 ? C('#fbe0bc') : rel < 5 ? C('#c8a8a8') : C('#8a6a88');
        op(x, y, (y - top) % 5 === 0 && rel > 1 ? C('#7a5a78') : c, CH.by - y);
      }
      for (let y = top + 4; y < top + 8; y++) op(CH.x, y, C('#2a1a28'), CH.by - y);   // belfry
      for (let i = 0; i < 9; i++) {
        const y = top - 1 - i, hw = 5 - i * 0.55;
        for (let x = Math.round(CH.x - hw); x <= Math.round(CH.x + hw); x++) op(x, y, C(x < CH.x - 1 ? '#e08a64' : x <= CH.x ? '#a8483e' : '#5a2a34'), CH.by - y);
      }
      // The pawn finial: a ball on a collar on a little base (no cross).
      const fy = top - 10, F = C('#ffd070'), FD = C('#a8683a');
      op(CH.x - 1, fy, F, 36); op(CH.x, fy, F, 36); op(CH.x + 1, fy, FD, 36);
      op(CH.x, fy - 1, F, 37);
      op(CH.x - 1, fy - 2, F, 38); op(CH.x, fy - 2, F, 38); op(CH.x + 1, fy - 2, FD, 38);
      for (let dy = -5; dy <= -3; dy++) for (let dx = -1; dx <= 1; dx++) op(CH.x + dx, fy + dy, dx < 1 ? C('#fff0a0') : FD, 40);
      op(CH.x - 1, fy - 5, C('#fffbe0'), 41);
    });

    // Cottages around the green, and a few along the road.
    cottage(180, 90, 14, 7, 7, { door: -2 });
    cottage(194, 72, 12, 6, 7);
    cottage(242, 80, 13, 7, 7, { door: 2 });
    cottage(262, 118, 14, 7, 8);
    cottage(290, 102, 12, 6, 7);
    cottage(244, 146, 13, 7, 7);
    cottage(196, 146, 12, 6, 7);
    cottage(222, 72, 11, 6, 6);                        // Pawnie's own cottage, behind the board
    cottage(172, 118, 11, 6, 6, { door: 1 });

    // A well on the green.
    add(106, () => {
      const wx = 186, wy = 106;
      for (let y = wy - 4; y <= wy; y++) for (let x = wx - 4; x <= wx + 4; x++) {
        const e = sq((x - wx) / 4.2) + sq((y - wy + 1.5) / 2.4);
        if (e > 1) continue;
        op(x, y, e < 0.45 ? C('#1a2240') : C(x < wx ? '#d8c8b8' : '#8a7a88'), 2);
      }
      for (let y = wy - 10; y <= wy - 2; y++) { op(wx - 4, y, C('#6a4430'), wy - y); op(wx + 4, y, C('#3a2420'), wy - y); }
      for (let x = wx - 5; x <= wx + 5; x++) { op(x, wy - 11, C(x < wx ? '#e08a64' : '#8a3a34'), 11); op(x, wy - 10, C('#6a2a2a'), 10); }
      op(wx, wy - 9, C('#3a2420'), 9); op(wx, wy - 8, C('#3a2420'), 8);
    });
    // Posts for the bunting over the green.
    const BUNT = [[194, 88], [238, 88]];
    for (const [px, py] of BUNT) add(py, () => { for (let j = 0; j < 13; j++) { op(px, py - j, C('#3a2420'), j); op(px - 1, py - j, C('#b07a48'), j); } });

    // The stone chessboard in the middle of the green, where Pawnie stands.
    const BOARD = { x: 216, y: 94 };
    for (let r = 0; r < 4; r++) for (let f = 0; f < 6; f++) {
      const x0 = BOARD.x - 12 + f * 4, y0 = BOARD.y - 7 + r * 3;
      for (let y = y0; y < y0 + 3; y++) for (let x = x0; x < x0 + 4; x++) {
        const i = y * W + x, light = (r + f) % 2 === 0;
        BACK[i] = C(light ? (y === y0 ? '#fff4dc' : '#f0dcc0') : (y === y0 ? '#8a6a70' : '#6a4a5a'));
        FREE[i] = 1;
      }
    }
    for (let x = BOARD.x - 13; x <= BOARD.x + 12; x++) { put(BACK, x, BOARD.y + 5, C('#4a3440')); put(BACK, x, BOARD.y - 8, C('#b09080')); }
    for (let y = BOARD.y - 8; y <= BOARD.y + 5; y++) { put(BACK, BOARD.x - 13, y, C('#b09080')); put(BACK, BOARD.x + 12, y, C('#4a3440')); }

    // Trees: the apple orchard, trees along the stream and road, the woods on the edges.
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const x = 270 + c * 12 + (r % 2) * 6, y = 150 + r * 12;
      if (x < W + 4) tree(x, y, 4.2, { fruit: true, trunk: 2 });
    }
    tree(252, 102, 5.5, { fruit: true, trunk: 3 });       // the big apple tree by the green
    tree(160, 96, 4.5, { bloom: true });
    tree(122, 144, 4); tree(116, 104, 3.5); tree(176, 60, 4); tree(150, 150, 3.5); tree(110, 170, 4.5);
    tree(120, 40, 4); tree(40, 110, 3.5); tree(20, 150, 4); tree(66, 142, 3); tree(234, 124, 3.2);
    // Woods: along the north edge, down the east edge, and in the south-west corner.
    const WOOD = [];
    for (let i = 0; i < 700; i++) {
      const x = hash(i, 501) * (W + 16) - 8, y = hash(i, 502) * (H + 12) - 4;
      if (!woodAt(x, y + 4)) continue;
      const iy = Math.round(clamp(y, 0, H - 1)) * W + Math.round(clamp(x, 0, W - 1));
      if (FREE[iy]) continue;
      WOOD.push([x, y, 3.4 + hash(i, 503) * 3]);
    }
    for (const [x, y, r] of WOOD) tree(Math.round(x), Math.round(y), r, { trunk: 1 });

    // Fences along the road in the fields.
    add(0, () => {
      for (let i = 0; i < ROAD.length; i += 6) {
        const [x, y] = ROAD[i];
        if (x < 4 || x > 120) continue;
        const fx = Math.round(x), fy = Math.round(y + 5);
        if (FREE[fy * W + fx] || isWater(fy * W + fx)) continue;
        op(fx, fy, C('#3a2420'), 0); op(fx, fy - 1, C('#b07a48'), 1); op(fx, fy - 2, C('#e0a860'), 2);
      }
    });

    DRAW.sort((a, b) => a.by - b.by);
    for (const d of DRAW) d.fn();

    // ---------- cast shadows: every upright pixel throws one to the east ----------
    const SHM = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (!OBJ[i] || OH[i] < 0.6) continue;
      const x = i % W, y = i / W | 0, h = OH[i], by = y + h;
      for (let s = CANOPY[i] ? Math.max(0, h - 3.5) : 0; s <= h; s += 0.7) {
        const sx = Math.round(x + s * SHX), sy = Math.round(by - (h - s) * 0 + s * SHY);
        if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
        SHM[sy * W + sx] = 1;
      }
    }
    const SHC = C('#101c34');
    for (let i = 0; i < N; i++) if (SHM[i] && !OBJ[i]) { blend(BACK, i, SHC, MASK[i] === 2 ? 0.3 : 0.42); if (MASK[i] === 1) MASK[i] = 0; }

    // Masks: drop pixels a nearer layer painted over.
    const WHEAT = [], WATERI = [];
    for (let i = 0; i < N; i++) {
      if (MASK[i] && BACK[i] !== MASKC[i]) MASK[i] = 0;
      if (MASK[i] === 1) WHEAT.push(i); else if (MASK[i] === 2) WATERI.push(i);
    }
    const WA = new Float32Array(WATERI.length);            // distance down the stream, for flowing ripples
    for (let k = 0; k < WATERI.length; k++) {
      const i = WATERI[k], x = i % W, y = i / W | 0;
      let best = 1e9, a = 0, len = 0;
      for (let s = 0; s < STREAM.length; s += 3) {
        if (s) len += Math.hypot(STREAM[s][0] - STREAM[s - 3][0], STREAM[s][1] - STREAM[s - 3][1]);
        const d = sq(STREAM[s][0] - x) + sq(STREAM[s][1] - y);
        if (d < best) { best = d; a = len; }
      }
      WA[k] = a;
    }
    const STREAM_LEN = (() => { let l = 0; for (let s = 3; s < STREAM.length; s += 3) l += Math.hypot(STREAM[s][0] - STREAM[s - 3][0], STREAM[s][1] - STREAM[s - 3][1]); return l; })();

    // ---------- light: warm evening haze from the west, vignette ----------
    const vignette = K.vignette(C('#140c24'), 0.4, 0.32);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = clamp(1 - x / 170) * clamp(1 - Math.abs(y - 90) / 130);
      if (v > 0.02) blend(BACK, y * W + x, C('#ffb070'), 0.1 * v);
    }

    // ---------- animated pieces ----------
    // Cloud shadows: soft blobs sliding east over the whole map.
    const CLOUDS = [0, 1, 2].map(k => {
      const w = 90 + k * 20, h = 44 + k * 6, m = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const e = sq((x - w / 2) / (w / 2)) + sq((y - h / 2) / (h / 2));
        const v = (1 - e) * 1.3 + (noise2(x / 14, y / 10, 60 + k) - 0.5) * 1.1;
        if (v > 0.25 + bay(x, y) * 0.35) m.push(x, y);
      }
      return { w, h, m, y0: [18, 92, 140][k], x0: k * 170, dy: [0.12, -0.08, 0.1][k] };
    });
    const CLOUD_SPAN = 520, CLOUDC = C('#1a2044');
    const DUCKS = [0.12, 0.47, 0.52];
    const SHEEP = [[204, 46], [214, 42], [226, 50], [240, 44], [118, 58]].map(([x, y], i) => ({ x, y, k: 1 + (i % 3), p: hash(i, 71) * TAU }));
    const MOTES = Array.from({ length: 40 }, (_, i) => ({ x0: hash(i, 81), y0: 36 + hash(i, 82) * 120, k: 1 + (i % 2), ky: 5 + (i % 7), kt: 14 + (i % 19), p: hash(i, 83) * TAU }));
    const FLIES = Array.from({ length: 14 }, (_, i) => ({ x: hash(i, 91) * W, y: hash(i, 92) * 36 + (i < 7 ? 2 : 160), k1: 2 + (i % 4), k2: 3 + (i % 3), kb: 17 + i * 2, p: hash(i, 93) * TAU }));
    const WIN = P('#ff9a40', '#ffc860', '#fff0a0');
    const SAIL = C('#f4e2c0'), SAIL2 = C('#c8a88e'), SPAR = C('#4a2e2a'), FRAMEC = C('#6a4434');
    const SMOKE_A = C('#f0dcc8'), SMOKE_B = C('#a898b8');
    const FLAGS = P('#e84a4a', '#ffd23f', '#5ac8e0', '#fff4dc', '#8ae070');

    // Pawnie: a small cream pawn, cel-shaded, drawn fresh each frame into his own sprite.
    const PW = 26, PH = 30, SPR = new Uint32Array(PW * PH), PART = new Uint8Array(PW * PH);
    const CREAM = P('#fffaf0', '#f6e8d0', '#e2ccb0', '#b89c8c', '#7e6272');
    const PRIM = C('#b8c8f0'), PLINE = C('#2e1e2e');
    const PL = Math.hypot(0.62, 0.55, 0.55), PLX = -0.62 / PL, PLY = -0.55 / PL, PLZ = 0.55 / PL;
    function pshade(x, y, nx, ny, part) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= PW || y >= PH) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), l = nx * PLX + ny * PLY + nz * PLZ, i = y * PW + x;
      SPR[i] = nx > 0.72 && l < 0.2 ? PRIM : CREAM[Math.round(clamp(1 - (l * 0.62 + 0.42)) * 4)];
      PART[i] = part;
    }
    function pdisc(cx, cy, rx, ry, part) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) pshade(x, y, nx * 0.95, ny * 0.95, part);
      }
    }
    function pawnie(u, happy) {
      SPR.fill(0); PART.fill(0);
      const cx = 13;
      // A hop every two seconds (quick bounces when happy), and breathing.
      const hopK = happy ? 120 : 30, hv = frac(hopK * u);
      const hop = hv < (happy ? 0.5 : 0.18) ? Math.round(Math.sin(Math.PI * hv / (happy ? 0.5 : 0.18)) * (happy ? 3 : 2)) : 0;
      const breathe = Math.sin(TAU * 40 * u) > 0.6 ? 1 : 0;
      const oy = -hop;
      for (let y = 23; y <= 27; y++) {
        const hw = 7 - (y === 23 ? 1 : 0) - (y === 27 ? 1 : 0);
        for (let x = cx - hw; x <= cx + hw; x++) pshade(x, y + oy, (x - cx) / 8, y < 25 ? -0.55 : 0.1, 1);
      }
      for (let y = 15; y <= 23; y++) {
        const hw = 2.6 + Math.pow((y - 15) / 8, 1.6) * 4.2;
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) pshade(x, y + oy, (x - cx) / (hw + 0.5), 0.1, 2);
      }
      pdisc(cx, 14.5 + oy + breathe * 0.5, 4.6, 1.5, 3);
      const hy = 9 + oy + breathe * 0.5;
      pdisc(cx, hy, 5.2, 5, 4);
      // Hands: one waving above the head, the other at his side (both up when happy).
      const wave = Math.sin(TAU * 60 * u);
      const hands = happy
        ? [[cx - 8, 5 + oy + (wave > 0 ? -1 : 0)], [cx + 8, 5 + oy + (wave > 0 ? 0 : -1)]]
        : [[cx - 7, 19 + oy], [cx + 9 + Math.round(wave * 1.3), 5 + oy - (Math.abs(wave) > 0.7 ? 0 : 1)]];
      for (const [hx, hy2] of hands) pdisc(hx, hy2, 1.8, 1.8, 5);
      // Outline and seams.
      for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
        const i = y * PW + x, p = PART[i];
        const a = x > 0 ? PART[i - 1] : 0, b = x < PW - 1 ? PART[i + 1] : 0, c = y > 0 ? PART[i - PW] : 0, d = y < PH - 1 ? PART[i + PW] : 0;
        if (!p) { if (a || b || c || d) SPR[i] = PLINE; }
        else if ((a && a < p) || (b && b < p) || (c && c < p) || (d && d < p)) SPR[i] = p === 5 ? CREAM[4] : C('#c8b0a0');
      }
      // Face: eyes (closed arcs when happy, blinking otherwise), a smile, blush.
      const hyr = Math.round(hy), blink = frac(9 * u + 0.3) < 0.03;
      const pp = (x, y, c) => { if (x >= 0 && y >= 0 && x < PW && y < PH) SPR[y * PW + x] = c; };
      const EYE = C('#1e1420');
      if (happy) { for (const ex of [cx - 2, cx + 2]) { pp(ex - 1, hyr, EYE); pp(ex, hyr - 1, EYE); pp(ex + 1, hyr, EYE); } }
      else if (blink) { for (const ex of [cx - 2, cx + 2]) { pp(ex, hyr, EYE); pp(ex + 1, hyr, EYE); } }
      else for (const ex of [cx - 2, cx + 2]) { pp(ex, hyr - 1, EYE); pp(ex, hyr, EYE); pp(ex, hyr + 1, EYE); }
      // An open smile.
      const M = C('#3a1e2a');
      pp(cx - 1, hyr + 3, M); pp(cx, hyr + 3, M); pp(cx + 1, hyr + 3, M); pp(cx - 2, hyr + 2, M); pp(cx + 2, hyr + 2, M);
      pp(cx, hyr + 2, C('#8a3040')); pp(cx - 1, hyr + 2, C('#8a3040')); pp(cx + 1, hyr + 2, C('#e86a7a'));
      pp(cx - 4, hyr + 1, C('#ff8a7a')); pp(cx + 4, hyr + 1, C('#ff8a7a'));
      pp(cx - 2, hyr - 4, C('#ffffff')); pp(cx - 3, hyr - 3, C('#ffffff'));
      return hop;
    }

    function frame(t, state) {
      const u = t / LOOP;
      const map = (state && state.map) || {};
      const beaten = !!map.beaten;
      buf.set(BACK);

      // Wind rolling through the wheat.
      const WL = C('#fff0b0'), WL2 = C('#fffbe0');
      for (const i of WHEAT) {
        const x = i % W, y = (i / W) | 0, w = Math.sin(TAU * 30 * u - x * 0.1 + y * 0.18);
        if (w > 0.6 && (w - 0.6) * 2.8 > bay(x, y)) buf[i] = w > 0.93 ? WL2 : WL;
      }
      // The stream: ripples flowing downstream, rare glints of the evening sky.
      const RIP = C('#8a64a4'), GL = C('#fff4d0'), GL2 = C('#ffb890');
      for (let k = 0; k < WATERI.length; k++) {
        const i = WATERI[k], x = i % W, y = (i / W) | 0;
        const r = Math.sin(WA[k] * 0.9 - TAU * 40 * u + (x - y) * 0.2);
        const g = Math.sin(TAU * 30 * u + hash(x >> 1, y) * TAU);
        if (g > 0.998) buf[i] = GL; else if (g > 0.99) buf[i] = GL2;
        else if (r > 0.9) blend(buf, i, RIP, 0.3);
      }
      // Ducks paddling downstream (they leave off the south edge and come back from the north).
      for (let d = 0; d < DUCKS.length; d++) {
        const s = frac(DUCKS[d] + 2 * u) * STREAM.length | 0, [dx, dy] = STREAM[Math.min(STREAM.length - 1, s)];
        const x = Math.round(dx + (d === 2 ? 2 : 0)), y = Math.round(dy + (d === 2 ? 1 : 0));
        put(buf, x, y, C('#fff4dc')); put(buf, x + 1, y, C('#e8d8c0')); put(buf, x - 1, y, C('#c8b8a8')); put(buf, x, y - 1, C(d ? '#fff4dc' : '#2a6a4a'));
        put(buf, x + (Math.sin(TAU * 30 * u + d) > 0 ? 0 : 1), y - 1, C(d ? '#fff4dc' : '#2a6a4a')); put(buf, x + 1, y - 1, C('#ffa040'));
        blendAt(buf, x - 2, y, C('#b8a0d0'), 0.5); blendAt(buf, x - 3, y + 1, C('#b8a0d0'), 0.3);
      }

      // Windows glowing in the dusk.
      WINDOWS.forEach((w, n) => {
        const f = 0.5 + 0.28 * Math.sin(TAU * 37 * u + n * 2.1) + 0.22 * Math.sin(TAU * 91 * u + n * 5.3);
        const i = w.y * W + w.x;
        if (w.x < 0 || w.x >= W - 1 || !OBJ[i]) return;
        put(buf, w.x, w.y, WIN[f > 0.72 ? 2 : f > 0.38 ? 1 : 0]); put(buf, w.x + 1, w.y, WIN[f > 0.5 ? 1 : 0]);
      });
      // The shard in the hay, still glowing: a pulse of violet and gold, and a sparkle.
      {
        const pulse = 0.5 + 0.5 * Math.sin(TAU * 20 * u);
        glow(buf, NEST.x, NEST.y, 13, C('#ff60c8'), 0.22 + 0.16 * pulse);
        glow(buf, NEST.x, NEST.y, 6, C('#fff0c0'), 0.3 + 0.2 * pulse);
        // The shard itself: a little tilted tile of glowing board, magenta and cyan.
        const SH = [[0, -2, '#ffd0f4'], [1, -2, '#80f0ff'], [-1, -1, '#ff70d0'], [0, -1, '#ffffff'], [1, -1, '#40d8f0'], [-1, 0, '#c040a8'], [0, 0, '#ff90e0'], [1, 0, '#2aa8d0'], [0, 1, '#6a2a70']];
        for (const [dx, dy, c] of SH) put(buf, NEST.x + dx, NEST.y + dy, C(c));
        const sp = frac(6 * u);
        if (sp < 0.35) {
          const r = 2 + Math.round(sp * 6), c = C(sp < 0.2 ? '#ffffff' : '#ffc8f0');
          put(buf, NEST.x, NEST.y - 1 - r, c); put(buf, NEST.x, NEST.y - 1 + r, c); put(buf, NEST.x - r, NEST.y - 1, c); put(buf, NEST.x + r, NEST.y - 1, c);
        }
      }
      // Windmill sails: sixteen quarter turns a loop.
      {
        const a0 = TAU / 4 * 16 * u + 0.3;
        for (let q = 0; q < 4; q++) {
          const a = a0 + q * Math.PI / 2, dx = Math.cos(a), dy = Math.sin(a), qx = -dy, qy = dx;
          for (let r = 3; r <= 17; r += 0.5) for (let s = 0.5; s <= 3.5; s += 0.5) {
            const x = HUB.x + dx * r + qx * s, y = HUB.y + dy * r + qy * s;
            const onFrame = s >= 3.2 || (r % 3.5) < 0.5 || r >= 16.6;
            put(buf, x, y, onFrame ? FRAMEC : (bay(Math.round(x), Math.round(y)) > 0.3 ? SAIL : SAIL2));
          }
          for (let r = 0; r <= 18; r += 0.5) put(buf, HUB.x + dx * r, HUB.y + dy * r, SPAR);
        }
        for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) put(buf, HUB.x + x, HUB.y + y, C(x === -1 && y === -1 ? '#e0a070' : '#3a2228'));
      }
      // Chimney smoke, leaning east with the wind.
      CHIMNEYS.forEach((ch, n) => {
        for (let i = 0; i < 7; i++) {
          const v = frac(10 * u + i / 7 + n * 0.37);
          const x = ch.x + v * 9 + Math.sin(v * 6 + i + n) * v, y = ch.y - v * 9, r = 0.8 + v * 2.8;
          const col = v < 0.4 ? SMOKE_A : SMOKE_B, a = (1 - v) * (1 - v) * 0.32;
          for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++)
            if (sq(xx - x) + sq(yy - y) <= r * r) blendAt(buf, xx, yy, col, a);
        }
      });
      // Bunting between the two posts, fluttering.
      {
        const [ax, ay] = BUNT[0], [bx, by] = BUNT[1];
        for (let x = ax; x <= bx; x++) {
          const s = (x - ax) / (bx - ax), y = Math.round(ay - 12 + Math.sin(Math.PI * s) * 4);
          put(buf, x, y, C('#3a2420'));
          if ((x - ax) % 4 === 2) {
            const f = Math.sin(TAU * 40 * u + x * 0.6) > 0 ? 1 : 0, col = FLAGS[((x - ax) >> 2) % FLAGS.length];
            put(buf, x - 1, y + 1, col); put(buf, x, y + 1, col); put(buf, x + 1, y + 1, col);
            put(buf, x + f - 0.4, y + 2, col); if (!f) put(buf, x - 1 + 1, y + 3, col);
          }
        }
      }

      // A few sheep grazing on the hill above the village.
      for (let k = 0; k < SHEEP.length; k++) {
        const sh = SHEEP[k];
        const x = Math.round(sh.x + 5 * Math.sin(TAU * sh.k * u + sh.p)), y = Math.round(sh.y + 2 * Math.sin(TAU * (sh.k + 1) * u + sh.p * 2));
        const face = Math.cos(TAU * sh.k * u + sh.p) >= 0 ? 1 : -1, graze = Math.sin(TAU * 11 * u + k * 2) > 0.3 ? 1 : 0;
        blendAt(buf, x + 2, y + 1, C('#101c34'), 0.4); blendAt(buf, x + 3, y + 1, C('#101c34'), 0.3);
        for (let dx = -1; dx <= 1; dx++) { put(buf, x + dx, y - 1, C('#fffaf0')); put(buf, x + dx, y, C(dx === 1 ? '#c8b8b8' : '#ece0d8')); }
        put(buf, x + face * 2, y - 1 + graze, C('#2a2028'));
      }

      // Cloud shadows drifting east.
      for (const c of CLOUDS) {
        const X = Math.round(frac(c.x0 / CLOUD_SPAN + u) * CLOUD_SPAN) - 130, Y = c.y0 + Math.round(Math.sin(TAU * u) * 6);
        for (let k = 0; k < c.m.length; k += 2) {
          const x = X + c.m[k], y = Y + c.m[k + 1] + Math.round((X + c.m[k]) * c.dy * 0.1);
          if (x >= 0 && y >= 0 && x < W && y < H) blend(buf, y * W + x, CLOUDC, 0.2);
        }
      }

      // Pawnie on the board, his shadow stretched east.
      {
        const hop = pawnie(u, beaten);
        const fx = BOARD.x - 13, fy = BOARD.y + 1 - PH + 1;
        for (let s = 0; s < 10; s++) for (let w = -1; w <= 1; w++) blendAt(buf, BOARD.x + 2 + s * 1.2, BOARD.y + 1 + s * 0.4 + w * 0.6, C('#1a1830'), 0.35 * (1 - s / 10) * (hop ? 0.6 : 1));
        for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const v = SPR[y * PW + x]; if (v) put(buf, fx + x, fy + y, v); }
        if (beaten) {
          // A little flag on the green, and sparkles.
          for (let j = 0; j < 9; j++) put(buf, BOARD.x + 16, BOARD.y + 2 - j, C('#3a2420'));
          for (let j = 0; j < 3; j++) for (let i = 1; i <= 5; i++) put(buf, BOARD.x + 16 + i, BOARD.y - 6 + j + Math.round(Math.sin(TAU * 30 * u - i * 0.8) * 0.6), C(j === 1 ? '#ffe070' : '#ffd23f'));
          for (let s = 0; s < 4; s++) if (Math.sin(TAU * 24 * u + s * 1.7) > 0.5) put(buf, fx + [2, 23, 5, 21][s], fy + [4, 3, 14, 12][s], C('#fff4c0'));
        }
      }

      // Birds heading home over the village, their shadows on the ground below.
      {
        const bu = frac(3 * u), bx = -40 + bu * (W + 120), by = 60 + 16 * Math.sin(bu * TAU);
        for (let i = 0; i < 5; i++) {
          const row = Math.ceil(i / 2), sg = i % 2 ? 1 : -1;
          const x = Math.round(bx - row * 5), y = Math.round(by + sg * row * 3);
          const up = Math.sin(TAU * 180 * u + i * 1.3) > 0;
          blendAt(buf, x + 18, y + 26, C('#101c34'), 0.35); blendAt(buf, x + 19, y + 26, C('#101c34'), 0.35);
          for (const [dx, dy] of up ? [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]] : [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]]) put(buf, x + dx, y + dy, C('#2e2040'));
        }
      }
      // Pollen in the evening light, fireflies waking in the woods.
      const M1 = C('#fff2c0'), M2 = C('#ffd890');
      for (const m of MOTES) {
        const tw = Math.sin(TAU * m.kt * u + m.p);
        if (tw < 0) continue;
        const x = frac(m.x0 + m.k * u) * (W + 20) - 10, y = m.y0 + 3 * Math.sin(TAU * m.ky * u + m.p);
        if (tw > 0.7) put(buf, x, y, M1); else blendAt(buf, x, y, M2, 0.6);
      }
      for (const f of FLIES) {
        const b = Math.sin(TAU * f.kb * u + f.p);
        if (b < 0.3) continue;
        const x = Math.round(f.x + 8 * Math.sin(TAU * f.k1 * u + f.p)), y = Math.round(f.y + 4 * Math.sin(TAU * f.k2 * u));
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blendAt(buf, x + dx, y + dy, C('#c8f070'), 0.4 * b);
        put(buf, x, y, C('#fffcb0'));
      }

      // Warm haze from the low sun, and the edges fading into dusk.
      vignette(buf);
    }

    return (t, out, state) => { buf = out; frame(t, state); };
  },
});
