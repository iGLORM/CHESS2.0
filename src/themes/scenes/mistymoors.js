// The Misty Moors before dawn: the World 5 live background.
//
// Knightsade's country: rolling moor under a setting moon, banks of teal fog, purple
// heather. A ruined watchtower keeps one warm lantern lit against all that cold; a ring
// of standing stones, a crag shaped like a knight's head, a dead tree with crows, a pool.
// Moves: fog banks drift at three depths, will-o'-wisps float and trail, crows circle and
// settle, the lantern flickers, the pool shimmers, heather and grass stir, stars fade.
LiveScenes.register({
  id: 'mistymoors',
  width: 320,
  height: 200,
  loop: 120,
  still: 25,
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, noiseLoop, noise2, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over, rect, line, disc, glow } = K;
    let buf = null;

    const SKYB = new Uint32Array(W * H), FAR = new Uint32Array(W * H), NEAR = new Uint32Array(W * H);
    const MASK = new Uint8Array(W * H);
    const MX = 70, MY = 58;
    const FOG = '#8ab8b0';

    // ---------- sky: night fading to a cold green dawn on the right ----------
    const SKY = ['#0a1220', '#101c2e', '#182a3c', '#22384a', '#34505a', '#4e6a66', '#7a8e78', '#b0b48a'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dawn = 0.18 * Math.exp(-sq((x - 300) / 110));
      SKYB[y * W + x] = ramp(SKY, y / 125 + dawn + 0.14 * Math.exp(-sq(Math.hypot(x - MX, y - MY) / 30)), x, y);
    }
    disc(SKYB, MX, MY, 13, (dx, dy, d) => C(d > 0.92 ? '#a8c4c0' : dx + dy > 6 ? '#c8dcd4' : '#e8f4ec'));

    // ---------- land: far moor, standing stones, knight crag, near moor ----------
    function moor(b, top, cols, rim, heather, seed) {
      const P = cols.map(C), R = C(rim), HE = heather.map(C);
      for (let x = 0; x < W; x++) {
        const ty = Math.round(top(x));
        for (let y = ty; y < H; y++) {
          const dy = y - ty, patch = noise2(x / 12, y / 4, seed) > 0.64;
          b[y * W + x] = dy === 0 ? R : patch ? ramp(HE, dy / 18 + (hash(x, y) > 0.8 ? -0.3 : 0), x, y) : ramp(P, dy / 22, x, y);
        }
      }
    }
    const topFar = x => 112 + 10 * fbm1(x / 45, 4) - 6 * Math.exp(-sq((x - 210) / 40));
    moor(FAR, topFar, ['#2a4448', '#243a40', '#1e3238'], '#4a6a66', ['#4a3a5a', '#3e3050'], 1);
    // Ring of standing stones on the far rise.
    for (let i = 0; i < 6; i++) {
      const x = 186 + i * 9, top = Math.round(topFar(x)), h = 7 + (i % 3) * 3;
      for (let y = top - h; y <= top; y++) for (let xx = x - 1; xx <= x + 1; xx++) put(FAR, xx, y, C(xx === x - 1 ? '#6a8a88' : '#34484e'));
      if (i === 2) for (let xx = x - 1; xx <= x + 10; xx++) put(FAR, xx, top - h - 1, C('#34484e'));
    }
    // The knight crag: a cliff on the right whose top is a horse's head in profile.
    (function crag() {
      const head = [
        '.......xxxx.....', '.....xxxxxxxx...', '....xxxxxxxxxxx.', '...xxxx.xxxxxxxx', '..xxxxxxxxxxxxxx',
        '.xxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxx..xxxxxxxxx', 'xx.....xxxxxxxxx', '......xxxxxxxxxx',
        '.....xxxxxxxxxxx', '....xxxxxxxxxxxx', '...xxxxxxxxxxxxx', '..xxxxxxxxxxxxxx'];
      const x0 = 262, y0 = 56, s = 3;
      head.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch !== 'x') return;
        for (let a = 0; a < s; a++) for (let bb = 0; bb < s; bb++) {
          const x = x0 + i * s + a, y = y0 + j * s + bb;
          const lit = row[i - 1] !== 'x' && a === 0;
          put(NEAR, x, y, C(lit ? '#5a7a7a' : (hash(x >> 1, y >> 1) > 0.85 ? '#1e2c34' : '#26363e')));
        }
      }));
      put(NEAR, x0 + 7 * s + 1, y0 + 3 * s + 1, C('#9ff0d0'));        // an eye that glints
      for (let y = y0 + 14 * s; y < H; y++) for (let x = x0 - (y - y0 - 14 * s) * 0.4; x < W; x++) put(NEAR, x, y, C(hash(x >> 2, y >> 2) > 0.8 ? '#1e2c34' : '#26363e'));
    })();
    // The ruined watchtower on the left, with a lantern in its window.
    const TWX = 44;
    (function tower() {
      for (let y = 40; y < 150; y++) {
        const hw = 13 + (y - 40) * 0.04, broken = y < 40 + Math.max(0, 10 - Math.abs(y - 40)) ;
        for (let x = Math.round(TWX - hw); x <= Math.round(TWX + hw); x++) {
          const ragged = y < 52 && (x - TWX) > 14 - (y - 40) * 2.2 + Math.sin(x) * 2;
          if (ragged) continue;
          const bx = (x + (Math.floor(y / 4) % 2) * 3) % 6, by = y % 4, rel = (x - (TWX - hw)) / (2 * hw);
          let c = rel < 0.2 ? '#6a8a86' : rel > 0.7 ? '#1e2a32' : '#34464c';
          if (bx === 0 || by === 0) c = '#1a242a';
          if (hash(x >> 1, y >> 1) > 0.9 && rel > 0.3) c = '#3a5a40';                 // ivy
          put(NEAR, x, y, C(c));
        }
      }
      rect(NEAR, TWX - 3, 70, 7, 10, C('#0a1014'));
      rect(NEAR, TWX - 4, 120, 9, 30, C('#0a1014'));
    })();
    // Dead tree with bare branches.
    const TREE = { x: 124, y: 142 };
    for (const [x0, y0, x1, y1] of [[124, 142, 122, 104], [122, 118, 108, 104], [123, 110, 136, 94], [108, 104, 100, 98], [136, 94, 146, 92], [122, 104, 118, 90], [130, 100, 128, 90]])
      { line(NEAR, x0, y0, x1, y1, C('#141c22')); line(NEAR, x0 + 1, y0, x1 + 1, y1, C('#1c262c')); }
    const PERCH = [[108, 103], [118, 89], [140, 92], [100, 97]];
    // Near moor and the pool.
    const topNear = x => x > 250 ? 999 : 142 + 6 * Math.sin(x / 30) + 3 * Math.sin(x / 11);
    for (let x = 0; x < W; x++) {
      const ty = Math.round(Math.min(topNear(x), 160 + (x - 250) * 0.3));
      for (let y = ty; y < H; y++) {
        if (NEAR[y * W + x] && y < 150) continue;
        const dy = y - ty, patch = noise2(x / 14, y / 5, 50) > 0.56;
        let c = dy === 0 ? C('#4a6a58') : patch ? ramp(['#7a4a8a', '#5a3a70', '#3e2a54', '#2a1e3c'].map(C), dy / 40, x, y) : ramp(['#2e4a40', '#243c36', '#1a2e2c', '#12201e'].map(C), dy / 40, x, y);
        NEAR[y * W + x] = c;
        if (patch && hash(x, y) > 0.96) MASK[y * W + x] = 1;
      }
    }
    const PX = 200, PY = 176;
    for (let y = PY - 7; y <= PY + 7; y++) for (let x = PX - 46; x <= PX + 46; x++) {
      const e = sq((x - PX) / 44) + sq((y - PY) / 6.5);
      if (e > 1) continue;
      NEAR[y * W + x] = e > 0.8 ? C('#1a2a28') : ramp(['#4a6a70', '#2e4852', '#1c303c', '#12202c'].map(C), (y - PY + 7) / 14, x, y);
      if (e <= 0.8) MASK[y * W + x] = 2;
    }
    const HEATHER_IDX = [], POOL_IDX = [];
    for (let i = 0; i < W * H; i++) { if (MASK[i] === 1) HEATHER_IDX.push(i); else if (MASK[i] === 2) POOL_IDX.push(i); }

    // ---------- animated ----------
    const STARS = Array.from({ length: 40 }, (_, i) => ({ x: hash(i, 1) * W | 0, y: hash(i, 2) * 60 | 0, k: 8 + (i % 19), p: hash(i, 3) * TAU }));
    const WISPS = Array.from({ length: 7 }, (_, i) => ({ x: 80 + hash(i, 4) * 200, y: 128 + hash(i, 5) * 40, k1: 1 + (i % 3), k2: 2 + (i % 4), kb: 6 + i, p: hash(i, 6) * TAU }));
    const CROWS = [0, 1, 2];
    const FOGC = C(FOG), FOGD = C('#4a7270');
    const vignette = K.vignette(C('#050a10'), 0.4, 0.4);

    // A fog bank: looping noise per 4-row strip (cheap), scrolled by k whole periods per loop.
    const fogCol = new Float32Array(W);
    function fogBand(y0, y1, k, scale, seed, col, a0, u) {
      const period = Math.ceil(W / scale) + 2;
      for (let y = y0; y < y1; y++) {
        if ((y - y0) % 4 === 0) for (let x = 0; x < W; x++)
          fogCol[x] = noiseLoop(x / scale + period * k * u, (y >> 2) + seed, period) * 0.75 + noiseLoop(x / (scale / 3) - period * 3 * k * u, (y >> 2) + seed + 9, period * 3) * 0.25;
        const fall = Math.sin(Math.PI * (y - y0) / (y1 - y0));
        for (let x = 0; x < W; x++) {
          const a = fogCol[x] * fall - 0.28;
          if (a > 0.03 + bay(x, y) * 0.25) blend(buf, y * W + x, col, a0 * clamp(a * 2.2));
        }
      }
    }

    function frame(t) {
      const u = t / LOOP;
      buf.set(SKYB);
      for (const s of STARS) { const v = Math.sin(TAU * s.k * u + s.p); if (v > 0.4 && s.x < 250) put(buf, s.x, s.y, C(v > 0.9 ? '#e8fff4' : '#6a8a90')); }
      over(buf, FAR);
      fogBand(98, 134, 1, 30, 1, FOGC, 0.6, u);
      over(buf, NEAR);
      // Lantern in the tower window.
      const f = 0.75 + 0.15 * Math.sin(TAU * 47 * u) + 0.1 * Math.sin(TAU * 113 * u);
      glow(buf, TWX, 75, 34, C('#ffb050'), 0.35 * f);
      rect(buf, TWX - 1, 72, 3, 5, C(f > 0.85 ? '#fff0b0' : '#ffc060')); put(buf, TWX, 71, C('#3a2a20'));
      // Heather stirring, pool shimmer with the moon's reflection.
      for (const i of HEATHER_IDX) if (Math.sin(TAU * 20 * u - (i % W) * 0.1) > 0.8) buf[i] = C('#a870b8');
      for (const i of POOL_IDX) {
        const x = i % W, y = (i / W) | 0;
        if (Math.abs(x - (PX - 20)) < 4 - (y - PY + 7) * 0.2 && Math.sin(y * 2.1 + TAU * 30 * u + x) > -0.3) buf[i] = C('#c8e0d8');
        else if (Math.sin(TAU * 25 * u + hash(x >> 1, y) * TAU) > 0.96) buf[i] = C('#8ab8b8');
      }
      // Crows: circle the tree, land on its branches, take off again.
      for (const c of CROWS) {
        const v = frac(2 * u + c / 3), perch = PERCH[c];
        let x, y, flying = v < 0.45;
        if (flying) { const a = TAU * v * 4 + c; x = TREE.x + Math.cos(a) * (30 + c * 6); y = 80 + Math.sin(a) * 10 - c * 4; }
        else { x = perch[0]; y = perch[1] - 2; }
        const up = flying && Math.sin(TAU * 150 * u + c) > 0;
        const pts = flying ? (up ? [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]] : [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]]) : [[0, 0], [0, -1], [1, -1], [-1, 0], [0, 1]];
        for (const [dx, dy] of pts) put(buf, x + dx, y + dy, C('#06080c'));
      }
      fogBand(126, 170, -1, 40, 5, FOGC, 0.55, u);
      // Will-o'-wisps.
      for (const w of WISPS) {
        const b = Math.sin(TAU * w.kb * u + w.p);
        if (b < -0.2) continue;
        const x = w.x + 14 * Math.sin(TAU * w.k1 * u + w.p), y = w.y + 5 * Math.sin(TAU * w.k2 * u + w.p * 2);
        glow(buf, x, y, 9, C('#9ff0d0'), 0.35 * (b + 0.2));
        for (let j = 1; j < 5; j++) blendAt(buf, x - 14 * Math.sin(TAU * w.k1 * (u - j * 0.0008) + w.p) + 14 * Math.sin(TAU * w.k1 * u + w.p) - j * 0.6 * Math.cos(TAU * w.k1 * u + w.p), y + j * 0.3, C('#9ff0d0'), 0.4 - j * 0.08);
        put(buf, x, y, C('#f0fff8'));
      }
      fogBand(168, 200, 2, 50, 9, FOGD, 0.5, u);
      vignette(buf);
    }

    return (t, out) => { buf = out; frame(t); };
  },
});
