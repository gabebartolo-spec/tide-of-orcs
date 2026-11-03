/** Specialisation paths (TB-193a, docs/plans/specialisation.md). One path per run, picked at Replant and changeable
 *  every run. A path opens its branch of the Grove tree, gives a small starting bonus, and lets its set and mythic drop.
 *  Every number here is BALANCE ## Proposed P-193: placeholder, untuned. */

export type PathId = 'serpent' | 'fox' | 'magpie';
export const PATH_IDS: readonly PathId[] = ['serpent', 'fox', 'magpie'];

export interface PathDef { id: PathId; name: string; focus: string }
export const PATHS: Readonly<Record<PathId, PathDef>> = {
  serpent: { id: 'serpent', name: 'Path of the Serpent', focus: 'Archery: venom, crits and reach' },
  fox: { id: 'fox', name: 'Path of the Fox', focus: 'Vanguard and companions: a cunning pack' },
  magpie: { id: 'magpie', name: 'Path of the Magpie', focus: 'Economy: starlight, loot and Glimmer' },
};

export const isPath = (x: unknown): x is PathId => typeof x === 'string' && (PATH_IDS as readonly string[]).includes(x);

/** P-193 placeholder numbers. Fractions unless named otherwise; seconds as `…Secs`; field px as `…Reach`. */
export const PATH_FX = {
  // starting bonus, free while the path is chosen
  startCrit: 0.05, startFox: 0.1, startStar: 0.1,
  // Serpent nodes: crit chance, crit damage, venom dps (× elf damage per second), venom seconds, Toxin, circle
  coilCrit: 0.04, viperCritx: 0.3, venomDps: 0.5, venomSecs: 3, toxin: 0.3, gazeRadius: 0.08,
  // Fox nodes: vanguard and companion damage, vanguard health, faster return (×(1 − cut) per rank), +vanguard, companion rate
  denDmg: 0.15, hideHp: 0.2, returnCut: 0.12, packCap: 1, cunningRate: 0.1,
  // Magpie nodes: starlight, item find, luck, reroll cost cut, salvage Glimmer
  magpieStar: 0.1, glitterFind: 0.05, trinketLuck: 0.03, haggleCut: 0.1, shinyGlimmer: 0.2,
  // Serpent's Coil set: +crit; crits poison (dps as venomDps); 6: a poisoned orc that dies bursts for burst × elf damage
  setCrit: 0.05, setVenom: 0.5, burst: 1, burstReach: 60,
  // Foxfire Pack set: +damage; fallen vanguard return faster; vanguard damage per companion in the field
  setFoxDmg: 0.15, setReturn: 0.3, packBuff: 0.1,
  // Magpie's Hoard set: +starlight; a kill's chance of a bonus shard worth shardMult × its starlight; every Nth drop one rarity up
  setStar: 0.15, shardP: 0.1, shardMult: 2, hoardEvery: 5,
  // Fang of the Coiled Serpent: every Nth shot is a venom arrow that splits into 1 + fangSplit; its venom dps
  fangEvery: 5, fangSplit: 2, fangVenom: 0.5,
  // Foxfire Tail: a spectral fox biting for foxMult × elf damage, +foxGrow per companion
  foxMult: 0.5, foxGrow: 0.25,
  // The Magpie's Talon: an arrow kill steals talonStar × its starlight more, and has talonDrop chance of an extra drop roll
  talonStar: 1, talonDrop: 0.02,
} as const;
