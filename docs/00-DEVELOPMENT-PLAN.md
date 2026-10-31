# A Lot of Orcs — Development Plan (repo: tide-of-orcs)

**Version 1.4 · 1 Nov 2026 · Owner: Gabe**

v1.1 replaced the river (no fail state) with a barricade that can fall, forced Replant on a fall, and starlight-bought melee vanguard. v1.2 recorded M2 done and offline progress removed. v1.3 (31 Oct, evening) syncs with the code: M1 and M2 done, M3 done (TB-054 closed: `wallMult` 10 kept, targets reset; TB-085, TB-086 re-runs), M4 done except music and assets. v1.4 (1 Nov) syncs again: the arrow arsenal and the whole loot stack are on main, the tree grew to 104 nodes, the game is titled A Lot of Orcs (TB-115), and the M5 bug bash has run twice. `docs/prototype.html` (published as the Tide of Orcs artifact) is the original concept for tone and the core loop; mechanics have diverged since (GDD §14), and the docs now win over it.

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

### M4 — Presentation (weeks 6–7) · **done except TB-068** (sprite sheets, Gabe). Done: ElevenLabs SFX and ambient bed TB-069, sprite loader TB-060, parallax/day-dusk TB-061, audio engine TB-062, music beds TB-063 (PR #9), mobile TB-064, settings TB-065, tree polish TB-066, strings TB-067, attack and hit VFX TB-088, field ground TB-098 (tufts, rocks, worn patches).
TB-068 status: ten models rigged; approved clips so far are grunt walk and attack, bladedancer attack, spearman attack. TB-087 (berserker, war drummer, shaman, wolf rider in game) waits on the director's design for behaviour, stats and wave mix.
- Final art: Tripo models → Cascadeur animation → sprite sheets for orcs, elf, vanguard, companions (ART-STYLE.md §Asset pipeline); vector draws remain the fallback. Wall weathering, parallax hills, day/night tinting, natural ground (ART-STYLE §Ground).
- Audio: ElevenLabs SFX and ambient bed, two music beds, ducking on wall fall and boss.
- Tree layout polish: branch curves, bloom on affordable nodes, camera easing.
- Settings, reduced-motion path, number formats.
**Done when:** a 60-second trailer can be captured without placeholder art.

### M4.5 — Arrow arsenal (TB-089) · **done** (PR #15, c069ff1); P-002 numbers still proposed and not yet simmed
Six new nodes (43 → 49) giving the elf's lob distinct elemental arrows, each with its own VFX and ElevenLabs SFX. Numbers are proposals (BALANCE.md §Proposed P-002) until the director approves.

| Node | Branch, after | Ranks | What it does |
|---|---|---|---|
| Rebound (`bounce`) | Bow, Longshaft | 4 | A magic bolt leaps from the strike to the nearest orc within 120, then on: 2 bounces at rank 1, +1 per rank. Each bounce deals 60% of the last. |
| Starfall (`starfall`) | Bow, Moonbow | 1 | Every 10th lob also rains 8 arrows straight down on random orcs across the plain. |
| Frost Arrows (`frost`) | Armoury, Fire Arrows | 5 | Struck orcs are chilled 3 s: march and swing slowed 20% at rank 1, +5% per rank (40% at rank 5). |
| Shatter (`shatter`) | Armoury, Frost Arrows | 5 | A chilled orc that dies bursts, hitting orcs within 50 for 100% lob damage, ×1.4 per rank. |
| Shock Arrows (`shock`) | Armoury, Storm Glade | 1 | Lightning jumps from the strike to 3 orcs outside the circle (within 90) for 30% damage. |
| Thunderclap (`stun`) | Armoury, Shock Arrows | 1 | Struck orcs are stunned 0.5 s (no move, no swing). |

Fire Arrows gains a strike flame VFX and SFX. Every effect is render-pooled VFX plus one SFX cue: fire, bounce, shock, stun, frost, shatter, starfall.
Spend: director gave a written yes with no cap on ElevenLabs credits for these SFX (31 Oct); first pass 7 cues × 2 takes, about 233 credits.
**Done when:** all six nodes buy and work in game, VFX and SFX play, tests cover each effect, the director has approved the numbers.

### M4.6 — Loot (TB-090–107) · **done**, all merged 31 Oct–1 Nov; P-100–P-102 numbers proposed
Orcs drop gear; six worn slots, a satchel, affixes, sets and mythic powers feed `Stats`. Save v9.
- L0 data and rolls TB-090–093 (PR #12). L1 drops and satchel TB-094–096 (PRs #13, #14, #16). L2 glyph icons TB-097 (PR #18).
- L3 set engine TB-099 (PR #21) and mythic powers TB-100 (PR #22); save v8 keeps once-per-run gear state TB-110 (PR #23).
- L4 Spoils branch and Heartwood loot lines TB-101 (PR #25, save v9). L5 Glimmer reroll TB-102 (PR #29). L6 loot line in the run summary TB-103 (PR #30). L8 loot VFX TB-105 (PR #34). L9 loot telemetry TB-107 (PR #36).
- Open: TB-114, affixes for features the player does not own roll and do nothing; reroll, gate or label them is the director's call.
**Done when:** drops, sets and mythics all work in game. *(Met; numbers wait on the director.)*

### M4.7 — Tree and voice (1 Nov) · **done except TB-112, TB-117**
- Per-type upgrade nodes TB-111 (PR #31): 48 new nodes, tree 56 → 104.
- Rename pass in the elf's voice TB-115 (PR #35): every node, Heartwood line, set and mythic renamed; currency Teeth and Grudge; game title **A Lot of Orcs**. Ids and saves unchanged.
- Tree keyboard access TB-116 (PR #38).
- Open: TB-117 branch legend over node labels (PR #39 open), TB-112 tooltip says "needs" for an owned parent.

### M5 — Ship (week 8) · local telemetry done (TB-070 f31ce6b, loot events TB-107); bug bash run twice
- Balance pass #2 with telemetry from testers (TB-071; local JSON export, no server; export built).
- Save import/export (done in TB-065), version migration test suite.
- Itch.io page and web build (TB-073), Electron wrapper spike for Steam (TB-074).
- Bug bash (TB-075, `docs/QA-CHECKLIST.md`): runs 1 and 2 done (PRs #33, #37); their bugs became TB-112–117. Performance: no frame spikes in a visible browser with 160 orcs (TB-113); still untested on a mid-range PC.

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
