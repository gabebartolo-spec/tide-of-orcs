import { describe, expect, it } from 'vitest';
import { panelAlive, panelMirrored, wallScore, wallTier } from './wallTier';
import { BARRICADE } from '../data/balance';
import { GROUND } from '../data/presentation';

describe('wallTier (TB-209)', () => {
  const hp = (timber: number): number => BARRICADE.baseHp * BARRICADE.timberMult ** timber;
  const at = (timber: number): number => wallTier({ barMax: hp(timber), barRegen: 0, bulwark: false });
  it('steps up with Seasoned Timber ranks alone at 3, 6 and 9', () => {
    expect([0, 2, 3, 5, 6, 8, 9, 10].map(at)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
  it('counts wall perks that add no max health (Repair, Bulwark)', () => {
    const base = { barMax: BARRICADE.baseHp, barRegen: 0, bulwark: false };
    expect(wallScore({ ...base, barRegen: 1 })).toBeCloseTo(1 + GROUND.wallTiers.perPerk);
    expect(wallTier({ barMax: hp(2), barRegen: 1, bulwark: true })).toBe(1);
    expect(wallTier(base)).toBe(0);
  });
  it('has a row count and scale for every tier', () => {
    const n = GROUND.wallTiers.at.length + 1;
    expect(GROUND.wallTiers.rows.length).toBe(n);
    expect(GROUND.wallTiers.scale.length).toBe(n);
  });
  it('panelAlive: intact wall keeps every panel, a fallen one only those above the field', () => {
    for (let i = 0; i < 40; i++) { expect(panelAlive(i * 22, 600, 1, i)).toBe(true); expect(panelAlive(i * 22 + 1, 600, 0, i)).toBe(false); }
    expect(panelAlive(-5, 600, 0, 3)).toBe(true);
  });
});

describe('wall art (TB-227)', () => {
  it('has one atlas and one mirror flag per tier, and no tier mirrors stone courses', () => {
    const n = GROUND.wallTiers.rows.length;
    expect(GROUND.wallTiers.atlas).toHaveLength(n); expect(GROUND.wallTiers.mirror).toHaveLength(n);
    for (let t = 0; t < n; t++) for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) expect(panelMirrored(t, r, i)).toBe(false);
  });
});
