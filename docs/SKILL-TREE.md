# Skill Tree — node data

Status: **Current** (v1.7, 132 nodes: 117 base, 48 of them the TB-111 per-type nodes (costs in BALANCE P-111), plus 15 path nodes (TB-193a); checked against the code 3 Nov 2026). Started from `docs/prototype.html` and since changed (Wide Volley, War Drums and the summon/Fury/Swarm nodes added; Dreaming Roots, Blood Banners and the Warboss nodes retired; see GDD §14). Mirrored exactly by `src/data/skillTree.ts` (tested: unique ids, parents exist, no cycles, coordinates in bounds, ≥ 40 px apart). Node ids are stable API: never rename; deprecate instead.

Cost formula: `cost(rank, w) = round(base × growth^rank × 1.25^max(0, w − 10))` (rank = ranks already owned, w = wave at purchase; the wave factor is P-001, BALANCE.md §Economy). Costs are starlight.

Layout coordinates are for a 1400×1320 tree canvas, root at (700, 890) (TB-163). The layout draws an arcane tree: the root is the trunk base; Muster and Grey Wolf sit up the trunk; the canopy boughs are Bow (up-left), Companions (the crown) and Armoury (right), with Vanguard as the low left bough; Barricade, Spoils and Grove (the orc tiers) spread below as roots. Nodes with children are hand-placed boughs; leaf nodes cluster round their parent as foliage. Branch colours in ART-STYLE.md.

| id | Name | Branch | Parent | Max | Base | Growth | x | y | Effect |
|---|---|---|---|---|---|---|---|---|---|
| root | Waking | Grove | — | 1 | 0 | — | 700 | 890 | An elf, a bow, a wall of timber, an endless tide. Begin. |
| sharp | Sharpened Tips | Bow | root | 10 | 12 | 1.55 | 610 | 530 | +25% arrow damage per rank. |
| draw | Quick Draw | Bow | sharp | 8 | 12 | 1.7 | 500 | 490 | +15% draw speed per rank. |
| wide | Wide Volley | Bow | sharp | 5 | 40 | 1.8 | 595 | 470 | Your arrow strikes a circle 20% wider per rank. |
| crit | Keen Eye | Bow | sharp | 5 | 30 | 2.1 | 570 | 410 | +8% chance per rank to strike for triple damage. |
| multi | Split Shot | Bow | draw | 3 | 220 | 4.2 | 390 | 440 | +1 extra arrow lands inside the circle with each shot. |
| pierce | Longshaft | Bow | crit | 3 | 260 | 3.8 | 480 | 330 | Each shot strikes the ground +1 more time per rank. |
| moon | Moonbow | Bow | multi | 1 | 3200 | — | 270 | 390 | One shot in four is a moon shot: the circle settles onto the nearest orc and strikes +60% harder. |
| bounce | Rebound | Bow | pierce | 4 | 1200 | 2.2 | 380 | 240 | One shot in four looses a magic bolt that leaps to 2 more orcs, +1 per rank; each leap hits softer. |
| starfall | Starfall | Bow | moon | 1 | 6000 | — | 170 | 280 | One shot in ten also rains 12 arrows on orcs across the plain. |
| wolf | Grey Wolf | Companions | muster | 1 | 200 | — | 700 | 550 | A wolf runs the plain and savages the nearest orc. |
| fangs | Fangs | Companions | wolf | 5 | 90 | 1.9 | 820 | 470 | Wolf bites +40% harder per rank. |
| ranger | Ranger | Companions | wolf | 1 | 350 | — | 690 | 390 | A second archer joins you behind the wall. |
| warden | Warden | Companions | ranger | 1 | 2800 | — | 640 | 220 | A third archer, veteran of older wars. |
| hawk | Hawk | Companions | fangs | 1 | 900 | — | 850 | 310 | A hawk dives on the thickest knot of orcs every few seconds. |
| treant | Treant | Companions | hawk | 1 | 1400 | — | 820 | 150 | An old treant roots itself before the wall and stamps the ground. |
| bond | Kinship | Companions | ranger | 5 | 500 | 2.2 | 540 | 150 | All companions and vanguard +40% damage per rank. |
| knives | Throwing Knives | Armoury | root | 1 | 100 | — | 820 | 650 | A knife flies at the nearest orc every 1.4 s. |
| knifespd | Nimble Wrist | Armoury | knives | 5 | 46 | 1.9 | 950 | 680 | Knives fly 20% more often per rank. |
| fire | Fire Arrows | Armoury | knives | 1 | 450 | — | 960 | 530 | One shot in four sets orcs alight, burning for a few seconds. |
| storm | Storm Glade | Armoury | fire | 1 | 1700 | — | 1090 | 470 | Lightning leaps between up to 5 orcs every 6 s. |
| frost | Frost Arrows | Armoury | fire | 5 | 800 | 1.9 | 1010 | 370 | One shot in four chills orcs for 3 s: they move and swing 20% slower, +5% per rank. |
| shatter | Shatter | Armoury | frost | 5 | 1500 | 2.0 | 1060 | 260 | A chilled orc that dies shatters, striking orcs around it. +40% per rank. |
| shock | Shock Arrows | Armoury | storm | 1 | 2200 | — | 1220 | 410 | One shot in four looses lightning from your strike to 3 more orcs. |
| stun | Thunderclap | Armoury | shock | 3 | 3000 | 2.2 | 1276 | 384 | Shock arrows stun the orcs they strike for half a second, +0.25 s per rank. |
| ballista | Ballista | Armoury | knifespd | 1 | 3400 | — | 1080 | 660 | A heavy bolt that punches through the whole line. |
| bolt | Iron Bolts | Armoury | ballista | 5 | 2000 | 2.0 | 1141 | 651 | Ballista +70% damage per rank. |
| horde | Call the Horde | Grove | root | 5 | 160 | 2.4 | 830 | 960 | Grunts march 20% more often per rank. More orcs, more starlight. More danger. |
| drums | War Drums | Grove | horde | 5 | 300 | 2.4 | 970 | 940 | Grunts have +30% health and drop +40% starlight per rank. |
| glean | Gleaning | Grove | drums | 5 | 600 | 2.2 | 1031 | 931 | +8% starlight from every orc. |
| runners | Goblin Runners | Grove | horde | 1 | 120 | — | 880 | 1060 | Runners march four times as often (they trickle in on their own from wave 5), each worth +150% starlight. |
| runfury | Runner Fury | Grove | runners | 5 | 200 | 2.4 | 908 | 1115 | Runners have +30% health and drop +40% starlight per rank. |
| runswarm | Runner Swarm | Grove | runners | 5 | 200 | 2.4 | 939 | 1042 | Runners march 20% more often per rank. |
| brutes | Brutes | Grove | runners | 1 | 400 | — | 1000 | 1130 | Brutes march four times as often (they trickle in on their own from wave 10), each worth +150% starlight. |
| brutefury | Brute Fury | Grove | brutes | 5 | 600 | 2.4 | 1054 | 1161 | Brutes have +30% health and drop +40% starlight per rank. |
| bruteswarm | Brute Swarm | Grove | brutes | 5 | 600 | 2.4 | 1058 | 1109 | Brutes march 20% more often per rank. |
| elites | Blackguard | Grove | brutes | 1 | 1500 | — | 1120 | 1200 | Blackguard march four times as often (they trickle in on their own from wave 20), each worth +150% starlight. |
| elitefury | Elite Fury | Grove | elites | 5 | 2000 | 2.4 | 1174 | 1231 | Elites have +30% health and drop +40% starlight per rank. |
| eliteswarm | Elite Swarm | Grove | elites | 5 | 2000 | 2.4 | 1178 | 1179 | Elites march 20% more often per rank. |
| berserkers | Berserkers | Grove | elites | 1 | 2400 | — | 1250 | 1222 | Berserkers march four times as often (they trickle in on their own from wave 25), each worth +150% starlight. |
| berserkfury | Berserker Fury | Grove | berserkers | 5 | 4000 | 2.4 | 1300 | 1262 | Berserkers have +30% health and drop +40% starlight per rank. |
| berserkswarm | Berserker Swarm | Grove | berserkers | 5 | 4000 | 2.4 | 1310 | 1200 | Berserkers march 20% more often per rank. |
| wolfriders | Wolf Riders | Grove | berserkers | 1 | 4000 | — | 1270 | 1130 | Wolf riders march four times as often (they trickle in on their own from wave 30), each worth +150% starlight. |
| riderfury | Rider Fury | Grove | wolfriders | 5 | 6670 | 2.4 | 1340 | 1150 | Wolf riders have +30% health and drop +40% starlight per rank. |
| riderswarm | Rider Swarm | Grove | wolfriders | 5 | 6670 | 2.4 | 1330 | 1085 | Wolf riders march 20% more often per rank. |
| shamans | Shamans | Grove | wolfriders | 1 | 6400 | — | 1250 | 1040 | Shamans march four times as often (they trickle in on their own from wave 35), each worth +150% starlight. |
| shamanfury | Shaman Fury | Grove | shamans | 5 | 10670 | 2.4 | 1310 | 1020 | Shamans have +30% health and drop +40% starlight per rank. |
| shamanswarm | Shaman Swarm | Grove | shamans | 5 | 10670 | 2.4 | 1240 | 980 | Shamans march 20% more often per rank. |
| drummers | War Drummers | Grove | shamans | 1 | 9600 | — | 1180 | 1080 | War drummers march four times as often (they trickle in on their own from wave 40), each worth +150% starlight. |
| drummerfury | Drummer Fury | Grove | drummers | 5 | 16000 | 2.4 | 1170 | 1020 | War drummers have +30% health and drop +40% starlight per rank. |
| drummerswarm | Drummer Swarm | Grove | drummers | 5 | 16000 | 2.4 | 1120 | 1060 | War drummers march 20% more often per rank. |
| timber | Seasoned Timber | Barricade | root | 10 | 25 | 1.6 | 570 | 960 | Barricade +25% health per rank. |
| repair | Patient Hands | Barricade | timber | 5 | 90 | 2.0 | 430 | 980 | Barricade mends 2% of its health per second per rank. |
| spikes | Thornwall | Barricade | timber | 5 | 150 | 2.1 | 537 | 1013 | Orcs hacking at the wall take 20% of your arrow damage per second per rank. |
| bulwark | Deep Roots | Barricade | repair | 1 | 2400 | — | 371 | 999 | Once per run, a falling barricade regrows to half health. |
| muster | Muster | Vanguard | root | 1 | 50 | — | 700 | 730 | Two spearmen hold the line. Each one that falls returns after 12 seconds. |
| shield | Shieldwall | Vanguard | muster | 5 | 110 | 1.9 | 560 | 760 | Vanguard +30% health per rank. |
| drill | Spear Drill | Vanguard | muster | 5 | 130 | 1.9 | 575 | 670 | Spearmen +30% damage per rank. |
| ranks | Close Ranks | Vanguard | shield | 3 | 400 | 2.6 | 430 | 780 | +1 vanguard may stand at once. |
| mend | Field Mending | Vanguard | drill | 3 | 350 | 2.4 | 450 | 650 | Vanguard recover 3% health per second per rank. |
| champion | Bladedancer | Vanguard | ranks | 1 | 2200 | — | 290 | 750 | Half the line become bladedancers: faster, their strikes cleave every orc in reach. |
| hunter | Hunter's Eye | Spoils | root | 1 | 120 | — | 700 | 1020 | +5% chance to strike for triple damage. |
| scavenger | Scavenger | Spoils | hunter | 1 | 150 | — | 600 | 1120 | Salvage gives 50% more Glimmer this run. |
| trophy | Trophy | Spoils | hunter | 1 | 200 | — | 800 | 1120 | Kills on waves 10, 20, 30… roll a second drop. |
| sharpeyes | Sharp Eyes | Spoils | scavenger | 1 | 600 | — | 500 | 1200 | Item Find +10% this run. |
| hoard | Boss Hoard | Spoils | trophy | 1 | 900 | — | 844 | 1164 | Boss drops roll one rarity higher, up to legendary. |
| resonance | Set Resonance | Spoils | sharpeyes | 1 | 4000 | — | 390 | 1260 | Every set you wear counts one piece more. |
| echo | Mythic Echo | Spoils | resonance | 1 | 6000 | — | 331 | 1280 | Your mythic power triggers 25% more often, or lasts 25% longer. |
| kindle | Kindling | Armoury | fire | 5 | 600 | 1.9 | 1007 | 490 | Burning orcs take +30% burn damage per rank. |
| wildfire | Wildfire | Armoury | fire | 3 | 900 | 2.2 | 959 | 468 | Burns last 1 s longer per rank. |
| firechance | Fire Quiver | Armoury | fire | 5 | 500 | 1.9 | 1018 | 551 | +15% chance per rank that a shot is a fire arrow. |
| frostchance | Frost Quiver | Armoury | frost | 5 | 900 | 1.9 | 1028 | 311 | +15% chance per rank that a shot is a frost arrow. |
| static | Static | Armoury | shock | 5 | 2500 | 1.9 | 1276 | 436 | Shock lightning +30% damage per rank. |
| shockchance | Storm Quiver | Armoury | shock | 5 | 2400 | 1.9 | 1215 | 348 | +15% chance per rank that a shot is a shock arrow. |
| rebdmg | Hard Rebound | Bow | bounce | 5 | 1300 | 1.9 | 342 | 191 | Rebound bolts +30% damage per rank. |
| rebchance | Rebound Quiver | Bow | bounce | 5 | 1300 | 1.9 | 321 | 259 | +15% chance per rank that a shot looses Rebound. |
| moondmg | Moonsilver | Bow | moon | 5 | 3500 | 1.9 | 213 | 366 | Moon shots +20% damage per rank. |
| moonreach | Moonpull | Bow | moon | 3 | 3500 | 2.2 | 215 | 419 | Moon shots settle onto orcs 25% farther from your aim per rank. |
| moonchance | Moon Quiver | Bow | moon | 5 | 3500 | 1.9 | 273 | 328 | +15% chance per rank that a shot is a moon shot. |
| stardmg | Starsteel | Bow | starfall | 5 | 6500 | 1.9 | 137 | 228 | Starfall arrows +30% damage per rank. |
| starcount | Meteor Shower | Bow | starfall | 3 | 7000 | 2.2 | 113 | 303 | +4 Starfall arrows per rank. |
| starchance | Wishing Star | Bow | starfall | 5 | 6500 | 1.9 | 90 | 254 | +10% chance per rank that a shot calls Starfall. |
| knifedmg | Keen Knives | Armoury | knives | 5 | 150 | 1.9 | 848 | 595 | Knives +30% damage per rank. |
| knifefan | Knife Fan | Armoury | knives | 3 | 400 | 2.4 | 770 | 613 | +1 knife per throw per rank. |
| boltpin | Pinning Bolts | Armoury | ballista | 3 | 2500 | 2.2 | 1127 | 701 | Every orc a bolt passes through is held still 0.3 s per rank. |
| windlass | Windlass | Armoury | ballista | 5 | 2200 | 1.9 | 1102 | 602 | Ballista reload time −10% per rank. |
| deadly | Deadly Aim | Bow | crit | 5 | 300 | 2.1 | 550 | 351 | Your crits strike +50% harder per rank (×3 to start). |
| wolfrate | Swift Bite | Companions | wolf | 5 | 112 | 1.9 | 679 | 492 | Wolf strikes 15% more often per rank. |
| wolfcrit | Wolf Instinct | Companions | wolf | 5 | 128 | 2.0 | 745 | 455 | Wolf bites: +5% chance per rank to crit for double damage. |
| wolfcritx | Rending Bite | Companions | wolfcrit | 5 | 160 | 2.0 | 804 | 414 | Wolf crits +50% damage per rank. |
| wolfspd | Long Stride | Companions | wolf | 3 | 80 | 2.0 | 754 | 519 | Wolf moves 15% faster per rank. |
| rangerdmg | Ranger's Draw | Companions | ranger | 5 | 420 | 1.9 | 686 | 328 | Ranger +30% damage per rank. |
| rangerrate | Ranger's Haste | Companions | ranger | 5 | 490 | 1.9 | 756 | 361 | Ranger strikes 15% more often per rank. |
| rangercrit | Ranger's Eye | Companions | ranger | 5 | 560 | 2.0 | 628 | 383 | Ranger arrows: +5% chance per rank to crit for double damage. |
| rangercritx | Ranger's Mark | Companions | rangercrit | 5 | 700 | 2.0 | 609 | 301 | Ranger crits +50% damage per rank. |
| wardendmg | Warden's Draw | Companions | warden | 5 | 3360 | 1.9 | 623 | 161 | Warden +30% damage per rank. |
| wardenrate | Warden's Haste | Companions | warden | 5 | 3920 | 1.9 | 704 | 188 | Warden strikes 15% more often per rank. |
| wardencrit | Warden's Eye | Companions | warden | 5 | 4480 | 2.0 | 628 | 111 | Warden arrows: +5% chance per rank to crit for double damage. |
| wardencritx | Warden's Mark | Companions | wardencrit | 5 | 5600 | 2.0 | 621 | 49 | Warden crits +50% damage per rank. |
| hawkdmg | Sharp Talons | Companions | hawk | 5 | 1080 | 1.9 | 861 | 249 | Hawk +30% damage per rank. |
| hawkrate | Swift Wings | Companions | hawk | 5 | 1260 | 1.9 | 911 | 300 | Hawk strikes 15% more often per rank. |
| hawkcrit | Hawk Eye | Companions | hawk | 5 | 1440 | 2.0 | 803 | 270 | Hawk dives: +5% chance per rank to crit for double damage. |
| hawkcritx | Killing Dive | Companions | hawkcrit | 5 | 1800 | 2.0 | 773 | 216 | Hawk crits +50% damage per rank. |
| treantdmg | Heartoak | Companions | treant | 5 | 1680 | 1.9 | 809 | 89 | Treant +30% damage per rank. |
| treantrate | Restless Roots | Companions | treant | 5 | 1960 | 1.9 | 757 | 115 | Treant strikes 15% more often per rank. |
| treantcrit | Old Wrath | Companions | treant | 5 | 2240 | 2.0 | 867 | 110 | Treant stamps: +5% chance per rank to crit for double damage. |
| treantcritx | Crushing Stamp | Companions | treantcrit | 5 | 2800 | 2.0 | 897 | 56 | Treant crits +50% damage per rank. |
| swiftmuster | Swift Muster | Vanguard | muster | 5 | 140 | 1.9 | 555 | 842 | Fallen vanguard return 15% sooner per rank. |
| spearrate | Spear Rhythm | Vanguard | muster | 5 | 168 | 1.9 | 640 | 825 | Spearmen strikes 15% more often per rank. |
| spearcrit | Spear Point | Vanguard | muster | 5 | 192 | 2.0 | 470 | 715 | Spearman strikes: +5% chance per rank to crit for double damage. |
| spearcritx | Deep Thrust | Vanguard | spearcrit | 5 | 240 | 2.0 | 386 | 710 | Spearmen crits +50% damage per rank. |
| spearspd | Quick March | Vanguard | muster | 3 | 120 | 2.0 | 775 | 795 | Spearmen moves 15% faster per rank. |
| bladedmg | Blade Drill | Vanguard | champion | 5 | 2640 | 1.9 | 233 | 727 | Bladedancers +30% damage per rank. |
| bladerate | Blade Rhythm | Vanguard | champion | 5 | 3080 | 1.9 | 235 | 779 | Bladedancers strike 15% more often per rank. |
| bladecrit | Blade Edge | Vanguard | champion | 5 | 3520 | 2.0 | 281 | 689 | Bladedancer strikes: +5% chance per rank to crit for double damage. |
| bladecritx | Whirling Edge | Vanguard | bladecrit | 5 | 4400 | 2.0 | 273 | 627 | Bladedancers crits +50% damage per rank. |
| bladespd | Light Feet | Vanguard | champion | 3 | 2200 | 2.0 | 180 | 746 | Bladedancers move 15% faster per rank. |

## Path nodes (TB-193a, P-193 placeholder, untuned)

A path branch hangs off the root of its host branch. Its nodes are buyable, and count in `Stats`, only while that path is the run's (`run.path`, picked at Replant). Ranks are kept across runs like any node, so switching back restores them. Each path also gives a free starting bonus: Serpent +5% crit, Fox +10% vanguard and companion damage, Magpie +10% starlight.

| id | name | branch | parent | max | base | growth | x | y | path | effect per rank |
|---|---|---|---|---|---|---|---|---|---|---|
| coil | Coiled Patience | Bow | root | 5 | 400 | 2.0 | 440 | 100 | serpent | +4% crit chance |
| viper | Viper's Bite | Bow | coil | 5 | 600 | 2.0 | 360 | 60 | serpent | +0.3× crit damage |
| venom | Venom | Bow | coil | 1 | 1500 | — | 500 | 40 | serpent | Crits poison for 3 s at 50% of arrow damage per second |
| toxin | Toxin | Bow | venom | 5 | 1200 | 2.0 | 420 | 30 | serpent | Poison +30% |
| gaze | Serpent's Gaze | Bow | viper | 3 | 900 | 2.2 | 280 | 60 | serpent | Strike circle +8% |
| foxden | Den Mother | Vanguard | root | 5 | 400 | 2.0 | 80 | 450 | fox | Vanguard and companions +15% damage |
| foxhide | Fox Hide | Vanguard | foxden | 5 | 500 | 2.0 | 80 | 530 | fox | Vanguard +20% health |
| foxrun | Swift Return | Vanguard | foxden | 5 | 500 | 2.0 | 150 | 500 | fox | Fallen vanguard return 12% faster (compounding) |
| foxpack | Pack Tactics | Vanguard | foxhide | 2 | 1500 | 2.6 | 80 | 610 | fox | +1 vanguard may stand at once (needs Muster) |
| cunning | Cunning | Vanguard | foxrun | 5 | 800 | 2.0 | 150 | 580 | fox | Companions strike 10% faster |
| magpie | Magpie's Eye | Spoils | root | 5 | 300 | 2.0 | 100 | 1100 | magpie | +10% starlight |
| glitter | Glitter | Spoils | magpie | 5 | 500 | 2.0 | 180 | 1100 | magpie | Item Find +5% |
| trinket | Lucky Trinket | Spoils | glitter | 3 | 800 | 2.2 | 260 | 1100 | magpie | Luck +3% |
| haggle | Haggler | Spoils | magpie | 3 | 600 | 2.2 | 100 | 1180 | magpie | Reroll cost −10% |
| shiny | Shiny Things | Spoils | haggle | 3 | 700 | 2.2 | 180 | 1180 | magpie | Salvage +20% Glimmer |

Path sets and mythics drop only while their path is chosen (`forPath` in `lootTables.ts`): Serpent's Coil (2: +5% crit; 4: crits poison; 6: a poisoned orc that dies bursts, poisoning and striking neighbours), Foxfire Pack (2: +15% vanguard and companion damage; 4: vanguard return 30% faster; 6: vanguard +10% damage per companion), Magpie's Hoard (2: +15% starlight; 4: 10% chance per kill of a bonus shard worth 2× its starlight; 6: every fifth drop one rarity higher). Mythics: Fang of the Coiled Serpent (bow; every fifth shot is a venom arrow splitting into three), Foxfire Tail (charm; a spectral fox biting for 50% of arrow damage, +25% per companion), The Magpie's Talon (quiver; arrow kills steal double starlight and have a 2% chance of an extra drop roll).

Derived `Stats` added: `path`, `venom` (poison dps × dmg on crit), `venomMult`, `venomBurst`, `fang`, `packBuff`, `foxfire` (fox bite damage), `shardP`, `hoardEvery`, `talon`.

## Deprecated ids (reserved, never reuse)
Lists live in `src/save/schema.ts`; each migration drops the keys from `run.levels`.

| Ids | What | Dropped by |
|---|---|---|
| `tide`, `current`, `flood`, `silt` | River branch (v1.0) | v1→v2 (`RETIRED_NODE_IDS`, TB-028) |
| `roots` | Dreaming Roots (offline progress removed, ab74ac8) | v1→v2 (`RETIRED_NODE_IDS`) |
| `banners` | Blood Banners (Provoke, 193c2cc; retired by TB-080) | v2→v3 (`RETIRED_V3`) |
| `warboss`, `bossfury`, `bossswarm`, `bounty` | Warboss summon, Fury, Swarm and Warboss Bounty (replaced by boss waves, TB-081) | v3→v4 (`RETIRED_V4`) |

## Derived `Stats` (what systems actually read)

```ts
interface Stats {
  dmg: number;            // 9 × 1.25^sharp
  fireRate: number;       // 1.2 × 1.15^draw  (ranger/warden volleys / s; the elf lobs)
  lobCd: number;          // 1.25 / 1.15^draw  (seconds between the elf's lobs)
  radius: number;         // 40 × 1.2^wide    (strike circle, px)
  arrows: number;         // 1 + multi        (lobs per shot; arrows per ranger volley)
  pierce: number;         // pierce           (extra lob strikes; ranger arrow pierce)
  crit: number;           // 0.08 × crit + 0.05 × hunter
  critMult: number;       // 3 + 0.5 × deadly   (the elf's crits)
  // per-type shot nodes (TB-111): chance per shot, 0 until the type is owned
  fireP, frostP, shockP, rebP, moonP: number;   // min(1, 0.25 + 0.15 × <type>chance)
  starP: number;          // starfall ? min(1, 0.1 + 0.05 × starchance) : 0
  burnSecs: number;       // 3 + wildfire
  burn: number;           // 1.3^kindle  (burn damage mult; sets multiply it)
  stunSecs: number;       // 0.5 + 0.25 × (stun − 1)
  shockMult: number;      // 0.3 × 1.3^static
  rebMult: number;        // 1.3^rebdmg
  moonMult: number;       // 1.6 × 1.2^moondmg   (moon shots only)
  homeR: number;          // 70 × (1 + 0.25 × moonreach)
  starDmg: number;        // 1.3^stardmg;  starArrows = 8 + 2 × starcount
  knifeExtra: number;     // knifefan;  boltRoot = 0.3 × boltpin;  ballCd = 4 × 0.9^windlass
  units: Record<'wolf'|'ranger'|'warden'|'hawk'|'treant'|'spear'|'blade', {
    dmg;      // 1.3^<unit>dmg (wolf: 1.4^fangs, inside `wolf`; spear: 1.3^drill)
    rate;     // 1.15^<unit>rate      crit; // 0.05 × <unit>crit
    critMult; // 2 + 0.5 × <unit>critx   spd; // 1.15^<unit>spd (wolf, spear, blade)
  }>;
  homing: boolean; fire: boolean;
  starMult: number;       // 1.08^glean (P-142: no Heartwood passive)
  foes: Record<OrcKind, { on; hp: 1.3^fury; loot: 1.4^fury; spawn: 1.2^swarm }>
                          // grunt: always on, fury = drums, swarm = horde
                          // runner/brute/elite: on = runners/brutes/elites; boss: always off (boss waves only)
  kin: number;            // 1.2^bond   (companions AND vanguard)
  wolf: number;           // wolf ? 6 × 1.4^fangs × kin : 0
  archers: number;        // ranger + warden
  hawk: boolean; treant: boolean;
  knives: { rate: number; dmg: number } | null;   // rate 1.2^knifespd / 1.4, dmg 5 × 1.3^knifedmg × kin
  storm: boolean;
  bounce: number;         // bounce ? 1 + bounce : 0   (Rebound hops)
  shock: boolean; stun: boolean; starfall: boolean;
  slow: number;           // frost ? 0.2 + 0.05 × (frost − 1) : 0
  shatter: number;        // shatter ? 1.4^(shatter − 1) : 0   (× dmg)
  ballista: number;       // ballista ? 40 × 1.5^bolt × kin : 0
  // barricade
  barMax: number;         // 400 × (1 + 0.25 × hw_timber) × 1.25^timber
  barRegen: number;       // 0.01 × repair     (fraction of max per second)
  spikes: number;         // 0.2 × spikes      (fraction of dmg per second to attackers)
  bulwark: boolean;       // Deep Roots owned
  // vanguard
  muster: boolean;
  vanCap: number;         // muster ? 2 + ranks : 0
  vanHp: number;          // 1.3^shield
  vanDmg: number;         // kin  (Spear Drill moved to units.spear)
  vanMend: number;        // 0.03 × mend
  champion: boolean;      // Bladedancer rally unlocked
}
// no Heartwood passive (P-142); hw_timber = Stout Timber rank
// deriveStats(levels, hwLevels) in src/sim/stats.ts
```

## Per-type upgrade nodes (TB-111, built 1 Nov 2026)
Director rules (1 Nov): every arrow/shot type has 3 upgrade nodes (damage, special effect, frequency); every enemy type has 2 (health+reward, frequency); every companion and vanguard unit has damage, fire rate and crit chance, and every crit chance node unlocks a crit damage node; melee units (wolf, spearman, bladedancer) also get move speed. Frequency for a shot type = chance per shot (unlock gives 25%). Existing nodes fold in where they fit; no id renames. Costs are proposed in BALANCE P-111.

Enemies already conform: grunt (War Drums, Call the Horde), runner/brute/elite (Fury, Swarm under their unlock). Nothing new.

**Shot types** (unlock → damage / effect / frequency; `*` = existing node)
| Type | Damage | Special effect | Frequency |
|---|---|---|---|
| Fire `fire*` | `kindle` burn +30%/rank (5) | `wildfire` burn lasts +1 s/rank (3) | `firechance` +15% chance/rank (5) |
| Frost `frost*` | `shatter*` | `frost*` ranks: slow strength | `frostchance` +15%/rank (5) |
| Shock `shock*` | `static` zap +30%/rank (5) | `stun*` Thunderclap, max 1→3: stun +0.25 s/rank, never topped up while it holds (TB-126) | `shockchance` +15%/rank (5) |
| Rebound `bounce*` | `rebdmg` bolt +30%/rank (5) | `bounce*` ranks: hops | `rebchance` +15%/rank (5) |
| Moonbow `moon*` | `moondmg` +20%/rank (5) | `moonreach` settles from +25% farther/rank (3) | `moonchance` +15%/rank (5) |
| Starfall `starfall*` | `stardmg` +30%/rank (5) | `starcount` +2 arrows/rank (3) | `starchance` 10% per shot, +5%/rank (5); replaces "every 10th" |
| Knives `knives*` | `knifedmg` +30%/rank (5) | `knifefan` +1 knife per throw/rank (3) | `knifespd*` throw rate only (its damage part moves to `knifedmg`) |
| Ballista `ballista*` | `bolt*` | `boltpin` struck orcs pinned 0.3 s/rank (3) | `windlass` reload −10%/rank (5) |

Knives and ballista fire on their own timers, so their frequency is fire rate, not a chance.

**Units** (damage / fire rate / crit chance → crit damage / move speed)
| Unit | Damage | Fire rate | Crit chance (+5%/rank, 5) | Crit damage (+50%/rank over ×2, 5) | Move speed (+15%/rank, 3) |
|---|---|---|---|---|---|
| Wolf | `fangs*` | `wolfrate` | `wolfcrit` | `wolfcritx` | `wolfspd` |
| Ranger | `rangerdmg` | `rangerrate` | `rangercrit` | `rangercritx` | — |
| Warden | `wardendmg` | `wardenrate` | `wardencrit` | `wardencritx` | — |
| Hawk | `hawkdmg` | `hawkrate` (dive cooldown) | `hawkcrit` | `hawkcritx` | — |
| Treant | `treantdmg` | `treantrate` (stamp cooldown) | `treantcrit` | `treantcritx` | — |
| Spearman | `drill*` (now spearmen only) | `spearrate` | `spearcrit` | `spearcritx` | `spearspd` |
| Bladedancer | `bladedmg` | `bladerate` | `bladecrit` | `bladecritx` | `bladespd` |

Damage and fire-rate nodes +30% and +15% per rank (5). Kinship, Shieldwall, Close Ranks and Field Mending stay shared.
The elf: Keen Eye gets `deadly` (crit damage +50%/rank over ×3, 5). Hunter's Eye adds to the same elf crit chance, so `deadly` covers it.

New nodes: 48 (18 shot, 29 unit, 1 elf), 56 → 104. The old layout scaled ×1.6 around the root and the new nodes sit beside their parents; the canvas grew to 1288×1262 and the camera's max zoom to 5.

## Planned nodes (DRAFT, not in 1.0 data)
- **Companions → Owl** (after Warden): marks a brute; marked orcs take +50% damage.
- **Barricade → Gatehouse** (after Deep Roots): the wall gains a second segment with its own health; the run ends only when both fall.
- **Vanguard → Standard Bearer** (after Bladedancer): a banner unit that doesn't fight but gives vanguard in its lane +25% damage and mend.
- **Grove → Lantern** (after Gleaning): lobs deal +25% while the strike circle rests on an orc for more than a second (rewards steady aim).

Add to the table only when a BALANCE.md sim run shows where they land in the purchase order.
