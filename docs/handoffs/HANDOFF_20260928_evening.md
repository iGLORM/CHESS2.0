How to resume: read this file and the files it lists, check what is still running, then give the owner a
short summary (what was done, what is next) and WAIT for an instruction. Do not start any Next step on your own.

# Handoff 2026-09-28 evening (18:06)

- Why: end of the menus + training session (owner ran /ho).
- Branch: `claude/super-user` (HEAD 5e13b11). All work below is UNCOMMITTED in the main checkout.
- Previous handoff: none (first file in `docs/handoffs/`).
- Read with it: `AGENTS.md` (new "Menu structure" and "Training puzzles" notes under Screen System, and the
  Screens table rows for `PlayMenuScreen.js` / `TrainingHubScreen.js`).

## Running now

- Nothing of ours. This session's headless game was closed with `window.electron.quit()`.
- NOT ours: another Claude session (scratchpad `.../113784a0-.../`) had a headless Electron on port 9333 at
  18:06, restoring the save from its own `ls_backup.json`. Let it finish; do not kill it.
- The owner's save: this session backed it up at the start (scratchpad `.../7ada672c-.../save_backup.json`),
  restored it and confirmed it after a restart (training levels back to 1 and 2 only). Note that the other
  session's restore ran after ours and may have overwritten `localStorage` again with its own backup.

## Waiting for the owner

1. How to commit. My changes share files with other uncommitted work (`src/index.html`, `src/main.js`,
   `AGENTS.md`, `README.md`, `src/pixi/PixiPremiumScene.js`), so I did not commit. Options: (a) the owner
   commits everything together; (b) I commit only the files that are purely mine (list below) and the shared
   ones later. Proposed: (a), or (b) once the other work is committed.
2. Push / deploy to Telegram: not done. Local tag is now `?v=38` (someone bumped it after my `v=37`). Live tag: not checked.

## Done this session (uncommitted, checked with screenshots, `npm test` 79/79 passing)

- Menus reorganised: Home = Story / Play / Training tiles + Settings, How to Play, Stats
  (`src/screens/HomeScreen.js`). New `src/screens/PlayMenuScreen.js` (Classic, Local 1v1, Custom);
  BotSelect and CustomGame go back to it. Mini-Games moved from Settings to Training
  (`SettingsScreen.js`, `MiniGamePractice.js` takes `{ from }`, How to Play button renamed "Mini-Games").
- New look for all menus: `PixiPremiumScene.panel` now has stepped pixel corners, an outline and a bevel;
  new `tile`, `pieceArt`, `pixelShape`, `focusRing` helpers (arrow-key focus on Home/Play/Training).
- Training hub redesigned (`TrainingHubScreen.js`): Puzzles (next unsolved level), All Levels, Mini-Games, Board Editor.
- Puzzles: 19 of 30 were wrong (listed answer not best, or losing; old Level 11 even ended in stalemate).
  Replaced and checked each with Stockfish (`src/data/TrainingLevels.js`). New `tests/training.test.js`.
- `PuzzleScreen.js` rewritten: multi-move lines checked move by move (before, any 2nd move counted), input
  blocked during replies, any mate accepted on the last move, Stockfish accepts other equally winning
  moves ("That works too"), Next Level respects locks, streak counts days, custom positions are played out
  against Stockfish with engine hints.
- `BoardEditorScreen.js`: Paste FEN from the clipboard (window.prompt does nothing in Electron), separate
  "To Move" toggle, refuses impossible positions, castling rights computed, keeps the board when coming back.
- `CoachCharacter.js`: new lines (alsoWorks, checking, sandbox win/loss/draw), fixed ".." in reveal lines.
- Docs: `AGENTS.md` and `README.md` updated.
- Files that are only mine: `src/screens/PlayMenuScreen.js`, `src/screens/TrainingHubScreen.js`,
  `src/screens/HomeScreen.js`, `src/screens/PuzzleScreen.js`, `src/screens/BoardEditorScreen.js`,
  `src/screens/MiniGamePractice.js`, `src/screens/HowToPlay.js`, `src/screens/SettingsScreen.js`,
  `src/screens/BotSelect.js`, `src/screens/CustomGameScreen.js`, `src/data/TrainingLevels.js`,
  `src/characters/CoachCharacter.js`, `tests/training.test.js`. Shared with others' changes: `src/index.html`
  (PlayMenuScreen script tag, tag bump), `src/main.js` (registerScreen playMenu), `src/pixi/PixiPremiumScene.js`,
  `AGENTS.md`, `README.md`.

## Owner decisions and refusals

- Owner asked: minigames belong in Training, change the overall menu look, check and fix every training screen.
- Owner said "dont ask any question": design choices were made without asking (three-tile Home, Play submenu,
  pixel-corner panels). Do not reopen unless the owner asks.

## Next (proposals, not a work queue)

1. Decide how to commit the work above (waits for the owner's go).
2. Level Select: mark the next level to play and show locks more clearly (starts from `src/screens/LevelSelectScreen.js`) (waits for the owner's go).
3. Carry the new tile look to the remaining older menus (BotSelect, CustomGame, Stats, ThemeSelect) (waits for the owner's go).
4. Deploy to Telegram after committing (waits for the owner's go).

## Suggested skills

- `run` to launch and screenshot the game; `code-review` before committing/merging; `pixel-scene` only for scene art.

## Heads

- Repo: `claude/super-user` at 5e13b11 (not pushed, no upstream). `main` = `origin/main` = 3c156a1.
- Codex: `codex/ad-motion` 3c156a1 (worktree `~/.codex/worktrees/ad-motion/chess-2.0`, merged into main);
  `codex/assets-trial-library`, `codex/game-ad` at 39b8f9d (merged).
- Stale agent worktrees in `.claude/worktrees/` (13 `agent-*` dirs): not removed, need the owner's yes.
- Cache tag: local `?v=38`; live not checked.
- `npm test`: 79 pass, 0 fail.
- Waiting to be pushed: `claude/super-user` (no upstream), `codex/*` branches (no upstream).
