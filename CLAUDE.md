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
| `docs/prototype.html` | **The central concept.** The playable single-file prototype every doc was derived from. Port it faithfully; when a doc is silent, do what the prototype does |

Priority when things disagree: the prototype's *behaviour* (what the player sees and feels) → the docs → the code. Docs marked `DRAFT` are proposals. If you change behaviour, update the doc in the same change. Do not extend `prototype.html` itself; it is frozen as the reference.

## Stack

- TypeScript, strict mode. Vite for dev/build. Vitest for tests.
- Rendering: HTML5 Canvas 2D (no engine). Pixel-free vector shapes, DPR aware.
- No runtime dependencies beyond what `docs/ARCHITECTURE.md` lists. Ask before adding one.
- Target: desktop and mobile browsers. Itch.io / static hosting first; Steam (Electron) later.

## External tools Gabe has
- **Tripo** (3D model generation), **Cascadeur** (animation), **ElevenLabs** (SFX/ambient). M4 presentation uses them per `docs/ART-STYLE.md` §Asset pipeline. Agents do not call these; they consume exported sheets and audio files placed under `public/`.

## Commands

```
npm install
npm run dev        # Vite dev server
npm run build      # production bundle to dist/
npm run test       # Vitest, headless
npm run lint       # eslint + tsc --noEmit
npm run balance    # runs sim/ headless balance report (see BALANCE.md)
```

Run `npm run lint && npm run test` before every commit. Do not commit if either fails.

## Non-negotiable design rules

1. **The only fail state is the barricade falling, and it always pays out Heartwood.** Nothing else reduces progress. A fallen run freezes and offers exactly one action: Replant.
2. **Idle-friendly.** The game must progress with zero input, and award offline starlight on return. Active play (tapping the field) is a bonus, never a requirement.
3. **Every number lives in `src/data/` or `docs/BALANCE.md` formulas.** No magic numbers in systems code.
4. **Skill tree is data.** Nodes are declared in `src/data/skillTree.ts`, matching `docs/SKILL-TREE.md`. Systems read effects from the derived `Stats` object, never from node ids.
5. **Save compatibility.** The save schema is versioned (`ARCHITECTURE.md` §Save). Add a migration for every schema change. Never break an existing save.
6. **Palette through tokens.** Colours come from `src/render/palette.ts`. No hex literals in render code.
7. **Performance budget.** 60 fps on a 2020 mid-range phone with 200 orcs on screen. Simulation is fixed-step and independent of render.

## Code conventions

- `src/sim/` is pure: no DOM, no canvas, no `Date.now()`. It takes `dt` and a seeded RNG. This is what tests and the balance simulator run.
- `src/render/` reads sim state and draws. It never mutates sim state.
- `src/ui/` is the DOM panel (tree, rally bar, fallen overlay, prestige, settings). It dispatches intents (`buy`, `rally`, `replant`, `tap`) to `GameController` in `src/game.ts`, which is the only caller into `src/sim/`.
- One file per entity type or system. Named exports. No default exports.
- Tests live beside the code as `*.test.ts`. Every formula in `BALANCE.md` has a test pinning its value at waves 1, 10, 25, 50.
- Commit messages: `area: what changed` (`sim: add silt drowning`, `tree: moonbow homing`). Reference the backlog id (`TB-012`).

## Working in this repo as an agent

- Claim a task in `docs/BACKLOG.md` by setting its owner before starting; mark it done with the commit hash when finished.
- Keep PRs to one backlog item. If you discover work, add a new backlog row; do not scope-creep.
- When a task needs a balance decision, propose numbers in `docs/BALANCE.md` under `## Proposed`, with the sim output that justifies them, and leave `## Current` alone until the human approves.
- Ask before: adding dependencies, changing save schema, renaming skill node ids, touching `docs/GDD.md` core-loop sections.
