import { FLIPBOOK, FLIPBOOK_CAP, type FlipbookKey } from '../data/presentation';

/** Frame of a flipbook `age` seconds in, or -1 once it has played out (TB-240). */
export function flipFrame(key: FlipbookKey, age: number): number {
  const b = FLIPBOOK[key], f = Math.floor(age * b.fps);
  return age < 0 || f >= b.n ? -1 : f;
}

interface Shot { key: FlipbookKey; x: number; y: number; w: number; age: number; flip: boolean }

/** Pixel-art one-shot effects (TB-240): strips in public/vfx, drawn unsmoothed so their pixels stay hard at any field scale.
 *  A strip that has not loaded yet is simply skipped; callers keep their vector effect as well. */
export class Flipbooks {
  private imgs = new Map<FlipbookKey, HTMLImageElement>();
  private shots: Shot[] = [];

  constructor() {
    if (typeof Image === 'undefined') return;
    for (const k of Object.keys(FLIPBOOK) as FlipbookKey[]) {
      const im = new Image(); im.onload = (): void => { this.imgs.set(k, im); }; im.src = `${import.meta.env.BASE_URL}${FLIPBOOK[k].src}`;
    }
  }

  ready(key: FlipbookKey): boolean { return this.imgs.has(key); }

  /** Play `key` with its anchor on (x, y), `w` world px wide; `flip` mirrors it left-right. */
  spawn(key: FlipbookKey, x: number, y: number, w: number, flip = false): void {
    if (this.imgs.has(key) && this.shots.length < FLIPBOOK_CAP) this.shots.push({ key, x, y, w, age: 0, flip });
  }

  update(dt: number): void {
    for (let i = this.shots.length - 1; i >= 0; i--) { const s = this.shots[i]!; s.age += dt; if (flipFrame(s.key, s.age) < 0) this.shots.splice(i, 1); }
  }

  clear(): void { this.shots.length = 0; }

  draw(g: CanvasRenderingContext2D): void {
    if (!this.shots.length) return;
    const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
    for (const s of this.shots) {
      const b = FLIPBOOK[s.key], f = flipFrame(s.key, s.age), im = this.imgs.get(s.key);
      if (f < 0 || !im) continue;
      const x = s.x - s.w * b.ax, y = s.y - s.w * b.ay;
      if (s.flip) { g.save(); g.translate(s.x, 0); g.scale(-1, 1); g.translate(-s.x, 0); }
      g.drawImage(im, f * b.px, 0, b.px, b.px, x, y, s.w, s.w);
      if (s.flip) g.restore();
    }
    g.imageSmoothingEnabled = sm;
  }
}
