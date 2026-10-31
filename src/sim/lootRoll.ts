/** Seeded loot rolls (TB-092): drop chance, rarity with pity, item level, affixes. Pure; takes the sim RNG. */
import { OrcKind } from '../data/orcs';
import { Item, LootMeta, RARITIES, Rarity } from '../data/loot';
import { AFFIXES, AffixDef, BASES, DROP, MYTHICS, RARITY, SETS, affixScale } from '../data/lootTables';
import { Rng } from './rng';

export const LOOT_TIER: Record<OrcKind, number> = { grunt: 1, runner: 2, brute: 3, elite: 4, boss: 5 };
/** bump: rarity steps added after the roll (Boss Hoard), never past legendary. */
export interface LootMods { itemFind: number; luck: number; bump?: number }

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

/** No duplicate affixes; at most two arrow-typed, and they share one arrow type. */
export function rollAffixes(rng: Rng, n: number, ilvl: number): Item['affixes'] {
  const chosen: AffixDef[] = [];
  while (chosen.length < n) {
    const arrows = chosen.filter((a) => a.arrow);
    const pool = AFFIXES.filter((a) => !chosen.includes(a) && (!a.arrow || (arrows.length < 2 && (!arrows[0] || arrows[0].arrow === a.arrow))));
    chosen.push(pick(rng, pool));
  }
  const k = affixScale(ilvl);
  return chosen.map((a) => ({ id: a.id, value: Math.round((a.min + (a.max - a.min) * rng.next()) * k * 1e4) / 1e4 }));
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
  const item: Item = { uid: `i${loot.nextUid++}`, base: base.id, slot: base.slot, rarity, ilvl, affixes: rollAffixes(rng, RARITY.affixes[rarity], ilvl) };
  if (myth) item.mythic = myth.id;
  else if (rarity === 'legendary' && rng.next() < 0.5) item.set = pick(rng, SETS).id;
  return item;
}
