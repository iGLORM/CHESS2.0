// Giant pieces rain from the sky onto the board. Red circles show where
// they will land; don't be standing there.
class DodgeFalling extends Game3D {
  constructor() {
    super('Falling Sky');
  }

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x3a4a7a);
    scene.fog = new THREE.Fog(0x3a4a7a, 16, 40);
    this.lights({ sky: 0xc0d0ff, ground: 0x3a2a4a, keyI: 2.6, shadows: true, shadowSize: 7 });

    const board = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 8), new THREE.MeshStandardMaterial({ map: Mini3D.themeChecker(8, 8), flatShading: true }));
    board.position.y = -0.25;
    board.receiveShadow = true;
    scene.add(board);
    // Storm clouds overhead
    this.clouds = [];
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0x5a5a7a, flatShading: true });
    for (let i = 0; i < 12; i++) {
      const c = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5 + Math.random() * 1.5, 0), cloudMat);
      c.position.set((Math.random() - 0.5) * 24, 10 + Math.random() * 3, (Math.random() - 0.5) * 16 - 4);
      scene.add(c);
      this.clouds.push(c);
    }

    this.player = this.playerPiece();
    this.player.scale.setScalar(1.05);
    scene.add(this.player);
    this.me = { x: 0, z: 1 };

    this.camera.fov = 50;
    this.camera.position.set(0, 9.5, 7.5);
    this.camera.lookAt(0, 0, 0.4);

    this.drops = [];
    this.duration = 10 + this.hard * 4 + (this.isDuel ? 3 : 0);
    this.maxHp = this.hard > 0.6 ? 1 : 2;
    this.hp = this.maxHp;
    this.invuln = 0;
    this.spawnT = 0.4;
    this.warn = 1.1 - this.hard * 0.35;
  }

  _spawn(targeted) {
    const big = Math.random() < 0.25 + this.hard * 0.2;
    const r = big ? 1.3 : 0.8;
    const x = targeted ? this.me.x + (Math.random() - 0.5) * 0.8 : (Math.random() - 0.5) * 7;
    const z = targeted ? this.me.z + (Math.random() - 0.5) * 0.8 : (Math.random() - 0.5) * 7;
    const mark = new THREE.Mesh(new THREE.RingGeometry(r * 0.85, r, 24), new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(x, 0.02, z);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.2, toneMapped: false }));
    fill.rotation.x = -Math.PI / 2;
    fill.position.set(x, 0.015, z);
    const types = ['rook', 'queen', 'king', 'bishop', this.enemy.type];
    const piece = Pieces3D.create(types[(Math.random() * types.length) | 0], this.enemyColor, 0xb01438);
    piece.scale.setScalar(r * 2.2);
    piece.position.set(x, 14, z);
    this.scene.add(mark, fill, piece);
    this.drops.push({ x, z, r, mark, fill, piece, t: this.warn * (big ? 1.2 : 1), landed: 0, vy: 0 });
  }

  bot() {
    this._botDangers = this.drops.filter(d => !d.landed).map(d => ({ x: d.x, z: d.z, r: d.r, w: 2 }));
  }

  tick(dt) {
    this.moveActor(dt, this.me, { speed: 5.5, bound: 3.6, dangers: this._botDangers });
    this.player.position.set(this.me.x, this.me.moving > 0.1 ? Math.abs(Math.sin(this.time * 18)) * 0.12 : 0, this.me.z);
    if (this.me.facing != null) this.player.rotation.y = this.me.facing;
    this.invuln = Math.max(0, this.invuln - dt);
    this.player.visible = this.invuln <= 0 || Math.floor(this.time * 20) % 2 === 0;

    if (this.time < this.duration - 0.8) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this._spawn(Math.random() < 0.35 + this.hard * 0.25);
        if (Math.random() < this.hard * 0.6) this._spawn(false);
        this.spawnT = Math.max(0.28, 0.75 - this.hard * 0.3 - this.time * 0.02);
      }
    }

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      if (!d.landed) {
        d.t -= dt;
        const k = Math.max(0, d.t / this.warn);
        d.piece.position.y = 0.2 + k * k * 14;
        d.piece.rotation.y += dt * 4;
        d.fill.scale.setScalar(1 - k * 0.8);
        d.mark.material.opacity = 0.6 + 0.4 * Math.sin(this.time * 20);
        if (d.t <= 0) {
          d.landed = 1;
          d.piece.position.y = 0;
          this.burst.spawn(new THREE.Vector3(d.x, 0.2, d.z), [0xe8dcc0, 0x5a4a7a, 0xffffff], 18 + d.r * 10, 5 + d.r * 2, { up: 3 });
          this.shake = Math.max(this.shake, 0.3 + d.r * 0.2);
          Sfx3D.boom();
          if (this.invuln <= 0 && Math.hypot(this.me.x - d.x, this.me.z - d.z) < d.r + 0.2) {
            this.hp--;
            this.invuln = 1.2;
            this.hitFx(1, 0xff4d6d);
            if (this.hp <= 0) { this.say('SQUASHED!', '#ff4d6d'); this.lose(); return; }
            this.say('OOF!', '#ffb347');
          }
        }
      } else {
        d.landed += dt;
        d.mark.visible = d.fill.visible = false;
        if (d.landed > 1.4) {
          d.piece.position.y -= dt * 4;
          if (d.landed > 2.2) {
            for (const o of [d.mark, d.fill, d.piece]) { this.scene.remove(o); Mini3D.disposeScene(o); }
            this.drops.splice(i, 1);
          }
        }
      }
    }
    for (const c of this.clouds) c.position.x = ((c.position.x + dt * 1.2 + 12) % 24) - 12;
    if (this.time >= this.duration) { this.say('STILL STANDING!', '#3ee07f'); this.win(); }
  }

  afterTick(dt) {
    if (this.winner === 'attacker') this.player.rotation.y += dt * 8;
    else { this.player.scale.y = Math.max(0.1, this.player.scale.y - dt * 3); }
  }

  hud(ctx, x, y, w, h) {
    this.hudText(ctx, 'DODGE!', x + 16, y + 20, { size: 14, title: true, color: '#ff4d6d' });
    this.hudBar(ctx, x + 100, y + 12, w - 240, 16, this.time / this.duration, '#3ee07f');
    this.hudHearts(ctx, x + w - 16 - this.maxHp * 22, y + 21, this.hp, this.maxHp);
    this.hudHint(ctx, 'Move with the mouse or WASD / arrow keys');
  }
}
