import { describe, expect, it } from 'vitest';
import { WALL_TIER_RANKS } from '../data/balance';
import { WALL_ART } from '../data/presentation';

describe('wall tiers (TB-209)', () => {
  it('step up at Seasoned Timber ranks 3, 6 and 10, one look per tier', () => {
    expect(WALL_TIER_RANKS).toEqual([3, 6, 10]);
    expect(WALL_ART.map((a) => a.key)).toEqual(['wall0', 'wall1', 'wall2', 'wall3']);
  });
});
