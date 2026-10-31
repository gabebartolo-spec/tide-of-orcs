import { describe, expect, it } from 'vitest';
import { freshLoot } from '../data/loot';
import { createRng } from './rng';
import { rollDrop } from './lootRoll';
import { equip, equippedItems, itemScore, pickUp, salvage, setFilter, toggleLock } from './loot';

const fill = (policy: 'greedy' | 'hoarder') => {
  const r = createRng(9), l = freshLoot();
  for (let i = 0; i < 400; i++) pickUp(l, rollDrop(r, l, 'boss', 20, 0, { itemFind: 0, luck: 0 })!, policy);
  return l;
};

describe('equip policies (TB-093)', () => {
  it('greedy wears the best item per slot and keeps the satchel small', () => {
    const l = fill('greedy');
    for (const e of equippedItems(l)) for (const x of l.items) if (x.slot === e.slot) expect(itemScore(x)).toBeLessThanOrEqual(itemScore(e));
    expect(l.glimmer).toBeGreaterThan(0);
  });
  it('hoarder fills to the cap and never salvages what it wears', () => {
    const l = fill('hoarder');
    // set pieces and mythics are never auto-salvaged, so only plain items are held to the cap
    expect(l.items.filter((x) => !x.set && !x.mythic).length).toBeLessThanOrEqual(40); expect(l.items.length).toBeGreaterThanOrEqual(40);
    for (const uid of Object.values(l.equipped)) expect(l.items.some((x) => x.uid === uid)).toBe(true);
  });
});

describe('satchel intents (TB-096)', () => {
  it('equip swaps the slot; worn and locked items cannot be salvaged', () => {
    const l = fill('hoarder'), worn = equippedItems(l)[0]!;
    const spare = l.items.find((x) => x.slot === worn.slot && x.uid !== worn.uid)!;
    expect(equip(l, spare.uid)).toBe(true); expect(l.equipped[worn.slot]).toBe(spare.uid); expect(equip(l, spare.uid)).toBe(false);
    expect(salvage(l, spare.uid)).toBe(false);
    expect(toggleLock(l, worn.uid)).toBe(true); expect(salvage(l, worn.uid)).toBe(false);
    toggleLock(l, worn.uid); const g = l.glimmer; expect(salvage(l, worn.uid)).toBe(true); expect(l.glimmer).toBeGreaterThan(g);
  });
  it('the player filter auto-salvages below it but keeps set pieces and mythics', () => {
    const r = createRng(11), l = freshLoot(); setFilter(l, 'legendary');
    for (let i = 0; i < 300; i++) pickUp(l, rollDrop(r, l, 'boss', 20, 0, { itemFind: 0, luck: 0 })!, 'player');
    for (const x of l.items) expect(x.rarity === 'legendary' || x.rarity === 'mythic' || !!x.set).toBe(true);
  });
});
