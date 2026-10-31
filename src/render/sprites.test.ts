import { describe, expect, it } from 'vitest';
import { frameAt, parseAtlas, Sprites } from './sprites';

const anim = { frames: [[0, 0, 8, 8], [8, 0, 8, 8], [16, 0, 8, 8]] as [number, number, number, number][], fps: 12, ax: 0.5, ay: 1, hPerR: 2.6 };

describe('sprite atlas', () => {
  it('loops frames at the anim rate', () => {
    expect(frameAt(anim, 0)).toBe(0);
    expect(frameAt(anim, 1.5 / 12)).toBe(1);
    expect(frameAt(anim, 3.5 / 12)).toBe(0);
    expect(frameAt(anim, -1)).toBe(0);
  });
  it('rejects junk and drops malformed anims', () => {
    expect(parseAtlas(null)).toBeNull();
    expect(parseAtlas({ anims: {} })).toBeNull();
    const a = parseAtlas({ image: 'actors.png', anims: { 'orc.grunt': anim, bad: { frames: [[0, 0, 8]], fps: 12, ax: 0, ay: 0, hPerR: 1 }, empty: { ...anim, frames: [] } } });
    expect(Object.keys(a!.anims)).toEqual(['orc.grunt']);
  });
  it('reports a loop length so a clip can follow a sim timer, 0 without a sprite', () => {
    const sp = new Sprites();
    expect(sp.duration('elf.attack')).toBe(0);
    Object.assign(sp, { atlas: { image: 'x', anims: { 'elf.attack': anim } }, img: {} });
    expect(sp.duration('elf.attack')).toBeCloseTo(3 / 12);
    // The bow's charge (0..1) scaled by the loop length lands on the last frame just before the shot, never wrapping to 0.
    expect(frameAt(anim, 0.999 * sp.duration('elf.attack'))).toBe(2);
  });
});
