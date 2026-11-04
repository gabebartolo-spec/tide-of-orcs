import { describe, expect, it } from 'vitest';
import { FIELD } from '../data/balance';
import { plainPoint } from './viewMap';

const v = { k: 2, ox: 100, oy: 300 };

describe('plain view mapping (TB-216c)', () => {
  it('maps a point on the plain', () => {
    expect(plainPoint(100 + 2 * 450, 300 + 2 * 240, v, false)).toEqual({ x: 450, y: 240 });
  });
  it('a mouse over the meadow above or beside the plain gives no aim', () => {
    expect(plainPoint(500, 100, v, false)).toBeNull();
    expect(plainPoint(100 + 2 * FIELD.w + 40, 400, v, false)).toBeNull();
  });
  it('a captured finger off the plain clamps to its edge', () => {
    expect(plainPoint(500, 100, v, true)).toEqual({ x: 200, y: 0 });
  });
});
