import { BOSS_SCRIPT, BOSS_WAVE } from '../data/bosses';
import { FIELD, waveLoot } from '../data/balance';
import { EventBus } from './events';
import { SimState } from './state';
import { spawnOrc } from './step';

/** Boss waves unlocked so far this run and not yet summoned (one per BOSS_WAVE.every waves reached). */
export const bossesReady = (s: SimState): number => Math.floor(s.run.wave / BOSS_WAVE.every) - s.run.bossDone;

export const canSummonBoss = (s: SimState): boolean => !s.run.fallen && !s.run.boss && bossesReady(s) > 0;

/** Start a boss wave: a 60 s challenge of scripted mini-waves. Regular marching pauses until it ends. */
export function summonBoss(s: SimState, ev: EventBus): boolean {
  if (!canSummonBoss(s)) return false;
  s.run.bossDone++;
  s.run.boss = { t: 0, next: 0, left: BOSS_SCRIPT.reduce((n, m) => n + m.ys.length, 0) };
  ev.push({ t: 'bossStart' });
  return true;
}

/** Advance the running boss wave: march due mini-waves; end it when every orc is slain (cleared) or time runs out. */
export function bossStep(s: SimState, ev: EventBus, dt: number): void {
  const b = s.run.boss; if (!b) return;
  b.t += dt;
  while (b.next < BOSS_SCRIPT.length && BOSS_SCRIPT[b.next]!.at <= b.t) {
    const m = BOSS_SCRIPT[b.next++]!;
    for (const y of m.ys) spawnOrc(s, m.kind, y * FIELD.h, true);
  }
  const cleared = b.left <= 0;
  if (!cleared && b.t < BOSS_WAVE.secs) return;
  const loot = cleared ? BOSS_WAVE.clearLoot * waveLoot(s.run.wave) * s.stats.starMult : 0;
  s.run.starlight += loot; s.run.earned += loot; s.run.boss = null;
  // stragglers of a failed challenge keep marching as ordinary orcs
  s.orcs.forEach((o) => { o.champ = false; });
  ev.push({ t: 'bossEnd', cleared, loot });
}
