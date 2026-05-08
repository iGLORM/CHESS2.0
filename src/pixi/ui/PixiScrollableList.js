class PixiScrollableList extends PIXI.Container {
  constructor(config) {
    super();
    this.config = Object.assign({
      width: 400,
      height: 300,
    }, config);

    this._content = new PIXI.Container();
    this._mask = new PIXI.Graphics();
    this._scrollbar = new PIXI.Graphics();
    this._scrollOffset = 0;
    this._maxScroll = 0;

    this._mask.rect(0, 0, this.config.width, this.config.height).fill(0xffffff);

    this.addChild(this._mask);
    this.addChild(this._content);
    this.addChild(this._scrollbar);
    this._content.mask = this._mask;

    this.eventMode = 'static';
    this.hitArea = new PIXI.Rectangle(0, 0, this.config.width, this.config.height);

    this.on('wheel', (e) => {
      this.scrollBy(e.deltaY > 0 ? 40 : -40);
    });

    this._dragging = false;
    this._dragStartY = 0;
    this._dragStartScroll = 0;
    this.on('pointerdown', (e) => {
      this._dragging = true;
      this._dragStartY = e.global.y;
      this._dragStartScroll = this._scrollOffset;
    });
    this.on('globalpointermove', (e) => {
      if (!this._dragging) return;
      const dy = e.global.y - this._dragStartY;
      if (Math.abs(dy) > 5) {
        this.setScrollOffset(this._dragStartScroll - dy);
      }
    });
    this.on('pointerup', () => { this._dragging = false; });
    this.on('pointerupoutside', () => { this._dragging = false; });
  }

  get content() {
    return this._content;
  }

  addItem(container) {
    this._content.addChild(container);
    this._updateMaxScroll();
    this._drawScrollbar();
  }

  removeAllItems() {
    this._content.removeChildren();
    this._scrollOffset = 0;
    this._content.y = 0;
    this._updateMaxScroll();
    this._drawScrollbar();
  }

  scrollBy(delta) {
    this.setScrollOffset(this._scrollOffset + delta);
  }

  setScrollOffset(y) {
    this._scrollOffset = Math.max(0, Math.min(this._maxScroll, y));
    this._content.y = -this._scrollOffset;
    this._drawScrollbar();
  }

  resize(w, h) {
    this.config.width = w;
    this.config.height = h;
    this._mask.clear();
    this._mask.rect(0, 0, w, h).fill(0xffffff);
    this.hitArea = new PIXI.Rectangle(0, 0, w, h);
    this._updateMaxScroll();
    this._drawScrollbar();
  }

  _updateMaxScroll() {
    const contentH = this._content.height || 0;
    this._maxScroll = Math.max(0, contentH - this.config.height);
  }

  _drawScrollbar() {
    const g = this._scrollbar;
    g.clear();
    if (this._maxScroll <= 0) return;

    const barX = this.config.width - 4;
    const barH = this.config.height;
    const thumbH = Math.max(20, (this.config.height / (this._maxScroll + this.config.height)) * barH);
    const thumbY = (this._scrollOffset / this._maxScroll) * (barH - thumbH);

    // Track
    g.rect(barX, 0, 4, barH).fill({ color: 0x000000, alpha: 0.2 });

    // Thumb
    g.rect(barX, thumbY, 4, thumbH).fill({ color: 0xffffff, alpha: 0.3 });
  }
}
