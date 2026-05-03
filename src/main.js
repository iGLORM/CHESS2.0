const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const miniCanvas = document.getElementById('miniGameOverlay');
const miniCtx = miniCanvas.getContext('2d');
miniCtx.imageSmoothingEnabled = false;

let currentScreen = null;
let lastTime = 0;

const screens = {};

function registerScreen(name, screenImpl) {
  screens[name] = screenImpl;
}

function switchScreen(name, data) {
  if (currentScreen && currentScreen.destroy) {
    currentScreen.destroy();
  }
  miniCanvas.classList.remove('active');
  store.set('screen', name);
  currentScreen = screens[name];
  if (currentScreen && currentScreen.init) {
    currentScreen.init(data);
  }
}

function gameLoop(timestamp) {
  const dt = lastTime ? (timestamp - lastTime) / 1000 : 0.016;
  lastTime = timestamp;

  ctx.clearRect(0, 0, 1280, 800);

  if (currentScreen && currentScreen.render) {
    currentScreen.render(ctx, dt);
  }

  requestAnimationFrame(gameLoop);
}

function initApp() {
  registerScreen('home', HomeScreen);
  registerScreen('modeSelect', ModeSelect);
  registerScreen('themeSelect', ThemeSelect);
  registerScreen('characterSelect', CharacterSelect);
  registerScreen('game', GameScreen);
  registerScreen('settings', SettingsScreen);

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
    const { x, y } = getMousePos(e, canvas);

    if (store.get('miniGameActive')) {
      miniGameManager.handleClick(x, y);
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
    if (currentScreen && currentScreen.handleMouseMove) {
      currentScreen.handleMouseMove(x, y);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (store.get('miniGameActive')) {
      miniGameManager.handleKey(e.key);
      e.preventDefault();
      return;
    }
    if (currentScreen && currentScreen.handleKeyDown) {
      currentScreen.handleKeyDown(e);
    }
  });

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
