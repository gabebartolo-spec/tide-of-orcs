# Balance — formulas and pacing targets

Two sections. `## Current` is what ships and is human-owned. `## Proposed` is where agents put changes, each with the simulator output that justifies it. Nothing moves from Proposed to Current without Gabe's sign-off. `src/data/balance.ts` mirrors `## Current` and the tests pin the reference tables.

## Current (v1.1)

### Field
- Logical size 900 × 480. Barricade at x = 150, 14 px wide. Elf at (64, 240). Vanguard stand at x = 194 in lanes H/2 ± 70k.
- Wave length `WAVE_LEN = 24 s`. Wave starts at 1. Fixed step 1/50 s.

### Orc scaling (w = wave)
```
hp(w)       = 10 × 1.17^(w−1)
loot(w)     = 2  × 1.13^(w−1)
interval(w) = max(0.3, 2.0 × 0.93^(w−1))   seconds between spawns, before Horde
speed       = base × (1 + 0.008 w)
atk         = 0.025 × maxhp                  per swing, one swing per second, vs wall or vanguard
```
Type multipliers in GDD §4. Live orc cap 160.

| w | hp | loot | interval | grunt atk/s |
|---|---|---|---|---|
| 1 | 10 | 2 | 2.00 | 0.25 |
| 10 | 40.9 | 6.0 | 1.04 | 1.02 |
| 25 | 433 | 37.6 | 0.35 | 10.8 |
| 50 | 21,933 | 795 | 0.30 | 548 |

### Player and sources
- Base damage 6, base fire rate 1.2 volleys/s, arrow speed 520, crit ×3. (v1.0 had 4 and 1.1; raised because the bare archer's 4.4 dps was below wave-1 incoming HP of 5 hp/s and the river had been hiding it.)
- Burn: 35% of player dmg per second for 3 s (refreshes, no stack).
- Storm: 4× dmg × kin per jump, 6 s cooldown, 5 targets, 140 px jump radius, seeks from 200 px past the wall.
- Hawk: 2.5× dmg × kin, 4 s, 60 px radius. Treant: 3× dmg × kin, 3 s, 160 px from the wall.
- Ballista: 40 × 1.5^bolt × kin every 4 s, infinite pierce. Knives: 5 × 1.35^nimble × kin every 1.4 s ÷ 1.2^nimble.
- Aimed volleys: same damage as auto volleys; Moonbow homing radius around the reticle 70 px. (A tunable `aimMult` can be introduced here if testing shows aiming needs a reward beyond target choice.)

### Barricade
```
barMax   = 400 × 1.25^timber × heart
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
| 25 | 226 | 2,165 | 677 |

### Economy
- `starMult = 1.15^glean × heart`. Heartwood: `heart = 1 + 0.12 × HW`, applied to damage, starlight, barricade HP and vanguard HP.
- Offline: `rate = loot(w) × starMult × spawnMult / interval(w) × (0.25 + 0.2 roots)`, capped at 8 h, zero while fallen.

### Prestige
- Forced on barricade fall; voluntary from wave 12. `HW = floor((w − 4) × 0.75) + floor(runKills / 400)`.

### Pacing targets (what the sim must hit)
| Target | Value | Status (greedy policy, seeds 1–3) |
|---|---|---|
| First purchase | ≤ 30 s | met |
| Muster affordable | ≤ 2 min | met |
| First barricade fall, first run | wave 14–22 | **miss: wave 7–9 (~3 min)** |
| A spearman pays for itself | ≤ 45 s of kills | untested |
| Second run reaches first-run fall wave | ≤ 65% of first run's time | met, too easily (see Proposed) |
| Bare archer, no purchases, holds | ≥ 5 waves | met (falls wave 9) |
| Tree fully bought in a run | never | met |

## Heartwood tree (M3, DRAFT)
Spent in Heartwood, never reset. Costs in HW.

| id | Name | Max | Cost | Effect |
|---|---|---|---|---|
| hw_dawn | Early Dawn | 5 | 2, 4, 8, 14, 22 | Start each run at wave +2 |
| hw_wolf | Old Friend | 1 | 3 | Start with Grey Wolf |
| hw_timber | Stout Timber | 3 | 4, 8, 16 | Barricade base HP +25% |
| hw_orders | Standing Orders | 2 | 5, 12 | Start each run with one Spearman (two at rank 2) |
| hw_sleep | Long Sleep | 2 | 5, 12 | Offline cap +4 h |
| hw_boss | Warlords | 1 | 15 | Warboss can appear on waves divisible by 5 |

## Simulator (`npm run balance`)
Lives in `sim/run.ts`. Runs `src/sim/` headless at 50 steps/s and decides every 0.5 s with a policy:
- **greedy**: rally a spearman (bladedancer if owned) when the wall is under 50%; otherwise buy the cheapest affordable node.
- **wall**: like greedy but rallies at 90% and weights Barricade/Vanguard nodes at half cost.
- **nobuy**: never spends. Measures the bare archer.
- **dps** (TB-040): buy the node with best Δ starlight/min ÷ cost over a 2-minute lookahead.

Report columns per minute: wave, starlight, kills/min, kills, wall %, vanguard count, nodes owned, HW, falls. Summary line gives first fall wave, replants, Heartwood, best wave. Writes `sim/out/<policy>-<date>.md` unless `--quiet`. CI runs 30 minutes of greedy as a smoke test.

## Proposed

### P-001 · First-run fall is too early; second run snowballs (2026-10-30, from M0 bring-up)
Evidence: `npm run balance --policy greedy --minutes 20` seeds 1–3: first fall at wave 7–9 with 2–3 HW; the second run then reaches wave 42–44 with the wall never under 100% and 120 nodes bought.

Diagnosis: (a) brute share grows fast enough that the first run can't buy Shieldwall/Timber in time; (b) Call the Horde (+20% spawn per rank at 160 base) is pure upside once DPS exceeds incoming, and `heart` multiplies damage, starlight, wall and vanguard at once, so 2 HW is ~+25% on everything.

Candidates to test (one at a time, same seeds):
1. Heartwood +12% → +8%, and apply it to damage and starlight only (not wall/vanguard HP).
2. Call the Horde also raises orc atk by 10%/rank, so it's a trade.
3. Brute share base 0.18 → 0.12 for waves < 8.
4. Barricade base 400 → 600 and Seasoned Timber 1.25 → 1.2.

Target after change: first fall wave 12–18 on seeds 1–3; second run falls by wave 30.
