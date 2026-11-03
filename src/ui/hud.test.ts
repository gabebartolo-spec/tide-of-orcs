import { describe, expect, it } from 'vitest';
import { crackStage, odometerLayout, stampAt, throbPeriod, wallTone } from './hud';
import { HUD } from '../data/presentation';

describe('hud helpers', () => {
  it('cracks appear at 75, 50, 25 %', () => {
    expect([1, 0.76, 0.74, 0.49, 0.2, 0].map(crackStage)).toEqual([0, 0, 1, 2, 3, 3]);
  });
  it('wall tone bands', () => {
    expect([0.9, 0.5, 0.3, 0.25, 0.1].map(wallTone)).toEqual(['high', 'mid', 'mid', 'low', 'low']);
  });
  it('odometer mask keeps literals and rolls digits', () => {
    expect(odometerLayout('1.2K')).toEqual({ mask: 'd.dK', digits: [1, 2] });
    expect(odometerLayout('305').mask).toBe(odometerLayout('999').mask);
  });
});

describe('hud motion helpers (TB-195c)', () => {
  it('throb period runs from throbAt25 at the low edge to throbAt10 at 10 percent and below', () => {
    expect(throbPeriod(HUD.low)).toBeCloseTo(HUD.throbAt25);
    expect(throbPeriod(0.1)).toBeCloseTo(HUD.throbAt10);
    expect(throbPeriod(0)).toBeCloseTo(HUD.throbAt10);
    expect(throbPeriod((HUD.low + 0.1) / 2)).toBeLessThan(HUD.throbAt25);
    expect(throbPeriod((HUD.low + 0.1) / 2)).toBeGreaterThan(HUD.throbAt10);
  });
  it('stamp draws back, slams under-size, then settles to 1 with contact only after the slam', () => {
    const a = stampAt(0), mid = stampAt(HUD.stampPre + HUD.stampSlam - 1), end = stampAt(HUD.stampPre + HUD.stampSlam + HUD.stampSettle);
    expect(a.scale).toBeCloseTo(HUD.stampPreScale); expect(a.contact).toBe(false);
    expect(mid.contact).toBe(false); expect(mid.scale).toBeLessThan(HUD.stampFrom);
    expect(stampAt(HUD.stampPre + HUD.stampSlam).contact).toBe(true);
    expect(end.done).toBe(true); expect(end.scale).toBeCloseTo(1); expect(end.rot).toBe(HUD.stampTurn);
  });
});
