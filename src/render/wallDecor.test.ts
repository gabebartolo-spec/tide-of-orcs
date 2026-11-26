import { describe, expect, it } from 'vitest';
import { WALL_ART, WALL_BANNERS, WALL_DECOR_ART, WALL_SPOTS, WallDecorRect } from '../data/presentation';
import { placeWall } from './wallArt';
import { wallBanners, wallBannerSprites } from './wallDecor';

const foot = (b: { id: keyof typeof WALL_DECOR_ART; x: number; y: number; w: number; h: number }): [number, number] => {
  const A = WALL_DECOR_ART[b.id]; return [b.x + (A.foot[0] * b.w) / A.w, b.y + (A.foot[1] * b.h) / A.h];
};

describe('wall banners (TB-250)', () => {
  it('maps earned achievements to their banners', () => {
    expect(wallBanners([])).toEqual([]);
    expect(wallBanners(['wave_10'])).toEqual(['wall_banner_grove']);
    expect(wallBanners(['boss_50', 'wave_10', 'wave_25'])).toEqual(['wall_banner_tide', 'wall_banner_grove']);
  });

  it('has spots for every tier, stage and tall post', () => {
    expect(WALL_SPOTS.tall).toHaveLength(WALL_ART.length);
    for (const t of WALL_SPOTS.tall) { expect(t).toHaveLength(4); for (const st of t) expect(st).toHaveLength(WALL_SPOTS.capW.length); }
  });

  it('stands each standard on its tall post cap on wall0, farthest first', () => {
    const w = placeWall(WALL_ART[0], 100);
    const sp = wallBannerSprites(['wall_banner_grove', 'wall_banner_tide'], w, 0, 2);
    expect(sp.map((s) => s.id)).toEqual(['wall_banner_tide', 'wall_banner_grove']);
    for (const s of sp) {
      const [x, , ] = WALL_SPOTS.tall[0][2][WALL_BANNERS.spot[s.id as 'wall_banner_grove'] - 1]!, y = WALL_SPOTS.tall[0][2][WALL_BANNERS.spot[s.id as 'wall_banner_grove'] - 1]![1];
      const f = foot(s); expect(f[0]).toBeCloseTo(w.x + x, 6); expect(f[1]).toBeCloseTo(w.y + y, 6);
      expect(s.h).toBeCloseTo(WALL_BANNERS.standardH * WALL_SPOTS.capW[WALL_BANNERS.spot[s.id as 'wall_banner_grove'] - 1]!, 6);
    }
  });

  it('puts a tier post under the standard on wall1-3, the same at every damage stage', () => {
    for (const t of [1, 2, 3]) {
      const w = placeWall(WALL_ART[t]!, 100), sp = wallBannerSprites(['wall_banner_grove'], w, t, 3);
      expect(sp.map((s) => [s.id, s.behind])).toEqual([[WALL_BANNERS.post[t], true], ['wall_banner_grove', true]]);
      const s0 = WALL_SPOTS.tall[t]![0]![1]!, post = sp[0]!, P: WallDecorRect = WALL_DECOR_ART[post.id];
      expect(foot(post)[1]).toBeCloseTo(w.y + s0[1] + WALL_BANNERS.postSink * WALL_SPOTS.capW[1]!, 6);
      const topY = post.y + (P.top![1] * post.h) / P.h;
      expect(topY).toBeCloseTo(w.y + s0[1] - WALL_BANNERS.postOver * WALL_SPOTS.capW[1]!, 6);
      expect(foot(sp[1]!)[1]).toBeCloseTo(topY, 6);
      expect(wallBannerSprites(['wall_banner_grove'], w, t, 0)).toEqual(sp);
    }
  });
});
