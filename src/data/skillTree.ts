/** Skill tree nodes. Mirrors docs/SKILL-TREE.md exactly. Ids are stable API. */

export type Branch = 'Bow' | 'Companions' | 'Armoury' | 'Grove' | 'Barricade' | 'Vanguard' | 'Spoils';

export type NodeId =
  | 'root' | 'sharp' | 'draw' | 'crit' | 'multi' | 'pierce' | 'moon' | 'wide'
  | 'wolf' | 'fangs' | 'ranger' | 'warden' | 'hawk' | 'treant' | 'bond'
  | 'knives' | 'knifespd' | 'fire' | 'storm' | 'ballista' | 'bolt'
  | 'bounce' | 'starfall' | 'frost' | 'shatter' | 'shock' | 'stun'
  | 'glean' | 'horde' | 'drums'
  | 'runners' | 'runfury' | 'runswarm' | 'brutes' | 'brutefury' | 'bruteswarm'
  | 'elites' | 'elitefury' | 'eliteswarm'
  | 'timber' | 'repair' | 'spikes' | 'bulwark'
  | 'muster' | 'shield' | 'drill' | 'ranks' | 'mend' | 'champion' | 'swiftmuster'
  | 'hunter' | 'scavenger' | 'trophy' | 'sharpeyes' | 'hoard' | 'resonance' | 'echo'
  // TB-111
  | 'kindle' | 'wildfire' | 'firechance' | 'frostchance' | 'static' | 'shockchance' | 'rebdmg' | 'rebchance' | 'moondmg' | 'moonreach' | 'moonchance' | 'stardmg' | 'starcount' | 'starchance' | 'knifedmg' | 'knifefan' | 'boltpin' | 'windlass' | 'deadly' | 'wolfrate' | 'wolfcrit' | 'wolfcritx' | 'wolfspd' | 'rangerdmg' | 'rangerrate' | 'rangercrit' | 'rangercritx' | 'wardendmg' | 'wardenrate' | 'wardencrit' | 'wardencritx' | 'hawkdmg' | 'hawkrate' | 'hawkcrit' | 'hawkcritx' | 'treantdmg' | 'treantrate' | 'treantcrit' | 'treantcritx' | 'spearrate' | 'spearcrit' | 'spearcritx' | 'spearspd' | 'bladedmg' | 'bladerate' | 'bladecrit' | 'bladecritx' | 'bladespd';

export interface SkillNode {
  id: NodeId;
  name: string;
  branch: Branch;
  parent: NodeId | null;
  max: number;
  base: number;
  growth: number;
  x: number;
  y: number;
  desc: string;
}

const n = (id: NodeId, name: string, branch: Branch, parent: NodeId | null, max: number, base: number, growth: number, x: number, y: number, desc: string): SkillNode =>
  ({ id, name, branch, parent, max, base, growth, x, y, desc });

export const NODES: readonly SkillNode[] = [
  n('root', 'Waking', 'Grove', null, 1, 0, 1, 700, 890, 'An elf, a bow, a wall of timber, an endless tide. Begin.'),
  n('sharp', 'Sharpened Tips', 'Bow', 'root', 10, 12, 1.55, 610, 530, '+25% arrow damage per rank.'),
  n('draw', 'Quick Draw', 'Bow', 'sharp', 8, 12, 1.7, 500, 490, '+15% draw speed per rank.'),
  n('wide', 'Wide Volley', 'Bow', 'sharp', 5, 40, 1.8, 595, 470, 'Your arrow strikes a circle 20% wider per rank.'),
  n('crit', 'Keen Eye', 'Bow', 'sharp', 5, 30, 2.1, 570, 410, '+8% chance per rank to strike for triple damage.'),
  n('multi', 'Split Shot', 'Bow', 'draw', 3, 220, 4.2, 390, 440, '+1 extra arrow lands inside the circle with each shot.'),
  n('pierce', 'Longshaft', 'Bow', 'crit', 3, 260, 3.8, 480, 330, 'Each shot strikes the ground +1 more time per rank.'),
  n('moon', 'Moonbow', 'Bow', 'multi', 1, 3200, 1, 270, 390, 'One shot in four is a moon shot: the circle settles onto the nearest orc and strikes +60% harder.'),
  n('bounce', 'Rebound', 'Bow', 'pierce', 4, 1200, 2.2, 380, 240, 'One shot in four looses a magic bolt that leaps to 2 more orcs, +1 per rank; each leap hits softer.'),
  n('starfall', 'Starfall', 'Bow', 'moon', 1, 6000, 1, 170, 280, 'One shot in ten also rains 8 arrows on orcs across the plain.'),
  n('wolf', 'Grey Wolf', 'Companions', 'muster', 1, 200, 1, 700, 550, 'A wolf runs the plain and savages the nearest orc.'),
  n('fangs', 'Fangs', 'Companions', 'wolf', 5, 90, 1.9, 820, 470, 'Wolf bites +40% harder per rank.'),
  n('ranger', 'Ranger', 'Companions', 'wolf', 1, 350, 1, 690, 390, 'A second archer joins you behind the wall.'),
  n('warden', 'Warden', 'Companions', 'ranger', 1, 2800, 1, 640, 220, 'A third archer, veteran of older wars.'),
  n('hawk', 'Hawk', 'Companions', 'fangs', 1, 900, 1, 850, 310, 'A hawk dives on the thickest knot of orcs every few seconds.'),
  n('treant', 'Treant', 'Companions', 'hawk', 1, 1400, 1, 820, 150, 'An old treant roots itself before the wall and stamps the ground.'),
  n('bond', 'Kinship', 'Companions', 'ranger', 5, 500, 2.2, 540, 150, 'All companions and vanguard +20% damage per rank.'),
  n('knives', 'Throwing Knives', 'Armoury', 'root', 1, 100, 1, 820, 650, 'A knife flies at the nearest orc every 1.4 s.'),
  n('knifespd', 'Nimble Wrist', 'Armoury', 'knives', 5, 46, 1.9, 950, 680, 'Knives fly 20% more often per rank.'),
  n('fire', 'Fire Arrows', 'Armoury', 'knives', 1, 450, 1, 960, 530, 'One shot in four sets orcs alight, burning for a few seconds.'),
  n('storm', 'Storm Glade', 'Armoury', 'fire', 1, 1700, 1, 1090, 470, 'Lightning leaps between up to 5 orcs every 6 s.'),
  n('frost', 'Frost Arrows', 'Armoury', 'fire', 5, 800, 1.9, 1010, 370, 'One shot in four chills orcs for 3 s: they move and swing 20% slower, +5% per rank.'),
  n('shatter', 'Shatter', 'Armoury', 'frost', 5, 1500, 2.0, 1060, 260, 'A chilled orc that dies shatters, striking orcs around it. +40% per rank.'),
  n('shock', 'Shock Arrows', 'Armoury', 'storm', 1, 2200, 1, 1220, 410, 'One shot in four looses lightning from your strike to 3 more orcs.'),
  n('stun', 'Thunderclap', 'Armoury', 'shock', 3, 3000, 2.2, 1276, 384, 'Shock arrows stun the orcs they strike for half a second, +0.25 s per rank.'),
  n('ballista', 'Ballista', 'Armoury', 'knifespd', 1, 3400, 1, 1080, 660, 'A heavy bolt that punches through the whole line.'),
  n('bolt', 'Iron Bolts', 'Armoury', 'ballista', 5, 2000, 2.0, 1141, 651, 'Ballista +50% damage per rank.'),
  n('horde', 'Call the Horde', 'Grove', 'root', 5, 160, 2.4, 830, 960, 'Grunts march 20% more often per rank. More orcs, more starlight. More danger.'),
  n('drums', 'War Drums', 'Grove', 'horde', 5, 300, 2.4, 970, 940, 'Grunts have +30% health and drop +40% starlight per rank.'),
  n('glean', 'Gleaning', 'Grove', 'drums', 5, 600, 2.2, 1031, 931, '+8% starlight from every orc.'),
  n('runners', 'Goblin Runners', 'Grove', 'horde', 1, 120, 1, 880, 1060, 'Runners march four times as often (they trickle in on their own from wave 5), each worth +50% starlight.'),
  n('runfury', 'Runner Fury', 'Grove', 'runners', 5, 200, 2.4, 908, 1115, 'Runners have +30% health and drop +40% starlight per rank.'),
  n('runswarm', 'Runner Swarm', 'Grove', 'runners', 5, 200, 2.4, 939, 1042, 'Runners march 20% more often per rank.'),
  n('brutes', 'Brutes', 'Grove', 'runners', 1, 400, 1, 1000, 1130, 'Brutes march four times as often (they trickle in on their own from wave 10), each worth +50% starlight.'),
  n('brutefury', 'Brute Fury', 'Grove', 'brutes', 5, 600, 2.4, 1054, 1161, 'Brutes have +30% health and drop +40% starlight per rank.'),
  n('bruteswarm', 'Brute Swarm', 'Grove', 'brutes', 5, 600, 2.4, 1058, 1109, 'Brutes march 20% more often per rank.'),
  n('elites', 'Blackguard', 'Grove', 'brutes', 1, 1500, 1, 1120, 1200, 'Blackguard march four times as often (they trickle in on their own from wave 20), each worth +50% starlight.'),
  n('elitefury', 'Elite Fury', 'Grove', 'elites', 5, 2000, 2.4, 1174, 1231, 'Elites have +30% health and drop +40% starlight per rank.'),
  n('eliteswarm', 'Elite Swarm', 'Grove', 'elites', 5, 2000, 2.4, 1178, 1179, 'Elites march 20% more often per rank.'),
  n('timber', 'Seasoned Timber', 'Barricade', 'root', 10, 25, 1.6, 570, 960, 'Barricade +25% health per rank.'),
  n('repair', 'Patient Hands', 'Barricade', 'timber', 5, 90, 2.0, 430, 980, 'Barricade mends 1% of its health per second per rank.'),
  n('spikes', 'Thornwall', 'Barricade', 'timber', 5, 150, 2.1, 537, 1013, 'Orcs hacking at the wall take 20% of your arrow damage per second per rank.'),
  n('bulwark', 'Deep Roots', 'Barricade', 'repair', 1, 2400, 1, 371, 999, 'Once per run, a falling barricade regrows to half health.'),
  n('muster', 'Muster', 'Vanguard', 'root', 1, 50, 1, 700, 730, 'Two spearmen hold the line. Each one that falls returns after 12 seconds.'),
  n('shield', 'Shieldwall', 'Vanguard', 'muster', 5, 110, 1.9, 560, 760, 'Vanguard +30% health per rank.'),
  n('drill', 'Spear Drill', 'Vanguard', 'muster', 5, 130, 1.9, 575, 670, 'Spearmen +30% damage per rank.'),
  n('ranks', 'Close Ranks', 'Vanguard', 'shield', 3, 400, 2.6, 430, 780, '+1 vanguard may stand at once.'),
  n('mend', 'Field Mending', 'Vanguard', 'drill', 3, 350, 2.4, 450, 650, 'Vanguard recover 3% health per second per rank.'),
  n('champion', 'Bladedancer', 'Vanguard', 'ranks', 1, 2200, 1, 290, 750, 'Half the line become bladedancers: faster, their strikes cleave every orc in reach.'),
  // Spoils (TB-101): loot inside a run; costs proposed in BALANCE P-101
  n('hunter', "Hunter's Eye", 'Spoils', 'root', 1, 120, 1, 700, 1020, '+5% chance to strike for triple damage.'),
  n('scavenger', 'Scavenger', 'Spoils', 'hunter', 1, 150, 1, 600, 1120, 'Salvage gives 50% more Glimmer this run.'),
  n('trophy', 'Trophy', 'Spoils', 'hunter', 1, 200, 1, 800, 1120, 'Kills on waves 10, 20, 30… roll a second drop.'),
  n('sharpeyes', 'Sharp Eyes', 'Spoils', 'scavenger', 1, 600, 1, 500, 1200, 'Item Find +10% this run.'),
  n('hoard', 'Boss Hoard', 'Spoils', 'trophy', 1, 900, 1, 844, 1164, 'Boss drops roll one rarity higher, up to legendary.'),
  n('resonance', 'Set Resonance', 'Spoils', 'sharpeyes', 1, 4000, 1, 390, 1260, 'Every set you wear counts one piece more.'),
  n('echo', 'Mythic Echo', 'Spoils', 'resonance', 1, 6000, 1, 331, 1280, 'Your mythic power triggers 25% more often, or lasts 25% longer.'),
  // Per-type nodes (TB-111): costs proposed in BALANCE P-111
  n('kindle', 'Kindling', 'Armoury', 'fire', 5, 600, 1.9, 1007, 490, 'Burning orcs take +30% burn damage per rank.'),
  n('wildfire', 'Wildfire', 'Armoury', 'fire', 3, 900, 2.2, 959, 468, 'Burns last 1 s longer per rank.'),
  n('firechance', 'Fire Quiver', 'Armoury', 'fire', 5, 500, 1.9, 1018, 551, '+15% chance per rank that a shot is a fire arrow.'),
  n('frostchance', 'Frost Quiver', 'Armoury', 'frost', 5, 900, 1.9, 1028, 311, '+15% chance per rank that a shot is a frost arrow.'),
  n('static', 'Static', 'Armoury', 'shock', 5, 2500, 1.9, 1276, 436, 'Shock lightning +30% damage per rank.'),
  n('shockchance', 'Storm Quiver', 'Armoury', 'shock', 5, 2400, 1.9, 1215, 348, '+15% chance per rank that a shot is a shock arrow.'),
  n('rebdmg', 'Hard Rebound', 'Bow', 'bounce', 5, 1300, 1.9, 342, 191, 'Rebound bolts +30% damage per rank.'),
  n('rebchance', 'Rebound Quiver', 'Bow', 'bounce', 5, 1300, 1.9, 321, 259, '+15% chance per rank that a shot looses Rebound.'),
  n('moondmg', 'Moonsilver', 'Bow', 'moon', 5, 3500, 1.9, 213, 366, 'Moon shots +20% damage per rank.'),
  n('moonreach', 'Moonpull', 'Bow', 'moon', 3, 3500, 2.2, 215, 419, 'Moon shots settle onto orcs 25% farther from your aim per rank.'),
  n('moonchance', 'Moon Quiver', 'Bow', 'moon', 5, 3500, 1.9, 273, 328, '+15% chance per rank that a shot is a moon shot.'),
  n('stardmg', 'Starsteel', 'Bow', 'starfall', 5, 6500, 1.9, 137, 228, 'Starfall arrows +30% damage per rank.'),
  n('starcount', 'Meteor Shower', 'Bow', 'starfall', 3, 7000, 2.2, 113, 303, '+2 Starfall arrows per rank.'),
  n('starchance', 'Wishing Star', 'Bow', 'starfall', 5, 6500, 1.9, 90, 254, '+5% chance per rank that a shot calls Starfall.'),
  n('knifedmg', 'Keen Knives', 'Armoury', 'knives', 5, 150, 1.9, 848, 595, 'Knives +30% damage per rank.'),
  n('knifefan', 'Knife Fan', 'Armoury', 'knives', 3, 400, 2.4, 770, 613, '+1 knife per throw per rank.'),
  n('boltpin', 'Pinning Bolts', 'Armoury', 'ballista', 3, 2500, 2.2, 1127, 701, 'Every orc a bolt passes through is held still 0.3 s per rank.'),
  n('windlass', 'Windlass', 'Armoury', 'ballista', 5, 2200, 1.9, 1102, 602, 'Ballista reload time −10% per rank.'),
  n('deadly', 'Deadly Aim', 'Bow', 'crit', 5, 300, 2.1, 550, 351, 'Your crits strike +50% harder per rank (×3 to start).'),
  n('wolfrate', 'Swift Bite', 'Companions', 'wolf', 5, 112, 1.9, 679, 492, 'Wolf strikes 15% more often per rank.'),
  n('wolfcrit', 'Wolf Instinct', 'Companions', 'wolf', 5, 128, 2.0, 745, 455, 'Wolf bites: +5% chance per rank to crit for double damage.'),
  n('wolfcritx', 'Rending Bite', 'Companions', 'wolfcrit', 5, 160, 2.0, 804, 414, 'Wolf crits +50% damage per rank.'),
  n('wolfspd', 'Long Stride', 'Companions', 'wolf', 3, 80, 2.0, 754, 519, 'Wolf moves 15% faster per rank.'),
  n('rangerdmg', "Ranger's Draw", 'Companions', 'ranger', 5, 420, 1.9, 686, 328, 'Ranger +30% damage per rank.'),
  n('rangerrate', "Ranger's Haste", 'Companions', 'ranger', 5, 490, 1.9, 756, 361, 'Ranger strikes 15% more often per rank.'),
  n('rangercrit', "Ranger's Eye", 'Companions', 'ranger', 5, 560, 2.0, 628, 383, 'Ranger arrows: +5% chance per rank to crit for double damage.'),
  n('rangercritx', "Ranger's Mark", 'Companions', 'rangercrit', 5, 700, 2.0, 609, 301, 'Ranger crits +50% damage per rank.'),
  n('wardendmg', "Warden's Draw", 'Companions', 'warden', 5, 3360, 1.9, 623, 161, 'Warden +30% damage per rank.'),
  n('wardenrate', "Warden's Haste", 'Companions', 'warden', 5, 3920, 1.9, 704, 188, 'Warden strikes 15% more often per rank.'),
  n('wardencrit', "Warden's Eye", 'Companions', 'warden', 5, 4480, 2.0, 628, 111, 'Warden arrows: +5% chance per rank to crit for double damage.'),
  n('wardencritx', "Warden's Mark", 'Companions', 'wardencrit', 5, 5600, 2.0, 621, 49, 'Warden crits +50% damage per rank.'),
  n('hawkdmg', 'Sharp Talons', 'Companions', 'hawk', 5, 1080, 1.9, 861, 249, 'Hawk +30% damage per rank.'),
  n('hawkrate', 'Swift Wings', 'Companions', 'hawk', 5, 1260, 1.9, 911, 300, 'Hawk strikes 15% more often per rank.'),
  n('hawkcrit', 'Hawk Eye', 'Companions', 'hawk', 5, 1440, 2.0, 803, 270, 'Hawk dives: +5% chance per rank to crit for double damage.'),
  n('hawkcritx', 'Killing Dive', 'Companions', 'hawkcrit', 5, 1800, 2.0, 773, 216, 'Hawk crits +50% damage per rank.'),
  n('treantdmg', 'Heartoak', 'Companions', 'treant', 5, 1680, 1.9, 809, 89, 'Treant +30% damage per rank.'),
  n('treantrate', 'Restless Roots', 'Companions', 'treant', 5, 1960, 1.9, 757, 115, 'Treant strikes 15% more often per rank.'),
  n('treantcrit', 'Old Wrath', 'Companions', 'treant', 5, 2240, 2.0, 867, 110, 'Treant stamps: +5% chance per rank to crit for double damage.'),
  n('treantcritx', 'Crushing Stamp', 'Companions', 'treantcrit', 5, 2800, 2.0, 897, 56, 'Treant crits +50% damage per rank.'),
  n('swiftmuster', 'Swift Muster', 'Vanguard', 'muster', 5, 140, 1.9, 555, 842, 'Fallen vanguard return 15% sooner per rank.'),
  n('spearrate', 'Spear Rhythm', 'Vanguard', 'muster', 5, 168, 1.9, 640, 825, 'Spearmen strikes 15% more often per rank.'),
  n('spearcrit', 'Spear Point', 'Vanguard', 'muster', 5, 192, 2.0, 470, 715, 'Spearman strikes: +5% chance per rank to crit for double damage.'),
  n('spearcritx', 'Deep Thrust', 'Vanguard', 'spearcrit', 5, 240, 2.0, 386, 710, 'Spearmen crits +50% damage per rank.'),
  n('spearspd', 'Quick March', 'Vanguard', 'muster', 3, 120, 2.0, 775, 795, 'Spearmen moves 15% faster per rank.'),
  n('bladedmg', 'Blade Drill', 'Vanguard', 'champion', 5, 2640, 1.9, 233, 727, 'Bladedancers +30% damage per rank.'),
  n('bladerate', 'Blade Rhythm', 'Vanguard', 'champion', 5, 3080, 1.9, 235, 779, 'Bladedancers strike 15% more often per rank.'),
  n('bladecrit', 'Blade Edge', 'Vanguard', 'champion', 5, 3520, 2.0, 281, 689, 'Bladedancer strikes: +5% chance per rank to crit for double damage.'),
  n('bladecritx', 'Whirling Edge', 'Vanguard', 'bladecrit', 5, 4400, 2.0, 273, 627, 'Bladedancers crits +50% damage per rank.'),
  n('bladespd', 'Light Feet', 'Vanguard', 'champion', 3, 2200, 2.0, 180, 746, 'Bladedancers move 15% faster per rank.'),
];

export const NODE: Readonly<Record<NodeId, SkillNode>> = Object.fromEntries(NODES.map((x) => [x.id, x])) as Record<NodeId, SkillNode>;

export const TREE_CANVAS = { w: 1400, h: 1320 } as const;
/** Tree view: opening zoom and focus (the root), zoom range as multiples of fit-to-width, wheel step, px of movement before a press becomes a drag. */
export const TREE_VIEW = { startZoom: 1, focusX: 700, focusY: 890, minZoom: 0.6, maxZoom: 5, wheelStep: 1.15, dragPx: 6, hitR: 20,
  /** Branch line bow as a fraction of its length; camera ease rate toward the selected node (1/s). */
  bow: 0.12, easeRate: 8,
  /** Screen px kept for the branch legend at the top of the view; the tree pans below it (TB-117). */
  legendH: 34,
  /** Arcane tree (TB-163): wood width = woodBase + woodPerNode × √(nodes it carries); growth rate of a newly bought link (1/s);
   *  sparkle speed along grown wood (laps/s); how far up a trunk node's upward links run before they bend out (fraction). */
  woodBase: 1.5, woodPerNode: 1.7, growRate: 2.5, sparkSpeed: 0.3, trunkRise: 0.6 } as const;

export const BRANCH_COLOR: Readonly<Record<Branch, string>> = { Bow: '#cdbdea', Companions: '#e2a85b', Armoury: '#c76f6f', Grove: '#9fc48f', Barricade: '#c9a06a', Vanguard: '#8fb7c9', Spoils: '#e8d9a0' };
/** What the player reads for each branch; the Branch values stay as code names. */
export const BRANCH_LABEL: Readonly<Record<Branch, string>> = { Bow: 'Bow', Companions: 'Companions', Armoury: 'Armoury', Grove: 'Grove', Barricade: 'Barricade', Vanguard: 'Vanguard', Spoils: 'Spoils' };
