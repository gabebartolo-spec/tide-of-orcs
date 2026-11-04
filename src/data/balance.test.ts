import { describe, expect, it } from 'vitest';
import { PRESTIGE, costWave, nodeCost, vanBaseHp, vanCost, waveHP, waveInterval, waveLoot } from './balance';
import { BARRICADE, LOB, PLAYER, VANGUARD, waveSpeedMult } from './balance';

// Reference table from docs/BALANCE.md. Change the doc first, then these.
describe('wave formulas', () => {
  it.each([
    [1, 10, 2, 2.0],
    [10, 40.9, 6.0, 1.04],
    [25, 558, 37.6, 0.35],
    [50, 53204, 795, 0.3],
  ])('wave %i â†’ hp %f loot %f interval %f', (w, hp, loot, iv) => {
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
    [25, 4.18],
    [50, 45.26],
  ])('node cost wave multiplier at wave %i is %f', (w, m) => {
    expect(costWave(w)).toBeCloseTo(m, 2);
  });
  it('a fall pays no Heartwood; only bosses do (TB-171)', () => { expect(PRESTIGE.fallGain).toBe(0); });
});

describe('barricade and vanguard', () => {
  it('a wave-1 grunt swing takes 6.25 off a 150 hp wall (TB-154)', () => {
    expect(waveHP(1) * BARRICADE.orcAtkFrac * BARRICADE.wallMult).toBeCloseTo(6.25);
    expect(BARRICADE.baseHp).toBe(150);
  });
  it('the lob takes two shots to kill a wave-1 grunt (TB-154)', () => {
    expect(Math.ceil(waveHP(1) / (PLAYER.baseDmg * LOB.dmgMult))).toBe(2);
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

// BALANCE.md ## Current formulas that had no pin (TB-216e).
describe('BALANCE.md formula pins (TB-216e)', () => {
  it.each([[0, 1], [10, 1.08], [25, 1.2], [50, 1.4]])('orc speed multiplier at wave %i is %f', (w, m) => {
    expect(waveSpeedMult(w)).toBeCloseTo(m, 6);
  });
  it.each([[0, 150], [3, 293], [5, 458], [10, 1397]])('barMax at timber %i is %i', (t, hp) => {
    expect(Math.round(BARRICADE.baseHp * Math.pow(BARRICADE.timberMult, t))).toBe(hp);
  });
  it.each([
    [1, 12, 50, 36],
    [10, 36, 205, 108],
    [25, 226, 2789, 677],
  ])('vanguard at wave %i: spear cost %i, spear hp %i, blade cost %i', (w, sc, sh, bc) => {
    // The doc table rounds loot(w) first, so costs carry up to 0.4% rounding.
    expect(Math.abs(vanCost('spear', w) / sc - 1)).toBeLessThan(0.004);
    expect(Math.abs(vanBaseHp('spear', w) / sh - 1)).toBeLessThan(0.004);
    expect(Math.abs(vanCost('blade', w) / bc - 1)).toBeLessThan(0.004);
  });
  it('vanguard cap is 2 + ranks', () => { expect(VANGUARD.baseCap).toBe(2); });
  it('a wave-50 grunt hit on a bare wall is capped at 0.25 × barMax', () => {
    const atk = BARRICADE.orcAtkFrac * waveHP(50), barMax = BARRICADE.baseHp;
    expect(Math.min(BARRICADE.wallMult * atk, BARRICADE.maxHitFrac * barMax)).toBeCloseTo(37.5, 6);
  });
});
