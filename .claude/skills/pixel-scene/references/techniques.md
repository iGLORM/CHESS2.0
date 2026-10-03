# Techniques for live pixel scenes

Recipes that worked in `src/themes/scenes/pawnhollow.js`, with the reasoning, so they can
be adapted to other worlds rather than copied blindly. Each snippet assumes the names a
scene gets from PixelKit (`C, mix, ramp, bay, hash, noise1, fbm1, clamp, sq, frac, TAU,
blend, put, blendAt, over`) and `W = 320, H = 200, LOOP`, `u = t / LOOP`.

## Contents
1. Loop maths
2. Layers and masks
3. Sky, sun, moon, stars
4. Clouds
5. Ridges, mountains and haze
6. Fields and ground
7. Light: rim light, shade, rays, vignette
8. Trees and foliage
9. Grass
10. Water
11. Buildings, windows, chimneys
12. Smoke, sparks, fireflies, pollen, rain, snow, leaves
13. Turning and flying things
14. Starter palettes by mood
15. Performance

## 1. Loop maths

The loop is `LOOP` seconds (120 in Pawn Hollow). With `u = t / LOOP` running 0 to 1:

- Oscillation: `Math.sin(TAU * k * u + phase)`, integer `k` = cycles per loop. Period is
  `LOOP / k` seconds: k = 30 gives a 4 s sway, k = 240 a half-second wing beat.
- Travel across the screen: `frac(x0 / span + k * u) * span - margin`, integer `k`. With a
  120 s loop, a 480 px span moves 4 px/s at k = 1, a calm cloud speed; k = 2 for nearer clouds.
- Particles with a life: `v = frac(k * u + i / N)` is the particle's age (0 to 1); position
  and fade are functions of `v`. N particles evenly offset give a steady stream.
- Rotation with symmetry: four sails repeat every quarter turn, so
  `angle = (TAU / 4) * k * u` loops for any integer `k`.
- Blink or flicker: sum two or three sines with different integer `k` for an irregular
  but looping rhythm.

Test with `node scripts/live-scene.js check <id>`: a few pixels of difference across the seam
are float rounding; hundreds mean a non-integer `k` somewhere.

## 2. Layers and masks

Build static pixels once in `create()`:

```js
const SKYB = new Uint32Array(W * H);  // full, opaque
const BACK = new Uint32Array(W * H);  // land and buildings, 0 = transparent
const MASK = new Uint8Array(W * H);   // 1 = wheat, 2 = water...
const MASKC = new Uint32Array(W * H); // colour when masked
```

Per frame: `buf.set(SKYB)`, draw what moves behind the land (stars, clouds, birds),
`over(buf, BACK)`, then what moves on or in front of it, then light effects last.

Masks let an effect animate static pixels (wind in wheat, glints on water). Set them while
painting, remember the colour, and after all static painting drop any pixel whose colour
changed, because a nearer layer (meadow, bridge, tree) now covers it:

```js
for (let i = 0; i < W * H; i++) {
  if (MASK[i] && BACK[i] !== MASKC[i]) MASK[i] = 0;
  if (MASK[i] === 1) WHEAT_IDX.push(i); else if (MASK[i] === 2) WATER_IDX.push(i);
}
```

Keeping index lists means the per-frame effect only visits those pixels.

## 3. Sky, sun, moon, stars

A sky is a vertical ramp pushed warmer near the light source, which makes the glow
without any blending:

```js
const SKY = ['#161838', '#221f4c', '#352f64', '#523a78', '#7c4684', '#a85584',
  '#d06a7c', '#ea8a6c', '#f6ae66', '#ffd28a', '#ffecb8'].map(C);
const d = Math.hypot(x - SX, (y - SY) * 1.25);          // squash: a wide horizon glow
const t = y / 118 + 0.28 * Math.exp(-sq(d / 75)) + 0.22 * Math.exp(-sq(d / 24));
SKYB[y * W + x] = ramp(SKY, t, x, y);
```

Sun: a disc in two tones plus a 1 px rim, set low and partly behind a ridge. A silhouette
in front of it (the chapel's pawn finial) makes an instant focal point. Moon: a disc minus
an offset disc gives a crescent; add a faint dithered halo. Stars: a few dozen in the top
fifth, each `sin(TAU * k * u + p) > 0.2` to twinkle, a few with a dim 4-way cross.

## 4. Clouds

Build each cloud once as a small sprite: round puffs (circles, slightly squashed) sitting
on a flat base, biggest in the middle, with every centre at least one radius inside the
sprite so the ends stay round. Shade by depth above the base: lit rim on the bottom row
(the light is low), warm underside, cool violet tops, a 1 px lighter top edge. Draw far
clouds (thin, k = 1) before near ones (fat, k = 2).

## 5. Ridges, mountains and haze

A ridge is a height function per column, filled downward:

```js
const topFar = x => 100 + 16 * fbm1(x / 38, 11) + 10 * Math.exp(-sq((x - SX) / 40)); // dip where the sun sets
```

Distance is sold by haze: far layers are mixed toward the sky's horizon colour
(`mix(hex, HAZE, 0.45)` when building their palette), have less contrast, and a 1 px rim
that is warm near the light and cool elsewhere. Pick between a cool and a warm palette per
pixel with `w * 0.9 > bay(x, y)`, where `w` falls off with distance from the light.

## 6. Fields and ground

Rolling hills are several height functions drawn back to front, each hazed less than the
one behind. Patchwork fields: split each hill into columns along a slanted coordinate
`u = x + (x - 160) * dy * sl` (they fan out in perspective) and rows by depth `dy`; hash the
cell to pick a crop palette; 1 px hedges on the seams; top two rows are rim light. Texture
per crop: furrows (alternate rows darker) for ploughed soil, occasional light specks for
wheat. Bigger cells and fewer hedges nearer the viewer keep it calm.

Wind over wheat (animated, from the mask):
`w = sin(TAU * 30 * u - x * 0.09 + y * 0.35)`; where `w > 0.55`, dither in a lighter wheat.
The `- x` term makes the wave travel with the wind.

## 7. Light

- **Rim light** is what makes things glow against a low sun: the edge of a shape that faces
  the light gets a bright warm pixel; the rest stays in cool shade. For a round shape use
  the normal: `l = (dx / r) * LX + (dy / r) * LY`; rim where `dist / r > 0.72 && l > 0.45`.
- **Shade** the foreground. The nearest ground should be the darkest, coolest area, lit only
  in patches (`noise1(x / 12, seed) > 0.45` along the crest). That contrast is what reads as
  golden hour.
- **Rays**: precompute each pixel's angle bin and falloff from the light once; per frame
  build a 720-bin table of a few wide wedges breathing with integer `k`, and dither a 12%
  warm blend where `table[bin] * falloff > bay`. Keep them in the air above the land;
  across the ground they read as scratches.
- **Vignette**: precompute the list of pixels where a radial value beats `bay`, and blend
  them 35% toward a deep cool colour each frame.

## 8. Trees and foliage

Distant trees: a 1.5 to 3 px disc on a 1 px trunk, lit on the light side. A hero tree: 6 to
10 overlapping circles ("blobs"). For each pixel take the blob it is deepest inside, shade
with that blob's normal against the light direction, add clumpy leaf texture
`hash((x - ox) >> 1, (y - oy) >> 1)` that moves with the blob, and skip some edge pixels for
a ragged outline. Sway each blob by a pixel or so with its own phase. Fruit, blossoms or
lanterns ride on a blob so they sway with it.

## 9. Grass

Precompute blades along the foreground (3 to 4 per column, taller nearer the bottom, none on
water), sorted by base y. Per frame, lean each tip by a travelling gust
`g = 0.5 + 0.5 * sin(TAU * 24 * u - x * 0.05)` plus a small flutter, bending with `s * s`
(the base stays put). Colours: dark base, mid stem, tip; warm tips only where the light
patch falls, or the whole field sparkles.

## 10. Water

Water is a mirror: take its colour from the sky it would reflect, but cooler and darker.
The far end (near the horizon) can be warm; the near end deep blue-violet. Banks: a dark
edge on one side, mud on the other. Per frame on the water mask: rare bright glints
(`sin(TAU * 40 * u + hash(x >> 1, y) * TAU) > 0.985`), a second tone a bit more often, and
faint ripple bands. Too many glints read as glitter on a road.

## 11. Buildings, windows, chimneys

A cottage is a front wall in cool shaded plaster, a side wall lit warm on the side facing
the light, a hipped roof in lit and shaded thatch with streaks, a 1 px shadow under the
eave, a dark door. Register windows `{x, y, w, h}` and chimney tops while building. Per
frame, windows flicker between three warm tones from two summed sines, with a faint glow
under the sill; that warmth against cool walls is a cheap, strong warm/cold accent.

## 12. Smoke, sparks, fireflies, pollen, rain, snow, leaves

All are particle loops `v = frac(k * u + i / N)`:

- **Smoke**: rises and drifts with the wind, radius grows with `v`, drawn as soft
  `blendAt` discs at alpha `(1 - v) * 0.3`, turning from warm near the chimney to cool.
  Dithered sparse smoke looks like scratches.
- **Sparks / embers**: bright 1 px, quick rise with jitter, fade through orange to red.
- **Fireflies**: wander around an anchor with two or three sines, blink with
  `sin(TAU * k * u + p) > 0.2`, 1 px core with a 4-neighbour glow at 55% and diagonals at 20%.
  They belong in shade, where they read best.
- **Pollen / dust motes**: slow drift with the wind, bob, twinkle; 1 px in the light.
- **Rain**: short diagonal streaks, fast (k large), two depths; splash pixels on surfaces.
- **Snow**: slow fall with sideways sine drift, bigger flakes nearer.
- **Leaves**: fall from the canopy with a sideways swing, flipping between two colours.

## 13. Turning and flying things

Windmill sails, gears, water wheels: plot along the arm with half-pixel steps
(`r += 0.5`, `s += 0.5`) so rotated shapes have no holes; frame lines where `r % 4 < 0.5`.
Birds: 5-pixel V shapes in two wing frames, a small formation crossing a few times per
loop, flapping with k in the hundreds.

## 14. Starter palettes by mood

Starting points only; tune by eye against the world's theme colours.

- **Golden hour** (Pawn Hollow): sky indigo to rose to amber to pale gold; land warm greens
  and wheat golds; shade `#3a6452 #2c4c48 #213a40 #182a36`; light `#ffe6a4`.
- **Desert noon** (Slanted Sands): sky `#2a6fb0 #5aa0d8 #a8d4ee #f0e6c8`; sand
  `#f6d890 #e0b060 #b88040 #7a5030`; cool accents in turquoise shadows `#3a7a8a`.
- **Moonlit fog** (Misty Moors): `#0e1424 #1c2a40 #34506a #6a8aa0 #b8c8d0`; warm lantern
  `#ffb050`; fog as drifting dithered bands, not blur.
- **Torchlit stone** (Iron Keep): stone `#2a2630 #4a4450 #7a7080`; torch `#ff8a30 #ffd070`;
  sky `#10121e`.
- **Brass and steam** (Clockwork Citadel): brass `#f0c060 #c08a38 #7a5024`; copper `#c86a40`;
  steam `#e8e0d8`; soot `#2a2228`.
- **Candlelit library** (Grand Library): wood `#3a2418 #6a4028 #9a6038`; candle `#ffe0a0`;
  dust motes in shafts of light.
- **Obsidian and lava** (Obsidian Court): `#0a080e #1e1824 #3a2e40`; lava `#ff5a10 #ff9a30 #ffe080`.

## 15. Performance

Target under 2 ms a frame in the browser (the Node check is about 5x slower; it fails
above 16 ms there). Precompute anything per pixel that does not change (angles, distances,
vignette lists, masks). Avoid `Math.hypot`/`sqrt` over the whole screen per frame; keep
those to small bounding boxes (the hero tree) or lookups. Use typed arrays, integer pixel
positions, and no allocations inside `draw`.
