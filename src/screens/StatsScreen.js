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

    ctx.fillStyle = cols.panel + 'ee';
    ctx.fillRect(340, 80, 600, 620);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(340, 80, 600, 620);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STATISTICS', 640, 120);

    const stats = store.get('stats') || {};
    const items = [
      { label: 'Games Played', value: stats.gamesPlayed || 0 },
      { label: 'Wins', value: stats.wins || 0 },
      { label: 'Losses', value: stats.losses || 0 },
      { label: 'Draws', value: stats.draws || 0 },
      { label: 'Captures', value: stats.captures || 0 },
      { label: 'Mini-Games Played', value: stats.miniGamesPlayed || 0 },
      { label: 'Mini-Games Won', value: stats.miniGamesWon || 0 },
      { label: 'Story Level Reached', value: store.get('maxUnlockedLevel') || 1 },
    ];

    let y = 180;
    for (const item of items) {
      ctx.fillStyle = cols.text + '88';
      ctx.font = '16px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, 400, y);
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(String(item.value), 880, y);
      y += 55;
    }

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
