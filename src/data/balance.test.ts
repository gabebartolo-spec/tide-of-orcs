import { describe, expect, it } from 'vitest';
import { costWave, heartMult, nodeCost, prestigeGain, vanBaseHp, vanCost, waveHP, waveInterval, waveLoot } from './balance';
import { BARRICADE } from './balance';

// Reference table from docs/BALANCE.md. Change the doc first, then these.
describe('wave formulas', () => {
  it.each([
    [1, 10, 2, 2.0],
    [10, 40.9, 6.0, 1.04],
    [25, 1242, 37.6, 0.35],
    [50, 876233, 795, 0.3],
  ])('wave %i → hp %f loot %f interval %f', (w, hp, loot, iv) => {
    expect(waveHP(w)).toBeCloseTo(hp, hp > 1000 ? -2 : hp > 100 ? -1 : 0);
    expect(waveLoot(w)).toBeCloseTo(loot, loot > 100 ? -1 : 0);
    expect(waveInterval(w)).toBeCloseTo(iv, 2);
  });
});

describe('economy', () => {
  it('node cost grows geometrically and rounds', () => {
    expect(nodeCost(12, 1.55, 0)).toBe(12);
    expect(nodeCost(12, 1.55, 1)).toBe(19);
    expect(nodeCost(0, 1.8, 5)).toBe(0);
  });
  it.each([
    [1, 1],
    [10, 1],
    [25, 28.42],
    [50, 7523.16],
  ])('node cost wave multiplier at wave %i is %f', (w, m) => {
    expect(costWave(w)).toBeCloseTo(m, 2);
  });
  it('heartwood multiplier', () => { expect(heartMult(0)).toBe(1); expect(heartMult(10)).toBeCloseTo(2.2); });
  it('prestige gain never negative; grows with wave and kills', () => {
    expect(prestigeGain(1, 0)).toBe(0);
    expect(prestigeGain(4, 0)).toBe(0);
    expect(prestigeGain(12, 0)).toBe(6);
    expect(prestigeGain(12, 800)).toBe(8);
  });
});

describe('barricade and vanguard', () => {
  it('a wave-1 grunt swing is 0.25 damage against a 400 hp wall', () => {
    expect(waveHP(1) * BARRICADE.orcAtkFrac).toBeCloseTo(0.25);
    expect(BARRICADE.baseHp).toBe(400);
  });
  it('spearman at wave 1 costs 12 and has 50 hp', () => {
    expect(vanCost('spear', 1)).toBeCloseTo(12);
    expect(vanBaseHp('spear', 1)).toBeCloseTo(50);
  });
  it('bladedancer is pricier and lighter', () => {
    expect(vanCost('blade', 10)).toBeGreaterThan(vanCost('spear', 10));
    expect(vanBaseHp('blade', 10)).toBeLessThan(vanBaseHp('spear', 10));
  });
});
