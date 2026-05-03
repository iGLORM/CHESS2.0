const CharacterSelect = {
  characters: [],
  maxUnlocked: 1,
  hoveredIndex: -1,
  selectedChar: null,
  showDialogue: false,

  init() {
    this.characters = CHARACTERS;
    this.maxUnlocked = store.get('maxUnlockedLevel');
    this.hoveredIndex = -1;
    this.selectedChar = null;
    this.showDialogue = false;
  },

  destroy() {},

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    // Background - animated theme
    if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      
    }
    

    // Title
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CHOOSE YOUR OPPONENT', 640, 50);

    ctx.fillStyle = cols.text + '77';
    ctx.font = '12px monospace';
    ctx.fillText('Story Mode — ' + store.get('storyLevel') + '/10', 640, 75);

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
      const isHover = i === this.hoveredIndex && ch.level <= this.maxUnlocked;
      const isUnlocked = ch.level <= this.maxUnlocked;
      const isSelected = this.selectedChar && this.selectedChar.id === ch.id;

      // Card background
      ctx.fillStyle = isUnlocked ? (isHover ? cols.buttonHover : cols.panel) : cols.panel;
      ctx.globalAlpha = isUnlocked ? 1 : 0.5;
      ctx.fillRect(x, y, cardW, cardH);

      // Card border
      if (isSelected) {
        ctx.strokeStyle = ch.colors.primary;
        ctx.lineWidth = 3;
      } else if (isUnlocked) {
        ctx.strokeStyle = isHover ? cols.accent : cols.text + '33';
        ctx.lineWidth = isHover ? 2 : 1;
      } else {
        ctx.strokeStyle = cols.text + '22';
        ctx.lineWidth = 1;
      }
      ctx.strokeRect(x, y, cardW, cardH);

      // Character sprite (simplified - colored box with face)
      const spriteSize = 80;
      const sx = x + (cardW - spriteSize) / 2;
      const sy = y + 20;

      if (isUnlocked) {
        const sprite = CharacterManager.getCharacterSprite(ch, spriteSize);
        ctx.drawImage(sprite, sx, sy, spriteSize, spriteSize);
      } else {
        // Locked silhouette
        ctx.fillStyle = '#222';
        ctx.fillRect(sx + 10, sy + 10, spriteSize - 20, spriteSize - 20);
        ctx.fillStyle = cols.text + '44';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', sx + spriteSize / 2, sy + spriteSize / 2 + 8);
      }

      ctx.globalAlpha = 1;

      // Character name
      ctx.fillStyle = isUnlocked ? cols.text : cols.text + '44';
      ctx.font = isHover ? 'bold 14px monospace' : '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(isUnlocked ? ch.name : '???', x + cardW / 2, y + 120);

      // Title
      if (isUnlocked) {
        ctx.fillStyle = ch.colors.primary;
        ctx.font = '10px monospace';
        ctx.fillText(ch.title, x + cardW / 2, y + 138);
      }

      // Level
      ctx.fillStyle = isUnlocked ? cols.text + '88' : cols.text + '44';
      ctx.font = '11px monospace';
      ctx.fillText('Level ' + ch.level, x + cardW / 2, y + 158);

      // Dialogue preview on hover
      if (isHover && !this.showDialogue) {
        ctx.fillStyle = cols.text + 'bb';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        const words = ch.dialogue.before;
        ctx.fillText('"', x + cardW / 2, y + 185);
        // Word wrap dialogue
        ctx.textAlign = 'left';
        this.wrapText(ctx, words, x + 10, y + 200, cardW - 20, 14);
      }

      // Level progress bar for current level
      if (ch.level === store.get('storyLevel') && isUnlocked) {
        ctx.fillStyle = cols.accent + '44';
        ctx.fillRect(x + 20, y + cardH - 20, cardW - 40, 6);
        ctx.fillStyle = cols.accent;
        ctx.fillRect(x + 20, y + cardH - 20, (cardW - 40) * (store.get('storyLevel') / 10), 6);
      }

      // "CURRENT" label
      if (ch.level === store.get('storyLevel')) {
        ctx.fillStyle = cols.accent;
        ctx.font = 'bold 10px monospace';
        ctx.fillText('NEXT', x + cardW / 2, y + cardH - 30);
      }

      // Beat indicator
      if (ch.level < store.get('storyLevel')) {
        ctx.fillStyle = '#44ff44';
        ctx.font = '12px monospace';
        ctx.fillText('DEFEATED', x + cardW / 2, y + cardH - 30);
      }
    }

    // Bottom bar with back button and theme button
    ctx.fillStyle = cols.buttonBg;
    ctx.fillRect(30, 740, 150, 40);
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 740, 150, 40);
    ctx.fillStyle = cols.text;
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('< Home', 105, 766);

    // Theme button
    ctx.fillStyle = cols.buttonBg;
    ctx.fillRect(1280 - 180, 740, 150, 40);
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(1280 - 180, 740, 150, 40);
    ctx.fillStyle = cols.text;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Themes', 1280 - 105, 766);

    // Dialogue popup
    if (this.showDialogue && this.selectedChar) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(200, 250, 880, 300);

      ctx.strokeStyle = this.selectedChar.colors.primary;
      ctx.lineWidth = 3;
      ctx.strokeRect(200, 250, 880, 300);

      const sprite = CharacterManager.getCharacterSprite(this.selectedChar, 64);
      ctx.drawImage(sprite, 260, 290, 64, 64);

      ctx.fillStyle = this.selectedChar.colors.primary;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(this.selectedChar.name, 350, 320);
      ctx.fillStyle = cols.text + '88';
      ctx.font = '12px monospace';
      ctx.fillText(this.selectedChar.title, 350, 340);

      ctx.fillStyle = cols.text;
      ctx.font = '14px monospace';
      this.wrapText(ctx, this.selectedChar.dialogue.before, 260, 380, 780, 22);

      // Fight button
      ctx.fillStyle = this.selectedChar.colors.primary;
      ctx.fillRect(540, 470, 200, 50);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FIGHT!', 640, 502);

      // Cancel button
      ctx.fillStyle = cols.buttonBg;
      ctx.strokeStyle = cols.text + '66';
      ctx.lineWidth = 1;
      ctx.strokeRect(540, 530, 200, 40);
      ctx.fillStyle = cols.text;
      ctx.font = '14px monospace';
      ctx.fillText('Cancel', 640, 556);
    }
  },

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let ly = y;
    for (const word of words) {
      const test = line + word + ' ';
      const m = ctx.measureText(test);
      if (m.width > maxWidth) {
        ctx.fillText(line, x, ly);
        line = word + ' ';
        ly += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, ly);
  },

  handleClick(x, y) {
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

    // Dialogue buttons
    if (this.showDialogue && this.selectedChar) {
      // Fight button
      if (x >= 540 && x <= 740 && y >= 470 && y <= 520) {
        store.set('selectedCharacter', this.selectedChar);
        store.set('storyLevel', this.selectedChar.level);
        store.set('mode', 'story');
        switchScreen('game');
        return;
      }
      // Cancel
      if (x >= 540 && x <= 740 && y >= 530 && y <= 570) {
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
      if (ch.level > this.maxUnlocked) continue;
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
    if (this.showDialogue) return;
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
      if (ch.level > this.maxUnlocked) continue;
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);
      if (x >= cx && x <= cx + cardW && y >= cy && y <= cy + cardH) {
        this.hoveredIndex = i;
        return;
      }
    }
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      if (this.showDialogue) {
        this.showDialogue = false;
        this.selectedChar = null;
      } else {
        switchScreen('home');
      }
    }
  },
};
