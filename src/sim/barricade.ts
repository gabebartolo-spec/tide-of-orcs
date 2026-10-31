import { BARRICADE, prestigeGain } from '../data/balance';
import { EventBus } from './events';
import { SimState } from './state';
import { SET_FX } from '../data/lootTables';

export const barFrac = (s: SimState): number => Math.max(0, s.run.barHp / s.stats.barMax);

export function barricadeHit(s: SimState, ev: EventBus, amount: number, y: number): void {
  const run = s.run;
  run.barHp -= amount;
  ev.push({ t: 'barricadeHit', y, amount, frac: barFrac(s) });
  // Rootwarden 6: once per run, a wall below a quarter opens a window of free rallies
  if (s.stats.freeRally && !s.freeRallyUsed && run.barHp > 0 && barFrac(s) < SET_FX.freeRallyBelow) {
    s.freeRallyUsed = true; s.freeRallyT = SET_FX.freeRallySecs; ev.push({ t: 'freeRally', secs: SET_FX.freeRallySecs });
  }
  if (run.barHp > 0) return;
  if (s.stats.bulwark && !run.bulwarkUsed) {
    run.bulwarkUsed = true; run.barHp = s.stats.barMax * BARRICADE.bulwarkFrac;
    ev.push({ t: 'barricadeRegrow' });
    return;
  }
  run.barHp = 0; run.fallen = true;
  s.meta.bestWave = Math.max(s.meta.bestWave, run.wave);
  ev.push({ t: 'barricadeFell', wave: run.wave, kills: run.kills, runTime: run.runTime, heartwood: prestigeGain(run.wave, run.kills) });
}

export function barricadeRegen(s: SimState, dt: number): void {
  const { run, stats } = s;
  if (stats.barRegen > 0 && run.barHp < stats.barMax) run.barHp = Math.min(stats.barMax, run.barHp + stats.barMax * stats.barRegen * dt);
}
