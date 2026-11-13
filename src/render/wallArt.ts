import { SIM_MISC, WALL_LINE } from '../data/balance';
import { TREELINE, WALL_ART, WALL_VIEW } from '../data/presentation';
import { depthY } from './depth';

export type WallArt = (typeof WALL_ART)[number];
/** A wall art placed for the current view: the same image, moved along the wall's line. */
export type PlacedWall = { key: WallArt['key']; x: number; y: number; w: number; h: number; foot: number; breaches: readonly number[]; chunks: WallArt['chunks'] };

/** TB-268: place the rendered wall so its finished far end stands on the meadow (director 13 Nov: the fence must not overlap the forest;
 *  "just make it look normal"): its end foot `TREELINE.cap.foot` below the bush skirt, right up
 *  against the forest edge with no gap (director 14 Nov: a gap makes the wall pointless), drawn over the skirt as the nearer thing. The art is a perspective render (straight, shrinking toward the forest at the depth
 *  scale's rate) and only slides along its own drawn line (WALL_VIEW.slope): never warped, cut or covered. */
export function placeWall(art: WallArt, skirtBase: number): PlacedWall {
  const end = Number.isFinite(skirtBase) ? skirtBase + TREELINE.cap.foot : depthY(SIM_MISC.spawnTop);
  const dy = Math.max(0, end - art.foot), dx = -WALL_VIEW.slope * dy;
  return { key: art.key, x: art.x + dx, y: art.y + dy, w: art.w, h: art.h, foot: art.foot + dy, breaches: art.breaches.map((b) => b + dy), chunks: art.chunks };
}

/** The orc-side face of the drawn wall at the foot of screen row `row` (flames, debris and dust in its breaches). */
export const wallFaceX = (row: number): number => WALL_VIEW.face + WALL_VIEW.slope * (WALL_LINE.baseY - row);
