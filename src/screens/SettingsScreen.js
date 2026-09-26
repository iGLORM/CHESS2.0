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

  init(data) {
    // Opened from the pause menu: Back returns to the paused game.
    if (data && data.returnTo === 'game') this._returnTo = 'game';
    else if (!this._visitingSubscreen) this._returnTo = 'home';
    this._visitingSubscreen = false;
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
    if (this._caret && !this._caret.destroyed) {
      this._caretTime += dt;
      this._caret.visible = this._caretTime % 1 < 0.5;
    }
  },

  // Landscape layout: two columns on top, Game Tools across the bottom.
  LAYOUT: { X: 60, Y: 150, COL_W: 572, GAP: 16, TOP_H: 332, PAD: 32, TITLE_Y: 26, RULE_Y: 248, ROW1_Y: 272, ROW2_Y: 306 },

  portraitGeom() {
    const w = Math.min(720, Layout.W - 80);
    return { x: Math.round((Layout.W - w) / 2), w, audioY: 150, playersY: 496, toolsY: 774 };
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

    const btnY = PixiPremiumScene.bottomButtonY();
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => this.goBack(), { icon: 'back' });
    PixiPremiumScene.button(this.pixiContainer, Layout.W - 196, btnY, 160, 44, 'Themes', () => { this._visitingSubscreen = true; switchScreen('themeSelect', { returnTo: 'settings' }); }, { icon: 'spark' });
    const creditsX = Layout.isPortrait ? Layout.W / 2 - 80 : Layout.W - 372;
    PixiPremiumScene.button(this.pixiContainer, creditsX, btnY, 160, 44, 'Credits', () => { this._visitingSubscreen = true; switchScreen('credits'); }, { icon: 'progress' });
    if (this.feedbackOpen) this.buildFeedbackModal();
    if (this.confirmReset) this.buildResetModal();
  },

  buildAudioPanel() {
    const cols = ThemeManager.getCurrentColors();
    const s = Layout.uiScale || 1;
    if (Layout.isPortrait) {
      const P = this.portraitGeom();
      const inX = P.x + 32;
      const inR = P.x + P.w - 32;
      PixiPremiumScene.panel(this.pixiContainer, P.x, P.audioY, P.w, 330, { accentAlpha: 0.48 });
      this.sectionTitle(inX, P.audioY + 26, 'Audio Mix', 'Music and sound effects');
      this.addSlider(inX, P.audioY + 140, inR - inX, 'Music Volume', this.settings.musicVolume, (value) => { this.settings.musicVolume = value; this.saveSettings(); });
      this.addSlider(inX, P.audioY + 204, inR - inX, 'SFX Volume', this.settings.sfxVolume, (value) => { this.settings.sfxVolume = value; this.saveSettings(); });
      this.toggleRow(inX, P.audioY + 262, inR, 'Audio Enabled', this.settings.audioEnabled !== false, (value) => { this.settings.audioEnabled = value; this.saveSettings(); });
      this.toggleRow(inX, P.audioY + 298, inR, 'Boss World Theme', this.settings.bossThemeEnabled !== false, (value) => { this.settings.bossThemeEnabled = value; this.saveSettings(); }, 'switch theme vs bosses');
    } else {
      const L = this.LAYOUT;
      const x = L.X;
      const inX = x + L.PAD;
      const inR = x + L.COL_W - L.PAD;
      PixiPremiumScene.panel(this.pixiContainer, x, L.Y, L.COL_W, L.TOP_H, { accentAlpha: 0.48 });
      this.sectionTitle(inX, L.Y + L.TITLE_Y, 'Audio Mix', 'Music and sound effects');
      this.addSlider(inX, L.Y + 140, inR - inX, 'Music Volume', this.settings.musicVolume, (value) => {
        this.settings.musicVolume = value;
        this.saveSettings();
      });
      this.addSlider(inX, L.Y + 204, inR - inX, 'SFX Volume', this.settings.sfxVolume, (value) => {
        this.settings.sfxVolume = value;
        this.saveSettings();
      });
      this.pixiContainer.addChild(new PIXI.Graphics().rect(inX, L.Y + L.RULE_Y, inR - inX, 2).fill({ color: PixiPremiumScene.color(cols.text), alpha: 0.1 }));
      this.toggleRow(inX, L.Y + L.ROW1_Y, inR, 'Audio Enabled', this.settings.audioEnabled !== false, (value) => {
        this.settings.audioEnabled = value;
        this.saveSettings();
      });
      this.toggleRow(inX, L.Y + L.ROW2_Y, inR, 'Boss World Theme', this.settings.bossThemeEnabled !== false, (value) => {
        this.settings.bossThemeEnabled = value;
        this.saveSettings();
      }, 'switch theme vs bosses');
    }
  },

  buildProfilePanel() {
    const cols = ThemeManager.getCurrentColors();
    const s = Layout.uiScale || 1;
    if (Layout.isPortrait) {
      const P = this.portraitGeom();
      const inX = P.x + 32;
      const inW = P.w - 64;
      PixiPremiumScene.panel(this.pixiContainer, P.x, P.playersY, P.w, 262, { accentAlpha: 0.48 });
      this.sectionTitle(inX, P.playersY + 26, 'Players', 'Names shown in Local 1v1 games');
      this.nameRow(inX, P.playersY + 98, 'Player 1 Name', 'whitePlayer', store.get('whitePlayer') || 'Player 1', inW);
      this.nameRow(inX, P.playersY + 158, 'Player 2 Name', 'blackPlayer', store.get('blackPlayer') || 'Player 2', inW);
      const note = PixiPremiumScene.text('Click a name to edit it. Enter saves, Escape cancels.', { fontSize: Math.round(14 * s), fill: PixiPremiumScene.alpha(cols.text, '88') });
      note.anchor.set(0, 0.5);
      note.x = inX + 2;
      note.y = P.playersY + 230;
      PixiPremiumScene.fit(note, inW);
      this.pixiContainer.addChild(note);
    } else {
      const L = this.LAYOUT;
      const x = L.X + L.COL_W + L.GAP;
      const inX = x + L.PAD;
      const inW = L.COL_W - L.PAD * 2;
      PixiPremiumScene.panel(this.pixiContainer, x, L.Y, L.COL_W, L.TOP_H, { accentAlpha: 0.48 });
      this.sectionTitle(inX, L.Y + L.TITLE_Y, 'Players', 'Names shown in Local 1v1 games');
      this.nameRow(inX, L.Y + 98, 'Player 1 Name', 'whitePlayer', store.get('whitePlayer') || 'Player 1', inW);
      this.nameRow(inX, L.Y + 158, 'Player 2 Name', 'blackPlayer', store.get('blackPlayer') || 'Player 2', inW);

      const note = PixiPremiumScene.text('Click a name to edit it. Enter saves, Escape cancels.', {
        fontSize: Math.round(14 * s),
        fill: PixiPremiumScene.alpha(cols.text, '88'),
      });
      note.anchor.set(0, 0.5);
      note.x = inX + 2;
      note.y = L.Y + 226;
      PixiPremiumScene.fit(note, inW);
      this.pixiContainer.addChild(note);
      this.pixiContainer.addChild(new PIXI.Graphics().rect(inX, L.Y + L.RULE_Y, inW, 2).fill({ color: PixiPremiumScene.color(cols.text), alpha: 0.1 }));
      this.buildFullscreenRow(inX, L.Y + L.ROW1_Y, inX + inW);
    }
  },

  // Fullscreen switch (desktop and desktop browsers; phones are always full screen).
  buildFullscreenRow(labelX, y, rightX) {
    const isOn = () => (window.electron && window.electron.isDesktop)
      ? window.electron.isFullscreen()
      : Promise.resolve(!!document.fullscreenElement);
    const toggle = this.toggleRow(labelX, y, rightX, 'Fullscreen', false, () => {
      if (window.electron && window.electron.toggleFullscreen) window.electron.toggleFullscreen();
    }, 'F11');
    // Reflect the real window state without firing the change handler.
    isOn().then((on) => { toggle._value = on; toggle._draw(); });
  },

  buildActionPanel() {
    const s = Layout.uiScale || 1;
    if (Layout.isPortrait) {
      const P = this.portraitGeom();
      const panelW = P.w;
      const panelX = P.x;
      const panelY = P.toolsY;
      const cardW = panelW - 60;
      const cardH = 72;
      const cardGap = 12;
      const panelH = 104 + (cardH + cardGap) * 4 - cardGap + 28;
      PixiPremiumScene.panel(this.pixiContainer, panelX, panelY, panelW, panelH, { accentAlpha: 0.42 });
      this.sectionTitle(panelX + 32, panelY + 26, 'Game Tools', 'Practice, controls, and save maintenance');
      const actions = [
        { label: 'Practice Mini-Games', sub: 'Try every capture challenge', icon: 'play', action: () => switchScreen('miniGamePractice') },
        { label: 'Controls', sub: 'Tune mini-game sensitivity', icon: 'settings', action: () => switchScreen('controls') },
        { label: 'Send Feedback', sub: 'Suggest a feature or report a problem', icon: 'spark', action: () => { this.feedbackOpen = true; this.feedbackCategory = 'feature'; this.feedbackSending = false; this.feedbackDone = false; this.build(); this._createTextarea(); } },
        { label: 'Reset Progress', sub: 'Clear story slots and stats', icon: 'lock', action: () => { this.confirmReset = true; this.build(); } },
      ];
      actions.forEach((action, i) => {
        const cardX = panelX + 30;
        const cardY = panelY + 104 + i * (cardH + cardGap);
        PixiPremiumScene.card(this.pixiContainer, cardX, cardY, cardW, cardH, {
          onClick: action.action,
          accentStrip: false,
          activeColor: action.label === 'Reset Progress' ? '#ff6578' : ThemeManager.getCurrentColors().accent,
          draw: (card) => {
            const cols = ThemeManager.getCurrentColors();
            const icon = new PIXI.Sprite(PixiPremiumAssets.icon(action.icon));
            icon.width = 44;
            icon.height = 44;
            icon.x = 16;
            icon.y = Math.round((cardH - 44) / 2);
            card.addChild(icon);
            const label = PixiPremiumScene.text(action.label, { fontSize: Math.round(18 * s), fontWeight: '900', fill: cols.text });
            const sub = PixiPremiumScene.text(action.sub, { fontSize: Math.round(14 * s), fill: PixiPremiumScene.alpha(cols.text, '99') });
            PixiPremiumScene.fit(label, cardW - 100);
            PixiPremiumScene.fit(sub, cardW - 100, 0.7);
            const blockH = label.height + 4 + sub.height;
            label.x = 76;
            label.y = Math.round((cardH - blockH) / 2);
            sub.x = 76;
            sub.y = label.y + label.height + 4;
            card.addChild(label, sub);
          },
        });
      });
    } else {
      const L = this.LAYOUT;
      const y = L.Y + L.TOP_H + L.GAP;
      const w = L.COL_W * 2 + L.GAP;
      const h = PixiPremiumScene.contentBottom - y;
      PixiPremiumScene.panel(this.pixiContainer, L.X, y, w, h, { accentAlpha: 0.42 });
      this.sectionTitle(L.X + L.PAD, y + L.TITLE_Y, 'Game Tools', 'Practice, controls, and save maintenance');
      const actions = [
        { label: 'Mini-Games', sub: 'Practise every challenge', icon: 'play', action: () => switchScreen('miniGamePractice') },
        { label: 'Controls', sub: 'Mini-game sensitivity', icon: 'settings', action: () => switchScreen('controls') },
        { label: 'Send Feedback', sub: 'Suggest or report', icon: 'spark', action: () => { this.feedbackOpen = true; this.feedbackCategory = 'feature'; this.feedbackSending = false; this.feedbackDone = false; this.build(); this._createTextarea(); } },
        { label: 'Reset Progress', sub: 'Clear saves and stats', icon: 'lock', action: () => { this.confirmReset = true; this.build(); } },
      ];
      const gap = 16;
      const cardY = y + 104;
      const cardH = Math.min(92, y + h - L.PAD + 4 - cardY);
      const cardW = Math.floor((w - L.PAD * 2 - gap * (actions.length - 1)) / actions.length);
      actions.forEach((action, i) => {
        PixiPremiumScene.card(this.pixiContainer, L.X + L.PAD + i * (cardW + gap), cardY, cardW, cardH, {
          onClick: action.action,
          accentStrip: false,
          activeColor: action.label === 'Reset Progress' ? '#ff6578' : ThemeManager.getCurrentColors().accent,
          draw: (card) => {
            const cols = ThemeManager.getCurrentColors();
            const iconSize = 48;
            const icon = new PIXI.Sprite(PixiPremiumAssets.icon(action.icon));
            icon.width = iconSize;
            icon.height = iconSize;
            icon.x = 18;
            icon.y = Math.round((cardH - iconSize) / 2);
            card.addChild(icon);
            const textX = 18 + iconSize + 14;
            const label = PixiPremiumScene.text(action.label, { fontSize: Math.round(19 * s), fontWeight: '900', fill: cols.text });
            const sub = PixiPremiumScene.text(action.sub, { fontSize: Math.round(14 * s), fill: PixiPremiumScene.alpha(cols.text, '99') });
            PixiPremiumScene.fit(label, cardW - textX - 12, 0.8);
            PixiPremiumScene.fit(sub, cardW - textX - 12, 0.8);
            const blockH = label.height + 4 + sub.height;
            label.x = textX;
            label.y = Math.round((cardH - blockH) / 2);
            sub.x = textX;
            sub.y = label.y + label.height + 4;
            card.addChild(label, sub);
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

  // Label on the left and percentage on the right, on one row above the track.
  addSlider(x, y, width, label, value, onChange) {
    const cols = ThemeManager.getCurrentColors();
    const sc = Layout.uiScale || 1;
    const slider = new PixiSlider({
      width,
      height: 18,
      min: 0,
      max: 1,
      step: 0.01,
      value,
      cols,
      showValue: false,
      gradientStops: [
        { pos: 0, color: PixiColorUtil.alpha(cols.text, '66') },
        { pos: 0.55, color: cols.accent },
        { pos: 1, color: '#7dea99' },
      ],
    });
    slider.x = x;
    slider.y = y;
    const rowY = y - 20;
    const name = PixiPremiumScene.text(label, { fontSize: Math.round(17 * sc), fontWeight: '800', fill: cols.text });
    name.anchor.set(0, 0.5);
    name.x = x;
    name.y = rowY;
    this.pixiContainer.addChild(name);
    const percent = PixiPremiumScene.text(`${Math.round(value * 100)}%`, { fontSize: Math.round(18 * sc), fontWeight: '900', fill: cols.accent });
    percent.anchor.set(1, 0.5);
    percent.x = x + width;
    percent.y = rowY;
    this.pixiContainer.addChild(percent);
    slider.onChange((v) => {
      percent.text = `${Math.round(v * 100)}%`;
      onChange(v);
    });
    this.pixiContainer.addChild(slider);
  },

  // A label on the left and a toggle flush with the right edge, centred on y.
  toggleRow(x, y, rightX, label, value, onChange, hint) {
    const cols = ThemeManager.getCurrentColors();
    const sc = Layout.uiScale || 1;
    const t = PixiPremiumScene.text(label, { fontSize: Math.round(17 * sc), fontWeight: '800', fill: cols.text });
    t.anchor.set(0, 0.5);
    t.x = x;
    t.y = y;
    this.pixiContainer.addChild(t);
    if (hint) {
      const h = PixiPremiumScene.text(hint, { fontSize: Math.round(14 * sc), fill: PixiPremiumScene.alpha(cols.text, '88') });
      h.anchor.set(0, 0.5);
      h.x = x + t.width + 14;
      h.y = y + 1;
      PixiPremiumScene.fit(h, rightX - 58 - 20 - h.x, 0.7);
      this.pixiContainer.addChild(h);
    }
    const toggle = new PixiToggle({ width: 58, height: 24, value, cols });
    toggle.x = rightX - 58;
    toggle.y = Math.round(y - 12);
    if (onChange) toggle.onChange(onChange);
    this.pixiContainer.addChild(toggle);
    return toggle;
  },

  nameRow(x, y, label, key, value, cardWidth) {
    const w = cardWidth || 440;
    const h = 50;
    const sc = Layout.uiScale || 1;
    PixiPremiumScene.card(this.pixiContainer, x, y, w, h, {
      accentStrip: false,
      active: this.editingOption === key,
      onClick: () => {
        this._openNameInput(key, store.get(key) || value);
      },
      draw: (card) => {
        const cols = ThemeManager.getCurrentColors();
        const midY = h / 2;
        const l = PixiPremiumScene.text(label, { fontSize: Math.round(17 * sc), fontWeight: '800', fill: cols.text });
        l.anchor.set(0, 0.5);
        l.x = 18;
        l.y = midY;
        card.addChild(l);
        const editing = this.editingOption === key;
        const v = PixiPremiumScene.text(editing ? this.editText : value, { fontSize: Math.round(18 * sc), fill: editing ? cols.accent : PixiPremiumScene.alpha(cols.text, 'bb') });
        v.anchor.set(1, 0.5);
        v.y = midY;
        PixiPremiumScene.fit(v, w - l.width - 60);
        if (editing) {
          // Blinking text cursor after the last letter (blinked in pixiUpdate).
          const caretH = Math.round(22 * sc);
          const caretX = w - 20 - 2;
          v.x = caretX - 3;
          const caret = new PIXI.Graphics().rect(0, 0, 2, caretH).fill({ color: PixiPremiumScene.color(cols.accent) });
          caret.x = caretX;
          caret.y = Math.round(midY - caretH / 2);
          card.addChild(caret);
          this._caret = caret;
          this._caretTime = 0;
        } else {
          v.x = w - 20;
        }
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
    if (e.key === 'Escape') this.goBack();
  },

  goBack() {
    if (this._returnTo === 'game') switchScreen('game', { resume: true });
    else switchScreen('home');
  },
};
