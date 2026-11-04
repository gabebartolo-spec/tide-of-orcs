import { FIELD } from '../data/balance';
import type { Orc, SimState } from './state';

/** Auto fire's strike point (TB-223, touch only): the live orc on the plain whose strike circle would catch the most orcs; a tie goes
 *  to the one nearest the barricade, then the lowest on the plain, so the pick is a pure function of the state (no rng, no clock).
 *  An orc is caught when its centre is within `radius + its own radius` of the point, exactly as `impact` tests it. The pick uses the
 *  base circle: a Starfall arrow only widens it, so the same point still catches at least as many. Orcs at the wall are counted but
 *  never picked, because the elf does not loose at the wall (step.ts). Null when no orc is on the plain yet (the bow holds fire). */
export function autoTarget(s: SimState): { x: number; y: number } | null {
  const wallX = FIELD.barX + FIELD.barW, r = s.stats.radius;
  let best: Orc | null = null, bn = 0;
  s.orcs.forEach((o) => {
    if (o.dead || o.x > FIELD.w || o.x <= wallX) return;
    let n = 0;
    s.orcs.forEach((p) => { if (!p.dead && p.x <= FIELD.w && (p.x - o.x) ** 2 + (p.y - o.y) ** 2 <= (r + p.r) ** 2) n++; });
    if (n > bn || (n === bn && best && (o.x < best.x || (o.x === best.x && o.y > best.y)))) { best = o; bn = n; }
  });
  const b = best as Orc | null;
  return b ? { x: b.x, y: b.y } : null;
}
