const CharacterSelect = {
  characters: [],
  hoveredIndex: -1,
  selectedChar: null,
  showDialogue: false,

  // Save-slot system state
  phase: 'slots',
  hoveredSlot: -1,
  hoveredTier: -1,

  init() {
    this.characters = CHARACTERS;
    this.hoveredIndex = -1;
    this.selectedChar = null;
    this.showDialogue = false;
    this.phase = 'slots';
    this.hoveredSlot = -1;
    this.hoveredTier = -1;
  },

  destroy() {},

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      ctx.fillRect(0, 0, 1280, 800);
    }

    if (this.phase === 'slots') {
      this.renderSlots(ctx, cols);
    } else if (this.phase === 'difficulty') {
      this.renderDifficulty(ctx, cols);
    } else if (this.phase === 'characters') {
      this.renderCharacters(ctx, cols);
    }

    UIHelpers.drawDitheredRect(ctx, 0, 770, 1280, 30, cols.accent, '11');
  },

  // ------------------------------------------------------------------
  // SAVE SLOTS PHASE
  // ------------------------------------------------------------------
  renderSlots(ctx, cols) {
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STORY MODE', 640, 60);
    ctx.fillStyle = cols.text + '88';
    ctx.font = '14px monospace';
    ctx.fillText('Choose Save', 640, 85);
    UIHelpers.drawSeparator(ctx, 400, 95, 480, cols);

    const saves = store.get('storySaves');
    const cardW = 300;
    const cardH = 360;
    const gap = 40;
    const startX = (1280 - (cardW * 3 + gap * 2)) / 2;
    const startY = 180;

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (cardW + gap);
      const y = startY;
      const save = saves[i];
      const isEmpty = !save.difficultyTier;
      const isHover = this.hoveredSlot === i;

      UIHelpers.drawCard(ctx, x, y, cardW, cardH, cols, {
        hover: isHover,
        accentStripe: isEmpty ? null : (save.completed ? '#44dd44' : cols.accent),
      });

      ctx.fillStyle = cols.accent;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`SAVE ${i + 1}`, x + cardW / 2, y + 40);

      if (isEmpty) {
        ctx.fillStyle = cols.text + '66';
        ctx.font = '16px monospace';
        ctx.fillText('New Game', x + cardW / 2, y + 160);

        ctx.fillStyle = cols.text + '44';
        ctx.font = '13px monospace';
        ctx.fillText('Click to start', x + cardW / 2, y + 190);
        UIHelpers.drawIcon(ctx, x + cardW / 2 - 4, y + 140, 'lock', 8, cols, { color: cols.text + '44' });
      } else {
        const tierLabel = DifficultyScaler.getTierLabel(save.difficultyTier);
        const tierElo = DifficultyScaler.getTierElo(save.difficultyTier);

        ctx.fillStyle = save.difficultyTier === 'madness' ? (cols.checkHighlight || cols.accent) : cols.text;
        ctx.font = 'bold 20px monospace';
        ctx.fillText(tierLabel, x + cardW / 2, y + 100);

        ctx.fillStyle = cols.text + '88';
        ctx.font = '13px monospace';
        ctx.fillText(tierElo, x + cardW / 2, y + 125);

        ctx.fillStyle = cols.text;
        ctx.font = '16px monospace';
        ctx.fillText(`Level ${save.storyLevel} / 10`, x + cardW / 2, y + 180);

        // Progress bar
        UIHelpers.drawProgressBar(ctx, x + 30, y + 200, cardW - 60, 8, save.storyLevel / 10, cols);

        if (save.completed) {
          ctx.fillStyle = cols.checkHighlight || cols.accent;
          ctx.font = 'bold 14px monospace';
          ctx.fillText('COMPLETED', x + cardW / 2, y + 240);
        } else {
          ctx.fillStyle = cols.text + '66';
          ctx.font = '13px monospace';
          ctx.fillText('Click to continue', x + cardW / 2, y + 240);
        }
      }
    }

    UIHelpers.drawButton(ctx, 30, 740, 150, 40, '< Home', cols, { font: 'bold 14px monospace' });
  },

  // ------------------------------------------------------------------
  // DIFFICULTY SELECT PHASE
  // ------------------------------------------------------------------
  renderDifficulty(ctx, cols) {
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT YOUR CHESS EXPERIENCE', 640, 60);
    ctx.fillStyle = cols.text + '88';
    ctx.font = '14px monospace';
    ctx.fillText('This determines how the AI scales across the story', 640, 85);
    UIHelpers.drawSeparator(ctx, 300, 95, 680, cols);

    const tiers = ['rookie', 'beginner', 'intermediate', 'advanced', 'expert'];
    if (store.get('madnessUnlocked')) tiers.push('madness');

    const btnW = 480;
    const btnH = 60;
    const gap = 16;
    const startX = (1280 - btnW) / 2;
    const startY = 220;

    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      const config = DifficultyScaler.TIER_CONFIG[tier];
      const y = startY + i * (btnH + gap);
      const isHover = this.hoveredTier === i;

      UIHelpers.drawCard(ctx, startX, y, btnW, btnH, cols, {
        hover: isHover,
        accentStripe: tier === 'madness' ? '#ff4444' : cols.accent,
      });

      ctx.fillStyle = tier === 'madness' ? (cols.checkHighlight || cols.accent) : cols.text;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(UIHelpers.truncateText(ctx, config.label, 200), startX + 20, y + 28);

      ctx.fillStyle = cols.text + '88';
      ctx.font = '13px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(config.elo, startX + btnW - 20, y + 28);

      ctx.fillStyle = cols.text + '66';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(UIHelpers.truncateText(ctx, config.desc, btnW - 40), startX + 20, y + 48);

      const tierIcons = { rookie: 'shield', beginner: 'shield', intermediate: 'sword', advanced: 'sword', expert: 'crown', madness: 'skull' };
      UIHelpers.drawIcon(ctx, startX + btnW - 25, y + 14, tierIcons[tier], 10, cols, { color: tier === 'madness' ? '#ff4444' : cols.text + '88' });
    }

    UIHelpers.drawButton(ctx, 30, 740, 150, 40, '< Back', cols, { font: 'bold 14px monospace' });
  },

  // ------------------------------------------------------------------
  // CHARACTER SELECT PHASE
  // ------------------------------------------------------------------
  renderCharacters(ctx, cols) {
    const save = store.getActiveSave();
    const maxUnlocked = save ? save.maxUnlockedLevel : 1;
    const currentStoryLevel = save ? save.storyLevel : 1;

    // Title
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CHOOSE YOUR OPPONENT', 640, 50);

    ctx.fillStyle = cols.text + '77';
    ctx.font = '12px monospace';
    ctx.fillText('Story Mode — ' + currentStoryLevel + '/10', 640, 75);

    if (save && save.difficultyTier) {
      ctx.fillStyle = cols.accent + 'aa';
      ctx.font = '11px monospace';
      ctx.fillText(DifficultyScaler.getTierLabel(save.difficultyTier) + ' difficulty', 640, 90);
    }

    // Character grid
    const startX = 100;
    const startY = 110;
    const cardW = 200;
    const cardH = 280;
    const gapX = 30;
    const gapY = 30;
    const perRow = 5;

    for (let i = 0; i < this.characters.length; i++) {
      const ch = this.characters[i];
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const isHover = i === this.hoveredIndex && ch.level <= maxUnlocked;
      const isUnlocked = ch.level <= maxUnlocked;
      const isSelected = this.selectedChar && this.selectedChar.id === ch.id;

      UIHelpers.drawCard(ctx, x, y, cardW, cardH, cols, {
        hover: isHover,
        active: isSelected,
        accentStripe: isUnlocked ? ch.colors.primary : null,
        disabled: !isUnlocked,
      });
      ctx.globalAlpha = isUnlocked ? 1 : 0.5;

      // Character sprite
      const spriteSize = 80;
      const sx = x + (cardW - spriteSize) / 2;
      const sy = y + 20;

      if (isUnlocked) {
        const sprite = CharacterManager.getCharacterSprite(ch, spriteSize);
        ctx.drawImage(sprite, sx, sy, spriteSize, spriteSize);
      } else {
        UIHelpers.drawIcon(ctx, x + cardW / 2 - 5, y + 70, 'lock', 10, cols, { color: cols.text + '44' });
      }

      ctx.globalAlpha = 1;

      // Character name
      ctx.fillStyle = isUnlocked ? cols.text : cols.text + '44';
      ctx.font = isHover ? 'bold 16px monospace' : '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(UIHelpers.truncateText(ctx, isUnlocked ? ch.name : '???', cardW - 20), x + cardW / 2, y + 120);

      // Title
      if (isUnlocked) {
        ctx.fillStyle = ch.colors.primary;
        ctx.font = '12px monospace';
        ctx.fillText(UIHelpers.truncateText(ctx, ch.title, cardW - 20), x + cardW / 2, y + 140);
      }

      // Level
      ctx.fillStyle = isUnlocked ? cols.text + '88' : cols.text + '44';
      ctx.font = '13px monospace';
      ctx.fillText('Level ' + ch.level, x + cardW / 2, y + 160);

      // Dialogue preview on hover
      if (isHover && !this.showDialogue) {
        ctx.fillStyle = cols.text + 'bb';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        const words = ch.dialogue.before;
        ctx.fillText('"', x + cardW / 2, y + 180);
        ctx.textAlign = 'left';
        UIHelpers.wrapText(ctx, words, x + 10, y + 192, cardW - 20, 14, 5);
      }

      // Level progress bar for current level
      if (ch.level === currentStoryLevel && isUnlocked) {
        UIHelpers.drawProgressBar(ctx, x + 20, y + cardH - 22, cardW - 40, 6, ch.level / 10, cols, { fill: cols.accent });
      }

      // "CURRENT" label
      if (ch.level === currentStoryLevel) {
        ctx.fillStyle = cols.accent;
        ctx.font = 'bold 10px monospace';
        ctx.fillText('NEXT', x + cardW / 2, y + cardH - 30);
      }

      // Beat indicator
      if (ch.level < currentStoryLevel) {
        ctx.fillStyle = cols.accent;
        ctx.font = '12px monospace';
        ctx.fillText('DEFEATED', x + cardW / 2, y + cardH - 30);
      }
    }

    // Bottom bar with back button and theme button
    UIHelpers.drawButton(ctx, 30, 740, 150, 40, '< Home', cols, { font: 'bold 14px monospace' });
    UIHelpers.drawButton(ctx, 1280 - 180, 740, 150, 40, 'Themes', cols, { font: 'bold 12px monospace' });

    // Dialogue popup
    if (this.showDialogue && this.selectedChar) {
      UIHelpers.drawPanel(ctx, 200, 250, 880, 340, cols, { accentTop: true });

      const sprite = CharacterManager.getCharacterSprite(this.selectedChar, 64);
      ctx.drawImage(sprite, 260, 290, 64, 64);

      ctx.fillStyle = this.selectedChar.colors.primary;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(UIHelpers.truncateText(ctx, this.selectedChar.name, 700), 350, 320);
      ctx.fillStyle = cols.text + '88';
      ctx.font = '12px monospace';
      ctx.fillText(UIHelpers.truncateText(ctx, this.selectedChar.title, 700), 350, 340);

      ctx.fillStyle = cols.text;
      ctx.font = '14px monospace';
      UIHelpers.wrapText(ctx, this.selectedChar.dialogue.before, 260, 370, 780, 22);

      // Fight button glow
      ctx.fillStyle = this.selectedChar.colors.primary + '33';
      ctx.fillRect(535, 485, 210, 60);
      ctx.fillStyle = this.selectedChar.colors.primary + '18';
      ctx.fillRect(525, 475, 230, 80);

      // Fight button
      UIHelpers.drawButton(ctx, 540, 490, 200, 50, 'FIGHT!', cols, {
        active: true,
        fill: this.selectedChar.colors.primary,
        textColor: cols.text,
        font: 'bold 18px monospace',
        accentStripe: this.selectedChar.colors.primary,
      });

      // Cancel button
      UIHelpers.drawButton(ctx, 540, 550, 200, 40, 'Cancel', cols, { font: 'bold 14px monospace' });
    }
  },

  // ------------------------------------------------------------------
  // INPUT HANDLERS
  // ------------------------------------------------------------------
  handleClick(x, y) {
    if (this.phase === 'slots') return this.handleSlotsClick(x, y);
    if (this.phase === 'difficulty') return this.handleDifficultyClick(x, y);
    if (this.phase === 'characters') return this.handleCharactersClick(x, y);
  },

  handleSlotsClick(x, y) {
    // Back button
    if (x >= 30 && x <= 180 && y >= 740 && y <= 780) {
      switchScreen('home');
      return;
    }

    const saves = store.get('storySaves');
    const cardW = 300;
    const cardH = 360;
    const gap = 40;
    const startX = (1280 - (cardW * 3 + gap * 2)) / 2;
    const startY = 180;

    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (cardW + gap);
      const cy = startY;
      if (x >= cx && x <= cx + cardW && y >= cy && y <= cy + cardH) {
        const save = saves[i];
        if (!save.difficultyTier) {
          // Empty slot: choose difficulty first
          this.selectedSlot = i;
          this.phase = 'difficulty';
          this.hoveredTier = -1;
        } else {
          // Occupied slot: load it and go to character grid
          store.setActiveSlot(i + 1);
          this.phase = 'characters';
          this.hoveredIndex = -1;
          this.selectedChar = null;
          this.showDialogue = false;
        }
        return;
      }
    }
  },

  handleDifficultyClick(x, y) {
    // Back button
    if (x >= 30 && x <= 180 && y >= 740 && y <= 780) {
      this.phase = 'slots';
      this.hoveredSlot = -1;
      return;
    }

    const tiers = ['rookie', 'beginner', 'intermediate', 'advanced', 'expert'];
    if (store.get('madnessUnlocked')) tiers.push('madness');

    const btnW = 480;
    const btnH = 60;
    const gap = 16;
    const startX = (1280 - btnW) / 2;
    const startY = 220;

    for (let i = 0; i < tiers.length; i++) {
      const by = startY + i * (btnH + gap);
      if (x >= startX && x <= startX + btnW && y >= by && y <= by + btnH) {
        const tier = tiers[i];
        // Initialize the save slot
        store.setActiveSlot(this.selectedSlot + 1);
        store.setActiveSave({
          difficultyTier: tier,
          storyLevel: 1,
          maxUnlockedLevel: 1,
          selectedCharacter: null,
          completed: false,
        });
        this.phase = 'characters';
        this.hoveredIndex = -1;
        this.selectedChar = null;
        this.showDialogue = false;
        return;
      }
    }
  },

  handleCharactersClick(x, y) {
    // Back button
    if (x >= 30 && x <= 180 && y >= 740 && y <= 780) {
      switchScreen('home');
      return;
    }
    // Theme button
    if (x >= 1280 - 180 && x <= 1280 - 30 && y >= 740 && y <= 780) {
      switchScreen('themeSelect', { returnTo: 'characterSelect' });
      return;
    }

    const save = store.getActiveSave();
    const maxUnlocked = save ? save.maxUnlockedLevel : 1;

    // Dialogue buttons
    if (this.showDialogue && this.selectedChar) {
      if (x >= 540 && x <= 740 && y >= 490 && y <= 540) {
        store.set('selectedCharacter', this.selectedChar);
        store.set('storyLevel', this.selectedChar.level);
        store.set('mode', 'story');
        // Also update the active save
        store.setActiveSave({
          selectedCharacter: this.selectedChar,
          storyLevel: this.selectedChar.level,
        });
        switchScreen('game');
        return;
      }
      if (x >= 540 && x <= 740 && y >= 550 && y <= 590) {
        this.showDialogue = false;
        this.selectedChar = null;
        return;
      }
      return;
    }

    // Character cards
    const startX = 100;
    const startY = 110;
    const cardW = 200;
    const cardH = 280;
    const gapX = 30;
    const gapY = 30;
    const perRow = 5;

    for (let i = 0; i < this.characters.length; i++) {
      const ch = this.characters[i];
      if (ch.level > maxUnlocked) continue;
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);
      if (x >= cx && x <= cx + cardW && y >= cy && y <= cy + cardH) {
        this.selectedChar = ch;
        this.showDialogue = true;
        return;
      }
    }
  },

  handleMouseMove(x, y) {
    if (this.phase === 'slots') {
      this.hoveredSlot = -1;
      const cardW = 300;
      const cardH = 360;
      const gap = 40;
      const startX = (1280 - (cardW * 3 + gap * 2)) / 2;
      const startY = 180;
      for (let i = 0; i < 3; i++) {
        const cx = startX + i * (cardW + gap);
        const cy = startY;
        if (x >= cx && x <= cx + cardW && y >= cy && y <= cy + cardH) {
          this.hoveredSlot = i;
          return;
        }
      }
      return;
    }

    if (this.phase === 'difficulty') {
      this.hoveredTier = -1;
      const tiers = ['rookie', 'beginner', 'intermediate', 'advanced', 'expert'];
      if (store.get('madnessUnlocked')) tiers.push('madness');
      const btnW = 480;
      const btnH = 60;
      const gap = 16;
      const startX = (1280 - btnW) / 2;
      const startY = 220;
      for (let i = 0; i < tiers.length; i++) {
        const by = startY + i * (btnH + gap);
        if (x >= startX && x <= startX + btnW && y >= by && y <= by + btnH) {
          this.hoveredTier = i;
          return;
        }
      }
      return;
    }

    if (this.phase === 'characters') {
      if (this.showDialogue) return;
      const save = store.getActiveSave();
      const maxUnlocked = save ? save.maxUnlockedLevel : 1;
      this.hoveredIndex = -1;
      const startX = 100;
      const startY = 110;
      const cardW = 200;
      const cardH = 280;
      const gapX = 30;
      const gapY = 30;
      const perRow = 5;

      for (let i = 0; i < this.characters.length; i++) {
        const ch = this.characters[i];
        if (ch.level > maxUnlocked) continue;
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const cx = startX + col * (cardW + gapX);
        const cy = startY + row * (cardH + gapY);
        if (x >= cx && x <= cx + cardW && y >= cy && y <= cy + cardH) {
          this.hoveredIndex = i;
          return;
        }
      }
    }
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      if (this.phase === 'slots') {
        switchScreen('home');
      } else if (this.phase === 'difficulty') {
        this.phase = 'slots';
        this.hoveredSlot = -1;
      } else if (this.phase === 'characters') {
        if (this.showDialogue) {
          this.showDialogue = false;
          this.selectedChar = null;
        } else {
          switchScreen('home');
        }
      }
    }
  },
};
