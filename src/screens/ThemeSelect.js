const ThemeSelect = {
  themes: [],
  hoveredIndex: -1,
  returnScreen: 'home',

  init(data) {
    this.themes = ThemeManager.getAllThemes();
    this.hoveredIndex = -1;
    this.returnScreen = data?.returnTo || 'home';
  },

  destroy() {},

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    ctx.fillStyle = cols.background;
    ctx.fillRect(0, 0, 1280, 800);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT THEME', 640, 60);
    ctx.font = '12px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Choose your visual style', 640, 85);

    const startX = 60;
    const startY = 120;
    const cardW = 220;
    const cardH = 130;
    const gapX = 30;
    const gapY = 25;
    const perRow = 5;

    for (let i = 0; i < this.themes.length; i++) {
      const t = this.themes[i];
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const isHover = i === this.hoveredIndex;
      const isActive = t.id === store.get('theme');

      // Card background
      ctx.fillStyle = isHover ? t.colors.buttonHover : t.colors.panel;
      ctx.fillRect(x, y, cardW, cardH);

      // Card border
      ctx.strokeStyle = isActive ? t.colors.accent : (isHover ? t.colors.text + '88' : t.colors.text + '22');
      ctx.lineWidth = isActive ? 3 : 1;
      ctx.strokeRect(x, y, cardW, cardH);

      // Color preview swatches
      const swatchSize = 16;
      const swatches = [t.colors.lightSquare, t.colors.darkSquare, t.colors.lightPiece, t.colors.darkPiece, t.colors.accent];
      for (let s = 0; s < swatches.length; s++) {
        ctx.fillStyle = swatches[s];
        ctx.fillRect(x + 10 + s * (swatchSize + 4), y + 15, swatchSize, swatchSize);
      }

      // Theme name
      ctx.fillStyle = t.colors.text;
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(t.name, x + 10, y + 52);

      // Description
      ctx.fillStyle = t.colors.text + '77';
      ctx.font = '10px monospace';
      ctx.fillText(t.desc, x + 10, y + 70);

      // Active indicator
      if (isActive) {
        ctx.fillStyle = t.colors.accent;
        ctx.font = 'bold 10px monospace';
        ctx.fillText('ACTIVE', x + 10, y + 95);
      }

      // Hover background preview
      if (isHover) {
        ctx.fillStyle = t.colors.background + '33';
        ctx.fillRect(x + cardW - 60, y + 80, 50, 40);
        ctx.fillStyle = t.colors.highlight;
        ctx.fillRect(x + cardW - 55, y + 85, 8, 8);
        ctx.fillRect(x + cardW - 40, y + 85, 8, 8);
        ctx.fillStyle = t.colors.lightSquare;
        ctx.fillRect(x + cardW - 55, y + 97, 8, 8);
        ctx.fillStyle = t.colors.darkSquare;
        ctx.fillRect(x + cardW - 40, y + 97, 8, 8);
      }
    }

    // Back button
    ctx.fillStyle = cols.buttonBg;
    ctx.fillRect(30, 730, 160, 40);
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 730, 160, 40);
    ctx.fillStyle = cols.text;
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('< Back', 110, 755);
  },

  handleClick(x, y) {
    // Back button
    if (x >= 30 && x <= 190 && y >= 730 && y <= 770) {
      switchScreen(this.returnScreen);
      return;
    }

    const startX = 60;
    const startY = 120;
    const cardW = 220;
    const cardH = 130;
    const gapX = 30;
    const gapY = 25;
    const perRow = 5;

    for (let i = 0; i < this.themes.length; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);
      if (x >= cx && x <= cx + cardW && y >= cy && y <= cy + cardH) {
        ThemeManager.applyTheme(this.themes[i].id);
        return;
      }
    }
  },

  handleMouseMove(x, y) {
    this.hoveredIndex = -1;
    const startX = 60;
    const startY = 120;
    const cardW = 220;
    const cardH = 130;
    const gapX = 30;
    const gapY = 25;
    const perRow = 5;

    for (let i = 0; i < this.themes.length; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);
      if (x >= cx && x <= cx + cardW && y >= cy && y <= cy + cardH) {
        this.hoveredIndex = i;
        return;
      }
    }
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      switchScreen(this.returnScreen);
    }
  },
};
