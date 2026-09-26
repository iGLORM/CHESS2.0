// A chessboard floating over lava with squares knocked out. Tilt the board
// to slide your piece to the golden square; enemy pieces are pinball
// bumpers, and the holes drop you into the magma.
class LavaTilt extends Game3D {
  constructor() {
    super('Lava Tilt');
  }

  static N = 8;
  static MAX_TILT = 0.3;

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x1a0505);
    scene.fog = new THREE.Fog(0x2a0806, 14, 34);
    this.lights({ sky: 0xffc9a0, ground: 0xff3300, hemi: 0.9, keyI: 2, rim: 0xff5522, shadows: true, shadowSize: 6 });

    this._layout();

    // Lava sea below
    const lavaTex = LavaTilt.lavaTexture();
    lavaTex.wrapS = lavaTex.wrapT = THREE.RepeatWrapping;
    lavaTex.repeat.set(5, 5);
    this.lavaTex = lavaTex;
    const lava = new THREE.Mesh(new THREE.PlaneGeometry(80, 80, 30, 30), new THREE.MeshBasicMaterial({ map: lavaTex, color: 0x9a4a30, toneMapped: false }));
    lava.rotation.x = -Math.PI / 2;
    lava.position.y = -7;
    this.lava = lava;
    this._lavaBase = lava.geometry.attributes.position.array.slice();
    scene.add(lava);
    const heat = new THREE.PointLight(0xff4400, 60, 30);
    heat.position.set(0, -4, 0);
    scene.add(heat);

    // The board
    this.board = new THREE.Group();
    scene.add(this.board);
    const light = new THREE.MeshStandardMaterial({ color: 0xe8d6b0, roughness: 0.6, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: 0x5b3a2a, roughness: 0.6, flatShading: true });
    const cellGeo = new THREE.BoxGeometry(0.98, 0.3, 0.98);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.holes.has(r * 8 + c)) continue;
        const goal = r === this.goal.r && c === this.goal.c;
        const m = new THREE.Mesh(cellGeo, goal
          ? new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffaa00, emissiveIntensity: 1.2 })
          : (r + c) % 2 ? dark : light);
        m.position.set(c - 3.5, -0.15, r - 3.5);
        m.receiveShadow = true;
        this.board.add(m);
      }
    }
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x2a1a14, roughness: 0.4, metalness: 0.5 });
    for (const [w, d, x, z] of [[8.6, 0.3, 0, -4.15], [8.6, 0.3, 0, 4.15], [0.3, 8.6, -4.15, 0], [0.3, 8.6, 4.15, 0]]) {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), rimMat);
      rim.position.set(x, 0, z);
      this.board.add(rim);
    }

    // Goal beacon
    const gx = this.goal.c - 3.5, gz = this.goal.r - 3.5;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 8, 12, 1, true), new THREE.MeshBasicMaterial({
      color: 0xffd166, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }));
    beam.position.set(gx, 4, gz);
    this.board.add(beam);
    this.crown = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.07, 6, 10), new THREE.MeshBasicMaterial({ color: 0xffe28a, toneMapped: false }));
    this.crown.position.set(gx, 0.9, gz);
    this.board.add(this.crown);

    // Bumpers
    this.bumpers = this.bumperCells.map(({ r, c }) => {
      const obj = Pieces3D.create(this.enemy.type, this.enemyColor, 0x7a0f24);
      obj.position.set(c - 3.5, 0, r - 3.5);
      obj.scale.setScalar(0.9);
      this.board.add(obj);
      return { obj, x: c - 3.5, z: r - 3.5, pulse: 0 };
    });

    // Player piece
    this.player = this.playerPiece();
    this.player.scale.setScalar(0.75);
    this.board.add(this.player);
    this.glow = Mini3D.glowSprite(0x3ee07f, 1.6);
    this.board.add(this.glow);

    this.camera.fov = 50;
    this.camera.position.set(0, 10.5, 7.8);
    this.camera.lookAt(0, -0.5, 0.6);

    this.tiltX = 0;
    this.tiltZ = 0;
    this.lives = this.hard < 0.55 ? 2 : 1;
    this.maxLives = this.lives;
    this.duration = 19 - this.hard * 5 + (this.isDuel ? 1 : 0);
    this._respawn();
    this.falling = 0;
  }

  // Blobby molten rock: dark crust over bright magma.
  static lavaTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#b01800';
    g.fillRect(0, 0, 64, 64);
    const cols = ['#ff7a1a', '#ff4a00', '#5a0c02', '#3a0801', '#3a0801'];
    for (let i = 0; i < 55; i++) {
      g.fillStyle = cols[(Math.random() * cols.length) | 0];
      const x = Math.random() * 64, y = Math.random() * 64, r = 2 + Math.random() * 6;
      for (const [ox, oy] of [[0, 0], [64, 0], [0, 64], [64, 64], [-64, 0], [0, -64]]) {
        g.beginPath();
        g.arc(x + ox, y + oy, r, 0, Math.PI * 2);
        g.fill();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _layout() {
    const N = 8;
    this.start = { r: 7, c: 0 };
    this.goal = { r: 0, c: 7 };
    const holeCount = Math.round(7 + this.hard * 9);
    const bumperCount = Math.round(3 + this.hard * 3);
    for (let attempt = 0; attempt < 200; attempt++) {
      const holes = new Set();
      const bumpers = [];
      const reserved = (r, c) => (Math.abs(r - this.start.r) + Math.abs(c - this.start.c) <= 1) || (Math.abs(r - this.goal.r) + Math.abs(c - this.goal.c) <= 1);
      while (holes.size < holeCount) {
        const r = (Math.random() * N) | 0, c = (Math.random() * N) | 0;
        if (!reserved(r, c)) holes.add(r * N + c);
      }
      while (bumpers.length < bumperCount) {
        const r = (Math.random() * N) | 0, c = (Math.random() * N) | 0;
        if (!reserved(r, c) && !holes.has(r * N + c) && !bumpers.some(b => b.r === r && b.c === c)) bumpers.push({ r, c });
      }
      this.holes = holes;
      this.bumperCells = bumpers;
      const path = this._path(this.start);
      // Want a route that isn't a straight shot.
      if (path && path.length >= 12) return;
    }
    this.holes = new Set();
  }

  _blocked(r, c) {
    return this.holes.has(r * 8 + c) || this.bumperCells.some(b => b.r === r && b.c === c);
  }

  // BFS over squares, avoiding holes and bumpers. Returns a list of cells.
  _path(from) {
    const key = (r, c) => r * 8 + c;
    const prev = new Map([[key(from.r, from.c), null]]);
    const q = [from];
    while (q.length) {
      const cur = q.shift();
      if (cur.r === this.goal.r && cur.c === this.goal.c) {
        const out = [];
        let k = key(cur.r, cur.c);
        while (k != null) { out.unshift({ r: Math.floor(k / 8), c: k % 8 }); k = prev.get(k); }
        return out;
      }
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const r = cur.r + dr, c = cur.c + dc;
        if (r < 0 || c < 0 || r > 7 || c > 7 || this._blocked(r, c) || prev.has(key(r, c))) continue;
        prev.set(key(r, c), key(cur.r, cur.c));
        q.push({ r, c });
      }
    }
    return null;
  }

  _respawn() {
    this.bx = this.start.c - 3.5;
    this.bz = this.start.r - 3.5;
    this.vx = 0;
    this.vz = 0;
    this.by = 3;
    this.vy = 0;
  }

  onKey() {}

  bot(dt) {
    const c = Math.round(this.bx + 3.5), r = Math.round(this.bz + 3.5);
    const path = this._path({ r: Math.max(0, Math.min(7, r)), c: Math.max(0, Math.min(7, c)) });
    let tx = this.goal.c - 3.5, tz = this.goal.r - 3.5;
    if (path && path.length > 1) {
      tx = path[1].c - 3.5;
      tz = path[1].r - 3.5;
    }
    const care = 0.55 + this.botSkill * 0.03;
    const dvx = (tx - this.bx) * 2.2 * care - this.vx;
    const dvz = (tz - this.bz) * 2.2 * care - this.vz;
    const noise = (10 - this.botSkill) * 0.012;
    this.botTilt = {
      x: Math.max(-1, Math.min(1, dvx * 0.35 + (Math.random() - 0.5) * noise * 10)),
      z: Math.max(-1, Math.min(1, dvz * 0.35 + (Math.random() - 0.5) * noise * 10)),
    };
  }

  _input() {
    if (this.botControlled && this.botTilt) return this.botTilt;
    let x = 0, z = 0;
    if (this.held('ArrowLeft', 'a')) x -= 1;
    if (this.held('ArrowRight', 'd')) x += 1;
    if (this.held('ArrowUp', 'w')) z -= 1;
    if (this.held('ArrowDown', 's')) z += 1;
    if (x || z) return { x, z };
    if (this.pointer.inside) {
      return {
        x: Math.max(-1, Math.min(1, (this.pointer.x - 0.5) * 2.6)),
        z: Math.max(-1, Math.min(1, (this.pointer.y - 0.52) * 2.6)),
      };
    }
    return { x: 0, z: 0 };
  }

  tick(dt) {
    this._animateWorld(dt);
    const inp = this._input();
    const M = LavaTilt.MAX_TILT;
    this.tiltX += (inp.x * M - this.tiltX) * Math.min(1, dt * 8);
    this.tiltZ += (inp.z * M - this.tiltZ) * Math.min(1, dt * 8);
    this.board.rotation.z = -this.tiltX;
    this.board.rotation.x = this.tiltZ;

    if (this.falling > 0) {
      this.falling -= dt;
      this.vy -= 30 * dt;
      this.by += this.vy * dt;
      this.player.rotation.x += dt * 9;
      this._place();
      if (this.falling <= 0) {
        if (this.lives > 0) this._respawn();
        else { this.say('MELTED!', '#ff4d6d'); this.lose(); }
      }
      return;
    }

    // Drop in from above at the start / after a respawn.
    if (this.by > 0) {
      this.vy -= 30 * dt;
      this.by = Math.max(0, this.by + this.vy * dt);
      if (this.by === 0) { this.vy = 0; Sfx3D.thud(); this.shake = 0.3; }
    }

    const g = 16;
    this.vx += Math.sin(this.tiltX) * g * dt;
    this.vz += Math.sin(this.tiltZ) * g * dt;
    const fr = Math.pow(0.35, dt);
    this.vx *= fr;
    this.vz *= fr;
    this.bx += this.vx * dt;
    this.bz += this.vz * dt;

    const lim = 3.7;
    if (Math.abs(this.bx) > lim) { this.bx = Math.sign(this.bx) * lim; this.vx *= -0.5; }
    if (Math.abs(this.bz) > lim) { this.bz = Math.sign(this.bz) * lim; this.vz *= -0.5; }

    // Pinball bumpers: kick harder than you hit them.
    for (const b of this.bumpers) {
      const dx = this.bx - b.x, dz = this.bz - b.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.62 && d > 0.0001) {
        const nx = dx / d, nz = dz / d;
        this.bx = b.x + nx * 0.62;
        this.bz = b.z + nz * 0.62;
        const dot = this.vx * nx + this.vz * nz;
        if (dot < 0) {
          const kick = Math.max(3, -dot * 1.4);
          this.vx += nx * (kick - dot);
          this.vz += nz * (kick - dot);
        }
        b.pulse = 1;
        this.hitFx(0.35, 0xff4d6d);
        this.burst.spawn(this._world(this.bx, 0.5, this.bz), [0xff4d6d, 0xffd166], 12, 5, { up: 2 });
        Sfx3D.zap(90);
      }
    }

    // Holes
    const c = Math.floor(this.bx + 4), r = Math.floor(this.bz + 4);
    if (this.by === 0 && this.holes.has(r * 8 + c)) {
      const cx = c - 3.5, cz = r - 3.5;
      if (Math.abs(this.bx - cx) < 0.36 && Math.abs(this.bz - cz) < 0.36) {
        this.lives--;
        this.falling = 1.1;
        this.vy = 0;
        this.hitFx(0.8, 0xff5a1a);
        Sfx3D.boom();
        this.say(this.lives > 0 ? 'SCORCHED!' : 'INTO THE LAVA!', '#ff6a3d');
      }
    }

    // Goal
    const gx = this.goal.c - 3.5, gz = this.goal.r - 3.5;
    if (this.by === 0 && Math.hypot(this.bx - gx, this.bz - gz) < 0.42) {
      this.burst.spawn(this._world(gx, 0.6, gz), [0xffd166, 0xffffff, 0x3ee07f], 60, 8, { up: 5, size: 0.18 });
      Sfx3D.ding(88);
      this.say('SAFE!', '#3ee07f');
      this.win();
    }

    if (!this.done && this.time >= this.duration) {
      this.say('TIME!', '#ff4d6d');
      this.lose();
    }
    this._place();
  }

  _world(x, y, z) {
    return new THREE.Vector3(x, y, z).applyMatrix4(this.board.matrixWorld);
  }

  _place() {
    this.player.position.set(this.bx, this.by, this.bz);
    if (this.falling <= 0) {
      this.player.rotation.x = this.vz * 0.12;
      this.player.rotation.z = -this.vx * 0.12;
    }
    this.glow.position.set(this.bx, this.by + 0.4, this.bz);
  }

  _animateWorld(dt) {
    this.lavaTex.offset.x += dt * 0.05;
    this.lavaTex.offset.y += dt * 0.03;
    const pos = this.lava.geometry.attributes.position;
    const base = this._lavaBase;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      pos.array[i * 3 + 2] = Math.sin(x * 0.4 + this.time * 1.5) * 0.5 + Math.cos(y * 0.5 + this.time) * 0.5;
    }
    pos.needsUpdate = true;
    this.crown.rotation.y += dt * 3;
    this.crown.position.y = 0.9 + Math.sin(this.time * 4) * 0.12;
    for (const b of this.bumpers) {
      b.pulse = Math.max(0, b.pulse - dt * 4);
      b.obj.scale.setScalar(0.9 + b.pulse * 0.35);
      b.obj.rotation.y += dt * (1 + b.pulse * 20);
    }
    // Rising embers
    if (Math.random() < dt * 30) {
      this.burst.spawn(new THREE.Vector3((Math.random() - 0.5) * 16, -6, (Math.random() - 0.5) * 12), [0xff6a3d, 0xffb347], 1, 1, { up: 4, gravity: -1, life: 2.2, size: 0.1 });
    }
  }

  afterTick(dt) {
    this._animateWorld(dt);
    if (this.winner === 'attacker') {
      this.player.position.y += dt * 1.5;
      this.player.rotation.y += dt * 10;
    }
  }

  hud(ctx, x, y, w, h) {
    const left = Math.max(0, this.duration - this.time);
    this.hudText(ctx, 'REACH THE GOLD SQUARE', x + 16, y + 20, { size: 14, title: true, color: '#ffd166' });
    this.hudText(ctx, left.toFixed(1) + 's', x + w - 16, y + 20, { size: 22, align: 'right', color: left < 4 ? '#ff4d6d' : '#f4f0ff' });
    this.hudHearts(ctx, x + w - 150, y + 21, this.lives, this.maxLives);
    this.hudHint(ctx, 'Move the mouse or hold the arrow keys to tilt the board');
  }
}
