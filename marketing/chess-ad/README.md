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
