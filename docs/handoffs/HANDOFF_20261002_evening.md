How to resume: read this file and the files it lists, check what is still running, then give the owner a
short summary (what was done, what is next) and WAIT for an instruction. Do not start any Next step on your own.

> **Update 2026-10-03:** the owner dropped Russian and Naš jezik (`ru`, `hbs`). The game ships English,
> French, Spanish, Portuguese, Italian and German only; skip every step below about those two.

# Handoff 2026-10-02 evening (20:41)

- Why: context too high, owner is switching session.
- Branch: `claude/super-user` (HEAD 5a7da63). Previous handoff: `docs/handoffs/HANDOFF_20260928_evening.md`.
- Read with it: `AGENTS.md`, `src/i18n/I18n.js` (header comment explains the whole language system),
  `scripts/i18n.js`, `scripts/i18n-check.mjs`, `scripts/i18n-audit.js`.

## Running now
- Headless test copy of the game, own save folder (never the owner's save):
  `CHESS2_HEADLESS=1 CHESS2_USER_DATA=<scratchpad>/ud npx electron . --remote-debugging-port=9345` (pid 68929).
  Dies with a restart: yes (child of this Claude session). Harmless; relaunch with any empty folder, e.g.
  `CHESS2_HEADLESS=1 CHESS2_USER_DATA=/tmp/chess2-i18n npx electron . --remote-debugging-port=9345`.
- The owner's save was never touched (no backup needed).

## The task in progress: languages (owner request this session)
Owner asked: languages chosen in Settings: English, French, Spanish, Portuguese, Italian, German, a Balkan
language with a name that angers nobody, Russian. No overlapping text, everything in place, check the UI.
Owner decisions: translate EVERYTHING in one go (menus + story + dialogue + lore + missions + puzzles);
Balkan language named **"Naš jezik"** (id `hbs`, ijekavian Latin, neutral words); stay on branch `claude/super-user`.

How it works (all uncommitted, see "Not committed"):
- `src/i18n/I18n.js`: translates at draw time (PIXI.Text setter, Canvas fillText/measureText, UIHelpers.wrapText,
  TextFit). Tables keyed by English text; `{0}` patterns; capitals; joins ("A · B", lines); named slots with word
  forms for dialogue via `I18n.fill` (`{piece|my}` etc., per-language `I18n.forms`); languages load lazily from
  `src/i18n/lang/<id>/{ui,characters,story,missions,world,training}.js`. New player gets system language;
  existing saves stay English until chosen. `src/i18n/names.js` = names every language keeps.
- Settings > Game tab: first row "Language" (`SettingsScreen._setLanguage`, rebuilds the screen).
- Fonts: `src/vendor/fonts/fonts.css` adds latin-ext + Cyrillic faces by unicode-range (Pixelify Sans from Google
  Fonts, Tiny5 for Cyrillic titles, OFL-Tiny5.txt added); Tiny5 credited in `CreditsScreen.js`.
- Layout fixes made generic for all languages: `PixiPremiumScene.fitLines` (wrap before shrinking),
  CustomGame All On/Off buttons size to label, Shop note description shrinks to fit, ThemeSelect card taglines use
  full width, WorldMap plate/tag names capped (`PLATE_NAME_W`, `TAG_NAME_W`) + `_unstackTags()` moves rival tags off
  place plates, StoryScene/Shop typed text translated whole (`__noI18n` on the typing Text).
- Tools: `node scripts/i18n.js stats|missing <lang>|stale <lang>`; layout checker
  `node scripts/i18n-check.mjs --port 9345 --out <dir> --langs en,fr [--only a,b] [--portrait]` (45 screens,
  reports only issues that English does not have, screenshots per language).

Progress:
- DONE: French (6 files) and Spanish (6 files): 100% of real texts. French checked on all 45 screens: 0 new layout
  issues except one map label overlap, since fixed in code (not re-checked yet).
- Portuguese (Brazil, "você"): ui, characters, story, missions, world written; **training.js missing**.
- Not started: Italian (`it`), German (`de`), Naš jezik (`hbs`), Russian (`ru`, names transliterated to Cyrillic).
- Glossaries/conventions used are in this session's French/Spanish files; worlds translated, character names kept
  (Russian: Cyrillic), informal address, chess moves stay in English SAN.

## Waiting for the owner
- Commit plan: the language work touches files that also hold other people's uncommitted changes
  (`src/index.html`, `src/main.js`, characters files...). Proposed: commit only once all 8 languages are done,
  file by file, after showing the owner the mixed files. Not committed yet.
- `?v=` cache tag still 56: bump when committing/deploying (fonts.css is `?v=5`).

## Done this session (no commits)
- Analysis of the game (reported in chat): tests 162/162 pass; issues spotted: "all ten opponents" text on story
  difficulty (15 stages), "Begin at Level 1" on save cards, Pawn Hollow white pieces low contrast on light
  squares, captured pieces shown as letters, two pop-up cards before the first fight, Great Board tile not
  looking locked, Pawn Hollow chapel spire reads as a cross from afar (`src/themes/scenes/pawnhollow.js` ~l.248).
- Language system and FR/ES/most of PT as above.

## Next, in order
1. `src/i18n/lang/pt/training.js` (copy structure of `es/training.js`).
2. Italian, German, Naš jezik, Russian: six files each, same keys as `fr/*.js`; Russian also needs Cyrillic
   names (give `I18n.add('ru', {'Pawnie': 'Пауни', ...})`) and case forms in `I18n.forms('ru', ...)`.
3. `node scripts/i18n.js stats` must show every language at FR's level; fix stale keys.
4. Restart the test copy and run `scripts/i18n-check.mjs` for all languages, landscape and `--portrait`; fix
   new issues in code; look at screenshots (German and Russian are the longest).
5. Update `AGENTS.md` (language system section, rule: new English text should get translations) and `README.md`.
6. Commit (waits for the owner's go on mixed files), bump `?v=`. Push/deploy: waits for the owner's go.

## Suggested skills
- `run` to launch the game; `code-review` before merging.

## Heads
- Repo: `claude/super-user` 5a7da63, ~320 uncommitted files from before this session (not ours) plus our
  language work. Codex: worktree `~/.codex/worktrees/ad-motion` on `codex/ad-motion` (3c156a1); branches
  `codex/assets-trial-library`, `codex/game-ad`.
- `?v=56` local; live tag not checked. Nothing pushed this session.
