import { HW_FX, HW_NODE, HW_NODES, HwId } from '../data/heartwood';
import { BOSS_WAVE } from '../data/bosses';
import { EventBus } from './events';
import { MetaState, SimState, recompute } from './state';
import { placeVanguard } from './vanguard';

export const hwRank = (m: MetaState, id: HwId): number => m.hwLevels[id] ?? 0;
/** Heartwood paid into the tree so far. The passive Heartwood bonus counts all Heartwood earned, spent or not. */
export const hwSpent = (m: MetaState): number =>
  HW_NODES.reduce((sum, n) => sum + n.costs.slice(0, hwRank(m, n.id)).reduce((a, c) => a + c, 0), 0);
export const hwAvailable = (m: MetaState): number => m.heartwood - hwSpent(m);
export const hwCost = (m: MetaState, id: HwId): number | null => HW_NODE[id].costs[hwRank(m, id)] ?? null;
export const hwUnlocked = (m: MetaState, id: HwId): boolean => (HW_NODE[id].req ?? []).every(([r, n]) => hwRank(m, r) >= n);
export const canBuyHw = (m: MetaState, id: HwId): boolean => { const c = hwCost(m, id); return c !== null && hwUnlocked(m, id) && hwAvailable(m) >= c; };

export function buyHw(s: SimState, ev: EventBus, id: HwId): boolean {
  if (!canBuyHw(s.meta, id)) return false;
  s.meta.hwLevels[id] = hwRank(s.meta, id) + 1;
  recompute(s);
  ev.push({ t: 'hwBought', id });
  return true;
}

/** Apply the run-start Heartwood nodes to a fresh run. Boss waves skipped by Early Dawn are not owed. */
export function startRun(s: SimState): void {
  const m = s.meta;
  s.run.wave = 1 + HW_FX.dawnWaves * hwRank(m, 'hw_dawn');
  s.run.bossDone = Math.floor(s.run.wave / BOSS_WAVE.every);
  if (hwRank(m, 'hw_wolf')) s.run.levels.wolf = 1;
  recompute(s); s.run.barHp = s.stats.barMax;
  for (let i = 0; i < hwRank(m, 'hw_orders'); i++) placeVanguard(s, 'spear');
}
