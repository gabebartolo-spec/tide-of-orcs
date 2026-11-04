# Working with Claude Code sessions

How parallel Claude Code sessions share this repo without tripping over each other.

## No roles
There is no lead, sim, render, ui, balance, rigger or critic agent (director, 29 Oct 2026). Each session is a plain Claude session that does its whole task itself and reports straight to the director. Art QA (director, 3 Nov): before any UI or art capture reaches the director, the session spawns independent critic agents and fixes every flaw they find until clean; then every image, capture and clip goes to the director, who is the final judge. The director never merges.

## Order of work (director, 3 Nov 2026)
Build all features → bug bash → performance → balance. No balance tuning or balance sims until the earlier stages are done.

## Interfaces to keep stable
Parallel sessions build against these; change them only inside the PR that needs the change, and update the doc in the same commit:
- `SimState` and `Stats` shapes (ARCHITECTURE.md §SimState, SKILL-TREE.md §Derived Stats).
- `SimEvent` union in `src/sim/events.ts`.
- `GameController` intents in `src/game.ts` (ARCHITECTURE.md §UI).
- Node ids in SKILL-TREE.md and Heartwood ids in BALANCE.md §Heartwood tree (renaming one needs the director).

Save fixtures live in `src/save/fixtures/` (v1–v14; current schema v15). There is no shared midgame fixture; build one with `createState()` plus `levels` in the test, or load a saved player such as `sim/out/player48.json` through the dev handle (QA-CHECKLIST run 5).

## Session protocol
1. Read `CLAUDE.md`, the docs for the area, and the project handoff file. Claim the row in `BACKLOG.md` (owner, status `doing`).
2. Branch per row (`tb-012-orc-movement`), worktree if other sessions are active. Commit style from CLAUDE.md.
3. Before opening a PR: `npm run lint && npm run test` green, docs updated in the same commit, backlog row marked.
4. The session merges its own PR by hand once CI is green (no auto-merge on this repo); fix red CI until green. Mark the row `done <hash>`.
5. End of session: a few lines in `docs/log/YYYY-MM-DD.md` (what merged, what's open, what was learned).

Never commit straight to `main`.

## Rules of engagement
- One backlog row per PR. Discovered work becomes a new backlog row, not scope creep.
- Balance numbers: propose under `BALANCE.md ## Proposed` with the sim report; never edit `## Current` without the director.
- Don't invent nodes, orc types or mechanics. Icebox ideas go in BACKLOG.md Icebox with one line each.
- Paid tools (Tripo, Meshy, ElevenLabs) are used by sessions only with the director's written spend yes for that job.
- When blocked, write what you tried in the backlog row and ask the director directly.
