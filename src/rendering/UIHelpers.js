class UIHelpers {
  static alpha(color, alpha) {
    if (typeof color === 'string' && color[0] === '#' && color.length === 7) {
      return color + alpha;
    }
    return color;
  }

  static lighten(hex, amount) {
    if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  }

  static darken(hex, amount) {
    if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  }

  static truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated.length > 0 ? truncated + '...' : '';
  }

  static wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = text.split(' ');
    let line = '';
    let lineNum = 0;
    const lines = [];

    for (const word of words) {
      const testLine = line ? line + ' ' + word : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
        lineNum++;
        if (maxLines && lineNum >= maxLines) {
          let lastLine = lines[lines.length - 1];
          while (ctx.measureText(lastLine + '...').width > maxWidth && lastLine.length > 0) {
            lastLine = lastLine.slice(0, -1);
          }
          lines[lines.length - 1] = lastLine + '...';
          for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], x, y + i * lineHeight);
          }
          return y + lines.length * lineHeight;
        }
      } else {
        line = testLine;
      }
    }
    if (line) {
      lines.push(line);
    }
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y + i * lineHeight);
    }
    return y + lines.length * lineHeight;
  }

  // --- CORNER ORNAMENTS ---
  static _drawCorners(ctx, x, y, w, h, color, size) {
    const s = size || 3;
    ctx.fillStyle = color;
    // Top-left
    ctx.fillRect(x, y, s, 1);
    ctx.fillRect(x, y + 1, 1, s - 1);
    // Top-right
    ctx.fillRect(x + w - s, y, s, 1);
    ctx.fillRect(x + w - 1, y + 1, 1, s - 1);
    // Bottom-left
    ctx.fillRect(x, y + h - 1, s, 1);
    ctx.fillRect(x, y + h - s, 1, s - 1);
    // Bottom-right
    ctx.fillRect(x + w - s, y + h - 1, s, 1);
    ctx.fillRect(x + w - 1, y + h - s, 1, s - 1);
  }

  // --- PIXEL FRAME (upgraded with corners + inner highlight) ---
  static drawPixelFrame(ctx, x, y, w, h, cols, opts = {}) {
    const active = !!opts.active;
    const hover = !!opts.hover;
    const disabled = !!opts.disabled;
    const fill = opts.fill || (hover ? cols.buttonHover : cols.buttonBg);
    const outer = opts.outer || '#050508';
    const border = disabled
      ? this.alpha(cols.text, '33')
      : (active || hover ? cols.accent : this.alpha(cols.text, '88'));
    const inner = disabled
      ? this.alpha(cols.text, '18')
      : (active || hover ? this.alpha(cols.text, 'cc') : this.alpha(cols.text, '33'));

    // Shadow
    ctx.fillStyle = this.alpha('#000000', '66');
    ctx.fillRect(x + 3, y + 3, w, h);

    // Outer
    ctx.fillStyle = outer;
    ctx.fillRect(x, y, w, h);

    // Border
    ctx.fillStyle = border;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

    // Inner edge
    ctx.fillStyle = inner;
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);

    // Fill
    ctx.fillStyle = fill;
    ctx.fillRect(x + 5, y + 5, w - 10, h - 10);

    // Corner ornaments
    if (!disabled) {
      const cornerColor = active || hover ? cols.accent : this.alpha(cols.text, '66');
      this._drawCorners(ctx, x, y, w, h, cornerColor, 3);
    }

    // Top rail decoration (thin accent line under top border)
    if (active || hover) {
      ctx.fillStyle = cols.accent;
      ctx.fillRect(x + 5, y + 5, w - 10, 2);
      ctx.fillRect(x + 5, y + h - 7, w - 10, 2);
      // Side accents
      ctx.fillRect(x + 5, y + 5, 2, h - 10);
      ctx.fillRect(x + w - 7, y + 5, 2, h - 10);
    }
  }

  static drawButton(ctx, x, y, w, h, text, cols, opts = {}) {
    this.drawPixelFrame(ctx, x, y, w, h, cols, opts);

    ctx.fillStyle = opts.textColor || (opts.hover || opts.active ? cols.accent : cols.text);
    ctx.font = opts.font || 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxTextWidth = w - 16;
    const displayText = this.truncateText(ctx, text, maxTextWidth);
    ctx.fillText(displayText, x + w / 2, y + h / 2 + (opts.textOffsetY || 0));
    ctx.textBaseline = 'alphabetic';
  }

  // --- PANEL (large content panel with thick border + dithered inner shadow) ---
  static drawPanel(ctx, x, y, w, h, cols, opts = {}) {
    const hover = !!opts.hover;
    const active = !!opts.active;
    const borderW = opts.borderWidth || 4;
    const fillColor = opts.fill || cols.panel;

    // Drop shadow
    ctx.fillStyle = this.alpha('#000000', '55');
    ctx.fillRect(x + 4, y + 4, w, h);

    // Outer border (dark)
    ctx.fillStyle = this.darken(cols.panel, 60);
    ctx.fillRect(x, y, w, h);

    // Border accent
    const borderCol = (hover || active) ? cols.accent : this.alpha(cols.text, '66');
    ctx.fillStyle = borderCol;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

    // Inner border (dark)
    ctx.fillStyle = this.darken(cols.panel, 40);
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

    // Fill
    ctx.fillStyle = fillColor;
    ctx.fillRect(x + borderW, y + borderW, w - borderW * 2, h - borderW * 2);

    // Inner shadow (dithered top + left edges)
    const shadowColor = this.alpha('#000000', '33');
    for (let dx = 0; dx < w - borderW * 2; dx += 2) {
      ctx.fillStyle = shadowColor;
      ctx.fillRect(x + borderW + dx, y + borderW, 1, 3);
    }
    for (let dy = 0; dy < 12; dy += 2) {
      ctx.fillStyle = shadowColor;
      ctx.fillRect(x + borderW, y + borderW + dy, 3, 1);
    }

    // Corner ornaments
    this._drawCorners(ctx, x, y, w, h, (hover || active) ? cols.accent : this.alpha(cols.text, '88'), 4);

    // Accent top rail
    if (opts.accentTop) {
      ctx.fillStyle = cols.accent;
      ctx.fillRect(x + borderW, y + borderW, w - borderW * 2, 2);
    }
  }

  // --- CARD (card-style element with beveled edges + optional accent stripe) ---
  static drawCard(ctx, x, y, w, h, cols, opts = {}) {
    const hover = !!opts.hover;
    const active = !!opts.active;
    const disabled = !!opts.disabled;
    const fillColor = opts.fill || (hover ? cols.buttonHover : cols.panel);
    const accentStripe = opts.accentStripe;

    // Drop shadow
    ctx.fillStyle = this.alpha('#000000', '44');
    ctx.fillRect(x + 2, y + 2, w, h);

    // Outer bevel (bottom-right light)
    ctx.fillStyle = this.darken(fillColor, 50);
    ctx.fillRect(x, y, w, h);

    // Top-left bevel highlight
    ctx.fillStyle = this.lighten(fillColor, 20);
    ctx.fillRect(x, y, w - 1, 1);
    ctx.fillRect(x, y, 1, h - 1);

    // Bottom-right bevel shadow
    ctx.fillStyle = this.darken(fillColor, 30);
    ctx.fillRect(x + 1, y + h - 1, w - 1, 1);
    ctx.fillRect(x + w - 1, y + 1, 1, h - 1);

    // Fill
    ctx.fillStyle = fillColor;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

    // Accent stripe at top
    if (accentStripe) {
      ctx.fillStyle = accentStripe;
      ctx.fillRect(x + 2, y + 2, w - 4, 3);
    }

    // Border
    ctx.strokeStyle = disabled ? this.alpha(cols.text, '22') : (hover || active ? cols.accent : this.alpha(cols.text, '44'));
    ctx.lineWidth = (hover || active) ? 2 : 1;
    ctx.strokeRect(x, y, w, h);

    // Corner ornaments when highlighted
    if (hover || active) {
      this._drawCorners(ctx, x, y, w, h, cols.accent, 3);
    }

    if (disabled) {
      ctx.fillStyle = this.alpha('#000000', '55');
      ctx.fillRect(x, y, w, h);
    }
  }

  // --- PROGRESS BAR (pixel-art styled with endcaps) ---
  static drawProgressBar(ctx, x, y, w, h, progress, cols, opts = {}) {
    const fillColor = opts.fill || cols.accent;
    const bgColor = opts.bg || this.alpha(cols.accent, '33');
    const clampedProgress = Math.max(0, Math.min(1, progress));

    // Frame
    ctx.fillStyle = this.darken(cols.panel, 40);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = cols.panel;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

    // Fill
    const fillW = Math.max(0, (w - 4) * clampedProgress);
    if (fillW > 0) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(x + 2, y + 2, fillW, h - 4);

      // Highlight on top of fill
      ctx.fillStyle = this.lighten(fillColor, 40);
      ctx.fillRect(x + 2, y + 2, fillW, 1);
    }

    // Endcaps (left + right dark caps)
    ctx.fillStyle = this.darken(cols.panel, 60);
    ctx.fillRect(x, y, 2, h);
    ctx.fillRect(x + w - 2, y, 2, h);

    // Corner dots
    ctx.fillStyle = this.darken(cols.panel, 40);
    ctx.fillRect(x, y, 1, 1);
    ctx.fillRect(x + w - 1, y, 1, 1);
    ctx.fillRect(x, y + h - 1, 1, 1);
    ctx.fillRect(x + w - 1, y + h - 1, 1, 1);
  }

  // --- TOGGLE SWITCH (pixel-art on/off toggle) ---
  static drawToggle(ctx, x, y, w, h, isOn, cols, opts = {}) {
    const bgColor = isOn ? this.alpha(cols.accent, '55') : this.alpha(cols.text, '22');
    const knobColor = isOn ? cols.accent : this.alpha(cols.text, '66');
    const knobX = isOn ? x + w - h : x;

    // Track
    ctx.fillStyle = this.darken(cols.panel, 30);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = bgColor;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

    // Knob
    ctx.fillStyle = this.darken(knobColor, 30);
    ctx.fillRect(knobX, y, h, h);
    ctx.fillStyle = knobColor;
    ctx.fillRect(knobX + 1, y + 1, h - 2, h - 2);
    ctx.fillStyle = this.lighten(knobColor, 30);
    ctx.fillRect(knobX + 1, y + 1, h - 2, 1);
    ctx.fillRect(knobX + 1, y + 1, 1, h - 2);

    // On/off indicator dot
    ctx.fillStyle = isOn ? '#ffffff' : this.alpha(cols.text, '44');
    ctx.fillRect(knobX + Math.floor(h / 2), y + Math.floor(h / 2), 2, 2);
  }

  // --- SEPARATOR (decorative horizontal line with center jewel) ---
  static drawSeparator(ctx, x, y, w, cols, opts = {}) {
    const color = opts.color || this.alpha(cols.text, '33');
    const accentColor = opts.accentColor || cols.accent;

    // Line
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, 1);

    // Center diamond
    if (opts.jewel !== false) {
      const cx = x + Math.floor(w / 2);
      ctx.fillStyle = accentColor;
      ctx.fillRect(cx - 2, y - 2, 5, 1);
      ctx.fillRect(cx - 1, y - 1, 3, 1);
      ctx.fillRect(cx, y, 1, 1);
      ctx.fillRect(cx - 1, y + 1, 3, 1);
      ctx.fillRect(cx - 2, y + 2, 5, 1);
    }
  }

  // --- MINI ICONS (8x8 or 12x12 pixel-art icons) ---
  static drawIcon(ctx, x, y, type, size, cols, opts = {}) {
    const s = size || 8;
    const color = opts.color || cols.accent;
    const highlight = opts.highlight || this.lighten(color, 60);
    const dark = opts.dark || this.darken(color, 40);
    const p = s / 8; // pixel size

    ctx.fillStyle = color;

    switch (type) {
      case 'crown':
        // 8x8 crown
        ctx.fillRect(x + p, y + p * 2, p, p * 3);
        ctx.fillRect(x + p * 3, y, p, p * 5);
        ctx.fillRect(x + p * 5, y + p * 2, p, p * 3);
        ctx.fillRect(x + p * 7, y, p, p * 5);
        ctx.fillRect(x, y + p * 5, p * 8, p);
        ctx.fillRect(x, y + p * 6, p * 8, p);
        // highlight
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y + p * 5, p * 8, 1);
        break;

      case 'lock':
        ctx.fillRect(x + p * 2, y, p * 4, p * 2); // top arc
        ctx.fillRect(x + p, y + p, p, p);
        ctx.fillRect(x + p * 6, y + p, p, p);
        ctx.fillRect(x, y + p * 3, p * 8, p * 5); // body
        ctx.fillStyle = dark;
        ctx.fillRect(x + p * 3, y + p * 5, p * 2, p * 2); // keyhole
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y + p * 3, p * 8, 1);
        break;

      case 'sword':
        ctx.fillRect(x + p * 3, y, p * 2, p * 5); // blade
        ctx.fillRect(x + p * 2, y + p * 5, p * 4, p); // guard
        ctx.fillRect(x + p * 3, y + p * 6, p * 2, p * 2); // handle
        ctx.fillStyle = highlight;
        ctx.fillRect(x + p * 3, y, p, p * 5); // blade highlight
        break;

      case 'shield':
        ctx.fillRect(x + p, y + p, p * 6, p * 4); // body
        ctx.fillRect(x + p * 2, y + p * 5, p * 4, p);
        ctx.fillRect(x + p * 3, y + p * 6, p * 2, p);
        ctx.fillStyle = highlight;
        ctx.fillRect(x + p, y + p, p * 6, 1);
        ctx.fillRect(x + p, y + p, 1, p * 4);
        break;

      case 'gear':
        ctx.fillRect(x + p * 3, y, p * 2, p);
        ctx.fillRect(x + p * 3, y + p * 7, p * 2, p);
        ctx.fillRect(x, y + p * 3, p, p * 2);
        ctx.fillRect(x + p * 7, y + p * 3, p, p * 2);
        ctx.fillRect(x + p, y + p, p, p);
        ctx.fillRect(x + p * 6, y + p, p, p);
        ctx.fillRect(x + p, y + p * 6, p, p);
        ctx.fillRect(x + p * 6, y + p * 6, p, p);
        ctx.fillRect(x + p * 2, y + p * 2, p * 4, p * 4); // center
        ctx.fillStyle = dark;
        ctx.fillRect(x + p * 3, y + p * 3, p * 2, p * 2); // center hole
        break;

      case 'music':
        ctx.fillRect(x + p * 2, y, p, p * 6); // stem
        ctx.fillRect(x + p * 2, y, p * 4, p); // flag
        ctx.fillRect(x + p * 5, y + p, p, p); // flag end
        ctx.fillRect(x, y + p * 5, p * 3, p * 2); // note head
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y + p * 5, p * 3, 1);
        break;

      case 'check':
        ctx.fillRect(x + p * 5, y + p, p, p);
        ctx.fillRect(x + p * 4, y + p * 2, p, p);
        ctx.fillRect(x + p * 3, y + p * 3, p, p * 2);
        ctx.fillRect(x + p * 2, y + p * 4, p, p);
        ctx.fillRect(x + p, y + p * 3, p, p);
        ctx.fillRect(x, y + p * 2, p, p);
        break;

      case 'x':
        ctx.fillRect(x, y, p, p);
        ctx.fillRect(x + p, y + p, p, p);
        ctx.fillRect(x + p * 2, y + p * 2, p, p * 2);
        ctx.fillRect(x + p * 5, y + p * 5, p, p);
        ctx.fillRect(x + p * 6, y + p * 6, p, p);
        ctx.fillRect(x + p * 7, y + p * 7, p, p);
        ctx.fillRect(x + p * 7, y, p, p);
        ctx.fillRect(x + p * 6, y + p, p, p);
        ctx.fillRect(x + p, y + p * 6, p, p);
        ctx.fillRect(x, y + p * 7, p, p);
        break;

      case 'trophy':
        ctx.fillRect(x + p * 2, y, p * 4, p); // rim
        ctx.fillRect(x + p, y + p, p, p); // left cup
        ctx.fillRect(x + p * 6, y + p, p, p); // right cup
        ctx.fillRect(x + p, y + p * 2, p, p); // left handle
        ctx.fillRect(x + p * 6, y + p * 2, p, p);
        ctx.fillRect(x + p * 2, y + p, p * 4, p * 3); // cup body
        ctx.fillRect(x + p * 3, y + p * 4, p * 2, p); // stem
        ctx.fillRect(x + p * 2, y + p * 5, p * 4, p); // base
        ctx.fillRect(x + p, y + p * 6, p * 6, p); // base wide
        ctx.fillStyle = highlight;
        ctx.fillRect(x + p * 2, y, p * 4, 1);
        break;

      case 'skull':
        ctx.fillRect(x + p, y, p * 6, p * 5); // head
        ctx.fillRect(x, y + p, p, p * 3); // sides
        ctx.fillRect(x + p * 7, y + p, p, p * 3);
        ctx.fillStyle = dark;
        ctx.fillRect(x + p * 2, y + p * 2, p * 2, p * 2); // left eye
        ctx.fillRect(x + p * 4, y + p * 2, p * 2, p * 2); // right eye
        ctx.fillRect(x + p * 3, y + p * 5, p * 2, p * 2); // jaw
        ctx.fillRect(x + p * 2, y + p * 6, p, p); // jaw sides
        ctx.fillRect(x + p * 5, y + p * 6, p, p);
        break;

      case 'star':
        ctx.fillRect(x + p * 3, y, p * 2, p);
        ctx.fillRect(x + p * 2, y + p, p, p);
        ctx.fillRect(x + p * 5, y + p, p, p);
        ctx.fillRect(x + p, y + p * 2, p * 6, p);
        ctx.fillRect(x + p * 2, y + p * 3, p, p * 2);
        ctx.fillRect(x + p * 5, y + p * 3, p, p * 2);
        ctx.fillRect(x + p, y + p * 5, p, p);
        ctx.fillRect(x + p * 6, y + p * 5, p, p);
        ctx.fillRect(x, y + p * 6, p * 2, p);
        ctx.fillRect(x + p * 6, y + p * 6, p * 2, p);
        ctx.fillStyle = highlight;
        ctx.fillRect(x + p * 3, y, p, p);
        break;

      case 'book':
        ctx.fillRect(x, y + p, p * 7, p * 6); // pages
        ctx.fillRect(x + p, y, p * 7, p); // top
        ctx.fillRect(x + p, y + p * 7, p * 7, p); // bottom
        ctx.fillStyle = dark;
        ctx.fillRect(x + p * 3, y + p * 2, p * 3, p); // line 1
        ctx.fillRect(x + p * 3, y + p * 4, p * 3, p); // line 2
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y + p, 1, p * 6);
        break;

      case 'dice':
        ctx.fillRect(x + p, y + p, p * 6, p * 6);
        ctx.fillStyle = opts.bg || this.lighten(cols.panel, 20);
        ctx.fillRect(x + p + 1, y + p + 1, p * 6 - 2, p * 6 - 2);
        ctx.fillStyle = color;
        ctx.fillRect(x + p * 2, y + p * 2, p, p); // dot TL
        ctx.fillRect(x + p * 5, y + p * 2, p, p); // dot TR
        ctx.fillRect(x + p * 3, y + p * 4, p, p); // dot center
        ctx.fillRect(x + p * 2, y + p * 5, p, p); // dot BL
        ctx.fillRect(x + p * 5, y + p * 5, p, p); // dot BR
        ctx.fillStyle = highlight;
        ctx.fillRect(x + p, y + p, p * 6, 1);
        ctx.fillRect(x + p, y + p, 1, p * 6);
        break;

      case 'hourglass':
        ctx.fillRect(x + p, y, p * 6, p); // top rim
        ctx.fillRect(x, y + p, p, p); // top-left
        ctx.fillRect(x + p * 7, y + p, p, p); // top-right
        ctx.fillRect(x + p * 2, y + p * 2, p, p * 2); // neck top
        ctx.fillRect(x + p * 5, y + p * 2, p, p * 2);
        ctx.fillRect(x + p * 3, y + p * 3, p * 2, p); // center
        ctx.fillRect(x + p, y + p * 5, p, p * 2); // bottom-left
        ctx.fillRect(x + p * 6, y + p * 5, p, p * 2);
        ctx.fillRect(x + p, y + p * 7, p * 6, p); // bottom rim
        ctx.fillStyle = dark;
        ctx.fillRect(x + p * 2, y + p * 5, p * 4, p * 2); // sand bottom
        ctx.fillStyle = highlight;
        ctx.fillRect(x + p, y, p * 6, 1);
        break;

      case 'king':
        ctx.fillRect(x + p * 3, y, p * 2, p); // cross top
        ctx.fillRect(x + p * 3, y + p, p * 2, p); // cross
        ctx.fillRect(x + p, y + p * 2, p * 6, p * 2); // crown body
        ctx.fillRect(x, y + p * 2, p * 8, p); // crown base
        ctx.fillRect(x + p * 2, y + p * 4, p * 4, p * 3); // body
        ctx.fillRect(x + p, y + p * 7, p * 6, p); // base
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y + p * 2, p * 8, 1);
        break;

      case 'queen':
        ctx.fillRect(x + p * 2, y, p, p); // point 1
        ctx.fillRect(x + p * 5, y, p, p); // point 2
        ctx.fillRect(x + p * 7, y + p * 2, p, p); // point 3
        ctx.fillRect(x, y + p * 2, p * 8, p); // crown top
        ctx.fillRect(x + p, y + p * 3, p * 6, p); // crown body
        ctx.fillRect(x, y + p * 4, p * 8, p); // crown base
        ctx.fillRect(x + p * 2, y + p * 5, p * 4, p * 2); // body
        ctx.fillRect(x + p, y + p * 7, p * 6, p); // base
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y + p * 2, p * 8, 1);
        break;

      case 'volume':
        ctx.fillRect(x, y + p * 2, p, p * 4); // speaker
        ctx.fillRect(x + p, y + p, p * 2, p * 6); // speaker
        ctx.fillRect(x + p * 3, y + p * 2, p, p * 4); // cone
        // Waves
        if (opts.volume !== 0) {
          ctx.fillRect(x + p * 4, y + p * 2, p, p * 4);
        }
        if (opts.volume > 50) {
          ctx.fillRect(x + p * 5, y + p, p, p * 6);
        }
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y + p * 2, 1, p * 4);
        break;

      case 'keyboard':
        ctx.fillRect(x, y + p * 2, p * 8, p * 5); // body
        ctx.fillStyle = highlight;
        ctx.fillRect(x + p, y + p * 3, p, p); // key
        ctx.fillRect(x + p * 3, y + p * 3, p, p);
        ctx.fillRect(x + p * 5, y + p * 3, p, p);
        ctx.fillRect(x + p * 7, y + p * 3, p, p);
        ctx.fillRect(x + p, y + p * 5, p * 5, p); // spacebar
        break;

      case 'target':
        ctx.fillRect(x + p * 2, y + p, p * 4, p * 6); // body
        ctx.fillRect(x + p, y + p * 2, p * 6, p * 4);
        ctx.fillStyle = dark;
        ctx.fillRect(x + p * 3, y + p * 3, p * 2, p * 2); // center
        ctx.fillStyle = highlight;
        ctx.fillRect(x + p * 2, y + p, p * 4, 1);
        break;
    }
  }

  // --- DITHERED FILL (checkerboard pattern for pixel-art texture) ---
  static drawDitheredRect(ctx, x, y, w, h, color, alpha) {
    const a = alpha || '44';
    ctx.fillStyle = this.alpha(color, a);
    for (let dy = 0; dy < h; dy += 2) {
      const offsetX = (dy % 4 === 0) ? 0 : 1;
      for (let dx = offsetX; dx < w; dx += 2) {
        ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    }
  }

  // --- SCROLL INDICATOR (animated arrow) ---
  static drawScrollIndicator(ctx, x, y, cols, time, direction) {
    const offset = Math.sin(time * 3) * 2;
    const dir = direction || 'down';
    ctx.fillStyle = cols.accent + '88';

    if (dir === 'down') {
      const ay = y + offset;
      ctx.fillRect(x - 3, ay, 7, 2);
      ctx.fillRect(x - 1, ay + 2, 3, 1);
    } else {
      const ay = y - offset;
      ctx.fillRect(x - 3, ay, 7, 2);
      ctx.fillRect(x - 1, ay - 1, 3, 1);
    }
  }

  // --- VOLUME SLIDER (pixel-art styled slider) ---
  static drawVolumeSlider(ctx, x, y, w, h, value, cols) {
    // Track background
    ctx.fillStyle = this.darken(cols.panel, 30);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = this.alpha(cols.text, '22');
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

    // Fill
    const fillW = Math.floor((w - 4) * (value / 100));
    if (fillW > 0) {
      ctx.fillStyle = cols.accent;
      ctx.fillRect(x + 2, y + 2, fillW, h - 4);
      ctx.fillStyle = this.lighten(cols.accent, 40);
      ctx.fillRect(x + 2, y + 2, fillW, 1);
    }

    // Knob
    const knobX = x + 2 + fillW - Math.floor(h / 2);
    ctx.fillStyle = this.lighten(cols.panel, 30);
    ctx.fillRect(knobX, y - 1, h, h + 2);
    ctx.fillStyle = cols.text;
    ctx.fillRect(knobX + 1, y, h - 2, h);
    ctx.fillStyle = cols.accent;
    ctx.fillRect(knobX + 2, y + 1, h - 4, 1);
  }

  // --- DIFFICULTY COLOR (gradient from green to red based on level 1-10) ---
  static difficultyColor(level, cols) {
    const hue = 120 - (level - 1) * 12; // 120 (green) to 12 (red)
    // Convert HSL to hex approximation
    const s = 0.7;
    const l = 0.5;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = l - c / 2;
    let r, g, b;
    if (hue < 60) { r = c; g = x; b = 0; }
    else if (hue < 120) { r = x; g = c; b = 0; }
    else { r = 0; g = c; b = x; }
    return '#' + [r + m, g + m, b + m].map(v =>
      Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
    ).join('');
  }
}