import { BARRICADE } from '../data/balance';
import { EventBus } from './events';
import { SimState } from './state';
import { SET_FX } from '../data/lootTables';
import { gain } from './prestige';

export const barFrac = (s: SimState): number => Math.max(0, s.run.barHp / s.stats.barMax);

export function barricadeHit(s: SimState, ev: EventBus, amount: number, y: number): void {
  const run = s.run;
  if (run.fallen) return; // a fallen wall takes no more hits: one fall per run (TB-216a)
  run.barHp -= Math.min(amount, BARRICADE.maxHitFrac * s.stats.barMax);
  ev.push({ t: 'barricadeHit', y, amount, frac: barFrac(s) });
  // Rootwarden 6: once per run, a wall below a quarter opens a window of free rallies
  if (s.stats.freeRally && !s.run.freeRallyUsed && run.barHp > 0 && barFrac(s) < SET_FX.freeRallyBelow) {
    s.run.freeRallyUsed = true; s.vanRespawn.fill(0); ev.push({ t: 'freeRally', secs: 0 }); // the fallen line returns at once (TB-167)
  }
  if (run.barHp > 0) return;
  if (s.stats.bulwark && !run.bulwarkUsed) {
    run.bulwarkUsed = true; run.barHp = s.stats.barMax * BARRICADE.bulwarkFrac;
    ev.push({ t: 'barricadeRegrow' });
    return;
  }
  run.barHp = 0; run.fallen = true;
  s.meta.bestWave = Math.max(s.meta.bestWave, run.wave);
  ev.push({ t: 'barricadeFell', wave: run.wave, kills: run.kills, runTime: run.runTime, heartwood: gain() });
}

export function barricadeRegen(s: SimState, dt: number): void {
  const { run, stats } = s;
  if (stats.barRegen > 0 && run.barHp < stats.barMax) run.barHp = Math.min(stats.barMax, run.barHp + stats.barMax * stats.barRegen * dt);
}
