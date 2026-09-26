# Story Mode Plan (handoff)

The agreed redesign of Story Mode, what is built, and what is left. Decisions
here were made with the project owner; ask before changing them.

## The story: "The Shattered Board" (mystery about you; chosen 2026-09-26)
- Prologue: you wake in Pawn Hollow's hay with no memory, holding a fragment.
  Pawnie (he/him) found you; you fell from the sky the night the Great Board
  shattered, and the Hollow is the only world that stopped fading when you landed.
- Stage 1: a normal match against Pawnie. Stages 2–6: the Training Camp (five
  holographic trainers, cannot be skipped). Then Pawnie hands the fragment back
  (it was always yours) and **leaves the story**.
- Stages 7–15: nine guardians. After each win the beaten guardian lets slip a
  clue and the next one raises the stakes: you crossed these worlds before, you
  were three ranks from the far edge when the board broke under you, Grandmaster
  X feared the board would choose you, someone broke it with you on it, and he
  put a bounty on you. Scenes are short (3–5 lines, one strong beat each).
- Ending: GM X's crystal shatters and reveals the First Piece (a pawn), the first
  to cross and the board's Guardian. He broke the board to stop you crossing; you
  lost your memory and the Hollow kept you safe. The fragments join, you take the
  last step to the far edge, the worlds fuse, and you are the new Guardian.
  Unlocks: **Great Board mode**, the **Great Board theme**, **New Game+**
  (freed Grandmaster X is the first opponent).

## Worlds (in order)
| Stage(s) | Character | World | Board material | Song from | Placeholder art now |
|---|---|---|---|---|---|
| 1 | Pawnie | Pawn Hollow (farm village) | Wooden planks and grass | Sakura | japanese |
| 2–6 | 5 trainers | The Training Camp (dojo, dummies, holo-projector) | Tatami and wood | Cyberpunk | cyberpunk |
| 7 | Bish-Bosh | The Slanted Sands | Sandstone | Egypt | egypt |
| 8 | Rook-E | The Iron Keep | Riveted iron plates | Medieval | medieval |
| 9 | The Knight of the Mist | The Misty Moors (fog, ruined watchtowers) | Mossy flagstone | Ocean, retuned darker | ocean |
| 10 | Queenie | The Royal Palace | Marble with gold inlay | Art Deco | artdeco |
| 11 | CastlE | The Clockwork Citadel | Brass plates | Steampunk | steampunk |
| 12 | EndGamer | The Grand Library | Polished inlaid wood | Space | space |
| 13 | ForkMaster | Forked Gulch | Weathered planks | Wild West | wildwest |
| 14 | Checkmate | The Obsidian Court | Obsidian | Prehistoric | prehistoric |
| 15 | Grandmaster X | Soulbound Pixel | Crystal | Crystal | crystal |

## Boss twists (all built)
Every fight: a Boss Rule card first, twisted fights play Stockfish one level
weaker, minigames are always on in story, base capture-challenge chance 30%.
- Bish-Bosh: four bishops, no knights.
- Rook-E: you start without rooks; taking one of his rooks always starts a challenge.
- Knight of the Mist: fog (you see only squares you occupy, attack or can advance
  to); his hidden knights' eyes glow every third move; his hidden moves show as "???".
- Queenie: back rank Q N B R K B N Q; her captures challenge 60% of the time.
- CastlE: gear walls on c4, f4, c5, f5 are real blockers (a neutral `wall` piece
  in the engine: nothing lands on or slides through them, knights jump; hidden
  from Stockfish's FEN); a lost challenge locks the square for 3 turns.
- EndGamer: a random equal-material endgame (39 positions + mirrors) that
  favours him; minigames on.
- ForkMaster: double take — a fork on two of queen/rook/bishop/knight takes both
  (king forks are normal chess), slow-mo two-gun animation.
- Checkmate: win within 40 of your moves or lose ("The sand ran out"), hourglass.
- Grandmaster X: every capture is a challenge, max bot skill, favours the
  minigames you lose most; checkmating him rewinds 4 plies and he gains a random
  bishop/knight by his king (invert + slide back + crystal shards); crystal
  cracks; the third mate shatters it and wins.

## Trainers (all built)
Lesson pages beside a hologram, then a test. A failed test says "Try Again".
- Sergeant Square: 3 mate-in-one puzzles (no challenges).
- Captain Capture: every capture is a challenge; make 3 captures.
- Joy Stick: 5 challenges in a row, win 3 (auto-pass without WebGL).
- The Rulekeeper: mist over ranks 5–6; catch the Mystery Piece (hints every 2 moves).
- Sensei Tactic: a full game vs a real bot; win it.

## Build steps
1. Foundation (Boss Rule card, per-boss rules, forced minigames, AI −1) — **done**
2. Start-position twists — **done**
3. Rule twists and their animations — **done**
4. Training Camp, 15 stages, save migration (level n>1 → stage n+5) — **done**
5. World map — **done** (king token travel, zoom-in before fights, restore wave +
   fragment on first win, Continue/Play Again and Try Again/Back to Map buttons)
6. **New worlds** — **done**. Ten themes replaced by world themes (ids = world ids;
   Soulbound Pixel keeps `crystal`, untouched). Eight scenes painted by
   `scripts/generate_backgrounds.py`; Training Camp reuses the hand-painted dojo,
   Forked Gulch the Wild West scene. Boards/pieces/previews from
   `scripts/generate_theme_art.py` (`previews` step writes premium_theme_*/premium_bg_*).
   Songs renamed and retuned. `THEME_ALIASES` (themes.js) maps old ids; saves keep
   old unlocks via `Store.legacyThemeUnlocks` → `unlockedThemes`. World themes unlock
   when the world is restored in any slot (`ThemeManager.isThemeUnlocked`).
7. **Story writing and cutscenes** — **mostly done**. `src/characters/story.js`
   (script: prologue, handover, after7–after14 interludes, ending) played by
   `src/screens/StoryScene.js`; hooks in `WorldMapScreen.start` and
   `GameScreen.handleGameOverAction('map')` (`storyScenePending`); ending → Credits
   (`returnTo: 'worldMap'`). Boss walk-on + greeting card in `GameScreen._walkOn`.
   Boss dialogue rewritten, `rematch` lines, Checkmate `timeout` line.
   Left: the map does not yet show the fused continent after a full clear.
7b. **World missions** — **done** (2026-09-26). Each guardian world opens its own map
   (`WorldMissionsScreen`) with 5 missions on a path, then the guardian (locked until
   all 5 are cleared; restored worlds are free replays). Content in
   `src/characters/missions.js` (puzzle, 3-challenge trial, hunt, rule taster, wild card
   per world; minions with portraits from `PixiMinion`). New rule goals: `goal.promote`,
   `goal.survive`, `minigameTrial.pool` / `weakest`. Fragments are now broken board
   pieces (`PixiShard`).
   Board missions are won by checkmate or by their goal (2026-09-26, no more "win N captures"):
   `goal.mystery` (one enemy piece is secretly the target; every piece wears a "?", a hint
   every 3 moves clears about half the suspects, the last one turns into a gold "!";
   `BossRules.hideMystery/mysteryHint`, flags live on the piece objects) or `goal.captureAll`
   (take every piece but the king).
8. **Rewards** — TODO (theme unlocks and per-opponent `save.record` wins/losses already exist). Themes and songs unlock per world (new players start with
   Pawn Hollow + Custom; the Training Camp unlocks after training; existing
   players keep what they have). 1–3 stars per fight: 1 for winning + 2
   objectives that fit each boss (e.g. Rook-E: capture both rooks; Knight: win
   without losing a knight). Trophy shelf in the Stats screen. Rematch dialogue
   after losing to a boss. Tense music for the whole Grandmaster X fight.
   New Game+ after a full clear (stacked twists, new dialogue). Great Board mode.

## Where things live
- `src/engine/BossRules.js` — every stage's twist or test (data + pure helpers, unit-tested in `tests/boss.test.js`).
- `src/pixi/PixiBossFX.js` — fog, walls, locks, hourglass/crystal/progress panels, double take, rewind, banners.
- `scripts/generate_trainer_art.js` — draws the trainers as pixel-art holograms (character PNG + both premium cards); re-run after changing a trainer.
- `src/characters/trainers.js` — trainers + `STORY_STAGES` (the 15 stages).
- `src/characters/worlds.js` — `WORLDS`, `StoryProgress`; sets each character's fight theme.
- `src/screens/WorldMapScreen.js` — the story map; `CharacterSelect` only handles save slots and difficulty now.
- `GameScreen` — calls the rules (`bossRule`, `_afterBossMoveChecks`, `_tryBossRewind`, puzzles, trial, goals).

## Testing notes
- `npm test` for engine/rules. For the real app: `CHESS2_HEADLESS=1 npx electron . --remote-debugging-port=9333`
  and drive it over CDP. The hidden window uses the owner's real save: back up
  localStorage first, restore it afterwards, and confirm after a restart
  (in-memory state can be saved back over a restore).
- gsap: `killTweensOf(array)` does not match mixed Pixi targets here; kill per object.
