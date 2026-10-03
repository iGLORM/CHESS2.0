// Grandpa's biplane, the one Pawnie gives you: the same 96x50 pixel sprite the live scene
// scenes/plane_gift.js paints, repainted in the plane's paint (Wallet.planeColors). The world
// map, the hand-flown plane, the gift's take-off and the Shop all draw it from here.
//
// PixiPlane.make(colors) returns a container in the old map plane's units (nose to the right,
// about 50 wide; the world map scales it by 1.9): `_prop` is the blade, flicked on and off by
// the callers, and SEAT is where the king sits.
const PixiPlane = {
  W: 96,
  H: 50,
  CY: 22,
  // One container unit is this many sprite pixels: at the map's 1.9 scale one sprite pixel is
  // one scene pixel, so the gift's plane swaps for this one without a seam.
  UNIT: 1.9,
  ORIGIN: { x: 44, y: 19 },     // the sprite pixel at the container's (0, 0)
  SEAT: { x: 2, y: -3 },        // the cockpit, in container units
  NOSE: { x: 91, y: 22 },       // the spinner, in sprite pixels
  DEFAULT: ['#f4f0e8', '#d94a4a', '#5a5a6a'],
  _cache: {},

  // Five-step ramps (dark to light) for the body and the trim. The default paint keeps the
  // gift scene's hand-picked colours; a bought paint is ramped from its [body, trim, shade].
  ramps(colors) {
    const [body, trim, shade] = colors || this.DEFAULT;
    if ([body, trim, shade].join() === this.DEFAULT.join()) {
      return {
        body: ['#3a3848', '#8a8490', '#d8d0c4', '#f4f0e8', '#fffaf0'],
        trim: ['#4a1418', '#8a2a2c', '#c03a38', '#d94a4a', '#f47a62'],
      };
    }
    const mix = (a, b, t) => {
      const p = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
      const x = p(a), y = p(b);
      return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
    };
    return {
      body: [mix(shade, '#000000', 0.35), mix(shade, body, 0.45), mix(body, shade, 0.2), body, mix(body, '#ffffff', 0.5)],
      trim: [mix(trim, '#000000', 0.65), mix(trim, '#000000', 0.4), mix(trim, '#000000', 0.15), trim, mix(trim, '#ffffff', 0.35)],
    };
  },

  // The sprite's pixels as '#rrggbb' strings (null: clear), row by row. Same drawing as the
  // plane in scenes/plane_gift.js; keep the two in step.
  pixels(colors) {
    const { W, H, CY } = this;
    const px = new Array(W * H).fill(null);
    const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) px[y * W + x] = c; };
    const { body: BODY, trim: TRIM } = this.ramps(colors);
    const OUT = '#1a1420';
    const fill = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = f(x, y); if (c) put(x, y, c); } };
    // Fuselage: slim at the tail, full behind the cockpit; cel bands top to bottom.
    const half = x => x < 12 ? 0 : x < 52 ? 2 + 5 * Math.sin((x - 12) / 40 * Math.PI / 2) : x < 80 ? 7 - (x - 52) / 28 : 6;
    for (let x = 12; x <= 84; x++) {
      const h = half(x), top = Math.round(CY - h), bot = Math.round(CY + h);
      for (let y = top - 1; y <= bot + 1; y++) {
        let c;
        if (y < top || y > bot) c = OUT;
        else {
          const t = (y - top) / Math.max(1, bot - top);
          c = t < 0.15 ? BODY[4] : t < 0.5 ? BODY[3] : t < 0.8 ? BODY[2] : BODY[1];
          if (Math.abs(y - (CY + 1)) < 1 && x > 18 && x < 78) c = TRIM[3];        // the pinstripe
          if (Math.abs(y - (CY + 2)) < 1 && x > 18 && x < 78) c = TRIM[1];
        }
        put(x, y, c);
      }
    }
    // Cowling and the gold spinner.
    for (let x = 76; x <= 86; x++) {
      const h = x < 84 ? 6 : 6 - (x - 83) * 1.5, top = Math.round(CY - h), bot = Math.round(CY + h);
      for (let y = top - 1; y <= bot + 1; y++) {
        const t = (y - top) / Math.max(1, bot - top);
        put(x, y, y < top || y > bot ? OUT : t < 0.15 ? TRIM[4] : t < 0.55 ? TRIM[3] : t < 0.85 ? TRIM[2] : TRIM[1]);
      }
      if (x % 3 === 0 && x < 84) for (let y = CY - 4; y <= CY + 3; y += 2) put(x, y, TRIM[1]);   // cooling louvres
    }
    fill(87, CY - 2, 90, CY + 2, (x, y) => Math.abs(y - CY) > (90 - x) * 0.8 + 0.5 ? 0 : y < CY ? '#ffe080' : '#b07a1c');
    // Tail fin and stabiliser.
    fill(10, 6, 26, CY, (x, y) => {
      const front = 10 + (CY - y) * 0.15, back = 26 - (CY - y) * 0.6;
      if (x < front || x > back || y < 7) return 0;
      if (x < front + 1 || x > back - 1 || y === 7) return OUT;
      return y < 11 ? TRIM[4] : x > back - 3 ? TRIM[2] : TRIM[3];
    });
    fill(6, CY - 1, 24, CY + 2, (x, y) => (y === CY - 1 || y === CY + 2 || x === 6) ? OUT : y === CY ? BODY[4] : BODY[2]);
    // Open cockpit with a leather seat and a little windscreen.
    fill(42, CY - 7, 54, CY - 4, (x, y) => (y === CY - 7 ? OUT : y === CY - 6 ? '#2a1a18' : x < 46 ? '#6a3a24' : '#1e1418'));
    fill(55, CY - 11, 57, CY - 6, (x) => (x === 55 ? '#c8f0ff' : x === 56 ? '#78a8c8' : OUT));
    // The roundel: trim ring, light ring, gold centre.
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) {
      const d = Math.hypot(x, y);
      if (d <= 5) put(32 + x, CY - 1 + y, d > 4.2 ? OUT : d > 3 ? TRIM[3] : d > 1.6 ? BODY[4] : '#e0a830');
    }
    // Wings: the top one in the body colour, the lower one in the trim, with struts and rigging.
    fill(30, 2, 80, 7, (x, y) => (y === 2 || y === 7 || x === 30 || x === 80) ? OUT : y === 3 ? BODY[4] : y < 6 ? BODY[3] : BODY[1]);
    fill(77, 3, 79, 6, (x, y) => (y < 5 ? TRIM[4] : TRIM[2]));                   // wingtip
    fill(32, 29, 78, 33, (x, y) => (y === 29 || y === 33 || x === 32 || x === 78) ? OUT : y === 30 ? TRIM[4] : y < 32 ? TRIM[3] : TRIM[1]);
    const strut = (x0, y0, x1, y1) => { const n = 30; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; put(x, y, OUT); put(x + 1, y, '#8a7a6a'); } };
    strut(36, 8, 37, 28); strut(72, 8, 71, 28);                                   // interplane struts
    strut(48, 8, 50, CY - 7); strut(64, 8, 62, CY - 7);                           // cabane struts
    for (let i = 0; i <= 20; i++) put(37 + i * 34 / 20, 8 + i, '#5a5060');        // a rigging wire
    // Landing gear: two legs to the wheel, then the tail skid.
    strut(52, CY + 6, 56, 40); strut(66, CY + 6, 59, 40);
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
      const d = Math.hypot(x, y);
      if (d <= 6) put(58 + x, 42 + y, d > 5.2 ? OUT : d > 3.2 ? (x + y < -2 ? '#4a4450' : '#26222c') : d > 1.5 ? '#b8b0a8' : '#ffe080');
    }
    strut(14, CY + 3, 11, CY + 7);
    // Exhaust stub under the cowling.
    fill(70, CY + 6, 75, CY + 7, (x, y) => (y === CY + 6 ? '#5a5a64' : '#2a2a34'));
    // Light on the edges facing the nose.
    const lit = colors && colors.join() !== this.DEFAULT.join() ? BODY[4] : '#ffe6b0';
    for (let y = 0; y < H; y++) for (let x = W - 1; x > 0; x--) {
      const i = y * W + x, c = px[i];
      if (!c || c === OUT) continue;
      if (!px[i + 1] || px[i + 1] === OUT) {
        if (c === BODY[3] || c === BODY[2] || c === BODY[4]) px[i] = lit;
        else if (c === TRIM[3] || c === TRIM[2]) px[i] = TRIM[4];
      }
      break;
    }
    return px;
  },

  texture(colors) {
    const key = (colors || this.DEFAULT).join();
    const hit = this._cache[key];
    if (hit && !hit.destroyed) return hit;
    const canvas = document.createElement('canvas');
    canvas.width = this.W;
    canvas.height = this.H;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(this.W, this.H);
    this.pixels(colors).forEach((c, i) => {
      if (!c) return;
      img.data[i * 4] = parseInt(c.slice(1, 3), 16);
      img.data[i * 4 + 1] = parseInt(c.slice(3, 5), 16);
      img.data[i * 4 + 2] = parseInt(c.slice(5, 7), 16);
      img.data[i * 4 + 3] = 255;
    });
    ctx.putImageData(img, 0, 0);
    return (this._cache[key] = PIXI.Texture.from({ resource: canvas, scaleMode: 'nearest' }));
  },

  make(colors) {
    const c = new PIXI.Container();
    const s = 1 / this.UNIT;
    const sp = new PIXI.Sprite(this.texture(colors));
    sp.scale.set(s);
    sp.x = -this.ORIGIN.x * s;
    sp.y = -this.ORIGIN.y * s;
    // Propeller: a pale blur always, a blade the callers flick on and off.
    const nx = (this.NOSE.x - this.ORIGIN.x) * s, ny = (this.NOSE.y - this.ORIGIN.y) * s, r = 14 * s;
    const blur = new PIXI.Graphics().ellipse(nx, ny, 2.6 * s, r).fill({ color: 0x7a6460, alpha: 0.45 })
      .rect(nx - s / 2, ny - r, s, s).fill({ color: 0xffe080, alpha: 0.6 })
      .rect(nx - s / 2, ny + r - s, s, s).fill({ color: 0xffe080, alpha: 0.6 });
    const prop = new PIXI.Graphics().rect(nx - s / 2, ny - r * 0.9, s, r * 1.8).fill({ color: 0x5a3420, alpha: 0.85 });
    c.addChild(sp, blur, prop);
    c._prop = prop;
    return c;
  },
};
