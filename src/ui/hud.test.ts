import { describe, expect, it } from 'vitest';
import { crackStage, odometerLayout, throbPeriod, wallTone } from './hud';
import { HUD } from '../data/presentation';

describe('hud helpers', () => {
  it('throb quickens as the wall falls', () => {
    expect(throbPeriod(HUD.low)).toBeCloseTo(HUD.throbSlow);
    expect(throbPeriod(HUD.deep)).toBeCloseTo(HUD.throbFast);
    expect(throbPeriod(0)).toBeCloseTo(HUD.throbFast);
    expect(throbPeriod(1)).toBeCloseTo(HUD.throbSlow);
  });
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
