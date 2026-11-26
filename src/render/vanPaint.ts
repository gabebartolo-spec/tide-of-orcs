import { ACHIEVEMENTS } from '../data/achievements';

/** Fox tabards (TB-250, `shield_fox`): once earned, every spearman carries the fox roundel painted on his tunic. The paint is its own
 *  sprite, `vanfox.spear` and `vanfox.spear.attack` (sheet_vanfox.webp, on demand): paint-only frames cut with van.spear's crop box,
 *  so field.ts draws them over the spearman's frame at the same clip time. No wear slot. */

const FOX_ACH = ACHIEVEMENTS.find((a) => a.cosmetic === 'shield_fox')?.id ?? '';
const PAINT: Readonly<Record<string, VanPaint>> = { spear: { key: 'vanfox.spear', atk: 'vanfox.spear.attack' } };
export interface VanPaint { readonly key: string; readonly atk: string }

/** The paint overlay keys for a vanguard of `type` (built once, so drawing builds no strings), or null when it has none or the fox
 *  tabards are not earned yet. */
export function vanPaint(type: string, earned: readonly string[]): VanPaint | null {
  const p = PAINT[type];
  if (!p) return null;
  if (earned !== last.earned || earned.length !== last.n) last = { earned, n: earned.length, on: earned.includes(FOX_ACH) };   // drawn per spearman per frame: re-read only when the list grows
  return last.on ? p : null;
}
let last: { earned: readonly string[] | null; n: number; on: boolean } = { earned: null, n: 0, on: false };
