/** Loot tables (TB-091): rarity weights, drop constants, affixes, bases, sets, mythics. Numbers mirror BALANCE §Loot. */
import { Rarity, Slot } from './loot';

/** Rarity weights (normal / boss) and affix counts. Each weight is shifted by (1+luck)^rank and (1 + tierShift·(lootTier−1))^rank. */
export const RARITY = {
  weights: { common: [70, 0], rare: [25, 40], epic: [4.5, 40], legendary: [0.5, 17], mythic: [0, 3] } as Record<Rarity, [number, number]>,
  affixes: { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 4 } as Record<Rarity, number>,
  tierShift: 0.15,
} as const;
/** P(drop) = min(cap, base · lootTier^tierExp · (1 + itemFind)). Item level = wave, capped at ilvlCap + ilvlPerPrestige × prestiges. */
export const DROP = { base: 0.008, tierExp: 1.5, cap: 0.6, ilvlCap: 20, ilvlPerPrestige: 10, commonsEndAt: 3, raresEndAt: 8, legendaryPity: 0.1, mythicPity: 25 } as const;
/** Rarities that toast when picked up; lower ones arrive quietly (TB-096). */
export const LOOT_TOAST: readonly string[] = ['epic', 'legendary', 'mythic'];
export const SATCHEL = { base: 40, deep: 80, maxArrowAffixes: 2 } as const;
/** Affix ranges grow by 1 + 0.03 × item level. */
export const affixScale = (ilvl: number): number => 1 + 0.03 * ilvl;

export type ArrowType = 'fire' | 'storm' | 'moon';
/** `stat`: the gear stat the affix feeds; `op`: mul (+x as a fraction) or add. */
export interface AffixDef { id: string; stat: string; op: 'mul' | 'add'; min: number; max: number; arrow?: ArrowType }
const A = (id: string, stat: string, op: 'mul' | 'add', min: number, max: number, arrow?: ArrowType): AffixDef => (arrow ? { id, stat, op, min, max, arrow } : { id, stat, op, min, max });
export const AFFIXES: readonly AffixDef[] = [
  A('might', 'dmg', 'mul', 0.04, 0.1), A('haste', 'fireRate', 'mul', 0.03, 0.08), A('reach', 'radius', 'mul', 0.03, 0.07),
  A('keen', 'crit', 'add', 0.01, 0.03), A('pierce', 'pierce', 'add', 0.2, 0.5), A('volley', 'arrows', 'add', 0.1, 0.25),
  A('greed', 'starMult', 'mul', 0.03, 0.08), A('kinship', 'kin', 'mul', 0.04, 0.1), A('packbond', 'wolf', 'mul', 0.05, 0.12),
  A('talons', 'hawkDmg', 'mul', 0.06, 0.14), A('roots', 'treantDmg', 'mul', 0.06, 0.14), A('blades', 'knifeDmg', 'mul', 0.05, 0.12),
  A('ballistae', 'ballista', 'mul', 0.05, 0.12), A('timber', 'barMax', 'mul', 0.04, 0.1), A('sap', 'barRegen', 'mul', 0.05, 0.12),
  A('thorns', 'spikes', 'mul', 0.05, 0.12), A('banner', 'vanDmg', 'mul', 0.05, 0.12), A('mail', 'vanHp', 'mul', 0.05, 0.12),
  A('mending', 'vanMend', 'mul', 0.05, 0.12), A('find', 'itemFind', 'add', 0.03, 0.08), A('luck', 'luck', 'add', 0.02, 0.05),
  A('gleam', 'glimmerMult', 'mul', 0.05, 0.12), A('bossbane', 'bossDmg', 'mul', 0.06, 0.15), A('elitebane', 'eliteDmg', 'mul', 0.05, 0.12),
  A('emberhead', 'fireDmg', 'mul', 0.08, 0.18, 'fire'), A('kindling', 'burnDur', 'mul', 0.08, 0.18, 'fire'),
  A('thunderhead', 'stormDmg', 'mul', 0.08, 0.18, 'storm'), A('chain', 'stormChain', 'add', 0.2, 0.5, 'storm'),
  A('moonhead', 'homingDmg', 'mul', 0.08, 0.18, 'moon'), A('paleglow', 'critDmg', 'mul', 0.08, 0.18, 'moon'),
];

export interface BaseDef { id: string; slot: Slot; name: string }
const B = (slot: Slot, ...names: string[]): BaseDef[] => names.map((name) => ({ id: name.toLowerCase().replace(/[^a-z]+/g, '-'), slot, name }));
export const BASES: readonly BaseDef[] = [
  ...B('bow', 'Ashwood Bow', 'Yew Longbow', 'Hornbow', 'Ironbark Recurve'),
  ...B('quiver', 'Hide Quiver', 'Birch Quiver', 'Woven Quiver', 'Gilded Quiver'),
  ...B('bracer', 'Leather Bracer', 'Bark Bracer', 'Scaled Bracer', 'Silver Bracer'),
  ...B('cloak', 'Moss Cloak', 'Wool Cloak', 'Feather Cloak', 'Dusk Cloak'),
  ...B('boots', 'Soft Boots', 'Root Boots', 'Ranger Boots', 'Windstep Boots'),
  ...B('charm', 'Acorn Charm', 'Bone Charm', 'Amber Charm', 'Star Charm'),
];

export interface StatLine { stat: string; op: 'mul' | 'add'; value: number }
/** Set bonuses at 2, 4 and 6 pieces worn. */
export interface SetDef { id: string; name: string; bonus: Record<2 | 4 | 6, StatLine[]> }
const S = (id: string, name: string, stat: string, v: [number, number, number]): SetDef =>
  ({ id, name, bonus: { 2: [{ stat, op: 'mul', value: v[0] }], 4: [{ stat, op: 'mul', value: v[1] }], 6: [{ stat, op: 'mul', value: v[2] }] } });
export const SETS: readonly SetDef[] = [
  S('nightknife', 'Nightknife', 'knifeDmg', [0.2, 0.5, 1]), S('emberwright', 'Emberwright', 'fireDmg', [0.2, 0.5, 1]),
  S('stormcaller', 'Stormcaller', 'stormDmg', [0.2, 0.5, 1]), S('siegebreaker', 'Siegebreaker', 'ballista', [0.2, 0.5, 1]),
  S('moonveil', 'Moonveil', 'homingDmg', [0.2, 0.5, 1]), S('packlord', 'Packlord', 'wolf', [0.2, 0.5, 1]),
  S('rootwarden', 'Rootwarden', 'barMax', [0.15, 0.4, 0.8]),
];

/** Mythics: one power and one cost each (powers wired in TB-099). */
export interface MythicDef { id: string; name: string; slot: Slot; power: string; cost: string }
export const MYTHICS: readonly MythicDef[] = [
  { id: 'last-knife', name: 'The Last Knife', slot: 'bracer', power: 'knives crit twice', cost: 'knife rate -20%' },
  { id: 'heart-of-kiln', name: 'Heart of the Kiln', slot: 'charm', power: 'burning orcs burst on death', cost: 'arrow damage -10%' },
  { id: 'thunders-memory', name: "Thunder's Memory", slot: 'quiver', power: 'every 5th lob calls the storm', cost: 'radius -10%' },
  { id: 'oakspine', name: 'Oakspine', slot: 'bow', power: 'wall regrowth fires splinters', cost: 'fire rate -15%' },
  { id: 'pale-moon', name: 'Sliver of the Pale Moon', slot: 'bow', power: 'crits pierce everything', cost: 'crit chance halved' },
  { id: 'first-wolf', name: 'The First Wolf', slot: 'cloak', power: 'a second wolf hunts', cost: 'hawk damage -30%' },
  { id: 'heartwood-splinter', name: 'Heartwood Splinter', slot: 'charm', power: 'Heartwood bonus counts double', cost: 'starlight -15%' },
  { id: 'starfall-cloak', name: 'Starfall Cloak', slot: 'cloak', power: 'kills rain starlight on the plain', cost: 'vanguard cap -1' },
];
