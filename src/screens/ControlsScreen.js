const ControlsScreen = {
  dodgeSensitivity: 1.0,
  shieldSensitivity: 1.0,
  dragging: null,

  init() {
    const settings = store.get('settings');
    this.dodgeSensitivity = settings.miniGameSensitivity != null ? settings.miniGameSensitivity : 1.0;
    this.shieldSensitivity = settings.shieldSensitivity != null ? settings.shieldSensitivity : 1.0;
    this.dragging = null;
    this._focusedSlider = 'dodge';
  },

  destroy() {},

  _sliderToValue(x, sliderX, sliderW, min, max, step) {
    const pct = Math.max(0, Math.min(1, (x - sliderX) / sliderW));
    const raw = min + pct * (max - min);
    return Math.round(raw / step) * step;
  },

  _drawSlider(ctx, x, y, w, value, min, max, step, label, unit, cols) {
    const h = 14;

    // Label and value
    ctx.fillStyle = cols.text;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y - 10);

    ctx.fillStyle = cols.accent;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'right';
    const displayVal = step < 1 ? value.toFixed(1) : Math.round(value);
    ctx.fillText(displayVal + unit, x + w, y - 10);

    // Track
    ctx.fillStyle = cols.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cols.text + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Gradient fill
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#4488ff');
    grad.addColorStop(0.5, cols.accent);
    grad.addColorStop(1, '#ff4444');
    ctx.fillStyle = grad;
    const fillW = ((value - min) / (max - min)) * w;
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
    ctx.fillText(step < 1 ? min.toFixed(1) : min, x, y + h + 16);
    ctx.textAlign = 'right';
    ctx.fillText(step < 1 ? max.toFixed(1) : max, x + w, y + h + 16);

    // Tick marks
    ctx.fillStyle = cols.text + '22';
    for (let v = min + step; v < max; v += step) {
      const tx = x + ((v - min) / (max - min)) * w;
      ctx.fillRect(tx, y + h, 1, 3);
    }
  },

  render(ctx, dt) {
    const theme = ThemeManager.getTheme(store.get('theme'));
    const cols = theme.colors;

    const usePixiBg = typeof PixiMenuBackground !== 'undefined' && PixiMenuBackground.initialized;
    if (usePixiBg) {
      ctx.clearRect(0, 0, 1280, 800);
    } else if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      ctx.fillRect(0, 0, 1280, 800);
    }

    ctx.fillStyle = cols.text;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CONTROLS', 640, 50);
    ctx.fillStyle = cols.text + '77';
    ctx.font = '12px monospace';
    ctx.fillText('Adjust mini-game sensitivity', 640, 72);
    UIHelpers.drawSeparator(ctx, 400, 82, 480, cols);

    // Panel
    UIHelpers.drawPanel(ctx, 190, 110, 900, 400, cols, { accentTop: true });

    // Dodge Sensitivity slider
    this._drawSlider(ctx, 280, 200, 720, this.dodgeSensitivity, 0.5, 2.0, 0.1, 'Dodge Sensitivity', 'x', cols);

    // Focus indicator for dodge slider
    if (this._focusedSlider === 'dodge') {
      ctx.strokeStyle = cols.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(280 - 2, 200 - 2, 720 + 4, 14 + 4);
    }

    ctx.fillStyle = cols.text + '55';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Controls how fast your character moves in dodge mini-games', 640, 240);
    ctx.fillText('Lower = slower and more precise  |  Higher = faster and more responsive', 640, 257);

    // Shield Sensitivity slider
    this._drawSlider(ctx, 280, 340, 720, this.shieldSensitivity, 0.5, 2.0, 0.1, 'Shield Sensitivity', 'x', cols);

    // Focus indicator for shield slider
    if (this._focusedSlider === 'shield') {
      ctx.strokeStyle = cols.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(280 - 2, 340 - 2, 720 + 4, 14 + 4);
    }

    ctx.fillStyle = cols.text + '55';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Controls how responsive the shield is in Shield Block', 640, 380);
    ctx.fillText('Lower = more deliberate  |  Higher = snappier movement', 640, 397);

    // Preset buttons
    const presets = [
      { label: 'Slow & Precise', dodge: 0.7, shield: 0.7 },
      { label: 'Default', dodge: 1.0, shield: 1.0 },
      { label: 'Fast & Responsive', dodge: 1.5, shield: 1.5 },
    ];

    ctx.fillStyle = cols.text + '77';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Presets:', 640, 450);

    const presetW = 180;
    const presetH = 36;
    const presetGap = 20;
    const presetStartX = 640 - (presets.length * presetW + (presets.length - 1) * presetGap) / 2;
    for (let i = 0; i < presets.length; i++) {
      const px = presetStartX + i * (presetW + presetGap);
      UIHelpers.drawButton(ctx, px, 460, presetW, presetH, presets[i].label, cols, {
        font: 'bold 11px monospace',
      });
    }

    // Back button
    UIHelpers.drawButton(ctx, 30, 730, 160, 40, '< Back', cols, { font: 'bold 14px monospace' });

    ctx.fillStyle = cols.text + '44';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Drag sliders or use arrow keys. ESC to go back.', 640, 750);
    UIHelpers.drawDitheredRect(ctx, 0, 770, 1280, 30, cols.accent, '11');
  },

  _saveSettings() {
    const settings = { ...store.get('settings') };
    settings.miniGameSensitivity = this.dodgeSensitivity;
    settings.shieldSensitivity = this.shieldSensitivity;
    store.set('settings', settings);
    store.saveProgress();
  },

  handleClick(x, y) {
    if (x >= 30 && x <= 190 && y >= 730 && y <= 770) {
      switchScreen('settings');
      return;
    }

    // Dodge slider click
    if (x >= 280 && x <= 1000 && y >= 190 && y <= 218) {
      this.dodgeSensitivity = this._sliderToValue(x, 280, 720, 0.5, 2.0, 0.1);
      this.dragging = 'dodge';
      this._saveSettings();
      return;
    }

    // Shield slider click
    if (x >= 280 && x <= 1000 && y >= 330 && y <= 358) {
      this.shieldSensitivity = this._sliderToValue(x, 280, 720, 0.5, 2.0, 0.1);
      this.dragging = 'shield';
      this._saveSettings();
      return;
    }

    // Preset buttons
    const presets = [
      { dodge: 0.7, shield: 0.7 },
      { dodge: 1.0, shield: 1.0 },
      { dodge: 1.5, shield: 1.5 },
    ];
    const presetW = 180;
    const presetH = 36;
    const presetGap = 20;
    const presetStartX = 640 - (presets.length * presetW + (presets.length - 1) * presetGap) / 2;
    for (let i = 0; i < presets.length; i++) {
      const px = presetStartX + i * (presetW + presetGap);
      if (x >= px && x <= px + presetW && y >= 460 && y <= 460 + presetH) {
        this.dodgeSensitivity = presets[i].dodge;
        this.shieldSensitivity = presets[i].shield;
        this._saveSettings();
        return;
      }
    }
  },

  handleMouseMove(x, y) {
    if (this.dragging === 'dodge') {
      this.dodgeSensitivity = this._sliderToValue(x, 280, 720, 0.5, 2.0, 0.1);
      this._saveSettings();
      return;
    }
    if (this.dragging === 'shield') {
      this.shieldSensitivity = this._sliderToValue(x, 280, 720, 0.5, 2.0, 0.1);
      this._saveSettings();
      return;
    }
    const canvas = document.getElementById('gameCanvas');
    const onSlider = (x >= 280 && x <= 1000 && ((y >= 190 && y <= 218) || (y >= 330 && y <= 358)));
    const onPreset = (y >= 460 && y <= 496);
    canvas.style.cursor = (onSlider || onPreset || (x >= 30 && x <= 190 && y >= 730 && y <= 770)) ? 'pointer' : 'default';
  },

  handleMouseDown(x, y) {
    if (x >= 280 && x <= 1000 && y >= 186 && y <= 222) {
      this.dragging = 'dodge';
      this.dodgeSensitivity = this._sliderToValue(x, 280, 720, 0.5, 2.0, 0.1);
      this._saveSettings();
    }
    if (x >= 280 && x <= 1000 && y >= 326 && y <= 362) {
      this.dragging = 'shield';
      this.shieldSensitivity = this._sliderToValue(x, 280, 720, 0.5, 2.0, 0.1);
      this._saveSettings();
    }
  },

  handleMouseUp() {
    this.dragging = null;
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      switchScreen('settings');
      return;
    }
    if (e.key === 'ArrowLeft') {
      if (this._focusedSlider === 'shield') {
        this.shieldSensitivity = Math.max(0.5, this.shieldSensitivity - 0.1);
      } else {
        this.dodgeSensitivity = Math.max(0.5, this.dodgeSensitivity - 0.1);
      }
      this._saveSettings();
    }
    if (e.key === 'ArrowRight') {
      if (this._focusedSlider === 'shield') {
        this.shieldSensitivity = Math.min(2.0, this.shieldSensitivity + 0.1);
      } else {
        this.dodgeSensitivity = Math.min(2.0, this.dodgeSensitivity + 0.1);
      }
      this._saveSettings();
    }
    if (e.key === 'ArrowDown') {
      this._focusedSlider = 'shield';
    }
    if (e.key === 'ArrowUp') {
      this._focusedSlider = 'dodge';
    }
  },
};