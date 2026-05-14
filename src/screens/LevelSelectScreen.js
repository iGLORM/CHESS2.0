const LevelSelectScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  _scrollContent: null,
  _scrollY: 0,
  _maxScroll: 0,

  init() {
    this.build();
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });

    const cols = ThemeManager.getCurrentColors();
    const W = PixiPremiumScene.W;
    const H = PixiPremiumScene.H;
    const s = Layout.uiScale || 1;

    this.pixiContainer = PixiPremiumScene.root('Level Select', 'Choose a puzzle to solve', {
      footerHint: 'Complete levels to unlock more',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const progress = store.get('trainingProgress');
    const contentY = 148;
    const levelSize = Math.round(64 * s);
    const levelGap = Math.round(10 * s);
    const bandGap = Math.round(24 * s);
    const contentW = Math.min(600, W - 80);
    const contentOffsetX = Math.floor((W - contentW) / 2);

    const scrollContent = new PIXI.Container();
    scrollContent.label = 'scrollContent';
    let cursorY = 0;

    for (const band of TRAINING_BANDS) {
      const bandStars = this._getBandStars(band, progress);
      const maxBandStars = band.levels.length * 3;
      const bandUnlocked = this._isBandUnlocked(band.id, progress);

      // Band header card
      const headerH = Math.round(42 * s);
      const headerBg = new PIXI.Graphics();
      headerBg.roundRect(0, cursorY, contentW, headerH, 8).fill({
        color: PixiColorUtil.hexToNum(cols.panel), alpha: 0.4,
      });
      if (bandUnlocked) {
        headerBg.roundRect(6, cursorY + 4, Math.max(20, contentW - 12), 3, 2).fill({
          color: PixiColorUtil.hexToNum(cols.accent), alpha: 0.5,
        });
      }
      scrollContent.addChild(headerBg);

      const bandTitle = PixiPremiumScene.text(band.name, {
        fontFamily: PixiTextStyles.FONT_TITLE,
        fontSize: Math.round(16 * s),
        fill: bandUnlocked ? cols.text : PixiColorUtil.alpha(cols.text, '55'),
      });
      bandTitle.x = 12;
      bandTitle.y = cursorY + 12;
      scrollContent.addChild(bandTitle);

      const bandScore = PixiPremiumScene.text(`${bandStars}/${maxBandStars}`, {
        fontFamily: PixiTextStyles.FONT_TITLE,
        fontSize: Math.round(15 * s),
        fill: bandUnlocked ? cols.accent : PixiColorUtil.alpha(cols.text, '44'),
      });
      bandScore.anchor.set(1, 0);
      bandScore.x = contentW - 12;
      bandScore.y = cursorY + 12;
      scrollContent.addChild(bandScore);

      cursorY += headerH + Math.round(12 * s);

      // Level slots — centered row
      const slotsPerRow = band.levels.length;
      const totalSlotsW = slotsPerRow * levelSize + (slotsPerRow - 1) * levelGap;
      const slotsStartX = Math.floor((contentW - totalSlotsW) / 2);

      for (let li = 0; li < band.levels.length; li++) {
        const levelId = band.levels[li];
        const level = TRAINING_LEVELS.find(l => l.id === levelId);
        if (!level) continue;

        const levelData = (progress.levels || {})[levelId] || {};
        const solved = levelData.solved || false;
        const stars = levelData.stars || 0;
        const unlocked = this._isLevelUnlocked(levelId, progress);

        const lx = slotsStartX + li * (levelSize + levelGap);
        const slot = this._createLevelSlot(lx, cursorY, levelSize, level, unlocked, solved, stars, cols, s);
        scrollContent.addChild(slot);
      }

      cursorY += levelSize + bandGap;
    }

    // Scrollable area
    const contentH = H - contentY - 80;
    scrollContent.x = contentOffsetX;

    const mask = new PIXI.Graphics();
    mask.rect(0, contentY, W, contentH).fill({ color: 0xffffff });
    this.pixiContainer.addChild(mask);

    const scrollContainer = new PIXI.Container();
    scrollContainer.y = contentY;
    scrollContainer.mask = mask;
    scrollContainer.addChild(scrollContent);
    this.pixiContainer.addChild(scrollContainer);

    this._scrollContent = scrollContent;
    this._scrollY = 0;
    this._maxScroll = Math.max(0, cursorY - contentH + 20);

    scrollContainer.eventMode = 'static';
    scrollContainer.hitArea = new PIXI.Rectangle(0, 0, W, contentH);
    scrollContainer.on('wheel', (e) => {
      this._scrollY = Math.max(0, Math.min(this._maxScroll, this._scrollY + e.deltaY * 0.5));
      scrollContent.y = -this._scrollY;
    });

    let dragStart = null;
    let dragScrollStart = 0;
    scrollContainer.on('pointerdown', (e) => {
      dragStart = e.global.y;
      dragScrollStart = this._scrollY;
    });
    scrollContainer.on('pointermove', (e) => {
      if (dragStart !== null) {
        const dy = dragStart - e.global.y;
        this._scrollY = Math.max(0, Math.min(this._maxScroll, dragScrollStart + dy));
        scrollContent.y = -this._scrollY;
      }
    });
    scrollContainer.on('pointerup', () => { dragStart = null; });
    scrollContainer.on('pointerupoutside', () => { dragStart = null; });

    // Back button
    PixiPremiumScene.button(this.pixiContainer, 36, H - 72, 140, 44, 'Back', () => {
      if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
      switchScreen('trainingHub');
    }, { fontSize: Math.round(16 * s) });
  },

  _createLevelSlot(x, y, size, level, unlocked, solved, stars, cols, s) {
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;

    const accentNum = PixiColorUtil.hexToNum(cols.accent);
    const panelNum = PixiColorUtil.hexToNum(cols.panel);

    if (!unlocked) {
      const bg = new PIXI.Graphics();
      bg.roundRect(0, 0, size, size, 8).fill({ color: panelNum, alpha: 0.25 });
      bg.roundRect(0, 0, size, size, 8).stroke({ color: PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '22')), width: 1 });
      container.addChild(bg);

      const lockIcon = PixiPremiumScene.text('?', {
        fontFamily: PixiTextStyles.FONT_TITLE,
        fontSize: Math.round(22 * s),
        fill: PixiColorUtil.alpha(cols.text, '33'),
      });
      lockIcon.anchor.set(0.5);
      lockIcon.x = size / 2;
      lockIcon.y = size / 2;
      container.addChild(lockIcon);
    } else {
      const borderColor = solved ? accentNum : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '55'));
      const bg = new PIXI.Graphics();
      // Shadow
      bg.roundRect(2, 3, size, size, 8).fill({ color: 0x000000, alpha: 0.2 });
      // Face
      bg.roundRect(0, 0, size, size, 8).fill({ color: panelNum, alpha: solved ? 0.85 : 0.55 });
      bg.roundRect(0, 0, size, size, 8).stroke({ color: borderColor, alpha: solved ? 0.9 : 0.4, width: 2 });
      if (solved) {
        bg.roundRect(6, 4, size - 12, 3, 2).fill({ color: accentNum, alpha: 0.6 });
      }
      container.addChild(bg);

      // Level number
      const numText = PixiPremiumScene.text(String(level.id), {
        fontFamily: PixiTextStyles.FONT_TITLE,
        fontSize: Math.round(20 * s),
        fill: solved ? cols.accent : cols.text,
      });
      numText.anchor.set(0.5);
      numText.x = size / 2;
      numText.y = size * 0.34;
      container.addChild(numText);

      // Stars row
      const starSize = Math.round(12 * s);
      const starGap = Math.round(4 * s);
      const totalStarW = 3 * starSize + 2 * starGap;
      let starX = (size - totalStarW) / 2;
      const starY = size * 0.64;
      for (let i = 0; i < 3; i++) {
        const star = new PIXI.Graphics();
        const filled = i < stars;
        star.star(starX + starSize / 2, starY + starSize / 2, 5, starSize / 2, starSize / 4).fill({
          color: filled ? accentNum : PixiColorUtil.hexToNum(PixiColorUtil.alpha(cols.text, '33')),
          alpha: filled ? 1 : 0.4,
        });
        container.addChild(star);
        starX += starSize + starGap;
      }

      // Interactivity
      container.eventMode = 'static';
      container.cursor = 'pointer';
      container.hitArea = new PIXI.Rectangle(0, 0, size, size);

      container.on('pointerover', () => {
        bg.clear();
        bg.roundRect(2, 3, size, size, 8).fill({ color: 0x000000, alpha: 0.2 });
        bg.roundRect(0, 0, size, size, 8).fill({ color: PixiColorUtil.hexToNum(PixiColorUtil.lighten(cols.panel, 15)), alpha: 0.85 });
        bg.roundRect(0, 0, size, size, 8).stroke({ color: accentNum, alpha: 0.9, width: 3 });
      });
      container.on('pointerout', () => {
        bg.clear();
        bg.roundRect(2, 3, size, size, 8).fill({ color: 0x000000, alpha: 0.2 });
        bg.roundRect(0, 0, size, size, 8).fill({ color: panelNum, alpha: solved ? 0.85 : 0.55 });
        bg.roundRect(0, 0, size, size, 8).stroke({ color: borderColor, alpha: solved ? 0.9 : 0.4, width: 2 });
        if (solved) bg.roundRect(6, 4, size - 12, 3, 2).fill({ color: accentNum, alpha: 0.6 });
      });
      container.on('pointerdown', () => {
        if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
        switchScreen('puzzle', { levelId: level.id, source: 'curriculum' });
      });
    }

    return container;
  },

  _isBandUnlocked(bandId, progress) {
    if (bandId === 1) return true;
    const prevBand = TRAINING_BANDS.find(b => b.id === bandId - 1);
    if (!prevBand) return false;
    return this._getBandStars(prevBand, progress) >= (prevBand.starsToUnlockNext || 10);
  },

  _isLevelUnlocked(levelId, progress) {
    if (levelId === 1) return true;
    const level = TRAINING_LEVELS.find(l => l.id === levelId);
    if (!level) return false;
    if (!this._isBandUnlocked(level.band, progress)) return false;
    const prevLevel = TRAINING_LEVELS.find(l => l.id === levelId - 1);
    if (prevLevel && prevLevel.band === level.band) {
      const prevData = (progress.levels || {})[prevLevel.id];
      return prevData && prevData.solved;
    }
    return true;
  },

  _getBandStars(band, progress) {
    let total = 0;
    for (const levelId of band.levels) {
      const data = (progress.levels || {})[levelId];
      if (data) total += (data.stars || 0);
    }
    return total;
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  destroy() {
    this._scrollContent = null;
    PixiPremiumScene.destroy(this);
  },

  handleKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      switchScreen('trainingHub');
    }
  },
};
