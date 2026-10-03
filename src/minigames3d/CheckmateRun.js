// Endless-runner down a neon checkerboard highway. The attacker's army
// charges at you: switch lanes around the pieces, jump the low barriers,
// survive until the timer runs out.
class CheckmateRun extends Game3D {
  constructor() {
    super('Checkmate Run');
  }

  static LANES = [-1.6, 0, 1.6];
  static SPAWN_Z = -80;

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x0b0620);
    scene.fog = new THREE.Fog(0x0b0620, 30, 95);
    this.lights({ hemi: 0.9, keyI: 1.8 });

    // Road
    this.roadTex = Mini3D.checkerTexture(2, '#3b2d6b', '#150d2e', 8);
    this.roadTex.wrapS = this.roadTex.wrapT = THREE.RepeatWrapping;
    this.roadTex.repeat.set(1.5, 62.5);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 200), new THREE.MeshStandardMaterial({ map: this.roadTex, roughness: 0.35, metalness: 0.2 }));
    road.rotation.x = -Math.PI / 2;
    road.position.z = -90;
    scene.add(road);

    // Neon rails and the void below
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 200), new THREE.MeshBasicMaterial({ color: 0x4cc9f0, toneMapped: false }));
      rail.position.set(side * 2.46, 0.06, -90);
      scene.add(rail);
    }
    const grid = new THREE.GridHelper(400, 80, 0xff2fb4, 0x5a1a7a);
    grid.position.y = -6;
    scene.add(grid);
    this.grid = grid;

    // Arches that rush past
    this.arches = [];
    const archMat = new THREE.MeshBasicMaterial({ color: 0xc0208a, toneMapped: false });
    for (let i = 0; i < 7; i++) {
      const arch = new THREE.Group();
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4, 0.18), archMat);
      l.position.set(-3, 2, 0);
      const r = l.clone();
      r.position.x = 3;
      const top = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.18, 0.18), archMat);
      top.position.y = 4;
      arch.add(l, r, top);
      arch.position.z = -i * 12;
      scene.add(arch);
      this.arches.push(arch);
    }

    // Big synthwave sun
    const sun = new THREE.Mesh(new THREE.CircleGeometry(16, 24), new THREE.MeshBasicMaterial({ color: 0xff6a3d, fog: false, toneMapped: false }));
    sun.position.set(0, 9, -150);
    scene.add(sun);
    const sunGlow = Mini3D.glowSprite(0xff2fb4, 70);
    sunGlow.material.fog = false;
    sunGlow.position.set(0, 9, -152);
    scene.add(sunGlow);
    const stars = Mini3D.starfield(300, 180, 0xffffff);
    stars.material.fog = false;
    scene.add(stars);

    // Player
    this.player = this.playerPiece();
    this.player.rotation.y = Math.PI;
    this.player.scale.setScalar(1.3);
    scene.add(this.player);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 20), new THREE.MeshBasicMaterial({ color: 0x3ee07f, toneMapped: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    this.ring = ring;
    scene.add(ring);
    this.trail = Mini3D.glowSprite(0x3ee07f, 0.9);
    scene.add(this.trail);

    this.camera.fov = 68;
    this.camera.position.set(0, 2.1, 3.9);
    this.camera.lookAt(0, 0.9, -8);

    this.lane = 1;
    this.px = 0;
    this.py = 0;
    this.vy = 0;
    this.speed = 16 + this.hard * 10;
    this.duration = 11 + this.hard * 3 + (this.isDuel ? 3 : 0);
    this.maxHearts = this.hard > 0.7 ? 1 : 2;
    this.hearts = this.maxHearts;
    this.invuln = 0;
    this.obstacles = [];
    this.spawnTimer = 0.6;
    this.dodged = 0;
    this.botPlan = null;
    this.finishing = 0;
  }

  _spawnRow() {
    const lanes = [0, 1, 2];
    // Every other row blocks the lane you are in, so standing still never works.
    this.rows = (this.rows || 0) + 1;
    const camp = this.rows % 2 === 0;
    const freeLanes = camp ? lanes.filter(l => l !== this.lane) : lanes;
    const free = freeLanes[(Math.random() * freeLanes.length) | 0];
    const blockedCount = camp || Math.random() < 0.35 + this.hard * 0.4 ? 2 : 1;
    const others = lanes.filter(l => l !== free).sort(() => Math.random() - 0.5).slice(0, blockedCount);
    // Sometimes the "free" lane gets a low barrier too, forcing a jump.
    const rowLanes = others.map(l => ({ lane: l, low: Math.random() < 0.3 }));
    if (Math.random() < 0.25 + this.hard * 0.25) rowLanes.push({ lane: free, low: true });

    for (const { lane, low } of rowLanes) {
      let obj;
      if (low) {
        obj = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 0.35), new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff6a00, emissiveIntensity: 0.9, flatShading: true }));
        obj.position.y = 0.225;
      } else {
        obj = Pieces3D.create(this.enemy.type, this.enemyColor, 0xd01840);
        obj.scale.setScalar(1.35);
        const aura = Mini3D.glowSprite(0xff2050, 2.2);
        aura.position.y = 0.5;
        obj.add(aura);
      }
      obj.position.x = CheckmateRun.LANES[lane];
      obj.position.z = CheckmateRun.SPAWN_Z;
      this.scene.add(obj);
      this.obstacles.push({ obj, lane, low, hit: false, vel: null, spin: null });
    }
  }

  onKey(k) {
    if (k === 'ArrowLeft' || k === 'a') this._move(-1);
    else if (k === 'ArrowRight' || k === 'd') this._move(1);
    else if (k === 'ArrowUp' || k === 'w' || k === ' ') this._jump();
  }

  onPress() {
    if (this.pointer.x < 0.33) this._move(-1);
    else if (this.pointer.x > 0.67) this._move(1);
    else this._jump();
  }

  _move(d) {
    const next = Math.max(0, Math.min(2, this.lane + d));
    if (next !== this.lane) {
      this.lane = next;
      Sfx3D.whoosh();
    }
  }

  _jump() {
    if (this.py > 0.01) return;
    this.vy = 7.8;
    Sfx3D.blip(72);
  }

  bot(dt) {
    const reaction = 0.55 - this.botSkill * 0.035;
    const horizon = this.speed * (reaction + 0.25);
    const ahead = this.obstacles.filter(o => !o.hit && o.obj.position.z < -0.4 && o.obj.position.z > -horizon);
    if (!ahead.length) return;
    const nearZ = Math.max(...ahead.map(o => o.obj.position.z));
    const row = ahead.filter(o => Math.abs(o.obj.position.z - nearZ) < 1);
    const cost = l => {
      const o = row.find(r => r.lane === l);
      return !o ? 0 : o.low ? 1 : 10;
    };
    if (this.botPlan !== nearZ) {
      this.botPlan = nearZ;
      // Weaker bots sometimes misread a row.
      this.botBlunder = Math.random() < (10 - this.botSkill) * 0.025;
    }
    if (this.botBlunder) return;
    const best = [0, 1, 2].sort((a, b) => cost(a) - cost(b) || Math.abs(a - this.lane) - Math.abs(b - this.lane))[0];
    if (best !== this.lane) this._move(Math.sign(best - this.lane));
    const here = row.find(r => r.lane === this.lane);
    if (here && here.low && nearZ > -this.speed * 0.22) this._jump();
  }

  tick(dt) {
    const t = this.time;
    const progress = Math.min(1, t / this.duration);
    const speed = this.speed * (1 + progress * 0.45);
    this.warp = 0.15 + progress * 0.35;
    this.camera.fov = 68 + progress * 14;
    this.camera.updateProjectionMatrix();

    // Scenery scroll
    this.roadTex.offset.y += (speed * dt / 1.6) * 0.5;
    this.grid.position.z = (this.grid.position.z + speed * dt) % 5;
    for (const a of this.arches) {
      a.position.z += speed * dt;
      if (a.position.z > 6) a.position.z -= 84;
    }

    // Player
    const targetX = CheckmateRun.LANES[this.lane];
    this.px += (targetX - this.px) * Math.min(1, dt * 16);
    this.vy -= 22 * dt;
    this.py = Math.max(0, this.py + this.vy * dt);
    if (this.py === 0) this.vy = Math.max(0, this.vy);
    this.player.position.set(this.px, this.py, 0);
    this.player.rotation.z = (targetX - this.px) * -0.25;
    this.player.rotation.x = this.py > 0 ? -0.3 : Math.sin(t * 20) * 0.04;
    this.ring.position.x = this.px;
    this.ring.scale.setScalar(1 - Math.min(0.5, this.py * 0.2));
    this.trail.position.set(this.px, 0.15 + this.py, -0.4);
    this.invuln = Math.max(0, this.invuln - dt);
    this.player.visible = this.invuln <= 0 || Math.floor(t * 20) % 2 === 0;

    // Obstacles
    if (t < this.duration - 1.2) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this._spawnRow();
        this.spawnTimer = Math.max(0.5, 1.05 - this.hard * 0.35 - progress * 0.25);
      }
    }
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      if (o.vel) {
        o.vel.y -= 25 * dt;
        o.obj.position.addScaledVector(o.vel, dt);
        o.obj.rotation.x += o.spin.x * dt;
        o.obj.rotation.z += o.spin.z * dt;
      } else {
        o.obj.position.z += speed * dt;
        if (!o.low) o.obj.rotation.y += dt * 2;
      }
      const z = o.obj.position.z;
      if (!o.hit && Math.abs(z) < 0.55 && Math.abs(o.obj.position.x - this.px) < 0.85) {
        const clear = o.low && this.py > 0.5;
        if (!clear) this._crash(o);
      }
      if (!o.hit && !o.passed && z > 0.6) {
        o.passed = true;
        this.dodged++;
      }
      if (z > 8 || o.obj.position.y < -20) {
        this.scene.remove(o.obj);
        Mini3D.disposeScene(o.obj);
        this.obstacles.splice(i, 1);
      }
    }

    if (t >= this.duration) {
      this.say('ESCAPED!', '#3ee07f');
      this.win();
    }
  }

  _crash(o) {
    o.hit = true;
    if (this.invuln > 0) return;
    // The obstacle gets launched off the road either way.
    o.vel = new THREE.Vector3((Math.random() - 0.5) * 10, 9, -6);
    o.spin = new THREE.Vector3(8 + Math.random() * 6, 0, (Math.random() - 0.5) * 12);
    this.burst.spawn(new THREE.Vector3(this.px, 0.6, 0), [0xff4d6d, 0xffb347, 0xffffff], 40, 9, { up: 3, size: 0.16 });
    Sfx3D.boom();
    this.hitFx(1, 0xff4d6d);
    this.hearts--;
    this.invuln = 1.1;
    if (this.hearts <= 0) {
      this.say('CAUGHT!', '#ff4d6d');
      this.lose();
    } else {
      this.say('OUCH!', '#ffb347');
    }
  }

  afterTick(dt) {
    // Winner sprints away down the road; loser tumbles.
    if (this.winner === 'attacker') {
      this.player.position.z -= dt * 30;
      this.player.position.y = Math.abs(Math.sin(this.time * 12)) * 0.4;
    } else {
      this.player.rotation.x += dt * 8;
      this.player.position.y += dt * 2;
    }
    for (const o of this.obstacles) if (o.vel) {
      o.vel.y -= 25 * dt;
      o.obj.position.addScaledVector(o.vel, dt);
    }
  }

  hud(ctx, x, y, w, h) {
    const k = Math.min(1, this.time / this.duration);
    this.hudText(ctx, 'SURVIVE', x + 16, y + 20, { size: 14, title: true, color: '#4cc9f0' });
    this.hudBar(ctx, x + 110, y + 12, w - 230, 16, k, '#3ee07f');
    this.hudHearts(ctx, x + w - 100, y + 21, this.hearts, this.maxHearts);
    this.hudHint(ctx, '← → switch lane   ↑ / SPACE jump   (or click left / middle / right)');
  }
}
