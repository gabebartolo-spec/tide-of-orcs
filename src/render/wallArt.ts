import { SIM_MISC, WALL_LINE } from '../data/balance';
import { TREELINE, WALL_ART } from '../data/presentation';

export type WallArt = (typeof WALL_ART)[number];
/** A wall art placed for the current view: the same image, moved along the wall's line. */
export type PlacedWall = { key: WallArt['key']; x: number; y: number; w: number; h: number; foot: number; breaches: readonly number[]; chunks: WallArt['chunks'] };

/** TB-268: place the rendered wall so its finished far end stands on the meadow (director 13 Nov: the fence must not overlap the forest;
 *  "just make it look normal"): its end foot on the top row orcs walk (SIM_MISC.spawnTop), or `TREELINE.cap.foot` below the bush skirt
 *  where the skirt is lower. The art only slides along the wall's own line (WALL_LINE.slope, which it was rendered on): never warped,
 *  cut or covered, and every row an orc can walk still meets it where the sim's wall stands. */
export function placeWall(art: WallArt, skirtBase: number): PlacedWall {
  const end = Math.max(SIM_MISC.spawnTop, Number.isFinite(skirtBase) ? skirtBase + TREELINE.cap.foot : -Infinity);
  const dy = Math.max(0, end - art.foot), dx = -WALL_LINE.slope * dy;
  return { key: art.key, x: art.x + dx, y: art.y + dy, w: art.w, h: art.h, foot: art.foot + dy, breaches: art.breaches.map((b) => b + dy), chunks: art.chunks };
}
