import { PRESTIGE } from '../data/balance';
import { EventBus } from './events';
import { SimState, freshRun } from './state';
import { hwRank, startRun } from './heartwood';

import { HW_FX } from '../data/heartwood';
import { growHeirloom } from './loot';

/** Heartwood a fall or a voluntary replant pays: a flat 1 (rule 1). Bosses pay the rest as they fall (P-142). */
export const gain = (): number => PRESTIGE.fallGain;
/** Voluntary replant: from wave 12 while the wall still stands. Forced replant: whenever the wall has fallen. */
export const canReplant = (s: SimState): boolean => s.run.fallen || (s.run.wave >= PRESTIGE.voluntaryWave && gain() > 0);

/** Voluntary replant mid-run (TB-136): from wave 12 the elf may leave a standing wall. The run ends as a fall does, so
 *  the summary and the Grove page follow, and Heartwood is the same as a fall at this wave. */
export const canPullBack = (s: SimState): boolean => !s.run.fallen && s.run.wave >= PRESTIGE.voluntaryWave && gain() > 0;

export function pullBack(s: SimState, ev: EventBus): boolean {
  if (!canPullBack(s)) return false;
  s.run.fallen = true; s.meta.bestWave = Math.max(s.meta.bestWave, s.run.wave);
  ev.push({ t: 'barricadeFell', wave: s.run.wave, kills: s.run.kills, runTime: s.run.runTime, heartwood: gain(), chosen: true });
  return true;
}

export function replant(s: SimState, ev: EventBus): number {
  if (!canReplant(s)) return 0;
  const hw = gain(), forced = s.run.fallen;
  s.meta.heartwood += hw; s.meta.prestiges++; s.meta.bestWave = Math.max(s.meta.bestWave, s.run.wave);
  if (hwRank(s.meta, 'hw_heirloom')) growHeirloom(s.meta.loot, HW_FX.heirloomIlvl);
  // The Grove tree and banked starlight carry into the next run (TB-136): the tree is bought only between runs
  const levels = s.run.levels, starlight = s.run.starlight;
  s.run = freshRun(); s.run.levels = levels; s.run.starlight = starlight;
  s.orcs.clear(); s.shots.clear(); s.vans.clear(); s.zones.clear();
  // run-only set and mythic state starts over with the run
  s.knifeN = 0; s.freeRallyT = 0; s.starAcc = 0; s.starfallT = 0;
  s.run.barHp = 0; startRun(s);
  ev.push({ t: 'replant', heartwood: hw, forced });
  return hw;
}

