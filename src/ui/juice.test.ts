import { describe, expect, it } from 'vitest';
import { JUICE } from '../data/presentation';
import { countValue, popScale, sparkVelocity, springEase, staggerDelay } from './juice';

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
  it('burst sparks spray upward with lift (TB-195b)', () => {
    for (const u of [0, 0.25, 0.5, 0.75, 1]) expect(sparkVelocity(u, 10).vy).toBeLessThan(0);
    const mid = sparkVelocity(0.5, 10, 1, 4); expect(mid.vx).toBeCloseTo(0); expect(mid.vy).toBeCloseTo(-14);
    expect(JUICE.burst.count).toBeGreaterThanOrEqual(48);
  });
  it('staggers children 30 ms apart', () => { expect(staggerDelay(0)).toBe(0); expect(staggerDelay(3)).toBe(3 * JUICE.stagger); expect(JUICE.stagger).toBe(30); });
});

import { wantsCalm } from './juice';
describe('wantsCalm (TB-219)', () => {
  it('the Settings choice wins, else the OS preference', () => {
    expect(wantsCalm(true, false)).toBe(true); expect(wantsCalm(false, true)).toBe(false);
    expect(wantsCalm(undefined, true)).toBe(true); expect(wantsCalm(undefined, false)).toBe(false);
  });
});
