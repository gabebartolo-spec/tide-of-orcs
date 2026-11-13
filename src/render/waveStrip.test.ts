import { describe, expect, it } from 'vitest';
import { stripLayout } from './waveStrip';
import { WAVE_STRIP } from '../data/presentation';

describe('carved wave strip layout (TB-263)', () => {
  it('centres a piece on the channel so the channel is its carved groove', () => {
    const L = stripLayout(100, 500, 800, 6);
    expect(L.h).toBeCloseTo(6 / WAVE_STRIP.chan);
    expect(L.y + L.h / 2).toBeCloseTo(503);
  });

  it('scales the caps and fill inset with the drawn height and fills between the gilt bands', () => {
    const L = stripLayout(100, 500, 800, 6), k = 6 / WAVE_STRIP.chan / WAVE_STRIP.h;
    expect(L.cap).toBeCloseTo(WAVE_STRIP.cap * k);
    expect(L.fx).toBeCloseTo(100 + WAVE_STRIP.inset * k);
    expect(L.fw).toBeCloseTo(800 - 2 * WAVE_STRIP.inset * k);
    expect(WAVE_STRIP.inset).toBeLessThan(WAVE_STRIP.cap);
  });
});
