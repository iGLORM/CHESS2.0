const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  onFullscreenChange: (cb) => ipcRenderer.on('fullscreen-change', (_e, val) => cb(val)),
  saveScreenshot: (name, dataUrl) => ipcRenderer.send('save-screenshot', { name, dataUrl }),
  onScreenshotSaved: (cb) => ipcRenderer.on('screenshot-saved', (_e, result) => cb(result)),
});
