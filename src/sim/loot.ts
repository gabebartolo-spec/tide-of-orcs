/** Satchel and equip logic (TB-093). Pure. Gear stats feed Stats in TB-094+. */
import { Item, LootMeta, RARITIES, SLOTS } from '../data/loot';
import { SATCHEL } from '../data/lootTables';

export type EquipPolicy = 'greedy' | 'hoarder';

/** Rough power: affix values summed, mythics and set pieces weighted up. Used by policies and the balance runner only. */
export const itemScore = (it: Item): number =>
  it.affixes.reduce((a, x) => a + x.value, 0) * (it.mythic ? 1.5 : it.set ? 1.2 : 1);

export const equippedItems = (l: LootMeta): Item[] =>
  SLOTS.map((s) => l.items.find((i) => i.uid === l.equipped[s])).filter((i): i is Item => !!i);

/** Salvage value in Glimmer by rarity rank (1, 2, 4, 8, 16). */
export const salvageGlimmer = (it: Item): number => 2 ** RARITIES.indexOf(it.rarity);

export function salvage(l: LootMeta, uid: string): boolean {
  const i = l.items.findIndex((x) => x.uid === uid);
  const it = l.items[i];
  if (!it || it.locked || Object.values(l.equipped).includes(uid)) return false;
  l.items.splice(i, 1); l.glimmer += salvageGlimmer(it);
  return true;
}

/**
 * Take a new item. greedy: equip if it beats the slot, salvage the loser (never set pieces or mythics).
 * hoarder: keep everything, equip upgrades, salvage the weakest unequipped item only when the satchel is full.
 */
export function pickUp(l: LootMeta, it: Item, policy: EquipPolicy, cap: number = SATCHEL.base): void {
  l.items.push(it);
  const cur = l.items.find((x) => x.uid === l.equipped[it.slot]);
  const better = !cur || itemScore(it) > itemScore(cur);
  if (better) l.equipped[it.slot] = it.uid;
  const loser = better ? cur : it;
  if (policy === 'greedy' && loser && !loser.set && !loser.mythic) salvage(l, loser.uid);
  while (l.items.length > cap) {
    const spare = l.items.filter((x) => !Object.values(l.equipped).includes(x.uid) && !x.locked).sort((a, b) => itemScore(a) - itemScore(b))[0];
    if (!spare || !salvage(l, spare.uid)) break;
  }
}
