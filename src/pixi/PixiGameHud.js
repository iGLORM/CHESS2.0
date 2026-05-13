const PixiGameHud = {
  container: null,
  initialized: false,
  _lastKey: null,

  init() {
    if (!PixiApp.stage) return;
    this.destroy();
    this.container = new PIXI.Container();
    this.container.zIndex = 120;
    this.container.eventMode = 'none';
    PixiApp.stage.addChild(this.container);
    PixiApp.stage.sortableChildren = true;
    this.initialized = true;
  },

  update(game) {
    if (!this.initialized || !this.container) return;
    const key = this._makeKey(game);
    if (key === this._lastKey) return;
    this._lastKey = key;
    this.container.removeChildren();

    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;
    this._drawTopAccent(cols);
    this._drawSidePanel(game, cols, 'left', 'white');
    this._drawSidePanel(game, cols, 'right', 'black');
    this._drawStatusBar(game, cols);
  },

  _makeKey(game) {
    return [
      Layout.orientation,
      store.get('theme'),
      game.turn,
      game.gameStatus,
      game.gameOver,
      game.reviewingAt,
      game.boardSnapshots.length,
      game.lockedTiles.length,
      game.defensiveMiniGames?.white ?? 0,
      game.defensiveMiniGames?.black ?? 0,
      game.capturedPieces.white.length,
      game.capturedPieces.black.length,
      game.moveHistory.length,
      store.get('whitePlayer'),
      store.get('blackPlayer'),
    ].join('|');
  },

  _drawTopAccent(cols) {
    const line = new PixiDitheredRect({ width: Layout.W, height: 5, color: cols.accent, alpha: 0.18 });
    this.container.addChild(line);
  },

  _text(text, x, y, style, anchorX = 0) {
    const t = PixiPremiumUI.text(text, style);
    t.anchor.set(anchorX, 0);
    t.x = x;
    t.y = y;
    this.container.addChild(t);
    return t;
  },

  _panel(x, y, w, h, cols, options = {}) {
    const g = new PIXI.Graphics();
    const accent = PixiColorUtil.hexToNum(options.accent || cols.accent);
    const fill = PixiColorUtil.hexToNum(options.fill || cols.panel);
    g.roundRect(x + 6, y + 6, w, h, 10).fill({ color: 0x000000, alpha: 0.30 });
    g.roundRect(x, y, w, h, 10).fill({ color: fill, alpha: options.alpha ?? 0.68 });
    g.roundRect(x, y, w, h, 10).stroke({ color: accent, alpha: options.active ? 0.82 : 0.34, width: options.active ? 3 : 2 });
    g.roundRect(x + 14, y + 12, w - 28, 4, 2).fill({ color: accent, alpha: options.active ? 0.92 : 0.38 });
    this.container.addChild(g);
    return g;
  },

  _drawSidePanel(game, cols, side, color) {
    if (Layout.isPortrait) {
      this._drawHorizPanel(game, cols, side, color);
      return;
    }
    const isLeft = side === 'left';
    const x = isLeft ? 34 : 1006;
    const y = 116;
    const w = 240;
    const h = 206;
    const pad = 18;
    const isTurn = game.turn === color && !game.gameOver;
    this._panel(x, y, w, h, cols, { active: isTurn, alpha: 0.68 });

    const name = color === 'white' ? store.get('whitePlayer') : store.get('blackPlayer');
    const nameText = this._text(name || (color === 'white' ? 'White' : 'Black'), x + pad, y + 30, {
      fontSize: 22,
      fontWeight: '900',
      fill: isTurn ? cols.accent : cols.text,
    });
    PixiPremiumUI.fitText(nameText, w - pad * 2 - 58);

    const avatar = new PIXI.Graphics();
    const pieceColor = color === 'white' ? 0xf2ead8 : 0x211b2f;
    const pieceStroke = color === 'white' ? 0xffffff : PixiColorUtil.hexToNum(cols.accent);
    avatar.roundRect(x + w - 66, y + 28, 44, 44, 8)
      .fill({ color: pieceColor, alpha: 0.95 })
      .roundRect(x + w - 66, y + 28, 44, 44, 8)
      .stroke({ color: pieceStroke, alpha: 0.72, width: 2 });
    avatar.rect(x + w - 52, y + 39, 16, 22).fill({ color: color === 'white' ? 0x30244a : 0xf3e9c0, alpha: 0.95 });
    avatar.rect(x + w - 57, y + 58, 26, 6).fill({ color: color === 'white' ? 0x30244a : 0xf3e9c0, alpha: 0.95 });
    this.container.addChild(avatar);

    const turnPill = new PIXI.Graphics();
    turnPill.roundRect(x + pad, y + 78, 124, 26, 6)
      .fill({ color: PixiColorUtil.hexToNum(isTurn ? cols.accent : PixiColorUtil.alpha(cols.text, '22')), alpha: isTurn ? 0.20 : 0.42 })
      .roundRect(x + pad, y + 78, 124, 26, 6)
      .stroke({ color: PixiColorUtil.hexToNum(isTurn ? cols.accent : PixiColorUtil.alpha(cols.text, '44')), alpha: 0.70, width: 2 });
    this.container.addChild(turnPill);
    if (isTurn) {
      this._text('ACTIVE TURN', x + pad + 13, y + 83, {
        fontSize: 13,
        fontWeight: '900',
        fill: PixiColorUtil.alpha(cols.accent, 'cc'),
      });
    } else {
      this._text('WAITING', x + pad + 29, y + 83, {
        fontSize: 13,
        fontWeight: '800',
        fill: PixiColorUtil.alpha(cols.text, '77'),
      });
    }

    if (game.gameplayMode) {
      const charges = game.defensiveMiniGames?.[color] ?? 0;
      this._text('DEFENSES: ' + charges, x + pad, y + 112, {
        fontSize: 12,
        fontWeight: '900',
        fill: charges > 0 ? cols.accent : PixiColorUtil.alpha(cols.text, '44'),
      });
    }

    this._text('CAPTURED', x + pad, y + 136, {
      fontSize: 13,
      fontWeight: '900',
      fill: PixiColorUtil.alpha(cols.text, '88'),
    });

    const captured = game.capturedPieces[color] || [];
    if (!captured.length) {
      this._text('No captures yet', x + pad, y + 160, {
        fontSize: 15,
        fill: PixiColorUtil.alpha(cols.text, '44'),
      });
    } else {
      const symbols = { pawn: 'p', knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' };
      const text = captured.slice(0, 24).map(p => symbols[p.type] || '?').join(' ');
      const cap = this._text(text, x + pad, y + 160, {
        fontSize: 18,
        fontWeight: '700',
        fill: color === 'white' ? '#e8e0d0' : '#aaaaaa',
        wordWrap: true,
        wordWrapWidth: w - pad * 2,
      });
      PixiPremiumUI.fitText(cap, w - pad * 2);
    }

    const values = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
    const whiteMat = game.capturedPieces.white.reduce((s, p) => s + (values[p.type] || 0), 0);
    const blackMat = game.capturedPieces.black.reduce((s, p) => s + (values[p.type] || 0), 0);
    const adv = color === 'white' ? whiteMat - blackMat : blackMat - whiteMat;
    if (adv !== 0) {
      this._text((adv > 0 ? '+' : '') + adv + ' material', x + pad, y + 188, {
        fontSize: 15,
        fontWeight: '700',
        fill: adv > 0 ? '#66dd77' : '#dd6677',
      });
    }

    if (game.mode === 'story' && color === 'black' && game.currentCharacter) {
      this._panel(x, 350, w, 112, cols, { accent: game.currentCharacter.colors.primary, alpha: 0.68 });
      this._text(game.currentCharacter.name, x + pad, 380, {
        fontSize: 16,
        fontWeight: '900',
        fill: game.currentCharacter.colors.primary,
      });
      this._text(game.currentCharacter.title || ('Level ' + game.currentCharacter.level), x + pad, 404, {
        fontSize: 14,
        fill: PixiColorUtil.alpha(cols.text, '66'),
      });
    }

    if (isLeft && game.moveHistory.length > 0) {
      this._panel(x, 350, w, 284, cols, { alpha: 0.68 });
      this._text('MOVE HISTORY', x + pad, 380, {
        fontSize: 13,
        fontWeight: '900',
        fill: PixiColorUtil.alpha(cols.text, '66'),
      });
      const files = 'abcdefgh';
      const recent = game.moveHistory.slice(-11);
      for (let i = 0; i < recent.length; i++) {
        const m = recent[i];
        const moveNum = game.moveHistory.length - recent.length + i + 1;
        const pieceChar = { pawn: '', knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' }[m.piece?.type || 'pawn'] || '';
        const to = files[m.to.col] + (8 - m.to.row);
        this._text(moveNum + '. ' + pieceChar + to, x + pad, 408 + i * 18, {
          fontSize: 15,
          fill: i === recent.length - 1 ? cols.accent : PixiColorUtil.alpha(cols.text, '77'),
        });
      }
    }
  },

  _drawHorizPanel(game, cols, side, color) {
    const isTop = side === 'right';
    const boardBottom = PixiBoardRenderer.boardOffsetY + PixiBoardRenderer.squareSize * 8;
    const gap = PixiBoardRenderer.portraitGap || 20;
    const x = 32;
    const y = isTop ? 40 : boardBottom + gap;
    const w = Layout.W - 64;
    const h = 180;
    const pad = 20;
    const isTurn = game.turn === color && !game.gameOver;
    this._panel(x, y, w, h, cols, { active: isTurn, alpha: 0.68 });

    const name = color === 'white' ? store.get('whitePlayer') : store.get('blackPlayer');
    const nameText = this._text(name || (color === 'white' ? 'White' : 'Black'), x + pad, y + 18, {
      fontSize: 32,
      fontWeight: '900',
      fill: isTurn ? cols.accent : cols.text,
    });
    PixiPremiumUI.fitText(nameText, 240);

    const avatar = new PIXI.Graphics();
    const pieceColor = color === 'white' ? 0xf2ead8 : 0x211b2f;
    const pieceStroke = color === 'white' ? 0xffffff : PixiColorUtil.hexToNum(cols.accent);
    avatar.roundRect(x + w - 76, y + 16, 52, 52, 10)
      .fill({ color: pieceColor, alpha: 0.95 })
      .roundRect(x + w - 76, y + 16, 52, 52, 10)
      .stroke({ color: pieceStroke, alpha: 0.72, width: 2 });
    avatar.rect(x + w - 62, y + 27, 18, 24).fill({ color: color === 'white' ? 0x30244a : 0xf3e9c0, alpha: 0.95 });
    avatar.rect(x + w - 67, y + 48, 28, 7).fill({ color: color === 'white' ? 0x30244a : 0xf3e9c0, alpha: 0.95 });
    this.container.addChild(avatar);

    const turnPill = new PIXI.Graphics();
    turnPill.roundRect(x + 280, y + 20, 160, 34, 8)
      .fill({ color: PixiColorUtil.hexToNum(isTurn ? cols.accent : PixiColorUtil.alpha(cols.text, '22')), alpha: isTurn ? 0.20 : 0.42 })
      .roundRect(x + 280, y + 20, 160, 34, 8)
      .stroke({ color: PixiColorUtil.hexToNum(isTurn ? cols.accent : PixiColorUtil.alpha(cols.text, '44')), alpha: 0.70, width: 2 });
    this.container.addChild(turnPill);
    if (isTurn) {
      this._text('ACTIVE TURN', x + 296, y + 26, { fontSize: 18, fontWeight: '900', fill: PixiColorUtil.alpha(cols.accent, 'cc') });
    } else {
      this._text('WAITING', x + 316, y + 26, { fontSize: 18, fontWeight: '800', fill: PixiColorUtil.alpha(cols.text, '77') });
    }

    if (game.gameplayMode) {
      const charges = game.defensiveMiniGames?.[color] ?? 0;
      this._text('DEF: ' + charges, x + 460, y + 26, { fontSize: 18, fontWeight: '900', fill: charges > 0 ? cols.accent : PixiColorUtil.alpha(cols.text, '44') });
    }

    this._text('CAPTURED', x + pad, y + 76, { fontSize: 18, fontWeight: '900', fill: PixiColorUtil.alpha(cols.text, '88') });

    const captured = game.capturedPieces[color] || [];
    const symbols = { pawn: 'p', knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' };
    const capText = captured.length ? captured.slice(0, 16).map(p => symbols[p.type] || '?').join(' ') : 'None';
    const cap = this._text(capText, x + pad, y + 106, {
      fontSize: 26, fontWeight: '700',
      fill: captured.length ? (color === 'white' ? '#e8e0d0' : '#aaaaaa') : PixiColorUtil.alpha(cols.text, '44'),
    });
    PixiPremiumUI.fitText(cap, w - pad * 2 - 100);

    const values = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
    const whiteMat = game.capturedPieces.white.reduce((s, p) => s + (values[p.type] || 0), 0);
    const blackMat = game.capturedPieces.black.reduce((s, p) => s + (values[p.type] || 0), 0);
    const adv = color === 'white' ? whiteMat - blackMat : blackMat - whiteMat;
    if (adv !== 0) {
      this._text((adv > 0 ? '+' : '') + adv, x + pad, y + 146, { fontSize: 22, fontWeight: '700', fill: adv > 0 ? '#66dd77' : '#dd6677' });
    }

    if (game.mode === 'story' && color === 'black' && game.currentCharacter) {
      this._text(game.currentCharacter.name, x + w - 280, y + 106, { fontSize: 22, fontWeight: '900', fill: game.currentCharacter.colors.primary });
    }
  },

  _drawStatusBar(game, cols) {
    const x = Layout.isPortrait ? 60 : 368;
    const y = Layout.isPortrait ? (Layout.H - 90) : 724;
    const w = Layout.isPortrait ? (Layout.W - 120) : 544;
    const h = Layout.isPortrait ? 70 : 58;
    this._panel(x, y, w, h, cols, { active: game.gameStatus === 'check', alpha: 0.68 });

    const turnText = game.turn === 'white' ? "White's Turn" : "Black's Turn";
    const statusText = game.gameStatus === 'check' ? 'CHECK!  ' + turnText : turnText;
    const status = PixiPremiumUI.text(statusText, {
      fontSize: Layout.isPortrait ? 32 : 22,
      fontWeight: '900',
      fill: game.gameStatus === 'check' ? (cols.checkHighlight || cols.accent) : cols.text,
    });
    status.anchor.set(0.5);
    status.x = Layout.cx;
    status.y = y + Math.floor(h / 2);
    PixiPremiumUI.fitText(status, 300);
    this.container.addChild(status);

    const navEnabled = game.boardSnapshots.length > 1;
    const nav = [
      { text: '<', px: x + 22, enabled: navEnabled && game.reviewingAt !== 0 },
      { text: '>', px: x + 58, enabled: navEnabled && game.reviewingAt !== null && game.reviewingAt < game.boardSnapshots.length - 1 },
    ];
    for (const item of nav) {
      const box = new PIXI.Graphics();
      box.roundRect(item.px, y + 16, 28, 28, 5)
        .fill({ color: PixiColorUtil.hexToNum(cols.buttonBg), alpha: item.enabled ? 0.75 : 0.30 })
        .roundRect(item.px, y + 16, 28, 28, 5)
        .stroke({ color: PixiColorUtil.hexToNum(item.enabled ? cols.accent : PixiColorUtil.alpha(cols.text, '33')), alpha: 0.7, width: 2 });
      this.container.addChild(box);
      const t = PixiPremiumUI.text(item.text, {
        fontSize: 17,
        fontWeight: '900',
        fill: item.enabled ? cols.text : PixiColorUtil.alpha(cols.text, '33'),
      });
      t.anchor.set(0.5);
      t.x = item.px + 14;
      t.y = y + 30;
      this.container.addChild(t);
    }
    this._text('LIVE', x + 104, y + 24, {
      fontSize: Layout.isPortrait ? 16 : 11,
      fontWeight: '900',
      fill: game.reviewingAt !== null ? cols.accent : PixiColorUtil.alpha(cols.text, '22'),
    });

    const snapIdx = game.reviewingAt !== null ? (game.reviewingAt + 1) : game.boardSnapshots.length;
    const move = PixiPremiumUI.text('Move #' + snapIdx, {
      fontSize: Layout.isPortrait ? 20 : 13,
      fontWeight: '800',
      fill: PixiColorUtil.alpha(cols.text, '66'),
    });
    move.anchor.set(1, 0);
    move.x = x + w - 22;
    move.y = y + 24;
    this.container.addChild(move);

    if (game.lockedTiles.length > 0) {
      this._text('Locked: ' + game.lockedTiles.length, x + 166, y + 27, {
        fontSize: Layout.isPortrait ? 16 : 12,
        fontWeight: '700',
        fill: cols.checkHighlight || cols.accent,
      });
    }
  },

  destroy() {
    if (this.container) {
      this.container.destroy({ children: true });
      this.container = null;
    }
    this.initialized = false;
    this._lastKey = null;
  },
};
