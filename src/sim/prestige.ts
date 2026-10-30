import { OFFLINE, PRESTIGE, prestigeGain, waveInterval, waveLoot } from '../data/balance';
import { EventBus } from './events';
import { SimState, freshRun, recompute } from './state';

export const gain = (s: SimState): number => prestigeGain(s.run.wave, s.run.kills);
/** Voluntary replant: from wave 12 while the wall still stands. Forced replant: whenever the wall has fallen. */
export const canReplant = (s: SimState): boolean => s.run.fallen || (s.run.wave >= PRESTIGE.voluntaryWave && gain(s) > 0);

export function replant(s: SimState, ev: EventBus): number {
  if (!canReplant(s)) return 0;
  const hw = gain(s), forced = s.run.fallen;
  s.meta.heartwood += hw; s.meta.prestiges++; s.meta.bestWave = Math.max(s.meta.bestWave, s.run.wave);
  s.run = freshRun();
  s.orcs.clear(); s.shots.clear(); s.vans.clear();
  s.run.barHp = 0; recompute(s); s.run.barHp = s.stats.barMax;
  ev.push({ t: 'replant', heartwood: hw, forced });
  return hw;
}

/** Starlight earned while away. Pure; caller passes seconds. Nothing accrues while fallen. */
export function offlineAward(s: SimState, secondsAway: number): number {
  if (s.run.fallen) return 0;
  const away = Math.min(secondsAway, OFFLINE.capSecs);
  if (away < OFFLINE.minAwaySecs) return 0;
  const perOrc = waveLoot(s.run.wave) * s.stats.starMult;
  const rate = (perOrc * s.stats.spawnMult) / waveInterval(s.run.wave) * s.stats.offline;
  const g = Math.floor(rate * away);
  s.run.starlight += g;
  return g;
}
