import { describe, expect, it } from 'vitest';
import { createState } from './state';
import { EventBus } from './events';
import { placeVanguard, vanguardStep } from './vanguard';
import { FIELD, VANGUARD } from '../data/balance';

type S = ReturnType<typeof createState>;
const orcAt = (s: S, x: number, y: number) => { const o = s.orcs.alloc()!; Object.assign(o, { kind: 'grunt', x, y, hp: 1e9, maxhp: 1e9, r: 12, dead: false }); return o; };
const run = (s: S, secs: number) => { const ev = new EventBus(); for (let t = 0; t < secs; t += 0.05) vanguardStep(s, ev, 0.05); };

describe('vanguard march (TB-156)', () => {
  it('walks out to the nearest orc and stops in reach of it', () => {
    const s = createState(1), v = placeVanguard(s, 'spear')!;
    const far = orcAt(s, 700, v.y), near = orcAt(s, 400, v.y + 40);
    run(s, 10);
    const d = Math.hypot(near.x - v.x, near.y - v.y);
    expect(d).toBeLessThan(VANGUARD.spear.reach + near.r);
    expect(Math.hypot(far.x - v.x, far.y - v.y)).toBeGreaterThan(d);
  });
  it('returns to its wall lane when the field is clear', () => {
    const s = createState(1), v = placeVanguard(s, 'spear')!, o = orcAt(s, 500, 100);
    run(s, 10); expect(v.x).toBeGreaterThan(400);
    o.dead = true; run(s, 15);
    expect(v.x).toBeCloseTo(v.tx); expect(v.y).toBeCloseTo(v.ty); expect(v.mv).toBe(false);
  });
  it('keeps one lane per vanguard, the first in the middle, the next a laneGap off', () => {
    const s = createState(1), a = placeVanguard(s, 'spear')!, b = placeVanguard(s, 'spear')!;
    expect(Math.abs(a.ty - b.ty)).toBeCloseTo(VANGUARD.laneGap);
    expect(a.ty).toBeCloseTo(FIELD.h / 2);
  });
  it('faces the way it walks', () => {
    const s = createState(1), v = placeVanguard(s, 'spear')!; const o = orcAt(s, 500, v.y); run(s, 10);
    expect(v.face).toBe(1); o.dead = true; run(s, 0.2); expect(v.face).toBe(-1);
  });
});

describe('vanguard spread (TB-173)', () => {
  it('two vanguard go for two different orcs', () => {
    const s = createState(1), a = placeVanguard(s, 'spear')!, b = placeVanguard(s, 'spear')!;
    const o1 = orcAt(s, 400, FIELD.h / 2), o2 = orcAt(s, 420, FIELD.h / 2 + 120);
    run(s, 10);
    const near = (v: typeof a) => (Math.hypot(o1.x - v.x, o1.y - v.y) < Math.hypot(o2.x - v.x, o2.y - v.y) ? o1 : o2);
    expect(near(a)).not.toBe(near(b));
  });
  it('two vanguard on one orc never stand in the same spot', () => {
    const s = createState(1), a = placeVanguard(s, 'spear')!, b = placeVanguard(s, 'spear')!;
    orcAt(s, 400, FIELD.h / 2 + 35); run(s, 10);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(VANGUARD.spread * 0.9);
  });
});
