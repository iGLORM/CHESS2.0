const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  onFullscreenChange: (cb) => ipcRenderer.on('fullscreen-change', (_e, val) => cb(val)),
  saveScreenshot: (name, dataUrl) => {
    if (typeof name !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(name)) {
      console.warn('saveScreenshot: invalid name');
      return;
    }
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) {
      console.warn('saveScreenshot: invalid dataUrl');
      return;
    }
    ipcRenderer.send('save-screenshot', { name, dataUrl });
  },
  onScreenshotSaved: (cb) => ipcRenderer.on('screenshot-saved', (_e, result) => cb(result)),
});
