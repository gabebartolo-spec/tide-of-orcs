import { wallX } from './wallLine';
import { BARRICADE } from '../data/balance';
import { FIREBALL, ORC_FX, ORC_TYPES } from '../data/orcs';
import { BOSS_FX } from '../data/bosses';
import { barricadeHit } from './barricade';
import { castFireball } from './combat';
import { EventBus } from './events';
import { Orc, Projectile, SimState } from './state';
import { hurtVanguard } from './vanguard';


/** The orc shaman (TB-087): a fireball at the nearest vanguard, or at the wall straight ahead when none stand. It strikes
 *  for FIREBALL.gruntHits of a grunt's swing (a war drum's beat included). */
export function shamanCast(s: SimState, ev: EventBus, o: Orc): void {
  const { tx, ty } = fireTarget(s, o);
  const dmg = (o.atk / ORC_TYPES.shaman.hp) * BARRICADE.orcSwing * FIREBALL.gruntHits * (o.drum ? 1 + ORC_FX.drumBoost : 1);
  castFireball(s, ev, o.x, o.y - o.r, tx, ty, dmg);
}

/** The Fire-Witch (TB-277): a wider fireball worth BOSS_FX.fireHits of her own swing, aimed as a shaman aims. */
export function witchCast(s: SimState, ev: EventBus, o: Orc): void {
  const { tx, ty } = fireTarget(s, o);
  const dmg = o.atk * BARRICADE.orcSwing * BOSS_FX.fireHits * (o.drum ? 1 + ORC_FX.drumBoost : 1);
  castFireball(s, ev, o.x, o.y - o.r, tx, ty, dmg, FIREBALL.radius * BOSS_FX.fireR);
}

/** The nearest vanguard, or the wall straight ahead when none stand. */
function fireTarget(s: SimState, o: Orc): { tx: number; ty: number } {
  let tx = wallX(o.y), ty = o.y, bd = Infinity;
  s.vans.forEach((v) => { const d = Math.hypot(v.x - o.x, v.y - o.y); if (d < bd) { bd = d; tx = v.x; ty = v.y; } });
  return { tx, ty };
}

/** A fireball lands: every vanguard in its circle burns; a fireball that hits none but lands on the wall strikes the timber. */
export function fireballLands(s: SimState, ev: EventBus, a: Projectile): void {
  let hit = false;
  s.vans.forEach((v) => { if (Math.hypot(v.x - a.tx, v.y - a.ty) < a.r + 8) { hit = true; hurtVanguard(s, ev, v, a.dmg); } });
  if (!hit && a.tx <= wallX(a.ty) + a.r) barricadeHit(s, ev, a.dmg * BARRICADE.wallMult, a.ty);
}
