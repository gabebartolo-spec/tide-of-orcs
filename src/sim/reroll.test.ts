import { describe, expect, it } from 'vitest';
import { Item } from '../data/loot';
import { AFFIXES, REROLL } from '../data/lootTables';
import { freshMeta } from './state';
import { pickUp, reroll, rerollCost } from './loot';
import { createRng } from './rng';

const item = (uid: string, affixes: Item['affixes']): Item => ({ uid, base: 'x', slot: 'bow', rarity: 'epic', ilvl: 10, affixes });
const arrowIds = AFFIXES.filter((a) => a.arrow).map((a) => a.id);

describe('reroll (TB-102)', () => {
  it('costs base × growth^n, cut by Glimmerwork, at least 1', () => {
    const it0 = item('a', []);
    expect(rerollCost(it0)).toBe(REROLL.base);
    expect(rerollCost({ ...it0, rerolls: 3 })).toBe(REROLL.base * REROLL.growth ** 3);
    expect(rerollCost({ ...it0, rerolls: 3 }, 0.6)).toBe(Math.round(REROLL.base * REROLL.growth ** 3 * 0.6));
    expect(rerollCost(it0, 0.01)).toBe(1);
  });
  it('changes one affix of a worn item, spends Glimmer and raises the next cost', () => {
    const l = freshMeta().loot; pickUp(l, item('a', [{ id: 'sharp', value: 0.1 }, { id: AFFIXES[1]!.id, value: 0.1 }]), 'player'); l.glimmer = 10;
    const keep = l.items[0]!.affixes[1];
    expect(reroll(l, 'a', 0, createRng(4))).toBe(true);
    const it = l.items[0]!;
    expect(it.affixes[0]!.id).not.toBe('sharp'); expect(it.affixes[1]).toEqual(keep);
    expect(new Set(it.affixes.map((a) => a.id)).size).toBe(2);
    expect(l.glimmer).toBe(10 - REROLL.base); expect(it.rerolls).toBe(1); expect(rerollCost(it)).toBe(REROLL.base * REROLL.growth);
  });
  it('refuses an unworn item, short Glimmer or a missing affix', () => {
    const l = freshMeta().loot; l.items.push(item('b', [{ id: 'sharp', value: 0.1 }])); l.glimmer = 99;
    expect(reroll(l, 'b', 0, createRng(1))).toBe(false);
    pickUp(l, item('c', [{ id: 'sharp', value: 0.1 }]), 'player'); l.glimmer = 1;
    expect(reroll(l, 'c', 0, createRng(1))).toBe(false); l.glimmer = 99;
    expect(reroll(l, 'c', 5, createRng(1))).toBe(false);
  });
  it('keeps the arrow rule: never a third arrow affix or a second arrow type', () => {
    const l = freshMeta().loot, a = AFFIXES.filter((x) => x.arrow);
    const same = a.filter((x) => x.arrow === a[0]!.arrow);
    pickUp(l, item('d', [{ id: same[0]!.id, value: 0.1 }, { id: (same[1] ?? same[0])!.id, value: 0.1 }, { id: 'sharp', value: 0.1 }]), 'player'); l.glimmer = 1e9;
    const r = createRng(9);
    for (let n = 0; n < 200; n++) {
      reroll(l, 'd', 2, r);
      const arr = l.items[0]!.affixes.filter((x) => arrowIds.includes(x.id)).map((x) => AFFIXES.find((d) => d.id === x.id)!.arrow);
      expect(arr.length).toBeLessThanOrEqual(2); expect(new Set(arr).size).toBeLessThanOrEqual(1);
    }
  });
});
