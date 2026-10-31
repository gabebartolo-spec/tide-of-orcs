import { FIELD, VANGUARD } from '../data/balance';
import { engagedVanguard } from '../sim/vanguard';
import { Orc, SimState, Vanguard } from '../sim/state';
import { ActorState } from './sprites';

/** Which sprite loop an orc plays: it swings while at the wall or held by a vanguard (the same tests as the sim's orc step). */
export function orcState(s: SimState, o: Orc): ActorState {
  return o.x <= FIELD.barX + FIELD.barW + o.r || engagedVanguard(s, o) ? 'attack' : 'walk';
}

/** A vanguard walks to its stand, swings while an orc is in reach, and otherwise holds its stance. */
export function vanState(s: SimState, v: Vanguard): ActorState {
  if (v.x < v.tx) return 'walk';
  const reach = VANGUARD[v.type].reach;
  let near = false;
  s.orcs.forEach((o) => { if (!near && !o.dead && Math.hypot(o.x - v.x, o.y - v.y) < reach + o.r) near = true; });
  return near ? 'attack' : 'idle';
}
