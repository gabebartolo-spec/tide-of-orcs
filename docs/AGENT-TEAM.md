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
These are frozen after M0 unless lead approves:
- `SimState` and `Stats` shapes (ARCHITECTURE.md).
- `SimEvent` union in `sim/events.ts`.
- `GameController` methods: `buy(id)`, `rally(type)`, `replant()`, `setAim(x,y)`, `clearAim()`, `save()`, `wipe()`, `exportSave()`, `importSave(str)`.
- Node ids in SKILL-TREE.md.

Render and UI agents build against these from M0 using a stub state (`sim/fixtures/midgame.ts`: wave 18, wolf+ranger+knives owned, 60 orcs). Sim agents build the real thing. Integration is a lead task at the end of each milestone.

## Session protocol
1. `lead` (or Gabe) posts the milestone goal and assigns backlog ids to roles.
2. Each agent: read `CLAUDE.md`, the docs for its area, then claim rows in `BACKLOG.md` (set owner, status `doing`) in a tiny commit before coding.
3. Branch per row: `tb-012-orc-movement`. Commit style from CLAUDE.md.
4. Before opening a PR: lint + tests green, doc updated, backlog row → `review`.
5. `lead` reviews against the doc, not against taste. Merges in dependency order. Sets `done <hash>`.
6. End of session: `lead` writes a 10-line `docs/log/YYYY-MM-DD.md` (what merged, what's blocked, what was learned).

## Rules of engagement
- Never edit a file outside your role's folders. If you need a change there, add a backlog row and `@mention` the role in the PR description.
- Balance numbers: propose, don't change. Include the sim report path.
- If a doc is wrong, fix the doc in a separate small PR titled `docs: ...` so lead can merge it first.
- Don't invent nodes, orc types or mechanics. Icebox ideas go in BACKLOG.md Icebox with one line each.
- When blocked for more than ~15 minutes, stop and write what you tried in the backlog row.

## Suggested prompts
**Balance agent, M1 kickoff (first job after M0)**
> You are the `balance` agent. Read CLAUDE.md and docs/BALANCE.md. Resolve P-001: test each candidate in `## Proposed` one at a time with `npm run balance -- --policy greedy --minutes 25 --seed N --quiet` for seeds 1–3, record first-fall wave and second-run fall wave, and write the comparison table under P-001. Recommend one change. Do not edit `## Current`.

**Render agent, M1**
> You are the `render` agent. Read CLAUDE.md, docs/ARCHITECTURE.md, docs/ART-STYLE.md. Claim TB-021 (tree pan/zoom) in docs/BACKLOG.md: drag to pan, wheel/pinch to zoom, hit-test in logical space, camera ease to the selected node. Keep render/tree.ts free of sim mutation. Open docs/prototype.html for the intended look.

**Save agent, M1**
> You are the `save` agent. Claim TB-028: write migration 1→2 that drops deprecated River node ids from `run.levels`, add a v1 fixture with those ids under `test/fixtures/`, and bump CURRENT_VERSION. Then TB-023: credit offline starlight on `visibilitychange` as well as on load.

**Balance agent, M3**
> You are the `balance` agent. Run greedy, wall, nobuy and dps policies for 60 sim-minutes each. Compare against BALANCE.md pacing targets. Write findings and proposed constants under `## Proposed` with report links. Do not edit `## Current`.
