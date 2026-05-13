const SettingsScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  settings: null,
  editingOption: null,
  editText: '',
  confirmReset: false,
  feedbackOpen: false,
  feedbackCategory: 'feature',
  feedbackSending: false,
  feedbackDone: false,
  _feedbackTextarea: null,

  init() {
    this.settings = { ...store.get('settings') };
    if (this.settings.musicVolume == null) this.settings.musicVolume = 0.5;
    if (this.settings.sfxVolume == null) this.settings.sfxVolume = 0.5;
    if (this.settings.bossThemeEnabled == null) this.settings.bossThemeEnabled = true;
    this.editingOption = null;
    this.editText = '';
    this.confirmReset = false;
    this.feedbackOpen = false;
    this.feedbackSending = false;
    this.feedbackDone = false;
    this._removeTextarea();
    this.build();
  },

  destroy() {
    this._removeTextarea();
    this._removeNameInput();
    PixiPremiumScene.destroy(this);
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  saveSettings() {
    store.set('settings', { ...this.settings });
    if (typeof audioManager !== 'undefined') {
      if (audioManager.setEnabled) audioManager.setEnabled(this.settings.audioEnabled);
      if (audioManager.setMusicVolume) audioManager.setMusicVolume(this.settings.musicVolume);
      if (audioManager.setSFXVolume) audioManager.setSFXVolume(this.settings.sfxVolume);
    }
    store.saveProgress();
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Settings', 'Audio, player names, controls, and progress', { footerHint: this.editingOption ? 'Type a name, Enter to save, Escape to cancel' : 'Settings persist automatically' });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    this.buildAudioPanel();
    this.buildProfilePanel();
    this.buildActionPanel();

    const btnY = Layout.isPortrait ? Layout.H - Layout.SAFE_BOTTOM - 48 : 718;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen('home'), { icon: 'back' });
    PixiPremiumScene.button(this.pixiContainer, Layout.W - 196, btnY, 160, 44, 'Themes', () => switchScreen('themeSelect', { returnTo: 'settings' }), { icon: 'spark' });
    if (this.feedbackOpen) this.buildFeedbackModal();
    if (this.confirmReset) this.buildResetModal();
  },

  buildAudioPanel() {
    const cols = ThemeManager.getCurrentColors();
    const s = Layout.uiScale || 1;
    if (Layout.isPortrait) {
      const panelW = Math.min(720, Layout.W - 80);
      const panelX = (Layout.W - panelW) / 2;
      PixiPremiumScene.panel(this.pixiContainer, panelX, 132, panelW, 330, { accentAlpha: 0.48 });
      this.sectionTitle(panelX + 32, 160, 'Audio Mix', 'Balanced sliders with no hidden hitboxes');

      const sliderW = panelW - 160;
      this.addSlider(panelX + 40, 236, sliderW, 'Music Volume', this.settings.musicVolume, (value) => {
        this.settings.musicVolume = value;
        this.saveSettings();
      });
      this.addSlider(panelX + 40, 326, sliderW, 'SFX Volume', this.settings.sfxVolume, (value) => {
        this.settings.sfxVolume = value;
        this.saveSettings();
      });

      const toggleLabel = PixiPremiumScene.text('Audio Enabled', { fontSize: Math.round(17 * s), fontWeight: '800', fill: cols.text });
      toggleLabel.x = panelX + panelW - 260;
      toggleLabel.y = 158;
      PixiPremiumScene.fit(toggleLabel, 130, 0.62);
      this.pixiContainer.addChild(toggleLabel);
      const toggle = new PixiToggle({ width: 58, height: 24, value: this.settings.audioEnabled !== false, cols });
      toggle.x = panelX + panelW - 100;
      toggle.y = 160;
      toggle.onChange((value) => {
        this.settings.audioEnabled = value;
        this.saveSettings();
      });
      this.pixiContainer.addChild(toggle);

      const bossLabel = PixiPremiumScene.text('Boss World Theme', { fontSize: Math.round(17 * s), fontWeight: '800', fill: cols.text });
      bossLabel.x = panelX + 40;
      bossLabel.y = 400;
      PixiPremiumScene.fit(bossLabel, 200, 0.62);
      this.pixiContainer.addChild(bossLabel);
      const bossToggle = new PixiToggle({ width: 58, height: 24, value: this.settings.bossThemeEnabled !== false, cols });
      bossToggle.x = panelX + panelW - 100;
      bossToggle.y = 400;
      bossToggle.onChange((value) => {
        this.settings.bossThemeEnabled = value;
        this.saveSettings();
      });
      this.pixiContainer.addChild(bossToggle);
      const bossHint = PixiPremiumScene.text('Auto-switch theme when fighting a boss', { fontSize: Math.round(14 * s), fill: PixiPremiumScene.alpha(cols.text, '77') });
      bossHint.x = panelX + 40;
      bossHint.y = 430;
      PixiPremiumScene.fit(bossHint, panelW - 120, 0.55);
      this.pixiContainer.addChild(bossHint);
    } else {
      PixiPremiumScene.panel(this.pixiContainer, 76, 132, 552, 330, { accentAlpha: 0.48 });
      this.sectionTitle(108, 160, 'Audio Mix', 'Balanced sliders with no hidden hitboxes');

      this.addSlider(116, 236, 472, 'Music Volume', this.settings.musicVolume, (value) => {
        this.settings.musicVolume = value;
        this.saveSettings();
      });
      this.addSlider(116, 326, 472, 'SFX Volume', this.settings.sfxVolume, (value) => {
        this.settings.sfxVolume = value;
        this.saveSettings();
      });

      const toggleLabel = PixiPremiumScene.text('Audio Enabled', { fontSize: Math.round(17 * s), fontWeight: '800', fill: cols.text });
      toggleLabel.x = 386;
      toggleLabel.y = 158;
      PixiPremiumScene.fit(toggleLabel, 130, 0.62);
      this.pixiContainer.addChild(toggleLabel);
      const toggle = new PixiToggle({ width: 58, height: 24, value: this.settings.audioEnabled !== false, cols });
      toggle.x = 548;
      toggle.y = 160;
      toggle.onChange((value) => {
        this.settings.audioEnabled = value;
        this.saveSettings();
      });
      this.pixiContainer.addChild(toggle);

      const bossLabel = PixiPremiumScene.text('Boss World Theme', { fontSize: Math.round(17 * s), fontWeight: '800', fill: cols.text });
      bossLabel.x = 116;
      bossLabel.y = 400;
      PixiPremiumScene.fit(bossLabel, 200, 0.62);
      this.pixiContainer.addChild(bossLabel);
      const bossToggle = new PixiToggle({ width: 58, height: 24, value: this.settings.bossThemeEnabled !== false, cols });
      bossToggle.x = 548;
      bossToggle.y = 400;
      bossToggle.onChange((value) => {
        this.settings.bossThemeEnabled = value;
        this.saveSettings();
      });
      this.pixiContainer.addChild(bossToggle);
      const bossHint = PixiPremiumScene.text('Auto-switch theme when fighting a boss', { fontSize: Math.round(14 * s), fill: PixiPremiumScene.alpha(cols.text, '77') });
      bossHint.x = 116;
      bossHint.y = 430;
      PixiPremiumScene.fit(bossHint, 400, 0.55);
      this.pixiContainer.addChild(bossHint);
    }
  },

  buildProfilePanel() {
    const cols = ThemeManager.getCurrentColors();
    const s = Layout.uiScale || 1;
    if (Layout.isPortrait) {
      const panelW = Math.min(720, Layout.W - 80);
      const panelX = (Layout.W - panelW) / 2;
      const panelY = 492;
      PixiPremiumScene.panel(this.pixiContainer, panelX, panelY, panelW, 270, { accentAlpha: 0.48 });
      this.sectionTitle(panelX + 32, panelY + 28, 'Players', 'Readable names with inline editing');
      this.nameRow(panelX + 40, panelY + 98, 'Player 1 Name', 'whitePlayer', store.get('whitePlayer') || 'Player 1', panelW - 80);
      this.nameRow(panelX + 40, panelY + 178, 'Player 2 Name', 'blackPlayer', store.get('blackPlayer') || 'Player 2', panelW - 80);

      const note = PixiPremiumScene.text('Names are UI-only and do not change save compatibility.', {
        fontSize: Math.round(15 * s),
        fill: PixiPremiumScene.alpha(cols.text, '77'),
      });
      note.x = panelX + 44;
      note.y = panelY + 234;
      PixiPremiumScene.fit(note, panelW - 100);
      this.pixiContainer.addChild(note);
    } else {
      PixiPremiumScene.panel(this.pixiContainer, 660, 132, 544, 330, { accentAlpha: 0.48 });
      this.sectionTitle(692, 160, 'Players', 'Readable names with inline editing');
      this.nameRow(700, 230, 'Player 1 Name', 'whitePlayer', store.get('whitePlayer') || 'Player 1');
      this.nameRow(700, 310, 'Player 2 Name', 'blackPlayer', store.get('blackPlayer') || 'Player 2');

      const note = PixiPremiumScene.text('Names are UI-only and do not change save compatibility.', {
        fontSize: Math.round(15 * s),
        fill: PixiPremiumScene.alpha(cols.text, '77'),
      });
      note.x = 704;
      note.y = 366;
      PixiPremiumScene.fit(note, 450);
      this.pixiContainer.addChild(note);
    }
  },

  buildActionPanel() {
    const s = Layout.uiScale || 1;
    if (Layout.isPortrait) {
      const panelW = Math.min(720, Layout.W - 80);
      const panelX = (Layout.W - panelW) / 2;
      const panelY = 780;
      const cardW = panelW - 60;
      const cardH = 64;
      const cardGap = 10;
      const panelH = 70 + (cardH + cardGap) * 4;
      PixiPremiumScene.panel(this.pixiContainer, panelX, panelY, panelW, panelH, { accentAlpha: 0.42 });
      this.sectionTitle(panelX + 32, panelY + 22, 'Game Tools', 'Practice, controls, and save maintenance');
      const actions = [
        { label: 'Practice Mini-Games', sub: 'Try every capture challenge', icon: 'play', action: () => switchScreen('miniGamePractice') },
        { label: 'Controls', sub: 'Tune mini-game sensitivity', icon: 'settings', action: () => switchScreen('controls') },
        { label: 'Send Feedback', sub: 'Suggest a feature or report a problem', icon: 'spark', action: () => { this.feedbackOpen = true; this.feedbackCategory = 'feature'; this.feedbackSending = false; this.feedbackDone = false; this.build(); this._createTextarea(); } },
        { label: 'Reset Progress', sub: 'Clear story slots and stats', icon: 'lock', action: () => { this.confirmReset = true; this.build(); } },
      ];
      actions.forEach((action, i) => {
        const cardX = panelX + 30;
        const cardY = panelY + 66 + i * (cardH + cardGap);
        PixiPremiumScene.card(this.pixiContainer, cardX, cardY, cardW, cardH, {
          onClick: action.action,
          activeColor: action.label === 'Reset Progress' ? '#ff6578' : ThemeManager.getCurrentColors().accent,
          draw: (card) => {
            const cols = ThemeManager.getCurrentColors();
            const icon = new PIXI.Sprite(PixiPremiumAssets.icon(action.icon));
            icon.width = 40;
            icon.height = 40;
            icon.x = 14;
            icon.y = 12;
            card.addChild(icon);
            const label = PixiPremiumScene.text(action.label, { fontSize: Math.round(18 * s), fontWeight: '900', fill: cols.text });
            label.x = 66;
            label.y = 10;
            PixiPremiumScene.fit(label, cardW - 100);
            card.addChild(label);
            const sub = PixiPremiumScene.text(action.sub, { fontSize: Math.round(12 * s), fill: PixiPremiumScene.alpha(cols.text, '88') });
            sub.x = 66;
            sub.y = 36;
            PixiPremiumScene.fit(sub, cardW - 120, 0.55);
            card.addChild(sub);
          },
        });
      });
    } else {
      PixiPremiumScene.panel(this.pixiContainer, 76, 492, 1128, 230, { accentAlpha: 0.42 });
      this.sectionTitle(108, 520, 'Game Tools', 'Practice, controls, and save maintenance');
      const actions = [
        { x: 120, label: 'Practice Mini-Games', sub: 'Try every capture challenge', icon: 'play', action: () => switchScreen('miniGamePractice') },
        { x: 380, label: 'Controls', sub: 'Tune mini-game sensitivity', icon: 'settings', action: () => switchScreen('controls') },
        { x: 640, label: 'Send Feedback', sub: 'Suggest or report', icon: 'spark', action: () => { this.feedbackOpen = true; this.feedbackCategory = 'feature'; this.feedbackSending = false; this.feedbackDone = false; this.build(); this._createTextarea(); } },
        { x: 900, label: 'Reset Progress', sub: 'Clear story slots and stats', icon: 'lock', action: () => { this.confirmReset = true; this.build(); } },
      ];
      actions.forEach(action => {
        PixiPremiumScene.card(this.pixiContainer, action.x, 582, 244, 92, {
          onClick: action.action,
          activeColor: action.label === 'Reset Progress' ? '#ff6578' : ThemeManager.getCurrentColors().accent,
          draw: (card) => {
            const cols = ThemeManager.getCurrentColors();
            const icon = new PIXI.Sprite(PixiPremiumAssets.icon(action.icon));
            icon.width = 52;
            icon.height = 52;
            icon.x = 18;
            icon.y = 20;
            card.addChild(icon);
            const label = PixiPremiumScene.text(action.label, { fontSize: Math.round(20 * s), fontWeight: '900', fill: cols.text });
            label.x = 84;
            label.y = 20;
            PixiPremiumScene.fit(label, 140);
            card.addChild(label);
            const sub = PixiPremiumScene.text(action.sub, { fontSize: Math.round(14 * s), fill: PixiPremiumScene.alpha(cols.text, '88') });
            sub.x = 84;
            sub.y = 50;
            PixiPremiumScene.fit(sub, 140, 0.55);
            card.addChild(sub);
          },
        });
      });
    }
  },

  sectionTitle(x, y, title, subtitle) {
    const cols = ThemeManager.getCurrentColors();
    const sc = Layout.uiScale || 1;
    const t = PixiPremiumScene.text(title, { fontSize: Math.round(24 * sc), fontWeight: '900', fill: cols.text });
    t.x = x;
    t.y = y;
    this.pixiContainer.addChild(t);
    const sub = PixiPremiumScene.text(subtitle, { fontSize: Math.round(15 * sc), fill: PixiPremiumScene.alpha(cols.text, '88') });
    sub.x = x;
    sub.y = y + 30;
    PixiPremiumScene.fit(sub, Math.min(420, Layout.W - 160));
    this.pixiContainer.addChild(sub);
  },

  addSlider(x, y, width, label, value, onChange) {
    const cols = ThemeManager.getCurrentColors();
    const slider = new PixiSlider({
      width,
      height: 18,
      min: 0,
      max: 1,
      step: 0.01,
      value,
      cols,
      label,
      unit: '',
      gradientStops: [
        { pos: 0, color: PixiColorUtil.alpha(cols.text, '66') },
        { pos: 0.55, color: cols.accent },
        { pos: 1, color: '#7dea99' },
      ],
    });
    slider.x = x;
    slider.y = y;
    const sc = Layout.uiScale || 1;
    const percent = PixiPremiumScene.text(`${Math.round(value * 100)}%`, { fontSize: Math.round(18 * sc), fontWeight: '900', fill: cols.accent });
    percent.anchor.set(1, 0);
    percent.x = x + width;
    percent.y = y - 34;
    this.pixiContainer.addChild(percent);
    slider.onChange((v) => {
      percent.text = `${Math.round(v * 100)}%`;
      onChange(v);
    });
    this.pixiContainer.addChild(slider);
  },

  nameRow(x, y, label, key, value, cardWidth) {
    const w = cardWidth || 440;
    const sc = Layout.uiScale || 1;
    PixiPremiumScene.card(this.pixiContainer, x, y, w, 54, {
      onClick: () => {
        this._openNameInput(key, store.get(key) || value);
      },
      draw: (card) => {
        const cols = ThemeManager.getCurrentColors();
        const l = PixiPremiumScene.text(label, { fontSize: Math.round(18 * sc), fontWeight: '800', fill: cols.text });
        l.x = 18;
        l.y = 16;
        card.addChild(l);
        const display = this.editingOption === key
          ? `${this.editText}${Math.floor(Date.now() / 500) % 2 === 0 ? '|' : ''}`
          : value;
        const v = PixiPremiumScene.text(display, { fontSize: Math.round(18 * sc), fill: this.editingOption === key ? cols.accent : PixiPremiumScene.alpha(cols.text, 'aa') });
        v.anchor.set(1, 0.5);
        v.x = w - 20;
        v.y = 29;
        PixiPremiumScene.fit(v, 180);
        card.addChild(v);
      },
    });
  },

  _openNameInput(key, currentValue) {
    if (this._nameInput && this.editingOption === key) return;
    this._removeNameInput();
    this.editingOption = key;
    this.editText = currentValue;
    this.build();

    const shell = document.getElementById('gameShell');
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'nameInput';
    input.value = currentValue;
    input.maxLength = 18;
    input.style.cssText = 'position:absolute;left:-9999px;top:0;opacity:0;width:1px;height:1px;';
    input.addEventListener('input', () => {
      this.editText = input.value.slice(0, 18);
      this.build();
    });
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { this._commitNameInput(); }
      if (e.key === 'Escape') { this._cancelNameInput(); }
    });
    input.addEventListener('blur', () => {
      setTimeout(() => { if (this.editingOption === key) this._commitNameInput(); }, 200);
    });
    shell.appendChild(input);
    this._nameInput = input;
    setTimeout(() => input.focus(), 50);
  },

  _commitNameInput() {
    if (!this.editingOption) return;
    const clean = this.editText.trim() || (this.editingOption === 'whitePlayer' ? 'Player 1' : 'Player 2');
    store.set(this.editingOption, clean.slice(0, 18));
    store.saveProgress();
    this.editingOption = null;
    this.editText = '';
    this._removeNameInput();
    this.build();
  },

  _cancelNameInput() {
    this.editingOption = null;
    this.editText = '';
    this._removeNameInput();
    this.build();
  },

  _removeNameInput() {
    if (this._nameInput) {
      this._nameInput.remove();
      this._nameInput = null;
    }
  },

  buildResetModal() {
    const cols = ThemeManager.getCurrentColors();
    const s = Layout.uiScale || 1;
    const modalW = Math.min(420, Layout.W - 60);
    const modalH = 224;
    const modalX = (Layout.W - modalW) / 2;
    const modalY = (Layout.H - modalH) / 2;
    const dim = new PIXI.Graphics().rect(0, 0, Layout.W, Layout.H).fill({ color: 0x000000, alpha: 0.62 });
    this.pixiContainer.addChild(dim);
    PixiPremiumScene.panel(this.pixiContainer, modalX, modalY, modalW, modalH, { accent: '#ff6578', accentAlpha: 0.86, alpha: 0.92 });
    const icon = new PIXI.Sprite(PixiPremiumAssets.icon('lock'));
    icon.width = 58;
    icon.height = 58;
    icon.x = Layout.cx - 29;
    icon.y = modalY + 24;
    this.pixiContainer.addChild(icon);
    const title = PixiPremiumScene.text('Reset all progress?', { fontSize: Math.round(25 * s), fontWeight: '900', fill: cols.text });
    title.anchor.set(0.5);
    title.x = Layout.cx;
    title.y = modalY + 104;
    this.pixiContainer.addChild(title);
    const sub = PixiPremiumScene.text('This clears story saves, unlocks, and stats.', { fontSize: Math.round(17 * s), fill: PixiPremiumScene.alpha(cols.text, 'aa') });
    sub.anchor.set(0.5);
    sub.x = Layout.cx;
    sub.y = modalY + 140;
    this.pixiContainer.addChild(sub);
    PixiPremiumScene.button(this.pixiContainer, Layout.cx - 178, modalY + 172, 150, 40, 'Reset', () => {
      store.resetProgress();
      this.confirmReset = false;
      this.build();
    }, { primary: true, color: '#ff6578' });
    PixiPremiumScene.button(this.pixiContainer, Layout.cx + 28, modalY + 172, 150, 40, 'Cancel', () => {
      this.confirmReset = false;
      this.build();
    });
  },

  buildFeedbackModal() {
    const cols = ThemeManager.getCurrentColors();
    const s = Layout.uiScale || 1;
    const modalW = Math.min(520, Layout.W - 60);
    const modalH = 420;
    const modalX = (Layout.W - modalW) / 2;
    const modalY = (Layout.H - modalH) / 2;

    const dim = new PIXI.Graphics().rect(0, 0, Layout.W, Layout.H).fill({ color: 0x000000, alpha: 0.82 });
    dim.eventMode = 'static';
    this.pixiContainer.addChild(dim);

    PixiPremiumScene.panel(this.pixiContainer, modalX, modalY, modalW, modalH, { accent: cols.accent, accentAlpha: 0.86, alpha: 0.96 });

    const title = PixiPremiumScene.text('Send Feedback', { fontSize: Math.round(26 * s), fontWeight: '900', fill: cols.text });
    title.anchor.set(0.5, 0);
    title.x = Layout.cx;
    title.y = modalY + 20;
    this.pixiContainer.addChild(title);

    const sub = PixiPremiumScene.text('Suggest a feature, report a bug, or share ideas', { fontSize: Math.round(15 * s), fill: PixiPremiumScene.alpha(cols.text, 'aa') });
    sub.anchor.set(0.5, 0);
    sub.x = Layout.cx;
    sub.y = modalY + 52;
    this.pixiContainer.addChild(sub);

    const categories = [
      { key: 'feature', label: 'Feature' },
      { key: 'bug', label: 'Bug' },
      { key: 'other', label: 'Other' },
    ];
    const catY = modalY + 82;
    const catW = 120;
    const catGap = 12;
    const catStartX = Layout.cx - (catW * 3 + catGap * 2) / 2;
    categories.forEach((cat, i) => {
      const isActive = this.feedbackCategory === cat.key;
      const bx = catStartX + i * (catW + catGap);
      PixiPremiumScene.button(this.pixiContainer, bx, catY, catW, 34, cat.label, () => {
        this.feedbackCategory = cat.key;
        this.build();
        this._createTextarea();
      }, { primary: isActive });
    });

    const textBg = new PIXI.Graphics()
      .roundRect(modalX + 24, modalY + 130, modalW - 48, 180, 8)
      .fill({ color: 0x000000, alpha: 0.35 })
      .roundRect(modalX + 24, modalY + 130, modalW - 48, 180, 8)
      .stroke({ color: PixiPremiumScene.color(cols.accent), width: 1, alpha: 0.4 });
    this.pixiContainer.addChild(textBg);

    const charCount = PixiPremiumScene.text('0 / 2000', { fontSize: Math.round(13 * s), fill: PixiPremiumScene.alpha(cols.text, '55') });
    charCount.anchor.set(1, 0);
    charCount.x = modalX + modalW - 28;
    charCount.y = modalY + 314;
    this.pixiContainer.addChild(charCount);
    this._feedbackCharCount = charCount;

    if (this.feedbackDone) {
      const doneText = PixiPremiumScene.text('Feedback sent! Thank you.', { fontSize: Math.round(20 * s), fontWeight: '900', fill: '#7dea99' });
      doneText.anchor.set(0.5, 0);
      doneText.x = Layout.cx;
      doneText.y = modalY + 330;
      this.pixiContainer.addChild(doneText);
      PixiPremiumScene.button(this.pixiContainer, Layout.cx - 75, modalY + 368, 150, 40, 'Done', () => {
        this.feedbackOpen = false;
        this._removeTextarea();
        this.build();
      });
    } else {
      const sendLabel = this.feedbackSending ? 'Sending...' : 'Submit';
      PixiPremiumScene.button(this.pixiContainer, Layout.cx - 178, modalY + 368, 150, 40, sendLabel, () => {
        if (this.feedbackSending) return;
        this._submitFeedback();
      }, { primary: true });
      PixiPremiumScene.button(this.pixiContainer, Layout.cx + 28, modalY + 368, 150, 40, 'Cancel', () => {
        this.feedbackOpen = false;
        this._removeTextarea();
        this.build();
      });
    }
  },

  _createTextarea() {
    this._removeTextarea();
    const shell = document.getElementById('gameShell');
    const rect = shell.getBoundingClientRect();
    const modalW = Math.min(520, Layout.W - 60);
    const modalH = 420;
    const modalX = (Layout.W - modalW) / 2;
    const modalY = (Layout.H - modalH) / 2;
    const txX = modalX + 24;
    const txY = modalY + 130;
    const txW = modalW - 48;
    const txH = 180;

    const scaleX = rect.width / Layout.W;
    const scaleY = rect.height / Layout.H;

    const ta = document.createElement('textarea');
    ta.id = 'feedbackTextarea';
    ta.placeholder = 'Describe your idea, suggestion, or issue...';
    ta.maxLength = 2000;
    ta.style.cssText = [
      'position:absolute',
      'left:' + (txX * scaleX) + 'px',
      'top:' + (txY * scaleY) + 'px',
      'width:' + (txW * scaleX) + 'px',
      'height:' + (txH * scaleY) + 'px',
      'background:transparent',
      'border:none',
      'outline:none',
      'resize:none',
      'color:white',
      'font-family:"Pixelify Sans",sans-serif',
      'font-size:' + Math.max(12, 15 * scaleY) + 'px',
      'padding:10px',
      'z-index:200',
      'caret-color:white',
      '-webkit-user-select:auto',
      'user-select:auto',
    ].join(';');
    ta.addEventListener('input', () => {
      if (this._feedbackCharCount) {
        this._feedbackCharCount.text = ta.value.length + ' / 2000';
      }
    });
    ta.addEventListener('keydown', (e) => { e.stopPropagation(); });
    shell.appendChild(ta);
    this._feedbackTextarea = ta;
    setTimeout(() => ta.focus(), 100);
  },

  _removeTextarea() {
    if (this._feedbackTextarea) {
      this._feedbackTextarea.remove();
      this._feedbackTextarea = null;
    }
  },

  _submitFeedback() {
    const ta = this._feedbackTextarea;
    const text = ta ? ta.value.trim() : '';
    if (text.length < 10) {
      if (ta) { ta.placeholder = 'Please write at least 10 characters...'; ta.focus(); }
      return;
    }
    this.feedbackSending = true;
    this.build();
    this._createTextarea();
    if (this._feedbackTextarea) this._feedbackTextarea.value = text;

    const apiUrl = window.location.hostname === 'game.altobolt.com'
      ? 'https://game.altobolt.com/api/feedback'
      : 'https://game.altobolt.com/api/feedback';

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, category: this.feedbackCategory }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success || data.issue_url) {
          this.feedbackDone = true;
        }
        this.feedbackSending = false;
        this.build();
        if (this.feedbackDone) this._removeTextarea();
      })
      .catch(() => {
        this.feedbackSending = false;
        this.build();
        this._createTextarea();
        if (this._feedbackTextarea) {
          this._feedbackTextarea.value = text;
          this._feedbackTextarea.placeholder = 'Network error. Please try again.';
        }
      });
  },

  handleKeyDown(e) {
    if (this.feedbackOpen) {
      if (e.key === 'Escape') {
        this.feedbackOpen = false;
        this._removeTextarea();
        this.build();
      }
      return;
    }
    if (this.editingOption) {
      if (e.key === 'Escape') this._cancelNameInput();
      return;
    }
    if (e.key === 'Escape') switchScreen('home');
  },
};
