#!/usr/bin/env node
// Art for the Great Board theme (unlocked by finishing the story), in plain Node:
//   node scripts/generate_greatboard_art.js [pieces|board|previews|all]
// pieces:   greatboard_{white,black}_{type}.png, repainted from the Crystal master set
//           the same way scripts/generate_theme_art.py does (outline, inlay, shaded body)
// board:    boards/greatboard_board.png (ivory marble and night-blue lapis, gold seams)
// previews: premium/premium_bg_greatboard.png and premium_theme_greatboard.png, from the
//           live scene's still (node scripts/live-scene.js bg greatboard) plus board and pieces
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { png } = require('./live-scene.js');

const ROOT = path.join(__dirname, '..');
const TEX = path.join(ROOT, 'assets', 'textures');
const TYPES = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];

// ---------- PNG in (8-bit RGB, RGBA or palette, not interlaced) ----------
function readPng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8, w = 0, h = 0, type = 0, depth = 0, pal = null, trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; }
    else if (kind === 'PLTE') pal = data;
    else if (kind === 'tRNS') trns = data;
    else if (kind === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  if (depth !== 8) throw new Error(`${file}: only 8-bit PNGs are supported`);
  const bpp = { 2: 3, 3: 1, 6: 4, 0: 1, 4: 2 }[type];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp, out = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      line[i] = (line[i] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, s = x * bpp;
      if (type === 6) line.copy(out, o, s, s + 4);
      else if (type === 2) { out[o] = line[s]; out[o + 1] = line[s + 1]; out[o + 2] = line[s + 2]; out[o + 3] = 255; }
      else if (type === 3) { const k = line[s]; out[o] = pal[k * 3]; out[o + 1] = pal[k * 3 + 1]; out[o + 2] = pal[k * 3 + 2]; out[o + 3] = trns && k < trns.length ? trns[k] : 255; }
      else if (type === 0) { out[o] = out[o + 1] = out[o + 2] = line[s]; out[o + 3] = 255; }
      else { out[o] = out[o + 1] = out[o + 2] = line[s]; out[o + 3] = line[s + 1]; }
    }
    prev = line;
  }
  return { w, h, px: out };
}

// RGBA buffer -> Uint32 ABGR pixels for live-scene's png().
const toAbgr = (img) => {
  const a = new Uint32Array(img.w * img.h);
  for (let i = 0; i < a.length; i++) a[i] = ((img.px[i * 4 + 3] << 24) | (img.px[i * 4 + 2] << 16) | (img.px[i * 4 + 1] << 8) | img.px[i * 4]) >>> 0;
  return a;
};
const hx = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));

// ---------- pieces ----------
const MATERIAL = {   // ivory and gold vs. ebony, gold inlay on both (the board's dark squares are lapis)
  white: { ramp: ['#7a6440', '#b8985e', '#e4cc90', '#f8ecc8', '#fffcf0'], outline: '#1c1206', gem: ['#8a6410', '#f0b830', '#fff4a8'] },
  black: { ramp: ['#07050a', '#141019', '#241e2e', '#3a3248', '#645a78'], outline: '#000000', gem: ['#8a6410', '#f0b830', '#fff4a8'] },
};

function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h / 6) + 1) % 1, mx ? d / mx : 0, mx];
}

function classify(r, g, b, a) {
  if (a < 128) return 'clear';
  const [h, s, v] = hsv(r, g, b);
  if (v < 0.16) return 'outline';
  if (s > 0.35 && h >= 0.24 && h <= 0.40) return 'outline';
  if (s > 0.28 && h >= 0.42 && h <= 0.62 && v > 0.3) return 'gem';
  return 'body';
}

function repaint(master, mat) {
  const { w, h, px } = master;
  const kind = [], lum = [];
  for (let i = 0; i < w * h; i++) {
    kind.push(classify(px[i * 4], px[i * 4 + 1], px[i * 4 + 2], px[i * 4 + 3]));
    lum.push((0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255);
  }
  const smooth = new Float32Array(w * h), body = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (kind[i] !== 'body') continue;
    let acc = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h || kind[yy * w + xx] !== 'body') continue;
      const wg = dx === 0 && dy === 0 ? 2 : 1;
      acc += lum[yy * w + xx] * wg; n += wg;
    }
    smooth[i] = acc / n;
    body.push(smooth[i]);
  }
  body.sort((a, b) => a - b);
  const lo = body[Math.floor(body.length * 0.03)], hi = body[Math.floor(body.length * 0.97)];
  const ramp = mat.ramp.map(hx), gem = mat.gem.map(hx), outline = hx(mat.outline);
  const out = Buffer.alloc(w * h * 4);
  const set = (i, c) => { out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255; };
  for (let i = 0; i < w * h; i++) {
    if (kind[i] === 'clear') continue;
    if (kind[i] === 'outline') set(i, outline);
    else if (kind[i] === 'gem') set(i, gem[Math.min(2, Math.floor(hsv(px[i * 4], px[i * 4 + 1], px[i * 4 + 2])[2] * 3))]);
    else {
      const t = Math.min(1, Math.max(0, (smooth[i] - lo) / Math.max(1e-6, hi - lo))) ** 1.15;
      set(i, ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))]);
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (out[i * 4 + 3] || kind[i] !== 'clear') continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && kind[yy * w + xx] === 'body') { set(i, outline); break; }
    }
  }
  return { w, h, px: out };
}

function makePieces() {
  for (const t of TYPES) {
    const master = readPng(path.join(TEX, 'pieces', `crystal_white_${t}.png`));
    for (const color of ['white', 'black']) {
      const img = repaint(master, MATERIAL[color]);
      fs.writeFileSync(path.join(TEX, 'pieces', `greatboard_${color}_${t}.png`), png(toAbgr(img), img.w, img.h, 1, true));
    }
  }
  console.log('pieces greatboard');
}

// ---------- board ----------
function hash(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y, s) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

function makeBoard() {
  const SQ = 32, N = SQ * 8;
  const IVORY = ['#d8c8a4', '#e8dcbc', '#f2e8d0', '#faf4e4'].map(hx), VEIN = hx('#c8a868');
  const LAPIS = ['#161c48', '#1e2860', '#263274', '#303e88'].map(hx), SPARK = [hx('#e8b840'), hx('#fff0b0')];
  const GOLD = [hx('#8a6414'), hx('#e0a830'), hx('#ffe08a')];
  const px = new Uint32Array(N * N);
  const put = (x, y, c) => { px[y * N + x] = (0xff000000 | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const col = x / SQ | 0, row = y / SQ | 0, lx = x % SQ, ly = y % SQ;
    const light = (row + col) % 2 === 0;
    // Soft marble clouds, banded (no smooth blends), with thin veins.
    const n = noise(x / 11, y / 11, 3) * 0.6 + noise(x / 4, y / 4, 4) * 0.4;
    const band = Math.min(3, Math.floor(n * 4.2));
    let c = light ? IVORY[3 - Math.min(3, band)] : LAPIS[Math.min(3, band)];
    const vein = Math.abs(noise(x / 18 + 7, y / 18, 9) - 0.5) < 0.018;
    if (light && vein) c = VEIN;
    if (!light && hash(x, y, 11) > 0.992) c = SPARK[hash(x, y, 12) > 0.6 ? 1 : 0];
    // Gold seams: a lit top-left edge and a shaded bottom-right edge per square.
    if (lx === 0 || ly === 0) c = GOLD[light ? 2 : 1];
    else if (lx === SQ - 1 || ly === SQ - 1) c = GOLD[0];
    put(x, y, c);
  }
  fs.writeFileSync(path.join(TEX, 'boards', 'greatboard_board.png'), png(px, N, N));
  console.log('board greatboard');
  return { w: N, h: N, px };
}

// ---------- previews ----------
function boxDown(img, w, h) {   // area-average downscale of an ABGR image
  const out = new Uint32Array(w * h), sx = img.w / w, sy = img.h / h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = Math.floor(y * sy); yy < Math.floor((y + 1) * sy); yy++) for (let xx = Math.floor(x * sx); xx < Math.floor((x + 1) * sx); xx++) {
      const v = img.px[yy * img.w + xx]; r += v & 255; g += v >> 8 & 255; b += v >> 16 & 255; n++;
    }
    out[y * w + x] = (0xff000000 | (Math.round(b / n) << 16) | (Math.round(g / n) << 8) | Math.round(r / n)) >>> 0;
  }
  return { w, h, px: out };
}

function makePreviews() {
  const still = path.join(TEX, 'backgrounds', 'greatboard_bg.png');
  if (!fs.existsSync(still)) throw new Error('run `node scripts/live-scene.js bg greatboard` first');
  const bg = readPng(still);
  const bgA = { w: bg.w, h: bg.h, px: toAbgr(bg) };
  fs.writeFileSync(path.join(TEX, 'premium', 'premium_bg_greatboard.png'), png(bgA.px, bgA.w, bgA.h));
  const small = boxDown(bgA, 320, 200);
  const card = { w: 320, h: 180, px: small.px.slice(320 * 10, 320 * 190) };
  const put = (x, y, v) => { if (x >= 0 && y >= 0 && x < card.w && y < card.h) card.px[y * card.w + x] = v; };
  const board = readPng(path.join(TEX, 'boards', 'greatboard_board.png'));
  const bw = 160, bh = 60, bx = 80, by = 180 - bh - 14;
  for (let y = -2; y < bh + 2; y++) for (let x = -2; x < bw + 2; x++) put(bx + x, by + y, 0xff000000);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const sx = Math.floor(x * 256 / bw), sy = Math.floor(y * 96 / bh), o = (sy * board.w + sx) * 4;
    put(bx + x, by + y, (0xff000000 | (board.px[o + 2] << 16) | (board.px[o + 1] << 8) | board.px[o]) >>> 0);
  }
  const sq = bw / 8;
  [['black', 'rook'], ['black', 'queen'], ['white', 'knight'], ['white', 'king']].forEach(([color, t], i) => {
    const p = readPng(path.join(TEX, 'pieces', `greatboard_${color}_${t}.png`));
    const size = sq * 2, ox = bx + Math.floor(sq * (1 + i * 1.6)), oy = by - sq;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const o = (Math.floor(y * p.h / size) * p.w + Math.floor(x * p.w / size)) * 4;
      if (p.px[o + 3] > 128) put(ox + x, oy + y, (0xff000000 | (p.px[o + 2] << 16) | (p.px[o + 1] << 8) | p.px[o]) >>> 0);
    }
  });
  fs.writeFileSync(path.join(TEX, 'premium', 'premium_theme_greatboard.png'), png(card.px, card.w, card.h));
  console.log('previews greatboard');
}

// Shared with scripts/generate_chess20_art.js.
module.exports = { readPng, toAbgr, repaint, boxDown, hash, noise, TEX, TYPES };

if (require.main === module) {
  const what = process.argv[2] || 'all';
  if (what === 'all' || what === 'pieces') makePieces();
  if (what === 'all' || what === 'board') makeBoard();
  if (what === 'all' || what === 'previews') makePreviews();
}
