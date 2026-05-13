const MiniGameThumbnails = {
  _cache: {},

  generate(key, width, height) {
    const cacheKey = `${key}_${width}_${height}`;
    if (this._cache[cacheKey]) return this._cache[cacheKey];

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const drawer = this._drawers[key];
    if (drawer) {
      drawer(ctx, width, height);
    } else {
      this._drawDefault(ctx, width, height, key);
    }

    this._cache[cacheKey] = canvas;
    return canvas;
  },

  _drawDefault(ctx, w, h, key) {
    ctx.fillStyle = '#1a1030';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#888';
    ctx.font = 'bold ' + Math.floor(h * 0.4) + 'px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', w / 2, h / 2);
  },

  _drawers: {
    quickClick(ctx, w, h) {
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(0, 0, w, h);
      var cx = Math.floor(w * 0.45);
      var cy = Math.floor(h * 0.5);
      var r = Math.floor(Math.min(w, h) * 0.32);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#cc2244';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.floor(r * 0.65), 0, Math.PI * 2);
      ctx.fillStyle = '#1a1030';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.floor(r * 0.35), 0, Math.PI * 2);
      ctx.fillStyle = '#cc2244';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.floor(r * 0.12), 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      var ax = Math.floor(w * 0.68);
      var ay = Math.floor(h * 0.35);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax, ay + 16);
      ctx.lineTo(ax + 10, ay + 12);
      ctx.closePath();
      ctx.fill();
    },

    memoryMatch(ctx, w, h) {
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(0, 0, w, h);
      var cols = 3;
      var rows = 2;
      var cardW = Math.floor(w * 0.2);
      var cardH = Math.floor(h * 0.3);
      var gap = Math.floor(w * 0.04);
      var totalW = cols * cardW + (cols - 1) * gap;
      var totalH = rows * cardH + (rows - 1) * gap;
      var startX = Math.floor((w - totalW) / 2);
      var startY = Math.floor((h - totalH) / 2);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x = startX + c * (cardW + gap);
          var y = startY + r * (cardH + gap);
          if ((r === 0 && c === 1) || (r === 1 && c === 2)) {
            ctx.fillStyle = '#44dd88';
            ctx.fillRect(x, y, cardW, cardH);
            ctx.fillStyle = '#1a1030';
            ctx.font = 'bold ' + Math.floor(cardH * 0.6) + 'px "Pixelify Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', x + Math.floor(cardW / 2), y + Math.floor(cardH / 2));
          } else {
            ctx.fillStyle = '#3a2860';
            ctx.fillRect(x, y, cardW, cardH);
            ctx.strokeStyle = '#6644aa';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, cardW, cardH);
          }
        }
      }
    },

    timingStrike(ctx, w, h) {
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(0, 0, w, h);
      var barY = Math.floor(h * 0.42);
      var barH = Math.floor(h * 0.18);
      var barX = Math.floor(w * 0.1);
      var barW = Math.floor(w * 0.8);
      ctx.fillStyle = '#2a1848';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeStyle = '#6644aa';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, barH);
      var zoneW = Math.floor(barW * 0.2);
      var zoneX = barX + Math.floor(barW * 0.4);
      ctx.fillStyle = '#44dd88';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(zoneX, barY, zoneW, barH);
      ctx.globalAlpha = 1.0;
      var indicX = barX + Math.floor(barW * 0.65);
      ctx.fillStyle = '#ffaa44';
      ctx.beginPath();
      ctx.moveTo(indicX, barY - 6);
      ctx.lineTo(indicX - 5, barY - 14);
      ctx.lineTo(indicX + 5, barY - 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(indicX - 2, barY, 4, barH);
    },

    patternPress(ctx, w, h) {
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(0, 0, w, h);
      var colors = ['#cc2244', '#4488ff', '#44dd88', '#ffcc22'];
      var sqSize = Math.floor(Math.min(w, h) * 0.22);
      var gap = Math.floor(w * 0.04);
      var totalW = 4 * sqSize + 3 * gap;
      var startX = Math.floor((w - totalW) / 2);
      var cy = Math.floor(h * 0.5 - sqSize / 2);
      for (var i = 0; i < 4; i++) {
        var x = startX + i * (sqSize + gap);
        if (i === 1) {
          ctx.fillStyle = colors[i];
          ctx.fillRect(x, cy, sqSize, sqSize);
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.3;
          ctx.fillRect(x, cy, sqSize, Math.floor(sqSize * 0.4));
          ctx.globalAlpha = 1.0;
        } else {
          ctx.fillStyle = colors[i];
          ctx.globalAlpha = 0.4;
          ctx.fillRect(x, cy, sqSize, sqSize);
          ctx.globalAlpha = 1.0;
        }
      }
    },

    reactionTest(ctx, w, h) {
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(0, 0, w, h);
      var cx = Math.floor(w * 0.5);
      var lightR = Math.floor(Math.min(w, h) * 0.1);
      var gap = Math.floor(lightR * 0.6);
      var boxW = Math.floor(lightR * 2.8);
      var boxH = Math.floor(lightR * 6 + gap * 4);
      var boxX = Math.floor(cx - boxW / 2);
      var boxY = Math.floor(h * 0.5 - boxH / 2);
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = '#555555';
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      var lightColors = ['#cc2244', '#ffcc22', '#44dd88'];
      for (var i = 0; i < 3; i++) {
        var ly = boxY + gap + i * (lightR * 2 + gap) + lightR;
        if (i === 2) {
          ctx.beginPath();
          ctx.arc(cx, ly, lightR, 0, Math.PI * 2);
          ctx.fillStyle = lightColors[i];
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx, ly, lightR + 4, 0, Math.PI * 2);
          ctx.strokeStyle = lightColors[i];
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        } else {
          ctx.beginPath();
          ctx.arc(cx, ly, lightR, 0, Math.PI * 2);
          ctx.fillStyle = lightColors[i];
          ctx.globalAlpha = 0.25;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      }
    },

    undertaleDodge(ctx, w, h) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      var boxW = Math.floor(w * 0.55);
      var boxH = Math.floor(h * 0.6);
      var bx = Math.floor((w - boxW) / 2);
      var by = Math.floor((h - boxH) / 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, boxW, boxH);
      var hx = Math.floor(w * 0.5);
      var hy = Math.floor(h * 0.52);
      var hs = Math.floor(Math.min(w, h) * 0.08);
      ctx.fillStyle = '#ff3366';
      ctx.beginPath();
      ctx.moveTo(hx, hy + hs);
      ctx.bezierCurveTo(hx - hs, hy, hx - hs, hy - hs * 0.6, hx, hy - hs * 0.2);
      ctx.bezierCurveTo(hx + hs, hy - hs * 0.6, hx + hs, hy, hx, hy + hs);
      ctx.fill();
      var bullets = [
        [0.3, 0.3], [0.65, 0.25], [0.72, 0.6],
        [0.35, 0.7], [0.58, 0.45], [0.4, 0.48],
        [0.68, 0.38], [0.32, 0.55]
      ];
      ctx.fillStyle = '#ffffff';
      var br = Math.floor(Math.min(w, h) * 0.025);
      for (var i = 0; i < bullets.length; i++) {
        var bxp = bx + Math.floor(boxW * bullets[i][0]);
        var byp = by + Math.floor(boxH * bullets[i][1]);
        ctx.beginPath();
        ctx.arc(bxp, byp, br, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    powerMeter(ctx, w, h) {
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(0, 0, w, h);
      var barX = Math.floor(w * 0.15);
      var barY = Math.floor(h * 0.3);
      var barW = Math.floor(w * 0.7);
      var barH = Math.floor(h * 0.35);
      ctx.fillStyle = '#2a1848';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeStyle = '#6644aa';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, barH);
      var fillW = Math.floor(barW * 0.6);
      var grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, '#44dd88');
      grad.addColorStop(0.5, '#ffcc22');
      grad.addColorStop(1, '#cc2244');
      ctx.fillStyle = grad;
      ctx.fillRect(barX + 2, barY + 2, fillW, barH - 4);
      var markX = barX + fillW;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(markX, barY + barH + 4);
      ctx.lineTo(markX - 5, barY + barH + 12);
      ctx.lineTo(markX + 5, barY + barH + 12);
      ctx.closePath();
      ctx.fill();
    },

    targetPractice(ctx, w, h) {
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(0, 0, w, h);
      var cx = Math.floor(w * 0.5);
      var cy = Math.floor(h * 0.48);
      var r = Math.floor(Math.min(w, h) * 0.16);
      ctx.strokeStyle = '#44dd88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r - 6, cy);
      ctx.lineTo(cx + r + 6, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - r - 6);
      ctx.lineTo(cx, cy + r + 6);
      ctx.stroke();
      var dots = [
        [0.2, 0.25], [0.75, 0.3], [0.15, 0.7],
        [0.82, 0.72], [0.6, 0.15], [0.35, 0.82]
      ];
      ctx.fillStyle = '#ffaa44';
      var dr = Math.floor(Math.min(w, h) * 0.03);
      for (var i = 0; i < dots.length; i++) {
        ctx.beginPath();
        ctx.arc(Math.floor(w * dots[i][0]), Math.floor(h * dots[i][1]), dr, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    dodgeFalling(ctx, w, h) {
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(0, 0, w, h);
      var charW = Math.floor(w * 0.08);
      var charH = Math.floor(h * 0.12);
      var charX = Math.floor(w * 0.5 - charW / 2);
      var charY = Math.floor(h * 0.82 - charH);
      ctx.fillStyle = '#44dd88';
      ctx.fillRect(charX, charY, charW, charH);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(charX + 2, charY + 2, Math.floor(charW * 0.3), Math.floor(charH * 0.25));
      ctx.fillRect(charX + charW - 2 - Math.floor(charW * 0.3), charY + 2, Math.floor(charW * 0.3), Math.floor(charH * 0.25));
      var objects = [
        [0.2, 0.12, 0.08, 0.06],
        [0.55, 0.25, 0.07, 0.07],
        [0.8, 0.08, 0.06, 0.08],
        [0.35, 0.4, 0.09, 0.06],
        [0.7, 0.48, 0.06, 0.07],
        [0.15, 0.55, 0.07, 0.06],
        [0.5, 0.6, 0.08, 0.05],
      ];
      var obstColors = ['#cc2244', '#ffaa44', '#cc2244', '#ffaa44', '#cc2244', '#ffaa44', '#cc2244'];
      for (var i = 0; i < objects.length; i++) {
        ctx.fillStyle = obstColors[i];
        ctx.fillRect(
          Math.floor(w * objects[i][0]),
          Math.floor(h * objects[i][1]),
          Math.floor(w * objects[i][2]),
          Math.floor(h * objects[i][3])
        );
      }
    },

    rhythmTap(ctx, w, h) {
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(0, 0, w, h);
      var lineY = Math.floor(h * 0.5);
      var lineX = Math.floor(w * 0.08);
      var lineW = Math.floor(w * 0.84);
      ctx.strokeStyle = '#6644aa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lineX, lineY);
      ctx.lineTo(lineX + lineW, lineY);
      ctx.stroke();
      var notes = [0.15, 0.35, 0.55, 0.75, 0.9];
      ctx.fillStyle = '#ffaa44';
      ctx.font = 'bold ' + Math.floor(h * 0.25) + 'px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var i = 0; i < notes.length; i++) {
        ctx.fillText('♪', Math.floor(w * notes[i]), lineY - Math.floor(h * 0.12));
      }
      var markerX = Math.floor(w * 0.35);
      ctx.fillStyle = '#44dd88';
      ctx.fillRect(markerX - 2, lineY - Math.floor(h * 0.2), 4, Math.floor(h * 0.4));
    },

    numberGuess(ctx, w, h) {
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffcc22';
      ctx.font = 'bold ' + Math.floor(h * 0.4) + 'px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', Math.floor(w * 0.5), Math.floor(h * 0.5));
      var arrowSize = Math.floor(Math.min(w, h) * 0.08);
      var cx = Math.floor(w * 0.5);
      ctx.fillStyle = '#44dd88';
      ctx.beginPath();
      ctx.moveTo(cx, Math.floor(h * 0.15));
      ctx.lineTo(cx - arrowSize, Math.floor(h * 0.15) + arrowSize);
      ctx.lineTo(cx + arrowSize, Math.floor(h * 0.15) + arrowSize);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#cc2244';
      ctx.beginPath();
      ctx.moveTo(cx, Math.floor(h * 0.85));
      ctx.lineTo(cx - arrowSize, Math.floor(h * 0.85) - arrowSize);
      ctx.lineTo(cx + arrowSize, Math.floor(h * 0.85) - arrowSize);
      ctx.closePath();
      ctx.fill();
    },

    coinFlip(ctx, w, h) {
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(0, 0, w, h);
      var cx = Math.floor(w * 0.5);
      var cy = Math.floor(h * 0.48);
      var r = Math.floor(Math.min(w, h) * 0.3);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffcc22';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.floor(r * 0.85), 0, Math.PI * 2);
      ctx.strokeStyle = '#cc8800';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.floor(r * 0.85), 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#cc8800';
      ctx.fillRect(cx, cy - r, r, r * 2);
      ctx.globalAlpha = 0.3;
      ctx.fillRect(cx, cy - r, r, r * 2);
      ctx.globalAlpha = 1.0;
      ctx.restore();
      ctx.fillStyle = '#1a1030';
      ctx.font = 'bold ' + Math.floor(r * 0.7) + 'px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cx, cy + 2);
    },

    barBalance(ctx, w, h) {
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(0, 0, w, h);
      var cx = Math.floor(w * 0.5);
      var fulcrumY = Math.floor(h * 0.72);
      var triSize = Math.floor(Math.min(w, h) * 0.1);
      ctx.fillStyle = '#6644aa';
      ctx.beginPath();
      ctx.moveTo(cx, fulcrumY);
      ctx.lineTo(cx - triSize, fulcrumY + triSize);
      ctx.lineTo(cx + triSize, fulcrumY + triSize);
      ctx.closePath();
      ctx.fill();
      var barW = Math.floor(w * 0.7);
      var barH = Math.floor(h * 0.06);
      var angle = -0.12;
      ctx.save();
      ctx.translate(cx, fulcrumY);
      ctx.rotate(angle);
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(-Math.floor(barW / 2), -Math.floor(barH / 2), barW, barH);
      ctx.fillStyle = '#44dd88';
      ctx.fillRect(-2, -Math.floor(barH / 2) - 3, 4, barH + 6);
      ctx.restore();
    },

    shieldBlock(ctx, w, h) {
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(0, 0, w, h);
      var sx = Math.floor(w * 0.22);
      var sy = Math.floor(h * 0.25);
      var sw = Math.floor(w * 0.22);
      var sh = Math.floor(h * 0.5);
      ctx.fillStyle = '#4488ff';
      ctx.beginPath();
      ctx.moveTo(sx + Math.floor(sw / 2), sy);
      ctx.lineTo(sx + sw, sy + Math.floor(sh * 0.2));
      ctx.lineTo(sx + sw, sy + Math.floor(sh * 0.6));
      ctx.lineTo(sx + Math.floor(sw / 2), sy + sh);
      ctx.lineTo(sx, sy + Math.floor(sh * 0.6));
      ctx.lineTo(sx, sy + Math.floor(sh * 0.2));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#88bbff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + Math.floor(sw * 0.38), sy + Math.floor(sh * 0.2), Math.floor(sw * 0.24), Math.floor(sh * 0.35));
      ctx.fillRect(sx + Math.floor(sw * 0.28), sy + Math.floor(sh * 0.32), Math.floor(sw * 0.44), Math.floor(sh * 0.12));
      var projY = Math.floor(h * 0.5);
      ctx.fillStyle = '#cc2244';
      var projR = Math.floor(Math.min(w, h) * 0.03);
      var projPositions = [0.55, 0.65, 0.78, 0.88];
      for (var i = 0; i < projPositions.length; i++) {
        ctx.beginPath();
        ctx.arc(
          Math.floor(w * projPositions[i]),
          projY + Math.floor((i % 2 === 0 ? -1 : 1) * h * 0.08),
          projR, 0, Math.PI * 2
        );
        ctx.fill();
      }
    },

    whackMole(ctx, w, h) {
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(0, 0, w, h);
      var cols = 3;
      var rows = 2;
      var holeR = Math.floor(Math.min(w, h) * 0.1);
      var gapX = Math.floor(w * 0.08);
      var gapY = Math.floor(h * 0.08);
      var totalW = cols * holeR * 2 + (cols - 1) * gapX;
      var totalH = rows * holeR * 2 + (rows - 1) * gapY;
      var startX = Math.floor((w - totalW) / 2) + holeR;
      var startY = Math.floor((h - totalH) / 2) + holeR;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var cx = startX + c * (holeR * 2 + gapX);
          var cy = startY + r * (holeR * 2 + gapY);
          ctx.beginPath();
          ctx.ellipse(cx, cy + Math.floor(holeR * 0.3), holeR, Math.floor(holeR * 0.6), 0, 0, Math.PI * 2);
          ctx.fillStyle = '#2a1848';
          ctx.fill();
          ctx.strokeStyle = '#6644aa';
          ctx.lineWidth = 2;
          ctx.stroke();
          if (r === 0 && c === 1) {
            var moleR = Math.floor(holeR * 0.7);
            ctx.beginPath();
            ctx.arc(cx, cy - Math.floor(holeR * 0.15), moleR, 0, Math.PI * 2);
            ctx.fillStyle = '#886633';
            ctx.fill();
            var eyeOff = Math.floor(moleR * 0.3);
            var eyeR = Math.floor(moleR * 0.15);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx - eyeOff, cy - Math.floor(holeR * 0.25), eyeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + eyeOff, cy - Math.floor(holeR * 0.25), eyeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(cx - eyeOff, cy - Math.floor(holeR * 0.25), Math.floor(eyeR * 0.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + eyeOff, cy - Math.floor(holeR * 0.25), Math.floor(eyeR * 0.5), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }
};
