/**
 * Sprite sheets (TB-060, ART-STYLE §Asset pipeline). Loads public/sprites/atlas.json lazily; while it is missing or
 * an animation key is absent, draw() returns false and the caller keeps its vector draw. Shadows stay in-engine.
 */
import { SPRITE_BAKE } from '../data/presentation';

/** One animation: its sheet image, frame rects on it, playback rate, foot anchor (0..1 of frame), drawn height per unit of actor radius. */
export interface Anim { image: string; frames: [number, number, number, number][]; fps: number; ax: number; ay: number; hPerR: number }
/** Atlas: one JSON over several sheets (TB-129: orcs on one, elf + vanguard on another, each under the 2 MB budget). */
export interface Atlas { images: string[]; anims: Record<string, Anim> }

export const ATLAS_URL = 'sprites/atlas.json';
export type ActorState = 'walk' | 'attack' | 'idle';

/** Frame index for an animation at time t (seconds), looping. */
export function frameAt(a: Anim, t: number): number {
  const n = a.frames.length;
  return n ? Math.floor(Math.max(0, t) * a.fps) % n : 0;
}

/** Validate untrusted atlas JSON; null when it is not usable. Malformed anims are dropped. An anim without its own
 *  `image` takes the atlas-wide `image` (the single-sheet format before TB-129). */
export function parseAtlas(raw: unknown): Atlas | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Atlas> & { image?: unknown };
  const fallback = typeof r.image === 'string' ? r.image : '';
  if (!r.anims || typeof r.anims !== 'object') return null;
  const anims: Record<string, Anim> = {}, images = new Set<string>();
  for (const [k, a] of Object.entries(r.anims as Record<string, Partial<Anim>>)) {
    const image = typeof a?.image === 'string' ? a.image : fallback;
    const ok = a && image && Array.isArray(a.frames) && a.frames.length > 0 && a.frames.every((f) => Array.isArray(f) && f.length === 4 && f.every(Number.isFinite))
      && [a.fps, a.ax, a.ay, a.hPerR].every((v) => typeof v === 'number' && Number.isFinite(v)) && a.fps! > 0 && a.hPerR! > 0;
    if (ok) { anims[k] = { ...(a as Anim), image }; images.add(image); }
  }
  if (!images.size) return null;
  return { images: [...images].sort(), anims };
}

/** The atlas without anims whose sheet failed to load; null when no sheet loaded (TB-216c). */
export function keepLoaded(atlas: Atlas, loaded: ReadonlySet<string>): Atlas | null {
  const anims: Record<string, Anim> = {};
  for (const [k, a] of Object.entries(atlas.anims)) if (loaded.has(a.image)) anims[k] = a;
  const images = atlas.images.filter((i) => loaded.has(i));
  return images.length ? { images, anims } : null;
}

export class Sprites {
  private atlas: Atlas | null = null;
  /** Decoded sheets by atlas image name. */
  private imgs = new Map<string, HTMLImageElement>();
  /** Scratch canvas for tinting one frame without touching the sheet. */
  private tmp: HTMLCanvasElement | null = null;
  /** True from load() until it settles: callers hide vector stand-ins so the old body never flashes before the sheet (TB-155). */
  loading = false;

  /** Fetch the atlas and its sheet; any failure leaves vector fallback in place. */
  async load(base = import.meta.env.BASE_URL): Promise<boolean> {
    this.loading = true;
    try {
      const res = await fetch(base + ATLAS_URL);
      if (!res.ok) return false;
      const atlas = parseAtlas(await res.json());
      if (!atlas) return false;
      const settled = await Promise.allSettled(atlas.images.map(async (name) => {
        const img = new Image(); img.src = base + 'sprites/' + name;
        await img.decode();
        return [name, img] as const;
      }));
      // one bad sheet drops only its own anims; the rest keep their sprites (TB-216c)
      const imgs = new Map(settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])));
      const kept = keepLoaded(atlas, new Set(imgs.keys()));
      if (!kept) return false;
      this.atlas = kept; this.imgs = imgs;
      return true;
    } catch { return false; } finally { this.loading = false; }
  }

  /**
   * Draw an actor in one of its three states. `key` is the walk loop and `key.attack` the attack loop; idle holds the
   * walk's first frame. A missing loop borrows the other one (the attack's first frame stands in for a walk), so one
   * approved clip is enough to replace the vector actor.
   */
  drawActor(g: CanvasRenderingContext2D, key: string, state: ActorState, t: number, x: number, y: number, r: number, flash = false, tint = '', glow = '', blur = 0): boolean {
    const atk = this.atkKey(key);
    if (state === 'attack') return this.draw(g, atk, t, x, y, r, flash, tint, glow, blur) || this.draw(g, key, t, x, y, r, flash, tint, glow, blur);
    if (state === 'walk' && this.draw(g, key, t, x, y, r, flash, tint, glow, blur)) return true;
    return this.draw(g, key, 0, x, y, r, flash, tint, glow, blur) || this.draw(g, atk, 0, x, y, r, flash, tint, glow, blur);
  }

  /** `key.attack`, built once per key so drawing builds no strings (TB-183). */
  private atkKeys = new Map<string, string>();
  private atkKey(key: string): string {
    let a = this.atkKeys.get(key);
    if (a === undefined) { a = key + '.attack'; this.atkKeys.set(key, a); }
    return a;
  }

  /** Length of one loop of `key` in seconds (0 when it has no sprite). Lets a caller play a clip in step with a sim timer,
   *  e.g. the elf's draw clip runs with the bow's charge instead of free-running. */
  duration(key: string): number {
    const a = this.atlas?.anims[key];
    return a ? a.frames.length / a.fps : 0;
  }

  /** Drawn height of `key` per unit of r (0 when it has no sprite), so a caller can size a sprite to a set height. */
  heightPerR(key: string): number { return this.atlas?.anims[key]?.hPerR ?? 0; }

  /** Draw animation `key` with its feet at (x, y) for an actor of radius r. False when there is no sprite for it.
   *  `tint` washes the frame's own pixels in that colour (shading shows through); `glow` rims it in a soft halo.
   *  A tinted or rimmed frame is baked once per (frame, tint, glow, blur, height bucket) and reused (tint-only bakes ignore
   *  height; the cache is capped by SPRITE_BAKE), so a burning or chilled
   *  pack costs one plain drawImage per orc, with no per-actor filter pass, offscreen redraw or string (TB-216d). */
  draw(g: CanvasRenderingContext2D, key: string, t: number, x: number, y: number, r: number, flash = false, tint = '', glow = '', blur = 0): boolean {
    const a = this.atlas?.anims[key], img = a && this.imgs.get(a.image);
    if (!a || !img) return false;
    const fi = frameAt(a, t), [fx, fy, fw, fh] = a.frames[fi]!;
    const h = a.hPerR * r, w = h * (fw / fh), dx = x - w * a.ax, dy = y - h * a.ay;
    if (flash) g.filter = FLASH_FILTER;
    if (tint || glow) {
      // A glow bake is made at the drawn device-pixel height (canvas filter lengths ignore the transform, as the old live
      // shadowBlur did), so its blur and rim land 1:1 on screen (TB-216f).
      const m = glow ? g.getTransform?.() : undefined, k = m ? Math.hypot(m.a, m.b) || 1 : 1;
      const b = glow ? this.baked(img, a, fi, tint, glow, blur, heightBucket(h * k)) : this.baked(img, a, fi, tint, '', 0, 0);
      const s = h / (b.c.height - 2 * b.pad);
      g.drawImage(b.c, 0, 0, b.c.width, b.c.height, dx - b.pad * s, dy - b.pad * s, w + 2 * b.pad * s, h + 2 * b.pad * s);
    } else g.drawImage(img, fx, fy, fw, fh, dx, dy, w, h);
    if (flash) g.filter = 'none';
    return true;
  }

  /** Makes the bake canvases; swappable so tests run without a DOM. */
  makeCanvas: () => HTMLCanvasElement = () => document.createElement('canvas');
  private bakes = new Map<string, Map<string, Map<number, Map<number, Map<Anim, (Baked | undefined)[]>>>>>();
  /** Number of frames baked so far (tests check reuse). */
  bakeCount = 0;
  /** Frames held in the cache now (bounded by SPRITE_BAKE.cap). */
  bakeSize = 0;

  private baked(img: CanvasImageSource, a: Anim, fi: number, tint: string, glow: string, blur: number, hb: number): Baked {
    const byTint = getOr(this.bakes, tint, newMap), byGlow = getOr(byTint, glow, newMap);
    const byBlur = getOr(byGlow, blur, newMap), byH = getOr(byBlur, hb, newMap);
    const list = getOr(byH, a, newList);
    const hit = list[fi];
    if (hit) return hit;
    if (this.bakeSize >= SPRITE_BAKE.cap) { this.bakes.clear(); this.bakeSize = 0; return this.baked(img, a, fi, tint, glow, blur, hb); }
    const [fx, fy, fw, fh] = a.frames[fi]!;
    // Glow bakes are sized to the bucketed device height hb, so `blur` is in screen pixels like the live filter was.
    const bh = glow && hb ? hb : fh, bw = glow && hb ? Math.max(1, Math.round(hb * fw / fh)) : fw;
    const pad = glow ? Math.ceil(blur * 2) + 1 : 0;
    const c = this.makeCanvas(); c.width = bw + 2 * pad; c.height = bh + 2 * pad;
    const cg = c.getContext('2d')!;
    if (glow) cg.filter = `drop-shadow(0 0 ${blur}px ${glow})`;
    cg.drawImage(img, fx, fy, fw, fh, pad, pad, bw, bh);
    cg.filter = 'none';
    if (tint) {
      const tc = (this.tmp ??= this.makeCanvas()), tg = tc.getContext('2d')!;
      if (tc.width < fw || tc.height < fh) { tc.width = Math.max(tc.width, fw); tc.height = Math.max(tc.height, fh); }
      tg.clearRect(0, 0, fw, fh); tg.globalCompositeOperation = 'source-over'; tg.drawImage(img, fx, fy, fw, fh, 0, 0, fw, fh);
      tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = tint; tg.fillRect(0, 0, fw, fh);
      tg.globalCompositeOperation = 'source-over';
      cg.drawImage(tc, 0, 0, fw, fh, pad, pad, bw, bh);
    }
    this.bakeCount++; this.bakeSize++;
    return (list[fi] = { c, pad });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const newMap = (): Map<any, any> => new Map(), newList = (): (Baked | undefined)[] => [];
/** Snaps a drawn height to a geometric bucket (SPRITE_BAKE.steps per doubling), so varied radii share bakes. */
export function heightBucket(h: number): number {
  return Math.max(1, Math.round(2 ** (Math.round(Math.log2(Math.max(1, h)) * SPRITE_BAKE.steps) / SPRITE_BAKE.steps)));
}
const FLASH_FILTER = 'brightness(2.2)';
interface Baked { c: HTMLCanvasElement; pad: number }
function getOr<K, V>(m: Map<K, V>, k: K, mk: () => V): V {
  let v = m.get(k);
  if (v === undefined) { v = mk(); m.set(k, v); }
  return v;
}
