# Tide of Orcs — Development Plan

**Version 1.1 · 30 Oct 2026 · Owner: Gabe**

v1.1 replaced the river (no fail state) with a barricade that can fall, forced Replant on a fall, and starlight-bought melee vanguard. The playable reference is `docs/prototype.html`, published as the Tide of Orcs artifact.

## 1. Vision

An elf stands behind a timber barricade with a bow. Orcs come forever. Every orc you drop gives starlight; starlight either grows a branching grove of skills (wolves, rangers, hawks, treants, knives, lightning, ballistae, a stouter wall) or rallies spearmen and bladedancers to hold the line in melee. The wall will fall. When it does, the grove burns to a seed, you carry back Heartwood, and the next wall stands longer. You will lose the wall, and losing feeds the grove.

Tone: calm, cosy, slightly melancholy. ShredDead's "no fail state, satisfying grind" with Thronefall's soft pastoral palette and Esoteric Ebb's inky, lamplit UI.

The single-file prototype (`docs/prototype.html`) proves the loop. The plan below turns it into a shippable game.

## 2. Pillars (every decision checks against these)

1. **Losing feeds the grove.** The barricade falling is the only fail state and it always pays Heartwood. There is never a loss with nothing to show. No decay, no timers that hurt.
2. **The tree is the game; the wall is the clock.** Buying a node is the core verb and each node visibly changes the battlefield. Starlight spent on vanguard buys time; starlight spent on nodes buys the next run.
3. **Watchable.** The field should be pleasant to leave on a second monitor. Idle progress is real progress.
4. **Short feedback loops, long horizon.** A new node every 1–3 minutes early; prestige runs of 30–60 minutes; weeks of content through prestige scaling.

## 3. Scope

### In scope for 1.0
- Endless waves with 4 orc types + warboss, difficulty scaling.
- Barricade with health, regen, Thornwall, Deep Roots; forced Replant when it falls; run summary.
- Vanguard: Spearman and Bladedancer rallied with starlight, lanes, engage/death.
- Skill tree with 6 branches, 34 nodes (SKILL-TREE.md), branching layout, pan/zoom.
- Companions: wolf, ranger, warden, hawk, treant.
- Weapons: knives, fire arrows, storm, ballista, moonbow.
- Prestige (Replant), forced and voluntary, with Heartwood plus six permanent Heartwood upgrades (a small second tree).
- Offline progress, autosave, save import/export.
- Settings: audio volume, reduced motion, number format.
- Audio: ambient wind-and-grove loop, ~14 SFX (incl. wall hits, rally, fall), 2 music beds.
- Mobile layout.

### Out of scope for 1.0 (candidates for 1.x)
- Multiple maps / biomes.
- Achievements and Steam integration.
- Named hero companions with their own trees.
- Cloud saves.
- Localisation (but all strings go through one table from day one).

## 4. Milestones

Each milestone ends with a playable build and a doc pass. Durations assume one developer plus Claude Code agent teams; treat as sequencing, not promises.

### M0 — Foundation (week 1) · **done, tag `m0`**
Goal: a correct engine with the whole prototype ported.
- Repo, Vite+TS, lint, tests, CI.
- Fixed-step sim loop, render loop, DPR canvas, resize.
- Seeded RNG, `Stats` derivation, save/load with schema v1 and migration scaffold.
- `src/data/` populated from SKILL-TREE.md and BALANCE.md; formula tests passing.
- Headless `sim/` runner that plays N minutes with a scripted buy policy and prints a report.
**Done when:** `npm run balance` prints wave-reached and starlight curves for a 30-minute auto-run. *(Met. M0 also absorbed most of M1 because the port was mechanical.)*

### M1 — Vertical slice (weeks 2–3)
Goal: parity with the prototype, properly built.
- Remaining from the port: tree pan/zoom, offline on `visibilitychange`, River-id save migration.
- Balance pass #0: resolve BALANCE.md P-001 so the first wall falls at wave 12–18 and the second run can fall by wave 30.
- Mobile layout check.
**Done when:** a new player's first wall falls between minute 5 and 8, they understand why, and their second run is visibly stronger.

### M2 — Companions & armoury (week 4)
- Wolf, ranger/warden, hawk, treant; knives, fire, storm, ballista.
- Each with a distinct telegraph and hit effect (ART-STYLE.md §Motion).
- Kinship scaling, bounty, horde.
**Done when:** every node in SKILL-TREE.md is implemented and visibly does something.

### M3 — Prestige (week 5)
- Replant ceremony (grove burns, seed falls) for both the forced and the voluntary path.
- Heartwood tree (BALANCE.md §Heartwood).
- Run summary screen (waves, slain, starlight/min, time).
- Balance pass #1 via the simulator: first prestige at 30–45 min, second at ~35 min of a fresh run.
**Done when:** three consecutive prestige runs each feel faster than the last.

### M4 — Presentation (weeks 6–7)
- Final art: orc silhouettes, elf and companions, wall weathering, parallax hills, day/night cycle tinting.
- Audio (ambient, SFX, music beds, ducking on flood/boss).
- Tree layout polish: branch curves, bloom on affordable nodes, camera easing.
- Mobile layout and touch targets.
- Settings, reduced-motion path, number formats.
**Done when:** a 60-second trailer can be captured without placeholder art.

### M5 — Ship (week 8)
- Balance pass #2 with telemetry from testers (local JSON export, no server).
- Save import/export, version migration test suite.
- Itch.io page, web build, Electron wrapper spike for Steam.
- Bug bash, performance budget verified on phone.
**Done when:** build is public on itch.

## 5. Definition of done (any task)
- Code matches ARCHITECTURE.md module boundaries.
- Numbers come from data/formulas, with tests.
- Doc updated in the same commit.
- `npm run lint && npm run test` green.
- Backlog row marked done with commit hash.

## 6. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Balance plateau: player stalls before prestige unlocks | Headless simulator from M0; prestige threshold tuned by sim, not vibes |
| Idle games feel hollow | Each node has a battlefield-visible effect; watchability pillar |
| The fail state feels like wasted time | Heartwood formula pays from wave 6; the fallen screen shows what the run earned before it shows the button; ceremony ≤ 4 s and skippable |
| Canvas perf on phones with 200 orcs | Fixed-step sim, object pools, no per-frame allocations, batched draws by colour |
| Scope creep into "full tower defence" | Pillars 1 & 2; out-of-scope list is explicit |
| Save corruption in the wild | Versioned schema + migration tests + export/import |

## 7. Working method with Claude Code
See `docs/AGENT-TEAM.md`. Short version: the human owns GDD and BALANCE `## Current`; agents own implementation, tests, and `## Proposed` balance changes backed by sim output. One backlog item per PR.
