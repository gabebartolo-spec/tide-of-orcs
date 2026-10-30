# Tide of Orcs — Game Design Document

Status: **Current** (v1.1, barricade design). Core-loop sections (§2–§5) are human-owned; ask before changing. The reference implementation is `docs/prototype.html`.

## 1. Fantasy and tone
You are the last warden of a grove on the western edge of a wide plain. Between you and the orc tide stands a timber barricade. The tide comes from the east, forever, and one day the wall will fall. That day isn't a loss. The grove burns down to a seed, you carry back Heartwood, and the next wall stands longer.

Mood words: patient, verdant, lamplit, unhurried. A siege you will eventually lose and learn from. Never gritty, never grimdark. Orcs are weather.

## 2. Core loop

```
orcs march west → arrows and companions drop them → starlight drops
     ↓                                                    ↓
orcs that reach the wall hack at it (or at your vanguard)  spend starlight: tree nodes OR rally vanguard
     ↓                                                    ↓
waves scale every 24 s  ←──── battlefield visibly grows ←──┘
     ↓
the barricade falls → run ends → Replant → Heartwood → next run grows faster
```

**Core verb:** buy a node. **Core tension:** every starlight spent on the tree is starlight not spent on a spearman at the wall. **Core reward:** watch the field change.

Session shape (first run, from the simulator):
- Minute 0–1: lone archer. Orcs reach the wall almost immediately; the first Sharpened Tips rank lands within 30 s.
- Minute 1–3: Muster, wolf, knives. Spearmen hold the thick of it; the wall is hacked but mends.
- Minute 3–5 (wave 7–9): brutes outpace the line and the first wall falls. First Replant: 2–3 Heartwood.
- Later runs: companions and armoury fill out; Thornwall and Patient Hands make the wall a weapon; Bladedancers hold a clear plain. Runs of 20–40 minutes, then voluntary Replant.

## 3. The barricade and the fail state (signature mechanic)
A timber palisade at x=150 (14 px wide) across the full field height. It has health.

**State machine:** `intact → damaged → (Deep Roots regrow, once) → fallen → replant`.

- `barMax = 200 × 1.25^Seasoned Timber × heart` (BALANCE.md has the current base; the prototype ships 400).
- Orcs reaching `x ≤ barX + barW + r` stop and swing once per second for `atk = orcAtkFrac × maxhp` (0.025). Damage scales with waves exactly as orc HP does, so the wall's relative pressure comes from *how many* orcs leak, not from a separate curve.
- **Patient Hands** mends 1% of max per second per rank. **Thornwall** damages anyone hacking the wall for 20% of player damage per second per rank. **Deep Roots** regrows the wall to 50% once per run the moment it would fall.
- **Fallen:** when HP hits 0 the sim freezes, the field shows "The barricade has fallen" with wave, slain, minutes held and Heartwood carried back, and a single button: *Replant the grove*. Nothing else is interactable. Starlight does not accrue offline while fallen.
- Buying Seasoned Timber heals the wall by the amount of max HP it adds (growing the wall is new timber).
- Screen shake on each hit scaled to damage fraction; splintered dark planks appear from the top as HP drops.

The field hint reads: "Hold the barricade. Rally vanguard with starlight to meet the tide in melee; tap the field to loose an extra volley."

## 4. Waves and orcs
- Waves are timed: one every 24 s regardless of kills. `wave` is the only difficulty driver.
- Spawn interval shrinks per wave (BALANCE.md), multiplied by Call the Horde.
- Spawn position: x = field width + 24, y uniform in [50, H−50]. Hard cap 160 live orcs.

| Type | HP × | Speed | Loot × | Radius | Notes |
|---|---|---|---|---|---|
| Grunt | 1.0 | 48 | 1.0 | 12 | Baseline |
| Runner | 0.55 | 78 | 0.7 | 9 | Share rises with wave to 35% |
| Brute | 3.2 | 34 | 3.0 | 16 | Share rises with wave to 33%; the wall-breaker |
| Warboss | 28 | 26 | 30 × Bounty | 24 | Waves divisible by 10, one at a time, 8% roll per spawn |

Speed scales ×(1 + 0.008·wave). All orcs swing at the wall or a vanguard for 2.5% of their max HP per second.

## 5. Vanguard (melee, bought with starlight)
Vanguard are not tree nodes. **Muster** unlocks the rally bar under the field; each rally spends starlight on one unit that walks from the wall to x = barX + 44 and holds a lane (H/2, then ±70, ±140 …) until killed. Cap: 2 + Close Ranks. They are lost on Replant.

| Unit | Unlock | Cost | HP | Damage per swing | Swing | Reach | Notes |
|---|---|---|---|---|---|---|---|
| Spearman | Muster | 6 × loot(wave) | 5 × waveHP(wave) × 1.3^Shieldwall × heart | 1.6 × player dmg × 1.3^Spear Drill × Kinship | 0.8 s | 28 | One target |
| Bladedancer | Bladedancer node | 18 × loot(wave) | 4 × waveHP(wave) × 1.3^Shieldwall × heart | 1.4 × player dmg × 1.3^Spear Drill × Kinship | 0.45 s | 34 | Cleaves every orc in reach |

Orcs within `r + 18` px of a vanguard engage it instead of advancing, swinging once per second for `atk`. **Field Mending** heals vanguard 3%/s per rank. Rally costs scale with wave, so a late reinforcement is a real decision. Both buttons show cost, grey out when unaffordable or the line is full ("Line is full"), and say "Learn Muster" before the node is owned.

Design intent: vanguard are the *reactive* spend. The tree is the *investment* spend. A good player rallies when the wall dips under half, and buys nodes when it's quiet.

## 6. The player
- Elf archer at (64, H/2). Auto-targets nearest live orc. Fires a volley of `arrows` arrows in a 0.09-rad fan at 520 px/s.
- Damage, fire rate, pierce, crit (×3), homing (Moonbow), burn (Fire Arrows) all come from `Stats`.
- **Active bonus:** tapping/clicking the field fires an extra volley toward the nearest orc at 1.5× damage. No cooldown; never required; disabled while fallen.

## 7. Companions
All companion damage scales with Kinship (×1.2/rank) and Heartwood. Kinship also scales vanguard.

| Companion | Node | Behaviour |
|---|---|---|
| Grey Wolf | wolf | Runs to nearest orc on the plain (not the spawn edge), bites every 0.5 s for 6 × 1.4^Fangs |
| Ranger / Warden | ranger, warden | Stand 90 px above/below the elf behind the wall, fire volleys at 70% player damage |
| Hawk | hawk | Circles mid-field; every 4 s dives on the orc with the most neighbours within 60 px, 2.5× player damage to all |
| Treant | treant | Rooted just in front of the wall; every 3 s stamps every orc within 160 px of the wall for 3× player damage; shakes the screen |

## 8. Armoury
| Weapon | Node | Behaviour |
|---|---|---|
| Throwing Knives | knives | Auto-throw at nearest orc every 1.4 s ÷ 1.2^Nimble; damage 5 × 1.35^Nimble |
| Fire Arrows | fire | Player arrows apply 3 s burn at 35% player damage per second |
| Storm Glade | storm | Every 6 s, chain lightning from the orc nearest 200 px past the wall, up to 5 orcs within 140 px, 4× player damage each |
| Ballista | ballista | Every 4 s, a bolt at 760 px/s with infinite pierce, 40 × 1.5^Iron Bolts |
| Moonbow | moon | Player arrows steer toward their target (6 rad/s) and deal +60% |

## 9. Economy
- **Starlight**: the only run currency. Earned per kill: `loot(wave, type) × starMult`, `starMult = 1.15^Gleaning × heart`.
- Spent on tree nodes (geometric cost per rank) and on vanguard (linear in wave loot).
- **Offline**: on load, `rate = loot(wave) × starMult × spawnMult / interval(wave) × (0.25 + 0.2 × Dreaming Roots)`, capped at 8 h, zero while fallen. Shown as a toast.
- Early nodes cost 12–50 so the first purchase happens within 30 s and Muster within two minutes.

## 10. Prestige — Replant the Grove
- **Forced:** the barricade falls → the run ends → the only way forward is Replant.
- **Voluntary:** from wave 12 while the wall still stands, via the Replant tab.
- Heartwood gained = `floor((wave − 4) × 0.75) + floor(runKills / 400)`, so even an early fall at wave 6 pays one Heartwood.
- Each Heartwood: +12% starlight, +12% damage (player, companions, vanguard) and +12% barricade HP, permanent.
- Reset: tree ranks, starlight, wave, vanguard, companions, timers, Deep Roots charge. Keep: Heartwood, lifetime slain, best wave, prestige count, settings.
- **Heartwood tree (M3):** a small second tree spent in Heartwood, never reset. See BALANCE.md.
- Ceremony: confirm (automatic when fallen) → tree desaturates and burns upward in amber → one seed falls → field fades up through dawn. ≤ 4 s, skippable, reduced-motion safe.

## 11. UI
- **Header:** title, Starlight, Wave, Slain (lifetime), Heartwood. Tabular numerals.
- **Field:** 15:8 canvas. Top-left: barricade health bar (timber → amber → rose as it drops) with numbers, and vanguard count once Muster is owned. Bottom: wave timer bar. Toast at top. Fallen overlay covers the field when the wall is down.
- **Rally bar** under the field: the hint line plus Rally Spearman and (after the node) Rally Bladedancer buttons showing cost.
- **Grove panel:** tabs The Grove / Replant / Settings (M4). Tree canvas 760×680 with pan/zoom (TB-021); detail card below with branch, prerequisite, rank, description, cost and a single Learn/Improve button. Affordable nodes pulse amber. Click selects; click again buys.
- **Mobile:** panel stacks under the field; tree height 380 px; touch targets ≥ 40 px.
- All copy through `src/data/strings.ts`.

## 12. Onboarding (no tutorial)
- First 10 s: orcs reach the wall and the health bar ticks. The hint line says what to do about it.
- Sharpened Tips is pre-selected and affordable at 12 starlight. Muster is 50 and sits right next to the root.
- First purchase of any new node fires a toast ("Grey Wolf joins the grove"); first rally fires "Spearman takes the field".
- The Replant tab is visible from the start and says "Voluntary replant from wave 12", so the long goal is in view before the first fall explains the short one.

## 13. Accessibility
- Reduced motion: no screen shake, no bob, no pulse; replant ceremony becomes a 300 ms cross-fade.
- Colour never carries meaning alone: orc types differ in size and marking; the wall shows splinters as well as a colour shift; node states use fill + ring + text.
- Everything in the panel is keyboard reachable; tree nodes focusable in tab order by branch (TB-064).
