const ThemeSelect = {
  isPixiScreen: true,
  pixiContainer: null,
  themes: [],
  returnScreen: 'home',
  selectedThemeId: null,

  init(data) {
    this.themes = ThemeManager.getAllThemes();
    this.returnScreen = data?.returnTo || 'home';
    this.selectedThemeId = store.get('theme') || 'space';
    const settings = store.get('settings') || {};
    if (settings.bossThemeEnabled !== false) {
      this._buildLockedScreen();
      return;
    }
    this.build();
  },

  _buildLockedScreen() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Theme Select', 'Theme is controlled by boss world', {});
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const s = Layout.uiScale || 1;
    const cols = ThemeManager.getCurrentColors();
    const panelW = Math.min(Layout.isPortrait ? 620 : 500, Layout.W - 80);
    const panelH = Math.round(300 * s);
    const px = Layout.cx - panelW / 2;
    const py = Layout.cy - panelH / 2 - 20;
    PixiPremiumScene.panel(this.pixiContainer, px, py, panelW, panelH, { accentAlpha: 0.5 });

    const icon = new PIXI.Graphics();
    icon.rect(0, 4, 40, 32).fill({ color: PixiColorUtil.hexToNum(cols.accent), alpha: 0.25 });
    icon.rect(14, 0, 12, 8).fill({ color: PixiColorUtil.hexToNum(cols.accent), alpha: 0.6 });
    icon.x = Layout.cx - 20;
    icon.y = py + 28;
    this.pixiContainer.addChild(icon);

    const title = PixiPremiumScene.text('Boss World Theme Active', { fontSize: Math.round(24 * s), fontWeight: '900', fill: cols.text });
    title.anchor.set(0.5, 0);
    title.x = Layout.cx;
    title.y = py + 72;
    this.pixiContainer.addChild(title);

    const desc = PixiPremiumScene.text('The theme changes automatically\nbased on the boss you fight.\n\nDisable "Boss World Theme" in Settings\nto pick themes manually.', { fontSize: Math.round(16 * s), fill: PixiPremiumScene.alpha(cols.text, 'aa'), lineHeight: Math.round(24 * s) });
    desc.anchor.set(0.5, 0);
    desc.x = Layout.cx;
    desc.y = py + 110;
    this.pixiContainer.addChild(desc);

    const btnY = Layout.H - 82;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen(this.returnScreen), { icon: 'back' });
    PixiPremiumScene.button(this.pixiContainer, Layout.cx - 80, py + panelH - 60, 160, 44, 'Settings', () => switchScreen('settings'), { primary: true });
  },

  destroy() {
    PixiPremiumScene.destroy(this);
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    const subtitle = Layout.isPortrait ? 'Gallery above, preview below' : 'Gallery on the left, custom editor on the right';
    this.pixiContainer = PixiPremiumScene.root('Theme Select', subtitle, { footerHint: 'Locked themes unlock through story progress' });
    PixiScreenManager.setScreenContainer(this.pixiContainer);
    this.buildGallery();
    this.buildDrawer();
    const btnY = Layout.H - 82;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen(this.returnScreen), { icon: 'back' });
  },

  buildGallery() {
    const s = Layout.uiScale || 1;
    const portrait = Layout.isPortrait;
    const galleryCols = portrait ? 2 : 3;
    const gap = Math.round(18 * s);
    const cardW = portrait ? Math.floor((Layout.W - 80 - gap) / galleryCols) : 246;
    const cardH = Math.round(118 * s);
    const startX = portrait ? 40 : 66;
    const startY = 134;
    const nameFontSize = Math.round(18 * s);
    const descFontSize = Math.round(13 * s);
    const tagFontSize = Math.round(12 * s);
    const nameMaxW = Math.round(cardW * 0.72);
    const descMaxW = Math.round(cardW * 0.75);
    this.themes.forEach((theme, i) => {
      const row = Math.floor(i / galleryCols);
      const col = i % galleryCols;
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const unlocked = ThemeManager.isThemeUnlocked(theme.id);
      const active = store.get('theme') === theme.id;
      PixiPremiumScene.card(this.pixiContainer, x, y, cardW, cardH, {
        active,
        disabled: !unlocked,
        activeColor: theme.colors.accent,
        onClick: () => this.selectTheme(theme.id, unlocked),
        draw: (card) => {
          const padInner = Math.round(9 * s);
          const preview = new PIXI.Sprite(PixiPremiumAssets.theme(theme.id));
          preview.width = cardW - padInner * 2;
          preview.height = cardH - padInner * 2;
          preview.x = padInner;
          preview.y = padInner;
          preview.alpha = unlocked ? 0.86 : 0.28;
          card.addChild(preview);

          const shadeTop = Math.round(cardH * 0.525);
          const shade = new PIXI.Graphics().roundRect(padInner, shadeTop, cardW - padInner * 2, cardH - shadeTop - padInner, 6).fill({ color: 0x020812, alpha: 0.68 });
          card.addChild(shade);

          if (!unlocked) {
            const lockSize = Math.round(42 * s);
            const lock = new PIXI.Sprite(PixiPremiumAssets.icon('lock'));
            lock.width = lockSize;
            lock.height = lockSize;
            lock.x = cardW / 2 - lockSize / 2;
            lock.y = Math.round(30 * s);
            card.addChild(lock);
          }

          const nameY = shadeTop + Math.round(6 * s);
          const name = PixiPremiumScene.text(unlocked ? theme.name : 'Locked Theme', {
            fontSize: nameFontSize,
            fontWeight: '900',
            fill: unlocked ? theme.colors.text : PixiPremiumScene.alpha(ThemeManager.getCurrentColors().text, '88'),
          });
          name.x = Math.round(20 * s);
          name.y = nameY;
          PixiPremiumScene.fit(name, nameMaxW, 0.56);
          card.addChild(name);

          const desc = PixiPremiumScene.text(unlocked ? theme.desc : this.unlockLabel(theme.id), {
            fontSize: descFontSize,
            fill: unlocked ? PixiColorUtil.alpha(theme.colors.text, 'aa') : PixiPremiumScene.alpha(ThemeManager.getCurrentColors().text, '66'),
          });
          desc.x = Math.round(20 * s);
          desc.y = nameY + Math.round(24 * s);
          PixiPremiumScene.fit(desc, descMaxW, 0.5);
          card.addChild(desc);

          if (active) {
            const tag = PixiPremiumScene.text('ACTIVE', { fontSize: tagFontSize, fontWeight: '900', fill: theme.colors.accent });
            tag.anchor.set(1, 0);
            tag.x = cardW - Math.round(18 * s);
            tag.y = nameY;
            card.addChild(tag);
          }
        },
      });
    });
  },

  buildDrawer() {
    const s = Layout.uiScale || 1;
    const cols = ThemeManager.getCurrentColors();
    const theme = ThemeManager.getTheme(this.selectedThemeId || store.get('theme'));
    const portrait = Layout.isPortrait;

    const galleryCols = portrait ? 2 : 3;
    const galleryRows = Math.ceil(this.themes.length / galleryCols);
    const galleryGap = Math.round(18 * s);
    const galleryCardH = Math.round(118 * s);

    if (portrait) {
      const drawerW = Math.min(720, Layout.W - 80);
      const drawerX = Math.floor((Layout.W - drawerW) / 2);
      const drawerY = 134 + galleryRows * (galleryCardH + galleryGap) + 10;
      const drawerH = 380;
      PixiPremiumScene.panel(this.pixiContainer, drawerX, drawerY, drawerW, drawerH, { accent: theme.colors.accent, accentAlpha: 0.72 });

      const innerX = drawerX + 24;
      const previewW = Math.min(Math.round(drawerW * 0.42), 280);
      const previewH = Math.round(previewW * 0.56);
      const preview = new PIXI.Sprite(PixiPremiumAssets.theme(theme.id));
      preview.width = previewW;
      preview.height = previewH;
      preview.x = innerX;
      preview.y = drawerY + 32;
      this.pixiContainer.addChild(preview);

      const infoX = innerX + previewW + 20;
      const infoY = drawerY + 32;
      const infoMaxW = drawerW - previewW - 68;
      const title = PixiPremiumScene.text(theme.name, { fontSize: Math.round(22 * s), fontWeight: '900', fill: cols.text });
      title.x = infoX;
      title.y = infoY;
      PixiPremiumScene.fit(title, infoMaxW);
      this.pixiContainer.addChild(title);
      const desc = PixiPremiumScene.text(theme.desc, { fontSize: Math.round(14 * s), fill: PixiPremiumScene.alpha(cols.text, 'aa') });
      desc.x = infoX;
      desc.y = infoY + Math.round(30 * s);
      PixiPremiumScene.fit(desc, infoMaxW);
      this.pixiContainer.addChild(desc);

      const btnY = infoY + Math.round(60 * s);
      const btnW = Math.min(infoMaxW, 220);
      if (theme.id !== 'custom') {
        PixiPremiumScene.button(this.pixiContainer, infoX, btnY, btnW, 42, store.get('theme') === theme.id ? 'Applied' : 'Apply Theme', () => this.selectTheme(theme.id, true), { primary: store.get('theme') !== theme.id, icon: 'spark' });
        this.palettePreview(theme, innerX, drawerY + 32 + previewH + 16, s);
        return;
      }
      this.customEditor(innerX, drawerY + 32 + previewH + 16);
    } else {
      const drawerX = 884;
      const drawerY = 134;
      const drawerW = 330;
      const drawerH = 528;
      PixiPremiumScene.panel(this.pixiContainer, drawerX, drawerY, drawerW, drawerH, { accent: theme.colors.accent, accentAlpha: 0.72 });

      const innerX = drawerX + 24;
      const previewW = 282;
      const previewH = 158;
      const preview = new PIXI.Sprite(PixiPremiumAssets.theme(theme.id));
      preview.width = previewW;
      preview.height = previewH;
      preview.x = innerX;
      preview.y = drawerY + 32;
      this.pixiContainer.addChild(preview);

      const infoX = innerX;
      const infoY = drawerY + 208;
      const infoMaxW = 280;
      const title = PixiPremiumScene.text(theme.name, { fontSize: 26, fontWeight: '900', fill: cols.text });
      title.x = infoX;
      title.y = infoY;
      PixiPremiumScene.fit(title, infoMaxW);
      this.pixiContainer.addChild(title);
      const desc = PixiPremiumScene.text(theme.desc, { fontSize: 16, fill: PixiPremiumScene.alpha(cols.text, 'aa') });
      desc.x = infoX;
      desc.y = infoY + 34;
      PixiPremiumScene.fit(desc, infoMaxW);
      this.pixiContainer.addChild(desc);

      const btnY = drawerY + 294;
      const btnW = 282;
      if (theme.id !== 'custom') {
        PixiPremiumScene.button(this.pixiContainer, infoX, btnY, btnW, 46, store.get('theme') === theme.id ? 'Applied' : 'Apply Theme', () => this.selectTheme(theme.id, true), { primary: store.get('theme') !== theme.id, icon: 'spark' });
        this.palettePreview(theme, infoX, btnY + 72, 1);
        return;
      }
      this.customEditor(innerX, drawerY + 284);
    }
  },

  palettePreview(theme, x, y, s) {
    const chipSize = Math.round(36 * s);
    const chipGap = Math.round(48 * s);
    const colors = ['lightSquare', 'darkSquare', 'lightPiece', 'darkPiece', 'accent', 'background'];
    colors.forEach((key, i) => {
      const cx = x + (i % 3) * chipGap;
      const cy = y + Math.floor(i / 3) * chipGap;
      const chip = new PIXI.Graphics()
        .roundRect(cx, cy, chipSize, chipSize, 6)
        .fill(PixiPremiumScene.color(theme.colors[key]))
        .roundRect(cx, cy, chipSize, chipSize, 6)
        .stroke({ color: 0xffffff, alpha: 0.25, width: 2 });
      this.pixiContainer.addChild(chip);
    });
  },

  customEditor(x, y) {
    const s = Layout.uiScale || 1;
    const cols = ThemeManager.getCurrentColors();
    const custom = ThemeManager.getTheme('custom');
    const colorKeys = ['lightSquare', 'darkSquare', 'lightPiece', 'darkPiece', 'highlight', 'background', 'panel', 'text', 'accent', 'buttonBg'];
    const presets = ['#ff6578', '#7dea99', '#6aa7ff', '#ffe17a', '#d24dff', '#4dd7d0', '#ffffff', '#101423', '#8b9dc3', '#ff9a4d', '#905cff', '#21a9ff', '#7a4b2a', '#2e8b57', '#59172a'];

    const heading = PixiPremiumScene.text('Custom Palette', { fontSize: Math.round(18 * s), fontWeight: '900', fill: cols.text });
    heading.x = x;
    heading.y = y;
    this.pixiContainer.addChild(heading);

    const chipW = Math.round(38 * s);
    const chipGap = Math.round(54 * s);
    const chipRowH = Math.round(66 * s);
    colorKeys.forEach((key, i) => {
      const sx = x + (i % 5) * chipGap;
      const sy = y + Math.round(38 * s) + Math.floor(i / 5) * chipRowH;
      const group = new PIXI.Container();
      group.x = sx;
      group.y = sy;
      group.eventMode = 'static';
      group.cursor = 'pointer';
      group.hitArea = new PIXI.Rectangle(0, 0, chipW + 4, chipRowH - 10);
      group.on('pointerdown', () => {
        if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') {
          audioManager.playButton();
        }
        const current = custom.colors[key];
        const index = Math.max(0, presets.indexOf(current));
        ThemeManager.setCustomColor(key, presets[(index + 1) % presets.length]);
        ThemeManager.applyTheme('custom');
        this.selectedThemeId = 'custom';
        this.build();
      });
      const chip = new PIXI.Graphics()
        .roundRect(0, 0, chipW, chipW, 6)
        .fill(PixiPremiumScene.color(custom.colors[key]))
        .roundRect(0, 0, chipW, chipW, 6)
        .stroke({ color: PixiPremiumScene.color(cols.text), alpha: 0.35, width: 2 });
      group.addChild(chip);
      const label = PixiPremiumScene.text(key.replace('Square', ''), { fontSize: Math.round(10 * s), fill: PixiPremiumScene.alpha(cols.text, '99') });
      label.anchor.set(0.5, 0);
      label.x = chipW / 2;
      label.y = chipW + 5;
      PixiPremiumScene.fit(label, chipGap - 2, 0.48);
      group.addChild(label);
      this.pixiContainer.addChild(group);
    });

    PixiPremiumScene.button(this.pixiContainer, x, y + Math.round(190 * s), Math.round(282 * s), 42, store.get('theme') === 'custom' ? 'Custom Applied' : 'Apply Custom', () => this.selectTheme('custom', true), { primary: true });

    this.themeChips('Music', store.get('customMusicTheme') || 'space', x, y + Math.round(250 * s), (id) => {
      store.set('customMusicTheme', id);
      store.saveProgress();
      if (typeof audioManager !== 'undefined') {
        audioManager.stopMusic();
        audioManager.startMusic();
        if (typeof audioManager.playThemeStinger === 'function') {
          audioManager.playThemeStinger(id);
        }
      }
      this.build();
    });
    this.themeChips('Backdrop', store.get('customBgTheme') || 'space', x, y + Math.round(326 * s), (id) => {
      store.set('customBgTheme', id);
      store.saveProgress();
      this.build();
    });
  },

  themeChips(label, current, x, y, onPick) {
    const s = Layout.uiScale || 1;
    const cols = ThemeManager.getCurrentColors();
    const t = PixiPremiumScene.text(label, { fontSize: Math.round(15 * s), fontWeight: '900', fill: cols.text });
    t.x = x;
    t.y = y;
    this.pixiContainer.addChild(t);
    const chipW = Math.round(48 * s);
    const chipGap = Math.round(56 * s);
    const chipRowH = Math.round(30 * s);
    const baseThemes = this.themes.filter(theme => theme.id !== 'custom').slice(0, 10);
    baseThemes.forEach((theme, i) => {
      const chip = PixiPremiumScene.button(this.pixiContainer, x + (i % 5) * chipGap, y + Math.round(28 * s) + Math.floor(i / 5) * chipRowH, chipW, Math.round(22 * s), theme.name.split(' ')[0], () => onPick(theme.id), {
        primary: theme.id === current,
        fontSize: Math.round(10 * s),
        color: theme.colors.accent,
      });
      chip.scale.set(1);
    });
  },

  selectTheme(id, unlocked) {
    this.selectedThemeId = id;
    if (unlocked) {
      ThemeManager.applyTheme(id);
    }
    this.build();
  },

  unlockLabel(id) {
    const reqs = { egypt: 2, cyberpunk: 4, japanese: 5, artdeco: 6, wildwest: 7, prehistoric: 8, steampunk: 9 };
    return reqs[id] ? `Story Lv ${reqs[id]}` : 'Story locked';
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') switchScreen(this.returnScreen);
  },
};
