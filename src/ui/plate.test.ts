import { describe, expect, it } from 'vitest';
import { flatten, oneLine, placePlate, plateRows, showStat } from './plate';
import { PLATE } from '../data/presentation';
import { STR } from '../data/strings';

describe('plate helpers (TB-195c)', () => {
  it('flattens nested stats to dotted numeric leaves', () => {
    expect(flatten({ a: 1, b: { c: true, d: null }, s: 'x' })).toEqual({ a: 1, 'b.c': 1, 'b.d': 0 });
  });
  it('formats each stat kind', () => {
    expect(showStat(0.25, 'pct')).toBe('25%');
    expect(showStat(1.5, 'x')).toBe('×1.5');
    expect(showStat(1.25, 'secs')).toBe('1.25s');
    expect(showStat(1, 'flag')).toBe(STR.plateOn);
    expect(showStat(0, 'flag')).toBe(STR.plateOff);
  });
  it('lists only changed labelled stats, capped, with direction', () => {
    const [key, , , lower] = STR.plateStats[0] ?? ["", "", "num", false];
    const set = (o: Record<string, number>, k: string, v: number) => { const p = k.split('.'); let t: Record<string, unknown> = o; for (const s of p.slice(0, -1)) t = (t[s] ??= {}) as Record<string, unknown>; t[p[p.length - 1] as string] = v; return o; };
    const now = set({}, key, 1), next = set({}, key, 2);
    const rows = plateRows(now, next);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.up).toBe(!lower);
    expect(plateRows(now, now)).toHaveLength(0);
    const all = Object.fromEntries(STR.plateStats.map(([k]) => [k, 1]));
    const all2 = Object.fromEntries(STR.plateStats.map(([k]) => [k, 2]));
    const nest = (f: Record<string, number>) => Object.entries(f).reduce((o, [k, v]) => set(o, k, v), {} as Record<string, number>);
    expect(plateRows(nest(all), nest(all2)).length).toBeLessThanOrEqual(PLATE.rows);
  });
  it('keeps the first sentence as flavour', () => {
    expect(oneLine('Arrows fly true. More words here.')).toBe('Arrows fly true.');
    expect(oneLine('No stop')).toBe('No stop');
  });
  it('places the plate beside the cursor and flips at the edges', () => {
    expect(placePlate(100, 100, 300, 200, 1920, 1080, 20)).toEqual({ x: 120, y: 120 });
    expect(placePlate(1800, 1000, 300, 200, 1920, 1080, 20)).toEqual({ x: 1480, y: 780 });
  });
});
