const SettingsScreen = {
  settings: null,
  selectedOption: 0,
  options: [],

  init() {
    this.settings = { ...store.get('settings') };
    this.buildOptions();
  },

  buildOptions() {
    this.options = [
      {
        label: 'Mini-Games',
        value: () => this.settings.miniGamesEnabled ? 'ON' : 'OFF',
        toggle: () => {
          this.settings.miniGamesEnabled = !this.settings.miniGamesEnabled;
          store.set('settings', this.settings);
          store.set('miniGamesEnabled', this.settings.miniGamesEnabled);
          store.saveProgress();
        },
      },
      {
        label: 'Practice Mini-Games',
        value: () => '→',
        action: () => {
          switchScreen('miniGamePractice');
        },
      },
      {
        label: 'Audio',
        value: () => this.settings.audioEnabled ? 'ON' : 'OFF',
        toggle: () => {
          this.settings.audioEnabled = !this.settings.audioEnabled;
          store.set('settings', this.settings);
          audioManager.setEnabled(this.settings.audioEnabled);
          store.saveProgress();
        },
      },
      {
        label: 'Music Volume',
        value: () => Math.round((this.settings.musicVolume || 0.5) * 100) + '%',
        toggle: () => {
          const levels = [0, 0.25, 0.5, 0.75, 1];
          const current = this.settings.musicVolume || 0.5;
          const idx = levels.indexOf(current);
          this.settings.musicVolume = levels[(idx + 1) % levels.length];
          store.set('settings', this.settings);
          audioManager.setMusicVolume(this.settings.musicVolume);
          store.saveProgress();
        },
      },
      {
        label: 'SFX Volume',
        value: () => Math.round((this.settings.sfxVolume || 0.5) * 100) + '%',
        toggle: () => {
          const levels = [0, 0.25, 0.5, 0.75, 1];
          const current = this.settings.sfxVolume || 0.5;
          const idx = levels.indexOf(current);
          this.settings.sfxVolume = levels[(idx + 1) % levels.length];
          store.set('settings', this.settings);
          audioManager.setMasterVolume(this.settings.sfxVolume);
          store.saveProgress();
        },
      },
      {
        label: 'Player 1 Name',
        value: () => store.get('whitePlayer'),
        edit: () => {
          const name = prompt('Enter Player 1 name:', store.get('whitePlayer'));
          if (name) { store.set('whitePlayer', name); this.buildOptions(); }
        },
      },
      {
        label: 'Player 2 Name',
        value: () => store.get('blackPlayer'),
        edit: () => {
          const name = prompt('Enter Player 2 name:', store.get('blackPlayer'));
          if (name) { store.set('blackPlayer', name); this.buildOptions(); }
        },
      },
      {
        label: 'Reset Progress',
        value: () => '',
        action: () => {
          if (confirm('Reset all progress?')) {
            store.resetProgress();
            this.buildOptions();
          }
        },
      },
    ];
    this.selectedOption = 0;
  },

  destroy() {},

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    // Background - animated theme
    if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      ctx.fillRect(0, 0, 1280, 800);
    }
    

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SETTINGS', 640, 60);
    ctx.fillStyle = cols.text + '77';
    ctx.font = '12px monospace';
    ctx.fillText('Customize your experience', 640, 85);

    // Settings list
    const startY = 150;
    const lineH = 60;

    for (let i = 0; i < this.options.length; i++) {
      const opt = this.options[i];
      const y = startY + i * lineH;
      const isHover = i === this.selectedOption;

      // Background
      ctx.fillStyle = isHover ? cols.buttonHover : 'transparent';
      ctx.fillRect(300, y, 680, 50);

      // Border
      if (isHover) {
        ctx.fillStyle = cols.accent;
        ctx.fillRect(300, y, 3, 50);
      }

      // Label
      ctx.fillStyle = isHover ? cols.accent : cols.text;
      ctx.font = '18px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(opt.label, 320, y + 32);

      // Value
      if (opt.value) {
        const val = opt.value();
        ctx.fillStyle = cols.text + '88';
        ctx.font = '16px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(val, 960, y + 32);
      }
    }

    // Controls hint
    ctx.fillStyle = cols.text + '44';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Click to toggle / edit. ESC to go back.', 640, 750);

    // Back button
    ctx.fillStyle = cols.buttonBg;
    ctx.fillRect(30, 730, 160, 40);
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 730, 160, 40);
    ctx.fillStyle = cols.text;
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('< Back', 110, 756);

    // Theme shortcut
    ctx.fillStyle = cols.buttonBg;
    ctx.fillRect(1280 - 180, 730, 150, 40);
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(1280 - 180, 730, 150, 40);
    ctx.fillStyle = cols.text;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Themes', 1280 - 105, 756);
  },

  handleClick(x, y) {
    // Back
    if (x >= 30 && x <= 190 && y >= 730 && y <= 770) {
      switchScreen('home');
      return;
    }
    // Theme
    if (x >= 1280 - 180 && x <= 1280 - 30 && y >= 730 && y <= 770) {
      switchScreen('themeSelect', { returnTo: 'settings' });
      return;
    }

    const startY = 150;
    const lineH = 60;
    for (let i = 0; i < this.options.length; i++) {
      const oy = startY + i * lineH;
      if (x >= 300 && x <= 980 && y >= oy && y <= oy + 50) {
        if (this.options[i].toggle) this.options[i].toggle();
        else if (this.options[i].edit) this.options[i].edit();
        else if (this.options[i].action) this.options[i].action();
        return;
      }
    }
  },

  handleMouseMove(x, y) {
    this.selectedOption = -1;
    const startY = 150;
    const lineH = 60;
    for (let i = 0; i < this.options.length; i++) {
      const oy = startY + i * lineH;
      if (x >= 300 && x <= 980 && y >= oy && y <= oy + 50) {
        this.selectedOption = i;
        return;
      }
    }
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      switchScreen('home');
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const dir = e.key === 'ArrowUp' ? -1 : 1;
      this.selectedOption = (this.selectedOption + dir + this.options.length) % this.options.length;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = this.options[this.selectedOption];
      if (opt.toggle) opt.toggle();
      else if (opt.edit) opt.edit();
      else if (opt.action) opt.action();
    }
  },
};
