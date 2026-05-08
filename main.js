const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    useContentSize: true,
    resizable: true,
    fullscreenable: true,
    title: 'Chess 2.0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
  });

  win.setMenu(null);
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.on('enter-full-screen', () => win.webContents.send('fullscreen-change', true));
  win.on('leave-full-screen', () => win.webContents.send('fullscreen-change', false));

  return win;
}

ipcMain.on('toggle-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setFullScreen(!win.isFullScreen());
  }
});

ipcMain.on('save-screenshot', (event, { name, dataUrl }) => {
  const screenshotsDir = path.join(__dirname, 'assets', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  const filePath = path.join(screenshotsDir, `${name}.png`);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  event.reply('screenshot-saved', { name, path: filePath });
});

// --- Dev screenshot system ---
// Create .screenshot-trigger file to capture the game window as dev-screenshot.png
let mainWin = null;

function setupDevScreenshot(win) {
  mainWin = win;
  const triggerPath = path.join(__dirname, '.screenshot-trigger');
  const outputPath = path.join(__dirname, 'dev-screenshot.png');

  setInterval(() => {
    if (fs.existsSync(triggerPath)) {
      try { fs.unlinkSync(triggerPath); } catch (_) {}
      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.webContents.capturePage().then(image => {
          fs.writeFileSync(outputPath, image.toPNG());
        }).catch(() => {});
      }
    }
  }, 500);

  // Also capture on F5 key
  const { globalShortcut } = require('electron');
  globalShortcut.register('F5', () => {
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.capturePage().then(image => {
        fs.writeFileSync(outputPath, image.toPNG());
      }).catch(() => {});
    }
  });
}

app.whenReady().then(() => {
  const win = createWindow();
  setupDevScreenshot(win);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
