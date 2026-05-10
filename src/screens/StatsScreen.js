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
      const panelX = (Layout.W - 720) / 2;
      const summaryW = 680;
      const summaryH = 280;
      const summaryX = panelX + 20;
      const summaryY = 172;

      const gridCardW = 320;
      const gridCardH = 76;
      const gridGapX = 24;
      const gridGapY = 16;
      const gridStartY = summaryY + summaryH + 30;
      const gridRows = 4;
      const gridH = gridRows * gridCardH + (gridRows - 1) * gridGapY;
      const totalH = (gridStartY - 132) + gridH + 40;

      PixiPremiumScene.panel(this.pixiContainer, panelX, 132, 720, totalH, { accentAlpha: 0.42 });

      const summary = this.summaryPanel(summaryX, summaryY, summaryW, summaryH, stats, storyLevel, cols);
      this.pixiContainer.addChild(summary);

      const grid = new PIXI.Container();
      grid.x = panelX + 20;
      grid.y = gridStartY;
      this.pixiContainer.addChild(grid);
      cards.forEach((card, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        this.statCard(grid, col * (gridCardW + gridGapX), row * (gridCardH + gridGapY), gridCardW, gridCardH, card, cols);
      });
    } else {
      PixiPremiumScene.panel(this.pixiContainer, 76, 132, 1128, 524, { accentAlpha: 0.42 });

      const summary = this.summaryPanel(118, 174, 344, 392, stats, storyLevel, cols);
      this.pixiContainer.addChild(summary);

      const grid = new PIXI.Container();
      grid.x = 504;
      grid.y = 174;
      this.pixiContainer.addChild(grid);
      cards.forEach((card, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        this.statCard(grid, col * 318, row * 96, 286, 76, card, cols);
      });
    }

    const btnY = Layout.isPortrait ? Layout.H - Layout.SAFE_BOTTOM - 48 : 718;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen('home'), { icon: 'back' });
  },

  summaryPanel(x, y, w, h, stats, storyLevel, cols) {
    const group = new PIXI.Container();
    PixiPremiumScene.panel(group, x, y, w, h, { accentAlpha: 0.58, alpha: 0.70 });

    const title = PixiPremiumScene.text('Career Snapshot', {
      fontSize: 25,
      fontWeight: '900',
      fill: cols.text,
    });
    title.x = x + 34;
    title.y = y + 30;
    group.addChild(title);

    const games = stats.gamesPlayed || 0;
    const wins = stats.wins || 0;
    const winRate = games ? Math.round((wins / games) * 100) : 0;
    const miniGames = stats.miniGamesPlayed || 0;
    const miniWins = stats.miniGamesWon || 0;
    const miniRate = miniGames ? Math.round((miniWins / miniGames) * 100) : 0;

    const rowGap = Math.min(72, (h - 150) / 3);
    const rowStart = y + Math.min(112, h * 0.28);
    const rows = [
      ['Win Rate', `${winRate}%`],
      ['Mini-Game Rate', `${miniRate}%`],
      ['Story Progress', `${storyLevel}/10`],
    ];
    rows.forEach((row, i) => {
      const yy = rowStart + i * rowGap;
      const label = PixiPremiumScene.text(row[0], { fontSize: 16, fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, '88') });
      label.x = x + 34;
      label.y = yy;
      group.addChild(label);
      const value = PixiPremiumScene.text(row[1], { fontSize: 28, fontWeight: '900', fill: cols.accent });
      value.anchor.set(1, 0);
      value.x = x + w - 34;
      value.y = yy - 6;
      group.addChild(value);
    });

    const barY = y + h - 44;
    this.bar(group, x + 34, barY, w - 68, 16, Math.min(1, storyLevel / 10), cols);
    return group;
  },

  statCard(parent, x, y, w, h, item, cols) {
    PixiPremiumScene.card(parent, x, y, w, h, {
      interactive: false,
      activeColor: item.accent,
      alpha: 0.68,
      draw: (card) => {
        const icon = new PIXI.Sprite(PixiPremiumAssets.icon(item.icon));
        icon.width = 40;
        icon.height = 40;
        icon.x = 18;
        icon.y = 18;
        card.addChild(icon);

        const label = PixiPremiumScene.text(item.label, {
          fontSize: 15,
          fontWeight: '700',
          fill: PixiPremiumScene.alpha(cols.text, '88'),
        });
        label.x = 74;
        label.y = 17;
        PixiPremiumScene.fit(label, 126, 0.65);
        card.addChild(label);

        const value = PixiPremiumScene.text(String(item.value), {
          fontSize: 25,
          fontWeight: '900',
          fill: item.accent,
        });
        value.anchor.set(1, 0);
        value.x = w - 22;
        value.y = 24;
        PixiPremiumScene.fit(value, 66, 0.58);
        card.addChild(value);

        if (item.ratio !== undefined) {
          this.bar(card, 74, 52, w - 100, 8, item.ratio, cols, item.accent);
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
