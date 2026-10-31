# Tide of Orcs — Game Design Document

Status: **Current** (v1.3, synced with the code 31 Oct 2026). Core-loop sections (§2–§5) are human-owned; ask before changing. `docs/prototype.html` is the original concept for tone, look and the core loop; its mechanics are historical (see §14).

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

**Core verb:** buy a node. **Core tension:** every starlight spent on the tree is starlight not spent on a spearman at the wall. **Core reward:** watch the field change. **Active play:** aim the bow with the pointer; it lobs an arcing arrow into the aim circle on its own cadence. With no aim the elf holds fire. There is no click-to-shoot.

Session shape (from the simulator, greedy policy, seed 1, 31 Oct 2026; since TB-080's wall ×10 the early runs are short and TB-054 will re-tune them):
- Minute 0–1: lone archer, grunts only. The first Sharpened Tips rank lands within 30 s.
- Minute 1–2 (wave 4–5): the first wall falls. Replant pays 1 Heartwood (the floor).
- Next few runs: each falls around wave 5–7 for 1–2 Heartwood, until enough Heartwood lets a run tip over.
- Later runs (run 5 on seed 1): Muster, companions and armoury fill out and the run reaches wave 20+ (fell at wave 24 at minute 17, 17 Heartwood). Summon runners, brutes and Blackguard for more starlight; summon boss waves from wave 10.

## 3. The barricade and the fail state (signature mechanic)
A timber palisade at x=150 (14 px wide) across the full field height. It has health.

**State machine:** `intact → damaged → (Deep Roots regrow, once) → fallen → replant`.

- `barMax = 400 × (1 + 0.25 × Stout Timber) × 1.25^Seasoned Timber × heart` (BALANCE.md owns the numbers).
- Orcs reaching `x ≤ barX + barW + r` stop and swing once per second. Each swing at the wall deals `wallMult × atk` = 10 × 0.025 × maxhp (TB-080: a bare run falls at wave 3–5). Damage scales with waves exactly as orc HP does, so the wall's relative pressure comes from *how many* orcs leak, not from a separate curve.
- **Patient Hands** mends 1% of max per second per rank. **Thornwall** damages anyone hacking the wall for 20% of player damage per second per rank. **Deep Roots** regrows the wall to 50% once per run the moment it would fall.
- **Fallen:** when HP hits 0 the sim freezes, the field shows "The barricade has fallen" with wave, slain, minutes held and Heartwood carried back, and a single button: *Replant the grove*. Replant is the only *run* action: the tree, the rally bar and boss summoning are closed. The Heartwood tree (Replant tab) and Settings stay usable while fallen, by design.
- Buying Seasoned Timber heals the wall by the amount of max HP it adds (growing the wall is new timber).
- Screen shake on each hit scaled to damage fraction; splintered dark planks appear from the top as HP drops.

The field hint (`STR.hint`) reads: "Hold the barricade. Move your pointer over the field to aim the bow; it looses on its own. Rally vanguard with starlight to meet the tide in melee." On coarse pointers `STR.hintTouch` says "Touch and hold the field to aim the bow" instead.

## 4. Waves and orcs
- Waves are timed: one every 24 s regardless of kills. `wave` is the only difficulty driver.
- At first only grunts march. Every other kind joins only when the player summons it with its Grove node (Goblin Runners → Brutes → Blackguard). Summoning is the risk-for-reward lever: more danger, more starlight. Falling is fine and expected; it feeds the replant loop.
- **Boss waves (TB-081).** Every 10 waves (wave 10, 20, 30 …) a boss wave unlocks and waits; nothing happens until the player presses *Summon the boss wave*. It is a 60 s challenge: regular marching pauses and a fixed script of mini-waves marches in (a shield line, edge flankers, rams, a wedge, the Warboss with two Blackguard, a scatter, a last push; `src/data/bosses.ts`). Slay every one before the minute ends and it pays 40 × the wave's loot in starlight; otherwise the stragglers keep marching as ordinary orcs and regular marching resumes. Unsummoned boss waves stack. The Warboss marches only in boss waves.
- Every kind has its own spawn clock and two nodes: **Fury** (+30% health, +40% starlight per rank) and **Swarm** (spawns 20% more often per rank). Grunts' are War Drums and Call the Horde.
- Spawn position: x = field width + 24, y uniform in [50, H−50]. Hard cap 160 live orcs.

| Type | HP × | Speed | Loot × | Radius | Spawns every | Unlock |
|---|---|---|---|---|---|---|
| Grunt | 1.0 | 48 | 1.0 | 12 | 1 × wave interval | always |
| Runner (small, fast) | 0.55 | 78 | 0.7 | 9 | 1.5 × | Goblin Runners |
| Brute (slow, strong) | 3.2 | 34 | 3.0 | 16 | 4 × | Brutes |
| Elite | 8 | 42 | 8 | 14 | 10 × | Blackguard |
| Warboss | 28 | 26 | 30 | 24 | only in a boss wave | — |

Speed scales ×(1 + 0.008·wave). All orcs swing once per second: a vanguard takes 2.5% of the orc's max HP, the wall takes 10× that (25%).

## 5. Vanguard (melee, bought with starlight)
Vanguard are not tree nodes. **Muster** unlocks the rally bar under the field; each rally spends starlight on one unit that walks from the wall to x = barX + 44 and holds a lane (H/2, then ±70, ±140 …) until killed. Cap: 2 + Close Ranks. They are lost on Replant.

| Unit | Unlock | Cost | HP | Damage per swing | Swing | Reach | Notes |
|---|---|---|---|---|---|---|---|
| Spearman | Muster | 6 × loot(wave) | 5 × waveHP(wave) × 1.3^Shieldwall × heart | 1.6 × player dmg × 1.3^Spear Drill × Kinship (crit, rate and speed nodes, SKILL-TREE TB-111) | 0.8 s | 28 | One target |
| Bladedancer | Bladedancer node | 18 × loot(wave) | 4 × waveHP(wave) × 1.3^Shieldwall × heart | 1.4 × player dmg × 1.3^Blade Drill × Kinship | 0.45 s | 34 | Cleaves every orc in reach |

Orcs within `r + 18` px of a vanguard engage it instead of advancing, swinging once per second for `atk`. **Field Mending** heals vanguard 3%/s per rank. Rally costs scale with wave, so a late reinforcement is a real decision. Both buttons show cost, grey out when unaffordable or the line is full ("Line is full"), and say "Learn Muster" before the node is owned.

Design intent: vanguard are the *reactive* spend. The tree is the *investment* spend. A good player rallies when the wall dips under half, and buys nodes when it's quiet.

## 6. The player
- Elf archer at (64, H/2). The elf only lobs (below); the draw (`lobCd`) never changes with input and holds when ready rather than banking shots.
- **Aiming is the active mechanic.** While the pointer is over the plain (right of the wall), a strike circle (40 px radius) follows it. Every 2.5 s (faster with Quick Draw) the elf lobs one arrow in a high arc; it lands 0.7 s later on the circle's centre and strikes every orc inside the circle for 3× bow damage, each rolling its own crit. Each owned enchantment (fire, frost, shock, rebound, moon) rolls its own chance per shot, 25% on unlock and +15% per Quiver rank (TB-111); Starfall rolls 10% per shot, +5% per Wishing Star rank. A cream ring around the circle fills as the bow draws; a dotted arc from the elf shows the flight. On touch, hold a finger on the field to aim; lift to release. There is no click-to-shoot and no tap bonus: skill is placing the circle (lead the pack, cover the brute at the wall), not clicking faster.
- With no aim (pointer off the field, over the grove side, or idle) the elf holds fire. It is an incremental, not an idle: the bow needs the player.
- Bow nodes reshape the lob: Wide Volley +20% radius per rank; Split Shot +1 extra arrow per rank landing at random inside the circle; Longshaft +1 repeat strike per rank, 0.35 s apart; a moon shot settles the circle on the nearest orc within 70 px (Moonpull +25% per rank) and strikes +60% harder (Moonsilver +20% per rank).
- Ranger and Warden always auto-target with straight volleys (a 0.09-rad fan at 520 px/s, `fireRate` = 1.2 × 1.15^Quick Draw per second); only the elf's bow is aimed. Bow nodes also carry over to their volleys: Split Shot adds arrows to the fan, Longshaft adds pierce, and Moonbow steers their arrows toward the target (6 rad/s). Each archer has its own damage, rate, crit chance and crit damage nodes (TB-111); fire on a volley arrow rolls Fire's chance.

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
| Throwing Knives | knives | Auto-throw at nearest orc every 1.4 s ÷ 1.2^Nimble, +1 knife per Knife Fan rank; damage 5 × 1.3^Keen Knives |
| Fire Arrows | fire | Shots that roll fire (25% + 15% per Fire Quiver rank) apply a 3 s burn (+1 s per Wildfire rank) at 35% player damage per second (×1.3 per Kindling rank) |
| Storm Glade | storm | Every 6 s, chain lightning from the orc nearest 200 px past the wall, up to 5 orcs within 140 px, 4× player damage each |
| Ballista | ballista | Every 4 s, a bolt at 760 px/s with infinite pierce, 40 × 1.5^Iron Bolts |
| Moonbow | moon | Moon shots (25% + 15% per Moon Quiver rank): the aim circle settles on the nearest orc within 70 px of the aim point, +60% damage; ranger/warden arrows steer toward their target (6 rad/s) |

## 9. Economy
- **Starlight**: the only run currency. Earned per kill: `loot(wave, type) × starMult`, `starMult = 1.15^Gleaning × heart`.
- Spent on tree nodes (geometric cost per rank) and on vanguard (linear in wave loot).
- **No offline progress**: nothing accrues while the game is closed or the tab is hidden.
- Early nodes cost 12–50 so the first purchase happens within 30 s and Muster within two minutes.

## 10. Prestige — Replant the Grove
- **Forced:** the barricade falls → the run ends → the only run action is Replant (the Heartwood tree and Settings stay open, §3).
- **Voluntary:** from wave 12 while the wall still stands, via the Replant tab.
- Heartwood gained = `max(1, floor((wave − 4) × 0.75) + floor(runKills / 400))`, so a fall at any wave pays at least one Heartwood (TB-080).
- Each Heartwood earned: +12% starlight, +12% damage (player, companions, vanguard), +12% barricade HP and +12% vanguard HP, permanent. Spending it on the Heartwood tree never lowers this bonus.
- Reset: tree ranks, starlight, wave, vanguard, companions, timers, Deep Roots charge. Keep: Heartwood, lifetime slain, best wave, prestige count, settings.
- **Heartwood tree (M3, TB-053):** five nodes on the Replant tab, bought with Heartwood and never reset: Early Dawn (start further on), Old Friend (start with the wolf), Stout Timber (wall base HP), Standing Orders (start with spearmen), Warlords (boss clear bonus). Numbers in BALANCE.md §Heartwood tree.
- Ceremony: confirm (automatic when fallen) → tree desaturates and burns upward in amber → one seed falls → field fades up through dawn. ≤ 4 s, skippable, reduced-motion safe.

## 11. UI
- **Header:** title, Starlight, Wave, Slain (lifetime), Heartwood (shown as `available / earned` once any is spent). Tabular numerals.
- **Field:** 15:8 canvas. Top-left: barricade health bar (timber → amber → rose as it drops) with numbers, and vanguard count once Muster is owned. Bottom: wave timer bar. Toast at top. Fallen overlay covers the field when the wall is down.
- **Rally bar** under the field: the hint line plus Rally Spearman and (after the node) Rally Bladedancer buttons showing cost, and the *Summon the boss wave* button (waiting count, then a countdown and orcs left while it runs).
- **Grove panel:** tabs The Grove / Replant / Settings. The tree is a 760×920 logical canvas shown in a 460 px tall view (380 px on narrow screens) with pan/zoom (TB-021); it opens at 1:1 on Waking (TB-082), branches are curved and the camera eases to the selected node (TB-066). Detail card below with branch, prerequisite, rank, description, cost and a single Learn/Improve button. Affordable nodes pulse amber. Click selects; click again buys. The Replant tab holds voluntary Replant and the Heartwood tree; Settings holds volume, motion, number format, save export/import and the playtest run log download (TB-070).
- **Mobile:** panel stacks under the field; tree view 380 px tall; touch targets ≥ 44 px on coarse pointers (TB-064). Mobile is off the roadmap until the PC web build is done; this layout is kept, not extended.
- All copy through `src/data/strings.ts`.

## 12. Onboarding (no tutorial)
- First 10 s: the player's pointer drifts onto the field, the strike circle appears with its draw ring filling, and the first arrow arcs into it; the hint line confirms it. Orcs reach the wall and the health bar ticks.
- Sharpened Tips is pre-selected and affordable at 12 starlight. Muster is 50 and sits right next to the root.
- First purchase of any new node fires a toast ("Grey Wolf joins the grove"); first rally fires "Spearman takes the field".
- The Replant tab is visible from the start and says "Voluntary replant from wave 12", so the long goal is in view before the first fall explains the short one.

## 13. Accessibility
- Reduced motion: no screen shake, no bob, no pulse; replant ceremony becomes a 300 ms cross-fade.
- Colour never carries meaning alone: orc types differ in size and marking; the wall shows splinters as well as a colour shift; node states use fill + ring + text.
- Everything in the panel is keyboard reachable; tree nodes focusable in tab order by branch (TB-064).

## 14. Divergences from the prototype
`docs/prototype.html` is frozen as the original concept. These mechanics have deliberately changed since; the docs and code win over the prototype.

| Change | Prototype | Now | Commit |
|---|---|---|---|
| Aiming | Straight volleys at the pointer, auto-target when not aiming | Arcing lob into a strike circle every 2.5 s; no fire without aim; Wide Volley node; Split Shot, Longshaft, Moonbow reshaped | 16e3060 (TB-079) |
| Offline progress | Offline starlight on return; Dreaming Roots node | None; Dreaming Roots removed | ab74ac8 (TB-023) |
| P-001 numbers | Base damage 6, `waveHP` 1.17/wave, flat node cost | Base damage 9, `waveHP` ramp ×1.30 past wave 15, node cost ×1.25 per wave past 10 | 2a6ec16 (TB-025) |
| Enemy mix | Random type rolls (runners, brutes) by wave | Grunts only until Grove nodes summon runners, brutes and the new Elite (Blackguard); per-kind Fury and Swarm; wall takes ×10; Heartwood floor 1 | 4ed98fb (TB-080) |
| Warboss | Random 8% roll on every 10th wave; Warboss Bounty node | Scripted 60 s boss waves the player summons every 10 waves; Bounty and Warboss nodes retired | e3b4536 (TB-081) |
| Prestige meta | Heartwood passive only | Heartwood tree (5 nodes) | dd09286, 3cc1563 (TB-053, TB-055) |
| Bow branch | No circle | Wide Volley widens the strike circle | 16e3060 (TB-079) |
