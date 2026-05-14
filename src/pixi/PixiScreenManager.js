const PixiScreenManager = {
  screenContainer: null,
  transitionOverlay: null,
  initialized: false,

  init() {
    if (this.initialized) return;
    if (!PixiApp.initialized) PixiApp.init();

    this.screenContainer = new PIXI.Container();
    PixiApp.stage.addChild(this.screenContainer);

    this.transitionOverlay = new PIXI.Graphics();
    this._drawTransitionOverlay();
    this.transitionOverlay.zIndex = 9000;
    PixiApp.stage.addChild(this.transitionOverlay);
    PixiApp.stage.sortableChildren = true;

    this.initialized = true;
  },

  _drawTransitionOverlay() {
    if (!this.transitionOverlay) return;
    this.transitionOverlay.clear();
    this.transitionOverlay.rect(0, 0, Layout.W, Layout.H).fill(0x000000);
    this.transitionOverlay.alpha = 0;
  },

  onLayoutChange() {
    this._drawTransitionOverlay();
  },

  _ensureOnStage() {
    if (!PixiApp.stage || !this.screenContainer || !this.transitionOverlay) return;
    if (!this.screenContainer.parent) {
      PixiApp.stage.addChild(this.screenContainer);
    }
    if (!this.transitionOverlay.parent) {
      PixiApp.stage.addChild(this.transitionOverlay);
    }
    PixiApp.stage.sortableChildren = true;
  },

  setScreenContainer(container) {
    this._ensureOnStage();
    this.screenContainer.removeChildren();
    if (container) {
      this.screenContainer.addChild(container);
    }
  },

  fadeOut(duration, onComplete) {
    if (!this.transitionOverlay) {
      if (onComplete) onComplete();
      return;
    }
    gsap.to(this.transitionOverlay, {
      alpha: 1,
      duration: duration || 0.25,
      ease: 'power2.in',
      onComplete: onComplete,
    });
  },

  fadeIn(duration, onComplete) {
    if (!this.transitionOverlay) {
      if (onComplete) onComplete();
      return;
    }
    gsap.to(this.transitionOverlay, {
      alpha: 0,
      duration: duration || 0.25,
      ease: 'power2.out',
      onComplete: onComplete,
    });
  },

  showOverlay(container) {
    container.zIndex = 8000;
    PixiApp.stage.addChild(container);
  },

  removeOverlay(container) {
    if (container && container.parent) {
      container.parent.removeChild(container);
    }
  },
};
