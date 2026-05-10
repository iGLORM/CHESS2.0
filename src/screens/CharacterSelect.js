const CharacterSelect = {
  isPixiScreen: true,
  pixiContainer: null,
  characters: [],
  phase: 'slots',
  selectedSlot: 0,
  selectedChar: null,

  init() {
    this.characters = CHARACTERS;
    this.phase = 'slots';
    this.selectedSlot = Math.max(0, (store.get('activeSaveSlot') || 1) - 1);
    this.selectedChar = null;
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
    const subtitle = this.phase === 'slots'
      ? 'Choose a save file'
      : this.phase === 'difficulty'
        ? 'Choose how the story scales'
        : 'Pick the next challenger';
    this.pixiContainer = PixiPremiumScene.root('Story Mode', subtitle, { footerHint: 'Story progress and save data stay unchanged' });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    if (this.phase === 'slots') this.buildSlots();
    if (this.phase === 'difficulty') this.buildDifficulty();
    if (this.phase === 'characters') this.buildCharacters();
    const btnY = Layout.H - 82;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, this.phase === 'slots' ? 'Home' : 'Back', () => this.back(), { icon: 'back' });
  },

  buildSlots() {
    const saves = store.get('storySaves');
    const portrait = Layout.isPortrait;
    const w = portrait ? 700 : 344;
    const h = portrait ? 300 : 446;
    const gap = portrait ? 20 : 30;
    const startX = portrait ? Math.floor((Layout.W - w) / 2) : 92;
    const startY = 156;
    saves.forEach((save, index) => {
      const isEmpty = !save.difficultyTier;
      const cardX = portrait ? startX : startX + index * (w + gap);
      const cardY = portrait ? startY + index * (h + gap) : startY;
      PixiPremiumScene.card(this.pixiContainer, cardX, cardY, w, h, {
        active: store.get('activeSaveSlot') === index + 1,
        activeColor: isEmpty ? ThemeManager.getCurrentColors().accent : (save.completed ? '#7dea99' : ThemeManager.getCurrentColors().accent),
        alpha: 0.86,
        onClick: () => this.chooseSlot(index),
        draw: (card, state) => {
          const cols = ThemeManager.getCurrentColors();
          this.drawSaveSlotArt(card, save, index, w, h, isEmpty, state && state.hover, cols);

          const title = PixiPremiumScene.text(`SAVE ${index + 1}`, {
            fontFamily: PixiTextStyles.FONT_TITLE,
            fontSize: 18,
            fontWeight: 'bold',
            fill: isEmpty ? cols.accent : '#7dea99',
            stroke: { color: 0x05020d, width: 3 },
            padding: 5,
          });
          title.anchor.set(0.5);
          title.x = w / 2;
          title.y = 36;
          card.addChild(title);

          if (isEmpty) {
            const newGame = PixiPremiumScene.text('New Campaign', {
              fontSize: 26,
              fontWeight: '900',
              fill: cols.text,
              stroke: { color: 0x05020d, width: 3 },
              padding: 5,
            });
            newGame.anchor.set(0.5);
            newGame.x = w / 2;
            newGame.y = 284;
            card.addChild(newGame);

            const hint = PixiPremiumScene.text('Begin at Level 1', { fontSize: 17, fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, 'bb') });
            hint.anchor.set(0.5);
            hint.x = w / 2;
            hint.y = 322;
            card.addChild(hint);
            return;
          }

          const tier = DifficultyScaler.getTierLabel(save.difficultyTier);
          const tierText = PixiPremiumScene.text(tier, { fontSize: 26, fontWeight: '800', fill: cols.text });
          tierText.anchor.set(0.5);
          tierText.x = w / 2;
          tierText.y = 286;
          PixiPremiumScene.fit(tierText, w - 56);
          card.addChild(tierText);

          const elo = PixiPremiumScene.text(DifficultyScaler.getTierElo(save.difficultyTier), { fontSize: 16, fill: PixiPremiumScene.alpha(cols.text, '88') });
          elo.anchor.set(0.5);
          elo.x = w / 2;
          elo.y = 318;
          card.addChild(elo);

          this.progress(card, 42, 372, w - 84, 18, Math.min(1, (save.storyLevel || 1) / 10), cols);
          const level = PixiPremiumScene.text(`Level ${save.storyLevel || 1} / 10`, { fontSize: 18, fontWeight: '800', fill: cols.text });
          level.anchor.set(0.5);
          level.x = w / 2;
          level.y = 354;
          card.addChild(level);

          const status = PixiPremiumScene.text(save.completed ? 'Completed' : 'Click to continue', {
            fontSize: 16,
            fill: save.completed ? '#7dea99' : PixiPremiumScene.alpha(cols.text, '88'),
          });
          status.anchor.set(0.5);
          status.x = w / 2;
          status.y = 420;
          card.addChild(status);
        },
      });
    });
  },

  drawSaveSlotArt(card, save, index, w, h, isEmpty, hover, cols) {
    const themeId = this.getAssetThemeId();
    const bg = new PIXI.Sprite(PixiPremiumAssets.background(themeId));
    bg.width = w - 28;
    bg.height = 166;
    bg.x = 14;
    bg.y = 62;
    bg.alpha = hover ? 0.74 : 0.58;
    card.addChild(bg);

    const shade = new PIXI.Graphics()
      .rect(14, 62, w - 28, 166).fill({ color: 0x02040b, alpha: isEmpty ? 0.34 : 0.18 })
      .rect(14, 210, w - 28, 18).fill({ color: 0x02040b, alpha: 0.45 })
      .rect(24, 74, w - 48, 2).fill({ color: PixiPremiumScene.color(cols.accent), alpha: 0.38 });
    card.addChild(shade);

    if (isEmpty) {
      this.drawEmptySlotPieces(card, w, themeId, cols);
      this.drawSlotBadge(card, w / 2, 235, 'START', cols.accent, cols);
      return;
    }

    const charId = typeof save.selectedCharacter === 'object' && save.selectedCharacter
      ? save.selectedCharacter.id
      : (save.selectedCharacter || (this.characters.find(ch => ch.level === (save.storyLevel || 1)) || this.characters[0]).id);
    const character = this.characters.find(ch => ch.id === charId) || this.characters[0];
    const portrait = new PIXI.Sprite(PixiPremiumAssets.character(character.id));
    portrait.width = 140;
    portrait.height = 140;
    portrait.x = 34;
    portrait.y = 92;
    card.addChild(portrait);

    const piece = this.pieceSprite(themeId, 'white', this.pieceForLevel(save.storyLevel || 1));
    piece.width = 92;
    piece.height = 92;
    piece.x = w - 124;
    piece.y = 106;
    piece.alpha = 0.96;
    card.addChild(piece);

    this.drawSlotBadge(card, w - 74, 235, save.completed ? 'CLEAR' : `LV ${save.storyLevel || 1}`, save.completed ? '#7dea99' : cols.accent, cols);

    const name = PixiPremiumScene.text(character.name, {
      fontSize: 18,
      fontWeight: '900',
      fill: cols.text,
      stroke: { color: 0x05020d, width: 3 },
      padding: 5,
    });
    name.x = 184;
    name.y = 134;
    PixiPremiumScene.fit(name, 118);
    card.addChild(name);

    const title = PixiPremiumScene.text(character.title, {
      fontSize: 12,
      fontWeight: '700',
      fill: PixiPremiumScene.alpha(character.colors.primary || cols.accent, 'dd'),
      wordWrap: true,
      wordWrapWidth: 116,
    });
    title.x = 184;
    title.y = 164;
    PixiPremiumScene.fit(title, 116, 0.72);
    card.addChild(title);
  },

  drawEmptySlotPieces(card, w, themeId, cols) {
    const left = this.pieceSprite(themeId, 'white', 'king');
    left.width = 118;
    left.height = 118;
    left.x = 76;
    left.y = 100;
    card.addChild(left);

    const right = this.pieceSprite(themeId, 'white', 'queen');
    right.width = 104;
    right.height = 104;
    right.x = 170;
    right.y = 110;
    right.alpha = 0.78;
    right.tint = PixiPremiumScene.color(cols.accent);
    card.addChild(right);

    const plus = new PIXI.Graphics()
      .roundRect(w / 2 - 36, 127, 72, 72, 10).fill({ color: 0x071724, alpha: 0.78 })
      .roundRect(w / 2 - 36, 127, 72, 72, 10).stroke({ color: PixiPremiumScene.color(cols.accent), alpha: 0.7, width: 2 })
      .rect(w / 2 - 5, 143, 10, 40).fill({ color: PixiPremiumScene.color(cols.accent), alpha: 0.95 })
      .rect(w / 2 - 20, 158, 40, 10).fill({ color: PixiPremiumScene.color(cols.accent), alpha: 0.95 });
    card.addChild(plus);
  },

  drawSlotBadge(card, x, y, label, color, cols) {
    const badge = new PIXI.Graphics()
      .roundRect(x - 44, y - 16, 88, 32, 6).fill({ color: 0x071724, alpha: 0.82 })
      .roundRect(x - 44, y - 16, 88, 32, 6).stroke({ color: PixiPremiumScene.color(color), alpha: 0.72, width: 2 });
    card.addChild(badge);
    const text = PixiPremiumScene.text(label, {
      fontSize: 13,
      fontWeight: '900',
      fill: color,
    });
    text.anchor.set(0.5);
    text.x = x;
    text.y = y - 1;
    PixiPremiumScene.fit(text, 72, 0.68);
    card.addChild(text);
  },

  pieceSprite(themeId, color, type) {
    const sprite = new PIXI.Sprite(PIXI.Texture.from(`../assets/textures/pieces/${themeId}_${color}_${type}.png`));
    if (sprite.texture && sprite.texture.source) sprite.texture.source.scaleMode = 'nearest';
    return sprite;
  },

  pieceForLevel(level) {
    const pieces = ['pawn', 'bishop', 'rook', 'knight', 'queen', 'rook', 'bishop', 'knight', 'queen', 'king'];
    return pieces[Math.max(0, Math.min(pieces.length - 1, level - 1))];
  },

  getAssetThemeId() {
    const themeId = store.get('theme') || 'space';
    return themeId === 'custom' ? (store.get('customBgTheme') || 'space') : themeId;
  },

  buildDifficulty() {
    const tiers = ['rookie', 'beginner', 'intermediate', 'advanced', 'expert'];
    if (store.get('madnessUnlocked')) tiers.push('madness');

    const portrait = Layout.isPortrait;
    const cardW = portrait ? 700 : 660;
    const cardX = Math.floor((Layout.W - cardW) / 2);

    const intro = PixiPremiumScene.text('Each tier keeps the same story, but changes the AI curve across all ten opponents.', {
      fontSize: 19,
      fill: PixiPremiumScene.alpha(ThemeManager.getCurrentColors().text, 'bb'),
    });
    intro.anchor.set(0.5);
    intro.x = Layout.cx;
    intro.y = 146;
    PixiPremiumScene.fit(intro, portrait ? 720 : 900);
    this.pixiContainer.addChild(intro);

    const startY = 190;
    tiers.forEach((tier, i) => {
      const config = DifficultyScaler.TIER_CONFIG[tier];
      PixiPremiumScene.card(this.pixiContainer, cardX, startY + i * 76, cardW, 60, {
        activeColor: tier === 'madness' ? '#ff4868' : ThemeManager.getCurrentColors().accent,
        onClick: () => this.chooseDifficulty(tier),
        draw: (card) => {
          const cols = ThemeManager.getCurrentColors();
          const label = PixiPremiumScene.text(config.label, {
            fontSize: 23,
            fontWeight: '800',
            fill: tier === 'madness' ? '#ff8aa0' : cols.text,
          });
          label.x = 28;
          label.y = 17;
          PixiPremiumScene.fit(label, 280);
          card.addChild(label);

          const desc = PixiPremiumScene.text(config.desc, { fontSize: 15, fill: PixiPremiumScene.alpha(cols.text, '88') });
          desc.x = 300;
          desc.y = 12;
          PixiPremiumScene.fit(desc, 250);
          card.addChild(desc);

          const elo = PixiPremiumScene.text(config.elo, { fontSize: 18, fontWeight: '800', fill: cols.accent });
          elo.anchor.set(1, 0.5);
          elo.x = cardW - 32;
          elo.y = 32;
          card.addChild(elo);
        },
      });
    });
  },

  buildCharacters() {
    const save = store.getActiveSave() || {};
    const maxUnlocked = save.maxUnlockedLevel || 1;
    const storyLevel = save.storyLevel || 1;
    if (!this.selectedChar) {
      this.selectedChar = this.characters.find(ch => ch.level === storyLevel && ch.level <= maxUnlocked) || this.characters.find(ch => ch.level <= maxUnlocked);
    }

    const portrait = Layout.isPortrait;
    const cols_per_row = portrait ? 3 : 2;
    const listPanelW = portrait ? (Layout.W - 80) : 492;
    const listPanelX = portrait ? 40 : 72;
    const listPanelH = portrait ? 420 : 560;

    PixiPremiumScene.panel(this.pixiContainer, listPanelX, 132, listPanelW, listPanelH, { accentAlpha: 0.42 });
    const listTitle = PixiPremiumScene.text(`Story ${storyLevel} / 10`, { fontSize: 19, fontWeight: '800', fill: ThemeManager.getCurrentColors().text });
    listTitle.x = listPanelX + 28;
    listTitle.y = 154;
    this.pixiContainer.addChild(listTitle);

    const cardW = portrait ? Math.floor((listPanelW - 60 - (cols_per_row - 1) * 18) / cols_per_row) : 216;
    const cardGap = 18;
    const cardStartX = listPanelX + 20;
    this.characters.forEach((ch, i) => {
      const col = i % cols_per_row;
      const row = Math.floor(i / cols_per_row);
      const x = cardStartX + col * (cardW + cardGap);
      const y = 196 + row * 92;
      const unlocked = ch.level <= maxUnlocked;
      PixiPremiumScene.card(this.pixiContainer, x, y, cardW, 74, {
        active: this.selectedChar && this.selectedChar.id === ch.id,
        disabled: !unlocked,
        activeColor: ch.colors.primary,
        onClick: () => {
          if (!unlocked) return;
          this.selectedChar = ch;
          this.build();
        },
        draw: (card) => {
          const cols = ThemeManager.getCurrentColors();
          const thumb = new PIXI.Sprite(unlocked ? PixiPremiumAssets.character(ch.id) : PixiPremiumAssets.icon('lock'));
          thumb.width = 52;
          thumb.height = 52;
          thumb.x = 12;
          thumb.y = 11;
          thumb.alpha = unlocked ? 1 : 0.75;
          card.addChild(thumb);

          const name = PixiPremiumScene.text(unlocked ? ch.name : `Level ${ch.level} Locked`, { fontSize: 18, fontWeight: '800', fill: unlocked ? cols.text : PixiPremiumScene.alpha(cols.text, '77') });
          name.x = 76;
          name.y = 16;
          PixiPremiumScene.fit(name, cardW - 92);
          card.addChild(name);

          const title = PixiPremiumScene.text(unlocked ? ch.title : `Beat level ${ch.level - 1}`, { fontSize: 12.5, fill: unlocked ? ch.colors.primary : PixiPremiumScene.alpha(cols.text, '55') });
          title.x = 76;
          title.y = 42;
          PixiPremiumScene.fit(title, cardW - 94, 0.62);
          card.addChild(title);
        },
      });
    });

    this.buildCharacterDetail();
    const btnY = Layout.H - 82;
    PixiPremiumScene.button(this.pixiContainer, Layout.W - 196, btnY, 160, 44, 'Themes', () => switchScreen('themeSelect', { returnTo: 'characterSelect' }), { icon: 'spark' });
  },

  buildCharacterDetail() {
    const ch = this.selectedChar;
    if (!ch) return;
    const cols = ThemeManager.getCurrentColors();
    const portrait = Layout.isPortrait;

    // Detail panel positioning: right side in landscape, below list in portrait
    const detailX = portrait ? Math.floor((Layout.W - 720) / 2) : 604;
    const detailY = portrait ? 580 : 132;
    const detailW = portrait ? 720 : 604;
    const detailH = portrait ? 500 : 560;
    PixiPremiumScene.panel(this.pixiContainer, detailX, detailY, detailW, detailH, { accent: ch.colors.primary, accentAlpha: 0.9 });

    const portraitSprite = new PIXI.Sprite(PixiPremiumAssets.characterCard(ch.id));
    portraitSprite.width = portrait ? 200 : 238;
    portraitSprite.height = portrait ? 246 : 292;
    portraitSprite.x = detailX + 36;
    portraitSprite.y = detailY + 38;
    this.pixiContainer.addChild(portraitSprite);

    const infoX = detailX + (portrait ? 260 : 310);
    const infoMaxW = detailW - (portrait ? 300 : 350);

    const name = PixiPremiumScene.text(ch.name, { fontSize: 34, fontWeight: '900', fill: cols.text });
    name.x = infoX;
    name.y = detailY + 42;
    PixiPremiumScene.fit(name, infoMaxW);
    this.pixiContainer.addChild(name);

    const title = PixiPremiumScene.text(ch.title, { fontSize: 20, fontWeight: '800', fill: ch.colors.primary });
    title.x = infoX;
    title.y = detailY + 86;
    PixiPremiumScene.fit(title, infoMaxW);
    this.pixiContainer.addChild(title);

    const meta = PixiPremiumScene.text(`Level ${ch.level}  |  ${DifficultyScaler.getTierLabel((store.getActiveSave() || {}).difficultyTier)}`, {
      fontSize: 16,
      fill: PixiPremiumScene.alpha(cols.text, 'aa'),
    });
    meta.x = infoX;
    meta.y = detailY + 120;
    PixiPremiumScene.fit(meta, infoMaxW);
    this.pixiContainer.addChild(meta);

    const quotePanel = new PIXI.Container();
    this.pixiContainer.addChild(quotePanel);
    const quoteX = infoX - 10;
    const quoteY = detailY + 154;
    const quoteW = Math.min(infoMaxW + 10, 300);
    const quoteH = portrait ? 140 : 190;
    PixiPremiumScene.panel(quotePanel, quoteX, quoteY, quoteW, quoteH, { accent: ch.colors.primary, accentAlpha: 0.35, alpha: 0.52 });
    const quote = PixiPremiumScene.text(ch.dialogue.before, {
      fontSize: 16,
      fill: PixiPremiumScene.alpha(cols.text, 'dd'),
      wordWrap: true,
      wordWrapWidth: quoteW - 32,
      lineHeight: 19,
    });
    this.fitWrappedText(quote, quoteH - 42, 11);
    quote.x = quoteX + 16;
    quote.y = quoteY + 24;
    quotePanel.addChild(quote);

    const beat = ch.level < ((store.getActiveSave() || {}).storyLevel || 1);
    const next = ch.level === ((store.getActiveSave() || {}).storyLevel || 1);
    const status = beat ? 'Defeated' : next ? 'Next Battle' : 'Unlocked';
    const statusText = PixiPremiumScene.text(status, { fontSize: 18, fontWeight: '800', fill: beat ? '#7dea99' : cols.accent });
    statusText.x = detailX + 36;
    statusText.y = detailY + detailH - 110;
    this.pixiContainer.addChild(statusText);

    PixiPremiumScene.button(this.pixiContainer, detailX + 36, detailY + detailH - 72, 250, 54, 'Fight', () => this.startFight(), { primary: true, icon: 'play' });
  },

  fitWrappedText(text, maxHeight, minFontSize) {
    let size = Number(text.style.fontSize) || 16;
    while (text.height > maxHeight && size > minFontSize) {
      size -= 1;
      text.style.fontSize = size;
      text.style.lineHeight = Math.max(size + 3, 14);
    }
  },

  progress(parent, x, y, w, h, value, cols) {
    const g = new PIXI.Graphics();
    g.roundRect(x, y, w, h, 5).fill({ color: 0x081624, alpha: 0.9 });
    g.roundRect(x, y, w, h, 5).stroke({ color: PixiPremiumScene.color(cols.text), alpha: 0.35, width: 2 });
    g.roundRect(x + 3, y + 3, Math.max(8, (w - 6) * value), h - 6, 3).fill({ color: PixiPremiumScene.color(cols.accent), alpha: 0.96 });
    parent.addChild(g);
  },

  chooseSlot(index) {
    this.selectedSlot = index;
    const save = store.get('storySaves')[index];
    if (!save.difficultyTier) {
      this.phase = 'difficulty';
    } else {
      store.setActiveSlot(index + 1);
      store.saveProgress();
      this.phase = 'characters';
    }
    this.build();
  },

  chooseDifficulty(tier) {
    store.setActiveSlot(this.selectedSlot + 1);
    store.setActiveSave({
      difficultyTier: tier,
      storyLevel: 1,
      maxUnlockedLevel: 1,
      selectedCharacter: null,
      completed: false,
    });
    store.saveProgress();
    this.phase = 'characters';
    this.selectedChar = this.characters[0];
    this.build();
  },

  startFight() {
    if (!this.selectedChar) return;
    store.setActiveSave({
      selectedCharacter: this.selectedChar.id,
      storyLevel: this.selectedChar.level,
    });
    store.update({
      selectedCharacter: this.selectedChar.id,
      storyLevel: this.selectedChar.level,
      mode: 'story',
    });
    store.saveProgress();
    switchScreen('game');
  },

  back() {
    if (this.phase === 'slots') {
      switchScreen('home');
      return;
    }
    if (this.phase === 'difficulty') {
      this.phase = 'slots';
      this.build();
      return;
    }
    switchScreen('home');
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') this.back();
  },
};
