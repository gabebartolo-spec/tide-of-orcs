import { describe, expect, it } from 'vitest';
import { corpseX, standoffX } from './standoff';
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

describe('corpseX (TB-214)', () => {
  const r = 24, stop = FIELD.barX + FIELD.barW + r, so = ORC_STANDOFF.boss!, x0 = stop + so.gap * r;
  it('starts where the boss fell and ends corpse radii out from the wall stop', () => {
    expect(corpseX('boss', x0, r, 0)).toBeCloseTo(x0);
    expect(corpseX('boss', x0, r, 1)).toBeCloseTo(stop + so.corpse * r);
    expect(corpseX('boss', x0, r, 5)).toBeCloseTo(stop + so.corpse * r);
  });
  it('leaves other kinds and corpses already clear of the wall alone', () => {
    expect(corpseX('grunt', 180, 12, 1)).toBe(180);
    expect(corpseX('boss', 420, r, 1)).toBe(420);
  });
});
