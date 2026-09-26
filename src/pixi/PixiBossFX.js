// Story-mode boss twists drawn on and around the board: the Knight of the Mist's
// fog, CastlE's gear walls, locked squares, the Boss Rule status panel
// (hourglass, crystal) and the one-off animations (double take, rewind).
const PixiBossFX = {
  boardLayer: null,   // inside the board container, above the pieces
  hudLayer: null,     // on the stage, above the HUD
  initialized: false,

  PANEL: { X: 1006, Y: 402, W: 240, H: 150 },
  FOG_COLOR: 0x1b2330,
  WALL_BRASS: 0xb58a4a,
  CRYSTAL: 0xc9a6ff,

  init(game) {
    this.destroy();
    const board = PixiBoardRenderer.container;
    if (!board) return;
    this.game = game;
    this.boardLayer = new PIXI.Container();
    this.boardLayer.eventMode = 'none';
    board.addChildAt(this.boardLayer, board.getChildIndex(PixiBoardRenderer.overlayContainer));
    this.hudLayer = new PIXI.Container();
    this.hudLayer.eventMode = 'none';
    this.hudLayer.zIndex = 130;   // above the HUD (120), below the game-over overlay (900)
    PixiApp.stage.addChild(this.hudLayer);
    PixiApp.stage.sortableChildren = true;

    this.fogLayer = new PIXI.Container();
    this.wallLayer = new PIXI.Container();
    this.lockLayer = new PIXI.Container();
    this.eyeLayer = new PIXI.Container();
    this.fxLayer = new PIXI.Container();
    this.boardLayer.addChild(this.lockLayer, this.wallLayer, this.fogLayer, this.eyeLayer, this.fxLayer);
    this.panelLayer = new PIXI.Container();
    this.bannerLayer = new PIXI.Container();
    this.hudLayer.addChild(this.panelLayer, this.bannerLayer);

    this._time = 0;
    this._fogKey = null;
    this._lockKey = null;
    this._wallKey = null;
    this._panelKey = null;
    this._gears = [];
    this.initialized = true;
  },

  destroy() {
    if (this._rewindTimeline) { this._rewindTimeline.kill(); this._rewindTimeline = null; }
    // Banners, shots and shards may still be mid-tween when the screen closes.
    const all = [];
    const walk = node => { all.push(node, node.scale); (node.children || []).forEach(walk); };
    if (this.boardLayer) walk(this.boardLayer);
    if (this.hudLayer) walk(this.hudLayer);
    all.forEach(o => gsap.killTweensOf(o));   // an array of mixed targets is not matched
    gsap.killTweensOf(this);
    if (this.boardLayer) this.boardLayer.destroy({ children: true });
    if (this.hudLayer) this.hudLayer.destroy({ children: true });
    if (this._mistTexture) { this._mistTexture.destroy(true); this._mistTexture = null; }
    if (PixiApp.stage && this._invertFilter) this._setInverted(false);
    this.boardLayer = null;
    this.hudLayer = null;
    this._mistA = this._mistB = null;
    this._sand = this._glow = this._crystal = null;
    this._gears = [];
    this.initialized = false;
  },

  // Called every frame by GameScreen. `hidden` is 8x8 booleans (true = in fog) or null.
  update(dt, game, hidden) {
    if (!this.initialized) return;
    this._time += dt;
    const sq = PixiBoardRenderer.squareSize;
    const layoutKey = `${PixiBoardRenderer.flipped}|${sq}|${PixiBoardRenderer.boardOffsetX}|${PixiBoardRenderer.boardOffsetY}`;
    const rule = game.bossRule;

    // Walls rise once, then only move if the board is flipped or resized.
    const walls = rule && rule.walls;
    if (walls && this._wallKey !== layoutKey) {
      this._drawWalls(walls, this._wallKey === null);
      this._wallKey = layoutKey;
    }
    for (const g of this._gears) g.rotation += dt * g.spin;

    const ply = game.moveHistory.length;
    const lockKey = layoutKey + '|' + game.lockedTiles.map(t => `${t.row}${t.col}${t.until || ''}`).join(',') + '|' + ply;
    if (lockKey !== this._lockKey) {
      this._drawLocks(game.lockedTiles, ply);
      this._lockKey = lockKey;
    }

    this._updateFog(hidden, layoutKey, dt);
    this._applyPieceVisibility(hidden);
    this._updatePanel(game, dt);
  },

  /* ------------------------------------------------------------------ */
  /*  Fog                                                                */
  /* ------------------------------------------------------------------ */

  _mist() {
    if (this._mistTexture) return this._mistTexture;
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    // Soft blobs drawn on a coarse pixel grid, wrapped so the texture tiles.
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * size, y = Math.random() * size, r = 10 + Math.random() * 26;
      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          const grad = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          grad.addColorStop(0, 'rgba(210,222,235,0.55)');
          grad.addColorStop(1, 'rgba(210,222,235,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        }
      }
    }
    // Quantise to chunky pixels so the mist matches the pixel-art board.
    const px = 4;
    const small = document.createElement('canvas');
    small.width = small.height = size / px;
    small.getContext('2d').drawImage(c, 0, 0, size / px, size / px);
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, size, size);
    this._mistTexture = PIXI.Texture.from({ resource: c, scaleMode: 'nearest' });
    return this._mistTexture;
  },

  _updateFog(hidden, layoutKey, dt) {
    const key = hidden ? layoutKey + '|' + hidden.map(r => r.map(h => (h ? 1 : 0)).join('')).join('') : null;
    if (key !== this._fogKey) {
      this._fogKey = key;
      this._buildFog(hidden);
    }
    if (this._mistA) {
      this._mistA.tilePosition.x += dt * 9;
      this._mistA.tilePosition.y += dt * 3;
      this._mistB.tilePosition.x -= dt * 5;
      this._mistB.tilePosition.y += dt * 6;
    }
  },

  _buildFog(hidden) {
    this.fogLayer.removeChildren().forEach(c => c.destroy());
    this._mistA = this._mistB = null;
    if (!hidden) return;
    const sq = PixiBoardRenderer.squareSize;
    const base = new PIXI.Graphics();
    const mask = new PIXI.Graphics();
    let any = false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (!hidden[r][c]) continue;
        any = true;
        const x = PixiBoardRenderer.squareX(c), y = PixiBoardRenderer.squareY(r);
        base.rect(x, y, sq, sq).fill({ color: this.FOG_COLOR, alpha: 0.86 });
        mask.rect(x, y, sq, sq).fill(0xffffff);
      }
    }
    if (!any) { base.destroy(); mask.destroy(); return; }
    const bx = PixiBoardRenderer.boardOffsetX, by = PixiBoardRenderer.boardOffsetY, size = sq * 8;
    const mist = new PIXI.Container();
    this._mistA = new PIXI.TilingSprite({ texture: this._mist(), width: size, height: size });
    this._mistB = new PIXI.TilingSprite({ texture: this._mist(), width: size, height: size });
    this._mistB.tileScale.set(1.7);
    this._mistA.alpha = 0.32;
    this._mistB.alpha = 0.22;
    this._mistA.tint = this._mistB.tint = 0xa9bccf;
    for (const m of [this._mistA, this._mistB]) { m.x = bx; m.y = by; mist.addChild(m); }
    mist.mask = mask;
    this.fogLayer.addChild(base, mist, mask);
  },

  _applyPieceVisibility(hidden) {
    const sprites = PixiBoardRenderer.pieceSprites || {};
    for (const key in sprites) {
      const [col, row] = key.split(',').map(Number);
      sprites[key].visible = !hidden || !hidden[row][col];
    }
  },

  // Two glowing eyes on each hidden knight for a moment.
  showEyes(squares) {
    if (!this.initialized) return;
    const sq = PixiBoardRenderer.squareSize;
    for (const s of squares) {
      const { x, y } = PixiBoardRenderer.squareCenter(s.row, s.col);
      const eyes = new PIXI.Graphics();
      const gap = sq * 0.16, e = Math.max(4, Math.round(sq * 0.07));
      eyes.circle(x, y - 4, sq * 0.34).fill({ color: 0x9fe8ff, alpha: 0.10 });
      for (const dx of [-gap, gap]) {
        eyes.circle(x + dx, y - 4, e * 1.8).fill({ color: 0x9fe8ff, alpha: 0.25 });
        eyes.rect(x + dx - e / 2, y - 4 - e / 2, e, e).fill(0xe8fbff);
      }
      eyes.alpha = 0;
      this.eyeLayer.addChild(eyes);
      gsap.timeline({ onComplete: () => eyes.destroy() })
        .to(eyes, { alpha: 1, duration: 0.35 })
        .to(eyes, { alpha: 0.2, duration: 0.12, delay: 0.5 })
        .to(eyes, { alpha: 1, duration: 0.12 })
        .to(eyes, { alpha: 0, duration: 0.5, delay: 0.6 });
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Walls and locks                                                    */
  /* ------------------------------------------------------------------ */

  _drawWalls(walls, rise) {
    this.wallLayer.removeChildren().forEach(c => c.destroy({ children: true }));
    this._gears = [];
    const sq = PixiBoardRenderer.squareSize;
    walls.forEach((w, i) => {
      const x = PixiBoardRenderer.squareX(w.col), y = PixiBoardRenderer.squareY(w.row);
      const block = new PIXI.Container();
      block.pivot.set(sq / 2, sq);
      block.x = x + sq / 2;
      block.y = y + sq;
      const g = new PIXI.Graphics();
      const dark = PixiColorUtil.hexToNum(PixiColorUtil.darken('#b58a4a', 45));
      const light = PixiColorUtil.hexToNum(PixiColorUtil.lighten('#b58a4a', 30));
      g.rect(2, 2, sq - 4, sq - 4).fill(dark);
      g.rect(5, 5, sq - 10, sq - 10).fill(this.WALL_BRASS);
      g.rect(5, 5, sq - 10, 4).fill(light);
      g.rect(5, sq - 9, sq - 10, 4).fill({ color: 0x000000, alpha: 0.25 });
      for (const [rx, ry] of [[10, 10], [sq - 14, 10], [10, sq - 14], [sq - 14, sq - 14]]) {
        g.rect(rx, ry, 4, 4).fill(dark);
        g.rect(rx, ry, 2, 2).fill(light);
      }
      block.addChild(g);
      const gear = this._gear(sq * 0.24, dark, light);
      gear.x = sq / 2;
      gear.y = sq / 2;
      gear.spin = (i % 2 ? -1 : 1) * 0.6;
      block.addChild(gear);
      this._gears.push(gear);
      this.wallLayer.addChild(block);
      if (rise) {
        block.scale.y = 0;
        gsap.to(block.scale, { y: 1, duration: 0.55, delay: 0.25 + i * 0.12, ease: 'back.out(2)' });
      }
    });
  },

  _gear(r, dark, light) {
    const g = new PIXI.Graphics();
    const teeth = 8, t = Math.max(3, r * 0.34);
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const tooth = new PIXI.Graphics().rect(-t / 2, -r - t * 0.8, t, t * 1.2).fill(dark);
      tooth.rotation = a;
      g.addChild(tooth);
    }
    const body = new PIXI.Graphics()
      .circle(0, 0, r).fill(dark)
      .circle(0, 0, r * 0.78).fill(light)
      .circle(0, 0, r * 0.3).fill(dark);
    g.addChild(body);
    return g;
  },

  _drawLocks(tiles, ply) {
    this.lockLayer.removeChildren().forEach(c => c.destroy({ children: true }));
    const sq = PixiBoardRenderer.squareSize;
    for (const t of tiles) {
      const x = PixiBoardRenderer.squareX(t.col), y = PixiBoardRenderer.squareY(t.row);
      const g = new PIXI.Graphics();
      g.rect(x + 2, y + 2, sq - 4, sq - 4).fill({ color: 0xff3348, alpha: 0.22 })
        .stroke({ color: 0xff5566, alpha: 0.7, width: 2 });
      // Pixel padlock in the corner.
      const lx = x + sq - 24, ly = y + 6;
      g.rect(lx + 3, ly, 10, 3).fill(0xffd9de);
      g.rect(lx + 3, ly, 3, 8).fill(0xffd9de);
      g.rect(lx + 10, ly, 3, 8).fill(0xffd9de);
      g.rect(lx, ly + 7, 16, 11).fill(0xff5566);
      g.rect(lx + 7, ly + 10, 2, 4).fill(0x3a0710);
      this.lockLayer.addChild(g);
      if (t.until) {
        const turns = Math.ceil((t.until - ply) / 2);
        const label = new PIXI.Text({ text: String(turns), style: { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 18, fill: '#ffd9de', stroke: { color: '#3a0710', width: 4 } } });
        label.anchor.set(0, 1);
        label.x = x + 6;
        label.y = y + sq - 4;
        this.lockLayer.addChild(label);
      }
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Boss Rule status panel: hourglass (Checkmate) and crystal (GM X)   */
  /* ------------------------------------------------------------------ */

  _panelRect() {
    if (!Layout.isPortrait) return { ...this.PANEL };
    const w = 200, h = 64;
    return { X: PixiBoardRenderer.boardOffsetX + PixiBoardRenderer.squareSize * 8 - w, Y: PixiBoardRenderer.boardOffsetY - h - 14, W: w, H: h };
  },

  _updatePanel(game, dt) {
    const rule = game.bossRule;
    if (!rule) return;
    const cols = ThemeManager.getCurrentColors();
    const progress = game.trainingProgress();
    let key;
    if (progress) {
      key = `progress|${progress.label}|${progress.done}|${progress.failed || 0}|${Layout.orientation}`;
      if (key !== this._panelKey) this._drawProgressPanel(cols, progress);
    } else if (rule.moveLimit) {
      const left = game.movesLeft();
      key = `clock|${left}|${game.gameOver}|${Layout.orientation}`;
      if (key !== this._panelKey) this._drawClockPanel(cols, left, rule.moveLimit);
      if (this._sand) {
        this._sand.alpha = game.gameOver || left <= 0 ? 0 : 0.6 + Math.sin(this._time * 18) * 0.4;
        const urgent = left <= 5 && !game.gameOver;
        this._glow.alpha = urgent ? 0.35 + Math.sin(this._time * 6) * 0.25 : 0;
      }
    } else if (rule.rewinds) {
      key = `crystal|${game.bossState.rewindsUsed}|${game.gameOver}|${game.gameResult}|${Layout.orientation}`;
      if (key !== this._panelKey) this._drawCrystalPanel(cols, game);
      if (this._crystal) this._crystal.y = this._crystalY + Math.sin(this._time * 2) * 3;
    }
    if (key) this._panelKey = key;
  },

  // Trainer tests: a label, "done / total" and one pip per step.
  _drawProgressPanel(cols, info) {
    const p = this._panelFrame(cols, '#6fe3ff');
    const small = Layout.isPortrait;
    const x = p.X + 20;
    if (!small) this._panelText(info.label, x, p.Y + 26, { fontSize: 13, fontWeight: '900', fill: PixiColorUtil.alpha(cols.text, '88') });
    this._panelText(`${info.done} / ${info.total}`, x, p.Y + (small ? 8 : 46), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: small ? 26 : 36, fill: '#6fe3ff' });
    const pips = new PIXI.Graphics();
    const r = small ? 6 : 8, gap = small ? 16 : 24;
    const py = p.Y + (small ? 48 : 118);
    for (let i = 0; i < info.slots; i++) {
      const cx = x + r + i * gap;
      const state = i < info.done ? 'done' : i < info.done + (info.failed || 0) ? 'failed' : 'open';
      if (state === 'done') pips.circle(cx, py, r).fill(0x6fe3ff);
      else if (state === 'failed') pips.circle(cx, py, r).fill({ color: 0xff6b6b, alpha: 0.85 });
      else pips.circle(cx, py, r).stroke({ color: 0x6fe3ff, alpha: 0.6, width: 2 });
    }
    this.panelLayer.addChild(pips);
  },

  _panelFrame(cols, accent) {
    this.panelLayer.removeChildren().forEach(c => c.destroy({ children: true }));
    const p = this._panelRect();
    const g = new PIXI.Graphics();
    const acc = PixiColorUtil.hexToNum(accent || cols.accent);
    g.roundRect(p.X + 6, p.Y + 6, p.W, p.H, 10).fill({ color: 0x000000, alpha: 0.3 });
    g.roundRect(p.X, p.Y, p.W, p.H, 10).fill({ color: PixiColorUtil.hexToNum(cols.panel), alpha: 0.72 })
      .stroke({ color: acc, alpha: 0.5, width: 2 });
    this.panelLayer.addChild(g);
    return p;
  },

  _panelText(text, x, y, style) {
    const t = new PIXI.Text({ text, style: { fontFamily: PixiTextStyles.FONT_BODY, ...style } });
    t.x = x;
    t.y = y;
    // Keep every line inside the panel's right edge.
    const p = this._panelRect();
    const maxW = p.X + p.W - 12 - x;
    if (t.width > maxW) t.scale.set(maxW / t.width);
    this.panelLayer.addChild(t);
    return t;
  },

  _drawClockPanel(cols, left, limit) {
    const urgent = left <= 5;
    const red = '#ff5a5a';
    const p = this._panelFrame(cols, urgent ? red : null);
    const small = Layout.isPortrait;
    const gx = p.X + (small ? 30 : 48), gy = p.Y + p.H / 2;
    const hH = small ? 22 : 44, hW = small ? 16 : 30;   // half height / half width of the glass
    const frac = Math.max(0, Math.min(1, left / limit));

    this._glow = new PIXI.Graphics().circle(gx, gy, hH * 1.25).fill({ color: 0xff3030, alpha: 1 });
    this._glow.alpha = 0;
    this.panelLayer.addChild(this._glow);

    const g = new PIXI.Graphics();
    const wood = 0x6b4526, glass = 0xcfe6ff, sand = urgent ? 0xff8a5a : 0xf2c867;
    // Glass bulbs
    g.poly([gx - hW, gy - hH, gx + hW, gy - hH, gx + 3, gy, gx - 3, gy]).fill({ color: glass, alpha: 0.18 });
    g.poly([gx - 3, gy, gx + 3, gy, gx + hW, gy + hH, gx - hW, gy + hH]).fill({ color: glass, alpha: 0.18 });
    // Sand left on top: a smaller triangle towards the neck.
    const topH = hH * frac;
    if (topH > 1) {
      const tw = (hW - 3) * frac + 3;
      g.poly([gx - tw, gy - topH, gx + tw, gy - topH, gx + 3, gy, gx - 3, gy]).fill(sand);
    }
    // Sand collected at the bottom.
    const botH = hH * (1 - frac);
    if (botH > 1) {
      const bw = hW - (hW - 3) * (1 - (1 - frac));
      g.poly([gx - hW, gy + hH, gx + hW, gy + hH, gx + bw * 0.6, gy + hH - botH, gx - bw * 0.6, gy + hH - botH]).fill(sand);
    }
    g.poly([gx - hW, gy - hH, gx + hW, gy - hH, gx + 3, gy, gx - 3, gy]).stroke({ color: glass, alpha: 0.6, width: 2 });
    g.poly([gx - 3, gy, gx + 3, gy, gx + hW, gy + hH, gx - hW, gy + hH]).stroke({ color: glass, alpha: 0.6, width: 2 });
    g.rect(gx - hW - 6, gy - hH - 7, hW * 2 + 12, 7).fill(wood);
    g.rect(gx - hW - 6, gy + hH, hW * 2 + 12, 7).fill(wood);
    this.panelLayer.addChild(g);
    this._sand = new PIXI.Graphics().rect(gx - 1, gy, 2, hH - Math.max(0, botH)).fill(sand);
    this.panelLayer.addChild(this._sand);

    const tx = gx + hW + (small ? 16 : 24);
    if (!small) this._panelText('THE CLOCK', tx, p.Y + 30, { fontSize: 13, fontWeight: '900', fill: PixiColorUtil.alpha(cols.text, '88') });
    this._panelText(String(Math.max(0, left)), tx, p.Y + (small ? 6 : 50), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: small ? 30 : 40, fill: urgent ? red : cols.accent });
    this._panelText(left === 1 ? 'move left' : 'moves left', tx, p.Y + (small ? 40 : 100), { fontSize: small ? 14 : 16, fontWeight: '700', fill: urgent ? red : cols.text });
  },

  _drawCrystalPanel(cols, game) {
    const p = this._panelFrame(cols, '#c9a6ff');
    const rule = game.bossRule;
    const total = rule.rewinds + 1;
    const cracks = game.bossState.rewindsUsed + (game.gameOver && game.playerWon() ? 1 : 0);
    const small = Layout.isPortrait;
    const cx = p.X + (small ? 32 : 54), cy = p.Y + p.H / 2;
    const s = small ? 0.5 : 1;
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();
    const shattered = cracks >= total;
    const pts = [0, -46, 26, -10, 16, 40, -16, 40, -26, -10].map(v => v * s);
    if (!shattered) {
      g.poly(pts).fill({ color: this.CRYSTAL, alpha: 0.85 }).stroke({ color: 0xffffff, alpha: 0.8, width: 2 });
      g.poly([0, -46, 26, -10, 0, -2, -26, -10].map(v => v * s)).fill({ color: 0xffffff, alpha: 0.28 });
      // One jagged crack per rewind so far.
      const crackPaths = [
        [-8, -30, 2, -14, -6, 2, 4, 18],
        [14, -8, 4, 6, 12, 20, 6, 36],
        [-20, -6, -10, 10, -14, 26],
      ];
      for (let i = 0; i < Math.min(cracks, crackPaths.length); i++) {
        const path = crackPaths[i].map(v => v * s);
        g.moveTo(path[0], path[1]);
        for (let k = 2; k < path.length; k += 2) g.lineTo(path[k], path[k + 1]);
        g.stroke({ color: 0x2a0f45, width: 3 * s });
      }
    } else {
      for (const [dx, dy, r] of [[-22, 20, 0.4], [18, 26, -0.6], [-4, 34, 1.1], [26, 4, 0.2], [-28, -4, -0.9]]) {
        const shard = new PIXI.Graphics().poly([0, -12, 7, 4, -7, 4].map(v => v * s)).fill({ color: this.CRYSTAL, alpha: 0.8 });
        shard.x = dx * s; shard.y = dy * s; shard.rotation = r;
        c.addChild(shard);
      }
    }
    c.addChild(g);
    c.x = cx;
    c.y = cy;
    this._crystal = c;
    this._crystalY = cy;
    this.panelLayer.addChild(c);
    const tx = cx + (small ? 34 : 50);
    if (!small) this._panelText('HIS CRYSTAL', tx, p.Y + 30, { fontSize: 13, fontWeight: '900', fill: PixiColorUtil.alpha(cols.text, '88') });
    this._panelText(shattered ? 'SHATTERED' : `${cracks} / ${total}`, tx, p.Y + (small ? 8 : 52), { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: shattered ? (small ? 18 : 22) : (small ? 26 : 36), fill: '#c9a6ff' });
    this._panelText(shattered ? 'The board is free' : 'cracks', tx, p.Y + (small ? 38 : 100), { fontSize: small ? 13 : 16, fontWeight: '700', fill: cols.text });
  },

  /* ------------------------------------------------------------------ */
  /*  One-off animations                                                 */
  /* ------------------------------------------------------------------ */

  banner(text, color) {
    if (!this.initialized) return;
    const t = new PIXI.Text({
      text,
      style: { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 46, fontWeight: 'bold', fill: color || '#ffd35a', stroke: { color: '#1a0d05', width: 8 }, letterSpacing: 2 },
    });
    t.anchor.set(0.5);
    const boardPx = PixiBoardRenderer.squareSize * 8;
    // Upper third of the board, clear of the speech bubbles; never wider than the board.
    const fit = Math.min(1, (boardPx * 0.9) / t.width);
    t.x = PixiBoardRenderer.boardOffsetX + boardPx / 2;
    t.y = PixiBoardRenderer.boardOffsetY + boardPx * 0.3;
    t.scale.set(2.4 * fit);
    t.alpha = 0;
    t.rotation = -0.08;
    this.bannerLayer.addChild(t);
    gsap.timeline({ onComplete: () => t.destroy() })
      .to(t, { alpha: 1, duration: 0.12 })
      .to(t.scale, { x: fit, y: fit, duration: 0.35, ease: 'back.out(3)' }, '<')
      .to(t, { alpha: 0, y: t.y - 30, duration: 0.45, delay: 0.9 });
  },

  // ForkMaster: slow-motion two-gun shot at both forked pieces.
  doubleTake(from, targets, themeId) {
    if (!this.initialized) return;
    const origin = PixiBoardRenderer.squareCenter(from.row, from.col);
    const dim = new PIXI.Graphics()
      .rect(PixiBoardRenderer.boardOffsetX, PixiBoardRenderer.boardOffsetY, PixiBoardRenderer.squareSize * 8, PixiBoardRenderer.squareSize * 8)
      .fill({ color: 0x120a02, alpha: 1 });
    dim.alpha = 0;
    this.fxLayer.addChild(dim);
    gsap.timeline({ onComplete: () => dim.destroy() })
      .to(dim, { alpha: 0.45, duration: 0.15 })
      .to(dim, { alpha: 0, duration: 0.5, delay: 0.9 });

    targets.forEach((t, i) => {
      const end = PixiBoardRenderer.squareCenter(t.row, t.col);
      const delay = 0.2 + i * 0.16;
      // Muzzle flash and tracer.
      const flash = new PIXI.Graphics().circle(origin.x, origin.y, 16).fill({ color: 0xfff1b0, alpha: 0.9 });
      flash.alpha = 0;
      const tracer = new PIXI.Graphics()
        .moveTo(origin.x, origin.y).lineTo(end.x, end.y).stroke({ color: 0xffe07a, width: 5, alpha: 0.95 })
        .moveTo(origin.x, origin.y).lineTo(end.x, end.y).stroke({ color: 0xffffff, width: 2, alpha: 1 });
      tracer.alpha = 0;
      this.fxLayer.addChild(tracer, flash);
      gsap.timeline({ delay, onComplete: () => { tracer.destroy(); flash.destroy(); } })
        .to([tracer, flash], { alpha: 1, duration: 0.04 })
        .to(tracer, { alpha: 0, duration: 0.35 })
        .to(flash, { alpha: 0, duration: 0.2 }, '<');

      // The hit piece is blasted off the board, tumbling.
      const ghost = PixiPieceRenderer.createSprite(themeId, t.piece.color, t.piece.type);
      ghost.width = ghost.height = PixiBoardRenderer.PIECE_SIZE;
      ghost.x = end.x;
      ghost.y = end.y;
      ghost.alpha = 0;
      this.fxLayer.addChild(ghost);
      const away = end.x >= origin.x ? 1 : -1;
      gsap.timeline({ delay, onComplete: () => ghost.destroy() })
        .set(ghost, { alpha: 1 })
        .to(ghost, { x: end.x + away * 170, y: end.y - 140, rotation: away * 5, alpha: 0, duration: 0.9, ease: 'power2.out' });
      gsap.delayedCall(delay, () => {
        if (this.initialized && typeof PixiParticleFX !== 'undefined' && PixiParticleFX.spawnCaptureExplosion) {
          PixiParticleFX.spawnCaptureExplosion(end.x, end.y, 0xd9b27a, t.piece.type);
        }
      });
    });
    gsap.delayedCall(0.15, () => this.banner('DOUBLE TAKE!', '#ffd35a'));
    gsap.delayedCall(0.25, () => { if (this.initialized && PixiBoardRenderer.container) PixiBoardRenderer.shake(16); });
  },

  _setInverted(on) {
    const stage = PixiApp.stage;
    if (!stage) return;
    if (on) {
      if (!this._invertFilter) {
        this._invertFilter = new PIXI.ColorMatrixFilter();
        this._invertFilter.negative(false);
      }
      this._savedFilters = stage.filters;
      stage.filters = [...(stage.filters || []), this._invertFilter];
    } else if (this._invertFilter) {
      stage.filters = this._savedFilters && this._savedFilters.length ? this._savedFilters : null;
      this._invertFilter = null;
      this._savedFilters = null;
    }
  },

  // Grandmaster X's rewind. steps: [{ from, to, apply() }] newest first; each
  // piece slides back along its path, then apply() restores the older position.
  // gift: { row, col, type, color } formed from crystal shards at the end.
  rewind(steps, gift, themeId, onDone) {
    if (!this.initialized) { steps.forEach(s => s.apply()); onDone(); return; }
    this._setInverted(true);
    this.banner('REWIND', '#c9a6ff');
    const tl = gsap.timeline({ delay: 0.55 });
    for (const step of steps) {
      tl.add(() => {
        const sprite = PixiBoardRenderer.pieceSprites[`${step.to.col},${step.to.row}`];
        const back = PixiBoardRenderer.squareCenter(step.from.row, step.from.col);
        if (sprite) gsap.to(sprite, { x: back.x, y: back.y, duration: 0.32, ease: 'power1.inOut' });
      });
      tl.add(() => step.apply(), '+=0.36');
      tl.add(() => {}, '+=0.08');
    }
    tl.add(() => this._setInverted(false), '+=0.15');
    tl.add(() => this._crystalForm(gift, themeId, onDone), '+=0.1');
    this._rewindTimeline = tl;
  },

  _crystalForm(gift, themeId, onDone) {
    if (!gift) { onDone(); return; }
    const center = PixiBoardRenderer.squareCenter(gift.row, gift.col);
    const shards = [];
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 90;
      const s = new PIXI.Graphics().poly([0, -10, 6, 5, -6, 5]).fill({ color: i % 3 ? this.CRYSTAL : 0xffffff, alpha: 0.9 });
      s.x = center.x + Math.cos(a) * d;
      s.y = center.y + Math.sin(a) * d;
      s.rotation = Math.random() * 6;
      s.alpha = 0;
      this.fxLayer.addChild(s);
      shards.push(s);
    }
    const tl = gsap.timeline();
    shards.forEach((s, i) => {
      tl.to(s, { alpha: 1, duration: 0.1 }, i * 0.025);
      tl.to(s, { x: center.x, y: center.y, rotation: s.rotation + 4, duration: 0.55, ease: 'power3.in' }, i * 0.025);
    });
    tl.add(() => {
      shards.forEach(s => s.destroy());
      const flash = new PIXI.Graphics().circle(center.x, center.y, 10).fill({ color: 0xffffff, alpha: 1 });
      this.fxLayer.addChild(flash);
      gsap.to(flash.scale, { x: 7, y: 7, duration: 0.4, ease: 'power2.out' });
      gsap.to(flash, { alpha: 0, duration: 0.4, onComplete: () => flash.destroy() });
      onDone();
      const sprite = PixiBoardRenderer.pieceSprites[`${gift.col},${gift.row}`];
      if (sprite) {
        const w = sprite.width, h = sprite.height;
        sprite.width = sprite.height = 1;
        gsap.to(sprite, { width: w, height: h, duration: 0.45, ease: 'back.out(3)' });
      }
      if (typeof PixiBoardRenderer.flash === 'function') PixiBoardRenderer.flash(0xe7d6ff);
    });
  },
};
