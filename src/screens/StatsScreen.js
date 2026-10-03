// Statistics: a row of headline tiles (matches, win rate, mini-games, story, training),
// then the match record (results bar, captures, rivals), the mini-game record and the
// trophy shelf (one trophy per story world, bronze to gold by the stars won there).
const StatsScreen = {
  isPixiScreen: true,
  pixiContainer: null,

  init() {
    this.build();
  },

  // The save slot furthest into the story.
  _bestSave() {
    const saves = store.get('storySaves') || [];
    return saves.reduce((best, sv) => (sv && (sv.maxUnlockedLevel || 1) > ((best && best.maxUnlockedLevel) || 0) ? sv : best), null);
  },

  _data() {
    const stats = store.get('stats') || {};
    const save = this._bestSave();
    const stages = typeof STORY_STAGES !== 'undefined' ? STORY_STAGES.length : 15;
    const stage = Math.min(stages, (save && save.maxUnlockedLevel) || 1);
    const training = store.get('trainingProgress') || {};
    const levels = typeof TRAINING_LEVELS !== 'undefined' ? TRAINING_LEVELS.length : 30;
    const games = stats.gamesPlayed || 0;
    const mini = stats.miniGamesPlayed || 0;
    return {
      stats, save, stages, stage, games, mini, levels,
      wins: stats.wins || 0, losses: stats.losses || 0, draws: stats.draws || 0,
      winRate: games ? Math.round((stats.wins || 0) / games * 100) : 0,
      miniRate: mini ? Math.round((stats.miniGamesWon || 0) / mini * 100) : 0,
      fragments: save && typeof StoryProgress !== 'undefined' ? StoryProgress.fragments(save) : 0,
      stars: training.totalStars || 0,
      solved: Object.values(training.levels || {}).filter(l => l.solved).length,
    };
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Statistics', null, { footerHint: 'Stats update after every game' });
    PixiScreenManager.setScreenContainer(this.pixiContainer);
    const d = this._data();
    const cols = ThemeManager.getCurrentColors();
    const portrait = Layout.isPortrait;
    const s = Layout.uiScale || 1;

    const tiles = [
      { title: `${d.games}`, sub: 'Matches played', detail: `${d.wins} W  ·  ${d.losses} L  ·  ${d.draws} D`,
        art: PixiPremiumScene.pieceArt([{ type: 'knight', color: 'white', dx: -0.2, scale: 0.8, flip: true }, { type: 'knight', color: 'black', dx: 0.2, scale: 0.8 }]) },
      { title: `${d.winRate}%`, sub: 'Win rate', detail: `${d.stats.captures || 0} captures`,
        art: PixiPremiumScene.pieceArt([{ type: 'king', color: 'white', scale: 0.9 }]) },
      { title: `${d.miniRate}%`, sub: 'Mini-games won', detail: `${d.stats.miniGamesWon || 0} of ${d.mini}`,
        art: (size) => TrainingHubScreen._miniGameArt(size * 0.8) },
      { title: `${d.stage}/${d.stages}`, sub: 'Story stage', detail: `${d.fragments} of ${StoryProgress.FRAGMENT_COUNT} fragments`,
        art: PixiPremiumScene.pieceArt([{ type: 'pawn', color: 'white', dx: -0.22, dy: 0.08, scale: 0.62 }, { type: 'king', color: 'black', dx: 0.18, scale: 0.86 }]) },
      { title: `${d.stars}/${d.levels * 3}`, sub: 'Puzzle stars', detail: `${d.solved} of ${d.levels} solved`,
        art: (size) => TrainingHubScreen._starArt(size * 0.9, cols) },
    ];

    const side = portrait ? 36 : 56;
    const contentW = Layout.W - side * 2;
    const top = 152;
    const gap = portrait ? 14 : 18;
    const perRow = portrait ? 3 : 5;
    const rows = Math.ceil(tiles.length / perRow);
    const tileW = Math.floor((contentW - gap * (perRow - 1)) / perRow);
    const tileH = Math.round((portrait ? 210 : 226) * s);
    tiles.forEach((t, i) => {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, tiles.length - row * perRow);
      const rowX = side + Math.round((contentW - (inRow * tileW + (inRow - 1) * gap)) / 2);
      // Percentages read better in the body font (Silkscreen's % looks like a Z).
      const pct = t.title.endsWith('%');
      PixiPremiumScene.tile(this.pixiContainer,
        rowX + (i % perRow) * (tileW + gap), top + row * (tileH + gap), tileW, tileH, {
          ...t, titleSize: pct ? 30 : 24, titleFont: pct ? PixiTextStyles.FONT_BODY : null,
          artShare: 0.46, interactive: false, primary: i === 0,
        });
    });

    const panelsY = top + rows * tileH + (rows - 1) * gap + 20;
    const bottom = PixiPremiumScene.contentBottom;
    if (portrait) {
      const h = Math.floor((bottom - panelsY - gap * 2) / 3);
      this._matchPanel(side, panelsY, contentW, h, d, cols, s);
      this._miniPanel(side, panelsY + h + gap, contentW, h, d, cols, s);
      this._trophyPanel(side, panelsY + (h + gap) * 2, contentW, h, d, cols, s);
    } else {
      const w = Math.floor((contentW - gap * 2) / 3);
      this._matchPanel(side, panelsY, w, bottom - panelsY, d, cols, s);
      this._miniPanel(side + w + gap, panelsY, w, bottom - panelsY, d, cols, s);
      this._trophyPanel(side + (w + gap) * 2, panelsY, w, bottom - panelsY, d, cols, s);
    }

    PixiPremiumScene.button(this.pixiContainer, 36, PixiPremiumScene.bottomButtonY(), 160, 44, 'Back', () => switchScreen('home'), { icon: 'back' });
  },

  _panelTitle(x, y, text, cols, s) {
    const t = PixiPremiumScene.text(text.toUpperCase(), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(18 * s), fontWeight: 'bold', fill: cols.text });
    t.x = x;
    t.y = y;
    this.pixiContainer.addChild(t);
    return t.y + t.height;
  },

  // Wins / losses / draws as one bar, then captures and story rivals.
  _matchPanel(x, y, w, h, d, cols, s) {
    const root = this.pixiContainer;
    PixiPremiumScene.panel(root, x, y, w, h, { accentAlpha: 0.45, alpha: 0.76 });
    const pad = 26;
    let cy = this._panelTitle(x + pad, y + 28, 'Match Record', cols, s) + 16;
    const barW = w - pad * 2, barH = Math.round(22 * s);
    const parts = [[d.wins, '#7dea99', 'Wins'], [d.draws, '#ffe985', 'Draws'], [d.losses, '#ff6578', 'Losses']];
    const g = new PIXI.Graphics();
    g.rect(x + pad - 3, cy - 3, barW + 6, barH + 6).fill({ color: 0x05070d, alpha: 0.75 });
    let bx = x + pad;
    if (!d.games) g.rect(bx, cy, barW, barH).fill({ color: 0xffffff, alpha: 0.08 });
    for (const [n, color] of parts) {
      if (!n) continue;
      const pw = Math.round(barW * n / d.games);
      g.rect(bx, cy, pw, barH).fill({ color: PixiPremiumScene.color(color), alpha: 0.9 });
      g.rect(bx, cy, pw, 3).fill({ color: 0xffffff, alpha: 0.25 });
      bx += pw;
    }
    root.addChild(g);
    cy += barH + 12;
    // Legend.
    let lx = x + pad;
    for (const [n, color, label] of parts) {
      root.addChild(new PIXI.Graphics().rect(lx, cy + 5, 10, 10).fill({ color: PixiPremiumScene.color(color) }));
      const t = PixiPremiumScene.text(`${label} ${n}`, { fontSize: Math.round(15 * s), fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, 'bb') });
      t.x = lx + 16;
      t.y = cy;
      root.addChild(t);
      lx += t.width + 40;
    }
    cy += 34;

    const rivals = this._rivals(d.save);
    const lines = [
      ['Captures made', `${d.stats.captures || 0}`],
      ['Toughest rival', rivals.toughest || '-'],
      ['Most beaten', rivals.beaten || '-'],
    ];
    this._statRows(x + pad, cy, barW, y + h - pad - cy, lines, cols, s);
  },

  // Story opponents with the most losses and the most wins against them.
  _rivals(save) {
    const record = (save && save.record) || {};
    const byId = {};
    if (typeof STORY_STAGES !== 'undefined') STORY_STAGES.forEach(ch => { byId[ch.id] = ch.name; });
    let toughest = null, beaten = null;
    for (const [id, r] of Object.entries(record)) {
      if (!byId[id]) continue;
      if ((r.losses || 0) > 0 && (!toughest || r.losses > toughest.r.losses)) toughest = { id, r };
      if ((r.wins || 0) > 0 && (!beaten || r.wins > beaten.r.wins)) beaten = { id, r };
    }
    const fmt = (e) => (e ? `${byId[e.id]}  (${e.r.wins || 0}-${e.r.losses || 0})` : null);
    return { toughest: fmt(toughest), beaten: fmt(beaten) };
  },

  _statRows(x, y, w, h, lines, cols, s) {
    const root = this.pixiContainer;
    const rowH = Math.min(Math.round(44 * s), Math.floor(h / lines.length));
    lines.forEach(([label, value], i) => {
      const ry = y + i * rowH;
      if (i > 0) root.addChild(new PIXI.Graphics().rect(x, ry, w, 2).fill({ color: PixiPremiumScene.color(cols.text), alpha: 0.08 }));
      const l = PixiPremiumScene.text(label, { fontSize: Math.round(16 * s), fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, '99') });
      l.anchor.set(0, 0.5);
      l.x = x;
      l.y = ry + rowH / 2;
      const v = PixiPremiumScene.text(value, { fontSize: Math.round(18 * s), fontWeight: '900', fill: cols.accent });
      v.anchor.set(1, 0.5);
      v.x = x + w;
      v.y = ry + rowH / 2;
      PixiPremiumScene.fit(v, w - l.width - 20, 0.6);
      root.addChild(l, v);
    });
  },

  // The most played mini-games with their win rate.
  _miniPanel(x, y, w, h, d, cols, s) {
    const root = this.pixiContainer;
    PixiPremiumScene.panel(root, x, y, w, h, { accentAlpha: 0.45, alpha: 0.76 });
    const pad = 26;
    const cy = this._panelTitle(x + pad, y + 28, 'Mini-Game Record', cols, s) + 14;
    const names = (typeof MiniGamePractice !== 'undefined' && MiniGamePractice.NAMES_BY_CLASS) || {};
    const list = Object.entries(d.stats.miniGameByType || {})
      .filter(([, r]) => r && r.played)
      .sort((a, b) => b[1].played - a[1].played || b[1].won - a[1].won);
    const innerW = w - pad * 2;
    const avail = y + h - pad - cy;
    const rowH = Math.round(34 * s);
    const count = Math.min(list.length, Math.max(1, Math.floor(avail / rowH)));
    if (!list.length) {
      const t = PixiPremiumScene.text('Play a capture challenge to start your record.', { fontSize: Math.round(16 * s), fill: PixiPremiumScene.alpha(cols.text, '99'), wordWrap: true, wordWrapWidth: innerW });
      t.x = x + pad;
      t.y = cy + 6;
      root.addChild(t);
      return;
    }
    const nameW = Math.round(innerW * 0.38);
    const scoreW = Math.round(62 * s);
    const barW = innerW - nameW - scoreW - 20;
    list.slice(0, count).forEach(([cls, r], i) => {
      const ry = cy + i * rowH;
      const mid = ry + rowH / 2;
      const n = PixiPremiumScene.text(names[cls] || cls, { fontSize: Math.round(16 * s), fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, 'dd') });
      n.anchor.set(0, 0.5);
      n.x = x + pad;
      n.y = mid;
      PixiPremiumScene.fit(n, nameW - 8, 0.6);
      const rate = r.won / r.played;
      const color = rate >= 0.66 ? '#7dea99' : rate >= 0.34 ? '#ffe985' : '#ff6578';
      const bx = x + pad + nameW + 10, bh = Math.round(12 * s);
      const g = new PIXI.Graphics()
        .rect(bx - 2, mid - bh / 2 - 2, barW + 4, bh + 4).fill({ color: 0x05070d, alpha: 0.7 })
        .rect(bx, mid - bh / 2, Math.max(3, Math.round(barW * rate)), bh).fill({ color: PixiPremiumScene.color(color), alpha: 0.9 });
      const v = PixiPremiumScene.text(`${r.won}/${r.played}`, { fontSize: Math.round(16 * s), fontWeight: '900', fill: cols.accent });
      v.anchor.set(1, 0.5);
      v.x = x + w - pad;
      v.y = mid;
      root.addChild(n, g, v);
    });
  },

  // The trophy shelf: one trophy per story world, its metal set by the stars won there
  // (bronze for a third of them, silver for two thirds, gold for all).
  _trophyPanel(x, y, w, h, d, cols, s) {
    const root = this.pixiContainer;
    PixiPremiumScene.panel(root, x, y, w, h, { accentAlpha: 0.45, alpha: 0.76 });
    const pad = 22;
    const titleBottom = this._panelTitle(x + pad, y + 28, 'Trophies', cols, s);
    if (typeof WORLDS === 'undefined' || typeof StoryStars === 'undefined') return;
    const save = d.save || {};
    const total = PixiPremiumScene.text(`${StoryStars.total(save)} / ${StoryStars.max()}`, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(16 * s), fill: '#ffe08a' });
    total.anchor.set(1, 0);
    total.x = x + w - pad;
    total.y = y + 30;
    const star = PixiStar.create(8, true);
    star.x = total.x - total.width - 14;
    star.y = total.y + total.height / 2;
    root.addChild(total, star);

    const perRow = Math.ceil(WORLDS.length / 2);
    const innerW = w - pad * 2;
    const cell = Math.floor(innerW / perRow);
    const top = titleBottom + 14;
    const rowH = Math.floor((y + h - pad - top) / 2);
    const cup = Math.min(Math.round(cell * 0.8), Math.round(rowH * 0.6));
    WORLDS.forEach((world, i) => {
      const row = i < perRow ? 0 : 1;
      const inRow = row === 0 ? perRow : WORLDS.length - perRow;
      const col = row === 0 ? i : i - perRow;
      const cx = x + pad + (innerW - inRow * cell) / 2 + col * cell + cell / 2;
      const shelfY = top + row * rowH + Math.round(rowH * 0.7);
      if (col === 0) {
        root.addChild(new PIXI.Graphics()
          .rect(x + pad - 4, shelfY, innerW + 8, 6).fill(0x6a4428)
          .rect(x + pad - 4, shelfY, innerW + 8, 2).fill(0x9a6a3a)
          .rect(x + pad - 4, shelfY + 6, innerW + 8, 3).fill({ color: 0x000000, alpha: 0.35 }));
      }
      const chars = world.stages.map(st => STORY_STAGES[st - 1]);
      const got = StoryStars.total(save, chars), max = StoryStars.max(chars);
      const metal = got === 0 ? 'none' : got >= max ? 'gold' : got >= max * 2 / 3 ? 'silver' : 'bronze';
      const piece = world.id === 'trainingcamp' ? 'rook' : (STORY_PIECES[chars[chars.length - 1].id] || 'king');
      const trophy = this._trophy(cup, metal, world.art, piece);
      trophy.x = cx;
      trophy.y = shelfY;
      root.addChild(trophy);
      const label = chars.length === 1 ? PixiStar.row(3, StoryStars.best(save, chars[0].id), Math.max(3, Math.round(cup * 0.08)), 1)
        : PixiPremiumScene.text(`${got}/${max}`, { fontSize: Math.round(11 * s), fontWeight: '800', fill: '#ffe08a' });
      label.x = cx - label.width / 2;
      label.y = shelfY + 12;
      root.addChild(label);
    });
  },

  // A pixel trophy cup standing on (0, 0), topped with the world's guardian piece.
  _trophy(size, metal, art, pieceType) {
    const M = {
      gold: [0xb07a1c, 0xffd24a, 0xfff2a8],
      silver: [0x7a8090, 0xd4dae6, 0xffffff],
      bronze: [0x7a4420, 0xc8844a, 0xf0b87a],
      none: [0x16121c, 0x2a2632, 0x3a3444],
    }[metal];
    const c = new PIXI.Container();
    const u = Math.max(2, Math.round(size / 16));   // one trophy pixel
    const g = new PIXI.Graphics();
    const px = (gx, gy, gw, gh, color) => g.rect(gx * u, gy * u, gw * u, gh * u).fill(color);
    // Plinth, stem, cup and handles, 12 x 12 trophy pixels above the shelf.
    px(-4, -2, 8, 2, 0x3a2418); px(-4, -2, 8, 1, 0x5a3a24);
    px(-2, -3, 4, 1, M[0]); px(-1, -5, 2, 2, M[1]);
    px(-4, -10, 8, 5, M[1]); px(-3, -6, 6, 1, M[0]);
    px(-4, -10, 2, 4, M[2]); px(3, -10, 1, 5, M[0]);
    px(-6, -10, 2, 1, M[1]); px(-6, -9, 1, 2, M[1]); px(-5, -7, 1, 1, M[1]);
    px(4, -10, 2, 1, M[0]); px(5, -9, 1, 2, M[0]); px(4, -7, 1, 1, M[0]);
    px(-4, -11, 8, 1, M[2]);
    c.addChild(g);
    const p = PixiPieceRenderer.createSprite(PixiPieceRenderer.withArt(art), 'white', pieceType);
    p.anchor.set(0.5, 1);
    p.width = p.height = Math.round(size * 0.62);
    p.y = -11 * u + Math.round(size * 0.06);
    p.tint = metal === 'none' ? 0x000000 : M[1];
    if (metal === 'none') p.alpha = 0.6;
    c.addChild(p);
    return c;
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  destroy() {
    PixiPremiumScene.destroy(this);
  },

  handleKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Backspace') switchScreen('home');
  },
};
