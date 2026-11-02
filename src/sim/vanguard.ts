import { FIELD, VANGUARD, VanType, vanBaseHp } from '../data/balance';
import { EventBus } from './events';
import { Orc, SimState, Vanguard } from './state';
import { damage, unitHit } from './combat';

/** Which kind fills the next line slot: with Bladedancer, half the line (rounded down) are blades. */
function lineType(s: SimState): VanType {
  if (!s.stats.champion) return 'spear';
  let blades = 0; s.vans.forEach((v) => { if (v.line && v.type === 'blade') blades++; });
  return blades < Math.floor(s.stats.vanCap / 2) ? 'blade' : 'spear';
}

const laneY = (lane: number): number => FIELD.h / 2 + (lane % 2 ? 1 : -1) * Math.ceil(lane / 2) * VANGUARD.laneGap;

/** Put a vanguard on the field at no cost and regardless of the line cap (line slots, Standing Orders). */
export function placeVanguard(s: SimState, type: VanType, line = false): Vanguard | null {
  const used = new Set<number>(); s.vans.forEach((o) => used.add(o.ty));
  const v = s.vans.alloc(); if (!v) return null;
  let lane = 0; while (used.has(laneY(lane))) lane++;
  const hp = vanBaseHp(type, s.run.wave) * s.stats.vanHp;
  v.type = type; v.line = line; v.x = FIELD.barX + 10; v.tx = FIELD.barX + VANGUARD.standX;
  v.y = v.ty = laneY(lane); v.mv = true; v.face = 1;
  v.hp = hp; v.maxhp = hp; v.swingT = 0; v.hitT = 0;
  return v;
}

/** The standing line (TB-167): Muster keeps vanCap vanguard on the field; each one that falls returns after a timer. */
function lineStep(s: SimState, ev: EventBus, dt: number): void {
  const q = s.vanRespawn;
  if (!s.stats.muster || s.run.fallen) { q.length = 0; return; }
  for (let i = q.length - 1; i >= 0; i--) if ((q[i]! -= dt) <= 0) q.splice(i, 1);
  let line = 0; s.vans.forEach((v) => { if (v.line) line++; });
  while (line + q.length < s.stats.vanCap) {
    const type = lineType(s), v = placeVanguard(s, type, true); if (!v) break;
    ev.push({ t: 'vanguardRallied', type, x: v.x, y: v.y }); line++;
  }
}

export function vanguardStep(s: SimState, ev: EventBus, dt: number): void {
  const st = s.stats;
  lineStep(s, ev, dt);
  const claimed = new Set<Orc>();
  s.vans.forEach((v: Vanguard) => {
    const U = st.units[v.type];
    march(s, v, VANGUARD.walkSpeed * U.spd * dt, claimed);
    if (v.hitT > 0) v.hitT -= dt;
    if (st.vanMend > 0 && v.hp < v.maxhp) v.hp = Math.min(v.maxhp, v.hp + v.maxhp * st.vanMend * dt);
    const T = VANGUARD[v.type]; v.swingT += dt * U.rate;
    if (v.swingT < T.cd) return;
    let hitAny = false;
    s.orcs.forEach((o: Orc) => {
      if (o.dead || (hitAny && !T.cleave)) return;
      if (Math.hypot(o.x - v.x, o.y - v.y) < T.reach + o.r) {
        if (!hitAny) ev.push({ t: 'vanStrike', type: v.type, x: v.x, y: v.y, tx: o.x, ty: o.y });
        ev.push({ t: 'bleed', x: o.x, y: o.y, r: o.r });
        damage(s, ev, o, unitHit(s, U, st.dmg * T.dmg * st.vanDmg * U.dmg)); hitAny = true;
      }
    });
    if (hitAny) v.swingT = 0;
  });
  spread(s, dt);
}

/** Vanguard closer than VANGUARD.spread step apart along the line between them (TB-173). */
function spread(s: SimState, dt: number): void {
  const vs: Vanguard[] = []; s.vans.forEach((v) => { vs.push(v); });
  const push = VANGUARD.walkSpeed * dt;
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
    const a = vs[i]!, b = vs[j]!; let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= VANGUARD.spread) continue;
    if (d < 1e-6) { dx = 0; dy = 1; d = 1; }  // exactly stacked: split along the lane axis
    const k = Math.min(push, (VANGUARD.spread - d) / 2) / d;
    a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k;
  }
}

/** Vanguard only advance on orcs that have crossed halfway from the field's edge to the barricade (TB-169). */
const HALF_X = (FIELD.barX + FIELD.w) / 2;

/** The live orc past halfway nearest this vanguard, or null when none has come that close. Orcs in `claimed` are
 *  another vanguard's target this step and are skipped while an unclaimed one is past halfway (TB-173). */
export function nearestOrcTo(s: SimState, v: Vanguard, claimed?: Set<Orc>): Orc | null {
  let best: Orc | null = null, bd = Infinity, free: Orc | null = null, fd = Infinity;
  s.orcs.forEach((o) => {
    if (o.dead || o.x > HALF_X) return; const d = Math.hypot(o.x - v.x, o.y - v.y);
    if (d < bd) { bd = d; best = o; }
    if (!claimed?.has(o) && d < fd) { fd = d; free = o; }
  });
  return free ?? best;
}

/** March (TB-156): walk to the nearest orc no other vanguard has claimed (TB-173) until it is in reach, or back to the home stand when no orc is past halfway. */
function march(s: SimState, v: Vanguard, step: number, claimed: Set<Orc>): void {
  const o = nearestOrcTo(s, v, claimed); if (o) claimed.add(o);
  const gx = o ? o.x : v.tx, gy = o ? o.y : v.ty, stop = o ? VANGUARD[v.type].reach * VANGUARD.closeIn + o.r : 0;
  const dx = gx - v.x, dy = gy - v.y, d = Math.hypot(dx, dy), go = Math.min(step, d - stop);
  v.mv = go > 1e-6;
  if (!v.mv) { if (!o) v.face = 1; return; }  // home again: turn back to face the field (TB-170)
  v.x += (dx / d) * go; v.y += (dy / d) * go;
  if (Math.abs(dx) > 1e-6) v.face = dx > 0 ? 1 : -1;
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
  if (v.hp <= 0) { ev.push({ t: 'vanguardFell', type: v.type, x: v.x, y: v.y }); if (v.line) s.vanRespawn.push(VANGUARD.respawn * s.stats.vanRespawn); s.vans.release(v); }
}
