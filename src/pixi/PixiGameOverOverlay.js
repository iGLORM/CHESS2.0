const PixiGameOverOverlay = {
  container: null,
  initialized: false,
  _lastKey: null,
  _game: null,
  // Button rectangles in game coordinates. Clicks land on the Canvas 2D layer
  // above Pixi, so GameScreen routes them here.
  buttonRects: null,

  init(game) {
    if (!PixiApp.stage) return;
    this.destroy();
    this._game = game;
    this.container = new PIXI.Container();
    this.container.label = 'gameOverOverlay';
    this.container.zIndex = 900;
    this.container.visible = false;
    this.container.alpha = 0;
    this.container.eventMode = 'static';
    this.container.hitArea = new PIXI.Rectangle(0, 0, Layout.W, Layout.H);
    PixiApp.stage.addChild(this.container);
    PixiApp.stage.sortableChildren = true;
    this.initialized = true;
  },

  update(game) {
    if (!this.initialized || !this.container) this.init(game);
    if (!this.container) return;

    if (!game.gameOver) {
      this.hide();
      return;
    }

    this._game = game;
    const key = this._makeKey(game);
    if (key !== this._lastKey) {
      this._lastKey = key;
      this._build(game);
    }
    this.show();
  },

  show() {
    if (!this.container || this.container.visible) return;
    this.container.visible = true;
    this.container.alpha = 0;
    if (typeof gsap !== 'undefined') {
      gsap.to(this.container, { alpha: 1, duration: 0.22, ease: 'power2.out' });
    } else {
      this.container.alpha = 1;
    }
  },

  hide() {
    if (!this.container || !this.container.visible) return;
    this.container.visible = false;
    this.container.alpha = 0;
    this._lastKey = null;
    this.buttonRects = null;
  },

  _makeKey(game) {
    return [
      store.get('theme'),
      game.gameResult,
      game.gameStatus,
      game.mode,
      game.currentCharacter ? game.currentCharacter.id : '',
      game.starResult ? game.starResult.got.join('') : '',
      game.reward ? `${game.reward.coins}/${game.reward.stars}` : '',
    ].join('|');
  },

  // The result card: the menus' stepped pixel panel over a dimmed board (still visible
  // behind), a crown that drops in, the title popping, what the game paid counting up,
  // the story stars, his last line and the buttons.
  _build(game) {
    const c = this.container;
    for (const child of c.removeChildren()) {
      if (typeof gsap !== 'undefined') gsap.killTweensOf(child);
      child.destroy({ children: true });
    }

    const cols = ThemeManager.getCurrentColors();
    const P = PixiPremiumScene;
    c.addChild(new PIXI.Graphics().rect(0, 0, Layout.W, Layout.H).fill({ color: 0x05040a, alpha: 0.5 }));

    const won = game.isAIMode ? game.playerWon() : game.gameResult === 'white' || game.gameResult === 'black';
    const draw = !game.gameResult || game.gameResult === 'draw';
    const tone = draw ? '#b9b2c8' : won ? '#ffdc65' : '#8f7cff';
    const panelW = 580, mid = panelW / 2;
    const card = new PIXI.Container();
    const body = new PIXI.Container();
    let y = 40;

    // Crown with a soft glow behind it.
    const glow = new PIXI.Graphics();
    for (let r = 46; r > 0; r -= 6) glow.circle(mid, y + 22, r).fill({ color: P.color(tone), alpha: 0.05 });
    body.addChild(glow);
    const crown = new PIXI.Graphics();
    crown.rect(0, 18, 58, 12).rect(7, 6, 10, 20).rect(24, 0, 10, 26).rect(41, 8, 10, 18)
      .fill({ color: P.color(tone), alpha: draw ? 0.45 : 0.95 })
      .rect(0, 28, 58, 2).fill({ color: 0x000000, alpha: 0.3 })
      .rect(26, 2, 4, 4).rect(9, 8, 4, 4).rect(43, 10, 4, 4).fill({ color: 0xffffff, alpha: 0.35 });
    crown.pivot.set(29, 15);
    crown.scale.set(1.3);
    crown.x = mid; crown.y = y + 22;
    body.addChild(crown);
    y += 62;

    const title = PixiPremiumUI.title(this._title(game), cols, 38);
    title.anchor.set(0.5);
    title.x = mid; title.y = y + 20;
    PixiPremiumUI.fitText(title, panelW - 80);
    body.addChild(title);
    y += 48;

    const reason = P.text(game.resultReason(), { fontSize: 16, fontWeight: '700', fill: P.alpha(cols.text, 'aa') });
    reason.anchor.set(0.5, 0);
    reason.x = mid; reason.y = y;
    P.fit(reason, panelW - 100);
    body.addChild(reason);
    y += 30;

    const rewardRow = this._rewards(game, cols);
    if (rewardRow) {
      rewardRow.x = mid - rewardRow.width / 2; rewardRow.y = y + 4;
      body.addChild(rewardRow);
      y += 46;
    }

    const stars = game.mode === 'story' && game.starResult && typeof PixiStar !== 'undefined' ? game.starResult : null;
    if (stars) {
      this._stars(body, stars, y + 8, cols, mid);
      y += 48 + stars.texts.length * 22 + 6;
    }

    if (game.currentCharacter && game.gameResult) {
      const lines = game.currentCharacter.dialogue;
      const dialogue = game.gameResult === 'draw' ? (lines.draw || 'A draw. Neither of us gave an inch. Again?')
        : game.playerWon() ? lines.after
        : (game.gameStatus === 'timeout' && lines.timeout) || lines.win;
      if (dialogue) {
        const quote = P.text('"' + dialogue + '"', {
          fontSize: 15, fontWeight: '600', fontStyle: 'italic', fill: P.alpha(cols.text, 'cc'),
          wordWrap: true, wordWrapWidth: panelW - 110, lineHeight: 20, align: 'center',
        });
        quote.anchor.set(0.5, 0);
        quote.x = mid; quote.y = y + 4;
        const maxTextH = 80;
        if (quote.height > maxTextH) {
          const mask = new PIXI.Graphics().rect(40, quote.y, panelW - 80, maxTextH).fill(0xffffff);
          body.addChild(mask);
          quote.mask = mask;
        }
        body.addChild(quote);
        const who = P.text('- ' + game.currentCharacter.name, { fontSize: 13, fontWeight: '800', fill: P.alpha(tone, 'cc') });
        who.anchor.set(0.5, 0);
        who.x = mid; who.y = y + 8 + Math.min(quote.height, maxTextH);
        body.addChild(who);
        y += 34 + Math.min(quote.height, maxTextH);
      }
    }

    // Story games lead back to the world map (which plays the reward after a win).
    const story = game.mode === 'story';
    const side = story && game.currentCharacter && game.currentCharacter.side;
    const labels = side && side.noRematch ? [['Continue', 'map']]
      : !story ? [['Play Again', 'rematch'], ['Main Menu', 'menu']]
      : game.playerWon() ? [['Continue', 'map'], ['Play Again', 'rematch']]
        : [['Try Again', 'rematch'], ['Back to Map', 'map']];
    const bw = 220, bh = P.buttonHeight(56);
    y += 14;
    const buttonY = y;
    y += bh + 30;
    const panelH = y;

    // The panel goes under everything, sized to what it holds.
    P.panel(card, 0, 0, panelW, panelH, { alpha: 0.94, accent: tone });
    card.addChild(body);
    card.pivot.set(mid, panelH / 2);
    card.x = Layout.cx; card.y = Layout.cy;
    c.addChild(card);

    const panelX = Layout.cx - mid, panelY = Layout.cy - panelH / 2;
    this.buttonRects = [];
    labels.forEach(([text, action], i) => {
      const bx = labels.length === 1 ? mid - bw / 2 : mid + (i === 0 ? -bw - 12 : 12);
      P.button(card, bx, buttonY, bw, 56, text, () => {
        if (this._game && this._game.handleGameOverAction) this._game.handleGameOverAction(action);
      }, { primary: i === 0, fontSize: 18 });
      this.buttonRects.push({ action, x: panelX + bx, y: panelY + buttonY, w: bw, h: bh });
    });

    if (typeof gsap !== 'undefined') {
      card.scale.set(0.86);
      gsap.to(card.scale, { x: 1, y: 1, duration: 0.42, ease: 'back.out(1.8)' });
      const cy = crown.y;
      crown.y = cy - 40; crown.alpha = 0;
      gsap.to(crown, { y: cy, alpha: 1, duration: 0.5, delay: 0.12, ease: 'bounce.out' });
      if (won && !draw) gsap.to(crown, { rotation: 0.06, duration: 0.9, delay: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      title.scale.set(0.4);
      gsap.to(title.scale, { x: 1, y: 1, duration: 0.4, delay: 0.18, ease: 'back.out(2.4)' });
    }
  },

  // What the game paid, as chips: coins (counting up) and bonus stars.
  _rewards(game, cols) {
    const r = game.reward || {};
    if (!r.coins && !r.stars) return null;
    const P = PixiPremiumScene;
    const row = new PIXI.Container();
    let x = 0;
    const chip = (iconG, value, label) => {
      const t = P.text('+' + value + ' ' + label, { fontSize: 18, fontWeight: '900', fill: '#ffe08a' });
      const w = 46 + t.width + 16;
      row.addChild(new PIXI.Graphics().roundRect(x, 0, w, 36, 8).fill({ color: 0x000000, alpha: 0.32 })
        .roundRect(x, 0, w, 36, 8).stroke({ color: 0xe0a830, alpha: 0.6, width: 2 }));
      iconG.x = x + 22; iconG.y = 18;
      row.addChild(iconG);
      t.anchor.set(0, 0.5); t.x = x + 40; t.y = 18;
      row.addChild(t);
      if (typeof gsap !== 'undefined') {
        const n = { v: 0 };
        t.text = '+0 ' + label;
        gsap.to(n, { v: value, duration: 0.9, delay: 0.45, ease: 'power2.out', onUpdate: () => { if (!t.destroyed) t.text = '+' + Math.round(n.v) + ' ' + label; } });
      }
      x += w + 12;
    };
    if (r.coins) {
      const g = new PIXI.Graphics(), cr = 10;
      g.circle(0, 0, cr).fill(0x8a5a10).circle(0, -0.5, cr - 1.5).fill(0xe0a830).circle(0, -0.5, cr * 0.62).stroke({ color: 0xb07a1c, width: 1.5 })
        .circle(-cr * 0.3, -cr * 0.35, cr * 0.22).fill(0xfff0a0);
      chip(g, r.coins, 'coins');
    }
    if (r.stars && typeof PixiStar !== 'undefined') chip(PixiStar.create(9, true), r.stars, 'bonus stars');
    return row;
  },

  // The fight's stars: three big ones (lit for this result), then what each is for.
  _stars(c, r, y, cols, cx = Layout.cx) {
    const row = PixiStar.row(3, r.got, 17, 12);
    row.x = cx - row.width / 2;
    row.y = y;
    c.addChild(row);
    row.children.forEach((st, i) => {
      if (!r.got[i] || typeof gsap === 'undefined') return;
      st.scale.set(0);
      gsap.to(st.scale, { x: 1, y: 1, duration: 0.35, delay: 0.25 + i * 0.18, ease: 'back.out(3)' });
    });
    r.texts.forEach((t, i) => {
      const ly = y + 48 + i * 22;
      const got = r.got[i], before = !got && r.best[i];
      const mark = PixiStar.create(6, got || before);
      mark.alpha = got ? 1 : before ? 0.55 : 1;
      const label = PixiPremiumUI.text(before ? `${t} (earned before)` : t, {
        fontSize: 15,
        fontWeight: '700',
        fill: got ? '#ffe08a' : before ? PixiColorUtil.alpha(cols.text, '99') : '#8a8494',
      });
      label.anchor.set(0, 0.5);
      const tag = r.fresh[i] ? PixiPremiumUI.text('NEW', { fontSize: 12, fontWeight: '900', fill: '#7dea99' }) : null;
      const w = 20 + label.width + (tag ? tag.width + 10 : 0);
      mark.x = cx - w / 2 + 6;
      mark.y = ly;
      label.x = mark.x + 14;
      label.y = ly;
      c.addChild(mark, label);
      if (tag) {
        tag.anchor.set(0, 0.5);
        tag.x = label.x + label.width + 10;
        tag.y = ly;
        c.addChild(tag);
      }
    });
  },

  _title(game) {
    return game.resultTitle();
  },

  destroy() {
    if (this.container) {
      if (typeof gsap !== 'undefined') gsap.killTweensOf(this.container);
      this.container.destroy({ children: true });
      this.container = null;
    }
    this.initialized = false;
    this._lastKey = null;
    this._game = null;
    this.buttonRects = null;
  },
};
