// Build a rook tower into the clouds. Slabs sweep in from alternating
// sides; drop each one on the stack. Whatever hangs over the edge is sliced
// off and tumbles away, so misses shrink the tower until nothing is left.
class RookStack extends Game3D {
  constructor() {
    super('Rook Stack');
  }

  static H = 0.5;

  setup() {
    const scene = this.scene;
    this.sky = new THREE.Color(0x1d1446);
    scene.background = this.sky;
    scene.fog = new THREE.Fog(0x1d1446, 16, 40);
    this.rig = this.lights({ shadows: true, shadowSize: 6, keyI: 2.4 });

    // Pedestal
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x3a2d63, flatShading: true, roughness: 0.6 }));
    base.position.y = -0.6;
    base.receiveShadow = true;
    scene.add(base);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: (() => {
      const t = Mini3D.checkerTexture(2, '#2a2150', '#15102e', 8);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(15, 15);
      return t;
    })() }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Floating clouds of cubes at a few heights
    this.clouds = [];
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xe8e4ff, flatShading: true, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(1 + Math.random(), 0.6 + Math.random() * 0.4, 1 + Math.random()), cloudMat);
        b.position.set(j * 0.8 - 1.2, Math.random() * 0.3, Math.random() * 0.6);
        g.add(b);
      }
      const a = Math.random() * Math.PI * 2, d = 7 + Math.random() * 6;
      g.position.set(Math.cos(a) * d, 2 + i * 1.3, Math.sin(a) * d);
      g.userData.speed = 0.2 + Math.random() * 0.3;
      scene.add(g);
      this.clouds.push(g);
    }
    const stars = Mini3D.starfield(250, 60, 0xffffff);
    stars.material.fog = false;
    stars.position.y = 20;
    scene.add(stars);

    this.goalHeight = Math.round(7 + this.hard * 5 + (this.isDuel ? 2 : 0));
    this.timeLimit = 6 + this.goalHeight * 2.2;
    this.stack = [{ x: 0, z: 0, w: 3, d: 3, y: 0 }];
    this.debris = [];
    this.moving = null;
    this.perfects = 0;
    this.camY = 3;
    this._addTopMesh(this.stack[0], 0);

    // Goal marker: a ghost ring at the target height
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.06, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffd166, toneMapped: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = this.goalHeight * RookStack.H + 0.25;
    this.goalRing = ring;
    scene.add(ring);

    this.camera.fov = 45;
    this._spawn();
  }

  _material(level) {
    const hue = (0.72 + level * 0.035) % 1;
    const light = level % 2 === 0;
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, 0.45, light ? 0.72 : 0.32),
      flatShading: true, roughness: 0.55,
    });
  }

  _addTopMesh(b, level) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, RookStack.H, b.d), this._material(level));
    m.position.set(b.x, b.y + RookStack.H / 2, b.z);
    m.castShadow = true;
    m.receiveShadow = true;
    this.scene.add(m);
    b.mesh = m;
    return m;
  }

  _spawn() {
    const top = this.stack[this.stack.length - 1];
    const level = this.stack.length;
    const axis = level % 2 ? 'x' : 'z';
    const b = { x: top.x, z: top.z, w: top.w, d: top.d, y: level * RookStack.H };
    const from = Math.random() < 0.5 ? -1 : 1;
    b[axis] = from * 5;
    this._addTopMesh(b, level);
    const speed = 3.2 + this.hard * 2.8 + level * 0.18;
    this.moving = { b, axis, dir: -from, speed };
  }

  onKey(k) {
    if (k === ' ' || k === 'Enter' || k === 'ArrowDown' || k === 's') this._drop();
  }

  onPress() {
    this._drop();
  }

  bot() {
    if (!this.moving) return;
    const top = this.stack[this.stack.length - 1];
    const { b, axis } = this.moving;
    const off = Math.abs(b[axis] - top[axis]);
    const tol = 0.04 + (10 - this.botSkill) * 0.045;
    if (off < tol && Math.random() < 0.5) this._drop();
  }

  _drop() {
    if (!this.moving || this.done) return;
    const { b, axis } = this.moving;
    const top = this.stack[this.stack.length - 1];
    const size = axis === 'x' ? 'w' : 'd';
    let off = b[axis] - top[axis];
    this.moving = null;

    if (Math.abs(off) < 0.1) {
      // Perfect: snap into place, and a streak of them grows the slab back.
      off = 0;
      b[axis] = top[axis];
      this.perfects++;
      if (this.perfects >= 3 && b[size] < 3) b[size] = Math.min(3, b[size] + 0.3);
      b.mesh.geometry.dispose();
      b.mesh.geometry = new THREE.BoxGeometry(b.w, RookStack.H, b.d);
      b.mesh.position.set(b.x, b.y + RookStack.H / 2, b.z);
      b.mesh.material.emissive = new THREE.Color(0xffffff);
      b.mesh.material.emissiveIntensity = 0.8;
      this.burst.spawn(new THREE.Vector3(b.x, b.y + 0.5, b.z), [0xffd166, 0xffffff], 24, 5, { up: 3 });
      Sfx3D.ding(76 + Math.min(12, this.perfects * 2));
      this.say(this.perfects > 1 ? `PERFECT x${this.perfects}` : 'PERFECT!', '#ffd166');
      this.shake = 0.25;
    } else {
      this.perfects = 0;
      const overlap = top[size] - Math.abs(off);
      if (overlap <= 0) {
        this._fall(b.mesh, axis, Math.sign(off));
        this.stack.push(b);
        this.say('TOPPLED!', '#ff4d6d');
        this.hitFx(0.9, 0xff4d6d);
        Sfx3D.boom();
        this.lose();
        return;
      }
      // Keep the overlapping part, drop the rest.
      const cutSize = Math.abs(off);
      const keptCenter = top[axis] + off / 2;
      const cutCenter = keptCenter + Math.sign(off) * (overlap / 2 + cutSize / 2);
      const cut = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? cutSize : b.w, RookStack.H, axis === 'z' ? cutSize : b.d), b.mesh.material.clone());
      cut.position.copy(b.mesh.position);
      cut.position[axis] = cutCenter;
      cut.castShadow = true;
      this.scene.add(cut);
      this._fall(cut, axis, Math.sign(off));

      b[size] = overlap;
      b[axis] = keptCenter;
      b.mesh.geometry.dispose();
      b.mesh.geometry = new THREE.BoxGeometry(b.w, RookStack.H, b.d);
      b.mesh.position.set(b.x, b.y + RookStack.H / 2, b.z);
      Sfx3D.thud();
      this.shake = 0.35;
      const pos = new THREE.Vector3(b.x, b.y + 0.3, b.z);
      pos[axis] += Math.sign(off) * overlap / 2;
      this.burst.spawn(pos, [0xb8a8ff, 0xffffff], 10, 3, { up: 1 });
    }

    this.stack.push(b);
    if (this.stack.length - 1 >= this.goalHeight) {
      this._crown();
      this.win();
      this.say('TOWER COMPLETE!', '#3ee07f');
    } else {
      this._spawn();
    }
  }

  _fall(mesh, axis, sign) {
    const v = new THREE.Vector3();
    v[axis] = sign * 2.5;
    this.debris.push({ mesh, v, spin: new THREE.Vector3(axis === 'z' ? sign * 3 : 0.5, 0, axis === 'x' ? -sign * 3 : 0.5) });
  }

  _crown() {
    const top = this.stack[this.stack.length - 1];
    this.crownPiece = this.playerPiece();
    this.crownPiece.position.set(top.x, top.y + RookStack.H + 6, top.z);
    this.crownPiece.scale.setScalar(1.4);
    this.crownTarget = top.y + RookStack.H;
    this.scene.add(this.crownPiece);
    const glow = Mini3D.glowSprite(0xffd166, 4);
    glow.position.set(top.x, top.y + 1.5, top.z);
    this.scene.add(glow);
  }

  tick(dt) {
    if (this.moving) {
      const m = this.moving;
      m.b[m.axis] += m.dir * m.speed * dt;
      if (Math.abs(m.b[m.axis]) > 5) {
        m.b[m.axis] = Math.sign(m.b[m.axis]) * 5;
        m.dir *= -1;
      }
      m.b.mesh.position[m.axis] = m.b[m.axis];
    }
    this._world(dt);
  }

  afterTick(dt) {
    this._world(dt);
    if (this.crownPiece) {
      const p = this.crownPiece.position;
      if (p.y > this.crownTarget) {
        p.y = Math.max(this.crownTarget, p.y - dt * 14);
        if (p.y === this.crownTarget) {
          this.burst.spawn(p.clone().add(new THREE.Vector3(0, 0.3, 0)), [0xffd166, 0x3ee07f, 0xffffff], 50, 7, { up: 4, size: 0.16 });
          this.shake = 0.5;
          Sfx3D.boom();
        }
      }
      this.crownPiece.rotation.y += dt * 2;
    }
    if (this.winner === 'defender') this.goalRing.material.color.set(0xff4d6d);
  }

  _world(dt) {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.v.y -= 18 * dt;
      d.mesh.position.addScaledVector(d.v, dt);
      d.mesh.rotation.x += d.spin.x * dt;
      d.mesh.rotation.z += d.spin.z * dt;
      if (d.mesh.position.y < -15) {
        this.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        this.debris.splice(i, 1);
      }
    }
    for (const b of this.stack) {
      const mat = b.mesh && b.mesh.material;
      if (mat && mat.emissiveIntensity > 0) mat.emissiveIntensity = Math.max(0, mat.emissiveIntensity - dt * 2);
    }
    for (const c of this.clouds) {
      const a = Math.atan2(c.position.z, c.position.x) + c.userData.speed * dt * 0.2;
      const d = Math.hypot(c.position.x, c.position.z);
      c.position.x = Math.cos(a) * d;
      c.position.z = Math.sin(a) * d;
    }
    this.goalRing.rotation.z += dt;
    this.goalRing.scale.setScalar(1 + Math.sin(this.time * 4) * 0.04);

    // Camera climbs with the tower; sky darkens into space.
    const h = (this.stack.length) * RookStack.H;
    this.camY += (h + 4 - this.camY) * Math.min(1, dt * 3);
    const a = this.time * 0.15;
    this.camera.position.set(Math.cos(a + 0.8) * 10, this.camY + 2.5, Math.sin(a + 0.8) * 10);
    this.camera.lookAt(0, this.camY - 2.2, 0);
    this.rig.key.position.set(4, this.camY + 8, 5);
    this.rig.key.target.position.set(0, this.camY - 3, 0);
    this.rig.key.target.updateMatrixWorld();
    const k = Math.min(1, this.stack.length / (this.goalHeight + 2));
    this.sky.setRGB(0.11 * (1 - k) + 0.02, 0.08 * (1 - k) + 0.01, 0.27 * (1 - k) + 0.08);
    this.scene.fog.color.copy(this.sky);
  }

  hud(ctx, x, y, w, h) {
    const built = this.stack.length - 1;
    this.hudText(ctx, 'BUILD THE TOWER', x + 16, y + 20, { size: 14, title: true, color: '#b8a8ff' });
    this.hudText(ctx, `${Math.min(built, this.goalHeight)} / ${this.goalHeight}`, x + w - 110, y + 22, { size: 26, align: 'right', title: true, color: '#ffd166' });
    this.hudTimer(ctx, x + w - 16, y + 22);
    this.hudBar(ctx, x + 16, y + 38, 180, 10, built / this.goalHeight, '#b8a8ff');
    this.hudHint(ctx, 'Click or press SPACE to drop the slab');
  }
}
