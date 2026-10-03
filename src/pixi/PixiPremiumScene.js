const PixiPremiumScene = {
  get W() { return typeof Layout !== 'undefined' ? Layout.W : 1280; },
  get H() { return typeof Layout !== 'undefined' ? Layout.H : 800; },
  get safe() { return { x: 64, top: 104, bottom: this.H - 56 }; },

  // Bottom bar shared by every menu screen: navigation buttons sit inside it,
  // vertically centred, with the hint text between them.
  get FOOTER_H() { return Layout.isPortrait ? Layout.SAFE_BOTTOM + 72 : 72; },
  FOOTER_SIDE: 36,          // screen edge to the first/last bar button
  FOOTER_HINT_CLEAR: 250,   // space kept free for buttons on each side of the hint
  get footerY() { return this.H - this.FOOTER_H; },
  // Top of the content area's free space: panels should end above this.
  get contentBottom() { return Layout.isPortrait ? this.H - Layout.SAFE_BOTTOM - 64 : this.footerY - 14; },
  // Landscape board screens: panels either side of the board, as tall as it,
  // with the action buttons in the strip under them.
  sidePanels() {
    const bx = PixiBoardRenderer.boardOffsetX;
    const by = PixiBoardRenderer.boardOffsetY;
    const size = PixiBoardRenderer.squareSize * 8;
    const margin = 24;
    const gutter = 30;
    const w = bx - gutter - margin;
    return { leftX: margin, rightX: bx + size + gutter, top: by - 14, w, h: size + 28, buttonY: by + size + 28 };
  },

  bottomButtonY(h = 44) {
    if (Layout.isPortrait) return this.H - Layout.SAFE_BOTTOM - 48;
    return Math.round(this.footerY + (this.FOOTER_H - h) / 2);
  },

  cols() {
    return ThemeManager.getCurrentColors();
  },

  color(value, fallback = 0xffffff) {
    if (!value) return fallback;
    return PixiColorUtil.hexToNum(value);
  },

  alpha(value, alphaHex) {
    return PixiColorUtil.alpha(value, alphaHex);
  },

  root(title, subtitle, options = {}) {
    const cols = this.cols();
    const root = new PIXI.Container();
    root.label = `${title || 'Premium'}Screen`;
    root._premiumDrift = [];
    root._premiumTime = 0;

    this.background(root, options.themeId || store.get('theme') || 'chess20');
    this.header(root, title, subtitle, options);
    if (options.footer !== false) this.footer(root, cols, options.footerHint);
    return root;
  },

  background(root, themeId) {
    const bg = new PIXI.Container();
    bg.label = 'premiumBackground';
    root.addChild(bg);

    // The theme's painted, animated scene (same as Home and the game); the
    // generic backdrop only for Custom or while the scene is still loading.
    const scene = new PIXI.Container();
    bg.addChild(scene);
    if (!this._paintedScene(scene, themeId)) {
      const back = new PIXI.Sprite(PixiPremiumAssets.background(themeId));
      back.width = this.W + 48;
      back.height = this.H + 32;
      back.x = -24;
      back.y = -16;
      scene.addChild(back);
      root._premiumDrift.push({ obj: back, baseX: -24, baseY: -16, ampX: 8, ampY: 4, speed: 0.12 });
      if (TextureManager.BACKGROUND_FILES[themeId]) {
        TextureManager.preloadTheme(themeId).then(() => {
          if (scene.destroyed) return;
          const old = scene.removeChildren();
          if (this._paintedScene(scene, themeId)) {
            root._premiumDrift = root._premiumDrift.filter(d => !old.includes(d.obj));
            old.forEach(o => o.destroy());
          } else {
            scene.addChild(...old);
          }
        });
      }
    }

    const cols = this.cols();
    const wash = new PIXI.Graphics()
      .rect(0, 0, this.W, this.H)
      .fill({ color: 0x030711, alpha: 0.34 });
    bg.addChild(wash);

    const light = new PIXI.Graphics();
    light.ellipse(this.W / 2, 210, Math.min(500, this.W * 0.4), 170).fill({ color: this.color(cols.accent), alpha: 0.08 });
    light.ellipse(this.W * 0.2, this.H * 0.78, Math.min(340, this.W * 0.27), 120).fill({ color: this.color(cols.lightSquare), alpha: 0.045 });
    bg.addChild(light);

    const stars = new PIXI.Container();
    bg.addChild(stars);
    const starCount = Math.round(46 * (typeof Graphics !== 'undefined' ? Graphics.particles() : 1));
    for (let i = 0; i < starCount; i++) {
      const dot = new PIXI.Graphics();
      const size = i % 5 === 0 ? 4 : 2;
      dot.rect(0, 0, size, size).fill({ color: this.color(i % 3 ? cols.text : cols.accent), alpha: 0.18 + (i % 7) * 0.04 });
      dot.x = (i * 97) % this.W;
      dot.y = 24 + ((i * 53) % (this.H - 150));
      stars.addChild(dot);
    }
    root._premiumDrift.push({ obj: stars, baseX: 0, baseY: 0, ampX: 16, ampY: 7, speed: 0.18 });

    const vignette = new PIXI.Graphics();
    vignette.rect(0, 0, this.W, 90).fill({ color: 0x01030a, alpha: 0.36 });
    vignette.rect(0, this.H - 110, this.W, 110).fill({ color: 0x01030a, alpha: 0.44 });
    vignette.rect(0, 0, 54, this.H).fill({ color: 0x01030a, alpha: 0.30 });
    vignette.rect(this.W - 54, 0, 54, this.H).fill({ color: 0x01030a, alpha: 0.30 });
    bg.addChild(vignette);
    return bg;
  },

  // Fills `holder` with the theme's painted background and its moving layers.
  // Returns false if the art isn't available (yet).
  _paintedScene(holder, themeId) {
    const img = TextureManager.getBackgroundTexture(themeId);
    if (!img || typeof PixiBackgroundScene === 'undefined' || !PixiBackgroundScene.ready(themeId)) return false;
    const back = PIXI.Sprite.from(img);
    back.width = this.W;
    back.height = this.H;
    holder.addChild(back);
    const layers = new PIXI.Container();
    holder.addChild(layers);
    const update = PixiBackgroundScene.build(themeId, layers, back.texture);
    if (update && PixiApp.app) {
      let time = 0;
      const tick = (ticker) => {
        const dt = ticker.deltaTime / 60;
        time += dt;
        update(time, dt);
      };
      PixiApp.app.ticker.add(tick);
      holder.once('destroyed', () => PixiApp.app && PixiApp.app.ticker.remove(tick));
    }
    return true;
  },

  header(root, title, subtitle, options = {}) {
    if (!title) return null;
    const cols = this.cols();
    const group = new PIXI.Container();
    group.label = 'premiumHeader';
    root.addChild(group);

    const titleText = this.text(title.toUpperCase(), {
      fontFamily: PixiTextStyles.FONT_TITLE,
      fontSize: options.titleSize || 42,
      fontWeight: 'bold',
      fill: cols.text,
      stroke: { color: 0x000000, width: 4 },
      padding: 8,
    });
    titleText.anchor.set(0.5);
    titleText.x = this.W / 2;
    titleText.y = 55;
    this.fit(titleText, 780);
    group.addChild(titleText);

    if (subtitle) {
      const sub = this.text(subtitle, {
        fontSize: 26,
        fontWeight: '700',
        fill: this.alpha(cols.text, 'aa'),
      });
      sub.anchor.set(0.5);
      sub.x = this.W / 2;
      sub.y = 106;
      this.fit(sub, 760);
      group.addChild(sub);
    }

    const sep = new PIXI.Graphics();
    const sepW = 570;
    const sepX = Math.floor((this.W - sepW) / 2);
    sep.rect(sepX, 130, sepW, 2).fill({ color: this.color(cols.text), alpha: 0.18 });
    sep.rect(sepX + sepW / 2 - 5, 125, 10, 10).fill({ color: this.color(cols.accent), alpha: 0.92 });
    sep.rect(sepX + sepW / 2 - 1, 121, 2, 18).fill({ color: this.color(cols.accent), alpha: 0.55 });
    group.addChild(sep);
    return group;
  },

  footer(root, cols, hint) {
    const footer = new PIXI.Container();
    footer.label = 'premiumFooter';
    root.addChild(footer);
    const footerY = this.footerY;
    const line = new PIXI.Graphics()
      .rect(0, footerY, this.W, this.FOOTER_H)
      .fill({ color: 0x020712, alpha: 0.5 })
      .rect(0, footerY, this.W, 2)
      .fill({ color: this.color(cols.accent), alpha: 0.22 });
    footer.addChild(line);
    if (hint && !Layout.isPortrait) {
      const text = this.text(hint, { fontSize: 20, fill: this.alpha(cols.text, '88') });
      text.anchor.set(0.5);
      text.x = this.W / 2;
      text.y = footerY + this.FOOTER_H / 2;
      this.fit(text, this.W - this.FOOTER_HINT_CLEAR * 2, 0.6);
      footer.addChild(text);
    }
    return footer;
  },

  text(text, style = {}) {
    return new PIXI.Text({
      text,
      style: Object.assign({
        fontFamily: PixiTextStyles.FONT_BODY,
        fontSize: 18,
        fill: '#ffffff',
        letterSpacing: 0,
        wordWrap: false,
      }, style),
    });
  },

  fit(text, maxWidth, minScale = 0.68) {
    text.scale.set(1);
    if (text.width > maxWidth) text.scale.set(Math.max(minScale, maxWidth / text.width));
    return text;
  },

  // Like fit, but a text that would need shrinking below minScale wraps onto
  // up to maxLines lines first (longer words in other languages).
  fitLines(text, maxWidth, minScale = 0.85, maxLines = 2) {
    text.scale.set(1);
    if (text.width <= maxWidth) return text;
    if (text.width * minScale <= maxWidth || !/\s/.test(text.text.trim())) return this.fit(text, maxWidth, minScale * 0.75);
    const lineH = text.height;
    text.style.wordWrap = true;
    text.style.wordWrapWidth = Math.floor(maxWidth);
    text.style.breakWords = false;
    if (text.height > lineH * maxLines + 1) {
      text.style.wordWrapWidth = Math.floor(maxWidth / minScale);
      text.scale.set(minScale);
    }
    if (text.width > maxWidth) text.scale.set(Math.min(text.scale.x, maxWidth / (text.width / text.scale.x)));
    return text;
  },

  // Outline of a box with stepped pixel corners (two steps of `u` pixels).
  pixelShape(x, y, w, h, u = 4) {
    const a = u, b = u * 2;
    return [
      x + b, y, x + w - b, y, x + w - b, y + a, x + w - a, y + a, x + w - a, y + b, x + w, y + b,
      x + w, y + h - b, x + w - a, y + h - b, x + w - a, y + h - a, x + w - b, y + h - a, x + w - b, y + h,
      x + b, y + h, x + b, y + h - a, x + a, y + h - a, x + a, y + h - b, x, y + h - b,
      x, y + b, x + a, y + b, x + a, y + a, x + b, y + a,
    ];
  },

  // Pixel-art panel: drop shadow, dark outline, theme-coloured body with a
  // bevel (light top edge, dark bottom edge) and an optional accent strip.
  panel(parent, x, y, w, h, options = {}) {
    const cols = this.cols();
    const maxW = typeof Layout !== 'undefined' ? Layout.W - 80 : this.W - 80;
    w = Math.min(w, maxW);
    const g = new PIXI.Graphics();
    const fill = this.color(options.fill || cols.panel);
    const border = this.color(options.border || cols.text);
    const accent = options.accent || cols.accent;
    const alpha = options.alpha ?? 0.72;
    const u = h < 60 ? 3 : 4;
    const edge = 3;
    g.poly(this.pixelShape(x, y + 6, w, h, u)).fill({ color: 0x000000, alpha: 0.32 * Math.min(1, alpha + 0.2) });
    g.poly(this.pixelShape(x, y, w, h, u)).fill({ color: 0x07080d, alpha: Math.min(0.92, alpha + 0.2) });
    g.poly(this.pixelShape(x + edge, y + edge, w - edge * 2, h - edge * 2, u)).fill({ color: fill, alpha });
    // Bevel: light along the top, dark along the bottom.
    g.rect(x + edge + u * 2, y + edge, w - edge * 2 - u * 4, 2).fill({ color: 0xffffff, alpha: 0.10 });
    g.rect(x + edge + u * 2, y + h - edge - 3, w - edge * 2 - u * 4, 3).fill({ color: 0x000000, alpha: 0.22 });
    // Border ring (drawn as a stroke so hover can recolour it).
    g.poly(this.pixelShape(x + 1, y + 1, w - 2, h - 2, u)).stroke({ color: border, alpha: options.borderAlpha ?? 0.30, width: 2, alignment: 1 });
    if (options.accent !== false) {
      g.rect(x + 16, y + 12, Math.max(20, w - 32), 3).fill({ color: this.color(accent), alpha: options.accentAlpha ?? 0.72 });
      g.rect(x + 16, y + 15, Math.max(20, w - 32), 1).fill({ color: 0x000000, alpha: 0.25 });
    }
    if (parent) parent.addChild(g);
    return g;
  },

  // Fill opacity of tiles, buttons and cards: low enough that the live scene
  // behind every menu shows through, while the text stays readable.
  SEE_THROUGH: { tile: 0.42, primary: 0.52, button: 0.40, primaryButton: 0.60, disabled: 0.30 },

  // Big menu tile: artwork on top, then title, subtitle and an optional detail
  // line. opts: { title, sub, detail, art(size) -> DisplayObject, primary, onClick, badge }
  tile(parent, x, y, w, h, opts = {}) {
    const s = (typeof Layout !== 'undefined' && Layout.uiScale) || 1;
    const wide = w > h * 1.9;     // phones: art on the left, text on the right
    return this.card(parent, x, y, w, h, {
      active: opts.primary,
      alpha: opts.alpha ?? (opts.primary ? this.SEE_THROUGH.primary : this.SEE_THROUGH.tile),
      accentStrip: false,
      onClick: opts.onClick,
      interactive: opts.interactive,
      label: opts.label,
      draw: (c, { hover }) => {
        const cols = this.cols();
        const lit = hover || opts.primary;
        const pad = Math.round(18 * s);
        const titleSize = Math.round((opts.titleSize || 24) * s);
        const title = this.text(opts.title.toUpperCase(), {
          fontFamily: opts.titleFont || PixiTextStyles.FONT_TITLE, fontSize: titleSize, fontWeight: 'bold',
          fill: lit ? cols.accent : cols.text,
        });
        const sub = opts.sub ? this.text(opts.sub, { fontSize: Math.round(17 * s), fill: this.alpha(cols.text, 'bb') }) : null;
        const detail = opts.detail ? this.text(opts.detail, { fontSize: Math.round(14 * s), fontWeight: '700', fill: this.alpha(lit ? cols.accent : cols.text, lit ? 'ee' : '88') }) : null;

        // Spotlight behind the art.
        const artBox = wide
          ? { x: pad, y: pad, w: h - pad * 2, h: h - pad * 2 }
          : { x: pad, y: pad + 4, w: w - pad * 2, h: Math.round(h * (opts.artShare || 0.5)) };
        const glow = new PIXI.Graphics();
        const gcx = artBox.x + artBox.w / 2, gcy = artBox.y + artBox.h / 2;
        const gr = Math.min(artBox.w, artBox.h) * 0.46;
        glow.circle(gcx, gcy, gr).fill({ color: this.color(cols.accent), alpha: lit ? 0.14 : 0.05 });
        glow.ellipse(gcx, gcy + gr * 0.9, gr * 0.7, gr * 0.12).fill({ color: 0x000000, alpha: 0.3 });
        c.addChild(glow);
        if (opts.art) {
          const art = opts.art(Math.min(artBox.w, artBox.h));
          if (art) {
            art.x = gcx;
            art.y = gcy + (hover ? -4 : 0);
            c.addChild(art);
          }
        }

        const textX = wide ? artBox.x + artBox.w + pad : pad;
        const textW = w - textX - pad;
        [title, sub, detail].forEach(t => t && this.fit(t, textW, 0.55));
        const gap = Math.round(6 * s);
        const blockH = title.height + (sub ? gap + sub.height : 0) + (detail ? gap + detail.height : 0);
        let ty = wide ? Math.round((h - blockH) / 2) : Math.round(artBox.y + artBox.h + (h - artBox.y - artBox.h - blockH) / 2) - 2;
        for (const t of [title, sub, detail]) {
          if (!t) continue;
          if (wide) { t.x = textX; } else { t.anchor.set(0.5, 0); t.x = w / 2; }
          t.y = ty;
          ty += t.height + gap;
          c.addChild(t);
        }

        if (opts.badge) {
          const b = this.text(opts.badge, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(12 * s), fill: '#10131c' });
          const bw = b.width + 16, bh = b.height + 8;
          const bg = new PIXI.Graphics().poly(this.pixelShape(w - bw - 12, 12, bw, bh, 2)).fill({ color: this.color(cols.accent) });
          b.x = w - bw - 4; b.y = 16;
          c.addChild(bg, b);
        }
      },
    });
  },

  // Screens with categories (Settings, How to Play): a column of wide tiles on the
  // left and a content panel on the right; in portrait the tiles form a row on top.
  tabLayout() {
    const s = (typeof Layout !== 'undefined' && Layout.uiScale) || 1;
    const bottom = this.contentBottom;
    if (Layout.isPortrait) {
      const x = 36, w = Layout.W - 72, y = 156, h = Math.round(150 * s);
      const panelY = y + h + 18;
      return { portrait: true, tabs: { x, y, w, h }, panel: { x, y: panelY, w, h: bottom - panelY } };
    }
    const tabW = 292, x = 56, y = 152, gap = 20;
    return {
      portrait: false,
      tabs: { x, y, w: tabW, h: bottom - y },
      panel: { x: x + tabW + gap, y, w: Layout.W - x * 2 - tabW - gap, h: bottom - y },
    };
  },

  // The category tiles for tabLayout(). tabs: [{ id, title, sub, art(size) }].
  tabStrip(parent, layout, tabs, activeId, onSelect) {
    const T = layout.tabs;
    const n = tabs.length;
    const gap = layout.portrait ? 12 : 14;
    const tw = layout.portrait ? Math.floor((T.w - gap * (n - 1)) / n) : T.w;
    const th = layout.portrait ? T.h : Math.floor((T.h - gap * (n - 1)) / n);
    return tabs.map((tab, i) => this.tile(parent,
      layout.portrait ? T.x + i * (tw + gap) : T.x,
      layout.portrait ? T.y : T.y + i * (th + gap),
      tw, th, {
        title: tab.title,
        sub: layout.portrait || th < 90 ? null : tab.sub,
        primary: activeId === tab.id,
        titleSize: layout.portrait ? (n > 4 ? 14 : 16) : 21,
        artShare: 0.5,
        art: tab.art,
        onClick: () => onSelect(tab.id),
      }));
  },

  // Tile artwork made of the theme's own chess pieces. Each entry:
  // { color, type, dx (fraction of size), scale, flip }. Returns art(size).
  pieceArt(pieces) {
    return (size) => {
      const themeId = store.get('theme') || 'chess20';
      const holder = new PIXI.Container();
      for (const p of pieces) {
        const sp = PixiPieceRenderer.createSprite(themeId, p.color || 'white', p.type);
        const d = Math.round(size * (p.scale || 0.9));
        sp.width = d;
        sp.height = d;
        if (p.flip) sp.scale.x *= -1;
        sp.x = Math.round(size * (p.dx || 0));
        sp.y = Math.round(size * (p.dy || 0));
        holder.addChild(sp);
      }
      return holder;
    };
  },

  // Arrow-key focus for a list of cards: returns { move(dx, dy), press(), focus(i) }.
  // `cols` is how many cards sit on one row.
  focusRing(cards, perRow) {
    let index = -1;
    const set = (i) => {
      if (index >= 0 && cards[index] && cards[index]._setHover) cards[index]._setHover(false);
      index = i;
      if (index >= 0 && cards[index] && cards[index]._setHover) cards[index]._setHover(true);
    };
    return {
      get index() { return index; },
      focus: set,
      move(dx, dy) {
        if (index < 0) { set(0); return; }
        const n = cards.length;
        let i = index + dx + dy * perRow;
        if (dy && (i < 0 || i >= n)) i = dy > 0 ? Math.min(n - 1, index + dy * perRow) : index % perRow;
        set(Math.max(0, Math.min(n - 1, i)));
      },
      press() { if (index >= 0 && cards[index] && cards[index]._press) cards[index]._press(); },
    };
  },

  card(parent, x, y, w, h, options = {}) {
    const maxW = typeof Layout !== 'undefined' ? Layout.W - 80 : this.W - 80;
    w = Math.min(w, maxW);
    const group = new PIXI.Container();
    group.x = x;
    group.y = y;
    group.label = options.label || 'premiumCard';
    if (options.interactive !== false) {
      group.eventMode = 'static';
      group.cursor = options.disabled ? 'default' : 'pointer';
      group.hitArea = new PIXI.Rectangle(0, 0, w, h);
    }
    parent.addChild(group);

    const draw = (hover = false) => {
      group.removeChildren();
      const local = new PIXI.Container();
      group.addChild(local);
      this.panel(local, 0, 0, w, h, {
        fill: options.fill,
        border: options.active || hover ? (options.activeColor || this.cols().accent) : this.cols().text,
        accent: options.accentStrip === false ? false
          : (options.active || hover ? (options.activeColor || this.cols().accent) : this.cols().accent),
        borderAlpha: options.active || hover ? 0.80 : 0.30,
        accentAlpha: options.active || hover ? 0.80 : 0.40,
        alpha: options.disabled ? this.SEE_THROUGH.disabled : (options.alpha ?? this.SEE_THROUGH.button),
        radius: options.radius || 10,
      });
      if (options.draw) options.draw(local, { hover });
    };
    draw(false);
    group._setHover = (on) => { if (!group.destroyed) draw(on); };
    group._press = () => {
      if (options.disabled || !options.onClick) return;
      if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(group, { y: y + 3 }, { y, duration: 0.14, ease: 'back.out(3)' });
      }
      options.onClick();
    };
    if (!options.disabled && options.interactive !== false) {
      group.on('pointerover', () => draw(true));
      group.on('pointerout', () => draw(false));
      group.on('pointerdown', () => group._press());
    }
    return group;
  },

  // The height button() really draws for a requested height (taller on phones).
  buttonHeight(h) {
    const scale = (typeof Layout !== 'undefined' && Layout.uiScale) || 1;
    return Layout.isPortrait ? Math.max(Math.round(h * scale), 68) : Math.round(h * scale);
  },

  button(parent, x, y, w, h, label, onClick, options = {}) {
    const cols = this.cols();
    const scale = (typeof Layout !== 'undefined' && Layout.uiScale) || 1;
    // Large touch targets in portrait (phones); in landscape honour the
    // requested height so buttons don't overlap the layout around them.
    const scaledH = Layout.isPortrait ? Math.max(Math.round(h * scale), 68) : Math.round(h * scale);
    const scaledFontSize = Math.round((options.fontSize || 18) * scale);
    const btn = this.card(parent, x, y, w, scaledH, {
      active: options.primary,
      disabled: options.disabled,
      fill: options.fill || cols.buttonBg,
      activeColor: options.color || cols.accent,
      alpha: options.alpha ?? (options.primary ? this.SEE_THROUGH.primaryButton : this.SEE_THROUGH.button),
      radius: 10,
      accentStrip: false,
      onClick: options.disabled ? null : onClick,
      draw: (c) => {
        let icon = null;
        if (options.icon) {
          icon = new PIXI.Sprite(PixiPremiumAssets.icon(options.icon));
          icon.width = 28;
          icon.height = 28;
        }
        const t = this.text(label, {
          fontSize: scaledFontSize,
          fontWeight: '800',
          fill: options.disabled ? this.alpha(cols.text, '66') : cols.text,
        });
        this.fit(t, w - (icon ? 74 : 24), 0.58);

        if (icon) {
          const gap = 10;
          const totalW = icon.width + gap + t.width;
          const startX = Math.max(14, (w - totalW) / 2);
          icon.x = startX;
          icon.y = (scaledH - 28) / 2;
          c.addChild(icon);
          t.anchor.set(0, 0.5);
          t.x = startX + 28 + gap;
          t.y = scaledH / 2 + 1;
        } else {
          t.anchor.set(0.5);
          t.x = w / 2;
          t.y = scaledH / 2 + 1;
        }
        c.addChild(t);
      },
    });
    return btn;
  },

  image(pathTexture, x, y, w, h, options = {}) {
    const sprite = new PIXI.Sprite(pathTexture);
    sprite.x = x;
    sprite.y = y;
    sprite.width = w;
    sprite.height = h;
    sprite.alpha = options.alpha ?? 1;
    return sprite;
  },

  update(root, dt) {
    if (!root || !root._premiumDrift) return;
    root._premiumTime = (root._premiumTime || 0) + dt / 60;
    for (const item of root._premiumDrift) {
      if (item.obj.destroyed) continue;
      item.obj.x = item.baseX + Math.sin(root._premiumTime * item.speed) * item.ampX;
      item.obj.y = item.baseY + Math.cos(root._premiumTime * item.speed * 0.8) * item.ampY;
    }
  },

  destroy(screen) {
    if (screen.pixiContainer) {
      screen.pixiContainer.destroy({ children: true });
      screen.pixiContainer = null;
    }
    PixiScreenManager.setScreenContainer(null);
  },
};
