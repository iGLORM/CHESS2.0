// The Obsidian Court: the World 10 live background.
//
// Checkmate's throne room of black volcanic glass, built over a river of lava. A black
// throne on a dais, obsidian pillars catching violet highlights above and lava glow
// below, and Checkmate's giant hourglass, whose sand never stops falling. Molten orange
// against cold violet glass.
// Moves: the lava flows and bubbles, sand pours through the hourglass, embers and ash
// rise, heat shimmers above the lava, reflections ripple across the glossy floor, violet
// glints travel down the pillars, chains sway.
LiveScenes.register({
  id: 'obsidiancourt',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, noiseLoop, noise2, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over, rect, line, disc, glow } = K;
    let buf = null;

    const BACK = new Uint32Array(W * H), LAVA_MASK = new Uint8Array(W * H);
    const GLASS = ['#3a2e4a', '#261e34', '#181224', '#0e0a16', '#07050c'].map(C);
    const VIOLET = C('#9a7ad0'), VIOLET2 = C('#5a4880');
    const LAVA = ['#fff0a0', '#ffc040', '#ff7a1a', '#d03a0a', '#7a1a08', '#3a0e08'].map(C);
    const LAVA_Y = 168;

    // ---------- the hall: back wall of glass slabs, fading up into darkness ----------
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const slab = Math.floor(x / 40), edge = x % 40 === 0;
      const warm = Math.exp(-sq((y - LAVA_Y) / 50));
      let t = 0.95 - (y / 140) * 0.45 - warm * 0.2 + (hash(slab, 3) - 0.5) * 0.12;
      const i = y * W + x;
      BACK[i] = edge ? GLASS[4] : ramp(GLASS, t, x, y);
      if (!edge && (x % 40) === 1 && y > 30 && y < 120) BACK[i] = VIOLET2;              // glass bevel catching the light
    }
    // The dais and throne, dim at the back.
    for (let s = 0; s < 4; s++) rect(BACK, 132 + s * 5, 132 - s * 4, 56 - s * 10, 4, s % 2 ? GLASS[1] : GLASS[2]);
    for (let s = 0; s < 4; s++) for (let x = 132 + s * 5; x < 188 - s * 5; x++) put(BACK, x, 132 - s * 4, C('#8a4a3a'));
    (function throne() {
      const cx = 160, base = 116;
      for (let y = 62; y < base; y++) {
        const back = y < 94, hw = back ? 9 - Math.max(0, (70 - y)) * 0.5 : 15;
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
          const l = x - Math.round(cx - hw), r = Math.round(cx + hw) - x;
          put(BACK, x, y, l === 0 ? VIOLET : l === 1 ? VIOLET2 : r === 0 ? GLASS[4] : y > base - 4 ? C('#8a4a3a') : GLASS[back ? 2 : 1]);
        }
      }
      // Spikes crowning the back.
      for (const [dx, h] of [[-8, 10], [-4, 14], [0, 18], [4, 14], [8, 10]]) for (let j = 0; j < h; j++) put(BACK, cx + dx, 62 - j, j < h - 2 ? GLASS[3] : VIOLET);
      for (let x = cx - 15; x <= cx + 15; x++) put(BACK, x, 94, C('#8a4a3a'));
    })();
    // Pillars: faceted glass, violet above, lava-lit below.
    const PILLARS = [[26, 22], [78, 16], [242, 16], [296, 22]];
    for (const [px, pw] of PILLARS) for (let y = 0; y < LAVA_Y; y++) for (let x = px - pw / 2; x < px + pw / 2; x++) {
      const rel = (x - (px - pw / 2)) / pw, warm = Math.exp(-sq((y - LAVA_Y) / 40));
      let c;
      if (rel < 0.15) c = warm > 0.3 ? C('#c86a3a') : VIOLET;
      else if (rel < 0.35) c = ramp(GLASS, 0.3, x, y);
      else if (rel > 0.85) c = GLASS[4];
      else c = ramp(GLASS, 0.6 + rel * 0.3 - warm * 0.3, x, y);
      if (warm > 0.4 + bay(x, y) * 0.4 && rel > 0.15 && rel < 0.85) c = ramp(['#8a3a24', '#5a2a24', '#3a1e22'].map(C), 1 - warm, x, y);
      put(BACK, x, y, c);
    }
    // Obsidian walkway (the floor) with glossy reflections.
    const FLOOR = 140;
    for (let y = FLOOR; y < LAVA_Y; y++) for (let x = 0; x < W; x++) {
      const tileEdge = (x + Math.round((y - FLOOR) * (x - 160) / 60)) % 32 === 0 || (y - FLOOR) % 9 === 0;
      BACK[y * W + x] = tileEdge ? C('#3a2e4a') : ramp(GLASS, 0.55 + (y - FLOOR) / 60, x, y);
    }
    for (let x = 0; x < W; x++) { put(BACK, x, LAVA_Y - 1, C('#8a4a3a')); put(BACK, x, LAVA_Y, C('#2a0e0a')); }
    // Lava river below the walkway.
    for (let y = LAVA_Y + 1; y < H; y++) for (let x = 0; x < W; x++) LAVA_MASK[y * W + x] = 1;
    // Chains from the dark ceiling.
    const CHAINS = [[110, 70], [210, 60], [52, 40]].map(([x, len], i) => ({ x, len, p: i * 2 }));

    // ---------- Checkmate's hourglass (right of the throne) ----------
    const HG = { x: 212, top: 58, mid: 88, bot: 118, r: 14 };
    function hourglass(u) {
      const glassW = y => {
        const d = y < HG.mid ? (y - HG.top) / (HG.mid - HG.top) : (HG.bot - y) / (HG.bot - HG.mid);
        return 1.5 + (HG.r - 1.5) * Math.sin(Math.PI / 2 * (1 - Math.pow(Math.max(0, 1 - d), 1)) ) * (d < 0.9 ? 1 : 1);
      };
      const hw = y => { const d = y < HG.mid ? (HG.mid - y) / (HG.mid - HG.top) : (y - HG.mid) / (HG.bot - HG.mid); return 1.5 + (HG.r - 1.5) * Math.sin(Math.PI / 2 * Math.min(1, d * 1.25)); };
      // Frame: plates top and bottom, posts either side.
      rect(buf, HG.x - HG.r - 5, HG.top - 4, 2 * HG.r + 11, 4, C('#5a3a2a')); rect(buf, HG.x - HG.r - 5, HG.bot, 2 * HG.r + 11, 4, C('#5a3a2a'));
      rect(buf, HG.x - HG.r - 5, HG.top - 4, 2 * HG.r + 11, 1, C('#d8a060')); rect(buf, HG.x - HG.r - 5, HG.bot, 2 * HG.r + 11, 1, C('#d8a060'));
      for (const px of [HG.x - HG.r - 4, HG.x + HG.r + 4]) rect(buf, px, HG.top, 2, HG.bot - HG.top, C('#3a2420'));
      const topSand = HG.top + 14, botSand = HG.bot - 12;
      for (let y = HG.top; y < HG.bot; y++) {
        const w = hw(y);
        for (let x = Math.round(HG.x - w); x <= Math.round(HG.x + w); x++) {
          const edge = Math.abs(x - HG.x) > w - 1;
          const sand = (y < HG.mid && y > topSand) || (y > botSand && y < HG.bot);
          if (sand) put(buf, x, y, C((x + y) % 5 === 0 ? '#ffe8a0' : x < HG.x ? '#f0c060' : '#c89040'));
          else if (edge) put(buf, x, y, C(x < HG.x ? '#c8b8f0' : '#6a5a90'));
          else blendAt(buf, x, y, C('#8a7ab0'), 0.15);
        }
      }
      // Top of the lower pile: a little cone, and the stream pouring in.
      for (let j = 0; j < 4; j++) for (let i = -j * 2; i <= j * 2; i++) put(buf, HG.x + i, botSand - 3 + j, C('#f0c060'));
      for (let y = HG.mid - 2; y < botSand - 3; y++) put(buf, HG.x + ((y + Math.floor(u * LOOP * 20)) % 3 === 0 ? 1 : 0), y, C('#ffe8a0'));
      for (let k = 0; k < 6; k++) { const v = frac(24 * u + k / 6); put(buf, HG.x + (hash(k, 9) - 0.5) * 2, HG.mid + v * (botSand - HG.mid - 3), C('#fff4c0')); }
      // The sand dimple sinking into the top pile.
      put(buf, HG.x, topSand + 1, C('#c89040')); put(buf, HG.x - 1, topSand, C('#c89040')); put(buf, HG.x + 1, topSand, C('#c89040'));
      glow(buf, HG.x, HG.mid + 10, 22, C('#ffd070'), 0.1);
    }

    // Noise that loops in x (period P) and is smooth in y.
    function lavaN(xs, ys, P, seed) {
      const j = Math.floor(ys), f = ys - j, s = f * f * (3 - 2 * f);
      return noiseLoop(xs, j + seed, P) * (1 - s) + noiseLoop(xs, j + 1 + seed, P) * s;
    }

    // ---------- animated ----------
    const EMBERS = Array.from({ length: 50 }, (_, i) => ({ x: hash(i, 1) * W, k: 2 + (i % 5), p: hash(i, 2), w: hash(i, 3) * TAU, ash: i % 4 === 0 }));
    const GLINTS = PILLARS.map(([px, pw], i) => ({ x: px - pw / 2 + 1, k: 3 + i }));
    const vignette = K.vignette(C('#030206'), 0.45, 0.35);
    const LAVA_DARK = LAVA.slice(4), LAVA_GLOW = C('#ff6a20');
    const glowList = [], glowA = [];
    for (let y = FLOOR - 70; y < LAVA_Y; y++) {
      const a = Math.exp(-sq((y - LAVA_Y) / 44)) * 0.42;
      for (let x = 0; x < W; x++) if (a > 0.02 && a > bay(x, y) * 0.35) { glowList.push(y * W + x); glowA.push(a); }
    }
    const GLOW_IDX = Int32Array.from(glowList), GLOW_A = Float32Array.from(glowA);

    function frame(t) {
      const u = t / LOOP;
      buf.set(BACK);
      // Lava: two looping noise layers flowing right, crust cracks, bubbles.
      for (let y = LAVA_Y + 1; y < H; y++) {
        const d = (y - LAVA_Y) / (H - LAVA_Y);
        for (let x = 0; x < W; x += 2) {
          // Big molten shapes flowing right; dark crust veins where the noise crosses its bands.
          // (Noise per pixel pair: the lava is the most expensive part of the frame.)
          const n = lavaN(x / 34 - 10 * u, y / 7, 10, 3) * 0.7 + lavaN(x / 12 - 27 * u, y / 4, 27, 31) * 0.3;
          const vein = Math.abs(frac(n * 4) - 0.5) < 0.07;
          for (let xx = x; xx < x + 2; xx++) buf[y * W + xx] = vein ? ramp(LAVA_DARK, 0.2 + d * 0.8, xx, y) : ramp(LAVA, 0.9 - n * 1.1 + d * 0.35, xx, y);
        }
      }
      for (let b = 0; b < 5; b++) {
        const v = frac(10 * u + b / 5), bx = 20 + hash(b, 7) * 280, by = LAVA_Y + 8 + hash(b, 8) * 22, r = v < 0.7 ? v * 4 : (1 - v) * 9;
        disc(buf, bx, by, Math.max(0.6, r), (dx, dy, d) => d > 0.7 ? LAVA[1] : LAVA[0]);
      }
      // Lava glow up the hall, breathing.
      const breathe = 0.85 + 0.15 * Math.sin(TAU * 5 * u);
      for (let k = 0; k < GLOW_IDX.length; k++) blend(buf, GLOW_IDX[k], LAVA_GLOW, GLOW_A[k] * breathe);
      // Reflections on the glossy floor.
      for (let y = FLOOR + 2; y < LAVA_Y - 2; y += 3) for (let x = 0; x < W; x++)
        if (Math.sin(x * 0.2 + TAU * 15 * u + y) > 0.8) blendAt(buf, x, y, C('#ffb050'), 0.5);
      // Heat shimmer over the lava's edge.
      for (let y = FLOOR; y < LAVA_Y; y++) {
        const dx = Math.round(Math.sin(TAU * 30 * u + y * 0.8) * 0.8);
        if (!dx) continue;
        const row = buf.slice(y * W, y * W + W);
        for (let x = 0; x < W; x++) buf[y * W + x] = row[Math.min(W - 1, Math.max(0, x - dx))];
      }
      // Violet glints sliding down the pillars.
      for (const g of GLINTS) { const y = frac(g.k * u) * 200 - 20; for (let j = 0; j < 8; j++) put(buf, g.x, y + j, C(j < 3 ? '#ffffff' : '#c8b0ff')); }
      // Chains swaying.
      for (const ch of CHAINS) {
        const sw = Math.sin(TAU * 6 * u + ch.p) * 2;
        for (let j = 0; j < ch.len; j++) if (j % 3 !== 2) put(buf, ch.x + sw * j / ch.len + (j % 3 === 1 ? 1 : 0), j, C(j % 3 === 0 ? '#5a4a6a' : '#2a2234'));
      }
      hourglass(u);
      // Embers and ash rising.
      for (const e of EMBERS) {
        const v = frac(e.k * u + e.p), x = e.x + Math.sin(v * 6 + e.w) * 6 + v * 12, y = H - v * 190;
        if (e.ash) put(buf, x, y, C('#5a5060'));
        else if (v < 0.75) put(buf, x, y, C(v < 0.25 ? '#ffe080' : v < 0.5 ? '#ff8a2a' : '#a8300a'));
      }
      vignette(buf);
    }

    return (t, out) => { buf = out; frame(t); };
  },
});
