const ControlsScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  dodgeSensitivity: 1,
  shieldSensitivity: 1,

  init() {
    const settings = store.get('settings') || {};
    this.dodgeSensitivity = settings.miniGameSensitivity != null ? settings.miniGameSensitivity : 1;
    this.shieldSensitivity = settings.shieldSensitivity != null ? settings.shieldSensitivity : 1;
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
    this.pixiContainer = PixiPremiumScene.root('Controls', 'Mini-game sensitivity and input feel', { footerHint: 'Changes save immediately' });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    if (Layout.isPortrait) {
      const panelW = 720;
      const panelX = (Layout.W - panelW) / 2;
      const contentX = panelX + 40;
      PixiPremiumScene.panel(this.pixiContainer, panelX, 140, panelW, 560, { accentAlpha: 0.45 });
      this.section(contentX, 188, 'Dodge Sensitivity', 'Controls movement speed in falling-object and soul-dodge mini-games.', this.dodgeSensitivity, (value) => {
        this.dodgeSensitivity = value;
        this.saveSettings();
      }, 620);
      this.section(contentX, 370, 'Shield Sensitivity', 'Controls how quickly Shield Block responds to pointer movement.', this.shieldSensitivity, (value) => {
        this.shieldSensitivity = value;
        this.saveSettings();
      }, 620);
      this.presets();
    } else {
      PixiPremiumScene.panel(this.pixiContainer, 150, 140, 980, 500, { accentAlpha: 0.45 });
      this.section(204, 188, 'Dodge Sensitivity', 'Controls movement speed in falling-object and soul-dodge mini-games.', this.dodgeSensitivity, (value) => {
        this.dodgeSensitivity = value;
        this.saveSettings();
      });
      this.section(204, 346, 'Shield Sensitivity', 'Controls how quickly Shield Block responds to pointer movement.', this.shieldSensitivity, (value) => {
        this.shieldSensitivity = value;
        this.saveSettings();
      });
      this.presets();
    }

    const btnY = Layout.isPortrait ? Layout.H - Layout.SAFE_BOTTOM - 48 : 718;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen('settings'), { icon: 'back' });
  },

  section(x, y, label, desc, value, onChange, sliderWidth) {
    const cols = ThemeManager.getCurrentColors();
    const sw = sliderWidth || 740;
    const title = PixiPremiumScene.text(label, { fontSize: 24, fontWeight: '900', fill: cols.text });
    title.x = x;
    title.y = y;
    this.pixiContainer.addChild(title);
    const d = PixiPremiumScene.text(desc, { fontSize: 16, fill: PixiPremiumScene.alpha(cols.text, '88') });
    d.x = x;
    d.y = y + 34;
    PixiPremiumScene.fit(d, sw + 20);
    this.pixiContainer.addChild(d);
    const slider = new PixiSlider({
      width: sw,
      height: 20,
      min: 0.5,
      max: 2,
      step: 0.1,
      value,
      cols,
      label: '',
      unit: 'x',
      gradientStops: [
        { pos: 0, color: '#6aa7ff' },
        { pos: 0.5, color: cols.accent },
        { pos: 1, color: '#ff6678' },
      ],
      showTicks: true,
      tickInterval: 0.5,
    });
    slider.x = x;
    slider.y = y + 88;
    slider.onChange(onChange);
    this.pixiContainer.addChild(slider);
  },

  presets() {
    const presets = [
      { label: 'Slow & Precise', dodge: 0.7, shield: 0.7 },
      { label: 'Default', dodge: 1, shield: 1 },
      { label: 'Fast & Responsive', dodge: 1.5, shield: 1.5 },
    ];
    if (Layout.isPortrait) {
      const btnW = 214;
      const btnGap = 16;
      const totalW = 3 * btnW + 2 * btnGap;
      const startX = (Layout.W - totalW) / 2;
      presets.forEach((preset, i) => {
        PixiPremiumScene.button(this.pixiContainer, startX + i * (btnW + btnGap), 580, btnW, 48, preset.label, () => {
          this.dodgeSensitivity = preset.dodge;
          this.shieldSensitivity = preset.shield;
          this.saveSettings();
          this.build();
        }, { primary: preset.dodge === this.dodgeSensitivity && preset.shield === this.shieldSensitivity });
      });
    } else {
      presets.forEach((preset, i) => {
        PixiPremiumScene.button(this.pixiContainer, 248 + i * 252, 538, 214, 48, preset.label, () => {
          this.dodgeSensitivity = preset.dodge;
          this.shieldSensitivity = preset.shield;
          this.saveSettings();
          this.build();
        }, { primary: preset.dodge === this.dodgeSensitivity && preset.shield === this.shieldSensitivity });
      });
    }
  },

  saveSettings() {
    const settings = { ...store.get('settings') };
    settings.miniGameSensitivity = Math.round(this.dodgeSensitivity * 10) / 10;
    settings.shieldSensitivity = Math.round(this.shieldSensitivity * 10) / 10;
    store.set('settings', settings);
    store.saveProgress();
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') switchScreen('settings');
  },
};
