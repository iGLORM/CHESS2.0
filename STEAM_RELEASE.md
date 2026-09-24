# Steam release checklist

## Build

```bash
npm install
npm test
npm run build:steam:win     # -> dist/win-unpacked/   (upload this folder as the Windows depot)
npm run build:steam:mac     # -> dist/mac-arm64/      (Apple Silicon; add --x64 or --universal for Intel)
npm run build:steam:linux   # -> dist/linux-unpacked/
```

The Windows build can be made on a Mac, but test it on a real Windows PC before uploading.
Launch executable for the Steam depot: `Chess 2.0.exe` (Windows), `Chess 2.0.app` (macOS).

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

- **Stockfish (GPLv3)**: the game bundles Stockfish as a separate program talking over UCI. Keep
  `src/engine/stockfish/COPYING.txt` and `README.md` in the build and the source links in Credits.
  If you are unsure, get advice; the alternative is to remove Stockfish and use only the built-in
  engine (weaker at the highest levels).
- **Fonts (OFL 1.1)**, **PixiJS (MIT)**, **Electron (MIT)**, **pretext (MIT)**: licence files included.
- **GSAP**: free "standard" licence, which allows use in paid games.
- **Your own code**: there is no LICENSE file for Chess 2.0 itself; add one if you want to set terms.

## "Send Feedback"

It posts the player's message to `https://game.altobolt.com/api/feedback`. Before release,
make sure that server is running, or remove the button, and mention it in a short privacy note
on the store page.
