import { describe, expect, it } from 'vitest';
import { FIELD } from '../data/balance';
import { plainPoint, pointerAims } from './viewMap';

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
  it('a hovering pen or stray touch never aims; the held finger and the mouse do', () => {
    expect(pointerAims('pen', 3, null)).toBe(false);
    expect(pointerAims('touch', 4, 3)).toBe(false);
    expect(pointerAims('touch', 3, 3)).toBe(true);
    expect(pointerAims('mouse', 1, null)).toBe(true);
  });
});
