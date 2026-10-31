import { ARROWS, FIELD, LOB, PLAYER, SOURCES } from '../data/balance';
import { EventBus } from './events';
import { Orc, ProjectileKind, SimState, Zone, recompute } from './state';
import { rollDrop } from './lootRoll';
import { SPOILS_FX } from '../data/lootTables';
import { pickUp } from './loot';
import { lootMods } from './gear';
import { MYTHIC_FX, SET_FX } from '../data/lootTables';

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
  // Shatter: a chilled orc bursts and strikes those around it (which may shatter in turn; each orc dies once).
  if (o.chill > 0 && s.stats.shatter > 0) {
    const R = ARROWS.shatter.radius;
    ev.push({ t: 'shatter', x: o.x, y: o.y, r: R });
    s.orcs.forEach((q) => { if (!q.dead && (q.x - o.x) ** 2 + (q.y - o.y) ** 2 < (R + q.r) ** 2) damage(s, ev, q, s.stats.dmg * s.stats.shatter); });
  }
  // Starfall Cloak: starlight gathered calls a shot from the sky on the strongest orc
  if (s.stats.starCloak) { s.starAcc += loot; if (s.starAcc >= MYTHIC_FX.starfallEvery / s.stats.echo && s.starfallT <= 0) {
    s.starAcc = 0; s.starfallT = MYTHIC_FX.starfallCd;
    let top: Orc | null = null; s.orcs.forEach((q) => { if (!q.dead && (!top || q.hp > top.hp)) top = q; });
    if (top) { const t = top as Orc; ev.push({ t: 'starCloak', x: t.x, y: t.y }); damage(s, ev, t, s.stats.dmg * MYTHIC_FX.starfallMult); }
  } }
  // Emberwright 4: a burning orc's flames pass to its nearest neighbours
  if (o.burn > 0) for (let i = 0; i < s.stats.burnSpread; i++) {
    const n = nearestOrc(s, o.x, o.y, (q) => q.burn <= 0 && (q.x - o.x) ** 2 + (q.y - o.y) ** 2 < SET_FX.spreadReach ** 2);
    if (!n) break;
    n.burn = SOURCES.burnSecs; ev.push({ t: 'burnSpread', x: o.x, y: o.y, tx: n.x, ty: n.y });
  }
  dropLoot(s, ev, o);
}

/** Roll this kill's drop (TB-094) and pick it up; re-derive stats if what is worn changed. */
function dropLoot(s: SimState, ev: EventBus, o: Orc): void {
  const l = s.meta.loot, st = s.stats, boss = o.kind === 'boss', worn = JSON.stringify(l.equipped);
  const mods = { ...lootMods(l, st), bump: boss && st.hoard ? 1 : 0 };
  // Warboss Tithe: bosses drop twice; Trophy: kills on every tenth wave roll twice
  const rolls = boss ? st.bossDrops : st.trophy && s.run.wave % SPOILS_FX.trophyEvery === 0 ? 2 : 1;
  for (let i = 0; i < rolls; i++) {
    const it = rollDrop(s.lootRng, l, o.kind, s.run.wave, s.meta.prestiges, mods);
    if (!it) continue;
    pickUp(l, it, s.lootPolicy, st.satchelCap, st);
    ev.push({ t: 'loot', x: o.x, y: o.y, uid: it.uid, rarity: it.rarity, kept: l.items.includes(it) });
  }
  if (JSON.stringify(l.equipped) !== worn) recompute(s);
}

/** Set-bonus damage taken: bleeding (Nightknife 4) and pinned (Siegebreaker 6) orcs take more from every source. */
export const takenMult = (s: SimState, o: Orc): number => (o.bleed > 0 ? 1 + s.stats.bleedAmp : 1) * (o.pin > 0 ? SET_FX.pinMult : 1);

/** Leave a patch of ground (TB-099); silently skipped when the zone pool is full. */
export function addZone(s: SimState, kind: Zone['kind'], x: number, y: number, r: number, life: number): void {
  const z = s.zones.alloc(); if (!z) return;
  z.kind = kind; z.x = x; z.y = y; z.r = r; z.life = life; z.used = false;
}

export function damage(s: SimState, ev: EventBus, o: Orc, amt: number): void {
  if (o.dead) return;
  o.hp -= amt * takenMult(s, o); o.hitT = 0.12;
  if (o.hp <= 0) kill(s, ev, o);
}

export function shoot(s: SimState, kind: ProjectileKind, x: number, y: number, ang: number, speed: number, dmg: number, pierce: number, target: Orc | null): void {
  const p = s.shots.alloc(); if (!p) return;
  p.kind = kind; p.x = x; p.y = y; p.vx = Math.cos(ang) * speed; p.vy = Math.sin(ang) * speed;
  p.dmg = dmg; p.pierce = pierce; p.life = 2.2; p.target = target; p.hit.clear(); p.back = false;
}

/** The elf's arcing shot: lands at (tx, ty) after LOB.flight and strikes every orc within the circle, 1 + pierce times. */
export function lob(s: SimState, sx: number, sy: number, tx: number, ty: number): void {
  const p = s.shots.alloc(); if (!p) return;
  p.kind = 'lob'; p.sx = p.x = sx; p.sy = p.y = sy; p.tx = tx; p.ty = ty; p.t = 0; p.h = 0; p.vx = p.vy = 0;
  p.r = s.stats.radius; p.dmg = s.stats.dmg * LOB.dmgMult; p.pierce = s.stats.pierce; p.life = Infinity; p.target = null; p.hit.clear();
}

/** Strike every live orc inside the lob's circle. Each orc rolls its own crit; fire, frost and Thunderclap mark them all.
 *  Moonveil: with the Moonbow owned every lob is a moon shot, which always crits at 4 pieces (a rolled crit still wins) and leaves a Moonwell at 6.
 *  Emberwright 6: fire lobs leave Cinderground.
 *  `first` (a lob's first strike, not a Longshaft repeat or a Starfall arrow) also looses Shock Arrows and Rebound. */
export function impact(s: SimState, ev: EventBus, p: { tx: number; ty: number; r: number; dmg: number }, first = false): void {
  const st = s.stats, moon = st.homing && st.moonCrit > 0;
  let core: Orc | null = null, cd = Infinity;
  const struck = new Set<Orc>();
  s.orcs.forEach((o) => {
    const d = (o.x - p.tx) ** 2 + (o.y - p.ty) ** 2;
    if (o.dead || d > (p.r + o.r) ** 2) return;
    if (d < cd) { cd = d; core = o; }
    struck.add(o);
    const crit = s.rng.next() < st.crit;
    ev.push({ t: 'hit', x: o.x, y: o.y, crit: crit || moon, src: 'lob' });
    if (st.fire) o.burn = SOURCES.burnSecs;
    if (st.slow) o.chill = ARROWS.frost.secs;
    if (st.stun) o.stun = ARROWS.stun.secs;
    damage(s, ev, o, p.dmg * (crit ? PLAYER.critMult : moon ? SET_FX.moonCritMult : 1));
  });
  ev.push({ t: 'impact', x: p.tx, y: p.ty, r: p.r });
  if (st.fire && st.cinder) addZone(s, 'cinder', p.tx, p.ty, p.r, SET_FX.cinderSecs);
  if (st.homing && st.moonwell) addZone(s, 'moonwell', p.tx, p.ty, p.r, SET_FX.wellSecs);
  if (st.fire) ev.push({ t: 'fireStrike', x: p.tx, y: p.ty, r: p.r });
  if (st.slow) ev.push({ t: 'chill', x: p.tx, y: p.ty, r: p.r });
  if (st.stun && core) ev.push({ t: 'stun', x: p.tx, y: p.ty, r: p.r });
  if (!first) return;
  const c = core as Orc | null;
  if (st.shock && c) {
    // Lightning from the orc nearest the strike's centre to the nearest orcs outside the circle.
    const pts: [number, number][] = [], seen = new Set<Orc>();
    const out = (o: Orc): boolean => (o.x - p.tx) ** 2 + (o.y - p.ty) ** 2 > (p.r + o.r) ** 2 && !seen.has(o) && (o.x - c.x) ** 2 + (o.y - c.y) ** 2 < ARROWS.shock.jump ** 2;
    for (let i = 0; i < ARROWS.shock.targets; i++) {
      const o = nearestOrc(s, c.x, c.y, out); if (!o) break;
      seen.add(o); pts.push([o.x, o.y]); damage(s, ev, o, p.dmg * ARROWS.shock.mult);
    }
    ev.push({ t: 'shock', x: c.x, y: c.y, pts });
  }
  if (st.bounce) bounce(s, p.tx, p.ty, p.dmg * ARROWS.bounce.falloff, st.bounce - 1, struck);
}

/** Rebound: a magic bolt from (x, y) seeking the nearest unstruck orc within reach; `hops` more after this one. */
export function bounce(s: SimState, x: number, y: number, dmg: number, hops: number, hit: Set<Orc>): void {
  const tg = nearestOrc(s, x, y, (o) => !hit.has(o) && (o.x - x) ** 2 + (o.y - y) ** 2 < ARROWS.bounce.jump ** 2);
  if (!tg) return;
  const p = s.shots.alloc(); if (!p) return;
  p.kind = 'bounce'; p.x = x; p.y = y; p.vx = p.vy = 0; p.dmg = dmg; p.pierce = hops; p.life = 2.2; p.target = tg;
  p.hit.clear(); hit.forEach((o) => p.hit.add(o));
}

/** Starfall: arrows fall straight down on up to `arrows` random orcs across the plain (random ground where there are fewer), `stagger` s apart. */
export function starfall(s: SimState, ev: EventBus): void {
  const S = ARROWS.starfall, foes: Orc[] = [];
  s.orcs.forEach((o) => { if (!o.dead && o.x > FIELD.barX + FIELD.barW && o.x < FIELD.w) foes.push(o); });
  for (let i = 0; i < S.arrows; i++) {
    const p = s.shots.alloc(); if (!p) return;
    let tx: number, ty: number;
    if (foes.length) { const o = foes.splice(Math.floor(s.rng.next() * foes.length), 1)[0]!; tx = Math.max(FIELD.barX + FIELD.barW + o.r, o.x - o.spd * (S.flight + i * S.stagger)); ty = o.y; }
    else { tx = FIELD.barX + 60 + s.rng.next() * (FIELD.w - FIELD.barX - 100); ty = 40 + s.rng.next() * (FIELD.h - 80); }
    p.kind = 'star'; p.sx = p.x = p.tx = tx; p.sy = p.y = p.ty = ty; p.t = -i * S.stagger; p.h = S.height; p.vx = p.vy = 0;
    p.r = S.r; p.dmg = s.stats.dmg * LOB.dmgMult; p.pierce = 0; p.life = Infinity; p.target = null; p.hit.clear();
  }
  ev.push({ t: 'starfall' });
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
