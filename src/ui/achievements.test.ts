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
    expect(deedRow('slain_1k', true, false)).toContain('arrives'); // Leaf trail: no art yet
  });
  it('the worn title reads its words', () => {
    expect(wornTitle('first_blood')).toBe('Warden'); expect(wornTitle(null)).toBeNull(); expect(wornTitle('slain_1k')).toBeNull();
  });
});
