# Chess 2.0 — A second chance

25-second widescreen game ad, 1920×1080, 30 fps. Built in Remotion with actual game captures, original game art and a 120 BPM arrangement of the game's Crystal suspense music. No stock assets, voiceover or external font requests.

## Preview and edit

From this directory:

```sh
npm install
npm run dev
```

Open the printed Studio URL and select **Chess2-Ad**. Each scene is also registered separately in the Scenes folder. Titles and the call to action use editable Remotion Interactive elements.

| Time | Scene | Message |
| --- | --- | --- |
| 0–4s | Chess footage | Chess. With a second chance. |
| 4–10s | Checkmate Run | Captured? Fight back. |
| 10–14s | Meteor Storm | 18 mini-games. One more chance. |
| 14–20s | Story guardians | A shattered world. Your next move. |
| 20–25s | Brand and CTA | Play now — game.altobolt.com |

## Export

```sh
npm run render
```

Writes `out/chess-2-ad.mp4` (H.264). `out/` and `node_modules/` are gitignored.

## Refresh source assets

```sh
npm run assets
npm run capture
```

`capture` uses the root project's Electron dependency. It launches a separate temporary user-data profile with a non-persistent session partition, so it never loads or changes the player's saved progress. It records legal opening moves and bot-played defensive minigames, and renders the game music with OfflineAudioContext. The copied art and captured WebM/WAV files live in `public/` and are included so previewing does not require launching the game.

The capture helper needs a working GPU/WebGL environment. Gameplay recordings are real-time and may vary slightly across machines. Remotion animations are frame-driven and deterministic after capture.

## Checks

```sh
npm run lint
npx remotion still Chess2-Ad out/check.png --frame=215
```

Fonts: Silkscreen and Pixelify Sans; their SIL Open Font License texts are in `public/fonts/`. Art, footage and music are from Chess 2.0. The app runtime and saved games are unchanged.

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
| 4:46 | Finale | Logo, PLAY NOW, game.altobolt.com and the Telegram bot |

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
