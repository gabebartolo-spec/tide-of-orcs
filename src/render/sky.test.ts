import { describe, expect, it } from 'vitest';
import { Sky } from './sky';
import { SKY_TONE, mixHex } from './palette';
import { SKY, dusk } from '../data/presentation';

describe('sky through the day (TB-261)', () => {
  it('mixes two tokens channel by channel, clamped to the ends', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#204060', 0.5)).toBe('#102030');
    expect(mixHex('#102030', '#ffffff', -1)).toBe('#102030');
    expect(mixHex('#102030', '#000000', 2)).toBe('#000000');
  });

  it('is the day sky at midday, golden at SKY.gold and the dusk sky at deepest dusk', () => {
    const s = new Sky();
    s.tone(dusk(0)); expect(s.c).toEqual(SKY_TONE.day);
    s.tone(SKY.gold); expect(s.c).toEqual(SKY_TONE.gold);
    s.tone(dusk(SKY.dayCycle / 2)); expect(s.c).toEqual(SKY_TONE.dusk);
  });

  it('blends halfway between keys', () => {
    const s = new Sky();
    s.tone(SKY.gold / 2); expect(s.c.low).toBe(mixHex(SKY_TONE.day.low, SKY_TONE.gold.low, 0.5));
    s.tone((SKY.gold + 1) / 2); expect(s.c.top).toBe(mixHex(SKY_TONE.gold.top, SKY_TONE.dusk.top, 0.5));
  });
});
