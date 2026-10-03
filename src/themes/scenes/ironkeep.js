// The Iron Keep at night: the World 4 live background.
//
// A fortress of riveted iron under a cold moon. The only warmth is the forge on the left
// and the torches on the walls: orange light against blue-steel shadow. Rook-E's tower
// stands on the right, shaped like a rook; banners, chains, a portcullis gate and a
// cobbled yard.
// Moves: the smith's hammer strikes and throws sparks, the forge breathes, smoke rises,
// torches flicker, banners flap, a guard patrols the wall, clouds cross the moon, stars,
// embers drift, window lights.
LiveScenes.register({
  id: 'ironkeep',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, noiseLoop, fbm1, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over, rect, line, disc, glow } = K;
    let buf = null;

    const SKYB = new Uint32Array(W * H), BACK = new Uint32Array(W * H);
    const MX = 214, MY = 34;

    // ---------- sky, moon, mountains ----------
    const SKY = ['#06070f', '#0a0e1e', '#10182e', '#18243e', '#223250', '#2e4262'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - MX, y - MY);
      SKYB[y * W + x] = ramp(SKY, y / 120 + 0.35 * Math.exp(-sq(d / 40)), x, y);
    }
    disc(SKYB, MX, MY, 11, (dx, dy, d) => C(d > 0.9 ? '#b8c4dc' : [[-3, -2], [2, 3], [4, -4]].some(([cx, cy]) => Math.hypot(dx - cx, dy - cy) < 2) ? '#d4dcee' : '#eef2fa'));
    for (const [cols, top, seed] of [[['#1c2640', '#18203a'], x => 80 + 20 * fbm1(x / 34, 5), 5], [['#141a30', '#10152a'], x => 96 + 12 * fbm1(x / 22, 9), 9]]) {
      const P = cols.map(C);
      for (let x = 0; x < W; x++) { const ty = Math.round(top(x)); for (let y = ty; y < H; y++) SKYB[y * W + x] = y === ty ? C('#3a4a6a') : ramp(P, (y - ty) / 20, x, y); }
    }

    // ---------- iron walls ----------
    const IRON = ['#8a9ab4', '#5e6c86', '#46526a', '#323a4e', '#20263a'].map(C);
    const RIVET = C('#a8b8d0'), RIVETD = C('#141824');
    // Riveted plating: panels with a lit top-left edge, a dark bottom-right edge, rivets at the corners.
    function plate(x0, y0, w, h, pw, ph, light) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
        const lx = (x - x0) % pw, ly = (y - y0) % ph;
        let t = 0.55 - light(x, y);
        if (lx === 0 || ly === 0) t -= 0.25;
        if (lx === pw - 1 || ly === ph - 1) t += 0.3;
        let c = ramp(IRON, t, x, y);
        if ((lx === 2 || lx === pw - 3) && (ly === 2 || ly === ph - 3)) c = (x + y) % 2 ? RIVET : RIVETD;
        put(BACK, x, y, c);
      }
    }
    const moonLight = (x, y) => 0.15 * Math.exp(-sq((x - MX) / 90));
    const forgeLight = (x, y) => 0.35 * Math.exp(-sq((x - 40) / 50) - sq((y - 140) / 40));
    // Curtain wall with crenellations.
    const WALL_TOP = 92;
    plate(0, WALL_TOP, W, 50, 16, 12, (x, y) => moonLight(x, y) - (y - WALL_TOP) / 120);
    for (let x = 0; x < W; x += 16) plate(x, WALL_TOP - 8, 9, 8, 9, 8, moonLight);
    // Portcullis gate in the middle of the wall.
    for (let y = 104; y < 142; y++) for (let x = 138; x < 182; x++) {
      const arch = y < 116 && sq((x - 160) / 22) + sq((y - 116) / 12) > 1;
      if (arch) continue;
      const bar = (x - 138) % 5 === 0 || (y - 104) % 6 === 0;
      put(BACK, x, y, bar ? C('#3a4258') : C('#0a0c14'));
    }
    for (let x = 136; x < 184; x++) for (let y = 102; y < 106; y++) put(BACK, x, y, IRON[1]);

    // Rook-E's tower: a rook, crenellated crown, with lit windows.
    const TX = 262;
    (function tower() {
      plate(TX - 26, 50, 53, 92, 13, 10, (x, y) => 0.2 * (x < TX ? 1 : -0.5) + moonLight(x, y));
      plate(TX - 32, 40, 65, 12, 13, 12, (x, y) => (x < TX ? 0.25 : -0.1));
      for (let i = 0; i < 5; i++) plate(TX - 32 + i * 14, 28, 9, 12, 9, 12, (x, y) => (x < TX ? 0.25 : -0.1));
      for (let y = 36; y < 40; y++) for (let x = TX - 30; x <= TX + 30; x++) put(BACK, x, y, IRON[4]);
    })();
    const WINDOWS = [[TX - 13, 66], [TX + 7, 66], [TX - 3, 94], [60, 112], [100, 112], [214, 112]].map(([x, y]) => ({ x, y }));
    for (const w of WINDOWS) rect(BACK, w.x - 1, w.y - 1, 6, 10, IRON[4]);

    // The forge: a stone hut on the left with an open glowing mouth and a chimney.
    const STONE = ['#6a6a7a', '#4e4e5e', '#383846', '#262632'].map(C);
    for (let y = 104; y < 156; y++) for (let x = 6; x < 76; x++) {
      const roof = y < 112 + Math.abs(x - 41) * 0.3 - 10;
      if (roof) continue;
      const bx = (x + (Math.floor(y / 5) % 2) * 5) % 10, by = y % 5;
      let t = 0.5 - forgeLight(x, y) * 1.2;
      if (bx === 0 || by === 0) t += 0.35;
      put(BACK, x, y, ramp(STONE, t, x, y));
    }
    for (let y = 60; y < 104; y++) for (let x = 54; x < 66; x++) put(BACK, x, y, ramp(STONE, 0.45 + ((x + (y >> 2)) % 6 === 0 ? 0.3 : 0) + (x > 62 ? 0.3 : 0), x, y));
    const FORGE = { x: 24, y: 126, w: 30, h: 22 };
    for (let y = FORGE.y; y < FORGE.y + FORGE.h; y++) for (let x = FORGE.x; x < FORGE.x + FORGE.w; x++) {
      const arch = y < FORGE.y + 8 && sq((x - FORGE.x - 15) / 15) + sq((y - FORGE.y - 8) / 8) > 1;
      if (!arch) put(BACK, x, y, C('#1a0a08'));
    }
    // Anvil in front of the forge.
    const ANVIL = { x: 58, y: 164 };
    rect(BACK, ANVIL.x - 8, ANVIL.y - 8, 17, 3, C('#3a4052')); rect(BACK, ANVIL.x - 8, ANVIL.y - 8, 17, 1, C('#c8a080'));
    rect(BACK, ANVIL.x - 3, ANVIL.y - 5, 7, 5, C('#262a38')); rect(BACK, ANVIL.x - 6, ANVIL.y, 13, 2, C('#1c1e2a'));
    put(BACK, ANVIL.x + 9, ANVIL.y - 7, C('#3a4052')); put(BACK, ANVIL.x + 10, ANVIL.y - 7, C('#3a4052'));

    // Cobbled yard, lit warm near the forge, cold under the moon, dark at the front.
    const COB = ['#5a6078', '#444a60', '#30364a', '#20243a', '#141828'].map(C);
        // Rows of rounded stones, taller toward the viewer; each stone lit on top.
    let rowY = 142, row = 0;
    while (rowY < H) {
      const rh = Math.max(3, Math.round(3 + (rowY - 142) / 12)), sw = rh * 2 + 1, off = (row % 2) * Math.round(sw / 2);
      for (let y = rowY; y < Math.min(H, rowY + rh); y++) for (let x = 0; x < W; x++) {
        if (BACK[y * W + x]) continue;
        const lx = (x + off) % sw, ly = y - rowY, cell = hash(Math.floor((x + off) / sw), row);
        const edge = lx === 0 || ly === rh - 1 || (ly === 0 && (lx === 1 || lx === sw - 1));
        let t = 0.3 + (y - 142) / 110 + (cell - 0.5) * 0.25 - moonLight(x, y);
        if (ly === 0) t -= 0.2; else if (ly === rh - 2) t += 0.15;
        BACK[y * W + x] = edge ? COB[4] : ramp(COB, t, x, y);
      }
      rowY += rh; row++;
    }
    // Torches on posts in front of the wall.
    const TORCHES = [[118, 120], [202, 120], [300, 132]].map(([x, y], i) => ({ x, y, p: i * 1.7 }));
    for (const T of TORCHES) { rect(BACK, T.x - 1, T.y, 3, 22, C('#2a1e1e')); rect(BACK, T.x - 2, T.y - 2, 5, 3, C('#4a3a38')); }
    // Chains hanging from the tower.
    for (const cx of [TX - 30, TX + 30]) for (let y = 52; y < 120; y++) if (y % 3 !== 0) put(BACK, cx + ((y >> 1) % 2), y, C(y % 3 === 1 ? '#6a7890' : '#2a3040'));

    // ---------- animated bits ----------
    const CLOUDS = [
      { s: K.cloud(90, 16, 3, ['#2a3452', '#34405e', '#3e4a6a', '#4a5676', '#5a6886'], '#8a9ab8'), x0: 0, y: 26, k: 1 },
      { s: K.cloud(70, 12, 7, ['#222a46', '#2a3452', '#34405e', '#3e4a6a', '#4a5676'], '#7a8aa8'), x0: 240, y: 48, k: 1 },
      { s: K.cloud(110, 20, 9, ['#1a2038', '#222a46', '#2a3452', '#34405e', '#3e4a6a'], '#6a7a98'), x0: 330, y: 8, k: 2 },
    ];
    const STARS = Array.from({ length: 50 }, (_, i) => ({ x: hash(i, 1) * W | 0, y: hash(i, 2) * 70 | 0, k: 10 + (i % 23), p: hash(i, 3) * TAU }));
    const EMBERS = Array.from({ length: 30 }, (_, i) => ({ x: 20 + hash(i, 4) * 60, k: 4 + (i % 5), p: hash(i, 5), dr: hash(i, 6) * 30 }));
    const BANNERS = [[TX - 18, 52], [TX + 12, 52], [80, WALL_TOP + 2], [240 - 12, WALL_TOP + 2]].map(([x, y], i) => ({ x, y, p: i }));
    const vignette = K.vignette(C('#04050a'), 0.4, 0.4);

    function frame(t) {
      const u = t / LOOP;
      buf.set(SKYB);
      for (const s of STARS) if (Math.sin(TAU * s.k * u + s.p) > 0.2) put(buf, s.x, s.y, C(Math.sin(TAU * s.k * u + s.p) > 0.85 ? '#ffffff' : '#8a9ac8'));
      for (const c of CLOUDS) K.blit(buf, c.s, frac(c.x0 / 440 + c.k * u) * 440 - 110, c.y);
      over(buf, BACK);

      // The smith's rhythm: a strike every 1.5 s throws a burst of sparks off the anvil.
      const beat = frac(80 * u), strike = beat < 0.08;
      const fb = 0.75 + 0.15 * Math.sin(TAU * 17 * u) + 0.1 * Math.sin(TAU * 71 * u) + (strike ? 0.2 : 0);
      glow(buf, FORGE.x + 15, FORGE.y + 14, 60, C('#ff8a3a'), 0.32 * fb);
      // Glowing coals along the bottom, flames licking up above them.
      for (let x = FORGE.x + 2; x < FORGE.x + FORGE.w - 2; x++) for (let y = FORGE.y + FORGE.h - 5; y < FORGE.y + FORGE.h; y++) {
        const hot = Math.sin(TAU * (9 + (x % 4) * 3) * u + x * 1.7 + y) * 0.5 + 0.5;
        put(buf, x, y, C((x + y) % 3 === 0 ? '#5a1a10' : hot > 0.7 ? '#ffd060' : hot > 0.3 ? '#ff8a2a' : '#c83a1a'));
      }
      for (let i = 0; i < 4; i++) K.flame(buf, FORGE.x + 3 + i * 6, FORGE.y + FORGE.h - 5, 7, 11 * fb, u, i * 2.3);
      glow(buf, 56, 170, 70, C('#ff8a3a'), 0.22 * fb);
      glow(buf, ANVIL.x, ANVIL.y - 10, 24, C('#ffb060'), strike ? 0.45 : 0.08);
      for (let i = 0; i < 16; i++) {
        const age = beat * 1.5, a = -Math.PI / 2 + (hash(i, 50) - 0.5) * 2.4, sp = 20 + hash(i, 51) * 30;
        if (age > 0.6) break;
        const x = ANVIL.x + Math.cos(a) * sp * age, y = ANVIL.y - 9 + Math.sin(a) * sp * age + 40 * age * age;
        put(buf, x, y, C(age < 0.25 ? '#fff6c0' : '#ff9a40'));
      }
      // Hammer: up, then down on the beat.
      const hy = strike ? ANVIL.y - 11 : ANVIL.y - 18 - Math.round(Math.sin(Math.PI * beat) * 3);
      line(buf, ANVIL.x + 4, hy - 1, ANVIL.x + 10, hy + 5, C('#5a3a2a')); rect(buf, ANVIL.x + 1, hy - 2, 5, 3, C('#8a96aa'));

      // Chimney smoke and embers.
      for (let i = 0; i < 16; i++) {
        const v = frac(12 * u + i / 16), x = 60 + v * 18 + Math.sin(v * 5 + i) * 2, y = 58 - v * 50, r = 1 + v * 4;
        for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++)
          if (Math.hypot(xx - x, yy - y) <= r) blendAt(buf, xx, yy, C(v < 0.3 ? '#5a4a52' : '#2a3044'), (1 - v) * 0.3);
      }
      for (const e of EMBERS) {
        const v = frac(e.k * u + e.p), x = e.x + Math.sin(v * 8 + e.dr) * 4 + v * 10, y = 150 - v * 110;
        if (v < 0.8) put(buf, x, y, C(v < 0.3 ? '#ffd070' : v < 0.6 ? '#ff8a30' : '#a83a20'));
      }
      // Windows and torches.
      WINDOWS.forEach((w, n) => {
        const f = 0.5 + 0.3 * Math.sin(TAU * 29 * u + n * 2) + 0.2 * Math.sin(TAU * 73 * u + n);
        rect(buf, w.x, w.y, 4, 8, C(f > 0.7 ? '#ffd080' : f > 0.35 ? '#ffa850' : '#d86a30'));
        rect(buf, w.x + 1, w.y, 1, 8, C('#2a1e20')); rect(buf, w.x, w.y + 3, 4, 1, C('#2a1e20'));
      });
      for (const T of TORCHES) {
        const f = 0.8 + 0.2 * Math.sin(TAU * 61 * u + T.p) * Math.sin(TAU * 19 * u + T.p);
        glow(buf, T.x, T.y - 4, 30, C('#ff9a40'), 0.28 * f);
        K.flame(buf, T.x - 2, T.y - 2, 5, 8, u, T.p);
      }
      // Banners flapping in the night wind.
      for (const B of BANNERS) for (let j = 0; j < 22; j++) for (let i = 0; i < 9; i++) {
        const wave = Math.round(Math.sin(TAU * 20 * u - j * 0.35 + B.p) * (j / 22) * 2);
        const tail = j > 17 && Math.abs(i - 4) < j - 17;
        if (tail) continue;
        const c = i === 0 || i === 8 ? '#e8b040' : (wave > 0 ? '#a82a34' : '#7a1e2e');
        put(buf, B.x + i + wave, B.y + j, C(j === 8 && i > 2 && i < 6 ? '#e8b040' : c));
      }
      // A guard patrolling the wall.
      const gv = frac(3 * u), gx = gv < 0.5 ? 20 + gv * 2 * 180 : 200 - (gv - 0.5) * 2 * 180, step = Math.floor(t * 4) % 2;
      rect(buf, gx - 1, WALL_TOP - 16, 3, 7, C('#10121c')); disc(buf, gx, WALL_TOP - 18, 1.6, C('#10121c'));
      put(buf, gx - 1 + step, WALL_TOP - 9, C('#10121c')); put(buf, gx + 1 - step, WALL_TOP - 9, C('#10121c'));
      line(buf, gx + 3, WALL_TOP - 24, gx + 3, WALL_TOP - 9, C('#3a4050')); put(buf, gx + 3, WALL_TOP - 25, C('#c8d0e0'));
      vignette(buf);
    }

    return (t, out) => { buf = out; frame(t); };
  },
});
