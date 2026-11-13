import { describe, expect, it } from 'vitest';
import { FIELD } from '../data/balance';
import { depthY } from './depth';
import { fitPostRows } from './postRows';

const H = FIELD.h, rows = () => ({ a: H / 2 - 30, b: H / 2 + 30, lo: depthY(H / 2 - 30), hi: depthY(H / 2 + 30) });
describe('elf post rows (TB-267)', () => {
  it('a NaN skirt (zero-size canvas) leaves the rows finite, so the next frame still draws', () => {
    const r = rows(), before = { ...r };
    expect(fitPostRows(r, NaN, H)).toBe(false); expect(r).toEqual(before);
    expect(fitPostRows(r, Infinity, H)).toBe(false); expect(Number.isFinite(r.lo) && Number.isFinite(r.hi)).toBe(true);
  });
  it('a low skirt moves the whole post down together, never squashed', () => {
    const r = rows(), span = depthY(r.b) - depthY(r.a);
    expect(fitPostRows(r, H * 0.6, H)).toBe(true);
    expect(r.lo).toBeGreaterThan(depthY(r.a)); expect(r.hi - r.lo).toBeCloseTo(span);
  });
  it('heals after a bad frame: the next good view fits the rows again', () => {
    const r = rows(); fitPostRows(r, NaN, H);
    expect(fitPostRows(r, 0, H)).toBe(true); expect(Number.isFinite(r.lo)).toBe(true);
  });
});
