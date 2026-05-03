const PauseMenu = {
  visible: false,
  resumeCallback: null,

  show(callback) {
    this.visible = true;
    this.resumeCallback = callback;
  },

  hide() {
    this.visible = false;
    if (this.resumeCallback) this.resumeCallback();
  },

  render(ctx) {
    if (!this.visible) return;
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 1280, 800);

    ctx.fillStyle = cols.panel;
    ctx.fillRect(390, 200, 500, 350);
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(390, 200, 500, 350);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 640, 270);

    const buttons = [
      { text: 'Resume', action: 'resume', y: 320 },
      { text: 'Settings', action: 'settings', y: 380 },
      { text: 'Quit to Menu', action: 'quit', y: 440 },
    ];

    for (const btn of buttons) {
      ctx.fillStyle = cols.buttonBg;
      ctx.fillRect(540, btn.y, 200, 45);
      ctx.strokeStyle = cols.text + '44';
      ctx.lineWidth = 1;
      ctx.strokeRect(540, btn.y, 200, 45);
      ctx.fillStyle = cols.text;
      ctx.font = '16px monospace';
      ctx.fillText(btn.text, 640, btn.y + 30);
      btn._bounds = { x: 540, y: btn.y, w: 200, h: 45 };
    }
  },

  handleClick(x, y) {
    if (!this.visible) return 'ignore';
    const buttons = [
      { text: 'Resume', action: 'resume', y: 320 },
      { text: 'Settings', action: 'settings', y: 380 },
      { text: 'Quit to Menu', action: 'quit', y: 440 },
    ];
    for (const btn of buttons) {
      if (x >= 540 && x <= 740 && y >= btn.y && y <= btn.y + 45) {
        if (btn.action === 'resume') this.hide();
        else if (btn.action === 'settings') { this.hide(); switchScreen('settings'); }
        else if (btn.action === 'quit') { this.hide(); switchScreen('home'); }
        return;
      }
    }
  },
};
