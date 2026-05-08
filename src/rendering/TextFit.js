const TextFit = {
  _ready: false,
  _checkReady() {
    if (!this._ready && window.Pretext) this._ready = true;
    return this._ready;
  },

  measure(text, font, maxWidth, lineHeight) {
    if (!this._checkReady()) return null;
    const prepared = Pretext.prepare(text, font);
    return Pretext.layout(prepared, maxWidth, lineHeight);
  },

  measureWidth(text, font) {
    if (!this._checkReady()) return null;
    const prepared = Pretext.prepare(text, font);
    return Pretext.measureNaturalWidth(prepared);
  },

  fitFontSize(text, font, maxWidth, maxHeight, lineHeight, minSize, maxSize) {
    if (!this._checkReady()) return font;
    minSize = minSize || 8;
    maxSize = maxSize || parseInt(font) || 14;
    let bestSize = minSize;
    for (let size = maxSize; size >= minSize; size--) {
      const testFont = font.replace(/\d+px/, size + 'px');
      const lh = lineHeight || Math.round(size * 1.3);
      const prepared = Pretext.prepare(text, testFont);
      const result = Pretext.layout(prepared, maxWidth, lh);
      if (result.height <= maxHeight) {
        bestSize = size;
        break;
      }
    }
    return font.replace(/\d+px/, bestSize + 'px');
  },

  drawFitted(ctx, text, font, x, y, maxWidth, maxHeight, lineHeight, opts) {
    opts = opts || {};
    const lh = lineHeight || Math.round(parseInt(font) * 1.3);

    if (this._checkReady()) {
      const fittedFont = opts.shrinkToFit
        ? this.fitFontSize(text, font, maxWidth, maxHeight, lh, opts.minSize || 8)
        : font;
      ctx.font = fittedFont;
      const actualLh = lineHeight || Math.round(parseInt(fittedFont) * 1.3);
      const prepared = Pretext.prepareWithSegments(text, fittedFont);
      let lineNum = 0;
      const maxLines = opts.maxLines || Math.floor(maxHeight / actualLh);
      Pretext.walkLineRanges(prepared, maxWidth, (line) => {
        if (lineNum >= maxLines) return;
        const lineText = text.slice(line.startOffset, line.endOffset).trimEnd();
        ctx.fillText(lineText, x, y + lineNum * actualLh);
        lineNum++;
      });
      return lineNum;
    }

    // Fallback when pretext not loaded yet
    ctx.font = font;
    return UIHelpers.wrapText(ctx, text, x, y, maxWidth, lh, opts.maxLines || 5);
  },

  scaleToFit(text, font, maxWidth) {
    if (!this._checkReady()) return 1;
    const naturalW = Pretext.measureNaturalWidth(Pretext.prepare(text, font));
    if (naturalW <= maxWidth) return 1;
    return maxWidth / naturalW;
  },
};
