// The fight screen's HUD: the two player panels, the status bar and the story tools.
// In story fights the opponent stands on a stage in the right column: the live
// character, big and animated (its moods follow the fight), with the speech bubble
// coming out of its mouth (mouthAnchor()). The tools are icon buttons: the Shop's items
// (rewind, hint, remove) and the keepsake powers (hourglass, lantern, seal); the status
// bar's buttons are icons too (PixiToolIcons).
const PixiGameHud = {
  container: null,
  // Where the stage's character speaks from (screen px), or null.
  mouth: null,
  stageArt: null,
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
    // Destroy the old HUD (its text textures) instead of leaking it on every move.
    for (const child of this.container.removeChildren()) child.destroy({ children: true });

    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;
    this.hitRects = [];
    this.mouth = null;
    this.stageArt = null;
    this._drawTopAccent(cols);
    const bottom = game.bottomColor;
    this._drawSidePanel(game, cols, 'left', bottom);
    this._drawSidePanel(game, cols, 'right', bottom === 'white' ? 'black' : 'white');
    this._drawStatusBar(game, cols);
    if (game.itemsAvailable && game.itemsAvailable()) this._drawItems(game, cols);
  },

  // The tools of a story fight, as icon buttons: the Shop's items (with how many are
  // left) and the keepsake powers you hold (once per fight).
  _tools(game) {
    const tools = [
      { id: 'rewind', action: 'item_rewind', label: 'REWIND', icon: 'rewind', count: Wallet.count('rewind'), usable: game.canUseItem('rewind') },
      { id: 'hint', action: 'item_hint', label: 'HINT', icon: 'hint', count: Wallet.count('hint'), usable: game.canUseItem('hint') },
      { id: 'remove', action: 'item_remove', label: game.removeMode ? 'CANCEL' : 'REMOVE', icon: 'remove', count: Wallet.count('remove'),
        usable: game.canUseItem('remove') || game.removeMode, active: game.removeMode, color: '#ff6a5a' },
    ];
    const labels = { hourglass: 'HOURGLASS', lantern: 'LANTERN', seal: 'SEAL' };
    for (const id of game.KEEPSAKE_POWERS || []) {
      if (!game.hasKeepsake || !game.hasKeepsake(id)) continue;
      const ks = Keepsakes.get(id);
      const active = (id === 'seal' && game.sealMode) || (id === 'lantern' && game.lanternLit());
      tools.push({ id, action: 'power_' + id, label: id === 'seal' && game.sealMode ? 'CANCEL' : labels[id], keepsake: true,
        used: game.powerUsed(id), usable: game.canUsePower(id) || active, active, color: ks.color });
    }
    return tools;
  },

  _drawItems(game, cols) {
    const tools = this._tools(game);
    const portrait = Layout.isPortrait;
    let x, y, bw, bh, gap, perRow;
    if (portrait) {
      // In the bottom (your) panel, on the right: one row.
      const boardBottom = PixiBoardRenderer.boardOffsetY + PixiBoardRenderer.squareSize * 8;
      const gapY = PixiBoardRenderer.portraitGap || 20;
      perRow = tools.length; gap = 6; bh = 62;
      bw = Math.min(64, Math.floor((360 - gap * (perRow - 1)) / perRow));
      x = Layout.W - 32 - 20 - (bw * perRow + gap * (perRow - 1)); y = boardBottom + gapY + 100;
    } else {
      perRow = 3; gap = 6; bw = 64; bh = 52;
      const rows = Math.ceil(tools.length / perRow);
      const h = 34 + rows * bh + (rows - 1) * gap + 14, px = 1006, py = this.LANDSCAPE.BOTTOM - h;
      this._panel(px, py, 240, h, cols, { alpha: 0.68, strip: false });
      this._text('TOOLS', px + 18, py + 12, { fontSize: 12, fontWeight: '900', fill: PixiColorUtil.alpha(cols.text, '77') });
      x = px + 18; y = py + 34;
    }
    tools.forEach((t, i) => {
      const bx = x + (i % perRow) * (bw + gap), by = y + Math.floor(i / perRow) * (bh + gap);
      const accent = t.active ? (t.color || cols.accent) : t.usable ? (t.keepsake ? t.color : cols.accent) : PixiColorUtil.alpha(cols.text, '33');
      const g = new PIXI.Graphics();
      g.roundRect(bx, by, bw, bh, 6)
        .fill({ color: PixiColorUtil.hexToNum(t.active ? '#3a1a2a' : cols.buttonBg), alpha: t.usable ? 0.85 : 0.35 })
        .roundRect(bx, by, bw, bh, 6)
        .stroke({ color: PixiColorUtil.hexToNum(accent), alpha: t.active ? 1 : 0.8, width: t.active ? 3 : 2 });
      this.container.addChild(g);
      const icon = t.keepsake ? PixiKeepsake.icon(t.id, 30) : PixiToolIcons.sprite(t.icon, 26);
      icon.x = bx + bw / 2;
      icon.y = by + (portrait ? 24 : 20);
      if (!t.usable) icon.alpha = 0.4;
      this.container.addChild(icon);
      const label = this._text(t.label, bx + bw / 2, by + bh - (portrait ? 17 : 15), { fontSize: portrait ? 11 : 10, fontWeight: '900', fill: t.usable ? cols.text : PixiColorUtil.alpha(cols.text, '55') }, 0.5);
      PixiPremiumUI.fitText(label, bw - 6);
      // A badge in the corner: how many are left, or whether the power is spent.
      const badge = t.keepsake ? (t.used ? 'USED' : '1') : String(t.count);
      const on = t.keepsake ? !t.used : t.count > 0;
      const bt = PixiPremiumUI.text(badge, { fontSize: 10, fontWeight: '900', fill: on ? '#1a1024' : '#bdb4cc' });
      const bwid = Math.max(16, bt.width + 8);
      this.container.addChild(new PIXI.Graphics().roundRect(bx + bw - bwid + 4, by - 5, bwid, 16, 8)
        .fill(on ? PixiColorUtil.hexToNum(t.keepsake ? t.color : '#ffd24a') : 0x3a3446).stroke({ color: 0x1a1024, width: 2 }));
      bt.anchor.set(0.5);
      bt.x = bx + bw - bwid / 2 + 4; bt.y = by + 3;
      this.container.addChild(bt);
      // Every tool stays clickable: an item with none left points you to the Shop.
      this.hitRects.push({ action: t.action, x: bx, y: by, w: bw, h: bh });
    });
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
      // Story items: counts, what can be used, remove mode and the status note.
      game.itemsAvailable && game.itemsAvailable()
        ? ['rewind', 'hint', 'remove'].map(id => Wallet.count(id) + (game.canUseItem(id) ? 'y' : 'n')).join(',') : '',
      game.itemsAvailable && game.itemsAvailable() && game.KEEPSAKE_POWERS
        ? game.KEEPSAKE_POWERS.map(id => (game.hasKeepsake(id) ? 1 : 0) + (game.powerUsed(id) ? 'u' : '') + (game.canUsePower(id) ? 'y' : 'n')).join(',') : '',
      game.removeMode,
      game.sealMode,
      game.lanternLit && game.lanternLit(),
      game.itemMessage ? game.itemMessage() : '',
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

  // Landscape geometry around the 640px board at (320, 58): the frame spans 44-712.
  LANDSCAPE: { TOP: 44, LOWER_Y: 278, BOTTOM: 712, BAR_X: 306, BAR_W: 668, BAR_Y: 728, BAR_H: 54 },

  _faces: {},

  _storyFace(game, color) {
    if (color !== game.aiColor) {
      return PixiPieceRenderer.getTexture(PixiPieceRenderer.withArt(store.get('theme')), color, 'king');
    }
    const ch = game.currentCharacter;
    if (!ch) return null;
    if (typeof PixiMinion !== 'undefined' && PixiMinion.isMinion(ch.id)) return PixiMinion.texture(ch.id);
    if (this._faces[ch.id]) return this._faces[ch.id];
    const img = TextureManager.getCharacterTexture(ch.id);
    if (!img) return null;
    this._faces[ch.id] = PIXI.Texture.from({ resource: img, scaleMode: 'nearest' });
    return this._faces[ch.id];
  },

  _panel(x, y, w, h, cols, options = {}) {
    const g = new PIXI.Graphics();
    const accent = PixiColorUtil.hexToNum(options.accent || cols.accent);
    const fill = PixiColorUtil.hexToNum(options.fill || cols.panel);
    g.roundRect(x + 6, y + 6, w, h, 10).fill({ color: 0x000000, alpha: 0.30 });
    g.roundRect(x, y, w, h, 10).fill({ color: fill, alpha: options.alpha ?? 0.68 });
    g.roundRect(x, y, w, h, 10).stroke({ color: accent, alpha: options.active ? 0.82 : 0.34, width: options.active ? 3 : 2 });
    if (options.strip !== false) g.roundRect(x + 14, y + 12, w - 28, 4, 2).fill({ color: accent, alpha: options.active ? 0.92 : 0.38 });
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
    if (!isLeft && game.mode === 'story' && color === game.aiColor && game.currentCharacter) {
      this._drawBossStage(game, cols, x, color);
      return;
    }
    // Tops line up with the board frame; lower panels fill down to its bottom.
    const y = this.LANDSCAPE.TOP;
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
    const nameMaxW = w - pad * 2 - 58;
    PixiPremiumUI.fitText(nameText, nameMaxW);
    if (nameText.width > nameMaxW) {
      // Long names (The Knight of the Mist) wrap onto two lines instead of overflowing.
      nameText.scale.set(1);
      Object.assign(nameText.style, { fontSize: 18, lineHeight: 20, wordWrap: true, wordWrapWidth: nameMaxW });
      nameText.y -= 10;
    }

    const avatar = new PIXI.Graphics();
    const pieceColor = color === 'white' ? 0xf2ead8 : 0x211b2f;
    const pieceStroke = color === 'white' ? 0xffffff : PixiColorUtil.hexToNum(cols.accent);
    avatar.roundRect(x + w - 66, y + 28, 44, 44, 8)
      .fill({ color: pieceColor, alpha: 0.95 })
      .roundRect(x + w - 66, y + 28, 44, 44, 8)
      .stroke({ color: pieceStroke, alpha: 0.72, width: 2 });
    this.container.addChild(avatar);
    const ch = game.currentCharacter;
    const live = game.mode === 'story' && color === game.aiColor && ch && typeof LiveScenes !== 'undefined' && LiveScenes.character(ch.id);
    const face = !live && game.mode === 'story' ? this._storyFace(game, color) : null;
    if (live || face) {
      // Story: the opponent's portrait (animated if it has live art), and your king in this world's pieces.
      const img = live ? LiveScenes.sprite(live, 'face') : new PIXI.Sprite(face);
      img.x = x + w - 64;
      img.y = y + 30;
      img.width = img.height = 40;
      this.container.addChild(img);
    } else {
      avatar.rect(x + w - 52, y + 39, 16, 22).fill({ color: color === 'white' ? 0x30244a : 0xf3e9c0, alpha: 0.95 });
      avatar.rect(x + w - 57, y + 58, 26, 6).fill({ color: color === 'white' ? 0x30244a : 0xf3e9c0, alpha: 0.95 });
    }

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
      this._capturedRow(captured, x + pad, y + 150, w - pad * 2, 34);
    }

    const adv = this._material(game, color);
    if (adv !== 0) {
      this._text((adv > 0 ? '+' : '') + adv + ' material', x + pad, y + 188, {
        fontSize: 15,
        fontWeight: '700',
        fill: adv > 0 ? '#66dd77' : '#dd6677',
      });
    }

    const L = this.LANDSCAPE;
    if (isLeft) {
      // The move list, from the first move on (an empty panel says what will go there).
      this._panel(x, L.LOWER_Y, w, L.BOTTOM - L.LOWER_Y, cols, { alpha: 0.68 });
      this._text('MOVE HISTORY', x + pad, L.LOWER_Y + 32, {
        fontSize: 13,
        fontWeight: '900',
        fill: PixiColorUtil.alpha(cols.text, '66'),
      });
      if (!game.moveHistory.length) {
        this._text('Moves appear here as you play.', x + pad, L.LOWER_Y + 62, {
          fontSize: 14, fill: PixiColorUtil.alpha(cols.text, '44'), wordWrap: true, wordWrapWidth: w - pad * 2,
        });
      }
      this._historyColumns(game, cols, x + pad, L.LOWER_Y + 62, w - pad * 2, L.BOTTOM - L.LOWER_Y - 80);
    } else if (game.mode !== 'story') {
      this._drawGamePanel(game, cols, x, L.LOWER_Y, w, L.BOTTOM - L.LOWER_Y);
    }
  },

  PIECE_VALUES: { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 },

  // What color is ahead by in captured material (negative when behind).
  _material(game, color) {
    const v = this.PIECE_VALUES;
    const sum = (c) => (game.capturedPieces[c] || []).reduce((s, p) => s + (v[p.type] || 0), 0);
    return color === 'white' ? sum('white') - sum('black') : sum('black') - sum('white');
  },

  // Captured pieces as the theme's own piece sprites, most valuable first; the same
  // kind overlaps like a stack, and the whole row shrinks to fit maxW.
  _capturedRow(captured, x, y, maxW, size) {
    const v = this.PIECE_VALUES;
    const art = PixiPieceRenderer.withArt(store.get('theme'));
    const list = captured.slice().sort((a, b) => (v[b.type] || 0) - (v[a.type] || 0));
    const row = new PIXI.Container();
    let cx = 0, prev = null;
    for (const p of list) {
      if (prev) cx += prev === p.type ? size * 0.45 : size * 0.85;
      const tex = PixiPieceRenderer.getTexture(art, p.color, p.type);
      if (!tex) continue;
      const sp = new PIXI.Sprite(tex);
      sp.width = sp.height = size;
      sp.x = cx;
      row.addChild(sp);
      prev = p.type;
    }
    const full = cx + size;
    if (full > maxW) row.scale.set(maxW / full);
    row.x = x; row.y = y + (size - size * row.scale.y) / 2;
    this.container.addChild(row);
    return row;
  },

  // Move history as numbered rows: "12.  Nf3   e5", the newest at the bottom. A capture
  // blocked by a mini-game is marked x; his moves inside the Knight of the Mist's fog stay ???.
  _historyColumns(game, cols, x, y, w, h) {
    const lineH = 22, max = Math.floor(h / lineH);
    const pairs = [];
    game.moveHistory.forEach((m, i) => {
      const san = m.hidden ? '???' : (m.san || '?');
      const cell = { text: m.defended ? san.replace(/[+#]$/, '') + ' x' : san, blocked: !!m.defended, last: i === game.moveHistory.length - 1 };
      if (i % 2 === 0) pairs.push({ num: Math.floor(i / 2) + 1, white: cell, black: null });
      else pairs[pairs.length - 1].black = cell;
    });
    const rows = pairs.slice(-max);
    const cellStyle = (c) => ({
      fontSize: 15, fontWeight: c.last ? '900' : '400',
      fill: c.blocked ? (cols.checkHighlight || '#ff6677') : c.last ? cols.accent : PixiColorUtil.alpha(cols.text, 'bb'),
    });
    rows.forEach((r, i) => {
      const ry = y + i * lineH;
      if (i % 2 === 1) {
        this.container.addChild(new PIXI.Graphics().roundRect(x - 6, ry - 3, w + 12, lineH, 4)
          .fill({ color: PixiColorUtil.hexToNum(cols.text), alpha: 0.04 }));
      }
      this._text(r.num + '.', x, ry, { fontSize: 14, fill: PixiColorUtil.alpha(cols.text, '55') });
      this._text(r.white.text, x + 40, ry, cellStyle(r.white));
      if (r.black) this._text(r.black.text, x + 40 + (w - 40) / 2, ry, cellStyle(r.black));
    });
  },

  // Off the story: the opponent, a material balance bar and the last move, under the
  // right player panel.
  _drawGamePanel(game, cols, x, y, w, h) {
    const pad = 18;
    this._panel(x, y, w, h, cols, { alpha: 0.68 });
    const label = (t, ly) => this._text(t, x + pad, ly, { fontSize: 13, fontWeight: '900', fill: PixiColorUtil.alpha(cols.text, '66') });
    let ly = y + 32;
    label('THIS GAME', ly);
    ly += 26;
    let who = 'Local 1v1';
    if (game.mode === 'classic' && typeof BotSelect !== 'undefined') who = 'Bot · ' + BotSelect.eloToName(BotSelect.eloValue) + ' (' + BotSelect.eloValue + ')';
    else if (game.mode === 'custom') who = 'Custom game · level ' + game.characterLevel;
    else if (game.mode === 'greatboard') who = 'Great Board · level ' + game.characterLevel;
    const whoText = this._text(who, x + pad, ly, { fontSize: 15, fontWeight: '700', fill: cols.text });
    PixiPremiumUI.fitText(whoText, w - pad * 2);
    ly += 24;
    this._text('Move ' + (Math.floor(game.moveHistory.length / 2) + 1), x + pad, ly, { fontSize: 14, fill: PixiColorUtil.alpha(cols.text, '88') });

    // Balance: the bar leans toward whoever is ahead in material.
    ly += 44;
    label('BALANCE', ly);
    ly += 26;
    const bw = w - pad * 2, bh = 14;
    const adv = this._material(game, 'white');
    const share = Math.max(0.06, Math.min(0.94, 0.5 + adv / 30));
    const g = new PIXI.Graphics();
    g.roundRect(x + pad, ly, bw, bh, 4).fill(0x211b2f);
    g.roundRect(x + pad, ly, Math.round(bw * share), bh, 4).fill(0xf2ead8);
    g.roundRect(x + pad, ly, bw, bh, 4).stroke({ color: PixiColorUtil.hexToNum(cols.accent), alpha: 0.5, width: 2 });
    g.rect(x + pad + bw / 2 - 1, ly - 3, 2, bh + 6).fill({ color: PixiColorUtil.hexToNum(cols.accent), alpha: 0.8 });
    this.container.addChild(g);
    ly += bh + 8;
    const verdict = adv === 0 ? 'Even material' : (adv > 0 ? game.getPlayerName('white') : game.getPlayerName('black')) + ' +' + Math.abs(adv);
    this._text(verdict, x + pad, ly, { fontSize: 14, fill: adv === 0 ? PixiColorUtil.alpha(cols.text, '88') : cols.accent });

    // The last move, big.
    ly += 44;
    label('LAST MOVE', ly);
    ly += 24;
    const last = game.moveHistory[game.moveHistory.length - 1];
    this._text(last ? (last.hidden ? '???' : last.san || '?') : '-', x + pad, ly, { fontSize: 28, fontWeight: '900', fill: last ? cols.accent : PixiColorUtil.alpha(cols.text, '44') });
  },

  // The story opponent's stage: the character itself, big and alive (its live scene,
  // else its portrait), its name and title, whose turn it is and what it has taken.
  STAGE: { SCALE: 3, H: 346 },

  _drawBossStage(game, cols, x, color) {
    const L = this.LANDSCAPE, w = 240, y = L.TOP, h = this.STAGE.H, pad = 16;
    const ch = game.currentCharacter, S = this.STAGE.SCALE;
    const isTurn = game.turn === color && !game.gameOver;
    const accent = (ch.colors && ch.colors.primary) || cols.accent;
    this._panel(x, y, w, h, cols, { active: isTurn, alpha: 0.72, accent, strip: false });
    const aw = 62 * S, ah = 80 * S, ax = Math.round(x + (w - aw) / 2), ay = y + 16;
    this.container.addChild(new PIXI.Graphics()
      .rect(ax - 5, ay - 5, aw + 10, ah + 10).fill(0x0c0912)
      .rect(ax - 3, ay - 3, aw + 6, ah + 6).stroke({ color: PixiColorUtil.hexToNum(accent), width: 2, alpha: 0.9 }));
    const live = typeof LiveScenes !== 'undefined' && LiveScenes.character(ch.id);
    let art = null;
    if (live) {
      art = LiveScenes.sprite(live);
      art.x = ax; art.y = ay; art.width = aw; art.height = ah;
      const f = (LiveScenes.get(live).frames || {}).face || [11, 4, 40, 40];
      this.mouth = { x: ax + (f[0] + f[2] / 2) * S, y: ay + (f[1] + f[3] * 0.74) * S };
    } else {
      const face = this._storyFace(game, color);
      if (face) {
        art = new PIXI.Sprite(face);
        art.width = art.height = aw;
        art.x = ax; art.y = ay + (ah - aw) / 2;
        this.mouth = { x: ax + aw / 2, y: art.y + aw * 0.72 };
      } else this.mouth = { x: ax + aw / 2, y: ay + ah * 0.45 };
    }
    if (art) {
      art._baseY = art.y;
      this.container.addChild(art);
    }
    this.stageArt = art;

    const ny = ay + ah + 10;
    const name = this._text(ch.name, x + pad, ny, { fontSize: 19, fontWeight: '900', fill: isTurn ? accent : cols.text });
    PixiPremiumUI.fitText(name, w - pad * 2);
    const title = this._text(ch.title || ('Level ' + ch.level), x + pad, ny + 24, { fontSize: 13, fill: PixiColorUtil.alpha(cols.text, '88') });
    PixiPremiumUI.fitText(title, w - pad * 2);

    // Whose turn, then what he has taken.
    const py = y + h - 32;
    const pill = new PIXI.Graphics();
    pill.roundRect(x + pad, py, 104, 22, 6)
      .fill({ color: PixiColorUtil.hexToNum(isTurn ? accent : PixiColorUtil.alpha(cols.text, '22')), alpha: isTurn ? 0.22 : 0.42 })
      .roundRect(x + pad, py, 104, 22, 6)
      .stroke({ color: PixiColorUtil.hexToNum(isTurn ? accent : PixiColorUtil.alpha(cols.text, '44')), alpha: 0.7, width: 2 });
    this.container.addChild(pill);
    const thinking = isTurn && game.isAIMode && game.aiThinking;
    this._text(thinking ? 'THINKING...' : isTurn ? 'HIS TURN' : 'WAITING', x + pad + 52, py + 4, { fontSize: 12, fontWeight: '900', fill: isTurn ? accent : PixiColorUtil.alpha(cols.text, '77') }, 0.5);
    const captured = game.capturedPieces[color] || [];
    if (captured.length) this._capturedRow(captured, x + pad + 114, py - 6, w - pad * 2 - 114, 30);
    else this._text('No captures', x + pad + 114, py + 3, { fontSize: 14, fontWeight: '700', fill: PixiColorUtil.alpha(cols.text, '44') });
  },

  // Where the speech bubble's tail points: the stage character's mouth (landscape), or
  // the top panel's face (portrait). Null outside story fights.
  mouthAnchor() {
    if (!this.mouth) return null;
    return { x: this.mouth.x, y: this.mouth.y, dir: 'up', portrait: Layout.isPortrait };
  },

  // A little hop of the stage character as a line begins.
  speak() {
    const a = this.stageArt;
    if (!a || a.destroyed || typeof gsap === 'undefined') return;
    gsap.killTweensOf(a);
    gsap.fromTo(a, { y: a._baseY - 6 }, { y: a._baseY, duration: 0.35, ease: 'bounce.out' });
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
    this.container.addChild(avatar);
    // Story: the opponent's live face (it speaks from here), your king in this world's pieces.
    const ch = game.currentCharacter;
    const live = game.mode === 'story' && color === game.aiColor && ch && typeof LiveScenes !== 'undefined' && LiveScenes.character(ch.id);
    const face = !live && game.mode === 'story' ? this._storyFace(game, color) : null;
    if (live || face) {
      const img = live ? LiveScenes.sprite(live, 'face') : new PIXI.Sprite(face);
      img.x = x + w - 74; img.y = y + 18;
      img.width = img.height = 48;
      this.container.addChild(img);
      if (color === game.aiColor) { this.mouth = { x: img.x + 24, y: img.y + 44 }; img._baseY = img.y; this.stageArt = img; }
    } else {
      avatar.rect(x + w - 62, y + 27, 18, 24).fill({ color: color === 'white' ? 0x30244a : 0xf3e9c0, alpha: 0.95 });
      avatar.rect(x + w - 67, y + 48, 28, 7).fill({ color: color === 'white' ? 0x30244a : 0xf3e9c0, alpha: 0.95 });
    }

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
    // Your panel holds the item buttons on the right in story fights.
    const itemsHere = color === game.playerColor && game.itemsAvailable && game.itemsAvailable();
    if (captured.length) this._capturedRow(captured, x + pad, y + 102, w - pad * 2 - (itemsHere ? 400 : 100), 36);
    else this._text('None', x + pad, y + 106, { fontSize: 26, fontWeight: '700', fill: PixiColorUtil.alpha(cols.text, '44') });

    const adv = this._material(game, color);
    if (adv !== 0) {
      this._text((adv > 0 ? '+' : '') + adv, x + pad, y + 146, { fontSize: 22, fontWeight: '700', fill: adv > 0 ? '#66dd77' : '#dd6677' });
    }

    if (game.mode === 'story' && color === game.aiColor && game.currentCharacter) {
      this._text(game.currentCharacter.name, x + w - 280, y + 106, { fontSize: 22, fontWeight: '900', fill: game.currentCharacter.colors.primary });
    }
  },

  _drawStatusBar(game, cols) {
    const portrait = Layout.isPortrait;
    const L = this.LANDSCAPE;
    const x = portrait ? 60 : L.BAR_X;
    const y = portrait ? (Layout.H - 90) : L.BAR_Y;
    const w = portrait ? (Layout.W - 120) : L.BAR_W;
    const h = portrait ? 70 : L.BAR_H;
    this._panel(x, y, w, h, cols, { active: game.gameStatus === 'check', alpha: 0.68, strip: false });

    let turnText;
    if (game.reviewingAt !== null) turnText = 'Reviewing move ' + game.reviewingAt;
    else if (game.isAIMode) turnText = game.turn === game.playerColor ? 'Your Turn' : game.getPlayerName(game.turn) + "'s Turn";
    else turnText = game.getPlayerName(game.turn) + "'s Turn";
    const note = game.itemMessage ? game.itemMessage() : null;
    const statusText = note || (game.gameStatus === 'check' && game.reviewingAt === null ? 'CHECK!  ' + turnText : turnText);
    const status = PixiPremiumUI.text(statusText, {
      fontSize: portrait ? 28 : 20,
      fontWeight: '900',
      fill: game.gameStatus === 'check' ? (cols.checkHighlight || cols.accent) : cols.text,
    });
    status.anchor.set(0.5);
    status.x = x + w / 2;
    status.y = y + Math.floor(h / 2);
    PixiPremiumUI.fitText(status, w - (portrait ? 420 : 420));
    this.container.addChild(status);

    const btnH = portrait ? 40 : 36;
    const btnY = y + Math.floor((h - btnH) / 2);
    const fs = portrait ? 16 : 14;
    const navEnabled = game.boardSnapshots.length > 1;
    const bw = btnH + 6;
    const left = [
      { icon: 'back', action: 'back', w: bw, enabled: navEnabled && game.reviewingAt !== 0 },
      { icon: 'forward', action: 'forward', w: bw, enabled: game.reviewingAt !== null },
      { icon: 'live', action: 'live', w: bw, enabled: game.reviewingAt !== null },
    ];
    // In story fights undo is the Rewind tool.
    const storyItems = game.itemsAvailable && game.itemsAvailable();
    const right = [
      ...(storyItems ? [] : [{ icon: 'undo', action: 'undo', w: bw, enabled: game.canUndo() }]),
      { icon: 'flip', action: 'flip', w: bw, enabled: true },
    ];
    let bx = x + 12;
    for (const b of left) { this._button(b, bx, btnY, btnH, fs, cols); bx += b.w + 6; }
    bx = x + w - 12;
    for (const b of right.slice().reverse()) { bx -= b.w; this._button(b, bx, btnY, btnH, fs, cols); bx -= 6; }
  },

  _button(b, bx, by, bh, fontSize, cols) {
    const g = new PIXI.Graphics();
    g.roundRect(bx, by, b.w, bh, 5)
      .fill({ color: PixiColorUtil.hexToNum(cols.buttonBg), alpha: b.enabled ? 0.75 : 0.30 })
      .roundRect(bx, by, b.w, bh, 5)
      .stroke({ color: PixiColorUtil.hexToNum(b.enabled ? cols.accent : PixiColorUtil.alpha(cols.text, '33')), alpha: 0.7, width: 2 });
    this.container.addChild(g);
    if (b.icon) {
      const icon = PixiToolIcons.sprite(b.icon, Math.round(bh * 0.62));
      icon.x = bx + b.w / 2;
      icon.y = by + bh / 2;
      icon.alpha = b.enabled ? 1 : 0.3;
      this.container.addChild(icon);
      if (b.enabled) this.hitRects.push({ action: b.action, x: bx, y: by, w: b.w, h: bh });
      return;
    }
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
    this.mouth = null;
    this.stageArt = null;
  },
};
