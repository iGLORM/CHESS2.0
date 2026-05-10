class BackgroundRenderer {
  constructor() {
    this.state = {};
    this.lastTheme = null;
    this.time = 0;
    this.bgImages = {};
    this._loadBgImage('ocean', '../assets/textures/backgrounds/ocean_bg.png');
    this._loadBgImage('japanese', '../assets/textures/backgrounds/japanese_bg.png');
    this._loadBgImage('wildwest', '../assets/textures/backgrounds/wildwest_bg.webp');
    this._loadBgImage('crystal', '../assets/textures/backgrounds/crystal_bg.png');
  }

  _loadBgImage(themeId, src) {
    const img = new Image();
    img.onload = () => { this.bgImages[themeId] = img; };
    img.src = src;
  }

  initTheme(themeId) {
    if (this.lastTheme === themeId) return;
    this.lastTheme = themeId;
    this.state = this.createState(themeId);
  }

  createState(themeId) {
    const s = { particles: [], objects: [] };
    switch (themeId) {
      case 'space':
        for (let i = 0; i < 150; i++) {
          s.particles.push({
            x: Math.random() * Layout.W, y: Math.random() * Layout.H,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.3 + 0.1,
            twinkle: Math.random() * Math.PI * 2,
            twinkleSpeed: Math.random() * 2 + 1,
          });
        }
        s.objects = [
          { x: 200, y: 150, r: 30, color: '#6b5b95', rings: true },
          { x: 1000, y: 100, r: 20, color: '#ff6f61', rings: false },
          { x: 1100, y: 600, r: 45, color: '#88d8b0', rings: false },
        ];
        break;
      case 'medieval':
        for (let i = 0; i < 8; i++) {
          s.particles.push({
            x: 80 + i * 160, y: 650,
            flicker: Math.random() * Math.PI * 2,
            flickerSpeed: Math.random() * 3 + 2,
          });
        }
        break;
      case 'ocean':
        for (let i = 0; i < 30; i++) {
          s.particles.push({
            x: Math.random() * Layout.W, y: Math.random() * Layout.H,
            size: Math.random() * 4 + 2,
            speedY: -(Math.random() * 0.5 + 0.3),
            speedX: Math.random() * 0.2 - 0.1,
            wobble: Math.random() * Math.PI * 2,
          });
        }
        for (let i = 0; i < 12; i++) {
          s.objects.push({
            x: Math.random() * Layout.W, y: 500 + Math.random() * 300,
            size: Math.random() * 20 + 10,
            speed: Math.random() * 0.5 + 0.3,
            color: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#ff8b94'][Math.floor(Math.random() * 4)],
            type: 'fish',
          });
        }
        for (let i = 0; i < 6; i++) {
          s.objects.push({
            x: Math.random() * Layout.W, y: 600 + Math.random() * 200,
            size: Math.random() * 40 + 20,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: Math.random() * 0.5 + 0.3,
            color: ['#ff6b6b', '#4ecdc4', '#95e1d3', '#f38181'][Math.floor(Math.random() * 4)],
            type: 'coral',
          });
        }
        break;
      case 'egypt':
        for (let i = 0; i < 20; i++) {
          s.particles.push({
            x: Math.random() * Layout.W, y: Math.random() * Layout.H,
            size: Math.random() * 2 + 1,
            speedX: Math.random() * 0.5 + 0.2,
            speedY: Math.random() * 0.1 - 0.05,
          });
        }
        break;
      case 'cyberpunk':
        for (let i = 0; i < 80; i++) {
          s.particles.push({
            x: Math.random() * Layout.W, y: Math.random() * Layout.H,
            length: Math.random() * 20 + 5,
            speed: Math.random() * 4 + 2,
            color: Math.random() > 0.5 ? '#00fff5' : '#ff00aa',
          });
        }
        s.objects = [];
        for (let i = 0; i < 15; i++) {
          s.objects.push({
            x: Math.random() * Layout.W, y: 50 + Math.random() * 150,
            w: Math.random() * 60 + 20,
            h: Math.random() * 100 + 50,
            color: Math.random() > 0.5 ? '#00fff5' : '#ff00aa',
            glow: Math.random() * Math.PI * 2,
          });
        }
        break;
      case 'japanese':
        for (let i = 0; i < 40; i++) {
          s.particles.push({
            x: Math.random() * Layout.W, y: Math.random() * Layout.H,
            size: Math.random() * 4 + 2,
            speedY: Math.random() * 0.5 + 0.3,
            speedX: Math.random() * 0.3 - 0.15,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: Math.random() * 0.02 - 0.01,
          });
        }
        break;
      case 'artdeco':
        s.objects = [
          { x: Layout.cx, y: Layout.cy, r: 300, rays: 24 },
          { x: 200, y: 200, r: 80, rays: 12 },
          { x: 1080, y: 200, r: 60, rays: 12 },
          { x: 200, y: 600, r: 70, rays: 12 },
          { x: 1080, y: 600, r: 90, rays: 12 },
        ];
        break;
      case 'wildwest':
        for (let i = 0; i < 5; i++) {
          s.objects.push({
            x: Math.random() * Layout.W, y: 550 + Math.random() * 200,
            size: Math.random() * 30 + 20,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: Math.random() * 0.3 + 0.2,
            type: 'cactus',
          });
        }
        for (let i = 0; i < 3; i++) {
          s.objects.push({
            x: Math.random() * Layout.W, y: 600 + Math.random() * 100,
            size: Math.random() * 15 + 10,
            rollSpeed: Math.random() * 0.5 + 0.3,
            type: 'tumbleweed',
          });
        }
        break;
      case 'prehistoric':
        for (let i = 0; i < 8; i++) {
          s.objects.push({
            x: Math.random() * Layout.W, y: 500 + Math.random() * 200,
            size: Math.random() * 30 + 15,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: Math.random() * 0.4 + 0.2,
            color: ['#2e7d32', '#1b5e20', '#388e3c', '#4caf50'][Math.floor(Math.random() * 4)],
            type: 'fern',
          });
        }
        s.objects.push({
          x: 1100, y: 300, size: 60,
          color: '#ff6f00', type: 'volcano',
        });
        for (let i = 0; i < 15; i++) {
          s.particles.push({
            x: 1100 + (Math.random() - 0.5) * 40,
            y: 300 - Math.random() * 20,
            size: Math.random() * 3 + 1,
            speedY: -(Math.random() * 1 + 0.5),
            speedX: (Math.random() - 0.5) * 0.5,
            life: Math.random() * 2 + 1,
            color: '#ff6f00',
          });
        }
        break;
      case 'steampunk':
        for (let i = 0; i < 6; i++) {
          s.objects.push({
            x: 150 + i * 200, y: 200 + (i % 2) * 300,
            r: Math.random() * 40 + 20,
            teeth: Math.floor(Math.random() * 8 + 8),
            speed: (Math.random() * 0.5 + 0.2) * (i % 2 === 0 ? 1 : -1),
            color: ['#b7410e', '#d4b896', '#8b6f47', '#5a3d1a'][Math.floor(Math.random() * 4)],
          });
        }
        for (let i = 0; i < 20; i++) {
          s.particles.push({
            x: Math.random() * Layout.W, y: 700 + Math.random() * 100,
            size: Math.random() * 8 + 4,
            speedY: -(Math.random() * 0.5 + 0.2),
            speedX: (Math.random() - 0.5) * 0.3,
            life: Math.random() * 3 + 2,
            alpha: Math.random() * 0.3 + 0.1,
          });
        }
        break;
      case 'crystal':
        for (let i = 0; i < 70; i++) {
          s.particles.push({
            x: Math.random() * Layout.W,
            y: Math.random() * Layout.H,
            size: Math.random() > 0.8 ? 2 : 1,
            twinkle: Math.random() * Math.PI * 2,
            twinkleSpeed: Math.random() * 2 + 0.5,
            color: Math.random() > 0.5 ? '#00e5ff' : '#d932ff',
          });
        }
        break;
    }
    return s;
  }

  _getBgThemeId() {
    const themeId = store.get('theme');
    if (themeId === 'custom') {
      return store.get('customBgTheme') || 'space';
    }
    return themeId;
  }

  update(dt) {
    this.time += dt;
    const themeId = this._getBgThemeId();
    this.initTheme(themeId);
    const s = this.state;

    switch (themeId) {
      case 'space':
        for (const p of s.particles) {
          p.y += p.speed;
          p.twinkle += dt * p.twinkleSpeed;
          if (p.y > Layout.H) { p.y = -5; p.x = Math.random() * Layout.W; }
        }
        break;
      case 'medieval':
        for (const p of s.particles) {
          p.flicker += dt * p.flickerSpeed;
        }
        break;
      case 'ocean':
        for (const p of s.particles) {
          p.y += p.speedY;
          p.x += p.speedX;
          p.wobble += dt * 2;
          if (p.y < -10) { p.y = Layout.H + 10; p.x = Math.random() * Layout.W; }
        }
        for (const o of s.objects) {
          if (o.type === 'coral') {
            o.sway += dt * o.swaySpeed;
          }
        }
        break;
      case 'egypt':
        for (const p of s.particles) {
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.x > Layout.W + 20) p.x = -10;
          if (p.y > Layout.H + 10) p.y = -10;
        }
        break;
      case 'cyberpunk':
        for (const p of s.particles) {
          p.y += p.speed;
          if (p.y > Layout.H + 10) { p.y = -p.length; p.x = Math.random() * Layout.W; }
        }
        for (const o of s.objects) {
          o.glow += dt * 2;
        }
        break;
      case 'japanese':
        for (const p of s.particles) {
          p.y += p.speedY;
          p.x += p.speedX + Math.sin(this.time + p.y * 0.01) * 0.2;
          p.rotation += p.rotSpeed;
          if (p.y > Layout.H + 10) { p.y = -10; p.x = Math.random() * Layout.W; }
        }
        break;
      case 'wildwest':
        for (const o of s.objects) {
          if (o.type === 'cactus') {
            o.sway += dt * o.swaySpeed;
          } else if (o.type === 'tumbleweed') {
            o.x += o.rollSpeed;
            o.sway += o.rollSpeed * 0.1;
            if (o.x > Layout.W + 20) o.x = -50;
          }
        }
        break;
      case 'prehistoric':
        for (const o of s.objects) {
          if (o.type === 'fern') {
            o.sway += dt * o.swaySpeed;
          }
        }
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.y += p.speedY;
          p.x += p.speedX;
          p.life -= dt;
          if (p.life <= 0) {
            s.particles.splice(i, 1);
            s.particles.push({
              x: 1100 + (Math.random() - 0.5) * 40,
              y: 300 - Math.random() * 20,
              size: Math.random() * 3 + 1,
              speedY: -(Math.random() * 1 + 0.5),
              speedX: (Math.random() - 0.5) * 0.5,
              life: Math.random() * 2 + 1,
              color: '#ff6f00',
            });
          }
        }
        break;
      case 'steampunk':
        for (const o of s.objects) {
          if (o.r) {
            // gear rotation
            o.angle = (o.angle || 0) + dt * o.speed;
          }
        }
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.y += p.speedY;
          p.x += p.speedX;
          p.life -= dt;
          if (p.life <= 0) {
            s.particles.splice(i, 1);
            s.particles.push({
              x: Math.random() * Layout.W, y: 700 + Math.random() * 100,
              size: Math.random() * 8 + 4,
              speedY: -(Math.random() * 0.5 + 0.2),
              speedX: (Math.random() - 0.5) * 0.3,
              life: Math.random() * 3 + 2,
              alpha: Math.random() * 0.3 + 0.1,
            });
          }
        }
        break;
      case 'crystal':
        for (const p of s.particles) {
          p.twinkle += dt * p.twinkleSpeed;
        }
        break;
    }
  }

  render(ctx, dt) {
    this.update(dt);
    const themeId = this._getBgThemeId();
    const theme = ThemeManager.getTheme(store.get('theme'));
    const s = this.state;

    // Draw base background color
    ctx.fillStyle = theme.colors.background;
    ctx.fillRect(0, 0, Layout.W, Layout.H);

    switch (themeId) {
      case 'space': this.renderSpace(ctx, theme, s); break;
      case 'medieval': this.renderMedieval(ctx, theme, s); break;
      case 'ocean': this.renderOcean(ctx, theme, s); break;
      case 'egypt': this.renderEgypt(ctx, theme, s); break;
      case 'cyberpunk': this.renderCyberpunk(ctx, theme, s); break;
      case 'japanese': this.renderJapanese(ctx, theme, s); break;
      case 'artdeco': this.renderArtDeco(ctx, theme, s); break;
      case 'wildwest': this.renderWildWest(ctx, theme, s); break;
      case 'prehistoric': this.renderPrehistoric(ctx, theme, s); break;
      case 'steampunk': this.renderSteampunk(ctx, theme, s); break;
      case 'crystal': this.renderCrystal(ctx, theme, s); break;
    }
  }

  renderCrystal(ctx, theme, s) {
    const img = this.bgImages['crystal'];
    if (img) {
      ctx.drawImage(img, 0, 0, Layout.W, Layout.H);
    }

    for (const p of s.particles) {
      const alpha = Math.sin(p.twinkle) * 0.35 + 0.45;
      ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
  }

  renderSpace(ctx, theme, s) {
    // Nebula gradient
    const grad = ctx.createRadialGradient(Layout.cx, Layout.cy, 50, Layout.cx, Layout.cy, 600);
    grad.addColorStop(0, '#2d1b4e88');
    grad.addColorStop(1, '#1a0f2e00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, Layout.W, Layout.H);

    // Stars
    for (const p of s.particles) {
      const alpha = Math.sin(p.twinkle) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    // Planets
    for (const o of s.objects) {
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fillStyle = o.color + '44';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = o.color + '88';
      ctx.fill();
      if (o.rings) {
        ctx.beginPath();
        ctx.ellipse(o.x, o.y, o.r * 1.8, o.r * 0.4, Math.PI * 0.15, 0, Math.PI * 2);
        ctx.strokeStyle = o.color + '55';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Shooting star (random)
    if (Math.random() < 0.005) {
      const sx = Math.random() * Layout.W;
      const sy = Math.random() * 400;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 60, sy + 20);
      ctx.stroke();
    }
  }

  renderMedieval(ctx, theme, s) {
    // Stone wall texture
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(0, 0, Layout.W, Layout.H);

    // Castle silhouette at bottom
    ctx.fillStyle = '#0a0a0a';
    // Towers
    for (let i = 0; i < 4; i++) {
      const tx = 200 + i * 320;
      ctx.fillRect(tx, 550, 80, 250);
      // Battlements
      for (let j = 0; j < 4; j++) {
        ctx.fillRect(tx + j * 20, 540, 12, 15);
      }
    }
    // Wall between towers
    ctx.fillRect(0, 600, Layout.W, 200);

    // Torches
    for (const p of s.particles) {
      const flicker = Math.sin(p.flicker) * 0.3 + 0.7;
      // Glow
      const glow = ctx.createRadialGradient(p.x, p.y, 5, p.x, p.y, 40);
      glow.addColorStop(0, `rgba(255,150,50,${0.4 * flicker})`);
      glow.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - 40, p.y - 40, 80, 80);
      // Flame
      ctx.fillStyle = `rgba(255,200,50,${flicker})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 5, 4, 12, Math.sin(p.flicker * 2) * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Banners
    ctx.fillStyle = '#e74c3c55';
    for (let i = 0; i < 3; i++) {
      const bx = 300 + i * 350;
      ctx.fillRect(bx, 300, 30, 120);
      // Banner wave
      ctx.beginPath();
      ctx.moveTo(bx, 420);
      for (let j = 0; j <= 30; j++) {
        const wy = 420 + Math.sin(j * 0.2 + this.time * 2) * 3;
        ctx.lineTo(bx + j, wy);
      }
      ctx.lineTo(bx + 30, 420);
      ctx.lineTo(bx, 420);
      ctx.fill();
    }
  }

  renderOcean(ctx, theme, s) {
    // Photo background
    const img = this.bgImages['ocean'];
    if (img) {
      ctx.drawImage(img, 0, 0, Layout.W, Layout.H);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, Layout.H);
      grad.addColorStop(0, '#0a2a3e');
      grad.addColorStop(1, '#0d1a2e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, Layout.W, Layout.H);
    }

    // Light rays from top
    for (let i = 0; i < 5; i++) {
      const rx = 200 + i * 220 + Math.sin(this.time * 0.5 + i) * 50;
      const rgrad = ctx.createLinearGradient(rx, 0, rx + 60, 400);
      rgrad.addColorStop(0, 'rgba(78,205,196,0.08)');
      rgrad.addColorStop(1, 'rgba(78,205,196,0)');
      ctx.fillStyle = rgrad;
      ctx.beginPath();
      ctx.moveTo(rx - 20, 0);
      ctx.lineTo(rx + 80, 0);
      ctx.lineTo(rx + 140, 500);
      ctx.lineTo(rx - 60, 500);
      ctx.closePath();
      ctx.fill();
    }

    // Animated bubbles rising
    for (const p of s.particles) {
      ctx.strokeStyle = `rgba(255,255,255,0.3)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x + Math.sin(p.wobble) * 2, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(p.x + Math.sin(p.wobble) * 2 - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Twinkling stars / sparkles in upper sky
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137 + 50) % Layout.W;
      const sy = (i * 89 + 20) % 350;
      const twinkle = Math.sin(this.time * 2 + i * 1.5) * 0.3 + 0.7;
      const size = (i % 3 === 0) ? 2 : 1;
      ctx.fillStyle = `rgba(255,255,230,${twinkle * 0.7})`;
      ctx.fillRect(sx, sy, size, size);
    }

    // Swaying coral
    for (const o of s.objects) {
      if (o.type === 'coral') {
        ctx.fillStyle = o.color + '66';
        const sway = Math.sin(o.sway) * 5;
        ctx.beginPath();
        ctx.moveTo(o.x, o.y);
        ctx.quadraticCurveTo(o.x + sway, o.y - o.size * 0.5, o.x + sway * 0.5, o.y - o.size);
        ctx.lineWidth = 4;
        ctx.strokeStyle = o.color + '88';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(o.x + sway * 0.5, o.y - o.size, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  renderEgypt(ctx, theme, s) {
    // Sky
    const grad = ctx.createLinearGradient(0, 0, 0, 500);
    grad.addColorStop(0, '#0a1a2e');
    grad.addColorStop(1, '#1a0f05');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, Layout.W, 500);

    // Sand
    ctx.fillStyle = '#1a0f05';
    ctx.fillRect(0, 500, Layout.W, 300);

    // Dunes
    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath();
    ctx.moveTo(0, 520);
    for (let x = 0; x <= Layout.W; x += 40) {
      ctx.lineTo(x, 520 + Math.sin(x * 0.005 + this.time * 0.2) * 15);
    }
    ctx.lineTo(Layout.W, Layout.H);
    ctx.lineTo(0, Layout.H);
    ctx.closePath();
    ctx.fill();

    // Pyramids
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.moveTo(200, 520);
    ctx.lineTo(350, 300);
    ctx.lineTo(500, 520);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath();
    ctx.moveTo(400, 520);
    ctx.lineTo(500, 350);
    ctx.lineTo(600, 520);
    ctx.closePath();
    ctx.fill();

    // Sun
    const sunY = 200 + Math.sin(this.time * 0.1) * 20;
    ctx.fillStyle = '#f4e04d55';
    ctx.beginPath();
    ctx.arc(1000, sunY, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4e04d88';
    ctx.beginPath();
    ctx.arc(1000, sunY, 40, 0, Math.PI * 2);
    ctx.fill();

    // Sand particles
    for (const p of s.particles) {
      ctx.fillStyle = `rgba(244,224,77,${0.2 + Math.random() * 0.1})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    // Palm trees (simplified)
    for (let i = 0; i < 3; i++) {
      const px = 100 + i * 550;
      // Trunk
      ctx.fillStyle = '#5a3d1a';
      ctx.fillRect(px, 450, 8, 70);
      // Leaves
      ctx.strokeStyle = '#4a7c2a';
      ctx.lineWidth = 2;
      for (let j = 0; j < 5; j++) {
        const angle = (j / 5) * Math.PI - Math.PI * 0.8;
        ctx.beginPath();
        ctx.moveTo(px + 4, 455);
        ctx.quadraticCurveTo(
          px + 4 + Math.cos(angle) * 30,
          455 + Math.sin(angle) * 10,
          px + 4 + Math.cos(angle) * 50,
          455 + Math.sin(angle) * 25
        );
        ctx.stroke();
      }
    }
  }

  renderCyberpunk(ctx, theme, s) {
    // Dark base
    ctx.fillStyle = '#050210';
    ctx.fillRect(0, 0, Layout.W, Layout.H);

    // Neon grid on ground
    ctx.strokeStyle = '#00fff522';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const y = 500 + i * 15;
      const perspective = 1 + i * 0.1;
      ctx.beginPath();
      ctx.moveTo(Layout.cx - 600 * perspective, y);
      ctx.lineTo(Layout.cx + 600 * perspective, y);
      ctx.stroke();
    }
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(Layout.cx + i * 60, 500);
      ctx.lineTo(Layout.cx + i * 400, Layout.H);
      ctx.stroke();
    }

    // Buildings
    for (const o of s.objects) {
      ctx.fillStyle = o.color + '22';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      // Windows
      ctx.fillStyle = o.color + '66';
      const glow = Math.sin(o.glow + this.time * 3) * 0.3 + 0.7;
      for (let wy = o.y + 10; wy < o.y + o.h - 10; wy += 20) {
        for (let wx = o.x + 5; wx < o.x + o.w - 5; wx += 15) {
          if (Math.random() < 0.7) {
            ctx.globalAlpha = glow * (0.5 + Math.random() * 0.5);
            ctx.fillRect(wx, wy, 8, 12);
            ctx.globalAlpha = 1;
          }
        }
      }
      // Neon edges
      ctx.strokeStyle = o.color + '88';
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x, o.y, o.w, o.h);
    }

    // Rain
    for (const p of s.particles) {
      ctx.strokeStyle = p.color + '66';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 1, p.y + p.length);
      ctx.stroke();
    }

    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let y = 0; y < Layout.H; y += 4) {
      ctx.fillRect(0, y, Layout.W, 2);
    }
  }

  renderJapanese(ctx, theme, s) {
    // Photo background
    const img = this.bgImages['japanese'];
    if (img) {
      ctx.drawImage(img, 0, 0, Layout.W, Layout.H);
    } else {
      ctx.fillStyle = '#1a0a0f';
      ctx.fillRect(0, 0, Layout.W, Layout.H);
    }

    // Soft dark vignette overlay so UI pops
    const vig = ctx.createRadialGradient(Layout.cx, Layout.cy, 300, Layout.cx, Layout.cy, 700);
    vig.addColorStop(0, 'rgba(26,10,15,0)');
    vig.addColorStop(1, 'rgba(26,10,15,0.6)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, Layout.W, Layout.H);

    // Floating lanterns (animated glow orbs)
    for (let i = 0; i < 5; i++) {
      const lx = 150 + i * 240 + Math.sin(this.time * 0.4 + i * 2) * 30;
      const ly = 120 + Math.cos(this.time * 0.3 + i * 1.5) * 40;
      const glow = ctx.createRadialGradient(lx, ly, 4, lx, ly, 30);
      glow.addColorStop(0, 'rgba(255,170,0,0.25)');
      glow.addColorStop(1, 'rgba(255,170,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(lx - 30, ly - 30, 60, 60);
      ctx.fillStyle = 'rgba(255,200,100,0.8)';
      ctx.beginPath();
      ctx.arc(lx, ly, 5 + Math.sin(this.time * 2 + i) * 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cherry blossoms (falling petals)
    for (const p of s.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = '#ffb7c5aa';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Water ripples at bottom (subtle)
    ctx.strokeStyle = 'rgba(78,205,196,0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const rx = 200 + i * 250;
      const ry = 720 + Math.sin(this.time * 2 + i) * 10;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 30 + Math.sin(this.time + i) * 5, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  renderArtDeco(ctx, theme, s) {
    ctx.fillStyle = '#120c06';
    ctx.fillRect(0, 0, Layout.W, Layout.H);

    // Golden geometric patterns
    ctx.strokeStyle = '#c4a96a44';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 100);
      ctx.lineTo(Layout.W, i * 100 + 200);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(Layout.W, i * 100);
      ctx.lineTo(0, i * 100 + 200);
      ctx.stroke();
    }

    // Sunbursts
    for (const o of s.objects) {
      ctx.strokeStyle = '#d4a01733';
      ctx.lineWidth = 1;
      for (let i = 0; i < o.rays; i++) {
        const angle = (i / o.rays) * Math.PI * 2 + this.time * 0.1;
        ctx.beginPath();
        ctx.moveTo(o.x, o.y);
        ctx.lineTo(o.x + Math.cos(angle) * o.r, o.y + Math.sin(angle) * o.r);
        ctx.stroke();
      }
      // Inner circle
      ctx.strokeStyle = '#d4a01755';
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Diamonds pattern
    ctx.fillStyle = '#c4a96a22';
    for (let i = 0; i < 20; i++) {
      const dx = (i * 137) % Layout.W;
      const dy = (i * 89) % Layout.H;
      ctx.beginPath();
      ctx.moveTo(dx, dy - 10);
      ctx.lineTo(dx + 10, dy);
      ctx.lineTo(dx, dy + 10);
      ctx.lineTo(dx - 10, dy);
      ctx.closePath();
      ctx.fill();
    }
  }

  renderWildWest(ctx, theme, s) {
    // Photo background
    const img = this.bgImages['wildwest'];
    if (img) {
      ctx.drawImage(img, 0, 0, Layout.W, Layout.H);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, 400);
      grad.addColorStop(0, '#1a1008');
      grad.addColorStop(1, '#2c1810');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, Layout.W, 400);
      ctx.fillStyle = '#1a1008';
      ctx.fillRect(0, 400, Layout.W, 400);
    }

    // Warm dust overlay / heat haze
    const dustGrad = ctx.createLinearGradient(0, 0, Layout.W, 0);
    dustGrad.addColorStop(0, 'rgba(232,201,155,0)');
    dustGrad.addColorStop(0.5, `rgba(232,201,155,${0.08 + Math.sin(this.time * 0.5) * 0.04})`);
    dustGrad.addColorStop(1, 'rgba(232,201,155,0)');
    ctx.fillStyle = dustGrad;
    ctx.fillRect(0, 0, Layout.W, Layout.H);

    // Blowing sand particles
    for (let i = 0; i < 25; i++) {
      const sx = ((i * 53 + this.time * 60) % 1380) - 50;
      const sy = 300 + (i * 17) % 500;
      ctx.fillStyle = `rgba(232,201,155,${0.15 + Math.sin(this.time + i) * 0.1})`;
      ctx.fillRect(sx, sy, Math.random() * 3 + 1, 1);
    }

    // Tumbleweeds rolling across
    for (const o of s.objects) {
      if (o.type === 'tumbleweed') {
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.rotate(o.sway);
        ctx.strokeStyle = '#a67c52cc';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * o.size, Math.sin(angle) * o.size);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Cacti drawn on top (only if no photo, otherwise photo already has them)
    if (!img) {
      for (const o of s.objects) {
        if (o.type === 'cactus') {
          const sway = Math.sin(o.sway) * 3;
          ctx.fillStyle = '#2e4a2e';
          ctx.fillRect(o.x + sway, o.y - o.size, o.size * 0.4, o.size);
          ctx.fillRect(o.x + sway - o.size * 0.3, o.y - o.size * 0.6, o.size * 0.3, o.size * 0.15);
          ctx.fillRect(o.x + sway - o.size * 0.3, o.y - o.size * 0.6, o.size * 0.15, o.size * 0.3);
          ctx.fillRect(o.x + sway + o.size * 0.4, o.y - o.size * 0.4, o.size * 0.3, o.size * 0.15);
          ctx.fillRect(o.x + sway + o.size * 0.55, o.y - o.size * 0.4, o.size * 0.15, o.size * 0.3);
        }
      }
    }
  }

  renderPrehistoric(ctx, theme, s) {
    // Dark jungle base
    ctx.fillStyle = '#0a1a0a';
    ctx.fillRect(0, 0, Layout.W, Layout.H);

    // Distant trees
    ctx.fillStyle = '#1a2a1a';
    for (let i = 0; i < 15; i++) {
      const tx = i * 100 + Math.sin(i) * 30;
      ctx.fillRect(tx, 300, 15, 500);
      // Canopy
      ctx.beginPath();
      ctx.arc(tx + 7, 300, 40, 0, Math.PI * 2);
      ctx.fill();
    }

    // Volcano
    for (const o of s.objects) {
      if (o.type === 'volcano') {
        ctx.fillStyle = '#1a0a05';
        ctx.beginPath();
        ctx.moveTo(o.x - o.size, o.y + o.size);
        ctx.lineTo(o.x, o.y - o.size);
        ctx.lineTo(o.x + o.size, o.y + o.size);
        ctx.closePath();
        ctx.fill();
        // Lava glow at top
        const vgrad = ctx.createRadialGradient(o.x, o.y - o.size * 0.5, 5, o.x, o.y - o.size * 0.5, 30);
        vgrad.addColorStop(0, '#ff6f0088');
        vgrad.addColorStop(1, '#ff6f0000');
        ctx.fillStyle = vgrad;
        ctx.fillRect(o.x - 30, o.y - o.size * 0.5 - 30, 60, 60);
      }
    }

    // Ferns
    for (const o of s.objects) {
      if (o.type === 'fern') {
        const sway = Math.sin(o.sway) * 5;
        ctx.strokeStyle = o.color;
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const angle = -Math.PI * 0.4 + (i / 4) * Math.PI * 0.8;
          ctx.beginPath();
          ctx.moveTo(o.x, o.y);
          ctx.quadraticCurveTo(
            o.x + Math.cos(angle) * o.size * 0.5 + sway,
            o.y + Math.sin(angle) * o.size * 0.3,
            o.x + Math.cos(angle) * o.size + sway,
            o.y + Math.sin(angle) * o.size * 0.8
          );
          ctx.stroke();
        }
      }
    }

    // Ash/embers from volcano
    for (const p of s.particles) {
      ctx.fillStyle = p.color + '88';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fireflies
    for (let i = 0; i < 10; i++) {
      const fx = (Math.sin(this.time * 0.5 + i * 2) * 0.5 + 0.5) * Layout.W;
      const fy = (Math.cos(this.time * 0.3 + i * 3) * 0.5 + 0.5) * 600;
      ctx.fillStyle = `rgba(200,255,100,${0.3 + Math.sin(this.time * 2 + i) * 0.2})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderSteampunk(ctx, theme, s) {
    // Dark brass base
    ctx.fillStyle = '#0f0a05';
    ctx.fillRect(0, 0, Layout.W, Layout.H);

    // Pipe grid background
    ctx.strokeStyle = '#4a352033';
    ctx.lineWidth = 3;
    for (let x = 0; x < Layout.W; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, Layout.H);
      ctx.stroke();
    }
    for (let y = 0; y < Layout.H; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(Layout.W, y);
      ctx.stroke();
    }
    // Pipe joints
    ctx.fillStyle = '#4a352044';
    for (let x = 0; x < Layout.W; x += 80) {
      for (let y = 0; y < Layout.H; y += 80) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Gears
    for (const o of s.objects) {
      if (o.r) {
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.rotate(o.angle || 0);
        ctx.strokeStyle = o.color;
        ctx.lineWidth = 2;
        // Outer circle
        ctx.beginPath();
        ctx.arc(0, 0, o.r, 0, Math.PI * 2);
        ctx.stroke();
        // Teeth
        for (let i = 0; i < o.teeth; i++) {
          const angle = (i / o.teeth) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * o.r, Math.sin(angle) * o.r);
          ctx.lineTo(Math.cos(angle) * (o.r + 8), Math.sin(angle) * (o.r + 8));
          ctx.stroke();
        }
        // Inner circle
        ctx.beginPath();
        ctx.arc(0, 0, o.r * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        // Spokes
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * o.r * 0.9, Math.sin(angle) * o.r * 0.9);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Steam particles
    for (const p of s.particles) {
      ctx.fillStyle = `rgba(200,180,160,${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Airship silhouette
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.ellipse(200, 200, 80, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    // Balloon
    ctx.beginPath();
    ctx.ellipse(200, 170, 60, 50, 0, Math.PI, 0);
    ctx.fill();
    // Ropes
    ctx.strokeStyle = '#4a352055';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(140, 170);
    ctx.lineTo(140, 200);
    ctx.moveTo(260, 170);
    ctx.lineTo(260, 200);
    ctx.stroke();
  }
}

const backgroundRenderer = new BackgroundRenderer();
