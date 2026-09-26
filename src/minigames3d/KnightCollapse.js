// The board is falling apart. Your piece can only jump like a knight, every
// square you leave crumbles behind you, and random squares glow red and drop
// into the void. Grab the crowns before time runs out.
class KnightCollapse extends Game3D {
  constructor() {
    super('Knight Collapse');
  }

  static JUMPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x07051a);
    scene.fog = new THREE.Fog(0x07051a, 16, 40);
    this.lights({ shadows: true, shadowSize: 6, keyI: 2.2, rim: 0x4cc9f0 });
    const stars = Mini3D.starfield(300, 60, 0xbfb3ff);
    stars.material.fog = false;
    scene.add(stars);

    // Swirling vortex far below
    this.vortex = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2 + i * 1.6, 0.06, 4, 40), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x4a1cb0 : 0x9a1a70, toneMapped: false }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -12 - i * 2;
      this.vortex.add(ring);
    }
    scene.add(this.vortex);

    this.tiles = [];
    const geo = new THREE.BoxGeometry(0.96, 0.35, 0.96);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const lightSq = (r + c) % 2 === 0;
        const mat = new THREE.MeshStandardMaterial({ color: lightSq ? 0xd8cff5 : 0x4a3a8a, emissive: 0x000000, flatShading: true, roughness: 0.5 });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(c - 3.5, -0.175, r - 3.5);
        m.receiveShadow = true;
        m.castShadow = true;
        scene.add(m);
        this.tiles.push({ r, c, mesh: m, state: 'solid', t: 0, vy: 0, base: mat.color.getHex() });
      }
    }

    // Move markers
    this.markers = [];
    for (let i = 0; i < 8; i++) {
      const mk = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.36, 16), new THREE.MeshBasicMaterial({ color: 0x3ee07f, side: THREE.DoubleSide, transparent: true, toneMapped: false }));
      mk.rotation.x = -Math.PI / 2;
      mk.visible = false;
      scene.add(mk);
      this.markers.push(mk);
    }

    this.player = this.playerPiece();
    this.player.scale.setScalar(0.95);
    scene.add(this.player);
    this.aura = Mini3D.glowSprite(0x3ee07f, 1.5);
    scene.add(this.aura);
    this.pr = 7; this.pc = 3;
    this._tile(7, 3).state = 'solid';
    this.hop = null;
    this.sel = 0;

    this.gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffaa00, emissiveIntensity: 1.2, flatShading: true }));
    this.gemGlow = Mini3D.glowSprite(0xffd166, 1.8);
    scene.add(this.gem, this.gemGlow);

    this.camera.fov = 50;
    this.camera.position.set(0, 10, 7.5);
    this.camera.lookAt(0, -0.5, 0.4);

    this.goal = Math.round(4 + this.hard * 3 + (this.isDuel ? 1 : 0));
    this.got = 0;
    this.duration = 16 + this.goal * 0.5 - this.hard * 3;
    this.collapseTimer = 1.2;
    this.warnTime = 1.1 - this.hard * 0.35;
    this.botTimer = 0.6;
    this._placeGem();
    this._place();
  }

  _tile(r, c) {
    return (r < 0 || c < 0 || r > 7 || c > 7) ? null : this.tiles[r * 8 + c];
  }

  _moves() {
    const out = [];
    for (const [dr, dc] of KnightCollapse.JUMPS) {
      const t = this._tile(this.pr + dr, this.pc + dc);
      if (t && (t.state === 'solid' || t.state === 'warn')) out.push(t);
    }
    return out;
  }

  _placeGem() {
    const options = this.tiles.filter(t => t.state === 'solid' && (Math.abs(t.r - this.pr) + Math.abs(t.c - this.pc)) >= 3);
    const t = options.length ? options[(Math.random() * options.length) | 0] : this.tiles.find(t => t.state === 'solid');
    this.gemTile = t;
  }

  _warn(t, time) {
    if (!t || t.state !== 'solid') return;
    t.state = 'warn';
    t.t = time;
  }

  onKey(k) {
    const moves = this._moves();
    if (!moves.length) return;
    if (k === 'ArrowLeft' || k === 'a' || k === 'ArrowUp' || k === 'w') { this.sel = (this.sel + moves.length - 1) % moves.length; Sfx3D.blip(70); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'ArrowDown' || k === 's') { this.sel = (this.sel + 1) % moves.length; Sfx3D.blip(70); }
    else if (k === ' ' || k === 'Enter') this._jump(moves[this.sel % moves.length]);
  }

  onPress() {
    // Pick the legal square nearest to the pointer on screen.
    const n = this.ndc();
    let best = null, bestD = 0.16;
    for (const t of this._moves()) {
      const p = t.mesh.position.clone().project(this.camera);
      const d = Math.hypot((p.x - n.x) * this.camera.aspect, p.y - n.y);
      if (d < bestD) { best = t; bestD = d; }
    }
    if (best) this._jump(best);
  }

  onMove() {
    const n = this.ndc();
    const moves = this._moves();
    let bi = -1, bestD = 0.16;
    moves.forEach((t, i) => {
      const p = t.mesh.position.clone().project(this.camera);
      const d = Math.hypot((p.x - n.x) * this.camera.aspect, p.y - n.y);
      if (d < bestD) { bi = i; bestD = d; }
    });
    if (bi >= 0) this.sel = bi;
  }

  _jump(t) {
    if (this.hop || this.done) return;
    const from = this._tile(this.pr, this.pc);
    this._warn(from, 0.7);
    this.hop = { fr: this.pr, fc: this.pc, tr: t.r, tc: t.c, t: 0, dur: 0.32 };
    this.pr = t.r;
    this.pc = t.c;
    this.sel = 0;
    Sfx3D.whoosh();
  }

  bot(dt) {
    if (this.hop) return;
    this.botTimer -= dt;
    const here = this._tile(this.pr, this.pc);
    const urgent = here.state === 'warn' && here.t < 0.45;
    if (this.botTimer > 0 && !urgent) return;
    this.botTimer = 0.9 - this.botSkill * 0.06 + Math.random() * 0.3;
    const moves = this._moves();
    if (!moves.length) return;
    const g = this.gemTile;
    const score = t => {
      let s = -(Math.abs(t.r - g.r) + Math.abs(t.c - g.c));
      if (t === g) s += 50;
      if (t.state === 'warn') s -= 30;
      // Prefer squares that still have exits.
      const exits = KnightCollapse.JUMPS.filter(([dr, dc]) => { const n = this._tile(t.r + dr, t.c + dc); return n && n.state === 'solid'; }).length;
      s += exits * 0.8;
      return s + (Math.random() - 0.5) * (10 - this.botSkill) * 1.2;
    };
    moves.sort((a, b) => score(b) - score(a));
    this._jump(moves[0]);
  }

  tick(dt) {
    // Random collapses, faster as time goes on.
    this.collapseTimer -= dt;
    if (this.collapseTimer <= 0) {
      const solid = this.tiles.filter(t => t.state === 'solid' && t !== this.gemTile && !(t.r === this.pr && t.c === this.pc));
      const n = 1 + (Math.random() < this.hard ? 1 : 0);
      for (let i = 0; i < n && solid.length; i++) this._warn(solid.splice((Math.random() * solid.length) | 0, 1)[0], this.warnTime);
      // Now and then, the square under you.
      if (Math.random() < 0.25 + this.hard * 0.3) this._warn(this._tile(this.pr, this.pc), this.warnTime + 0.3);
      this.collapseTimer = Math.max(0.3, 0.9 - this.hard * 0.4 - this.time * 0.02);
    }

    for (const t of this.tiles) {
      if (t.state === 'warn') {
        t.t -= dt;
        const blink = Math.floor(t.t * (t.t < 0.4 ? 20 : 8)) % 2 === 0;
        t.mesh.material.color.set(blink ? 0xff4d6d : t.base);
        t.mesh.material.emissive.set(blink ? 0x661020 : 0x000000);
        t.mesh.position.x = (t.c - 3.5) + (Math.random() - 0.5) * 0.05;
        if (t.t <= 0) {
          t.state = 'falling';
          t.vy = 0;
          this.burst.spawn(t.mesh.position, [0x4a3a8a, 0xd8cff5], 6, 2, { up: 1 });
        }
      } else if (t.state === 'falling') {
        t.vy -= 25 * dt;
        t.mesh.position.y += t.vy * dt;
        t.mesh.rotation.x += dt * 2;
        t.mesh.rotation.z += dt * 1.3;
        if (t.mesh.position.y < -25) { t.state = 'gone'; t.mesh.visible = false; t.t = 4.5; }
      } else if (t.state === 'gone') {
        // Squares rebuild themselves after a while so the board never runs dry.
        t.t -= dt;
        if (t.t <= 0) {
          t.state = 'solid';
          t.mesh.visible = true;
          t.mesh.rotation.set(0, 0, 0);
          t.mesh.position.set(t.c - 3.5, -0.175, t.r - 3.5);
          t.mesh.material.color.set(t.base);
          t.mesh.material.emissive.set(0x000000);
          this.burst.spawn(t.mesh.position, [0x6a2cff, 0xffffff], 6, 2, { up: 1, gravity: 2 });
        }
      }
    }

    // Hop animation
    if (this.hop) {
      this.hop.t += dt;
      if (this.hop.t >= this.hop.dur) {
        this.hop = null;
        this._land();
      }
    } else {
      const here = this._tile(this.pr, this.pc);
      if (here.state === 'falling' || here.state === 'gone') this._fall();
    }

    if (!this.done && this.time >= this.duration) {
      this.say('TIME!', '#ff4d6d');
      this.lose();
    }
    this._place();
    this._world(dt);
  }

  _land() {
    const t = this._tile(this.pr, this.pc);
    this.shake = 0.25;
    Sfx3D.thud();
    this.burst.spawn(new THREE.Vector3(t.c - 3.5, 0.05, t.r - 3.5), [0xffffff, 0xbfb3ff], 8, 2.5, { up: 1 });
    if (t.state === 'falling' || t.state === 'gone') { this._fall(); return; }
    if (t === this.gemTile) {
      this.got++;
      this.burst.spawn(new THREE.Vector3(t.c - 3.5, 0.6, t.r - 3.5), [0xffd166, 0xffffff, 0x3ee07f], 36, 6, { up: 4, size: 0.16 });
      Sfx3D.ding(80 + this.got * 2);
      this.hitFx(0.3, 0xffd166);
      if (this.got >= this.goal) {
        this.say('ESCAPED!', '#3ee07f');
        this.win();
      } else {
        this.say(`CROWN ${this.got}/${this.goal}`, '#ffd166');
        this._placeGem();
      }
    }
  }

  _fall() {
    this.falling = true;
    this.fallV = 0;
    this.hitFx(0.8, 0x6a2cff);
    Sfx3D.boom();
    this.say('INTO THE VOID!', '#ff4d6d');
    this.lose();
  }

  _place() {
    let x = this.pc - 3.5, z = this.pr - 3.5, y = 0;
    if (this.hop) {
      const k = this.hop.t / this.hop.dur;
      x = (this.hop.fc + (this.hop.tc - this.hop.fc) * k) - 3.5;
      z = (this.hop.fr + (this.hop.tr - this.hop.fr) * k) - 3.5;
      y = Math.sin(k * Math.PI) * 1.4;
      this.player.rotation.y = k * Math.PI * 2;
    }
    if (!this.falling) this.player.position.set(x, y, z);
    this.aura.position.set(this.player.position.x, this.player.position.y + 0.4, this.player.position.z);

    // Markers on legal targets
    const moves = this.hop || this.done ? [] : this._moves();
    this.markers.forEach((mk, i) => {
      const t = moves[i];
      mk.visible = !!t;
      if (!t) return;
      mk.position.set(t.c - 3.5, 0.02, t.r - 3.5);
      const selected = i === this.sel % moves.length;
      mk.material.color.set(t.state === 'warn' ? 0xffb347 : selected ? 0xffffff : 0x3ee07f);
      mk.scale.setScalar(selected ? 1.25 + Math.sin(this.time * 10) * 0.08 : 1);
    });

    const g = this.gemTile;
    if (g) {
      this.gem.position.set(g.c - 3.5, 0.55 + Math.sin(this.time * 4) * 0.1 + (g.mesh.position.y + 0.175), g.r - 3.5);
      this.gem.rotation.y += 0.05;
      this.gemGlow.position.copy(this.gem.position);
    }
  }

  _world(dt) {
    this.vortex.rotation.y += dt * 0.6;
    this.vortex.children.forEach((r, i) => { r.scale.setScalar(1 + Math.sin(this.time * 2 + i) * 0.05); });
  }

  afterTick(dt) {
    this._world(dt);
    if (this.falling) {
      this.fallV -= 20 * dt;
      this.player.position.y += this.fallV * dt;
      this.player.rotation.x += dt * 7;
    } else if (this.winner === 'attacker') {
      this.player.position.y = Math.abs(Math.sin(this.time * 8)) * 0.6;
    }
    this.markers.forEach(m => { m.visible = false; });
    for (const t of this.tiles) {
      if (t.state === 'falling') {
        t.vy -= 25 * dt;
        t.mesh.position.y += t.vy * dt;
      }
    }
  }

  hud(ctx, x, y, w, h) {
    const left = Math.max(0, this.duration - this.time);
    this.hudText(ctx, 'GRAB THE CROWNS', x + 16, y + 20, { size: 14, title: true, color: '#ffd166' });
    for (let i = 0; i < this.goal; i++) {
      this.hudText(ctx, '♛', x + 18 + i * 22, y + 46, { size: 20, color: i < this.got ? '#ffd166' : 'rgba(255,255,255,0.2)' });
    }
    this.hudText(ctx, left.toFixed(1) + 's', x + w - 16, y + 20, { size: 22, align: 'right', color: left < 4 ? '#ff4d6d' : '#f4f0ff' });
    this.hudHint(ctx, 'Click a green ring to jump like a knight (or arrows + SPACE)');
  }
}
