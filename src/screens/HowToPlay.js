const HowToPlay = {
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

    UIHelpers.drawPanel(ctx, 240, 60, 800, 680, cols, { accentTop: true });

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HOW TO PLAY', 640, 100);

    const sections = [
      { title: 'Chess Basics', icon: 'crown', lines: [
        'Click a piece to select it, then click a highlighted square to move.',
        'Capture enemy pieces by moving onto their square.',
        'Checkmate the enemy king to win!',
      ]},
      { title: 'Mini-Games', icon: 'target', lines: [
        'Capturing a piece has a 30% chance to trigger a mini-game.',
        'Win the mini-game to keep your capture. Lose, and the tile is locked.',
        'Each mini-game has unique controls — watch the instructions!',
      ]},
      { title: 'Story Mode', icon: 'sword', lines: [
        'Face 10 unique AI opponents with increasing difficulty.',
        'Defeat each opponent to unlock the next level.',
        'Each opponent has unique dialogue and personality.',
      ]},
      { title: 'Controls', icon: 'keyboard', lines: [
        'Mouse: Click to select pieces and interact with UI.',
        'ESC: Pause during gameplay.',
        'F11: Toggle fullscreen.',
        'Arrow Keys / Enter: Navigate menus.',
      ]},
    ];

    let y = 140;
    for (const section of sections) {
      UIHelpers.drawIcon(ctx, 265, y - 14, section.icon, 10, cols, { color: cols.accent });
      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(section.title, 285, y);
      y += 30;
      ctx.fillStyle = cols.text + 'cc';
      ctx.font = '14px monospace';
      for (const line of section.lines) {
        const nextY = UIHelpers.wrapText(ctx, line, 285, y, 735, 24);
        y = nextY;
      }
      UIHelpers.drawSeparator(ctx, 280, y, 720, cols);
      y += 28;
    }

    UIHelpers.drawDitheredRect(ctx, 0, 770, 1280, 30, cols.accent, '11');

    // Back button
    UIHelpers.drawButton(ctx, 540, 700, 200, 40, '< Back', cols, { font: 'bold 14px monospace' });
  },

  handleClick(x, y) {
    if (x >= 540 && x <= 740 && y >= 700 && y <= 740) {
      switchScreen('home');
    }
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      switchScreen('home');
    }
  },
};
