const StatsScreen = {
  isPixiScreen: true,
  pixiContainer: null,

  init() {
    this.build();
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Statistics', 'Match results, captures, mini-games, and story progress', {
      footerHint: 'Stats update after every game',
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
      // Outer panel; snapshot column on the left, 2x4 stat grid on the right.
      const L = { X: 60, Y: 150, PAD: 32, PAD_TOP: 40, SUMMARY_W: 360, COL_GAP: 28, GAP_X: 20, GAP_Y: 16 };
      const panelW = Layout.W - L.X * 2;
      const panelH = PixiPremiumScene.contentBottom - L.Y;
      PixiPremiumScene.panel(this.pixiContainer, L.X, L.Y, panelW, panelH, { accentAlpha: 0.42 });
      const innerY = L.Y + L.PAD_TOP;
      const innerH = panelH - L.PAD_TOP - L.PAD;

      const summary = this.summaryPanel(L.X + L.PAD, innerY, L.SUMMARY_W, innerH, stats, storyLevel, cols, s);
      this.pixiContainer.addChild(summary);

      const gridX = L.X + L.PAD + L.SUMMARY_W + L.COL_GAP;
      const gridW = L.X + panelW - L.PAD - gridX;
      const cardW = Math.floor((gridW - L.GAP_X) / 2);
      const cardH = Math.floor((innerH - 3 * L.GAP_Y) / 4);
      const grid = new PIXI.Container();
      grid.x = gridX;
      grid.y = innerY;
      this.pixiContainer.addChild(grid);
      cards.forEach((card, i) => {
        this.statCard(grid, (i % 2) * (cardW + L.GAP_X), Math.floor(i / 2) * (cardH + L.GAP_Y), cardW, cardH, card, cols, s);
      });
    }

    const btnY = PixiPremiumScene.bottomButtonY();
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen('home'), { icon: 'back' });
  },

  summaryPanel(x, y, w, h, stats, storyLevel, cols, s) {
    const group = new PIXI.Container();
    PixiPremiumScene.panel(group, x, y, w, h, { accentAlpha: 0.58, alpha: 0.70 });
    const pad = 30;

    const title = PixiPremiumScene.text('Career Snapshot', { fontSize: Math.round(25 * s), fontWeight: '900', fill: cols.text });
    title.x = x + pad;
    title.y = y + 38;
    group.addChild(title);

    const games = stats.gamesPlayed || 0;
    const wins = stats.wins || 0;
    const winRate = games ? Math.round((wins / games) * 100) : 0;
    const miniGames = stats.miniGamesPlayed || 0;
    const miniWins = stats.miniGamesWon || 0;
    const miniRate = miniGames ? Math.round((miniWins / miniGames) * 100) : 0;

    // Three rows evenly spaced between the title and the story bar, label and value on one line.
    const barH = Math.round(16 * s);
    const barY = y + h - pad - barH;
    const top = title.y + title.height + 16;
    const bottom = barY - 40;
    const rows = [
      ['Win Rate', `${winRate}%`],
      ['Mini-Game Rate', `${miniRate}%`],
      ['Story Progress', `${storyLevel}/10`],
    ];
    const step = (bottom - top) / rows.length;
    rows.forEach((row, i) => {
      const cy = Math.round(top + step * (i + 0.5));
      const label = PixiPremiumScene.text(row[0], { fontSize: Math.round(17 * s), fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, '99') });
      label.anchor.set(0, 0.5);
      label.x = x + pad;
      label.y = cy;
      group.addChild(label);
      const value = PixiPremiumScene.text(row[1], { fontSize: Math.round(28 * s), fontWeight: '900', fill: cols.accent });
      value.anchor.set(1, 0.5);
      value.x = x + w - pad;
      value.y = cy;
      group.addChild(value);
      if (i > 0) group.addChild(new PIXI.Graphics().rect(x + pad, Math.round(top + step * i), w - pad * 2, 2).fill({ color: PixiPremiumScene.color(cols.text), alpha: 0.1 }));
    });

    const barLabel = PixiPremiumScene.text('Story completion', { fontSize: Math.round(14 * s), fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, '88') });
    barLabel.x = x + pad;
    barLabel.y = barY - barLabel.height - 8;
    group.addChild(barLabel);
    this.bar(group, x + pad, barY, w - pad * 2, barH, Math.min(1, storyLevel / 10), cols);
    return group;
  },

  // Icon, label and value on one row; cards with a ratio add a bar underneath.
  statCard(parent, x, y, w, h, item, cols, s) {
    PixiPremiumScene.card(parent, x, y, w, h, {
      interactive: false,
      activeColor: item.accent,
      alpha: 0.68,
      accentStrip: false,
      draw: (card) => {
        const pad = 20;
        const iconSize = Math.min(Math.round(44 * s), h - 30);
        const icon = new PIXI.Sprite(PixiPremiumAssets.icon(item.icon));
        icon.width = iconSize;
        icon.height = iconSize;
        icon.x = pad;
        icon.y = Math.round((h - iconSize) / 2);
        card.addChild(icon);

        const hasBar = item.ratio !== undefined;
        const barH = Math.round(8 * s);
        const rowY = hasBar ? Math.round(h / 2 - 10) : Math.round(h / 2);
        const textX = pad + iconSize + 16;
        const value = PixiPremiumScene.text(String(item.value), { fontSize: Math.round(26 * s), fontWeight: '900', fill: item.accent });
        value.anchor.set(1, 0.5);
        value.x = w - pad;
        value.y = rowY;
        card.addChild(value);
        const label = PixiPremiumScene.text(item.label, { fontSize: Math.round(16 * s), fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, 'aa') });
        label.anchor.set(0, 0.5);
        label.x = textX;
        label.y = rowY;
        PixiPremiumScene.fit(label, value.x - value.width - 12 - textX, 0.7);
        card.addChild(label);

        if (hasBar) this.bar(card, textX, rowY + 20, w - pad - textX, barH, item.ratio, cols, item.accent);
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
