import { describe, expect, it } from 'vitest';
import { flipFrame } from './flipbook';
import { FLIPBOOK } from '../data/presentation';

describe('flipFrame', () => {
  it('steps at the strip fps and ends after the last frame', () => {
    const b = FLIPBOOK.impact;
    expect(flipFrame('impact', 0)).toBe(0);
    expect(flipFrame('impact', 1 / b.fps + 1e-6)).toBe(1);
    expect(flipFrame('impact', (b.n - 1) / b.fps + 1e-6)).toBe(b.n - 1);
    expect(flipFrame('impact', b.n / b.fps + 1e-6)).toBe(-1);
    expect(flipFrame('impact', -0.1)).toBe(-1);
  });
});
