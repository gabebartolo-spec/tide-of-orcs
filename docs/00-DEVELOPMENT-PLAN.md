# Let's Hunt Some Orc! — Development Plan (repo: tide-of-orcs)

**Version 1.8 · 2 Nov 2026 · Owner: Gabe**

v1.1 replaced the river (no fail state) with a barricade that can fall, forced Replant on a fall, and starlight-bought melee vanguard. v1.2 recorded M2 done and offline progress removed. v1.3 (31 Oct, evening) syncs with the code: M1 and M2 done, M3 done (TB-054 closed: `wallMult` 10 kept, targets reset; TB-085, TB-086 re-runs), M4 done except music and assets. v1.4 (1 Nov) syncs again: the arrow arsenal and the whole loot stack are on main, the tree grew to 104 nodes, the game is titled A Lot of Orcs (TB-115), and the M5 bug bash has run twice. v1.5 (1 Nov, night) adds §8, design directions from the active-incremental research (TB-145). v1.6 (1 Nov, late) drops the public release, Steam and testers from the roadmap: the team is the director and Claude. The itch page stays private (Restricted) as a proof of concept, kept up to date and ready to go live only if the director chooses; a commercial release is a maybe for later. `docs/prototype.html` (published as the Tide of Orcs artifact) is the original concept for tone and the core loop; mechanics have diverged since (GDD §14), and the docs now win over it. v1.7 (2 Nov) adds M4.10, the 2 Nov director's list (boss tiers, price by power, one-page camp, early-game tuning, mythics onto reach), and closes the open number questions in M4.5, M4.6 and §8. v1.8 (2 Nov, late) adds phone controls for the itch web build (TB-155) and the start-of-run elf flash fix to M4.10, narrows the mobile note in M5, and records the itch build of main at 8d20894. v1.9 (2 Nov, night) adds M4.11, the director's 2 Nov playtest list (vanguard line and march, wolf sprite and nerf, orcs join by wave, checkpoints, drawn meadow, no stand-in shapes), and records the itch build of main at ba521f8. Open work: TB-068 (sprite sheets) and TB-087 (new orcs, waiting on the director's edits to P-087).

## 1. Vision

An elf stands behind a timber barricade with a bow. Orcs come forever. Every orc you drop gives starlight; starlight either grows a branching grove of skills (wolves, rangers, hawks, treants, knives, lightning, ballistae, a stouter wall) or rallies spearmen and bladedancers to hold the line in melee. The wall will fall. When it does, the grove burns to a seed, you carry back Heartwood, and the next wall stands longer. You will lose the wall, and losing feeds the grove.

Tone: calm, cosy, slightly melancholy. ShredDead's "no fail state, satisfying grind" with Thronefall's soft pastoral palette and Esoteric Ebb's inky, lamplit UI.

The single-file prototype (`docs/prototype.html`) proves the loop. The plan below turns it into the finished game.

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
- Achievements.
- Commercial release (public itch page, Steam): a maybe for later, not planned (director, 1 Nov).
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
TB-068 status: ten models rigged; approved clips so far are grunt walk and attack, bladedancer attack, spearman attack. TB-087 (berserker, war drummer, shaman, wolf rider in game): draft behaviour, stats and wave mix in BALANCE P-087 (2 Nov), waiting on the director's edits.
- Final art: Tripo models → Cascadeur animation → sprite sheets for orcs, elf, vanguard, companions (ART-STYLE.md §Asset pipeline); vector draws remain the fallback. Wall weathering, parallax hills, day/night tinting, natural ground (ART-STYLE §Ground).
- Audio: ElevenLabs SFX and ambient bed, two music beds, ducking on wall fall and boss.
- Tree layout polish: branch curves, bloom on affordable nodes, camera easing.
- Settings, reduced-motion path, number formats.
**Done when:** a 60-second trailer can be captured without placeholder art.

### M4.5 — Arrow arsenal (TB-089) · **done** (PR #15, c069ff1); P-002 simmed 2 Nov, numbers kept
Six new nodes (43 → 49) giving the elf's lob distinct elemental arrows, each with its own VFX and ElevenLabs SFX. Numbers in BALANCE.md P-002, simmed 2 Nov on set F tiers: each node is a fair side buy (knocking one out moves best wave by about one), so they stand.

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
**Done when:** all six nodes buy and work in game, VFX and SFX play, tests cover each effect, the numbers are simmed. *(Met.)*

### M4.6 — Loot (TB-090–107) · **done**, all merged 31 Oct–1 Nov; mythic numbers retuned in TB-128 (M4.10)
Orcs drop gear; six worn slots, a satchel, affixes, sets and mythic powers feed `Stats`. Save v9.
- L0 data and rolls TB-090–093 (PR #12). L1 drops and satchel TB-094–096 (PRs #13, #14, #16). L2 glyph icons TB-097 (PR #18).
- L3 set engine TB-099 (PR #21) and mythic powers TB-100 (PR #22); save v8 keeps once-per-run gear state TB-110 (PR #23).
- L4 Spoils branch and Heartwood loot lines TB-101 (PR #25, save v9). L5 Glimmer reroll TB-102 (PR #29). L6 loot line in the run summary TB-103 (PR #30). L8 loot VFX TB-105 (PR #34). L9 loot telemetry TB-107 (PR #36).
- TB-114: affixes for features the player does not own no longer roll (director: gate them, 1 Nov).
**Done when:** drops, sets and mythics all work in game. *(Met. P-100 is superseded by P-128 for seven of eight mythics; Pale Moon stands.)*

### M4.7 — Tree and voice (1 Nov) · **done**
- Per-type upgrade nodes TB-111 (PR #31): 48 new nodes, tree 56 → 104.
- Rename pass in the elf's voice TB-115 (PR #35): every node, Heartwood line, set and mythic renamed; currency Teeth and Grudge; game title **A Lot of Orcs** (renamed **Let's Hunt Some Orc!** 1 Nov). Ids and saves unchanged.
- Tree keyboard access TB-116 (PR #38).
- Branch legend TB-117 (831aef2) and owned-parent tooltip TB-112 (f288c68).

### M4.8 — Look and feel (1 Nov) · **done**
- Heartwood, the game's own elf typeface TB-135 (c237d5d), now the only font, DOM and canvas TB-137 (ff134b3).
- Living-wood UI TB-136 (9d9fc56): forest green, gilded vine ground, Blender-carved frame and buttons; voluntary Replant mid-run restored.
- Fullscreen run and readable text TB-138 (54a4e37): field fits the window with overlay HUD; parchment text with ink halo; hills over grove and fence.
- Loot icons TB-131, quiver bob TB-134, orc clip speed fix TB-133.
- Real node names TB-130 (5b1aa11), aim circle 40 → 20 px TB-132 (871d50f).

### M4.9 — Director's list (1 Nov evening) · **done**
- Heartwood is spent only at a prestige TB-149 (PR #92): the Heartwood tree opens on the fall/Grove page, never mid-run.
- First-milestone sim TB-146 (PR #93): first Heartwood buy at the end of run 2; first boss on run 19–20 at 81–105 play minutes.
- Stacking sim TB-147 (PR #94, BALANCE P-147): additive stacking simmed against per-rank multiply; director kept multiply. `STACKING.add` stays as a sim switch.
- Performance at 1080p and 4K TB-150 (PR #95, QA run 4): 160 orcs at 119 fps (1080p) and 92 fps (4K); 60 fps holds at 4K down to a 4× slower CPU.
- Private itch page TB-073 (PR #96, #98): copy, three 1080p screenshots, kept Restricted.

### M4.10 — Director's list (2 Nov) · **done except TB-087**
- Early game tuning TB-154 (PR #101): no one-shot lobs, wall 150, `wallMult` 25 (BALANCE P-154).
- Camp pages fit one screen TB-153 (PR #102): Satchel, Replant and Settings never scroll; only the skill tree pans.
- Boss tiers, unlocked across runs TB-148 (PR #103, save v10): clear a boss at your highest tier to unlock the next; pick any unlocked tier at March. Set F in Current: orc HP ×2, starlight ×1.5 and boss Heartwood ×t per tier, up to 6.
- Price by power TB-151 (PRs #105, #108): G1 applied, Quick Draw 12, Keen Eye 30, Nimble Wrist 46 (BALANCE P-151).
- Arrow arsenal simmed TB-089 (PR #107): P-002 numbers kept.
- Mythics onto reach TB-128 (PRs #109–#114, 7409e52): all eight mythics now give the elf reach (faster draw or a wider catch), because the sim showed reach, not lob damage, decides the fall. Starfall and Thunder set B, reach versions of Knife, Kiln, Splinter and First Wolf (BALANCE P-128).
- Phone controls for the itch web build TB-155 (PR #117, e4911f2; director 2 Nov, "phones only"): hold-to-aim with the circle lifted above the finger, second finger free for Rally, portrait asks for landscape, short-landscape layout for run and camp. TB-153's no-scroll rule stays for PC. Itch page set Mobile friendly, Landscape.
- Start-of-run flash fixed (PR #116, a1083b4): the old vector elf no longer shows while the sprite atlas loads.
- New orcs TB-087: draft in BALANCE P-087 (PR #104), waiting on the director's edits. **Only open M4.10 item.**

### M4.11 — Director's playtest (2 Nov) · **done except TB-163**
- Vanguard TB-156, TB-167, TB-169, TB-170: a standing line at the wall that respawns on a timer (Swift Muster shortens it), walks out only to orcs past halfway, and turns back to face the field once home. Rally buttons gone.
- Grey Wolf TB-160, TB-157: an animated 3D-rendered wolf sprite (blam, CC BY) with run and bite; it costs 200, bites for 4 and sits under Muster.
- Orcs join by wave TB-158 (PR #135): runners from wave 5, brutes from 10, Blackguard from 20, at half rate until summoned; a summon node makes its kind march ×4 as often and drop +50% starlight.
- Checkpoints TB-159 (PR #136, save v11): clearing wave 10, 20, 30 … starts later runs one wave past it. Sim 60 min: best wave 18 → 32. Known: a fast fall loop at wave 12 farms Heartwood (director kept it for now).
- Field TB-162, TB-165, TB-166, TB-168: log-pile barricade, drawn meadow flowers, motes and sun shafts; 3D plants and all vector stand-ins removed.
- Animation speed TB-161: attacks play once per real hit at true speed.
- Open: TB-163 (arcane tree layout).

### M5 — Polish · bug bash run twice
- Private itch page as a proof of concept (TB-073, `docs/ITCH-PAGE.md`; builds via `itch.yml`): kept Restricted and up to date with each milestone; it goes public only if the director chooses. Latest build: main ba521f8 to `html5-dev`, 2 Nov (M4.10 and M4.11). Milestone tags stop at `m1`; later builds go out by manual workflow run.
- Save import/export (done in TB-065), version migration test suite (TB-140: every old save v1–v8 loads and plays).
- Bug bash (TB-075, `docs/QA-CHECKLIST.md`): runs 1 and 2 done (PRs #33, #37); their bugs became TB-112–117. Performance: no frame spikes in a visible browser with 160 orcs (TB-113); measured at 1080p and 4K with CPU throttling as a mid-range stand-in (TB-150, QA run 4): passes. Not yet on real mid-range hardware.

A full mobile port stays out of the roadmap (director, 31 Oct): the game is built for PC first. The itch web build does play on phones in landscape since TB-155 (2 Nov); TB-064/TB-078 layout work stays in the code.
**Done when:** the director calls it finished.

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
| Aiming feels like a chore, or the field feels dead when the player looks away | The lob is steady and forgiving (1.25 s, wide circle) so aiming is placement, not clicking; companions and vanguard keep fighting; each node has a battlefield-visible effect |
| The fail state feels like wasted time | Heartwood comes only from bosses (TB-171); the fallen screen shows what the run earned before it shows the button; ceremony ≤ 4 s and skippable |
| Canvas perf on phones with 200 orcs | Fixed-step sim, object pools, no per-frame allocations, batched draws by colour |
| Scope creep into "full tower defence" | Pillars 1 & 2; out-of-scope list is explicit |
| Save corruption in the wild | Versioned schema + migration tests + export/import |

## 7. Working method with Claude Code
See `docs/AGENT-TEAM.md`. Short version: the human owns GDD and BALANCE `## Current`; agents own implementation, tests, and `## Proposed` balance changes backed by sim output. One backlog item per PR.

## 8. Design directions from the active-incremental research (1 Nov, TB-145)
A deep-research pass (1 Nov) on active, run-based incrementals (Nodebuster, Deep Rock Galactic: Survivor, Vampire Survivors, Ball x Pit, Shroomstead). All twelve claims that survived checking come from wikis, reviews and player threads, not developer postmortems. These are directions. None changes `## Current` or a GDD core-loop section until the director approves it.

| # | Idea | Seen in | Where we stand | Next step |
|---|---|---|---|---|
| 1 | Meta currency is paid for **boss kills**, not distance, and each boss beaten opens a harder tier where orc stats and income rise together. Early runs are expected to fail at the first boss. | Nodebuster | P-142 already pays Heartwood from bosses (3 × floor(w/25)) plus a flat 1 per fall. Orc strength and income rise on the same wave curve with no tier step. | Built (TB-148): director chose unlock across runs. Clearing a boss at your highest tier unlocks the next named tide; pick any unlocked tier at March. Set F applied 2 Nov (BALANCE `TIERS`, P-148). Done. |
| 2 | **Bonuses add inside a stat; multipliers stay rare and gated.** Two +50% make +100%. Big multipliers come only from gated picks (weapon level 6/12/18, or two weapons sharing a tag). | DRG: Survivor | Every run-tree rank multiplies (`Math.pow(mult, rank)` in `stats.ts`), so deep lines compound and the late tree outruns the wave curve. | Simmed (TB-147, BALANCE P-147): adding with today's numbers nearly doubles the time to the first boss; adding with per-rank bonuses matched at rank 6 keeps pacing (84–91 min) and weakens 10-rank lines (×9.3 → ×5.7). **Decided 1 Nov (director): keep multiply.** Closed. |
| 3 | **Early ranks are cheap enough to buy at least one new upgrade after every run.** | Shroomstead players | A fall pays 1 Heartwood; the cheapest Heartwood nodes cost 2–3, so runs that fall before wave 25 need two falls per purchase. | Measured (TB-146, BALANCE §TB-146): first purchase at the end of run 2 (about 2 min); first boss on run 19–20 at 81–105 play minutes, then runs plateau at wave 27–28. |
| 4 | **Price by power.** Base price set by how strong the upgrade is (200 for damage, 900 for cooldown, 10 000 for a revive), plus a small global fee that rises with every purchase, so order of buying matters less. | Vampire Survivors PowerUps | Heartwood prices are hand-set per node; the run tree uses base × growth^rank × costWave. | Measured (BALANCE P-147): Quick Draw costs 4× Sharpened Tips per +1%; Gleaning and Iron Bolts sit at 75 and 40. Multiply kept (1 Nov). TB-151 priced the three rate nodes against this table; director applied G1 (2 Nov, BALANCE P-151): Quick Draw 12, Keen Eye 30, Nimble Wrist 46. Done for the run tree; Heartwood prices unchanged. |
| 5 | **Compounding reroll cost** (about ×1.4 per reroll). | DRG: Survivor | Glimmer rerolls already compound per item (P-102). | None; this confirms our rule. |
| 6 | **Calibrate meta strength.** Too weak feels pointless; too strong makes runs trivial. Repeatable upgrades go steep around level 20. | Ball x Pit, genre reviews | P-142 removed the Heartwood passive for this reason. | Keep the sim gate: a fresh save must still reach the first boss, and a full Heartwood tree must not skip it. |

**Gaps the research could not fill:** no published run length or run count before a game's first milestone, and nothing on Rogue Tower, Halls of Torment or Brotato. Our own sim has to answer those.
