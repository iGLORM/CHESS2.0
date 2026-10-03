// Pixel icons for the fight screen's buttons: the story items (rewind, hint, remove),
// the keepsake powers' stand-ins and the status bar (back, forward, live, undo, flip).
// Each is drawn in code on a 16x16 grid (fills only; a dark outline is added round every
// shape, light from the top left), painted into a small canvas once and shown as a
// nearest-scaled texture. Keepsakes use their own art (PixiKeepsake.icon).
//
//   PixiToolIcons.texture(id)       -> PIXI.Texture (cached)
//   PixiToolIcons.sprite(id, size)  -> PIXI.Sprite centred on (0, 0)
const PixiToolIcons = {
  N: 16,
  _tex: {},

  // Colour sets: [light, base, shade].
  PAL: {
    cyan: [0xd8fbff, 0x7fe2ff, 0x2f8fb8],
    green: [0xeaffc8, 0x8cf07a, 0x2f9a4e],
    gold: [0xfff2b0, 0xffd24a, 0xb07a1c],
    red: [0xffc0b0, 0xff6a5a, 0xa02a36],
    cream: [0xffffff, 0xe8dcc8, 0x9a8aa8],
    grey: [0xd0cadc, 0x8a84a0, 0x4e4862],
  },
  OUTLINE: 0x1a1024,

  // The drawing of each icon: fill(x, y, pal) paints one pixel (0..15).
  _art: {
    // Two triangles pointing back: rewind.
    rewind(p) {
      p.tri([[0.5, 8], [8, 2.5], [8, 13.5]], 'cyan');
      p.tri([[7.5, 8], [15, 2.5], [15, 13.5]], 'cyan');
    },
    // Half a circle back: the plain Undo.
    undo(p) {
      for (let a = -1.4; a < 1.6; a += 0.05) p.dot(8 + Math.cos(a) * 4.5, 8 - Math.sin(a) * 4.5, 'cream', 1.25);
      p.line(3, 12.5, 8, 12.5, 'cream', 1.25);
      p.tri([[1, 12.5], [5, 9], [5, 16]], 'cream');
    },
    // A light bulb.
    hint(p) {
      p.disc(8, 6.5, 4.6, 'gold');
      p.rect(6, 10, 4, 2, 'gold');
      p.rect(6, 12, 4, 1, 'grey');
      p.rect(6, 13.5, 4, 1, 'grey');
      p.rect(7, 15, 2, 1, 'grey');
      p.rect(6, 4, 1, 3, 'cream');
    },
    // A rook lifted off the board by a golden arrow.
    remove(p) {
      p.rect(4, 7, 2, 2, 'red'); p.rect(7, 7, 2, 2, 'red'); p.rect(10, 7, 2, 2, 'red');
      p.rect(4, 9, 8, 1, 'red');
      p.rect(5, 10, 6, 3, 'red');
      p.rect(3, 13, 10, 2, 'red');
      p.tri([[8, -0.5], [11.5, 3], [4.5, 3]], 'gold');
      p.rect(7, 3, 2, 2, 'gold');
    },
    back(p) { p.tri([[3, 8], [12, 2], [12, 14]], 'cream'); },
    forward(p) { p.tri([[13, 8], [4, 2], [4, 14]], 'cream'); },
    // Skip to the live position: two triangles and a bar.
    live(p) {
      p.tri([[8, 8], [2, 3], [2, 13]], 'green');
      p.tri([[13, 8], [7, 3], [7, 13]], 'green');
      p.rect(13, 3, 2, 10, 'green');
    },
    // Turn the board round: an arrow up and an arrow down.
    flip(p) {
      p.tri([[5, 1], [9, 6], [1, 6]], 'cream'); p.rect(4, 6, 2, 8, 'cream');
      p.tri([[11, 15], [7, 10], [15, 10]], 'cream'); p.rect(10, 2, 2, 8, 'cream');
    },
  },

  _paint(id) {
    const N = this.N, px = new Int32Array(N * N).fill(-1);
    const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < N && y < N) px[y * N + x] = c; };
    const shade = (x, y, pal, cx, cy, r) => {
      // Light from the top left: the rim on that side light, the far side dark.
      const P = this.PAL[pal], d = ((x - cx) + (y - cy)) / Math.max(1, r);
      return d < -0.9 ? P[0] : d > 0.7 ? P[2] : P[1];
    };
    const p = {
      dot: (cx, cy, pal, r = 1) => {
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, this.PAL[pal][y < cy - r * 0.4 ? 0 : 1]);
        }
      },
      disc: (cx, cy, r, pal) => {
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, shade(x, y, pal, cx, cy, r));
        }
      },
      rect: (x0, y0, w, h, pal) => {
        for (let y = Math.round(y0); y < Math.round(y0 + h); y++) for (let x = Math.round(x0); x < Math.round(x0 + w); x++) {
          set(x, y, this.PAL[pal][y === Math.round(y0) ? 0 : y === Math.round(y0 + h) - 1 && h > 2 ? 2 : 1]);
        }
      },
      line: (x0, y0, x1, y1, pal, r = 1) => {
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
        for (let i = 0; i <= n; i++) p.dot(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, pal, r);
      },
      tri: (pts, pal) => {
        const inside = (x, y) => {
          let s = 0;
          for (let i = 0; i < 3; i++) {
            const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 3];
            const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
            if (c !== 0) { if (s && Math.sign(c) !== s) return false; s = Math.sign(c); }
          }
          return true;
        };
        const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inside(x + 0.5, y + 0.5)) set(x, y, shade(x, y, pal, cx, cy, 5));
      },
    };
    const art = this._art[id];
    if (art) art(p);
    // The outline: every empty pixel touching a filled one.
    const out = Int32Array.from(px);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (px[y * N + x] !== -1) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X >= 0 && Y >= 0 && X < N && Y < N && px[Y * N + X] !== -1) { out[y * N + x] = this.OUTLINE; break; }
      }
    }
    return out;
  },

  texture(id) {
    if (this._tex[id]) return this._tex[id];
    const N = this.N, px = this._paint(id);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = N;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const c = px[i];
      if (c === -1) continue;
      img.data[i * 4] = c >> 16 & 255; img.data[i * 4 + 1] = c >> 8 & 255; img.data[i * 4 + 2] = c & 255; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this._tex[id] = PIXI.Texture.from({ resource: canvas, scaleMode: 'nearest' });
    return this._tex[id];
  },

  sprite(id, size) {
    const s = new PIXI.Sprite(this.texture(id));
    s.anchor.set(0.5);
    s.width = s.height = size;
    return s;
  },
};

if (typeof module !== 'undefined') module.exports = PixiToolIcons;
