// Forked Gulch at sunset: the World 9 live background.
//
// Forkmaster's frontier, looking down a red-rock gulch at the moment the sun drops into the
// notch of the great forked butte the place is named for. Blazing sunset against deep
// purple canyon shadow. Sandstone cliffs frame a valley with a dry riverbed, a little
// frontier town, a railroad trestle; a lone rider watches from the cliff edge.
// Moves: a steam train crosses the trestle, smoke trailing; tumbleweeds bounce down the
// valley; the rider's horse flicks its tail and the rider's scarf streams; hawks circle;
// clouds drift, lit from below; heat shimmers; dust blows off the cliffs; town lights flicker.
LiveScenes.register({
  id: 'forkedgulch',
  width: 320,
  height: 200,
  loop: 120,
  still: 24,
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, noise2, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over, rect, line, disc, glow } = K;
    let buf = null;

    const SKYB = new Uint32Array(W * H), BACK = new Uint32Array(W * H), FRONT = new Uint32Array(W * H);
    const SX = 211, SY = 80, SR = 13;
    const HAZE = '#e06a5a';

    // ---------- the sunset sky ----------
    const SKY = ['#1a1238', '#2e1648', '#4e1c5a', '#7a2462', '#aa3462', '#d84e56', '#f07848', '#fca24a', '#ffd070', '#fff0b0'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - SX, (y - SY) * 1.5);
      SKYB[y * W + x] = ramp(SKY, y / 128 + 0.3 * Math.exp(-sq(d / 90)) + 0.25 * Math.exp(-sq(d / 26)), x, y);
    }
    disc(SKYB, SX, SY, SR + 1.4, (dx, dy, d) => C(d * (SR + 1.4) < SR ? (d < 0.6 ? '#ffffff' : '#fff6d0') : '#ffe090'));

    // ---------- far mesas, hazed toward the glow ----------
    function mesas(topf, cols, rimC, haze) {
      const P = cols.map(h => C(mix(h, HAZE, haze))), R = C(rimC);
      for (let x = 0; x < W; x++) {
        const ty = Math.round(topf(x)), near = Math.exp(-sq((x - SX) / 70));
        for (let y = ty; y < H; y++) BACK[y * W + x] = y === ty ? (near > 0.2 ? R : P[0]) : ramp(P, (y - ty) / 18, x, y);
      }
    }
    const flat = (x, a, b, h, top) => (x > a && x < b) ? top : h;           // a flat-topped mesa
    mesas(x => Math.min(flat(x, 20, 70, 124, 98 + 2 * Math.sin(x / 5)), flat(x, 110, 150, 124, 106), flat(x, 262, 318, 124, 101), 112 + 4 * fbm1(x / 20, 2)),
      ['#9a3a5a', '#8a3458', '#7a2e54'], '#ffb070', 0.45);

    // ---------- the fork: a butte splitting into two spires, the sun in the notch ----------
    (function fork() {
      const cx = SX, base = 124, split = 96;
      const prongs = [{ x: -17, top: 44, w: 9 }, { x: 17, top: 54, w: 8 }];
      for (let y = 40; y < base; y++) for (let x = cx - 44; x <= cx + 44; x++) {
        const dx = x - cx, rough = (fbm1(y / 4, dx > 0 ? 3 : 4) - 0.5) * 3;
        let inside = false, edge = 0;
        if (y >= split) { const hw = 24 + (y - split) * 0.7 + rough; inside = Math.abs(dx) < hw; edge = hw - Math.abs(dx); }
        else for (const p of prongs) {
          const hw = p.w + (y - p.top) * 0.08 + rough, capY = p.top + p.w * 0.8;
          const inP = y < capY ? Math.hypot(dx - p.x, (y - capY) * 1.3) < hw : Math.abs(dx - p.x) < hw;
          if (inP && y >= p.top - p.w) { inside = true; edge = hw - Math.abs(dx - p.x); }
        }
        if (!inside) continue;
        // Backlit: a hot rim where the sun wraps the edges, deep purple within, strata lines.
        const strata = (y + Math.round(dx * 0.15)) % 6 === 0;
        const c = edge < 1.2 ? C('#ffb060') : edge < 2.2 ? C('#c0503a') : ramp(['#5a1e3e', '#4a1838', '#3a1430', '#2c1028'].map(C), (y - 40) / 90 + (strata ? 0.3 : 0), x, y);
        put(BACK, x, y, c);
      }
    })();

    // ---------- the valley floor: sand, the dry riverbed, the town, the railroad ----------
    const VALLEY = ['#e89a60', '#c8744e', '#a45a4a', '#7a4046'].map(C);
    for (let y = 120; y < H; y++) for (let x = 0; x < W; x++) {
      const bed = Math.abs(x - (170 + (y - 120) * -0.9 + 14 * Math.sin((y - 120) / 11))) < 2 + (y - 120) * 0.14;
      let t = (y - 120) / 70 - 0.3 * Math.exp(-sq((x - SX) / 80)) + (hash(x >> 1, y) > 0.92 ? 0.15 : 0);
      BACK[y * W + x] = bed ? ramp(['#f0c890', '#c89a78', '#8a6a6a'].map(C), (y - 120) / 70, x, y) : ramp(VALLEY, t, x, y);
    }
    // The town: false-fronted buildings, a water tower.
    const TOWN = [[40, 12, 14], [54, 10, 11], [66, 14, 16], [82, 9, 10], [93, 12, 13]];
    const TOWN_WIN = [];
    for (const [bx, bw, bh] of TOWN) {
      const base = 136;
      for (let y = base - bh; y < base; y++) for (let x = bx; x < bx + bw; x++) put(BACK, x, y, C(x === bx + bw - 1 ? '#4a1e30' : (x - bx) % 3 === 0 ? '#5a2a36' : '#6e3440'));
      for (let x = bx; x < bx + bw; x++) put(BACK, x, base - bh, C('#ff9a5a'));                    // sunlit cornice
      rect(BACK, bx - 1, base - 5, bw + 2, 1, C('#3a1628'));                                        // porch roof
      TOWN_WIN.push([bx + 2, base - bh + 4], [bx + bw - 4, base - bh + 4]);
    }
    for (let y = 108; y < 136; y++) { put(BACK, 112, y, C('#3a1628')); put(BACK, 120, y, C('#3a1628')); }
    for (let y = 104; y < 116; y++) for (let x = 109; x < 124; x++) put(BACK, x, y, C(x > 120 ? '#3a1628' : y === 104 ? '#ff9a5a' : '#5a2436'));
    // Railroad: rails across the plain onto a trestle over the riverbed.
    const RAIL = 130;
    const TRESTLE = [142, 214];
    for (let x = 0; x < W; x++) { put(BACK, x, RAIL, C('#2a1424')); put(BACK, x, RAIL + 1, C('#6a3a40')); }
    for (let x = TRESTLE[0]; x <= TRESTLE[1]; x++) for (let y = RAIL + 2; y < 150; y++) {
      const k = (x - TRESTLE[0]) % 12, lattice = k === 0 || Math.abs(k - (y - RAIL) % 12) < 1 || Math.abs(12 - k - (y - RAIL) % 12) < 1;
      if (lattice) put(BACK, x, y, C('#2a1424'));
    }

    // ---------- foreground cliffs framing the gulch, in shadow ----------
    const CLIFF = ['#6a2a3a', '#521f34', '#3e182e', '#2c1026', '#1c0a1a'].map(C);
    const leftTop = x => 150 + (x - 120) * 0.02 + 3 * Math.sin(x / 9) + (x > 96 ? (x - 96) * 1.8 : 0);
    const rightTop = x => 164 - (x - 250) * 0.15 + 3 * Math.sin(x / 7) + (x < 262 ? (262 - x) * 1.6 : 0);
    for (let x = 0; x < W; x++) {
      for (const [topf, lit] of [[leftTop, x > 70], [rightTop, false]]) {
        const ty = Math.round(topf(x));
        if (ty >= H) continue;
        for (let y = Math.max(0, ty); y < H; y++) {
          const dy = y - ty, strata = (y + Math.round(x * 0.1)) % 5 === 0;
          let c = dy === 0 ? C(lit ? '#ffa060' : '#c05a44') : dy === 1 ? C('#8a3a40') : ramp(CLIFF, dy / 30 + (strata ? 0.2 : 0) + (hash(x >> 1, y >> 1) > 0.9 ? -0.15 : 0), x, y);
          FRONT[y * W + x] = c;
        }
      }
    }
    // Cacti on the cliffs: saguaros and prickly pear, silhouetted with a warm rim.
    function sil(b, pts, rimC) {
      const set = new Set(pts.map(([x, y]) => x + ',' + y));
      for (const [x, y] of pts) put(b, x, y, set.has((x + 1) + ',' + y) ? C('#1a0a18') : C(rimC));
    }
    function saguaro(x, base, h, arms) {
      const pts = [];
      const col = (cx, y0, y1, w) => { for (let y = y0; y <= y1; y++) for (let i = -w; i <= w; i++) if (y > y0 || Math.abs(i) < w) pts.push([cx + i, y]); };
      col(x, base - h, base, 2);
      for (const [dir, ay, ah] of arms) { for (let i = 2; i <= 5; i++) for (let j = 0; j < 3; j++) pts.push([x + dir * i, base - ay + j]); col(x + dir * 6, base - ay - ah, base - ay + 2, 1); }
      sil(FRONT, pts, '#ff9a50');
    }
    saguaro(22, 156, 30, [[-1, 12, 10], [1, 18, 8]]);
    saguaro(292, 170, 24, [[-1, 10, 8]]);
    saguaro(312, 166, 16, []);

    // ---------- animated ----------
    const CLOUDS = [
      { s: K.cloud(90, 14, 4, ['#6a2a6a', '#8a3a6a', '#b04a6a', '#e0685e', '#ff9a60'], '#ffd080'), x0: 40, y: 34, k: 1 },
      { s: K.cloud(130, 16, 8, ['#5a2462', '#7a3068', '#a0406a', '#d05c60', '#ff8a5a'], '#ffc070'), x0: 260, y: 58, k: 1 },
      { s: K.cloud(70, 11, 12, ['#4a1e5a', '#6a2a62', '#8a3a66', '#c0505e', '#f07a58'], '#ffb060'), x0: 420, y: 18, k: 2 },
    ];
    const HAWKS = [0, 1];
    const WEEDS = [0, 1, 2].map(i => ({ p: i / 3, k: 3 + i, y: 150 + i * 10 }));
    const DUST = Array.from({ length: 40 }, (_, i) => ({ s: hash(i, 1), k: 4 + (i % 4), p: hash(i, 2) }));
    const vignette = K.vignette(C('#0e0614'), 0.4, 0.4);
    const RIDER = { x: 58, y: Math.round(leftTop(58)) };

    function train(u) {
      const v = frac(2 * u), x0 = W + 30 - v * (W + 160), y = RAIL;
      const dark = C('#1a0a18'), rim = C('#ff9a50');
      // Locomotive (facing left), tender and three cars.
      const parts = [[0, 14, 7], [16, 10, 6], [28, 16, 7], [46, 16, 7], [64, 16, 7]];
      for (const [off, w, h] of parts) {
        const x = Math.round(x0 + off);
        rect(buf, x, y - h, w, h, dark); rect(buf, x, y - h, w, 1, rim);
        if (off > 20) for (let wx = x + 2; wx < x + w - 2; wx += 4) put(buf, wx, y - h + 3, C('#ffc070'));
      }
      rect(buf, Math.round(x0) + 2, y - 11, 3, 4, dark);                                        // stack
      rect(buf, Math.round(x0) - 3, y - 3, 3, 3, dark);                                         // cowcatcher
      for (let i = 0; i < 14; i++) {
        const a = frac(u * 60 + i / 14), sx = x0 + 3 + a * 26, sy = y - 13 - a * 22 - Math.sin(a * 5) * 2, r = 1.2 + a * 4.5;
        for (let yy = Math.floor(sy - r); yy <= sy + r; yy++) for (let xx = Math.floor(sx - r); xx <= sx + r; xx++)
          if (Math.hypot(xx - sx, yy - sy) <= r) blendAt(buf, xx, yy, C(a < 0.3 ? '#f4e0d0' : '#c08a90'), (1 - a) * 0.4);
      }
    }

    // The lone rider, facing the sunset: a hand-placed silhouette with a warm rim where the
    // sun catches its right-hand edges. Frames swap the tail and the horse's head.
    const RIDER_ART = [
      '..........xxx...........',
      '........xxxxxxx.........',
      '..........xxx...........',
      '.........xxxxx..........',
      '........xxxxxxx.........',
      '........xxxxxx.x........',
      '.........xxxx...x....x..',
      '.........xxxx....x..xxx.',
      '........xxxxxx....xxxxx.',
      '...xxxxxxxxxxxxxxxxxxxxx',
      '..xxxxxxxxxxxxxxxxxx..xx',
      '.xxxxxxxxxxxxxxxxxx.....',
      '.xxxxxxxxxxxxxxxxxx.....',
      'x.xxxxxxxxxxxxxxxxx.....',
      'x..xxxxxxxxxxxxxxx......',
      'x..xx..xx.....xx..xx....',
      '...xx..x......x...xx....',
      '...x...x......x....x....',
      '...x...x......x....x....',
      '..xx..xx.....xx...xx....',
    ];
    function rider(u) {
      const x0 = RIDER.x - 12, y0 = RIDER.y - RIDER_ART.length, dark = C('#140814'), rim = C('#ffb060');
      const flick = Math.sin(TAU * 30 * u) > 0.6, graze = frac(6 * u) < 0.2;
      const cell = (i, j) => {
        if (flick && j >= 13 && j <= 15 && i === 0) return false;                  // tail flicks out...
        if (flick && j >= 12 && j <= 14 && i === 1 && j !== 13) return true;
        if (graze && j >= 6 && j <= 8 && i >= 17) return false;                   // ...head dips to graze
        if (graze && j >= 9 && j <= 11 && i >= 20) return true;
        return RIDER_ART[j] && RIDER_ART[j][i] === 'x';
      };
      for (let j = 0; j < RIDER_ART.length + 2; j++) for (let i = 0; i < 24; i++) if (cell(i, j)) put(buf, x0 + i, y0 + j, cell(i + 1, j) && cell(i, j - 1) ? dark : rim);
      // Scarf streaming in the wind.
      for (let k = 0; k < 7; k++) put(buf, x0 + 9 - k, y0 + 4 + Math.round(Math.sin(TAU * 60 * u - k * 0.8) * 0.8 + k * 0.25), C('#d03a3a'));
    }

    function frame(t) {
      const u = t / LOOP;
      buf.set(SKYB);
      for (const c of CLOUDS) K.blit(buf, c.s, frac(c.x0 / 520 + c.k * u) * 520 - 130, c.y);
      over(buf, BACK);
      // Heat shimmer over the valley floor.
      for (let y = 118; y < 126; y++) {
        const dx = Math.round(Math.sin(TAU * 40 * u + y * 0.9) * 0.9);
        if (!dx) continue;
        const row = buf.slice(y * W, y * W + W);
        for (let x = 130; x < W; x++) buf[y * W + x] = row[Math.min(W - 1, Math.max(0, x - dx))];
      }
      // Town lights coming on.
      TOWN_WIN.forEach(([x, y], n) => { const f = Math.sin(TAU * 17 * u + n * 1.7); rect(buf, x, y, 2, 2, C(f > -0.2 ? '#ffd070' : '#c87a40')); });
      train(u);
      // Hawks circling over the gulch.
      for (const h of HAWKS) {
        const a = TAU * (2 + h) * u + h * 3, x = 150 + h * 40 + Math.cos(a) * 26, y = 60 + h * 12 + Math.sin(a) * 7;
        const up = Math.sin(TAU * 50 * u + h) > 0.5;
        for (const [dx, dy] of up ? [[-4, -2], [-3, -1], [-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1], [3, -1], [4, -2]] : [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]) put(buf, x + dx, y + dy, C('#2a1022'));
      }
      // Tumbleweeds bouncing down the valley.
      for (const w of WEEDS) {
        const v = frac(w.k * u + w.p), tx = -20 + v * (W + 40), ty = w.y - Math.abs(Math.sin(v * TAU * 6)) * 7, ta = v * TAU * 10;
        for (let k = 0; k < 14; k++) {
          const a = ta + k / 14 * TAU, r = 2.5 + (k % 3) * 1.5;
          line(buf, tx + Math.cos(a) * r * 0.4, ty + Math.sin(a) * r * 0.4, tx + Math.cos(a + 0.9) * r, ty + Math.sin(a + 0.9) * r, C(k % 2 ? '#8a5040' : '#c89060'));
        }
      }
      over(buf, FRONT);
      rider(u);
      // Dust blowing off the cliff tops.
      for (const d of DUST) {
        const v = frac(d.k * u + d.p), x0 = d.s * W, top = x0 < 160 ? leftTop(x0) : rightTop(x0);
        if (top > H) continue;
        blendAt(buf, x0 + v * 30, top - 1 - Math.sin(v * Math.PI) * 5, C('#ffc890'), 0.5 * (1 - v));
      }
      vignette(buf);
    }

    return (t, out) => { buf = out; frame(t); };
  },
});
