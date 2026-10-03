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
    // The blur never changes, so draw it once and only fade the cached result.
    glow.cacheAsTexture(true);
    const glowFade = new PIXI.Container();
    glowFade.addChild(glow);
    glowFade.alpha = 0.35;
    logo.addChild(glowFade, chess.group, version.group);

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
      glowFade.alpha = 0.3 + Math.sin(time * 1.6) * 0.1;
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
