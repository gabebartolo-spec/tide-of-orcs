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

/** Drawn x of a corpse that fell at drawn x, `k` (0..1) of the way through its fall: slides right, smoothstep-eased, until it lies
 *  at least `corpse` radii right of the wall stop (TB-214). Kinds without ORC_STANDOFF, and corpses already that far out, stay put. */
export function corpseX(kind: string, x: number, r: number, k: number): number {
  const so = ORC_STANDOFF[kind];
  if (!so) return x;
  const need = FIELD.barX + FIELD.barW + r + so.corpse * r - x;
  if (need <= 0) return x;
  const u = Math.min(1, Math.max(0, k));
  return x + need * u * u * (3 - 2 * u);
}
