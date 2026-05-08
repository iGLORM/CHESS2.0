const PixiApp = {
  app: null,
  stage: null,
  initialized: false,
  _initPromise: null,

  init() {
    if (this.initialized) return Promise.resolve();
    if (this._initPromise) return this._initPromise;

    const canvas = document.getElementById('pixiCanvas');

    this.app = new PIXI.Application();
    this._initPromise = this.app.init({
      canvas: canvas,
      width: 1280,
      height: 800,
      backgroundAlpha: 0,
      antialias: false,
      resolution: 1,
      preference: 'webgl',
    }).then(() => {
      PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';
      this.stage = this.app.stage;
      this.initialized = true;
    });

    return this._initPromise;
  },

  resize() {
    if (!this.app) return;
    this.app.renderer.resize(1280, 800);
  },

  clearStage() {
    if (this.stage) {
      this.stage.removeChildren();
    }
  },

  destroy() {
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true, textureSource: true });
      this.app = null;
      this.stage = null;
      this.initialized = false;
      this._initPromise = null;
    }
  },
};
