const path = require('path');
const { app, BrowserWindow } = require('electron');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'assets', 'generated');

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function capture(win, name, setup) {
  await win.loadFile(path.join(root, 'src', 'index.html'));
  await wait(700);
  if (setup) {
    await win.webContents.executeJavaScript(setup);
    await wait(700);
  }
  const image = await win.webContents.capturePage();
  await require('fs').promises.writeFile(path.join(outDir, name), image.toPNG());
}

app.whenReady().then(async () => {
  await require('fs').promises.mkdir(outDir, { recursive: true });
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      offscreen: true,
    },
  });

  try {
    const themeSetup = "store.set('theme','crystal'); TextureManager.preloadTheme('crystal'); TextureManager.preloadCharacters();";
    await capture(win, 'soulbound_home_capture.png', `${themeSetup} switchScreen('home');`);
    await capture(win, 'soulbound_theme_capture.png', `${themeSetup} switchScreen('themeSelect');`);
    await capture(win, 'soulbound_character_capture.png', `${themeSetup} store.set('maxUnlockedLevel', 10); switchScreen('characterSelect');`);
  } finally {
    win.destroy();
    app.quit();
  }
});
