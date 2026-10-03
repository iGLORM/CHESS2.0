// Grandmaster X, The Absolute: a live character portrait.
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the game HUD and dialogue bubbles. A towering king cut from violet crystal,
// gold-crowned, with a burning orange light inside that shows through his eyes. He rests
// both hands on a crystal greatsword planted in the last piece of the Great Board, while
// shards of it orbit him. Moods: cold (default), contempt, fury, cracking. Breathes,
// blinks, and a glint of light sweeps down his facets; the eyes flare in fury, and when
// cracking, a crack runs from crown to base and gold light leaks out of it.
LiveScenes.register({
  id: 'char_grandmasterx',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['cold', 'contempt', 'fury', 'cracking'],
  frames: { face: [11, 1, 40, 40] },
  moodFor(category) {
    return {
      gameStart: 'cold', bossCheck: 'cold', bossTaunt: 'cold', milestone: 'cold', playerCheck: 'cold',
      bossCapture: 'contempt', bossCaptureBig: 'contempt', playerLowHealth: 'contempt', playerCapture: 'contempt',
      playerCaptureBig: 'fury', rewind: 'fury',
      lowHealth: 'cracking', crack: 'cracking',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, clamp, sq, frac, bay, ramp, hash, noise2, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over } = K;
    let buf = null;

    // ---------- backdrop: the shattered Great Board in space, a cold halo behind the head ----------
    const BG = new Uint32Array(W * H);
    const HALO = ['#4aa6c0', '#2e7a98', '#1c5270', '#133450', '#1a1034', '#140a24', '#0c0616', '#06040a'].map(C);
    const NEB = ['#1a0c2c', '#2e1044', '#4a1660'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - CX, (y - 24) * 0.95);
      let c = ramp(HALO, d / 40, x, y);
      const m = noise2(x / 13, y / 11, 3) * 0.7 + noise2(x / 5, y / 5, 4) * 0.3;
      const tm = clamp((m - 0.52) * 3) * clamp((d - 18) / 14);
      if (tm > 0.05) c = ramp(NEB, tm, x, y);
      BG[y * W + x] = c;
    }
    // The last whole piece of board: a checker floor in perspective with a cyan edge.
    const PL = 71;
    const FLOOR_L = ['#76688c', '#5a4c74', '#42365a'].map(C), FLOOR_D = ['#2b0d36', '#1e0828', '#12041a'].map(C);
    const CRACK = [];
    for (let y = PL; y < H; y++) {
      const Z = 40 / (y - PL + 4);
      for (let x = 0; x < W; x++) {
        const X = (x - CX) * Z / 8;
        const i = Math.floor(X + 40), j = Math.floor(Z * 1.4);
        const seam = frac(X) < 0.1 && y > PL + 2;
        const row = Math.min(2, ((y - PL) / 3) | 0);
        let c = (i + j) % 2 ? FLOOR_D[row] : FLOOR_L[row];
        if (seam) c = C('#0a0410');
        if (y === PL) c = C('#5af0ff');
        BG[y * W + x] = c;
      }
    }
    for (const [x0, y0, len, dir] of [[2, 74, 14, 0.35], [44, 73, 16, 0.3]]) {
      let x = x0, y = y0;
      for (let k = 0; k < len; k++) { x += 1; y += dir + (hash(k, x0) - 0.5) * 1.2; if (y < H && y > PL) CRACK.push(Math.round(y) * W + Math.round(x)); }
    }
    // Tiny floating board fragments (sprites).
    function fragment(cells, tw, th, skew, seed) {
      const w = 4 * tw + 3 * skew, h = 3 * th + 3, px = new Uint32Array(w * h);
      const set = new Set(cells.map(([i, j]) => i + ',' + j));
      const at = (x, y) => { const jf = y / th, j = Math.floor(jf), i = Math.floor((x - jf * skew) / tw); return set.has(i + ',' + j) ? [i, j, (x - jf * skew) / tw - i, jf - j] : null; };
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const top = at(x, y);
        if (top) {
          const [i, j, fi, fj] = top, outer = (fi < 0.2 && !set.has((i - 1) + ',' + j)) || (fj < 0.34 && !set.has(i + ',' + (j - 1)));
          px[y * w + x] = outer ? C('#5af0ff') : C((i + j + seed) % 2 ? '#3a1250' : '#e8dfcf');
        } else if (y > 0 && at(x, y - 1)) px[y * w + x] = C('#6a3a80');
        else if (y > 1 && at(x, y - 2)) px[y * w + x] = C('#24102e');
      }
      return { w, h, px };
    }
    const FRAGS = [
      { spr: fragment([[0, 0], [1, 0], [1, 1]], 3, 2, 1, 0), x: 2, y: 9, k: 3, p: 0.4 },
      { spr: fragment([[0, 0], [1, 1], [1, 0]], 2, 2, 1, 0), x: 52, y: 7, k: 4, p: 4.0 },
    ];
    const STARS = Array.from({ length: 22 }, (_, i) => ({ x: hash(i, 11) * W | 0, y: hash(i, 12) * 66 | 0, k: 5 + (i % 13), p: hash(i, 13) * TAU }))
      .filter(s => Math.hypot(s.x - CX, s.y - 24) > 20);
    const MOTES = Array.from({ length: 7 }, (_, i) => ({ x: 3 + hash(i, 21) * 56, k: 2 + (i % 3), p: hash(i, 22), w: hash(i, 23) * TAU }));
    const vignette = K.vignette(C('#020104'), 0.45, 0.42);

    // ---------- Grandmaster X ----------
    const CRY = ['#fbe0ff', '#e090ff', '#b448e8', '#8424c8', '#56109a', '#300868'].map(C);
    const GOLD = ['#fff4b0', '#ffd23a', '#e0a010', '#a86c10', '#6a3c10'].map(C);
    const ROBE = ['#5e3480', '#422260', '#2c1640', '#1a0c26'].map(C), ROBE_EDGE = C('#8a50b0'), ROBE_RIM = C('#4a70a8');
    const GAUNT = ['#fff0ff', '#e8b8ff', '#b884e8', '#7a4ab0'].map(C);
    const BLADE = ['#f4feff', '#b4f0ff', '#6ac8e0', '#3a7a9a'].map(C);
    const RIM = C('#6af4ff'), FRIM = C('#ff7a30');
    const LINE = C('#1e1024'), SEAM = C('#3a0a6a'), HANDLINE = C('#4a2008');
    const TABLE = C('#2c0848'), TABLE2 = C('#3c0e5e'), TABLE_EDGE = C('#e090ff');
    const LN = Math.hypot(0.55, 0.65, 0.53), LX = -0.55 / LN, LY = -0.65 / LN, LZ = 0.53 / LN;
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H), CRYS = new Uint8Array(W * H), FACET = new Uint8Array(W * H);
    let rimC = RIM;

    // Part numbers, back to front.
    const P_CAPE = 1, P_BASE = 2, P_BODY = 3, P_SPIKE = 4, P_COLLAR = 5, P_HEAD = 6, P_CROWN = 7, P_SWORD = 8, P_HAND = 9;

    function tone(T, nx, ny) {
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * LX + ny * LY + nz * LZ;
      return { l, c: T[Math.round(clamp(1 - (l * 0.78 + 0.3)) * (T.length - 1))] };
    }
    function set(x, y, c, part, crystal, facet = 0) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = y * W + x;
      SPR[i] = c; PART[i] = part; CRYS[i] = crystal ? 1 : 0; FACET[i] = facet;
    }
    // Round material (gold, robe): cel-shaded from its normal, cool rim on the right.
    function shadeRound(x, y, nx, ny, T, part) {
      const { l, c } = tone(T, nx, ny);
      set(x, y, nx > 0.8 && l < 0.2 ? rimC : c, part, false);
    }
    // Crystal: the normal snapped to flat facets, so every face is one clean tone.
    function shadeFacet(x, y, nx, ny, part, steps) {
      const q = Math.round(nx * steps), qx = clamp(q / steps, -0.92, 0.92);
      const { l, c } = tone(CRY, qx, ny);
      set(x, y, nx > 0.86 && l < 0.3 ? rimC : c, part, true, part * 16 + q + 8);
    }
    function disc(cx, cy, rx, ry, T, part) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) shadeRound(x, y, nx * 0.95, ny * 0.95, T, part);
      }
    }
    // A crystal spike from (bx, by) to its tip (tx, ty), two facets (lit and shaded).
    function spike(bx, by, tx, ty, w, part) {
      const ax = tx - bx, ay = ty - by, len = Math.hypot(ax, ay), dx = ax / len, dy = ay / len;
      for (let y = Math.floor(Math.min(by, ty) - w - 1); y <= Math.max(by, ty) + w + 1; y++)
        for (let x = Math.floor(Math.min(bx, tx) - w - 1); x <= Math.max(bx, tx) + w + 1; x++) {
          const px = x - bx, py = y - by, along = px * dx + py * dy, side = -px * dy + py * dx;
          if (along < -0.5 || along > len) continue;
          const hw = w * (1 - along / len);
          if (Math.abs(side) > hw) continue;
          const lit = side * (dx < 0 ? 1 : -1) < 0;          // the facet facing up-left
          set(x, y, lit ? (Math.abs(side) > hw - 1 ? CRY[0] : CRY[1]) : (Math.abs(side) > hw - 1 ? CRY[4] : CRY[3]), part, true);
        }
    }

    // The head: an octagon-cut gem with a dark table on the front, where the face sits.
    const HR = { rx: 10.5, ry: 10.5 };
    function head(hx, hy) {
      for (let y = Math.floor(hy - HR.ry); y <= hy + HR.ry; y++) for (let x = Math.floor(hx - HR.rx); x <= hx + HR.rx; x++) {
        const nx = (x - hx) / HR.rx, ny = (y - hy) / HR.ry;
        if (Math.abs(nx) > 1 || Math.abs(ny) > 1 || Math.abs(nx) + Math.abs(ny) > 1.5) continue;
        const dx = x - hx, dy = y - hy;
        if (Math.abs(dx) <= 7 && dy >= -7 && dy <= 6 && Math.abs(dx) + Math.abs(dy) <= 10) {
          // Table: flat and deep; a bright bevel on its upper-left edge, a faint reflection band.
          const edge = Math.abs(dx) === 7 || dy === -7 || dy === 6 || Math.abs(dx) + Math.abs(dy) === 10;
          const c = edge ? (dx + dy < 0 ? TABLE_EDGE : SEAM) : (dx + dy * 1.3 < -7 ? TABLE2 : TABLE);
          set(x, y, c, P_HEAD, true);
          continue;
        }
        const a = Math.atan2(ny, nx), oct = Math.round(a / (TAU / 8)), q = oct * (TAU / 8);
        const fx = Math.cos(q) * 0.8, fy = Math.sin(q) * 0.8;
        const { l, c } = tone(CRY, fx, fy);
        set(x, y, fx > 0.5 && l < 0.35 && Math.abs(nx) > 0.85 ? rimC : c, P_HEAD, true, 100 + ((oct + 8) % 8));
      }
    }
    function crown(hx, top) {
      // Band.
      for (let y = top + 6; y <= top + 9; y++) for (let x = hx - 9; x <= hx + 9; x++) {
        const nx = (x - hx) / 9.5;
        if (y === top + 9 && Math.abs(nx) > 0.9) continue;
        shadeRound(x, y, nx * 0.9, y === top + 6 ? -0.5 : 0.1, GOLD, P_CROWN);
      }
      // Five points: tall in the middle and at the ends.
      for (const [px, h] of [[-8, 4], [-4, 3], [0, 5], [4, 3], [8, 4]]) {
        for (let j = 0; j < h; j++) {
          const w = j < h - 1 ? 1 : 0;
          for (let x = -w; x <= w; x++) shadeRound(hx + px + x, top + 5 - j, (px + x) / 10, -0.5, GOLD, P_CROWN);
        }
      }
      // A gold ball on the tall middle point. No cross on kings or bishops (AGENTS.md, Art Rules).
      shadeRound(hx, top + 1, -0.2, -0.5, GOLD, P_CROWN);
      disc(hx, top - 1.5, 2.3, 2.3, GOLD, P_CROWN);
    }

    function body(ox, oy, breath, t) {
      SPR.fill(0); PART.fill(0); CRYS.fill(0); FACET.fill(0);
      const u = t / LOOP;
      // Cape behind everything, widening to the floor, its hem stirring.
      for (let y = 36; y <= 77; y++) {
        const hw = y < 40 ? 12 + (y - 36) * 1.3 : 17.2 + (y - 40) * 0.12;
        const hem = y;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) {
          const hemY = 76 + Math.round(Math.sin(TAU * 3 * u + x * 0.5) * 0.7);
          if (hem > hemY) continue;
          const nx = (x - CX) / (hw + 0.5), edge = Math.abs(x - CX) >= hw - 1;
          if (hem >= hemY - 1) shadeRound(x + ox, y, nx, 0.1, GOLD, P_CAPE);
          else if (edge && y > 38) set(x + ox, y, nx < 0 ? ROBE_EDGE : ROBE_RIM, P_CAPE, false);
          else { const { c } = tone(ROBE, nx * 0.9, y < 40 ? -0.5 : 0.1); set(x + ox, y, c, P_CAPE, false); }
        }
      }
      // Base: a gold band on a crystal plinth.
      for (let y = 68; y <= 76; y++) {
        const hw = y <= 69 ? 15 : y === 76 ? 15 : 16;
        for (let x = CX - hw; x <= CX + hw; x++) {
          const nx = (x - CX) / (hw + 1);
          if (y <= 69) shadeRound(x + ox, y, nx, y === 68 ? -0.6 : 0, GOLD, P_BASE);
          else shadeFacet(x + ox, y, nx, 0.15, P_BASE, 3);
        }
      }
      // Crystal body: a king's column, narrow at the neck, flaring to the base.
      for (let y = 37; y <= 68; y++) {
        const hw = y < 43 ? 7.5 - (y - 37) * 0.25 : 6 + Math.pow((y - 43) / 25, 1.5) * 8;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) shadeFacet(x + ox, y + (y < 43 ? oy : 0), (x - CX) / (hw + 0.5), 0.05, P_BODY, 3);
      }
      // Shoulder spikes rising beside the head.
      spike(CX - 10 + ox, 41 + oy, CX - 19 + ox, 26 + oy, 4.4, P_SPIKE);
      spike(CX + 10 + ox, 41 + oy, CX + 19 + ox, 26 + oy, 4.4, P_SPIKE);
      spike(CX - 13 + ox, 45 + oy, CX - 24 + ox, 35 + oy, 3.2, P_SPIKE);
      spike(CX + 13 + ox, 45 + oy, CX + 24 + ox, 35 + oy, 3.2, P_SPIKE);
      disc(CX + ox, 36 + oy, 9.5, 2, GOLD, P_COLLAR);
      head(CX + ox, 24 + oy);
      crown(CX + ox, 6 + oy);
      // The greatsword, planted: blade, gold crossguard (the pommel gem is drawn on top).
      for (let y = 52; y <= 71; y++) for (let x = -1; x <= 1; x++) {
        if (y === 71 && x !== 0) continue;
        set(CX + x + ox, y, BLADE[x < 0 ? 0 : x === 0 ? (y % 9 === 0 ? 0 : 1) : 2], P_SWORD, false);
      }
      for (let x = -6; x <= 6; x++) for (let y = 51; y <= 52; y++) set(CX + x + ox, y + oy, y === 51 ? (x < 2 ? CRY[3] : CRY[4]) : CRY[5], P_SWORD, false);
      set(CX - 7 + ox, 51 + oy, BLADE[1], P_SWORD); set(CX + 7 + ox, 51 + oy, BLADE[2], P_SWORD);
      // Hands, dark crystal gauntlets resting on the pommel.
      disc(CX - 3.5 + ox, 48 + oy, 3.8, 3.1, GOLD, P_HAND);
      disc(CX + 3.5 + ox, 48 + oy, 3.8, 3.1, GOLD, P_HAND + 1);

      // Outline around the figure; seams where front parts overlap back ones; facet ridges.
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        const a = PART[i - 1], b = PART[i + 1], c = PART[i - W], d = PART[i + W];
        if (!p) { if (a || b || c || d) SPR[i] = LINE; }
        else if ((a && a < p) || (b && b < p) || (c && c < p) || (d && d < p)) {
          SPR[i] = p >= P_HAND ? HANDLINE : p === P_SWORD ? LINE : p === P_COLLAR || p === P_CROWN ? GOLD[4] : SEAM;
          CRYS[i] = 0;
        } else if (FACET[i] && a === p && FACET[i - 1] && FACET[i - 1] !== FACET[i]) {
          SPR[i] = x <= CX + ox ? CRY[0] : CRY[5];
        }
      }
      // The two gauntlets need a line between them too.
      for (let y = 45; y <= 51; y++) { const i = (y + oy) * W + CX + ox; if (PART[i] >= P_HAND) SPR[i] = HANDLINE; }
      // Knuckles: short creases on the front of each gauntlet.
      for (const kx of [-5, -3, 3, 5]) for (let y = 49; y <= 50; y++) { const i = (y + oy) * W + CX + kx + ox; if (PART[i] >= P_HAND) SPR[i] = GOLD[3]; }
    }

    // A glint of light sweeping down the crystal every 10 s.
    function glint(t) {
      const v = frac(6 * t / LOOP);
      if (v > 0.35) return;
      const pos = -20 + v / 0.35 * 120;
      for (let i = 0; i < W * H; i++) {
        if (!CRYS[i]) continue;
        const x = i % W, y = (i / W) | 0, s = x * 0.6 + y - pos;
        if (s >= 0 && s < 2) SPR[i] = CRY[0];
      }
    }

    // The crack from crown to base (relative to the figure), grown in mood 'cracking'.
    const CRACKPATH = [];
    {
      let x = CX + 2, y = 11;
      for (let k = 0; k < 64; k++) {
        CRACKPATH.push([Math.round(x), y]);
        y += 1;
        x += (hash(k, 77) - 0.5) * 1.8 + (y < 26 ? -0.12 : y < 40 ? 0.2 : -0.05);
        if (y > 70) break;
      }
    }
    const BRANCHES = [[14, -1, 5], [22, 1, 4], [34, -1, 6], [46, 1, 5], [54, -1, 4]];

    // ---------- face ----------
    const EYE = C('#ff6600'), EYE2 = C('#ffb040'), EYE3 = C('#fff0c0'), BROW = C('#f4b8ff'), LID = C('#6a2a96');
    const MOUTH = C('#8a2a18'), FIRE = C('#ff8a20'), FIRE2 = C('#ffe080'), LEAK = C('#fff4d0'), LEAK2 = C('#ffcc00');
    function eyes(hx, hy, kind, u) {
      const pulse = 0.5 + 0.5 * Math.sin(TAU * 8 * u);
      const ey = hy - 1;
      for (const s of [-1, 1]) {
        const ex = s < 0 ? hx - 4 : hx + 2;          // x .. x+2
        if (kind !== 'blink') {                      // the light inside glows around the eye
          const a = kind === 'fury' ? 0.6 : kind === 'dim' ? 0.22 : 0.32 + 0.12 * pulse;
          for (let y = ey - 2; y <= ey + 2; y++) for (let x = ex - 2; x <= ex + 4; x++) {
            const d = Math.hypot((x - ex - 1) / 3.2, (y - ey) / 2.2);
            if (d < 1) blendAt(buf, x, y, EYE, a * (1 - d));
          }
        }
        if (kind === 'blink') { for (let x = ex; x <= ex + 2; x++) put(buf, x, ey, MOUTH); continue; }
        if (kind === 'cold') {
          for (let x = ex; x <= ex + 2; x++) put(buf, x, ey, EYE);
          put(buf, ex + 1, ey, EYE3); put(buf, s < 0 ? ex + 2 : ex, ey, EYE2);
        } else if (kind === 'half') {                // contempt: one eye open, one squinting down at you
          if (s < 0) { for (let x = ex; x <= ex + 2; x++) put(buf, x, ey, EYE); put(buf, ex + 1, ey, EYE3); }
          else { put(buf, ex, ey + 1, EYE); put(buf, ex + 1, ey + 1, EYE3); put(buf, ex + 2, ey + 1, EYE); for (let x = ex; x <= ex + 2; x++) put(buf, x, ey, LID); }
        } else if (kind === 'fury') {
          for (let x = ex; x <= ex + 2; x++) { put(buf, x, ey, EYE2); put(buf, x, ey + 1, EYE); }
          put(buf, ex + 1, ey, EYE3); put(buf, s < 0 ? ex + 2 : ex, ey, EYE3);
        } else {                                      // dim, cracking: rounder, flickering, unsure
          put(buf, ex, ey, EYE); put(buf, ex + 1, ey, EYE2); put(buf, ex + 2, ey, EYE);
          put(buf, ex + 1, ey - 1, EYE); put(buf, ex + 1, ey + 1, EYE);
        }
      }
    }
    function brows(hx, hy, kind) {
      const L = hx - 5, R = hx + 2, y = hy - 3;       // left brow L..L+3, right brow R..R+3
      const P = (x, yy) => put(buf, x, yy, BROW);
      if (kind === 'flat') {                          // level and heavy, inner ends pressed down
        P(L, y); P(L + 1, y); P(L + 2, y); P(L + 3, y + 1);
        P(R, y + 1); P(R + 1, y); P(R + 2, y); P(R + 3, y);
      } else if (kind === 'contempt') {               // one arched high, one low on the squint
        P(L, y); P(L + 1, y - 1); P(L + 2, y - 1); P(L + 3, y - 1);
        P(R, y + 1); P(R + 1, y + 1); P(R + 2, y + 1); P(R + 3, y);
      } else if (kind === 'fury') {                   // a steep V down to the eyes
        P(L, y - 1); P(L + 1, y); P(L + 2, y + 1); P(L + 3, y + 1); P(L + 3, y + 2);
        P(R + 3, y - 1); P(R + 2, y); P(R + 1, y + 1); P(R, y + 1); P(R, y + 2);
      } else {                                        // worried: inner ends lifted
        P(L, y + 1); P(L + 1, y); P(L + 2, y - 1); P(L + 3, y - 1);
        P(R, y - 1); P(R + 1, y - 1); P(R + 2, y); P(R + 3, y + 1);
      }
    }

    function shard(x, y, s, lit, hot) {
      for (let j = -s * 2; j <= s * 2; j++) {
        const w = s - Math.abs(j) / 2;
        for (let i = -Math.floor(w); i <= Math.floor(w); i++) {
          const c = hot ? (i < 0 ? '#ffe0b0' : '#ff7a30') : lit ? (i < 0 ? '#ffe0ff' : '#c040f0') : (i < 0 ? '#b060d8' : '#5a1a80');
          put(buf, x + i, y + j, C(c));
        }
      }
    }

    function frame(t, mood, since) {
      const u = t / LOOP, age = ((t - since) % LOOP + LOOP) % LOOP;
      buf.set(BG);
      for (const s of STARS) {
        const v = Math.sin(TAU * s.k * u + s.p);
        if (v > 0.1) put(buf, s.x, s.y, C(v > 0.8 ? '#ffffff' : s.x % 2 ? '#c8a0ff' : '#a0e8ff'));
      }
      // The halo: a ring of light dashes, slowly turning.
      for (let a = 0; a < 96; a++) {
        const ang = a / 96 * TAU;
        const f = frac(a / 8 - 24 * u);
        if (f > 0.6) continue;
        put(buf, CX + Math.cos(ang) * 19, 24 + Math.sin(ang) * 18, f < 0.12 ? (mood === 'fury' ? C('#ffb070') : C('#b0faff')) : mood === 'fury' ? C('#8a3a30') : C('#3a92b0'));
      }
      for (const f of FRAGS) K.blit(buf, f.spr, f.x + Math.round(Math.sin(TAU * (f.k - 1) * u + f.p)), f.y + Math.round(2 * Math.sin(TAU * f.k * u + f.p * 2)));
      const cp = 0.5 + 0.5 * Math.sin(TAU * 6 * u);
      for (let k = 0; k < CRACK.length; k++) buf[CRACK[k]] = Math.sin(TAU * 12 * u - k * 0.4) > 0.2 ? C('#5af0ff') : C(cp > 0.5 ? '#2aa0c0' : '#1a6a8a');

      for (const m of MOTES) {
        const v = frac(m.k * u + m.p), x = m.x + Math.sin(v * 6 + m.w) * 2, y = 79 - v * 70;
        if (v < 0.85) blendAt(buf, x, y, m.k % 2 ? C('#d932ff') : C('#5af0ff'), 0.7 * (1 - v));
      }
      vignette(buf);

      // Pose.
      const breath = Math.sin(TAU * 15 * u) > 0.3 ? 1 : 0;
      let ox = 0, oy = breath;
      if (mood === 'fury') ox = Math.sin(TAU * 600 * u) > 0.6 ? 1 : 0;
      if (mood === 'contempt') oy -= 1;                          // chin up
      if (mood === 'cracking' && age < 0.5) ox = Math.sin(age * 60) > 0 ? 1 : 0;
      rimC = mood === 'fury' ? FRIM : RIM;

      // Orbiting shards (behind first).
      const hot = mood === 'fury';
      const orb = [0, 1, 2].map(i => {
        const a = TAU * (3 * u + i / 3);
        return { x: CX + Math.cos(a) * 26, y: 52 + Math.sin(a) * 6 + Math.round(Math.sin(TAU * 7 * u + i)), front: Math.sin(a) > 0, s: i === 1 ? 1 : 2 };
      });
      if (mood === 'cracking') for (const o of orb) o.y += Math.round(Math.min(1, age / 2) * 4);   // they sag
      for (const o of orb) if (!o.front) shard(o.x, o.y, o.s, false, hot);

      body(ox, oy, breath, t);
      glint(t);
      // A faint aura of crystal light hugging the silhouette, breathing (fire in fury, gold when cracking).
      // (The power fails when he cracks: no aura then.)
      if (mood !== 'cracking') {
        const auraC = hot ? C('#ffa040') : C('#d932ff');
        const auraA = (hot ? 0.5 : 0.22) + 0.1 * Math.sin(TAU * 10 * u);
        for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
          const i = y * W + x;
          if (SPR[i]) continue;
          if (SPR[i - 2] || SPR[i + 2] || SPR[i - 2 * W] || SPR[i + 2 * W]) blend(buf, i, auraC, auraA);
          else if (hot && (SPR[i - 3] || SPR[i + 3] || SPR[i - 3 * W] || SPR[i + 3 * W])) blend(buf, i, auraC, auraA * 0.5);
        }
      }
      over(buf, SPR);

      const hx = CX + ox, hy = 24 + oy;
      // Pommel gem, burning like the eyes.
      const gp = 0.5 + 0.5 * Math.sin(TAU * 8 * u);
      put(buf, hx, 44 + oy, EYE); put(buf, hx, 43 + oy, gp > 0.5 || hot ? EYE3 : EYE2); put(buf, hx - 1, 44 + oy, EYE2); put(buf, hx + 1, 44 + oy, EYE);
      put(buf, hx, 45 + oy, EYE); put(buf, hx, 42 + oy, LINE); put(buf, hx - 1, 43 + oy, LINE); put(buf, hx + 1, 43 + oy, LINE);
      put(buf, hx - 2, 44 + oy, LINE); put(buf, hx + 2, 44 + oy, LINE);
      // Crown gem.
      put(buf, hx, 13 + oy, hot ? FIRE : C('#5af0ff')); put(buf, hx - 5, 14 + oy, C('#d932ff')); put(buf, hx + 5, 14 + oy, C('#d932ff'));

      const blink = mood !== 'fury' && frac(12 * u + 0.4) < 0.025;
      if (mood === 'cold') {
        eyes(hx, hy, blink ? 'blink' : 'cold', u); brows(hx, hy, 'flat');
        for (let x = hx - 2; x <= hx + 2; x++) put(buf, x, hy + 4, MOUTH);
      } else if (mood === 'contempt') {
        eyes(hx, hy, blink ? 'blink' : 'half', u); brows(hx, hy, 'contempt');
        for (let x = hx - 2; x <= hx + 1; x++) put(buf, x, hy + 4, MOUTH);
        put(buf, hx + 2, hy + 3, MOUTH); put(buf, hx + 3, hy + 3, MOUTH);       // one-sided sneer
      } else if (mood === 'fury') {
        eyes(hx, hy, 'fury', u); brows(hx, hy, 'fury');
        for (let x = hx - 3; x <= hx + 3; x++) for (let y = hy + 3; y <= hy + 5; y++) {
          if ((x === hx - 3 || x === hx + 3) && y !== hy + 4) continue;
          put(buf, x, y, y === hy + 4 ? (Math.sin(TAU * 90 * u + x) > 0 ? FIRE2 : FIRE) : MOUTH);
        }
        // Heat: sparks rising from the crown.
        for (let i = 0; i < 5; i++) {
          const v = frac(20 * u + i / 5), x = hx - 8 + i * 4 + Math.round(Math.sin(v * 7 + i) * 1.5), y = 12 + oy - v * 12;
          put(buf, x, y, v < 0.5 ? FIRE2 : FIRE);
        }
      } else {
        eyes(hx, hy, blink ? 'blink' : Math.sin(TAU * 45 * u) > 0.85 ? 'blink' : 'dim', u); brows(hx, hy, 'worried');
        put(buf, hx - 1, hy + 4, MOUTH); put(buf, hx, hy + 4, MOUTH); put(buf, hx, hy + 5, MOUTH); put(buf, hx - 1, hy + 5, MOUTH);
        // The crack grows from crown to base; light leaks out of it.
        const n = Math.round(CRACKPATH.length * clamp(age / 0.8));
        const flick = 0.5 + 0.5 * Math.sin(TAU * 30 * u);
        for (let k = 0; k < n; k++) {
          const [x, y] = CRACKPATH[k], X = x + ox, Y = y + oy;
          blendAt(buf, X - 1, Y, LEAK2, 0.5); blendAt(buf, X + 1, Y, LEAK2, 0.5);
          put(buf, X, Y, LEAK);
        }
        for (const [at, dir, len] of BRANCHES) {
          if (at >= n) continue;
          const [x0, y0] = CRACKPATH[at];
          for (let j = 1; j <= len; j++) put(buf, x0 + ox + dir * j, y0 + oy + (j >> 1), j < len ? LEAK2 : LEAK);
        }
        // Beams of light escaping sideways.
        if (n >= CRACKPATH.length) for (const [k, dir] of [[10, -1], [30, 1], [50, -1]]) {
          const [x, y] = CRACKPATH[k];
          for (let j = 1; j < 8; j++) blendAt(buf, x + ox + dir * j, y + oy - j * 0.3, LEAK, (0.45 - j * 0.05) * (0.6 + 0.4 * flick));
        }
        // A chip falls away, over and over.
        const v = frac(5 * u);
        if (v < 0.7) { put(buf, hx + 9 + Math.round(v * 3), 30 + oy + Math.round(v * v * 40), CRY[1]); }
      }

      for (const o of orb) if (o.front) shard(o.x, o.y, o.s, true, hot);
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'cold', (state && state.since) || 0);
    };
  },
});
