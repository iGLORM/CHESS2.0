const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// CHESS2_HEADLESS=1 runs the game in a hidden window (for automated testing
// over --remote-debugging-port) without pausing rendering in the background.
const HEADLESS = !!process.env.CHESS2_HEADLESS;

// Window preferences (fullscreen) persist between launches.
const prefsPath = () => path.join(app.getPath('userData'), 'window.json');

function loadPrefs() {
  try {
    return JSON.parse(fs.readFileSync(prefsPath(), 'utf8'));
  } catch (_) {
    return { fullscreen: true };
  }
}

function savePrefs(prefs) {
  try {
    fs.writeFileSync(prefsPath(), JSON.stringify(prefs));
  } catch (_) { /* not fatal */ }
}

let mainWin = null;

function createWindow() {
  const prefs = loadPrefs();
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    useContentSize: true,
    resizable: true,
    fullscreenable: true,
    fullscreen: !HEADLESS && prefs.fullscreen !== false,
    backgroundColor: '#000000',
    title: 'Chess 2.0',
    show: false,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: !HEADLESS,
      devTools: !app.isPackaged,
    },
    icon: path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
  });

  win.setMenu(null);
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  // Show once the first frame is ready so there is no white flash.
  win.once('ready-to-show', () => { if (!HEADLESS) win.show(); });

  const onFullscreen = (value) => {
    win.webContents.send('fullscreen-change', value);
    savePrefs({ ...loadPrefs(), fullscreen: value });
  };
  win.on('enter-full-screen', () => onFullscreen(true));
  win.on('leave-full-screen', () => onFullscreen(false));

  // Never navigate away from the game or open windows.
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  return win;
}

ipcMain.on('toggle-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.setFullScreen(!win.isFullScreen());
});

ipcMain.handle('is-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.isFullScreen() : false;
});

ipcMain.on('quit-app', () => app.quit());

// Developer-only screenshot helpers; never active in a packaged build.
function setupDevScreenshot(win) {
  const triggerPath = path.join(__dirname, '.screenshot-trigger');
  const outputPath = path.join(__dirname, 'dev-screenshot.png');
  const intervalId = setInterval(() => {
    if (!fs.existsSync(triggerPath)) return;
    try { fs.unlinkSync(triggerPath); } catch (_) {}
    if (!win.isDestroyed()) {
      win.webContents.capturePage().then(image => fs.writeFileSync(outputPath, image.toPNG())).catch(() => {});
    }
  }, 500);
  app.on('will-quit', () => clearInterval(intervalId));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.focus();
    }
  });

  app.whenReady().then(() => {
    mainWin = createWindow();
    if (!app.isPackaged) setupDevScreenshot(mainWin);
  });
}

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) mainWin = createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
