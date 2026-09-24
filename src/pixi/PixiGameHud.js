const PixiGameHud = {
  container: null,
  initialized: false,
  _lastKey: null,
  // Clickable status-bar areas in game coordinates, read by GameScreen.handleClick.
  hitRects: [],

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
    this.hitRects = [];
    this._drawTopAccent(cols);
    const bottom = game.bottomColor;
    this._drawSidePanel(game, cols, 'left', bottom);
    this._drawSidePanel(game, cols, 'right', bottom === 'white' ? 'black' : 'white');
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
      game.flipped,
      game.canUndo(),
      game.aiThinking,
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
    const h = 218;
    const pad = 18;
    const isTurn = game.turn === color && !game.gameOver;
    this._panel(x, y, w, h, cols, { active: isTurn, alpha: 0.68 });

    const nameText = this._text(game.getPlayerName(color), x + pad, y + 30, {
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
      const thinking = game.isAIMode && color === game.aiColor && game.aiThinking;
      this._text(thinking ? 'THINKING...' : 'ACTIVE TURN', x + pad + 13, y + 83, {
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

    if (game.usesDefenses) {
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

    if (game.mode === 'story' && color === game.aiColor && game.currentCharacter) {
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
      const rows = this.historyRows(game.moveHistory).slice(-11);
      rows.forEach((row, i) => {
        const isLast = i === rows.length - 1;
        this._text(row.text, x + pad, 408 + i * 18, {
          fontSize: 15,
          fill: row.blocked ? (cols.checkHighlight || '#ff6677') : (isLast ? cols.accent : PixiColorUtil.alpha(cols.text, '99')),
        });
      });
    }
  },

  // One line per move: "1. e4", "1... e5". A capture blocked by a minigame
  // is shown as the attempted move followed by "blocked".
  historyRows(history) {
    return history.map((m, i) => {
      const num = Math.floor(i / 2) + 1;
      const prefix = i % 2 === 0 ? num + '. ' : num + '... ';
      const san = m.san || '?';
      return m.defended
        ? { text: prefix + san.replace(/[+#]$/, '') + '  blocked', blocked: true }
        : { text: prefix + san, blocked: false };
    });
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

    const nameText = this._text(game.getPlayerName(color), x + pad, y + 18, {
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

    if (game.usesDefenses) {
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

    if (game.mode === 'story' && color === game.aiColor && game.currentCharacter) {
      this._text(game.currentCharacter.name, x + w - 280, y + 106, { fontSize: 22, fontWeight: '900', fill: game.currentCharacter.colors.primary });
    }
  },

  _drawStatusBar(game, cols) {
    const portrait = Layout.isPortrait;
    const x = portrait ? 60 : 368;
    const y = portrait ? (Layout.H - 90) : 724;
    const w = portrait ? (Layout.W - 120) : 544;
    const h = portrait ? 70 : 58;
    this._panel(x, y, w, h, cols, { active: game.gameStatus === 'check', alpha: 0.68 });

    let turnText;
    if (game.reviewingAt !== null) turnText = 'Reviewing move ' + game.reviewingAt;
    else if (game.isAIMode) turnText = game.turn === game.playerColor ? 'Your Turn' : game.getPlayerName(game.turn) + "'s Turn";
    else turnText = game.getPlayerName(game.turn) + "'s Turn";
    const statusText = game.gameStatus === 'check' && game.reviewingAt === null ? 'CHECK!  ' + turnText : turnText;
    const status = PixiPremiumUI.text(statusText, {
      fontSize: portrait ? 28 : 20,
      fontWeight: '900',
      fill: game.gameStatus === 'check' ? (cols.checkHighlight || cols.accent) : cols.text,
    });
    status.anchor.set(0.5);
    status.x = x + w / 2;
    status.y = y + Math.floor(h / 2);
    PixiPremiumUI.fitText(status, w - (portrait ? 420 : 300));
    this.container.addChild(status);

    const btnH = portrait ? 40 : 28;
    const btnY = y + Math.floor((h - btnH) / 2);
    const fs = portrait ? 16 : 11;
    const navEnabled = game.boardSnapshots.length > 1;
    const left = [
      { label: '<', action: 'back', w: btnH, enabled: navEnabled && game.reviewingAt !== 0 },
      { label: '>', action: 'forward', w: btnH, enabled: game.reviewingAt !== null },
      { label: 'LIVE', action: 'live', w: portrait ? 64 : 44, enabled: game.reviewingAt !== null },
    ];
    const right = [
      { label: 'UNDO', action: 'undo', w: portrait ? 80 : 52, enabled: game.canUndo() },
      { label: 'FLIP', action: 'flip', w: portrait ? 72 : 46, enabled: true },
    ];
    let bx = x + 18;
    for (const b of left) { this._button(b, bx, btnY, btnH, fs, cols); bx += b.w + 6; }
    bx = x + w - 18;
    for (const b of right.slice().reverse()) { bx -= b.w; this._button(b, bx, btnY, btnH, fs, cols); bx -= 6; }
  },

  _button(b, bx, by, bh, fontSize, cols) {
    const g = new PIXI.Graphics();
    g.roundRect(bx, by, b.w, bh, 5)
      .fill({ color: PixiColorUtil.hexToNum(cols.buttonBg), alpha: b.enabled ? 0.75 : 0.30 })
      .roundRect(bx, by, b.w, bh, 5)
      .stroke({ color: PixiColorUtil.hexToNum(b.enabled ? cols.accent : PixiColorUtil.alpha(cols.text, '33')), alpha: 0.7, width: 2 });
    this.container.addChild(g);
    const t = PixiPremiumUI.text(b.label, {
      fontSize: b.label.length === 1 ? fontSize + 5 : fontSize,
      fontWeight: '900',
      fill: b.enabled ? cols.text : PixiColorUtil.alpha(cols.text, '33'),
    });
    t.anchor.set(0.5);
    t.x = bx + b.w / 2;
    t.y = by + bh / 2;
    this.container.addChild(t);
    if (b.enabled) this.hitRects.push({ action: b.action, x: bx, y: by, w: b.w, h: bh });
  },

  destroy() {
    if (this.container) {
      this.container.destroy({ children: true });
      this.container = null;
    }
    this.initialized = false;
    this._lastKey = null;
    this.hitRects = [];
  },
};
