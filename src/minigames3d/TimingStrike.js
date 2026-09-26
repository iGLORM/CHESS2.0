// Your piece stands in the middle of an arena with a giant hammer. The enemy
// sprints laps around it; slam the hammer down when it crosses the glowing
// strike zone.
class TimingStrike extends Game3D {
  constructor() {
    super('Timing Strike');
  }

  static R = 3.4;

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x1a0d12);
    scene.fog = new THREE.Fog(0x1a0d12, 14, 30);
    this.lights({ sky: 0xffd9b0, ground: 0x3a1010, keyI: 2.4, shadows: true, shadowSize: 6, rim: 0xff6a3d });

    // Colosseum floor and walls
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.4, 24), new THREE.MeshStandardMaterial({ map: Mini3D.checkerTexture(10, '#c9a877', '#7a5a3a', 4), flatShading: true }));
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    scene.add(floor);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, flatShading: true });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2 + (i % 2) * 0.6, 0.5), wallMat);
      col.position.set(Math.cos(a) * 5.6, 1, Math.sin(a) * 5.6);
      col.castShadow = true;
      scene.add(col);
      if (i % 4 === 2) {
        const torch = Mini3D.glowSprite(0xff8a3d, 1.6);
        torch.position.set(Math.cos(a) * 5.6, 2.5, Math.sin(a) * 5.6);
        scene.add(torch);
      }
    }
    // Track ring
    const track = new THREE.Mesh(new THREE.RingGeometry(TimingStrike.R - 0.45, TimingStrike.R + 0.45, 48), new THREE.MeshBasicMaterial({ color: 0x2a1a10, transparent: true, opacity: 0.5 }));
    track.rotation.x = -Math.PI / 2;
    track.position.y = 0.01;
    scene.add(track);

    // Strike zone in front of the camera
    this.zoneAngle = Math.PI / 2;
    this.zoneWidth = 0.55 - this.hard * 0.28;
    this.zone = new THREE.Mesh(new THREE.RingGeometry(TimingStrike.R - 0.5, TimingStrike.R + 0.5, 12, 1, this.zoneAngle - this.zoneWidth / 2, this.zoneWidth), new THREE.MeshBasicMaterial({ color: 0x3ee07f, transparent: true, opacity: 0.6, toneMapped: false, side: THREE.DoubleSide }));
    this.zone.rotation.x = Math.PI / 2;
    this.zone.position.y = 0.03;
    scene.add(this.zone);
    const perfect = new THREE.Mesh(new THREE.RingGeometry(TimingStrike.R - 0.5, TimingStrike.R + 0.5, 4, 1, this.zoneAngle - 0.06, 0.12), new THREE.MeshBasicMaterial({ color: 0xffd166, toneMapped: false, side: THREE.DoubleSide }));
    perfect.rotation.x = Math.PI / 2;
    perfect.position.y = 0.04;
    scene.add(perfect);

    // Player + hammer
    this.player = this.playerPiece();
    this.player.scale.setScalar(1.2);
    scene.add(this.player);
    this.arm = new THREE.Group();
    this.arm.position.y = 1.1;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, TimingStrike.R, 6), new THREE.MeshStandardMaterial({ color: 0x6a4020 }));
    handle.rotation.z = Math.PI / 2;
    handle.position.x = TimingStrike.R / 2;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 1.1), new THREE.MeshStandardMaterial({ color: 0x9a9ab0, metalness: 0.8, roughness: 0.3, flatShading: true }));
    head.position.x = TimingStrike.R;
    head.castShadow = true;
    this.arm.add(handle, head);
    this.arm.rotation.y = -this.zoneAngle;
    scene.add(this.arm);

    this.enemy3D = Pieces3D.create(this.enemy.type, this.enemyColor, 0xb01438);
    scene.add(this.enemy3D);

    this.camera.fov = 50;
    this.camera.position.set(0, 7, 8.5);
    this.camera.lookAt(0, 0, 0.8);

    this.angle = Math.random() * Math.PI * 2;
    this.speed = 2.6 + this.hard * 2.2;
    this.dir = 1;
    this.strikes = this.isDuel ? 5 : 3;
    this.used = 0;
    this.hits = 0;
    this.need = Math.ceil(this.strikes * 0.6);
    this.timeLimit = this.strikes * 4 + 4;
    this.swing = 0;
    this.stun = 0;
    this.flying = null;
    this.botWait = 0;
  }

  _diff() {
    let d = (this.angle - this.zoneAngle) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  _strike() {
    if (this.done || this.swing > 0 || this.stun > 0 || this.flying) return;
    this.used++;
    this.swing = 0.22;
    const d = Math.abs(this._diff());
    const zx = Math.cos(this.zoneAngle) * TimingStrike.R, zz = Math.sin(this.zoneAngle) * TimingStrike.R;
    if (d < this.zoneWidth / 2 + 0.05) {
      this.hits++;
      const perfect = d < 0.08;
      this.flying = { v: new THREE.Vector3(Math.cos(this.angle) * 6, 12, Math.sin(this.angle) * 6), t: 0 };
      this.burst.spawn(new THREE.Vector3(zx, 0.5, zz), [0xffd166, 0xff6a3d, 0xffffff], perfect ? 50 : 30, perfect ? 9 : 6, { up: 4, size: 0.16 });
      this.hitFx(perfect ? 1 : 0.7, 0xffd166);
      Sfx3D.boom();
      this.say(perfect ? 'PERFECT!' : 'SMASH!', perfect ? '#ffd166' : '#3ee07f');
    } else {
      this.stun = 0.5;
      this.burst.spawn(new THREE.Vector3(zx, 0.1, zz), [0x9a7a5a, 0x5a4a3a], 14, 3, { up: 2 });
      this.shake = 0.4;
      Sfx3D.thud();
      this.say('MISS', '#ff4d6d');
    }
    this._checkEnd();
  }

  _checkEnd() {
    const left = this.strikes - this.used;
    if (this.hits >= this.need) this.pendingEnd = 'win';
    else if (this.hits + left < this.need) this.pendingEnd = 'lose';
  }

  onKey(k) {
    if (k === ' ' || k === 'Enter') this._strike();
  }

  onPress() {
    this._strike();
  }

  bot(dt) {
    const tol = 0.08 + (10 - this.botSkill) * 0.05;
    if (Math.abs(this._diff()) < tol && Math.random() < 0.6) this._strike();
  }

  tick(dt) {
    this.stun = Math.max(0, this.stun - dt);
    if (this.flying) {
      const f = this.flying;
      f.t += dt;
      f.v.y -= 25 * dt;
      this.enemy3D.position.addScaledVector(f.v, dt);
      this.enemy3D.rotation.x += dt * 12;
      if (f.t > 0.9) {
        this.flying = null;
        this.enemy3D.rotation.set(0, 0, 0);
        this.angle = this.zoneAngle + Math.PI + (Math.random() - 0.5);
        this.speed *= 1.15;
        if (Math.random() < 0.5) this.dir *= -1;
        if (this.pendingEnd) this._finish();
      }
    } else {
      if (this.pendingEnd && this.swing <= 0) { this._finish(); return; }
      // Sprints, with sudden reversals at higher difficulty.
      const surge = 1 + Math.sin(this.time * 3) * 0.25 * this.hard;
      this.angle += this.dir * this.speed * surge * dt;
      if (this.hard > 0.4 && Math.random() < dt * 0.4 * this.hard) this.dir *= -1;
      this.enemy3D.position.set(Math.cos(this.angle) * TimingStrike.R, Math.abs(Math.sin(this.time * 14)) * 0.15, Math.sin(this.angle) * TimingStrike.R);
      this.enemy3D.rotation.y = -this.angle - this.dir * Math.PI / 2;
    }
    this._animate(dt);
  }

  _finish() {
    if (this.pendingEnd === 'win') { this.say('KNOCKOUT!', '#3ee07f'); this.win(); }
    else { this.say('TOO SLOW!', '#ff4d6d'); this.lose(); }
  }

  _animate(dt) {
    if (this.swing > 0) this.swing = Math.max(0, this.swing - dt);
    // Hammer: raised while waiting, slams down during a swing.
    const k = this.swing > 0 ? Math.sin((1 - this.swing / 0.22) * Math.PI) : 0;
    this.arm.rotation.z = this.swing > 0 ? 0.9 - k * 1.1 : 0.9 + Math.sin(this.time * 3) * 0.05 - (this.stun > 0 ? 0.9 : 0);
    this.zone.material.opacity = 0.35 + 0.3 * Math.sin(this.time * 8) + (Math.abs(this._diff()) < this.zoneWidth / 2 ? 0.3 : 0);
    this.player.rotation.y = Math.sin(this.time * 2) * 0.2;
  }

  afterTick(dt) {
    if (this.flying) {
      this.flying.v.y -= 25 * dt;
      this.enemy3D.position.addScaledVector(this.flying.v, dt);
    }
    this._animate(dt);
  }

  hud(ctx, x, y, w, h) {
    this.hudText(ctx, 'SMASH IN THE GREEN ZONE', x + 16, y + 20, { size: 14, title: true, color: '#3ee07f' });
    for (let i = 0; i < this.strikes; i++) {
      const hit = i < this.used ? (i < this.hits ? '#3ee07f' : '#ff4d6d') : 'rgba(255,255,255,0.2)';
      ctx.fillStyle = hit;
      MiniGameUtils.roundRect(ctx, x + 16 + i * 26, y + 38, 20, 12, 4);
      ctx.fill();
    }
    this.hudText(ctx, `HITS ${this.hits}/${this.need}`, x + w - 100, y + 22, { size: 18, align: 'right', color: '#ffd166' });
    this.hudTimer(ctx, x + w - 16, y + 22);
    this.hudHint(ctx, 'Click or press SPACE when the enemy is in the green zone');
  }
}
