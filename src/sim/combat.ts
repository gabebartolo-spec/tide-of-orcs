import { LOB, PLAYER, SOURCES } from '../data/balance';
import { EventBus } from './events';
import { Orc, ProjectileKind, SimState } from './state';

export function nearestOrc(s: SimState, x: number, y: number, filter?: (o: Orc) => boolean): Orc | null {
  let best: Orc | null = null, bd = Infinity;
  s.orcs.forEach((o) => {
    if (o.dead || (filter && !filter(o))) return;
    const d = (o.x - x) ** 2 + (o.y - y) ** 2;
    if (d < bd) { bd = d; best = o; }
  });
  return best;
}

export function kill(s: SimState, ev: EventBus, o: Orc): void {
  if (o.dead) return;
  o.dead = true;
  const loot = o.loot * s.stats.starMult;
  s.run.kills++; s.meta.lifetimeKills++; s.run.starlight += loot; s.run.earned += loot;
  if (o.champ && s.run.boss) s.run.boss.left--;
  ev.push({ t: 'kill', x: o.x, y: o.y, loot, kind: o.kind });
}

export function damage(s: SimState, ev: EventBus, o: Orc, amt: number): void {
  if (o.dead) return;
  o.hp -= amt; o.hitT = 0.12;
  if (o.hp <= 0) kill(s, ev, o);
}

export function shoot(s: SimState, kind: ProjectileKind, x: number, y: number, ang: number, speed: number, dmg: number, pierce: number, target: Orc | null): void {
  const p = s.shots.alloc(); if (!p) return;
  p.kind = kind; p.x = x; p.y = y; p.vx = Math.cos(ang) * speed; p.vy = Math.sin(ang) * speed;
  p.dmg = dmg; p.pierce = pierce; p.life = 2.2; p.target = target; p.hit.clear();
}

/** The elf's arcing shot: lands at (tx, ty) after LOB.flight and strikes every orc within the circle, 1 + pierce times. */
export function lob(s: SimState, sx: number, sy: number, tx: number, ty: number): void {
  const p = s.shots.alloc(); if (!p) return;
  p.kind = 'lob'; p.sx = p.x = sx; p.sy = p.y = sy; p.tx = tx; p.ty = ty; p.t = 0; p.h = 0; p.vx = p.vy = 0;
  p.r = s.stats.radius; p.dmg = s.stats.dmg * LOB.dmgMult; p.pierce = s.stats.pierce; p.life = Infinity; p.target = null; p.hit.clear();
}

/** Strike every live orc inside the lob's circle. Each orc rolls its own crit; fire arrows set them all alight. */
export function impact(s: SimState, ev: EventBus, p: { tx: number; ty: number; r: number; dmg: number }): void {
  const st = s.stats;
  s.orcs.forEach((o) => {
    if (o.dead || (o.x - p.tx) ** 2 + (o.y - p.ty) ** 2 > (p.r + o.r) ** 2) return;
    const crit = s.rng.next() < st.crit;
    ev.push({ t: 'hit', x: o.x, y: o.y, crit });
    damage(s, ev, o, crit ? p.dmg * PLAYER.critMult : p.dmg);
    if (st.fire) o.burn = SOURCES.burnSecs;
  });
  ev.push({ t: 'impact', x: p.tx, y: p.ty, r: p.r });
}

/** Where a player would drop the circle: the orc with the most others inside radius r. A player model for tests and the balance sim; the game itself never aims for the player. */
export function crowdAim(s: SimState, r: number): { x: number; y: number } | null {
  let best: Orc | null = null, bn = -1;
  s.orcs.forEach((o) => { if (o.dead) return; let n = 0; s.orcs.forEach((q) => { if (!q.dead && (q.x - o.x) ** 2 + (q.y - o.y) ** 2 < r * r) n++; }); if (n > bn) { bn = n; best = o; } });
  const b = best as Orc | null;
  return b ? { x: b.x, y: b.y } : null;
}

export function volley(s: SimState, sx: number, sy: number, tx: number, ty: number, mult: number, target: Orc | null): void {
  const n = s.stats.arrows;
  for (let i = 0; i < n; i++) {
    const ang = Math.atan2(ty - sy, tx - sx) + (i - (n - 1) / 2) * PLAYER.fanRad;
    shoot(s, 'arrow', sx, sy, ang, PLAYER.arrowSpeed, s.stats.dmg * mult, s.stats.pierce, target);
  }
}
