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
/** Spoils branch (TB-101), BALANCE P-101. trophyEvery: waves whose kills roll twice; echo: mythic power ×1.25 more often or longer. */
export const SPOILS_FX = { hunterCrit: 0.05, scavenger: 1.5, trophyEvery: 10, sharpFind: 0.1, resonance: 1, echo: 1.25 } as const;
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
/** Set effect numbers (TB-099, BALANCE ## Proposed P-099). Field distances are in field px (~20 px per metre). */
export const SET_FX = {
  knifeRate: 0.25, bleedAmp: 0.3, bleedSecs: 3, fanEvery: 3, fanKnives: 5, fanRad: 0.18,
  burn: 0.3, burnSpread: 2, spreadReach: 90, cinderSecs: 4, slow: 0.25,
  chain: 1, chainReach: 0.5, rebound: 3, stormRate: 0.3,
  ballRate: 0.25, boltFirst: 0.5, boltShove: 30, pinSecs: 2, pinMult: 2,
  moonRate: 0.25, moonCritMult: 1.5, wellSecs: 3, wellHeal: 0.02,
  petDmg: 0.2, petHaste: 0.25, nearWall: 220, extraWolves: 1, rootSecs: 1.5,
  barMax: 0.15, barRegen: 0.005, freeRallyBelow: 0.25, freeRallySecs: 10,
  /** Most Cinderground patches and Moonwells alive at once. */
  zoneCap: 48,
} as const;

const F = SET_FX;
const on = (stat: string, value = 1): StatLine => ({ stat, op: 'add', value });
const mul = (stat: string, value: number): StatLine => ({ stat, op: 'mul', value });
/** Each line names the Stats field it changes; systems read those fields, never set ids. */
export const SETS: readonly SetDef[] = [
  { id: 'nightknife', name: 'Nightknife', bonus: { 2: [mul('knifeRate', F.knifeRate)], 4: [on('bleedAmp', F.bleedAmp)], 6: [on('knifeFan')] } },
  { id: 'emberwright', name: 'Emberwright', bonus: { 2: [mul('burn', F.burn)], 4: [on('burnSpread', F.burnSpread)], 6: [on('cinder')] } },
  { id: 'stormcaller', name: 'Stormcaller', bonus: { 2: [on('chain', F.chain)], 4: [mul('chainJump', F.chainReach)], 6: [on('rebound', F.rebound), mul('stormRate', F.stormRate)] } },
  { id: 'siegebreaker', name: 'Siegebreaker', bonus: { 2: [mul('ballRate', F.ballRate)], 4: [on('boltShove')], 6: [on('boltPin')] } },
  { id: 'moonveil', name: 'Moonveil', bonus: { 2: [mul('moonRate', F.moonRate)], 4: [on('moonCrit')], 6: [on('moonwell')] } },
  { id: 'packlord', name: 'Packlord', bonus: { 2: [mul('petDmg', F.petDmg)], 4: [on('petHaste', F.petHaste)], 6: [on('extraWolves', F.extraWolves), on('treantRoot')] } },
  { id: 'rootwarden', name: 'Rootwarden', bonus: { 2: [mul('barMax', F.barMax)], 4: [on('barRegen', F.barRegen)], 6: [on('freeRally')] } },
];

/** Mythics: one power and one cost each (powers wired in TB-100). */
/** A mythic's power switches on a Stats field through `lines`, as set bonuses do (TB-100); its numbers live in MYTHIC_FX. */
export interface MythicDef { id: string; name: string; slot: Slot; lines: StatLine[] }
export const MYTHICS: readonly MythicDef[] = [
  { id: 'last-knife', name: 'The Last Knife', slot: 'bow', lines: [on('knifeReturn')] },
  { id: 'heart-of-kiln', name: 'Heart of the Kiln', slot: 'quiver', lines: [on('burnRamp')] },
  { id: 'thunders-memory', name: "Thunder's Memory", slot: 'bracer', lines: [on('stormStore')] },
  { id: 'oakspine', name: 'Oakspine', slot: 'bow', lines: [on('stakes')] },
  { id: 'pale-moon', name: 'Sliver of the Pale Moon', slot: 'charm', lines: [on('fullMoon')] },
  { id: 'first-wolf', name: 'The First Wolf', slot: 'boots', lines: [on('petReturn')] },
  { id: 'heartwood-splinter', name: 'Heartwood Splinter', slot: 'charm', lines: [on('wallSplinter')] },
  { id: 'starfall-cloak', name: 'Starfall Cloak', slot: 'cloak', lines: [on('starfall'), on('itemFind', 0.15)] },
];

/** Mythic power numbers (TB-100), proposed in BALANCE P-100. */
export const MYTHIC_FX = {
  knifeBackLife: 3,
  burnRampPerSec: 0.1,
  thunderCharges: 10, thunderMult: 3,
  stakeAfter: 3, stakeSecs: 8, stakeR: 10,
  moonDraw: 0.5, moonCost: 0.02, moonCostFloor: 0.1,
  wolfEvery: 15, wolfStack: 0.25, wolfMax: 4,
  splinterFrac: 0.3, splinterHw: 0.5,
  starfallEvery: 100, starfallCd: 1, starfallMult: 5,
} as const;
