import { INTERP } from '../data/presentation';
import { SimState } from '../sim/state';

interface Pt { x: number; y: number }
interface Prev { x: number; y: number; gen: number }

/** Render-side interpolation (TB-194). The sim steps at a fixed STEP; the display refreshes at its own rate, so drawing the latest
 *  sim positions makes movers advance 0, 1 or 2 steps per frame (stutter). Before the last sim step of a frame the loop calls `snap`,
 *  which copies every mover's position; `alpha` (leftover accumulator / STEP) then places each one between that copy and its current
 *  position. Lives in render, keyed by object, and never writes sim state. */
export class Interp {
  /** 0..1: how far between the previous and the current sim step to draw. 1 = exactly the sim (no snapshot yet, or held still). */
  alpha = 1;
  private gen = 0;
  private prev = new WeakMap<object, Prev>();
  private out = { dx: 0, dy: 0 };

  /** Record every mover's position; call right before the sim step whose result this frame will show. */
  snap(s: SimState): void {
    const g = ++this.gen, rec = (p: Pt): void => {
      const r = this.prev.get(p);
      if (r) { r.x = p.x; r.y = p.y; r.gen = g; } else this.prev.set(p, { x: p.x, y: p.y, gen: g });
    };
    s.orcs.forEach(rec); s.vans.forEach(rec); s.shots.forEach(rec);
    rec(s.wolf); for (const w of s.pack) rec(w); rec(s.hawk);
  }

  /** Offset to add to `p`'s sim position to draw it at the interpolated spot. Zero for anything not seen at the last snapshot. */
  off(p: Pt): { dx: number; dy: number } {
    const o = this.out, r = this.prev.get(p); o.dx = 0; o.dy = 0;
    if (!r || r.gen !== this.gen || this.alpha >= 1) return o;
    const ex = r.x - p.x, ey = r.y - p.y;
    if (ex * ex + ey * ey > INTERP.snap * INTERP.snap) return o;
    const k = 1 - this.alpha; o.dx = ex * k; o.dy = ey * k;
    return o;
  }
}
