# Working with Claude Code agent teams

How to split this project across parallel Claude Code agents without them tripping over each other.

## Roles
| Agent | Owns | Must not touch |
|---|---|---|
| **lead** | Backlog grooming, PR review, merging, doc consistency, M-level integration | Writing feature code |
| **sim** | `src/sim/**`, `src/data/**`, `sim/` runner, balance tests | `render/`, `ui/` |
| **render** | `src/render/**`, ART-STYLE compliance | `sim/` (reads state only) |
| **ui** | `src/ui/**`, `index.html`, panel/HUD/settings, strings | `sim/` internals (calls controller only) |
| **save** | `src/save/**`, migrations, export/import | Everything else |
| **balance** | Runs policies, writes `BALANCE.md ## Proposed` with evidence | `## Current` |
| **audio** (M4) | `src/audio/**` | Everything else |

One agent per role per session. `lead` is optional for small sessions; then Gabe is lead.

## Interfaces that let agents work in parallel
These are frozen unless lead approves (listed as they stand at 8791ac2, 31 Oct 2026):
- `SimState` and `Stats` shapes (ARCHITECTURE.md §SimState, SKILL-TREE.md §Derived Stats).
- `SimEvent` union in `sim/events.ts`: `kill`, `hit`, `impact`, `wave`, `bossReady`, `bossStart`, `bossEnd`, `storm`, `hawkDive`, `treantStamp`, `bite`, `barricadeHit`, `barricadeRegrow`, `barricadeFell`, `vanguardRallied`, `vanguardHit`, `vanguardFell`, `bought`, `hwBought`, `replant`.
- `GameController` methods (`src/game.ts`): `tick(dt)`, `setAim(x, y)`, `clearAim()`, `buy(id)`, `rally(type)`, `summonBoss()`, `buyHw(id)`, `canReplant()`, `replant()`, `telemetry()`, `toSave()`, `save()`, `exportSave()`, `importSave(str)`, `wipe()`.
- Node ids in SKILL-TREE.md and Heartwood ids in BALANCE.md §Heartwood tree.

Render and UI agents can build against a stub state; there is no shared midgame fixture yet (build one with `createState()` plus `levels` in the test, or add `src/sim/fixtures/midgame.ts` as a backlog row). Save fixtures live in `src/save/fixtures/` (`v1.ts`; v2–v5 saves are inline in `src/save/save.test.ts`). Sim agents build the real thing. Integration is a lead task at the end of each milestone.

## Session protocol
1. `lead` (or Gabe) posts the milestone goal and assigns backlog ids to roles.
2. Each agent: read `CLAUDE.md`, the docs for its area, then claim rows in `BACKLOG.md` (set owner, status `doing`) in a tiny commit before coding.
3. Branch per row: `tb-012-orc-movement`. Commit style from CLAUDE.md.
4. Before opening a PR: lint + tests green, doc updated, backlog row → `review`.
5. `lead` reviews against the doc, not against taste. Merges in dependency order. Sets `done <hash>`.
6. End of session: `lead` writes a 10-line `docs/log/YYYY-MM-DD.md` (what merged, what's blocked, what was learned).

This protocol (claim, branch per row, PR, review, session log) is expected. Most sessions on 30–31 Oct skipped it and committed straight to `main` with no 31 Oct log until the doc audit; don't repeat that.

## Rules of engagement
- Never edit a file outside your role's folders. If you need a change there, add a backlog row and `@mention` the role in the PR description.
- Balance numbers: propose, don't change. Include the sim report path.
- If a doc is wrong, fix the doc in a separate small PR titled `docs: ...` so lead can merge it first.
- Don't invent nodes, orc types or mechanics. Icebox ideas go in BACKLOG.md Icebox with one line each.
- When blocked for more than ~15 minutes, stop and write what you tried in the backlog row.

## Suggested prompts
**Balance agent, M3 close-out (TB-054)**
> You are the `balance` agent. Read CLAUDE.md, docs/GDD.md §2–§4 and §14, and docs/BALANCE.md. Claim TB-054. TB-080 (wall ×10) made the first run fall at wave 4–5 around minute 1.6, which superseded three pacing targets. First, propose new pacing targets for the wall ×10 design under `## Proposed` (first fall, run-over-run growth, bare archer, time to the first boss wave), with greedy, wall, nobuy and dps runs on seeds 1–10 (`npm run balance -- --policy P --minutes 40 --seed N --quiet`; the summary prints every fall). Once Gabe signs off the targets, propose constants that hit them. Do not edit `## Current`.

**Perf agent, M5 (TB-072)**
> Claim TB-072. Build with `npm run build` and `npm run preview`, open on a 2020 mid-range Android (or Chrome's 4× CPU throttle and a 375×812 viewport). Push a run to `ORC_CAP` (160 orcs) with Storm, Hawk, Ballista and Split Shot owned and record fps and allocations per frame in `step` and `field.draw`. Fix hot spots inside your role's folders only; report numbers in the backlog row and the session log.

**Audio agent, M4 (TB-063)**
> You are the `audio` agent. Read docs/ART-STYLE.md §Asset pipeline and §M4 presentation additions, and `src/audio/engine.ts`. Claim TB-063: two music beds under `public/audio/` (silent until the files land, like the SFX), a crossfade on the `replant` event, and ducking under the cues marked `duck: true` in `CUES`, as the ambient bed does. Add any constants to `src/data/audio.ts` with tests.

**Balance agent, recurring**
> You are the `balance` agent. Run greedy, wall, nobuy and dps policies for 60 sim-minutes each. Compare against BALANCE.md pacing targets. Write findings and proposed constants under `## Proposed` with report links. Do not edit `## Current`.
