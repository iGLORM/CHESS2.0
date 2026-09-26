// Rhythm highway. Notes (little pawns) ride three neon lanes towards the hit
// line on the beat; tap the lane as they cross it.
class RhythmTap extends Game3D {
  constructor() {
    super('Rhythm Rush');
  }

  static LANES = [-1.4, 0, 1.4];
  static HIT_Z = 2;
  static KEYS = [['ArrowLeft', 'a', 'j', '1'], ['ArrowDown', 'ArrowUp', 's', 'k', '2', ' '], ['ArrowRight', 'd', 'l', '3']];
  static COLORS = [0xff4d6d, 0x3ee07f, 0x4cc9f0];

  setup() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x07031a);
    scene.fog = new THREE.Fog(0x07031a, 12, 40);
    this.lights({ hemi: 0.7, keyI: 1.2 });
    const stars = Mini3D.starfield(300, 80);
    stars.material.fog = false;
    scene.add(stars);

    this.roadTex = Mini3D.checkerTexture(2, '#2a1a5a', '#120a2c', 8);
    this.roadTex.wrapS = this.roadTex.wrapT = THREE.RepeatWrapping;
    this.roadTex.repeat.set(1.5, 30);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 60), new THREE.MeshStandardMaterial({ map: this.roadTex }));
    road.rotation.x = -Math.PI / 2;
    road.position.z = -26;
    scene.add(road);
    this.laneLines = RhythmTap.LANES.map((x, i) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 60), new THREE.MeshBasicMaterial({ color: RhythmTap.COLORS[i], transparent: true, opacity: 0.4, toneMapped: false }));
      l.position.set(x, 0.01, -26);
      scene.add(l);
      return l;
    });
    // Hit pads
    this.pads = RhythmTap.LANES.map((x, i) => {
      const pad = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.58, 20), new THREE.MeshBasicMaterial({ color: RhythmTap.COLORS[i], toneMapped: false, side: THREE.DoubleSide }));
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, 0.02, RhythmTap.HIT_Z);
      scene.add(pad);
      const glow = Mini3D.glowSprite(RhythmTap.COLORS[i], 2.2);
      glow.position.set(x, 0.3, RhythmTap.HIT_Z);
      glow.material.opacity = 0;
      scene.add(glow);
      return { pad, glow, flash: 0 };
    });
    // Speakers that pump to the beat
    this.speakers = [];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0x1a1030, emissive: i % 2 ? 0xff2fb4 : 0x6a2cff, emissiveIntensity: 0.3, flatShading: true }));
        sp.position.set(s * 3.4, 0.45 + (i % 2) * 0.95, -2 - Math.floor(i / 2) * 6);
        scene.add(sp);
        this.speakers.push(sp);
      }
    }
    this.player = this.playerPiece();
    this.player.position.set(0, 0, 3.4);
    this.player.scale.setScalar(0.9);
    this.player.rotation.y = Math.PI;
    scene.add(this.player);

    this.camera.fov = 58;
    this.camera.position.set(0, 3.2, 6.2);
    this.camera.lookAt(0, 0, -4);

    this.bpm = 108 + this.hard * 36;
    this.beat = 60 / this.bpm;
    this.speed = 9 + this.hard * 5;
    this.window = 0.15 - this.hard * 0.04;
    const count = Math.round(14 + this.hard * 8 + (this.isDuel ? 4 : 0));
    this.notes = [];
    const scale = [60, 62, 64, 67, 69, 72, 74, 76];
    let t = 1.2;
    const geo = new THREE.CylinderGeometry(0.34, 0.4, 0.2, 10);
    for (let i = 0; i < count; i++) {
      const lane = (Math.random() * 3) | 0;
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: RhythmTap.COLORS[lane], emissive: RhythmTap.COLORS[lane], emissiveIntensity: 0.6, flatShading: true }));
      this.scene.add(mesh);
      this.notes.push({ t, lane, mesh, state: 'live', note: scale[(Math.random() * scale.length) | 0] });
      // Mostly on the beat, sometimes half beats; chords at higher difficulty.
      if (this.hard > 0.5 && Math.random() < 0.15) {
        const lane2 = (lane + 1 + ((Math.random() * 2) | 0)) % 3;
        const m2 = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: RhythmTap.COLORS[lane2], emissive: RhythmTap.COLORS[lane2], emissiveIntensity: 0.6, flatShading: true }));
        this.scene.add(m2);
        this.notes.push({ t, lane: lane2, mesh: m2, state: 'live', note: scale[0] });
      }
      t += this.beat * (Math.random() < 0.25 + this.hard * 0.25 ? 0.5 : 1);
    }
    this.songEnd = t + 0.6;
    this.hitCount = 0;
    this.missCount = 0;
    this.combo = 0;
    this.need = 0.7 + this.hard * 0.1;
    this.lastBeat = -1;
  }

  _tap(lane) {
    if (this.done) return;
    const pad = this.pads[lane];
    pad.flash = 1;
    let best = null, bestD = Infinity;
    for (const n of this.notes) {
      if (n.state !== 'live' || n.lane !== lane) continue;
      const d = Math.abs(n.t - this.time);
      if (d < bestD) { best = n; bestD = d; }
    }
    if (best && bestD <= this.window) {
      best.state = 'hit';
      this.hitCount++;
      this.combo++;
      const perfect = bestD < this.window * 0.4;
      this.burst.spawn(new THREE.Vector3(RhythmTap.LANES[lane], 0.4, RhythmTap.HIT_Z), [RhythmTap.COLORS[lane], 0xffffff], perfect ? 22 : 12, perfect ? 6 : 4, { up: 3 });
      Sfx3D.blip(best.note + 12);
      if (perfect) this.aberration = 0.012;
      if (this.combo > 0 && this.combo % 8 === 0) this.say(`${this.combo} COMBO!`, '#ffd166');
    } else {
      this.combo = 0;
      Sfx3D.thud();
      this.shake = 0.15;
    }
  }

  onKey(k) {
    RhythmTap.KEYS.forEach((keys, i) => { if (keys.includes(k)) this._tap(i); });
  }

  onPress() {
    this._tap(this.pointer.x < 0.38 ? 0 : this.pointer.x > 0.62 ? 2 : 1);
  }

  bot() {
    const lateness = (10 - this.botSkill) * 0.012;
    for (const n of this.notes) {
      if (n.state !== 'live' || n.botDone) continue;
      if (this.time >= n.t - 0.02 + lateness) {
        n.botDone = true;
        if (Math.random() > (10 - this.botSkill) * 0.03) this._tap(n.lane);
      }
    }
  }

  tick(dt) {
    // Beat: kick and hat, speakers pump.
    const b = Math.floor(this.time / this.beat);
    if (b !== this.lastBeat && this.time < this.songEnd) {
      this.lastBeat = b;
      Sfx3D._p(b % 2 ? [[0, 'hat', null, 0, 0.5]] : [[0, 'kick', null, 0, 0.7], [0, 'hat', null, 0, 0.3]]);
      this.pump = 1;
    }
    for (const n of this.notes) {
      if (n.state === 'live' && this.time - n.t > this.window) {
        n.state = 'miss';
        this.missCount++;
        this.combo = 0;
        this.tint = 0.3;
      }
    }
    this._animate(dt);
    const total = this.notes.length;
    if (this.missCount > total * (1 - this.need)) {
      this.say('OFF BEAT!', '#ff4d6d');
      this.lose();
    } else if (this.time >= this.songEnd) {
      this.say(`${Math.round(this.hitCount / total * 100)}% - ENCORE!`, '#3ee07f');
      this.win();
    }
  }

  _animate(dt) {
    this.roadTex.offset.y += dt * this.speed / 1.4 * 0.5;
    this.pump = Math.max(0, (this.pump || 0) - dt * 5);
    this.tint = Math.max(0, this.tint - dt * 1.5);
    for (const s of this.speakers) {
      s.scale.setScalar(1 + this.pump * 0.12);
      s.material.emissiveIntensity = 0.3 + this.pump * 0.9;
    }
    this.player.position.y = this.pump * 0.25;
    this.pads.forEach(p => {
      p.flash = Math.max(0, p.flash - dt * 5);
      p.glow.material.opacity = p.flash;
      p.pad.scale.setScalar(1 + p.flash * 0.3 + this.pump * 0.08);
    });
    for (const n of this.notes) {
      const z = RhythmTap.HIT_Z - (n.t - this.time) * this.speed;
      if (n.state === 'hit') {
        n.mesh.position.y += dt * 8;
        n.mesh.scale.multiplyScalar(0.9);
        n.mesh.visible = n.mesh.scale.x > 0.05;
        continue;
      }
      n.mesh.visible = z > -40 && z < 8;
      n.mesh.position.set(RhythmTap.LANES[n.lane], 0.12 + (n.state === 'miss' ? -0.5 : 0), z);
      n.mesh.rotation.y += dt * 3;
      if (n.state === 'miss') n.mesh.material.color.set(0x444444);
    }
  }

  afterTick(dt) {
    this._animate(dt);
  }

  hud(ctx, x, y, w, h) {
    const total = this.notes.length;
    this.hudText(ctx, 'HIT THE BEAT', x + 16, y + 20, { size: 14, title: true, color: '#4cc9f0' });
    this.hudBar(ctx, x + 16, y + 38, 220, 12, Math.min(1, this.time / this.songEnd), '#b8a8ff');
    this.hudText(ctx, `HITS ${this.hitCount}`, x + w - 16, y + 20, { size: 18, align: 'right', color: '#3ee07f' });
    const allowed = Math.floor(total * (1 - this.need));
    this.hudText(ctx, `MISSES ${this.missCount}/${allowed}`, x + w - 16, y + 44, { size: 14, align: 'right', color: this.missCount >= allowed ? '#ff4d6d' : '#a89fd0' });
    if (this.combo >= 3) this.hudText(ctx, `x${this.combo}`, x + w / 2, y + 30, { size: 26, align: 'center', title: true, color: '#ffd166' });
    this.hudHint(ctx, '← ↓ → (or A S D / click a lane) as the notes hit the rings');
  }
}
