const SettingsScreen = {
  settings: null,
  selectedOption: 0,
  options: [],
  editingOption: null,
  editText: '',
  confirmReset: false,

  init() {
    this.settings = { ...store.get('settings') };
    this.editingOption = null;
    this.editText = '';
    this.confirmReset = false;
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
        isSlider: true,
        sliderValue: () => this.settings.musicVolume || 0.5,
        sliderAdjust: (delta) => {
          const current = this.settings.musicVolume || 0.5;
          this.settings.musicVolume = Math.max(0, Math.min(1, current + delta));
          store.set('settings', this.settings);
          audioManager.setMusicVolume(this.settings.musicVolume);
          store.saveProgress();
        },
      },
      {
        label: 'SFX Volume',
        value: () => Math.round((this.settings.sfxVolume || 0.5) * 100) + '%',
        isSlider: true,
        sliderValue: () => this.settings.sfxVolume || 0.5,
        sliderAdjust: (delta) => {
          const current = this.settings.sfxVolume || 0.5;
          this.settings.sfxVolume = Math.max(0, Math.min(1, current + delta));
          store.set('settings', this.settings);
          audioManager.setSFXVolume(this.settings.sfxVolume);
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
    UIHelpers.drawSeparator(ctx, 300, 95, 680, cols);

    // Settings list
    const startY = 150;
    const lineH = 60;

    for (let i = 0; i < this.options.length; i++) {
      const opt = this.options[i];
      const y = startY + i * lineH;
      const isHover = i === this.selectedOption;
      const isEditing = this.editingOption === opt.label && (opt.label === 'Player 1 Name' || opt.label === 'Player 2 Name');

      // Background
      ctx.fillStyle = isHover ? cols.buttonHover : 'transparent';
      ctx.fillRect(300, y, 680, 50);

      // Border
      if (isHover) {
        ctx.fillStyle = cols.accent;
        ctx.fillRect(300, y, 3, 50);
      }

      // Icon
      const iconMap = { 'Practice Mini-Games': 'target', 'Audio': 'music', 'Music Volume': 'volume', 'SFX Volume': 'volume', 'Player 1 Name': 'king', 'Player 2 Name': 'king', 'Reset Progress': 'skull' };
      if (iconMap[opt.label]) {
        UIHelpers.drawIcon(ctx, 300 + 290, y + 22, iconMap[opt.label], 10, cols);
      }

      // Label
      ctx.fillStyle = isHover ? cols.accent : cols.text;
      ctx.font = '18px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(opt.label, 320, y + 32);

      // Value
      if (isEditing) {
        // Inline text editor
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
        if (opt.label.includes('Volume')) {
          const numVal = parseInt(val);
          UIHelpers.drawVolumeSlider(ctx, 700, y + 12, 180, 10, numVal, cols);
          UIHelpers.drawToggle(ctx, 700, y + 35, 36, 18, numVal > 0, cols);
        } else if (opt.label === 'Audio') {
          UIHelpers.drawToggle(ctx, 700, y + 18, 36, 18, this.settings.audioEnabled, cols);
        } else if (opt.label.includes('Mini-Games')) {
          UIHelpers.drawToggle(ctx, 700, y + 18, 36, 18, val === 'On', cols);
        } else {
          ctx.fillStyle = cols.text + '88';
          ctx.font = '16px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(UIHelpers.truncateText(ctx, val, 240), 960, y + 32);
        }
      }
    }

    // Controls hint
    ctx.fillStyle = cols.text + '44';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    if (this.editingOption) {
      ctx.fillText('Type name. Enter to confirm, Escape to cancel.', 640, 750);
    } else {
      ctx.fillText('Click to toggle / edit. ESC to go back.', 640, 750);
    }

    // Dithered bottom stripe
    UIHelpers.drawDitheredRect(ctx, 0, 770, 1280, 30, cols.accent, '11');

    // Back button
    UIHelpers.drawButton(ctx, 30, 730, 160, 40, '< Back', cols, { font: 'bold 14px monospace' });

    // Theme shortcut
    UIHelpers.drawButton(ctx, 1280 - 180, 730, 150, 40, 'Themes', cols, { font: 'bold 12px monospace' });

    // Reset confirmation dialog
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
    // Reset confirmation dialog
    if (this.confirmReset) {
      // Yes button
      if (x >= 460 && x <= 600 && y >= 420 && y <= 460) {
        store.resetProgress();
        this.confirmReset = false;
        this.buildOptions();
        return;
      }
      // Cancel button
      if (x >= 680 && x <= 820 && y >= 420 && y <= 460) {
        this.confirmReset = false;
        return;
      }
      return;
    }

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

    // If editing, click outside the editor cancels
    if (this.editingOption) {
      this.editingOption = null;
      this.editText = '';
      return;
    }

    const startY = 150;
    const lineH = 60;
    for (let i = 0; i < this.options.length; i++) {
      const oy = startY + i * lineH;
      if (x >= 300 && x <= 980 && y >= oy && y <= oy + 50) {
        const opt = this.options[i];
        if (opt.isSlider) {
          const sliderX = 700;
          const sliderW = 180;
          if (x >= sliderX && x <= sliderX + sliderW && y >= oy + 12 && y <= oy + 22) {
            // Clicked on slider: left half = decrease, right half = increase
            const pct = (x - sliderX) / sliderW;
            const current = opt.sliderValue();
            const newVal = Math.round(pct * 100) / 100;
            const delta = newVal - current;
            opt.sliderAdjust(delta);
          } else if (x >= 700 && x <= 736 && y >= oy + 35 && y <= oy + 53) {
            // Mute toggle
            const current = opt.sliderValue();
            if (current > 0) {
              opt._muted = current;
              opt.sliderAdjust(-current);
            } else {
              opt.sliderAdjust((opt._muted || 0.5) - current);
            }
          } else {
            return;
          }
        } else if (opt.toggle) opt.toggle();
        else if (opt.edit) opt.edit();
        else if (opt.action) opt.action();
        return;
      }
    }
  },

  handleMouseMove(x, y) {
    if (this.confirmReset || this.editingOption) return;
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
      // Only accept printable characters, max 12 chars
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
      if (opt.isSlider) {
        // Space/Enter toggles mute on sliders
        const current = opt.sliderValue();
        if (current > 0) {
          opt._muted = current;
          opt.sliderAdjust(-current);
        } else {
          opt.sliderAdjust((opt._muted || 0.5) - current);
        }
      } else if (opt.toggle) opt.toggle();
      else if (opt.edit) opt.edit();
      else if (opt.action) opt.action();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const opt = this.options[this.selectedOption];
      if (opt && opt.isSlider) {
        e.preventDefault();
        opt.sliderAdjust(e.key === 'ArrowLeft' ? -0.05 : 0.05);
      }
    }
  },
};