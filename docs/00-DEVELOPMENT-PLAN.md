# Tide of Orcs — Development Plan

**Version 1.3 · 31 Oct 2026 · Owner: Gabe**

v1.1 replaced the river (no fail state) with a barricade that can fall, forced Replant on a fall, and starlight-bought melee vanguard. v1.2 recorded M2 done and offline progress removed. v1.3 (31 Oct, evening) syncs with the code: M1 and M2 done, M3 done (TB-054 closed: `wallMult` 10 kept, targets reset; TB-085, TB-086 re-runs), M4 done except music and assets. `docs/prototype.html` (published as the Tide of Orcs artifact) is the original concept for tone and the core loop; mechanics have diverged since (GDD §14), and the docs now win over it.

## 1. Vision

An elf stands behind a timber barricade with a bow. Orcs come forever. Every orc you drop gives starlight; starlight either grows a branching grove of skills (wolves, rangers, hawks, treants, knives, lightning, ballistae, a stouter wall) or rallies spearmen and bladedancers to hold the line in melee. The wall will fall. When it does, the grove burns to a seed, you carry back Heartwood, and the next wall stands longer. You will lose the wall, and losing feeds the grove.

Tone: calm, cosy, slightly melancholy. ShredDead's "no fail state, satisfying grind" with Thronefall's soft pastoral palette and Esoteric Ebb's inky, lamplit UI.

The single-file prototype (`docs/prototype.html`) proves the loop. The plan below turns it into a shippable game.

## 2. Pillars (every decision checks against these)

1. **Losing feeds the grove.** The barricade falling is the only fail state and it always pays Heartwood. There is never a loss with nothing to show. No decay, no timers that hurt.
2. **The tree is the game; the wall is the clock.** Buying a node is the core verb and each node visibly changes the battlefield. Starlight spent on vanguard buys time; starlight spent on nodes buys the next run.
3. **Watchable and hands-light.** The field is pleasant to watch and companions and vanguard fight on their own, but the game does not idle: nothing progresses without the player aiming the bow.
4. **Short feedback loops, long horizon.** A new node every 1–3 minutes early; prestige runs of 30–60 minutes; weeks of content through prestige scaling.

## 3. Scope

### In scope for 1.0
- Endless waves with 4 orc types (grunt, plus runner, brute and elite summoned by Grove nodes), scripted boss waves with the Warboss every 10 waves, difficulty scaling.
- Barricade with health, regen, Thornwall, Deep Roots; forced Replant when it falls; run summary.
- Vanguard: Spearman and Bladedancer rallied with starlight, lanes, engage/death.
- Skill tree with 6 branches, 43 nodes (SKILL-TREE.md), branching layout, pan/zoom.
- Companions: wolf, ranger, warden, hawk, treant.
- Weapons: knives, fire arrows, storm, ballista, moonbow.
- Prestige (Replant), forced and voluntary, with Heartwood plus five permanent Heartwood upgrades (a small second tree, BALANCE.md §Heartwood tree).
- Autosave, save import/export (no offline progress).
- Settings: audio volume, reduced motion, number format.
- Audio: ambient wind-and-grove loop, 16 SFX cues (`src/data/audio.ts`, incl. wall hits, rally, fall), 2 music beds.

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

### M1 — Vertical slice (weeks 2–3) · **done**, tag `m1` 53b391d (TB-078 9bfcc0e cleared the last blocker after the tag)
Goal: parity with the prototype, properly built.
- ~~Remaining from the port: tree pan/zoom, River-id save migration.~~ Done (TB-021 ede6878, TB-028 ffe9c82; save schema reached v2 then, v6 now).
- ~~Balance pass #0 (TB-025):~~ Done (P-001 resolved): first wall fell minute 5–7, wave 12–18; run 2 at wave 25–29. TB-080 (wall ×10) since moved the first fall to wave 4–5 at about minute 1.6 by design; TB-054 reset the targets to match (first fall wave 4–6, ~minute 2; breakout past wave 15 within 15 min).
- ~~Mobile layout check~~ Done 31 Oct at 375×812: no horizontal scroll, tree draws and fits. One blocker, TB-078: the fallen overlay hides Replant. Touch targets and touch copy go to TB-064 (M4).
**Done when:** a new player's first wall falls around minute 2 (wave 4–6, since TB-080/TB-054), they understand why, and their second run is visibly stronger.

### M2 — Companions & armoury (week 4) · **done**
- Wolf, ranger/warden, hawk, treant; knives, fire, storm, ballista.
- Each with a distinct telegraph and hit effect (ART-STYLE.md §Motion).
- Kinship scaling, horde.
*(Met: all ported in M0; flame particles TB-035 e221d10, Kinship/Horde tests TB-039 a2e391d (Bounty since retired by TB-081). Rule-break fixes TB-076/077 c189562. Sim `dps` policy TB-040 b96cd93.)*
**Done when:** every node in SKILL-TREE.md is implemented and visibly does something.

### M3 — Prestige (week 5) · **done** (TB-054 1185a3a: director kept `wallMult` 10, pacing targets reset; TB-085 dps re-run, TB-086 spearman re-measure)
- ~~Replant ceremony (grove burns, seed falls) for both the forced and the voluntary path.~~ Done (TB-051 5fcc939).
- ~~Heartwood tree (BALANCE.md §Heartwood) and save schema v6.~~ Done (TB-053, TB-055 dd09286; Warlords 3cc1563).
- ~~Run summary screen (waves, slain, starlight/min, time).~~ Done (TB-052 4bd58c9).
- Boss waves (TB-081 e3b4536) landed in this window too.
- ~~Balance pass #1 via the simulator (TB-054):~~ Done 1185a3a: re-set the pacing targets for the wall ×10 design, then tune; original aim was first prestige at 30–45 min, second at ~35 min of a fresh run. Measured now: greedy breaks out after 4–6 short runs (6–12 min), reaches the wave-35 ceiling around 14 min run time.
**Done when:** three consecutive prestige runs each feel faster than the last.

### M4 — Presentation (weeks 6–7) · **done except TB-063** (music beds), **TB-068** (sprite sheets, Gabe) and **TB-069** (ElevenLabs SFX, Gabe). Done: sprite loader TB-060, parallax/day-dusk TB-061, audio engine TB-062, mobile TB-064, settings TB-065, tree polish TB-066, strings TB-067.
- Final art: Tripo models → Cascadeur animation → sprite sheets for orcs, elf, vanguard, companions (ART-STYLE.md §Asset pipeline); vector draws remain the fallback. Wall weathering, parallax hills, day/night tinting.
- Audio: ElevenLabs SFX and ambient bed, two music beds, ducking on wall fall and boss.
- Tree layout polish: branch curves, bloom on affordable nodes, camera easing.
- Settings, reduced-motion path, number formats.
**Done when:** a 60-second trailer can be captured without placeholder art.

### M5 — Ship (week 8) · local telemetry done (TB-070 f31ce6b)
- Balance pass #2 with telemetry from testers (local JSON export, no server; export built).
- Save import/export, version migration test suite.
- Itch.io page, web build, Electron wrapper spike for Steam.
- Bug bash, performance budget verified in a desktop browser.

Mobile is out of the roadmap (director, 31 Oct): the web build ships for PC first; a mobile port comes after it is perfect on PC. TB-064/TB-078 layout work stays in the code.
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
| Aiming feels like a chore, or the field feels dead when the player looks away | The lob is slow and forgiving (2.5 s, wide circle) so aiming is placement, not clicking; companions and vanguard keep fighting; each node has a battlefield-visible effect |
| The fail state feels like wasted time | Heartwood pays at least 1 from any wave (floor since TB-080); the fallen screen shows what the run earned before it shows the button; ceremony ≤ 4 s and skippable |
| Canvas perf on phones with 200 orcs | Fixed-step sim, object pools, no per-frame allocations, batched draws by colour |
| Scope creep into "full tower defence" | Pillars 1 & 2; out-of-scope list is explicit |
| Save corruption in the wild | Versioned schema + migration tests + export/import |

## 7. Working method with Claude Code
See `docs/AGENT-TEAM.md`. Short version: the human owns GDD and BALANCE `## Current`; agents own implementation, tests, and `## Proposed` balance changes backed by sim output. One backlog item per PR.
