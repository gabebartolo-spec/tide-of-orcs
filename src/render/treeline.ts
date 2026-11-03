import { FIELD } from '../data/balance';
import { TREELINE as T } from '../data/presentation';
import { createRng } from '../sim/rng';
import { P } from './palette';

/** One tree: x in world units, base nudge (units) within its row, sprite key and height. */
interface Tree { x: number; dy: number; key: string; h: number; flip: boolean; far?: boolean }
/** One tree placed for the current window: `off` is its base below the view top (so depth order never changes as the view moves). */
interface Spot { x: number; off: number; key: string; h: number; flip: boolean; shadow: number }
const BUSH = 'bush';

/** A kind from `kinds`, never the same as its left neighbour (when there is a choice), so no two identical sprites stand side by side. */
function pick(kinds: readonly string[], u: number, prev?: string): string {
  const i = Math.floor(u * kinds.length), k = kinds[i]!;
  return k === prev ? kinds[(i + 1) % kinds.length]! : k;
}

/** Real height in world units of a tree sprite: its model height x `unit`, with a small size spread (u in 0..1). */
export function treeHeight(key: string, u: number): number {
  return (T.heights[key] ?? 0) * T.unit * (T.size[0] + u * (T.size[1] - T.size[0]));
}

/** Room (units) from the view top down to the lowest base in row `r`: the same on every window, because the rows hang from the top edge. */
export function rowRoom(r: number): number { return T.first + r * T.gap - T.lift; }

/** The tree kinds that stand in row `r`: those whose crown fits its room at natural size (a little shrink allowed), so the tall pines live in the nearer rows and are never cut off. */
export function rowKinds(r: number): readonly string[] {
  const room = rowRoom(r) * T.slack, k = 1 + r * T.grow;
  const ok = T.kinds.filter((n) => treeHeight(n, 1) * k <= room);
  return ok.length ? ok : [T.kinds.reduce((a, b) => (T.heights[b]! < T.heights[a]! ? b : a))];
}

/** One scale for the whole row, from its tallest kind: 1 when that tree fits, less when it would pass the view top. Same species, same size. */
export function rowScale(r: number): number {
  const tall = Math.max(...rowKinds(r).map((n) => treeHeight(n, 1))) * (1 + r * T.grow);
  return Math.min(1, rowRoom(r) / tall);
}

/** Row r of the treeline, laid out once from its own seed so it never changes as the window resizes. */
function row(r: number, skirt = false): Tree[] {
  const rng = createRng(T.seed * 100 + r + (skirt ? 77 : 0)), k = skirt ? 1 : 1 + r * T.grow, out: Tree[] = [], kinds = rowKinds(r);
  const step = skirt ? T.skirt.step : T.step * (1 + r * T.stepGrow);
  const jit = skirt ? T.skirt.gap : T.jitter;
  for (let x = T.span[0] + rng.next() * step; x < T.span[1]; x += step * (1 + (rng.next() - 0.5) * 2 * jit)) {
    const bush = skirt || rng.next() < T.bush, flip = rng.next() < 0.5;
    // the skirt is mostly bushes with the odd young tree among them, so the same bush never repeats at a steady beat
    const young = skirt && rng.next() < T.skirt.young;
    out.push({
      x, flip, far: skirt && rng.next() < T.skirt.far, dy: (rng.next() - 0.5) * 2 * (skirt ? T.skirt.lift : T.lift),
      key: young ? T.skirt.kinds[Math.floor(rng.next() * T.skirt.kinds.length)]! : bush ? BUSH : pick(kinds, rng.next(), out[out.length - 1]?.key),
      h: 0,
    });
    const tr = out[out.length - 1]!, u = rng.next(), v = rng.next();
    tr.h = (young ? T.skirt.youngH[0] + v * (T.skirt.youngH[1] - T.skirt.youngH[0])
      : skirt ? T.skirt.h[0] + u * u * (T.skirt.h[1] - T.skirt.h[0])
      : bush ? T.bushH[0] + u * (T.bushH[1] - T.bushH[0]) : treeHeight(tr.key, u)) * k;
  }
  return out.sort((a, b) => a.dy - b.dy);
}

const imgs = new Map<string, HTMLImageElement>();
/** Pre-scaled copies of each sprite, halved level by level (a mip chain): a 2x-25x downscale straight from the full sprite stair-steps, a 1x-2x one from the right level does not. */
const mips = new Map<string, HTMLCanvasElement[]>();
let started = false;

/** Halve `im` until it is under `T.mipMin` px high. Level k is drawn at exactly 1/2^k of the sprite in a canvas padded up to whole pixels, so the source rectangle keeps the sprite's own aspect. */
function buildMips(im: HTMLImageElement): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  if (typeof document === 'undefined') return out;
  let prev: CanvasImageSource = im, pw = im.width, ph = im.height;
  while (ph / 2 >= T.mipMin) {
    const w = pw / 2, h = ph / 2, c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h);
    const x = c.getContext('2d'); if (!x) break;
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(prev, 0, 0, pw, ph, 0, 0, w, h);
    out.push(c); prev = c; pw = w; ph = h;
  }
  return out;
}

function load(): void {
  if (started || typeof Image === 'undefined') return;
  started = true;
  for (const k of [...T.kinds, BUSH]) for (const v of [k, `${k}_far`]) {
    const im = new Image(); im.onload = (): void => { imgs.set(v, im); mips.set(v, buildMips(im)); }; im.src = `${import.meta.env.BASE_URL}decor/tree_${v}.webp`;
  }
}

/** Soft oval of ground shadow, painted once from the palette and stamped under every trunk and bush. */
let shadowImg: HTMLCanvasElement | null = null;
function shadowSprite(): HTMLCanvasElement | null {
  if (shadowImg || typeof document === 'undefined') return shadowImg;
  const c = document.createElement('canvas'); c.width = T.shadowPx; c.height = T.shadowPx / 2;
  const x = c.getContext('2d'); if (!x) return null;
  x.scale(1, 0.5);  // a round gradient squashed into an oval
  const g = x.createRadialGradient(c.width / 2, c.width / 2, 0, c.width / 2, c.width / 2, c.width / 2);
  g.addColorStop(0, P.shadow); g.addColorStop(0.5, P.shadow); g.addColorStop(1, P.noShadow);
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.width);
  return (shadowImg = c);
}

/** The smallest pre-scaled level that is still at least `need` device px high (1x-2x down from it), else the full sprite; `k` is how many times smaller that level is. */
function level(v: string, im: HTMLImageElement, need: number): { src: CanvasImageSource; k: number } {
  const ms = mips.get(v); let k = 1, src: CanvasImageSource = im;
  if (ms) for (let i = 0; i < ms.length && im.height / (k * 2) >= need; i++) { k *= 2; src = ms[i]!; }
  return { src, k };
}

/** Painted forest edge along the top of the view: as many rows as the window has room for above the plain, far to near.
 *  Trees and the bush skirt are depth-sorted against the orcs (see `treesUpTo`, `skirtUpTo`), so a walker in the forest stands behind the trunks and bushes in front of it. */
export class Treeline {
  private rows: Tree[][] = [];
  private skirt = [row(0, true), row(1, true)];
  private spots: Spot[] = []; private edges: Spot[] = [];
  private n = -1; private ri = 0; private si = 0; private px = 1; private q: ImageSmoothingQuality = 'low';
  constructor() { load(); }
  /** Rows that fit between the view top at `y0` and the plain. */
  private count(y0: number): number { return Math.max(T.minRows, Math.floor((T.stop - y0 - T.first) / T.gap) + 1); }
  /** Lay out the trees and the bush skirt, as offsets from the view top, whenever the row count changes. Sorted by base, near last. */
  private layout(n: number): void {
    if (n === this.n) return;
    this.n = n; this.spots = []; this.edges = [];
    const wallX = FIELD.barX + FIELD.barW / 2;
    for (let r = 0; r < n; r++) {
      const trees = (this.rows[r] ??= row(r)), s = rowScale(r), baseOff = T.first + r * T.gap;
      for (const t of trees) {
        if (t.key !== BUSH && Math.abs(t.x - wallX) < T.cap.clear) continue;  // no trunk stands on the barricade's column, so the cap rail never reads as a tree
        this.spots.push({ x: t.x, off: baseOff + t.dy, key: r < n - 1 ? `${t.key}_far` : t.key, h: t.h * s, flip: t.flip, shadow: T.shade.tree });
      }
    }
    const sb = T.first + (n - 1) * T.gap + T.skirt.lift;
    this.skirt.forEach((tr, i) => {
      const base = sb - T.skirt.offset * (T.skirt.rows - 1 - i);
      for (const t of tr) this.edges.push({ x: t.x, off: base + t.dy, key: t.far ? `${t.key}_far` : t.key, h: t.h, flip: t.flip, shadow: T.shade.bush });
      // one tall bush on the barricade's column in each skirt row hides the cut top of the wall
      this.edges.push({ x: wallX + (i ? 7 : -7), off: base, key: BUSH, h: T.skirt.h[1] * T.skirt.wallBush, flip: i === 1, shadow: T.shade.bush });
    });
    this.spots.sort((a, b) => a.off - b.off); this.edges.sort((a, b) => a.off - b.off);
  }
  /** Start a frame: remember the device scale (the mip level depends on it) and rewind both depth lists. */
  begin(g: CanvasRenderingContext2D, y0: number): void {
    this.layout(this.count(y0)); this.ri = 0; this.si = 0;
    this.q = g.imageSmoothingQuality; g.imageSmoothingQuality = 'high';  // the field's default is 'low': the sprites are always scaled, never 1:1
    const m = (g as { getTransform?: () => DOMMatrix }).getTransform?.(); this.px = m ? Math.hypot(m.a, m.b) || 1 : 1;
  }
  /** End of the frame's forest: put the smoothing back the way the rest of the field expects it. */
  end(g: CanvasRenderingContext2D): void { g.imageSmoothingQuality = this.q; }
  /** Draw every tree whose base is at or above world `y`, skipping what is already drawn. `Infinity` finishes the rows. */
  treesUpTo(g: CanvasRenderingContext2D, y0: number, x0: number, x1: number, y: number): void {
    const l = this.spots; while (this.ri < l.length && y0 + l[this.ri]!.off <= y) this.put(g, l[this.ri++]!, y0, x0, x1);
  }
  /** Same for the bush skirt, which stands in front of the barricade's top and of any orc still behind it. */
  skirtUpTo(g: CanvasRenderingContext2D, y0: number, x0: number, x1: number, y: number): void {
    const l = this.edges; while (this.si < l.length && y0 + l[this.si]!.off <= y) this.put(g, l[this.si++]!, y0, x0, x1);
  }
  /** World y above which a walker is still in the forest, behind the rows. */
  skirtEdge(y0: number): number { return this.skirtBase(y0) - T.skirt.offset; }
  /** One whole frame, far to near (used where no actor needs to stand between the rows). */
  draw(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number): void {
    // a hidden or zero-size canvas gives a NaN view: createLinearGradient would throw and end the frame loop (ground.ts guards the same way)
    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1)) return;
    this.begin(g, y0); this.treesUpTo(g, y0, x0, x1, Infinity); this.skirtGround(g, y0, x0, x1); this.skirtUpTo(g, y0, x0, x1, Infinity); this.end(g);
  }
  /** Soft contact shadow where the bushes meet the meadow, so the forest edge sits on the ground instead of a hard line. */
  skirtGround(g: CanvasRenderingContext2D, y0: number, x0: number, x1: number): void {
    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1)) return;
    const sb = this.skirtBase(y0), cg = g.createLinearGradient(0, sb - 4, 0, sb + T.contact);
    cg.addColorStop(0, P.noShadow); cg.addColorStop(0.2, P.shadow); cg.addColorStop(1, P.noShadow);
    g.fillStyle = cg; g.fillRect(x0, sb - 4, x1 - x0, T.contact + 4);
  }
  /** Baseline of the bush skirt: the barricade starts just above it so the bushes cover its cut top. */
  skirtBase(y0: number): number { return y0 + T.first + (this.count(y0) - 1) * T.gap + T.skirt.lift; }
  private put(g: CanvasRenderingContext2D, s: Spot, y0: number, x0: number, x1: number): void {
    const im = imgs.get(s.key); if (!im) return;
    const w = (im.width / im.height) * s.h; if (s.x + w / 2 < x0 || s.x - w / 2 > x1) return;
    const by = y0 + s.off, sh = shadowSprite();
    if (sh) { const sw = Math.min(w, s.h * 1.2) * s.shadow; g.drawImage(sh, s.x - sw / 2, by - sw * 0.25, sw, sw * 0.5); }
    // a fractional source rectangle: the padded mip keeps the sprite's exact aspect, so nothing squashes
    const lv = level(s.key, im, s.h * this.px), sw = im.width / lv.k, shh = im.height / lv.k;
    if (s.flip) { g.save(); g.translate(s.x, 0); g.scale(-1, 1); g.drawImage(lv.src, 0, 0, sw, shh, -w / 2, by - s.h, w, s.h); g.restore(); }
    else g.drawImage(lv.src, 0, 0, sw, shh, s.x - w / 2, by - s.h, w, s.h);
  }
}
