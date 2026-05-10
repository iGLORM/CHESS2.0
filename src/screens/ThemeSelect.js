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
    const subtitle = Layout.isPortrait ? 'Gallery above, custom editor below' : 'Gallery on the left, custom editor on the right';
    this.pixiContainer = PixiPremiumScene.root('Theme Select', subtitle, { footerHint: 'Locked themes unlock through story progress' });
    PixiScreenManager.setScreenContainer(this.pixiContainer);
    this.buildGallery();
    this.buildDrawer();
    const btnY = Layout.H - 82;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen(this.returnScreen), { icon: 'back' });
  },

  buildGallery() {
    const portrait = Layout.isPortrait;
    const galleryCols = portrait ? 2 : 3;
    const cardW = portrait ? Math.floor((Layout.W - 80 - 18) / 2) : 246;
    const cardH = 118;
    const gap = 18;
    const startX = portrait ? 40 : 66;
    const startY = 134;
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
          const preview = new PIXI.Sprite(PixiPremiumAssets.theme(theme.id));
          preview.width = cardW - 18;
          preview.height = cardH - 18;
          preview.x = 9;
          preview.y = 9;
          preview.alpha = unlocked ? 0.86 : 0.28;
          card.addChild(preview);

          const shade = new PIXI.Graphics().roundRect(9, 62, cardW - 18, 47, 6).fill({ color: 0x020812, alpha: 0.68 });
          card.addChild(shade);

          if (!unlocked) {
            const lock = new PIXI.Sprite(PixiPremiumAssets.icon('lock'));
            lock.width = 42;
            lock.height = 42;
            lock.x = cardW / 2 - 21;
            lock.y = 30;
            card.addChild(lock);
          }

          const name = PixiPremiumScene.text(unlocked ? theme.name : 'Locked Theme', {
            fontSize: 18,
            fontWeight: '900',
            fill: unlocked ? theme.colors.text : PixiPremiumScene.alpha(ThemeManager.getCurrentColors().text, '88'),
          });
          name.x = 20;
          name.y = 68;
          PixiPremiumScene.fit(name, 190, 0.56);
          card.addChild(name);

          const desc = PixiPremiumScene.text(unlocked ? theme.desc : this.unlockLabel(theme.id), {
            fontSize: 13,
            fill: unlocked ? PixiColorUtil.alpha(theme.colors.text, 'aa') : PixiPremiumScene.alpha(ThemeManager.getCurrentColors().text, '66'),
          });
          desc.x = 20;
          desc.y = 92;
          PixiPremiumScene.fit(desc, 196, 0.5);
          card.addChild(desc);

          if (active) {
            const tag = PixiPremiumScene.text('ACTIVE', { fontSize: 12, fontWeight: '900', fill: theme.colors.accent });
            tag.anchor.set(1, 0);
            tag.x = cardW - 18;
            tag.y = 68;
            card.addChild(tag);
          }
        },
      });
    });
  },

  buildDrawer() {
    const cols = ThemeManager.getCurrentColors();
    const theme = ThemeManager.getTheme(this.selectedThemeId || store.get('theme'));
    const portrait = Layout.isPortrait;

    // In portrait, compute gallery bottom to position drawer below it
    const galleryCols = portrait ? 2 : 3;
    const galleryRows = Math.ceil(this.themes.length / galleryCols);
    const drawerX = portrait ? Math.floor((Layout.W - 720) / 2) : 884;
    const drawerY = portrait ? (134 + galleryRows * (118 + 18) + 10) : 134;
    const drawerW = portrait ? 720 : 330;
    const drawerH = portrait ? 480 : 528;
    PixiPremiumScene.panel(this.pixiContainer, drawerX, drawerY, drawerW, drawerH, { accent: theme.colors.accent, accentAlpha: 0.72 });

    const innerX = drawerX + 24;
    const previewW = portrait ? 320 : 282;
    const previewH = portrait ? 180 : 158;
    const preview = new PIXI.Sprite(PixiPremiumAssets.theme(theme.id));
    preview.width = previewW;
    preview.height = previewH;
    preview.x = innerX;
    preview.y = drawerY + 32;
    this.pixiContainer.addChild(preview);

    const infoX = portrait ? (innerX + previewW + 24) : innerX;
    const infoY = portrait ? (drawerY + 32) : (drawerY + 208);
    const infoMaxW = portrait ? (drawerW - previewW - 72) : 280;
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

    const btnY = portrait ? (infoY + 70) : (drawerY + 294);
    const btnW = portrait ? Math.min(infoMaxW, 282) : 282;
    if (theme.id !== 'custom') {
      PixiPremiumScene.button(this.pixiContainer, infoX, btnY, btnW, 46, store.get('theme') === theme.id ? 'Applied' : 'Apply Theme', () => this.selectTheme(theme.id, true), { primary: store.get('theme') !== theme.id, icon: 'spark' });
      this.palettePreview(theme, infoX, btnY + 72);
      return;
    }

    this.customEditor(innerX, drawerY + 284);
  },

  palettePreview(theme, x, y) {
    const colors = ['lightSquare', 'darkSquare', 'lightPiece', 'darkPiece', 'accent', 'background'];
    colors.forEach((key, i) => {
      const chip = new PIXI.Graphics()
        .roundRect(x + (i % 3) * 48, y + Math.floor(i / 3) * 48, 36, 36, 6)
        .fill(PixiPremiumScene.color(theme.colors[key]))
        .roundRect(x + (i % 3) * 48, y + Math.floor(i / 3) * 48, 36, 36, 6)
        .stroke({ color: 0xffffff, alpha: 0.25, width: 2 });
      this.pixiContainer.addChild(chip);
    });
  },

  customEditor(x, y) {
    const cols = ThemeManager.getCurrentColors();
    const custom = ThemeManager.getTheme('custom');
    const colorKeys = ['lightSquare', 'darkSquare', 'lightPiece', 'darkPiece', 'highlight', 'background', 'panel', 'text', 'accent', 'buttonBg'];
    const presets = ['#ff6578', '#7dea99', '#6aa7ff', '#ffe17a', '#d24dff', '#4dd7d0', '#ffffff', '#101423', '#8b9dc3', '#ff9a4d', '#905cff', '#21a9ff', '#7a4b2a', '#2e8b57', '#59172a'];

    const heading = PixiPremiumScene.text('Custom Palette', { fontSize: 18, fontWeight: '900', fill: cols.text });
    heading.x = x;
    heading.y = y;
    this.pixiContainer.addChild(heading);

    colorKeys.forEach((key, i) => {
      const sx = x + (i % 5) * 54;
      const sy = y + 38 + Math.floor(i / 5) * 66;
      const group = new PIXI.Container();
      group.x = sx;
      group.y = sy;
      group.eventMode = 'static';
      group.cursor = 'pointer';
      group.hitArea = new PIXI.Rectangle(0, 0, 42, 56);
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
        .roundRect(0, 0, 38, 38, 6)
        .fill(PixiPremiumScene.color(custom.colors[key]))
        .roundRect(0, 0, 38, 38, 6)
        .stroke({ color: PixiPremiumScene.color(cols.text), alpha: 0.35, width: 2 });
      group.addChild(chip);
      const label = PixiPremiumScene.text(key.replace('Square', ''), { fontSize: 10, fill: PixiPremiumScene.alpha(cols.text, '99') });
      label.anchor.set(0.5, 0);
      label.x = 19;
      label.y = 43;
      PixiPremiumScene.fit(label, 52, 0.48);
      group.addChild(label);
      this.pixiContainer.addChild(group);
    });

    this.themeChips('Music', store.get('customMusicTheme') || 'space', x, y + 190, (id) => {
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
    this.themeChips('Backdrop', store.get('customBgTheme') || 'space', x, y + 266, (id) => {
      store.set('customBgTheme', id);
      store.saveProgress();
      this.build();
    });

    PixiPremiumScene.button(this.pixiContainer, x, y + 190, 282, 42, store.get('theme') === 'custom' ? 'Custom Applied' : 'Apply Custom', () => this.selectTheme('custom', true), { primary: true });
  },

  themeChips(label, current, x, y, onPick) {
    const cols = ThemeManager.getCurrentColors();
    const t = PixiPremiumScene.text(label, { fontSize: 15, fontWeight: '900', fill: cols.text });
    t.x = x;
    t.y = y;
    this.pixiContainer.addChild(t);
    const baseThemes = this.themes.filter(theme => theme.id !== 'custom').slice(0, 10);
    baseThemes.forEach((theme, i) => {
      const chip = PixiPremiumScene.button(this.pixiContainer, x + (i % 5) * 56, y + 28 + Math.floor(i / 5) * 30, 48, 22, theme.name.split(' ')[0], () => onPick(theme.id), {
        primary: theme.id === current,
        fontSize: 10,
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
