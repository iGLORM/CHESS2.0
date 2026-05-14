class Store {
  constructor() {
    this.state = {
      screen: 'home',
      mode: null,
      subScreen: null,
      theme: 'space',
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
        { storyLevel: 1, maxUnlockedLevel: 1, selectedCharacter: null, difficultyTier: null, completed: false },
        { storyLevel: 1, maxUnlockedLevel: 1, selectedCharacter: null, difficultyTier: null, completed: false },
        { storyLevel: 1, maxUnlockedLevel: 1, selectedCharacter: null, difficultyTier: null, completed: false },
      ],
      madnessUnlocked: false,
      settings: {
        audioEnabled: true,
        miniGamesEnabled: true,
        animationSpeed: 1,
        bossThemeEnabled: true,
      },
      selectedCharacter: null,
      customDifficulty: 5,
      customPlayAs: 'white',
      customMinigames: {},
      customThemeColors: {},
      customMusicTheme: 'space',
      customBgTheme: 'space',
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
        settings: this.state.settings,
        controls: this.state.controls,
        theme: this.state.theme,
        customThemeColors: this.state.customThemeColors,
        customMusicTheme: this.state.customMusicTheme,
        customBgTheme: this.state.customBgTheme,
        stats: this.state.stats,
      }));
    } catch (e) { console.warn('Store: failed to save progress', e.message); }
  }

  loadProgress() {
    try {
      const data = JSON.parse(localStorage.getItem('chess2_progress'));
      if (data) {
        // Migrate old flat save format into slot 1
        if (!data.storySaves && data.maxUnlockedLevel) {
          this.state.storySaves[0] = {
            storyLevel: data.storyLevel || 1,
            maxUnlockedLevel: data.maxUnlockedLevel || 1,
            selectedCharacter: data.selectedCharacter || null,
            difficultyTier: null,
            completed: (data.maxUnlockedLevel || 1) >= 10,
          };
        }
        if (data.storySaves) {
          for (let i = 0; i < 3; i++) {
            if (data.storySaves[i]) {
              this.state.storySaves[i] = { ...this.state.storySaves[i], ...data.storySaves[i] };
            }
          }
        }
        if (data.madnessUnlocked) {
          this.state.madnessUnlocked = data.madnessUnlocked;
        }
        if (data.activeSaveSlot) {
          this.state.activeSaveSlot = data.activeSaveSlot;
        }
        this.state.settings = { ...this.state.settings, ...data.settings };
        this.state.controls = data.controls || this.state.controls;
        this.state.theme = data.theme || 'space';
        this.state.customThemeColors = data.customThemeColors || {};
        this.state.customMusicTheme = data.customMusicTheme || 'space';
        this.state.customBgTheme = data.customBgTheme || 'space';
        this.state.stats = { ...this.state.stats, ...data.stats };
      }
    } catch (e) { console.warn('Store: failed to load progress', e.message); }
  }

  resetProgress() {
    this.state.storySaves = [
      { storyLevel: 1, maxUnlockedLevel: 1, selectedCharacter: null, difficultyTier: null, completed: false },
      { storyLevel: 1, maxUnlockedLevel: 1, selectedCharacter: null, difficultyTier: null, completed: false },
      { storyLevel: 1, maxUnlockedLevel: 1, selectedCharacter: null, difficultyTier: null, completed: false },
    ];
    this.state.madnessUnlocked = false;
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

const store = new Store();
