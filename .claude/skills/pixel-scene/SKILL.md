---
name: pixel-scene
description: Make animated pixel art for Chess 2.0 that is drawn entirely in code and runs live in the game - world backgrounds (like the Pawn Hollow golden-hour scene) and story characters with moods (like Pawnie). Use this whenever the user asks for a new or better world background, a character, a character portrait or expression, a cutscene backdrop, theme art, map art, an animated illustration, "pixel art", "make it like the Pawn Hollow one" or "like Pawnie", "redo world N" or "redo <character>", or wants any picture in the game to look alive and beautiful, even if they don't say "live scene" or "skill". Also use it to fix, polish or re-light an existing file in src/themes/scenes/.
---

# Pixel scenes for Chess 2.0

A live scene is a picture the game paints itself, every frame, into a tiny buffer that is
scaled up with sharp pixels. Nothing is an image file: the sky, hills, houses, smoke and
fireflies are all code. That is what lets it move everywhere (sails turn, wheat rolls in
the wind, windows flicker) while staying crisp, small and cheap.

References set the house style; read the one closest to what you are making before starting:
- `src/themes/scenes/pawnhollow.js`: World 1 at golden hour, the quality bar for backgrounds.
- The other ten worlds, each a different recipe: `trainingcamp` (interior with an open view,
  holograms), `slantedsands` (tilted desert, dune shading, heat shimmer), `ironkeep` (night,
  riveted metal, forge and sparks, cobbles), `mistymoors` (fog banks, will-o'-wisps),
  `royalpalace` (true one-point perspective hall, light beams), `clockworkcitadel` (gears, steam,
  pistons), `grandlibrary` (perspective shelves, moonbeam, candles), `forkedgulch` (night sky,
  campfire, tumbleweed), `obsidiancourt` (flowing lava, hourglass), `crystal` (space, floating
  board fragments, orbiting shards).
- `src/themes/scenes/char_pawnie.js`: Pawnie, a story character with moods. **For any
  character, follow `references/characters.md`**; the rest of this file still applies
  (brief, loop rules, checking, wiring), but characters are built and shaded differently.

## How the game runs a scene

- `src/themes/scenes/<id>.js` calls `LiveScenes.register({ id, width, height, loop, still, create })`.
  `create()` builds the static layers once and returns `draw(t, buf)`, which paints time
  `t` (seconds, `0 <= t < loop`) into `buf`, a `Uint32Array` of ABGR pixels.
- `src/themes/scenes/PixelKit.js` holds the shared tools: `C('#hex')` colours, `mix`,
  `ramp` (dithered gradients), `bay`, `hash`, `noise1`, `noise2` (smooth 2D), `noiseLoop`
  (noise that repeats, for anything that scrolls), `fbm1`, `blend`, and `surface(W, H)` for
  `put`, `blendAt`, `over`, `rect`, `line`, `disc`, `glow`, `cloud` + `blit`, `flame`, `gear`
  and `vignette`. Use them before writing your own.
- `src/themes/LiveScenes.js` runs one shared canvas per scene at 30 fps. `PixiBackgroundScene.build`
  uses it automatically when a theme id has a live scene, so the in-game background, the
  story cutscenes and the theme picker all show it with no further code. Use
  `LiveScenes.addTo(id, container, w, h)` to put a scene anywhere else (a panel, a card).
- A scene whose id is a theme id (`pawnhollow`, `ironkeep`, `crystal`...) becomes that
  world's background. A scene with id `char_<characterId>` becomes that story character's
  portrait (cutscene card, HUD face, dialogue bubble) and acts out moods. Other ids are
  free for other art.

## Workflow

### 1. Write the brief first

The scene that inspired this skill came from a prompt that set a mood, a light and a use,
and left the model to invent the picture. Do the same before any code. Read the world's
entries in `src/characters/worlds.js`, `src/characters/story.js` (its cutscene lines),
`src/characters/characters.js` (its guardian) and `src/themes/themes.js` (its colours),
then write, in the conversation:

- **Mood and moment**: time of day, weather, season, what the place feels like.
- **Light**: where the main light is, what colour, and the cold light it fights. Strong
  warm/cold contrast is the single biggest reason these scenes look good: warm sun against
  a dusk sky and blue-green shade; torchlight against moonlit stone; lava against ash.
- **Signature details**: 5 to 10 things only this world has, tied to its story. In Pawn
  Hollow: the windmill from the prologue's first line, the chapel whose pawn finial stands
  inside the sun, a pawn-shaped scarecrow.
- **What moves**: 8 to 15 motions, from large and slow (clouds, light) to small and quick
  (glints, sparks, blinking fireflies). Each should be something that place would really do.
- **Layout**: a rough map in scene pixels. In a game the board covers the middle of the
  screen, so put landmarks in the left and right thirds and along the horizon, and let the
  centre hold light and atmosphere rather than detail. Home and story screens show all of it.

Show the brief to the user in a few lines and carry on unless they object.

### 2. Build it

Copy `assets/scene-template.js` (in this skill's folder) to `src/themes/scenes/<id>.js`,
or `assets/character-template.js` to `src/themes/scenes/char_<id>.js` for a character.
Keep 320x200: exactly 4x smaller than the game's 1280x800, so every scene pixel is a clean
4x4 block. Build in depth order, back to front: sky, far shapes, middle ground, landmarks,
near ground, then everything animated on top.

Read `references/techniques.md` for the recipes (sky with a sun glow, clouds, ridges with
haze, patchwork fields, rim light, trees, grass, water, smoke, windows, particles, rays,
vignette, spinning and flying things) and the loop maths.

The rules that matter most, and why:

- **No crosses on kings or bishops.** The owner does not want a cross (finial or "+")
  on any king or bishop, in any picture. Crown the king (points, a ball or gem); give
  the bishop its mitre and a ball finial.
- **A small, chosen palette.** Pick every colour by hand, 3 to 6 per material, and blend
  only through `ramp`'s dithering. Smoothly mixed colours make a picture look like a blurry
  painting, not pixel art. `mix()` is for building palettes (haze, tints), not per pixel.
- **Dither only at the seams.** `ramp` already dithers just the middle of each step, so
  gradients read as clean bands. Dithering across whole areas reads as noise at 4x.
- **Everything loops.** Every motion must complete a whole number of cycles per `loop`
  seconds: `Math.sin(TAU * k * u)` or `frac(k * u + seed)` with an integer `k` and
  `u = t / loop`. Otherwise the picture jumps every loop, and backgrounds run for hours.
- **Deterministic.** Use `hash`/`noise1`, never `Math.random`: the scene must look the same on
  every screen, every run, and in the Node tools.
- **Static work happens once.** Paint everything that doesn't move into layer buffers in
  `create()` (0 = transparent) and copy them each frame with `over`. Per-frame work is only
  what moves. Budget: under 2 ms a frame in the browser.
- **Masks for effects on static pixels.** For wind over wheat or glints on water, record
  which pixels are wheat or water while building (and their colour), then drop any a later
  layer painted over. Otherwise the effect shows through things in front of it.

### 3. Look at it, properly

Numbers first, then eyes:

```bash
node scripts/live-scene.js check <id>          # loop seam, motion, speed, holes
node scripts/live-scene.js still <id> 20 out.png   # a 4x still at t=20 s
node scripts/live-scene.js sheet <id> 20 out.png   # 6 frames 0.5 s apart, to judge motion
node scripts/live-scene.js moods <id> 1 out.png    # a character in each of its moods
```

Open the PNGs with the Read tool at full size, and crop regions (`sips -c H W --cropOffset Y X`)
to see real pixels: a shrunken screenshot blurs dithering and hides mistakes. For the live
motion, serve the project (`python3 -m http.server 8791`) and open
`http://localhost:8791/scripts/scene-preview.html?scene=<id>` in the browser pane.

Then critique it like an art director and fix, several rounds. The problems that came up
on Pawn Hollow, and that will come up again:

| What you see | Usual cause and fix |
|---|---|
| Clouds look like flat slabs with square ends | puffs clipped by the sprite edge: keep blob centres at least a radius inside |
| A pale patch or pattern on something in front | an effect mask not cleared where a nearer layer painted over it |
| Scratchy dotted lines in the sky | sparse dithered smoke or thin rays: draw smoke as soft `blendAt` puffs, keep rays wide and in the air only |
| Water reads as a path or road | reflection too warm or light: cool, dark body, warm only far away, few glints |
| Everything is equally bright, no depth | the foreground must be the darkest, coolest part; light only on crests and rims |
| The picture looks noisy | too much dithering or speckle: fewer texture hashes, cleaner bands |
| Too busy to read | fewer, bigger shapes in the middle distance; detail belongs to landmarks |
| The loop check fails | a non-integer frequency (`k * 0.5`, `k + p * 7` with a fractional p), noise scrolling without `noiseLoop`, or a spinning shape whose details only repeat after a whole turn |
| The check says too slow | per-pixel noise or blends over big areas every frame: compute noise per 2-4 pixels, precompute pixel lists and alphas once |
| A character looks gritty | dithered shading on the figure: use flat cel bands (nearest tone) |
| Hands or props vanish into the body | same colour, no edge: give front parts a darker seam |

The scene is done when every region holds up at full size, the loop check passes, and you
would put it on the cover of the game.

### 4. Put it in the game

1. Add `<script src="themes/scenes/<id>.js?v=NN"></script>` to `src/index.html`, after
   `themes/scenes/PixelKit.js`, with the same cache tag as the other scripts (bump them all
   if you are the one deploying).
2. For a world background, write its still (loading picture, older Canvas 2D screens):
   `node scripts/live-scene.js bg <id>` writes `assets/textures/backgrounds/<id>_bg.png`.
   If `scripts/generate_backgrounds.py` also makes that world, take it out of `SCENES`
   there (see the note beside it), or re-running it would overwrite the still.
   For a character, give its lines in `src/characters/story.js` a `mood` each and fill in
   `moodFor` so fights change its face (see `references/characters.md`).
3. `npm test`: `tests/livescenes.test.js` checks every scene loops, moves, fills every pixel
   and stays fast.
4. See it in the real app (AGENTS.md: headless Electron and CDP). The owner's save is
   real: back up `chess2_progress` first and confirm it is unchanged after. Calling
   `PixiBackgroundRenderer.render('<id>')` shows a background without touching the save.
5. Update AGENTS.md if the architecture changed, and tell the user what the scene contains.

## Beyond backgrounds and characters

The same kit makes any animated art: a world-map vignette, a theme card, a victory screen. Pick a size that divides evenly into where it will be
shown (for example 80x80 shown at 320x320), register it under a new id, and place it with
`LiveScenes.addTo`. For art that should not move, set `animated: false` in the definition
(the tests then skip the motion check) and export it with `still`.
