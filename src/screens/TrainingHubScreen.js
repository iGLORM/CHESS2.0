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

    const contentW = Math.min(520, W - 100);
    const cx = Math.floor((W - contentW) / 2);

    // --- Stats card ---
    const statsY = 148;
    const statsH = Math.round(80 * s);
    PixiPremiumScene.card(this.pixiContainer, cx, statsY, contentW, statsH, {
      interactive: false,
      alpha: 0.6,
      draw: (card) => {
        const statData = [
          { label: 'Stars', value: `${totalStars}/${maxStars}` },
          { label: 'Solved', value: `${solvedCount}/30` },
          { label: 'Streak', value: `${streak}` },
        ];
        const colW = contentW / 3;
        statData.forEach((stat, i) => {
          const sx = colW * i + colW / 2;
          const val = PixiPremiumScene.text(stat.value, {
            fontFamily: PixiTextStyles.FONT_TITLE,
            fontSize: Math.round(24 * s),
            fill: cols.accent,
          });
          val.anchor.set(0.5);
          val.x = sx;
          val.y = statsH * 0.32;
          card.addChild(val);

          const lbl = PixiPremiumScene.text(stat.label, {
            fontFamily: PixiTextStyles.FONT_BODY,
            fontSize: Math.round(16 * s),
            fill: PixiColorUtil.alpha(cols.text, 'aa'),
          });
          lbl.anchor.set(0.5);
          lbl.x = sx;
          lbl.y = statsH * 0.68;
          card.addChild(lbl);
        });
      },
    });

    // --- Coach bubble ---
    const coachY = statsY + statsH + Math.round(14 * s);
    const coachLine = streak > 0
      ? CoachCharacter.getLine('returnVisit', { streak: streak.toString() })
      : CoachCharacter.getLine('welcome');
    const coachText = PixiPremiumScene.text(coachLine, {
      fontFamily: PixiTextStyles.FONT_BODY,
      fontSize: Math.round(16 * s),
      fill: PixiColorUtil.alpha(cols.text, 'bb'),
      wordWrap: true, wordWrapWidth: contentW - 20,
    });
    coachText.anchor.set(0.5, 0);
    coachText.x = W / 2;
    coachText.y = coachY;
    this.pixiContainer.addChild(coachText);

    // --- Buttons ---
    const btnH = 68;
    const btnGap = Math.round(8 * s);
    const btnStartY = coachY + coachText.height + Math.round(20 * s);

    const buttons = [
      { label: solvedCount > 0 ? 'Continue Training' : 'Start Training', sub: `Level ${unlockedLevel}`, action: 'continue', primary: true },
      { label: 'Level Select', sub: `${solvedCount}/30 completed`, action: 'levels' },
      { label: 'Board Editor', sub: 'Create custom positions', action: 'editor' },
      { label: 'Back', action: 'back' },
    ];

    buttons.forEach((btn, i) => {
      const by = btnStartY + i * (btnH + btnGap);
      this._createMenuButton(cx, by, contentW, btnH, btn, cols, s);
    });
  },

  _createMenuButton(x, y, w, h, btn, cols, s) {
    PixiPremiumScene.card(this.pixiContainer, x, y, w, h, {
      active: btn.primary,
      alpha: btn.primary ? 0.92 : 0.68,
      onClick: () => this._handleAction(btn.action),
      draw: (card) => {
        const label = PixiPremiumScene.text(btn.label, {
          fontFamily: PixiTextStyles.FONT_BODY,
          fontSize: Math.round(18 * s),
          fontWeight: '800',
          fill: cols.text,
        });
        label.anchor.set(0.5);
        label.x = w / 2;
        label.y = btn.sub ? h * 0.36 : h / 2;
        PixiPremiumScene.fit(label, w - 40, 0.6);
        card.addChild(label);

        if (btn.sub) {
          const sub = PixiPremiumScene.text(btn.sub, {
            fontSize: Math.round(13 * s),
            fill: PixiColorUtil.alpha(cols.text, '77'),
          });
          sub.anchor.set(0.5);
          sub.x = w / 2;
          sub.y = h * 0.66;
          PixiPremiumScene.fit(sub, w - 40, 0.6);
          card.addChild(sub);
        }
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
