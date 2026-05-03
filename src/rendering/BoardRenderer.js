class BoardRenderer {
  constructor() {
    this.boardX = 0;
    this.boardY = 0;
    this.squareSize = 0;
    this.animations = [];
    this.particles = [];
    this.shakeOffset = { x: 0, y: 0 };
    this.shakeIntensity = 0;
    this.shakeFrames = 0;
    this.captureFlash = null;
    this.flashAlpha = 0;
  }

  calcLayout() {
    // Force everything to integers
    const maxSize = 640;
    this.squareSize = Math.floor(maxSize / 8);
    const boardPx = this.squareSize * 8;
    this.boardX = Math.floor((1280 - boardPx) / 2);
    this.boardY = Math.floor((800 - boardPx) / 2);
  }

  boardToScreen(row, col) {
    return {
      x: this.boardX + col * this.squareSize,
      y: this.boardY + row * this.squareSize,
    };
  }

  screenToBoard(x, y) {
    const col = Math.floor((x - this.boardX) / this.squareSize);
    const row = Math.floor((y - this.boardY) / this.squareSize);
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return { row, col };
  }

  render(ctx, board, theme, selected, legalMoves, lastMove, turn, gameStatus, animating, lockedTiles) {
    this.calcLayout();
    const { boardX, boardY, squareSize } = this;
    const cols = theme.colors;

    // Screen shake
    if (this.shakeFrames > 0) {
      this.shakeFrames--;
      const intensity = this.shakeIntensity * (this.shakeFrames / 6);
      this.shakeOffset.x = Math.floor((Math.random() - 0.5) * intensity * 2);
      this.shakeOffset.y = Math.floor((Math.random() - 0.5) * intensity * 2);
    } else {
      this.shakeOffset = { x: 0, y: 0 };
    }

    // Capture flash decay
    if (this.flashAlpha > 0) {
      this.flashAlpha -= 0.06;
      if (this.flashAlpha < 0) this.flashAlpha = 0;
    }

    ctx.save();
    ctx.translate(this.shakeOffset.x, this.shakeOffset.y);

    // Background - animated theme background
    if (typeof backgroundRenderer !== 'undefined') {
      backgroundRenderer.render(ctx, dt);
    } else {
      ctx.fillStyle = cols.background;
      ctx.fillRect(0, 0, 1280, 800);
    }

    // Side decorations (Mario platformer style)
    this.renderDecorations(ctx, theme);

    // Board frame
    const framePad = 10;
    ctx.fillStyle = cols.panel;
    ctx.fillRect(
      boardX - framePad,
      boardY - framePad,
      squareSize * 8 + framePad * 2,
      squareSize * 8 + framePad * 2
    );

    // Outer border (thick, Mario style)
    ctx.strokeStyle = cols.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(
      boardX - framePad,
      boardY - framePad,
      squareSize * 8 + framePad * 2,
      squareSize * 8 + framePad * 2
    );

    // Inner border
    ctx.strokeStyle = cols.text + '33';
    ctx.lineWidth = 1;
    ctx.strokeRect(boardX, boardY, squareSize * 8, squareSize * 8);

    // Squares - strict integer math
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sx = boardX + col * squareSize;
        const sy = boardY + row * squareSize;
        const isLight = (row + col) % 2 === 0;
        const sqTex = TextureManager.getBoardTexture(theme.id, isLight);
        if (sqTex) {
          ctx.drawImage(sqTex, sx, sy, squareSize, squareSize);
        } else {
          ctx.fillStyle = isLight ? cols.lightSquare : cols.darkSquare;
          ctx.fillRect(sx, sy, squareSize, squareSize);

          // Pixel dot texture on dark squares
          if (!isLight) {
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            if ((row * 8 + col) % 5 === 0) {
              ctx.fillRect(sx + Math.floor(squareSize/2), sy + Math.floor(squareSize/2), 1, 1);
            }
          }
        }
      }
    }

    // Locked tiles
    if (lockedTiles && lockedTiles.length > 0) {
      for (const tile of lockedTiles) {
        const sx = boardX + tile.col * squareSize;
        const sy = boardY + tile.row * squareSize;
        ctx.fillStyle = 'rgba(255,0,0,0.2)';
        ctx.fillRect(sx + 1, sy + 1, squareSize - 2, squareSize - 2);
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx + 4, sy + 4);
        ctx.lineTo(sx + squareSize - 4, sy + squareSize - 4);
        ctx.moveTo(sx + squareSize - 4, sy + 4);
        ctx.lineTo(sx + 4, sy + squareSize - 4);
        ctx.stroke();
      }
    }

    // Last move highlight
    if (lastMove) {
      for (const pos of [lastMove.from, lastMove.to]) {
        if (pos) {
          const sx = boardX + pos.col * squareSize;
          const sy = boardY + pos.row * squareSize;
          ctx.fillStyle = 'rgba(255,255,100,0.15)';
          ctx.fillRect(sx + 1, sy + 1, squareSize - 2, squareSize - 2);
        }
      }
    }

    // Selected square
    if (selected) {
      const sx = boardX + selected.col * squareSize;
      const sy = boardY + selected.row * squareSize;
      ctx.fillStyle = cols.highlight + '30';
      ctx.fillRect(sx + 1, sy + 1, squareSize - 2, squareSize - 2);
      ctx.strokeStyle = cols.highlight;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, sy + 1, squareSize - 2, squareSize - 2);
    }

    // Legal move indicators
    if (legalMoves) {
      for (const move of legalMoves) {
        const sx = boardX + move.to.col * squareSize;
        const sy = boardY + move.to.row * squareSize;
        const target = board.grid[move.to.row][move.to.col];
        if (target) {
          ctx.strokeStyle = cols.highlight;
          ctx.lineWidth = 2;
          ctx.strokeRect(sx + 3, sy + 3, squareSize - 6, squareSize - 6);
        } else {
          ctx.fillStyle = cols.legalMove || 'rgba(0,0,0,0.12)';
          const dotSize = Math.max(3, Math.floor(squareSize * 0.1));
          ctx.beginPath();
          ctx.arc(sx + Math.floor(squareSize / 2), sy + Math.floor(squareSize / 2), dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Check highlight
    if (gameStatus === 'check' || gameStatus === 'checkmate') {
      const kingPos = board.findKing(board.turn);
      if (kingPos) {
        const sx = boardX + kingPos.col * squareSize;
        const sy = boardY + kingPos.row * squareSize;
        const pulse = Math.sin(Date.now() / 150) * 0.3 + 0.5;
        ctx.fillStyle = `rgba(255,0,0,${Math.floor(pulse * 40) / 100})`;
        ctx.fillRect(sx + 1, sy + 1, squareSize - 2, squareSize - 2);
        ctx.strokeStyle = `rgba(255,0,0,${Math.floor(pulse * 100) / 100})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, sy + 1, squareSize - 2, squareSize - 2);
      }
    }

    // Capture flash
    if (this.captureFlash && this.flashAlpha > 0) {
      const sx = boardX + this.captureFlash.col * squareSize;
      const sy = boardY + this.captureFlash.row * squareSize;
      ctx.fillStyle = `rgba(255,255,255,${Math.floor(this.flashAlpha * 100) / 100})`;
      ctx.fillRect(sx, sy, squareSize, squareSize);
    }

    // Pieces - integer pixel perfect
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board.grid[row][col];
        if (!piece) continue;

        if (this.animations.some(a => a.piece === piece && a.running)) continue;

        const sx = boardX + col * squareSize;
        const sy = boardY + row * squareSize;
        const padding = Math.max(2, Math.floor(squareSize * 0.06));
        const pSize = squareSize - padding * 2;
        PieceRenderer.drawPiece(ctx, piece.type, piece.color, theme, sx + padding, sy + padding, pSize);
      }
    }

    // Animations
    this.animations = this.animations.filter(a => {
      if (!a.running) return false;
      a.progress += 0.04 * (store.get('settings').animationSpeed || 1);
      if (a.progress >= 1) {
        a.running = false;
        if (a.onComplete) a.onComplete();
        return false;
      }
      const fromX = boardX + a.fromCol * squareSize;
      const fromY = boardY + a.fromRow * squareSize;
      const toX = boardX + a.toCol * squareSize;
      const toY = boardY + a.toRow * squareSize;
      const p = a.ease(a.progress);
      const x = Math.floor(fromX + (toX - fromX) * p);
      const y = Math.floor(fromY + (toY - fromY) * p - Math.sin(p * Math.PI) * squareSize * 0.1);
      const padding = Math.max(2, Math.floor(squareSize * 0.06));
      ctx.save();
      ctx.globalAlpha = 1 - a.progress * 0.15;
      PieceRenderer.drawPiece(ctx, a.type, a.color, theme, x + padding, y + padding, squareSize - padding * 2);
      ctx.restore();
      return true;
    });

    // Particles
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.life -= 0.02;
      if (p.life <= 0) return false;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      const px = Math.floor(p.x);
      const py = Math.floor(p.y);
      ctx.fillRect(px, py, p.size, p.size);
      ctx.globalAlpha = 1;
      return true;
    });

    // Coordinate labels
    ctx.fillStyle = cols.text + '55';
    ctx.font = `${Math.max(9, Math.floor(squareSize * 0.18))}px monospace`;
    ctx.textAlign = 'center';
    for (let i = 0; i < 8; i++) {
      ctx.fillText('abcdefgh'[i], boardX + i * squareSize + Math.floor(squareSize / 2), boardY + 8 * squareSize + Math.floor(squareSize * 0.28));
      ctx.fillText('' + (8 - i), boardX - Math.floor(squareSize * 0.12), boardY + i * squareSize + Math.floor(squareSize * 0.55));
    }

    ctx.restore();
  }

  renderDecorations(ctx, theme) {
    const cols = theme.colors;
    const t = theme.id;
    const time = Date.now() / 1000;

    // Helper: draw brick block
    const drawBrick = (x, y, w, h, col1, col2) => {
      ctx.fillStyle = col1;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = col2;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      // Brick lines
      ctx.beginPath();
      ctx.moveTo(x + Math.floor(w/2), y);
      ctx.lineTo(x + Math.floor(w/2), y + h);
      ctx.moveTo(x, y + Math.floor(h/2));
      ctx.lineTo(x + Math.floor(w/2), y + Math.floor(h/2));
      ctx.moveTo(x + Math.floor(w/2), y + Math.floor(h/2));
      ctx.lineTo(x + w, y + Math.floor(h/2));
      ctx.stroke();
    };

    // Helper: draw question block
    const drawQBlock = (x, y, w, h) => {
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#cc8800';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#664400';
      ctx.font = `${Math.floor(w * 0.5)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('?', x + w/2, y + h * 0.7);
    };

    // Helper: draw coin
    const drawCoin = (x, y, r) => {
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cc8800';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    // Helper: draw pipe
    const drawPipe = (x, y, h, col1, col2) => {
      ctx.fillStyle = col1;
      ctx.fillRect(x + 4, y + 12, 24, h - 12);
      ctx.fillRect(x, y, 32, 14);
      ctx.strokeStyle = col2;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 32, 14);
      ctx.strokeRect(x + 4, y + 12, 24, h - 12);
    };

    // LEFT PANEL (x: 0-200)
    switch (t) {
      case 'space':
        // Star blocks floating
        for (let i = 0; i < 5; i++) {
          const by = 50 + i * 140 + Math.sin(time + i) * 5;
          drawQBlock(40, Math.floor(by), 28, 28);
        }
        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        for (let i = 0; i < 12; i++) {
          const sx = (i * 37 + 10) % 180;
          const sy = (i * 53 + 20 + Math.sin(time * 0.5 + i) * 3) % 800;
          ctx.fillRect(Math.floor(sx), Math.floor(sy), 2, 2);
        }
        break;
      case 'medieval':
        // Castle bricks
        for (let i = 0; i < 6; i++) {
          drawBrick(30, 50 + i * 60, 40, 28, '#8b4513', '#5a2d0c');
          drawBrick(80, 50 + i * 60, 40, 28, '#8b4513', '#5a2d0c');
        }
        // Torches
        for (let i = 0; i < 3; i++) {
          const ty = 80 + i * 250;
          ctx.fillStyle = '#ff6600';
          ctx.beginPath();
          ctx.arc(150, Math.floor(ty + Math.sin(time * 3 + i) * 3), 8, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'ocean':
        // Water pipes
        drawPipe(40, 100, 80, '#228b22', '#1a6b1a');
        drawPipe(100, 200, 60, '#228b22', '#1a6b1a');
        // Bubbles
        for (let i = 0; i < 10; i++) {
          const bx = (i * 23 + 30) % 180;
          const by = (time * 30 + i * 47) % 800;
          ctx.fillStyle = 'rgba(200,240,255,0.3)';
          ctx.beginPath();
          ctx.arc(Math.floor(bx), Math.floor(by), 3 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'egypt':
        // Sand blocks
        for (let i = 0; i < 8; i++) {
          drawBrick(30 + (i % 2) * 45, 60 + Math.floor(i / 2) * 40, 40, 28, '#d4a843', '#b8942e');
        }
        // Palm tree top
        ctx.fillStyle = '#228b22';
        ctx.fillRect(140, 80, 8, 60);
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(144, 80);
          ctx.lineTo(110 + i * 15, 50 + i * 5);
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#228b22';
          ctx.stroke();
        }
        break;
      case 'cyberpunk':
        // Neon blocks
        for (let i = 0; i < 6; i++) {
          const ny = 60 + i * 120;
          ctx.fillStyle = i % 2 === 0 ? '#00fff5' : '#ff00aa';
          ctx.fillRect(40, ny, 30, 30);
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 10;
          ctx.strokeRect(40, ny, 30, 30);
          ctx.shadowBlur = 0;
        }
        // Grid lines
        ctx.strokeStyle = cols.lightPiece + '08';
        ctx.lineWidth = 1;
        for (let i = 0; i < 40; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * 20);
          ctx.lineTo(200, i * 20);
          ctx.stroke();
        }
        break;
      case 'japanese':
        // Torii gate
        ctx.fillStyle = '#cc2936';
        ctx.fillRect(30, 120, 120, 12);
        ctx.fillRect(30, 160, 120, 12);
        ctx.fillRect(50, 120, 10, 80);
        ctx.fillRect(120, 120, 10, 80);
        // Cherry blossoms falling
        for (let i = 0; i < 8; i++) {
          const sx = (i * 47 + 20 + Math.sin(time + i) * 10) % 180;
          const sy = (time * 20 + i * 73 + 50) % 800;
          ctx.fillStyle = '#ffb7c5';
          ctx.beginPath();
          ctx.arc(Math.floor(sx), Math.floor(sy), 4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'artdeco':
        // Gold blocks
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 3; j++) {
            drawBrick(20 + j * 50, 60 + i * 70, 44, 30, '#d4a843', '#b8942e');
          }
        }
        break;
      case 'wildwest':
        // Cactus
        ctx.fillStyle = '#6b8e23';
        ctx.fillRect(70, 100, 14, 70);
        ctx.fillRect(55, 120, 12, 8);
        ctx.fillRect(85, 140, 12, 8);
        // Tumbleweed
        ctx.fillStyle = '#8b7355';
        ctx.beginPath();
        ctx.arc(120, 300 + Math.sin(time) * 5, 15, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'prehistoric':
        // Dino egg
        ctx.fillStyle = '#90ee90';
        ctx.beginPath();
        ctx.ellipse(100, 150, 25, 35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#228b22';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Spots
        ctx.fillStyle = '#228b22';
        ctx.fillRect(90, 140, 6, 6);
        ctx.fillRect(110, 160, 6, 6);
        // Vines
        ctx.strokeStyle = '#228b22';
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(160, 50 + i * 40);
          ctx.quadraticCurveTo(130 + i * 10, 80 + i * 30, 140 + i * 8, 120 + i * 40);
          ctx.stroke();
        }
        break;
      case 'steampunk':
        // Brass pipes
        drawPipe(50, 80, 100, '#b87333', '#8b5a2b');
        drawPipe(120, 200, 80, '#b87333', '#8b5a2b');
        // Gears (animated)
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          const gx = 80;
          const gy = 400 + i * 20;
          ctx.save();
          ctx.translate(gx, gy);
          ctx.rotate(time * (i % 2 === 0 ? 1 : -1));
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.stroke();
          // Gear teeth
          for (let t = 0; t < 8; t++) {
            const angle = (t / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 14, Math.sin(angle) * 14);
            ctx.lineTo(Math.cos(angle) * 22, Math.sin(angle) * 22);
            ctx.stroke();
          }
          ctx.restore();
        }
        break;
    }

    // Coins floating
    if (t !== 'cyberpunk') {
      for (let i = 0; i < 3; i++) {
        const cy = 30 + i * 250 + Math.sin(time * 2 + i) * 5;
        drawCoin(170, Math.floor(cy), 8);
      }
    }

    // RIGHT PANEL (x: 1080-1280)
    switch (t) {
      case 'space':
        for (let i = 0; i < 5; i++) {
          const by = 80 + i * 140 + Math.sin(time * 0.7 + i) * 5;
          drawQBlock(1100, Math.floor(by), 28, 28);
        }
        // Moon
        ctx.fillStyle = '#e8e8e8';
        ctx.beginPath();
        ctx.arc(1200, 600, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = cols.background;
        ctx.beginPath();
        ctx.arc(1210, 595, 20, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'medieval':
        for (let i = 0; i < 6; i++) {
          drawBrick(1100, 50 + i * 60, 40, 28, '#8b4513', '#5a2d0c');
          drawBrick(1150, 50 + i * 60, 40, 28, '#8b4513', '#5a2d0c');
        }
        for (let i = 0; i < 3; i++) {
          const ty = 80 + i * 250;
          ctx.fillStyle = '#ff6600';
          ctx.beginPath();
          ctx.arc(1090, Math.floor(ty + Math.sin(time * 3 + i) * 3), 8, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'ocean':
        drawPipe(1110, 150, 70, '#228b22', '#1a6b1a');
        for (let i = 0; i < 8; i++) {
          const bx = 1100 + (i * 31) % 180;
          const by = (time * 25 + i * 53) % 800;
          ctx.fillStyle = 'rgba(200,240,255,0.2)';
          ctx.beginPath();
          ctx.arc(Math.floor(bx), Math.floor(by), 2 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'egypt':
        for (let i = 0; i < 8; i++) {
          drawBrick(1100 + (i % 2) * 45, 60 + Math.floor(i / 2) * 40, 40, 28, '#d4a843', '#b8942e');
        }
        break;
      case 'cyberpunk':
        for (let i = 0; i < 6; i++) {
          const ny = 60 + i * 120;
          ctx.fillStyle = i % 2 === 0 ? '#ff00aa' : '#00fff5';
          ctx.fillRect(1150, ny, 30, 30);
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 10;
          ctx.strokeRect(1150, ny, 30, 30);
          ctx.shadowBlur = 0;
        }
        break;
      case 'japanese':
        for (let i = 0; i < 6; i++) {
          const sx = 1100 + (i * 53 + 20 + Math.sin(time * 0.5 + i) * 10) % 180;
          const sy = (time * 20 + i * 79 + 50) % 800;
          ctx.fillStyle = '#ffb7c5';
          ctx.beginPath();
          ctx.arc(Math.floor(sx), Math.floor(sy), 4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'artdeco':
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 3; j++) {
            drawBrick(1100 + j * 50, 60 + i * 70, 44, 30, '#d4a843', '#b8942e');
          }
        }
        break;
      case 'wildwest':
        ctx.fillStyle = '#6b8e23';
        ctx.fillRect(1170, 100, 14, 70);
        ctx.fillRect(1155, 120, 12, 8);
        ctx.fillRect(1185, 140, 12, 8);
        break;
      case 'prehistoric':
        ctx.fillStyle = '#228b22';
        ctx.fillRect(1170, 50, 10, 80);
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(1175, 50 + i * 20);
          ctx.quadraticCurveTo(1220 + i * 10, 80 + i * 20, 1230 + i * 8, 110 + i * 20);
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#228b22';
          ctx.stroke();
        }
        break;
      case 'steampunk':
        drawPipe(1130, 100, 90, '#b87333', '#8b5a2b');
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          const gx = 1180;
          const gy = 400 + i * 20;
          ctx.save();
          ctx.translate(gx, gy);
          ctx.rotate(time * (i % 2 === 0 ? -1 : 1));
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.stroke();
          for (let t = 0; t < 8; t++) {
            const angle = (t / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 14, Math.sin(angle) * 14);
            ctx.lineTo(Math.cos(angle) * 22, Math.sin(angle) * 22);
            ctx.stroke();
          }
          ctx.restore();
        }
        break;
    }

    // Right side coins
    if (t !== 'cyberpunk') {
      for (let i = 0; i < 3; i++) {
        const cy = 30 + i * 250 + Math.sin(time * 2 + i + 1) * 5;
        drawCoin(1100, Math.floor(cy), 8);
      }
    }
  }

  animateMove(fromRow, fromCol, toRow, toCol, piece, onComplete) {
    this.animations.push({
      fromRow, fromCol, toRow, toCol,
      type: piece.type,
      color: piece.color,
      piece,
      progress: 0,
      running: true,
      onComplete,
      ease: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    });
  }

  triggerScreenShake(intensity) {
    this.shakeFrames = 8;
    this.shakeIntensity = intensity;
  }

  triggerCaptureFlash(row, col) {
    this.captureFlash = { row, col };
    this.flashAlpha = 0.8;
  }

  spawnParticles(x, y, colors, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 7,
        vy: -Math.random() * 7 - 1,
        size: Math.floor(Math.random() * 3) + 2,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  clearAnimations() {
    this.animations = [];
    this.particles = [];
    this.shakeFrames = 0;
    this.captureFlash = null;
    this.flashAlpha = 0;
  }
}
