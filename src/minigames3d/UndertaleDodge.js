// Bullet hell on a chessboard. The enemy piece towers over the arena and
// sprays glowing orbs in rings, spirals and aimed bursts; weave through them
// until it runs out of steam.
class UndertaleDodge extends Game3D {
  constructor() {
    super('Soul Dodge');
  }

  static BOUND = 3.5;

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x05030c);
    this.lights({ hemi: 0.7, keyI: 1.6, rim: 0xff2fb4 });

    const floor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 8), new THREE.MeshStandardMaterial({ map: Mini3D.checkerTexture(8, '#221a3a', '#0e0a1c', 8) }));
    floor.position.y = -0.15;
    scene.add(floor);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    for (const [w, d, x, z] of [[8.2, 0.08, 0, -4.05], [8.2, 0.08, 0, 4.05], [0.08, 8.2, -4.05, 0], [0.08, 8.2, 4.05, 0]]) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), edgeMat);
      e.position.set(x, 0.05, z);
      scene.add(e);
    }

    this.boss = Pieces3D.create(this.enemy.type, this.enemyColor, 0xb01438);
    this.boss.scale.setScalar(2.6);
    this.boss.position.set(0, 0, -5.4);
    scene.add(this.boss);
    this.bossGlow = Mini3D.glowSprite(0xff2fb4, 6);
    this.bossGlow.position.set(0, 2, -5.4);
    scene.add(this.bossGlow);

    this.player = this.playerPiece();
    this.player.scale.setScalar(0.75);
    scene.add(this.player);
    this.soul = Mini3D.glowSprite(0xff4d6d, 0.8);
    scene.add(this.soul);
    this.me = { x: 0, z: 2 };

    this.orbGeo = new THREE.IcosahedronGeometry(0.16, 1);
    this.orbMats = [0xffffff, 0x4cc9f0, 0xffd166, 0xff4d6d].map(c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
    this.bullets = [];

    this.camera.fov = 50;
    this.camera.position.set(0, 9.5, 7);
    this.camera.lookAt(0, 0, -0.9);

    this.duration = 10 + this.hard * 4 + (this.isDuel ? 3 : 0);
    this.maxHp = this.hard > 0.6 ? 2 : 3;
    this.hp = this.maxHp;
    this.invuln = 0;
    this.patternT = 0.3;
    this.spin = 0;
  }

  _shoot(x, z, angle, speed, mat) {
    const m = new THREE.Mesh(this.orbGeo, this.orbMats[mat || 0]);
    m.position.set(x, 0.3, z);
    this.scene.add(m);
    this.bullets.push({ m, vx: Math.sin(angle) * speed, vz: Math.cos(angle) * speed });
  }

  _pattern() {
    const sx = (Math.random() - 0.5) * 5, sz = -4.2;
    const speed = 2.6 + this.hard * 1.6;
    const pick = (Math.random() * 4) | 0;
    this.boss.userData.kick = 1;
    Sfx3D.zap(60 + pick * 4);
    if (pick === 0) {
      // Ring with a gap
      const n = 14 + Math.round(this.hard * 8);
      const gap = Math.random() * n;
      for (let i = 0; i < n; i++) if (Math.abs(i - gap) > 1.5) this._shoot(sx, sz, (i / n) * Math.PI * 2, speed * 0.8, 1);
    } else if (pick === 1) {
      // Aimed triple
      const a = Math.atan2(this.me.x - sx, this.me.z - sz);
      for (let i = -1; i <= 1; i++) this._shoot(sx, sz, a + i * 0.22, speed * 1.2, 3);
    } else if (pick === 2) {
      // Spiral burst over time
      this.spiral = { t: 0, n: 16 + Math.round(this.hard * 10), x: sx, z: sz, i: 0 };
    } else {
      // Rain across the board
      const col = (Math.random() * 3) | 0;
      for (let i = 0; i < 8; i++) {
        if (i % 3 === col) continue;
        this._shoot(-3.5 + i + 0.5, -4.2, 0, speed * 0.9, 2);
      }
    }
  }

  bot(dt) {
    this._botDangers = this.bullets.map(b => ({ x: b.m.position.x + b.vx * 0.25, z: b.m.position.z + b.vz * 0.25, r: 0.3, w: 1.4 }));
  }

  tick(dt) {
    this.moveActor(dt, this.me, { speed: 4.5, bound: UndertaleDodge.BOUND, dangers: this._botDangers });
    this.player.position.set(this.me.x, 0, this.me.z);
    this.soul.position.set(this.me.x, 0.35, this.me.z);
    if (this.me.facing != null) this.player.rotation.y = this.me.facing;
    this.invuln = Math.max(0, this.invuln - dt);
    this.player.visible = this.invuln <= 0 || Math.floor(this.time * 20) % 2 === 0;

    const calm = this.time > this.duration - 1.2;
    this.patternT -= dt;
    if (this.patternT <= 0 && !calm) {
      this._pattern();
      this.patternT = Math.max(0.55, 1.3 - this.hard * 0.5 - this.time * 0.02);
    }
    if (this.spiral) {
      const s = this.spiral;
      s.t += dt;
      while (s.i < s.n && s.t > s.i * 0.05) {
        this._shoot(s.x, s.z, s.i * 0.5 + this.spin, 2.8 + this.hard, 0);
        s.i++;
      }
      if (s.i >= s.n) this.spiral = null;
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.m.position.x += b.vx * dt;
      b.m.position.z += b.vz * dt;
      const p = b.m.position;
      if (this.invuln <= 0 && Math.hypot(p.x - this.me.x, p.z - this.me.z) < 0.32) {
        this.hp--;
        this.invuln = 1.1;
        this.hitFx(0.9, 0xff4d6d);
        this.burst.spawn(p.clone(), [0xff4d6d, 0xffffff], 24, 5, { up: 2 });
        Sfx3D.hit();
        this.scene.remove(b.m);
        this.bullets.splice(i, 1);
        if (this.hp <= 0) { this.say('SHATTERED', '#ff4d6d'); this.lose(); return; }
        this.say('HIT!', '#ffb347');
        continue;
      }
      if (Math.abs(p.x) > 6 || p.z > 6 || p.z < -8) {
        this.scene.remove(b.m);
        this.bullets.splice(i, 1);
      }
    }
    this._animate(dt);
    if (this.time >= this.duration) {
      this.say('SURVIVED!', '#3ee07f');
      for (const b of this.bullets) {
        this.burst.spawn(b.m.position, [0xffffff], 2, 2, { gravity: 0 });
        this.scene.remove(b.m);
      }
      this.bullets = [];
      this.win();
    }
  }

  _animate(dt) {
    this.spin += dt * 0.8;
    const k = this.boss.userData.kick || 0;
    this.boss.userData.kick = Math.max(0, k - dt * 3);
    this.boss.scale.setScalar(2.6 + k * 0.4);
    this.boss.rotation.y += dt * (0.5 + k * 6);
    this.bossGlow.material.opacity = 0.5 + k * 0.5;
    this.tint = this.hp === 1 && !this.done ? 0.2 : 0;
  }

  afterTick(dt) {
    this._animate(dt);
    if (this.winner === 'attacker') this.boss.position.y -= dt * 3;
  }

  cleanup() {
    this.orbGeo.dispose();
    for (const m of this.orbMats) m.dispose();
    super.cleanup();
  }

  hud(ctx, x, y, w, h) {
    this.hudText(ctx, 'SURVIVE', x + 16, y + 20, { size: 14, title: true, color: '#ff4d6d' });
    this.hudBar(ctx, x + 110, y + 12, w - 250, 16, this.time / this.duration, '#3ee07f');
    this.hudHearts(ctx, x + w - 16 - this.maxHp * 22, y + 21, this.hp, this.maxHp);
    this.hudHint(ctx, 'Move with the mouse or WASD / arrow keys');
  }
}
