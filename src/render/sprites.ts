/**
 * Sprite sheets (TB-060, ART-STYLE §Asset pipeline). Loads public/sprites/atlas.json lazily; while it is missing or
 * an animation key is absent, draw() returns false and the caller keeps its vector draw. Shadows stay in-engine.
 */
import { SPRITE_BAKE, SPRITE_BAKE_PHONE } from '../data/presentation';
import { quality } from './quality';

/** One animation: its sheet image, frame rects on it, playback rate, foot anchor (0..1 of frame), drawn height per unit of actor radius. */
export interface Anim { image: string; frames: [number, number, number, number][]; fps: number; ax: number; ay: number; hPerR: number; lit?: number }
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

/** Sheets that gate the first frame; the others load SHEETS_LATER_MS after them, one by one (TB-218). */
const SHEETS_FIRST = ['sheet_elf.webp', 'sheet_orcs.webp'], SHEETS_LATER_MS = 2500;

/** The atlas without anims whose sheet failed to load; null when no sheet loaded (TB-216c). */
export function keepLoaded(atlas: Atlas, loaded: ReadonlySet<string>): Atlas | null {
  const anims: Record<string, Anim> = {};
  for (const [k, a] of Object.entries(atlas.anims)) if (loaded.has(a.image)) anims[k] = a;
  const images = atlas.images.filter((i) => loaded.has(i));
  return images.length ? { images, anims } : null;
}

/** The atlas with every frame rect scaled by 1/2 (rounded to whole pixels) for the half-size sheets. */
export function halveAtlas(a: Atlas): Atlas {
  const anims: Record<string, Anim> = {};
  for (const [k, v] of Object.entries(a.anims)) {
    anims[k] = { ...v, frames: v.frames.map(([x, y, w, h]) => { return [Math.round(x / 2), Math.round(y / 2), Math.round(w / 2), Math.round(h / 2)] as [number, number, number, number]; }) };
  }
  return { images: a.images, anims };
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
      let atlas = parseAtlas(await res.json());
      if (!atlas) return false;
      // phone tier (TB-218 P6): half-size sheets under sprites/half/, frame rects halved to match (92 MB -> 23 MB decoded)
      const dir = quality.q.cheap ? 'sprites/half/' : 'sprites/';
      if (quality.q.cheap) atlas = halveAtlas(atlas);
      const full = atlas;
      const fetchSheets = async (names: string[]): Promise<Map<string, HTMLImageElement>> => {
        const settled = await Promise.allSettled(names.map(async (name) => {
          const img = new Image(); img.src = base + dir + name;
          await img.decode();
          return [name, img] as const;
        }));
        return new Map(settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])));
      };
      // first paint needs only the elf and the first orcs (TB-218 payload): those sheets gate `loading`, the rest stream in afterwards
      const first = full.images.filter((n) => SHEETS_FIRST.includes(n)), later = full.images.filter((n) => !SHEETS_FIRST.includes(n));
      // one bad sheet drops only its own anims; the rest keep their sprites (TB-216c)
      const imgs = await fetchSheets(first.length ? first : full.images);
      const kept = keepLoaded(full, new Set(imgs.keys()));
      if (!kept) return false;
      this.atlas = kept; this.imgs = imgs; this.clearBakes();
      if (first.length && later.length) void (async () => {
        await new Promise((r) => setTimeout(r, SHEETS_LATER_MS));
        for (const name of later) {   // one at a time: no decode burst while the run plays
          const more = await fetchSheets([name]);
          if (!more.size) continue;
          for (const [k, v] of more) imgs.set(k, v);
          this.atlas = keepLoaded(full, new Set(imgs.keys())) ?? this.atlas; this.imgs = imgs; this.clearBakes();
        }
      })();
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

  /** True when the atlas holds an animation under this key (TB-230 boss art fallback). */
  has(key: string): boolean { return !!this.atlas?.anims[key]; }
  /** TB-253: the frames carry their own cast shadow (re-lit renders), so no flat ground ellipse is drawn under them. */
  lit(key: string): boolean { return !!this.atlas?.anims[key]?.lit; }

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
    // Phone tier (TB-218 P1): a hit flash is the frame drawn twice, the second time additive ('lighter'), so no live brightness filter
    // runs per orc and no extra bakes are held; desktop keeps the filter.
    const P = quality.q.cheap ? SPRITE_BAKE_PHONE : SPRITE_BAKE, twice = flash && quality.q.cheap;
    if (flash && !twice) g.filter = FLASH_FILTER;
    const m = glow ? g.getTransform?.() : undefined;
    for (let pass = twice ? 1 : 0; pass >= 0; pass--) {
      if (pass === 0 && twice) g.globalCompositeOperation = 'lighter';
      if (glow) {
        // A rimmed frame is baked whole, as the live filter drew it (body, drop-shadow, tint), at the drawn device-pixel height
        // (canvas filter lengths ignore the transform), snapped to P.quantum px, and blitted 1:1 in device pixels,
        // so blur, rim and edge pixels match the live draw with no resample of the body (TB-216f).
        // The frame's sub-pixel offset is baked in too (snapped to 1/P.sub px) and the blit lands on whole device
        // pixels, so the bake is never resampled on the way to the screen. The phone tier snaps the offset to whole pixels.
        const k = m ? Math.hypot(m.a, m.b) || 1 : 1, ex = m?.e || 0, ey = m?.f || 0, n = P.sub;
        const hq = Math.max(1, Math.round(h * k / P.quantum) * P.quantum);
        const px = dx * k + ex, py = dy * k + ey, whole = n <= 1, ix = whole ? Math.round(px) : Math.floor(px), iy = whole ? Math.round(py) : Math.floor(py);
        const ox = whole ? 0 : Math.round((px - ix) * n), oy = whole ? 0 : Math.round((py - iy) * n);
        const b = this.baked(img, a, fi, tint, glow, blur, hq, ox / n, oy / n);
        g.drawImage(b.c, (ix - b.pad - ex) / k, (iy - b.pad - ey) / k, b.c.width / k, b.c.height / k);
      } else if (tint) {
        const b = this.baked(img, a, fi, tint, '', 0, 0, 0, 0);
        g.drawImage(b.c, 0, 0, b.c.width, b.c.height, dx, dy, w, h);
      } else g.drawImage(img, fx, fy, fw, fh, dx, dy, w, h);
    }
    if (twice) g.globalCompositeOperation = 'source-over';
    if (flash && !twice) g.filter = 'none';
    return true;
  }

  /** Makes the bake canvases; swappable so tests run without a DOM. */
  makeCanvas: () => HTMLCanvasElement = () => document.createElement('canvas');
  private bakes = new Map<string, Map<string, Map<number, Map<number, Map<Anim, (Baked | undefined)[]>>>>>();
  /** Pixels held by the cache, in bytes (phone tier keeps this under SPRITE_BAKE_PHONE.maxBytes). */
  bakeBytes = 0;
  /** Number of frames baked so far (tests check reuse). */
  bakeCount = 0;
  /** Frames held in the cache now (bounded by SPRITE_BAKE.cap). */
  bakeSize = 0;

  /** Drop every baked frame (sheet reload, tier change, or the cache is full). */
  clearBakes(): void { this.bakes.clear(); this.bakeSize = 0; this.bakeBytes = 0; }

  private baked(img: CanvasImageSource, a: Anim, fi: number, tint: string, glow: string, blur: number, hb: number, ox: number, oy: number): Baked {
    const byTint = getOr(this.bakes, tint, newMap), byGlow = getOr(byTint, glow, newMap);
    const byBlur = getOr(byGlow, blur, newMap), byH = getOr(byBlur, hb * 4096 + ox * 64 + oy, newMap);
    const list = getOr(byH, a, newList);
    const hit = list[fi];
    if (hit) return hit;
    const cap = quality.q.cheap ? SPRITE_BAKE_PHONE : SPRITE_BAKE;
    if (this.bakeSize >= cap.cap || (quality.q.cheap && this.bakeBytes >= SPRITE_BAKE_PHONE.maxBytes)) { this.clearBakes(); return this.baked(img, a, fi, tint, glow, blur, hb, ox, oy); }
    const [fx, fy, fw, fh] = a.frames[fi]!;
    // Glow bakes draw the frame at the device height hb (fractional width kept), so `blur` is in screen pixels as live.
    const bh = hb ? hb : fh, bw = hb ? hb * fw / fh : fw;
    const pad = glow ? Math.ceil(blur * 2) + 1 : 0;
    const c = this.makeCanvas(); c.width = Math.ceil(bw + ox) + 2 * pad; c.height = Math.ceil(bh + oy) + 2 * pad;
    const cg = c.getContext('2d')!;
    if (glow) cg.filter = `drop-shadow(0 0 ${blur}px ${glow})`;
    cg.drawImage(img, fx, fy, fw, fh, pad + ox, pad + oy, bw, bh);
    cg.filter = 'none';
    if (tint) {
      const tc = (this.tmp ??= this.makeCanvas()), tg = tc.getContext('2d')!;
      if (tc.width < fw || tc.height < fh) { tc.width = Math.max(tc.width, fw); tc.height = Math.max(tc.height, fh); }
      tg.clearRect(0, 0, fw, fh); tg.globalCompositeOperation = 'source-over'; tg.drawImage(img, fx, fy, fw, fh, 0, 0, fw, fh);
      tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = tint; tg.fillRect(0, 0, fw, fh);
      tg.globalCompositeOperation = 'source-over';
      cg.drawImage(tc, 0, 0, fw, fh, pad + ox, pad + oy, bw, bh);
    }
    this.bakeCount++; this.bakeSize++; this.bakeBytes += c.width * c.height * 4;
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
