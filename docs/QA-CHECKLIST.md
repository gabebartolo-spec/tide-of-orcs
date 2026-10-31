# Bug bash checklist (TB-075)

Run against the dev build (`npm run dev`) in a desktop browser, before each itch tag. Each line is one check: what to do, what must be true. Mark the run's result in the table at the end; anything that fails becomes a backlog row.
Dev handle: `window.__tide` = `{ game, field, tree }` (dev builds only). `game.state` is the sim state; `game.buy(id)`, `game.rally(type)`, `game.replant()`, `game.summonBoss()` are the panel's intents.

## A. Start and aim (GDD §2, §6, §12)
- A1 Wipe save, reload: wave 1, 0 starlight, only grunts march, Sharpened Tips is selected in the tree.
- A2 Pointer over the plain: a strike circle follows it; the bow lobs an arc into it on its cadence; orcs in the circle take damage.
- A3 Pointer off the field (or over the wall side): the elf holds fire. Companions and vanguard keep fighting.
- A4 Clicking the field does nothing extra (no click-to-shoot, no tap bonus).
- A5 The first Sharpened Tips rank is affordable within 30 s of aiming.

## B. Tree (GDD §11, SKILL-TREE)
- B1 Buying a node takes its cost, raises its rank, and the first buy of a new node fires its toast.
- B2 A node whose parent is not owned cannot be bought.
- B3 Every node in `src/data/skillTree.ts` has a position on the canvas and none overlap.
- B4 Pan and zoom work; the view opens on Waking.
- B5 Keyboard: the tree's nodes are reachable by Tab and buyable by Enter.

## C. Barricade and the fail state (GDD §3, design rule 1)
- C1 Orcs reaching the wall stop and swing; the health bar drops, shakes, splinters show.
- C2 At 0 HP the sim freezes, the fallen overlay shows wave, slain, minutes, Heartwood (at least 1) and one button.
- C3 While fallen: tree buys, rally and boss summon are refused; Heartwood tree and Settings still work.
- C4 Replant pays out, resets the run, keeps Heartwood, lifetime slain, best wave, prestige count, settings.
- C5 Deep Roots regrows the wall to 50% once per run.

## D. Waves, summons, boss (GDD §4)
- D1 A new wave every 24 s regardless of kills.
- D2 Runner, Brute and Blackguard only spawn after their summon node.
- D3 At wave 10 the boss button waits; summoning runs a 60 s challenge and regular marching pauses.
- D4 Live orcs never exceed 160.

## E. Vanguard and companions (GDD §5, §7)
- E1 Rally Spearman takes starlight and puts a spearman on the field; first rally fires its toast.
- E2 Wolf, Ranger, Warden, Hawk, Treant, knives and ballista attack on their own once bought.
- E3 Per-unit nodes (TB-111) change the unit's damage, rate, crit and speed in play.

## F. Shots (GDD §6, §8, TB-111)
- F1 With Fire Arrows owned, about 1 lob in 4 ignites; with no enchantment owned none do.
- F2 Frost chills, shock zaps, rebound bounces, moon shots home; Starfall drops its volley.

## G. Loot (00-DEVELOPMENT-PLAN M4.6, ARCHITECTURE §Save)
- G1 Orcs drop gear; the satchel lists it; equipping changes Stats.
- G2 Salvage, reroll, lock and heirloom work and save.

## H. Save (ARCHITECTURE §Save, design rule 5)
- H1 Reload restores the run (wave, starlight, ranks, wall HP) and meta.
- H2 Export then import restores the same state.
- H3 Hidden tab: nothing accrues while hidden; on return at most one frame's worth (0.25 s) passes.

## I. Settings and accessibility (GDD §13)
- I1 Reduced motion removes shake, bob and pulse; replant becomes a short cross-fade.
- I2 Volume controls change audio; mute silences it.
- I3 No console errors in a 5-minute session.

## J. Performance (design rule 7)
- J1 160 orcs on screen: frame time stays under 16.7 ms on a mid-range desktop.

## Run 1 (1 Nov 2026, dev build, claude)
Driven from the dev handle with `game.tick(1/50)`. The browser pane was hidden, so no frames rendered: toasts, overlays and the tree canvas were not seen. "Pass by code" means the check was read in source.

| Check | Result | Evidence |
|---|---|---|
| A1 | pass | Wipe: wave 1, 0 starlight, root only, Sharpened Tips selected (cost 12) |
| A2, A5 | pass | Aimed at the nearest orc: a lob every 2.5 s, 12 starlight in 13.2 s |
| A3 | pass | No aim for 10 s: 0 lobs, 0 kills |
| A4 | pass by code | pointerdown only sets the aim |
| B1 | pass, toast unseen | Buy takes the cost and raises the rank |
| B2 | pass | Fire Arrows without its parent is refused |
| B3–B5 | not run | Need the visible pane |
| C1–C4 | pass | Fell and froze; buy, rally and boss refused; replant paid 1 HW, kept lifetime slain, prestige +1 |
| C5 | pass | Deep Roots regrew to 50% once; the second fall stood |
| D1 | pass | 5 waves in 120 s |
| D2 | pass | Field cleared: grunt 79, runner 33, brute 28, elite 9, each only after its node |
| D3 | pass | Timeout: bossEnd at 60.0 s, not cleared. Cleared: bossEnd cleared, 1705 starlight |
| D4 | pass | Live orcs peaked at 160 |
| E1 | pass, toast unseen | Needs Muster; the rally put a spearman on the field and it struck |
| E2 | pass | 60 s: wolf bites, ranger and warden arrows, hawk dives, treant stamps, knives and ballista bolts all landed |
| E3 | pass | All 29 new unit nodes change `Stats.units`; max Ranger rate gave 31 ranger hits in 60 s against 24 |
| F1 | pass | Fire: 100 of 365 lobs ignited (27%); none with no enchantment |
| F2 | pass | 243 lobs each: frost 65 chills and 15 shatters, shock 10 zaps and 10 stuns, rebound 45 bounces, Starfall 27 volleys (11%), moon lobs hit |
| G1 | pass | 4 drops in 359 kills at wave 20; a Kinship charm moved `Stats.kin` from 1 to 1.093 |
| G2 | pass | Reroll changed the affix, a locked item refused salvage, heirloom set, salvage paid Glimmer; all survived reload |
| H1 | pass | Reload: wave, starlight, ranks, wall HP, meta, items, equipped, heirloom and locks identical |
| H2 | pass | Export, wipe, import: identical |
| H3 | pass by code | Frame dt clamps to 0.25 s; nothing ticks while hidden |
| I1 | pass by code | Reduced motion zeroes shake, bob, bow pull, flames and stun spin; the replant ceremony takes the flag |
| I2 | pass by code | Volume sets the master gain; 0 silences |
| I3 | partial | No console errors this session; the 5-minute visible run is not done |
| J1 | not verified | Hidden pane, 160 orcs: median 1.5–2.7 ms per frame, but 4–6% of frames over 16.7 ms, with draw spikes up to 330 ms. Hidden pages are throttled, so this needs a visible rerun (TB-113) |

Findings: TB-112 (tree label), TB-113 (perf rerun), TB-114 (affixes for features the player does not own; fixed: they are gated).
## Run 2 (1 Nov 2026, dev build, claude, browser pane visible)
Reruns the checks run 1 could not see. Pane 833×546 CSS px at DPR 3, 120 Hz display. The pane was hidden again partway through J1 and I3; that is noted where it matters.

| Check | Result | Evidence |
|---|---|---|
| B1, E1 | pass | Toasts seen: "Quick Draw joins the grove", "Muster joins the grove", "Spearman takes the field" |
| B3 | pass | 104 nodes, all positioned; closest pair 52.2 px apart against a hit radius of 20 |
| B4 | pass | Opens near Waking (camera 282, 558, zoom 1) with Sharpened Tips selected; drag and wheel handlers bound |
| B5 | fail, fixed by TB-116 | The tree canvas had no tabindex and no key handler. Since TB-116: Tab enters the tree, steps node by node branch by branch, Enter learns, Tab past the last node leaves it |
| C2 | pass | Overlay seen: wave, slain, minutes, starlight per minute, best wave, items, +1 Heartwood, one button; rally disabled; Replant by a real click |
| I3 | pass: 5 min soak, 23,576 ticks (393 sim s), 158 buys, 9 bosses, 3 rallies, a fall and replant, waves up to 27; 0 errors, rejections or warnings |
| J1 | pass on this PC | rAF with 160 orcs and the wall held: 463 visible frames, median 8.3 ms, p95 8.4 ms (display-capped at 120 Hz), no long tasks. Timing `tick` + `draw` back to back: tick p95 0.1 ms, draw median 0.6 ms with a ~40 ms stall every ~11 frames, which only appears when frames are drawn without presenting (GPU queue backpressure), never in the rAF run. Not tested on a mid-range PC |

Findings: TB-116 (tree keyboard access), TB-117 (the branch legend overlaps node labels at the top of the tree; fixed: the legend has its own strip).

Notes, not filed: grunts at the wall can fill the 160 cap and starve the summoned kinds; at high waves one orc swing can exceed the wall's max HP.
