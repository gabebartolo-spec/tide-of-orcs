import { PLAYER } from '../data/balance';
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
  s.run.kills++; s.meta.lifetimeKills++; s.run.starlight += loot;
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

export function volley(s: SimState, sx: number, sy: number, tx: number, ty: number, mult: number, target: Orc | null): void {
  const n = s.stats.arrows;
  for (let i = 0; i < n; i++) {
    const ang = Math.atan2(ty - sy, tx - sx) + (i - (n - 1) / 2) * PLAYER.fanRad;
    shoot(s, 'arrow', sx, sy, ang, PLAYER.arrowSpeed, s.stats.dmg * mult, s.stats.pierce, target);
  }
}
