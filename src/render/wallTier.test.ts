import { describe, expect, it } from 'vitest';
import { wallTier } from './wallTier';
import { BARRICADE } from '../data/balance';
import { GROUND } from '../data/presentation';

describe('wallTier (TB-209)', () => {
  const at = (timber: number): number => wallTier(BARRICADE.baseHp * BARRICADE.timberMult ** timber);
  it('steps up with Seasoned Timber ranks alone at 3, 6 and 9', () => {
    expect([0, 2, 3, 5, 6, 8, 9, 10].map(at)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
  it('has a row count and scale for every tier', () => {
    const n = GROUND.wallTiers.at.length + 1;
    expect(GROUND.wallTiers.rows.length).toBe(n);
    expect(GROUND.wallTiers.scale.length).toBe(n);
  });
});
