// The Slanted Sands from above: the local map of World 3.
//
// 320x200, shown at 4x when the world map zooms into the Slanted Sands. A sea of dunes in
// the late afternoon, every crest running on the diagonal the way the whole desert leans:
// low sun in the west, gold windward slopes, cool violet slip faces, long shadows to the
// east. A sandstone causeway zigzags between the dunes past seven places, each marked by
// its mission: the mirage pool (Sunstroke Mates), the scarab burrows (Scarab Swarm), the
// great dune with its sand sprite (Dune Dash), a tilted checkered court with two bishop
// statues (Diagonal Duel), the pawn race track (Pawn Race), four half-buried glowing
// sunstones with a sidewinder's tracks (Buried Sunstones), and a patch of remembered
// night with glowing footprints walking toward the far edge (The First Crossing). At the
// end, Bish-Bosh leans and grins on the plinth of his own tilted pyramid.
// Also: the mitre monument, the leaning pyramids, an oasis with palms, a caravan.
// Moves: sand streams off the crests, heat shimmers over the mirage, the sand sprite
// whirls, scarabs scuttle, vultures circle with their shadows, the caravan walks,
// palms sway, the oasis glints, sunstones pulse, the footprints glow one by one,
// pennants flap on the race track, dust devils cross, Bish-Bosh sways and his orb glints.
// State (LiveScenes.setState('map_slantedsands', { map: { cleared, beaten } })): cleared
// places plant a turquoise pennant; when Bish-Bosh is beaten he waves, a friend again.
LiveScenes.register({
  id: 'map_slantedsands',
  width: 320,
  height: 200,
  loop: 120,
  still: 30,
  stops: [[34, 114], [68, 140], [104, 104], [140, 132], [178, 98], [214, 134], [240, 84], [276, 126]],
  create() {
    const W = 320, H = 200, N = W * H, LOOP = 120;
    const { TAU, mix, C, clamp, sq, frac, bay, ramp, hash, noise2, blend } = PixelKit;
    const K = PixelKit.surface(W, H);
    const { put, blendAt, glow } = K;
    const STOPS = LiveScenes.get('map_slantedsands').stops;
    let buf = null;

    const BACK = new Uint32Array(N), OBJ = new Uint8Array(N), OH = new Float32Array(N), CANOPY = new Uint8Array(N);
    const FREE = new Uint8Array(N), MASK = new Uint8Array(N), MASKC = new Uint32Array(N);
    const P = (...h) => h.map(C);
    // Low sun in the west-north-west: long shadows east.
    const LX = -0.85, LY = -0.35, SHX = 1.3, SHY = 0.45;

    // ---------- helpers ----------
    function spline(Pts, step = 0.35) {
      const out = [];
      for (let i = 0; i < Pts.length - 1; i++) {
        const p0 = Pts[Math.max(0, i - 1)], p1 = Pts[i], p2 = Pts[i + 1], p3 = Pts[Math.min(Pts.length - 1, i + 2)];
        const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
        for (let k = 0; k < n; k++) {
          const t = k / n, t2 = t * t, t3 = t2 * t;
          const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
          out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        }
      }
      out.push(Pts[Pts.length - 1]);
      return out;
    }
    function distField(S, R) {
      const D = new Float32Array(N).fill(99), A = new Float32Array(N);
      let len = 0;
      for (let k = 0; k < S.length; k++) {
        if (k) len += Math.hypot(S[k][0] - S[k - 1][0], S[k][1] - S[k - 1][1]);
        const [sx, sy] = S[k];
        for (let y = Math.floor(sy - R); y <= sy + R; y++) for (let x = Math.floor(sx - R); x <= sx + R; x++) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const d = Math.hypot(x - sx, y - sy), i = y * W + x;
          if (d < D[i]) { D[i] = d; A[i] = len; }
        }
      }
      return { D, A, len };
    }
    function op(x, y, c, h) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = y * W + x;
      BACK[i] = c; OBJ[i] = 1; OH[i] = Math.max(0, h);
    }
    const DRAW = [];
    const add = (by, fn) => DRAW.push({ by, fn });

    // ---------- the dunes: crests on the diagonal, slip faces to the south-east ----------
    // Distance across the crests (they run from lower left to upper right), warped by noise.
    const LAM = 46;
    const across = (x, y) => (x * 0.55 + y * 0.84) + 30 * noise2(x / 80, y / 70, 3) + 10 * noise2(x / 28, y / 24, 4) + 3 * noise2(x / 9, y / 9, 2);
    const duneH = (x, y) => {
      const p = frac(across(x, y) / LAM), amp = clamp(0.15 + 1.1 * noise2(x / 55, y / 42, 5));
      const saw = p < 0.8 ? p / 0.8 : (1 - p) / 0.2;           // gentle windward slope, steep slip face
      let h = amp * saw * saw * (3 - 2 * saw) + 0.4 * noise2(x / 70, y / 60, 6);
      // Flatten the ground around each place and along the causeway (done below by FLAT).
      return h;
    };
    const FLATS = [...STOPS.map(([x, y]) => [x, y, 18]), [278, 96, 30], [120, 176, 34]];
    const HG = new Float32Array((W + 2) * (H + 2));
    for (let y = -1; y <= H; y++) for (let x = -1; x <= W; x++) {
      let h = duneH(x, y);
      for (const [fx, fy, r] of FLATS) { const w = Math.exp(-sq((x - fx) / r) - sq((y - fy) / (r * 0.7))); h = h * (1 - w) + 0.45 * w; }
      HG[(y + 1) * (W + 2) + x + 1] = h;
    }
    const hg = (x, y) => HG[(y + 1) * (W + 2) + x + 1];
    const light = (x, y) => -((hg(x + 1, y) - hg(x - 1, y)) * LX + (hg(x, y + 1) - hg(x, y - 1)) * LY) * 6;
    const SUN = P('#8a5238', '#b0703f', '#d08e4e', '#e6aa60', '#f4c678', '#fadc98', '#fff0c0');
    const SHADE = P('#2a2454', '#3c3468', '#544478', '#6e5888', '#8a6c94');
    const CRESTS = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, l = light(x, y), p = frac(across(x, y) / LAM);
      let c;
      if (l < -0.08) {
        c = ramp(SHADE, 0.7 + l * 0.9 + hg(x, y) * 0.25, x, y);
      } else {
        let t = 0.42 + l * 1.5 + hg(x, y) * 0.2 - clamp((y - 150) / 60) * 0.15;
        const rip = Math.floor(across(x, y) * 0.7 + noise2(x / 5, y / 5, 9) * 3) % 4 === 0 && noise2(x / 30, y / 30, 19) > 0.45;   // wind ripples
        if (rip && l < 0.5) t -= 0.1;
        c = ramp(SUN, t, x, y);
      }
      // The crest line: where the lit face meets the slip face.
      const r = light(x + 1, y + 1);
      if (l >= -0.08 && r < -0.08 && hg(x, y) > 0.35) { c = C('#fff6d0'); CRESTS.push(i); }
      BACK[i] = c;
    }

    // ---------- the oasis at the bottom, with palms ----------
    const OAS = { x: 122, y: 178 };
    for (let y = OAS.y - 12; y <= OAS.y + 12; y++) for (let x = OAS.x - 34; x <= OAS.x + 34; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const e = sq((x - OAS.x) / 30) + sq((y - OAS.y) / 9) + (noise2(x / 6, y / 6, 13) - 0.5) * 0.3;
      const i = y * W + x;
      if (e < 0.72) { BACK[i] = ramp(P('#16406a', '#1e6088', '#2a8aa8', '#4ac0c8', '#9ae8e0'), 0.25 + (1 - e) * 0.4 + (y < OAS.y - 4 ? 0.2 : 0), x, y); MASK[i] = 2; MASKC[i] = BACK[i]; }
      else if (e < 0.86) BACK[i] = C(x < OAS.x ? '#e8d8a0' : '#6a8a5a');
      else if (e < 1.25) BACK[i] = ramp(P('#3a5a3a', '#5a8a4a', '#8ab060'), 0.4 + (noise2(x / 3, y / 3, 14) - 0.5) + light(x, y), x, y);
      FREE[i] = 1;
    }

    // ---------- the causeway: sandstone slabs, half drifted over ----------
    const TRAIL = spline([
      [-8, 122], [14, 112], STOPS[0], [48, 132], STOPS[1], [86, 132], [96, 116], STOPS[2], [118, 116], [128, 134], STOPS[3],
      [158, 128], [166, 108], STOPS[4], [194, 104], [202, 124], STOPS[5], [228, 124], [230, 100], STOPS[6], [248, 104], [256, 122], STOPS[7],
    ]);
    const TF = distField(TRAIL, 6);
    const SLAB = P('#7a4a36', '#a8704a', '#d09a66', '#ecc088', '#fce0a8');
    for (let i = 0; i < N; i++) {
      const d = TF.D[i];
      if (d > 3.6) continue;
      const x = i % W, y = i / W | 0;
      FREE[i] = 1; MASK[i] = 0;
      if (d > 2.8) { blend(BACK, i, C('#3a2a4a'), 0.35); continue; }
      const a = TF.A[i], slab = Math.floor(a / 3.2), seam = frac(a / 3.2) < 0.16;
      const drift = noise2(x / 7, y / 7, 21) > 0.74;                      // sand blown over the stones
      if (drift) { BACK[i] = ramp(SUN, 0.6 + light(x, y) * 0.8, x, y); continue; }
      BACK[i] = seam || d > 2.2 ? C('#5a3a30') : ramp(SLAB, 0.35 + hash(slab, 7) * 0.35 - d * 0.08 + light(x, y) * 0.5, x, y);
    }
    // Landings: round sandstone floors with a dark rim, tilted like everything here.
    for (const [sx, sy] of STOPS) for (let y = sy - 10; y <= sy + 10; y++) for (let x = sx - 15; x <= sx + 15; x++) {
      const xx = x - sx, yy = y - sy + xx * 0.12;
      const e = sq(xx / 12.5) + sq(yy / 8.2);
      if (e > 1 || x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      const ring = e > 0.84, tile = e > 0.66 && e <= 0.84, spoke = e < 0.66 && Math.abs(frac((Math.atan2(yy, xx) / TAU) * 8) - 0.5) < 0.07 && e > 0.14;
      BACK[i] = ring ? C('#5a3a30') : tile ? ((Math.floor(Math.atan2(yy, xx) / TAU * 24 + 24) % 2) ? C('#2a9aa8') : C('#5ad0c8')) : spoke ? C('#c07a4a') : e < 0.08 ? C('#ffd060') : ramp(SLAB, 0.72 - e * 0.3 - xx * 0.014, x, y);
      FREE[i] = 1; MASK[i] = 0;
    }

    // ---------- upright things ----------
    function palm(x, by, h, lean) {
      add(by, () => {
        for (let j = 0; j < h; j++) {
          const px = x + Math.round(Math.sin(j / h * 1.4) * lean);
          op(px, by - j, C(j % 3 === 0 ? '#5a3a2a' : '#8a5a34'), j); op(px + 1, by - j, C('#4a2e24'), j);
        }
      });
    }
    const PALMS = [];
    for (const [x, y, h, l] of [[92, 176, 14, 3], [100, 170, 11, -2], [148, 172, 13, 3], [158, 180, 10, 2], [86, 186, 12, -3]]) { palm(x, y, h, l); PALMS.push({ x: x + Math.round(Math.sin(1.4) * l), y: y - h, p: x * 0.1 }); }

    // A pyramid in 3/4 view, leaning along the desert's diagonal: sunlit west face,
    // shaded south face, courses of stone.
    function pyramid(cx, by, hw, h, lean, o = {}) {
      add(by, () => {
        const WF = P('#b88040', '#e0b060', '#f8d898', '#fff0c0'), SF = P('#5a4468', '#806480', '#9a7890', '#c09a98');
        for (let j = 0; j <= h; j++) {
          const f = j / h, y = by - j, w = hw * (1 - f), apx = cx + lean * j;
          for (let x = Math.round(apx - w - hw * 0.35 * (1 - f)); x <= Math.round(apx + w); x++) {
            const left = x < apx - 0.5, course = j % 3 === 0;
            let c = left ? ramp(WF, 0.75 - f * 0.1 + (course ? -0.3 : 0) - (x < apx - w - hw * 0.3 * (1 - f) ? 0.3 : 0), x, y) : ramp(SF, 0.55 + (course ? -0.25 : 0) - (x - apx) / (w + 1) * 0.2, x, y);
            if (Math.abs(x - apx) < 0.6) c = C('#fff6d8');
            op(x, y, c, j);
          }
        }
        if (o.cap) { op(cx + lean * h, by - h - 1, C('#fff4a0'), h + 1); op(cx + lean * h, by - h, C('#ffd060'), h); }
      });
    }
    // The leaning trio at the top of the map (under the header, part of the skyline).
    pyramid(150, 30, 22, 26, 0.35, { cap: true }); pyramid(198, 24, 16, 18, 0.35); pyramid(112, 20, 12, 13, 0.35);

    // The mitre monument: a giant bishop's mitre (a ball finial, no cross) with its long shadow.
    const MITRE = { x: 30, by: 74 };
    add(MITRE.by, () => {
      const { x: cx, by } = MITRE;
      const width = j => j < 3 ? 7 : j < 14 ? 5.5 - (j - 3) * 0.12 : j < 16 ? 5 : j < 30 ? 5 * Math.sin(Math.PI * Math.min(1, (j - 16) / 16 + 0.14)) : 0;
      for (let j = 0; j < 30; j++) {
        const y = by - j, w = width(j);
        for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
          const lit = x < cx + 1;
          let c = lit ? (x < cx - w + 1.5 ? '#fff0c0' : '#e8c080') : '#8a6a80';
          if (j === 2 || j === 14 || j === 16) c = lit ? '#b88850' : '#5a4468';
          if (j > 20 && j < 28 && Math.abs(x - (cx + 2 - (j - 20) * 0.45)) < 0.8) c = '#3a2a3a';
          op(x, y, C(c), j);
        }
      }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx * dx + dy * dy < 2) op(cx + dx, by - 31 + dy, C(dx < 0 ? '#fff0c0' : '#c8a078'), 31);
    });

    // 1. Sunstroke Mates: a mirage pool that is not there (it shimmers, see frame()).
    const MIR = { x: 22, y: 92 };
    for (let y = MIR.y - 6; y <= MIR.y + 6; y++) for (let x = MIR.x - 16; x <= MIR.x + 16; x++) {
      const e = sq((x - MIR.x) / 15) + sq((y - MIR.y) / 5);
      if (e > 1 || x < 0) continue;
      const i = y * W + x;
      BACK[i] = ramp(P('#8ab8d8', '#b8e0ec', '#e8f6f4'), 0.6 - e * 0.5 + (y < MIR.y ? 0.25 : 0), x, y); FREE[i] = 1; MASK[i] = 3; MASKC[i] = BACK[i];
    }
    // Three little bishop stones at the pool's edge: one position each.
    function stoneBishop(x, by, col) {
      add(by, () => {
        const L = col === 'dark' ? P('#5a4468', '#3a2a4a', '#241830') : P('#fff0c0', '#e0b070', '#9a6a50');
        const rows = ['.x.', 'xxx', 'x.x', 'xxx', '.x.', 'xxx'];
        rows.forEach((r, j) => { for (let i = 0; i < 3; i++) if (r[i] === 'x' || (r[i] === '.' && j === 2 && i === 1)) op(x - 1 + i, by - 6 + j, r[i] === 'x' ? L[i] : C('#3a2a3a'), 6 - j); });
      });
    }
    stoneBishop(6, 102, 'light'); stoneBishop(40, 90, 'light'); stoneBishop(14, 84, 'light');

    // 2. Scarab Swarm: burrow mounds round the place, scarabs scuttle between them.
    const BURROWS = [[100, 136], [92, 150], [48, 151], [40, 139], [58, 124]];
    for (const [bx, by] of BURROWS) for (let y = by - 4; y <= by + 3; y++) for (let x = bx - 6; x <= bx + 6; x++) {
      const e = sq((x - bx) / 5.5) + sq((y - by) / 3.2);
      if (e > 1) continue;
      const i = y * W + x;
      BACK[i] = e < 0.18 ? C('#2a1a28') : ramp(P('#8a5a44', '#c89060', '#f0c880', '#fff0c0'), 0.8 - e * 0.4 + (x < bx ? 0.2 : -0.35), x, y);
      MASK[i] = 0;
    }

    // 3. Dune Dash: a great dune on the north side of the place, the sand sprite whirls on it.
    const SPRITE = { x: 110, y: 82 };

    // 4. Diagonal Duel: a small checkered court set on the diagonal, two bishop statues.
    const COURT = { x: 172, y: 146 };
    for (let y = COURT.y - 10; y <= COURT.y + 10; y++) for (let x = COURT.x - 16; x <= COURT.x + 16; x++) {
      const dx = x - COURT.x, dy = (y - COURT.y) * 1.5;
      const a = (dx + dy) / 2, b = (dx - dy) / 2;                   // board axes on the diagonals
      if (Math.abs(a) > 8 || Math.abs(b) > 8) continue;
      const i = y * W + x, sq8 = (Math.floor((a + 8) / 4) + Math.floor((b + 8) / 4)) % 2;
      const edge = Math.abs(a) > 7.1 || Math.abs(b) > 7.1;
      BACK[i] = edge ? C('#6a4a3a') : sq8 ? C('#f4dcb0') : C('#a0645a');
      FREE[i] = 1; MASK[i] = 0;
    }
    function bishopStatue(x, by, light2) {
      add(by, () => {
        const T = light2 ? P('#ffd8a4', '#ff8a52', '#a8423e') : P('#9a86a8', '#584a78', '#2e2858');
        const rows = ['..x..', '.xxx.', '.xx.x', 'xxx.x', '.xxx.', '..x..', '.xxx.', '..x..', '.xxx.', 'xxxxx'];
        rows.forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] === 'x') op(x - 2 + i, by - 10 + j, T[i < 2 ? 0 : i < 4 ? 1 : 2], 10 - j); else if (j >= 2 && j <= 3 && i >= 2 && i <= 3) op(x - 2 + i, by - 10 + j, C('#3a2030'), 10 - j); });
      });
    }
    bishopStatue(COURT.x - 7, COURT.y + 1, true); bishopStatue(COURT.x + 7, COURT.y + 1, false);

    // 5. Pawn Race: four lanes of little pawn posts running on the diagonal, a finish banner.
    const RACE = { x0: 150, y0: 96, x1: 196, y1: 72 };
    for (let lane = 0; lane < 4; lane++) for (let k = 0; k <= 6; k++) {
      const s = k / 6, x = Math.round(RACE.x0 + (RACE.x1 - RACE.x0) * s + lane * 3), y = Math.round(RACE.y0 + (RACE.y1 - RACE.y0) * s - lane * 3 + 18 - 18);
      if (k % 2) continue;
      add(y, () => {
        const L = lane % 2 ? C('#fff4dc') : C('#ffa872'), D = lane % 2 ? C('#c8a88e') : C('#a8423e');
        op(x - 1, y, D, 0); op(x, y, L, 0); op(x + 1, y, D, 0); op(x, y - 1, L, 1); op(x + 1, y - 1, D, 1);
        op(x - 1, y - 2, L, 2); op(x, y - 2, L, 2); op(x + 1, y - 2, D, 2); op(x, y - 3, L, 3); op(x, y - 4, L, 4); op(x + 1, y - 3, D, 3); op(x + 1, y - 4, D, 4); op(x, y - 5, C('#ffffff'), 5);
      });
    }
    for (let i = 0; i < N; i++) {
      const x = i % W, y = i / W | 0;
      const s = ((x - RACE.x0) * (RACE.x1 - RACE.x0) + (y - RACE.y0) * (RACE.y1 - RACE.y0)) / (sq(RACE.x1 - RACE.x0) + sq(RACE.y1 - RACE.y0));
      if (s < -0.05 || s > 1.05) continue;
      const px = RACE.x0 + (RACE.x1 - RACE.x0) * s, py = RACE.y0 + (RACE.y1 - RACE.y0) * s;
      const off = ((x - px) * 0.5 - (y - py) * 0.9);            // across the lanes
      if (off < -1 || off > 10) continue;
      if (Math.abs(frac(off / 3) - 0.5) > 0.38 && !FREE[i]) blend(BACK, i, C('#fff8e8'), 0.55);   // lane lines raked in the sand
      else if (!FREE[i] && s > 0.93 && ((Math.floor(off) + Math.floor(s * 60)) & 1)) BACK[i] = C('#2a1a28');   // the finish line
    }
    const FINISH = [RACE.x1 + 1, RACE.y1 - 1];
    const FINISH_POSTS = [[RACE.x1 - 4, RACE.y1 + 3], [RACE.x1 + 10, RACE.y1 - 6]];
    for (const [px, py] of FINISH_POSTS) add(py, () => { for (let j = 0; j < 10; j++) op(px, py - j, C(j > 8 ? '#fff0a0' : '#5a3a2a'), j); });

    // 6. Buried Sunstones: four stones sticking out of the sand, a sidewinder's S-tracks.
    const SUNSTONES = [[194, 146], [234, 146], [232, 120], [196, 122]];
    for (const [sx, sy] of SUNSTONES) add(sy, () => {
      for (let j = 0; j < 6; j++) for (let dx = -3; dx <= 3; dx++) if (Math.abs(dx) + j * 0.55 < 3.6) op(sx + dx + (j > 2 ? 1 : 0), sy - j, C(dx < -1 ? '#fff4b0' : dx < 1 ? '#ffc040' : dx < 3 ? '#e07a20' : '#8a3a18'), j);
      for (let dx = -4; dx <= 4; dx++) op(sx + dx, sy + 1, C(dx < 0 ? '#fff0c0' : '#d49c64'), 0);
    });
    for (let k = 0; k < 90; k++) {
      const s = k / 90, x = 188 + s * 50, y = 160 - s * 8 + Math.sin(s * TAU * 4) * 2;
      if (hash(k, 3) > 0.5) put(BACK, x, y, C('#b07a4a')); else put(BACK, x, y + 1, C('#8a5a44'));
    }

    // 7. The First Crossing: a patch of the remembered night on the sand, and footprints.
    const MEM = { x: 252, y: 64 };
    const MEMI = [], MEMA = [], BAYV = [];
    for (let y = MEM.y - 20; y <= MEM.y + 20; y++) for (let x = MEM.x - 34; x <= MEM.x + 34; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const e = sq((x - MEM.x) / 32) + sq((y - MEM.y) / 18);
      const ee = e + (noise2(x / 6, y / 6, 71) - 0.5) * 0.5;
      if (ee < 1) { MEMI.push(y * W + x); MEMA.push(1 - ee); BAYV.push(bay(x, y)); }
    }
    const STEPS = [];
    for (let k = 0; k < 12; k++) {
      const s = k / 11, x = 232 + s * 44 + (k % 2 ? 2 : -2) * 0.6, y = 84 - s * 34 + (k % 2 ? 1.5 : -1.5);
      STEPS.push([Math.round(x), Math.round(y)]);
    }

    // 8. Bish-Bosh's lair: his own pyramid, leaning hard, with a plinth and a compass inlay.
    const LAIR = { x: 276, y: 106 };
    pyramid(290, 100, 30, 36, 0.62, { cap: true });
    for (let y = LAIR.y - 6; y <= LAIR.y + 5; y++) for (let x = LAIR.x - 16; x <= LAIR.x + 16; x++) {
      const e = sq((x - LAIR.x) / 15) + sq((y - LAIR.y) / 5.2);
      if (e > 1 || x >= W) continue;
      const i = y * W + x, a = Math.atan2(y - LAIR.y, (x - LAIR.x) * 0.35);
      const point = e < 0.7 && Math.abs(Math.cos(a * 2)) > 0.94;
      BACK[i] = e > 0.85 ? C('#6a4a3a') : point ? C(Math.cos(a) > 0.9 ? '#2ab0b8' : '#ffd060') : ramp(SLAB, 0.7 - e * 0.25, x, y);
      FREE[i] = 1; MASK[i] = 0;
    }

    DRAW.sort((a, b) => a.by - b.by);
    for (const d of DRAW) d.fn();

    // Long shadows to the east.
    const SHM = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (!OBJ[i] || OH[i] < 0.6) continue;
      const x = i % W, y = i / W | 0, h = OH[i], by = y + h;
      for (let s = CANOPY[i] ? Math.max(0, h - 3) : 0; s <= h; s += 0.7) {
        const sx = Math.round(x + s * SHX), sy = Math.round(by + s * SHY);
        if (sx >= 0 && sy >= 0 && sx < W && sy < H) SHM[sy * W + sx] = 1;
      }
    }
    for (let i = 0; i < N; i++) if (SHM[i] && !OBJ[i]) { blend(BACK, i, C('#2a2458'), 0.45); if (MASK[i] === 1) MASK[i] = 0; }

    const WATERI = [], MIRI = [];
    for (let i = 0; i < N; i++) { if (MASK[i] && BACK[i] !== MASKC[i]) MASK[i] = 0; if (MASK[i] === 2) WATERI.push(i); else if (MASK[i] === 3) MIRI.push(i); }
    const CRESTI = CRESTS.filter(i => !OBJ[i] && !FREE[i]);
    // Warm air near the sun side, baked in.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = clamp(1 - x / 200) * clamp(1 - y / 240);
      if (v > 0.02) blend(BACK, y * W + x, C('#fff0c0'), 0.07 * v);
    }
    const vignette = K.vignette(C('#2a1a3a'), 0.26, 0.5);

    // ---------- Bish-Bosh, cel-shaded, redrawn each frame ----------
    const BW = 32, BH = 36, SPR = new Uint32Array(BW * BH), PART = new Uint8Array(BW * BH);
    const MAT = {
      robe: P('#ffd8a4', '#ffa872', '#ff8a52', '#e0643e', '#a8423e'),
      gold: P('#fff4c0', '#ffd060', '#e0a038', '#a86a30', '#6a3a30'),
      sash: P('#aaf4e4', '#5ad0c8', '#2a9aa8', '#1e6a88', '#1a4466'),
      gem: P('#ffffff', '#b8fff0', '#4ad8d8', '#1e8aa8', '#1a4a78'),
      hand: P('#fffaf0', '#f6e8d0', '#e2ccb0', '#b89c8c', '#7e6272'),
    };
    const BRIM = C('#9ae0dc'), BLINE = C('#2e1e2e');
    const SEAM = [0, C('#c8704c'), C('#c8704c'), C('#1a4466'), C('#a86a30'), C('#c8704c'), C('#6a3a30'), C('#1a4a78'), C('#7e4a4a'), C('#7e4a4a')];
    const BLN = Math.hypot(0.7, 0.5, 0.52), BLX = -0.7 / BLN, BLY = -0.5 / BLN, BLZ = 0.52 / BLN;
    let LEAN = 0;
    const shr = y => Math.round(LEAN * (32 - y) / 30);
    function bshade(x, y, nx, ny, part, T) {
      y = Math.round(y); x = Math.round(x) + shr(y);
      if (x < 0 || y < 0 || x >= BW || y >= BH) return;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), l = nx * BLX + ny * BLY + nz * BLZ, i = y * BW + x;
      SPR[i] = nx > 0.72 && l < 0.2 ? BRIM : T[Math.round(clamp(1 - (l * 0.62 + 0.42)) * 4)];
      PART[i] = part;
    }
    function bdisc(cx, cy, rx, ry, part, T) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) bshade(x, y, nx * 0.95, ny * 0.95, part, T);
      }
    }
    const bput = (x, y, c) => { y = Math.round(y); x = Math.round(x) + shr(y); if (x >= 0 && y >= 0 && x < BW && y < BH) SPR[y * BW + x] = c; };
    function bishbosh(u, waving) {
      SPR.fill(0); PART.fill(0);
      const cx = 14;
      LEAN = Math.round(Math.sin(TAU * 12 * u) * 2.4);                 // swaying along the diagonal
      const bob = Math.sin(TAU * 24 * u) > 0.7 ? 1 : 0;
      for (let y = 30; y <= 34; y++) { const hw = 8 - (y === 30 ? 1 : 0) - (y === 34 ? 1 : 0); for (let x = cx - hw; x <= cx + hw; x++) bshade(x, y, (x - cx) / 9, y < 32 ? -0.6 : 0.1, 1, y === 31 ? MAT.gold : MAT.robe); }
      for (let y = 19; y <= 30; y++) {
        const hw = 2.6 + Math.pow((y - 19) / 11, 1.7) * 5.2;
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
          const onSash = y < 29 && Math.abs((x - cx) - (y - 24) * 0.9) < 1.4;
          bshade(x, y, (x - cx) / (hw + 0.5), 0.12, onSash ? 3 : 2, onSash ? MAT.sash : MAT.robe);
        }
      }
      bdisc(cx, 18.5 + bob * 0.5, 4.6, 1.4, 4, MAT.gold);                 // collar
      const top = 4 + bob, HY = 12 + bob;
      for (let y = top; y <= 18 + bob; y++) {                             // the mitre: pointed top, round at the face
        let hw, ny;
        if (y < HY) { const v = (y - top) / (HY - top); hw = 5.6 * Math.pow(Math.sin(v * Math.PI / 2), 0.85); ny = -0.6 * (1 - v) - 0.1; }
        else { const v = (y - HY) / 6.2; hw = 5.6 * Math.sqrt(Math.max(0, 1 - v * v)); ny = v * 0.95; }
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) bshade(x, y, (x - cx) / (hw + 0.5) * 0.95, ny, 5, MAT.robe);
      }
      bdisc(cx, top - 1.2, 1.4, 1.4, 4, MAT.gold);                        // ball finial (no cross)
      // The staff, gold, with its oasis-blue orb, and the hand holding it.
      const SX = cx + 9;
      for (let y = 8; y <= 35; y++) bshade(SX, y + (y < 20 ? bob : 0), 0.2, 0, 6, MAT.gold);
      bdisc(SX, 6 + bob, 2.1, 2.1, 7, MAT.gem);
      bdisc(SX - 1, 22 + bob, 1.8, 1.7, 8, MAT.hand);
      // The other hand: on the hip, or waving high when he has lost (and is glad of it).
      const wv = Math.sin(TAU * 60 * u);
      if (waving) bdisc(cx - 9 + Math.round(wv), 9 + bob, 1.8, 1.8, 9, MAT.hand);
      else bdisc(cx - 7, 24 + bob, 1.8, 1.7, 9, MAT.hand);
      for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
        const i = y * BW + x, p = PART[i];
        const a = x > 0 ? PART[i - 1] : 0, b = x < BW - 1 ? PART[i + 1] : 0, c = y > 0 ? PART[i - BW] : 0, d = y < BH - 1 ? PART[i + BW] : 0;
        if (!p) { if (a || b || c || d) SPR[i] = BLINE; }
        else if ((a && a < p) || (b && b < p) || (c && c < p) || (d && d < p)) SPR[i] = SEAM[p];
      }
      // The mitre's slit on the diagonal, and the face: bright eyes, a big grin.
      for (let k = 0; k < 4; k++) { bput(cx - 1 + k, top + 3 + k, C('#5a2438')); bput(cx - 2 + k, top + 4 + k, MAT.robe[0]); }
      const ey = HY + 1, blink = frac(7 * u + 0.2) < 0.03;
      for (const ex of [cx - 2, cx + 2]) { bput(ex, ey, C('#1e1420')); if (!blink) { bput(ex, ey - 1, C('#1e1420')); bput(ex, ey - 1, C('#1e1420')); } }
      bput(cx - 2, ey - 1, blink ? MAT.robe[2] : C('#ffffff'));
      for (let dx = -2; dx <= 2; dx++) bput(cx + dx, ey + 3, C('#3a1e2a'));
      bput(cx - 3, ey + 2, C('#3a1e2a')); bput(cx + 3, ey + 2, C('#3a1e2a'));
      for (let dx = -1; dx <= 1; dx++) bput(cx + dx, ey + 2, C('#fffaf0'));
      bput(cx - 4, ey + 1, C('#ff6a5a')); bput(cx + 4, ey + 1, C('#ff6a5a'));
    }

    // ---------- other animated pieces ----------
    const SCARABS = Array.from({ length: 9 }, (_, i) => ({ b: i % BURROWS.length, n: (i + 2) % BURROWS.length, k: 2 + (i % 3), p: hash(i, 41), gold: i === 4 }));
    const SPRAY = Array.from({ length: 50 }, (_, i) => ({ c: CRESTI[Math.floor(hash(i, 51) * CRESTI.length)] || 0, k: 6 + (i % 5), p: hash(i, 52) }));
    const TUMBLE = [0.1, 0.6];
    const PEN = C('#2ab0b8');

    function frame(t, state) {
      const u = t / LOOP, map = (state && state.map) || {}, cleared = map.cleared | 0, beaten = !!map.beaten;
      buf.set(BACK);

      // The patch of remembered night: a deep blue sky reflected on the sand, stars, and
      // footprints that light up one after another toward the far edge.
      {
        const pulse = 0.55 + 0.2 * Math.sin(TAU * 6 * u);
        for (let k = 0; k < MEMI.length; k++) { const a = Math.min(1, MEMA[k] * 1.5); blend(buf, MEMI[k], C(a > 0.55 + BAYV[k] * 0.3 ? '#cfe0ff' : '#9ab4f0'), a * (0.4 + 0.1 * pulse)); }
        for (let k = 0; k < 14; k++) {
          const x = MEM.x - 26 + hash(k, 61) * 52, y = MEM.y - 14 + hash(k, 62) * 28, b = Math.sin(TAU * (9 + k) * u + k);
          if (b > 0.4) put(buf, x, y, C(b > 0.9 ? '#ffffff' : '#5a78e0'));
        }
        const walk = frac(4 * u) * (STEPS.length + 4);
        STEPS.forEach(([x, y], k) => {
          const age = walk - k, on = age > 0 && age < 4;
          const a = on ? 1 - age / 4 : 0.4;
          blendAt(buf, x, y, C('#3a58d0'), 0.5 + 0.5 * a); blendAt(buf, x + 1, y, C('#6a8af0'), 0.4 + 0.5 * a); blendAt(buf, x, y - 1, C('#ffffff'), 0.2 + 0.7 * a);
          if (on && age < 1) glow(buf, x, y, 5, C('#c8e8ff'), 0.45);
        });
        // A ghost of you, a small king walking the footprints toward the far edge.
        const gi = clamp(walk - 0.5, 0, STEPS.length - 1), g0 = STEPS[Math.floor(gi)], g1 = STEPS[Math.min(STEPS.length - 1, Math.floor(gi) + 1)], gf = gi - Math.floor(gi);
        const gx = Math.round(g0[0] + (g1[0] - g0[0]) * gf), gy = Math.round(g0[1] + (g1[1] - g0[1]) * gf);
        const ga = walk < STEPS.length ? 0.55 : 0.55 * clamp(1 - (walk - STEPS.length) / 3);
        const GHOST = ['x.x.x', 'xxxxx', '.xxx.', '..x..', '.xxx.', '.xxx.', 'xxxxx'];   // crown points, no cross
        GHOST.forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] === 'x') blendAt(buf, gx - 2 + i, gy - 8 + j, C(i < 2 ? '#ffffff' : '#6a8af0'), ga + 0.2); });
        if (ga > 0.1) glow(buf, gx, gy - 4, 8, C('#c8e8ff'), ga * 0.5);
      }
      // Sand streaming off the sunlit crests in the wind.
      for (let k = 0; k < CRESTI.length; k += 2) {
        const i = CRESTI[k], x = i % W, y = (i / W) | 0;
        if (Math.sin(TAU * 20 * u - x * 0.14 - y * 0.2) > 0.82) buf[i] = C('#ffffff');
      }
      for (const s of SPRAY) {
        const v = frac(s.k * u + s.p), x0 = s.c % W, y0 = (s.c / W) | 0;
        blendAt(buf, x0 + v * 16, y0 - Math.sin(v * Math.PI) * 3 + v * 4, C('#fff4d8'), 0.6 * (1 - v));
      }
      // The oasis glints; the mirage pool shimmers (it is not really there).
      for (const i of WATERI) { const x = i % W, y = (i / W) | 0, g = Math.sin(TAU * 30 * u + hash(x >> 1, y) * TAU); if (g > 0.993) buf[i] = C('#ffffff'); else if (g > 0.975) buf[i] = C('#c8fff4'); }
      for (const i of MIRI) {
        const x = i % W, y = (i / W) | 0, w = Math.sin(TAU * 40 * u + y * 1.3 + x * 0.2);
        if (w > 0.6) buf[i] = C('#ffffff'); else if (w < -0.7) buf[i] = ramp(SUN, 0.8, x, y);
      }
      for (let y = MIR.y - 12; y < MIR.y + 7; y++) {
        const dx = Math.round(Math.sin(TAU * 40 * u + y * 0.9) * 0.9);
        if (!dx || y < 0) continue;
        const row = buf.slice(y * W, y * W + 50);
        for (let x = 0; x < 50; x++) buf[y * W + x] = row[clamp(x - dx, 0, 49)];
      }
      // Palms: fronds sway over the oasis.
      for (const P2 of PALMS) for (let f = 0; f < 6; f++) {
        const a = -Math.PI / 2 + (f - 2.5) * 0.66 + Math.sin(TAU * 24 * u + P2.p + f) * 0.1;
        for (let r = 0; r < 7; r++) put(buf, P2.x + Math.cos(a) * r, P2.y + Math.sin(a) * r * 0.6 + r * r * 0.07, C(r < 3 ? '#3a6030' : r < 5 ? '#5a8a3a' : '#8ab050'));
        put(buf, P2.x, P2.y, C('#6a4a2a'));
      }
      // Scarabs scuttling between the burrows; one of them carries the Sun Scarab.
      for (const s of SCARABS) {
        const v = frac(s.k * u + s.p), [ax, ay] = BURROWS[s.b], [bx, by] = BURROWS[s.n];
        const x = Math.round(ax + (bx - ax) * v + Math.sin(v * TAU * 3) * 2), y = Math.round(ay + (by - ay) * v);
        if (v < 0.06 || v > 0.94) continue;
        put(buf, x, y, C(s.gold ? '#ffe060' : '#1e2a3a')); put(buf, x + 1, y, C(s.gold ? '#c88a20' : '#2a4a5a'));
        if (s.gold && Math.sin(TAU * 60 * u) > 0.3) put(buf, x, y - 1, C('#ffffff'));
      }
      // The sand sprite: a little whirlwind spinning on the great dune.
      {
        const sx = SPRITE.x + Math.sin(TAU * 3 * u) * 6, sy = SPRITE.y + Math.sin(TAU * 2 * u) * 2;
        for (let s2 = 0; s2 < 10; s2++) blendAt(buf, sx + 2 + s2 * 1.3, sy + 1 + s2 * 0.45, C('#2a2458'), 0.35 * (1 - s2 / 10));
        for (let j = 0; j < 22; j++) {
          const r = 1 + j * 0.3, a = TAU * 60 * u + j * 0.7, xc = sx + j * 0.2 + Math.sin(TAU * 6 * u + j * 0.3) * j * 0.08;
          for (let k = 0; k < 3; k++) {
            const aa = a + k * TAU / 3, px = xc + Math.cos(aa) * r, front = Math.sin(aa) > 0;
            blendAt(buf, px, sy - j, C(front ? '#ffffff' : '#f4d4a0'), front ? 0.8 : 0.55);
          }
        }
        for (let k = 0; k < 8; k++) { const v = frac(6 * u + k / 8), a = k * 0.8 + TAU * 4 * u; blendAt(buf, sx + Math.cos(a) * (3 + v * 8), sy - v * 4, C('#f4dcb0'), 0.6 * (1 - v)); }
        if (Math.sin(TAU * 30 * u) > 0) { put(buf, sx - 1, sy - 21, C('#ffffff')); put(buf, sx + 3, sy - 15, C('#ffffff')); }
      }
      // Chequered flags on the finish posts, snapping in the wind.
      for (const [px, py] of FINISH_POSTS) for (let j = 0; j < 4; j++) for (let i = 1; i <= 6; i++) {
        const w = Math.round(Math.sin(TAU * 40 * u - i * 0.9 + px) * (i / 6) * 1.2);
        put(buf, px + i, py - 9 + j + w, C(((i >> 1) + (j >> 1)) % 2 ? '#fff4dc' : '#2a1a28'));
      }
      // The sunstones pulse like embers.
      SUNSTONES.forEach(([x, y], k) => {
        const f = 0.5 + 0.5 * Math.sin(TAU * 10 * u + k * 1.6);
        glow(buf, x, y - 3, 11, C('#ffb040'), 0.22 + 0.25 * f);
        if (f > 0.8) { put(buf, x - 2, y - 4, C('#ffffff')); put(buf, x - 1, y - 5, C('#ffffff')); }
      });

      // Pennants on cleared places.
      for (let k = 0; k < Math.min(cleared, 7); k++) {
        const [sx, sy] = STOPS[k], fx = sx + 13, fy = sy - 3;
        for (let j = 0; j < 9; j++) put(buf, fx, fy - j, C('#4a2e24'));
        for (let j = 0; j < 3; j++) for (let i = 1; i <= 4 - j; i++) put(buf, fx + i, fy - 8 + j + Math.round(Math.sin(TAU * 30 * u - i * 0.8 + k) * 0.6), j === 1 ? C('#5ad0c8') : PEN);
      }

      // Bish-Bosh on his plinth, his long shadow stretching east.
      {
        bishbosh(u, beaten);
        for (let s = 0; s < 16; s++) for (let w = -1; w <= 1; w++) blendAt(buf, LAIR.x + 3 + s * 1.3, LAIR.y + 2 + s * 0.45 + w, C('#2a2458'), 0.4 * (1 - s / 16));
        const X0 = LAIR.x - 14, Y0 = LAIR.y + 2 - BH + 1;
        for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) { const v = SPR[y * BW + x]; if (v) put(buf, X0 + x, Y0 + y, v); }
        const g = Math.sin(TAU * 8 * u);
        if (g > 0.6) { const ox = X0 + 23 + shr(6), oy = Y0 + 5; put(buf, ox, oy, C('#ffffff')); if (g > 0.9) { put(buf, ox - 1, oy, C('#e0fff8')); put(buf, ox + 1, oy, C('#e0fff8')); put(buf, ox, oy - 1, C('#e0fff8')); put(buf, ox, oy + 1, C('#e0fff8')); } }
      }

      // The caravan crossing the dunes near the top, shadows trailing east.
      {
        const cu = frac(2 * u);
        for (let c = 0; c < 4; c++) {
          const x = Math.round(-30 + cu * (W + 60) - c * 8), y = Math.round(44 - (x - 160) * 0.1);
          blendAt(buf, x + 3, y + 1, C('#2a2458'), 0.4); blendAt(buf, x + 4, y + 1, C('#2a2458'), 0.4);
          const step = Math.floor(t * 4 + c) % 2, col = C('#6a4a3a'), col2 = C('#a07050');
          put(buf, x - 1, y - 2, col); put(buf, x, y - 2, col2); put(buf, x + 1, y - 2, col); put(buf, x, y - 3, col2); put(buf, x + 2, y - 3, col); put(buf, x + 2, y - 4, col);
          put(buf, x - 1 + step, y - 1, col); put(buf, x + 1 - step, y - 1, col);
        }
      }
      // Vultures circling over the scarab burrows, their shadows on the sand.
      for (let v = 0; v < 2; v++) {
        const a = TAU * (4 + v) * u + v * 2, x = 80 + v * 30 + Math.cos(a) * 16, y = 96 + v * 10 + Math.sin(a) * 6;
        const up = Math.sin(TAU * 60 * u + v) > 0.6;
        blendAt(buf, x + 14, y + 20, C('#2a2458'), 0.35); blendAt(buf, x + 15, y + 20, C('#2a2458'), 0.35); blendAt(buf, x + 13, y + 20, C('#2a2458'), 0.25);
        for (const [dx, dy] of up ? [[-3, -1], [-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1], [3, -1]] : [[-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0]]) put(buf, x + dx, y + dy, C('#3a2a3a'));
      }
      // A dust devil wandering across the south of the map.
      for (const off of TUMBLE) {
        const dv = frac(u * 2 + off), dx0 = -20 + dv * (W + 40), db = 170 - dv * 20 + off * 10;
        for (let j = 0; j < 14; j++) { const r = 1 + j * 0.2, a = TAU * 90 * u + j * 0.7; blendAt(buf, dx0 + Math.cos(a) * r + j * 0.2, db - j, C('#f4dcb0'), 0.35); }
      }
      vignette(buf);
    }

    return (t, out, state) => { buf = out; frame(t, state); };
  },
});
