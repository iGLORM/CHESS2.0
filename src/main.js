const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const miniCanvas = document.getElementById('miniGameOverlay');
const miniCtx = miniCanvas.getContext('2d');
miniCtx.imageSmoothingEnabled = false;

let currentScreen = null;
let lastTime = 0;
let transition = { active: false, alpha: 0, fadeOut: true, nextScreen: null, nextData: null, speed: 4 };

const screens = {};

function registerScreen(name, screenImpl) {
  screens[name] = screenImpl;
}

function switchScreen(name, data) {
  if (transition.active) return;
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
  store.set('screen', transition.nextScreen);
  currentScreen = screens[transition.nextScreen];
  if (currentScreen && currentScreen.init) {
    currentScreen.init(transition.nextData);
  }
}

function resizeCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  miniCanvas.width = w;
  miniCanvas.height = h;
}

function gameLoop(timestamp) {
  const dt = lastTime ? (timestamp - lastTime) / 1000 : 0.016;
  lastTime = timestamp;

  const scaleX = canvas.width / 1280;
  const scaleY = canvas.height / 800;
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  ctx.clearRect(0, 0, 1280, 800);

  if (currentScreen && currentScreen.render) {
    currentScreen.render(ctx, dt);
  }

  // Render pause menu on top of game screen
  if (PauseMenu.visible) {
    PauseMenu.render(ctx, dt);
  }

  // Screen transition fade
  if (transition.active) {
    if (transition.fadeOut) {
      transition.alpha += dt * transition.speed;
      if (transition.alpha >= 1) {
        transition.alpha = 1;
        transition.fadeOut = false;
        _doSwitchScreen();
      }
    } else {
      transition.alpha -= dt * transition.speed;
      if (transition.alpha <= 0) {
        transition.alpha = 0;
        transition.active = false;
      }
    }
    ctx.fillStyle = `rgba(0,0,0,${transition.alpha})`;
    ctx.fillRect(0, 0, 1280, 800);
  }

  requestAnimationFrame(gameLoop);
}

function initApp() {
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

  function getMousePos(e, el) {
    const rect = el.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 800 / rect.height;
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
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 800 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
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
      ScreenshotCapture.captureAll();
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

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  switchScreen('home');

  // Initialize audio on first user interaction
  function initAudio() {
    audioManager.init();
    audioManager.startMusic();
    document.removeEventListener('click', initAudio);
    document.removeEventListener('keydown', initAudio);
  }
  document.addEventListener('click', initAudio, { once: true });
  document.addEventListener('keydown', initAudio, { once: true });

  requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', initApp);
