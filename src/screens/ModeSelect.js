const ModeSelect = {
  init(data) {
    this.mode = data || 'story';
  },

  destroy() {},

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    ctx.fillStyle = cols.background;
    ctx.fillRect(0, 0, 1280, 800);

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.mode === 'story' ? 'STORY MODE' : 'LOCAL 1v1', 640, 200);
  },

  handleClick(x, y) {},
  handleMouseMove(x, y) {},
  handleKeyDown(e) {},
};
