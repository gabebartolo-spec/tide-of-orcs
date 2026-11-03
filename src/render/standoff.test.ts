import { describe, expect, it } from 'vitest';
import { standoffX } from './standoff';
import { FIELD } from '../data/balance';
import { ORC_STANDOFF } from '../data/presentation';

describe('standoffX (TB-214)', () => {
  const r = 24, stop = FIELD.barX + FIELD.barW + r, so = ORC_STANDOFF.boss!;
  it('leaves kinds without a stand-off at their sim x', () => { expect(standoffX('grunt', 200, 12)).toBe(200); });
  it('draws the boss gap radii short of the wall stop when the sim parks him there', () => { expect(standoffX('boss', stop, r)).toBeCloseTo(stop + so.gap * r); });
  it('is continuous where the ramp starts and untouched beyond it', () => {
    expect(standoffX('boss', stop + so.ramp * r, r)).toBeCloseTo(stop + so.ramp * r);
    expect(standoffX('boss', 600, r)).toBe(600);
  });
  it('never moves backwards as he marches in', () => {
    let prev = Infinity;
    for (let x = stop + so.ramp * r + 10; x >= stop; x -= 1) { const d = standoffX('boss', x, r); expect(d).toBeLessThanOrEqual(prev); prev = d; }
  });
});
