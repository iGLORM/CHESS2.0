// High-noon duel. Two pieces face off in the desert; wait for the bell,
// then draw faster than your opponent. Draw early and you forfeit the round.
class ReactionTest extends Game3D {
  constructor() {
    super('Quick Draw');
  }

  setup() {
    const scene = this.scene;
    this.sky = new THREE.Color(0xff9a5a);
    scene.background = this.sky;
    scene.fog = new THREE.Fog(0xffb07a, 18, 60);
    this.lights({ sky: 0xffd0a0, ground: 0x8a4a2a, key: 0xffc080, keyI: 2.8, rim: 0xff5a3a, shadows: true, shadowSize: 8 });

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120, 40, 40), new THREE.MeshStandardMaterial({ color: 0xd99a5a, flatShading: true }));
    const pos = ground.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      if (Math.abs(x) > 8 || Math.abs(y) > 8) pos.setZ(i, Math.random() * 1.2 + Math.max(0, Math.abs(y) - 20) * 0.3);
    }
    ground.geometry.computeVertexNormals();
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const sun = new THREE.Mesh(new THREE.CircleGeometry(6, 20), new THREE.MeshBasicMaterial({ color: 0xfff0b0, fog: false, toneMapped: false }));
    sun.position.set(0, 4, -55);
    scene.add(sun);
    // Mesas and cacti
    const rock = new THREE.MeshStandardMaterial({ color: 0xb05a3a, flatShading: true });
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(2 + Math.random() * 3, 3 + Math.random() * 3, 4 + Math.random() * 6, 6), rock);
      m.position.set((Math.random() - 0.5) * 80, 2, -30 - Math.random() * 20);
      scene.add(m);
    }
    const cactusMat = new THREE.MeshStandardMaterial({ color: 0x3a8a4a, flatShading: true });
    for (const [x, z] of [[-6, -4], [7, -6], [-9, 2], [9, 3]]) {
      const c = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 0.4), cactusMat);
      trunk.position.y = 1.1;
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), cactusMat);
      armL.position.set(-0.4, 1.4, 0);
      c.add(trunk, armL);
      c.position.set(x, 0, z);
      c.castShadow = true;
      scene.add(c);
    }
    this.weed = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), new THREE.MeshStandardMaterial({ color: 0x9a7a4a, wireframe: true }));
    scene.add(this.weed);

    this.player = this.playerPiece();
    this.player.scale.setScalar(1.8);
    this.player.position.set(-3, 0, 0);
    this.player.rotation.y = Math.PI / 2;
    this.rival = Pieces3D.create(this.enemy.type, this.enemyColor, 0xb01438);
    this.rival.scale.setScalar(1.8);
    this.rival.position.set(3, 0, 0);
    this.rival.rotation.y = -Math.PI / 2;
    scene.add(this.player, this.rival);
    this.muzzle = Mini3D.glowSprite(0xfff0a0, 2);
    this.muzzle.material.opacity = 0;
    scene.add(this.muzzle);

    this.camera.fov = 40;
    this.rounds = this.isDuel ? 5 : 3;
    this.need = Math.ceil(this.rounds / 2);
    this.won = 0;
    this.lost = 0;
    this.enemyTime = 0.58 - this.hard * 0.18;
    this.times = [];
    this._round();
  }

  _round() {
    this.state = 'wait';
    this.waitFor = 1.4 + Math.random() * 2.6;
    this.t = 0;
    this.drawAt = 0;
    this.enemyAt = this.enemyTime * (0.85 + Math.random() * 0.35);
    this.botAt = 0.19 + (10 - this.botSkill) * 0.045 + Math.random() * 0.08;
    this.player.rotation.set(0, Math.PI / 2, 0);
    this.rival.rotation.set(0, -Math.PI / 2, 0);
    this.player.position.set(-3, 0, 0);
    this.rival.position.set(3, 0, 0);
    this.weedX = -12;
  }

  _fire() {
    if (this.done) return;
    if (this.state === 'wait') {
      this.lost++;
      this.state = 'result';
      this.t = 0;
      this.say('TOO SOON!', '#ff4d6d');
      Sfx3D.thud();
      this.shake = 0.3;
      this._shoot(this.rival, this.player);
      return;
    }
    if (this.state !== 'draw') return;
    const rt = this.t;
    this.times.push(rt);
    this.won++;
    this.state = 'result';
    this.t = 0;
    this.say(`${Math.round(rt * 1000)} ms!`, '#3ee07f');
    this._shoot(this.player, this.rival);
  }

  _shoot(from, to) {
    this.muzzle.position.copy(from.position).add(new THREE.Vector3(Math.sign(to.position.x - from.position.x) * 0.6, 0.9, 0));
    this.muzzle.material.opacity = 1;
    this.burst.spawn(this.muzzle.position, [0xfff0a0, 0xffffff], 12, 5, { gravity: 0, life: 0.3 });
    this.burst.spawn(to.position.clone().add(new THREE.Vector3(0, 0.9, 0)), [0xff4d6d, 0xffffff, 0xd99a5a], 30, 6, { up: 3, size: 0.16 });
    this.victim = to;
    this.victimV = new THREE.Vector3(Math.sign(to.position.x) * 5, 6, 0);
    this.victimSpin = -Math.sign(to.position.x);
    this.hitFx(0.8, 0xfff0a0);
    Sfx3D.boom();
  }

  onKey(k) {
    if (k === ' ' || k === 'Enter') this._fire();
  }

  onPress() {
    this._fire();
  }

  bot() {
    if (this.state === 'draw' && this.t >= this.botAt) this._fire();
  }

  tick(dt) {
    this.t += dt;
    if (this.state === 'wait') {
      if (this.t >= this.waitFor) {
        this.state = 'draw';
        this.t = 0;
        this.flash = 0.5;
        this.flashColor = 0xffffff;
        this.say('DRAW!', '#ffffff');
        Sfx3D.ding(96);
        Sfx3D.ding(84);
      }
    } else if (this.state === 'draw') {
      if (this.t >= this.enemyAt) {
        this.lost++;
        this.state = 'result';
        this.t = 0;
        this.say('TOO SLOW', '#ff4d6d');
        this._shoot(this.rival, this.player);
      }
    } else if (this.state === 'result' && this.t > 1.4) {
      if (this.won >= this.need) { this.say('FASTEST GUN!', '#3ee07f'); this.win(); }
      else if (this.lost > this.rounds - this.need) { this.say('SHOT DOWN', '#ff4d6d'); this.lose(); }
      else this._round();
    }
    this._animate(dt);
  }

  afterTick(dt) {
    this.t += dt;
    this._animate(dt);
  }

  _animate(dt) {
    this.muzzle.material.opacity = Math.max(0, this.muzzle.material.opacity - dt * 5);
    if (this.victim && this.state !== 'wait' && this.state !== 'draw') {
      this.victimV.y -= 20 * dt;
      this.victim.position.addScaledVector(this.victimV, dt);
      if (this.victim.position.y < 0) { this.victim.position.y = 0; this.victimV.set(0, 0, 0); }
      const z = this.victim.rotation.z + this.victimSpin * dt * 8;
      this.victim.rotation.z = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, z));
    } else this.victim = null;
    // Tumbleweed rolls through during the standoff.
    this.weedX += dt * 3;
    this.weed.position.set(this.weedX, 0.4 + Math.abs(Math.sin(this.time * 4)) * 0.4, 3);
    this.weed.rotation.z -= dt * 6;
    // Camera: wide shot, slow push in while waiting, snap close on the draw.
    const tense = this.state === 'wait' ? Math.min(1, this.t / this.waitFor) : this.state === 'draw' ? 1 : 0.3;
    const dist = 11 - tense * 2.5;
    this.camera.position.set(Math.sin(this.time * 0.2) * 1.5, 1.6 + tense * 0.3, dist);
    this.camera.lookAt(0, 1, 0);
    this.sky.setRGB(1, 0.6 - tense * 0.15, 0.35 - tense * 0.15);
    this.scene.fog.color.copy(this.sky);
    this.tint = this.state === 'draw' ? 0.25 : 0;
  }

  hud(ctx, x, y, w, h) {
    this.hudText(ctx, this.state === 'draw' ? 'DRAW! DRAW! DRAW!' : 'WAIT FOR THE BELL...', x + 16, y + 20, { size: 14, title: true, color: this.state === 'draw' ? '#ffffff' : '#ffd166' });
    for (let i = 0; i < this.rounds; i++) {
      const c = i < this.won ? '#3ee07f' : i < this.won + this.lost ? '#ff4d6d' : 'rgba(255,255,255,0.25)';
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + 24 + i * 22, y + 46, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    this.hudText(ctx, `WIN ${this.need} ROUNDS`, x + w - 16, y + 20, { size: 16, align: 'right', color: '#f4f0ff' });
    this.hudHint(ctx, 'Click or press SPACE the moment you see DRAW');
  }
}
