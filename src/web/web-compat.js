// The browser version (outside Electron): a stand-in for window.electron, so the
// fullscreen option uses the browser's own Fullscreen API.
(function () {
  if (window.electron) return;
  window.electron = {
    toggleFullscreen: function () {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen().catch(function () {});
      }
    },
    onFullscreenChange: function () {},
    saveScreenshot: function () {},
    onScreenshotSaved: function () {},
  };
})();
