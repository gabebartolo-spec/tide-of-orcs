import { describe, expect, it } from 'vitest';
import { frameAt, parseAtlas, Sprites } from './sprites';

const anim = { image: 'sheet_elf.webp', frames: [[0, 0, 8, 8], [8, 0, 8, 8], [16, 0, 8, 8]] as [number, number, number, number][], fps: 12, ax: 0.5, ay: 1, hPerR: 2.6 };

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
    const a = parseAtlas({ anims: { 'orc.grunt': anim, bad: { image: 'x', frames: [[0, 0, 8]], fps: 12, ax: 0, ay: 0, hPerR: 1 }, empty: { ...anim, frames: [] } } });
    expect(Object.keys(a!.anims)).toEqual(['orc.grunt']);
  });
  it('keeps a finite shadow centre sx and drops a junk one (TB-214)', () => {
    const a = parseAtlas({ anims: { ok: { ...anim, sx: 0.4 }, junk: { ...anim, sx: 'x' } } });
    expect(a!.anims.ok!.sx).toBe(0.4);
    expect('sx' in a!.anims.junk!).toBe(false);
  });
  it('keeps a death clip per-frame shadow sxf and land frame only when they fit its frames (TB-214)', () => {
    const a = parseAtlas({ anims: { ok: { ...anim, sxf: [0.4, 0.5, 0.6], land: 2 }, short: { ...anim, sxf: [0.4], land: 3 }, junk: { ...anim, sxf: [0.4, 'x', 1], land: 1.5 } } });
    expect(a!.anims.ok!.sxf).toEqual([0.4, 0.5, 0.6]); expect(a!.anims.ok!.land).toBe(2);
    for (const k of ['short', 'junk']) { expect('sxf' in a!.anims[k]!).toBe(false); expect('land' in a!.anims[k]!).toBe(false); }
  });
  it('lists every sheet the anims use, and reads the old single-image atlas', () => {
    const a = parseAtlas({ anims: { 'orc.grunt': { ...anim, image: 'sheet_orcs.webp' }, 'van.spear': anim } });
    expect(a!.images).toEqual(['sheet_elf.webp', 'sheet_orcs.webp']);
    const noImage = { frames: anim.frames, fps: anim.fps, ax: anim.ax, ay: anim.ay, hPerR: anim.hPerR };
    const old = parseAtlas({ image: 'sheet.webp', anims: { 'orc.grunt': noImage } });
    expect(old!.images).toEqual(['sheet.webp']);
    expect(old!.anims['orc.grunt']!.image).toBe('sheet.webp');
    expect(parseAtlas({ anims: { 'orc.grunt': noImage } })).toBeNull();
  });
  it('reports a loop length so a clip can follow a sim timer, 0 without a sprite', () => {
    const sp = new Sprites();
    expect(sp.duration('elf.attack')).toBe(0);
    Object.assign(sp, { atlas: { images: ['sheet_elf.webp'], anims: { 'elf.attack': anim } } });
    expect(sp.duration('elf.attack')).toBeCloseTo(3 / 12);
    // The bow's charge (0..1) scaled by the loop length lands on the last frame just before the shot, never wrapping to 0.
    expect(frameAt(anim, 0.999 * sp.duration('elf.attack'))).toBe(2);
  });
  it('is loading until the atlas fetch settles, so the vector elf never flashes first (TB-155)', async () => {
    let answer!: (r: Response) => void;
    const real = globalThis.fetch;
    globalThis.fetch = () => new Promise<Response>((res) => { answer = res; });
    try {
      const sp = new Sprites(), done = sp.load('/');
      expect(sp.loading).toBe(true);
      answer(new Response('', { status: 404 }));
      expect(await done).toBe(false);
      expect(sp.loading).toBe(false);
    } finally { globalThis.fetch = real; }
  });
});
