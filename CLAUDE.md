# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies (Electron)
npm start            # Launch the game (runs `electron .`)
npx electron .       # Alternative launch command
```

No test framework, linter, or build step is configured. The app runs directly from source via Electron.

## Architecture

This is a pixel-art chess game built with **Electron + vanilla JavaScript + HTML5 Canvas**. No frameworks or bundlers.

### Process Model
- `main.js` — Electron main process (window creation, IPC for fullscreen toggle)
- `preload.js` — Secure bridge exposing `window.electron` API
- `src/index.html` — Loads all JS modules via `<script>` tags (no module bundler)
- `src/main.js` — Game bootstrap: canvas setup, game loop (`requestAnimationFrame`), screen router with fade transitions

### Rendering
All rendering targets a **virtual 1280×800 canvas** that scales to the window. Two canvases exist: `gameCanvas` (main) and `miniGameOverlay` (minigames). The coordinate system is always 1280×800 regardless of actual window size.

### Screen System
Screens are plain objects with `init(data)`, `render(ctx, dt)`, `handleClick(x, y)`, `handleKeyDown(e)`, and optional `destroy()` methods. Registered in `src/main.js` via `registerScreen(name, impl)`. Screen transitions use a fade-to-black animation. `switchScreen(name, data)` triggers navigation.

### State Management
`src/state/Store.js` — A singleton `store` with `get(key)`, `set(key, value)`, `update({})`, and `on(key, fn)` for reactive listeners. Persists progress to `localStorage` under key `chess2_progress`.

### Chess Engine (`src/engine/`)
Core logic + AI subsystem:

| File | Purpose |
|------|---------|
| `Board.js` | 8×8 grid, piece objects `{type, color}`, castling rights, en passant |
| `FEN.js` | FEN notation parsing and serialization |
| `MoveGen.js` | Pseudo-legal move generation for all piece types |
| `LegalFilter.js` | Filters moves that leave king in check |
| `GameRules.js` | Check/checkmate/stalemate/draw detection |
| `MoveExecutor.js` | Applies moves, handles castling/en passant/promotion |
| `ai/Search.js` | Alpha-beta pruning with iterative deepening |
| `ai/Evaluate.js` | Material + piece-square table evaluation |
| `ai/CloudEval.js` | Cloud-based move evaluation |
| `ai/AIController.js` | 10 difficulty levels (depth 1–5, with noise for lower levels) |

### Rendering (`src/rendering/`)
`BoardRenderer.js`, `PieceRenderer.js`, `TextureManager.js`, `Animator.js`, `ParticleFX.js`, `BackgroundRenderer.js`, `SpriteGen.js`, `UIHelpers.js`. Two canvases: `gameCanvas` (main) and `miniGameOverlay` (minigames).

### Input (`src/input/`)
`InputManager.js`, `Keybindings.js` — keyboard and control handling.

### Minigame System
14 minigames in `src/minigames/`: `UndertaleDodge`, `QuickClick`, `CoinFlip`, `RhythmTap`, `BarBalance`, `DodgeFalling`, `MemoryMatch`, `NumberGuess`, `PatternPress`, `PowerMeter`, `ReactionTest`, `ShieldBlock`, `TargetPractice`, `TimingStrike`, `WhackMole`. `MiniGameManager` selects and runs them on the overlay canvas (30% chance on piece capture).

### Theme System
`src/themes/themes.js` defines theme color palettes. `ThemeManager` resolves current colors. Themes affect board, pieces, UI panels, text, particles, and backgrounds. Unlockable themes include Crystal Kingdom and Soulbound.

### Asset Structure
```
assets/
├── textures/          # Piece sprites and backgrounds per theme
│   ├── backgrounds/   # Theme backgrounds (Japanese, ocean, crystal, wildwest)
│   └── pieces/       # Organized by theme (ocean, prehistoric, wildwest, artdeco, medieval, japanese)
├── characters/       # Character portraits (bishbosh, checkmate, grandmasterx, etc.)
└── screenshots/      # UI screenshots
```

### Asset Loading
`TextureManager` loads PNG textures from `assets/textures/` (piece sprites and backgrounds per theme). `SpriteGen` provides fallback procedural piece generation. Textures follow the naming pattern: `{themeId}_{color}_{pieceType}.png`. Character portraits live in `assets/characters/`. Screenshots in `assets/screenshots/`.

### Audio
`AudioManager` uses Web Audio API for procedurally generated sound effects and music (no audio files needed).

### Characters
`src/characters/characters.js` defines story mode opponents with personality dialogue, colors, and AI difficulty mapping. `CharacterManager` handles dialogue state.

### Screens (`src/screens/`)
`HomeScreen.js`, `GameScreen.js`, `SettingsScreen.js`, `PauseMenu.js`, `ModeSelect.js`, `CharacterSelect.js`, `BotSelect.js`, `CustomGameScreen.js`, `StatsScreen.js`, `ThemeSelect.js`, `HowToPlay.js`, `MiniGamePractice.js` — full menu and gameplay UI.
