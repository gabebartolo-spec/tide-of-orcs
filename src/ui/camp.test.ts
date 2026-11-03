import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../data/camp';
import { CAMP_SCENE, CAMP_SPOTS } from '../data/presentation';
import { campFxText, campHit } from './camp';

describe('camp UI (TB-188b, TB-188e scene)', () => {
  it('hits each building at its footprint, and not open ground', () => {
    for (const b of BUILDINGS) { const p = CAMP_SPOTS[b.id]; expect(campHit(p.x, p.y - p.h / 2)).toBe(b.id); }
    expect(campHit(CAMP_SCENE.w / 2, 10)).toBeNull();
    expect(campHit(-5, 300)).toBeNull();
  });
  it('fits every building in the scene, house tall, with no two footprints overlapping', () => {
    const boxes = BUILDINGS.map((b) => { const p = CAMP_SPOTS[b.id]; return [p.x - p.w / 2, p.y - p.h, p.x + p.w / 2, p.y] as const; });
    for (const b of BUILDINGS) expect(CAMP_SPOTS[b.id].h).toBe(CAMP_SCENE.l3H);
    for (const [x0, y0, x1, y1] of boxes) { expect(x0).toBeGreaterThanOrEqual(0); expect(y0).toBeGreaterThanOrEqual(0); expect(x1).toBeLessThanOrEqual(CAMP_SCENE.w); expect(y1).toBeLessThanOrEqual(CAMP_SCENE.h); }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const [a, c] = [boxes[i]!, boxes[j]!];
      expect(a[2] <= c[0] || c[2] <= a[0] || a[3] <= c[1] || c[3] <= a[1]).toBe(true);
    }
    // ~3x the elf (drawn ~38 units tall) once the ground island under each building is set aside
    expect(CAMP_SCENE.l3H / 38).toBeGreaterThan(3.4);
  });
  it('reads effects from CAMP_FX', () => {
    expect(campFxText('bowyer', 0)).toBe('');
    expect(campFxText('bowyer', 1)).toBe('bow damage +5%, draw time −3%, strike circle +4%');
    expect(campFxText('kitchen', 3)).toBe('barricade health +20%, barricade regen +2/s, starlight +10%');
  });
});
