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
      settings: {
        audioEnabled: true,
        miniGamesEnabled: true,
        animationSpeed: 1,
      },
      selectedCharacter: null,
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
        settings: this.state.settings,
        controls: this.state.controls,
        theme: this.state.theme,
        customThemeColors: this.state.customThemeColors,
        customMusicTheme: this.state.customMusicTheme,
        customBgTheme: this.state.customBgTheme,
        stats: this.state.stats,
      }));
    } catch (e) {}
  }

  loadProgress() {
    try {
      const data = JSON.parse(localStorage.getItem('chess2_progress'));
      if (data) {
        this.state.maxUnlockedLevel = data.maxUnlockedLevel || 1;
        this.state.storyLevel = data.storyLevel || 1;
        this.state.selectedCharacter = data.selectedCharacter || null;
        this.state.settings = { ...this.state.settings, ...data.settings };
        this.state.controls = data.controls || this.state.controls;
        this.state.theme = data.theme || 'space';
        this.state.customThemeColors = data.customThemeColors || {};
        this.state.customMusicTheme = data.customMusicTheme || 'space';
        this.state.customBgTheme = data.customBgTheme || 'space';
        this.state.stats = { ...this.state.stats, ...data.stats };
      }
    } catch (e) {}
  }

  resetProgress() {
    this.state.maxUnlockedLevel = 1;
    this.state.storyLevel = 1;
    localStorage.removeItem('chess2_progress');
    this.saveProgress();
  }
}

const store = new Store();
