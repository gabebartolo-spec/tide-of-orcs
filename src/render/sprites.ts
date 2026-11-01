/**
 * Sprite sheets (TB-060, ART-STYLE §Asset pipeline). Loads public/sprites/atlas.json lazily; while it is missing or
 * an animation key is absent, draw() returns false and the caller keeps its vector draw. Shadows stay in-engine.
 */

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
      const imgs = await Promise.all(atlas.images.map(async (name) => {
        const img = new Image(); img.src = base + 'sprites/' + name;
        await img.decode();
        return [name, img] as const;
      }));
      this.atlas = atlas; this.imgs = new Map(imgs);
      return true;
    } catch { return false; } finally { this.loading = false; }
  }

  /**
   * Draw an actor in one of its three states. `key` is the walk loop and `key.attack` the attack loop; idle holds the
   * walk's first frame. A missing loop borrows the other one (the attack's first frame stands in for a walk), so one
   * approved clip is enough to replace the vector actor.
   */
  drawActor(g: CanvasRenderingContext2D, key: string, state: ActorState, t: number, x: number, y: number, r: number, flash = false, tint = '', glow = '', blur = 0): boolean {
    const atk = key + '.attack', go = (k: string, tt: number): boolean => this.draw(g, k, tt, x, y, r, flash, tint, glow, blur);
    if (state === 'attack') return go(atk, t) || go(key, t);
    if (state === 'walk' && go(key, t)) return true;
    return go(key, 0) || go(atk, 0);
  }

  /** Length of one loop of `key` in seconds (0 when it has no sprite). Lets a caller play a clip in step with a sim timer,
   *  e.g. the elf's draw clip runs with the bow's charge instead of free-running. */
  duration(key: string): number {
    const a = this.atlas?.anims[key];
    return a ? a.frames.length / a.fps : 0;
  }

  /** Draw animation `key` with its feet at (x, y) for an actor of radius r. False when there is no sprite for it.
   *  `tint` washes the frame's own pixels in that colour (shading shows through); `glow` rims it in a soft halo. */
  draw(g: CanvasRenderingContext2D, key: string, t: number, x: number, y: number, r: number, flash = false, tint = '', glow = '', blur = 0): boolean {
    const a = this.atlas?.anims[key], img = a && this.imgs.get(a.image);
    if (!a || !img) return false;
    const [fx, fy, fw, fh] = a.frames[frameAt(a, t)]!;
    const h = a.hPerR * r, w = h * (fw / fh), dx = x - w * a.ax, dy = y - h * a.ay;
    const f = [flash ? 'brightness(2.2)' : '', glow ? `drop-shadow(0 0 ${blur}px ${glow})` : ''].filter(Boolean).join(' ');
    if (f) g.filter = f;
    g.drawImage(img, fx, fy, fw, fh, dx, dy, w, h);
    if (f) g.filter = 'none';
    if (tint) {
      const c = (this.tmp ??= document.createElement('canvas')), cg = c.getContext('2d')!;
      if (c.width < fw || c.height < fh) { c.width = Math.max(c.width, fw); c.height = Math.max(c.height, fh); }
      cg.clearRect(0, 0, fw, fh); cg.globalCompositeOperation = 'source-over'; cg.drawImage(img, fx, fy, fw, fh, 0, 0, fw, fh);
      cg.globalCompositeOperation = 'source-atop'; cg.fillStyle = tint; cg.fillRect(0, 0, fw, fh);
      g.drawImage(c, 0, 0, fw, fh, dx, dy, w, h);
    }
    return true;
  }
}
