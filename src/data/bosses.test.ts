import { describe, expect, it } from 'vitest';
import { BOSS_ROSTER, BOSS_WAVE, bossCount, bossFor, bossWaveAt, isBossWave } from './bosses';

describe('bossFor (TB-230 fixed rotation)', () => {
  it('pins the rotation by boss wave', () => {
    expect([25, 50, 75, 85, 95, 105, 115, 125, 135].map((w) => bossFor(w).id)).toEqual(['warboss', 'ogre', 'orc', 'packed', 'ogreCreature', 'houndmaster', 'firewitch', 'warchief', 'unbroken']);
  });
  it('repeats with the roster length and treats early waves as the first', () => {
    expect(bossFor(10).id).toBe('warboss');
    expect(bossFor(75 + 10 * (BOSS_ROSTER.length - 1)).id).toBe(BOSS_ROSTER[1].id); // every 10 waves past 75
  });
});

describe('late boss waves (TB-277)', () => {
  const B = BOSS_WAVE as { lateFrom: number; lateEvery: number };
  it('default (P-277): every 25 waves to 75, then every 10', () => {
    expect(B.lateFrom).toBe(75);
    expect([25, 50, 75, 85, 95].map(isBossWave)).toEqual([true, true, true, true, true]);
    expect(isBossWave(100)).toBe(false);
    expect(bossCount(99)).toBe(5);
  });
  it('past lateFrom, a boss every lateEvery waves', () => {
    const was = { ...B }; B.lateFrom = 75; B.lateEvery = 10;
    try {
      expect([25, 50, 75, 85, 95, 105].every(isBossWave)).toBe(true);
      expect([80, 100, 110].some(isBossWave)).toBe(false);
      expect(bossCount(74)).toBe(2); expect(bossCount(85)).toBe(4); expect(bossCount(104)).toBe(5);
      expect([1, 2, 3, 4, 5].map(bossWaveAt)).toEqual([25, 50, 75, 85, 95]);
      expect(bossFor(85).id).toBe(BOSS_ROSTER[3].id);
    } finally { Object.assign(B, was); }
  });
});
