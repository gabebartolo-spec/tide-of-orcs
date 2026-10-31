import { describe, expect, it } from 'vitest';
import { freshLoot } from '../data/loot';
import { createRng } from './rng';
import { rollDrop } from './lootRoll';
import { equippedItems, itemScore, pickUp } from './loot';

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
    expect(l.items.length).toBe(40);
    for (const uid of Object.values(l.equipped)) expect(l.items.some((x) => x.uid === uid)).toBe(true);
  });
});
