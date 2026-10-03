const ThemeSelect = {
  isPixiScreen: true,
  pixiContainer: null,
  themes: [],
  returnScreen: 'home',
  selectedThemeId: null,

  init(data) {
    this.themes = ThemeManager.getAllThemes();
    this.returnScreen = data?.returnTo || 'home';
    this.selectedThemeId = ThemeManager.menuThemeId();
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
    const subtitle = 'Your theme outside story mode. Story mode shows the world you are in.';
    this.pixiContainer = PixiPremiumScene.root('Theme Select', subtitle, { footerHint: 'Beat a world\'s guardian to unlock its theme' });
    PixiScreenManager.setScreenContainer(this.pixiContainer);
    this.buildGallery();
    this.buildDrawer();
    const btnY = PixiPremiumScene.bottomButtonY();
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen(this.returnScreen), { icon: 'back' });
  },

  GRID: { X: 60, Y: 150, GAP: 16, DRAWER_W: 360 },

  buildGallery() {
    const s = Layout.uiScale || 1;
    const portrait = Layout.isPortrait;
    const galleryCols = portrait ? 2 : 3;
    const G = this.GRID;
    const gap = portrait ? Math.round(18 * s) : G.GAP;
    const rows = Math.ceil(this.themes.length / galleryCols);
    const galleryW = Layout.W - G.X * 2 - G.GAP - G.DRAWER_W;
    const cardW = portrait ? Math.floor((Layout.W - 80 - gap) / galleryCols) : Math.floor((galleryW - gap * (galleryCols - 1)) / galleryCols);
    const cardH = portrait ? Math.round(118 * s) : Math.floor((PixiPremiumScene.contentBottom - G.Y - gap * (rows - 1)) / rows);
    const startX = portrait ? 40 : G.X;
    const startY = portrait ? 150 : G.Y;
    const nameFontSize = Math.round(18 * s);
    const descFontSize = Math.round(13 * s);
    const tagFontSize = Math.round(12 * s);
    const nameMaxW = Math.round(cardW * 0.72);
    const descMaxW = cardW - Math.round(9 * s) * 2 - 24;   // the card's whole inner width
    this.themes.forEach((theme, i) => {
      const row = Math.floor(i / galleryCols);
      const col = i % galleryCols;
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const unlocked = ThemeManager.isThemeUnlocked(theme.id);
      const active = ThemeManager.menuThemeId() === theme.id;
      PixiPremiumScene.card(this.pixiContainer, x, y, cardW, cardH, {
        active,
        disabled: !unlocked,
        activeColor: theme.colors.accent,
        accentStrip: false,
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
            const lockSize = 32;
            const lock = new PIXI.Sprite(PixiPremiumAssets.icon('lock'));
            lock.width = lockSize;
            lock.height = lockSize;
            lock.x = cardW - padInner - 8 - lockSize;
            lock.y = padInner + 8;
            card.addChild(lock);
          }

          const bandH = cardH - shadeTop - padInner;
          const nameY = shadeTop + Math.round((bandH - nameFontSize - 6 - descFontSize * 1.25) / 2) - 2;
          const name = PixiPremiumScene.text(unlocked ? theme.name : 'Locked Theme', {
            fontSize: nameFontSize,
            fontWeight: '900',
            fill: unlocked ? theme.colors.text : PixiPremiumScene.alpha(ThemeManager.getCurrentColors().text, '88'),
          });
          name.x = padInner + 12;
          name.y = nameY;
          PixiPremiumScene.fit(name, nameMaxW, 0.56);
          card.addChild(name);

          const desc = PixiPremiumScene.text(unlocked ? theme.desc : this.unlockLabel(theme.id), {
            fontSize: descFontSize,
            fill: unlocked ? PixiColorUtil.alpha(theme.colors.text, 'aa') : PixiPremiumScene.alpha(ThemeManager.getCurrentColors().text, '66'),
          });
          desc.x = padInner + 12;
          desc.y = nameY + nameFontSize + 6;
          PixiPremiumScene.fit(desc, descMaxW, 0.5);
          card.addChild(desc);

          if (active) {
            const tag = PixiPremiumScene.text('ACTIVE', { fontSize: tagFontSize, fontWeight: '900', fill: theme.colors.accent });
            tag.anchor.set(1, 0);
            tag.x = cardW - padInner - 12;
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
        PixiPremiumScene.button(this.pixiContainer, infoX, btnY, btnW, 42, ThemeManager.menuThemeId() === theme.id ? 'Applied' : 'Apply Theme', () => this.selectTheme(theme.id, true), { primary: ThemeManager.menuThemeId() !== theme.id, icon: 'spark' });
        this.palettePreview(theme, innerX, drawerY + 32 + previewH + 16, drawerW - 48);
        return;
      }
      this.customEditor(innerX, drawerY + 32 + previewH + 16, drawerW - 48);
    } else {
      const G = this.GRID;
      const drawerW = G.DRAWER_W;
      const drawerX = Layout.W - G.X - drawerW;
      const drawerY = G.Y;
      const drawerH = PixiPremiumScene.contentBottom - G.Y;
      PixiPremiumScene.panel(this.pixiContainer, drawerX, drawerY, drawerW, drawerH, { accent: theme.colors.accent, accentAlpha: 0.72 });

      const innerX = drawerX + 26;
      const previewW = drawerW - 52;
      const previewH = theme.id === 'custom' ? -12 : Math.round(previewW * 0.56);
      if (previewH > 0) {
        const preview = new PIXI.Sprite(PixiPremiumAssets.theme(theme.id));
        preview.width = previewW;
        preview.height = previewH;
        preview.x = innerX;
        preview.y = drawerY + 32;
        this.pixiContainer.addChild(preview);
      }

      const infoX = innerX;
      const infoY = drawerY + 32 + previewH + 20;
      const infoMaxW = previewW;
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

      const btnY = infoY + 78;
      const btnW = previewW;
      if (theme.id !== 'custom') {
        PixiPremiumScene.button(this.pixiContainer, infoX, btnY, btnW, 46, ThemeManager.menuThemeId() === theme.id ? 'Applied' : 'Apply Theme', () => this.selectTheme(theme.id, true), { primary: ThemeManager.menuThemeId() !== theme.id, icon: 'spark' });
        this.palettePreview(theme, infoX, btnY + 70, previewW);
        return;
      }
      this.customEditor(innerX, infoY + 70, previewW);
    }
  },

  // Six labelled colour chips in two rows of three, spread across width w.
  palettePreview(theme, x, y, w) {
    const cols = ThemeManager.getCurrentColors();
    const items = [['lightSquare', 'Light sq.'], ['darkSquare', 'Dark sq.'], ['accent', 'Accent'], ['lightPiece', 'White'], ['darkPiece', 'Black'], ['background', 'Backdrop']];
    const heading = PixiPremiumScene.text('Palette', { fontSize: 16, fontWeight: '800', fill: PixiPremiumScene.alpha(cols.text, 'aa') });
    heading.x = x;
    heading.y = y;
    this.pixiContainer.addChild(heading);
    const colW = Math.floor(w / 3);
    const chip = 36;
    items.forEach(([key, label], i) => {
      const cx = x + (i % 3) * colW + Math.round((colW - chip) / 2);
      const cy = y + 32 + Math.floor(i / 3) * 70;
      this.pixiContainer.addChild(new PIXI.Graphics()
        .roundRect(cx, cy, chip, chip, 6).fill(PixiPremiumScene.color(theme.colors[key]))
        .roundRect(cx, cy, chip, chip, 6).stroke({ color: 0xffffff, alpha: 0.25, width: 2 }));
      const t = PixiPremiumScene.text(label, { fontSize: 13, fill: PixiPremiumScene.alpha(cols.text, '99') });
      t.anchor.set(0.5, 0);
      t.x = cx + chip / 2;
      t.y = cy + chip + 6;
      this.pixiContainer.addChild(t);
    });
  },

  // Custom palette chips, Apply button, then music and backdrop pickers, laid out
  // top-down across width w. Returns the y just below the last row.
  customEditor(x, y, w) {
    const cols = ThemeManager.getCurrentColors();
    const custom = ThemeManager.getTheme('custom');
    const colorKeys = ['lightSquare', 'darkSquare', 'lightPiece', 'darkPiece', 'highlight', 'background', 'panel', 'text', 'accent', 'buttonBg'];
    const names = { lightSquare: 'Light', darkSquare: 'Dark', lightPiece: 'White', darkPiece: 'Black', highlight: 'Hint', background: 'Backdrop', panel: 'Panel', text: 'Text', accent: 'Accent', buttonBg: 'Button' };
    const presets = ['#ff6578', '#7dea99', '#6aa7ff', '#ffe17a', '#d24dff', '#4dd7d0', '#ffffff', '#101423', '#8b9dc3', '#ff9a4d', '#905cff', '#21a9ff', '#7a4b2a', '#2e8b57', '#59172a'];

    const heading = PixiPremiumScene.text('Custom Palette  ·  click a colour to change it', { fontSize: 15, fontWeight: '800', fill: PixiPremiumScene.alpha(cols.text, 'bb') });
    heading.x = x;
    heading.y = y;
    PixiPremiumScene.fit(heading, w, 0.7);
    this.pixiContainer.addChild(heading);

    const colW = w / 5;
    const chip = 34;
    const rowH = 60;
    colorKeys.forEach((key, i) => {
      const group = new PIXI.Container();
      group.x = Math.round(x + (i % 5) * colW + (colW - chip) / 2);
      group.y = y + 30 + Math.floor(i / 5) * rowH;
      group.eventMode = 'static';
      group.cursor = 'pointer';
      group.hitArea = new PIXI.Rectangle(-8, -4, chip + 16, rowH - 4);
      group.on('pointerdown', () => {
        if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') {
          audioManager.playButton();
        }
        const index = Math.max(0, presets.indexOf(custom.colors[key]));
        ThemeManager.setCustomColor(key, presets[(index + 1) % presets.length]);
        this._choose('custom');
        this.selectedThemeId = 'custom';
        this.build();
      });
      group.addChild(new PIXI.Graphics()
        .roundRect(0, 0, chip, chip, 6).fill(PixiPremiumScene.color(custom.colors[key]))
        .roundRect(0, 0, chip, chip, 6).stroke({ color: PixiPremiumScene.color(cols.text), alpha: 0.35, width: 2 }));
      const label = PixiPremiumScene.text(names[key], { fontSize: 12, fill: PixiPremiumScene.alpha(cols.text, 'aa') });
      label.anchor.set(0.5, 0);
      label.x = chip / 2;
      label.y = chip + 4;
      PixiPremiumScene.fit(label, colW - 4, 0.7);
      group.addChild(label);
      this.pixiContainer.addChild(group);
    });
    y += 30 + rowH * 2 + 6;

    PixiPremiumScene.button(this.pixiContainer, x, y, w, 44, ThemeManager.menuThemeId() === 'custom' ? 'Custom Applied' : 'Apply Custom', () => this.selectTheme('custom', true), { primary: true, icon: 'spark' });
    y += 44 + 18;

    y = this.themeChips('Music', store.get('customMusicTheme') || 'pawnhollow', x, y, w, (id) => {
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
    return this.themeChips('Backdrop', store.get('customBgTheme') || 'pawnhollow', x, y + 12, w, (id) => {
      store.set('customBgTheme', id);
      store.saveProgress();
      this.build();
    }, ThemeManager.EXTRA_BACKDROPS);
  },

  // A label and a 6-column grid of theme buttons (plus any extra backdrops); returns the y below the grid.
  themeChips(label, current, x, y, w, onPick, extras = []) {
    const cols = ThemeManager.getCurrentColors();
    const t = PixiPremiumScene.text(label, { fontSize: 15, fontWeight: '900', fill: cols.text });
    t.x = x;
    t.y = y;
    this.pixiContainer.addChild(t);
    const gap = 6;
    const perRow = 6;
    const chipW = Math.floor((w - gap * (perRow - 1)) / perRow);
    const chipH = 26;
    const baseThemes = this.themes.filter(theme => theme.id !== 'custom').map(theme => ({
      id: theme.id, short: theme.short, accent: theme.colors.accent, unlocked: ThemeManager.isThemeUnlocked(theme.id),
    })).concat(extras.map(b => ({ id: b.id, short: b.short, accent: b.accent, unlocked: ThemeManager.isBackdropUnlocked(b.id) })));
    baseThemes.forEach((theme, i) => {
      PixiPremiumScene.button(this.pixiContainer, x + (i % perRow) * (chipW + gap), y + 24 + Math.floor(i / perRow) * (chipH + gap), chipW, chipH, theme.unlocked ? theme.short : '?', () => onPick(theme.id), {
        primary: theme.id === current,
        fontSize: 12,
        color: theme.accent,
        disabled: !theme.unlocked,
      });
    });
    return y + 24 + Math.ceil(baseThemes.length / perRow) * (chipH + gap) - gap;
  },

  selectTheme(id, unlocked) {
    this.selectedThemeId = id;
    if (unlocked) this._choose(id);
    this.build();
  },

  // The pick is the theme outside story mode. Opened from a story fight (pause menu,
  // Settings), the fight keeps its world's theme and the pick shows up afterwards.
  _choose(id) {
    if (ThemeManager.storyActive) store.set('menuTheme', id);
    else ThemeManager.chooseTheme(id);
    store.saveProgress();
  },

  unlockLabel(id) {
    const world = ThemeManager.unlockWorld(id);
    if (id === 'greatboard') return 'Finish the story';
    return world ? `Restore ${world.name} in Story` : 'Story locked';
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') switchScreen(this.returnScreen);
  },
};
