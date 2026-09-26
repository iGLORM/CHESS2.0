# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies (Electron, @chenglou/pretext)
npm start            # Launch the game (runs `electron .`)
npm test             # Engine + Chess 2.0 rule tests (node --test, no dependencies)
CHESS2_HEADLESS=1 npx electron . --remote-debugging-port=9333   # Hidden window for automated checks
```

No linter or build step is configured. The app runs directly from source via Electron.
All local scripts in `src/index.html` share one cache-busting tag (`?v=NN`); bump it when deploying
so the Telegram web version never mixes old and new files.

### Dependencies
- **Electron** — app shell
- **@chenglou/pretext** — accurate text measurement for Canvas 2D (loaded as ES module in `index.html`)

## Architecture

This is a pixel-art chess game built with **Electron + PixiJS v8 + vanilla JavaScript**. No frameworks or bundlers. All scripts load via `<script>` tags in `src/index.html`.

### Process Model
- `main.js` — Electron main process (window creation, IPC for fullscreen toggle)
- `preload.js` — Secure bridge exposing `window.electron` API
- `src/index.html` — Loads all JS modules via `<script>` tags (no module bundler)
- `src/main.js` — Game bootstrap: canvas setup, game loop (`requestAnimationFrame`), screen router with fade transitions

### Rendering — Hybrid Model (Migration In Progress)

The game is **migrating from Canvas 2D to PixiJS v8**. Currently a hybrid:

- **PixiJS screens** (`isPixiScreen: true`): `HomeScreen`, `HowToPlay` — build a PIXI.Container scene graph in `init()`, no `render(ctx)` method. PixiJS auto-renders via its own ticker.
- **Canvas 2D screens**: All other screens — render via `ctx` calls each frame in `render(ctx, dt)`.
- **Hybrid screen**: `GameScreen` — board/pieces render via PixiJS (`PixiGameScreen`), side panels/status bar render via Canvas 2D overlay.

Canvas 2D buttons now use "Pixelify Sans" font (via UIHelpers update) for visual consistency with PixiJS screens.

Three canvases exist stacked by z-index:
- `pixiCanvas` (z-index 1) — PixiJS WebGL/WebGPU renderer, 1280×800 virtual resolution
- `gameCanvas` (z-index 2) — Canvas 2D overlay for non-migrated screens. `pointer-events: none` when a PixiJS screen is active.
- `miniGameOverlay` (z-index 100) — Canvas 2D for minigames, shown/hidden via CSS class.

### PixiJS v8 API Conventions
- **Graphics**: shape-then-fill pattern: `g.rect(x,y,w,h).fill(color)`, NOT `beginFill/endFill`
- **Text**: options-object constructor: `new PIXI.Text({ text, style })`, NOT positional args
- **Scale modes**: string values `'nearest'`, `'linear'`, NOT `PIXI.SCALE_MODES.NEAREST`
- **Events**: `eventMode = 'static'`, NOT `interactive = true`
- **Application**: async init: `await app.init(options)`, NOT `new Application(options)`
- **Textures**: `PIXI.Texture.from({ resource: canvas, scaleMode: 'nearest' })`
- **Gradients**: use `new PIXI.FillGradient({ type, start, end, colorStops })` for GPU-native gradients

### Fonts
- **Titles**: `"Silkscreen", monospace` — pixel display font (loaded from Google Fonts CDN)
- **Body/UI**: `"Pixelify Sans", sans-serif` — readable pixel font for buttons, labels, body text
- Font constants in `PixiTextStyles.FONT_TITLE` and `PixiTextStyles.FONT_BODY`

### Screen System
Screens are plain objects with `init(data)`, `render(ctx, dt)`, `handleClick(x, y)`, `handleKeyDown(e)`, and optional `destroy()` methods. Registered in `src/main.js` via `registerScreen(name, impl)`.

**PixiJS screens** additionally have:
- `isPixiScreen: true` — tells the game loop to skip Canvas 2D rendering and enable PixiJS pointer events
- `pixiContainer` — root PIXI.Container added to `PixiScreenManager.screenContainer`
- `pixiUpdate(dt)` — optional per-frame updates (called by game loop instead of `render`)
- Must call `PixiScreenManager.setScreenContainer(this.pixiContainer)` in `init()`
- Must call `PixiBackgroundRenderer.destroy()` and `PixiScreenManager.setScreenContainer(null)` in `destroy()`

Screen transitions use fade-to-black via Canvas 2D or PixiScreenManager's GSAP-animated overlay. `switchScreen(name, data)` triggers navigation.

### PixiJS UI Component Library (`src/pixi/ui/`)

Reusable PixiJS v8 components replacing the Canvas 2D `UIHelpers.js`:

| Component | File | Replaces |
|-----------|------|----------|
| `PixiPanel` | Panel/Card container with borders, shadows, bevels | `UIHelpers.drawPanel/drawCard` |
| `PixiButton` | Interactive button with hover/press states, GSAP animation | `UIHelpers.drawButton` |
| `PixiSlider` | Draggable slider with FillGradient, configurable min/max/step | 4 separate slider impls |
| `PixiToggle` | On/off toggle switch | `UIHelpers.drawToggle` |
| `PixiIcon` | Pre-rendered pixel-art icons (20+ types) cached as textures | `UIHelpers.drawIcon` |
| `PixiProgressBar` | Fill bar with endcaps and highlight | `UIHelpers.drawProgressBar` |
| `PixiSeparator` | Line with diamond ornament | `UIHelpers.drawSeparator` |
| `PixiScrollableList` | Masked scrollable container with drag/wheel support | Manual scroll code |
| `PixiDitheredRect` | Checkerboard pattern via TilingSprite | `UIHelpers.drawDitheredRect` |
| `PixiColorUtil` | Hex-to-number conversion, lighten/darken, alpha utilities | `UIHelpers.alpha/lighten/darken` |
| `PixiTextStyles` | Standard font definitions (TITLE, BODY, LABEL, BUTTON, etc.) | Inconsistent font calls |
| `PixiUI` | Barrel file exposing all components as `PixiUI.*` | — |

### PixiJS Rendering (`src/pixi/`)

| File | Purpose |
|------|---------|
| `PixiApp.js` | Application singleton, async init, stage access |
| `PixiScreenManager.js` | Screen container management, GSAP fade transitions |
| `PixiBoardRenderer.js` | Chess board: frame, squares (single Graphics), coordinate labels, selection/legal-move highlights |
| `PixiPieceRenderer.js` | Piece sprite creation from textures or SpriteGen fallback |
| `PixiBackgroundRenderer.js` | Animated theme backgrounds with heavy effects: parallax fog layers, theme-specific particles (medieval embers, egypt sand, steampunk steam, space shooting stars, etc.), pulsing glow sources, vignette. All themes use doubled particle counts. |
| `PixiBackgroundScene.js` | Gentle motion in the painted backgrounds: swaying trees, drifting clouds/sand, turning gears, flickering lights (layers), and displacement ripples on regions of the hand-painted scenes. Driven by `src/themes/BackgroundScenes.js` |
| `PixiTitleLogo.js` | Home screen title: code-drawn "CHESS 2.0" wordmark coloured by the theme, animated shine and crown |
| `PixiGameScreen.js` | Orchestrates board + pieces + particles for GameScreen, tracks board state changes |
| `PixiAnimator.js` | GSAP-powered move/capture/shake/flash animations |
| `PixiParticleFX.js` | Capture/move particle effects |

### Canvas 2D Rendering (`src/rendering/`) — Legacy, being replaced
`BoardRenderer.js`, `PieceRenderer.js`, `TextureManager.js`, `Animator.js`, `ParticleFX.js`, `BackgroundRenderer.js`, `SpriteGen.js`, `UIHelpers.js`. Still used by non-migrated screens and GameScreen side panels.

#### TextFit Utility
`src/rendering/TextFit.js` — Powered by `@chenglou/pretext`, provides accurate text measurement and auto-fitting for Canvas 2D:
- `TextFit.measure()` — precise text dimensions
- `TextFit.fitFontSize()` — find largest font size that fits a given width/height
- `TextFit.drawFitted()` — measure and draw text fitted to a bounding box
- `TextFit.scaleToFit()` — scale text to fit within constraints

### State Management
`src/state/Store.js` — A singleton `store` with `get(key)`, `set(key, value)`, `update({})`, and `on(key, fn)` for reactive listeners. Persists progress to `localStorage` under key `chess2_progress`.

### Chess Engine (`src/engine/`)

| File | Purpose |
|------|---------|
| `Board.js` | 8×8 grid, piece objects `{type, color}`, castling rights, en passant |
| `FEN.js` | FEN notation parsing and serialization |
| `MoveGen.js` | Pseudo-legal move generation for all piece types |
| `LegalFilter.js` | Filters moves that leave king in check |
| `GameRules.js` | Check/checkmate/stalemate/draw detection |
| `MoveExecutor.js` | Applies moves, handles castling/en passant/promotion |
| `ai/AIController.js` | 13 levels, all played by the bundled Stockfish: 0–5 make human-sized mistakes (MultiPV + weighted pick), 6–12 use Stockfish's skill level |
| `ai/BotPersonality.js` | Runs Stockfish in a Web Worker over UCI (best move, human-style move, analysis); passes `searchmoves` when tiles are locked |
| `ai/StockfishCoach.js` | Move-quality rating and puzzle hints on top of Stockfish analysis |
| `stockfish/` | Unmodified Stockfish.js 18 (GPLv3); see its README for licence duties |

### Input (`src/input/`)
`InputManager.js`, `Keybindings.js` — keyboard and control handling.

### Minigame System
18 minigames, all Three.js, one file each in `src/minigames3d/`. Class names keep the old 2D names so
settings keys still match (e.g. `ReactionTest` is "Quick Draw", `BarBalance` is "Tightrope");
`MiniGameManager.GAMES_3D()` is the list. `MiniGameManager` (in `src/minigames/`, with `MiniGameUtils`)
runs them on the overlay canvas. Without WebGL, captures skip the challenge.
- `src/minigames3d/Mini3D.js` — one shared WebGLRenderer (never create another), a low-res render target
  plus a retro post shader (tone map, chromatic split, scanlines, flash), blitted into the 2D overlay with
  nearest scaling. Also `Pieces3D` (low-poly lathe chess pieces, coloured by sampling the active theme's
  piece sprites via `Mini3D.themePalette`; games build the player with `playerPiece()`, which is the
  captured piece plus a green ring), `Burst3D` (instanced debris), `Sfx3D`, and
  the `Game3D` base class (HUD helpers, pointer/key state, `bot(dt)` steering, `timeLimit`, `cleanup`).
- 3D games get pointer down/move/up and keyup via `miniGameManager.handlePointer/handleKeyUp`.
- Three.js is vendored in `src/vendor/three/three.min.js` as a classic script exposing `window.THREE`
  (built from `three/build/three.module.js` with esbuild `--format=iife --global-name=THREE`).
- Practice/Custom Game thumbnails for 3D games are rendered live by `Mini3D.thumbnail`.

### Theme System
`src/themes/themes.js` defines one theme per story world (ids = world ids: pawnhollow, trainingcamp,
slantedsands, ironkeep, mistymoors, royalpalace, clockworkcitadel, grandlibrary, forkedgulch,
obsidiancourt; Soulbound Pixel keeps `crystal`) plus `custom`. `THEME_ALIASES` maps the old theme ids
(space, medieval, ocean...) to worlds for old saves. `ThemeManager` resolves colours and unlocks: a
world's theme and song unlock when that world is restored in any save slot (`store.unlockedThemes`
keeps what old saves had). Themes affect board, pieces, UI panels, text, particles, backgrounds and music.
Every theme except `custom` has a painted background, a painted board and its own piece set:
- Hand-painted backgrounds: trainingcamp (dojo), forkedgulch (wild west), crystal. The other eight
  scenes, their animated layers and `src/themes/BackgroundScenes.js` come from `scripts/generate_backgrounds.py`.
- Piece sets are repainted from the Crystal master set, boards are painted, and the Theme Select
  cards/backdrops (`premium_theme_*`, `premium_bg_*`) are rendered by `scripts/generate_theme_art.py`
  (materials per world are defined there; the crystal board is never regenerated).
- Both scripts need Pillow (`pip install pillow`). Re-run them after changing theme colours.

### Asset Structure
```
assets/
├── textures/
│   ├── backgrounds/   # {themeId}_bg.* plus animated layers {themeId}_{layer}.png
│   ├── pieces/        # Per-theme piece sprites: {themeId}_{color}_{pieceType}.png
│   ├── boards/        # Whole-board textures: {themeId}_board.png
│   └── title_logo_*.png         # Old painted title logos (no longer used by HomeScreen)
├── characters/        # Character portraits for story mode
├── screenshots/       # UI screenshots for README
└── logo.png           # App icon
```

**Title logo**: drawn in code by `src/pixi/PixiTitleLogo.js` (pixel wordmark with 3D edge, pixel crown, shine sweep, subtitle), coloured from the active theme's `text` and `accent`.
**App icons** (`icon.png`, `icon_512.png`, `icon_1024.png`, `icon.ico`) are rendered from the same code by `npx electron scripts/render-icons.js`; re-run it after changing `PixiTitleLogo.ICON` (`ICON.VARIANT` picks the design; the current one is `rook2`, a pixel rook shaped like a "2" with a small ".0").

### Audio
Everything is synthesised with Web Audio (no audio files):
- `src/audio/Synth.js` — instruments (pad, pluck, bell, bass, lead, flute, brass, choir) and drums, each a function scheduling its own nodes
- `src/audio/Songs.js` — one song per theme (key, tempo, chord progression, sections, voices) plus a tense variant used while a king is in check
- `src/audio/MusicPlayer.js` — sequencer; writes each section's melody from a motif and schedules bars ahead. Works with an `OfflineAudioContext`, so songs can be rendered to a file for checking
- `AudioManager` — public API (`startMusic`, `setSuspense`, `play*` effects, volumes); master limiter and a small reverb on effects

### Characters and Story Mode
`src/characters/characters.js` defines story mode opponents with personality dialogue, colors, and AI difficulty mapping. `CharacterManager` handles dialogue state.
- Story has 15 stages (`STORY_STAGES` in `src/characters/trainers.js`): Pawnie, five holographic trainers (the Training Camp), then nine guardians. Save fields `storyLevel`/`maxUnlockedLevel` count stages; `Store.migrateSave` moves old 10-level saves over (level n > 1 becomes stage n + 5). A character's `level` is only its AI difficulty index.
- `src/characters/worlds.js` lists the eleven worlds (name, art theme, stages, map position) and sets each character's fight theme; `StoryProgress` answers beaten/unlocked/fragments. `src/screens/WorldMapScreen.js` is the story map (after the save-slot screen): pick a stage, fight; a first win sets `storyMapEvent` so the map plays the restore wave, fragment and king's travel.
- The story (a mystery: you wake in Pawn Hollow with no memory; you were crossing the Great Board when Grandmaster X broke it) is scripted in `src/characters/story.js` and played by `src/screens/StoryScene.js` (prologue, handover, an interlude after each guardian, the ending into the Credits). `GameScreen._walkOn` makes the opponent walk onto the board before a fight.
- Each guardian world has five missions (`src/characters/missions.js`: puzzle, challenges, hunt, rule taster, wild card) on its own path, `src/screens/WorldMissionsScreen.js`; the guardian unlocks after all five (`save.missions[worldId]` counts cleared). Minion portraits come from `src/pixi/PixiMinion.js`; fragments are drawn by `src/pixi/PixiShard.js`. `tests/missions.test.js` checks every mission position with the engine.
- Every stage's twist or test lives in `src/engine/BossRules.js` (start positions, challenge chances, walls, fog, double take, clock, rewinds, puzzles, capture goals, minigame trial). `GameScreen` calls it; `src/pixi/PixiBossFX.js` draws it; the trainers' hologram portraits are PNGs drawn by `node scripts/generate_trainer_art.js`.

### Screens (`src/screens/`)

| Screen | Rendering | Status |
|--------|-----------|--------|
| `HomeScreen.js` | PixiJS | Migrated — animated title, rounded buttons, particles |
| `HowToPlay.js` | PixiJS | Migrated — panels, icons, text, back button |
| `GameScreen.js` | Hybrid | Board via PixiJS, side panels/status bar via Canvas 2D |
| All others | Canvas 2D | Not yet migrated |

## Telegram Mini App

The game runs as a **Telegram Mini App** at `https://game.altobolt.com` via bot `@iglorm_chess_bot`.

### How It Works
The **same `src/index.html`** serves both Electron and Telegram — no separate web version. Telegram-specific code auto-detects its environment:
- `src/telegram/telegram-compat.js` — Telegram SDK init, back button, haptic feedback. All behind `if (window.Telegram)` guards — completely inert in Electron.
- The Telegram Web App SDK (`telegram.org/js/telegram-web-app.js`) is loaded in `index.html` but is a no-op outside Telegram's webview.
- `src/vendor/pretext/` — vendored copy of `@chenglou/pretext` dist so the ES module import works on both Electron (file paths) and web (HTTP paths).

### Deployment
The VPS is only accessible from the main dev PC (SSH alias `vps`). `deploy.sh` (local-only, gitignored) syncs files:
```bash
scp -r src assets vps:/var/www/chess2/
ssh vps "sudo chmod -R o+rX /var/www/chess2/"
```

### Keeping In Sync
Any change to `src/` or `assets/` automatically works on Telegram after redeploying. When adding new screens, scripts, or assets:
1. Add `<script>` tags to `src/index.html` as usual — works for both Electron and web
2. Redeploy to VPS after changes
3. No separate files to maintain — the codebase is the deployment

### Infrastructure
- **Hosting**: nginx on VPS, root at `/var/www/chess2/src`, assets aliased from `/var/www/chess2/assets/`
- **SSL**: Let's Encrypt (auto-renewing via certbot)
- **Domain**: `game.altobolt.com` (A record → VPS IP)
- **Bot**: `@iglorm_chess_bot` — menu button launches the Mini App

## Migration Status

The game is migrating from Canvas 2D to PixiJS v8. Progress:
- **Phase 0 (Cleanup)**: Done — removed bloat (assets/dropbox, assets/generated, dist/), optimized ocean_bg.png, fixed dead code
- **Phase 1 (UI Components)**: Done — 12 PixiJS UI components built in `src/pixi/ui/`
- **Phase 2 (Screen Migration)**: In progress — HomeScreen and HowToPlay migrated, rest pending
- **Phase 3 (Screen Polish)**: In progress — MiniGamePractice, CharacterSelect, and other Canvas 2D screens improved with grouping panels, better card styling, and proper hitbox sync. Still render via Canvas 2D but with significantly better visual quality.
- **Phase 4 (Mini-games to PixiJS)**: Pending
- **Phase 5 (Canvas consolidation)**: Pending

## UI/UX Guidelines

When working on UI changes:
- **Take screenshots** after changes to verify visual quality — don't report success without visual confirmation
- **Use the PixiJS v8 API** for new/migrated screens (shape-then-fill Graphics, options-object Text, FillGradient)
- **Use PixiTextStyles.FONT_TITLE / FONT_BODY** for consistent typography
- **Use PixiUI components** (PixiButton, PixiPanel, PixiSlider, etc.) rather than raw Graphics for UI elements
- **Proper padding math**: use named constants for layout (see HomeScreen.LAYOUT pattern), not magic numbers
- **Buttons**: use roundRect with semi-transparent fills, accent borders on hover, GSAP scale animation on press
- **Panels**: semi-transparent backgrounds with subtle borders, rounded corners (6-8px radius)
- **Text**: Pixelify Sans for body (18-22px), Silkscreen for titles (24-42px). Never use raw 'monospace'.
- **Colors**: use theme `cols` object for all colors. Use `PixiColorUtil.hexToNum()` for PixiJS numeric colors.
- **Cleanup**: always call `PixiBackgroundRenderer.destroy()` in screen `destroy()` methods to prevent ticker leaks
- **Changes will be incremental** — one screen at a time, verify each before moving to the next

### Dev Screenshot System
- Create a `.screenshot-trigger` file in the project root and Electron will capture the window and save `dev-screenshot.png`
- Press **F5** in the running app to capture a screenshot immediately
- Both `.screenshot-trigger` and `dev-screenshot.png` are in `.gitignore`
- Used by Claude Code for visual verification during development

### Dev Automated Testing (CDP)
Launch the app with `npx electron . --remote-debugging-port=9333` to enable programmatic testing via Chrome DevTools Protocol. The `dev/` folder (gitignored) contains reusable testing tools.

**Quick test commands:**
```bash
# Launch with debugging
npx electron . --remote-debugging-port=9333

# Run a single JS expression in the game
node dev/cdp.js "store.get('screen')"
node dev/cdp.js "GameScreen.characterLevel"

# Run predefined test scenarios
node dev/test-game.js state          # Show current game state
node dev/test-game.js story-setup    # Start story mode vs Pawnie
node dev/test-game.js move-e4        # Execute e2-e4
node dev/test-game.js move-random    # Execute a random legal move
node dev/test-game.js difficulty     # Print AI difficulty table for all tiers
node dev/test-game.js dialogue       # Test dialogue bubble triggers
node dev/test-game.js navigate home  # Navigate to a screen
node dev/test-game.js all            # Run all verification tests

# With options
node dev/test-game.js story-setup beginner pawnie     # tier + boss
node dev/test-game.js story-setup rookie grandmasterx # any combo
```

**Using `dev/cdp.js` as a module (for custom test scripts):**
```js
const cdp = require('./dev/cdp');
const result = await cdp.eval('GameScreen.mode');
```

**Notes:**
- Uses raw TCP WebSocket (no npm dependencies needed)
- Port 9222 is often busy; 9333 is the default
- `dev/` and `_test_*` files are gitignored
- Combine with `.screenshot-trigger` for visual verification after programmatic actions
