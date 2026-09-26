// Your piece stands on a tiny chessboard planet while the enemy army rains
// down as burning meteors. Click them to vaporise them with a laser before
// they smash through the shield.
class MeteorStorm extends Game3D {
  constructor() {
    super('Meteor Storm');
  }

  static PLANET = 2;

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x05030f);
    this.lights({ sky: 0x9fb6ff, ground: 0x1a0f33, keyI: 2.6, rim: 0x4cc9f0, rimI: 2 });

    const stars = Mini3D.starfield(500, 90, 0xffffff);
    scene.add(stars);
    this.stars = stars;
    for (const [c, s, x, y, z] of [[0x6a2cff, 60, -30, 10, -60], [0xff2fb4, 45, 35, -8, -70], [0x2fd4ff, 40, 10, 25, -80]]) {
      const neb = Mini3D.glowSprite(c, s);
      neb.material.opacity = 0.18;
      neb.position.set(x, y, z);
      scene.add(neb);
    }

    // The planet
    const tex = Mini3D.checkerTexture(16, '#6fd39a', '#1f6b52', 4);
    this.planet = new THREE.Mesh(new THREE.SphereGeometry(MeteorStorm.PLANET, 20, 14), new THREE.MeshStandardMaterial({ map: tex, flatShading: true, roughness: 0.7 }));
    scene.add(this.planet);
    const atmo = Mini3D.glowSprite(0x3ee07f, 7);
    atmo.material.opacity = 0.35;
    scene.add(atmo);
    this.shield = new THREE.Mesh(new THREE.IcosahedronGeometry(3.1, 1), new THREE.MeshBasicMaterial({
      color: 0x4cc9f0, wireframe: true, transparent: true, opacity: 0.25, toneMapped: false,
    }));
    scene.add(this.shield);

    this.player = this.playerPiece();
    this.player.position.y = MeteorStorm.PLANET - 0.05;
    this.player.scale.setScalar(1.05);
    scene.add(this.player);

    // Laser beam, reused
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6, 1, true), new THREE.MeshBasicMaterial({
      color: 0x7dffb0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    this.beam.visible = false;
    scene.add(this.beam);
    this.beamT = 0;

    this.camera.fov = 55;
    this.camera.position.set(0, 3.5, 11);
    this.camera.lookAt(0, 1, 0);

    this.meteors = [];
    this.goal = Math.round(10 + this.hard * 8 + (this.isDuel ? 3 : 0));
    this.killed = 0;
    this.shieldHP = this.hard > 0.6 ? 2 : 3;
    this.maxHP = this.shieldHP;
    this.spawnTimer = 0.2;
    this.keyCooldown = 0;
    this.botCooldown = 0.5;
  }

  _spawn() {
    // Mostly from the visible half, across the top and sides.
    const a = (Math.random() - 0.5) * Math.PI * 1.3;
    const el = 0.15 + Math.random() * 1.1;
    const dir = new THREE.Vector3(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el) * 0.6 + 0.2).normalize();
    const types = ['pawn', 'pawn', 'knight', 'bishop', 'rook', this.enemy.type];
    const obj = Pieces3D.create(types[(Math.random() * types.length) | 0], this.enemyColor, 0xff4400);
    obj.scale.setScalar(0.7);
    const fire = Mini3D.glowSprite(0xff6a1a, 2.2);
    fire.position.y = 0.5;
    obj.add(fire);
    obj.position.copy(dir.clone().multiplyScalar(17));
    this.scene.add(obj);
    const big = Math.random() < this.hard * 0.3;
    if (big) obj.scale.setScalar(1.2);
    this.meteors.push({
      obj, big,
      speed: (2.4 + this.hard * 2 + Math.random()) * (big ? 0.7 : 1),
      spin: new THREE.Vector3(Math.random() * 3, Math.random() * 3, Math.random() * 3),
      wobble: Math.random() * 6,
    });
  }

  _screenPos(v) {
    const p = v.clone().project(this.camera);
    return { x: p.x * this.camera.aspect, y: p.y, z: p.z };
  }

  _pick(nx, ny) {
    let best = null, bestD = Infinity;
    for (const m of this.meteors) {
      const s = this._screenPos(m.obj.position.clone().add(new THREE.Vector3(0, 0.4, 0)));
      if (s.z > 1) continue;
      const d = Math.hypot(s.x - nx * this.camera.aspect, s.y - ny);
      const tol = m.big ? 0.2 : 0.14;
      if (d < tol && d < bestD) { best = m; bestD = d; }
    }
    return best;
  }

  onPress() {
    const n = this.ndc();
    const m = this._pick(n.x, n.y);
    if (m) this._zap(m);
    else {
      Sfx3D.blip(60);
      this._beamTo(this._pointerWorld());
    }
  }

  onKey(k) {
    if ((k === ' ' || k === 'Enter') && this.keyCooldown <= 0) {
      const m = this._nearest();
      if (m) this._zap(m);
      this.keyCooldown = 0.45;
    }
  }

  _pointerWorld() {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(this.ndc(), this.camera);
    return ray.ray.at(10, new THREE.Vector3());
  }

  _nearest() {
    let best = null;
    for (const m of this.meteors) if (!best || m.obj.position.length() < best.obj.position.length()) best = m;
    return best;
  }

  _beamTo(target) {
    const from = this.player.localToWorld(new THREE.Vector3(0, 1, 0));
    const d = target.clone().sub(from);
    this.beam.position.copy(from).addScaledVector(d, 0.5);
    this.beam.scale.set(1, d.length(), 1);
    this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    this.beam.visible = true;
    this.beamT = 0.12;
  }

  _zap(m) {
    this._beamTo(m.obj.position);
    if (m.big) {
      // Big ones split into two smaller rocks.
      m.big = false;
      m.obj.scale.setScalar(0.7);
      this._spawnChild(m);
      Sfx3D.zap(70);
      this.burst.spawn(m.obj.position, [0xff6a1a, 0xffd166], 16, 5);
      this.say('SPLIT!', '#ffb347');
      return;
    }
    this.meteors.splice(this.meteors.indexOf(m), 1);
    this.burst.spawn(m.obj.position, [0xffd166, 0xff6a1a, 0xffffff, 0x7dffb0], 30, 7, { size: 0.16, gravity: 0 });
    this.scene.remove(m.obj);
    Mini3D.disposeScene(m.obj);
    this.killed++;
    this.hitFx(0.25, 0x7dffb0);
    Sfx3D.zap(84 + (this.killed % 5) * 2);
    if (this.killed >= this.goal) {
      this.say('SKY CLEARED!', '#3ee07f');
      for (const o of this.meteors) {
        this.burst.spawn(o.obj.position, [0xffd166, 0xffffff], 14, 5, { gravity: 0 });
        this.scene.remove(o.obj);
        Mini3D.disposeScene(o.obj);
      }
      this.meteors = [];
      this.win();
    }
  }

  _spawnChild(m) {
    const obj = Pieces3D.create('pawn', this.enemyColor, 0xff4400);
    obj.scale.setScalar(0.6);
    const fire = Mini3D.glowSprite(0xff6a1a, 1.6);
    fire.position.y = 0.5;
    obj.add(fire);
    const side = new THREE.Vector3().crossVectors(m.obj.position, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(1.4);
    obj.position.copy(m.obj.position).add(side);
    m.obj.position.sub(side);
    this.scene.add(obj);
    this.meteors.push({ obj, big: false, speed: m.speed * 1.2, spin: m.spin.clone(), wobble: 0 });
  }

  bot(dt) {
    this.botCooldown -= dt;
    if (this.botCooldown > 0) return;
    this.botCooldown = 0.9 - this.botSkill * 0.07 + Math.random() * 0.3;
    const m = this._nearest();
    if (m && Math.random() > (10 - this.botSkill) * 0.03) this._zap(m);
  }

  tick(dt) {
    this.keyCooldown = Math.max(0, this.keyCooldown - dt);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this._spawn();
      if (this.hard > 0.5 && Math.random() < 0.3) this._spawn();
      this.spawnTimer = Math.max(0.35, 1.0 - this.hard * 0.45 - this.killed * 0.012);
    }
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      const p = m.obj.position;
      const toCenter = p.clone().negate().normalize();
      p.addScaledVector(toCenter, m.speed * dt);
      m.wobble += dt;
      m.obj.rotation.x += m.spin.x * dt;
      m.obj.rotation.y += m.spin.y * dt;
      if (Math.random() < 0.7) this.burst.spawn(p, [0xff6a1a, 0xffb347, 0x555555], 1, 0.4, { gravity: 0, life: 0.5, size: 0.14 });
      if (p.length() < 3.1) this._impact(i);
    }
    this._world(dt);
  }

  _impact(i) {
    const m = this.meteors[i];
    this.meteors.splice(i, 1);
    this.burst.spawn(m.obj.position, [0xff4d6d, 0xff6a1a, 0xffffff], 50, 9, { size: 0.2 });
    this.scene.remove(m.obj);
    Mini3D.disposeScene(m.obj);
    this.shieldHP--;
    this.shieldHit = 1;
    this.hitFx(1, 0xff4d6d);
    Sfx3D.boom();
    if (this.shieldHP <= 0) {
      this.say('SHIELD DOWN!', '#ff4d6d');
      this.lose();
    } else this.say('IMPACT!', '#ff6a3d');
  }

  _world(dt) {
    this.planet.rotation.y += dt * 0.25;
    this.stars.rotation.y += dt * 0.01;
    this.shieldHit = Math.max(0, (this.shieldHit || 0) - dt * 2);
    this.shield.rotation.y -= dt * 0.3;
    this.shield.material.color.set(this.shieldHit > 0 ? 0xff4d6d : 0x4cc9f0);
    this.shield.material.opacity = 0.12 + 0.1 * this.shieldHP + this.shieldHit * 0.5;
    this.shield.visible = this.shieldHP > 0;
    this.tint = this.shieldHP === 1 && !this.done ? 0.15 + 0.1 * Math.sin(this.time * 8) : 0;
    this.beamT -= dt;
    this.beam.visible = this.beamT > 0;
    this.beam.material.opacity = Math.max(0, this.beamT / 0.12);
    // Piece turns to face the pointer.
    this.player.rotation.y += ((this.pointer.x - 0.5) * 2 - this.player.rotation.y) * Math.min(1, dt * 8);
    const a = Math.sin(this.time * 0.3) * 0.25;
    this.camera.position.set(Math.sin(a) * 11, 3.5 + Math.sin(this.time * 0.5) * 0.3, Math.cos(a) * 11);
    this.camera.lookAt(0, 1, 0);
  }

  afterTick(dt) {
    this._world(dt);
    if (this.winner === 'defender') {
      this.player.position.y += dt * 3;
      this.player.rotation.x += dt * 6;
    }
  }

  hud(ctx, x, y, w, h) {
    this.hudText(ctx, 'SHOOT THE METEORS', x + 16, y + 20, { size: 14, title: true, color: '#ff8a3d' });
    this.hudBar(ctx, x + 16, y + 38, 200, 12, this.killed / this.goal, '#7dffb0');
    this.hudText(ctx, `${this.killed}/${this.goal}`, x + 226, y + 44, { size: 14, color: '#7dffb0' });
    this.hudText(ctx, 'SHIELD', x + w - 16 - this.maxHP * 22 - 64, y + 21, { size: 14, title: true, color: '#4cc9f0' });
    this.hudHearts(ctx, x + w - 12 - this.maxHP * 22, y + 21, this.shieldHP, this.maxHP);
    // Crosshair
    if (this.pointer.inside && !this.done) {
      const px = x + this.pointer.x * w, py = y + this.pointer.y * h;
      ctx.save();
      ctx.strokeStyle = '#7dffb0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.moveTo(px - 22, py); ctx.lineTo(px - 8, py);
      ctx.moveTo(px + 8, py); ctx.lineTo(px + 22, py);
      ctx.moveTo(px, py - 22); ctx.lineTo(px, py - 8);
      ctx.moveTo(px, py + 8); ctx.lineTo(px, py + 22);
      ctx.stroke();
      ctx.restore();
    }
    this.hudHint(ctx, 'Click the meteors (SPACE zaps the closest one, slower)');
  }
}
