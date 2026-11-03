import { describe, expect, it } from 'vitest';
import { Governor, fitScale, pickTier } from './quality';
import { halveAtlas } from './sprites';
import { Pool } from '../sim/pool';

describe('pickTier', () => {
  it('touch or weak devices get the phone tier', () => {
    expect(pickTier({ coarse: true, memGb: 8, cores: 8 })).toBe('phone');
    expect(pickTier({ coarse: false, memGb: 2, cores: 8 })).toBe('phone');
    expect(pickTier({ coarse: false, memGb: 8, cores: 2 })).toBe('phone');
    expect(pickTier({ coarse: false, memGb: 8, cores: 8 })).toBe('desktop');
  });
});

describe('fitScale', () => {
  it('caps by ratio and by megapixels', () => {
    expect(fitScale(2.625, 1.5, 915, 412, 0)).toBe(1.5);
    expect(fitScale(2.625, 1.5, 915, 412, 1.0)).toBe(1.5);
    expect(fitScale(2.625, 1.5, 1280, 720, 1.0)).toBeCloseTo(Math.sqrt(1e6 / (1280 * 720)), 5);
    expect(fitScale(1, 1.5, 915, 412, 1.0)).toBe(1);
  });
});

describe('Governor', () => {
  it('steps down after 3 s of sustained slow frames and not on a short spike', () => {
    const g = new Governor([1.5, 1.25, 1], 1.5);
    for (let i = 0; i < 60; i++) g.frame(16);
    expect(g.rung).toBe(0);
    let changed = false, t = 0;
    while (t < 4000 && !changed) { changed = g.frame(40); t += 40; }
    expect(changed).toBe(true); expect(g.rung).toBe(1); expect(t).toBeLessThanOrEqual(4000);
  });
  it('reaches the 30 fps floor at the lowest rung, and recovers after 10 s fast', () => {
    const g = new Governor([1.5, 1], 1);
    for (let i = 0; i < 400 && !g.floor; i++) g.frame(40);
    expect(g.floor).toBe(true);
    for (let i = 0; i < 1500 && g.floor; i++) g.frame(8);
    expect(g.floor).toBe(false);
  });
});

describe('halveAtlas', () => {
  it('halves frame rects', () => {
    const a = halveAtlas({ images: ['s'], anims: { k: { image: 's', frames: [[0, 0, 92, 112], [93, 0, 92, 112]], fps: 8, ax: 0.5, ay: 1, hPerR: 2 } } });
    expect(a.anims.k!.frames[1]).toEqual([47, 0, 46, 56]);
  });
});

describe('Pool release', () => {
  it('recycles slots', () => {
    const p = new Pool(3, () => ({ live: false }));
    const a = p.alloc()!, b = p.alloc()!; p.release(a); p.release(a);
    expect(p.count).toBe(1); expect(p.alloc()).toBe(a); expect(b.live).toBe(true);
  });
});
