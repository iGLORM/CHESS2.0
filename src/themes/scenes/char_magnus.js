// Coach Magnus, The Pixel Coach: the Training puzzles' coach, a live character portrait.
// An old white king (crown with points and a gem ball, never a cross) with round gold
// spectacles, bushy brows, a walrus mustache and a green coach's scarf, in his study at
// night: a chalkboard with a little diagram, a warm hanging lamp on the left, cool
// moonlight rimming him on the right, a desk with an hourglass running.
//
// 62x80 like every character; the `face` frame is the close-up (puzzle panel, bubbles).
// Moods follow the puzzle: calm (default), thinking (checking a move), proud (a good or
// winning move), oops (a wrong move) and hint (a hint or the answer). PuzzleScreen sets
// them with LiveScenes.setMood('char_magnus', mood).
LiveScenes.register({
  id: 'char_magnus',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['calm', 'thinking', 'proud', 'oops', 'hint'],
  frames: { face: [11, 4, 40, 40] },
  moodFor(category) {
    return {
      levelStart: 'calm', welcome: 'calm', customPuzzle: 'calm', returnVisit: 'calm', idle: 'calm',
      checking: 'thinking', opponentThinking: 'thinking',
      brilliant: 'proud', good: 'proud', solved: 'proud', alsoWorks: 'proud', streak: 'proud', bandComplete: 'proud', sandboxWin: 'proud',
      wrongMove: 'oops', blunder: 'oops', inaccuracy: 'oops', sandboxLoss: 'oops', patternStruggle: 'oops',
      reveal: 'hint', hint: 'hint', encouragement: 'hint',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, clamp, sq, frac, ramp, hash } = PixelKit;
    const { put, blendAt, over } = PixelKit.surface(W, H);
    let buf = null;

    // ---------- backdrop: the study at night ----------
    const BG = new Uint32Array(W * H);
    const WALL = ['#5a3a3e', '#4a3040', '#3a2638', '#2c1e30', '#20162a'].map(C);
    const LAMP = [10, 3];                                        // the hanging lamp, top left
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - LAMP[0], (y - LAMP[1]) * 0.9);
      BG[y * W + x] = ramp(WALL, 0.25 + x / W * 0.55 - 0.45 * Math.exp(-sq(d / 26)), x, y);
    }
    // The chalkboard: a wooden frame round dark slate, a faint grid in its corners.
    const SLATE = ['#2e4a44', '#26403c', '#1e3432'].map(C), FRAME = C('#7a4e32'), FRAMEL = C('#a8703e'), FRAMED = C('#4a2c22');
    const BX0 = 3, BX1 = 58, BY0 = 5, BY1 = 44;
    for (let y = BY0; y <= BY1; y++) for (let x = BX0; x <= BX1; x++) {
      const edge = x === BX0 || x === BX1 || y === BY0 || y === BY1;
      const d = Math.hypot(x - LAMP[0], y - LAMP[1]);
      BG[y * W + x] = edge ? (y === BY0 ? FRAMEL : x === BX1 || y === BY1 ? FRAMED : FRAME)
        : ramp(SLATE, 0.3 + (y - BY0) / 60 + (d > 30 ? 0.3 : 0), x, y);
    }
    const CHALK = C('#d8e4dc'), CHALKD = C('#8aa49a');
    // A little 4x4 diagram, top left of the board, and an arrow drawn across it.
    for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) if ((r + q) % 2) {
      for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) put(BG, 6 + q * 3 + x, 8 + r * 3 + y, CHALKD);
    }
    for (let i = 0; i <= 12; i++) put(BG, 6 + i, 20 - i, CHALKD);
    // Notes on the right: a few chalk scribbles, "1. e4" in spirit.
    for (const [x0, y0, len] of [[44, 9, 10], [44, 13, 7], [46, 17, 9], [44, 21, 6]]) {
      for (let i = 0; i < len; i++) if (hash(x0 + i, y0) > 0.25) put(BG, x0 + i, y0 + (hash(i, y0) > 0.8 ? -1 : 0), CHALKD);
    }
    // The chalk tray under the board.
    for (let x = BX0 + 1; x < BX1; x++) { put(BG, x, BY1 + 1, FRAMEL); put(BG, x, BY1 + 2, FRAMED); }
    put(BG, 40, BY1, CHALK); put(BG, 41, BY1, CHALK); put(BG, 43, BY1, C('#e8c070'));
    // The lamp: a brass shade on a cord.
    for (let y = 0; y < 2; y++) put(BG, LAMP[0], y, C('#2a1a20'));
    const SHADE = [C('#f0c060'), C('#c08a3a'), C('#7a5228')];
    for (let y = 2; y <= 5; y++) for (let x = LAMP[0] - (y - 1); x <= LAMP[0] + (y - 1); x++) {
      put(BG, x, y, SHADE[x < LAMP[0] - 1 ? 0 : x > LAMP[0] + 1 ? 2 : 1]);
    }
    // The desk, warm wood, lit along its front edge.
    const DESK = ['#9a6a42', '#7a4e32', '#5a3626', '#3e2420'].map(C), DESKRIM = C('#e8b070');
    for (let y = 70; y < H; y++) for (let x = 0; x < W; x++) {
      BG[y * W + x] = y === 70 ? DESKRIM : ramp(DESK, (y - 71) / 9 + x / W * 0.35, x, y);
    }
    // A closed book at the left edge of the desk.
    for (let y = 66; y < 70; y++) for (let x = 1; x < 10; x++) put(BG, x, y, y === 66 ? C('#c0485a') : y === 69 ? C('#e8dcc0') : C('#8a2e44'));
    // The hourglass on the right (its sand runs in frame()).
    const HGX = 54, HGY = 60;
    const GLASS = C('#a8c4d8'), WOOD = C('#5a3626');
    for (let x = HGX - 3; x <= HGX + 3; x++) { put(BG, x, HGY, WOOD); put(BG, x, HGY + 10, WOOD); }
    for (let y = HGY + 1; y < HGY + 10; y++) {
      const hw = Math.max(0, Math.round(2.5 * Math.abs(y - (HGY + 5)) / 4.5));
      put(BG, HGX - hw - 1, y, GLASS); put(BG, HGX + hw + 1, y, GLASS);
    }

    // ---------- Magnus ----------
    const CREAM = ['#fffaf0', '#f4e6cc', '#dcc4a8', '#aa8e8c', '#6e5672'].map(C);
    const GOLD = ['#fff0a0', '#f2c24a', '#c88a2a', '#8a5420'].map(C);
    const SCARF = ['#7ad0a0', '#3a9a6a', '#22704e', '#164a3a'].map(C);
    const RIM = C('#a8c8f0'), LINE = C('#2a1a28'), SEAM = C('#a8909a'), HANDLINE = C('#6e5672');
    // Warm lamp light from the upper left.
    const LN = Math.hypot(0.62, 0.6, 0.5), LX = -0.62 / LN, LY = -0.6 / LN, LZ = 0.5 / LN;
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H);

    function shade(x, y, nx, ny, part, tones) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * LX + ny * LY + nz * LZ;
      const i = y * W + x;
      SPR[i] = nx > 0.8 && l < 0.2 && tones === CREAM ? RIM : tones[Math.round(clamp(1 - (l * 0.62 + 0.42)) * (tones.length - 1))];
      PART[i] = part;
    }
    function disc(cx, cy, rx, ry, part, tones = CREAM) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.95, ny * 0.95, part, tones);
      }
    }

    // hand: where the right hand is ('chest', 'chin', 'up', 'thumb', 'glasses').
    function body(ox, oy, hand) {
      SPR.fill(0); PART.fill(0);
      // Base, then a tall skirt (a king is taller than a pawn).
      for (let y = 63; y <= 70; y++) {
        const hw = 15 - (y < 65 ? 65 - y : 0) - (y === 70 ? 1 : 0);
        for (let x = CX - hw; x <= CX + hw; x++) shade(x + ox, y + oy, (x - CX) / 16, y < 65 ? -0.6 : 0.1, 1, CREAM);
      }
      for (let y = 42; y <= 63; y++) {
        const hw = 7 + Math.pow((y - 42) / 21, 1.7) * 9;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) shade(x + ox, y + oy, (x - CX) / (hw + 0.5), 0.1, 2, CREAM);
      }
      // The scarf: a wrap round the neck and a tail hanging on his right.
      disc(CX + ox, 41 + oy, 11, 3.2, 3, SCARF);
      for (let y = 43; y <= 55; y++) for (let x = 34; x <= 37; x++) shade(x + ox + (y > 50 ? 1 : 0), y + oy, (x - 35.5) / 3, 0.2, 3, SCARF);
      disc(CX + ox, 28 + oy, 11.5, 11.5, 4);                              // head
      // Crown: a band, three points with balls, a ruby in front. No cross, ever.
      const by = 15 + oy;
      for (let y = by; y <= by + 2; y++) for (let x = CX - 8; x <= CX + 8; x++) shade(x + ox, y, (x - CX) / 9, -0.2, 7, GOLD);
      for (const [px, top] of [[-6, 9], [0, 7], [6, 9]]) {
        for (let y = top; y < 15; y++) {
          const hw = Math.round((y - top) / (15 - top) * 2.4);
          for (let x = px - hw; x <= px + hw; x++) shade(CX + x + ox, y + oy, (x - px) / 3 - 0.2, -0.3, 7, GOLD);
        }
        disc(CX + px + ox, top - 1.5 + oy, 1.6, 1.6, 8, GOLD);
      }
      // Hands: the left clasps the scarf at the chest; the right does what the mood says.
      disc(CX - 5 + ox, 48 + oy, 3.6, 3.3, 5);
      const R = { chest: [CX + 4, 49], chin: [CX + 4, 40], up: [CX + 15, 24], thumb: [CX + 14, 42], glasses: [CX + 9, 30] }[hand] || [CX + 4, 49];
      disc(R[0] + ox, R[1] + oy, 3.6, 3.3, 6);
      if (hand === 'up') for (let y = R[1] - 7; y < R[1] - 2; y++) { shade(R[0] + ox, y + oy, -0.3, -0.2, 6, CREAM); shade(R[0] + 1 + ox, y + oy, 0.3, -0.2, 6, CREAM); }
      if (hand === 'thumb') for (let y = R[1] - 6; y < R[1] - 2; y++) { shade(R[0] - 1 + ox, y + oy, -0.3, -0.2, 6, CREAM); shade(R[0] + ox, y + oy, 0.3, -0.2, 6, CREAM); }
      // Outline round the figure; a seam where a front part overlaps one behind it.
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        const n = [PART[i - 1], PART[i + 1], PART[i - W], PART[i + W]];
        if (!p) { if (n.some(q => q)) SPR[i] = LINE; }
        else if (n.some(q => q && q < p)) SPR[i] = p >= 5 ? HANDLINE : SEAM;
      }
      put(SPR, CX + ox, by + 1, C('#e0304a')); put(SPR, CX + 1 + ox, by + 1, C('#ff8a9a'));   // ruby
    }

    const EYE = C('#1e1420'), SHINE = C('#ffffff'), RING = C('#d8a030'), RINGD = C('#8a5a20');
    const HAIR = C('#ffffff'), HAIRD = C('#c8c4dc'), BROWD = C('#9a8aac'), MOUTH = C('#5a2a34'), BLUSH = C('#f2a0a0');
    const DROP = C('#8ae0ff'), DROPD = C('#3a8ab0'), BULB = C('#fff2a0'), BULBD = C('#e8b030'), SPARK = C('#fff4c0');

    // Spectacles: two round gold rims and a bridge; the eyes inside them.
    function glasses(hx, hy, glint) {
      for (const ex of [hx - 5, hx + 4]) {
        for (let x = ex - 1; x <= ex + 2; x++) { put(buf, x, hy - 1, RING); put(buf, x, hy + 3, RINGD); }
        for (let y = hy; y <= hy + 2; y++) { put(buf, ex - 2, y, RING); put(buf, ex + 3, y, RINGD); }
        if (glint >= 0 && glint < 4) put(buf, ex - 1 + glint, hy + (glint < 2 ? 0 : 1), SHINE);
      }
      put(buf, hx - 2, hy, RING); put(buf, hx - 1, hy, RING); put(buf, hx, hy, RING); put(buf, hx + 1, hy, RING);
    }
    function eyes(hx, hy, kind) {
      for (const ex of [hx - 5, hx + 4]) {
        if (kind === 'blink') { put(buf, ex, hy + 2, EYE); put(buf, ex + 1, hy + 2, EYE); continue; }
        if (kind === 'smile') { put(buf, ex - 1, hy + 2, EYE); put(buf, ex, hy + 1, EYE); put(buf, ex + 1, hy + 1, EYE); put(buf, ex + 2, hy + 2, EYE); continue; }
        const dy = kind === 'up' ? -1 : 0;
        for (let y = hy + 1; y <= hy + 2; y++) for (let x = ex; x <= ex + 1; x++) put(buf, x, y + dy, EYE);
        put(buf, ex + 1, hy + 1 + dy, SHINE);
      }
    }
    function brows(hx, hy, kind) {
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? hx - 7 : hx + 3;
        const lift = kind === 'high' ? -1 : 0;
        for (let i = 0; i < 5; i++) {
          // worried: inner ends up; stern/default: a soft bushy line, outer ends drooping.
          const inner = s < 0 ? i : 4 - i;
          let y = hy - 3 + lift;
          if (kind === 'worried') y -= inner >= 3 ? 1 : 0;
          else if (inner === 0) y += 1;
          put(buf, x0 + i, y, HAIR); put(buf, x0 + i, y + 1, BROWD);
        }
      }
    }
    // The walrus mustache, and the mouth under it.
    function mustache(hx, hy, lift) {
      const y = hy + 5 - lift;
      for (let x = hx - 4; x <= hx + 4; x++) if (x !== hx) put(buf, x, y, HAIR);
      for (let x = hx - 6; x <= hx + 6; x++) put(buf, x, y + 1, x === hx ? HAIRD : HAIR);
      for (const s of [-1, 1]) { put(buf, hx + s * 6, y + 2, HAIRD); put(buf, hx + s * 7, y + 2 + (lift ? -1 : 0), HAIR); put(buf, hx + s * 5, y + 2, HAIR); }
      for (let x = hx - 5; x <= hx + 5; x++) if (x !== hx) blendAt(buf, x, y + 2, HAIRD, 0.6);
    }
    function mouth(hx, hy, kind) {
      const y = hy + 8;
      if (kind === 'smile') { put(buf, hx - 2, y, MOUTH); put(buf, hx - 1, y + 1, MOUTH); put(buf, hx, y + 1, MOUTH); put(buf, hx + 1, y + 1, MOUTH); put(buf, hx + 2, y, MOUTH); }
      else if (kind === 'grin') { for (let x = hx - 3; x <= hx + 3; x++) put(buf, x, y, MOUTH); for (let x = hx - 2; x <= hx + 2; x++) put(buf, x, y + 1, x === hx ? C('#e86a7a') : MOUTH); }
      else if (kind === 'frown') { put(buf, hx - 2, y + 1, MOUTH); put(buf, hx - 1, y, MOUTH); put(buf, hx, y, MOUTH); put(buf, hx + 1, y, MOUTH); put(buf, hx + 2, y + 1, MOUTH); }
      else if (kind === 'o') { put(buf, hx, y, MOUTH); put(buf, hx - 1, y, MOUTH); put(buf, hx, y + 1, MOUTH); put(buf, hx - 1, y + 1, MOUTH); }
      else { put(buf, hx - 1, y, MOUTH); put(buf, hx, y, MOUTH); put(buf, hx + 1, y, MOUTH); }
    }
    function drop(x, y) {
      put(buf, x, y, DROP); put(buf, x, y + 1, DROP); put(buf, x - 1, y + 1, DROPD); put(buf, x + 1, y + 1, DROP);
      put(buf, x, y + 2, DROPD); put(buf, x - 1, y, LINE); put(buf, x + 1, y, LINE); put(buf, x, y - 1, LINE);
    }
    function bulb(x, y, on) {
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const d = Math.hypot(dx, dy * 1.1);
        if (d <= 2.6) put(buf, x + dx, y + dy, d < 1.3 && on ? C('#ffffff') : BULB);
        else if (d <= 3.4) put(buf, x + dx, y + dy, LINE);
      }
      for (let dx = -1; dx <= 1; dx++) { put(buf, x + dx, y + 4, C('#9aa0b0')); put(buf, x + dx, y + 5, C('#6a7080')); }
      put(buf, x - 2, y + 4, LINE); put(buf, x + 2, y + 4, LINE); put(buf, x - 2, y + 5, LINE); put(buf, x + 2, y + 5, LINE);
      if (on) for (const [dx, dy] of [[-6, 0], [6, 0], [0, -6], [-4, -4], [4, -4]]) { blendAt(buf, x + dx, y + dy, BULBD, 0.9); blendAt(buf, x + dx * 0.8, y + dy * 0.8, BULB, 0.5); }
    }

    const MOTES = Array.from({ length: 6 }, (_, i) => ({ x: 6 + hash(i, 1) * 22, y: 8 + hash(i, 2) * 34, k: 1 + (i % 3), p: hash(i, 3) * TAU, kb: 7 + i * 2 }));

    function frame(t, mood, since) {
      const u = t / LOOP, age = ((t - since) % LOOP + LOOP) % LOOP;
      buf.set(BG);
      // The lamp breathes a little; chalk dust drifts in its light.
      const flick = 0.12 + 0.05 * Math.sin(TAU * 37 * u) + 0.03 * Math.sin(TAU * 91 * u);
      for (let y = 0; y < 34; y++) for (let x = 0; x < 30; x++) {
        const d = Math.hypot(x - LAMP[0], (y - LAMP[1] - 3) * 0.8);
        if (d < 26 && (x + y) % 2 === 0) blendAt(buf, x, y, C('#ffd890'), flick * (1 - d / 26));
      }
      put(buf, LAMP[0], 6, C('#fffbe0')); put(buf, LAMP[0] - 1, 6, C('#ffe8a0')); put(buf, LAMP[0] + 1, 6, C('#ffe8a0'));
      for (const m of MOTES) {
        const x = m.x + 3 * Math.sin(TAU * m.k * u + m.p), y = m.y + 2 * Math.sin(TAU * (m.k + 1) * u + m.p);
        if (Math.sin(TAU * m.kb * u + m.p) > -0.2) blendAt(buf, x, y, C('#fff4d0'), 0.7);
      }
      // Sand runs down the hourglass: the top empties and the bottom fills every 20 s.
      const sand = frac(3 * u), SAND = C('#f0c060');
      for (let y = HGY + 1; y < HGY + 10; y++) {
        const hw = Math.max(0, Math.round(2.5 * Math.abs(y - (HGY + 5)) / 4.5));
        const top = y < HGY + 5, level = top ? (y - HGY - 1) / 4 > sand * 0.95 : (HGY + 9 - y) / 4 < sand * 0.95;
        if (level) for (let x = HGX - hw; x <= HGX + hw; x++) put(buf, x, y, SAND);
      }
      if (Math.sin(TAU * 600 * u) > -0.5) put(buf, HGX, HGY + 5, SAND);

      // Chalk on the board answers his mood: a tick (proud), a cross-out (oops), the arrow blinks (thinking).
      if (mood === 'proud' && age > 0.2) {
        const n = Math.min(9, Math.floor((age - 0.2) * 30));
        const tick = [[46, 31], [47, 32], [48, 33], [49, 32], [50, 31], [51, 30], [52, 29], [53, 28], [54, 27]];
        for (let i = 0; i < n; i++) { put(buf, tick[i][0], tick[i][1], CHALK); put(buf, tick[i][0], tick[i][1] + 1, CHALK); }
      }
      if (mood === 'oops') for (let i = 0; i < 6; i++) { put(buf, 47 + i, 27 + i, C('#f08a8a')); put(buf, 52 - i, 27 + i, C('#f08a8a')); }
      if (mood === 'thinking' && Math.sin(TAU * 60 * u) > 0) for (let i = 0; i <= 12; i++) put(buf, 6 + i, 20 - i, CHALK);

      // Body: breathing; the habit of pushing his spectacles up (calm, every 15 s).
      const breath = Math.sin(TAU * 20 * u) > 0.35 ? 1 : 0;
      let ox = 0, oy = breath, hand = 'chest';
      const fix = frac(4 * u + 0.6);
      if (mood === 'calm' && fix < 0.06) hand = 'glasses';
      if (mood === 'thinking') hand = 'chin';
      if (mood === 'hint') { hand = 'up'; oy -= age < 0.3 ? Math.round(2 * Math.sin(Math.PI * age / 0.3)) : 0; }
      if (mood === 'proud') { hand = 'thumb'; oy -= Math.round(Math.max(0, Math.sin(TAU * 30 * u)) * 1); }
      if (mood === 'oops' && age < 1.2) ox = Math.round(Math.sin(age * 18) * (1.2 - age));     // a slow head shake
      body(ox, oy, hand);
      over(buf, SPR);

      const hx = CX + ox, hy = 27 + oy;
      put(buf, hx - 7, hy - 6, SHINE); put(buf, hx - 6, hy - 6, SHINE); put(buf, hx - 7, hy - 5, SHINE);
      const blink = mood !== 'proud' && frac(13 * u + 0.3) < 0.03;
      const glint = Math.floor(frac(5 * u + 0.2) * 40);                                         // a glint crosses the lenses
      if (mood === 'calm') {
        eyes(hx, hy, blink ? 'blink' : 'dot'); brows(hx, hy, 'soft'); mustache(hx, hy, 0); mouth(hx, hy, 'smile');
      } else if (mood === 'thinking') {
        eyes(hx, hy, blink ? 'blink' : 'up'); brows(hx, hy, 'high'); mustache(hx, hy, 0); mouth(hx, hy, 'flat');
        for (let i = 0; i < 3; i++) if (frac(2 * 30 * u) * 4 > i + 0.5) { put(buf, hx + 9 + i * 3, hy - 17, CHALK); put(buf, hx + 10 + i * 3, hy - 17, CHALK); }
      } else if (mood === 'proud') {
        eyes(hx, hy, 'smile'); brows(hx, hy, 'high'); mustache(hx, hy, 1); mouth(hx, hy, 'grin');
        for (const bx of [hx - 9, hx + 8]) { blendAt(buf, bx, hy + 4, BLUSH, 0.7); blendAt(buf, bx + 1, hy + 4, BLUSH, 0.7); }
        for (let i = 0; i < 3; i++) {
          const s = Math.sin(TAU * (30 + i * 10) * u + i * 2);
          if (s < 0.4) continue;
          const sx = [8, 54, 52][i], sy = [30, 12, 40][i];
          put(buf, sx, sy, SPARK);
          if (s > 0.75) { put(buf, sx - 1, sy, SPARK); put(buf, sx + 1, sy, SPARK); put(buf, sx, sy - 1, SPARK); put(buf, sx, sy + 1, SPARK); }
        }
      } else if (mood === 'oops') {
        eyes(hx, hy, blink ? 'blink' : 'dot'); brows(hx, hy, 'worried'); mustache(hx, hy, 0); mouth(hx, hy, 'frown');
        const v = frac(12 * u);
        if (v < 0.7) drop(hx + 11, hy - 6 + Math.round(v * 6));
      } else {
        eyes(hx, hy, blink ? 'blink' : 'dot'); brows(hx, hy, 'high'); mustache(hx, hy, 1); mouth(hx, hy, 'o');
        bulb(hx + 16, hy - 13 + (age < 0.3 ? 2 : 0), age > 0.15 && Math.sin(TAU * 20 * u) > -0.8);
      }
      glasses(hx, hy, mood === 'proud' ? -1 : glint);
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'calm', (state && state.since) || 0);
    };
  },
});
