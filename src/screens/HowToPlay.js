const HowToPlay = {
  isPixiScreen: true,
  pixiContainer: null,

  init() {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    this.pixiContainer = new PIXI.Container();

    // Background
    if (typeof PixiBackgroundRenderer !== 'undefined') {
      PixiBackgroundRenderer.init(this.pixiContainer);
      PixiBackgroundRenderer.render(store.get('theme') || 'space');
    }

    // Semi-transparent overlay
    const overlay = new PIXI.Graphics();
    overlay.rect(0, 0, 1280, 800).fill({ color: 0x000000, alpha: 0.5 });
    this.pixiContainer.addChild(overlay);

    // Panel
    const panel = new PixiPanel({
      width: 800,
      height: 680,
      cols: cols,
      accentTop: true,
    });
    panel.x = 240;
    panel.y = 60;
    this.pixiContainer.addChild(panel);

    // Title
    const title = new PIXI.Text({
      text: 'HOW TO PLAY',
      style: PixiTextStyles.clone(PixiTextStyles.TITLE, { fill: cols.text, padding: 10 }),
    });
    title.anchor.set(0.5, 0);
    title.x = 640;
    title.y = 78;
    this.pixiContainer.addChild(title);

    // Sections
    const sections = [
      { title: 'Chess Basics', icon: 'crown', lines: [
        'Click a piece to select it, then click a highlighted square to move.',
        'Capture enemy pieces by moving onto their square.',
        'Checkmate the enemy king to win!',
      ]},
      { title: 'Mini-Games', icon: 'target', lines: [
        'Capturing a piece has a 30% chance to trigger a mini-game.',
        'Win the mini-game to keep your capture. Lose, and the tile is locked.',
        'Each mini-game has unique controls — watch the instructions!',
      ]},
      { title: 'Story Mode', icon: 'sword', lines: [
        'Face 10 unique AI opponents with increasing difficulty.',
        'Defeat each opponent to unlock the next level.',
        'Each opponent has unique dialogue and personality.',
      ]},
      { title: 'Controls', icon: 'keyboard', lines: [
        'Mouse: Click to select pieces and interact with UI.',
        'ESC: Pause during gameplay.',
        'F11: Toggle fullscreen.',
        'Arrow Keys / Enter: Navigate menus.',
      ]},
    ];

    let y = 130;
    for (const section of sections) {
      // Accent color bar instead of icon
      const accentBar = new PIXI.Graphics();
      accentBar.rect(0, 0, 3, 20).fill(PixiColorUtil.hexToNum(cols.accent));
      accentBar.x = 272;
      accentBar.y = y - 12;
      this.pixiContainer.addChild(accentBar);

      const sectionTitle = new PIXI.Text({
        text: section.title,
        style: {
          fontFamily: PixiTextStyles.FONT_BODY,
          fontSize: 18,
          fontWeight: 'bold',
          fill: cols.accent,
        },
      });
      sectionTitle.x = 285;
      sectionTitle.y = y - 12;
      this.pixiContainer.addChild(sectionTitle);

      y += 28;

      for (const line of section.lines) {
        const bodyText = new PIXI.Text({
          text: line,
          style: {
            fontFamily: PixiTextStyles.FONT_BODY,
            fontSize: 14,
            fill: PixiColorUtil.alpha(cols.text, 'cc'),
            wordWrap: true,
            wordWrapWidth: 735,
            lineHeight: 22,
          },
        });
        bodyText.x = 285;
        bodyText.y = y;
        this.pixiContainer.addChild(bodyText);
        y += bodyText.height + 6;
      }

      const sep = new PixiSeparator({ width: 720, cols: cols });
      sep.x = 280;
      sep.y = y + 4;
      this.pixiContainer.addChild(sep);
      y += 28;
    }

    // Dithered footer
    const footer = new PixiDitheredRect({
      width: 1280,
      height: 30,
      color: cols.accent,
      alpha: 0.07,
    });
    footer.y = 770;
    this.pixiContainer.addChild(footer);

    // Back button
    const backBtn = new PixiButton({
      width: 200,
      height: 40,
      text: '< Back',
      cols: cols,
    });
    backBtn.x = 540;
    backBtn.y = 690;
    backBtn.onClick(() => switchScreen('home'));
    this.pixiContainer.addChild(backBtn);

    PixiScreenManager.setScreenContainer(this.pixiContainer);
  },

  destroy() {
    if (typeof PixiBackgroundRenderer !== 'undefined') {
      PixiBackgroundRenderer.destroy();
    }
    if (this.pixiContainer) {
      PixiScreenManager.setScreenContainer(null);
      this.pixiContainer.destroy({ children: true });
      this.pixiContainer = null;
    }
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      switchScreen('home');
    }
  },
};
