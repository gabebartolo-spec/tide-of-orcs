import { BuildingId } from '../data/camp';
import { ACHIEVEMENTS } from '../data/achievements';
import { CAMP_DECOR_ART, CAMP_DRAW_ORDER, CAMP_SPOTS, CampDecorId } from '../data/presentation';

/** Camp decor (TB-250 batch 2): which trophies and path banners the player has earned, and the camp's draw order with them. */

const DECOR_OF = new Map<string, CampDecorId>();
for (const a of ACHIEVEMENTS) if (a.cosmetic && a.cosmetic in CAMP_DECOR_ART) DECOR_OF.set(a.id, a.cosmetic as CampDecorId);

/** The decor pieces earned, from the achievement ids in meta.ach.earned. */
export function campDecor(earned: readonly string[]): readonly CampDecorId[] {
  if (earned === last.earned && earned.length === last.n) return last.out;   // called every camp frame: rebuild only when the list grows
  const out: CampDecorId[] = [];
  for (const e of earned) { const d = DECOR_OF.get(e); if (d && !out.includes(d)) out.push(d); }
  last = { earned, n: earned.length, out };
  return out;
}
let last: { earned: readonly string[] | null; n: number; out: readonly CampDecorId[] } = { earned: null, n: 0, out: [] };

export type CampLayer = { readonly kind: 'building'; readonly id: BuildingId } | { readonly kind: 'decor'; readonly id: CampDecorId };

/** Buildings and earned decor, back to front by the scene y each stands on, so a nearer thing overlaps a farther one. */
export function campLayers(decor: readonly CampDecorId[]): CampLayer[] {
  const l: { y: number; layer: CampLayer }[] = CAMP_DRAW_ORDER.map((b) => ({ y: CAMP_SPOTS[b.id].y, layer: { kind: 'building', id: b.id } }));
  for (const d of decor) l.push({ y: CAMP_DECOR_ART[d].foot, layer: { kind: 'decor', id: d } });
  return l.sort((a, b) => a.y - b.y).map((e) => e.layer);
}
