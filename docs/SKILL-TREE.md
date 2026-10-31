# Skill Tree — node data

Status: **Current** (v1.3, 49 nodes (6 TB-089 arrow nodes; numbers pending P-002), checked against the code 31 Oct 2026). Started from `docs/prototype.html` and since changed (Wide Volley, War Drums and the summon/Fury/Swarm nodes added; Dreaming Roots, Blood Banners and the Warboss nodes retired; see GDD §14). Mirrored exactly by `src/data/skillTree.ts` (tested: unique ids, parents exist, no cycles, coordinates in bounds, ≥ 40 px apart). Node ids are stable API: never rename; deprecate instead.

Cost formula: `cost(rank, w) = round(base × growth^rank × 1.25^max(0, w − 10))` (rank = ranks already owned, w = wave at purchase; the wave factor is P-001, BALANCE.md §Economy). Costs are starlight.

Layout coordinates are for a 760×920 tree canvas, root bottom-centre at (380, 600). Six branches fan outward in the classic incremental shape: Bow up-left, Vanguard left, Barricade low-left, Companions up, Armoury up-right, Grove low-right. Branch colours in ART-STYLE.md.

| id | Name | Branch | Parent | Max | Base | Growth | x | y | Effect |
|---|---|---|---|---|---|---|---|---|---|
| root | Waking | Grove | — | 1 | 0 | — | 380 | 600 | An elf, a bow, a wall of timber, an endless tide. Begin. |
| sharp | Sharpened Tips | Bow | root | 10 | 12 | 1.55 | 280 | 480 | +25% arrow damage per rank. |
| draw | Quick Draw | Bow | sharp | 8 | 30 | 1.7 | 200 | 420 | +15% draw speed per rank. |
| crit | Keen Eye | Bow | sharp | 5 | 120 | 2.1 | 320 | 400 | +8% chance per rank to strike for triple damage. |
| multi | Split Shot | Bow | draw | 3 | 220 | 4.2 | 140 | 350 | +1 extra arrow lands inside the circle with each shot. |
| pierce | Longshaft | Bow | crit | 3 | 260 | 3.8 | 280 | 330 | Each shot strikes the ground +1 more time per rank. |
| bounce | Rebound | Bow | pierce | 4 | 1200 | 2.2 | 230 | 270 | A magic bolt bounces on from your strike: 2 bounces, +1 per rank, each weaker. |
| wide | Wide Volley | Bow | sharp | 5 | 40 | 1.8 | 335 | 455 | Your arrow strikes a circle 20% wider per rank. |
| moon | Moonbow | Bow | multi | 1 | 3200 | — | 90 | 270 | Your circle settles onto the nearest orc, and arrows deal +60% damage. |
| starfall | Starfall | Bow | moon | 1 | 6000 | — | 70 | 200 | Every 10th lob also rains 8 arrows across the plain. |
| wolf | Grey Wolf | Companions | root | 1 | 70 | — | 380 | 500 | A wolf runs the plain and savages the nearest orc. |
| fangs | Fangs | Companions | wolf | 5 | 90 | 1.9 | 430 | 430 | Wolf bites +40% harder per rank. |
| ranger | Ranger | Companions | wolf | 1 | 350 | — | 360 | 360 | A second archer joins you behind the wall. |
| warden | Warden | Companions | ranger | 1 | 2800 | — | 370 | 280 | A third archer, veteran of older wars. |
| hawk | Hawk | Companions | fangs | 1 | 900 | — | 470 | 350 | A hawk dives on the thickest knot of orcs every few seconds. |
| treant | Treant | Companions | hawk | 1 | 1400 | — | 500 | 270 | An old treant roots itself before the wall and stamps the ground. |
| bond | Kinship | Companions | ranger | 5 | 500 | 2.2 | 290 | 240 | All companions and vanguard +20% damage per rank. |
| knives | Throwing Knives | Armoury | root | 1 | 100 | — | 490 | 520 | A knife flies at the nearest orc every 1.4 s. |
| knifespd | Nimble Wrist | Armoury | knives | 5 | 140 | 1.9 | 570 | 470 | Knives fly 20% faster per rank and hit harder. |
| fire | Fire Arrows | Armoury | knives | 1 | 450 | — | 550 | 390 | Arrows set orcs alight, burning for a few seconds. |
| storm | Storm Glade | Armoury | fire | 1 | 1700 | — | 630 | 330 | Lightning leaps between up to 5 orcs every 6 s. |
| frost | Frost Arrows | Armoury | fire | 5 | 800 | 1.9 | 560 | 300 | Arrows chill orcs 3 s, slowing them 20% (+5% per rank). |
| shatter | Shatter | Armoury | frost | 5 | 1500 | 2.0 | 580 | 230 | A chilled orc that dies bursts, striking orcs nearby (×1.4 per rank). |
| shock | Shock Arrows | Armoury | storm | 1 | 2200 | — | 700 | 290 | Lightning leaps from your strike to 3 more orcs. |
| stun | Thunderclap | Armoury | shock | 1 | 3000 | — | 710 | 215 | Struck orcs are stunned for 0.5 s. |
| ballista | Ballista | Armoury | knifespd | 1 | 3400 | — | 660 | 430 | A heavy bolt that punches through the whole line. |
| bolt | Iron Bolts | Armoury | ballista | 5 | 2000 | 2.0 | 710 | 360 | Ballista +50% damage per rank. |
| glean | Gleaning | Grove | root | 10 | 20 | 1.6 | 490 | 630 | +15% starlight from every orc. |
| horde | Call the Horde | Grove | glean | 5 | 160 | 2.4 | 590 | 610 | Grunts march 20% more often per rank. More orcs, more starlight. More danger. |
| drums | War Drums | Grove | horde | 5 | 300 | 2.4 | 700 | 650 | Grunts have +30% health and drop +40% starlight per rank. |
| runners | Goblin Runners | Grove | horde | 1 | 120 | — | 410 | 720 | Small, fast orcs join the tide. |
| runfury | Runner Fury | Grove | runners | 5 | 200 | 2.4 | 410 | 790 | Runners have +30% health and drop +40% starlight per rank. |
| runswarm | Runner Swarm | Grove | runners | 5 | 200 | 2.4 | 410 | 850 | Runners march 20% more often per rank. |
| brutes | Brutes | Grove | runners | 1 | 400 | — | 510 | 720 | Slow, hulking orcs join the tide. |
| brutefury | Brute Fury | Grove | brutes | 5 | 600 | 2.4 | 510 | 790 | Brutes have +30% health and drop +40% starlight per rank. |
| bruteswarm | Brute Swarm | Grove | brutes | 5 | 600 | 2.4 | 510 | 850 | Brutes march 20% more often per rank. |
| elites | Blackguard | Grove | brutes | 1 | 1500 | — | 610 | 720 | Armoured elite orcs join the tide. |
| elitefury | Elite Fury | Grove | elites | 5 | 2000 | 2.4 | 610 | 790 | Elites have +30% health and drop +40% starlight per rank. |
| eliteswarm | Elite Swarm | Grove | elites | 5 | 2000 | 2.4 | 610 | 850 | Elites march 20% more often per rank. |
| timber | Seasoned Timber | Barricade | root | 10 | 25 | 1.6 | 270 | 630 | Barricade +25% health per rank. |
| repair | Patient Hands | Barricade | timber | 5 | 90 | 2.0 | 170 | 610 | Barricade mends 1% of its health per second per rank. |
| spikes | Thornwall | Barricade | timber | 5 | 150 | 2.1 | 190 | 665 | Orcs hacking at the wall take 20% of your arrow damage per second per rank. |
| bulwark | Deep Roots | Barricade | repair | 1 | 2400 | — | 80 | 585 | Once per run, a falling barricade regrows to half health. |
| muster | Muster | Vanguard | root | 1 | 50 | — | 250 | 555 | Rally spearmen with starlight. They hold the line until they fall. Up to 2 at once. |
| shield | Shieldwall | Vanguard | muster | 5 | 110 | 1.9 | 160 | 535 | Vanguard +30% health per rank. |
| drill | Spear Drill | Vanguard | muster | 5 | 130 | 1.9 | 150 | 475 | Vanguard +30% damage per rank. |
| ranks | Close Ranks | Vanguard | shield | 3 | 400 | 2.6 | 80 | 525 | +1 vanguard may stand at once. |
| mend | Field Mending | Vanguard | drill | 3 | 350 | 2.4 | 90 | 455 | Vanguard recover 3% health per second per rank. |
| champion | Bladedancer | Vanguard | ranks | 1 | 2200 | — | 60 | 400 | Rally bladedancers: costlier, faster, their strikes cleave every orc in reach. |

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
  dmg: number;            // 9 × 1.25^sharp × (moon ? 1.6 : 1) × heart
  fireRate: number;       // 1.2 × 1.15^draw  (ranger/warden volleys / s; the elf lobs)
  lobCd: number;          // 2.5 / 1.15^draw  (seconds between the elf's lobs)
  radius: number;         // 40 × 1.2^wide    (strike circle, px)
  arrows: number;         // 1 + multi        (lobs per shot; arrows per ranger volley)
  pierce: number;         // pierce           (extra lob strikes; ranger arrow pierce)
  crit: number;           // 0.08 × crit
  homing: boolean; fire: boolean;
  starMult: number;       // 1.15^glean × heart
  foes: Record<OrcKind, { on; hp: 1.3^fury; loot: 1.4^fury; spawn: 1.2^swarm }>
                          // grunt: always on, fury = drums, swarm = horde
                          // runner/brute/elite: on = runners/brutes/elites; boss: always off (boss waves only)
  kin: number;            // 1.2^bond × heart   (companions AND vanguard)
  wolf: number;           // wolf ? 6 × 1.4^fangs × kin : 0
  archers: number;        // ranger + warden
  hawk: boolean; treant: boolean;
  knives: { rate: number; dmg: number } | null;
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
  vanDmg: number;         // 1.3^drill × kin
  vanMend: number;        // 0.03 × mend
  champion: boolean;      // Bladedancer rally unlocked
}
// heart = 1 + 0.12 × heartwood (all earned); hw_timber = Stout Timber rank
// deriveStats(levels, heartwood, hwLevels) in src/sim/stats.ts
```

## Planned nodes (DRAFT, not in 1.0 data)
- **Companions → Owl** (after Warden): marks a brute; marked orcs take +50% damage.
- **Barricade → Gatehouse** (after Deep Roots): the wall gains a second segment with its own health; the run ends only when both fall.
- **Vanguard → Standard Bearer** (after Bladedancer): a banner unit that doesn't fight but gives vanguard in its lane +25% damage and mend.
- **Grove → Lantern** (after Gleaning): lobs deal +25% while the strike circle rests on an orc for more than a second (rewards steady aim).

Add to the table only when a BALANCE.md sim run shows where they land in the purchase order.
