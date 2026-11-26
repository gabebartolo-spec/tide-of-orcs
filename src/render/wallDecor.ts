import { ACHIEVEMENTS } from '../data/achievements';
import { WALL_BANNERS, WALL_DECOR_ART, WALL_PROPS, WALL_SPOTS, WallDecorId } from '../data/presentation';
import type { PlacedWall } from './wallArt';

/** Wall cosmetics (TB-250): which banners, lanterns and skulls the player has earned, and where their sprites stand on the drawn wall. */

export type WallBannerId = keyof typeof WALL_BANNERS.spot;
export type WallPropId = keyof typeof WALL_PROPS;
export type WallCosmeticId = WallBannerId | WallPropId;
const COSMETIC_OF = new Map<string, WallCosmeticId>();
for (const a of ACHIEVEMENTS) if (a.cosmetic && (a.cosmetic in WALL_BANNERS.spot || a.cosmetic in WALL_PROPS)) COSMETIC_OF.set(a.id, a.cosmetic as WallCosmeticId);
const isBanner = (id: WallCosmeticId): id is WallBannerId => id in WALL_BANNERS.spot;

/** The wall cosmetics earned, from the achievement ids in meta.ach.earned. */
export function wallCosmetics(earned: readonly string[]): readonly WallCosmeticId[] {
  if (earned === last.earned && earned.length === last.n) return last.out;   // called every frame: rebuild only when the list grows
  const out: WallCosmeticId[] = [];
  for (const e of earned) { const b = COSMETIC_OF.get(e); if (b && !out.includes(b)) out.push(b); }
  last = { earned, n: earned.length, out };
  return out;
}
let last: { earned: readonly string[] | null; n: number; out: readonly WallCosmeticId[] } = { earned: null, n: 0, out: [] };

/** One sprite to draw: its image, its field rect (top-left, size), and whether it is drawn before the wall (behind it). */
export interface WallSprite { readonly id: WallDecorId; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly behind: boolean }

/** A sprite scaled by (sx, sy) with its foot at field (x, y). */
const at = (id: WallDecorId, x: number, y: number, sx: number, sy: number, behind: boolean): WallSprite => {
  const A = WALL_DECOR_ART[id];
  return { id, x: x - A.foot[0] * sx, y: y - A.foot[1] * sy, w: A.w * sx, h: A.h * sy, behind };
};

/** The sprites of the earned banners on the placed wall of this tier and damage stage, farthest first (so a nearer one overlaps).
 *  wall0: the standard on its tall post's cap, drawn over the wall. wall1-3: that tier's post standing behind the wall (drawn before
 *  it, so the wall hides all of it below its top edge), from `postSink` cap widths below the wall's top (where the wall hides its foot) to `postOver`
 *  above it (all from stage 0),
 *  then the standard on the post's top. */
export function wallBannerSprites(banners: readonly WallBannerId[], wall: PlacedWall, tier: number, stage: number): WallSprite[] {
  const B = WALL_BANNERS, out: WallSprite[] = [], t = Math.min(Math.max(tier, 0), WALL_SPOTS.tall.length - 1);
  const order = [...banners].sort((a, b) => B.spot[b] - B.spot[a]);
  for (const id of order) {
    const i = B.spot[id] - 1, cw = WALL_SPOTS.capW.tall[i]!, S = WALL_DECOR_ART[id];
    const sp = WALL_SPOTS.tall[t]![Math.min(Math.max(stage, 0), 3)]![i]!;
    let x = wall.x + sp[0], fy = wall.y + sp[1];
    const post = B.post[t];
    if (post) {
      const s0 = WALL_SPOTS.tall[t]![0]![i]!, P = WALL_DECOR_ART[post], foot = wall.y + s0[1] + B.postSink * cw, top = wall.y + s0[1] - B.postOver * cw;
      out.push(at(post, wall.x + s0[0], foot, (B.postW * cw) / P.unit, (foot - top) / (P.foot[1] - P.top[1]), true));
      x = wall.x + s0[0]; fy = top;
    }
    const k = (B.standardH * cw) / S.h;
    out.push(at(id, x, fy, k, k, post !== null));
  }
  return out;
}

/** The sprites of the earned lanterns and skulls on the placed wall of this tier and damage stage: one per listed post, its top
 *  (the lantern bracket's top) or foot (the skull stake's tip) on that post's top in this stage, `h` cap widths tall, drawn over the wall. */
export function wallPropSprites(props: readonly WallPropId[], wall: PlacedWall, tier: number, stage: number): WallSprite[] {
  const out: WallSprite[] = [], t = Math.min(Math.max(tier, 0), WALL_SPOTS.tall.length - 1), st = Math.min(Math.max(stage, 0), 3);
  for (const id of props) {
    const P = WALL_PROPS[id], A = WALL_DECOR_ART[id], hang = P.row === 'tall';
    for (const n of P.posts) {
      const sp = WALL_SPOTS[P.row][t]![st]![n - 1]!, k = (P.h * WALL_SPOTS.capW[P.row][n - 1]!) / A.h;
      const x = wall.x + sp[0], y = wall.y + sp[1];
      out.push(hang ? at(id, x - (A.top[0] - A.foot[0]) * k, y + (A.foot[1] - A.top[1]) * k, k, k, false) : at(id, x, y, k, k, false));
    }
  }
  return out;
}

/** Every earned wall cosmetic's sprites: the banners' posts and standards behind the wall (in their own order) first, then the sprites
 *  drawn over the wall, farthest first (highest foot first), so a nearer one overlaps. */
export function wallDecorSprites(ids: readonly WallCosmeticId[], wall: PlacedWall, tier: number, stage: number): WallSprite[] {
  const banners = ids.filter(isBanner), props = ids.filter((i): i is WallPropId => !isBanner(i));
  const all = [...wallBannerSprites(banners, wall, tier, stage), ...wallPropSprites(props, wall, tier, stage)];
  const footY = (s: WallSprite): number => s.y + (WALL_DECOR_ART[s.id].foot[1] * s.h) / WALL_DECOR_ART[s.id].h;
  const front = all.filter((s) => !s.behind).sort((a, b) => footY(a) - footY(b));
  return [...all.filter((s) => s.behind), ...front];
}
