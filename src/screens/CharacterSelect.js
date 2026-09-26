const CharacterSelect = {
  isPixiScreen: true,
  pixiContainer: null,
  characters: [],
  phase: 'slots',
  selectedSlot: 0,

  init() {
    this.characters = STORY_STAGES;
    this.phase = 'slots';
    this.selectedSlot = Math.max(0, (store.get('activeSaveSlot') || 1) - 1);
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
    const subtitle = this.phase === 'slots' ? 'Choose a save file' : 'Choose how the story scales';
    this.pixiContainer = PixiPremiumScene.root('Story Mode', subtitle, { footerHint: 'Your progress is saved automatically' });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    if (this.phase === 'slots') this.buildSlots();
    if (this.phase === 'difficulty') this.buildDifficulty();
    const btnW = Math.round(160 * s);
    const btnH = 44;
    const btnY = PixiPremiumScene.bottomButtonY(btnH);
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, btnW, btnH, this.phase === 'slots' ? 'Home' : 'Back', () => this.back(), { icon: 'back' });
  },

  // Save-slot card, laid out on a 470px-tall design and scaled to the card height.
  SLOT: {
    H: 470,
    TITLE_Y: 34,       // "SAVE n"
    ART_Y: 60,         // artwork band
    ART_H: 196,
    PAD: 14,
    PORTRAIT: 150,
    BADGE_INSET: 14,   // badge distance from the art's top-right corner
    MAIN_Y: 300,       // difficulty / "New Campaign"
    SUB_Y: 334,        // ELO / "Begin at Level 1"
    BAR_Y: 362,
    BAR_H: 16,
    LEVEL_Y: 402,
    STATUS_Y: 438,     // bottom line, same on every card
  },

  buildSlots() {
    const s = Layout.uiScale || 1;
    const saves = store.get('storySaves');
    const portrait = Layout.isPortrait;
    const gap = portrait ? 16 : 30;
    const startY = 156;
    const bottom = PixiPremiumScene.contentBottom;
    const w = portrait ? Math.min(Math.round(700 * s), Layout.W - 80) : Math.min(344, Math.floor((Layout.W - 120 - 2 * gap) / 3));
    const h = portrait
      ? Math.min(300, Math.floor((bottom - startY - 2 * gap) / 3))
      : Math.min(this.SLOT.H, bottom - startY);
    const startX = portrait ? Math.floor((Layout.W - w) / 2) : Math.floor((Layout.W - (3 * w + 2 * gap)) / 2);
    saves.forEach((save, index) => {
      const isEmpty = !save.difficultyTier;
      const cardX = portrait ? startX : startX + index * (w + gap);
      const cardY = portrait ? startY + index * (h + gap) : startY;
      PixiPremiumScene.card(this.pixiContainer, cardX, cardY, w, h, {
        active: store.get('activeSaveSlot') === index + 1,
        activeColor: isEmpty ? ThemeManager.getCurrentColors().accent : (save.completed ? '#7dea99' : ThemeManager.getCurrentColors().accent),
        alpha: 0.86,
        onClick: () => this.chooseSlot(index),
        draw: (card, state) => this.drawSlotCard(card, save, index, w, h, isEmpty, state && state.hover),
      });
    });
  },

  drawSlotCard(card, save, index, w, h, isEmpty, hover) {
    const L = this.SLOT;
    const s = Layout.uiScale || 1;
    const p = h / L.H;
    const cols = ThemeManager.getCurrentColors();
    const at = (y) => Math.round(y * p);
    const centred = (text, y, maxW = w - 40) => {
      text.anchor.set(0.5);
      text.x = Math.round(w / 2);
      text.y = at(y);
      PixiPremiumScene.fit(text, maxW);
      card.addChild(text);
    };
    this.drawSaveSlotArt(card, save, index, w, h, isEmpty, hover, cols);

    centred(PixiPremiumScene.text(`SAVE ${index + 1}`, {
      fontFamily: PixiTextStyles.FONT_TITLE,
      fontSize: Math.round(18 * s),
      fontWeight: 'bold',
      fill: isEmpty ? cols.accent : '#7dea99',
      stroke: { color: 0x05020d, width: 3 },
      padding: 5,
    }), L.TITLE_Y);

    const status = (label, fill) => centred(PixiPremiumScene.text(label, { fontSize: Math.round(15 * s), fontWeight: '700', fill }), L.STATUS_Y);

    if (isEmpty) {
      centred(PixiPremiumScene.text('New Campaign', {
        fontSize: Math.round(26 * s), fontWeight: '900', fill: cols.text,
        stroke: { color: 0x05020d, width: 3 }, padding: 5,
      }), L.MAIN_Y);
      centred(PixiPremiumScene.text('Begin at Level 1', { fontSize: Math.round(17 * s), fontWeight: '700', fill: PixiPremiumScene.alpha(cols.text, 'bb') }), L.SUB_Y);
      status('Click to start', PixiPremiumScene.alpha(cols.accent, 'dd'));
      return;
    }

    centred(PixiPremiumScene.text(DifficultyScaler.getTierLabel(save.difficultyTier), { fontSize: Math.round(26 * s), fontWeight: '900', fill: cols.text }), L.MAIN_Y);
    const elo = DifficultyScaler.getTierElo(save.difficultyTier);
    if (elo) centred(PixiPremiumScene.text(`${elo} ELO`, { fontSize: Math.round(16 * s), fill: PixiPremiumScene.alpha(cols.text, '99') }), L.SUB_Y);
    const barX = 36;
    this.progress(card, barX, at(L.BAR_Y), w - barX * 2, Math.max(10, at(L.BAR_H)), Math.min(1, (save.storyLevel || 1) / CharacterManager.STAGE_COUNT), cols);
    centred(PixiPremiumScene.text(`Stage ${save.storyLevel || 1} / ${CharacterManager.STAGE_COUNT}`, { fontSize: Math.round(18 * s), fontWeight: '800', fill: cols.text }), L.LEVEL_Y);
    if (save.completed) status('Completed', '#7dea99');
    else status('Click to continue', PixiPremiumScene.alpha(cols.text, '99'));
  },

  drawSaveSlotArt(card, save, index, w, h, isEmpty, hover, cols) {
    const L = this.SLOT;
    const s = Layout.uiScale || 1;
    const p = h / L.H;
    const themeId = this.getAssetThemeId();
    const bgH = Math.round(L.ART_H * p);
    const bgY = Math.round(L.ART_Y * p);
    const pad = L.PAD;
    const bg = new PIXI.Sprite(PixiPremiumAssets.background(themeId));
    bg.width = w - pad * 2;
    bg.height = bgH;
    bg.x = pad;
    bg.y = bgY;
    bg.alpha = hover ? 0.74 : 0.58;
    card.addChild(bg);

    const shade = new PIXI.Graphics()
      .rect(pad, bgY, w - pad * 2, bgH).fill({ color: 0x02040b, alpha: isEmpty ? 0.34 : 0.28 })
      .rect(pad, bgY, w - pad * 2, bgH).stroke({ color: PixiPremiumScene.color(cols.text), alpha: 0.12, width: 2 });
    card.addChild(shade);

    if (isEmpty) {
      this.drawEmptySlotPieces(card, w, h, themeId, cols, bgY, bgH);
      return;
    }

    const charId = typeof save.selectedCharacter === 'object' && save.selectedCharacter
      ? save.selectedCharacter.id
      : (save.selectedCharacter || (this.characters.find(ch => ch.stage === (save.storyLevel || 1)) || this.characters[0]).id);
    const character = this.characters.find(ch => ch.id === charId) || this.characters[0];
    const portraitSize = Math.min(Math.round(L.PORTRAIT * p), bgH - 24);
    const portraitX = pad + 12;
    const portraitY = bgY + Math.round((bgH - portraitSize) / 2);
    const portrait = new PIXI.Sprite(PixiPremiumAssets.character(character.id));
    portrait.width = portraitSize;
    portrait.height = portraitSize;
    portrait.x = portraitX;
    portrait.y = portraitY;
    card.addChild(portrait);

    const badgeLabel = save.completed ? 'CLEAR' : `${save.storyLevel || 1}/${CharacterManager.STAGE_COUNT}`;
    this.drawSlotBadge(card, w - pad - L.BADGE_INSET - 30, bgY + L.BADGE_INSET + 12, badgeLabel, save.completed ? '#7dea99' : cols.accent, cols, w);

    // Name and title stacked beside the portrait, centred on it.
    const nameX = portraitX + portraitSize + 14;
    const nameMaxW = w - pad - 10 - nameX;
    const name = PixiPremiumScene.text(character.name, {
      fontSize: Math.round(19 * s), fontWeight: '900', fill: cols.text,
      stroke: { color: 0x05020d, width: 3 }, padding: 5,
    });
    PixiPremiumScene.fit(name, nameMaxW, 0.6);
    const title = PixiPremiumScene.text(character.title, {
      fontSize: Math.round(14 * s), fontWeight: '700',
      fill: PixiPremiumScene.alpha(character.colors.primary || cols.accent, 'ee'),
      stroke: { color: 0x05020d, width: 3 }, padding: 4,
    });
    PixiPremiumScene.fit(title, nameMaxW, 0.6);
    const blockH = name.height + 6 + title.height;
    name.x = nameX;
    name.y = Math.round(portraitY + portraitSize / 2 - blockH / 2);
    title.x = nameX;
    title.y = name.y + name.height + 6;
    card.addChild(name, title);
  },

  // "+" tile centred in the empty slot's artwork.
  drawEmptySlotPieces(card, w, h, themeId, cols, artY, artH) {
    const boxSize = Math.round(Math.min(84, artH * 0.46));
    const boxX = Math.round(w / 2 - boxSize / 2);
    const boxY = Math.round(artY + (artH - boxSize) / 2);
    const bar = Math.round(boxSize * 0.14);
    const len = Math.round(boxSize * 0.56);
    const accent = PixiPremiumScene.color(cols.accent);
    const plus = new PIXI.Graphics()
      .roundRect(boxX, boxY, boxSize, boxSize, 10).fill({ color: 0x071724, alpha: 0.82 })
      .roundRect(boxX, boxY, boxSize, boxSize, 10).stroke({ color: accent, alpha: 0.75, width: 2 })
      .rect(Math.round(w / 2 - bar / 2), boxY + Math.round((boxSize - len) / 2), bar, len).fill({ color: accent, alpha: 0.95 })
      .rect(Math.round(w / 2 - len / 2), boxY + Math.round((boxSize - bar) / 2), len, bar).fill({ color: accent, alpha: 0.95 });
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
    const themeId = store.get('theme') || 'pawnhollow';
    return themeId === 'custom' ? (store.get('customBgTheme') || 'pawnhollow') : themeId;
  },

  buildDifficulty() {
    const s = Layout.uiScale || 1;
    const tiers = ['rookie', 'beginner', 'intermediate', 'advanced', 'expert'];
    if (store.get('madnessUnlocked') || SuperUser.active()) tiers.push('madness');

    const portrait = Layout.isPortrait;
    const cardW = Math.min(Math.round((portrait ? 700 : 720) * s), Layout.W - 80);
    const cardX = Math.floor((Layout.W - cardW) / 2);
    const cols = ThemeManager.getCurrentColors();

    const intro = PixiPremiumScene.text('Each tier keeps the same story, but changes the AI curve across all ten opponents.', {
      fontSize: Math.round(18 * s),
      fill: PixiPremiumScene.alpha(cols.text, 'bb'),
    });
    intro.anchor.set(0.5);
    intro.x = Layout.cx;
    intro.y = 162;
    PixiPremiumScene.fit(intro, portrait ? Math.min(720, Layout.W - 60) : 900);
    this.pixiContainer.addChild(intro);

    const startY = 196;
    const gap = 12;
    const cardH = Math.min(Math.round(84 * s), Math.floor((PixiPremiumScene.contentBottom - startY - gap * (tiers.length - 1)) / tiers.length));
    const pad = 28;
    const eloW = 130;
    const labelW = Math.round(cardW * 0.34);
    tiers.forEach((tier, i) => {
      const config = DifficultyScaler.TIER_CONFIG[tier];
      PixiPremiumScene.card(this.pixiContainer, cardX, startY + i * (cardH + gap), cardW, cardH, {
        activeColor: tier === 'madness' ? '#ff4868' : cols.accent,
        accentStrip: false,
        onClick: () => this.chooseDifficulty(tier),
        draw: (card) => {
          const midY = Math.round(cardH / 2);
          const label = PixiPremiumScene.text(config.label, {
            fontSize: Math.round(24 * s), fontWeight: '900',
            fill: tier === 'madness' ? '#ff8aa0' : cols.text,
          });
          label.anchor.set(0, 0.5);
          label.x = pad;
          label.y = midY;
          PixiPremiumScene.fit(label, labelW - pad);
          card.addChild(label);

          const desc = PixiPremiumScene.text(config.desc, { fontSize: Math.round(17 * s), fill: PixiPremiumScene.alpha(cols.text, 'aa') });
          desc.anchor.set(0, 0.5);
          desc.x = labelW;
          desc.y = midY;
          PixiPremiumScene.fit(desc, cardW - labelW - eloW - pad);
          card.addChild(desc);

          const elo = PixiPremiumScene.text(`${config.elo} ELO`, { fontSize: Math.round(18 * s), fontWeight: '800', fill: cols.accent });
          elo.anchor.set(1, 0.5);
          elo.x = cardW - pad;
          elo.y = midY;
          PixiPremiumScene.fit(elo, eloW);
          card.addChild(elo);
        },
      });
    });
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
      switchScreen('worldMap');
      return;
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
    switchScreen('worldMap');
  },

  back() {
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
