import { PRESTIGE, prestigeGain } from '../data/balance';
import { EventBus } from './events';
import { SimState, freshRun } from './state';
import { startRun } from './heartwood';

export const gain = (s: SimState): number => prestigeGain(s.run.wave, s.run.kills);
/** Voluntary replant: from wave 12 while the wall still stands. Forced replant: whenever the wall has fallen. */
export const canReplant = (s: SimState): boolean => s.run.fallen || (s.run.wave >= PRESTIGE.voluntaryWave && gain(s) > 0);

export function replant(s: SimState, ev: EventBus): number {
  if (!canReplant(s)) return 0;
  const hw = gain(s), forced = s.run.fallen;
  s.meta.heartwood += hw; s.meta.prestiges++; s.meta.bestWave = Math.max(s.meta.bestWave, s.run.wave);
  s.run = freshRun();
  s.orcs.clear(); s.shots.clear(); s.vans.clear();
  s.run.barHp = 0; startRun(s);
  ev.push({ t: 'replant', heartwood: hw, forced });
  return hw;
}

