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

/** Drawn x for a VFX event at sim (x, y) (TB-214): a hit on a stand-off kind lands on the body as drawn, not at the sim x up to gap radii
 *  behind it. `orcs` = live orcs of the sim; the one standing exactly at (x, y) with an ORC_STANDOFF kind decides, anything else keeps x. */
export function drawnHitX(orcs: ReadonlyArray<{ live: boolean; kind: string; x: number; y: number; r: number }>, x: number, y: number): number {
  for (const o of orcs) if (o.live && o.x === x && o.y === y && ORC_STANDOFF[o.kind]) return standoffX(o.kind, x, o.r);
  return x;
}
