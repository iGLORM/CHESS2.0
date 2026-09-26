const CreditsScreen = {
  isPixiScreen: true,
  pixiContainer: null,

  SECTIONS: [
    {
      title: 'Chess 2.0',
      lines: [
        'Created by iGLORM and Aymou.',
        'Thanks for playing!',
      ],
    },
    {
      title: 'Chess engine',
      lines: [
        'Stockfish 18 (Stockfish.js lite build, unmodified) - GNU GPL v3, with NO WARRANTY.',
        'It runs as a separate program. Its full source code ships in the "licenses" folder and is at github.com/nmrugg/stockfish.js (commit 32d4b5a) and github.com/official-stockfish.',
      ],
    },
    {
      title: 'Libraries',
      lines: [
        'PixiJS - MIT License.   GSAP - GreenSock standard license.',
        'Pretext text layout - MIT License.   Electron - MIT License.',
        'Three.js (3D mini-games) - MIT License.',
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

  init(data) {
    this.returnTo = (data && data.returnTo) || 'settings';
    this.build();
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Credits', 'The people and projects behind the game', {
      footerHint: 'Full licence texts are in the "licenses" folder next to the game',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const cols = ThemeManager.getCurrentColors();
    const panelW = Math.min(1000, Layout.W - 80);
    const panelX = Math.round((Layout.W - panelW) / 2);
    const pad = 44;
    const textW = panelW - pad * 2;

    // Lay the text out first so the panel can be sized to it and centred.
    const body = new PIXI.Container();
    let y = 0;
    this.SECTIONS.forEach((section, si) => {
      const title = PixiPremiumScene.text(section.title, { fontSize: 22, fontWeight: '900', fill: cols.accent });
      title.y = y;
      body.addChild(title);
      y += title.height + 8;
      for (const line of section.lines) {
        const t = PixiPremiumScene.text(line, {
          fontSize: 17,
          fill: PixiPremiumScene.alpha(cols.text, 'cc'),
          wordWrap: true,
          wordWrapWidth: textW,
          lineHeight: 24,
        });
        t.y = y;
        body.addChild(t);
        y += t.height + 4;
      }
      if (si < this.SECTIONS.length - 1) y += 18;
    });
    const top = 150;
    const panelH = Math.min(PixiPremiumScene.contentBottom - top, Math.round(y) + 40 + pad);
    const panelY = Math.round(top + (PixiPremiumScene.contentBottom - top - panelH) / 2);
    PixiPremiumScene.panel(this.pixiContainer, panelX, panelY, panelW, panelH, { accentAlpha: 0.45 });
    body.x = panelX + pad;
    body.y = panelY + 40 + Math.round((panelH - 40 - pad - y) / 2);
    this.pixiContainer.addChild(body);

    const btnY = PixiPremiumScene.bottomButtonY();
    PixiPremiumScene.button(this.pixiContainer, 36, btnY, 160, 44, 'Back', () => switchScreen(this.returnTo), { icon: 'back' });
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  destroy() {
    PixiPremiumScene.destroy(this);
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') switchScreen(this.returnTo);
  },
};
