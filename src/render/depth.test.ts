import { describe, expect, it } from 'vitest';
import { FIELD } from '../data/balance';
import { DEPTH } from '../data/presentation';
import { depthScale, depthY, hazeAt, worldY } from './depth';

const H = FIELD.h, T = DEPTH.top;
describe('fake depth (TB-232)', () => {
  it('scales the meadow back row to `far` and the front row to `near`', () => {
    expect(depthScale(T)).toBeCloseTo(DEPTH.far); expect(depthScale(H)).toBeCloseTo(DEPTH.near);
    expect(depthScale(-50)).toBeCloseTo(DEPTH.far); expect(depthScale(0)).toBeCloseTo(DEPTH.far);
    expect(depthScale((T + H) / 2)).toBeCloseTo(DEPTH.far + (DEPTH.near - DEPTH.far) * (depthY((T + H) / 2) - T) / (H - T));
    // the back third reads clearly smaller than mid-field (a squeezed row is also a smaller one)
    expect(depthScale(T + 20) / depthScale((T + H) / 2)).toBeLessThan(0.86);
    expect(DEPTH.near / DEPTH.far).toBeGreaterThanOrEqual(1.35);  // a front orc reads clearly bigger than a back one
  });
  it('keeps the meadow edges and squeezes the back rows', () => {
    expect(depthY(T)).toBe(T); expect(depthY(H)).toBe(H); expect(depthY(100)).toBe(100);
    expect(depthY(T + 30) - depthY(T + 10)).toBeLessThan(20); expect(depthY(H - 10) - depthY(H - 30)).toBeGreaterThan(20);
    for (let y = 0; y < H; y += 10) expect(depthY(y + 10)).toBeGreaterThan(depthY(y));
  });
  it('inverts for the pointer', () => { for (const y of [-20, 0, 33, T + 1, 300, 401, H, H + 5]) expect(worldY(depthY(y))).toBeCloseTo(y, 6); });
  it('hazes the far wood most, eases through the near wood and the back rows, and never shows an edge', () => {
    const sky = 60;
    expect(hazeAt(0, sky)).toBe(0); expect(hazeAt(sky, sky)).toBe(0); expect(hazeAt(sky + DEPTH.feather, sky)).toBeCloseTo(DEPTH.hazeSky);
    for (let y = sky; y < sky + DEPTH.feather; y += 0.5) expect(hazeAt(y + 0.5, sky) - hazeAt(y, sky)).toBeLessThan(0.01);
    expect(hazeAt(T, sky)).toBeCloseTo(DEPTH.haze); expect(hazeAt(H, sky)).toBe(0);
    expect(hazeAt((sky + DEPTH.feather + T) / 2, sky)).toBeLessThan(DEPTH.hazeSky); expect(hazeAt((sky + DEPTH.feather + T) / 2, sky)).toBeGreaterThan(DEPTH.haze);
    expect(hazeAt(T + 20, sky)).toBeLessThan(hazeAt(T, sky)); expect(hazeAt(T + 20, sky)).toBeGreaterThan(0);
    // monotonic and continuous: no step anywhere from the crowns to the front row
    for (let y = sky + DEPTH.feather; y < H; y += 0.5) { const a = hazeAt(y, sky), b = hazeAt(y + 0.5, sky); expect(b).toBeLessThanOrEqual(a + 1e-9); expect(a - b).toBeLessThan(0.01); }
  });
});
