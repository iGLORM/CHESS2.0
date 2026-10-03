// Training: the puzzle course, the mini-game practice room and the board editor.
const TrainingHubScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  _cards: [],
  _focus: null,

  init() {
    this.build();
  },

  // First unlocked level not solved yet (null when every level is solved).
  nextLevel(progress) {
    for (const level of TRAINING_LEVELS) {
      const done = (progress.levels || {})[level.id];
      if (done && done.solved) continue;
      if (LevelSelectScreen._isLevelUnlocked(level.id, progress)) return level;
    }
    return null;
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });

    const cols = ThemeManager.getCurrentColors();
    const W = PixiPremiumScene.W;
    const s = Layout.uiScale || 1;
    const portrait = Layout.isPortrait;

    this.pixiContainer = PixiPremiumScene.root('Training', 'Sharpen your chess and your reflexes', {
      footerHint: 'Arrow keys to choose, Enter to start',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const progress = store.get('trainingProgress');
    const totalStars = progress.totalStars || 0;
    const maxStars = TRAINING_LEVELS.length * 3;
    const streak = progress.currentStreak || 0;
    const solvedCount = Object.values(progress.levels || {}).filter(l => l.solved).length;
    const next = this.nextLevel(progress);
    const gameCount = typeof MiniGamePractice !== 'undefined' ? MiniGamePractice.GAME_LIST.length : 18;

    const L = { TOP: 156, STATS_H: 78, GAP: 16, TILE_GAP: portrait ? 18 : 22, SIDE: portrait ? 36 : 70 };
    const contentW = W - L.SIDE * 2;
    const x0 = L.SIDE;

    // --- Stats strip ---
    PixiPremiumScene.card(this.pixiContainer, x0, L.TOP, contentW, L.STATS_H, {
      interactive: false,
      alpha: 0.62,
      accentStrip: false,
      draw: (card) => {
        const statData = [
          { label: 'Stars', value: `${totalStars}/${maxStars}` },
          { label: 'Puzzles solved', value: `${solvedCount}/${TRAINING_LEVELS.length}` },
          { label: 'Day streak', value: `${streak}` },
        ];
        const colW = contentW / 3;
        statData.forEach((stat, i) => {
          const sx = Math.round(colW * i + colW / 2);
          const val = PixiPremiumScene.text(stat.value, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(24 * s), fill: cols.accent });
          const lbl = PixiPremiumScene.text(stat.label, { fontSize: Math.round(15 * s), fontWeight: '700', fill: PixiColorUtil.alpha(cols.text, 'aa') });
          const h = val.height + 2 + lbl.height;
          val.anchor.set(0.5, 0);
          lbl.anchor.set(0.5, 0);
          val.x = sx;
          lbl.x = sx;
          val.y = Math.round((L.STATS_H - h) / 2);
          lbl.y = val.y + val.height + 2;
          card.addChild(val, lbl);
          if (i > 0) card.addChild(new PIXI.Graphics().rect(Math.round(colW * i), 18, 2, L.STATS_H - 36).fill({ color: PixiPremiumScene.color(cols.text), alpha: 0.12 }));
        });
      },
    });

    const coachLine = streak > 1
      ? CoachCharacter.getLine('returnVisit', { streak: streak.toString() })
      : CoachCharacter.getLine('welcome');
    const coachText = PixiPremiumScene.text(`Coach Magnus: "${coachLine}"`, {
      fontSize: Math.round(17 * s),
      fontStyle: 'italic',
      fill: PixiColorUtil.alpha(cols.text, 'cc'),
      align: 'center',
      wordWrap: true, wordWrapWidth: contentW - 20,
    });
    coachText.anchor.set(0.5, 0);
    coachText.x = W / 2;
    coachText.y = L.TOP + L.STATS_H + L.GAP;
    this.pixiContainer.addChild(coachText);

    // --- Tiles ---
    const tiles = [
      {
        title: 'Puzzles',
        sub: next ? (solvedCount ? 'Continue the course' : 'Start the course') : 'Course complete!',
        detail: next ? `Level ${next.id}: ${next.title}` : 'Replay any level',
        badge: next ? `LV ${next.id}` : null,
        primary: true,
        art: PixiPremiumScene.pieceArt([{ type: 'knight', color: 'white', scale: 0.9, flip: true }]),
        action: 'continue',
      },
      {
        title: 'All Levels',
        sub: `${TRAINING_BANDS.length} sets of five puzzles`,
        detail: `${totalStars} of ${maxStars} stars`,
        art: (size) => this._starArt(size, cols),
        action: 'levels',
      },
      {
        title: 'Mini-Games',
        sub: `Practise all ${gameCount} challenges`,
        detail: 'The games that decide captures',
        art: (size) => this._miniGameArt(size),
        action: 'minigames',
      },
      {
        title: 'Board Editor',
        sub: 'Set up any position',
        detail: 'Then play it out vs the coach',
        art: PixiPremiumScene.pieceArt([{ type: 'bishop', color: 'black', dx: -0.2, scale: 0.78 }, { type: 'rook', color: 'white', dx: 0.2, scale: 0.8 }]),
        action: 'editor',
      },
    ];

    const perRow = portrait ? 2 : 4;
    const rows = Math.ceil(tiles.length / perRow);
    const tilesTop = Math.round(coachText.y + coachText.height + L.GAP + 4);
    const tileW = Math.floor((contentW - (perRow - 1) * L.TILE_GAP) / perRow);
    const tileH = Math.min(portrait ? 420 : 400, Math.floor((PixiPremiumScene.contentBottom - tilesTop - (rows - 1) * L.TILE_GAP) / rows));
    this._cards = tiles.map((t, i) => PixiPremiumScene.tile(this.pixiContainer,
      x0 + (i % perRow) * (tileW + L.TILE_GAP), tilesTop + Math.floor(i / perRow) * (tileH + L.TILE_GAP), tileW, tileH, {
        title: t.title, sub: t.sub, detail: t.detail, badge: t.badge, primary: t.primary,
        titleSize: 22, artShare: 0.5, art: t.art,
        onClick: () => this._handleAction(t.action),
      }));
    this._focus = PixiPremiumScene.focusRing(this._cards, perRow);

    PixiPremiumScene.button(this.pixiContainer, 36, PixiPremiumScene.bottomButtonY(), 160, 44, 'Back', () => this._handleAction('back'), { icon: 'back' });
  },

  // Three pixel stars for the "All Levels" tile.
  _starArt(size, cols) {
    const g = new PIXI.Graphics();
    const accent = PixiColorUtil.hexToNum(cols.accent);
    [[-0.3, 0.1, 0.2], [0, -0.08, 0.28], [0.3, 0.1, 0.2]].forEach(([dx, dy, r]) => {
      g.star(dx * size, dy * size, 5, r * size, r * size * 0.48).fill({ color: 0x000000, alpha: 0.35 });
      g.star(dx * size, dy * size - 4, 5, r * size, r * size * 0.48).fill({ color: accent });
      g.star(dx * size - r * size * 0.12, dy * size - 4 - r * size * 0.12, 5, r * size * 0.4, r * size * 0.2).fill({ color: 0xffffff, alpha: 0.35 });
    });
    return g;
  },

  // A framed mini-game thumbnail (falls back to a pawn if thumbnails are unavailable).
  _miniGameArt(size) {
    const tex = typeof PixiPremiumAssets !== 'undefined' ? PixiPremiumAssets.minigame('checkmateRun') : null;
    if (!tex) return PixiPremiumScene.pieceArt([{ type: 'pawn', color: 'white', scale: 0.8 }])(size);
    const holder = new PIXI.Container();
    const w = Math.round(size * 1.2);
    const h = Math.round(w / 1.8);
    const frame = new PIXI.Graphics()
      .poly(PixiPremiumScene.pixelShape(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 3)).fill({ color: 0x07080d, alpha: 0.9 });
    const thumb = new PIXI.Sprite(tex);
    thumb.width = w;
    thumb.height = h;
    thumb.x = -w / 2;
    thumb.y = -h / 2;
    holder.addChild(frame, thumb);
    return holder;
  },

  _handleAction(action) {
    switch (action) {
      case 'continue': {
        const next = this.nextLevel(store.get('trainingProgress'));
        if (next) switchScreen('puzzle', { levelId: next.id, source: 'curriculum' });
        else switchScreen('levelSelect');
        break;
      }
      case 'levels':
        switchScreen('levelSelect');
        break;
      case 'minigames':
        switchScreen('miniGamePractice', { from: 'trainingHub' });
        break;
      case 'editor':
        switchScreen('boardEditor');
        break;
      case 'back':
        if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') audioManager.playButton();
        switchScreen('home');
        break;
    }
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  destroy() {
    this._cards = [];
    this._focus = null;
    PixiPremiumScene.destroy(this);
  },

  handleKeyDown(e) {
    const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (keys[e.key] && this._focus) {
      e.preventDefault();
      this._focus.move(...keys[e.key]);
    } else if ((e.key === 'Enter' || e.key === ' ') && this._focus) {
      e.preventDefault();
      this._focus.press();
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      this._handleAction('back');
    }
  },
};
