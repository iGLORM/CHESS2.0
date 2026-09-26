// Artillery. The attacking army stands on a floating island; lob explosive
// cannonballs to blast every piece off it before you run out of shots.
// Flying pieces knock over whatever they hit.
class SiegeCannon extends Game3D {
  constructor() {
    super('Siege Cannon');
  }

  static SPEED = 17;
  static G = 12;
  static BLAST = 1.5;

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x3a1840);
    scene.fog = new THREE.Fog(0x3a1840, 25, 70);
    this.lights({ sky: 0xffd6ec, ground: 0x6a3a70, hemi: 2.2, key: 0xffe0b8, keyI: 3.2, shadows: true, shadowSize: 10 });

    const moon = Mini3D.glowSprite(0xff8a5c, 30);
    moon.material.fog = false;
    moon.position.set(-14, 14, -50);
    scene.add(moon);
    const stars = Mini3D.starfield(260, 120, 0xffe0f0);
    stars.material.fog = false;
    scene.add(stars);

    // Floating rocks drifting around
    this.rocks = [];
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a5090, flatShading: true });
    for (let i = 0; i < 10; i++) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + Math.random() * 1.2, 0), rockMat);
      r.position.set((Math.random() - 0.5) * 40, -2 + Math.random() * 10, -10 - Math.random() * 30);
      r.userData.spin = Math.random() - 0.5;
      scene.add(r);
      this.rocks.push(r);
    }

    // Player's cliff and cannon
    const cliff = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 0.8, 3, 7), new THREE.MeshStandardMaterial({ color: 0x3a2850, flatShading: true }));
    cliff.position.set(0, -1.5, 3.5);
    cliff.receiveShadow = true;
    scene.add(cliff);
    this.cannon = new THREE.Group();
    this.cannon.position.set(0, 0.35, 3.2);
    const metal = new THREE.MeshStandardMaterial({ color: 0x6a6690, metalness: 0.6, roughness: 0.35, flatShading: true });
    const brass = new THREE.MeshStandardMaterial({ color: 0xd4a33a, metalness: 0.9, roughness: 0.3, flatShading: true });
    const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 1.1), new THREE.MeshStandardMaterial({ color: 0x5a3a22, flatShading: true }));
    this.cannon.add(carriage);
    for (const s of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 5, 10), brass);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(s * 0.5, -0.05, 0);
      this.cannon.add(wheel);
    }
    this.barrelPivot = new THREE.Group();
    this.barrelPivot.position.y = 0.3;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.5, 10), metal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.55;
    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 5, 10), brass);
    muzzle.position.z = -1.3;
    this.barrelPivot.add(barrel, muzzle);
    this.cannon.add(this.barrelPivot);
    scene.add(this.cannon);

    // Enemy island
    this.island = new THREE.Group();
    this.islandBase = new THREE.Vector3(0, 0, -10);
    this.island.position.copy(this.islandBase);
    const top = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.3, 5.2), new THREE.MeshStandardMaterial({ map: Mini3D.checkerTexture(5, '#d9c7a4', '#4a3470', 8) }));
    top.position.y = -0.15;
    top.receiveShadow = true;
    const under = new THREE.Mesh(new THREE.ConeGeometry(3.4, 4, 6), new THREE.MeshStandardMaterial({ color: 0x3a2850, flatShading: true }));
    under.rotation.x = Math.PI;
    under.position.y = -2.3;
    this.island.add(top, under);
    scene.add(this.island);

    const count = Math.round(4 + this.hard * 4);
    const cells = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) cells.push([r, c]);
    cells.sort(() => Math.random() - 0.5);
    this.targets = cells.slice(0, count).map(([r, c], i) => {
      const type = i === 0 ? this.enemy.type : (Math.random() < 0.6 ? 'pawn' : ['knight', 'bishop', 'rook'][(Math.random() * 3) | 0]);
      const obj = Pieces3D.create(type, this.enemyColor, 0xb01438);
      obj.scale.setScalar(1.1);
      scene.add(obj);
      return { obj, local: new THREE.Vector3(c - 2, 0, r - 2), down: false, vel: null, spin: null };
    });

    // Aim preview
    this.previewDots = 28;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.previewDots * 3), 3));
    this.preview = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffd166, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.85 }));
    this.preview.frustumCulled = false;
    scene.add(this.preview);

    this.camera.fov = 48;
    this.camera.position.set(0, 3.2, 6.8);
    this.camera.lookAt(0, 0.2, -7);

    this.yaw = 0;
    this.pitch = 0.45;
    this.shots = 4 + (this.isDuel ? 1 : 0) + (this.hard < 0.3 ? 1 : 0);
    this.maxShots = this.shots;
    this.timeLimit = 18 + this.maxShots;
    this.ball = null;
    this.blasts = [];
    this.reload = 0;
    this.botAimAt = null;
    this.botWait = 0.8;
    this.outOfShotsWait = 0;
  }

  _muzzle() {
    const p = new THREE.Vector3(0, 0, -1.35);
    this.barrelPivot.updateWorldMatrix(true, false);
    return p.applyMatrix4(this.barrelPivot.matrixWorld);
  }

  _dir() {
    return new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    );
  }

  onKey(k) {
    if (k === ' ' || k === 'Enter') this._fire();
  }

  onPress() {
    this._fire();
  }

  _aimFromInput(dt) {
    if (this.held('ArrowLeft', 'a')) this.yaw -= dt * 0.7;
    if (this.held('ArrowRight', 'd')) this.yaw += dt * 0.7;
    if (this.held('ArrowUp', 'w')) this.pitch += dt * 0.5;
    if (this.held('ArrowDown', 's')) this.pitch -= dt * 0.5;
    if (!this.keys.size && this.pointer.inside) {
      const ty = (this.pointer.x - 0.5) * 1.1;
      const tp = 0.95 - this.pointer.y * 0.85;
      this.yaw += (ty - this.yaw) * Math.min(1, dt * 12);
      this.pitch += (tp - this.pitch) * Math.min(1, dt * 12);
    }
  }

  _fire() {
    if (this.ball || this.reload > 0 || this.shots <= 0 || this.done) return;
    this.shots--;
    const p = this._muzzle();
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.3, emissive: 0x551100 }));
    mesh.castShadow = true;
    const fuse = Mini3D.glowSprite(0xffb347, 0.9);
    mesh.add(fuse);
    mesh.position.copy(p);
    this.scene.add(mesh);
    this.ball = { mesh, vel: this._dir().multiplyScalar(SiegeCannon.SPEED), life: 4 };
    this.recoil = 1;
    this.burst.spawn(p, [0xffd166, 0xffffff, 0x888888], 18, 4, { gravity: -1, life: 0.5 });
    this.hitFx(0.4, 0xffd166);
    Sfx3D.boom();
  }

  bot(dt) {
    const alive = this.targets.filter(t => !t.down);
    if (!alive.length || this.ball) return;
    if (!this.botAimAt || this.botAimAt.down) {
      this.botAimAt = alive[(Math.random() * alive.length) | 0];
      const err = (10 - this.botSkill) * 0.05;
      this.botErr = { yaw: (Math.random() - 0.5) * err * 0.25, pitch: (Math.random() - 0.5) * err * 0.25 };
      this.botWait = 0.6 + Math.random() * 0.5;
    }
    // Lead a moving island slightly, then solve the low ballistic arc.
    const target = this.botAimAt.obj.position.clone();
    const m = this._muzzle();
    const dx = target.x - m.x, dz = target.z - m.z, dy = target.y + 0.3 - m.y;
    const x = Math.hypot(dx, dz);
    const v = SiegeCannon.SPEED, g = SiegeCannon.G;
    const disc = v ** 4 - g * (g * x * x + 2 * dy * v * v);
    if (disc < 0) return;
    const pitch = Math.atan((v * v - Math.sqrt(disc)) / (g * x));
    const yaw = Math.atan2(dx, -dz);
    this.yaw += (yaw + this.botErr.yaw - this.yaw) * Math.min(1, dt * 5);
    this.pitch += (pitch + this.botErr.pitch - this.pitch) * Math.min(1, dt * 5);
    this.botWait -= dt;
    if (this.botWait <= 0) {
      this._fire();
      this.botAimAt = null;
    }
  }

  tick(dt) {
    if (!this.botControlled) this._aimFromInput(dt);
    this.yaw = Math.max(-0.6, Math.min(0.6, this.yaw));
    this.pitch = Math.max(0.08, Math.min(1.0, this.pitch));
    this.reload = Math.max(0, this.reload - dt);
    this._world(dt);
    this._updatePreview();

    const alive = this.targets.filter(t => !t.down).length;
    if (alive === 0 && !this.done) {
      this.say('ARMY ROUTED!', '#3ee07f');
      this.win();
    } else if (this.shots <= 0 && !this.ball) {
      this.outOfShotsWait += dt;
      // Give the last flying pieces a moment to finish their chain.
      const settling = this.targets.some(t => t.down && t.obj.position.y > -3);
      if (this.outOfShotsWait > 1.2 && !settling) {
        this.say('OUT OF AMMO', '#ff4d6d');
        this.lose();
      }
    }
  }

  afterTick(dt) {
    this._world(dt);
    this.preview.visible = false;
  }

  _updatePreview() {
    const pos = this.preview.geometry.attributes.position;
    const p = this._muzzle();
    const v = this._dir().multiplyScalar(SiegeCannon.SPEED);
    const len = 1.8 * (1 - this.hard * 0.55);
    for (let i = 0; i < this.previewDots; i++) {
      const t = (i / this.previewDots) * len;
      pos.setXYZ(i, p.x + v.x * t, p.y + v.y * t - 0.5 * SiegeCannon.G * t * t, p.z + v.z * t);
    }
    pos.needsUpdate = true;
    this.preview.visible = !this.ball && this.shots > 0;
    this.preview.material.opacity = 0.5 + 0.4 * Math.sin(this.time * 10);
  }

  _world(dt) {
    // Cannon pose
    this.cannon.rotation.y = -this.yaw;
    this.barrelPivot.rotation.x = this.pitch;
    this.recoil = Math.max(0, (this.recoil || 0) - dt * 4);
    this.barrelPivot.position.z = this.recoil * 0.3;

    // Island sway
    const sway = this.hard * 2.2;
    this.island.position.x = this.islandBase.x + Math.sin(this.time * 0.9) * sway;
    this.island.position.y = this.islandBase.y + Math.sin(this.time * 1.7) * 0.25;
    this.island.rotation.y = Math.sin(this.time * 0.5) * 0.15 * this.hard;
    this.island.updateMatrixWorld();

    for (const r of this.rocks) {
      r.rotation.x += r.userData.spin * dt;
      r.rotation.y += r.userData.spin * dt * 0.7;
      r.position.y += Math.sin(this.time + r.position.x) * dt * 0.2;
    }

    for (const t of this.targets) {
      if (!t.down) {
        t.obj.position.copy(t.local).applyMatrix4(this.island.matrixWorld);
        t.obj.rotation.y = this.island.rotation.y;
      } else {
        t.vel.y -= 18 * dt;
        t.obj.position.addScaledVector(t.vel, dt);
        t.obj.rotation.x += t.spin.x * dt;
        t.obj.rotation.z += t.spin.z * dt;
        // Flying pieces bowl over the ones still standing.
        if (t.obj.position.y > -1) {
          for (const o of this.targets) {
            if (o.down || o === t) continue;
            if (o.obj.position.distanceTo(t.obj.position) < 0.7) {
              this._knock(o, t.vel.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, 4, 0)));
            }
          }
        }
      }
    }

    if (this.ball) {
      const b = this.ball;
      b.vel.y -= SiegeCannon.G * dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      b.mesh.rotation.x += dt * 10;
      b.life -= dt;
      if (Math.random() < 0.8) this.burst.spawn(b.mesh.position, [0xffb347, 0x777777], 1, 0.5, { gravity: -0.5, life: 0.4, size: 0.12 });
      const p = b.mesh.position;
      const local = p.clone().applyMatrix4(this.island.matrixWorld.clone().invert());
      const onIsland = Math.abs(local.x) < 2.6 && Math.abs(local.z) < 2.6 && local.y < 0.05 && local.y > -0.6;
      const hitPiece = this.targets.some(t => !t.down && t.obj.position.distanceTo(p) < 0.55 + 0.3 * (p.y - t.obj.position.y < 1 ? 1 : 0));
      if (onIsland || hitPiece) this._explode(p.clone());
      else if (b.life <= 0 || p.y < -12) {
        this.scene.remove(b.mesh);
        Mini3D.disposeScene(b.mesh);
        this.ball = null;
        this.reload = 0.3;
        this.say('MISS', '#a89fd0');
      }
    }

    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const s = this.blasts[i];
      s.t += dt;
      s.sprite.scale.setScalar(1 + s.t * 16);
      s.sprite.material.opacity = Math.max(0, 1 - s.t * 2.2);
      s.ring.scale.setScalar(1 + s.t * 10);
      s.ring.material.opacity = Math.max(0, 1 - s.t * 2.5);
      if (s.t > 0.6) {
        this.scene.remove(s.sprite, s.ring);
        Mini3D.disposeScene(s.sprite);
        Mini3D.disposeScene(s.ring);
        this.blasts.splice(i, 1);
      }
    }
  }

  _knock(t, vel) {
    if (t.down) return;
    t.down = true;
    t.vel = vel;
    t.spin = new THREE.Vector3((Math.random() - 0.5) * 16, 0, (Math.random() - 0.5) * 16);
    this.burst.spawn(t.obj.position.clone().add(new THREE.Vector3(0, 0.5, 0)), [0xff4d6d, 0xffffff], 8, 4, { up: 2 });
  }

  _explode(p) {
    const b = this.ball;
    this.scene.remove(b.mesh);
    Mini3D.disposeScene(b.mesh);
    this.ball = null;
    this.reload = 0.35;

    let knocked = 0;
    for (const t of this.targets) {
      if (t.down) continue;
      const c = t.obj.position.clone().add(new THREE.Vector3(0, 0.4, 0));
      const d = c.distanceTo(p);
      if (d < SiegeCannon.BLAST) {
        const away = c.sub(p).setY(0).normalize().multiplyScalar(7 + Math.random() * 3);
        away.y = 8 + Math.random() * 4;
        this._knock(t, away);
        knocked++;
      }
    }

    const sprite = Mini3D.glowSprite(0xff8a3d, 1);
    sprite.position.copy(p);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 20), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(p);
    this.scene.add(sprite, ring);
    this.blasts.push({ sprite, ring, t: 0 });
    this.burst.spawn(p, [0xffd166, 0xff6a3d, 0xff4d6d, 0x444444], 45, 8, { up: 3, size: 0.18 });
    this.hitFx(knocked ? 1 : 0.6, 0xffb347);
    Sfx3D.boom();
    if (knocked >= 3) this.say(`${knocked}x COMBO!`, '#ffd166');
    else if (knocked === 2) this.say('DOUBLE!', '#ffd166');
    else if (knocked === 0) this.say('CLOSE!', '#a89fd0');
  }

  hud(ctx, x, y, w, h) {
    const alive = this.targets.filter(t => !t.down).length;
    this.hudText(ctx, 'BLAST THEM OFF', x + 16, y + 20, { size: 14, title: true, color: '#ff8a3d' });
    this.hudText(ctx, `ENEMIES ${alive}`, x + w - 100, y + 20, { size: 18, align: 'right', color: alive ? '#ff4d6d' : '#3ee07f' });
    this.hudTimer(ctx, x + w - 16, y + 20);
    for (let i = 0; i < this.maxShots; i++) {
      ctx.beginPath();
      ctx.arc(x + 24 + i * 22, y + 46, 7, 0, Math.PI * 2);
      ctx.fillStyle = i < this.shots ? '#ffd166' : 'rgba(255,255,255,0.18)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    this.hudHint(ctx, 'Aim with the mouse (or arrow keys), click / SPACE to fire');
  }
}
