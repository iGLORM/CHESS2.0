# AGENTS.md

Guidance for every AI agent working on this repository (Codex reads this file; Claude Code
reads it through `CLAUDE.md`). It is the single source of truth: when the architecture
changes, update this file, not a copy.

## Commands

```bash
npm install          # Install dependencies (Electron, @chenglou/pretext)
npm start            # Launch the game (runs `electron .`)
npm test             # Engine + Chess 2.0 rule tests (node --test, no dependencies)
CHESS2_HEADLESS=1 npx electron . --remote-debugging-port=9333   # Hidden window for automated checks
CHESS2_HEADLESS=1 CHESS2_USER_DATA=/tmp/x npx electron . --remote-debugging-port=9335   # Same, with its own saves
```
`CHESS2_USER_DATA` gives a test copy its own user-data folder (its own `localStorage`), so automated play never
touches the owner's save and several copies can run at once on different ports.

No linter or build step is configured. The app runs directly from source via Electron.
All local scripts in `src/index.html` share one cache-busting tag (`?v=NN`); bump it when deploying
so the web version never mixes old and new files.

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

The game has **mostly migrated from Canvas 2D to PixiJS v8**:

- **PixiJS screens** (`isPixiScreen: true`): every screen in `src/screens/` except `GameScreen` and `PauseMenu` — build a PIXI.Container scene graph in `init()`, no `render(ctx)` method. PixiJS auto-renders via its own ticker.
- **Hybrid screen**: `GameScreen` — board, pieces and HUD (`PixiGameHud`, `PixiGameOverOverlay`) are PixiJS; it still has a `render(ctx)` for the Canvas 2D overlay. `PauseMenu` is drawn over it.
- The Canvas 2D layer remains for the mini-games overlay and a few legacy helpers.

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

### Large screens split into mixins
`GameScreen` and `WorldMapScreen` are big, so some of their parts live in mixin files loaded right after them in
`index.html`, which `Object.assign` their methods onto the screen (`this` is the screen):
- `src/screens/game/GameStoryTools.js`: story items, keepsake powers, boss twists and the Training Camp tests.
- `src/screens/worldmap/WorldMapFlight.js`: flying the plane by hand, the fly zone, Pawnie's plane gift.
Add new code for those areas there, and new big areas as new mixins rather than growing the screen files.

### Screen System
Screens are plain objects with `init(data)`, `render(ctx, dt)`, `handleClick(x, y)`, `handleKeyDown(e)`, and optional `destroy()` methods. Registered in `src/main.js` via `registerScreen(name, impl)`.

**PixiJS screens** additionally have:
- `isPixiScreen: true` — tells the game loop to skip Canvas 2D rendering and enable PixiJS pointer events
- `pixiContainer` — root PIXI.Container added to `PixiScreenManager.screenContainer`
- `pixiUpdate(dt)` — optional per-frame updates (called by game loop instead of `render`)
- Must call `PixiScreenManager.setScreenContainer(this.pixiContainer)` in `init()`
- Must call `PixiBackgroundRenderer.destroy()` and `PixiScreenManager.setScreenContainer(null)` in `destroy()`

**Menu structure:** Home shows three mode tiles (Story, Play, Training) plus Settings / How to Play / Stats.
Play holds Classic, Local 1v1 and Custom; Training holds the puzzle course, mini-game practice and the board
editor. Menu tiles and panels come from `PixiPremiumScene` (`tile`, `panel` with stepped pixel corners; tiles, buttons and cards are see-through by `SEE_THROUGH` so the live scene shows,
`pieceArt` for theme-piece artwork, `focusRing` for arrow-key focus). Screens with categories (Settings,
How to Play) use `tabLayout()` + `tabStrip()`: tiles down the left, a content panel on the right (a row of
tiles on top in portrait). `buttonHeight(h)` is the height `button()` really draws (taller on phones).
Settings has four tabs (Display, Graphics, Audio, Game) of option rows (choice, toggle, slider, link) with a
description strip; Credits is a scrolling roll (cast from `STORY_STAGES`, licence lines must stay).

**Training puzzles** (`src/data/TrainingLevels.js`): each level's line is `[solution.primary, ...continuation]`
(player, reply, player, ...; it must end on the player's move). The last move also accepts any checkmate,
and `PuzzleScreen` asks Stockfish whether an unlisted move wins as well as the intended one (accepted only
when both win by 300cp+). `tests/training.test.js` checks every line with the engine; verify new positions
with Stockfish before adding them. Board editor positions are played out against Stockfish in `PuzzleScreen`.

Screen transitions use fade-to-black via Canvas 2D or PixiScreenManager's GSAP-animated overlay. `switchScreen(name, data)` triggers navigation;
`switchScreen(name, data, { instant: true })` skips the fade when the screen has drawn its own transition (the world map opening a place map).

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
| `PixiBoardRenderer.js` | Chess board: frame, painted squares (calmed by each square's own average colour at `CALM` alpha so the speckle never fights the pieces), coordinate labels, selection/legal-move highlights |
| `PixiPieceRenderer.js` | Piece sprite creation from textures or SpriteGen fallback |
| `PixiBackgroundRenderer.js` | Animated theme backgrounds with heavy effects: parallax fog layers, theme-specific particles (medieval embers, egypt sand, steampunk steam, space shooting stars, etc.), pulsing glow sources, vignette. All themes use doubled particle counts. |
| `PixiBackgroundScene.js` | Gentle motion in the painted backgrounds: swaying trees, drifting clouds/sand, turning gears, flickering lights (layers), and displacement ripples on regions of the hand-painted scenes. Driven by `src/themes/BackgroundScenes.js`. Themes with a live scene (`src/themes/scenes/`) are drawn by `LiveScenes` instead |
| `PixiTitleLogo.js` | Home screen title: code-drawn "CHESS 2.0" wordmark coloured by the theme, animated shine and crown |
| `PixiGameScreen.js` | Orchestrates board + pieces + particles for GameScreen, tracks board state changes |
| `PixiGameHud.js` | Fight screen HUD: player panels (captured pieces as the theme's piece sprites, material), move list, the off-story game panel (opponent, balance bar, last move), the story opponent's stage, tools and status bar |
| `PixiGameOverOverlay.js` | Result card: the menus' stepped panel over the dimmed board, crown and title pop-in, coins counting up, story stars, the opponent's last line, `PixiPremiumScene.button`s (`buttonRects` route Canvas clicks) |
| `PixiAnimator.js` | GSAP-powered move/capture/shake/flash animations |
| `PixiParticleFX.js` | Capture/move particle effects |
| `PixiToolIcons.js` | 16x16 pixel icons drawn in code for the fight screen's buttons (rewind, hint, remove, back, forward, live, undo, flip) |

### Canvas 2D Rendering (`src/rendering/`) — Legacy, being replaced
`BoardRenderer.js`, `PieceRenderer.js`, `TextureManager.js`, `Animator.js`, `ParticleFX.js`, `BackgroundRenderer.js`, `SpriteGen.js`, `UIHelpers.js`. Still used by non-migrated screens and GameScreen side panels.

#### TextFit Utility
`src/rendering/TextFit.js` — Powered by `@chenglou/pretext`, provides accurate text measurement and auto-fitting for Canvas 2D:
- `TextFit.measure()` — precise text dimensions
- `TextFit.fitFontSize()` — find largest font size that fits a given width/height
- `TextFit.drawFitted()` — measure and draw text fitted to a bounding box
- `TextFit.scaleToFit()` — scale text to fit within constraints

### Languages
`src/i18n/I18n.js` translates at draw time; tables live in `src/i18n/lang/<id>/` (English plus `fr`, `es`, `pt`,
`it`, `de`). Give new English text its translations in those five. Russian and Naš jezik were dropped
(2026-10-03): do not add them back. `node scripts/i18n.js stats|missing <lang>` checks coverage;
`scripts/i18n-check.mjs` checks layouts per language on a test copy.

### State Management
`src/state/Store.js` — A singleton `store` with `get(key)`, `set(key, value)`, `update({})`, and `on(key, fn)` for reactive listeners. Persists progress to `localStorage` under key `chess2_progress`.

`src/state/SuperUser.js` — a cheat for testing: T ten times toggles Super User (`store.superUser`), which shows
everything as unlocked without touching real progress. While it is on, W three times wins whatever is being
played: the mini-game on screen (`Game3D.win()`), else the current screen's `superWin()` (`GameScreen`: any
match, trainer test or mission, status `superuser`; `PuzzleScreen`: puzzle or board-editor game).

`src/state/Graphics.js` — the Display/Graphics options (saved in `settings.graphics`): resolution (caps
`Layout.renderScale`; below native the canvases are smoothed up, and in a desktop window it also sizes the
window through `window.electron.setWindowSize`), frame limit (30 to 165 or unlimited; `Graphics.pacer()` paces the main loop, which also drives the stopped Pixi ticker, and the mini-game loop; Electron runs with `disable-frame-rate-limit`/`disable-gpu-vsync` so it can pass the screen's refresh rate), brightness, FPS
counter, and a quality preset (Low/Medium/High/Ultra) that sets background motion (`LiveScenes` frame rate,
characters always move), particles and 3D mini-game quality (`Mini3D.PIXEL`, shadows); plus retro filter and
screen shake. Code reads `Graphics.fpsCap()`, `sceneRate()`, `particles()`, `mini3d()`, `retro()`, `shake()`;
defaults reproduce the old fixed behaviour. `tests/graphics.test.js` covers presets and steps.

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
- `src/minigames3d/Mini3D.js` — one shared WebGLRenderer (never create another), a render target at the
  screen's own pixels (`Mini3D.PIXEL` = screen pixels per rendered pixel: 1.33 at Medium, 1 at High (the default), 0.75
  supersampled at Ultra; capped at `MAX_SIDE`; the High preset uses High) plus a post shader (tone map, light sharpen, a dark outline
  about 2.5 game units thick at silhouettes found from the depth buffer, chromatic split, scanlines, flash),
  drawn into the 2D overlay without blowing it up, so the games stay crisp. The owner did not want the
  chunky pixelated, dithered look (tried and reverted 2026-10-03): keep them sharp, with outlines.
  Every game keeps its own look but in the colours of the world you are in: `Mini3D.worldTint` moves hue and
  saturation (not lightness) toward the theme's squares/accent by `WORLD_TINT`, applied to `checkerTexture`
  floors and, after `setup()`, to the sky, fog and lights (`Mini3D.tintScene`). Also `Pieces3D` (low-poly lathe chess pieces, coloured by sampling the active theme's
  piece sprites via `Mini3D.themePalette`; games build the player with `playerPiece()`, which is the
  captured piece plus a green ring), `Burst3D` (instanced debris), `Sfx3D`, and
  the `Game3D` base class (HUD helpers, pointer/key state, `bot(dt)` steering, `timeLimit`, `cleanup`).
- 3D games get pointer down/move/up and keyup via `miniGameManager.handlePointer/handleKeyUp`.
- Three.js is vendored in `src/vendor/three/three.min.js` as a classic script exposing `window.THREE`
  (built from `three/build/three.module.js` with esbuild `--format=iife --global-name=THREE`).
- Practice/Custom Game thumbnails for 3D games are rendered live by `Mini3D.thumbnail`.

### Theme System
`chess20` ("Chess 2.0", first in `THEMES`, always unlocked) is the game's own theme and the default for a
new player (`Store` state `theme`; existing saves keep theirs): live scene `scenes/chess20.js` (the Great
Board at dusk, the golden queen of the app icon and a violet king as monuments, magenta/cyan rifts), its own
song, and board, pieces and Theme Select card from `node scripts/generate_chess20_art.js` (no Pillow).
Besides it, `src/themes/themes.js` defines one theme per story world (ids = world ids: pawnhollow, trainingcamp,
slantedsands, ironkeep, mistymoors, royalpalace, clockworkcitadel, grandlibrary, forkedgulch,
obsidiancourt; Soulbound Pixel keeps `crystal`), `greatboard` (the reward for finishing the story: live
scene `scenes/greatboard.js`, board and pieces from `node scripts/generate_greatboard_art.js`, which needs no
Pillow) and `custom`. `THEME_ALIASES` maps the old theme ids
(space, medieval, ocean...) to worlds for old saves. `ThemeManager` resolves colours and unlocks: a
world's theme and song unlock when that world is restored in any save slot (`store.unlockedThemes`
keeps what old saves had). Themes affect board, pieces, UI panels, text, particles, backgrounds and music.
**Story mode always shows the theme of the world you are in**; outside it, the player's own pick. `store.theme`
is the theme on screen, `store.menuTheme` the pick (Theme Select calls `ThemeManager.chooseTheme`). The screen
router calls `ThemeManager.syncForScreen(name)`: story screens (`STORY_SCREENS`, and `game` in story mode) set
their world with `useStoryTheme` (the world map: the world the king stands in, changing as he travels or flies),
Settings/Theme Select/Controls/Credits keep what is showing (the pause menu opens them mid-fight), every other
screen gets `useMenuTheme()`. The app opens on the pick. There is no "Boss World Theme" setting any more.
Every theme except `custom` has a painted background, a painted board and its own piece set:
- **Live scenes** (the art direction): every world's background is drawn entirely in code, every frame,
  by `src/themes/scenes/<themeId>.js` (320x200, scaled 4x with sharp pixels, a 120 s seamless loop).
  `src/themes/LiveScenes.js` runs one shared canvas per scene; `PixiBackgroundScene.build` uses it
  whenever a theme id has a live scene, so the game background, cutscenes and theme picker all get it.
  Shared drawing tools are in `src/themes/scenes/PixelKit.js`. `node scripts/live-scene.js check|still|sheet|bg <id>` (`--state '<json>'` passes scene state, e.g. the world map's `map`)
  checks and renders scenes without a browser (`bg` writes the theme's still `<id>_bg.png`);
  `scripts/scene-preview.html?scene=<id>` previews one live; `tests/livescenes.test.js` checks every scene.
  **Live characters:** a scene with id `char_<characterId>` (first: `char_pawnie.js`) replaces that
  character's portrait on the cutscene card, the game HUD face and the dialogue bubble, and has moods:
  story beats take a `mood` field, and in fights `DialogueManager` passes each line's category so
  `GameScreen._setCharacterMood` can ask the scene's `moodFor` (held 6 s, then back to the default).
  Every story character has one (plus `char_firstpiece` for the ending's speaker). Screens that show a
  character picture use `PixiPremiumAssets.characterSprite(id)` (the live face, else the still), and
  `node scripts/live-scene.js portrait char_<id>` writes the stills (`premium_character_<id>.png` and the face
  in `assets/textures/characters/`; `--no-face` for trainers, whose `characters/` PNG is the walk-on hologram).
  **How to make one:** `.claude/skills/pixel-scene/SKILL.md` (characters: its `references/characters.md`) (Claude Code loads it as a skill; Codex,
  read it directly), with recipes in its `references/techniques.md`.
- Older art, now superseded by the live scenes: the painted layers and `src/themes/BackgroundScenes.js`
  from `scripts/generate_backgrounds.py` (its `SCENES` list is empty so it can't overwrite the stills) and
  the hand-painted `forkedgulch_bg.webp`. `PixiBackgroundScene` still supports them for any theme without
  a live scene.
- **Extra backdrops** (`ThemeManager.EXTRA_BACKDROPS`): art that isn't a theme. `crystal_classic` is the
  original hand-painted Soulbound Pixel: the Grandmaster X fight shows it (`fightBackdrop` in `worlds.js`,
  `GameScreen._fightBackdrop`), and it becomes a Custom theme backdrop ("Old Soul") once a story save is
  finished. `PixiBackgroundRenderer.render(themeId, bgId)` takes colours from the theme and art from the
  backdrop; the Custom theme's chosen backdrop (`customBgTheme`) comes from `ThemeManager.backdropFor`.
- Piece sets are repainted from the Crystal master set (`generate_theme_art.py pieces [type]` redoes one type; the master king is topped with an orb and two crown points, never a cross), boards are painted, and the Theme Select
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
**App icons** (`icon.png`, `icon_512.png`, `icon_1024.png`, `icon.ico`) come from the live pixel scene `src/themes/scenes/app_icon.js` (128x128: a golden queen on a floating piece of the Great Board at dusk, "2.0" engraved on the board's edge; `opaque: false`, so its corners stay see-through): `node scripts/live-scene.js icon app_icon` writes them at 2x/4x/8x, with the small ICO sizes area-averaged. Re-run it after changing the scene. The scene is not loaded by `src/index.html`.

### Audio
Everything is synthesised with Web Audio (no audio files):
- `src/audio/Synth.js` — instruments (pad, pluck, bell, bass, lead, flute, brass, choir) and drums, each a function scheduling its own nodes
- `src/audio/Songs.js` — one song per theme (key, tempo, chord progression, sections, voices) plus a tense variant used while a king is in check, and `worldmap`, the world map's own song
- `audioManager.useSong(id)` makes a screen play its own song whatever the theme (the world map: `'worldmap'` in `init`, `null` in `destroy`); while it is set, a theme change only plays the theme's stinger
- `src/audio/MusicPlayer.js` — sequencer; writes each section's melody from a motif and schedules bars ahead. Works with an `OfflineAudioContext`, so songs can be rendered to a file for checking
- `AudioManager` — public API (`startMusic`, `setSuspense`, `play*` effects, volumes); master limiter and a small reverb on effects
- The theme song starts at boot: `main.js` sets Electron's `autoplay-policy` to `no-user-gesture-required`; browsers still wait for the first click or key (`src/main.js` resumes the context then).
- Leaving a match stops its music (`GameScreen.destroy`); `audioManager.resumeMusicLater()` brings the theme song back 5-10 s later, since menu screens don't start music themselves. Any `startMusic`/`stopMusic` cancels the pending restart

### Characters and Story Mode
`src/characters/characters.js` defines story mode opponents with personality dialogue, colors, and AI difficulty mapping. `CharacterManager` handles dialogue state.
- Story has 15 stages (`STORY_STAGES` in `src/characters/trainers.js`): Pawnie, five holographic trainers (the Training Camp), then nine guardians.
  Choosing a difficulty on a new save goes straight into the prologue and the Pawnie game (`CharacterSelect.chooseDifficulty`).
  The Camp's tests (`BossRules`): Sergeant Square, ten mate-in-one puzzles; Captain Capture, an endgame where you are
  ahead (`startFens`, checked with Stockfish); Joy Stick, every mini-game one by one (`minigameTrial.all`, two retries per
  game, progress kept in `save.lesson`, `GameScreen._runLesson`); the Rulekeeper, the Mystery Piece; Sensei Tactic, a full game. Save fields `storyLevel`/`maxUnlockedLevel` count stages; `Store.migrateSave` moves old 10-level saves over (level n > 1 becomes stage n + 5). A character's `level` is only its AI difficulty index.
- `src/characters/worlds.js` lists the eleven worlds (name, art theme, stages) and sets each character's fight theme; `StoryProgress` answers beaten/unlocked/fragments/roadBlock.
- **Fragments and keepsakes**: the Great Board broke into four fragments (`StoryProgress.FRAGMENT_STAGES`): yours
  (handed back after the Training Camp), the EndGamer's, Checkmate's and Grandmaster X's. The other guardians give a
  keepsake (`src/characters/keepsakes.js`: compass, iron key, lantern, signet, broken seal, map, wanted poster, hourglass;
  EndGamer and Checkmate give both). Art and the full-screen reveal are `src/pixi/PixiKeepsake.js`; the world map plays
  the reveal after a first win (`storyMapEvent.keepsake`) and shows them on its Keepsakes shelf and by each restored world.
  **Every keepsake does something** (`use` in keepsakes.js, shown on the reveal and when a shelf icon is tapped;
  `Keepsakes.has(id, save)`; `tests/keepsakes.test.js`): the **compass** charts the world map (before it, every land but
  the places reached and the road walked is an old sepia sketch, scene state `map.chart`; winning it sends a charting
  wave from the king, `WorldMapScreen._chartWave`, and markers in the fog appear as it passes; afterwards a needle by the
  king points to the next stop); the **iron key** opens the iron-bound chests on the map (`Keepsakes.CHESTS`, specials of
  type `chest`, once per save in `save.chests`, 40 coins and a star each); the **signet** takes a third off the story
  items in the Shop (`Wallet.price`, old price struck through); the **map** lifts the storm over Soulbound Pixel (scene
  state `map.veil`; the last leg of the route and its plate stay hidden until then); in story fights the **lantern**
  (his threats and your pieces in danger marked, fog gone for your turn), the **seal** (one of your pieces cannot be
  taken for three of his turns: a lock tile with `seal: true`) and the **hourglass** (a free rewind) work once per fight
  (`GameScreen.usePower`, `powers` kept outside the snapshots), and the **poster** tags one of his pieces `wanted`
  (`_placeBounty`): taking it pays 25 coins once.
- **Place maps**: entering a world zooms into its own animated map (`src/themes/scenes/map_<worldId>.js`, whose `stops`
  list where each stop stands; the map scene draws the trail and the guardian alive at the end), opened out of the landmark
  as a growing circle (`WorldMapScreen._irisInto`). `src/screens/WorldMissionsScreen.js` shows it with the world's stops:
  seven missions or a tournament, then the guardian; the Training Camp's five trainers; Pawnie. Each stop has lore
  (`src/characters/lore.js`, `PLACE_LORE`), shown on its panel and on a parchment card the first time (`save.loreSeen`).
  Lessons won and games lost return to the place map. `src/screens/WorldMapScreen.js` is the story map (after the save-slot screen): the live scene `src/themes/scenes/worldmap.js` ("The Shattered Earth", 640x320 shown at 4x, dragged in both directions), an Earth split into the worlds' regions by glowing rifts; each world's landmark stands where it belongs (`places` in that file: Pawn Hollow in Japan, Slanted Sands in Egypt, the Royal Palace in Algeria, Forked Gulch in Arizona...). The info panel hides after `L.PANEL_SHOW` (10 s) or with its x, and comes back when a place is tapped. The screen passes `LiveScenes.setState('worldmap', { map: { heal, fuse } })`: unrestored worlds are grey and frozen, `heal` 0..1 animates the colour wave, `fuse` closes the rifts after the ending. A first win sets `storyMapEvent` so the map plays the restore wave, fragment and king's travel. Name plates, route, stops and king are Pixi on top.
- **Stars** (`src/engine/StoryStars.js`, `tests/stars.test.js`): every story stage gives 1-3 stars (the win plus two objectives that fit the opponent, `OBJECTIVES`); `GameScreen` counts challenges won/lost (`bossState.challenges`), puzzle misses and time, and keeps the best in `save.stars[id]`. Shown on the game-over panel, the map plates and info panel, and the Stats trophy shelf (one trophy per world, bronze/silver/gold). Stars are drawn by `src/pixi/PixiStar.js`.
- **The last game** (`src/characters/finalboss.js`, `tests/finalboss.test.js`): beating Grandmaster X does not finish the story. He refuses to lose, takes back every guardian's power (scene `ascension` in `story.js`, played over its own live pixel scene `src/themes/scenes/ascension.js`: his cracked crystal, the eight worlds' emblems, streams of their light pouring in as he fills red, then the cracked Great Board under him; the beats drive it with scene state `charge` and `board` through `beat.scene`/`sceneTime`, which `StoryScene._driveScene` eases and passes to `LiveScenes.setState`) and plays **Grandmaster X Unbound** on the Great Board: a side match (`final_unbound`, theme `greatboard`) with every guardian rule but Pawnie's at once (`FinalBoss.RULE`: Bish-Bosh's bishops, a corner queen, no rooks for you, gear walls and 4-ply locks, double take, every capture a challenge at full strength, a 40-move clock; the Knight of the Mist's fog and the EndGamer's endgame start are left out). GameScreen's Continue after a Grandmaster X win calls `FinalBoss.start(true)`; `save.unbound` marks it pending (`FinalBoss.pending`), and while it is the Soulbound Pixel map's Grandmaster X stop starts it. Its first win sets `save.completed`, the last fragment's map event and the `ending` scene, then the Credits. New Game+ was removed (2026-10-03); `Store.migrateSave` drops `ngPlus`/`ngCleared` from old saves.
- **Great Board mode** (`src/engine/GreatBoard.js`, `src/screens/GreatBoardScreen.js`, Play menu, unlocked by any finished save): one game on a board split into four quarters, each with a guardian rule (mist, gear walls, iron challenges, double-take forks, calm sands), dealt at random. `BossRules.regionAt` / `challengeChance(..., to)` read the regions; `PixiBossFX._drawRegions` tints them. `tests/greatboard.test.js`.
- The Grandmaster X fight plays its song's tense version throughout (`tenseMusic` in its rule).
- The story (a mystery: you wake in Pawn Hollow with no memory; you were crossing the Great Board when Grandmaster X broke it) is scripted in `src/characters/story.js` and played by `src/screens/StoryScene.js` (prologue, handover, an interlude after each guardian, the ending into the Credits). `GameScreen._walkOn` makes the opponent walk onto the board before a fight: its live character figure with the backdrop cut away (`LiveScenes.cutout`, which keeps what the scene paints with `over(buf, SPR)`), trainers as holograms, a piece only for opponents without live art.
- Each guardian world has seven missions (`src/characters/missions.js`: puzzle, challenges, hunt, rule taster, wild card, relic run, memory; `StoryMissions.COUNT`) on its own path, `src/screens/WorldMissionsScreen.js`; the guardian unlocks after all of them (`save.missions[worldId]` counts cleared). Relic runs (`goal.relics`, squares to step on) and memories (`goal.crossing`, walk your king to the last rank) are checked in `GameScreen._afterBossMoveChecks` and drawn by `PixiBossFX`. Minion portraits come from `src/pixi/PixiMinion.js`; fragments are drawn by `src/pixi/PixiShard.js`. `tests/missions.test.js` checks every mission position with the engine.
- **Worlds differ**: Slanted Sands, Iron Keep, Misty Moors, Clockwork Citadel, Obsidian Court and Soulbound Pixel have seven missions; the Grand Library's path is a **puzzle hall** (five mate-in-one rooms by piece, a pawn study, the memory); the Royal Palace and Forked Gulch hold tournaments (below). `StoryMissions.bossReady` asks `Tournaments.won` for those two.
- **Side matches** (`src/characters/SideMatches.js`): any story fight off the main path. `SideMatches.start(def)` registers a character-shaped opponent (rule in BOSS_RULES, `face` to borrow a story character's portrait or `piece` for a minion portrait via PixiMinion, `kicker`, `reward`, `noRematch`, `returnTo`, `onResult`); GameScreen calls `SideMatches.finish` at the end (coins, once-only bonus stars) and Continue goes to `returnTo`. Owners register id resolvers (`tour_`, `rival_`, `quest_`, `arena_`) so a restored game finds its opponent. `LiveScenes.character`, `TextureManager.getCharacterTexture` and `PixiPremiumAssets.character` follow `SideMatches.faceOf`.
- **Side content on the map** (`src/characters/sidecontent.js`, `tests/economy.test.js`): six **wandering rivals** camped on the roads (each with a twist; `save.rivals`; once beaten they leave the map, `SideContent.rivalVisible`). Each blocks the road to a guardian (`gate`: Salt-Beard the Iron Keep, Frostbite the Misty Moors, the Tide Witch the Royal Palace, the Dune Jester the Clockwork Citadel, the Pacific Ghost the Grand Library, Jungle Jack the Obsidian Court): beat them once to pass (`StoryProgress.roadBlock`, `SideContent.roadOpen`). Their story scenes are `road_<id>` (first match) and `roadwon_<id>` in `story.js`; **side quests** from the guardians on your side (Bish-Bosh, the Knight of the Mist, the EndGamer: three matches each, a cosmetic prize; `save.quests`) and **the Arena** in Australia (opens after three guardians: the beaten guardians one after another with their rules until you lose; `save.arena` keeps the best streak). A streak of three (`ARENA.streak`) is needed to open the road to the Obsidian Court (scenes `arena_intro`, `arena_won`).
- **Economy** (`src/state/Wallet.js`): stars to spend = story stars (`StoryStars.total`) + `save.bonusStars` - `save.starsSpent`, per save; they buy story items (`save.items`: rewind, hint, remove). The plane (`save.plane`) is not sold: Pawnie gives it after the first game (`Wallet.givePlane`, played on the world map by `WorldMapScreen._planeGift` over the live scene `scenes/plane_gift.js`, Grandpa's hangar at golden hour; a save past Pawnie without it gets it on its next map visit), and `Store.migrateSave` gives `Wallet.PLANE_PRICE_WAS` stars back to saves that bought it (`save.planeGift` marks it done). Coins (`store.wallet.coins`, whole game, persisted as `wallet`) come from every win (`Wallet.REWARDS`) and buy cosmetics (`wallet.owned`: plane paints, characters) and world themes early (added to `unlockedThemes`). In story fights GameScreen shows a TOOLS panel of icon buttons (right column, bottom; in portrait a row inside your panel; `PixiGameHud._tools`, icons from `src/pixi/PixiToolIcons.js` and the keepsakes' own art): the items with how many are left, then the keepsake powers you hold. Rewind replaces the free Undo, Hint asks Stockfish and marks the move (`_drawItemMarks`), Remove lifts an enemy piece (not king or queen, never one that would leave his king in check). Not in Training Camp drills, puzzles or trials.
- **The Shop** (`src/screens/ShopScreen.js`, 'shop', `init({ from, tab })`): the Crossroads Bazaar, a landmark on the world map in southern Africa, whose land is all of Africa south of the Congo (`worldmap.js`'s `shopLand`; always in colour, a rift along its edge). Tabs: Star Shop, Coin Shop (plane paints), Characters, Themes. Prices were tripled on 2026-09-29. **Characters** are `kind: 'token'` items with `piece`, optional `color` and `art` (piece set; none = the pieces of the world you stand in); `token_king` is free and worn by default (`Wallet.token()` gives `{ piece, color, art }`); the world map, place maps and tournament screen show you as it. Styled like the Cuphead shop: the live scene `scenes/shop.js` (the lamp-lit shop) with the shopkeeper Nour (`scenes/char_shopkeeper.js`: a living chess board with eyes, brows and a mouth, a red fez and babouche slippers, standing in the doorway (the owner asked for a face on 2026-09-29); moods idle/greet/talk/happy/nope/bye; the speech bubble's tail ends at its mouth) behind a counter; the goods sit on cushions and are browsed left/right, a pinned note shows the selected item, the tabs are drawers in the counter. A yellow arrow (`_buildBeacon`/`_destination`) marks the next destination: the next world, or the rival or Arena blocking the road (pointing in from the side); off screen, an arrow at the screen's edge points to it. The world map also has the Arena landmark (Australia), rival and quest markers, a stars/coins counter under the fragments, and the plane: with it the king flies (a biplane in the equipped paint) instead of hopping, and flies to a place before its fight. Once given, it adds **Summon the Plane** (bottom right): the king hops in and you fly with WASD / ZQSD / arrows (or hold the pointer where to go), only over the lands the story has opened (`_buildFlyZone`: reached worlds, the Bazaar's land, the Arena once open, the road walked, the next destination; the rest is shaded with a gold-dotted edge while flying, `_showZone`); Space, Enter, Escape or the button lands, selecting a place landed next to (`WorldMapScreen._summon/_flyUpdate/_land`, tuning in `FLY`: top speed 187 map px/s). The map has its own slim top bar (`_buildTopBar`: title, keepsakes, fragments, purse in one row; keepsakes on a second row in portrait) instead of the menu header, and solid top and footer bars. Where he lands is kept (`save.mapPos`, scene px; `save.mapWorld` the last world he was in, whose theme shows between worlds); a win's reward clears it and walks him along the route. `worldmap.js`'s `worldAt(x, y)` says which world's land a point is in. Places that are not worlds (`shop`, `arena`) are in the scene's `places`; the Arena claims no rifts, the Bazaar's land has one along its edge (`NEUTRAL`/`NORIFT` in `worldmap.js`).
- **Tournaments** (instead of missions in two worlds): the Royal Palace holds **The Queen's Cup** (four groups of four, single round robin, 3 points a win and 1 a draw, ties by head-to-head, then strength of results (each beaten opponent's points, half for a draw), then lots; top two go through to quarter-finals A1-B2, C1-D2, B1-A2, D1-C2, then semis and final) and Forked Gulch **The Gulch Shootout** (straight knockout from the round of 16, wanted-poster bracket, you are the top seed). The logic is `src/engine/Tournament.js` (pure: seeded mulberry32, entrants, standings, bracket, simulation; every match you are not in is simulated from the two levels with its own stream from the seed and match id, so an attempt follows from its seed and your results). A drawn knockout game is replayed. `src/characters/tournaments.js` holds the definitions (name pools with pieces and colours, entrant levels from guardian - 3 to the guardian, round twists from BossRules: Cup semi `bossChallengeChance`, final `everyCapture`; Shootout quarter `doubleTake`, semi `moveLimit`, final no-queens `fen` + `doubleTake`; the host's lines in `say`) and the save glue: `save.tournaments[worldId]` is the current attempt, `save.tournamentsWon` the worlds won (`Tournaments.won`, `guardianReady`). Your games are side matches with ids `tour_<world>_<attempt>_<match>` (the `tour_` resolver rebuilds them after a restart); `Tournaments.record` stores the result, plays the round and pays `tournamentFinal` / `tournamentWin` coins and 3 bonus stars on the first win. `src/screens/TournamentScreen.js` ('tournament', `init({ world })`) shows the group tables or the bracket, the next opponent and twist with Queenie or ForkMaster commenting, "Enter again" after going out, and "Face <guardian>" once won. `tests/tournament.test.js`.
- **The fight screen in story mode** (`src/pixi/PixiGameHud.js`): the opponent stands on a stage at the top of the right
  column, its whole live character scene at 3x (moods follow the fight), name, title, turn and captures; its lines come
  out of its mouth in a cream comic bubble (`PixiDialogueBubble` with `anchor` from `PixiGameHud.mouthAnchor()`, the
  face frame of the character scene gives the mouth; in portrait the face in the top panel speaks). The status bar's
  buttons (back, forward, live, undo, flip) are pixel icons too.
- Every stage's twist or test lives in `src/engine/BossRules.js` (start positions, challenge chances, walls, fog, double take, clock, rewinds, puzzles, goals, minigame trial). Mission goals: `mystery` (catch the hidden Mystery Piece; hints narrow the suspects), `captureAll`, `promote`, `survive`; checkmate always wins too. `GameScreen` calls it; `src/pixi/PixiBossFX.js` draws it; the trainers' hologram portraits are PNGs drawn by `node scripts/generate_trainer_art.js`.

### Screens (`src/screens/`)

| Screen | Rendering | Status |
|--------|-----------|--------|
| `HomeScreen.js` | PixiJS | Migrated — animated title, rounded buttons, particles |
| `GameScreen.js` | Hybrid | Board, pieces and HUD via PixiJS; parts in `game/GameStoryTools.js` |
| `PuzzleScreen.js` | PixiJS | Coach portrait and speech card, puzzle's place in its set, lesson, set pips; progress on the right |
| `WorldMissionsScreen.js` | PixiJS | Place map; the info panel moves under the title when the selected stop sits behind it (`PANEL_TOP`) |
| `PlayMenuScreen.js` | PixiJS | "Play" from Home: Classic (BotSelect), Local 1v1, Custom Game, Great Board (after the story) |
| `GreatBoardScreen.js` | PixiJS | Great Board setup: region preview, Shuffle, opponent strength, Play |
| `WorldMapScreen.js` | PixiJS | Story map over the live `worldmap` scene |
| `TrainingHubScreen.js` | PixiJS | Puzzles (continue), All Levels, Mini-Games practice, Board Editor |
| `SettingsScreen.js` | PixiJS | Tabs: Display, Graphics, Audio, Game (Themes, Controls, Credits, Feedback, Reset) |
| `HowToPlay.js` | PixiJS | Topic tabs: Basics, Captures, Story, Training, Controls (key table) |
| `MiniGamePractice.js` | PixiJS | Large preview + record on the left, six games per page, filters by kind |
| `StatsScreen.js` | PixiJS | Headline tiles, match record (results bar, rivals), mini-game record |
| `CreditsScreen.js` | PixiJS | Scrolling credits roll; hold Space to speed up |
| `PauseMenu.js` | Canvas 2D | Drawn over the fight |

## Promotional Video

`marketing/chess-ad/` is a separate Remotion project for the 32-second, 1920×1080 game ad with 25 shots, plus the
5-minute teaser (`Chess2-Teaser`) and its 60-second cut (`Chess2-Teaser-60s`) in `src/teaser/`. The
teaser draws the game's live scenes itself (`scripts/bundle-live-scenes.cjs` bundles `src/themes/scenes`),
so scene edits show up in it; `npm run teaser:capture` records its footage and music from the real game
in a temporary profile. Change `src/teaser/data.ts` when worlds, guardians, twists or mini-games change.
It has its own dependencies and does not participate in the game runtime or web deployment.
Run `npm run dev` there for Studio, `npm run lint` for TypeScript/ESLint checks, and
`npm run render` to export an MP4. See its README for the scene timings and asset workflow.
`npm run capture` and `npm run capture:montage` use the root Electron dependency with a temporary user-data directory and
an isolated session; it never loads the player's saves. Captured footage, music, artwork and
local fonts are in its `public/` directory. `npm run score` rebuilds the original music and
sound-design mix. `CREATIVE_NOTES.md` documents the research and edit timing.

## Web Version

The same `src/index.html` also runs in a browser at `https://game.altobolt.com` (there is no separate web
entry point). `src/web/web-compat.js` gives the browser a stand-in `window.electron` for fullscreen;
`src/vendor/pretext/` is a vendored copy of `@chenglou/pretext` so its ES module import works from file
paths and over HTTP (re-copy its `dist/` there after updating it). The Telegram Mini App was removed on
2026-10-03: do not add Telegram code back.

Rules for keeping the browser version working:
1. **Never use `window.electron` without a guard** (`if (window.electron)`); in a browser it is the stand-in.
2. **No Node.js APIs** (fs, path, child_process) in `src/`. Renderer code must stay browser-compatible.
3. **Touch events**: `src/main.js` listens to touch and mouse events. New input handlers must support both.
4. Deploying copies `src/` and `assets/` to the server (`/var/www/chess2/`, nginx); only from the machine
   that has the `vps` SSH alias, and only when the owner asks.

## Working Together (Claude Code + Codex)

Two AI agents (Claude Code and Codex) and the owner work on this repository. To avoid stepping on each other:

- **Start from a fresh `main`.** `git pull` before starting. Work on your own branch named after the
  agent and the task (`claude/story-rewards`, `codex/online-lobby`), and merge back into `main` when done.
  Only commit straight to `main` when the owner asks for it.
- **Check `git status` before editing.** Uncommitted changes you did not make belong to someone else:
  leave them alone, don't revert them, and don't fold them into your commit without saying so.
  If a file changes on disk while you work, another agent is probably editing it: re-read it before editing.
- **Keep commits small and focused**, with a clear message saying what changed and why. End commit
  messages with your own `Co-Authored-By` line.
- **Run `npm test` before every commit.** Add tests in `tests/` for new engine or rule logic.
- **Bump the `?v=NN` cache tag** in `src/index.html` (all local scripts share one number) whenever you change
  files in `src/`, so browsers never mix old and new scripts.
- **The owner's save is real.** The app (including the headless one) uses the owner's own
  `localStorage` (`chess2_progress`). Back it up before automated play and restore it afterwards;
  confirm after restarting the app, because in-memory state can be written back over a restore.
- **Keep the docs current.** Update this file when you change architecture, and `STORY_MODE_PLAN.md`
  when you finish or change a Story Mode step. Update `README.md` when a player-facing feature changes.
- **Verify visually.** UI changes are not done until you have looked at a screenshot (see the
  screenshot and CDP tools above).
- **Ask the owner** before big design decisions (new modes, story changes, balance), deleting features,
  pushing, or deploying.
- **Handoffs** live in `docs/handoffs/HANDOFF_<YYYYMMDD>_<slot>.md` (newest = latest date). Claude Code
  writes them with `/ho` (`.claude/skills/ho/SKILL.md`; Codex, read it directly). A session resumed from a
  handoff only reads, checks what is running, summarises what was done and what is next, then waits for the
  owner: it never starts a "Next" step on its own.

## Migration Status

The game is migrating from Canvas 2D to PixiJS v8. Progress:
- **Phase 0 (Cleanup)**: Done — removed bloat (assets/dropbox, assets/generated, dist/), optimized ocean_bg.png, fixed dead code
- **Phase 1 (UI Components)**: Done — 12 PixiJS UI components built in `src/pixi/ui/`
- **Phase 2 (Screen Migration)**: Done for menus — every screen but GameScreen (hybrid) and PauseMenu is PixiJS
- **Phase 3 (Screen Polish)**: In progress — MiniGamePractice, CharacterSelect, and other Canvas 2D screens improved with grouping panels, better card styling, and proper hitbox sync. Still render via Canvas 2D but with significantly better visual quality.
- **Phase 4 (Mini-games to PixiJS)**: Pending
- **Phase 5 (Canvas consolidation)**: Pending

## Art Rules

- **No crosses on kings or bishops.** The owner does not want a cross (a cross finial, a "+" on
  top, a crucifix shape) on any king or bishop, anywhere: piece sprites and piece sets, live scenes
  and characters, 3D mini-game pieces, the app icon, UI art, marketing. Top a king with a crown
  (points and a ball or gem) and a bishop with its mitre and a ball finial. When you find an old
  design with a cross, replace it.

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
- Used by agents for visual verification during development

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
