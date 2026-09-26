// Renders the app icons from PixiTitleLogo.renderIcon (the same drawing code as
// the home-screen title) and writes icon.png, icon_512.png, icon_1024.png and
// icon.ico in the project root.
//
//   npx electron scripts/render-icons.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
const PNG_FILES = { 'icon.png': 256, 'icon_512.png': 512, 'icon_1024.png': 1024 };

// ICO files may embed PNG images directly (Windows Vista and later).
function buildIco(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(png.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(img => img.png)]);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    webPreferences: { preload: path.join(ROOT, 'preload.js'), backgroundThrottling: false },
  });
  await win.loadFile(path.join(ROOT, 'src', 'index.html'));

  const ready = 'typeof PixiTitleLogo !== "undefined" && typeof PixiApp !== "undefined" && !!PixiApp.app'
    + ' && document.fonts.status === "loaded"';
  for (let i = 0; i < 100 && !(await win.webContents.executeJavaScript(ready)); i++) {
    await new Promise(r => setTimeout(r, 100));
  }
  await win.webContents.executeJavaScript('document.fonts.load("700 96px Silkscreen")');

  const render = async (size) => {
    const url = await win.webContents.executeJavaScript(`PixiTitleLogo.renderIcon(${size})`);
    return Buffer.from(url.split(',')[1], 'base64');
  };

  for (const [file, size] of Object.entries(PNG_FILES)) {
    fs.writeFileSync(path.join(ROOT, file), await render(size));
    console.log(`wrote ${file}`);
  }
  const icoImages = [];
  for (const size of ICO_SIZES) icoImages.push({ size, png: await render(size) });
  fs.writeFileSync(path.join(ROOT, 'icon.ico'), buildIco(icoImages));
  console.log('wrote icon.ico');
  app.quit();
}).catch((err) => {
  console.error(err);
  app.exit(1);
});
