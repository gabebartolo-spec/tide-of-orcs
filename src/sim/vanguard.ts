import { FIELD, VANGUARD, VanType, vanBaseHp, vanCost } from '../data/balance';
import { EventBus } from './events';
import { Orc, SimState, Vanguard } from './state';
import { damage } from './combat';

export function canRally(s: SimState, type: VanType): boolean {
  if (s.run.fallen || !s.stats.muster) return false;
  if (type === 'blade' && !s.stats.champion) return false;
  if (s.vans.count >= s.stats.vanCap) return false;
  return s.run.starlight >= vanCost(type, s.run.wave);
}

export function rally(s: SimState, ev: EventBus, type: VanType): boolean {
  if (!canRally(s, type)) return false;
  const v = placeVanguard(s, type); if (!v) return false;
  s.run.starlight -= vanCost(type, s.run.wave);
  ev.push({ t: 'vanguardRallied', type, x: v.x, y: v.y });
  return true;
}

/** Put a vanguard on the field at no cost and regardless of the line cap (rally, Standing Orders). */
export function placeVanguard(s: SimState, type: VanType): Vanguard | null {
  const v = s.vans.alloc(); if (!v) return null;
  const lane = s.vans.count - 1;
  const hp = vanBaseHp(type, s.run.wave) * s.stats.vanHp;
  v.type = type; v.x = FIELD.barX + 10; v.tx = FIELD.barX + VANGUARD.standX;
  v.y = FIELD.h / 2 + (lane % 2 ? 1 : -1) * Math.ceil(lane / 2) * VANGUARD.laneGap;
  v.hp = hp; v.maxhp = hp; v.swingT = 0; v.hitT = 0;
  return v;
}

export function vanguardStep(s: SimState, ev: EventBus, dt: number): void {
  const st = s.stats;
  s.vans.forEach((v: Vanguard) => {
    if (v.x < v.tx) v.x = Math.min(v.tx, v.x + VANGUARD.walkSpeed * dt);
    if (v.hitT > 0) v.hitT -= dt;
    if (st.vanMend > 0 && v.hp < v.maxhp) v.hp = Math.min(v.maxhp, v.hp + v.maxhp * st.vanMend * dt);
    const T = VANGUARD[v.type]; v.swingT += dt;
    if (v.swingT < T.cd) return;
    let hitAny = false;
    s.orcs.forEach((o: Orc) => {
      if (o.dead || (hitAny && !T.cleave)) return;
      if (Math.hypot(o.x - v.x, o.y - v.y) < T.reach + o.r) { damage(s, ev, o, st.dmg * T.dmg * st.vanDmg); hitAny = true; }
    });
    if (hitAny) v.swingT = 0;
  });
}

/** Called by the orc step: returns the vanguard this orc is engaging, if any. */
export function engagedVanguard(s: SimState, o: Orc): Vanguard | null {
  let found: Vanguard | null = null;
  s.vans.forEach((v) => { if (!found && Math.hypot(v.x - o.x, v.y - o.y) < o.r + VANGUARD.engageRange) found = v; });
  return found;
}

export function hurtVanguard(s: SimState, ev: EventBus, v: Vanguard, amount: number): void {
  v.hp -= amount; v.hitT = 0.12;
  ev.push({ t: 'vanguardHit', x: v.x, y: v.y });
  if (v.hp <= 0) { ev.push({ t: 'vanguardFell', type: v.type, x: v.x, y: v.y }); s.vans.release(v); }
}
