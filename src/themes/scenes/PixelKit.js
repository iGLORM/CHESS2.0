// Shared toolkit for the live pixel scenes (src/themes/scenes/*.js).
// Colours are packed as 32-bit ABGR ints (what a Uint32Array over ImageData holds on
// little-endian machines); write them with C('#rrggbb'). 0 means "transparent" in a
// layer buffer, so static layers can be composited with a plain non-zero copy.
const PixelKit = (() => {
  const TAU = Math.PI * 2;
  const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const hex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  // Mix two hex colours (build-time only: palettes, haze).
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };
  const C = h => { const [r, g, b] = rgb(h); return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; };
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  const sq = v => v * v;
  const frac = v => v - Math.floor(v);

  // 4x4 Bayer matrix: the ordered-dither threshold for a pixel, in (0, 1).
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const bay = (x, y) => BAY[((y & 3) << 2) | (x & 3)];

  // Pick along a list of colours at t (0..1). Dithering only happens in the middle
  // of each step, so gradients read as clean bands with patterned seams.
  function ramp(cols, t, x, y) {
    t = clamp(t) * (cols.length - 1);
    const i = t | 0, f = clamp((t - i - 0.5) * 2 + 0.5);
    return cols[Math.min(cols.length - 1, i + (f > bay(x, y) ? 1 : 0))];
  }

  // Deterministic noise: the same scene every time, on every machine.
  function hash(x, y) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function noise1(x, seed) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u; }
  // Noise that repeats every `period` units: scroll it by whole periods per loop and the
  // loop stays seamless (drifting fog, mist, flowing lava).
  function noiseLoop(x, seed, period) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    const m = n => ((n % period) + period) % period;
    return hash(m(i), seed) * (1 - u) + hash(m(i + 1), seed) * u;
  }
  // Smooth 2D value noise (0..1), for patches, clouds of texture, blotches.
  function noise2(x, y, seed = 0) {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const h = (a, b) => hash(a + seed * 1013, b);
    const top = h(i, j) * (1 - ux) + h(i + 1, j) * ux, bot = h(i, j + 1) * (1 - ux) + h(i + 1, j + 1) * ux;
    return top * (1 - uy) + bot * uy;
  }
  function fbm1(x, seed) { let a = 0, amp = 0.5, fr = 1; for (let o = 0; o < 4; o++) { a += amp * noise1(x * fr, seed + o * 17); fr *= 2; amp *= 0.5; } return a; }

  // Blend colour c over pixel i of buffer b by alpha a.
  function blend(b, i, c, a) {
    const d = b[i];
    const r = d & 255, g = d >> 8 & 255, bl = d >> 16 & 255;
    const r2 = c & 255, g2 = c >> 8 & 255, b2 = c >> 16 & 255;
    b[i] = (0xff000000 | ((bl + (b2 - bl) * a) << 16) | ((g + (g2 - g) * a) << 8) | (r + (r2 - r) * a)) >>> 0;
  }

  // Pixel writers and common shapes bound to a scene size (bounds-checked, rounded).
  function surface(W, H) {
    const put = (b, x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) b[y * W + x] = c; };
    const blendAt = (b, x, y, c, a) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) blend(b, y * W + x, c, a); };
    const k = {
      put,
      blendAt,
      // Copy a layer's non-transparent pixels onto b.
      over(b, layer) { for (let i = 0; i < layer.length; i++) { const v = layer[i]; if (v) b[i] = v; } },
      rect(b, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(b, x + i, y + j, c); },
      line(b, x0, y0, x1, y1, c) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
        for (let i = 0; i <= n; i++) put(b, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c);
      },
      // Filled disc; col(dx, dy, d) returns the colour (d = distance / r), or 0 to skip.
      disc(b, cx, cy, r, col) {
        for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
          const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) / r;
          if (d <= 1) { const c = typeof col === 'function' ? col(dx, dy, d) : col; if (c) put(b, x, y, c); }
        }
      },
      // Soft light: blends c over a disc, strongest in the middle (keep a <= 0.5).
      glow(b, cx, cy, r, c, a) {
        for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
          const d = Math.hypot(x - cx, y - cy) / r;
          if (d < 1) blendAt(b, x, y, c, a * (1 - d) * (1 - d));
        }
      },
      // A cloud sprite: round puffs on a flat base. cols: 5 colours top (cool) to bottom (lit), rim.
      cloud(w, h, seed, cols, rimCol) {
        const m = new Uint8Array(w * h), px = new Uint32Array(w * h), blobs = [];
        const n = Math.max(3, Math.round(w / 16));
        for (let i = 0; i < n; i++) {
          const bump = Math.sin(Math.PI * (i + 0.5) / n);
          const r = h * (0.3 + 0.62 * bump * (0.6 + 0.4 * hash(i, seed + 2)));
          blobs.push({ cx: clamp(w * (i + 0.5) / n + (hash(i, seed) - 0.5) * 8, r + 1, w - r - 2), cy: h - 1 - r * 0.35, r });
        }
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
          for (const bl of blobs) if (Math.hypot(x - bl.cx, (y - bl.cy) * 1.15) <= bl.r) { m[y * w + x] = 1; break; }
        const CL = cols.map(C), RIM = C(rimCol);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (!m[y * w + x]) continue;
          let c;
          if (y + 1 >= h || !m[(y + 1) * w + x]) c = RIM;
          else if (y === 0 || !m[(y - 1) * w + x]) c = CL[0];
          else { let dp = 0; while (y + dp + 1 < h && m[(y + dp + 1) * w + x]) dp++; c = ramp(CL, 1 - dp / Math.max(4, h * 0.8) + 0.15, x, y); }
          px[y * w + x] = c;
        }
        return { w, h, px };
      },
      // Draw a sprite {w, h, px} at x, y (0 pixels are transparent).
      blit(b, s, X, Y) {
        X = Math.round(X); Y = Math.round(Y);
        for (let y = 0; y < s.h; y++) {
          const yy = Y + y; if (yy < 0 || yy >= H) continue;
          for (let x = 0; x < s.w; x++) { const v = s.px[y * s.w + x], xx = X + x; if (v && xx >= 0 && xx < W) b[yy * W + xx] = v; }
        }
      },
      // Pixels darkened toward c at the edges; returns apply(buf).
      vignette(c, strength = 0.38, start = 0.3) {
        const list = [];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const v = ((x - W / 2) / (W / 2)) ** 2 * 0.55 + ((y - H / 2) / (H / 2)) ** 2 * 0.7;
          if (clamp((v - start) * 1.2) > bay(x, y)) list.push(y * W + x);
        }
        return buf => { for (const i of list) blend(buf, i, c, strength); };
      },
      // A flame: tongues licking up from a base, flickering with integer-k sines.
      flame(b, x, y, w, h, u, seed, cols = ['#fff4c0', '#ffd060', '#ff8a2a', '#c83a1a']) {
        const F = cols.map(C);
        for (let i = 0; i < w; i++) {
          const e = 1 - Math.abs((i - (w - 1) / 2) / (w / 2));
          const fl = 0.75 + 0.25 * Math.sin(TAU * (37 + (i % 3) * 11) * u + seed + i * 1.7);
          const hh = Math.max(1, Math.round(h * e * fl));
          for (let j = 0; j < hh; j++) put(b, x + i, y - j, F[Math.min(3, Math.floor((j / hh + (1 - e) * 0.6) * 3.2))]);
        }
      },
      // A gear: teeth around a rim, spokes, turned by angle. cols: [light, mid, dark, hole].
      gear(b, cx, cy, r, teeth, angle, cols) {
        const [L, M, D, O] = cols.map(C);
        for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
          const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) - angle;
          const tooth = Math.cos(a * teeth) > 0.2 ? 2 : 0;
          if (d > r + tooth) continue;
          let c;
          if (d < r * 0.22) c = d < r * 0.1 ? O : D;
          else if (d > r - 1.5) c = dy + dx * 0.4 < 0 ? L : D;
          else if (d < r * 0.72 && Math.cos((a) * 5) < 0.55) c = O;         // five spoke holes
          else c = dy + dx * 0.3 < -r * 0.2 ? L : M;
          put(b, x, y, c);
        }
      },
    };
    return k;
  }

  return { TAU, rgb, hex, mix, C, clamp, sq, frac, BAY, bay, ramp, hash, noise1, noiseLoop, noise2, fbm1, blend, surface };
})();

if (typeof module !== 'undefined') module.exports = PixelKit;
