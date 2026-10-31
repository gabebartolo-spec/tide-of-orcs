import { describe, expect, it } from 'vitest';
import { FIELD } from '../data/balance';
import { GROUND } from '../data/presentation';
import { layoutGround } from './ground';

describe('ground layout', () => {
  it('is deterministic for a seed', () => {
    expect(layoutGround(7)).toEqual(layoutGround(7));
    expect(layoutGround(7)).not.toEqual(layoutGround(8));
  });
  it('keeps decoration on the plain, clear of the wall', () => {
    const L = layoutGround(), x0 = FIELD.barX + FIELD.barW + GROUND.wallGap;
    for (const d of [...L.lush, ...L.worn, ...L.bare, ...L.tufts, ...L.rocks]) {
      expect(d.x).toBeGreaterThanOrEqual(x0); expect(d.x).toBeLessThanOrEqual(FIELD.w);
      expect(d.y).toBeGreaterThanOrEqual(0); expect(d.y).toBeLessThanOrEqual(FIELD.h);
    }
    expect(L.tufts.length).toBeGreaterThan(GROUND.tufts.singles);
  });
});
