const StatsScreen = {
  init() {},
  destroy() {},

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      ctx.fillRect(0, 0, 1280, 800);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, 1280, 800);

    UIHelpers.drawPanel(ctx, 340, 80, 600, 620, cols, { accentTop: true });

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

    const x = 360;
    const w = 560;
    let y = 165;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      ctx.fillStyle = cols.text + '88';
      ctx.font = '16px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, x + 40, y);
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(String(item.value), x + w - 40, y);
      if (item.max) {
        UIHelpers.drawProgressBar(ctx, x + 10, y + 15, w - 20, 6, item.value / item.max, cols);
      }
      if (i % 2 === 0 && i < items.length - 1) {
        UIHelpers.drawSeparator(ctx, x + 20, y + 25, w - 40, cols);
      }
      y += item.max ? 60 : 50;
      if (i % 2 === 0 && i < items.length - 1) {
        y += 10;
      }
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