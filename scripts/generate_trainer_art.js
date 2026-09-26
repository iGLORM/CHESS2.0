// Draws the five Training Camp trainers as pixel-art holograms and writes the
// same three portraits every story character has:
//   assets/textures/characters/{id}.png                (128x128, speech bubbles)
//   assets/textures/premium/premium_character_{id}.png      (280x360 card)
//   assets/textures/premium/premium_character_card_{id}.png (300x368 card)
// Run with: node scripts/generate_trainer_art.js   (no dependencies)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const W = 48, H = 56;   // art grid

/* ------------------------------------------------------------------ */
/*  Tiny raster + PNG encoder                                          */
/* ------------------------------------------------------------------ */

function image(w, h) { return { w, h, d: new Float32Array(w * h * 4) }; }

function blendPx(img, x, y, r, g, b, a) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= img.w || y >= img.h || a <= 0) return;
  const i = (y * img.w + x) * 4, d = img.d;
  const ia = d[i + 3], oa = a + ia * (1 - a);
  if (oa <= 0) return;
  d[i] = (r * a + d[i] * ia * (1 - a)) / oa;
  d[i + 1] = (g * a + d[i + 1] * ia * (1 - a)) / oa;
  d[i + 2] = (b * a + d[i + 2] * ia * (1 - a)) / oa;
  d[i + 3] = oa;
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function savePNG(img, file) {
  const raw = Buffer.alloc(img.h * (img.w * 4 + 1));
  for (let y = 0; y < img.h; y++) {
    raw[y * (img.w * 4 + 1)] = 0;
    for (let x = 0; x < img.w; x++) {
      const i = (y * img.w + x) * 4, o = y * (img.w * 4 + 1) + 1 + x * 4;
      raw[o] = Math.round(Math.min(255, img.d[i]));
      raw[o + 1] = Math.round(Math.min(255, img.d[i + 1]));
      raw[o + 2] = Math.round(Math.min(255, img.d[i + 2]));
      raw[o + 3] = Math.round(Math.min(1, img.d[i + 3]) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.w, 0); ihdr.writeUInt32BE(img.h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
}

/* ------------------------------------------------------------------ */
/*  Pixel art drawing on the 48x56 grid (values are shades 0..1)       */
/* ------------------------------------------------------------------ */

// Shades: the hologram pass turns each shade into the trainer's colour ramp.
const S = { deep: 0.1, dark: 0.26, mid: 0.46, cloth: 0.56, light: 0.72, skin: 0.8, hi: 0.97 };

function art() {
  const g = new Array(W * H).fill(-1);
  const set = (x, y, v) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) g[y * W + x] = v; };
  const api = {
    g,
    px: set,
    rect(x, y, w, h, v) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, v); },
    ellipse(cx, cy, rx, ry, v) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
          if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) set(x, y, v);
    },
    tri(ax, ay, bx, by, cx, cy, v) {
      const minX = Math.floor(Math.min(ax, bx, cx)), maxX = Math.ceil(Math.max(ax, bx, cx));
      const minY = Math.floor(Math.min(ay, by, cy)), maxY = Math.ceil(Math.max(ay, by, cy));
      const s = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const d1 = s(x, y, ax, ay, bx, by), d2 = s(x, y, bx, by, cx, cy), d3 = s(x, y, cx, cy, ax, ay);
        if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) set(x, y, v);
      }
    },
    line(x0, y0, x1, y1, v) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
      for (let i = 0; i <= n; i++) set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, v);
    },
    get: (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : g[y * W + x]),
  };
  return api;
}

// Light from the top-left: brighten pixels on a top/left edge, darken
// bottom/right edges, so flat shapes read as rounded.
function shade(a) {
  const edge = (x, y) => a.get(x, y) < 0.05;
  const out = a.g.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = a.get(x, y);
    if (v < 0.05) continue;
    let d = 0;
    if (edge(x, y - 1) || edge(x - 1, y)) d += 0.12;
    if (edge(x, y + 1) || edge(x + 1, y)) d -= 0.12;
    out[y * W + x] = Math.max(0.05, Math.min(1, v + d));
  }
  for (let i = 0; i < out.length; i++) a.g[i] = out[i];
}

// A 1px outline around everything, like the guardians' sprites.
function outline(a) {
  const add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (a.get(x, y) >= 0) continue;
    if (a.get(x - 1, y) >= 0 || a.get(x + 1, y) >= 0 || a.get(x, y - 1) >= 0 || a.get(x, y + 1) >= 0) add.push([x, y]);
  }
  for (const [x, y] of add) a.px(x, y, 0.02);
}

// Shared chibi pieces: legs, boots, arms, hands.
function body(a, o = {}) {
  const cloth = o.cloth ?? S.cloth;
  a.rect(18, 45, 5, 6, S.dark); a.rect(25, 45, 5, 6, S.dark);           // legs
  a.rect(17, 50, 7, 3, S.deep); a.rect(24, 50, 7, 3, S.deep);           // boots
  a.rect(18, 50, 3, 1, S.mid); a.rect(25, 50, 3, 1, S.mid);
  a.rect(16, 28, 16, 18, cloth);                                         // torso
  a.rect(15, 29, 18, 3, cloth);
  a.rect(16, 28, 3, 18, cloth - 0.1);                                    // side shade
  if (!o.noArms) {
    a.rect(11, 30, 4, 11, cloth - 0.08); a.rect(33, 30, 4, 11, cloth - 0.08);
    a.rect(15, 30, 1, 11, S.deep); a.rect(32, 30, 1, 11, S.deep);      // seams
    a.rect(11, 40, 4, 3, S.skin); a.rect(33, 40, 4, 3, S.skin);
  }
}

function eyes(a, y, o = {}) {
  if (o.closed) {
    a.rect(18, y + 1, 4, 1, S.deep); a.rect(26, y + 1, 4, 1, S.deep);
    return;
  }
  a.rect(19, y, 3, 4, S.deep); a.rect(26, y, 3, 4, S.deep);
  a.px(20, y, S.hi); a.px(27, y, S.hi);
}

const TRAINERS = {
  // A drill sergeant in a rook helmet: battlements, visor, big moustache, medals.
  sergeantsquare(a) {
    body(a, { cloth: 0.5 });
    a.rect(14, 28, 5, 2, S.hi); a.rect(29, 28, 5, 2, S.hi);              // epaulettes
    a.rect(16, 39, 16, 2, S.deep); a.rect(23, 39, 3, 2, S.hi);            // belt + buckle
    a.rect(18, 32, 2, 3, S.hi); a.rect(21, 32, 2, 3, S.light);            // medals
    a.line(28, 29, 29, 34, S.light); a.rect(29, 34, 3, 2, S.hi);          // whistle
    a.ellipse(24, 19, 10, 9, S.skin);                                     // face
    a.rect(13, 5, 22, 10, S.mid);                                         // rook helmet
    a.rect(13, 1, 5, 5, S.mid); a.rect(21, 1, 6, 5, S.mid); a.rect(30, 1, 5, 5, S.mid);
    a.rect(13, 5, 22, 2, S.light); a.rect(14, 1, 3, 1, S.light); a.rect(22, 1, 4, 1, S.light); a.rect(31, 1, 3, 1, S.light);
    a.rect(13, 13, 22, 2, S.deep);                                        // visor rim
    a.line(17, 16, 21, 17, S.deep); a.line(31, 16, 27, 17, S.deep);       // stern brows
    eyes(a, 18);
    a.rect(18, 23, 12, 2, S.dark); a.px(17, 25, S.dark); a.px(30, 25, S.dark); // moustache
    a.rect(22, 26, 4, 1, S.deep);
  },

  // A knight-headed ship's captain: tricorn hat, eye patch, long coat, cutlass.
  captaincapture(a) {
    body(a, { cloth: 0.44 });
    a.rect(15, 42, 18, 6, 0.44); a.rect(15, 42, 3, 6, 0.36);             // coat tails
    for (const y of [31, 35, 39]) { a.rect(20, y, 2, 2, S.hi); a.rect(26, y, 2, 2, S.hi); }
    a.tri(20, 28, 28, 28, 24, 33, S.hi);                                  // collar
    a.line(35, 41, 42, 26, S.light); a.line(36, 41, 43, 26, S.hi);        // cutlass
    a.rect(33, 40, 4, 2, S.deep);
    a.ellipse(22, 18, 9, 9, S.skin);                                      // horse head
    a.rect(26, 17, 8, 8, S.skin); a.ellipse(33, 23, 3.5, 3.5, S.skin);    // long muzzle
    a.rect(29, 25, 5, 1, S.mid);                                          // jaw line
    a.px(34, 22, S.deep); a.px(35, 22, S.deep);                           // nostril
    a.rect(12, 9, 4, 16, S.dark); a.px(11, 12, S.dark); a.px(11, 17, S.dark); a.px(11, 22, S.dark); // mane
    a.tri(17, 9, 20, 3, 22, 9, S.skin);                                   // ear
    a.tri(8, 9, 40, 9, 24, 1, S.deep);                                    // tricorn
    a.rect(10, 8, 28, 3, S.deep); a.rect(10, 10, 28, 1, S.light);
    a.rect(22, 4, 4, 3, S.hi); a.px(23, 5, S.deep); a.px(24, 5, S.deep);  // skull badge
    a.rect(26, 15, 5, 4, S.deep); a.line(18, 13, 31, 15, S.deep);         // eye patch
    a.rect(20, 16, 3, 4, S.deep); a.px(21, 16, S.hi);                     // eye
    a.line(28, 24, 32, 23, S.dark);                                       // grin
  },

  // A pawn-headed arcade kid: headphones, neon visor, hoodie, joystick.
  joystick(a) {
    body(a, { cloth: 0.54 });
    a.tri(19, 28, 29, 28, 24, 32, S.light);                               // hoodie strings
    a.line(22, 30, 22, 34, S.hi); a.line(26, 30, 26, 34, S.hi);
    a.rect(16, 36, 16, 6, S.deep); a.rect(17, 37, 14, 1, S.dark);         // arcade stick box
    a.rect(19, 38, 2, 2, S.hi); a.rect(22, 38, 2, 2, S.light);            // buttons
    a.rect(27, 31, 2, 6, S.mid); a.ellipse(28, 30, 2.5, 2.5, S.hi);       // stick + ball
    a.rect(13, 36, 4, 3, S.skin); a.rect(31, 36, 4, 3, S.skin);           // hands on the box
    a.rect(17, 25, 14, 3, S.light); a.rect(17, 27, 14, 1, S.dark);        // pawn collar
    a.ellipse(24, 16, 10, 10, S.skin);                                    // round pawn head
    a.rect(14, 3, 20, 3, S.deep); a.rect(12, 5, 3, 8, S.deep); a.rect(33, 5, 3, 8, S.deep); // headband
    a.rect(15, 4, 18, 1, S.mid);
    a.rect(9, 11, 6, 11, S.deep); a.rect(33, 11, 6, 11, S.deep);          // ear cups
    a.rect(10, 13, 3, 7, S.hi); a.rect(35, 13, 3, 7, S.hi);
    a.rect(15, 12, 18, 6, S.deep);                                        // visor
    a.rect(16, 13, 7, 4, S.hi); a.rect(25, 13, 7, 4, S.hi);               // glowing lenses
    a.rect(17, 14, 2, 2, S.light); a.rect(26, 14, 2, 2, S.light);
    a.rect(19, 21, 10, 2, S.deep); a.rect(18, 20, 1, 1, S.deep); a.rect(29, 20, 1, 1, S.deep); // grin
    a.rect(21, 22, 6, 1, S.hi);                                           // teeth
  },

  // A bishop in a tall mitre and flowing robe, reading from the rulebook.
  rulekeeper(a) {
    a.tri(13, 52, 35, 52, 24, 26, 0.46);                                  // robe
    a.rect(15, 28, 18, 24, 0.46);
    a.rect(12, 44, 24, 8, 0.46);
    a.rect(22, 28, 4, 24, S.light); a.rect(23, 28, 2, 24, S.hi);          // stole
    a.rect(14, 48, 20, 2, S.light);                                       // hem
    a.rect(14, 33, 20, 8, S.hi); a.rect(14, 33, 20, 1, S.light);          // open book
    a.rect(23, 33, 2, 8, S.mid);
    for (const y of [35, 37, 39]) { a.rect(16, y, 6, 1, S.mid); a.rect(26, y, 6, 1, S.mid); }
    a.rect(12, 36, 3, 4, S.skin); a.rect(33, 36, 3, 4, S.skin);           // hands
    a.ellipse(24, 20, 9, 8, S.skin);                                      // face
    eyes(a, 19, { closed: true });
    a.rect(21, 24, 6, 1, S.dark);
    a.tri(14, 14, 34, 14, 24, -2, S.light);                               // mitre
    a.rect(14, 11, 20, 4, S.light);
    a.line(28, 2, 21, 12, S.deep);                                        // mitre slit
    a.rect(14, 12, 20, 2, S.hi);
    a.ellipse(24, 0, 2, 2, S.hi);                                         // ball on top
  },

  // A king-crowned old master: topknot and cross, bushy brows, long beard, staff.
  senseitactic(a) {
    a.rect(9, 8, 2, 45, S.mid); a.rect(9, 8, 1, 45, S.light);             // bo staff
    body(a, { cloth: 0.7 });
    a.tri(17, 28, 31, 28, 24, 38, S.mid);                                 // gi collar V
    a.rect(16, 40, 16, 2, S.deep); a.rect(26, 42, 2, 4, S.deep); a.rect(29, 42, 2, 3, S.deep); // black belt
    a.rect(10, 38, 3, 3, S.skin);                                         // hand on the staff
    a.ellipse(24, 19, 10, 9, S.skin);                                     // face
    a.ellipse(24, 10, 9, 5, S.hi);                                        // white hair
    a.ellipse(24, 5, 3, 3, S.hi);                                         // topknot
    a.rect(23, -2, 2, 6, S.light); a.rect(21, 0, 6, 2, S.light);          // king's cross
    a.rect(14, 12, 20, 2, S.dark);                                        // headband
    a.rect(17, 16, 5, 2, S.hi); a.rect(26, 16, 5, 2, S.hi);               // bushy brows
    eyes(a, 19, { closed: true });
    a.tri(15, 22, 33, 22, 24, 40, S.hi);                                  // long beard
    a.rect(19, 22, 10, 3, S.hi);
    a.rect(21, 23, 6, 1, S.light);                                        // moustache
  },
};

/* ------------------------------------------------------------------ */
/*  Hologram rendering                                                 */
/* ------------------------------------------------------------------ */

const HUES = {
  sergeantsquare: [86, 216, 255],
  captaincapture: [93, 255, 185],
  joystick: [255, 111, 216],
  rulekeeper: [169, 139, 255],
  senseitactic: [255, 209, 102],
};

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// Shade (0..1) -> colour on the trainer's ramp: deep hue, hue, near-white.
function ramp(hue, t) {
  const deep = hue.map(v => v * 0.18), light = mix(hue, [255, 255, 255], 0.78);
  return t < 0.5 ? mix(deep, hue, t / 0.5) : mix(hue, light, (t - 0.5) / 0.5);
}

// Draws the trainer at `scale` into img, with glow, scanlines and a projector.
function drawHologram(img, id, ox, oy, scale) {
  const a = art();
  TRAINERS[id](a);
  shade(a);
  outline(a);
  const hue = HUES[id];
  const cw = W * scale, ch = H * scale;

  // Projector disc and light beam under the figure.
  const baseY = oy + 53 * scale, cx = ox + cw / 2;
  for (let y = oy; y < baseY; y++) {
    const t = (y - oy) / (baseY - oy);
    const half = (cw * 0.2) + (cw * 0.32) * (1 - t) * 0.6;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) blendPx(img, x, y, ...hue, 0.18 * t * t);
  }
  const rx = cw * 0.3, ry = Math.max(3, scale * 2.2);
  for (let y = -ry * 2; y <= ry * 2; y++) for (let x = -rx * 1.4; x <= rx * 1.4; x++) {
    const d = (x / (rx * 1.4)) ** 2 + (y / (ry * 2)) ** 2;
    if (d <= 1) blendPx(img, cx + x, baseY + y, ...hue, 0.18 * (1 - d));
  }
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    const d = (x / rx) ** 2 + (y / ry) ** 2;
    if (d <= 1) blendPx(img, cx + x, baseY + y, ...(d > 0.55 ? mix(hue, [255, 255, 255], 0.5) : hue.map(v => v * 0.35)), 0.95);
  }

  // Soft glow: the silhouette, blurred, behind the figure.
  const R = Math.max(3, Math.round(scale * 2.6));
  const mask = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) mask[i] = a.g[i] >= 0 ? 1 : 0;
  for (let y = -R * 2; y < ch + R * 2; y++) for (let x = -R * 2; x < cw + R * 2; x++) {
    let sum = 0, n = 0;
    for (let dy = -R; dy <= R; dy += Math.max(1, R >> 1)) for (let dx = -R; dx <= R; dx += Math.max(1, R >> 1)) {
      const gx = Math.floor((x + dx) / scale), gy = Math.floor((y + dy) / scale);
      if (gx >= 0 && gy >= 0 && gx < W && gy < H) sum += mask[gy * W + gx];
      n++;
    }
    if (sum) blendPx(img, ox + x, oy + y, ...hue, 0.65 * sum / n);
  }

  // The figure: shade -> ramp colour, with CRT scanlines and a slight RGB split.
  for (let gy = 0; gy < H; gy++) for (let gx = 0; gx < W; gx++) {
    const v = a.g[gy * W + gx];
    if (v < 0) continue;
    const col = ramp(hue, v);
    for (let sy = 0; sy < scale; sy++) {
      const y = oy + gy * scale + sy;
      const scan = (y % 3 === 0) ? 0.72 : 1;
      for (let sx = 0; sx < scale; sx++) {
        const x = ox + gx * scale + sx;
        blendPx(img, x, y, col[0] * scan, col[1] * scan, col[2] * scan, 0.93);
      }
    }
  }
  // Chromatic fringe on the left and right edges.
  for (let gy = 0; gy < H; gy++) for (let gx = 0; gx < W; gx++) {
    if (a.g[gy * W + gx] < 0) continue;
    if (a.get(gx - 1, gy) < 0) for (let sy = 0; sy < scale; sy++) blendPx(img, ox + gx * scale - 1, oy + gy * scale + sy, 255, 70, 140, 0.35);
    if (a.get(gx + 1, gy) < 0) for (let sy = 0; sy < scale; sy++) blendPx(img, ox + (gx + 1) * scale, oy + gy * scale + sy, 70, 230, 255, 0.35);
  }
}

// The framed card the guardians use: grid, rings, accent bar, plate.
function drawCard(img, id, charScale, charY) {
  const hue = HUES[id];
  const { w, h } = img;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) blendPx(img, x, y, 14, 12, 20, 1);
  const cx = w / 2, cy = h * 0.42;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const onGrid = x % 20 === 10 || y % 20 === 10;
    const r = Math.hypot(x - cx, y - cy);
    const onRing = Math.abs((r % 22) - 11) < 0.9;
    if (onGrid) blendPx(img, x, y, ...hue, 0.16);
    if (onRing) blendPx(img, x, y, ...hue, 0.22 * Math.max(0, 1 - r / (w * 0.75)));
  }
  // Scattered "data" pixels.
  let seed = [...id].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(rnd() * (w - 4)), y = Math.floor(rnd() * (h - 4));
    for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) blendPx(img, x + j, y + k, 255, 255, 255, 0.55);
  }
  for (let y = 8; y < 11; y++) for (let x = 14; x < w - 14; x++) blendPx(img, x, y, ...hue, 0.95);   // accent bar
  drawHologram(img, id, Math.round((w - W * charScale) / 2), charY, charScale);
  // Name plate with pixel "text".
  const px0 = 44, px1 = w - 44, py0 = h - 72, py1 = h - 30;
  for (let y = py0; y < py1; y++) for (let x = px0; x < px1; x++) {
    const edge = y < py0 + 3 || y >= py1 - 3 || x < px0 + 3 || x >= px1 - 3;
    blendPx(img, x, y, ...(edge ? mix(hue, [255, 255, 255], 0.3) : [22, 32, 42]), 1);
  }
  for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) {
    const bw = 6 + Math.floor(rnd() * 8), x = px0 + 16 + i * 18, y = py0 + 12 + row * 12;
    if (x + bw > px1 - 16) continue;
    for (let yy = 0; yy < 6; yy++) for (let xx = 0; xx < bw; xx++) blendPx(img, x + xx, y + yy, ...(row ? [200, 230, 240] : hue), 0.9);
  }
}

for (const id of Object.keys(TRAINERS)) {
  const small = image(128, 128);
  drawHologram(small, id, 16, 6, 2);
  savePNG(small, path.join(ROOT, 'assets/textures/characters', `${id}.png`));

  const card = image(280, 360);
  drawCard(card, id, 5, 16);
  savePNG(card, path.join(ROOT, 'assets/textures/premium', `premium_character_${id}.png`));

  const card2 = image(300, 368);
  drawCard(card2, id, 5, 22);
  savePNG(card2, path.join(ROOT, 'assets/textures/premium', `premium_character_card_${id}.png`));
  console.log('wrote', id);
}
