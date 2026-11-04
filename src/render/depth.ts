import { FIELD } from '../data/balance';
import { DEPTH as D } from '../data/presentation';

const H = FIELD.h;
let T: number = D.top, R = H - T;
/** Set the meadow's back row (world y just under the bush skirt) for this view; `DEPTH.top` until the field first lays out (TB-232).
 *  The skirt sits lower on a short phone view, so the depth curve starts where the meadow does on every screen. */
export function setMeadowTop(top: number): void { if (Number.isFinite(top) && top > 0 && top < H - 40) { T = top; R = H - T; } }
/** The meadow's back row in use. */
export function meadowTop(): number { return T; }
const clamp01 = (u: number): number => Math.min(1, Math.max(0, u));


/** Drawn y of world row `y`: meadow rows sit `squeeze` closer at the back and as much wider at the front, both meadow edges fixed.
 *  Identity in the wood (above `DEPTH.top`) and off the plain. */
export function depthY(y: number): number {
  if (y <= T || y >= H) return y;
  const u = (y - T) / R, q = D.squeeze; return T + R * ((1 - q) * u + q * u * u);
}

/** Inverse of `depthY`: the world row drawn at screen row `v` (pointer to aim). */
export function worldY(v: number): number {
  if (v <= T || v >= H) return v;
  const q = D.squeeze, w = (v - T) / R; return T + R * ((-(1 - q) + Math.sqrt((1 - q) * (1 - q) + 4 * q * w)) / (2 * q));
}

/** Fake-depth scale for an actor or prop standing on world row `y` (TB-232): `far` on the meadow's back row (`DEPTH.top`, and in the
 *  wood behind it), `near` on the front row (the plain's bottom), linear in the drawn row (`depthY`), so size follows screen height the
 *  way a real ground plane's does. The one row -> scale rule every drawn thing uses. */
export function depthScale(y: number): number { return D.far + (D.near - D.far) * clamp01((depthY(y) - T) / R); }

const smooth = (u: number): number => { const v = clamp01(u); return v * v * (3 - 2 * v); };
/** Aerial haze over world row `y`, with the crown line at `sky`: none at the crowns rising over `feather` to `hazeSky`, easing to `haze` on the meadow's back row, then
 *  easing out to none `hazeTo` of the way to the front. Continuous and never rising toward the front, so the wood's near trees stay
 *  clearer than its far ones and the fog has no edge where the wood meets the meadow. */
export function hazeAt(y: number, sky: number): number {
  if (y <= sky) return 0;
  if (y < sky + D.feather) return D.hazeSky * smooth((y - sky) / D.feather);
  if (y < T) return D.haze + (D.hazeSky - D.haze) * (1 - smooth((y - sky - D.feather) / Math.max(1, T - sky - D.feather)));
  return D.haze * (1 - smooth((y - T) / (R * D.hazeTo)));
}
