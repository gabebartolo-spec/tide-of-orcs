# Skill Tree — node data

Status: **Current** (v1.4, 104 nodes, 48 of them the TB-111 per-type nodes (costs in BALANCE P-111), checked against the code 1 Nov 2026). Started from `docs/prototype.html` and since changed (Wide Volley, War Drums and the summon/Fury/Swarm nodes added; Dreaming Roots, Blood Banners and the Warboss nodes retired; see GDD §14). Mirrored exactly by `src/data/skillTree.ts` (tested: unique ids, parents exist, no cycles, coordinates in bounds, ≥ 40 px apart). Node ids are stable API: never rename; deprecate instead.

Cost formula: `cost(rank, w) = round(base × growth^rank × 1.25^max(0, w − 10))` (rank = ranks already owned, w = wave at purchase; the wave factor is P-001, BALANCE.md §Economy). Costs are starlight.

Layout coordinates are for a 1288×1262 tree canvas, root at (674, 748). Six branches fan outward in the classic incremental shape: Bow up-left, Vanguard left, Barricade low-left, Companions up, Armoury up-right, Grove low-right. Branch colours in ART-STYLE.md.

| id | Name | Branch | Parent | Max | Base | Growth | x | y | Effect |
|---|---|---|---|---|---|---|---|---|---|
| root | Fine. | Grove | — | 1 | 0 | — | 674 | 748 | The elf sighs and picks up the bow. |
| sharp | Ouch | Bow | root | 10 | 12 | 1.55 | 514 | 556 | +25% arrow damage per rank. |
| draw | Again | Bow | sharp | 8 | 30 | 1.7 | 386 | 460 | +15% draw speed per rank. |
| wide | And You | Bow | sharp | 5 | 40 | 1.8 | 602 | 516 | Your arrow strikes a circle 20% wider per rank. |
| crit | That One Hurt | Bow | sharp | 5 | 120 | 2.1 | 578 | 428 | +8% chance per rank to strike for triple damage. |
| multi | Oh, There's More | Bow | draw | 3 | 220 | 4.2 | 290 | 348 | +1 extra arrow lands inside the circle with each shot. |
| pierce | Seconds | Bow | crit | 3 | 260 | 3.8 | 514 | 316 | Each shot strikes the ground +1 more time per rank. |
| moon | Don't Run | Bow | multi | 1 | 3200 | — | 210 | 220 | One shot in four is a moon shot: the circle settles onto the nearest orc and strikes +60% harder. |
| bounce | Pass It On | Bow | pierce | 4 | 1200 | 2.2 | 434 | 220 | One shot in four looses a magic bolt that leaps to 2 more orcs, +1 per rank; each leap hits softer. |
| starfall | It's Raining | Bow | moon | 1 | 6000 | — | 178 | 108 | One shot in ten also rains 8 arrows on orcs across the plain. |
| wolf | A Dog | Companions | root | 1 | 70 | — | 674 | 588 | A dog runs the plain and savages the nearest orc. |
| fangs | Bad Dog | Companions | wolf | 5 | 90 | 1.9 | 754 | 476 | Dog bites +40% harder per rank. |
| ranger | Plus One | Companions | wolf | 1 | 350 | — | 642 | 364 | A second archer joins you behind the fence. |
| warden | Plus Two | Companions | ranger | 1 | 2800 | — | 658 | 236 | A third archer, veteran of older wars. |
| hawk | Look Up | Companions | fangs | 1 | 900 | — | 818 | 348 | A hawk dives on the thickest knot of orcs every few seconds. |
| treant | Even the Trees | Companions | hawk | 1 | 1400 | — | 866 | 220 | An old treant roots itself before the fence and stamps the ground. |
| bond | I Have Friends | Companions | ranger | 5 | 500 | 2.2 | 530 | 172 | All companions and lads +20% damage per rank. |
| knives | Catch | Armoury | root | 1 | 100 | — | 850 | 620 | A knife flies at the nearest orc every 1.4 s. |
| knifespd | Keep Up | Armoury | knives | 5 | 140 | 1.9 | 978 | 540 | Knives fly 20% more often per rank. |
| fire | Warm Enough? | Armoury | knives | 1 | 450 | — | 946 | 412 | One shot in four sets orcs alight, burning for a few seconds. |
| storm | Weather | Armoury | fire | 1 | 1700 | — | 1074 | 316 | Lightning leaps between up to 5 orcs every 6 s. |
| frost | Chilly | Armoury | fire | 5 | 800 | 1.9 | 962 | 268 | One shot in four chills orcs for 3 s: they move and swing 20% slower, +5% per rank. |
| shatter | Bits | Armoury | frost | 5 | 1500 | 2.0 | 994 | 156 | A chilled orc that dies shatters, striking orcs around it. +40% per rank. |
| shock | Tag | Armoury | storm | 1 | 2200 | — | 1186 | 252 | One shot in four looses lightning from your strike to 3 more orcs. |
| stun | Sit Down | Armoury | shock | 3 | 3000 | 2.2 | 1202 | 132 | Shock arrows stun the orcs they strike for half a second, +0.25 s per rank. |
| ballista | Overkill | Armoury | knifespd | 1 | 3400 | — | 1122 | 476 | A heavy bolt that punches through the whole line. |
| bolt | More Overkill | Armoury | ballista | 5 | 2000 | 2.0 | 1202 | 364 | Ballista +50% damage per rank. |
| glean | Tip Jar | Grove | root | 10 | 20 | 1.6 | 850 | 796 | +15% teeth from every orc. |
| horde | Bring Friends | Grove | glean | 5 | 160 | 2.4 | 1010 | 764 | Grunts march 20% more often per rank. More orcs, more teeth. More danger. |
| drums | Eat Something | Grove | horde | 5 | 300 | 2.4 | 1186 | 828 | Grunts have +30% health and drop +40% teeth per rank. |
| runners | Little Ones | Grove | horde | 1 | 120 | — | 722 | 940 | Small, fast orcs join the tide. |
| runfury | Fed Little Ones | Grove | runners | 5 | 200 | 2.4 | 722 | 1052 | Little Ones have +30% health and drop +40% teeth per rank. |
| runswarm | More Little Ones | Grove | runners | 5 | 200 | 2.4 | 722 | 1148 | Little Ones march 20% more often per rank. |
| brutes | Lumps | Grove | runners | 1 | 400 | — | 882 | 940 | Slow, heavy orcs join the tide. |
| brutefury | Fed Lumps | Grove | brutes | 5 | 600 | 2.4 | 882 | 1052 | Lumps have +30% health and drop +40% teeth per rank. |
| bruteswarm | More Lumps | Grove | brutes | 5 | 600 | 2.4 | 882 | 1148 | Lumps march 20% more often per rank. |
| elites | Fancy Ones | Grove | brutes | 1 | 1500 | — | 1042 | 940 | Armoured orcs join the tide. |
| elitefury | Fed Fancy Ones | Grove | elites | 5 | 2000 | 2.4 | 1042 | 1052 | Fancy Ones have +30% health and drop +40% teeth per rank. |
| eliteswarm | More Fancy Ones | Grove | elites | 5 | 2000 | 2.4 | 1042 | 1148 | Fancy Ones march 20% more often per rank. |
| timber | It's a Good Fence | Barricade | root | 10 | 25 | 1.6 | 498 | 796 | Fence +25% health per rank. |
| repair | Nails | Barricade | timber | 5 | 90 | 2.0 | 338 | 764 | Fence mends 1% of its health per second per rank. |
| spikes | Mind the Splinters | Barricade | timber | 5 | 150 | 2.1 | 370 | 852 | Orcs hacking at the fence take 20% of your arrow damage per second per rank. |
| bulwark | Not Yet | Barricade | repair | 1 | 2400 | — | 194 | 724 | Once per run, a falling fence regrows to half health. |
| muster | Lads | Vanguard | root | 1 | 50 | — | 466 | 676 | Rally lads with teeth. They hold the line until they fall. Up to 2 at once. |
| shield | Sturdy Lads | Vanguard | muster | 5 | 110 | 1.9 | 322 | 644 | Lads +30% health per rank. |
| drill | Angry Lads | Vanguard | muster | 5 | 130 | 1.9 | 306 | 548 | Lads +30% damage per rank. |
| ranks | Another Lad | Vanguard | shield | 3 | 400 | 2.6 | 194 | 628 | +1 lad may stand at once. |
| mend | Walk It Off | Vanguard | drill | 3 | 350 | 2.4 | 210 | 516 | Lads recover 3% health per second per rank. |
| champion | Show-off | Vanguard | ranks | 1 | 2200 | — | 162 | 428 | Rally show-offs: costlier, faster, their strikes cleave every orc in reach. |
| hunter | Right There | Spoils | root | 1 | 120 | — | 546 | 940 | +5% chance to strike for triple damage. |
| scavenger | Waste Not | Spoils | hunter | 1 | 150 | — | 418 | 1004 | Salvage gives 50% more Glimmer this run. |
| trophy | Souvenir | Spoils | hunter | 1 | 200 | — | 562 | 1068 | Kills on waves 10, 20, 30… roll a second drop. |
| sharpeyes | Ooh, Shiny | Spoils | scavenger | 1 | 600 | — | 322 | 1100 | Item Find +10% this run. |
| hoard | Expense Account | Spoils | trophy | 1 | 900 | — | 546 | 1180 | Boss drops roll one rarity higher, up to legendary. |
| resonance | Coordinated | Spoils | sharpeyes | 1 | 4000 | — | 386 | 1212 | Every set you wear counts one piece more. |
| echo | Encore | Spoils | resonance | 1 | 6000 | — | 242 | 1196 | Your mythic power triggers 25% more often, or lasts 25% longer. |
| kindle | Hotter | Armoury | fire | 5 | 600 | 1.9 | 925 | 355 | Burning orcs take +30% burn damage per rank. |
| wildfire | Still Burning | Armoury | fire | 3 | 900 | 2.2 | 1006 | 406 | Burns last 1 s longer per rank. |
| firechance | Matches | Armoury | fire | 5 | 500 | 1.9 | 887 | 402 | +15% chance per rank that a shot is a fire arrow. |
| frostchance | Draughty | Armoury | frost | 5 | 900 | 1.9 | 938 | 213 | +15% chance per rank that a shot is a frost arrow. |
| static | Zap | Armoury | shock | 5 | 2500 | 1.9 | 1238 | 222 | Shock lightning +30% damage per rank. |
| shockchance | You're It | Armoury | shock | 5 | 2400 | 1.9 | 1238 | 282 | +15% chance per rank that a shot is a shock arrow. |
| rebdmg | Pass It Harder | Bow | bounce | 5 | 1300 | 1.9 | 396 | 174 | Rebound bolts +30% damage per rank. |
| rebchance | Share Nicely | Bow | bounce | 5 | 1300 | 1.9 | 455 | 163 | +15% chance per rank that a shot looses Rebound. |
| moondmg | Really, Don't | Bow | moon | 5 | 3500 | 1.9 | 166 | 179 | Moon shots +20% damage per rank. |
| moonreach | I Can See You | Bow | moon | 3 | 3500 | 2.2 | 224 | 161 | Moon shots settle onto orcs 25% farther from your aim per rank. |
| moonchance | Moonlighting | Bow | moon | 5 | 3500 | 1.9 | 153 | 237 | +15% chance per rank that a shot is a moon shot. |
| stardmg | Pouring | Bow | starfall | 5 | 6500 | 1.9 | 162 | 50 | Starfall arrows +30% damage per rank. |
| starcount | Bucketing Down | Bow | starfall | 3 | 7000 | 2.2 | 220 | 65 | +2 Starfall arrows per rank. |
| starchance | Bring a Coat | Bow | starfall | 5 | 6500 | 1.9 | 120 | 93 | +5% chance per rank that a shot calls Starfall. |
| knifedmg | Pointy End | Armoury | knives | 5 | 150 | 1.9 | 910 | 613 | Knives +30% damage per rank. |
| knifefan | Catch These | Armoury | knives | 3 | 400 | 2.4 | 844 | 560 | +1 knife per throw per rank. |
| boltpin | Stay There | Armoury | ballista | 3 | 2500 | 2.2 | 1177 | 451 | Every orc a bolt passes through is held still 0.3 s per rank. |
| windlass | Wind It Up | Armoury | ballista | 5 | 2200 | 1.9 | 1171 | 511 | Ballista reload time −10% per rank. |
| deadly | That One Hurt More | Bow | crit | 5 | 300 | 2.1 | 590 | 369 | Your crits strike +50% harder per rank (×3 to start). |
| wolfrate | Fetch | Companions | wolf | 5 | 112 | 1.9 | 732 | 572 | Dog strikes 15% more often per rank. |
| wolfcrit | Goes for the Ankles | Companions | wolf | 5 | 128 | 2.0 | 616 | 572 | Dog bites: +5% chance per rank to crit for double damage. |
| wolfcritx | Won't Let Go | Companions | wolfcrit | 5 | 160 | 2.0 | 616 | 632 | Dog crits +50% damage per rank. |
| wolfspd | Walkies | Companions | wolf | 3 | 80 | 2.0 | 717 | 630 | Dog moves 15% faster per rank. |
| rangerdmg | Plus One Means It | Companions | ranger | 5 | 420 | 1.9 | 678 | 316 | Ranger +30% damage per rank. |
| rangerrate | Plus One Hurries | Companions | ranger | 5 | 490 | 1.9 | 702 | 371 | Ranger strikes 15% more often per rank. |
| rangercrit | Plus One Aims | Companions | ranger | 5 | 560 | 2.0 | 580 | 317 | Ranger arrows: +5% chance per rank to crit for double damage. |
| rangercritx | Plus One Gloats | Companions | rangercrit | 5 | 700 | 2.0 | 543 | 270 | Ranger crits +50% damage per rank. |
| wardendmg | Plus Two Means It | Companions | warden | 5 | 3360 | 1.9 | 666 | 176 | Warden +30% damage per rank. |
| wardenrate | Plus Two Hurries | Companions | warden | 5 | 3920 | 1.9 | 713 | 212 | Warden strikes 15% more often per rank. |
| wardencrit | Plus Two Aims | Companions | warden | 5 | 4480 | 2.0 | 610 | 199 | Warden arrows: +5% chance per rank to crit for double damage. |
| wardencritx | Plus Two Gloats | Companions | wardencrit | 5 | 5600 | 2.0 | 587 | 144 | Warden crits +50% damage per rank. |
| hawkdmg | Pointy Feet | Companions | hawk | 5 | 1080 | 1.9 | 868 | 315 | Hawk +30% damage per rank. |
| hawkrate | Look Up Again | Companions | hawk | 5 | 1260 | 1.9 | 799 | 291 | Hawk strikes 15% more often per rank. |
| hawkcrit | Right on the Head | Companions | hawk | 5 | 1440 | 2.0 | 759 | 336 | Hawk dives: +5% chance per rank to crit for double damage. |
| hawkcritx | Messy | Companions | hawkcrit | 5 | 1800 | 2.0 | 726 | 286 | Hawk crits +50% damage per rank. |
| treantdmg | Heavy Feet | Companions | treant | 5 | 1680 | 1.9 | 887 | 164 | Treant +30% damage per rank. |
| treantrate | Stomp Stomp | Companions | treant | 5 | 1960 | 1.9 | 828 | 173 | Treant strikes 15% more often per rank. |
| treantcrit | The Tree Is Upset | Companions | treant | 5 | 2240 | 2.0 | 904 | 266 | Treant stamps: +5% chance per rank to crit for double damage. |
| treantcritx | Flat | Companions | treantcrit | 5 | 2800 | 2.0 | 982 | 322 | Treant crits +50% damage per rank. |
| spearrate | Busy Lads | Vanguard | muster | 5 | 168 | 1.9 | 412 | 702 | Lads strike 15% more often per rank. |
| spearcrit | Lucky Lads | Vanguard | muster | 5 | 192 | 2.0 | 455 | 617 | Lad strikes: +5% chance per rank to crit for double damage. |
| spearcritx | Lads Overdo It | Vanguard | spearcrit | 5 | 240 | 2.0 | 443 | 558 | Lad crits +50% damage per rank. |
| spearspd | Hurry Up, Lads | Vanguard | muster | 3 | 120 | 2.0 | 462 | 736 | Lads move 15% faster per rank. |
| bladedmg | Showing Off | Vanguard | champion | 5 | 2640 | 1.9 | 153 | 368 | Show-offs +30% damage per rank. |
| bladerate | Twirls | Vanguard | champion | 5 | 3080 | 1.9 | 209 | 390 | Show-offs strike 15% more often per rank. |
| bladecrit | Look at Me | Vanguard | champion | 5 | 3520 | 2.0 | 106 | 406 | Show-off strikes: +5% chance per rank to crit for double damage. |
| bladecritx | Takes a Bow | Vanguard | bladecrit | 5 | 4400 | 2.0 | 50 | 385 | Show-off crits +50% damage per rank. |
| bladespd | Prances | Vanguard | champion | 3 | 2200 | 2.0 | 218 | 449 | Show-offs move 15% faster per rank. |

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
  dmg: number;            // 9 × 1.25^sharp × heart
  fireRate: number;       // 1.2 × 1.15^draw  (ranger/warden volleys / s; the elf lobs)
  lobCd: number;          // 2.5 / 1.15^draw  (seconds between the elf's lobs)
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
  starMult: number;       // 1.15^glean × heart
  foes: Record<OrcKind, { on; hp: 1.3^fury; loot: 1.4^fury; spawn: 1.2^swarm }>
                          // grunt: always on, fury = drums, swarm = horde
                          // runner/brute/elite: on = runners/brutes/elites; boss: always off (boss waves only)
  kin: number;            // 1.2^bond × heart   (companions AND vanguard)
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
  barMax: number;         // 400 × (1 + 0.25 × hw_timber) × 1.25^timber × heart
  barRegen: number;       // 0.01 × repair     (fraction of max per second)
  spikes: number;         // 0.2 × spikes      (fraction of dmg per second to attackers)
  bulwark: boolean;       // Deep Roots owned
  // vanguard
  muster: boolean;
  vanCap: number;         // muster ? 2 + ranks : 0
  vanHp: number;          // 1.3^shield × heart
  vanDmg: number;         // kin  (Spear Drill moved to units.spear)
  vanMend: number;        // 0.03 × mend
  champion: boolean;      // Bladedancer rally unlocked
}
// heart = 1 + 0.12 × heartwood (all earned); hw_timber = Stout Timber rank
// deriveStats(levels, heartwood, hwLevels) in src/sim/stats.ts
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
