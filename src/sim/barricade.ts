import { BARRICADE } from '../data/balance';
import { EventBus } from './events';
import { SimState } from './state';
import { MYTHIC_FX, SET_FX } from '../data/lootTables';
import { gain } from './prestige';

export const barFrac = (s: SimState): number => Math.max(0, s.run.barHp / s.stats.barMax);

export function barricadeHit(s: SimState, ev: EventBus, amount: number, y: number): void {
  const run = s.run;
  run.barHp -= Math.min(amount, BARRICADE.maxHitFrac * s.stats.barMax);
  ev.push({ t: 'barricadeHit', y, amount, frac: barFrac(s) });
  // Rootwarden 6: once per run, a wall below a quarter opens a window of free rallies
  if (s.stats.freeRally && !s.run.freeRallyUsed && run.barHp > 0 && barFrac(s) < SET_FX.freeRallyBelow) {
    s.run.freeRallyUsed = true; s.freeRallyT = SET_FX.freeRallySecs; ev.push({ t: 'freeRally', secs: SET_FX.freeRallySecs });
  }
  if (run.barHp > 0) return;
  if (s.stats.bulwark && !run.bulwarkUsed) {
    run.bulwarkUsed = true; run.barHp = s.stats.barMax * BARRICADE.bulwarkFrac;
    ev.push({ t: 'barricadeRegrow' });
    return;
  }
  // Heartwood Splinter: once per run the wall stands again; that run's Heartwood is halved (prestige.gain)
  if (s.stats.wallSplinter && !s.run.splinterUsed) {
    s.run.splinterUsed = true; run.barHp = s.stats.barMax * Math.min(1, MYTHIC_FX.splinterFrac * s.stats.echo);
    ev.push({ t: 'splinter' });
    return;
  }
  run.barHp = 0; run.fallen = true;
  s.meta.bestWave = Math.max(s.meta.bestWave, run.wave);
  ev.push({ t: 'barricadeFell', wave: run.wave, kills: run.kills, runTime: run.runTime, heartwood: gain(s) });
}

export function barricadeRegen(s: SimState, dt: number): void {
  const { run, stats } = s;
  if (stats.barRegen > 0 && run.barHp < stats.barMax) run.barHp = Math.min(stats.barMax, run.barHp + stats.barMax * stats.barRegen * dt);
}
