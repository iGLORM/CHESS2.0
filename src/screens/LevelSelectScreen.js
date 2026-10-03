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
    // One card per band (title, score, five level tiles). Landscape shows all six
    // in two columns; portrait stacks them in one scrolling column.
    const L = { TOP: 150, GAP: 16, PAD: 20, HEADER_H: 48, TILE: 76, TILE_GAP: 12 };
    const portrait = Layout.isPortrait;
    const perRow = portrait ? 1 : 2;
    const areaX = portrait ? 40 : 60;
    const areaW = W - areaX * 2;
    const areaH = PixiPremiumScene.contentBottom - L.TOP;
    const rows = Math.ceil(TRAINING_BANDS.length / perRow);
    const cardW = Math.floor((areaW - L.GAP * (perRow - 1)) / perRow);
    const naturalH = L.HEADER_H + L.TILE + L.PAD * 2;
    const cardH = portrait ? naturalH : Math.max(naturalH, Math.floor((areaH - L.GAP * (rows - 1)) / rows));

    const scrollContent = new PIXI.Container();
    scrollContent.label = 'scrollContent';
    TRAINING_BANDS.forEach((band, bi) => {
      const x = (bi % perRow) * (cardW + L.GAP);
      const y = Math.floor(bi / perRow) * (cardH + L.GAP);
      const bandUnlocked = this._isBandUnlocked(band.id, progress);
      const card = new PIXI.Container();
      card.x = x;
      card.y = y;
      scrollContent.addChild(card);
      PixiPremiumScene.panel(card, 0, 0, cardW, cardH, { accent: false, alpha: bandUnlocked ? 0.7 : 0.45 });

      const headerY = L.PAD + L.HEADER_H / 2 - 6;
      const title = PixiPremiumScene.text(band.name, {
        fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 17,
        fill: bandUnlocked ? cols.text : PixiColorUtil.alpha(cols.text, '77'),
      });
      title.anchor.set(0, 0.5);
      title.x = L.PAD + 4;
      title.y = headerY;
      card.addChild(title);
      const score = PixiPremiumScene.text(`${this._getBandStars(band, progress)}/${band.levels.length * 3}`, {
        fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 16,
        fill: bandUnlocked ? cols.accent : PixiColorUtil.alpha(cols.text, '66'),
      });
      score.anchor.set(1, 0.5);
      score.x = cardW - L.PAD - 4;
      score.y = headerY;
      card.addChild(score);
      if (!bandUnlocked) {
        const hint = PixiPremiumScene.text(`${band.starsToUnlockNext || 10} stars in the previous set to unlock`, { fontSize: 13, fill: PixiColorUtil.alpha(cols.text, '77') });
        hint.anchor.set(1, 0.5);
        hint.x = score.x - score.width - 16;
        hint.y = headerY;
        if (hint.x - hint.width > title.x + title.width + 16) card.addChild(hint);
      }

      const tilesW = band.levels.length * L.TILE + (band.levels.length - 1) * L.TILE_GAP;
      const tileX = Math.round((cardW - tilesW) / 2);
      const tileY = L.PAD + L.HEADER_H + Math.round((cardH - L.PAD * 2 - L.HEADER_H - L.TILE) / 2);
      band.levels.forEach((levelId, li) => {
        const level = TRAINING_LEVELS.find(l => l.id === levelId);
        if (!level) return;
        const data = (progress.levels || {})[levelId] || {};
        const slot = this._createLevelSlot(tileX + li * (L.TILE + L.TILE_GAP), tileY, L.TILE, level,
          this._isLevelUnlocked(levelId, progress), data.solved || false, data.stars || 0, cols, 1);
        card.addChild(slot);
      });
    });
    const contentH = rows * cardH + (rows - 1) * L.GAP;

    const mask = new PIXI.Graphics().rect(0, L.TOP, W, areaH).fill({ color: 0xffffff });
    this.pixiContainer.addChild(mask);
    const scrollContainer = new PIXI.Container();
    scrollContainer.x = areaX;
    scrollContainer.y = L.TOP;
    scrollContainer.mask = mask;
    scrollContainer.addChild(scrollContent);
    this.pixiContainer.addChild(scrollContainer);

    this._scrollContent = scrollContent;
    this._scrollY = 0;
    this._maxScroll = Math.max(0, contentH - areaH);

    if (this._maxScroll > 0) {
      scrollContainer.eventMode = 'static';
      scrollContainer.hitArea = new PIXI.Rectangle(-areaX, 0, W, areaH);
      scrollContainer.on('wheel', (e) => {
        this._scrollY = Math.max(0, Math.min(this._maxScroll, this._scrollY + e.deltaY * 0.5));
        scrollContent.y = -this._scrollY;
      });
      let dragStart = null;
      let dragScrollStart = 0;
      scrollContainer.on('pointerdown', (e) => { dragStart = e.global.y; dragScrollStart = this._scrollY; });
      scrollContainer.on('pointermove', (e) => {
        if (dragStart === null) return;
        this._scrollY = Math.max(0, Math.min(this._maxScroll, dragScrollStart + dragStart - e.global.y));
        scrollContent.y = -this._scrollY;
      });
      scrollContainer.on('pointerup', () => { dragStart = null; });
      scrollContainer.on('pointerupoutside', () => { dragStart = null; });
    }

    PixiPremiumScene.button(this.pixiContainer, 36, PixiPremiumScene.bottomButtonY(), 160, 44, 'Back', () => switchScreen('trainingHub'), { icon: 'back' });
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
      bg.roundRect(0, 0, size, size, 8).stroke({ color: PixiColorUtil.hexToNum(cols.text), alpha: 0.18, width: 2 });
      container.addChild(bg);

      const lockSize = Math.round(size * 0.42);
      const lockIcon = new PIXI.Sprite(PixiPremiumAssets.icon('lock'));
      lockIcon.width = lockSize;
      lockIcon.height = lockSize;
      lockIcon.x = Math.round((size - lockSize) / 2);
      lockIcon.y = Math.round((size - lockSize) / 2);
      lockIcon.alpha = 0.55;
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
    if (SuperUser.active()) return true;
    if (bandId === 1) return true;
    const prevBand = TRAINING_BANDS.find(b => b.id === bandId - 1);
    if (!prevBand) return false;
    return this._getBandStars(prevBand, progress) >= (prevBand.starsToUnlockNext || 10);
  },

  _isLevelUnlocked(levelId, progress) {
    if (SuperUser.active()) return true;
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
