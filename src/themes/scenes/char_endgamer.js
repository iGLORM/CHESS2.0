// EndGamer, the Patient Scholar: a live character portrait.
//
// 62x80, shown at 4x on the story cutscene card (248x320); the `face` frame is the
// close-up for the game HUD and dialogue bubbles. A calm blue king in the Grand Library
// at night, round gold spectacles on his nose and an open book held in both hands, lit
// by a candelabra on the left against the cold moonlight from the arched window behind
// him. Moods: calm (default), pleased, intrigued, grave, flustered. Breathes, blinks,
// reads (his eyes drift down to the page and up again) and turns a page every few
// seconds; his lenses glint, go blank white when grave, and slide askew when flustered.
LiveScenes.register({
  id: 'char_endgamer',
  width: 62,
  height: 80,
  loop: 60,
  still: 1,
  moods: ['calm', 'pleased', 'intrigued', 'grave', 'flustered'],
  frames: { face: [11, 0, 40, 40] },
  moodFor(category) {
    return {
      gameStart: 'calm', playerCapture: 'calm',
      bossCapture: 'pleased', playerLowHealth: 'pleased',
      bossTaunt: 'intrigued', milestone: 'intrigued', playerCheck: 'intrigued',
      bossCheck: 'grave', bossCaptureBig: 'grave',
      playerCaptureBig: 'flustered', lowHealth: 'flustered',
    }[category] || null;
  },
  create() {
    const W = 62, H = 80, LOOP = 60, CX = 31;
    const { TAU, C, mix, clamp, sq, frac, bay, ramp, hash, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, over } = K;
    let buf = null;

    // ---------- backdrop: the Grand Library at night ----------
    // One-point perspective like the full scene: shelves of books on both side walls,
    // an arched moonlit window on the far wall right behind the head.
    const BG = new Uint32Array(W * H);
    const VX = CX, VY = 38, NEAR = 18;             // side walls end at x = VX -/+ NEAR (the far wall)
    const WOOD = ['#8a5a36', '#6a4028', '#4a2a1c', '#301a12', '#1c0e0a'].map(C);
    const SPINES = ['#8a2a2a', '#2a4a7a', '#2a6a4a', '#7a5a2a', '#5a2a6a', '#9a6a3a', '#3a3a5a', '#6a2a3a']
      .map(h => [C(mix(h, '#ffd8a0', 0.3)), C(h), C(mix(h, '#000000', 0.45))]);
    const GILT = C('#d8a850');
    const CAND = { x: 7, y: 50 };                   // the candelabra's middle flame
    const warm = (x, y) => Math.exp(-sq((x - CAND.x) / 16) - sq((y - CAND.y) / 20));
    function shelfPx(x, y, h, p, light) {
      const row = Math.floor(h / 0.3), inRow = h - row * 0.3;
      if (inRow < 0.05) return light > 0.5 ? WOOD[1] : WOOD[2];                       // plank
      const book = Math.floor(p * 4 + row * 7.3), bh = 0.17 + hash(book, row) * 0.08;
      if (inRow > bh + 0.05) return WOOD[4];                                          // gap above books
      if (frac(p * 4 + row * 7.3) < 0.18) return WOOD[4];                             // between books
      const sp = SPINES[Math.floor(hash(book, row + 3) * SPINES.length)];
      if (Math.abs(inRow - 0.05 - bh * 0.7) < 0.018) return light > 0.3 ? GILT : sp[2];
      return light > 0.55 ? sp[0] : light > 0.2 ? sp[1] : sp[2];
    }
    const WIN = { x0: 16, x1: 46, top: 3, bot: 42, r: 15 };   // arched window framing the head
    const inWindow = (x, y) => x >= WIN.x0 && x <= WIN.x1 && y <= WIN.bot && (y >= WIN.top + WIN.r || Math.hypot(x - CX, y - (WIN.top + WIN.r)) <= WIN.r + 0.5);
    const MOONSKY = ['#0a1030', '#142050', '#1e3068', '#2a4480', '#3a5a9c', '#5a7cb8'].map(C);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, dx = x - VX, adx = Math.abs(dx);
      const light = warm(x, y) * 1.1 - clamp((20 - y) / 30) * 0.3;
      if (adx >= NEAR) {
        const floorY = VY + adx * 1.25;                                            // where the wall meets the floor
        if (y < floorY) { BG[i] = shelfPx(x, y, (floorY - y) / adx, 60 / adx, light); continue; }
      } else if (y < VY + NEAR * 1.25) {
        // Far wall: the window with a wooden frame, dim shelves around it.
        if (inWindow(x, y)) {
          BG[i] = ramp(MOONSKY, (y - WIN.top) / (WIN.bot - WIN.top) * 0.55 + 0.55 * Math.exp(-sq(Math.hypot(dx, (y - 24) * 0.9) / 16)), x, y);
          if (x === CX || y === 30 || (y === 17 && Math.abs(dx) > 9)) BG[i] = WOOD[3];     // mullions
          continue;
        }
        const fr = inWindow(x - 1, y) || inWindow(x + 1, y) || inWindow(x, y - 1) || inWindow(x, y + 1) || inWindow(x - 2, y) || inWindow(x + 2, y);
        if (fr) { BG[i] = x < CX ? WOOD[1] : WOOD[2]; continue; }
        BG[i] = shelfPx(x, y, (VY + NEAR * 1.25 - y) / NEAR, x * 0.35, light * 0.6 - 0.1);
        continue;
      }
      // Floor: dark parquet with a red rug down the middle.
      const Z = 60 / Math.max(0.5, y - VY), X = dx * Z / 40;
      if (Math.abs(X) < 5.5) BG[i] = Math.abs(X) > 4.8 ? C('#b08040') : ramp(['#6a1e24', '#4a1a26', '#2e1020'].map(C), (y - 50) / 30 + (Math.floor(Z * 2) % 2 ? 0.15 : 0), x, y);
      else BG[i] = frac(X / 2) < 0.1 ? WOOD[4] : ramp(WOOD, 0.55 - warm(x, y) * 0.5 + (y - 55) / 60, x, y);
    }
    // The crescent moon in the window's upper right pane.
    K.disc(BG, 41, 10, 3.2, (dx, dy) => Math.hypot(dx + 1.6, dy + 0.8) < 2.8 ? 0 : C('#f0f4ff'));
    // The candelabra: stem, arms, three candles (flames in frame()).
    for (let y = 52; y < 72; y++) { put(BG, CAND.x, y, C('#d8a850')); put(BG, CAND.x + 1, y, C('#6a4a20')); }
    for (let x = CAND.x - 3; x <= CAND.x + 5; x++) put(BG, x, 72, C('#6a4a20'));
    for (const cx of [CAND.x - 4, CAND.x + 5]) { for (let j = 0; j < 4; j++) put(BG, cx + (cx < CAND.x ? j : -j), 55 - (j >> 1), C('#b88a40')); }
    const FLAMES = [[CAND.x - 4, 51], [CAND.x, 49], [CAND.x + 5, 51]];
    for (const [fx, fy] of FLAMES) for (let y = fy + 1; y <= fy + 4; y++) { put(BG, fx, y, C('#f4ecd8')); put(BG, fx + 1, y, C('#c8b8a0')); }
    // The moonbeam: a cool shaft from the window falling down to the right.
    const BEAM = [];
    for (let y = 26; y < H; y++) {
      const v = (y - 26) / 54, xl = 24 + v * 20, xr = 38 + v * 22;
      for (let x = Math.ceil(xl); x < xr && x < W; x++) if (!inWindow(x, y)) BEAM.push(y * W + x);
    }
    const MOTES = Array.from({ length: 12 }, (_, i) => ({ s: hash(i, 1), w: hash(i, 2), p: hash(i, 3) * TAU, k: 1 + (i % 2) }));
    const STARS = [[20, 22], [22, 12], [44, 20], [19, 34], [27, 6], [43, 35]].map(([x, y], i) => ({ x, y, k: 7 + i * 3, p: hash(i, 9) * TAU }));
    const vig = K.vignette(C('#08050a'), 0.4, 0.4);

    // ---------- EndGamer ----------
    const ROBE = ['#b4d8f0', '#7ab4e0', '#5599cc', '#3a6ea8', '#283e70'].map(C);
    const IVORY = ['#fffaf0', '#f2e8d4', '#dccdbc', '#a89cac', '#6e6888'].map(C);
    const GOLD = ['#fff4c0', '#f0c860', '#c8903a', '#8a5a28', '#50301c'].map(C);
    const RIM = C('#d4ecff'), LINE = C('#1a1628'), SEAM = C('#2e4a80'), HANDLINE = C('#6e6888');
    // Warm key from the candles on the left, a little low; cold moonlight rims the right.
    const LN = Math.hypot(0.7, 0.4, 0.6), LX = -0.7 / LN, LY = -0.4 / LN, LZ = 0.6 / LN;
    const SPR = new Uint32Array(W * H), PART = new Uint8Array(W * H);
    function shade(x, y, nx, ny, part, pal) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * LX + ny * LY + nz * LZ;
      const i = y * W + x;
      const v = pal === ROBE ? 1 - (l * 0.85 + 0.3) + 0.2 : 1 - (l * 0.62 + 0.42);
      SPR[i] = nx > 0.86 && l < 0.2 ? RIM : pal[Math.round(clamp(v) * (pal.length - 1))];
      PART[i] = part;
    }
    function disc(cx, cy, rx, ry, part, pal) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) shade(x, y, nx * 0.95, ny * 0.95, part, pal);
      }
    }

    // Book geometry (drawn in frame(): pages and the turning page).
    const BK = { x0: 21, x1: 41, y0: 47, y1: 54 };
    function body(oy, hoy) {
      SPR.fill(0); PART.fill(0);
      // Base: a round plinth, gold ring on top.
      for (let y = 67; y <= 75; y++) {
        const top = y - 67, hw = 16 - (top < 2 ? 2 - top : 0) - (y === 75 ? 1 : 0);
        for (let x = CX - hw; x <= CX + hw; x++) shade(x, y + oy, (x - CX) / 17, y < 69 ? -0.6 : 0.1, 1, y <= 68 ? GOLD : ROBE);
      }
      // Robe flaring to the base, a gold hem.
      for (let y = 38; y <= 67; y++) {
        const hw = 11.5 + Math.pow((y - 38) / 29, 1.5) * 5.5 - (y === 38 ? 2 : y === 39 ? 1 : 0);
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++)
          shade(x, y + oy, (x - CX) / (hw + 0.5), 0.12, 2, ROBE);
      }
      // A gold stole down the front of the robe.
      for (let y = 55; y <= 63; y++) for (const dx of [-1, 0, 1]) if (PART[(y + oy) * W + CX + dx]) shade(CX + dx, y + oy, dx * 0.1, 0.12, 2, GOLD);
      disc(CX, 39 + hoy, 11.5, 2.8, 3, GOLD);                     // collar
      disc(CX, 26 + hoy, 11.5, 11.5, 4, IVORY);                   // head
      // Crown: a blue velvet cap inside a gold band with three points, a gold ball on top.
      // No cross on kings or bishops (AGENTS.md, Art Rules).
      disc(CX, 11 + hoy, 7, 5, 5, ROBE);
      for (let y = 7; y <= 16; y++) {
        const hw = 8 + (16 - y) * 0.2;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) {
          const px = Math.min(...[-7.5, 0, 7.5].map(p => Math.abs(x - CX - p)));
          if (y < 12 && px > (y - 7) * 0.7 + 0.2) continue;           // the points taper upward
          shade(x, y + hoy, (x - CX) / (hw + 0.5), y <= 12 ? -0.45 : 0.05, 6, GOLD);
        }
      }
      disc(CX, 4 + hoy, 2.3, 2.3, 7, GOLD);                       // the ball, resting on the cap
      // Hands at the book's sides (the book itself is drawn over the robe in frame()).
      disc(BK.x0 - 2, 52 + oy, 3.6, 3.4, 8, IVORY);
      disc(BK.x1 + 2, 52 + oy, 3.6, 3.4, 9, IVORY);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, p = PART[i];
        const n = [PART[i - 1], PART[i + 1], PART[i - W], PART[i + W]];
        if (!p) { if (n.some(q => q)) SPR[i] = LINE; }
        else if (n.some(q => q && q < p)) SPR[i] = p >= 8 ? HANDLINE : p === 6 || p === 7 ? GOLD[3] : SEAM;
      }
      // Jewels round the crown band.
      for (const jx of [-5, 0, 5]) { put(SPR, CX + jx, 14 + hoy, C('#3a6ec8')); put(SPR, CX + jx, 13 + hoy, C('#bfe0ff')); }
      for (const px of [-7.5, 7.5]) put(SPR, Math.round(CX + px), 7 + hoy, GOLD[0]);
    }

    // ---------- face ----------
    const EYE = C('#141a2a'), SHINE = C('#ffffff'), BROW = C('#8a90a8'), MOUTH = C('#3a2030');
    const RIMG = C('#d8a850'), RIMD = C('#8a5a28'), LENS = C('#bfe0ff'), GLARE = C('#f4faff');
    const DROP = C('#8ae0ff'), DROPD = C('#3a8ab0'), QM = C('#ffd23f'), BLUSH = C('#f4a0a8');
    // Spectacles: two round wire rims, a bridge, arms back to the ears. dy tilts the right lens.
    function specs(hx, hy, kind, tilt) {
      for (const s of [-1, 1]) {
        const cx = hx + s * 4.5, cy = hy + 2 + (s > 0 ? tilt : 0);
        for (let y = Math.floor(cy - 4); y <= cy + 4; y++) for (let x = Math.floor(cx - 4); x <= cx + 4; x++) {
          const d = Math.hypot(x - cx, (y - cy) * 1.05);
          if (d > 2.4 && d <= 3.4) put(buf, x, y, y < cy ? RIMG : RIMD);
          else if (d <= 2.4) {
            if (kind === 'glare') put(buf, x, y, (x - cx) - (y - cy) > 0.5 ? LENS : GLARE);
            else blendAt(buf, x, y, LENS, 0.28);
          }
        }
      }
      put(buf, hx, hy + 1, RIMG); put(buf, hx - 1, hy + 1, RIMG); put(buf, hx + 1, hy + 1, RIMG);
      put(buf, hx - 9, hy + 1, RIMD); put(buf, hx - 10, hy + 1, RIMD); put(buf, hx + 9, hy + 1 + tilt, RIMD); put(buf, hx + 10, hy + 1 + tilt, RIMD);
    }
    // A glint sweeping across both lenses (phase 0..1).
    function glint(hx, hy, ph, tilt) {
      if (ph < 0 || ph > 1) return;
      for (const s of [-1, 1]) {
        const cx = hx + s * 4.5, cy = hy + 2 + (s > 0 ? tilt : 0), o = -4 + ph * 8;
        for (let k = -2; k <= 2; k++) {
          const x = Math.round(cx + o + k * 0.5), y = Math.round(cy - k);
          if (Math.hypot(x - cx, y - cy) <= 2.6) put(buf, x, y, SHINE);
        }
      }
    }
    function eyes(hx, hy, kind, look, tilt) {
      for (const s of [-1, 1]) {
        const ex = s < 0 ? hx - 5 : hx + 4, ey = hy + 1 + (s > 0 ? tilt : 0);
        if (kind === 'blink') { put(buf, ex, ey + 2, EYE); put(buf, ex + 1, ey + 2, EYE); continue; }
        if (kind === 'smile') { put(buf, ex - 1, ey + 2, EYE); put(buf, ex, ey + 1, EYE); put(buf, ex + 1, ey + 1, EYE); put(buf, ex + 2, ey + 2, EYE); continue; }
        if (kind === 'wide') { for (let y = ey; y < ey + 3; y++) for (let x = ex; x < ex + 2; x++) put(buf, x, y, EYE); put(buf, ex, ey, SHINE); continue; }
        // 'dot': 2x2, looking down at the book (look = 1) or up at you (look = 0).
        const y0 = ey + (look ? 1 : 0);
        for (let y = y0; y < y0 + 2; y++) for (let x = ex; x < ex + 2; x++) put(buf, x, y, EYE);
        if (!look) put(buf, ex, y0, SHINE);
        if (look) { put(buf, ex, ey, IVORY[2]); put(buf, ex + 1, ey, IVORY[2]); }  // a soft lid
      }
    }
    function brows(hx, hy, kind, tilt) {
      const L = hx - 7, R = hx + 4;
      if (kind === 'soft') { for (let i = 0; i < 4; i++) { put(buf, L + i, hy - 3 + (i === 0 ? 1 : 0), BROW); put(buf, R + i, hy - 3 + (i === 3 ? 1 : 0), BROW); } }
      else if (kind === 'raised') {
        for (let i = 0; i < 4; i++) put(buf, L + i, hy - 3 + (i === 0 ? 1 : 0), BROW);
        put(buf, R, hy - 4, BROW); put(buf, R + 1, hy - 5, BROW); put(buf, R + 2, hy - 5, BROW); put(buf, R + 3, hy - 4, BROW);
      } else if (kind === 'down') {
        put(buf, L, hy - 4, BROW); put(buf, L + 1, hy - 3, BROW); put(buf, L + 2, hy - 3, BROW); put(buf, L + 3, hy - 2, BROW);
        put(buf, R, hy - 2, BROW); put(buf, R + 1, hy - 3, BROW); put(buf, R + 2, hy - 3, BROW); put(buf, R + 3, hy - 4, BROW);
      } else if (kind === 'worried') {
        put(buf, L, hy - 2, BROW); put(buf, L + 1, hy - 3, BROW); put(buf, L + 2, hy - 3, BROW); put(buf, L + 3, hy - 4, BROW);
        put(buf, R, hy - 4 + tilt, BROW); put(buf, R + 1, hy - 3 + tilt, BROW); put(buf, R + 2, hy - 3 + tilt, BROW); put(buf, R + 3, hy - 2 + tilt, BROW);
      }
    }
    function mouth(hx, hy, kind) {
      const y = hy + 7;
      if (kind === 'calm') { put(buf, hx - 2, y, MOUTH); for (let x = hx - 1; x <= hx + 1; x++) put(buf, x, y + 1, MOUTH); put(buf, hx + 2, y, MOUTH); }
      else if (kind === 'smile') { for (let x = hx - 2; x <= hx + 2; x++) put(buf, x, y, MOUTH); for (let x = hx - 1; x <= hx + 1; x++) put(buf, x, y + 1, MOUTH); put(buf, hx - 3, y - 1, MOUTH); put(buf, hx + 3, y - 1, MOUTH); }
      else if (kind === 'hm') { put(buf, hx, y, MOUTH); put(buf, hx + 1, y, MOUTH); put(buf, hx, y + 1, MOUTH); put(buf, hx + 1, y + 1, MOUTH); }
      else if (kind === 'flat') for (let x = hx - 2; x <= hx + 2; x++) put(buf, x, y, MOUTH);
      else if (kind === 'wavy') { put(buf, hx - 2, y + 1, MOUTH); put(buf, hx - 1, y, MOUTH); put(buf, hx, y + 1, MOUTH); put(buf, hx + 1, y, MOUTH); put(buf, hx + 2, y + 1, MOUTH); }
    }
    function drop(x, y) {
      put(buf, x, y, DROP); put(buf, x, y + 1, DROP); put(buf, x - 1, y + 1, DROPD); put(buf, x + 1, y + 1, DROP);
      put(buf, x, y + 2, DROPD); put(buf, x - 1, y, LINE); put(buf, x + 1, y, LINE); put(buf, x, y - 1, LINE);
    }

    // The open book: covers, two pages of text lines, a page that turns (ph 0..1).
    const COVER = C('#6a1e24'), COVERD = C('#3a0e16'), PAGE = C('#fff4dc'), PAGE2 = C('#e2d0b0'), TEXT = C('#a89880');
    function book(oy, ph) {
      const { x0, x1 } = BK, y0 = BK.y0 + oy, y1 = BK.y1 + oy, mid = CX;
      for (let x = x0; x <= x1; x++) { put(buf, x, y1 + 1, COVER); put(buf, x, y1 + 2, COVERD); }
      put(buf, x0 - 1, y1 + 1, LINE); put(buf, x1 + 1, y1 + 1, LINE);
      for (let x = x0 - 1; x <= x1 + 1; x++) put(buf, x, y1 + 3, LINE);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const sag = Math.abs(x - mid) < 2 ? 1 : 0;                                       // pages dip at the spine
        if (y < y0 + sag + (x === x0 || x === x1 ? 1 : 0)) continue;
        let c = x < mid ? PAGE2 : PAGE;
        if (x === mid) c = TEXT;
        else if ((y - y0) % 2 === 0 && y > y0 + 1 && y < y1 && Math.abs(x - mid) > 2 && Math.abs(x - mid) < 11 && hash(x >> 1, y) > 0.2) c = TEXT;
        put(buf, x, y, c);
      }
      for (let x = x0; x <= x1; x++) { const top = y0 + (Math.abs(x - mid) < 2 ? 1 : 0) + (x === x0 || x === x1 ? 1 : 0); put(buf, x, top - 1, LINE); }
      for (let y = y0 + 1; y <= y1 + 2; y++) { put(buf, x0 - 1, y, LINE); put(buf, x1 + 1, y, LINE); }
      if (ph >= 0 && ph <= 1) {                                                            // the turning page
        const pw = 11, px = mid + Math.cos(Math.PI * ph) * pw, lift = Math.round(Math.sin(Math.PI * ph) * 5);
        const a = Math.min(mid, px), b = Math.max(mid, px);
        for (let x = Math.round(a); x <= Math.round(b); x++) {
          const f = (x - mid) / (px - mid || 1), top = y0 - Math.round(lift * f) + 1;
          for (let y = top; y <= y1 - Math.round(lift * f * 0.5); y++) put(buf, x, y, ph < 0.5 ? PAGE : PAGE2);
          put(buf, x, top - 1, LINE);
        }
        const ex = Math.round(px), ey0 = y0 - lift + 1, ey1 = y1 - Math.round(lift * 0.5);
        for (let y = ey0; y <= ey1; y++) put(buf, ex + (px > mid ? 1 : -1), y, LINE);
      }
    }

    function frame(t, mood, since) {
      const u = t / LOOP, age = ((t - since) % LOOP + LOOP) % LOOP;
      buf.set(BG);
      for (const s of STARS) if (Math.sin(TAU * s.k * u + s.p) > 0.3) put(buf, s.x, s.y, C('#dce8ff'));
      const bf = 0.15 + 0.04 * Math.sin(TAU * 4 * u);
      for (const i of BEAM) { const x = i % W, y = (i / W) | 0; if (bay(x, y) < 0.7) blend(buf, i, C('#9ac0f0'), bf); }
      for (const d of MOTES) {                                   // dust drifting down the moonbeam
        const v = frac(d.s + d.k * u), y = 28 + v * 50, xl = 24 + (y - 26) / 54 * 20, xr = 38 + (y - 26) / 54 * 22;
        const x = xl + (xr - xl) * (0.5 + 0.42 * Math.sin(TAU * 3 * u + d.p + d.w * 6));
        if (Math.sin(TAU * 11 * u + d.p) > -0.2) put(buf, x, y, C('#e4eeff'));
      }
      // Candles flicker and warm the shelves beside them.
      const f0 = 0.8 + 0.2 * Math.sin(TAU * 47 * u) * Math.sin(TAU * 13 * u + 1);
      K.glow(buf, CAND.x, CAND.y, 20, C('#ffb860'), 0.28 * f0);
      FLAMES.forEach(([fx, fy], n) => {
        const f = 0.8 + 0.2 * Math.sin(TAU * (41 + n * 6) * u + n * 1.3) * Math.sin(TAU * (11 + n) * u + n);
        put(buf, fx, fy, C('#fff4c0')); put(buf, fx, fy - 1, C(f > 0.85 ? '#ffe080' : '#ffb040'));
        if (f > 0.9) put(buf, fx, fy - 2, C('#ff9030'));
        blendAt(buf, fx + 1, fy, C('#ffd080'), 0.5);
      });
      vig(buf);

      // Breathing (every 4 s): head and collar sink a pixel.
      const breath = Math.sin(TAU * 15 * u) > 0.35 ? 1 : 0;
      let oy = 0, hoy = breath, tilt = 0;
      if (mood === 'flustered') { hoy += Math.sin(TAU * 600 * u) > 0.6 ? 1 : 0; tilt = 1; }
      if (mood === 'intrigued' && age < 0.5) hoy -= Math.round(2 * Math.sin(Math.PI * age / 0.5));   // perks up
      body(oy, hoy);
      over(buf, SPR);

      // Reading: a page turns every 6 s (every second when flustered, never when grave).
      const pk = mood === 'flustered' ? 60 : 10, pv = frac(pk * u + 0.4);
      book(oy, mood === 'grave' ? -1 : pv < (mood === 'flustered' ? 0.6 : 0.1) ? pv / (mood === 'flustered' ? 0.6 : 0.1) : -1);

      const hx = CX, hy = 25 + hoy;
      put(buf, hx - 7, hy - 7, SHINE); put(buf, hx - 6, hy - 7, SHINE); put(buf, hx - 7, hy - 6, SHINE);
      const blink = frac(13 * u + 0.3) < 0.03;
      const glance = frac(5 * u + 0.15) < 0.35 ? 0 : 1;          // mostly reading, now and then looks up
      if (mood === 'calm') {
        eyes(hx, hy, blink ? 'blink' : 'dot', glance, 0); specs(hx, hy, 'glass', 0); brows(hx, hy, 'soft', 0); mouth(hx, hy, 'calm');
        glint(hx, hy, frac(6 * u + 0.5) / 0.08, 0);
      } else if (mood === 'pleased') {
        eyes(hx, hy, 'smile', 0, 0); specs(hx, hy, 'glass', 0); brows(hx, hy, 'soft', 0); mouth(hx, hy, 'smile');
        for (const bx of [hx - 10, hx + 9]) { blendAt(buf, bx, hy + 5, BLUSH, 0.7); blendAt(buf, bx + 1, hy + 5, BLUSH, 0.7); }
        glint(hx, hy, frac(10 * u) / 0.1, 0);
      } else if (mood === 'intrigued') {
        eyes(hx, hy, blink ? 'blink' : 'dot', 0, 0); specs(hx, hy, 'glass', 0); brows(hx, hy, 'raised', 0); mouth(hx, hy, 'hm');
        if (age > 0.15) {                                                                   // a "?" rises
          const bx = hx + 14, by = hy - 14 + (age < 0.35 ? 2 : 0) + Math.round(Math.sin(TAU * 20 * u) * 0.6);
          const Q = [[0, 0], [1, 0], [2, 0], [-1, 1], [3, 1], [3, 2], [2, 3], [1, 4], [1, 6]];
          for (const [qx, qy] of Q) for (const [ax, ay] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(buf, bx + qx + ax, by + qy + ay, LINE);
          for (const [qx, qy] of Q) put(buf, bx + qx, by + qy, QM);
        }
      } else if (mood === 'grave') {
        specs(hx, hy, 'glare', 0); brows(hx, hy, 'down', 0); mouth(hx, hy, 'flat');
        glint(hx, hy, frac(4 * u) / 0.12, 0);
      } else {
        eyes(hx, hy, blink ? 'blink' : 'wide', 0, tilt); specs(hx, hy + 1, 'glass', tilt); brows(hx, hy, 'worried', tilt); mouth(hx, hy, 'wavy');
        const v = frac(15 * u);
        if (v < 0.6) drop(hx + 12, hy - 6 + Math.round(v * 6));
      }
    }

    return (t, out, state) => {
      buf = out;
      frame(t, (state && state.mood) || 'calm', (state && state.since) || 0);
    };
  },
});
