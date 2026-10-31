import { describe, expect, it } from 'vitest';
import { Item } from '../data/loot';
import { noteDrop } from './loot';
import { freshRun } from './state';

const item = (rarity: Item['rarity'], v = 0.1): Item => ({ uid: rarity + v, base: 'x', slot: 'bow', rarity, ilvl: 10, affixes: [{ id: 'sharp', value: v }] });

describe('run summary loot (TB-103)', () => {
  it('counts drops by rarity and keeps the rarest, then the highest score', () => {
    const r = freshRun();
    expect(r.found).toBeUndefined(); expect(r.best).toBeUndefined();
    noteDrop(r, item('rare')); noteDrop(r, item('epic', 0.1)); noteDrop(r, item('common')); noteDrop(r, item('epic', 0.3)); noteDrop(r, item('rare', 0.9));
    expect(r.found).toEqual({ rare: 2, epic: 2, common: 1 });
    expect(r.best!.uid).toBe('epic0.3');
  });
  it('keeps a copy, so salvaging or rerolling the item later does not change it', () => {
    const r = freshRun(), it = item('legendary'); noteDrop(r, it);
    it.affixes[0]!.value = 9; expect(r.best!.affixes[0]!.value).toBe(0.1);
  });
});
