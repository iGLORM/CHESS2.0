# PixiJS Phased Migration Design

**Date:** 2026-05-07
**Topic:** Migrate the entire Chess 2.0 game from HTML5 Canvas to PixiJS (WebGL/Canvas2D renderer)
**Approach:** Phased migration — board + engine first, then minigames, then menus, then cleanup

## 1. Context

Chess 2.0 is an Electron + vanilla JavaScript + HTML5 Canvas game with no frameworks or bundlers. All rendering is manual `ctx.fillRect`, `ctx.drawImage`, `ctx.arc`, etc. The rendering layer spans ~3,000 lines across 7 files. The game has 12 screens, 14 minigames, a chess engine, and a theme system.

## 2. Goals

- Make animations easier to write and richer (tweening, easing, filters)
- Make the game look better (WebGL glow, blur, particle effects, smooth scaling)
- Keep the chess engine, store, screen system, and input handling untouched
- Migrate incrementally with no single big-bang rewrite

## 3. Architecture

PixiJS runs as one or two `PIXI.Application` instances:
- **Main app** replaces `gameCanvas` for all game screens + menus
- **Overlay app** replaces `miniGameOverlay` for minigames (can merge into main later)

The screen system stays identical. Each screen's `render(ctx, dt)` becomes `update(dt)` that mutates Pixi display objects (transforms, visibility, alpha). The Pixi ticker handles the actual draw loop.

```
Store/GameState  → unchanged
Screen.update(dt) → PixiApp.update(dt) → updates Sprite/Graphics props
User input → unchanged → game logic → triggers tween → updates Pixi objects
Pixi ticker → renders everything to WebGL
```

## 4. Phase 1: Game Board + Engine (Week 1-2)

### New files

| File | Purpose |
|------|---------|
| `src/pixi/PixiApp.js` | Creates `PIXI.Application`, manages stage, ticker |
| `src/pixi/PixiBoardRenderer.js` | Board squares, highlights, legal-move dots, decorations |
| `src/pixi/PixiPieceRenderer.js` | Loads piece textures into `PIXI.Texture`, creates `PIXI.Sprite` per piece |
| `src/pixi/PixiBackgroundRenderer.js` | Procedural backgrounds using `PIXI.Graphics` + filters |
| `src/pixi/PixiParticleFX.js` | `PIXI.ParticleContainer` for capture/move/explosion particles |
| `src/pixi/PixiAnimator.js` | Tween engine (GSAP) wrapping piece movement, screen shake, flash |
| `src/pixi/PixiGameScreen.js` | Adapter: bridges `GameScreen` state to Pixi renderers |

### Modified existing files

| File | Change |
|------|--------|
| `src/screens/GameScreen.js` | `render(ctx, dt)` delegates to Pixi update loop |
| `src/main.js` | Initialize Pixi app on DOM ready |
| `src/index.html` | Add PixiJS + GSAP CDN `<script>` tags |

### What stays untouched

- Chess engine (`src/engine/`)
- State store (`src/state/Store.js`)
- Audio (`src/audio/AudioManager.js`)
- Themes (`src/themes/`)
- Characters (`src/characters/`)
- Input (`src/input/`)
- Screen router + event handlers
- All non-game screens (`HomeScreen`, `SettingsScreen`, etc.)

### Visual wins

- Piece movement tweened with `gsap.to(pieceSprite, {x, y, duration: 0.3, ease: "back.out(1.7)"})`
- Selected piece glow via `PIXI.filters.GlowFilter`
- Capture screen shake + blur flash
- 50+ particle bursts on captures at 60fps
- Crisp pixel art at any window size

## 5. Phase 2: Minigames (Week 3)

- `MiniGameManager` starts/stops minigame scenes on the overlay Pixi app
- Each minigame (`UndertaleDodge`, `ShieldBlock`, `DodgeFalling`, etc.) rewritten to use `PIXI.Graphics`/`PIXI.Sprite`
- Smooth bullet/projectile movement via ticker
- Collision detection via Pixi bounds (`getBounds()`)
- Screen flash effects for hits/damage

## 6. Phase 3: Menu Screens (Week 4-5)

- `HomeScreen`, `SettingsScreen`, `BotSelect`, `CustomGameScreen`, etc. rendered via Pixi
- UI helpers replaced with pre-rendered 9-patch textures or `PIXI.Graphics` factories
- Buttons get hover animations (scale bounce, color tint)
- Screen transitions become slide/fade tweens
- Scrollable lists (MiniGamePractice) use Pixi `ScrollBox` or manual container mask

## 7. Phase 4: Cleanup (Week 6)

- Remove old `gameCanvas` and `miniGameOverlay` canvases
- Delete old renderer files: `BoardRenderer.js`, `PieceRenderer.js`, `UIHelpers.js` (canvas version), `BackgroundRenderer.js` (canvas version)
- Remove all manual `ctx.clearRect`, `ctx.fillRect`, `ctx.drawImage` calls
- Single Pixi app handles everything
- Keep `UIHelpers.js` if renamed to `PixiUIHelpers.js`

## 8. CDN Dependencies

```html
<script src="https://cdn.jsdelivr.net/npm/pixi.js@7.3.2/dist/pixi.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.2/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.2/dist/PixiPlugin.min.js"></script>
```

No bundler needed — PixiJS and GSAP load via global `PIXI` and `gsap` objects, matching the existing `<script>` tag architecture.

## 9. Fallbacks

- PixiJS auto-falls back to Canvas2D if WebGL fails — game still runs
- Phase 1 keeps old canvas code behind a feature flag (`usePixi`) for instant rollback
- Each phase ends with manual playtest before proceeding

## 10. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| PixiJS CDN unavailable | Pin exact version, no `latest` tag; Electron can cache locally |
| WebGL not supported on target machines | Pixi auto-falls back to Canvas2D |
| Performance regression | Phase 1 is testable in isolation; can abort and keep canvas |
| Breaking existing screens | Only GameScreen and minigames touched in Phase 1-2; menus untouched |

## 11. Out of Scope

- Rewriting the chess engine
- Adding new game modes or minigames
- Changing the store, input, audio, or theme systems
- Adding a bundler or module system
- Adding automated tests (there is no test framework)
