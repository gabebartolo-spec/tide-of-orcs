import { BARRICADE } from '../data/balance';
import { GROUND } from '../data/presentation';

/** Barricade look tier (TB-209): how many GROUND.wallTiers thresholds the wall's max health (vs its base) has reached. Reads Stats, never node ids. */
export const wallTier = (barMax: number): number => GROUND.wallTiers.at.filter((a) => barMax / BARRICADE.baseHp >= a).length;
