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
        'Each side starts with two defense charges.',
        'A threatened piece can spend one charge for a survival mini-game.',
        'Win to survive; lose and the capture goes through.',
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
        'Mouse selects pieces and activates UI.',
        'Escape pauses during gameplay or backs out of menus.',
        'F11 toggles fullscreen.',
      ],
    },
  ],

  init() {
    this.build();
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('How To Play', 'Rules, capture challenges, story, and controls', {
      footerHint: 'Learn the core loop, then jump back into the match',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    if (Layout.isPortrait) {
      const cardW = 700;
      const cardH = 190;
      const startX = (Layout.W - cardW) / 2;
      const startY = 152;
      const gapY = 32;

      PixiPremiumScene.panel(this.pixiContainer, 30, 132, Layout.W - 60, cardH * 4 + gapY * 3 + 60, { accentAlpha: 0.42 });

      this.sections.forEach((section, i) => {
        this.sectionCard(section, startX, startY + i * (cardH + gapY), cardW, cardH);
      });

      const btnY = Layout.H - Layout.SAFE_BOTTOM - 48;
      PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen('home'), { icon: 'back' });
      PixiPremiumScene.button(this.pixiContainer, Layout.W - 196, btnY, 160, 44, 'Practice', () => switchScreen('miniGamePractice'), { icon: 'play' });
    } else {
      PixiPremiumScene.panel(this.pixiContainer, 76, 132, 1128, 524, { accentAlpha: 0.42 });

      const cardW = 520;
      const cardH = 190;
      const startX = 100;
      const startY = 172;
      const gapX = 40;
      const gapY = 42;
      this.sections.forEach((section, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        this.sectionCard(section, startX + col * (cardW + gapX), startY + row * (cardH + gapY), cardW, cardH);
      });

      PixiPremiumScene.button(this.pixiContainer, 36, 718, 160, 44, 'Back', () => switchScreen('home'), { icon: 'back' });
      PixiPremiumScene.button(this.pixiContainer, 1084, 718, 160, 44, 'Practice', () => switchScreen('miniGamePractice'), { icon: 'play' });
    }
  },

  sectionCard(section, x, y, w, h) {
    PixiPremiumScene.card(this.pixiContainer, x, y, w, h, {
      interactive: false,
      alpha: 0.72,
      draw: (card) => {
        const cols = ThemeManager.getCurrentColors();
        const iconBox = new PIXI.Graphics();
        iconBox.roundRect(28, 34, 66, 66, 8).fill({ color: PixiColorUtil.hexToNum(cols.buttonBg), alpha: 0.74 });
        iconBox.roundRect(28, 34, 66, 66, 8).stroke({ color: PixiColorUtil.hexToNum(cols.accent), alpha: 0.62, width: 2 });
        card.addChild(iconBox);

        const icon = new PIXI.Sprite(PixiPremiumAssets.icon(section.icon));
        icon.width = 46;
        icon.height = 46;
        icon.x = 38;
        icon.y = 44;
        card.addChild(icon);

        const title = PixiPremiumScene.text(section.title, {
          fontSize: 24,
          fontWeight: '900',
          fill: cols.text,
        });
        title.x = 116;
        title.y = 30;
        PixiPremiumScene.fit(title, w - 150, 0.7);
        card.addChild(title);

        let lineY = 76;
        section.lines.forEach((line, idx) => {
          const dot = new PIXI.Graphics();
          dot.rect(0, 0, 7, 7).fill({ color: PixiColorUtil.hexToNum(cols.accent), alpha: 0.88 });
          dot.x = 118;
          dot.y = lineY + 8;
          card.addChild(dot);

          const text = PixiPremiumScene.text(line, {
            fontSize: 15,
            fontWeight: '600',
            fill: PixiPremiumScene.alpha(cols.text, 'bb'),
            wordWrap: true,
            wordWrapWidth: w - 160,
            lineHeight: 19,
          });
          text.x = 136;
          text.y = lineY;
          card.addChild(text);
          lineY += Math.max(29, text.height + 8);
        });
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
