// The Clockwork Citadel at dusk: the World 7 live background.
//
// Castle's fortress of brass: a clock tower on the left, a tower of bare interlocking
// gears on the right, brass walls wrapped in pipes, smokestacks in the smoggy distance.
// Warm brass catching a low amber sun against teal machine-light in every window and gauge.
// Moves: the gears turn (meshed, so their speeds match), the clock's hands sweep, pistons
// pump, steam vents puff, smoke rises from the stacks, an airship drifts past, windows and
// gauges pulse teal, sparks from a grinding wheel.
LiveScenes.register({
  id: 'clockworkcitadel',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, noise2, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over, rect, line, disc, glow } = K;
    let buf = null;

    const SKYB = new Uint32Array(W * H), BACK = new Uint32Array(W * H);
    const SX = 130, SY = 92;
    const BRASS = ['#fff0b0', '#f0c060', '#c08a38', '#8a5a24', '#4e3018'].map(C);
    const IRON = ['#6a6a70', '#4a4850', '#302e38', '#1e1c24'].map(C);
    const TEAL = C('#4ae0d0'), TEALD = C('#1e8a88');

    // ---------- smoggy dusk sky ----------
    const SKY = ['#1a2230', '#26303c', '#3a3e44', '#5a5048', '#8a6a4a', '#c08a4a', '#eaaa5a', '#ffd488'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - SX, (y - SY) * 1.4);
      SKYB[y * W + x] = ramp(SKY, y / 120 + 0.3 * Math.exp(-sq(d / 60)) + (noise2(x / 30, y / 8, 4) - 0.5) * 0.12, x, y);
    }
    disc(SKYB, SX, SY, 10, (dx, dy, d) => C(d < 0.8 ? '#fff4d0' : '#ffe0a0'));
    // Distant stacks and towers, hazy.
    for (let i = 0; i < 12; i++) {
      const x = 8 + i * 27 + hash(i, 3) * 12, h = 30 + hash(i, 4) * 40, w = 5 + hash(i, 5) * 10;
      rect(SKYB, x, 118 - h, w, h, C(mix('#4a3e3e', '#c08a4a', 0.45)));
      if (i % 3 === 0) rect(SKYB, x + w / 2 - 1, 118 - h - 10, 3, 10, C(mix('#4a3e3e', '#c08a4a', 0.4)));
    }
    rect(SKYB, 0, 118, W, H - 118, C(mix('#3a3030', '#c08a4a', 0.35)));

    // ---------- brass wall with pipes ----------
    const WALL = 120;
    for (let y = WALL; y < 170; y++) for (let x = 0; x < W; x++) {
      const px = x % 24, py = (y - WALL) % 16;
      let t = 0.45 + (y - WALL) / 100 - 0.25 * Math.exp(-sq((x - SX) / 80));
      if (px === 0 || py === 0) t += 0.25;
      if (px === 1 || py === 1) t -= 0.2;
      let c = ramp(BRASS.slice(1), t, x, y);
      if ((px === 3 || px === 20) && (py === 3 || py === 12)) c = BRASS[4];
      BACK[y * W + x] = c;
    }
    for (let x = 0; x < W; x += 12) rect(BACK, x, WALL - 6, 7, 6, BRASS[2]), rect(BACK, x, WALL - 6, 7, 1, BRASS[0]);
    // Pipes: two long runs with flanges and valves.
    for (const [py, r] of [[132, 3], [150, 2]]) for (let x = 0; x < W; x++) for (let j = -r; j <= r; j++) {
      const flange = x % 40 < 2;
      put(BACK, x, py + j, flange ? BRASS[3] : ramp(IRON, (j + r) / (2 * r) * 0.9, x, py + j));
    }
    const GAUGES = [[92, 140], [150, 140], [206, 140]];
    for (const [gx, gy] of GAUGES) disc(BACK, gx, gy, 4, (dx, dy, d) => d > 0.8 ? BRASS[3] : C('#102828'));

    // ---------- the clock tower (left) ----------
    const CT = { x: 44, top: 26, clockY: 60 };
    for (let y = CT.top; y < 170; y++) {
      const hw = y < CT.top + 10 ? (y - CT.top) * 1.8 : 18;
      for (let x = Math.round(CT.x - hw); x <= Math.round(CT.x + hw); x++) {
        const rel = (x - (CT.x - hw)) / (2 * hw);
        let c = y < CT.top + 10 ? ramp(['#5a8a88', '#3a6a68', '#24484a'].map(C), rel, x, y) : ramp(BRASS.slice(1), 0.3 + rel * 0.6 + ((y % 10) === 0 ? 0.2 : 0), x, y);
        put(BACK, x, y, c);
      }
    }
    line(BACK, CT.x, CT.top - 8, CT.x, CT.top, BRASS[3]); disc(BACK, CT.x, CT.top - 9, 1.5, BRASS[1]);
    disc(BACK, CT.x, CT.clockY, 14, (dx, dy, d) => d > 0.88 ? BRASS[3] : d > 0.8 ? BRASS[0] : C('#f4ecd8'));
    for (let h = 0; h < 12; h++) { const a = h / 12 * TAU; put(BACK, CT.x + Math.cos(a) * 10, CT.clockY + Math.sin(a) * 10, C('#3a2a20')); }
    const CT_WIN = [[CT.x - 8, 90], [CT.x + 4, 90], [CT.x - 8, 112], [CT.x + 4, 112]];
    for (const [wx, wy] of CT_WIN) rect(BACK, wx - 1, wy - 1, 6, 10, BRASS[4]);

    // ---------- the gear tower (right) ----------
    const GT = { x0: 214, x1: 312, top: 34 };
    for (let y = GT.top; y < 170; y++) for (let x = GT.x0; x < GT.x1; x++) {
      const frame = x - GT.x0 < 4 || GT.x1 - x <= 4 || (y - GT.top) % 34 < 3;
      BACK[y * W + x] = frame ? ramp(BRASS.slice(1), (x - GT.x0) / (GT.x1 - GT.x0) * 0.8 + 0.1, x, y) : ramp(['#2a2430', '#1e1a24'].map(C), (y - GT.top) / 136, x, y);
    }
    for (let x = GT.x0 - 4; x < GT.x1 + 4; x++) for (let y = GT.top - 6; y < GT.top; y++) put(BACK, x, y, y === GT.top - 6 ? BRASS[0] : BRASS[2]);
    // Gears: neighbours turn opposite ways, smaller ones faster. `turns` is whole turns per
    // loop (roughly 1 / teeth, so they look meshed) because the spokes must line up again.
    const GEARS = [
      { x: 244, y: 74, r: 22, n: 16, dir: 1, turns: 3 },
      { x: 283, y: 92, r: 15, n: 11, dir: -1, turns: 4 },
      { x: 250, y: 128, r: 16, n: 12, dir: -1, turns: 4 },
      { x: 292, y: 140, r: 11, n: 8, dir: 1, turns: 6 },
      { x: 296, y: 56, r: 9, n: 7, dir: 1, turns: 7 },
    ];
    const GEARCOL = [['#fff0b0', '#e0a848', '#8a5a24', '#1e1a24'], ['#e8e8f0', '#9a9aa8', '#4a4a58', '#1e1a24']];

    // ---------- walkway in front ----------
    for (let y = 170; y < H; y++) for (let x = 0; x < W; x++) {
      const grate = (x + (y >> 1)) % 6 === 0 || y === 170;
      BACK[y * W + x] = grate ? IRON[3] : ramp(IRON, 0.4 + (y - 170) / 40, x, y);
    }
    for (let x = 0; x < W; x++) { put(BACK, x, 170, BRASS[1]); put(BACK, x, 171, BRASS[3]); }
    const PISTONS = [[118, 0], [182, 1]];

    // ---------- animated bits ----------
    const STACKS = [[32, 36], [116, 60], [170, 50]].map(([x, y], i) => ({ x, y, i }));
    const VENTS = [[70, 132], [140, 150], [200, 132]].map(([x, y], i) => ({ x, y, p: i / 3 }));
    const vignette = K.vignette(C('#100a08'), 0.4, 0.42);

    function frame(t) {
      const u = t / LOOP;
      buf.set(SKYB);
      // Smoke from the far stacks.
      for (const s of STACKS) for (let i = 0; i < 12; i++) {
        const v = frac(6 * u + i / 12 + s.i * 0.3), x = s.x + v * 30, y = s.y + 16 - v * 40, r = 1 + v * 5;
        for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++)
          if (Math.hypot(xx - x, yy - y) <= r) blendAt(buf, xx, yy, C('#5a4a4a'), (1 - v) * 0.25);
      }
      // The airship.
      const av = frac(u), ax = -60 + av * (W + 120), ay = 30 + Math.sin(TAU * 4 * u) * 2;
      for (let y = -6; y <= 6; y++) for (let x = -20; x <= 20; x++) {
        if (sq(x / 20) + sq(y / 6.5) > 1) continue;
        put(buf, ax + x, ay + y, C(y < -2 ? '#c89a60' : y < 3 ? '#9a6a3a' : '#5a3a24'));
        if (x % 8 === 0) put(buf, ax + x, ay + y, C('#6a4428'));
      }
      rect(buf, ax - 6, ay + 8, 12, 4, C('#3a2a24')); line(buf, ax - 5, ay + 5, ax - 5, ay + 8, C('#3a2a24')); line(buf, ax + 5, ay + 5, ax + 5, ay + 8, C('#3a2a24'));
      for (let j = -3; j <= 3; j++) put(buf, ax - 22 + (Math.floor(t * 12) % 2 ? 0 : 1), ay + j, C('#3a2a24'));
      put(buf, ax + 2, ay + 9, TEAL);
      over(buf, BACK);

      // Gears.
      for (const g of GEARS) {
        const ang = g.dir * TAU * g.turns * u + (g.n % 2 ? Math.PI / g.n : 0);
        K.gear(buf, g.x, g.y, g.r, g.n, ang, GEARCOL[g.r > 12 ? 0 : 1]);
      }
      // Clock hands: the hour hand turns once a loop, the minute hand 12 times, the second hand ticks.
      const mA = TAU * 12 * u - Math.PI / 2, sA = TAU * 24 * u - Math.PI / 2, hA = TAU * u - Math.PI / 2 + 1.2;
      line(buf, CT.x, CT.clockY, CT.x + Math.cos(hA) * 6, CT.clockY + Math.sin(hA) * 6, C('#2a1a14'));
      line(buf, CT.x, CT.clockY, CT.x + Math.cos(mA) * 10, CT.clockY + Math.sin(mA) * 10, C('#2a1a14'));
      line(buf, CT.x, CT.clockY, CT.x + Math.cos(Math.floor(sA / (TAU / 60)) * TAU / 60) * 11, CT.clockY + Math.sin(Math.floor(sA / (TAU / 60)) * TAU / 60) * 11, C('#c83a2a'));
      put(buf, CT.x, CT.clockY, BRASS[3]);
      // Windows and gauges pulse teal.
      CT_WIN.forEach(([wx, wy], n) => {
        const f = 0.5 + 0.5 * Math.sin(TAU * 9 * u + n);
        rect(buf, wx, wy, 4, 8, f > 0.3 ? TEAL : TEALD); rect(buf, wx, wy + 3, 4, 1, BRASS[4]);
        glow(buf, wx + 2, wy + 4, 10, TEAL, 0.12 * f);
      });
      GAUGES.forEach(([gx, gy], n) => {
        const a = -Math.PI * 0.75 + (0.5 + 0.5 * Math.sin(TAU * (5 + n * 2) * u + n)) * Math.PI * 1.5;
        glow(buf, gx, gy, 7, TEAL, 0.25);
        line(buf, gx, gy, gx + Math.cos(a) * 3, gy + Math.sin(a) * 3, TEAL);
      });
      // Pistons pumping.
      for (const [px, ph] of PISTONS) {
        const e = Math.round((0.5 + 0.5 * Math.sin(TAU * 40 * u + ph * Math.PI)) * 10);
        rect(buf, px - 5, 152, 11, 18, IRON[2]); rect(buf, px - 5, 152, 11, 1, IRON[0]);
        rect(buf, px - 2, 138 - e, 5, 14 + e, BRASS[2]); rect(buf, px - 2, 138 - e, 1, 14 + e, BRASS[0]);
        rect(buf, px - 4, 136 - e, 9, 3, IRON[1]);
      }
      // Steam vents puff in turn.
      for (const v of VENTS) {
        const age = frac(8 * u + v.p);
        if (age > 0.4) continue;
        for (let i = 0; i < 8; i++) {
          const a = age / 0.4, x = v.x + (hash(i, 90) - 0.5) * 10 * a, y = v.y - 4 - a * 26 - i * 2, r = 2 + a * 5;
          for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++)
            if (Math.hypot(xx - x, yy - y) <= r) blendAt(buf, xx, yy, C('#f4ecde'), (1 - a) * 0.22);
        }
      }
      // Sparks from a grinding wheel on the walkway.
      K.gear(buf, 150, 180, 6, 10, TAU * 60 * u, GEARCOL[1]);
      for (let i = 0; i < 10; i++) {
        const v = frac(30 * u + i / 10), a = -2.6 + hash(i, 40) * 0.8;
        put(buf, 156 + Math.cos(a) * v * 26, 176 + Math.sin(a) * v * 18 + v * v * 20, C(v < 0.4 ? '#fff4a0' : '#ff9a30'));
      }
      vignette(buf);
    }

    return (t, out) => { buf = out; frame(t); };
  },
});
