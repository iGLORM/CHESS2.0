// Code-drawn "CHESS 2.0" title for the home screen: a pixel wordmark with a
// blocky 3D edge, a pixel crown on the C, a shine that sweeps across the
// letters and a subtitle ribbon. Colours come from the active theme.
const PixiTitleLogo = {
  LAYOUT: {
    WORD_SIZE: 96,       // Silkscreen bold, px
    WORD_GAP: 26,        // space between "CHESS" and "2.0"
    LETTER_SPACING: -6,
    OUTLINE: 8,          // black stroke around each letter
    DEPTH: 14,           // height of the 3D edge under the letters
    DEPTH_STEP: 2,       // pixels between edge layers
    CROWN_PX: 6,         // size of one crown pixel
    CROWN_TILT: -0.22,   // radians
    SUB_SIZE: 20,        // subtitle, Pixelify Sans
    SUB_GAP: 18,         // wordmark bottom to subtitle centre
    SUB_LINE_W: 70,      // decorative line either side of the subtitle
    SUB_LINE_GAP: 14,    // subtitle text to its diamond
    SHINE_W: 46,
    SHINE_PERIOD: 5.5,   // seconds between sweeps
    SHINE_TIME: 0.9,     // seconds a sweep takes
  },

  // 1 = gold, 2 = highlight, 3 = jewel (theme accent)
  CROWN: [
    '1....1....1',
    '12..121..12',
    '11..111..11',
    '11111111111',
    '13111311131',
    '11111111111',
  ],

  // Returns { container, update(dt), destroy() }. The container is centred on (0, 0).
  create(cols, maxW) {
    const L = this.LAYOUT;
    const root = new PIXI.Container();
    const logo = new PIXI.Container();
    root.addChild(logo);

    const light = PixiColorUtil.lighten(cols.text, 40);
    const chess = this._word('CHESS', light, cols.text, PixiColorUtil.darken(cols.text, 120));
    const version = this._word('2.0', PixiColorUtil.lighten(cols.accent, 35), cols.accent, PixiColorUtil.darken(cols.accent, 90));
    const wordW = chess.faceW + L.WORD_GAP + version.faceW;
    chess.group.x = -wordW / 2;
    version.group.x = -wordW / 2 + chess.faceW + L.WORD_GAP;

    // Soft accent glow behind the letters.
    const glow = new PIXI.Container();
    for (const src of [chess, version]) {
      const g = this._text(src.text, cols.accent, 0);
      g.x = src.group.x;
      glow.addChild(g);
    }
    glow.filters = [new PIXI.BlurFilter({ strength: 14, quality: 3 })];
    glow.alpha = 0.35;
    logo.addChild(glow, chess.group, version.group);

    // Shine: a slanted light band clipped to the letter faces. The letters are
    // flattened into one texture because a sprite mask needs a single sprite.
    const maskSrc = new PIXI.Container();
    for (const src of [chess, version]) {
      const m = this._text(src.text, '#ffffff', 0);
      m.x = src.group.x;
      maskSrc.addChild(m);
    }
    const maskBounds = maskSrc.getLocalBounds();
    const maskTexture = PixiApp.app.renderer.generateTexture(maskSrc);
    maskSrc.destroy({ children: true });
    const shineMask = new PIXI.Sprite(maskTexture);
    shineMask.x = maskBounds.x;
    shineMask.y = maskBounds.y;
    const faceH = chess.faceH;
    const shine = new PIXI.Graphics()
      .poly([0, -faceH, L.SHINE_W, -faceH, L.SHINE_W - faceH * 0.5, faceH, -faceH * 0.5, faceH])
      .fill({ color: 0xffffff, alpha: 0.5 });
    shine.mask = shineMask;
    logo.addChild(shineMask, shine);

    // Pixel crown tilted on the top-left of the C.
    const crown = this._crown(cols);
    crown.x = -wordW / 2 - 6;
    crown.y = -faceH / 2 + 16;
    crown.rotation = L.CROWN_TILT;
    logo.addChild(crown);

    // Subtitle ribbon.
    const sub = this._subtitle(cols);
    sub.y = faceH / 2 + L.DEPTH + L.SUB_GAP;
    logo.addChild(sub);

    const fullW = Math.max(wordW, sub.width) + L.OUTLINE * 2;
    logo.scale.set(Math.min(1, maxW / fullW));
    // Centre the whole block (crown above, subtitle below) on the origin.
    const top = crown.y - crown.height;
    const bottom = sub.y + L.SUB_SIZE;
    logo.y = -((top + bottom) / 2) * logo.scale.y;

    let time = 0;
    const shineFrom = -wordW / 2 - L.SHINE_W - faceH;
    const shineTo = wordW / 2 + faceH;
    shine.x = shineFrom;
    const update = (dt) => {
      time += dt;
      glow.alpha = 0.3 + Math.sin(time * 1.6) * 0.1;
      crown.y = -faceH / 2 + 16 + Math.sin(time * 2.2) * 2;
      const t = (time % L.SHINE_PERIOD) / L.SHINE_TIME;
      shine.visible = t < 1;
      if (t < 1) shine.x = shineFrom + (shineTo - shineFrom) * t;
    };
    const destroy = () => {
      root.destroy({ children: true });
      maskTexture.destroy(true);
    };
    return { container: root, update, destroy };
  },

  // App icon in the same style as the title, on a night-sky tile. Several designs
  // share the tile; ICON.VARIANT picks the one scripts/render-icons.js exports.
  ICON: {
    VARIANT: 'rook2',
    DESIGN: 1024,        // icon is laid out on a 1024 grid, then scaled
    MARGIN: 40,          // transparent border around the tile
    RADIUS: 190,
    BORDER: 14,
    WORD_W: 700,         // width of "2.0" (wordmark design)
    WORD_Y: 670,
    CROWN_PX: 34,
    CROWN_Y: 420,
    SKY_TOP: 0x3a2170,
    SKY_BOTTOM: 0x120a26,
    TEXT: '#fff5a0',     // space theme colours, the game's default look
    ACCENT: '#88d8b0',
    GOLD: { h: 0xfff1a8, g: 0xf5c542, s: 0xc0841c, d: 0x4a2a08, a: 0x88d8b0 },
    STARS: [[190, 200, 3], [820, 170, 3], [860, 420, 2], [150, 470, 2], [300, 110, 2],
            [720, 90, 2], [560, 150, 2], [170, 890, 2], [880, 900, 2], [120, 700, 2], [900, 660, 2]],
  },

  // Pixel sprites: h highlight, g gold, s shade, d dark, a accent jewel. Outlines are added automatically.
  KNIGHT: [
    '......gg.g......',
    '.....ghgggg.....',
    '....ghhggggs....',
    '...ghhgggggss...',
    '..ghhgdgggggs...',
    '.ghhggggggggss..',
    'ghhgggggggggss..',
    'ghggggggggggggs.',
    '.ggsss.gggggggs.',
    '..ss...ghggggss.',
    '.......ghgggggs.',
    '......ghggggggs.',
    '......ghgggggss.',
    '.....ghggggggss.',
    '....ssssssssssss',
    '....ghhgaggggss.',
    '...ghhgggggggss.',
    '..ssssssssssssss',
  ],
  KING: [
    '.......hg.......',
    '.......hg.......',
    '.....hhhgggg....',
    '.......hg.......',
    '......hggs......',
    '.....hhggss.....',
    '....hhgggsss....',
    '....hhgggsss....',
    '.....hggggs.....',
    '......hggs......',
    '.....hhggss.....',
    '.....hhggss.....',
    '....hhgggsss....',
    '....hhgggsss....',
    '...hhggggssss...',
    '..ssssssssssss..',
    '..hhggggagggss..',
    '.hhgggggggggsss.',
    '.ssssssssssssss.',
  ],

  // A rook drawn as the digit "2": battlements on top, the body is the diagonal
  // stroke and the base is the flat foot. '#' = solid, '=' = shaded ledge.
  ROOK_TWO: [
    '####...#####...####',
    '####...#####...####',
    '###################',
    '###################',
    '===================',
    '.#################.',
    '.####...##########.',
    '.###....##########.',
    '........##########.',
    '........##########.',
    '.......##########..',
    '.......##########..',
    '......##########...',
    '......##########...',
    '.....##########....',
    '.....##########....',
    '...###############.',
    '.#################.',
    '===================',
    '###################',
    '###################',
  ],
  SMALL_DOT_ZERO: [
    '.....###.',
    '....#####',
    '....##.##',
    '....##.##',
    '....##.##',
    '##..#####',
    '##...###.',
  ],

  // Gold pixel glyph with a black outline; columns right of fadeFrom (0..1 of the
  // width) dissolve into scattered, fading pixels.
  _pixelGlyph(rows, P, fadeFrom = 1) {
    const I = this.ICON;
    const W = Math.max(...rows.map(r => r.length));
    const H = rows.length;
    const rand = (x, y) => {
      let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const solid = (x, y) => y >= 0 && y < H && x >= 0 && x < W && rows[y][x] !== '.';
    const fade = x => (fadeFrom >= 1 ? 0 : Math.max(0, (x / (W - 1) - fadeFrom) / (1 - fadeFrom)));
    // Which pixels survive the dissolve; outlines only hug the solid part.
    const kept = new Map();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!solid(x, y)) continue;
      const f = fade(x);
      if (f === 0 || rand(x, y) > f * 0.45) kept.set(`${x},${y}`, f);
    }
    const g = new PIXI.Graphics();
    const isSolidKept = (x, y) => kept.has(`${x},${y}`);
    for (let y = -1; y <= H; y++) for (let x = -1; x <= W; x++) {
      // Dissolved pixels stay see-through rather than turning into black holes.
      if (kept.has(`${x},${y}`) || solid(x, y)) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (isSolidKept(x + dx, y + dy)) { near = true; break; }
      if (near) g.rect(x * P, y * P, P, P).fill(0x000000);
    }
    for (const [key, f] of kept) {
      const [x, y] = key.split(',').map(Number);
      const ledge = rows[y][x] === '=';
      let color = ledge ? I.GOLD.s : I.GOLD.g;
      if (!ledge && !solid(x - 1, y)) color = I.GOLD.h;
      else if (!ledge && !solid(x + 1, y)) color = I.GOLD.s;
      if (f > 0.5 && rand(y, x) < 0.25) color = I.GOLD.a;
      g.rect(x * P, y * P, P, P).fill({ color, alpha: 1 - f * 0.3 });
    }
    // Loose pixels drifting off to the right of the dissolving edge.
    if (fadeFrom < 1) {
      for (let y = 0; y < H; y++) for (let x = W; x < W + 6; x++) {
        const edge = [1, 2, 3].some(k => solid(W - k, y));
        if (!edge) continue;
        const r = rand(x + 11, y + 7);
        if (r < 0.5 - (x - W) * 0.08) {
          g.rect(x * P + P * 0.15, y * P + P * 0.15, P * 0.7, P * 0.7)
            .fill({ color: r < 0.15 ? I.GOLD.a : I.GOLD.g, alpha: 0.85 - (x - W) * 0.13 });
        }
      }
    }
    return g;
  },

  _sprite(rows, P, palette) {
    const g = new PIXI.Graphics();
    const filled = (x, y) => y >= 0 && y < rows.length && x >= 0 && x < rows[y].length && rows[y][x] !== '.';
    rows.forEach((row, y) => [...row].forEach((c, x) => {
      if (c !== '.') return;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (filled(x + dx, y + dy)) { g.rect(x * P, y * P, P, P).fill(0x000000); return; }
      }
    }));
    // Pixels on the sprite's edge row/column also need an outline outside the grid.
    const W = Math.max(...rows.map(r => r.length));
    for (let y = -1; y <= rows.length; y++) for (let x = -1; x <= W; x++) {
      if (y >= 0 && y < rows.length && x >= 0 && x < W) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (filled(x + dx, y + dy)) { near = true; break; }
      if (near) g.rect(x * P, y * P, P, P).fill(0x000000);
    }
    rows.forEach((row, y) => [...row].forEach((c, x) => {
      if (c !== '.') g.rect(x * P, y * P, P, P).fill(palette[c]);
    }));
    return g;
  },

  _iconTile(parent, opts = {}) {
    const I = this.ICON;
    const D = I.DESIGN;
    const inner = D - I.MARGIN * 2;
    const sky = new PIXI.FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
      colorStops: [{ offset: 0, color: I.SKY_TOP }, { offset: 1, color: I.SKY_BOTTOM }],
    });
    const bg = new PIXI.Graphics().roundRect(I.MARGIN, I.MARGIN, inner, inner, I.RADIUS).fill(sky);
    for (const [x, y, s] of I.STARS) {
      if (opts.floorY && y > opts.floorY - 40) continue;
      const p = s * 6;
      bg.rect(x - p / 2, y - p * 1.5, p, p * 3).fill({ color: 0xffffff, alpha: 0.75 });
      bg.rect(x - p * 1.5, y - p / 2, p * 3, p).fill({ color: 0xffffff, alpha: 0.75 });
    }
    parent.addChild(bg);
    if (opts.floorY) {
      // Checkerboard floor, clipped to the tile's rounded corners.
      const floor = new PIXI.Graphics();
      const sq = 92;
      for (let row = 0; row * sq + opts.floorY < D; row++) {
        for (let col = 0; col * sq < D; col++) {
          floor.rect(col * sq, opts.floorY + row * sq, sq, sq)
            .fill({ color: (row + col) % 2 ? 0x2a1850 : 0x6a4fa8, alpha: 1 });
        }
      }
      floor.rect(0, opts.floorY, D, 8).fill({ color: PixiColorUtil.hexToNum(I.ACCENT), alpha: 0.8 });
      const mask = new PIXI.Graphics().roundRect(I.MARGIN, I.MARGIN, inner, inner, I.RADIUS).fill(0xffffff);
      floor.mask = mask;
      parent.addChild(mask, floor);
    }
    const rim = new PIXI.Graphics()
      .roundRect(I.MARGIN, I.MARGIN, inner, inner, I.RADIUS)
      .stroke({ color: 0x000000, width: I.BORDER, alignment: 1 })
      .roundRect(I.MARGIN + 26, I.MARGIN + 26, inner - 52, inner - 52, I.RADIUS - 26)
      .stroke({ color: PixiColorUtil.hexToNum(I.ACCENT), width: 6, alpha: 0.35 });
    parent.addChild(rim);
  },

  _iconGlow(parent, x, y, rx, ry) {
    const g = new PIXI.Graphics().ellipse(x, y, rx, ry).fill({ color: PixiColorUtil.hexToNum(this.ICON.ACCENT), alpha: 0.4 });
    g.filters = [new PIXI.BlurFilter({ strength: 60, quality: 4 })];
    parent.addChild(g);
  },

  // Small "2.0" tag in the corner of the piece designs.
  _iconBadge(parent, size) {
    const I = this.ICON;
    const w = 330;
    const h = 170;
    const x = I.DESIGN - I.MARGIN - w - 60;
    const y = I.DESIGN - I.MARGIN - h - 60;
    const g = new PIXI.Graphics()
      .roundRect(x + 10, y + 14, w, h, 40).fill({ color: 0x000000, alpha: 0.5 })
      .roundRect(x, y, w, h, 40).fill(PixiColorUtil.hexToNum(I.ACCENT))
      .roundRect(x, y, w, h, 40).stroke({ color: 0x000000, width: 12 });
    const t = new PIXI.Text({
      text: '2.0',
      style: { fontFamily: PixiTextStyles.FONT_TITLE, fontWeight: '700', fontSize: 130, letterSpacing: -8, fill: '#1a1030' },
    });
    t.resolution = Math.max(1, (size / I.DESIGN) * 2);
    t.anchor.set(0.5);
    t.x = x + w / 2;
    t.y = y + h / 2 + 4;
    parent.addChild(g, t);
  },

  renderIcon(size, variant = this.ICON.VARIANT) {
    const I = this.ICON;
    const D = I.DESIGN;
    const root = new PIXI.Container();
    const tile = new PIXI.Container();
    root.addChild(tile);

    if (variant === 'rook2') {
      this._iconTile(tile);
      const P = 24;
      const two = this.ROOK_TWO;
      const small = this.SMALL_DOT_ZERO;
      const gap = 2;
      const totalW = (two[0].length + gap + small[0].length) * P;
      const x = Math.round((I.DESIGN - totalW) / 2);
      const y = Math.round((I.DESIGN - two.length * P) / 2) + 10;
      this._iconGlow(tile, x + two[0].length * P / 2, y + two.length * P / 2, 300, 330);
      const big = this._pixelGlyph(two, P, 0.8);
      big.x = x;
      big.y = y;
      const tail = this._pixelGlyph(small, P);
      tail.x = x + (two[0].length + gap) * P;
      tail.y = y + (two.length - small.length) * P;
      tile.addChild(big, tail);
    } else if (variant === 'wordmark') {
      this._iconTile(tile);
      const word = this._word('2.0', PixiColorUtil.lighten(I.ACCENT, 35), I.ACCENT, PixiColorUtil.darken(I.ACCENT, 90));
      const k = I.WORD_W / word.faceW;
      word.group.children.forEach(t => { t.resolution = Math.max(1, k * (size / D) * 2); });
      word.group.scale.set(k);
      word.group.x = (D - I.WORD_W) / 2;
      word.group.y = I.WORD_Y;
      tile.addChild(word.group);
      const crown = this._crown({ accent: I.ACCENT }, I.CROWN_PX);
      crown.x = (D - this.CROWN[0].length * I.CROWN_PX) / 2;
      crown.y = I.CROWN_Y;
      tile.addChild(crown);
    } else {
      const piece = variant.startsWith('king') ? this.KING : this.KNIGHT;
      const onBoard = variant.endsWith('Board');
      const floorY = onBoard ? 760 : 0;
      this._iconTile(tile, { floorY });
      const withCrown = variant.includes('Crown');
      const P = onBoard ? (withCrown ? 32 : 36) : 34;
      const w = piece[0].length * P;
      const h = piece.length * P;
      const x = Math.round((D - w) / 2) - (onBoard ? 0 : 50);
      const y = onBoard ? floorY - h + P * 1.2 : Math.round((D - h) / 2) + 10;
      this._iconGlow(tile, x + w / 2, y + h / 2, w * 0.55, h * 0.45);
      const sprite = this._sprite(piece, P, I.GOLD);
      sprite.x = x;
      sprite.y = y;
      tile.addChild(sprite);
      if (withCrown) {
        // The title's crown, tilted on the knight's head.
        const crown = this._crown({ accent: I.ACCENT }, Math.round(P * 0.62));
        crown.x = x + P * 3.2;
        crown.y = y + P * 0.9;
        crown.rotation = -0.3;
        tile.addChild(crown);
      }
      if (!onBoard) this._iconBadge(tile, size);
    }

    tile.scale.set(size / D);
    const canvas = PixiApp.app.renderer.extract.canvas({
      target: root,
      frame: new PIXI.Rectangle(0, 0, size, size),
      resolution: 1,
      clearColor: [0, 0, 0, 0],
    });
    const url = canvas.toDataURL('image/png');
    root.destroy({ children: true });
    return url;
  },

  _text(text, fill, stroke) {
    const L = this.LAYOUT;
    const style = {
      fontFamily: PixiTextStyles.FONT_TITLE,
      fontWeight: '700',
      fontSize: L.WORD_SIZE,
      letterSpacing: L.LETTER_SPACING,
      fill,
      padding: L.OUTLINE + 4,
    };
    if (stroke) style.stroke = { color: stroke, width: L.OUTLINE, join: 'miter' };
    const t = new PIXI.Text({ text, style });
    t.anchor.set(0, 0.5);
    return t;
  },

  // One word: stacked edge layers under a gradient face, all outlined in black.
  _word(text, topColor, bottomColor, edgeColor) {
    const L = this.LAYOUT;
    const group = new PIXI.Container();
    const shadow = this._text(text, '#000000', '#000000');
    shadow.y = L.DEPTH + 6;
    shadow.alpha = 0.45;
    group.addChild(shadow);
    // Solid edge block; the deepest layer carries the black outline.
    for (let d = L.DEPTH; d > 0; d -= L.DEPTH_STEP) {
      const layer = this._text(text, edgeColor, d === L.DEPTH ? '#000000' : edgeColor);
      layer.y = d;
      group.addChild(layer);
    }
    const gradient = new PIXI.FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: PixiColorUtil.hexToNum(topColor) },
        { offset: 0.55, color: PixiColorUtil.hexToNum(bottomColor) },
        { offset: 1, color: PixiColorUtil.hexToNum(PixiColorUtil.darken(bottomColor, 18)) },
      ],
    });
    const face = this._text(text, gradient, '#000000');
    group.addChild(face);
    const plain = this._text(text, '#ffffff', 0);
    return { group, text, faceW: plain.width, faceH: plain.height - (L.OUTLINE + 4) * 2 };
  },

  _crown(cols, pixel) {
    const P = pixel || this.LAYOUT.CROWN_PX;
    const rows = this.CROWN;
    const g = new PIXI.Graphics();
    const palette = {
      1: 0xf5c542,
      2: 0xfff1a8,
      3: PixiColorUtil.hexToNum(cols.accent),
    };
    // Black outline one pixel wider than the shape, then the coloured pixels.
    rows.forEach((row, y) => [...row].forEach((c, x) => {
      if (c !== '.') g.rect((x - 1) * P, (y - 1) * P, P * 3, P * 3).fill(0x000000);
    }));
    rows.forEach((row, y) => [...row].forEach((c, x) => {
      if (c !== '.') g.rect(x * P, y * P, P, P).fill(palette[c]);
    }));
    g.pivot.set(0, rows.length * P);
    return g;
  },

  _subtitle(cols) {
    const L = this.LAYOUT;
    const accent = PixiColorUtil.hexToNum(cols.accent);
    const c = new PIXI.Container();
    const t = new PIXI.Text({
      text: 'A PIXEL CHESS ADVENTURE',
      style: {
        fontFamily: PixiTextStyles.FONT_BODY,
        fontWeight: '700',
        fontSize: L.SUB_SIZE,
        letterSpacing: 3,
        fill: cols.text,
        stroke: { color: '#000000', width: 4, join: 'miter' },
      },
    });
    t.anchor.set(0.5);
    c.addChild(t);
    const g = new PIXI.Graphics();
    for (const side of [-1, 1]) {
      const dx = side * (t.width / 2 + L.SUB_LINE_GAP);
      g.poly([dx - 6, 0, dx, -6, dx + 6, 0, dx, 6]).fill(accent);
      const lineStart = dx + side * 12;
      const lineEnd = lineStart + side * L.SUB_LINE_W;
      g.rect(Math.min(lineStart, lineEnd), -1, L.SUB_LINE_W, 3).fill({ color: accent, alpha: 0.8 });
    }
    c.addChild(g);
    return c;
  },
};
