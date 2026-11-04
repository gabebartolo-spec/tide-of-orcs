import { quality, renderScale } from './quality';
import { BuildingId } from '../data/camp';
import { CAMP_BACKDROP, CAMP_SCENE, CAMP_SPOTS, QUALITY } from '../data/presentation';
import { CampArt } from './camp';
import { CampBackdrop } from './campBackdrop';
import { CampFauna } from './campFauna';
import { CampLife } from './campLife';

/** Extent of the four buildings in scene units (from CAMP_SPOTS). */
const ROW = Object.values(CAMP_SPOTS).reduce((a, p) => ({ x0: Math.min(a.x0, p.x - p.w / 2), x1: Math.max(a.x1, p.x + p.w / 2), y0: Math.min(a.y0, p.y - p.h), y1: Math.max(a.y1, p.y) }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });

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
    // fit the whole building row, never show more than the backdrop plate covers vertically, centre on the row
    const S = CAMP_SCENE, B = ROW, plate = CAMP_BACKDROP.plate;
    const kw = r.width / (B.x1 - B.x0 + 2 * S.padX), kh = r.height / (B.y1 - B.y0 + S.padTop + S.padBottom);
    this.k = Math.max(Math.min(kw, kh), r.height / (plate.y1 - plate.y0)) || 1;
    this.ox = r.width / 2 - ((B.x0 + B.x1) / 2) * this.k; this.oy = r.height / 2 - ((B.y0 - S.padTop + B.y1 + S.padBottom) / 2) * this.k;
    this.onLayout?.();
  }

  /** Called after every resize (the camp tap tags follow the buildings). */
  onLayout: (() => void) | null = null;

  /** A scene point to CSS px inside the canvas box. */
  toClient(x: number, y: number): [number, number] { return [this.ox + x * this.k, this.oy + y * this.k]; }

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
