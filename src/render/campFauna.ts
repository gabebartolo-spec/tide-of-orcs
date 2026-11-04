import { CAMP_ELK_ART, CAMP_ELK_FOOT, CAMP_ELK_R_ART, CAMP_FAUNA, CAMP_SCENE } from '../data/presentation';
import { img } from './camp';
import { P } from './palette';

/** Camp background life (TB-188k round 3, docs/plans/elf-encampment.md §1): elk grazing behind the buildings (TB-208: the
 *  model's own graze loop, one sprite-sheet frame per step), and a few birds drifting slowly over the forest. Drawn after the backdrop and before the buildings, so
 *  the buildings always sit in front. Reads only time; never touches sim state. */

type Ctx = CanvasRenderingContext2D;
const F = CAMP_FAUNA;
const MAX_DT = 0.1;
const rnd = (r: readonly [number, number]): number => r[0] + Math.random() * (r[1] - r[0]);

export class CampFauna {
  private last = -1;
  private birds = Array.from({ length: F.birds.n }, () => ({
    x: CAMP_SCENE.x0 + Math.random() * CAMP_SCENE.w, y: rnd([F.birds.y0, F.birds.y1]), v: rnd(F.birds.speed), f: rnd(F.birds.flap), ph: Math.random() * 6.28,
  }));

  /** Advance to time `t` (s) and draw. `g` is in scene units. */
  draw(g: Ctx, t: number): void {
    const dt = this.last < 0 ? 0 : Math.min(MAX_DT, Math.max(0, t - this.last));
    this.last = t;
    for (const d of F.elk) {
      const sheet = img(d.right ? 'elk_r' : 'elk'), E = d.right ? CAMP_ELK_R_ART : CAMP_ELK_ART;
      if (!sheet) continue;
      const fw = sheet.naturalWidth / E.cols, fh = sheet.naturalHeight / Math.ceil(E.n / E.cols);
      const k = Math.floor((t * E.fps + d.phase * E.n) % E.n), sx = (k % E.cols) * fw, sy = Math.floor(k / E.cols) * fh;
      const fx = CAMP_ELK_FOOT.x + d.dx, fy = CAMP_ELK_FOOT.y + d.dy;   // scale about the hooves so every elk stays on the ground
      g.drawImage(sheet, sx, sy, fw, fh, fx + (E.x - CAMP_ELK_FOOT.x) * d.s, fy + (E.y - CAMP_ELK_FOOT.y) * d.s, E.w * d.s, E.h * d.s);
    }
    const b = F.birds;
    g.strokeStyle = P.ink2; g.lineWidth = 0.9; g.lineCap = 'round'; g.globalAlpha = b.a;
    for (const o of this.birds) {
      o.x += o.v * dt; if (o.x > CAMP_SCENE.x0 + CAMP_SCENE.w + b.margin) { o.x = CAMP_SCENE.x0 - b.margin; o.y = rnd([b.y0, b.y1]); }
      const w = Math.sin(t * o.f * 6.28 + o.ph) * b.span * 0.45, y = o.y + Math.sin(t * 0.3 + o.ph) * 3;
      g.beginPath(); g.moveTo(o.x - b.span, y - w); g.quadraticCurveTo(o.x - b.span * 0.4, y - Math.abs(w) * 0.3 - 1, o.x, y);
      g.quadraticCurveTo(o.x + b.span * 0.4, y - Math.abs(w) * 0.3 - 1, o.x + b.span, y - w); g.stroke();
    }
    g.globalAlpha = 1;
  }
}
