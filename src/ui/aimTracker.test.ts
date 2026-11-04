import { describe, expect, it } from 'vitest';
import { AimTracker } from './aimTracker';
import { aimPoint, liftFor, startsAim } from './touchAim';

const c = (id: number, x = 0, y = 0) => ({ id, type: 'touch' as const, x, y });

describe('AimTracker (TB-218 I1)', () => {
  it('the first contact owns the aim, a second does not', () => {
    const t = new AimTracker();
    expect(t.down(c(1))).toBe(true); expect(t.down(c(2))).toBe(false);
    expect(t.move(2, 5, 5)).toBe(false); expect(t.move(1, 5, 5)).toBe(true);
  });
  it('down f1, down f2, up f1: the aim clears and f2 does not take over', () => {
    const t = new AimTracker(); t.down(c(1)); t.down(c(2, 60, 70)); t.move(2, 62, 71);
    const a = t.release(1); expect(a).toEqual({ wasOwner: true, promoted: null });
    expect(t.owner).toBeNull(); expect(t.move(2, 9, 9)).toBe(false);
    expect(t.release(2)).toEqual({ wasOwner: false, promoted: null }); expect(t.count).toBe(0);
    expect(t.down(c(3))).toBe(true);
  });
  it('lifting the non-owner leaves the aim alone; the owner then clears it', () => {
    const t = new AimTracker(); t.down(c(1)); t.down(c(2));
    expect(t.release(2)).toEqual({ wasOwner: false, promoted: null });
    expect(t.release(1)).toEqual({ wasOwner: true, promoted: null });
  });
  it('releasing an unknown pointer (lostpointercapture after pointerup) does nothing', () => {
    const t = new AimTracker(); t.down(c(1)); t.release(1);
    expect(t.release(1)).toEqual({ wasOwner: false, promoted: null });
  });
  it('reset forgets every contact', () => {
    const t = new AimTracker(); t.down(c(1)); t.down(c(2)); t.reset(); expect(t.owner).toBeNull(); expect(t.count).toBe(0);
  });
});

const R = { left: 0, top: 0, right: 915, bottom: 412 };
describe('touch aim point (TB-218 I2, I3)', () => {
  it('mid-screen lift is 56 px for a finger, 24 px for a pen', () => {
    expect(liftFor('touch', 250, R, 16)).toBe(56); expect(liftFor('touch', 292, R, 16)).toBe(56); expect(liftFor('pen', 250, R, 16)).toBe(24);
  });
  it('the lift is 0 from reachRem (36 px) above the bottom, so the lowest row is reached by a thumb clear of the gesture band (TB-223)', () => {
    expect(liftFor('touch', 412, R, 16)).toBe(0); expect(liftFor('touch', 376, R, 16)).toBe(0); expect(liftFor('touch', 334, R, 16)).toBe(28);
    expect(aimPoint('touch', 460, 376, R, 16).y).toBe(376);   // a thumb 36 px up puts the circle on the finger, not above it
    expect(aimPoint('touch', 460, 412, R, 16).y).toBe(412);
    expect(aimPoint('touch', 460, 412, R, 16, 20).y).toBe(392);   // never inside the bottom inset
    expect(aimPoint('touch', 460, 356, R, 16, 20).y).toBe(356);   // inset 20: the lift is 0 from 36 px above the inset line
  });
  it('every row of the plain is reachable on a Pixel 8 landscape, 915x412 and 915x360 (TB-223)', () => {
    for (const h of [412, 360]) {
      const Rh = { left: 0, top: 0, right: 915, bottom: h }, k = Math.min(915 / 900, h / 480), lowestOrc = 430;   // orcs spawn at y 50..430
      const reach = Rh.bottom - 36, y = aimPoint('touch', 460, reach, Rh, 16).y;
      expect(y / k).toBeGreaterThanOrEqual(lowestOrc);   // a thumb 36 px above the edge strikes the lowest orc row
      let prev = -1; for (let fy = 0; fy <= h; fy += 2) { const cy = aimPoint('touch', 460, fy, Rh, 16).y; expect(cy).toBeGreaterThanOrEqual(prev); prev = cy; }   // monotone: no dead zone
    }
  });
  it('mid-screen the circle is a full 56 px above the finger', () => {
    expect(250 - aimPoint('touch', 460, 250, R, 16, 20, 60).y).toBe(56);
  });
  it('the circle never sits behind the HUD plates and stays on the field', () => {
    expect(aimPoint('touch', 460, 20, R, 16, 20, 60).y).toBe(60); expect(aimPoint('touch', 460, 100, R, 16, 20, 60).y).toBe(60);
    expect(aimPoint('touch', 460, 20, R, 16).y).toBe(0);
    expect(aimPoint('touch', 2000, 200, R, 16).x).toBe(915);
  });
  it('a press in the outer 24 px or the bottom inset starts no aim', () => {
    const inset = { left: 34, right: 0, bottom: 20 };
    expect(startsAim(8, 200, R, inset)).toBe(false); expect(startsAim(30, 200, R, inset)).toBe(false); expect(startsAim(40, 200, R, inset)).toBe(true);
    expect(startsAim(905, 200, R, inset)).toBe(false); expect(startsAim(500, 400, R, inset)).toBe(false); expect(startsAim(500, 390, R, inset)).toBe(true);
  });
});
