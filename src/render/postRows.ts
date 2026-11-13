import { DEPTH } from '../data/presentation';
import { depthScale, depthY } from './depth';

/** The elf's post rows: the archer rows `a`..`b` drawn at `lo`..`hi`. */
export interface PostRows { a: number; b: number; lo: number; hi: number }

/** Drawn height of an actor's foot pad above its row (field.ts draws actors from it). */
export const ACTOR_FOOT = 16;

/** TB-267: fit the post below the bush skirt (the whole post moves down together, never squashed), so the elf stays at mid-meadow on a short
 *  view too (TB-232). A non-finite skirt (a zero-size canvas gives a NaN view) leaves the rows as they were: the rows are field state that every
 *  later frame reads, and one NaN written here once froze every frame after it until a reload. Returns whether the rows changed. */
export function fitPostRows(r: PostRows, skirtBase: number, h: number): boolean {
  if (!Number.isFinite(skirtBase)) return false;
  const sh = Math.max(0, skirtBase + DEPTH.postClear - ACTOR_FOOT * depthScale(r.a) - depthY(r.a));
  const lo = depthY(r.a) + sh, hi = Math.min(h - ACTOR_FOOT * 2, depthY(r.b) + sh);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return false;
  r.lo = lo; r.hi = hi; return true;
}
