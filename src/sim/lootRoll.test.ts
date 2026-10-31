import { describe, expect, it } from 'vitest';
import { freshLoot } from '../data/loot';
import { AFFIXES, AFFIX_NEEDS } from '../data/lootTables';
import { createRng } from './rng';
import { dropChance, itemLevel, ownedAffixes, rarityWeights, rerollAffix, rollAffixes, rollDrop } from './lootRoll';
import { deriveStats } from './stats';

const mods = { itemFind: 0, luck: 0 };

describe('loot rolls (TB-092)', () => {
  it('drop chance follows the formula and caps at 0.6', () => {
    expect(dropChance(1, 0)).toBeCloseTo(0.008); expect(dropChance(4, 0)).toBeCloseTo(0.064);
    expect(dropChance(5, 100)).toBe(0.6);
  });
  it('item level is the wave, capped by prestige', () => {
    expect(itemLevel(15, 0)).toBe(15); expect(itemLevel(50, 0)).toBe(20); expect(itemLevel(50, 2)).toBe(40);
  });
  it('prestige retires commons then rares', () => {
    expect(rarityWeights(1, 0, 3, false).common).toBe(0); expect(rarityWeights(1, 0, 8, false).rare).toBe(0);
  });
  it('same seed gives the same drops', () => {
    const run = () => { const r = createRng(42), l = freshLoot(); return Array.from({ length: 2000 }, () => rollDrop(r, l, 'elite', 10, 0, mods)); };
    expect(run()).toEqual(run());
  });
  it('affixes never repeat; arrow affixes ≤ 2 and share a type', () => {
    const r = createRng(7);
    for (let i = 0; i < 3000; i++) {
      const a = rollAffixes(r, 4, 10), ids = a.map((x) => x.id);
      expect(new Set(ids).size).toBe(4);
      const types = new Set(ids.map((id) => AFFIXES.find((d) => d.id === id)!.arrow).filter(Boolean));
      expect(ids.filter((id) => AFFIXES.find((d) => d.id === id)!.arrow).length).toBeLessThanOrEqual(2);
      expect(types.size).toBeLessThanOrEqual(1);
    }
  });
  it('a mythic comes by the 25th boss and resets pity', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const r = createRng(seed), l = freshLoot(); let got = 0;
      for (let b = 1; b <= 25 && !got; b++) if (rollDrop(r, l, 'boss', 30, 0, mods)!.rarity === 'mythic') got = b;
      expect(got).toBeGreaterThan(0); expect(l.pity.mythic).toBe(0);
    }
  });
  it('bosses always drop, never common', () => {
    const r = createRng(3), l = freshLoot();
    for (let i = 0; i < 500; i++) expect(rollDrop(r, l, 'boss', 10, 0, mods)!.rarity).not.toBe('common');
  });
});

describe('affix gate (TB-114)', () => {
  const gated = (id: string) => !!AFFIX_NEEDS[id] || !!AFFIXES.find((d) => d.id === id)!.arrow;
  const seen = (has: ReturnType<typeof ownedAffixes>) => { const r = createRng(3), ids = new Set<string>(); for (let i = 0; i < 3000; i++) rollAffixes(r, 4, 10, has).forEach((a) => ids.add(a.id)); return ids; };
  it('a fresh run never rolls affixes for features it does not own', () => {
    const ids = seen(ownedAffixes(deriveStats({}, 0)));
    expect([...ids].filter(gated)).toEqual([]);
    expect(ids.size).toBe(AFFIXES.filter((d) => !gated(d.id)).length);
  });
  it('owning a feature lets its affixes roll', () => {
    const ids = seen(ownedAffixes(deriveStats({ wolf: 1, spikes: 1, fire: 1 }, 0)));
    for (const id of ['packbond', 'kinship', 'thorns', 'emberhead', 'kindling']) expect(ids.has(id)).toBe(true);
    for (const id of ['talons', 'banner', 'thunderhead', 'moonhead']) expect(ids.has(id)).toBe(false);
  });
  it('rerolls obey the gate, and a gated drop keeps it', () => {
    const has = ownedAffixes(deriveStats({}, 0)), r = createRng(9), l = freshLoot();
    const it = { uid: 'x', base: 'ashwood-bow', slot: 'bow' as const, rarity: 'legendary' as const, ilvl: 10, affixes: [{ id: 'packbond', value: 0.1 }, { id: 'might', value: 0.1 }] };
    for (let i = 0; i < 500; i++) expect(gated(rerollAffix(r, it, 0, has)!.id)).toBe(false);
    for (let i = 0; i < 500; i++) { const d = rollDrop(r, l, 'boss', 10, 0, { ...mods, has }); d?.affixes.forEach((a) => expect(gated(a.id)).toBe(false)); }
  });
});
