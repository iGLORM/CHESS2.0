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

    const s = Layout.W / 1280;

    if (Layout.isPortrait) {
      const panelW = Math.min(720, Layout.W - 80);
      const panelX = (Layout.W - panelW) / 2;
      const contentX = panelX + Math.round(40 * s);
      const sliderW = panelW - Math.round(100 * s);
      PixiPremiumScene.panel(this.pixiContainer, panelX, 140, panelW, Math.round(560 * s), { accentAlpha: 0.45 });
      this.section(contentX, 188, 'Dodge Sensitivity', 'Controls movement speed in falling-object and soul-dodge mini-games.', this.dodgeSensitivity, (value) => {
        this.dodgeSensitivity = value;
        this.saveSettings();
      }, sliderW, s);
      this.section(contentX, 188 + Math.round(182 * s), 'Shield Sensitivity', 'Controls how quickly Shield Block responds to pointer movement.', this.shieldSensitivity, (value) => {
        this.shieldSensitivity = value;
        this.saveSettings();
      }, sliderW, s);
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

  section(x, y, label, desc, value, onChange, sliderWidth, scale) {
    const cols = ThemeManager.getCurrentColors();
    const s = scale || 1;
    const sw = sliderWidth || 740;
    const title = PixiPremiumScene.text(label, { fontSize: Math.round(24 * s), fontWeight: '900', fill: cols.text });
    title.x = x;
    title.y = y;
    this.pixiContainer.addChild(title);
    const d = PixiPremiumScene.text(desc, { fontSize: Math.max(11, Math.round(16 * s)), fill: PixiPremiumScene.alpha(cols.text, '88') });
    d.x = x;
    d.y = y + Math.round(34 * s);
    PixiPremiumScene.fit(d, sw + 20);
    this.pixiContainer.addChild(d);
    const slider = new PixiSlider({
      width: sw,
      height: Math.round(20 * s),
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
    slider.y = y + Math.round(88 * s);
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
      const s = Layout.W / 1280;
      const btnW = Math.round(214 * s);
      const btnGap = Math.round(16 * s);
      const totalW = 3 * btnW + 2 * btnGap;
      const startX = (Layout.W - totalW) / 2;
      const btnY = 140 + Math.round(560 * s) + Math.round(20 * s);
      presets.forEach((preset, i) => {
        PixiPremiumScene.button(this.pixiContainer, startX + i * (btnW + btnGap), btnY, btnW, Math.round(48 * s), preset.label, () => {
          this.dodgeSensitivity = preset.dodge;
          this.shieldSensitivity = preset.shield;
          this.saveSettings();
          this.build();
        }, { primary: preset.dodge === this.dodgeSensitivity && preset.shield === this.shieldSensitivity, fontSize: Math.round(18 * s) });
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
