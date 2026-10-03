// Credits: a roll that climbs the screen like the end of a big game. Logo, the
// makers, the cast (live portraits), the worlds, then the engine and licence lines,
// ending on "Thanks for playing". Hold Space / Enter / the mouse to speed it up,
// the arrow keys or the wheel to scroll by hand, Escape to leave.
const CreditsScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  SPEED: 50,           // pixels per second
  FAST: 6,             // speed-up factor while held
  END_HOLD: 3.5,       // seconds the last line stays before leaving

  // Licence lines must stay (GPL notice for Stockfish).
  SECTIONS: [
    { heading: 'Created by', names: ['iGLORM', 'Aymou'] },
    { heading: 'Starring', cast: true },
    { heading: 'The Worlds', worlds: true },
    {
      heading: 'Chess engine',
      names: ['Stockfish 18'],
      lines: [
        'Stockfish.js lite build, unmodified. GNU GPL v3, with NO WARRANTY.',
        'It runs as a separate program. Its full source code ships in the "licenses" folder',
        'and is at github.com/nmrugg/stockfish.js (commit 32d4b5a) and github.com/official-stockfish.',
      ],
    },
    {
      heading: 'Built with',
      names: ['PixiJS', 'Three.js', 'GSAP', 'Electron', 'Pretext'],
      lines: ['PixiJS, Three.js, Electron and Pretext: MIT License.  GSAP: GreenSock standard license.'],
    },
    {
      heading: 'Fonts',
      names: ['Pixelify Sans', 'Silkscreen'],
      lines: [
        'SIL Open Font License 1.1.',
        'Pixelify Sans letters C, c, 2, 3, 5, 6, 9, S and G were adjusted for legibility.',
      ],
    },
    { heading: 'Music and sound', names: ['Synthesised live in the game'], lines: ['Every song and sound effect is played by code; there are no audio files.'] },
    { heading: 'Art', names: ['Drawn in code'], lines: ['The worlds and characters are pixel scenes painted every frame.'] },
  ],

  init(data) {
    this.returnTo = (data && data.returnTo) || 'settings';
    this._hold = false;
    this._manual = 0;
    this._done = 0;
    this.build();
  },

  get _lastInitData() {
    return { returnTo: this.returnTo };
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root(null, null, { footer: false });
    PixiScreenManager.setScreenContainer(this.pixiContainer);
    const cols = ThemeManager.getCurrentColors();
    const W = Layout.W, H = Layout.H;

    // Darker than a menu: the text is the picture here.
    this.pixiContainer.addChild(new PIXI.Graphics().rect(0, 0, W, H).fill({ color: 0x020409, alpha: 0.58 }));

    const roll = new PIXI.Container();
    this.pixiContainer.addChild(roll);
    this._roll = roll;
    this._logos = [];
    const bottom = this._buildRoll(roll, cols);
    this._length = bottom;
    this._y = H + 40;               // starts just below the screen
    this._endY = Math.round(H / 2 - this._lastY);   // the last line stops at the centre
    roll.y = this._y;

    // Fade bands so lines melt in and out at the edges.
    const bands = new PIXI.Graphics();
    const steps = 12, band = 120;
    for (let i = 0; i < steps; i++) {
      const a = 0.9 * (1 - i / steps);
      bands.rect(0, i * (band / steps), W, band / steps).fill({ color: 0x020409, alpha: a });
      bands.rect(0, H - (i + 1) * (band / steps), W, band / steps).fill({ color: 0x020409, alpha: a });
    }
    this.pixiContainer.addChild(bands);

    // Input: hold anywhere to speed up; the wheel scrolls.
    const hit = new PIXI.Container();
    hit.eventMode = 'static';
    hit.hitArea = new PIXI.Rectangle(0, 0, W, H);
    hit.on('pointerdown', () => { this._hold = true; });
    hit.on('pointerup', () => { this._hold = false; });
    hit.on('pointerupoutside', () => { this._hold = false; });
    hit.on('wheel', (e) => { this._manual -= e.deltaY; });
    this.pixiContainer.addChild(hit);

    const hint = PixiPremiumScene.text(
      (navigator.maxTouchPoints > 0 && !(window.electron && window.electron.isDesktop)) ? 'Hold to speed up' : 'Hold Space to speed up  ·  Esc to leave',
      { fontSize: 16, fill: PixiPremiumScene.alpha(cols.text, '88') });
    hint.anchor.set(1, 0.5);
    hint.x = W - 28;
    hint.y = 41;
    this.pixiContainer.addChild(hint);
    this._hint = hint;
    this._time = 0;

    PixiPremiumScene.button(this.pixiContainer, 24, 20, 130, 42, 'Back', () => this._leave(), { icon: 'back', fontSize: 16 });
  },

  // Lays out the whole roll from y = 0 downwards; returns its height.
  _buildRoll(roll, cols) {
    const W = Layout.W;
    const cx = W / 2;
    const s = Layout.uiScale || 1;
    const textW = Math.min(900, W - 80);
    let y = 0;
    const add = (obj, gapAfter = 0) => {
      obj.x = obj.anchor ? cx : obj.x;
      obj.y = y;
      roll.addChild(obj);
      y += obj.height + gapAfter;
      return obj;
    };
    const heading = (t) => {
      const h = PixiPremiumScene.text(t.toUpperCase(), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(16 * s), fill: cols.accent, letterSpacing: 4 });
      h.anchor.set(0.5, 0);
      add(h, 14);
      const g = new PIXI.Graphics()
        .rect(cx - 40, 0, 80, 2).fill({ color: PixiPremiumScene.color(cols.accent), alpha: 0.5 })
        .rect(cx - 3, -2, 6, 6).fill({ color: PixiPremiumScene.color(cols.accent) });
      g.y = y;
      roll.addChild(g);
      y += 24;
    };
    const name = (t, size = 30) => {
      const n = PixiPremiumScene.text(t, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(size * s), fontWeight: 'bold', fill: cols.text, stroke: { color: 0x000000, width: 3 } });
      n.anchor.set(0.5, 0);
      PixiPremiumScene.fit(n, textW, 0.5);
      add(n, 12);
    };
    const line = (t) => {
      const l = PixiPremiumScene.text(t, { fontSize: Math.round(16 * s), fill: PixiPremiumScene.alpha(cols.text, 'aa'), align: 'center', wordWrap: true, wordWrapWidth: textW });
      l.anchor.set(0.5, 0);
      add(l, 6);
    };

    // Logo.
    const logo = PixiTitleLogo.create(cols, Math.min(620, W - 120));
    const lc = logo.container;
    y += Math.round(lc.height / 2);
    lc.x = cx;
    lc.y = y;
    roll.addChild(lc);
    this._logos.push(logo);
    y += Math.round(lc.height / 2) + 170;

    for (const sec of this.SECTIONS) {
      heading(sec.heading);
      if (sec.cast) y = this._cast(roll, y, cols, s);
      if (sec.worlds) {
        for (const w of (typeof WORLDS !== 'undefined' ? WORLDS : [])) name(w.name, 22);
      }
      for (const n of sec.names || []) name(n);
      if (sec.lines) {
        y += 6;
        for (const l of sec.lines) line(l);
      }
      y += 120;
    }

    y += Math.round(Layout.H * 0.2);
    const thanks = PixiPremiumScene.text('THANKS FOR PLAYING', { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(40 * s), fontWeight: 'bold', fill: cols.accent, stroke: { color: 0x000000, width: 4 } });
    thanks.anchor.set(0.5, 0);
    PixiPremiumScene.fit(thanks, textW, 0.5);
    this._lastY = y + thanks.height / 2;
    add(thanks, 0);
    return y;
  },

  // Two columns of story characters: live portrait, name, title.
  _cast(roll, y, cols, s) {
    const cast = typeof STORY_STAGES !== 'undefined' ? STORY_STAGES : [];
    const W = Layout.W;
    const colW = Math.min(400, Math.floor((W - 120) / 2));
    const rowH = Math.round(96 * s);
    const face = Math.round(72 * s);
    cast.forEach((ch, i) => {
      const left = i % 2 === 0;
      const row = Math.floor(i / 2);
      const cx = W / 2 + (left ? -colW / 2 - 10 : colW / 2 + 10);
      const ry = y + row * rowH;
      const box = new PIXI.Container();
      box.x = cx - colW / 2;
      box.y = ry;
      roll.addChild(box);
      const frame = new PIXI.Graphics()
        .poly(PixiPremiumScene.pixelShape(0, 0, face + 8, face + 8, 3)).fill({ color: 0x07080d, alpha: 0.9 })
        .poly(PixiPremiumScene.pixelShape(1, 1, face + 6, face + 6, 3)).stroke({ color: PixiPremiumScene.color(cols.accent), alpha: 0.5, width: 2, alignment: 1 });
      box.addChild(frame);
      try {
        const sp = PixiPremiumAssets.characterSprite(ch.id);
        sp.width = face;
        sp.height = face;
        sp.x = 4;
        sp.y = 4;
        box.addChild(sp);
      } catch (_) { /* portrait missing: frame only */ }
      const n = PixiPremiumScene.text(ch.name, { fontSize: Math.round(21 * s), fontWeight: '900', fill: cols.text });
      const t = PixiPremiumScene.text(ch.title || '', { fontSize: Math.round(15 * s), fill: PixiPremiumScene.alpha(cols.text, '99') });
      const tx = face + 24;
      PixiPremiumScene.fit(n, colW - tx, 0.6);
      PixiPremiumScene.fit(t, colW - tx, 0.6);
      n.x = tx;
      t.x = tx;
      n.y = Math.round((face + 8 - n.height - t.height - 4) / 2);
      t.y = n.y + n.height + 4;
      box.addChild(n, t);
    });
    return y + Math.ceil(cast.length / 2) * rowH + 10;
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
    if (!this._roll || this._roll.destroyed) return;
    this._time += dt;
    for (const l of this._logos) l.update(dt);
    if (this._hint && this._time > 5) this._hint.alpha = Math.max(0, this._hint.alpha - dt * 0.8);

    const speed = this.SPEED * (this._hold ? this.FAST : 1);
    this._y -= speed * dt;
    if (this._manual) {
      const step = this._manual * Math.min(1, dt * 10);
      this._y += step;
      this._manual -= step;
      if (Math.abs(this._manual) < 0.5) this._manual = 0;
    }
    this._y = Math.min(Layout.H + 40, Math.max(this._endY, this._y));
    this._roll.y = Math.round(this._y);
    if (this._y <= this._endY) {
      this._done += dt;
      if (this._done > this.END_HOLD) this._leave();
    } else {
      this._done = 0;
    }
  },

  _leave() {
    if (this._leaving) return;
    this._leaving = true;
    switchScreen(this.returnTo);
  },

  destroy() {
    this._leaving = false;
    for (const l of this._logos || []) l.destroy();
    this._logos = [];
    this._roll = null;
    PixiPremiumScene.destroy(this);
  },

  handleKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Backspace') { this._leave(); return; }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this._hold = true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); this._manual += 160; }
    if (e.key === 'ArrowDown') { e.preventDefault(); this._manual -= 160; }
  },

  handleKeyUp(e) {
    if (e.key === ' ' || e.key === 'Enter') this._hold = false;
  },
};
