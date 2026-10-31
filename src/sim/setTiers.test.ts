import { describe, expect, it } from 'vitest';
import { freshLoot, Item } from '../data/loot';
import { setTiers } from './gear';
import { pickUp } from './loot';

const piece = (uid: string, slot: Item['slot']): Item => ({ uid, base: 'x', slot, rarity: 'rare', ilvl: 1, affixes: [], set: 'packlord' });

describe('set tiers (TB-105 leaf ring)', () => {
  it('counts each 2/4/6 threshold reached, Set Resonance included', () => {
    const l = freshLoot();
    expect(setTiers(l)).toBe(0);
    (['bow', 'quiver', 'bracer'] as const).forEach((sl, i) => pickUp(l, piece(`p${i}`, sl), 'player'));
    expect(setTiers(l)).toBe(1);
    expect(setTiers(l, 1)).toBe(2);
    expect(setTiers(l, 3)).toBe(3);
  });
});
