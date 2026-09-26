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

  LAYOUT: { W: 900, PAD: 48, SECTION1_Y: 44, SECTION2_Y: 184, RULE_Y: 316, PRESET_Y: 340 },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Controls', 'Mini-game sensitivity and input feel', { footerHint: 'Changes save immediately' });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const s = Layout.W / 1280;

    {
      const L = this.LAYOUT;
      const panelW = Math.min(L.W, Layout.W - 80);
      const panelX = Math.round((Layout.W - panelW) / 2);
      const inX = panelX + L.PAD;
      const inW = panelW - L.PAD * 2;
      const panelH = L.PRESET_Y + 48 + L.PAD;
      const panelY = Math.round(150 + (PixiPremiumScene.contentBottom - 150 - panelH) / 2);
      PixiPremiumScene.panel(this.pixiContainer, panelX, panelY, panelW, panelH, { accentAlpha: 0.45 });
      this.section(inX, panelY + L.SECTION1_Y, 'Dodge Sensitivity', 'Movement speed in the falling-object and soul-dodge mini-games.', this.dodgeSensitivity, (value) => {
        this.dodgeSensitivity = value;
        this.saveSettings();
      }, inW);
      this.section(inX, panelY + L.SECTION2_Y, 'Shield Sensitivity', 'How quickly Shield Block follows your pointer.', this.shieldSensitivity, (value) => {
        this.shieldSensitivity = value;
        this.saveSettings();
      }, inW);
      const cols = ThemeManager.getCurrentColors();
      this.pixiContainer.addChild(new PIXI.Graphics().rect(inX, panelY + L.RULE_Y, inW, 2).fill({ color: PixiPremiumScene.color(cols.text), alpha: 0.1 }));
      this.presets(inX, panelY + L.PRESET_Y, inW);
    }
    const btnY = PixiPremiumScene.bottomButtonY();
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen('settings'), { icon: 'back' });
  },

  // Title with the current value on the right, a description, then the slider.
  section(x, y, label, desc, value, onChange, sliderWidth, scale) {
    const cols = ThemeManager.getCurrentColors();
    const s = scale || 1;
    const sw = sliderWidth || 740;
    const title = PixiPremiumScene.text(label, { fontSize: Math.round(24 * s), fontWeight: '900', fill: cols.text });
    title.x = x;
    title.y = y;
    this.pixiContainer.addChild(title);
    const fmt = (v) => `${v.toFixed(1)}x`;
    const val = PixiPremiumScene.text(fmt(value), { fontSize: Math.round(24 * s), fontWeight: '900', fill: cols.accent });
    val.anchor.set(1, 0);
    val.x = x + sw;
    val.y = y;
    this.pixiContainer.addChild(val);
    const d = PixiPremiumScene.text(desc, { fontSize: Math.max(11, Math.round(16 * s)), fill: PixiPremiumScene.alpha(cols.text, '99') });
    d.x = x;
    d.y = y + Math.round(36 * s);
    PixiPremiumScene.fit(d, sw);
    this.pixiContainer.addChild(d);
    const slider = new PixiSlider({
      width: sw,
      height: Math.round(20 * s),
      min: 0.5,
      max: 2,
      step: 0.1,
      value,
      cols,
      showValue: false,
      gradientStops: [
        { pos: 0, color: '#6aa7ff' },
        { pos: 0.5, color: cols.accent },
        { pos: 1, color: '#ff6678' },
      ],
      showTicks: true,
      tickInterval: 0.5,
    });
    slider.x = x;
    slider.y = y + Math.round(80 * s);
    slider.onChange((v) => { val.text = fmt(v); onChange(v); });
    this.pixiContainer.addChild(slider);
  },

  presets(x, y, w) {
    const presets = [
      { label: 'Slow & Precise', dodge: 0.7, shield: 0.7 },
      { label: 'Default', dodge: 1, shield: 1 },
      { label: 'Fast & Responsive', dodge: 1.5, shield: 1.5 },
    ];
    {
      const gap = 16;
      const btnW = Math.floor((w - gap * 2) / 3);
      presets.forEach((preset, i) => {
        PixiPremiumScene.button(this.pixiContainer, x + i * (btnW + gap), y, btnW, 48, preset.label, () => {
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
