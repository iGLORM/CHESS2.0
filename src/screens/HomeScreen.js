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
      { text: 'Story Mode', action: 'story', y: 360 },
      { text: 'Local 1v1', action: '1v1', y: 430 },
      { text: 'Classic Chess', action: 'classic', y: 500 },
      { text: 'Settings', action: 'settings', y: 570 },
      { text: 'Theme: ' + theme.name, action: 'themes', y: 640 },
    ];
    this.selectedButton = 0;
    this.titlePulse = 0;
  },

  destroy() {},

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;
    this.titlePulse += dt * 2;

    // Background
    // Background - animated theme
    if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      
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
    ctx.strokeStyle = cols.accent + '33';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = 100 + i * 30 + Math.sin(this.titlePulse + i) * 5;
      ctx.beginPath();
      ctx.moveTo(300, y);
      ctx.lineTo(980, y);
      ctx.stroke();
    }

    // Title shadow
    ctx.fillStyle = cols.accent + '44';
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CHESS 2.0', 642, 242);

    // Title
    const glow = Math.sin(this.titlePulse) * 5;
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CHESS 2.0', 640, 240);

    // Subtitle
    ctx.fillStyle = cols.accent;
    ctx.font = '18px monospace';
    ctx.fillText('A New Era of Battle', 640, 285);

    // Subtitle decoration
    ctx.fillStyle = cols.text + '44';
    ctx.font = '12px monospace';
    ctx.fillText('~ Pixel Battle Chess ~', 640, 310);

    // Theme display
    ctx.fillStyle = cols.text + '88';
    ctx.font = '11px monospace';
    ctx.fillText('Theme: ' + theme.name, 640, 340);

    // Buttons
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const isHover = i === this.selectedButton;
      const bx = 440;
      const bw = 400;
      const bh = 50;

      // Button shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(bx + 3, btn.y + 3, bw, bh);

      // Button bg
      ctx.fillStyle = isHover ? cols.buttonHover : cols.buttonBg;
      ctx.fillRect(bx, btn.y, bw, bh);

      // Button border
      ctx.strokeStyle = isHover ? cols.accent : cols.text + '44';
      ctx.lineWidth = isHover ? 2 : 1;
      ctx.strokeRect(bx, btn.y, bw, bh);

      // Button text
      ctx.fillStyle = isHover ? cols.accent : cols.text;
      ctx.font = isHover ? 'bold 20px monospace' : '20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.text, 640, btn.y + bh / 2);

      // Pixel decoration on hover
      if (isHover) {
        ctx.fillStyle = cols.accent;
        ctx.fillRect(bx - 8, btn.y + 4, 4, bh - 8);
        ctx.fillRect(bx + bw + 4, btn.y + 4, 4, bh - 8);
      }
    }

    // Footer
    ctx.fillStyle = cols.text + '44';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('v1.0 — Use mouse to navigate', 640, 790);

    // Reset text baseline
    ctx.textBaseline = 'alphabetic';
  },

  handleClick(x, y) {
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const bx = 440, bw = 400, bh = 50;
      if (x >= bx && x <= bx + bw && y >= btn.y && y <= btn.y + bh) {
        this.handleAction(btn.action);
        return;
      }
    }
  },

  handleMouseMove(x, y) {
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const bx = 440, bw = 400, bh = 50;
      if (x >= bx && x <= bx + bw && y >= btn.y && y <= btn.y + bh) {
        this.selectedButton = i;
        return;
      }
    }
  },

  handleKeyDown(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const dir = e.key === 'ArrowUp' ? -1 : 1;
      this.selectedButton = (this.selectedButton + dir + this.buttons.length) % this.buttons.length;
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
        store.set('p1IsWhite', true);
        store.set('miniGamesEnabled', true);
        switchScreen('game');
        break;
      case 'classic':
        store.set('mode', 'classic');
        store.set('p1IsWhite', true);
        store.set('miniGamesEnabled', false);
        switchScreen('game');
        break;
      case 'settings':
        switchScreen('settings');
        break;
      case 'themes':
        switchScreen('themeSelect', { returnTo: 'home' });
        break;
    }
  },
};
