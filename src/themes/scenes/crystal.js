// Soulbound Pixel: the World 11 live background (theme id `crystal`).
//
// The end of the journey: the Great Board itself, shattered and floating in glowing ether.
// Fragments of board drift and bob around Grandmaster X's crystal spire; the last intact
// piece of board is the platform in the foreground. Magenta crystal-light against cold
// cyan ether and deep space.
// Moves: board fragments bob and drift, crystal shards orbit the spire (passing in front
// and behind), the spire's core pulses, cracks in the platform glow, nebulae breathe,
// motes of ether rise, stars twinkle, arcs of energy flicker between shards.
LiveScenes.register({
  id: 'crystal',
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

    const SPACE = new Uint32Array(W * H), FRONT = new Uint32Array(W * H);
    const LIGHT = '#e8dfcf', DARK = '#2b0d36', MAG = '#d932ff', CYAN = '#5af0ff';

    // ---------- deep space with magenta and cyan nebulae ----------
    const SKY = ['#050508', '#0c0818', '#1a0c2c', '#2e1044', '#4a1660'].map(C);
    const NEB_C = ['#050508', '#081828', '#0e2a40', '#1a4a62'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const m = noise2(x / 60, y / 40, 1) * 0.7 + noise2(x / 20, y / 14, 2) * 0.3;
      const c = noise2(x / 50 + 9, y / 36, 5) * 0.7 + noise2(x / 16, y / 12, 6) * 0.3;
      const core = Math.exp(-sq((x - 160) / 90) - sq((y - 80) / 60));
      const tm = clamp((m - 0.45) * 2.2) + core * 0.35, tc = clamp((c - 0.5) * 2.4) * (1 - core);
      SPACE[y * W + x] = tc > tm ? ramp(NEB_C, tc, x, y) : ramp(SKY, tm, x, y);
    }

    // ---------- board fragments (sprites built once) ----------
    function fragment(cells, tw, th, skew, thick, seed) {
      const maxI = Math.max(...cells.map(c => c[0])) + 1, maxJ = Math.max(...cells.map(c => c[1])) + 1;
      const w = Math.ceil(maxI * tw + maxJ * skew) + 2, h = maxJ * th + thick + 2;
      const px = new Uint32Array(w * h), set = new Set(cells.map(([i, j]) => i + ',' + j));
      const at = (x, y) => {
        const jf = y / th, j = Math.floor(jf), i = Math.floor((x - jf * skew) / tw);
        return set.has(i + ',' + j) ? [i, j, (x - jf * skew) / tw - i, jf - j] : null;
      };
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const top = at(x, y);
        if (top) {
          const [i, j, fi, fj] = top, dark = (i + j + seed) % 2 === 1;
          const outer = (fi < 0.12 && !set.has((i - 1) + ',' + j)) || (fj < 0.2 && !set.has(i + ',' + (j - 1)));
          px[y * w + x] = outer ? C(CYAN) : C(dark ? (fi + fj < 0.5 ? '#4a1a5a' : DARK) : (fi + fj < 0.5 ? '#fffaf0' : LIGHT));
          continue;
        }
        for (let d = 1; d <= thick; d++) if (y - d >= 0 && at(x, y - d)) { px[y * w + x] = C(d === thick ? '#1a0a24' : d === 1 ? '#8a5aa0' : '#5a2a70'); break; }
      }
      return { w, h, px };
    }
    const shapes = [
      [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1]],
      [[0, 0], [1, 0], [2, 0], [1, 1]],
      [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
      [[0, 0], [1, 0], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
      [[0, 0], [1, 1], [1, 0]],
    ];
    const FRAGS = [
      { s: 0, x: 22, y: 36, sc: 1.2, k: 3 }, { s: 1, x: 262, y: 28, sc: 1.1, k: 2 }, { s: 2, x: 74, y: 104, sc: 0.8, k: 4 },
      { s: 3, x: 236, y: 98, sc: 0.8, k: 3 }, { s: 4, x: 110, y: 24, sc: 0.6, k: 2 }, { s: 5, x: 200, y: 56, sc: 0.6, k: 5 },
      { s: 3, x: 294, y: 132, sc: 1, k: 4 }, { s: 5, x: 16, y: 128, sc: 1, k: 3 },
    ].map((f, n) => ({ ...f, spr: fragment(shapes[f.s], Math.round(9 * f.sc), Math.round(5 * f.sc), Math.round(4 * f.sc), Math.max(2, Math.round(4 * f.sc)), n), p: hash(n, 3) * TAU }));
    FRAGS.sort((a, b) => a.sc - b.sc);

    // ---------- Grandmaster X's spire ----------
    const SP = { x: 160, base: 122 };
    const SPIRE = new Uint32Array(W * H);
    const SHARDS = [[0, 0, 11, 86], [-12, 6, 8, 58], [12, 4, 8, 66], [-22, 16, 6, 36], [21, 14, 6, 42], [-6, 12, 5, 30], [7, 10, 5, 34]];
    SHARDS.sort((a, b) => b[1] - a[1] || a[3] - b[3]);
    for (const [dx, dy, hw, h] of SHARDS) {
      const cx = SP.x + dx, base = SP.base + dy;
      for (let j = 0; j < h; j++) {
        // Pointed at both ends: the cluster floats.
        const w = j < h * 0.22 ? hw * (0.15 + 0.85 * j / (h * 0.22)) : j < h * 0.72 ? hw : hw * (h - j) / (h * 0.28);
        const y = base - j;
        for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
          const rel = (x - cx) / Math.max(1, w);
          let c = rel < -0.55 ? '#fff0ff' : rel < -0.1 ? '#f090ff' : rel < 0.45 ? '#b020e0' : '#6a1090';
          if (Math.abs(rel + 0.1) < 0.08 || Math.abs(rel - 0.45) < 0.06) c = '#ffd0ff';
          put(SPIRE, x, y, C(c));
        }
      }
    }

    // ---------- the platform: the last whole piece of board ----------
    const PL_Y = 150;
    for (let y = PL_Y; y < H; y++) {
      const Z = 1600 / (y - 100), off = (y - PL_Y);
      for (let x = 0; x < W; x++) {
        const X = (x - 160) * Z / 100, edgeX = 150 + off * 1.6 - Math.abs(Math.sin(y * 0.7)) * 3;
        if (Math.abs(x - 160) > edgeX) continue;
        const i = Math.floor(X / 6 + 50), j = Math.floor(Z / 3);
        const dark = (i + j) % 2 === 1, seam = frac(X / 6) < 0.08 || frac(Z / 3) < 0.1;
        let c = dark ? ramp([DARK, '#1e0828', '#12041a'].map(C), (y - PL_Y) / 60, x, y) : ramp([LIGHT, '#b8aca0', '#7a6a78'].map(C), (y - PL_Y) / 60 + 0.1, x, y);
        if (seam) c = C('#0a0410');
        if (y === PL_Y || Math.abs(x - 160) > edgeX - 1) c = C(CYAN);
        FRONT[y * W + x] = c;
      }
    }
    // Glowing cracks across the platform.
    const CRACKS = [];
    for (const [x0, y0, len, dir] of [[120, 156, 40, 0.5], [190, 160, 50, -0.4], [150, 176, 36, 0.2], [60, 188, 50, -0.3], [250, 184, 40, 0.5]]) {
      let x = x0, y = y0;
      for (let k = 0; k < len; k++) {
        x += 1; y += dir + (hash(k, x0) - 0.5) * 1.6;
        const i = Math.round(y) * W + Math.round(x);
        if (FRONT[i]) CRACKS.push(i);
      }
    }

    // ---------- animated ----------
    const STARS = Array.from({ length: 90 }, (_, i) => ({ x: hash(i, 1) * W | 0, y: hash(i, 2) * 150 | 0, k: 6 + (i % 29), p: hash(i, 3) * TAU, big: i % 11 === 0 }));
    const ORBIT = Array.from({ length: 9 }, (_, i) => ({ a: i / 9 * TAU, r: 44 + (i % 3) * 14, y: 70 + (i % 4) * 12, k: i % 2 ? 2 : 3, s: 2 + (i % 3) }));
    const MOTES = Array.from({ length: 40 }, (_, i) => ({ x: hash(i, 5) * W, k: 2 + (i % 4), p: hash(i, 6), w: hash(i, 7) * TAU, mag: i % 2 }));
    const MAGC = C(MAG), CYANC = C(CYAN);
    const vignette = K.vignette(C('#020104'), 0.4, 0.4);

    function shard(x, y, s, front) {
      for (let j = -s * 2; j <= s * 2; j++) {
        const w = s - Math.abs(j) / 2;
        for (let i = -w; i <= w; i++) put(buf, x + i, y + j, C(i < 0 ? (front ? '#ffe0ff' : '#c060e0') : (front ? '#d040ff' : '#6a1a90')));
      }
    }

    function frame(t) {
      const u = t / LOOP;
      buf.set(SPACE);
      const pulse = 0.5 + 0.5 * Math.sin(TAU * 10 * u);
      for (const s of STARS) {
        const v = Math.sin(TAU * s.k * u + s.p);
        if (v < 0) continue;
        put(buf, s.x, s.y, C(v > 0.85 ? '#ffffff' : s.x % 2 ? '#c8a0ff' : '#a0e8ff'));
        if (s.big && v > 0.7) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blendAt(buf, s.x + dx, s.y + dy, C('#e8d0ff'), 0.6);
      }
      // Fragments bob and drift.
      for (const f of FRAGS) {
        const x = f.x + 4 * Math.sin(TAU * (f.k - 1) * u + f.p), y = f.y + 5 * Math.sin(TAU * f.k * u + f.p * 2);
        glow(buf, x + f.spr.w / 2, y + f.spr.h / 2, f.spr.w * 0.8, CYANC, 0.08);
        K.blit(buf, f.spr, x, y);
      }
    // Shards behind the spire.
      const orbitPos = ORBIT.map(o => { const a = o.a + TAU * o.k * u; return { x: SP.x + Math.cos(a) * o.r, y: o.y + Math.sin(a) * 8, front: Math.sin(a) > 0, s: o.s }; });
      for (const p of orbitPos) if (!p.front) shard(p.x, p.y, p.s - 1, false);
      // The spire, its pulsing core.
      glow(buf, SP.x, SP.base - 40, 80, MAGC, 0.18 + 0.12 * pulse);
      const bob = Math.round(Math.sin(TAU * 4 * u) * 2);
      for (let i = 0; i < W * H; i++) { const v = SPIRE[i]; if (v) { const j = i + bob * W; if (j >= 0 && j < W * H) buf[j] = v; } }
      glow(buf, SP.x, SP.base - 44 + bob, 12, C('#ffffff'), 0.35 + 0.25 * pulse);
      // Energy arcs between neighbouring shards, now and then.
      if (frac(6 * u) < 0.08) {
        const a = orbitPos[Math.floor(frac(3 * u) * 9)], b = { x: SP.x, y: SP.base - 44 };
        let x = a.x, y = a.y;
        for (let k = 1; k <= 10; k++) { const nx = a.x + (b.x - a.x) * k / 10 + (hash(k, Math.floor(t * 20)) - 0.5) * 6, ny = a.y + (b.y - a.y) * k / 10 + (hash(k + 9, Math.floor(t * 20)) - 0.5) * 6; line(buf, x, y, nx, ny, C('#f8d0ff')); x = nx; y = ny; }
      }
      for (const p of orbitPos) if (p.front) shard(p.x, p.y, p.s, true);
      // The platform and its glowing cracks.
      over(buf, FRONT);
      for (let x = -44; x <= 44; x++) for (let y = -4; y <= 4; y++) if (sq(x / 44) + sq(y / 4.5) < 1 && bay(x & 3, y & 3) < 0.6) blendAt(buf, SP.x + x, PL_Y + 8 + y, MAGC, 0.25 + 0.15 * pulse);
      const cp = 0.5 + 0.5 * Math.sin(TAU * 6 * u);
      for (let k = 0; k < CRACKS.length; k++) buf[CRACKS[k]] = Math.sin(TAU * 12 * u - k * 0.3) > 0.2 ? CYANC : C(cp > 0.5 ? '#2aa0c0' : '#1a6a8a');
      // Ether motes rising.
      for (const m of MOTES) {
        const v = frac(m.k * u + m.p), x = m.x + Math.sin(v * 6 + m.w) * 5, y = H - v * 180;
        if (v < 0.9) blendAt(buf, x, y, m.mag ? MAGC : CYANC, 0.8 * (1 - v));
      }
      vignette(buf);
    }

    return (t, out) => { buf = out; frame(t); };
  },
});
