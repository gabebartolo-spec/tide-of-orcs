import { ORC_FX } from '../data/orcs';
import { BARRICADE, FIELD, ORC_WOB, VANGUARD } from '../data/balance';
import { engagedVanguard } from '../sim/vanguard';
import { Orc, SimState, Vanguard } from '../sim/state';
import { ActorState } from './sprites';

/** Which sprite loop an orc plays: it swings while at the wall or held by a vanguard (the same tests as the sim's orc step). */
export function orcState(s: SimState, o: Orc): ActorState {
  // a halted shaman casts and a halted war drummer drums (TB-087)
  const halt = o.kind === 'shaman' ? ORC_FX.shamanHalt : o.kind === 'drummer' ? ORC_FX.drummerHalt : 0;
  if (halt) return o.x <= FIELD.barX + FIELD.barW + halt ? 'attack' : 'walk';
  return o.x <= FIELD.barX + FIELD.barW + o.r || engagedVanguard(s, o) ? 'attack' : 'walk';
}

/** Seconds into an orc's sprite loop. `wob` starts at a random phase and advances ORC_WOB per sim second, so this runs at
 *  real speed, offset per orc. Adding wob to a clock instead played clips at 9x (TB-133). */
export const orcAnimT = (o: Orc): number => o.wob / ORC_WOB;

/** A vanguard swings while an orc is in reach, walks while it marches (TB-156), and otherwise holds its stance. */
export function vanState(s: SimState, v: Vanguard): ActorState {
  const reach = VANGUARD[v.type].reach;
  let near = false;
  s.orcs.forEach((o) => { if (!near && !o.dead && Math.hypot(o.x - v.x, o.y - v.y) < reach + o.r) near = true; });
  return near ? 'attack' : v.mv ? 'walk' : 'idle';
}

/**
 * Seconds into an attack clip, played once per sim swing at its real rate with its strike frame on the hit (TB-161).
 * `swingT` counts up from the last hit to `cd`; `strike` is where the blow lands in the clip (0..1); `dur` its length.
 * Before the hit the clip runs toward the strike; after it the follow-through plays out, then frame 0 holds.
 */
export function swingClipT(swingT: number, cd: number, dur: number, strike: number): number {
  const s = strike * dur, to = s - (cd - swingT);
  if (to >= 0) return Math.min(to, s);
  return s + swingT < dur ? s + swingT : 0;
}

/** Orc attack clip time from its swing timer; the strike sits at `strike` of the clip. */
export const orcSwingT = (o: Orc, dur: number, strike: number): number => swingClipT(o.swingT, BARRICADE.orcSwing, dur, strike);
