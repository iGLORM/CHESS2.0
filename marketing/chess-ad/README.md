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
