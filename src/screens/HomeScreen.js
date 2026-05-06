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
    ctx.strokeStyle = cols.accent + '22';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const y = 120 + i * 25 + Math.sin(this.titlePulse + i) * 4;
      ctx.beginPath();
      ctx.moveTo(350, y);
      ctx.lineTo(930, y);
      ctx.stroke();
    }

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

    // Theme pill
    const themeName = 'Theme: ' + theme.name;
    ctx.font = '12px monospace';
    const tw = ctx.measureText(themeName).width;
    this._roundRect(ctx, 640 - tw / 2 - 14, 290, tw + 28, 24, 12);
    ctx.fillStyle = cols.buttonBg + 'aa';
    ctx.fill();
    ctx.strokeStyle = cols.text + '22';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = cols.text + 'cc';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(themeName, 640, 307);

    // --- Main game mode buttons ---
    for (let i = 0; i < 4; i++) {
      const btn = this.buttons[i];
      const b = this._getMainBounds(i);
      const isHover = i === this.selectedButton;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      this._roundRect(ctx, b.x + 3, b.y + 3, b.w, b.h, 8);
      ctx.fill();

      // Background
      ctx.fillStyle = isHover ? cols.buttonHover : cols.buttonBg;
      this._roundRect(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fill();

      // Border
      ctx.strokeStyle = isHover ? cols.accent : cols.text + '55';
      ctx.lineWidth = isHover ? 2.5 : 1.5;
      this._roundRect(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.stroke();

      // Left accent bar on hover
      if (isHover) {
        this._roundRect(ctx, b.x, b.y, 5, b.h, 3);
        ctx.fillStyle = cols.accent;
        ctx.fill();
      }

      // Button text
      ctx.fillStyle = isHover ? cols.accent : '#ffffff';
      ctx.font = isHover ? 'bold 22px monospace' : 'bold 20px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.text, b.x + 24, b.y + b.h / 2 - (btn.sub ? 7 : 0));

      // Subtitle
      if (btn.sub) {
        ctx.fillStyle = isHover ? cols.accent + 'aa' : cols.text + 'aa';
        ctx.font = '13px monospace';
        ctx.fillText(btn.sub, b.x + 24, b.y + b.h / 2 + 15);
      }

      // Right arrow on hover
      if (isHover) {
        ctx.fillStyle = cols.accent;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('>', b.x + b.w - 18, b.y + b.h / 2);
      }
    }

    ctx.textBaseline = 'alphabetic';

    // --- Divider ---
    ctx.strokeStyle = cols.text + '15';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(460, 596);
    ctx.lineTo(820, 596);
    ctx.stroke();

    // --- Utility buttons row ---
    for (let i = 4; i < 7; i++) {
      const btn = this.buttons[i];
      const b = this._getUtilBounds(btn.idx);
      const isHover = i === this.selectedButton;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      this._roundRect(ctx, b.x + 2, b.y + 2, b.w, b.h, 6);
      ctx.fill();

      // Background
      ctx.fillStyle = isHover ? cols.buttonHover : cols.buttonBg;
      this._roundRect(ctx, b.x, b.y, b.w, b.h, 6);
      ctx.fill();

      // Border
      ctx.strokeStyle = isHover ? cols.accent : cols.text + '44';
      ctx.lineWidth = isHover ? 2 : 1.5;
      this._roundRect(ctx, b.x, b.y, b.w, b.h, 6);
      ctx.stroke();

      // Text
      ctx.fillStyle = isHover ? cols.accent : '#ffffff';
      ctx.font = isHover ? 'bold 16px monospace' : 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.text, b.x + b.w / 2, b.y + b.h / 2);
    }

    ctx.textBaseline = 'alphabetic';

    // Footer
    ctx.fillStyle = cols.text + '33';
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
