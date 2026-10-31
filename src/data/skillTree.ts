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
  | 'muster' | 'shield' | 'drill' | 'ranks' | 'mend' | 'champion'
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
  n('root', 'Fine.', 'Grove', null, 1, 0, 1, 674, 748, 'The elf sighs and picks up the bow.'),
  n('sharp', 'Ouch', 'Bow', 'root', 10, 12, 1.55, 514, 556, '+25% arrow damage per rank.'),
  n('draw', 'Again', 'Bow', 'sharp', 8, 30, 1.7, 386, 460, '+15% draw speed per rank.'),
  n('wide', 'And You', 'Bow', 'sharp', 5, 40, 1.8, 602, 516, 'Your arrow strikes a circle 20% wider per rank.'),
  n('crit', 'That One Hurt', 'Bow', 'sharp', 5, 120, 2.1, 578, 428, '+8% chance per rank to strike for triple damage.'),
  n('multi', "Oh, There's More", 'Bow', 'draw', 3, 220, 4.2, 290, 348, '+1 extra arrow lands inside the circle with each shot.'),
  n('pierce', 'Seconds', 'Bow', 'crit', 3, 260, 3.8, 514, 316, 'Each shot strikes the ground +1 more time per rank.'),
  n('moon', "Don't Run", 'Bow', 'multi', 1, 3200, 1, 210, 220, 'One shot in four is a moon shot: the circle settles onto the nearest orc and strikes +60% harder.'),
  n('bounce', 'Pass It On', 'Bow', 'pierce', 4, 1200, 2.2, 434, 220, 'One shot in four looses a magic bolt that leaps to 2 more orcs, +1 per rank; each leap hits softer.'),
  n('starfall', "It's Raining", 'Bow', 'moon', 1, 6000, 1, 178, 108, 'One shot in ten also rains 8 arrows on orcs across the plain.'),
  n('wolf', 'A Dog', 'Companions', 'root', 1, 70, 1, 674, 588, 'A dog runs the plain and savages the nearest orc.'),
  n('fangs', 'Bad Dog', 'Companions', 'wolf', 5, 90, 1.9, 754, 476, 'Dog bites +40% harder per rank.'),
  n('ranger', 'Plus One', 'Companions', 'wolf', 1, 350, 1, 642, 364, 'A second archer joins you behind the fence.'),
  n('warden', 'Plus Two', 'Companions', 'ranger', 1, 2800, 1, 658, 236, 'A third archer, veteran of older wars.'),
  n('hawk', 'Look Up', 'Companions', 'fangs', 1, 900, 1, 818, 348, 'A hawk dives on the thickest knot of orcs every few seconds.'),
  n('treant', 'Even the Trees', 'Companions', 'hawk', 1, 1400, 1, 866, 220, 'An old treant roots itself before the fence and stamps the ground.'),
  n('bond', 'I Have Friends', 'Companions', 'ranger', 5, 500, 2.2, 530, 172, 'All companions and lads +20% damage per rank.'),
  n('knives', 'Catch', 'Armoury', 'root', 1, 100, 1, 850, 620, 'A knife flies at the nearest orc every 1.4 s.'),
  n('knifespd', 'Keep Up', 'Armoury', 'knives', 5, 140, 1.9, 978, 540, 'Knives fly 20% more often per rank.'),
  n('fire', 'Warm Enough?', 'Armoury', 'knives', 1, 450, 1, 946, 412, 'One shot in four sets orcs alight, burning for a few seconds.'),
  n('storm', 'Weather', 'Armoury', 'fire', 1, 1700, 1, 1074, 316, 'Lightning leaps between up to 5 orcs every 6 s.'),
  n('frost', 'Chilly', 'Armoury', 'fire', 5, 800, 1.9, 962, 268, 'One shot in four chills orcs for 3 s: they move and swing 20% slower, +5% per rank.'),
  n('shatter', 'Bits', 'Armoury', 'frost', 5, 1500, 2.0, 994, 156, 'A chilled orc that dies shatters, striking orcs around it. +40% per rank.'),
  n('shock', 'Tag', 'Armoury', 'storm', 1, 2200, 1, 1186, 252, 'One shot in four looses lightning from your strike to 3 more orcs.'),
  n('stun', 'Sit Down', 'Armoury', 'shock', 3, 3000, 2.2, 1202, 132, 'Shock arrows stun the orcs they strike for half a second, +0.25 s per rank.'),
  n('ballista', 'Overkill', 'Armoury', 'knifespd', 1, 3400, 1, 1122, 476, 'A heavy bolt that punches through the whole line.'),
  n('bolt', 'More Overkill', 'Armoury', 'ballista', 5, 2000, 2.0, 1202, 364, 'Ballista +50% damage per rank.'),
  n('glean', 'Tip Jar', 'Grove', 'root', 10, 20, 1.6, 850, 796, '+15% teeth from every orc.'),
  n('horde', 'Bring Friends', 'Grove', 'glean', 5, 160, 2.4, 1010, 764, 'Grunts march 20% more often per rank. More orcs, more teeth. More danger.'),
  n('drums', 'Eat Something', 'Grove', 'horde', 5, 300, 2.4, 1186, 828, 'Grunts have +30% health and drop +40% teeth per rank.'),
  n('runners', 'Little Ones', 'Grove', 'horde', 1, 120, 1, 722, 940, 'Small, fast orcs join the tide.'),
  n('runfury', 'Fed Little Ones', 'Grove', 'runners', 5, 200, 2.4, 722, 1052, 'Little Ones have +30% health and drop +40% teeth per rank.'),
  n('runswarm', 'More Little Ones', 'Grove', 'runners', 5, 200, 2.4, 722, 1148, 'Little Ones march 20% more often per rank.'),
  n('brutes', 'Lumps', 'Grove', 'runners', 1, 400, 1, 882, 940, 'Slow, heavy orcs join the tide.'),
  n('brutefury', 'Fed Lumps', 'Grove', 'brutes', 5, 600, 2.4, 882, 1052, 'Lumps have +30% health and drop +40% teeth per rank.'),
  n('bruteswarm', 'More Lumps', 'Grove', 'brutes', 5, 600, 2.4, 882, 1148, 'Lumps march 20% more often per rank.'),
  n('elites', 'Fancy Ones', 'Grove', 'brutes', 1, 1500, 1, 1042, 940, 'Armoured orcs join the tide.'),
  n('elitefury', 'Fed Fancy Ones', 'Grove', 'elites', 5, 2000, 2.4, 1042, 1052, 'Fancy Ones have +30% health and drop +40% teeth per rank.'),
  n('eliteswarm', 'More Fancy Ones', 'Grove', 'elites', 5, 2000, 2.4, 1042, 1148, 'Fancy Ones march 20% more often per rank.'),
  n('timber', "It's a Good Fence", 'Barricade', 'root', 10, 25, 1.6, 498, 796, 'Fence +25% health per rank.'),
  n('repair', 'Nails', 'Barricade', 'timber', 5, 90, 2.0, 338, 764, 'Fence mends 1% of its health per second per rank.'),
  n('spikes', 'Mind the Splinters', 'Barricade', 'timber', 5, 150, 2.1, 370, 852, 'Orcs hacking at the fence take 20% of your arrow damage per second per rank.'),
  n('bulwark', 'Not Yet', 'Barricade', 'repair', 1, 2400, 1, 194, 724, 'Once per run, a falling fence regrows to half health.'),
  n('muster', 'Lads', 'Vanguard', 'root', 1, 50, 1, 466, 676, 'Rally lads with teeth. They hold the line until they fall. Up to 2 at once.'),
  n('shield', 'Sturdy Lads', 'Vanguard', 'muster', 5, 110, 1.9, 322, 644, 'Lads +30% health per rank.'),
  n('drill', 'Angry Lads', 'Vanguard', 'muster', 5, 130, 1.9, 306, 548, 'Lads +30% damage per rank.'),
  n('ranks', 'Another Lad', 'Vanguard', 'shield', 3, 400, 2.6, 194, 628, '+1 lad may stand at once.'),
  n('mend', 'Walk It Off', 'Vanguard', 'drill', 3, 350, 2.4, 210, 516, 'Lads recover 3% health per second per rank.'),
  n('champion', 'Show-off', 'Vanguard', 'ranks', 1, 2200, 1, 162, 428, 'Rally show-offs: costlier, faster, their strikes cleave every orc in reach.'),
  // Spoils (TB-101): loot inside a run; costs proposed in BALANCE P-101
  n('hunter', 'Right There', 'Spoils', 'root', 1, 120, 1, 546, 940, '+5% chance to strike for triple damage.'),
  n('scavenger', 'Waste Not', 'Spoils', 'hunter', 1, 150, 1, 418, 1004, 'Salvage gives 50% more Glimmer this run.'),
  n('trophy', 'Souvenir', 'Spoils', 'hunter', 1, 200, 1, 562, 1068, 'Kills on waves 10, 20, 30… roll a second drop.'),
  n('sharpeyes', 'Ooh, Shiny', 'Spoils', 'scavenger', 1, 600, 1, 322, 1100, 'Item Find +10% this run.'),
  n('hoard', 'Expense Account', 'Spoils', 'trophy', 1, 900, 1, 546, 1180, 'Boss drops roll one rarity higher, up to legendary.'),
  n('resonance', 'Coordinated', 'Spoils', 'sharpeyes', 1, 4000, 1, 386, 1212, 'Every set you wear counts one piece more.'),
  n('echo', 'Encore', 'Spoils', 'resonance', 1, 6000, 1, 242, 1196, 'Your mythic power triggers 25% more often, or lasts 25% longer.'),
  // Per-type nodes (TB-111): costs proposed in BALANCE P-111
  n('kindle', 'Hotter', 'Armoury', 'fire', 5, 600, 1.9, 925, 355, 'Burning orcs take +30% burn damage per rank.'),
  n('wildfire', 'Still Burning', 'Armoury', 'fire', 3, 900, 2.2, 1006, 406, 'Burns last 1 s longer per rank.'),
  n('firechance', 'Matches', 'Armoury', 'fire', 5, 500, 1.9, 887, 402, '+15% chance per rank that a shot is a fire arrow.'),
  n('frostchance', 'Draughty', 'Armoury', 'frost', 5, 900, 1.9, 938, 213, '+15% chance per rank that a shot is a frost arrow.'),
  n('static', 'Zap', 'Armoury', 'shock', 5, 2500, 1.9, 1238, 222, 'Shock lightning +30% damage per rank.'),
  n('shockchance', "You're It", 'Armoury', 'shock', 5, 2400, 1.9, 1238, 282, '+15% chance per rank that a shot is a shock arrow.'),
  n('rebdmg', 'Pass It Harder', 'Bow', 'bounce', 5, 1300, 1.9, 396, 174, 'Rebound bolts +30% damage per rank.'),
  n('rebchance', 'Share Nicely', 'Bow', 'bounce', 5, 1300, 1.9, 455, 163, '+15% chance per rank that a shot looses Rebound.'),
  n('moondmg', "Really, Don't", 'Bow', 'moon', 5, 3500, 1.9, 166, 179, 'Moon shots +20% damage per rank.'),
  n('moonreach', 'I Can See You', 'Bow', 'moon', 3, 3500, 2.2, 224, 161, 'Moon shots settle onto orcs 25% farther from your aim per rank.'),
  n('moonchance', 'Moonlighting', 'Bow', 'moon', 5, 3500, 1.9, 153, 237, '+15% chance per rank that a shot is a moon shot.'),
  n('stardmg', 'Pouring', 'Bow', 'starfall', 5, 6500, 1.9, 162, 50, 'Starfall arrows +30% damage per rank.'),
  n('starcount', 'Bucketing Down', 'Bow', 'starfall', 3, 7000, 2.2, 220, 65, '+2 Starfall arrows per rank.'),
  n('starchance', 'Bring a Coat', 'Bow', 'starfall', 5, 6500, 1.9, 120, 93, '+5% chance per rank that a shot calls Starfall.'),
  n('knifedmg', 'Pointy End', 'Armoury', 'knives', 5, 150, 1.9, 910, 613, 'Knives +30% damage per rank.'),
  n('knifefan', 'Catch These', 'Armoury', 'knives', 3, 400, 2.4, 844, 560, '+1 knife per throw per rank.'),
  n('boltpin', 'Stay There', 'Armoury', 'ballista', 3, 2500, 2.2, 1177, 451, 'Every orc a bolt passes through is held still 0.3 s per rank.'),
  n('windlass', 'Wind It Up', 'Armoury', 'ballista', 5, 2200, 1.9, 1171, 511, 'Ballista reload time −10% per rank.'),
  n('deadly', 'That One Hurt More', 'Bow', 'crit', 5, 300, 2.1, 590, 369, 'Your crits strike +50% harder per rank (×3 to start).'),
  n('wolfrate', 'Fetch', 'Companions', 'wolf', 5, 112, 1.9, 732, 572, 'Dog strikes 15% more often per rank.'),
  n('wolfcrit', 'Goes for the Ankles', 'Companions', 'wolf', 5, 128, 2.0, 616, 572, 'Dog bites: +5% chance per rank to crit for double damage.'),
  n('wolfcritx', "Won't Let Go", 'Companions', 'wolfcrit', 5, 160, 2.0, 616, 632, 'Dog crits +50% damage per rank.'),
  n('wolfspd', 'Walkies', 'Companions', 'wolf', 3, 80, 2.0, 717, 630, 'Dog moves 15% faster per rank.'),
  n('rangerdmg', 'Plus One Means It', 'Companions', 'ranger', 5, 420, 1.9, 678, 316, 'Ranger +30% damage per rank.'),
  n('rangerrate', 'Plus One Hurries', 'Companions', 'ranger', 5, 490, 1.9, 702, 371, 'Ranger strikes 15% more often per rank.'),
  n('rangercrit', 'Plus One Aims', 'Companions', 'ranger', 5, 560, 2.0, 580, 317, 'Ranger arrows: +5% chance per rank to crit for double damage.'),
  n('rangercritx', 'Plus One Gloats', 'Companions', 'rangercrit', 5, 700, 2.0, 543, 270, 'Ranger crits +50% damage per rank.'),
  n('wardendmg', 'Plus Two Means It', 'Companions', 'warden', 5, 3360, 1.9, 666, 176, 'Warden +30% damage per rank.'),
  n('wardenrate', 'Plus Two Hurries', 'Companions', 'warden', 5, 3920, 1.9, 713, 212, 'Warden strikes 15% more often per rank.'),
  n('wardencrit', 'Plus Two Aims', 'Companions', 'warden', 5, 4480, 2.0, 610, 199, 'Warden arrows: +5% chance per rank to crit for double damage.'),
  n('wardencritx', 'Plus Two Gloats', 'Companions', 'wardencrit', 5, 5600, 2.0, 587, 144, 'Warden crits +50% damage per rank.'),
  n('hawkdmg', 'Pointy Feet', 'Companions', 'hawk', 5, 1080, 1.9, 868, 315, 'Hawk +30% damage per rank.'),
  n('hawkrate', 'Look Up Again', 'Companions', 'hawk', 5, 1260, 1.9, 799, 291, 'Hawk strikes 15% more often per rank.'),
  n('hawkcrit', 'Right on the Head', 'Companions', 'hawk', 5, 1440, 2.0, 759, 336, 'Hawk dives: +5% chance per rank to crit for double damage.'),
  n('hawkcritx', 'Messy', 'Companions', 'hawkcrit', 5, 1800, 2.0, 726, 286, 'Hawk crits +50% damage per rank.'),
  n('treantdmg', 'Heavy Feet', 'Companions', 'treant', 5, 1680, 1.9, 887, 164, 'Treant +30% damage per rank.'),
  n('treantrate', 'Stomp Stomp', 'Companions', 'treant', 5, 1960, 1.9, 828, 173, 'Treant strikes 15% more often per rank.'),
  n('treantcrit', 'The Tree Is Upset', 'Companions', 'treant', 5, 2240, 2.0, 904, 266, 'Treant stamps: +5% chance per rank to crit for double damage.'),
  n('treantcritx', 'Flat', 'Companions', 'treantcrit', 5, 2800, 2.0, 982, 322, 'Treant crits +50% damage per rank.'),
  n('spearrate', 'Busy Lads', 'Vanguard', 'muster', 5, 168, 1.9, 412, 702, 'Lads strike 15% more often per rank.'),
  n('spearcrit', 'Lucky Lads', 'Vanguard', 'muster', 5, 192, 2.0, 455, 617, 'Lad strikes: +5% chance per rank to crit for double damage.'),
  n('spearcritx', 'Lads Overdo It', 'Vanguard', 'spearcrit', 5, 240, 2.0, 443, 558, 'Lad crits +50% damage per rank.'),
  n('spearspd', 'Hurry Up, Lads', 'Vanguard', 'muster', 3, 120, 2.0, 462, 736, 'Lads move 15% faster per rank.'),
  n('bladedmg', 'Showing Off', 'Vanguard', 'champion', 5, 2640, 1.9, 153, 368, 'Show-offs +30% damage per rank.'),
  n('bladerate', 'Twirls', 'Vanguard', 'champion', 5, 3080, 1.9, 209, 390, 'Show-offs strike 15% more often per rank.'),
  n('bladecrit', 'Look at Me', 'Vanguard', 'champion', 5, 3520, 2.0, 106, 406, 'Show-off strikes: +5% chance per rank to crit for double damage.'),
  n('bladecritx', 'Takes a Bow', 'Vanguard', 'bladecrit', 5, 4400, 2.0, 50, 385, 'Show-off crits +50% damage per rank.'),
  n('bladespd', 'Prances', 'Vanguard', 'champion', 3, 2200, 2.0, 218, 449, 'Show-offs move 15% faster per rank.'),
];

export const NODE: Readonly<Record<NodeId, SkillNode>> = Object.fromEntries(NODES.map((x) => [x.id, x])) as Record<NodeId, SkillNode>;

export const TREE_CANVAS = { w: 1288, h: 1262 } as const;
/** Tree view: opening zoom and focus (the root), zoom range as multiples of fit-to-width, wheel step, px of movement before a press becomes a drag. */
export const TREE_VIEW = { startZoom: 1, focusX: 674, focusY: 748, minZoom: 0.6, maxZoom: 5, wheelStep: 1.15, dragPx: 6, hitR: 20,
  /** Branch line bow as a fraction of its length; camera ease rate toward the selected node (1/s). */
  bow: 0.12, easeRate: 8 } as const;

export const BRANCH_COLOR: Readonly<Record<Branch, string>> = { Bow: '#cdbdea', Companions: '#e2a85b', Armoury: '#c76f6f', Grove: '#9fc48f', Barricade: '#c9a06a', Vanguard: '#8fb7c9', Spoils: '#e8d9a0' };
/** What the player reads for each branch; the Branch values stay as code names. */
export const BRANCH_LABEL: Readonly<Record<Branch, string>> = { Bow: 'Bow', Companions: 'Companions', Armoury: 'Armoury', Grove: 'Grove', Barricade: 'Fence', Vanguard: 'Lads', Spoils: 'Spoils' };
