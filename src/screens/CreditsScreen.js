const CreditsScreen = {
  isPixiScreen: true,
  pixiContainer: null,

  SECTIONS: [
    {
      title: 'Chess 2.0',
      lines: [
        'Created by iGLORM.',
        'Thanks for playing!',
      ],
    },
    {
      title: 'Chess engine',
      lines: [
        'Stockfish 18 (stockfish.js lite build) - GNU General Public License v3.',
        'Stockfish runs as a separate program; its source code is available at',
        'github.com/official-stockfish/Stockfish and github.com/nmrugg/stockfish.js',
      ],
    },
    {
      title: 'Libraries',
      lines: [
        'PixiJS - MIT License.   GSAP - GreenSock standard license.',
        'Pretext text layout - MIT License.   Electron - MIT License.',
      ],
    },
    {
      title: 'Fonts',
      lines: [
        'Pixelify Sans and Silkscreen - SIL Open Font License 1.1.',
        'Pixelify Sans letters C, c, 2, 3, 5, 6, 9, S and G were adjusted for legibility.',
      ],
    },
  ],

  init() {
    this.build();
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Credits', 'The people and projects behind the game', {
      footerHint: 'Full licence texts are included with the game files',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const cols = ThemeManager.getCurrentColors();
    const panelW = Math.min(1000, Layout.W - 80);
    const panelX = Math.round((Layout.W - panelW) / 2);
    const panelY = 160;
    const panelH = Layout.H - panelY - 130;
    PixiPremiumScene.panel(this.pixiContainer, panelX, panelY, panelW, panelH, { accentAlpha: 0.45 });

    let y = panelY + 40;
    for (const section of this.SECTIONS) {
      const title = PixiPremiumScene.text(section.title, { fontSize: 22, fontWeight: '900', fill: cols.accent });
      title.x = panelX + 40;
      title.y = y;
      this.pixiContainer.addChild(title);
      y += 34;
      for (const line of section.lines) {
        const t = PixiPremiumScene.text(line, {
          fontSize: 17,
          fill: PixiPremiumScene.alpha(cols.text, 'cc'),
          wordWrap: true,
          wordWrapWidth: panelW - 80,
          lineHeight: 24,
        });
        t.x = panelX + 40;
        t.y = y;
        this.pixiContainer.addChild(t);
        y += t.height + 4;
      }
      y += 20;
    }

    const btnY = Layout.isPortrait ? Layout.H - Layout.SAFE_BOTTOM - 48 : 718;
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen('howToPlay'), { icon: 'back' });
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  destroy() {
    PixiPremiumScene.destroy(this);
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') switchScreen('howToPlay');
  },
};
