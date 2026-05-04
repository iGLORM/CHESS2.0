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

    // Background - animated theme
    if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      ctx.fillRect(0, 0, 1280, 800);
    }
    

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT THEME', 640, 60);
    ctx.font = '12px monospace';
    ctx.fillStyle = cols.text + '88';
    ctx.fillText('Choose your visual style', 640, 85);

    const cardW = 220;
    const cardH = 130;
    const gapX = 30;
    const gapY = 25;
    const perRow = 4;
    const totalGridW = perRow * cardW + (perRow - 1) * gapX;
    const startX = (1280 - totalGridW) / 2;
    const startY = 120;

    for (let i = 0; i < this.themes.length; i++) {
      const t = this.themes[i];
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const isHover = i === this.hoveredIndex;
      const isActive = t.id === store.get('theme');
      const unlocked = ThemeManager.isThemeUnlocked(t.id);

      // Card background
      ctx.fillStyle = isHover && unlocked ? t.colors.buttonHover : t.colors.panel;
      ctx.fillRect(x, y, cardW, cardH);

      // Card border
      ctx.strokeStyle = isActive ? t.colors.accent : (isHover && unlocked ? t.colors.text + '88' : t.colors.text + '22');
      ctx.lineWidth = isActive ? 3 : 1;
      ctx.strokeRect(x, y, cardW, cardH);

      if (unlocked) {
        // Color preview swatches
        const swatchSize = 16;
        const swatches = [t.colors.lightSquare, t.colors.darkSquare, t.colors.lightPiece, t.colors.darkPiece, t.colors.accent];
        for (let s = 0; s < swatches.length; s++) {
          ctx.fillStyle = swatches[s];
          ctx.fillRect(x + 10 + s * (swatchSize + 4), y + 15, swatchSize, swatchSize);
        }

        // Theme name
        ctx.fillStyle = t.colors.text;
        ctx.font = '16px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(t.name, x + 10, y + 52);

        // Description
        ctx.fillStyle = t.colors.text + '77';
        ctx.font = '12px monospace';
        ctx.fillText(t.desc, x + 10, y + 72);

        // Active indicator
        if (isActive) {
          ctx.fillStyle = t.colors.accent;
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'left';
          ctx.fillText('ACTIVE', x + 10, y + 97);
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
      } else {
        // Locked overlay
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y, cardW, cardH);
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚠', x + cardW / 2, y + cardH / 2 + 6);
        ctx.fillStyle = cols.text + '88';
        ctx.font = '10px monospace';
        ctx.fillText('LOCKED', x + cardW / 2, y + cardH / 2 + 24);
        ctx.fillStyle = cols.text + '55';
        ctx.font = '9px monospace';
        const reqs = { egypt: 'Lv 2', cyberpunk: 'Lv 4', japanese: 'Lv 5', artdeco: 'Lv 6', wildwest: 'Lv 7', prehistoric: 'Lv 8', steampunk: 'Lv 9' };
        if (reqs[t.id]) ctx.fillText('Story ' + reqs[t.id], x + cardW / 2, y + cardH / 2 + 38);
      }
    }

    // Custom theme editor
    const customIdx = this.themes.findIndex(t => t.id === 'custom');
    const isCustomActive = customIdx !== -1 && (this.hoveredIndex === customIdx || store.get('theme') === 'custom');
    if (isCustomActive) {
      const editorY = 520;
      const editorH = 220;
      ctx.fillStyle = cols.panel + 'dd';
      ctx.fillRect(startX, editorY, totalGridW, editorH);
      ctx.strokeStyle = cols.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, editorY, totalGridW, editorH);

      ctx.fillStyle = cols.text;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CLICK A SWATCH TO CYCLE COLOR', startX + totalGridW / 2, editorY + 22);

      const colorKeys = ['lightSquare', 'darkSquare', 'lightPiece', 'darkPiece', 'highlight', 'background', 'panel', 'text', 'accent', 'buttonBg'];
      const swatchSize = 22;
      const swatchGap = 8;
      const colsPerRow = 5;
      const swatchTotalW = colsPerRow * (swatchSize + swatchGap) - swatchGap;
      const swatchStartX = startX + (totalGridW - swatchTotalW) / 2;
      const swatchStartY = editorY + 38;

      for (let i = 0; i < colorKeys.length; i++) {
        const row = Math.floor(i / colsPerRow);
        const col = i % colsPerRow;
        const sx = swatchStartX + col * (swatchSize + swatchGap);
        const sy = swatchStartY + row * (swatchSize + swatchGap + 12);
        const key = colorKeys[i];
        const color = ThemeManager.getTheme('custom').colors[key];

        ctx.fillStyle = color;
        ctx.fillRect(sx, sy, swatchSize, swatchSize);
        ctx.strokeStyle = cols.text + '66';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, sy, swatchSize, swatchSize);

        ctx.fillStyle = cols.text + 'aa';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(key, sx + swatchSize / 2, sy + swatchSize + 9);
      }

      // Music & Background theme pickers
      const baseThemes = this.themes.filter(t => t.id !== 'custom');
      const chipW = 68;
      const chipH = 18;
      const chipGap = 6;
      const chipsPerRow = 5;
      const chipsTotalW = chipsPerRow * (chipW + chipGap) - chipGap;
      const chipsStartX = startX + (totalGridW - chipsTotalW) / 2;

      // Music theme row
      ctx.fillStyle = cols.text + 'aa';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Music:', startX + 10, editorY + 138);
      const musicY = editorY + 144;
      const currentMusic = store.get('customMusicTheme') || 'space';
      for (let i = 0; i < baseThemes.length; i++) {
        const t = baseThemes[i];
        const row = Math.floor(i / chipsPerRow);
        const col = i % chipsPerRow;
        const cx = chipsStartX + col * (chipW + chipGap);
        const cy = musicY + row * (chipH + 4);
        const active = t.id === currentMusic;
        ctx.fillStyle = active ? t.colors.accent : t.colors.panel;
        ctx.fillRect(cx, cy, chipW, chipH);
        ctx.strokeStyle = active ? t.colors.text : t.colors.text + '44';
        ctx.lineWidth = active ? 2 : 1;
        ctx.strokeRect(cx, cy, chipW, chipH);
        ctx.fillStyle = active ? '#fff' : t.colors.text;
        ctx.font = active ? 'bold 9px monospace' : '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t.name.split(' ')[0], cx + chipW / 2, cy + chipH - 5);
        t._musicBounds = { x: cx, y: cy, w: chipW, h: chipH };
      }

      // Background theme row
      ctx.fillStyle = cols.text + 'aa';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Background:', startX + 10, editorY + 184);
      const bgY = editorY + 190;
      const currentBg = store.get('customBgTheme') || 'space';
      for (let i = 0; i < baseThemes.length; i++) {
        const t = baseThemes[i];
        const row = Math.floor(i / chipsPerRow);
        const col = i % chipsPerRow;
        const cx = chipsStartX + col * (chipW + chipGap);
        const cy = bgY + row * (chipH + 4);
        const active = t.id === currentBg;
        ctx.fillStyle = active ? t.colors.accent : t.colors.panel;
        ctx.fillRect(cx, cy, chipW, chipH);
        ctx.strokeStyle = active ? t.colors.text : t.colors.text + '44';
        ctx.lineWidth = active ? 2 : 1;
        ctx.strokeRect(cx, cy, chipW, chipH);
        ctx.fillStyle = active ? '#fff' : t.colors.text;
        ctx.font = active ? 'bold 9px monospace' : '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t.name.split(' ')[0], cx + chipW / 2, cy + chipH - 5);
        t._bgBounds = { x: cx, y: cy, w: chipW, h: chipH };
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

    const cardW = 220;
    const cardH = 130;
    const gapX = 30;
    const gapY = 25;
    const perRow = 4;
    const totalGridW = perRow * cardW + (perRow - 1) * gapX;
    const startX = (1280 - totalGridW) / 2;
    const startY = 120;

    for (let i = 0; i < this.themes.length; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);
      if (x >= cx && x <= cx + cardW && y >= cy && y <= cy + cardH) {
        if (ThemeManager.isThemeUnlocked(this.themes[i].id)) {
          ThemeManager.applyTheme(this.themes[i].id);
        }
        return;
      }
    }

    // Custom color swatch clicks
    const customIdx = this.themes.findIndex(t => t.id === 'custom');
    const isCustomActive = customIdx !== -1 && (this.hoveredIndex === customIdx || store.get('theme') === 'custom');
    if (isCustomActive) {
      const editorY = 520;
      const colorKeys = ['lightSquare', 'darkSquare', 'lightPiece', 'darkPiece', 'highlight', 'background', 'panel', 'text', 'accent', 'buttonBg'];
      const swatchSize = 22;
      const swatchGap = 8;
      const colsPerRow = 5;
      const swatchTotalW = colsPerRow * (swatchSize + swatchGap) - swatchGap;
      const swatchStartX = startX + (totalGridW - swatchTotalW) / 2;
      const swatchStartY = editorY + 38;
      const presets = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ffffff', '#000000', '#888888', '#ff8800', '#8800ff', '#0088ff', '#8b4513', '#2e8b57', '#800000'];

      for (let i = 0; i < colorKeys.length; i++) {
        const row = Math.floor(i / colsPerRow);
        const col = i % colsPerRow;
        const sx = swatchStartX + col * (swatchSize + swatchGap);
        const sy = swatchStartY + row * (swatchSize + swatchGap + 12);
        if (x >= sx && x <= sx + swatchSize && y >= sy && y <= sy + swatchSize) {
          const key = colorKeys[i];
          const current = ThemeManager.getTheme('custom').colors[key];
          let idx = presets.indexOf(current);
          if (idx === -1) idx = 0;
          const nextColor = presets[(idx + 1) % presets.length];
          ThemeManager.setCustomColor(key, nextColor);
          return;
        }
      }

      // Music theme chip clicks
      for (const t of this.themes.filter(t => t.id !== 'custom')) {
        if (t._musicBounds && x >= t._musicBounds.x && x <= t._musicBounds.x + t._musicBounds.w &&
            y >= t._musicBounds.y && y <= t._musicBounds.y + t._musicBounds.h) {
          store.set('customMusicTheme', t.id);
          store.saveProgress();
          if (typeof audioManager !== 'undefined') {
            audioManager.stopMusic();
            audioManager.startMusic();
          }
          return;
        }
      }

      // Background theme chip clicks
      for (const t of this.themes.filter(t => t.id !== 'custom')) {
        if (t._bgBounds && x >= t._bgBounds.x && x <= t._bgBounds.x + t._bgBounds.w &&
            y >= t._bgBounds.y && y <= t._bgBounds.y + t._bgBounds.h) {
          store.set('customBgTheme', t.id);
          store.saveProgress();
          return;
        }
      }
    }
  },

  handleMouseMove(x, y) {
    this.hoveredIndex = -1;
    const cardW = 220;
    const cardH = 130;
    const gapX = 30;
    const gapY = 25;
    const perRow = 4;
    const totalGridW = perRow * cardW + (perRow - 1) * gapX;
    const startX = (1280 - totalGridW) / 2;
    const startY = 120;

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
