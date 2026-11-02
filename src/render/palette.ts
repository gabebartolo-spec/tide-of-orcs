/** Colour tokens. Mirrors docs/ART-STYLE.md. Render code uses these, never hex literals. */
export const P = {
  /** Canvas default shadowColor, restored by hand after a glow (TB-183). */
  noShadow: 'rgba(0, 0, 0, 0)',
  ink: '#161d15', ink2: '#1f281d', ink3: '#2a3527', line: '#3b4a37',
  cream: '#efe6d2', creamDim: '#b9b09c', text: '#ecdcb4', textDim: '#d2bd92',
  plain: '#7c9676', plainPatch: '#86a07e', plainLush: '#728d6c', plainWorn: '#8e9a72', plainBare: '#a09c80',
  plainSun: '#8eab7b',
  // meadow flowers (TB-166): petals and hearts
  daisy: '#f6f2e4', violet: '#9b7fd0', buttercup: '#f2c64c', blossom: '#e9a0bb', flowerHeart: '#e8b84a', flowerHeartPale: '#f6e7a8',
  // ambience (TB-166): fairy motes
  mote: '#d6efff', moteGlow: 'rgba(150,205,255,.28)',
  tuft: '#5e7858', tuftLight: '#a3b993', rock: '#8f9597', rockLight: '#b7bbb6',
  timber: '#8a6a46', timberDark: '#7a5c3c', timberSplinter: '#4e3a28', timberBand: '#5a4634', sand: '#c9b78a',
  amber: '#e2a85b', rose: '#c76f6f', lilac: '#cdbdea',
  orc: '#7f8f52', brute: '#6c7a44', elite: '#4f5a3a', boss: '#9a7a46', tusk: '#39412a',
  elfCloak: '#5f6f8a', archerCloak: '#8b9a7d', wolf: '#9aa3ad', bark: '#5a4634', knife: '#d9d4c3',
  treantTrunk: '#4e5e3f', treantLeaf: '#5f7d53', treantLeaf2: '#6f8f60', sage: '#8fa98a', grove: '#9fc48f',
  hillFar: '#5a7058', hillNear: '#4f644d', lamp: 'rgba(226,168,91,.2)', lampClear: 'rgba(226,168,91,0)',
  frost: '#bfe3ee', frostGlow: 'rgba(191,227,238,.45)', spark: '#f4eaa6', arcane: '#9b6bd6', arcaneCore: '#ece8ff',
  fire: '#f2763a', fireTint: 'rgba(242,118,58,.5)', firePatch: 'rgba(242,118,58,.28)', frostTint: 'rgba(150,215,240,.6)', frostPatch: 'rgba(191,227,238,.35)',
  sparkGlow: 'rgba(244,234,166,.65)', arcaneGlow: 'rgba(155,107,214,.45)', starGold: '#ffd36b',
  /** Shaman fireball (TB-127): ember body, pale core, halo. */
  ember: '#ffb061', fireCore: '#fff1c8', fireGlow: 'rgba(242,118,58,.55)',
  spear: '#8fb7c9', blade: '#cdbdea',
  bloodOrc: '#7a4a2c', bloodElf: '#6e3a44',
  aimLine: 'rgba(239,230,210,.25)',
  aimFill: 'rgba(239,230,210,.08)',
  wallBar: '#c9a06a', nodeOwned: '#2b3448', nodeLabelLocked: '#a8997a',
  // arcane tree (TB-163): bark, its lit edge, the glow round grown wood
  treeWood: '#5c4630', treeWoodLit: '#9a7650', treeGlow: 'rgba(205,189,234,.22)',
  // skill-tree light (TB-190b): white-hot core and pulse heads, the still line of a locked link, the clear end of a glow gradient
  lightHot: '#fff8ec', linkDim: 'rgba(205,189,234,.26)', glowClear: 'rgba(0,0,0,0)',
  wallShade: 'rgba(18,24,16,.3)', burnGlow: 'rgba(226,168,91,.5)',
  // set-bonus ground (TB-099): Cinderground and Moonwells
  cinder: 'rgba(226,168,91,.22)', cinderEdge: 'rgba(199,111,111,.45)', moonwell: 'rgba(205,189,234,.2)', moonwellEdge: 'rgba(205,189,234,.6)',
  // mythic powers (TB-100): Oakspine's stake, Starfall's beam
  stake: '#8a6a45', starfall: 'rgba(205,189,234,.85)',
  shadow: 'rgba(18,24,16,.25)', dim: 'rgba(22,29,21,.6)', dim45: 'rgba(22,29,21,.45)',
} as const;

/** Skill-tree light per branch (TB-190b): the saturated glow colour of owned links, their bloom, motes and light pools. */
export const BRANCH_LIGHT: Readonly<Record<'Bow' | 'Companions' | 'Armoury' | 'Grove' | 'Barricade' | 'Vanguard' | 'Spoils', string>> = {
  Bow: '#b98cff', Companions: '#ffb35a', Armoury: '#ff6f5e', Grove: '#8ff07a', Barricade: '#ffc46e', Vanguard: '#6fd2ff', Spoils: '#ffe98a',
};
