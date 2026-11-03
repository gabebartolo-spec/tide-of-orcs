import { BARRICADE } from '../data/balance';
import { GROUND } from '../data/presentation';
import type { Stats } from '../sim/stats';

/** Wall score (TB-209): max health vs base, plus GROUND.wallTiers.perPerk for each wall perk that adds no max health. */
export const wallScore = (st: Pick<Stats, 'barMax' | 'barRegen' | 'bulwark'>): number =>
  st.barMax / BARRICADE.baseHp + GROUND.wallTiers.perPerk * (Number(st.barRegen > 0) + Number(st.bulwark));

/** Barricade look tier (TB-209): how many GROUND.wallTiers thresholds the wall score has reached. Reads Stats, never node ids. */
export const wallTier = (st: Pick<Stats, 'barMax' | 'barRegen' | 'bulwark'>): number => {
  const v = wallScore(st);
  return GROUND.wallTiers.at.filter((a) => v >= a).length;
};

/** One fixed break test for every barricade panel or plank (golden-ratio scatter on `seed`), so damage never flickers and
 *  every layer agrees on which panels are broken. Panels above the field top always stand. */
export const panelAlive = (y: number, h: number, frac: number, seed: number): boolean =>
  y < 0 || y / h < frac || (seed * GROUND.wallTiers.breakScatter) % 1 < frac;
