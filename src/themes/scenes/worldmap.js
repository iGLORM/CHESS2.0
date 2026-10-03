// The Shattered Earth: Story Mode's world map.
//
// 640x320, shown at 4x on the map screen (twice the screen wide, 1.6 times tall) and
// dragged around. The Earth drawn as the Great Board broken apart: continents you can
// recognise, split along glowing magenta rifts, with a faint giant checkerboard under
// the sea and every crack running back to the wound in the middle of the Pacific,
// where Grandmaster X's crystal floats over a whirlpool of shards.
// Each world stands where it belongs: Pawn Hollow in Japan, the Training Camp in the
// Himalayas, the Slanted Sands in Egypt, the Iron Keep in Slovenia, the Misty
// Moors in Scotland, the Royal Palace in Algeria, the Clockwork Citadel in Siberia, the
// Grand Library in Canada, Forked Gulch in Arizona, the Obsidian Court in the Andes.
// Two places are not worlds: the Crossroads Bazaar (the Shop) in the middle of Africa
// and the Arena in the Australian outback.
//
// State (set by the map screen with LiveScenes.setState('worldmap', { heal, fuse })):
//   heal: { worldId: 0..1 }  0 = faded grey and frozen, 1 = restored in colour and alive;
//                            in between, a wave of colour spreading from the landmark.
//   fuse: 0..1               after the ending the rifts close and the lands join.
//   chart: { v, from, known } before the Tilted Compass the Earth is uncharted: every
//                            land but the places in `known` (ids) is an old sepia sketch,
//                            its shapes seen, its colours not; v 0..1 is the compass's
//                            wave charting it outward from `from` ([x, y] scene px);
//                            absent or v = 1: all charted.
//   veil: 0..1               a storm hides Soulbound Pixel until the Map of the Crossing
//                            shows the way (1 = hidden, 0 = gone).
// Without state (the Node tools) every world is restored and the board still broken.
// Every motion runs a whole number of cycles per loop, so the loop is seamless.
LiveScenes.register({
  id: 'worldmap',
  width: 640,
  height: 320,
  loop: 120,
  still: 20,
  // Where each world's landmark stands (scene pixels). The map screen reads these.
  places: {
    pawnhollow: [297, 99],
    trainingcamp: [212, 110],
    slantedsands: [103, 123],
    ironkeep: [75, 75],
    mistymoors: [39, 46],
    royalpalace: [55, 111],
    clockworkcitadel: [235, 42],
    grandlibrary: [508, 64],
    forkedgulch: [488, 100],
    obsidiancourt: [562, 214],
    soulboundpixel: [395, 190],
    // Not worlds: the Shop (the Crossroads Bazaar) and the Arena. The Bazaar holds all of
    // southern Africa (shopLand), always whole, a rift along its northern edge; the Arena
    // claims a little land and no rifts. The map screen lights the Arena once it opens.
    shop: [86, 211],
    arena: [286, 238],
  },
  // How far each place's land reaches from its landmark (scene px; others: 78). The Arena
  // claims a little land; Soulbound Pixel floats in the sea and claims none. (The Shop's
  // land is shopLand, not a reach.)
  reach: { pawnhollow: 46, soulboundpixel: 0, shop: 22, arena: 24 },
  // Whether a point (scene px) lies in the Bazaar's part of the Earth: Africa (and
  // Madagascar) south of a wavy line across the Congo.
  SHOP_EDGE: 170,
  shopLand(x, y) {
    if (x < 52 || x > 150) return false;
    return y > this.SHOP_EDGE + (PixelKit.noise1(x / 9, 77) - 0.5) * 12 + (x - 90) * 0.06;
  },
  // The world whose land a map point (scene px) is in, roughly: the nearest landmark within
  // its reach (the map screen's plane uses it to change the theme). Soulbound Pixel counts
  // close over its crystal. Null far from every world.
  worldAt(x, y) {
    let best = null, bestD = 1e9;
    for (const [id, [px, py]] of Object.entries(this.places)) {
      if (id === 'shop' || id === 'arena') continue;
      const reach = id === 'soulboundpixel' ? 30 : this.reach[id] !== undefined ? this.reach[id] : 78;
      const d = Math.hypot(x - px, y - py);
      if (d < reach && d < bestD) { best = id; bestD = d; }
    }
    return best;
  },
  // How far a map point (scene px) lies outside the charted land before the compass
  // (negative: charted). `known` lists place ids (charted round their landmark) and
  // [x, y, r] circles (the road walked). A wobbly edge, like a hand-drawn chart.
  KNOWN_REACH: { shop: 46 },
  _knownCircles(known) {
    return known.map(k => (Array.isArray(k) ? k : this.places[k] ? [...this.places[k], this.KNOWN_REACH[k] || 44] : null)).filter(Boolean);
  },
  _wobble(x, y) { return (PixelKit.noise2(x / 12, y / 12, 613) - 0.5) * 14; },
  knownDist(x, y, known) {
    let d = 1e9;
    for (const [px, py, r] of this._knownCircles(known)) {
      let dx = Math.abs(x - px);
      if (dx > 320) dx = 640 - dx;
      d = Math.min(d, Math.hypot(dx, (y - py) * 1.15) - r);
    }
    return d + this._wobble(x, y);
  },
  // The same for every pixel at once (N floats), drawn circle by circle.
  knownField(known) {
    const W = 640, H = 320, F = new Float32Array(W * H).fill(1e9);
    for (const [px, py, r] of this._knownCircles(known)) {
      const R = r + 80;                              // beyond that the fog is simply deep
      const y0 = Math.max(0, Math.floor(py - R / 1.15)), y1 = Math.min(H - 1, Math.ceil(py + R / 1.15));
      for (let y = y0; y <= y1; y++) for (let x = 0; x < W; x++) {
        let dx = Math.abs(x - px);
        if (dx > 320) dx = 640 - dx;
        if (dx > R) continue;
        const d = Math.hypot(dx, (y - py) * 1.15) - r, i = y * W + x;
        if (d < F[i]) F[i] = d;
      }
    }
    for (let i = 0; i < W * H; i++) F[i] += this._wobble(i % W, i / W | 0);
    return F;
  },
  create() {
    const W = 640, H = 320, N = W * H, LOOP = 120;
    const { TAU, rgb, mix, C, clamp, sq, frac, bay, ramp, hash, noise1, noise2, blend } = PixelKit;
    const { put, blendAt, over, gear } = PixelKit.surface(W, H);
    const PLACES = LiveScenes.get('worldmap').places;
    const IDS = Object.keys(PLACES);
    const WILD = IDS.length;                 // land far from every world: restored by the fusing
    const NEUTRAL = new Set(['shop', 'arena', 'soulboundpixel']);
    const NEUT = IDS.map(id => NEUTRAL.has(id));
    // The Bazaar's land is bounded by a rift, unlike the other places that are not worlds.
    const NORIFT = IDS.map(id => NEUTRAL.has(id) && id !== 'shop');
    let buf = null;

    // Longitude/latitude to scene pixels: longitude 27°W on the left edge, the Pacific in
    // the middle, latitudes 80°N to 60°S.
    const LON0 = -27;
    const PX = lon => ((lon < LON0 ? lon + 360 : lon) - LON0) * W / 360;
    const PY = lat => (80 - lat) * H / 140;
    const LON = x => { const l = x * 360 / W + LON0; return l > 180 ? l - 360 : l; };
    const LAT = y => 80 - y * 140 / H;

    // ---------- continents (rough outlines in longitude, latitude) ----------
    // Japan and Britain are drawn a little larger than life, to give their worlds room.
    const JP = ([a, b]) => [137 + (a - 137) * 1.7 + 2, 36.5 + (b - 36.5) * 1.7];
    const GB = ([a, b]) => [-2 + (a + 2) * 1.4, 50.9 + (b - 50.3) * 1.45];
    const LANDS = [
      // North America and Central America
      [[-168, 66], [-162, 70], [-156, 71.5], [-141, 69.5], [-128, 70], [-115, 68.5], [-100, 68], [-95, 71.5], [-86, 69.5], [-81, 64], [-90, 62], [-94, 58.5], [-89, 56], [-82, 55], [-80, 51.5], [-78, 57], [-77, 60.5], [-72, 61.5], [-64, 60], [-60, 55], [-56, 52], [-59, 48], [-64, 45], [-66, 44], [-70, 42], [-74, 40.5], [-76, 37], [-76, 35], [-79, 33], [-81, 31], [-80, 27], [-80.5, 25], [-82, 26.5], [-83, 29.5], [-86, 30.3], [-89, 30.2], [-94, 29.5], [-97, 27.5], [-97.5, 22], [-95, 18.5], [-91, 18.5], [-90.5, 21], [-87, 21.5], [-88, 16], [-84, 15.5], [-83.5, 11], [-81.5, 9], [-79, 9.5], [-77.3, 8.5], [-78, 7.5], [-80.5, 7.5], [-85, 10], [-87.5, 13], [-91.5, 14], [-95, 16], [-100, 17], [-105.5, 20], [-105.5, 23], [-109, 26], [-112.5, 29.5], [-114.5, 31.5], [-117, 32.5], [-120.5, 34.5], [-122.5, 37.5], [-124, 40.5], [-124.2, 46], [-124.8, 48.5], [-128, 51], [-131, 54.5], [-135, 58.5], [-140, 60], [-146, 61], [-151, 60], [-154, 58], [-158, 57], [-163, 55], [-159, 58.5], [-162, 60], [-165.5, 62], [-164.5, 64.5]],
      // Canada's Arctic islands
      [[-124, 71.5], [-110, 73], [-97, 72.5], [-90, 72], [-80, 72.5], [-72, 70.5], [-66, 68], [-62, 66], [-68, 74], [-78, 76], [-80, 82], [-100, 82], [-118, 78], [-124, 75]],
      // Greenland (kept west of the map's edge)
      [[-54, 60], [-44, 60], [-40, 64.5], [-33, 68], [-28, 70], [-28, 82], [-45, 83], [-62, 82], [-72, 78.5], [-67, 76.5], [-58, 75.5], [-55, 72], [-53.5, 68], [-51.5, 64]],
      // South America
      [[-77.5, 8.5], [-75.5, 10.8], [-72, 12], [-66, 10.8], [-61.5, 10.5], [-58, 6.5], [-52.5, 5.2], [-50, 1.5], [-48.5, -1], [-44, -2.5], [-39, -3.8], [-35.2, -6], [-35, -9.5], [-38.5, -13.5], [-39.5, -18], [-41, -22], [-44.5, -23.2], [-48.5, -26.5], [-49, -29], [-53, -33.5], [-56.5, -35], [-57.5, -38.2], [-62, -39], [-65, -41], [-64.5, -43], [-67.5, -46.5], [-66, -48], [-68.5, -50.5], [-68.5, -52.5], [-71, -54.5], [-74.5, -51], [-75.5, -46], [-73.5, -42.5], [-73.5, -37], [-71.5, -31], [-70.3, -23], [-70.3, -18.5], [-71.5, -17.2], [-76, -14], [-79.5, -7.5], [-81.2, -5], [-80.2, -1.5], [-79.5, 1], [-77.5, 4], [-77.4, 7]],
      // Eurasia
      [[-9, 37], [-9.5, 43], [-2, 43.5], [-1.2, 46], [-4.5, 48], [-1.5, 49], [1.5, 50.5], [4, 51.8], [7, 53.5], [8.5, 55], [8.2, 57], [10.5, 57.5], [10.8, 55.5], [14, 54], [18.5, 54.8], [21, 56.5], [24, 58.2], [28.5, 59.8], [23, 60.5], [21.5, 62.5], [24.5, 65], [21.5, 66], [17.5, 62.5], [18.5, 60], [16.5, 57], [12.8, 55.8], [11, 59], [5.5, 58.5], [5, 62], [12, 66], [16, 69], [22, 70.5], [30, 70.2], [33, 69], [40, 66.8], [41.5, 64.8], [44, 66.2], [44.2, 68.4], [54, 68.8], [60, 69.5], [68.5, 73], [73, 72.5], [80, 73.5], [88, 75.5], [100, 77.5], [106, 77], [113, 74], [128, 73], [140, 72.5], [150, 71.5], [160, 70], [170, 70], [180, 69], [190, 66], [185, 64.5], [178, 62.3], [172, 60.5], [163, 58], [162, 55], [156.5, 51], [158, 57.5], [163, 60.5], [160, 61.5], [155, 59.3], [142, 59.2], [137, 54], [141, 52], [140, 48], [135.5, 43.5], [130.5, 42.5], [129.4, 36], [126.5, 34.5], [126.2, 37.8], [125, 39.8], [121.5, 40.8], [118, 39], [121, 37.5], [119.5, 35], [121, 32], [122, 30], [119.8, 25.8], [116, 22.8], [110.5, 21], [108.5, 21.5], [106.5, 18.5], [109.2, 13], [107, 10.3], [105, 8.8], [103, 10.5], [100.8, 13.2], [99.8, 8.5], [103.5, 1.5], [100.5, 3.5], [98.3, 8], [98.3, 15.5], [94.5, 16.5], [94, 20.5], [91.5, 22.5], [87, 21.5], [85, 19.5], [80.3, 15.5], [80, 10], [77.5, 8], [76, 11], [73, 17.5], [72.5, 21], [69, 22.5], [67, 24.8], [62, 25.2], [57.5, 25.7], [57, 27], [52.5, 27.8], [50, 30.2], [48, 29.8], [50.5, 25.5], [51.5, 24.2], [54, 24.2], [56.2, 26], [56.5, 24], [59.8, 22.5], [57, 18.8], [55, 17], [52, 15.7], [45, 13], [43.2, 13], [39.2, 21], [35.8, 26.5], [34.5, 28], [32.5, 30], [32, 31.2], [34.5, 31.8], [35.8, 34.5], [36, 36.7], [32, 36.2], [29.5, 36.3], [27, 37.2], [26.2, 40], [23.5, 40.3], [22.8, 37.5], [21.2, 37.8], [19.5, 41.5], [15.8, 43.7], [13.2, 45.7], [12.3, 44.5], [14.5, 42], [16.5, 41], [18.4, 40.1], [16, 38], [15.6, 40], [12.2, 41.8], [10.5, 43], [8.8, 44.4], [7, 43.6], [4.5, 43.4], [3.2, 42], [0.8, 41], [-0.3, 39.3], [-0.8, 37.6], [-2, 36.7], [-5.5, 36], [-7.5, 37.2]],
      // Africa
      [[-17, 21], [-16, 24], [-13, 27.5], [-10, 29.8], [-9.5, 32.8], [-6.5, 35.5], [-2, 35.2], [3, 36.8], [10, 37.2], [11, 35], [10.5, 33.5], [15, 32.3], [20, 30.8], [20.5, 32.6], [25, 32], [29.5, 31], [32, 31.2], [32.5, 30], [34.5, 28], [35.8, 24], [37.3, 21], [38.5, 17.7], [39.8, 15.5], [42.8, 12.5], [44, 10.5], [51.2, 11.8], [51, 10.2], [49.5, 6.5], [48, 5], [43, -0.5], [40.2, -3], [39.2, -7.5], [40, -11], [40.5, -15.5], [36.5, -18.5], [35.2, -22.5], [35.5, -24], [32.8, -26], [31, -29.5], [28, -33], [25, -34], [20, -34.8], [18.3, -34.2], [18, -31.5], [16.5, -28.5], [14.5, -22.5], [11.8, -17.5], [13.5, -11.5], [12.2, -6], [12, -5], [9.2, -1.2], [9.5, 3.5], [8.5, 4.5], [6, 4.3], [2.5, 6.3], [-2, 4.8], [-7.5, 4.3], [-12, 7.2], [-14.5, 10.5], [-16.8, 12.5], [-17.5, 14.8], [-16.5, 19]],
      [[43.5, -25], [47, -25], [50.5, -15.5], [49.3, -12], [48, -13.5], [44, -17]],                 // Madagascar
      [[-5.5, 50], [1.5, 51.2], [1.8, 52.8], [0, 53.8], [-1.8, 55.8], [-2, 57.6], [-3.3, 58.7], [-5.2, 58.6], [-6.2, 56.7], [-5.6, 55.3], [-3.2, 54.4], [-4.6, 53.3], [-4.2, 52.2], [-5.3, 51.7]].map(GB), // Great Britain
      [[-10.3, 51.6], [-6.2, 52.2], [-6, 54], [-7.5, 55.3], [-10, 54.3]].map(GB),                            // Ireland
      [[-24, 64.5], [-22, 66.2], [-15, 66.4], [-13.5, 65], [-18, 63.3]],                             // Iceland
      [[11, 77.5], [18, 80.2], [27, 80], [22, 77.8]],                                                // Svalbard
      [[52, 71], [55, 73.5], [60, 76], [68.5, 76.8], [60, 74.8], [56.5, 72.5], [54, 70.8]],          // Novaya Zemlya
      [[130, 31.2], [131.5, 33.8], [135, 34.4], [138.8, 34.7], [140.8, 36.2], [141.2, 38.5], [142, 40.5], [141.2, 41.5], [140, 41], [139.8, 39.5], [139.2, 38], [136.8, 37.2], [133.2, 35.6], [130.8, 34.2]].map(JP), // Japan
      [[140, 42], [143.5, 42], [145.5, 43.3], [142.5, 45.5], [141.5, 45.2]].map(JP),                        // Hokkaido
      [[120.2, 22.2], [121.8, 25], [121, 25.3], [120, 23.5]],                                        // Taiwan
      [[120.2, 18.5], [122.3, 18.4], [124.2, 13], [126.3, 7.5], [125.5, 6], [122, 7], [123, 10.5], [120.5, 14.5]], // Philippines
      [[95.2, 5.6], [98.2, 4], [104.2, -2], [106, -5.8], [102.5, -4.2], [99, -0.2], [96, 2.5]],     // Sumatra
      [[105.5, -6], [110, -6.8], [114.5, -7.5], [114.3, -8.6], [109, -7.8], [105.5, -7]],           // Java
      [[109.5, 1.5], [113, 3.5], [116.5, 7], [119, 5], [118, 1], [116.2, -3.8], [111, -3.2], [109, -1]], // Borneo
      [[119, 1], [125, 1.5], [121, -1], [123, -5.5], [120.5, -5.5], [119.5, -3]],                   // Sulawesi
      [[131, -1], [135, -3.5], [138, -1.8], [144, -3.8], [147.5, -6], [150.5, -10.5], [145, -8], [141, -9], [138, -8.3], [133, -4]], // New Guinea
      [[113.5, -22], [113.8, -26.5], [115, -34], [118, -35], [123.5, -33.8], [129, -31.6], [134, -32.8], [138, -35.5], [140.5, -38], [146, -39], [150, -37.5], [153, -32], [153.5, -25], [149.5, -21.5], [146, -18.5], [145.3, -14.8], [143.5, -14], [142.3, -10.7], [141.5, -17], [139.5, -17.6], [136.5, -15.5], [136.8, -12.2], [132.5, -11.3], [129.5, -15], [126, -14], [122.2, -17.5], [119, -20]], // Australia
      [[145, -41], [148.2, -41], [147.5, -43.3], [146, -43.5]],                                      // Tasmania
      [[172.7, -34.4], [174.8, -36.8], [178.5, -37.6], [176.9, -39.6], [174.8, -41.4], [172.8, -40.5], [174, -39]], // New Zealand, north
      [[172.5, -41], [174.2, -41.8], [171.2, -44.3], [168.5, -46.6], [166.5, -46], [168.3, -44]], // New Zealand, south
      [[79.8, 9.8], [81.9, 7.5], [81.2, 6.2], [80, 6.2]],                                            // Sri Lanka
      [[-85, 21.8], [-80.5, 23], [-74.2, 20.2], [-77.5, 19.8], [-81, 21.5]],                        // Cuba
      [[-74.5, 19.8], [-68.5, 18.6], [-70, 17.8], [-74.3, 18.2]],                                    // Hispaniola
    ];

    // Rasterise into a land mask (scanline, even-odd per outline), then roughen the coasts by
    // sampling it through a little noise.
    const RAW = new Uint8Array(N);
    for (const poly of LANDS) {
      const pts = poly.map(([lo, la]) => [PX(lo), PY(la)]);
      let y0 = H, y1 = 0;
      for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, Math.ceil(y1)); y++) {
        const yc = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2)
          for (let x = Math.max(0, Math.round(xs[k])); x < Math.min(W, Math.round(xs[k + 1])); x++) RAW[y * W + x] = 1;
      }
    }
    const LAND = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (noise2(x / 5, y / 5, 3) - 0.5) * 3.2, dy = (noise2(x / 5, y / 5, 4) - 0.5) * 3.2;
      const sx = Math.round(x + dx), sy = Math.round(y + dy);
      LAND[y * W + x] = sx >= 0 && sy >= 0 && sx < W && sy < H ? RAW[sy * W + sx] : 0;
    }
    // Drop single-pixel specks and pinholes.
    for (let pass = 0; pass < 2; pass++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, n = LAND[i - 1] + LAND[i + 1] + LAND[i - W] + LAND[i + W];
      if (LAND[i] && n <= 1) LAND[i] = 0; else if (!LAND[i] && n >= 3) LAND[i] = 1;
    }

    // Distance to the nearest coast, for the sea's shelves (two-pass chamfer).
    const DIST = new Float32Array(N);
    for (let i = 0; i < N; i++) DIST[i] = LAND[i] ? 0 : 999;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let d = DIST[i];
      if (x > 0) d = Math.min(d, DIST[i - 1] + 1);
      if (y > 0) d = Math.min(d, DIST[i - W] + 1, x > 0 ? DIST[i - W - 1] + 1.41 : 999, x < W - 1 ? DIST[i - W + 1] + 1.41 : 999);
      DIST[i] = d;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; let d = DIST[i];
      if (x < W - 1) d = Math.min(d, DIST[i + 1] + 1);
      if (y < H - 1) d = Math.min(d, DIST[i + W] + 1, x < W - 1 ? DIST[i + W + 1] + 1.41 : 999, x > 0 ? DIST[i + W - 1] + 1.41 : 999);
      DIST[i] = d;
    }

    // ---------- relief ----------
    // Mountain ranges as polylines [lon, lat] with a height and a width (scene pixels).
    const RANGES = [
      { h: 0.98, w: 3.2, pts: [[73, 35.5], [78, 32], [84, 28.8], [88, 27.8], [93, 28], [96, 28.5]] },           // Himalaya
      { h: 0.62, w: 9, pts: [[78, 34], [86, 33], [95, 32.5], [100, 33]] },                                     // Tibet
      { h: 0.6, w: 3, pts: [[70, 41], [78, 42], [86, 43], [92, 43.5]] },                                       // Tian Shan
      { h: 0.72, w: 2.4, pts: [[5.5, 45], [8, 46.2], [11, 46.8], [14.5, 47]] },                                // Alps
      { h: 0.42, w: 2.4, pts: [[40, 43.5], [44, 42.8], [48, 41.5]] },                                          // Caucasus
      { h: 0.45, w: 2.4, pts: [[45, 36], [50, 33], [55, 29], [58, 27]] },                                      // Zagros
      { h: 0.42, w: 2.2, pts: [[-8, 30.5], [-4, 32], [2, 34], [8, 35.5]] },                                    // Atlas
      { h: 0.38, w: 2.4, pts: [[59.5, 51], [60, 58], [60.5, 64], [65, 68]] },                                  // Urals
      { h: 0.46, w: 2.6, pts: [[6.5, 59], [9, 62], [13, 65], [17, 68], [20, 69.5]] },                          // Scandinavia
      { h: 0.28, w: 3, pts: [[38, 9], [37, 3], [36, -3], [35, -9]] },                                           // East Africa
      { h: 0.9, w: 2.6, pts: [[-73, 10], [-76.5, 5], [-78, -1], [-76, -9], [-72, -15], [-69, -19], [-68.5, -24], [-70, -30], [-71, -37], [-72, -44], [-73, -51]] }, // Andes
      { h: 0.72, w: 3.4, pts: [[-150, 62.5], [-137, 60], [-128, 56], [-120, 51], [-114, 46], [-110, 41], [-107, 36.5], [-106, 32]] }, // Rockies
      { h: 0.3, w: 2.2, pts: [[-86, 34], [-80, 37.5], [-76, 41], [-71, 44]] },                                 // Appalachians
      { h: 0.4, w: 2.4, pts: [[-117.5, 34], [-120, 38], [-122, 42], [-121.5, 47]] },                          // Sierra and Cascades
      { h: 0.34, w: 2.2, pts: [[146.5, -38], [148, -33], [150, -28], [146, -20]] },                            // Great Dividing Range
      { h: 0.4, w: 1.6, pts: [[131, 33.5], [134.5, 35], [138, 36], [140.5, 39], [141, 41]].map(JP) },                 // Japan
      { h: 0.4, w: 2.4, pts: [[100, 52], [110, 55], [120, 57], [132, 60], [145, 63]] },                       // Siberian uplands
    ].map(r => ({ ...r, pts: r.pts.map(([lo, la]) => [PX(lo), PY(la)]) }));
    const HEIGHT = new Float32Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (LAND[i]) HEIGHT[i] = 0.1 + 0.16 * noise2(x / 9, y / 9, 11) + 0.08 * noise2(x / 3.5, y / 3.5, 12);
    }
    // Each range raises the land near it (only pixels inside each segment's box are visited).
    const RD = new Float32Array(N);
    for (const r of RANGES) {
      RD.fill(1e9);
      const reach = r.w * 3;
      for (let k = 0; k + 1 < r.pts.length; k++) {
        const [ax, ay] = r.pts[k], [bx, by] = r.pts[k + 1];
        const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
        for (let y = Math.max(0, Math.floor(Math.min(ay, by) - reach)); y <= Math.min(H - 1, Math.ceil(Math.max(ay, by) + reach)); y++)
          for (let x = Math.max(0, Math.floor(Math.min(ax, bx) - reach)); x <= Math.min(W - 1, Math.ceil(Math.max(ax, bx) + reach)); x++) {
            const s = clamp(((x - ax) * vx + (y - ay) * vy) / l2);
            const d = sq(x - ax - s * vx) + sq(y - ay - s * vy), i = y * W + x;
            if (d < RD[i]) RD[i] = d;
          }
      }
      for (let i = 0; i < N; i++) if (LAND[i] && RD[i] < reach * reach) {
        const x = i % W, y = i / W | 0;
        HEIGHT[i] = Math.max(HEIGHT[i], r.h * Math.exp(-RD[i] / sq(r.w)) * (0.8 + 0.3 * noise2(x / 2.2, y / 2.2, 13)));
      }
    }

    // ---------- biomes ----------
    const PAL = {
      grass: ['#2c5238', '#3c6c3e', '#548a42', '#76a44c', '#a8c25c'],
      forest: ['#1c3a34', '#264c38', '#325e3c', '#447242', '#6e904e'],
      jungle: ['#173f2c', '#205430', '#2c6c32', '#448838', '#78aa44'],
      steppe: ['#6a6636', '#86803e', '#a09a4c', '#bab462', '#dcd48a'],
      savanna: ['#6e5a2e', '#8c763a', '#a8924a', '#c2ac5c', '#e0cc84'],
      desert: ['#9c6636', '#bc8444', '#d4a258', '#e6c074', '#f6dea0'],
      redrock: ['#6a2e24', '#8c3e2a', '#ae5634', '#cc7444', '#eca468'],
      tundra: ['#5c6a66', '#78867c', '#98a292', '#b8bea8', '#dcdcc4'],
      highland: ['#4a3a38', '#645044', '#806852', '#9c8462', '#c0a884'],
      snow: ['#7c8cb0', '#9cb0d0', '#c0d2e8', '#e2ecf6', '#ffffff'],
      volcanic: ['#241c2a', '#342a38', '#483a46', '#62504e', '#8a6a5a'],
    };
    const PALC = {};
    for (const k in PAL) PALC[k] = PAL[k].map(C);
    const inBox = (lo, la, a, b, c, d, j) => lo > a - j && lo < b + j && la > c - j && la < d + j;
    function biome(x, y, h) {
      const lo = LON(x), la = LAT(y);
      const j = (noise2(x / 7, y / 7, 21) - 0.5) * 7 + (noise2(x / 18, y / 18, 22) - 0.5) * 14;   // ragged borders, in degrees
      const lj = la + j;
      if (lo < -20 && lo > -75 && la > 59.5) return 'snow';     // Greenland's ice
      if (h > 0.46) return lo < -60 && lo > -80 && la < 0 && la > -30 ? 'volcanic' : la > 58 ? 'tundra' : 'highland';
      if (lj > 70) return 'snow';
      if (lj > 63) return 'tundra';
      if (inBox(lo, la, -117, -103, 29, 38, j * 0.5)) return 'redrock';
      if (inBox(lo, la, -17, 34, 16, 31, j * 0.6) && !(Math.abs(lo - 31.2) < 1.2 && la < 31 && la > 22)) return 'desert';
      if (inBox(lo, la, 35, 60, 13, 31, j * 0.6)) return 'desert';
      if (inBox(lo, la, 52, 72, 25, 38, j * 0.5)) return 'desert';
      if (inBox(lo, la, 88, 112, 38, 46, j * 0.5)) return 'desert';
      if (inBox(lo, la, 117, 145, -32, -19, j * 0.6)) return 'desert';
      if (inBox(lo, la, 14, 26, -28, -18, j * 0.4)) return 'desert';
      if (inBox(lo, la, -71.5, -68, -28, -17, 0)) return 'desert';
      if (lj > 52) return 'forest';
      if (inBox(lo, la, 40, 95, 40, 52, j * 0.5) || inBox(lo, la, -108, -96, 32, 52, j * 0.5) || inBox(lo, la, -72, -63, -52, -38, j * 0.4)) return 'steppe';
      if (Math.abs(lj) < 9 && !(lo > 36 && lo < 52 && la > -4)) return 'jungle';
      if (lj > 8 && lj < 16 && lo > -17 && lo < 50) return 'savanna';
      if (lj < -8 && lj > -26 && ((lo > 12 && lo < 42) || (lo > 120 && lo < 150) || (lo > -65 && lo < -40))) return 'savanna';
      if (Math.abs(lj) < 14) return 'jungle';
      return 'grass';
    }

    // ---------- the sea ----------
    // Deep and cold, lighter over the shelves, and under it all the Great Board's squares.
    const SEA = ['#0e1f44', '#112650', '#14305e', '#183b6c', '#1d4a7c', '#24608e', '#2f7ea2', '#3fa0b2', '#62c2bc'].map(C);
    const SEAB = new Uint32Array(N);
    const SQ = 40;                                              // one board square, scene pixels
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const d = DIST[i];
      const dark = ((x / SQ | 0) + (y / SQ | 0)) & 1;
      let t = 0.52 - 0.3 * clamp(d / 26) + 0.34 * Math.exp(-d / 2.2) + 0.1 * (noise2(x / 22, y / 22, 31) - 0.5);
      t -= dark ? 0.07 : 0;
      t -= 0.12 * clamp((y - 250) / 70) + 0.06 * clamp((40 - y) / 40);
      SEAB[i] = ramp(SEA, t, x, y);
    }
    // Sea ice in the far north: solid floes with a lit north-west edge and a shaded
    // south-east one, split by dark leads of open water.
    const ICE = ['#86a2c4', '#c4d6ea', '#eaf2fa'].map(C);
    const FLOE = new Uint8Array(N);
    for (let y = 0; y < 30; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (LAND[i]) continue;
      const v = noise2(x / 9, y / 5, 41) * 0.7 + noise2(x / 3.5, y / 3.5, 42) * 0.3 - y / 34;
      const lead = Math.abs(noise2(x / 14, y / 7, 43) - 0.5) < 0.035;
      if (v > 0.2 && !lead) FLOE[i] = 1;
    }
    for (let y = 0; y < 30; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!FLOE[i]) continue;
      const up = y === 0 || FLOE[i - W] || LAND[i - W], left = FLOE[i - 1] || LAND[i - 1];
      const down = y < H - 1 && (FLOE[i + W] || LAND[i + W]), right = FLOE[i + 1] || LAND[i + 1];
      SEAB[i] = !up || !left ? ICE[2] : !down || !right ? ICE[0] : ICE[1];
    }
    // ---------- land colour ----------
    const LANDC = new Uint32Array(N);         // restored colour (0 = sea)
    const BIOME = new Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!LAND[i]) continue;
      const h = HEIGHT[i];
      const b = biome(x, y, h);
      BIOME[i] = b;
      // Light from the north-west: slopes facing it are warm, the others cool.
      const hl = x > 0 && y > 0 ? HEIGHT[i - W - 1] : h, hr = x < W - 1 && y < H - 1 ? HEIGHT[i + W + 1] : h;
      const slope = (hl - hr) * (b === 'snow' || b === 'rock' || b === 'volcanic' ? 3.2 : 5);
      let t = 0.52 + slope + 0.14 * (noise2(x / 4, y / 4, 51) - 0.5);
      if (DIST[i] === 0 && x < W - 1 && !LAND[i + 1 + W]) t -= 0.12;   // a shaded south-east coast
      LANDC[i] = ramp(PALC[b], t, x, y);
    }
    // Woods: little trees on a jittered grid, lit on top and shaded underneath.
    const TREES = { forest: 0.8, jungle: 0.9, grass: 0.22, savanna: 0.08 };
    for (let cy = 0; cy < H / 3; cy++) for (let cx = 0; cx < W / 3; cx++) {
      const x = cx * 3 + (hash(cx, cy * 7 + 1) * 3 | 0), y = cy * 3 + (hash(cx * 5 + 2, cy) * 3 | 0);
      if (y + 1 >= H || x >= W) continue;
      const i = y * W + x, b = BIOME[i];
      if (!LAND[i] || !LAND[i + W] || !TREES[b] || HEIGHT[i] > 0.4) continue;
      const dens = TREES[b] * (0.55 + 0.9 * noise2(x / 10, y / 10, 55));
      if (hash(cx * 3, cy * 11 + 5) > dens) continue;
      LANDC[i] = PALC[b][b === 'forest' ? 3 : 4];
      LANDC[i + W] = PALC[b][0];
    }

    // Mountains: rows of little peaks along each range, lit on the side facing the light.
    const PEAKS = [];
    RANGES.forEach((r, ri) => {
      for (let k = 0; k + 1 < r.pts.length; k++) {
        const [ax, ay] = r.pts[k], [bx, by] = r.pts[k + 1];
        const len = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / len, ny = (bx - ax) / len;
        const rows = r.w > 5 ? 3 : 1;
        for (let s = hash(ri, k) * 3; s < len; s += 3.2 + hash(ri * 13 + k, s * 3) * 2.4) for (let row = 0; row < rows; row++) {
          const f = s / len, jit = (hash(ri * 97 + k, s * 10 + row) - 0.5) * r.w * (rows > 1 ? 2.4 : 1.6);
          const x = Math.round(ax + (bx - ax) * f + nx * jit), y = Math.round(ay + (by - ay) * f + ny * jit);
          const hh = Math.round(2 + r.h * 5.5 * (0.5 + 0.7 * hash(ri, s * 31 + row * 7)) * (rows > 1 ? 0.7 : 1));
          const clear = IDS.every(id => id === 'trainingcamp' || Math.hypot(x - PLACES[id][0], y - PLACES[id][1]) > 15);
          if (clear && x >= 0 && y >= 0 && x < W && y < H && LAND[y * W + x]) PEAKS.push({ x, y, hh, volc: BIOME[y * W + x] === 'volcanic' });
        }
      }
    });
    PEAKS.sort((a, b) => a.y - b.y);
    const PK = ['#3a3040', '#5c4c52', '#8a7462', '#b8a088', '#e0ccaa'].map(C);
    const PKV = ['#1c1620', '#2c2430', '#443640', '#645050', '#8a7064'].map(C);
    const SNOW = [C('#9aaccc'), C('#dce6f4'), C('#ffffff')];
    const PEAKM = new Uint8Array(N);
    for (const p of PEAKS) {
      const pal = p.volc ? PKV : PK, hw = p.hh * 0.95, snowline = p.hh >= 5 ? Math.round(p.hh * 0.38) : p.hh >= 4 ? 1 : 0;
      for (let j = 0; j <= p.hh; j++) {
        const span = Math.round(j * hw / p.hh);
        for (let dx = -span; dx <= span; dx++) {
          const x = p.x + dx, y = p.y - p.hh + j;
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const i = y * W + x;
          if (!LAND[i] && j === p.hh) continue;
          let c;
          const edge = dx === -span || dx === span;
          if (j < snowline && !p.volc) c = dx < 0 ? SNOW[edge ? 2 : 1] : SNOW[0];
          else if (dx < 0) c = edge ? pal[4] : pal[3];
          else if (dx === 0) c = pal[2];
          else c = edge || j === p.hh ? pal[0] : pal[1];
          LANDC[i] = c;
          LAND[i] = 1;
          PEAKM[i] = 1;
        }
      }
    }

    // Coast: a lit sand rim on the north-west shores.
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!LAND[i] || BIOME[i] === 'snow' || PEAKM[i]) continue;
      if (!LAND[i - 1] || !LAND[i - W]) LANDC[i] = BIOME[i] === 'desert' || BIOME[i] === 'redrock' ? PALC.desert[4] : C('#d8c88a');
    }

    // Rivers.
    const RIVERS = [
      [[31, 31], [31.2, 27], [32.8, 24], [33.5, 19], [32.5, 15.5]],                   // Nile
      [[-50, -0.5], [-56, -2.5], [-62, -3.2], [-68, -3.5], [-73, -4.5]],              // Amazon
      [[-90, 29.5], [-91, 33], [-90, 37], [-91.5, 41], [-94, 45]],                    // Mississippi
      [[88, 22], [84, 25.3], [80, 26.5], [78, 29.5]],                                 // Ganges
      [[121.5, 31.5], [116, 30.5], [111, 30.5], [106, 29.5], [100, 27]],              // Yangtze
      [[80, 72.5], [82, 66], [84, 60], [86, 54]],                                     // Yenisei
    ];
    const RIV = C('#3f86b8'), RIVL = C('#78bcd8'), NILEG = C('#4e9a46');
    RIVERS.forEach((r, ri) => {
      for (let k = 0; k + 1 < r.length; k++) {
        const [ax, ay] = [PX(r[k][0]), PY(r[k][1])], [bx, by] = [PX(r[k + 1][0]), PY(r[k + 1][1])];
        const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
        for (let s = 0; s <= n; s++) {
          const f = s / n, wob = (noise1((k + f) * 3, 60 + ri) - 0.5) * 1.6;
          const x = Math.round(ax + (bx - ax) * f + wob), y = Math.round(ay + (by - ay) * f);
          const i = y * W + x;
          if (!LAND[i]) continue;
          if (ri === 0) for (const o of [-1, 1]) if (LAND[i + o]) LANDC[i + o] = NILEG;
          LANDC[i] = (x + y) % 3 ? RIV : RIVL;
        }
      }
    });

    // ---------- faded colours (a world not yet restored) ----------
    const fadeCache = new Map();
    function fade(c) {
      let v = fadeCache.get(c);
      if (v !== undefined) return v;
      const r = c & 255, g = c >> 8 & 255, b = c >> 16 & 255;
      const l = 0.3 * r + 0.55 * g + 0.15 * b;
      const R = (l * 0.62 + r * 0.1 + 14), G = (l * 0.62 + g * 0.1 + 12), B = (l * 0.66 + b * 0.1 + 30);
      v = (0xff000000 | (Math.min(255, B) << 16) | (Math.min(255, G) << 8) | Math.min(255, R)) >>> 0;
      fadeCache.set(c, v);
      return v;
    }

    const same = c => c;
    const toHex = c => '#' + [c & 255, c >> 8 & 255, c >> 16 & 255].map(v => v.toString(16).padStart(2, '0')).join('');

    // ---------- landmarks ----------
    // Built from a few shaded primitives, lit from the upper left. Their pixels join the
    // land layer (so they fade with their world); what moves is drawn each frame by ANIM.
    const LMK = new Uint8Array(N).fill(255);   // the world a landmark pixel belongs to
    const ANIM = [];                           // { k, fn(u, col) } motions, frozen while k is broken
    const K = id => IDS.indexOf(id);
    const pal = (...h) => h.map(C);
    let LW = 0;                                // the world being built
    function pix(x, y, c) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const q = y * W + x;
      LANDC[q] = c; LAND[q] = 1; LMK[q] = LW;
    }
    // A box seen from the front: lit left, shaded right, dark base. P = [outline, shade, mid, lit, highlight].
    function block(x, yb, w, h, P) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const c = j === h - 1 ? P[0] : i === w - 1 ? P[1] : i === 0 || j === 0 ? P[4] : i < w * 0.5 ? P[3] : P[2];
        pix(x + i, yb - h + 1 + j, c);
      }
    }
    function crenels(x, ytop, w, P) { for (let i = 0; i < w; i += 2) pix(x + i, ytop - 1, i < w / 2 ? P[4] : P[2]); }
    // A pointed roof or a pyramid; lean shifts the apex sideways.
    function cone(cx, yb, hw, h, P, lean = 0) {
      for (let j = 0; j <= h; j++) {
        const f = j / h, mid = cx + lean * (1 - f), l = Math.round(mid - hw * f), r = Math.round(mid + hw * f);
        for (let x = l; x <= r; x++) pix(x, yb - h + j, x === r ? P[0] : x < mid - 0.5 ? (x === l ? P[4] : P[3]) : x <= mid + 0.5 ? P[2] : P[1]);
      }
    }
    function dome(cx, yb, r, P) {
      for (let dy = -r; dy <= 0; dy++) for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r + r * 0.6) continue;
        const l = (-dx - dy * 0.6) / r;
        pix(cx + dx, yb + dy, l > 0.75 ? P[4] : l > 0.2 ? P[3] : l > -0.3 ? P[2] : P[1]);
      }
    }
    function shadow(cx, cy, rx, ry) {
      const S = C('#120e1c');
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H || sq((x - cx) / rx) + sq((y - cy) / ry) > 1) continue;
        const q = y * W + x;
        if (LAND[q] && LMK[q] === 255) blend(LANDC, q, S, 0.35);
      }
    }
    // A flat patch of ground for a landmark to stand on.
    function ground(cx, cy, rx, ry, P) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const d = sq((x - cx) / rx) + sq((y - cy) / ry);
        if (d > 1 - 0.25 * noise2(x / 2, y / 2, 5)) continue;
        pix(x, y, ramp(P, 0.35 + 0.4 * noise2(x / 3, y / 3, 6) - (y - cy) / ry * 0.25, x, y));
      }
    }
    // A hand-placed sprite: rows of characters, each a colour from map ('.' is empty);
    // (ax, ay) is the middle of its bottom row.
    function sprite(rows, map, ax, ay) {
      const w = Math.max(...rows.map(r => r.length)), x0 = Math.round(ax - (w - 1) / 2), y0 = ay - rows.length + 1;
      const M = {};
      for (const k in map) M[k] = C(map[k]);
      rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (M[r[i]]) pix(x0 + i, y0 + j, M[r[i]]); });
      return { x0, y0 };
    }
    const windows = [];                        // { k, x, y } flickering warm
    const win = (x, y) => { pix(x, y, C('#ffc860')); windows.push({ k: LW, x: Math.round(x), y: Math.round(y) }); };
    const smokes = [];                         // { k, x, y, n, warm }

    // Pawn Hollow, Japan: the windmill from the prologue, a thatched cottage, a cherry tree.
    {
      LW = K('pawnhollow');
      const [X, Y] = PLACES.pawnhollow;
      ground(X, Y + 1, 12, 4, pal('#3c6c3e', '#548a42', '#76a44c', '#a8c25c'));
      shadow(X + 3, Y + 2, 5, 2);
      const MILL = { o: '#3a2630', T: '#f0b860', t: '#b8743a', u: '#8a4e2a', L: '#fff4dc', l: '#e0ceae', s: '#a8948e', d: '#4a2e24', w: '#ffc860' };
      sprite([
        '....T....',
        '...TTt...',
        '..TTTtt..',
        '.TTTTttu.',
        '..oooooo.',
        '..LLlss..',
        '..LwLss..',
        '..LLlss..',
        '.LLLlsss.',
        '.LLLlsss.',
        '.LLddsss.',
        '.LLddsso.',
        'ooooooooo',
      ], MILL, X, Y + 2);
      windows.push({ k: LW, x: X - 1, y: Y - 4 });
      // Cottage, down the hill to the left.
      shadow(X - 8, Y + 4, 4, 1.5);
      sprite([
        '...TTt...',
        '..TTTtt..',
        '.TTTTttt.',
        'TTTTTtttu',
        '.LLwLlss.',
        '.LLdLlso.',
        '.ooooooo.',
      ], { ...MILL, u: '#8a4e2a' }, X - 9, Y + 4);
      windows.push({ k: LW, x: X - 10, y: Y + 2 });
      smokes.push({ k: LW, x: X - 7, y: Y - 3, n: 5 });
      // Cherry tree, to the right.
      shadow(X + 10, Y + 3, 3, 1.2);
      pix(X + 9, Y + 3, C('#4a3024')); pix(X + 9, Y + 2, C('#5a3a2a'));
      const CH = pal('#8a3c64', '#c45a88', '#ec8ab0', '#ffc2d8', '#fff0f4');
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const d = Math.hypot(dx, dy * 1.2);
        if (d > 3.3 - hash(dx + 9, dy + 4) * 0.7) continue;
        const l = (-dx - dy) / 3;
        pix(X + 9 + dx, Y - 1 + dy, l > 0.9 ? CH[4] : l > 0.1 ? CH[3] : l > -0.6 ? CH[2] : CH[1]);
      }
      // The sails turn: 16 quarter turns a loop.
      const hub = [X, Y - 8], ARM = C('#5a3a28'), SAIL = C('#fff6e4'), SAILS = C('#d0bca0');
      ANIM.push({ k: LW, fn(u, col) {
        const a0 = TAU / 4 * 16 * u + 0.4;
        for (let q = 0; q < 4; q++) {
          const a = a0 + q * TAU / 4, cx = Math.cos(a), cy = Math.sin(a);
          for (let r = 2.5; r <= 8; r += 0.5) for (let s2 = 0.5; s2 <= 2; s2 += 0.5)
            put(buf, hub[0] + cx * r - cy * s2, hub[1] + cy * r + cx * s2, col(r % 2 < 0.6 || s2 > 1.9 ? SAILS : SAIL));
          for (let r = 0; r <= 8; r += 0.5) put(buf, hub[0] + cx * r, hub[1] + cy * r, col(ARM));
        }
        put(buf, hub[0], hub[1], col(C('#2a1a14')));
      } });
      // Petals drift off the tree.
      const PET = [C('#ffd0e0'), C('#ff9cc0')];
      ANIM.push({ k: LW, fn(u, col) {
        for (let p = 0; p < 7; p++) {
          const v = frac(4 * u + p / 7);
          const x = X + 9 + v * 16 + Math.sin(TAU * (12 * u + p * 0.3)) * 1.5, y = Y - 1 + v * 7 + (hash(p, 3) - 0.5) * 4;
          put(buf, x, y, col(PET[p & 1]));
        }
      } });
    }

    // The Training Camp, the Himalayas: a pagoda dojo on a peak, a hologram pawn beside it.
    {
      LW = K('trainingcamp');
      const [X, Y] = PLACES.trainingcamp;
      ground(X, Y + 2, 10, 4, pal('#584a52', '#7a6a66', '#9c8a7c', '#cabaa2'));
      shadow(X + 3, Y + 3, 7, 2.5);
      const ST = pal('#2a2230', '#6a5e66', '#9a8e8e', '#c4b8ac', '#e8dccc');
      const RF = pal('#2a1418', '#7a2230', '#a83438', '#d45444', '#f08060');
      const WL = pal('#2a1a20', '#a88a7a', '#d8bea0', '#f0dcbc', '#fff0d8');
      block(X - 6, Y + 3, 13, 2, ST);                 // stone platform
      block(X - 4, Y + 1, 9, 3, WL);                  // ground floor
      cone(X, Y - 2, 7, 2, RF);                       // first roof, flared
      pix(X - 7, Y - 1, RF[3]); pix(X + 7, Y - 1, RF[1]);
      block(X - 3, Y - 3, 7, 2, WL);
      cone(X, Y - 5, 5, 2, RF);
      pix(X - 5, Y - 4, RF[3]); pix(X + 5, Y - 4, RF[1]);
      block(X - 2, Y - 6, 5, 2, WL);
      cone(X, Y - 8, 4, 2, RF);
      pix(X, Y - 11, C('#ffd060')); pix(X, Y - 12, C('#ffe890'));
      win(X - 2, Y); win(X + 1, Y); win(X - 1, Y - 4);
      pix(X, Y, C('#3a2020'));
      // Paper lanterns on the eaves swing a little; the hologram pawn flickers and turns.
      const LAN = [C('#ff9040'), C('#ffd070')], HO = pal('#1a6a8a', '#3ab8e0', '#8ff0ff', '#e0ffff');
      ANIM.push({ k: LW, fn(u, col) {
        for (const [lx, ly, p] of [[X - 7, Y, 0], [X + 7, Y, 1.3]]) {
          const f = Math.sin(TAU * 23 * u + p) + Math.sin(TAU * 61 * u + p * 2);
          put(buf, lx, ly, col(LAN[f > 0.3 ? 1 : 0]));
        }
        const hx = X + 11, hy = Y - 1;
        const glitch = Math.sin(TAU * 13 * u) + Math.sin(TAU * 41 * u) > 1.6;
        const scan = frac(10 * u) * 9;
        const sh = [];
        ['.x.', 'xxx', '.x.', 'xxx', '.x.', '.x.', 'xxx', 'xxxxx'].forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === 'x') sh.push([i - (r.length >> 1), j - 8]); });
        for (const [dx, dy] of sh) {
          const c = Math.abs(-dy - scan) < 0.8 ? HO[3] : dx < 0 ? HO[2] : HO[1];
          put(buf, hx + dx + (glitch && dy < -3 ? 1 : 0), hy + dy + Math.round(Math.sin(TAU * 6 * u)), col(c));
        }
        put(buf, hx - 1, hy + 1, col(HO[0])); put(buf, hx, hy + 1, col(HO[1])); put(buf, hx + 1, hy + 1, col(HO[0]));
      } });
    }

    // The Slanted Sands, Egypt: three pyramids leaning along Bish-Bosh's diagonal, the
    // mitre monument across the Nile, palms, a caravan and circling vultures.
    {
      LW = K('slantedsands');
      const [X, Y] = PLACES.slantedsands;
      const PY1 = pal('#4a2a14', '#94582a', '#c8883e', '#ffe2a0', '#fff6d0');
      ground(X - 6, Y + 1, 15, 5, pal('#b88040', '#d09a50', '#e0b060', '#ecc878'));
      shadow(X - 1, Y + 2, 12, 2.5);
      cone(X - 15, Y + 2, 4, 4, PY1, 1.5);
      cone(X - 7, Y + 2, 8, 8, PY1, 3);
      cone(X + 2, Y + 3, 5, 5, PY1, 2);
      // The mitre monument (a bishop's mitre with a ball on top; no cross).
      const mx = X + 13, my = Y;
      shadow(mx + 2, my + 1, 4, 1.5);
      sprite([
        '..b..',
        '..L..',
        '.LLs.',
        '.LdS.',
        'LLdSS',
        'LLdSS',
        'LldSs',
        'PPPPp',
        'ooooo',
      ], { b: '#ffe890', L: '#f8dca0', l: '#e0b878', s: '#b08048', S: '#9a6a38', d: '#4a2a14', P: '#c89858', p: '#8a5a30', o: '#4a2e1a' }, mx, my + 1);
      // Palms along the Nile
      const PT = C('#6a4a2a'), PF = [C('#2c6a34'), C('#4a9a40'), C('#8ac858')];
      for (const [px, py] of [[X + 7, Y - 5], [X + 6, Y + 3], [X + 9, Y + 6]]) {
        pix(px, py, PT); pix(px, py - 1, PT);
        for (const [dx, dy, c] of [[-2, -1, 0], [-1, -2, 2], [0, -2, 1], [1, -2, 1], [2, -1, 0], [0, -3, 2]]) pix(px + dx, py + dy, PF[c]);
      }
      // Heat shimmer over the sand, a caravan of camels, vultures circling.
      const CAM = C('#5a3a20'), CAML = C('#8a5a30'), VUL = C('#2a1a1a');
      ANIM.push({ k: LW, fn(u, col) {
        for (let y = Y - 8; y < Y - 2; y++) {
          const off = Math.round(Math.sin(TAU * 20 * u + y * 0.9) * 0.7);
          if (!off) continue;
          const row = y * W;
          if (off > 0) for (let x = X + 8; x > X - 20; x--) buf[row + x] = buf[row + x - 1];
          else for (let x = X - 20; x < X + 8; x++) buf[row + x] = buf[row + x + 1];
        }
        const v = frac(2 * u);
        for (let c = 0; c < 4; c++) {
          const x = X - 30 + v * 24 - c * 3, y = Y + 8 - v * 3;
          put(buf, x, y, col(CAM)); put(buf, x + 1, y - 1, col(CAML)); put(buf, x - 1, y, col(CAM));
          if (Math.sin(TAU * 60 * u + c) > 0) put(buf, x, y + 1, col(CAM));
        }
        for (let b = 0; b < 2; b++) {
          const a = TAU * (6 * u + b / 2), x = X - 6 + Math.cos(a) * 9, y = Y - 12 + Math.sin(a) * 3;
          const up = Math.sin(TAU * 90 * u + b) > 0;
          put(buf, x, y, col(VUL)); put(buf, x - 1, y - (up ? 1 : 0), col(VUL)); put(buf, x + 1, y - (up ? 1 : 0), col(VUL));
        }
      } });
    }

    // The Iron Keep, Slovenia: an iron fortress, Rook-E's rook tower in the middle,
    // a forge glowing in the gate, a red banner.
    {
      LW = K('ironkeep');
      const [X, Y] = PLACES.ironkeep;
      shadow(X + 3, Y + 3, 9, 2.5);
      const IR = pal('#16161e', '#3a3c4a', '#5c5e6e', '#8a8c9c', '#b8bac8');
      block(X - 8, Y + 3, 17, 5, IR);                  // curtain wall
      crenels(X - 8, Y - 1, 17, IR);
      block(X - 10, Y + 3, 4, 8, IR); crenels(X - 10, Y - 4, 4, IR);
      block(X + 7, Y + 3, 4, 8, IR); crenels(X + 7, Y - 4, 4, IR);
      block(X - 3, Y + 1, 7, 11, IR);                  // the rook tower
      block(X - 4, Y - 9, 9, 2, IR); crenels(X - 4, Y - 10, 9, IR);
      for (const [rx, ry] of [[-6, 1], [-2, 1], [2, 1], [6, 1], [-1, -5], [2, -5]]) pix(X + rx, Y + ry, C('#d8dae8'));
      pix(X, Y + 2, C('#1a0a08')); pix(X + 1, Y + 2, C('#1a0a08')); pix(X, Y + 1, C('#1a0a08')); pix(X + 1, Y + 1, C('#1a0a08'));
      win(X - 1, Y - 6); win(X + 1, Y - 3); win(X - 9, Y - 1); win(X + 8, Y - 1);
      const FG = pal('#c83a10', '#ff7a20', '#ffc050', '#fff0a0'), BN = pal('#6a1420', '#b02a34', '#e04848');
      ANIM.push({ k: LW, fn(u, col) {
        const f = 0.5 + 0.25 * Math.sin(TAU * 37 * u) + 0.25 * Math.sin(TAU * 83 * u);
        put(buf, X, Y + 2, col(FG[f > 0.7 ? 2 : 1])); put(buf, X + 1, Y + 2, col(FG[f > 0.4 ? 1 : 0]));
        put(buf, X, Y + 1, col(FG[0])); put(buf, X + 1, Y + 1, col(f > 0.8 ? FG[1] : FG[0]));
        for (let s = 0; s < 5; s++) {
          const v = frac(9 * u + s / 5);
          put(buf, X + 0.5 + Math.sin(TAU * (s * 0.37 + 3 * u)) * v * 3, Y + 1 - v * 8, col(FG[v < 0.4 ? 3 : v < 0.7 ? 2 : 1]));
        }
        // The banner on the tower flaps.
        put(buf, X + 4, Y - 12, col(C('#2a2a34'))); put(buf, X + 4, Y - 13, col(C('#2a2a34'))); put(buf, X + 4, Y - 14, col(C('#2a2a34')));
        for (let i = 1; i <= 5; i++) for (let j = 0; j < 2; j++) {
          const w = Math.round(Math.sin(TAU * 24 * u - i * 0.9) * (i / 5) * 0.8);
          put(buf, X + 4 + i, Y - 14 + j + w, col(BN[j === 0 ? 2 : i > 3 ? 0 : 1]));
        }
      } });
    }

    // The Misty Moors, Scotland: a ruined watchtower with one warm lantern, standing
    // stones, purple heather; fog drifts and will-o'-wisps float.
    {
      LW = K('mistymoors');
      const [X, Y] = PLACES.mistymoors;
      const HE = pal('#3a2a44', '#5a3a64', '#7a4e80', '#9a6a9c');
      ground(X, Y + 2, 7, 3, HE);
      shadow(X + 2, Y + 2, 4, 1.5);
      const SS = pal('#1a1c26', '#44485a', '#6a6e80', '#9498a8', '#c0c4d0');
      block(X - 2, Y + 2, 5, 10, SS);
      // A broken top: ragged crenels.
      pix(X - 2, Y - 8, SS[4]); pix(X - 1, Y - 9, SS[3]); pix(X, Y - 8, SS[3]); pix(X + 2, Y - 8, SS[2]);
      pix(X + 1, Y - 3, C('#1a1c26'));
      win(X, Y - 5);
      // Standing stones in a ring
      for (let s = 0; s < 6; s++) {
        const a = s / 6 * TAU, sx = X - 8 + Math.cos(a) * 3, sy = Y + 4 + Math.sin(a) * 1.3;
        pix(sx, sy, SS[3]); pix(sx, sy - 1, SS[4]);
      }
      const FOG = C('#b8c8d4'), WISP = pal('#3aa0a0', '#8ff0e0', '#e8fff8');
      ANIM.push({ k: LW, fn(u, col) {
        for (let b = 0; b < 3; b++) {
          const y0 = Y - 4 + b * 4, x0 = X - 14 + frac(u * (2 + b) + b * 0.3) * 30 - 6;
          for (let y = y0; y < y0 + 2; y++) for (let x = x0; x < x0 + 12; x++) {
            const e = 1 - Math.abs((x - x0 - 6) / 6);
            if (e * 0.9 > bay(x | 0, y)) blendAt(buf, x, y, col(FOG), 0.35);
          }
        }
        for (let w = 0; w < 3; w++) {
          const a = TAU * (3 * u + w / 3), x = X - 9 + Math.cos(a) * 6 + Math.sin(TAU * 7 * u + w) * 1.5, y = Y + 1 + Math.sin(a * 2) * 2;
          if (Math.sin(TAU * 17 * u + w * 2) > -0.4) { put(buf, x, y, col(WISP[2])); blendAt(buf, x + 1, y, col(WISP[1]), 0.5); blendAt(buf, x - 1, y, col(WISP[1]), 0.5); blendAt(buf, x, y - 1, col(WISP[0]), 0.4); }
        }
      } });
    }

    // The Royal Palace, Algeria: white marble and gold on the edge of the Sahara, a crowned
    // dome, slim towers, a garden pool with fountains and date palms.
    {
      LW = K('royalpalace');
      const [X, Y] = PLACES.royalpalace;
      ground(X, Y + 3, 14, 5, pal('#b88040', '#d09a50', '#e0b060', '#ecc878'));
      ground(X, Y + 5, 7, 3, pal('#3c6c3e', '#548a42', '#76a44c', '#a8c25c'));
      shadow(X + 3, Y + 2, 10, 2);
      const MB = pal('#6a5a7a', '#b0a8c8', '#dcd6ea', '#f4f0fa', '#ffffff');
      const GD = pal('#6a4210', '#b07a1c', '#e0a830', '#ffd460', '#fff0a0');
      block(X - 8, Y + 2, 17, 4, MB);
      block(X - 4, Y - 1, 9, 3, MB);
      dome(X, Y - 3, 4, MB);
      // The crown on the dome: three points and a ball, no cross.
      pix(X - 1, Y - 8, GD[3]); pix(X, Y - 8, GD[3]); pix(X + 1, Y - 8, GD[2]);
      pix(X - 1, Y - 9, GD[4]); pix(X + 1, Y - 9, GD[2]); pix(X, Y - 10, GD[4]);
      for (const tx of [X - 10, X + 10]) {
        block(tx - 1, Y + 2, 2, 9, MB);
        pix(tx - 1, Y - 7, GD[3]); pix(tx, Y - 7, GD[2]); pix(tx - 1, Y - 8, GD[4]);
      }
      for (const wx of [X - 6, X - 3, X + 3, X + 6]) pix(wx, Y, C('#8a7ab0'));
      pix(X, Y + 1, C('#4a3a6a')); pix(X, Y, C('#4a3a6a'));
      // The pool.
      const PO = pal('#1e4a7a', '#2e6a9a', '#58a0c8');
      for (let j = 0; j < 3; j++) for (let i = -2; i <= 2; i++) pix(X + i, Y + 4 + j, PO[i === -2 ? 2 : 1]);
      const pool = [];
      for (let j = 0; j < 3; j++) for (let i = -1; i <= 2; i++) pool.push([X + i, Y + 4 + j]);
      // Date palms beside the garden.
      const PTR = C('#6a4a2a'), PFR = [C('#2c6a34'), C('#4a9a40'), C('#8ac858')];
      for (const [px, py] of [[X - 13, Y + 6], [X + 13, Y + 6], [X - 15, Y + 3]]) {
        pix(px, py, PTR); pix(px, py - 1, PTR); pix(px, py - 2, PTR);
        for (const [dx, dy, c] of [[-2, -2, 0], [-1, -3, 2], [0, -3, 1], [1, -3, 1], [2, -2, 0], [0, -4, 2]]) pix(px + dx, py + dy, PFR[c]);
      }
      const JET = C('#e8f4ff'), GLINT = C('#ffffff'), GOLDG = C('#fff6c8');
      ANIM.push({ k: LW, fn(u, col) {
        for (const [px, py] of pool) if (Math.sin(TAU * 30 * u + hash(px, py) * TAU) > 0.8) put(buf, px, py, col(GLINT));
        for (const fx of [X - 6, X + 6]) {
          const hgt = 2 + Math.round(Math.sin(TAU * 20 * u + fx) * 0.8);
          for (let j = 1; j <= hgt; j++) put(buf, fx, Y + 4 - j + 1, col(JET));
          put(buf, fx - 1, Y + 5 - hgt, col(JET)); put(buf, fx + 1, Y + 5 - hgt, col(JET));
        }
        // A glint travels over the gold.
        const gx = Math.round(frac(3 * u) * 30) - 8;
        if (gx >= -1 && gx <= 1) put(buf, X + gx, Y - 9 + Math.abs(gx), col(GOLDG));
      } });
    }

    // The Clockwork Citadel, Siberia: a brass clock tower in the snow, a great gear
    // turning beside it, smokestacks.
    {
      LW = K('clockworkcitadel');
      const [X, Y] = PLACES.clockworkcitadel;
      ground(X, Y + 2, 12, 4, pal('#9cb0d0', '#c0d2e8', '#e2ecf6', '#ffffff'));
      shadow(X + 3, Y + 2, 10, 2);
      const BR = pal('#3a2410', '#7a5024', '#b07a36', '#e0aa50', '#ffd880');
      const CU = pal('#2a1810', '#6a3420', '#a0522e', '#c86a40', '#e89060');
      block(X - 9, Y + 2, 16, 4, CU);                  // the works
      block(X - 3, Y + 1, 6, 12, BR);                  // the clock tower
      cone(X - 1, Y - 11, 3, 3, pal('#1a3a3a', '#2a6a64', '#3a8a80', '#5ab0a0', '#8ae0c8'));
      for (const sx of [X - 8, X - 5]) { block(sx, Y - 2, 2, 5, pal('#141018', '#2a2228', '#3a3036', '#4e444a', '#6a5e62')); smokes.push({ k: LW, x: sx, y: Y - 8, n: 6 }); }
      for (const wx of [X - 7, X + 4, X + 6]) win(wx, Y);
      // Clock face.
      const cx = X - 1, cy = Y - 6, FACE = C('#fff4d8'), RIM = C('#7a5024');
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const d = Math.hypot(dx, dy); if (d < 2.6) pix(cx + dx, cy + dy, d > 1.9 ? RIM : FACE); }
      const GEARP = pal('#f0c068', '#b07a36', '#6a4420', '#1a1008'), GEARF = GEARP.map(fade);
      const TEAL = pal('#1a6a6a', '#4ae0c8');
      ANIM.push({ k: LW, fn(u, col) {
        const a = TAU * 12 * u, hand = col(C('#2a1c14'));
        put(buf, cx + Math.round(Math.cos(a - TAU / 4) * 1.6), cy + Math.round(Math.sin(a - TAU / 4) * 1.6), hand);
        put(buf, cx + Math.round(Math.cos(TAU * u - TAU / 4)), cy + Math.round(Math.sin(TAU * u - TAU / 4)), hand);
        put(buf, cx, cy, hand);
        // The gear: eight teeth, turning one tooth-step 8 times a loop.
        const gp = col === same ? GEARP : GEARF, ga = TAU * 8 * u / 8;
        for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
          const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) - ga, tooth = Math.cos(a * 8) > 0.25 ? 1.6 : 0;
          if (d > 4 + tooth) continue;
          put(buf, X + 8 + dx, Y - 4 + dy, d < 1.2 ? gp[3] : d < 2.6 ? gp[2] : dx + dy < -1 ? gp[0] : dx + dy > 2 ? gp[2] : gp[1]);
        }
        for (const [wx, wy, p] of [[X + 4, Y, 0], [X + 6, Y, 1], [X - 7, Y, 2]]) if (Math.sin(TAU * 8 * u + p) > 0.3) put(buf, wx, wy, col(TEAL[1]));
      } });
    }

    // The Grand Library, Canada: a round domed library with glowing arched windows among
    // the pines, books flapping around it like birds.
    {
      LW = K('grandlibrary');
      const [X, Y] = PLACES.grandlibrary;
      shadow(X + 3, Y + 2, 9, 2.5);
      const SN = pal('#3a2e2a', '#8a7a6a', '#b8a68c', '#dccaa8', '#f4e6c8');
      const CP = pal('#143a32', '#2a6a5a', '#3a8a74', '#5aae90', '#8ad4b4');
      block(X - 9, Y + 2, 7, 5, SN); block(X + 3, Y + 2, 7, 5, SN);
      cone(X - 6, Y - 3, 4, 2, CP); cone(X + 6, Y - 3, 4, 2, CP);
      block(X - 4, Y + 2, 9, 8, SN);
      dome(X, Y - 6, 5, CP);
      cone(X, Y - 11, 1, 3, CP);
      pix(X, Y - 15, C('#ffe890'));
      for (const wx of [X - 2, X, X + 2]) { win(wx, Y - 2); win(wx, Y - 3); }
      for (const wx of [X - 7, X - 5, X + 5, X + 7]) win(wx, Y);
      pix(X, Y + 1, C('#3a2418')); pix(X, Y + 0, C('#3a2418'));
      const PN = pal('#10261e', '#1e4030', '#2e5a3e', '#4a7a4a');
      for (const [px, py] of [[X - 14, Y + 2], [X - 12, Y - 1], [X + 13, Y + 1], [X + 15, Y - 2], [X - 16, Y - 3], [X + 12, Y + 5]]) {
        shadow(px + 1, py + 1, 2, 1);
        for (let j = 0; j < 5; j++) { const hw = Math.floor(j / 2); for (let dx = -hw; dx <= hw; dx++) pix(px + dx, py - 5 + j, dx < 0 ? PN[3] : dx === 0 ? PN[2] : PN[1]); }
        pix(px, py, C('#3a2418'));
      }
      const BK = [pal('#8a2a2a', '#e05050'), pal('#2a4a8a', '#5a8ae0'), pal('#2a6a3a', '#5ac070')];
      ANIM.push({ k: LW, fn(u, col) {
        for (let b = 0; b < 5; b++) {
          const a = TAU * (4 * u + b / 5), x = X + Math.cos(a) * 11, y = Y - 12 + Math.sin(a) * 3 + Math.sin(TAU * 9 * u + b) * 1;
          const P = BK[b % 3], open = Math.sin(TAU * 80 * u + b * 2) > 0;
          put(buf, x, y, col(P[1])); put(buf, x + 1, y, col(P[1]));
          put(buf, x - 1, y - (open ? 1 : 0), col(P[0])); put(buf, x + 2, y - (open ? 1 : 0), col(P[0]));
        }
      } });
    }

    // Forked Gulch, Arizona: the great forked butte, a frontier town, a railroad with a
    // steam train crossing.
    {
      LW = K('forkedgulch');
      const [X, Y] = PLACES.forkedgulch;
      shadow(X + 4, Y + 1, 10, 2.5);
      const RR = pal('#3a1410', '#7a3222', '#b05030', '#dc7a48', '#fcb878');
      ground(X, Y + 2, 16, 5, pal('#c08850', '#d8a466', '#e6bc7a', '#f0d090'));
      // The butte: a mesa whose top splits into two prongs (the fork).
      sprite([
        '.lL.....lLs..',
        '.LLs....LLs..',
        '.LLs....LLss.',
        'lLLss..lLLss.',
        'LLLss..LLLss.',
        'LLLLsddLLLsss',
        'HHHHHHHHHHhhh',
        'LLLLLLsssssss',
        'LlLLLLssSssss',
        'LLLLLLsssssso',
        'ooooooooooooo',
      ], { L: '#e08a52', l: '#fcc080', s: '#9a4430', S: '#6a2a1c', d: '#3a1410', H: '#fcc890', h: '#c86a44', o: '#3a1410' }, X - 2, Y);
      // Town
      const WD = pal('#2a1a10', '#6a4428', '#9a6a3a', '#c8945a', '#e8bc80');
      block(X + 7, Y + 3, 4, 3, WD); block(X + 12, Y + 3, 3, 4, WD);
      win(X + 8, Y + 2); win(X + 13, Y + 1);
      // Cactus
      const CA = [C('#2a5a2a'), C('#5a9a40')];
      for (const [cx2, cy2] of [[X - 11, Y + 3], [X + 16, Y + 6]]) { pix(cx2, cy2, CA[0]); pix(cx2, cy2 - 1, CA[1]); pix(cx2, cy2 - 2, CA[1]); pix(cx2 - 1, cy2 - 1, CA[1]); pix(cx2 + 1, cy2 - 2, CA[0]); }
      // Rails
      const RL = C('#3a2a24'), TIE = C('#6a4a34');
      for (let x = X - 18; x <= X + 18; x++) { pix(x, Y + 5, (x & 1) ? RL : TIE); }
      const TR = pal('#141018', '#2a2430', '#4a4050', '#c83a2a', '#ffd070');
      ANIM.push({ k: LW, fn(u, col) {
        const v = frac(3 * u), tx = Math.round(X - 26 + v * 52);
        for (let c = 0; c < 4; c++) {
          const x0 = tx - c * 4;
          for (let i = 0; i < 3; i++) {
            if (x0 + i < X - 18 || x0 + i > X + 18) continue;
            put(buf, x0 + i, Y + 4, col(TR[c === 0 ? 1 : 3])); put(buf, x0 + i, Y + 3, col(TR[c === 0 ? 2 : i === 1 ? 4 : 3]));
          }
        }
        if (tx >= X - 18 && tx <= X + 18) {
          put(buf, tx + 2, Y + 2, col(TR[0]));
          for (let s = 0; s < 5; s++) {
            const w = frac(12 * u + s / 5), sx = tx + 2 - w * 8, sy = Y + 1 - w * 4;
            if (sx > X - 18) blendAt(buf, sx, sy, col(C('#e8e0d8')), 0.6 * (1 - w));
          }
        }
      } });
    }

    // The Obsidian Court, the Andes: a black volcano with lava running down it, and
    // Checkmate's obsidian court at its foot with the giant hourglass.
    {
      LW = K('obsidiancourt');
      const [X, Y] = PLACES.obsidiancourt;
      shadow(X + 4, Y + 2, 11, 2.5);
      const OB = pal('#08060c', '#1e1824', '#302838', '#4a3e54', '#7a6a8a');
      cone(X, Y + 1, 11, 11, OB);
      for (let dx = -2; dx <= 2; dx++) pix(X + dx, Y - 10, C('#ff6a1a'));
      pix(X - 1, Y - 11, OB[3]); pix(X + 1, Y - 11, OB[2]);
      // Lava streams (their pixels, top to bottom, glow in a travelling wave).
      const lava = [];
      for (const [sx, dir] of [[-1, -1], [1, 1]]) {
        let x = X + sx;
        for (let j = 0; j < 10; j++) {
          x += dir * (hash(j, sx + 5) > 0.45 ? 0.6 : 0.2);
          lava.push([Math.round(x), Y - 9 + j, j]);
          pix(x, Y - 9 + j, C('#c83a10'));
        }
      }
      // The court: a stepped obsidian dais with an hourglass.
      block(X + 8, Y + 3, 9, 2, OB); block(X + 9, Y + 1, 7, 2, OB);
      const HG = pal('#6a4a2a', '#c89048', '#ffe080');
      for (const [dx, dy] of [[0, 0], [2, 0], [0, -5], [2, -5]]) pix(X + 11 + dx, Y - 0 + dy, HG[0]);
      for (let j = 1; j < 5; j++) { const w = Math.abs(j - 2.5) > 1 ? 1 : 0; for (let dx = -w; dx <= w; dx++) pix(X + 12 + dx, Y - j, C('#a8b8d8')); }
      const LV = pal('#8a1a08', '#e0400e', '#ff8a24', '#ffd060', '#fff4c0'), SMK = C('#4a3a44');
      ANIM.push({ k: LW, fn(u, col) {
        for (const [lx, ly, j] of lava) {
          const p = 0.5 + 0.5 * Math.sin(TAU * 10 * u - j * 0.8);
          put(buf, lx, ly, col(LV[Math.min(4, 1 + Math.floor(p * 3.2))]));
        }
        const cr = Math.sin(TAU * 31 * u) + Math.sin(TAU * 7 * u);
        for (let dx = -2; dx <= 2; dx++) put(buf, X + dx, Y - 10, col(LV[cr > 0.5 ? 4 : 3]));
        for (let s = 0; s < 8; s++) {
          const v = frac(4 * u + s / 8), r = 1 + v * 3;
          const sx = X + v * 10 + Math.sin(TAU * (s * 0.3 + 5 * u)) * 1.5, sy = Y - 12 - v * 14;
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) blendAt(buf, sx + dx, sy + dy, col(SMK), 0.35 * (1 - v));
        }
        for (let e = 0; e < 5; e++) {
          const v = frac(7 * u + e / 5);
          put(buf, X + (hash(e, 9) - 0.5) * 6 * v, Y - 11 - v * 9, col(LV[v < 0.5 ? 3 : 2]));
        }
        // Sand falls through the hourglass.
        if (Math.sin(TAU * 40 * u) > -0.5) put(buf, X + 12, Y - 2, col(HG[2]));
        put(buf, X + 12, Y - 1, col(HG[1]));
      } });
    }

    // The Crossroads Bazaar (the Shop), the middle of Africa: striped market tents under a
    // great baobab, a golden coin sign turning on its pole, lanterns, a merchant's camel.
    {
      LW = K('shop');
      const [X, Y] = PLACES.shop;
      ground(X, Y + 2, 16, 5, pal('#9a6a34', '#b88444', '#cfa058', '#e2bc72'));
      shadow(X + 3, Y + 2, 13, 2.5);
      // The baobab: a fat trunk and a flat crown of branches.
      const BT = pal('#2a1810', '#5a3a22', '#7a5030', '#9a6a40', '#b8885a'), BL = pal('#1e4a22', '#2e6a2e', '#4a8a3a', '#7ab04c');
      block(X - 13, Y + 1, 4, 7, BT);
      for (const [dx, dy] of [[-15, -7], [-14, -8], [-10, -8], [-9, -7], [-12, -8]]) pix(X + dx, Y + dy, BT[1]);
      for (let dx = -19; dx <= -5; dx++) for (let dy = -11; dy <= -8; dy++) {
        const e = Math.abs(dx + 12) / 8 + (dy === -11 ? 0.5 : 0);
        if (e < 1 && hash(dx, dy * 3) > 0.12) pix(X + dx, Y + dy, dy === -11 ? BL[3] : dy === -10 ? BL[2] : dy === -9 ? BL[1] : BL[0]);
      }
      // Three striped tents (shaded on the right, lit on the left).
      const blend2 = (c, f) => {
        const r = Math.min(255, (c & 255) * f) | 0, g = Math.min(255, (c >> 8 & 255) * f) | 0, b = Math.min(255, (c >> 16 & 255) * f) | 0;
        return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
      };
      const TENT = [[C('#c83a2a'), C('#f4e8d0')], [C('#2a5aa8'), C('#ffd24a')], [C('#8a2a8a'), C('#f4e8d0')]];
      [[-3, 1, 5, 5], [5, 2, 4, 4], [11, 0, 4, 5]].forEach(([dx, dy, hw, h], t) => {
        const cx = X + dx, yb = Y + dy;
        for (let j = 0; j <= h; j++) {
          const f = j / h, l = Math.round(cx - hw * f), r = Math.round(cx + hw * f);
          for (let x = l; x <= r; x++) {
            const stripe = ((x - cx + 20) >> 1) & 1;
            let c = TENT[t][stripe];
            if (x === r) c = blend2(c, 0.55); else if (x === l) c = blend2(c, 1.2);
            pix(x, yb - h + j, c);
          }
        }
        pix(cx, yb - h - 1, C('#ffd24a'));
        pix(cx, yb, C('#1a0e08')); pix(cx, yb - 1, C('#2a1810'));
      });
      // The sign pole.
      for (let j = 0; j < 9; j++) pix(X + 1, Y - 2 - j, C('#5a3a20'));
      const COIN = pal('#6a4210', '#b07a1c', '#e0a830', '#ffd460', '#fff0a0'), LANT = pal('#8a3a10', '#ff9a30', '#ffe080');
      const CAM = C('#8a5a30'), CAMD = C('#5a3a20');
      ANIM.push({ k: LW, fn(u, col) {
        // The coin sign turns: its width breathes, gold catching the light.
        const a = Math.cos(TAU * 6 * u), w = Math.max(0, Math.round(Math.abs(a) * 2.2));
        for (let dy = -2; dy <= 2; dy++) for (let dx = -w; dx <= w; dx++) {
          if (dx * dx / ((w + 0.4) * (w + 0.4)) + dy * dy / 6.2 > 1) continue;
          const c = dy === 0 && dx === 0 ? COIN[4] : dx < 0 === a > 0 ? COIN[3] : COIN[2];
          put(buf, X + 1 + dx, Y - 13 + dy, col(Math.abs(dy) === 2 || Math.abs(dx) === w && w > 0 ? COIN[1] : c));
        }
        // Lanterns flicker along a string between the tents.
        for (let l = 0; l < 5; l++) {
          const lx = X - 2 + l * 3, ly = Y - 5 + Math.round(Math.sin(l * 1.3) * 0.6);
          put(buf, lx, ly, col(LANT[Math.sin(TAU * (17 + l * 3) * u + l) > 0 ? 2 : 1]));
        }
        // A camel ambles to and fro in front of the stalls.
        const v = 0.5 - 0.5 * Math.cos(TAU * 2 * u), cx = X - 6 + v * 16, cy = Y + 5;
        const dir = Math.sin(TAU * 2 * u) >= 0 ? 1 : -1, step = Math.sin(TAU * 40 * u) > 0 ? 1 : 0;
        put(buf, cx, cy - 1, col(CAM)); put(buf, cx + dir, cy - 1, col(CAM)); put(buf, cx, cy - 2, col(CAM));
        put(buf, cx + dir * 2, cy - 2, col(CAM)); put(buf, cx + dir * 2, cy - 3, col(CAMD));
        put(buf, cx - dir + step * dir, cy, col(CAMD)); put(buf, cx + dir - step * dir, cy, col(CAMD));
      } });
    }

    // The Arena, the Australian outback: a round stone amphitheatre of arches on red
    // earth, torches round its rim and banners flying from four masts.
    {
      LW = K('arena');
      const [X, Y] = PLACES.arena;
      ground(X, Y + 2, 16, 5, pal('#8a3a1a', '#a84a22', '#c0602c', '#d8804a'));
      shadow(X + 3, Y + 3, 14, 3);
      const ST = pal('#3a2a22', '#7a6450', '#a88a6a', '#ccb08a', '#ece0c0');
      // The ring: an ellipse of wall, the far side higher, arches dark.
      for (let a = 0; a < 64; a++) {
        const t = a / 64 * TAU, ex = Math.cos(t) * 12, ey = Math.sin(t) * 4;
        const near = ey > 0, h = near ? 4 : 6;
        for (let j = 0; j < h; j++) {
          const x = X + ex, y = Y + ey - j;
          const arch = j >= 1 && j <= 2 && (a % 4 === 0);
          pix(x, y, arch ? ST[0] : j === h - 1 ? ST[4] : ex < -3 ? ST[3] : ex > 5 ? ST[1] : ST[2]);
        }
      }
      // The sand floor inside.
      for (let dy = -3; dy <= 3; dy++) for (let dx = -10; dx <= 10; dx++) {
        if (dx * dx / 100 + dy * dy / 9 > 0.72) continue;
        pix(X + dx, Y + dy - 2, (dx + dy + 20) % 5 === 0 ? C('#e8c890') : C('#d8b070'));
      }
      // A little chessboard on the arena floor.
      for (let dy = 0; dy < 2; dy++) for (let dx = -2; dx < 2; dx++) pix(X + dx, Y - 2 + dy, (dx + dy) & 1 ? C('#3a2a4a') : C('#f4f0e8'));
      const FL = pal('#c83a10', '#ff8a24', '#ffe080'), BAN = [pal('#8a1a1a', '#e04848'), pal('#1a3a8a', '#4a8ae0'), pal('#1a6a2a', '#4ac060'), pal('#8a6a1a', '#ffd24a')];
      const masts = [[-12, -6], [12, -6], [-6, -9], [6, -9]];
      for (const [mx, my] of masts) for (let j = 0; j < 5; j++) pix(X + mx, Y + my - j, C('#3a2418'));
      ANIM.push({ k: LW, fn(u, col) {
        masts.forEach(([mx, my], b) => {
          for (let i = 1; i <= 3; i++) {
            const w = Math.round(Math.sin(TAU * 20 * u - i * 0.9 + b) * (i / 3) * 0.8);
            put(buf, X + mx + i, Y + my - 4 + w, col(BAN[b][i === 3 ? 0 : 1]));
          }
        });
        for (let t = 0; t < 8; t++) {
          const a = t / 8 * TAU, tx = X + Math.cos(a) * 12, ty = Y + Math.sin(a) * 4 - (Math.sin(a) > 0 ? 4 : 6);
          const f = Math.sin(TAU * (23 + t) * u + t * 1.7);
          put(buf, tx, ty, col(FL[f > 0.4 ? 2 : 1])); if (f > -0.2) put(buf, tx, ty - 1, col(FL[0]));
        }
      } });
    }

    // Soulbound Pixel, mid-Pacific: the last intact piece of the Great Board, floating over
    // a whirlpool of shards, with Grandmaster X's crystal spire standing on it.
    const SOUL = PLACES.soulboundpixel;
    {
      LW = K('soulboundpixel');
      const [X, Y] = SOUL;
      const BD = [C('#e8dcff'), C('#6a4a9a')];
      // The board fragment: an oblique slab, checkered on top, dark sides.
      for (let j = 0; j < 6; j++) for (let i = -9 + (j >> 1); i <= 9 - ((5 - j) >> 1); i++) {
        const sqr = ((i + 20 >> 1) + (j >> 1)) & 1;
        pix(X + i, Y - 4 + j, BD[sqr]);
      }
      for (let i = -9; i <= 8; i++) { pix(X + i, Y + 2, C('#3a2458')); pix(X + i, Y + 3, C('#22143a')); }
      for (let i = -7; i <= 6; i++) pix(X + i, Y + 4, C('#160c26'));
      // The crystal spire.
      const CR = pal('#3a0a4a', '#8a1a8a', '#c83ab8', '#ff7ae0', '#ffd4f8');
      for (let j = 0; j < 16; j++) {
        const hw = j < 4 ? j * 0.5 : 2 - (j - 4) * 0.05;
        for (let dx = -Math.round(hw); dx <= Math.round(hw); dx++) pix(X + dx, Y - 20 + j, dx < 0 ? (dx === -Math.round(hw) ? CR[4] : CR[3]) : dx === 0 ? CR[2] : CR[1]);
      }
    }

    // ---------- regions: which world each piece of land belongs to ----------
    const SEEDS = IDS.map(id => PLACES[id]);
    const DEF = LiveScenes.get('worldmap');
    const REACH = DEF.reach;
    const REG = new Uint8Array(N).fill(255);
    const RDIST = new Float32Array(N);       // distance from the world's landmark, 0..1 of its reach
    const RMAX = new Float32Array(WILD + 1);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!LAND[i]) continue;
      const wx = x + (noise2(x / 16, y / 16, 71) - 0.5) * 22, wy = y + (noise2(x / 16, y / 16, 72) - 0.5) * 22;
      let best = 1e9, r = LMK[i] !== 255 ? LMK[i] : WILD;
      if (r === WILD && DEF.shopLand(wx * 0.3 + x * 0.7, y)) r = K('shop');
      if (r === WILD) SEEDS.forEach(([sx, sy], k) => {
        const reach = REACH[IDS[k]] !== undefined ? REACH[IDS[k]] : 78;
        const d = Math.hypot(wx - sx, wy - sy);
        if (d < reach && d < best) { best = d; r = k; }
      });
      REG[i] = r;
      RDIST[i] = r === WILD ? 0 : Math.hypot(x - SEEDS[r][0], y - SEEDS[r][1]);
      RMAX[r] = Math.max(RMAX[r], RDIST[i]);
    }
    for (let i = 0; i < N; i++) if (LAND[i]) RDIST[i] = REG[i] === WILD ? 0.5 : RDIST[i] / (RMAX[REG[i]] || 1);

    // Rifts: land touching land of another world. Two pixels wide, one on each side.
    const RIFT = [], RIFTA = [], RIFTB = [];
    const ISRIFT = new Uint8Array(N);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!LAND[i]) continue;
      for (const o of [1, W, -1, -W]) {
        const j = i + o;
        if (LAND[j] && REG[j] !== REG[i] && !NORIFT[REG[i]] && !NORIFT[REG[j]]) { RIFT.push(i); RIFTA.push(REG[i]); RIFTB.push(REG[j]); ISRIFT[i] = REG[i] > REG[j] ? 2 : 1; break; }
      }
    }
    const RIFTAT = new Int32Array(N);
    RIFT.forEach((i, k) => { RIFTAT[i] = k; });
    const seamCache = new Map();
    const seam = c => {
      let v = seamCache.get(c);
      if (v === undefined) { const [r, g, b] = [c & 255, c >> 8 & 255, c >> 16 & 255].map(q => q * 0.55 + 8 | 0); v = (0xff000000 | (b + 10 << 16) | (g << 8) | r) >>> 0; seamCache.set(c, v); }
      return v;
    };
    // Cracks inside each broken world, from its landmark outwards (they heal first).
    const CRACK = new Uint8Array(N);
    IDS.forEach((_, k) => {
      if (NEUT[k]) return;
      const [sx, sy] = SEEDS[k];
      for (let c = 0; c < 4; c++) {
        let a = hash(k, 80 + c) * TAU, x = sx + Math.cos(a) * 9, y = sy + Math.sin(a) * 9;
        const len = 16 + hash(k, 90 + c) * 22;
        for (let s = 0; s < len; s++) {
          a += (hash(k * 7 + c, s) - 0.5) * 0.9;
          x += Math.cos(a); y += Math.sin(a);
          const i = Math.round(y) * W + Math.round(x);
          if (i < 0 || i >= N || !LAND[i] || REG[i] !== k) break;
          if (LMK[i] !== 255) continue;
          CRACK[i] = 1;
        }
      }
    });

    // ---------- composite (rebuilt only when the state changes) ----------
    const COMP = new Uint32Array(N);
    const LANDIDX = [];
    for (let i = 0; i < N; i++) if (LAND[i]) LANDIDX.push(i);
    const HEAL = new Float32Array(WILD + 1);
    const RIFTDARK = C('#140a1e'), CRACKC = C('#241634'), FRONT = C('#ffe9a0'), FRONT2 = C('#ffc860');
    let compKey = '';
    let FUSE = 0;
    function composite(state) {
      const m = state && state.map;
      for (let k = 0; k < IDS.length; k++) HEAL[k] = m && m.heal ? clamp(m.heal[IDS[k]] !== undefined ? m.heal[IDS[k]] : 0) : 1;
      FUSE = m ? clamp(m.fuse || 0) : 0;
      HEAL[WILD] = FUSE;
      if (FUSE >= 1) HEAL.fill(1);
      const key = HEAL.join(',') + '|' + FUSE;
      if (key === compKey) return;
      compKey = key;
      for (const i of LANDIDX) {
        const r = REG[i], hv = HEAL[r], d = RDIST[i];
        const x = i % W, y = i / W | 0;
        let c;
        if (hv >= 1 || d < hv) c = LANDC[i];
        else if (hv > 0 && d < hv + 0.035) c = bay(x, y) > 0.5 ? FRONT : FRONT2;   // the wave's bright front
        else c = CRACK[i] ? CRACKC : fade(LANDC[i]);
        // A rift: an open chasm while either side is broken, a thin seam once both are whole.
        if (ISRIFT[i] && FUSE < 1 && bay(x, y) >= FUSE) {
          const other = RIFTB[RIFTAT[i]];
          if (hv < 1 || HEAL[other] < 1) c = RIFTDARK;
          else if (ISRIFT[i] === 2) c = seam(c);
        }
        COMP[i] = c;
      }
    }

    // ---------- the sea's motions ----------
    // Cracks across the sea, from the wound at Soulbound Pixel out towards every world.
    const SCRACK = [], SCRACKS = [], SCRACKK = [];         // pixel, distance from the wound, world
    const [SX, SY] = SOUL, WY = SY + 9;                    // the whirlpool sits under the floating board
    const seaCrack = (k, a, len, x, y, s0, seed) => {
      for (let s = 0; s < len; s++) {
        a += (hash(seed, s) - 0.5) * 0.55;
        x += Math.cos(a); y += Math.sin(a) * 0.8;
        const xi = Math.round(x), yi = Math.round(y);
        if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
        const i = yi * W + xi;
        if (LAND[i]) return;
        SCRACK.push(i); SCRACKS.push(s0 + s); SCRACKK.push(k);
        if (s > 16 && len > 60 && hash(seed + 7, s) > 0.985) seaCrack(k, a + (hash(seed, s + 99) > 0.5 ? 0.8 : -0.8), 18 + hash(seed, s) * 20, x, y, s0 + s, seed * 3 + s);
      }
    };
    IDS.forEach((id, k) => {
      if (NEUTRAL.has(id)) return;
      const [tx, ty] = PLACES[id];
      let dx = tx - SX, dy = ty - SY;
      // The map wraps: head the short way round.
      if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
      const a = Math.atan2(dy, dx);
      seaCrack(k, a, 400, SX + Math.cos(a) * 20, WY + Math.sin(a) * 9, 0, 300 + k);
    });
    for (let c = 0; c < 5; c++) {
      const a = TAU * (c / 5 + 0.1) + 0.3;
      seaCrack(WILD, a, 120, SX + Math.cos(a) * 20, WY + Math.sin(a) * 9, 0, 500 + c);
    }
    // The whirlpool: three spiral arms of broken light turning round the wound.
    const WHIRL = [], WA = [], WR = [];
    for (let y = WY - 12; y <= WY + 12; y++) for (let x = SX - 26; x <= SX + 26; x++) {
      const dx = x - SX, dy = (y - WY) * 2.1, r = Math.hypot(dx, dy);
      if (r > 26 || r < 3) continue;
      const i = y * W + x;
      if (LAND[i]) continue;
      WHIRL.push(i); WA.push(Math.atan2(dy, dx)); WR.push(r);
    }
    const WHC = ['#0a1030', '#16205a', '#2a2a8a', '#5a3aa8', '#a04ac8', '#ff8ae8'].map(C);
    const WHG = ['#14305e', '#24608e', '#3fa0b2', '#9ad8c0', '#ffe6a0', '#fff6d8'].map(C);
    // Glints on the open sea and foam along the coasts.
    const GLINT = [], FOAM = [];
    for (let i = 0; i < N; i++) {
      if (LAND[i]) continue;
      if (DIST[i] > 0 && DIST[i] < 1.5) FOAM.push(i);
      else if (DIST[i] > 6 && hash(i, 777) < 0.006) GLINT.push(i);
    }
    const GLK = GLINT.map((i, n) => 6 + (hash(n, 778) * 14 | 0)), GLP = GLINT.map((i, n) => hash(n, 779) * TAU);
    const FOAMP = FOAM.map(i => hash(i, 780) * TAU);
    const GLC = [C('#6ab8d8'), C('#c8f0ff')], FOAMC = C('#d8fff8');
    // Clouds seen from above: clumps of round puffs, lit on the upper left, kept to the
    // open bands between the landmarks, casting shadows below.
    const CLOUDS = [];
    const cloudBands = [[146, 176], [236, 300], [300, 314]];
    const CLC = ['#9ca8cc', '#c4cee6', '#e4eaf6', '#ffffff'].map(C);
    for (let c = 0; c < 11; c++) {
      const band = cloudBands[c % cloudBands.length], w = 16 + (hash(c, 801) * 18 | 0), h = 8 + (hash(c, 802) * 5 | 0);
      const px = new Uint32Array(w * h), puffs = [];
      const n = 3 + (hash(c, 805) * 3 | 0);
      for (let q = 0; q < n; q++) {
        const r = 2.5 + hash(c * 9 + q, 806) * (h / 2 - 2.5);
        puffs.push([r + 0.5 + hash(c * 9 + q, 807) * (w - 2 * r - 1), r + 0.5 + hash(c * 9 + q, 808) * (h - 2 * r - 1), r]);
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let best = -1e9;
        for (const [cx, cy, r] of puffs) {
          const d = Math.hypot(x - cx, y - cy);
          if (d > r) continue;
          const l = (-(x - cx) - (y - cy)) / r * 0.6 + (1 - d / r) * 0.7;
          best = Math.max(best, l);
        }
        if (best > -1e9) px[y * w + x] = ramp(CLC, 0.35 + best * 0.6, x, y);
      }
      CLOUDS.push({ spr: { w, h, px }, x0: hash(c, 803) * W, y: band[0] + hash(c, 804) * (band[1] - band[0] - h), k: 1 + (c % 3 === 0 ? 1 : 0) });
    }
    const CSH = C('#0a0c1c');
    // Ships sailing loops across the open sea, whales surfacing.
    const SHIPS = [
      { cx: 380, cy: 130, rx: 60, ry: 14, k: 2, p: 0 }, { cx: 150, cy: 180, rx: 34, ry: 12, k: 3, p: 0.4 },
      { cx: 440, cy: 270, rx: 70, ry: 12, k: 2, p: 0.7 }, { cx: 30, cy: 230, rx: 20, ry: 30, k: 3, p: 0.2 },
      { cx: 250, cy: 290, rx: 60, ry: 10, k: 2, p: 0.5 }, { cx: 610, cy: 150, rx: 16, ry: 30, k: 3, p: 0.9 },
    ];
    const HULL = C('#5a3a24'), SAILC = C('#fff6e4'), SAILS = C('#c8bca8'), WAKE = C('#9ad8e8');
    const WHALES = [[340, 70], [520, 250], [120, 260], [600, 60]];
    const WHALEC = C('#1e2a44'), SPOUT = C('#e8f8ff');
    // The aurora over the Arctic.
    const AUR = ['#1a6a5a', '#2ac890', '#8affc8', '#c88aff'].map(C);

    // ---------- draw ----------
    const RIFTGLOW = ['#3a1248', '#6a1c6e', '#a02c92', '#e04cc0', '#ff9ae8'].map(C);
    const SCR = ['#3a1a5a', '#8a2a9a', '#ff7ae0'].map(C), SCRG = ['#6a5a3a', '#c8a050', '#ffe6a0'].map(C);
    const WINC = [C('#c87a30'), C('#ffc860'), C('#ffe8a8')];
    const SMOKE = C('#d8d0cc');
    function frame(t, state) {
      const u = t / LOOP;
      composite(state);
      buf.set(SEAB);
      // Glints and foam.
      for (let n = 0; n < GLINT.length; n++) {
        const v = Math.sin(TAU * GLK[n] * u + GLP[n]);
        if (v > 0.96) buf[GLINT[n]] = GLC[v > 0.99 ? 1 : 0];
      }
      for (let n = 0; n < FOAM.length; n++) if (Math.sin(TAU * 9 * u + FOAMP[n]) > 0.55) blend(buf, FOAM[n], FOAMC, 0.35);
      // The whirlpool: broken light while the board is shattered, a calm gold ring once whole.
      for (let n = 0; n < WHIRL.length; n++) {
        const r = WR[n], v = Math.sin(3 * WA[n] + r * 0.42 - TAU * 10 * u) * 0.5 + 0.5;
        const i = WHIRL[n], x = i % W, y = i / W | 0;
        const edge = clamp((26 - r) / 10);
        if (FUSE < 1 && bay(x, y) >= FUSE) {
          const lv = v * edge * (1.1 - r / 30) * 1.25 + (r < 7 ? 0.35 : 0);
          if (lv > 0.1) buf[i] = ramp(WHC, lv, x, y);
        } else {
          const ring = Math.abs(r - 14 - Math.sin(TAU * 4 * u) * 1.5) < 1.2 ? 0.9 : 0.25 * v * edge;
          if (ring > 0.2) buf[i] = ramp(WHG, ring, x, y);
        }
      }
      // Sea cracks: glowing while their world is broken, dark once it is restored, a faint
      // gold line when the board is whole again.
      for (let n = 0; n < SCRACK.length; n++) {
        const i = SCRACK[n], x = i % W, y = i / W | 0, k = SCRACKK[n];
        if (FUSE >= 1 || bay(x, y) < FUSE) { if (SCRACKS[n] % 3 === 0) blend(buf, i, SCRG[1], 0.3); continue; }
        if (HEAL[k] >= 1) { blend(buf, i, SCR[0], 0.5); continue; }
        const p = Math.sin(TAU * 8 * u - SCRACKS[n] * 0.12);
        buf[i] = p > 0.75 ? SCR[2] : SCR[1];
      }
      // The floating board's shadow on the water.
      for (let dy = -2; dy <= 2; dy++) for (let dx = -10; dx <= 10; dx++) if (sq(dx / 10) + sq(dy / 2.4) < 1) blend(buf, (WY + 3 + dy) * W + SX + dx + 2, CSH, 0.3);
      // Whales.
      WHALES.forEach(([wx, wy], n) => {
        const v = frac(3 * u + n * 0.27);
        if (v < 0.18) {
          const up = Math.sin(Math.PI * v / 0.18);
          for (let dx = -2; dx <= 2; dx++) if (up > 0.3) put(buf, wx + dx, wy, WHALEC);
          for (let j = 1; j <= Math.round(up * 4); j++) blendAt(buf, wx - 1 + (j > 2 ? (j & 1 ? -1 : 1) : 0), wy - j, SPOUT, 0.8);
        } else if (v > 0.2 && v < 0.26) { put(buf, wx + 3, wy - 1, WHALEC); put(buf, wx + 4, wy - 2, WHALEC); put(buf, wx + 2, wy - 2, WHALEC); }
      });
      // Ships and their wakes.
      for (const sh of SHIPS) {
        const a = TAU * (sh.k * u + sh.p), x = sh.cx + Math.cos(a) * sh.rx, y = sh.cy + Math.sin(a) * sh.ry;
        const dir = -Math.sin(a) >= 0 ? 1 : -1, xi = Math.round(x), yi = Math.round(y);
        if (LAND[yi * W + xi]) continue;
        for (let w = 1; w <= 4; w++) blendAt(buf, xi - dir * (w + 1), yi + (w & 1), WAKE, 0.5 - w * 0.1);
        put(buf, xi - 1, yi, HULL); put(buf, xi, yi, HULL); put(buf, xi + 1, yi, HULL); put(buf, xi + dir * 2, yi - 1, HULL);
        put(buf, xi, yi - 1, SAILC); put(buf, xi, yi - 2, SAILC); put(buf, xi - dir, yi - 1, SAILS);
      }
      over(buf, COMP);
      // Rifts between worlds that are still broken glow, pulses running along them.
      if (FUSE < 1) {
        for (let k = 0; k < RIFT.length; k++) {
          const a = RIFTA[k], b = RIFTB[k];
          if (HEAL[a] >= 1 && HEAL[b] >= 1) continue;
          const i = RIFT[k], x = i % W, y = i / W | 0;
          if (bay(x, y) < FUSE) continue;
          const p = 0.5 + 0.35 * Math.sin(TAU * 6 * u - (x + y) * 0.21) + 0.15 * Math.sin(TAU * 17 * u + x * 0.5);
          buf[i] = ramp(RIFTGLOW, p, x, y);
        }
      }
      // The worlds' own motions: alive in colour once restored, frozen grey before.
      for (const a of ANIM) {
        const alive = HEAL[a.k] >= 1;
        a.fn(alive ? u : 0, alive ? same : fade);
      }
      for (const w of windows) {
        if (HEAL[w.k] < 1) continue;
        const f = Math.sin(TAU * 13 * u + w.x * 0.7) + Math.sin(TAU * 29 * u + w.y);
        buf[w.y * W + w.x] = WINC[f > 0.9 ? 2 : f > -0.8 ? 1 : 0];
      }
      for (const sm of smokes) {
        if (HEAL[sm.k] < 1) continue;
        for (let s = 0; s < sm.n; s++) {
          const v = frac(5 * u + s / sm.n), r = 0.6 + v * 1.8;
          const x = sm.x + v * 7 + Math.sin(TAU * (7 * u + s * 0.4)) * 0.8, y = sm.y - v * 9;
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) blendAt(buf, x + dx, y + dy, SMOKE, 0.4 * (1 - v));
        }
      }
      soul(u);
      const m = state && state.map;
      if (m && m.veil > 0) storm(u, m.veil);
      if (m && m.chart && m.chart.v < 1) chartFog(m.chart);
      // Clouds and their shadows drift east; the map wraps round, so do they.
      for (const cl of CLOUDS) {
        const x0 = ((cl.x0 + cl.k * u * W) % W), { spr } = cl, y0 = Math.round(cl.y);
        for (const ox of [x0, x0 - W]) {
          const X0 = Math.round(ox);
          if (X0 > W || X0 + spr.w < 0) continue;
          for (let y = 0; y < spr.h; y++) for (let x = 0; x < spr.w; x++) {
            if (!spr.px[y * spr.w + x]) continue;
            const sx = X0 + x + 4, sy = y0 + y + 5;
            if (sx >= 0 && sx < W && sy < H) blend(buf, sy * W + sx, CSH, 0.22);
          }
          for (let y = 0; y < spr.h; y++) for (let x = 0; x < spr.w; x++) {
            const v = spr.px[y * spr.w + x], xx = X0 + x;
            if (v && xx >= 0 && xx < W) buf[(y0 + y) * W + xx] = v;
          }
        }
      }
      // Aurora curtains over the Arctic: soft rays in three clean bands of light.
      for (let x = 0; x < W; x++) {
        const I = PixelKit.noiseLoop(x / 16 + 80 * u, 901, 40) * 0.7 + PixelKit.noiseLoop(x / 7 - 91 * u, 902, 91) * 0.45 - 0.42;
        if (I <= 0) continue;
        const top = 1 + Math.round(3 * PixelKit.noiseLoop(x / 11 + 58 * u, 903, 58));
        const len = 6 + Math.round(I * 18);
        for (let y = top; y < top + len; y++) {
          const f = (y - top) / len;
          const a = Math.round(I * (1 - f) * 3) / 3 * 0.55;
          if (a > 0) blend(buf, y * W + x, f < 0.2 ? AUR[3] : f < 0.55 ? AUR[2] : AUR[1], a);
        }
      }
    }

    // ---------- the uncharted Earth (before the Tilted Compass) ----------
    // Outside the known places the map is an old sepia chart: each pixel keeps its
    // brightness, so coasts and landmarks show, but loses its colour. An ink line and a
    // burnt band mark the chart's edge. The compass's wave clears it outward, a gold
    // front running ahead of the colour.
    const SEPIA = ['#24160e', '#46301e', '#6e4e30', '#9a7648', '#c4a270', '#e2c998'].map(C);
    const INK = C('#1a0e08'), BURN = C('#5a3a1e'), CHARTF = [C('#fff2b0'), C('#ffcc58')];
    const PAPER = new Float32Array(N);
    for (let i = 0; i < N; i++) PAPER[i] = (noise2((i % W) / 9, (i / W | 0) / 9, 611) - 0.5) * 0.13 + (hash(i, 612) - 0.5) * 0.04;
    const FOGD = new Float32Array(N);
    // Most of the map is still from frame to frame: each fogged pixel remembers the colour
    // it last turned sepia (LASTIN) and the result (LASTOUT).
    const LASTIN = new Uint32Array(N), LASTOUT = new Uint32Array(N);
    let fogKey = null, FOGIDX = null;
    function chartFog(chart) {
      const known = chart.known || [];
      const key = JSON.stringify(known);
      if (key !== fogKey) {
        fogKey = key;
        FOGD.set(LiveScenes.get('worldmap').knownField(known));
        const idx = [];
        for (let i = 0; i < N; i++) if (FOGD[i] >= 0) idx.push(i);
        FOGIDX = Int32Array.from(idx);
        LASTIN.fill(0);
      }
      const v = clamp(chart.v || 0), R = v * 480, fx = chart.from ? chart.from[0] : 0, fy = chart.from ? chart.from[1] : 0;
      for (let n = 0; n < FOGIDX.length; n++) {
        const i = FOGIDX[n], d0 = FOGD[i];
        if (v > 0) {
          const x = i % W, y = i / W | 0;
          let dx = Math.abs(x - fx);
          if (dx > W / 2) dx = W - dx;
          const r = Math.hypot(dx, y - fy);
          if (r < R - 5) continue;
          if (r < R) { buf[i] = bay(x, y) > 0.5 ? CHARTF[0] : CHARTF[1]; continue; }
        }
        if (d0 < 1.2) { buf[i] = INK; continue; }
        if (d0 < 2.6) { buf[i] = BURN; continue; }
        const c = buf[i];
        if (c === LASTIN[i]) { buf[i] = LASTOUT[i]; continue; }
        const l = ((c & 255) * 0.3 + (c >> 8 & 255) * 0.59 + (c >> 16 & 255) * 0.11) / 255;
        const out = SEPIA[Math.round(clamp(0.16 + l * 1.15 + PAPER[i] - Math.min(0.16, d0 / 500)) * (SEPIA.length - 1))];
        LASTIN[i] = c; LASTOUT[i] = out; buf[i] = out;
      }
    }

    // ---------- the storm over Soulbound Pixel (before the Map of the Crossing) ----------
    // A wall of dark cloud turns round the crystal, its spiral arms lit on top; now and
    // then lightning forks through it and the clouds flash. As the veil lifts (1 -> 0)
    // the storm shrinks into the eye and is gone.
    const STC = ['#0a0816', '#16122a', '#26203e', '#3c3458', '#5e5480', '#9088b8'].map(C), BOLT = [C('#ffffff'), C('#b8d0ff')];
    const STORM = [];
    for (let y = SOUL[1] - 46; y <= SOUL[1] + 38; y++) for (let x = SOUL[0] - 64; x <= SOUL[0] + 64; x++) {
      const dx = (x - SOUL[0]) / 64, dy = (y - SOUL[1] + 4) / 42, r = Math.hypot(dx, dy);
      if (r <= 1 && y >= 0 && y < H) STORM.push(y * W + x, Math.atan2(dy, dx), r);
    }
    const TEX = new Float32Array(STORM.length / 3), ARM = new Float32Array(STORM.length / 3), RB = new Uint8Array(STORM.length / 3);
    for (let n = 0; n < STORM.length; n += 3) {
      const i = STORM[n], a = STORM[n + 1];
      TEX[n / 3] = noise2((i % W) / 5, (i / W | 0) / 5, 615);
      ARM[n / 3] = (a / TAU) * 18 + STORM[n + 2] * 7;
      RB[n / 3] = Math.floor(((a / TAU) + 0.5) * 96) % 96;
    }
    const RIM = new Float32Array(96);
    function storm(u, veil) {
      let flash = 0;
      for (let b = 0; b < 3; b++) if (frac(7 * u + b * 0.37) < 0.01) flash = 1;
      const size = 0.35 + 0.65 * veil;
      for (let k = 0; k < 96; k++) RIM[k] = 0.8 + 0.2 * PixelKit.noiseLoop((k / 96 - 0.5) * 12 - 12 * u, 616, 12);
      for (let n = 0; n < STORM.length; n += 3) {
        const i = STORM[n], a = STORM[n + 1], r = STORM[n + 2] / size;
        if (r > 1) continue;
        const rim = RIM[RB[n / 3]];
        if (r > rim) continue;
        const x = i % W, y = i / W | 0;
        const arm = PixelKit.noiseLoop(ARM[n / 3] - 18 * u, 614, 18);
        let v = arm * 0.62 + TEX[n / 3] * 0.3 + (rim - r) * 0.25 + flash * 0.25;
        // The eye: the crystal's magenta light glows through.
        if (r < 0.07) { buf[i] = STC[0]; continue; }
        if (r < 0.1) { buf[i] = Math.sin(TAU * 8 * u + a * 3) > -0.2 ? RIFTGLOW[3] : RIFTGLOW[1]; continue; }
        buf[i] = ramp(STC, clamp(v), x, y);
      }
      // Lightning: a forked bolt a few times a loop.
      for (let b = 0; b < 3; b++) {
        if (frac(7 * u + b * 0.37) >= 0.01) continue;
        let x = SOUL[0] - 30 + b * 27, y = SOUL[1] - 30;
        const k = Math.floor(7 * u + b * 0.37);
        for (let s = 0; s < 20 * size; s++) {
          x += (hash(b * 31 + k, s) - 0.5) * 3; y += 1.5;
          put(buf, x, y, BOLT[0]); put(buf, x + 1, y, BOLT[1]);
          if (s === 8) for (let f = 1; f < 7; f++) put(buf, x + f, y + f * 0.8, BOLT[1]);
        }
      }
    }

    // Soulbound Pixel: shards orbit the crystal, its core pulses.
    const SH = ['#6ae8ff', '#ff7ae0', '#ffd4f8', '#8a5aff'].map(C);
    function soul(u) {
      const [X, Y] = SOUL, alive = HEAL[K('soulboundpixel')] >= 1 || FUSE < 1;
      const pulse = Math.sin(TAU * 8 * u);
      for (let j = 2; j < 14; j += 3) if (pulse > 0.2) put(buf, X, Y - 18 + j + Math.round(frac(4 * u) * 3), SH[2]);
      for (let s = 0; s < 6; s++) {
        const a = TAU * (5 * u + s / 6), x = X + Math.cos(a) * 12, y = Y - 11 + Math.sin(a) * 4 - (s & 1) * 3;
        if (Math.sin(a) < 0 && Math.abs(x - X) < 3) continue;           // behind the spire
        const c = SH[s % 4];
        put(buf, x, y, c); put(buf, x, y - 1, c); if (s & 1) put(buf, x + 1, y, c);
      }
      if (alive && Math.sin(TAU * 11 * u) + Math.sin(TAU * 29 * u) > 1.7) {
        let x = X + 2, y = Y - 12;
        for (let n = 0; n < 7; n++) { x += 1.3; y += (hash(n, Math.floor(u * 400)) - 0.5) * 2.5; put(buf, x, y, SH[0]); }
      }
    }

    return (t, out, state) => { buf = out; frame(t, state); };
  },
});
