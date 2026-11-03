import { CAMP_DEER_ART, CAMP_FAUNA, CAMP_SCENE } from '../data/presentation';
import { img } from './camp';
import { P } from './palette';

/** Camp background life (TB-188k round 3, docs/plans/elf-encampment.md §1): deer grazing behind the buildings, lifting their
 *  heads now and then, and a few birds drifting slowly over the forest. Drawn after the backdrop and before the buildings, so
 *  the buildings always sit in front. Reads only time; never touches sim state. */

type Ctx = CanvasRenderingContext2D;
const F = CAMP_FAUNA;
const MAX_DT = 0.1;
const rnd = (r: readonly [number, number]): number => r[0] + Math.random() * (r[1] - r[0]);

export class CampFauna {
  private last = -1;
  /** Per deer: seconds until its next head lift, and seconds left with the head up. */
  private next = F.deer.map(() => rnd(F.every));
  private upLeft = F.deer.map(() => 0);
  private birds = Array.from({ length: F.birds.n }, () => ({
    x: CAMP_SCENE.x0 + Math.random() * CAMP_SCENE.w, y: rnd([F.birds.y0, F.birds.y1]), v: rnd(F.birds.speed), f: rnd(F.birds.flap), ph: Math.random() * 6.28,
  }));

  /** Advance to time `t` (s) and draw. `g` is in scene units. */
  draw(g: Ctx, t: number): void {
    const dt = this.last < 0 ? 0 : Math.min(MAX_DT, Math.max(0, t - this.last));
    this.last = t;
    const up = img('deer_up'), down = img('deer_down');
    F.deer.forEach((d, i) => {
      if (this.upLeft[i]! > 0) this.upLeft[i]! -= dt;
      else if ((this.next[i]! -= dt) <= 0) { this.upLeft[i] = rnd(F.up); this.next[i] = rnd(F.every); }
      const lifted = this.upLeft[i]! > 0, im = lifted ? up : down, r = CAMP_DEER_ART[lifted ? 'up' : 'down'];
      if (!im) return;
      if (!d.flip) { g.drawImage(im, r.x + d.dx, r.y + d.dy, r.w, r.h); return; }
      // mirror about the deer's centre (both poses share the up pose's centre so the body stays put)
      const cx = CAMP_DEER_ART.up.x + CAMP_DEER_ART.up.w / 2 + d.dx;
      g.save(); g.translate(cx * 2, 0); g.scale(-1, 1); g.drawImage(im, r.x + d.dx, r.y + d.dy, r.w, r.h); g.restore();
    });
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
