// Four giant pieces on glowing pedestals sing a sequence. Play it back.
// Each round adds a note.
class PatternPress extends Game3D {
  constructor() {
    super('Pattern Press');
  }

  static PADS = [
    { type: 'pawn', color: 0xff4d6d, note: 60, key: '1', arrow: 'ArrowLeft' },
    { type: 'knight', color: 0x4cc9f0, note: 64, key: '2', arrow: 'ArrowUp' },
    { type: 'bishop', color: 0x3ee07f, note: 67, key: '3', arrow: 'ArrowDown' },
    { type: 'rook', color: 0xffd166, note: 72, key: '4', arrow: 'ArrowRight' },
  ];

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x07051a);
    scene.fog = new THREE.Fog(0x07051a, 12, 30);
    this.lights({ hemi: 0.6, keyI: 1.2 });
    const stars = Mini3D.starfield(300, 60);
    stars.material.fog = false;
    scene.add(stars);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 32), new THREE.MeshStandardMaterial({ map: Mini3D.checkerTexture(12, '#2a2050', '#140f2c', 4) }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    this.pads = PatternPress.PADS.map((def, i) => {
      const x = (i - 1.5) * 2.2, z = -0.2 + Math.abs(i - 1.5) * 0.35;
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.95, 0.5, 8), new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.15, flatShading: true }));
      ped.position.set(x, 0.25, z);
      scene.add(ped);
      const piece = Pieces3D.create(def.type, 'white', def.color);
      piece.scale.setScalar(1.4);
      piece.position.set(ped.position.x, 0.5, ped.position.z);
      scene.add(piece);
      const light = new THREE.PointLight(def.color, 0, 6);
      light.position.set(ped.position.x, 2, ped.position.z + 0.5);
      scene.add(light);
      const glow = Mini3D.glowSprite(def.color, 3);
      glow.position.set(ped.position.x, 1.2, ped.position.z);
      glow.material.opacity = 0;
      scene.add(glow);
      const label = Mini3D.labelSprite(def.key, '#ffffff', 0.45);
      label.position.set(ped.position.x, 0.3, ped.position.z + 1.1);
      scene.add(label);
      return { ...def, ped, piece, light, glow, lit: 0, x: ped.position.x, z: ped.position.z };
    });

    this.camera.fov = 50;
    this.camera.position.set(0, 4.2, 7.5);
    this.camera.lookAt(0, 1, 0);

    this.startLen = 3 + Math.round(this.hard * 2);
    this.rounds = this.isDuel ? 4 : 3;
    this.round = 0;
    this.seq = [];
    for (let i = 0; i < this.startLen + this.rounds; i++) this.seq.push((Math.random() * 4) | 0);
    this.gap = 0.55 - this.hard * 0.22;
    this.lives = this.hard < 0.5 ? 2 : 1;
    this._startRound();
  }

  _startRound() {
    this.len = this.startLen + this.round;
    this.phase = 'show';
    this.showT = -0.6;
    this.showIdx = 0;
    this.inputIdx = 0;
    this.botT = 0.6;
  }

  _light(i, big) {
    const p = this.pads[i];
    p.lit = 1;
    p.jump = big ? 1 : 0.6;
    Sfx3D.ding(p.note);
  }

  _press(i) {
    if (this.done || this.phase !== 'input') return;
    this._light(i, true);
    const p = this.pads[i];
    this.idle = 0;
    if (this.seq[this.inputIdx] === i) {
      this.inputIdx++;
      this.burst.spawn(new THREE.Vector3(p.x, 1.5, p.z), [p.color, 0xffffff], 10, 3, { up: 2 });
      if (this.inputIdx >= this.len) {
        this.round++;
        this.hitFx(0.3, 0x3ee07f);
        if (this.round >= this.rounds) { this.say('FLAWLESS!', '#3ee07f'); this.win(); return; }
        this.say(`ROUND ${this.round + 1}`, '#ffd166');
        this.phase = 'wait';
        this.waitT = 0.8;
      }
    } else {
      this.lives--;
      this.hitFx(0.8, 0xff4d6d);
      Sfx3D.boom();
      for (const q of this.pads) this.burst.spawn(new THREE.Vector3(q.x, 1.5, q.z), [0xff4d6d], 6, 3);
      if (this.lives <= 0) { this.say('WRONG!', '#ff4d6d'); this.lose(); return; }
      this.say('WRONG - WATCH AGAIN', '#ffb347');
      this.phase = 'wait';
      this.waitT = 1;
    }
  }

  onKey(k) {
    const i = this.pads.findIndex(p => p.key === k || p.arrow === k);
    if (i >= 0) this._press(i);
  }

  onPress() {
    const p = this.screenPick(this.pads, p => new THREE.Vector3(p.x, 1, p.z), 0.2);
    if (p) this._press(this.pads.indexOf(p));
  }

  bot(dt) {
    if (this.phase !== 'input') return;
    this.botT -= dt;
    if (this.botT > 0) return;
    this.botT = 0.5 - this.botSkill * 0.03 + Math.random() * 0.2;
    const right = this.seq[this.inputIdx];
    const slip = Math.random() < (10 - this.botSkill) * 0.02 * (1 + this.inputIdx * 0.1);
    this._press(slip ? (right + 1 + ((Math.random() * 3) | 0)) % 4 : right);
  }

  tick(dt) {
    if (this.phase === 'show') {
      this.showT += dt;
      if (this.showT >= 0) {
        if (this.showIdx < this.len && this.showT >= this.showIdx * this.gap) {
          this._light(this.seq[this.showIdx], false);
          this.showIdx++;
        } else if (this.showIdx >= this.len && this.showT >= this.len * this.gap + 0.2) {
          this.phase = 'input';
          this.idle = 0;
          this.say('YOUR TURN', '#4cc9f0');
        }
      }
    } else if (this.phase === 'input') {
      // Hesitating too long counts as a wrong press.
      this.idle += dt;
      if (this.idle > 4) this._press((this.seq[this.inputIdx] + 1) % 4);
    } else if (this.phase === 'wait') {
      this.waitT -= dt;
      if (this.waitT <= 0) this._startRound();
    }
    this._animate(dt);
  }

  afterTick(dt) {
    if (this.winner === 'attacker' && Math.random() < dt * 8) this._light((Math.random() * 4) | 0, true);
    this._animate(dt);
  }

  _animate(dt) {
    for (const p of this.pads) {
      p.lit = Math.max(0, p.lit - dt * 3);
      p.jump = Math.max(0, (p.jump || 0) - dt * 3);
      p.piece.position.y = 0.5 + Math.sin(p.jump * Math.PI) * 0.8;
      p.piece.rotation.y += dt * (0.5 + p.lit * 12);
      p.light.intensity = p.lit * 25;
      p.glow.material.opacity = p.lit;
      p.ped.material.emissiveIntensity = 0.15 + p.lit * 1.5;
    }
  }

  hud(ctx, x, y, w, h) {
    const label = this.phase === 'show' ? 'WATCH...' : this.phase === 'input' ? 'REPEAT IT!' : '';
    this.hudText(ctx, label, x + 16, y + 20, { size: 14, title: true, color: this.phase === 'input' ? '#4cc9f0' : '#b8a8ff' });
    this.hudText(ctx, `ROUND ${Math.min(this.round + 1, this.rounds)}/${this.rounds}`, x + w - 16, y + 20, { size: 18, align: 'right', color: '#ffd166' });
    if (this.phase === 'input') {
      for (let i = 0; i < this.len; i++) {
        ctx.fillStyle = i < this.inputIdx ? '#3ee07f' : 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.arc(x + 22 + i * 18, y + 44, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this.hudHearts(ctx, x + w - 60, y + 46, this.lives, this.hard < 0.5 ? 2 : 1);
    this.hudHint(ctx, 'Click the pieces, or press 1-4 / arrow keys');
  }
}
