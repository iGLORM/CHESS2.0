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

function switchScreen(name, data) {
  if (transition.active) return;
  canvas.style.zIndex = '2';
  transition.active = true;
  transition.fadeOut = true;
  transition.alpha = 0;
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

  store.set('screen', transition.nextScreen);
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

function resizeCanvas() {
  canvas.width = Layout.W;
  canvas.height = Layout.H;
  miniCanvas.width = Layout.W;
  miniCanvas.height = Layout.H;
}

function gameLoop(timestamp) {
  const dt = lastTime ? (timestamp - lastTime) / 1000 : 0.016;
  lastTime = timestamp;

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
    ctx.fillStyle = `rgba(0,0,0,${transition.alpha})`;
    ctx.fillRect(0, 0, Layout.W, Layout.H);
  }

  rafId = requestAnimationFrame(gameLoop);
}

function initApp() {
  Layout.init();

  const initialTheme = store.get('theme') || 'space';
  TextureManager.preloadTheme(initialTheme);
  TextureManager.preloadCharacters();

  registerScreen('home', HomeScreen);
  registerScreen('modeSelect', ModeSelect);
  registerScreen('themeSelect', ThemeSelect);
  registerScreen('characterSelect', CharacterSelect);
  registerScreen('game', GameScreen);
  registerScreen('settings', SettingsScreen);
  registerScreen('miniGamePractice', MiniGamePractice);
  registerScreen('howToPlay', HowToPlay);
  registerScreen('botSelect', BotSelect);
  registerScreen('customGame', CustomGameScreen);
  registerScreen('stats', StatsScreen);
  registerScreen('controls', ControlsScreen);
  registerScreen('trainingHub', TrainingHubScreen);
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
    if (e.key === 'F11') {
      e.preventDefault();
      if (window.electron && window.electron.toggleFullscreen) {
        window.electron.toggleFullscreen();
      }
      return;
    }
    if (e.key === 'F12') {
      e.preventDefault();
      if (typeof ScreenshotCapture !== 'undefined') {
        ScreenshotCapture.captureAll();
      }
      return;
    }
    if (store.get('miniGameActive')) {
      miniGameManager.handleKey(e.key);
      e.preventDefault();
      return;
    }
    if (currentScreen && currentScreen.handleKeyDown) {
      currentScreen.handleKeyDown(e);
    }
  });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      Layout.detect();
      resizeCanvas();
      if (typeof PixiApp !== 'undefined') {
        PixiApp.resize();
      }
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

  const fontsReady = document.fonts && document.fonts.ready
    ? Promise.race([
      document.fonts.ready,
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
    switchScreen('home');
  });

  // Initialize audio on first user interaction
  function initAudio() {
    audioManager.init();
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
