<p align="center">
  <img src="assets/logo.png" alt="Chess 2.0 Banner" width="800" />
</p>

<p align="center">
  <strong>A fully-featured pixel-art chess game built with Electron and vanilla JavaScript.</strong><br/>
  <strong>Play on desktop or mobile via <a href="https://t.me/iglorm_chess_bot?startapp=play">Telegram Mini App</a></strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-44-47848F?logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/PixiJS-v8-E91E63?logo=webgl&logoColor=white" alt="PixiJS v8" />
  <img src="https://img.shields.io/badge/Canvas-2D-E34F26?logo=html5&logoColor=white" alt="HTML5 Canvas" />
  <img src="https://img.shields.io/badge/License-Open%20Source-88d8b0" alt="License" />
  <img src="https://img.shields.io/badge/AI-Stockfish%2018-fff5a0?logoColor=black" alt="Stockfish" />
  <br/>
  <img src="https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white" alt="Windows" />
  <img src="https://img.shields.io/badge/macOS-000000?logo=apple&logoColor=white" alt="macOS" />
  <img src="https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black" alt="Linux" />
  <img src="https://img.shields.io/badge/Telegram-Mini%20App-26A5E4?logo=telegram&logoColor=white" alt="Telegram Mini App" />
</p>

<p align="center">
  Chess with a twist: when a piece is about to be captured, its owner can fight back in a quick mini-game.<br/>
  Cross eleven shattered worlds in Story Mode, play the computer, solve puzzles, or battle a friend on the same screen.
</p>

---

## Screenshots

<p align="center">

| Home Screen | World Map | World Missions |
|:---:|:---:|:---:|
| ![Home Screen](assets/screenshots/home_screen.png) | ![World Map](assets/screenshots/world_map.png) | ![World Missions](assets/screenshots/world_missions.png) |

| Story Fight | Mystery Piece in the Fog | Custom Game |
|:---:|:---:|:---:|
| ![Story Fight](assets/screenshots/game_screen.png) | ![Mystery Piece](assets/screenshots/mystery_piece.png) | ![Custom Game](assets/screenshots/custom_game.png) |

| Settings | How to Play | Stats |
|:---:|:---:|:---:|
| ![Settings](assets/screenshots/settings.png) | ![How to Play](assets/screenshots/how_to_play.png) | ![Stats](assets/screenshots/stats.png) |

</p>

---

## The Chess 2.0 Rule

Everything is normal chess, with one twist: **captures can be challenged with a quick 3D arcade mini-game.**

- **Local 1v1 and Custom Game (Defenses):** when one of your pieces is about to be captured, you can spend a
  **Defense** to play a mini-game. Win it and the capture is cancelled and your opponent loses their turn.
  Each side starts with **2 Defenses** and earns **1 more for every 2 captures**.
- **Story Mode (Challenges):** any capture may start a challenge (about 1 in 3, and some bosses change the odds).
  The **attacker** plays it: win and the capture goes through, lose and it is cancelled and that square locks.
- A capture that gets a king **out of check** can never be blocked.

Classic Chess is plain chess with no mini-games.

---

## Features

| Feature | Description |
|:--------|:------------|
| **Story Mode** | "The Shattered Board": 15 stages across 11 worlds, a world map, cutscenes, 45 missions and 9 guardians who each bend the rules |
| **Local 1v1** | Two players on the same screen, with Defenses |
| **Classic Chess** | Standard chess against the computer, 200-2000 Elo, as White or Black |
| **Custom Game** | Pick the bot strength, your side, whether Defenses are on, and which mini-games can appear |
| **Training** | 30 puzzles with stars, hints and a coach, plus a board editor |
| **18 3D Mini-Games** | Retro-styled Three.js arcade games that decide contested captures; practise any of them from Settings |
| **Stockfish AI** | Every bot is the bundled Stockfish 18, from human-like beginner mistakes up to full strength |
| **Undo, flip, review** | Take back moves, flip the board, and step through the game's history |
| **Resume** | An unfinished game is saved after every move and can be resumed from the home screen |
| **World themes** | 11 painted themes (board, piece set, animated background and song) plus a custom colour theme |
| **Synthesised music** | Every theme has its own song, generated live with Web Audio, with a tense version during check |
| **Works offline** | All libraries, fonts and the engine are bundled; no internet needed |
| **Desktop, web & phone** | Electron app for Windows/macOS/Linux, and the same code runs in a browser and as a [Telegram Mini App](https://t.me/iglorm_chess_bot?startapp=play) with a portrait layout |

---

## Story Mode: The Shattered Board

You wake in Pawn Hollow with no memory, holding a glowing shard of the Great Board. The board was shattered
the night you fell from the sky, and every world is fading. Nine guardians hold the other fragments, and each
one you beat lets slip a clue about who you are.

- **World map:** travel from world to world; beating a guardian restores its world, and your king walks on.
- **The Training Camp:** five holographic trainers teach the moves, challenges, mini-games and twists.
- **Missions:** every guardian world has five missions before its guardian: mate-in-one puzzles, challenge
  trials, hunts, rule tasters and wild cards. Board missions are won by checkmate or by their goal:
  **catch the Mystery Piece** (every enemy piece is a suspect and hints narrow it down), **capture every piece**,
  **crown a pawn**, or **survive**.
- **Difficulty:** six tiers (Rookie to Madness) and three save slots.

| Stage | Opponent | World | Twist |
|:-----:|:---------|:------|:------|
| 1 | Pawnie | Pawn Hollow | A normal match |
| 2-6 | Sergeant Square, Captain Capture, Joy Stick, The Rulekeeper, Sensei Tactic | The Training Camp | Lessons and tests |
| 7 | Bish-Bosh | The Slanted Sands | Four bishops, no knights |
| 8 | Rook-E | The Iron Keep | You start without rooks; taking his always starts a challenge |
| 9 | The Knight of the Mist | The Misty Moors | Fog of war; glowing eyes in the mist |
| 10 | Queenie | The Royal Palace | Two queens; her captures challenge you more often |
| 11 | CastlE | The Clockwork Citadel | Gear walls in the centre; lost challenges lock squares |
| 12 | EndGamer | The Grand Library | Starts in a random endgame that favours him |
| 13 | ForkMaster | Forked Gulch | Double take: one fork takes two pieces |
| 14 | Checkmate | The Obsidian Court | Mate him within 40 moves or lose |
| 15 | Grandmaster X | Soulbound Pixel | Every capture is a challenge; checkmate him three times as time rewinds |

---

## Capture Mini-Games

Checkmate Run, Lava Tilt, Rook Stack, Siege Cannon, Meteor Storm, Knight Collapse, Memory Match, Timing Strike,
Pattern Press, Quick Draw, Soul Dodge, High Striker, Crossbow Gallery, Falling Sky, Rhythm Rush, Tightrope,
Shield Wall and Whack-a-Pawn.

All are low-poly Three.js games with a retro pixel look, using chess pieces coloured by the current theme.
Difficulty scales with the value of the piece at stake, and when the computer plays one, it plays at a skill
matching its strength. Without WebGL, captures simply skip the challenge.

---

## Controls

| Input | Action |
|:-----:|:-------|
| Click / tap | Select a piece, then a highlighted square |
| `U` or `Cmd/Ctrl+Z` | Undo your last move (against the computer, also undoes its reply) |
| `F` | Flip the board |
| `←` / `→` | Step back / forward through the game |
| `Esc` | Pause menu (resign, settings, quit) / back in menus |
| `Enter` | Confirm in menus |
| `F11` | Toggle fullscreen (desktop) |

The **UNDO**, **FLIP**, **<**, **>** and **LIVE** buttons under the board do the same things.

---

## Getting Started

### Download & Play

Pre-built binaries are published on the [Releases](https://github.com/iGLORM/CHESS2.0/releases) page when available.

### Build from Source

Prerequisite: [Node.js](https://nodejs.org/) v20+.

```bash
git clone https://github.com/iGLORM/CHESS2.0.git
cd CHESS2.0
npm install
npm start
```

If `npm start` says Electron failed to install, run `node node_modules/electron/install.js` once.

To play in a browser, serve the repository root with any static web server
(for example `python3 -m http.server`) and open `http://localhost:8000/src/index.html`.

### Test

```bash
npm test
```

Runs the engine, Chess 2.0 rule, story boss-rule and mission tests (no extra dependencies).

### Build Distributable

```bash
npm run build:win     # Windows installer + portable exe
npm run build:mac     # macOS DMG
npm run build:linux   # Linux AppImage + deb
```

Built files are written to `dist/`. For Steam, `npm run build:steam:win` / `build:steam:mac` /
`build:steam:linux` produce the unpacked app folders; see [STEAM_RELEASE.md](STEAM_RELEASE.md).

---

## Project Layout

```
src/
  audio/          Web Audio synth, songs and music player (no audio files)
  characters/     Story characters, trainers, worlds, missions, story script, dialogue
  engine/         Chess engine, Chess 2.0 capture rules, story boss rules, notation
    ai/           Stockfish controller, coach and bot personalities
    stockfish/    Bundled Stockfish.js 18 (GPLv3)
  input/          Keyboard input and keybindings
  layout/         Portrait/landscape layout
  minigames/      Mini-game manager
  minigames3d/    The 18 Three.js mini-games and their shared renderer
  pixi/           PixiJS v8 renderers and UI components
  rendering/      Canvas 2D helpers and texture loading
  screens/        Every screen (home, world map, missions, cutscenes, game, menus)
  state/          Reactive store and save data
  telegram/       Telegram Mini App compatibility layer
  themes/         World themes and animated background scenes
  vendor/         Bundled PixiJS, GSAP, Three.js, fonts and pretext
assets/           Painted backgrounds, boards, piece sets, character art
scripts/          Art generators (backgrounds, theme art, trainer holograms, icons)
tests/            Node tests (npm test)
```

## For Contributors and AI Agents

- **[AGENTS.md](AGENTS.md)**: architecture, conventions, testing tools and the rules for working together
  (read by Codex; Claude Code reads it through [CLAUDE.md](CLAUDE.md)).
- **[STORY_MODE_PLAN.md](STORY_MODE_PLAN.md)**: the Story Mode design, what is built and what is left.
- **[STEAM_RELEASE.md](STEAM_RELEASE.md)**: the release checklist.

---

## Roadmap

- [x] Mobile / touch support (Telegram Mini App with portrait mode)
- [x] Undo, board flip and resuming unfinished games
- [x] Story Mode rebuilt: world map, trainers, missions, cutscenes and boss twists
- [ ] Story rewards: stars per fight, trophies, New Game+ and Great Board mode
- [ ] Online multiplayer
- [ ] Game replay / PGN export

---

## Credits and License

Created by iGLORM and Aymou.

No license file has been added yet for the game itself. Bundled third-party code keeps its own license:
Stockfish (GPLv3, see `src/engine/stockfish/`), PixiJS and Three.js (MIT), GSAP (its standard license),
Pixelify Sans and Silkscreen fonts (SIL Open Font License 1.1).
