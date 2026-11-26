import { NODE, NodeId, SkillNode } from '../data/skillTree';
import { costWave, nodeCost } from '../data/balance';
import { EventBus } from './events';
import { SimState, recompute } from './state';

export const rankOf = (s: SimState, id: NodeId): number => s.run.levels[id] ?? 0;
/** Deeper growth prototype (P-184 candidate): ranks past deepFrom cost deepMult^(extra rank) more. */
export const DEEP: Partial<Record<NodeId, { from: number; mult: number }>> = {};
export const costOf = (s: SimState, n: SkillNode): number => { const r = rankOf(s, n.id), d = DEEP[n.id];
  return Math.round(nodeCost(n.base, n.growth, r) * (d && r >= d.from ? d.mult ** (r - d.from + 1) : 1) * costWave(s.run.wave)); };
export const unlocked = (s: SimState, n: SkillNode): boolean => n.parent === null || rankOf(s, n.parent) > 0;
export const canBuy = (s: SimState, n: SkillNode): boolean =>
  s.run.fallen && rankOf(s, n.id) < n.max && unlocked(s, n) && s.run.starlight >= costOf(s, n);

export function buy(s: SimState, ev: EventBus, id: NodeId): boolean {
  const n = NODE[id];
  if (!canBuy(s, n)) return false;
  const r = rankOf(s, id);
  s.run.starlight -= costOf(s, n);
  s.run.levels[id] = r + 1;
  recompute(s);
  ev.push({ t: 'bought', id, firstRank: r === 0 });
  return true;
}
