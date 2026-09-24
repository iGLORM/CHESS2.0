const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  isDesktop: true,
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),
  onFullscreenChange: (cb) => ipcRenderer.on('fullscreen-change', (_e, val) => cb(val)),
  quit: () => ipcRenderer.send('quit-app'),
});
