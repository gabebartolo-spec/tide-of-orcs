# Balance — formulas and pacing targets

Two sections. `## Current` is what ships and is human-owned. `## Proposed` is where agents put changes, each with the simulator output that justifies it. Nothing moves from Proposed to Current without Gabe's sign-off. `src/data/balance.ts` mirrors `## Current` and the tests pin the reference tables.

## Current (v1.2)

### Field
- Logical size 900 × 480. Barricade at x = 150, 14 px wide. Elf at (64, 240). Vanguard stand at x = 194 in lanes H/2 ± 70k.
- Wave length `WAVE_LEN = 24 s`. Wave starts at 1. Fixed step 1/50 s.

### Orc scaling (w = wave)
```
hp(w)       = 10 × 1.17^(min(w,15)−1) × 1.30^max(0, w−15)   ramp from wave 15 (P-001)
loot(w)     = 2  × 1.13^(w−1)
interval(w) = max(0.3, 2.0 × 0.93^(w−1))   seconds between grunt spawns; kind k every interval × every_k / 1.2^swarm_k; paused during a boss wave
boss wave: unlocks every 10 waves, 60 s script, clear bonus = 40 × waveLoot(w) × starMult × (1 + 0.5 × hw_boss rank)
speed       = base × (1 + 0.008 w)
atk         = 0.025 × maxhp                  per swing, one swing per second, vs vanguard
wall hit    = 10 × atk                        per swing vs the barricade (TB-080: bare run falls at wave 3–4, ~90 s)
```
Type multipliers and unlocks in GDD §4. Per kind: Fury ×1.3^r health, ×1.4^r starlight; Swarm ×1.2^r spawn rate (grunts: War Drums, Call the Horde). Live orc cap 160.

### The elf's lob (TB-079)
```
lobCd   = 2.5 / 1.15^draw          seconds between shots; fires only while aimed
radius  = 40 × 1.2^wide            strike circle, px
dmg     = 3 × player dmg           to every orc within radius + orc radius
flight  = 0.7 s, apex 90 px; Longshaft repeat strikes 0.35 s apart; Split Shot arrows land within 0.6 × radius
```
Rangers and Wardens keep straight volleys at `fireRate = 1.2 × 1.15^draw` per second, with `arrows` (Split Shot) in the fan, `pierce` (Longshaft), crit and Moonbow steering.

| w | hp | loot | interval | grunt atk/s (vs vanguard) | grunt wall hit/s (×10) |
|---|---|---|---|---|---|
| 1 | 10 | 2 | 2.00 | 0.25 | 2.5 |
| 10 | 41.1 | 6.0 | 1.04 | 1.03 | 10.3 |
| 25 | 1,242 | 37.6 | 0.35 | 31.0 | 310 |
| 50 | 876,233 | 797.8 | 0.30 | 21,906 | 219,058 |

### Player and sources
- Base damage 9, base fire rate 1.2 volleys/s (rangers/wardens only; the elf lobs), arrow speed 520, crit ×3. (9 since P-001, 2026-10-30; v1.0 had 4 and 1.1; raised because the bare archer's 4.4 dps was below wave-1 incoming HP of 5 hp/s and the river had been hiding it.)
- Burn: 35% of player dmg per second for 3 s (refreshes, no stack).
- Storm: 4× dmg × kin per jump, 6 s cooldown, 5 targets, 140 px jump radius, seeks from 200 px past the wall.
- Hawk: 2.5× dmg × kin, 4 s, 60 px radius. Treant: 3× dmg × kin, 3 s, 160 px from the wall.
- Ballista: 40 × 1.5^bolt × kin every 4 s, infinite pierce. Knives: 5 × 1.35^nimble × kin every 1.4 s ÷ 1.2^nimble.
- Moonbow: the strike circle settles on the nearest orc within 70 px of the aim point (`aimHomingRadius`). The lob's reward for aiming is `LOB.dmgMult` 3 to every orc in the circle.
- Node multipliers (`NODE_FX` in `src/data/balance.ts`): Sharpen ×1.25^r dmg, Moonbow ×1.6 dmg, Quick Draw ×1.15^r fire rate and ÷1.15^r lob cooldown, Wide Volley ×1.2^r radius, Keen Eye +0.08 crit per rank, Gleaning ×1.15^r starlight, Kinship ×1.2^r companion and vanguard dmg, Fangs ×1.4^r wolf dmg, Nimble Wrist ×1.2^r knife rate and ×1.35^r knife dmg, Iron Bolts ×1.5^r ballista dmg. Per-kind Fury/Swarm (incl. War Drums and Call the Horde for grunts) are `FOE_FX` in `src/data/orcs.ts`: ×1.3^r hp, ×1.4^r loot, ×1.2^r spawn rate.

#### Other constants in `src/data/` (reference, not previously listed)
| Constant | Value | File |
|---|---|---|
| `PLAYER.fanRad` | 0.09 rad between ranger arrows | balance.ts |
| `SOURCES.wolf` | base 6, bite every 0.5 s, speed 210 px/s, reach 22 px | balance.ts |
| `SOURCES.archerDmgFrac`, `archerOffsetY` | 0.7 × player dmg × kin; 90 px above/below the elf | balance.ts |
| `SOURCES.knives.speed`, `ballista.speed` | 640, 760 px/s | balance.ts |
| `VANGUARD.walkSpeed`, `engageRange` | 60 px/s; orcs within r + 18 px engage a vanguard | balance.ts |
| `ORC_TYPES` | hp/speed/loot/radius/spawn multiples per kind (GDD §4) | orcs.ts |
| `BOSS_WAVE`, `BOSS_SCRIPT` | every 10 waves, 60 s, clear loot 40 × waveLoot; 8 mini-waves, 28 orcs | bosses.ts |
| `HW_FX` | Early Dawn +2 waves/rank, Stout Timber +0.25/rank, Warlords +0.5/rank | heartwood.ts |
| `SKY` (render only) | 600 s day cycle, dusk alpha 0.85, two hill bands, lamp radius 150 | presentation.ts |
| `AUDIO`, `CUES` (audio only) | gains, ducking, per-cue throttles | audio.ts |

### Barricade
```
barMax   = 400 × (1 + 0.25 × hw_timber) × 1.25^timber × heart
regen    = 0.01 × repair × barMax per second
spikes   = 0.2 × spikes × dmg per second to each orc hacking the wall
Deep Roots: once per run, regrow to 0.5 × barMax instead of falling
```
| timber | barMax (heart 0) |
|---|---|
| 0 | 400 |
| 3 | 781 |
| 5 | 1,221 |
| 10 | 3,725 |

### Vanguard
```
cost(spear, w) = 6  × loot(w)     hp = 5 × hp(w) × 1.3^shield × heart   dmg = 1.6 × dmg × 1.3^drill × kin / 0.8 s   reach 28
cost(blade, w) = 18 × loot(w)     hp = 4 × hp(w) × 1.3^shield × heart   dmg = 1.4 × dmg × 1.3^drill × kin / 0.45 s  reach 34, cleave
cap = 2 + ranks        mend = 0.03 × mend × maxhp per second
```
| w | spear cost | spear hp | blade cost |
|---|---|---|---|
| 1 | 12 | 50 | 36 |
| 10 | 36 | 205 | 108 |
| 25 | 226 | 6,209 | 677 |

### Economy
- Provoke is per kind now (TB-080, see Fury/Swarm above). Blood Banners retired.
- Node price at purchase: `cost = round(base × growth^rank × 1.25^max(0, w − 10))` (wave-scaled since P-001; ×1 to wave 10, ×28.4 at 25, ×7,523 at 50).
- `starMult = 1.15^glean × heart`. Heartwood: `heart = 1 + 0.12 × HW`, applied to damage, starlight, barricade HP and vanguard HP.

### Prestige
- Forced on barricade fall; voluntary from wave 12. `HW = max(1, floor((w − 4) × 0.75) + floor(runKills / 400))`. The floor of 1 keeps rule 1 (a fall always pays out) now that runs fall at wave 3–4.

### Pacing targets (what the sim must hit)
Status measured 31 Oct 2026 at 8791ac2, seed 1, 25 min, player model `crowdAim` (except "no aim"). Greedy falls: waves 5, 5, 7, 5, 24 (minutes 1.6, 3.3, 5.8, 7.6, 16.9). Nobuy falls: wave 4 at 1.5 min, then waves 5–6 every ~2 min (13 falls). No aim at all: falls at wave 2–3 every ~0.8 min.

| Target | Value | Status |
|---|---|---|
| First purchase | ≤ 30 s | met: 16 s (greedy) |
| Muster affordable | ≤ 2 min | met: 50 starlight earned by 56 s (greedy never buys it in run 1) |
| First barricade fall, first run | wave 4–6, minute 1.5–2.5 (TB-080 `wallMult` 10: early runs are short on purpose; director, 2026-10-31) | met: wave 5, minute 1.6–1.8 (greedy and dps, seeds 1–3, TB-054) |
| A spearman earns its keep | buys at least as many seconds of wall life per starlight as a Seasoned Timber rank (median over waves 3/6/10/14, seeds 1–3) | met, barely: median ratio 1.06, 7 of 12 cases ≥ 1 at `wallMult` 10 (`sim/spearman.ts`, TB-086); was 1.5 before TB-080 |
| Breakout | a run passes wave 15 within 15 min of total play | met: greedy after 4–6 short runs (6–12 min), that run falls at wave 24–26 (TB-054) |
| Bare archer, no purchases, holds | ≥ 4 waves | met (falls wave 4–5) |
| Tree fully bought in a run | never | met: 117 of 156 buyable ranks at most (greedy run 5) |

## Heartwood tree (M3, built TB-053)
Bought with Heartwood, never reset. Costs in HW. Spending does not lower the passive `heart` bonus: `heart` counts all Heartwood earned, and the tree spends from `available = earned − spent`. The header shows `available / earned` once anything is spent. Early Dawn's skipped boss waves are not owed (`bossDone` starts at `floor(startWave / 10)`). Standing Orders spearmen are placed free, ignoring Muster and the line cap.

| id | Name | Max | Cost | Effect |
|---|---|---|---|---|
| hw_dawn | Early Dawn | 5 | 2, 4, 8, 14, 22 | Start each run at wave +2 |
| hw_wolf | Old Friend | 1 | 3 | Start with Grey Wolf |
| hw_timber | Stout Timber | 3 | 4, 8, 16 | Barricade base HP +25% |
| hw_orders | Standing Orders | 2 | 5, 12 | Start each run with one Spearman (two at rank 2) |
| hw_boss | Warlords | 3 | 6, 12, 24 | Boss wave clear bonus +50% per rank (director chose the effect 2026-10-31; numbers proposed, unplaytested) |
| hw_find | Far Sight | 3 | 2, 5, 12 | Item Find +15 / 35 / 60% total (TB-101, P-101) |
| hw_fortune | Fortune's Favour | 3 | 3, 8, 20 | Luck +10 / 25 / 45% total |
| hw_satchel | Deep Satchel | 1 | 4 | Satchel holds 80. Needs Far Sight 1 |
| hw_tithe | Warboss Tithe | 1 | 10 | Bosses always drop 2 items. Needs Far Sight 2, Fortune 1 |
| hw_heirloom | Heirloom | 1 | 15 | One worn item gains +5 ilvl each Replant, past the cap; affixes rescale. Needs Fortune 2 |
| hw_glimmer | Glimmerwork | 1 | 6 | Salvage +1 Glimmer; reroll cost ×0.6 (TB-102). Needs Deep Satchel |

## Simulator (`npm run balance`)
Lives in `sim/run.ts`. Runs `src/sim/` headless at 50 steps/s and decides every 0.5 s with a policy:
- **greedy**: rally a spearman (bladedancer if owned) when the wall is under 50%; otherwise buy the cheapest affordable node.
- **wall**: like greedy but rallies at 90% and weights Barricade/Vanguard nodes at half cost.
- **nobuy**: never spends. Measures the bare archer.
- **dps** (TB-040, built): every 15 s, trial the 6 cheapest affordable nodes over a 120 s lookahead (save-like restart, empty field) and buy the best Δ earned ÷ cost. Re-run TB-085 (wallMult 10, 30 min, seeds 1–3): Heartwood 26/55/53 vs greedy 22/23/27; best wave 30/35/35 vs 33/28/26. All six first fall at wave 5 by minute 1.8; dps breaks out at minute 10/7.6/7.6 of run time vs greedy 9.2/9.7/10.3, and on seeds 2–3 reaches the wave-35 ceiling inside 30 min. Same Heartwood as the pre-TB-054 figures: those were already at wallMult 10, only the "first fall" label was wrong.

Loot flags (TB-108): `--hw hw_find:2,hw_fortune:1` starts with Heartwood ranks; `--bare` never wears gear; `--tune 'BOSS_WAVE.every=50,RARITY.weights.legendary.1=8'` overrides data for a sweep. Bosses are summoned when ready; the equip policy wears a set once 4+ of its slots are owned. The report ends with loot milestones (first drop, first of each rarity as run/minute/boss, first 6-piece set, bosses) and the run played on to its fall worn vs bare.

Report columns per minute: wave, starlight, kills/min, kills, wall %, vanguard count, nodes owned, HW, falls. Summary line gives the first fall wave, every fall wave in order (`Falls:`), replants, Heartwood, best wave. (Before TB-084 the "First fall" field printed the last fall.) Writes `sim/out/<policy>-<date>.md` unless `--quiet`. CI runs 30 minutes of greedy as a smoke test.

## Proposed

### P-002 · Arrow arsenal numbers (TB-089, 2026-10-31, from the director's mechanics; not yet simmed)
All in `ARROWS` (`src/data/balance.ts`). Rebound: jump 120, falloff 0.6 per bounce, bolt speed 420, hops 1 + rank. Shock: 3 targets, 0.3 × lob dmg, jump 90. Thunderclap: 0.5 s. Frost: 3 s, slow 0.2 + 0.05 × (rank − 1). Shatter: radius 50, 1.0 × dmg × 1.4^(rank − 1). Starfall: every 10th lob, 8 arrows, r 26, 0.6 s fall, 0.08 s stagger, lob damage each; each aims where its orc will be on landing, held no closer than the wall's face. Costs in SKILL-TREE.md. Sim run pending.

### P-001 · First-run fall is too early; second run snowballs (2026-10-30, from M0 bring-up)
Evidence: `npm run balance --policy greedy --minutes 20` seeds 1–3: first fall at wave 7–9 with 2–3 HW; the second run then reaches wave 42–44 with the wall never under 100% and 120 nodes bought.

Diagnosis: (a) brute share grows fast enough that the first run can't buy Shieldwall/Timber in time; (b) Call the Horde (+20% spawn per rank at 160 base) is pure upside once DPS exceeds incoming, and `heart` multiplies damage, starlight, wall and vanguard at once, so 2 HW is ~+25% on everything.

Candidates to test (one at a time, same seeds):
1. Heartwood +12% → +8%, and apply it to damage and starlight only (not wall/vanguard HP).
2. Call the Horde also raises orc atk by 10%/rank, so it's a trade.
3. Brute share base 0.18 → 0.12 for waves < 8.
4. Barricade base 400 → 600 and Seasoned Timber 1.25 → 1.2.

Target after change: first fall wave 12–18 on seeds 1–3; second run falls by wave 30.

#### Results (2026-10-30, greedy, 25 min, seeds 1 / 2 / 3)
Measured with a harness identical to `sim/run.ts` greedy that records each fall (the report's "First fall at wave" line actually prints the *last* fall). "Run 2" is the wave the second run fell at; every run 2 fell before minute 25 (at 19–24 min).

| Change | First fall wave | HW from run 1 | Run 2 falls at wave | Meets target? |
|---|---|---|---|---|
| Baseline | 9 / 7 / 8 | 3 / 2 / 3 | 46 / 45 / 45 | no |
| C1 heart +8%, dmg + starlight only | 9 / 7 / 8 | 3 / 2 / 3 | 43 / 41 / 45 | no |
| C2 Horde +10% orc atk/rank | 9 / 7 / 8 | 3 / 2 / 3 | 43 / 45 / 45 | no |
| C3 brute base 0.12 below wave 8 | 10 / 8 / 10 | 4 / 3 / 4 | 46 / 46 / 47 | no |
| C4 wall 600, Timber ×1.2 | 12 / 8 / 9 | 6 / 3 / 3 | 49 / 41 / 46 | no |
| C3 + C4 | 10 / 10 / 10 | 4 / 4 / 4 | 47 / 47 / 47 | no |
| C1 + C2 + C3 + C4 | 10 / 10 / 10 | 4 / 4 / 4 | 41 / 45 / 41 | no |
| All four + `waveHP` growth 1.17 → 1.19 (diagnostic) | 9 / 9 / 10 | 3 / 3 / 4 | 12 / 41 / 40 | no |
| All four + `waveHP` growth 1.17 → 1.21 (diagnostic) | 9 / 8 / 9 | 3 / 3 / 3 | 12 / 12 / 12 | no |

C1 drops Heartwood from barricade and vanguard HP and keeps it on player and companion damage (`kin`).

Finding: none of the four candidates, alone or together, reaches either target. The run is **bistable**: it either falls around wave 8–12, or it gets past that point and runs to wave 40–47. Starting a fresh run with 0 / 1 / 2 / 3 HW gives first falls of 7–9 / 9–45 / 45–46 / 41–47. One or two Heartwood flips a run from one outcome to the other. Past the hump, greedy maxes all 121 nodes by about wave 27 and coasts until orc HP overtakes it. So the snowball doesn't come from the size of the Heartwood bonus. It comes from the run having no pressure in the middle: income (`waveLoot` 1.13 per wave ÷ `waveInterval` 0.93) keeps pace with threat (`waveHP` 1.17 per wave ÷ 0.93). The candidates only move where the cliff sits by a wave or two. The `waveHP` diagnostic shows the same thing: steepening HP growth moves run 2 straight from 41 to 12, with nothing between.

Recommendation: don't adopt any of the four as the P-001 fix. Of the candidates, C3 + C4 is the only one worth keeping on its own merits, because it makes the first fall consistent (wave 10 on all seeds). Even so, it misses 12–18 and does nothing for run 2. The real fix needs a mid-game lever that bends the curve smoothly instead of flipping it. Options to test next: a softer late `waveHP` ramp that kicks in at a wave (e.g. ×1.17 to wave 15, then ×1.20), `waveLoot` growth tied to that ramp, or node cost growth that stops the tree maxing by wave 27. A director decision is needed before that sweep.

#### Mid-game lever sweep (2026-10-30, greedy, 25 min)
Same harness. "Ramp K/R" means `waveHP` keeps ×1.17 per wave up to wave K, then grows ×R per wave. Seeds 1 / 2 / 3 unless noted.

| Change | First fall wave | Run 2 falls at wave |
|---|---|---|
| C3 + C4 + wall 900 or 1200 | 11 / 11 / 11 | 49–50 |
| C3 + C4 + ramp 15/1.20 to 18/1.22 (any wall 600–1200) | 10–11 | 40–45 |
| C3 + C4 + node cost growth ×1.1 / ×1.2 / ×1.3 | 9–10 | 41–48 |
| C3 + C4 + `waveLoot` growth 1.11 / 1.09 | 8–10 | 46–48 |
| C3 + C4 + boss HP 28 → 14, or ~0 | 10 / 10 / 10 | 44–49 |
| Ramp 15/1.30 | 9 / 7 / 8 | 34 / 31 / 33 |
| Ramp 15/1.40 | 9 / 7 / 8 | 31 / 30 / 30 |
| Player base damage 6 → 9 | 12 / 13 / 12 | 49 / 49 / 50 |
| Damage 9 + ramp 15/1.50 | 12 / 13 / 12 | 29 / 29 / 29 |
| Damage 9 + ramp 15/1.50, seeds 4–10 | 21 / 21 / 24 / 21 / 12 / 28 / 21 | 31 / 31 / 31 / 31 / 29 / 32 / 31 |
| Damage 8 + ramp 15/1.50, seeds 1–10 | 12 / 10 / 21 / 21 / 11 / 11 / 11 / 12 / 21 / 12 | 28–31 |
| Damage 7 + ramp 15/1.50, seeds 1–10 | 9 / 8 / 11 / 12 / 21 / 10 / 21 / 10 / 9 / 21 | 28–31 |

What this shows:
- **Run 2 is set by the maxed tree, not by economy.** Loot growth, node cost growth, wall HP and boss HP leave it at 41–50. Greedy maxes the tree whatever it earns, and the run falls once orc HP outgrows the full tree's damage. Only orc HP growth moves it.
- **A steep ramp hits the run 2 target on every seed:** ×1.50 per wave after wave 15 puts run 2 at 28–32 on all ten seeds. The cost is that it becomes a hard ceiling. Over 60 minutes the falls go 12, 29, 33, 36, 38 (baseline: 9, 46, then about 38 and still climbing at minute 60). Heartwood grows linearly against ×1.50 per wave, so each replant buys about 2–3 more waves.
- **The first-fall target isn't reliably reachable with these levers.** The first fall is bimodal at any base damage, landing at either wave 9–13 or wave 21–28 depending on seed, with nothing between. Damage 9 gets 12–13 on seeds 1–3 only by luck; seeds 4–10 mostly land at 21. Boss HP doesn't cause the jump (removing bosses changes nothing).

Recommendation: adopt **ramp 15/1.50** only if a hard ceiling around wave 30–40 is the intended shape. If prestige should keep pushing waves outward, use a gentler ramp (1.30, run 2 at 31–34) and accept missing the ≤30 target. Don't adopt a base-damage change for the first fall until the bimodality is understood. The next step is tracing what kills run 1 at wave ~10 versus ~21 (rally timing, or the order greedy buys nodes in). Neither `## Current` nor code has changed.

#### Proposal: run 2 half of P-001 (director picked the gentler ramp, 2026-10-30)
```
hp(w) = 10 × 1.17^(min(w,15) − 1) × 1.30^max(0, w − 15)
```
Waves 1–15 are unchanged. This deliberately misses the run 2 ≤ 30 target by a few waves, so prestige keeps pushing waves outward.

| Greedy, ramp 15/1.30 | Seeds 1–10 |
|---|---|
| First fall wave | 9 / 7 / 8 / 9 / 10 / 7 / 8 / 9 / 8 / 8 (unchanged; the ramp starts after these) |
| Run 2 falls at wave | 34 / 31 / 33 / 32 / 35 / 34 / 35 / 34 / 31 / 32 |
| All falls in 60 min, seeds 1 / 2 / 3 | 9, 34, 40, 47 · 7, 31, 40, 46 · 8, 33, 40, 47 |

The first-run half (wave 12–18) stays open until the bimodality is traced. Applying this needs `hp(w)` changed in `## Current` and `waveHP` in `src/data/balance.ts`, plus its pinned tests at waves 25 and 50. `vanBaseHp` also derives from `waveHP`, so vanguard HP scales with the ramp too; that needs a check before applying.

#### First-fall bimodality trace (2026-10-30)
A per-12 s trace of run 1 (base damage 9, seeds 1 and 4) shows one shared crisis at wave 12: live orcs jump from ~18 to ~30 and 10–18 of them reach the wall. Seed 1 had 41 starlight banked, rallied one spear, and fell at wave 12. Seed 4 had 219, rallied two, held at 3% wall, then took off: starlight went 219 → 870 by wave 21 → 3.9M by wave 45, and the full tree was bought by wave 26. Past wave 12, kills feed damage faster than `waveHP` grows. So the run has a tipping point, not a slope: it either breaks at the wave-12 surge or snowballs.

Tests on seeds 1–10 (first fall wave, run 2 wave):

| Change | First falls (seeds 1–10) | What it shows |
|---|---|---|
| Greedy saves starlight for a rally below 80% wall, damage 6–9 | Still split; damage 9 gives 12 / 12 / 12 / 16 / 13 / 15 / 12 / 12 / 45 / 15 | Not a policy artifact; rally margin only moves which seeds tip over |
| Damage 8–10 × ramp K10–13 / R1.25–1.30 (12 combos) | Always 10–13 or 31–37, never 14–30 | An earlier ramp lowers the upper mode but doesn't close the gap |

Conclusion: the 12–18 first-fall target isn't reachable by tuning one curve. Once a run survives the wave-12 surge, its kills feed damage faster than `waveHP` grows. Closing the gap needs that feedback weakened inside waves 12–20: for example node costs that grow with wave reached, or starlight per kill that falls off relative to `waveHP` in that window. Either one is a new formula, not a re-tune, so it needs a director decision first. With today's formulas, damage 8 keeps the first fall mostly at 10–12, with 3 of 10 seeds tipping over.

#### Wave-scaled node cost sweep (2026-10-30, director picked this lever)
Candidate formula: every node's cost is multiplied by the wave at the time of purchase.
```
cost(node, rank, w) = round(base × growth^rank × CWR^max(0, w − CW0))
```
Harness: greedy, 40 min, seeds 1–10, ramp 15/1.30 on `waveHP` in every row except "no ramp". Cells are first fall / run 2 fall per seed. Before this change, no combination ever put a first fall between 14 and 30.

| Damage | CW0 / CWR | First falls (seeds 1–10) | Run 2 falls | Meets both? |
|---|---|---|---|---|
| 6 | none (ramp only) | 9 7 8 9 10 7 8 9 8 8 | 31–35 | no |
| 8 | 10 / 1.08 | 12 10 21 21 11 11 11 12 21 11 | 35–39 | no |
| 8 | 12 / 1.15 | 12 10 21 21 11 11 11 12 22 12 | 34–39 | no |
| 8 | 10 / 1.20 | 12 10 17 17 11 11 11 12 14 11 | 23–31 | no (first fall) |
| 9 | 10 / 1.15 | 12 13 12 18 18 18 17 12 17 19 | 31–39 | no (run 2) |
| **9** | **10 / 1.25** | **12 13 12 14 15 18 17 12 15 18** | **25–29** | **yes, all 10 seeds** |
| 10 | 10 / 1.25 | 15 13 17 17 18 18 17 18 18 13 | 25–31 | 9 of 10 |
| 9 | 10 / 1.25, capped at w20 | 12–18 | 26–38 | no; the cap brings back the snowball |
| 9 | 10 / 1.25, no ramp | 12–19 | 31–43 | no; needs the ramp too |

#### Proposal: P-001 complete fix (approved and applied 2026-10-30, now in ## Current v1.2)
```
baseDmg = 9                                                   (was 6)
hp(w)   = 10 × 1.17^(min(w,15) − 1) × 1.30^max(0, w − 15)     (ramp 15/1.30, already picked)
cost    = round(base × growth^rank × 1.25^max(0, w − 10))     (new: wave-scaled node cost, uncapped)
```
Result on seeds 1–10: first fall 12–18 (target 12–18) and run 2 at 25–29 (target ≤ 30). The third run falls at 40–43. Costs reach ×9.3 at wave 20 and ×87 at wave 30. Waves 1–10 cost the same as today. Before applying: the UI must show the live cost (it already calls `costOf`); `vanBaseHp` follows the ramp; add pinned tests for the cost multiplier at waves 1, 10, 25 and 50.

### TB-025 · First-run flow check (2026-10-31, greedy, 40 min, seeds 1–10)
P-001 v1.2 is in Current. This checks what is left against the targets and M1's "first wall falls between minute 5 and 8".

| Target | Result | Verdict |
|---|---|---|
| First fall, minute 5–8 (M1) | minute 5–7 on all 10 seeds (5: seeds 1,2,3,8; 6: 4,5,9; 7: 6,7,10) | met |
| First fall, wave 12–18 | unchanged from P-001: 12–18 | met |
| Run 2 length | falls at minute 15–20 (10–13 min long, ≈2× run 1); run 3 at minute 29–35 | longer each run, as intended |
| Run 2 reaches run 1's fall wave in ≤ 65% of the time | **cannot be met as written**: waves advance on a fixed 24 s timer (`WAVE_LEN`), so reaching wave W always takes 24·(W−1) s | target needs rewording |
| A spearman pays for itself in ≤ 45 s | **missed**: extra starlight vs. no spearman reaches its cost in 53–95 s at wave 3, 47–62 s at wave 6, and not within 180 s at waves 10 and 14 (seeds 1–3) | see below |

Spearman payback: the spearman's kills are mostly orcs the archer would have killed anyway, so its starlight return is small. From wave 10 it pays back only in wall HP. Director picked option 1 (2026-10-31); both targets reworded in `## Current` §Pacing targets. Measured as extra seconds the wall stands from a fresh field, spearman vs. one Timber rank, per starlight:

```
w3  ratios 0.77 3.36 3.94   w6  1.23 2.85 1.96
w10 ratios 1.55 0.02 1.40   w14 1.03 1.03 1.81
```

Original options:
1. **Reword the target** to what the spearman is for: "a spearman saves more wall HP than its cost buys in Seasoned Timber" (measure next).
2. **Make it pay in starlight**: e.g. lower `VANGUARD.spear.cost` from 6 to 4 (≈ −33%). I won't sweep it until you choose 1 or 2.

Proposed rewording for the run 2 row: "Run 2 falls at a wave ≥ 1.5× run 1's fall wave" (now 25–29 vs 12–18: met).

### TB-079 lob: pacing check (open; pre-TB-080, needs a re-run under TB-054)
Greedy sim, player model aims at the thickest crowd every step (`crowdAim`), 30 min, seeds 1–3: run 1 falls at minute 8 (seeds 2, 3) to 21 (seed 1); run 2 reaches wave 35 on all three. Targets were first fall 12–18, run 2 ≥ 1.5×. The model aims perfectly, so a human will land fewer orcs per circle. `LOB.dmgMult` 3 is the tuning lever; leave it until play-testing.

### TB-054 · Balance pass #1 (2026-10-31, closed: director kept `wallMult` 10 and chose new pacing targets, now in §Pacing targets)
The sim summary used to print the *last* fall as "First fall"; fixed in `sim/run.ts`. The 30-min "first fall 26/35/35" figures under §Simulator were last falls.

With main as it is (8791ac2), every run 1 falls in under 2 minutes:

| Policy | Seeds | First fall wave | Target |
|---|---|---|---|
| greedy | 1–3 | 5, 5, 5 | 12–18, minute 5–8 |
| dps | 1–10 | wave 4–6, all by minute 2 | 12–18 |
| nobuy | 1–3 | 4, 4, 4 | ≥ 5 |

Over 40 min, dps doesn't beat greedy any more (Heartwood 52–66 vs 60–68): the early falls hand both the same short runs.

Bisect (greedy, seed 1): TB-079 (16e3060) is at no fall through wave 15. TB-080 (4ed98fb) is at wave 5. The cause is `ORC.wallMult: 10`, set on purpose in TB-080 so "a bare run falls at wave 3–4". That contradicts the bare-archer (≥ 5) and first-fall (12–18) targets. Sweep (greedy, seeds 1–3, first fall; nobuy seed 1):

| wallMult | greedy first fall | nobuy |
|---|---|---|
| 10 (now) | 5, 5, 5 | 4 |
| 6 | 6, 5, 5 | 5 |
| 4 | 8, 7, 8 | 6 |
| 3 | 18, 10, 18 | 7 |
| 2 | 19, 18, 18 | 9 |

Options:
1. **wallMult 3**: first fall 10–18 and bare archer 7. Closest to the targets, with spread on seed 2.
2. **Keep 10 and rewrite the targets**: first fall about wave 5, minute 2. This matches TB-080's intent.
3. **wallMult 2**: first fall 18–19, at the top edge of the target.

Decision: keep 10. Measured falls over 40 min, seeds 1–3 (wave@run minutes): greedy 5@1.6 … 24–26@9–10, 35–36@14; dps 5@1.6 … 20–26@8–10, 35@14; nobuy 4–5@1.5–1.9 every run. Over 40 min dps no longer beats greedy (Heartwood 52–66 vs 60–68).

### Loot (TB-091, from the Loot Expansion Design; data in `src/data/lootTables.ts`, not yet live)
- P(drop) = min(0.6, 0.008 · lootTier^1.5 · (1 + itemFind)). lootTier: grunt 1, runner 2, brute 3, elite 4, boss 5.
- Rarity weights normal/boss: common 70/0, rare 25/40, epic 4.5/40, legendary 0.5/17, mythic 0/3. Each weight × (1+luck)^rank × (1 + 0.15(lootTier−1))^rank, rank 0–4.
- Affixes per rarity 1/2/3/4/4; ranges × (1 + 0.03 · ilvl). Item level = wave, capped at 20 + 10 × prestiges. Commons stop after prestige 3, rares after 8.
- Pity: legendary weight +10% per boss without one; mythic guaranteed by the 25th boss without one.
- Sets: 2/4/6-piece bonus +20/50/100% to the set's stat (Rootwarden 15/40/80%).

### P-099 · Set bonus numbers (2026-10-31, TB-099)
All in `SET_FX`. Nightknife: knives +25% rate / bleed 3 s, +30% taken / every 3rd throw fans 5 knives. Emberwright: burn +30% / burn spreads to 2 within 90 px / fire lobs leave Cinderground 4 s (burn, 25% slow). Stormcaller: +1 chain / chain reach +50% / killing link rebounds up to 3, storm +30% rate. Siegebreaker: ballista +25% rate / first bolt hit +50% and shoved 30 px / last bolt hit pinned 2 s, takes ×2. Moonveil: lob +25% with Moonbow / moon shots always crit ×1.5 / Moonwell 3 s heals wall 2%/s. Packlord: companions +20% dmg / +25% speed while an orc is within 220 px of the wall / +1 wolf, treants root 1.5 s. Rootwarden: wall +15% / +0.5%/s regen / once per run, wall below 25% makes rallies free for 10 s.
Evidence: `npm run balance` (default greedy) output identical to the tb-097 base (first fall wave 5, best wave 31): greedy runs rarely complete a set. Per-set tuning is TB-107.

### P-100 · Mythic power numbers (2026-11-01, TB-100)
All in `MYTHIC_FX`. Last Knife: a knife that hits turns back, pierces all on the way home. Heart of the Kiln: burn never ends, +10% burn damage per second burning. Thunder's Memory: each storm stores a charge; at 10 the next lob hits every orc for ×3. Oakspine: a bolt's 3rd hit drives a stake (r 10, 8 s) that holds the first orc to touch it. Pale Moon: with the Moonbow draw ×0.5 cooldown, each shot costs 2% wall, skipped below 10% wall. First Wolf: companions +25% damage per 15 s of the run, max 4 stacks. Heartwood Splinter: once per run the fallen wall stands again at 30%; that run pays ×0.5 Heartwood (floor `PRESTIGE.minGain`). Starfall Cloak: every 100 starlight from kills strikes the highest-HP orc for ×5 damage, 1 s cooldown; Item Find +15%.
Evidence: `npm run balance` unchanged (greedy runs gear mythics too rarely to show). Per-mythic tuning is TB-107.

### P-101 · Spoils branch and Heartwood loot lines (2026-11-01, TB-101)
Numbers in `SPOILS_FX` (lootTables) and `HW_FX` (heartwood). Spoils costs 120 / 150 / 200 / 600 / 900 / 4000 / 6000 starlight; Hunter +5% crit (crit stays ×3, gear crit works without it, director 2026-11-01); Scavenger salvage ×1.5; Trophy every 10th wave; Sharp Eyes +10% Item Find; Hoard +1 rarity tier capped at legendary; Resonance +1 set piece; Echo ×1.25. Heartwood lines as in the table above, 6 lines and 10 ranks, 106 HW to buy all.
Evidence: `npm run balance` (greedy, seed 1, 30 min) vs the tb-110 base: first four falls identical (waves 5, 5, 7, 5); fifth fall wave 26 → 20, Heartwood 25 → 18, best wave 31 → 37. The runner now has Spoils nodes in its pool (Hunter's Eye is a cheap crit pick) and the report does not name purchases, so which node moved the curve is unmeasured. Tuning against drop rates is TB-107.

### P-102 · Glimmer reroll (2026-11-01, TB-102)
Reroll one affix of a worn item: cost = max(1, round(2 × 2^n × rerollMult)), n = rerolls already on that item (`REROLL` in lootTables). Costs 2, 4, 8, 16, 32…; with Glimmerwork 1, 2, 5, 10, 19. The new affix is a different id, keeps the item's arrow rule, value rolled at the item's ilvl.
Evidence: none yet; the greedy runner never rerolls. Tuning is TB-107.

### P-108 · Loot pacing: rarer bosses and rarer top drops (2026-11-01, TB-108)
Director (1 Nov): make bosses rarer; "candidate C looks okay, just make it like 20% slower". Proposed (G):
- `BOSS_WAVE.every` 10 → 50 (bosses.ts). A boss wave unlocks at wave 50, 100 …; runs fall near wave 85, so this is one boss per late run, about 1.9 per hour of play.
- `RARITY.weights` (lootTables.ts), normal / boss: legendary 0.5 / 17 → 0.03 / 8; mythic 0 / 3 → 0 / 0.8. Others unchanged. Mythic pity stays 25 bosses (the "never past boss 25" cap).

Evidence: `npm run balance -- --minutes 1500 --seed N --quiet --tune …` (25 sim-hours, greedy buys, every boss summoned at once, set-chasing equip). Times are play time since a fresh save.

| | Target | Now (seed 1) | C: every 50, legendary 0.05/10, mythic 1 (seed 1) | G (proposed), seeds 1 / 2 / 3 / 4 |
|---|---|---|---|---|
| First drop | ≤ 3 min | 2.3 min | 2.3 min | 2.3 / 4.4 / 1.6 / 3.5 min |
| First rare | run 1 | run 4 | run 4 | run 4 / 4 / 1 / 2 |
| First legendary | 1–2 h | 13 min (boss 1) | 55 min | 55 / 44 / 62 / 71 min |
| First mythic | 15–25 h, by boss 25 | 29 min (boss 4) | 9.1 h (boss 17) | 3.2 h (5) / 5.5 h (10) / 12.2 h (23) / 9.5 h (18) |
| First 6-piece set | 6–10 h | never | 3.6 h | 9.7 / 11.8 / 7.5 / 7.0 h |
| Bosses in 25 h | ≤ ~40 | 345 | 47 | 46 / 47 / 46 / 46 |
| Best wave worn | | 90 (bare 83) | 87 | 89 / 89 / 90 / 91 |

Read: G sets land at 7–12 h (C: 3.6 h; C with every 60 on seeds 1–3: 3.6–6.9 h), about 20–30% slower than C. Mythic stays luck-bound at 0.8% per boss; two of four seeds beat the 15 h floor, pity caps it at boss 25 (~13 h at this boss rate). First rare in run 1 misses at any weight: run 1 falls at wave 5 in 1.6 min.
Gear power: worn vs bare best wave +5 to +8 (seed 1, 25 h). Late orc HP grows ~30% per wave, so +60–90% power ≈ +2–3 waves and "+10 waves" ≈ ×14 power: the two targets disagree. The runner's play-on trial (end state, worn vs bare) gives −5 to +7 waves by seed, too noisy to tune on.
Found: past wave ~117 combat stops (0 kills/min, wall 100%, waves tick to 463 on seed 3 at bosses every 60); TB-118.

### P-111 · Per-type upgrade nodes (2026-11-01, TB-111)
Design from the director (1 Nov): see SKILL-TREE §Per-type upgrade nodes. Numbers in `SHOT_FX`, `UNIT_FX`, `ELF_FX` (`src/data/balance.ts`).
- Enchantment chance per shot: 0.25 on unlock + 0.15 per Quiver rank, capped at 1 (fire, frost, shock, rebound, moon). Starfall 0.1 + 0.05 per Wishing Star rank (replaces "every 10th lob"). Thunderclap stuns only on shots that roll shock.
- Shot damage nodes ×1.3^r (Kindling burn, Static zap, Hard Rebound, Starsteel, Keen Knives); Moonsilver ×1.2^r on the Moonbow's ×1.6, which now applies to moon shots only.
- Effects: Wildfire +1 s burn, Thunderclap +0.25 s stun per rank past 1 (max 3), Moonpull homing reach ×(1 + 0.25r), Meteor Shower +2 arrows, Knife Fan +1 knife per throw, Pinning Bolts root every orc a bolt passes 0.3 s per rank, Windlass reload ×0.9^r. Nimble Wrist is rate only now (its ×1.35 damage moved to Keen Knives at ×1.3).
- Units: damage ×1.3^r (Fangs keeps ×1.4, Spear Drill ×1.3 now spearmen only), rate ×1.15^r, crit +0.05 per rank at ×2 + 0.5 per Crit-damage rank, move speed ×1.15^r (wolf, spearman, bladedancer). Rangers and Wardens crit by their own nodes, no longer Keen Eye. Deadly Aim: elf crit ×3 + 0.5 per rank.
- Costs (starlight base, growth): shot nodes 150–7000 near their unlock's cost (SKILL-TREE table); unit nodes damage ×1.2, rate ×1.4, crit ×1.6, crit damage ×2, speed ×1 of the unit's unlock cost, growth 1.9–2.0.
Evidence: `npm run balance` (greedy, seed 1, 30 min) vs origin/main 2f4dd10: first four falls identical (waves 5, 5, 7, 5); fifth fall wave 20 @ 8 min → 18 @ 7 min, then a sixth run to wave 35 @ 13.7 min; replants 5 → 6, Heartwood 18 → 48, best wave 37 → 35. The 48 extra nodes give the greedy buyer cheap power, so later runs climb faster. Per-node tuning is TB-107.
