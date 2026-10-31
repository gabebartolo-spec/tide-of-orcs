/** Seeded loot rolls (TB-092): drop chance, rarity with pity, item level, affixes. Pure; takes the sim RNG. */
import { OrcKind } from '../data/orcs';
import { Item, LootMeta, RARITIES, Rarity } from '../data/loot';
import { AFFIXES, AFFIX_NEEDS, AffixDef, BASES, DROP, Feature, MYTHICS, RARITY, SETS, affixScale } from '../data/lootTables';
import { Rng } from './rng';
import { Stats } from './stats';

export const LOOT_TIER: Record<OrcKind, number> = { grunt: 1, runner: 2, brute: 3, elite: 4, boss: 5 };
/** bump: rarity steps added after the roll (Boss Hoard), never past legendary. has: which affixes may roll (default all). */
export interface LootMods { itemFind: number; luck: number; bump?: number; has?: AffixFilter }
export type AffixFilter = (a: AffixDef) => boolean;

const OWNS: Record<Feature, (st: Stats) => boolean> = {
  companion: (st) => st.wolf > 0 || st.archers > 0 || st.hawk || st.treant || !!st.knives || st.storm || st.ballista > 0,
  wolf: (st) => st.wolf > 0, hawk: (st) => st.hawk, treant: (st) => st.treant, knives: (st) => !!st.knives, ballista: (st) => st.ballista > 0,
  spikes: (st) => st.spikes > 0, vanguard: (st) => st.vanCap > 0, elites: (st) => st.foes.elite.on,
  fire: (st) => st.fire, storm: (st) => st.storm, moon: (st) => st.homing,
};
/** Gate (TB-114): an affix rolls only while the player owns the feature it scales. */
export const ownedAffixes = (st: Stats): AffixFilter => (a) => { const f = AFFIX_NEEDS[a.id] ?? a.arrow; return !f || OWNS[f](st); };
const ALL: AffixFilter = () => true;

export const dropChance = (tier: number, itemFind: number): number => Math.min(DROP.cap, DROP.base * tier ** DROP.tierExp * (1 + itemFind));
export const itemLevel = (wave: number, prestiges: number): number => Math.min(wave, DROP.ilvlCap + DROP.ilvlPerPrestige * prestiges);

/** Shifted rarity weights. Bosses use the boss column and add legendary pity. */
export function rarityWeights(tier: number, luck: number, prestiges: number, boss: boolean, legendaryPity = 0): Record<Rarity, number> {
  const out = {} as Record<Rarity, number>;
  RARITIES.forEach((r, rank) => {
    let w = RARITY.weights[r][boss ? 1 : 0] * (1 + luck) ** rank * (1 + RARITY.tierShift * (tier - 1)) ** rank;
    if (r === 'common' && prestiges >= DROP.commonsEndAt) w = 0;
    if (r === 'rare' && prestiges >= DROP.raresEndAt) w = 0;
    if (r === 'legendary' && boss) w *= 1 + DROP.legendaryPity * legendaryPity;
    out[r] = w;
  });
  return out;
}

function pick<T>(rng: Rng, xs: readonly T[]): T { return xs[Math.floor(rng.next() * xs.length)]!; }

export function rollRarity(rng: Rng, w: Record<Rarity, number>): Rarity {
  const total = RARITIES.reduce((a, r) => a + w[r], 0);
  let x = rng.next() * total;
  for (const r of RARITIES) { x -= w[r]; if (x < 0 && w[r] > 0) return r; }
  return [...RARITIES].reverse().find((r) => w[r] > 0) ?? 'rare';
}

/** Affixes that may join `chosen`: no duplicates; at most two arrow-typed, and they share one arrow type. */
const affixPool = (chosen: AffixDef[], has: AffixFilter): AffixDef[] => {
  const arrows = chosen.filter((a) => a.arrow);
  return AFFIXES.filter((a) => has(a) && !chosen.includes(a) && (!a.arrow || (arrows.length < 2 && (!arrows[0] || arrows[0].arrow === a.arrow))));
};
const rollValue = (rng: Rng, a: AffixDef, ilvl: number): Item['affixes'][number] =>
  ({ id: a.id, value: Math.round((a.min + (a.max - a.min) * rng.next()) * affixScale(ilvl) * 1e4) / 1e4 });

export function rollAffixes(rng: Rng, n: number, ilvl: number, has: AffixFilter = ALL): Item['affixes'] {
  const chosen: AffixDef[] = [];
  while (chosen.length < n) chosen.push(pick(rng, affixPool(chosen, has)));
  return chosen.map((a) => rollValue(rng, a, ilvl));
}

/** Reroll (TB-102): a new affix for slot `i`, never the one it replaces, obeying the same rules as a drop. */
export function rerollAffix(rng: Rng, it: Item, i: number, has: AffixFilter = ALL): Item['affixes'][number] | null {
  const old = it.affixes[i];
  if (!old) return null;
  const others = it.affixes.filter((_, k) => k !== i).map((a) => AFFIXES.find((d) => d.id === a.id)).filter((d): d is AffixDef => !!d);
  const pool = affixPool(others, has).filter((a) => a.id !== old.id);
  return pool.length ? rollValue(rng, pick(rng, pool), it.ilvl) : null;
}

/** Roll one kill. Returns an item or null; updates boss pity and the uid counter. */
export function rollDrop(rng: Rng, loot: LootMeta, kind: OrcKind, wave: number, prestiges: number, mods: LootMods): Item | null {
  const tier = LOOT_TIER[kind], boss = kind === 'boss';
  if (!boss && rng.next() >= dropChance(tier, mods.itemFind)) return null;
  let rarity: Rarity;
  if (boss && loot.pity.mythic + 1 >= DROP.mythicPity) rarity = 'mythic';
  else rarity = rollRarity(rng, rarityWeights(tier, mods.luck, prestiges, boss, loot.pity.legendary));
  if (mods.bump && rarity !== 'mythic') rarity = RARITIES[Math.min(RARITIES.indexOf('legendary'), RARITIES.indexOf(rarity) + mods.bump)]!;
  if (boss) {
    loot.pity.legendary = rarity === 'legendary' || rarity === 'mythic' ? 0 : loot.pity.legendary + 1;
    loot.pity.mythic = rarity === 'mythic' ? 0 : loot.pity.mythic + 1;
  }
  const ilvl = itemLevel(wave, prestiges);
  const myth = rarity === 'mythic' ? pick(rng, MYTHICS) : null;
  const base = pick(rng, myth ? BASES.filter((b) => b.slot === myth.slot) : BASES);
  const item: Item = { uid: `i${loot.nextUid++}`, base: base.id, slot: base.slot, rarity, ilvl, affixes: rollAffixes(rng, RARITY.affixes[rarity], ilvl, mods.has) };
  if (myth) item.mythic = myth.id;
  else if (rarity === 'legendary' && rng.next() < 0.5) item.set = pick(rng, SETS).id;
  return item;
}
