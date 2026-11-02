import { describe, expect, it } from 'vitest';
import { FIELD } from '../data/balance';
import { GROUND } from '../data/presentation';
import { layoutGround } from './ground';

describe('ground layout', () => {
  it('is deterministic for a seed', () => {
    expect(layoutGround(7)).toEqual(layoutGround(7));
    expect(layoutGround(7)).not.toEqual(layoutGround(8));
  });
  it('spreads one ground over both sides of the wall, clear of the wall strip (TB-174)', () => {
    const L = layoutGround(), x0 = FIELD.barX + FIELD.barW + GROUND.wallGap, all = [...L.lush, ...L.worn, ...L.bare, ...L.tufts, ...L.rocks, ...L.flowers];
    expect(all.some((d) => d.x < FIELD.barX)).toBe(true);
    for (const d of all) {
      expect(d.x <= FIELD.barX || d.x >= x0).toBe(true); expect(d.x).toBeGreaterThanOrEqual(0); expect(d.x).toBeLessThanOrEqual(FIELD.w);
      expect(d.y).toBeGreaterThanOrEqual(0); expect(d.y).toBeLessThanOrEqual(FIELD.h);
    }
    expect(L.tufts.length).toBeGreaterThan(GROUND.tufts.singles);
  });
});
