import { FX } from '../sim/combat';
import { Stats } from '../sim/stats';
import { P } from './palette';

/** A lob's colour from the enchantments it actually rolled (`fx`), with the same gates `impact` uses, so a shot only shows
 *  flames, frost, sparks or arcane when it will burn, chill, shock or rebound. '' = a plain arrow. */
export function shotTint(st: Stats | null, fx: number): string {
  if (!st) return '';
  if (st.fire && fx & FX.FIRE) return P.fire;
  if (st.slow > 0 && fx & FX.FROST) return P.frost;
  if ((st.shock || st.stun) && fx & FX.SHOCK) return P.spark;
  if (st.bounce && fx & FX.BOUNCE) return P.arcane;
  return '';
}
