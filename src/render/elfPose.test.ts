import { describe, expect, it } from 'vitest';
import { chargeT, elfLayers, stepAimMix } from './elfPose';

const DUR = 32 / 30, FR = (t: number) => Math.floor((t / DUR) * 32);
describe('elf shot loop (TB-202)', () => {
  it('charge 1 is the full-draw frame, charge 0 the first', () => {
    expect(FR(chargeT(1, DUR))).toBe(31);
    expect(FR(chargeT(0, DUR))).toBe(0);
  });
  it('after a lob the full draw fades into frame 0 over the release time, then the cycle runs on its own', () => {
    const mid = elfLayers(0.05, 0.075, 1, DUR, 0.15);
    expect(mid.map((l) => [l.state, FR(l.t), l.alpha])).toEqual([['attack', 31, 1], ['attack', 1, 0.5]]);
    const done = elfLayers(0.5, 0.2, 1, DUR, 0.15);
    expect(done).toHaveLength(1); expect(FR(done[0]!.t)).toBe(16);
  });
  it('aim start and stop crossfade idle and draw over the aim time', () => {
    let m = 0; m = stepAimMix(m, true, 0.075, 0.15); expect(m).toBeCloseTo(0.5);
    m = stepAimMix(m, true, 0.1, 0.15); expect(m).toBe(1);
    m = stepAimMix(m, false, 0.15, 0.15); expect(m).toBe(0);
    const half = elfLayers(0.6, 1, 0.5, DUR, 0.15);
    expect(half.map((l) => [l.state, l.alpha])).toEqual([['walk', 1], ['attack', 0.5]]);
    expect(elfLayers(0.6, 1, 0, DUR, 0.15)).toEqual([{ state: 'walk', t: 0, alpha: 1 }]);
  });
});
