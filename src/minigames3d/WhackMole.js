// Whack-a-pawn. Enemy pieces pop out of the holes in the board; flatten
// them with the mallet. Leave your own pieces (green halo) alone.
class WhackMole extends Game3D {
  constructor() {
    super('Whack-a-Pawn');
  }

  static KEYS = [['q', '7'], ['w', '8'], ['e', '9'], ['a', '4'], ['s', '5'], ['d', '6'], ['z', '1'], ['x', '2'], ['c', '3']];

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x0c1a14);
    scene.fog = new THREE.Fog(0x0c1a14, 12, 28);
    this.lights({ sky: 0xd0ffe0, ground: 0x1a3a2a, keyI: 2.4, shadows: true, shadowSize: 5, rim: 0xffd166 });

    const box = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1, 6.4), new THREE.MeshStandardMaterial({ map: Mini3D.themeChecker(8, 8), flatShading: true }));
    box.position.y = -0.5;
    box.receiveShadow = true;
    scene.add(box);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x050805 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, flatShading: true });
    this.holes = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const x = (c - 1) * 2, z = (r - 1) * 2;
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16), holeMat);
        hole.rotation.x = -Math.PI / 2;
        hole.position.set(x, 0.01, z);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 4, 16), rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(x, 0.02, z);
        scene.add(hole, rim);
        this.holes.push({ x, z, mole: null, cool: Math.random() * 0.8 });
      }
    }

    this.mallet = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 6), new THREE.MeshStandardMaterial({ color: 0x8a5a2a }));
    handle.position.y = 0.9;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.9, 10), new THREE.MeshStandardMaterial({ color: 0xff4d6d, flatShading: true }));
    head.rotation.z = Math.PI / 2;
    head.position.y = 1.8;
    this.mallet.add(handle, head);
    this.malletPivot = new THREE.Group();
    this.malletPivot.add(this.mallet);
    this.mallet.position.set(0, 0, 0);
    scene.add(this.malletPivot);
    this.malletPos = new THREE.Vector3(0, 0, 0);

    this.camera.fov = 48;
    this.camera.position.set(0, 7.4, 5.6);
    this.camera.lookAt(0, 0, 0.3);

    this.goal = Math.round(8 + this.hard * 6 + (this.isDuel ? 2 : 0));
    this.whacked = 0;
    this.timeLimit = 12 + this.goal * 0.4;
    this.upTime = 1.05 - this.hard * 0.45;
    this.spawnT = 0.3;
    this.swing = 0;
    this.botT = 0.5;
  }

  _spawn() {
    const free = this.holes.filter(h => !h.mole && h.cool <= 0);
    if (!free.length) return;
    const h = free[(Math.random() * free.length) | 0];
    const friend = Math.random() < 0.2;
    const obj = Pieces3D.create(friend ? this.mine.type : ['pawn', 'pawn', 'knight', 'bishop', this.enemy.type][(Math.random() * 5) | 0], friend ? this.mine.color : this.enemyColor, friend ? 0x1c6b3f : 0xb01438);
    if (friend) {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 4, 12), new THREE.MeshBasicMaterial({ color: 0x3ee07f, toneMapped: false }));
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 1.4;
      obj.add(halo);
    }
    obj.scale.setScalar(1.3);
    obj.position.set(h.x, -1.3, h.z);
    this.scene.add(obj);
    h.mole = { obj, friend, t: 0, up: this.upTime * (0.8 + Math.random() * 0.4), hit: false };
  }

  _whack(h) {
    if (this.done || this.swing > 0) return;
    this.malletPos.set(h.x, 0, h.z);
    this.swing = 0.16;
    this.swingHole = h;
  }

  _impact(h) {
    const m = h.mole;
    const risen = m && !m.hit && m.obj.position.y > -0.8;
    this.shake = 0.25;
    if (!risen) {
      Sfx3D.thud();
      this.burst.spawn(new THREE.Vector3(h.x, 0.1, h.z), [0xe8dcc0, 0x3a6a4a], 6, 2, { up: 1 });
      return;
    }
    m.hit = true;
    m.t = 0;
    if (m.friend) {
      this.whacked = Math.max(0, this.whacked - 1);
      this.hitFx(0.8, 0xff4d6d);
      Sfx3D.hit();
      this.say('NOT YOUR OWN!', '#ff4d6d');
    } else {
      this.whacked++;
      this.burst.spawn(new THREE.Vector3(h.x, 0.6, h.z), [0xff4d6d, 0xffd166, 0xffffff], 22, 5, { up: 3, size: 0.15 });
      Sfx3D.boom();
      if (this.whacked >= this.goal) { this.say('WHACK-TASTIC!', '#3ee07f'); this.win(); }
    }
  }

  onPress() {
    const h = this.screenPick(this.holes, h => new THREE.Vector3(h.x, 0.5, h.z), 0.16);
    if (h) this._whack(h);
  }

  onMove() {
    const g = this.groundPoint(0);
    if (g && this.swing <= 0) this.malletPos.set(Math.max(-3, Math.min(3, g.x)), 0, Math.max(-3, Math.min(3, g.z)));
  }

  onKey(k) {
    const i = WhackMole.KEYS.findIndex(keys => keys.includes(k));
    if (i >= 0) this._whack(this.holes[i]);
  }

  bot(dt) {
    this.botT -= dt;
    if (this.botT > 0) return;
    const react = 0.25 + (10 - this.botSkill) * 0.05;
    const targets = this.holes.filter(h => h.mole && !h.mole.hit && h.mole.t > react && (!h.mole.friend || Math.random() < (10 - this.botSkill) * 0.02));
    if (targets.length) {
      this._whack(targets[0]);
      this.botT = 0.2 + (10 - this.botSkill) * 0.03;
    }
  }

  tick(dt) {
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this._spawn();
      if (Math.random() < this.hard * 0.5) this._spawn();
      this.spawnT = Math.max(0.3, 0.75 - this.hard * 0.3);
    }
    this._world(dt);
  }

  _world(dt) {
    for (const h of this.holes) {
      h.cool -= dt;
      const m = h.mole;
      if (!m) continue;
      m.t += dt;
      if (m.hit) {
        m.obj.scale.y = Math.max(0.15, m.obj.scale.y - dt * 10);
        m.obj.scale.x = m.obj.scale.z = Math.min(1.6, m.obj.scale.x + dt * 5);
        if (m.t > 0.4) m.obj.position.y -= dt * 4;
      } else {
        const up = Math.min(1, m.t / 0.12);
        const down = m.t > m.up ? Math.min(1, (m.t - m.up) / 0.15) : 0;
        m.obj.position.y = -1.3 + (up - down) * 1.3;
        m.obj.rotation.y = Math.sin(m.t * 10) * 0.3;
        if (m.t > m.up + 0.2) m.gone = true;
      }
      if (m.gone || (m.hit && m.t > 0.8)) {
        this.scene.remove(m.obj);
        Mini3D.disposeScene(m.obj);
        h.mole = null;
        h.cool = 0.25;
      }
    }
    // Mallet: hovers over the aimed hole, slams on a swing.
    if (this.swing > 0) {
      this.swing -= dt;
      if (this.swing <= 0) this._impact(this.swingHole);
    }
    const k = this.swing > 0 ? 1 - this.swing / 0.16 : 0;
    this.malletPivot.position.lerp(new THREE.Vector3(this.malletPos.x + 0.9, 0, this.malletPos.z + 0.4), Math.min(1, dt * 20));
    this.malletPivot.rotation.z = this.swing > 0 ? 0.5 + k * 1.05 : 0.5;
  }

  afterTick(dt) {
    this._world(dt);
  }

  hud(ctx, x, y, w, h) {
    this.hudText(ctx, 'WHACK THE ENEMIES', x + 16, y + 20, { size: 14, title: true, color: '#ff4d6d' });
    this.hudBar(ctx, x + 16, y + 38, 200, 12, this.whacked / this.goal, '#ffd166');
    this.hudText(ctx, `${this.whacked}/${this.goal}`, x + 226, y + 44, { size: 14, color: '#ffd166' });
    this.hudTimer(ctx, x + w - 16, y + 22);
    this.hudHint(ctx, 'Click the pieces (or Q W E / A S D / Z X C). Spare the green ones!');
  }
}
