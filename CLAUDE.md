# Tide of Orcs — Claude Code guide

Tide of Orcs is a relaxing incremental tower-defence game. A lone elf archer holds a timber barricade against an endless orc tide, rallies melee vanguard with starlight, grows a branching skill tree of weapons, companions, wall and economy, and replants the grove (prestige) for permanent Heartwood bonuses when the wall falls. Read `docs/00-DEVELOPMENT-PLAN.md` first, then the document that covers the area you are working in.

## Documents (source of truth, in priority order)

| File | Owns |
|---|---|
| `docs/00-DEVELOPMENT-PLAN.md` | Milestones, scope per phase, definition of done |
| `docs/GDD.md` | Game design: core loop, the barricade and fail state, vanguard, waves, companions, prestige, UX |
| `docs/SKILL-TREE.md` | Every node: id, branch, parent, ranks, cost, effect. Data, not prose |
| `docs/BALANCE.md` | All formulas and pacing targets. Change numbers here, never inline |
| `docs/ARCHITECTURE.md` | Code structure, modules, save format, loop, rendering |
| `docs/ART-STYLE.md` | Palette tokens, shape language, typography, motion |
| `docs/BACKLOG.md` | Epics and tasks, status, which agent owns what |
| `docs/RELEASE.md` | itch.io builds per milestone (tag `m1`, `m2` … to ship) |
| `docs/AGENT-TEAM.md` | How agent teams split work on this repo |
| `docs/prototype.html` | The original concept: tone, look and the core loop. Frozen. Mechanics have deliberately diverged since (GDD §14), so don't port from it |

Priority when things disagree: the docs (GDD, BALANCE, SKILL-TREE, ARCHITECTURE) → the code → the prototype. Docs marked `DRAFT` are proposals. **If you change behaviour, update the doc in the same commit**; docs drifted badly on 30–31 Oct because sessions skipped this. If you deliberately diverge from the prototype, add a row to GDD §14. Never edit `prototype.html`.

## Stack

- TypeScript, strict mode. Vite for dev/build. Vitest for tests.
- Rendering: HTML5 Canvas 2D (no engine). Pixel-free vector shapes, DPR aware.
- No runtime dependencies beyond what `docs/ARCHITECTURE.md` lists. Ask before adding one.
- Target: desktop browsers (mobile port later, once the PC web build is done). Itch.io / static hosting first; Steam (Electron) later.

## External tools Gabe has
- **Tripo** (3D model generation), **Cascadeur** (animation), **ElevenLabs** (SFX/ambient). M4 presentation uses them per `docs/ART-STYLE.md` §Asset pipeline. Agents do not call these; they consume exported sheets and audio files placed under `public/` (not created yet; the sprite and audio loaders fall back silently until files land).

## Commands

```
npm install
npm run dev        # Vite dev server
npm run build      # production bundle to dist/
npm run test       # Vitest, headless
npm run lint       # eslint + tsc --noEmit
npm run balance    # runs sim/ headless balance report (see BALANCE.md)
npm run desktop    # build, then open the Electron desktop shell (desktop/main.cjs)
```

Run `npm run lint && npm run test` before every commit. Do not commit if either fails.

## Non-negotiable design rules

1. **The only fail state is the barricade falling, and it always pays out Heartwood (at least 1).** Nothing else reduces progress. A fallen run freezes; Replant is its only run action (the Heartwood tree and Settings stay usable).
2. **Incremental, aim-to-play.** The elf shoots only while the player aims: the pointer over the plain places a strike circle, and the bow lobs an arcing arrow there on its own cadence (2.5 s before Quick Draw); everything in the circle takes damage. With no aim the elf holds fire; companions and vanguard always fight on their own. There is no offline progress: nothing accrues while the game is closed or the tab is hidden. There is no click-to-shoot and no tap bonus, ever.
3. **Every number lives in `src/data/` or `docs/BALANCE.md` formulas.** No magic numbers in systems code.
4. **Skill tree is data.** Nodes are declared in `src/data/skillTree.ts`, matching `docs/SKILL-TREE.md`. Systems read effects from the derived `Stats` object, never from node ids.
5. **Save compatibility.** The save schema is versioned (`ARCHITECTURE.md` §Save). Add a migration for every schema change. Never break an existing save.
6. **Palette through tokens.** Colours come from `src/render/palette.ts`. No hex literals in render code.
7. **Performance budget.** 60 fps in a desktop browser on a mid-range PC with 160 orcs on screen (`ORC_CAP`). Simulation is fixed-step and independent of render.

## Code conventions

- `src/sim/` is pure: no DOM, no canvas, no `Date.now()`. It takes `dt` and a seeded RNG. This is what tests and the balance simulator run.
- `src/render/` reads sim state and draws. It never mutates sim state.
- `src/ui/` is the DOM panel (tree, rally bar, fallen overlay, prestige, settings). It dispatches intents (`buy`, `rally`, `replant`, `setAim`, `clearAim`, `summonBoss`, `buyHw`) to `GameController` in `src/game.ts`, which is the only caller into `src/sim/`.
- One file per entity type or system. Named exports. No default exports.
- Tests live beside the code as `*.test.ts`. Every formula in `BALANCE.md` `## Current` has a test; the wave curves are pinned at waves 1, 10, 25, 50.
- Commit messages: `area: what changed` (`sim: summon brutes (TB-080)`, `tree: moonbow homing`). Reference the backlog id (`TB-012`).

## Working in this repo as an agent

- End each session by adding a few lines to `docs/log/YYYY-MM-DD.md`: what merged, what's open, what you learned.

- Claim a task in `docs/BACKLOG.md` by setting its owner before starting; mark it done with the commit hash when finished.
- Work on a branch per backlog row and open a PR (`tb-054-balance-pass`); don't push straight to `main`. Keep PRs to one backlog item. If you discover work, add a new backlog row; do not scope-creep.
- When a task needs a balance decision, propose numbers in `docs/BALANCE.md` under `## Proposed`, with the sim output that justifies them, and leave `## Current` alone until the human approves.
- Ask before: adding dependencies, changing save schema, renaming skill node ids, touching `docs/GDD.md` core-loop sections.
