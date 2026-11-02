import { describe, expect, it } from 'vitest';
import { Interp } from './interp';
import { INTERP } from '../data/presentation';
import { SimState } from '../sim/state';

const world = (): SimState => {
  const o = { x: 100, y: 50, live: true }, wolf = { x: 0, y: 0 }, hawk = { x: 0, y: 0 };
  const pool = (xs: object[]) => ({ forEach: (f: (p: never) => void) => xs.forEach((x) => f(x as never)) });
  return { orcs: pool([o]), vans: pool([]), shots: pool([]), wolf, pack: [], hawk } as unknown as SimState;
};

describe('Interp (TB-194)', () => {
  it('draws a mover between its last two sim positions', () => {
    const s = world(), o = (s.orcs as unknown as { forEach: (f: (p: { x: number }) => void) => void }), it = new Interp();
    let orc!: { x: number; y: number }; o.forEach((p) => { orc = p as never; });
    it.snap(s); orc.x = 90; it.alpha = 0.25;
    const d = it.off(orc); expect(orc.x + d.dx).toBeCloseTo(97.5); expect(d.dy).toBe(0);
  });
  it('is the plain sim position at alpha 1 and for objects never snapped', () => {
    const s = world(), it = new Interp(); it.snap(s); it.alpha = 1;
    expect(it.off(s.wolf).dx).toBe(0); it.alpha = 0.5; expect(it.off({ x: 3, y: 4 }).dx).toBe(0);
  });
  it('snaps a jump longer than INTERP.snap (a pooled slot reused)', () => {
    const s = world(), it = new Interp(); it.snap(s); s.hawk.x += INTERP.snap + 1; it.alpha = 0.5;
    expect(it.off(s.hawk).dx).toBe(0);
  });
});
