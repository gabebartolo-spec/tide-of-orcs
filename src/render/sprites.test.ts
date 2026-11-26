import { describe, expect, it } from 'vitest';
import { frameAt, heightBucket, parseAtlas, Sprites } from './sprites';
import { SPRITE_BAKE } from '../data/presentation';

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

  it('bakes a burning or chilled frame once and redraws it with no per-actor filter (TB-216d)', () => {
    const sp = new Sprites();
    const filters: string[] = [];
    const ctx = () => {
      const o = { draws: 0, drawImage() { o.draws++; }, clearRect() {}, fillRect() {}, fillStyle: '', globalCompositeOperation: '' } as Record<string, unknown> & { draws: number };
      let f = 'none';
      Object.defineProperty(o, 'filter', { get: () => f, set: (v: string) => { f = v; filters.push(v); } });
      return o;
    };
    sp.makeCanvas = () => { const c = ctx(); return { width: 0, height: 0, getContext: () => c } as unknown as HTMLCanvasElement; };
    const priv = sp as unknown as { atlas: unknown; imgs: Map<string, unknown> };
    priv.atlas = parseAtlas({ anims: { 'orc.grunt': anim } }); priv.imgs = new Map([['sheet_elf.webp', {}]]);
    const g = ctx() as unknown as CanvasRenderingContext2D & { draws: number };
    for (let i = 0; i < 160; i++) expect(sp.draw(g, 'orc.grunt', 0, i, 0, 10, false, 'red', 'orange', 4)).toBe(true);
    expect(sp.bakeCount).toBe(1)
    expect(g.draws).toBe(160)
    expect(filters.filter((f) => f.startsWith('drop-shadow')).length).toBe(1);
    sp.draw(g, 'orc.grunt', 1.5 / 12, 0, 0, 10, false, 'red', 'orange', 4);
    sp.draw(g, 'orc.grunt', 0, 0, 0, 10, false, 'blue', 'cyan', 4);
    expect(sp.bakeCount).toBe(3);
  });

  it('shares tint-only bakes across heights and bounds rimmed bakes across radii (TB-216d)', () => {
    const sp = rig();
    const g = { drawImage() {}, filter: 'none' } as unknown as CanvasRenderingContext2D;
    for (let r = 4; r <= 40; r += 0.1) sp.draw(g, 'orc.grunt', 0, 0, 0, r, false, 'blue');
    expect(sp.bakeCount).toBe(1);
    for (let r = 4; r <= 40; r += 0.1) sp.draw(g, 'orc.grunt', 0, 0, 0, r, false, 'red', 'orange', 4);
    const hpr = sp.heightPerR('orc.grunt');
    expect(sp.bakeCount - 1).toBeLessThanOrEqual((Math.ceil(hpr * (40 - 4) / SPRITE_BAKE.quantum) + 2) * (SPRITE_BAKE.sub + 1) ** 2);
    for (let i = 0; i < SPRITE_BAKE.cap * 2; i++) sp.draw(g, 'orc.grunt', 0, 0, 0, 1 + i, false, `#${i}`, 'orange', 4);
    expect(sp.bakeSize).toBeLessThanOrEqual(SPRITE_BAKE.cap);
    expect(heightBucket(26)).toBe(heightBucket(26.4));
  });
});

describe('glow bake scale (TB-216f)', () => {
  it('bakes at the drawn device height with the blur in screen px, whatever the transform', () => {
    const sp = new Sprites(), made: { width: number; height: number }[] = [], filters: string[] = [];
    const c = { drawImage() {}, clearRect() {}, fillRect() {}, fillStyle: '', globalCompositeOperation: '', set filter(v: string) { filters.push(v); } };
    sp.makeCanvas = () => { const o = { width: 0, height: 0, getContext: () => c }; made.push(o); return o as unknown as HTMLCanvasElement; };
    const priv = sp as unknown as { atlas: unknown; imgs: Map<string, unknown> };
    priv.atlas = parseAtlas({ anims: { 'orc.grunt': anim } }); priv.imgs = new Map([['sheet_elf.webp', {}]]);
    const h = sp.heightPerR('orc.grunt') * 10;
    const g = { drawImage() {}, filter: 'none', getTransform: () => ({ a: 2, b: 0 }) } as unknown as CanvasRenderingContext2D;
    sp.draw(g, 'orc.grunt', 0, 0, 0, 10, false, '', 'cyan', 4);
    const pad = Math.ceil(4 * 2) + 1;
    expect(made[0]!.height - 2 * pad).toBe(Math.ceil(Math.round(h * 2 / SPRITE_BAKE.quantum) * SPRITE_BAKE.quantum));
    expect(filters).toContain('drop-shadow(0 0 4px cyan)');
  });
});

describe('sheet load failure (TB-216c)', () => {
  it('one failed sheet drops only its own anims', async () => {
    const { keepLoaded } = await import('./sprites');
    const a = parseAtlas({ anims: { 'orc.grunt': { ...anim, image: 'sheet_orcs.webp' }, 'elf.walk': anim } })!;
    const k = keepLoaded(a, new Set(['sheet_elf.webp']))!;
    expect(Object.keys(k.anims)).toEqual(['elf.walk']);
    expect(k.images).toEqual(['sheet_elf.webp']);
    expect(keepLoaded(a, new Set())).toBeNull();
  });
});
function rig(): Sprites {
  const sp = new Sprites();
  const c = { drawImage() {}, clearRect() {}, fillRect() {}, fillStyle: '', globalCompositeOperation: '', filter: 'none' };
  sp.makeCanvas = () => ({ width: 0, height: 0, getContext: () => c }) as unknown as HTMLCanvasElement;
  const priv = sp as unknown as { atlas: unknown; imgs: Map<string, unknown> };
  priv.atlas = parseAtlas({ anims: { 'orc.grunt': anim } }); priv.imgs = new Map([['sheet_elf.webp', {}]]);
  return sp;
}

describe('bow wood overlays (TB-250)', () => {
  it('the cloak dye and bow wood sheets load on demand; the shared sheets do not', async () => {
    const { onDemandSheet } = await import('./sprites');
    expect(onDemandSheet('sheet_bow_moonsilver.webp')).toBe(true);
    expect(onDemandSheet('sheet_elf_ember.webp')).toBe(true);
    expect(onDemandSheet('sheet_elf.webp')).toBe(false);
  });
  it('each wood ships bow-only frames that lie exactly over the elf: same count, size, anchor, height and rate', async () => {
    const { readFileSync } = await import('node:fs');
    const { BOW_WOODS } = await import('../data/achievements');
    const atlas = parseAtlas(JSON.parse(readFileSync('public/sprites/atlas.json', 'utf8')))!;
    for (const wood of Object.values(BOW_WOODS)) for (const clip of ['', '.attack']) {
      const elf = atlas.anims[`elf${clip}`]!, bow = atlas.anims[`elfbow.${wood}${clip}`]!;
      expect(bow.image).toBe(`sheet_bow_${wood}.webp`);
      expect([bow.frames.length, bow.ax, bow.ay, bow.hPerR, bow.fps, bow.lit]).toEqual([elf.frames.length, elf.ax, elf.ay, elf.hPerR, elf.fps, elf.lit]);
      bow.frames.forEach((f, i) => expect([f[2], f[3]]).toEqual([elf.frames[i]![2], elf.frames[i]![3]]));
    }
  });
});

describe('fox tabard overlays (TB-250)', () => {
  it('load on demand and lie exactly over the spearman: same count, size, anchor, height and rate', async () => {
    const { onDemandSheet } = await import('./sprites');
    const { readFileSync } = await import('node:fs');
    expect(onDemandSheet('sheet_vanfox.webp')).toBe(true);
    expect(onDemandSheet('sheet_van.webp')).toBe(false);
    const atlas = parseAtlas(JSON.parse(readFileSync('public/sprites/atlas.json', 'utf8')))!;
    for (const clip of ['', '.attack']) {
      const van = atlas.anims[`van.spear${clip}`]!, fox = atlas.anims[`vanfox.spear${clip}`]!;
      expect(fox.image).toBe('sheet_vanfox.webp');
      expect([fox.frames.length, fox.ax, fox.ay, fox.hPerR, fox.fps, fox.lit]).toEqual([van.frames.length, van.ax, van.ay, van.hPerR, van.fps, van.lit]);
      fox.frames.forEach((f, i) => expect([f[2], f[3]]).toEqual([van.frames[i]![2], van.frames[i]![3]]));
    }
  });
});

describe('night frames (TB-278)', () => {
  it('bakes one night copy per frame, reuses it, and skips it by day', async () => {
    const { NIGHT_SPRITE } = await import('../data/presentation');
    const sp = rig(); let made = 0; const mk = sp.makeCanvas; sp.makeCanvas = () => { made++; return mk(); };
    const g = { drawImage() {}, globalAlpha: 1, filter: 'none' } as unknown as CanvasRenderingContext2D;
    sp.draw(g, 'orc.grunt', 0, 0, 0, 10); expect(sp.nightSize).toBe(0);
    sp.night = 1; sp.draw(g, 'orc.grunt', 0, 0, 0, 10); sp.draw(g, 'orc.grunt', 0, 0, 0, 10);
    expect(sp.nightSize).toBe(1); expect(made).toBe(1); expect(g.globalAlpha).toBe(1);
    sp.night = NIGHT_SPRITE.min / 2; sp.draw(g, 'orc.grunt', 0.5, 0, 0, 10); expect(sp.nightSize).toBe(1);
  });
});
