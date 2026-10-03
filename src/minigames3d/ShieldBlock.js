// Archers on four towers take turns firing at you. Swing your shield to face
// each arrow before it lands.
class ShieldBlock extends Game3D {
  constructor() {
    super('Shield Wall');
  }

  // Direction index: 0 north (far), 1 east, 2 south (near), 3 west.
  static DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  static KEYS = [['ArrowUp', 'w'], ['ArrowRight', 'd'], ['ArrowDown', 's'], ['ArrowLeft', 'a']];

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x14102a);
    scene.fog = new THREE.Fog(0x14102a, 14, 32);
    this.lights({ keyI: 2.4, shadows: true, shadowSize: 8, rim: 0xff6a3d });

    const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.6, 12), new THREE.MeshStandardMaterial({ map: Mini3D.checkerTexture(6, '#d8cff5', '#5a4a8a', 6), flatShading: true }));
    plat.position.y = -0.3;
    plat.receiveShadow = true;
    scene.add(plat);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x1e1838 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.6;
    scene.add(ground);

    this.towers = ShieldBlock.DIRS.map(([dx, dz], i) => {
      const d = 5.5;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 3, 8), new THREE.MeshStandardMaterial({ color: 0x5a4a6a, flatShading: true }));
      tower.position.set(dx * d, 0.9, dz * d);
      scene.add(tower);
      const archer = Pieces3D.create(i % 2 ? 'bishop' : this.enemy.type, this.enemyColor, 0xb01438);
      archer.position.set(dx * d, 2.4, dz * d);
      archer.lookAt(0, 2.4, 0);
      scene.add(archer);
      const charge = Mini3D.glowSprite(0xff4d6d, 2);
      charge.position.set(dx * d, 3.3, dz * d);
      charge.material.opacity = 0;
      scene.add(charge);
      return { archer, charge, x: dx * d, z: dz * d };
    });

    this.player = this.playerPiece();
    this.player.scale.setScalar(1.2);
    scene.add(this.player);
    this.shieldPivot = new THREE.Group();
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.5, 12, 1, true, -0.7, 1.4), new THREE.MeshStandardMaterial({ color: 0x4cc9f0, emissive: 0x2080c0, emissiveIntensity: 0.6, metalness: 0.6, side: THREE.DoubleSide, flatShading: true }));
    shield.position.y = 0.8;
    this.shieldMesh = shield;
    // Glowing arc on the floor so the facing reads from above.
    const arc = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.9, 12, 1, -Math.PI / 2 - 0.75, 1.5), new THREE.MeshBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.55, toneMapped: false, side: THREE.DoubleSide }));
    arc.rotation.x = -Math.PI / 2;
    arc.position.y = 0.03;
    this.shieldArc = arc;
    this.shieldPivot.add(shield, arc);
    scene.add(this.shieldPivot);

    this.camera.fov = 50;
    this.camera.position.set(0, 11, 9.5);
    this.camera.lookAt(0, 0.5, 0.3);

    this.facing = 2;
    this.shieldAngle = this._angleFor(2);
    this.arrows = [];
    this.total = Math.round(9 + this.hard * 6 + (this.isDuel ? 3 : 0));
    this.fired = 0;
    this.blocked = 0;
    this.maxHp = this.hard > 0.6 ? 2 : 3;
    this.hp = this.maxHp;
    this.fireT = 0.6;
    this.flight = 1.2 - this.hard * 0.5;
  }

  _angleFor(i) {
    const [dx, dz] = ShieldBlock.DIRS[i];
    return Math.atan2(dx, dz);
  }

  _face(i) {
    if (i === this.facing) return;
    this.facing = i;
    Sfx3D.whoosh();
  }

  _fire() {
    const i = (Math.random() * 4) | 0;
    const t = this.towers[i];
    t.charge.material.opacity = 1;
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0xd0a060 }));
    shaft.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 4), new THREE.MeshBasicMaterial({ color: 0xff4d6d, toneMapped: false }));
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.7;
    arrow.add(shaft, tip);
    const trail = Mini3D.glowSprite(0xff6a3d, 0.8);
    arrow.add(trail);
    arrow.position.set(t.x, 2.8, t.z);
    arrow.lookAt(0, 0.8, 0);
    this.scene.add(arrow);
    this.arrows.push({ m: arrow, dir: i, t: 0, flight: this.flight * (0.9 + Math.random() * 0.25), from: arrow.position.clone(), state: 'fly' });
    this.fired++;
    Sfx3D.zap(58);
  }

  onKey(k) {
    ShieldBlock.KEYS.forEach((keys, i) => { if (keys.includes(k)) this._face(i); });
  }

  onPress() {
    this._aimAtPointer();
  }

  onMove() {
    if (this.pointer.down) this._aimAtPointer();
  }

  _aimAtPointer() {
    const g = this.groundPoint(0);
    if (!g) return;
    const a = Math.atan2(g.x, g.z);
    // Nearest of the four directions.
    let best = 0, bestD = Infinity;
    for (let i = 0; i < 4; i++) {
      let d = Math.abs(a - this._angleFor(i));
      d = Math.min(d, Math.PI * 2 - d);
      if (d < bestD) { best = i; bestD = d; }
    }
    this._face(best);
  }

  bot() {
    const react = 0.25 + (10 - this.botSkill) * 0.06;
    const incoming = this.arrows.filter(a => a.state === 'fly' && a.t > react * a.flight).sort((a, b) => b.t - a.t)[0];
    if (incoming && Math.random() > (10 - this.botSkill) * 0.01) this._face(incoming.dir);
  }

  tick(dt) {
    this.fireT -= dt;
    if (this.fireT <= 0 && this.fired < this.total) {
      this._fire();
      if (this.hard > 0.5 && Math.random() < 0.2 && this.fired < this.total) this._fire();
      this.fireT = Math.max(0.4, 1.0 - this.hard * 0.4 - this.fired * 0.02);
    }
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      if (a.state === 'fly') {
        a.t += dt;
        const k = a.t / a.flight;
        const target = new THREE.Vector3(0, 0.8, 0);
        a.m.position.lerpVectors(a.from, target, Math.min(k, 0.86));
        a.m.position.y += Math.sin(Math.min(1, k) * Math.PI) * 1.2;
        if (k >= 0.86) {
          if (this.facing === a.dir) {
            a.state = 'bounce';
            a.v = new THREE.Vector3((Math.random() - 0.5) * 6, 6, (Math.random() - 0.5) * 6);
            this.blocked++;
            this.shieldFlash = 1;
            this.burst.spawn(a.m.position, [0x4cc9f0, 0xffffff, 0xffd166], 16, 5, { up: 2 });
            Sfx3D.ding(84);
            this.shake = 0.2;
          } else {
            this.hp--;
            this.hitFx(0.9, 0xff4d6d);
            this.burst.spawn(a.m.position, [0xff4d6d, 0xffffff], 24, 5, { up: 2 });
            Sfx3D.hit();
            this.scene.remove(a.m);
            this.arrows.splice(i, 1);
            if (this.hp <= 0) { this.say('PIERCED!', '#ff4d6d'); this.lose(); return; }
            this.say('HIT!', '#ffb347');
          }
        }
      } else {
        a.v.y -= 20 * dt;
        a.m.position.addScaledVector(a.v, dt);
        a.m.rotation.x += dt * 12;
        if (a.m.position.y < -3) { this.scene.remove(a.m); Mini3D.disposeScene(a.m); this.arrows.splice(i, 1); }
      }
    }
    this._animate(dt);
    if (this.fired >= this.total && !this.arrows.some(a => a.state === 'fly')) {
      this.say('UNBREAKABLE!', '#3ee07f');
      this.win();
    }
  }

  _animate(dt) {
    let d = this._angleFor(this.facing) - this.shieldAngle;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.shieldAngle += d * Math.min(1, dt * 22);
    this.shieldPivot.rotation.y = this.shieldAngle;
    this.player.rotation.y = this.shieldAngle;
    this.shieldFlash = Math.max(0, (this.shieldFlash || 0) - dt * 4);
    this.shieldMesh.material.emissiveIntensity = 0.6 + this.shieldFlash * 2;
    this.shieldArc.material.opacity = 0.75 + this.shieldFlash * 0.25;
    for (const t of this.towers) t.charge.material.opacity = Math.max(0, t.charge.material.opacity - dt * 2.5);
  }

  afterTick(dt) {
    this._animate(dt);
    for (const a of this.arrows) if (a.state === 'bounce') { a.v.y -= 20 * dt; a.m.position.addScaledVector(a.v, dt); }
  }

  hud(ctx, x, y, w, h) {
    this.hudText(ctx, 'BLOCK THE ARROWS', x + 16, y + 20, { size: 14, title: true, color: '#4cc9f0' });
    this.hudBar(ctx, x + 16, y + 38, 200, 12, this.fired / this.total, '#4cc9f0');
    this.hudText(ctx, `${this.total - this.fired} left`, x + 226, y + 44, { size: 14, color: '#a89fd0' });
    this.hudHearts(ctx, x + w - 16 - this.maxHp * 22, y + 21, this.hp, this.maxHp);
    this.hudHint(ctx, 'Arrow keys / WASD or click a side to turn the shield');
  }
}
