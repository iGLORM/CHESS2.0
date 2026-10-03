// Great Board mode's setup (Play > Great Board, after the story is finished): a
// preview of this game's board, split into four quarters with a guardian's rule each,
// the bot's strength, and Shuffle / Play. The game itself runs in GameScreen
// (mode 'greatboard') with the rule from GreatBoard.make().
const GreatBoardScreen = {
  isPixiScreen: true,
  pixiContainer: null,

  L: {
    TOP: 150,
    SQ: 46,            // preview square size
    GAP: 40,           // board preview to the rules panel
    ROW_GAP: 10,
    BTN_H: 52,
  },

  init() {
    if (!this.rule) this.rule = GreatBoard.make();
    this.build();
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });
    this.pixiContainer = PixiPremiumScene.root('Great Board', 'Four worlds, one board', {
      footerHint: 'Shuffle for new regions, Enter to play',
      themeId: 'greatboard',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);
    const L = this.L;
    const cols = ThemeManager.getCurrentColors();
    const s = Layout.uiScale || 1;
    const portrait = Layout.isPortrait;
    const boardW = L.SQ * 8;
    const panelW = portrait ? Layout.W - 72 : Math.min(620, Layout.W - boardW - L.GAP - 112);
    const totalW = portrait ? panelW : boardW + L.GAP + panelW;
    const x0 = Math.round((Layout.W - totalW) / 2);
    const bx = portrait ? Math.round((Layout.W - boardW) / 2) : x0;
    const by = L.TOP + 10;
    this._drawBoard(bx, by);

    const px = portrait ? x0 : x0 + boardW + L.GAP;
    const py = portrait ? by + boardW + 24 : L.TOP;
    const ph = portrait ? PixiPremiumScene.contentBottom - py : Math.max(boardW + 20, 440);
    PixiPremiumScene.panel(this.pixiContainer, px, py, panelW, ph, { accent: '#ffc848', accentAlpha: 0.7 });
    let y = py + 22;
    for (const r of this.rule.regions) {
      const info = GreatBoard.REGIONS[r.rule];
      const chip = new PIXI.Graphics().rect(px + 22, y + 3, 14, 14).fill(PixiColorUtil.hexToNum(info.color))
        .rect(px + 22, y + 3, 14, 14).stroke({ color: 0x0a0812, width: 2 });
      const name = PixiPremiumScene.text(`${info.short}  ·  ${info.name}`, { fontSize: Math.round(17 * s), fontWeight: '900', fill: info.color });
      name.x = px + 46;
      name.y = y;
      const where = PixiPremiumScene.text(r.label, { fontSize: Math.round(13 * s), fontWeight: '800', fill: PixiPremiumScene.alpha(cols.text, '88') });
      where.anchor.set(1, 0);
      where.x = px + panelW - 22;
      where.y = y + 3;
      const text = PixiPremiumScene.text(info.text, { fontSize: Math.round(14 * s), fill: PixiPremiumScene.alpha(cols.text, 'cc'), wordWrap: true, wordWrapWidth: panelW - 70, lineHeight: 19 });
      text.x = px + 46;
      text.y = y + name.height + 4;
      this.pixiContainer.addChild(chip, name, where, text);
      y = text.y + text.height + L.ROW_GAP + 6;
    }

    // The bot's strength.
    const label = PixiPremiumScene.text('OPPONENT', { fontSize: 12, fontWeight: '900', fill: PixiPremiumScene.alpha(cols.text, '88'), letterSpacing: 1 });
    label.x = px + 22;
    label.y = y + 4;
    this.pixiContainer.addChild(label);
    const current = this._level();
    const lw = Math.floor((panelW - 44 - 3 * 10) / 4);
    GreatBoard.LEVELS.forEach((lv, i) => {
      PixiPremiumScene.button(this.pixiContainer, px + 22 + i * (lw + 10), y + 26, lw, 44, lv.name, () => {
        store.set('greatBoardLevel', lv.level);
        store.saveProgress();
        this.build();
      }, { primary: lv.level === current, fontSize: 16 });
    });

    const btnY = py + ph - L.BTN_H - 20;
    const bw = Math.floor((panelW - 44 - 12) / 2);
    PixiPremiumScene.button(this.pixiContainer, px + 22, btnY, bw, L.BTN_H, 'Shuffle', () => this.shuffle(), { fontSize: 18 });
    PixiPremiumScene.button(this.pixiContainer, px + 22 + bw + 12, btnY, bw, L.BTN_H, 'Play', () => this.play(), { primary: true, icon: 'play', fontSize: 20 });

    PixiPremiumScene.button(this.pixiContainer, 36, PixiPremiumScene.bottomButtonY(), 160, 44, 'Back', () => this.back(), { icon: 'back' });
  },

  _level() {
    const lvl = store.get('greatBoardLevel');
    return typeof lvl === 'number' ? lvl : 6;
  },

  // The preview: ivory and lapis squares, each quarter tinted and labelled, gear walls marked.
  _drawBoard(x, y) {
    const sq = this.L.SQ;
    const g = new PIXI.Graphics();
    g.rect(x - 8, y - 8, sq * 8 + 16, sq * 8 + 16).fill(0x0a0812)
      .rect(x - 5, y - 5, sq * 8 + 10, sq * 8 + 10).fill(0xc8902a)
      .rect(x - 2, y - 2, sq * 8 + 4, sq * 8 + 4).fill(0x0a0812);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      g.rect(x + c * sq, y + r * sq, sq, sq).fill((r + c) % 2 === 0 ? 0xf2e8d0 : 0x1e2860);
    }
    this.pixiContainer.addChild(g);
    for (const reg of this.rule.regions) {
      const info = GreatBoard.REGIONS[reg.rule], color = PixiColorUtil.hexToNum(info.color);
      const rx = x + reg.cols[0] * sq, ry = y + reg.rows[0] * sq;
      const t = new PIXI.Graphics().rect(rx, ry, sq * 4, sq * 4).fill({ color, alpha: 0.28 })
        .rect(rx + 2, ry + 2, sq * 4 - 4, sq * 4 - 4).stroke({ color, width: 4 });
      const name = PixiPremiumScene.text(info.short.toUpperCase(), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 16, fill: info.color, stroke: { color: '#0a0812', width: 5 } });
      name.anchor.set(0.5, 0);
      name.x = rx + sq * 2;
      name.y = ry + 8;
      this.pixiContainer.addChild(t, name);
    }
    for (const w of this.rule.walls || []) {
      const cx = x + w.col * sq + sq / 2, cy = y + w.row * sq + sq / 2;
      const gear = new PIXI.Graphics();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        gear.rect(cx + Math.cos(a) * sq * 0.32 - 4, cy + Math.sin(a) * sq * 0.32 - 4, 8, 8).fill(0xb58a4a);
      }
      gear.circle(cx, cy, sq * 0.3).fill(0xe0a848).circle(cx, cy, sq * 0.12).fill(0x3a2410);
      this.pixiContainer.addChild(gear);
    }
  },

  shuffle() {
    this.rule = GreatBoard.make();
    if (typeof audioManager !== 'undefined' && audioManager.playSelect) audioManager.playSelect();
    this.build();
  },

  play() {
    const rule = this.rule;
    this.rule = null;    // the next visit deals a new board
    store.update({ mode: 'greatboard', p1IsWhite: true, miniGamesEnabled: true });
    store.saveProgress();
    switchScreen('game', { rule });
  },

  back() {
    if (typeof audioManager !== 'undefined' && audioManager.playButton) audioManager.playButton();
    switchScreen('playMenu');
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  destroy() {
    PixiPremiumScene.destroy(this);
  },

  handleKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Backspace') this.back();
    else if (e.key === 'Enter') this.play();
    else if (e.key === 's' || e.key === 'S') this.shuffle();
  },
};
