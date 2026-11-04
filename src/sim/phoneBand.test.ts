import { describe, expect, it } from 'vitest';
import { FIELD, PHONE_SPAWN, SIM_MISC } from '../data/balance';
import { createState } from './state';
import { spawnBand, spawnOrc } from './step';

describe('phone spawn band (TB-223)', () => {
  it('desktop keeps the 50 px pad on both edges and leaves boss rows unclamped', () => {
    const s = createState(7);
    expect(spawnBand(s)).toEqual({ lo: SIM_MISC.spawnYPad, hi: FIELD.h - SIM_MISC.spawnYPad });
    const o = spawnOrc(s, 'grunt', 0.1 * FIELD.h)!;
    expect(o.y).toBeCloseTo(0.1 * FIELD.h);
  });
  it('phone band keeps random spawns and boss rows inside the top and bottom rows', () => {
    const s = createState(7); s.phoneBand = true;
    expect(spawnBand(s)).toEqual({ lo: PHONE_SPAWN.top, hi: FIELD.h - PHONE_SPAWN.bottom });
    for (let i = 0; i < 200; i++) { const o = spawnOrc(s, 'grunt')!; expect(o.y).toBeGreaterThanOrEqual(PHONE_SPAWN.top); expect(o.y).toBeLessThanOrEqual(FIELD.h - PHONE_SPAWN.bottom); s.orcs.clear(); }
    expect(spawnOrc(s, 'runner', 0.1 * FIELD.h, true)!.y).toBe(PHONE_SPAWN.top);
    expect(spawnOrc(s, 'runner', 0.88 * FIELD.h, true)!.y).toBe(FIELD.h - PHONE_SPAWN.bottom);
  });
});
