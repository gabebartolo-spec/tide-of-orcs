import { FIELD } from '../data/balance';
import type { Orc, SimState } from './state';

/** Auto fire's strike point (TB-223, touch only): the live orc on the plain whose strike circle would catch the most orcs; a tie goes
 *  to the one nearest the barricade, then the lowest on the plain, so the pick is a pure function of the state (no rng, no clock).
 *  Null when no orc is on the plain yet (the bow then holds fire, as with no aim). */
export function autoTarget(s: SimState): { x: number; y: number } | null {
  const r2 = s.stats.radius ** 2;
  let best: Orc | null = null, bn = 0;
  s.orcs.forEach((o) => {
    if (o.dead || o.x > FIELD.w) return;
    let n = 0;
    s.orcs.forEach((p) => { if (!p.dead && p.x <= FIELD.w && (p.x - o.x) ** 2 + (p.y - o.y) ** 2 <= r2) n++; });
    if (n > bn || (n === bn && best && (o.x < best.x || (o.x === best.x && o.y > best.y)))) { best = o; bn = n; }
  });
  const b = best as Orc | null;
  return b ? { x: b.x, y: b.y } : null;
}
