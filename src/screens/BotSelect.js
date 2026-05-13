const BotSelect = {
  isPixiScreen: true,
  pixiContainer: null,
  eloValue: 1000,
  _eloText: null,
  _nameText: null,
  _descText: null,
  _depthText: null,
  _slider: null,

  init() {
    const stored = store.get('classicElo');
    if (stored) {
      this.eloValue = stored;
    } else {
      const diff = store.get('classicDifficulty') || 5;
      this.eloValue = 200 + (diff - 1) * 200;
    }
    this.build();
  },

  destroy() {
    PixiPremiumScene.destroy(this);
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Select Opponent', 'Choose your AI opponent strength', {
      footerHint: 'Drag slider or use arrow keys. Click to start.'
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    this.buildContent();

    const btnY = Layout.isPortrait ? Layout.H - Layout.SAFE_BOTTOM - 48 : 718;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => {
      if (typeof audioManager !== 'undefined' && audioManager.playButton) audioManager.playButton();
      switchScreen('home');
    }, { icon: 'back' });

    const startW = Layout.isPortrait ? 300 : 200;
    PixiPremiumScene.button(this.pixiContainer, Layout.W - startW - 36, btnY, startW, 44, 'Start Game', () => {
      if (typeof audioManager !== 'undefined' && audioManager.playButton) audioManager.playButton();
      store.set('classicElo', this.eloValue);
      store.set('classicDifficulty', this.eloToDifficulty(this.eloValue));
      store.set('mode', 'classic');
      store.set('miniGamesEnabled', false);
      switchScreen('game');
    }, { icon: 'play', primary: true });
  },

  buildContent() {
    const cols = ThemeManager.getCurrentColors();
    const portrait = Layout.isPortrait;
    const cx = Layout.cx;

    const panelW = portrait ? 700 : 800;
    const panelX = (Layout.W - panelW) / 2;
    PixiPremiumScene.panel(this.pixiContainer, panelX, 130, panelW, portrait ? 500 : 440, { accentAlpha: 0.45 });

    this._eloText = PixiPremiumScene.text(String(this.eloValue), {
      fontFamily: '"Pixelify Sans"', fontSize: 64, fontWeight: '900', fill: cols.accent
    });
    this._eloText.anchor.set(0.5, 0);
    this._eloText.x = cx;
    this._eloText.y = 160;
    this.pixiContainer.addChild(this._eloText);

    const eloLabel = PixiPremiumScene.text('ELO', { fontSize: 16, fill: PixiPremiumScene.alpha(cols.text, '88') });
    eloLabel.anchor.set(0.5, 0);
    eloLabel.x = cx;
    eloLabel.y = 228;
    this.pixiContainer.addChild(eloLabel);

    this._nameText = PixiPremiumScene.text(this.eloToName(this.eloValue), {
      fontFamily: '"Pixelify Sans"', fontSize: 22, fontWeight: '900', fill: cols.accent
    });
    this._nameText.anchor.set(0.5, 0);
    this._nameText.x = cx;
    this._nameText.y = 258;
    this.pixiContainer.addChild(this._nameText);

    this._descText = PixiPremiumScene.text(this.eloToDescription(this.eloValue), {
      fontSize: 14, fill: PixiPremiumScene.alpha(cols.text, '88')
    });
    this._descText.anchor.set(0.5, 0);
    this._descText.x = cx;
    this._descText.y = 290;
    this.pixiContainer.addChild(this._descText);

    const sliderW = portrait ? 600 : 680;
    const slider = new PixiSlider({
      width: sliderW, height: 18, min: 200, max: 2000, step: 50,
      value: this.eloValue, cols, label: '', unit: '',
      gradientStops: [
        { pos: 0, color: '#44dd44' },
        { pos: 0.4, color: '#ddaa22' },
        { pos: 0.7, color: '#dd6622' },
        { pos: 1, color: '#dd2222' },
      ],
      showTicks: true,
      tickInterval: 200,
    });
    slider.x = (Layout.W - sliderW) / 2;
    slider.y = 340;
    this._slider = slider;

    const diff = this.eloToDifficulty(this.eloValue);
    const config = typeof AIController !== 'undefined' ? AIController.LEVEL_CONFIG?.[diff] : null;
    this._depthText = PixiPremiumScene.text(
      config ? 'Depth: ' + config.depth + '  |  AI Level: ' + diff : '',
      { fontSize: 12, fill: PixiPremiumScene.alpha(cols.text, '66') }
    );
    this._depthText.anchor.set(0.5, 0);
    this._depthText.x = cx;
    this._depthText.y = 390;
    this.pixiContainer.addChild(this._depthText);

    slider.onChange((v) => {
      this.eloValue = v;
      this._eloText.text = String(v);
      this._nameText.text = this.eloToName(v);
      this._descText.text = this.eloToDescription(v);
      const d = this.eloToDifficulty(v);
      const c = typeof AIController !== 'undefined' ? AIController.LEVEL_CONFIG?.[d] : null;
      if (this._depthText && c) this._depthText.text = 'Depth: ' + c.depth + '  |  AI Level: ' + d;
    });
    this.pixiContainer.addChild(slider);

    const sideY = portrait ? 430 : 430;
    const sideLabel = PixiPremiumScene.text('Play as:', { fontSize: 14, fill: PixiPremiumScene.alpha(cols.text, '88') });
    sideLabel.anchor.set(0.5, 0);
    sideLabel.x = cx;
    sideLabel.y = sideY;
    this.pixiContainer.addChild(sideLabel);

    const p1IsWhite = store.get('p1IsWhite') !== false;
    const btnW = 160;
    const btnGap = 20;
    PixiPremiumScene.button(this.pixiContainer, cx - btnW - btnGap / 2, sideY + 24, btnW, 40, 'White', () => {
      if (typeof audioManager !== 'undefined' && audioManager.playButton) audioManager.playButton();
      store.set('p1IsWhite', true);
      this.build();
    }, { primary: p1IsWhite });
    PixiPremiumScene.button(this.pixiContainer, cx + btnGap / 2, sideY + 24, btnW, 40, 'Black', () => {
      if (typeof audioManager !== 'undefined' && audioManager.playButton) audioManager.playButton();
      store.set('p1IsWhite', false);
      this.build();
    }, { primary: !p1IsWhite });
  },

  eloToDifficulty(elo) {
    return Math.max(1, Math.min(10, Math.round((elo - 200) / 200) + 1));
  },

  eloToName(elo) {
    if (elo <= 400) return 'Beginner';
    if (elo <= 600) return 'Novice';
    if (elo <= 800) return 'Casual';
    if (elo <= 1000) return 'Intermediate';
    if (elo <= 1200) return 'Skilled';
    if (elo <= 1400) return 'Advanced';
    if (elo <= 1600) return 'Expert';
    if (elo <= 1800) return 'Master';
    if (elo <= 1900) return 'Grandmaster';
    return 'Chess 2.0';
  },

  eloToDescription(elo) {
    if (elo <= 400) return 'Random moves. Learn the rules.';
    if (elo <= 600) return 'Basic tactics, occasional good moves.';
    if (elo <= 800) return 'Thinks 1-2 moves ahead.';
    if (elo <= 1000) return 'Two moves ahead. Spot simple traps.';
    if (elo <= 1200) return 'Three moves ahead. Solid play.';
    if (elo <= 1400) return 'Three moves deep. Very accurate.';
    if (elo <= 1600) return 'Four moves deep. Expert-level.';
    if (elo <= 1800) return 'Four moves deep, near perfect.';
    if (elo <= 1900) return 'Five moves deep. Grandmaster.';
    return 'Full strength. The ultimate challenge.';
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      switchScreen('home');
      return;
    }
    if (e.key === 'ArrowLeft') {
      this.eloValue = Math.max(200, this.eloValue - 50);
      if (this._slider) this._slider.setValue(this.eloValue);
    }
    if (e.key === 'ArrowRight') {
      this.eloValue = Math.min(2000, this.eloValue + 50);
      if (this._slider) this._slider.setValue(this.eloValue);
    }
    if (e.key === 'Enter' || e.key === ' ') {
      store.set('classicElo', this.eloValue);
      store.set('classicDifficulty', this.eloToDifficulty(this.eloValue));
      store.set('mode', 'classic');
      store.set('miniGamesEnabled', false);
      switchScreen('game');
    }
  },
};
