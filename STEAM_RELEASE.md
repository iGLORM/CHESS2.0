# Steam release checklist

## Build

```bash
npm install
npm test
npm run build:steam:win     # -> dist/win-unpacked/   (upload this folder as the Windows depot)
                            #    each build first downloads the Stockfish source (see Licences)
npm run build:steam:mac     # -> dist/mac-arm64/      (Apple Silicon; add --x64 or --universal for Intel)
npm run build:steam:linux   # -> dist/linux-unpacked/
```

The Windows build can be made on a Mac, but test it on a real Windows PC before uploading.
Launch executable for the Steam depot: `Chess 2.0.exe` (Windows), `Chess 2.0.app` (macOS).

## Windows build: checked from the Mac

- `Chess 2.0.exe` is 64-bit, with version info (Chess 2.0, 1.0.0, iGLORM) and a 16–256px icon.
- The Windows `app.asar` runs: Stockfish (WASM), which plays every level, works from inside
  the archive, fonts load locally, and nothing is fetched from the network.
- Rendering matches the screen's pixels at 1920x1080, 2560x1440, 1366x768 and with Windows
  display scaling (125%, 150%, 200%), so pixel text stays even.
- Save data: `%APPDATA%\chess-2.0\` (Local Storage folder + `window.json`). Point Steam Cloud here
  if you enable it; on macOS it is `~/Library/Application Support/chess-2.0/`.

## Windows build: test on a real PC (about 15 minutes)

1. Copy `dist/win-unpacked/` over and run `Chess 2.0.exe`. SmartScreen may warn because the exe
   is unsigned; that warning does not appear when Steam launches the game.
2. It opens fullscreen with no white flash; F11 and Alt+Enter toggle fullscreen, and the choice
   is remembered after quitting.
3. Taskbar and Alt+Tab show the knight icon, not the Electron logo.
4. Play a Classic game at the highest level (uses Stockfish), and capture a piece until a
   mini-game appears.
5. Close with Alt+F4 in the middle of a game, relaunch: Home offers "Resume".
6. Launch twice: the second launch focuses the first window instead of opening another.
7. After uploading, launch through Steam and press Shift+Tab. If the Steam overlay does not
   appear, the game still works; Electron games often need extra switches for the overlay, so
   treat it as optional.

## Already done in the game

- Runs fully offline; no network requests except the optional "Send Feedback" form.
- Starts fullscreen (remembered), Fullscreen switch in Settings, F11, Quit button.
- Single instance, no DevTools or developer shortcuts in release builds.
- Save data (progress, stats, settings, unfinished game) is stored locally per user.
- Credits screen (How to Play > Credits) and licence files shipped with the code.

## Things only you can do

1. **Steamworks account**: sign up at partner.steamgames.com and pay the app fee (US$100 per game).
2. **Store page**: description, tags, at least 5 screenshots, a trailer (recommended), and the
   capsule images Steam requires (header, small/main capsule, library hero/logo, etc.).
3. **Content questionnaire**: rating questions, and the **AI-generated content disclosure** if any
   art (character portraits, logo, backgrounds) was made with AI tools.
4. **Price**: set US$4.99; Steam suggests regional prices.
5. **Upload builds** with SteamPipe (steamcmd or the Steamworks upload tool) and set launch options.
6. **Review**: Steam reviews the store page and the build before release; plan for a few days,
   plus the required "Coming Soon" period.
7. **macOS**: for Mac players, sign and notarize the app with an Apple Developer ID (US$99/year),
   otherwise macOS will block it. Many small games ship Windows-only at first.

## Licences to respect

- **Stockfish (GPLv3)**: free to use in a paid game. The game bundles an unmodified Stockfish.js
  build as a separate program talking over UCI, so only Stockfish itself is under the GPL, not
  your game code. What the GPL asks, and where it is handled:
  - licence text and notices: `src/engine/stockfish/COPYING.txt` and `README.md` (exact version,
    copyright, no-warranty notice, source commit), copied to `licenses/stockfish/` in every build;
  - the complete source for the exact build: `npm run build:*` first runs
    `npm run stockfish-source`, which downloads stockfish.js commit `32d4b5a` into
    `third_party/` (gitignored) and ships it in `licenses/stockfish/source/`. A build stops if
    the download fails; don't upload a build without that folder;
  - Credits screen: names Stockfish, the GPL, no warranty, and where the source is.
  - Web version (game.altobolt.com): it also sends Stockfish to players, so put the source archive on the
    server too (e.g. copy `third_party/stockfish-source/` to `/var/www/chess2/src/licenses/`).
  - If you ever modify Stockfish, you must publish your modified source as well.
- **Fonts (OFL 1.1)**, **PixiJS (MIT)**, **Electron (MIT)**, **pretext (MIT)**: licence files included.
- **GSAP**: free "standard" licence, which allows use in paid games.
- **Your own code**: there is no LICENSE file for Chess 2.0 itself; add one if you want to set terms.

## "Send Feedback"

It posts the player's message to `https://game.altobolt.com/api/feedback`. Before release,
make sure that server is running, or remove the button, and mention it in a short privacy note
on the store page.
