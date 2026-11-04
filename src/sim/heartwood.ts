import { HW_FX, HW_NODE, HW_NODES, HwId } from '../data/heartwood';
import { BOSS_WAVE } from '../data/bosses';
import { PRESTIGE } from '../data/balance';
import { EventBus } from './events';
import { campSpent } from './camp';
import { MetaState, SimState, recompute } from './state';
import { placeVanguard } from './vanguard';

export const hwRank = (m: MetaState, id: HwId): number => m.hwLevels[id] ?? 0;
/** Heartwood paid into the tree so far. The passive Heartwood bonus counts all Heartwood earned, spent or not. */
export const hwSpent = (m: MetaState): number =>
  HW_NODES.reduce((sum, n) => sum + n.costs.slice(0, hwRank(m, n.id)).reduce((a, c) => a + c, 0), 0);
/** Heartwood left: earned minus the tree and the encampment (TB-188a). */
export const hwAvailable = (m: MetaState): number => m.heartwood - hwSpent(m) - campSpent(m);
/** A loaded save whose tree and buildings cost more than it ever earned (seen: all four buildings at level 3, 124 Heartwood,
 *  with 0 earned, so the HUD read -124 / 0) is lifted to what those levels cost: owned levels prove that much was earned. */
export function repairHeartwood(m: MetaState): void { m.heartwood = Math.max(m.heartwood, hwSpent(m) + campSpent(m)); }
export const hwCost = (m: MetaState, id: HwId): number | null => HW_NODE[id].costs[hwRank(m, id)] ?? null;
export const hwUnlocked = (m: MetaState, id: HwId): boolean => (HW_NODE[id].req ?? []).every(([r, n]) => hwRank(m, r) >= n);
/** Heartwood is spent only at a prestige (director, 1 Nov): while the run is fallen (a fall or a voluntary replant).
 *  The fall's payout (0 since TB-171) counts at once, before Replant adds it to meta, so it can be spent on that Grove page. */
export const hwPending = (s: SimState): number => (s.run.fallen ? PRESTIGE.fallGain : 0);
export const hwSpendable = (s: SimState): number => hwAvailable(s.meta) + hwPending(s);
export const canBuyHw = (s: SimState, id: HwId): boolean => { const c = hwCost(s.meta, id); return s.run.fallen && c !== null && hwUnlocked(s.meta, id) && hwSpendable(s) >= c; };

export function buyHw(s: SimState, ev: EventBus, id: HwId): boolean {
  if (!canBuyHw(s, id)) return false;
  s.meta.hwLevels[id] = hwRank(s.meta, id) + 1;
  recompute(s, { heal: true });
  ev.push({ t: 'hwBought', id });
  return true;
}

/** Apply the run-start Heartwood nodes to a fresh run. Boss waves skipped by Early Dawn are not owed. */
export function startRun(s: SimState): void {
  const m = s.meta;
  s.run.wave = Math.max(m.checkpoint, 1 + HW_FX.dawnWaves * hwRank(m, 'hw_dawn'));
  s.run.bossDone = Math.floor(s.run.wave / BOSS_WAVE.every);
  if (hwRank(m, 'hw_wolf')) s.run.levels.wolf = 1;
  recompute(s); s.run.barHp = s.stats.barMax;
  placeStandingOrders(s);
}

/** Standing Orders spearmen (free, off the line). Vanguard are not saved, so a load calls this too (TB-219). */
export function placeStandingOrders(s: SimState): void {
  if (s.run.fallen) return;
  for (let i = 0; i < hwRank(s.meta, 'hw_orders'); i++) placeVanguard(s, 'spear');
}
