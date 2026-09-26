// Crossbow shooting gallery. Enemy pieces glide along three rails; shoot
// them down. Your own pieces ride the rails too - hit one and it costs you.
class TargetPractice extends Game3D {
  constructor() {
    super('Crossbow Gallery');
  }

  static ROWS = [{ z: -3, y: 0.2, speed: 1.7 }, { z: -6, y: 1.4, speed: -2.3 }, { z: -9, y: 2.6, speed: 2.9 }];

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x1a0a18);
    scene.fog = new THREE.Fog(0x1a0a18, 12, 30);
    this.lights({ sky: 0xffd9b0, ground: 0x3a1020, keyI: 2.2, rim: 0xffb347 });

    // Booth: striped awning, back wall, rails
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 10), new THREE.MeshStandardMaterial({ map: Mini3D.checkerTexture(8, '#5a1a3a', '#3a0a24', 8) }));
    wall.position.set(0, 3, -11);
    scene.add(wall);
    const awnMat = [new THREE.MeshStandardMaterial({ color: 0xff4d6d }), new THREE.MeshStandardMaterial({ color: 0xf4f0ff })];
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 2), awnMat[i % 2]);
      s.position.set(-5.5 + i, 5.2, -1);
      s.rotation.x = 0.3;
      scene.add(s);
    }
    const counter = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 0.8), new THREE.MeshStandardMaterial({ color: 0x6a3a1a, flatShading: true }));
    counter.position.set(0, -0.8, 0.5);
    scene.add(counter);
    for (const r of TargetPractice.ROWS) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(16, 0.12, 0.3), new THREE.MeshStandardMaterial({ color: 0xc0a060, metalness: 0.7, roughness: 0.3 }));
      rail.position.set(0, r.y - 0.06, r.z);
      scene.add(rail);
    }
    for (let i = 0; i < 6; i++) {
      const bulb = Mini3D.glowSprite(i % 2 ? 0xffd166 : 0xff4d6d, 1);
      bulb.position.set(-5 + i * 2, 4.6, -0.2);
      scene.add(bulb);
    }

    this.crossbow = new THREE.Group();
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 1.3), new THREE.MeshStandardMaterial({ color: 0x6a3a1a }));
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 4, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0x9a9ab0, metalness: 0.8 }));
    bow.rotation.x = Math.PI / 2;
    bow.position.z = 0.55;
    this.crossbow.add(stock, bow);
    this.crossbow.position.set(0.8, 0.35, 2.9);
    scene.add(this.crossbow);

    this.camera.fov = 55;
    this.camera.position.set(0, 1.2, 4.2);
    this.camera.lookAt(0, 1.2, -6);

    this.targets = [];
    this.bolts = [];
    this.goal = Math.round(7 + this.hard * 5 + (this.isDuel ? 2 : 0));
    this.hits = 0;
    this.timeLimit = 15 + this.goal * 0.4;
    this.spawnT = 0;
    this.aim = { x: 0.5, y: 0.5 };
    this.botT = 0.6;
    this.cooldown = 0;
    for (let i = 0; i < 9; i++) this._spawn(true);
  }

  _spawn(initial) {
    const row = (Math.random() * 3) | 0;
    const r = TargetPractice.ROWS[row];
    const friend = Math.random() < 0.22;
    const obj = Pieces3D.create(friend ? this.mine.type : ['pawn', 'knight', 'bishop', 'rook', this.enemy.type][(Math.random() * 5) | 0], friend ? this.mine.color : this.enemyColor, friend ? 0x1c6b3f : 0xb01438);
    obj.scale.setScalar(0.9 + row * 0.15);
    const x = initial ? (Math.random() - 0.5) * 12 : -Math.sign(r.speed) * 8.5;
    obj.position.set(x, r.y, r.z);
    if (friend) {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 4, 12), new THREE.MeshBasicMaterial({ color: 0x3ee07f, toneMapped: false }));
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 1.35;
      obj.add(halo);
    }
    this.scene.add(obj);
    this.targets.push({ obj, row, v: r.speed * (1 + this.hard * 0.6), friend, down: false, spin: 0 });
  }

  _shoot() {
    if (this.done || this.cooldown > 0) return;
    this.cooldown = 0.22;
    this.recoil = 1;
    Sfx3D.zap(70);
    const hit = this.screenPickAt(this.aim, this.targets.filter(t => !t.down), t => t.obj.position.clone().add(new THREE.Vector3(0, 0.55 * t.obj.scale.y, 0)), 0.09);
    const end = hit ? hit.obj.position.clone().add(new THREE.Vector3(0, 0.5, 0)) : this._aimPoint(10);
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 4), new THREE.MeshBasicMaterial({ color: 0xffd166, toneMapped: false }));
    const from = new THREE.Vector3(0.9, 0.7, 2.6);
    bolt.position.copy(from);
    bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(from).normalize());
    this.scene.add(bolt);
    this.bolts.push({ m: bolt, from, to: end, t: 0, hit });
  }

  screenPickAt(aim, items, posFn, tol) {
    const saved = { x: this.pointer.x, y: this.pointer.y };
    this.pointer.x = aim.x; this.pointer.y = aim.y;
    const r = this.screenPick(items, posFn, tol);
    this.pointer.x = saved.x; this.pointer.y = saved.y;
    return r;
  }

  _aimPoint(dist) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(this.aim.x * 2 - 1, -(this.aim.y * 2 - 1)), this.camera);
    return ray.ray.at(dist, new THREE.Vector3());
  }

  _resolve(b) {
    const t = b.hit;
    if (!t || t.down) return;
    t.down = true;
    t.spin = 14;
    this.burst.spawn(b.to, t.friend ? [0x3ee07f, 0xffffff] : [0xff4d6d, 0xffd166, 0xffffff], 20, 5, { up: 2 });
    if (t.friend) {
      this.timeLimit -= 2;
      this.hitFx(0.8, 0xff4d6d);
      Sfx3D.hit();
      this.say('FRIENDLY FIRE! -2s', '#ff4d6d');
    } else {
      this.hits++;
      Sfx3D.ding(80 + (this.hits % 6) * 2);
      this.shake = 0.2;
      if (this.hits >= this.goal) { this.say('SHARPSHOOTER!', '#3ee07f'); this.win(); }
    }
  }

  onPress() {
    this.aim.x = this.pointer.x;
    this.aim.y = this.pointer.y;
    this._shoot();
  }

  onMove() {
    this.aim.x = this.pointer.x;
    this.aim.y = this.pointer.y;
  }

  onKey(k) {
    if (k === ' ' || k === 'Enter') this._shoot();
  }

  bot(dt) {
    this.botT -= dt;
    const foes = this.targets.filter(t => !t.down && !t.friend && Math.abs(t.obj.position.x) < 5);
    if (!foes.length) return;
    if (!this.botTarget || this.botTarget.down) this.botTarget = foes[(Math.random() * foes.length) | 0];
    // Lead the target by the bolt's flight time.
    const p = this.botTarget.obj.position.clone().add(new THREE.Vector3(this.botTarget.v * 0.1, 0.55, 0)).project(this.camera);
    const tx = (p.x + 1) / 2, ty = (1 - p.y) / 2;
    const err = (10 - this.botSkill) * 0.006;
    this.aim.x += (tx + (Math.random() - 0.5) * err - this.aim.x) * Math.min(1, dt * (8 + this.botSkill));
    this.aim.y += (ty + (Math.random() - 0.5) * err - this.aim.y) * Math.min(1, dt * (8 + this.botSkill));
    if (this.botT <= 0 && Math.hypot(this.aim.x - tx, this.aim.y - ty) < 0.05) {
      this.botT = 0.95 - this.botSkill * 0.05 + Math.random() * 0.3;
      this._shoot();
      this.botTarget = null;
    }
  }

  tick(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!this.botControlled) {
      if (this.held('ArrowLeft', 'a')) this.aim.x -= dt * 0.6;
      if (this.held('ArrowRight', 'd')) this.aim.x += dt * 0.6;
      if (this.held('ArrowUp', 'w')) this.aim.y -= dt * 0.6;
      if (this.held('ArrowDown', 's')) this.aim.y += dt * 0.6;
      this.aim.x = Math.max(0, Math.min(1, this.aim.x));
      this.aim.y = Math.max(0, Math.min(1, this.aim.y));
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0) { this._spawn(false); this.spawnT = Math.max(0.35, 0.6 - this.hard * 0.2); }
    this._world(dt);
  }

  _world(dt) {
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      if (t.down) {
        t.obj.rotation.x -= t.spin * dt;
        t.obj.position.y -= dt * 1.5;
        if (t.obj.rotation.x < -Math.PI / 2) t.obj.rotation.x = -Math.PI / 2;
      } else {
        t.obj.position.x += t.v * dt;
        t.obj.position.y = TargetPractice.ROWS[t.row].y + Math.abs(Math.sin(this.time * 6 + i)) * 0.1;
      }
      if (Math.abs(t.obj.position.x) > 9 || t.obj.position.y < -2) {
        this.scene.remove(t.obj);
        Mini3D.disposeScene(t.obj);
        this.targets.splice(i, 1);
      }
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.t += dt / 0.08;
      b.m.position.lerpVectors(b.from, b.to, Math.min(1, b.t));
      if (b.t >= 1) {
        this._resolve(b);
        this.scene.remove(b.m);
        Mini3D.disposeScene(b.m);
        this.bolts.splice(i, 1);
      }
    }
    this.recoil = Math.max(0, (this.recoil || 0) - dt * 6);
    const ap = this._aimPoint(8);
    this.crossbow.lookAt(ap);
    this.crossbow.position.z = 2.9 + this.recoil * 0.2;
  }

  afterTick(dt) {
    this._world(dt);
  }

  hud(ctx, x, y, w, h) {
    this.hudText(ctx, 'SHOOT THE ENEMIES', x + 16, y + 20, { size: 14, title: true, color: '#ff8a3d' });
    this.hudBar(ctx, x + 16, y + 38, 200, 12, this.hits / this.goal, '#ffd166');
    this.hudText(ctx, `${this.hits}/${this.goal}`, x + 226, y + 44, { size: 14, color: '#ffd166' });
    this.hudTimer(ctx, x + w - 16, y + 22);
    if (!this.done) {
      const px = x + this.aim.x * w, py = y + this.aim.y * h;
      ctx.save();
      ctx.strokeStyle = this.cooldown > 0 ? '#ff4d6d' : '#ffd166';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.moveTo(px - 20, py); ctx.lineTo(px - 6, py);
      ctx.moveTo(px + 6, py); ctx.lineTo(px + 20, py);
      ctx.moveTo(px, py - 20); ctx.lineTo(px, py - 6);
      ctx.moveTo(px, py + 6); ctx.lineTo(px, py + 20);
      ctx.stroke();
      ctx.restore();
    }
    this.hudHint(ctx, 'Click to shoot (or arrows + SPACE). Green halos are friends!');
  }
}
