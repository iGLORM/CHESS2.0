# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies (Electron, @chenglou/pretext)
npm start            # Launch the game (runs `electron .`)
npx electron .       # Alternative launch command
```

No test framework, linter, or build step is configured. The app runs directly from source via Electron.

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
| `ai/Search.js` | Alpha-beta pruning with iterative deepening |
| `ai/Evaluate.js` | Material + piece-square table evaluation |
| `ai/CloudEval.js` | Cloud-based move evaluation |
| `ai/AIController.js` | 10 difficulty levels (depth 1–5, with noise for lower levels) |

### Input (`src/input/`)
`InputManager.js`, `Keybindings.js` — keyboard and control handling.

### Minigame System
16 minigames in `src/minigames/`. `MiniGameManager` selects and runs them on the overlay canvas (30% chance on piece capture). All minigames use Canvas 2D rendering.

### Theme System
`src/themes/themes.js` defines theme color palettes. `ThemeManager` resolves current colors. Themes affect board, pieces, UI panels, text, particles, and backgrounds. Background textures exist for: ocean, japanese, crystal, wildwest. Other themes use procedural gradient backgrounds with animated particles.

### Asset Structure
```
assets/
├── textures/
│   ├── backgrounds/   # Theme backgrounds (ocean_bg.png, japanese_bg.png, crystal_bg.png, wildwest_bg.webp)
│   ├── pieces/        # Per-theme piece sprites: {themeId}_{color}_{pieceType}.png
│   ├── boards/        # Board square textures
│   ├── title_logo_original.png  # Default logo (golden, neutral)
│   ├── title_logo_magma.png     # Warm themes (medieval, egypt, wildwest, steampunk, prehistoric)
│   └── title_logo_ice.png       # Cool themes (ocean, crystal)
├── characters/        # Character portraits for story mode
├── screenshots/       # UI screenshots for README
└── logo.png           # App icon
```

**Title logo variants**: HomeScreen selects the appropriate logo variant via `_getLogoVariant(themeId)` based on the active theme's color temperature.

### Audio
`AudioManager` uses Web Audio API for procedurally generated sound effects and music (no audio files needed).

### Characters
`src/characters/characters.js` defines story mode opponents with personality dialogue, colors, and AI difficulty mapping. `CharacterManager` handles dialogue state.

### Screens (`src/screens/`)

| Screen | Rendering | Status |
|--------|-----------|--------|
| `HomeScreen.js` | PixiJS | Migrated — animated title, rounded buttons, particles |
| `HowToPlay.js` | PixiJS | Migrated — panels, icons, text, back button |
| `GameScreen.js` | Hybrid | Board via PixiJS, side panels/status bar via Canvas 2D |
| All others | Canvas 2D | Not yet migrated |

## Migration Status

The game is migrating from Canvas 2D to PixiJS v8. Progress:
- **Phase 0 (Cleanup)**: Done — removed bloat (assets/dropbox, assets/generated, dist/), optimized ocean_bg.png, fixed dead code
- **Phase 1 (UI Components)**: Done — 12 PixiJS UI components built in `src/pixi/ui/`
- **Phase 2 (Screen Migration)**: In progress — HomeScreen and HowToPlay migrated, rest pending
- **Phase 3 (Mini-games)**: Pending
- **Phase 4 (Canvas consolidation)**: Pending

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
