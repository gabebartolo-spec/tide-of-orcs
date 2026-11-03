import { FIELD } from '../data/balance';

/** The plain's placement in the full-window canvas (TB-207): scale k and top-left (ox, oy) in CSS px. */
export interface PlainView { k: number; ox: number; oy: number }

/** Canvas-local CSS px to plain coordinates. Off the 900x480 plain it returns null, unless `clamp` pins it to the edge
 *  (a captured finger that slides off). The mouse over the extra meadow clears the aim (rule 2, TB-216c). */
export function plainPoint(lx: number, ly: number, v: PlainView, clamp: boolean): { x: number; y: number } | null {
  const x = (lx - v.ox) / v.k, y = (ly - v.oy) / v.k;
  if (x >= 0 && x <= FIELD.w && y >= 0 && y <= FIELD.h) return { x, y };
  return clamp ? { x: Math.min(FIELD.w, Math.max(0, x)), y: Math.min(FIELD.h, Math.max(0, y)) } : null;
}

/** Whether a pointer event may move the aim: the mouse always; a pen or finger only while it is the held aim pointer,
 *  so a hovering pen never sets an aim that no lift would clear (TB-216c). */
export const pointerAims = (type: string, id: number, aimFinger: number | null): boolean => type === 'mouse' || id === aimFinger;
