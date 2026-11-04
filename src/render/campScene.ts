import { quality, renderScale } from './quality';
import { BuildingId } from '../data/camp';
import { CAMP_SCENE, QUALITY } from '../data/presentation';
import { CampArt } from './camp';
import { CampBackdrop } from './campBackdrop';
import { CampFauna } from './campFauna';
import { CampLife } from './campLife';

/** The Camp tab's scene (TB-188e, docs/plans/elf-encampment.md §1): the four encampment buildings at house scale in a meadow
 *  before a far forest. CAMP_SCENE (scene units = field units) covers the canvas, centred: a canvas of another aspect crops the
 *  middle of the full-screen layout (TB-188k round 3). Read-only: it draws sim state and maps clicks back to scene units for campHit. */
export class CampScene {
  private art = new CampArt();
  private life = new CampLife();
  private backdrop = new CampBackdrop();
  private fauna = new CampFauna();
  private k = 1; private ox = 0; private oy = 0; private dpr = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    new ResizeObserver(() => this.resizeSoon()).observe(canvas);
    this.resize();
  }

  private resizeTimer = 0;
  /** A URL-bar slide or rotation fires many size callbacks: on a phone wait for the box to hold still, then resize once (TB-218). */
  private resizeSoon(): void {
    if (quality.tier !== 'phone') { this.resize(); return; }
    clearTimeout(this.resizeTimer); this.resizeTimer = window.setTimeout(() => this.resize(), QUALITY.resizeSettleMs);
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = renderScale(r.width, r.height);   // the shared backing scale (TB-218 P3)
    const bw = Math.max(1, Math.round(r.width * this.dpr)), bh = Math.max(1, Math.round(r.height * this.dpr));
    if (this.canvas.width !== bw) this.canvas.width = bw; if (this.canvas.height !== bh) this.canvas.height = bh;   // equal size: no reallocation
    const S = CAMP_SCENE;
    this.k = Math.max(r.width / S.w, r.height / (S.bottom - S.top)) || 1;
    this.ox = (r.width - S.w * this.k) / 2 - S.x0 * this.k; this.oy = (r.height - (S.bottom - S.top) * this.k) / 2 - S.top * this.k;
  }

  /** A client point to scene units. */
  toScene(clientX: number, clientY: number): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [(clientX - r.left - this.ox) / this.k, (clientY - r.top - this.oy) / this.k];
  }

  draw(levels: Partial<Record<BuildingId, number>>, t: number): void {
    const g = this.canvas.getContext('2d')!, px = this.k * this.dpr;
    // static forest, meadow and road, cached offscreen (TB-188j)
    this.backdrop.draw(g, this.k, this.ox, this.oy, this.dpr);
    g.setTransform(px, 0, 0, px, this.ox * this.dpr, this.oy * this.dpr);
    this.fauna.draw(g, t);
    this.art.draw(g, levels, px);
    this.life.draw(g, levels, t);
  }
}
