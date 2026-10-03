// Shared parts of the Classic and Custom setup screens: the bot's strength (every
// AIController level, 0 to 12) and which side you play.
const BotSetup = {
  DEFAULT_LEVEL: 4,
  SIDES: [
    { id: 'white', label: 'White' },
    { id: 'random', label: 'Random' },
    { id: 'black', label: 'Black' },
  ],
  // The bot's piece grows with its strength.
  PIECES: ['pawn', 'pawn', 'knight', 'knight', 'bishop', 'bishop', 'rook', 'rook', 'queen', 'queen', 'king', 'king', 'king'],

  // `prefix` is 'classic' or 'custom'. Older saves kept an Elo (200-2000) instead of a level.
  loadLevel(prefix) {
    const level = store.get(prefix + 'Level');
    if (typeof level === 'number' && AIController.LEVEL_CONFIG[level]) return level;
    const elo = store.get(prefix + 'Elo');
    if (typeof elo === 'number') return AIController.levelFromElo(elo);
    return this.DEFAULT_LEVEL;
  },

  saveLevel(prefix, level) {
    store.set(prefix + 'Level', level);
    store.set(prefix + 'Difficulty', level);   // what GameScreen reads
  },

  resolveSide(side) {
    if (side === 'random') return Math.random() < 0.5 ? 'white' : 'black';
    return side === 'black' ? 'black' : 'white';
  },

  // Strength picker: the bot's piece on the left, then its name, Elo and a line about
  // it, and a slider with - / + buttons. Returns { height, setLevel(level), step(delta) }.
  strength(parent, x, y, w, level, onChange) {
    const cols = ThemeManager.getCurrentColors();
    const s = PixiPremiumScene;
    const L = { ART: 128, GAP: 26, NAME_Y: 0, ELO_Y: 40, BLURB_Y: 70, BLURB_H: 30, STEP_W: 44, STEP_GAP: 14 };
    const stepH = s.buttonHeight(36);   // taller on phones
    L.SLIDER_Y = Math.max(120, L.BLURB_Y + L.BLURB_H + Math.round(stepH / 2));
    const height = Math.max(L.ART, L.SLIDER_Y + Math.round(stepH / 2) + 4);

    // The bot's piece in a spotlight.
    const art = new PIXI.Container();
    art.x = x;
    art.y = y + Math.round((height - L.ART) / 2) - 6;
    parent.addChild(art);
    const glow = new PIXI.Graphics()
      .circle(L.ART / 2, L.ART / 2, L.ART * 0.46).fill({ color: s.color(cols.accent), alpha: 0.12 })
      .ellipse(L.ART / 2, L.ART * 0.88, L.ART * 0.32, L.ART * 0.06).fill({ color: 0x000000, alpha: 0.3 });
    art.addChild(glow);
    let sprite = null;
    const drawPiece = (lvl) => {
      if (sprite) sprite.destroy();
      sprite = PixiPieceRenderer.createSprite(store.get('theme') || 'chess20', 'black', this.PIECES[lvl]);
      sprite.width = sprite.height = Math.round(L.ART * 0.96);
      sprite.x = L.ART / 2;
      sprite.y = L.ART / 2;
      art.addChild(sprite);
    };

    const tx = x + L.ART + L.GAP;
    const tw = w - L.ART - L.GAP;
    const text = (style, ty) => {
      const t = s.text('', style);
      t.x = tx;
      t.y = y + ty;
      parent.addChild(t);
      return t;
    };
    const name = text({ fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 30, fontWeight: 'bold', fill: cols.accent }, L.NAME_Y);
    const elo = text({ fontSize: 19, fontWeight: '800', fill: cols.text }, L.ELO_Y);
    const blurb = text({ fontSize: 18, fill: s.alpha(cols.text, 'aa') }, L.BLURB_Y);

    const sliderW = tw - (L.STEP_W + L.STEP_GAP) * 2;
    const slider = new PixiSlider({
      width: sliderW,
      height: 18,
      min: 0,
      max: AIController.MAX_LEVEL,
      step: 1,
      value: level,
      cols,
      showValue: false,
      gradientStops: [
        { pos: 0, color: '#7dea99' },
        { pos: 0.45, color: cols.accent },
        { pos: 1, color: '#ff6578' },
      ],
      showTicks: true,
      tickInterval: 1,
    });
    slider.x = tx + L.STEP_W + L.STEP_GAP;
    slider.y = y + L.SLIDER_Y - 9;
    parent.addChild(slider);

    const show = (lvl) => {
      const info = AIController.levelInfo(lvl);
      name.text = info.name.toUpperCase();
      elo.text = `About ${info.elo} Elo  ·  Level ${lvl + 1} of ${AIController.MAX_LEVEL + 1}`;
      blurb.text = info.blurb;
      [name, elo, blurb].forEach(t => s.fit(t, tw, 0.6));
      drawPiece(lvl);
    };
    show(level);
    slider.onChange((v) => { show(v); onChange(v); });

    const step = (d) => slider.setValue(slider.getValue() + d);
    s.button(parent, tx, y + L.SLIDER_Y - stepH / 2, L.STEP_W, 36, '-', () => step(-1), { fontSize: 22 });
    s.button(parent, tx + tw - L.STEP_W, y + L.SLIDER_Y - stepH / 2, L.STEP_W, 36, '+', () => step(1), { fontSize: 22 });

    return { height, setLevel: v => slider.setValue(v), step };
  },

  // "Play as" with White / Random / Black. `stacked` puts the label above the buttons.
  sides(parent, x, y, w, side, onPick, { stacked = false } = {}) {
    const cols = ThemeManager.getCurrentColors();
    const s = PixiPremiumScene;
    const label = s.text('Play as', { fontSize: 20, fontWeight: '800', fill: s.alpha(cols.text, 'bb') });
    const btnH = 46;
    const realH = s.buttonHeight(btnH);
    const gap = 12;
    let bx = x, bw = w, by = y;
    if (stacked) {
      label.x = x;
      label.y = y;
      by = y + label.height + 12;
    } else {
      label.anchor.set(0, 0.5);
      label.x = x;
      label.y = y + realH / 2;
      bx = x + label.width + 24;
      bw = w - label.width - 24;
    }
    parent.addChild(label);
    const each = Math.floor((bw - gap * 2) / 3);
    this.SIDES.forEach((opt, i) => {
      const on = side === opt.id;
      s.button(parent, bx + i * (each + gap), by, each, btnH, opt.label, () => onPick(opt.id), {
        primary: on,
        fill: on ? cols.accent : undefined,
        alpha: on ? 0.32 : undefined,
        fontSize: 18,
      });
    });
    return { height: by - y + realH };
  },
};
