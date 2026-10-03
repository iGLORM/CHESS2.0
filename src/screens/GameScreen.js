const GameScreen = {
  board: null,
  selectedSquare: null,
  legalMoves: [],
  turn: 'white',
  currentPlayer: null,
  opponentPlayer: null,
  gameStatus: 'playing',
  gameOver: false,
  gameResult: null,
  capturedPieces: { white: [], black: [] },
  moveHistory: [],
  boardSnapshots: [],
  reviewingAt: null,
  aiThinking: false,
  mode: '1v1',
  currentCharacter: null,
  characterLevel: 1,
  lastMove: null,
  lockedTiles: [],
  pendingRevertMove: null,
  captureCombo: 0,
  defensiveMiniGames: { white: 2, black: 2 },
  captureRewardProgress: { white: 0, black: 0 },
  comboDisplayTimer: 0,
  promotionPending: null,
  promotionHover: null,
  hoveredSquare: null,
  gameOverTimer: 0,
  hoveredGameOverBtn: null,
  aiColor: 'black',
  gameplayMode: true,

  _lastInitData: null,

  SAVE_KEY: 'chess2_current_game',

  getSavedGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.SAVE_KEY));
      return saved && saved.v === 1 && saved.snapshots && saved.snapshots.length > 1 ? saved : null;
    } catch (e) {
      return null;
    }
  },

  clearSavedGame() {
    try { localStorage.removeItem(this.SAVE_KEY); } catch (e) { /* storage unavailable */ }
  },

  // Keeps the live game in localStorage so it survives closing the app.
  _persistGame() {
    if (this.gameOver || this.reviewingAt !== null) return;
    if (this.moveHistory.length === 0) { this.clearSavedGame(); return; }
    try {
      localStorage.setItem(this.SAVE_KEY, JSON.stringify({
        v: 1,
        mode: this.mode,
        p1IsWhite: this.playerColor === 'white',
        selectedCharacter: this.currentCharacter ? this.currentCharacter.id : null,
        characterLevel: this.characterLevel,
        gameplayMode: this.gameplayMode,
        miniGamesEnabled: !!store.get('miniGamesEnabled'),
        customMinigames: store.get('customMinigames') || {},
        snapshots: this.boardSnapshots.slice(-40),
        powers: this.powers || {},
        bossRule: this.mode === 'greatboard' ? this.bossRule : undefined,
      }));
    } catch (e) { /* storage full or unavailable: resume just won't be offered */ }
  },

  resumeSavedGame() {
    const saved = this.getSavedGame();
    if (!saved) return;
    store.update({
      mode: saved.mode,
      p1IsWhite: saved.p1IsWhite,
      miniGamesEnabled: saved.miniGamesEnabled,
      customGameplayMode: saved.gameplayMode,
      customMinigames: saved.customMinigames,
    });
    if (saved.selectedCharacter) store.set('selectedCharacter', saved.selectedCharacter);
    switchScreen('game', { restore: saved });
  },

  init(data) {
    // Returning from Settings opened via the pause menu: keep the game as it was.
    if (data && data.resume && this.board && !this.gameOver) {
      this._resume();
      return;
    }
    this._lastInitData = data;
    this._aiToken = (this._aiToken || 0) + 1;
    this.board = new Board();
    this.selectedSquare = null;
    this.legalMoves = [];
    this.turn = 'white';
    this.gameStatus = 'playing';
    this.gameOver = false;
    this.gameResult = null;
    this.capturedPieces = { white: [], black: [] };
    this.moveHistory = [];
    this.boardSnapshots = [];
    this.reviewingAt = null;
    this.aiThinking = false;
    this.aiCooldown = 0;
    this.promotionPending = null;
    this.promotionHover = null;
    this.hoveredSquare = null;
    this.gameOverTimer = 0;
    this.hoveredGameOverBtn = null;
    this.lastMove = null;
    this.drawReason = null;
    this.lockedTiles = [];
    this.pendingRevertMove = null;
    this.captureCombo = 0;
    this.defensiveMiniGames = { white: 2, black: 2 };
    this.captureRewardProgress = { white: 0, black: 0 };
    this.comboDisplayTimer = 0;
    const canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.style.pointerEvents = 'auto';

    this.bossRule = null;
    this.bossState = { rewindsUsed: 0, puzzle: 0, challenges: { won: 0, lost: 0 }, misses: 0 };
    this.trial = null;
    this.starResult = null;
    this.reward = null;
    this.hint = null;
    this.removeMode = false;
    this.sealMode = false;
    this.powers = {};
    this.lantern = null;
    this._hintPending = false;
    this._itemMsg = null;
    this._fightStart = null;
    this._introQueue = null;
    this._introDone = null;
    this.bossEvent = false;
    this._fogCache = null;
    this.mode = store.get('mode');
    this.isAIMode = this.mode === 'story' || this.mode === 'classic' || this.mode === 'custom' || this.mode === 'greatboard';
    // Every mode sets its own options so nothing leaks over from the last mode played.
    if (this.mode === 'story' || this.mode === 'greatboard') {
      store.set('p1IsWhite', true);
      // Challenges are part of the story (and the Great Board), whatever the minigame setting says.
      store.set('miniGamesEnabled', true);
    }
    const p1IsWhite = store.get('p1IsWhite') !== false;
    this.playerColor = p1IsWhite ? 'white' : 'black';
    this.aiColor = p1IsWhite ? 'black' : 'white';
    this.flipped = this.isAIMode && this.playerColor === 'black';
    this.gameplayMode = !this.usesRandomChallenges(this.mode);
    if (this.mode === 'story') {
      this.currentCharacter = store.get('selectedCharacter');
      if (typeof this.currentCharacter === 'string') {
        this.currentCharacter = CharacterManager.getCharacter(this.currentCharacter);
      }
      const charLevel = this.currentCharacter ? this.currentCharacter.level : 1;
      const save = store.getActiveSave();
      const tier = save ? save.difficultyTier : 'beginner';
      this.bossRule = this.currentCharacter ? BossRules.get(this.currentCharacter.id) : null;
      const level = DifficultyScaler.getAiLevel(tier, charLevel);
      this.characterLevel = BossRules.aiLevel(this.bossRule, level);
      if (!(data && data.restore)) {
        this.board = BossRules.startBoard(this.bossRule);
        if (this.bossRule && this.bossRule.goal && this.bossRule.goal.mystery) {
          BossRules.hideMystery(this.board, this.aiColor);
          this.bossState.hint = null;
        }
        this._placeBounty();
      }
    } else if (this.mode === 'greatboard') {
      // Four quarters, four guardian rules (src/engine/GreatBoard.js). A restored game
      // brings its own board; otherwise the setup screen's board, or a fresh one.
      this.currentCharacter = null;
      const lvl = store.get('greatBoardLevel');
      this.characterLevel = typeof lvl === 'number' ? lvl : 6;
      this.bossRule = (data && data.restore && data.restore.bossRule) || (data && data.rule) || GreatBoard.make();
      if (!(data && data.restore)) this.board = BossRules.startBoard(this.bossRule);
    } else if (this.mode === 'classic') {
      this.currentCharacter = null;
      this.characterLevel = store.get('classicDifficulty') || 5;
    } else if (this.mode === 'custom') {
      this.currentCharacter = null;
      this.characterLevel = store.get('customDifficulty') || 5;
    } else {
      this.currentCharacter = null;
      this.characterLevel = 0;
    }

    store.update({
      board: this.board,
      turn: 'white',
      gameStatus: 'playing',
      gameOver: false,
      gameResult: null,
      selectedSquare: null,
      legalMoves: [],
      animating: false,
    });

    audioManager.init();
    if (typeof audioManager.setSuspense === 'function') {
      // The final fight plays the tense version of its song from the first move.
      audioManager.setSuspense(!!(this.bossRule && this.bossRule.tenseMusic));
    }
    audioManager.startMusic();
    audioManager.setMatchDuck(true);

    this._initVisuals();

    this._dialogueBubble = null;
    this._initDialogue();
    this.saveSnapshot();

    if (data && data.restore) {
      const saved = data.restore;
      this._lastInitData = null;
      this.characterLevel = saved.characterLevel;
      this.gameplayMode = !this.usesRandomChallenges(saved.mode) && saved.gameplayMode !== false;
      this.boardSnapshots = saved.snapshots;
      this.powers = { ...(saved.powers || {}) };
      this.restoreSnapshot(this.boardSnapshots[this.boardSnapshots.length - 1]);
      store.update({ board: this.board, turn: this.turn, gameStatus: this.gameStatus });
      return;
    }

    // The Great Board opens with its four regions.
    if (this.mode === 'greatboard') {
      this._introQueue = [];
      this._introDone = () => this._startTraining();
      this._showRulesIntro({ kicker: 'GREAT BOARD', title: 'Four Worlds, One Board', lines: this.bossRule.lines, button: 'Play' });
      return;
    }

    // Story fights open with the boss's rule; trainers teach a lesson first.
    if (this.bossRule) {
      const ch = this.currentCharacter;
      const name = ch.name.toUpperCase();
      const lesson = ch.trainer ? ch.lesson || [] : [];
      const tested = ch.trainer || ch.mission || ch.side;   // a pass/fail test rather than a boss fight
      const pages = lesson.map((page, i) => ({
        kicker: `LESSON ${i + 1} / ${lesson.length}  ·  ${name}`,
        title: page.title,
        lines: page.lines,
        portraitId: ch.id,
        button: 'Next',
      }));
      pages.push({
        kicker: ch.side ? (ch.side.kicker || name)
          : ch.mission ? `MISSION ${ch.mission.index + 1} / ${StoryMissions.COUNT}  ·  ${ch.world.name.toUpperCase()}`
          : ch.trainer ? `YOUR TEST  ·  ${name}` : `BOSS RULE  ·  ${name}`,
        title: this.bossRule.title,
        lines: this.bossRule.lines,
        portraitId: ch.trainer ? ch.id : null,
        button: tested ? 'Start' : 'Fight!',
      });
      // The opponent greets you first; after a loss, with a rematch line.
      const record = (store.getActiveSave().record || {})[ch.id] || {};
      const greeting = record.losses && ch.dialogue.rematch ? ch.dialogue.rematch : ch.dialogue.before;
      if (greeting) {
        pages.unshift({ kicker: (ch.title || '').toUpperCase(), title: ch.name, lines: [greeting], portraitId: ch.id, button: 'Continue' });
      }
      this._introQueue = pages.slice(1);
      this._introDone = () => this._startTraining();
      this.introVisible = true;
      this._introButton = null;
      this._walkOn(ch, () => this._showRulesIntro(pages[0]));
      return;
    }

    // First game with Chess 2.0 rules: explain Defenses before anyone moves.
    const settings = store.get('settings') || {};
    if (this.gameplayMode && store.get('miniGamesEnabled') && !settings.seenRulesIntro) {
      this._showRulesIntro();
    }
  },

  // The pre-game card: the Chess 2.0 rules once, or the Boss Rule before a story fight.
  // card: { kicker, title, lines, portraitId?, button? } (omit for the Chess 2.0 rules).
  // Further cards can wait in this._introQueue; this._introDone runs after the last.
  _showRulesIntro(card = null) {
    this.introVisible = true;
    this._introMarksSeen = !card;
    const cols = ThemeManager.getCurrentColors();
    const c = new PIXI.Container();
    c.zIndex = 950;
    const shade = new PIXI.Graphics().rect(0, 0, Layout.W, Layout.H).fill({ color: 0x000000, alpha: 0.66 });
    c.addChild(shade);
    const portraitId = card && card.portraitId;
    const PORTRAIT_W = portraitId ? 190 : 0;   // portrait column (the card art is ~165px wide) plus a gap
    const w = Math.min(660 + PORTRAIT_W, Layout.W - 60);
    const PAD_X = 38, TOP = 34, KICKER_GAP = 34, TITLE_GAP = 62, PARA_GAP = 16, BTN_W = 200, BTN_H = 52, BTN_PAD = 26;
    const paragraphs = card ? card.lines : [
      'Normal chess, with one twist.',
      'When one of your pieces is about to be captured, you can spend a Defense to play a quick mini-game. Win it and the capture is cancelled: your opponent loses their turn.',
      'You start with 2 Defenses and earn 1 more for every 2 captures. A capture that gets a king out of check cannot be blocked.',
    ];
    const textW = w - PAD_X * 2 - PORTRAIT_W;
    const texts = paragraphs.map(para => PixiPremiumScene.text(para, { fontSize: 19, fill: cols.text, lineHeight: 27, wordWrap: true, wordWrapWidth: textW }));
    const kickerH = card && card.kicker ? KICKER_GAP : 0;
    const textH = texts.reduce((sum, t) => sum + t.height + PARA_GAP, 0);
    const h = Math.max(300, TOP + kickerH + TITLE_GAP + textH + BTN_H + BTN_PAD * 2);
    const x = Math.round(Layout.cx - w / 2);
    const y = Math.round(Layout.cy - h / 2);
    PixiPremiumScene.panel(c, x, y, w, h, { alpha: 0.96, accentAlpha: 0.9 });
    if (kickerH) {
      const kicker = PixiPremiumScene.text(card.kicker, { fontSize: 16, fontWeight: '800', fill: cols.text, letterSpacing: 2 });
      kicker.anchor.set(0.5, 0);
      kicker.alpha = 0.75;
      kicker.x = Layout.cx;
      kicker.y = y + TOP;
      c.addChild(kicker);
      this._introKicker = kicker;
    }
    const title = PixiPremiumScene.text(card ? card.title.toUpperCase() : 'CHESS 2.0 RULES', { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 30, fontWeight: 'bold', fill: cols.accent });
    title.anchor.set(0.5, 0);
    title.x = Layout.cx;
    title.y = y + TOP + kickerH;
    c.addChild(title);
    if (portraitId) {
      // The opponent's portrait beside the text; a trainer's hologram bobs and flickers.
      // Characters with live art show it (whole-pixel scale); the rest their painted card.
      const live = typeof LiveScenes !== 'undefined' && LiveScenes.character(portraitId);
      const isHolo = !live && typeof TRAINERS !== 'undefined' && TRAINERS.some(t => t.id === portraitId);
      const holo = live ? LiveScenes.sprite(live) : new PIXI.Sprite(PixiPremiumAssets.characterCard(portraitId));
      const hh = live ? LiveScenes.get(live).height * Math.floor(Math.min(h - TOP * 2, 240) / LiveScenes.get(live).height) : Math.min(h - TOP * 2, 200);
      holo.height = hh;
      holo.width = live ? Math.round(hh * LiveScenes.get(live).width / LiveScenes.get(live).height) : Math.round(hh * 238 / 292);
      holo.x = x + PAD_X - 6;
      holo.y = y + Math.round((h - hh) / 2) - 10;
      c.addChild(holo);
      if (isHolo) {
        gsap.to(holo, { y: holo.y - 6, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        gsap.to(holo, { alpha: 0.72, duration: 0.07, yoyo: true, repeat: -1, repeatDelay: 1.8 });
      }
      title.x = x + PAD_X + PORTRAIT_W + textW / 2;
      if (c.children.includes(this._introKicker)) this._introKicker.x = title.x;
    }
    let ty = y + TOP + kickerH + TITLE_GAP;
    for (const t of texts) {
      t.x = x + PAD_X + PORTRAIT_W;
      t.y = ty;
      c.addChild(t);
      ty += t.height + PARA_GAP;
    }
    const bx = Math.round(Layout.cx - BTN_W / 2), by = y + h - BTN_H - BTN_PAD;
    const btn = PixiPremiumScene.button(c, bx, by, BTN_W, BTN_H, card ? (card.button || 'Fight!') : "Let's play", () => this._dismissRulesIntro(), { primary: true, fontSize: 20 });
    // Clicks arrive via the Canvas 2D layer, so mirror the button's real (scaled) size.
    this._introButton = { x: bx, y: by, w: btn.hitArea.width, h: btn.hitArea.height };
    PixiApp.stage.addChild(c);
    PixiApp.stage.sortableChildren = true;
    this._introContainer = c;
  },

  // The opponent walks onto the board before the fight (trainers flicker in
  // as holograms), then the intro cards follow.
  _walkOn(ch, done) {
    this._walkingOn = true;
    const c = new PIXI.Container();
    c.zIndex = 940;
    PixiApp.stage.addChild(c);
    PixiApp.stage.sortableChildren = true;
    this._walkOnContainer = c;
    const B = PixiBoardRenderer;
    const sq = B.squareSize;
    const cx = B.boardOffsetX + sq * 4, floor = B.boardOffsetY + sq * 4.6;
    const cols = ThemeManager.getCurrentColors();
    const shade = new PIXI.Graphics().rect(0, 0, Layout.W, Layout.H).fill({ color: 0x000000, alpha: 0.35 });
    shade.alpha = 0;
    const shadow = new PIXI.Graphics().ellipse(0, 0, sq * 0.8, sq * 0.2).fill({ color: 0x000000, alpha: 0.45 });
    shadow.x = cx;
    shadow.y = floor;
    c.addChild(shade, shadow);
    let actor;
    const tl = gsap.timeline({ onComplete: () => this._endWalkOn(done) });
    this._walkOnTimeline = tl;
    tl.to(shade, { alpha: 1, duration: 0.3 });

    if (ch.trainer) {
      // The trainer's hologram figure (scripts/generate_trainer_art.js), no card frame.
      const img = TextureManager.getCharacterTexture(ch.id);
      actor = new PIXI.Sprite(img ? PIXI.Texture.from({ resource: img, scaleMode: 'nearest' }) : PixiPremiumAssets.character(ch.id));
      actor.anchor.set(0.5, 0.9);   // the projector disc, not the image edge, stands on the floor
      actor.height = sq * 3.4;
      actor.width = actor.height;
      actor.x = cx;
      actor.y = floor;
      actor.alpha = 0;
      c.addChild(actor);
      // Materialise: a few stuttering flickers, then steady.
      [0.6, 0.1, 0.8, 0.3, 1].forEach((a, i) => tl.to(actor, { alpha: a, duration: 0.07 }, 0.3 + i * 0.09));
      tl.from(actor.scale, { y: actor.scale.y * 0.05, duration: 0.35, ease: 'power2.out' }, 0.3);
      tl.add(() => audioManager.playMiniGameStart(), 0.3);
    } else {
      // The opponent itself (its live figure, backdrop cut away); a piece if it has none.
      const live = typeof LiveScenes !== 'undefined' && LiveScenes.character(ch.id);
      const figure = live && LiveScenes.cutout(live);
      if (figure) {
        const def = LiveScenes.get(live);
        figure.anchor.set(0.5, 1);
        figure.height = def.height * Math.max(2, Math.round(sq * 3.2 / def.height));
        figure.width = figure.height * def.width / def.height;
        actor = figure;
      } else {
        actor = PixiPieceRenderer.createSprite(store.get('theme'), this.aiColor, STORY_PIECES[ch.id] || ch.piece || 'king');
        actor.anchor.set(0.5, 1);
        actor.width = actor.height = sq * 2.2;
      }
      actor.x = Layout.W + sq * 2;
      actor.y = floor;
      shadow.x = actor.x;
      c.addChild(actor);
      // Hops across from the right edge to the middle of the board.
      const hops = 6;
      const startX = actor.x;
      for (let i = 1; i <= hops; i++) {
        const t = { v: 0 };
        const x0 = startX + (cx - startX) * (i - 1) / hops, x1 = startX + (cx - startX) * i / hops;
        tl.to(t, {
          v: 1, duration: 0.2, ease: 'none',
          onUpdate: () => {
            actor.x = shadow.x = x0 + (x1 - x0) * t.v;
            actor.y = floor - Math.sin(Math.PI * t.v) * sq * 0.45;
            actor.rotation = Math.sin(Math.PI * 2 * t.v) * 0.06;
          },
          onComplete: () => audioManager.playMove(STORY_PIECES[ch.id] || ch.piece),
        });
      }
      tl.add(() => {
        actor.rotation = 0;
        for (let i = 0; i < 12; i++) {
          const dust = new PIXI.Graphics().rect(-3, -3, 6, 6).fill({ color: 0xe8dcc8, alpha: 0.8 });
          dust.x = cx;
          dust.y = floor;
          c.addChild(dust);
          const a = Math.PI + (i / 11) * Math.PI;
          gsap.to(dust, { x: cx + Math.cos(a) * sq * 1.2, y: floor + Math.sin(a) * sq * 0.3, alpha: 0, duration: 0.5, ease: 'power2.out' });
        }
        this._shakeStage(6);
      });
      tl.fromTo(actor.scale, { y: actor.scale.y * 0.8 }, { y: actor.scale.y, duration: 0.3, ease: 'back.out(3)' });
    }

    const nameText = PixiPremiumScene.text(ch.name.toUpperCase(), {
      fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 40, fontWeight: 'bold', fill: cols.accent, stroke: { color: '#000000', width: 6 },
    });
    nameText.anchor.set(0.5, 0);
    nameText.x = cx;
    nameText.y = floor + 16;
    nameText.alpha = 0;
    const titleText = PixiPremiumScene.text(ch.title || '', { fontSize: 20, fontWeight: '800', fill: cols.text, stroke: { color: '#000000', width: 4 } });
    titleText.anchor.set(0.5, 0);
    titleText.x = cx;
    titleText.y = nameText.y + 52;
    titleText.alpha = 0;
    c.addChild(nameText, titleText);
    tl.to(nameText, { alpha: 1, duration: 0.25 })
      .from(nameText.scale, { x: 1.8, y: 1.8, duration: 0.3, ease: 'back.out(2)' }, '<')
      .to(titleText, { alpha: 1, duration: 0.3 }, '-=0.1')
      .to({}, { duration: 1.0 })
      .to(c, { alpha: 0, duration: 0.35 });
  },

  _endWalkOn(done) {
    if (!this._walkingOn) return;
    this._walkingOn = false;
    if (this._walkOnTimeline) { this._walkOnTimeline.kill(); this._walkOnTimeline = null; }
    if (this._walkOnContainer) {
      const all = [];
      const walk = node => { all.push(node, node.scale); (node.children || []).forEach(walk); };
      walk(this._walkOnContainer);
      all.forEach(o => gsap.killTweensOf(o));
      this._walkOnContainer.destroy({ children: true });
      this._walkOnContainer = null;
    }
    if (done) done();
  },

  _shakeStage(strength) {
    if (typeof Graphics !== 'undefined' && !Graphics.shake()) return;
    const st = PixiApp.stage;
    const t = { v: 0 };
    gsap.to(t, {
      v: 1, duration: 0.3,
      onUpdate: () => { st.x = (Math.random() - 0.5) * strength * (1 - t.v); st.y = (Math.random() - 0.5) * strength * (1 - t.v); },
      onComplete: () => { st.x = 0; st.y = 0; },
    });
  },

  _dismissRulesIntro() {
    if (this._walkingOn) {
      // Skipping the walk-on goes straight to the first card.
      if (this._walkOnTimeline) this._walkOnTimeline.progress(1);
      return;
    }
    if (!this.introVisible) return;
    this.introVisible = false;
    if (this._introContainer) {
      // Stop the hologram's bob/flicker (and any button tweens) before destroying.
      const all = [];
      const walk = node => { all.push(node, node.scale); (node.children || []).forEach(walk); };
      walk(this._introContainer);
      all.forEach(o => gsap.killTweensOf(o));   // an array of mixed targets is not matched
      this._introContainer.destroy({ children: true });
      this._introContainer = null;
    }
    if (this._introQueue && this._introQueue.length) {
      this._showRulesIntro(this._introQueue.shift());
      return;
    }
    if (this._introDone) {
      const done = this._introDone;
      this._introDone = null;
      done();
    }
    if (this._introMarksSeen) {
      store.set('settings', { ...(store.get('settings') || {}), seenRulesIntro: true });
      store.saveProgress();
    }
    this.aiCooldown = 400;
  },

  _initVisuals() {
    if (typeof PixiGameScreen !== 'undefined') {
      PixiGameScreen.init();
      PixiBoardRenderer.flipped = !!this.flipped;
      PixiGameScreen.renderBoard(this.board, store.get('theme') || 'chess20');
    }
    if (typeof PixiGameHud !== 'undefined') {
      PixiGameHud.init();
    }
    if (typeof PixiGameOverOverlay !== 'undefined') {
      PixiGameOverOverlay.init(this);
    }
    if (typeof PixiBossFX !== 'undefined' && this.bossRule) {
      PixiBossFX.init(this);
    }
  },

  _initDialogue() {
    if (this.mode === 'story' && this.currentCharacter && typeof DialogueManager !== 'undefined') {
      DialogueManager.init(this.currentCharacter, (text, character, category) => {
        this._setCharacterMood(character, category);
        this._showDialogueBubble(text, character);
      });
    }
  },

  _resume() {
    this._aiToken = (this._aiToken || 0) + 1;
    this.aiThinking = false;
    this.aiCooldown = 400;
    this.selectedSquare = null;
    this.legalMoves = [];
    const canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.style.pointerEvents = 'auto';
    audioManager.init();
    audioManager.startMusic();
    audioManager.setMatchDuck(true);
    this._initVisuals();
    this._dialogueBubble = null;
    this._initDialogue();
  },

  destroy() {
    this._aiToken = (this._aiToken || 0) + 1;
    this.introVisible = false;
    this._endWalkOn(null);
    if (this._introContainer) { this._introContainer.destroy({ children: true }); this._introContainer = null; }
    if (this._aiTimeout) {
      clearTimeout(this._aiTimeout);
      this._aiTimeout = null;
    }
    audioManager.stopMusic();
    audioManager.setMatchDuck(false);
    if (typeof audioManager.setSuspense === 'function') {
      audioManager.setSuspense(false);
    }
    // Menus don't start music themselves: bring the theme song back after a pause.
    audioManager.resumeMusicLater();
    if (typeof PixiBossFX !== 'undefined') PixiBossFX.destroy();
    if (typeof PixiGameScreen !== 'undefined') {
      PixiGameScreen.destroy();
    }
    if (typeof PixiGameHud !== 'undefined') {
      PixiGameHud.destroy();
    }
    if (typeof PixiGameOverOverlay !== 'undefined') {
      PixiGameOverOverlay.destroy();
    }
    this.bossEvent = false;
    this.trial = null;
    if (typeof DialogueManager !== 'undefined') {
      DialogueManager.destroy();
    }
    if (this._dialogueBubble) {
      this._dialogueBubble.dismiss();
      this._dialogueBubble = null;
    }
    const canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.style.pointerEvents = 'auto';
  },

  rebuildVisuals() {
    // Tear down only the visual layer (PixiJS components), preserve all game state
    if (typeof PixiBossFX !== 'undefined') PixiBossFX.destroy();
    if (typeof PixiGameScreen !== 'undefined') {
      PixiGameScreen.destroy();
    }
    if (typeof PixiGameHud !== 'undefined') {
      PixiGameHud.destroy();
    }
    if (typeof PixiGameOverOverlay !== 'undefined') {
      PixiGameOverOverlay.destroy();
    }

    this._initVisuals();
  },

  saveSnapshot() {
    const snap = {
      grid: this.board.grid.map(row => row.map(cell => cell ? { ...cell } : null)),   // keeps story tags (mystery piece)
      turn: this.turn,
      castlingRights: JSON.parse(JSON.stringify(this.board.castlingRights)),
      enPassantTarget: this.board.enPassantTarget ? { ...this.board.enPassantTarget } : null,
      halfMoveClock: this.board.halfMoveClock,
      fullMoveNumber: this.board.fullMoveNumber,
      positionHistory: [...this.board.positionHistory],
      moveHistory: this.moveHistory.map(m => ({ ...m, from: { ...m.from }, to: { ...m.to }, piece: m.piece ? { ...m.piece } : null, captured: m.captured ? { ...m.captured } : null })),
      capturedPieces: JSON.parse(JSON.stringify(this.capturedPieces)),
      gameStatus: this.gameStatus,
      gameOver: this.gameOver,
      gameResult: this.gameResult,
      selectedSquare: this.selectedSquare ? { ...this.selectedSquare } : null,
      legalMoves: this.legalMoves.map(m => ({ ...m })),
      lastMove: this.lastMove ? { from: { ...this.lastMove.from }, to: { ...this.lastMove.to } } : null,
      lockedTiles: this.lockedTiles.map(t => ({ ...t })),
      defensiveMiniGames: { ...this.defensiveMiniGames },
      captureRewardProgress: { ...this.captureRewardProgress },
      gameplayMode: this.gameplayMode,
      inCheck: this.board.inCheck,
      bossState: { ...this.bossState },
    };
    // Keep only last 200 snapshots
    if (this.boardSnapshots.length > 200) this.boardSnapshots.shift();
    this.boardSnapshots.push(snap);
    this._persistGame();
  },

  restoreSnapshot(snap) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        this.board.grid[r][c] = snap.grid[r][c] ? { ...snap.grid[r][c] } : null;
      }
    }
    this.board.castlingRights = snap.castlingRights;
    this.board.enPassantTarget = snap.enPassantTarget;
    this.board.halfMoveClock = snap.halfMoveClock;
    this.board.fullMoveNumber = snap.fullMoveNumber || this.board.fullMoveNumber;
    if (snap.positionHistory) this.board.positionHistory = [...snap.positionHistory];
    this.board.inCheck = snap.inCheck;
    this.board.turn = snap.turn;
    this.turn = snap.turn;
    this.moveHistory = snap.moveHistory.map(m => ({ ...m }));
    this.capturedPieces = JSON.parse(JSON.stringify(snap.capturedPieces));
    this.gameStatus = snap.gameStatus;
    this.gameOver = snap.gameOver;
    this.gameResult = snap.gameResult;
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = snap.lastMove;
    this.lockedTiles = snap.lockedTiles.map(t => ({ ...t }));
    this.defensiveMiniGames = { ...(snap.defensiveMiniGames || { white: 2, black: 2 }) };
    this.captureRewardProgress = { ...(snap.captureRewardProgress || { white: 0, black: 0 }) };
    this.gameplayMode = !this.usesRandomChallenges(this.mode) && snap.gameplayMode !== false;
    this.bossState = { ...(snap.bossState || { rewindsUsed: 0 }) };
  },

  goToMove(index) {
    if (index < 0 || index >= this.boardSnapshots.length) return;
    this.restoreSnapshot(this.boardSnapshots[index]);
    this.reviewingAt = index;
  },

  goToLive() {
    if (this.reviewingAt === null) return;
    const last = this.boardSnapshots[this.boardSnapshots.length - 1];
    if (last) {
      this.restoreSnapshot(last);
      this.aiThinking = false;
    }
    this.reviewingAt = null;
  },

  stepBack() {
    if (this.boardSnapshots.length < 2 || this.reviewingAt === 0) return;
    const idx = this.reviewingAt === null ? this.boardSnapshots.length - 2 : this.reviewingAt - 1;
    this.goToMove(Math.max(0, idx));
  },

  stepForward() {
    if (this.reviewingAt === null) return;
    if (this.reviewingAt < this.boardSnapshots.length - 2) this.goToMove(this.reviewingAt + 1);
    else this.goToLive();
  },

  // Snapshot to return to on Undo: against the AI, the last position where it
  // was the player's turn; in local 1v1, simply the previous position.
  _undoTargetIndex() {
    const last = this.boardSnapshots.length - 1;
    if (last < 1) return -1;
    if (!this.isAIMode) return last - 1;
    const rewinds = this.bossState.rewindsUsed || 0;
    for (let i = last - 1; i >= 0; i--) {
      // Undo cannot reach back past one of Grandmaster X's rewinds.
      if (((this.boardSnapshots[i].bossState || {}).rewindsUsed || 0) < rewinds) return -1;
      if (this.boardSnapshots[i].turn === this.playerColor) return i;
    }
    return -1;
  },

  // In Story Mode an undo is a Rewind bought in the Shop; everywhere else it is free.
  canUndo() {
    if (this.mode === 'story' && !this.canUseItem('rewind', true)) return false;
    return this._canRewind();
  },

  // Whether there is a move to take back now (whatever pays for it).
  _canRewind() {
    return !this.gameOver && !this.bossEvent && this.reviewingAt === null && !this.promotionPending &&
      !store.get('miniGameActive') && this._undoTargetIndex() !== -1;
  },

  // free: the Stopped Hourglass pays instead of a Rewind.
  undo(free = false) {
    if (free ? !this._canRewind() : !this.canUndo()) return;
    if (this.mode === 'story' && !free && !Wallet.use('rewind')) return;
    this.hint = null;
    this.removeMode = false;
    this.sealMode = false;
    this.lantern = null;
    const idx = this._undoTargetIndex();
    this._aiToken = (this._aiToken || 0) + 1;
    if (this._aiTimeout) { clearTimeout(this._aiTimeout); this._aiTimeout = null; }
    this.aiThinking = false;
    this.aiCooldown = 400;
    this.restoreSnapshot(this.boardSnapshots[idx]);
    this.boardSnapshots.length = idx + 1;
    this._persistGame();
    this.selectedSquare = null;
    this.legalMoves = [];
    this.pendingRevertMove = null;
    store.update({ board: this.board, turn: this.turn, gameStatus: this.gameStatus });
    audioManager.playSelect();
  },

  /* ------------------------------------------------------------------ */
  /*  Story items (bought with stars in the Shop, see src/state/Wallet.js) */
  /* ------------------------------------------------------------------ */

  // Items work in story fights against a real opponent: not in the Training Camp,
  // puzzle drills or challenge trials.
  itemsAvailable() {
    const ch = this.currentCharacter, rule = this.bossRule || {};
    return typeof Wallet !== 'undefined' && this.mode === 'story' && !!ch && !ch.trainer && !rule.puzzles && !rule.minigameTrial;
  },

  // Whether an item can be used now. `rules` skips the turn checks (Undo checks its own).
  canUseItem(id, rules = false) {
    if (!this.itemsAvailable() || Wallet.count(id) <= 0) return false;
    if (rules) return true;
    if (this.gameOver || this.bossEvent || this.reviewingAt !== null || this.promotionPending || this.trial) return false;
    if (store.get('miniGameActive') || this.aiThinking || this.turn !== this.playerColor) return false;
    if (id === 'rewind') return this.canUndo();
    if (id === 'hint') return !this._hintPending && !(this.hint && this.hint.at === this.moveHistory.length);
    if (id === 'remove') {
      const goal = (this.bossRule && this.bossRule.goal) || {};
      return !goal.mystery && !goal.captureAll && this._removable().length > 0;
    }
    return false;
  },

  useItem(id) {
    if (!this.canUseItem(id)) {
      if (this.itemsAvailable() && Wallet.count(id) <= 0) this._shopHint();
      else if (audioManager.playTileLock) audioManager.playTileLock();
      return;
    }
    if (id === 'rewind') this.undo();
    else if (id === 'hint') this._useHint();
    else if (id === 'remove') {
      this.removeMode = !this.removeMode;
      this.sealMode = false;
      this.selectedSquare = null;
      this.legalMoves = [];
      audioManager.playSelect();
    }
  },

  // A short note in the status bar (none left: buy more in the Shop).
  _shopHint() {
    this._itemMsg = { text: 'None left: buy more in the Shop (on the world map)', until: performance.now() + 2600 };
    if (audioManager.playTileLock) audioManager.playTileLock();
  },

  itemMessage() {
    if (this.removeMode) return 'Click an enemy piece to remove it';
    if (this.sealMode) return 'Click one of your pieces to seal it';
    if (this._hintPending) return 'Finding a good move...';
    return this._itemMsg && performance.now() < this._itemMsg.until ? this._itemMsg.text : null;
  },

  // Enemy pieces that can be lifted off: not the king or queen, not a wall, and not
  // one whose removal would leave his king in check on your move.
  _removable() {
    const out = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board.grid[r][c];
        if (!p || p.color !== this.aiColor || p.type === 'king' || p.type === 'queen' || p.type === 'wall') continue;
        const test = this.board.clone();
        test.grid[r][c] = null;
        const k = test.findKing(this.aiColor);
        if (k && MoveGen.isSquareAttacked(test, k.row, k.col, this.playerColor)) continue;
        out.push({ row: r, col: c });
      }
    }
    return out;
  },

  _removePiece(row, col) {
    if (!this._removable().some(s => s.row === row && s.col === col)) return false;
    if (!Wallet.use('remove')) return false;
    const piece = this.board.grid[row][col];
    this.board.grid[row][col] = null;
    this.capturedPieces[this.playerColor].push({ ...piece });
    this.removeMode = false;
    this.hint = null;
    this._fogCache = null;
    if (typeof PixiParticleFX !== 'undefined' && PixiParticleFX.spawnCaptureExplosion) {
      const c = PixiBoardRenderer.squareCenter(row, col);
      PixiParticleFX.spawnCaptureExplosion(c.x, c.y, 0xffd24a, piece.type);
    }
    audioManager.playCapture();
    store.update({ board: this.board });
    this._persistGame();
    return true;
  },

  // The engine's move for you, marked on the board until you move.
  _useHint() {
    if (!Wallet.use('hint')) return;
    this._hintPending = true;
    const at = this.moveHistory.length;
    const legal = GameRules.getLegalMoves(this.board, this.playerColor).filter(m => !this._isLockedSquare(m.to.row, m.to.col));
    const done = (move) => {
      this._hintPending = false;
      if (this.moveHistory.length !== at || this.gameOver) { Wallet.give('hint', 1); return; }
      if (!move) { Wallet.give('hint', 1); return; }
      this.hint = { from: { ...move.from }, to: { ...move.to }, at };
      audioManager.playSelect();
    };
    const walls = this.board.grid.some(r => r.some(p => p && p.type === 'wall'));
    if (!legal.length) { done(null); return; }
    if (walls && AIController._wallsHideCheck(this.board, this.playerColor)) { done(AIController._fallbackMove(legal)); return; }
    const restricted = walls || legal.length < GameRules.getLegalMoves(this.board, this.playerColor).length;
    const searchmoves = restricted ? legal.map(m => BotPersonality.moveToUci(m)) : null;
    BotPersonality.bestMove(FEN.fromBoard(this.board, this.playerColor), { skill: 20, depth: 12, searchmoves })
      .then(uci => done(BotPersonality._uciToMove(uci, legal) || null))
      .catch(() => done(null));
  },

  // Hint squares and removable pieces, drawn over the board.
  _drawItemMarks() {
    const board = typeof PixiBoardRenderer !== 'undefined' && PixiBoardRenderer.container;
    if (!board) return;
    if (!this._itemG || this._itemG.destroyed || this._itemG.parent !== board) {
      this._itemG = new PIXI.Graphics();
      this._itemG.eventMode = 'none';
      board.addChild(this._itemG);
    }
    const g = this._itemG.clear();
    const sq = PixiBoardRenderer.squareSize;
    const pulse = 0.55 + 0.35 * Math.sin(performance.now() / 180);
    if (this.hint && this.hint.at === this.moveHistory.length && !this.gameOver) {
      for (const s of [this.hint.from, this.hint.to]) {
        const x = PixiBoardRenderer.squareX(s.col), y = PixiBoardRenderer.squareY(s.row);
        g.rect(x + 3, y + 3, sq - 6, sq - 6).fill({ color: 0x5dff8a, alpha: 0.28 * pulse });
        g.rect(x + 4, y + 4, sq - 8, sq - 8).stroke({ color: 0x5dff8a, width: 6, alpha: 0.5 + 0.5 * pulse });
        g.rect(x + 10, y + 10, sq - 20, sq - 20).stroke({ color: 0xeafff0, width: 2, alpha: 0.6 * pulse });
      }
    }
    if (this.removeMode && !this.gameOver) {
      for (const s of this._removable()) {
        const x = PixiBoardRenderer.squareX(s.col), y = PixiBoardRenderer.squareY(s.row);
        g.rect(x + 3, y + 3, sq - 6, sq - 6).stroke({ color: 0xff6a5a, width: 3, alpha: pulse });
        g.rect(x + 3, y + 3, sq - 6, sq - 6).fill({ color: 0xff6a5a, alpha: 0.14 });
      }
    }
    // The Mist Lantern: every square he attacks gets a pale-green ember, your pieces
    // in danger a ring.
    if (this.lanternLit()) {
      for (const s of this.lantern.attacked) {
        const x0 = PixiBoardRenderer.squareX(s.col), y0 = PixiBoardRenderer.squareY(s.row), x = x0 + sq / 2, y = y0 + sq / 2;
        g.rect(x0 + 2, y0 + 2, sq - 4, sq - 4).fill({ color: 0x3adcb4, alpha: 0.16 + 0.1 * pulse });
        g.rect(x - 7, y - 7, 14, 14).fill({ color: 0x70f0d0, alpha: 0.55 * pulse + 0.25 });
        g.rect(x - 3, y - 3, 6, 6).fill({ color: 0xe8fff8, alpha: 0.95 });
      }
      for (const s of this.lantern.threatened) {
        const x = PixiBoardRenderer.squareX(s.col), y = PixiBoardRenderer.squareY(s.row);
        g.rect(x + 3, y + 3, sq - 6, sq - 6).stroke({ color: 0xff5a5a, width: 4, alpha: 0.5 + 0.5 * pulse });
      }
    }
    // Seal mode: your pieces that can be sealed; sealed squares: a red wax seal.
    if (this.sealMode && !this.gameOver) {
      for (const s of this._sealable()) {
        const x = PixiBoardRenderer.squareX(s.col), y = PixiBoardRenderer.squareY(s.row);
        g.rect(x + 3, y + 3, sq - 6, sq - 6).stroke({ color: 0xff6a5a, width: 3, alpha: pulse }).fill({ color: 0xff6a5a, alpha: 0.12 });
      }
    }
    for (const t of this.lockedTiles) {
      if (!t.seal) continue;
      const x = PixiBoardRenderer.squareX(t.col), y = PixiBoardRenderer.squareY(t.row), cx = x + sq - 16, cy = y + 16;
      g.rect(x + 2, y + 2, sq - 4, sq - 4).stroke({ color: 0xd8322a, width: 3, alpha: 0.85 });
      // Red wax stamped with an X, as the Broken Seal was.
      g.circle(cx, cy, 11).fill(0x5a0a14).circle(cx, cy - 1, 9).fill(0xc8262e).circle(cx - 3, cy - 4, 3).fill(0xff7a6a);
      for (let k = -3; k <= 3; k++) g.rect(cx + k - 1, cy + k - 2, 2, 2).fill(0x5a0a14).rect(cx - k - 1, cy + k - 2, 2, 2).fill(0x5a0a14);
    }
    this._drawBounty(board, sq);
  },

  // The Wanted Poster's mark over the wanted piece, with the bounty below it.
  _drawBounty(board, sq) {
    let at = !this.gameOver && this.bountySquare();
    const hidden = at && this._hiddenSquares();
    if (hidden && hidden[at.row][at.col]) at = null;          // no giving it away in the fog
    if (!at || typeof PixiKeepsake === 'undefined') {
      if (this._bountyMark && !this._bountyMark.destroyed) this._bountyMark.visible = false;
      return;
    }
    if (!this._bountyMark || this._bountyMark.destroyed || this._bountyMark.parent !== board) {
      const c = new PIXI.Container();
      const icon = PixiKeepsake.icon('poster', 26);
      const tag = new PIXI.Text({ text: `+${this.BOUNTY}`, style: { fontFamily: PixiTextStyles.FONT_TITLE, fontSize: 11, fill: '#ffd24a', stroke: { color: '#1a1024', width: 4 } } });
      tag.anchor.set(0.5, 0);
      tag.y = 12;
      c.addChild(icon, tag);
      c.eventMode = 'none';
      board.addChild(c);
      this._bountyMark = c;
    }
    const m = this._bountyMark;
    m.visible = true;
    m.x = PixiBoardRenderer.squareX(at.col) + 15;
    m.y = PixiBoardRenderer.squareY(at.row) + 15 + Math.sin(performance.now() / 260) * 2;
  },

  /* ------------------------------------------------------------------ */
  /*  Keepsake powers (src/characters/keepsakes.js), in story fights      */
  /* ------------------------------------------------------------------ */

  // Once per fight each: the Stopped Hourglass (a free rewind), the Mist Lantern (his
  // threats shown and the fog gone for your turn), the Broken Seal (one of your pieces
  // cannot be taken for three of his turns). The Wanted Poster puts a bounty on one of
  // his pieces. `powers` records what was used (kept outside the snapshots, so an undo
  // never gives a power back).
  KEEPSAKE_POWERS: ['hourglass', 'lantern', 'seal'],
  BOUNTY: 25,

  hasKeepsake(id) {
    return this.itemsAvailable() && typeof Keepsakes !== 'undefined' && Keepsakes.has(id);
  },

  powerUsed(id) {
    return !!(this.powers && this.powers[id]);
  },

  canUsePower(id) {
    if (!this.hasKeepsake(id) || this.powerUsed(id)) return false;
    if (this.gameOver || this.bossEvent || this.reviewingAt !== null || this.promotionPending || this.trial) return false;
    if (store.get('miniGameActive') || this.aiThinking || this.turn !== this.playerColor) return false;
    if (id === 'hourglass') return this._canRewind();
    if (id === 'seal') return this._sealable().length > 0;
    return true;
  },

  usePower(id) {
    if (id === 'seal' && this.sealMode) { this.sealMode = false; audioManager.playSelect(); return; }
    if (!this.canUsePower(id)) {
      if (this.powerUsed(id)) this._itemMsg = { text: 'Used already: once per fight', until: performance.now() + 2200 };
      if (audioManager.playTileLock) audioManager.playTileLock();
      return;
    }
    if (id === 'hourglass') {
      this.powers = { ...this.powers, hourglass: true };
      this.undo(true);
      this._itemMsg = { text: 'The sand stops for you. Your move again.', until: performance.now() + 2600 };
      this._persistGame();
    } else if (id === 'lantern') {
      this.powers = { ...this.powers, lantern: true };
      this.lantern = { at: this.moveHistory.length, ...this._threats() };
      this._fogCache = null;
      this._itemMsg = { text: 'The lantern shows what he hides', until: performance.now() + 2600 };
      if (audioManager.playPromotion) audioManager.playPromotion();
      this._persistGame();
    } else if (id === 'seal') {
      this.sealMode = true;
      this.removeMode = false;
      this.selectedSquare = null;
      this.legalMoves = [];
      audioManager.playSelect();
    }
  },

  // Whether the lantern is lit (your turn after using it).
  lanternLit() {
    return !!this.lantern && this.lantern.at === this.moveHistory.length && !this.gameOver;
  },

  // Squares his pieces attack, and your pieces standing on them.
  _threats() {
    const attacked = [], threatened = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (!MoveGen.isSquareAttacked(this.board, r, c, this.aiColor)) continue;
      attacked.push({ row: r, col: c });
      const p = this.board.grid[r][c];
      if (p && p.color === this.playerColor) threatened.push({ row: r, col: c });
    }
    return { attacked, threatened };
  },

  // Your pieces the seal can hold (not the king).
  _sealable() {
    const out = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = this.board.grid[r][c];
      if (p && p.color === this.playerColor && p.type !== 'king' && !this._isLockedSquare(r, c)) out.push({ row: r, col: c });
    }
    return out;
  },

  // Seals a piece: he cannot move onto (take) its square for three of his turns.
  _sealPiece(row, col) {
    if (!this._sealable().some(s => s.row === row && s.col === col)) return false;
    this.sealMode = false;
    this.powers = { ...this.powers, seal: true };
    this.lockedTiles.push({ row, col, until: this.moveHistory.length + 6, seal: true });
    if (typeof PixiParticleFX !== 'undefined' && PixiParticleFX.spawnCaptureExplosion) {
      const c = PixiBoardRenderer.squareCenter(row, col);
      PixiParticleFX.spawnCaptureExplosion(c.x, c.y, 0xff6a5a, 'pawn');
    }
    audioManager.playTileLock();
    this._itemMsg = { text: 'Sealed: he cannot take it for 3 turns', until: performance.now() + 2600 };
    store.update({ board: this.board });
    this._persistGame();
    return true;
  },

  // The Wanted Poster: one of his minor pieces or rooks carries a bounty (a story tag
  // that moves with the piece, like the Mystery Piece).
  _placeBounty() {
    if (!this.hasKeepsake('poster') || (this.bossRule && this.bossRule.goal && (this.bossRule.goal.mystery || this.bossRule.goal.captureAll))) return;
    const pool = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = this.board.grid[r][c];
      if (p && p.color === this.aiColor && ['knight', 'bishop', 'rook'].includes(p.type)) pool.push(p);
    }
    if (pool.length) pool[Math.floor(Math.random() * pool.length)].wanted = true;
  },

  // Where the wanted piece stands, or null.
  bountySquare() {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = this.board.grid[r][c];
      if (p && p.wanted && p.color === this.aiColor) return { row: r, col: c, type: p.type };
    }
    return null;
  },

  // Taking the wanted piece pays the bounty (once per fight).
  _collectBounty(captured) {
    if (!captured || !captured.wanted || captured.color !== this.aiColor || this.powerUsed('bounty')) return;
    this.powers = { ...this.powers, bounty: true };
    const coins = Wallet.earn('bounty', this.BOUNTY);
    this._itemMsg = { text: `Bounty collected: +${coins} coins`, until: performance.now() + 3200 };
    if (audioManager.playVictory) audioManager.playVictory();
  },

  flipBoard() {
    this.flipped = !this.flipped;
    if (typeof PixiBoardRenderer !== 'undefined') PixiBoardRenderer.flipped = this.flipped;
  },

  /* ------------------------------------------------------------------ */
  /*  Story boss twists (rules live in BossRules, visuals in PixiBossFX)  */
  /* ------------------------------------------------------------------ */

  // Squares locked by a lost challenge. (CastlE's walls are real blockers on the board.)
  _isLockedSquare(row, col) {
    return this.lockedTiles.some(t => t.row === row && t.col === col);
  },

  // Plain locks last for the rest of one turn; timed ones until their ply.
  _expireLocks() {
    this.lockedTiles = this.lockedTiles.filter(t => t.until && t.until > this.moveHistory.length &&
      !(t.seal && !(this.board.grid[t.row][t.col] && this.board.grid[t.row][t.col].color === this.playerColor)));
  },

  // The Knight of the Mist: 8x8 booleans (true = hidden from you), or null.
  _hiddenSquares() {
    if (!this.bossRule || !this.bossRule.fog || this.gameOver || this.lanternLit()) return null;
    const key = PixiGameScreen._getBoardKey(this.board);
    if (!this._fogCache || this._fogCache.key !== key) {
      const seen = BossRules.visibleSquares(this.board, this.playerColor);
      const rule = this.bossRule;
      const rows = rule.fogRows;   // a band of mist (the Rulekeeper), a Great Board quarter, or the whole board
      const misted = (r, c) => (rule.regions ? BossRules.regionAt(rule, { row: r, col: c }) === 'mist' : !rows || rows.includes(r));
      this._fogCache = { key, hidden: seen.map((row, r) => row.map((v, c) => !v && misted(r, c))) };
    }
    return this._fogCache.hidden;
  },

  _playerMoves() {
    return Math.floor((this.moveHistory.length + (this.playerColor === 'white' ? 1 : 0)) / 2);
  },

  // The Clock: how many of your moves are left.
  movesLeft() {
    const limit = this.bossRule && this.bossRule.moveLimit;
    return limit ? limit - Math.ceil(this.moveHistory.length / 2) : Infinity;
  },

  // Boss-rule checks after every completed turn.
  _afterBossMoveChecks(move) {
    const rule = this.bossRule;
    if (!rule || this.bossEvent) return;
    const bossMoved = this.turn === this.playerColor;
    if (rule.fog && bossMoved) {
      const hidden = this._hiddenSquares();
      if (hidden && hidden[move.to.row][move.to.col]) move.hidden = true;
      // Every third move of his, his hidden knights' eyes glow in the mist.
      if (hidden && Math.floor(this.moveHistory.length / 2) % 3 === 0 && typeof PixiBossFX !== 'undefined') {
        const knights = [];
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const p = this.board.grid[r][c];
            if (hidden[r][c] && p && p.type === 'knight' && p.color === this.aiColor) knights.push({ row: r, col: c });
          }
        }
        if (knights.length) {
          setTimeout(() => PixiBossFX.showEyes(knights), 350);
          this._twistLine('eyes');
        }
      }
    }
    const goal = rule.goal || {};
    if (goal.captures && !bossMoved && this.capturedPieces[this.playerColor].length >= goal.captures) {
      this._endTraining(true, 'goal');
      return;
    }
    if (goal.captureAll && !bossMoved && BossRules.armyLeft(this.board, this.aiColor) === 0) {
      this._endTraining(true, 'cleared');
      return;
    }
    if (goal.mystery && !bossMoved && this._mysteryMove(move)) return;
    if (goal.promote && !bossMoved && move.promotion) {
      this._endTraining(true, 'crowned');
      return;
    }
    if (goal.relics && !bossMoved) {
      const taken = BossRules.relicsTaken(rule, this.moveHistory, this.playerColor);
      const before = BossRules.relicsTaken(rule, this.moveHistory.slice(0, -1), this.playerColor);
      if (taken.length > before.length && typeof PixiBossFX !== 'undefined') PixiBossFX.relicTaken(move.to, taken.length, goal.relics.length);
      if (taken.length >= goal.relics.length) {
        this._endTraining(true, 'relics');
        return;
      }
      if (taken.length > before.length) this._twistLine('relic', { left: goal.relics.length - taken.length });
    }
    if (goal.crossing && !bossMoved) {
      const k = this.board.findKing(this.playerColor);
      if (k && k.row === BossRules.crossingRow(this.playerColor)) {
        this._endTraining(true, 'crossed');
        return;
      }
    }
    if (goal.survive && bossMoved && this._playerMoves() >= goal.survive) {
      this._endTraining(true, 'survived');
      return;
    }
    if (rule.moveLimit && !bossMoved && (this.movesLeft() === 10 || this.movesLeft() === 5)) {
      this._twistLine('clockLow', { left: this.movesLeft() });
    }
    if (rule.moveLimit && !bossMoved && this.movesLeft() <= 0) {
      this.gameOver = true;
      this.gameStatus = 'timeout';
      this.gameResult = this.aiColor;
      this.handleGameEnd();
      audioManager.playGameOver();
      store.update({ gameStatus: this.gameStatus, gameOver: true, gameResult: this.gameResult });
      return;
    }
    // Timed locks can leave a side with no move that normal chess would allow.
    if (this.lockedTiles.length) this.checkForLockedTileGameEnd();
  },

  // The opponent reacts to its own twist (lines in gameDialogue[category]).
  _twistLine(category, context) {
    if (this.mode === 'story' && typeof DialogueManager !== 'undefined') DialogueManager.onTwist(category, context);
  },

  // Mystery piece, after each of your moves: taking it wins, taking a
  // suspect clears it, and every few moves a hint clears more. Returns true
  // when the game is over.
  _mysteryMove(move) {
    const fx = typeof PixiBossFX !== 'undefined' ? PixiBossFX : null;
    const taken = move.captured;
    if (taken && taken.mystery) {
      if (fx) fx.mysteryFound(move.to, taken);
      this._endTraining(true, 'mystery');
      return true;
    }
    if (taken && taken.suspect) {
      if (fx) fx.banner('NOT THIS ONE', '#ffb347');
      audioManager.playTileLock();
    }
    const every = this.bossRule.goal.hintEvery || 3;
    const left = BossRules.suspects(this.board, this.aiColor);
    if (left.length > 1 && this._playerMoves() % every === 0) {
      const hint = BossRules.mysteryHint(this.board, this.aiColor);
      if (hint) {
        for (const s of hint.cleared) this.board.grid[s.row][s.col].suspect = false;
        this.bossState = { ...this.bossState, hint: hint.text, hints: (this.bossState.hints || 0) + 1 };
        if (fx) fx.mysteryHint(hint);
        audioManager.playSelect();
        this._twistLine('mysteryHint');
      }
    }
    if (BossRules.suspects(this.board, this.aiColor).length === 1 && !this.bossState.found) {
      this.bossState = { ...this.bossState, found: true, hint: 'Only one suspect left. That is the one!' };
      if (fx) setTimeout(() => fx.banner('FOUND IT!', '#ffd35a'), 900);
    }
    return false;
  },

  // Memory missions: the rank the king started the crossing on.
  _crossingStart() {
    const rule = this.bossRule;
    if (!this._crossStart || this._crossStart.rule !== rule) {
      const k = BossRules.startBoard(rule, () => 0).findKing(this.playerColor);
      this._crossStart = { rule, row: k ? k.row : (this.playerColor === 'white' ? 7 : 0) };
    }
    return this._crossStart.row;
  },

  // Moves until the next mystery hint.
  mysteryHintIn() {
    const every = (this.bossRule && this.bossRule.goal && this.bossRule.goal.hintEvery) || 3;
    return every - (this._playerMoves() % every);
  },

  // ForkMaster: the second forked piece is taken along with the first.
  _applyDoubleTake(move, captured) {
    const v = move.doubleTake;
    const still = this.board.grid[v.row][v.col];
    if (!still || still.color !== v.piece.color || still.type !== v.piece.type) {
      move.doubleTake = null;
      return;
    }
    this.board.grid[v.row][v.col] = null;
    this.capturedPieces[this.turn].push(v.piece);
    move.san = (move.san || '?') + ' x2';
    this._twistLine('doubleTake');
    if (typeof PixiBossFX !== 'undefined') {
      PixiBossFX.doubleTake(move.from, [
        { row: move.to.row, col: move.to.col, piece: captured },
        { row: v.row, col: v.col, piece: v.piece },
      ], store.get('theme'));
    }
    audioManager.playCapture();
  },

  // Minigames a boss favours: his signature games, or for Grandmaster X the
  // ones you lose most.
  _bossSignature() {
    const rule = this.bossRule;
    if (!rule) return null;
    if (rule.weakestGames) {
      if (!this._weakestGames) this._weakestGames = BossRules.weakestGames((store.get('stats') || {}).miniGameByType);
      return this._weakestGames;
    }
    return rule.signature || null;
  },

  // What a trainer's test panel shows, or null outside the Training Camp.
  trainingProgress() {
    const rule = this.bossRule;
    if (!rule) return null;
    if (rule.puzzles) {
      const solved = this.gameOver && this.playerWon() ? rule.puzzles.length : (this.bossState.puzzle || 0);
      return { label: 'PUZZLES SOLVED', done: solved, total: rule.puzzles.length, slots: rule.puzzles.length };
    }
    if (rule.goal && rule.goal.captures) {
      const n = Math.min(rule.goal.captures, this.capturedPieces[this.playerColor].length);
      return { label: 'CAPTURES WON', done: n, total: rule.goal.captures, slots: rule.goal.captures };
    }
    if (rule.goal && rule.goal.captureAll) {
      const taken = this.capturedPieces[this.playerColor].length;
      const total = taken + BossRules.armyLeft(this.board, this.aiColor);
      return { label: 'PIECES TAKEN', done: taken, total, slots: Math.min(total, 9) };
    }
    if (rule.goal && rule.goal.survive) {
      const n = Math.min(rule.goal.survive, this._playerMoves());
      return { label: 'MOVES SURVIVED', done: n, total: rule.goal.survive, slots: Math.min(rule.goal.survive, 15) };
    }
    if (rule.goal && rule.goal.relics) {
      const n = BossRules.relicsTaken(rule, this.moveHistory, this.playerColor).length;
      return { label: 'RELICS FOUND', done: n, total: rule.goal.relics.length, slots: rule.goal.relics.length };
    }
    if (rule.goal && rule.goal.crossing) {
      const start = this._crossingStart();
      const total = Math.abs(start - BossRules.crossingRow(this.playerColor));
      const n = this.gameOver && this.playerWon() ? total : Math.min(total, BossRules.crossingProgress(this.board, this.playerColor, start));
      return { label: 'RANKS CROSSED', done: n, total, slots: total };
    }
    if (rule.goal && rule.goal.promote) {
      return { label: 'PAWN CROWNED', done: this.gameOver && this.playerWon() ? 1 : 0, total: 1, slots: 1 };
    }
    if (rule.minigameTrial && rule.minigameTrial.all) {
      // Joy Stick's lesson: every game, one by one.
      const n = MiniGameManager.getAllowedGames(miniGameManager.allGames).length;
      const t = this.trial || { played: ((store.getActiveSave() || {}).lesson || {}).at || 0 };
      return { label: 'GAMES LEARNED', done: t.played, total: n, slots: n };
    }
    if (rule.minigameTrial) {
      const t = this.trial || { played: 0, won: 0 };
      return { label: 'CHALLENGES WON', done: t.won, failed: t.played - t.won, total: rule.minigameTrial.need, slots: rule.minigameTrial.games };
    }
    return null;
  },

  // Puzzle drills and the minigame trial have no opponent moving pieces.
  _noOpponent() {
    const rule = this.bossRule;
    return !!(rule && (rule.puzzles || rule.minigameTrial));
  },

  // Called once the lesson cards are dismissed.
  _startTraining() {
    const rule = this.bossRule;
    this._fightStart = performance.now();
    if (rule && rule.minigameTrial && !this.gameOver) this._runTrial();
  },

  // Ends a trainer's test with a pass (player wins) or a fail.
  _endTraining(passed, status) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.gameStatus = status;
    this.gameResult = passed ? this.playerColor : this.aiColor;
    this.handleGameEnd();
    if (passed) {
      audioManager.playVictory();
      if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
        PixiGameScreen.spawnFireworks(Layout.cx, Layout.cy, [0x6fe3ff, 0xbff4ff, 0xffffff, 0x2a8fb8]);
      }
    } else {
      audioManager.playGameOver();
    }
    store.update({ gameStatus: this.gameStatus, gameOver: true, gameResult: this.gameResult });
  },

  // Sergeant Square's drill: after the player's move, a mate moves on to the
  // next puzzle (or passes); anything else resets the puzzle. Returns true when
  // it has taken over from the normal end-of-turn handling.
  _puzzleMoveMade(status) {
    const rule = this.bossRule;
    const index = this.bossState.puzzle || 0;
    const solved = status.status === 'checkmate' && status.winner === this.playerColor;
    if (solved && index >= rule.puzzles.length - 1) return false;   // last one: a normal win
    if (!solved) this.bossState.misses = (this.bossState.misses || 0) + 1;
    this.bossEvent = true;
    if (typeof PixiBossFX !== 'undefined') {
      PixiBossFX.banner(solved ? 'CHECKMATE!' : 'NOT MATE', solved ? '#7dea99' : '#ff6b6b');
    }
    if (solved) audioManager.playVictory(); else audioManager.playTileLock();
    setTimeout(() => {
      if (this.mode !== 'story' || !this.bossRule || !this.bossRule.puzzles) return;
      this._loadPuzzle(solved ? index + 1 : index);
      this.bossEvent = false;
    }, 1300);
    return true;
  },

  _loadPuzzle(index) {
    this.board = FEN.toBoard(this.bossRule.puzzles[index]);
    this.turn = this.board.turn;
    this.bossState = { ...this.bossState, puzzle: index };
    this.moveHistory = [];
    this.capturedPieces = { white: [], black: [] };
    this.lastMove = null;
    this.lockedTiles = [];
    this.selectedSquare = null;
    this.legalMoves = [];
    this.gameStatus = 'playing';
    this.boardSnapshots = [];
    this.saveSnapshot();
    store.update({ board: this.board, turn: this.turn, gameStatus: this.gameStatus });
  },

  // Joy Stick's trial: a run of practice minigames; win `need` of `games` to pass.
  _runTrial() {
    const spec = this.bossRule.minigameTrial;
    let games = MiniGameManager.getAllowedGames(miniGameManager.allGames).map(g => g.type);
    // Missions draw from a themed pool, or from the games you lose most.
    const pool = spec.weakest ? BossRules.weakestGames((store.get('stats') || {}).miniGameByType, 5) : spec.pool;
    if (pool && pool.length) {
      const picked = games.filter(g => pool.includes(g.name));
      if (picked.length) games = picked;
    }
    if (!games.length || typeof Mini3D === 'undefined' || !Mini3D.available()) {
      this._endTraining(true, 'trial');   // No WebGL: challenges cannot run, so the lesson is waived.
      return;
    }
    if (spec.all) { this._runLesson(games, spec); return; }
    const order = games.sort(() => Math.random() - 0.5);
    this.trial = { played: 0, won: 0, games: spec.games, need: spec.need };
    const next = () => {
      if (this.gameOver || !this.trial) return;
      const type = order[this.trial.played % order.length];
      miniGameManager.startPracticeMiniGame(type, (result) => {
        if (!this.trial) return;
        this.trial.played++;
        if (result === 'defended') this.trial.won++;
        const left = this.trial.games - this.trial.played;
        if (this.trial.won >= this.trial.need) this._endTraining(true, 'trial');
        else if (this.trial.won + left < this.trial.need) this._endTraining(false, 'trial');
        else setTimeout(next, 700);
      }, { failText: this.currentCharacter && this.currentCharacter.mission ? 'Keep going!' : 'Joy Stick: keep going!' });
    };
    setTimeout(next, 400);
  },

  // Joy Stick's lesson: every challenge once, in a fixed order. A lost game gets
  // `retries` more tries, then counts as learned anyway, so the lesson always ends
  // in a pass. Progress stays in the save (save.lesson), so leaving mid-way resumes.
  _runLesson(games, spec) {
    const saved = (store.getActiveSave() || {}).lesson || {};
    const at = Math.min(saved.at || 0, games.length - 1);
    this.trial = { played: at, won: at, firstTry: saved.firstTry || 0, games: games.length, need: games.length, lesson: true, tries: 0 };
    const keep = () => store.setActiveSave({ lesson: { at: this.trial.played, firstTry: this.trial.firstTry } });
    const next = () => {
      if (this.gameOver || !this.trial) return;
      const type = games[this.trial.played];
      if (typeof PixiBossFX !== 'undefined' && this.trial.tries === 0) {
        PixiBossFX.banner(`GAME ${this.trial.played + 1} / ${games.length}`, '#ff6fd8');
      }
      miniGameManager.startPracticeMiniGame(type, (result) => {
        if (!this.trial) return;
        const won = result === 'defended';
        if (won && this.trial.tries === 0) this.trial.firstTry++;
        if (won || this.trial.tries >= spec.retries) {
          this.trial.played++;
          this.trial.won = this.trial.played;
          this.trial.tries = 0;
        } else {
          this.trial.tries++;
        }
        if (this.trial.played >= games.length) {
          store.setActiveSave({ lesson: null });
          this._endTraining(true, 'trial');
          return;
        }
        keep();
        store.saveProgress();
        setTimeout(next, 700);
      }, { failText: this.trial.tries >= spec.retries ? 'Joy Stick: lesson learned, next game!' : `Joy Stick: try again! (${spec.retries - this.trial.tries} left)` });
    };
    setTimeout(next, 400);
  },

  REWIND_LINES: [
    'Not yet. Time bends for me.',
    'Again? The crystal remembers every move.',
    'You found the mate. Find it twice.',
  ],

  // Grandmaster X: checkmate him and time rewinds two full rounds (4 plies);
  // he gains a bishop or knight. Returns true if the rewind started.
  _tryBossRewind() {
    const rule = this.bossRule;
    if (!rule || !rule.rewinds || this.bossEvent) return false;
    if ((this.bossState.rewindsUsed || 0) >= rule.rewinds) return false;
    const used = this.bossState.rewindsUsed || 0;
    const len = this.moveHistory.length;
    const snapFor = n => {
      for (let i = this.boardSnapshots.length - 1; i >= 0; i--) {
        if (this.boardSnapshots[i].moveHistory.length === n) return i;
      }
      return -1;
    };
    // Never rewind past the previous rewind (that would take back his last gift).
    let target = Math.max(0, len - 4);
    while (target < len && (snapFor(target) === -1 ||
      ((this.boardSnapshots[snapFor(target)].bossState || {}).rewindsUsed || 0) < used)) target++;
    if (target >= len) return false;

    this.bossEvent = true;
    this.gameStatus = 'playing';
    this.selectedSquare = null;
    this.legalMoves = [];
    this._aiToken = (this._aiToken || 0) + 1;
    this.aiThinking = false;
    const theme = store.get('theme');
    const setPieces = () => {
      if (typeof PixiBoardRenderer !== 'undefined' && PixiBoardRenderer.container) {
        PixiBoardRenderer.setPieces(this.board, theme);
        PixiGameScreen._lastBoardKey = PixiGameScreen._getBoardKey(this.board);
      }
    };
    const steps = [];
    for (let n = len - 1; n >= target; n--) {
      const move = this.moveHistory[n];
      const moved = move && !move.defended;
      steps.push({
        from: moved ? move.from : move.to,
        to: move.to,
        apply: () => { this.restoreSnapshot(this.boardSnapshots[snapFor(n)]); setPieces(); },
      });
    }
    const gift = BossRules.rewindPiece(this._boardAt(snapFor(target)), this.aiColor);

    const finish = () => {
      if (this.mode !== 'story') return;
      this.boardSnapshots.length = snapFor(target) + 1;
      if (gift) {
        this.board.grid[gift.row][gift.col] = { type: gift.type, color: this.aiColor };
        this.board.positionHistory[this.board.positionHistory.length - 1] = this.board.posKey();
      }
      this.bossState = { rewindsUsed: used + 1 };
      this.updateCheckStateForTurn();
      this.gameStatus = this.board.inCheck ? 'check' : 'playing';
      setPieces();
      this.saveSnapshot();
      this.bossEvent = false;
      this.aiCooldown = 900;
      store.update({ board: this.board, turn: this.turn, gameStatus: this.gameStatus });
      const line = this.REWIND_LINES[(this.bossState.rewindsUsed - 1) % this.REWIND_LINES.length];
      if (this.currentCharacter) {
        this._showDialogueBubble(line, this.currentCharacter);
        this._setCharacterMood(this.currentCharacter, 'crack');   // his crystal has just cracked
      }
    };
    if (typeof PixiBossFX !== 'undefined' && PixiBossFX.initialized) {
      PixiBossFX.rewind(steps, gift, theme, finish);
    } else {
      steps.forEach(s => s.apply());
      finish();
    }
    return true;
  },

  // A Board rebuilt from a snapshot (used to plan the rewind gift ahead of time).
  _boardAt(index) {
    const snap = this.boardSnapshots[index];
    const b = Board.createEmpty();
    b.grid = snap.grid.map(row => row.map(cell => cell ? { ...cell } : null));
    b.castlingRights = JSON.parse(JSON.stringify(snap.castlingRights));
    b.enPassantTarget = snap.enPassantTarget ? { ...snap.enPassantTarget } : null;
    b.halfMoveClock = snap.halfMoveClock;
    b.fullMoveNumber = snap.fullMoveNumber || 1;
    return b;
  },

  // Story and Custom games use random capture challenges, never Defenses.
  usesRandomChallenges(mode) {
    return mode === 'story' || mode === 'custom' || mode === 'greatboard';
  },

  // Defenses only exist when the Chess 2.0 capture mini-games are on
  // (never in Classic Chess).
  get usesDefenses() {
    return this.gameplayMode && !!store.get('miniGamesEnabled');
  },

  // The colour shown at the bottom of the board / on the left panel.
  get bottomColor() {
    return this.flipped ? 'black' : 'white';
  },

  getPlayerName(color) {
    if (this.isAIMode) {
      if (color === this.playerColor) return 'You';
      if (this.currentCharacter) return this.currentCharacter.name;
      return 'Computer';
    }
    const name = color === 'white' ? store.get('whitePlayer') : store.get('blackPlayer');
    return name || (color === 'white' ? 'White' : 'Black');
  },

  playerWon() {
    return this.gameResult === this.playerColor;
  },

  resultTitle() {
    if (!this.gameResult || this.gameResult === 'draw') return 'Draw!';
    const ch = this.currentCharacter;
    if (ch && (ch.trainer || ch.mission) && !this.playerWon()) return 'Try Again';
    if (ch && ch.mission && this.playerWon()) return 'Mission Clear!';
    if (ch && ch.side && this.playerWon() && ch.side.winTitle) return ch.side.winTitle;
    if (this.isAIMode) return this.playerWon() ? 'You Win!' : 'You Lose';
    return this.getPlayerName(this.gameResult) + ' Wins!';
  },

  resultReason() {
    switch (this.gameStatus) {
      case 'checkmate': return 'by Checkmate';
      case 'stalemate': return 'by Stalemate';
      case 'draw': return this.drawReason || 'by Draw';
      case 'resigned': return 'by Resignation';
      case 'timeout': return this.currentCharacter && this.currentCharacter.theme !== 'obsidiancourt' ? 'Out of moves' : 'The sand ran out';
      case 'goal': return this.currentCharacter && this.currentCharacter.mission ? 'Goal reached' : 'Lesson complete';
      case 'crowned': return 'Your pawn was crowned';
      case 'survived': return 'You held out';
      case 'cleared': return 'Every piece taken';
      case 'mystery': return 'You caught the mystery piece';
      case 'relics': return 'Every relic found';
      case 'crossed': return 'You reached the far edge';
      case 'trial': return this.playerWon() ? 'Trial passed' : 'Not enough wins';
      case 'superuser': return 'Super User win';
      default: return 'Game Over';
    }
  },

  // Whether render() will draw on the Canvas 2D overlay this frame. When it won't,
  // the game loop leaves the overlay untouched instead of clearing it every frame.
  drawsOverlay() {
    return this.aiThinking || !!this.promotionPending || (this.comboDisplayTimer > 0 && this.captureCombo > 1);
  },

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;
    if (typeof audioManager !== 'undefined' && typeof audioManager.setSuspense === 'function') {
      audioManager.setSuspense((this.gameStatus === 'check' || !!(this.bossRule && this.bossRule.tenseMusic)) && !this.gameOver);
    }

    if (this.aiCooldown > 0) {
      this.aiCooldown -= dt * 1000;
      if (this.aiCooldown < 0) this.aiCooldown = 0;
    }
    const isLive = this.reviewingAt === null && !this.introVisible && !PauseMenu.visible && !this.bossEvent && !this._noOpponent();
    if (isLive && this.isAIMode && this.turn === this.aiColor && !this.aiThinking && !this.gameOver && this.aiCooldown <= 0) {
      this.doAIMove();
    }

    // Pixi handles board, pieces, backgrounds, particles
    if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
      const filteredMoves = this.legalMoves.filter(m => !this._isLockedSquare(m.to.row, m.to.col));
      const inCheck = this.gameStatus === 'check' || this.gameStatus === 'checkmate';
      const hidden = this._hiddenSquares();
      // In the mist, his last move is only marked where you can see it.
      const lm = this.lastMove;
      const lastMove = hidden && lm && (hidden[lm.from.row][lm.from.col] || hidden[lm.to.row][lm.to.col]) ? null : lm;
      PixiGameScreen.update(dt, {
        backdrop: this._fightBackdrop(),
        board: this.board,
        selectedSquare: this.selectedSquare,
        legalMoves: filteredMoves,
        lastMove,
        checkSquare: inCheck ? this.board.findKing(this.turn) : null,
      });
      if (typeof PixiBossFX !== 'undefined' && this.bossRule) PixiBossFX.update(dt, this, hidden);
      this._drawItemMarks();
    }

    if (typeof PixiGameHud !== 'undefined') {
      PixiGameHud.update(this);
    }

    if (typeof PixiGameOverOverlay !== 'undefined') {
      PixiGameOverOverlay.update(this);
    }

    const canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.style.pointerEvents = 'auto';

    // AI thinking indicator
    if (this.aiThinking) {
      UIHelpers.drawIcon(ctx, Layout.cx - 60, 20, 'hourglass', 10, cols, { color: cols.text + '88' });
      ctx.fillStyle = cols.text + '88';
      ctx.font = '14px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      const dots = '.'.repeat(Math.floor(Date.now() / 500) % 4);
      ctx.fillText('Opponent is thinking' + dots, Layout.cx, 30);
    }

    // Promotion dialog
    if (this.promotionPending) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, Layout.W, Layout.H);

      const sqSize = 80;
      const types = ['queen', 'rook', 'bishop', 'knight'];
      const totalW = types.length * sqSize + (types.length - 1) * 10;
      const startX = Layout.cx - totalW / 2;
      const startY = Layout.cy - sqSize / 2;

      UIHelpers.drawPanel(ctx, startX - 20, startY - 40, totalW + 40, sqSize + 60, cols, { accentTop: true });

      ctx.fillStyle = cols.text;
      ctx.font = 'bold 18px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PROMOTE TO:', Layout.cx, startY - 10);

      for (let i = 0; i < types.length; i++) {
        const bx = startX + i * (sqSize + 10);
        const isHovered = this.promotionHover === types[i];
        ctx.fillStyle = isHovered ? cols.highlight + '40' : cols.lightSquare;
        ctx.fillRect(bx, startY, sqSize, sqSize);
        ctx.strokeStyle = isHovered ? cols.highlight : cols.text + '44';
        ctx.lineWidth = isHovered ? 3 : 1;
        ctx.strokeRect(bx, startY, sqSize, sqSize);
        const padding = Math.max(2, Math.floor(sqSize * 0.06));
        PieceRenderer.drawPiece(ctx, types[i], this.turn, theme, bx + padding, startY + padding, sqSize - padding * 2);
      }
    }

    // Combo display
    if (this.comboDisplayTimer > 0) {
      this.comboDisplayTimer -= dt;
      if (this.captureCombo > 1) {
        const alpha = Math.min(1, this.comboDisplayTimer);
        const bounce = Math.sin(this.comboDisplayTimer * 10) * 5;
        ctx.fillStyle = `rgba(255,200,50,${alpha})`;
        ctx.font = 'bold 24px "Pixelify Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.captureCombo + 'x COMBO!', Layout.cx, 80 + bounce);
      }
    }
  },

  getGameOverButtons() {
    if (typeof PixiGameOverOverlay !== 'undefined' && PixiGameOverOverlay.buttonRects) {
      return PixiGameOverOverlay.buttonRects;
    }
    return [];
  },

  _hudActionAt(x, y) {
    const rects = (typeof PixiGameHud !== 'undefined' && PixiGameHud.hitRects) || [];
    const hit = rects.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    return hit ? hit.action : null;
  },

  handleHudAction(action) {
    switch (action) {
      case 'back': this.stepBack(); break;
      case 'forward': this.stepForward(); break;
      case 'live': this.goToLive(); break;
      case 'undo': this.undo(); break;
      case 'item_rewind': this.useItem('rewind'); break;
      case 'item_hint': this.useItem('hint'); break;
      case 'item_remove': this.useItem('remove'); break;
      case 'power_hourglass': this.usePower('hourglass'); break;
      case 'power_lantern': this.usePower('lantern'); break;
      case 'power_seal': this.usePower('seal'); break;
      case 'shop_hint': this._shopHint(); break;
      case 'flip': this.flipBoard(); break;
      case 'pause': PauseMenu.show(); break;
    }
  },

  handleClick(x, y) {
    if (this.introVisible) {
      const b = this._introButton;
      if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) this._dismissRulesIntro();
      return;
    }

    // Promotion dialog
    if (this.promotionPending) {
      const sqSize = 80;
      const types = ['queen', 'rook', 'bishop', 'knight'];
      const totalW = types.length * sqSize + (types.length - 1) * 10;
      const startX = Layout.cx - totalW / 2;
      const startY = Layout.cy - sqSize / 2;

      for (let i = 0; i < types.length; i++) {
        const bx = startX + i * (sqSize + 10);
        if (x >= bx && x <= bx + sqSize && y >= startY && y <= startY + sqSize) {
          const move = this.promotionPending.moves.find(m => m.promotion === types[i]);
          if (move) {
            this.promotionPending = null;
            this.promotionHover = null;
            this.executePlayerMove(move);
            audioManager.playPromotion();
          }
          return;
        }
      }
      return;
    }

    // Game over buttons
    if (this.gameOver) {
      const buttons = this.getGameOverButtons();
      for (const btn of buttons) {
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          this.handleGameOverAction(btn.action);
          return;
        }
      }
      return;
    }

    const hudAction = this._hudActionAt(x, y);
    if (hudAction) {
      if (typeof audioManager.playButton === 'function') audioManager.playButton();
      this.handleHudAction(hudAction);
      return;
    }

    // Don't allow moves while reviewing
    if (this.reviewingAt !== null) return;
    if (this.aiThinking || this.bossEvent || this.trial) return;

    let boardPos = null;
    if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
      boardPos = PixiGameScreen.getSquareAt(x, y);
    }
    if (!boardPos) return;
    const row = boardPos.row;
    const col = boardPos.col;

    // Remove a Piece: the next click picks the enemy piece (anything else cancels).
    if (this.removeMode) {
      if (!this._removePiece(row, col)) { this.removeMode = false; audioManager.playSelect(); }
      return;
    }
    if (this.sealMode) {
      if (!this._sealPiece(row, col)) { this.sealMode = false; audioManager.playSelect(); }
      return;
    }

    // A sealed piece of yours can still move; other locked squares refuse the click.
    const sealed = this.lockedTiles.some(t => t.seal && t.row === row && t.col === col);
    if (this._isLockedSquare(row, col) && !sealed) {
      audioManager.playTileLock();
      return;
    }

    const clicked = this.board.grid[row][col];

    if (this.selectedSquare) {
      const selectedPiece = this.board.grid[this.selectedSquare.row][this.selectedSquare.col];
      const isPromotion = selectedPiece && selectedPiece.type === 'pawn' && (row === 0 || row === 7);

      if (isPromotion) {
        const promoMoves = this.legalMoves.filter(m =>
          m.to.row === row && m.to.col === col && m.promotion
        );
        if (promoMoves.length > 0) {
          this.promotionPending = { moves: promoMoves, toSquare: { row, col } };
          audioManager.playSelect();
          return;
        }
      }

      const move = this.legalMoves.find(m =>
        m.to.row === row && m.to.col === col && !m.promotion
      );
      if (move) {
        this.executePlayerMove(move);
        return;
      }
    }

    if (clicked && clicked.color === this.turn) {
      this.selectedSquare = { row, col };
      audioManager.playSelect();
      let moves = GameRules.getLegalMoves(this.board, this.turn);
      moves = moves.filter(m => !this._isLockedSquare(m.to.row, m.to.col));
      this.legalMoves = moves.filter(m => m.from.row === row && m.from.col === col);
    } else {
      this.selectedSquare = null;
      this.legalMoves = [];
    }
  },

  handleMouseMove(x, y) {
    const canvas = document.getElementById('gameCanvas');

    if (this.promotionPending) {
      const sqSize = 80;
      const types = ['queen', 'rook', 'bishop', 'knight'];
      const totalW = types.length * sqSize + (types.length - 1) * 10;
      const startX = Layout.cx - totalW / 2;
      const startY = Layout.cy - sqSize / 2;
      let hovered = null;
      for (let i = 0; i < types.length; i++) {
        const bx = startX + i * (sqSize + 10);
        if (x >= bx && x <= bx + sqSize && y >= startY && y <= startY + sqSize) {
          hovered = types[i];
          break;
        }
      }
      this.promotionHover = hovered;
      canvas.style.cursor = hovered ? 'pointer' : 'default';
      return;
    }

    this.hoveredSquare = null;

    if (this.gameOver) {
      this.hoveredGameOverBtn = null;
      const buttons = this.getGameOverButtons();
      for (const btn of buttons) {
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          this.hoveredGameOverBtn = btn.action;
          canvas.style.cursor = 'pointer';
          return;
        }
      }
      canvas.style.cursor = 'default';
      return;
    }

    if (this._hudActionAt(x, y)) {
      canvas.style.cursor = 'pointer';
      return;
    }

    let boardPos = null;
    if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
      boardPos = PixiGameScreen.getSquareAt(x, y);
    }
    if (boardPos && !this.aiThinking && this.reviewingAt === null) {
      const piece = this.board.grid[boardPos.row][boardPos.col];
      const isLegalTarget = this.legalMoves.some(m => m.to.row === boardPos.row && m.to.col === boardPos.col);
      const isOwnPiece = piece && piece.color === this.turn;
      canvas.style.cursor = (isLegalTarget || isOwnPiece) ? 'pointer' : 'default';
    } else {
      canvas.style.cursor = 'default';
    }
  },

  handleKeyDown(e) {
    if (this.introVisible) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') this._dismissRulesIntro();
      return;
    }
    if (e.key === 'Escape') {
      if (this.gameOver) switchScreen('home');
      else if (PauseMenu.visible) PauseMenu.hide();
      else PauseMenu.show();
      return;
    }
    if (PauseMenu.visible) return;
    if (e.key === 'ArrowLeft') this.stepBack();
    if (e.key === 'ArrowRight') this.stepForward();
    if (e.key === 'f' || e.key === 'F') this.flipBoard();
    if (e.key === 'u' || e.key === 'U' || ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z'))) {
      e.preventDefault();
      this.undo();
    }
  },

  executePlayerMove(move) {
    this.playMove(move, false);
  },

  // Plays a move for either side, giving the defender a chance to block a
  // capture with a minigame first. Returns true if a minigame was started.
  playMove(move, isAIMove) {
    const piece = this.board.grid[move.from.row][move.from.col];
    const captured = CaptureRules.capturedPiece(this.board, move);
    move.san = Notation.toSAN(this.board, move);

    if (captured && this.gameplayMode && this.tryStartDefensiveMiniGame(move, piece, captured, isAIMove)) {
      return true;
    }

    // Random capture challenges (Story and Custom): the attacker plays; losing
    // cancels the capture and locks that square for the rest of the turn.
    const bossIsAttacker = this.mode === 'story' && isAIMove;
    // Double take: ForkMaster's forks, or any fork that captures on a Great Board "forks" quarter.
    const forksHere = BossRules.regionAt(this.bossRule, move.to) === 'forks';
    if (captured && this.bossRule && ((bossIsAttacker && this.bossRule.doubleTake) || forksHere)) {
      move.doubleTake = BossRules.doubleTakeVictim(this.board, move);
    }
    const challengeChance = BossRules.challengeChance(this.bossRule, captured || {}, bossIsAttacker, move.to);
    if (captured && !this.gameplayMode && Math.random() < challengeChance && MiniGameManager.shouldTriggerMiniGame() &&
        CaptureRules.isChallengeable(this.board, move)) {
      const token = this._aiToken;
      this.pendingRevertMove = { move, piece, captured };
      const started = miniGameManager.startMiniGame(
        piece, captured, move.to,
        isAIMove,
        (winner) => {
          if (token !== this._aiToken) return;
          this._countChallenge(isAIMove ? winner !== 'attacker' : winner === 'attacker');
          if (winner === 'attacker') {
            this.executeCaptureMove(move, piece, captured);
          } else {
            this.revertMoveAndLockTile(move);
          }
          if (isAIMove) {
            this.aiThinking = false;
            this.aiCooldown = 600;
          }
        },
        this.bossRule && this.bossRule.maxBotSkill ? 10 : this.characterLevel,
        this._bossSignature(),
        this.bossRule && this.bossRule.weakestGames ? 6 : 3
      );
      if (started) return true;
    }

    if (!captured) this.captureCombo = 0;
    this.executeCaptureMove(move, piece, captured);
    return false;
  },

  // Challenges won and lost by the player in a story fight (for the stars).
  _countChallenge(playerWon) {
    const c = this.bossState.challenges || { won: 0, lost: 0 };
    this.bossState.challenges = playerWon ? { ...c, won: c.won + 1 } : { ...c, lost: c.lost + 1 };
  },

  tryStartDefensiveMiniGame(move, piece, captured, isAIMove) {
    if (!captured || !MiniGameManager.shouldTriggerMiniGame()) return false;
    if (!CaptureRules.canDefend(this.board, move, this.defensiveMiniGames[captured.color])) return false;

    const token = this._aiToken;
    const challengePlayerIsAI = this.isAIMode && captured.color === this.aiColor;
    const started = miniGameManager.startDefensiveMiniGame({
      attacker: piece,
      defender: captured,
      boardPos: move.to,
      challengePlayerIsAI,
      botSkillLevel: this.characterLevel,
    }, (result) => {
      if (token !== this._aiToken) return;
      if (result === 'defended') {
        this.cancelCaptureAndPassTurn(move, piece, captured);
      } else {
        this.executeCaptureMove(move, piece, captured);
      }
      if (isAIMove) {
        this.aiThinking = false;
        this.aiCooldown = 600;
      }
    });

    if (!started) return false;
    this.defensiveMiniGames[captured.color] = Math.max(0, (this.defensiveMiniGames[captured.color] || 0) - 1);
    this.pendingRevertMove = { move, piece, captured };
    store.update({ board: this.board });
    return true;
  },

  cancelCaptureAndPassTurn(move, piece, captured) {
    move.piece = piece;
    move.captured = captured;
    move.defended = true;
    this.lastMove = { from: move.from, to: move.to };
    this.moveHistory.push(move);
    this.lastMoveWasCapture = false;
    this.captureCombo = 0;
    this.comboDisplayTimer = 0;
    const previousTurn = this.turn;
    this.turn = this.turn === 'white' ? 'black' : 'white';
    this.board.turn = this.turn;
    this.board.halfMoveClock++;
    this.board.enPassantTarget = null;
    if (previousTurn === 'black') this.board.fullMoveNumber++;
    this.board.positionHistory.push(this.board.posKey());
    this.selectedSquare = null;
    this.legalMoves = [];
    this._expireLocks();
    this.pendingRevertMove = null;
    this.updateCheckStateForTurn();
    this.finishTurnStatus();
    if (!this.gameOver) this._afterBossMoveChecks(move);
    this.saveSnapshot();
    audioManager.playTileLock();
  },

  updateCheckStateForTurn() {
    const king = this.board.findKing(this.turn);
    const attackerColor = this.turn === 'white' ? 'black' : 'white';
    this.board.inCheck = king ? MoveGen.isSquareAttacked(this.board, king.row, king.col, attackerColor) : false;
  },

  executeCaptureMove(move, piece, captured) {
    if (captured) {
      const capturingColor = this.turn;
      if (capturingColor === this.playerColor) this._collectBounty(captured);
      this.capturedPieces[capturingColor].push(captured);
      this.captureCombo++;
      if (this.gameplayMode) {
        this.captureRewardProgress[capturingColor] = (this.captureRewardProgress[capturingColor] || 0) + 1;
        if (this.captureRewardProgress[capturingColor] >= 2) {
          this.defensiveMiniGames[capturingColor] = (this.defensiveMiniGames[capturingColor] || 0) + 1;
          this.captureRewardProgress[capturingColor] = 0;
        }
      }
      this.comboDisplayTimer = 2;
      this.lastMoveWasCapture = true;
      const stats = store.get('stats');
      stats.captures++;
      store.set('stats', stats);

      const theme = ThemeManager.getTheme(store.get('theme'));
      if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
        const { x: cx, y: cy } = PixiGameScreen.squareCenter(move.to.row, move.to.col);
        const isMajor = captured.type === 'rook' || captured.type === 'queen';
        PixiGameScreen.spawnCaptureParticles(cx, cy, PixiColorUtil.hexToNum(theme.colors.accent), captured.type);
        PixiGameScreen.shakeScreen(isMajor ? 14 : 8);
        PixiGameScreen.flashScreen(isMajor ? 0xffeeaa : 0xffffff);
      }

      audioManager.playCapture();
      audioManager.playScreenShake();

      if (this.mode === 'story' && typeof DialogueManager !== 'undefined') {
        DialogueManager.onCapture(this.turn, captured, this.aiColor, this.board);
      }
    } else {
      audioManager.playMove(piece ? piece.type : null);
      if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
        const theme = ThemeManager.getTheme(store.get('theme'));
        const { x: cx, y: cy } = PixiGameScreen.squareCenter(move.to.row, move.to.col);
        PixiGameScreen.spawnMoveParticles(cx, cy, PixiColorUtil.hexToNum(theme.colors.accent));
      }
    }

    move.piece = piece;
    move.captured = captured;
    if (captured && move.doubleTake) this._applyDoubleTake(move, captured);
    MoveExecutor.executeMove(this.board, move, this.turn);
    this.afterMove(move);
  },

  revertMoveAndLockTile(move) {
    const rule = this.bossRule;
    // On the Great Board only the gears quarter locks squares for longer.
    const lockPlies = rule && rule.lockPlies && (!rule.regions || BossRules.regionAt(rule, move.to) === 'gears') ? rule.lockPlies : 0;
    if (lockPlies && this.turn === this.playerColor) this._twistLine('lock');
    // A timed lock (CastlE) lasts `lockPlies` plies after the replacement move:
    // with 4, the square stays shut for 3 of that side's turns, this one included.
    this.lockedTiles.push(lockPlies
      ? { row: move.to.row, col: move.to.col, until: this.moveHistory.length + 1 + lockPlies }
      : { row: move.to.row, col: move.to.col });
    audioManager.playTileLock();
    this.pendingRevertMove = null;
    this.selectedSquare = null;
    this.legalMoves = [];
    store.update({ board: this.board });

    // After locking a square, check if the current player is now in checkmate/stalemate
    this.checkForLockedTileGameEnd();
  },

  checkForLockedTileGameEnd() {
    const legalMoves = GameRules.getLegalMoves(this.board, this.turn);
    const availableMoves = legalMoves.filter(m => !this._isLockedSquare(m.to.row, m.to.col));

    if (availableMoves.length === 0) {
      // No legal moves that avoid locked tiles
      if (this.board.inCheck) {
        // In check with no escape = checkmate
        if (this.turn === this.aiColor && this.isAIMode && this._tryBossRewind()) return;
        this.gameOver = true;
        this.gameStatus = 'checkmate';
        this.gameResult = this.turn === 'white' ? 'black' : 'white';
        this.handleGameEnd();
        audioManager.playVictory();
      } else {
        // Not in check with no legal moves = stalemate
        this.gameOver = true;
        this.gameStatus = 'stalemate';
        this.gameResult = 'draw';
        this.handleGameEnd();
        audioManager.playGameOver();
      }
    }
  },

  finishTurnStatus() {
    const status = GameRules.getGameStatus(this.board, this.turn);
    this.gameStatus = status.status;
    if (status.status === 'checkmate' && status.winner === this.playerColor && this._tryBossRewind()) return;
    if (this.bossRule && this.bossRule.puzzles && this._puzzleMoveMade(status)) return;

    if (status.status === 'checkmate' || status.status === 'stalemate') {
      this.gameOver = true;
      this.gameResult = status.winner || 'draw';
      this.handleGameEnd();
      if (this.gameResult !== 'draw') {
        audioManager.playVictory();
        if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
          const colors = this.gameResult === 'white'
            ? [0xffd700, 0xff4444, 0xffffff, 0xffaa00]
            : [0x8844ff, 0x4444ff, 0x44aaff, 0xaa44ff];
          PixiGameScreen.spawnFireworks(Layout.cx, Layout.cy, colors);
        }
      } else {
        audioManager.playGameOver();
      }
    } else if (status.status === 'draw') {
      this.gameOver = true;
      this.gameResult = 'draw';
      this.drawReason = this._drawReason();
      this.handleGameEnd();
      audioManager.playGameOver();
    }

    if (this.gameStatus === 'check') {
      audioManager.playCheck();
      if (this.mode === 'story' && typeof DialogueManager !== 'undefined') {
        DialogueManager.onCheck(this.turn, this.aiColor, this.board);
      }
    }
    if (typeof audioManager.setSuspense === 'function') {
      audioManager.setSuspense((this.gameStatus === 'check' || !!(this.bossRule && this.bossRule.tenseMusic)) && !this.gameOver);
    }

    store.update({
      board: this.board,
      turn: this.turn,
      gameStatus: this.gameStatus,
      gameOver: this.gameOver,
      gameResult: this.gameResult,
    });
  },

  _drawReason() {
    if (this.board.halfMoveClock >= 100) return 'by the 50-move rule';
    const key = this.board.posKey();
    if (this.board.positionHistory.filter(k => k === key).length >= 3) return 'by repetition';
    return 'by insufficient material';
  },

  afterMove(move) {
    this.lastMove = { from: move.from, to: move.to };
    this.moveHistory.push(move);
    this.turn = this.turn === 'white' ? 'black' : 'white';
    this.selectedSquare = null;
    this.legalMoves = [];
    this._expireLocks();
    this.pendingRevertMove = null;
    this.finishTurnStatus();
    if (this.bossEvent) return;
    if (!this.gameOver) this._afterBossMoveChecks(move);
    this.saveSnapshot();

    if (this.mode === 'story' && typeof DialogueManager !== 'undefined') {
      if (this.moveHistory.length === 1) {
        DialogueManager.onGameStart();
      }
      DialogueManager.onMoveComplete(this.moveHistory.length, this.board, this.aiColor);
    }
  },

  doAIMove() {
    this.aiThinking = true;
    // Any undo, restart, or screen change bumps the token so a late AI answer is dropped.
    const token = this._aiToken = (this._aiToken || 0) + 1;

    if (this.mode === 'story' && typeof DialogueManager !== 'undefined') {
      DialogueManager.onAIThinkStart(this.board, this.aiColor);
    }

    // Safety net: if the engine never answers, play a random legal move.
    const safetyTimer = setTimeout(() => {
      if (token !== this._aiToken) return;
      console.error('AI safety timeout triggered — playing a fallback move');
      this._aiToken++;
      this._playAIMove(null);
    }, 12000);

    this._aiTimeout = setTimeout(async () => {
      let move = null;
      try {
        const legalMoves = this._aiLegalMoves();
        if (!this.gameOver && legalMoves.length > 0) {
          move = await AIController.getMoveAsync(this.board, this.aiColor, this.characterLevel, legalMoves);
        }
      } catch (e) {
        console.error('AIController.getMoveAsync error:', e);
      }
      if (token !== this._aiToken) return;
      clearTimeout(safetyTimer);
      this._playAIMove(move);
    }, 500 + Math.random() * 700);
  },

  _aiLegalMoves() {
    return GameRules.getLegalMoves(this.board, this.aiColor).filter(m => !this._isLockedSquare(m.to.row, m.to.col));
  },

  _playAIMove(move) {
    try {
      if (this.gameOver) { this.aiThinking = false; return; }
      const legalMoves = this._aiLegalMoves();
      if (legalMoves.length === 0) {
        this.aiThinking = false;
        // Only reachable with locked tiles; normal mates are caught after the previous move.
        if (this.board.inCheck && this._tryBossRewind()) return;
        this.gameOver = true;
        this.gameStatus = this.board.inCheck ? 'checkmate' : 'stalemate';
        this.gameResult = this.board.inCheck ? this.playerColor : 'draw';
        this.handleGameEnd();
        return;
      }
      // Only trust the engine's move if it is actually legal right now.
      const chosen = move && legalMoves.find(m =>
        m.from.row === move.from.row && m.from.col === move.from.col &&
        m.to.row === move.to.row && m.to.col === move.to.col &&
        (m.promotion || null) === (move.promotion || null));
      const finalMove = chosen || legalMoves[Math.floor(Math.random() * legalMoves.length)];

      if (this.mode === 'story' && typeof DialogueManager !== 'undefined') {
        DialogueManager.onAIThinkEnd();
      }

      if (this.playMove(finalMove, true)) {
        // A minigame is running; its callback clears aiThinking.
        this.aiCooldown = 600;
        return;
      }
      this.aiThinking = false;
    } catch (e) {
      console.error('AI move error:', e);
      this.aiThinking = false;
    }
  },

  // A world can fight in front of different art than its theme's (worlds.js `fightBackdrop`),
  // as long as the fight is in that world's theme.
  _fightBackdrop() {
    const world = this.mode === 'story' && this.currentCharacter && this.currentCharacter.world;
    return world && world.fightBackdrop && store.get('theme') === world.art ? world.fightBackdrop : null;
  },

  // Characters with live art react to what they say (happy when they take a piece...),
  // then settle back to their usual mood.
  _setCharacterMood(character, category) {
    const live = typeof LiveScenes !== 'undefined' && character && LiveScenes.character(character.id);
    if (!live) return;
    const def = LiveScenes.get(live);
    const mood = def.moodFor ? def.moodFor(category) : null;
    if (!mood) return;
    LiveScenes.setMood(live, mood);
    clearTimeout(this._moodTimer);
    this._moodTimer = setTimeout(() => LiveScenes.setMood(live, def.moods[0]), 6000);
  },

  _showDialogueBubble(text, character) {
    if (!PixiApp.stage || typeof PixiDialogueBubble === 'undefined') return;
    if (this._dialogueBubble) {
      this._dialogueBubble.dismiss();
    }
    // The opponent on its stage speaks: the bubble comes out of its mouth.
    const anchor = typeof PixiGameHud !== 'undefined' && PixiGameHud.mouthAnchor();
    if (anchor) PixiGameHud.speak();
    const bubble = new PixiDialogueBubble({
      name: character.name,
      text: text,
      colors: character.colors,
      characterId: character.id,
      cols: ThemeManager.getTheme(store.get('theme')).colors,
      duration: Math.max(4000, Math.min(7000, 2200 + text.length * 45)),
      anchor,
    });
    PixiApp.stage.addChild(bubble);
    PixiApp.stage.sortableChildren = true;
    this._dialogueBubble = bubble;
  },

  // Against the AI the player resigns; in local 1v1 the side to move resigns.
  surrender() {
    if (this.gameOver || !this.canSurrender()) return;
    const loser = this.isAIMode ? this.playerColor : this.turn;
    this._aiToken++;
    this.aiThinking = false;
    this.gameOver = true;
    this.gameStatus = 'resigned';
    this.gameResult = loser === 'white' ? 'black' : 'white';
    this.handleGameEnd();
    audioManager.playGameOver();
  },

  // Super User's W x3: the game (or trainer's test, mission, drill) ends as a
  // win on the spot. In local 1v1 the side to move wins.
  superWin() {
    if (this.gameOver || this.reviewingAt !== null) return false;
    this._aiToken = (this._aiToken || 0) + 1;
    this.aiThinking = false;
    this.promotionPending = null;
    if (this.trial && this.trial.lesson) store.setActiveSave({ lesson: null });
    this.gameOver = true;
    this.gameStatus = 'superuser';
    this.gameResult = this.isAIMode ? this.playerColor : this.turn;
    this.handleGameEnd();
    audioManager.playVictory();
    if (typeof PixiGameScreen !== 'undefined' && PixiGameScreen.initialized) {
      PixiGameScreen.spawnFireworks(Layout.cx, Layout.cy, [0xffd35a, 0xfff3c4, 0xffffff, 0xffaa00]);
    }
    store.update({ gameStatus: this.gameStatus, gameOver: true, gameResult: this.gameResult });
    return true;
  },

  // The opening Pawnie game of a new save: no surrender, and quitting is not a loss.
  canSurrender() {
    const ch = this.currentCharacter;
    const firstFight = this.mode === 'story' && ch && !ch.side && !ch.mission && ch.stage === 1 &&
      StoryProgress.firstFightPending(store.getActiveSave());
    return !firstFight;
  },

  // The Training Camp's first four trainers teach lessons: you leave one, not surrender it.
  isLesson() {
    const ch = this.currentCharacter;
    return this.mode === 'story' && !!ch && !!ch.trainer && !ch.side && ch.stage < 6;
  },

  // Leaving a lesson is no loss: back to the Training Camp's map. Joy Stick's
  // progress stays in the save, so the lesson picks up where it was left.
  leaveLesson() {
    this._aiToken = (this._aiToken || 0) + 1;
    this.aiThinking = false;
    const world = this.currentCharacter && this.currentCharacter.world;
    switchScreen(world ? 'worldMissions' : 'worldMap', world ? { world: world.id } : undefined);
  },

  // Leaving an AI game part-way counts as resigning; leaving a 1v1 game does not.
  quitToMenu() {
    if (!this.gameOver && this.isAIMode && this.moveHistory.length > 0 && this.canSurrender() && !this.isLesson()) {
      this.surrender();
    }
    switchScreen('home');
  },

  handleGameEnd() {
    this.clearSavedGame();
    if (typeof DialogueManager !== 'undefined') DialogueManager.destroy();
    if (this._dialogueBubble) { this._dialogueBubble.dismiss(); this._dialogueBubble = null; }
    // The opponent's live face reacts to the result: rattled when you win, gloating when you lose.
    if (this.mode === 'story' && this.gameResult && this.gameResult !== 'draw') {
      this._setCharacterMood(this.currentCharacter, this.playerWon() ? 'lowHealth' : 'bossCaptureBig');
    }

    // Stats are kept from Player 1's point of view (the human against the AI).
    const stats = store.get('stats');
    stats.gamesPlayed++;
    if (this.gameResult === 'draw' || !this.gameResult) stats.draws++;
    else if (this.playerWon()) stats.wins++;
    else stats.losses++;
    store.set('stats', stats);

    if (this.mode === 'story' && this.currentCharacter && this.gameResult && this.gameResult !== 'draw') {
      // Per-opponent record: rematch lines after a loss, stars after a win.
      const save = store.getActiveSave();
      const id = this.currentCharacter.id;
      const r = { wins: 0, losses: 0, ...((save.record || {})[id] || {}) };
      if (this.playerWon()) r.wins++;
      else r.losses++;
      store.setActiveSave({ record: { ...(save.record || {}), [id]: r } });
      // Stars: the win plus the opponent's two objectives; the save keeps the best.
      if (typeof StoryStars !== 'undefined' && StoryStars.has(this.currentCharacter)) {
        const ctx = StoryStars.context({
          won: this.playerWon(),
          playerColor: this.playerColor,
          aiColor: this.aiColor,
          moveHistory: this.moveHistory,
          capturedPieces: this.capturedPieces,
          bossState: this.bossState,
          trial: this.trial,
          seconds: this._fightStart ? (performance.now() - this._fightStart) / 1000 : undefined,
        });
        const got = StoryStars.evaluate(this.currentCharacter, ctx);
        const merged = StoryStars.merge(store.getActiveSave(), id, got);
        store.setActiveSave({ stars: merged.stars });
        this.starResult = { got, best: merged.best, fresh: merged.fresh, texts: StoryStars.texts(this.currentCharacter) };
      }
    }

    // Coins for a win (side matches pay their own reward below).
    this.reward = null;
    const side = this.mode === 'story' && this.currentCharacter && this.currentCharacter.side;
    if (typeof Wallet !== 'undefined' && this.playerWon() && !side) {
      const ch = this.currentCharacter;
      const reason = this.mode !== 'story' ? 'classicWin' : ch && ch.mission ? 'missionWin' : 'storyWin';
      if (this.isAIMode) this.reward = { coins: Wallet.earn(reason), stars: 0 };
    }

    const mission = this.currentCharacter && this.currentCharacter.mission;
    if (side) {
      // Tournament games, rivals, side quests and the Arena report back to their owner.
      const result = !this.gameResult || this.gameResult === 'draw' ? 'draw' : this.playerWon() ? 'win' : 'loss';
      this.reward = SideMatches.finish(this.currentCharacter, result, { moves: this.moveHistory.length });
    } else if (this.mode === 'story' && mission && this.playerWon()) {
      // The world map plays the next step of the path.
      if (StoryMissions.markCleared(mission.world.id, mission.index)) {
        store.set('missionEvent', { world: mission.world.id, index: mission.index });
      }
    } else if (this.mode === 'story' && this.playerWon()) {
      const save = store.getActiveSave();
      const stage = this.currentCharacter ? this.currentCharacter.stage : 1;
      // A first win here plays the reward on the world map (restore, fragment, travel).
      // Only your next stage moves progress on (Super User can play ahead without skipping it).
      if (this.currentCharacter.id === 'grandmasterx') {
        // He will not accept it: the Continue button plays his ascension and the last
        // game on the Great Board (FinalBoss), which finishes the story.
        if (!save.completed) store.setActiveSave({ unbound: true });
      } else if (stage === save.maxUnlockedLevel && !save.completed && this.currentCharacter.trainer && stage < 6) {
        // A lesson passed: the Training Camp's own map moves the king on to the next trainer.
        store.set('missionEvent', { world: 'trainingcamp', index: stage - 2 });
      } else if (stage === save.maxUnlockedLevel && !save.completed) {
        store.set('storyMapEvent', { stage, fragment: StoryProgress.hasFragment(stage), keepsake: typeof Keepsakes !== 'undefined' && Keepsakes.forGuardian(this.currentCharacter.id) ? this.currentCharacter.id : null });
        store.set('storyScenePending', StoryScenes.after(stage));
      }
      if (stage === save.maxUnlockedLevel && stage < CharacterManager.STAGE_COUNT) {
        save.maxUnlockedLevel = stage + 1;
        save.storyLevel = stage + 1;
        store.setActiveSave(save);
      }
    }
    store.saveProgress();
  },


  handleGameOverAction(action) {
    if (typeof audioManager !== 'undefined' && typeof audioManager.playButton === 'function') {
      audioManager.playButton();
    }
    switch (action) {
      case 'rematch':
        this.destroy();
        this.init(this._lastInitData);
        break;
      case 'menu':
        switchScreen(this.mode === 'greatboard' ? 'greatBoard' : 'home');
        break;
      case 'map': {
        // A first win plays its story scene on the way back to the map; the
        // ending leads into the Credits instead.
        if (this.currentCharacter && this.currentCharacter.side) {
          SideMatches.back(this.currentCharacter);
          break;
        }
        if (this.currentCharacter && this.currentCharacter.mission) {
          switchScreen('worldMissions', { world: this.currentCharacter.world.id });
          break;
        }
        // Beating Grandmaster X is not the end: he rises again (FinalBoss).
        if (this.currentCharacter && this.currentCharacter.id === 'grandmasterx' && this.playerWon()) {
          FinalBoss.start(true);
          break;
        }
        // Losing to a guardian goes back to its world's path.
        const home = this.currentCharacter && this.currentCharacter.world;
        if (home && StoryMissions.forWorld(home.id) && !this.playerWon()) {
          switchScreen('worldMissions', { world: home.id });
          break;
        }
        // Worlds with their own place map: back to it after a loss, or after a lesson.
        const place = home && typeof LiveScenes !== 'undefined' && LiveScenes.has('map_' + home.id);
        if (place && (!this.playerWon() || (this.currentCharacter.trainer && this.currentCharacter.stage < 6))) {
          switchScreen('worldMissions', { world: home.id });
          break;
        }
        // Tournament worlds: back to the tournament after a loss to their guardian.
        if (home && typeof Tournaments !== 'undefined' && Tournaments.forWorld(home.id) && !this.playerWon()) {
          switchScreen('tournament', { world: home.id });
          break;
        }
        const scene = store.get('storyScenePending');
        store.set('storyScenePending', null);
        if (scene === 'ending') switchScreen('storyScene', { scene, next: 'credits', nextData: { returnTo: 'worldMap' } });
        else if (scene) switchScreen('storyScene', { scene, next: 'worldMap' });
        else switchScreen('worldMap');
        break;
      }
    }
  },
};
