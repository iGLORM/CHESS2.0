<p align="center">
  <img src="assets/logo.png" alt="Chess 2.0 Banner" width="800" />
</p>

<p align="center">
  <strong>A fully-featured pixel-art chess game built with Electron and vanilla JavaScript.</strong><br/>
  <strong>Play on desktop or mobile via <a href="https://t.me/iglorm_chess_bot?startapp=play">Telegram Mini App</a></strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-28-47848F?logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/PixiJS-v8-E91E63?logo=webgl&logoColor=white" alt="PixiJS v8" />
  <img src="https://img.shields.io/badge/Canvas-2D-E34F26?logo=html5&logoColor=white" alt="HTML5 Canvas" />
  <img src="https://img.shields.io/badge/License-Open%20Source-88d8b0" alt="License" />
  <img src="https://img.shields.io/badge/AI%20Engine-Alpha--Beta%20Pruning-fff5a0?logoColor=black" alt="AI Engine" />
  <br/>
  <img src="https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white" alt="Windows" />
  <img src="https://img.shields.io/badge/macOS-000000?logo=apple&logoColor=white" alt="macOS" />
  <img src="https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black" alt="Linux" />
  <img src="https://img.shields.io/badge/Telegram-Mini%20App-26A5E4?logo=telegram&logoColor=white" alt="Telegram Mini App" />
</p>

<p align="center">
  Play classic chess, challenge unique characters in Story Mode, or battle a friend in local 1v1.<br/>
  Featuring dynamic themes, character dialogue, capture minigames, and a custom chess engine with AI opponents.
</p>

---

## Screenshots

<p align="center">

| Home Screen | Settings | Character Select |
|:---:|:---:|:---:|
| ![Home Screen](assets/screenshots/home_screen.png) | ![Settings](assets/screenshots/settings.png) | ![Character Select](assets/screenshots/character_select.png) |

| Bot Select | Custom Game | How to Play |
|:---:|:---:|:---:|
| ![Bot Select](assets/screenshots/bot_select.png) | ![Custom Game](assets/screenshots/custom_game.png) | ![How to Play](assets/screenshots/how_to_play.png) |

| Stats | Game Screen | Theme Select |
|:---:|:---:|:---:|
| ![Stats](assets/screenshots/stats.png) | ![Game Screen](assets/screenshots/game_screen.png) | ![Theme Select](assets/screenshots/theme_select.png) |

</p>

---

## Features

| Feature | Description |
|:--------|:------------|
| **Story Mode** | Battle 5 unique characters with personality-driven dialogue and escalating difficulty |
| **Local 1v1** | Two players on the same machine with full chess rules |
| **Classic Chess** | Play against the built-in AI engine with adjustable depth (10 difficulty levels) |
| **Dynamic Themes** | 3+ visual styles (Space, Medieval, Ocean) with unique color palettes and unlockable themes |
| **Character System** | Each opponent has unique dialogue, colors, and AI personality |
| **Capture Minigames** | 14 skill-based minigames trigger on piece captures for bonus rewards |
| **Portrait & Landscape** | Responsive layout with automatic orientation detection for mobile and desktop |
| **PixiJS v8 Rendering** | GPU-accelerated home screen, board, and UI with GSAP animations |
| **Heavy Background FX** | Parallax fog, themed particles (bubbles, embers, blossoms, shooting stars), pulsing glows |
| **Save System** | Persistent settings, unlocked themes, and progress tracking via localStorage |
| **Custom Engine** | Full legal move generation, check/checkmate detection, and AI search with alpha-beta pruning |
| **Telegram Mini App** | Play on mobile via [@iglorm_chess_bot](https://t.me/iglorm_chess_bot?startapp=play) with haptic feedback and native back button |
| **Fullscreen** | Toggle fullscreen mode with F11 |

---

## Game Modes

### Story Mode

Face off against 5 themed opponents in order of difficulty:

| Level | Character | Title | Personality |
|:-----:|:----------|:------|:------------|
| 1 | Pawnie | The Village Rookie | Nervous |
| 2 | Bish-Bosh | The Diagonal Dreamer | Enthusiastic |
| 3 | Rook-E | The Iron Tower | Stoic |
| 4 | KnightShade | The Shadow Lancer | Mysterious |
| 5 | Queenie | The Royal Tyrant | Arrogant |

Each character greets you before battle and reacts to victory or defeat.

### Local 1v1

Two players take turns on the same keyboard. Standard chess rules apply.

### Classic Chess

Play against the AI with full control over search depth and difficulty. The AI uses alpha-beta pruning with piece-square tables and material evaluation across 10 difficulty levels.

---

## Themes

Switch between visual themes that change the entire board, pieces, UI, and background:

| Theme | Name | Description |
|:-----:|:-----|:------------|
| `space` | Cosmic Abyss | Twinkling stars, shooting stars, nebula glows |
| `medieval` | King's Fortress | Floating embers, torch glow pulses |
| `ocean` | Deep Blue | Rising bubbles, underwater light rays |
| `japanese` | Cherry Blossom | Falling cherry blossoms with rotation |
| `crystal` | Crystal Cavern | Sparkling crystal flashes |
| `cyberpunk` | Neon Grid | Data streaks, digital rain |
| `egypt` | Desert Sun | Drifting sand, heat shimmer |
| `steampunk` | Brass Works | Rising steam wisps, rotating gears |
| `prehistoric` | Lost World | Floating spores, mist banks |
| `artdeco` | Golden Age | Geometric gold shapes |
| `wildwest` | Dusty Trail | Blowing dust particles |

Each theme has a matching title logo variant (original, magma, or ice). Themes affect board, pieces, UI, backgrounds, particles, and buttons. 12 themes total, unlockable through gameplay.

---

## Capture Minigames

When a piece is captured, a skill minigame may trigger (30% chance, toggleable in Settings). Win the minigame for bonus rewards:

| Minigame | Skill Tested |
|:---------|:-------------|
| Quick Click | Speed clicking |
| Memory Match | Pattern memory |
| Timing Strike | Precise timing |
| Pattern Press | Sequence input |
| Reaction Test | Reflexes |
| Undertale Dodge | Bullet dodging |
| Power Meter | Charge control |
| Target Practice | Aiming |
| Dodge Falling | Avoidance |
| Rhythm Tap | Rhythm timing |
| Number Guess | Logic deduction |
| Coin Flip | Chance |
| Shield Block | Blocking defense |
| Whack-a-Mole | Speed targeting |

Difficulty scales based on the value of the captured piece.

---

## Controls

| Key | Action |
|:---:|:-------|
| `Arrow Keys` / `WASD` | Navigate menus, move cursor on board |
| `Enter` / `Space` | Select / Confirm |
| `Escape` | Back / Pause |
| `F` | Flip board (in-game) |
| `H` | Toggle move hints (in-game) |
| `P` | Toggle particles (in-game) |
| `F11` | Toggle fullscreen |

---

## Getting Started

### Download & Play (No Setup Required)

Pre-built binaries are available on the [Releases](https://github.com/iGLORM/chess/releases) page:

| Platform | Download | Notes |
|:---------|:---------|:------|
| **Windows** | `Chess-2.0-win-portable.zip` | Extract and run `Chess 2.0.exe` |
| **macOS** | `Chess-2.0.dmg` | Open the DMG and drag to Applications |
| **Linux** | `Chess-2.0.AppImage` | `chmod +x` and run |

### Build from Source

#### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- npm (comes with Node.js)

#### Dependencies (auto-installed via npm)

- **Electron** — Desktop app framework
- **PixiJS v8** — GPU-accelerated 2D rendering (loaded via CDN)
- **GSAP** — Animation library (loaded via CDN)
- **@chenglou/pretext** — Accurate text measurement for Canvas 2D text fitting

#### Run in Development

```bash
git clone https://github.com/iGLORM/chess.git
cd chess
npm install
npm start
```

#### Build Distributable

```bash
# Windows (creates NSIS installer + portable exe)
npm run build:win

# macOS (creates DMG)
npm run build:mac

# Linux (creates AppImage + deb)
npm run build:linux
```

Built files are output to the `dist/` directory.

### Platform Launchers

| Platform | Launcher | Usage |
|:---------|:---------|:------|
| **Windows** | `launch.bat` | Double-click or run from cmd |
| **Linux / macOS** | `launch.sh` | `chmod +x launch.sh && ./launch.sh` |

---

## Architecture

```
src/
  audio/          Sound and music management (Web Audio API)
  characters/     Character definitions and manager
  engine/         Chess engine (board, moves, rules, AI)
    ai/           Alpha-beta search, evaluation, difficulty controller
  input/          Keyboard input and keybindings
  layout/         Orientation detection and responsive layout (portrait/landscape)
  minigames/      14 skill-based capture minigames
  pixi/           PixiJS v8 renderers (board, pieces, backgrounds, UI components)
  rendering/      Canvas 2D rendering (board, pieces, particles, UIHelpers, TextFit)
  screens/        UI screens (home, game, menus, settings)
  state/          Global reactive state store
  telegram/       Telegram Mini App compatibility layer
  themes/         Theme definitions and manager
  main.js         Game loop and screen router
  index.html      Entry point
```

| File | Purpose |
|:-----|:--------|
| `main.js` | Electron main process |
| `preload.js` | Secure preload script (context isolation) |
| `src/main.js` | Game bootstrap, loop, and screen routing |
| `src/index.html` | Module loader |

Textures and sprites are procedurally generated at runtime using the `SpriteGen` and `TextureManager` modules. The `assets/textures/` folder supports custom texture packs.

---

## Roadmap

- [x] Mobile / touch support (Telegram Mini App with portrait mode)
- [ ] Online multiplayer
- [ ] More themes (Forest, Lava, Ice)
- [ ] Additional characters with unique AI strategies
- [ ] Game replay / PGN export
- [ ] Elo rating system

---

## License

This project is open source. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Pixel art aesthetic inspired by retro arcade games
- Chess piece values and evaluation based on standard engine principles
- Built with love for the game of chess
