const PixiParticleFX = {
  container: null,
  particles: [],
  shockwaves: [],
  fireworks: [],

  init(parentStage) {
    this.container = new PIXI.Container();
    parentStage.addChild(this.container);
  },

  spawnCapture(x, y, color) {
    this.spawnCaptureExplosion(x, y, color, 'pawn');
  },

  spawnCaptureExplosion(x, y, color, pieceType) {
    const isMajor = pieceType === 'rook' || pieceType === 'queen';
    const count = isMajor ? 120 : 50;
    const spread = isMajor ? 450 : 300;
    const gravity = isMajor ? 200 : 150;

    // Main particle burst
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      p.circle(0, 0, 2 + Math.random() * 3).fill(color);
      p.x = x;
      p.y = y;

      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * spread;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.gravity = gravity;
      p.life = isMajor ? (0.6 + Math.random() * 0.8) : (0.4 + Math.random() * 0.5);
      p.maxLife = p.life;
      p.drag = 0.96;

      this.container.addChild(p);
      this.particles.push(p);
    }

    // Shockwave ring for major pieces
    if (isMajor) {
      this._spawnShockwave(x, y, color);
    }
  },

  _spawnShockwave(x, y, color) {
    const ring = new PIXI.Graphics();
    const fillColor = typeof color === 'string' ? parseInt(color.replace('#', '0x'), 16) : color;
    ring.lineStyle(3, fillColor, 0.8);
    ring.drawCircle(0, 0, 10);
    ring.x = x;
    ring.y = y;
    this.container.addChild(ring);

    const sw = {
      sprite: ring,
      life: 0,
      maxLife: 0.5,
      startRadius: 10,
      endRadius: 120,
    };
    this.shockwaves.push(sw);

    // Secondary ring
    const ring2 = new PIXI.Graphics();
    ring2.lineStyle(1, 0xffffff, 0.5);
    ring2.drawCircle(0, 0, 10);
    ring2.x = x;
    ring2.y = y;
    this.container.addChild(ring2);
    this.shockwaves.push({
      sprite: ring2,
      life: 0,
      maxLife: 0.7,
      startRadius: 10,
      endRadius: 180,
    });
  },

  spawnMove(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const p = new PIXI.Graphics();
      p.circle(0, 0, 1.5 + Math.random() * 2).fill(color);
      p.x = x;
      p.y = y;
      p.vx = (Math.random() - 0.5) * 150;
      p.vy = (Math.random() - 0.5) * 150;
      p.gravity = 0;
      p.life = 0.3 + Math.random() * 0.3;
      p.maxLife = p.life;
      p.drag = 0.95;
      this.container.addChild(p);
      this.particles.push(p);
    }
  },

  spawnFireworks(x, y, colors) {
    if (!colors) colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff];
    const bursts = 3 + Math.floor(Math.random() * 3);

    for (let b = 0; b < bursts; b++) {
      setTimeout(() => {
        const fx = x + (Math.random() - 0.5) * 200;
        const fy = y + (Math.random() - 0.5) * 150 - 50;
        const color = colors[Math.floor(Math.random() * colors.length)];
        this._spawnFireworkBurst(fx, fy, color);
      }, b * 400);
    }
  },

  _spawnFireworkBurst(x, y, color) {
    const count = 40 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const size = 1.5 + Math.random() * 2.5;
      const variant = Math.random() > 0.8 ? 0xffffff : color;
      p.beginFill(variant, 0.95);
      p.drawRect(-size / 2, -size / 2, size, size);
      p.endFill();
      p.x = x;
      p.y = y;

      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 200;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.gravity = 150;
      p.life = 0.8 + Math.random() * 0.6;
      p.maxLife = p.life;
      p.drag = 0.97;
      p.isFirework = true;

      this.container.addChild(p);
      this.particles.push(p);
    }

    // Flash
    const flash = new PIXI.Graphics();
    flash.beginFill(color, 0.3);
    flash.drawCircle(0, 0, 40);
    flash.endFill();
    flash.x = x;
    flash.y = y;
    this.container.addChild(flash);

    gsap.to(flash.scale, { x: 3, y: 3, duration: 0.4, ease: 'power2.out' });
    gsap.to(flash, { alpha: 0, duration: 0.5, ease: 'power2.out', onComplete: () => {
      if (flash.parent) flash.parent.removeChild(flash);
      flash.destroy();
    }});
  },

  spawnTrail(x, y, color) {
    const p = new PIXI.Graphics();
    const size = 2 + Math.random() * 2;
    const fillColor = typeof color === 'string' ? parseInt(color.replace('#', '0x'), 16) : color;
    p.beginFill(fillColor, 0.4);
    p.drawRect(-size / 2, -size / 2, size, size);
    p.endFill();
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.gravity = 0;
    p.life = 0.2 + Math.random() * 0.15;
    p.maxLife = p.life;
    p.drag = 1;
    this.container.addChild(p);
    this.particles.push(p);
  },

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += (p.gravity || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.container.removeChild(p);
        p.destroy();
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += dt;
      const progress = sw.life / sw.maxLife;
      const radius = sw.startRadius + (sw.endRadius - sw.startRadius) * progress;
      const alpha = Math.max(0, 1 - progress);

      sw.sprite.clear();
      const fillColor = sw.sprite.line.color;
      sw.sprite.lineStyle(3 * (1 - progress), fillColor, alpha * 0.8);
      sw.sprite.drawCircle(0, 0, radius);

      if (sw.life >= sw.maxLife) {
        this.container.removeChild(sw.sprite);
        sw.sprite.destroy();
        this.shockwaves.splice(i, 1);
      }
    }
  },

  clear() {
    for (const p of this.particles) {
      this.container.removeChild(p);
      p.destroy();
    }
    this.particles = [];
    for (const sw of this.shockwaves) {
      this.container.removeChild(sw.sprite);
      sw.sprite.destroy();
    }
    this.shockwaves = [];
  },

  destroy() {
    this.clear();
    if (this.container) {
      this.container.destroy({ children: true });
      this.container = null;
    }
  },
};
