import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../data/camp';
import { CAMP_SPOTS } from '../data/presentation';
import { FIELD } from '../data/balance';
import { campFxText, campHit } from './camp';

describe('camp UI (TB-188b)', () => {
  it('hits each building at its footprint and nothing in the elf lane', () => {
    for (const b of BUILDINGS) { const p = CAMP_SPOTS[b.id]; expect(campHit(p.x, p.y - p.h / 2)).toBe(b.id); }
    expect(campHit(FIELD.elfX, FIELD.h / 2)).toBeNull();
    expect(campHit(FIELD.barX + 50, 100)).toBeNull();
  });
  it('keeps every spot in the grove strip, clear of the archer and HUD bands', () => {
    for (const b of BUILDINGS) {
      const p = CAMP_SPOTS[b.id];
      expect(p.x + p.w / 2).toBeLessThan(FIELD.barX - 3);
      expect(p.x - p.w / 2).toBeGreaterThanOrEqual(0);
      const top = p.y - p.h, bottom = p.y;
      expect((top >= 64 && bottom <= 125) || (top >= 400 && bottom <= FIELD.h)).toBe(true);
    }
  });
  it('reads effects from CAMP_FX', () => {
    expect(campFxText('bowyer', 0)).toBe('');
    expect(campFxText('bowyer', 1)).toBe('bow damage +5%, draw time −3%, strike circle +4%');
    expect(campFxText('kitchen', 3)).toBe('barricade health +20%, barricade regen +2/s, starlight +10%');
  });
});
