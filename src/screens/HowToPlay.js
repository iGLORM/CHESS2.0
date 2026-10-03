// How to Play: topic tiles on the left (same layout as Settings), the lesson on the
// right: a headline, the rules as pixel bullets, and a key table for Controls.
const HowToPlay = {
  isPixiScreen: true,
  pixiContainer: null,
  _topic: 'basics',

  TOPICS: [
    {
      id: 'basics', title: 'Basics', sub: 'Moving and winning',
      art: [{ type: 'king', color: 'white', scale: 0.9 }],
      lead: 'Checkmate the enemy king to win.',
      lines: [
        'Click a piece, then one of its highlighted squares to move it.',
        'Capture by moving onto a square held by an enemy piece.',
        'Check means the king is attacked and must escape at once. No escape is checkmate.',
        'Stalemate, repeating the same position three times and the 50-move rule are draws.',
      ],
    },
    {
      id: 'captures', title: 'Captures', sub: 'Fight for every piece',
      art: [{ type: 'knight', color: 'white', dx: -0.2, scale: 0.8, flip: true }, { type: 'knight', color: 'black', dx: 0.2, scale: 0.8 }],
      lead: 'A capture can be fought over in a mini-game.',
      lines: [
        'Each side starts with 2 Defenses and earns 1 more for every 2 captures.',
        'When one of your pieces is taken, spend a Defense to play a short mini-game.',
        'Win it and the capture is cancelled: your piece stays and the attacker loses the turn.',
        'A capture that gets a king out of check can never be blocked.',
      ],
      action: { label: 'Practise Mini-Games', icon: 'play', go: () => switchScreen('miniGamePractice', { from: 'howToPlay' }) },
    },
    {
      id: 'story', title: 'Story', sub: '15 stages, 11 worlds',
      art: [{ type: 'pawn', color: 'white', dx: -0.22, dy: 0.08, scale: 0.62 }, { type: 'king', color: 'black', dx: 0.18, scale: 0.86 }],
      lead: 'Wake in Pawn Hollow and restore the broken Great Board.',
      lines: [
        'Pick a save slot. The story has 15 stages across 11 worlds.',
        'Beat Pawnie and the five trainers of the Training Camp, then face nine guardians.',
        'Each guardian world has seven missions; clear them all to open the guardian\'s fight.',
        'Every guardian plays with a twist: walls, fog, a clock, rewinds and more.',
      ],
      action: { label: 'Play Story', icon: 'play', go: () => { store.set('mode', 'story'); switchScreen('characterSelect'); } },
    },
    {
      id: 'training', title: 'Training', sub: 'Puzzles and practice',
      art: [{ type: 'pawn', color: 'white', dx: -0.22, dy: 0.08, scale: 0.62 }, { type: 'rook', color: 'black', dx: 0.2, scale: 0.82 }],
      lead: 'Sharpen your tactics at your own pace.',
      lines: [
        '30 puzzles in six sets of five, from simple captures to endgames.',
        'Solve quickly without hints for three stars; showing the answer gives one.',
        'Mini-Games lets you play any capture challenge outside a match.',
        'The Board Editor sets up any position to play out against Stockfish.',
      ],
      action: { label: 'Open Training', icon: 'play', go: () => switchScreen('trainingHub') },
    },
    {
      id: 'controls', title: 'Controls', sub: 'Keys and mouse',
      art: [{ type: 'queen', color: 'white', scale: 0.9 }],
      lead: 'Play with the mouse or touch; these keys help.',
      keys: [
        ['Click', 'Select a piece, then its square'],
        ['Esc', 'Pause the game, or go back in menus'],
        ['U', 'Undo your last move'],
        ['F', 'Flip the board'],
        ['Left / Right', 'Step back and forward through the game'],
        ['F11', 'Fullscreen (also Alt + Enter)'],
      ],
    },
  ],

  init(data) {
    if (data && data.topic) this._topic = data.topic;
    this.build();
  },

  get _lastInitData() {
    return { topic: this._topic };
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('How To Play', null, {
      footerHint: 'Up / Down choose a topic',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const L = PixiPremiumScene.tabLayout();
    const tabs = this.TOPICS.map(t => ({ ...t, art: PixiPremiumScene.pieceArt(t.art) }));
    PixiPremiumScene.tabStrip(this.pixiContainer, L, tabs, this._topic, (id) => this._select(id));
    this._lesson(L.panel, this.TOPICS.find(t => t.id === this._topic));

    const btnY = PixiPremiumScene.bottomButtonY();
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen('home'), { icon: 'back' });
  },

  _select(id) {
    if (id === this._topic) return;
    this._topic = id;
    this.build();
  },

  _lesson(P, topic) {
    const cols = ThemeManager.getCurrentColors();
    const s = Layout.uiScale || 1;
    const root = this.pixiContainer;
    PixiPremiumScene.panel(root, P.x, P.y, P.w, P.h, { accentAlpha: 0.5, alpha: 0.76 });
    const pad = 34;
    const innerW = P.w - pad * 2;

    const title = PixiPremiumScene.text(topic.title.toUpperCase(), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(24 * s), fontWeight: 'bold', fill: cols.text });
    title.x = P.x + pad;
    title.y = P.y + 30;
    root.addChild(title);
    const sub = PixiPremiumScene.text(topic.sub, { fontSize: Math.round(16 * s), fill: PixiPremiumScene.alpha(cols.text, '99') });
    sub.anchor.set(1, 0);
    sub.x = P.x + P.w - pad;
    sub.y = title.y + Math.round((title.height - sub.height) / 2);
    root.addChild(sub);
    let y = title.y + title.height + 18;
    root.addChild(new PIXI.Graphics().rect(P.x + pad, y - 8, innerW, 2).fill({ color: PixiPremiumScene.color(cols.text), alpha: 0.12 }));

    // Headline in a highlighted strip.
    const lead = PixiPremiumScene.text(topic.lead, {
      fontSize: Math.round(23 * s), fontWeight: '800', fill: cols.accent,
      wordWrap: true, wordWrapWidth: innerW - 40, lineHeight: Math.round(30 * s),
    });
    const leadH = lead.height + 28;
    root.addChild(new PIXI.Graphics()
      .poly(PixiPremiumScene.pixelShape(P.x + pad, y + 6, innerW, leadH, 3)).fill({ color: PixiPremiumScene.color(cols.accent), alpha: 0.1 })
      .rect(P.x + pad, y + 16, 4, leadH - 20).fill({ color: PixiPremiumScene.color(cols.accent) }));
    lead.x = P.x + pad + 22;
    lead.y = y + 6 + 14;
    root.addChild(lead);
    y += leadH + 28;

    const bottom = P.y + P.h - pad - (topic.action ? PixiPremiumScene.buttonHeight(46) + 14 : 0);
    if (topic.keys) this._keyTable(root, P.x + pad, y, innerW, bottom - y, topic.keys, cols, s);
    else this._bullets(root, P.x + pad, y, innerW, bottom - y, topic.lines, cols, s);

    if (topic.action) {
      const bw = Math.round(260 * s);
      PixiPremiumScene.button(root, P.x + P.w - pad - bw, P.y + P.h - pad - PixiPremiumScene.buttonHeight(46), bw, 46, topic.action.label, topic.action.go, { primary: true, icon: topic.action.icon });
    }
  },

  // Bullet list at the largest text size that fits the space.
  _bullets(root, x, y, w, h, lines, cols, s) {
    let size = Math.round(20 * s);
    let box;
    for (; size >= 13; size--) {
      if (box) box.destroy({ children: true });
      box = new PIXI.Container();
      const dot = Math.max(6, Math.round(size * 0.42));
      let by = 0;
      lines.forEach((line, i) => {
        const t = PixiPremiumScene.text(line, {
          fontSize: size, fontWeight: '600', fill: PixiPremiumScene.alpha(cols.text, 'dd'),
          wordWrap: true, wordWrapWidth: w - dot - 20, lineHeight: Math.round(size * 1.35),
        });
        t.x = dot + 18;
        t.y = by;
        const d = new PIXI.Graphics()
          .rect(0, 0, dot, dot).fill({ color: PixiPremiumScene.color(cols.accent) })
          .rect(0, 0, Math.ceil(dot / 2), Math.ceil(dot / 2)).fill({ color: 0xffffff, alpha: 0.35 });
        d.x = 2;
        d.y = Math.round(by + size * 0.68 - dot / 2);
        box.addChild(d, t);
        by += t.height + (i < lines.length - 1 ? Math.round(size * 0.9) : 0);
      });
      if (by <= h) break;
    }
    box.x = x;
    box.y = y;
    root.addChild(box);
  },

  // Key caps on the left, what they do on the right.
  _keyTable(root, x, y, w, h, keys, cols, s) {
    const rowH = Math.min(Math.round(50 * s), Math.floor(h / keys.length));
    const capW = Math.round(170 * s);
    keys.forEach(([key, what], i) => {
      const ry = y + i * rowH;
      const capH = rowH - 12;
      const g = new PIXI.Graphics()
        .poly(PixiPremiumScene.pixelShape(x, ry + 4, capW, capH, 2)).fill({ color: 0x000000, alpha: 0.45 })
        .poly(PixiPremiumScene.pixelShape(x, ry, capW, capH, 2)).fill({ color: PixiPremiumScene.color(cols.buttonBg || cols.panel), alpha: 0.95 })
        .poly(PixiPremiumScene.pixelShape(x + 1, ry + 1, capW - 2, capH - 2, 2)).stroke({ color: PixiPremiumScene.color(cols.accent), alpha: 0.6, width: 2, alignment: 1 })
        .rect(x + 8, ry + 4, capW - 16, 2).fill({ color: 0xffffff, alpha: 0.12 });
      root.addChild(g);
      const k = PixiPremiumScene.text(key.toUpperCase(), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(14 * s), fill: cols.text });
      k.anchor.set(0.5);
      k.x = x + capW / 2;
      k.y = ry + capH / 2;
      PixiPremiumScene.fit(k, capW - 16, 0.6);
      root.addChild(k);
      const t = PixiPremiumScene.text(what, { fontSize: Math.round(19 * s), fontWeight: '600', fill: PixiPremiumScene.alpha(cols.text, 'dd') });
      t.anchor.set(0, 0.5);
      t.x = x + capW + 24;
      t.y = ry + capH / 2;
      PixiPremiumScene.fit(t, w - capW - 24, 0.6);
      root.addChild(t);
    });
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  destroy() {
    PixiPremiumScene.destroy(this);
  },

  handleKeyDown(e) {
    const ids = this.TOPICS.map(t => t.id);
    const i = ids.indexOf(this._topic);
    const prev = Layout.isPortrait ? 'ArrowLeft' : 'ArrowUp';
    const next = Layout.isPortrait ? 'ArrowRight' : 'ArrowDown';
    if (e.key === prev || e.key === next || e.key === 'Tab') {
      e.preventDefault();
      const dir = e.key === prev || (e.key === 'Tab' && e.shiftKey) ? -1 : 1;
      this._select(ids[(i + dir + ids.length) % ids.length]);
    } else if (e.key === 'Enter') {
      const topic = this.TOPICS[i];
      if (topic.action) topic.action.go();
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      switchScreen('home');
    }
  },
};
