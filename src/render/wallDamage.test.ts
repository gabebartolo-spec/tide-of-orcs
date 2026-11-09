import { describe, expect, it } from 'vitest';
import { wallStage } from './wallDamage';

describe('wall damage (TB-238, TB-209)', () => {
  it('a whole wall shows stage 0 and a fallen wall the last stage', () => {
    expect(wallStage(1)).toBe(0);
    expect(wallStage(0)).toBe(3);
  });
  it('the stage only worsens as health falls', () => {
    let last = 0;
    for (let f = 1; f >= 0; f -= 0.01) { const n = wallStage(f); expect(n).toBeGreaterThanOrEqual(last); last = n; }
  });
});
