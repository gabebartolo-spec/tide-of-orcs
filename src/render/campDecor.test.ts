import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, COSMETIC_SLOT, CosmeticId } from '../data/achievements';
import { CAMP_DECOR_ART, CAMP_SCENE, CampDecorId } from '../data/presentation';
import { campDecor, campLayers } from './campDecor';

const IDS = Object.keys(CAMP_DECOR_ART) as CampDecorId[];

describe('camp decor (TB-250 batch 2)', () => {
  it('every piece is the cosmetic of exactly one achievement and has no wear slot', () => {
    for (const d of IDS) {
      expect(ACHIEVEMENTS.filter((a) => a.cosmetic === d)).toHaveLength(1);
      expect(COSMETIC_SLOT[d as CosmeticId]).toBeUndefined();
    }
  });
  it('shows nothing until earned, then the earned piece only', () => {
    expect(campDecor([])).toEqual([]);
    expect(campDecor(['first_blood', 'wave_5'])).toEqual([]);
    expect(campDecor(['first_boss'])).toEqual(['trophy_warboss']);
    expect(campDecor(['path_fox', 'boss_roster'])).toEqual(['banner_fox', 'trophy_ogre_creature']);
  });
  it('a grown earned list is read again', () => {
    const e = ['first_boss']; expect(campDecor(e)).toEqual(['trophy_warboss']);
    e.push('path_magpie'); expect(campDecor(e)).toEqual(['trophy_warboss', 'banner_magpie']);
  });
  it('pieces stand inside the camp scene', () => {
    for (const d of IDS) {
      const r = CAMP_DECOR_ART[d];
      expect(r.x).toBeGreaterThanOrEqual(CAMP_SCENE.x0); expect(r.x + r.w).toBeLessThanOrEqual(CAMP_SCENE.x0 + CAMP_SCENE.w);
      expect(r.y).toBeGreaterThanOrEqual(CAMP_SCENE.top); expect(r.foot).toBeLessThanOrEqual(r.y + r.h);
    }
  });
  it('draws decor and buildings back to front', () => {
    const l = campLayers(IDS);
    expect(l).toHaveLength(4 + IDS.length);
    expect(l[0]).toEqual({ kind: 'decor', id: 'trophy_raider' });   // the farthest trophy first
    expect(l.findIndex((x) => x.id === 'banner_fox')).toBeGreaterThan(l.findIndex((x) => x.id === 'forge'));   // banners stand nearer than the forge
    expect(campLayers([]).every((x) => x.kind === 'building')).toBe(true);
  });
});
