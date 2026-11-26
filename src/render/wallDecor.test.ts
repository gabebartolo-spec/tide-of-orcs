import { describe, expect, it } from 'vitest';
import { WALL_ART, WALL_BANNERS, WALL_DECOR_ART, WALL_PROPS, WALL_SPOTS, WallDecorRect } from '../data/presentation';
import { placeWall } from './wallArt';
import { wallBannerSprites, wallCosmetics, wallDecorSprites, wallPropSprites } from './wallDecor';

const foot = (b: { id: keyof typeof WALL_DECOR_ART; x: number; y: number; w: number; h: number }): [number, number] => {
  const A = WALL_DECOR_ART[b.id]; return [b.x + (A.foot[0] * b.w) / A.w, b.y + (A.foot[1] * b.h) / A.h];
};

describe('wall banners (TB-250)', () => {
  it('maps earned achievements to their banners', () => {
    expect(wallCosmetics([])).toEqual([]);
    expect(wallCosmetics(['wave_10'])).toEqual(['wall_banner_grove']);
    expect(wallCosmetics(['boss_50', 'wave_10', 'wave_25'])).toEqual(['wall_banner_tide', 'wall_banner_grove']);
    expect(wallCosmetics(['slain_100k', 'branch_barricade'])).toEqual(['wall_skulls', 'wall_lanterns']);
  });

  it('has spots for every tier, stage, tall and plain post', () => {
    for (const row of ['tall', 'plain'] as const) {
      expect(WALL_SPOTS[row]).toHaveLength(WALL_ART.length);
      for (const t of WALL_SPOTS[row]) { expect(t).toHaveLength(4); for (const st of t) expect(st).toHaveLength(WALL_SPOTS.capW[row].length); }
    }
  });

  it('stands each standard on its tall post cap on wall0, farthest first', () => {
    const w = placeWall(WALL_ART[0], 100);
    const sp = wallBannerSprites(['wall_banner_grove', 'wall_banner_tide'], w, 0, 2);
    expect(sp.map((s) => s.id)).toEqual(['wall_banner_tide', 'wall_banner_grove']);
    for (const s of sp) {
      const [x, , ] = WALL_SPOTS.tall[0][2][WALL_BANNERS.spot[s.id as 'wall_banner_grove'] - 1]!, y = WALL_SPOTS.tall[0][2][WALL_BANNERS.spot[s.id as 'wall_banner_grove'] - 1]![1];
      const f = foot(s); expect(f[0]).toBeCloseTo(w.x + x, 6); expect(f[1]).toBeCloseTo(w.y + y, 6);
      expect(s.h).toBeCloseTo(WALL_BANNERS.standardH * WALL_SPOTS.capW.tall[WALL_BANNERS.spot[s.id as 'wall_banner_grove'] - 1]!, 6);
    }
  });

  it('puts a tier post under the standard on wall1-3, the same at every damage stage', () => {
    for (const t of [1, 2, 3]) {
      const w = placeWall(WALL_ART[t]!, 100), sp = wallBannerSprites(['wall_banner_grove'], w, t, 3);
      expect(sp.map((s) => [s.id, s.behind])).toEqual([[WALL_BANNERS.post[t], true], ['wall_banner_grove', true]]);
      const s0 = WALL_SPOTS.tall[t]![0]![1]!, post = sp[0]!, P: WallDecorRect = WALL_DECOR_ART[post.id];
      expect(foot(post)[1]).toBeCloseTo(w.y + s0[1] + WALL_BANNERS.postSink * WALL_SPOTS.capW.tall[1]!, 6);
      const topY = post.y + (P.top![1] * post.h) / P.h;
      expect(topY).toBeCloseTo(w.y + s0[1] - WALL_BANNERS.postOver * WALL_SPOTS.capW.tall[1]!, 6);
      expect(foot(sp[1]!)[1]).toBeCloseTo(topY, 6);
      expect(wallBannerSprites(['wall_banner_grove'], w, t, 0)).toEqual(sp);
    }
  });

  it('hangs a lantern from alternate tall posts, skipping the banner posts', () => {
    const posts: readonly number[] = WALL_PROPS.wall_lanterns.posts;
    expect(posts).toEqual([1, 3, 5, 7]);
    for (const b of Object.values(WALL_BANNERS.spot)) expect(posts).not.toContain(b);
  });

  it('puts a skull on every 3rd plain post', () => {
    expect(WALL_PROPS.wall_skulls.posts).toEqual(WALL_SPOTS.capW.plain.map((_, i) => i + 1).filter((n) => n % 3 === 0));
  });

  it('pins each lantern top and skull foot to its post top on every tier and stage, over the wall', () => {
    for (let t = 0; t < 4; t++) for (let st = 0; st < 4; st++) {
      const w = placeWall(WALL_ART[t]!, 100), sp = wallPropSprites(['wall_lanterns', 'wall_skulls'], w, t, st);
      expect(sp).toHaveLength(4 + 8);
      sp.forEach((s, j) => {
        const lan = j < 4, row = lan ? 'tall' : 'plain', n = lan ? WALL_PROPS.wall_lanterns.posts[j]! : WALL_PROPS.wall_skulls.posts[j - 4]!;
        const spot = WALL_SPOTS[row][t]![st]![n - 1]!, R: WallDecorRect = WALL_DECOR_ART[s.id], p = lan ? R.top! : R.foot;
        expect(s.x + (p[0] * s.w) / R.w).toBeCloseTo(w.x + spot[0], 6);
        expect(s.y + (p[1] * s.h) / R.h).toBeCloseTo(w.y + spot[1], 6);
        expect(s.h).toBeCloseTo(WALL_PROPS[s.id as 'wall_skulls'].h * WALL_SPOTS.capW[row][n - 1]!, 6);
        expect(s.behind).toBe(false);
      });
    }
  });

  it('draws everything behind the wall first, then the rest farthest first', () => {
    const w = placeWall(WALL_ART[2]!, 100);
    const sp = wallDecorSprites(['wall_banner_grove', 'wall_lanterns', 'wall_skulls', 'wall_banner_tide'], w, 2, 1);
    const k = sp.findIndex((s) => !s.behind);
    expect(k).toBe(4);
    expect(sp.slice(k).every((s) => !s.behind)).toBe(true);
    const fy = sp.slice(k).map((s) => s.y + (WALL_DECOR_ART[s.id].foot[1] * s.h) / WALL_DECOR_ART[s.id].h);
    expect(fy).toEqual([...fy].sort((a, b) => a - b));
  });
});
