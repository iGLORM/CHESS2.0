class ParticleFX {
  constructor(boardRenderer) {
    this.boardRenderer = boardRenderer;
  }

  captureEffect(x, y, theme) {
    this.boardRenderer.spawnParticles(x, y, theme.colors.particleColors || [theme.colors.highlight], 20);
  }

  moveEffect(x, y, theme) {
    this.boardRenderer.spawnParticles(x, y, [theme.colors.text], 8);
  }

  explosion(x, y, colors, count) {
    this.boardRenderer.spawnParticles(x, y, colors, count || 30);
  }
}
