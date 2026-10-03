class Store {
  constructor() {
    this.state = {
      screen: 'home',
      mode: null,
      subScreen: null,
      theme: 'chess20',       // the theme on screen now (in story mode: the world you are in)
      menuTheme: 'chess20',   // the player's own pick, used everywhere outside story mode
      board: null,
      selectedSquare: null,
      legalMoves: [],
      turn: 'white',
      gameStatus: 'idle',
      history: [],
      capturedPieces: { white: [], black: [] },
      miniGamesEnabled: true,
      miniGameActive: false,
      lastCapture: null,
      controls: {
        p1: { type: 'mouse' },
        p2: { type: 'mouse' },
      },
      storyLevel: 1,
      maxUnlockedLevel: 1,
      activeSaveSlot: 1,
      storySaves: [
        { storyLevel: 1, maxUnlockedLevel: 1, selectedCharacter: null, difficultyTier: null, completed: false, stages: 15 },
        { storyLevel: 1, maxUnlockedLevel: 1, selectedCharacter: null, difficultyTier: null, completed: false, stages: 15 },
        { storyLevel: 1, maxUnlockedLevel: 1, selectedCharacter: null, difficultyTier: null, completed: false, stages: 15 },
      ],
      madnessUnlocked: false,
      // Super User (press T ten times): everything shows as unlocked; progress is untouched.
      superUser: false,
      settings: {
        audioEnabled: true,
        miniGamesEnabled: true,
        animationSpeed: 1,
        musicVolume: 0.5,
        sfxVolume: 0.5,
      },
      selectedCharacter: null,
      customDifficulty: 5,
      customPlayAs: 'white',
      customMinigames: {},
      customThemeColors: {},
      customMusicTheme: 'pawnhollow',
      customBgTheme: 'pawnhollow',
      // Themes kept from before the story worlds (world themes unlock by
      // restoring worlds; see ThemeManager.isThemeUnlocked).
      unlockedThemes: [],
      // Coins and cosmetics for the whole game (src/state/Wallet.js).
      wallet: { coins: 0, owned: [], planePaint: null, token: null },
      whitePlayer: 'Player 1',
      blackPlayer: 'Player 2',
      p1IsWhite: true,
      moveCount: 0,
      gameOver: false,
      gameResult: null,
      animating: false,
      promotionPending: null,
      stats: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        captures: 0,
        miniGamesPlayed: 0,
        miniGamesWon: 0,
      },
      trainingProgress: {
        unlockedBand: 1,
        unlockedLevel: 1,
        totalStars: 0,
        currentStreak: 0,
        bestStreak: 0,
        lastPlayedDate: null,
        levels: {},
        coachMemory: { missedTags: {} },
        customPuzzles: [],
      },
    };
    this.listeners = {};
    this.loadProgress();
    this._syncStoryKeys();
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    const old = this.state[key];
    this.state[key] = value;
    this.notify(key, value, old);
  }

  update(updates) {
    for (const key in updates) {
      const old = this.state[key];
      this.state[key] = updates[key];
      this.notify(key, updates[key], old);
    }
  }

  on(key, fn) {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(fn);
    return () => {
      this.listeners[key] = this.listeners[key].filter(l => l !== fn);
    };
  }

  notify(key, val, old) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(fn => fn(val, old));
    }
  }

  saveProgress() {
    try {
      localStorage.setItem('chess2_progress', JSON.stringify({
        maxUnlockedLevel: this.state.maxUnlockedLevel,
        storyLevel: this.state.storyLevel,
        selectedCharacter: this.state.selectedCharacter,
        activeSaveSlot: this.state.activeSaveSlot,
        storySaves: this.state.storySaves,
        madnessUnlocked: this.state.madnessUnlocked,
        superUser: this.state.superUser,
        settings: this.state.settings,
        controls: this.state.controls,
        theme: this.state.theme,
        menuTheme: this.state.menuTheme,
        customThemeColors: this.state.customThemeColors,
        customMusicTheme: this.state.customMusicTheme,
        customBgTheme: this.state.customBgTheme,
        unlockedThemes: this.state.unlockedThemes,
        wallet: this.state.wallet,
        stats: this.state.stats,
        trainingProgress: this.state.trainingProgress,
        // Player names and last-used Classic/Custom game options.
        prefs: Object.fromEntries(Store.PREF_KEYS.map(k => [k, this.state[k]])),
      }));
    } catch (e) { console.warn('Store: failed to save progress', e.message); }
  }

  // Saves from before the Training Camp counted 10 levels. Five trainer stages
  // now sit after Pawnie, so level n (n > 1) becomes stage n + 5.
  static migrateSave(save) {
    if (!save || save.stages === 15) return save;
    const toStage = level => (level <= 1 ? 1 : level + 5);
    return {
      ...save,
      storyLevel: toStage(save.storyLevel || 1),
      maxUnlockedLevel: toStage(save.maxUnlockedLevel || 1),
      stages: 15,
    };
  }

  // Saves from before the story worlds unlocked themes by story level. Keep
  // what they had open, under the worlds' new ids.
  static legacyThemeUnlocks(saves) {
    const reqs = { space: 1, medieval: 1, ocean: 1, crystal: 1, egypt: 2, cyberpunk: 4, japanese: 5, artdeco: 6, wildwest: 7, prehistoric: 8, steampunk: 9 };
    const level = Math.max(...saves.map(save => {
      const stage = (save && save.maxUnlockedLevel) || 1;
      return stage > 6 ? stage - 5 : 1;
    }));
    return Object.keys(reqs).filter(id => level >= reqs[id]).map(id => THEME_ALIASES[id] || id);
  }

  loadProgress() {
    try {
      const data = JSON.parse(localStorage.getItem('chess2_progress'));
      if (data) {
        // Migrate old flat save format into slot 1
        if (!data.storySaves && data.maxUnlockedLevel) {
          this.state.storySaves[0] = Store.migrateSave({
            storyLevel: data.storyLevel || 1,
            maxUnlockedLevel: data.maxUnlockedLevel || 1,
            selectedCharacter: data.selectedCharacter || null,
            difficultyTier: null,
            completed: (data.maxUnlockedLevel || 1) >= 10,
          });
        }
        if (data.storySaves) {
          for (let i = 0; i < 3; i++) {
            if (data.storySaves[i]) {
              this.state.storySaves[i] = { ...this.state.storySaves[i], ...Store.migrateSave(data.storySaves[i]) };
            }
          }
        }
        if (data.madnessUnlocked) {
          this.state.madnessUnlocked = data.madnessUnlocked;
        }
        if (data.activeSaveSlot) {
          this.state.activeSaveSlot = data.activeSaveSlot;
        }
        this.state.superUser = !!data.superUser;
        this.state.settings = { ...this.state.settings, ...data.settings };
        this.state.controls = data.controls || this.state.controls;
        this.state.theme = ThemeManager.resolveId(data.theme);
        // Saves from before story mode had its own themes: the last theme is the pick.
        this.state.menuTheme = ThemeManager.resolveId(data.menuTheme || data.theme);
        this.state.customThemeColors = data.customThemeColors || {};
        this.state.customMusicTheme = ThemeManager.resolveId(data.customMusicTheme);
        this.state.customBgTheme = ThemeManager.resolveBackdrop(data.customBgTheme);
        this.state.unlockedThemes = data.unlockedThemes || Store.legacyThemeUnlocks(this.state.storySaves);
        this.state.stats = { ...this.state.stats, ...data.stats };
        if (data.wallet) this.state.wallet = { ...this.state.wallet, ...data.wallet };
        if (data.prefs) {
          for (const k of Store.PREF_KEYS) {
            if (data.prefs[k] !== undefined && data.prefs[k] !== null) this.state[k] = data.prefs[k];
          }
        }
        if (data.trainingProgress) {
          this.state.trainingProgress = { ...this.state.trainingProgress, ...data.trainingProgress };
        }
      }
    } catch (e) { console.warn('Store: failed to load progress', e.message); }
  }

  resetProgress() {
    this.state.storySaves = [
      { storyLevel: 1, maxUnlockedLevel: 1, selectedCharacter: null, difficultyTier: null, completed: false, stages: 15 },
      { storyLevel: 1, maxUnlockedLevel: 1, selectedCharacter: null, difficultyTier: null, completed: false, stages: 15 },
      { storyLevel: 1, maxUnlockedLevel: 1, selectedCharacter: null, difficultyTier: null, completed: false, stages: 15 },
    ];
    this.state.madnessUnlocked = false;
    this.state.superUser = false;
    this.state.unlockedThemes = [];
    this.state.wallet = { coins: 0, owned: [], planePaint: null, token: null };
    this.state.activeSaveSlot = 1;
    this._syncStoryKeys();
    localStorage.removeItem('chess2_progress');
    this.saveProgress();
  }

  getActiveSave() {
    return this.state.storySaves[this.state.activeSaveSlot - 1];
  }

  setActiveSave(updates) {
    const idx = this.state.activeSaveSlot - 1;
    this.state.storySaves[idx] = { ...this.state.storySaves[idx], ...updates };
    this._syncStoryKeys();
  }

  setActiveSlot(slot) {
    this.state.activeSaveSlot = Math.max(1, Math.min(3, slot));
    this._syncStoryKeys();
  }

  _syncStoryKeys() {
    const save = this.getActiveSave();
    if (save) {
      this.state.storyLevel = save.storyLevel;
      this.state.maxUnlockedLevel = save.maxUnlockedLevel;
      this.state.selectedCharacter = save.selectedCharacter;
    }
  }
}

Store.PREF_KEYS = ['whitePlayer', 'blackPlayer', 'classicElo', 'classicDifficulty', 'customElo', 'customDifficulty', 'customPlayAs', 'customGameplayMode', 'customMinigames'];

const store = new Store();
