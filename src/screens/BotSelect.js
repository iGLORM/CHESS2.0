const BotSelect = {
  isPixiScreen: true,
  pixiContainer: null,
  eloValue: 1000,

  init() {
    // Convert stored classic difficulty (1-10) to Elo, or use stored Elo
    const stored = store.get('classicElo');
    if (stored) {
      this.eloValue = stored;
    } else {
      const diff = store.get('classicDifficulty') || 5;
      this.eloValue = 200 + (diff - 1) * 200; // 200, 400, ..., 2000
    }
    this.playAs = store.get('p1IsWhite') === false ? 'black' : 'white';
    this.build();
  },

  destroy() {
    PixiPremiumScene.destroy(this);
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
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

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Classic Chess', 'Standard rules against the computer', {
      footerHint: 'Drag the slider or use the arrow keys  |  Enter to start',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const cols = ThemeManager.getCurrentColors();
    const portrait = Layout.isPortrait;
    const cx = Layout.cx;
    const panelW = portrait ? 700 : 760;
    const panelX = Math.round(cx - panelW / 2);
    const panelY = portrait ? 190 : 168;
    const panelH = 300;
    PixiPremiumScene.panel(this.pixiContainer, panelX, panelY, panelW, panelH, { accentAlpha: 0.5 });

    const centered = (text, y, style) => {
      const t = PixiPremiumScene.text(text, style);
      t.anchor.set(0.5, 0);
      t.x = cx;
      t.y = y;
      this.pixiContainer.addChild(t);
      return t;
    };

    const elo = centered(String(this.eloValue), panelY + 34, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 56, fontWeight: 'bold', fill: cols.accent });
    centered('ELO', panelY + 100, { fontSize: 16, fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, '88') });
    const name = centered(this.eloToName(this.eloValue), panelY + 128, { fontSize: 28, fontWeight: '800', fill: cols.text });
    const desc = centered(this.eloToDescription(this.eloValue), panelY + 166, { fontSize: 20, fill: PixiPremiumScene.alpha(cols.text, 'aa') });

    const sliderW = panelW - 120;
    const slider = new PixiSlider({
      width: sliderW,
      height: 18,
      min: 200,
      max: 2000,
      step: 50,
      value: this.eloValue,
      cols,
      gradientStops: [
        { pos: 0, color: '#7dea99' },
        { pos: 0.45, color: cols.accent },
        { pos: 1, color: '#ff6578' },
      ],
      showTicks: true,
      tickInterval: 300,
    });
    slider.x = Math.round(cx - sliderW / 2);
    slider.y = panelY + 222;
    slider.onChange((value) => {
      this.eloValue = value;
      elo.text = String(value);
      name.text = this.eloToName(value);
      desc.text = this.eloToDescription(value);
    });
    this.pixiContainer.addChild(slider);
    this._slider = slider;

    const sideY = panelY + panelH + 34;
    centered('Play as', sideY, { fontSize: 20, fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, 'aa') });
    const sideBtnW = 150;
    ['white', 'black'].forEach((color, i) => {
      const x = i === 0 ? cx - sideBtnW - 10 : cx + 10;
      PixiPremiumScene.button(this.pixiContainer, x, sideY + 36, sideBtnW, 48, color === 'white' ? 'White' : 'Black', () => {
        this.playAs = color;
        this.build();
      }, { primary: this.playAs === color, fontSize: 18 });
    });

    const btnY = Layout.H - 82;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen('home'), { icon: 'back' });
    PixiPremiumScene.button(this.pixiContainer, Layout.W - 260, btnY - 8, 220, 58, 'Start Game', () => this.startGame(), { primary: true, icon: 'play', fontSize: 22 });
  },

  startGame() {
    store.set('classicElo', this.eloValue);
    store.set('classicDifficulty', this.eloToDifficulty(this.eloValue));
    store.set('p1IsWhite', this.playAs !== 'black');
    store.set('mode', 'classic');
    store.set('miniGamesEnabled', false);
    store.saveProgress();
    switchScreen('game');
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      switchScreen('home');
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const next = e.key === 'ArrowLeft' ? this.eloValue - 50 : this.eloValue + 50;
      this._slider.setValue(Math.max(200, Math.min(2000, next)));
    }
    if (e.key === 'Enter' || e.key === ' ') this.startGame();
  },
};
