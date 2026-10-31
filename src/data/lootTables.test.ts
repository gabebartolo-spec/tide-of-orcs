import { describe, expect, it } from 'vitest';
import { SLOTS } from './loot';
import { AFFIXES, BASES, MYTHICS, RARITY, SETS, affixScale } from './lootTables';

describe('loot tables (TB-091)', () => {
  it('has 30 unique affixes, 6 arrow-typed, min < max', () => {
    expect(AFFIXES).toHaveLength(30); expect(new Set(AFFIXES.map((a) => a.id)).size).toBe(30);
    expect(AFFIXES.filter((a) => a.arrow)).toHaveLength(6);
    for (const a of AFFIXES) expect(a.min).toBeLessThan(a.max);
  });
  it('has 24 bases, four per slot, unique ids', () => {
    expect(BASES).toHaveLength(24); expect(new Set(BASES.map((b) => b.id)).size).toBe(24);
    for (const s of SLOTS) expect(BASES.filter((b) => b.slot === s)).toHaveLength(4);
  });
  it('has 7 sets with rising bonuses and 8 mythics', () => {
    expect(SETS).toHaveLength(7); expect(MYTHICS).toHaveLength(8);
    for (const s of SETS) expect(s.bonus[2][0]!.value).toBeLessThan(s.bonus[6][0]!.value);
  });
  it('weights sum to 100 and bosses never drop commons', () => {
    const w = Object.values(RARITY.weights);
    expect(w.reduce((a, x) => a + x[0], 0)).toBeCloseTo(100); expect(w.reduce((a, x) => a + x[1], 0)).toBeCloseTo(100);
    expect(RARITY.weights.common[1]).toBe(0);
  });
  it('affix ranges scale 1 + 0.03 × ilvl', () => { expect(affixScale(0)).toBe(1); expect(affixScale(20)).toBeCloseTo(1.6); });
});
