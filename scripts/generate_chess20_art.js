#!/usr/bin/env node
// Art for the Chess 2.0 theme (the game's own theme, the default for new players), in plain Node:
//   node scripts/generate_chess20_art.js [pieces|board|previews|all]
// pieces:   chess20_{white,black}_{type}.png, repainted from the Crystal master set (pearl with
//           gold inlay, deep twilight violet with gold inlay)
// board:    boards/chess20_board.png (pearl and twilight-violet squares, a1 dark)
// previews: premium/premium_bg_chess20.png and premium_theme_chess20.png, from the live
//           scene's still (run `node scripts/live-scene.js bg chess20` first) plus board and pieces
const fs = require('fs');
const path = require('path');
const { png } = require('./live-scene.js');
const { readPng, toAbgr, repaint, boxDown, hash, noise, TEX, TYPES } = require('./generate_greatboard_art.js');

const MATERIAL = {
  white: { ramp: ['#6a5680', '#9e8aaa', '#d0bec6', '#f0e4dc', '#fffaf2'], outline: '#1e1230', gem: ['#8a5a14', '#f0b030', '#fff0a0'] },
  black: { ramp: ['#08040f', '#140a26', '#221438', '#34224e', '#54407a'], outline: '#020104', gem: ['#8a5a14', '#f0b030', '#fff0a0'] },
};

function makePieces() {
  for (const t of TYPES) {
    const master = readPng(path.join(TEX, 'pieces', `crystal_white_${t}.png`));
    for (const color of ['white', 'black']) {
      const img = repaint(master, MATERIAL[color]);
      fs.writeFileSync(path.join(TEX, 'pieces', `chess20_${color}_${t}.png`), png(toAbgr(img), img.w, img.h, 1, true));
    }
  }
  console.log('pieces chess20');
}

const hx = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));

// Pearl squares with a soft rose-lilac sheen in clean bands; twilight-violet squares with a
// few stars in them; each square bevelled (lit top-left, shaded bottom-right).
function makeBoard() {
  const SQ = 32, N = SQ * 8;
  const PEARL = ['#d8c4c0', '#e6d4cc', '#f0e2d6', '#f8eee2'].map(hx), SHEEN = hx('#e8c8d0');
  const VIOLET = ['#5a3c78', '#644482', '#6e4c8c', '#785496'].map(hx);
  const STAR = [hx('#d8c0ff'), hx('#ffe6a0')];
  const BEV = { light: [hx('#fffaf0'), hx('#c4aeb0')], dark: [hx('#9270b0'), hx('#3e2658')] };
  const px = new Uint32Array(N * N);
  const put = (x, y, c) => { px[y * N + x] = (0xff000000 | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const col = x / SQ | 0, row = y / SQ | 0, lx = x % SQ, ly = y % SQ;
    const light = (row + col) % 2 === 0;       // the top-left square (a8) is light, so a1 is dark
    const n = noise(x / 14, y / 14, light ? 5 : 6) * 0.65 + noise(x / 5, y / 5, 7) * 0.35;
    const band = Math.min(3, Math.floor(n * 4.2));
    let c = light ? PEARL[3 - band] : VIOLET[band];
    // A pearl sheen: soft diagonal bands.
    if (light && Math.abs(noise((x + y) / 20, (x - y) / 60, 8) - 0.5) < 0.03) c = SHEEN;
    if (!light && hash(x, y, 13) > 0.994) c = STAR[hash(x, y, 14) > 0.55 ? 1 : 0];
    const bev = BEV[light ? 'light' : 'dark'];
    if (lx === 0 || ly === 0) c = bev[0];
    else if (lx === SQ - 1 || ly === SQ - 1) c = bev[1];
    put(x, y, c);
  }
  fs.writeFileSync(path.join(TEX, 'boards', 'chess20_board.png'), png(px, N, N));
  console.log('board chess20');
}

function makePreviews() {
  const still = path.join(TEX, 'backgrounds', 'chess20_bg.png');
  if (!fs.existsSync(still)) throw new Error('run `node scripts/live-scene.js bg chess20` first');
  const bg = readPng(still);
  const bgA = { w: bg.w, h: bg.h, px: toAbgr(bg) };
  fs.writeFileSync(path.join(TEX, 'premium', 'premium_bg_chess20.png'), png(bgA.px, bgA.w, bgA.h));
  // The theme card: the scene with a strip of the board and four pieces, like the other cards.
  const small = boxDown(bgA, 320, 200);
  const card = { w: 320, h: 180, px: small.px.slice(320 * 10, 320 * 190) };
  const put = (x, y, v) => { if (x >= 0 && y >= 0 && x < card.w && y < card.h) card.px[y * card.w + x] = v; };
  const board = readPng(path.join(TEX, 'boards', 'chess20_board.png'));
  const bw = 160, bh = 60, bx = 80, by = 180 - bh - 14;
  for (let y = -2; y < bh + 2; y++) for (let x = -2; x < bw + 2; x++) {
    const edge = y < -1 || y >= bh + 1 || x < -1 || x >= bw + 1;
    put(bx + x, by + y, edge ? 0xff0a0612 : 0xff30b0f0);    // a gold frame round the strip
  }
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const sx = Math.floor(x * 256 / bw), sy = Math.floor(y * 96 / bh), o = (sy * board.w + sx) * 4;
    put(bx + x, by + y, (0xff000000 | (board.px[o + 2] << 16) | (board.px[o + 1] << 8) | board.px[o]) >>> 0);
  }
  const sq = bw / 8;
  [['black', 'rook'], ['black', 'queen'], ['white', 'knight'], ['white', 'king']].forEach(([color, t], i) => {
    const p = readPng(path.join(TEX, 'pieces', `chess20_${color}_${t}.png`));
    const size = sq * 2, ox = bx + Math.floor(sq * (1 + i * 1.6)), oy = by - sq;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const o = (Math.floor(y * p.h / size) * p.w + Math.floor(x * p.w / size)) * 4;
      if (p.px[o + 3] > 128) put(ox + x, oy + y, (0xff000000 | (p.px[o + 2] << 16) | (p.px[o + 1] << 8) | p.px[o]) >>> 0);
    }
  });
  fs.writeFileSync(path.join(TEX, 'premium', 'premium_theme_chess20.png'), png(card.px, card.w, card.h));
  console.log('previews chess20');
}

const what = process.argv[2] || 'all';
if (what === 'all' || what === 'pieces') makePieces();
if (what === 'all' || what === 'board') makeBoard();
if (what === 'all' || what === 'previews') makePreviews();
