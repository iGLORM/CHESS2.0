---
name: ho
description: Write the owner's session handoff for Chess 2.0 and give a short resume prompt. Use when the owner types /ho, or says "handoff", "write the handoff", "we need to compact", "I will restart Claude Code" or "new session". Writes a committed handoff file in docs/handoffs/ (never /tmp or the scratchpad), points memory to it, and ends with a copy-paste prompt that gets the next session (after /compact or in a fresh session) in sync at once. Also use when a session is resumed from a handoff file; then only summarize what was done and what is next, and wait for the owner.
argument-hint: "optional: what the next session will focus on"
---

# /ho: handoff + resume prompt

Goal: after a compaction or a Claude Code restart, the next session knows in one read where the work is, what is
running, what is waiting, what the owner decided and what comes next, without re-deriving anything.

RESUME RULE (owner, 2026-09-25): a session resumed from a handoff ONLY reads, checks what is running, gives the owner
a short summary (what was done, what is next) and then STOPS and waits for an instruction. It never starts a "Next"
step on its own, not even a read-only check, a screenshot or a brief, and a generic "continue" is not a go for a step
marked as waiting for the owner. Reason: a resumed session once started work the owner had not asked for.

Codex works in this repo too (see `AGENTS.md`, "Working Together"). It does not load this skill, but it can read
the handoff files, so write them for any agent: plain paths, no Claude-only shorthand.

## 1. Collect the facts first (tools, not memory)

Run these from the repo root (`/Users/yacineboufe/Documents/Projects/chess-2.0`). This is a Mac: no `nvidia-smi`,
use `ps`, `pgrep`, `lsof`.

- **The previous handoff:** `ls -t docs/handoffs/HANDOFF_*.md | head -1`, and the "NEWEST HANDOFF" memory line.
  Read it so the new file only covers what changed.
- **Git:** `git log --oneline <previous handoff's HEAD>..HEAD` (or the last day if there is none),
  `git branch --show-current`, `git status --short`. Uncommitted work: commit what is yours (explicit paths,
  `npm test` first, `claude/<task>` branch); list the rest as "not ours / not committed" without touching it.
  Changes you did not make may be Codex's or the owner's.
- **Other agents' work:** `git worktree list` (Codex worktrees live in `~/.codex/worktrees/`),
  `git branch --list 'codex/*' 'claude/*'`, `pgrep -fl codex`. Note each branch's head and whether it is
  merged into `main` (`git branch --merged main`).
- **Running work, ours:**
  - Background Bash tasks of this session (the harness lists them) and their output/STATUS files.
  - Game windows: `ps -axo pid,ppid,etime,command | grep -i '[e]lectron \.'` (a headless one has
    `CHESS2_HEADLESS=1` in its environment; check with the owner if unsure).
  - Listening ports: `lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(9333|3000|5173|8080)\b'`
    (9333 = CDP debug port, 3000 = Remotion Studio in `marketing/chess-ad/`).
  - Remotion renders, Python art scripts (`scripts/generate_*.py`), `node scripts/live-scene.js` runs:
    `pgrep -fl 'remotion|generate_|live-scene'`.
  - Live subagents (ListAgents), crons (CronList), scheduled tasks (scheduled-tasks `list_scheduled_tasks`),
    agent worktrees in `.claude/worktrees/`.
  - For each: what it is, where its output goes, expected end, and **dies with a restart: yes/no**. A process
    whose parent chain leads to this Claude Code process dies with it (`ps -o ppid= -p <pid>` up the chain);
    the owner's own Terminal launches and Codex sessions do not. Give the relaunch command.
- **The owner's save:** if this session backed up `localStorage` (`chess2_progress`) for automated play, say
  where the backup is and whether it was restored and confirmed after an app restart. A backup still waiting to
  be restored goes at the top of "Running now".
- **External heads:**
  - `git fetch origin --quiet`, then `git log -1 --oneline origin/main` and what waits to be pushed:
    `git for-each-ref --format='%(refname:short) %(upstream:short) %(upstream:track)' refs/heads`
    (branches with no upstream are unpushed too).
  - Web version: local cache tag `grep -o '?v=[0-9]*' src/index.html | sort | uniq -c` against the
    live one `curl -s --max-time 10 https://game.altobolt.com/ | grep -o '?v=[0-9]*' | sort -u`. Different tag
    means `src/` changes are not deployed; no answer (sandbox or site down) means write "live tag: not checked". Never deploy or push from this skill.

## 2. Write the file

Location: `docs/handoffs/HANDOFF_<YYYYMMDD>_<slot>.md`, slot from the local time (`date +%H`):
morning 05-11, midday 11-14, afternoon 14-18, evening 18-22, night 22-05 (a night after midnight keeps the
date it started on). If that file exists, add `_2`, `_3`. Create `docs/handoffs/` if missing. NEVER `/tmp`,
never the scratchpad, never outside the repo.

Sections, in this order, short lines, plain words, paths and commit hashes instead of copied content:

0. First lines of the file, verbatim:
   "How to resume: read this file and the files it lists, check what is still running, then give the owner a
   short summary (what was done, what is next) and WAIT for an instruction. Do not start any Next step on your own."
1. **Header:** date, time, why (compaction / restart / end of day), branch, the previous handoff, the files to
   read with it (usually `AGENTS.md`, plus `STORY_MODE_PLAN.md` for story work, a plan in `docs/superpowers/`,
   or the skill reference in use).
2. **Running now:** each job with output path, ETA, "dies with a restart: yes/no", relaunch command.
   "Nothing of ours" if empty. A save backup waiting to be restored goes first.
3. **Waiting for the owner:** open decisions (design, story, balance, deleting features, push, deploy), each
   with the options and the pick already proposed.
4. **Done since the previous handoff:** one line per result or change, with its commit hash. Mention when a
   UI change was checked with a screenshot and when `npm test` passed.
5. **Owner decisions and refusals:** what was decided today, what was refused and why ("do not reopen").
6. **Next, in order:** numbered steps, each with the file or plan it starts from (write a short brief in
   `docs/handoffs/briefs/` now if nothing covers it). Mark every step that needs the owner's go with
   "(waits for the owner's go)". These are proposals to choose from, not a work queue for the next session.
7. **Suggested skills** for the next session: which skill before which step (`pixel-scene` for scenes and
   characters, `run` to launch the game, `code-review` before merging, `codex-delegate` to hand work to Codex,
   the `.agents/skills/pixijs-*` references for PixiJS work).
8. **Heads:** repo branch + HEAD, `main` and `origin/main`, Codex branches/worktrees, the `?v=NN` tag local vs
   live, `npm test` result, and "nothing waits to be pushed" or the list.

If the owner passed an argument, put that focus first in "Next". Redact secrets: no bot or API tokens, VPS
address or SSH details beyond the alias `vps`, no save contents, no email addresses. Do not duplicate what already
lives in `AGENTS.md`, `STORY_MODE_PLAN.md`, a plan, a README or a commit message: reference it by path.

## 3. Make it findable

- Commit the handoff by explicit path: `git add docs/handoffs/<file>` (and any brief), never `git add -A`, `.`
  or `git stash`. Run `npm test` first (the repo rule for every commit) and note the result under Heads. No
  `?v=NN` bump: nothing in `src/` changed. If the current branch is `main`, ask the owner before committing
  there; otherwise commit on the current branch. End the message with the Co-Authored-By line.
- Point memory to it: in `~/.claude/projects/-Users-yacineboufe-Documents-Projects-chess-2-0/memory/`, write
  `newest-handoff.md` (type `project`: the path, date, branch, the previous handoff) and keep one line in
  `MEMORY.md`: `- [NEWEST HANDOFF](newest-handoff.md) — docs/handoffs/<file> (previous: <file>)`.
  Update that line, never add a second one.
- Tidy: stop subagents that are idle and whose work is committed; delete crons this session created that are no
  longer needed. List stale agent worktrees in `.claude/worktrees/` and Codex worktrees in the handoff, but do not
  remove them without the owner's yes.

## 4. Reply to the owner (short)

- Two to four lines: what the handoff records, what is still running and whether a restart kills it, when it is
  safe to restart or `/compact`.
- Then the resume prompt in one code block, ready to paste, for example:

```
Read docs/handoffs/HANDOFF_20260928_evening.md (and the files it lists) and check what is still running.
Then give me a short summary: what we have done, and what the next steps are. Then wait for me to tell you
what to do. Do not start any step.
```

Keep the prompt under 4 lines and name the exact handoff path. Never write "continue with the Next list" in it.

## 5. When a session is resumed from a handoff

Read the handoff and its listed files, check what is running (the checks in step 1: background jobs, Electron,
ports, Codex, agents, crons, heads), then reply with:
- **Done:** the few lines that matter from "Done since the previous handoff" and the current heads.
- **Running:** what is still running, or "nothing of ours".
- **Waiting for the owner:** the open decisions.
- **Next:** the numbered list, with each step's "waits for the owner's go" mark.

Then stop and wait. No tool call that changes anything, no agent, no brief, no screenshot, no test run for a Next
step until the owner names what to do.
