import { describe, expect, it } from 'vitest';
import { CAMP_FAUNA } from '../data/presentation';

describe('camp elk herd (TB-208)', () => {
  const E = CAMP_FAUNA.elk;
  it('scales every elk within ±8%', () => { for (const d of E) expect(Math.abs(d.s - 1)).toBeLessThanOrEqual(0.08 + 1e-9); });
  it('starts every elk at its own phase', () => { expect(new Set(E.map((d) => d.phase)).size).toBe(E.length); });
  it('has elk facing both ways', () => { expect(E.some((d) => d.right)).toBe(true); expect(E.some((d) => !d.right)).toBe(true); });
});
