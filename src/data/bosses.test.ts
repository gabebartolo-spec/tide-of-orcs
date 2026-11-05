import { describe, expect, it } from 'vitest';
import { BOSS_ROSTER, bossFor } from './bosses';

describe('bossFor (TB-230 fixed rotation)', () => {
  it('pins the rotation by boss wave', () => {
    expect([25, 50, 75, 100, 125, 150].map((w) => bossFor(w).id)).toEqual(['warboss', 'ogre', 'orc', 'packed', 'ogreCreature', 'warboss']);
  });
  it('repeats with the roster length and treats early waves as the first', () => {
    expect(bossFor(10).id).toBe('warboss');
    expect(bossFor(25 * (BOSS_ROSTER.length + 2)).id).toBe(BOSS_ROSTER[1].id);
  });
});
