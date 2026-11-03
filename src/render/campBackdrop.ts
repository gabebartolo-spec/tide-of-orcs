import { CAMP_BACKDROP } from '../data/presentation';
import { P } from './palette';
import { quality } from './quality';

/** The Camp scene's backdrop (TB-188j, docs/plans/elf-encampment.md §1): a plate rendered in Blender in the buildings' own style
 *  (forest, meadow, the road in front of the row), darkened toward the canvas bottom (TB-188k); contact shadows are baked into the
 *  building images. Static, so it is composed once
 *  per canvas size (and once more when the plate loads) to an offscreen canvas and blitted each frame. */

const B = CAMP_BACKDROP;
let plate: HTMLImageElement | null = null;
let loading = false;
function load(): void {
  if (loading || typeof Image === 'undefined') return;
  loading = true;
  const im = new Image(); im.onload = (): void => { plate = im; }; im.src = `${import.meta.env.BASE_URL}${quality.q.cheap ? B.srcPhone : B.src}`;
}

export class CampBackdrop {
  private cv: HTMLCanvasElement | null = null;
  private key = '';

  /** Blit the backdrop; recompose if the canvas size changed or the plate arrived. k: scene-to-CSS scale, (ox, oy): box offset. */
  draw(g: CanvasRenderingContext2D, k: number, ox: number, oy: number, dpr: number): void {
    load();
    const cw = g.canvas.width, ch = g.canvas.height, key = `${cw}x${ch}${plate ? 'p' : ''}`;
    if (key !== this.key || !this.cv) { this.cv = this.paint(cw, ch, k, ox, oy, dpr); this.key = key; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(this.cv, 0, 0);
  }

  private paint(cw: number, ch: number, k: number, ox: number, oy: number, dpr: number): HTMLCanvasElement {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const g = cv.getContext('2d')!, px = k * dpr, p = B.plate;
    g.fillStyle = P.plain; g.fillRect(0, 0, cw, ch);
    g.setTransform(px, 0, 0, px, ox * dpr, oy * dpr);
    if (!plate) return cv;
    g.imageSmoothingQuality = 'high';
    g.drawImage(plate, p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0);
    // foreground vignette: the bottom of the canvas darkens so the eye stays on the building row
    const sh = B.shade, y0 = ch * (1 - sh.h);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const gr = g.createLinearGradient(0, y0, 0, ch); gr.addColorStop(0, P.glowClear); gr.addColorStop(0.45, P.dim45); gr.addColorStop(1, P.dim);
    g.globalAlpha = sh.a; g.fillStyle = gr; g.fillRect(0, y0, cw, ch - y0);
    g.globalAlpha = 1;
    return cv;
  }
}
