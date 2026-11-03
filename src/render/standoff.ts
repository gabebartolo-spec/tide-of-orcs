import { FIELD } from '../data/balance';
import { ORC_STANDOFF } from '../data/presentation';

/** Drawn x of an orc of `kind` and radius r at sim x (TB-214): sim x far from the wall, `gap` radii short of the sim's wall stop at
 *  it, a straight ramp between (continuous at both ends, monotonic while 0 <= gap < ramp). Kinds without ORC_STANDOFF draw at x. */
export function standoffX(kind: string, x: number, r: number): number {
  const so = ORC_STANDOFF[kind];
  if (!so) return x;
  const stop = FIELD.barX + FIELD.barW + r, R = so.ramp * r, gp = so.gap * r;
  if (x >= stop + R) return x;
  const u = Math.max(0, (x - stop) / R);
  return stop + gp + u * (R - gp);
}
