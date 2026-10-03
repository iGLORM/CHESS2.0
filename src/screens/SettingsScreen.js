// Settings: category tabs on the left (Display, Graphics, Audio, Game), option rows on
// the right, and a description of the focused option at the bottom of the panel.
// Keyboard: Up/Down choose a row, Left/Right change it, Enter toggles or opens,
// Q/E or Tab switch category, Escape goes back.
const SettingsScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  _ui: null,
  _tab: 'display',
  _rows: [],
  _rowIndex: -1,
  confirmReset: false,
  feedbackOpen: false,
  feedbackCategory: 'feature',
  feedbackSending: false,
  feedbackDone: false,
  _feedbackTextarea: null,

  TABS: [
    { id: 'display', title: 'Display', sub: 'Screen, resolution, frames', icon: 'monitor' },
    { id: 'graphics', title: 'Graphics', sub: 'Quality and effects', icon: 'gem' },
    { id: 'audio', title: 'Audio', sub: 'Music and sound', icon: 'speaker' },
    { id: 'game', title: 'Game', sub: 'Language, themes, saves', icon: 'gear' },
  ],

  init(data) {
    // Opened from the pause menu: Back returns to the paused game.
    if (data && data.returnTo) this._returnTo = data.returnTo;
    else if (!this._visitingSubscreen) this._returnTo = 'home';
    if (data && data.tab) this._tab = data.tab;
    else if (!this._visitingSubscreen) this._tab = 'display';
    this._visitingSubscreen = false;
    this.settings = { ...store.get('settings') };
    if (this.settings.musicVolume == null) this.settings.musicVolume = 0.5;
    if (this.settings.sfxVolume == null) this.settings.sfxVolume = 0.5;
    this.confirmReset = false;
    this.feedbackOpen = false;
    this.feedbackSending = false;
    this.feedbackDone = false;
    this._rowIndex = data && data.row != null ? data.row : -1;
    this._removeTextarea();
    this.build();
    this._queryFullscreen();
  },

  // Used by main.js to rebuild the screen as it was after a resize.
  get _lastInitData() {
    return { returnTo: this._returnTo, tab: this._tab, row: this._rowIndex };
  },

  destroy() {
    this._removeTextarea();
    this._rows = [];
    this._ui = null;
    PixiPremiumScene.destroy(this);
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  // Every text on screen is translated as it is drawn, so the whole screen is
  // rebuilt in the new language, keeping the Game tab and the Language row.
  _setLanguage(id) {
    const ready = I18n.set(id);
    this.settings.language = I18n.lang;
    this.saveSettings();
    const row = this._rowIndex;
    ready.then(() => {
      if (store.get('screen') !== 'settings') return;
      switchScreen('settings', { returnTo: this._returnTo, tab: 'game', row }, { instant: true });
    });
  },

  saveSettings() {
    const graphics = (store.get('settings') || {}).graphics;
    store.set('settings', { ...this.settings, graphics });
    this.settings = { ...store.get('settings') };
    if (typeof audioManager !== 'undefined') {
      if (audioManager.setEnabled) audioManager.setEnabled(this.settings.audioEnabled);
      if (audioManager.setMusicVolume) audioManager.setMusicVolume(this.settings.musicVolume);
      if (audioManager.setSFXVolume) audioManager.setSFXVolume(this.settings.sfxVolume);
    }
    store.saveProgress();
  },

  // ---------- Options ----------

  _canFullscreen() {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) return false;
    return !!((window.electron && window.electron.isDesktop) || document.fullscreenEnabled);
  },

  _queryFullscreen() {
    const done = (on) => {
      if (this._fullscreen === on) return;
      this._fullscreen = on;
      this._redrawRow('displayMode');
    };
    if (window.electron && window.electron.isFullscreen) window.electron.isFullscreen().then(done);
    else done(!!document.fullscreenElement);
  },

  _toggleFullscreen() {
    if (window.electron && window.electron.toggleFullscreen) window.electron.toggleFullscreen();
    else if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    this._fullscreen = !this._fullscreen;
    this._redrawRow('displayMode');
    setTimeout(() => this._queryFullscreen(), 700);
  },

  // Each row: { key, type: choice|toggle|slider|link, label, desc, ... }.
  _items(tab) {
    const g = (key) => Graphics.get(key);
    const graphicsChoice = (key, label, desc) => ({
      key, type: 'choice', label, desc,
      value: () => Graphics.label(key),
      pips: () => this._pips(key),
      step: (dir) => { Graphics.step(key, dir); this._redrawRows(); },
    });
    const graphicsToggle = (key, label, desc) => ({
      key, type: 'toggle', label, desc,
      get: () => g(key) !== false,
      set: (v) => { Graphics.set(key, v); this._redrawRows(); },
    });
    const audioToggle = (key, label, desc) => ({
      key, type: 'toggle', label, desc,
      get: () => this.settings[key] !== false,
      set: (v) => { this.settings[key] = v; this.saveSettings(); },
    });
    const audioSlider = (key, label, desc) => ({
      key, type: 'slider', label, desc, min: 0, max: 1, stepSize: 0.05,
      get: () => this.settings[key],
      set: (v) => { this.settings[key] = v; this.saveSettings(); },
      text: (v) => `${Math.round(v * 100)}%`,
    });
    const subscreen = (name, data) => () => { this._visitingSubscreen = true; switchScreen(name, data); };

    if (tab === 'display') {
      const items = [];
      if (this._canFullscreen()) {
        items.push({
          key: 'displayMode', type: 'choice', label: 'Display Mode',
          desc: 'Fullscreen fills the screen; Windowed runs in a window you can resize. F11 or Alt+Enter also switches.',
          value: () => (this._fullscreen ? 'Fullscreen' : 'Windowed'),
          pips: () => ({ count: 2, index: this._fullscreen ? 0 : 1 }),
          step: () => this._toggleFullscreen(),
        });
      }
      items.push(
        graphicsChoice('resolution', 'Resolution',
          'How many pixels the game draws. Native matches your screen; lower is faster and smoothed up. In a window it also sets the window size.'),
        graphicsChoice('fps', 'Frame Limit', 'Most frames drawn per second. 30 saves battery; above your screen\'s refresh rate only the counter goes up.'),
        {
          key: 'brightness', type: 'slider', label: 'Brightness', desc: 'Brightens or darkens the whole picture.',
          min: 0.6, max: 1.4, stepSize: 0.05,
          get: () => g('brightness'),
          set: (v) => Graphics.set('brightness', Math.round(v * 100) / 100),
          text: (v) => `${Math.round(v * 100)}%`,
        },
        graphicsToggle('showFps', 'Show FPS', 'Shows frames per second in the top-left corner.'),
      );
      return items;
    }
    if (tab === 'graphics') {
      return [
        graphicsChoice('preset', 'Quality Preset',
          'Sets background motion, particles and 3D quality together. Low suits older computers and phones.'),
        graphicsChoice('sceneMotion', 'Background Motion', 'How the animated world backgrounds move: full rate, half rate, or a still picture.'),
        graphicsChoice('particles', 'Particles', 'How many sparks, embers and capture bursts are drawn.'),
        graphicsChoice('mini3d', '3D Mini-Games', 'Sharpness and shadows in the 3D capture mini-games. Higher looks crisper and needs a faster graphics card.'),
        graphicsToggle('retro', 'Retro Filter', 'Scanlines and colour fringes on the 3D mini-games.'),
        graphicsToggle('shake', 'Screen Shake', 'Shakes the screen on big captures, hits and story moments.'),
      ];
    }
    if (tab === 'audio') {
      return [
        audioToggle('audioEnabled', 'Sound', 'Turns all music and sound effects on or off.'),
        audioSlider('musicVolume', 'Music Volume', 'Volume of the world songs.'),
        audioSlider('sfxVolume', 'Effects Volume', 'Volume of moves, captures, buttons and mini-games.'),
      ];
    }
    const themeName = (ThemeManager.getTheme(ThemeManager.menuThemeId()) || {}).name || 'Theme';
    const langs = I18n.LANGS;
    const langIndex = () => Math.max(0, langs.findIndex(l => l.id === I18n.lang));
    return [
      {
        key: 'language', type: 'choice', label: 'Language',
        desc: 'The language of every menu, story and dialogue line.',
        value: () => I18n.name(),
        pips: () => ({ count: langs.length, index: langIndex() }),
        step: (dir) => this._setLanguage(langs[(langIndex() + dir + langs.length) % langs.length].id),
      },
      { key: 'themes', type: 'link', label: 'Themes', value: () => themeName, desc: 'Your look outside story mode: board, pieces, background and music. Story mode always shows the world you are in.', action: subscreen('themeSelect', { returnTo: 'settings' }) },
      { key: 'controls', type: 'link', label: 'Controls', desc: 'Mouse and key sensitivity in the mini-games.', action: subscreen('controls') },
      { key: 'credits', type: 'link', label: 'Credits', desc: 'The people and projects behind Chess 2.0.', action: subscreen('credits', { returnTo: 'settings' }) },
      { key: 'feedback', type: 'link', label: 'Send Feedback', desc: 'Suggest a feature or report a problem.', action: () => this._openFeedback() },
      { key: 'reset', type: 'link', label: 'Reset Progress', danger: true, desc: 'Clears story saves, unlocks and stats. This cannot be undone.', action: () => { this.confirmReset = true; this._refresh(); } },
    ];
  },

  _pips(key) {
    const list = key === 'resolution' ? Graphics.RESOLUTIONS.map(r => r.id) : Graphics.CHOICES[key].map(c => c[0]);
    return { count: list.length, index: list.indexOf(Graphics.get(key)) };
  },

  // Puts the current tab's options back to their defaults.
  _resetTab() {
    if (this._tab === 'display') {
      for (const k of ['resolution', 'fps', 'brightness', 'showFps']) Graphics.set(k, Graphics.DEFAULTS[k]);
    } else if (this._tab === 'graphics') {
      Graphics.set('preset', Graphics.DEFAULTS.preset);
      Graphics.set('retro', Graphics.DEFAULTS.retro);
      Graphics.set('shake', Graphics.DEFAULTS.shake);
    } else if (this._tab === 'audio') {
      Object.assign(this.settings, { audioEnabled: true, musicVolume: 0.5, sfxVolume: 0.5 });
      this.saveSettings();
    }
    this._refresh();
  },

  // ---------- Layout ----------

  geom() {
    const s = Layout.uiScale || 1;
    const L = PixiPremiumScene.tabLayout();
    return L.portrait
      ? { ...L, rowH: Math.round(62 * s), rowGap: 10, descH: Math.round(86 * s) }
      : { ...L, rowH: 56, rowGap: 8, descH: 64 };
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Settings', null, {
      footerHint: 'Q / E switch tab  ·  Up / Down choose  ·  Left / Right change',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);
    this._ui = new PIXI.Container();
    this.pixiContainer.addChild(this._ui);
    this._refresh();
  },

  _refresh() {
    if (!this._ui) return;
    this._ui.removeChildren().forEach(c => c.destroy({ children: true }));
    const G = this.geom();
    this._buildTabs(G);
    this._buildPanel(G);

    const btnY = PixiPremiumScene.bottomButtonY();
    PixiPremiumScene.button(this._ui, 36, btnY, 160, 44, 'Back', () => this.goBack(), { icon: 'back' });
    if (this._tab !== 'game') {
      PixiPremiumScene.button(this._ui, Layout.W - 236, btnY, 200, 44, 'Defaults', () => this._resetTab(), { icon: 'save' });
    }
    if (this.feedbackOpen) this.buildFeedbackModal();
    if (this.confirmReset) this.buildResetModal();
  },

  _buildTabs(G) {
    const tabs = this.TABS.map(t => ({ ...t, art: (size) => this._icon(t.icon, Math.round(size * 0.78)) }));
    PixiPremiumScene.tabStrip(this._ui, G, tabs, this._tab, (id) => this._selectTab(id));
  },

  _selectTab(id) {
    if (this._tab === id) return;
    this._tab = id;
    this._rowIndex = -1;
    this._refresh();
  },

  _buildPanel(G) {
    const cols = ThemeManager.getCurrentColors();
    const s = Layout.uiScale || 1;
    const P = G.panel;
    const tab = this.TABS.find(t => t.id === this._tab);
    PixiPremiumScene.panel(this._ui, P.x, P.y, P.w, P.h, { accentAlpha: 0.5, alpha: 0.76 });

    const pad = 28;
    const title = PixiPremiumScene.text(tab.title.toUpperCase(), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(24 * s), fontWeight: 'bold', fill: cols.text });
    title.x = P.x + pad;
    title.y = P.y + 30;
    this._ui.addChild(title);
    const sub = PixiPremiumScene.text(tab.sub, { fontSize: Math.round(16 * s), fill: PixiPremiumScene.alpha(cols.text, '99') });
    sub.anchor.set(1, 0);
    sub.x = P.x + P.w - pad;
    sub.y = title.y + Math.round((title.height - sub.height) / 2);
    this._ui.addChild(sub);
    const rowsTop = title.y + title.height + 18;
    this._ui.addChild(new PIXI.Graphics().rect(P.x + pad, rowsTop - 10, P.w - pad * 2, 2).fill({ color: PixiPremiumScene.color(cols.text), alpha: 0.12 }));

    // Description strip at the bottom of the panel.
    const descY = P.y + P.h - pad + 6 - G.descH;
    const strip = new PIXI.Graphics()
      .poly(PixiPremiumScene.pixelShape(P.x + pad - 8, descY, P.w - (pad - 8) * 2, G.descH, 3))
      .fill({ color: 0x000000, alpha: 0.28 });
    this._ui.addChild(strip);
    this._desc = PixiPremiumScene.text('', {
      fontSize: Math.round(16 * s), fill: PixiPremiumScene.alpha(cols.text, 'cc'),
      wordWrap: true, wordWrapWidth: P.w - pad * 2 - 16, lineHeight: Math.round(21 * s),
    });
    this._desc.x = P.x + pad + 4;
    this._descBox = { y: descY, h: G.descH };
    this._ui.addChild(this._desc);

    this._rows = [];
    const items = this._items(this._tab);
    items.forEach((item, i) => {
      const row = this._buildRow(item, P.x + pad - 8, rowsTop + i * (G.rowH + G.rowGap), P.w - (pad - 8) * 2, G.rowH, i);
      this._rows.push(row);
    });
    if (this._rowIndex >= this._rows.length) this._rowIndex = this._rows.length - 1;
    this._rows.forEach(r => r.redraw());
    this._showDesc();
  },

  _showDesc() {
    if (!this._desc || this._desc.destroyed) return;
    const row = this._rows[this._rowIndex];
    const item = row ? row.item : null;
    this._desc.text = item ? item.desc : 'Choose an option to see what it does.';
    this._desc.alpha = item ? 1 : 0.6;
    this._desc.y = Math.round(this._descBox.y + (this._descBox.h - this._desc.height) / 2);
  },

  _setFocus(i) {
    if (i === this._rowIndex) return;
    const old = this._rows[this._rowIndex];
    this._rowIndex = i;
    if (old) old.redraw();
    if (this._rows[i]) this._rows[i].redraw();
    this._showDesc();
  },

  _redrawRow(key) {
    const row = this._rows.find(r => r.item.key === key);
    if (row) row.redraw();
  },

  _redrawRows() {
    this._rows.forEach(r => r.redraw());
  },

  // One option row: label on the left, its control in the right-hand column.
  _buildRow(item, x, y, w, h, index) {
    const s = Layout.uiScale || 1;
    const group = new PIXI.Container();
    group.x = x;
    group.y = y;
    group.eventMode = 'static';
    group.cursor = 'pointer';
    group.hitArea = new PIXI.Rectangle(0, 0, w, h);
    this._ui.addChild(group);
    const ctrlW = Math.min(Math.round(300 * s), Math.round(w * 0.46));
    const ctrlX = w - 18 - ctrlW;
    const row = { item, group };

    row.redraw = () => {
      if (group.destroyed) return;
      group.removeChildren().forEach(c => c.destroy({ children: true }));
      const cols = ThemeManager.getCurrentColors();
      const focus = this._rowIndex === index;
      const accent = PixiPremiumScene.color(item.danger ? '#ff6578' : cols.accent);
      const bg = new PIXI.Graphics();
      bg.poly(PixiPremiumScene.pixelShape(0, 0, w, h, 3)).fill({ color: focus ? accent : 0xffffff, alpha: focus ? 0.14 : 0.035 });
      if (focus) {
        bg.poly(PixiPremiumScene.pixelShape(1, 1, w - 2, h - 2, 3)).stroke({ color: accent, alpha: 0.85, width: 2, alignment: 1 });
        bg.rect(0, 10, 4, h - 20).fill({ color: accent });
      }
      group.addChild(bg);

      const label = PixiPremiumScene.text(item.label, {
        fontSize: Math.round(19 * s), fontWeight: '800',
        fill: item.danger ? '#ff8a98' : (focus ? cols.text : PixiPremiumScene.alpha(cols.text, 'dd')),
      });
      label.anchor.set(0, 0.5);
      label.x = 22;
      label.y = Math.round(h / 2);
      PixiPremiumScene.fit(label, ctrlX - 36, 0.7);
      group.addChild(label);

      const c = new PIXI.Container();
      c.x = ctrlX;
      group.addChild(c);
      if (item.type === 'choice') this._drawChoice(c, item, ctrlW, h, focus, cols);
      else if (item.type === 'toggle') this._drawToggle(c, item, ctrlW, h, cols);
      else if (item.type === 'slider') this._drawSlider(c, item, ctrlW, h, cols, row);
      else this._drawLink(c, item, ctrlW, h, focus, cols);
    };

    const localX = (e) => e.getLocalPosition(group).x - ctrlX;
    group.on('pointerover', () => this._setFocus(index));
    group.on('pointerdown', (e) => {
      this._setFocus(index);
      const lx = localX(e);
      if (item.type === 'choice') {
        this._click();
        item.step(lx < ctrlW / 2 && lx >= 0 ? -1 : 1);
      } else if (item.type === 'toggle') {
        this._click();
        item.set(!item.get());
        row.redraw();
      } else if (item.type === 'slider') {
        row.dragging = true;
        this._slideTo(row, lx);
      } else {
        this._click();
        item.action();
      }
    });
    group.on('globalpointermove', (e) => { if (row.dragging) this._slideTo(row, localX(e)); });
    group.on('pointerup', () => { row.dragging = false; });
    group.on('pointerupoutside', () => { row.dragging = false; });
    return row;
  },

  _click() {
    if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
  },

  _slideTo(row, lx) {
    const item = row.item;
    const t = Math.max(0, Math.min(1, (lx - row.barX) / row.barW));
    const raw = item.min + t * (item.max - item.min);
    const v = Math.round(raw / item.stepSize) * item.stepSize;
    const clamped = Math.round(Math.max(item.min, Math.min(item.max, v)) * 100) / 100;
    if (clamped !== item.get()) { item.set(clamped); row.redraw(); }
  },

  // < value > with a pip for every choice.
  _drawChoice(c, item, w, h, focus, cols) {
    const s = Layout.uiScale || 1;
    const accent = PixiPremiumScene.color(cols.accent);
    const g = new PIXI.Graphics();
    const a = Math.round(7 * s);
    const cy = Math.round(h / 2) - (item.pips ? 4 : 0);
    const arrow = (x, dir) => {
      // Tip at x, widening away from it.
      for (let i = 0; i < a; i++) {
        const len = i * 2 + 1;
        g.rect(dir < 0 ? x + i : x - i, cy - i, 1, len);
      }
    };
    arrow(8, -1);
    arrow(w - 9, 1);
    g.fill({ color: focus ? accent : PixiPremiumScene.color(cols.text), alpha: focus ? 1 : 0.55 });
    c.addChild(g);
    const value = PixiPremiumScene.text(item.value(), { fontSize: Math.round(18 * s), fontWeight: '800', fill: focus ? cols.accent : cols.text });
    value.anchor.set(0.5);
    value.x = Math.round(w / 2);
    value.y = cy;
    PixiPremiumScene.fit(value, w - 60, 0.6);
    c.addChild(value);
    if (item.pips) {
      const { count, index } = item.pips();
      const pw = Math.round(10 * s), ph = 3, pg = 5;
      const total = count * pw + (count - 1) * pg;
      const px = Math.round((w - total) / 2);
      const pips = new PIXI.Graphics();
      for (let i = 0; i < count; i++) {
        pips.rect(px + i * (pw + pg), cy + Math.round(15 * s), pw, ph).fill({ color: i === index ? accent : 0xffffff, alpha: i === index ? 1 : 0.18 });
      }
      c.addChild(pips);
    }
  },

  // Two-part OFF / ON switch.
  _drawToggle(c, item, w, h, cols) {
    const s = Layout.uiScale || 1;
    const on = item.get();
    const sw = Math.round(140 * s), sh = Math.round(32 * s);
    const x0 = w - sw - 4, y0 = Math.round((h - sh) / 2);
    const accent = PixiPremiumScene.color(cols.accent);
    const g = new PIXI.Graphics();
    g.poly(PixiPremiumScene.pixelShape(x0, y0, sw, sh, 2)).fill({ color: 0x05070d, alpha: 0.75 });
    const half = sw / 2;
    const litX = on ? x0 + half : x0;
    g.poly(PixiPremiumScene.pixelShape(litX + 3, y0 + 3, half - 6, sh - 6, 2)).fill({ color: on ? accent : 0x6a7080, alpha: on ? 0.95 : 0.6 });
    c.addChild(g);
    [['OFF', x0 + half / 2, !on], ['ON', x0 + half * 1.5, on]].forEach(([txt, cx, lit]) => {
      const t = PixiPremiumScene.text(txt, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(13 * s), fill: lit ? (on ? '#10131c' : '#ffffff') : PixiPremiumScene.alpha(cols.text, '66') });
      t.anchor.set(0.5);
      t.x = Math.round(cx);
      t.y = Math.round(h / 2);
      c.addChild(t);
    });
  },

  // Segmented bar with the value on the right.
  _drawSlider(c, item, w, h, cols, row) {
    const s = Layout.uiScale || 1;
    const v = item.get();
    const t = (v - item.min) / (item.max - item.min);
    const valueW = Math.round(62 * s);
    const barW = w - valueW - 10;
    const segs = 20, gap = 2;
    const segW = (barW - gap * (segs - 1)) / segs;
    const bh = Math.round(18 * s), by = Math.round((h - bh) / 2);
    const accent = PixiPremiumScene.color(cols.accent);
    const g = new PIXI.Graphics();
    g.rect(-3, by - 3, barW + 6, bh + 6).fill({ color: 0x05070d, alpha: 0.7 });
    const lit = Math.round(t * segs);
    for (let i = 0; i < segs; i++) {
      const sx = Math.round(i * (segW + gap));
      g.rect(sx, by, Math.max(1, Math.round(segW)), bh).fill({ color: i < lit ? accent : 0xffffff, alpha: i < lit ? 0.5 + 0.5 * (i + 1) / segs : 0.1 });
    }
    c.addChild(g);
    row.barX = 0;
    row.barW = barW;
    const val = PixiPremiumScene.text(item.text(v), { fontSize: Math.round(18 * s), fontWeight: '900', fill: cols.accent });
    val.anchor.set(1, 0.5);
    val.x = w;
    val.y = Math.round(h / 2);
    c.addChild(val);
  },

  _drawLink(c, item, w, h, focus, cols) {
    const s = Layout.uiScale || 1;
    const color = item.danger ? '#ff8a98' : cols.accent;
    const g = new PIXI.Graphics();
    const a = Math.round(7 * s), cy = Math.round(h / 2), x = w - 8;
    for (let i = 0; i < a; i++) g.rect(x - i, cy - i, 1, i * 2 + 1);
    g.fill({ color: PixiPremiumScene.color(color), alpha: focus ? 1 : 0.6 });
    c.addChild(g);
    if (item.value) {
      const t = PixiPremiumScene.text(item.value(), { fontSize: Math.round(17 * s), fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, 'aa') });
      t.anchor.set(1, 0.5);
      t.x = w - 24;
      t.y = cy;
      PixiPremiumScene.fit(t, w - 40, 0.6);
      c.addChild(t);
    }
  },

  // Pixel icons for the tabs, drawn from small grids (a = accent, w = light,
  // d = dark accent, s = shine) with an automatic dark outline.
  ICONS: {
    monitor: [
      'wwwwwwwwwwww',
      'waaaaaaaasaw',
      'waaaaaaasaaw',
      'waaaaaasaaaw',
      'waaaaaaaaaaw',
      'wdddddddddaw',
      'wwwwwwwwwwww',
      '.....ww.....',
      '.....ww.....',
      '...wwwwww...',
    ],
    gem: [
      '...aaaaaa...',
      '..assaaaada.',
      '.assaaaaadda',
      'aaaaaaaaaaaa',
      '.aaaaaaaadd.',
      '..aaaaaadd..',
      '...aaaadd...',
      '....aadd....',
      '.....ad.....',
    ],
    speaker: [
      '.....w......',
      '....ww...a..',
      '...www....a.',
      'wwwwww..a..a',
      'wwwwww...a.a',
      'wwwwww...a.a',
      'wwwwww..a..a',
      '...www....a.',
      '....ww...a..',
      '.....w......',
    ],
  },

  _icon(name, size) {
    const cols = ThemeManager.getCurrentColors();
    const grid = name === 'gear' ? this._gearGrid() : this.ICONS[name];
    const rows = grid.length, colsN = grid[0].length;
    const px = Math.max(2, Math.floor(size / (Math.max(rows, colsN) + 2)));
    const palette = {
      a: PixiPremiumScene.color(cols.accent),
      d: PixiColorUtil.hexToNum(PixiColorUtil.darken(cols.accent, 30)),
      w: PixiPremiumScene.color(cols.text),
      s: 0xffffff,
    };
    const g = new PIXI.Graphics();
    const filled = (r, c) => r >= 0 && r < rows && c >= 0 && c < colsN && grid[r][c] !== '.';
    const ox = -Math.round(colsN * px / 2), oy = -Math.round(rows * px / 2);
    // Outline first, then the colours on top.
    for (let r = -1; r <= rows; r++) {
      for (let c = -1; c <= colsN; c++) {
        if (filled(r, c)) continue;
        if (filled(r - 1, c) || filled(r + 1, c) || filled(r, c - 1) || filled(r, c + 1)) {
          g.rect(ox + c * px, oy + r * px, px, px).fill({ color: 0x07080d, alpha: 0.9 });
        }
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < colsN; c++) {
        const ch = grid[r][c];
        if (ch !== '.') g.rect(ox + c * px, oy + r * px, px, px).fill({ color: palette[ch] });
      }
    }
    return g;
  },

  // A 12x12 cog: eight teeth round a ring with a hole.
  _gearGrid() {
    const out = [];
    for (let r = 0; r < 12; r++) {
      let line = '';
      for (let c = 0; c < 12; c++) {
        const dx = c - 5.5, dy = r - 5.5;
        const d = Math.hypot(dx, dy);
        const tooth = Math.cos(8 * Math.atan2(dy, dx)) > 0.2;
        if (d < 1.9) line += '.';
        else if (d < 4.3) line += d < 2.9 ? 'w' : (dy < 0 ? 'a' : 'd');
        else if (d < 6 && tooth) line += 'a';
        else line += '.';
      }
      out.push(line);
    }
    return out;
  },

  // ---------- Modals ----------

  _openFeedback() {
    this.feedbackOpen = true;
    this.feedbackCategory = 'feature';
    this.feedbackSending = false;
    this.feedbackDone = false;
    this._refresh();
    this._createTextarea();
  },

  buildResetModal() {
    const cols = ThemeManager.getCurrentColors();
    const s = Layout.uiScale || 1;
    const ui = this._ui;
    const modalW = Math.min(440, Layout.W - 60);
    const modalH = 236;
    const modalX = (Layout.W - modalW) / 2;
    const modalY = (Layout.H - modalH) / 2;
    const dim = new PIXI.Graphics().rect(0, 0, Layout.W, Layout.H).fill({ color: 0x000000, alpha: 0.62 });
    dim.eventMode = 'static';
    ui.addChild(dim);
    PixiPremiumScene.panel(ui, modalX, modalY, modalW, modalH, { accent: '#ff6578', accentAlpha: 0.86, alpha: 0.94 });
    const icon = new PIXI.Sprite(PixiPremiumAssets.icon('lock'));
    icon.width = 58;
    icon.height = 58;
    icon.x = Layout.cx - 29;
    icon.y = modalY + 26;
    ui.addChild(icon);
    const title = PixiPremiumScene.text('Reset all progress?', { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(22 * s), fontWeight: 'bold', fill: cols.text });
    title.anchor.set(0.5);
    title.x = Layout.cx;
    title.y = modalY + 108;
    PixiPremiumScene.fit(title, modalW - 40);
    ui.addChild(title);
    const sub = PixiPremiumScene.text('This clears story saves, unlocks, and stats.', { fontSize: Math.round(17 * s), fill: PixiPremiumScene.alpha(cols.text, 'aa') });
    sub.anchor.set(0.5);
    sub.x = Layout.cx;
    sub.y = modalY + 142;
    PixiPremiumScene.fit(sub, modalW - 40);
    ui.addChild(sub);
    PixiPremiumScene.button(ui, Layout.cx - 178, modalY + 176, 150, 42, 'Reset', () => {
      store.resetProgress();
      this.confirmReset = false;
      this.settings = { ...store.get('settings') };
      this._refresh();
    }, { primary: true, color: '#ff6578' });
    PixiPremiumScene.button(ui, Layout.cx + 28, modalY + 176, 150, 42, 'Cancel', () => {
      this.confirmReset = false;
      this._refresh();
    });
  },

  _feedbackBox() {
    const modalW = Math.min(520, Layout.W - 60);
    const modalH = 420;
    return { modalW, modalH, modalX: (Layout.W - modalW) / 2, modalY: (Layout.H - modalH) / 2 };
  },

  buildFeedbackModal() {
    const cols = ThemeManager.getCurrentColors();
    const s = Layout.uiScale || 1;
    const ui = this._ui;
    const { modalW, modalH, modalX, modalY } = this._feedbackBox();

    const dim = new PIXI.Graphics().rect(0, 0, Layout.W, Layout.H).fill({ color: 0x000000, alpha: 0.82 });
    dim.eventMode = 'static';
    ui.addChild(dim);
    PixiPremiumScene.panel(ui, modalX, modalY, modalW, modalH, { accent: cols.accent, accentAlpha: 0.86, alpha: 0.96 });

    const title = PixiPremiumScene.text('Send Feedback', { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(22 * s), fontWeight: 'bold', fill: cols.text });
    title.anchor.set(0.5, 0);
    title.x = Layout.cx;
    title.y = modalY + 24;
    ui.addChild(title);
    const sub = PixiPremiumScene.text('Suggest a feature, report a bug, or share ideas', { fontSize: Math.round(15 * s), fill: PixiPremiumScene.alpha(cols.text, 'aa') });
    sub.anchor.set(0.5, 0);
    sub.x = Layout.cx;
    sub.y = modalY + 56;
    PixiPremiumScene.fit(sub, modalW - 40);
    ui.addChild(sub);

    const categories = [
      { key: 'feature', label: 'Feature' },
      { key: 'bug', label: 'Bug' },
      { key: 'other', label: 'Other' },
    ];
    const catW = 120;
    const catGap = 12;
    const catStartX = Layout.cx - (catW * 3 + catGap * 2) / 2;
    categories.forEach((cat, i) => {
      PixiPremiumScene.button(ui, catStartX + i * (catW + catGap), modalY + 84, catW, 34, cat.label, () => {
        this.feedbackCategory = cat.key;
        const text = this._feedbackTextarea ? this._feedbackTextarea.value : '';
        this._refresh();
        this._createTextarea();
        if (this._feedbackTextarea) this._feedbackTextarea.value = text;
      }, { primary: this.feedbackCategory === cat.key });
    });

    const textBg = new PIXI.Graphics()
      .poly(PixiPremiumScene.pixelShape(modalX + 24, modalY + 130, modalW - 48, 180, 3))
      .fill({ color: 0x000000, alpha: 0.35 })
      .poly(PixiPremiumScene.pixelShape(modalX + 24, modalY + 130, modalW - 48, 180, 3))
      .stroke({ color: PixiPremiumScene.color(cols.accent), width: 2, alpha: 0.4, alignment: 1 });
    ui.addChild(textBg);

    const charCount = PixiPremiumScene.text('0 / 2000', { fontSize: Math.round(13 * s), fill: PixiPremiumScene.alpha(cols.text, '55') });
    charCount.anchor.set(1, 0);
    charCount.x = modalX + modalW - 28;
    charCount.y = modalY + 314;
    ui.addChild(charCount);
    this._feedbackCharCount = charCount;

    if (this.feedbackDone) {
      const doneText = PixiPremiumScene.text('Feedback sent! Thank you.', { fontSize: Math.round(20 * s), fontWeight: '900', fill: '#7dea99' });
      doneText.anchor.set(0.5, 0);
      doneText.x = Layout.cx;
      doneText.y = modalY + 330;
      ui.addChild(doneText);
      PixiPremiumScene.button(ui, Layout.cx - 75, modalY + 366, 150, 40, 'Done', () => this._closeFeedback());
    } else {
      PixiPremiumScene.button(ui, Layout.cx - 178, modalY + 366, 150, 40, this.feedbackSending ? 'Sending...' : 'Submit', () => {
        if (!this.feedbackSending) this._submitFeedback();
      }, { primary: true });
      PixiPremiumScene.button(ui, Layout.cx + 28, modalY + 366, 150, 40, 'Cancel', () => this._closeFeedback());
    }
  },

  _closeFeedback() {
    this.feedbackOpen = false;
    this._removeTextarea();
    this._refresh();
  },

  _createTextarea() {
    this._removeTextarea();
    const shell = document.getElementById('gameShell');
    const rect = shell.getBoundingClientRect();
    const { modalW, modalX, modalY } = this._feedbackBox();
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
      if (this._feedbackCharCount) this._feedbackCharCount.text = ta.value.length + ' / 2000';
    });
    ta.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') this._closeFeedback();
    });
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
    this._refresh();
    this._createTextarea();
    if (this._feedbackTextarea) this._feedbackTextarea.value = text;

    fetch('https://game.altobolt.com/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, category: this.feedbackCategory }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success || data.issue_url) this.feedbackDone = true;
        this.feedbackSending = false;
        this._refresh();
        if (this.feedbackDone) this._removeTextarea();
      })
      .catch(() => {
        this.feedbackSending = false;
        this._refresh();
        this._createTextarea();
        if (this._feedbackTextarea) {
          this._feedbackTextarea.value = text;
          this._feedbackTextarea.placeholder = 'Network error. Please try again.';
        }
      });
  },

  // ---------- Input ----------

  handleKeyDown(e) {
    if (this.feedbackOpen) {
      if (e.key === 'Escape') this._closeFeedback();
      return;
    }
    if (this.confirmReset) {
      if (e.key === 'Escape') { this.confirmReset = false; this._refresh(); }
      return;
    }
    const tabIds = this.TABS.map(t => t.id);
    const ti = tabIds.indexOf(this._tab);
    if (e.key === 'q' || e.key === 'Q' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      this._selectTab(tabIds[(ti + tabIds.length - 1) % tabIds.length]);
      return;
    }
    if (e.key === 'e' || e.key === 'E' || e.key === 'Tab') {
      e.preventDefault();
      this._selectTab(tabIds[(ti + 1) % tabIds.length]);
      return;
    }
    const n = this._rows.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!n) return;
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      this._setFocus(this._rowIndex < 0 ? 0 : (this._rowIndex + dir + n) % n);
      return;
    }
    const row = this._rows[this._rowIndex];
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && row) {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const item = row.item;
      if (item.type === 'choice') { this._click(); item.step(dir); }
      else if (item.type === 'toggle') { this._click(); item.set(dir > 0); row.redraw(); }
      else if (item.type === 'slider') {
        const v = Math.round(Math.max(item.min, Math.min(item.max, item.get() + dir * item.stepSize)) * 100) / 100;
        item.set(v);
        row.redraw();
      }
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && row) {
      e.preventDefault();
      const item = row.item;
      this._click();
      if (item.type === 'choice') item.step(1);
      else if (item.type === 'toggle') { item.set(!item.get()); row.redraw(); }
      else if (item.type === 'link') item.action();
      return;
    }
    if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      this.goBack();
    }
  },

  goBack() {
    if (this._returnTo === 'game') switchScreen('game', { resume: true });
    else switchScreen(this._returnTo || 'home');
  },
};
