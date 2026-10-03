# Chess 2.0 — Fight for your next move

A 32-second, 1920×1080, 30 fps game trailer with 25 shots, actual gameplay, frame-driven motion graphics, and an original 150 BPM electronic score with synchronized sound design.

## Preview and edit

```sh
npm install
npm run dev
```

Open the printed Studio URL and choose **Chess2-Ad**. Press Play with audio enabled. Individual acts appear in the Scenes folder. The composition contains six acts with nested, named shots; camera moves, kinetic words, transitions and particles follow the Remotion frame clock.

See [CREATIVE_NOTES.md](CREATIVE_NOTES.md) for the research, storyboard, timing and creative decisions.

## Export

```sh
npm run render
```

Exports `out/chess-2-ad.mp4` (H.264, 1080p). `out/` and dependencies are ignored by Git.

## Refresh assets

```sh
npm run assets
npm run capture           # Original chess, runner and meteor clips
npm run capture:montage   # Capture threat, successful defense, four more games and map
npm run score             # Rebuild the original 32-second music / sound-design mix
```

Both capture helpers use the root Electron dependency in a temporary user-data profile and a non-persistent partition. They never read or alter the player's saved progress. They need a working GPU/WebGL environment. Captures are real-time and vary slightly; rendered motion graphics and the synthesized score are deterministic.

`public/footage/` contains the shipped captures. `trailer-mix.wav` is the active stereo mix; `trailer-audio.json` records cut times and levels. `scripts/score-trailer.cjs` generates music, drums, impacts, whooshes, the stop, save chime and title riser without third-party samples. The previous game's music arrangement remains in `soundtrack.wav` as an alternate, unused track.

## Checks

```sh
npm run lint
npx remotion still Chess2-Ad out/check.png --frame=215
```

The current CTA is `PLAY CHESS 2.0` / `game.altobolt.com`. Edit `src/scenes/PlayNow.tsx` when a confirmed store destination is available. No price or store availability is asserted.

Art and captures come from Chess 2.0. Silkscreen and Pixelify Sans font licenses are in `public/fonts/`. No remote media, third-party trailer footage or externally hosted fonts are needed for preview or export.

## The 5-minute teaser (and its 60-second cut)

Two more compositions, both 1920×1080 at 30 fps: **Chess2-Teaser** (5:00, for YouTube) and
**Chess2-Teaser-60s** (1:00, for TikTok, Reels and X). They share the scenes in `src/teaser/scenes/`;
each takes `short` for the 60-second version. Scene lengths are in `src/teaser/data.ts`
(`FULL`, `SHORT`), with the worlds, guardians, twists and mini-game names shown.

| Time | Scene | What it shows |
| --- | --- | --- |
| 0:00 | Awakening | Pawn Hollow at dawn, the prologue's lines, Pawnie finds you |
| 0:24 | Title | The app-icon queen, the CHESS 2.0 wordmark |
| 0:40 | The twist | A capture on the board turns into a mini-game |
| 1:10 | Arcade | All 18 mini-games cut on the beat (120 BPM), then the grid |
| 1:52 | Shattered | The Great Board, Grandmaster X breaks it, the grey world map heals |
| 2:30 | Worlds | Eight guardians: live world scene, guardian, twist, real fight |
| 3:34 | Journey | Training Camp, the plane, the Crossroads Bazaar, tournaments |
| 4:16 | The Absolute | Grandmaster X, faster and faster cuts |
| 4:46 | Finale | Logo, PLAY NOW and game.altobolt.com |

The art is live: `src/teaser/live/LiveScene.tsx` draws the game's own pixel scenes
(`src/themes/scenes/*.js`) frame by frame, bundled by `npm run teaser:scenes` into
`src/teaser/live/scenes.generated.js` (gitignored; `npm run dev`, `lint` and the teaser renders
bundle it first). Scene state works too: the world map's colour wave is its `heal` state.

```sh
npm run teaser:render60   # out/chess-2-teaser-60s.mp4, then -final.mp4 at -14 LUFS
npm run teaser:render     # out/chess-2-teaser.mp4, then -final.mp4
```

Post the `-final.mp4` files: `scripts/master.cjs` sets the loudness social platforms play at.
`node scripts/stills.cjs Chess2-Teaser out/stills 12 80.5` renders stills at chosen seconds.

Footage and music come from `npm run teaser:capture` (`scripts/capture-teaser.cjs`), which drives
the real game in a temporary, isolated Electron profile (never the player's save): the home
screen, the prologue, nine guardian fights (walk-on, rule card, then play), a capture turning
into a challenge, all 18 mini-games played by the bot, the world map and plane, the shop and the
Queen's Cup. It also renders each world's song with `OfflineAudioContext` (plus 120 BPM versions
for the montages) to `public/teaser/music/`. Pass part names to redo only some
(`npm run teaser:capture -- fights,map`). Recordings are real time, so a new capture differs a
little; check trims in the scenes afterwards.

## Social: 4 reels and 4 covers

In the Studio's **Social** folder (`src/social/`), built on the teaser's pieces:

| Reel (1080×1920) | Length | Cover |
| --- | --- | --- |
| Reel-1-Capture: "What if every capture was a fight?" | 18 s | Cover-1-Capture / Post-1-Capture |
| Reel-2-MiniGames: all 18, cut on the beat | 25 s | Cover-2-MiniGames / Post-2-MiniGames |
| Reel-3-Guardians: eight guardians and their twists | 23 s | Cover-3-Guardians / Post-3-Guardians |
| Reel-4-Story: the setup, no spoilers | 25.5 s | Cover-4-Story / Post-4-Story |
| Reel-5-Code: "Every background in my game is code" | 22.7 s | Cover-5-Code / Post-5-Code |
| Reel-6-Puzzle: a mate in one against a 10 s clock (Nf7#) | 21.5 s | Cover-6-Puzzle / Post-6-Puzzle |
| Reel-7-Pawnie: "I gave a pawn feelings", Pawnie's moods | 19.9 s | Cover-7-Pawnie / Post-7-Pawnie |

`Cover-*` are 1080×1920 (the reel's cover on TikTok and Instagram); `Post-*` are the same design at
1080×1350 for a feed post or X. Each design sits in the middle 1080×1350, so Instagram's grid crop
keeps it. Reel text stays between y 280 and 1450, clear of the apps' buttons and captions. Titles are
`Interactive` elements, so they can be edited and re-timed in the Studio.

```sh
npm run social:reels    # out/social/Reel-*.mp4, then -final.mp4 at -14 LUFS (post these)
npm run social:covers   # out/social/Cover-*.png and Post-*.png
```

Reels 5-7 render the same way (`npx remotion render Reel-5-Code out/social/Reel-5-Code.mp4 --codec=h264`
then `node scripts/master.cjs` on it). `WEEK-1.md` is the first week's posting plan: which reel each day,
captions, hashtags and pinned comments.
