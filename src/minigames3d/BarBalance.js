// Tightrope across a bottomless canyon. Your piece walks the rope on its
// own; wind gusts and wobbles tip it over, so lean the other way to stay up.
class BarBalance extends Game3D {
  constructor() {
    super('Tightrope');
  }

  static LENGTH = 22;
  static FALL = 0.95;

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x5a7ab0);
    scene.fog = new THREE.Fog(0x7a8ab0, 10, 45);
    this.lights({ sky: 0xd0e0ff, ground: 0x4a3a5a, keyI: 2.4 });

    // Canyon walls
    const rock = new THREE.MeshStandardMaterial({ color: 0x8a5a4a, flatShading: true });
    for (let i = 0; i < 18; i++) {
      for (const s of [-1, 1]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(3 + Math.random() * 3, 20 + Math.random() * 10, 4), rock);
        m.position.set(s * (6 + Math.random() * 2), -8, 4 - i * 3.2);
        m.rotation.y = Math.random() * 0.4;
        scene.add(m);
      }
    }
    // Start and end towers
    const L = BarBalance.LENGTH;
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xd8cff5, flatShading: true });
    for (const z of [2, -L - 1]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 16, 8), towerMat);
      t.position.set(0, -8, z);
      scene.add(t);
    }
    const flag = Mini3D.glowSprite(0x3ee07f, 3);
    flag.position.set(0, 1.2, -L - 1);
    scene.add(flag);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, L + 3, 4), new THREE.MeshStandardMaterial({ color: 0xffe0a0 }));
    rope.rotation.x = Math.PI / 2;
    rope.position.set(0, 0, -L / 2 + 0.5);
    scene.add(rope);
    // Clouds far below
    for (let i = 0; i < 20; i++) {
      const c = Mini3D.glowSprite(0xffffff, 6 + Math.random() * 6);
      c.material.opacity = 0.35;
      c.position.set((Math.random() - 0.5) * 10, -10 - Math.random() * 6, 4 - Math.random() * 30);
      scene.add(c);
    }

    this.walker = new THREE.Group();
    this.player = this.playerPiece();
    this.player.rotation.y = Math.PI;
    this.walker.add(this.player);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3, 4), new THREE.MeshStandardMaterial({ color: 0x8a5a2a }));
    pole.rotation.z = Math.PI / 2;
    pole.position.y = 0.6;
    this.walker.add(pole);
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshStandardMaterial({ color: 0xff4d6d }));
      w.position.set(s * 1.5, 0.6, 0);
      this.walker.add(w);
    }
    scene.add(this.walker);

    // Wind streaks
    this.streaks = [];
    const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.03), streakMat);
      scene.add(s);
      this.streaks.push(s);
    }

    this.camera.fov = 55;
    this.theta = 0;
    this.omega = 0;
    this.z = 0;
    this.duration = 11 + this.hard * 3 + (this.isDuel ? 3 : 0);
    this.wind = 0;
    this.windTarget = 0;
    this.windT = 1;
    this.lives = this.hard < 0.5 ? 2 : 1;
    this.maxLives = this.lives;
    this.falling = 0;
  }

  bot(dt) {
    const skill = this.botSkill / 10;
    const noise = (Math.random() - 0.5) * (1 - skill) * 1.2;
    this.botLean = Math.max(-1, Math.min(1, -(this.theta * (3 + skill * 3) + this.omega * (0.8 + skill)) + noise));
  }

  _lean() {
    if (this.botControlled) return this.botLean || 0;
    let l = 0;
    if (this.held('ArrowLeft', 'a')) l -= 1;
    if (this.held('ArrowRight', 'd')) l += 1;
    if (!l && this.pointer.inside) l = Math.max(-1, Math.min(1, (this.pointer.x - 0.5) * 3));
    return l;
  }

  tick(dt) {
    if (this.falling > 0) {
      this.falling -= dt;
      this.walker.position.y -= dt * (8 - this.falling * 4);
      this.walker.rotation.z += Math.sign(this.theta) * dt * 3;
      if (this.falling <= 0) {
        if (this.lives > 0) { this.theta = 0; this.omega = 0; this.walker.position.y = 0; this.walker.rotation.z = 0; }
        else { this.say('WHOOOAAA...', '#ff4d6d'); this.lose(); }
      }
      this._scene(dt);
      return;
    }
    // Gusts change direction and strength.
    this.windT -= dt;
    if (this.windT <= 0) {
      this.windTarget = (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6) * (0.8 + this.hard * 1.2);
      this.windT = 1.2 + Math.random() * (1.8 - this.hard);
      if (Math.abs(this.windTarget) > 1) this.say(this.windTarget > 0 ? 'GUST →' : '← GUST', '#ffffff');
    }
    this.wind += (this.windTarget - this.wind) * Math.min(1, dt * 2);

    // Inverted pendulum: gravity tips it further, lean pushes back.
    const lean = this._lean();
    const alpha = 3.2 * Math.sin(this.theta) + this.wind * 1.1 + lean * 3.4 + (Math.random() - 0.5) * this.hard * 1.5;
    this.omega += alpha * dt;
    this.omega *= Math.pow(0.5, dt);
    this.theta += this.omega * dt;
    if (Math.abs(this.theta) > BarBalance.FALL) {
      this.lives--;
      this.falling = 1.2;
      this.hitFx(0.8, 0xff4d6d);
      Sfx3D.whoosh();
      if (this.lives > 0) this.say('SLIPPED!', '#ffb347');
    }
    this.z = -(this.time / this.duration) * BarBalance.LENGTH;
    this.tint = Math.max(0, (Math.abs(this.theta) - 0.55) * 1.2);
    this._scene(dt);
    if (this.time >= this.duration) { this.say('MADE IT ACROSS!', '#3ee07f'); this.win(); }
  }

  _scene(dt) {
    this.walker.position.z = this.z;
    if (this.falling <= 0) this.walker.rotation.z = -this.theta;
    this.player.position.y = Math.abs(Math.sin(this.time * 7)) * 0.05;
    this.camera.position.set(Math.sin(this.time * 0.4) * 0.6, 2.2, this.z + 4.5);
    this.camera.lookAt(0, 0.4, this.z - 3);
    this.streaks.forEach((s, i) => {
      s.position.x = ((i * 1.7 + this.time * this.wind * 12) % 12 + 12) % 12 - 6;
      s.position.y = -1 + (i % 6) * 0.7;
      s.position.z = this.z - 2 - (i % 5) * 2;
      s.visible = Math.abs(this.wind) > 0.3;
    });
  }

  afterTick(dt) {
    if (this.winner === 'attacker') {
      this.z -= dt * 3;
      this.walker.rotation.z *= 0.9;
    } else {
      this.walker.position.y -= dt * 6;
    }
    this._scene(dt);
  }

  hud(ctx, x, y, w, h) {
    this.hudText(ctx, 'KEEP YOUR BALANCE', x + 16, y + 20, { size: 14, title: true, color: '#ffffff' });
    this.hudBar(ctx, x + 16, y + 38, 200, 12, this.time / this.duration, '#3ee07f');
    this.hudHearts(ctx, x + w - 16 - this.maxLives * 22, y + 21, this.lives, this.maxLives);
    // Balance meter
    const mx = x + w / 2, my = y + h - 50, mw = 260;
    ctx.fillStyle = '#07080d';
    MiniGameUtils.pixelRect(ctx, mx - mw / 2 - 2, my - 10, mw + 4, 20, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(mx - mw / 2, my - 8, mw, 16);
    ctx.fillStyle = 'rgba(62,224,127,0.35)';
    ctx.fillRect(mx - mw * 0.25, my - 8, mw * 0.5, 16);
    const k = Math.max(-1, Math.min(1, this.theta / BarBalance.FALL));
    const kx = Math.round(mx + k * mw / 2);
    ctx.fillStyle = '#07080d';
    MiniGameUtils.pixelRect(ctx, kx - 11, my - 11, 22, 22, 4);
    ctx.fill();
    ctx.fillStyle = Math.abs(k) > 0.6 ? '#ff4d6d' : '#ffd166';
    MiniGameUtils.pixelRect(ctx, kx - 8, my - 8, 16, 16, 3);
    ctx.fill();
    this.hudHint(ctx, 'Lean with the mouse or ← → to stay upright');
  }
}
