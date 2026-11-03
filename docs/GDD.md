# Let's Hunt Some Orc! — Game Design Document (repo: tide-of-orcs)

Status: **Current** (v1.4, synced with the code 3 Nov 2026). Core-loop sections (§2–§5) are human-owned; ask before changing. `docs/prototype.html` is the original concept for tone, look and the core loop; its mechanics are historical (see §14).

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

Session shape (from the simulator, greedy policy, seed 1, 31 Oct 2026; numbers untuned: balance comes after the bug bash and performance pass, director 3 Nov):
- Minute 0–1: lone archer, grunts only. The first Sharpened Tips rank lands within 30 s.
- Minute 1–2 (wave 4–5): the first wall falls. Replant pays no Heartwood; it comes only from bosses.
- Next runs: a fall pays no Heartwood, and Heartwood has no passive bonus (P-142), so progress comes from the run's skill tree and the Heartwood tree. Bosses (every 25 waves) pay the rest of the Heartwood.
- Later runs (run 5 on seed 1): Muster, companions and armoury fill out and the run reaches wave 20+ (fell at wave 24 at minute 17). Summon runners, brutes and Blackguard for more starlight; summon boss waves from wave 25.

## 3. The barricade and the fail state (signature mechanic)
A timber palisade at x=150 (14 px wide) across the full field height. It has health.

**State machine:** `intact → damaged → (Deep Roots regrow, once) → fallen → replant`.

- `barMax = 150 × (1 + 0.25 × Stout Timber) × 1.25^Seasoned Timber` (BALANCE.md owns the numbers; TB-154 was 400).
- Orcs reaching `x ≤ barX + barW + r` stop and swing once per second. Each swing at the wall deals `wallMult × atk` = 25 × 0.025 × maxhp (TB-154, director 1 Nov: the wall feels pressure from wave 1 and a bare run falls at wave 2–3). Damage scales with waves exactly as orc HP does, so the wall's relative pressure comes from *how many* orcs leak, not from a separate curve. One swing takes at most a quarter of the wall's max (TB-125), so even a late orc needs four swings to fell a full wall.
- **Patient Hands** mends 1% of max per second per rank. **Thornwall** damages anyone hacking the wall for 20% of player damage per second per rank. **Deep Roots** regrows the wall to 50% once per run the moment it would fall.
- **Fallen:** when HP hits 0 the sim freezes, the field shows "The barricade has fallen" with wave, slain, minutes held, items found by rarity with the best drop of the run (TB-103) and Heartwood carried back, and a single button: *Replant the grove*. Replant is the only *run* action: boss summoning is closed. Its button, *To the grove*, opens the Grove page (TB-136, director 1 Nov: "upgrade tree should be a separate page AFTER you die"): the Grove tree, the Satchel, the Heartwood tree and Settings, with *March again* to replant. Starlight is spent there and carries into the next run; Grove levels are kept.
- Buying Seasoned Timber heals the wall by the amount of max HP it adds (growing the wall is new timber).
- Screen shake on each hit scaled to damage fraction; splintered dark planks appear from the top as HP drops.

## 4. Waves and orcs
- Waves are timed: one every 24 s regardless of kills. `wave` is the only difficulty driver.
- **Join by wave (TB-158, director 2 Nov).** Grunts march from wave 1; runners join the tide on their own from wave 5, brutes from wave 10, Blackguard from wave 20, berserkers from 25, wolf riders from 30, shamans from 35, war drummers from 40 (TB-087, director 3 Nov). Until summoned, a kind that joins on its own marches at half its rate (director 2 Nov retune: runners at full rate walled runs at wave 10–11). Its summon node (Goblin Runners, Brutes, Blackguard, Berserkers, Wolf Riders, Shamans, War Drummers) doubles its base rate (×4 over unsummoned) and makes each one worth +150% starlight; Fury and Swarm ranks stack on top. Summoning is the risk-for-reward lever: more danger, more starlight. Falling is fine and expected; it feeds the replant loop.
- **Boss waves (TB-081).** Every 25 waves (wave 25, 50, 75 …; P-142, was 50) a boss wave unlocks and waits; nothing happens until the player presses *Summon the boss wave*. It is a 60 s challenge: regular marching pauses and a fixed script of mini-waves marches in (a shield line, edge flankers, rams, a wedge, the Warboss with two Blackguard, a scatter, a last push; `src/data/bosses.ts`). Slay every one before the minute ends and it pays 40 × the wave's loot in starlight and 3 Heartwood per 25 waves (3 at wave 25, 6 at 50), the only source of Heartwood (TB-171); otherwise the stragglers keep marching as ordinary orcs and regular marching resumes. Unsummoned boss waves stack. The Warboss marches only in boss waves. From tier 2 the boss wave gains an escort by tier (TB-087): two berserkers beside the rams (tier 2), two wolf riders round the flanks (3), two shamans behind the wedge (4), two war drummers beside the Warboss (5) (`TIER_ESCORT`).
- **Boss tiers (TB-148, director 2026-11-01: unlock across runs).** Clearing a boss wave while playing your highest unlocked tier unlocks the next tier for good (`meta.tier`). At *March again* the player picks any unlocked tier, shown as a named tide (First Tide, Second Tide …) beside the wave. A higher tier multiplies every orc's health and starlight from wave 1 and the boss Heartwood (`TIERS` in `src/data/bosses.ts`, formulas in BALANCE.md). A lower tier unlocks nothing. Six tiers, set F (director 2026-11-02): ×2 orc health, ×1.5 starlight, +100% boss Heartwood per tier; numbers in BALANCE.md P-148.
- Every kind has its own spawn clock and two nodes: **Fury** (+30% health, +40% starlight per rank) and **Swarm** (spawns 20% more often per rank). Grunts' are War Drums and Call the Horde.
- Spawn position: x = field width + 24, y uniform in [50, H−50]. Hard cap 160 live orcs.

| Type | HP × | Speed | Loot × | Radius | Spawns every | Marches from (summon node doubles it) |
|---|---|---|---|---|---|---|
| Grunt | 1.0 | 48 | 1.0 | 12 | 1 × wave interval | wave 1 (no summon node) |
| Runner (small, fast) | 0.55 | 78 | 0.7 | 9 | 1.5 × | wave 5 (Goblin Runners) |
| Brute (slow, strong) | 3.2 | 34 | 3.0 | 16 | 4 × | wave 10 (Brutes) |
| Elite | 8 | 42 | 8 | 14 | 10 × | wave 20 (Blackguard) |
| Berserker | 2.5 | 40 | 3.5 | 14 | 6 × | wave 25 (Berserkers) |
| Wolf rider | 2.0 | 90 | 3.0 | 15 | 5 × | wave 30 (Wolf Riders) |
| Shaman | 2.0 | 36 | 4.0 | 12 | 9 × | wave 35 (Shamans) |
| War drummer | 4.0 | 30 | 6.0 | 16 | 14 × | wave 40 (War Drummers) |
| Warboss | 28 | 26 | 30 | 24 | only in a boss wave | — |

Speed scales ×(1 + 0.008·wave). All orcs swing once per second: a vanguard takes 2.5% of the orc's max HP, the wall takes 10× that (25%).

The four later kinds (TB-087, P-087; values in `ORC_FX` and `FIREBALL`, `src/data/orcs.ts`):
- **Berserker:** below half health it rages: moves ×1.8 and hits ×2.
- **Wolf rider:** the wolf leaps the first vanguard it meets and lands beyond it. Slay it and the orc fights on afoot as a grunt.
- **Shaman:** halts 180 units from the wall and every 4 s lobs a fireball (0.9 s aloft) at the nearest vanguard, or at the wall when none stand. It burns every vanguard within 24 units for three grunt swings.
- **War drummer:** halts 260 units from the wall. Orcs within 100 units march and hit 25% harder; drums never stack. It beats every 0.8 s, and each beat plays the war-drum sound (TB-182).

## 5. Vanguard (melee, a standing line)
The **Muster** node puts a standing line of spearmen at the wall (TB-167; there is no rally bar). Each unit that falls returns after `VANGUARD.respawn` 12 s (×0.85 per Swift Muster rank, faster with the Training Area). Line size: 2 + Close Ranks; Bladedancer turns half the line into bladedancers. The Cost column is no longer charged in play (`vanCost` is used only by `sim/spearman.ts`).

| Unit | Unlock | Cost | HP | Damage per swing | Swing | Reach | Notes |
|---|---|---|---|---|---|---|---|
| Spearman | Muster | 6 × loot(wave) | 5 × waveHP(wave) × 1.3^Shieldwall | 1.6 × player dmg × 1.3^Spear Drill × Kinship (crit, rate and speed nodes, SKILL-TREE TB-111) | 0.8 s | 28 | One target |
| Bladedancer | Bladedancer node | 18 × loot(wave) | 4 × waveHP(wave) × 1.3^Shieldwall | 1.4 × player dmg × 1.3^Blade Drill × Kinship | 0.45 s | 34 | Cleaves every orc in reach |

Each vanguard marches on a different orc while there are enough past halfway, and vanguard closer than `VANGUARD.spread` (26 px) step apart, so two never merge into one figure (TB-173). Orcs within `r + 18` px of a vanguard engage it instead of advancing, swinging once per second for `atk`. **Field Mending** heals vanguard 3%/s per rank. Rally costs scale with wave, so a late reinforcement is a real decision. Both buttons show cost, grey out when unaffordable or the line is full ("Line is full"), and say "Learn Muster" before the node is owned.

Design intent: vanguard are the *reactive* spend. The tree is the *investment* spend. A good player rallies when the wall dips under half, and buys nodes when it's quiet.

## 6. The player
- Elf archer at (64, H/2). The elf only lobs (below); the draw (`lobCd`) never changes with input and holds when ready rather than banking shots.
- **Aiming is the active mechanic.** While the pointer is over the plain (right of the wall), a strike circle (20 px radius, TB-132) follows it. Every 1.25 s (faster with Quick Draw; TB-154, was 2.5 s) the elf lobs one arrow in a high arc; it lands 0.7 s later on the circle's centre and strikes every orc inside the circle for 1× bow damage (TB-154, was 3×: no one-shots early), each rolling its own crit. Each owned enchantment (fire, frost, shock, rebound, moon) rolls its own chance per shot, 25% on unlock and +15% per Quiver rank (TB-111); Starfall rolls 10% per shot, +5% per Wishing Star rank. A cream ring around the circle fills as the bow draws; a dotted arc from the elf shows the flight. On touch, hold a finger on the field to aim; lift to release. There is no click-to-shoot and no tap bonus: skill is placing the circle (lead the pack, cover the brute at the wall), not clicking faster.
- With no aim (pointer off the field, over the grove side, or idle) the elf holds fire. It is an incremental, not an idle: the bow needs the player.
- Bow nodes reshape the lob: Wide Volley +20% radius per rank; Split Shot +1 extra arrow per rank landing at random inside the circle; Longshaft +1 repeat strike per rank, 0.35 s apart; a moon shot settles the circle on the nearest orc within 70 px (Moonpull +25% per rank) and strikes +60% harder (Moonsilver +20% per rank).
- Ranger and Warden always auto-target with straight volleys (a 0.09-rad fan at 520 px/s, `fireRate` = 1.2 × 1.15^Quick Draw per second); only the elf's bow is aimed. Bow nodes also carry over to their volleys: Split Shot adds arrows to the fan, Longshaft adds pierce, and Moonbow steers their arrows toward the target (6 rad/s). Each archer has its own damage, rate, crit chance and crit damage nodes (TB-111); fire on a volley arrow rolls Fire's chance.

## 7. Companions
All companion damage scales with Kinship (×1.2/rank). Kinship also scales vanguard.

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
- **Starlight**: the only run currency. Earned per kill: `loot(wave, type) × starMult`, `starMult = 1.08^Gleaning` (Gleaning sits deep in the Grove, under War Drums).
- Spent on tree nodes (geometric cost per rank) and on vanguard (linear in wave loot).
- **No offline progress**: nothing accrues while the game is closed or the tab is hidden.
- Early nodes cost 12–50 so the first purchase happens within 30 s and Muster within two minutes.

## 10. Prestige — Replant the Grove
- **Forced:** the barricade falls → the run ends → the only run action is Replant (the Heartwood tree and Settings stay open, §3).
- **Voluntary:** from wave 12 while the wall still stands (TB-136): a header Replant button appears and ends the run as a fall does ("You leave the wall standing"), with the same Heartwood; the summary, Grove page and March again follow.
- A fall (or voluntary replant) pays no Heartwood. It drops only from cleared boss waves (§5; P-142; director 2026-11-02, TB-171).
- Heartwood has no passive bonus; it is spent on the Heartwood tree and on camp buildings (TB-188).
- **Specialisation path (TB-193a/c):** on the Replant screen, while the run has fallen, the player picks one path (Serpent, Fox, Magpie) or none for the next run; it can change every run. The path opens its branch of the Grove tree, gives a small starting bonus and is the only way its set and mythic drop (SKILL-TREE.md §Path nodes; `src/data/paths.ts`).
- Heartwood is spent only at a prestige (director, 1 Nov; TB-149): the Heartwood tree's buttons work only while the run has fallen (a fall or a voluntary replant), on the Grove page before *March again*. Mid-run the tree is shown but closed, and Heartwood from bosses waits for the next prestige.
- Reset: tree ranks, starlight, wave, vanguard, companions, timers, Deep Roots charge. Keep: Heartwood, lifetime slain, best wave, prestige count, unlocked boss tier (§4), settings.
- **Checkpoints (TB-159; every 5 since TB-172, director 2 Nov).** Clearing wave 5, 10, 15 … saves a checkpoint; every later run starts one wave past the last one cleared (wave 6, 11, 16 …). A checkpoint never goes back down; Early Dawn applies only if it starts a run further on. Boss waves skipped by the start are forfeited, as with Early Dawn. Old saves get the checkpoint for the best wave they reached. The interval is `CHECKPOINT.every` in balance.ts.
- **Heartwood tree (M3, TB-053):** five nodes on the Replant tab, bought with Heartwood and never reset: Early Dawn (start further on), Old Friend (start with the wolf), Stout Timber (wall base HP), Standing Orders (start with spearmen), Warlords (boss clear bonus). Numbers in BALANCE.md §Heartwood tree.
- Ceremony: confirm (automatic when fallen) → tree desaturates and burns upward in amber → one seed falls → field fades up through dawn. ≤ 4 s, skippable, reduced-motion safe.

## 11. UI
- **Header:** title; in a run the game HUD (TB-195b): the barricade wall bar with HP and vanguard count, the starlight gem, the wave banner (stamped CLEARED on each wave clear, replacing the wave toast); then Slain (lifetime), Heartwood (shown as `available / earned` once any is spent). Tabular numerals.
- **Tooltip plates (TB-195c):** hovering a skill-tree node shows a carved plate by the cursor with what the next rank changes (*now → next*), its cost and one line of flavour; the detail card shows the first sentence only.
- **Tab tokens (TB-195d):** the panel tabs are carved tokens (bow, satchel, seed, cog) that spring forward when chosen.
- **Field:** 15:8 canvas. Top-left: barricade health bar (timber → amber → rose as it drops) with numbers, and vanguard count once Muster is owned. Bottom: wave timer bar. Toast at top. Every kept item drop (TB-192) stands a light pillar in its rarity colour on the field, taller by rarity, with a banner under the toast (icon, rarity, name) and its rarity chime; legendary and mythic also shake and flash the field, and the Satchel tab counts the new items until it is opened. Fallen overlay covers the field when the wall is down.
- **Rally bar** under the field: Rally Spearman and (after the node) Rally Bladedancer buttons showing cost, and the *Summon the boss wave* button (waiting count, then a countdown and orcs left while it runs).
- **Pages (TB-136):** `body[data-mode]` is `run` (the field fills the screen under the header, which shows the stats and a Settings button), `camp` (after a fall: the Grove page, tabs The Grove / Satchel / Replant / Settings, *March again*) or `settings` (an overlay over the field, *Back to the field*). Panels and the field sit in a carved living-wood frame on a deep forest green with a faint gilded vine; buttons are carved plaques (ART-STYLE §UI wood).
- **Grove page:** tabs The Grove / Satchel / Replant / Settings. The tree is a 1288×1262 logical canvas shown in a 460 px tall view (380 px on narrow screens) with pan/zoom (TB-021); it opens at 1:1 on Waking (TB-082), branches are curved and the camera eases to the selected node (TB-066). Detail card below with branch, prerequisite, rank, description, cost and a single Learn/Improve button. Affordable nodes pulse amber. Click selects; click again buys. The camp never scrolls the page (TB-153): every tab fits the screen, and only the skill tree inside the Grove pans. The Replant tab holds voluntary Replant beside the Heartwood tree; Settings holds volume (the M key mutes and unmutes; automated browsers start muted, TB-196), motion, number format, save export/import and the playtest run log download (TB-070).
- **Encampment (TB-188b):** the grove strip west of the barricade holds four buildings in its top and bottom bands (bowyer top-left, forge top-right, kitchen bottom-left, training area bottom-right; `CAMP_SPOTS`). Clicking one opens its card over the strip: level (of 3), what it gives now and next, the cost in Heartwood and its material with the owned counts in brackets, and one Build/Upgrade button. Like the Heartwood tree, the button works only while the run has fallen; mid-run the card says upgrades open when the wall falls. Esc, ✕ or a click elsewhere on the field closes it. The Replant tab gains a third column, **Camp**: the four material counts (Sinew, Orc Iron, Game Meat, Straw & Hide), then each building's name, level, next effect, cost and button. Card and list are rem-sized, so the Settings text scale grows them; the card scrolls inside itself when it outgrows the field.
- **Mobile (TB-155, director 2 Nov):** the web build plays on phones held sideways. Touch aim: hold a finger on the plain and the strike circle sits 3.5 rem above the fingertip so the finger never hides it; lifting the finger stops the bow (aim-to-play holds). Only the first finger aims, so a second can press Rally. A portrait phone shows *Turn your phone sideways*. Under 540 px tall: slimmer frames and stats, the camp header hides, the Grove's detail card sits beside the tree, Satchel/Replant/Settings keep two columns. On a short touch screen the one-page fit stops at 80 % and the rest scrolls inside the tab (PC never scrolls). No pull-to-refresh, double-tap zoom, text selection or long-press menu. Touch targets ≥ 44 px on coarse pointers (TB-064).
- All copy through `src/data/strings.ts`.

## 12. Onboarding (no tutorial)
- First 10 s: the player's pointer drifts onto the field, the strike circle appears with its draw ring filling, and the first arrow arcs into it. Orcs reach the wall and the health bar ticks.
- Sharpened Tips is pre-selected and affordable at 12 starlight. Muster is 50 and sits right next to the root.
- First purchase of any new node fires a toast ("Grey Wolf joins the grove").
- The Replant tab is visible from the start and says "Voluntary replant from wave 12", so the long goal is in view before the first fall explains the short one.

## 13. Accessibility
- Reduced motion: no screen shake, no bob, no pulse; replant ceremony becomes a 300 ms cross-fade.
- Colour never carries meaning alone: orc types differ in size and marking; the wall shows splinters as well as a colour shift; node states use fill + ring + text.
- Everything in the panel is keyboard reachable; tree nodes focusable in tab order by branch (TB-064, TB-116): the tree canvas is one tab stop, Tab and Shift+Tab step through the nodes (the root, then each branch in legend order, parents before children) and leave the tree past either end, Enter or Space learns the selected node, and a dashed ring marks it while focus came from the keyboard.

## 14. Divergences from the prototype
`docs/prototype.html` is frozen as the original concept. These mechanics have deliberately changed since; the docs and code win over the prototype.

| Change | Prototype | Now | Commit |
|---|---|---|---|
| Aiming | Straight volleys at the pointer, auto-target when not aiming | Arcing lob into a strike circle every 2.5 s; no fire without aim; Wide Volley node; Split Shot, Longshaft, Moonbow reshaped | 16e3060 (TB-079) |
| Offline progress | Offline starlight on return; Dreaming Roots node | None; Dreaming Roots removed | ab74ac8 (TB-023) |
| P-001 numbers | Base damage 6, `waveHP` 1.17/wave, flat node cost | Base damage 9, `waveHP` ramp ×1.30 past wave 15, node cost ×1.25 per wave past 10 (×1.1 since P-142) | 2a6ec16 (TB-025), TB-142 |
| Enemy mix | Random type rolls (runners, brutes) by wave | Grunts only until Grove nodes summon runners, brutes and the new Elite (Blackguard); per-kind Fury and Swarm; wall takes ×10 | 4ed98fb (TB-080) |
| Warboss | Random 8% roll on every 10th wave; Warboss Bounty node | Scripted 60 s boss waves the player summons, one unlocked every 25 waves (P-142); Bounty and Warboss nodes retired | e3b4536 (TB-081) |
| Prestige meta | Heartwood passive only | Heartwood tree (5 nodes); no passive since P-142 | dd09286, 3cc1563 (TB-053, TB-055), TB-142 |
| Heartwood source | Scaled by wave reached | Only cleared bosses (every 25 waves); a fall pays none | TB-142 |
| Bow branch | No circle | Wide Volley widens the strike circle | 16e3060 (TB-079) |
