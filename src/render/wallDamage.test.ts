import { describe, expect, it } from 'vitest';
import { WALL_DAMAGE as D } from '../data/presentation';
import { WALL_BREAKS, breaksAt } from './wallDamage';

describe('wall damage (TB-238)', () => {
  it('a whole wall has no breaks and a fallen wall has them all', () => {
    expect(breaksAt(1)).toBe(0);
    expect(breaksAt(0)).toBe(D.count);
  });
  it('breaks only grow as health falls, and stay on the visible run', () => {
    let last = 0;
    for (let f = 1; f >= 0; f -= 0.01) { const n = breaksAt(f); expect(n).toBeGreaterThanOrEqual(last); last = n; }
    for (const b of WALL_BREAKS) { expect(b.y).toBeGreaterThanOrEqual(D.yRange[0]); expect(b.y).toBeLessThanOrEqual(D.yRange[1]); }
  });
});
