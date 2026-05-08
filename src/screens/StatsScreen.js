const StatsScreen = {
  init() {},
  destroy() {},

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    const usePixiBg = typeof PixiMenuBackground !== 'undefined' && PixiMenuBackground.initialized;
    if (usePixiBg) {
      ctx.clearRect(0, 0, 1280, 800);
    } else if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      ctx.fillRect(0, 0, 1280, 800);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, 1280, 800);

    UIHelpers.drawPanel(ctx, 340, 80, 600, 620, cols, { accentTop: true, borderWidth: 3 });

    UIHelpers.drawIcon(ctx, 636, 92, 'trophy', 12, cols);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STATISTICS', 640, 120);

    const stats = store.get('stats') || {};
    const items = [
      { label: 'Games Played', value: stats.gamesPlayed || 0 },
      { label: 'Wins', value: stats.wins || 0, max: stats.gamesPlayed || 1 },
      { label: 'Losses', value: stats.losses || 0 },
      { label: 'Draws', value: stats.draws || 0 },
      { label: 'Captures', value: stats.captures || 0 },
      { label: 'Mini-Games Played', value: stats.miniGamesPlayed || 0 },
      { label: 'Mini-Games Won', value: stats.miniGamesWon || 0, max: stats.miniGamesPlayed || 1 },
      { label: 'Story Level Reached', value: (store.getActiveSave() && store.getActiveSave().storyLevel) || 1, max: 10 },
    ];

    const panelX = 340;
    const panelW = 600;
    const cardMargin = 15;
    const cardW = panelW - cardMargin * 2;
    const cardH = 40;
    const progressExtra = 20;
    const separatorGap = 10;

    // Calculate total content height for vertical centering
    let totalHeight = 0;
    for (let i = 0; i < items.length; i++) {
      totalHeight += cardH;
      if (items[i].max) totalHeight += progressExtra;
      if (i < items.length - 1) totalHeight += separatorGap;
      if (i % 2 === 0 && i < items.length - 1) totalHeight += separatorGap;
    }

    const panelContentTop = 140; // below title
    const panelContentBottom = 640; // above back button area
    const availableHeight = panelContentBottom - panelContentTop;
    let y = panelContentTop + Math.max(0, (availableHeight - totalHeight) / 2);

    const x = panelX;
    const w = panelW;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Draw card background behind each stat row
      UIHelpers.drawCard(ctx, panelX + cardMargin, y - 8, cardW, cardH, cols, { hover: false });

      ctx.fillStyle = cols.text + '88';
      ctx.font = '16px "Pixelify Sans", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, x + 40, y + 8);
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 20px "Pixelify Sans", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(String(item.value), x + w - 40, y + 8);

      let rowBottom = y + cardH - 8;
      if (item.max) {
        UIHelpers.drawProgressBar(ctx, panelX + cardMargin + 10, rowBottom, cardW - 20, 6, item.value / item.max, cols);
        rowBottom += progressExtra;
      }

      if (i % 2 === 0 && i < items.length - 1) {
        UIHelpers.drawSeparator(ctx, panelX + cardMargin, rowBottom + separatorGap / 2, cardW, cols);
        rowBottom += separatorGap;
      }

      y = rowBottom + separatorGap;
    }

    UIHelpers.drawDitheredRect(ctx, 0, 770, 1280, 30, cols.accent, '11');

    // Back button
    UIHelpers.drawButton(ctx, 540, 650, 200, 40, '< Back', cols, { font: 'bold 14px monospace' });
  },

  handleClick(x, y) {
    if (x >= 540 && x <= 740 && y >= 650 && y <= 690) {
      switchScreen('home');
    }
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      switchScreen('home');
    }
  },
};