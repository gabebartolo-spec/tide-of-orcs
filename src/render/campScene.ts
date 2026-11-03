import { BuildingId } from '../data/camp';
import { CAMP_SCENE } from '../data/presentation';
import { CampArt } from './camp';
import { CampBackdrop } from './campBackdrop';
import { CampLife } from './campLife';
import type { Sprites } from './sprites';

/** The Camp tab's scene (TB-188e, docs/plans/elf-encampment.md §1): the four encampment buildings at house scale in a meadow
 *  before a far forest. The CAMP_SCENE box (scene units = field units) is fitted to the
 *  canvas and centred. Read-only: it draws sim state and maps clicks back to scene units for campHit. */
export class CampScene {
  private art = new CampArt();
  private life = new CampLife();
  private backdrop = new CampBackdrop();
  private k = 1; private ox = 0; private oy = 0; private dpr = 1;

  constructor(readonly canvas: HTMLCanvasElement, private sprites: Sprites) {
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr)); this.canvas.height = Math.max(1, Math.round(r.height * this.dpr));
    this.k = Math.min(r.width / CAMP_SCENE.w, r.height / CAMP_SCENE.h) || 1;
    this.ox = (r.width - CAMP_SCENE.w * this.k) / 2; this.oy = (r.height - CAMP_SCENE.h * this.k) / 2;
  }

  /** A client point to scene units. */
  toScene(clientX: number, clientY: number): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [(clientX - r.left - this.ox) / this.k, (clientY - r.top - this.oy) / this.k];
  }

  draw(levels: Partial<Record<BuildingId, number>>, t: number): void {
    const g = this.canvas.getContext('2d')!, px = this.k * this.dpr;
    // static forest, meadow, road and contact shadows, cached offscreen (TB-188j)
    this.backdrop.draw(g, this.k, this.ox, this.oy, this.dpr);
    g.setTransform(px, 0, 0, px, this.ox * this.dpr, this.oy * this.dpr);
    this.art.draw(g, levels, px, this.sprites);
    this.life.draw(g, levels, t);
  }
}
