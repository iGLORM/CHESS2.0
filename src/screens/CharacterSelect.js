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
    const s = Layout.uiScale || 1;
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
    const btnY = Layout.H - Math.round(100 * s);
    const btnW = Math.round(160 * s);
    const btnH = 44;
    PixiPremiumScene.button(this.pixiContainer, Math.round(36 * s), btnY, btnW, btnH, this.phase === 'slots' ? 'Home' : 'Back', () => this.back(), { icon: 'back' });
  },

  buildSlots() {
    const s = Layout.uiScale || 1;
    const saves = store.get('storySaves');
    const portrait = Layout.isPortrait;
    const baseW = portrait ? 700 : 344;
    const w = Math.min(Math.round(baseW * s), Layout.W - 80);
    const gap = portrait ? 16 : 30;
    const startX = portrait ? Math.floor((Layout.W - w) / 2) : 92;
    const startY = portrait ? 156 : Math.round(156 * s);
    const availH = portrait ? Layout.H - startY - 100 : 446;
    const h = portrait ? Math.min(300, Math.floor((availH - 2 * gap) / 3)) : 446;
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
          const p = h / 446;
          this.drawSaveSlotArt(card, save, index, w, h, isEmpty, state && state.hover, cols);

          const title = PixiPremiumScene.text(`SAVE ${index + 1}`, {
            fontFamily: PixiTextStyles.FONT_TITLE,
            fontSize: Math.round(18 * s),
            fontWeight: 'bold',
            fill: isEmpty ? cols.accent : '#7dea99',
            stroke: { color: 0x05020d, width: 3 },
            padding: 5,
          });
          title.anchor.set(0.5);
          title.x = w / 2;
          title.y = Math.round(36 * p);
          card.addChild(title);

          if (isEmpty) {
            const newGame = PixiPremiumScene.text('New Campaign', {
              fontSize: Math.round(26 * s),
              fontWeight: '900',
              fill: cols.text,
              stroke: { color: 0x05020d, width: 3 },
              padding: 5,
            });
            newGame.anchor.set(0.5);
            newGame.x = w / 2;
            newGame.y = h * 0.68;
            card.addChild(newGame);

            const hint = PixiPremiumScene.text('Begin at Level 1', { fontSize: Math.round(17 * s), fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, 'bb') });
            hint.anchor.set(0.5);
            hint.x = w / 2;
            hint.y = h * 0.78;
            card.addChild(hint);
            return;
          }

          const tier = DifficultyScaler.getTierLabel(save.difficultyTier);
          const tierText = PixiPremiumScene.text(tier, { fontSize: Math.round(26 * s), fontWeight: '800', fill: cols.text });
          tierText.anchor.set(0.5);
          tierText.x = w / 2;
          tierText.y = h * 0.58;
          PixiPremiumScene.fit(tierText, w - 56);
          card.addChild(tierText);

          const elo = PixiPremiumScene.text(DifficultyScaler.getTierElo(save.difficultyTier), { fontSize: Math.round(16 * s), fill: PixiPremiumScene.alpha(cols.text, '88') });
          elo.anchor.set(0.5);
          elo.x = w / 2;
          elo.y = h * 0.66;
          card.addChild(elo);

          const progW = w - 84;
          const progH = 18;
          const progX = 42;
          const progY = h * 0.74;
          this.progress(card, progX, progY, progW, progH, Math.min(1, (save.storyLevel || 1) / 10), cols);
          const level = PixiPremiumScene.text(`Level ${save.storyLevel || 1} / 10`, { fontSize: Math.round(18 * s), fontWeight: '800', fill: cols.text });
          level.anchor.set(0.5);
          level.x = w / 2;
          level.y = h * 0.85;
          card.addChild(level);

          const status = PixiPremiumScene.text(save.completed ? 'Completed' : 'Click to continue', {
            fontSize: Math.round(14 * s),
            fill: save.completed ? '#7dea99' : PixiPremiumScene.alpha(cols.text, '88'),
          });
          status.anchor.set(0.5);
          status.x = w / 2;
          status.y = h * 0.94;
          card.addChild(status);
        },
      });
    });
  },

  drawSaveSlotArt(card, save, index, w, h, isEmpty, hover, cols) {
    const s = Layout.uiScale || 1;
    const p = h / 446;
    const themeId = this.getAssetThemeId();
    const bgH = Math.round(166 * p);
    const bgY = Math.round(62 * p);
    const pad = Math.round(14 * p);
    const bg = new PIXI.Sprite(PixiPremiumAssets.background(themeId));
    bg.width = w - pad * 2;
    bg.height = bgH;
    bg.x = pad;
    bg.y = bgY;
    bg.alpha = hover ? 0.74 : 0.58;
    card.addChild(bg);

    const shade = new PIXI.Graphics()
      .rect(pad, bgY, w - pad * 2, bgH).fill({ color: 0x02040b, alpha: isEmpty ? 0.34 : 0.18 })
      .rect(pad, bgY + bgH - Math.round(18 * p), w - pad * 2, Math.round(18 * p)).fill({ color: 0x02040b, alpha: 0.45 })
      .rect(pad + Math.round(10 * p), bgY + Math.round(12 * p), w - pad * 2 - Math.round(20 * p), 2).fill({ color: PixiPremiumScene.color(cols.accent), alpha: 0.38 });
    card.addChild(shade);

    if (isEmpty) {
      this.drawEmptySlotPieces(card, w, h, themeId, cols);
      this.drawSlotBadge(card, w / 2, Math.round(235 * p), 'START', cols.accent, cols, w);
      return;
    }

    const charId = typeof save.selectedCharacter === 'object' && save.selectedCharacter
      ? save.selectedCharacter.id
      : (save.selectedCharacter || (this.characters.find(ch => ch.level === (save.storyLevel || 1)) || this.characters[0]).id);
    const character = this.characters.find(ch => ch.id === charId) || this.characters[0];
    const portraitSize = Math.round(140 * p);
    const portrait = new PIXI.Sprite(PixiPremiumAssets.character(character.id));
    portrait.width = portraitSize;
    portrait.height = portraitSize;
    portrait.x = Math.round(34 * p);
    portrait.y = Math.round(92 * p);
    card.addChild(portrait);

    const pieceSize = Math.round(92 * p);
    const piece = this.pieceSprite(themeId, 'white', this.pieceForLevel(save.storyLevel || 1));
    piece.width = pieceSize;
    piece.height = pieceSize;
    piece.x = w - pieceSize - Math.round(32 * p);
    piece.y = Math.round(106 * p);
    piece.alpha = 0.96;
    card.addChild(piece);

    this.drawSlotBadge(card, w - Math.round(74 * p), Math.round(235 * p), save.completed ? 'CLEAR' : `LV ${save.storyLevel || 1}`, save.completed ? '#7dea99' : cols.accent, cols, w);

    const nameX = Math.round(34 * p) + portraitSize + Math.round(12 * p);
    const nameMaxW = w - nameX - pieceSize - Math.round(20 * p);
    const name = PixiPremiumScene.text(character.name, {
      fontSize: Math.round(18 * s),
      fontWeight: '900',
      fill: cols.text,
      stroke: { color: 0x05020d, width: 3 },
      padding: 5,
    });
    name.x = nameX;
    name.y = Math.round(134 * p);
    PixiPremiumScene.fit(name, nameMaxW);
    card.addChild(name);

    const title = PixiPremiumScene.text(character.title, {
      fontSize: Math.round(12 * s),
      fontWeight: '700',
      fill: PixiPremiumScene.alpha(character.colors.primary || cols.accent, 'dd'),
      wordWrap: true,
      wordWrapWidth: nameMaxW,
    });
    title.x = nameX;
    title.y = Math.round(164 * p);
    PixiPremiumScene.fit(title, nameMaxW, 0.72);
    card.addChild(title);
  },

  drawEmptySlotPieces(card, w, h, themeId, cols) {
    const p = h / 446;
    const leftSize = Math.round(118 * p);
    const left = this.pieceSprite(themeId, 'white', 'king');
    left.width = leftSize;
    left.height = leftSize;
    left.x = Math.round(76 * p);
    left.y = Math.round(100 * p);
    card.addChild(left);

    const rightSize = Math.round(104 * p);
    const right = this.pieceSprite(themeId, 'white', 'queen');
    right.width = rightSize;
    right.height = rightSize;
    right.x = Math.round(170 * p);
    right.y = Math.round(110 * p);
    right.alpha = 0.78;
    right.tint = PixiPremiumScene.color(cols.accent);
    card.addChild(right);

    const boxSize = Math.round(72 * p);
    const boxX = w / 2 - boxSize / 2;
    const boxY = Math.round(127 * p);
    const barW = Math.round(10 * p);
    const barH = Math.round(40 * p);
    const crossW = Math.round(40 * p);
    const crossH = Math.round(10 * p);
    const plus = new PIXI.Graphics()
      .roundRect(boxX, boxY, boxSize, boxSize, Math.round(10 * p)).fill({ color: 0x071724, alpha: 0.78 })
      .roundRect(boxX, boxY, boxSize, boxSize, Math.round(10 * p)).stroke({ color: PixiPremiumScene.color(cols.accent), alpha: 0.7, width: 2 })
      .rect(w / 2 - barW / 2, boxY + (boxSize - barH) / 2, barW, barH).fill({ color: PixiPremiumScene.color(cols.accent), alpha: 0.95 })
      .rect(w / 2 - crossW / 2, boxY + (boxSize - crossH) / 2, crossW, crossH).fill({ color: PixiPremiumScene.color(cols.accent), alpha: 0.95 });
    card.addChild(plus);
  },

  drawSlotBadge(card, x, y, label, color, cols, cardW) {
    const bw = Math.min(Math.round(72 * (Layout.uiScale || 1)), cardW ? cardW * 0.18 : 88);
    const bh = Math.round(bw * 0.36);
    x = cardW ? Math.min(x, cardW - bw / 2 - 8) : x;
    const badge = new PIXI.Graphics()
      .roundRect(x - bw / 2, y - bh / 2, bw, bh, 6).fill({ color: 0x071724, alpha: 0.82 })
      .roundRect(x - bw / 2, y - bh / 2, bw, bh, 6).stroke({ color: PixiPremiumScene.color(color), alpha: 0.72, width: 2 });
    card.addChild(badge);
    const text = PixiPremiumScene.text(label, {
      fontSize: Math.round(12 * (Layout.uiScale || 1)),
      fontWeight: '900',
      fill: color,
    });
    text.anchor.set(0.5);
    text.x = x;
    text.y = y - 1;
    PixiPremiumScene.fit(text, bw - 12, 0.68);
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
    const s = Layout.uiScale || 1;
    const tiers = ['rookie', 'beginner', 'intermediate', 'advanced', 'expert'];
    if (store.get('madnessUnlocked')) tiers.push('madness');

    const portrait = Layout.isPortrait;
    const baseCardW = portrait ? 700 : 660;
    const cardW = Math.min(Math.round(baseCardW * s), Layout.W - 80);
    const cardX = Math.floor((Layout.W - cardW) / 2);

    const intro = PixiPremiumScene.text('Each tier keeps the same story, but changes the AI curve across all ten opponents.', {
      fontSize: Math.round(19 * s),
      fill: PixiPremiumScene.alpha(ThemeManager.getCurrentColors().text, 'bb'),
    });
    intro.anchor.set(0.5);
    intro.x = Layout.cx;
    intro.y = Math.round(146 * s);
    PixiPremiumScene.fit(intro, portrait ? Math.min(720, Layout.W - 60) : 900);
    this.pixiContainer.addChild(intro);

    const cardH = Math.round(60 * s);
    const cardGap = Math.round(76 * s);
    const startY = Math.round(190 * s);
    tiers.forEach((tier, i) => {
      const config = DifficultyScaler.TIER_CONFIG[tier];
      PixiPremiumScene.card(this.pixiContainer, cardX, startY + i * cardGap, cardW, cardH, {
        activeColor: tier === 'madness' ? '#ff4868' : ThemeManager.getCurrentColors().accent,
        onClick: () => this.chooseDifficulty(tier),
        draw: (card) => {
          const cols = ThemeManager.getCurrentColors();
          const label = PixiPremiumScene.text(config.label, {
            fontSize: Math.round(23 * s),
            fontWeight: '800',
            fill: tier === 'madness' ? '#ff8aa0' : cols.text,
          });
          label.x = Math.round(28 * s);
          label.y = Math.round(17 * s);
          PixiPremiumScene.fit(label, Math.round(280 * s));
          card.addChild(label);

          const descX = Math.round(300 * s);
          const desc = PixiPremiumScene.text(config.desc, { fontSize: Math.round(15 * s), fill: PixiPremiumScene.alpha(cols.text, '88') });
          desc.x = descX;
          desc.y = Math.round(12 * s);
          PixiPremiumScene.fit(desc, cardW - descX - Math.round(100 * s));
          card.addChild(desc);

          const elo = PixiPremiumScene.text(config.elo, { fontSize: Math.round(18 * s), fontWeight: '800', fill: cols.accent });
          elo.anchor.set(1, 0.5);
          elo.x = cardW - Math.round(32 * s);
          elo.y = Math.round(32 * s);
          card.addChild(elo);
        },
      });
    });
  },

  buildCharacters() {
    const s = Layout.uiScale || 1;
    const save = store.getActiveSave() || {};
    const maxUnlocked = save.maxUnlockedLevel || 1;
    const storyLevel = save.storyLevel || 1;
    if (!this.selectedChar) {
      this.selectedChar = this.characters.find(ch => ch.level === storyLevel && ch.level <= maxUnlocked) || this.characters.find(ch => ch.level <= maxUnlocked);
    }

    const portrait = Layout.isPortrait;
    const cols_per_row = portrait ? 2 : 2;
    const baseListW = portrait ? (Layout.W - 80) : 492;
    const listPanelW = Math.min(baseListW, Layout.W - 80);
    const listPanelX = portrait ? Math.floor((Layout.W - listPanelW) / 2) : Math.round(72 * s);
    const numRows = Math.ceil(this.characters.length / cols_per_row);
    const cardH = Math.round(58 * s);
    const cardGap = Math.round(10 * s);
    const rowH = cardH + cardGap;
    const listContentH = Math.round(40 * s) + numRows * rowH;
    const listPanelH = portrait ? listContentH : 560;

    const listPanelY = Math.round(132 * s);
    PixiPremiumScene.panel(this.pixiContainer, listPanelX, listPanelY, listPanelW, listPanelH, { accentAlpha: 0.42 });
    this._listPanelBottom = listPanelY + listPanelH;
    const listTitle = PixiPremiumScene.text(`Story ${storyLevel} / 10`, { fontSize: Math.round(19 * s), fontWeight: '800', fill: ThemeManager.getCurrentColors().text });
    listTitle.x = listPanelX + Math.round(28 * s);
    listTitle.y = Math.round(154 * s);
    this.pixiContainer.addChild(listTitle);

    const cardW = portrait ? Math.floor((listPanelW - Math.round(50 * s) - (cols_per_row - 1) * cardGap) / cols_per_row) : 216;
    const cardStartX = listPanelX + Math.round(20 * s);
    this.characters.forEach((ch, i) => {
      const col = i % cols_per_row;
      const row = Math.floor(i / cols_per_row);
      const x = cardStartX + col * (cardW + cardGap);
      const y = Math.round(196 * s) + row * rowH;
      const unlocked = ch.level <= maxUnlocked;
      PixiPremiumScene.card(this.pixiContainer, x, y, cardW, cardH, {
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
          const thumbSize = Math.round(40 * s);
          const thumb = new PIXI.Sprite(unlocked ? PixiPremiumAssets.character(ch.id) : PixiPremiumAssets.icon('lock'));
          thumb.width = thumbSize;
          thumb.height = thumbSize;
          thumb.x = Math.round(10 * s);
          thumb.y = (cardH - thumbSize) / 2;
          thumb.alpha = unlocked ? 1 : 0.75;
          card.addChild(thumb);

          const textX = Math.round(10 * s) + thumbSize + Math.round(8 * s);
          const textMaxW = cardW - textX - Math.round(10 * s);
          const name = PixiPremiumScene.text(unlocked ? ch.name : `Lv ${ch.level} Locked`, { fontSize: Math.round(16 * s), fontWeight: '800', fill: unlocked ? cols.text : PixiPremiumScene.alpha(cols.text, '77') });
          name.x = textX;
          name.y = cardH * 0.22;
          PixiPremiumScene.fit(name, textMaxW);
          card.addChild(name);

          const title = PixiPremiumScene.text(unlocked ? ch.title : `Beat lv ${ch.level - 1}`, { fontSize: Math.round(11 * s), fill: unlocked ? ch.colors.primary : PixiPremiumScene.alpha(cols.text, '55') });
          title.x = textX;
          title.y = cardH * 0.56;
          PixiPremiumScene.fit(title, textMaxW, 0.55);
          card.addChild(title);
        },
      });
    });

    this.buildCharacterDetail();
  },

  buildCharacterDetail() {
    const s = Layout.uiScale || 1;
    const ch = this.selectedChar;
    if (!ch) return;
    const cols = ThemeManager.getCurrentColors();
    const portrait = Layout.isPortrait;

    const baseDetailW = portrait ? 720 : 604;
    const detailW = Math.min(Math.round(baseDetailW * s), Layout.W - 80);
    const detailX = portrait ? Math.floor((Layout.W - detailW) / 2) : Math.round(604 * s);
    const btnArea = Math.round(100 * s);
    const detailGap = Math.round(20 * s);
    const detailY = portrait ? (this._listPanelBottom || Math.round(580 * s)) + detailGap : Math.round(132 * s);
    const detailH = portrait ? Math.min(Math.round(360 * s), Layout.H - detailY - btnArea) : 560;
    PixiPremiumScene.panel(this.pixiContainer, detailX, detailY, detailW, detailH, { accent: ch.colors.primary, accentAlpha: 0.9 });

    const portraitW = Math.round((portrait ? 140 : 238) * s);
    const portraitH = Math.min(Math.round((portrait ? 180 : 292) * s), detailH - Math.round(80 * s));
    const portraitSprite = new PIXI.Sprite(PixiPremiumAssets.characterCard(ch.id));
    portraitSprite.width = portraitW;
    portraitSprite.height = portraitH;
    portraitSprite.x = detailX + Math.round(36 * s);
    portraitSprite.y = detailY + Math.round(38 * s);
    this.pixiContainer.addChild(portraitSprite);

    const infoX = detailX + portraitW + Math.round(50 * s);
    const infoMaxW = detailW - portraitW - Math.round(90 * s);

    const name = PixiPremiumScene.text(ch.name, { fontSize: Math.round(34 * s), fontWeight: '900', fill: cols.text });
    name.x = infoX;
    name.y = detailY + Math.round(42 * s);
    PixiPremiumScene.fit(name, infoMaxW);
    this.pixiContainer.addChild(name);

    const title = PixiPremiumScene.text(ch.title, { fontSize: Math.round(20 * s), fontWeight: '800', fill: ch.colors.primary });
    title.x = infoX;
    title.y = detailY + Math.round(86 * s);
    PixiPremiumScene.fit(title, infoMaxW);
    this.pixiContainer.addChild(title);

    const meta = PixiPremiumScene.text(`Level ${ch.level}  |  ${DifficultyScaler.getTierLabel((store.getActiveSave() || {}).difficultyTier)}`, {
      fontSize: Math.round(16 * s),
      fill: PixiPremiumScene.alpha(cols.text, 'aa'),
    });
    meta.x = infoX;
    meta.y = detailY + Math.round(120 * s);
    PixiPremiumScene.fit(meta, infoMaxW);
    this.pixiContainer.addChild(meta);

    const quotePanel = new PIXI.Container();
    this.pixiContainer.addChild(quotePanel);
    const quoteX = infoX - Math.round(10 * s);
    const quoteY = detailY + Math.round(154 * s);
    const quoteW = Math.min(infoMaxW + Math.round(10 * s), Math.round(300 * s));
    const quoteH = Math.min(Math.round((portrait ? 100 : 190) * s), detailH - Math.round(200 * s));
    PixiPremiumScene.panel(quotePanel, quoteX, quoteY, quoteW, quoteH, { accent: ch.colors.primary, accentAlpha: 0.35, alpha: 0.52 });
    const quote = PixiPremiumScene.text(ch.dialogue.before, {
      fontSize: Math.round(16 * s),
      fill: PixiPremiumScene.alpha(cols.text, 'dd'),
      wordWrap: true,
      wordWrapWidth: quoteW - Math.round(32 * s),
      lineHeight: Math.round(19 * s),
    });
    this.fitWrappedText(quote, quoteH - Math.round(42 * s), Math.round(11 * s));
    quote.x = quoteX + Math.round(16 * s);
    quote.y = quoteY + Math.round(24 * s);
    quotePanel.addChild(quote);

    const beat = ch.level < ((store.getActiveSave() || {}).storyLevel || 1);
    const next = ch.level === ((store.getActiveSave() || {}).storyLevel || 1);
    const status = beat ? 'Defeated' : next ? 'Next Battle' : 'Unlocked';
    const statusText = PixiPremiumScene.text(status, { fontSize: Math.round(16 * s), fontWeight: '800', fill: beat ? '#7dea99' : cols.accent });
    statusText.x = detailX + Math.round(36 * s);
    statusText.y = detailY + detailH - Math.round(76 * s);
    this.pixiContainer.addChild(statusText);

    const fightBtnW = Math.round(200 * s);
    const fightBtnH = 44;
    PixiPremiumScene.button(this.pixiContainer, detailX + Math.round(36 * s), detailY + detailH - Math.round(56 * s), fightBtnW, fightBtnH, 'Fight', () => this.startFight(), { primary: true, icon: 'play' });
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
    const settings = store.get('settings') || {};
    if (settings.bossThemeEnabled !== false && this.selectedChar.theme) {
      ThemeManager.applyTheme(this.selectedChar.theme);
    }
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
