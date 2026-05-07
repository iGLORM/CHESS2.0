const SettingsScreen = {
  settings: null,
  selectedOption: 0,
  options: [],
  editingOption: null,
  editText: '',
  confirmReset: false,
  dragging: null,
  _focusedSlider: null,

  init() {
    this.settings = { ...store.get('settings') };
    if (this.settings.musicVolume == null) this.settings.musicVolume = 0.5;
    if (this.settings.sfxVolume == null) this.settings.sfxVolume = 0.5;
    this.editingOption = null;
    this.editText = '';
    this.confirmReset = false;
    this.dragging = null;
    this._focusedSlider = null;
    this.buildOptions();
  },

  buildOptions() {
    this.options = [
      {
        label: 'Practice Mini-Games',
        value: () => '→',
        action: () => {
          switchScreen('miniGamePractice');
        },
      },
      {
        label: 'Controls',
        value: () => '→',
        action: () => {
          switchScreen('controls');
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
        label: 'Player 1 Name',
        value: () => store.get('whitePlayer'),
        edit: () => {
          this.editingOption = 'whitePlayer';
          this.editText = store.get('whitePlayer') || 'Player 1';
        },
      },
      {
        label: 'Player 2 Name',
        value: () => store.get('blackPlayer'),
        edit: () => {
          this.editingOption = 'blackPlayer';
          this.editText = store.get('blackPlayer') || 'Player 2';
        },
      },
      {
        label: 'Reset Progress',
        value: () => '',
        action: () => {
          this.confirmReset = true;
        },
      },
    ];
    this.selectedOption = 0;
  },

  _sliderToValue(x, sliderX, sliderW) {
    const pct = Math.max(0, Math.min(1, (x - sliderX) / sliderW));
    return Math.round(pct * 100) / 100;
  },

  _drawVolumeSlider(ctx, x, y, w, value, label, cols) {
    const h = 14;

    // Label and percentage
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y - 8);

    ctx.fillStyle = cols.accent;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(value * 100) + '%', x + w, y - 8);

    // Track
    ctx.fillStyle = cols.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Gradient fill
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#444466');
    grad.addColorStop(0.5, cols.accent);
    grad.addColorStop(1, '#44dd44');
    ctx.fillStyle = grad;
    const fillW = value * w;
    ctx.fillRect(x, y, fillW, h);

    // Knob
    const knobX = x + fillW;
    ctx.fillStyle = cols.text;
    ctx.fillRect(knobX - 5, y - 3, 10, h + 6);
    ctx.fillStyle = cols.accent;
    ctx.fillRect(knobX - 3, y - 1, 6, h + 2);

    // End labels
    ctx.fillStyle = cols.text + '66';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('0%', x, y + h + 16);
    ctx.textAlign = 'right';
    ctx.fillText('100%', x + w, y + h + 16);
  },

  destroy() {},

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      ctx.fillRect(0, 0, 1280, 800);
    }

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SETTINGS', 640, 50);
    ctx.fillStyle = cols.text + '77';
    ctx.font = '12px monospace';
    ctx.fillText('Customize your experience', 640, 72);
    UIHelpers.drawSeparator(ctx, 300, 82, 680, cols);

    // Volume sliders (full-width Elo-style)
    this._drawVolumeSlider(ctx, 280, 130, 720, this.settings.musicVolume, 'Music Volume', cols);
    this._drawVolumeSlider(ctx, 280, 210, 720, this.settings.sfxVolume, 'SFX Volume', cols);

    // Options list below sliders
    const startY = 280;
    const lineH = 60;

    for (let i = 0; i < this.options.length; i++) {
      const opt = this.options[i];
      const y = startY + i * lineH;
      const isHover = i === this.selectedOption;
      const isEditing = this.editingOption === opt.label && (opt.label === 'Player 1 Name' || opt.label === 'Player 2 Name');

      ctx.fillStyle = isHover ? cols.buttonHover : 'transparent';
      ctx.fillRect(300, y, 680, 50);

      if (isHover) {
        ctx.fillStyle = cols.accent;
        ctx.fillRect(300, y, 3, 50);
      }

      const iconMap = { 'Practice Mini-Games': 'target', 'Controls': 'gear', 'Audio': 'music', 'Player 1 Name': 'king', 'Player 2 Name': 'king', 'Reset Progress': 'skull' };
      if (iconMap[opt.label]) {
        UIHelpers.drawIcon(ctx, 300 + 290, y + 22, iconMap[opt.label], 10, cols);
      }

      ctx.fillStyle = isHover ? cols.accent : cols.text;
      ctx.font = '18px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(opt.label, 320, y + 32);

      if (isEditing) {
        ctx.fillStyle = cols.panel;
        ctx.fillRect(700, y + 10, 200, 30);
        ctx.strokeStyle = cols.accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(700, y + 10, 200, 30);
        ctx.fillStyle = cols.text;
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(UIHelpers.truncateText(ctx, this.editText + (Math.floor(Date.now() / 500) % 2 === 0 ? '|' : ''), 180), 710, y + 30);
      } else if (opt.value) {
        const val = opt.value();
        if (opt.label === 'Audio') {
          UIHelpers.drawToggle(ctx, 700, y + 18, 36, 18, this.settings.audioEnabled, cols);
        } else {
          ctx.fillStyle = cols.text + '88';
          ctx.font = '16px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(UIHelpers.truncateText(ctx, val, 240), 960, y + 32);
        }
      }
    }

    ctx.fillStyle = cols.text + '44';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    if (this.editingOption) {
      ctx.fillText('Type name. Enter to confirm, Escape to cancel.', 640, 750);
    } else {
      ctx.fillText('Click to toggle / edit. Drag volume sliders. ESC to go back.', 640, 750);
    }

    UIHelpers.drawDitheredRect(ctx, 0, 770, 1280, 30, cols.accent, '11');
    UIHelpers.drawButton(ctx, 30, 730, 160, 40, '< Back', cols, { font: 'bold 14px monospace' });
    UIHelpers.drawButton(ctx, 1280 - 180, 730, 150, 40, 'Themes', cols, { font: 'bold 12px monospace' });

    if (this.confirmReset) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, 1280, 800);

      UIHelpers.drawPanel(ctx, 440, 300, 400, 180, cols);
      UIHelpers.drawIcon(ctx, 636, 325, 'skull', 10, cols, { color: '#ff4444' });

      ctx.fillStyle = cols.text;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Reset all progress?', 640, 350);
      ctx.fillStyle = cols.text + '88';
      ctx.font = '14px monospace';
      ctx.fillText('This cannot be undone.', 640, 380);

      UIHelpers.drawButton(ctx, 460, 420, 140, 40, 'Yes, Reset', cols, { font: 'bold 13px monospace' });
      UIHelpers.drawButton(ctx, 680, 420, 140, 40, 'Cancel', cols, { font: 'bold 13px monospace' });
    }
  },

  handleClick(x, y) {
    if (this.confirmReset) {
      if (x >= 460 && x <= 600 && y >= 420 && y <= 460) {
        store.resetProgress();
        this.confirmReset = false;
        this.buildOptions();
        return;
      }
      if (x >= 680 && x <= 820 && y >= 420 && y <= 460) {
        this.confirmReset = false;
        return;
      }
      return;
    }

    if (x >= 30 && x <= 190 && y >= 730 && y <= 770) {
      switchScreen('home');
      return;
    }
    if (x >= 1280 - 180 && x <= 1280 - 30 && y >= 730 && y <= 770) {
      switchScreen('themeSelect', { returnTo: 'settings' });
      return;
    }

    // Volume sliders
    if (x >= 280 && x <= 1000 && y >= 120 && y <= 160) {
      this.settings.musicVolume = this._sliderToValue(x, 280, 720);
      this.dragging = 'music';
      store.set('settings', this.settings);
      audioManager.setMusicVolume(this.settings.musicVolume);
      store.saveProgress();
      return;
    }
    if (x >= 280 && x <= 1000 && y >= 200 && y <= 240) {
      this.settings.sfxVolume = this._sliderToValue(x, 280, 720);
      this.dragging = 'sfx';
      store.set('settings', this.settings);
      audioManager.setSFXVolume(this.settings.sfxVolume);
      store.saveProgress();
      return;
    }

    if (this.editingOption) {
      this.editingOption = null;
      this.editText = '';
      return;
    }

    const startY = 280;
    const lineH = 60;
    for (let i = 0; i < this.options.length; i++) {
      const oy = startY + i * lineH;
      if (x >= 300 && x <= 980 && y >= oy && y <= oy + 50) {
        const opt = this.options[i];
        if (opt.toggle) opt.toggle();
        else if (opt.edit) opt.edit();
        else if (opt.action) opt.action();
        return;
      }
    }
  },

  handleMouseMove(x, y) {
    if (this.dragging === 'music') {
      this.settings.musicVolume = this._sliderToValue(x, 280, 720);
      store.set('settings', this.settings);
      audioManager.setMusicVolume(this.settings.musicVolume);
      store.saveProgress();
      return;
    }
    if (this.dragging === 'sfx') {
      this.settings.sfxVolume = this._sliderToValue(x, 280, 720);
      store.set('settings', this.settings);
      audioManager.setSFXVolume(this.settings.sfxVolume);
      store.saveProgress();
      return;
    }
    if (this.confirmReset || this.editingOption) return;
    this.selectedOption = -1;
    const canvas = document.getElementById('gameCanvas');
    const onSlider = (x >= 280 && x <= 1000 && ((y >= 120 && y <= 160) || (y >= 200 && y <= 240)));
    const startY = 280;
    const lineH = 60;
    for (let i = 0; i < this.options.length; i++) {
      const oy = startY + i * lineH;
      if (x >= 300 && x <= 980 && y >= oy && y <= oy + 50) {
        this.selectedOption = i;
        canvas.style.cursor = 'pointer';
        return;
      }
    }
    canvas.style.cursor = onSlider ? 'pointer' : 'default';
  },

  handleMouseDown(x, y) {
    if (x >= 280 && x <= 1000 && y >= 116 && y <= 164) {
      this.dragging = 'music';
      this.settings.musicVolume = this._sliderToValue(x, 280, 720);
      store.set('settings', this.settings);
      audioManager.setMusicVolume(this.settings.musicVolume);
      store.saveProgress();
    }
    if (x >= 280 && x <= 1000 && y >= 196 && y <= 244) {
      this.dragging = 'sfx';
      this.settings.sfxVolume = this._sliderToValue(x, 280, 720);
      store.set('settings', this.settings);
      audioManager.setSFXVolume(this.settings.sfxVolume);
      store.saveProgress();
    }
  },

  handleMouseUp() {
    this.dragging = null;
  },

  handleKeyDown(e) {
    if (this.confirmReset) {
      if (e.key === 'Escape') this.confirmReset = false;
      return;
    }

    if (this.editingOption) {
      if (e.key === 'Enter') {
        const name = this.editText.trim();
        if (name) {
          store.set(this.editingOption, name);
          store.saveProgress();
        }
        this.editingOption = null;
        this.editText = '';
        return;
      }
      if (e.key === 'Escape') {
        this.editingOption = null;
        this.editText = '';
        return;
      }
      if (e.key === 'Backspace') {
        this.editText = this.editText.slice(0, -1);
        return;
      }
      if (e.key.length === 1 && this.editText.length < 12) {
        this.editText += e.key;
        return;
      }
      return;
    }

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
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const step = 0.05;
      const delta = e.key === 'ArrowLeft' ? -step : step;
      if (this._focusedSlider === 'sfx') {
        this.settings.sfxVolume = Math.max(0, Math.min(1, (this.settings.sfxVolume || 0.5) + delta));
        store.set('settings', this.settings);
        audioManager.setSFXVolume(this.settings.sfxVolume);
        store.saveProgress();
      } else {
        this.settings.musicVolume = Math.max(0, Math.min(1, (this.settings.musicVolume || 0.5) + delta));
        store.set('settings', this.settings);
        audioManager.setMusicVolume(this.settings.musicVolume);
        store.saveProgress();
      }
      e.preventDefault();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      this._focusedSlider = this._focusedSlider === 'sfx' ? null : 'sfx';
    }
  },
};