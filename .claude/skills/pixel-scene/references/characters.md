# Live characters

How to draw a story character as live pixel art, the way `src/themes/scenes/char_pawnie.js`
does. Read it together with that file; it is the reference for style and structure.

## Contents
1. What a character file is
2. Size and framing
3. Building the figure from shapes
4. Shading: cel bands, not dither
5. Outlines and seams
6. Faces and moods
7. Idle life
8. The backdrop
9. Wiring moods to the story and fights
10. Checking a character

## 1. What a character file is

`src/themes/scenes/char_<characterId>.js` registers a scene with extra fields:

```js
LiveScenes.register({
  id: 'char_pawnie', width: 62, height: 80, loop: 60, still: 1,
  moods: ['nervous', 'happy', 'scared', 'surprised'],   // first = default
  frames: { face: [11, 8, 40, 40] },                    // close-up crop: x, y, w, h
  moodFor(category) { ... },                            // dialogue category -> mood or null
  create() { ...; return (t, out, state) => { ... state.mood, state.since ... }; },
});
```

With that file loaded in `src/index.html`, the game uses it automatically:
- the story cutscene portrait card (`StoryScene._portrait`), whose mood comes from each
  beat's `mood` field in `src/characters/story.js`;
- the opponent's face in the game HUD and the dialogue bubble (the `face` frame);
- fight reactions: `DialogueManager` passes the line's category, `GameScreen._setCharacterMood`
  asks `moodFor`, holds the mood for 6 s, then returns to the default.

## 2. Size and framing

The cutscene card is 250x320, so draw at **62x80** and it shows at exactly 4x (248x320).
Keep the character's head in the top half and fully inside the `face` frame: the HUD
shows that crop at 40x40 and the bubble at 48x48, where only the head and shoulders read.
A character about 34 px wide and 60 px tall leaves room for effects (a "!", sparkles,
sweat drops) around it.

## 3. Building the figure from shapes

Don't type pixel grids for the body: build it from simple shapes, each with a surface
normal, so light falls on it correctly and it can move and squash.

- Circles and ellipses (heads, collars, hands, crowns' orbs): `disc(cx, cy, rx, ry, part)`,
  normal `((x - cx) / rx, (y - cy) / ry)`.
- Surfaces of revolution (a piece's skirt or base): per row, a half-width `hw(y)`; normal
  `x` is `(x - cx) / hw`, normal `y` a small constant for the slant.
- Give each shape a **part number**, back to front (base 1, skirt 2, collar 3, head 4,
  hands 5 and 6). Parts are what outlines and seams are drawn from.

Chess pieces are the characters' bodies, so start from the piece's silhouette (pawn,
bishop mitre, rook turret, knight head, queen and king crowns) and add the personality
on top: a face, hands, a hat, an accessory that says who they are.

**Never put a cross on a king or a bishop** (no cross finial, no "+" on top): the owner does
not want it in any design. A king wears a crown with points and a ball or gem; a bishop
has its mitre and a ball finial.

Redraw the figure every frame into its own buffer (`SPR`, `PART`), with offsets for
breathing and hops; it is small, so this costs almost nothing, and it keeps shapes
whole when they move.

## 4. Shading: cel bands, not dither

Characters read best with **clean flat bands**: pick the nearest tone instead of
dithering (dither made Pawnie look gritty at 4x):

```js
const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
const l = nx * LX + ny * LY + nz * LZ;                 // key light, normalised
SPR[i] = nx > 0.78 && l < 0.25 ? RIM : TONES[Math.round(clamp(1 - (l * 0.62 + 0.42)) * (TONES.length - 1))];
```

- 4 to 5 tones per material, light to dark, with the dark end leaning cool (purple-grey
  for cream, not grey-brown).
- Light the character like its world: warm key light from the side of that world's sun or
  torch, and a cool rim on the other side, so it sits in the scene rather than on top of it.
- A tiny 2-3 px white shine on the head sells the roundness.
- Dithering is fine for the backdrop behind the character, just not on the figure.

## 5. Outlines and seams

- An empty pixel next to any part becomes the dark outline (`#2e1e2e` for Pawnie): it
  keeps the silhouette readable at 40x40.
- Where a part overlaps one behind it (lower part number), its edge pixel becomes a
  **seam**: a soft mid tone between parts of the same material (collar over skirt), a
  darker tone for things that must stand out (hands over the body). Without that darker
  seam, cream hands vanish into a cream body.

## 6. Faces and moods

Faces are the one place for hand-placed pixels: a few `put` calls relative to the head
centre `(hx, hy)`, written as small functions (`eyes(kind)`, `brows(kind)`, mouths).
What each mood changed on Pawnie, as a starting vocabulary:

| Mood | Eyes | Brows | Mouth | Extras | Body |
|---|---|---|---|---|---|
| nervous | 2x3 dots with a shine | inner ends raised | small wobbly frown | small blush, one sweat drop sliding | hands fidget |
| happy | closed arcs (^ ^) | none | open smile, tongue | big blush, twinkling sparkles | little hops |
| scared | 3x4 wide with two shines | raised, worried | small open o | two sweat drops | fast 1 px tremble |
| surprised | 3x3 round | high and flat | O with dark inside | a "!" pops up (uses `since`) | a jump when the mood starts |

Also:
- Blink every few seconds (`frac(k * u + p) < 0.03`), not in moods with closed eyes.
- Pick moods from what the character actually says (read its lines in `characters.js` and
  `story.js`): a boastful guardian needs smug, angry and rattled more than scared.
- `state.since` is when the mood began, so one-off reactions (a jump, a "!") can play once.

## 7. Idle life

A still character looks like a sticker. Give every character, whatever the mood:
- breathing: head and collar sink 1 px on the out-breath (every 3 s or so);
- blinking;
- one habit that is theirs: Pawnie fidgets with its hands; a knight might paw the ground,
  a queen fan herself, a clockwork guardian tick.

Keep motion to whole pixels and small amounts; big wobbles look cheap at 4x.

## 8. The backdrop

The card behind the character is a tiny version of its world: that world's sky ramp with
a glow behind the head (which separates the head from the background), a hill or two, a
recognisable landmark (Pawn Hollow's windmill, with turning sails), swaying foreground
plants and a couple of fireflies. Keep it darker and busier at the edges, calm behind
the head.

## 9. Wiring moods to the story and fights

- Story: add `mood: '<mood>'` to that character's beats in `src/characters/story.js`.
  Beats without one use the default mood.
- Fights: `moodFor(category)` maps `DialogueManager` categories (`gameStart`,
  `bossCapture`, `playerCapture`, `bossCaptureBig`, `playerCaptureBig`, `bossCheck`,
  `playerCheck`, `bossTaunt`, `milestone`, `lowHealth`, `playerLowHealth`, plus twist
  categories such as `eyes`, `lock`, `clockLow`) to moods. Return null to keep the
  current mood.

## 10. Checking a character

```bash
node scripts/live-scene.js check char_<id>
node scripts/live-scene.js moods char_<id> 1 out.png --scale 5   # every mood side by side
node scripts/live-scene.js sheet char_<id> 0 out.png              # idle motion
```

Look at the moods image at full size: each mood must be readable at a glance, the
hands and other front parts must stand out from the body, and the head must sit
fully inside the `face` frame. Then check the cutscene card and the bubble in the real
app (`switchScreen('storyScene', { scene, next: 'home' })` and `StoryScene.advance()`;
`GameScreen._showDialogueBubble(text, character)` on the home screen), backing up and
confirming the owner's save as usual.
