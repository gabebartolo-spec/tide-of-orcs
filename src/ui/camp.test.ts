import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../data/camp';
import { CAMP_ART, CAMP_SCENE, CAMP_SPOTS } from '../data/presentation';
import { campFxText, campHit } from './camp';

describe('camp UI (TB-188b, TB-188e scene)', () => {
  it('hits each building at its footprint, and not open ground', () => {
    for (const b of BUILDINGS) { const p = CAMP_SPOTS[b.id]; expect(campHit(p.x, p.y - p.h / 2)).toBe(b.id); }
    expect(campHit(CAMP_SCENE.w / 2, CAMP_SCENE.bottom - 2)).toBeNull();
    expect(campHit(-5, 300)).toBeNull();
  });
  it('fits every building in the view, evenly sized and spaced (TB-188k)', () => {
    const boxes = BUILDINGS.map((b) => { const p = CAMP_SPOTS[b.id]; return [p.x - p.w / 2, p.y - p.h, p.x + p.w / 2, p.y] as const; });
    for (const [x0, y0, x1, y1] of boxes) { expect(x0).toBeGreaterThan(CAMP_SCENE.x0); expect(y0).toBeGreaterThan(CAMP_SCENE.top); expect(x1).toBeLessThan(CAMP_SCENE.x0 + CAMP_SCENE.w); expect(y1).toBeLessThan(CAMP_SCENE.bottom); }
    // two staggered rows (director, 3 Nov round 3): neighbours overlap a little, under 45% of the narrower box, and alternate rows
    for (let i = 0; i + 1 < boxes.length; i++) {
      const a = boxes[i]!, b = boxes[i + 1]!;
      expect(a[2] - b[0]).toBeLessThan(0.45 * Math.min(a[2] - a[0], b[2] - b[0]));
      expect(a[3]).not.toBe(b[3]);
    }
    // every level image exists in CAMP_ART and widens with its level
    for (const b of BUILDINGS) { const r = CAMP_ART[b.id]; expect(r[0].w).toBeLessThan(r[2].w); }
  });
  it('reads effects from CAMP_FX', () => {
    expect(campFxText('bowyer', 0)).toBe('');
    expect(campFxText('bowyer', 1)).toBe('bow damage +5%, draw time −3%, strike circle +4%');
    expect(campFxText('kitchen', 3)).toBe('barricade health +20%, barricade regen +2%/s, starlight +10%');
  });
});
