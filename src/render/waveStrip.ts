import { WAVE_STRIP } from '../data/presentation';
import { P } from './palette';

/** Where the carved wave strip (TB-263) lands for a channel at (x, y, w, h): the piece rect (taller than the channel, centred on it),
 *  the drawn cap width, and the fill's left edge and full width inside the channel. */
export function stripLayout(x: number, y: number, w: number, h: number): { y: number; h: number; cap: number; fx: number; fw: number } {
  const S = WAVE_STRIP, ph = h / S.chan, k = ph / S.h, cap = S.cap * k, inset = S.inset * k;
  return { y: y + h / 2 - ph / 2, h: ph, cap, fx: x + inset, fw: Math.max(0, w - 2 * inset) };
}

/** The wave progress gauge along the field's foot: the carved rail with the lit heartwood fill to `t` (0..1). Until both images
 *  load it draws the TB-207 vector strip. */
export class WaveStrip {
  private rail: HTMLImageElement | null = null;
  private fill: HTMLImageElement | null = null;

  constructor() {
    if (typeof Image === 'undefined') return;
    const load = (src: string, set: (im: HTMLImageElement) => void): void => { const im = new Image(); im.onload = (): void => set(im); im.src = `${import.meta.env.BASE_URL}${src}`; };
    load(WAVE_STRIP.src, (im) => { this.rail = im; }); load(WAVE_STRIP.fill, (im) => { this.fill = im; });
  }

  draw(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number): void {
    if (this.rail && this.fill) { this.carved(g, this.rail, this.fill, x, y, w, h, t); return; }
    g.fillStyle = P.ink; g.globalAlpha = 0.6; g.beginPath(); g.roundRect(x - 2, y - 2, w + 4, h + 4, h / 2 + 2); g.fill(); g.globalAlpha = 1;
    g.fillStyle = P.dim45; g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.fill();
    if (t > 0) { g.fillStyle = P.amber; g.beginPath(); g.roundRect(x, y, Math.max(h, w * t), h, h / 2); g.fill(); }
  }

  private carved(g: CanvasRenderingContext2D, rail: HTMLImageElement, fill: HTMLImageElement, x: number, y: number, w: number, h: number, t: number): void {
    const S = WAVE_STRIP, L = stripLayout(x, y, w, h), cap = Math.min(L.cap, w / 2);
    g.drawImage(rail, 0, 0, S.cap, S.h, x, L.y, cap, L.h);
    g.drawImage(rail, S.cap, 0, S.w - 2 * S.cap, S.h, x + cap, L.y, w - 2 * cap, L.h);
    g.drawImage(rail, S.w - S.cap, 0, S.cap, S.h, x + w - cap, L.y, cap, L.h);
    const fw = L.fw * Math.min(1, Math.max(0, t));
    // the fill keeps its grain: the visible part is cut from the left of the strip, not squeezed
    if (fw > 0) g.drawImage(fill, 0, 0, fill.width * (fw / L.fw), fill.height, L.fx, y, fw, h);
  }
}
