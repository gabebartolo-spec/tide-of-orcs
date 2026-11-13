import { WALL_LINE } from '../data/balance';
import { TREELINE, WALL_ART } from '../data/presentation';

export type WallArt = (typeof WALL_ART)[number];
/** A wall art placed for the current view: the same image, moved along the wall's line. */
export type PlacedWall = { key: WallArt['key']; x: number; y: number; w: number; h: number; foot: number; breaches: readonly number[]; chunks: WallArt['chunks'] };

/** TB-268: place the rendered wall so its finished far end stands on the meadow, `TREELINE.cap.foot` units below the bush skirt base
 *  (`skirtBase`, world y), in front of the skirt: never among the trees, never cut, never covered. The art is slid along the wall's own
 *  line (WALL_LINE.slope, which the art was rendered on), so its length on the meadow stays on the line the orcs strike; a view whose skirt
 *  sits above the art's end leaves it where it was rendered. A non-finite skirt leaves it there too. */
export function placeWall(art: WallArt, skirtBase: number): PlacedWall {
  const dy = Number.isFinite(skirtBase) ? Math.max(0, skirtBase + TREELINE.cap.foot - art.foot) : 0, dx = -WALL_LINE.slope * dy;
  return { key: art.key, x: art.x + dx, y: art.y + dy, w: art.w, h: art.h, foot: art.foot + dy, breaches: art.breaches.map((b) => b + dy), chunks: art.chunks };
}
