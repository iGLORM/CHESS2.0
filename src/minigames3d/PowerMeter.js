// Carnival high-striker. The power gauge pumps up and down; slam the giant
// mallet at the peak to send the puck up the tower and ring the bell.
class PowerMeter extends Game3D {
  constructor() {
    super('High Striker');
  }

  static HEIGHT = 7;

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x0e0820);
    scene.fog = new THREE.Fog(0x0e0820, 14, 34);
    this.lights({ hemi: 0.8, keyI: 1.8, rim: 0xff2fb4 });
    const stars = Mini3D.starfield(250, 60);
    stars.material.fog = false;
    scene.add(stars);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: (() => { const t = Mini3D.checkerTexture(2, '#3a2a5a', '#1a1030', 8); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 12); return t; })() }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Tower with light bulbs up the side
    const H = PowerMeter.HEIGHT;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.7, H, 0.3), new THREE.MeshStandardMaterial({ color: 0xe8e0ff, flatShading: true }));
    tower.position.set(0, H / 2, -0.4);
    scene.add(tower);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, H, 0.34), new THREE.MeshStandardMaterial({ color: 0xff4d6d }));
    stripe.position.set(0, H / 2, -0.4);
    scene.add(stripe);
    this.bulbs = [];
    for (let i = 0; i < 14; i++) {
      for (const s of [-1, 1]) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), new THREE.MeshBasicMaterial({ color: 0x553322, toneMapped: false }));
        b.position.set(s * 0.45, 0.4 + (i / 13) * (H - 0.8), -0.25);
        scene.add(b);
        this.bulbs.push({ b, h: (i / 13) });
      }
    }
    this.bell = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.7, 0.7, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide }));
    this.bell.position.set(0, H + 0.35, -0.4);
    scene.add(this.bell);
    this.bellGlow = Mini3D.glowSprite(0xffd166, 3);
    this.bellGlow.position.copy(this.bell.position);
    this.bellGlow.material.opacity = 0;
    scene.add(this.bellGlow);
    this.puck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 10), new THREE.MeshStandardMaterial({ color: 0x4cc9f0, emissive: 0x2080a0, flatShading: true }));
    this.puck.position.set(0, 0.3, -0.05);
    scene.add(this.puck);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 1.4), new THREE.MeshStandardMaterial({ color: 0x6a3a2a, flatShading: true }));
    base.position.set(0, 0.15, 0.3);
    scene.add(base);
    this.lever = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0xff4d6d }));
    this.lever.position.set(0.9, 0.36, 0.6);
    scene.add(this.lever);

    // Your piece wielding the mallet
    this.player = this.playerPiece();
    this.player.scale.setScalar(1.5);
    this.player.position.set(2.6, 0, 0.8);
    this.player.rotation.y = -Math.PI / 2;
    scene.add(this.player);
    this.mallet = new THREE.Group();
    this.mallet.position.set(2.5, 1.2, 0.6);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6), new THREE.MeshStandardMaterial({ color: 0x8a5a2a }));
    handle.rotation.z = Math.PI / 2;
    handle.position.x = -0.9;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 10), new THREE.MeshStandardMaterial({ color: 0xc02030, flatShading: true }));
    head.position.x = -1.8;
    this.mallet.add(handle, head);
    scene.add(this.mallet);

    // Crowd of enemy pieces watching
    for (let i = 0; i < 5; i++) {
      const p = Pieces3D.create(['pawn', 'pawn', 'knight', 'bishop', this.enemy.type][i], this.enemyColor);
      p.position.set(-4 + i * 0.9, 0, 2.5 + (i % 2) * 0.6);
      p.rotation.y = Math.PI * 0.8;
      scene.add(p);
    }

    this.camera.fov = 48;
    this.camera.position.set(3.5, 3.6, 9);
    this.camera.lookAt(0, 3.4, 0);

    this.swings = this.isDuel ? 5 : 3;
    this.need = Math.ceil(this.swings * 0.6);
    this.used = 0;
    this.rings = 0;
    this.timeLimit = this.swings * 4.5 + 3;
    this.gaugeT = Math.random() * 3;
    this.gaugeSpeed = 1.9 + this.hard * 1.6;
    this.threshold = 0.84 + this.hard * 0.06;
    this.swing = 0;
    this.puckV = 0;
    this.puckY = 0.3;
    this.flying = false;
    this.camFollow = 3.4;
  }

  get power() {
    // Sharp peak so the top is a small window.
    return Math.pow(0.5 - 0.5 * Math.cos(this.gaugeT * Math.PI), 1.4);
  }

  _hit() {
    if (this.done || this.flying || this.swing > 0 || this.used >= this.swings) return;
    this.used++;
    this.shotPower = this.power;
    this.swing = 0.25;
  }

  _launch() {
    const p = this.shotPower;
    const target = p / this.threshold * PowerMeter.HEIGHT;
    this.puckV = Math.sqrt(2 * 20 * Math.max(0.2, target));
    this.flying = true;
    this.lever.position.y = 0.28;
    this.burst.spawn(new THREE.Vector3(0.9, 0.5, 0.6), [0xffd166, 0xffffff], 14, 4, { up: 3 });
    this.hitFx(0.4 + p * 0.5, 0xffffff);
    Sfx3D.thud();
  }

  onKey(k) {
    if (k === ' ' || k === 'Enter') this._hit();
  }

  onPress() {
    this._hit();
  }

  bot() {
    const aim = this.threshold + (10 - this.botSkill) * 0.012;
    if (this.power >= Math.min(0.97, aim) && Math.random() < 0.6) this._hit();
  }

  tick(dt) {
    if (!this.flying) this.gaugeT += dt * this.gaugeSpeed;
    if (this.swing > 0) {
      this.swing -= dt;
      if (this.swing <= 0) this._launch();
    }
    const H = PowerMeter.HEIGHT;
    if (this.flying) {
      this.puckV -= 20 * dt;
      this.puckY += this.puckV * dt;
      if (this.puckY >= H - 0.1 && this.puckV > 0) {
        this.puckY = H - 0.1;
        this.puckV = -2;
        this.rings++;
        this.bellRing = 1;
        this.burst.spawn(this.bell.position, [0xffd166, 0xffffff, 0xff4d6d], 50, 8, { size: 0.16 });
        this.hitFx(0.8, 0xffd166);
        Sfx3D.ding(96);
        Sfx3D.ding(88);
        this.say('DING DING!', '#ffd166');
      }
      if (this.puckY <= 0.3 && this.puckV < 0) {
        this.puckY = 0.3;
        this.flying = false;
        this.lever.position.y = 0.36;
        if (!this.bellRing) this.say(this.shotPower > this.threshold * 0.8 ? 'SO CLOSE!' : 'WEAK!', '#ff6a3d');
        this.bellRing = 0;
        this.gaugeT = Math.random() * 2;
        this.gaugeSpeed *= 1.12;
        const left = this.swings - this.used;
        if (this.rings >= this.need) { this.say('STRONGEST PIECE!', '#3ee07f'); this.win(); }
        else if (this.rings + left < this.need) { this.say('NOT ENOUGH', '#ff4d6d'); this.lose(); }
      }
    }
    this._animate(dt);
  }

  _animate(dt) {
    this.puck.position.y = this.puckY;
    const k = this.swing > 0 ? 1 - this.swing / 0.25 : 0;
    this.mallet.rotation.z = this.swing > 0 ? -1.2 + k * 1.9 : -1.2 + Math.sin(this.time * 3) * 0.05;
    if (this.swing <= 0 && this.flying) this.mallet.rotation.z = 0.7;
    const lit = this.flying ? this.puckY / PowerMeter.HEIGHT : this.power;
    for (const b of this.bulbs) b.b.material.color.set(b.h <= lit ? (b.h > this.threshold * 0.98 ? 0xffd166 : 0xff4d6d) : 0x331a22);
    this.bellGlow.material.opacity = Math.max(0, this.bellGlow.material.opacity - dt * 2) + (this.bellRing ? 0.1 : 0);
    if (this.bellRing) this.bellGlow.material.opacity = 1;
    this.bell.rotation.z = this.bellRing ? Math.sin(this.time * 40) * 0.2 : this.bell.rotation.z * 0.9;
    this.camFollow += ((this.flying ? Math.max(3.4, this.puckY) : 3.4) - this.camFollow) * Math.min(1, dt * 4);
    this.camera.position.set(3.5, this.camFollow + 0.2, 9);
    this.camera.lookAt(0, this.camFollow, 0);
  }

  afterTick(dt) {
    if (this.flying) {
      this.puckV -= 20 * dt;
      this.puckY = Math.max(0.3, this.puckY + this.puckV * dt);
    }
    this._animate(dt);
  }

  hud(ctx, x, y, w, h) {
    this.hudText(ctx, 'RING THE BELL', x + 16, y + 20, { size: 14, title: true, color: '#ffd166' });
    for (let i = 0; i < this.swings; i++) {
      ctx.fillStyle = i < this.used ? (i < this.rings ? '#ffd166' : '#ff4d6d') : 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(x + 24 + i * 22, y + 46, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    this.hudText(ctx, `BELLS ${this.rings}/${this.need}`, x + w - 100, y + 20, { size: 18, align: 'right', color: '#ffd166' });
    this.hudTimer(ctx, x + w - 16, y + 20);
    // Vertical power gauge
    const gx = x + w - 40, gy = y + 60, gh = h - 120;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    MiniGameUtils.roundRect(ctx, gx, gy, 18, gh, 9);
    ctx.fill();
    const p = this.flying ? this.shotPower : this.power;
    const grad = ctx.createLinearGradient(0, gy + gh, 0, gy);
    grad.addColorStop(0, '#3ee07f');
    grad.addColorStop(0.7, '#ffd166');
    grad.addColorStop(1, '#ff4d6d');
    ctx.fillStyle = grad;
    MiniGameUtils.roundRect(ctx, gx + 3, gy + gh - (gh - 6) * p - 3, 12, (gh - 6) * p, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(gx - 6, gy + gh - gh * this.threshold, 30, 2);
    this.hudHint(ctx, 'Click or press SPACE when the gauge is at the top');
  }
}
