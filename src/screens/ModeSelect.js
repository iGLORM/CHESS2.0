const ModeSelect = {
  init(data) {
    this.mode = data || 'story';
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
      
    }
    

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.mode === 'story' ? 'STORY MODE' : 'LOCAL 1v1', 640, 200);
  },

  handleClick(x, y) {},
  handleMouseMove(x, y) {},
  handleKeyDown(e) {},
};
