const HomeScreen = {
  stars: [],
  titlePulse: 0,
  buttons: [],
  selectedButton: 0,

  init() {
    this.stars = [];
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * 1280,
        y: Math.random() * 800,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.1,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    const theme = ThemeManager.getTheme(store.get('theme'));
    this.colors = theme.colors;

    this.buttons = [
      { text: 'Story Mode', sub: 'Battle unique characters', action: 'story', group: 'main' },
      { text: 'Local 1v1', sub: 'Play with a friend', action: '1v1', group: 'main' },
      { text: 'Classic Chess', sub: 'Challenge the AI engine', action: 'classic', group: 'main' },
      { text: 'Custom Game', sub: 'Configure your own rules', action: 'custom', group: 'main' },
      { text: 'Settings', action: 'settings', group: 'util', idx: 0 },
      { text: 'How to Play', action: 'help', group: 'util', idx: 1 },
      { text: 'Stats', action: 'stats', group: 'util', idx: 2 },
    ];
    this.selectedButton = 0;
    this.titlePulse = 0;
  },

  destroy() {},

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },

  _getMainBounds(i) {
    const bw = 420;
    const bh = 58;
    const gap = 10;
    const bx = (1280 - bw) / 2;
    const startY = 320;
    return { x: bx, y: startY + i * (bh + gap), w: bw, h: bh };
  },

  _getUtilBounds(idx) {
    const btnW = 180;
    const btnH = 46;
    const gap = 20;
    const totalW = 3 * btnW + 2 * gap;
    const startX = (1280 - totalW) / 2;
    const rowY = 620;
    return { x: startX + idx * (btnW + gap), y: rowY, w: btnW, h: btnH };
  },

  _getBounds(i) {
    const btn = this.buttons[i];
    if (btn.group === 'main') return this._getMainBounds(i);
    return this._getUtilBounds(btn.idx);
  },

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;
    this.titlePulse += dt * 2;

    // Background
    if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      ctx.fillRect(0, 0, 1280, 800);
    }

    // Animated stars/particles
    for (const star of this.stars) {
      star.y += star.speed;
      star.twinkle += dt * 2;
      if (star.y > 800) { star.y = -5; star.x = Math.random() * 1280; }
      const alpha = Math.sin(star.twinkle) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    // Decorative lines
    ctx.strokeStyle = cols.accent + '44';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const y = 120 + i * 25 + Math.sin(this.titlePulse + i) * 4;
      ctx.beginPath();
      ctx.moveTo(350, y);
      ctx.lineTo(930, y);
      ctx.stroke();
    }

    // Crown icon above title
    UIHelpers.drawIcon(ctx, 636, 190, 'crown', 12, cols);

    // Title - "CHESS" in monospace, "2.0" in sans-serif to avoid wide dot
    ctx.textAlign = 'center';
    ctx.font = 'bold 72px monospace';
    const chessW = ctx.measureText('CHESS').width;
    ctx.font = 'bold 72px sans-serif';
    const verW = ctx.measureText('2.0').width;
    const gap = 18;
    const totalW = chessW + gap + verW;
    const titleX = 640 - totalW / 2;

    // Outline pass
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.textAlign = 'left';
    ctx.font = 'bold 72px monospace';
    ctx.strokeText('CHESS', titleX, 220);
    ctx.font = 'bold 72px sans-serif';
    ctx.strokeText('2.0', titleX + chessW + gap, 220);

    // Glow + fill pass
    ctx.shadowColor = cols.accent;
    ctx.shadowBlur = 20;
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 72px monospace';
    ctx.fillText('CHESS', titleX, 220);
    ctx.font = 'bold 72px sans-serif';
    ctx.fillText('2.0', titleX + chessW + gap, 220);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';

    // Subtitle outline
    ctx.font = 'bold 20px monospace';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    ctx.strokeText('A New Era of Battle', 640, 268);
    ctx.fillStyle = cols.accent;
    ctx.fillText('A New Era of Battle', 640, 268);

    // Small animated pixel-art chess piece decorations in the gap
    const pieceColor = cols.accent + '44';
    const bob1 = Math.sin(this.titlePulse) * 2;
    const bob2 = Math.sin(this.titlePulse + 1.5) * 2;
    const bob3 = Math.sin(this.titlePulse + 3) * 2;
    // Knight (left)
    ctx.fillStyle = pieceColor;
    const kx = 520, ky = 240 + bob1;
    ctx.fillRect(kx, ky, 4, 2);
    ctx.fillRect(kx - 2, ky + 2, 6, 2);
    ctx.fillRect(kx, ky + 4, 4, 1);
    ctx.fillRect(kx + 2, ky + 5, 2, 1);
    ctx.fillRect(kx - 2, ky + 6, 6, 1);
    ctx.fillRect(kx - 2, ky + 7, 6, 1);
    ctx.fillRect(kx - 1, ky + 8, 4, 2);
    // Pawn (center)
    const px = 637, py = 242 + bob2;
    ctx.fillRect(px, py, 2, 1);
    ctx.fillRect(px - 1, py + 1, 4, 2);
    ctx.fillRect(px - 2, py + 3, 6, 1);
    ctx.fillRect(px - 1, py + 4, 4, 1);
    ctx.fillRect(px - 2, py + 5, 6, 2);
    ctx.fillRect(px - 1, py + 7, 4, 2);
    // Rook (right)
    const rx = 756, ry = 240 + bob3;
    ctx.fillRect(rx, ry, 2, 2);
    ctx.fillRect(rx + 4, ry, 2, 2);
    ctx.fillRect(rx - 2, ry + 2, 10, 2);
    ctx.fillRect(rx - 1, ry + 4, 8, 1);
    ctx.fillRect(rx, ry + 5, 6, 2);
    ctx.fillRect(rx - 1, ry + 7, 8, 2);
    ctx.fillRect(rx - 2, ry + 9, 10, 2);

    // Theme pill
    const themeName = 'Theme: ' + theme.name;
    ctx.font = '12px monospace';
    const tw = ctx.measureText(themeName).width;
    const pillX = 640 - tw / 2 - 14;
    const pillW = tw + 28;
    this._roundRect(ctx, pillX, 290, pillW, 24, 12);
    ctx.fillStyle = cols.buttonBg + 'aa';
    ctx.fill();
    ctx.strokeStyle = cols.text + '22';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Board color swatches at left edge of pill
    const swY = 295;
    const swX = pillX + 8;
    ctx.fillStyle = cols.lightSquare;
    ctx.fillRect(swX, swY, 3, 3);
    ctx.fillStyle = cols.darkSquare;
    ctx.fillRect(swX + 4, swY, 3, 3);
    ctx.fillStyle = cols.accent;
    ctx.fillRect(swX + 8, swY, 3, 3);
    ctx.fillStyle = cols.text + 'cc';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(themeName, 640, 307);

    // --- Main game mode buttons ---
    const mainIcons = { story: 'sword', '1v1': 'dice', classic: 'crown', custom: 'gear' };
    for (let i = 0; i < 4; i++) {
      const btn = this.buttons[i];
      const b = this._getMainBounds(i);
      const isHover = i === this.selectedButton;

      // Card background
      UIHelpers.drawCard(ctx, b.x, b.y, b.w, b.h, cols, {
        hover: isHover,
        accentStripe: isHover ? cols.accent : null,
      });

      // Button text
      ctx.fillStyle = isHover ? cols.accent : '#ffffff';
      ctx.font = isHover ? 'bold 22px monospace' : 'bold 20px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(UIHelpers.truncateText(ctx, btn.text, b.w - 48), b.x + 24, b.y + b.h / 2 - (btn.sub ? 7 : 0));

      // Subtitle
      if (btn.sub) {
        ctx.fillStyle = isHover ? cols.accent + 'aa' : cols.text + 'aa';
        ctx.font = '13px monospace';
        ctx.fillText(UIHelpers.truncateText(ctx, btn.sub, b.w - 48), b.x + 24, b.y + b.h / 2 + 15);
      }

      // Pixel-art icon
      const iconType = mainIcons[btn.action];
      if (iconType) {
        UIHelpers.drawIcon(ctx, b.x + b.w - 30, b.y + (b.h / 2) - 6, iconType, 10, cols, { color: isHover ? cols.accent : cols.text + '88' });
      }

      // Right arrow on hover
      if (isHover) {
        ctx.fillStyle = cols.accent;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('>', b.x + b.w - 46, b.y + b.h / 2);
      }
    }

    ctx.textBaseline = 'alphabetic';

    // --- Divider ---
    UIHelpers.drawSeparator(ctx, 460, 596, 360, cols);

    // --- Utility buttons row ---
    const utilIcons = { settings: 'gear', help: 'book', stats: 'trophy' };
    for (let i = 4; i < 7; i++) {
      const btn = this.buttons[i];
      const b = this._getUtilBounds(btn.idx);
      const isHover = i === this.selectedButton;

      // Card background
      UIHelpers.drawCard(ctx, b.x, b.y, b.w, b.h, cols, { hover: isHover });

      // Icon to left of text
      const iconType = utilIcons[btn.action];
      if (iconType) {
        UIHelpers.drawIcon(ctx, b.x + 10, b.y + (b.h / 2) - 5, iconType, 10, cols, { color: isHover ? cols.accent : cols.text + '88' });
      }

      // Text
      ctx.fillStyle = isHover ? cols.accent : '#ffffff';
      ctx.font = isHover ? 'bold 16px monospace' : 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(UIHelpers.truncateText(ctx, btn.text, b.w - 28), b.x + b.w / 2 + 6, b.y + b.h / 2);
    }

    ctx.textBaseline = 'alphabetic';

    // Footer
    UIHelpers.drawSeparator(ctx, 460, 748, 360, cols);
    ctx.fillStyle = cols.text + '55';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Use mouse or arrow keys to navigate', 640, 760);
  },

  handleClick(x, y) {
    for (let i = 0; i < this.buttons.length; i++) {
      const b = this._getBounds(i);
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.handleAction(this.buttons[i].action);
        return;
      }
    }
  },

  handleMouseMove(x, y) {
    for (let i = 0; i < this.buttons.length; i++) {
      const b = this._getBounds(i);
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.selectedButton = i;
        return;
      }
    }
  },

  handleKeyDown(e) {
    const btn = this.buttons[this.selectedButton];
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (btn.group === 'util') {
        this.selectedButton = 3;
      } else if (this.selectedButton > 0) {
        this.selectedButton--;
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (btn.group === 'main' && this.selectedButton < 3) {
        this.selectedButton++;
      } else if (btn.group === 'main' && this.selectedButton === 3) {
        this.selectedButton = 4;
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (btn.group === 'util' && btn.idx > 0) {
        this.selectedButton--;
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (btn.group === 'util' && btn.idx < 2) {
        this.selectedButton++;
      }
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleAction(this.buttons[this.selectedButton].action);
    }
  },

  handleAction(action) {
    switch (action) {
      case 'story':
        store.set('mode', 'story');
        switchScreen('characterSelect');
        break;
      case '1v1':
        store.set('mode', '1v1');
        store.set('miniGamesEnabled', true);
        switchScreen('modeSelect');
        break;
      case 'classic':
        switchScreen('botSelect');
        break;
      case 'custom':
        switchScreen('customGame');
        break;
      case 'settings':
        switchScreen('settings');
        break;
      case 'themes':
        switchScreen('themeSelect', { returnTo: 'home' });
        break;
      case 'help':
        switchScreen('howToPlay');
        break;
      case 'stats':
        switchScreen('stats');
        break;
    }
  },
};
