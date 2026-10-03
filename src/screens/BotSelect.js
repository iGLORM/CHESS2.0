// Classic: standard rules against the bot. Pick its strength and your side.
const BotSelect = {
  isPixiScreen: true,
  pixiContainer: null,
  level: BotSetup.DEFAULT_LEVEL,
  side: 'white',

  // One panel: the strength picker, a rule, then the side choice.
  LAYOUT: { W: 820, PAD: 40, TOP_PAD: 44, RULE_GAP: 26, BOTTOM_PAD: 34 },

  init() {
    this.level = BotSetup.loadLevel('classic');
    const side = store.get('classicSide');
    this.side = side || (store.get('p1IsWhite') === false ? 'black' : 'white');
    this.build();
  },

  destroy() {
    this._picker = null;
    PixiPremiumScene.destroy(this);
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Classic', 'Standard chess against the computer', {
      footerHint: 'Left / Right: strength  |  Enter: start',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const L = this.LAYOUT;
    const cols = ThemeManager.getCurrentColors();
    const portrait = Layout.isPortrait;
    const panelW = Math.min(L.W, Layout.W - (portrait ? 80 : 120));
    const panelX = Math.round(Layout.cx - panelW / 2);
    const innerW = panelW - L.PAD * 2;

    // Build into a holder first to learn the heights, then centre the panel.
    const body = new PIXI.Container();
    this._picker = BotSetup.strength(body, 0, 0, innerW, this.level, (v) => { this.level = v; });
    const ruleY = this._picker.height + L.RULE_GAP;
    const sidesY = ruleY + 2 + L.RULE_GAP;
    const sides = BotSetup.sides(body, 0, sidesY, innerW, this.side, (id) => { this.side = id; this.build(); });
    const bodyH = sidesY + sides.height;
    const panelH = L.TOP_PAD + bodyH + L.BOTTOM_PAD;

    const top = 150;
    const panelY = Math.round(top + Math.max(0, (PixiPremiumScene.contentBottom - top - panelH) / 2));
    PixiPremiumScene.panel(this.pixiContainer, panelX, panelY, panelW, panelH, { accentAlpha: 0.5 });
    body.x = panelX + L.PAD;
    body.y = panelY + L.TOP_PAD;
    body.addChild(new PIXI.Graphics().rect(0, ruleY, innerW, 2).fill({ color: PixiPremiumScene.color(cols.text), alpha: 0.12 }));
    this.pixiContainer.addChild(body);

    PixiPremiumScene.button(this.pixiContainer, 36, PixiPremiumScene.bottomButtonY(), 160, 44, 'Back', () => this.back(), { icon: 'back' });
    PixiPremiumScene.button(this.pixiContainer, Layout.W - 256, PixiPremiumScene.bottomButtonY(52), 220, 52, 'Start Game', () => this.startGame(), { primary: true, icon: 'play', fontSize: 22 });
  },

  back() {
    if (typeof audioManager !== 'undefined' && audioManager.playButton) audioManager.playButton();
    switchScreen('playMenu');
  },

  startGame() {
    BotSetup.saveLevel('classic', this.level);
    store.set('classicSide', this.side);
    store.update({
      mode: 'classic',
      p1IsWhite: BotSetup.resolveSide(this.side) === 'white',
      miniGamesEnabled: false,
    });
    store.saveProgress();
    switchScreen('game');
  },

  handleKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      this.back();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      this._picker.step(e.key === 'ArrowLeft' ? -1 : 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.startGame();
    }
  },
};
