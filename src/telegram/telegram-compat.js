(function () {
  const isTelegram = window.Telegram && window.Telegram.WebApp;

  // Web fullscreen fallback (when window.electron is absent)
  if (!window.electron) {
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
  }

  if (!isTelegram) return;

  var tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();

  // Try to request fullscreen in Telegram (API v8+)
  if (tg.requestFullscreen) {
    try { tg.requestFullscreen(); } catch (e) {}
  }

  // Disable vertical swipes so scrolling doesn't close the app
  if (tg.disableVerticalSwipes) {
    tg.disableVerticalSwipes();
  }

  tg.onEvent('viewportChanged', function () {
    if (typeof Layout !== 'undefined') Layout.detect();
    if (typeof PixiApp !== 'undefined' && PixiApp.app && PixiApp.app.renderer) {
      PixiApp.app.renderer.resize(Layout.W, Layout.H);
    }
  });

  // Back button — wired up after DOM and game scripts load
  document.addEventListener('DOMContentLoaded', function () {
    tg.BackButton.onClick(function () {
      if (typeof store !== 'undefined') {
        var screen = store.get('screen');
        if (screen === 'home') {
          tg.close();
        } else {
          if (typeof switchScreen === 'function') switchScreen('home');
        }
      }
    });

    // Show/hide back button based on current screen
    if (typeof store !== 'undefined') {
      store.on('screen', function (screen) {
        if (screen === 'home') {
          tg.BackButton.hide();
        } else {
          tg.BackButton.show();
        }
      });
    }

    // Haptic feedback — patch audioManager methods
    if (typeof audioManager !== 'undefined' && tg.HapticFeedback) {
      var hf = tg.HapticFeedback;

      var origPlayButton = audioManager.playButton;
      if (origPlayButton) {
        audioManager.playButton = function () {
          origPlayButton.apply(audioManager, arguments);
          hf.impactOccurred('light');
        };
      }

      var origPlayMove = audioManager.playMove;
      if (origPlayMove) {
        audioManager.playMove = function () {
          origPlayMove.apply(audioManager, arguments);
          hf.impactOccurred('medium');
        };
      }

      var origPlayCapture = audioManager.playCapture;
      if (origPlayCapture) {
        audioManager.playCapture = function () {
          origPlayCapture.apply(audioManager, arguments);
          hf.impactOccurred('heavy');
        };
      }
    }
  });
})();
