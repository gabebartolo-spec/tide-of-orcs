import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, COSMETICS, COSMETIC_SLOT } from '../data/achievements';
import { vanPaint } from './vanPaint';

describe('fox tabards (TB-250 shield_fox)', () => {
  it('come from Shieldwall, read "Fox tabards" and have no wear slot', () => {
    expect(ACHIEVEMENTS.filter((a) => a.cosmetic === 'shield_fox').map((a) => a.id)).toEqual(['branch_vanguard']);
    expect(COSMETICS.shield_fox).toBe('Fox tabards');
    expect(COSMETIC_SLOT.shield_fox).toBeUndefined();
  });
  it('paint no spearman until earned, then every spearman and never a blade', () => {
    expect(vanPaint('spear', [])).toBeNull();
    expect(vanPaint('spear', ['first_blood', 'branch_wall'])).toBeNull();
    expect(vanPaint('spear', ['branch_vanguard'])).toEqual({ key: 'vanfox.spear', atk: 'vanfox.spear.attack' });
    expect(vanPaint('blade', ['branch_vanguard'])).toBeNull();
  });
  it('a grown earned list is read again', () => {
    const e = ['first_blood']; expect(vanPaint('spear', e)).toBeNull();
    e.push('branch_vanguard'); expect(vanPaint('spear', e)?.key).toBe('vanfox.spear');
  });
});
