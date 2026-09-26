const TrainingHubScreen = {
  isPixiScreen: true,
  pixiContainer: null,

  init() {
    this.build();
  },

  build() {
    if (this.pixiContainer) this.pixiContainer.destroy({ children: true });

    const cols = ThemeManager.getCurrentColors();
    const W = PixiPremiumScene.W;
    const H = PixiPremiumScene.H;
    const s = Layout.uiScale || 1;

    this.pixiContainer = PixiPremiumScene.root('Training', 'Sharpen your chess skills', {
      footerHint: 'Select an option to begin',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);

    const progress = store.get('trainingProgress');
    const totalStars = progress.totalStars || 0;
    const maxStars = TRAINING_LEVELS.length * 3;
    const unlockedLevel = progress.unlockedLevel || 1;
    const streak = progress.currentStreak || 0;
    const solvedCount = Object.values(progress.levels || {}).filter(l => l.solved).length;

    // Stats strip, coach line and three menu cards, centred as one block.
    const L = { W: 560, STATS_H: 96, GAP: 18, CARD_H: 84, CARD_GAP: 12, ICON: 44, TOP: 150 };
    const contentW = Math.min(L.W, W - 80);
    const cx = Math.floor((W - contentW) / 2);

    const coachLine = streak > 0
      ? CoachCharacter.getLine('returnVisit', { streak: streak.toString() })
      : CoachCharacter.getLine('welcome');
    const coachText = PixiPremiumScene.text(coachLine, {
      fontFamily: PixiTextStyles.FONT_BODY,
      fontSize: Math.round(17 * s),
      fill: PixiColorUtil.alpha(cols.text, 'cc'),
      align: 'center',
      wordWrap: true, wordWrapWidth: contentW - 20,
    });

    const buttons = [
      { label: solvedCount > 0 ? 'Continue Training' : 'Start Training', sub: `Level ${unlockedLevel}`, action: 'continue', primary: true, icon: 'play' },
      { label: 'Level Select', sub: `${solvedCount}/30 completed`, action: 'levels', icon: 'progress' },
      { label: 'Board Editor', sub: 'Create custom positions', action: 'editor', icon: 'settings' },
    ];
    const blockH = L.STATS_H + L.GAP + coachText.height + L.GAP + buttons.length * L.CARD_H + (buttons.length - 1) * L.CARD_GAP;
    const statsY = Math.round(L.TOP + Math.max(0, (PixiPremiumScene.contentBottom - L.TOP - blockH) / 2));

    PixiPremiumScene.card(this.pixiContainer, cx, statsY, contentW, L.STATS_H, {
      interactive: false,
      alpha: 0.6,
      accentStrip: false,
      draw: (card) => {
        const statData = [
          { label: 'Stars', value: `${totalStars}/${maxStars}` },
          { label: 'Solved', value: `${solvedCount}/30` },
          { label: 'Streak', value: `${streak}` },
        ];
        const colW = contentW / 3;
        statData.forEach((stat, i) => {
          const sx = Math.round(colW * i + colW / 2);
          const val = PixiPremiumScene.text(stat.value, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: Math.round(26 * s), fill: cols.accent });
          const lbl = PixiPremiumScene.text(stat.label, { fontSize: Math.round(16 * s), fontWeight: '700', fill: PixiColorUtil.alpha(cols.text, 'aa') });
          const h = val.height + 4 + lbl.height;
          val.anchor.set(0.5, 0);
          lbl.anchor.set(0.5, 0);
          val.x = sx;
          lbl.x = sx;
          val.y = Math.round((L.STATS_H - h) / 2);
          lbl.y = val.y + val.height + 4;
          card.addChild(val, lbl);
          if (i > 0) card.addChild(new PIXI.Graphics().rect(Math.round(colW * i), 22, 2, L.STATS_H - 44).fill({ color: PixiPremiumScene.color(cols.text), alpha: 0.12 }));
        });
      },
    });

    coachText.anchor.set(0.5, 0);
    coachText.x = W / 2;
    coachText.y = statsY + L.STATS_H + L.GAP;
    this.pixiContainer.addChild(coachText);

    const btnStartY = coachText.y + coachText.height + L.GAP;
    buttons.forEach((btn, i) => {
      this._createMenuButton(cx, btnStartY + i * (L.CARD_H + L.CARD_GAP), contentW, L.CARD_H, btn, cols, s, L.ICON);
    });

    PixiPremiumScene.button(this.pixiContainer, 36, PixiPremiumScene.bottomButtonY(), 160, 44, 'Back', () => this._handleAction('back'), { icon: 'back' });
  },

  _createMenuButton(x, y, w, h, btn, cols, s, iconSize) {
    PixiPremiumScene.card(this.pixiContainer, x, y, w, h, {
      active: btn.primary,
      alpha: btn.primary ? 0.92 : 0.68,
      accentStrip: false,
      onClick: () => this._handleAction(btn.action),
      draw: (card) => {
        const icon = new PIXI.Sprite(PixiPremiumAssets.icon(btn.icon));
        icon.width = iconSize;
        icon.height = iconSize;
        icon.x = 22;
        icon.y = Math.round((h - iconSize) / 2);
        card.addChild(icon);
        const textX = 22 + iconSize + 18;
        const label = PixiPremiumScene.text(btn.label, { fontSize: Math.round(20 * s), fontWeight: '800', fill: cols.text });
        const sub = PixiPremiumScene.text(btn.sub, { fontSize: Math.round(15 * s), fill: PixiColorUtil.alpha(cols.text, '99') });
        PixiPremiumScene.fit(label, w - textX - 24, 0.6);
        PixiPremiumScene.fit(sub, w - textX - 24, 0.6);
        const blockH = label.height + 4 + sub.height;
        label.x = textX;
        label.y = Math.round((h - blockH) / 2);
        sub.x = textX;
        sub.y = label.y + label.height + 4;
        card.addChild(label, sub);
      },
    });
  },

  _handleAction(action) {
    if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') {
      audioManager.playButton();
    }
    switch (action) {
      case 'continue': {
        const progress = store.get('trainingProgress');
        const levelId = progress.unlockedLevel || 1;
        const level = TRAINING_LEVELS.find(l => l.id === levelId);
        if (level) {
          switchScreen('puzzle', { levelId, source: 'curriculum' });
        } else {
          switchScreen('levelSelect');
        }
        break;
      }
      case 'levels':
        switchScreen('levelSelect');
        break;
      case 'editor':
        switchScreen('boardEditor');
        break;
      case 'back':
        switchScreen('home');
        break;
    }
  },

  pixiUpdate(dt) {
    PixiPremiumScene.update(this.pixiContainer, dt);
  },

  destroy() {
    PixiPremiumScene.destroy(this);
  },

  handleKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      this._handleAction('back');
    }
  },
};
