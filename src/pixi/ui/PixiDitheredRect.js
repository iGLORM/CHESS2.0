class PixiDitheredRect extends PIXI.Container {
  constructor(config) {
    super();
    this.config = Object.assign({
      width: 100,
      height: 3,
      color: '#ffffff',
      alpha: 0.2,
    }, config);

    this._sprite = null;
    this._draw();
  }

  setColor(color, alpha) {
    this.config.color = color;
    if (alpha !== undefined) this.config.alpha = alpha;
    this._draw();
  }

  resize(w, h) {
    this.config.width = w;
    this.config.height = h;
    if (this._sprite) {
      this._sprite.width = w;
      this._sprite.height = h;
    }
  }

  _draw() {
    if (this._sprite) {
      this.removeChild(this._sprite);
      this._sprite.destroy(true);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.config.color;
    ctx.globalAlpha = this.config.alpha;
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillRect(1, 1, 1, 1);

    const texture = PIXI.Texture.from({ resource: canvas, scaleMode: 'nearest' });
    this._sprite = new PIXI.TilingSprite({ texture, width: this.config.width, height: this.config.height });
    this.addChild(this._sprite);
  }
}
