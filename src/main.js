window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const miniCanvas = document.getElementById('miniGameOverlay');
const miniCtx = miniCanvas.getContext('2d');
miniCtx.imageSmoothingEnabled = false;

let currentScreen = null;
let lastTime = 0;
let rafId = null;
let resizeTimer = null;
let transition = { active: false, alpha: 0, fadeOut: true, nextScreen: null, nextData: null, speed: 4 };

const screens = {};

function registerScreen(name, screenImpl) {
  screens[name] = screenImpl;
}

// opts.instant skips the fade to black: the screen that calls it has already drawn
// its own transition (the world map zooming into a place map).
function switchScreen(name, data, opts = {}) {
  if (transition.active) return;
  canvas.style.zIndex = '2';
  transition.active = true;
  transition.fadeOut = true;
  transition.instant = !!opts.instant;
  transition.alpha = transition.instant ? 1 : 0;
  transition.nextScreen = name;
  transition.nextData = data;
}

function _doSwitchScreen() {
  if (currentScreen && currentScreen.destroy) {
    currentScreen.destroy();
  }
  miniCanvas.classList.remove('active');

  // Cleanup menu background when leaving menu screens
  const isMenuScreen = transition.nextScreen !== 'game';
  if (!isMenuScreen && typeof PixiMenuBackground !== 'undefined') {
    PixiMenuBackground.destroy();
  }

  if (typeof ThemeManager !== 'undefined') ThemeManager.syncForScreen(transition.nextScreen);
  store.set('screen', transition.nextScreen);
  window.currentScreenData = transition.nextData;   // lets a screen be rebuilt as it was (Super User)
  currentScreen = screens[transition.nextScreen];
  if (currentScreen && currentScreen.init) {
    currentScreen.init(transition.nextData);
  }

  // Initialize menu background for non-game screens
  if (isMenuScreen && typeof PixiMenuBackground !== 'undefined') {
    PixiMenuBackground.init();
  }
  if (currentScreen && currentScreen.isPixiScreen) {
    canvas.style.pointerEvents = 'none';
  } else {
    canvas.style.pointerEvents = 'auto';
    canvas.style.zIndex = '2';
  }
}

let currentRenderScale = 1;

function resizeCanvas() {
  currentRenderScale = Layout.renderScale;
  canvas.width = Math.round(Layout.W * currentRenderScale);
  canvas.height = Math.round(Layout.H * currentRenderScale);
  miniCanvas.width = canvas.width;
  miniCanvas.height = canvas.height;
  ctx.imageSmoothingEnabled = false;
  miniCtx.imageSmoothingEnabled = false;
  // Drawn below the screen's resolution: let the page smooth the picture up
  // instead of doubling uneven pixel columns.
  const smooth = currentRenderScale < Layout.nativeRenderScale - 0.01;
  for (const c of [canvas, miniCanvas, document.getElementById('pixiCanvas')]) {
    if (c) c.style.imageRendering = smooth ? 'auto' : '';
  }
}

// Frames are capped (60 per second by default, Settings > Display > Frame Limit).
// The desktop app draws as fast as asked, whatever the screen's refresh rate.
const framePacer = Graphics.pacer();
// The Canvas 2D overlay is full screen size; touching it makes the browser
// composite it again, so it is only cleared when something was drawn on it.
let overlayDirty = true;

function gameLoop(timestamp) {
  rafId = requestAnimationFrame(gameLoop);
  if (!framePacer.ready(timestamp)) return;
  drawFrame(timestamp);
  // Pixi draws after the screens' per-frame updates (its own ticker is stopped, PixiApp).
  if (PixiApp.initialized) PixiApp.app.ticker.update(timestamp);
}

function drawFrame(timestamp) {
  const dt = lastTime ? (timestamp - lastTime) / 1000 : 0.016;
  lastTime = timestamp;
  if (typeof Graphics !== 'undefined') Graphics.tick(timestamp);

  const pixiOnly = currentScreen && currentScreen.isPixiScreen;
  const screenDraws = currentScreen && !pixiOnly && (!currentScreen.drawsOverlay || currentScreen.drawsOverlay());
  if (!screenDraws && !PauseMenu.visible && !transition.active) {
    if (overlayDirty) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      overlayDirty = false;
    }
    try {
      // A hybrid screen still runs its per-frame logic; it draws nothing on the overlay.
      if (pixiOnly && currentScreen.pixiUpdate) currentScreen.pixiUpdate(dt);
      else if (currentScreen && currentScreen.render) currentScreen.render(ctx, dt);
    } catch (e) {
      console.error('Screen render error:', e);
    }
    return;
  }
  overlayDirty = true;

  const scaleX = canvas.width / Layout.W;
  const scaleY = canvas.height / Layout.H;
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  ctx.clearRect(0, 0, Layout.W, Layout.H);

  try {
    if (currentScreen && currentScreen.isPixiScreen) {
      if (currentScreen.pixiUpdate) currentScreen.pixiUpdate(dt);
    } else if (currentScreen && currentScreen.render) {
      currentScreen.render(ctx, dt);
    }
  } catch (e) {
    console.error('Screen render error:', e);
  }

  try {
    if (PauseMenu.visible) {
      PauseMenu.render(ctx, dt);
    }
  } catch (e) {
    console.error('PauseMenu render error:', e);
  }

  // Screen transition fade
  if (transition.active) {
    if (transition.fadeOut) {
      transition.alpha += dt * transition.speed;
      if (transition.alpha >= 1) {
        transition.alpha = 1;
        transition.fadeOut = false;
        try {
          _doSwitchScreen();
        } catch (e) {
          console.error('Screen switch error:', e);
        }
        if (transition.instant) {
          transition.instant = false;
          transition.alpha = 0;
          transition.active = false;
          if (currentScreen && currentScreen.isPixiScreen) canvas.style.zIndex = '0';
        }
      }
    } else {
      transition.alpha -= dt * transition.speed;
      if (transition.alpha <= 0) {
        transition.alpha = 0;
        transition.active = false;
        if (currentScreen && currentScreen.isPixiScreen) {
          canvas.style.zIndex = '0';
        }
      }
    }
    if (!transition.instant) {
      ctx.fillStyle = `rgba(0,0,0,${transition.alpha})`;
      ctx.fillRect(0, 0, Layout.W, Layout.H);
    }
  }
}

function initApp() {
  Layout.init();

  // The game opens outside story mode, on the player's own theme.
  store.set('theme', ThemeManager.menuThemeId());
  const initialTheme = store.get('theme') || 'chess20';
  TextureManager.preloadTheme(initialTheme);
  TextureManager.preloadCharacters();

  registerScreen('home', HomeScreen);
  registerScreen('modeSelect', ModeSelect);
  registerScreen('themeSelect', ThemeSelect);
  registerScreen('characterSelect', CharacterSelect);
  registerScreen('worldMap', WorldMapScreen);
  registerScreen('storyScene', StoryScene);
  registerScreen('worldMissions', WorldMissionsScreen);
  registerScreen('tournament', TournamentScreen);
  registerScreen('shop', ShopScreen);
  registerScreen('game', GameScreen);
  registerScreen('settings', SettingsScreen);
  registerScreen('miniGamePractice', MiniGamePractice);
  registerScreen('howToPlay', HowToPlay);
  registerScreen('credits', CreditsScreen);
  registerScreen('botSelect', BotSelect);
  registerScreen('customGame', CustomGameScreen);
  registerScreen('stats', StatsScreen);
  registerScreen('controls', ControlsScreen);
  registerScreen('trainingHub', TrainingHubScreen);
  registerScreen('playMenu', PlayMenuScreen);
  registerScreen('greatBoard', GreatBoardScreen);
  registerScreen('levelSelect', LevelSelectScreen);
  registerScreen('puzzle', PuzzleScreen);
  registerScreen('boardEditor', BoardEditorScreen);

  function getMousePos(e, el) {
    const rect = el.getBoundingClientRect();
    const scaleX = Layout.W / rect.width;
    const scaleY = Layout.H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  canvas.addEventListener('click', (e) => {
    if (transition.active) return;
    const { x, y } = getMousePos(e, canvas);

    if (store.get('miniGameActive')) {
      miniGameManager.handleClick(x, y);
      return;
    }
    if (PauseMenu.visible) {
      PauseMenu.handleClick(x, y);
      return;
    }
    if (currentScreen && currentScreen.isPixiScreen) return;
    if (currentScreen && currentScreen.handleClick) {
      currentScreen.handleClick(x, y);
    }
  });

  // Also handle clicks on the mini-game overlay
  miniCanvas.addEventListener('click', (e) => {
    if (store.get('miniGameActive')) {
      const { x, y } = getMousePos(e, miniCanvas);
      miniGameManager.handleClick(x, y);
    }
  });

  for (const [event, type] of [['pointerdown', 'down'], ['pointermove', 'move'], ['pointerup', 'up']]) {
    miniCanvas.addEventListener(event, (e) => {
      if (!store.get('miniGameActive')) return;
      const { x, y } = getMousePos(e, miniCanvas);
      miniGameManager.handlePointer(type, x, y);
    });
  }
  miniCanvas.style.touchAction = 'none';

  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = getMousePos(e, canvas);
    if (PauseMenu.visible && PauseMenu.handleMouseMove) {
      PauseMenu.handleMouseMove(x, y);
    } else if (currentScreen && currentScreen.handleMouseMove) {
      currentScreen.handleMouseMove(x, y);
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    if (transition.active) return;
    const { x, y } = getMousePos(e, canvas);
    if (currentScreen && currentScreen.handleMouseDown) {
      currentScreen.handleMouseDown(x, y);
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (currentScreen && currentScreen.handleMouseUp) {
      currentScreen.handleMouseUp();
    }
  });

  canvas.addEventListener('wheel', (e) => {
    if (transition.active) return;
    if (currentScreen && currentScreen.handleWheel) {
      e.preventDefault();
      currentScreen.handleWheel(e);
    }
  }, { passive: false });

  // Touch events for mobile/tablet support
  canvas.addEventListener('touchstart', (e) => {
    if (transition.active) return;
    const touch = e.touches[0];
    if (!touch) return;
    const { x, y } = getMousePos(touch, canvas);
    if (currentScreen && currentScreen.handleMouseDown) {
      currentScreen.handleMouseDown(x, y);
    }
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    if (currentScreen && currentScreen.handleMouseUp) {
      currentScreen.handleMouseUp();
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    const { x, y } = getMousePos(touch, canvas);
    if (PauseMenu.visible && PauseMenu.handleMouseMove) {
      PauseMenu.handleMouseMove(x, y);
    } else if (currentScreen && currentScreen.handleMouseMove) {
      currentScreen.handleMouseMove(x, y);
    }
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    // F11, or Alt+Enter as most Windows games use.
    if (e.key === 'F11' || (e.key === 'Enter' && e.altKey)) {
      e.preventDefault();
      if (window.electron && window.electron.toggleFullscreen) {
        window.electron.toggleFullscreen();
      }
      return;
    }
    if (SuperUser.handleWinKey(e, currentScreen)) { e.preventDefault(); return; }
    if (store.get('miniGameActive')) {
      miniGameManager.handleKey(e.key);
      e.preventDefault();
      return;
    }
    if (SuperUser.handleKey(e)) return;
    if (currentScreen && currentScreen.handleKeyDown) {
      currentScreen.handleKeyDown(e);
    }
  });

  document.addEventListener('keyup', (e) => {
    if (store.get('miniGameActive')) miniGameManager.handleKeyUp(e.key);
    else if (currentScreen && currentScreen.handleKeyUp) currentScreen.handleKeyUp(e);
  });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const previousScale = currentRenderScale;
      const layoutChanged = Layout.detect();
      resizeCanvas();
      if (typeof PixiApp !== 'undefined') {
        PixiApp.resize();
      }
      // Rebuild screens on rotation, and at the new sharpness since text is
      // rasterised when a screen is built.
      if (layoutChanged || currentRenderScale !== previousScale) Layout._notify();
    }, 150);
  });

  Layout.onChange(() => {
    resizeCanvas();
    if (typeof PixiApp !== 'undefined') PixiApp.resize();
    if (typeof PixiScreenManager !== 'undefined') PixiScreenManager.onLayoutChange();
    if (!currentScreen) return;
    if (store.get('miniGameActive')) return;
    if (currentScreen === screens['game'] && currentScreen.rebuildVisuals) {
      currentScreen.rebuildVisuals();
    } else if (currentScreen.destroy && currentScreen.init) {
      const data = currentScreen._lastInitData;
      currentScreen.destroy();
      currentScreen.init(data);
    }
  });

  resizeCanvas();

  // Keep the language the game started in (the system's, for a new player).
  const startSettings = store.get('settings') || {};
  if (startSettings.language !== I18n.lang) store.set('settings', { ...startSettings, language: I18n.lang });

  // Text is baked into textures when a screen is built, so wait for the pixel
  // fonts before the first screen or it renders in a fallback font.
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.race([
      Promise.all([
        document.fonts.load('16px "Pixelify Sans"'),
        document.fonts.load('500 16px "Pixelify Sans"'),
        document.fonts.load('600 16px "Pixelify Sans"'),
        document.fonts.load('bold 16px "Pixelify Sans"'),
        document.fonts.load('16px "Silkscreen"'),
        document.fonts.load('bold 16px "Silkscreen"'),
        I18n.loadFonts(),
        I18n.ready,
      ]).catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 2500)),
    ])
    : Promise.resolve();

  // Initialize PixiJS (async for v8)
  const pixiReady = (typeof PixiApp !== 'undefined') ? PixiApp.init() : Promise.resolve();
  pixiReady.then(async () => {
    await fontsReady;
    if (typeof PixiScreenManager !== 'undefined') {
      PixiScreenManager.init();
    }
    if (typeof PixiPremiumAssets !== 'undefined' && PixiPremiumAssets.preloadAll) {
      PixiPremiumAssets.preloadAll();
    }
    if (typeof Graphics !== 'undefined') Graphics.apply();
    switchScreen('home');
  });

  // Start the music right away. Electron allows it (see main.js); browsers and
  // Telegram keep the audio suspended until the first click or key, below.
  audioManager.init();
  audioManager.startMusic();
  function initAudio() {
    audioManager.init();
    if (audioManager.ctx && audioManager.ctx.state === 'suspended') audioManager.ctx.resume();
    audioManager.startMusic();
    document.removeEventListener('click', initAudio);
    document.removeEventListener('keydown', initAudio);
  }
  document.addEventListener('click', initAudio, { once: true });
  document.addEventListener('keydown', initAudio, { once: true });

  window.addEventListener('beforeunload', () => {
    if (rafId) cancelAnimationFrame(rafId);
  });

  rafId = requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', initApp);
