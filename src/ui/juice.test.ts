import { describe, expect, it } from 'vitest';
import { JUICE } from '../data/presentation';
import { countValue, popScale, springEase, staggerDelay } from './juice';

describe('juice math (TB-195a)', () => {
  it('spring starts at 0, ends at 1 and overshoots slightly in between', () => {
    expect(springEase(0)).toBeCloseTo(0); expect(springEase(1)).toBeCloseTo(1);
    let peak = 0; for (let t = 0; t <= 1; t += 0.01) peak = Math.max(peak, springEase(t));
    expect(peak).toBeGreaterThan(1); expect(peak).toBeLessThan(1.1);
  });
  it('clamps progress outside 0..1', () => { expect(springEase(-1)).toBeCloseTo(0); expect(springEase(2)).toBeCloseTo(1); });
  it('count-up runs from → to, monotonic, never past the target', () => {
    expect(countValue(10, 110, 0)).toBe(10); expect(countValue(10, 110, 1)).toBe(110);
    let last = 10;
    for (let t = 0; t <= 1; t += 0.05) { const v = countValue(10, 110, t); expect(v).toBeGreaterThanOrEqual(last); expect(v).toBeLessThanOrEqual(110); last = v; }
    expect(countValue(100, 40, 0.5)).toBeLessThan(100); expect(countValue(100, 40, 0.5)).toBeGreaterThan(40);
  });
  it('pop scales 1.15 → 1', () => { expect(popScale(0)).toBeCloseTo(JUICE.count.popFrom); expect(popScale(1)).toBeCloseTo(1); });
  it('staggers children 30 ms apart', () => { expect(staggerDelay(0)).toBe(0); expect(staggerDelay(3)).toBe(3 * JUICE.stagger); expect(JUICE.stagger).toBe(30); });
});
