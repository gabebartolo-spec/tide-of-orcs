import { describe, expect, it } from 'vitest';
import { WALL_LINE } from '../data/balance';
import { wallX } from './wallLine';

describe('wall line (TB-238)', () => {
  it('runs from the ground line at the near edge, further right toward the forest', () => {
    expect(wallX(WALL_LINE.baseY)).toBe(WALL_LINE.baseX + WALL_LINE.front);
    expect(wallX(WALL_LINE.baseY - 100)).toBeCloseTo(wallX(WALL_LINE.baseY) + 100 * WALL_LINE.slope);
  });
});
