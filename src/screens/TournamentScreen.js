// A tournament world's own screen (Tournaments / engine/Tournament.js): the Queen's
// Cup in the Royal Palace (group tables, then the knockout bracket) and the Gulch
// Shootout in Forked Gulch (a bracket of wanted posters). The side panel shows your
// next opponent and the round's twist, or how the attempt ended: out ("Enter
// again" draws a new tournament) or champion (a trophy and the guardian fight).
// init({ world }). The host (Queenie, ForkMaster) comments on every step.
const TournamentScreen = {
  isPixiScreen: true,
  pixiContainer: null,
  _lastInitData: null,

  L: {
    TOP: 150,
    SIDE: 36,
    GAP: 20,
    PANEL_W: 408,
    PAD: 20,
    BTN_H: 54,
    CHAMP_W: 108,       // the bracket's champion column
    HEAD_H: 30,         // round names over the bracket columns
    CAPTION_H: 26,
  },

  TABLE_MAX_H: 250,
  ROUND_HEADS: { r16: 'ROUND OF 16', qf: 'QUARTER-FINALS', sf: 'SEMI-FINALS', final: 'FINAL' },

  // Wanted-poster colours for the Shootout.
  POSTER: { paper: 0xe8d2a0, paperDark: 0xc9a86a, ink: '#3a2414', inkNum: 0x3a2414, red: 0xa8321e, wood: 0x3a2414, plank: 0x4e3220 },

  init(data = {}) {
    this.worldId = Tournaments.forWorld(data.world) ? data.world : 'royalpalace';
    this._lastInitData = { world: this.worldId };
    this.world = WORLDS.find(w => w.id === this.worldId);
    this.def = Tournaments.forWorld(this.worldId);
    this.guardian = Tournaments.guardian(this.worldId);
    ThemeManager.useStoryTheme(this.world.art);   // story mode shows the land you are in
    this.cols = ThemeManager.getTheme(this.world.art).colors;
    this.wanted = this.def.format === 'knockout';
    this.busy = false;
    this.time = 0;
    this.pulses = [];
    this.save = store.getActiveSave() || null;
    this.t = this.save ? Tournaments.state(this.save, this.worldId) : null;
    this.view = this._defaultView();

    TextureManager.preloadTheme(this.world.art);
    this.pixiContainer = PixiPremiumScene.root(this.world.name, this._subtitle(), {
      themeId: this.world.art,
      footerHint: 'Enter to play  ·  Esc for the map',
    });
    PixiScreenManager.setScreenContainer(this.pixiContainer);
    this.layer = new PIXI.Container();
    this.pixiContainer.addChild(this.layer);
    this.fxLayer = new PIXI.Container();
    this.pixiContainer.addChild(this.fxLayer);
    this._build();

    this.layer.alpha = 0;
    gsap.to(this.layer, { alpha: 1, duration: 0.45, ease: 'power2.out' });
    this._playEvent();
  },

  destroy() {
    if (this.pixiContainer) {
      const all = [];
      const walk = n => { all.push(n, n.scale); (n.children || []).forEach(walk); };
      walk(this.pixiContainer);
      all.forEach(o => gsap.killTweensOf(o));
    }
    PixiBackgroundRenderer.destroy();
    PixiPremiumScene.destroy(this);
    this.layer = this.fxLayer = null;
    this.pulses = [];
  },

  pixiUpdate(dt) {
    if (!this.pixiContainer) return;
    PixiPremiumScene.update(this.pixiContainer, dt);
    this.time += dt;
    for (const p of this.pulses) if (!p.destroyed) p.alpha = 0.45 + Math.sin(this.time * 4) * 0.4;
    if (this.trophy && !this.trophy.destroyed) this.trophy.y = this.trophy._baseY + Math.sin(this.time * 2) * 4;
  },

  /* ------------------------------------------------------------------ */
  /*  State helpers                                                      */
  /* ------------------------------------------------------------------ */

  _hasKnockout() {
    return !!this.t && this.t.matches.some(m => m.phase === 'qf' || m.phase === 'r16');
  },

  _defaultView() {
    if (!this.t || this.wanted) return 'bracket';
    if (this.t.status === 'out' && this.t.outAt === 'group') return 'groups';
    return Tournament.isGroupPhase(this.t) ? 'groups' : 'bracket';
  },

  _subtitle() {
    if (!this.t) return this.def.name;
    if (this.t.status === 'champion') return `${this.def.name}  ·  Champion`;
    if (this.t.status === 'out') return `${this.def.name}  ·  Out: ${Tournaments.finishLabel(this.t)}`;
    const m = Tournament.playerMatch(this.t);
    return m ? `${this.def.name}  ·  ${Tournaments.stageLabel(this.t, m)}` : this.def.name;
  },

  _guardianBeaten() {
    return !!this.guardian && StoryProgress.isBeaten(this.save, this.guardian.stage);
  },

  _entrant(i) {
    return i === null || i === undefined ? null : this.t.entrants[i];
  },

  // You, as the character worn on the map (a Shop cosmetic; the king by default).
  _playerSprite() {
    const t = typeof Wallet !== 'undefined' ? Wallet.token() : { piece: 'king', color: 'white', art: null };
    return PixiPieceRenderer.createSprite(PixiPieceRenderer.withArt(t.art || this.world.art), t.color, t.piece);
  },

  _piece(e, size) {
    const sp = e.player
      ? this._playerSprite()
      : PixiPieceRenderer.createSprite(this.world.art, 'black', e.piece);
    sp.width = sp.height = size;
    return sp;
  },

  /* ------------------------------------------------------------------ */
  /*  Layout                                                             */
  /* ------------------------------------------------------------------ */

  _areas() {
    const L = this.L;
    const top = L.TOP;
    const bottom = PixiPremiumScene.contentBottom;
    if (Layout.isPortrait) {
      const x = 28, w = Layout.W - 56;
      const panelH = Math.max(320, Math.min(380, Math.round((bottom - top) * 0.36)));
      // Tall phones: the board takes what it needs and the rest of the scene shows below.
      const boardH = Math.min(bottom - top - panelH - L.GAP, this._boardNeed());
      return { portrait: true, board: { x, y: top, w, h: boardH }, panel: { x, y: top + boardH + L.GAP, w, h: panelH } };
    }
    const pw = L.PANEL_W;
    return {
      portrait: false,
      board: { x: L.SIDE, y: top, w: Layout.W - L.SIDE * 2 - pw - L.GAP, h: bottom - top },
      panel: { x: Layout.W - L.SIDE - pw, y: top, w: pw, h: bottom - top },
    };
  },

  // The height the board looks best at (tables and brackets stop growing).
  _boardNeed() {
    const L = this.L;
    if (this.view === 'groups' && this.t && this.t.groups) return 2 * this.TABLE_MAX_H + 16 + L.CAPTION_H;
    const first = this.wanted ? 8 : 4;
    return L.HEAD_H + first * 84 + 40;
  },

  _build() {
    this.layer.removeChildren().forEach(c => c.destroy({ children: true }));
    this.pulses = [];
    this.trophy = null;
    this.primary = null;
    const A = this._areas();
    this.areas = A;
    if (!this.t) {
      const P = A.panel;
      PixiPremiumScene.panel(this.layer, P.x, P.y, P.w, 120, { fill: this.cols.panel, accent: this.cols.accent });
      const msg = PixiPremiumScene.text('Pick a story save first.', { fontSize: 20, fontWeight: '800', fill: this.cols.text });
      msg.x = P.x + 24;
      msg.y = P.y + 44;
      this.layer.addChild(msg);
    } else {
      if (this.view === 'groups' && this.t.groups) this._buildGroups(A.board);
      else this._buildBracket(A.board);
      if (this.t.status === 'champion') this._panelChampion(A.panel);
      else if (this.t.status === 'out') this._panelOut(A.panel);
      else this._panelNext(A.panel);
    }
    const bh = 44;
    const by = PixiPremiumScene.bottomButtonY(bh);
    PixiPremiumScene.button(this.layer, 36, by, 180, bh, 'World Map', () => this.back(), { icon: 'back' });
    if (this.t && this.t.groups && this._hasKnockout()) {
      const label = this.view === 'groups' ? 'Bracket' : 'Groups';
      PixiPremiumScene.button(this.layer, Layout.W - 36 - 180, by, 180, bh, label, () => this.toggleView());
    }
  },

  toggleView() {
    if (this.busy || !this.t || !this.t.groups || !this._hasKnockout()) return;
    this.view = this.view === 'groups' ? 'bracket' : 'groups';
    audioManager.playSelect();
    this._build();
  },

  /* ------------------------------------------------------------------ */
  /*  Group tables (the Cup)                                             */
  /* ------------------------------------------------------------------ */

  _buildGroups(B) {
    const L = this.L;
    const gap = 16;
    const tw = Math.floor((B.w - gap) / 2);
    const th = Math.min(this.TABLE_MAX_H, Math.floor((B.h - gap - L.CAPTION_H) / 2));
    for (let g = 0; g < 4; g++) {
      this._groupTable(g, B.x + (g % 2) * (tw + gap), B.y + Math.floor(g / 2) * (th + gap), tw, th);
    }
    const cap = PixiPremiumScene.text('Win 3 pts  ·  Draw 1  ·  Top two go through  ·  Ties: head-to-head, then strength of results', {
      fontSize: 14, fontWeight: '700', fill: '#f3ead8', stroke: { color: '#000000', width: 3 },
    });
    cap.anchor.set(0.5, 0);
    cap.x = B.x + B.w / 2;
    cap.y = B.y + th * 2 + gap + 6;
    PixiPremiumScene.fit(cap, B.w, 0.6);
    this.layer.addChild(cap);
  },

  _groupTable(g, x, y, w, h) {
    const t = this.t;
    const mine = Tournament.playerGroup(t) === g;
    const accent = PixiPremiumScene.color(this.cols.accent);
    PixiPremiumScene.panel(this.layer, x, y, w, h, {
      fill: this.cols.panel, accent: this.cols.accent, accentAlpha: mine ? 0.95 : 0.45,
      border: mine ? this.cols.accent : this.cols.text, borderAlpha: mine ? 0.8 : 0.3, alpha: 0.8,
    });
    const title = PixiPremiumScene.text(`GROUP ${Tournament.GROUP_LETTERS[g]}`, {
      fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 18, fontWeight: 'bold', fill: mine ? this.cols.accent : this.cols.text,
    });
    title.x = x + 16;
    title.y = y + 22;
    this.layer.addChild(title);

    // Columns from the right: Pts, L, D, W, P.
    const cols = [['PTS', 46], ['L', 30], ['D', 30], ['W', 30], ['P', 30]];
    const colX = [];
    let cx = x + w - 14;
    for (const [, cw] of cols) { cx -= cw; colX.push(cx + cw / 2); }
    const headY = y + 28;
    cols.forEach(([label], i) => {
      const t2 = PixiPremiumScene.text(label, { fontSize: 12, fontWeight: '900', fill: PixiPremiumScene.alpha(this.cols.text, '99'), letterSpacing: 1 });
      t2.anchor.set(0.5, 0);
      t2.x = colX[i];
      t2.y = headY;
      this.layer.addChild(t2);
    });

    const rows = Tournament.standings(t, g);
    const done = Tournament.groupDone(t, g);
    const top = y + 54;
    const rowH = Math.min(44, Math.floor((h - 64) / 4));
    const nameX = x + 16 + 22 + rowH;
    const nameMax = colX[colX.length - 1] - 18 - nameX;
    const g2 = new PIXI.Graphics();
    this.layer.addChild(g2);
    rows.forEach((r, i) => {
      const e = t.entrants[r.entrant];
      const ry = top + i * rowH;
      const through = i < 2;
      if (e.player) g2.rect(x + 8, ry + 2, w - 16, rowH - 4).fill({ color: accent, alpha: 0.22 });
      else if (i % 2) g2.rect(x + 8, ry + 2, w - 16, rowH - 4).fill({ color: 0x000000, alpha: 0.14 });
      // Qualification places: a green edge; out of it once the group is over: dimmed.
      g2.rect(x + 8, ry + 2, 4, rowH - 4).fill({ color: through ? 0x5fd07a : 0x6a5a6a, alpha: through ? 0.95 : 0.6 });
      const alpha = done && !through ? 0.5 : 1;
      const pos = PixiPremiumScene.text(String(r.pos), { fontSize: 15, fontWeight: '900', fill: this.cols.text });
      pos.anchor.set(0.5);
      pos.x = x + 26;
      pos.y = ry + rowH / 2;
      const icon = this._piece(e, rowH - 8);
      icon.x = x + 38 + rowH / 2;
      icon.y = ry + rowH / 2;
      const name = PixiPremiumScene.text(e.player ? 'You' : e.name, {
        fontSize: 16, fontWeight: e.player ? '900' : '700', fill: e.player ? this.cols.accent : this.cols.text,
      });
      name.anchor.set(0, 0.5);
      name.x = nameX;
      name.y = ry + rowH / 2;
      PixiPremiumScene.fit(name, nameMax, 0.55);
      [pos, icon, name].forEach(o => { o.alpha = alpha; this.layer.addChild(o); });
      const nums = [r.pts, r.l, r.d, r.w, r.p];
      nums.forEach((n, k) => {
        const nt = PixiPremiumScene.text(String(n), { fontSize: k === 0 ? 17 : 15, fontWeight: k === 0 ? '900' : '700', fill: k === 0 ? this.cols.accent : this.cols.text });
        nt.anchor.set(0.5);
        nt.x = colX[k];
        nt.y = ry + rowH / 2;
        nt.alpha = alpha;
        this.layer.addChild(nt);
      });
    });
    // The line between the qualifying places and the rest.
    const ly = top + rowH * 2;
    for (let lx = x + 12; lx < x + w - 12; lx += 10) g2.rect(lx, ly - 1, 6, 2).fill({ color: 0x5fd07a, alpha: 0.55 });
  },

  /* ------------------------------------------------------------------ */
  /*  Bracket                                                            */
  /* ------------------------------------------------------------------ */

  _buildBracket(B) {
    const L = this.L;
    const t = this.t;
    const rounds = Tournament.bracket(t);
    const n = rounds.length;
    const colGap = n > 3 ? 20 : 26;
    const champW = L.CHAMP_W;
    let inner = { x: B.x, y: B.y, w: B.w, h: B.h };

    if (this.wanted) {
      // A board of wanted posters nailed to planks.
      const g = new PIXI.Graphics();
      g.poly(PixiPremiumScene.pixelShape(B.x, B.y + 6, B.w, B.h, 4)).fill({ color: 0x000000, alpha: 0.35 });
      g.poly(PixiPremiumScene.pixelShape(B.x, B.y, B.w, B.h, 4)).fill(this.POSTER.wood);
      for (let py = B.y + 8; py < B.y + B.h - 8; py += 46) {
        g.rect(B.x + 6, py, B.w - 12, 42).fill(this.POSTER.plank);
        g.rect(B.x + 6, py + 40, B.w - 12, 2).fill({ color: 0x000000, alpha: 0.3 });
      }
      g.poly(PixiPremiumScene.pixelShape(B.x + 1, B.y + 1, B.w - 2, B.h - 2, 4)).stroke({ color: 0x1a0e06, width: 3, alignment: 1 });
      this.layer.addChild(g);
      inner = { x: B.x + 14, y: B.y + 8, w: B.w - 28, h: B.h - 16 };
    } else {
      PixiPremiumScene.panel(this.layer, B.x, B.y, B.w, B.h, { fill: this.cols.panel, accent: this.cols.accent, alpha: 0.7 });
      inner = { x: B.x + 16, y: B.y + 22, w: B.w - 32, h: B.h - 34 };
    }

    const boxW = Math.floor((inner.w - champW - colGap * n) / n);
    const first = rounds[0].matches.length;
    const slotH = (inner.h - L.HEAD_H) / first;
    const boxH = Math.max(40, Math.min(66, Math.floor(slotH - 10)));
    const lines = new PIXI.Graphics();
    this.layer.addChild(lines);
    const centres = [];

    rounds.forEach((round, r) => {
      const x = inner.x + r * (boxW + colGap);
      const head = PixiPremiumScene.text(this.ROUND_HEADS[round.phase], {
        fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 13, fontWeight: 'bold',
        fill: this.wanted ? '#e8d2a0' : this.cols.accent,
      });
      head.anchor.set(0.5, 0);
      head.x = x + boxW / 2;
      head.y = inner.y + 4;
      PixiPremiumScene.fit(head, boxW + colGap - 6, 0.5);
      this.layer.addChild(head);
      centres[r] = [];
      const span = Math.pow(2, r);
      round.matches.forEach((m, k) => {
        const cy = inner.y + L.HEAD_H + slotH * span * (k + 0.5);
        centres[r][k] = cy;
        this._matchBox(m, x, Math.round(cy - boxH / 2), boxW, boxH);
      });
    });

    // Connectors: each pair of boxes joins the box they feed.
    const lineCol = this.wanted ? 0xc9a86a : PixiPremiumScene.color(this.cols.text);
    const litCol = this.wanted ? this.POSTER.red : PixiPremiumScene.color(this.cols.accent);
    for (let r = 0; r < n; r++) {
      const x0 = inner.x + r * (boxW + colGap) + boxW;
      const xm = x0 + colGap / 2;
      const x1 = x0 + colGap;
      rounds[r].matches.forEach((m, k) => {
        const y0 = centres[r][k];
        const y1 = r + 1 < n ? centres[r + 1][Math.floor(k / 2)] : y0;
        const lit = m.result && Tournament.winner(m) === 0;
        const col = lit ? litCol : lineCol;
        const a = lit ? 0.95 : 0.35;
        lines.rect(x0, y0 - 1, xm - x0, 3).fill({ color: col, alpha: a });
        lines.rect(xm - 1, Math.min(y0, y1) - 1, 3, Math.abs(y1 - y0) + 3).fill({ color: col, alpha: a });
        lines.rect(xm, y1 - 1, x1 - xm, 3).fill({ color: col, alpha: a });
      });
    }

    // The champion.
    const final = rounds[n - 1].matches[0];
    const cx = inner.x + n * (boxW + colGap) + champW / 2;
    const cy = centres[n - 1][0];
    this._champion(cx, cy, champW, final.result ? this._entrant(Tournament.winner(final)) : null);
  },

  _matchBox(m, x, y, w, h) {
    const t = this.t;
    const current = t.status === 'playing' && !m.result && !m.pending && Tournament.hasPlayer(m);
    const accent = PixiPremiumScene.color(this.cols.accent);
    const box = new PIXI.Graphics();
    if (this.wanted) {
      box.rect(x + 3, y + 4, w, h).fill({ color: 0x000000, alpha: 0.35 });
      box.rect(x, y, w, h).fill(m.pending ? this.POSTER.paperDark : this.POSTER.paper);
      box.rect(x, y, w, 3).fill({ color: 0xffffff, alpha: 0.25 });
      box.rect(x, y + h - 3, w, 3).fill({ color: 0x000000, alpha: 0.18 });
      box.rect(x, y, w, h).stroke({ color: this.POSTER.inkNum, width: 2, alpha: 0.7 });
      // Nails.
      box.rect(x + 4, y + 3, 3, 3).fill(0x5a5a60);
      box.rect(x + w - 7, y + 3, 3, 3).fill(0x5a5a60);
    } else {
      box.poly(PixiPremiumScene.pixelShape(x, y + 3, w, h, 3)).fill({ color: 0x000000, alpha: 0.3 });
      box.poly(PixiPremiumScene.pixelShape(x, y, w, h, 3)).fill({ color: 0x07080d, alpha: 0.85 });
      box.poly(PixiPremiumScene.pixelShape(x + 2, y + 2, w - 4, h - 4, 3)).fill({ color: PixiPremiumScene.color(this.cols.panel), alpha: m.pending ? 0.45 : 0.92 });
      box.rect(x + 8, y + Math.floor(h / 2), w - 16, 1).fill({ color: PixiPremiumScene.color(this.cols.text), alpha: 0.15 });
    }
    this.layer.addChild(box);
    if (current) {
      const ring = new PIXI.Graphics().rect(x - 4, y - 4, w + 8, h + 8).stroke({ color: this.wanted ? this.POSTER.red : accent, width: 3 });
      this.layer.addChild(ring);
      this.pulses.push(ring);
    }
    const rowH = h / 2;
    [[m.a, 'a'], [m.b, 'b']].forEach(([ei, side], i) => {
      const e = this._entrant(ei);
      const ry = y + i * rowH;
      const won = m.result === side;
      const lost = m.result && !won;
      const ink = this.wanted ? this.POSTER.ink : this.cols.text;
      if (!e) {
        const q = PixiPremiumScene.text('?', { fontSize: 14, fontWeight: '900', fill: ink });
        q.anchor.set(0, 0.5);
        q.x = x + 10;
        q.y = ry + rowH / 2;
        q.alpha = 0.45;
        this.layer.addChild(q);
        return;
      }
      if (e.player) {
        const hl = new PIXI.Graphics().rect(x + 3, ry + 2, w - 6, rowH - 4).fill({ color: this.wanted ? this.POSTER.red : accent, alpha: this.wanted ? 0.2 : 0.25 });
        this.layer.addChild(hl);
      }
      const size = Math.max(14, Math.round(rowH - 6));
      const icon = this._piece(e, size);
      icon.x = x + 6 + size / 2;
      icon.y = ry + rowH / 2;
      const name = PixiPremiumScene.text(e.player ? 'You' : e.name, {
        fontSize: 14, fontWeight: won || e.player ? '900' : '700',
        fill: e.player ? (this.wanted ? '#8a1e10' : this.cols.accent) : ink,
      });
      name.anchor.set(0, 0.5);
      name.x = x + 10 + size;
      name.y = ry + rowH / 2;
      PixiPremiumScene.fit(name, w - size - 24, 0.5);
      icon.alpha = name.alpha = lost ? 0.45 : 1;
      this.layer.addChild(icon, name);
      if (lost && this.wanted) {
        // Shot down: a red line through the poster.
        const bang = new PIXI.Graphics().rect(x + 6, ry + rowH / 2 - 1, w - 12, 3).fill({ color: this.POSTER.red, alpha: 0.85 });
        this.layer.addChild(bang);
      }
      if (won) {
        const tick = new PIXI.Graphics().rect(x + w - 12, ry + rowH / 2 - 4, 6, 8).fill(this.wanted ? this.POSTER.red : 0x5fd07a);
        this.layer.addChild(tick);
      }
    });
    if (m.replays > 0 && !m.result) {
      const rp = PixiPremiumScene.text(`REPLAY ${m.replays + 1}`, { fontSize: 10, fontWeight: '900', fill: this.wanted ? '#8a1e10' : this.cols.accent });
      rp.anchor.set(1, 0);
      rp.x = x + w - 4;
      rp.y = y - 13;
      this.layer.addChild(rp);
    }
  },

  // The champion column: the trophy, and the winner's name when there is one.
  _champion(cx, cy, w, e) {
    const art = this._trophyArt(Math.min(64, w - 20));
    art.x = cx;
    art.y = cy - 18;
    art.alpha = e ? 1 : 0.4;
    this.layer.addChild(art);
    const label = PixiPremiumScene.text(e ? (e.player ? 'You!' : e.name) : 'Champion', {
      fontSize: 13, fontWeight: '900', fill: this.wanted ? '#e8d2a0' : (e && e.player ? this.cols.accent : this.cols.text),
      stroke: { color: '#000000', width: 3 }, wordWrap: true, wordWrapWidth: w, align: 'center',
    });
    label.anchor.set(0.5, 0);
    label.x = cx;
    label.y = cy + 22;
    this.layer.addChild(label);
  },

  // The Cup: a golden cup with handles. The Shootout: a star badge with balled tips.
  _trophyArt(size) {
    const g = new PIXI.Graphics();
    const u = Math.max(2, Math.round(size / 16));
    const gold = 0xf2c230, shade = 0xb07a10, light = 0xfff0a0;
    if (!this.wanted) {
      g.rect(-5 * u, -7 * u, 10 * u, 6 * u).fill(gold);         // bowl
      g.rect(-4 * u, -1 * u, 8 * u, 2 * u).fill(gold);
      g.rect(-3 * u, 1 * u, 6 * u, 1 * u).fill(shade);
      g.rect(-1 * u, 2 * u, 2 * u, 3 * u).fill(shade);          // stem
      g.rect(-3 * u, 5 * u, 6 * u, 1 * u).fill(gold);           // base
      g.rect(-4 * u, 6 * u, 8 * u, 2 * u).fill(shade);
      g.rect(-7 * u, -6 * u, 2 * u, 1 * u).fill(gold);          // handles
      g.rect(-8 * u, -6 * u, 1 * u, 4 * u).fill(gold);
      g.rect(-7 * u, -3 * u, 2 * u, 1 * u).fill(gold);
      g.rect(5 * u, -6 * u, 2 * u, 1 * u).fill(gold);
      g.rect(7 * u, -6 * u, 1 * u, 4 * u).fill(gold);
      g.rect(5 * u, -3 * u, 2 * u, 1 * u).fill(gold);
      g.rect(-4 * u, -7 * u, 2 * u, 4 * u).fill(light);         // shine
      g.rect(-5 * u, -8 * u, 10 * u, 1 * u).fill(light);
    } else {
      const pts = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 5, rr = (k % 2 ? 3.2 : 7.5) * u;
        pts.push(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.poly(pts).fill(gold);
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + k * Math.PI * 2 / 5;
        g.circle(Math.cos(a) * 7.5 * u, Math.sin(a) * 7.5 * u, 1.3 * u).fill(light);
      }
      g.circle(0, 0, 2.6 * u).fill(shade).circle(0, 0, 1.6 * u).fill(gold);
    }
    return g;
  },

  /* ------------------------------------------------------------------ */
  /*  Side panel                                                         */
  /* ------------------------------------------------------------------ */

  _panelBase(P) {
    if (this.wanted) {
      const g = new PIXI.Graphics();
      g.rect(P.x + 4, P.y + 6, P.w, P.h).fill({ color: 0x000000, alpha: 0.4 });
      g.rect(P.x, P.y, P.w, P.h).fill(this.POSTER.paper);
      g.rect(P.x + 6, P.y + 6, P.w - 12, P.h - 12).stroke({ color: this.POSTER.inkNum, width: 2, alpha: 0.55 });
      g.rect(P.x, P.y, P.w, P.h).stroke({ color: this.POSTER.inkNum, width: 3, alpha: 0.8 });
      // Torn corners and nails.
      g.poly([P.x, P.y, P.x + 14, P.y, P.x, P.y + 10]).fill(this.POSTER.paperDark);
      g.poly([P.x + P.w, P.y + P.h, P.x + P.w - 16, P.y + P.h, P.x + P.w, P.y + P.h - 12]).fill(this.POSTER.paperDark);
      g.rect(P.x + P.w / 2 - 3, P.y + 6, 6, 6).fill(0x5a5a60);
      this.layer.addChild(g);
    } else {
      PixiPremiumScene.panel(this.layer, P.x, P.y, P.w, P.h, { fill: this.cols.panel, accent: this.cols.accent, accentAlpha: 0.85, alpha: 0.82 });
    }
  },

  _ink() { return this.wanted ? this.POSTER.ink : this.cols.text; },
  _hi() { return this.wanted ? '#8a1e10' : this.cols.accent; },

  _txt(str, size, opts = {}) {
    return PixiPremiumScene.text(str, Object.assign({ fontSize: size, fontWeight: '800', fill: this._ink() }, opts));
  },

  _panelNext(P) {
    const L = this.L;
    const t = this.t;
    const m = Tournament.playerMatch(t);
    const def = m && Tournaments.matchDef(this.worldId, t, m);
    this._panelBase(P);
    if (!def) return;
    SideMatches.make(def);      // registers the opponent so its minion portrait can be drawn
    const opp = Tournament.opponent(t, m);
    const wide = P.w > 600;
    const pad = L.PAD;
    const colW = wide ? Math.floor(P.w / 2) - pad - 10 : P.w - pad * 2;
    const x = P.x + pad;
    let y = P.y + (this.wanted ? 20 : 26);

    if (this.wanted) {
      const head = this._txt('WANTED', wide ? 30 : 38, { fontFamily: PixiTextStyles.FONT_TITLE, fontWeight: 'bold', fill: this.POSTER.ink });
      head.anchor.set(0.5, 0);
      head.x = wide ? x + colW / 2 : P.x + P.w / 2;
      head.y = y;
      this.layer.addChild(head);
      y += head.height + 2;
    }
    const kicker = this._txt(`NEXT MATCH  ·  ${Tournaments.stageLabel(t, m).toUpperCase()}${m.replays ? '  ·  REPLAY' : ''}`, 12, {
      fontWeight: '900', fill: PixiPremiumScene.alpha(this.wanted ? '#3a2414' : this.cols.text, 'aa'), letterSpacing: 1,
    });
    kicker.x = x;
    kicker.y = y;
    if (this.wanted) { kicker.anchor.set(0.5, 0); kicker.x = wide ? x + colW / 2 : P.x + P.w / 2; }
    PixiPremiumScene.fit(kicker, colW, 0.6);
    this.layer.addChild(kicker);
    y += 22;

    // Portrait and name.
    const ps = wide ? 110 : 132;
    const frame = new PIXI.Graphics().rect(x - 3, y - 3, ps + 6, ps + 6)
      .fill(this.wanted ? 0x2a1a10 : 0x120d18).stroke({ color: this.wanted ? this.POSTER.inkNum : PixiPremiumScene.color(this.cols.accent), width: 2, alpha: 0.9 });
    const portrait = PixiPremiumAssets.characterSprite(def.id);
    if (portrait.anchor) portrait.anchor.set(0);
    portrait.width = portrait.height = ps;
    portrait.x = x;
    portrait.y = y;
    this.layer.addChild(frame, portrait);
    const tx = x + ps + 16;
    const tw = (wide ? colW : P.w - pad * 2) - ps - 16;
    const name = this._txt(opp.name, 22, { fontWeight: '900' });
    name.x = tx;
    name.y = y + 2;
    PixiPremiumScene.fit(name, tw, 0.55);
    const title = this._txt(opp.title, 15, { fill: this._hi(), wordWrap: true, wordWrapWidth: tw, lineHeight: 18 });
    title.x = tx;
    title.y = name.y + name.height + 4;
    this.layer.addChild(name, title);
    // Strength: pips from the weakest entrant level to the strongest.
    const top = Tournaments.guardianLevel(this.worldId);
    const pips = Math.max(1, Math.min(4, opp.level - Math.max(1, top - 3) + 1));
    const sl = this._txt('STRENGTH', 11, { fontWeight: '900', letterSpacing: 1, fill: PixiPremiumScene.alpha(this.wanted ? '#3a2414' : this.cols.text, '99') });
    sl.x = tx;
    sl.y = title.y + title.height + 8;
    const pg = new PIXI.Graphics();
    for (let k = 0; k < 4; k++) {
      const px = tx + sl.width + 10 + k * 16;
      pg.rect(px, sl.y + 2, 12, 12).fill({ color: k < pips ? (this.wanted ? this.POSTER.red : PixiPremiumScene.color(this.cols.accent)) : 0x000000, alpha: k < pips ? 1 : 0.3 });
    }
    this.layer.addChild(sl, pg);
    const bounty = this._txt(this.wanted ? `BOUNTY  ${def.reward.coins} coins` : `Prize  ${def.reward.coins} coins`, 13, { fontWeight: '900', fill: this._hi() });
    bounty.x = tx;
    bounty.y = sl.y + 22;
    PixiPremiumScene.fit(bounty, tw, 0.6);
    this.layer.addChild(bounty);

    // The round's twist.
    const rule = def.rule;
    const twist = !!(this.def.twists && this.def.twists[m.phase]);
    let ry, rx, rw;
    if (wide) { rx = P.x + P.w / 2 + 10; ry = P.y + 26; rw = colW; } else { rx = x; ry = y + ps + 18; rw = colW; }
    const ruleH = 96;
    const rb = new PIXI.Graphics();
    rb.poly(PixiPremiumScene.pixelShape(rx, ry, rw, ruleH, 3)).fill({ color: this.wanted ? this.POSTER.paperDark : 0x000000, alpha: this.wanted ? 0.55 : 0.28 });
    if (twist) rb.rect(rx, ry + 8, 4, ruleH - 16).fill(this.wanted ? this.POSTER.red : PixiPremiumScene.color(this.cols.accent));
    this.layer.addChild(rb);
    const rl = this._txt(twist ? `TWIST  ·  ${rule.title.toUpperCase()}` : rule.title.toUpperCase(), 12, { fontWeight: '900', letterSpacing: 1, fill: twist ? this._hi() : PixiPremiumScene.alpha(this.wanted ? '#3a2414' : this.cols.text, 'aa') });
    rl.x = rx + 14;
    rl.y = ry + 10;
    PixiPremiumScene.fit(rl, rw - 24, 0.6);
    const rd = this._txt(rule.lines[0], 14, { fontWeight: '700', wordWrap: true, wordWrapWidth: rw - 28, lineHeight: 18 });
    rd.x = rx + 14;
    rd.y = rl.y + 20;
    if (rd.height > ruleH - 36) rd.scale.set((ruleH - 36) / rd.height);
    this.layer.addChild(rl, rd);
    const note = this._txt(m.group !== null ? 'Win 3 pts  ·  Draw 1  ·  Top two of the group go through'
      : 'Lose and you are out. A drawn game is played again.', 13, { fontWeight: '800', fill: this._hi() });
    note.x = rx;
    note.y = ry + ruleH + 8;
    PixiPremiumScene.fit(note, rw, 0.55);
    this.layer.addChild(note);

    // The host's line, and Play.
    const btnH = PixiPremiumScene.buttonHeight(L.BTN_H);
    const bx = wide ? rx : x;
    const bw = wide ? rw : colW;
    const by = P.y + P.h - pad - btnH;
    const hostY = wide ? y + ps + 14 : note.y + note.height + 14;
    const hostH = wide ? P.y + P.h - pad - hostY : by - 12 - hostY;
    this._hostBubble(x, hostY, wide ? colW : colW, hostH);
    this.primary = () => this.play();
    PixiPremiumScene.button(this.layer, bx, by, bw, L.BTN_H, m.replays ? 'Play Again' : 'Play', () => this.play(), { primary: true, icon: 'play', fontSize: 20 });
  },

  // The host's face and what they are saying.
  _hostBubble(x, y, w, h) {
    if (h < 50) return;
    const line = Tournaments.hostLine(this.worldId, this.t);
    const face = Math.min(64, h - 8);
    const holder = new PIXI.Container();
    this.layer.addChild(holder);
    const ring = new PIXI.Graphics().circle(x + face / 2, y + face / 2, face / 2 + 3).fill(this.wanted ? this.POSTER.inkNum : PixiPremiumScene.color(this.cols.accent));
    const sp = PixiPremiumAssets.characterSprite(this.def.host);
    if (sp.anchor) sp.anchor.set(0);
    sp.width = sp.height = face;
    sp.x = x;
    sp.y = y;
    const mask = new PIXI.Graphics().circle(x + face / 2, y + face / 2, face / 2).fill(0xffffff);
    sp.mask = mask;
    holder.addChild(ring, sp, mask);
    const bx = x + face + 12;
    const bw = w - face - 12;
    const who = this._txt(this.def.hostName.toUpperCase(), 11, { fontWeight: '900', letterSpacing: 1, fill: this._hi() });
    who.x = bx + 10;
    who.y = y + 2;
    const txt = this._txt(`"${line}"`, 14, { fontWeight: '700', wordWrap: true, wordWrapWidth: bw - 20, lineHeight: 18 });
    txt.x = bx + 10;
    txt.y = who.y + 16;
    const maxH = h - 24;
    if (txt.height > maxH) txt.scale.set(Math.max(0.6, maxH / txt.height));
    const bh = Math.min(h, Math.max(face, txt.y - y + txt.height + 10));
    const bubble = new PIXI.Graphics()
      .poly(PixiPremiumScene.pixelShape(bx, y, bw, bh, 3)).fill({ color: this.wanted ? 0xffffff : 0x000000, alpha: this.wanted ? 0.35 : 0.3 })
      .poly([bx, y + 14, bx - 8, y + 20, bx, y + 26]).fill({ color: this.wanted ? 0xffffff : 0x000000, alpha: this.wanted ? 0.35 : 0.3 });
    holder.addChild(bubble, who, txt);
  },

  _panelOut(P) {
    const L = this.L;
    const t = this.t;
    this._panelBase(P);
    const wide = P.w > 600;
    const pad = L.PAD;
    const colW = wide ? Math.floor(P.w / 2) - pad - 10 : P.w - pad * 2;
    const x = P.x + pad;
    let y = P.y + 28;
    const group = t.outAt === 'group';
    const head = this._txt(this.wanted ? 'SHOT DOWN' : group ? 'OUT IN THE GROUP' : 'KNOCKED OUT', 26, {
      fontFamily: PixiTextStyles.FONT_TITLE, fontWeight: 'bold', fill: this.wanted ? '#8a1e10' : '#ff8a7a',
    });
    head.x = x;
    head.y = y;
    PixiPremiumScene.fit(head, colW, 0.55);
    this.layer.addChild(head);
    y += head.height + 8;

    const hist = Tournament.playerHistory(t);
    const last = hist[hist.length - 1];
    let summary;
    if (group) {
      const g = Tournament.playerGroup(t);
      const row = Tournament.standings(t, g).find(r => r.entrant === 0);
      summary = `${Tournaments.finishLabel(t)} with ${row.pts} point${row.pts === 1 ? '' : 's'}. Only the top two go through.`;
    } else {
      summary = `Lost to ${last.opponent.name} in the ${Tournament.PHASE_NAMES[t.outAt].toLowerCase()}.`;
    }
    const sum = this._txt(summary, 15, { fontWeight: '700', wordWrap: true, wordWrapWidth: colW, lineHeight: 19 });
    sum.x = x;
    sum.y = y;
    this.layer.addChild(sum);
    y += sum.height + 12;

    // Your games.
    const rowH = 24;
    const room = wide ? P.y + P.h - pad - 34 - y : P.h * 0.45;
    const shown = Math.max(1, Math.min(6, Math.floor(room / rowH)));
    for (const h of hist.slice(-shown)) {
      const tag = h.result === 'win' ? 'W' : h.result === 'draw' ? 'D' : 'L';
      const col = h.result === 'win' ? 0x5fd07a : h.result === 'draw' ? 0xe0c060 : 0xe05a4a;
      const g = new PIXI.Graphics().rect(x, y + 3, 18, 18).fill(col);
      const tt = this._txt(tag, 13, { fontWeight: '900', fill: '#10131c' });
      tt.anchor.set(0.5);
      tt.x = x + 9;
      tt.y = y + 12;
      const label = Tournament.PHASE_NAMES[h.match.phase].replace('Matchday ', 'MD');
      const ln = this._txt(`${label}  ·  ${h.opponent.name}`, 14, { fontWeight: '700' });
      ln.x = x + 28;
      ln.y = y + 3;
      PixiPremiumScene.fit(ln, colW - 30, 0.55);
      this.layer.addChild(g, tt, ln);
      y += rowH;
    }
    const champ = Tournament.championEntrant(t);
    if (champ) {
      const c = this._txt(`${this.wanted ? 'Last one standing' : 'Cup winner'}: ${champ.name}`, 14, { fontWeight: '900', fill: this._hi() });
      c.x = x;
      c.y = y + 8;
      PixiPremiumScene.fit(c, colW, 0.55);
      this.layer.addChild(c);
      y += 34;
    }

    const btnH = PixiPremiumScene.buttonHeight(L.BTN_H);
    const bx = wide ? P.x + P.w / 2 + 10 : x;
    const bw = colW;
    const by = P.y + P.h - pad - btnH;
    if (wide) this._hostBubble(bx, P.y + 28, bw, by - 12 - (P.y + 28));
    else this._hostBubble(x, y + 6, colW, by - 12 - (y + 6));
    this.primary = () => this.enterAgain();
    PixiPremiumScene.button(this.layer, bx, by, bw, L.BTN_H, 'Enter Again', () => this.enterAgain(), { primary: true, icon: 'play', fontSize: 20 });
  },

  _panelChampion(P) {
    const L = this.L;
    const t = this.t;
    this._panelBase(P);
    const wide = P.w > 600;
    const pad = L.PAD;
    const colW = wide ? Math.floor(P.w / 2) - pad - 10 : P.w - pad * 2;
    const x = P.x + pad;
    const cx = x + colW / 2;
    let y = P.y + 26;

    const glow = new PIXI.Graphics().circle(0, 0, 70).fill({ color: 0xf2c230, alpha: 0.16 }).circle(0, 0, 46).fill({ color: 0xf2c230, alpha: 0.14 });
    const art = this._trophyArt(wide ? 90 : 120);
    const trophy = new PIXI.Container();
    trophy.addChild(glow, art);
    trophy.x = cx;
    trophy._baseY = y + (wide ? 60 : 76);
    trophy.y = trophy._baseY;
    this.layer.addChild(trophy);
    this.trophy = trophy;
    y = trophy._baseY + (wide ? 62 : 80);

    const head = this._txt('CHAMPION', 30, { fontFamily: PixiTextStyles.FONT_TITLE, fontWeight: 'bold', fill: this._hi() });
    head.anchor.set(0.5, 0);
    head.x = cx;
    head.y = y;
    this.layer.addChild(head);
    y += head.height + 6;
    const wins = Tournament.playerWins(t);
    const sum = this._txt(`You won ${this.def.name}: ${wins} wins${this.wanted ? ', no one left standing' : ''}.`, 15, {
      fontWeight: '700', wordWrap: true, wordWrapWidth: colW, align: 'center', lineHeight: 19,
    });
    sum.anchor.set(0.5, 0);
    sum.x = cx;
    sum.y = y;
    this.layer.addChild(sum);
    y += sum.height + 6;
    const ev = t.event || {};
    if (ev.event === 'champion' && (ev.coins || ev.stars)) {
      const parts = [];
      if (ev.coins) parts.push(`+${ev.coins} coins`);
      if (ev.stars) parts.push(`+${ev.stars} stars`);
      const pay = this._txt(parts.join('  ·  '), 15, { fontWeight: '900', fill: this._hi() });
      pay.anchor.set(0.5, 0);
      pay.x = cx;
      pay.y = y;
      this.layer.addChild(pay);
      y += 24;
    }

    const btnH = PixiPremiumScene.buttonHeight(L.BTN_H);
    const beaten = this._guardianBeaten();
    const rx = wide ? P.x + P.w / 2 + 10 : x;
    const bw = colW;
    let by = P.y + P.h - pad - btnH;
    const g = this.guardian;
    if (beaten) {
      this.primary = () => this.enterAgain();
      PixiPremiumScene.button(this.layer, rx, by, bw, L.BTN_H, 'Enter Again', () => this.enterAgain(), { primary: true, icon: 'play', fontSize: 20 });
      const note = this._txt(`${g.name} already bowed out. Play again for coins.`, 13, { fontWeight: '800', fill: PixiPremiumScene.alpha(this.wanted ? '#3a2414' : this.cols.text, 'bb') });
      note.anchor.set(0.5, 1);
      note.x = rx + bw / 2;
      note.y = by - 8;
      PixiPremiumScene.fit(note, bw, 0.55);
      this.layer.addChild(note);
      by -= 30;
    } else {
      const small = PixiPremiumScene.buttonHeight(40);
      PixiPremiumScene.button(this.layer, rx, by, bw, L.BTN_H, `Face ${g.name}`, () => this.faceGuardian(), { primary: true, icon: 'play', fontSize: 20 });
      this.primary = () => this.faceGuardian();
      by -= small + 10;
      PixiPremiumScene.button(this.layer, rx, by, bw, 40, 'Enter Again', () => this.enterAgain(), { fontSize: 16 });
    }
    if (wide) this._hostBubble(rx, P.y + 26, bw, by - 12 - (P.y + 26));
    else this._hostBubble(x, y + 6, colW, by - 12 - (y + 6));
  },

  /* ------------------------------------------------------------------ */
  /*  Actions                                                            */
  /* ------------------------------------------------------------------ */

  play() {
    if (this.busy || !this.t || !Tournament.playerMatch(this.t)) return;
    this.busy = true;
    audioManager.playButton();
    gsap.to(this.layer, {
      alpha: 0, duration: 0.25, ease: 'power2.in',
      onComplete: () => { if (!Tournaments.startMatch(this.worldId)) this.busy = false; },
    });
  },

  enterAgain() {
    if (this.busy) return;
    audioManager.playButton();
    this.t = Tournaments.enter(this.worldId);
    this.save = store.getActiveSave();
    store.saveProgress();
    this.view = this._defaultView();
    this._rebuildAll();
    this._playEvent();
  },

  // Starts the guardian fight exactly as the world's path does.
  faceGuardian() {
    const ch = this.guardian;
    if (this.busy || !ch) return;
    this.busy = true;
    audioManager.playButton();
    store.setActiveSave({ selectedCharacter: ch.id, storyLevel: ch.stage });
    store.update({ selectedCharacter: ch.id, mode: 'story' });
    store.set('storyLevel', ch.stage);
    ThemeManager.useStoryTheme(this.world.art);
    store.saveProgress();
    switchScreen('game');
  },

  back() {
    if (this.busy) return;
    // Back to the world's own place map when it has one.
    if (typeof LiveScenes !== 'undefined' && LiveScenes.has('map_' + this.worldId)) switchScreen('worldMissions', { world: this.worldId });
    else switchScreen('worldMap');
  },

  // The header's subtitle changes with the state: rebuild the whole root.
  _rebuildAll() {
    const data = { world: this.worldId };
    this.destroy();
    this.init(data);
  },

  handleKeyDown(e) {
    if (this.busy) return;
    if (e.key === 'Escape') this.back();
    else if (e.key === 'Enter' || e.key === ' ') { if (this.primary) this.primary(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Tab') {
      if (e.preventDefault) e.preventDefault();
      this.toggleView();
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Banners after a game                                               */
  /* ------------------------------------------------------------------ */

  _playEvent() {
    const ev = this.t && this.t.event;
    if (!ev || ev.seen) return;
    Tournaments.markSeen(this.worldId);
    store.saveProgress();
    let text = null, sub = null;
    const next = Tournament.phaseName(this.t);
    if (ev.event === 'intro') { text = this.def.name.toUpperCase(); sub = this.t.attempt > 1 ? `Attempt ${this.t.attempt}: a fresh draw` : '16 players. One winner.'; }
    else if (ev.event === 'champion') { text = 'CHAMPION!'; }
    else if (ev.event === 'out') { text = this.wanted ? 'SHOT DOWN' : this.t.outAt === 'group' ? 'OUT IN THE GROUP' : 'KNOCKED OUT'; }
    else if (ev.event === 'replay') { text = 'A DRAW!'; sub = 'Knockout games are played again'; }
    else if (ev.event === 'advance') { text = ev.phase === 'md3' ? 'THROUGH TO THE KNOCKOUT!' : `ON TO THE ${next.toUpperCase()}!`; }
    else if (ev.event === 'result') { text = ev.result === 'win' ? 'THREE POINTS!' : ev.result === 'draw' ? 'ONE POINT' : 'NO POINTS'; sub = next; }
    if (ev.coins && ev.event !== 'champion') sub = `+${ev.coins} coins`;
    if (!text) return;
    this._banner(text, sub);
    if (ev.event === 'champion') {
      audioManager.playVictory();
      this._confetti();
    } else if (ev.event === 'advance' || (ev.event === 'result' && ev.result === 'win')) {
      audioManager.playSelect();
    }
  },

  _banner(text, sub) {
    const c = new PIXI.Container();
    c.x = Layout.cx;
    c.y = Layout.isPortrait ? 190 : 160;
    const t = PixiPremiumScene.text(text, { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 40, fontWeight: 'bold', fill: this.wanted ? '#f2c230' : this.cols.accent, stroke: { color: '#000000', width: 6 } });
    t.anchor.set(0.5);
    PixiPremiumScene.fit(t, Layout.W - 80, 0.5);
    c.addChild(t);
    if (sub) {
      const s = PixiPremiumScene.text(sub, { fontSize: 20, fontWeight: '800', fill: '#f3ead8', stroke: { color: '#000000', width: 4 } });
      s.anchor.set(0.5, 0);
      s.y = t.height / 2 + 6;
      c.addChild(s);
    }
    c.alpha = 0;
    this.fxLayer.addChild(c);
    gsap.timeline({ onComplete: () => c.destroy({ children: true }) })
      .to(c, { alpha: 1, duration: 0.3, delay: 0.35 })
      .from(c.scale, { x: 1.6, y: 1.6, duration: 0.4, ease: 'back.out(2)' }, '<')
      .to(c, { alpha: 0, duration: 0.5 }, '+=1.6');
  },

  _confetti() {
    const P = this.areas.panel;
    const ox = this.trophy ? this.trophy.x : P.x + P.w / 2;
    const oy = this.trophy ? this.trophy._baseY : P.y + 100;
    const colors = [0xf2c230, 0xffffff, PixiPremiumScene.color(this.cols.accent), 0xff6a8a];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const d = 60 + (i % 5) * 26;
      const p = new PIXI.Graphics().rect(-3, -3, 6, 6).fill(colors[i % colors.length]);
      p.x = ox;
      p.y = oy;
      this.fxLayer.addChild(p);
      gsap.to(p, { x: ox + Math.cos(a) * d, y: oy + Math.sin(a) * d + 40, alpha: 0, rotation: 3, duration: 1.2 + (i % 4) * 0.15, delay: 0.3, ease: 'power2.out', onComplete: () => p.destroy() });
    }
  },
};
