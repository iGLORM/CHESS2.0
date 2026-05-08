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

    const usePixiBg = typeof PixiMenuBackground !== 'undefined' && PixiMenuBackground.initialized;
    if (usePixiBg) {
      ctx.clearRect(0, 0, 1280, 800);
    } else if (typeof backgroundRenderer !== 'undefined') {
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
    const startX = 54;
    const startY = 110;
    const cardW = 220;
    const cardH = 260;
    const gapX = 18;
    const gapY = 24;
    const perRow = 5;

    // Grouping panel behind the character grid
    const totalRows = Math.ceil(this.characters.length / perRow);
    const gridW = perRow * cardW + (perRow - 1) * gapX;
    const gridH = totalRows * cardH + (totalRows - 1) * gapY;
    const panelPad = 12;
    UIHelpers.drawPanel(ctx, startX - panelPad, startY - panelPad, gridW + panelPad * 2, gridH + panelPad * 2, cols);

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
        UIHelpers.drawIcon(ctx, x + cardW / 2 - 10, y + 50, 'lock', 20, cols, { color: cols.text + '44' });
      }

      ctx.globalAlpha = 1;

      // Character name
      ctx.fillStyle = isUnlocked ? cols.text : cols.text + '44';
      ctx.font = isHover ? 'bold 15px "Pixelify Sans", monospace' : '15px "Pixelify Sans", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(UIHelpers.truncateText(ctx, isUnlocked ? ch.name : '???', cardW - 20), x + cardW / 2, y + 118);

      // Title
      if (isUnlocked) {
        ctx.fillStyle = ch.colors.primary;
        ctx.font = '12px "Pixelify Sans", monospace';
        ctx.fillText(UIHelpers.truncateText(ctx, ch.title, cardW - 20), x + cardW / 2, y + 136);
      }

      // Level
      ctx.fillStyle = isUnlocked ? cols.text + '88' : cols.text + '44';
      ctx.font = '13px "Pixelify Sans", monospace';
      ctx.fillText('Level ' + ch.level, x + cardW / 2, y + 160);

      // Level progress bar for current level
      if (ch.level === currentStoryLevel && isUnlocked) {
        UIHelpers.drawProgressBar(ctx, x + 20, y + cardH - 22, cardW - 40, 6, ch.level / 10, cols, { fill: cols.accent });
      }

      // "CURRENT" label
      if (ch.level === currentStoryLevel) {
        ctx.fillStyle = cols.accent;
        ctx.font = 'bold 10px "Pixelify Sans", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NEXT', x + cardW / 2, y + cardH - 30);
      }

      // Dialogue preview on hover — centered, clipped
      if (isHover && !this.showDialogue) {
        const hasBottom = (ch.level === currentStoryLevel);
        const clipBottom = hasBottom ? 48 : 12;
        const dlgY = y + 176;
        const dlgMaxH = cardH - 176 - clipBottom;
        const dlgMaxLines = Math.max(2, Math.floor(dlgMaxH / 15));
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 4, dlgY - 4, cardW - 8, dlgMaxH + 4);
        ctx.clip();
        ctx.fillStyle = cols.text + 'cc';
        ctx.font = '12px “Pixelify Sans”, monospace';
        ctx.textAlign = 'center';
        const quote = '”' + ch.dialogue.before + '”';
        const words = quote.split(' ');
        let line = '';
        let lineNum = 0;
        for (const word of words) {
          const test = line ? line + ' ' + word : word;
          if (ctx.measureText(test).width > cardW - 24 && line) {
            if (lineNum >= dlgMaxLines - 1) {
              ctx.fillText(line + '...', x + cardW / 2, dlgY + lineNum * 15);
              lineNum++;
              line = '';
              break;
            }
            ctx.fillText(line, x + cardW / 2, dlgY + lineNum * 15);
            lineNum++;
            line = word;
          } else {
            line = test;
          }
        }
        if (line && lineNum < dlgMaxLines) {
          ctx.fillText(line, x + cardW / 2, dlgY + lineNum * 15);
        }
        ctx.restore();
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
      const panelX = 200;
      const panelY = 220;
      const panelW = 880;
      const panelH = 400;
      const pad = 30;
      const charColor = this.selectedChar.colors.primary;

      // Dimmed backdrop
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, 1280, 800);

      UIHelpers.drawPanel(ctx, panelX, panelY, panelW, panelH, cols, { accentTop: true });

      // Character sprite
      const sprite = CharacterManager.getCharacterSprite(this.selectedChar, 72);
      ctx.drawImage(sprite, panelX + pad, panelY + pad, 72, 72);

      // Character name
      ctx.fillStyle = charColor;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(UIHelpers.truncateText(ctx, this.selectedChar.name, 700), panelX + pad + 86, panelY + pad + 22);

      // Character title
      ctx.fillStyle = cols.text + '88';
      ctx.font = '13px monospace';
      ctx.fillText(UIHelpers.truncateText(ctx, this.selectedChar.title, 700), panelX + pad + 86, panelY + pad + 42);

      // Dialogue text
      ctx.fillStyle = cols.text;
      ctx.font = '14px monospace';
      UIHelpers.wrapText(ctx, this.selectedChar.dialogue.before, panelX + pad, panelY + pad + 80, panelW - pad * 2, 22);

      // Buttons area — centered, proper spacing from bottom
      const btnW = 220;
      const btnH = 44;
      const btnX = panelX + (panelW - btnW) / 2;
      const fightY = panelY + panelH - pad - btnH - 50;
      const cancelY = fightY + btnH + 10;

      // Fight button with subtle accent glow
      ctx.shadowColor = charColor;
      ctx.shadowBlur = 12;
      UIHelpers.drawButton(ctx, btnX, fightY, btnW, btnH, 'FIGHT!', cols, {
        hover: true,
        font: 'bold 18px monospace',
      });
      ctx.shadowBlur = 0;

      // Accent stripe on fight button
      ctx.fillStyle = charColor;
      ctx.fillRect(btnX + 5, fightY + 5, btnW - 10, 3);

      // Cancel button
      UIHelpers.drawButton(ctx, btnX, cancelY, btnW, btnH, 'Cancel', cols, {
        font: 'bold 14px monospace',
      });
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

    // Dialogue buttons (match updated dialog layout)
    if (this.showDialogue && this.selectedChar) {
      const btnX = 530;
      const btnW = 220;
      const fightY = 496;
      const cancelY = 550;
      const btnH = 44;
      if (x >= btnX && x <= btnX + btnW && y >= fightY && y <= fightY + btnH) {
        store.set('selectedCharacter', this.selectedChar);
        store.set('storyLevel', this.selectedChar.level);
        store.set('mode', 'story');
        store.setActiveSave({
          selectedCharacter: this.selectedChar,
          storyLevel: this.selectedChar.level,
        });
        switchScreen('game');
        return;
      }
      if (x >= btnX && x <= btnX + btnW && y >= cancelY && y <= cancelY + btnH) {
        this.showDialogue = false;
        this.selectedChar = null;
        return;
      }
      return;
    }

    // Character cards
    const startX = 54;
    const startY = 110;
    const cardW = 220;
    const cardH = 260;
    const gapX = 18;
    const gapY = 24;
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
      const startX = 54;
      const startY = 110;
      const cardW = 220;
      const cardH = 260;
      const gapX = 18;
      const gapY = 24;
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
