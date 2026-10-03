// <World name> at <moment>: <one line on the mood and the light>.
//
// 320x200 (exactly 4x smaller than the game's 1280x800), drawn in code and scaled up
// with nearest-neighbour. <The signature details, and what moves.> Every motion runs a
// whole number of cycles per loop, so the loop is seamless.
LiveScenes.register({
  id: 'SCENE_ID',
  width: 320,
  height: 200,
  loop: 120,
  still: 20,        // the moment used for the still picture (seconds)
  create() {
    const W = 320, H = 200, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, fbm1, blend } = PixelKit;
    const { put, blendAt, over } = PixelKit.surface(W, H);
    let buf = null;

    // ---------- light ----------
    const LX = 230, LY = 110;                       // where the main light sits
    const HAZE = '#d8a0a0';                         // the air colour far layers fade into

    // ---------- static layers (painted once) ----------
    const SKYB = new Uint32Array(W * H);            // opaque
    const BACK = new Uint32Array(W * H);            // 0 = transparent

    const SKY = ['#1a1a40', '#3a2e66', '#7a4684', '#d06a7c', '#f6ae66', '#ffe0a0'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - LX, (y - LY) * 1.25);
      SKYB[y * W + x] = ramp(SKY, y / 120 + 0.3 * Math.exp(-sq(d / 70)), x, y);
    }

    // A far ridge, hazed toward the sky, with a rim of light near the sun.
    const ridge = x => 112 + 18 * fbm1(x / 36, 5);
    const far = ['#8a70a6', '#7c64a0', '#a8809a'].map(h => C(mix(h, HAZE, 0.3)));
    for (let x = 0; x < W; x++) {
      const ty = Math.round(ridge(x));
      for (let y = ty; y < H; y++) BACK[y * W + x] = y === ty ? C(Math.abs(x - LX) < 60 ? '#ffd0a0' : '#b894c0') : ramp(far, (y - ty) / 30, x, y);
    }

    // Near ground in cool shade, lit on its crest.
    const ground = x => 160 + 6 * Math.sin(x / 40);
    const shade = ['#3a6452', '#2c4c48', '#213a40', '#182a36'].map(C);
    for (let x = 0; x < W; x++) {
      const ty = Math.round(ground(x));
      for (let y = ty; y < H; y++) BACK[y * W + x] = y === ty ? C('#e0c070') : ramp(shade, (y - ty) / 30, x, y);
    }

    // ---------- animated parts ----------
    const STARS = Array.from({ length: 30 }, (_, i) => ({
      x: hash(i, 1) * W | 0, y: hash(i, 2) * 40 | 0, k: 12 + (hash(i, 3) * 30 | 0), p: hash(i, 4) * TAU,
    }));
    const MOTES = Array.from({ length: 40 }, (_, i) => ({
      x0: hash(i, 5), y0: 80 + hash(i, 6) * 90, ky: 8 + (hash(i, 7) * 10 | 0), p: hash(i, 8) * TAU,
    }));
    const STAR = C('#fff6dc'), MOTE = C('#fff0c0');

    function frame(t) {
      const u = t / LOOP;
      buf.set(SKYB);
      for (const s of STARS) if (Math.sin(TAU * s.k * u + s.p) > 0.2) put(buf, s.x, s.y, STAR);
      over(buf, BACK);
      for (const m of MOTES) {
        const x = frac(m.x0 + u) * (W + 20) - 10, y = m.y0 + 4 * Math.sin(TAU * m.ky * u + m.p);
        blendAt(buf, x, y, MOTE, 0.7);
      }
    }

    return (t, out) => { buf = out; frame(t); };
  },
});
