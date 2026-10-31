/** Skill tree nodes. Mirrors docs/SKILL-TREE.md exactly. Ids are stable API. */

export type Branch = 'Bow' | 'Companions' | 'Armoury' | 'Grove' | 'Barricade' | 'Vanguard' | 'Spoils';

export type NodeId =
  | 'root' | 'sharp' | 'draw' | 'crit' | 'multi' | 'pierce' | 'moon' | 'wide'
  | 'wolf' | 'fangs' | 'ranger' | 'warden' | 'hawk' | 'treant' | 'bond'
  | 'knives' | 'knifespd' | 'fire' | 'storm' | 'ballista' | 'bolt'
  | 'glean' | 'horde' | 'drums'
  | 'runners' | 'runfury' | 'runswarm' | 'brutes' | 'brutefury' | 'bruteswarm'
  | 'elites' | 'elitefury' | 'eliteswarm'
  | 'timber' | 'repair' | 'spikes' | 'bulwark'
  | 'muster' | 'shield' | 'drill' | 'ranks' | 'mend' | 'champion'
  | 'hunter' | 'scavenger' | 'trophy' | 'sharpeyes' | 'hoard' | 'resonance' | 'echo';

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
  n('root', 'Waking', 'Grove', null, 1, 0, 1, 380, 600, 'An elf, a bow, a wall of timber, an endless tide. Begin.'),
  n('sharp', 'Sharpened Tips', 'Bow', 'root', 10, 12, 1.55, 280, 480, '+25% arrow damage per rank.'),
  n('draw', 'Quick Draw', 'Bow', 'sharp', 8, 30, 1.7, 200, 420, '+15% draw speed per rank.'),
  n('wide', 'Wide Volley', 'Bow', 'sharp', 5, 40, 1.8, 335, 455, 'Your arrow strikes a circle 20% wider per rank.'),
  n('crit', 'Keen Eye', 'Bow', 'sharp', 5, 120, 2.1, 320, 400, '+8% chance per rank to strike for triple damage.'),
  n('multi', 'Split Shot', 'Bow', 'draw', 3, 220, 4.2, 140, 350, '+1 extra arrow lands inside the circle with each shot.'),
  n('pierce', 'Longshaft', 'Bow', 'crit', 3, 260, 3.8, 280, 330, 'Each shot strikes the ground +1 more time per rank.'),
  n('moon', 'Moonbow', 'Bow', 'multi', 1, 3200, 1, 90, 270, 'Your circle settles onto the nearest orc, and arrows deal +60% damage.'),
  n('wolf', 'Grey Wolf', 'Companions', 'root', 1, 70, 1, 380, 500, 'A wolf runs the plain and savages the nearest orc.'),
  n('fangs', 'Fangs', 'Companions', 'wolf', 5, 90, 1.9, 430, 430, 'Wolf bites +40% harder per rank.'),
  n('ranger', 'Ranger', 'Companions', 'wolf', 1, 350, 1, 360, 360, 'A second archer joins you behind the wall.'),
  n('warden', 'Warden', 'Companions', 'ranger', 1, 2800, 1, 370, 280, 'A third archer, veteran of older wars.'),
  n('hawk', 'Hawk', 'Companions', 'fangs', 1, 900, 1, 470, 350, 'A hawk dives on the thickest knot of orcs every few seconds.'),
  n('treant', 'Treant', 'Companions', 'hawk', 1, 1400, 1, 500, 270, 'An old treant roots itself before the wall and stamps the ground.'),
  n('bond', 'Kinship', 'Companions', 'ranger', 5, 500, 2.2, 290, 240, 'All companions and vanguard +20% damage per rank.'),
  n('knives', 'Throwing Knives', 'Armoury', 'root', 1, 100, 1, 490, 520, 'A knife flies at the nearest orc every 1.4 s.'),
  n('knifespd', 'Nimble Wrist', 'Armoury', 'knives', 5, 140, 1.9, 570, 470, 'Knives fly 20% faster per rank and hit harder.'),
  n('fire', 'Fire Arrows', 'Armoury', 'knives', 1, 450, 1, 550, 390, 'Arrows set orcs alight, burning for a few seconds.'),
  n('storm', 'Storm Glade', 'Armoury', 'fire', 1, 1700, 1, 630, 330, 'Lightning leaps between up to 5 orcs every 6 s.'),
  n('ballista', 'Ballista', 'Armoury', 'knifespd', 1, 3400, 1, 660, 430, 'A heavy bolt that punches through the whole line.'),
  n('bolt', 'Iron Bolts', 'Armoury', 'ballista', 5, 2000, 2.0, 710, 360, 'Ballista +50% damage per rank.'),
  n('glean', 'Gleaning', 'Grove', 'root', 10, 20, 1.6, 490, 630, '+15% starlight from every orc.'),
  n('horde', 'Call the Horde', 'Grove', 'glean', 5, 160, 2.4, 590, 610, 'Grunts march 20% more often per rank. More orcs, more starlight. More danger.'),
  n('drums', 'War Drums', 'Grove', 'horde', 5, 300, 2.4, 700, 650, 'Grunts have +30% health and drop +40% starlight per rank.'),
  n('runners', 'Goblin Runners', 'Grove', 'horde', 1, 120, 1, 410, 720, 'Small, fast orcs join the tide.'),
  n('runfury', 'Runner Fury', 'Grove', 'runners', 5, 200, 2.4, 410, 790, 'Runners have +30% health and drop +40% starlight per rank.'),
  n('runswarm', 'Runner Swarm', 'Grove', 'runners', 5, 200, 2.4, 410, 850, 'Runners march 20% more often per rank.'),
  n('brutes', 'Brutes', 'Grove', 'runners', 1, 400, 1, 510, 720, 'Slow, hulking orcs join the tide.'),
  n('brutefury', 'Brute Fury', 'Grove', 'brutes', 5, 600, 2.4, 510, 790, 'Brutes have +30% health and drop +40% starlight per rank.'),
  n('bruteswarm', 'Brute Swarm', 'Grove', 'brutes', 5, 600, 2.4, 510, 850, 'Brutes march 20% more often per rank.'),
  n('elites', 'Blackguard', 'Grove', 'brutes', 1, 1500, 1, 610, 720, 'Armoured elite orcs join the tide.'),
  n('elitefury', 'Elite Fury', 'Grove', 'elites', 5, 2000, 2.4, 610, 790, 'Elites have +30% health and drop +40% starlight per rank.'),
  n('eliteswarm', 'Elite Swarm', 'Grove', 'elites', 5, 2000, 2.4, 610, 850, 'Elites march 20% more often per rank.'),
  n('timber', 'Seasoned Timber', 'Barricade', 'root', 10, 25, 1.6, 270, 630, 'Barricade +25% health per rank.'),
  n('repair', 'Patient Hands', 'Barricade', 'timber', 5, 90, 2.0, 170, 610, 'Barricade mends 1% of its health per second per rank.'),
  n('spikes', 'Thornwall', 'Barricade', 'timber', 5, 150, 2.1, 190, 665, 'Orcs hacking at the wall take 20% of your arrow damage per second per rank.'),
  n('bulwark', 'Deep Roots', 'Barricade', 'repair', 1, 2400, 1, 80, 585, 'Once per run, a falling barricade regrows to half health.'),
  n('muster', 'Muster', 'Vanguard', 'root', 1, 50, 1, 250, 555, 'Rally spearmen with starlight. They hold the line until they fall. Up to 2 at once.'),
  n('shield', 'Shieldwall', 'Vanguard', 'muster', 5, 110, 1.9, 160, 535, 'Vanguard +30% health per rank.'),
  n('drill', 'Spear Drill', 'Vanguard', 'muster', 5, 130, 1.9, 150, 475, 'Vanguard +30% damage per rank.'),
  n('ranks', 'Close Ranks', 'Vanguard', 'shield', 3, 400, 2.6, 80, 525, '+1 vanguard may stand at once.'),
  n('mend', 'Field Mending', 'Vanguard', 'drill', 3, 350, 2.4, 90, 455, 'Vanguard recover 3% health per second per rank.'),
  n('champion', 'Bladedancer', 'Vanguard', 'ranks', 1, 2200, 1, 60, 400, 'Rally bladedancers: costlier, faster, their strikes cleave every orc in reach.'),
  // Spoils (TB-101): loot inside a run; costs proposed in BALANCE P-101
  n('hunter', "Hunter's Eye", 'Spoils', 'root', 1, 120, 1, 300, 720, '+5% chance to strike for triple damage.'),
  n('scavenger', 'Scavenger', 'Spoils', 'hunter', 1, 150, 1, 220, 760, 'Salvage gives 50% more Glimmer this run.'),
  n('trophy', 'Trophy', 'Spoils', 'hunter', 1, 200, 1, 310, 800, 'Kills on waves 10, 20, 30… roll a second drop.'),
  n('sharpeyes', 'Sharp Eyes', 'Spoils', 'scavenger', 1, 600, 1, 160, 820, 'Item Find +10% this run.'),
  n('hoard', 'Boss Hoard', 'Spoils', 'trophy', 1, 900, 1, 300, 870, 'Boss drops roll one rarity higher, up to legendary.'),
  n('resonance', 'Set Resonance', 'Spoils', 'sharpeyes', 1, 4000, 1, 200, 890, 'Every set you wear counts one piece more.'),
  n('echo', 'Mythic Echo', 'Spoils', 'resonance', 1, 6000, 1, 110, 880, 'Your mythic power triggers 25% more often, or lasts 25% longer.'),
];

export const NODE: Readonly<Record<NodeId, SkillNode>> = Object.fromEntries(NODES.map((x) => [x.id, x])) as Record<NodeId, SkillNode>;

export const TREE_CANVAS = { w: 760, h: 920 } as const;
/** Tree view: opening zoom and focus (the root), zoom range as multiples of fit-to-width, wheel step, px of movement before a press becomes a drag. */
export const TREE_VIEW = { startZoom: 1, focusX: 380, focusY: 600, minZoom: 0.6, maxZoom: 3, wheelStep: 1.15, dragPx: 6, hitR: 20,
  /** Branch line bow as a fraction of its length; camera ease rate toward the selected node (1/s). */
  bow: 0.12, easeRate: 8 } as const;

export const BRANCH_COLOR: Readonly<Record<Branch, string>> = { Bow: '#cdbdea', Companions: '#e2a85b', Armoury: '#c76f6f', Grove: '#9fc48f', Barricade: '#c9a06a', Vanguard: '#8fb7c9', Spoils: '#e8d9a0' };
