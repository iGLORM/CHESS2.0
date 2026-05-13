const StatsScreen = {
  isPixiScreen: true,
  pixiContainer: null,

  init() {
    this.build();
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Statistics', 'Match results, captures, mini-games, and story progress', {
      footerHint: 'Progress is read from your existing save data',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const s = Layout.uiScale || (Layout.isPortrait ? 0.82 : 1);
    const stats = store.get('stats') || {};
    const save = store.getActiveSave && store.getActiveSave();
    const games = stats.gamesPlayed || 0;
    const miniGames = stats.miniGamesPlayed || 0;
    const storyLevel = (save && save.storyLevel) || 1;

    const cards = [
      { label: 'Games Played', value: games, icon: 'progress', accent: '#8dd9ff' },
      { label: 'Wins', value: stats.wins || 0, icon: 'spark', accent: '#7dea99', ratio: games ? (stats.wins || 0) / games : 0 },
      { label: 'Losses', value: stats.losses || 0, icon: 'lock', accent: '#ff6578', ratio: games ? (stats.losses || 0) / games : 0 },
      { label: 'Draws', value: stats.draws || 0, icon: 'save', accent: '#ffe985', ratio: games ? (stats.draws || 0) / games : 0 },
      { label: 'Captures', value: stats.captures || 0, icon: 'play', accent: '#8fe8ce' },
      { label: 'Mini-Games Played', value: miniGames, icon: 'settings', accent: '#c99bff' },
      { label: 'Mini-Games Won', value: stats.miniGamesWon || 0, icon: 'spark', accent: '#7dea99', ratio: miniGames ? (stats.miniGamesWon || 0) / miniGames : 0 },
      { label: 'Story Level Reached', value: `${storyLevel} / 10`, icon: 'progress', accent: '#8dd9ff', ratio: Math.min(1, storyLevel / 10) },
    ];

    const cols = ThemeManager.getCurrentColors();

    if (Layout.isPortrait) {
      const panelW = Math.min(720, Layout.W - 80);
      const panelX = (Layout.W - panelW) / 2;
      const pad = 20;
      const summaryW = panelW - pad * 2;
      const summaryH = Math.round(280 * s);
      const summaryX = panelX + pad;
      const summaryY = 172;

      const gridGapX = Math.round(16 * s);
      const gridGapY = Math.round(14 * s);
      const gridCardW = Math.floor((panelW - pad * 2 - gridGapX) / 2);
      const gridCardH = Math.round(76 * s);
      const gridStartY = summaryY + summaryH + Math.round(24 * s);
      const gridRows = 4;
      const gridH = gridRows * gridCardH + (gridRows - 1) * gridGapY;
      const totalH = (gridStartY - 132) + gridH + 40;

      PixiPremiumScene.panel(this.pixiContainer, panelX, 132, panelW, totalH, { accentAlpha: 0.42 });

      const summary = this.summaryPanel(summaryX, summaryY, summaryW, summaryH, stats, storyLevel, cols, s);
      this.pixiContainer.addChild(summary);

      const grid = new PIXI.Container();
      grid.x = panelX + pad;
      grid.y = gridStartY;
      this.pixiContainer.addChild(grid);
      cards.forEach((card, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        this.statCard(grid, col * (gridCardW + gridGapX), row * (gridCardH + gridGapY), gridCardW, gridCardH, card, cols, s);
      });
    } else {
      PixiPremiumScene.panel(this.pixiContainer, 76, 132, 1128, 524, { accentAlpha: 0.42 });

      const summary = this.summaryPanel(118, 174, 344, 392, stats, storyLevel, cols, s);
      this.pixiContainer.addChild(summary);

      const grid = new PIXI.Container();
      grid.x = 504;
      grid.y = 174;
      this.pixiContainer.addChild(grid);
      cards.forEach((card, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        this.statCard(grid, col * 318, row * 96, 286, 76, card, cols, s);
      });
    }

    const btnY = Layout.isPortrait ? Layout.H - Layout.SAFE_BOTTOM - 48 : 718;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen('home'), { icon: 'back' });
  },

  summaryPanel(x, y, w, h, stats, storyLevel, cols, s) {
    const group = new PIXI.Container();
    PixiPremiumScene.panel(group, x, y, w, h, { accentAlpha: 0.58, alpha: 0.70 });

    const title = PixiPremiumScene.text('Career Snapshot', {
      fontSize: Math.round(25 * s),
      fontWeight: '900',
      fill: cols.text,
    });
    title.x = x + 34;
    title.y = y + Math.round(30 * s);
    group.addChild(title);

    const games = stats.gamesPlayed || 0;
    const wins = stats.wins || 0;
    const winRate = games ? Math.round((wins / games) * 100) : 0;
    const miniGames = stats.miniGamesPlayed || 0;
    const miniWins = stats.miniGamesWon || 0;
    const miniRate = miniGames ? Math.round((miniWins / miniGames) * 100) : 0;

    const rowGap = Math.min(Math.round(72 * s), (h - Math.round(150 * s)) / 3);
    const rowStart = y + Math.min(Math.round(112 * s), h * 0.28);
    const rows = [
      ['Win Rate', `${winRate}%`],
      ['Mini-Game Rate', `${miniRate}%`],
      ['Story Progress', `${storyLevel}/10`],
    ];
    rows.forEach((row, i) => {
      const yy = rowStart + i * rowGap;
      const label = PixiPremiumScene.text(row[0], { fontSize: Math.round(16 * s), fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, '88') });
      label.x = x + 34;
      label.y = yy;
      group.addChild(label);
      const value = PixiPremiumScene.text(row[1], { fontSize: Math.round(28 * s), fontWeight: '900', fill: cols.accent });
      value.anchor.set(1, 0);
      value.x = x + w - 34;
      value.y = yy - Math.round(6 * s);
      group.addChild(value);
    });

    const barY = y + h - Math.round(44 * s);
    this.bar(group, x + 34, barY, w - 68, Math.round(16 * s), Math.min(1, storyLevel / 10), cols);
    return group;
  },

  statCard(parent, x, y, w, h, item, cols, s) {
    PixiPremiumScene.card(parent, x, y, w, h, {
      interactive: false,
      activeColor: item.accent,
      alpha: 0.68,
      draw: (card) => {
        const iconSize = Math.round(40 * s);
        const icon = new PIXI.Sprite(PixiPremiumAssets.icon(item.icon));
        icon.width = iconSize;
        icon.height = iconSize;
        icon.x = Math.round(18 * s);
        icon.y = Math.round(18 * s);
        card.addChild(icon);

        const labelX = Math.round(74 * s);
        const label = PixiPremiumScene.text(item.label, {
          fontSize: Math.round(15 * s),
          fontWeight: '700',
          fill: PixiPremiumScene.alpha(cols.text, '88'),
        });
        label.x = labelX;
        label.y = Math.round(17 * s);
        PixiPremiumScene.fit(label, Math.round(126 * s), 0.65);
        card.addChild(label);

        const value = PixiPremiumScene.text(String(item.value), {
          fontSize: Math.round(25 * s),
          fontWeight: '900',
          fill: item.accent,
        });
        value.anchor.set(1, 0);
        value.x = w - Math.round(22 * s);
        value.y = Math.round(24 * s);
        PixiPremiumScene.fit(value, Math.round(66 * s), 0.58);
        card.addChild(value);

        if (item.ratio !== undefined) {
          this.bar(card, labelX, Math.round(52 * s), w - labelX - Math.round(26 * s), Math.round(8 * s), item.ratio, cols, item.accent);
        }
      },
    });
  },

  bar(parent, x, y, w, h, value, cols, color) {
    const g = new PIXI.Graphics();
    g.roundRect(x, y, w, h, 4).fill({ color: 0x07111f, alpha: 0.86 });
    g.roundRect(x, y, w, h, 4).stroke({ color: PixiPremiumScene.color(cols.text), alpha: 0.24, width: 2 });
    g.roundRect(x + 3, y + 3, Math.max(8, (w - 6) * value), h - 6, 3)
      .fill({ color: PixiPremiumScene.color(color || cols.accent), alpha: 0.94 });
    parent.addChild(g);
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  destroy() {
    PixiPremiumScene.destroy(this);
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') switchScreen('home');
  },
};
