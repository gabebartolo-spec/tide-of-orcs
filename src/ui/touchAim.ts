import { TOUCH } from '../data/touch';

/** Where the aim circle goes for a touch or pen contact (TB-218 I2, I3). Client px in, client px out. */
export interface FieldRect { left: number; top: number; right: number; bottom: number }
export interface Insets { left: number; right: number; bottom: number }

/** The lift above the contact: full lift, fading to 0 over the last `liftFadeRem` above the field's bottom edge. */
export function liftFor(type: 'touch' | 'pen', y: number, r: FieldRect, remPx: number): number {
  const full = (type === 'pen' ? TOUCH.penLiftRem : TOUCH.liftRem) * remPx, fade = TOUCH.liftFadeRem * remPx;
  return full * Math.min(1, Math.max(0, (r.bottom - y) / fade));
}

/** The circle's client position, always on the visible plain: below the HUD plates (`topInset` px under the field top) and above the
 *  gesture-bar inset (`bottomInset`). The circle sits a full lift above the fingertip, the lift fading to nothing over the last
 *  `liftFadeRem` above the inset line, so a thumb held just clear of the gesture bar still reaches the plain's lowest visible row, and a
 *  finger anywhere else keeps the whole lift (a thumb never covers the circle). A finger over the HUD aims at the top of the plain. */
export function aimPoint(type: 'touch' | 'pen', cx: number, cy: number, r: FieldRect, remPx: number, bottomInset = 0, topInset = 0): { x: number; y: number } {
  const x = Math.min(r.right, Math.max(r.left, cx));
  const floor = r.bottom - bottomInset, ceil = Math.min(floor, r.top + Math.max(0, topInset));
  const fy = Math.min(floor, cy);
  const y = Math.min(floor, Math.max(ceil, fy - liftFor(type, fy, { ...r, bottom: floor }, remPx)));
  return { x, y };
}

/** Whether a press may start an aim: not in the outer `edgePx` of either side (a system swipe) nor in the bottom inset. */
export function startsAim(cx: number, cy: number, r: FieldRect, inset: Insets): boolean {
  return cx >= r.left + Math.max(TOUCH.edgePx, inset.left) && cx <= r.right - Math.max(TOUCH.edgePx, inset.right) && cy <= r.bottom - inset.bottom;
}
