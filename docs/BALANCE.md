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
boss wave: unlocks every 25 waves, 60 s script, clear bonus = 40 × waveLoot(w) × starMult × (1 + 0.5 × hw_boss rank) starlight and bossHw(w) = 3 × floor(w / 25) Heartwood (P-142)
speed       = base × (1 + 0.008 w)
atk         = 0.025 × maxhp                  per swing, one swing per second, vs vanguard
wall hit    = min(10 × atk, 0.25 × barMax)    per swing vs the barricade (TB-080: bare run falls at wave 3–4, ~90 s; cap P-125, TB-125)
```
Type multipliers and unlocks in GDD §4. Per kind: Fury ×1.3^r health, ×1.4^r starlight; Swarm ×1.2^r spawn rate (grunts: War Drums, Call the Horde). Live orc cap 160.
Crowd control (TB-126, P-126): a stun or root is never topped up or lengthened while it holds; a fresh one lands only once the orc has broken free (`stunOrc`, `rootOrc`). Pins and slows are unchanged.

### The elf's lob (TB-079)
```
lobCd   = 1.25 / 1.15^draw         seconds between shots; fires only while aimed
radius  = 20 × 1.2^wide            strike circle, px (40 until TB-132)
dmg     = 3 × player dmg           to every orc within radius + orc radius
flight  = 0.7 s, apex 90 px; Longshaft repeat strikes 0.35 s apart; Split Shot arrows land within 0.6 × radius
```
Rangers and Wardens keep straight volleys at `fireRate = 1.2 × 1.15^draw` per second, with `arrows` (Split Shot) in the fan, `pierce` (Longshaft), crit and Moonbow steering.

| w | hp | loot | interval | grunt atk/s (vs vanguard) | grunt wall hit/s (×10, before the 25% cap) |
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
- Moonbow: the strike circle settles on the nearest orc within 70 px of the aim point (`aimHomingRadius`). The lob's reward for aiming is `LOB.dmgMult` 1 (×1 player damage) to every orc in the circle: a wave-1 grunt takes two lobs, wave 5 three (TB-154, director 2026-11-01; was 3, one shot to wave 7).
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
| `BOSS_WAVE`, `BOSS_SCRIPT` | every 25 waves, 60 s, clear loot 40 × waveLoot, clear Heartwood 3 per 25 waves (`hwPerTier`); 8 mini-waves, 28 orcs | bosses.ts |
| `TIERS` | max 6, hp 2, loot 1.5, hw 1: at tier t orc HP × 2^(t−1), starlight per kill and boss clear × 1.5^(t−1), boss Heartwood × t; a boss cleared at your highest tier unlocks the next (P-148 set F, director 2026-11-02) | bosses.ts |
| `HW_FX` | Early Dawn +2 waves/rank, Stout Timber +0.25/rank, Warlords +0.5/rank | heartwood.ts |
| `SKY` (render only) | 600 s day cycle, dusk alpha 0.85, two hill bands, lamp radius 150 | presentation.ts |
| `AUDIO`, `CUES` (audio only) | gains, ducking, per-cue throttles | audio.ts |

### Barricade
```
barMax   = 150 × (1 + 0.25 × hw_timber) × 1.25^timber        (TB-154: was 400)
wall hit = 25 × atk = 25 × 0.025 × orc maxhp per swing        (TB-154: wallMult was 10)
regen    = 0.01 × repair × barMax per second
spikes   = 0.2 × spikes × dmg per second to each orc hacking the wall
Deep Roots: once per run, regrow to 0.5 × barMax instead of falling
```
| timber | barMax |
|---|---|
| 0 | 150 |
| 3 | 293 |
| 5 | 458 |
| 10 | 1,397 |

### Vanguard
```
cost(spear, w) = 6  × loot(w)     hp = 5 × hp(w) × 1.3^shield   dmg = 1.6 × dmg × 1.3^drill × kin / 0.8 s   reach 28
cost(blade, w) = 18 × loot(w)     hp = 4 × hp(w) × 1.3^shield   dmg = 1.4 × dmg × 1.3^drill × kin / 0.45 s  reach 34, cleave
cap = 2 + ranks        mend = 0.03 × mend × maxhp per second
```
| w | spear cost | spear hp | blade cost |
|---|---|---|---|
| 1 | 12 | 50 | 36 |
| 10 | 36 | 205 | 108 |
| 25 | 226 | 6,209 | 677 |

### Economy
- Provoke is per kind now (TB-080, see Fury/Swarm above). Blood Banners retired.
- Node price at purchase: `cost = round(base × growth^rank × 1.1^max(0, w − 10))` (wave-scaled since P-001; ×1 to wave 10, ×4.18 at 25, ×45.3 at 50; rate 1.25 until P-142).
- `starMult = 1.08^glean` (Gleaning sits under War Drums, 5 ranks; P-142). Heartwood gives no passive bonus (P-142): it is only spent on the Heartwood tree.

### Prestige
- Forced on barricade fall; voluntary from wave 12. A fall or voluntary replant pays a flat `PRESTIGE.fallGain` = 1 HW (rule 1). All other Heartwood drops from cleared boss waves: `bossHw(w) = 3 × max(1, floor(w / 25))`, halved (min 1) once Heartwood Splinter has stood the wall again (P-142).

### Pacing targets (what the sim must hit)
Status measured 31 Oct 2026 at 8791ac2, seed 1, 25 min, player model `crowdAim` (except "no aim"). Greedy falls: waves 5, 5, 7, 5, 24 (minutes 1.6, 3.3, 5.8, 7.6, 16.9). Nobuy falls: wave 4 at 1.5 min, then waves 5–6 every ~2 min (13 falls). No aim at all: falls at wave 2–3 every ~0.8 min.

| Target | Value | Status |
|---|---|---|
| First purchase | ≤ 30 s | first run: 14–16 starlight by its fall at ~36 s with front-orc aim, so one Sharp rank at the first Replant (nodes are bought only between runs, TB-136) |
| Muster affordable | ≤ 2 min | met: 50 starlight earned by 56 s (greedy never buys it in run 1) |
| First barricade fall, first run | wave 2–3, under a minute (TB-154 hard set: early runs are short on purpose; director, 2026-11-01) | met: wave 2 at 0.5 min, runs 1–7 fall at wave 2–4 in ~25 s (greedy, seed 1, 60 min, TB-154) |
| A spearman earns its keep | buys at least as many seconds of wall life per starlight as a Seasoned Timber rank (median over waves 3/6/10/14, seeds 1–3) | met, barely: median ratio 1.06, 7 of 12 cases ≥ 1 at `wallMult` 10 (`sim/spearman.ts`, TB-086); was 1.5 before TB-080 |
| Breakout | a run passes wave 15 within 15 min of total play | met: greedy after 4–6 short runs (6–12 min), that run falls at wave 24–26 (TB-054) |
| Bare archer, no purchases, holds | ≥ 4 waves | met (falls wave 4–5) |
| Worn gear power (TB-108) | +60–90% vs bare, about +2–3 waves at late orc HP (director, 2026-11-01; "+10 waves" dropped) | met: +1.5 waves mean worn vs bare, seeds 1–4, 25 h (P-108b gain 0.75; was +4.75) |
| Tree fully bought in a run | never | met: 117 of 156 buyable ranks at most (greedy run 5) |

## Heartwood tree (M3, built TB-053; shown to the player as Grudges, TB-112)
Bought with Heartwood, never reset. Costs in HW. The tree spends from `available = earned − spent`. The header shows `available / earned` once anything is spent. Skip the Boring Bit's skipped boss waves are not owed (`bossDone` starts at `floor(startWave / BOSS_WAVE.every)`). Standby Lad lads are placed free, ignoring Muster and the line cap.

| id | Name | Max | Cost | Effect |
|---|---|---|---|---|
| hw_dawn | Skip the Boring Bit | 5 | 2, 4, 8, 14, 22 | Start each run at wave +2 |
| hw_wolf | Dog Comes Too | 1 | 3 | Start with the dog (A Dog) |
| hw_timber | Better Fence | 3 | 4, 8, 16 | Fence base HP +25% |
| hw_orders | Standby Lad | 2 | 5, 12 | Start each run with one lad (two at rank 2) |
| hw_boss | Management Bonus | 3 | 6, 12, 24 | Boss wave clear bonus +50% per rank (director chose the effect 2026-10-31; numbers proposed, unplaytested) |
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

Heartwood flag (TB-146): `--hwbuy` spends Heartwood on the fallen run, before Replant (Heartwood is spent only at a prestige, TB-149), on the cheapest affordable node until none is. The summary's `Milestones` line gives the first Heartwood purchase affordable and bought, nodes bought, and the first boss reached and cleared, each as run, run minute and play minute.

Mythic flags (TB-128): `--mythic <id>` wears that mythic from the start and ends with its power played on removed (affixes kept); `--reroll` spends Glimmer each minute rerolling the lowest affix on the cheapest worn item.

Report columns per minute: wave, starlight, kills/min, kills, wall %, vanguard count, nodes owned, HW, falls. Summary line gives the first fall wave, every fall wave in order (`Falls:`), replants, Heartwood, best wave. (Before TB-084 the "First fall" field printed the last fall.) Writes `sim/out/<policy>-<date>.md` unless `--quiet`. CI runs 30 minutes of greedy as a smoke test.

## Proposed

### TB-157 · Grey Wolf nerf (2026-11-02) · applied
**Decided 2026-11-02 (director): price 70→200, bite 6→4, node moved under Muster** (was off the root), so it is no longer a first buy. `npm run balance` (greedy, default seed) before and after: identical, first fall wave 2, best wave 2, 60 replants, sources owned none. The greedy sim falls at wave 2 at 0.5 run-minutes on every build back to P-151, so it never reaches the wolf and cannot measure this change; the director reports the real game reaches wave 5 untouched with no upgrades. That sim/game gap is open.

### P-151 · Price by power: cheaper Quick Draw, Keen Eye and Nimble Wrist (2026-11-02, TB-151) · applied
**Decided 2026-11-02 (director): apply G1.** Quick Draw 12, Keen Eye 30, Nimble Wrist 46 are now the base prices in `src/data/skillTree.ts` and SKILL-TREE.md.
P-147's table showed Quick Draw, Keen Eye and Nimble Wrist cost 4–30× more per percent than Sharpened Tips. Two price sets against today, greedy, `--hwbuy`, 300 min, seeds 1–3 (set F tiers). Reproduce with `npx tsx sim/run.ts --minutes 300 --seed 1 --quiet --hwbuy --cost draw=12,crit=30,knifespd=46`.

| Set | Quick Draw | Keen Eye | Nimble Wrist | Tier 2 unlocked | Nodes at 120 min | Best wave |
|---|---|---|---|---|---|---|
| Today | 30 (2.0 per 1%) | 120 (15) | 140 (7.0) | run 25–27, 84–97 min | 203–221 | 29 |
| G1, near Fangs | 12 (0.8) | 30 (3.75) | 46 (2.3) | run 24–25, 81–85 min | 219–240 | 28–29 |
| G2, level with Tips | 7 (0.48) | 8 (1.0) | 10 (0.5) | run 23–24, 79–82 min | 227–256 | 28–29 |

What it says:
- Price changes on these three nodes barely move pacing: G2, the deepest cut, unlocks tier 2 about 9 minutes sooner and buys about 15% more nodes by minute 120. Best wave is held at 28–29 by the tier walls either way.
- Pricing by power is a feel and fairness fix, not a pacing lever: the player stops seeing a 4× worse deal on Quick Draw for the same damage per second.
- Proposed: G1 (Quick Draw 12, Keen Eye 30, Nimble Wrist 46). It evens the per-percent price within ~2× of Tips without making every rate node near free.
- Sim note: `--cost id=base` sets a run-tree node's base price for a sweep.

### P-087 · Four new orcs: draft for the director to edit (2026-11-02, TB-087)
Draft only (director, 2 Nov: "Draft for me to edit"). Nothing is built or simmed. Each follows the rule in GDD §4: it marches only once its Grove node summons it, and has its own Fury and Swarm nodes (+30% health and +40% starlight, +20% spawn per rank), so the player chooses the danger. Stats are in grunt units like `ORC_TYPES` (hp × wave HP, loot × wave loot, `every` × the grunt interval). The field is 900 wide with the wall at x 150.

| Orc | hp | speed | loot | radius | every | What it does | Answer the player has |
|---|---|---|---|---|---|---|---|
| Berserker | 2.5 | 40 | 3.5 | 14 | 6 | Below half health it rages: speed ×1.8 and its wall hit ×2 | Kill it in one strike or keep the circle on it; a half-hurt berserker is the worst outcome |
| Wolf rider | 2.0 | 90 | 3.0 | 15 | 5 | The fastest orc. It leaps the first vanguard it meets instead of stopping to fight. When the wolf dies the rider falls off as a grunt where it fell (pays its own grunt loot) | Aim ahead of it; vanguard cannot hold it alone |
| Shaman | 2.0 | 36 | 4.0 | 12 | 9 | Halts 180 short of the wall (x 330) and every 4 s lobs a fireball (`FIREBALL`, radius 24) at the nearest vanguard, or at the wall if none stand: 3 × a grunt hit, so the wall takes it × `wallMult` like any hit | It never comes closer, so only aim or companions reach it |
| War drummer | 4.0 | 30 | 6.0 | 16 | 14 | Halts 260 short of the wall (x 410) and drums: every orc within 100 marches 30% faster and hits 30% harder (two drummers do not stack). It never hits the wall | A priority target that does no harm alone |

Grove nodes, continuing the summon chain after Blackguard (`elites`): `berserkers` 3000 → `wolfriders` 5000 → `shamans` 8000 → `drummers` 12000 starlight, each with Fury and Swarm at 5 ranks, base cost ×1.33 the unlock, growth 2.4 as today. Draft order: the two melee kinds first (berserker, wolf rider), then the two that stand back and change how you aim (shaman, drummer).

Boss waves: none of the four join `BOSS_SCRIPT` in this draft.

To settle before the build: each behaviour, the halt distances, the chain order and costs. Then the sim checks each against Blackguard on starlight per second of wall life, the same test a spearman passed (TB-086).

### P-148 · Boss tiers: how hard each tier hits, and what it pays (2026-11-02, TB-148)
Director chose *unlock across runs*: clearing a boss wave while at your highest tier unlocks the next for good; at March you pick any unlocked tier. Shipped switched off (`TIERS.max` 1); set F moved to Current 2026-11-02. Each tier above 1 multiplies orc HP by `hp^(tier−1)`, starlight per kill and per boss by `loot^(tier−1)`, and boss Heartwood by `1 + hw × (tier−1)`, from wave 1.

Sim: `npx tsx sim/run.ts --minutes 360 --hwbuy --quiet --tune TIERS.max=6,TIERS.hp=…,TIERS.loot=…,TIERS.hw=…`, seed 1, on TB-154 balance (main 2cad1a3). The bot marches at its highest tier after a run that cleared a boss, otherwise one tier lower (`--tiertop` always marches at the highest: it walls itself at the top tier, clears 3–5 bosses in 6 h and ends with *less* Heartwood than tiers off, 74–91 vs 128).

| Set | hp | loot | hw | Tiers reached (play min) | Bosses | Heartwood at 6 h | Best wave | First mythic (min) | Starlight/min, last run |
|---|---|---|---|---|---|---|---|---|---|
| off | – | – | – | – | 26 | 128 | 37 | 247 | 8.1k |
| B | 2 | 2 | 0.5 | t2 84, t3 110, t4 137, t5 146, t6 155 | 20 | 213 | 29 | 305 | 1.9M |
| C | 3 | 3 | 0.5 | t2 84, t3 127, t4 136 | 21 | 162 | 30 | 136 | 820k |
| D | 4 | 3 | 1 | t2 84, t3 127, t4 152 | 21 | 203 | 31 | 142 | 1.0M |
| E | 2 | 2 | 1 | t2 84, t3 110, t4 137, t5 146, t6 171 | 23 | 318 | 29 | 186 | 1.6M |
| F | 2 | 1.5 | 1 | t2 84, t3 127, t4 136, t5 160, t6 185 | 22 | 314 | 29 | 284 | 453k |

Read: tier 2 always opens at the first boss clear (84 min). ×2 HP lets the bot climb to tier 6 in 2.5–3 h; ×3–×4 HP stalls at tier 4. Best wave drops (29–31 vs 37) because each tier is fought at higher orc HP, so best wave stops being the progress number and the tier takes over. Heartwood: `hw` 1 gives 2.5× tiers-off (314–318), `hw` 0.5 gives 1.3–1.7×. Starlight per minute at high tiers is 50–240× tiers-off; `loot` 1.5 (F) keeps it lowest while Heartwood holds. Higher `hp` (C, D) brings the first mythic forward (more boss loot rolls at tier 3–4).

Proposed: **F** (`max 6, hp 2, loot 1.5, hw 1`): six tiers reached over ~3 h, the most Heartwood bar E, and the smallest starlight jump. Director picked F (2026-11-02); now in Current.

### P-154 · Early game: no one-shots, thinner wall, harder orcs (2026-11-01, TB-154, applied)
Director: arrows one-shot early orcs, the wall is far too healthy (no damage until wave 3), orcs hit far too soft. Before: lob 9 × 3 = 27 vs wave-1 grunt 10 HP (one shot to wave 7); wall 400, a wave-1 swing 2.5. Director chose the hard set: `LOB.dmgMult` 3 → 1, `BARRICADE.baseHp` 400 → 150, `BARRICADE.wallMult` 10 → 25 (wave-1 swing 6.25; vanguard damage unchanged, it reads `orcAtkFrac`).

`npm run balance -- --minutes 60 --hwbuy --quiet --tune …`, greedy, seed 1 (the bot takes its first wall damage at wave 1 even before):

| Set | Runs 1–7 fall (wave@min) | Best wave | Heartwood | Bosses |
|---|---|---|---|---|
| before | 3@1.1, 3@1, 5@0.8, 5@0.8, 5@0.9, 6@1.5, 7@1.7 | 21 | 16 | 0 |
| lob ×1 only | 3@0.9, 3@0.8, 4@0.7, 5@0.8, 5@1.1, 6@1.3, 6@1.4 | 20 | 18 | 0 |
| mild 250 / ×15 | 2@0.6, 2@0.6, 4@0.5 ×5 | 20 | 21 | 0 |
| mid 200 / ×20 | 2@0.5, 2@0.5, 4@0.4 ×5 | 19 | 22 | 0 |
| hard 150 / ×25 | 2@0.5, 2@0.4, 3@0.4 ×4, 4@0.4 | 19 | 24 | 0 |
| **hard + `LOB.cd` 1.25 (applied)** | 2@0.5, 2@0.5, 3@0.4, 4@0.4, 3@0.4, 3@0.4, 4@0.4 | 19 | 21 | 0 |

Bare first run, seeds 1–3 (`createState` + `step`, no buys): the hard set alone killed 1–3 orcs and earned 2–6 starlight before falling at 28 s, below the 12 for the first Sharp rank even when aiming at the front orc. Director then chose a faster lob, `LOB.cd` 2.5 → 1.25 (Quick Draw scales from it; the elf's damage per second is ⅔ of before all game). Front-orc aim: 7–8 kills, 14–16 starlight (one buy), falls at wave 2 around 36 s. The first orc reaches the wall at 18 s on every set, so the wall now takes damage in wave 1.

### P-142 · Tree-gated progress: Heartwood from bosses, no passive, Gleaning deeper (2026-11-01, TB-142)
Director: early game too easy, first runs too long, Gleaning a no-brainer that snowballs, Heartwood too easy. Chosen and applied (now in Current): a fall pays a flat 1 HW; bosses pay the rest (`bossHw = 3 × floor(w / 25)`, 3 at wave 25, 6 at 50; halved after Heartwood Splinter); boss waves every 25; no passive `heart` bonus; Gleaning moves under War Drums (root → Call the Horde → War Drums → Gleaning), 5 ranks, base 600, growth 2.2, +8% per rank.

Evidence, `npm run balance -- --minutes N --seed S --quiet`, greedy bot:

| Build | Minutes | Falls (wave) | Heartwood | Best wave | Bosses |
|---|---|---|---|---|---|
| main (before) | 60, seeds 1–4 | 3,3,3,4,5,8,18,20,20,30,35 | 81–104 | 32–35 | — |
| P-142 as applied | 60, seeds 1–4 | 3,3,3,3,3,6,7,13,14,16,16,16,17 … | 15–16 | 16–17 | 0 |
| P-142 as applied | 180, seeds 1–2 | … plateau 16–17 for ~1.5 h, then 20–23 | 30–31 | 22–23 | 0 |
| + boss every 15 (`--tune BOSS_WAVE.every=15`) | 90, seeds 1–2 | plateau 16–18 | 28–29 | 18 | 3–5 |
| + boss every 10 | 90, seeds 1–2 | plateau 16–18 | 50–53 | 17–18 | 11 |
| + early numbers 7/300/12 (dmg / wall HP / wallMult) | 60, seeds 1–4 | ~8 runs of wave 2–3 at 0.7 min, then plateau 16 | 19–21 | 16 | 0 |

Findings: the snowball is gone; the bot's runs now plateau at wave 16–17, below the first boss at 25, so it never earns boss Heartwood and climbs only through the 1 HW per fall. A bare first run already falls at wave 3–5 in 1–2 min, so harsher early numbers only add more two-wave runs. The plateau sits where `costWave` (×1.25 per wave from wave 10) outruns income.

Director chose (c), a gentler `costWave` (2026-11-01). Sweep of `COST_WAVE.rate` (`--tune COST_WAVE.rate=r`), 180 min, seeds 1–2; loot grows ×1.13 per wave, so a rate above 1.13 makes each wave's prices outrun income:

| rate | Best wave | Plateau | Heartwood | Bosses | First fall past wave 25 (play min) |
|---|---|---|---|---|---|
| 1.25 (was) | 17 (90 min) | 16–17 | 20 (90 min) | 0 | never |
| 1.20 | 18–19 (90 min) | 18 | 19–20 (90 min) | 0 | — |
| 1.13 | 27–28 | 27 | 45–46 | 6 | 117–123 |
| **1.10 (applied)** | 30–32 | 27, then climbing | 47–51 | 7–8 | 99–106 |
| 1.05 | 36 | 34–36 | 49–51 | 8–9 | 80–86 |
| 1.00 (no wave scaling) | 37 | 36–37 (the ×1.30 HP ramp) | 50–51 | 9 | 66–70 |

Applied 1.10: prices still rise slightly faster than loot, so the tree, not income alone, decides the reach; the first boss arrives after about 100 min of play instead of never.

### TB-146 · Fresh-save milestones (2026-11-01, measured; no numbers changed)
Branch tb-146 on TB-149, greedy, loot greedy, 180 min, seeds 1–4. "Run r" counts from 1; play minutes include every earlier run.

| | Seed 1 | Seed 2 | Seed 3 | Seed 4 |
|---|---|---|---|---|
| First Heartwood purchase affordable (end of run 2) | 2.0 min | 1.9 min | 2.1 min | 1.8 min |
| First boss reached, no Heartwood bought | run 20, 104.5 min | run 20, 98.1 min | run 19, 95.0 min | run 20, 96.3 min |
| First boss reached, `--hwbuy` | run 20, 86.9 min | run 20, 81.2 min | run 20, 86.0 min | run 20, 81.9 min |
| First boss cleared, `--hwbuy` | run 20, 87.6 min | run 21, 90.0 min | run 20, 86.8 min | run 20, 82.7 min |
| Heartwood nodes bought in 180 min, `--hwbuy` | 12 | 13 | 12 | 12 |
| Best wave in 180 min (none / `--hwbuy`) | 30 / 33 | 32 / 33 | 31 / 32 | 31 / 33 |

What it says:
- The first Heartwood buy comes early: Skip the Boring Bit costs 2, and the end of run 2 has 1 banked plus the fall's 1. Far Sight (2) and Dog Comes Too (3) follow within the next few falls.
- After those, Heartwood arrives at 1 per fall until the first boss, so 18 runs (about 80 minutes) pass with roughly one purchase per two to four falls: the gap dev plan §8 #3 describes. Buying Heartwood moves the first boss 12–17 minutes earlier, not runs earlier: run 20 on every seed.
- Every seed reaches wave 25 by run 19–20 and clears the first boss on the same run. Then six or more runs in a row fall at wave 27–28 (seed 1: runs 20–25): a plateau right after the boss.
- The first boss is the real milestone and sits at 81–105 play minutes. TB-147 (additive stacking, price by power) is where to move it.

### P-147 · Additive stacking inside a node line (2026-11-01, TB-147; dev plan §8 #2, #4)
**Decided 2026-11-01 (director): keep multiply.** Ranks stay `m^r`; `STACKING.add` stays 0 and is kept only as a sim switch. The proposed add numbers below are rejected and kept as the record.
The sim has a switch: `STACKING.add` in `balance.ts` (0 = today, every rank multiplies, `m^r`; 1 = ranks add inside the stat, `1 + (m − 1) × r`). Foe Fury and Swarm always multiply. The default is still 0, so the game has not changed. All four rows: greedy, `--hwbuy`, 180 min, seeds 1–4, ranges across seeds.

| Rule | First boss reached | First boss cleared | Best wave in 180 min | Heartwood nodes bought |
|---|---|---|---|---|
| Multiply (today) | run 20, 81–87 min | 83–90 min | 32–33 | 12–13 |
| Add, same per-rank numbers | run 31–33, 147–162 min | 156–175 min | 27 | 10 |
| Add, matched at rank 5 | run 21, 91–95 min | 94–123 min | 29–30 | 11–12 |
| **Add, matched at rank 6 (proposed)** | run 19–20, 84–91 min | 85–101 min | 30–31 | 12–13 |

"Matched at rank r" picks the added bonus so rank r gives the same total as today: `(m^r − 1) / r` per rank.

Proposed numbers (add, matched at rank 6):

| Value | Today (multiply) | Proposed (add) | Rank 6 total, both | Rank 10 total, today → proposed |
|---|---|---|---|---|
| `NODE_FX.sharpDmg` | ×1.25 | +47% | ×3.8 | ×9.3 → ×5.7 |
| `NODE_FX.drawRate` | ×1.15 | +22% | ×2.3 | (max 8) ×3.1 → ×2.8 |
| `NODE_FX.wideRadius` | ×1.2 | +33% | (max 5) ×2.5 → ×2.7 | — |
| `NODE_FX.knifeRate` | ×1.2 | +33% | (max 5) ×2.5 → ×2.7 | — |
| `NODE_FX.boltDmg` | ×1.5 | +173% | (max 5) ×7.6 → ×9.7 | — |
| `NODE_FX.gleanLoot` | ×1.08 | +9.8% | (max 5) ×1.47 → ×1.49 | — |
| `SHOT_FX.dmg` (every arrow-type damage line) | ×1.3 | +64% | ×4.8 | — |
| `UNIT_FX.dmg` / `UNIT_FX.rate` | ×1.3 / ×1.15 | +64% / +22% | ×4.8 / ×2.3 | — |
| `BARRICADE.timberMult` | ×1.25 | +47% | ×3.8 | ×9.3 → ×5.7 |

What it says:
- Adding with today's numbers cuts the late tree in half: the first boss moves from about 85 to about 155 play minutes. Additive needs bigger per-rank numbers, not just the rule.
- Matched at rank 6, pacing lands within a few minutes of today (first boss 84–91 against 81–87) and the best wave drops by 2. Early ranks are stronger and the 10-rank lines are weaker (Sharpened Tips at rank 10: ×5.7 instead of ×9.3), so the late tree stops outrunning the wave curve: the goal of dev plan §8 #2.
- Under add, each rank gives the same flat bonus while its price still grows ×1.55–2.2, so value per starlight falls with depth and wide buying beats deep buying. That is the intended shape.
- Sim gap: Fangs (`NODE_FX.fangsDmg`) and Drill (`VANGUARD.dmgPerDrill`) are read once at load into `UNIT_DMG`, so `--tune` cannot reach them. In these runs they added +40% / +30% per rank unchanged. Proposed for them: +88% / +64% (matched at rank 6).

Price by power (§8 #4), starlight per +1% at rank 0, today:

| Node | Base price | Per rank | Starlight per +1% |
|---|---|---|---|
| Sharpened Tips | 12 | +25% damage | 0.48 |
| Seasoned Timber | 25 | +25% wall health | 1.0 |
| Quick Draw | 30 (12 since P-151) | +15% rate | 2.0 |
| Wide Volley | 40 | +20% radius | 2.0 |
| Fangs | 90 | +40% wolf damage | 2.3 |
| Nimble Wrist | 140 (46 since P-151) | +20% knife rate | 7.0 |
| Keen Eye | 120 (30 since P-151) | +8% crit chance | 15 |
| Iron Bolts | 2000 | +50% ballista damage | 40 |
| Gleaning | 600 | +8% starlight | 75 |

Damage and rate are the same lever for the elf's damage per second, yet Quick Draw costs four times as much per percent as Sharpened Tips. No price change is proposed yet. With multiply kept, this table is the per-rank power prices would be set against. Reproduce: `npx tsx sim/run.ts --minutes 180 --seed 1 --quiet --hwbuy --tune STACKING.add=1,NODE_FX.sharpDmg=1.47,NODE_FX.drawRate=1.22,NODE_FX.wideRadius=1.33,NODE_FX.knifeRate=1.33,NODE_FX.boltDmg=2.73,NODE_FX.gleanLoot=1.098,SHOT_FX.dmg=1.64,UNIT_FX.dmg=1.64,UNIT_FX.rate=1.22,BARRICADE.timberMult=1.47`.

### P-002 · Arrow arsenal numbers (TB-089, 2026-10-31, from the director's mechanics; simmed 2 Nov)
All in `ARROWS` (`src/data/balance.ts`). Rebound: jump 120, falloff 0.6 per bounce, bolt speed 420, hops 1 + rank. Shock: 3 targets, 0.3 × lob dmg, jump 90. Thunderclap: 0.5 s. Frost: 3 s, slow 0.2 + 0.05 × (rank − 1). Shatter: radius 50, 1.0 × dmg × 1.4^(rank − 1). Starfall: every 10th lob, 8 arrows, r 26, 0.6 s fall, 0.08 s stagger, lob damage each; each aims where its orc will be on landing, held no closer than the wall's face. Costs in SKILL-TREE.md.

Sim, 2 Nov (set F tiers): each arrow node knocked out (`--cost <id>=1e15`, never affordable) against the base, greedy, `--hwbuy`, 300 min, seeds 1 / 2. Base: best wave 29 / 29, Heartwood 245 / 215, tier 2 at play min 84 / 97.

| Node | First bought (play min) | Best wave without it | Heartwood without it |
|---|---|---|---|
| Rebound | 85 / 89 | 29 / 30 | 251 / 215 |
| Frost Arrows | 76 / 74 | 28 / 29 | 215 / 185 |
| Shatter | 93 / 98 | 29 / 29 | 251 / 233 |
| Shock Arrows | 110 / 114 | 28 / 29 | 203 / 197 |
| Thunderclap | 119 / 122 | 28 / 28 | 203 / 194 |
| Starfall | 144 / 150 | 28 / 29 | 233 / 188 |

Read: the bot buys every arrow node, all after tier 2 opens, and none is worth more than one wave; Frost, Shock, Thunderclap and Starfall each cost 10–40 Heartwood when missing, about the seed spread (30). No number change proposed: the arrow nodes are fair side buys, not carries. Same shape as the mythics (P-128): only changes to the elf's own lob move the fall wave.

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
cost    = round(base × growth^rank × 1.1^max(0, w − 10))     (new: wave-scaled node cost, uncapped)
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
- Rarity weights normal/boss: common 70.47/0, rare 25/45.1, epic 4.5/45, legendary 0.03/9, mythic 0/0.9 (P-108; boss column is the simmed 40/40/8/0.8 rescaled to sum 100). Each weight × (1+luck)^rank × (1 + 0.15(lootTier−1))^rank, rank 0–4.
- Affixes per rarity 1/2/3/4/4; ranges × 0.75 × (1 + 0.03 · ilvl) (`AFFIX.gain` 0.75, P-108b). Item level = wave, capped at 20 + 10 × prestiges. Commons stop after prestige 3, rares after 8. Affixes roll only for features the player owns (TB-114, `AFFIX_NEEDS`): Kinship needs any companion; Packbond the wolf, Talons the hawk, Roots the treant, Blades the knives, Ballistae the ballista, Thorns the spikes, Banner/Mail/Mending the vanguard (Muster), Elitebane elites marching; fire, storm and moon affixes need that arrow.
- Pity: legendary weight +10% per boss without one; mythic guaranteed by the 25th boss without one.
- Sets: 2/4/6-piece bonus +20/50/100% to the set's stat (Rootwarden 15/40/80%).

### P-099 · Set bonus numbers (2026-10-31, TB-099)
All in `SET_FX`. Nightknife: knives +25% rate / bleed 3 s, +30% taken / every 3rd throw fans 5 knives. Emberwright: burn +30% / burn spreads to 2 within 90 px / fire lobs leave Cinderground 4 s (burn, 25% slow). Stormcaller: +1 chain / chain reach +50% / killing link rebounds up to 3, storm +30% rate. Siegebreaker: ballista +25% rate / first bolt hit +50% and shoved 30 px / last bolt hit pinned 2 s, takes ×2. Moonveil: lob +25% with Moonbow / moon shots always crit ×1.5 / Moonwell 3 s heals wall 2%/s. Packlord: companions +20% dmg / +25% speed while an orc is within 220 px of the wall / +1 wolf, treants root 1.5 s. Rootwarden: wall +15% / +0.5%/s regen / once per run, wall below 25% makes rallies free for 10 s.
Evidence: `npm run balance` (default greedy) output identical to the tb-097 base (first fall wave 5, best wave 31): greedy runs rarely complete a set. Per-set tuning is TB-107.

### P-100 · Mythic power numbers (2026-11-01, TB-100)
Superseded for seven of the eight by P-128 (TB-128, 2 Nov); Pale Moon stands. All in `MYTHIC_FX`. The Last Knife: a knife that hits turns back, pierces all on the way home. Heart of the Kiln: burn never ends, +10% burn damage per second burning. Thunder's Memory: each storm stores a charge; at 10 the next lob hits every orc for ×3. Oakspine: a bolt's 3rd hit drives a stake (r 10, 8 s) that holds the first orc to touch it. Sliver of the Pale Moon: with the Moonbow draw ×0.5 cooldown, each shot costs 2% wall, skipped below 10% wall. The First Wolf: companions +25% damage per 15 s of the run, max 4 stacks. Heartwood Splinter: once per run the fallen wall stands again at 30%; that run pays ×0.5 Heartwood (floor `PRESTIGE.minGain`). Starfall Cloak: every 100 starlight from kills strikes the highest-HP orc for ×5 damage, 1 s cooldown; Item Find +15%.
Evidence: `npm run balance` unchanged (greedy runs gear mythics too rarely to show). Per-mythic tuning is TB-107.

### P-101 · Spoils branch and Heartwood loot lines (2026-11-01, TB-101)
Numbers in `SPOILS_FX` (lootTables) and `HW_FX` (heartwood). Spoils costs 120 / 150 / 200 / 600 / 900 / 4000 / 6000 starlight; Hunter +5% crit (crit stays ×3, gear crit works without it, director 2026-11-01); Scavenger salvage ×1.5; Trophy every 10th wave; Sharp Eyes +10% Item Find; Hoard +1 rarity tier capped at legendary; Resonance +1 set piece; Echo ×1.25. Heartwood lines as in the table above, 6 lines and 10 ranks, 106 HW to buy all.
Evidence: `npm run balance` (greedy, seed 1, 30 min) vs the tb-110 base: first four falls identical (waves 5, 5, 7, 5); fifth fall wave 26 → 20, Heartwood 25 → 18, best wave 31 → 37. The runner now has Spoils nodes in its pool (Hunter's Eye is a cheap crit pick) and the report does not name purchases, so which node moved the curve is unmeasured. Tuning against drop rates is TB-107.

### P-102 · Glimmer reroll (2026-11-01, TB-102)
Reroll one affix of a worn item: cost = max(1, round(2 × 2^n × rerollMult)), n = rerolls already on that item (`REROLL` in lootTables). Costs 2, 4, 8, 16, 32…; with Glimmerwork 1, 2, 5, 10, 19. The new affix is a different id, keeps the item's arrow rule and the feature gate, value rolled at the item's ilvl.
Evidence: none yet; the greedy runner never rerolls. Tuning is TB-107.

### P-128 · Mythic and reroll measurement (2026-11-01, TB-128; closes the evidence gap in P-100, P-101, P-102)
Evidence: `npm run balance -- --minutes 300 --seed N --quiet` with `--mythic <id>` (locked mythic worn from the start, re-equipped each minute; at the end the run is played on with the power deleted and the affixes kept) or `--reroll` (each minute rerolls the lowest affix on the cheapest worn item while Glimmer lasts). Seeds 1–4.

Re-run 1 Nov after TB-132 (aim circle 20 px), TB-136 (tree bought only between runs) and TB-139 (the bot shops on each fall; before it the bot bought nothing after TB-136):

| Run | Best wave, seeds 1 / 2 / 3 / 4 | Mean | Power alone (waves, play-on trial) |
|---|---|---|---|
| base | 65 / 65 / 65 / 66 | 65.3 | |
| reroll | 64 / 65 / 64 / 66 | 64.8 | 275–298 rerolls, 19–21k Glimmer spent |
| The Last Knife | 63 / 65 / 66 / 65 | 64.8 | −1 / +1 / +1 / +1 |
| Heart of the Kiln | 64 / 65 / 65 / 65 | 64.8 | 0 / −1 / 0 / +1 |
| Thunder's Memory | 66 / 65 / 65 / 66 | 65.5 | 0 / 0 / +1 / +1 |
| Oakspine | 65 / 64 / 66 / 67 | 65.5 | 0 / +1 / 0 / 0 |
| Sliver of the Pale Moon | 65 / 65 / 65 / 65 | 65.0 | 0 / +1 / +1 / 0 |
| The First Wolf | 64 / 65 / 66 / 65 | 65.0 | 0 / −1 / +1 / +1 |
| Heartwood Splinter | 63 / 60 / 62 / 61 | 61.5 | 0 / 0 / 0 / +1 |
| Starfall Cloak | 66 / 65 / 65 / 64 | 65.0 | 0 / 0 / 0 / 0 |

Read (re-run): seed noise is now ±1 wave and the finding stands: no mythic power is worth more than +1 wave. Heartwood Splinter's −4 is its cost: it halves every run's Heartwood (seed 2: 469 vs 854); with `--tune MYTHIC_FX.splinterHw=1` it reaches wave 64 (Heartwood 814). Rerolls still buy nothing.

First measurement (before TB-132 and TB-136):

| Run | Best wave, seeds 1 / 2 / 3 / 4 | Mean | Power alone (waves, play-on trial) |
|---|---|---|---|
| base | 74 / 76 / 69 / 79 | 74.5 | |
| reroll | 77 / 73 / 74 / 74 | 74.5 | 277–374 rerolls, 23–26k Glimmer spent |
| The Last Knife | 73 / 71 / 75 / 79 | 74.5 | 0 / +2 / 0 / 0 |
| Heart of the Kiln | 76 / 74 / 73 / 74 | 74.3 | 0 / −1 / 0 / −4 |
| Thunder's Memory | 71 / 72 / 76 / 75 | 73.5 | 0 / 0 / +2 / 0 |
| Oakspine | 73 / 73 / 72 / 75 | 73.3 | 0 / 0 / +3 / −2 |
| Sliver of the Pale Moon | 76 / 75 / 76 / 75 | 75.5 | +3 / −1 / −1 / −4 |
| The First Wolf | 74 / 75 / 76 / 74 | 74.8 | 0 / +4 / −3 / 0 |
| Heartwood Splinter | 69 / 68 / 68 / 73 | 69.5 | 0 / 0 / 0 / +3 |
| Starfall Cloak | 74 / 74 / 75 / 74 | 74.3 | 0 / 0 / 0 / 0 |

Read: no mythic power moves the wave beyond seed noise (±4); Heartwood Splinter costs ~5 waves (traced in the re-run: its halved Heartwood). Rerolls are near free: Glimmer piles up faster than the doubling cost (2 × 2^n) drains it, and better affixes buy no waves. Late orc HP grows ~30% per wave, so a power worth +3 waves must be about ×2.2 damage; P-100's numbers are an order of magnitude short of that.
Target (director, 2 Nov): a mythic power is worth about +10% best wave, about +3 waves at today's best wave of ~29.

Re-run 2 Nov on set F tiers, with a fixed trial: the play-on trial used to start from the end-of-sim state, often a half-broken wall at tier 6 that fell within a wave whatever the gear. It now replays the last run from its start with the power on and off (`gearTrial` in `sim/run.ts`). 300 min, seeds 1 / 2. "×10" multiplies each power's main numbers by about 10 (`--tune`, listed below). The bot owned every source in its last run (wolf, knives, fire, storm, ballista, moon), so no power was idle for want of its source.

| Power | Worth, today's numbers | Worth, ×10 | ×10 tune |
|---|---|---|---|
| The Last Knife | 0 / 0 | 0 / 0 | `knifeBackLife=10` |
| Heart of the Kiln | +1 / 0 | 0 / +1 | `burnRampPerSec=1` |
| Thunder's Memory | 0 / +2 | 0 / +1 | `thunderCharges=3,thunderMult=30` |
| Oakspine | 0 / −1 | −1 / +1 | `stakeAfter=1,stakeSecs=30,stakeR=40` |
| Sliver of the Pale Moon | +4 / +3 | +12 / +13 | `moonDraw=0.1,moonCost=0` |
| The First Wolf | +1 / 0 | 0 / 0 | `wolfStack=2.5,wolfEvery=5` |
| Heartwood Splinter | 0 / 0 | 0 / +1 | `splinterFrac=1,splinterHw=1` |
| Starfall Cloak | 0 / 0 | +1 / 0 | `starfallEvery=10,starfallMult=50` |

Worn gear against bare is also +0 to −1 waves in the same replay. Tiers off (`TIERS.max=1`, seed 1, ×10) gives the same flat 0 to +2, so the tiers are not what hides the powers.

Read: Pale Moon already meets the target at today's numbers (+3 to +4, 10–14%) and needs no change. The other seven cannot reach it by scaling numbers: ten times the numbers still adds 0 to +1 wave. Each one boosts a side source (knives, burn, storm, ballista stakes, wolf, one wall refill, one strike on one orc), while the fall is set by the elf's lob against the crowd; only Pale Moon, which doubles the lob cadence, touches that. `knifeBackLife` is also the wrong lever: a returning knife reaches the elf well inside 3 s, so a longer life changes nothing (×1 and ×10 runs are identical).

Lob reworks (2 Nov; director chose "draft lob reworks", then "Build all seven": built as drafted). Mythic Echo makes each trigger sooner or last longer (mark and root ×1.25 long, Kiln and Wolf ramp ×1.25 fast, Splinter reaches ×3 sooner, storm window ×1.25, star chance ×1.25), never hit harder. Sizing: Pale Moon's ×2 cadence is worth +3 to +4, so each draft aims at about ×2 lob power on average while its condition holds. Worth is arithmetic from that rule, not simmed; each gets the replay trial once built.

| Power | New text (player-facing) | Numbers (MYTHIC_FX) | Average lob gain | Cost / condition |
|---|---|---|---|---|
| The Last Knife | Orcs your knives hit are marked for 3 s; your arrows deal double damage to marked orcs. | `knifeMarkSecs=3, knifeMarkMult=2` | ×1.6–2 (most of the crowd is knifed late) | needs Throwing Knives |
| Heart of the Kiln | Your arrows deal 10% more damage for every second the orc has burned, up to +150%. | `burnRampPerSec=0.1, burnRampMax=1.5` | ×1.8–2.2 on burning orcs | needs fire; nothing on unburnt orcs |
| Thunder's Memory | Each storm charges the bow: for 6 s after a storm strikes, you draw twice as fast. | `thunderDrawSecs=6, thunderDraw=0.5` | ×2 for the share of time charged (~60–90% with a full Stormcaller line) | needs storm |
| Oakspine | Your strike circle is 50% wider; orcs it hits are rooted 0.5 s. | `oakRadius=1.5, oakRootSecs=0.5` | ×2.25 area against a crowd, less on a thin field | none; weak on bosses |
| The First Wolf | The pack hunts with you: your arrows deal 25% more damage for every 15 s of the wave, up to 4 times. | `wolfEvery=15, wolfStack=0.25, wolfMax=4` (same numbers, now on the lob, reset each wave) | ×1.5–2 (×2 from 60 s into a wave) | slow start each wave |
| Heartwood Splinter | The wall feeds the bow: your arrows deal up to triple damage as the wall loses health (×1 full, ×3 at 10%). | `splinterMaxMult=3, splinterFloor=0.1` | ×1–3, about ×2 in the late waves that decide the fall | no second life, no Heartwood penalty |
| Starfall Cloak | Each arrow has a 25% chance to fall as a star: four times the damage in a circle half again as wide. Item Find +15%. | `starfallChance=0.25, starfallMult=4, starfallRadius=1.5` | ×1.75 damage, more with the wider circle | none |

Old powers retire with these (`knifeBackLife`, the stand-again, stored Thunder bolt, stakes, companion stacking, Starfall every 100 starlight). Item names, slots and drop rules stay. Save: worn mythics keep their id, so no migration.

Built (2 Nov): replay trial, `npm run balance -- --minutes 300 --seed N --quiet --hwbuy --mythic <id>`, seeds 1 / 2. The bot now reaches tier 6 by ~185 min (G1 prices and set F), so the replayed run is a tier-6 run falling near wave 23–30; Pale Moon is re-measured on the same footing.

| Power | Fall wave on, seeds 1 / 2 | Power off | Worth (waves) |
|---|---|---|---|
| Oakspine | 28 / 30 | 26 / 27 | +2 / +3 |
| Thunder's Memory | 24 / 26 | 24 / 23 | 0 / +3 |
| Starfall Cloak | 25 / 26 | 25 / 24 | 0 / +2 |
| Sliver of the Pale Moon (unchanged) | 24 / 26 | 24 / 24 | 0 / +2 |
| The Last Knife | 23 / 26 | 23 / 25 | 0 / +1 |
| Heart of the Kiln | 27 / 24 | 27 / 23 | 0 / +1 |
| Heartwood Splinter | 28 / 26 | 28 / 26 | 0 / 0 |
| The First Wolf | 23 / 26 | 24 / 26 | −1 / 0 |

Read: against the +10% target (~+3 waves at a wave-25 fall) only Oakspine gets there on both seeds; Thunder's Memory and Starfall Cloak reach it on one. Splinter and First Wolf add nothing: the bot's wall rarely sits low long before it falls, and tier-6 waves end before many 15 s stacks build. Every power is now on the lob, so further tuning is numbers in `MYTHIC_FX` only.

Tuning draft (2 Nov; director: "Draft numbers for me"). Two candidate sets per short power, replay trial as above (`--tune`, seeds 1 / 2). Power-off fall waves move ±2 between runs of the same seed, so read only gains seen on both seeds.

| Power | Set A | A worth | Set B | B worth |
|---|---|---|---|---|
| Starfall Cloak | `starfallChance=0.4` | 0 / +3 | `starfallChance=0.5, starfallMult=5` | **+3 / +3** |
| Thunder's Memory | `thunderDrawSecs=10` | 0 / +2 | `thunderDrawSecs=15, thunderDraw=0.4` | **+2 / +3** |
| Heart of the Kiln | `burnRampPerSec=0.25, burnRampMax=2` | +2 / +1 | `burnRampPerSec=0.5, burnRampMax=3` | +1 / +1 |
| The Last Knife | `knifeMarkSecs=6` | 0 / 0 | `knifeMarkSecs=6, knifeMarkMult=3` | +1 / −1 |
| Heartwood Splinter | `splinterFloor=0.5` | +1 / 0 | `splinterFloor=0.5, splinterMaxMult=4` | 0 / +1 |
| The First Wolf | `wolfEvery=5` | 0 / 0 | `wolfEvery=5, wolfStack=0.5` | +1 / 0 |
| The First Wolf, stress test | `wolfEvery=1, wolfStack=1` (×5 lob damage from 4 s into every wave) | 0 / 0 | | |

Applied (director 2 Nov, "Yes, both"): Starfall Cloak set B (half the arrows fall as stars, ×5) and Thunder's Memory set B (15 s window, draw ×0.4), now in `MYTHIC_FX` and the power text. Both meet the +10% target.

Finding: extra lob damage is worth nothing. ×5 damage for 20 of every 24 s adds 0 waves; the powers that work all reach more orcs (Oakspine and Starfall widen the circle, Thunder and Pale Moon speed the draw). The lob already kills what it lands on, so the wall falls to the orcs it never reaches. Last Knife, Kiln, Splinter and First Wolf multiply damage only, so no numbers can bring them to target. Also note `WAVE_LEN` is 24 s: First Wolf as built (`wolfEvery=15`) never passes one stack.

Reach draft (2 Nov; director: "Yes, both"). Last Knife, Kiln, Splinter and First Wolf keep their triggers but give reach instead of damage: `combat.drawMult(s)` scales the draw (First Wolf by `run.waveT`, Splinter by wall health, with Thunder's window), a Last Knife hit advances the draw by `knifeDraw` s, Kiln catches burning orcs `kilnReach`× as far from the circle's centre. Built on `tb-128-reach-draft` with the strongest set below as the defaults; same replay trial (seeds 1 / 2).

| Power | Set A | A worth | Set B | B worth | Set C | C worth |
|---|---|---|---|---|---|---|
| Heart of the Kiln | `kilnReach=1.5` | +2 / +2 | `kilnReach=2` | **+2 / +3** | | |
| The Last Knife | `knifeDraw=0.1` | +2 / 0 | `knifeDraw=0.25` | **+2 / +2** | | |
| The First Wolf | `wolfEvery=5, wolfDraw=0.1` | +1 / 0 | `wolfDraw=0.2` | 0 / 0 | `wolfEvery=3, wolfDraw=0.5` (×3 draw from 12 s) | 0 / +4 |
| Heartwood Splinter | `splinterDraw=2` | 0 / +1 | `splinterDraw=3` | +1 / 0 | `splinterDraw=4, splinterFloor=0.5` (×4 at half wall) | +3 / +1 |

Read: every reach version beats its damage version (Kiln 0/+1 → +2/+3, Knife 0/+1 → +2/+2, Splinter 0/0 → +3/+1, Wolf −1/0 → 0/+4). Kiln B is at target; Knife B is one wave short; Wolf C and Splinter C average +2 but split widely by seed, because both peak late (late in the wave, late in the wall's life) while the fall is decided by the crowd before that.

### P-108 · Loot pacing: rarer bosses and rarer top drops (2026-11-01, TB-108) · applied
Director (1 Nov): make bosses rarer; "candidate C looks okay, just make it like 20% slower"; approved "Yes, apply P-108" (1 Nov). Applied (G), now in Current and the data:
- `BOSS_WAVE.every` 10 → 50 (bosses.ts). A boss wave unlocks at wave 50, 100 …; runs fall near wave 85, so this is one boss per late run, about 1.9 per hour of play.
- `RARITY.weights` (lootTables.ts), normal / boss: legendary 0.5 / 17 → 0.03 / 9; mythic 0 / 3 → 0 / 0.9; common 70 → 70.47, boss rare/epic 40 → 45.1/45, so each column sums to 100 (same ratios as the simmed 40/40/8/0.8). Mythic pity stays 25 bosses (the "never past boss 25" cap).

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
Gear power: worn vs bare best wave +5 to +8 (seed 1, 25 h). Late orc HP grows ~30% per wave, so +60–90% power ≈ +2–3 waves and "+10 waves" ≈ ×14 power: the two targets disagree. Director (1 Nov) picked +60–90% power. The runner's play-on trial (end state, worn vs bare) gives −5 to +7 waves by seed, too noisy to tune on.
Found: past wave ~117 combat stopped (0 kills/min, wall 100%, waves ticked to 463 on seed 3 at bosses every 60); fixed by TB-126 (P-126).

### P-108b · Gear power: affix gain 0.75 (2026-11-01, TB-108) · applied
Director (1 Nov): target +60–90% gear power (about +2–3 waves); "Yes, tune down"; approved "Yes, apply" (1 Nov). Applied: `AFFIX.gain` 1 → 0.75 (lootTables.ts), so every affix rolls at 75% of today's value. Sets and mythics unchanged.

Evidence: `npm run balance -- --minutes 1500 --seed N --quiet [--bare | --tune AFFIX.gain=G]` with P-108 drops. Best wave in 25 h, seeds 1 / 2 / 3 / 4:

| | Best wave | Gain over bare | Mean |
|---|---|---|---|
| Bare | 85 / 85 / 84 / 86 | | |
| Gain 1 (now) | 89 / 89 / 90 / 91 | +4 / +4 / +6 / +5 | +4.75 |
| Gain 0.75 | 87 / 84 / 87 / 88 | +2 / −1 / +3 / +2 | +1.5 |
| Gain 0.5 (seeds 1–2) | 84 / 101 | −1 / +16 | noise |
| Gain 0.3 (seeds 1–2) | 83 / 86 | −2 / +1 | |

Read: 0.75 puts three of four seeds at +2–3 waves; seed noise is about ±2 waves. 0.5 and below are indistinguishable from bare except for one lucky seed.

### P-111 · Per-type upgrade nodes (2026-11-01, TB-111)
Design from the director (1 Nov): see SKILL-TREE §Per-type upgrade nodes. Numbers in `SHOT_FX`, `UNIT_FX`, `ELF_FX` (`src/data/balance.ts`).
- Enchantment chance per shot: 0.25 on unlock + 0.15 per Quiver rank, capped at 1 (fire, frost, shock, rebound, moon). Starfall 0.1 + 0.05 per Wishing Star rank (replaces "every 10th lob"). Thunderclap stuns only on shots that roll shock.
- Shot damage nodes ×1.3^r (Kindling burn, Static zap, Hard Rebound, Starsteel, Keen Knives); Moonsilver ×1.2^r on the Moonbow's ×1.6, which now applies to moon shots only.
- Effects: Wildfire +1 s burn, Thunderclap +0.25 s stun per rank past 1 (max 3), Moonpull homing reach ×(1 + 0.25r), Meteor Shower +2 arrows, Knife Fan +1 knife per throw, Pinning Bolts root every orc a bolt passes 0.3 s per rank, Windlass reload ×0.9^r. Nimble Wrist is rate only now (its ×1.35 damage moved to Keen Knives at ×1.3).
- Units: damage ×1.3^r (Fangs keeps ×1.4, Spear Drill ×1.3 now spearmen only), rate ×1.15^r, crit +0.05 per rank at ×2 + 0.5 per Crit-damage rank, move speed ×1.15^r (wolf, spearman, bladedancer). Rangers and Wardens crit by their own nodes, no longer Keen Eye. Deadly Aim: elf crit ×3 + 0.5 per rank.
- Costs (starlight base, growth): shot nodes 150–7000 near their unlock's cost (SKILL-TREE table); unit nodes damage ×1.2, rate ×1.4, crit ×1.6, crit damage ×2, speed ×1 of the unit's unlock cost, growth 1.9–2.0.
Evidence: `npm run balance` (greedy, seed 1, 30 min) vs origin/main 2f4dd10: first four falls identical (waves 5, 5, 7, 5); fifth fall wave 20 @ 8 min → 18 @ 7 min, then a sixth run to wave 35 @ 13.7 min; replants 5 → 6, Heartwood 18 → 48, best wave 37 → 35. The 48 extra nodes give the greedy buyer cheap power, so later runs climb faster. Per-node tuning is TB-107.

### P-125 · One orc swing can drop the wall from full (2026-11-01, TB-125; director chose A, now in Current)
Today an orc's swing takes `atk × wallMult` = 0.025 × 10 = 0.25 × the orc's max health off the wall. Orc health grows ×1.3 per wave after wave 15 (`HP_RAMP`); the wall's max grows only with Seasoned Timber, Timber Heartwood and `heart`. So late in a run the first orc to reach the wall fells it, whatever the wall's HP, regen or rallies.

Evidence: headless probe, greedy buys, crowd aim, seeds 1–3, 120 sim minutes each (largest single hit as a share of the wall's max, by wave band):

| Variant | Largest hit, waves 30s / 40s / 50s–60s | Falls from above half HP in one hit | Best wave | Later runs (minutes) |
|---|---|---|---|---|
| Current | 170–280% / 2,700–5,900% / up to 75,000% | 5 of 10–12 falls per seed, every fall from wave 33 on | 60–61 | 13–24 |
| A: hit capped at 25% of the wall's max | 25% | 0 | 59–62 | 14–25 |
| B: hit capped at 10% of the wall's max | 10% | 0 | 62–63 | 14–25 |
| C: wall hit on a gentler curve (×1.17 per wave, no ramp) | 44–60% / 270–300% / 490–760% | 3 | 57–59 | 9–23 |

Proposal: A. Add `BARRICADE.maxHitFrac: 0.25`; `barricadeHit` takes `min(amount, maxHitFrac × barMax)`. The wall then always survives at least four swings, so Timber, Patient Hands and rallying keep mattering late, and pacing barely moves (best wave and run lengths within a wave and a minute of Current). B also works and is more forgiving (+1–2 waves). C is rejected: it still one-shots from wave 40 and shortens early runs. Early waves are unchanged by A and B (hits there are 1–3% of the wall).

### P-127 · Shaman fireball flight (2026-11-01, TB-127; presentation only, damage waits on TB-087)
`FIREBALL` in `src/data/orcs.ts`: flight 0.9 s, arc 55 px, strike radius 24 px, damage 0. The ball leaves the staff tip and lands where the shaman aimed when it cast; nothing takes damage yet. Chosen so the cast-sheet throw (35 frames at 15 fps, release about frame 18) reads as one motion with the lob, and so the strike circle matches the elf's own 24 px strike circle for a familiar read. Once TB-087 fixes shaman stats, damage, target choice (wall or vanguard) and cadence go here with sim output.
### P-126 · Crowd control froze the field at the orc cap (2026-11-01, TB-126; director chose no re-stun, now in Current)
Cause, from a state dump at wave 110 (seed 3, bosses every 60, legendary and mythic weights raised): all 160 live orcs held. 128 sat stun-locked at the spawn edge (x 800–1000): maxed Quiver makes every shot roll shock, Thunderclap stun 1.0 s outlasts the 0.57 s lob cadence, and crowd aim keeps hitting the thickest pile, which is the frozen one. 32 sat root-locked by the Treant set's 1.5 s root, re-applied on every stamp faster than it wore off. With the cap full nothing spawned, nothing reached the wall, and the run never fell.

Seed 3, 25 sim hours, greedy (falls are waves; the stalling tune is `BOSS_WAVE.every=60` with legendary weight 0.04/10 and mythic 1):

| Rule | Last 10 falls, every 60 | Best | Last 10 falls, stalling tune | Stall |
|---|---|---|---|---|
| Before (refresh on every hit) | 85–93 | 93 | n/a | yes |
| No re-stun or re-root while held | 83–87 | 87 | 82–86 | no |
| No re-stun, plus immune for 0.25× / 1× the hold after | 80–83 | 83 | 81–85 / 80–83 | no |

Applied: no re-stun or re-root while held. It costs 4–6 late waves on this seed, because the top waves came from orcs frozen in place rather than from kills; an immunity window after the hold costs more and adds per-orc state.
