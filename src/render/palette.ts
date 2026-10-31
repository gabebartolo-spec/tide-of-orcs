/** Colour tokens. Mirrors docs/ART-STYLE.md. Render code uses these, never hex literals. */
export const P = {
  ink: '#1b2130', ink2: '#242d3f', ink3: '#30394d', line: '#3e4a60',
  cream: '#efe6d2', creamDim: '#b9b09c',
  plain: '#7c9676', plainPatch: '#86a07e', grass: 'rgba(239,230,210,.18)', groveSide: '#9fb391',
  timber: '#8a6a46', timberDark: '#7a5c3c', timberSplinter: '#4e3a28', timberBand: '#5a4634', sand: '#c9b78a',
  amber: '#e2a85b', rose: '#c76f6f', lilac: '#cdbdea',
  orc: '#7f8f52', brute: '#6c7a44', elite: '#4f5a3a', boss: '#9a7a46', tusk: '#39412a',
  elfCloak: '#5f6f8a', archerCloak: '#8b9a7d', wolf: '#9aa3ad', bark: '#5a4634', knife: '#d9d4c3',
  treantTrunk: '#4e5e3f', treantLeaf: '#5f7d53', treantLeaf2: '#6f8f60', sage: '#8fa98a', grove: '#9fc48f',
  hillFar: '#5a7058', hillNear: '#4f644d', plainDusk: '#5f6f72', lamp: 'rgba(226,168,91,.2)', lampClear: 'rgba(226,168,91,0)',
  spear: '#8fb7c9', blade: '#cdbdea',
  bloodOrc: '#7a4a2c', bloodElf: '#6e3a44',
  aimLine: 'rgba(239,230,210,.25)',
  aimFill: 'rgba(239,230,210,.08)',
  wallBar: '#c9a06a', nodeOwned: '#2b3448', nodeLabelLocked: '#6b7383',
  wallShade: 'rgba(20,26,36,.3)', burnGlow: 'rgba(226,168,91,.5)',
  // set-bonus ground (TB-099): Cinderground and Moonwells
  cinder: 'rgba(226,168,91,.22)', cinderEdge: 'rgba(199,111,111,.45)', moonwell: 'rgba(205,189,234,.2)', moonwellEdge: 'rgba(205,189,234,.6)',
  // mythic powers (TB-100): Oakspine's stake, Starfall's beam
  stake: '#8a6a45', starfall: 'rgba(205,189,234,.85)',
  shadow: 'rgba(20,26,36,.25)', dim: 'rgba(27,33,48,.6)', dim45: 'rgba(27,33,48,.45)',
} as const;
