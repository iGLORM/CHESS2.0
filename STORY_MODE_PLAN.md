# Story Mode Plan (handoff)

The agreed redesign of Story Mode, what is built, and what is left. Decisions
here were made with the project owner; ask before changing them.

## The story: "The Shattered Board" (mystery about you; chosen 2026-09-26)
- Prologue (changed 2026-09-28): for an age the world has been splitting apart,
  crack by crack. You fall from the sky into Pawn Hollow with no memory, holding a
  fragment, and from that night the splitting stops everywhere. Pawnie (he/him)
  found you.
- Guardians are linked (2026-09-28): each one you beat sends you to the next for
  something it holds (Bish-Bosh: the road through the Iron Keep; Rook-E: the Iron
  Key, and his brother CastlE keeps his sealed orders; the Knight of the Mist: his
  lantern and word of the map of your crossing, hidden by Queenie; Queenie: CastlE
  took the map; CastlE: the EndGamer borrowed it; the EndGamer: the map, and
  ForkMaster carries the bounty as proof; ForkMaster: the poster signed by
  Grandmaster X, and Checkmate guards the last road). **Good guardians:** Bish-Bosh
  (Pawnie's friend), the Knight of the Mist (a spy who only pretends to serve X) and
  the EndGamer; they still fight, because a fragment only leaves its guardian when
  they lose. The rest serve Grandmaster X (ForkMaster is a bounty hunter who hands
  over the poster once beaten).
- Stage 1: a normal match against Pawnie, plain chess with no challenges (2026-09-28). Stages 2–6: the Training Camp (five
  holographic trainers, cannot be skipped). Then Pawnie hands the fragment back
  (it was always yours) and **leaves the story**.
- Stages 7–15: nine guardians. After each win the beaten guardian lets slip a
  clue and the next one raises the stakes: you crossed these worlds before, you
  were three ranks from the far edge when the board broke under you, Grandmaster
  X feared the board would choose you, someone broke it with you on it, and he
  put a bounty on you. Scenes are short (3–5 lines, one strong beat each).
- Ending: GM X's crystal shatters and reveals the First Piece (a pawn), the first
  to cross and the board's Guardian. Afraid of being replaced, he had been breaking
  the board crack by crack for an age so no one could cross; when you nearly did he
  broke it all at once, and when you fell it stopped breaking (it had chosen you); you
  lost your memory and the Hollow kept you safe. The fragments join, you take the
  last step to the far edge, the worlds fuse, and you are the new Guardian.
  Unlocks: **Great Board mode**, the **Great Board theme**, **New Game+**
  (freed Grandmaster X is the first opponent).

## Side content and variety (added 2026-09-29, owner's request)
- Worlds are not all "7 missions then the guardian": the Grand Library is a puzzle hall,
  the Royal Palace and Forked Gulch hold 16-player tournaments (Queen's Cup: groups +
  knockout; Gulch Shootout: straight knockout); winning one opens its guardian.
- Wandering rivals (6, three tiers each), side quests from the good guardians
  (Bish-Bosh, the Knight of the Mist, the EndGamer), the Arena gauntlet (Australia).
- Shop (the Crossroads Bazaar, middle of Africa): story stars buy rewinds, hints,
  remove-a-piece and the plane; coins buy cosmetics and early themes.

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
weaker, minigames are always on in story (except the Pawnie match and the drills that turn them off), base capture-challenge chance 30%.
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

## Rework (2026-09-29, owner's request)
- Choosing a difficulty starts the story at once (prologue, then Pawnie).
- Only four fragments: yours, the EndGamer's, Checkmate's and Grandmaster X's. The other
  guardians give keepsakes (compass, iron key, lantern, signet, broken seal; EndGamer the map,
  ForkMaster the poster, Checkmate the hourglass too) with a reveal animation.
- The six wandering rivals block the roads (Iron Keep, Moors, Palace, Citadel, Library, Court);
  the Arena (three in a row) guards the Obsidian Court too. Road scenes for each.
- Every world, the Training Camp included, is a place map you zoom into, with lore per stop.
- The Shop is restyled like the Cuphead shop (a shopkeeper behind his counter).
- Keepsakes are useful (owner's request): compass = the map is uncharted sepia until you win it,
  then a charting wave from the king and a needle to the next stop; iron key = chests on the map;
  signet = a third off story items; map = the storm over Soulbound Pixel lifts; lantern, seal,
  hourglass = once-per-fight powers; poster = a bounty on one enemy piece.
- Fight screen: the guardian stands alive in the right column and speaks from its mouth; every
  tool is an icon button. Nour the shopkeeper is now a living chess board with a face.

## Trainers (all built)
Lesson pages beside a hologram, then a test. A failed test says "Try Again".
- Sergeant Square: 10 mate-in-one puzzles, easy to hard (no challenges).
- Captain Capture: an endgame where you are ahead; checkmate him.
- Joy Stick: every mini-game one by one; two retries each, then it counts (auto-pass without WebGL).
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
   The fused continent after a full clear: done with the new map (step 5b).
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
7c. **Relic Runs and Memories** — **done** (2026-09-28). Two more missions per world
   (7 in all; `StoryMissions.COUNT`): `goal.relics` (algebraic squares; a relic is taken by
   any move of yours that ends on it, derived from the move history in
   `BossRules.relicsTaken`; usually with a `moveLimit`) and `goal.crossing` (walk your king
   to the last rank; a Memory of the night you crossed, whose `after` line gives back one
   piece of the story). Drawn by `PixiBossFX._updateRelics/_updateEdge`.
7d. **Live characters and cutscene polish** — **done** (2026-09-28). Every story character
   (and The First Piece) is a live pixel character `src/themes/scenes/char_<id>.js` with
   moods; map medallions, info panels, save slots and the fight intro card show it
   (`PixiPremiumAssets.characterSprite`), and `node scripts/live-scene.js portrait` writes
   the still PNGs. StoryScene has letterbox bars, a chapter card, progress pips, motes,
   speaker-coloured frames and typing voices (`audioManager.playVoice`).
5b. **World map redone** — **done** (2026-09-28). The live pixel scene "The Shattered Earth"
   (`src/themes/scenes/worldmap.js`, 640x320 at 4x, dragged in 2D): Earth split by magenta rifts into the
   worlds' regions, each landmark where it belongs (Pawn Hollow in Japan, Training Camp in the Himalayas,
   Slanted Sands in Egypt, Iron Keep in central Europe, Misty Moors in Scotland, Royal Palace in India,
   Clockwork Citadel in Siberia, Grand Library in Canada, Forked Gulch in Arizona, Obsidian Court in the
   Andes, Soulbound Pixel floating over a whirlpool in mid-Pacific). Unrestored worlds are grey and frozen; a
   restore washes colour out from the landmark; after the ending the rifts close (`fuse`).
8. **Rewards** — **done** (2026-09-28). Stars on all 15 stages (`src/engine/StoryStars.js`; objectives chosen
   with the owner), trophy shelf in Stats, tense music for the whole Grandmaster X fight, New Game+
   (`src/characters/newgameplus.js`: First Piece first, camp and missions skipped, stacked rules, +1 level,
   new greetings), Great Board mode (`src/engine/GreatBoard.js`: four quarters with random guardian rules) and
   the Great Board theme. Original notes: Themes and songs unlock per world (new players start with
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
