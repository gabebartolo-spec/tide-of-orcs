import { BUILDING, BUILDINGS, BuildingId } from '../data/camp';
import { EventBus } from './events';
import { hwSpendable } from './heartwood';
import { MetaState, SimState, recompute } from './state';

/** Elf encampment (TB-188a): permanent buildings, bought like the Heartwood tree (only while the run is fallen). */
export const campLevel = (m: MetaState, id: BuildingId): number => m.camp.levels[id] ?? 0;
/** Heartwood paid into buildings so far. */
export const campSpent = (m: MetaState): number =>
  BUILDINGS.reduce((sum, b) => sum + b.costs.slice(0, campLevel(m, b.id)).reduce((a, c) => a + c.hw, 0), 0);
export const campCost = (m: MetaState, id: BuildingId): { hw: number; mat: number } | null => BUILDING[id].costs[campLevel(m, id)] ?? null;
export function canUpgrade(s: SimState, id: BuildingId): boolean {
  const c = campCost(s.meta, id);
  return s.run.fallen && c !== null && hwSpendable(s) >= c.hw && (s.meta.camp.mats[BUILDING[id].mat] ?? 0) >= c.mat;
}
export function upgradeBuilding(s: SimState, ev: EventBus, id: BuildingId): boolean {
  if (!canUpgrade(s, id)) return false;
  const c = campCost(s.meta, id)!, mat = BUILDING[id].mat, m = s.meta.camp;
  m.mats[mat] = (m.mats[mat] ?? 0) - c.mat;
  m.levels[id] = campLevel(s.meta, id) + 1;
  recompute(s, { heal: true });
  ev.push({ t: 'buildingUpgraded', id, level: m.levels[id]! });
  return true;
}
