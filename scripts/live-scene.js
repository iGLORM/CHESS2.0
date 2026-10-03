#!/usr/bin/env node
// Runs a live pixel scene (src/themes/scenes/<id>.js) under Node, no browser needed.
//
//   node scripts/live-scene.js check pawnhollow            loop seam, motion, speed, colours
//   node scripts/live-scene.js still pawnhollow [t] [out]  PNG at 4x (default: the scene's still)
//   node scripts/live-scene.js sheet pawnhollow [t] [out]  6 frames 0.5 s apart, 2x, to review motion
//   node scripts/live-scene.js moods char_pawnie [t] [out] a character in each of its moods, 4x
//   node scripts/live-scene.js bg pawnhollow               writes assets/textures/backgrounds/<id>_bg.png
//   node scripts/live-scene.js portrait char_pawnie        writes the character's still portraits (premium card
//                                                          5x, and its face 4x in assets/textures/characters/;
//                                                          --no-face keeps that one, e.g. a trainer's hologram figure)
//   node scripts/live-scene.js icon app_icon               writes the app icons (icon.png, icon_512.png,
//                                                          icon_1024.png, icon.ico) in the project root
//
// Options: --scale N (still/sheet), --count N --step S (sheet), --state '<json>' (extra
// scene state, as a screen passes with LiveScenes.setState, e.g. the world map's `map`).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const SCENES = path.join(ROOT, 'src/themes/scenes');

function loadScene(id) {
  const file = path.join(SCENES, `${id}.js`);
  if (!fs.existsSync(file)) throw new Error(`No scene file: ${path.relative(ROOT, file)}`);
  const ctx = vm.createContext({ Math, console, performance: { now: () => 0 } });
  for (const f of [path.join(ROOT, 'src/themes/LiveScenes.js'), path.join(SCENES, 'PixelKit.js'), file]) {
    // Top-level consts don't become context properties; expose the two globals.
    const code = fs.readFileSync(f, 'utf8')
      .replace(/^const (LiveScenes|PixelKit) =/m, 'var $1 =')
      .replace(/^if \(typeof module !== 'undefined'\).*$/m, '');
    vm.runInContext(code, ctx, { filename: f });
  }
  const def = ctx.LiveScenes.get(id);
  if (!def) throw new Error(`${id}.js did not register a scene with id '${id}'`);
  const buf = new Uint32Array(def.width * def.height);
  const draw = def.create();
  const mood0 = def.moods ? def.moods[0] : null;
  return { def, buf, render(t, mood = mood0, since = 0) { draw(t, buf, { mood, since, ...loadScene.state }); return buf; } };
}

// ---------- PNG ----------
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(b) { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
// pixels: Uint32 ABGR, w x h; written scaled by s with nearest-neighbour. With alpha,
// the pixels' alpha is kept (RGBA); otherwise the PNG is opaque RGB.
function png(pixels, w, h, s = 1, alpha = false) {
  const W = w * s, H = h * s, B = alpha ? 4 : 3, raw = Buffer.alloc((W * B + 1) * H);
  for (let y = 0; y < H; y++) {
    const row = y * (W * B + 1);
    for (let x = 0; x < W; x++) {
      const v = pixels[((y / s) | 0) * w + ((x / s) | 0)], o = row + 1 + x * B;
      raw[o] = v & 255; raw[o + 1] = v >> 8 & 255; raw[o + 2] = v >> 16 & 255;
      if (alpha) raw[o + 3] = v >>> 24;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- commands ----------
// Seam, motion, speed, colours and holes for one scene (also used by the tests).
function stats(id) {
  const s = loadScene(id), { def } = s, n = def.width * def.height;
  const diff = (a, b) => { let d = 0; for (let i = 0; i < n; i++) if (a[i] !== b[i]) d++; return d; };
  let seam = 0;
  for (const dt of [0.25, 1.7, 9.3]) {
    const a = Uint32Array.from(s.render((def.loop - dt) % def.loop));
    const b = Uint32Array.from(s.render(def.loop * 2 - dt));   // same moment, one loop later
    seam = Math.max(seam, diff(a, b));
  }
  const a = Uint32Array.from(s.render(10)), b = s.render(10 + 1 / def.fps);
  const moving = diff(a, b);
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 60; i++) s.render(i * 0.37);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 60;
  const colours = new Set(s.render(def.still));
  let transparent = 0;
  for (const v of s.buf) if (v >>> 24 !== 255) transparent++;
  return { def, n, seam, moving, ms, colours: colours.size, transparent };
}

function check(id) {
  const { def, n, seam, moving, ms, colours, transparent } = stats(id);
  const still = def.animated === false, holesOk = transparent === 0 || def.opaque === false;
  const ok = seam <= n * 0.001 && (moving > 0 || still) && ms < 16 && holesOk;
  console.log(`${id}: ${def.width}x${def.height}, loop ${def.loop}s at ${def.fps} fps`);
  console.log(`  loop seam       ${seam} px differ one loop apart ${seam <= n * 0.001 ? 'ok' : 'FAIL: some motion is not a whole number of cycles per loop'}`);
  console.log(`  motion          ${moving} px change per frame ${moving > 0 || still ? 'ok' : 'FAIL: nothing moves'}`);
  console.log(`  speed           ${ms.toFixed(2)} ms per frame in Node (browsers are ~5x faster) ${ms < 16 ? 'ok' : 'FAIL: too slow for a background'}`);
  console.log(`  colours         ${colours} in the still frame`);
  console.log(`  holes           ${transparent} transparent px ${holesOk ? 'ok' : 'FAIL: something is not painted'}${def.opaque === false ? ' (see-through scene)' : ''}`);
  process.exitCode = ok ? 0 : 1;
}

function still(id, t, out, scale) {
  const s = loadScene(id);
  t = t === undefined ? s.def.still : t;
  out = out || `${id}_t${t}.png`;
  fs.writeFileSync(out, png(s.render(t % s.def.loop), s.def.width, s.def.height, scale, s.def.opaque === false));
  console.log(`wrote ${out} (t=${t}s, ${s.def.width * scale}x${s.def.height * scale})`);
}

// frames: [[t, mood], ...] laid out in `cols` columns.
function grid(s, frames, cols, out, scale) {
  const { width: w, height: h } = s.def, gap = 2, count = frames.length;
  const rows = Math.ceil(count / cols);
  const SW = cols * w + (cols - 1) * gap, SH = rows * h + (rows - 1) * gap;
  const out32 = new Uint32Array(SW * SH).fill(0xff000000);
  frames.forEach(([t, mood], k) => {
    const f = s.render(t % s.def.loop, mood), ox = (k % cols) * (w + gap), oy = ((k / cols) | 0) * (h + gap);
    for (let y = 0; y < h; y++) out32.set(f.subarray(y * w, y * w + w), (oy + y) * SW + ox);
  });
  fs.writeFileSync(out, png(out32, SW, SH, scale));
}

function moods(id, t, out, scale) {
  const s = loadScene(id);
  if (!s.def.moods) throw new Error(`${id} has no moods`);
  t = t === undefined ? s.def.still : t;
  out = out || `${id}_moods.png`;
  grid(s, s.def.moods.map(m => [t, m]), s.def.moods.length, out, scale);
  console.log(`wrote ${out}: ${s.def.moods.join(', ')} at t=${t}s`);
}

function sheet(id, t, out, scale, count, step) {
  const s = loadScene(id), { width: w, height: h } = s.def;
  t = t === undefined ? s.def.still : t;
  const cols = 2, rows = Math.ceil(count / cols), gap = 2;
  const SW = cols * w + (cols - 1) * gap, SH = rows * h + (rows - 1) * gap;
  const out32 = new Uint32Array(SW * SH).fill(0xff000000);
  for (let k = 0; k < count; k++) {
    const f = s.render((t + k * step) % s.def.loop), ox = (k % cols) * (w + gap), oy = ((k / cols) | 0) * (h + gap);
    for (let y = 0; y < h; y++) out32.set(f.subarray(y * w, y * w + w), (oy + y) * SW + ox);
  }
  out = out || `${id}_sheet.png`;
  fs.writeFileSync(out, png(out32, SW, SH, scale));
  console.log(`wrote ${out}: ${count} frames from t=${t}s, ${step}s apart (left to right, top to bottom)`);
}

// A character's still art for places that show a picture instead of the live
// scene: the full card at 5x (premium_character_<id>.png) and the face frame at
// 4x (characters/<id>.png).
function portrait(id, withFace = true) {
  const s = loadScene(id), { def } = s;
  if (!id.startsWith('char_')) throw new Error('portrait is for characters (char_<id>)');
  const name = id.slice(5), f = s.render(def.still % def.loop);
  const card = path.join(ROOT, `assets/textures/premium/premium_character_${name}.png`);
  fs.writeFileSync(card, png(f, def.width, def.height, 5));
  if (!withFace) { console.log(`wrote ${path.relative(ROOT, card)}`); return; }
  const [fx, fy, fw, fh] = (def.frames && def.frames.face) || [0, 0, def.width, def.width];
  const face = new Uint32Array(fw * fh);
  for (let y = 0; y < fh; y++) face.set(f.subarray((fy + y) * def.width + fx, (fy + y) * def.width + fx + fw), y * fw);
  const faceOut = path.join(ROOT, `assets/textures/characters/${name}.png`);
  fs.writeFileSync(faceOut, png(face, fw, fh, 4));
  console.log(`wrote ${path.relative(ROOT, card)} and ${path.relative(ROOT, faceOut)}`);
}

// The app icons from a square see-through scene: PNGs at whole-number scales (2x, 4x,
// 8x of a 128 px scene) and an ICO whose small sizes are area-averaged down.
const ICON_PNGS = { 'icon.png': 256, 'icon_512.png': 512, 'icon_1024.png': 1024 };
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

// Box-filter resample of ABGR pixels (premultiplied, so the transparent edge stays clean).
function downsample(src, w, size) {
  const out = new Uint32Array(size * size), f = w / size;
  for (let Y = 0; Y < size; Y++) for (let X = 0; X < size; X++) {
    let r = 0, g = 0, b = 0, a = 0, area = 0;
    for (let y = Math.floor(Y * f); y < Math.ceil((Y + 1) * f); y++) {
      const wy = Math.min(y + 1, (Y + 1) * f) - Math.max(y, Y * f);
      for (let x = Math.floor(X * f); x < Math.ceil((X + 1) * f); x++) {
        const k = wy * (Math.min(x + 1, (X + 1) * f) - Math.max(x, X * f)), v = src[y * w + x], va = (v >>> 24) / 255;
        r += (v & 255) * va * k; g += (v >> 8 & 255) * va * k; b += (v >> 16 & 255) * va * k; a += va * k; area += k;
      }
    }
    const A = a / area, p = a > 0 ? 1 / a : 0;
    out[Y * size + X] = ((Math.round(A * 255) << 24) | (Math.round(b * p) << 16) | (Math.round(g * p) << 8) | Math.round(r * p)) >>> 0;
  }
  return out;
}

// ICO files may hold PNG images directly (Windows Vista and later).
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(img => img.data)]);
}

function icon(id) {
  const s = loadScene(id), { def } = s, w = def.width;
  if (def.height !== w) throw new Error('an icon scene must be square');
  const f = Uint32Array.from(s.render(def.still % def.loop));
  const at = size => size % w === 0 ? png(f, w, w, size / w, true) : png(downsample(f, w, size), size, size, 1, true);
  for (const [file, size] of Object.entries(ICON_PNGS)) {
    fs.writeFileSync(path.join(ROOT, file), at(size));
    console.log(`wrote ${file} (${size}x${size})`);
  }
  fs.writeFileSync(path.join(ROOT, 'icon.ico'), ico(ICO_SIZES.map(size => ({ size, data: at(size) }))));
  console.log(`wrote icon.ico (${ICO_SIZES.join(', ')})`);
}

module.exports = { loadScene, stats, png, downsample };
if (require.main !== module) return;

const [cmd, id, ...rest] = process.argv.slice(2);
const opt = (name, def) => { const i = rest.indexOf('--' + name); return i >= 0 ? parseFloat(rest.splice(i, 2)[1]) : def; };
const si = rest.indexOf('--state');
loadScene.state = si >= 0 ? JSON.parse(rest.splice(si, 2)[1]) : {};
const scale = opt('scale', cmd === 'sheet' ? 2 : 4), count = opt('count', 6), step = opt('step', 0.5);
const [tArg, outArg] = rest;
const t = tArg === undefined ? undefined : parseFloat(tArg);
try {
  if (cmd === 'check') check(id);
  else if (cmd === 'still') still(id, t, outArg, scale);
  else if (cmd === 'sheet') sheet(id, t, outArg, scale, count, step);
  else if (cmd === 'moods') moods(id, t, outArg, scale);
  else if (cmd === 'icon') icon(id);
  else if (cmd === 'portrait') portrait(id, !process.argv.includes('--no-face'));
  else if (cmd === 'bg') still(id, undefined, path.join(ROOT, `assets/textures/backgrounds/${id}_bg.png`), 4);
  else console.log(fs.readFileSync(__filename, 'utf8').split("\n").slice(1, 14).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
