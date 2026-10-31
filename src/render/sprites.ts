/**
 * Sprite sheets (TB-060, ART-STYLE §Asset pipeline). Loads public/sprites/atlas.json lazily; while it is missing or
 * an animation key is absent, draw() returns false and the caller keeps its vector draw. Shadows stay in-engine.
 */

/** One animation: frame rects on the sheet, playback rate, foot anchor (0..1 of frame), drawn height per unit of actor radius. */
export interface Anim { frames: [number, number, number, number][]; fps: number; ax: number; ay: number; hPerR: number }
export interface Atlas { image: string; anims: Record<string, Anim> }

export const ATLAS_URL = 'sprites/atlas.json';
export type ActorState = 'walk' | 'attack' | 'idle';

/** Frame index for an animation at time t (seconds), looping. */
export function frameAt(a: Anim, t: number): number {
  const n = a.frames.length;
  return n ? Math.floor(Math.max(0, t) * a.fps) % n : 0;
}

/** Validate untrusted atlas JSON; null when it is not usable. Malformed anims are dropped. */
export function parseAtlas(raw: unknown): Atlas | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Atlas>;
  if (typeof r.image !== 'string' || !r.anims || typeof r.anims !== 'object') return null;
  const anims: Record<string, Anim> = {};
  for (const [k, a] of Object.entries(r.anims)) {
    const ok = a && Array.isArray(a.frames) && a.frames.length > 0 && a.frames.every((f) => Array.isArray(f) && f.length === 4 && f.every(Number.isFinite))
      && [a.fps, a.ax, a.ay, a.hPerR].every((v) => typeof v === 'number' && Number.isFinite(v)) && a.fps > 0 && a.hPerR > 0;
    if (ok) anims[k] = a;
  }
  return { image: r.image, anims };
}

export class Sprites {
  private atlas: Atlas | null = null;
  private img: HTMLImageElement | null = null;

  /** Fetch the atlas and its sheet; any failure leaves vector fallback in place. */
  async load(base = import.meta.env.BASE_URL): Promise<boolean> {
    try {
      const res = await fetch(base + ATLAS_URL);
      if (!res.ok) return false;
      const atlas = parseAtlas(await res.json());
      if (!atlas) return false;
      const img = new Image(); img.src = base + 'sprites/' + atlas.image;
      await img.decode();
      this.atlas = atlas; this.img = img;
      return true;
    } catch { return false; }
  }

  /**
   * Draw an actor in one of its three states. `key` is the walk loop and `key.attack` the attack loop; idle holds the
   * walk's first frame. A missing loop borrows the other one (the attack's first frame stands in for a walk), so one
   * approved clip is enough to replace the vector actor.
   */
  drawActor(g: CanvasRenderingContext2D, key: string, state: ActorState, t: number, x: number, y: number, r: number, flash = false): boolean {
    const atk = key + '.attack';
    if (state === 'attack') return this.draw(g, atk, t, x, y, r, flash) || this.draw(g, key, t, x, y, r, flash);
    if (state === 'walk' && this.draw(g, key, t, x, y, r, flash)) return true;
    return this.draw(g, key, 0, x, y, r, flash) || this.draw(g, atk, 0, x, y, r, flash);
  }

  /** Draw animation `key` with its feet at (x, y) for an actor of radius r. False when there is no sprite for it. */
  draw(g: CanvasRenderingContext2D, key: string, t: number, x: number, y: number, r: number, flash = false): boolean {
    const a = this.atlas?.anims[key];
    if (!a || !this.img) return false;
    const [fx, fy, fw, fh] = a.frames[frameAt(a, t)]!;
    const h = a.hPerR * r, w = h * (fw / fh);
    if (flash) g.filter = 'brightness(2.2)';
    g.drawImage(this.img, fx, fy, fw, fh, x - w * a.ax, y - h * a.ay, w, h);
    if (flash) g.filter = 'none';
    return true;
  }
}
