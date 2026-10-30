import { describe, expect, it } from 'vitest';
import { frameAt, parseAtlas } from './sprites';

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
});
