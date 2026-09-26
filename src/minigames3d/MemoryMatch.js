// Trapdoor memory: every square hides a piece under a lid. Flip two lids,
// find the pairs before the clock runs out. The pieces show themselves for a
// moment at the start.
class MemoryMatch extends Game3D {
  constructor() {
    super('Memory Match');
  }

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x120a26);
    scene.fog = new THREE.Fog(0x120a26, 14, 30);
    this.lights({ shadows: true, shadowSize: 6, keyI: 2.4 });

    const pairs = Math.min(6, Math.round(4 + this.hard * 2 + (this.isDuel ? 1 : 0)));
    const cols = pairs === 5 ? 5 : 4;
    const rows = Math.ceil(pairs * 2 / cols);
    const types = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'].sort(() => Math.random() - 0.5).slice(0, pairs);
    const deck = [...types, ...types].sort(() => Math.random() - 0.5);

    // Table
    const table = new THREE.Mesh(new THREE.BoxGeometry(cols * 1.5 + 1, 0.4, rows * 1.8 + 1), new THREE.MeshStandardMaterial({ color: 0x3a2458, roughness: 0.6, flatShading: true }));
    table.position.y = -0.2;
    table.receiveShadow = true;
    scene.add(table);
    const felt = new THREE.Mesh(new THREE.PlaneGeometry(cols * 1.5 + 0.6, rows * 1.8 + 0.6), new THREE.MeshStandardMaterial({ color: 0x1f5a45, roughness: 0.9 }));
    felt.rotation.x = -Math.PI / 2;
    felt.position.y = 0.005;
    felt.receiveShadow = true;
    scene.add(felt);
    const candles = [];
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const glow = Mini3D.glowSprite(0xffb347, 0.7);
      glow.position.set(x * (cols * 0.75 + 0.1), 0.3, z * (rows * 0.9 + 0.1));
      scene.add(glow);
      candles.push(glow);
    }
    this.candles = candles;

    const lidTex = Mini3D.checkerTexture(4, '#d8cff5', '#6a4ab0', 4);
    const lidMat = new THREE.MeshStandardMaterial({ map: lidTex, roughness: 0.4, flatShading: true });
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x05030c });
    this.cards = deck.map((type, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = (c - (cols - 1) / 2) * 1.5, z = (r - (rows - 1) / 2) * 1.8;
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), holeMat);
      hole.rotation.x = -Math.PI / 2;
      hole.position.set(x, 0.01, z);
      scene.add(hole);
      const piece = Pieces3D.create(type, this.mine.color);
      piece.position.set(x, -0.9, z);
      piece.scale.setScalar(0.8);
      scene.add(piece);
      // Lids pop straight up and spin away, so an open lid never hides the row behind.
      const hinge = new THREE.Group();
      hinge.position.set(x, 0.06, z);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.12, 1.24), lidMat);
      lid.castShadow = true;
      hinge.add(lid);
      scene.add(hinge);
      return { type, x, z, piece, hinge, lid, open: 0, target: 0, matched: false, seen: false };
    });
    this.cols = cols;

    this.camera.fov = 45;
    this.camera.position.set(0, 10, 6.2);
    this.camera.lookAt(0, 0, 0.5);

    this.preview = 1.6 - this.hard * 0.7;
    this.picks = [];
    this.closeTimer = 0;
    this.found = 0;
    this.pairs = pairs;
    this.timeLimit = 14 + pairs * 2.2 - this.hard * 4;
    this.cursor = 0;
    this.memory = new Map();
    this.botTimer = 0.8;
    for (const c of this.cards) c.target = 1;
  }

  _flip(card) {
    if (this.done || this.preview > 0 || this.closeTimer > 0 || card.matched || card.target === 1 || this.picks.length >= 2) return;
    card.target = 1;
    this.picks.push(card);
    Sfx3D.blip(64 + this.picks.length * 5);
    this.memory.set(card, card.type);
    if (this.picks.length === 2) {
      const [a, b] = this.picks;
      if (a.type === b.type) {
        a.matched = b.matched = true;
        this.found++;
        this.picks = [];
        for (const c of [a, b]) this.burst.spawn(new THREE.Vector3(c.x, 1, c.z), [0x3ee07f, 0xffd166, 0xffffff], 20, 4, { up: 3 });
        Sfx3D.ding(76 + this.found * 2);
        this.hitFx(0.25, 0x3ee07f);
        if (this.found >= this.pairs) {
          this.say('ALL FOUND!', '#3ee07f');
          this.win();
        } else this.say('MATCH!', '#3ee07f');
      } else {
        this.closeTimer = 0.7;
        Sfx3D.thud();
      }
    }
  }

  onPress() {
    const c = this.screenPick(this.cards, c => new THREE.Vector3(c.x, 0.1, c.z), 0.12);
    if (c) this._flip(c);
  }

  onKey(k) {
    const n = this.cards.length, cols = this.cols;
    if (k === 'ArrowLeft' || k === 'a') this.cursor = (this.cursor + n - 1) % n;
    else if (k === 'ArrowRight' || k === 'd') this.cursor = (this.cursor + 1) % n;
    else if (k === 'ArrowUp' || k === 'w') this.cursor = (this.cursor + n - cols) % n;
    else if (k === 'ArrowDown' || k === 's') this.cursor = (this.cursor + cols) % n;
    else if (k === ' ' || k === 'Enter') this._flip(this.cards[this.cursor]);
    this.keyCursor = true;
  }

  onMove() {
    this.keyCursor = false;
  }

  bot(dt) {
    this.botTimer -= dt;
    if (this.botTimer > 0 || this.preview > 0 || this.closeTimer > 0) return;
    this.botTimer = 0.9 - this.botSkill * 0.05 + Math.random() * 0.3;
    const closed = this.cards.filter(c => !c.matched && c.target === 0);
    const recall = c => this.memory.has(c) && Math.random() < 0.4 + this.botSkill * 0.06;
    let pick;
    if (this.picks.length === 1) {
      pick = closed.find(c => recall(c) && this.memory.get(c) === this.picks[0].type);
    } else {
      const known = closed.filter(recall);
      for (const a of known) {
        if (known.some(b => b !== a && this.memory.get(b) === this.memory.get(a))) { pick = a; break; }
      }
      if (!pick) pick = closed.find(c => !this.memory.has(c));
    }
    this._flip(pick || closed[(Math.random() * closed.length) | 0]);
  }

  tick(dt) {
    if (this.preview > 0) {
      this.preview -= dt;
      if (this.preview <= 0) {
        for (const c of this.cards) c.target = 0;
        Sfx3D.whoosh();
      }
    }
    if (this.closeTimer > 0) {
      this.closeTimer -= dt;
      if (this.closeTimer <= 0) {
        for (const c of this.picks) c.target = 0;
        this.picks = [];
      }
    }
    this._animate(dt);
  }

  afterTick(dt) {
    if (this.winner === 'defender') for (const c of this.cards) c.target = 1;
    this._animate(dt);
  }

  _animate(dt) {
    this.cards.forEach((c, i) => {
      c.open += (c.target - c.open) * Math.min(1, dt * 12);
      c.hinge.position.y = 0.06 + c.open * 2.2;
      c.hinge.rotation.set(c.open * 0.6, c.open * Math.PI, 0);
      c.hinge.scale.setScalar(Math.max(0.001, 1 - c.open * 0.85));
      c.hinge.visible = c.open < 0.97;
      c.piece.position.y = -0.9 + c.open * 1.15 + (c.matched ? Math.abs(Math.sin(this.time * 5 + i)) * 0.25 : 0);
      c.piece.rotation.y += dt * (c.matched ? 4 : 1);
      c.piece.rotation.x = -c.open * 0.55;
      const hot = this.keyCursor && i === this.cursor && !this.done;
      c.lid.material.emissive = c.lid.material.emissive || new THREE.Color();
      c.lid.scale.setScalar(hot ? 1.06 : 1);
      c.lid.position.y = hot ? 0.08 : 0;
    });
    for (const g of this.candles) g.material.opacity = 0.7 + Math.random() * 0.3;
  }

  hud(ctx, x, y, w, h) {
    this.hudText(ctx, this.preview > 0 ? 'MEMORISE!' : 'FIND THE PAIRS', x + 16, y + 20, { size: 14, title: true, color: '#b8a8ff' });
    this.hudText(ctx, `${this.found} / ${this.pairs}`, x + w - 110, y + 22, { size: 24, align: 'right', title: true, color: '#3ee07f' });
    this.hudTimer(ctx, x + w - 16, y + 22);
    this.hudHint(ctx, 'Click a lid to open it (or arrows + SPACE)');
  }
}
