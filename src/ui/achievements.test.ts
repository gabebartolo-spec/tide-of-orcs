import { describe, expect, it } from 'vitest';
import { deedRow, wornTitle } from './achievements';

describe('achievements pane (TB-249)', () => {
  it('a secret is sealed until earned', () => {
    expect(deedRow('secret_twelve', false, false)).toContain('sealed');
    expect(deedRow('secret_twelve', false, false)).not.toContain('Leave It Standing');
    expect(deedRow('secret_twelve', true, false)).toContain('Leave It Standing');
  });
  it('an earned title row offers Wear; a worn one says so; a cosmetic row has no picker', () => {
    expect(deedRow('first_blood', false, false)).not.toContain('data-wear');
    expect(deedRow('first_blood', true, false)).toContain('data-wear="first_blood"');
    expect(deedRow('first_blood', true, true)).toContain('class="worn"');
    expect(deedRow('slain_1k', true, false)).not.toContain('data-wear');
  });
  it('an earned cloak dye offers Wear, a worn one offers take off, and it has art so it never says "arrives" (TB-250)', () => {
    expect(deedRow('wave_50', false, false)).not.toContain('data-dress');
    expect(deedRow('wave_50', true, false)).toContain('data-dress="cloak_ember"');
    expect(deedRow('wave_50', true, true)).toContain('data-undress="cloak"');
    expect(deedRow('wave_50', true, false)).not.toContain('arrives');
    expect(deedRow('first_boss', true, false)).toContain('arrives'); // a trophy: no art yet
  });
  it('arrow trails and the rune ring are wearable too (TB-250)', () => {
    expect(deedRow('slain_1k', true, false)).toContain('data-dress="trail_leaf"');
    expect(deedRow('slain_1k', true, true)).toContain('data-undress="trail"');
    expect(deedRow('branch_bow', true, true)).toContain('data-undress="ring"');
    expect(deedRow('slain_1k', true, false)).not.toContain('arrives');
  });
  it('bow woods are wearable in the bow slot (TB-250)', () => {
    expect(deedRow('wave_100', true, false)).toContain('data-dress="bow_thornwood"');
    expect(deedRow('replant_100', true, true)).toContain('data-undress="bow"');
    expect(deedRow('set_moonveil', true, false)).toContain('data-dress="bow_moonsilver"');
    expect(deedRow('wave_100', true, false)).not.toContain('arrives');
  });
  it('the worn title reads its words', () => {
    expect(wornTitle('first_blood')).toBe('Warden'); expect(wornTitle(null)).toBeNull(); expect(wornTitle('slain_1k')).toBeNull();
  });
});
