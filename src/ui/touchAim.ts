import { TOUCH } from '../data/touch';

/** Where the aim circle goes for a touch or pen contact (TB-218 I2, I3). Client px in, client px out. */
export interface FieldRect { left: number; top: number; right: number; bottom: number }
export interface Insets { left: number; right: number; bottom: number }

/** The lift above the contact: full lift, fading to 0 over the last `liftFadeRem` above the field's bottom edge. */
export function liftFor(type: 'touch' | 'pen', y: number, r: FieldRect, remPx: number): number {
  const full = (type === 'pen' ? TOUCH.penLiftRem : TOUCH.liftRem) * remPx, fade = TOUCH.liftFadeRem * remPx;
  return full * Math.min(1, Math.max(0, (r.bottom - y) / fade));
}

/** The circle's client position: lifted, kept on the field, and (phone landscape) below the HUD line. */
export function aimPoint(type: 'touch' | 'pen', cx: number, cy: number, r: FieldRect, remPx: number, hudClamp: boolean, bottomInset = 0): { x: number; y: number } {
  const x = Math.min(r.right, Math.max(r.left, cx));
  // the lift fades out by the gesture-bar line and the circle never goes below it: the bottom safe-area inset is never an aim target (TB-218)
  const usable = r.bottom - bottomInset, lr = { ...r, bottom: usable };
  let y = Math.min(usable, Math.max(r.top, cy - liftFor(type, cy, lr, remPx)));
  y = Math.min(r.bottom, y);
  if (hudClamp) y = Math.max(y, Math.min(r.bottom, r.top + TOUCH.hudBottomPx));
  return { x, y };
}

/** Whether a press may start an aim: not in the outer `edgePx` of either side (a system swipe) nor in the bottom inset. */
export function startsAim(cx: number, cy: number, r: FieldRect, inset: Insets): boolean {
  return cx >= r.left + Math.max(TOUCH.edgePx, inset.left) && cx <= r.right - Math.max(TOUCH.edgePx, inset.right) && cy <= r.bottom - inset.bottom;
}
