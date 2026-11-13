# Achievements

Status: **Current** (list approved by the director 13 Nov 2026, TB-248). TB-249 built the system (`src/data/achievements.ts`, `src/sim/achievements.ts`, `src/ui/achievements.ts`); TB-250 makes the cosmetics.

100 achievements in five groups: Progress (28), Collection (34), Challenge (18), Fun (12), Secret (8).

## Rules

- **Ids are stable.** Lowercase snake_case, never renamed once shipped. Steam gets `ACH_` + the id in upper case (`slain_1k` → `ACH_SLAIN_1K`).
- **Earned for good.** Earned ids live in the meta save and survive replants, wipes excepted. Nothing is ever taken back.
- **Cosmetic only.** A reward changes how something looks, never a number (no stats, no starlight, no Heartwood, no drop odds), so balance never has to know achievements exist.
- **Event-driven.** Each check runs in `src/sim` when the event in its row fires: pure, no DOM, no clock. "Run" counters reset with the run; "lifetime" counters live in the meta save.
- **Secret** entries show as a sealed plate (no name, no rule) until earned.
- Thresholds below go into `src/data/achievements.ts` (`ACH_N`), not systems code.
- **Reach-wave challenges** ("reach wave N without …") count only in a run that started below wave N (`run.ach.from`), so a checkpoint start past N can't skip the challenge.
- **Old saves.** On load (and after an import) a sweep grants every state-only row the save already meets: lifetime kills, best wave, replants, tiers, nodes, camp, sets, mythics. Event-only rows (challenges, fun, most secrets) start from zero.
- **Unlock toast.** One line per achievement; more than `ACH_N.toastBatch` at once (an old save's first sweep) share one "N achievements earned" line.
- **Panel.** The Achievements tab (between runs) lists the five groups, earned rows lit, with a Wear button on each earned title and No title to take it off.

### Events

Existing `SimEvent`s cover most rows. TB-249 adds these, marked **new** in the tables. The UI events carry nothing: the checks read worn gear, counts and path from state.

| New event | Fires when | Carries |
|---|---|---|
| `equip` | gear is worn or taken off | — |
| `salvage` | an item is salvaged by hand | — |
| `reroll` | an affix is rerolled | — |
| `pathChosen` | a path is picked on the Replant tab | path id or null |
| `achievement` | an achievement is earned (pushed by `GameController`, read by toast and panel) | id |
| `kill` gains `by`, `champ`, `beats` | an orc dies | `by`: `lob`, `star`, `arrow`, `bounce`, `knife`, `bolt`, `storm`, `burn`, `venom`, `wolf`, `hawk`, `treant`, `vanguard`, `thorns`, `other`; `champ`: it was a champion; `beats`: drum beats a drummer struck |
| `bossEnd` gains `secs` | a boss wave ends | seconds the boss wave ran |

One-strike rows (`one_lob_10`, `storm_5`, `treant_10`) count `kill`s by that source and close the count on the strike's own event (`impact`, `storm`, `treantStamp`).

### Rewards

Two kinds. **Titles** are text only: the player picks one in the Achievements panel and it shows on a carved tag under the wall bar in the run HUD. **Cosmetics** are art (TB-250, each approved by the director before it ships):

| Reward id | What it is | Where |
|---|---|---|
| `cloak_ember`, `cloak_frost`, `cloak_dusk`, `cloak_starlit`, `cloak_gold` | elf cloak and hood in another dye | elf sprite |
| `bow_moonsilver`, `bow_thornwood`, `bow_heartwood` | elf bow in another wood | elf sprite |
| `trail_ember`, `trail_star`, `trail_leaf` | trail behind the lobbed arrow | field |
| `ring_rune` | carved runes around the strike circle | field |
| `wall_banner_grove`, `wall_banner_tide` | a banner hung on the barricade | field |
| `wall_lanterns` | lanterns along the barricade top | field |
| `wall_skulls` | orc skull trophies on the barricade posts | field |
| `shield_fox` | painted fox on the spearmen's shields | vanguard sprite |
| `trophy_warboss`, `trophy_ogre`, `trophy_orc`, `trophy_raider`, `trophy_ogre_creature` | the boss's mounted head or weapon | camp scene |
| `camp_campfire`, `camp_wolf_statue`, `camp_standing_stone`, `camp_lantern_string`, `camp_armour_stand`, `camp_bell`, `camp_sapling` | decor pieces | camp scene |
| `banner_serpent`, `banner_fox`, `banner_magpie` | the path's banner on a pole | camp scene |

That is 36 art pieces; every other row gives a title.

## Progress (28)

| # | Id | Name | Rule | Listens to | Reward |
|---|---|---|---|---|---|
| 1 | `first_blood` | First Blood | Slay an orc | `kill` | Title: Warden |
| 2 | `slain_100` | A Hundred Fallen | Slay 100 orcs, lifetime | `kill` | Title: Orc-Hunter |
| 3 | `slain_1k` | A Thousand Fallen | Slay 1,000 orcs, lifetime | `kill` | `trail_leaf` |
| 4 | `slain_10k` | Ten Thousand Fallen | Slay 10,000 orcs, lifetime | `kill` | Title: Tidebreaker |
| 5 | `slain_100k` | The Tide Thins | Slay 100,000 orcs, lifetime | `kill` | `wall_skulls` |
| 6 | `slain_1m` | Orcs Are Weather | Slay 1,000,000 orcs, lifetime | `kill` | Title: Weathered |
| 7 | `wave_5` | Holding | Reach wave 5 | `wave` | Title: Holdfast |
| 8 | `wave_10` | Dug In | Reach wave 10 | `wave` | `wall_banner_grove` |
| 9 | `wave_25` | First Boss Wave | Reach wave 25 | `wave` | Title: Steadfast |
| 10 | `wave_50` | Half a Hundred | Reach wave 50 | `wave` | `cloak_ember` |
| 11 | `wave_75` | Long Watch | Reach wave 75 | `wave` | Title: Long-Watcher |
| 12 | `wave_100` | The Hundredth Wave | Reach wave 100 | `wave` | `bow_thornwood` |
| 13 | `wave_150` | Beyond Counting | Reach wave 150 | `wave` | Title: Unbroken |
| 14 | `wave_200` | The Wall That Stood | Reach wave 200 | `wave` | `cloak_gold` |
| 15 | `first_fall` | It Isn't a Loss | The barricade falls for the first time | `barricadeFell` (a fall, not a hand replant) | Title: Seedling |
| 16 | `replant_1` | Replanted | Replant the grove | `replant` | `camp_sapling` |
| 17 | `replant_10` | Ten Seasons | Replant 10 times | `replant` | Title: Gardener |
| 18 | `replant_50` | Old Growth | Replant 50 times | `replant` | Title: Old Growth |
| 19 | `replant_100` | Ancient Grove | Replant 100 times | `replant` | `bow_heartwood` |
| 20 | `first_node` | Sharpened | Learn a Grove node | `bought` | Title: Apprentice |
| 21 | `first_boss` | Champion's Fall | Clear a boss wave | `bossEnd` (cleared) | `trophy_warboss` |
| 22 | `boss_10` | Bosses Are Weather Too | Clear 10 boss waves, lifetime | `bossEnd` | Title: Bossbane |
| 23 | `boss_50` | Fifty Champions | Clear 50 boss waves, lifetime | `bossEnd` | `wall_banner_tide` |
| 24 | `tier_2` | The Second Tide | Unlock tier 2 | `tierUnlocked` | Title: of the Second Tide |
| 25 | `tier_3` | The Third Tide | Unlock tier 3 | `tierUnlocked` | `cloak_frost` |
| 26 | `tier_4` | The Fourth Tide | Unlock tier 4 | `tierUnlocked` | Title: of the Fourth Tide |
| 27 | `tier_5` | The Fifth Tide | Unlock tier 5 | `tierUnlocked` | `cloak_dusk` |
| 28 | `tier_6` | The Sixth Tide | Unlock tier 6 | `tierUnlocked` | `cloak_starlit` |

## Collection (34)

| # | Id | Name | Rule | Listens to | Reward |
|---|---|---|---|---|---|
| 29 | `branch_bow` | Master of the Bow | Every Bow node at max rank in one run | `bought` | `ring_rune` |
| 30 | `branch_companions` | Friends of the Grove | Every Companions node at max rank in one run | `bought` | `camp_wolf_statue` |
| 31 | `branch_armoury` | Full Armoury | Every Armoury node at max rank in one run | `bought` | Title: Armourer |
| 32 | `branch_grove` | Deep Grove | Every Grove node at max rank in one run | `bought` | Title: Grovekeeper |
| 33 | `branch_barricade` | Timber and Thorn | Every Barricade node at max rank in one run | `bought` | `wall_lanterns` |
| 34 | `branch_vanguard` | Shieldwall | Every Vanguard node at max rank in one run | `bought` | `shield_fox` |
| 35 | `branch_spoils` | Spoils of War | Every Spoils node at max rank in one run | `bought` | Title: Quartermaster |
| 36 | `tree_full` | The Whole Tree | Every non-path node at max rank in one run | `bought` | Title: Worldtree |
| 37 | `heartwood_full` | Heartwood Grown | Every Heartwood tree node at max rank | `hwBought` | Title: Heartwarden |
| 38 | `set_nightknife` | Nightknife | Wear all six Nightknife pieces | `equip` **new** | Title: Nightknife |
| 39 | `set_emberwright` | Emberwright | Wear all six Emberwright pieces | `equip` **new** | `trail_ember` |
| 40 | `set_stormcaller` | Stormcaller | Wear all six Stormcaller pieces | `equip` **new** | Title: Stormcaller |
| 41 | `set_siegebreaker` | Siegebreaker | Wear all six Siegebreaker pieces | `equip` **new** | Title: Siegebreaker |
| 42 | `set_moonveil` | Moonveil | Wear all six Moonveil pieces | `equip` **new** | `bow_moonsilver` |
| 43 | `set_packlord` | Packlord | Wear all six Packlord pieces | `equip` **new** | Title: Packlord |
| 44 | `set_rootwarden` | Rootwarden | Wear all six Rootwarden pieces | `equip` **new** | Title: Rootwarden |
| 45 | `set_serpents_coil` | Serpent's Coil | Wear all six Serpent's Coil pieces | `equip` **new** | Title: Coiled |
| 46 | `set_foxfire_pack` | Foxfire Pack | Wear all six Foxfire Pack pieces | `equip` **new** | Title: Foxfire |
| 47 | `set_magpies_hoard` | Magpie's Hoard | Wear all six Magpie's Hoard pieces | `equip` **new** | Title: Magpie |
| 48 | `set_all` | Wardrobe of Legends | Earn every set achievement | (other achievements) | `camp_armour_stand` |
| 49 | `mythic_first` | Myth Made Real | Find a mythic | `loot` (rarity mythic) | Title: Mythfinder |
| 50 | `mythic_all` | Every Myth | Find all 11 mythics, lifetime | `loot` (rarity mythic) | `trail_star` |
| 51 | `legendary_first` | Legend in the Grass | Find a legendary | `loot` (rarity legendary) | Title: Lucky |
| 52 | `camp_first` | Breaking Ground | Build any camp building | `buildingUpgraded` | `camp_campfire` |
| 53 | `camp_bowyer` | Master Bowyer | Bowyer at level 3 | `buildingUpgraded` | Title: Bowyer |
| 54 | `camp_forge` | Master Smith | Forge at level 3 | `buildingUpgraded` | Title: Smith |
| 55 | `camp_kitchen` | Full Larder | Kitchen at level 3 | `buildingUpgraded` | Title: Cook |
| 56 | `camp_training` | Drillmaster | Training Area at level 3 | `buildingUpgraded` | Title: Drillmaster |
| 57 | `camp_full` | The Encampment | All four buildings at level 3 | `buildingUpgraded` | `camp_lantern_string` |
| 58 | `path_serpent` | Way of the Serpent | Clear a boss wave on the Path of the Serpent | `bossEnd` + run path | `banner_serpent` |
| 59 | `path_fox` | Way of the Fox | Clear a boss wave on the Path of the Fox | `bossEnd` + run path | `banner_fox` |
| 60 | `path_magpie` | Way of the Magpie | Clear a boss wave on the Path of the Magpie | `bossEnd` + run path | `banner_magpie` |
| 61 | `bestiary` | Know Thy Enemy | Slay every orc kind (grunt to war drummer, and a Warboss), lifetime | `kill` | Title: Loremaster |
| 62 | `boss_roster` | Every Champion | Clear a boss wave against each of the five bosses | `bossEnd` | `trophy_ogre_creature` |

## Challenge (18)

| # | Id | Name | Rule | Listens to | Reward |
|---|---|---|---|---|---|
| 63 | `no_vanguard` | Alone on the Wall | Reach wave 25 without Muster | `wave` + run levels | Title: Lone Warden |
| 64 | `bow_only` | Just the Bow | Reach wave 25 owning no Companions or Armoury node | `wave` + run levels | Title: Archer |
| 65 | `lean_tree` | Ten Nodes | Reach wave 25 owning 10 node ranks or fewer | `wave` + run levels | Title: Frugal |
| 66 | `bare_wall` | Plain Timber | Reach wave 30 owning no Barricade node | `wave` + run levels | Title: Bare-Timbered |
| 67 | `untouched_10` | Not a Scratch | Reach wave 10 without the wall taking a hit | `wave`, `barricadeHit` | Title: Untouched |
| 68 | `boss_unscathed` | Clean Sweep | Clear a boss wave without the wall taking a hit during it | `bossEnd`, `barricadeHit` | Title: Clean |
| 69 | `boss_swift` | Swift Hunt | Clear a boss wave with 20 s or more left on its clock | `bossEnd` | `trophy_orc` |
| 70 | `boss_naked` | Bare-Handed | Clear a boss wave wearing no gear | `bossEnd` + worn gear | Title: Unadorned |
| 71 | `boss_tier6` | Sixth Tide Champion | Clear a boss wave at tier 6 | `bossEnd` + run tier | `trophy_raider` |
| 72 | `boss_last_plank` | On the Last Plank | Clear a boss wave with the wall under 10% health | `bossEnd` | Title: Last Plank |
| 73 | `boss_streak` | Three Crowns | Clear three boss waves in one run | `bossEnd` | `trophy_ogre` |
| 74 | `boss_after_roots` | Second Life | Clear a boss wave after Deep Roots regrew the wall that run | `bossEnd`, `barricadeRegrow` | Title: Rerooted |
| 75 | `all_summoned` | Come One, Come All | Reach wave 40 with every summon node owned | `wave` + run levels | Title: Summoner |
| 76 | `flood_200` | The Flood | Slay 200 orcs within one wave | `kill`, `wave` | Title: Floodwarden |
| 77 | `first_run_25` | Natural | Reach wave 25 on the first run (no replant yet) | `wave` + meta prestiges | Title: Natural |
| 78 | `hold_60m` | An Hour on the Wall | One run lasts 60 minutes of play | `barricadeFell` / `replant` (run time) | `camp_bell` |
| 79 | `full_tide` | Shoulder to Shoulder | 160 orcs on the field at once, and the wall still stands at the next wave | `wave` + live orc count | Title: Unyielding |
| 80 | `tier_up_fast` | Climber | Unlock the next tier within 3 replants of the last one | `tierUnlocked` + meta prestiges | Title: Climber |

## Fun (12)

| # | Id | Name | Rule | Listens to | Reward |
|---|---|---|---|---|---|
| 81 | `one_lob_10` | Bullseye | Slay 10 orcs with a single lob | `kill` (`by` lob) **new** | Title: Bullseye |
| 82 | `shatter_20` | Glass Orcs | Shatter 20 chilled orcs in one wave | `shatter` | Title: Frostbringer |
| 83 | `storm_5` | Chain Reaction | One Storm Glade strike slays 5 orcs | `kill` (`by` storm) **new** | Title: Stormborn |
| 84 | `treant_10` | Stomp | One treant stamp slays 10 orcs | `kill` (`by` treant) **new** | Title: Rootstomper |
| 85 | `wolf_1k` | Good Dog | The Grey Wolf slays 1,000 orcs, lifetime | `kill` (`by` wolf) **new** | Title: Packmate |
| 86 | `unhorsed_100` | Unhorsed | Throw 100 wolf riders from their wolves, lifetime | `kill` (wolfrider) | Title: Unhorser |
| 87 | `drummer_quick` | Silence the Drum | Slay a war drummer before its third beat | `kill`, `drumBeat` | Title: Drumsplitter |
| 88 | `salvage_1k` | Scrap Heap | Salvage 1,000 items, lifetime | `salvage` **new** | Title: Tinker |
| 89 | `reroll_100` | Never Satisfied | Reroll 100 affixes, lifetime | `reroll` **new** | Title: Fussy |
| 90 | `double_legend` | Two Pillars | Two legendaries or better drop in one wave | `loot`, `wave` | Title: Blessed |
| 91 | `thorns_50` | Prickly | The wall's thorns slay 50 orcs in one run | `kill` (`by` thorns) **new** | Title: Thornwarden |
| 92 | `heirloom_50` | Handed Down | Grow your heirloom 50 item levels past the cap | `replant` + heirloom ilvl | Title: Heir |

## Secret (8)

Shown as sealed plates until earned. The rule column is what the panel shows once earned.

| # | Id | Name | Rule | Listens to | Reward |
|---|---|---|---|---|---|
| 93 | `secret_last_plank` | One Plank Left | The wall drops below 1% health and is standing when the next wave comes | `barricadeHit`, `wave` | `camp_standing_stone` |
| 94 | `secret_hands_off` | Let Them Handle It | Clear a whole wave from 20 on without loosing an arrow (companions and vanguard only) | `wave`, `loose` | Title: Delegator |
| 95 | `secret_twelve` | Leave It Standing | Replant by hand at exactly wave 12, the first wave it is allowed | `barricadeFell` (`chosen`, wave 12) | Title: Punctual |
| 96 | `secret_let_march` | Let Them March | Summon a boss wave and let its clock run out with every champion alive | `bossEnd` (not cleared) | Title: Spectator |
| 97 | `secret_hoarder` | Five Waiting | Leave five boss waves waiting, unsummoned | `bossReady` | Title: Patient |
| 98 | `secret_full_satchel` | No Room | Fill the satchel to its last slot | `loot` (kept) | Title: Packrat |
| 99 | `secret_thorn_boss` | Splinters | A Warboss dies to the wall's thorns | `kill` (boss, `by` thorns) **new** | Title: Splintered |
| 100 | `secret_all` | The Grove Remembers | Earn every other achievement | (other achievements) | Title: Remembered |

