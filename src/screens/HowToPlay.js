const HowToPlay = {
  isPixiScreen: true,
  pixiContainer: null,

  sections: [
    {
      title: 'Chess Basics',
      icon: 'progress',
      lines: [
        'Select a piece, then choose one of its highlighted legal squares.',
        'Capture by moving onto an occupied enemy square.',
        'Win by checkmating the opposing king.',
      ],
    },
    {
      title: 'Capture Challenges',
      icon: 'play',
      lines: [
        'Each side has 2 Defenses and earns 1 more every 2 captures.',
        'When a piece is captured, its owner can spend a Defense on a mini-game.',
        'Win it and the capture is cancelled; the attacker loses their turn.',
        'Captures that get a king out of check cannot be blocked.',
      ],
    },
    {
      title: 'Story Progress',
      icon: 'save',
      lines: [
        'Pick a save slot and climb through ten opponents.',
        'Each victory unlocks the next character.',
        'Difficulty rises as your story level increases.',
      ],
    },
    {
      title: 'Controls',
      icon: 'settings',
      lines: [
        'Click a piece, then a highlighted square. Esc pauses.',
        'U undoes your last move, F flips the board.',
        'Arrow keys step back and forward through the game.',
        'F11 or Alt+Enter toggles fullscreen.',
      ],
    },
  ],

  init() {
    this.build();
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('How To Play', 'Rules, capture challenges, story, and controls', {
      footerHint: 'Tip: practise every mini-game from Settings'
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    if (Layout.isPortrait) {
      const cardW = Math.min(700, Layout.W - 80);
      const startX = (Layout.W - cardW) / 2;
      const startY = 152;
      const gapY = 20;
      const btnArea = 100;
      const availH = Layout.H - startY - btnArea;
      const cardH = Math.min(240, Math.floor((availH - gapY * 3) / 4));
      const totalH = cardH * 4 + gapY * 3;

      PixiPremiumScene.panel(this.pixiContainer, 30, 132, Layout.W - 60, totalH + 40, { accentAlpha: 0.42 });

      const size = Math.min(...this.sections.map(sec => this.fitSize(sec, cardW, cardH)));
      this.sections.forEach((section, i) => {
        this.sectionCard(section, startX, startY + i * (cardH + gapY), cardW, cardH, size);
      });

      const btnY = Layout.H - Layout.SAFE_BOTTOM - 48;
      PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen('home'), { icon: 'back' });
      PixiPremiumScene.button(this.pixiContainer, Layout.W - 196, btnY, 160, 44, 'Practice', () => switchScreen('miniGamePractice'), { icon: 'play' });
    } else {
      const L = { X: 60, Y: 150, PAD: 28, PAD_TOP: 40, GAP: 24 };
      const panelW = Layout.W - L.X * 2;
      const panelH = PixiPremiumScene.contentBottom - L.Y;
      PixiPremiumScene.panel(this.pixiContainer, L.X, L.Y, panelW, panelH, { accentAlpha: 0.42 });
      const cardW = Math.floor((panelW - L.PAD * 2 - L.GAP) / 2);
      const cardH = Math.floor((panelH - L.PAD_TOP - L.PAD - L.GAP) / 2);
      // One text size for all four cards: the largest at which the fullest card fits.
      const size = Math.min(...this.sections.map(sec => this.fitSize(sec, cardW, cardH)));
      this.sections.forEach((section, i) => {
        const x = L.X + L.PAD + (i % 2) * (cardW + L.GAP);
        const y = L.Y + L.PAD_TOP + Math.floor(i / 2) * (cardH + L.GAP);
        this.sectionCard(section, x, y, cardW, cardH, size);
      });

      PixiPremiumScene.button(this.pixiContainer, 36, PixiPremiumScene.bottomButtonY(), 160, 44, 'Back', () => switchScreen('home'), { icon: 'back' });
      PixiPremiumScene.button(this.pixiContainer, Layout.W - 196, PixiPremiumScene.bottomButtonY(), 160, 44, 'Practice', () => switchScreen('miniGamePractice'), { icon: 'play' });
    }
  },

  CARD: { PAD: 20, ICON: 52, TITLE_H: 30, BULLET_GAP: 8 },

  // Builds the bullet list at a font size; returns the container and its height.
  bulletList(section, width, size, cols) {
    const box = new PIXI.Container();
    const dotSize = Math.max(4, Math.round(size * 0.36));
    const indent = dotSize + 10;
    let y = 0;
    section.lines.forEach((line, i) => {
      const text = PixiPremiumScene.text(line, {
        fontSize: size,
        fontWeight: '600',
        fill: cols ? PixiPremiumScene.alpha(cols.text, 'cc') : '#ffffff',
        wordWrap: true,
        wordWrapWidth: width - indent,
        lineHeight: Math.round(size * 1.3),
      });
      text.x = indent;
      text.y = y;
      const dot = new PIXI.Graphics().rect(0, 0, dotSize, dotSize).fill({ color: cols ? PixiColorUtil.hexToNum(cols.accent) : 0xffffff, alpha: 0.9 });
      dot.y = Math.round(y + size * 0.65 - dotSize / 2);
      box.addChild(dot, text);
      y += text.height + (i < section.lines.length - 1 ? this.CARD.BULLET_GAP : 0);
    });
    return { box, height: y };
  },

  textArea(w, h) {
    const C = this.CARD;
    const textLeft = C.PAD + C.ICON + 18;
    return { x: textLeft, y: C.PAD + C.TITLE_H + 12, w: w - textLeft - C.PAD, h: h - (C.PAD + C.TITLE_H + 12) - C.PAD };
  },

  fitSize(section, w, h) {
    const area = this.textArea(w, h);
    for (let size = 21; size > 12; size--) {
      const { box, height } = this.bulletList(section, area.w, size);
      box.destroy({ children: true });
      if (height <= area.h) return size;
    }
    return 12;
  },

  sectionCard(section, x, y, w, h, size) {
    const C = this.CARD;
    const fs = Layout.uiScale || 1;
    size = size || Math.round(16 * fs);
    PixiPremiumScene.card(this.pixiContainer, x, y, w, h, {
      interactive: false,
      alpha: 0.72,
      accentStrip: false,
      draw: (card) => {
        const cols = ThemeManager.getCurrentColors();
        const iconBox = new PIXI.Graphics()
          .roundRect(C.PAD, C.PAD, C.ICON, C.ICON, 8).fill({ color: PixiColorUtil.hexToNum(cols.buttonBg), alpha: 0.74 })
          .roundRect(C.PAD, C.PAD, C.ICON, C.ICON, 8).stroke({ color: PixiColorUtil.hexToNum(cols.accent), alpha: 0.62, width: 2 });
        card.addChild(iconBox);
        const icon = new PIXI.Sprite(PixiPremiumAssets.icon(section.icon));
        icon.width = C.ICON - 14;
        icon.height = C.ICON - 14;
        icon.x = C.PAD + 7;
        icon.y = C.PAD + 7;
        card.addChild(icon);

        const area = this.textArea(w, h);
        const title = PixiPremiumScene.text(section.title, { fontSize: Math.round(21 * fs), fontWeight: '900', fill: cols.text });
        title.anchor.set(0, 0.5);
        title.x = area.x;
        title.y = C.PAD + C.TITLE_H / 2;
        PixiPremiumScene.fit(title, area.w, 0.7);
        card.addChild(title);

        const { box } = this.bulletList(section, area.w, size, cols);
        box.x = area.x;
        box.y = area.y;
        card.addChild(box);
      },
    });
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  destroy() {
    PixiPremiumScene.destroy(this);
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') switchScreen('home');
  },
};
