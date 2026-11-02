import { describe, expect, it } from 'vitest';
import { swingClipT } from './actorState';
import { BARRICADE, VANGUARD } from '../data/balance';

describe('attack clip timing (TB-161)', () => {
  const dur = 50 / 15, s = 0.72;
  it('the strike frame meets the hit and the clip runs at real speed', () => {
    expect(swingClipT(VANGUARD.spear.cd, VANGUARD.spear.cd, dur, s)).toBeCloseTo(s * dur);
    expect(swingClipT(0, VANGUARD.spear.cd, dur, s)).toBeCloseTo(s * dur);
    expect(swingClipT(0.5, VANGUARD.spear.cd, dur, s) - swingClipT(0.2, VANGUARD.spear.cd, dur, s)).toBeCloseTo(0.3);
  });
  it('a swing as long as its clip loops with no jump', () => {
    const cd = dur, end = cd - s * dur;
    expect(swingClipT(end - 1e-6, cd, dur, s)).toBeCloseTo(dur);
    expect(swingClipT(end + 1e-6, cd, dur, s)).toBeCloseTo(0);
  });
  it('a clip shorter than the swing holds frame 0 between blows', () => {
    expect(swingClipT(1.5, 2.33, 1.33, 0.5)).toBe(0);
  });
  it('damage per second is unchanged by the slower swings', () => {
    expect(VANGUARD.spear.dmg / VANGUARD.spear.cd).toBeCloseTo(1.6 / 0.8);
    expect(VANGUARD.blade.dmg / VANGUARD.blade.cd).toBeCloseTo(1.4 / 0.45);
    expect(BARRICADE.orcSwing).toBeCloseTo(35 / 15);
  });
});
