/** Satchel and equip logic (TB-093/094). Pure. Set pieces and mythics are never auto-salvaged. */
import { Item, LootMeta, RARITIES, Rarity, SLOTS } from '../data/loot';
import { REROLL, SATCHEL, affixScale } from '../data/lootTables';
import { rerollAffix } from './lootRoll';
import { Rng } from './rng';

/** player: wear into empty slots only, the player swaps by hand; greedy/hoarder are balance-runner policies. */
export type EquipPolicy = 'player' | 'greedy' | 'hoarder';

/** Rough power: affix values summed, mythics and set pieces weighted up. Used by policies and the balance runner only. */
export const itemScore = (it: Item): number =>
  it.affixes.reduce((a, x) => a + x.value, 0) * (it.mythic ? 1.5 : it.set ? 1.2 : 1);

export const equippedItems = (l: LootMeta): Item[] =>
  SLOTS.map((s) => l.items.find((i) => i.uid === l.equipped[s])).filter((i): i is Item => !!i);

/** Salvage value in Glimmer by rarity rank (1, 2, 4, 8, 16). */
/** Scavenger multiplies it (rounded down), Glimmerwork adds +1 (TB-101). */
export interface SalvageFx { salvageMult: number; salvagePlus: number }
const NO_FX: SalvageFx = { salvageMult: 1, salvagePlus: 0 };
export const salvageGlimmer = (it: Item, fx: SalvageFx = NO_FX): number => Math.floor(2 ** RARITIES.indexOf(it.rarity) * fx.salvageMult) + fx.salvagePlus;

/** Glimmer for the next reroll on `it`: doubles with each one bought, Glimmerwork cuts it (TB-102). */
export const rerollCost = (it: Item, mult = 1): number => Math.max(1, Math.round(REROLL.base * REROLL.growth ** (it.rerolls ?? 0) * mult));

/** Reroll affix `i` of a worn item for Glimmer. Mythics' powers are not affixes and stay. */
export function reroll(l: LootMeta, uid: string, i: number, rng: Rng, mult = 1): boolean {
  const it = l.items.find((x) => x.uid === uid), cost = it ? rerollCost(it, mult) : 0;
  if (!it || !Object.values(l.equipped).includes(uid) || l.glimmer < cost) return false;
  const next = rerollAffix(rng, it, i);
  if (!next) return false;
  it.affixes[i] = next; it.rerolls = (it.rerolls ?? 0) + 1; l.glimmer -= cost;
  return true;
}

export function salvage(l: LootMeta, uid: string, fx: SalvageFx = NO_FX): boolean {
  const i = l.items.findIndex((x) => x.uid === uid);
  const it = l.items[i];
  if (!it || it.locked || Object.values(l.equipped).includes(uid)) return false;
  l.items.splice(i, 1); l.glimmer += salvageGlimmer(it, fx);
  if (l.heirloom === uid) l.heirloom = null;
  return true;
}

/**
 * Take a new item. greedy: equip if it beats the slot, salvage the loser (never set pieces or mythics).
 * hoarder: keep everything, equip upgrades, salvage the weakest unequipped item only when the satchel is full.
 */
/** Count a drop for the run summary and keep a copy if it beats the run's best: higher rarity first, then item score (TB-103). */
export function noteDrop(run: { found?: Partial<Record<Rarity, number>>; best?: Item }, it: Item): void {
  const f = (run.found ??= {}); f[it.rarity] = (f[it.rarity] ?? 0) + 1;
  const b = run.best, d = b ? RARITIES.indexOf(it.rarity) - RARITIES.indexOf(b.rarity) : 1;
  if (d > 0 || (d === 0 && itemScore(it) > itemScore(b!))) run.best = structuredClone(it);
}

export function pickUp(l: LootMeta, it: Item, policy: EquipPolicy, cap: number = SATCHEL.base, fx: SalvageFx = NO_FX): void {
  l.items.push(it);
  const cur = l.items.find((x) => x.uid === l.equipped[it.slot]);
  if (policy === 'player' && it.rarity !== 'mythic' && !it.set && RARITIES.indexOf(it.rarity) < RARITIES.indexOf(l.lootFilter.minRarity)) { l.items.pop(); l.glimmer += salvageGlimmer(it, fx); return; }
  const better = !cur || (policy !== 'player' && itemScore(it) > itemScore(cur));
  if (better) l.equipped[it.slot] = it.uid;
  const loser = better ? cur : it;
  if (policy === 'greedy' && loser && !loser.set && !loser.mythic) salvage(l, loser.uid, fx);
  while (l.items.length > cap) {
    const spare = l.items.filter((x) => !Object.values(l.equipped).includes(x.uid) && !x.locked && x.uid !== l.heirloom && !x.set && !x.mythic).sort((a, b) => itemScore(a) - itemScore(b))[0];
    if (!spare || !salvage(l, spare.uid, fx)) break;
  }
}

/** Player intents (TB-096). Each returns false when nothing changed. */
export function equip(l: LootMeta, uid: string): boolean {
  const it = l.items.find((x) => x.uid === uid);
  if (!it || l.equipped[it.slot] === uid) return false;
  l.equipped[it.slot] = uid;
  return true;
}

export function toggleLock(l: LootMeta, uid: string): boolean {
  const it = l.items.find((x) => x.uid === uid);
  if (!it) return false;
  it.locked = !it.locked;
  return true;
}

/** Heirloom (TB-101): name a worn item, or clear it by naming it again. */
export function toggleHeirloom(l: LootMeta, uid: string): boolean {
  if (!Object.values(l.equipped).includes(uid) && l.heirloom !== uid) return false;
  l.heirloom = l.heirloom === uid ? null : uid;
  return true;
}

/** Each Replant the heirloom gains item levels past the cap; its affixes grow with affixScale. */
export function growHeirloom(l: LootMeta, levels: number): void {
  const it = l.items.find((x) => x.uid === l.heirloom);
  if (!it || levels <= 0) return;
  const k = affixScale(it.ilvl + levels) / affixScale(it.ilvl);
  it.ilvl += levels;
  for (const a of it.affixes) a.value = Math.round(a.value * k * 1e4) / 1e4;
}

export function setFilter(l: LootMeta, minRarity: Rarity): boolean {
  if (l.lootFilter.minRarity === minRarity) return false;
  l.lootFilter.minRarity = minRarity;
  return true;
}
